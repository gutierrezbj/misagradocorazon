import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL") or "https://app-concept-review.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def api_url():
    return API


@pytest.fixture(scope="session")
def s():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def _login(s, email, password):
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return r.json()["session_token"]


@pytest.fixture(scope="session")
def superadmin_token(s):
    return _login(s, "admin@misagradocorazon.com", "Sagrado2026")


@pytest.fixture(scope="session")
def editor_token(s):
    return _login(s, "editor@misagradocorazon.com", "Editor2026")


@pytest.fixture(scope="session")
def moderator_token(s):
    return _login(s, "moderador@misagradocorazon.com", "Moderador2026")


@pytest.fixture(scope="session")
def user_creds():
    unique = uuid.uuid4().hex[:8]
    return {
        "email": f"TEST_user_{unique}@example.com",
        "password": "TestPass2026!",
        "name": f"TEST User {unique}",
    }


@pytest.fixture(scope="session")
def user_token(s, user_creds):
    r = s.post(f"{API}/auth/register", json=user_creds, timeout=20)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    return r.json()["session_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
