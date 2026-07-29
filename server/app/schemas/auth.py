from pydantic import BaseModel, EmailStr, Field
from app.models.refresh_token import UserType


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)
    user_type: UserType


class LogoutRequest(BaseModel):
    refresh_token: str