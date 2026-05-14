"""
Multi-Agent Signal Pipeline — 8 AI agents working together.
Flow: Analysts (parallel) → Debate → Trader → Risk Manager → Signal
"""

import asyncio
import time
import json
import logging
from typing import Optional

from market_data import get_stock_data, get_stock_info
from indicators import compute_indicators
from llm_gateway import call_llm
from prompts import (
    FUNDAMENTAL_SYSTEM, TECHNICAL_SYSTEM, SENTIMENT_SYSTEM,
    NEWS_SYSTEM, BULL_SYSTEM, BEAR_SYSTEM, TRADER_SYSTEM, RISK_SYSTEM,
)

logger = logging.getLogger(__name__)


async def generate_signal(
    symbol: str,
    exchange: str = "NSE",
    user_id: Optional[str] = None,
) -> dict:
    """
    Run the full 8-agent pipeline to generate a trade signal.
    Total target latency: <30 seconds.
    """
    start_time = time.time()
    agents_data = {}

    # ─── Step 1: Fetch Market Data + Indicators ─────
    logger.info(f"[1/5] Fetching data for {symbol}.{exchange}")
    data = get_stock_data(symbol, exchange, period="6mo")
    if data is None or data.empty:
        return _error_signal(symbol, exchange, "No market data available")

    indicators = compute_indicators(data)
    stock_info = get_stock_info(symbol, exchange)

    # ─── Step 2: Run 4 Analysts SEQUENTIALLY (free-tier rate limits) ─
    logger.info(f"[2/5] Running 4 analysts sequentially (free-tier rate limits)")
    fundamental = await _run_fundamental(symbol, exchange, stock_info, indicators)
    agents_data["fundamental"] = fundamental

    technical = await _run_technical(symbol, exchange, indicators)
    agents_data["technical"] = technical

    sentiment = await _run_sentiment(symbol, exchange, stock_info)
    agents_data["sentiment"] = sentiment

    news = await _run_news(symbol, exchange, stock_info)
    agents_data["news"] = news

    # ─── Step 3: Bull vs Bear Debate (Sequential) ─────
    logger.info(f"[3/5] Running bull vs bear debate")
    analyst_summary = json.dumps({
        "fundamental": fundamental, "technical": technical,
        "sentiment": sentiment, "news": news,
    }, default=str)

    bull = await _run_bull(symbol, exchange, analyst_summary)
    bear = await _run_bear(symbol, exchange, analyst_summary)
    agents_data["bull_researcher"] = bull
    agents_data["bear_researcher"] = bear

    # ─── Step 4: Trader Synthesis ───────────────────
    logger.info(f"[4/5] Trader synthesizing all inputs")
    debate_summary = json.dumps({"bull_case": bull, "bear_case": bear}, default=str)
    trader = await _run_trader(symbol, exchange, analyst_summary, debate_summary, indicators)
    agents_data["trader"] = trader

    # ─── Step 5: Risk Manager Validation ────────────
    logger.info(f"[5/5] Risk manager validating")
    risk = await _run_risk_manager(symbol, exchange, trader, indicators)
    agents_data["risk_manager"] = risk

    # ─── Build Final Signal ─────────────────────────
    elapsed_ms = int((time.time() - start_time) * 1000)
    logger.info(f"✓ Signal generated for {symbol} in {elapsed_ms}ms")

    signal_type = trader.get("decision", "hold").lower()
    if signal_type not in ("buy", "sell", "hold"):
        signal_type = "hold"

    # Risk manager can override to hold
    if risk.get("approved") is False:
        signal_type = "hold"
        logger.info(f"Risk manager blocked signal — forcing HOLD")

    confidence = min(int(trader.get("confidence", 50) * 100), 100)
    if isinstance(trader.get("confidence"), (int, float)) and trader["confidence"] <= 1:
        confidence = int(trader["confidence"] * 100)

    return {
        "symbol": symbol,
        "exchange": exchange,
        "signal_type": signal_type,
        "confidence_score": confidence,
        "prices": {
            "entry": trader.get("entry_price"),
            "stop_loss": trader.get("stop_loss"),
            "take_profit": trader.get("take_profit"),
            "risk_reward_ratio": trader.get("risk_reward_ratio"),
        },
        "position_size": trader.get("position_size"),
        "reasoning": {
            "fundamental": fundamental.get("summary", ""),
            "technical": technical.get("summary", ""),
            "sentiment": sentiment.get("summary", ""),
            "news": news.get("summary", ""),
        },
        "debate_summary": f"BULL: {bull.get('bull_case_summary', '')}\n\nBEAR: {bear.get('bear_case_summary', '')}",
        "risk_notes": risk.get("notes", ""),
        "agents": agents_data,
        "processing_time_ms": elapsed_ms,
    }


# ─── Individual Agent Runners ──────────────────────

async def _run_fundamental(symbol: str, exchange: str, info: dict, indicators: dict) -> dict:
    prompt = f"""Analyze {symbol} on {exchange}.
Stock Info: {json.dumps(info, default=str)}
Current Price: ₹{indicators.get('current_price', 'N/A')}
P/E Ratio: {info.get('pe_ratio', 'N/A')}
Market Cap: {info.get('market_cap', 'N/A')}
Sector: {info.get('sector', 'Unknown')}"""
    return await call_llm("fundamental_analyst", FUNDAMENTAL_SYSTEM, prompt)


async def _run_technical(symbol: str, exchange: str, indicators: dict) -> dict:
    prompt = f"""Analyze {symbol} on {exchange} with these indicators:
{json.dumps(indicators, default=str, indent=2)}"""
    return await call_llm("technical_analyst", TECHNICAL_SYSTEM, prompt)


async def _run_sentiment(symbol: str, exchange: str, info: dict) -> dict:
    prompt = f"""Analyze market sentiment for {symbol} ({info.get('name', symbol)}) on {exchange}.
Sector: {info.get('sector', 'Unknown')}
52-week range: ₹{info.get('fifty_two_week_low', 'N/A')} - ₹{info.get('fifty_two_week_high', 'N/A')}"""
    return await call_llm("sentiment_analyst", SENTIMENT_SYSTEM, prompt)


async def _run_news(symbol: str, exchange: str, info: dict) -> dict:
    prompt = f"""Analyze recent news impact for {symbol} ({info.get('name', symbol)}) on {exchange}.
Sector: {info.get('sector', 'Unknown')}, Industry: {info.get('industry', 'Unknown')}"""
    return await call_llm("news_analyst", NEWS_SYSTEM, prompt)


async def _run_bull(symbol: str, exchange: str, analyst_summary: str) -> dict:
    prompt = f"Build the strongest bull case for {symbol} on {exchange}.\nAnalyst Reports:\n{analyst_summary}"
    return await call_llm("bull_researcher", BULL_SYSTEM, prompt, temperature=0.3, max_tokens=3000)


async def _run_bear(symbol: str, exchange: str, analyst_summary: str) -> dict:
    prompt = f"Build the strongest bear case for {symbol} on {exchange}.\nAnalyst Reports:\n{analyst_summary}"
    return await call_llm("bear_researcher", BEAR_SYSTEM, prompt, temperature=0.3, max_tokens=3000)


async def _run_trader(symbol: str, exchange: str, analyst_summary: str, debate: str, indicators: dict) -> dict:
    prompt = f"""Synthesize all inputs and make a final trade decision for {symbol} on {exchange}.
Current Price: ₹{indicators.get('current_price', 'N/A')}
ATR(14): ₹{indicators.get('atr_14', 'N/A')}
Trend: {indicators.get('trend', 'N/A')}
Momentum: {indicators.get('momentum', 'N/A')}

Analyst Reports:
{analyst_summary}

Bull vs Bear Debate:
{debate}"""
    return await call_llm("trader", TRADER_SYSTEM, prompt, temperature=0.2)


async def _run_risk_manager(symbol: str, exchange: str, trader_decision: dict, indicators: dict) -> dict:
    prompt = f"""Validate this trade decision for {symbol} on {exchange}.
Trade Decision: {json.dumps(trader_decision, default=str)}
ATR(14): ₹{indicators.get('atr_14', 'N/A')}
Current Price: ₹{indicators.get('current_price', 'N/A')}
Volatility: {indicators.get('volatility', 'N/A')}"""
    return await call_llm("risk_manager", RISK_SYSTEM, prompt, temperature=0.0)


def _error_signal(symbol: str, exchange: str, error: str) -> dict:
    return {
        "symbol": symbol, "exchange": exchange, "signal_type": "hold",
        "confidence_score": 0, "prices": {}, "reasoning": {"error": error},
        "debate_summary": None, "risk_notes": error, "agents": {},
        "processing_time_ms": 0,
    }
