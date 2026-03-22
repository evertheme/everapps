"""Unit tests for LLM provider classes and factory (no real API calls)."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.llm.base import LLMConfig
from app.services.llm.factory import _build_provider


class TestLLMFactory:
    def test_builds_openai_provider(self):
        config = LLMConfig(provider="openai", api_key="sk-test", model="gpt-4o")
        provider = _build_provider(config)
        assert provider.provider_name == "openai"

    def test_builds_anthropic_provider(self):
        config = LLMConfig(provider="anthropic", api_key="sk-ant-test", model="claude-3-5-sonnet-20241022")
        provider = _build_provider(config)
        assert provider.provider_name == "anthropic"

    def test_builds_azure_provider(self):
        config = LLMConfig(
            provider="azure_openai",
            api_key="azure-key",
            model="gpt-4",
            base_url="https://test.openai.azure.com",
            azure_deployment="my-deployment",
        )
        provider = _build_provider(config)
        assert provider.provider_name == "azure_openai"

    def test_builds_ollama_provider(self):
        config = LLMConfig(provider="ollama", api_key=None, model="llama3", base_url="http://localhost:11434")
        provider = _build_provider(config)
        assert provider.provider_name == "ollama"

    def test_unknown_provider_raises(self):
        config = LLMConfig(provider="unknown_llm", api_key=None, model="x")
        with pytest.raises(ValueError, match="Unknown LLM provider"):
            _build_provider(config)


class TestOpenAIProvider:
    @pytest.mark.asyncio
    async def test_complete_returns_text(self):
        from app.services.llm.openai_provider import OpenAIProvider

        mock_choice = MagicMock()
        mock_choice.message.content = "Generated text"
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]

        config = LLMConfig(provider="openai", api_key="sk-test", model="gpt-4o")
        provider = OpenAIProvider(config)
        provider._client.chat.completions.create = AsyncMock(return_value=mock_response)

        result = await provider.complete("system", "user")
        assert result == "Generated text"


class TestStoryGenerator:
    @pytest.mark.asyncio
    async def test_generate_parses_valid_json(self):
        from app.services.story_generator import generate_stories

        mock_provider = AsyncMock()
        mock_provider.complete.return_value = '[{"title":"Login","description":"As a user...","acceptance_criteria":"1. Valid login","priority":"high","story_points":3}]'

        result = await generate_stories("User needs to log in.", mock_provider)
        assert len(result) == 1
        assert result[0]["title"] == "Login"

    @pytest.mark.asyncio
    async def test_generate_strips_markdown_fences(self):
        from app.services.story_generator import generate_stories

        mock_provider = AsyncMock()
        mock_provider.complete.return_value = '```json\n[{"title":"T","description":"D","acceptance_criteria":"A","priority":"medium","story_points":2}]\n```'

        result = await generate_stories("Requirement text.", mock_provider)
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_generate_raises_on_invalid_json(self):
        from app.services.story_generator import generate_stories

        mock_provider = AsyncMock()
        mock_provider.complete.return_value = "This is not JSON at all."

        with pytest.raises(ValueError, match="valid JSON"):
            await generate_stories("Requirements.", mock_provider)


class TestStoryReviewer:
    @pytest.mark.asyncio
    async def test_review_parses_valid_json(self):
        from app.services.story_reviewer import review_story

        mock_provider = AsyncMock()
        mock_provider.complete.return_value = '{"overall_status":"clear","feedback":{"clarity":{"score":5,"comment":"Good"}},"suggestions":null}'

        result = await review_story("Title", "Description", "AC", mock_provider)
        assert result["overall_status"] == "clear"
        assert result["feedback"]["clarity"]["score"] == 5

    @pytest.mark.asyncio
    async def test_review_strips_markdown_fences(self):
        from app.services.story_reviewer import review_story

        mock_provider = AsyncMock()
        mock_provider.complete.return_value = '```json\n{"overall_status":"ambiguous","feedback":{},"suggestions":"Be specific"}\n```'

        result = await review_story("T", "D", "AC", mock_provider)
        assert result["overall_status"] == "ambiguous"
