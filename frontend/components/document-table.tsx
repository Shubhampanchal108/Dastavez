'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Eye,
  Fingerprint,
  Share2,
  Blocks,
  Copy,
  Check,
  MoreVertical,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { DmsDocument } from '@/lib/mockData';
import { StatusBadge } from './status-badge';

interface DocumentTableProps {
  documents: DmsDocument[];
  onSelectDoc?: (doc: DmsDocument) => void;
}

export function DocumentTable({ documents, onSelectDoc }: DocumentTableProps) {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopyHash = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getSensitivityClass = (sens: string) => {
    switch (sens) {
      case 'TOP_SECRET':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'RESTRICTED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Document / Case</th>
              <th className="py-3 px-4">Type & Department</th>
              <th className="py-3 px-4">Sensitivity</th>
              <th className="py-3 px-4">SHA-256 Checksum</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Ledger Proof</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {documents.map((doc) => {
              const formattedDate = new Date(doc.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <tr
                  key={doc.id}
                  className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                  onClick={() => onSelectDoc && onSelectDoc(doc)}
                >
                  {/* File & Case */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 max-w-xs">
                        <Link
                          href={`/documents/${doc.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors truncate block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {doc.original_filename}
                        </Link>
                        <span className="text-[11px] font-mono text-slate-500 block">
                          {doc.case_id}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Type & Dept */}
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-slate-900">{doc.document_type}</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                      {doc.department}
                    </p>
                  </td>

                  {/* Sensitivity */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSensitivityClass(
                        doc.sensitivity
                      )}`}
                    >
                      {doc.sensitivity}
                    </span>
                  </td>

                  {/* SHA-256 */}
                  <td className="py-3.5 px-4">
                    <button
                      onClick={(e) => handleCopyHash(doc.sha256_hash, e)}
                      title="Click to copy full SHA-256"
                      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-sm border border-slate-200/80 transition-colors"
                    >
                      <span>
                        {doc.sha256_hash.slice(0, 8)}...{doc.sha256_hash.slice(-6)}
                      </span>
                      {copiedHash === doc.sha256_hash ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <StatusBadge status={doc.status} size="sm" />
                  </td>

                  {/* Blockchain */}
                  <td className="py-3.5 px-4">
                    {doc.block_number ? (
                      <Link
                        href={`/blockchain?id=${doc.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors"
                      >
                        <Blocks className="w-3 h-3" />
                        <span>#{doc.block_number}</span>
                      </Link>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Unanchored</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div
                      className="inline-flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={`/documents/${doc.id}/viewer`}
                        title="Open Document Viewer"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/integrity?id=${doc.id}`}
                        title="Verify Hash & Tamper Status"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Fingerprint className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/shares?id=${doc.id}`}
                        title="Create Secure Share Link"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/documents/${doc.id}`}
                        title="Full Details"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
