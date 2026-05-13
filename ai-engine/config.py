from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """AI Engine configuration — all values from environment variables."""

    # App
    app_name: str = "TradeMind AI Engine"
    debug: bool = False

    # LLM Providers (all free tier)
    groq_api_key: str = ""
    nvidia_nim_api_key: str = ""
    openrouter_api_key: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Broker APIs
    angel_one_api_key: str = ""
    angel_one_client_id: str = ""
    angel_one_password: str = ""
    angel_one_totp_secret: str = ""

    # Signal defaults
    max_signal_latency_seconds: int = 30
    default_temperature: float = 0.1
    max_tokens_per_agent: int = 2000

    model_config = {"env_file": (".env", ".env.local"), "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
