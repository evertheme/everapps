from app.services.llm.base import BaseLLMProvider, LLMConfig


class OpenAIProvider(BaseLLMProvider):
    def __init__(self, config: LLMConfig):
        super().__init__(config)
        from openai import AsyncOpenAI
        self._client = AsyncOpenAI(api_key=config.api_key or "")

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        response = await self._client.chat.completions.create(
            model=self.config.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )
        return response.choices[0].message.content or ""
