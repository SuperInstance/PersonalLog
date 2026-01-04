'use client';

/**
 * Sync Section Component
 *
 * Embedded sync status and quick actions.
 * Links to full sync configuration page.
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Smartphone, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export function SyncSection() {
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [connectedDevices, setConnectedDevices] = useState(2);
  const [pendingChanges, setPendingChanges] = useState(0);

  useEffect(() => {
    const lastSyncStr = localStorage.getItem('last-sync-timestamp');
    if (lastSyncStr) {
      setLastSync(parseInt(lastSyncStr, 10));
    }

    // These would be populated from actual sync data
    setConnectedDevices(2);
    setPendingChanges(0);
  }, []);

  const getTimeSinceSync = () => {
    if (!lastSync) return 'Never synced';

    const now = Date.now();
    const diff = now - lastSync;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleQuickSync = async () => {
    setSyncStatus('syncing');
    // Placeholder - would trigger actual sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    localStorage.setItem('last-sync-timestamp', Date.now().toString());
    setLastSync(Date.now());
    setSyncStatus('idle');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-5 h-5 text-green-600 dark:text-green-400 animate-spin" />
            ) : syncStatus === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Sync</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last sync: {getTimeSinceSync()}
            </p>
          </div>
        </div>
        <Link
          href="/settings/sync"
          className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 text-sm"
        >
          Configure
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center justify-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-500" />
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {connectedDevices}
            </span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Devices</div>
        </div>
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {pendingChanges}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Pending Changes</div>
        </div>
      </div>

      <button
        onClick={handleQuickSync}
        disabled={syncStatus === 'syncing'}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {syncStatus === 'syncing' ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Sync All Devices
          </>
        )}
      </button>
    </div>
  );
}
