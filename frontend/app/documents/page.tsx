'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Files,
  Plus,
  Filter,
  Search,
  Download,
  LayoutGrid,
  ListFilter,
  FileText,
  Blocks,
  Eye,
  Fingerprint,
  Share2,
} from 'lucide-react';
import { useDocuments } from '@/lib/store';
import { DocumentTable } from '@/components/document-table';
import { StatusBadge } from '@/components/status-badge';

export default function DocumentsPage() {
  const documents = useDocuments();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [sensitivityFilter, setSensitivityFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Unique departments
  const departments = Array.from(new Set(documents.map((d) => d.department)));

  // Filter logic
  const filtered = documents.filter((doc) => {
    const matchesSearch =
      doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.case_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
    const matchesDept = deptFilter === 'ALL' || doc.department === deptFilter;
    const matchesSensitivity =
      sensitivityFilter === 'ALL' || doc.sensitivity === sensitivityFilter;

    return matchesSearch && matchesStatus && matchesDept && matchesSensitivity;
  });

  const handleExportCsv = () => {
    const headers = ['ID', 'Case ID', 'Filename', 'Type', 'Department', 'Clearance Level', 'Security Seal ID', 'Status'];
    const rows = filtered.map((d) => [
      d.id,
      d.case_id,
      `"${d.original_filename}"`,
      `"${d.document_type}"`,
      `"${d.department}"`,
      d.sensitivity,
      d.sha256_hash,
      d.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dms_documents_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Files className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Case Files & Evidence Repository</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse, inspect, and verify official police case files and evidence records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Case Record</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by title, case ID, or document type..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md ${
                  viewMode === 'table' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-500'
                }`}
                title="Table View"
              >
                <ListFilter className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md ${
                  viewMode === 'grid' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-500'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown Filters row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {['ALL', 'VERIFIED', 'SEALED', 'PENDING', 'FLAGGED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Department dropdown */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Sensitivity dropdown */}
          <select
            value={sensitivityFilter}
            onChange={(e) => setSensitivityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">All Clearances</option>
            <option value="INTERNAL">Internal</option>
            <option value="RESTRICTED">Restricted</option>
            <option value="HIGH">High Sensitivity</option>
            <option value="TOP_SECRET">Top Secret</option>
          </select>

          <span className="text-slate-400 text-xs ml-auto">
            Showing <strong className="text-slate-800">{filtered.length}</strong> of {documents.length} files
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        <DocumentTable documents={filtered} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <FileText className="w-5 h-5" />
                  </div>
                  <StatusBadge status={doc.status} size="sm" />
                </div>

                <Link
                  href={`/documents/${doc.id}`}
                  className="font-bold text-slate-900 hover:text-blue-600 line-clamp-1 text-sm transition-colors"
                >
                  {doc.original_filename}
                </Link>
                <p className="text-xs font-mono text-blue-700 mt-0.5">{doc.case_id}</p>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{doc.summary}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {(doc.file_size / (1024 * 1024)).toFixed(2)} MB
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/documents/${doc.id}/viewer`}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Document"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/integrity?id=${doc.id}`}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Verify Integrity"
                  >
                    <Fingerprint className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/shares?id=${doc.id}`}
                    className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Share Document"
                  >
                    <Share2 className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
