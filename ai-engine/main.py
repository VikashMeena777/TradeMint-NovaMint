"""
TradeMind AI Engine — FastAPI service for multi-agent trade signal generation.
Agents: Fundamental, Technical, Sentiment, News → Bull/Bear Debate → Trader → Risk Manager
LLM Providers: Groq → NVIDIA NIM → OpenRouter (all free tier)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import logging

from config import get_settings
from indicators import compute_indicators
from market_data import get_stock_data, get_live_price
from llm_gateway import call_llm, get_available_providers
from agents import generate_signal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Multi-agent AI pipeline for Indian market trade signals",
    version="1.0.0",
)

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response Models ─────────────────────

class SignalRequest(BaseModel):
    symbol: str = Field(..., description="Stock symbol e.g. RELIANCE, TCS, HDFCBANK")
    exchange: str = Field(default="NSE", description="NSE or BSE")
    user_id: Optional[str] = Field(default=None, description="Supabase user ID")


class PriceTarget(BaseModel):
    entry: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    risk_reward_ratio: Optional[float] = None


class SignalResponse(BaseModel):
    symbol: str
    exchange: str
    signal_type: str  # buy, sell, hold
    confidence_score: int  # 0-100
    prices: PriceTarget
    position_size: Optional[int] = None
    reasoning: dict = {}
    debate_summary: Optional[str] = None
    risk_notes: Optional[str] = None
    agents: dict = {}
    processing_time_ms: int = 0


# ─── Endpoints ─────────────────────────────────────

@app.get("/")
async def root():
    providers = get_available_providers()
    return {
        "service": settings.app_name,
        "status": "running",
        "llm_providers": providers if providers else ["none — add GROQ_API_KEY, NVIDIA_NIM_API_KEY, or OPENROUTER_API_KEY"],
        "agents": [
            "Fundamental Analyst", "Technical Analyst",
            "Sentiment Analyst", "News Analyst",
            "Bull Researcher", "Bear Researcher",
            "Trader", "Risk Manager",
        ],
    }


@app.get("/health")
async def health():
    providers = get_available_providers()
    from angel_one import is_configured as angel_configured
    return {
        "status": "healthy",
        "llm_providers_configured": len(providers),
        "providers": providers,
        "mode": "ai" if providers else "rule-based",
        "angel_one": "connected" if angel_configured() else "not configured",
    }


@app.get("/api/live-price/{symbol}")
async def live_price(symbol: str, exchange: str = "NSE"):
    """Get real-time price. Angel One (live) → Yahoo Finance (15-min delay)."""
    try:
        price = get_live_price(symbol, exchange)
        if not price:
            raise HTTPException(status_code=404, detail=f"No price data for {symbol}")
        return price
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Live price failed for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/signals/generate", response_model=SignalResponse)
async def generate_trade_signal(request: SignalRequest):
    """
    Generate a trade signal for the given symbol using the 8-agent pipeline.
    Pipeline: Fundamental + Technical + Sentiment + News (parallel)
              → Bull/Bear Debate → Trader Synthesis → Risk Validation
    Falls back to rule-based signals if no LLM providers configured.
    """
    logger.info(f"Generating signal for {request.symbol}.{request.exchange}")

    try:
        result = await generate_signal(
            symbol=request.symbol,
            exchange=request.exchange,
            user_id=request.user_id,
        )
        return result
    except Exception as e:
        logger.error(f"Signal generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/indicators/{symbol}")
async def get_indicators(symbol: str, exchange: str = "NSE"):
    """Get technical indicators for a stock."""
    try:
        data = get_stock_data(symbol, exchange)
        if data is None or data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")
        indicators = compute_indicators(data)
        return {"symbol": symbol, "exchange": exchange, "indicators": indicators}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Indicator computation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market-data/{symbol}")
async def get_market_info(symbol: str, exchange: str = "NSE", period: str = "1mo"):
    """Get historical market data for a stock."""
    try:
        data = get_stock_data(symbol, exchange, period=period)
        if data is None or data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        latest = data.iloc[-1]
        prev = data.iloc[-2] if len(data) > 1 else latest
        change_pct = ((latest["Close"] - prev["Close"]) / prev["Close"]) * 100

        return {
            "symbol": symbol,
            "exchange": exchange,
            "current_price": round(float(latest["Close"]), 2),
            "open": round(float(latest["Open"]), 2),
            "high": round(float(latest["High"]), 2),
            "low": round(float(latest["Low"]), 2),
            "volume": int(latest["Volume"]),
            "change_pct": round(change_pct, 2),
            "period": period,
            "data_points": len(data),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Market data fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chart-data/{symbol}")
async def get_chart_data(symbol: str, exchange: str = "NSE", period: str = "6mo"):
    """Get OHLCV candle data for charting."""
    try:
        data = get_stock_data(symbol, exchange, period=period)
        if data is None or data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        candles = []
        for date, row in data.iterrows():
            candles.append({
                "time": date.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

        return {"symbol": symbol, "exchange": exchange, "candles": candles}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chart data fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
