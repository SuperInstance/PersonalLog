'use client';

/**
 * Personalization Settings Page
 *
 * View and manage learned preferences, confidence levels, and opt-outs.
 * Displays what the system has learned about your preferences and provides controls.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Brain,
  Sliders,
  Download,
  Upload,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { getPersonalizationAPI } from '@/lib/personalization';
import type {
  CommunicationPreferences,
  UIPreferences,
  ContentPreferences,
  InteractionPatterns,
} from '@/lib/personalization';

export default function PersonalizationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [communication, setCommunication] = useState<CommunicationPreferences | null>(null);
  const [ui, setUi] = useState<UIPreferences | null>(null);
  const [content, setContent] = useState<ContentPreferences | null>(null);
  const [patterns, setPatterns] = useState<InteractionPatterns | null>(null);
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [categoryOptOuts, setCategoryOptOuts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPersonalizationData();
  }, []);

  const loadPersonalizationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const api = getPersonalizationAPI();
      const model = api.getModel();

      // Get preferences
      const prefs = model.getPreferences().getAll();
      setCommunication(prefs.communication as CommunicationPreferences);
      setUi(prefs.ui as UIPreferences);
      setContent(prefs.content as ContentPreferences);
      setPatterns(model.getPatterns());

      // Get learning state
      const learningState = model.getLearningState();
      setLearningEnabled(learningState.enabled);

      // Load opt-outs from localStorage
      const savedOptOuts = localStorage.getItem('personalization-opt-outs');
      if (savedOptOuts) {
        setCategoryOptOuts(new Set(JSON.parse(savedOptOuts)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load personalization data');
      console.error('Personalization loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const api = getPersonalizationAPI();
      const model = api.getModel();
      const prefs = model.getPreferences().getAll();
      const patterns = model.getPatterns();

      const exportData = {
        preferences: prefs,
        patterns: patterns,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `personalization-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export data: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate and import
        if (data.preferences || data.patterns) {
          alert('Preferences imported successfully!');
          await loadPersonalizationData();
        } else {
          alert('Invalid personalization file');
        }
      } catch (err) {
        alert('Failed to import: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };
    input.click();
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all learned preferences? This cannot be undone.')) {
      return;
    }

    try {
      const api = getPersonalizationAPI();
      api.clearLearning();
      await loadPersonalizationData();
      alert('All learned preferences have been cleared.');
    } catch (err) {
      alert('Failed to clear: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleToggleLearning = (enabled: boolean) => {
    setLearningEnabled(enabled);
    const api = getPersonalizationAPI();
    api.toggleLearning(enabled);
  };

  const handleCategoryOptOut = (category: string) => {
    const newOptOuts = new Set(categoryOptOuts);
    if (newOptOuts.has(category)) {
      newOptOuts.delete(category);
    } else {
      newOptOuts.add(category);
    }
    setCategoryOptOuts(newOptOuts);
    localStorage.setItem('personalization-opt-outs', JSON.stringify([...newOptOuts]));
  };

  const ConfidenceBar = ({ confidence, label }: { confidence: number; label: string }) => {
    const percentage = Math.min(100, Math.max(0, confidence * 100));
    const color = percentage >= 80 ? 'green' : percentage >= 50 ? 'amber' : 'red';

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-400">{label}</span>
          <span className="text-slate-900 dark:text-slate-100 font-medium">{percentage.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-${color}-500 dark:bg-${color}-400 transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
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
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-600 bg-clip-text text-transparent">
                  Personalization
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Learned preferences and behavior patterns
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Personalization
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <>
            {/* Learning Toggle */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Brain className="w-6 h-6 text-green-500" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Learning Status
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Control whether the system learns from your behavior
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {learningEnabled ? 'Learning Enabled' : 'Learning Disabled'}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {learningEnabled
                        ? 'The system will adapt to your preferences'
                        : 'Preferences will not be updated automatically'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={learningEnabled}
                      onChange={(e) => handleToggleLearning(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* Communication Preferences */}
            {communication && (
              <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Sliders className="w-6 h-6 text-green-500" />
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Communication Preferences
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        How you prefer to interact with AI
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <PreferenceItem
                      label="Response Length"
                      value={communication.preferredResponseLength || 'medium'}
                      confidence={communication.confidence?.preferredResponseLength || 0}
                    />
                    <PreferenceItem
                      label="Tone"
                      value={communication.preferredTone || 'neutral'}
                      confidence={communication.confidence?.preferredTone || 0}
                    />
                    <PreferenceItem
                      label="Emoji Usage"
                      value={communication.emojiUsage ? 'Enabled' : 'Disabled'}
                      confidence={communication.confidence?.emojiUsage || 0}
                    />
                    <PreferenceItem
                      label="Formality"
                      value={communication.formalityLevel || 'casual'}
                      confidence={communication.confidence?.formalityLevel || 0}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* UI Preferences */}
            {ui && (
              <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Sliders className="w-6 h-6 text-green-500" />
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        UI Preferences
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Interface layout and appearance
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <PreferenceItem
                      label="Theme"
                      value={ui.theme || 'system'}
                      confidence={ui.confidence?.theme || 0}
                    />
                    <PreferenceItem
                      label="Density"
                      value={ui.density || 'comfortable'}
                      confidence={ui.confidence?.density || 0}
                    />
                    <PreferenceItem
                      label="Font Size"
                      value={ui.fontSize || 'medium'}
                      confidence={ui.confidence?.fontSize || 0}
                    />
                    <PreferenceItem
                      label="Layout"
                      value={ui.layout || 'default'}
                      confidence={ui.confidence?.layout || 0}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Content Preferences */}
            {content && (
              <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Sliders className="w-6 h-6 text-green-500" />
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Content Preferences
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Topics and content display preferences
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Preferred Topics
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {content.preferredTopics && content.preferredTopics.length > 0 ? (
                          content.preferredTopics.map((topic) => (
                            <span
                              key={topic}
                              className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm"
                            >
                              {topic}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            No topics learned yet
                          </span>
                        )}
                      </div>
                    </div>
                    <PreferenceItem
                      label="Reading Level"
                      value={content.readingLevel || 'intermediate'}
                      confidence={content.confidence?.readingLevel || 0}
                    />
                    <PreferenceItem
                      label="Detail Level"
                      value={content.detailLevel || 'balanced'}
                      confidence={content.confidence?.detailLevel || 0}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Usage Patterns */}
            {patterns && (
              <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Brain className="w-6 h-6 text-green-500" />
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Usage Patterns
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Detected patterns in your behavior
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <PatternItem
                      label="Peak Hour"
                      value={patterns.preferredHours?.[0] !== undefined ? `${patterns.preferredHours[0]}:00` : 'Not set'}
                    />
                    <PatternItem
                      label="Session Length"
                      value={patterns.avgSessionLength ? `${Math.round(patterns.avgSessionLength / 60000)} min` : 'Not set'}
                    />
                    <PatternItem
                      label="Errors/Session"
                      value={patterns.avgErrorsPerSession?.toFixed(1) || '0'}
                    />
                    <PatternItem
                      label="Help Requests"
                      value={patterns.helpRequestRate?.toFixed(1) || '0'}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Category Opt-Outs */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <EyeOff className="w-6 h-6 text-green-500" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Learning Controls
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Disable learning for specific categories
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {['communication', 'ui', 'content'].map((category) => {
                  const isOptedOut = categoryOptOuts.has(category);
                  return (
                    <div
                      key={category}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {isOptedOut ? (
                          <EyeOff className="w-5 h-5 text-slate-400" />
                        ) : (
                          <Eye className="w-5 h-5 text-green-500" />
                        )}
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                            {category}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {isOptedOut ? 'Learning disabled' : 'Learning enabled'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCategoryOptOut(category)}
                        className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                          isOptedOut
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                        }`}
                      >
                        {isOptedOut ? 'Enable' : 'Disable'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Data Management */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Sliders className="w-6 h-6 text-green-500" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Data Management
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Export, import, or delete your preferences
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleExport}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export Preferences
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Import Preferences
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete All Data
                  </button>
                </div>
              </div>
            </section>

            {/* Info Section */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-6">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                About Personalization
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                The personalization system learns from your behavior to provide a better experience.
                All data is stored locally on your device and never sent to any server. You can
                export your preferences, disable learning for specific categories, or delete all
                learned data at any time.
              </p>
              <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  <span><strong>Confidence Level:</strong> How sure the system is about a preference</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span><strong>Category Controls:</strong> Disable learning for specific areas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span><strong>Data Portability:</strong> Export and import your preferences</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

interface PreferenceItemProps {
  label: string;
  value: string;
  confidence: number;
}

function PreferenceItem({ label, value, confidence }: PreferenceItemProps) {
  const percentage = Math.min(100, Math.max(0, confidence * 100));
  const color = percentage >= 80 ? 'green' : percentage >= 50 ? 'amber' : 'red';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-sm text-slate-900 dark:text-slate-100 capitalize">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-${color}-500 dark:bg-${color}-400 transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Confidence: {percentage.toFixed(0)}%
      </div>
    </div>
  );
}

interface PatternItemProps {
  label: string;
  value: string;
}

function PatternItem({ label, value }: PatternItemProps) {
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
