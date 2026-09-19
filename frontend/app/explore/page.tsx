'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Compass, Folder, FileText, ArrowRight, Shield } from 'lucide-react';
import { useDocuments } from '@/lib/store';
import { DocumentTable } from '@/components/document-table';

export default function ExplorePage() {
  const documents = useDocuments();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group by departments
  const departmentCounts: Record<string, number> = {};
  documents.forEach((d) => {
    departmentCounts[d.department] = (departmentCounts[d.department] || 0) + 1;
  });

  // Group by document types
  const typeCounts: Record<string, number> = {};
  documents.forEach((d) => {
    typeCounts[d.document_type] = (typeCounts[d.document_type] || 0) + 1;
  });

  // Group by sensitivity
  const sensitivityCounts: Record<string, number> = {};
  documents.forEach((d) => {
    sensitivityCounts[d.sensitivity] = (sensitivityCounts[d.sensitivity] || 0) + 1;
  });

  const activeDocuments = selectedCategory
    ? documents.filter(
        (d) =>
          d.department === selectedCategory ||
          d.document_type === selectedCategory ||
          d.sensitivity === selectedCategory
      )
    : documents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">Categorical Document Explorer</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Browse evidence collections by organizational department, legal taxonomy, or clearance level.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* By Department */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
            <Folder className="w-4 h-4 text-blue-600" />
            <span>By Department</span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(departmentCounts).map(([dept, count]) => (
              <button
                key={dept}
                onClick={() => setSelectedCategory(dept)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                  selectedCategory === dept
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate pr-2">{dept}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100/40 shrink-0">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* By Classification Type */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
            <FileText className="w-4 h-4 text-purple-600" />
            <span>By Classification</span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(typeCounts).map(([type, count]) => (
              <button
                key={type}
                onClick={() => setSelectedCategory(type)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                  selectedCategory === type
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate pr-2">{type}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100/40 shrink-0">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* By Sensitivity Clearance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>By Sensitivity Clearance</span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(sensitivityCounts).map(([sens, count]) => (
              <button
                key={sens}
                onClick={() => setSelectedCategory(sens)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                  selectedCategory === sens
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate pr-2">{sens}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100/40 shrink-0">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtered Documents View */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            {selectedCategory ? `Viewing "${selectedCategory}" Documents` : 'All Institutional Documents'}
          </h2>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Reset Category Filter
            </button>
          )}
        </div>
        <DocumentTable documents={activeDocuments} />
      </div>
    </div>
  );
}
