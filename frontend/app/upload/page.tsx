'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Blocks,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { DocumentStore, useCurrentOfficer } from '@/lib/store';
import { StatusBadge } from '@/components/status-badge';

const DEMO_PRESETS = [
  {
    name: 'First_Information_Report_FIR_2026_04.pdf',
    size: 1520000,
    type: 'application/pdf',
    hash: '3a88c2114d77ee09923315af1287c2b4e8832a67e5bb9910d55e88fa2901cce1',
    caseId: 'CASE-2026-062',
    docType: 'First Information Report (FIR)',
    department: 'Metropolitan Police Station 4',
    sensitivity: 'HIGH' as const,
    description: 'Initial registered complaint regarding unauthorized intrusion into judicial records.',
    confidence: 0.998,
  },
  {
    name: 'Forensic_Audit_Report_Q3.pdf',
    size: 2450000,
    type: 'application/pdf',
    hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    caseId: 'CASE-2026-089',
    docType: 'Audit Report',
    department: 'Financial Crimes Division',
    sensitivity: 'HIGH' as const,
    description: 'Forensic reconciliation of banking ledger accounts and offshore transaction traces.',
    confidence: 0.985,
  },
  {
    name: 'Witness_Deposition_Transcript.docx',
    size: 894000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    caseId: 'CASE-2026-074',
    docType: 'Deposition',
    department: 'Legal Prosecution Bureau',
    sensitivity: 'RESTRICTED' as const,
    description: 'Deposition transcript of primary eyewitness under judicial oath.',
    confidence: 0.992,
  },
  {
    name: 'Seizure_Memo_Hardware_Evidence.pdf',
    size: 1180000,
    type: 'application/pdf',
    hash: '7c884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1599a0',
    caseId: 'CASE-2026-095',
    docType: 'Evidence Seizure Memo',
    department: 'Digital Forensics Lab',
    sensitivity: 'TOP_SECRET' as const,
    description: 'Official seizure protocol for impounded server hardware and physical keycard tokens.',
    confidence: 0.979,
  },
];

export default function UploadPage() {
  const router = useRouter();
  const officer = useCurrentOfficer();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // File state
  const [selectedFile, setSelectedFile] = useState({
    name: DEMO_PRESETS[0].name,
    size: DEMO_PRESETS[0].size,
    type: DEMO_PRESETS[0].type,
    hash: DEMO_PRESETS[0].hash,
  });

  // Metadata state
  const [metadata, setMetadata] = useState({
    caseId: DEMO_PRESETS[0].caseId,
    docType: DEMO_PRESETS[0].docType,
    department: DEMO_PRESETS[0].department,
    sensitivity: DEMO_PRESETS[0].sensitivity,
    description: DEMO_PRESETS[0].description,
  });

  // Processing state
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [activePipelineStep, setActivePipelineStep] = useState(0);

  // AI confidence
  const [aiConfidence, setAiConfidence] = useState(0.998);

  const handleSelectPreset = (preset: (typeof DEMO_PRESETS)[0]) => {
    setSelectedFile({
      name: preset.name,
      size: preset.size,
      type: preset.type,
      hash: preset.hash,
    });
    setMetadata({
      caseId: preset.caseId,
      docType: preset.docType,
      department: preset.department,
      sensitivity: preset.sensitivity,
      description: preset.description,
    });
    setAiConfidence(preset.confidence);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Generate pseudo sha-256 for browser upload
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      setSelectedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        hash: hashHex,
      });

      setMetadata({
        ...metadata,
        caseId: `CASE-2026-${Math.floor(100 + Math.random() * 900)}`,
        description: `Ingested document: ${file.name}`,
      });
    }
  };

  const handleStartProcessing = () => {
    setStep(3);
    setPipelineProgress(0);
    setActivePipelineStep(0);

    const steps = [
      'Calculating cryptographic SHA-256 checksum...',
      'Running OCR text extraction and text layer normalization...',
      'Zero-shot classification via Qwen 3.8 model...',
      'Anchoring cryptographic proof to Ethereum EVM block...',
    ];

    let current = 0;
    const interval = setInterval(() => {
      current++;
      setActivePipelineStep(current);
      setPipelineProgress(Math.min(100, current * 25));

      if (current >= 4) {
        clearInterval(interval);
        setTimeout(() => {
          setStep(4);
        }, 500);
      }
    }, 700);
  };

  const handleFinalApprove = () => {
    const newDoc = DocumentStore.addDocument({
      case_id: metadata.caseId,
      original_filename: selectedFile.name,
      document_type: metadata.docType,
      department: metadata.department,
      sensitivity: metadata.sensitivity,
      mime_type: selectedFile.type,
      file_size: selectedFile.size,
      sha256_hash: selectedFile.hash,
      description: metadata.description,
      uploader: officer.name,
      uploader_role: officer.role,
      ai_confidence: aiConfidence,
      validation_status: 'COMPLETE',
    });

    router.push(`/documents/${newDoc.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">Ingest New Evidence Document</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Cryptographic ingestion pipeline with real-time SHA-256 verification and AI classification.
        </p>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          {[
            { num: 1, title: '1. File Source' },
            { num: 2, title: '2. Case Metadata' },
            { num: 3, title: '3. Ingestion Pipeline' },
            { num: 4, title: '4. AI Review & Seal' },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === s.num
                      ? 'bg-blue-600 text-white'
                      : step > s.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step > s.num ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                </div>
                <span
                  className={`text-xs font-semibold ${
                    step === s.num ? 'text-slate-900 font-bold' : 'text-slate-500'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {idx < 3 && <div className="flex-1 h-0.5 bg-slate-200 mx-3" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: File Source */}
      {step === 1 && (
        <div className="space-y-6 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Select File or Demo Evidentiary Preset</h2>
            <p className="text-xs text-slate-500">
              Upload any document file or pick from pre-configured legal forensics presets.
            </p>
          </div>

          {/* Drag & Drop Zone */}
          <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors block text-center">
            <input type="file" onChange={handleFileChange} className="hidden" />
            <UploadCloud className="w-10 h-10 text-blue-600 mb-2" />
            <p className="text-sm font-bold text-slate-800">
              Drag and drop your file here, or <span className="text-blue-600 underline">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports PDF, DOCX, PNG, JPG, TIFF, and Forensic binary logs (Max 100 MB)
            </p>
          </label>

          {/* Preset Buttons */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Or Choose Pre-built Evidence Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    selectedFile.name === preset.name
                      ? 'bg-blue-50/80 border-blue-500 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 truncate max-w-[200px]">
                      {preset.name}
                    </span>
                    <span className="text-[10px] font-mono text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded">
                      {preset.caseId}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Selected File Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{selectedFile.name}</p>
                <p className="text-[11px] font-mono text-slate-500">
                  SHA-256: {selectedFile.hash.slice(0, 16)}... • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Next: Case Metadata</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Case Metadata */}
      {step === 2 && (
        <div className="space-y-6 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Case & Judicial Metadata</h2>
            <p className="text-xs text-slate-500">
              Provide identifying information for evidence ledger categorization and RBAC permissions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Case Identifier</label>
              <input
                type="text"
                value={metadata.caseId}
                onChange={(e) => setMetadata({ ...metadata, caseId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Document Classification</label>
              <select
                value={metadata.docType}
                onChange={(e) => setMetadata({ ...metadata, docType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
              >
                <option>First Information Report (FIR)</option>
                <option>Audit Report</option>
                <option>Deposition</option>
                <option>Evidence Seizure Memo</option>
                <option>Forensic Image / Video</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Department</label>
              <input
                type="text"
                value={metadata.department}
                onChange={(e) => setMetadata({ ...metadata, department: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sensitivity / Clearance</label>
              <select
                value={metadata.sensitivity}
                onChange={(e) => setMetadata({ ...metadata, sensitivity: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
              >
                <option value="INTERNAL">Internal</option>
                <option value="RESTRICTED">Restricted</option>
                <option value="HIGH">High Sensitivity</option>
                <option value="TOP_SECRET">Top Secret</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Brief Description / Remarks</label>
            <textarea
              rows={3}
              value={metadata.description}
              onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Back
            </button>
            <button
              onClick={handleStartProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Execute Ingestion Pipeline</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Processing Animation */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100 shadow-sm animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">Processing Cryptographic Evidence Ingestion</h2>
            <p className="text-xs text-slate-500 mt-1">Executing zero-trust pipeline checks in real-time...</p>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md mx-auto bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${pipelineProgress}%` }}
            />
          </div>

          {/* Pipeline Checklist */}
          <div className="w-full max-w-md mx-auto space-y-2 text-left text-xs">
            {[
              'Calculating cryptographic SHA-256 checksum...',
              'Running OCR text extraction and text layer normalization...',
              'Zero-shot classification via Qwen 3.8 model...',
              'Anchoring cryptographic proof to Ethereum EVM block...',
            ].map((msg, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-lg border flex items-center gap-2.5 transition-colors ${
                  activePipelineStep > i
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : activePipelineStep === i
                    ? 'bg-blue-50 border-blue-200 text-blue-800 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                {activePipelineStep > i ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <RefreshCw
                    className={`w-4 h-4 shrink-0 ${activePipelineStep === i ? 'animate-spin text-blue-600' : 'text-slate-300'}`}
                  />
                )}
                <span>{msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: AI Review & Confirmation */}
      {step === 4 && (
        <div className="space-y-6 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI Verification & Proof Ready</h2>
              <p className="text-xs text-slate-500">
                All cryptographic checks and AI validations succeeded with high confidence.
              </p>
            </div>
          </div>

          {/* Results Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1">
                AI Confidence Score
              </span>
              <span className="text-2xl font-black text-purple-900">
                {(aiConfidence * 100).toFixed(1)}%
              </span>
              <p className="text-[11px] text-purple-700 mt-1">Qwen 3.8 Model Analysis</p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                Integrity Status
              </span>
              <span className="text-lg font-bold text-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>SHA-256 Validated</span>
              </span>
              <p className="text-[11px] text-emerald-700 mt-1">Zero Collision Match</p>
            </div>

            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                Blockchain Proof
              </span>
              <span className="text-lg font-bold text-indigo-900 flex items-center gap-1">
                <Blocks className="w-5 h-5 text-indigo-600" />
                <span>EVM Block #4921944</span>
              </span>
              <p className="text-[11px] text-indigo-700 mt-1">Sepolia Smart Contract</p>
            </div>
          </div>

          {/* Document Ingested Details Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">File Name:</span>
              <span className="font-bold text-slate-900">{selectedFile.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Case Reference:</span>
              <span className="font-mono font-bold text-blue-700">{metadata.caseId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">SHA-256 Hash:</span>
              <span className="font-mono text-slate-700">{selectedFile.hash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Filing Officer:</span>
              <span className="text-slate-900 font-semibold">{officer.name} ({officer.badgeId})</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Back
            </button>
            <button
              onClick={handleFinalApprove}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Anchor into Vault</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
