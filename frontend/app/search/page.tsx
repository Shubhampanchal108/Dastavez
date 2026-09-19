'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, FileText, ChevronRight } from 'lucide-react';
import { useDocuments } from '@/lib/store';
import { DocumentTable } from '@/components/document-table';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const documents = useDocuments();

  const [query, setQuery] = useState(initialQ);
  const [department, setDepartment] = useState('ALL');
  const [docType, setDocType] = useState('ALL');
  const [sensitivity, setSensitivity] = useState('ALL');

  useEffect(() => {
    if (initialQ) setQuery(initialQ);
  }, [initialQ]);

  const departments = Array.from(new Set(documents.map((d) => d.department)));
  const docTypes = Array.from(new Set(documents.map((d) => d.document_type)));

  const filtered = documents.filter((doc) => {
    const qLower = query.toLowerCase();
    const matchesQ =
      !query ||
      doc.original_filename.toLowerCase().includes(qLower) ||
      doc.case_id.toLowerCase().includes(qLower) ||
      doc.sha256_hash.toLowerCase().includes(qLower) ||
      (doc.ocr_text && doc.ocr_text.toLowerCase().includes(qLower)) ||
      (doc.summary && doc.summary.toLowerCase().includes(qLower));

    const matchesDept = department === 'ALL' || doc.department === department;
    const matchesType = docType === 'ALL' || doc.document_type === docType;
    const matchesSens = sensitivity === 'ALL' || doc.sensitivity === sensitivity;

    return matchesQ && matchesDept && matchesType && matchesSens;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">Advanced Multi-Criteria Search</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Perform full-text search across extracted OCR documents, cryptographic hashes, and case metadata.
        </p>
      </div>

      {/* Search Input & Filters Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, deponent names, forensic ledger findings, or SHA-256..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
            >
              <option value="ALL">All Classifications</option>
              {docTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Clearance Level</label>
            <select
              value={sensitivity}
              onChange={(e) => setSensitivity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
            >
              <option value="ALL">All Sensitivity Levels</option>
              <option value="INTERNAL">Internal</option>
              <option value="RESTRICTED">Restricted</option>
              <option value="HIGH">High Sensitivity</option>
              <option value="TOP_SECRET">Top Secret</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Found <strong className="text-slate-800">{filtered.length}</strong> matching documents</span>
        </div>
        <DocumentTable documents={filtered} />
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Executing search query...</div>}>
      <SearchContent />
    </Suspense>
  );
}

