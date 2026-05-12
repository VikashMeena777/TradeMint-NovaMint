"""
LLM Gateway — Free-tier orchestration with automatic fallback.
Priority: Groq (fastest) → NVIDIA NIM → OpenRouter free models
All 3 providers are FREE tier. If none have API keys, falls back to rule-based signals.
"""

import json
import httpx
import logging
from typing import Optional
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ─── Provider Configs ──────────────────────────────
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
            "large": "meta/llama-3.1-70b-instruct",
            "reasoning": "deepseek-ai/deepseek-r1",
        },
        "get_key": lambda: settings.nvidia_nim_api_key,
        "headers_extra": {},
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1/chat/completions",
        "models": {
            "large": "meta-llama/llama-3.3-70b-instruct:free",
            "reasoning": "deepseek/deepseek-r1:free",
            "fast": "mistralai/mistral-7b-instruct:free",
        },
        "get_key": lambda: settings.openrouter_api_key,
        "headers_extra": {
            "HTTP-Referer": "https://trademind.ai",
            "X-Title": "TradeMind AI",
        },
    },
}

# ─── Agent → Model Priority (tries ALL providers in order) ──────
AGENT_MODEL_MAP = {
    "fundamental_analyst": [("groq", "large"), ("nvidia", "large"), ("openrouter", "large")],
    "technical_analyst":   [("groq", "large"), ("nvidia", "large"), ("openrouter", "large")],
    "sentiment_analyst":   [("groq", "fast"), ("openrouter", "fast"), ("nvidia", "large")],
    "news_analyst":        [("groq", "large"), ("nvidia", "large"), ("openrouter", "large")],
    "bull_researcher":     [("groq", "large"), ("nvidia", "reasoning"), ("openrouter", "reasoning")],
    "bear_researcher":     [("groq", "large"), ("nvidia", "reasoning"), ("openrouter", "reasoning")],
    "trader":              [("groq", "large"), ("nvidia", "reasoning"), ("openrouter", "reasoning")],
    "risk_manager":        [("groq", "large"), ("nvidia", "large"), ("openrouter", "large")],
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
    Call LLM with automatic fallback across ALL configured providers.
    Groq → NVIDIA NIM → OpenRouter (all free tier).
    Falls back to rule-based output if no providers available.
    """
    fallback_chain = AGENT_MODEL_MAP.get(agent_name, [("groq", "large"), ("nvidia", "large"), ("openrouter", "large")])

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

    async with httpx.AsyncClient(timeout=45.0) as client:
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
    """Rule-based fallback when no LLM providers are available."""
    fallbacks = {
        "fundamental_analyst": {
            "valuation_signal": "fair",
            "growth_rating": "moderate",
            "confidence": 0.4,
            "summary": "Rule-based: Unable to perform AI analysis. Add a free Groq/NVIDIA/OpenRouter API key for AI-powered insights.",
        },
        "technical_analyst": {
            "trend": "sideways",
            "momentum": "neutral",
            "confidence": 0.4,
            "summary": "Rule-based analysis from indicators only. Add an LLM API key for deeper pattern recognition.",
        },
        "sentiment_analyst": {
            "overall_sentiment": "neutral",
            "confidence": 0.3,
            "summary": "Sentiment analysis requires an LLM. Configure Groq, NVIDIA NIM, or OpenRouter (all free).",
        },
        "news_analyst": {
            "news_impact": "neutral",
            "confidence": 0.3,
            "summary": "News analysis requires an LLM. Configure a free API key to enable.",
        },
        "bull_researcher": {
            "bull_case_summary": "Bull case analysis requires an LLM provider.",
            "probability_bull_scenario": 0.5,
            "confidence": 0.3,
        },
        "bear_researcher": {
            "bear_case_summary": "Bear case analysis requires an LLM provider.",
            "probability_bear_scenario": 0.5,
            "confidence": 0.3,
        },
        "trader": {
            "decision": "hold",
            "confidence": 0.3,
            "entry_price": None,
            "stop_loss": None,
            "take_profit": None,
            "risk_reward_ratio": None,
            "summary": "Hold recommended — AI analysis requires at least one free LLM API key (Groq/NVIDIA/OpenRouter).",
        },
        "risk_manager": {
            "approved": False,
            "risk_score": 80,
            "notes": "Cannot validate without AI analysis. Add a free LLM API key to activate the risk engine.",
        },
    }
    return fallbacks.get(agent_name, {"error": "Unknown agent", "confidence": 0})
