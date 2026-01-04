'use client';

/**
 * Theme Selector Component
 *
 * Allows users to browse, preview, and select themes.
 *
 * @module components/theme
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Check,
  Search,
  Star,
  Download,
  Upload,
  Trash2,
  Eye,
} from 'lucide-react';
import {
  themeRegistry,
  ThemeConfig,
  ThemeId,
  ThemeCategory,
  ThemeMode,
} from '@/lib/theme';

interface ThemeSelectorProps {
  /** Currently selected theme ID */
  selectedThemeId?: ThemeId;
  /** Callback when theme is selected */
  onThemeSelect: (themeId: ThemeId) => void;
  /** Callback when theme is applied */
  onThemeApply?: (themeId: ThemeId) => void;
  /** Show only specific mode (optional) */
  modeFilter?: ThemeMode;
  /** Allow custom themes */
  allowCustom?: boolean;
  /** Compact display mode */
  compact?: boolean;
}

/**
 * Theme card component
 */
function ThemeCard({
  theme,
  isSelected,
  isActive,
  onSelect,
  onApply,
  onPreview,
  onDelete,
  compact,
}: {
  theme: ThemeConfig;
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
  onApply: () => void;
  onPreview: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  const { metadata, colors } = theme;

  return (
    <div
      className={`
        relative group bg-white dark:bg-slate-900 rounded-xl border-2 transition-all
        ${isSelected ? 'border-blue-500 shadow-lg' : 'border-slate-200 dark:border-slate-800'}
        hover:shadow-md
      `}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Theme preview colors */}
      <div className="h-2 rounded-t-xl flex overflow-hidden">
        <div
          className="flex-1"
          style={{ backgroundColor: `hsl(${colors.primary})` }}
          aria-hidden="true"
        />
        <div
          className="flex-1"
          style={{ backgroundColor: `hsl(${colors.secondary})` }}
          aria-hidden="true"
        />
        <div
          className="flex-1"
          style={{ backgroundColor: `hsl(${colors.accent})` }}
          aria-hidden="true"
        />
        <div
          className="flex-1"
          style={{ backgroundColor: `hsl(${colors.background})` }}
          aria-hidden="true"
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {metadata.name}
              </h3>
              {metadata.featured && (
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" aria-label="Featured theme" />
              )}
              {isActive && (
                <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                  Active
                </span>
              )}
            </div>
            {!compact && metadata.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                {metadata.description}
              </p>
            )}
          </div>

          {/* Checkmark for selected theme */}
          {isSelected && (
            <div
              className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
              aria-label="Selected theme"
            >
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Theme tags */}
        {!compact && metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {metadata.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={onSelect}
            className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            aria-label={`Select ${metadata.name} theme`}
          >
            Select
          </button>
          <button
            onClick={onPreview}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label={`Preview ${metadata.name} theme`}
          >
            <Eye className="w-4 h-4" />
          </button>
          {!compact && metadata.category === ThemeCategory.CUSTOM && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              aria-label={`Delete ${metadata.name} theme`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main theme selector component
 */
export function ThemeSelector({
  selectedThemeId,
  onThemeSelect,
  onThemeApply,
  modeFilter,
  allowCustom = true,
  compact = false,
}: ThemeSelectorProps) {
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<ThemeId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<ThemeMode | 'all'>('all');
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load themes
  useEffect(() => {
    const loadThemes = async () => {
      try {
        await themeRegistry.initialize();
        const allThemes = themeRegistry.getAllThemes();
        setThemes(allThemes);
        setActiveThemeId(themeRegistry.getActiveThemeId());
      } catch (error) {
        console.error('[ThemeSelector] Failed to load themes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadThemes();
  }, []);

  // Filter themes
  const filteredThemes = themes.filter((theme) => {
    // Mode filter
    if (modeFilter && theme.mode !== modeFilter) {
      return false;
    }

    // User mode filter
    if (filterMode !== 'all' && theme.mode !== filterMode) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = theme.metadata.name.toLowerCase().includes(query);
      const matchesDesc = theme.metadata.description?.toLowerCase().includes(query);
      const matchesTags = theme.metadata.tags.some((tag) =>
        tag.toLowerCase().includes(query)
      );

      if (!matchesName && !matchesDesc && !matchesTags) {
        return false;
      }
    }

    return true;
  });

  // Group themes by category
  const builtinThemes = filteredThemes.filter(
    (t) => t.metadata.category === ThemeCategory.BUILT_IN
  );
  const customThemes = filteredThemes.filter(
    (t) => t.metadata.category === ThemeCategory.CUSTOM
  );

  // Handle theme selection
  const handleThemeSelect = useCallback(
    (themeId: ThemeId) => {
      onThemeSelect(themeId);
    },
    [onThemeSelect]
  );

  // Handle theme apply
  const handleThemeApply = useCallback(
    async (themeId: ThemeId) => {
      try {
        await themeRegistry.applyTheme(themeId);
        setActiveThemeId(themeId);
        onThemeApply?.(themeId);
      } catch (error) {
        console.error('[ThemeSelector] Failed to apply theme:', error);
      }
    },
    [onThemeApply]
  );

  // Handle theme delete
  const handleThemeDelete = useCallback(
    async (themeId: ThemeId) => {
      if (confirm('Are you sure you want to delete this theme?')) {
        try {
          await themeRegistry.unregisterTheme(themeId);
          const updated = themeRegistry.getAllThemes();
          setThemes(updated);
        } catch (error) {
          console.error('[ThemeSelector] Failed to delete theme:', error);
        }
      }
    },
    []
  );

  // Handle theme preview
  const handleThemePreview = useCallback(async (themeId: ThemeId) => {
    try {
      await themeRegistry.applyTheme(themeId);
      setActiveThemeId(themeId);
    } catch (error) {
      console.error('[ThemeSelector] Failed to preview theme:', error);
    }
  }, []);

  // Handle import
  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        await themeRegistry.importTheme(text);
        const updated = themeRegistry.getAllThemes();
        setThemes(updated);
        setShowImport(false);
      } catch (error) {
        console.error('[ThemeSelector] Failed to import theme:', error);
        alert('Failed to import theme: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }

      // Reset input
      event.target.value = '';
    },
    []
  );

  // Handle export
  const handleExport = useCallback(() => {
    if (!selectedThemeId) return;

    try {
      const json = themeRegistry.exportTheme(selectedThemeId);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedThemeId}-theme.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[ThemeSelector] Failed to export theme:', error);
      alert('Failed to export theme');
    }
  }, [selectedThemeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">Loading themes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Themes
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Customize the appearance of PersonalLog
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {allowCustom && selectedThemeId && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Export selected theme"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}

          {allowCustom && (
            <label className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                aria-label="Import theme file"
              />
            </label>
          )}
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search themes..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search themes"
          />
        </div>

        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as ThemeMode | 'all')}
          className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by mode"
        >
          <option value="all">All Modes</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      {/* Built-in themes */}
      {builtinThemes.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Built-in Themes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {builtinThemes.map((theme) => (
              <ThemeCard
                key={theme.metadata.id}
                theme={theme}
                isSelected={selectedThemeId === theme.metadata.id}
                isActive={activeThemeId === theme.metadata.id}
                onSelect={() => handleThemeSelect(theme.metadata.id)}
                onApply={() => handleThemeApply(theme.metadata.id)}
                onPreview={() => handleThemePreview(theme.metadata.id)}
                compact={compact}
              />
            ))}
          </div>
        </section>
      )}

      {/* Custom themes */}
      {allowCustom && customThemes.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Custom Themes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customThemes.map((theme) => (
              <ThemeCard
                key={theme.metadata.id}
                theme={theme}
                isSelected={selectedThemeId === theme.metadata.id}
                isActive={activeThemeId === theme.metadata.id}
                onSelect={() => handleThemeSelect(theme.metadata.id)}
                onApply={() => handleThemeApply(theme.metadata.id)}
                onPreview={() => handleThemePreview(theme.metadata.id)}
                onDelete={() => handleThemeDelete(theme.metadata.id)}
                compact={compact}
              />
            ))}
          </div>
        </section>
      )}

      {/* No themes found */}
      {filteredThemes.length === 0 && (
        <div className="text-center py-8">
          <Palette className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 dark:text-slate-400">No themes found</p>
          {searchQuery && (
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
              Try adjusting your search or filters
            </p>
          )}
        </div>
      )}
    </div>
  );
}
