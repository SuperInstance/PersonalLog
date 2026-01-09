# SmartCost Dashboard - API Documentation

Complete API reference for all components, hooks, and utilities.

## Table of Contents

- [Components](#components)
  - [SmartCostDashboard](#smartcostdashboard)
  - [CostOverviewCard](#costoverviewcard)
  - [ProviderComparisonChart](#providercomparisonchart)
  - [CostTrendGraph](#costtrendgraph)
  - [BudgetProgressBar](#budgetprogressbar)
  - [AlertList](#alertlist)
  - [ConfigurationPanel](#configurationpanel)
- [Hooks](#hooks)
  - [useSmartCostRealtime](#usesmartcostrealtime)
- [Types](#types)
- [Utilities](#utilities)

---

## Components

### SmartCostDashboard

Main dashboard component that combines all visualizations.

#### Import

```tsx
import { SmartCostDashboard } from '@superinstance/smartcost/dashboard';
```

#### Props

```typescript
interface SmartCostDashboardProps {
  /** Dashboard configuration */
  config?: DashboardConfig;

  /** Initial budget in USD */
  budget: number;

  /** WebSocket URL for real-time updates */
  websocketUrl?: string;

  /** Enable real-time updates (default: true) */
  enableRealTime?: boolean;

  /** Callback when configuration changes */
  onConfigChange?: (config: DashboardConfig) => void;
}
```

#### Example

```tsx
<SmartCostDashboard
  budget={500}
  websocketUrl="ws://localhost:3000"
  enableRealTime={true}
  onConfigChange={(config) => console.log(config)}
/>
```

---

### CostOverviewCard

Displays current cost metrics with budget progress and sparkline.

#### Import

```tsx
import { CostOverviewCard } from '@superinstance/smartcost/dashboard';
```

#### Props

```typescript
interface CostOverviewCardProps {
  /** Cost metrics */
  metrics: CostMetrics;

  /** Budget amount */
  budget: number;

  /** Currency code (default: 'USD') */
  currency?: string;

  /** Show sparkline chart (default: true) */
  showSparkline?: boolean;

  /** Time range (default: '30d') */
  timeRange?: TimeRange;
}
```

#### Type Definitions

```typescript
type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | '90d' | 'custom';

interface CostMetrics {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  cacheHitRate: number;
  totalSavings: number;
  savingsPercent: number;
  avgCostPerRequest: number;
  avgTokensPerRequest: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
  requestsByProvider: Record<string, number>;
  budgetUtilization: number;
  periodStart: number;
  periodEnd: number;
}
```

#### Example

```tsx
<CostOverviewCard
  metrics={{
    totalCost: 342.50,
    totalTokens: 12500000,
    totalRequests: 4500,
    cacheHitRate: 0.72,
    totalSavings: 156.80,
    savingsPercent: 31.4,
    // ... other metrics
  }}
  budget={500}
  currency="USD"
  showSparkline={true}
  timeRange="30d"
/>
```

---

### ProviderComparisonChart

Visualizes provider usage and costs with customizable charts.

#### Import

```tsx
import { ProviderComparisonChart } from '@superinstance/smartcost/dashboard';
```

#### Props

```typescript
interface ProviderComparisonChartProps {
  /** Provider usage data */
  providers: ProviderUsage[];

  /** Chart type (default: 'bar') */
  chartType?: 'bar' | 'pie' | 'donut';

  /** Metric to display (default: 'cost') */
  metric?: 'cost' | 'requests' | 'latency';

  /** Time range (default: '30d') */
  timeRange?: TimeRange;
}
```

#### Type Definitions

```typescript
interface ProviderUsage {
  provider: string;
  requestCount: number;
  totalCost: number;
  avgCostPerRequest: number;
  usagePercent: number;
}
```

#### Example

```tsx
<ProviderComparisonChart
  providers={[
    {
      provider: 'OpenAI',
      requestCount: 2800,
      totalCost: 210.30,
      avgCostPerRequest: 0.075,
      usagePercent: 61.4,
    },
    {
      provider: 'Anthropic',
      requestCount: 1700,
      totalCost: 132.20,
      avgCostPerRequest: 0.078,
      usagePercent: 38.6,
    },
  ]}
  chartType="bar"
  metric="cost"
  timeRange="30d"
/>
```

---

### CostTrendGraph

Shows cost trends over time with optional budget line and predictions.

#### Import

```tsx
import { CostTrendGraph } from '@superinstance/smartcost/dashboard';
```

#### Props

```typescript
interface CostTrendGraphProps {
  /** Cost history data */
  history: CostHistoryPoint[];

  /** Time range (default: '30d') */
  timeRange?: TimeRange;

  /** Show budget line (default: true) */
  showBudgetLine?: boolean;

  /** Budget amount (for budget line) */
  budget?: number;

  /** Show predictions (default: false) */
  showPredictions?: boolean;

  /** Chart type (default: 'line') */
  chartType?: 'line' | 'area';
}
```

#### Type Definitions

```typescript
interface CostHistoryPoint {
  timestamp: number;
  cost: number;
  cumulativeCost: number;
  savings: number;
  budgetUtilization: number;
}
```

#### Example

```tsx
<CostTrendGraph
  history={[
    {
      timestamp: Date.now() - 86400000,
      cost: 12.50,
      cumulativeCost: 342.50,
      savings: 5.20,
      budgetUtilization: 0.685,
    },
    // ... more data points
  ]}
  budget={500}
  showBudgetLine={true}
  showPredictions={true}
  chartType="area"
  timeRange="30d"
/>
```

---

### BudgetProgressBar

Animated budget progress bar with color coding based on utilization.

#### Import

```tsx
import { BudgetProgressBar } from '@superinstance/smartcost/dashboard';
```

#### Props

```typescript
interface BudgetProgressBarProps {
  /** Budget used amount */
  used: number;

  /** Budget total amount */
  total: number;

  /** Alert threshold percentage (default: 80) */
  alertThreshold?: number;

  /** Show percentage (default: true) */
  showPercentage?: boolean;

  /** Show remaining amount (default: true) */
  showRemaining?: boolean;

  /** Color code based on utilization (default: true) */
  colorCode?: boolean;
}
```

#### Color Coding

- **0-50%**: Green (healthy)
- **50-75%**: Blue (moderate)
- **75-90%**: Yellow (warning)
- **90-100%**: Red (critical)
- **100%+**: Red (exceeded)

#### Example

```tsx
<BudgetProgressBar
  used={342.50}
  total={500}
  alertThreshold={80}
  showPercentage={true}
  showRemaining={true}
  colorCode={true}
/>
```

---

### AlertList

Displays alerts with filtering, acknowledgment, and dismissal functionality.

#### Import

```tsx
import { AlertList } from '@superinstance/smartcost/dashboard';
```

#### Props

```typescript
interface AlertListProps {
  /** Alerts to display */
  alerts: DashboardAlert[];

  /** Maximum alerts to display (default: 10) */
  maxAlerts?: number;

  /** Filter by severity */
  filterSeverity?: AlertSeverity[];

  /** Callback when alert is acknowledged */
  onAcknowledge?: (alertId: string) => void;

  /** Callback when alert is dismissed */
  onDismiss?: (alertId: string) => void;
}
```

#### Type Definitions

```typescript
interface DashboardAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: number;
  data?: Record<string, any>;
  acknowledged: boolean;
  actions?: AlertAction[];
}

type AlertType =
  | 'budget_warning'
  | 'budget_critical'
  | 'budget_exceeded'
  | 'provider_error'
  | 'cache_full'
  | 'unusual_spend'
  | 'performance_degradation'
  | 'rate_limit';

type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

interface AlertAction {
  label: string;
  handler: () => void;
  type: 'primary' | 'secondary' | 'danger';
}
```

#### Example

```tsx
<AlertList
  alerts={[
    {
      id: '1',
      type: 'budget_warning',
      severity: 'warning',
      title: 'Approaching Budget Limit',
      message: 'You have used 75% of your monthly budget.',
      timestamp: Date.now(),
      acknowledged: false,
      actions: [
        {
          label: 'View Usage',
          handler: () => console.log('View usage'),
          type: 'primary',
        },
      ],
    },
  ]}
  maxAlerts={10}
  filterSeverity={['critical', 'error']}
  onAcknowledge={(id) => console.log('Acknowledged:', id)}
  onDismiss={(id) => console.log('Dismissed:', id)}
/>
```

---

### ConfigurationPanel

Full-featured configuration panel for dashboard settings.

#### Import

```tsx
import { ConfigurationPanel } from '@superinstance/smartcost/dashboard';
```

#### Props

```typescript
interface ConfigurationPanelProps {
  /** Current configuration */
  config: DashboardConfig;

  /** Callback when configuration changes */
  onChange: (config: DashboardConfig) => void;

  /** Callback when save is clicked */
  onSave?: () => void;

  /** Callback when reset is clicked */
  onReset?: () => void;

  /** Read-only mode */
  readOnly?: boolean;
}
```

#### Example

```tsx
const [config, setConfig] = useState<DashboardConfig>({});

<ConfigurationPanel
  config={config}
  onChange={setConfig}
  onSave={() => console.log('Saved:', config)}
  onReset={() => setConfig({})}
  readOnly={false}
/>
```

---

## Hooks

### useSmartCostRealtime

Hook for real-time dashboard updates via WebSocket.

#### Import

```tsx
import { useSmartCostRealtime } from '@superinstance/smartcost/dashboard';
```

#### Parameters

```typescript
interface UseSmartCostRealtimeOptions {
  /** WebSocket URL (default: 'ws://localhost:3000') */
  url?: string;

  /** Enable real-time updates (default: true) */
  enabled?: boolean;

  /** Reconnect interval in ms (default: 3000) */
  reconnectInterval?: number;

  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;

  /** Callback when connection status changes */
  onConnectionChange?: (status: ConnectionStatus) => void;

  /** Callback when error occurs */
  onError?: (error: Error) => void;

  /** Callback when state updates */
  onUpdate?: (state: Partial<DashboardState>) => void;
}
```

#### Returns

```typescript
interface UseSmartCostRealtimeReturn {
  /** Current dashboard state */
  state: DashboardState;

  /** Connection status */
  connectionStatus: ConnectionStatus;

  /** Manually connect */
  connect: () => void;

  /** Manually disconnect */
  disconnect: () => void;

  /** Manually refresh state */
  refresh: () => Promise<void>;

  /** Send command to server */
  sendCommand: (command: string, data?: any) => void;
}
```

#### Example

```tsx
const { state, connectionStatus, refresh, sendCommand } = useSmartCostRealtime(
  initialState,
  {
    url: 'ws://localhost:3000',
    enabled: true,
    onConnectionChange: (status) => {
      console.log('Connected:', status.connected);
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  }
);

// Access state
console.log('Total cost:', state.costMetrics.totalCost);

// Refresh data
await refresh();

// Send command
sendCommand('acknowledgeAlert', { alertId: '123' });
```

---

## Types

### DashboardConfig

```typescript
interface DashboardConfig {
  updateInterval?: number;
  websocketUrl?: string;
  theme?: DashboardTheme;
  layout?: DashboardLayout;
  charts?: ChartConfig;
  alerts?: AlertConfig;
  enableRealTime?: boolean;
  timezone?: string;
  dateFormat?: string;
  currencyFormat?: string;
  decimals?: number;
}
```

### DashboardState

```typescript
interface DashboardState {
  costMetrics: CostMetrics;
  cacheStats: CacheStats;
  routingStats: RoutingStats;
  performanceMetrics: PerformanceMetrics;
  providerUsage: ProviderUsage[];
  modelUsage: ModelUsage[];
  alerts: DashboardAlert[];
  recentRequests: RequestLog[];
  costHistory: CostHistoryPoint[];
  connectionStatus: ConnectionStatus;
  lastUpdate: number;
  loading: boolean;
  error: string | null;
}
```

### ConnectionStatus

```typescript
interface ConnectionStatus {
  connected: boolean;
  type: 'websocket' | 'polling' | 'static';
  lastConnected: number;
  reconnectAttempts: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}
```

---

## Utilities

### Format Currency

```typescript
function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Example
formatCurrency(1234.56); // "$1,234.56"
```

### Format Number

```typescript
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

// Example
formatNumber(1500000); // "1.5M"
formatNumber(2500);    // "2.5K"
formatNumber(123);     // "123"
```

### Format Timestamp

```typescript
function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Example
formatTimestamp(Date.now() - 30000);      // "Just now"
formatTimestamp(Date.now() - 3600000);    // "1h ago"
formatTimestamp(Date.now() - 86400000);   // "1d ago"
```

---

## WebSocket Protocol

### Server → Client Events

#### state

Full dashboard state snapshot.

```json
{
  "event": "state",
  "data": {
    "costMetrics": { ... },
    "cacheStats": { ... },
    // ... full state
  }
}
```

#### stateUpdate

Partial state update.

```json
{
  "event": "stateUpdate",
  "data": {
    "costMetrics": { ... }
  }
}
```

#### alert

New alert.

```json
{
  "event": "alert",
  "data": {
    "id": "123",
    "type": "budget_warning",
    "severity": "warning",
    "title": "...",
    "message": "...",
    "timestamp": 1234567890,
    "acknowledged": false
  }
}
```

#### ping

Ping message for connection monitoring.

```json
{
  "event": "ping"
}
```

### Client → Server Events

#### getState

Request full state.

```json
{
  "event": "getState"
}
```

#### command

Send command to server.

```json
{
  "event": "command",
  "data": {
    "command": "acknowledgeAlert",
    "data": {
      "alertId": "123"
    }
  }
}
```

#### pong

Response to ping.

```json
{
  "event": "pong"
}
```

---

For more examples, see the `/examples` directory.
