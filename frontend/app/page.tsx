'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  ShieldCheck,
  Blocks,
  Share2,
  UploadCloud,
  Search,
  Fingerprint,
  DatabaseBackup,
  ScrollText,
  Clock,
  ArrowUpRight,
  Sparkles,
  Server,
  ChevronRight,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
import { DocumentTable } from '@/components/document-table';
import { useDocuments, useAuditLogs, useShares, useCurrentOfficer } from '@/lib/store';

export default function DashboardPage() {
  const officer = useCurrentOfficer();
  const documents = useDocuments();
  const auditLogs = useAuditLogs();
  const shares = useShares();
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Stats
  const totalDocs = documents.length;
  const anchoredDocs = documents.filter((d) => d.block_number).length;
  const activeShares = shares.filter((s) => s.status === 'ACTIVE').length;
  const verifiedCount = documents.filter((d) => d.status === 'VERIFIED' || d.status === 'SEALED').length;

  // Filtered documents
  const filteredDocs =
    selectedStatusFilter === 'ALL'
      ? documents
      : documents.filter((d) => d.status === selectedStatusFilter);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Greetings */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-400/30">
            <Shield className="w-3.5 h-3.5" />
            <span>Digital Locker & Evidence Vault</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {officer.name}
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Institutional terminal active for <span className="font-semibold text-white">{officer.department}</span>. All operations are signed with cryptographic SHA-256 integrity checks.
          </p>
        </div>

        {/* Action Ribbon */}
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02]"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Ingest Document</span>
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/20 transition-all"
          >
            <Search className="w-4 h-4" />
            <span>Deep Search</span>
          </Link>
        </div>

        {/* Subtle decorative background pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_70%)] pointer-events-none" />
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Documents"
          value={totalDocs}
          subtitle="Registered in evidence vault"
          trend="+12% this month"
          trendPositive={true}
          icon={FileText}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Blockchain Anchored"
          value={anchoredDocs}
          subtitle="Immutable EVM proofs"
          trend="100% Verified"
          trendPositive={true}
          icon={Blocks}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <MetricCard
          title="Active Secure Shares"
          value={activeShares}
          subtitle="Authorized external access"
          trend="RBAC Monitored"
          trendPositive={true}
          icon={Share2}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <MetricCard
          title="Cryptographic Verifications"
          value={verifiedCount}
          subtitle="Zero-tamper confirmed"
          trend="100% Match"
          trendPositive={true}
          icon={ShieldCheck}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Main Split Content: Left Table (70%) + Right Feed (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Documents Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Evidence Documents</h2>
              <p className="text-xs text-slate-500">Live documents ingested and verified across cases</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              {['ALL', 'VERIFIED', 'SEALED', 'PENDING'].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    selectedStatusFilter === status
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Documents Table Component */}
          <DocumentTable documents={filteredDocs.slice(0, 6)} />

          <div className="flex justify-end pt-1">
            <Link
              href="/documents"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              <span>View all {totalDocs} documents</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: Live Activity Feed & System Diagnostics */}
        <div className="lg:col-span-4 space-y-6">
          {/* Activity Feed Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Recent System Activity</h3>
              </div>
              <Link
                href="/audit"
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Full Audit
              </Link>
            </div>

            <div className="space-y-4">
              {auditLogs.slice(0, 4).map((log, idx) => (
                <div key={log.id} className="relative pl-6 text-xs group">
                  {/* Timeline dot & line */}
                  <span className="absolute left-1.5 top-1 w-2 h-2 rounded-full bg-blue-600 ring-4 ring-blue-50" />
                  {idx !== auditLogs.slice(0, 4).length - 1 && (
                    <span className="absolute left-2.5 top-3 bottom-0 w-px bg-slate-200 -mb-4" />
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 truncate">
                      {log.action.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                    {log.details}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    By {log.actor}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* System Security Diagnostics Card */}
          <div className="bg-gradient-to-br from-slate-900 to-[#0B192C] text-slate-300 rounded-xl p-5 shadow-xs border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Server className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold">Node Diagnostics</h3>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-800 pt-1">
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400">Security Standard</span>
                <span className="font-semibold text-white">ISO/IEC 27001</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400">Hash Algorithm</span>
                <span className="font-mono text-emerald-400">SHA-256 (256-bit)</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400">AI Classification Model</span>
                <span className="font-semibold text-indigo-300">Qwen 3.8 (Groq/Ollama)</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400">EVM Proof Network</span>
                <span className="font-semibold text-blue-400">Ethereum Sepolia / Local</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/security"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
              >
                <span>Security Settings & 2FA</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
