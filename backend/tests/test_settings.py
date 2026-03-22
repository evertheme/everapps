"""Tests for /api/v1/settings/llm endpoint."""
import pytest
from unittest.mock import patch


class TestLLMSettings:
    def test_get_default_settings(self, auth_client):
        res = auth_client.get("/api/v1/settings/llm")
        assert res.status_code == 200
        data = res.json()
        assert data["provider"] == "openai"
        assert data["model"] == "gpt-4o"
        assert data["has_api_key"] is False

    def test_save_settings(self, auth_client):
        res = auth_client.put(
            "/api/v1/settings/llm",
            json={
                "provider": "anthropic",
                "model": "claude-3-5-sonnet-20241022",
                "api_key": "sk-ant-test-key",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["provider"] == "anthropic"
        assert data["model"] == "claude-3-5-sonnet-20241022"
        assert data["has_api_key"] is True

    def test_api_key_not_returned_in_response(self, auth_client):
        auth_client.put(
            "/api/v1/settings/llm",
            json={"provider": "openai", "model": "gpt-4o", "api_key": "sk-secret"},
        )
        res = auth_client.get("/api/v1/settings/llm")
        response_text = res.text
        assert "sk-secret" not in response_text

    def test_save_ollama_settings(self, auth_client):
        res = auth_client.put(
            "/api/v1/settings/llm",
            json={
                "provider": "ollama",
                "model": "llama3",
                "base_url": "http://my-ollama-host:11434",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["provider"] == "ollama"
        assert data["base_url"] == "http://my-ollama-host:11434"

    def test_save_azure_settings(self, auth_client):
        res = auth_client.put(
            "/api/v1/settings/llm",
            json={
                "provider": "azure_openai",
                "model": "gpt-4",
                "api_key": "azure-key",
                "base_url": "https://my.openai.azure.com",
                "azure_deployment": "my-gpt4-deployment",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["azure_deployment"] == "my-gpt4-deployment"

    def test_update_overwrites_existing(self, auth_client):
        auth_client.put(
            "/api/v1/settings/llm",
            json={"provider": "openai", "model": "gpt-3.5-turbo", "api_key": "key-1"},
        )
        auth_client.put(
            "/api/v1/settings/llm",
            json={"provider": "anthropic", "model": "claude-3-opus-20240229"},
        )
        res = auth_client.get("/api/v1/settings/llm")
        assert res.json()["provider"] == "anthropic"
