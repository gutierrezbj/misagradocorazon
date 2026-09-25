import os
import uuid
import pytest
import requests
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except Exception:
    pass

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


def _staff_creds(email_key, pwd_key):
    """Read staff credentials from environment. Skip the test if absent."""
    email = os.environ.get(email_key)
    pwd = os.environ.get(pwd_key)
    if not email or not pwd:
        pytest.skip(f"{email_key}/{pwd_key} not configured in environment")
    return email, pwd


def _login(s, email, password):
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return r.json()["session_token"]


@pytest.fixture(scope="session")
def superadmin_token(s):
    email, pwd = _staff_creds("SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD")
    return _login(s, email, pwd)


@pytest.fixture(scope="session")
def editor_token(s):
    email, pwd = _staff_creds("SEED_EDITOR_EMAIL", "SEED_EDITOR_PASSWORD")
    return _login(s, email, pwd)


@pytest.fixture(scope="session")
def moderator_token(s):
    email, pwd = _staff_creds("SEED_MODERATOR_EMAIL", "SEED_MODERATOR_PASSWORD")
    return _login(s, email, pwd)


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
