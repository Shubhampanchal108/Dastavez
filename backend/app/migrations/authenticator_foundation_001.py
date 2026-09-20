from sqlalchemy import text

from app.database import engine


MIGRATION_NAME = "authenticator_foundation_001"


def upgrade_authenticator_foundation() -> None:
    """Create authenticator device and challenge tables for future device approval flow."""
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS authenticator_devices (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL,
                    device_name VARCHAR(150),
                    device_identifier VARCHAR(255) NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    last_used_at TIMESTAMP WITH TIME ZONE,
                    revoked_at TIMESTAMP WITH TIME ZONE,
                    CONSTRAINT fk_authenticator_devices_user FOREIGN KEY (user_id) REFERENCES users(id)
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS authenticator_challenges (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL,
                    authenticator_device_id UUID,
                    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    approved_at TIMESTAMP WITH TIME ZONE,
                    consumed_at TIMESTAMP WITH TIME ZONE,
                    revoked_at TIMESTAMP WITH TIME ZONE,
                    attempt_count INTEGER NOT NULL DEFAULT 0,
                    max_attempts INTEGER NOT NULL DEFAULT 5,
                    CONSTRAINT fk_authenticator_challenges_user FOREIGN KEY (user_id) REFERENCES users(id),
                    CONSTRAINT fk_authenticator_challenges_device FOREIGN KEY (authenticator_device_id) REFERENCES authenticator_devices(id)
                )
                """
            )
        )
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_authenticator_device_identifier ON authenticator_devices (device_identifier)"
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_authenticator_devices_user_id ON authenticator_devices (user_id)"
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_authenticator_challenges_user_id ON authenticator_challenges (user_id)"
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_authenticator_challenges_device_id ON authenticator_challenges (authenticator_device_id)"
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_authenticator_challenges_status ON authenticator_challenges (status)"
            )
        )


def downgrade_authenticator_foundation() -> None:
    """Rollback authenticator foundation tables."""
    with engine.begin() as connection:
        connection.execute(text("DROP TABLE IF EXISTS authenticator_challenges"))
        connection.execute(text("DROP TABLE IF EXISTS authenticator_devices"))
