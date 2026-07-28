import secrets
import string
import hashlib


def generate_otp(length: int = 6) -> str:
    # string.digits provides "0123456789"
    return "".join(secrets.SystemRandom().choices(string.digits, k=length))


def hash_otp(otp: str):
    return hashlib.sha256(
        otp.encode()
    ).hexdigest()
