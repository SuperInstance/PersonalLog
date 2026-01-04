'use client';

/**
 * Data Management Page
 *
 * Central hub for all data operations including storage overview,
 * backup, sync, import/export, cleanup, health monitoring, and activity logging.
 *
 * @module app/settings/data
 */

import { useState } from 'react';
import { ArrowLeft, HardDrive, Activity, Clock, Wrench } from 'lucide-react';
import Link from 'next/link';
import { StorageOverview } from '@/components/data/StorageOverview';
import { QuickActions } from '@/components/data/QuickActions';
import { CleanupTools } from '@/components/data/CleanupTools';
import { DataHealth } from '@/components/data/DataHealth';
import { ActivityLog } from '@/components/data/ActivityLog';
import { BackupSection } from '@/components/data/BackupSection';
import { SyncSection } from '@/components/data/SyncSection';
import { ImportExportSection } from '@/components/data/ImportExportSection';

type TabType = 'overview' | 'cleanup' | 'health' | 'activity';

export default function DataManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: HardDrive },
    { id: 'cleanup' as TabType, label: 'Cleanup', icon: Wrench },
    { id: 'health' as TabType, label: 'Health', icon: Activity },
    { id: 'activity' as TabType, label: 'Activity', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Go back to settings"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </Link>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Data Management
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Manage your data, backups, and storage
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Quick Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <BackupSection />
          <SyncSection />
          <ImportExportSection />
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <nav className="flex" role="tablist" aria-label="Data management tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                      activeTab === tab.id
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`panel-${tab.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Panels */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div key={`overview-${refreshKey}`} role="tabpanel" id="panel-overview">
              <QuickActions />
              <div className="mt-6">
                <StorageOverview onRefresh={handleRefresh} />
              </div>
            </div>
          )}

          {activeTab === 'cleanup' && (
            <div key={`cleanup-${refreshKey}`} role="tabpanel" id="panel-cleanup">
              <CleanupTools />
            </div>
          )}

          {activeTab === 'health' && (
            <div key={`health-${refreshKey}`} role="tabpanel" id="panel-health">
              <DataHealth onRefresh={handleRefresh} />
            </div>
          )}

          {activeTab === 'activity' && (
            <div key={`activity-${refreshKey}`} role="tabpanel" id="panel-activity">
              <ActivityLog limit={50} showFilters={true} />
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Data Management Tips
              </h3>
              <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <li>• Create regular backups to protect your data</li>
                <li>• Run health scans periodically to ensure data integrity</li>
                <li>• Clear cache and old data to free up storage space</li>
                <li>• Review activity logs to monitor data operations</li>
                <li>• Sync across devices to keep data up to date</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
