"""Tests for /api/v1/auth endpoints."""
import pytest


class TestRegister:
    def test_register_success(self, client):
        res = client.post(
            "/api/v1/auth/register",
            json={"email": "new@example.com", "password": "Secret123!", "full_name": "New User"},
        )
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == "new@example.com"
        assert data["user"]["full_name"] == "New User"
        assert "password" not in data["user"]
        assert "password_hash" not in data["user"]

    def test_register_duplicate_email(self, client):
        payload = {"email": "dup@example.com", "password": "Secret123!", "full_name": "User"}
        client.post("/api/v1/auth/register", json=payload)
        res = client.post("/api/v1/auth/register", json=payload)
        assert res.status_code == 409

    def test_register_missing_fields(self, client):
        res = client.post("/api/v1/auth/register", json={"email": "bad@example.com"})
        assert res.status_code == 422


class TestLogin:
    def test_login_success(self, client, test_user):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "Password123!"},
        )
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_login_wrong_password(self, client, test_user):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "WrongPassword"},
        )
        assert res.status_code == 401

    def test_login_unknown_email(self, client):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "ghost@example.com", "password": "Secret123!"},
        )
        assert res.status_code == 401


class TestMe:
    def test_me_authenticated(self, auth_client, test_user):
        res = auth_client.get("/api/v1/auth/me")
        assert res.status_code == 200
        assert res.json()["email"] == test_user.email

    def test_me_unauthenticated(self, client):
        res = client.get("/api/v1/auth/me")
        assert res.status_code == 403

    def test_me_invalid_token(self, client):
        client.headers.update({"Authorization": "Bearer invalid.token.here"})
        res = client.get("/api/v1/auth/me")
        assert res.status_code == 401
