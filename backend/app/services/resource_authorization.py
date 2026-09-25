from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, exists, or_
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.document import Document
from app.models.document_transfer import DocumentTransfer
from app.models.user import User


def document_visibility_clause(user: User):
    if user.role.upper() == "ADMIN":
        return True
    active_share = exists().where(
        and_(
            DocumentTransfer.document_id == Document.id,
            DocumentTransfer.to_user_id == user.id,
            DocumentTransfer.status != "REVOKED",
            or_(
                DocumentTransfer.expires_at.is_(None),
                DocumentTransfer.expires_at > datetime.now(timezone.utc),
            ),
        )
    )
    return or_(
        Document.uploaded_by == user.id,
        Case.created_by == user.id,
        active_share,
    )


def can_access_document(db: Session, document: Document, user: User) -> bool:
    if user.role.upper() == "ADMIN":
        return True
    if document.uploaded_by == user.id:
        return True
    if document.case is not None and document.case.created_by == user.id:
        return True
    now = datetime.now(timezone.utc)
    return db.query(DocumentTransfer.id).filter(
        DocumentTransfer.document_id == document.id,
        DocumentTransfer.to_user_id == user.id,
        DocumentTransfer.status != "REVOKED",
        or_(DocumentTransfer.expires_at.is_(None), DocumentTransfer.expires_at > now),
    ).first() is not None


def require_document_access(db: Session, document: Document, user: User) -> None:
    if not can_access_document(db, document, user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
