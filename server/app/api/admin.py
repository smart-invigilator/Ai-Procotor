from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session


from app.models.admin import Admin
from app.schemas.auth import LoginRequest
from app.core.database import get_db
from app.services.password import verify_password
from app.models.refresh_token import (RefreshToken, UserType)
from datetime import datetime, timedelta
from app.services.jwt import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    decode_access_token
)



router = APIRouter(
    prefix="/admin"
)

