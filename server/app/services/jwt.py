import jwt
import secrets
import hashlib

from datetime import datetime, timedelta, timezone

from app.core.config import settings


ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60
SIGNUP_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30


def create_access_token(
    user_id: int,
    user_type: str
):
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "type": user_type,
        "purpose":"access",
        "exp": expire
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=ALGORITHM
    )


def create_signup_token(email: str):
    payload = {
        "email": email,
        "purpose": "signup",
        "exp": datetime.utcnow() + timedelta(minutes=SIGNUP_TOKEN_EXPIRE_MINUTES)
    }

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token():
    return secrets.token_urlsafe(64)


def hash_refresh_token(
    refresh_token: str
):
    return hashlib.sha256(
        refresh_token.encode()
    ).hexdigest()


def decode_access_token(
    token: str
):
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[ALGORITHM]
    )