'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Copy,
  Check,
  Search,
  FileText,
  ShieldCheck,
  Share2,
  Printer,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { DmsApi } from '@/lib/api';
import { DocumentStore } from '@/lib/store';

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params?.id as string;

  const [doc, setDoc] = useState<any>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [zoomLevel, setZoomLevel] = useState(100);
  const [copiedText, setCopiedText] = useState(false);
  const [ocrSearch, setOcrSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await DmsApi.getDocument(docId);
        if (mounted && res.data) {
          setDoc(res.data);
        } else {
          const fallback = DocumentStore.getDocumentById(docId);
          if (mounted && fallback) setDoc(fallback);
        }

        const aiRes = await DmsApi.getAiResult(docId);
        if (mounted && aiRes.data) {
          setAiData(aiRes.data);
        }
      } catch (e) {
        console.warn('Error loading viewer document', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    void loadData();
    return () => { mounted = false; };
  }, [docId]);

  const rawText = aiData?.raw_text || doc?.description || 'Document content archived in secure digital repository.';

  const handleCopyText = () => {
    navigator.clipboard.writeText(rawText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500">Loading document canvas and text layer...</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-lg font-bold text-slate-800">Document Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">Unable to load document viewer for this ID.</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold">
          Go Back
        </button>
      </div>
    );
  }

  const ocrLines = rawText.split('\n');
  const filteredLines = ocrSearch
    ? ocrLines.filter((l: string) => l.toLowerCase().includes(ocrSearch.toLowerCase()))
    : ocrLines;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] -m-8">
      {/* Top Viewer Toolbar */}
      <div className="h-14 bg-slate-900 text-slate-200 px-6 flex items-center justify-between border-b border-slate-800 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Back to details"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-bold text-white tracking-wide truncate max-w-sm">
                {doc.original_filename}
              </h1>
              <StatusBadge status={doc.status} size="sm" />
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {doc.case_id} • SHA-256: {doc.sha256_hash?.slice(0, 12)}...
            </span>
          </div>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 15))}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono font-semibold text-slate-300">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(200, zoomLevel + 15))}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="Print Official Record"
          >
            <Printer className="w-4 h-4" />
          </button>

          <Link
            href={`/shares?id=${doc.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </Link>
        </div>
      </div>

      {/* Split Viewer: Left Canvas (55%) + Right OCR Stream (45%) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Rendered Document Stage */}
        <div className="flex-1 bg-slate-800/90 overflow-auto p-8 flex justify-center items-start border-r border-slate-700">
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="w-[595px] min-h-[842px] bg-white shadow-2xl rounded-sm p-12 text-slate-900 transition-transform relative select-text"
          >
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 rotate-[-30deg]">
              <span className="text-6xl font-black text-slate-900 uppercase">
                OFFICIAL EVIDENCE
              </span>
            </div>

            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                    Department of Institutional Security
                  </h2>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    {doc.department?.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-1 rounded border border-slate-300">
                    {doc.case_id}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Body */}
            <div className="space-y-4 text-xs leading-relaxed text-slate-800 font-serif">
              <h3 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-200 pb-1">
                {doc.original_filename?.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}
              </h3>
              <p className="text-[11px] text-slate-600 italic">
                Registered Ingestion Record • Status: {doc.status} • Classification: {doc.sensitivity || 'INTERNAL'}
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded font-mono text-[10px] leading-normal text-slate-700 whitespace-pre-wrap">
                {rawText}
              </div>
            </div>

            {/* Document Footer Seal */}
            <div className="absolute bottom-10 left-12 right-12 pt-4 border-t border-slate-300 flex justify-between items-end text-[9px] text-slate-500 font-mono">
              <div>
                <p>CRYPTOGRAPHIC HASH VERIFIED</p>
                <p>{doc.sha256_hash?.slice(0, 32)}...</p>
              </div>
              <div className="text-right">
                <p>STORAGE: {doc.storage_provider || 'CLOUDINARY'}</p>
                <p>OFFICER ID: {doc.uploaded_by || doc.uploader || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: OCR & Extracted Entity Inspector */}
        <div className="w-[45%] bg-slate-900 text-slate-200 flex flex-col shrink-0">
          {/* OCR Panel Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                OCR Text & Metadata Inspector
              </h3>
            </div>
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied Text</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Extracted</span>
                </>
              )}
            </button>
          </div>

          {/* Search within OCR text */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ocrSearch}
                onChange={(e) => setOcrSearch(e.target.value)}
                placeholder="Search within extracted OCR text..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Extracted Text Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-[11px] leading-relaxed text-slate-300 select-text">
            {filteredLines.map((line: string, idx: number) => (
              <div key={idx} className="flex gap-3 hover:bg-slate-800/50 px-2 py-0.5 rounded">
                <span className="text-slate-600 select-none w-8 text-right shrink-0">{idx + 1}</span>
                <span className="text-slate-200 break-all">{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
