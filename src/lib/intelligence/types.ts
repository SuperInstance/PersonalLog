/**
 * Intelligence System Types
 *
 * Unified types for coordinating analytics, experiments, optimization, and personalization.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type IntelligenceSystem = 'analytics' | 'experiments' | 'optimization' | 'personalization' | 'hub';

export type SystemHealth = 'healthy' | 'degraded' | 'down';

export type IntelligenceLevel = 'off' | 'basic' | 'advanced' | 'full';

export type OptimizationPriority = 'personalization' | 'optimization' | 'experiments' | 'analytics';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface IntelligenceSettings {
  // Master controls
  enabled: boolean;
  level: IntelligenceLevel;

  // Per-system controls
  analytics: {
    enabled: boolean;
    retention: number; // days
    sampleRate: number; // 0-1
  };

  experiments: {
    enabled: boolean;
    participation: boolean;
    autoRollout: boolean;
  };

  optimization: {
    enabled: boolean;
    aggressiveness: 'conservative' | 'moderate' | 'aggressive';
    autoApply: boolean;
  };

  personalization: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    explainability: boolean;
  };

  // Cross-system coordination
  coordination: {
    allowConflicts: boolean;
    priority: OptimizationPriority[];
    syncInterval: number; // minutes
  };
}

// ============================================================================
// SYSTEM HEALTH
// ============================================================================

export interface SystemHealthStatus {
  analytics: SystemHealth;
  experiments: SystemHealth;
  optimization: SystemHealth;
  personalization: SystemHealth;

  // Cross-system checks
  conflicts: Conflict[];
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
}

export interface Conflict {
  id: string;
  systems: [IntelligenceSystem, IntelligenceSystem];
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: number;
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  action: string;
  priority: OptimizationPriority;
  resolvedBy: 'auto' | 'manual';
  resolvedAt: number;
}

export interface Bottleneck {
  id: string;
  system: IntelligenceSystem;
  metric: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: number;
  suggestion?: string;
}

export interface Recommendation {
  id: string;
  type: 'optimization' | 'experiment' | 'personalization' | 'configuration';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImpact?: string;
  action?: RecommendationAction;
  createdAt: number;
}

export interface RecommendationAction {
  type: 'auto_apply' | 'manual_review' | 'experiment_test';
  confidence: number; // 0-1
  riskLevel: number; // 0-100
}

// ============================================================================
// UNIFIED INSIGHTS
// ============================================================================

export interface UnifiedInsights {
  summary: string;
  analytics: AnalyticsInsights;
  experiments: ExperimentsInsights;
  optimization: OptimizationInsights;
  personalization: PersonalizationInsights;
  overall: string;
  generatedAt: number;
}

export interface AnalyticsInsights {
  highlight: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  keyMetrics: {
    label: string;
    value: string;
    change?: string;
  }[];
}

export interface ExperimentsInsights {
  active: number;
  winning?: {
    name: string;
    impact: string;
  };
  participation: number;
}

export interface OptimizationInsights {
  applied: string;
  impact: string;
  suggestions: number;
  healthScore: number;
}

export interface PersonalizationInsights {
  learned: string;
  action: string;
  confidence: number;
  preferencesLearned: number;
}

// ============================================================================
// WORKFLOWS
// ============================================================================

export interface WorkflowExecution {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  steps: WorkflowStep[];
  result?: WorkflowResult;
}

export interface WorkflowStep {
  name: string;
  system: IntelligenceSystem;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: number;
  completedAt?: number;
  result?: unknown;
  error?: string;
}

export interface WorkflowResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// EVENT BUS
// ============================================================================

export type IntelligenceEventType =
  // Analytics events
  | 'analytics:event_recorded'
  | 'analytics:pattern_detected'
  | 'analytics:threshold_exceeded'
  // Experiment events
  | 'experiments:experiment_started'
  | 'experiments:experiment_completed'
  | 'experiments:winner_determined'
  // Optimization events
  | 'optimization:suggested'
  | 'optimization:applied'
  | 'optimization:rollback'
  | 'optimization:issue_detected'
  // Personalization events
  | 'personalization:preference_learned'
  | 'personalization:pattern_detected'
  | 'personalization:adaptation_applied'
  // Cross-system events
  | 'intelligence:conflict_detected'
  | 'intelligence:workflow_started'
  | 'intelligence:workflow_completed'
  | 'intelligence:recommendation_generated';

export interface IntelligenceEvent {
  type: IntelligenceEventType;
  timestamp: number;
  source: IntelligenceSystem;
  data: Record<string, unknown>;
}

export type IntelligenceEventListener = (event: IntelligenceEvent) => void | Promise<void>;

// ============================================================================
// INTEGRATION STATE
// ============================================================================

export interface IntelligenceState {
  initialized: boolean;
  settings: IntelligenceSettings;
  health: SystemHealthStatus;
  lastSync: number;
  activeWorkflows: Map<string, WorkflowExecution>;
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_INTELLIGENCE_SETTINGS: IntelligenceSettings = {
  enabled: true,
  level: 'advanced',

  analytics: {
    enabled: true,
    retention: 30,
    sampleRate: 1.0,
  },

  experiments: {
    enabled: true,
    participation: true,
    autoRollout: false,
  },

  optimization: {
    enabled: true,
    aggressiveness: 'moderate',
    autoApply: false,
  },

  personalization: {
    enabled: true,
    sensitivity: 'medium',
    explainability: true,
  },

  coordination: {
    allowConflicts: false,
    priority: ['personalization', 'optimization', 'experiments', 'analytics'],
    syncInterval: 5, // minutes
  },
};
