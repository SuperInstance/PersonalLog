'use client';

/**
 * Backup Section Component
 *
 * Embedded backup status and quick actions.
 * Links to full backup management page.
 */

import React, { useState, useEffect } from 'react';
import { Database, Clock, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function BackupSection() {
  const [lastBackup, setLastBackup] = useState<number | null>(null);
  const [backupCount, setBackupCount] = useState(0);
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    const lastBackupStr = localStorage.getItem('last-backup-timestamp');
    if (lastBackupStr) {
      setLastBackup(parseInt(lastBackupStr, 10));
    }

    // These would be populated from actual backup data
    setBackupCount(3);
    setTotalSize(250 * 1024 * 1024); // 250 MB
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTimeSinceBackup = () => {
    if (!lastBackup) return 'Never';

    const now = Date.now();
    const diff = now - lastBackup;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleQuickBackup = async () => {
    // Placeholder - would trigger backup creation
    localStorage.setItem('last-backup-timestamp', Date.now().toString());
    setLastBackup(Date.now());
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Backup</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last backup: {getTimeSinceBackup()}
            </p>
          </div>
        </div>
        <Link
          href="/settings/backup"
          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-sm"
        >
          Manage
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {backupCount}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Backups</div>
        </div>
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatBytes(totalSize)}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Total Size</div>
        </div>
      </div>

      <button
        onClick={handleQuickBackup}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
      >
        <Database className="w-4 h-4" />
        Create Backup Now
      </button>
    </div>
  );
}
