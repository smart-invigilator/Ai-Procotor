from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    Enum,
    func,
    Index
)

from app.core.database import Base
import enum


class UserType(str, enum.Enum):
    institution = "institution"
    teacher = "teacher"
    student = "student"
    admin = "admin"


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    user_type = Column(
        Enum(UserType),
        nullable=False,
        index=True
    )

    token_hash = Column(
        String(255),
        nullable=False,
        unique=True,
    )

    expires_at = Column(
        DateTime,
        nullable=False
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    revoked = Column(
        Boolean,
        default=False,
        nullable=False
    )