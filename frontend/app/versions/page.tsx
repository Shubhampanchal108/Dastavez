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
  Plus,
  UploadCloud,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useDocuments } from '@/lib/store';
import { DmsApi } from '@/lib/api';

function VersionsContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  const documents = useDocuments();

  const [selectedDocId, setSelectedDocId] = useState<string>(initialId || '');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New version modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);

  useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const loadVersions = async (docId: string) => {
    if (!docId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await DmsApi.getVersions(docId);
      if (Array.isArray(response.data)) {
        setVersions(response.data);
      } else {
        setVersions([]);
        setErrorMsg(response.error || 'Failed to load versions from database.');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error communicating with backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeDoc?.id) {
      void loadVersions(activeDoc.id);
    }
  }, [activeDoc?.id]);

  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionFile || !activeDoc?.id) {
      setErrorMsg('Please select a file to upload as the new version.');
      return;
    }

    setIsUploadingVersion(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', newVersionFile);
    if (changeReason.trim()) {
      formData.append('change_reason', changeReason.trim());
    }

    try {
      const res = await DmsApi.uploadVersion(activeDoc.id, formData);
      if (res.data) {
        setSuccessMsg(`Version v${res.data.version_number} uploaded and cryptographically hashed!`);
        setShowUploadModal(false);
        setNewVersionFile(null);
        setChangeReason('');
        await loadVersions(activeDoc.id);
      } else {
        setErrorMsg(res.error || 'Failed to upload new version.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error uploading version.');
    } finally {
      setIsUploadingVersion(false);
    }
  };

  if (!activeDoc) {
    return <div className="p-8 text-center text-slate-500 text-xs">No documents found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900">Document Version History & Revision Log</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review official case revisions, track document updates, and save new versions in the evidence vault.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New Revision</span>
        </button>
      </div>

      {/* Select Document Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-700 shrink-0">Select Document:</label>
        <select
          value={selectedDocId}
          onChange={(e) => {
            setSelectedDocId(e.target.value);
            void loadVersions(e.target.value);
          }}
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
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Versions Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">
            Revision Ledger for {activeDoc.original_filename}
          </h2>
          <button
            onClick={() => void loadVersions(activeDoc.id)}
            disabled={isLoading}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="space-y-4">
          {isLoading && <p className="text-xs text-slate-500 text-center py-4">Querying database versions...</p>}
          {!isLoading && versions.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No version records found in database.</p>
          )}
          {versions.map((v) => (
            <div
              key={v.id || v.version_number}
              className={`p-5 rounded-xl border transition-all ${
                v.is_latest
                  ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                    v{v.version_number}.0
                  </span>
                  {v.is_latest && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ACTIVE OFFICIAL RECORD
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-900">{v.original_filename}</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {v.created_at ? new Date(v.created_at).toLocaleString() : 'N/A'}
                </span>
              </div>

              {v.change_reason && (
                <p className="text-xs text-slate-600 mb-3 bg-white p-2.5 rounded-lg border border-slate-100">
                  <strong>Reason for Modification:</strong> {v.change_reason}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-mono">
                <div>
                  <span className="text-slate-400">Seal ID: </span>
                  <span className="text-slate-700">{v.sha256_hash ? `${v.sha256_hash.slice(0, 16)}...` : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Size: </span>
                  <span className="text-slate-700">{v.file_size ? `${(v.file_size / 1024).toFixed(1)} KB` : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Status: </span>
                  <span className="font-bold text-emerald-600">{v.status || 'VERIFIED'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Revision Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUploadNewVersion}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-xs"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <UploadCloud className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Upload New Document Version</h3>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Document</label>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 font-semibold truncate">
                {activeDoc.original_filename}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Replacement File</label>
              <input
                type="file"
                required
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setNewVersionFile(e.target.files[0]);
                  }
                }}
                className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason for New Revision</label>
              <textarea
                rows={3}
                required
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g. Added supplemental forensic appendix, amended deposition signature, corrected typo..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploadingVersion}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
              >
                {isUploadingVersion ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Save New Revision</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function VersionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading revision history...</div>}>
      <VersionsContent />
    </Suspense>
  );
}
