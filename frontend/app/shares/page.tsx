'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Share2,
  Plus,
  Clock,
  Mail,
  Shield,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { DocumentStore, useShares, useDocuments, useCurrentOfficer } from '@/lib/store';
import { StatusBadge } from '@/components/status-badge';

function SharesContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  const shares = useShares();
  const documents = useDocuments();
  const officer = useCurrentOfficer();

  const [modalOpen, setModalOpen] = useState(!!initialId);
  const [selectedDocId, setSelectedDocId] = useState(initialId || documents[0]?.id || 'doc-101');
  const [recipientEmail, setRecipientEmail] = useState('prosecutor.general@judiciary.internal');
  const [recipientName, setRecipientName] = useState('Adv. S. Raman');
  const [permission, setPermission] = useState<'VIEW_ONLY' | 'DOWNLOAD' | 'AUDIT'>('VIEW_ONLY');
  const [durationHours, setDurationHours] = useState(48);
  const [passwordProtect, setPasswordProtect] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const handleCreateShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    DocumentStore.createShare({
      docId: selectedDoc.id,
      docName: selectedDoc.original_filename,
      caseId: selectedDoc.case_id,
      recipientEmail,
      recipientName,
      permission,
      durationHours,
    });

    setModalOpen(false);
  };

  const handleRevokeShare = (id: string) => {
    DocumentStore.revokeShare(id);
  };

  const handleCopyShareLink = (id: string) => {
    const link = `https://dms.internal/secure-access/token/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-bold text-slate-900">Secure Document Shares</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Grant time-limited, cryptographically verified external access to counsel and judicial authorities.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Secure Share</span>
        </button>
      </div>

      {/* Shares Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Document / Case</th>
              <th className="py-3 px-4">Recipient</th>
              <th className="py-3 px-4">Permission</th>
              <th className="py-3 px-4">Expires</th>
              <th className="py-3 px-4">Access Count</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shares.map((share) => (
              <tr key={share.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-4">
                  <p className="font-bold text-slate-900">{share.document_name}</p>
                  <p className="text-[11px] font-mono text-blue-700">{share.case_id}</p>
                </td>

                <td className="py-3.5 px-4">
                  <p className="font-semibold text-slate-800">{share.recipient_name}</p>
                  <p className="text-[11px] text-slate-500">{share.recipient_email}</p>
                </td>

                <td className="py-3.5 px-4">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {share.permission}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-slate-600 font-medium">
                  {new Date(share.expires_at).toLocaleString()}
                </td>

                <td className="py-3.5 px-4 text-slate-700 font-semibold">
                  {share.access_count || 0} times
                </td>

                <td className="py-3.5 px-4">
                  <StatusBadge status={share.status} size="sm" />
                </td>

                <td className="py-3.5 px-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => handleCopyShareLink(share.id)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                      title="Copy Secure Link"
                    >
                      {copiedLink === share.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {share.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleRevokeShare(share.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Share Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Create Secure Share Link</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShare} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Document</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:border-purple-500"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.original_filename} ({d.case_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Name / Title</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Email</label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Permission Level</label>
                  <select
                    value={permission}
                    onChange={(e) => setPermission(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="VIEW_ONLY">View Only</option>
                    <option value="DOWNLOAD">Download</option>
                    <option value="AUDIT">Audit / Inspection</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Duration</label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value={12}>12 Hours</option>
                    <option value={24}>24 Hours</option>
                    <option value={48}>48 Hours</option>
                    <option value={168}>7 Days</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs"
                >
                  Generate Share Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SharesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading secure shares...</div>}>
      <SharesContent />
    </Suspense>
  );
}

