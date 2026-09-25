'use client';

import React from 'react';
import Link from 'next/link';
import {
  UserCheck,
  Shield,
  KeyRound,
  Laptop,
  CheckCircle2,
  Lock,
  LogOut,
} from 'lucide-react';
import { useCurrentOfficer } from '@/lib/store';

export default function ProfilePage() {
  const officer = useCurrentOfficer();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">Officer Identity & Clearance Profile</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Cryptographically notarized credentials, RBAC clearance, and active authenticated sessions.
        </p>
      </div>

      {/* Official ID Badge Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-8 shadow-xl border border-blue-900 relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-2xl bg-blue-600 text-white text-3xl font-black flex items-center justify-center border-2 border-blue-400/40 shadow-lg shrink-0">
          {officer.avatarInitials}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-2xl font-bold">{officer.name}</h2>
            <span className="inline-block text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30">
              {officer.badgeId}
            </span>
          </div>
          <p className="text-sm text-slate-300">{officer.department}</p>

          <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20 text-slate-200">
              Role: <strong className="text-white">{officer.role}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>TOP_SECRET Clearance</span>
            </span>
          </div>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch / Re-auth</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs text-xs text-slate-500">
        Active identity and clearance are supplied by the authenticated backend session.
      </div>

      {/* Active Workstation Sessions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Authenticated Terminal Sessions</h2>
        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Laptop className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-bold text-slate-900">Primary Desktop Workstation (Current)</p>
                <p className="text-slate-500">Windows 11 • Edge / Chrome • IP 127.0.0.1</p>
              </div>
            </div>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">Active Now</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Laptop className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-bold text-slate-900">Mobile Forensic Tablet Client</p>
                <p className="text-slate-500">iOS 19 Expo Client • IP 10.245.18.42</p>
              </div>
            </div>
            <span className="text-slate-400">Authenticated 2h ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
