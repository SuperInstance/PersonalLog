/**
 * SmartCost Dashboard - Main Export
 *
 * Real-time AI cost monitoring dashboard
 */

// Main dashboard component
export { SmartCostDashboard } from './components/SmartCostDashboard';
export type { SmartCostDashboardProps } from './components/SmartCostDashboard';

// Individual components
export { CostOverviewCard } from './components/CostOverviewCard';
export type { CostOverviewCardProps } from './types/dashboard';

export { ProviderComparisonChart } from './components/ProviderComparisonChart';
export type { ProviderComparisonChartProps } from './types/dashboard';

export { CostTrendGraph } from './components/CostTrendGraph';
export type { CostTrendGraphProps } from './types/dashboard';

export { BudgetProgressBar } from './components/BudgetProgressBar';
export type { BudgetProgressBarProps } from './types/dashboard';

export { AlertList } from './components/AlertList';
export type { AlertListProps } from './types/dashboard';

export { ConfigurationPanel } from './components/ConfigurationPanel';
export type { ConfigurationPanelProps } from './types/dashboard';

// Hooks
export { useSmartCostRealtime } from './hooks/useSmartCostRealtime';
export type {
  UseSmartCostRealtimeOptions,
  UseSmartCostRealtimeReturn,
} from './hooks/useSmartCostRealtime';

// Types
export type {
  // Configuration types
  DashboardConfig,
  DashboardTheme,
  ThemeColors,
  DashboardLayout,
  ChartConfig,
  AlertConfig,

  // State types
  DashboardState,
  DashboardAlert,
  AlertType,
  AlertSeverity,
  AlertAction,
  RequestLog,
  CostHistoryPoint,
  ConnectionStatus,

  // Component props types
  CostOverviewCardProps,
  SavingsDisplayProps,
  ProviderComparisonChartProps,
  CostTrendGraphProps,
  BudgetProgressBarProps,
  AlertListProps,
  CacheStatsCardProps,
  RoutingStatsCardProps,
  ConfigurationPanelProps,
  SettingsPageProps,

  // Utility types
  TimeRange,
  DateRange,
  MetricType,
  ChartDataPoint,
  ChartSeries,
} from './types/dashboard';

// Styles
import './styles/globals.css';

// Version
export const VERSION = '1.0.0';

// Default configuration
export const DEFAULT_CONFIG: DashboardConfig = {
  updateInterval: 1000,
  enableRealTime: true,
  theme: {
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
      background: '#ffffff',
      cardBackground: '#ffffff',
      text: '#111827',
      border: '#e5e7eb',
      gridLine: '#e5e7eb',
    },
    darkMode: false,
  },
  layout: {
    mode: 'grid',
    cardSize: 'medium',
    showComponents: {
      costOverview: true,
      savingsDisplay: true,
      providerComparison: true,
      costTrends: true,
      budgetProgress: true,
      alerts: true,
      cacheStats: true,
      routingStats: true,
    },
  },
  charts: {
    library: 'recharts',
    defaultType: 'line',
    animationDuration: 300,
    showTooltips: true,
    showLegends: true,
    lineWidth: 2,
    pointSize: 4,
  },
  alerts: {
    enableSound: false,
    enableNotifications: false,
    cooldown: 5000,
    persistent: false,
    autoDismiss: 5000,
  },
};
