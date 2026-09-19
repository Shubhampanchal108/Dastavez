'use client';

import React from 'react';
import Link from 'next/link';
import { Inbox, Eye, Download, FileText, Clock, Shield } from 'lucide-react';
import { useShares, useDocuments } from '@/lib/store';
import { StatusBadge } from '@/components/status-badge';

export default function SharedWithMePage() {
  const shares = useShares();
  const documents = useDocuments();

  // Incoming shares simulation
  const incomingShares = shares.filter((s) => s.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-900">Shared With Me (Incoming Vault)</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Confidential judicial documents shared with your clearance credentials by other agencies.
        </p>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {incomingShares.map((share) => {
          const matchedDoc = documents.find((d) => d.id === share.document_id);

          return (
            <div
              key={share.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                        {share.document_name}
                      </h3>
                      <p className="text-[11px] font-mono text-blue-700">{share.case_id}</p>
                    </div>
                  </div>
                  <StatusBadge status={share.status} size="sm" />
                </div>

                <div className="space-y-1 text-xs text-slate-600 mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p>Shared by: <strong className="text-slate-800">{share.shared_by}</strong></p>
                  <p>Permission: <span className="font-mono font-bold text-indigo-700">{share.permission}</span></p>
                  <p className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Expires: {new Date(share.expires_at).toLocaleString()}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                {matchedDoc && (
                  <Link
                    href={`/documents/${matchedDoc.id}/viewer`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Document</span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
