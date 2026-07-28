from fastapi import APIRouter

router = APIRouter(
    prefix="/student",
)


@router.post("/login")
def login():
    return {
        "success": True,
        "message": "Login successful"
    }


@router.post("/logout")
def logout():
    return {
        "success": True,
        "message": "Logout successful"
    }


@router.post("/reset-password")
def reset_password():
    return {
        "success": True,
        "message": "Password reset successful"
    }