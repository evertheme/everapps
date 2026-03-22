from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class LLMConfig:
    provider: str
    api_key: str | None
    model: str
    base_url: str | None = None
    azure_deployment: str | None = None


class BaseLLMProvider(ABC):
    def __init__(self, config: LLMConfig):
        self.config = config

    @abstractmethod
    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        """Return a completion string given system and user prompts."""
        ...

    @property
    def provider_name(self) -> str:
        return self.config.provider
