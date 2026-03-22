from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    app_env: str = "development"
    secret_key: str = Field(..., min_length=32)
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    # Database
    database_url: str

    # Encryption key for PM credentials (Fernet)
    encryption_key: str

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost"

    # ── LLM defaults ─────────────────────────────────────────────────────────
    # Provider used when a user has no per-user settings saved.
    # Supported values: openai | anthropic | azure_openai | ollama
    default_llm_provider: str = "openai"
    default_llm_model: str = "gpt-4o"

    # API keys — used as the server-level fallback when a user has not
    # supplied their own key in the UI.
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_deployment: str = ""
    ollama_base_url: str = "http://localhost:11434"

    # ── Document processing ───────────────────────────────────────────────────
    # Chunk size is resolved dynamically per LLM provider (~60% of context window).
    doc_chunk_overlap: int = 200
    doc_max_concurrent_chunks: int = 3

    def get_env_api_key(self, provider: str) -> str | None:
        """Return the server-level API key for a given provider, or None."""
        mapping = {
            "openai": self.openai_api_key,
            "anthropic": self.anthropic_api_key,
            "azure_openai": self.azure_openai_api_key,
        }
        return mapping.get(provider) or None

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
