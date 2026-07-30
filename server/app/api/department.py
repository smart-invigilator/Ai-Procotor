from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.admin import Admin
from app.models.department import Department
from app.models.institution import Institution
from app.models.refresh_token import UserType
from app.schemas.department import CreateDepartmentRequest

router = APIRouter(
    prefix="/institution/{institution_id}/department"
)


# POST - Create department
@router.post("/")
def create_departments(
    institution_id: int,
    payload: CreateDepartmentRequest,
    token_data: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(token_data["sub"])
    user_type = token_data["type"]
    
    # lets see if you are actually admin
    admin = db.get(Admin, user_id)
    if user_type != UserType.admin or admin.institution_id != institution_id:
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


    # make dept in db
    departments = [
        Department(
            code=department.code,
            name=department.name,
            no_of_semesters=department.no_of_semesters,
            institution_id=institution_id
        )
        for department in payload.departments
    ]

    try:
        db.add_all(departments)
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="One or more departments with same department code exist already."
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong."
        )
    
    return {
        "success": True,
        "message": "Department/s created successfully."
    }


# GET - get all departments of an institute
# @router.get("/")


# GET - get details of a specific department
# @router.get("/{department_id}")


# PUT - update details of a specific department
# @router.put("/{department_id}")


# DELETE - delete a specific department and all data associated with it
# @router.delete("/{department_id}")
