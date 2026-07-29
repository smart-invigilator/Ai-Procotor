from fastapi import FastAPI

from app.api.institution import router as institution_router
from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.core.database import Base, engine
from app.core.redis import redis_client
import app.models


app = FastAPI(
    title="AI Proctor Server"
)


@app.on_event("startup")
def startup():
    # create tables in database if they dont exist
    Base.metadata.create_all(bind=engine)

    # Verify Redis connection
    try:
        redis_client.ping()
        print("Redis connected successfully.")
    except Exception as e:
        print(f"Redis connection failed: {e}")
        raise



app.include_router(institution_router)
app.include_router(admin_router)
app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "success": True,
        "message": "Server is running"
    }