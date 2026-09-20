import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AuthenticatorDevice(Base):
    __tablename__ = "authenticator_devices"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    device_name: Mapped[str | None] = mapped_column(String(150))
    device_identifier: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    public_key: Mapped[str | None] = mapped_column(String(4096), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="authenticator_devices")
    authenticator_challenges: Mapped[list["AuthenticatorChallenge"]] = relationship(
        back_populates="authenticator_device"
    )
