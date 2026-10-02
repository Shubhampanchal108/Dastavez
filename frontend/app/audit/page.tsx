'use client';

import React, { useState } from 'react';
import {
  ScrollText,
  Filter,
  Search,
  Download,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';
import { useAuditLogs } from '@/lib/store';

export default function AuditPage() {
  const auditLogs = useAuditLogs();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filtered = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.reference.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === 'ALL' || log.action_category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleExport = () => {
    const headers = ['ID', 'Timestamp', 'Actor', 'Role', 'Action', 'Category', 'Reference', 'IP', 'Status', 'Details'];
    const rows = filtered.map((l) => [
      l.id,
      l.timestamp,
      `"${l.actor}"`,
      l.actor_role,
      l.action,
      l.action_category,
      `"${l.reference}"`,
      l.ip_address,
      l.status,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dms_audit_trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">SUCCESS</span>;
      case 'WARNING':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">WARNING</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">DENIED</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Official Case & Access Activity Log</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official, tamper-evident security logs recording every officer access and case action.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Activity Log (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by officer, action, or case ref..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold overflow-x-auto">
          {['ALL', 'AUTH', 'UPLOAD', 'VERIFY', 'SHARE', 'BLOCKCHAIN', 'ADMIN'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'BLOCKCHAIN' ? 'REGISTRY' : cat === 'AUTH' ? 'LOGIN' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Officer / User</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Case Reference</th>
              <th className="py-3 px-4">Details</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="py-3.5 px-4">
                  <p className="font-semibold text-slate-900">{log.actor}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{log.ip_address}</p>
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-800 font-mono text-[11px]">
                  {log.action}
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {log.action_category}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-blue-700 text-[11px]">
                  {log.reference}
                </td>
                <td className="py-3.5 px-4 text-slate-600 max-w-sm leading-relaxed">
                  {log.details}
                </td>
                <td className="py-3.5 px-4">
                  {getStatusBadge(log.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
