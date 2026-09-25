import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import Select

from app.dependencies.auth import get_current_user, require_roles
from app.models.document_transfer import DocumentTransfer
from app.models.user import User
from app.routers.shares import get_received_shares
from app.routers.users import get_user_directory
from app.schemas.users import UserDirectoryItem
from app.services.sharing_service import access_share


class ScalarResult:
    def __init__(self, values):
        self.values = values

    def all(self):
        return self.values


class CaptureDb:
    def __init__(self, values):
        self.values = values
        self.statement = None

    def scalars(self, statement):
        self.statement = statement
        return ScalarResult(self.values)

    def execute(self, statement):
        self.statement = statement
        return MappingResult(self.values)

    def add(self, _event):
        pass

    def commit(self):
        pass


class MappingResult:
    def __init__(self, values):
        self.values = values

    def mappings(self):
        return self

    def all(self):
        return self.values


def make_user(role="INVESTIGATOR", active=True):
    return User(id=uuid.uuid4(), name="Active User", email="active@example.com", password_hash="never-returned", role=role, is_active=active)


def make_share(recipient_id, status="ACTIVE", expires_at=None):
    return DocumentTransfer(
        id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        from_user_id=uuid.uuid4(),
        to_user_id=recipient_id,
        purpose="Evidence review",
        permission="VIEW",
        status=status,
        expires_at=expires_at or datetime.now(timezone.utc) + timedelta(hours=1),
        created_at=datetime.now(timezone.utc),
    )


def test_unauthenticated_directory_request_is_rejected():
    with pytest.raises(HTTPException) as error:
        get_current_user(None, object())
    assert error.value.status_code == 401


def test_directory_requires_existing_sharing_role():
    dependency = require_roles("ADMIN", "INVESTIGATOR")
    with pytest.raises(HTTPException) as error:
        dependency(make_user(role="VIEWER"), CaptureDb([]))
    assert error.value.status_code == 403


def test_directory_returns_safe_fields_and_active_filter():
    user = make_user()
    db = CaptureDb([{"id": user.id, "name": user.name, "email": user.email, "role": user.role}])
    result = get_user_directory(None, db, user)
    item = UserDirectoryItem.model_validate(result[0])
    assert item.model_dump() == {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
    assert "password_hash" not in item.model_dump()
    sql = str(db.statement.compile(compile_kwargs={"literal_binds": True}))
    assert "is_active IS true" in sql


def test_directory_search_is_limited_to_directory_fields():
    user = make_user()
    db = CaptureDb([{"id": user.id, "name": user.name, "email": user.email, "role": user.role}])
    get_user_directory("active@example.com", db, user)
    sql = str(db.statement.compile(compile_kwargs={"literal_binds": True}))
    assert "active@example.com" in sql
    assert "password_hash" not in sql


def test_received_shares_are_scoped_to_current_user():
    user = make_user()
    db = CaptureDb([make_share(user.id)])
    result = get_received_shares(db, user)
    assert result[0].recipient_user_id == user.id
    sql = str(db.statement.compile(compile_kwargs={"literal_binds": True}))
    assert "document_transfers.to_user_id" in sql
    assert str(user.id).replace("-", "") in sql


def test_received_share_idor_access_is_rejected():
    owner = make_user()
    other_user = make_user()
    with pytest.raises(HTTPException) as error:
        access_share(CaptureDb([]), make_share(owner.id), other_user.id)
    assert error.value.status_code == 403


def test_revoked_and_expired_shares_are_rejected():
    user = make_user()
    with pytest.raises(HTTPException) as revoked_error:
        access_share(CaptureDb([]), make_share(user.id, status="REVOKED"), user.id)
    assert revoked_error.value.status_code == 403

    expired = make_share(user.id, expires_at=datetime.now(timezone.utc) - timedelta(minutes=1))
    with pytest.raises(HTTPException) as expired_error:
        access_share(CaptureDb([]), expired, user.id)
    assert expired_error.value.status_code == 410
    assert expired.status == "EXPIRED"
