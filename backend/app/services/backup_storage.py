import json
import os
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class BackupStorageError(Exception):
    pass


@dataclass(frozen=True)
class StoredBackup:
    filename: str
    storage_path: str
    local_path: Path | None = None


def backup_storage_provider() -> str:
    provider = os.getenv("BACKUP_STORAGE", "local").strip().lower()
    if provider not in {"local", "supabase"}:
        raise BackupStorageError("BACKUP_STORAGE must be either local or supabase.")
    return provider


def _unique_backup_filename(created_at: datetime) -> str:
    timestamp = created_at.strftime("%Y%m%d_%H%M%S")
    return f"dms_backup_{timestamp}_{uuid.uuid4().hex}.zip"


def _supabase_object_path(created_at: datetime, filename: str) -> str:
    return f"backups/{created_at:%Y/%m/%d}/{filename}"


def _upload_to_supabase(source: Path, created_at: datetime, filename: str) -> StoredBackup:
    supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    bucket = os.getenv("SUPABASE_BACKUP_BUCKET", "dms-backups").strip()
    if not supabase_url or not service_role_key or not bucket:
        raise BackupStorageError("Supabase backup storage is not configured.")
    if not source.is_file() or source.stat().st_size == 0:
        raise BackupStorageError("Backup archive is missing or empty.")

    object_path = _supabase_object_path(created_at, filename)
    endpoint = f"{supabase_url}/storage/v1/object/{bucket}/{object_path}"
    request = Request(
        endpoint,
        data=source.read_bytes(),
        headers={
            "Authorization": f"Bearer {service_role_key}",
            "apikey": service_role_key,
            "Content-Type": "application/zip",
            "x-upsert": "false",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=30) as response:
            if response.status not in {200, 201}:
                raise BackupStorageError("Supabase Storage rejected the backup upload.")
            response_data = json.loads(response.read().decode("utf-8") or "{}")
    except HTTPError as error:
        raise BackupStorageError("Supabase Storage rejected the backup upload.") from error
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
        raise BackupStorageError("Supabase Storage upload is unavailable.") from error

    if not isinstance(response_data, dict):
        raise BackupStorageError("Supabase Storage returned an invalid upload response.")
    returned_path = response_data.get("path")
    if returned_path is not None and (not isinstance(returned_path, str) or not returned_path.strip()):
        raise BackupStorageError("Supabase Storage did not return a backup object path.")
    return StoredBackup(filename=filename, storage_path=f"supabase://{bucket}/{object_path}")


def store_backup(source: Path, created_at: datetime, backup_root: Path) -> StoredBackup:
    provider = backup_storage_provider()
    filename = _unique_backup_filename(created_at)
    if provider == "supabase":
        stored = _upload_to_supabase(source, created_at, filename)
        return stored

    backup_root.mkdir(parents=True, exist_ok=True)
    destination = backup_root / filename
    source.replace(destination)
    if not destination.is_file() or destination.stat().st_size == 0:
        destination.unlink(missing_ok=True)
        raise BackupStorageError("Local backup archive was not created successfully.")
    return StoredBackup(filename=filename, storage_path=str(destination), local_path=destination)
