# Settings Guide

Complete documentation for all PersonalLog settings pages, including feature flags, privacy controls, and data management.

## Table of Contents

- [Overview](#overview)
- [System Settings](#system-settings)
- [Benchmarks](#benchmarks)
- [Features](#features)
- [Analytics](#analytics)
- [Experiments](#experiments)
- [Optimization](#optimization)
- [Personalization](#personalization)
- [Intelligence Dashboard](#intelligence-dashboard)
- [Privacy & Data Management](#privacy--data-management)

## Overview

PersonalLog provides comprehensive settings for managing application behavior, privacy, and performance. Access settings by navigating to `/settings` in your browser.

### Settings Categories

| Category | Purpose | Page |
|----------|---------|------|
| System | Hardware info, performance class | `/settings/system` |
| Benchmarks | Run performance tests | `/settings/benchmarks` |
| Features | Toggle feature flags | `/settings/features` |
| Analytics | View and manage usage data | `/settings/analytics` |
| Experiments | Manage A/B test participation | `/settings/experiments` |
| Optimization | Performance optimization settings | `/settings/optimization` |
| Personalization | Learned preferences | `/settings/personalization` |
| Intelligence | Overall system health | `/settings/intelligence` |

## System Settings

### Hardware Information

View detailed information about your device's hardware capabilities.

**Available Metrics:**
- CPU: Cores, architecture, features
- Memory: Total, available, estimated usage
- GPU: Renderer, vendor, memory (if available)
- Performance Score: 0-100 scale
- Performance Class: low, medium, high, or ultra

**Performance Classes:**
- **Low** (0-30): Basic features, no animations
- **Medium** (31-60): Standard features, reduced effects
- **High** (61-85): Full features, standard effects
- **Ultra** (86-100): All features, maximum quality

### Feature Support

Shows which browser features are available:

- WebAssembly: Hardware acceleration support
- Web Workers: Parallel processing capability
- WebGL: GPU-accelerated graphics
- Service Workers: Offline functionality
- IndexedDB: Local database storage

### Storage Quota

View storage usage and quotas:
- **Used**: Current storage consumption
- **Available**: Remaining storage space
- **Quota**: Total storage limit

## Benchmarks

Run performance tests to validate hardware detection and optimize system behavior.

### Benchmark Categories

1. **Vector Operations**: Tests mathematical computation performance
2. **Memory Operations**: Tests data manipulation speed
3. **Render Performance**: Tests UI rendering capabilities
4. **Network Speed**: Tests API response times
5. **Storage Speed**: Tests database read/write performance

### Running Benchmarks

1. Navigate to `/settings/benchmarks`
2. Click "Run Benchmarks"
3. Wait for completion (typically 5-30 seconds)
4. View results and recommendations

**Note:** Benchmarks may impact application performance while running. Consider running them during idle periods.

### Interpreting Results

Each benchmark provides:
- **Score**: Raw performance metric
- **Percentile**: How your device compares to others
- **Recommendation**: Specific optimization suggestions

## Features

Control which features are enabled in PersonalLog.

### Feature Flags

| Feature | Description | Default |
|---------|-------------|---------|
| Messenger | Messaging-style conversations | Enabled |
| Knowledge | Knowledge management system | Enabled |
| AI Chat | AI-powered conversations | Enabled |
| Advanced Search | Full-text search | Auto |
| Offline Mode | Offline functionality | Auto |
| Analytics | Usage tracking | Enabled |

### Auto-Performance Gating

Features marked "Auto" are automatically enabled/disabled based on your device's performance:

- **High-end devices**: All features enabled
- **Low-end devices**: Resource-intensive features disabled

### Manual Control

Override automatic decisions by toggling features manually:

1. Navigate to `/settings/features`
2. Locate the feature you want to control
3. Toggle the switch

**Warning:** Enabling performance-heavy features on low-end devices may cause lag.

## Analytics

PersonalLog tracks usage analytics to improve the application and enable intelligent features.

### What We Track

**Automatic Tracking:**
- Page views: Which pages you visit
- Events: Actions you take (clicks, form submissions, etc.)
- Sessions: How long you use the app
- Performance: Load times, interaction delays

**Never Tracked:**
- Passwords or sensitive data
- Exact keystrokes or mouse movements
- Content of your conversations or notes

### Viewing Analytics

1. Navigate to `/settings/analytics`
2. View summary statistics:
   - Total events tracked
   - Session duration
   - Most used features
   - Performance metrics

### Exporting Analytics Data

Download your analytics data as JSON:

1. Click "Export" button on analytics page
2. Save the file to your device

**Export Format:**
```json
{
  "events": [
    {
      "type": "page_view",
      "timestamp": 1699900000000,
      "data": {
        "page": "/knowledge"
      }
    }
  ],
  "metadata": {
    "exportedAt": "2024-01-02T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

### Clearing Analytics Data

Delete all tracked analytics:

1. Click "Delete" button on analytics page
2. Confirm deletion in the dialog
3. Data is immediately removed from storage

**Warning:** This action cannot be undone.

### Disabling Analytics

Turn off analytics tracking:

1. Navigate to `/settings/features`
2. Find "Analytics" feature
3. Toggle to disabled

**Effect:** No new events will be tracked. Existing data remains until deleted.

## Experiments

PersonalLog uses A/B testing to evaluate new features and improvements.

### How Experiments Work

1. You're randomly assigned to a variant (control or treatment)
2. Your experience may differ slightly from other users
3. We measure which variant performs better
4. Winning variant becomes the default

### Current Experiments

View active experiments on `/settings/experiments`:

- **Experiment Name**: Description of what's being tested
- **Your Variant**: Which variant you're assigned to
- **Status**: Active, completed, or pending

### Opting Out

You can opt out of experiments:

1. Navigate to `/settings/experiments`
2. Toggle "Participate in Experiments" to off
3. All experiments will use default (control) variant

**Effect:** You'll always see the standard experience without experimental changes.

### Opting Back In

Re-enable experiment participation:

1. Navigate to `/settings/experiments`
2. Toggle "Participate in Experiments" to on
3. You'll be assigned to new experiments going forward

## Optimization

PersonalLog automatically optimizes performance based on your device capabilities.

### Optimization Strategies

**Low-End Devices (< 30 score):**
- Reduced animations
- Lower image quality
- Disabled resource-intensive features
- Aggressive caching

**Medium Devices (30-60 score):**
- Standard animations
- Balanced image quality
- Selective feature enablement
- Normal caching

**High-End Devices (> 60 score):**
- Full animations
- Maximum image quality
- All features enabled
- Intelligent caching

### Viewing Recommendations

See optimization recommendations:

1. Navigate to `/settings/optimization`
2. View current optimization level
3. See specific recommendations for your device

### Manual Overrides

Override automatic optimizations:

1. Navigate to `/settings/optimization`
2. Toggle specific optimizations on/off
3. Changes take effect immediately

**Note:** Manual overrides may impact performance.

### Resetting Optimizations

Reset to automatic optimization:

1. Navigate to `/settings/optimization`
2. Click "Reset to Automatic"
3. Confirm the reset

## Personalization

PersonalLog learns from your behavior to provide a better experience.

### What We Learn

**Usage Patterns:**
- Which features you use most
- Time of day you're active
- Common workflows
- Navigation preferences

**Preferences:**
- Display settings
- Content organization
- Feature prioritization

### Viewing Learned Preferences

See what PersonalLog has learned:

1. Navigate to `/settings/personalization`
2. Browse learned preferences by category

### Exporting Preferences

Download your preference data:

1. Click "Export" button
2. Save JSON file

**Format:**
```json
{
  "preferences": {
    "preferredLayout": "messenger",
    "lastUsedFeatures": ["knowledge", "ai-chat"],
    "activeTimeOfDay": "morning"
  },
  "actions": [...],
  "lastUpdated": 1699900000000
}
```

### Resetting Preferences

Clear all learned preferences:

1. Navigate to `/settings/personalization`
2. Click "Reset Preferences"
3. Confirm the reset

**Effect:** PersonalLog will "forget" what it learned and start fresh.

## Intelligence Dashboard

View overall system health and status across all intelligence systems.

### System Health Overview

**Health Levels:**
- 🟢 **Healthy**: All systems functioning normally
- 🟡 **Degraded**: Some systems using fallbacks
- 🔴 **Unhealthy**: Critical systems failing

### System Status

| System | Status | Details |
|--------|--------|---------|
| Hardware Detection | Ready/Failed | Capability detection |
| Native Bridge | Ready/Failed | WASM acceleration |
| Feature Flags | Ready/Failed | Feature management |
| Benchmarks | Ready/Failed/Disabled | Performance testing |
| Analytics | Active/Inactive | Usage tracking |
| Experiments | Active/Inactive | A/B testing |
| Optimization | Active/Inactive | Performance tuning |
| Personalization | Active/Inactive | Preference learning |

### Running Diagnostics

Perform a full system check:

1. Navigate to `/settings/intelligence`
2. Click "Run Diagnostics"
3. Wait for completion
4. View detailed results

**Diagnostic Results Include:**
- Individual system health
- Specific issues detected
- Recommendations for fixes

### Recommendations

Based on diagnostics, you may see:

- **High Priority**: Action required to restore functionality
- **Medium Priority**: Recommended improvements
- **Low Priority**: Optional enhancements

## Privacy & Data Management

PersonalLog respects your privacy and provides full control over your data.

### Data Privacy Principles

1. **Local Storage**: All data stored locally on your device
2. **No Tracking**: No third-party analytics or tracking
3. **User Control**: Full control over what's collected
4. **Transparency**: Clear documentation of what's tracked
5. **Deletability**: Easy deletion of all data

### GDPR Rights

PersonalLog supports your GDPR rights:

**Right to Access:**
- Export all your data from settings pages
- View analytics events
- See learned preferences

**Right to Rectification:**
- Edit preferences in personalization settings
- Update feature flags in features settings

**Right to Erasure:**
- Delete analytics data
- Reset preferences
- Clear all local storage

**Right to Portability:**
- Export data in standard JSON format
- Import data to other devices

**Right to Object:**
- Opt out of experiments
- Disable analytics
- Disable personalization

### Data Export

Export all your data at once:

1. Navigate to `/settings/intelligence`
2. Click "Export All Data"
3. Download complete data package

**Includes:**
- Analytics events
- Learned preferences
- Experiment assignments
- System configuration

### Complete Data Deletion

Delete ALL data from PersonalLog:

1. Navigate to `/settings/intelligence`
2. Click "Delete All Data"
3. Confirm deletion (may require multiple confirmations)
4. All data permanently removed

**Warning:** This action is irreversible and will delete:
- All analytics events
- All learned preferences
- All settings
- All local storage data

### Selective Data Deletion

Delete specific data types:

- **Analytics**: `/settings/analytics` → Delete
- **Preferences**: `/settings/personalization` → Reset
- **Experiments**: `/settings/experiments` → Opt Out

---

## Troubleshooting

### Settings Not Saving

If settings changes don't persist:

1. Check browser console for errors
2. Verify localStorage is enabled
3. Check available storage space
4. Try clearing browser cache

### Features Not Working

If a feature doesn't work when enabled:

1. Check if your device supports required features
2. Run benchmarks to verify performance
3. Check console for error messages
4. Try disabling and re-enabling the feature

### Performance Issues

If PersonalLog is running slowly:

1. Navigate to `/settings/system`
2. Check your performance class
3. Run benchmarks to identify bottlenecks
4. Review optimization recommendations
5. Disable resource-intensive features

### Data Not Appearing

If analytics or preferences aren't showing:

1. Verify the feature is enabled
2. Check if you've opted out
3. Try refreshing the page
4. Check browser console for errors

---

## Need Help?

- **Issues**: Report bugs on GitHub
- **Questions**: Start a GitHub discussion
- **Documentation**: See [README](../README.md) and [INTEGRATION](./INTEGRATION.md)
