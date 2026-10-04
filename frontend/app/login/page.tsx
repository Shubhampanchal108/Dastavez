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
  UserPlus,
  LogIn,
  CheckCircle2,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { DmsApi } from '@/lib/api';
import { DocumentStore } from '@/lib/store';

const DEMO_OFFICERS = [
  { name: 'Chief Proctor', role: 'ADMIN', email: 'admin@dms.internal', badge: 'CP-01' },
  { name: 'Det. Vance', role: 'INVESTIGATOR', email: 'investigator@dms.internal', badge: 'DV-44' },
  { name: 'Dr. Evans', role: 'FORENSIC_OFFICER', email: 'forensic@dms.internal', badge: 'FE-09' },
  { name: 'Officer Davis', role: 'VIEWER', email: 'viewer@dms.internal', badge: 'OD-77' },
];

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'credentials' | 'otp' | 'authenticator'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('INVESTIGATOR');

  const startLoginWithCredentials = async (loginEmail: string, loginPass: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setOtp('');
    setChallengeId(null);

    try {
      const res = await DmsApi.login(loginEmail, loginPass);
      if (!res.data) {
        setErrorMsg(res.error || 'Unable to start login challenge.');
        setIsLoading(false);
        return;
      }

      if (res.data.status !== 'OTP_REQUIRED') {
        if (!res.data.poll_token) {
          setErrorMsg('Authenticator challenge did not include its polling credential.');
          return;
        }
        setStep('authenticator');
        void waitForAuthenticatorApproval(res.data.challenge_id, res.data.poll_token);
        setIsLoading(false);
        return;
      }

      setChallengeId(res.data.challenge_id);
      setOtp('');
      setStep('otp');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to start login challenge.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both Email and Password.');
      return;
    }
    await startLoginWithCredentials(email, password);
  };

  const handleQuickDemoLogin = async (officer: typeof DEMO_OFFICERS[0]) => {
    setEmail(officer.email);
    setPassword('password123');
    await startLoginWithCredentials(officer.email, 'password123');
  };

  const waitForAuthenticatorApproval = async (id: string, pollToken: string) => {
    for (let attempt = 0; attempt < 150; attempt += 1) {
      const res = await DmsApi.getAuthenticatorChallengeStatus(id, pollToken);
      if (res.data?.status === 'APPROVED') {
        const completed = await DmsApi.completeAuthenticator(id, pollToken);
        if (!completed.data?.access_token) {
          setErrorMsg(completed.error || 'Mobile approval could not complete login.');
          return;
        }
        await DocumentStore.syncWithBackend();
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
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP from your mobile authenticator.');
      return;
    }
    if (!challengeId) {
      setErrorMsg('Login challenge expired. Start login again.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await DmsApi.verifyOtp(challengeId, cleanOtp);
      if (!res.data?.access_token) {
        setErrorMsg(res.error || 'Invalid OTP. Please verify fingerprint on your DMS Mobile Authenticator to get the correct OTP.');
        setIsLoading(false);
        return;
      }

      await DocumentStore.syncWithBackend();
      router.push('/');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to verify OTP.');
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMsg('Please fill in all registration fields.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await DmsApi.register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        role: regRole,
      });

      if (!res.data) {
        setErrorMsg(res.error || 'Registration failed.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg(`Account created for ${res.data.username}! You can now sign in.`);
      setEmail(regEmail.trim());
      setPassword(regPassword.trim());
      setTab('login');
      setStep('credentials');
    } catch (error: any) {
      setErrorMsg(error?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111E] flex flex-col justify-center items-center p-6 text-slate-100">
      <div className="w-full max-w-lg bg-[#0B192C] border border-slate-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">DMS Evidence Vault</h1>
            <p className="text-xs text-slate-400">Law Enforcement Portal • Secure Case Evidence Vault</p>
          </div>
        </div>

        {/* Tab Switcher */}
        {step === 'credentials' && (
          <div className="flex bg-slate-900/80 p-1 rounded-xl mb-6 border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => { setTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                tab === 'login' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Officer Sign In</span>
            </button>
            <button
              onClick={() => { setTab('register'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                tab === 'register' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register New Officer</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {tab === 'register' && step === 'credentials' ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Officer John Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Official Email
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="officer@dms.internal"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Assigned Role & RBAC Clearance
              </label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="INVESTIGATOR">INVESTIGATOR (Upload, Verify, Search)</option>
                <option value="ADMIN">ADMIN (Full Institutional Authority)</option>
                <option value="FORENSIC_OFFICER">FORENSIC_OFFICER (Extraction & Analysis)</option>
                <option value="VIEWER">VIEWER (Read-Only Clearance)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
                placeholder="Choose a strong password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? <span>Registering...</span> : <span>Create Account in Database</span>}
            </button>
          </form>
        ) : step === 'credentials' ? (
          <div className="space-y-5">
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

            {/* Quick Demo Officer Login Cards */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Quick One-Click Demo Logins
                </span>
                <span className="text-[10px] text-slate-500">Pass: password123</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_OFFICERS.map((officer) => (
                  <button
                    key={officer.email}
                    type="button"
                    onClick={() => handleQuickDemoLogin(officer)}
                    className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-blue-400">
                        {officer.name}
                      </span>
                      <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-400">
                        {officer.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">{officer.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : step === 'otp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="p-4 bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-600/40 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Fingerprint className="w-5 h-5 animate-pulse text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide uppercase">
                      Biometric OTP Required
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      Mobile 2FA
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-300 leading-relaxed mt-1">
                    A cryptographic challenge was issued for <strong className="text-blue-300 font-semibold">{email}</strong>.
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-blue-950/50 border border-blue-800/40 p-3 text-[11px] text-blue-200/90 space-y-1">
                <p className="font-semibold text-blue-100 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  How to unlock your OTP:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
                  <li>Open the <strong>DMS Authenticator</strong> app on your mobile device.</li>
                  <li>Authenticate using your <strong>Fingerprint Biometric</strong>.</li>
                  <li>The 6-digit OTP will be securely revealed on your mobile screen.</li>
                  <li>Enter that 6-digit OTP below to authorize this session.</li>
                </ol>
              </div>
            </div>

            <div>
              <label htmlFor="otp" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Enter 6-Digit Mobile OTP
              </label>
              <input
                id="otp"
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoFocus
                className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-500 text-center mt-1.5">
                Random OTPs are rejected. You must verify using your mobile fingerprint.
              </p>
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
                disabled={isLoading || otp.trim().length !== 6}
                className="w-2/3 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
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
          Secure Police Record Management System • Authorized Personnel Only
        </div>
      </div>
    </div>
  );
}
