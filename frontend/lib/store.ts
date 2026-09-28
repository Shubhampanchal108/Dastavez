'use client';

import { useEffect, useState } from 'react';
import { DmsDocument, AuditLogRecord, CustodyEvent, OfficerPreset } from './types';
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
let documentsState: DmsDocument[] = [];
let auditLogsState: AuditLogRecord[] = [];
let documentsLoading = true;
let documentsError: string | null = null;
let auditLogsLoading = true;
let auditLogsError: string | null = null;
let custodyState: CustodyEvent[] = [];
let currentOfficerState: OfficerPreset = {
  name: 'User',
  role: 'Unavailable',
  avatarInitials: 'U',
};

let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export const DocumentStore = {
  getDocuments(): DmsDocument[] {
    return [...documentsState];
  },

  getDocumentById(id: string): DmsDocument | undefined {
    return documentsState.find((document) => document.id === id);
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
    documentsLoading = true;
    documentsError = null;
    notifyListeners();
    try {
      const res = await DmsApi.listDocuments(100, 0);
      if (res.data && Array.isArray(res.data)) {
        const liveDocs = res.data.map((item: any) => ({
          id: item.id,
          case_id: item.case_id,
          original_filename: item.original_filename,
          document_type: item.document_type || 'Unclassified',
          department: item.department || 'Unassigned',
          sensitivity: item.sensitivity || 'INTERNAL',
          mime_type: item.mime_type || 'application/octet-stream',
          file_size: item.file_size || 0,
          sha256_hash: item.sha256_hash || '',
          status: (item.status || 'PENDING').toUpperCase(),
          created_at: item.created_at,
          uploader: item.uploaded_by || '',
          uploader_role: 'Officer',
          version: 'v1.0',
          summary: item.description || '',
          ai_confidence: item.ai_confidence,
          validation_status: item.validation_status,
        }));
        documentsState = liveDocs;
        documentsError = null;
        notifyListeners();
      } else {
        documentsState = [];
        documentsError = res.error || 'Unable to load documents. Please sign in or check backend.';
        notifyListeners();
      }
    } catch (e: any) {
      console.warn('Backend sync failed', e);
      documentsState = [];
      documentsError = e?.message || 'Unable to reach backend server.';
      notifyListeners();
    } finally {
      documentsLoading = false;
      notifyListeners();
    }
  },
};

// React Hooks
export function useDocuments() {
  const [docs, setDocs] = useState<DmsDocument[]>(() => DocumentStore.getDocuments());

  useEffect(() => {
    void DocumentStore.syncWithBackend();
    const handleUpdate = () => setDocs(DocumentStore.getDocuments());
    listeners.push(handleUpdate);
    return () => {
      listeners = listeners.filter((l) => l !== handleUpdate);
    };
  }, []);

  return docs;
}

export function useDocumentsStatus() {
  const [status, setStatus] = useState({ loading: documentsLoading, error: documentsError });

  useEffect(() => {
    const handleUpdate = () => setStatus({ loading: documentsLoading, error: documentsError });
    listeners.push(handleUpdate);
    return () => {
      listeners = listeners.filter((listener) => listener !== handleUpdate);
    };
  }, []);

  return status;
}

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);

  useEffect(() => {
    auditLogsLoading = true;
    auditLogsError = null;
    void DmsApi.listAuditLogs(0, 100).then((res) => {
      if (Array.isArray(res.data)) {
        auditLogsState = res.data.map((item: any) => ({
          id: item.id,
          timestamp: item.timestamp,
          actor: item.user_id || 'System',
          actor_role: 'Backend',
          action: item.action,
          action_category: 'ADMIN',
          reference: item.resource_id || item.resource_type || '',
          ip_address: '',
          status: item.result === 'SUCCESS' ? 'SUCCESS' : 'WARNING',
          details: item.details || '',
        }));
        notifyListeners();
      } else {
        auditLogsState = [];
        auditLogsError = res.error || 'Unable to load audit activity.';
        notifyListeners();
      }
      auditLogsLoading = false;
      notifyListeners();
    });
    const handleUpdate = () => setLogs(DocumentStore.getAuditLogs());
    listeners.push(handleUpdate);
    return () => {
      listeners = listeners.filter((l) => l !== handleUpdate);
    };
  }, []);

  return logs;
}

export function useAuditLogsStatus() {
  const [status, setStatus] = useState({ loading: auditLogsLoading, error: auditLogsError });

  useEffect(() => {
    const handleUpdate = () => setStatus({ loading: auditLogsLoading, error: auditLogsError });
    listeners.push(handleUpdate);
    return () => {
      listeners = listeners.filter((listener) => listener !== handleUpdate);
    };
  }, []);

  return status;
}

export function useCurrentOfficer() {
  const [officer, setOfficer] = useState<OfficerPreset>(() => DocumentStore.getCurrentOfficer());

  useEffect(() => {
    void DmsApi.getMe().then((response) => {
      if (response.data?.username && response.data?.role) {
        const username = String(response.data.username);
        DocumentStore.setCurrentOfficer({
          name: username,
          role: String(response.data.role),
          avatarInitials: username.slice(0, 2).toUpperCase(),
        });
      } else {
        DocumentStore.setCurrentOfficer({ name: 'User', role: 'Unavailable', avatarInitials: 'U' });
      }
    });
    const handleUpdate = () => setOfficer(DocumentStore.getCurrentOfficer());
    listeners.push(handleUpdate);
    return () => {
      listeners = listeners.filter((l) => l !== handleUpdate);
    };
  }, []);

  return officer;
}
