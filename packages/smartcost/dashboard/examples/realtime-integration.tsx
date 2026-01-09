/**
 * SmartCost Dashboard - Real-time Integration Example
 *
 * Example showing how to integrate with real-time data source
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useSmartCostRealtime } from '../hooks/useSmartCostRealtime';
import type { DashboardState } from '../types/dashboard';

export function RealtimeIntegrationExample() {
  const [isConnected, setIsConnected] = useState(false);

  const {
    state,
    connectionStatus,
    connect,
    disconnect,
    refresh,
    sendCommand,
  } = useSmartCostRealtime(
    {}, // Initial state
    {
      url: 'ws://localhost:3000',
      enabled: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      onConnectionChange: (status) => {
        console.log('Connection status:', status);
        setIsConnected(status.connected);
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
      },
      onUpdate: (update) => {
        console.log('State update:', update);
      },
    }
  );

  // Manual connection control
  useEffect(() => {
    // Auto-connect on mount
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Real-time Integration</h1>

        {/* Connection Status */}
        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Connection Status</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {connectionStatus.connected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={connect}
                disabled={connectionStatus.connected}
                className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
              >
                Connect
              </button>
              <button
                onClick={disconnect}
                disabled={!connectionStatus.connected}
                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                Disconnect
              </button>
              <button
                onClick={refresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Refresh
              </button>
            </div>
          </div>

          {connectionStatus.reconnectAttempts > 0 && (
            <p className="text-sm text-yellow-600 mt-2">
              Reconnection attempts: {connectionStatus.reconnectAttempts}
            </p>
          )}
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost</p>
            <p className="text-2xl font-bold">
              ${state.costMetrics.totalCost.toFixed(2)}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
            <p className="text-2xl font-bold">
              {state.costMetrics.totalRequests}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</p>
            <p className="text-2xl font-bold">
              {(state.cacheStats.hitRate * 100).toFixed(1)}%
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Savings</p>
            <p className="text-2xl font-bold text-green-600">
              ${state.costMetrics.totalSavings.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Send Command */}
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h3 className="font-semibold mb-3">Send Command</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Command"
              className="flex-1 px-3 py-2 rounded-lg"
            />
            <button
              onClick={() => sendCommand('test', { foo: 'bar' })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Example with custom data fetching
export function CustomDataFetchingExample() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Custom data fetching logic
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch('/api/smartcost/state');
        const data = await response.json();
        setState(data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!state) {
    return <div>Failed to load data</div>;
  }

  return (
    <div>
      <h1>Custom Data Fetching</h1>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
}

// Example with polling fallback
export function PollingFallbackExample() {
  const { state, connectionStatus } = useSmartCostRealtime(
    {},
    {
      url: 'ws://localhost:3000',
      enabled: true,
      onConnectionChange: (status) => {
        console.log('Connection:', status.connected ? 'WebSocket' : 'Polling');
      },
    }
  );

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          Polling Fallback Example
        </h1>

        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="font-semibold">
            Connection Mode: {connectionStatus.connected ? 'WebSocket' : 'Polling'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {connectionStatus.connected
              ? 'Real-time updates enabled'
              : 'Fallback to polling every 5 seconds'}
          </p>
        </div>

        {/* Display metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost</p>
            <p className="text-2xl font-bold">
              ${state.costMetrics.totalCost.toFixed(2)}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Requests</p>
            <p className="text-2xl font-bold">
              {state.costMetrics.totalRequests}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Last Update</p>
            <p className="text-2xl font-bold">
              {new Date(state.lastUpdate).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
