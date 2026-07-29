from pydantic import BaseModel, EmailStr, Field
from app.models.refresh_token import UserType


class RegisterRequest(BaseModel):
    signup_token: str
    name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=64)

class RequestEmailVerificationRequest(BaseModel):
    email: EmailStr

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)
    user_type: UserType


class LogoutRequest(BaseModel):
    refresh_token: str