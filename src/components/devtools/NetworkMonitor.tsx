/**
 * Network Monitor - Monitor API Calls and Network Activity
 *
 * @component components/devtools/NetworkMonitor
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Download, Upload, Clock, XCircle, CheckCircle } from 'lucide-react';

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  duration: number;
  timestamp: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
}

export function NetworkMonitor() {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(null);
  const [filter, setFilter] = useState<'all' | 'fetch' | 'xhr' | 'websocket'>('all');

  // Intercept fetch API
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const start = performance.now();
      const input = args[0];
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      const method = args[1]?.method || (input instanceof Request ? input.method : 'GET');

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;

        const request: NetworkRequest = {
          id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          duration,
          timestamp: Date.now(),
        };

        setRequests((prev) => [request, ...prev].slice(0, 100)); // Keep last 100

        return response;
      } catch (error) {
        const duration = performance.now() - start;

        const request: NetworkRequest = {
          id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url,
          method,
          status: 0,
          statusText: error instanceof Error ? error.message : 'Network Error',
          duration,
          timestamp: Date.now(),
        };

        setRequests((prev) => [request, ...prev].slice(0, 100));
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Clear requests
  const clearRequests = () => {
    setRequests([]);
    setSelectedRequest(null);
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    if (filter === 'all') return true;
    // Add more sophisticated filtering based on request type
    return true;
  });

  // Get status icon
  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status >= 400 && status < 500) return <XCircle className="w-4 h-4 text-yellow-500" />;
    if (status >= 500) return <XCircle className="w-4 h-4 text-red-500" />;
    if (status === 0) return <XCircle className="w-4 h-4 text-gray-500" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Format size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  // Calculate stats
  const stats = {
    total: requests.length,
    successful: requests.filter((r) => r.status >= 200 && r.status < 300).length,
    errors: requests.filter((r) => r.status >= 400 || r.status === 0).length,
    avgDuration: requests.length > 0
      ? requests.reduce((sum, r) => sum + r.duration, 0) / requests.length
      : 0,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Stats */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{stats.successful}</div>
            <div className="text-xs text-muted-foreground">Success</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{stats.errors}</div>
            <div className="text-xs text-muted-foreground">Errors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
            <div className="text-xs text-muted-foreground">Avg Duration</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['all', 'fetch', 'xhr', 'websocket'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded capitalize transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={clearRequests}
          className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Requests List */}
      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className="w-1/2 overflow-auto border-r border-border">
          {filteredRequests.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No network requests yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredRequests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`w-full p-2 text-left hover:bg-muted transition-colors ${
                    selectedRequest?.id === request.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <span className="text-xs font-mono font-semibold">{request.method}</span>
                    <span className="text-xs text-muted-foreground truncate flex-1">{request.url}</span>
                    <span className="text-xs">{formatDuration(request.duration)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="w-1/2 overflow-auto p-4">
          {selectedRequest ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Request URL</h4>
                <div className="text-xs font-mono bg-muted p-2 rounded">{selectedRequest.url}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Method</h4>
                  <div className="text-xs font-mono bg-muted p-2 rounded">{selectedRequest.method}</div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Status</h4>
                  <div className="text-xs font-mono bg-muted p-2 rounded flex items-center gap-2">
                    {getStatusIcon(selectedRequest.status)}
                    {selectedRequest.status} {selectedRequest.statusText}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Duration</h4>
                  <div className="text-xs font-mono bg-muted p-2 rounded flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {formatDuration(selectedRequest.duration)}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Timestamp</h4>
                  <div className="text-xs font-mono bg-muted p-2 rounded">
                    {new Date(selectedRequest.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {selectedRequest.requestHeaders && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Request Headers</h4>
                  <div className="text-xs font-mono bg-muted p-2 rounded max-h-40 overflow-auto">
                    {Object.entries(selectedRequest.requestHeaders).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-muted-foreground">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.responseHeaders && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Response Headers</h4>
                  <div className="text-xs font-mono bg-muted p-2 rounded max-h-40 overflow-auto">
                    {Object.entries(selectedRequest.responseHeaders).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-muted-foreground">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              Select a request to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
