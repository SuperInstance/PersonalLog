/**
 * Experiment Configuration System
 *
 * Pre-defined experiment configurations for common A/B tests.
 * Includes example experiments, sample size calculations, and templates.
 */

import type { Experiment, ExperimentType, MetricType, GoalDirection } from './types';

/**
 * Sample size calculation parameters
 */
export interface SampleSizeParams {
  /** Type of metric */
  metricType: 'binary' | 'continuous';

  /** Baseline conversion rate (for binary) or mean (for continuous) */
  baseline: number;

  /** Minimum detectable effect (absolute or relative) */
  mde: number;

  /** Statistical power (1 - beta), typically 0.80 */
  power: number;

  /** Significance level (alpha), typically 0.05 */
  alpha: number;

  /** Number of variants */
  variants: number;

  /** Whether MDE is relative (percentage) or absolute */
  relativeMDE?: boolean;
}

/**
 * Sample size calculation result
 */
export interface SampleSizeResult {
  /** Required sample size per variant */
  sampleSize: number;

  /** Total sample size across all variants */
  totalSampleSize: number;

  /** Duration in days (assuming daily traffic) */
  durationDays: number;

  /** Confidence level achieved */
  confidenceLevel: string;

  /** Explanation of calculation */
  explanation: string;
}

/**
 * Calculate required sample size for experiment
 *
 * Uses power analysis to determine sample size needed to detect
 * statistically significant differences between variants.
 */
export function calculateSampleSize(params: SampleSizeParams): SampleSizeResult {
  const {
    metricType,
    baseline,
    mde,
    power,
    alpha,
    variants,
    relativeMDE = false,
  } = params;

  // Convert relative MDE to absolute if needed
  const absoluteMDE = relativeMDE ? baseline * mde : mde;

  // Z-scores for common alpha/power values
  const zScores: Record<number, number> = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };

  const zAlpha = zScores[1 - alpha/2] || zScores[0.95];
  const zBeta = 0.84; // For 80% power

  let sampleSize: number;

  if (metricType === 'binary') {
    // For binary metrics (conversion rates), use pooled proportion formula
    const p1 = baseline;
    const p2 = baseline + absoluteMDE;
    const pPooled = (p1 + p2) / 2;

    sampleSize = Math.ceil(
      (2 * pPooled * (1 - pPooled) * Math.pow(zAlpha + zBeta, 2)) /
      Math.pow(p2 - p1, 2)
    );
  } else {
    // For continuous metrics, use standardized effect size (Cohen's d)
    // Need standard deviation - assume coefficient of variation of 0.5 for typical metrics
    const stdDev = baseline * 0.5;
    const effectSize = absoluteMDE / stdDev;

    sampleSize = Math.ceil(
      (2 * Math.pow(zAlpha + zBeta, 2)) / Math.pow(effectSize, 2)
    );
  }

  // Adjust for multiple comparisons (Bonferroni correction)
  const adjustedSampleSize = Math.ceil(sampleSize * Math.log2(variants));

  const totalSampleSize = adjustedSampleSize * variants;

  // Estimate duration (assuming 1000 daily users)
  const dailyUsers = 1000;
  const durationDays = Math.ceil(totalSampleSize / dailyUsers);

  const confidenceLevel = `${Math.round((1 - alpha) * 100)}%`;

  return {
    sampleSize: adjustedSampleSize,
    totalSampleSize,
    durationDays,
    confidenceLevel,
    explanation: `To detect a ${relativeMDE ? `${(mde * 100).toFixed(1)}% relative` : `${(absoluteMDE * 100).toFixed(1)}% absolute`} change from baseline of ${(baseline * 100).toFixed(1)}% with ${confidenceLevel} confidence and ${Math.round(power * 100)}% power, you need ${adjustedSampleSize.toLocaleString()} samples per variant (total ${totalSampleSize.toLocaleString()}). At ${dailyUsers.toLocaleString()} daily users, this will take approximately ${durationDays} days.`,
  };
}

/**
 * Quick sample size calculator for common scenarios
 */
export const SAMPLE_SIZE_CALCULATORS = {
  /**
   * Conversion rate test (e.g., signup, purchase)
   */
  conversionRate: (baseline: number, mde: number = 0.02) =>
    calculateSampleSize({
      metricType: 'binary',
      baseline,
      mde,
      power: 0.80,
      alpha: 0.05,
      variants: 2,
      relativeMDE: true,
    }),

  /**
   * Engagement rate test (e.g., click-through, feature usage)
   */
  engagementRate: (baseline: number, mde: number = 0.10) =>
    calculateSampleSize({
      metricType: 'binary',
      baseline,
      mde,
      power: 0.80,
      alpha: 0.05,
      variants: 2,
      relativeMDE: true,
    }),

  /**
   * Continuous metric test (e.g., time spent, session length)
   */
  continuous: (baseline: number, mde: number = 0.05) =>
    calculateSampleSize({
      metricType: 'continuous',
      baseline,
      mde,
      power: 0.80,
      alpha: 0.05,
      variants: 2,
      relativeMDE: true,
    }),
};

/**
 * Pre-defined experiment templates
 */
export const EXPERIMENT_TEMPLATES = {
  /**
   * UI density experiment
   */
  messageDensity: {
    name: 'Message Display Density',
    description: 'Test different message spacing and density to optimize user engagement and readability',
    type: 'ui' as ExperimentType,
    variants: [
      {
        id: 'compact',
        name: 'Compact',
        description: 'Tighter spacing, more messages visible',
        weight: 0.33,
        config: {
          messageSpacing: '0.5rem',
          fontSize: '0.875rem',
          padding: '0.5rem',
        },
        isControl: true,
      },
      {
        id: 'comfortable',
        name: 'Comfortable',
        description: 'Balanced spacing for readability',
        weight: 0.33,
        config: {
          messageSpacing: '1rem',
          fontSize: '0.925rem',
          padding: '0.75rem',
        },
      },
      {
        id: 'spacious',
        name: 'Spacious',
        description: 'Maximum spacing for easy scanning',
        weight: 0.34,
        config: {
          messageSpacing: '1.5rem',
          fontSize: '1rem',
          padding: '1rem',
        },
      },
    ],
    metrics: [
      {
        id: 'user_engagement',
        name: 'User Engagement',
        type: 'ratio' as MetricType,
        direction: 'maximize' as GoalDirection,
        primary: true,
        description: 'Messages sent per session',
      },
      {
        id: 'session_duration',
        name: 'Session Duration',
        type: 'duration' as MetricType,
        direction: 'maximize' as GoalDirection,
        primary: false,
        description: 'Time spent in app',
      },
      {
        id: 'scroll_depth',
        name: 'Scroll Depth',
        type: 'ratio' as MetricType,
        direction: 'maximize' as GoalDirection,
        primary: false,
        description: 'Percentage of messages viewed',
      },
    ],
    objective: 'engagement' as const,
    plannedDuration: 14 * 24 * 60 * 60 * 1000, // 2 weeks
    trafficAllocation: 1.0,
    confidenceThreshold: 0.95,
    earlyStoppingEnabled: true,
    banditEnabled: false,
    tags: ['ui', 'messaging', 'density'],
  },

  /**
   * Auto-scroll behavior experiment
   */
  autoScroll: {
    name: 'Auto-Scroll Behavior',
    description: 'Test whether auto-scrolling to new messages improves user experience',
    type: 'ui' as ExperimentType,
    variants: [
      {
        id: 'enabled',
        name: 'Auto-Scroll Enabled',
        description: 'Automatically scroll to newest messages',
        weight: 0.5,
        config: {
          autoScroll: true,
          scrollBehavior: 'smooth',
          scrollDelay: 100,
        },
        isControl: true,
      },
      {
        id: 'disabled',
        name: 'Manual Scroll Only',
        description: 'User controls all scrolling',
        weight: 0.5,
        config: {
          autoScroll: false,
          showNewMessageBadge: true,
        },
      },
    ],
    metrics: [
      {
        id: 'messages_per_session',
        name: 'Messages Per Session',
        type: 'count' as MetricType,
        direction: 'maximize' as GoalDirection,
        primary: true,
        description: 'Average messages sent per session',
      },
      {
        id: 'scroll_actions',
        name: 'Scroll Actions',
        type: 'count' as MetricType,
        direction: 'minimize' as GoalDirection,
        primary: false,
        description: 'Number of manual scroll actions',
      },
    ],
    objective: 'engagement' as const,
    plannedDuration: 7 * 24 * 60 * 60 * 1000, // 1 week
    trafficAllocation: 1.0,
    confidenceThreshold: 0.95,
    earlyStoppingEnabled: true,
    banditEnabled: true,
    tags: ['ui', 'scrolling', 'behavior'],
  },

  /**
   * AI response timing experiment
   */
  aiResponseTiming: {
    name: 'AI Response Feedback Timing',
    description: 'Test different timing for showing AI response indicators',
    type: 'ui' as ExperimentType,
    variants: [
      {
        id: 'immediate',
        name: 'Immediate Indicator',
        description: 'Show typing indicator immediately',
        weight: 0.33,
        config: {
          indicatorDelay: 0,
          showStreaming: true,
        },
        isControl: true,
      },
      {
        id: 'delayed_500ms',
        name: '500ms Delay',
        description: 'Show indicator after 500ms',
        weight: 0.33,
        config: {
          indicatorDelay: 500,
          showStreaming: true,
        },
      },
      {
        id: 'delayed_1000ms',
        name: '1000ms Delay',
        description: 'Show indicator after 1 second',
        weight: 0.34,
        config: {
          indicatorDelay: 1000,
          showStreaming: true,
        },
      },
    ],
    metrics: [
      {
        id: 'perceived_performance',
        name: 'Perceived Performance',
        type: 'ratio' as MetricType,
        direction: 'maximize' as GoalDirection,
        primary: true,
        description: 'User satisfaction rating (optional survey)',
      },
      {
        id: 'response_completion_rate',
        name: 'Response Completion Rate',
        type: 'binary' as MetricType,
        direction: 'maximize' as GoalDirection,
        primary: false,
        description: 'Percentage of completed conversations',
      },
    ],
    objective: 'satisfaction' as const,
    plannedDuration: 7 * 24 * 60 * 60 * 1000, // 1 week
    trafficAllocation: 1.0,
    confidenceThreshold: 0.90,
    earlyStoppingEnabled: true,
    banditEnabled: false,
    tags: ['ui', 'ai', 'feedback'],
  },

  /**
   * Knowledge base search ranking experiment
   */
  knowledgeSearchRanking: {
    name: 'Knowledge Search Ranking Algorithm',
    description: 'Test different search result ranking strategies',
    type: 'algorithm' as ExperimentType,
    variants: [
      {
        id: 'vector_similarity',
        name: 'Vector Similarity Only',
        description: 'Rank by semantic similarity score',
        weight: 0.33,
        config: {
          rankingAlgorithm: 'vector',
          boostRecent: false,
          boostFrequent: false,
        },
        isControl: true,
      },
      {
        id: 'vector_with_recency',
        name: 'Vector + Recency Boost',
        description: 'Boost recently accessed documents',
        weight: 0.33,
        config: {
          rankingAlgorithm: 'hybrid',
          boostRecent: true,
          recencyDecay: 0.9,
          boostFrequent: false,
        },
      },
      {
        id: 'vector_with_frequency',
        name: 'Vector + Frequency Boost',
        description: 'Boost frequently accessed documents',
        weight: 0.34,
        config: {
          rankingAlgorithm: 'hybrid',
          boostRecent: false,
          boostFrequent: true,
          frequencyWeight: 0.3,
        },
      },
    ],
    metrics: [
      {
        id: 'search_success_rate',
        name: 'Search Success Rate',
        type: 'binary' as MetricType,
        direction: 'maximize' as GoalDirection,
        primary: true,
        description: 'User clicks a result within top 5',
      },
      {
        id: 'time_to_result',
        name: 'Time to Result',
        type: 'duration' as MetricType,
        direction: 'minimize' as GoalDirection,
        primary: false,
        description: 'Time from search to result click',
      },
      {
        id: 'result_position',
        name: 'Average Result Position',
        type: 'numeric' as MetricType,
        direction: 'minimize' as GoalDirection,
        primary: false,
        description: 'Average position of clicked result',
      },
    ],
    objective: 'engagement' as const,
    plannedDuration: 21 * 24 * 60 * 60 * 1000, // 3 weeks
    trafficAllocation: 1.0,
    confidenceThreshold: 0.95,
    earlyStoppingEnabled: true,
    banditEnabled: true,
    tags: ['algorithm', 'search', 'knowledge'],
  },

  /**
   * Conversation suggestion timing experiment
   */
  conversationSuggestions: {
    name: 'Conversation Suggestions Display',
    description: 'Test when and how to show conversation continuation suggestions',
    type: 'ui' as ExperimentType,
    variants: [
      {
        id: 'no_suggestions',
        name: 'No Suggestions',
        description: 'Do not show suggestions',
        weight: 0.25,
        config: {
          showSuggestions: false,
        },
        isControl: true,
      },
      {
        id: 'always_show',
        name: 'Always Show',
        description: 'Show suggestions after every message',
        weight: 0.25,
        config: {
          showSuggestions: true,
          triggerCondition: 'always',
          maxSuggestions: 3,
        },
      },
      {
        id: 'show_on_pause',
        name: 'Show on Pause',
        description: 'Show suggestions when user pauses typing',
        weight: 0.25,
        config: {
          showSuggestions: true,
          triggerCondition: 'pause',
          pauseDuration: 2000,
          maxSuggestions: 3,
        },
      },
      {
        id: 'show_on_idle',
        name: 'Show on Idle',
        description: 'Show suggestions when user goes idle',
        weight: 0.25,
        config: {
          showSuggestions: true,
          triggerCondition: 'idle',
          idleDuration: 5000,
          maxSuggestions: 5,
        },
      },
    ],
    metrics: [
      {
        id: 'suggestion_acceptance_rate',
        name: 'Suggestion Acceptance Rate',
        type: 'binary' as MetricType,
        direction: 'maximize' as GoalDirection,
        primary: true,
        description: 'Percentage of suggestions that are accepted',
      },
      {
        id: 'conversation_continuation_rate',
        name: 'Conversation Continuation Rate',
        type: 'binary' as MetricType,
        direction: 'maximize' as GoalDirection,
        primary: false,
        description: 'Percentage of conversations that continue',
      },
      {
        id: 'time_to_next_message',
        name: 'Time to Next Message',
        type: 'duration' as MetricType,
        direction: 'minimize' as GoalDirection,
        primary: false,
        description: 'Average time between messages',
      },
    ],
    objective: 'engagement' as const,
    plannedDuration: 14 * 24 * 60 * 60 * 1000, // 2 weeks
    trafficAllocation: 0.5, // Only 50% of users
    confidenceThreshold: 0.95,
    earlyStoppingEnabled: true,
    banditEnabled: true,
    tags: ['ui', 'suggestions', 'ai'],
  },
};

/**
 * Initialize example experiments
 *
 * Creates and registers pre-defined experiments from templates.
 */
export function initializeExampleExperiments(): void {
  const { createExperiment } = require('./api');

  // Skip if already initialized
  if (typeof window !== 'undefined') {
    const initialized = localStorage.getItem('experiments-initialized');
    if (initialized) {
      return;
    }
  }

  // Create experiments from templates
  Object.values(EXPERIMENT_TEMPLATES).forEach((template) => {
    try {
      createExperiment(template);
    } catch (error) {
      console.error('Failed to create experiment:', template.name, error);
    }
  });

  // Mark as initialized
  if (typeof window !== 'undefined') {
    localStorage.setItem('experiments-initialized', Date.now().toString());
  }

  console.log('[Experiments] Initialized example experiments');
}

/**
 * Get all available experiment templates
 */
export function getExperimentTemplates() {
  return Object.entries(EXPERIMENT_TEMPLATES).map(([key, template]) => ({
    key,
    ...template,
  }));
}

/**
 * Get experiment template by key
 */
export function getExperimentTemplate(key: string) {
  return EXPERIMENT_TEMPLATES[key as keyof typeof EXPERIMENT_TEMPLATES];
}

/**
 * Calculate sample size for an experiment template
 */
export function calculateTemplateSampleSize(
  templateKey: string,
  customBaseline?: number
): SampleSizeResult | null {
  const template = getExperimentTemplate(templateKey);
  if (!template) {
    return null;
  }

  const primaryMetric = template.metrics.find(m => m.primary);
  if (!primaryMetric) {
    return null;
  }

  // Use appropriate calculator based on metric type
  let baseline = customBaseline || 0.1; // Default 10% baseline

  if (primaryMetric.type === 'binary') {
    return SAMPLE_SIZE_CALCULATORS.engagementRate(baseline);
  } else if (primaryMetric.type === 'duration') {
    return SAMPLE_SIZE_CALCULATORS.continuous(baseline);
  } else {
    return SAMPLE_SIZE_CALCULATORS.engagementRate(baseline);
  }
}
