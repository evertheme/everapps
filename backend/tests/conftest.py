"""
Shared fixtures for all backend tests.

Uses a SQLite in-memory database so tests run without a real PostgreSQL instance.
All tests that need an authenticated client receive `auth_client`, which carries
a valid Bearer token for a pre-created test user.
"""
import os
import uuid
import pytest
from cryptography.fernet import Fernet

# Set required env vars before importing app modules
_TEST_FERNET_KEY = Fernet.generate_key().decode()
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-characters-long!!")
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("ENCRYPTION_KEY", _TEST_FERNET_KEY)
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.services.auth import hash_password, create_access_token  # noqa: uses bcrypt directly now

# ── In-memory SQLite engine ────────────────────────────────────────────────────
SQLALCHEMY_TEST_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Enable FK enforcement for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, _):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function", autouse=True)
def reset_db():
    """Create all tables before each test and drop them after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ── Client fixtures ────────────────────────────────────────────────────────────

@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user(db_session):
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        password_hash=hash_password("Password123!"),
        full_name="Test User",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_client(client, test_user):
    """TestClient with a valid Bearer token for test_user pre-set."""
    token = create_access_token(test_user.id)
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


@pytest.fixture
def test_project(auth_client, test_user, db_session):
    """A project belonging to test_user, created via the API."""
    response = auth_client.post(
        "/api/v1/projects/",
        json={"name": "Test Project", "description": "A project for tests"},
    )
    assert response.status_code == 201
    return response.json()
