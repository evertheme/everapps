from app.services.llm.base import BaseLLMProvider, LLMConfig


class AnthropicProvider(BaseLLMProvider):
    def __init__(self, config: LLMConfig):
        super().__init__(config)
        import anthropic
        self._client = anthropic.AsyncAnthropic(api_key=config.api_key or "")

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        response = await self._client.messages.create(
            model=self.config.model,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return response.content[0].text if response.content else ""
