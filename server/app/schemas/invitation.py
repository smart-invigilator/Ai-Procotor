from pydantic import BaseModel, EmailStr, Field


class AdminInvitation(BaseModel):
    email: EmailStr


class SendInvitationRequest(BaseModel):
    admins: list[AdminInvitation]
