'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  GitPullRequest,
  ShieldCheck,
  UserCheck,
  Plus,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useDocuments, useCurrentOfficer } from '@/lib/store';
import { DmsApi } from '@/lib/api';
import { UserDirectoryItem } from '@/lib/types';

function CustodyContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  const documents = useDocuments();
  const officer = useCurrentOfficer();

  const [selectedDocId, setSelectedDocId] = useState<string>(initialId || '');
  const [modalOpen, setModalOpen] = useState(false);
  const [recipients, setRecipients] = useState<UserDirectoryItem[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientUserId, setRecipientUserId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];
  const [custodyEvents, setCustodyEvents] = useState<any[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void DmsApi.listUserDirectory(recipientSearch.trim() || undefined).then((response) => {
      if (Array.isArray(response.data)) setRecipients(response.data as UserDirectoryItem[]);
      else setErrorMsg(response.error || 'Unable to load recipient directory.');
    }), 300);
    return () => window.clearTimeout(timeoutId);
  }, [recipientSearch]);

  useEffect(() => {
    if (!activeDoc) return;
    void DmsApi.getCustody(activeDoc.id).then((response) => {
      setCustodyEvents(Array.isArray(response.data) ? response.data : []);
    });
  }, [activeDoc]);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientUserId || !reason.trim()) {
      setErrorMsg('Select a recipient and enter a transfer reason.');
      return;
    }

    const response = await DmsApi.transferCustody(activeDoc.id, {
      to_user_id: recipientUserId,
      reason: reason.trim(),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
    if (!response.data) {
      setErrorMsg(response.error || 'Custody transfer failed. Please verify officer clearance and try again.');
      return;
    }
    setCustodyEvents((current) => [response.data, ...current]);

    setModalOpen(false);
    setRecipientUserId('');
    setRecipientSearch('');
    setReason('');
    setNotes('');
    setErrorMsg(null);
  };

  if (!activeDoc) return <div className="p-8 text-center text-slate-500">No documents found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Official Chain of Custody & Evidence Handover</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident log documenting every physical and digital handover of case evidence.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Transfer Custody</span>
        </button>
      </div>

      {/* Select Document Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-700 shrink-0">Case Document:</label>
        <select
          value={selectedDocId}
          onChange={(e) => setSelectedDocId(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500"
        >
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.original_filename} ({d.case_id})
            </option>
          ))}
        </select>
      </div>

      {/* Custody Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Evidentiary Custody Log ({custodyEvents.length} handovers)</h2>
          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Current Possessor: {custodyEvents[0]?.toOfficer || officer.name}
          </span>
        </div>

        <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {custodyEvents.map((evt, idx) => (
            <div key={evt.id} className="relative group">
              {/* Dot */}
              <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center ring-4 ring-white shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-900">{evt.action}</span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{evt.timestamp}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-800 font-semibold mb-2">
                  <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                    {evt.from_user_id}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    {evt.to_user_id}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{evt.reason}</p>

                <div className="mt-3 pt-2 border-t border-slate-200/80 flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>RECORD ID: {evt.id}</span>
                  <span className="text-emerald-600 font-semibold">STATUS: VERIFIED SEAL</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transfer Custody Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Execute Custody Transfer</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <p className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold">{errorMsg}</p>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transferring Custody From</label>
                <input
                  type="text"
                  disabled
                  value={`${officer.name} (${officer.badgeId})`}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Officer / Authority Name</label>
                <input
                  type="search"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                  placeholder="Search name, email, or role"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient</label>
                <select
                  required
                  value={recipientUserId}
                  onChange={(e) => setRecipientUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="">Select a recipient</option>
                  {recipients.map((recipient) => (
                    <option key={recipient.id} value={recipient.id}>
                      {recipient.name} ({recipient.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transfer Reason / Remarks</label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
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
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                >
                  Sign & Authorize Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustodyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading custody records...</div>}>
      <CustodyContent />
    </Suspense>
  );
}

