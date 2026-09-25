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

export interface ShareRecord {
  share_id: string;
  document_id: string;
  sender_user_id: string;
  recipient_user_id: string;
  permission: 'VIEW' | 'DOWNLOAD';
  purpose: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface OfficerPreset {
  name: string;
  badgeId?: string;
  role: string;
  avatarInitials: string;
  department?: string;
}

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

export interface UserDirectoryItem {
  id: string;
  name: string;
  email: string;
  role: string;
}