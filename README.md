# DMS

A full-stack document-management system for controlled upload, classification,
validation, integrity checks, secure sharing, custody history, blockchain
proofs, and backup verification.

## Security first

Never commit `backend/.env`, database passwords, Cloudinary credentials, JWT
secrets, wallet private keys, RPC credentials, uploaded files, or generated
backup/storage data. Use `backend/.env.example` as the configuration template.

Web authentication currently stores the access token and user session state in
browser `localStorage`. Production hardening may migrate this to HttpOnly,
Secure, SameSite cookies in a future coordinated authentication change. Backend
RBAC remains authoritative.

## Architecture

```text
frontend/  Next.js + React + TypeScript web UI
backend/   FastAPI API, SQLAlchemy models, PostgreSQL integration
mobile/    Flutter authenticator application
backend/app/routers/     Auth, documents, AI, sharing, custody, blockchain, backups, audit
backend/app/services/    Storage, extraction, classification, validation, integrity, backup services
backend/app/models/      SQLAlchemy database models
backend/app/schemas/     Pydantic request/response contracts
backend/blockchain/      Solidity registry and deployment artifacts
```

## Implemented workflow

1. Authenticate with password plus OTP or the registered authenticator flow.
2. Upload a document with case metadata.
3. Store document files in Cloudinary and calculate SHA-256 hashes.
4. Extract PDF text/OCR and classify documents through the configured Groq provider.
5. Validate required fields and metadata consistency.
6. Search, list, and inspect document details.
7. Detect exact duplicates using SHA-256.
8. View document versions and chain-of-custody events.
9. Create and verify blockchain integrity proofs when blockchain infrastructure is configured.
10. Create, access, and revoke secure shares.
11. Create backups and run non-destructive restore verification.
12. Record audit events through the backend.

## Requirements

- Windows PowerShell or an equivalent shell
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+
- Flutter SDK with Dart 3.11+
- Optional integrations: Cloudinary, Supabase Storage for production backups, and an EVM node or external permissioned network

## Backend setup

```powershell
Set-Location backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Set local values in `.env`, then apply the database migrations:

```powershell
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend uses PostgreSQL through SQLAlchemy. Database schema creation and
changes are managed by Alembic; `app/init_db.py` is retained only for legacy
data repair and version backfilling.

Backend URLs for local development:

- API: http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health
- Database health: http://127.0.0.1:8000/health/db

## Frontend setup

```powershell
Set-Location frontend
npm install
npm run dev
```

The frontend is a Next.js application. During development, the API base URL
may use the local backend example:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

For a production build, `NEXT_PUBLIC_API_BASE_URL` must be explicitly set to
the deployed HTTPS backend URL. This README intentionally does not provide a
specific production URL.

Useful commands:

```powershell
npm run build
npm run lint
npm start
```

## Mobile authenticator setup

The mobile application is built with Flutter. From the `mobile` directory:

```powershell
flutter pub get
flutter analyze
flutter run
```

The authenticator uses device-bound cryptographic keys and biometric approval.
It acts as the approver for website login challenges and does not receive the
website JWT during the approval flow.

## API modules

| Area | Main routes |
| --- | --- |
| Authentication | `/api/auth/login`, `/api/auth/verify-otp`, `/api/auth/me` |
| Documents | `/api/documents`, `/api/documents/upload`, `/api/documents/search` |
| Required fields | `POST /api/documents/{document_id}/validate-required-fields` |
| Metadata consistency | `POST /api/documents/{document_id}/validate-consistency` |
| Exact duplicates | `GET /api/documents/{document_id}/duplicates` |
| Versions | `/api/documents/{document_id}/versions` |
| Sharing | `/api/documents/{document_id}/shares`, `/api/shares/{share_id}` |
| Custody | `GET /api/documents/{document_id}/custody` |
| Blockchain | `GET /api/documents/{document_id}/blockchain-verify` |
| Backup | `POST /api/backups/create`, `POST /api/backups/restore-test` |
| Audit | `GET /api/audit-logs` |

See Swagger at `/docs` for the generated API contract. Production deployments
should decide separately whether the public documentation endpoints should be
restricted.

## Configuration

Copy `backend/.env.example` to `backend/.env` and replace placeholders without
committing the resulting file.

- **Database:** PostgreSQL connection settings, with schema changes applied through Alembic.
- **Document storage:** Cloudinary credentials are required for document upload and retrieval.
- **AI:** Groq is the configured provider. Set the provider, model, base URL, timeout, and `GROQ_API_KEY` in the backend environment; never put the key in source control.
- **Backups:** Development can use `BACKUP_STORAGE=local`. Production should use `BACKUP_STORAGE=supabase` with a private bucket and backend-only Supabase service-role credentials. This repository does not claim that external backup storage is already configured.
- **Blockchain:** Configuration is environment-based. Local development may use `BLOCKCHAIN_PROVIDER=ganache`. Production requires `BLOCKCHAIN_PROVIDER=external`, an approved external or permissioned network, chain ID, deployed contract address, and backend-only signing credentials. This project does not claim that a production network or contract is deployed.
- **Web frontend:** Production requires `NEXT_PUBLIC_API_BASE_URL` pointing to the deployed HTTPS backend.

Do not expose database passwords, JWT secrets, Cloudinary secrets, Groq keys,
Supabase service-role keys, RPC credentials, or blockchain private keys.

## Data and generated files

These are local/runtime artifacts and must stay outside Git:

- `backend/.env`
- `backend/.venv/`
- `backend/storage/`
- `backend/backups/`
- `backend/restore-tests/`
- Python caches and frontend build output

## Validation

Run the backend tests from `backend` and validate the frontend with TypeScript,
lint, and a production build before sharing changes. Run `flutter analyze` for
the mobile application. Use `/health` and `/health/db` for local backend health
checks. These checks do not establish that external production services are
deployed or configured.

Before publishing a private repository, review `git status` and
`git diff --cached`. Confirm that environment files, credentials, uploaded
files, storage data, and backups are not staged.
