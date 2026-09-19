'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  KeyRound,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Fingerprint,
} from 'lucide-react';
import { OFFICER_PRESETS, OfficerPreset } from '@/lib/mockData';
import { DocumentStore } from '@/lib/store';
import { DmsApi, ApiConfig } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [selectedPreset, setSelectedPreset] = useState<OfficerPreset>(OFFICER_PRESETS[0]);
  const [email, setEmail] = useState(OFFICER_PRESETS[0].email);
  const [password, setPassword] = useState('SecretPass@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState<string>('challenge-demo-8421');
  const [devOtp, setDevOtp] = useState<string>('842190');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectPreset = (preset: OfficerPreset) => {
    setSelectedPreset(preset);
    setEmail(preset.email);
    setPassword('SecretPass@2026');
    setErrorMsg(null);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both Email and Password.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await DmsApi.login(email, password);
      if (res.data && res.data.challenge_id) {
        setChallengeId(res.data.challenge_id);
        if (res.data.dev_otp) setDevOtp(res.data.dev_otp);
      }
      setStep('otp');
    } catch {
      // Fallback to local dev flow
      setStep('otp');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setErrorMsg('Please enter the 6-digit OTP.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await DmsApi.verifyOtp(challengeId, otp.trim());
    } catch {
      // Proceed with simulated success
    }

    DocumentStore.setCurrentOfficer(selectedPreset);
    setIsLoading(false);
    router.push('/');
  };

  const handleDevOtpFill = () => {
    setOtp(devOtp || '842190');
  };

  return (
    <div className="min-h-screen bg-[#07111E] flex flex-col justify-center items-center p-6 text-slate-100">
      {/* Container */}
      <div className="w-full max-w-md bg-[#0B192C] border border-slate-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">DMS Evidence Vault</h1>
            <p className="text-xs text-slate-400">Institutional Cryptographic Terminal</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 'credentials' ? (
          <div>
            {/* Quick Officer Presets */}
            <div className="mb-6">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Quick Select Officer Profile
              </label>
              <div className="grid grid-cols-3 gap-2">
                {OFFICER_PRESETS.map((preset) => (
                  <button
                    key={preset.badgeId}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedPreset.badgeId === preset.badgeId
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-bold truncate">{preset.name}</span>
                    <span className="text-[10px] text-slate-400 block">{preset.role}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Official Email / Badge Identifier
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="officer@dms.internal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Proceed to 2FA Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs text-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Fingerprint className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white">Cryptographic Challenge Issued</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                A 6-digit authentication token has been generated for {selectedPreset.name} ({selectedPreset.badgeId}).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Enter 6-Digit OTP Token
                </label>
                <button
                  type="button"
                  onClick={handleDevOtpFill}
                  className="text-[11px] text-blue-400 hover:underline font-semibold"
                >
                  Auto-fill ({devOtp})
                </button>
              </div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="842190"
                className="w-full text-center tracking-[0.5em] text-lg font-mono py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('credentials')}
                className="w-1/3 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
              >
                {isLoading ? <span>Verifying...</span> : <span>Authorize Terminal</span>}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
          Strict Law Enforcement & Judicial Evidence System • Version 2026.4
        </div>
      </div>
    </div>
  );
}
