import base64
import json
import uuid
from datetime import datetime, timedelta, timezone

from Crypto.Hash import SHA256
from Crypto.PublicKey import ECC
from Crypto.Signature import DSS
from sqlalchemy.orm import Session

from app.models.authenticator_challenge import AuthenticatorChallenge
from app.models.authenticator_device import AuthenticatorDevice
from app.models.user import User


class AuthenticatorServiceError(ValueError):
    """Raised when authenticator domain checks fail."""


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def build_authenticator_challenge_payload(
    challenge: AuthenticatorChallenge,
    *,
    device_identifier: str | None = None,
) -> str:
    challenge_expires_at = _normalize_datetime(challenge.expires_at)
    payload = {
        "challenge_id": str(challenge.id),
        "device_id": device_identifier or str(challenge.authenticator_device_id or ""),
        "expires_at": challenge_expires_at.isoformat().replace("+00:00", "Z"),
        "purpose": "AUTHENTICATOR_LOGIN",
        "status": "PENDING",
    }
    return json.dumps(payload, separators=(",", ":"), sort_keys=True)


def verify_authenticator_challenge_signature(
    public_key: str | None,
    payload: str,
    signature: str | None,
) -> bool:
    if not public_key or not payload or not signature:
        return False

    try:
        public_key_bytes = base64.b64decode(public_key, validate=True)
        public_key_obj = ECC.import_key(public_key_bytes)
        signature_bytes = base64.b64decode(signature, validate=True)
        hash_obj = SHA256.new(payload.encode("utf-8"))
        verifier = DSS.new(public_key_obj, 'fips-186-3')
        verifier.verify(hash_obj, signature_bytes)
        return True
    except Exception:
        return False


def register_authenticator_device(
    db: Session,
    user_id: uuid.UUID,
    device_identifier: str,
    device_name: str | None = None,
    *,
    public_key: str | None = None,
) -> AuthenticatorDevice:
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise AuthenticatorServiceError("User is unavailable.")

    if not device_identifier or not device_identifier.strip():
        raise AuthenticatorServiceError("Device identifier is required.")

    device = (
        db.query(AuthenticatorDevice)
        .filter(AuthenticatorDevice.device_identifier == device_identifier.strip())
        .first()
    )
    if device is not None:
        raise AuthenticatorServiceError("Device is already registered.")

    normalized_public_key = public_key.strip() if public_key and public_key.strip() else None

    record = AuthenticatorDevice(
        user_id=user_id,
        device_name=device_name.strip() if device_name and device_name.strip() else None,
        device_identifier=device_identifier.strip(),
        public_key=normalized_public_key,
        is_active=True,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_active_devices(db: Session, user_id: uuid.UUID) -> list[AuthenticatorDevice]:
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise AuthenticatorServiceError("User is unavailable.")

    return (
        db.query(AuthenticatorDevice)
        .filter(
            AuthenticatorDevice.user_id == user_id,
            AuthenticatorDevice.is_active.is_(True),
            AuthenticatorDevice.revoked_at.is_(None),
        )
        .order_by(AuthenticatorDevice.created_at.desc())
        .all()
    )


def revoke_authenticator_device(db: Session, user_id: uuid.UUID, device_id: uuid.UUID) -> AuthenticatorDevice:
    device = db.get(AuthenticatorDevice, device_id)
    if device is None or device.user_id != user_id:
        raise AuthenticatorServiceError("Device is unavailable.")
    if device.revoked_at is not None:
        raise AuthenticatorServiceError("Device is already revoked.")

    device.is_active = False
    device.revoked_at = _now()
    db.commit()
    db.refresh(device)
    return device


def create_authenticator_challenge(
    db: Session,
    user_id: uuid.UUID,
    authenticator_device_id: uuid.UUID | None = None,
    *,
    max_attempts: int = 5,
    expires_minutes: int = 5,
) -> AuthenticatorChallenge:
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise AuthenticatorServiceError("User is unavailable.")

    if authenticator_device_id is not None:
        device = db.get(AuthenticatorDevice, authenticator_device_id)
        if device is None or device.user_id != user_id:
            raise AuthenticatorServiceError("Device is unavailable.")
        if not device.is_active or device.revoked_at is not None:
            raise AuthenticatorServiceError("Device is unavailable.")

    now = _now()
    challenge = AuthenticatorChallenge(
        user_id=user_id,
        authenticator_device_id=authenticator_device_id,
        status="PENDING",
        created_at=now,
        expires_at=now + timedelta(minutes=expires_minutes),
        attempt_count=0,
        max_attempts=max_attempts,
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


def expire_stale_authenticator_challenges(db: Session, user_id: uuid.UUID | None = None) -> int:
    now = _now()
    query = db.query(AuthenticatorChallenge).filter(
        AuthenticatorChallenge.status == "PENDING",
    )
    if user_id is not None:
        query = query.filter(AuthenticatorChallenge.user_id == user_id)

    challenges = query.all()
    expired = []
    for challenge in challenges:
        if _normalize_datetime(challenge.expires_at) <= now:
            challenge.status = "EXPIRED"
            expired.append(challenge)
    db.commit()
    return len(expired)


def approve_authenticator_challenge(
    db: Session,
    user_id: uuid.UUID,
    challenge_id: uuid.UUID,
    *,
    authenticator_device_id: uuid.UUID | None = None,
) -> AuthenticatorChallenge:
    challenge = db.get(AuthenticatorChallenge, challenge_id)
    if challenge is None or challenge.user_id != user_id:
        raise AuthenticatorServiceError("Challenge is unavailable.")
    if challenge.status in {"CONSUMED", "REJECTED", "REVOKED"}:
        raise AuthenticatorServiceError("Challenge cannot be reused.")
    if challenge.status == "EXPIRED":
        raise AuthenticatorServiceError("Challenge has expired.")
    if challenge.revoked_at is not None:
        raise AuthenticatorServiceError("Challenge is unavailable.")
    if _normalize_datetime(challenge.expires_at) <= _now():
        challenge.status = "EXPIRED"
        db.commit()
        raise AuthenticatorServiceError("Challenge has expired.")

    if challenge.authenticator_device_id is not None:
        if authenticator_device_id is None or challenge.authenticator_device_id != authenticator_device_id:
            raise AuthenticatorServiceError("Challenge is unavailable.")

    if challenge.authenticator_device_id is None and authenticator_device_id is not None:
        device = db.get(AuthenticatorDevice, authenticator_device_id)
        if device is None or device.user_id != user_id:
            raise AuthenticatorServiceError("Device is unavailable.")
        if not device.is_active or device.revoked_at is not None:
            raise AuthenticatorServiceError("Device is unavailable.")
        challenge.authenticator_device_id = authenticator_device_id

    if challenge.authenticator_device_id is not None:
        device = db.get(AuthenticatorDevice, challenge.authenticator_device_id)
        if device is None or device.user_id != user_id:
            raise AuthenticatorServiceError("Device is unavailable.")
        if not device.is_active or device.revoked_at is not None:
            raise AuthenticatorServiceError("Device is unavailable.")

    now = _now()
    challenge.status = "APPROVED"
    challenge.approved_at = now
    challenge.attempt_count += 1
    db.commit()
    db.refresh(challenge)
    return challenge


def reject_authenticator_challenge(
    db: Session,
    user_id: uuid.UUID,
    challenge_id: uuid.UUID,
    *,
    reason: str | None = None,
) -> AuthenticatorChallenge:
    challenge = db.get(AuthenticatorChallenge, challenge_id)
    if challenge is None or challenge.user_id != user_id:
        raise AuthenticatorServiceError("Challenge is unavailable.")
    if challenge.status in {"CONSUMED", "REJECTED", "REVOKED"}:
        raise AuthenticatorServiceError("Challenge cannot be reused.")
    if challenge.status == "EXPIRED":
        raise AuthenticatorServiceError("Challenge has expired.")
    if challenge.revoked_at is not None:
        raise AuthenticatorServiceError("Challenge is unavailable.")

    challenge.status = "REJECTED"
    challenge.revoked_at = _now()
    challenge.attempt_count += 1
    db.commit()
    db.refresh(challenge)
    return challenge


def consume_authenticator_challenge(
    db: Session,
    user_id: uuid.UUID,
    challenge_id: uuid.UUID,
) -> AuthenticatorChallenge:
    challenge = db.get(AuthenticatorChallenge, challenge_id)
    if challenge is None or challenge.user_id != user_id:
        raise AuthenticatorServiceError("Challenge is unavailable.")
    if challenge.status not in {"APPROVED"}:
        raise AuthenticatorServiceError("Challenge cannot be consumed.")
    if challenge.revoked_at is not None:
        raise AuthenticatorServiceError("Challenge is unavailable.")
    if _normalize_datetime(challenge.expires_at) <= _now():
        challenge.status = "EXPIRED"
        db.commit()
        raise AuthenticatorServiceError("Challenge has expired.")

    challenge.status = "CONSUMED"
    challenge.consumed_at = _now()
    db.commit()
    db.refresh(challenge)
    return challenge
