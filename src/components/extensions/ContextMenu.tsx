'use client';

/**
 * Context Menu Extension Component
 *
 * Context menu that integrates with context menu extensions.
 * Displays contextual actions based on target.
 *
 * @module components/extensions/ContextMenu
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useExtensionsByPoint } from '@/hooks/useExtensions';
import type { ContextMenuExtension, ContextMenuContext } from '@/lib/extensions/types';

interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  context: Partial<ContextMenuContext>;
}

export function ContextMenu({ isOpen, onClose, position, context }: ContextMenuProps) {
  const extensions = useExtensionsByPoint('ui.context.menu' as any);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter extensions by context type
  const filteredExtensions = extensions.filter((ext) => {
    const menuExt = ext as ContextMenuExtension;
    const contextType = (context as any).context;
    return contextType && menuExt.context === contextType;
  });

  // Sort by position
  const sortedExtensions = [...filteredExtensions].sort((a, b) => {
    const posA = (a as ContextMenuExtension).position || 0;
    const posB = (b as ContextMenuExtension).position || 0;
    return posA - posB;
  });

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Adjust position if menu goes off screen
  const adjustedPosition = useMemo(() => {
    if (!isOpen) return position;

    // Simple bounds check (actual adjustment happens after render)
    return position;
  }, [isOpen, position]);

  const handleAction = async (extension: ContextMenuExtension) => {
    try {
      await extension.action({
        extensionId: extension.id,
        target: context.target || 'app',
        targetId: context.targetId,
        data: context.data,
        event: context.event || new MouseEvent('contextmenu'),
      } as ContextMenuContext);
      onClose();
    } catch (error) {
      console.error('Context menu action error:', error);
    }
  };

  if (!isOpen || sortedExtensions.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 py-1"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {sortedExtensions.map((ext, idx) => {
        const menuExt = ext as ContextMenuExtension;
        const prevExt = sortedExtensions[idx - 1] as ContextMenuExtension;

        return (
          <div key={ext.id}>
            {menuExt.separator && idx > 0 && !prevExt.separator && (
              <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
            )}
            <button
              onClick={() => handleAction(menuExt)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {menuExt.icon && (
                <span className="w-4 h-4 text-slate-400">
                  {/* TODO: Render icon by name */}
                  <span>•</span>
                </span>
              )}
              <span>{menuExt.label}</span>
            </button>
          </div>
        );
      })}

      {sortedExtensions.length === 0 && (
        <div className="px-3 py-2 text-sm text-slate-400">No actions available</div>
      )}
    </div>
  );
}

/**
 * Context menu trigger hook
 */
export function useContextMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [context, setContext] = useState<Partial<ContextMenuContext>>({});

  const show = (e: MouseEvent | React.MouseEvent, ctx: Partial<ContextMenuContext>) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setContext({
      ...ctx,
      event: e as MouseEvent,
    });
    setIsOpen(true);
  };

  const hide = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    position,
    context,
    show,
    hide,
  };
}

/**
 * Higher-order component for context menu
 */
export function withContextMenu<T extends object>(
  Component: React.ComponentType<T>,
  menuContext: Partial<ContextMenuContext>
) {
  return function WithContextMenu(props: T) {
    const { show, hide, isOpen, position, context } = useContextMenu();

    const handleContextMenu = (e: React.MouseEvent) => {
      show(e, menuContext);
    };

    return (
      <>
        <Component onContextMenu={handleContextMenu} {...props} />
        <ContextMenu isOpen={isOpen} onClose={hide} position={position} context={context} />
      </>
    );
  };
}
