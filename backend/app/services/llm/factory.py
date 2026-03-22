from app.services.llm.base import BaseLLMProvider, LLMConfig
from app.models.settings import LLMSettings
from app.config import get_settings
from app.utils.security import decrypt


def get_provider_for_user(llm_settings: LLMSettings | None) -> BaseLLMProvider:
    """
    Resolve the LLM provider for a request using this priority order:

    1. User's per-user settings (provider + model + API key stored in DB)
    2. Server-level env var API key for whatever provider the user selected
    3. Server-level default provider (DEFAULT_LLM_PROVIDER, defaults to OpenAI)
    """
    env = get_settings()

    if llm_settings:
        # Decrypt the stored key if present; fall back to the matching env var.
        if llm_settings.api_key_encrypted:
            api_key = decrypt(llm_settings.api_key_encrypted)
        else:
            api_key = env.get_env_api_key(llm_settings.provider)

        config = LLMConfig(
            provider=llm_settings.provider,
            api_key=api_key,
            model=llm_settings.model,
            base_url=llm_settings.base_url or _default_base_url(llm_settings.provider, env),
            azure_deployment=llm_settings.azure_deployment or env.azure_openai_deployment or None,
        )
    else:
        # No per-user settings — use server defaults (OpenAI unless overridden via env)
        provider = env.default_llm_provider
        config = LLMConfig(
            provider=provider,
            api_key=env.get_env_api_key(provider),
            model=env.default_llm_model,
            base_url=_default_base_url(provider, env),
            azure_deployment=env.azure_openai_deployment or None,
        )

    return _build_provider(config)


def _default_base_url(provider: str, env) -> str | None:
    if provider == "ollama":
        return env.ollama_base_url
    if provider == "azure_openai":
        return env.azure_openai_endpoint or None
    return None


def _build_provider(config: LLMConfig) -> BaseLLMProvider:
    if config.provider == "openai":
        from app.services.llm.openai_provider import OpenAIProvider
        return OpenAIProvider(config)
    elif config.provider == "anthropic":
        from app.services.llm.anthropic_provider import AnthropicProvider
        return AnthropicProvider(config)
    elif config.provider == "azure_openai":
        from app.services.llm.azure_provider import AzureOpenAIProvider
        return AzureOpenAIProvider(config)
    elif config.provider == "ollama":
        from app.services.llm.ollama_provider import OllamaProvider
        return OllamaProvider(config)
    else:
        raise ValueError(f"Unknown LLM provider: {config.provider}")
