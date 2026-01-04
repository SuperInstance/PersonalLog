'use client';

/**
 * Appearance Settings Page
 *
 * Manage theme selection, creation, and display preferences.
 *
 * @module app/settings/appearance
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Eye,
  Sun,
  Moon,
  Type,
  Accessibility,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import {
  ThemeSelector,
  ThemeEditor,
} from '@/components/theme';
import {
  themeRegistry,
  ThemeId,
  ThemeConfig,
  ThemeSettings,
  ThemeMode,
} from '@/lib/theme';

type View = 'select' | 'create' | 'edit';

export default function AppearanceSettingsPage() {
  const [view, setView] = useState<View>('select');
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId | undefined>();
  const [activeThemeId, setActiveThemeId] = useState<ThemeId | null>(null);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    autoSwitch: false,
    lightThemeId: 'default' as ThemeId,
    darkThemeId: 'dark' as ThemeId,
    fontSizeMultiplier: 1.0,
    reducedMotion: false,
    highContrast: false,
  });
  const [editTheme, setEditTheme] = useState<ThemeConfig | undefined>();

  // Initialize theme registry
  useEffect(() => {
    const init = async () => {
      try {
        await themeRegistry.initialize();
        const activeId = themeRegistry.getActiveThemeId();
        setActiveThemeId(activeId);
        setSelectedThemeId(activeId || undefined);

        const settings = themeRegistry.getSettings();
        setThemeSettings(settings);
      } catch (error) {
        console.error('[AppearanceSettings] Failed to initialize:', error);
      }
    };

    init();
  }, []);

  // Handle theme selection
  const handleThemeSelect = useCallback((themeId: ThemeId) => {
    setSelectedThemeId(themeId);
  }, []);

  // Handle theme apply
  const handleThemeApply = useCallback(async (themeId: ThemeId) => {
    try {
      await themeRegistry.applyTheme(themeId);
      setActiveThemeId(themeId);
    } catch (error) {
      console.error('[AppearanceSettings] Failed to apply theme:', error);
    }
  }, []);

  // Handle settings change
  const handleSettingsChange = useCallback(
    async (updates: Partial<ThemeSettings>) => {
      const updated = { ...themeSettings, ...updates };
      setThemeSettings(updated);
      try {
        await themeRegistry.updateSettings(updated);
      } catch (error) {
        console.error('[AppearanceSettings] Failed to update settings:', error);
      }
    },
    [themeSettings]
  );

  // Handle create new theme
  const handleCreateTheme = () => {
    setEditTheme(undefined);
    setView('create');
  };

  // Handle edit theme
  const handleEditTheme = () => {
    if (!selectedThemeId) return;

    const theme = themeRegistry.getTheme(selectedThemeId);
    if (theme && theme.metadata.category === 'custom') {
      setEditTheme(theme);
      setView('edit');
    }
  };

  // Handle save theme
  const handleSaveTheme = (theme: ThemeConfig) => {
    setSelectedThemeId(theme.metadata.id);
    setView('select');
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditTheme(undefined);
    setView('select');
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
                aria-label="Go back to settings"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Appearance
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Customize your PersonalLog experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Settings */}
          <div className="space-y-6">
            {/* Theme Selection */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Themes
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <button
                  onClick={() => setView('select')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    view === 'select'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  aria-pressed={view === 'select'}
                >
                  <Eye className="w-5 h-5" />
                  <div>
                    <div className="font-medium">Browse Themes</div>
                    <div className="text-sm opacity-70">Select from built-in and custom themes</div>
                  </div>
                </button>

                <button
                  onClick={handleCreateTheme}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    view === 'create'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  aria-pressed={view === 'create'}
                >
                  <Palette className="w-5 h-5" />
                  <div>
                    <div className="font-medium">Create Theme</div>
                    <div className="text-sm opacity-70">Design your own custom theme</div>
                  </div>
                </button>

                {selectedThemeId && view === 'select' && (() => {
                  const theme = themeRegistry.getTheme(selectedThemeId);
                  return theme && theme.metadata.category === 'custom' ? (
                    <button
                      onClick={handleEditTheme}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <Type className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Edit Theme</div>
                        <div className="text-sm opacity-70">Modify the selected theme</div>
                      </div>
                    </button>
                  ) : null;
                })()}
              </div>
            </section>

            {/* Display Settings */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sun className="w-5 h-5" />
                  Display Settings
                </h2>
              </div>
              <div className="p-4 space-y-4">
                {/* Auto-switch theme */}
                <div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Auto-switch theme
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={themeSettings.autoSwitch}
                        onChange={(e) =>
                          handleSettingsChange({ autoSwitch: e.target.checked })
                        }
                        className="sr-only"
                        aria-label="Toggle auto-switch theme"
                      />
                      <div
                        className={`w-11 h-6 rounded-full transition-colors ${
                          themeSettings.autoSwitch
                            ? 'bg-blue-500'
                            : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            themeSettings.autoSwitch ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </div>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Automatically switch between light and dark themes based on system preference
                  </p>
                </div>

                {/* Light theme selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Light Theme
                  </label>
                  <select
                    value={themeSettings.lightThemeId}
                    onChange={(e) =>
                      handleSettingsChange({ lightThemeId: e.target.value as ThemeId })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {themeRegistry
                      .getThemesByMode(ThemeMode.LIGHT)
                      .map((theme) => (
                        <option key={theme.metadata.id} value={theme.metadata.id}>
                          {theme.metadata.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Dark theme selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Dark Theme
                  </label>
                  <select
                    value={themeSettings.darkThemeId}
                    onChange={(e) =>
                      handleSettingsChange({ darkThemeId: e.target.value as ThemeId })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {themeRegistry
                      .getThemesByMode(ThemeMode.DARK)
                      .map((theme) => (
                        <option key={theme.metadata.id} value={theme.metadata.id}>
                          {theme.metadata.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Accessibility */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Accessibility className="w-5 h-5" />
                  Accessibility
                </h2>
              </div>
              <div className="p-4 space-y-4">
                {/* Reduced motion */}
                <div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Reduced motion
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={themeSettings.reducedMotion}
                        onChange={(e) =>
                          handleSettingsChange({ reducedMotion: e.target.checked })
                        }
                        className="sr-only"
                        aria-label="Toggle reduced motion"
                      />
                      <div
                        className={`w-11 h-6 rounded-full transition-colors ${
                          themeSettings.reducedMotion
                            ? 'bg-blue-500'
                            : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            themeSettings.reducedMotion ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </div>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Minimize animations and transitions
                  </p>
                </div>

                {/* High contrast */}
                <div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      High contrast
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={themeSettings.highContrast}
                        onChange={(e) =>
                          handleSettingsChange({ highContrast: e.target.checked })
                        }
                        className="sr-only"
                        aria-label="Toggle high contrast"
                      />
                      <div
                        className={`w-11 h-6 rounded-full transition-colors ${
                          themeSettings.highContrast
                            ? 'bg-blue-500'
                            : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            themeSettings.highContrast ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </div>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Increase contrast for better visibility
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {view === 'select' && (
              <ThemeSelector
                selectedThemeId={selectedThemeId}
                onThemeSelect={handleThemeSelect}
                onThemeApply={handleThemeApply}
                allowCustom
              />
            )}

            {(view === 'create' || view === 'edit') && (
              <ThemeEditor
                initialTheme={editTheme}
                onSave={handleSaveTheme}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
