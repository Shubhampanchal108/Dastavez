'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useDocuments } from '@/lib/store';
import { DocumentTable } from '@/components/document-table';
import { DmsApi } from '@/lib/api';
import { DmsDocument } from '@/lib/types';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const documents = useDocuments();

  const [query, setQuery] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);
  const [department, setDepartment] = useState('ALL');
  const [docType, setDocType] = useState('ALL');
  const [searchResults, setSearchResults] = useState<DmsDocument[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (initialQ) setQuery(initialQ);
  }, [initialQ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const departments = Array.from(new Set(documents.map((d) => d.department)));
  const docTypes = Array.from(new Set(documents.map((d) => d.document_type)));

  const hasSearch = Boolean(query.trim() || department !== 'ALL' || docType !== 'ALL');

  useEffect(() => {
    if (!hasSearch) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    void DmsApi.searchDocuments({
      q: debouncedQuery.trim() || undefined,
      department: department !== 'ALL' ? department : undefined,
      document_type: docType !== 'ALL' ? docType : undefined,
      limit: 100,
      offset: 0,
    }).then((response) => {
      if (!active) return;
      if (Array.isArray(response.data)) {
        setSearchResults(response.data.map((item: any) => ({
          id: item.id,
          case_id: item.case_id,
          original_filename: item.original_filename,
          document_type: item.document_type || 'Unclassified',
          department: item.department || 'Unassigned',
          sensitivity: item.sensitivity || 'INTERNAL',
          mime_type: item.mime_type || 'application/octet-stream',
          file_size: item.file_size || 0,
          sha256_hash: item.sha256_hash || '',
          status: (item.status || 'PENDING').toUpperCase(),
          created_at: item.created_at,
          uploader: item.uploaded_by || '',
          uploader_role: 'Unknown',
          version: 'v1.0',
          summary: item.description || '',
        })));
      } else {
        setSearchResults([]);
        setSearchError(response.error || 'Search failed.');
      }
      setIsSearching(false);
    });

    return () => {
      active = false;
    };
  }, [department, docType, debouncedQuery, hasSearch]);

  useEffect(() => {
    if (query !== debouncedQuery && hasSearch) {
      setIsSearching(true);
      setSearchError(null);
      setSearchResults([]);
    }
  }, [debouncedQuery, hasSearch, query]);

  const results = hasSearch ? searchResults : documents;

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

        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {isSearching ? 'Searching...' : `Found ${results.length} matching documents`}
          </span>
        </div>
        {searchError ? (
          <p className="p-8 text-center text-xs text-rose-700">{searchError}</p>
        ) : (
          <DocumentTable documents={results} />
        )}
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

