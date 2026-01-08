/**
 * Health Monitoring Metrics
 *
 * Type definitions and configurations for the health monitoring system.
 */

// ============================================================================
// METRIC TYPES
// ============================================================================

/**
 * Health metric categories
 */
export const enum MetricCategory {
  PERFORMANCE = 'performance',
  MEMORY = 'memory',
  STORAGE = 'storage',
  NETWORK = 'network',
  SYSTEM = 'system',
  PLUGIN = 'plugin',
  AGENT = 'agent',
}

/**
 * Health status levels
 */
export const enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown',
}

/**
 * Alert severity levels
 */
export const enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Trend direction
 */
export const enum TrendDirection {
  IMPROVING = 'improving',
  DEGRADING = 'degrading',
  STABLE = 'stable',
}

// ============================================================================
// METRIC DEFINITIONS
// ============================================================================

/**
 * Base metric interface
 */
export interface BaseMetric {
  /** Metric name */
  name: string;

  /** Metric category */
  category: MetricCategory;

  /** Current value */
  value: number;

  /** Unit of measurement */
  unit: string;

  /** Timestamp */
  timestamp: number;

  /** Health status */
  status: HealthStatus;

  /** Threshold for warning */
  warningThreshold?: number;

  /** Threshold for critical */
  criticalThreshold?: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics extends BaseMetric {
  category: MetricCategory.PERFORMANCE;
  name: 'cpu-usage' | 'fps' | 'long-tasks' | 'frame-time';
}

/**
 * Memory metrics
 */
export interface MemoryMetrics extends BaseMetric {
  category: MetricCategory.MEMORY;
  name: 'memory-used' | 'memory-total' | 'memory-limit' | 'memory-usage-percent';
}

/**
 * Storage metrics
 */
export interface StorageMetrics extends BaseMetric {
  category: MetricCategory.STORAGE;
  name: 'storage-used' | 'storage-available' | 'storage-total' | 'storage-usage-percent';
}

/**
 * Network metrics
 */
export interface NetworkMetrics extends BaseMetric {
  category: MetricCategory.NETWORK;
  name: 'network-status' | 'network-latency' | 'api-response-time' | 'error-rate';
}

/**
 * System metrics
 */
export interface SystemMetrics extends BaseMetric {
  category: MetricCategory.SYSTEM;
  name: 'uptime' | 'active-operations' | 'error-count' | 'system-load';
}

/**
 * Plugin health metrics
 */
export interface PluginHealthMetrics extends BaseMetric {
  category: MetricCategory.PLUGIN;
  name: 'plugins-enabled' | 'plugins-disabled' | 'plugins-error' | 'plugin-health-score';
}

/**
 * Agent health metrics
 */
export interface AgentHealthMetrics extends BaseMetric {
  category: MetricCategory.AGENT;
  name: 'agents-active' | 'agents-idle' | 'agents-error' | 'agent-health-score';
}

/**
 * Union type of all metrics
 */
export type HealthMetric =
  | PerformanceMetrics
  | MemoryMetrics
  | StorageMetrics
  | NetworkMetrics
  | SystemMetrics
  | PluginHealthMetrics
  | AgentHealthMetrics;

// ============================================================================
// HEALTH SCORE
// ============================================================================

/**
 * Overall health score (0-100)
 */
export interface HealthScore {
  /** Overall score (0-100) */
  score: number;

  /** Health status */
  status: HealthStatus;

  /** Individual category scores */
  categories: {
    performance: number;
    memory: number;
    storage: number;
    network: number;
    system: number;
    plugins: number;
    agents: number;
  };

  /** Overall trend */
  trend: TrendDirection;

  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// ALERTS
// ============================================================================

/**
 * Health alert
 */
export interface HealthAlert {
  /** Unique alert ID */
  id: string;

  /** Alert severity */
  severity: AlertSeverity;

  /** Metric that triggered the alert */
  metric: string;

  /** Alert message */
  message: string;

  /** Current value */
  currentValue: number;

  /** Threshold that was crossed */
  threshold: number;

  /** Timestamp when alert was triggered */
  timestamp: number;

  /** Whether alert is active */
  active: boolean;

  /** Suggested recovery actions */
  actions: string[];

  /** Number of times this alert has fired */
  count: number;

  /** Last fired timestamp */
  lastFired?: number;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  /** Metric name */
  metric: string;

  /** Warning threshold */
  warningThreshold: number;

  /** Critical threshold */
  criticalThreshold: number;

  /** Minimum time between alerts (ms) */
  debounceMs: number;

  /** Recovery suggestions */
  recoveryActions: string[];

  /** Whether alert is enabled */
  enabled: boolean;
}

// ============================================================================
// HEALTH HISTORY
// ============================================================================

/**
 * Health history data point
 */
export interface HealthHistoryPoint {
  /** Timestamp */
  timestamp: number;

  /** Health score */
  score: number;

  /** Individual metric values */
  metrics: Record<string, number>;

  /** Active alerts */
  alerts: number;
}

/**
 * Health trend analysis
 */
export interface HealthTrend {
  /** Trend direction */
  direction: TrendDirection;

  /** Rate of change */
  rateOfChange: number;

  /** Time period analyzed (ms) */
  period: number;

  /** Confidence (0-1) */
  confidence: number;
}

// ============================================================================
// SYSTEM STATUS
// ============================================================================

/**
 * Complete system health status
 */
export interface SystemHealthStatus {
  /** Overall health score */
  healthScore: HealthScore;

  /** Current metrics */
  metrics: HealthMetric[];

  /** Active alerts */
  alerts: HealthAlert[];

  /** Health trend */
  trend: HealthTrend;

  /** System uptime (ms) */
  uptime: number;

  /** Last health check timestamp */
  lastCheck: number;

  /** Is monitoring active */
  isMonitoring: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default metric thresholds
 */
export const DEFAULT_THRESHOLDS: Record<string, { warning: number; critical: number }> = {
  'cpu-usage': { warning: 70, critical: 90 },
  'memory-usage-percent': { warning: 75, critical: 90 },
  'storage-usage-percent': { warning: 80, critical: 95 },
  'network-latency': { warning: 500, critical: 2000 },
  'api-response-time': { warning: 1000, critical: 3000 },
  'error-rate': { warning: 0.05, critical: 0.1 },
  'fps': { warning: 30, critical: 15 },
  'long-tasks': { warning: 5, critical: 10 },
  'frame-time': { warning: 33, critical: 66 },
  'plugin-health-score': { warning: 70, critical: 50 },
  'agent-health-score': { warning: 70, critical: 50 },
};

/**
 * Default alert configurations
 */
export const DEFAULT_ALERT_CONFIGS: AlertConfig[] = [
  {
    metric: 'cpu-usage',
    warningThreshold: 70,
    criticalThreshold: 90,
    debounceMs: 30000,
    recoveryActions: ['Close unused tabs', 'Disable resource-intensive plugins', 'Check for background processes'],
    enabled: true,
  },
  {
    metric: 'memory-usage-percent',
    warningThreshold: 75,
    criticalThreshold: 90,
    debounceMs: 30000,
    recoveryActions: ['Close unused tabs', 'Clear browser cache', 'Restart application'],
    enabled: true,
  },
  {
    metric: 'storage-usage-percent',
    warningThreshold: 80,
    criticalThreshold: 95,
    debounceMs: 60000,
    recoveryActions: ['Clear old data', 'Archive old conversations', 'Uninstall unused plugins'],
    enabled: true,
  },
  {
    metric: 'network-latency',
    warningThreshold: 500,
    criticalThreshold: 2000,
    debounceMs: 10000,
    recoveryActions: ['Check internet connection', 'Try switching networks', 'Use offline mode'],
    enabled: true,
  },
  {
    metric: 'api-response-time',
    warningThreshold: 1000,
    criticalThreshold: 3000,
    debounceMs: 15000,
    recoveryActions: ['Check API status', 'Retry request', 'Check network connection'],
    enabled: true,
  },
  {
    metric: 'error-rate',
    warningThreshold: 0.05,
    criticalThreshold: 0.1,
    debounceMs: 20000,
    recoveryActions: ['Check error logs', 'Retry failed operations', 'Report issue if persistent'],
    enabled: true,
  },
  {
    metric: 'fps',
    warningThreshold: 30,
    criticalThreshold: 15,
    debounceMs: 10000,
    recoveryActions: ['Close visualizations', 'Reduce update frequency', 'Check for rendering issues'],
    enabled: true,
  },
];

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG = {
  /** Collection interval (ms) */
  collectionInterval: 2000,

  /** History size (number of data points) */
  historySize: 100,

  /** Anomaly detection window (number of samples) */
  anomalyWindow: 10,

  /** Anomaly threshold (standard deviations) */
  anomalyThreshold: 2.5,

  /** Alert deduplication window (ms) */
  alertDebounceMs: 30000,

  /** Auto-recovery enabled */
  autoRecovery: false,
};
