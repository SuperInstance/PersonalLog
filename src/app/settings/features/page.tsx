'use client';

/**
 * Feature Flags Settings Page
 *
 * View and manage feature flags. Shows all 35+ features with their
 * current state, hardware requirements, and allows user overrides.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, RotateCcw, Search, Filter } from 'lucide-react';
import { FeatureFlagManager } from '@/lib/flags/manager';
import { DEFAULT_FEATURES } from '@/lib/flags/registry';
import type { FeatureFlag, FeatureCategory } from '@/lib/flags/types';
import { FeatureFlagToggle } from '@/components/settings/FeatureFlagToggle';

export default function FeaturesPage() {
  const [features, setFeatures] = useState<FeatureFlag[]>(DEFAULT_FEATURES);
  const [evaluations, setEvaluations] = useState<Map<string, any>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExperimentalOnly, setShowExperimentalOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [manager, setManager] = useState<FeatureFlagManager | null>(null);

  useEffect(() => {
    const initManager = async () => {
      try {
        const mgr = new FeatureFlagManager();
        await mgr.initialize();
        setManager(mgr);

        // Evaluate all features
        const evalMap = new Map();
        for (const feature of DEFAULT_FEATURES) {
          try {
            const evaluation = mgr.evaluate(feature.id);
            evalMap.set(feature.id, evaluation);
          } catch (err) {
            console.error(`Failed to evaluate ${feature.id}:`, err);
          }
        }
        setEvaluations(evalMap);
      } catch (err) {
        console.error('Failed to initialize feature manager:', err);
      } finally {
        setLoading(false);
      }
    };

    initManager();
  }, []);

  const handleToggle = async (featureId: string, enabled: boolean) => {
    if (!manager) return;

    try {
      if (enabled) {
        manager.enable(featureId);
      } else {
        manager.disable(featureId);
      }

      // Re-evaluate
      const evaluation = manager.evaluate(featureId);
      setEvaluations(prev => new Map(prev).set(featureId, evaluation));
    } catch (err) {
      console.error('Failed to toggle feature:', err);
    }
  };

  const handleResetAll = async () => {
    if (!manager) return;

    if (!confirm('Reset all feature flags to auto mode?')) return;

    try {
      for (const feature of DEFAULT_FEATURES) {
        manager.reset(feature.id);
      }

      // Re-evaluate all
      const evalMap = new Map();
      for (const feature of DEFAULT_FEATURES) {
        const evaluation = manager.evaluate(feature.id);
        evalMap.set(feature.id, evaluation);
      }
      setEvaluations(evalMap);
    } catch (err) {
      console.error('Failed to reset features:', err);
    }
  };

  const categories: Array<{ value: FeatureCategory | 'all'; label: string; count: number }> = [
    { value: 'all', label: 'All Features', count: DEFAULT_FEATURES.length },
    { value: 'ai', label: 'AI', count: DEFAULT_FEATURES.filter(f => f.category === 'ai').length },
    { value: 'ui', label: 'UI', count: DEFAULT_FEATURES.filter(f => f.category === 'ui').length },
    {
      value: 'knowledge',
      label: 'Knowledge',
      count: DEFAULT_FEATURES.filter(f => f.category === 'knowledge').length
    },
    { value: 'media', label: 'Media', count: DEFAULT_FEATURES.filter(f => f.category === 'media').length },
    {
      value: 'advanced',
      label: 'Advanced',
      count: DEFAULT_FEATURES.filter(f => f.category === 'advanced').length
    },
  ];

  const filteredFeatures = features.filter(feature => {
    // Category filter
    if (selectedCategory !== 'all' && feature.category !== selectedCategory) {
      return false;
    }

    // Experimental filter
    if (showExperimentalOnly && !feature.experimental) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        feature.name.toLowerCase().includes(query) ||
        feature.description.toLowerCase().includes(query) ||
        feature.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return true;
  });

  const enabledCount = DEFAULT_FEATURES.filter(f => {
    const evalResult = evaluations.get(f.id);
    return evalResult?.enabled ?? f.state === 'enabled';
  }).length;

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
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Feature Flags
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {enabledCount} of {DEFAULT_FEATURES.length} features enabled
                </p>
              </div>
            </div>
            <button
              onClick={handleResetAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors
                    ${selectedCategory === cat.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }
                  `}
                >
                  {cat.label}
                  <span className="ml-2 opacity-70">({cat.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Experimental Filter */}
          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="experimental-only"
              checked={showExperimentalOnly}
              onChange={(e) => setShowExperimentalOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label
              htmlFor="experimental-only"
              className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Show experimental features only
            </label>
          </div>
        </div>

        {/* Features List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading features...</p>
          </div>
        ) : filteredFeatures.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <Filter className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No Features Found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFeatures.map(feature => (
              <FeatureFlagToggle
                key={feature.id}
                feature={feature}
                evaluation={evaluations.get(feature.id)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            About Feature Flags
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            Feature flags enable or disable functionality based on your hardware capabilities and preferences.
            Features marked as &quot;Auto&quot; are automatically managed by the system, while others can be manually toggled.
          </p>
          <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span><strong>Override:</strong> You manually enabled/disabled this feature</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span><strong>Experimental:</strong> Feature may be unstable or incomplete</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
              <span><strong>Auto:</strong> Automatically managed based on hardware</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
