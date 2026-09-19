'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  Share2,
  Blocks,
  ShieldAlert,
  Sparkles,
  Fingerprint,
} from 'lucide-react';
import { INITIAL_NOTIFICATIONS, NotificationItem } from '@/lib/mockData';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState('ALL');

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

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
            System notices, document shares, blockchain confirmations, and integrity alerts.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          Mark all as read
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto shadow-2xs">
        {['ALL', 'UNREAD', 'SHARE', 'BLOCKCHAIN', 'VALIDATION', 'SECURITY'].map((f) => (
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
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`p-4 flex items-start gap-3.5 transition-colors ${
              !item.isRead ? 'bg-blue-50/40' : 'hover:bg-slate-50'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80">
              {getCategoryIcon(item.category)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                <span className="text-[10px] text-slate-400 shrink-0">{item.timestamp}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>

              {item.docId && (
                <Link
                  href={`/documents/${item.docId}`}
                  className="mt-2 inline-block text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  Inspect Case Document →
                </Link>
              )}
            </div>

            {!item.isRead && (
              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
