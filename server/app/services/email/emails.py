from app.services.email.email_sender import send_email
from app.services.email.templates import (email_verification_template, admin_invitation_template)


async def send_verification_email(
    email: str,
    otp: str
):
    html = email_verification_template(otp)

    # await send_email(
    #     to=email,
    #     subject="Verify your email",
    #     html=html
    # )

    # remove comment for mocking

    # print(f"the otp that is sended is:{otp}")

async def send_admin_invitation_email(email:str, password:str, institution_name:str):
    html = admin_invitation_template(institution_name, email, password)

    # await send_email(
    #     to=email,
    #     subject="Invitation as admin",
    #     html=html
    # )   

    # remove comments for mocking

    # print(f"the otp that is sended to admin is")
