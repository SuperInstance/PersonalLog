'use client';

/**
 * Extension Renderer Component
 *
 * Renders extensions at various points in the UI.
 * Supports sidebar panels, toolbar buttons, status bar items, etc.
 *
 * @module components/extensions/ExtensionRenderer
 */

import { useMemo } from 'react';
import { useExtensionsByPoint } from '@/hooks/useExtensions';
import type { ExtensionPoint } from '@/lib/extensions/types';

interface ExtensionRendererProps {
  point: ExtensionPoint;
  empty?: React.ReactNode;
}

export function ExtensionRenderer({ point, empty }: ExtensionRendererProps) {
  const extensions = useExtensionsByPoint(point);

  if (extensions.length === 0) {
    return <>{empty}</>;
  }

  return (
    <>
      {extensions.map((ext) => {
        // Render based on extension type
        switch (ext.point) {
          case 'ui.sidebar.panel':
            return <SidebarPanelRenderer key={ext.id} extension={ext as any} />;

          case 'ui.toolbar.button':
            return <ToolbarButtonRenderer key={ext.id} extension={ext as any} />;

          case 'ui.status.item':
            return <StatusBarItemRenderer key={ext.id} extension={ext as any} />;

          case 'ui.modal.dialog':
            return <ModalDialogRenderer key={ext.id} extension={ext as any} />;

          default:
            return null;
        }
      })}
    </>
  );
}

// ========================================================================
// SIDEBAR PANEL RENDERER
// ========================================================================

interface SidebarPanelRendererProps {
  extension: any;
}

function SidebarPanelRenderer({ extension }: SidebarPanelRendererProps) {
  if (typeof extension.render !== 'function') {
    return null;
  }

  try {
    return <>{extension.render()}</>;
  } catch (error) {
    console.error('Error rendering sidebar panel:', error);
    return null;
  }
}

// ========================================================================
// TOOLBAR BUTTON RENDERER
// ========================================================================

function ToolbarButtonRenderer({ extension }: SidebarPanelRendererProps) {
  if (typeof extension.onClick !== 'function') {
    return null;
  }

  const handleClick = async () => {
    try {
      await extension.onClick({
        extensionId: extension.id,
        route: window.location.pathname,
      });
    } catch (error) {
      console.error('Error executing toolbar action:', error);
    }
  };

  const variantClasses: Record<string, string> = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100',
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  const variantClass = variantClasses[extension.variant || 'default'] || variantClasses.default;

  return (
    <button
      onClick={handleClick}
      className={`${variantClass} px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2`}
      title={extension.label}
    >
      {extension.icon && (
        <span className="w-4 h-4">
          {/* TODO: Render icon by name */}
          <span>•</span>
        </span>
      )}
      <span>{extension.label}</span>
    </button>
  );
}

// ========================================================================
// STATUS BAR ITEM RENDERER
// ========================================================================

function StatusBarItemRenderer({ extension }: SidebarPanelRendererProps) {
  if (typeof extension.render !== 'function') {
    return null;
  }

  try {
    return <>{extension.render()}</>;
  } catch (error) {
    console.error('Error rendering status bar item:', error);
    return null;
  }
}

// ========================================================================
// MODAL DIALOG RENDERER
// ============================================================================

interface ModalDialogRendererProps {
  extension: any;
  isOpen?: boolean;
  onClose?: () => void;
  data?: any;
}

function ModalDialogRenderer({ extension, isOpen = false, onClose, data }: ModalDialogRendererProps) {
  if (!isOpen || typeof extension.render !== 'function') {
    return null;
  }

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  };
  const sizeClass = sizeClasses[extension.size || 'md'] || sizeClasses.md;

  try {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Dialog */}
        <div className={`relative w-full ${sizeClass} mx-4 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800`}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {extension.title}
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {extension.render({ onClose, data })}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering modal dialog:', error);
    return null;
  }
}

// ========================================================================
// SPECIALIZED RENDERERS
// ============================================================================

/**
 * Render sidebar panels
 */
export function SidebarPanels({ position }: { position: 'top' | 'bottom' }) {
  const extensions = useExtensionsByPoint('ui.sidebar.panel' as any);

  const filtered = extensions.filter((ext) => (ext as any).position === position);

  if (filtered.length === 0) return null;

  return (
    <>
      {filtered.map((ext) => (
        <SidebarPanelRenderer key={ext.id} extension={ext} />
      ))}
    </>
  );
}

/**
 * Render toolbar buttons
 */
export function ToolbarButtons({ position }: { position: 'left' | 'right' }) {
  const extensions = useExtensionsByPoint('ui.toolbar.button' as any);

  const filtered = extensions.filter((ext) => (ext as any).position === position);

  if (filtered.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {filtered.map((ext) => (
        <ToolbarButtonRenderer key={ext.id} extension={ext} />
      ))}
    </div>
  );
}

/**
 * Render status bar items
 */
export function StatusBarItems({ position }: { position: 'left' | 'right' }) {
  const extensions = useExtensionsByPoint('ui.status.item' as any);

  const filtered = extensions
    .filter((ext) => (ext as any).position === position)
    .sort((a, b) => ((a as any).order || 0) - ((b as any).order || 0));

  if (filtered.length === 0) return null;

  return (
    <div className="flex items-center gap-4">
      {filtered.map((ext) => (
        <StatusBarItemRenderer key={ext.id} extension={ext} />
      ))}
    </div>
  );
}
