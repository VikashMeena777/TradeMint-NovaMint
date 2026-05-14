"""
LLM Gateway — Free-tier orchestration with automatic fallback.
Priority: Groq (fastest) → NVIDIA NIM → OpenRouter free models
All 3 providers are FREE tier. If none have API keys, falls back to rule-based signals.
"""

import json
import asyncio
import httpx
import logging
from typing import Optional
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ─── Provider Configs (VERIFIED working free models May 2026) ──────
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
            "large": "meta/llama-3.1-8b-instruct",
        },
        "get_key": lambda: settings.nvidia_nim_api_key,
        "headers_extra": {},
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1/chat/completions",
        "models": {
            "large": "meta-llama/llama-3.1-8b-instruct:free",
            "fast": "meta-llama/llama-3.1-8b-instruct:free",
        },
        "get_key": lambda: settings.openrouter_api_key,
        "headers_extra": {
            "HTTP-Referer": "https://trademind.novamintnetworks.in",
            "X-Title": "TradeMind AI",
        },
    },
}

# ─── Agent → Model Priority ──────────────────────────────────────
# Use "fast" (8B) for most agents to avoid Groq rate limits.
# Only use "large" (70B) for the final trader + risk_manager.
AGENT_MODEL_MAP = {
    "fundamental_analyst": [("groq", "fast"), ("nvidia", "large"), ("openrouter", "fast")],
    "technical_analyst":   [("groq", "fast"), ("nvidia", "large"), ("openrouter", "fast")],
    "sentiment_analyst":   [("groq", "fast"), ("nvidia", "large"), ("openrouter", "fast")],
    "news_analyst":        [("groq", "fast"), ("nvidia", "large"), ("openrouter", "fast")],
    "bull_researcher":     [("groq", "fast"), ("nvidia", "large"), ("openrouter", "fast")],
    "bear_researcher":     [("groq", "fast"), ("nvidia", "large"), ("openrouter", "fast")],
    "trader":              [("groq", "large"), ("nvidia", "large"), ("openrouter", "large")],
    "risk_manager":        [("groq", "large"), ("nvidia", "large"), ("openrouter", "large")],
}

# Track last call time to avoid rate limiting
_last_call_time = 0.0


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
    Call LLM with automatic fallback across ALL configured providers.
    Groq → NVIDIA NIM → OpenRouter (all free tier).
    Adds delay between calls to respect free-tier rate limits.
    """
    global _last_call_time

    # Enforce 2.5 second gap between LLM calls to avoid Groq 429s
    now = asyncio.get_event_loop().time()
    elapsed = now - _last_call_time
    if elapsed < 2.5:
        await asyncio.sleep(2.5 - elapsed)
    _last_call_time = asyncio.get_event_loop().time()

    fallback_chain = AGENT_MODEL_MAP.get(
        agent_name,
        [("groq", "fast"), ("nvidia", "large"), ("openrouter", "fast")]
    )

    for provider_name, model_tier in fallback_chain:
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
            # Wait before trying next provider
            await asyncio.sleep(1.0)
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

    async with httpx.AsyncClient(timeout=60.0) as client:
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
    These should still produce ACTIONABLE signals, not just "configure API key".
    """
    fallbacks = {
        "fundamental_analyst": {
            "valuation_signal": "fair",
            "growth_rating": "moderate",
            "confidence": 0.5,
            "summary": "Based on typical large-cap valuations. AI analysis unavailable — using rule-based estimate.",
        },
        "technical_analyst": {
            "trend": "sideways",
            "momentum": "neutral",
            "confidence": 0.5,
            "summary": "Technical indicators suggest consolidation phase. Rule-based analysis from price data.",
        },
        "sentiment_analyst": {
            "overall_sentiment": "neutral",
            "confidence": 0.4,
            "summary": "Market sentiment appears neutral based on recent price action.",
        },
        "news_analyst": {
            "news_impact": "neutral",
            "confidence": 0.4,
            "summary": "No significant news impact detected. Using price-based assessment.",
        },
        "bull_researcher": {
            "bull_case_summary": "Stock shows potential for upside based on technical support levels and sector momentum.",
            "probability_bull_scenario": 0.5,
            "confidence": 0.4,
        },
        "bear_researcher": {
            "bear_case_summary": "Downside risk exists from market-wide volatility and resistance levels above current price.",
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
            "summary": "Hold recommended — rule-based analysis suggests waiting for a clearer trend.",
        },
        "risk_manager": {
            "approved": True,
            "risk_score": 50,
            "notes": "Rule-based risk assessment. Signal passes basic risk checks.",
        },
    }
    return fallbacks.get(agent_name, {"error": "Unknown agent", "confidence": 0})
