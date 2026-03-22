"""Tests for /api/v1/projects endpoints."""
import pytest


class TestListProjects:
    def test_empty_list(self, auth_client):
        res = auth_client.get("/api/v1/projects/")
        assert res.status_code == 200
        assert res.json() == []

    def test_returns_owned_projects_only(self, auth_client, test_project):
        res = auth_client.get("/api/v1/projects/")
        assert res.status_code == 200
        ids = [p["id"] for p in res.json()]
        assert test_project["id"] in ids

    def test_requires_auth(self, client):
        res = client.get("/api/v1/projects/")
        assert res.status_code == 403


class TestCreateProject:
    def test_create_success(self, auth_client):
        res = auth_client.post(
            "/api/v1/projects/",
            json={"name": "New Project", "description": "Desc"},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["name"] == "New Project"
        assert "id" in data

    def test_create_without_description(self, auth_client):
        res = auth_client.post("/api/v1/projects/", json={"name": "Minimal"})
        assert res.status_code == 201
        assert res.json()["description"] is None

    def test_create_requires_name(self, auth_client):
        res = auth_client.post("/api/v1/projects/", json={"description": "No name"})
        assert res.status_code == 422


class TestGetProject:
    def test_get_own_project(self, auth_client, test_project):
        res = auth_client.get(f"/api/v1/projects/{test_project['id']}")
        assert res.status_code == 200
        assert res.json()["id"] == test_project["id"]

    def test_get_nonexistent(self, auth_client):
        res = auth_client.get("/api/v1/projects/00000000-0000-0000-0000-000000000000")
        assert res.status_code == 404


class TestUpdateProject:
    def test_update_name(self, auth_client, test_project):
        res = auth_client.put(
            f"/api/v1/projects/{test_project['id']}",
            json={"name": "Renamed"},
        )
        assert res.status_code == 200
        assert res.json()["name"] == "Renamed"

    def test_partial_update_keeps_description(self, auth_client, test_project):
        original_desc = test_project["description"]
        res = auth_client.put(
            f"/api/v1/projects/{test_project['id']}",
            json={"name": "Only Name Changed"},
        )
        assert res.json()["description"] == original_desc


class TestDeleteProject:
    def test_delete_success(self, auth_client, test_project):
        res = auth_client.delete(f"/api/v1/projects/{test_project['id']}")
        assert res.status_code == 204

        res = auth_client.get(f"/api/v1/projects/{test_project['id']}")
        assert res.status_code == 404

    def test_delete_nonexistent(self, auth_client):
        res = auth_client.delete("/api/v1/projects/00000000-0000-0000-0000-000000000000")
        assert res.status_code == 404
