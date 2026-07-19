from fastapi import FastAPI
from app.api.auth import router as auth_router


app = FastAPI(
    title="AI Proctor Server"
)


app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "success": True,
        "message": "Server is running"
    }
