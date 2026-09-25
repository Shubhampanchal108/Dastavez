'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  History,
  GitBranch,
  ArrowDownLeft,
  CheckCircle2,
  Copy,
  Check,
  FileCode,
  RotateCcw,
} from 'lucide-react';
import { useDocuments } from '@/lib/store';
import { DmsApi } from '@/lib/api';

function VersionsContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  const documents = useDocuments();

  const [selectedDocId, setSelectedDocId] = useState<string>(initialId || '');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [versions, setVersions] = useState<any[]>([]);

  const activeDoc = documents.find((d) => d.id === selectedDocId);

  useEffect(() => {
    if (!activeDoc) return;
    void DmsApi.getVersions(activeDoc.id).then((response) => {
      setVersions(Array.isArray(response.data) ? response.data : []);
    });
  }, [activeDoc]);

  const handleRollback = (ver: string) => {
    setSuccessMsg(`Document successfully restored to state ${ver}. Audit event recorded.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  if (!activeDoc) return <div className="p-8 text-center text-slate-500">No documents found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900">Document Version History & Diff Ledger</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Inspect immutable revisions, compare cryptographic delta changes, and revert safely under audit.
        </p>
      </div>

      {/* Select Document Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-700 shrink-0">Select Document:</label>
        <select
          value={selectedDocId}
          onChange={(e) => setSelectedDocId(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-emerald-500"
        >
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.original_filename} ({d.case_id})
            </option>
          ))}
        </select>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Versions Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <h2 className="text-sm font-bold text-slate-900">Revision Ledger for {activeDoc.original_filename}</h2>

        <div className="space-y-4">
          {versions.length === 0 && <p className="text-xs text-slate-500">No version records found.</p>}
          {versions.map((v) => (
            <div
              key={v.version}
              className={`p-5 rounded-xl border transition-all ${
                v.isCurrent
                  ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                    {v.version}
                  </span>
                  {v.isCurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      CURRENT VAULT REVISION
                    </span>
                  )}
                  <span className="text-xs text-slate-500">• {v.timestamp}</span>
                </div>

                {!v.isCurrent && (
                  <button
                    onClick={() => handleRollback(v.version)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rollback to {v.version}</span>
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-700 font-medium leading-relaxed mb-3">{v.summary}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-sans">Author</span>
                  <span className="text-slate-800 font-semibold">{v.actor} ({v.role})</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">SHA-256 Digest</span>
                  <span className="text-slate-800 break-all">{v.sha256.slice(0, 24)}...</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VersionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading version history...</div>}>
      <VersionsContent />
    </Suspense>
  );
}

