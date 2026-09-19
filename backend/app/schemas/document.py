from typing import Any
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentAiResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    provider: str
    model: str
    confidence: float
    document_type: str
    fields: dict[str, Any]
    missing_fields: list[str]
    warnings: list[str]
    validation_status: str
    required_fields: list[str]
    present_fields: list[str]
    consistency_checks: list[dict[str, Any]]
    raw_text: str | None = None
    created_at: datetime
    updated_at: datetime


class DocumentMetadata(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    case_id: uuid.UUID
    original_filename: str
    storage_path: str
    storage_provider: str
    cloudinary_public_id: str | None
    cloudinary_resource_type: str | None
    cloudinary_version: int | None
    description: str | None
    document_type: str | None
    department: str | None
    sensitivity: str | None
    mime_type: str | None
    file_size: int | None
    sha256_hash: str | None
    status: str
    ai_confidence: float | None = None
    validation_status: str | None = None
    uploaded_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class DocumentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    case_id: uuid.UUID
    original_filename: str
    document_type: str | None
    department: str | None
    sensitivity: str | None
    mime_type: str | None
    file_size: int | None
    sha256_hash: str | None
    status: str
    ai_confidence: float | None = None
    validation_status: str | None = None
    uploaded_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
