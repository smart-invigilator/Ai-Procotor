import resend

from app.core.config import settings

resend.api_key = settings.RESEND_API_KEY


async def send_email(
    to: str,
    subject: str,
    html: str
):
    response = await resend.Emails.send_async(
        {
            "from": "onboarding@resend.dev",
            "to": [to],
            "subject": subject,
            "html": html,
        }
    )

    return response
