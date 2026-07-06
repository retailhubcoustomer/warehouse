"""Authentication: JWT (email/password) + Emergent Google OAuth. Shared user
collection so a single account can log in with either method."""
import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import jwt
import httpx
from fastapi import APIRouter, HTTPException, Request, Response, Depends

from models import (
    RegisterRequest,
    LoginRequest,
    SelectRoleRequest,
    UserPublic,
    Role,
    gen_id,
    now_utc,
)

JWT_ALG = "HS256"
ACCESS_MIN = 60 * 24  # 24h – MVP simplicity
REFRESH_DAYS = 7
COOKIE_ACCESS = "access_token"
COOKIE_REFRESH = "refresh_token"
COOKIE_SESSION = "session_token"

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------------- password ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


# ---------------- jwt ----------------
def _secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALG)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALG)


def _set_auth_cookies(resp: Response, access: str, refresh: str) -> None:
    resp.set_cookie(COOKIE_ACCESS, access, httponly=True, secure=True, samesite="none",
                    max_age=ACCESS_MIN * 60, path="/")
    resp.set_cookie(COOKIE_REFRESH, refresh, httponly=True, secure=True, samesite="none",
                    max_age=REFRESH_DAYS * 86400, path="/")


def _clear_auth_cookies(resp: Response) -> None:
    for k in (COOKIE_ACCESS, COOKIE_REFRESH, COOKIE_SESSION):
        resp.delete_cookie(k, path="/")


# ---------------- dependency ----------------
async def get_current_user(request: Request) -> dict:
    from db import db  # local import to avoid cycle
    # 1) Google session cookie
    stok = request.cookies.get(COOKIE_SESSION)
    if stok:
        sess = await db.user_sessions.find_one({"session_token": stok}, {"_id": 0})
        if sess:
            exp = sess.get("expires_at")
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp and exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp and exp > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user
    # 2) JWT access cookie or Bearer
    token = request.cookies.get(COOKIE_ACCESS)
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            token = h[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_roles(*roles: Role):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail=f"Requires role: {roles}")
        return user
    return dep


# ---------------- endpoints ----------------
@router.post("/register")
async def register(body: RegisterRequest, response: Response):
    from db import db
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if body.role == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot self-register as super admin")
    user_id = gen_id("usr")
    doc = {
        "user_id": user_id,
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "phone": body.phone,
        "city_id": body.city_id,
        "address": body.address,
        "lat": body.lat,
        "lng": body.lng,
        "kyc_status": "approved" if body.role == "customer" else "pending",
        "is_active": True,
        "created_at": now_utc().isoformat(),
    }
    await db.users.insert_one(doc)
    access = create_access_token(user_id, body.role)
    refresh = create_refresh_token(user_id)
    _set_auth_cookies(response, access, refresh)
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    return {"user": doc, "access_token": access}


@router.post("/login")
async def login(body: LoginRequest, request: Request, response: Response):
    from db import db
    email = body.email.lower()
    # Use email as the primary identifier (safe behind K8s ingress with pod-hopping).
    # If we want per-IP tracking later, read X-Forwarded-For here.
    xff = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    ip = xff or (request.client.host if request.client else "unknown")
    key = f"email:{email}"
    attempts_doc = await db.login_attempts.find_one({"identifier": key}) or {}
    if attempts_doc.get("count", 0) >= 5:
        last = attempts_doc.get("last_at")
        if isinstance(last, str):
            last = datetime.fromisoformat(last)
        if last and last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if last and last > datetime.now(timezone.utc) - timedelta(minutes=15):
            raise HTTPException(status_code=429, detail="Too many attempts, try later")
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": key},
            {"$inc": {"count": 1}, "$set": {"last_at": now_utc().isoformat(), "last_ip": ip}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": key})
    access = create_access_token(user["user_id"], user["role"])
    refresh = create_refresh_token(user["user_id"])
    _set_auth_cookies(response, access, refresh)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "access_token": access}


@router.post("/logout")
async def logout(request: Request, response: Response):
    from db import db
    stok = request.cookies.get(COOKIE_SESSION)
    if stok:
        await db.user_sessions.delete_one({"session_token": stok})
    _clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/google/session")
async def google_session(request: Request, response: Response):
    """Exchange session_id (from Emergent Auth) for a persistent session_token cookie."""
    from db import db
    session_id = request.headers.get("X-Session-ID") or (await request.json()).get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    base = os.environ.get("EMERGENT_AUTH_BASE", "https://demobackend.emergentagent.com/auth/v1/env")
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(f"{base}/oauth/session-data", headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google session")
    data = r.json()
    email = (data.get("email") or "").lower()
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data.get("session_token") or secrets.token_urlsafe(32)
    user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    if not user:
        user = {
            "user_id": gen_id("usr"),
            "email": email,
            "name": name,
            "role": "customer",  # default; user can be promoted by super_admin
            "picture": picture,
            "kyc_status": "approved",
            "is_active": True,
            "created_at": now_utc().isoformat(),
        }
        await db.users.insert_one(user)
        user.pop("_id", None)
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": now_utc().isoformat(),
    })
    response.set_cookie(COOKIE_SESSION, session_token, httponly=True, secure=True,
                        samesite="none", max_age=7 * 86400, path="/")
    return {"user": user}


@router.post("/select-role")
async def select_role(body: SelectRoleRequest, user: dict = Depends(get_current_user)):
    """Allow a fresh Google user to pick a non-admin role once."""
    from db import db
    if body.role == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot self-assign super admin")
    if user.get("role") not in ("customer",):
        raise HTTPException(status_code=400, detail="Role already set")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"role": body.role}})
    return {"ok": True, "role": body.role}


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    from db import db
    tok = request.cookies.get(COOKIE_REFRESH)
    if not tok:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(tok, _secret(), algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(user["user_id"], user["role"])
    response.set_cookie(COOKIE_ACCESS, access, httponly=True, secure=True,
                        samesite="none", max_age=ACCESS_MIN * 60, path="/")
    return {"ok": True}
