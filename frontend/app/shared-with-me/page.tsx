'use client';

import React, { useEffect, useState } from 'react';
import { Inbox, Clock, FileText } from 'lucide-react';
import { DmsApi } from '@/lib/api';
import { useDocuments } from '@/lib/store';
import { ShareRecord } from '@/lib/types';
import { StatusBadge } from '@/components/status-badge';

export default function SharedWithMePage() {
  const documents = useDocuments();
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessingUserId, setAccessingUserId] = useState<string | null>(null);
  const [accessUrls, setAccessUrls] = useState<Record<string, string>>({});
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  useEffect(() => {
    void DmsApi.listReceivedShares().then((response) => {
      if (Array.isArray(response.data)) setShares(response.data);
      else setError(response.error || 'Unable to load received shares.');
      setIsLoading(false);
    });
  }, []);

  const handleAccess = async (shareId: string) => {
    const userResponse = await DmsApi.getMe();
    const userId = userResponse.data?.user_id;
    if (!userId) {
      setError(userResponse.error || 'Unable to identify the authenticated user.');
      return;
    }
    setAccessingUserId(shareId);
    const response = await DmsApi.accessShare(shareId, userId);
    if (response.data?.access_url) setAccessUrls((current) => ({ ...current, [shareId]: response.data.access_url }));
    else if (response.data) setAccessMessage('Share access authorized.');
    else if (response.error) setError(response.error);
    setAccessingUserId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2"><Inbox className="w-5 h-5 text-indigo-600" /><h1 className="text-xl font-bold text-slate-900">Shared With Me (Incoming Vault)</h1></div>
        <p className="text-xs text-slate-500 mt-1">Documents shared with the authenticated user.</p>
      </div>
      {error && <p className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</p>}
      {accessMessage && <p className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">{accessMessage}</p>}
      {isLoading ? <p className="p-8 text-center text-xs text-slate-500">Loading received shares...</p> : shares.length === 0 ? <p className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">No received shares found.</p> : <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{shares.map((share) => { const document = documents.find((item) => item.id === share.document_id); return <div key={share.share_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4"><div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2.5"><div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100"><FileText className="w-5 h-5" /></div><div><h3 className="text-sm font-bold text-slate-900">{document?.original_filename || share.document_id}</h3><p className="text-[11px] font-mono text-slate-500">{share.share_id}</p></div></div><StatusBadge status={share.status} size="sm" /></div><div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100"><p>Permission: <strong>{share.permission}</strong></p><p>Purpose: {share.purpose}</p><p className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Expires: {new Date(share.expires_at).toLocaleString()}</p></div>{share.status === 'ACTIVE' && <button onClick={() => void handleAccess(share.share_id)} disabled={accessingUserId === share.share_id} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold">{accessingUserId === share.share_id ? 'Opening...' : 'Access Share'}</button>}{accessUrls[share.share_id] && <a href={accessUrls[share.share_id]} target="_blank" rel="noreferrer" className="block text-xs text-blue-700 underline">Open backend access URL</a>}</div>; })}</div>}
    </div>
  );
}
