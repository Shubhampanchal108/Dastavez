import base64
import uuid

import pytest
from Crypto.Hash import SHA256
from Crypto.PublicKey import ECC
from Crypto.Signature import DSS
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models.authenticator_challenge import AuthenticatorChallenge
from app.models.authenticator_device import AuthenticatorDevice
from app.models.user import User
from app.routers.auth import login_user
from app.schemas.auth import LoginRequest
from app.services.auth_service import hash_password
from app.services.authenticator_service import (
    build_authenticator_challenge_payload,
    verify_authenticator_challenge_signature,
)


@pytest.fixture
def db_session():
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(bind=engine)
    session = Session(bind=engine)
    try:
        yield session
    finally:
        session.close()


def test_login_requires_authenticator_challenge_for_active_device(db_session):
    user = User(
        name='Alice',
        email='alice@example.com',
        password_hash=hash_password('SecretPass123'),
        role='VIEWER',
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    device = AuthenticatorDevice(
        user_id=user.id,
        device_name='Pixel 8',
        device_identifier='pixel-8-01',
        is_active=True,
    )
    db_session.add(device)
    db_session.commit()
    db_session.refresh(device)

    response = login_user(LoginRequest(email='alice@example.com', password='SecretPass123'), db_session)

    assert response.status == 'AUTHENTICATOR_REQUIRED'
    assert response.challenge_id is not None
    challenge = db_session.get(AuthenticatorChallenge, response.challenge_id)
    assert challenge is not None
    assert challenge.user_id == user.id
    assert challenge.authenticator_device_id == device.id
    assert challenge.status == 'PENDING'


def test_login_keeps_otp_flow_for_users_without_authenticator_device(db_session):
    user = User(
        name='Bob',
        email='bob@example.com',
        password_hash=hash_password('SecretPass123'),
        role='VIEWER',
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    response = login_user(LoginRequest(email='bob@example.com', password='SecretPass123'), db_session)

    assert response.status == 'OTP_REQUIRED'
    assert response.challenge_id is not None


def test_authenticator_challenge_signature_is_verified_against_registered_public_key(db_session):
    user = User(
        name='Charlie',
        email='charlie@example.com',
        password_hash=hash_password('SecretPass123'),
        role='VIEWER',
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    device = AuthenticatorDevice(
        user_id=user.id,
        device_name='Pixel 9',
        device_identifier='pixel-9-01',
        is_active=True,
    )
    db_session.add(device)
    db_session.commit()
    db_session.refresh(device)

    challenge = AuthenticatorChallenge(
        user_id=user.id,
        authenticator_device_id=device.id,
        status='PENDING',
        created_at=device.created_at,
        expires_at=device.created_at,
    )
    db_session.add(challenge)
    db_session.commit()
    db_session.refresh(challenge)

    private_key = ECC.generate(curve='P-256')
    device.public_key = base64.b64encode(private_key.public_key().export_key(format='DER')).decode('ascii')
    db_session.commit()

    payload = build_authenticator_challenge_payload(challenge, device_identifier=device.device_identifier)
    signer = DSS.new(private_key, 'fips-186-3')
    digest = SHA256.new(payload.encode('utf-8'))
    signature_bytes = signer.sign(digest)
    assert verify_authenticator_challenge_signature(
        device.public_key,
        payload,
        base64.b64encode(signature_bytes).decode('ascii'),
    ) is True
