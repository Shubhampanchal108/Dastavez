'use client';

import { useEffect, useState } from 'react';
import {
  INITIAL_DOCUMENTS,
  DmsDocument,
  AuditLogRecord,
  INITIAL_AUDIT_LOGS,
  ShareRecord,
  INITIAL_SHARES,
  CustodyEvent,
  INITIAL_CUSTODY_EVENTS,
  OfficerPreset,
  OFFICER_PRESETS,
} from './mockData';
import { DmsApi } from './api';

export interface NewDocumentPayload {
  id?: string;
  case_id: string;
  original_filename: string;
  document_type: string;
  department: string;
  sensitivity: 'INTERNAL' | 'RESTRICTED' | 'HIGH' | 'TOP_SECRET';
  mime_type?: string;
  file_size?: number;
  sha256_hash: string;
  description?: string;
  uploader?: string;
  uploader_role?: string;
  ai_confidence?: number;
  validation_status?: string;
  ocr_text?: string;
}

// In-memory state persistent across route navigation
let documentsState: DmsDocument[] = [...INITIAL_DOCUMENTS];
let auditLogsState: AuditLogRecord[] = [...INITIAL_AUDIT_LOGS];
let sharesState: ShareRecord[] = [...INITIAL_SHARES];
let custodyState: CustodyEvent[] = [...INITIAL_CUSTODY_EVENTS];
let currentOfficerState: OfficerPreset = OFFICER_PRESETS[0];

let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('Listener error', e);
    }
  });
}

export const DocumentStore = {
  getDocuments(): DmsDocument[] {
    return [...documentsState];
  },

  getDocumentById(id: string): DmsDocument | undefined {
    return documentsState.find((d) => d.id === id);
  },

  addDocument(payload: NewDocumentPayload): DmsDocument {
    const docId = `doc-${Date.now().toString().slice(-4)}`;
    const randomBlock = 4921900 + Math.floor(Math.random() * 100);
    const randomTx = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    const newDoc: DmsDocument = {
      id: payload.id || docId,
      case_id: payload.case_id,
      original_filename: payload.original_filename,
      document_type: payload.document_type || 'General Document',
      department: payload.department || currentOfficerState.department,
      sensitivity: payload.sensitivity || 'HIGH',
      mime_type: payload.mime_type || 'application/pdf',
      file_size: payload.file_size || 1540000,
      sha256_hash: payload.sha256_hash,
      status: 'VERIFIED',
      created_at: new Date().toISOString(),
      uploader: payload.uploader || currentOfficerState.name,
      uploader_role: payload.uploader_role || currentOfficerState.role,
      version: 'v1.0',
      blockchain_tx: randomTx,
      block_number: randomBlock,
      summary: payload.description || 'Verified and cryptographically anchored in evidence ledger.',
      ai_confidence: payload.ai_confidence || 0.982,
      validation_status: payload.validation_status || 'COMPLETE',
      ocr_text: payload.ocr_text || `AUTOMATED OCR EXTRACTION PREVIEW\nINGESTED FILE: ${payload.original_filename}\nSHA-256 CHECKSUM: ${payload.sha256_hash}\nDEPARTMENT: ${payload.department}`,
    };

    // Prepend to top of list
    documentsState = [newDoc, ...documentsState];

    // Add Audit Log
    const newAudit: AuditLogRecord = {
      id: `audit-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      actor: `${newDoc.uploader} (${currentOfficerState.badgeId})`,
      actor_role: currentOfficerState.role,
      action: 'DOCUMENT_INGESTED',
      action_category: 'UPLOAD',
      reference: `${newDoc.case_id} / ${newDoc.id}`,
      ip_address: '127.0.0.1 (Desktop)',
      status: 'SUCCESS',
      details: `Ingested ${newDoc.original_filename}. SHA-256: ${newDoc.sha256_hash.slice(0, 16)}... anchored to EVM Block #${newDoc.block_number}`,
    };
    auditLogsState = [newAudit, ...auditLogsState];

    // Add Custody Event
    const newCustody: CustodyEvent = {
      id: `cust-${Date.now().toString().slice(-4)}`,
      docId: newDoc.id,
      timestamp: new Date().toLocaleString(),
      action: 'Initial Ingestion & Seal',
      fromOfficer: newDoc.uploader,
      toOfficer: 'Institutional Vault',
      badgeFrom: currentOfficerState.badgeId,
      badgeTo: 'VAULT-01',
      purpose: 'Initial evidentiary intake and cryptographic sealing.',
      status: 'VERIFIED',
    };
    custodyState = [newCustody, ...custodyState];

    notifyListeners();
    return newDoc;
  },

  updateDocument(id: string, updates: Partial<DmsDocument>): DmsDocument | null {
    const idx = documentsState.findIndex((d) => d.id === id);
    if (idx === -1) return null;

    documentsState[idx] = {
      ...documentsState[idx],
      ...updates,
    };
    documentsState = [...documentsState];
    notifyListeners();
    return documentsState[idx];
  },

  deleteDocument(id: string): boolean {
    const prevLen = documentsState.length;
    documentsState = documentsState.filter((d) => d.id !== id);
    if (documentsState.length !== prevLen) {
      notifyListeners();
      return true;
    }
    return false;
  },

  getAuditLogs(): AuditLogRecord[] {
    return [...auditLogsState];
  },

  addAuditLog(record: Omit<AuditLogRecord, 'id' | 'timestamp'>) {
    const newLog: AuditLogRecord = {
      id: `audit-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      ...record,
    };
    auditLogsState = [newLog, ...auditLogsState];
    notifyListeners();
    return newLog;
  },

  getShares(): ShareRecord[] {
    return [...sharesState];
  },

  createShare(payload: {
    docId: string;
    docName: string;
    caseId: string;
    recipientEmail: string;
    recipientName: string;
    permission: 'VIEW_ONLY' | 'DOWNLOAD' | 'AUDIT';
    durationHours: number;
  }): ShareRecord {
    const expires = new Date(Date.now() + payload.durationHours * 3600 * 1000).toISOString();
    const newShare: ShareRecord = {
      id: `share-${Date.now().toString().slice(-4)}`,
      document_id: payload.docId,
      document_name: payload.docName,
      case_id: payload.caseId,
      recipient_email: payload.recipientEmail,
      recipient_name: payload.recipientName,
      permission: payload.permission,
      created_at: new Date().toISOString(),
      expires_at: expires,
      status: 'ACTIVE',
      shared_by: currentOfficerState.name,
      access_count: 0,
    };
    sharesState = [newShare, ...sharesState];

    this.addAuditLog({
      actor: currentOfficerState.name,
      actor_role: currentOfficerState.role,
      action: 'SHARE_CREATED',
      action_category: 'SHARE',
      reference: newShare.id,
      ip_address: '127.0.0.1 (Desktop)',
      status: 'SUCCESS',
      details: `Generated ${payload.permission} access link for ${payload.recipientEmail} expiring in ${payload.durationHours}h.`,
    });

    notifyListeners();
    return newShare;
  },

  revokeShare(shareId: string): boolean {
    const idx = sharesState.findIndex((s) => s.id === shareId);
    if (idx !== -1) {
      sharesState[idx].status = 'REVOKED';
      sharesState = [...sharesState];

      this.addAuditLog({
        actor: currentOfficerState.name,
        actor_role: currentOfficerState.role,
        action: 'SHARE_REVOKED',
        action_category: 'SHARE',
        reference: shareId,
        ip_address: '127.0.0.1 (Desktop)',
        status: 'WARNING',
        details: `Access link ${shareId} manually revoked by officer.`,
      });

      notifyListeners();
      return true;
    }
    return false;
  },

  getCustodyEvents(docId?: string): CustodyEvent[] {
    if (docId) {
      return custodyState.filter((c) => c.docId === docId);
    }
    return [...custodyState];
  },

  addCustodyEvent(event: Omit<CustodyEvent, 'id' | 'timestamp'>) {
    const newEvent: CustodyEvent = {
      id: `cust-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString(),
      ...event,
    };
    custodyState = [newEvent, ...custodyState];

    this.addAuditLog({
      actor: currentOfficerState.name,
      actor_role: currentOfficerState.role,
      action: 'CUSTODY_TRANSFER',
      action_category: 'VERIFY',
      reference: event.docId,
      ip_address: '127.0.0.1 (Desktop)',
      status: 'SUCCESS',
      details: `Custody transferred to ${event.toOfficer} (${event.badgeTo}). Reason: ${event.purpose}`,
    });

    notifyListeners();
    return newEvent;
  },

  getCurrentOfficer(): OfficerPreset {
    return currentOfficerState;
  },

  setCurrentOfficer(officer: OfficerPreset) {
    currentOfficerState = officer;
    notifyListeners();
  },

  async syncWithBackend() {
    try {
      const res = await DmsApi.listDocuments(20, 0);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const liveDocs = res.data.map((item: any) => ({
          id: item.id || `doc-${Math.random()}`,
          case_id: item.case_id || 'LIVE-CASE',
          original_filename: item.original_filename || item.filename || 'Backend Document',
          document_type: item.document_type || 'General',
          department: item.department || 'Investigation',
          sensitivity: item.sensitivity || 'HIGH',
          mime_type: item.mime_type || 'application/pdf',
          file_size: item.file_size || 1024000,
          sha256_hash: item.sha256_hash || 'backend-hash',
          status: (item.status || 'VERIFIED').toUpperCase(),
          created_at: item.created_at || new Date().toISOString(),
          uploader: item.uploader_name || 'System',
          uploader_role: item.uploader_role || 'Investigator',
          version: item.version || 'v1.0',
          summary: item.summary || item.description,
        }));

        // Merge without losing any local mock items
        const existingIds = new Set(liveDocs.map((d: any) => d.id));
        const filteredMock = documentsState.filter((d) => !existingIds.has(d.id));
        documentsState = [...liveDocs, ...filteredMock];
        notifyListeners();
      }
    } catch (e) {
      console.warn('Backend sync failed, using local fallback state', e);
    }
  },
};

// React Hooks
export function useDocuments() {
  const [docs, setDocs] = useState<DmsDocument[]>(() => DocumentStore.getDocuments());

  useEffect(() => {
    const handleUpdate = () => setDocs(DocumentStore.getDocuments());
    listeners.push(handleUpdate);
    return () => {
      listeners = listeners.filter((l) => l !== handleUpdate);
    };
  }, []);

  return docs;
}

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLogRecord[]>(() => DocumentStore.getAuditLogs());

  useEffect(() => {
    const handleUpdate = () => setLogs(DocumentStore.getAuditLogs());
    listeners.push(handleUpdate);
    return () => {
      listeners = listeners.filter((l) => l !== handleUpdate);
    };
  }, []);

  return logs;
}

export function useShares() {
  const [shares, setShares] = useState<ShareRecord[]>(() => DocumentStore.getShares());

  useEffect(() => {
    const handleUpdate = () => setShares(DocumentStore.getShares());
    listeners.push(handleUpdate);
    return () => {
      listeners = listeners.filter((l) => l !== handleUpdate);
    };
  }, []);

  return shares;
}

export function useCurrentOfficer() {
  const [officer, setOfficer] = useState<OfficerPreset>(() => DocumentStore.getCurrentOfficer());

  useEffect(() => {
    const handleUpdate = () => setOfficer(DocumentStore.getCurrentOfficer());
    listeners.push(handleUpdate);
    return () => {
      listeners = listeners.filter((l) => l !== handleUpdate);
    };
  }, []);

  return officer;
}
