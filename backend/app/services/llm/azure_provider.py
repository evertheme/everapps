from app.services.llm.base import BaseLLMProvider, LLMConfig


class AzureOpenAIProvider(BaseLLMProvider):
    def __init__(self, config: LLMConfig):
        super().__init__(config)
        from openai import AsyncAzureOpenAI
        self._client = AsyncAzureOpenAI(
            api_key=config.api_key or "",
            azure_endpoint=config.base_url or "",
            azure_deployment=config.azure_deployment or config.model,
            api_version="2024-02-01",
        )

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        response = await self._client.chat.completions.create(
            model=self.config.azure_deployment or self.config.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )
        return response.choices[0].message.content or ""
