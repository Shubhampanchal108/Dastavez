import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DocumentAiResult(Base):
    __tablename__ = "document_ai_results"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="groq")
    model: Mapped[str] = mapped_column(String(100), nullable=False, default="qwen/qwen3.8-27b")
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    document_type: Mapped[str] = mapped_column(String(100), nullable=False, default="Other")
    fields: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    missing_fields: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    warnings: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    validation_status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")
    required_fields: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    present_fields: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    consistency_checks: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    document: Mapped["Document"] = relationship(back_populates="ai_result")
