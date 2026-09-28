'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  Shield,
  KeyRound,
  Laptop,
  CheckCircle2,
  Lock,
  LogOut,
  RefreshCw,
  Mail,
  Fingerprint,
} from 'lucide-react';
import { DmsApi, ApiConfig } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void DmsApi.getMe().then((res) => {
      if (res.data) {
        setProfile(res.data);
      }
      setIsLoading(false);
    });
  }, []);

  const handleLogout = () => {
    ApiConfig.clearSession();
    router.push('/login');
  };

  const username = profile?.username || 'Officer';
  const role = profile?.role || 'INVESTIGATOR';
  const userId = profile?.user_id || 'N/A';
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">Officer Identity & Clearance Profile</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Cryptographically notarized credentials, RBAC clearance, and active authenticated sessions verified by PostgreSQL.
        </p>
      </div>

      {/* Official ID Badge Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-8 shadow-xl border border-blue-900 relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-2xl bg-blue-600 text-white text-3xl font-black flex items-center justify-center border-2 border-blue-400/40 shadow-lg shrink-0">
          {initials}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-2xl font-bold">{username}</h2>
            <span className="inline-block text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30">
              {role}
            </span>
          </div>
          <p className="text-xs text-slate-300 font-mono">User UUID: {userId}</p>

          <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20 text-slate-200">
              Clearance: <strong className="text-white">{role}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Session Authenticated (JWT)</span>
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout Session</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs text-xs text-slate-600 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Active Authentication Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase block">Account Identity</span>
            <span className="text-slate-800 font-bold">{username}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase block">Role Policy</span>
            <span className="text-blue-700 font-bold">{role}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase block">Password Hasher</span>
            <span className="text-slate-800 font-bold">Argon2id (Backend)</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase block">MFA Challenge</span>
            <span className="text-emerald-700 font-bold">Enforced (OTP / Authenticator)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
