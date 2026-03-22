"""Tests for /api/v1/documents endpoints and the document parser service."""
import io
import pytest
from app.services.document_parser import parse_document


# ── Unit tests: document parser ───────────────────────────────────────────────

class TestDocumentParser:
    def test_parse_txt(self):
        content = b"Hello World\n\nThis is a requirement."
        result = parse_document(content, "req.txt")
        assert "Hello World" in result
        assert "requirement" in result

    def test_parse_md(self):
        content = b"# Feature\n\nAs a user I want to log in."
        result = parse_document(content, "spec.md")
        assert "Feature" in result
        assert "log in" in result

    def test_unsupported_type_raises(self):
        with pytest.raises(ValueError, match="Unsupported"):
            parse_document(b"data", "file.xlsx")

    def test_utf8_fallback(self):
        content = "Café résumé".encode("latin-1")
        result = parse_document(content, "file.txt")
        assert len(result) > 0


# ── Integration tests: upload endpoint ───────────────────────────────────────

class TestDocumentUpload:
    def _upload(self, auth_client, project_id: str, filename: str, content: bytes):
        return auth_client.post(
            f"/api/v1/documents/{project_id}/upload",
            files={"file": (filename, io.BytesIO(content), "text/plain")},
        )

    def test_upload_txt(self, auth_client, test_project):
        res = self._upload(
            auth_client,
            test_project["id"],
            "spec.txt",
            b"As a user I want to log in so I can access my account.",
        )
        assert res.status_code == 201
        data = res.json()
        assert data["filename"] == "spec.txt"
        assert data["current_version"] == 1
        assert "log in" in (data["latest_content"] or "")

    def test_upload_md(self, auth_client, test_project):
        res = self._upload(
            auth_client,
            test_project["id"],
            "requirements.md",
            b"# Requirements\n\n- User login\n- User registration",
        )
        assert res.status_code == 201
        assert res.json()["file_type"] == "md"

    def test_upload_unsupported_type(self, auth_client, test_project):
        res = self._upload(
            auth_client,
            test_project["id"],
            "data.xlsx",
            b"binary",
        )
        assert res.status_code == 422

    def test_upload_wrong_project(self, auth_client):
        res = self._upload(
            auth_client,
            "00000000-0000-0000-0000-000000000000",
            "spec.txt",
            b"content",
        )
        assert res.status_code == 404

    def test_upload_requires_auth(self, client, test_project):
        res = client.post(
            f"/api/v1/documents/{test_project['id']}/upload",
            files={"file": ("spec.txt", io.BytesIO(b"content"), "text/plain")},
        )
        assert res.status_code == 403


class TestDocumentVersioning:
    def _upload(self, auth_client, project_id, content):
        return auth_client.post(
            f"/api/v1/documents/{project_id}/upload",
            files={"file": ("spec.txt", io.BytesIO(content), "text/plain")},
        )

    def test_reupload_increments_version(self, auth_client, test_project):
        pid = test_project["id"]
        first = self._upload(auth_client, pid, b"Version one content")
        doc_id = first.json()["id"]

        res = auth_client.post(
            f"/api/v1/documents/{pid}/{doc_id}/reupload",
            files={"file": ("spec_v2.txt", io.BytesIO(b"Version two content"), "text/plain")},
        )
        assert res.status_code == 200
        assert res.json()["current_version"] == 2

    def test_list_versions(self, auth_client, test_project):
        pid = test_project["id"]
        first = self._upload(auth_client, pid, b"v1 content")
        doc_id = first.json()["id"]

        auth_client.post(
            f"/api/v1/documents/{pid}/{doc_id}/reupload",
            files={"file": ("spec_v2.txt", io.BytesIO(b"v2 content"), "text/plain")},
        )

        res = auth_client.get(f"/api/v1/documents/{pid}/{doc_id}/versions")
        assert res.status_code == 200
        versions = res.json()
        assert len(versions) == 2
        assert versions[0]["version_number"] == 1
        assert versions[1]["version_number"] == 2
