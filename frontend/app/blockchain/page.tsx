'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Blocks,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  Cpu,
  Layers,
  FileText,
  Plus,
} from 'lucide-react';
import { useDocuments } from '@/lib/store';
import { DmsApi } from '@/lib/api';

function BlockchainContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  const documents = useDocuments();

  const [selectedDocId, setSelectedDocId] = useState<string>(initialId || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreatingProof, setIsCreatingProof] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [copiedTx, setCopiedTx] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const handleVerifyOnChain = async (docIdToVerify?: string) => {
    const id = docIdToVerify || activeDoc?.id;
    if (!id) return;
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const response = await DmsApi.getBlockchainVerify(id);
      if (response.data) {
        setVerifyResult(response.data);
        setStatusMessage(`Evidence ledger verification completed: Status ${response.data.integrity_status}`);
      } else {
        setErrorMessage(response.error || 'Evidence ledger verification query failed.');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Unable to reach evidence ledger service.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCreateProof = async () => {
    if (!activeDoc?.id) return;
    setIsCreatingProof(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const response = await DmsApi.createBlockchainProof(activeDoc.id);
      if (response.data) {
        setStatusMessage('Official legal evidence record successfully registered in the permanent ledger!');
        await handleVerifyOnChain(activeDoc.id);
      } else {
        setErrorMessage(response.error || 'Failed to create registry proof.');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Error registering official evidence record.');
    } finally {
      setIsCreatingProof(false);
    }
  };

  useEffect(() => {
    if (activeDoc?.id) {
      void handleVerifyOnChain(activeDoc.id);
    }
  }, [activeDoc?.id]);

  const handleCopyTx = (tx: string) => {
    if (!tx) return;
    navigator.clipboard.writeText(tx);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  if (!activeDoc) {
    return <div className="p-8 text-center text-slate-500 text-xs">No documents available for ledger audit.</div>;
  }

  const txHash = verifyResult?.transaction_hash || activeDoc.blockchain_tx;
  const isVerified = verifyResult?.integrity_status === 'VERIFIED';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Blocks className="w-5 h-5 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-900">Official Digital Evidence Ledger</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Tamper-proof permanent record registry ensuring legal non-repudiation in judicial proceedings.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-700 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Select Document Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="text-xs font-semibold text-slate-700">Select Document:</label>
        <select
          value={selectedDocId}
          onChange={(e) => {
            setSelectedDocId(e.target.value);
            void handleVerifyOnChain(e.target.value);
          }}
          className="flex-1 max-w-md px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-500"
        >
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.original_filename} ({d.case_id})
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCreateProof}
            disabled={isCreatingProof}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isCreatingProof ? 'Registering...' : 'Register Permanent Seal'}</span>
          </button>
          <button
            onClick={() => void handleVerifyOnChain(activeDoc.id)}
            disabled={isVerifying}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying Record...' : 'Verify Ledger Proof'}</span>
          </button>
        </div>
      </div>

      {/* Main Blockchain Certificate Card */}
      <div className="bg-gradient-to-br from-indigo-950 via-[#0B192C] to-slate-900 text-white rounded-2xl p-8 shadow-xl border border-indigo-900/60 relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-indigo-900/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Blocks className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Official Evidence Registry Certificate</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isVerified
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {verifyResult?.integrity_status === 'VERIFIED' ? 'AUTHENTICITY CERTIFIED' : 'PENDING REGISTRATION'}
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Permanent Evidence Registry Reference: REG-SEC-65B
              </p>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-xs text-indigo-300 block">REGISTRY NETWORK</span>
            <span className="text-sm font-bold text-white uppercase">Secure Evidence Ledger</span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] text-indigo-300 block uppercase tracking-wider font-sans font-bold">
              Document Security Seal ID
            </span>
            <p className="text-slate-200 break-all leading-normal text-[11px]">{activeDoc.sha256_hash}</p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-indigo-300 block uppercase tracking-wider font-sans font-bold">
                Registry Reference Code
              </span>
              {txHash && (
                <button
                  onClick={() => handleCopyTx(txHash)}
                  className="text-[10px] text-indigo-400 hover:text-white flex items-center gap-1 font-sans"
                >
                  {copiedTx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedTx ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
            <p className="text-blue-300 break-all leading-normal text-[11px]">
              {txHash || 'Pending official registry confirmation'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] text-indigo-300 block uppercase tracking-wider font-sans font-bold">
              Legal Proof Reference ID
            </span>
            <p className="text-slate-200 break-all leading-normal text-[11px]">
              {verifyResult?.proof_hash || '0x' + activeDoc.sha256_hash.slice(0, 32)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] text-indigo-300 block uppercase tracking-wider font-sans font-bold">
              Legal Record Admissibility & Status
            </span>
            <p className="text-slate-200 text-xs font-bold">
              Official Seal Status: {verifyResult?.integrity_status || 'NOT_ANCHORED'}
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between text-[11px] text-indigo-300/80 font-sans border-t border-indigo-900/60">
          <span>Official digital registry guarantees tamper-evident validity for court and judicial proceedings.</span>
          <span className="font-mono">Storage: Official Evidence Vault & Permanent Ledger</span>
        </div>
      </div>
    </div>
  );
}

export default function BlockchainPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading official evidence ledger...</div>}>
      <BlockchainContent />
    </Suspense>
  );
}
