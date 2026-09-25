import os
import uuid
import logging
import secrets
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Dict

import httpx
from fastapi import FastAPI, APIRouter, Header, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from passlib.context import CryptContext
from pymongo.errors import DuplicateKeyError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

app = FastAPI(title="Mi Sagrado Corazon API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("msc")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


# --------------------------------------------------------------------------
# Models
# --------------------------------------------------------------------------
class LocalizedText(BaseModel):
    es: str = ""
    en: str = ""


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SessionIn(BaseModel):
    session_id: str


class OnboardingIn(BaseModel):
    patron_saint_id: Optional[str] = None
    secondary_saint_ids: List[str] = []
    morning_time: str = "07:30"
    angelus_time: str = "12:00"
    night_time: str = "21:30"
    language: str = "es"


def public_user(u: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "user_id": u["user_id"],
        "email": u.get("email"),
        "name": u.get("name"),
        "picture": u.get("picture"),
        "role": u.get("role", "user"),
        "patron_saint_id": u.get("patron_saint_id"),
        "secondary_saint_ids": u.get("secondary_saint_ids", []),
        "language": u.get("language", "es"),
        "morning_time": u.get("morning_time", "07:30"),
        "angelus_time": u.get("angelus_time", "12:00"),
        "night_time": u.get("night_time", "21:30"),
        "onboarded": u.get("onboarded", False),
        "streak": u.get("streak", 0),
        "blocked": u.get("blocked", False),
        "created_at": u.get("created_at"),
    }


async def mint_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    await db.user_sessions.insert_one(
        {
            "session_token": token,
            "user_id": user_id,
            "created_at": now_utc(),
            "expires_at": now_utc() + timedelta(days=7),
        }
    )
    return token


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    if ensure_aware(session["expires_at"]) < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("blocked"):
        raise HTTPException(status_code=403, detail="Account blocked")
    return user


async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session or ensure_aware(session["expires_at"]) < now_utc():
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user or user.get("blocked"):
        return None
    return user


def require_roles(*roles: str):
    async def checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if user.get("role") == "superadmin":
            return user
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return checker


# --------------------------------------------------------------------------
# AUTH ROUTES
# --------------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = new_id("user")
    doc = {
        "user_id": user_id,
        "email": body.email.lower(),
        "name": body.name,
        "password_hash": pwd_ctx.hash(body.password),
        "role": "user",
        "language": "es",
        "onboarded": False,
        "streak": 0,
        "blocked": False,
        "created_at": now_utc(),
    }
    await db.users.insert_one(doc)
    token = await mint_session(user_id)
    return {"session_token": token, "user": public_user(doc)}


@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not pwd_ctx.verify(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("blocked"):
        raise HTTPException(status_code=403, detail="Account blocked")
    token = await mint_session(user["user_id"])
    return {"session_token": token, "user": public_user(user)}


@api.post("/auth/session")
async def google_session(body: SessionIn):
    async with httpx.AsyncClient(timeout=15) as hc:
        resp = await hc.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": body.session_id})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session id")
    data = resp.json()
    email = (data.get("email") or "").lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name") or existing.get("name"), "picture": data.get("picture")}},
        )
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    else:
        user_id = new_id("user")
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name"),
            "picture": data.get("picture"),
            "role": "user",
            "language": "es",
            "onboarded": False,
            "streak": 0,
            "blocked": False,
            "created_at": now_utc(),
        }
        await db.users.insert_one(user)
    token = await mint_session(user_id)
    return {"session_token": token, "user": public_user(user)}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"user": public_user(user)}


@api.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_many({"session_token": token})
    return {"ok": True}


@api.put("/auth/onboarding")
async def onboarding(body: OnboardingIn, user=Depends(get_current_user)):
    update = {
        "patron_saint_id": body.patron_saint_id,
        "secondary_saint_ids": body.secondary_saint_ids,
        "morning_time": body.morning_time,
        "angelus_time": body.angelus_time,
        "night_time": body.night_time,
        "language": body.language,
        "onboarded": True,
    }
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"user": public_user(u)}


class ProfileUpdate(BaseModel):
    patron_saint_id: Optional[str] = None
    secondary_saint_ids: Optional[List[str]] = None
    morning_time: Optional[str] = None
    angelus_time: Optional[str] = None
    night_time: Optional[str] = None
    language: Optional[str] = None


@api.put("/auth/profile")
async def update_profile(body: ProfileUpdate, user=Depends(get_current_user)):
    update = {k: v for k, v in body.dict().items() if v is not None}
    if update:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"user": public_user(u)}


# --------------------------------------------------------------------------
# SAINTS
# --------------------------------------------------------------------------
@api.get("/saints")
async def list_saints(patron_only: bool = False):
    q: Dict[str, Any] = {"deleted_at": {"$exists": False}}
    if patron_only:
        q["is_patron_catalog"] = True
    saints = await db.saints.find(q, {"_id": 0}).sort("order", 1).to_list(500)
    return {"saints": saints}


@api.get("/saints/{saint_id}")
async def get_saint(saint_id: str):
    saint = await db.saints.find_one({"id": saint_id}, {"_id": 0})
    if not saint:
        raise HTTPException(status_code=404, detail="Saint not found")
    return {"saint": saint}


# --------------------------------------------------------------------------
# DAILY CONTENT
# --------------------------------------------------------------------------
@api.get("/daily")
async def get_daily(date: Optional[str] = None):
    d = date or now_utc().strftime("%Y-%m-%d")
    content = await db.daily_content.find_one({"date": d}, {"_id": 0})
    if not content:
        content = await db.daily_content.find_one({}, {"_id": 0}, sort=[("date", -1)])
    if not content:
        raise HTTPException(status_code=404, detail="No content available")
    saint = None
    if content.get("saint_of_day_id"):
        saint = await db.saints.find_one({"id": content["saint_of_day_id"]}, {"_id": 0})
    content["saint_of_day"] = saint
    return {"daily": content}


class PrayerComplete(BaseModel):
    kind: str


@api.post("/daily/complete")
async def complete_prayer(body: PrayerComplete, user=Depends(get_current_user)):
    today = now_utc().strftime("%Y-%m-%d")
    key = f"{today}:{body.kind}"
    log = await db.prayer_logs.find_one({"user_id": user["user_id"], "key": key})
    if not log:
        await db.prayer_logs.insert_one(
            {"user_id": user["user_id"], "key": key, "date": today, "kind": body.kind, "created_at": now_utc()}
        )
        await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"streak": 1}})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"streak": u.get("streak", 0)}


# --------------------------------------------------------------------------
# CANDLES (simulated payment)
# --------------------------------------------------------------------------
CANDLE_PRICES = {"basic": 1, "solemn": 2, "permanent": 3}


class CandleIn(BaseModel):
    saint_id: str
    intention: str
    type: str = "basic"
    category: str = "general"


@api.post("/candles")
async def light_candle(body: CandleIn, user=Depends(get_current_user)):
    if body.type not in CANDLE_PRICES:
        raise HTTPException(status_code=400, detail="Invalid candle type")
    saint = await db.saints.find_one({"id": body.saint_id}, {"_id": 0})
    if not saint:
        raise HTTPException(status_code=404, detail="Saint not found")
    category = "difuntos" if body.category == "difuntos" else "general"
    doc = {
        "id": new_id("candle"),
        "user_id": user["user_id"],
        "user_name": user.get("name"),
        "saint_id": body.saint_id,
        "saint_name": saint.get("name"),
        "intention": body.intention,
        "type": body.type,
        "category": category,
        "price": CANDLE_PRICES[body.type],
        "active": True,
        "created_at": now_utc(),
    }
    await db.candles.insert_one(doc)
    doc.pop("_id", None)
    return {"candle": doc}


@api.get("/candles/me")
async def my_candles(user=Depends(get_current_user)):
    candles = await db.candles.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"candles": candles}


@api.get("/candles/community")
async def community_candles():
    candles = await db.candles.find(
        {}, {"_id": 0, "intention": 0, "user_id": 0, "user_name": 0}
    ).sort("created_at", -1).to_list(60)
    total = await db.candles.count_documents({})
    return {"candles": candles, "total": total}


# --------------------------------------------------------------------------
# INTENTIONS (community wall)
# --------------------------------------------------------------------------
class IntentionIn(BaseModel):
    text: str
    category: str = "general"


async def contains_banned(text: str) -> bool:
    words = await db.moderation_words.find({}, {"_id": 0}).to_list(500)
    low = text.lower()
    return any(w["word"].lower() in low for w in words)


@api.get("/intentions")
async def list_intentions(category: Optional[str] = None, user=Depends(get_optional_user)):
    q: Dict[str, Any] = {"status": "approved"}
    if category and category != "all":
        q["category"] = category
    items = await db.intentions.find(
        q, {"_id": 0, "user_id": 0}
    ).sort("created_at", -1).to_list(200)
    uid = user["user_id"] if user else None
    out = []
    for it in items:
        prayed_by = it.pop("prayed_by", [])
        it["already_prayed"] = bool(uid and uid in prayed_by)
        out.append(it)
    return {"intentions": out}


@api.post("/intentions")
async def create_intention(body: IntentionIn, user=Depends(get_current_user)):
    flagged = await contains_banned(body.text)
    doc = {
        "id": new_id("int"),
        "user_id": user["user_id"],
        "author_name": user.get("name", "Fiel"),
        "text": body.text.strip()[:500],
        "category": body.category,
        "pray_count": 0,
        "prayed_by": [],
        "status": "pending" if flagged else "approved",
        "created_at": now_utc(),
    }
    await db.intentions.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("user_id", None)
    doc.pop("prayed_by", None)
    doc["already_prayed"] = False
    return {"intention": doc, "flagged": flagged}


@api.post("/intentions/{intention_id}/pray")
async def pray_for(intention_id: str, user=Depends(get_current_user)):
    intention = await db.intentions.find_one({"id": intention_id})
    if not intention:
        raise HTTPException(status_code=404, detail="Intention not found")
    if user["user_id"] in intention.get("prayed_by", []):
        return {"pray_count": intention.get("pray_count", 0), "already": True}
    await db.intentions.update_one(
        {"id": intention_id},
        {"$inc": {"pray_count": 1}, "$push": {"prayed_by": user["user_id"]}},
    )
    updated = await db.intentions.find_one({"id": intention_id}, {"_id": 0})
    return {"pray_count": updated["pray_count"], "already": False}


# --------------------------------------------------------------------------
# MASS (live)
# --------------------------------------------------------------------------
@api.get("/masses/next")
async def next_mass():
    m = await db.masses.find_one(
        {"scheduled_at": {"$gte": now_utc() - timedelta(hours=2)}},
        {"_id": 0},
        sort=[("scheduled_at", 1)],
    )
    if not m:
        m = await db.masses.find_one({}, {"_id": 0}, sort=[("scheduled_at", -1)])
    return {"mass": m}


@api.get("/masses")
async def list_masses():
    masses = await db.masses.find({}, {"_id": 0}).sort("scheduled_at", -1).to_list(50)
    return {"masses": masses}


class ChatIn(BaseModel):
    text: str


@api.get("/masses/{mass_id}/chat")
async def get_chat(mass_id: str):
    msgs = await db.chat_messages.find(
        {"mass_id": mass_id, "status": "visible"}, {"_id": 0, "user_id": 0}
    ).sort("created_at", 1).to_list(200)
    return {"messages": msgs}


@api.post("/masses/{mass_id}/chat")
async def post_chat(mass_id: str, body: ChatIn, user=Depends(get_current_user)):
    flagged = await contains_banned(body.text)
    doc = {
        "id": new_id("chat"),
        "mass_id": mass_id,
        "user_id": user["user_id"],
        "name": user.get("name", "Fiel"),
        "text": body.text.strip()[:300],
        "status": "hidden" if flagged else "visible",
        "created_at": now_utc(),
    }
    await db.chat_messages.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("user_id", None)
    return {"message": doc, "flagged": flagged}


# --------------------------------------------------------------------------
# CAUSES + VOTING + TRANSPARENCY
# --------------------------------------------------------------------------
@api.get("/causes/current")
async def current_causes(user=Depends(get_current_user)):
    month = now_utc().strftime("%Y-%m")
    causes = await db.causes.find({"month": month, "status": {"$in": ["voting", "won"]}}, {"_id": 0}).to_list(20)
    if not causes:
        latest = await db.causes.find_one({"status": {"$in": ["voting", "won"]}}, {"_id": 0}, sort=[("month", -1)])
        if latest:
            month = latest["month"]
            causes = await db.causes.find({"month": month}, {"_id": 0}).to_list(20)
    total_votes = sum(c.get("votes", 0) for c in causes)
    my_vote = await db.votes.find_one({"user_id": user["user_id"], "month": month}, {"_id": 0})
    for c in causes:
        c["percentage"] = round((c.get("votes", 0) / total_votes) * 100) if total_votes else 0
    voting_open = any(c.get("status") == "voting" for c in causes)
    return {
        "month": month,
        "causes": causes,
        "total_votes": total_votes,
        "my_vote_cause_id": my_vote["cause_id"] if my_vote else None,
        "voting_open": voting_open,
    }


@api.post("/causes/{cause_id}/vote")
async def vote_cause(cause_id: str, user=Depends(get_current_user)):
    cause = await db.causes.find_one({"id": cause_id})
    if not cause:
        raise HTTPException(status_code=404, detail="Cause not found")
    if cause.get("status") != "voting":
        raise HTTPException(status_code=400, detail="Voting closed for this cause")
    month = cause["month"]
    existing = await db.votes.find_one({"user_id": user["user_id"], "month": month})
    if existing:
        raise HTTPException(status_code=400, detail="Already voted this month")
    try:
        await db.votes.insert_one(
            {"id": new_id("vote"), "user_id": user["user_id"], "cause_id": cause_id, "month": month, "created_at": now_utc()}
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Already voted this month")
    await db.causes.update_one({"id": cause_id}, {"$inc": {"votes": 1}})
    return {"ok": True}


@api.get("/causes/history")
async def causes_history():
    causes = await db.causes.find(
        {"status": {"$in": ["won", "funded", "archived"]}}, {"_id": 0}
    ).sort("month", -1).to_list(100)
    return {"causes": causes}


@api.get("/transparency")
async def transparency():
    records = await db.transparency.find({"published": True}, {"_id": 0}).sort("month", -1).to_list(100)
    total_impact = sum(r.get("impact_amount", 0) for r in records)
    return {"records": records, "total_impact": total_impact}


@api.get("/votes/me")
async def my_votes(user=Depends(get_current_user)):
    votes = await db.votes.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"votes": votes}


# --------------------------------------------------------------------------
# ADMIN
# --------------------------------------------------------------------------
admin_content = require_roles("editor")
admin_mod = require_roles("moderator")
admin_super = require_roles("superadmin")
admin_any = require_roles("editor", "moderator", "superadmin")


@api.get("/admin/metrics")
async def admin_metrics(user=Depends(admin_any)):
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"onboarded": True})
    total_candles = await db.candles.count_documents({})
    candle_revenue = 0
    async for c in db.candles.find({}, {"_id": 0, "price": 1}):
        candle_revenue += c.get("price", 0)
    intentions_count = await db.intentions.count_documents({})
    votes_count = await db.votes.count_documents({})
    pending_intentions = await db.intentions.count_documents({"status": "pending"})
    by_type = {t: await db.candles.count_documents({"type": t}) for t in CANDLE_PRICES}
    pipeline = [{"$group": {"_id": "$saint_name", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}, {"$limit": 8}]
    by_saint = [{"saint": r["_id"], "count": r["count"]} async for r in db.candles.aggregate(pipeline)]
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_candles": total_candles,
        "candle_revenue": candle_revenue,
        "intentions_count": intentions_count,
        "pending_intentions": pending_intentions,
        "votes_count": votes_count,
        "candles_by_type": by_type,
        "candles_by_saint": by_saint,
    }


class SaintIn(BaseModel):
    name: str
    feast_date: str = ""
    image_url: str = ""
    history: LocalizedText = Field(default_factory=LocalizedText)
    patronages: LocalizedText = Field(default_factory=LocalizedText)
    prayer: LocalizedText = Field(default_factory=LocalizedText)
    is_patron_catalog: bool = False
    order: int = 100


@api.post("/admin/saints")
async def admin_create_saint(body: SaintIn, user=Depends(admin_content)):
    doc = body.dict()
    doc["id"] = new_id("saint")
    await db.saints.insert_one(doc)
    doc.pop("_id", None)
    return {"saint": doc}


@api.put("/admin/saints/{saint_id}")
async def admin_update_saint(saint_id: str, body: SaintIn, user=Depends(admin_content)):
    await db.saints.update_one({"id": saint_id}, {"$set": body.dict()})
    doc = await db.saints.find_one({"id": saint_id}, {"_id": 0})
    return {"saint": doc}


@api.delete("/admin/saints/{saint_id}")
async def admin_delete_saint(saint_id: str, user=Depends(admin_content)):
    await db.saints.update_one({"id": saint_id}, {"$set": {"deleted_at": now_utc()}})
    return {"ok": True}


class DailyIn(BaseModel):
    date: str
    saint_of_day_id: Optional[str] = None
    gospel_ref: str = ""
    gospel_text: LocalizedText = Field(default_factory=LocalizedText)
    meditation_text: LocalizedText = Field(default_factory=LocalizedText)
    meditation_audio_url: str = ""
    morning_prayer: LocalizedText = Field(default_factory=LocalizedText)
    night_prayer: LocalizedText = Field(default_factory=LocalizedText)


@api.get("/admin/daily")
async def admin_list_daily(user=Depends(admin_content)):
    items = await db.daily_content.find({}, {"_id": 0}).sort("date", -1).to_list(200)
    return {"items": items}


@api.post("/admin/daily")
async def admin_upsert_daily(body: DailyIn, user=Depends(admin_content)):
    doc = body.dict()
    await db.daily_content.update_one({"date": body.date}, {"$set": doc}, upsert=True)
    saved = await db.daily_content.find_one({"date": body.date}, {"_id": 0})
    return {"daily": saved}


class MassIn(BaseModel):
    title: LocalizedText = Field(default_factory=LocalizedText)
    youtube_url: str = ""
    scheduled_at: datetime
    is_special: bool = False
    status: str = "scheduled"


@api.post("/admin/masses")
async def admin_create_mass(body: MassIn, user=Depends(admin_content)):
    doc = body.dict()
    doc["id"] = new_id("mass")
    doc["scheduled_at"] = ensure_aware(doc["scheduled_at"])
    await db.masses.insert_one(doc)
    doc.pop("_id", None)
    return {"mass": doc}


@api.put("/admin/masses/{mass_id}")
async def admin_update_mass(mass_id: str, body: MassIn, user=Depends(admin_content)):
    doc = body.dict()
    doc["scheduled_at"] = ensure_aware(doc["scheduled_at"])
    await db.masses.update_one({"id": mass_id}, {"$set": doc})
    m = await db.masses.find_one({"id": mass_id}, {"_id": 0})
    return {"mass": m}


class CauseIn(BaseModel):
    month: str
    name: LocalizedText = Field(default_factory=LocalizedText)
    location: str = ""
    responsible: str = ""
    description: LocalizedText = Field(default_factory=LocalizedText)
    budget: float = 0
    photos: List[str] = []
    timeline: str = ""
    status: str = "voting"


@api.get("/admin/causes")
async def admin_list_causes(user=Depends(admin_content)):
    causes = await db.causes.find({}, {"_id": 0}).sort("month", -1).to_list(200)
    return {"causes": causes}


@api.post("/admin/causes")
async def admin_create_cause(body: CauseIn, user=Depends(admin_content)):
    doc = body.dict()
    doc["id"] = new_id("cause")
    doc["votes"] = 0
    doc["updates"] = []
    doc["amount_transferred"] = 0
    await db.causes.insert_one(doc)
    doc.pop("_id", None)
    return {"cause": doc}


@api.put("/admin/causes/{cause_id}")
async def admin_update_cause(cause_id: str, body: CauseIn, user=Depends(admin_content)):
    await db.causes.update_one({"id": cause_id}, {"$set": body.dict()})
    c = await db.causes.find_one({"id": cause_id}, {"_id": 0})
    return {"cause": c}


class CauseStatusIn(BaseModel):
    status: str


@api.post("/admin/causes/{cause_id}/status")
async def admin_cause_status(cause_id: str, body: CauseStatusIn, user=Depends(admin_content)):
    await db.causes.update_one({"id": cause_id}, {"$set": {"status": body.status}})
    return {"ok": True}


class CauseUpdateIn(BaseModel):
    text: str
    photo: str = ""
    amount_transferred: Optional[float] = None


@api.post("/admin/causes/{cause_id}/update")
async def admin_cause_update(cause_id: str, body: CauseUpdateIn, user=Depends(admin_content)):
    update = {"text": body.text, "photo": body.photo, "date": now_utc().strftime("%Y-%m-%d")}
    ops: Dict[str, Any] = {"$push": {"updates": update}}
    if body.amount_transferred is not None:
        ops["$set"] = {"amount_transferred": body.amount_transferred}
    await db.causes.update_one({"id": cause_id}, ops)
    c = await db.causes.find_one({"id": cause_id}, {"_id": 0})
    return {"cause": c}


class TransparencyIn(BaseModel):
    month: str
    total_income: float = 0
    impact_amount: float = 0
    transferred: float = 0
    cause_id: Optional[str] = None
    cause_name: str = ""
    note: str = ""
    published: bool = True


@api.post("/admin/transparency")
async def admin_transparency(body: TransparencyIn, user=Depends(admin_content)):
    doc = body.dict()
    await db.transparency.update_one({"month": body.month}, {"$set": doc}, upsert=True)
    saved = await db.transparency.find_one({"month": body.month}, {"_id": 0})
    return {"record": saved}


@api.get("/admin/transparency")
async def admin_list_transparency(user=Depends(admin_content)):
    records = await db.transparency.find({}, {"_id": 0}).sort("month", -1).to_list(200)
    return {"records": records}


@api.get("/admin/moderation/intentions")
async def mod_intentions(status: str = "pending", user=Depends(admin_mod)):
    items = await db.intentions.find({"status": status}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"intentions": items}


class ModAction(BaseModel):
    action: str


@api.post("/admin/moderation/intentions/{intention_id}")
async def mod_intention_action(intention_id: str, body: ModAction, user=Depends(admin_mod)):
    status = "approved" if body.action == "approve" else "hidden"
    await db.intentions.update_one({"id": intention_id}, {"$set": {"status": status}})
    return {"ok": True}


@api.get("/admin/moderation/chat")
async def mod_chat(user=Depends(admin_mod)):
    items = await db.chat_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"messages": items}


@api.post("/admin/moderation/chat/{msg_id}")
async def mod_chat_action(msg_id: str, body: ModAction, user=Depends(admin_mod)):
    status = "visible" if body.action == "approve" else "hidden"
    await db.chat_messages.update_one({"id": msg_id}, {"$set": {"status": status}})
    return {"ok": True}


@api.get("/admin/moderation/words")
async def mod_words(user=Depends(admin_mod)):
    words = await db.moderation_words.find({}, {"_id": 0}).sort("word", 1).to_list(500)
    return {"words": words}


class WordIn(BaseModel):
    word: str


@api.post("/admin/moderation/words")
async def mod_add_word(body: WordIn, user=Depends(admin_mod)):
    await db.moderation_words.update_one(
        {"word": body.word.lower()}, {"$set": {"word": body.word.lower()}}, upsert=True
    )
    return {"ok": True}


@api.delete("/admin/moderation/words/{word}")
async def mod_del_word(word: str, user=Depends(admin_mod)):
    await db.moderation_words.delete_one({"word": word.lower()})
    return {"ok": True}


@api.get("/admin/users")
async def admin_users(search: Optional[str] = None, user=Depends(admin_super)):
    q: Dict[str, Any] = {}
    if search:
        q = {"$or": [{"email": {"$regex": search, "$options": "i"}}, {"name": {"$regex": search, "$options": "i"}}]}
    users = await db.users.find(q, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(300)
    return {"users": users}


class RoleIn(BaseModel):
    role: str


@api.post("/admin/users/{target_id}/role")
async def admin_set_role(target_id: str, body: RoleIn, user=Depends(admin_super)):
    if body.role not in ("user", "moderator", "editor", "superadmin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    await db.users.update_one({"user_id": target_id}, {"$set": {"role": body.role}})
    return {"ok": True}


class BlockIn(BaseModel):
    blocked: bool


@api.post("/admin/users/{target_id}/block")
async def admin_block_user(target_id: str, body: BlockIn, user=Depends(admin_super)):
    await db.users.update_one({"user_id": target_id}, {"$set": {"blocked": body.blocked}})
    return {"ok": True}


class PushIn(BaseModel):
    title: str
    body: str
    language: str = "all"
    saint_filter: Optional[str] = None
    scheduled_at: Optional[datetime] = None


@api.get("/admin/push")
async def admin_list_push(user=Depends(admin_any)):
    items = await db.push_notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"notifications": items}


@api.post("/admin/push")
async def admin_create_push(body: PushIn, user=Depends(admin_any)):
    doc = body.dict()
    doc["id"] = new_id("push")
    doc["created_at"] = now_utc()
    if doc.get("scheduled_at"):
        doc["scheduled_at"] = ensure_aware(doc["scheduled_at"])
        doc["status"] = "scheduled"
    else:
        doc["status"] = "sent"
        doc["sent_at"] = now_utc()
    q: Dict[str, Any] = {}
    if doc["language"] != "all":
        q["language"] = doc["language"]
    if doc.get("saint_filter"):
        q["patron_saint_id"] = doc["saint_filter"]
    doc["audience"] = await db.users.count_documents(q)
    await db.push_notifications.insert_one(doc)
    doc.pop("_id", None)
    return {"notification": doc}


@api.get("/")
async def root():
    return {"message": "Mi Sagrado Corazon API", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.saints.create_index("id", unique=True)
    await db.daily_content.create_index("date", unique=True)
    await db.causes.create_index("id", unique=True)
    await db.votes.create_index([("user_id", 1), ("month", 1)], unique=True)
    from seed import run_seed

    await run_seed(db, pwd_ctx)
    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown():
    client.close()
