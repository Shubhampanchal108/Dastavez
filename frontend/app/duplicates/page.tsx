'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Copy,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  FileText,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useDocuments } from '@/lib/store';
import { DmsApi } from '@/lib/api';

function DuplicatesContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  const documents = useDocuments();

  const [selectedDocId, setSelectedDocId] = useState<string>(initialId || '');
  const [isScanning, setIsScanning] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const fetchDuplicates = async (docIdToScan: string) => {
    if (!docIdToScan) return;
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const res = await DmsApi.getDuplicates(docIdToScan);
      if (res.data) {
        setDuplicateResult(res.data);
      } else {
        setErrorMsg(res.error || 'Duplicate scan failed.');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error communicating with backend.');
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (activeDoc?.id) {
      void fetchDuplicates(activeDoc.id);
    }
  }, [activeDoc?.id]);

  if (!activeDoc) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
        <Copy className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-xs text-slate-500">No documents found in repository to check for duplicates.</p>
        <Link href="/upload" className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline">
          Upload a Document
        </Link>
      </div>
    );
  }

  const duplicatesList = duplicateResult?.duplicates || [];
  const duplicateCount = duplicateResult?.duplicate_count || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Copy className="w-5 h-5 text-amber-600" />
          <h1 className="text-xl font-bold text-slate-900">Exact Duplicate Detection Engine</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Detect exact duplicate records and fraudulent multi-case filings via strict SHA-256 collision auditing against PostgreSQL.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Select Document Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="text-xs font-semibold text-slate-700 shrink-0">Select Document:</label>
        <select
          value={selectedDocId}
          onChange={(e) => {
            setSelectedDocId(e.target.value);
            void fetchDuplicates(e.target.value);
          }}
          className="flex-1 max-w-md px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-amber-500"
        >
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.original_filename} ({d.case_id})
            </option>
          ))}
        </select>
        <button
          onClick={() => void fetchDuplicates(activeDoc.id)}
          disabled={isScanning}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning PostgreSQL...' : 'Re-Scan Repository for Collisions'}</span>
        </button>
      </div>

      {/* Duplicate Audit Status */}
      {duplicateCount === 0 ? (
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
            {duplicateResult?.sha256_hash || activeDoc.sha256_hash}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Found {duplicateCount} document(s) with an exact 100% SHA-256 collision in the database!</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {duplicatesList.map((match: any) => (
              <div key={match.document_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-900">{match.original_filename}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                    COLLISION MATCH
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-600 border-t border-slate-100 pt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Case:</span>
                    <span className="font-mono text-blue-700 font-semibold">{match.case_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Document Type:</span>
                    <span>{match.document_type || 'Unclassified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ingested At:</span>
                    <span>{match.created_at ? new Date(match.created_at).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/documents/${match.document_id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                  >
                    <span>Inspect Collision Record</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading duplicates module...</div>}>
      <DuplicatesContent />
    </Suspense>
  );
}
