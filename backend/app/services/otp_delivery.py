import os
import json
import uuid
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from threading import Lock

from app.models.user import User


_development_otps: dict[uuid.UUID, str] = {}
_development_otp_lock = Lock()


def otp_provider() -> str:
    provider = os.getenv("OTP_PROVIDER", "development").strip().lower()
    if provider not in {"development", "mobile", "resend"}:
        raise RuntimeError("OTP_PROVIDER must be either development, mobile, or resend.")
    return provider


def otp_setting(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError as error:
        raise RuntimeError(f"{name} must be a positive integer.") from error
    if value <= 0:
        raise RuntimeError(f"{name} must be a positive integer.")
    return value


def development_otp_enabled() -> bool:
    return otp_provider() in {"development", "mobile"}


class DevelopmentOTPDelivery:
    """Replaceable development-only delivery adapter; it never sends real messages."""

    @staticmethod
    def deliver(user: User, challenge_id: uuid.UUID, otp: str) -> bool:
        with _development_otp_lock:
            _development_otps[challenge_id] = otp
        return True

    @staticmethod
    def get(challenge_id: uuid.UUID) -> str | None:
        with _development_otp_lock:
            return _development_otps.get(challenge_id)


class OTPDeliveryError(Exception):
    pass


class ResendOTPDelivery:
    """Send OTP messages through Resend without retaining or returning the OTP."""

    @staticmethod
    def deliver(user: User, challenge_id: uuid.UUID, otp: str) -> bool:
        api_key = os.getenv("RESEND_API_KEY", "").strip()
        from_email = os.getenv("OTP_FROM_EMAIL", "").strip()
        from_name = os.getenv("OTP_FROM_NAME", "Secure DMS").strip()
        if not api_key or not from_email:
            raise OTPDeliveryError("Resend OTP provider is not configured.")

        sender = f"{from_name} <{from_email}>" if from_name else from_email
        payload = {
            "from": sender,
            "to": [user.email],
            "subject": "Your Secure DMS Verification Code",
            "text": (
                f"Your verification code is: {otp}\n\n"
                f"This code expires in {otp_setting('OTP_EXPIRE_MINUTES', 5)} minutes.\n\n"
                "If you did not request this code, ignore this email."
            ),
        }
        request = Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "DMS-Backend/1.0",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=10) as response:
                if response.status not in {200, 201, 202}:
                    raise OTPDeliveryError("Resend rejected the OTP email request.")
        except HTTPError as error:
            raise OTPDeliveryError("Resend rejected the OTP email request.") from error
        except (URLError, TimeoutError, OSError) as error:
            raise OTPDeliveryError("Resend OTP delivery is unavailable.") from error
        return True

    @staticmethod
    def get(challenge_id: uuid.UUID) -> str | None:
        return None


class ConfiguredOTPDelivery:
    """Select the configured provider at delivery time so tests and deployments can override it safely."""

    @staticmethod
    def deliver(user: User, challenge_id: uuid.UUID, otp: str) -> bool:
        if development_otp_enabled():
            return DevelopmentOTPDelivery.deliver(user, challenge_id, otp)
        if otp_provider() == "resend":
            return ResendOTPDelivery.deliver(user, challenge_id, otp)
        raise OTPDeliveryError("OTP provider is not configured.")

    @staticmethod
    def get(challenge_id: uuid.UUID) -> str | None:
        if development_otp_enabled():
            return DevelopmentOTPDelivery.get(challenge_id)
        return None


otp_delivery = ConfiguredOTPDelivery()