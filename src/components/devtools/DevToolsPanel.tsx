/**
 * DevTools Panel - Main Developer Tools Container
 *
 * Floating, dockable panel with multiple developer tools tabs.
 *
 * @component components/devtools/DevToolsPanel
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Maximize2, Minimize2, ToggleLeft, ToggleRight, Wrench } from 'lucide-react';
import { StateInspector } from './StateInspector';
import { NetworkMonitor } from './NetworkMonitor';
import { PerformanceProfiler } from './PerformanceProfiler';
import { PluginDebugger } from './PluginDebugger';
import { DevToolsConsole } from './Console';
import { ComponentTree } from './ComponentTree';
import type { LogEntry } from '../../lib/devtools/logger';
import { logger } from '../../lib/devtools/logger';

type DevToolsTab = 'state' | 'network' | 'performance' | 'plugins' | 'console' | 'components';

interface DevToolsPanelProps {
  /** Initially open */
  defaultOpen?: boolean;

  /** Default tab */
  defaultTab?: DevToolsTab;

  /** Position */
  position?: 'right' | 'left' | 'bottom';

  /** Size (px or %) */
  size?: number;

  /** On close */
  onClose?: () => void;

  /** Show toggle button */
  showToggle?: boolean;
}

interface DevToolsState {
  isOpen: boolean;
  activeTab: DevToolsTab;
  isMaximized: boolean;
  position: 'right' | 'left' | 'bottom';
  size: number;
  isDragging: boolean;
}

export function DevToolsPanel({
  defaultOpen = false,
  defaultTab = 'console',
  position = 'right',
  size = 400,
  onClose,
  showToggle = true,
}: DevToolsPanelProps) {
  const [state, setState] = useState<DevToolsState>({
    isOpen: defaultOpen,
    activeTab: defaultTab,
    isMaximized: false,
    position,
    size,
    isDragging: false,
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Update document class when open state changes
  useEffect(() => {
    if (state.isOpen) {
      document.body.classList.add('devtools-open');
    } else {
      document.body.classList.remove('devtools-open');
    }

    return () => {
      document.body.classList.remove('devtools-open');
    };
  }, [state.isOpen]);

  // Log DevTools events
  useEffect(() => {
    if (state.isOpen) {
      logger.info('DevTools opened', { tab: state.activeTab }, 'system', 'DevToolsPanel');
    } else {
      logger.info('DevTools closed', {}, 'system', 'DevToolsPanel');
    }
  }, [state.isOpen, state.activeTab]);

  // Toggle DevTools
  const toggle = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  // Close DevTools
  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
    onClose?.();
  }, [onClose]);

  // Set active tab
  const setActiveTab = useCallback((tab: DevToolsTab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  // Toggle maximize
  const toggleMaximize = useCallback(() => {
    setState((prev) => ({ ...prev, isMaximized: !prev.isMaximized }));
  }, []);

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setState((prev) => ({ ...prev, isDragging: true }));

    const startX = e.clientX;
    const startY = e.clientY;
    const startSize = state.size;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = state.position === 'right' ? startX - e.clientX : e.clientX - startX;
      const deltaY = state.position === 'bottom' ? startY - e.clientY : e.clientY - startY;

      let newSize: number;

      if (state.position === 'bottom') {
        newSize = Math.max(200, Math.min(window.innerHeight - 100, startSize + deltaY));
      } else {
        newSize = Math.max(300, Math.min(window.innerWidth - 100, startSize + deltaX));
      }

      setState((prev) => ({ ...prev, size: newSize }));
    };

    const handleMouseUp = () => {
      setState((prev) => ({ ...prev, isDragging: false }));
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [state.position, state.size]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + D to toggle
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggle();
      }

      // Escape to close
      if (e.key === 'Escape' && state.isOpen) {
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle, close, state.isOpen]);

  // If not open and showToggle is false, render nothing
  if (!state.isOpen && !showToggle) {
    return null;
  }

  const tabs: Array<{ id: DevToolsTab; label: string; icon: React.ReactNode }> = [
    { id: 'state', label: 'State', icon: <ToggleLeft className="w-4 h-4" /> },
    { id: 'network', label: 'Network', icon: <ToggleRight className="w-4 h-4" /> },
    { id: 'performance', label: 'Performance', icon: <Maximize2 className="w-4 h-4" /> },
    { id: 'plugins', label: 'Plugins', icon: <Wrench className="w-4 h-4" /> },
    { id: 'console', label: 'Console', icon: <X className="w-4 h-4" /> },
    { id: 'components', label: 'Components', icon: <Minimize2 className="w-4 h-4" /> },
  ];

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    backgroundColor: 'var(--background)',
    border: '1px solid var(--border)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    display: state.isOpen ? 'flex' : 'none',
    flexDirection: 'column',
  };

  if (state.position === 'right') {
    panelStyle.right = '0';
    panelStyle.top = '0';
    panelStyle.bottom = '0';
    panelStyle.width = state.isMaximized ? '100%' : `${state.size}px`;
  } else if (state.position === 'left') {
    panelStyle.left = '0';
    panelStyle.top = '0';
    panelStyle.bottom = '0';
    panelStyle.width = state.isMaximized ? '100%' : `${state.size}px`;
  } else {
    panelStyle.left = '0';
    panelStyle.right = '0';
    panelStyle.bottom = '0';
    panelStyle.height = state.isMaximized ? '100%' : `${state.size}px`;
  }

  return (
    <>
      {/* Toggle Button */}
      {showToggle && !state.isOpen && (
        <button
          onClick={toggle}
          className="fixed top-4 right-4 z-[9999] p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          title="Toggle DevTools (Cmd+Shift+D)"
        >
          <Wrench className="w-5 h-5" />
        </button>
      )}

      {/* DevTools Panel */}
      {state.isOpen && (
        <div ref={panelRef} style={panelStyle} className="devtools-panel">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-semibold">DevTools</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMaximize}
                className="p-1 hover:bg-muted rounded transition-colors"
                title={state.isMaximized ? 'Restore' : 'Maximize'}
              >
                {state.isMaximized ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={close}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Close (Escape)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-2 py-1 border-b border-border overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
                  state.activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {state.activeTab === 'state' && <StateInspector />}
            {state.activeTab === 'network' && <NetworkMonitor />}
            {state.activeTab === 'performance' && <PerformanceProfiler />}
            {state.activeTab === 'plugins' && <PluginDebugger />}
            {state.activeTab === 'console' && <DevToolsConsole />}
            {state.activeTab === 'components' && <ComponentTree />}
          </div>

          {/* Resize Handle */}
          <div
            ref={resizeHandleRef}
            onMouseDown={handleResizeStart}
            className={`absolute bg-border hover:bg-primary transition-colors ${
              state.position === 'right'
                ? 'left-0 top-0 bottom-0 w-1 cursor-ew-resize'
                : state.position === 'left'
                ? 'right-0 top-0 bottom-0 w-1 cursor-ew-resize'
                : 'left-0 right-0 top-0 h-1 cursor-ns-resize'
            }`}
          />
        </div>
      )}
    </>
  );
}
