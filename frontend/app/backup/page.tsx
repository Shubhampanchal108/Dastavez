'use client';

import React, { useState } from 'react';
import {
  DatabaseBackup,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import { DmsApi } from '@/lib/api';

export default function BackupPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [backupResult, setBackupResult] = useState<any>(null);
  const [restoreResult, setRestoreResult] = useState<any>(null);

  const handleCreateSnapshot = async () => {
    setIsCreating(true);
    setBannerMsg(null);
    setErrorMsg(null);

    try {
      const response = await DmsApi.createBackup();
      if (response.data) {
        setBackupResult(response.data);
        setBannerMsg(`Backup ${response.data.backup_filename} completed and integrity was verified.`);
      } else {
        setErrorMsg(response.error || 'Backup creation failed.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleRunRestoreTest = async () => {
    if (!restoreFile) {
      setErrorMsg('Select a backup ZIP before running restore verification.');
      return;
    }
    setIsTesting(true);
    setBannerMsg(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('backup', restoreFile);
    const response = await DmsApi.restoreTest(formData);
    if (response.data) {
      setRestoreResult(response.data);
      setBannerMsg(`Restore verification ${response.data.status.toLowerCase()}.`);
    } else {
      setErrorMsg(response.error || 'Restore verification failed.');
    }
    setIsTesting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DatabaseBackup className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Disaster Recovery & Backup Verifier</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated snapshot generation and non-destructive sandbox restore test verification.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCreateSnapshot}
            disabled={isCreating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{isCreating ? 'Creating Snapshot...' : 'Create Snapshot'}</span>
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{bannerMsg}</span>
        </div>
      )}
      {errorMsg && <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">{errorMsg}</div>}

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Isolated Restore Verification</h2>
          <p className="text-xs text-slate-500 mt-1">Uploads a backup ZIP for temporary-database verification only. The production database is not restored.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input type="file" accept=".zip,application/zip" onChange={(event) => setRestoreFile(event.target.files?.[0] || null)} className="text-xs" />
          <button onClick={() => void handleRunRestoreTest()} disabled={isTesting} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold">
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing Sandbox...' : 'Run Restore Test'}</span>
          </button>
        </div>
        {restoreResult && <p className="text-xs text-slate-600">Status: <strong>{restoreResult.status}</strong> · Backup valid: {String(restoreResult.backup_valid)} · Database restored in isolated test database: {String(restoreResult.database_restored)} · Cloudinary modified: {String(restoreResult.cloudinary_modified)}</p>}
      </div>

      {/* Snapshot List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Backup Results</h2>
          <span className="text-xs text-slate-500">No backup listing endpoint available</span>
        </div>

        <div className="divide-y divide-slate-100">
          {backupResult ? <div className="p-5 text-xs text-slate-600">Created <strong>{backupResult.backup_filename}</strong> at {new Date(backupResult.created_at).toLocaleString()}. Documents: {backupResult.documents_backed_up}; versions: {backupResult.versions_backed_up}; integrity verified: {String(backupResult.integrity_verified)}.</div> : <p className="p-6 text-center text-xs text-slate-500">No backup result available in this session.</p>}
        </div>
      </div>
    </div>
  );
}
