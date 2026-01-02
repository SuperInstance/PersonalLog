'use client';

/**
 * System Info Settings Page
 *
 * Displays comprehensive hardware information including CPU, GPU, Memory,
 * Storage, Network, and Browser details. Shows performance score and
 * feature support matrix.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Cpu, RefreshCw } from 'lucide-react';
import { HardwareDetector } from '@/lib/hardware/detector';
import type { HardwareProfile } from '@/lib/hardware/types';
import { HardwareInfoCard } from '@/components/settings/HardwareInfoCard';
import { SystemStatusCard } from '@/components/settings/SystemStatusCard';

export default function SystemInfoPage() {
  const [profile, setProfile] = useState<HardwareProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadHardwareInfo = async (showRefreshLoading = false) => {
    try {
      if (showRefreshLoading) {
        setRefreshing(true);
      }
      const detector = new HardwareDetector();
      const result = await detector.getHardwareInfo({}, false); // Bypass cache
      if (result.success && result.profile) {
        setProfile(result.profile);
        setError(null);
      } else {
        setError(result.error || 'Failed to detect hardware');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHardwareInfo();
  }, []);

  const handleRefresh = () => {
    loadHardwareInfo(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  System Information
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Hardware capabilities and performance profile
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Hardware Info
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hardware Info */}
          <div className="lg:col-span-1">
            <HardwareInfoCard profile={profile} loading={loading} />
          </div>

          {/* System Status */}
          <div className="lg:col-span-1">
            {profile && (
              <SystemStatusCard
                features={profile.features}
                wasmSupported={profile.cpu.wasm.supported}
                nativeBridgeReady={profile.cpu.wasm.supported}
              />
            )}
          </div>
        </div>

        {/* Feature Support Matrix */}
        {profile && (
          <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Feature Support Matrix
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Browser and platform feature support
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <FeatureItem name="Web Workers" supported={profile.features.webWorkers} />
                <FeatureItem name="Service Worker" supported={profile.features.serviceWorker} />
                <FeatureItem name="WebRTC" supported={profile.features.webrtc} />
                <FeatureItem name="WebAssembly" supported={profile.features.webassembly} />
                <FeatureItem name="WebSockets" supported={profile.features.websockets} />
                <FeatureItem name="Geolocation" supported={profile.features.geolocation} />
                <FeatureItem name="Notifications" supported={profile.features.notifications} />
                <FeatureItem name="Fullscreen" supported={profile.features.fullscreen} />
                <FeatureItem name="Picture-in-Picture" supported={profile.features.pip} />
                <FeatureItem name="Web Bluetooth" supported={profile.features.webBluetooth} />
                <FeatureItem name="Web USB" supported={profile.features.webusb} />
                <FeatureItem name="File System Access" supported={profile.features.fileSystemAccess} />
              </div>
            </div>
          </div>
        )}

        {/* WASM Feature Details */}
        {profile && (
          <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                WebAssembly Features
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Advanced WASM capabilities
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FeatureItem name="SIMD" supported={profile.cpu.wasm.simd} />
                <FeatureItem name="Threads" supported={profile.cpu.wasm.threads} />
                <FeatureItem name="Bulk Memory" supported={profile.cpu.wasm.bulkMemory} />
                <FeatureItem name="Exceptions" supported={profile.cpu.wasm.exceptions} />
              </div>
            </div>
          </div>
        )}

        {/* Display Info */}
        {profile && (
          <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Display Information
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Screen and viewport details
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoItem label="Resolution" value={`${profile.display.width} x ${profile.display.height}`} />
                <InfoItem label="Pixel Ratio" value={profile.display.pixelRatio.toString()} />
                <InfoItem label="Color Depth" value={`${profile.display.colorDepth} bit`} />
                <InfoItem label="Orientation" value={profile.display.orientation || 'Unknown'} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface FeatureItemProps {
  name: string;
  supported: boolean;
}

function FeatureItem({ name, supported }: FeatureItemProps) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg ${
      supported
        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        supported ? 'bg-green-500' : 'bg-red-500'
      }`} />
      <span className={`text-sm font-medium ${
        supported
          ? 'text-green-900 dark:text-green-100'
          : 'text-red-900 dark:text-red-100'
      }`}>
        {name}
      </span>
    </div>
  );
}

interface InfoItemProps {
  label: string;
  value: string;
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}
