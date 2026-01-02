/**
 * React Hooks for A/B Testing
 *
 * Provides React hooks for integrating experiments into components.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type {
  Experiment,
  Variant,
  MetricValue,
  ExperimentResults,
} from './types';
import { getGlobalManager } from './manager';

/**
 * Hook to get variant assignment for an experiment
 *
 * @param experimentId - Experiment ID
 * @param userId - User ID
 * @returns Assigned variant or null
 */
export function useVariant(
  experimentId: string,
  userId?: string
): Variant | null {
  const [variant, setVariant] = useState<Variant | null>(null);
  const managerRef = useRef(getGlobalManager());

  useEffect(() => {
    if (!userId) {
      return;
    }

    const manager = managerRef.current;
    const assigned = manager.assignVariant(
      experimentId,
      userId,
      getSessionId()
    );

    setVariant(assigned);
  }, [experimentId, userId]);

  return variant;
}

/**
 * Hook to check if a specific variant is active
 *
 * @param experimentId - Experiment ID
 * @param variantId - Variant ID to check
 * @param userId - User ID
 * @returns Whether the variant is active
 */
export function useIsVariant(
  experimentId: string,
  variantId: string,
  userId?: string
): boolean {
  const variant = useVariant(experimentId, userId);
  return variant?.id === variantId;
}

/**
 * Hook to track a metric for the current user
 *
 * @returns Function to track metrics
 */
export function useMetricTracker(): (
  experimentId: string,
  variantId: string,
  metricId: string,
  value: number
) => void {
  const managerRef = useRef(getGlobalManager());

  return useCallback((
    experimentId: string,
    variantId: string,
    metricId: string,
    value: number
  ) => {
    const manager = managerRef.current;
    const userId = getUserId();
    const sessionId = getSessionId();

    manager.trackMetric(experimentId, variantId, metricId, value, userId, sessionId);
  }, []);
}

/**
 * Hook to track binary metrics (success/failure)
 *
 * @returns Function to track binary events
 */
export function useBinaryMetric(): (
  experimentId: string,
  variantId: string,
  metricId: string,
  success: boolean
) => void {
  const trackMetric = useMetricTracker();

  return useCallback((
    experimentId: string,
    variantId: string,
    metricId: string,
    success: boolean
  ) => {
    trackMetric(experimentId, variantId, metricId, success ? 1 : 0);
  }, [trackMetric]);
}

/**
 * Hook to track duration metrics
 *
 * @returns Object with start and end tracking functions
 */
export function useDurationMetric() {
  const managerRef = useRef(getGlobalManager());
  const startTimeRef = useRef<number | null>(null);
  const experimentIdRef = useRef<string | null>(null);
  const variantIdRef = useRef<string | null>(null);
  const metricIdRef = useRef<string | null>(null);

  const start = useCallback((
    experimentId: string,
    variantId: string,
    metricId: string
  ) => {
    startTimeRef.current = performance.now();
    experimentIdRef.current = experimentId;
    variantIdRef.current = variantId;
    metricIdRef.current = metricId;
  }, []);

  const end = useCallback(() => {
    if (startTimeRef.current === null) {
      console.warn('[Experiments] Duration tracking not started');
      return;
    }

    const endTime = performance.now();
    const duration = endTime - startTimeRef.current;

    const manager = managerRef.current;
    const userId = getUserId();
    const sessionId = getSessionId();

    if (experimentIdRef.current && variantIdRef.current && metricIdRef.current) {
      manager.trackMetric(
        experimentIdRef.current,
        variantIdRef.current,
        metricIdRef.current,
        duration,
        userId,
        sessionId
      );
    }

    // Reset
    startTimeRef.current = null;
    experimentIdRef.current = null;
    variantIdRef.current = null;
    metricIdRef.current = null;
  }, []);

  return { start, end };
}

/**
 * Hook to get experiment results
 *
 * @param experimentId - Experiment ID
 * @returns Experiment results or undefined
 */
export function useExperimentResults(experimentId: string): ExperimentResults | undefined {
  const [results, setResults] = useState<ExperimentResults | undefined>();
  const managerRef = useRef(getGlobalManager());

  useEffect(() => {
    const manager = managerRef.current;
    const currentResults = manager.getResults(experimentId);
    setResults(currentResults);

    // Set up interval to refresh results
    const interval = setInterval(() => {
      const updated = manager.getResults(experimentId);
      setResults(updated);
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [experimentId]);

  return results;
}

/**
 * Hook to get experiment by ID
 *
 * @param experimentId - Experiment ID
 * @returns Experiment or undefined
 */
export function useExperiment(experimentId: string): Experiment | undefined {
  const [experiment, setExperiment] = useState<Experiment | undefined>();
  const managerRef = useRef(getGlobalManager());

  useEffect(() => {
    const manager = managerRef.current;
    const exp = manager.getExperiment(experimentId);
    setExperiment(exp);
  }, [experimentId]);

  return experiment;
}

/**
 * Hook to create and manage an experiment
 *
 * @returns Object with experiment management functions
 */
export function useCreateExperiment() {
  const managerRef = useRef(getGlobalManager());

  const create = useCallback((
    definition: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const manager = managerRef.current;
    return manager.createExperiment(definition);
  }, []);

  const start = useCallback((id: string) => {
    const manager = managerRef.current;
    manager.startExperiment(id);
  }, []);

  const pause = useCallback((id: string) => {
    const manager = managerRef.current;
    manager.pauseExperiment(id);
  }, []);

  const complete = useCallback((id: string) => {
    const manager = managerRef.current;
    manager.completeExperiment(id);
  }, []);

  return { create, start, pause, complete };
}

/**
 * Hook to expose user to variant (mark as exposed)
 *
 * @param experimentId - Experiment ID
 * @param variantId - Variant ID
 * @param userId - User ID
 */
export function useExposeVariant(
  experimentId: string,
  variantId: string,
  userId?: string
): void {
  useEffect(() => {
    if (!userId) {
      return;
    }

    // Mark user as exposed
    // This is handled internally by the assignment engine
    // but we can trigger any side effects here
    const manager = getGlobalManager();

    // Track exposure as a metric
    manager.trackMetric(experimentId, variantId, 'exposure', 1, userId, getSessionId());
  }, [experimentId, variantId, userId]);
}

/**
 * Helper function to get user ID
 * In a real app, this would come from authentication
 */
function getUserId(): string {
  if (typeof window === 'undefined') {
    return 'server-user';
  }

  let userId = localStorage.getItem('personallog-user-id');
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('personallog-user-id', userId);
  }
  return userId;
}

/**
 * Helper function to get session ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') {
    return 'server-session';
  }

  let sessionId = sessionStorage.getItem('personallog-session-id');
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('personallog-session-id', sessionId);
  }
  return sessionId;
}
