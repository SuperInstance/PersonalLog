'use client';

/**
 * Import/Export Section Component
 *
 * Embedded import/export quick actions.
 * Links to full data portability page.
 */

import React, { useState, useEffect } from 'react';
import { Download, Upload, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function ImportExportSection() {
  const [recentExports, setRecentExports] = useState<Array<{ name: string; date: number; size: number }>>([]);
  const [recentImports, setRecentImports] = useState<Array<{ name: string; date: number }>>([]);

  useEffect(() => {
    // These would be populated from actual data
    setRecentExports([
      { name: 'PersonalLog-Export-2025-01-02.json', date: Date.now() - 2 * 60 * 60 * 1000, size: 50 * 1024 * 1024 },
      { name: 'PersonalLog-Export-2025-01-01.json', date: Date.now() - 26 * 60 * 60 * 1000, size: 48 * 1024 * 1024 },
    ]);
    setRecentImports([
      { name: 'imported-conversations.json', date: Date.now() - 5 * 24 * 60 * 60 * 1000 },
    ]);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const handleQuickExport = async () => {
    // Placeholder - would trigger actual export
    console.log('Quick export triggered');
  };

  const handleQuickImport = () => {
    // Trigger file input
    document.getElementById('import-file-input')?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Placeholder - would process imported file
    console.log('Importing file:', file.name);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Import / Export</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Data portability
            </p>
          </div>
        </div>
        <Link
          href="/settings/data-portability"
          className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 text-sm"
        >
          Advanced
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={handleQuickExport}
          className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Export</div>
          <div className="text-xs text-blue-700 dark:text-blue-300">Download data</div>
        </button>

        <button
          onClick={handleQuickImport}
          className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
        >
          <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
          <div className="text-sm font-medium text-purple-900 dark:text-purple-100">Import</div>
          <div className="text-xs text-purple-700 dark:text-purple-300">Upload file</div>
        </button>
      </div>

      <input
        id="import-file-input"
        type="file"
        accept=".json,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Recent Activity */}
      {(recentExports.length > 0 || recentImports.length > 0) && (
        <div className="space-y-3">
          {recentExports.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
                Recent Exports
              </div>
              <div className="space-y-2">
                {recentExports.slice(0, 2).map((exp, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {exp.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(exp.date)} • {formatBytes(exp.size)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentImports.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
                Recent Imports
              </div>
              <div className="space-y-2">
                {recentImports.slice(0, 2).map((imp, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {imp.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(imp.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
