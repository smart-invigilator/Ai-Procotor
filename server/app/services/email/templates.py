def email_verification_template(
    otp: str
) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Ai Procotor</h1>
        <h2>Email Verification</h2>

        <p>Your verification code is:</p>

        <h1>{otp}</h1>

        <p>This code expires in 5 minutes.</p>

    </body>
    </html>
    """


def admin_invitation_template(
    institution_name: str,
    email: str,
    password: str
) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Ai Procotor</h1>
        <h2>You have been invited</h2>

        <p>
            {institution_name} invited you as an admin.
        </p>

        <p>
            Account email: {email}
            Account password: {password}
        </p>

    </body>
    </html>
    """
