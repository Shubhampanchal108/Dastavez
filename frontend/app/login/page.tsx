'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Fingerprint,
} from 'lucide-react';
import { DmsApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'otp' | 'authenticator'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both Email and Password.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setOtp('');
    setDevOtp(null);
    setChallengeId(null);

    try {
      const res = await DmsApi.login(email, password);
      if (!res.data) {
        setErrorMsg(res.error || 'Unable to start login challenge.');
        return;
      }

      if (res.data.status !== 'OTP_REQUIRED') {
        setStep('authenticator');
        void waitForAuthenticatorApproval(res.data.challenge_id);
        return;
      }

      setChallengeId(res.data.challenge_id);
      setDevOtp(res.data.dev_otp || null);
      setStep('otp');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to start login challenge.');
    } finally {
      setIsLoading(false);
    }
  };

  const waitForAuthenticatorApproval = async (id: string) => {
    for (let attempt = 0; attempt < 150; attempt += 1) {
      const res = await DmsApi.getAuthenticatorChallengeStatus(id);
      if (res.data?.status === 'APPROVED') {
        const completed = await DmsApi.completeAuthenticator(id);
        if (!completed.data?.access_token) {
          setErrorMsg(completed.error || 'Mobile approval could not complete login.');
          return;
        }
        router.push('/');
        return;
      }
      if (res.data?.status !== 'PENDING') {
        setErrorMsg(res.error || 'Mobile authentication challenge expired.');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    setErrorMsg('Mobile approval timed out. Start login again.');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setErrorMsg('Please enter the 6-digit OTP.');
      return;
    }
    if (!challengeId) {
      setErrorMsg('Login challenge expired. Start login again.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await DmsApi.verifyOtp(challengeId, otp.trim());
      if (!res.data?.access_token) {
        setErrorMsg(res.error || 'Invalid OTP.');
        return;
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to verify OTP.');
      return;
    }

    setIsLoading(false);
    router.push('/');
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
        ) : step === 'otp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs text-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Fingerprint className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white">Cryptographic Challenge Issued</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                A 6-digit authentication token has been generated for {email}.
              </p>
            </div>

            <div>
              {devOtp && (
                <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  Development OTP for this login: <strong>{devOtp}</strong>
                </p>
              )}
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Enter 6-Digit OTP Token
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter code from your mobile app"
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
        ) : (
          <div className="space-y-5">
            <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-xl text-sm text-blue-100">
              Approve this login from your registered DMS mobile authenticator. Keep this page open while the mobile approval is completed.
            </div>
            <button
              type="button"
              onClick={() => setStep('credentials')}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
          Strict Law Enforcement & Judicial Evidence System • Version 2026.4
        </div>
      </div>
    </div>
  );
}
