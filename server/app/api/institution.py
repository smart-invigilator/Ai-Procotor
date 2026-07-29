from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta

from app.schemas.auth import (RegisterRequest, RequestEmailVerificationRequest, VerifyEmailRequest)
from app.schemas.invitation import SendInvitationRequest
from app.core.database import get_db
from app.services.password import (hash_password, verify_password)
from app.models.institution import Institution
from app.models.admin import Admin
from app.models.refresh_token import (RefreshToken, UserType)
from app.dependencies.auth import get_current_user
from app.services.otp import (generate_otp, hash_otp)
from app.core.redis import redis_client
from app.services.jwt import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    decode_access_token,
    create_signup_token
)

router = APIRouter(
    prefix="/institution"
)

# we have to break 'register' api into 3 different apis for email verification:
# 1. request otp
# 2. verify otp
# 3. register

# 1.
@router.post("/request-email-verification")
def sendOTP(
    payload: RequestEmailVerificationRequest,
    db: Session = Depends(get_db)
):
    email = payload.email.lower().strip()

    institution = (
        db.query(Institution)
        .filter(Institution.email == email)
        .first()
    )

    if institution:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered."
        )
    
    existing = redis_client.get(f"email_verification:{email}")

    if existing:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="A verification code was already sent. Please wait before requesting another."
        )

    
    otp = generate_otp()
    otp_hash = hash_otp(otp)

    try:
        redis_client.setex(
            f"email_verification:{email}",
            300,
            otp_hash
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to send verification code."
        )

    # TODO: Send email
    print(f"OTP for {email}: {otp}")

    return {
        "success": True,
        "message": "Verification code sent successfully."
    }

# 2.
@router.post("/verify-email")
def verifyEmail(
    payload: VerifyEmailRequest
):
    email = payload.email.lower().strip()

    stored_otp_hash = redis_client.get(
        f"email_verification:{email}"
    )

    if stored_otp_hash is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP."
        )
    
    provided_hash = hash_otp(payload.otp)

    print(payload.otp, stored_otp_hash, provided_hash)

    if stored_otp_hash != provided_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP."
        )

    redis_client.delete(f"email_verification:{email}")

    signup_token = create_signup_token(email)

    return {
        "success": True,
        "message": "Email verified successfully.",
        "data": {
            "signup_token": signup_token
        }
    }

# 3.
@router.post("/register")
def register_institution(
    payload: RegisterRequest,
    db: Session = Depends(get_db)
):
    try:
        token_data = decode_access_token(payload.signup_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signup token expired."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signup token."
        )

    if token_data.get("purpose") != "signup":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signup token."
        )

    email = token_data["email"]

    existing = (
        db.query(Institution)
        .filter(Institution.email == email)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered."
        )

    institution = Institution(
        name=payload.name.strip(),
        email=email,
        password=hash_password(payload.password)
    )

    try:
        db.add(institution)
        db.commit()
        db.refresh(institution)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong."
        )

    return {
        "success": True,
        "message": "Registration successful.",
        "data": {
            "id": institution.id,
            "name": institution.name,
            "email": institution.email
        }
    }


# yet to implement email sending
@router.post("/{institution_id}/admin/invitation")
def invite_admins(
    institution_id: int,
    payload: SendInvitationRequest,
    token_data: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(token_data["sub"])
    user_type = token_data["type"]

    if user_type != UserType.institution or institution_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden"
        )
    
    institution = db.get(Institution, institution_id)
    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found."
        )
    
    admins = [
        Admin(
            email=admin.email,
            password=hash_password(admin.password),
            institution_id=institution_id,
        )
        for admin in payload.admins
    ]

    try:
        db.add_all(admins)
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="One or more admin exist already."
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong."
        )
    

    return {
        "success": True,
        "message": "Invitation successful."
    }