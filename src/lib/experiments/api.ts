/**
 * Convenience API for common A/B testing operations
 */

import type {
  Experiment,
  Variant,
  ExperimentResults,
  MetricType,
  GoalDirection,
  PrimaryObjective,
  ExperimentType,
} from './types';
import { getGlobalManager } from './manager';

/**
 * Create a new experiment with sensible defaults
 */
export function createExperiment(options: {
  name: string;
  description: string;
  type: ExperimentType;
  variants: Array<{
    id: string;
    name: string;
    config: Record<string, unknown>;
    isControl?: boolean;
    weight?: number;
  }>;
  primaryMetric: {
    id: string;
    name: string;
    type: MetricType;
    direction: GoalDirection;
  };
  additionalMetrics?: Array<{
    id: string;
    name: string;
    type: MetricType;
    direction: GoalDirection;
  }>;
  objective?: PrimaryObjective;
  duration?: number; // milliseconds
  trafficAllocation?: number;
  confidenceThreshold?: number;
  earlyStopping?: boolean;
  bandit?: boolean;
}): Experiment {
  const manager = getGlobalManager();

  const metrics = [
    {
      ...options.primaryMetric,
      primary: true,
      description: `${options.primaryMetric.name} (${options.primaryMetric.direction})`,
    },
    ...(options.additionalMetrics?.map(m => ({
      ...m,
      primary: false,
      description: `${m.name} (${m.direction})`,
    })) || []),
  ];

  const experiment = manager.createExperiment({
    name: options.name,
    description: options.description,
    type: options.type,
    variants: options.variants.map(v => ({
      ...v,
      weight: v.weight || 1,
      parameters: v.config,
    })),
    metrics,
    objective: options.objective || 'engagement',
    status: 'draft',
    startTime: null,
    endTime: null,
    plannedDuration: options.duration || 7 * 24 * 60 * 60 * 1000, // 1 week default
    trafficAllocation: options.trafficAllocation ?? 1.0,
    confidenceThreshold: options.confidenceThreshold || 0.95,
    earlyStoppingEnabled: options.earlyStopping ?? true,
    banditEnabled: options.bandit ?? true,
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return experiment;
}

/**
 * Get variant assignment for user
 */
export function getVariant(experimentId: string, userId?: string): Variant | null {
  const manager = getGlobalManager();

  if (!userId) {
    userId = getUserId();
  }

  return manager.assignVariant(experimentId, userId, getSessionId());
}

/**
 * Track a metric value
 */
export function trackMetric(
  experimentId: string,
  variantId: string,
  metricId: string,
  value: number,
  userId?: string
): void {
  const manager = getGlobalManager();

  if (!userId) {
    userId = getUserId();
  }

  manager.trackMetric(experimentId, variantId, metricId, value, userId, getSessionId());
}

/**
 * Track a binary metric (success/failure)
 */
export function trackSuccess(
  experimentId: string,
  variantId: string,
  metricId: string,
  success: boolean,
  userId?: string
): void {
  trackMetric(experimentId, variantId, metricId, success ? 1 : 0, userId);
}

/**
 * Track a duration metric
 */
export function trackDuration(
  experimentId: string,
  variantId: string,
  metricId: string,
  startTime: number,
  userId?: string
): void {
  const duration = performance.now() - startTime;
  trackMetric(experimentId, variantId, metricId, duration, userId);
}

/**
 * Get experiment results
 */
export function getResults(experimentId: string): ExperimentResults | undefined {
  const manager = getGlobalManager();
  return manager.getResults(experimentId);
}

/**
 * Start an experiment
 */
export function startExperiment(experimentId: string): void {
  const manager = getGlobalManager();
  manager.startExperiment(experimentId);
}

/**
 * Pause an experiment
 */
export function pauseExperiment(experimentId: string): void {
  const manager = getGlobalManager();
  manager.pauseExperiment(experimentId);
}

/**
 * Complete an experiment and determine winner
 */
export function completeExperiment(experimentId: string): ExperimentResults {
  const manager = getGlobalManager();
  manager.completeExperiment(experimentId);
  return manager.determineWinner(experimentId);
}

/**
 * Get user ID
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
 * Get session ID
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
