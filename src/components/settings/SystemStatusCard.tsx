'use client';

/**
 * System Status Card Component
 *
 * Displays overall system status including native bridge status,
 * WASM support, and feature support matrix.
 */

import { CheckCircle, XCircle, AlertCircle, Circle } from 'lucide-react';
import type { FeatureSupport } from '@/lib/hardware/types';

interface SystemStatusCardProps {
  features: FeatureSupport;
  wasmSupported: boolean;
  nativeBridgeReady: boolean;
}

export function SystemStatusCard({ features, wasmSupported, nativeBridgeReady }: SystemStatusCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          System Status
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Core system capabilities and support
        </p>
      </div>

      <div className="p-6 space-y-4">
        {/* Critical Systems */}
        <StatusItem
          label="Native Bridge"
          status={nativeBridgeReady ? 'available' : 'unavailable'}
          description={nativeBridgeReady ? 'Ready for native module execution' : 'Native modules unavailable'}
        />

        <StatusItem
          label="WebAssembly"
          status={wasmSupported ? 'available' : 'unavailable'}
          description={wasmSupported ? 'WASM execution supported' : 'WASM not supported'}
        />

        <div className="border-t border-slate-200 dark:border-slate-800 my-4"></div>

        {/* Feature Support Matrix */}
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Browser Features
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem label="Web Workers" supported={features.webWorkers} />
            <FeatureItem label="Service Worker" supported={features.serviceWorker} />
            <FeatureItem label="WebRTC" supported={features.webrtc} />
            <FeatureItem label="WebSockets" supported={features.websockets} />
            <FeatureItem label="Geolocation" supported={features.geolocation} />
            <FeatureItem label="Notifications" supported={features.notifications} />
            <FeatureItem label="Fullscreen" supported={features.fullscreen} />
            <FeatureItem label="Picture-in-Picture" supported={features.pip} />
            <FeatureItem label="Web Bluetooth" supported={features.webBluetooth} />
            <FeatureItem label="Web USB" supported={features.webusb} />
            <FeatureItem label="File System Access" supported={features.fileSystemAccess} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatusItemProps {
  label: string;
  status: 'available' | 'unavailable' | 'partial';
  description: string;
}

function StatusItem({ label, status, description }: StatusItemProps) {
  const statusConfig = {
    available: {
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
      label: 'Available'
    },
    unavailable: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      label: 'Unavailable'
    },
    partial: {
      icon: AlertCircle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      label: 'Partial'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${config.bg}`}>
      <Icon className={`w-5 h-5 mt-0.5 ${config.color} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-slate-100">{label}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
            {config.label}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

interface FeatureItemProps {
  label: string;
  supported: boolean;
}

function FeatureItem({ label, supported }: FeatureItemProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {supported ? (
        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
      )}
      <span className={`flex-1 ${supported ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
}
