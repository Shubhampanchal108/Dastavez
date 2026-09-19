import uuid
from typing import Any
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.document import Document
from app.models.document_ai_result import DocumentAiResult
from app.schemas.classification import ClassificationFields, ClassificationResult

_results: dict[str, ClassificationResult] = {}


def save_classification(
    document_id: str,
    result: ClassificationResult,
    db: Session | None = None,
    validation_status: str = "COMPLETE",
    required_fields: list[str] | None = None,
    present_fields: list[str] | None = None,
    consistency_checks: list[dict[str, Any]] | None = None,
    raw_text: str | None = None,
    provider: str = "groq",
    model: str = "qwen/qwen3.8-27b",
) -> None:
    _results[document_id] = result

    # Check if document_id is a valid UUID to persist into PostgreSQL
    try:
        doc_uuid = uuid.UUID(document_id)
    except (ValueError, TypeError):
        return

    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        # Check if record exists
        ai_record = db.query(DocumentAiResult).filter(DocumentAiResult.document_id == doc_uuid).first()
        fields_dump = result.fields.model_dump()

        if ai_record:
            ai_record.provider = provider
            ai_record.model = model
            ai_record.confidence = result.confidence
            ai_record.document_type = result.document_type
            ai_record.fields = fields_dump
            ai_record.missing_fields = result.missing_fields
            ai_record.warnings = result.warnings
            ai_record.validation_status = validation_status
            if required_fields is not None:
                ai_record.required_fields = required_fields
            if present_fields is not None:
                ai_record.present_fields = present_fields
            if consistency_checks is not None:
                ai_record.consistency_checks = consistency_checks
            if raw_text is not None:
                ai_record.raw_text = raw_text
        else:
            ai_record = DocumentAiResult(
                document_id=doc_uuid,
                provider=provider,
                model=model,
                confidence=result.confidence,
                document_type=result.document_type,
                fields=fields_dump,
                missing_fields=result.missing_fields,
                warnings=result.warnings,
                validation_status=validation_status,
                required_fields=required_fields or [],
                present_fields=present_fields or [],
                consistency_checks=consistency_checks or [],
                raw_text=raw_text,
            )
            db.add(ai_record)

        # Update parent document confidence and validation status
        doc = db.get(Document, doc_uuid)
        if doc:
            doc.ai_confidence = result.confidence
            doc.validation_status = validation_status
            if result.document_type and result.document_type != "Other":
                doc.document_type = result.document_type

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error persisting classification to PostgreSQL: {e}")
    finally:
        if should_close:
            db.close()


def get_classification(document_id: str, db: Session | None = None) -> ClassificationResult | None:
    # First check in-memory cache
    if document_id in _results:
        return _results[document_id]

    try:
        doc_uuid = uuid.UUID(document_id)
    except (ValueError, TypeError):
        return None

    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        record = db.query(DocumentAiResult).filter(DocumentAiResult.document_id == doc_uuid).first()
        if record:
            result = ClassificationResult(
                document_type=record.document_type,  # type: ignore
                confidence=record.confidence,
                fields=ClassificationFields(**record.fields),
                missing_fields=record.missing_fields or [],
                warnings=record.warnings or [],
            )
            _results[document_id] = result
            return result
        return None
    finally:
        if should_close:
            db.close()


def get_ai_validation_record(document_id: str, db: Session | None = None) -> DocumentAiResult | None:
    try:
        doc_uuid = uuid.UUID(document_id)
    except (ValueError, TypeError):
        return None

    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        return db.query(DocumentAiResult).filter(DocumentAiResult.document_id == doc_uuid).first()
    finally:
        if should_close:
            db.close()
