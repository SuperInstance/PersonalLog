'use client';

/**
 * Hardware Info Card Component
 *
 * Displays hardware information in a clean, organized card format.
 * Shows CPU, GPU, Memory, Storage, and Network details.
 */

import { Cpu, Globe, HardDrive, Monitor, Wifi, MemoryStick } from 'lucide-react';
import type { HardwareProfile } from '@/lib/hardware/types';

interface HardwareInfoCardProps {
  profile: HardwareProfile;
  loading?: boolean;
}

export function HardwareInfoCard({ profile, loading }: HardwareInfoCardProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded mb-4 w-1/3"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPerformanceBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
    if (score >= 60) return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
    if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
    return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
  };

  return (
    <div className="space-y-4">
      {/* Performance Score */}
      <div className={`rounded-xl border-2 p-6 ${getPerformanceBg(profile.performanceScore)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Performance Score
            </h3>
            <div className={`text-4xl font-bold mt-2 ${getPerformanceColor(profile.performanceScore)}`}>
              {profile.performanceScore}
              <span className="text-xl text-slate-500 dark:text-slate-400">/100</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Classification</div>
            <div className={`text-2xl font-semibold capitalize mt-1 ${getPerformanceColor(profile.performanceScore)}`}>
              {profile.performanceClass}
            </div>
          </div>
        </div>
      </div>

      {/* CPU Info */}
      <InfoCard
        icon={<Cpu className="w-5 h-5" />}
        title="CPU"
        color="blue"
        items={[
          { label: 'Cores', value: profile.cpu.cores.toString() },
          { label: 'Concurrency', value: profile.cpu.concurrency.toString() },
          { label: 'WASM Support', value: profile.cpu.wasm.supported ? 'Yes' : 'No' },
          { label: 'SIMD', value: profile.cpu.wasm.simd ? 'Yes' : 'No' },
        ]}
      />

      {/* GPU Info */}
      <InfoCard
        icon={<Monitor className="w-5 h-5" />}
        title="GPU"
        color="purple"
        items={[
          { label: 'Available', value: profile.gpu.available ? 'Yes' : 'No' },
          { label: 'WebGPU', value: profile.gpu.webgpu.supported ? 'Yes' : 'No' },
          { label: 'WebGL', value: profile.gpu.webgl.supported ? `Version ${profile.gpu.webgl.version}` : 'No' },
          profile.gpu.renderer ? { label: 'Renderer', value: profile.gpu.renderer } : undefined,
        ].filter(Boolean)}
      />

      {/* Memory Info */}
      <InfoCard
        icon={<MemoryStick className="w-5 h-5" />}
        title="Memory"
        color="green"
        items={[
          profile.memory.totalGB ? { label: 'Total RAM', value: `${profile.memory.totalGB} GB` } : undefined,
          { label: 'Memory API', value: profile.memory.hasMemoryAPI ? 'Available' : 'Unavailable' },
          profile.memory.jsHeap ? {
            label: 'JS Heap Used',
            value: `${(profile.memory.jsHeap.used / 1024 / 1024).toFixed(1)} MB`
          } : undefined,
        ].filter(Boolean)}
      />

      {/* Storage Info */}
      <InfoCard
        icon={<HardDrive className="w-5 h-5" />}
        title="Storage"
        color="amber"
        items={[
          { label: 'IndexedDB', value: profile.storage.indexedDB.supported ? 'Available' : 'Unavailable' },
          profile.storage.quota ? {
            label: 'Storage Used',
            value: `${profile.storage.quota.usagePercentage.toFixed(1)}%`
          } : undefined,
        ].filter(Boolean)}
      />

      {/* Network Info */}
      <InfoCard
        icon={<Wifi className="w-5 h-5" />}
        title="Network"
        color="cyan"
        items={[
          { label: 'Status', value: profile.network.online ? 'Online' : 'Offline' },
          profile.network.effectiveType ? {
            label: 'Connection',
            value: profile.network.effectiveType.toUpperCase()
          } : undefined,
          profile.network.downlinkMbps ? {
            label: 'Speed',
            value: `~${profile.network.downlinkMbps} Mbps`
          } : undefined,
          profile.network.rtt ? {
            label: 'Latency',
            value: `~${profile.network.rtt} ms`
          } : undefined,
        ].filter(Boolean)}
      />

      {/* Browser Info */}
      <InfoCard
        icon={<Globe className="w-5 h-5" />}
        title="Browser"
        color="indigo"
        items={[
          { label: 'Browser', value: profile.browser.browser },
          profile.browser.version ? { label: 'Version', value: profile.browser.version } : undefined,
          { label: 'OS', value: profile.browser.os },
          { label: 'Platform', value: profile.browser.platform },
        ].filter(Boolean)}
      />
    </div>
  );
}

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  color: 'blue' | 'purple' | 'green' | 'amber' | 'cyan' | 'indigo';
  items: Array<{ label: string; value: string } | undefined>;
}

function InfoCard({ icon, title, color, items }: InfoCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-800 ${colorClasses[color]}`}>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {items.map((item, index) => (
            item ? (
              <div key={index} className="space-y-1">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {item.label}
                </div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {item.value}
                </div>
              </div>
            ) : null
          ))}
        </div>
      </div>
    </div>
  );
}
