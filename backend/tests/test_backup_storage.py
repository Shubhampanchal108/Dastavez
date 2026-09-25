import io
import json
from datetime import datetime, timezone
from urllib.error import URLError

import pytest

from app.services import backup_storage


class FakeResponse:
    status = 201

    def __init__(self, payload=None):
        self.payload = payload or {"path": "backups/2026/09/24/backup.zip"}

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


def make_source(tmp_path):
    source = tmp_path / "backup.zip"
    source.write_bytes(b"safe backup bytes")
    return source


def test_local_storage_preserves_backup_file(tmp_path, monkeypatch):
    monkeypatch.setenv("BACKUP_STORAGE", "local")
    source = make_source(tmp_path)
    stored = backup_storage.store_backup(source, datetime.now(timezone.utc), tmp_path / "backups")
    assert stored.local_path is not None
    assert stored.local_path.is_file()
    assert stored.local_path.read_bytes() == b"safe backup bytes"
    assert stored.storage_path == str(stored.local_path)


def test_supabase_configuration_requires_backend_credentials(tmp_path, monkeypatch):
    monkeypatch.setenv("BACKUP_STORAGE", "supabase")
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    with pytest.raises(backup_storage.BackupStorageError, match="not configured"):
        backup_storage.store_backup(make_source(tmp_path), datetime.now(timezone.utc), tmp_path / "backups")


def test_supabase_upload_uses_private_server_headers_and_unique_path(tmp_path, monkeypatch):
    monkeypatch.setenv("BACKUP_STORAGE", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://supabase.example")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    monkeypatch.setenv("SUPABASE_BACKUP_BUCKET", "dms-backups")
    captured = {}

    def fake_urlopen(request, timeout):
        captured["request"] = request
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(backup_storage, "urlopen", fake_urlopen)
    stored = backup_storage.store_backup(make_source(tmp_path), datetime(2026, 9, 24, tzinfo=timezone.utc), tmp_path / "backups")

    assert stored.storage_path.startswith("supabase://dms-backups/backups/2026/09/24/")
    assert stored.local_path is None
    assert captured["request"].get_header("Authorization") == "Bearer test-service-role-key"
    assert captured["request"].get_header("Apikey") == "test-service-role-key"
    assert captured["request"].get_header("X-upsert") == "false"
    assert captured["request"].full_url.startswith("https://supabase.example/storage/v1/object/dms-backups/")
    assert "public" not in captured["request"].full_url.lower()


def test_supabase_upload_failure_is_not_success(tmp_path, monkeypatch):
    monkeypatch.setenv("BACKUP_STORAGE", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://supabase.example")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    monkeypatch.setattr(backup_storage, "urlopen", lambda request, timeout: (_ for _ in ()).throw(URLError("offline")))
    source = make_source(tmp_path)
    with pytest.raises(backup_storage.BackupStorageError):
        backup_storage.store_backup(source, datetime.now(timezone.utc), tmp_path / "backups")
    assert source.is_file()


def test_supabase_upload_rejects_empty_source(tmp_path, monkeypatch):
    monkeypatch.setenv("BACKUP_STORAGE", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://supabase.example")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    source = tmp_path / "empty.zip"
    source.touch()
    with pytest.raises(backup_storage.BackupStorageError, match="missing or empty"):
        backup_storage.store_backup(source, datetime.now(timezone.utc), tmp_path / "backups")


def test_supabase_paths_are_unique(tmp_path, monkeypatch):
    monkeypatch.setenv("BACKUP_STORAGE", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://supabase.example")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    monkeypatch.setattr(backup_storage, "urlopen", lambda request, timeout: FakeResponse())
    created_at = datetime(2026, 9, 24, tzinfo=timezone.utc)
    first = backup_storage.store_backup(make_source(tmp_path), created_at, tmp_path / "backups")
    second = backup_storage.store_backup(make_source(tmp_path), created_at, tmp_path / "backups")
    assert first.storage_path != second.storage_path


def test_service_role_key_never_appears_in_storage_errors(tmp_path, monkeypatch, caplog):
    key = "test-service-role-key"
    monkeypatch.setenv("BACKUP_STORAGE", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://supabase.example")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", key)
    monkeypatch.setattr(backup_storage, "urlopen", lambda request, timeout: (_ for _ in ()).throw(URLError("offline")))
    with pytest.raises(backup_storage.BackupStorageError) as error:
        backup_storage.store_backup(make_source(tmp_path), datetime.now(timezone.utc), tmp_path / "backups")
    assert key not in str(error.value)
    assert key not in caplog.text
