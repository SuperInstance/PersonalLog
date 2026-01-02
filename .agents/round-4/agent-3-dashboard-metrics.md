# Agent Briefing: Dashboard & Metrics UI Developer

**Agent ID:** Round 4 - Agent 3
**Specialization:** Data Visualization & Dashboard Design
**Round:** 4 (Final Integration)

---

## Your Mission

You are the **Dashboard & Metrics UI Developer** for Round 4. Your job is to create a unified intelligence dashboard that gives users an at-a-glance view of all intelligence systems, plus update the main settings hub to include navigation to all new settings pages.

---

## Context: What Already Exists

### Current Settings Hub

`src/app/settings/page.tsx` has cards for:
- System Information
- Benchmarks
- Feature Flags

This needs to be extended with cards for the new intelligence settings.

### Library Systems Available

All systems provide status and metrics:

**Analytics:**
- Event counts by category
- Storage usage
- Session statistics
- Query results

**Experiments:**
- Active experiments
- Current variants
- Win probabilities
- Sample sizes

**Optimization:**
- Engine status
- Applied rules
- Performance improvements
- Recommendations

**Personalization:**
- Learned preferences
- Confidence levels
- Sample sizes
- Opt-out status

### Existing UI Components

`src/components/settings/` has:
- `HardwareInfoCard.tsx` - Hardware profile display
- `SystemStatusCard.tsx` - Critical systems status
- `BenchmarkResults.tsx` - Visual benchmark display
- `FeatureFlagToggle.tsx` - Individual flag toggle

---

## Your Deliverables

### 1. Intelligence Dashboard

**`src/app/settings/intelligence/page.tsx`**

This is the "mission control" for all intelligence systems.

**Header Section:**
- Title: "Intelligence Dashboard"
- Description: "Overview of all self-improving systems"
- Quick stats: 4 cards showing key metrics

**System Status Grid:**

Create a status card for each system:

| System | Status Metric | Secondary Metric | Action |
|--------|---------------|------------------|--------|
| Analytics | Events tracked | Storage used | Export/Delete |
| Experiments | Active tests | Your variants | Opt out |
| Optimization | Rules applied | Improvement % | Enable/Disable |
| Personalization | Preferences learned | Avg confidence | Reset learning |

**Insights Section:**

Show actionable insights from each system:

```
📊 Analytics Insights
• Most used feature: Messenger (42% of sessions)
• Average session length: 8.3 minutes
• Error rate: 0.02% (excellent)

🧪 Experiment Insights
• Currently participating in 3 experiments
• Your variants: AI-chat=B, ui-density=compact
• One experiment has a clear winner (opt in to see)

⚡ Optimization Insights
• 5 rules applied since last login
• Estimated performance gain: +15%
• Recommendation: Run full benchmark

✨ Personalization Insights
• Learned 12 preferences across 4 categories
• High confidence in theme (dark mode) and font size
• Low confidence in content preferences (more data needed)
```

**Quick Actions Panel:**

Buttons for common actions:
- Run all benchmarks
- Export all intelligence data
- Reset all learning
- Generate diagnostic report

**Activity Timeline:**

Show recent intelligence system activity:
- "New preference learned: You prefer compact UI" (2 hours ago)
- "Optimization applied: Enabled virtualization" (5 hours ago)
- "Experiment completed: AI chat model B won" (1 day ago)
- "Benchmark results: Performance score improved" (2 days ago)

### 2. Update Settings Hub

**Update `src/app/settings/page.tsx`**

Add new cards for the intelligence settings:

```tsx
const settingsCards: SettingsCard[] = [
  // Existing cards...
  {
    title: 'System Information',
    description: 'View detailed hardware info, capabilities, and performance profile',
    icon: Cpu,
    href: '/settings/system',
    color: 'blue',
  },
  {
    title: 'Benchmarks',
    description: 'Run performance benchmarks and view historical results',
    icon: BarChart3,
    href: '/settings/benchmarks',
    color: 'purple',
  },
  {
    title: 'Feature Flags',
    description: 'Manage feature flags and experimental functionality',
    icon: Sparkles,
    href: '/settings/features',
    color: 'green',
  },

  // NEW: Intelligence cards
  {
    title: 'Intelligence Dashboard',
    description: 'Overview of all self-improving systems and their status',
    icon: Brain,
    href: '/settings/intelligence',
    color: 'indigo',
  },
  {
    title: 'Analytics',
    description: 'View usage statistics and manage your data',
    icon: BarChart3,
    href: '/settings/analytics',
    color: 'blue',
  },
  {
    title: 'Experiments',
    description: 'Manage A/B test participation and view results',
    icon: Flask,
    href: '/settings/experiments',
    color: 'purple',
  },
  {
    title: 'Optimization',
    description: 'Configure automatic performance optimization',
    icon: Zap,
    href: '/settings/optimization',
    color: 'amber',
  },
  {
    title: 'Personalization',
    description: 'Manage learned preferences and privacy settings',
    icon: Sparkles,
    href: '/settings/personalization',
    color: 'green',
  },
];
```

---

## Design Requirements

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ Header: Intelligence Dashboard                      │
├─────────────────────────────────────────────────────┤
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐           │
│ │Stats 1│ │Stats 2│ │Stats 3│ │Stats 4│           │
│ └───────┘ └───────┘ └───────┘ └───────┘           │
├─────────────────────────────────────────────────────┤
│ System Status Cards (2x2 grid)                      │
│ ┌─────────────┐ ┌─────────────┐                    │
│ │ Analytics   │ │Experiments  │                    │
│ │ Status      │ │ Status      │                    │
│ └─────────────┘ └─────────────┘                    │
│ ┌─────────────┐ ┌─────────────┐                    │
│ │Optimization │ │Personalize  │                    │
│ │ Status      │ │ Status      │                    │
│ └─────────────┘ └─────────────┘                    │
├─────────────────────────────────────────────────────┤
│ Insights Section (accordion or cards)               │
├─────────────────────────────────────────────────────┤
│ Quick Actions                                      │
│ [Run Benchmarks] [Export Data] [Reset Learning]    │
├─────────────────────────────────────────────────────┤
│ Activity Timeline                                   │
│ • Recent activity item...                           │
│ • Another activity item...                          │
└─────────────────────────────────────────────────────┘
```

### Visual Design Principles

**Status Indicators:**
- 🟢 Green: Active/Healthy
- 🟡 Yellow: Paused/Low Confidence
- 🔴 Red: Error/Disabled
- ⚪ Gray: Not Available

**Metric Display:**
- Large numbers for primary metrics
- Small labels for context
- Trend indicators (↑↓) for changes
- Sparklines for time-series data

**Insights Styling:**
- Icon for each insight type
- Bullet points for readability
- Color-coded by system
- Action buttons where relevant

### Icons

Use Lucide React icons:
- Dashboard: `LayoutDashboard`, `Brain`
- Analytics: `BarChart3`, `TrendingUp`
- Experiments: `Flask`, `GitBranch`
- Optimization: `Zap`, `Settings`
- Personalization: `Sparkles`, `Sliders`
- Actions: `Play`, `Download`, `RotateCcw`, `FileText`
- Timeline: `Clock`, `Activity`

---

## Technical Requirements

### Data Fetching Pattern

```tsx
'use client'

import { useState, useEffect } from 'react'
import {
  getAnalyticsCollector,
  getExperimentManager,
  getOptimizationEngine,
  getPreferenceLearner,
} from '@/lib/...'

interface IntelligenceDashboardState {
  analytics: {
    eventCount: number
    storageUsed: string
    sessions: number
  }
  experiments: {
    active: number
    variants: number
    completed: number
  }
  optimization: {
    rulesApplied: number
    improvement: number
    enabled: boolean
  }
  personalization: {
    preferences: number
    avgConfidence: number
    categories: number
  }
}

export default function IntelligenceDashboard() {
  const [state, setState] = useState<IntelligenceDashboardState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getAnalyticsCollector().getAggregator().getStats(),
      getExperimentManager().getAllExperiments(),
      getOptimizationEngine().getStatus(),
      getPreferenceLearner().getModels().getAllPreferences(),
    ]).then(([analytics, experiments, optimization, personalization]) => {
      setState({ /* transform data */ })
      setLoading(false)
    })
  }, [])

  // ...
}
```

### Refresh Mechanism

Add a refresh button and auto-refresh every 30 seconds:

```tsx
const [refreshing, setRefreshing] = useState(false)

const handleRefresh = async () => {
  setRefreshing(true)
  // Refetch all data
  setRefreshing(false)
}

useEffect(() => {
  const interval = setInterval(handleRefresh, 30000)
  return () => clearInterval(interval)
}, [])
```

---

## Bonus Components to Create

If you have time, extract reusable components:

**`src/components/dashboard/StatusCard.tsx`**
```tsx
interface StatusCardProps {
  title: string
  icon: React.ElementType
  status: 'healthy' | 'warning' | 'error' | 'disabled'
  primaryMetric: { value: string; label: string; trend?: number }
  secondaryMetric: { value: string; label: string }
  action?: { label: string; onClick: () => void }
  href: string
}
```

**`src/components/dashboard/InsightCard.tsx`**
```tsx
interface InsightCardProps {
  icon: React.ElementType
  title: string
  insights: string[]
  color: 'blue' | 'purple' | 'amber' | 'green'
}
```

**`src/components/dashboard/QuickActionBtn.tsx`**
```tsx
interface QuickActionBtnProps {
  icon: React.ElementType
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}
```

**`src/components/dashboard/ActivityTimeline.tsx`**
```tsx
interface ActivityItem {
  id: string
  message: string
  timestamp: Date
  icon?: React.ElementType
  color?: string
}

interface ActivityTimelineProps {
  activities: ActivityItem[]
  maxItems?: number
}
```

---

## Success Criteria

1. ✅ Intelligence dashboard created with all sections
2. ✅ Real-time status from all 4 systems
3. ✅ Actionable insights displayed
4. ✅ Quick actions work (navigate or execute)
5. ✅ Activity timeline shows recent events
6. ✅ Settings hub updated with 4 new cards
7. ✅ Consistent design with existing pages
8. ✅ Loading states for all data
9. ✅ Error handling
10. ✅ Responsive and accessible

---

## Files to Create

1. `src/app/settings/intelligence/page.tsx`
2. `src/components/dashboard/StatusCard.tsx` (optional but recommended)
3. `src/components/dashboard/InsightCard.tsx` (optional but recommended)
4. `src/components/dashboard/QuickActionBtn.tsx` (optional but recommended)
5. `src/components/dashboard/ActivityTimeline.tsx` (optional but recommended)

## Files to Modify

1. `src/app/settings/page.tsx` - Add 4 new settings cards

---

## Testing Checklist

After completing your work, verify:

- [ ] Dashboard loads without errors
- [ ] All 4 system statuses are shown
- [ ] Status cards link to detailed pages
- [ ] Insights are readable and actionable
- [ ] Quick actions work
- [ ] Activity timeline shows real data
- [ ] Settings hub has all 7 cards (3 existing + 4 new)
- [ ] Mobile layout works
- [ ] Dark mode looks good
- [ ] No console errors

---

**Good luck, Agent! The intelligence dashboard is the face of all our self-improving systems. Make it beautiful and informative.**

*Agent Briefing created: 2025-01-02*
*Round 4 - Agent 3: Dashboard & Metrics UI Developer*
