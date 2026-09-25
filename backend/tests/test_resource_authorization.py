import uuid
from datetime import datetime, timedelta, timezone

from app.models.case import Case
from app.models.document import Document
from app.models.document_transfer import DocumentTransfer
from app.models.user import User
from app.services.resource_authorization import can_access_document, document_visibility_clause


class QueryResult:
    def __init__(self, value):
        self.value = value

    def first(self):
        return self.value


class AccessDb:
    def __init__(self, share=None):
        self.share = share

    def query(self, _model):
        return ShareQuery(self.share)


class ShareQuery:
    def __init__(self, share):
        self.share = share

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.share


def user(role="INVESTIGATOR"):
    return User(id=uuid.uuid4(), name="User", email=f"{uuid.uuid4()}@example.com", password_hash="hash", role=role, is_active=True)


def document(owner, creator):
    case = Case(id=uuid.uuid4(), case_number=str(uuid.uuid4()), title="Case", created_by=creator.id)
    return Document(id=uuid.uuid4(), case_id=case.id, case=case, uploaded_by=owner.id, original_filename="doc.pdf", storage_path="cloudinary://doc", status="active")


def test_owner_and_case_creator_can_access_document():
    owner = user()
    creator = user()
    other = user()
    doc = document(owner, creator)
    assert can_access_document(AccessDb(), doc, owner)
    assert can_access_document(AccessDb(), doc, creator)
    assert not can_access_document(AccessDb(), doc, other)


def test_admin_has_global_document_access():
    admin = user("ADMIN")
    other = user()
    doc = document(other, other)
    assert can_access_document(AccessDb(), doc, admin)


def test_active_share_grants_document_access():
    owner = user()
    recipient = user()
    doc = document(owner, owner)
    share = DocumentTransfer(
        id=uuid.uuid4(), document_id=doc.id, from_user_id=owner.id, to_user_id=recipient.id,
        status="ACTIVE", permission="VIEW", expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    assert can_access_document(AccessDb(share), doc, recipient)


def test_expired_or_revoked_share_does_not_grant_access():
    owner = user()
    recipient = user()
    doc = document(owner, owner)
    expired = DocumentTransfer(
        id=uuid.uuid4(), document_id=doc.id, from_user_id=owner.id, to_user_id=recipient.id,
        status="ACTIVE", permission="VIEW", expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    assert not can_access_document(AccessDb(None), doc, recipient)
    expired.status = "REVOKED"
    assert not can_access_document(AccessDb(None), doc, recipient)


def test_visibility_clause_restricts_non_admin_documents():
    investigator = user()
    clause = document_visibility_clause(investigator)
    assert clause is not True
    admin_clause = document_visibility_clause(user("ADMIN"))
    assert admin_clause is True
