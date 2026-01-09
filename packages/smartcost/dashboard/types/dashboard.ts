/**
 * SmartCost Dashboard - Type Definitions
 *
 * Complete type system for the real-time dashboard
 */

import { CostMetrics, CacheStats, RoutingStats, PerformanceMetrics, ProviderUsage, ModelUsage } from '../../src/types';

// ============================================================================
// DASHBOARD CONFIGURATION TYPES
// ============================================================================

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  /** Update interval in ms (default: 1000) */
  updateInterval?: number;

  /** WebSocket URL for real-time updates */
  websocketUrl?: string;

  /** Theme configuration */
  theme?: DashboardTheme;

  /** Layout configuration */
  layout?: DashboardLayout;

  /** Chart configuration */
  charts?: ChartConfig;

  /** Alert configuration */
  alerts?: AlertConfig;

  /** Enable real-time updates */
  enableRealTime?: boolean;

  /** Timezone for timestamps */
  timezone?: string;

  /** Date format */
  dateFormat?: string;

  /** Currency format */
  currencyFormat?: string;

  /** Number of decimal places */
  decimals?: number;
}

/**
 * Dashboard theme
 */
export interface DashboardTheme {
  /** Color scheme */
  colors: ThemeColors;

  /** Dark mode enabled */
  darkMode?: boolean;

  /** Custom CSS */
  customCSS?: string;
}

/**
 * Theme colors
 */
export interface ThemeColors {
  /** Primary color */
  primary: string;

  /** Secondary color */
  secondary: string;

  /** Success color */
  success: string;

  /** Warning color */
  warning: string;

  /** Error color */
  error: string;

  /** Info color */
  info: string;

  /** Background color */
  background: string;

  /** Card background color */
  cardBackground: string;

  /** Text color */
  text: string;

  /** Border color */
  border: string;

  /** Grid line color */
  gridLine: string;
}

/**
 * Dashboard layout
 */
export interface DashboardLayout {
  /** Layout mode */
  mode: 'grid' | 'list' | 'compact';

  /** Card size */
  cardSize: 'small' | 'medium' | 'large';

  /** Number of columns */
  columns?: number;

  /** Show/hide components */
  showComponents: {
    costOverview: boolean;
    savingsDisplay: boolean;
    providerComparison: boolean;
    costTrends: boolean;
    budgetProgress: boolean;
    alerts: boolean;
    cacheStats: boolean;
    routingStats: boolean;
  };
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  /** Chart library ('recharts' | 'chartjs' | 'd3') */
  library: 'recharts' | 'chartjs' | 'd3';

  /** Default chart type */
  defaultType: 'line' | 'bar' | 'area' | 'pie' | 'donut';

  /** Animation duration in ms */
  animationDuration?: number;

  /** Show tooltips */
  showTooltips?: boolean;

  /** Show legends */
  showLegends?: boolean;

  /** Custom colors */
  colors?: string[];

  /** Line width for line charts */
  lineWidth?: number;

  /** Point size for scatter plots */
  pointSize?: number;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  /** Enable sound alerts */
  enableSound?: boolean;

  /** Enable desktop notifications */
  enableNotifications?: boolean;

  /** Alert sound URL */
  soundUrl?: string;

  /** Alert cooldown in ms */
  cooldown?: number;

  /** Persistent alerts */
  persistent?: boolean;

  /** Auto-dismiss timeout in ms */
  autoDismiss?: number;
}

// ============================================================================
// DASHBOARD STATE TYPES
// ============================================================================

/**
 * Dashboard state
 */
export interface DashboardState {
  /** Cost metrics */
  costMetrics: CostMetrics;

  /** Cache statistics */
  cacheStats: CacheStats;

  /** Routing statistics */
  routingStats: RoutingStats;

  /** Performance metrics */
  performanceMetrics: PerformanceMetrics;

  /** Provider usage */
  providerUsage: ProviderUsage[];

  /** Model usage */
  modelUsage: ModelUsage[];

  /** Active alerts */
  alerts: DashboardAlert[];

  /** Recent requests */
  recentRequests: RequestLog[];

  /** Cost history */
  costHistory: CostHistoryPoint[];

  /** Connection status */
  connectionStatus: ConnectionStatus;

  /** Last update timestamp */
  lastUpdate: number;

  /** Loading state */
  loading: boolean;

  /** Error state */
  error: string | null;
}

/**
 * Dashboard alert
 */
export interface DashboardAlert {
  /** Unique alert ID */
  id: string;

  /** Alert type */
  type: AlertType;

  /** Alert severity */
  severity: AlertSeverity;

  /** Alert title */
  title: string;

  /** Alert message */
  message: string;

  /** Alert timestamp */
  timestamp: number;

  /** Alert data */
  data?: Record<string, any>;

  /** Whether alert is acknowledged */
  acknowledged: boolean;

  /** Alert actions */
  actions?: AlertAction[];
}

/**
 * Alert type
 */
export type AlertType =
  | 'budget_warning'
  | 'budget_critical'
  | 'budget_exceeded'
  | 'provider_error'
  | 'cache_full'
  | 'unusual_spend'
  | 'performance_degradation'
  | 'rate_limit';

/**
 * Alert severity
 */
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Alert action
 */
export interface AlertAction {
  /** Action label */
  label: string;

  /** Action handler */
  handler: () => void;

  /** Action type */
  type: 'primary' | 'secondary' | 'danger';
}

/**
 * Request log
 */
export interface RequestLog {
  /** Request ID */
  id: string;

  /** Timestamp */
  timestamp: number;

  /** Provider */
  provider: string;

  /** Model */
  model: string;

  /** Cost */
  cost: number;

  /** Tokens */
  tokens: number;

  /** Duration in ms */
  duration: number;

  /** Whether cached */
  cached: boolean;

  /** Status */
  status: 'success' | 'error' | 'pending';
}

/**
 * Cost history point
 */
export interface CostHistoryPoint {
  /** Timestamp */
  timestamp: number;

  /** Cost */
  cost: number;

  /** Cumulative cost */
  cumulativeCost: number;

  /** Savings */
  savings: number;

  /** Budget utilization */
  budgetUtilization: number;
}

/**
 * Connection status
 */
export interface ConnectionStatus {
  /** Connected status */
  connected: boolean;

  /** Connection type */
  type: 'websocket' | 'polling' | 'static';

  /** Last connected timestamp */
  lastConnected: number;

  /** Reconnect attempts */
  reconnectAttempts: number;

  /** Connection quality */
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

/**
 * Cost overview card props
 */
export interface CostOverviewCardProps {
  /** Cost metrics */
  metrics: CostMetrics;

  /** Budget */
  budget: number;

  /** Currency */
  currency?: string;

  /** Show sparkline */
  showSparkline?: boolean;

  /** Time range */
  timeRange?: TimeRange;
}

/**
 * Savings display props
 */
export interface SavingsDisplayProps {
  /** Total savings */
  totalSavings: number;

  /** Savings percentage */
  savingsPercent: number;

  /** Savings history */
  history: CostHistoryPoint[];

  /** Currency */
  currency?: string;

  /** Show breakdown */
  showBreakdown?: boolean;
}

/**
 * Provider comparison chart props
 */
export interface ProviderComparisonChartProps {
  /** Provider usage data */
  providers: ProviderUsage[];

  /** Chart type */
  chartType?: 'bar' | 'pie' | 'donut';

  /** Metric to display */
  metric?: 'cost' | 'requests' | 'latency';

  /** Time range */
  timeRange?: TimeRange;
}

/**
 * Cost trend graph props
 */
export interface CostTrendGraphProps {
  /** Cost history */
  history: CostHistoryPoint[];

  /** Time range */
  timeRange?: TimeRange;

  /** Show budget line */
  showBudgetLine?: boolean;

  /** Budget */
  budget?: number;

  /** Show predictions */
  showPredictions?: boolean;

  /** Chart type */
  chartType?: 'line' | 'area';
}

/**
 * Budget progress bar props
 */
export interface BudgetProgressBarProps {
  /** Budget used */
  used: number;

  /** Budget total */
  total: number;

  /** Alert threshold */
  alertThreshold?: number;

  /** Show percentage */
  showPercentage?: boolean;

  /** Show remaining */
  showRemaining?: boolean;

  /** Color based on utilization */
  colorCode?: boolean;
}

/**
 * Alert list props
 */
export interface AlertListProps {
  /** Alerts */
  alerts: DashboardAlert[];

  /** Max alerts to display */
  maxAlerts?: number;

  /** Filter by severity */
  filterSeverity?: AlertSeverity[];

  /** On acknowledge callback */
  onAcknowledge?: (alertId: string) => void;

  /** On dismiss callback */
  onDismiss?: (alertId: string) => void;
}

/**
 * Cache stats card props
 */
export interface CacheStatsCardProps {
  /** Cache statistics */
  stats: CacheStats;

  /** Show breakdown */
  showBreakdown?: boolean;

  /** Show history */
  showHistory?: boolean;
}

/**
 * Routing stats card props
 */
export interface RoutingStatsCardProps {
  /** Routing statistics */
  stats: RoutingStats;

  /** Provider usage */
  providerUsage: ProviderUsage[];

  /** Show decisions by strategy */
  showByStrategy?: boolean;
}

/**
 * Configuration panel props
 */
export interface ConfigurationPanelProps {
  /** Current configuration */
  config: DashboardConfig;

  /** On configuration change */
  onChange: (config: DashboardConfig) => void;

  /** On save */
  onSave?: () => void;

  /** On reset */
  onReset?: () => void;

  /** Read-only mode */
  readOnly?: boolean;
}

/**
 * Settings page props
 */
export interface SettingsPageProps {
  /** Current configuration */
  config: DashboardConfig;

  /** On configuration update */
  onUpdate: (config: DashboardConfig) => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Time range
 */
export type TimeRange =
  | '1h'
  | '6h'
  | '24h'
  | '7d'
  | '30d'
  | '90d'
  | 'custom';

/**
 * Date range
 */
export interface DateRange {
  /** Start date */
  start: Date;

  /** End date */
  end: Date;
}

/**
 * Metric type
 */
export type MetricType =
  | 'cost'
  | 'tokens'
  | 'requests'
  | 'latency'
  | 'cache_hit_rate'
  | 'savings'
  | 'budget_utilization';

/**
 * Chart data point
 */
export interface ChartDataPoint {
  /** Timestamp or label */
  x: number | string;

  /** Value */
  y: number;

  /** Additional data */
  data?: Record<string, any>;
}

/**
 * Chart series
 */
export interface ChartSeries {
  /** Series name */
  name: string;

  /** Series data */
  data: ChartDataPoint[];

  /** Series color */
  color?: string;

  /** Series type */
  type?: 'line' | 'bar' | 'area';

  /** Show in legend */
  showInLegend?: boolean;
}
