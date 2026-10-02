'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Files,
  UploadCloud,
  Search,
  Compass,
  Fingerprint,
  Blocks,
  GitPullRequest,
  History,
  Copy,
  Share2,
  Inbox,
  DatabaseBackup,
  ScrollText,
  Bell,
  ShieldCheck,
  UserCheck,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { useCurrentOfficer } from '@/lib/store';

const NAV_SECTIONS = [
  {
    title: 'Case Records',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Case Files', href: '/documents', icon: Files },
      { name: 'Add Case Record', href: '/upload', icon: UploadCloud, highlight: true },
      { name: 'Case Search', href: '/search', icon: Search },
      { name: 'Browse Categories', href: '/explore', icon: Compass },
    ],
  },
  {
    title: 'Evidence & Verification',
    items: [
      { name: 'Tamper Verification', href: '/integrity', icon: Fingerprint },
      { name: 'Evidence Ledger', href: '/blockchain', icon: Blocks },
      { name: 'Custody Chain', href: '/custody', icon: GitPullRequest },
      { name: 'Version History', href: '/versions', icon: History },
      { name: 'Duplicate Check', href: '/duplicates', icon: Copy },
    ],
  },
  {
    title: 'Case Management',
    items: [
      { name: 'Share Records', href: '/shares', icon: Share2 },
      { name: 'Received Records', href: '/shared-with-me', icon: Inbox },
      { name: 'Backup & Recovery', href: '/backup', icon: DatabaseBackup },
      { name: 'Activity Log', href: '/audit', icon: ScrollText },
    ],
  },
  {
    title: 'System & Security',
    items: [
      { name: 'Notifications', href: '/notifications', icon: Bell },
      { name: 'Security Settings', href: '/security', icon: ShieldCheck },
      { name: 'Officer Profile', href: '/profile', icon: UserCheck },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const officer = useCurrentOfficer();

  return (
    <aside className="w-64 bg-[#0B192C] text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none min-h-screen">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80 bg-[#07111E]">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-white text-base tracking-tight leading-none">DMS</h1>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              GOV
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium leading-none mt-1">
            Evidence & Document Vault
          </p>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {section.title}
            </p>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : item.highlight
                        ? 'text-indigo-400 hover:bg-indigo-950/40 hover:text-indigo-300'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? 'text-white'
                            : item.highlight
                            ? 'text-indigo-400'
                            : 'text-slate-400 group-hover:text-white'
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Officer Credential Card */}
      <div className="p-3 border-t border-slate-800/80 bg-[#07111E]/80">
        <Link
          href="/profile"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center border border-blue-400/40 shadow-xs">
            {officer.avatarInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
              {officer.name}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{officer.badgeId}</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400" title="Active Session" />
        </Link>
      </div>
    </aside>
  );
}
