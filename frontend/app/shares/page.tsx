'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Share2, Plus, Copy, Check } from 'lucide-react';
import { DmsApi } from '@/lib/api';
import { useDocuments } from '@/lib/store';
import { ShareRecord, UserDirectoryItem } from '@/lib/types';
import { StatusBadge } from '@/components/status-badge';

function SharesContent() {
  const searchParams = useSearchParams();
  const documents = useDocuments();
  const initialId = searchParams.get('id') || '';
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [recipients, setRecipients] = useState<UserDirectoryItem[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(initialId);
  const [modalOpen, setModalOpen] = useState(Boolean(initialId));
  const [recipientUserId, setRecipientUserId] = useState('');
  const [permission, setPermission] = useState<'VIEW' | 'DOWNLOAD'>('VIEW');
  const [purpose, setPurpose] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void DmsApi.listUserDirectory(recipientSearch.trim() || undefined).then((response) => {
      if (Array.isArray(response.data)) setRecipients(response.data);
      else setError(response.error || 'Unable to load recipient directory.');
    }), 300);
    return () => window.clearTimeout(timeoutId);
  }, [recipientSearch]);

  useEffect(() => {
    if (!selectedDocId && documents[0]) setSelectedDocId(documents[0].id);
  }, [documents, selectedDocId]);

  useEffect(() => {
    if (!selectedDocId) return;
    setIsLoading(true);
    setError(null);
    void DmsApi.listShares(selectedDocId).then((response) => {
      if (Array.isArray(response.data)) setShares(response.data);
      else {
        setShares([]);
        setError(response.error || 'Unable to load shares.');
      }
      setIsLoading(false);
    });
  }, [selectedDocId]);

  const handleCreateShare = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDocId || !recipientUserId || !purpose || !expiresAt) return;
    setError(null);
    const response = await DmsApi.createShare(selectedDocId, {
      recipient_user_id: recipientUserId,
      permission,
      purpose,
      expires_at: new Date(expiresAt).toISOString(),
    });
    if (response.data) {
      setShares((current) => [...current, response.data as ShareRecord]);
      setModalOpen(false);
      setRecipientUserId('');
      setPurpose('');
    } else setError(response.error || 'Unable to create share.');
  };

  const handleRevokeShare = async (shareId: string) => {
    const response = await DmsApi.revokeShare(shareId);
    if (response.data) {
      setShares((current) => current.map((share) => share.share_id === shareId ? response.data as ShareRecord : share));
    } else setError(response.error || 'Unable to revoke share.');
  };

  const handleCopyShareId = (shareId: string) => {
    void navigator.clipboard.writeText(shareId);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2"><Share2 className="w-5 h-5 text-purple-600" /><h1 className="text-xl font-bold text-slate-900">Secure Document Shares</h1></div>
          <p className="text-xs text-slate-500 mt-1">Manage backend-authorized, time-limited document access.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"><Plus className="w-4 h-4" />Create Secure Share</button>
      </div>
      {error && <p className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</p>}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? <p className="p-8 text-center text-xs text-slate-500">Loading shares...</p> : shares.length === 0 ? <p className="p-8 text-center text-xs text-slate-500">No shares found.</p> : (
          <table className="w-full text-left border-collapse text-xs"><thead><tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase"><th className="py-3 px-4">Document</th><th className="py-3 px-4">Recipient</th><th className="py-3 px-4">Permission</th><th className="py-3 px-4">Expires</th><th className="py-3 px-4">Status</th><th className="py-3 px-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{shares.map((share) => { const document = documents.find((item) => item.id === share.document_id); return <tr key={share.share_id}><td className="py-3.5 px-4"><p className="font-bold text-slate-900">{document?.original_filename || share.document_id}</p><p className="font-mono text-[10px] text-slate-500">{share.share_id}</p></td><td className="py-3.5 px-4 font-mono text-[11px]">{share.recipient_user_id}</td><td className="py-3.5 px-4">{share.permission}</td><td className="py-3.5 px-4">{new Date(share.expires_at).toLocaleString()}</td><td className="py-3.5 px-4"><StatusBadge status={share.status} size="sm" /></td><td className="py-3.5 px-4 text-right"><button onClick={() => handleCopyShareId(share.share_id)} className="p-1.5 mr-2 border rounded-lg" title="Copy share ID">{copiedId === share.share_id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}</button>{share.status === 'ACTIVE' && <button onClick={() => void handleRevokeShare(share.share_id)} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">Revoke</button>}</td></tr>; })}</tbody></table>
        )}
      </div>
      {modalOpen && <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"><form onSubmit={handleCreateShare} className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-xs"><h3 className="text-sm font-bold text-slate-900">Create Secure Share</h3><label className="block font-semibold">Target Document<select required value={selectedDocId} onChange={(event) => setSelectedDocId(event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg">{documents.map((document) => <option key={document.id} value={document.id}>{document.original_filename}</option>)}</select></label><label className="block font-semibold">Find Recipient<input value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} placeholder="Search name, email, or role" className="mt-1 w-full px-3 py-2 border rounded-lg" /></label><label className="block font-semibold">Recipient<select required value={recipientUserId} onChange={(event) => setRecipientUserId(event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg"><option value="">Select a recipient</option>{recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name} ({recipient.email})</option>)}</select></label><label className="block font-semibold">Permission<select value={permission} onChange={(event) => setPermission(event.target.value as 'VIEW' | 'DOWNLOAD')} className="mt-1 w-full px-3 py-2 border rounded-lg"><option value="VIEW">View</option><option value="DOWNLOAD">Download</option></select></label><label className="block font-semibold">Purpose<input required value={purpose} onChange={(event) => setPurpose(event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg" /></label><label className="block font-semibold">Expires at<input required type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-purple-600 text-white">Create Share</button></div></form></div>}
    </div>
  );
}

export default function SharesPage() { return <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading secure shares...</div>}><SharesContent /></Suspense>; }
