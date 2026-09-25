# DMS Backend

Basic FastAPI foundation for the Secure Intelligent Document Management System.

## Database setup

Set `DATABASE_URL` in `backend/.env` for hosted PostgreSQL. For local
development, leave it empty and provide the existing `POSTGRES_*` variables.

From the `backend` directory:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
```

Check migration state with `alembic current` and `alembic heads`.

`app/init_db.py` is retained only for legacy data repair and backfilling. It
does not create tables. Schema creation and changes are managed by Alembic.

## Run locally

From the `backend` directory:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`.

- Health check: `http://127.0.0.1:8000/health`
- PostgreSQL check: `http://127.0.0.1:8000/health/db`
- API docs: `http://127.0.0.1:8000/docs`

## Production deployment preparation

Install dependencies from the `backend` directory:

```bash
pip install -r requirements.txt
```

Run the production server with the hosting platform's assigned port:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Run database migrations before starting the service:

```bash
alembic upgrade head
```

Required deployment configuration is documented in `.env.example`. Provide
secrets through the hosting platform's environment settings, never through
source control. The deployment must configure `DATABASE_URL`,
`JWT_SECRET_KEY`, `CORS_ORIGINS`, Cloudinary credentials, Resend OTP
credentials and sender settings, AI provider settings, and blockchain RPC,
chain, contract, and signing-key settings as applicable.

The service also requires the external systems selected by the configuration:
Supabase PostgreSQL, Cloudinary, Resend, the configured AI provider, and the
configured blockchain RPC/network. Development backups use `BACKUP_STORAGE=local`.
For production, use `BACKUP_STORAGE=supabase` with a private `dms-backups`
Supabase Storage bucket, backend-only service-role credentials, and persistent
external storage. Backup objects are not public URLs and are never exposed to
the frontend.

Blockchain development may use `BLOCKCHAIN_PROVIDER=ganache`. Production must
use `BLOCKCHAIN_PROVIDER=external` with an approved external or permissioned
RPC endpoint, chain ID, deployed contract address, and backend-only transaction
signing secret. No production blockchain network or contract is deployed by
this project configuration. Blockchain verification confirms only whether the
document's current SHA-256 hash matches the hash previously anchored on the
blockchain; it does not establish authenticity, authorship, possession, or
legal validity.

Health endpoints:

- `GET /health`
- `GET /health/db`
