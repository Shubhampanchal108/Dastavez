'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Share2,
  Blocks,
  ShieldAlert,
  Sparkles,
  Fingerprint,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useAuditLogs } from '@/lib/store';
import { DmsApi } from '@/lib/api';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'SHARE' | 'BLOCKCHAIN' | 'VALIDATION' | 'INTEGRITY' | 'SECURITY';
  isRead: boolean;
  docId?: string;
}

export default function NotificationsPage() {
  const auditLogs = useAuditLogs();
  const [filter, setFilter] = useState('ALL');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (auditLogs && auditLogs.length > 0) {
      const derived: NotificationItem[] = auditLogs.map((log) => {
        let category: NotificationItem['category'] = 'SECURITY';
        let title = log.action.replace(/_/g, ' ');

        if (log.action.includes('SHARE')) {
          category = 'SHARE';
          title = 'Document Share Event';
        } else if (log.action.includes('BLOCKCHAIN')) {
          category = 'BLOCKCHAIN';
          title = 'Official Evidence Registry Seal';
        } else if (log.action.includes('VALIDAT') || log.action.includes('AI')) {
          category = 'VALIDATION';
          title = 'Case Classification & Analysis';
        } else if (log.action.includes('INTEGRITY') || log.action.includes('HASH')) {
          category = 'INTEGRITY';
          title = 'Document Tamper & Authenticity Check';
        }

        return {
          id: log.id,
          title,
          description: log.details || `${log.action} performed by ${log.actor}`,
          timestamp: new Date(log.timestamp).toLocaleString(),
          category,
          isRead: false,
          docId: log.reference,
        };
      });
      setNotifications(derived);
    }
  }, [auditLogs]);

  const filtered = filter === 'ALL'
    ? notifications
    : filter === 'UNREAD'
    ? notifications.filter((n) => !n.isRead)
    : notifications.filter((n) => n.category === filter);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'SHARE':
        return <Share2 className="w-4 h-4 text-purple-600" />;
      case 'BLOCKCHAIN':
        return <Blocks className="w-4 h-4 text-indigo-600" />;
      case 'VALIDATION':
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      case 'INTEGRITY':
        return <Fingerprint className="w-4 h-4 text-emerald-600" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Notifications Center</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time alerts and official updates synchronized with case activity records.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto shadow-2xs">
        {['ALL', 'SHARE', 'BLOCKCHAIN', 'VALIDATION', 'SECURITY'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              filter === f
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
        {filtered.length === 0 && (
          <p className="p-8 text-center text-xs text-slate-500">
            No notifications found in this category.
          </p>
        )}
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-4 flex items-start gap-3.5 transition-colors hover:bg-slate-50/80"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80">
              {getCategoryIcon(item.category)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">{item.timestamp}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
              {item.docId && (
                <div className="mt-1.5">
                  <Link
                    href={`/documents/${item.docId}`}
                    className="text-[11px] font-mono text-blue-600 hover:underline"
                  >
                    View Document {item.docId.slice(0, 8)}...
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
