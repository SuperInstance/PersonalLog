# Monitoring Setup Guide - PersonalLog

**Date:** 2026-01-04
**Version:** 1.0.0

---

## Overview

PersonalLog includes comprehensive monitoring systems for both performance and security. This guide explains how to use and extend the monitoring capabilities.

---

## Table of Contents

1. [Performance Monitoring](#performance-monitoring)
2. [Security Monitoring](#security-monitoring)
3. [Monitoring Dashboard](#monitoring-dashboard)
4. [Custom Metrics](#custom-metrics)
5. [Alerting](#alerting)
6. [Data Export](#data-export)
7. [Integration](#integration)

---

## 1. Performance Monitoring

### Location
`/src/lib/monitoring/performance.ts`

### Features

The performance monitoring system automatically tracks:

1. **Core Web Vitals**
   - LCP (Largest Contentful Paint)
   - FCP (First Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)
   - TTFB (Time to First Byte)

2. **Resource Timing**
   - Script loading times
   - CSS loading times
   - Image loading times
   - API call durations

3. **Navigation Timing**
   - DOM content loaded
   - Load complete
   - Total page load time

4. **Memory Usage**
   - JavaScript heap size
   - Memory allocation tracking

5. **Long Tasks**
   - Tasks blocking main thread
   - Performance bottlenecks

### Usage

```typescript
import { getPerformanceMonitor, trackAPICall, recordCustomMetric } from '@/lib/monitoring';

// Get the monitor instance
const perfMonitor = getPerformanceMonitor();

// Get Web Vitals summary
const vitals = perfMonitor.getWebVitalsSummary();
console.log('LCP:', vitals.lcp?.value);

// Get performance score
const score = perfMonitor.getPerformanceScore();
console.log('Performance Score:', score.score, score.rating);

// Track API calls (automatic with monitoredFetch)
trackAPICall('/api/chat', 150, 200, true);

// Record custom metrics
recordCustomMetric('custom-operation', 42, 'good');

// Get resource timing summary
const resources = perfMonitor.getResourceTimingSummary();

// Get API metrics summary
const apiMetrics = perfMonitor.getAPIMetricsSummary();
```

### Performance Scoring

The system calculates a performance score (0-100) based on:

- LCP < 2.5s = excellent, 2.5-4s = needs improvement, >4s = poor
- FID < 100ms = excellent, 100-300ms = needs improvement, >300ms = poor
- CLS < 0.1 = excellent, 0.1-0.25 = needs improvement, >0.25 = poor

**Score Ratings:**
- 90-100: Excellent
- 70-89: Good
- 50-69: Fair
- <50: Poor

---

## 2. Security Monitoring

### Location
`/src/lib/monitoring/security.ts`

### Features

The security monitoring system automatically tracks:

1. **XSS Detection**
   - URL parameter scanning
   - Input validation
   - Pattern detection

2. **CSRF Protection**
   - Cross-origin request detection
   - Origin validation

3. **Rate Limiting**
   - Request rate tracking
   - Automatic blocking
   - Configurable limits

4. **Input Validation**
   - Sanitization
   - Dangerous pattern detection
   - Security event logging

5. **Security Metrics**
   - Event tracking
   - Severity classification
   - Security scoring

### Usage

```typescript
import { getSecurityMonitor, recordSecurityEvent, validateSecureInput, checkRateLimit } from '@/lib/monitoring';

// Get the monitor instance
const secMonitor = getSecurityMonitor();

// Record security events
recordSecurityEvent('xss-attempt', 'high', 'XSS attempt detected', {
  parameter: 'search',
  value: '<script>alert(1)</script>'
});

// Validate user input
const validation = validateSecureInput(userInput, 'comment');
if (!validation.valid) {
  console.error('Invalid input:', validation.error);
}

// Check rate limits
if (!checkRateLimit('api-chat', 100, 60000)) {
  console.warn('Rate limit exceeded');
}

// Get security metrics
const metrics = secMonitor.getSecurityMetrics();

// Get security score
const score = secMonitor.getSecurityScore();
console.log('Security Score:', score.score, score.rating);
```

### Security Scoring

The system calculates a security score (0-100) based on:

- Critical events: -50 points each
- High severity: -25 points each
- Medium severity: -10 points each
- Low severity: -5 points each
- Blocked requests: -20 to -5 points (based on volume)

**Score Ratings:**
- 90-100: Secure
- 70-89: Mostly Secure
- 50-69: At Risk
- <50: Vulnerable

---

## 3. Monitoring Dashboard

### Location
`/src/components/monitoring/MonitoringDashboard.tsx`

### Features

The monitoring dashboard provides:

1. **Real-time Metrics**
   - Performance score
   - Security score
   - Web Vitals
   - API metrics

2. **Visual Display**
   - Score cards with color coding
   - Event timelines
   - Performance graphs

3. **Auto-refresh**
   - Updates every 5 seconds
   - Manual refresh button

### Usage

Add the dashboard to any page:

```tsx
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard';

export default function SettingsPage() {
  return (
    <div>
      <h1>System Settings</h1>
      <MonitoringDashboard />
    </div>
  );
}
```

### Creating a Dedicated Monitoring Page

```tsx
// src/app/monitoring/page.tsx
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard';

export default function MonitoringPage() {
  return (
    <div className="container mx-auto">
      <MonitoringDashboard />
    </div>
  );
}
```

---

## 4. Custom Metrics

### Performance Metrics

Track custom performance metrics:

```typescript
import { recordCustomMetric } from '@/lib/monitoring';

// Track a custom operation
const startTime = performance.now();
await performExpensiveOperation();
const duration = performance.now() - startTime;

recordCustomMetric('expensive-operation', duration, duration < 1000 ? 'good' : 'needs-improvement');
```

### Security Events

Record custom security events:

```typescript
import { recordSecurityEvent } from '@/lib/monitoring';

// Track authentication attempts
recordSecurityEvent('auth-attempt', 'low', 'User login attempt', {
  userId: '123',
  success: true
});

// Track data access
recordSecurityEvent('data-access', 'low', 'User accessed sensitive data', {
  resource: '/api/conversations/123',
  action: 'read'
});
```

### Custom Rate Limits

Implement custom rate limiting:

```typescript
import { checkRateLimit } from '@/lib/monitoring';

// Limit API calls per user
const userId = getUserSessionId();
if (!checkRateLimit(`api-user-${userId}`, 100, 60000)) {
  return new Response('Too many requests', { status: 429 });
}

// Limit feature usage
if (!checkRateLimit(`feature-export-${userId}`, 10, 3600000)) {
  return new Response('Export limit exceeded', { status: 429 });
}
```

---

## 5. Alerting

### Built-in Alerting

The monitoring system includes built-in alerting:

**Performance Alerts:**
- Poor Web Vitals ratings
- Long tasks detected
- Memory thresholds exceeded

**Security Alerts:**
- Critical security events
- High rate of blocked requests
- XSS/injection attempts

### Custom Alerting

Implement custom alerting:

```typescript
import { getPerformanceMonitor, getSecurityMonitor } from '@/lib/monitoring';

const perfMonitor = getPerformanceMonitor();
const secMonitor = getSecurityMonitor();

// Check performance score
const perfScore = perfMonitor.getPerformanceScore();
if (perfScore.score < 70) {
  // Send alert
  sendAlert(`Performance degraded: ${perfScore.score}/100`);
}

// Check for critical security events
const secMetrics = secMonitor.getSecurityMetrics();
if (secMetrics.eventsBySeverity.critical > 0) {
  // Send alert
  sendAlert(`Critical security events: ${secMetrics.eventsBySeverity.critical}`);
}
```

### External Monitoring Services

Integrate with external services:

```typescript
// Send to Sentry
import * as Sentry from '@sentry/nextjs';

const perfScore = perfMonitor.getPerformanceScore();
Sentry.captureMessage(`Performance Score: ${perfScore.score}`, {
  level: perfScore.score < 70 ? 'warning' : 'info',
  extra: perfScore
});

// Send to DataDog
import { datadogLogs } from '@datadog/browser-logs';

datadogLogs.logger.info('Security Metrics', secMetrics);
```

---

## 6. Data Export

### Export Performance Data

```typescript
import { getPerformanceMonitor } from '@/lib/monitoring';

const perfMonitor = getPerformanceMonitor();

// Export as JSON string
const jsonData = perfMonitor.exportMetrics();

// Download as file
const blob = new Blob([jsonData], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `performance-metrics-${Date.now()}.json`;
a.click();
```

### Export Security Data

```typescript
import { getSecurityMonitor } from '@/lib/monitoring';

const secMonitor = getSecurityMonitor();

// Export as JSON string
const jsonData = secMonitor.exportEvents();

// Download as file
const blob = new Blob([jsonData], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `security-events-${Date.now()}.json`;
a.click();
```

### Export Combined Report

```typescript
import { exportMonitoringData } from '@/lib/monitoring';

// Export everything
const jsonData = exportMonitoringData();

// Download as file
const blob = new Blob([jsonData], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `monitoring-report-${Date.now()}.json`;
a.click();
```

---

## 7. Integration

### With API Routes

```typescript
// src/app/api/custom/route.ts
import { monitoredFetch } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  // Use monitoredFetch for automatic tracking
  const response = await monitoredFetch('https://api.example.com/data', {
    headers: { 'Authorization': 'Bearer token' }
  });

  return Response.json(await response.json());
}
```

### With Components

```typescript
'use client';

import { useEffect } from 'react';
import { recordCustomMetric } from '@/lib/monitoring';

export function MyComponent() {
  useEffect(() => {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      recordCustomMetric('my-component-render', duration, 'good');
    };
  }, []);

  return <div>My Component</div>;
}
```

### With Next.js Middleware

```typescript
// middleware.ts
import { checkRateLimit } from '@/lib/monitoring';

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const path = request.nextUrl.pathname;

  // Rate limit by IP
  if (!checkRateLimit(`ip-${ip}`, 1000, 3600000)) {
    return new Response('Too many requests', { status: 429 });
  }

  return NextResponse.next();
}
```

---

## Best Practices

1. **Use monitoredFetch** for all API calls to get automatic tracking
2. **Validate inputs** using validateSecureInput before processing
3. **Set appropriate rate limits** based on your use case
4. **Export monitoring data** regularly for analysis
5. **Set up alerts** for critical events
6. **Review metrics** periodically to identify trends
7. **Optimize** based on monitoring insights

---

## Troubleshooting

### Metrics Not Appearing

1. Check browser console for errors
2. Verify monitoring system is initialized
3. Ensure localStorage is enabled
4. Check for ad blockers interfering

### High Memory Usage

1. Check for memory leaks in custom code
2. Clear old metrics: `perfMonitor.clearMetrics()`
3. Reduce data retention period

### Security Events Not Recorded

1. Verify security monitor is initialized
2. Check input validation logic
3. Review event severity thresholds

---

## Future Enhancements

Potential improvements:

1. **Real-time Monitoring Dashboard** with live updates
2. **Historical Data Analysis** with trend charts
3. **Automated Optimization Suggestions**
4. **Integration with External Services** (Sentry, DataDog, etc.)
5. **Performance Budgeting** with build-time checks
6. **Automated Alerting** via email/webhook
7. **Multi-user Support** with per-user metrics

---

## Conclusion

The monitoring system provides comprehensive visibility into both performance and security. Use it to:

- Track application health
- Identify issues early
- Optimize performance
- Maintain security
- Make data-driven decisions

For questions or issues, refer to the source code in `/src/lib/monitoring/`.

---

*Last Updated: 2026-01-04*
*Version: 1.0.0*
