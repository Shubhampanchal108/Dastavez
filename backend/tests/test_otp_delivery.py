import io
import json
import uuid
from urllib.error import HTTPError, URLError

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models.otp_challenge import OTPChallenge
from app.models.user import User
from app.services import otp_delivery
from app.services.auth_service import create_login_otp_challenge


class FakeResponse:
    def __init__(self, status: int = 202):
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False


def test_resend_provider_configuration(monkeypatch):
    monkeypatch.setenv("OTP_PROVIDER", "resend")
    monkeypatch.setenv("RESEND_API_KEY", "test-resend-key")
    monkeypatch.setenv("OTP_FROM_EMAIL", "security@example.com")
    assert otp_delivery.otp_provider() == "resend"
    assert otp_delivery.development_otp_enabled() is False


def test_resend_missing_api_key_fails_safely(monkeypatch):
    monkeypatch.setenv("OTP_PROVIDER", "resend")
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.setenv("OTP_FROM_EMAIL", "security@example.com")
    with pytest.raises(otp_delivery.OTPDeliveryError):
        otp_delivery.ResendOTPDelivery.deliver(
            User(email="user@example.com"), uuid.uuid4(), "123456"
        )


def test_resend_successful_delivery_uses_email_without_returning_otp(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "test-resend-key")
    monkeypatch.setenv("OTP_FROM_EMAIL", "security@example.com")
    captured = {}

    def fake_urlopen(request, timeout):
        captured["request"] = request
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(otp_delivery, "urlopen", fake_urlopen)
    result = otp_delivery.ResendOTPDelivery.deliver(
        User(email="user@example.com"), uuid.uuid4(), "123456"
    )

    assert result is True
    payload = json.loads(captured["request"].data.decode("utf-8"))
    assert payload["to"] == ["user@example.com"]
    assert "123456" in payload["text"]
    assert captured["request"].get_header("Authorization") == "Bearer test-resend-key"


def test_resend_failed_delivery_returns_provider_error(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "test-resend-key")
    monkeypatch.setenv("OTP_FROM_EMAIL", "security@example.com")
    monkeypatch.setattr(otp_delivery, "urlopen", lambda request, timeout: (_ for _ in ()).throw(URLError("offline")))
    with pytest.raises(otp_delivery.OTPDeliveryError):
        otp_delivery.ResendOTPDelivery.deliver(
            User(email="user@example.com"), uuid.uuid4(), "123456"
        )


def test_resend_http_failure_does_not_log_api_key(monkeypatch, caplog):
    api_key = "test-resend-key"
    monkeypatch.setenv("RESEND_API_KEY", api_key)
    monkeypatch.setenv("OTP_FROM_EMAIL", "security@example.com")
    error = HTTPError("https://api.resend.com/emails", 500, "failure", {}, io.BytesIO())
    monkeypatch.setattr(otp_delivery, "urlopen", lambda request, timeout: (_ for _ in ()).throw(error))
    with pytest.raises(otp_delivery.OTPDeliveryError):
        otp_delivery.ResendOTPDelivery.deliver(
            User(email="user@example.com"), uuid.uuid4(), "123456"
        )
    assert api_key not in caplog.text
    assert "123456" not in caplog.text


def test_resend_mode_does_not_attach_otp_to_challenge(monkeypatch):
    monkeypatch.setenv("OTP_PROVIDER", "resend")
    monkeypatch.setenv("RESEND_API_KEY", "test-resend-key")
    monkeypatch.setenv("OTP_FROM_EMAIL", "security@example.com")
    monkeypatch.setattr(otp_delivery.ResendOTPDelivery, "deliver", lambda user, challenge_id, otp: True)
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = Session(engine)
    user = User(
        name="Resend User",
        email="resend@example.com",
        password_hash="hash",
        role="VIEWER",
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    challenge = create_login_otp_challenge(session, user)

    assert not hasattr(challenge, "_dev_otp")
    assert challenge.otp_hash
    session.close()
    engine.dispose()


def test_delivery_failure_invalidates_challenge(monkeypatch):
    monkeypatch.setenv("OTP_PROVIDER", "resend")
    monkeypatch.setenv("RESEND_API_KEY", "test-resend-key")
    monkeypatch.setenv("OTP_FROM_EMAIL", "security@example.com")
    monkeypatch.setattr(
        otp_delivery.otp_delivery,
        "deliver",
        lambda user, challenge_id, otp: (_ for _ in ()).throw(otp_delivery.OTPDeliveryError("failed")),
    )
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = Session(engine)
    user = User(
        name="Failed Delivery User",
        email="failed@example.com",
        password_hash="hash",
        role="VIEWER",
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    with pytest.raises(Exception):
        create_login_otp_challenge(session, user)

    challenge = session.query(OTPChallenge).filter(OTPChallenge.user_id == user.id).first()
    assert challenge is not None
    assert challenge.status == "INVALIDATED"
    session.close()
    engine.dispose()
