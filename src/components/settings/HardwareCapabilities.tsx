'use client';

/**
 * Hardware Capabilities Component
 *
 * Displays comprehensive hardware information, JEPA capabilities,
 * feature availability, and recommendations based on detected hardware.
 *
 * This is the PRIMARY UI for showing users what their system can do.
 */

import { useEffect, useState } from 'react';
import {
  Cpu,
  Monitor,
  MemoryStick,
  HardDrive,
  Wifi,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
  Settings,
  Info,
} from 'lucide-react';
import { getHardwareInfo, evaluateCapabilities } from '@/lib/hardware';
import type { HardwareProfile, CapabilityAssessment } from '@/lib/hardware';

interface HardwareCapabilitiesProps {
  className?: string;
}

export function HardwareCapabilities({ className = '' }: HardwareCapabilitiesProps) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<HardwareProfile | null>(null);
  const [assessment, setAssessment] = useState<CapabilityAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHardwareInfo() {
      try {
        setLoading(true);
        setError(null);

        // Get hardware profile
        const result = await getHardwareInfo({
          detailedGPU: true,
          detectWebGL: true,
          checkQuota: true,
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to detect hardware');
        }

        if (!result.profile) {
          throw new Error('Hardware profile not available');
        }

        setProfile(result.profile);

        // Evaluate capabilities
        const capAssessment = evaluateCapabilities(result.profile);
        setAssessment(capAssessment);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadHardwareInfo();
  }, []);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Detecting hardware capabilities...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile || !assessment) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-8 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100">Hardware Detection Failed</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error || 'Unknown error'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { score, tier, jepa, breakdown, recommendations } = assessment.score;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Score Overview */}
      <ScoreOverview score={score} tier={tier} breakdown={breakdown} />

      {/* Hardware Details */}
      <HardwareDetails profile={profile} />

      {/* JEPA Capabilities */}
      <JEPACapabilitiesSection jepa={jepa} />

      {/* Feature Availability */}
      <FeatureAvailabilitySection assessment={assessment} />

      {/* Recommendations */}
      <RecommendationsSection recommendations={recommendations} />

      {/* Technical Details */}
      <TechnicalDetails profile={profile} score={score} />
    </div>
  );
}

// ==================== Sub-components ====================

interface ScoreOverviewProps {
  score: number;
  tier: string;
  breakdown: {
    gpu: number;
    ram: number;
    cpu: number;
    storage: number;
  };
}

function ScoreOverview({ score, tier, breakdown }: ScoreOverviewProps) {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'extreme':
        return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-100';
      case 'high-end':
        return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-900 dark:text-green-100';
      case 'mid-range':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100';
      default:
        return 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-purple-600 dark:text-purple-400';
    if (score >= 60) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-blue-600 dark:text-blue-400';
    return 'text-amber-600 dark:text-amber-400';
  };

  return (
    <div className={`rounded-xl border-2 p-6 ${getTierColor(tier)}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide opacity-80">
            Hardware Score
          </h3>
          <div className={`text-5xl font-bold mt-2 ${getScoreColor(score)}`}>
            {score}
            <span className="text-2xl opacity-60">/100</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium uppercase tracking-wide opacity-80">
            Tier
          </div>
          <div className={`text-3xl font-semibold capitalize mt-2 ${getScoreColor(score)}`}>
            {tier.replace('-', ' ')}
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreBar label="GPU" score={breakdown.gpu} maxScore={40} color="purple" />
        <ScoreBar label="RAM" score={breakdown.ram} maxScore={30} color="blue" />
        <ScoreBar label="CPU" score={breakdown.cpu} maxScore={20} color="green" />
        <ScoreBar label="Storage" score={breakdown.storage} maxScore={10} color="amber" />
      </div>
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore: number;
  color: 'purple' | 'blue' | 'green' | 'amber';
}

function ScoreBar({ label, score, maxScore, color }: ScoreBarProps) {
  const percentage = (score / maxScore) * 100;

  const colorClasses = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm opacity-80">{score}/{maxScore}</span>
      </div>
      <div className="h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface HardwareDetailsProps {
  profile: HardwareProfile;
}

function HardwareDetails({ profile }: HardwareDetailsProps) {
  const items = [
    {
      icon: <Cpu className="w-5 h-5" />,
      title: 'CPU',
      values: [
        `${profile.cpu.cores} cores`,
        profile.cpu.concurrency ? `${profile.cpu.concurrency} concurrency` : undefined,
        profile.cpu.wasm.simd ? 'SIMD' : undefined,
      ].filter(Boolean),
    },
    {
      icon: <Monitor className="w-5 h-5" />,
      title: 'GPU',
      values: [
        profile.gpu.available ? 'Available' : 'Not Available',
        profile.gpu.renderer,
        profile.gpu.webgl.supported ? `WebGL ${profile.gpu.webgl.version}` : undefined,
        profile.gpu.webgpu.supported ? 'WebGPU' : undefined,
        profile.gpu.vramMB ? `${(profile.gpu.vramMB / 1024).toFixed(1)}GB VRAM` : undefined,
      ].filter(Boolean),
    },
    {
      icon: <MemoryStick className="w-5 h-5" />,
      title: 'Memory',
      values: [
        profile.memory.totalGB ? `${profile.memory.totalGB}GB RAM` : 'Unknown',
        profile.memory.jsHeap ? `${(profile.memory.jsHeap.used / 1024 / 1024).toFixed(0)}MB heap` : undefined,
      ].filter(Boolean),
    },
    {
      icon: <HardDrive className="w-5 h-5" />,
      title: 'Storage',
      values: [
        profile.storage.indexedDB.available ? 'IndexedDB' : 'No IndexedDB',
        profile.storage.quota ? `${profile.storage.quota.usagePercentage.toFixed(1)}% used` : undefined,
      ].filter(Boolean),
    },
    {
      icon: <Wifi className="w-5 h-5" />,
      title: 'Network',
      values: [
        profile.network.online ? 'Online' : 'Offline',
        profile.network.effectiveType ? profile.network.effectiveType.toUpperCase() : undefined,
        profile.network.downlinkMbps ? `~${profile.network.downlinkMbps} Mbps` : undefined,
      ].filter(Boolean),
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Detected Hardware
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-blue-600 dark:text-blue-400 mt-0.5">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {item.title}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {item.values.join(' • ')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface JEPACapabilitiesSectionProps {
  jepa: {
    tinyJEPA: boolean;
    largeJEPA: boolean;
    xlJEPA: boolean;
    multimodalJEPA: boolean;
    realtimeTranscription: boolean;
    multiModel: boolean;
    recommendedBatchSize: number;
    performanceLevel: string;
  };
}

function JEPACapabilitiesSection({ jepa }: JEPACapabilitiesSectionProps) {
  const capabilities = [
    { name: 'Tiny-JEPA', enabled: jepa.tinyJEPA, description: 'Basic transcription model' },
    { name: 'JEPA-Large', enabled: jepa.largeJEPA, description: 'Enhanced transcription accuracy' },
    { name: 'JEPA-XL', enabled: jepa.xlJEPA, description: 'Maximum accuracy transcription' },
    { name: 'Multimodal', enabled: jepa.multimodalJEPA, description: 'Video + audio analysis' },
    { name: 'Real-time', enabled: jepa.realtimeTranscription, description: 'Live transcription' },
    { name: 'Multi-model', enabled: jepa.multiModel, description: 'Run multiple models simultaneously' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          JEPA Capabilities
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {capabilities.map((cap) => (
          <div
            key={cap.name}
            className={`flex items-center gap-3 p-4 rounded-lg border ${
              cap.enabled
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            {cap.enabled ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div
                className={`font-medium ${
                  cap.enabled
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {cap.name}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {cap.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
            Performance Level: {jepa.performanceLevel}
          </span>
        </div>
        <p className="text-xs text-purple-700 dark:text-purple-300">
          Recommended batch size: {jepa.recommendedBatchSize}
        </p>
      </div>
    </div>
  );
}

interface FeatureAvailabilitySectionProps {
  assessment: CapabilityAssessment;
}

function FeatureAvailabilitySection({ assessment }: FeatureAvailabilitySectionProps) {
  const { features } = assessment;

  const groupedFeatures = {
    AI: features.filter((f) => f.id.startsWith('ai.') || f.id.startsWith('jepa.')),
    Knowledge: features.filter((f) => f.id.startsWith('knowledge.')),
    Media: features.filter((f) => f.id.startsWith('media.')),
    UI: features.filter((f) => f.id.startsWith('ui.')),
    Advanced: features.filter((f) => f.id.startsWith('advanced.')),
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Feature Availability
        </h3>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              {category}
            </h4>
            <div className="space-y-2">
              {categoryFeatures.map((feature) => (
                <FeatureRow key={feature.id} feature={feature} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FeatureRowProps {
  feature: {
    name: string;
    available: boolean;
    reason?: string;
    performanceImpact: number;
    expectedPerformance: string;
  };
}

function FeatureRow({ feature }: FeatureRowProps) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${
        feature.available
          ? 'bg-slate-50 dark:bg-slate-800'
          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {feature.available ? (
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium ${
              feature.available
                ? 'text-slate-900 dark:text-slate-100'
                : 'text-red-900 dark:text-red-100'
            }`}
          >
            {feature.name}
          </div>
          {!feature.available && feature.reason && (
            <div className="text-xs text-red-700 dark:text-red-300 mt-0.5">
              {feature.reason}
            </div>
          )}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400">
          Impact: {feature.performanceImpact}
        </div>
      </div>
    </div>
  );
}

interface RecommendationsSectionProps {
  recommendations: string[];
}

function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
  if (recommendations.length === 0) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
        Recommendations
      </h3>
      <ul className="space-y-2">
        {recommendations.map((rec, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>{rec}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface TechnicalDetailsProps {
  profile: HardwareProfile;
  score: number;
}

function TechnicalDetails({ profile, score }: TechnicalDetailsProps) {
  return (
    <details className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <summary className="cursor-pointer p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Technical Details
        </h3>
      </summary>
      <div className="p-4 pt-0">
        <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto">
          {JSON.stringify({ ...profile, overallScore: score }, null, 2)}
        </pre>
      </div>
    </details>
  );
}
