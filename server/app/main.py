from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.core.database import Base, engine
import app.models


app = FastAPI(
    title="AI Proctor Server"
)


# create tables in database if they dont exist
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "success": True,
        "message": "Server is running"
    }