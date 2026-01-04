/**
 * DevTools Page - Full-Screen Developer Tools
 *
 * Dedicated page for comprehensive debugging and development.
 *
 * @page /debug
 */

'use client';

import React from 'react';
import { DevToolsPanel } from '../../components/devtools/DevToolsPanel';
import { Wrench } from 'lucide-react';

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-muted/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Wrench className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">DevTools</h1>
                <p className="text-sm text-muted-foreground">
                  Comprehensive debugging and development tools
                </p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">Cmd+Shift+D</kbd> to toggle
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-left">
                <div className="font-semibold">Clear All Data</div>
                <div className="text-xs opacity-80">Reset application to initial state</div>
              </button>
              <button className="w-full px-4 py-2 bg-muted rounded-md hover:bg-muted/80 transition-colors text-left">
                <div className="font-semibold">Generate Mock Data</div>
                <div className="text-xs text-muted-foreground">Populate with test data</div>
              </button>
              <button className="w-full px-4 py-2 bg-muted rounded-md hover:bg-muted/80 transition-colors text-left">
                <div className="font-semibold">Export State</div>
                <div className="text-xs text-muted-foreground">Download application state</div>
              </button>
              <button className="w-full px-4 py-2 bg-muted rounded-md hover:bg-muted/80 transition-colors text-left">
                <div className="font-semibold">Import State</div>
                <div className="text-xs text-muted-foreground">Load application state</div>
              </button>
            </div>
          </div>

          {/* Environment Info */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Environment</h2>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform:</span>
                <span>{typeof window !== 'undefined' ? navigator.platform : 'Server'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User Agent:</span>
                <span className="truncate max-w-xs">
                  {typeof window !== 'undefined' ? navigator.userAgent.slice(0, 50) + '...' : 'Server'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Language:</span>
                <span>{typeof window !== 'undefined' ? navigator.language : 'Server'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cookies Enabled:</span>
                <span>{typeof window !== 'undefined' ? navigator.cookieEnabled.toString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">On-line:</span>
                <span>{typeof window !== 'undefined' ? navigator.onLine.toString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Performance Info */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Performance</h2>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory:</span>
                <span>
                  {(performance as any).memory
                    ? `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)} MB`
                    : 'Not available'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory Limit:</span>
                <span>
                  {(performance as any).memory
                    ? `${Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)} MB`
                    : 'Not available'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Navigation Timing:</span>
                <span>
                  {performance.getEntriesByType('navigation')[0]
                    ? `${Math.round((performance.getEntriesByType('navigation')[0] as any).loadEventEnd)}ms`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Feature Flags */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Debug Features</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Verbose Logging</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Performance Monitoring</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Network Interception</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Component Profiling</span>
              </label>
            </div>
          </div>
        </div>

        {/* DevTools Panel Preview */}
        <div className="mt-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">DevTools Panel</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Access the full DevTools panel with comprehensive debugging capabilities
            </p>
            <div className="h-[600px] border border-border rounded-lg overflow-hidden">
              <DevToolsPanel defaultOpen={true} showToggle={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
