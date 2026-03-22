"""Tests for /api/v1/integrations endpoints and PM integration services."""
import io
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.integrations.base import ExportedIssue


def _create_integration(auth_client, project_id: str, provider: str = "jira") -> dict:
    res = auth_client.post(
        "/api/v1/integrations/",
        json={
            "project_id": project_id,
            "provider": provider,
            "name": f"My {provider.upper()}",
            "credentials": {"server": "https://test.atlassian.net", "email": "test@example.com", "api_token": "token123"},
            "config": {"project_key": "TEST", "issue_type": "Story"},
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def _create_story(auth_client, project_id: str) -> dict:
    res = auth_client.post(
        f"/api/v1/stories/{project_id}/",
        json={
            "project_id": project_id,
            "title": "User login",
            "description": "As a user, I want to log in.",
            "priority": "high",
        },
    )
    assert res.status_code == 201
    return res.json()


# ── Integration CRUD ──────────────────────────────────────────────────────────

class TestIntegrationCRUD:
    def test_create_integration(self, auth_client, test_project):
        integration = _create_integration(auth_client, test_project["id"])
        assert integration["provider"] == "jira"
        assert integration["name"] == "My JIRA"
        assert "credentials_encrypted" not in integration

    def test_list_integrations(self, auth_client, test_project):
        _create_integration(auth_client, test_project["id"], "jira")
        _create_integration(auth_client, test_project["id"], "asana")
        res = auth_client.get("/api/v1/integrations/")
        assert res.status_code == 200
        assert len(res.json()) == 2

    def test_update_integration_name(self, auth_client, test_project):
        integration = _create_integration(auth_client, test_project["id"])
        res = auth_client.put(
            f"/api/v1/integrations/{integration['id']}",
            json={"name": "Renamed JIRA"},
        )
        assert res.status_code == 200
        assert res.json()["name"] == "Renamed JIRA"

    def test_delete_integration(self, auth_client, test_project):
        integration = _create_integration(auth_client, test_project["id"])
        res = auth_client.delete(f"/api/v1/integrations/{integration['id']}")
        assert res.status_code == 204

    def test_credentials_not_exposed(self, auth_client, test_project):
        integration = _create_integration(auth_client, test_project["id"])
        res = auth_client.get(f"/api/v1/integrations/{integration['id']}")
        assert "api_token" not in res.text
        assert "token123" not in res.text


# ── Export endpoint ───────────────────────────────────────────────────────────

class TestExport:
    def test_export_success(self, auth_client, test_project):
        integration = _create_integration(auth_client, test_project["id"])
        story = _create_story(auth_client, test_project["id"])

        mock_issued = ExportedIssue(external_id="TEST-42", external_url="https://test.atlassian.net/browse/TEST-42")

        with patch(
            "app.routers.integrations.get_integration",
            return_value=MagicMock(create_issue=AsyncMock(return_value=mock_issued)),
        ):
            res = auth_client.post(
                f"/api/v1/integrations/{integration['id']}/export",
                json={"story_ids": [story["id"]], "integration_id": integration["id"]},
            )

        assert res.status_code == 200
        results = res.json()
        assert len(results) == 1
        assert results[0]["success"] is True
        assert results[0]["external_id"] == "TEST-42"

    def test_export_marks_story_as_exported(self, auth_client, test_project):
        integration = _create_integration(auth_client, test_project["id"])
        story = _create_story(auth_client, test_project["id"])

        mock_issued = ExportedIssue(external_id="TEST-1", external_url="https://test.atlassian.net/browse/TEST-1")
        with patch(
            "app.routers.integrations.get_integration",
            return_value=MagicMock(create_issue=AsyncMock(return_value=mock_issued)),
        ):
            auth_client.post(
                f"/api/v1/integrations/{integration['id']}/export",
                json={"story_ids": [story["id"]], "integration_id": integration["id"]},
            )

        res = auth_client.get(f"/api/v1/stories/{test_project['id']}/{story['id']}")
        assert res.json()["status"] == "exported"

    def test_export_handles_pm_failure_gracefully(self, auth_client, test_project):
        integration = _create_integration(auth_client, test_project["id"])
        story = _create_story(auth_client, test_project["id"])

        with patch(
            "app.routers.integrations.get_integration",
            return_value=MagicMock(create_issue=AsyncMock(side_effect=Exception("JIRA unavailable"))),
        ):
            res = auth_client.post(
                f"/api/v1/integrations/{integration['id']}/export",
                json={"story_ids": [story["id"]], "integration_id": integration["id"]},
            )

        assert res.status_code == 200
        results = res.json()
        assert results[0]["success"] is False
        assert "JIRA unavailable" in results[0]["error"]

    def test_export_nonexistent_story_returns_error(self, auth_client, test_project):
        integration = _create_integration(auth_client, test_project["id"])

        with patch("app.routers.integrations.get_integration", return_value=MagicMock()):
            res = auth_client.post(
                f"/api/v1/integrations/{integration['id']}/export",
                json={
                    "story_ids": ["00000000-0000-0000-0000-000000000000"],
                    "integration_id": integration["id"],
                },
            )

        assert res.status_code == 200
        assert res.json()[0]["success"] is False


# ── PM integration unit tests ─────────────────────────────────────────────────

class TestAsanaIntegration:
    @pytest.mark.asyncio
    async def test_create_issue(self):
        from app.services.integrations.asana import AsanaIntegration
        import httpx

        integration = AsanaIntegration(
            credentials={"access_token": "test-token"},
            config={"project_gid": "12345"},
        )
        mock_response = MagicMock()
        mock_response.json.return_value = {"data": {"gid": "67890"}}
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_response)):
            result = await integration.create_issue({
                "title": "Test story",
                "description": "As a user...",
                "acceptance_criteria": "1. Works",
                "priority": "high",
            })

        assert result.external_id == "67890"


class TestTrelloIntegration:
    @pytest.mark.asyncio
    async def test_create_issue(self):
        from app.services.integrations.trello import TrelloIntegration

        integration = TrelloIntegration(
            credentials={"api_key": "key123", "api_token": "token456"},
            config={"list_id": "list789"},
        )
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "card_id_abc", "url": "https://trello.com/c/card_id_abc"}
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_response)):
            result = await integration.create_issue({
                "title": "Trello card",
                "description": "As a user...",
                "acceptance_criteria": None,
                "priority": "medium",
            })

        assert result.external_id == "card_id_abc"
