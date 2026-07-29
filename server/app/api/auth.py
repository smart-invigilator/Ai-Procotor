from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta


from app.schemas.auth import (LoginRequest, LogoutRequest)
from app.core.database import get_db
from app.models.refresh_token import RefreshToken
from app.dependencies.auth import get_current_user
from app.models.refresh_token import UserType
from app.models.institution import Institution
from app.models.admin import Admin
from app.services.password import (hash_password, verify_password)
from app.services.jwt import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
)

router = APIRouter(
)

@router.post("/login", status_code=status.HTTP_200_OK)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db)
):
    email = payload.email.lower().strip()

    user = None

    if payload.user_type == UserType.institution:
        user = (
            db.query(Institution)
            .filter(Institution.email == email)
            .first()
        )

    elif payload.user_type == UserType.admin:
        user = (
            db.query(Admin)
            .filter(Admin.email == email)
            .first()
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user type"
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(
        payload.password,
        user.password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        user_id=user.id,
        user_type=payload.user_type.value
    )

    refresh_token = create_refresh_token()

    refresh_record = RefreshToken(
        user_id=user.id,
        user_type=payload.user_type.value,
        token_hash=hash_refresh_token(refresh_token),
        expires_at=datetime.utcnow() + timedelta(days=30)
    )

    try:
        db.add(refresh_record)
        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong."
        )

    response_data = {
        "id": user.id,
        "email": user.email,
        "access_token": access_token,
        "refresh_token": refresh_token
    }

    # Only institutions have a name in response
    if payload.user_type == UserType.institution:
        response_data["name"] = user.name

    return {
        "success": True,
        "message": "Login successful",
        "data": response_data
    }



@router.post("/logout")
def logout(
    payload: LogoutRequest,
    token_data: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    user_id = int(token_data["sub"])
    user_type = token_data["type"]


    refresh_token_hash = hash_refresh_token(
        payload.refresh_token
    )


    refresh_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == refresh_token_hash,
            RefreshToken.user_id == user_id,
            RefreshToken.user_type == user_type
        )
        .first()
    )


    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Refresh token not found"
        )


    refresh_token.revoked = True

    db.commit()


    return {
        "success": True,
        "message": "Logged out successfully"
    }


@router.post("/refresh")
def refresh(
    payload: LogoutRequest,
    db: Session = Depends(get_db)
):
    refresh_token_hash = hash_refresh_token(
        payload.refresh_token
    )

    refresh_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == refresh_token_hash,
        )
        .first()
    )


    if not refresh_token or refresh_token.revoked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid refresh token."
        )
    
    if refresh_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid refresh token."
        )

    
    access_token = create_access_token(
        user_id=refresh_token.user_id,
        user_type=refresh_token.user_type
    )

    return {
        "success": True,
        "message": "Access token refreshed.",
        "data":{
            "access_token":access_token
        }
    }