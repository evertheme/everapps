"""Tests for /api/v1/stories endpoints — CRUD, versioning, and review."""
import io
import uuid
import pytest
from unittest.mock import AsyncMock, patch


def _upload_doc(auth_client, project_id: str) -> dict:
    res = auth_client.post(
        f"/api/v1/documents/{project_id}/upload",
        files={
            "file": (
                "spec.txt",
                io.BytesIO(b"As a user I want to log in so I can access my account."),
                "text/plain",
            )
        },
    )
    assert res.status_code == 201
    return res.json()


def _create_story(auth_client, project_id: str) -> dict:
    res = auth_client.post(
        f"/api/v1/stories/{project_id}/",
        json={
            "project_id": project_id,
            "title": "User login",
            "description": "As a user, I want to log in so I can access my account.",
            "acceptance_criteria": "1. Given valid credentials, user is logged in.",
            "priority": "high",
            "story_points": 3,
        },
    )
    assert res.status_code == 201
    return res.json()


# ── CRUD ──────────────────────────────────────────────────────────────────────

class TestStoryCRUD:
    def test_create_story(self, auth_client, test_project):
        story = _create_story(auth_client, test_project["id"])
        assert story["title"] == "User login"
        assert story["status"] == "draft"
        assert story["current_version"] == 1

    def test_list_stories(self, auth_client, test_project):
        _create_story(auth_client, test_project["id"])
        _create_story(auth_client, test_project["id"])
        res = auth_client.get(f"/api/v1/stories/{test_project['id']}/")
        assert res.status_code == 200
        assert len(res.json()) == 2

    def test_get_story(self, auth_client, test_project):
        story = _create_story(auth_client, test_project["id"])
        res = auth_client.get(f"/api/v1/stories/{test_project['id']}/{story['id']}")
        assert res.status_code == 200
        assert res.json()["id"] == story["id"]

    def test_get_nonexistent_story(self, auth_client, test_project):
        res = auth_client.get(
            f"/api/v1/stories/{test_project['id']}/00000000-0000-0000-0000-000000000000"
        )
        assert res.status_code == 404

    def test_update_story(self, auth_client, test_project):
        story = _create_story(auth_client, test_project["id"])
        res = auth_client.put(
            f"/api/v1/stories/{test_project['id']}/{story['id']}",
            json={"title": "Updated title", "priority": "critical"},
        )
        assert res.status_code == 200
        updated = res.json()
        assert updated["title"] == "Updated title"
        assert updated["priority"] == "critical"

    def test_delete_story(self, auth_client, test_project):
        story = _create_story(auth_client, test_project["id"])
        res = auth_client.delete(f"/api/v1/stories/{test_project['id']}/{story['id']}")
        assert res.status_code == 204

        res = auth_client.get(f"/api/v1/stories/{test_project['id']}/{story['id']}")
        assert res.status_code == 404


# ── Versioning ────────────────────────────────────────────────────────────────

class TestStoryVersioning:
    def test_update_increments_version(self, auth_client, test_project):
        story = _create_story(auth_client, test_project["id"])
        assert story["current_version"] == 1

        auth_client.put(
            f"/api/v1/stories/{test_project['id']}/{story['id']}",
            json={"title": "Edit one"},
        )
        auth_client.put(
            f"/api/v1/stories/{test_project['id']}/{story['id']}",
            json={"title": "Edit two"},
        )

        res = auth_client.get(f"/api/v1/stories/{test_project['id']}/{story['id']}")
        assert res.json()["current_version"] == 3

    def test_list_versions(self, auth_client, test_project):
        story = _create_story(auth_client, test_project["id"])
        auth_client.put(
            f"/api/v1/stories/{test_project['id']}/{story['id']}",
            json={"title": "After first edit"},
        )

        res = auth_client.get(f"/api/v1/stories/{test_project['id']}/{story['id']}/versions")
        assert res.status_code == 200
        versions = res.json()
        assert len(versions) == 2
        assert versions[0]["version_number"] == 1
        assert versions[1]["content"]["title"] == "After first edit"


# ── LLM story generation ──────────────────────────────────────────────────────

class TestStoryGeneration:
    def test_generate_from_document(self, auth_client, test_project):
        doc = _upload_doc(auth_client, test_project["id"])
        mock_stories = [
            {
                "title": "User login",
                "description": "As a user, I want to log in.",
                "acceptance_criteria": "1. Valid credentials → logged in.",
                "priority": "high",
                "story_points": 3,
            }
        ]
        with patch(
            "app.routers.stories.generate_stories",
            new=AsyncMock(return_value=mock_stories),
        ):
            res = auth_client.post(
                "/api/v1/stories/generate",
                json={"project_id": test_project["id"], "document_id": doc["id"]},
            )
        assert res.status_code == 201
        stories = res.json()
        assert len(stories) == 1
        assert stories[0]["title"] == "User login"
        assert stories[0]["status"] == "draft"

    def test_generate_invalid_document(self, auth_client, test_project):
        res = auth_client.post(
            "/api/v1/stories/generate",
            json={
                "project_id": test_project["id"],
                "document_id": "00000000-0000-0000-0000-000000000000",
            },
        )
        assert res.status_code == 404

    def test_generate_llm_failure_returns_502(self, auth_client, test_project):
        doc = _upload_doc(auth_client, test_project["id"])
        with patch(
            "app.routers.stories.generate_stories",
            new=AsyncMock(side_effect=Exception("API error")),
        ):
            res = auth_client.post(
                "/api/v1/stories/generate",
                json={"project_id": test_project["id"], "document_id": doc["id"]},
            )
        assert res.status_code == 502


# ── LLM review ────────────────────────────────────────────────────────────────

class TestStoryReview:
    def test_review_story(self, auth_client, test_project):
        story = _create_story(auth_client, test_project["id"])
        mock_review = {
            "overall_status": "clear",
            "feedback": {
                "clarity": {"score": 5, "comment": "Crystal clear"},
                "completeness": {"score": 4, "comment": "Good"},
                "testability": {"score": 5, "comment": "Well defined"},
                "independence": {"score": 4, "comment": "Mostly independent"},
                "value": {"score": 5, "comment": "Clear value"},
            },
            "suggestions": None,
        }
        with patch(
            "app.routers.stories.review_story",
            new=AsyncMock(return_value=mock_review),
        ):
            res = auth_client.post(
                f"/api/v1/stories/{test_project['id']}/{story['id']}/review"
            )
        assert res.status_code == 200
        data = res.json()
        assert data["overall_status"] == "clear"
        assert "clarity" in data["feedback"]

    def test_review_marks_story_as_reviewed(self, auth_client, test_project):
        story = _create_story(auth_client, test_project["id"])
        mock_review = {
            "overall_status": "clear",
            "feedback": {},
            "suggestions": None,
        }
        with patch(
            "app.routers.stories.review_story",
            new=AsyncMock(return_value=mock_review),
        ):
            auth_client.post(f"/api/v1/stories/{test_project['id']}/{story['id']}/review")

        res = auth_client.get(f"/api/v1/stories/{test_project['id']}/{story['id']}")
        assert res.json()["status"] == "reviewed"

    def test_list_reviews(self, auth_client, test_project):
        story = _create_story(auth_client, test_project["id"])
        mock_review = {"overall_status": "ambiguous", "feedback": {}, "suggestions": "Be specific"}
        with patch(
            "app.routers.stories.review_story",
            new=AsyncMock(return_value=mock_review),
        ):
            auth_client.post(f"/api/v1/stories/{test_project['id']}/{story['id']}/review")
            auth_client.post(f"/api/v1/stories/{test_project['id']}/{story['id']}/review")

        res = auth_client.get(f"/api/v1/stories/{test_project['id']}/{story['id']}/reviews")
        assert res.status_code == 200
        assert len(res.json()) == 2
