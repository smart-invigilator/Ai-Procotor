from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.admin import Admin
from app.models.institution import Institution
from app.models.refresh_token import UserType
from app.schemas.invitation import SendInvitationRequest
from app.services.password import (hash_password, generate_password)


router = APIRouter(
    prefix="/institution/{institution_id}/admin"
)

# POST - create admins
@router.post("/")
def invite_admins(
    institution_id: int,
    background_tasks: BackgroundTasks,
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
    
    admins = []
    admin_credentials = []

    for admin in payload.admins:
        plain_password = generate_password()

        admins.append(
            Admin(
                email=admin.email,
                password=hash_password(plain_password),
                institution_id=institution_id,
            )
        )

        admin_credentials.append(
            {
                "email": admin.email,
                "password": plain_password,
            }
        )

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

    # for credential in admin_credentials:
    # background_tasks.add_task(
    #     send_admin_invitation_email,
    #     credential["email"],
    #     credential["password"],
    #     institution.name,
    # )
    
    return {
        "success": True,
        "message": "Invitation successful."
    }


# GET - get all admins of a institute
# @router.get("/")


# GET - get details of a specific admin
# @router.get("/{admin_id}")


# PUT - update details of a specific admin
# @router.get("/{admin_id}")


# DELETE - remove a specific admin
# @router.delete("/{admin_id}")

