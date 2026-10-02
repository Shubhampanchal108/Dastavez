'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Bell,
  Activity,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  User,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { ApiConfig, DmsApi } from '@/lib/api';
import { DocumentStore, useCurrentOfficer } from '@/lib/store';

export function Header() {
  const router = useRouter();
  const currentOfficer = useCurrentOfficer();
  const [backendLive, setBackendLive] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'offline' | 'checking'>('checking');
  const [officerMenuOpen, setOfficerMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Check system health on load
  useEffect(() => {
    let mounted = true;
    async function checkHealth() {
      try {
        const hRes = await DmsApi.getHealth();
        if (mounted && hRes.data && hRes.data.status === 'ok') {
          setBackendLive(true);
        } else {
          setBackendLive(false);
        }

        const dbRes = await DmsApi.getDbHealth();
        if (mounted && dbRes.data && dbRes.data.status === 'ok') {
          setDbStatus('connected');
        } else {
          setDbStatus('offline');
        }
      } catch {
        if (mounted) {
          setBackendLive(false);
          setDbStatus('offline');
        }
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Handle click outside dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOfficerMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Global Search */}
      <form onSubmit={handleSearchSubmit} className="relative w-96 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search records, case numbers, file names..."
          className="w-full pl-9 pr-12 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono bg-slate-200/60 px-1.5 py-0.5 rounded border border-slate-300">
          Enter
        </kbd>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-3.5">
        {/* System Operational Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              backendLive && dbStatus === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-amber-500'
            }`}
          />
          <span className="font-semibold text-slate-700">
            {backendLive && dbStatus === 'connected' ? 'Secure Vault Online' : 'System Degraded'}
          </span>
        </div>

        {/* Action Button: Add Document */}
        <Link
          href="/upload"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Case Record</span>
        </Link>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">System Notifications</span>
                <Link
                  href="/notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-[11px] text-blue-600 hover:underline font-medium"
                >
                  View all
                </Link>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                <p className="p-3 text-xs text-slate-500">No notifications found.</p>
              </div>
            </div>
          )}
        </div>

        {/* Officer Switcher Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOfficerMenuOpen(!officerMenuOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {currentOfficer.avatarInitials}
            </div>
            <div className="text-left leading-none">
              <span className="block text-xs font-bold text-slate-900">{currentOfficer.name}</span>
              <span className="text-[10px] text-slate-500">{currentOfficer.role}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {officerMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Switch Active Officer Role
              </div>
              <p className="px-3 py-2 text-xs text-slate-500">Official identity assigned to your active session.</p>
              <div className="border-t border-slate-100 pt-1 mt-1">
                <Link
                  href="/login"
                  onClick={() => {
                    ApiConfig.clearSession();
                    setOfficerMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-rose-600 hover:bg-rose-50 text-xs font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out / Lock Session</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
