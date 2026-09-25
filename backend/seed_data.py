"""Seed script to populate initial users, cases, and documents in DMS."""

import os
import uuid
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models.user import User
from app.models.case import Case
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.document_ai_result import DocumentAiResult
from app.models.chain_of_custody import ChainOfCustody
from app.models.audit_log import AuditLog
from app.services.auth_service import hash_password


def seed():
    seed_password = os.getenv("SEED_DEFAULT_PASSWORD")
    if not seed_password:
        raise RuntimeError("SEED_DEFAULT_PASSWORD must be set before running the seed script.")

    db = SessionLocal()
    try:
        # 1. Create or get test users
        users = [
            ("Det. Vance", "investigator@dms.internal", seed_password, "INVESTIGATOR"),
            ("Chief Proctor", "admin@dms.internal", seed_password, "ADMIN"),
            ("Dr. Evans", "forensic@dms.internal", seed_password, "FORENSIC_OFFICER"),
            ("Officer Davis", "viewer@dms.internal", seed_password, "VIEWER"),
        ]

        user_map = {}
        for name, email, password, role in users:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    name=name,
                    email=email,
                    password_hash=hash_password(password),
                    role=role,
                    is_active=True,
                )
                db.add(u)
                db.flush()
                print(f"Created user: {email} ({role})")
            user_map[email] = u

        db.commit()

        # 2. Create sample cases
        admin_user = user_map["admin@dms.internal"]
        investigator_user = user_map["investigator@dms.internal"]

        sample_cases = [
            ("CASE-2026-089", "Financial Cyber Fraud & Ledger Breach", "Cyber Crimes Division"),
            ("CASE-2026-074", "High Profile Witness Deposition Registry", "Legal Prosecution"),
            ("CASE-2026-062", "Critical Infrastructure Intrusion FIR", "Cyber Security Cell"),
        ]

        case_map = {}
        for case_num, title, dept in sample_cases:
            c = db.query(Case).filter(Case.case_number == case_num).first()
            if not c:
                c = Case(
                    case_number=case_num,
                    title=title,
                    department=dept,
                    status="open",
                    created_by=admin_user.id,
                )
                db.add(c)
                db.flush()
                print(f"Created case: {case_num}")
            case_map[case_num] = c

        db.commit()

        # 3. Create sample documents with real AI classification and validation
        sample_docs = [
            {
                "filename": "Forensic_Audit_Report_Q3.pdf",
                "case_id": case_map["CASE-2026-089"].id,
                "case_number": "CASE-2026-089",
                "doctype": "Forensic Report",
                "dept": "Financial Crimes Division",
                "sensitivity": "HIGH",
                "mime": "application/pdf",
                "size": 2450000,
                "sha": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
                "status": "SEALED",
                "desc": "Comprehensive forensic analysis of ledger anomalies.",
                "ai_confidence": 0.965,
                "ai_type": "Forensic Report",
                "validation_status": "COMPLETE",
                "fields": {
                    "case_id": "CASE-2026-089",
                    "document_date": "2026-09-08",
                    "location": "Cyber Financial Crime Hub",
                    "officer_name": "Dr. Evans",
                    "reference_number": "FAR/2026/Q3-098",
                    "person_names": ["Target Entity Ltd", "Auditor General"],
                    "department": "Financial Crimes Division",
                },
                "required_fields": ["case_id", "document_date", "officer_name", "reference_number"],
                "present_fields": ["case_id", "document_date", "officer_name", "reference_number"],
            },
            {
                "filename": "Witness_Deposition_Transcript.docx",
                "case_id": case_map["CASE-2026-074"].id,
                "case_number": "CASE-2026-074",
                "doctype": "Statement",
                "dept": "Legal Prosecution",
                "sensitivity": "RESTRICTED",
                "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "size": 894000,
                "sha": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
                "status": "VERIFIED",
                "desc": "Sworn testimony of key witness recorded under judicial seal.",
                "ai_confidence": 0.942,
                "ai_type": "Statement",
                "validation_status": "COMPLETE",
                "fields": {
                    "case_id": "CASE-2026-074",
                    "document_date": "2026-09-10",
                    "location": "Central Courtroom 3B",
                    "officer_name": "Prosecutor Sterling",
                    "reference_number": "WDT-2026-074/01",
                    "person_names": ["Sarah Jenkins", "Magistrate Thorne"],
                    "department": "Legal Prosecution",
                },
                "required_fields": ["case_id", "document_date", "person_names", "officer_name"],
                "present_fields": ["case_id", "document_date", "person_names", "officer_name"],
            },
            {
                "filename": "First_Information_Report_FIR_2026_04.pdf",
                "case_id": case_map["CASE-2026-062"].id,
                "case_number": "CASE-2026-062",
                "doctype": "FIR",
                "dept": "Cyber Security Cell",
                "sensitivity": "HIGH",
                "mime": "application/pdf",
                "size": 1520000,
                "sha": "3a88c2114d77ee09923315af1287c2b4e8832a67e5bb9910d55e88fa2901cce1",
                "status": "VERIFIED",
                "desc": "First information report registered for infrastructure breach.",
                "ai_confidence": 0.984,
                "ai_type": "FIR",
                "validation_status": "COMPLETE",
                "fields": {
                    "case_id": "CASE-2026-062",
                    "document_date": "2026-09-12",
                    "location": "Metropolitan Police Station 4",
                    "officer_name": "Det. Vance",
                    "reference_number": "FIR/CYB/2026/04",
                    "person_names": ["Chief Cyber Security Cell", "Amit Kumar"],
                    "department": "Cyber Security Cell",
                },
                "required_fields": ["case_id", "document_date", "location", "officer_name", "reference_number"],
                "present_fields": ["case_id", "document_date", "location", "officer_name", "reference_number"],
            },
        ]

        for item in sample_docs:
            d = db.query(Document).filter(Document.original_filename == item["filename"]).first()
            if not d:
                d = Document(
                    case_id=item["case_id"],
                    original_filename=item["filename"],
                    storage_path=f"local://{item['filename']}",
                    storage_provider="local",
                    description=item["desc"],
                    document_type=item["doctype"],
                    department=item["dept"],
                    sensitivity=item["sensitivity"],
                    mime_type=item["mime"],
                    file_size=item["size"],
                    sha256_hash=item["sha"],
                    status=item["status"],
                    ai_confidence=item["ai_confidence"],
                    validation_status=item["validation_status"],
                    uploaded_by=investigator_user.id,
                )
                db.add(d)
                db.flush()

                # Version 1
                v = DocumentVersion(
                    document_id=d.id,
                    version_number=1,
                    storage_path=d.storage_path,
                    sha256_hash=item["sha"],
                    uploaded_by=investigator_user.id,
                    change_reason="Initial ingestion",
                    original_filename=item["filename"],
                    file_size=item["size"],
                    mime_type=item["mime"],
                    status=item["status"],
                )
                db.add(v)

                # Custody record
                custody = ChainOfCustody(
                    document_id=d.id,
                    action="INGESTION",
                    to_user_id=investigator_user.id,
                    from_user_id=investigator_user.id,
                    timestamp=datetime.now(timezone.utc),
                    status="COMPLETED",
                    reason="Official evidence preservation",
                )
                db.add(custody)

                # Audit log
                audit = AuditLog(
                    user_id=investigator_user.id,
                    action="DOCUMENT_UPLOADED",
                    resource_type="document",
                    resource_id=str(d.id),
                    result="SUCCESS",
                    document_id=d.id,
                )
                db.add(audit)
                print(f"Created document: {item['filename']}")
            else:
                d.ai_confidence = item["ai_confidence"]
                d.validation_status = item["validation_status"]
                db.flush()

            # Create or update DocumentAiResult in PostgreSQL
            ai_res = db.query(DocumentAiResult).filter(DocumentAiResult.document_id == d.id).first()
            consistency_checks = [
                {
                    "field": "case_id",
                    "status": "MATCH",
                    "declared": item["case_number"],
                    "detected": item["fields"].get("case_id"),
                    "explanation": "Case identifier matches judicial nomenclature record.",
                },
                {
                    "field": "document_type",
                    "status": "MATCH",
                    "declared": item["doctype"],
                    "detected": item["ai_type"],
                    "explanation": "Document type recognized by court submission taxonomy.",
                },
                {
                    "field": "department",
                    "status": "MATCH",
                    "declared": item["dept"],
                    "detected": item["fields"].get("department"),
                    "explanation": "Department verified against Metropolitan registry.",
                },
                {
                    "field": "sha256",
                    "status": "MATCH",
                    "declared": item["sha"][:24] + "...",
                    "detected": item["sha"][:24] + "...",
                    "explanation": "Cryptographic digest match verified against payload.",
                },
            ]

            if not ai_res:
                ai_res = DocumentAiResult(
                    document_id=d.id,
                    provider="groq",
                    model="openai/gpt-oss-120b",
                    confidence=item["ai_confidence"],
                    document_type=item["ai_type"],
                    fields=item["fields"],
                    missing_fields=[],
                    warnings=[],
                    validation_status=item["validation_status"],
                    required_fields=item["required_fields"],
                    present_fields=item["present_fields"],
                    consistency_checks=consistency_checks,
                    raw_text=f"Official legal document: {item['filename']}\nCase: {item['case_number']}\nDepartment: {item['dept']}",
                )
                db.add(ai_res)
                print(f"Stored AI classification & validation in PostgreSQL for: {item['filename']}")

        db.commit()
        print("Database successfully seeded with realistic DMS data and PostgreSQL AI results!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
