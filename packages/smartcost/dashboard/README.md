# SmartCost Dashboard

> 🚨 **Important:** This dashboard UI component is designed to work with the SmartCost core library.

Real-time AI cost monitoring dashboard with beautiful visualizations and live updates.

## Features

✨ **Real-time Updates**
- WebSocket integration for live data streaming
- Auto-refresh with configurable intervals
- Connection status monitoring

📊 **Beautiful Visualizations**
- Cost overview with sparklines
- Provider comparison charts (bar, pie, donut)
- Cost trend graphs with predictions
- Budget progress bars with alerts
- Interactive charts with Recharts

🎨 **Modern Design**
- Responsive layout (mobile, tablet, desktop)
- Dark/light theme support
- Smooth animations (Framer Motion)
- Accessible (WCAG 2.1 AA compliant)
- 60 FPS performance

⚙️ **Configuration UI**
- Budget settings
- Provider API keys
- Routing strategy selection
- Alert configuration
- Theme customization

🚨 **Smart Alerts**
- Budget warnings and critical alerts
- Provider error notifications
- Cache full alerts
- Unusual spend detection
- Desktop notifications support

## Installation

```bash
npm install @superinstance/smartcost
```

## Quick Start

```tsx
import { SmartCostDashboard } from '@superinstance/smartcost/dashboard';

function App() {
  return (
    <SmartCostDashboard
      budget={500}
      websocketUrl="ws://localhost:3000"
      enableRealTime={true}
    />
  );
}
```

## Components

### SmartCostDashboard

Main dashboard component that combines all visualizations.

```tsx
import { SmartCostDashboard } from '@superinstance/smartcost/dashboard';

<SmartCostDashboard
  budget={500}
  websocketUrl="ws://localhost:3000"
  enableRealTime={true}
  onConfigChange={(config) => console.log(config)}
/>
```

**Props:**
- `budget` (required): Monthly budget in USD
- `websocketUrl`: WebSocket server URL
- `enableRealTime`: Enable real-time updates (default: true)
- `config`: Dashboard configuration object
- `onConfigChange`: Callback when config changes

### CostOverviewCard

Displays current cost metrics with budget progress.

```tsx
import { CostOverviewCard } from '@superinstance/smartcost/dashboard';

<CostOverviewCard
  metrics={costMetrics}
  budget={500}
  currency="USD"
  showSparkline={true}
  timeRange="30d"
/>
```

### ProviderComparisonChart

Visualizes provider usage and costs.

```tsx
import { ProviderComparisonChart } from '@superinstance/smartcost/dashboard';

<ProviderComparisonChart
  providers={providerUsage}
  chartType="bar"
  metric="cost"
  timeRange="30d"
/>
```

**Chart types:** `bar`, `pie`, `donut`
**Metrics:** `cost`, `requests`, `latency`

### CostTrendGraph

Shows cost trends over time with optional predictions.

```tsx
import { CostTrendGraph } from '@superinstance/smartcost/dashboard';

<CostTrendGraph
  history={costHistory}
  budget={500}
  showBudgetLine={true}
  showPredictions={true}
  chartType="area"
  timeRange="30d"
/>
```

### BudgetProgressBar

Animated budget progress bar with color coding.

```tsx
import { BudgetProgressBar } from '@superinstance/smartcost/dashboard';

<BudgetProgressBar
  used={350}
  total={500}
  alertThreshold={80}
  showPercentage={true}
  showRemaining={true}
  colorCode={true}
/>
```

### AlertList

Displays alerts with filtering and acknowledgment.

```tsx
import { AlertList } from '@superinstance/smartcost/dashboard';

<AlertList
  alerts={alerts}
  maxAlerts={10}
  filterSeverity={['critical', 'error']}
  onAcknowledge={(alertId) => console.log('Ack:', alertId)}
  onDismiss={(alertId) => console.log('Dismiss:', alertId)}
/>
```

### ConfigurationPanel

Full-featured settings panel.

```tsx
import { ConfigurationPanel } from '@superinstance/smartcost/dashboard';

<ConfigurationPanel
  config={dashboardConfig}
  onChange={(newConfig) => setConfig(newConfig)}
  onSave={() => console.log('Saved')}
  onReset={() => console.log('Reset')}
  readOnly={false}
/>
```

## Hooks

### useSmartCostRealtime

Hook for real-time dashboard updates via WebSocket.

```tsx
import { useSmartCostRealtime } from '@superinstance/smartcost/dashboard';

function MyComponent() {
  const { state, connectionStatus, refresh, sendCommand } = useSmartCostRealtime(
    initialState,
    {
      url: 'ws://localhost:3000',
      enabled: true,
      onConnectionChange: (status) => console.log(status),
      onError: (error) => console.error(error),
    }
  );

  return (
    <div>
      <p>Status: {connectionStatus.connected ? 'Connected' : 'Disconnected'}</p>
      <p>Total Cost: ${state.costMetrics.totalCost.toFixed(2)}</p>
    </div>
  );
}
```

**Returns:**
- `state`: Current dashboard state
- `connectionStatus`: WebSocket connection status
- `connect()`: Manually connect
- `disconnect()`: Manually disconnect
- `refresh()`: Manually refresh state
- `sendCommand()`: Send command to server

## Configuration

### Dashboard Config

```typescript
interface DashboardConfig {
  // Real-time settings
  updateInterval?: number;        // Default: 1000 (1 second)
  websocketUrl?: string;          // WebSocket URL
  enableRealTime?: boolean;       // Default: true

  // Theme
  theme?: {
    darkMode?: boolean;
    colors?: {
      primary?: string;
      secondary?: string;
      success?: string;
      warning?: string;
      error?: string;
      info?: string;
      background?: string;
      cardBackground?: string;
      text?: string;
      border?: string;
      gridLine?: string;
    };
    customCSS?: string;
  };

  // Layout
  layout?: {
    mode?: 'grid' | 'list' | 'compact';
    cardSize?: 'small' | 'medium' | 'large';
    columns?: number;
    showComponents?: {
      costOverview?: boolean;
      savingsDisplay?: boolean;
      providerComparison?: boolean;
      costTrends?: boolean;
      budgetProgress?: boolean;
      alerts?: boolean;
      cacheStats?: boolean;
      routingStats?: boolean;
    };
  };

  // Charts
  charts?: {
    library?: 'recharts' | 'chartjs' | 'd3';
    defaultType?: 'line' | 'bar' | 'area' | 'pie' | 'donut';
    animationDuration?: number;
    showTooltips?: boolean;
    showLegends?: boolean;
    colors?: string[];
    lineWidth?: number;
    pointSize?: number;
  };

  // Alerts
  alerts?: {
    enableSound?: boolean;
    enableNotifications?: boolean;
    soundUrl?: string;
    cooldown?: number;
    persistent?: boolean;
    autoDismiss?: number;
  };
}
```

## Styling

### Global Styles

Import the global CSS for styling:

```tsx
import '@superinstance/smartcost/dashboard/styles';
```

### Tailwind CSS

The dashboard uses Tailwind CSS. Ensure you have it configured:

```js
// tailwind.config.js
module.exports = {
  content: [
    './node_modules/@superinstance/smartcost/dashboard/**/*.{tsx,ts}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### Custom CSS

Add custom CSS via the theme config:

```tsx
const config = {
  theme: {
    customCSS: `
      .my-custom-class {
        background: red;
      }
    `,
  },
};
```

## WebSocket Server

The dashboard expects a WebSocket server with the following events:

### Server → Client Events

- `state`: Full dashboard state
- `stateUpdate`: Partial state update
- `costMetrics`: Cost metrics update
- `cacheStats`: Cache statistics update
- `routingStats`: Routing statistics update
- `performanceMetrics`: Performance metrics update
- `providerUsage`: Provider usage data
- `modelUsage`: Model usage data
- `alert`: New alert
- `requestLog`: New request log
- `costHistory`: Cost history data
- `ping`: Ping message

### Client → Server Events

- `getState`: Request full state
- `command`: Send command (e.g., acknowledge alert)

Example server implementation:

```js
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3000 });

wss.on('connection', (ws) => {
  // Send initial state
  ws.send(JSON.stringify({
    event: 'state',
    data: dashboardState,
  }));

  // Handle commands
  ws.on('message', (data) => {
    const { event, data } = JSON.parse(data);

    if (event === 'getState') {
      ws.send(JSON.stringify({ event: 'state', data: dashboardState }));
    }

    if (event === 'command') {
      // Handle command
      console.log('Command:', data);
    }
  });
});

// Broadcast updates
function broadcastUpdate(event, data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event, data }));
    }
  });
}
```

## TypeScript

All components are fully typed. Exported types include:

- `DashboardConfig`
- `DashboardState`
- `DashboardAlert`
- `ConnectionStatus`
- `CostOverviewCardProps`
- `ProviderComparisonChartProps`
- `CostTrendGraphProps`
- `BudgetProgressBarProps`
- `AlertListProps`
- `ConfigurationPanelProps`

## Performance

- **Optimized rendering**: Only re-renders when data changes
- **Lazy loading**: Components load data on demand
- **Debounced updates**: Prevents excessive re-renders
- **60 FPS animations**: Smooth transitions with Framer Motion
- **WebSocket reconnection**: Auto-reconnect with exponential backoff

## Accessibility

- **WCAG 2.1 AA compliant**: Color contrast, focus indicators
- **Keyboard navigation**: All components accessible via keyboard
- **Screen reader support**: Proper ARIA labels and roles
- **Reduced motion**: Respects prefers-reduced-motion
- **High contrast mode**: Supports high contrast preferences

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines.

## Support

- GitHub Issues: https://github.com/SuperInstance/SmartCost/issues
- Documentation: https://docs.smartcost.dev
- Discord: https://discord.gg/smartcost

Made with ❤️ by the SuperInstance team
