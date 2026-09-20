import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.audit_log import AuditLog
from app.models.authenticator_device import AuthenticatorDevice
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
