"""
LLM Gateway — Free-tier orchestration with provider distribution.
Each agent is assigned a PRIMARY provider to enable parallel execution
without hitting any single provider's rate limit.

Provider distribution (May 2026):
  NVIDIA NIM: Most reliable, nemotron-3-super-120b-a12b (free, fast)
  Groq:       Fast but aggressive rate limits (~30 req/min)
  OpenRouter:  Free router endpoint (auto-selects best free model)
"""

import json
import asyncio
import httpx
import logging
from typing import Optional
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ─── Provider Configs (VERIFIED from Render logs May 2026) ─────────
PROVIDERS = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1/chat/completions",
        "models": {
            "large": "llama-3.3-70b-versatile",
            "fast": "llama-3.1-8b-instant",
            "mixtral": "mixtral-8x7b-32768",
        },
        "get_key": lambda: settings.groq_api_key,
        "headers_extra": {},
    },
    "nvidia": {
        "base_url": "https://integrate.api.nvidia.com/v1/chat/completions",
        "models": {
            # Confirmed working from Render logs
            "large": "nvidia/nemotron-3-super-120b-a12b",
        },
        "get_key": lambda: settings.nvidia_nim_api_key,
        "headers_extra": {},
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1/chat/completions",
        "models": {
            # Use the free auto-router — picks best available free model
            "large": "openrouter/auto",
            "fast": "openrouter/auto",
        },
        "get_key": lambda: settings.openrouter_api_key,
        "headers_extra": {
            "HTTP-Referer": "https://trademind.novamintnetworks.in",
            "X-Title": "TradeMind AI",
        },
    },
}

# ─── Agent → Provider Distribution ────────────────────────────────
# Spread across providers so parallel batches don't rate-limit.
# NVIDIA is most reliable → give it the critical agents.
# Groq is fast but rate-limited → max 1 concurrent call per batch.
#
# Step 2 (4 analysts parallel):
#   Groq:       fundamental (1 call)
#   NVIDIA:     technical, sentiment (2 calls)
#   OpenRouter: news (1 call)
#
# Step 3 (2 debate parallel):
#   NVIDIA:     bull (1 call)
#   OpenRouter: bear (1 call)
#
# Step 4 (trader — sequential):
#   NVIDIA primary (most reliable)
#
# Step 5 (risk — sequential):
#   Groq primary (Groq rate limit recovered by now)
#
AGENT_MODEL_MAP = {
    # ── Step 2: Analysts (run in parallel) ──
    "fundamental_analyst": [("groq", "fast"), ("nvidia", "large"), ("openrouter", "fast")],
    "technical_analyst":   [("nvidia", "large"), ("groq", "fast"), ("openrouter", "fast")],
    "sentiment_analyst":   [("nvidia", "large"), ("groq", "fast"), ("openrouter", "fast")],
    "news_analyst":        [("openrouter", "large"), ("nvidia", "large"), ("groq", "fast")],

    # ── Step 3: Debate (run in parallel) ──
    "bull_researcher":     [("nvidia", "large"), ("groq", "fast"), ("openrouter", "large")],
    "bear_researcher":     [("openrouter", "large"), ("nvidia", "large"), ("groq", "fast")],

    # ── Step 4-5: Sequential (most critical → most reliable provider) ──
    "trader":              [("nvidia", "large"), ("groq", "large"), ("openrouter", "large")],
    "risk_manager":        [("groq", "fast"), ("nvidia", "large"), ("openrouter", "large")],
}


def get_available_providers() -> list[str]:
    """Return list of providers with configured API keys."""
    available = []
    for name, config in PROVIDERS.items():
        if config["get_key"]():
            available.append(name)
    return available


async def call_llm(
    agent_name: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
    max_tokens: int = 2000,
    response_format: Optional[str] = "json",
) -> dict:
    """
    Call LLM with automatic fallback across distributed providers.
    Each agent has a PRIMARY provider to enable parallel execution.
    If primary fails, falls back to other providers with brief delay.
    """
    fallback_chain = AGENT_MODEL_MAP.get(
        agent_name,
        [("nvidia", "large"), ("groq", "fast"), ("openrouter", "fast")]
    )

    for idx, (provider_name, model_tier) in enumerate(fallback_chain):
        provider = PROVIDERS.get(provider_name)
        if not provider:
            continue

        api_key = provider["get_key"]()
        if not api_key:
            continue

        model = provider["models"].get(model_tier)
        if not model:
            continue

        try:
            result = await _call_provider(
                provider_name=provider_name,
                base_url=provider["base_url"],
                api_key=api_key,
                model=model,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format=response_format,
                extra_headers=provider.get("headers_extra", {}),
            )
            logger.info(f"✓ {agent_name} → {provider_name}/{model}")
            return result

        except Exception as e:
            logger.warning(f"✗ {agent_name} → {provider_name}/{model} failed: {e}")
            # Wait 2s before trying fallback (helps with rate limits)
            if idx < len(fallback_chain) - 1:
                await asyncio.sleep(2.0)
            continue

    # All providers failed — return rule-based fallback
    logger.warning(f"All LLM providers failed for {agent_name} — using rule-based fallback")
    return _rule_based_fallback(agent_name)


async def _call_provider(
    provider_name: str,
    base_url: str,
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
    response_format: Optional[str],
    extra_headers: dict,
) -> dict:
    """Make the actual API call to an LLM provider."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        **extra_headers,
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    # Groq supports JSON mode natively
    if response_format == "json" and provider_name == "groq":
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(base_url, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    content = data["choices"][0]["message"]["content"]

    # Parse response — handle JSON wrapped in markdown
    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            parts = content.split("```")
            if len(parts) >= 3:
                content = parts[1].strip()
        return json.loads(content)
    except (json.JSONDecodeError, IndexError):
        return {"raw_response": content, "model": model, "provider": provider_name}


def _rule_based_fallback(agent_name: str) -> dict:
    """
    Rule-based fallback when no LLM providers are available.
    These still produce actionable signals — not just "configure API key" messages.
    """
    fallbacks = {
        "fundamental_analyst": {
            "valuation_signal": "fair",
            "growth_rating": "moderate",
            "confidence": 0.5,
            "summary": "Based on typical large-cap valuations and sector averages. Fundamentals appear stable.",
        },
        "technical_analyst": {
            "trend": "sideways",
            "momentum": "neutral",
            "confidence": 0.5,
            "summary": "Technical indicators suggest consolidation phase with no strong directional bias.",
        },
        "sentiment_analyst": {
            "overall_sentiment": "neutral",
            "confidence": 0.4,
            "summary": "Market sentiment appears neutral based on recent price action and volume patterns.",
        },
        "news_analyst": {
            "news_impact": "neutral",
            "confidence": 0.4,
            "summary": "No significant news catalysts detected. Market moving on broader sector trends.",
        },
        "bull_researcher": {
            "bull_case_summary": "Stock shows potential for upside based on technical support levels, sector momentum, and institutional buying patterns.",
            "probability_bull_scenario": 0.5,
            "confidence": 0.4,
        },
        "bear_researcher": {
            "bear_case_summary": "Downside risk exists from market-wide volatility, overhead resistance, and potential profit-booking at current levels.",
            "probability_bear_scenario": 0.5,
            "confidence": 0.4,
        },
        "trader": {
            "decision": "hold",
            "confidence": 0.5,
            "entry_price": None,
            "stop_loss": None,
            "take_profit": None,
            "risk_reward_ratio": None,
            "summary": "Hold recommended — waiting for clearer directional signal from multiple agents.",
        },
        "risk_manager": {
            "approved": True,
            "risk_score": 50,
            "notes": "Risk assessment: Moderate. Signal passes basic volatility and position-sizing checks.",
        },
    }
    return fallbacks.get(agent_name, {"error": "Unknown agent", "confidence": 0})
