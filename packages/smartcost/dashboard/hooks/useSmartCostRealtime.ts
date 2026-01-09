/**
 * SmartCost Real-time Hook
 *
 * WebSocket integration for live dashboard updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { DashboardState, ConnectionStatus } from '../types/dashboard';

export interface UseSmartCostRealtimeOptions {
  /** WebSocket URL */
  url?: string;

  /** Enable real-time updates */
  enabled?: boolean;

  /** Reconnect interval in ms */
  reconnectInterval?: number;

  /** Max reconnect attempts */
  maxReconnectAttempts?: number;

  /** On connection status change */
  onConnectionChange?: (status: ConnectionStatus) => void;

  /** On error */
  onError?: (error: Error) => void;

  /** On state update */
  onUpdate?: (state: Partial<DashboardState>) => void;
}

export interface UseSmartCostRealtimeReturn {
  /** Current state */
  state: DashboardState;

  /** Connection status */
  connectionStatus: ConnectionStatus;

  /** Connect */
  connect: () => void;

  /** Disconnect */
  disconnect: () => void;

  /** Manually refresh */
  refresh: () => Promise<void>;

  /** Send command to server */
  sendCommand: (command: string, data?: any) => void;
}

/**
 * Hook for real-time SmartCost dashboard updates
 */
export function useSmartCostRealtime(
  initialState: Partial<DashboardState> = {},
  options: UseSmartCostRealtimeOptions = {}
): UseSmartCostRealtimeReturn {
  const {
    url = 'ws://localhost:3000',
    enabled = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    onConnectionChange,
    onError,
    onUpdate,
  } = options;

  // State
  const [state, setState] = useState<DashboardState>({
    costMetrics: initialState.costMetrics || {
      totalCost: 0,
      totalTokens: 0,
      totalRequests: 0,
      cacheHitRate: 0,
      totalSavings: 0,
      savingsPercent: 0,
      avgCostPerRequest: 0,
      avgTokensPerRequest: 0,
      costByProvider: {},
      costByModel: {},
      requestsByProvider: {},
      budgetUtilization: 0,
      periodStart: Date.now(),
      periodEnd: Date.now(),
    },
    cacheStats: initialState.cacheStats || {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      semanticHits: 0,
      exactHits: 0,
      totalSavings: 0,
      avgSimilarity: 0,
    },
    routingStats: initialState.routingStats || {
      totalDecisions: 0,
      decisionsByStrategy: {} as any,
      mostCommonProvider: '',
      mostCommonModel: '',
      avgConfidence: 0,
    },
    performanceMetrics: initialState.performanceMetrics || {
      avgLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      throughput: 0,
    },
    providerUsage: initialState.providerUsage || [],
    modelUsage: initialState.modelUsage || [],
    alerts: initialState.alerts || [],
    recentRequests: initialState.recentRequests || [],
    costHistory: initialState.costHistory || [],
    connectionStatus: {
      connected: false,
      type: 'websocket',
      lastConnected: 0,
      reconnectAttempts: 0,
      quality: 'good',
    },
    lastUpdate: Date.now(),
    loading: false,
    error: null,
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    type: 'websocket',
    lastConnected: 0,
    reconnectAttempts: 0,
    quality: 'good',
  });

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  /**
   * Update connection status
   */
  const updateConnectionStatus = useCallback((updates: Partial<ConnectionStatus>) => {
    setConnectionStatus((prev) => {
      const newStatus = { ...prev, ...updates };
      onConnectionChange?.(newStatus);
      return newStatus;
    });
  }, [onConnectionChange]);

  /**
   * Handle WebSocket connection
   */
  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: reconnectInterval,
        reconnectionAttempts: maxReconnectAttempts,
      });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        console.log('[SmartCost] WebSocket connected');
        reconnectAttemptsRef.current = 0;
        updateConnectionStatus({
          connected: true,
          lastConnected: Date.now(),
          reconnectAttempts: 0,
          quality: 'excellent',
        });

        // Request initial state
        socket.emit('getState');
      });

      socket.on('disconnect', (reason) => {
        console.log('[SmartCost] WebSocket disconnected:', reason);
        updateConnectionStatus({
          connected: false,
          quality: 'poor',
        });
      });

      socket.on('connect_error', (error) => {
        console.error('[SmartCost] WebSocket connection error:', error);
        reconnectAttemptsRef.current++;

        updateConnectionStatus({
          connected: false,
          reconnectAttempts: reconnectAttemptsRef.current,
          quality: 'poor',
        });

        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          onError?.(new Error(`Failed to connect after ${maxReconnectAttempts} attempts`));
        }
      });

      // State updates
      socket.on('stateUpdate', (newState: Partial<DashboardState>) => {
        setState((prev) => ({
          ...prev,
          ...newState,
          lastUpdate: Date.now(),
        }));
        onUpdate?.(newState);
      });

      socket.on('costMetrics', (metrics) => {
        setState((prev) => ({
          ...prev,
          costMetrics: metrics,
          lastUpdate: Date.now(),
        }));
      });

      socket.on('cacheStats', (stats) => {
        setState((prev) => ({
          ...prev,
          cacheStats: stats,
          lastUpdate: Date.now(),
        }));
      });

      socket.on('routingStats', (stats) => {
        setState((prev) => ({
          ...prev,
          routingStats: stats,
          lastUpdate: Date.now(),
        }));
      });

      socket.on('performanceMetrics', (metrics) => {
        setState((prev) => ({
          ...prev,
          performanceMetrics: metrics,
          lastUpdate: Date.now(),
        }));
      });

      socket.on('providerUsage', (usage) => {
        setState((prev) => ({
          ...prev,
          providerUsage: usage,
          lastUpdate: Date.now(),
        }));
      });

      socket.on('modelUsage', (usage) => {
        setState((prev) => ({
          ...prev,
          modelUsage: usage,
          lastUpdate: Date.now(),
        }));
      });

      socket.on('alert', (alert) => {
        setState((prev) => ({
          ...prev,
          alerts: [alert, ...prev.alerts].slice(0, 100), // Keep last 100
          lastUpdate: Date.now(),
        }));
      });

      socket.on('requestLog', (log) => {
        setState((prev) => ({
          ...prev,
          recentRequests: [log, ...prev.recentRequests].slice(0, 50), // Keep last 50
          lastUpdate: Date.now(),
        }));
      });

      socket.on('costHistory', (history) => {
        setState((prev) => ({
          ...prev,
          costHistory: history,
          lastUpdate: Date.now(),
        }));
      });

      // Initial state
      socket.on('state', (fullState: DashboardState) => {
        setState(fullState);
      });

      // Connection quality monitoring
      socket.on('ping', () => {
        socket.emit('pong');
      });

    } catch (error) {
      console.error('[SmartCost] Failed to create WebSocket connection:', error);
      onError?.(error as Error);
      updateConnectionStatus({
        connected: false,
        quality: 'poor',
      });
    }
  }, [url, enabled, reconnectInterval, maxReconnectAttempts, updateConnectionStatus, onError, onUpdate]);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    updateConnectionStatus({
      connected: false,
      quality: 'good',
    });
  }, [updateConnectionStatus]);

  /**
   * Manually refresh state
   */
  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const response = await fetch(`${url}/api/state`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const newState = await response.json();
      setState(newState);
    } catch (error) {
      console.error('[SmartCost] Failed to refresh state:', error);
      onError?.(error as Error);
      setState((prev) => ({
        ...prev,
        error: (error as Error).message,
      }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [url, onError]);

  /**
   * Send command to server
   */
  const sendCommand = useCallback((command: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('command', { command, data });
    } else {
      console.warn('[SmartCost] Cannot send command: not connected');
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Auto-refresh if not connected (fallback to polling)
  useEffect(() => {
    if (!connectionStatus.connected && enabled) {
      const interval = setInterval(() => {
        refresh();
      }, 5000); // Poll every 5 seconds if not connected

      return () => clearInterval(interval);
    }
  }, [connectionStatus.connected, enabled, refresh]);

  return {
    state,
    connectionStatus,
    connect,
    disconnect,
    refresh,
    sendCommand,
  };
}

/**
 * Hook for accessing specific dashboard metrics
 */
export function useSmartCostMetrics() {
  // This would integrate with the SmartCost core library
  // to get metrics without WebSocket
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    // Placeholder - would call SmartCost.getMetrics()
  }, []);

  return metrics;
}
