from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta

from app.schemas.auth import (RegisterRequest, LoginRequest, LogoutRequest)
from app.schemas.invitation import SendInvitationRequest
from app.core.database import get_db
from app.services.password import (hash_password, verify_password)
from app.models.institution import Institution
from app.models.admin import Admin
from app.models.refresh_token import (RefreshToken, UserType)
from app.dependencies.auth import get_current_user
from app.services.jwt import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    decode_access_token
)

router = APIRouter(
    prefix="/institution"
)

# we have to break this 'register' api into 3 different apis for email verification:
# 1. request otp
# 2. verify otp
# 3. register

# 1.
# @router.post("/request-email-verification")
# def sendOTP():
    # get user email
    # check if it exists already
    # generate 6 digit otp
    # hash otp
    # store otp for 10min in redis cache
    # send that otp code to the email
    # return success message

# 2.
# @router.post("/verify-email")
# def verifyEmail():
    # get otp and email from user
    # check if that otp exists in your redis cache with same email and not expired
    # email verified
    # generate temporary signup token (access token jwt with a property type as signup_token) with 1 hour expiration (it would not be able to access any protected api)
    # send token to client

# 3.
# @router.post("/register")
# def register():
    # get token, name and password
    # validate token
    # make a new entry in institutions table
    # success

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db)
):
    hashed_password = hash_password(payload.password)
    institution = Institution(
        name=payload.name,
        email=payload.email.lower().strip(),
        password=hashed_password
    )
    try:
        db.add(institution)
        db.commit()
        db.refresh(institution)

        return {
            "success": True,
            "message": "Institution registered successfully.",
            "data": {
                "id": institution.id,
                "name": institution.name,
                "email": institution.email
            }
        }
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists."
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong."
        )


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