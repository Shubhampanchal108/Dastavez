export interface DmsDocument {
  id: string;
  case_id: string;
  original_filename: string;
  document_type: string;
  department: string;
  sensitivity: 'INTERNAL' | 'RESTRICTED' | 'HIGH' | 'TOP_SECRET';
  mime_type: string;
  file_size: number;
  sha256_hash: string;
  status: 'VERIFIED' | 'SEALED' | 'PENDING' | 'IN_REVIEW' | 'FLAGGED';
  created_at: string;
  uploader: string;
  uploader_role: string;
  version: string;
  blockchain_tx?: string;
  block_number?: number;
  summary?: string;
  ai_confidence?: number;
  validation_status?: string;
  ocr_text?: string;
}

export const INITIAL_DOCUMENTS: DmsDocument[] = [
  {
    id: 'doc-101',
    case_id: 'CASE-2026-089',
    original_filename: 'Forensic_Audit_Report_Q3.pdf',
    document_type: 'Audit Report',
    department: 'Financial Crimes Division',
    sensitivity: 'HIGH',
    mime_type: 'application/pdf',
    file_size: 2450000,
    sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    status: 'SEALED',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    uploader: 'Det. Vance',
    uploader_role: 'Senior Investigator',
    version: 'v2.1',
    blockchain_tx: '0x7e8a9d12345bcdef90123456789abcdef0123456789abcdef0123456789abcde',
    block_number: 4921842,
    summary: 'Comprehensive forensic analysis of transaction ledger discrepancies during Q3 audit.',
    ai_confidence: 0.985,
    validation_status: 'COMPLETE',
    ocr_text: `GOVERNMENT FORENSIC INVESTIGATION WING
FINANCIAL CRIMES DIVISION — AUDIT REPORT
CASE REFERENCE: CASE-2026-089
SUBJECT: QUARTERLY TRANSACTIONS RECONCILIATION & IRREGULARITY FINDINGS

1. EXECUTIVE SUMMARY:
An exhaustive forensic analysis of ledger accounts across banking channels between July 1, 2026 and September 15, 2026 indicates unauthorized offshore route transfers totaling INR 42.8 Crores. Discrepancies were identified in routing transit numbers.

2. FORENSIC FINDINGS:
- Ledger ID: #ACC-9921-FX showed 14 outbound wires with bypassed dual-authorization tokens.
- Transaction logs match IP blocks registered to proxy nodes in Zurich and Singapore.
- Cryptographic hash signatures on original authorizations fail secondary SHA-256 match.

3. RECOMMENDATIONS:
Immediate asset freezing orders under Section 102 CrPC. Primary accounts tagged for judicial escrow.`,
  },
  {
    id: 'doc-102',
    case_id: 'CASE-2026-074',
    original_filename: 'Witness_Deposition_Transcript.docx',
    document_type: 'Deposition',
    department: 'Legal Prosecution Bureau',
    sensitivity: 'RESTRICTED',
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 894000,
    sha256_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    status: 'VERIFIED',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    uploader: 'Dr. Evans',
    uploader_role: 'Forensic Audio Analyst',
    version: 'v1.0',
    blockchain_tx: '0x1b4c8e77a11223344556677889900aabbccddeeff11223344556677889900aabb',
    block_number: 4921530,
    summary: 'Sworn testimony of primary witness recorded under judicial supervision.',
    ai_confidence: 0.992,
    validation_status: 'COMPLETE',
    ocr_text: `IN THE COURT OF THE SPECIAL JUDGE FOR FINANCIAL & ECONOMIC CRIMES
SWORN DEPOSITION TRANSCRIPT UNDER SECTION 164 CrPC

CASE ID: CASE-2026-074
DEPONENT: ANONYMOUS WITNESS "K-4"
RECORDING OFFICER: REGISTRAR M. VERMA
FORENSIC WITNESS: DR. EVANS

TRANSCRIPT OF EXAMINATION:
Q: Can you confirm your presence at the central server room on the evening of August 14th?
A: Yes, I was present on the 4th floor datacenter between 20:30 and 22:15 hours.
Q: Did you witness any individual inserting removable storage media into terminal 07?
A: I observed the junior IT contractor bypass the security lock using a master badge keycard and insert a blue USB drive into the air-gapped node.
Q: Did you alert duty security at that point?
A: Yes, I logged the security incident at 22:18 on the emergency physical ledger.`,
  },
  {
    id: 'doc-103',
    case_id: 'CASE-2026-062',
    original_filename: 'First_Information_Report_FIR_2026_04.pdf',
    document_type: 'First Information Report (FIR)',
    department: 'Metropolitan Police Station 4',
    sensitivity: 'HIGH',
    mime_type: 'application/pdf',
    file_size: 1520000,
    sha256_hash: '3a88c2114d77ee09923315af1287c2b4e8832a67e5bb9910d55e88fa2901cce1',
    status: 'VERIFIED',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    uploader: 'Officer Davis',
    uploader_role: 'Duty Officer',
    version: 'v1.0',
    blockchain_tx: '0x4f33aa99bb110022338877665544332211aabbccddeeff001122334455667788',
    block_number: 4920914,
    summary: 'Original registered FIR concerning cyber intrusion into institutional database.',
    ai_confidence: 0.998,
    validation_status: 'COMPLETE',
    ocr_text: `FIRST INFORMATION REPORT (FIR)
(Under Section 154 Cr.P.C)
DISTRICT: METROPOLITAN CENTRAL | POLICE STATION: CRIME BRANCH PS-4
FIR NO: 0042/2026 | DATE: 2026-09-14 09:30 IST

1. ACTS & SECTIONS:
- Information Technology Act, 2000: Sec 43, 66, 66C
- Bharatiya Nyaya Sanhita (BNS), 2023: Sec 318(4), 336(3)

2. OCCURRENCE OF OFFENCE:
Date/Time: Between 2026-09-12 23:00 and 2026-09-13 04:00 IST
Place: Central Institutional Datacenter, Server Cluster Alpha

3. COMPLAINANT / INFORMANT:
Chief Proctor, Institutional Security Infrastructure
Contact: admin@dms.internal

4. DETAILS OF KNOWN / SUSPECTED / UNKNOWN ACCUSED:
Unidentified threat actors operating compromised credentials bearing ID #EMP-8041.

5. BRIEF PARTICULARS:
Intrusion alert triggered by IDS following brute-force exfiltration attempt on confidential forensic logs. System state frozen and physical media impounded under digital evidence custody seal #EVD-4091.`,
  },
  {
    id: 'doc-104',
    case_id: 'CASE-2026-055',
    original_filename: 'Chain_Custody_Evidence_Photos.png',
    document_type: 'Evidence Photo',
    department: 'Digital Forensics Lab',
    sensitivity: 'INTERNAL',
    mime_type: 'image/png',
    file_size: 4200000,
    sha256_hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    status: 'PENDING',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    uploader: 'Chief Proctor',
    uploader_role: 'Lab Director',
    version: 'v1.0',
    summary: 'High-resolution photographs of hardware physical seizure labels and seals.',
    ai_confidence: 0.941,
    validation_status: 'COMPLETE',
    ocr_text: `EVIDENCE SEIZURE DOCUMENTATION
LABEL: HARDWARE SEIZURE BAG #SEAL-9921
EQUIPMENT: 2x 4TB NVMe SSD Solid-State Drives, 1x Hardware Keyring
CHAIN OF CUSTODY VERIFIED BY: CHIEF PROCTOR
TIME OF SEIZURE: 2026-09-14 16:45 IST
SEAL SERIALS: [S-99210-A, S-99210-B] - UNBROKEN METALLIC INTEGRITY SEALS`,
  },
];

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'SHARE' | 'VALIDATION' | 'INTEGRITY' | 'BLOCKCHAIN' | 'SECURITY';
  isRead: boolean;
  docId?: string;
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'New Secure Share Received',
    description: 'Prosecutor Sharma shared "Forensic_Audit_Report_Q3.pdf" with 48h access.',
    timestamp: '10m ago',
    category: 'SHARE',
    isRead: false,
    docId: 'doc-101',
  },
  {
    id: 'notif-2',
    title: 'Blockchain Proof Anchored',
    description: 'Document #CASE-2026-062 anchored to EVM Block #4,920,914.',
    timestamp: '1h ago',
    category: 'BLOCKCHAIN',
    isRead: false,
    docId: 'doc-103',
  },
  {
    id: 'notif-3',
    title: 'AI Classification Completed',
    description: 'Ollama model detected "FIR" with 99.1% confidence level.',
    timestamp: '3h ago',
    category: 'VALIDATION',
    isRead: true,
    docId: 'doc-103',
  },
  {
    id: 'notif-4',
    title: 'Integrity Verification Passed',
    description: 'SHA-256 hash recalculated and matched stored immutable record.',
    timestamp: '5h ago',
    category: 'INTEGRITY',
    isRead: true,
    docId: 'doc-102',
  },
  {
    id: 'notif-5',
    title: 'Security Session Alert',
    description: 'New login session authenticated from Authorized Desktop Workstation (B-201).',
    timestamp: 'Yesterday',
    category: 'SECURITY',
    isRead: true,
  },
];

export interface ShareRecord {
  id: string;
  document_id: string;
  document_name: string;
  case_id: string;
  recipient_email: string;
  recipient_name: string;
  permission: 'VIEW_ONLY' | 'DOWNLOAD' | 'AUDIT';
  created_at: string;
  expires_at: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  shared_by: string;
  access_count?: number;
}

export const INITIAL_SHARES: ShareRecord[] = [
  {
    id: 'share-001',
    document_id: 'doc-101',
    document_name: 'Forensic_Audit_Report_Q3.pdf',
    case_id: 'CASE-2026-089',
    recipient_email: 'prosecutor.general@judiciary.internal',
    recipient_name: 'Adv. S. Raman',
    permission: 'VIEW_ONLY',
    created_at: '2026-09-14T10:00:00Z',
    expires_at: '2026-09-21T10:00:00Z',
    status: 'ACTIVE',
    shared_by: 'Det. Vance',
    access_count: 3,
  },
  {
    id: 'share-002',
    document_id: 'doc-102',
    document_name: 'Witness_Deposition_Transcript.docx',
    case_id: 'CASE-2026-074',
    recipient_email: 'bench.clerk@highcourt.internal',
    recipient_name: 'Registrar Verma',
    permission: 'DOWNLOAD',
    created_at: '2026-09-10T14:30:00Z',
    expires_at: '2026-09-12T14:30:00Z',
    status: 'EXPIRED',
    shared_by: 'Dr. Evans',
    access_count: 12,
  },
  {
    id: 'share-003',
    document_id: 'doc-103',
    document_name: 'First_Information_Report_FIR_2026_04.pdf',
    case_id: 'CASE-2026-062',
    recipient_email: 'external.auditor@cag.gov.in',
    recipient_name: 'CAG Auditor Mehta',
    permission: 'AUDIT',
    created_at: '2026-09-08T09:00:00Z',
    expires_at: '2026-09-15T09:00:00Z',
    status: 'REVOKED',
    shared_by: 'Chief Proctor',
    access_count: 5,
  },
];

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actor: string;
  actor_role: string;
  action: string;
  action_category: 'AUTH' | 'UPLOAD' | 'VERIFY' | 'SHARE' | 'BLOCKCHAIN' | 'ADMIN';
  reference: string;
  ip_address: string;
  status: 'SUCCESS' | 'WARNING' | 'DENIED';
  details: string;
}

export const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: 'audit-001',
    timestamp: '2026-09-15T09:40:12Z',
    actor: 'Det. Vance (BADGE #8421)',
    actor_role: 'INVESTIGATOR',
    action: 'DOC_VIEW',
    action_category: 'VERIFY',
    reference: 'CASE-2026-089 / doc-101',
    ip_address: '10.245.18.42',
    status: 'SUCCESS',
    details: 'Viewed Forensic_Audit_Report_Q3.pdf with RBAC token verification.',
  },
  {
    id: 'audit-002',
    timestamp: '2026-09-15T09:12:00Z',
    actor: 'System Daemon (Ollama)',
    actor_role: 'AI_AGENT',
    action: 'AI_CLASSIFICATION',
    action_category: 'UPLOAD',
    reference: 'CASE-2026-062 / doc-103',
    ip_address: '127.0.0.1:11434',
    status: 'SUCCESS',
    details: 'Executed zero-shot NER extraction and document type validation.',
  },
  {
    id: 'audit-003',
    timestamp: '2026-09-15T08:35:40Z',
    actor: 'Officer Davis',
    actor_role: 'OFFICER',
    action: 'BLOCKCHAIN_ANCHOR',
    action_category: 'BLOCKCHAIN',
    reference: 'EVM Block #4920914',
    ip_address: '10.245.18.99',
    status: 'SUCCESS',
    details: 'Anchored cryptographic SHA-256 fingerprint into Ethereum roll-up.',
  },
  {
    id: 'audit-004',
    timestamp: '2026-09-15T07:15:10Z',
    actor: 'Chief Proctor',
    actor_role: 'ADMIN',
    action: 'SHARE_REVOCATION',
    action_category: 'SHARE',
    reference: 'SHARE-003',
    ip_address: '10.245.10.02',
    status: 'WARNING',
    details: 'Access prematurely revoked for external auditor per protocol 4.2.',
  },
  {
    id: 'audit-005',
    timestamp: '2026-09-15T06:00:00Z',
    actor: 'Automated Job',
    actor_role: 'CRON',
    action: 'BACKUP_SNAPSHOT',
    action_category: 'ADMIN',
    reference: 'SNAPSHOT_2026_09_15.enc',
    ip_address: '127.0.0.1',
    status: 'SUCCESS',
    details: 'Encrypted multi-region backup snapshot created successfully (28.4 GB).',
  },
];

export interface OfficerPreset {
  name: string;
  badgeId: string;
  email: string;
  role: 'INVESTIGATOR' | 'ADMIN' | 'AUDITOR';
  avatarInitials: string;
  department: string;
}

export const OFFICER_PRESETS: OfficerPreset[] = [
  {
    name: 'Det. Vance',
    badgeId: 'BADGE #8421',
    email: 'investigator@dms.internal',
    role: 'INVESTIGATOR',
    avatarInitials: 'DV',
    department: 'Financial Crimes Division',
  },
  {
    name: 'Chief Proctor',
    badgeId: 'BADGE #0012',
    email: 'admin@dms.internal',
    role: 'ADMIN',
    avatarInitials: 'CP',
    department: 'Security Infrastructure Oversight',
  },
  {
    name: 'Dr. Evans',
    badgeId: 'BADGE #3319',
    email: 'forensics@dms.internal',
    role: 'AUDITOR',
    avatarInitials: 'DE',
    department: 'Forensic Audio & Digital Lab',
  },
];

export interface CustodyEvent {
  id: string;
  docId: string;
  timestamp: string;
  action: string;
  fromOfficer: string;
  toOfficer: string;
  badgeFrom: string;
  badgeTo: string;
  purpose: string;
  status: 'VERIFIED' | 'PENDING' | 'ACCEPTED';
}

export const INITIAL_CUSTODY_EVENTS: CustodyEvent[] = [
  {
    id: 'cust-1',
    docId: 'doc-101',
    timestamp: '2026-09-15 11:30 IST',
    action: 'Judicial Transfer',
    fromOfficer: 'Det. Vance',
    toOfficer: 'Lead Prosecutor Sharma',
    badgeFrom: '#8421',
    badgeTo: '#9012',
    purpose: 'Evidence bundle handoff for grand jury deposition.',
    status: 'VERIFIED',
  },
  {
    id: 'cust-2',
    docId: 'doc-101',
    timestamp: '2026-09-14 16:45 IST',
    action: 'Lab Analysis Receipt',
    fromOfficer: 'Officer Davis',
    toOfficer: 'Det. Vance',
    badgeFrom: '#4012',
    badgeTo: '#8421',
    purpose: 'Ingested raw financial audit ledgers into digital locker.',
    status: 'VERIFIED',
  },
  {
    id: 'cust-3',
    docId: 'doc-103',
    timestamp: '2026-09-14 09:40 IST',
    action: 'Evidence Ingestion & Seal',
    fromOfficer: 'Duty Officer Davis',
    toOfficer: 'Chief Proctor',
    badgeFrom: '#4012',
    badgeTo: '#0012',
    purpose: 'Original registered FIR impounded and sealed cryptographically.',
    status: 'VERIFIED',
  },
];

export interface DocumentVersion {
  version: string;
  timestamp: string;
  actor: string;
  role: string;
  summary: string;
  sha256: string;
  size: string;
  isCurrent?: boolean;
}

export const DOCUMENT_VERSIONS_MAP: Record<string, DocumentVersion[]> = {
  'doc-101': [
    {
      version: 'v2.1',
      timestamp: '2026-09-15 10:15 IST',
      actor: 'Det. Vance',
      role: 'Senior Investigator',
      summary: 'Appended forensic addendum on offshore routing addresses.',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      size: '2.45 MB',
      isCurrent: true,
    },
    {
      version: 'v2.0',
      timestamp: '2026-09-14 14:20 IST',
      actor: 'Dr. Evans',
      role: 'Forensic Analyst',
      summary: 'Added OCR extracted ledger tables and currency conversion sheet.',
      sha256: '8e71b091884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00b12',
      size: '2.31 MB',
    },
    {
      version: 'v1.0',
      timestamp: '2026-09-13 09:00 IST',
      actor: 'Officer Davis',
      role: 'Duty Officer',
      summary: 'Initial draft upload from field scanner.',
      sha256: '7d60a081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00c34',
      size: '1.98 MB',
    },
  ],
};
