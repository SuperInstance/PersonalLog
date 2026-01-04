'use client';

/**
 * Theme Editor Component
 *
 * Allows users to create and edit custom themes with live preview.
 *
 * @module components/theme
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Palette,
  Eye,
  Save,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';
import {
  ThemeConfig,
  ThemeId,
  ColorRole,
  calculateContrastRatio,
  parseHSL,
  hslToString,
  HSLColor,
  ThemeCategory,
  ThemeMode,
} from '@/lib/theme';
import { themeRegistry } from '@/lib/theme';

interface ThemeEditorProps {
  /** Theme to edit (optional for new themes) */
  initialTheme?: ThemeConfig;
  /** Callback when theme is saved */
  onSave?: (theme: ThemeConfig) => void;
  /** Callback when theme is exported */
  onExport?: (theme: ThemeConfig) => void;
}

/**
 * Color input component with contrast ratio display
 */
function ColorInput({
  label,
  value,
  onChange,
  foreground,
  showContrast,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  foreground?: string;
  showContrast?: boolean;
}) {
  const [hsl, setHsl] = useState<HSLColor>(() => parseHSL(value));

  useEffect(() => {
    try {
      setHsl(parseHSL(value));
    } catch (error) {
      console.error('Failed to parse HSL:', error);
    }
  }, [value]);

  const handleChange = (field: keyof HSLColor, newValue: number) => {
    const updated = { ...hsl, [field]: newValue };
    setHsl(updated);
    onChange(hslToString(updated));
  };

  let contrastInfo = null;
  if (showContrast && foreground) {
    try {
      const contrast = calculateContrastRatio(value, foreground);
      contrastInfo = (
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`text-xs font-medium ${
              contrast.aa ? 'text-green-600' : 'text-amber-600'
            }`}
          >
            {contrast.ratio}:1
          </span>
          <span
            className={`text-xs ${
              contrast.aaa ? 'text-green-600' : contrast.aa ? 'text-amber-600' : 'text-red-600'
            }`}
          >
            {contrast.aaa ? 'AAA' : contrast.aa ? 'AA' : 'Fail'}
          </span>
        </div>
      );
    } catch (error) {
      // Contrast calculation failed
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>

      {/* Color preview */}
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800"
          style={{ backgroundColor: `hsl(${value})` }}
          aria-hidden="true"
        />

        {/* HSL sliders */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-4">H</span>
            <input
              type="range"
              min="0"
              max="360"
              value={hsl.h}
              onChange={(e) => handleChange('h', parseFloat(e.target.value))}
              className="flex-1"
              aria-label={`${label} hue`}
            />
            <span className="text-xs text-slate-500 w-8 text-right">{Math.round(hsl.h)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-4">S</span>
            <input
              type="range"
              min="0"
              max="100"
              value={hsl.s}
              onChange={(e) => handleChange('s', parseFloat(e.target.value))}
              className="flex-1"
              aria-label={`${label} saturation`}
            />
            <span className="text-xs text-slate-500 w-8 text-right">{Math.round(hsl.s)}%</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-4">L</span>
            <input
              type="range"
              min="0"
              max="100"
              value={hsl.l}
              onChange={(e) => handleChange('l', parseFloat(e.target.value))}
              className="flex-1"
              aria-label={`${label} lightness`}
            />
            <span className="text-xs text-slate-500 w-8 text-right">{Math.round(hsl.l)}%</span>
          </div>
        </div>
      </div>

      {contrastInfo}

      {/* Text input for direct entry */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        placeholder="H S% L%"
        aria-label={`${label} value`}
      />
    </div>
  );
}

/**
 * Main theme editor component
 */
export function ThemeEditor({ initialTheme, onSave, onExport }: ThemeEditorProps) {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    if (initialTheme) {
      return { ...initialTheme };
    }

    // Default new theme template
    return {
      metadata: {
        id: `custom-${Date.now()}` as ThemeId,
        name: 'My Custom Theme',
        description: 'A custom theme',
        version: '1.0.0',
        author: {
          name: 'You',
        },
        category: ThemeCategory.CUSTOM,
        tags: ['custom'],
        previewColors: {
          primary: '221.2 83.2% 53.3%',
          secondary: '210 40% 96.1%',
          accent: '210 40% 96.1%',
          background: '0 0% 100%',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      mode: ThemeMode.LIGHT,
      colors: {
        background: '0 0% 100%',
        foreground: '222.2 84% 4.9%',
        card: '0 0% 100%',
        'card-foreground': '222.2 84% 4.9%',
        popover: '0 0% 100%',
        'popover-foreground': '222.2 84% 4.9%',
        primary: '221.2 83.2% 53.3%',
        'primary-foreground': '210 40% 98%',
        secondary: '210 40% 96.1%',
        'secondary-foreground': '222.2 47.4% 11.2%',
        muted: '210 40% 96.1%',
        'muted-foreground': '215.4 16.3% 46.9%',
        accent: '210 40% 96.1%',
        'accent-foreground': '222.2 47.4% 11.2%',
        destructive: '0 84.2% 60.2%',
        'destructive-foreground': '210 40% 98%',
        border: '214.3 31.8% 91.4%',
        input: '214.3 31.8% 91.4%',
        ring: '221.2 83.2% 53.3%',
      },
      typography: {
        families: {
          sans: {
            name: 'Inter',
            fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
            weights: [400, 500, 600, 700],
          },
        },
        sizes: {
          xs: { name: 'xs', value: 0.75, lineHeight: 1 },
          sm: { name: 'sm', value: 0.875, lineHeight: 1.25 },
          base: { name: 'base', value: 1, lineHeight: 1.5 },
          lg: { name: 'lg', value: 1.125, lineHeight: 1.75 },
          xl: { name: 'xl', value: 1.25, lineHeight: 1.75 },
          '2xl': { name: '2xl', value: 1.5, lineHeight: 2 },
          '3xl': { name: '3xl', value: 1.875, lineHeight: 2.25 },
          '4xl': { name: '4xl', value: 2.25, lineHeight: 2.5 },
        },
        weights: {
          light: 300,
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        lineHeights: {
          tight: 1.25,
          normal: 1.5,
          relaxed: 1.75,
          loose: 2,
        },
      },
    };
  });

  const [livePreview, setLivePreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Handle color change
  const handleColorChange = useCallback((colorKey: string, value: string) => {
    setTheme((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorKey]: value,
      },
      metadata: {
        ...prev.metadata,
        updatedAt: Date.now(),
      },
    }));
    setHasChanges(true);
  }, []);

  // Handle metadata change
  const handleMetadataChange = useCallback((field: string, value: any) => {
    setTheme((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value,
        updatedAt: Date.now(),
      },
    }));
    setHasChanges(true);
  }, []);

  // Apply live preview
  useEffect(() => {
    if (livePreview) {
      const timer = setTimeout(() => {
        themeRegistry.applyTheme(theme.metadata.id).catch(console.error);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [theme, livePreview]);

  // Handle save
  const handleSave = async () => {
    try {
      // Check if updating existing theme
      const existing = themeRegistry.getTheme(theme.metadata.id);
      if (existing && existing.metadata.category === 'custom') {
        await themeRegistry.updateTheme(theme.metadata.id, theme);
      } else {
        await themeRegistry.registerTheme(theme);
      }

      setHasChanges(false);
      onSave?.(theme);
    } catch (error) {
      console.error('[ThemeEditor] Failed to save theme:', error);
      alert('Failed to save theme: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Handle export
  const handleExport = () => {
    try {
      const json = themeRegistry.exportTheme(theme.metadata.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${theme.metadata.id}-theme.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onExport?.(theme);
    } catch (error) {
      console.error('[ThemeEditor] Failed to export theme:', error);
      alert('Failed to export theme');
    }
  };

  // Handle reset
  const handleReset = () => {
    if (initialTheme) {
      setTheme({ ...initialTheme });
    } else {
      window.location.reload();
    }
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {initialTheme ? 'Edit Theme' : 'Create Theme'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Customize colors and appearance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Live preview toggle */}
          <button
            onClick={() => setLivePreview(!livePreview)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              livePreview
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
            aria-pressed={livePreview}
          >
            <Eye className="w-4 h-4" />
            Live Preview
          </button>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Reset theme"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>

          {/* Export button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Export theme"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Save theme"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Metadata */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Theme Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Theme Name
            </label>
            <input
              type="text"
              value={theme.metadata.name}
              onChange={(e) => handleMetadataChange('name', e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Theme"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={theme.metadata.description || ''}
              onChange={(e) => handleMetadataChange('description', e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="A beautiful custom theme"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={theme.metadata.tags.join(', ')}
              onChange={(e) =>
                handleMetadataChange('tags', e.target.value.split(',').map((t) => t.trim()))
              }
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="custom, dark, minimal"
            />
          </div>
        </div>
      </section>

      {/* Colors */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Colors
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Background colors */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Background</h4>

            <ColorInput
              label="Background"
              value={theme.colors.background}
              onChange={(value) => handleColorChange('background', value)}
              foreground={theme.colors.foreground}
              showContrast
            />

            <ColorInput
              label="Card"
              value={theme.colors.card}
              onChange={(value) => handleColorChange('card', value)}
            />

            <ColorInput
              label="Popover"
              value={theme.colors.popover}
              onChange={(value) => handleColorChange('popover', value)}
            />
          </div>

          {/* Primary colors */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Primary</h4>

            <ColorInput
              label="Primary"
              value={theme.colors.primary}
              onChange={(value) => handleColorChange('primary', value)}
              foreground={theme.colors['primary-foreground']}
              showContrast
            />

            <ColorInput
              label="Primary Foreground"
              value={theme.colors['primary-foreground']}
              onChange={(value) => handleColorChange('primary-foreground', value)}
              foreground={theme.colors.primary}
              showContrast
            />
          </div>

          {/* Secondary colors */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Secondary</h4>

            <ColorInput
              label="Secondary"
              value={theme.colors.secondary}
              onChange={(value) => handleColorChange('secondary', value)}
              foreground={theme.colors['secondary-foreground']}
              showContrast
            />

            <ColorInput
              label="Secondary Foreground"
              value={theme.colors['secondary-foreground']}
              onChange={(value) => handleColorChange('secondary-foreground', value)}
              foreground={theme.colors.secondary}
              showContrast
            />
          </div>

          {/* Accent colors */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Accent</h4>

            <ColorInput
              label="Accent"
              value={theme.colors.accent}
              onChange={(value) => handleColorChange('accent', value)}
              foreground={theme.colors['accent-foreground']}
              showContrast
            />

            <ColorInput
              label="Accent Foreground"
              value={theme.colors['accent-foreground']}
              onChange={(value) => handleColorChange('accent-foreground', value)}
            />
          </div>

          {/* Destructive colors */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Destructive</h4>

            <ColorInput
              label="Destructive"
              value={theme.colors.destructive}
              onChange={(value) => handleColorChange('destructive', value)}
              foreground={theme.colors['destructive-foreground']}
              showContrast
            />

            <ColorInput
              label="Destructive Foreground"
              value={theme.colors['destructive-foreground']}
              onChange={(value) => handleColorChange('destructive-foreground', value)}
            />
          </div>

          {/* Border and input colors */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Borders</h4>

            <ColorInput
              label="Border"
              value={theme.colors.border}
              onChange={(value) => handleColorChange('border', value)}
            />

            <ColorInput
              label="Input"
              value={theme.colors.input}
              onChange={(value) => handleColorChange('input', value)}
            />

            <ColorInput
              label="Ring (Focus)"
              value={theme.colors.ring}
              onChange={(value) => handleColorChange('ring', value)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
