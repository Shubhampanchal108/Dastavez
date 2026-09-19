'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Copy,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  FileText,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useDocuments } from '@/lib/store';

function DuplicatesContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  const documents = useDocuments();

  const [selectedDocId, setSelectedDocId] = useState<string>(initialId || documents[0]?.id || 'doc-101');
  const [isScanning, setIsScanning] = useState(false);

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  // Look for other documents with identical hash
  const duplicateMatches = documents.filter(
    (d) => d.id !== activeDoc.id && d.sha256_hash === activeDoc.sha256_hash
  );

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Copy className="w-5 h-5 text-amber-600" />
          <h1 className="text-xl font-bold text-slate-900">Exact Duplicate Detection Engine</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Detect exact duplicate records and fraudulent multi-case filings via strict SHA-256 collision auditing.
        </p>
      </div>

      {/* Select Document Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="text-xs font-semibold text-slate-700 shrink-0">Select Document:</label>
        <select
          value={selectedDocId}
          onChange={(e) => setSelectedDocId(e.target.value)}
          className="flex-1 max-w-md px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-amber-500"
        >
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.original_filename} ({d.case_id})
            </option>
          ))}
        </select>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning Ledger...' : 'Scan Repository for Collisions'}</span>
        </button>
      </div>

      {/* Duplicate Audit Status */}
      {duplicateMatches.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Unique Evidentiary Fingerprint</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Zero exact SHA-256 duplicates detected across the entire legal repository for{' '}
            <strong className="text-slate-800">{activeDoc.original_filename}</strong>.
          </p>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 font-mono text-xs text-slate-700 max-w-lg mx-auto break-all">
            {activeDoc.sha256_hash}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Found {duplicateMatches.length} document(s) with an exact 100% SHA-256 collision!</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {duplicateMatches.map((match) => (
              <div key={match.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{match.original_filename}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    EXACT COLLISION
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>Case ID: <span className="font-mono font-bold text-blue-700">{match.case_id}</span></p>
                  <p>Uploaded by: {match.uploader} ({match.uploader_role})</p>
                  <p>Date: {new Date(match.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DuplicatesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Checking for duplicate hashes...</div>}>
      <DuplicatesContent />
    </Suspense>
  );
}

