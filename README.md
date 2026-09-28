# DMS — Secure Intelligent Document Management System

> A secure, intelligent, and auditable platform for managing sensitive documents from upload to archival.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-modern-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Flutter](https://img.shields.io/badge/Flutter-authenticator-02569B?logo=flutter)](https://flutter.dev/)
[![License](https://img.shields.io/badge/license-private-lightgrey)](#)

## Overview

DMS is a full-stack document management system designed for organizations that
need more than basic file storage. It combines structured document workflows,
AI-assisted classification, OCR, metadata validation, chain-of-custody tracking,
secure sharing, tamper-evident integrity proofs, and verifiable backups in one
system.

The platform is built with a security-first mindset: the backend remains the
authoritative layer for authentication and role-based access control, while
every important document operation can be traced through audit and custody
events.

## The Problem

Sensitive documents are often spread across shared drives, email threads, and
unstructured folders. This creates several operational and security challenges:

- Finding the right document quickly is difficult when files are poorly classified.
- Missing or inconsistent metadata can make documents hard to trust or process.
- Duplicate files and uncontrolled versions create uncertainty about which copy is current.
- Traditional file sharing makes access revocation and accountability difficult.
- It is hard to prove whether a document has changed after it was uploaded.
- Backup processes are often disconnected from restore verification.
- Password-only authentication is not sufficient for high-value document workflows.

## The Solution

DMS provides a controlled lifecycle for every document:

1. **Authenticate securely** with password and OTP or a registered mobile authenticator.
2. **Upload with context** using case information and document metadata.
3. **Extract and understand content** through PDF text extraction, OCR, and AI classification.
4. **Validate quality** by checking required fields and metadata consistency.
5. **Track every version** with hashes, custody events, and audit records.
6. **Share safely** with controlled access that can be created, reviewed, and revoked.
7. **Verify integrity** by comparing document hashes with previously anchored blockchain proofs.
8. **Protect recoverability** through backup creation and non-destructive restore testing.

## Key Capabilities

| Capability | What it provides |
| --- | --- |
| Authentication | Password, OTP, and device-bound mobile approval |
| Document management | Controlled upload, search, inspection, version history, and metadata |
| Intelligent processing | PDF extraction, OCR, and configurable Groq-powered classification |
| Data quality | Required-field validation and metadata consistency checks |
| Integrity | SHA-256 duplicate detection and optional blockchain hash anchoring |
| Collaboration | Secure document shares with access and revocation controls |
| Accountability | Audit logs and chain-of-custody history |
| Resilience | Backup creation and restore verification workflows |

## Approach

### 1. Layered architecture

The project separates responsibilities across focused clients, APIs, services,
and persistence:

```text
Web browser ────────┐
                    ├── Next.js frontend ──┐
Mobile authenticator┘                       │
                                            ├── FastAPI backend
PostgreSQL ◄────────────────────────────────┤
Cloudinary / Supabase Storage ◄─────────────┤
AI provider / OCR ◄─────────────────────────┤
Blockchain network ◄────────────────────────┘
```

### 2. Backend-authoritative security

Authentication, authorization, validation, and document access decisions are
enforced by the backend. The frontend and mobile application provide user
experiences, but they do not replace server-side access control.

### 3. Evidence-driven document handling

Documents are represented by cryptographic hashes, versions, custody events,
and audit events. This creates a traceable record of what happened to a
document instead of treating it as an anonymous file.

### 4. Configurable integrations

External services are configured through environment variables so development
and production environments can use appropriate storage, AI, email, and
blockchain providers without hard-coding credentials or infrastructure details.

## Technology Stack

### Frontend

- **Next.js 16** with the App Router
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Lucide React** for interface icons

### Backend

- **Python 3.11+**
- **FastAPI** and **Uvicorn**
- **SQLAlchemy** for database access
- **Alembic** for versioned schema migrations
- **Pydantic** request and response contracts
- **PyJWT** and **pwdlib/Argon2** for authentication support

### Data, storage, and processing

- **PostgreSQL 14+** for application data
- **Cloudinary** for document storage
- **PyMuPDF**, **Pillow**, and **Tesseract** for extraction and OCR
- **Groq** as the configured AI provider for classification
- **Supabase Storage** as the production backup option

### Security and integrity

- SHA-256 document hashing
- OTP and mobile authenticator approval
- EVM-compatible blockchain integration through **Web3.py**
- Solidity registry contracts with **py-solc-x**
- Audit logs and chain-of-custody records

### Mobile

- **Flutter**
- Device-bound cryptographic keys
- Biometric approval for authenticator challenges

## Project Structure

```text
.
├── frontend/                 # Next.js web application
├── backend/                  # FastAPI API and domain services
│   ├── app/routers/          # Auth, documents, sharing, custody, audit, and more
│   ├── app/services/         # Storage, extraction, classification, backup, and integrity
│   ├── app/models/           # SQLAlchemy database models
│   ├── app/schemas/          # Pydantic API contracts
│   └── blockchain/            # Solidity registry and deployment artifacts
└── mobile/                   # Flutter authenticator application
```

## Getting Started

### Prerequisites

- Windows PowerShell or an equivalent shell
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+
- Flutter SDK with Dart 3.11+
- Optional: Cloudinary, Groq, Supabase Storage, email provider, and an EVM-compatible network

### 1. Configure and run the backend

```powershell
Set-Location backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Set the local values in `backend/.env`, then apply migrations and start the API:

```powershell
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend is available at:

- API: <http://127.0.0.1:8000>
- Swagger UI: <http://127.0.0.1:8000/docs>
- Health check: <http://127.0.0.1:8000/health>
- Database health check: <http://127.0.0.1:8000/health/db>

### 2. Configure and run the frontend

In a second terminal:

```powershell
Set-Location frontend
npm install
$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:8000"
npm run dev
```

Open <http://localhost:3000> in your browser.

Useful frontend commands:

```powershell
npm run lint
npm run build
npm start
```

### 3. Run the mobile authenticator

```powershell
Set-Location mobile
flutter pub get
flutter analyze
flutter run
```

The mobile app approves website login challenges using device-bound keys and
biometrics. It does not receive the website JWT during the approval flow.

## API Areas

| Area | Example routes |
| --- | --- |
| Authentication | `/api/auth/login`, `/api/auth/verify-otp`, `/api/auth/me` |
| Documents | `/api/documents`, `/api/documents/upload`, `/api/documents/search` |
| Validation | `/api/documents/{document_id}/validate-required-fields` |
| Consistency | `/api/documents/{document_id}/validate-consistency` |
| Versions | `/api/documents/{document_id}/versions` |
| Sharing | `/api/documents/{document_id}/shares`, `/api/shares/{share_id}` |
| Custody | `/api/documents/{document_id}/custody` |
| Blockchain | `/api/documents/{document_id}/blockchain-verify` |
| Backups | `/api/backups/create`, `/api/backups/restore-test` |
| Audit | `/api/audit-logs` |

The generated API contract is available through Swagger at `/docs`.

## Security Notes

Never commit any of the following:

- `backend/.env`, passwords, JWT secrets, API keys, or private keys
- Uploaded documents, generated backups, or local storage data
- Cloudinary, Supabase, email, AI, RPC, or database credentials

Use `backend/.env.example` as the configuration template. Backend RBAC remains
authoritative. The current web client stores its access token and session state
in browser `localStorage`; production hardening may migrate this to
HttpOnly, Secure, SameSite cookies in a coordinated authentication change.

Blockchain verification confirms whether the current document hash matches a
previously anchored hash. It does not independently prove authenticity,
authorship, possession, or legal validity.

## Validation Checklist

Before sharing changes, run the checks relevant to the component you changed:

```powershell
# Backend
Set-Location backend
pytest

# Frontend
Set-Location ..\frontend
npm run lint
npm run build

# Mobile
Set-Location ..\mobile
flutter analyze
```

Also verify `/health` and `/health/db`, review `git status`, and confirm that
credentials, uploads, backups, and environment files are not staged.

## Contributors

This project is built by:

| Contributor | Role | Profile |
| --- | --- | --- |
| **[Contributor 1 Name]** | [Role or contribution] | [GitHub profile URL] |
| **[Contributor 2 Name]** | [Role or contribution] | [GitHub profile URL] |

Replace the placeholders above with the contributors' names, roles, and
profiles before publishing the project.

## Project Status

DMS is an actively developed project. Integrations such as production backup
storage, AI services, email delivery, and blockchain infrastructure must be
configured separately for each deployment environment.

---

Built with care for secure, traceable, and intelligent document workflows.
