'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Server,
  Lock,
  CheckCircle2,
  Save,
  RefreshCw,
} from 'lucide-react';
import { ApiConfig } from '@/lib/api';

export default function SecurityPage() {
  const [apiUrl, setApiUrl] = useState(ApiConfig.getBaseUrl());
  const [twoFactorEnforced, setTwoFactorEnforced] = useState(true);
  const [autoLockTimeout, setAutoLockTimeout] = useState('15');
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    ApiConfig.setBaseUrl(apiUrl);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">Security & Cryptography Configuration</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configure multi-factor authentication, cryptographic endpoints, and session security policies.
        </p>
      </div>

      {savedBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Security parameters and API configuration saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Backend API Configuration */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Server className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">FastAPI Backend API Server</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Backend REST Origin URL
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-blue-500"
              placeholder="http://127.0.0.1:8000"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Default local API server for FastAPI endpoints, OCR pipeline, and PostgreSQL database.
            </p>
          </div>
        </div>

        {/* 2FA & Session Policies */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Lock className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Session & Authentication Policies</h2>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
            <div>
              <p className="font-semibold text-slate-900">Enforce 2FA OTP Authentication</p>
              <p className="text-slate-500">Require cryptographic challenge verification on every officer sign-in.</p>
            </div>
            <input
              type="checkbox"
              checked={twoFactorEnforced}
              onChange={(e) => setTwoFactorEnforced(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </div>

          <div className="flex items-center justify-between py-2 text-xs">
            <div>
              <p className="font-semibold text-slate-900">Auto-lock Inactive Terminal</p>
              <p className="text-slate-500">Automatically lock the screen after inactivity to prevent unauthorized access.</p>
            </div>
            <select
              value={autoLockTimeout}
              onChange={(e) => setAutoLockTimeout(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold"
            >
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Security Parameters</span>
          </button>
        </div>
      </form>
    </div>
  );
}
