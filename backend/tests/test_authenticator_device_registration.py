import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.audit_log import AuditLog
from app.models.authenticator_device import AuthenticatorDevice
from app.models.authenticator_challenge import AuthenticatorChallenge
from app.models.user import User
from app.services.auth_service import create_access_token, hash_password


engine = create_engine(
    'sqlite://',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def make_user(email: str, name: str = 'User', is_active: bool = True) -> User:
    db = SessionLocal()
    try:
        user = User(
            name=name,
            email=email,
            password_hash=hash_password('SecretPass123'),
            role='VIEWER',
            is_active=is_active,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


def test_authenticated_device_registration_and_user_isolation():
    user_a = make_user('usera.device@example.com', name='User A')
    user_b = make_user('userb.device@example.com', name='User B')

    token_a = create_access_token(user_a)
    token_b = create_access_token(user_b)

    unauthenticated = client.post(
        '/api/auth/authenticator/register',
        json={'device_id': 'android-device-a-1', 'device_name': 'My Android'},
    )
    assert unauthenticated.status_code == 401

    registered = client.post(
        '/api/auth/authenticator/register',
        json={'device_id': 'android-device-a-1', 'device_name': 'My Android'},
        headers={'Authorization': f'Bearer {token_a}'},
    )
    assert registered.status_code == 200, registered.text
    payload = registered.json()
    assert payload['device_id'] == 'android-device-a-1'
    assert payload['device_name'] == 'My Android'
    assert payload['is_active'] is True

    duplicate = client.post(
        '/api/auth/authenticator/register',
        json={'device_id': 'android-device-a-1', 'device_name': 'My Android'},
        headers={'Authorization': f'Bearer {token_a}'},
    )
    assert duplicate.status_code == 200, duplicate.text
    assert duplicate.json()['device_id'] == 'android-device-a-1'

    devices = client.get('/api/auth/authenticator/devices', headers={'Authorization': f'Bearer {token_a}'})
    assert devices.status_code == 200, devices.text
    assert len(devices.json()) == 1
    assert devices.json()[0]['device_id'] == 'android-device-a-1'

    other_user_devices = client.get('/api/auth/authenticator/devices', headers={'Authorization': f'Bearer {token_b}'})
    assert other_user_devices.status_code == 200, other_user_devices.text
    assert other_user_devices.json() == []

    blocked = client.get(
        '/api/auth/authenticator/devices/android-device-a-1',
        headers={'Authorization': f'Bearer {token_b}'},
    )
    assert blocked.status_code == 404

    revoke = client.post(
        '/api/auth/authenticator/devices/android-device-a-1/revoke',
        headers={'Authorization': f'Bearer {token_a}'},
    )
    assert revoke.status_code == 200, revoke.text
    assert revoke.json()['is_active'] is False

    db = SessionLocal()
    try:
        device = db.query(AuthenticatorDevice).filter(AuthenticatorDevice.device_identifier == 'android-device-a-1').first()
        assert device is not None
        assert device.is_active is False
        assert device.revoked_at is not None
        assert db.query(AuditLog).filter(AuditLog.action == 'AUTHENTICATOR_REVOKED').count() >= 1
    finally:
        db.close()


def test_device_registration_stores_public_key_for_device_bound_authenticator():
    user = make_user('publickey.device@example.com', name='Public Key User')
    token = create_access_token(user)

    public_key = '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEJit8iXn1T6dPzF5Ll2zH3y4Jm2cQdUQwB2qF6kUeM2yVj7nD4L7m7QvWwV3Zx5M2E6fZ8tQ1R0k=\n-----END PUBLIC KEY-----'

    response = client.post(
        '/api/auth/authenticator/register',
        json={
            'device_id': 'android-device-key-1',
            'device_name': 'Android Security Key Device',
            'public_key': public_key,
        },
        headers={'Authorization': f'Bearer {token}'},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload['device_id'] == 'android-device-key-1'
    assert payload['public_key'] == public_key

    db = SessionLocal()
    try:
        device = db.query(AuthenticatorDevice).filter(AuthenticatorDevice.device_identifier == 'android-device-key-1').first()
        assert device is not None
        assert device.public_key == public_key
    finally:
        db.close()


def test_device_registration_rejects_duplicate_ownership_conflicts_and_keeps_existing_otp_flow():
    user_a = make_user('userc.device@example.com', name='User C')
    user_b = make_user('userd.device@example.com', name='User D')
    token_a = create_access_token(user_a)
    token_b = create_access_token(user_b)

    first = client.post(
        '/api/auth/authenticator/register',
        json={'device_id': 'shared-device-1', 'device_name': 'Shared Android'},
        headers={'Authorization': f'Bearer {token_a}'},
    )
    assert first.status_code == 200, first.text

    second = client.post(
        '/api/auth/authenticator/register',
        json={'device_id': 'shared-device-1', 'device_name': 'Shared Android'},
        headers={'Authorization': f'Bearer {token_b}'},
    )
    assert second.status_code == 409, second.text

    otp_user = make_user('otp.user@example.com', name='OTP User')
    otp_login = client.post(
        '/api/auth/login',
        json={'email': 'otp.user@example.com', 'password': 'SecretPass123'},
    )
    assert otp_login.status_code == 200, otp_login.text
    assert otp_login.json()['status'] == 'OTP_REQUIRED'


def test_authenticator_challenge_reads_require_matching_authenticated_user_and_device():
    user_a = make_user('challenge.user.a@example.com', name='Challenge User A')
    user_b = make_user('challenge.user.b@example.com', name='Challenge User B')
    token_a = create_access_token(user_a)
    token_b = create_access_token(user_b)
    db = SessionLocal()
    try:
        device = AuthenticatorDevice(
            user_id=user_a.id,
            device_identifier='challenge-device-a',
            is_active=True,
        )
        challenge = AuthenticatorChallenge(
            user_id=user_a.id,
            authenticator_device=device,
            status='PENDING',
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        db.add_all([device, challenge])
        db.commit()
        db.refresh(challenge)
        challenge_id = str(challenge.id)
    finally:
        db.close()

    assert client.get(f'/api/auth/authenticator-challenge/{challenge_id}').status_code == 401
    assert client.get(
        f'/api/auth/authenticator-challenge/{challenge_id}',
        headers={'Authorization': f'Bearer {token_b}'},
    ).status_code == 403
    allowed = client.get(
        f'/api/auth/authenticator-challenge/{challenge_id}',
        headers={'Authorization': f'Bearer {token_a}'},
    )
    assert allowed.status_code == 200
    assert allowed.json()['challenge_id'] == challenge_id

    assert client.get('/api/auth/authenticator-challenges/device/challenge-device-a').status_code == 401
    assert client.get(
        '/api/auth/authenticator-challenges/device/challenge-device-a',
        headers={'Authorization': f'Bearer {token_b}'},
    ).status_code == 404
    device_pending = client.get(
        '/api/auth/authenticator-challenges/device/challenge-device-a',
        headers={'Authorization': f'Bearer {token_a}'},
    )
    assert device_pending.status_code == 200
    assert device_pending.json()[0]['challenge_id'] == challenge_id


def test_authenticator_challenge_reads_exclude_revoked_devices_and_expire_pending_challenges():
    user = make_user('challenge.expired@example.com', name='Expired Challenge User')
    token = create_access_token(user)
    db = SessionLocal()
    try:
        device = AuthenticatorDevice(
            user_id=user.id,
            device_identifier='expired-device',
            is_active=True,
            revoked_at=datetime.now(timezone.utc),
        )
        expired = AuthenticatorChallenge(
            user_id=user.id,
            authenticator_device=device,
            status='PENDING',
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
        db.add_all([device, expired])
        db.commit()
        db.refresh(expired)
        challenge_id = str(expired.id)
    finally:
        db.close()

    status_response = client.get(
        f'/api/auth/authenticator-challenge/{challenge_id}',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert status_response.status_code == 200
    assert status_response.json()['status'] == 'EXPIRED'
    revoked_response = client.get(
        '/api/auth/authenticator-challenges/device/expired-device',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert revoked_response.status_code == 404
