"""Full backend test suite for Mi Sagrado Corazon API."""
import time
import uuid
import requests
from tests.conftest import API, auth


# ---------------- Health & Auth ----------------
def test_health(s):
    r = s.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_login_seeded_accounts(s, superadmin_token, editor_token, moderator_token):
    for tok, role in [
        (superadmin_token, "superadmin"),
        (editor_token, "editor"),
        (moderator_token, "moderator"),
    ]:
        me = s.get(f"{API}/auth/me", headers=auth(tok), timeout=15).json()["user"]
        assert me["role"] == role


def test_login_bad_password(s):
    r = s.post(f"{API}/auth/login", json={"email": "nobody_missing@example.com", "password": "wrong"}, timeout=15)
    assert r.status_code == 401


def test_auth_me(s, user_token):
    r = s.get(f"{API}/auth/me", headers=auth(user_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "user"


def test_onboarding_and_profile(s, user_token):
    r = s.put(
        f"{API}/auth/onboarding",
        json={"patron_saint_id": "saint_corazon", "language": "es"},
        headers=auth(user_token),
        timeout=15,
    )
    assert r.status_code == 200
    u = r.json()["user"]
    assert u["onboarded"] is True
    assert u["patron_saint_id"] == "saint_corazon"

    r = s.put(f"{API}/auth/profile", json={"language": "en"}, headers=auth(user_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["user"]["language"] == "en"


def test_unauthenticated_endpoint(s):
    r = s.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


# ---------------- Saints ----------------
def test_saints_list(s):
    r = s.get(f"{API}/saints", timeout=15)
    assert r.status_code == 200
    saints = r.json()["saints"]
    assert len(saints) > 0
    assert any(x.get("id") == "saint_corazon" for x in saints)


def test_saints_patron_only(s):
    r = s.get(f"{API}/saints?patron_only=true", timeout=15)
    assert r.status_code == 200
    for x in r.json()["saints"]:
        assert x.get("is_patron_catalog") is True


def test_saint_by_id(s):
    r = s.get(f"{API}/saints/saint_corazon", timeout=15)
    assert r.status_code == 200
    assert r.json()["saint"]["id"] == "saint_corazon"

    r = s.get(f"{API}/saints/does_not_exist", timeout=15)
    assert r.status_code == 404


# ---------------- Daily & Streak ----------------
def test_daily_get(s):
    r = s.get(f"{API}/daily", timeout=15)
    assert r.status_code == 200
    assert "daily" in r.json()


def test_daily_complete_increments_streak(s, user_token):
    # streak now
    me = s.get(f"{API}/auth/me", headers=auth(user_token), timeout=15).json()["user"]
    before = me.get("streak", 0)
    kind = f"morning_{uuid.uuid4().hex[:4]}"  # unique kind to force increment
    r = s.post(f"{API}/daily/complete", json={"kind": kind}, headers=auth(user_token), timeout=15)
    assert r.status_code == 200
    after = r.json()["streak"]
    assert after == before + 1
    # idempotent per (date, kind)
    r2 = s.post(f"{API}/daily/complete", json={"kind": kind}, headers=auth(user_token), timeout=15)
    assert r2.json()["streak"] == after


# ---------------- Candles ----------------
def test_light_candle_and_me(s, user_token):
    r = s.post(
        f"{API}/candles",
        json={"saint_id": "saint_corazon", "intention": "TEST intention", "type": "basic"},
        headers=auth(user_token),
        timeout=15,
    )
    assert r.status_code == 200, r.text
    candle = r.json()["candle"]
    assert candle["saint_name"]
    assert candle["price"] == 1

    r2 = s.get(f"{API}/candles/me", headers=auth(user_token), timeout=15)
    assert r2.status_code == 200
    assert any(c["id"] == candle["id"] for c in r2.json()["candles"])


def test_candle_invalid_type(s, user_token):
    r = s.post(
        f"{API}/candles",
        json={"saint_id": "saint_corazon", "intention": "x", "type": "invalid"},
        headers=auth(user_token),
        timeout=15,
    )
    assert r.status_code == 400


def test_community_candles(s):
    r = s.get(f"{API}/candles/community", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert "total" in j and "candles" in j
    for c in j["candles"]:
        assert "intention" not in c  # projection hides intention
        assert "user_id" not in c  # no internal id leaked
        assert "user_name" not in c  # no author name leaked


# ---------------- Intentions ----------------
_state = {}


def test_intentions_create(s, user_token):
    r = s.post(
        f"{API}/intentions",
        json={"text": "TEST oremos por la paz", "category": "general"},
        headers=auth(user_token),
        timeout=15,
    )
    assert r.status_code == 200, r.text
    j = r.json()
    intent = j["intention"]
    assert intent["status"] == "approved"
    _state["intention_id"] = intent["id"]


def test_intentions_list_and_filter(s):
    r = s.get(f"{API}/intentions", timeout=15)
    assert r.status_code == 200
    for i in r.json()["intentions"]:
        assert "user_id" not in i  # no internal id leaked
        assert "prayed_by" not in i  # voter list hidden
        assert "already_prayed" in i  # only whether current user prayed
    r2 = s.get(f"{API}/intentions?category=general", timeout=15)
    assert r2.status_code == 200
    for i in r2.json()["intentions"]:
        assert i["category"] == "general"


def test_intentions_pray_idempotent(s, user_token):
    iid = _state.get("intention_id")
    assert iid, "intention not created"
    r = s.post(f"{API}/intentions/{iid}/pray", headers=auth(user_token), timeout=15)
    assert r.status_code == 200
    first = r.json()
    r2 = s.post(f"{API}/intentions/{iid}/pray", headers=auth(user_token), timeout=15)
    assert r2.status_code == 200
    second = r2.json()
    assert second["already"] is True
    assert second["pray_count"] == first["pray_count"]


# ---------------- Masses ----------------
def test_masses(s, user_token):
    r = s.get(f"{API}/masses/next", timeout=15)
    assert r.status_code == 200
    m = r.json().get("mass")
    r2 = s.get(f"{API}/masses", timeout=15)
    assert r2.status_code == 200
    assert isinstance(r2.json()["masses"], list)
    if m:
        _state["mass_id"] = m["id"]


def test_mass_chat_flow(s, user_token):
    mid = _state.get("mass_id")
    if not mid:
        # take first available
        masses = s.get(f"{API}/masses", timeout=15).json()["masses"]
        if not masses:
            return
        mid = masses[0]["id"]
    r = s.post(f"{API}/masses/{mid}/chat", json={"text": "TEST Amen"}, headers=auth(user_token), timeout=15)
    assert r.status_code == 200
    r2 = s.get(f"{API}/masses/{mid}/chat", timeout=15)
    assert r2.status_code == 200
    assert any(m["text"] == "TEST Amen" for m in r2.json()["messages"])


# ---------------- Causes / Votes / Transparency ----------------
def test_causes_current_and_vote(s, user_token, editor_token):
    from datetime import datetime, timezone

    month = datetime.now(timezone.utc).strftime("%Y-%m")
    # editor creates a voting cause for the current month (no seeded causes exist)
    c = s.post(
        f"{API}/admin/causes",
        json={"month": month, "name": {"es": "TEST causa", "en": "TEST cause"}, "status": "voting"},
        headers=auth(editor_token),
        timeout=15,
    )
    assert c.status_code == 200, c.text
    cid = c.json()["cause"]["id"]

    r = s.get(f"{API}/causes/current", headers=auth(user_token), timeout=15)
    assert r.status_code == 200

    v = s.post(f"{API}/causes/{cid}/vote", headers=auth(user_token), timeout=15)
    assert v.status_code == 200
    # second vote same month must be rejected (unique index + guard)
    v2 = s.post(f"{API}/causes/{cid}/vote", headers=auth(user_token), timeout=15)
    assert v2.status_code == 400

    j2 = s.get(f"{API}/causes/current", headers=auth(user_token), timeout=15).json()
    assert j2["my_vote_cause_id"] == cid


def test_causes_history_transparency(s):
    r = s.get(f"{API}/causes/history", timeout=15)
    assert r.status_code == 200
    r2 = s.get(f"{API}/transparency", timeout=15)
    assert r2.status_code == 200
    j = r2.json()
    assert "records" in j and "total_impact" in j


def test_my_votes(s, user_token):
    r = s.get(f"{API}/votes/me", headers=auth(user_token), timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json()["votes"], list)


# ---------------- Admin RBAC ----------------
def test_metrics_editor(s, editor_token):
    r = s.get(f"{API}/admin/metrics", headers=auth(editor_token), timeout=15)
    assert r.status_code == 200
    j = r.json()
    for k in ["total_users", "total_candles", "candles_by_type", "candles_by_saint"]:
        assert k in j


def test_metrics_forbidden_for_user(s, user_token):
    r = s.get(f"{API}/admin/metrics", headers=auth(user_token), timeout=15)
    assert r.status_code == 403


def test_users_superadmin_only(s, superadmin_token, moderator_token, user_token):
    r = s.get(f"{API}/admin/users", headers=auth(superadmin_token), timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json()["users"], list)

    r2 = s.get(f"{API}/admin/users", headers=auth(moderator_token), timeout=15)
    assert r2.status_code == 403

    r3 = s.get(f"{API}/admin/users", headers=auth(user_token), timeout=15)
    assert r3.status_code == 403


def test_moderation_moderator(s, moderator_token):
    r = s.get(f"{API}/admin/moderation/intentions?status=pending", headers=auth(moderator_token), timeout=15)
    assert r.status_code == 200
    r2 = s.get(f"{API}/admin/moderation/words", headers=auth(moderator_token), timeout=15)
    assert r2.status_code == 200


def test_moderation_forbidden_for_editor(s, editor_token):
    # editor lacks moderator role and isn't superadmin -> should 403
    r = s.get(f"{API}/admin/moderation/intentions", headers=auth(editor_token), timeout=15)
    assert r.status_code == 403


def test_admin_content_editor(s, editor_token):
    r = s.get(f"{API}/admin/causes", headers=auth(editor_token), timeout=15)
    assert r.status_code == 200
    r2 = s.get(f"{API}/admin/daily", headers=auth(editor_token), timeout=15)
    assert r2.status_code == 200
    r3 = s.get(f"{API}/admin/transparency", headers=auth(editor_token), timeout=15)
    assert r3.status_code == 200


def test_admin_content_forbidden_for_moderator(s, moderator_token):
    # moderator does NOT have editor role
    r = s.get(f"{API}/admin/causes", headers=auth(moderator_token), timeout=15)
    assert r.status_code == 403


def test_admin_push_any_staff(s, editor_token, moderator_token, superadmin_token, user_token):
    for tok in [editor_token, moderator_token, superadmin_token]:
        r = s.get(f"{API}/admin/push", headers=auth(tok), timeout=15)
        assert r.status_code == 200
    r_user = s.get(f"{API}/admin/push", headers=auth(user_token), timeout=15)
    assert r_user.status_code == 403


def test_moderation_flow_end_to_end(s, superadmin_token, user_token):
    # add banned word
    w = f"testbanned{uuid.uuid4().hex[:4]}"
    r = s.post(f"{API}/admin/moderation/words", json={"word": w}, headers=auth(superadmin_token), timeout=15)
    assert r.status_code == 200
    # post intention with banned word
    r2 = s.post(
        f"{API}/intentions",
        json={"text": f"TEST palabra {w} otra", "category": "general"},
        headers=auth(user_token),
        timeout=15,
    )
    assert r2.status_code == 200
    j = r2.json()
    assert j["flagged"] is True
    assert j["intention"]["status"] == "pending"
    iid = j["intention"]["id"]
    # approve via moderation
    r3 = s.post(
        f"{API}/admin/moderation/intentions/{iid}",
        json={"action": "approve"},
        headers=auth(superadmin_token),
        timeout=15,
    )
    assert r3.status_code == 200
    # cleanup
    s.delete(f"{API}/admin/moderation/words/{w}", headers=auth(superadmin_token), timeout=15)


def test_logout(s, user_creds):
    # separate login just for logout test
    r = s.post(f"{API}/auth/login", json={"email": user_creds["email"], "password": user_creds["password"]}, timeout=15)
    assert r.status_code == 200
    tok = r.json()["session_token"]
    r2 = s.post(f"{API}/auth/logout", headers=auth(tok), timeout=15)
    assert r2.status_code == 200
    # subsequent /me should fail
    r3 = s.get(f"{API}/auth/me", headers=auth(tok), timeout=15)
    assert r3.status_code == 401
