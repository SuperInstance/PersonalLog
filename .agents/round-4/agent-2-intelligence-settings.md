# Agent Briefing: Intelligence Settings Developer

**Agent ID:** Round 4 - Agent 2
**Specialization:** React UI & Settings Pages
**Round:** 4 (Final Integration)

---

## Your Mission

You are the **Intelligence Settings Developer** for Round 4. Your job is to create beautiful, functional settings pages for all Round 3 intelligence systems: Analytics, Experiments, Optimization, and Personalization.

---

## Context: What Already Exists

### Library Systems (Ready to Use)

**Analytics (`src/lib/analytics/*`):**
- `AnalyticsCollector` - Main collector class
- `AnalyticsAggregator` - Data aggregation
- `AnalyticsQueries` - Query functions
- `AnalyticsStorage` - IndexedDB storage

**Experiments (`src/lib/experiments/*`):**
- `ExperimentManager` - Experiment lifecycle
- `AssignmentEngine` - Variant assignment
- `MetricsTracker` - Metric tracking
- `ExperimentStatistics` - Statistical analysis

**Optimization (`src/lib/optimization/*`):**
- `OptimizationEngine` - Main engine
- `PerformanceMonitors` - 5 specialized monitors
- `OptimizationRules` - 26 pre-built rules
- `OptimizationValidator` - A/B validation

**Personalization (`src/lib/personalization/*`):**
- `PreferenceLearner` - Learning from behavior
- `PreferenceModels` - Preference management
- `UIAdapters` - 6 UI adapters
- `PersonalizationStorage` - IndexedDB storage

### Existing Settings Pages

There are already 3 settings pages with a consistent design pattern:
- `src/app/settings/page.tsx` - Main settings hub
- `src/app/settings/system/page.tsx` - Hardware information
- `src/app/settings/benchmarks/page.tsx` - Benchmark runner
- `src/app/settings/features/page.tsx` - Feature flags

**Match this design style:**
- Gradient background (from-slate-50 to-slate-100, dark: from-slate-950 to-slate-900)
- White cards with rounded corners (rounded-xl)
- Sticky header with save button
- Lucide icons
- Responsive grid layouts
- Color-coded sections

---

## Your Deliverables

### 1. Analytics Settings Page

**`src/app/settings/analytics/page.tsx`**

Features:
- Event statistics dashboard
  - Total events tracked
  - Events by category (user actions, performance, engagement, errors)
  - Events over time (mini chart)
- Data management
  - Export data button (JSON download)
  - Delete data button with confirmation
  - Storage usage indicator
- Privacy controls
  - Tracking toggle (enable/disable)
  - Category-specific toggles
  - Session timeout setting
- Event browser
  - Recent events list (paginated)
  - Filter by category/type
  - Search functionality

### 2. Experiments Settings Page

**`src/app/settings/experiments/page.tsx`**

Features:
- Active experiments list
  - Experiment name and description
  - User's current variant
  - Variant assignment date
  - Probability of being best (if available)
- Experiment details modal
  - Full experiment description
  - All variants and their metrics
  - Sample sizes
- Opt-out controls
  - Per-experiment opt-out
  - Global opt-out toggle
  - Reset randomization (re-roll variants)
- Experiment history
  - Past experiments and results
  - When user participated

### 3. Optimization Settings Page

**`src/app/settings/optimization/page.tsx`**

Features:
- Optimization status
  - Engine status (active/inactive)
  - Last run timestamp
  - Rules applied count
- Applied rules list
  - Rule name and category
  - When it was applied
  - Measured impact
  - Rollback button (if applicable)
- Configuration
  - Enable/disable optimization
  - Strategy selector (conservative/balanced/aggressive)
  - Run interval setting
- Manual actions
  - Run optimization now button
  - Reset all optimizations button
  - Clear history button

### 4. Personalization Settings Page

**`src/app/settings/personalization/page.tsx`**

Features:
- Learned preferences display
  - Communication preferences (length, tone, emoji)
  - UI preferences (theme, density, font)
  - Content preferences (topics, reading level)
  - Pattern preferences (hours, session length)
- Confidence levels
  - Visual confidence indicators (progress bars)
  - Sample size per preference
  - Last updated timestamp
- Category opt-outs
  - Toggle per category
  - Clear specific preferences
  - Reset all learning
- Data management
  - Export preferences
  - Import preferences
  - Delete all learned data

---

## Design Requirements

### Consistent Styling

All pages should follow the existing design pattern:

```tsx
// Page structure
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
  {/* Sticky header */}
  <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
    <div className="container mx-auto px-4 py-4">
      <div className="flex items-center justify-between">
        {/* Title and back button */}
        {/* Save button */}
      </div>
    </div>
  </header>

  {/* Main content */}
  <main className="container mx-auto px-4 py-8 max-w-6xl">
    {/* Sections */}
  </main>
</div>
```

### Section Cards

```tsx
<section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
  <div className="p-6 border-b border-slate-200 dark:border-slate-800">
    {/* Section header with icon */}
  </div>
  <div className="p-6">
    {/* Section content */}
  </div>
</section>
```

### Icon Usage

Use Lucide React icons:
- Analytics: `BarChart3`, `TrendingUp`, `Database`, `Shield`
- Experiments: `Flask`, `GitBranch`, `Scale`, `ToggleLeft`
- Optimization: `Zap`, `Cpu`, `Settings`, `History`
- Personalization: `Sparkles`, `Sliders`, `Brain`, `Download`

### Color Coding

| Section | Light Mode | Dark Mode |
|---------|------------|-----------|
| Analytics | Blue (blue-500/600) | Blue (blue-400/500) |
| Experiments | Purple (purple-500/600) | Purple (purple-400/500) |
| Optimization | Amber (amber-500/600) | Amber (amber-400/500) |
| Personalization | Green (green-500/600) | Green (green-400/500) |

---

## Technical Requirements

### Data Fetching

Use the library systems directly via hooks or client-side initialization:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { getAnalyticsCollector } from '@/lib/analytics'

export default function AnalyticsSettingsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAnalyticsCollector().getAggregator().getStats().then(setStats).finally(() => setLoading(false))
  }, [])

  // ...
}
```

### Error Handling

Show user-friendly error messages:

```tsx
{error && (
  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
    <p className="text-red-700 dark:text-red-300">{error.message}</p>
  </div>
)}
```

### Loading States

Show skeleton or spinner during loading:

```tsx
{loading && (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
)}
```

### Confirmation Dialogs

For destructive actions, use confirm():

```tsx
const handleDeleteData = () => {
  if (confirm('Are you sure you want to delete all analytics data? This cannot be undone.')) {
    await collector.deleteAllData()
    // Refresh or redirect
  }
}
```

---

## Success Criteria

1. ✅ All 4 settings pages created
2. ✅ Consistent design with existing pages
3. ✅ Real data from library systems
4. ✅ Export functionality works (JSON download)
5. ✅ Delete functionality works with confirmation
6. ✅ Privacy controls are clear and functional
7. ✅ Responsive design (mobile to desktop)
8. ✅ Dark mode support
9. ✅ Loading states for all async operations
10. ✅ Error handling for all failures

---

## Files to Create

1. `src/app/settings/analytics/page.tsx`
2. `src/app/settings/experiments/page.tsx`
3. `src/app/settings/optimization/page.tsx`
4. `src/app/settings/personalization/page.tsx`

---

## Testing Checklist

After completing your work, verify:

- [ ] All pages load without errors
- [ ] Real data is displayed correctly
- [ ] Export buttons download valid JSON
- [ ] Delete buttons show confirmation
- [ ] Toggles work and persist state
- [ ] Design matches existing settings pages
- [ ] Mobile layout works
- [ ] Dark mode colors look good
- [ ] No console errors

---

## Bonus: Reusable Components

If you find yourself repeating code, extract these into `src/components/settings/`:

- `StatsCard.tsx` - Display a statistic with icon and label
- `EventList.tsx` - Paginated list of events
- `OptOutToggle.tsx` - Toggle with explanation
- `ConfidenceBar.tsx` - Visual confidence indicator
- `DataManagementSection.tsx` - Export/delete controls

---

**Good luck, Agent! Users need clear, beautiful interfaces to understand and control their intelligence systems.**

*Agent Briefing created: 2025-01-02*
*Round 4 - Agent 2: Intelligence Settings Developer*
