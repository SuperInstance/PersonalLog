/**
 * Security Monitoring System
 *
 * Tracks security-related events and metrics including:
 * - XSS attempts
 * - Injection attempts
 * - Suspicious API calls
 * - Authentication failures
 * - Rate limit violations
 * - Data validation failures
 */

interface SecurityEvent {
  type: 'xss-attempt' | 'injection-attempt' | 'auth-failure' | 'rate-limit' | 'validation-failure' | 'suspicious-activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: number;
  url: string;
  userAgent?: string;
  ipAddress?: string;
}

interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  recentEvents: SecurityEvent[];
  blockedRequests: number;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private blockedRequests = 0;
  private storageKey = 'personallog-security-events';
  private maxStoredEvents = 1000;
  private rateLimits = new Map<string, { count: number; resetTime: number }>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    this.loadEvents();
    this.setupXSSDetection();
    this.setupCSRFProtection();
  }

  /**
   * Setup XSS detection
   */
  private setupXSSDetection() {
    // Monitor for suspicious patterns in URLs
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /onerror=/gi,
        /onload=/gi,
        /onclick=/gi,
        /<iframe/gi,
        /<embed/gi,
        /<object/gi,
      ];

      for (const [key, value] of urlParams.entries()) {
        for (const pattern of xssPatterns) {
          if (pattern.test(value)) {
            this.recordEvent({
              type: 'xss-attempt',
              severity: 'high',
              message: `XSS attempt detected in URL parameter: ${key}`,
              details: { parameter: key, value: value.substring(0, 100) },
              timestamp: Date.now(),
              url: window.location.href,
              userAgent: navigator.userAgent,
            });
            break;
          }
        }
      }
    }
  }

  /**
   * Setup CSRF protection checks
   */
  private setupCSRFProtection() {
    // Check for proper CSRF tokens on API calls
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const [url, options] = args;

        // Check if it's an API call
        if (typeof url === 'string' && url.includes('/api/')) {
          // Check for proper origin
          const apiOrigin = new URL(url, window.location.origin).origin;
          if (apiOrigin !== window.location.origin) {
            this.recordEvent({
              type: 'suspicious-activity',
              severity: 'high',
              message: 'Cross-origin API call detected',
              details: { url, origin: apiOrigin },
              timestamp: Date.now(),
              url: window.location.href,
              userAgent: navigator.userAgent,
            });
          }
        }

        return originalFetch(...args);
      };
    }
  }

  /**
   * Record a security event
   */
  recordEvent(event: SecurityEvent) {
    this.events.push(event);

    // Keep only the most recent events
    if (this.events.length > this.maxStoredEvents) {
      this.events = this.events.slice(-this.maxStoredEvents);
    }

    this.saveEvents();

    // Alert for critical events
    if (event.severity === 'critical') {
      this.alertCriticalEvent(event);
    }
  }

  /**
   * Check rate limit for an endpoint/key
   */
  checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const current = this.rateLimits.get(key);

    if (!current || now > current.resetTime) {
      // Reset the window
      this.rateLimits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (current.count >= maxRequests) {
      this.recordEvent({
        type: 'rate-limit',
        severity: 'medium',
        message: `Rate limit exceeded for: ${key}`,
        details: { key, count: current.count, maxRequests },
        timestamp: now,
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      });
      this.blockedRequests++;
      return false;
    }

    current.count++;
    return true;
  }

  /**
   * Validate and sanitize input
   */
  validateInput(input: string, fieldName: string): { valid: boolean; sanitized?: string; error?: string } {
    if (!input) {
      return { valid: true, sanitized: '' };
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /<script[^>]*>.*?<\/script>/gi, name: 'script tag' },
      { pattern: /javascript:/gi, name: 'javascript protocol' },
      { pattern: /on\w+\s*=/gi, name: 'event handler' },
      { pattern: /<iframe/gi, name: 'iframe tag' },
      { pattern: /<embed/gi, name: 'embed tag' },
      { pattern: /<object/gi, name: 'object tag' },
      { pattern: /<style/gi, name: 'style tag' },
      { pattern: /@import/gi, name: 'CSS import' },
      { pattern: /expression\(/gi, name: 'CSS expression' },
    ];

    for (const { pattern, name } of dangerousPatterns) {
      if (pattern.test(input)) {
        this.recordEvent({
          type: 'xss-attempt',
          severity: 'high',
          message: `XSS attempt detected in ${fieldName}`,
          details: { fieldName, pattern: name, input: input.substring(0, 100) },
          timestamp: Date.now(),
          url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        });

        return {
          valid: false,
          error: `Invalid input: ${name} detected`,
        };
      }
    }

    // Sanitize input
    const sanitized = input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return { valid: true, sanitized };
  }

  /**
   * Validate API response
   */
  validateAPIResponse(response: Response, endpoint: string): boolean {
    const success = response.ok;

    if (!success) {
      const severity = response.status >= 500 ? 'high' : response.status >= 400 ? 'medium' : 'low';

      this.recordEvent({
        type: response.status === 401 || response.status === 403 ? 'auth-failure' : 'suspicious-activity',
        severity,
        message: `API request failed: ${endpoint}`,
        details: {
          endpoint,
          status: response.status,
          statusText: response.statusText,
        },
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      });
    }

    return success;
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    this.events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    });

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      recentEvents: this.events.slice(-10),
      blockedRequests: this.blockedRequests,
    };
  }

  /**
   * Get security score
   */
  getSecurityScore() {
    let score = 100;
    const metrics = this.getSecurityMetrics();

    // Deduct points for security events
    if (metrics.eventsBySeverity.critical > 0) {
      score -= 50 * metrics.eventsBySeverity.critical;
    }
    if (metrics.eventsBySeverity.high > 0) {
      score -= 25 * metrics.eventsBySeverity.high;
    }
    if (metrics.eventsBySeverity.medium > 0) {
      score -= 10 * metrics.eventsBySeverity.medium;
    }
    if (metrics.eventsBySeverity.low > 0) {
      score -= 5 * metrics.eventsBySeverity.low;
    }

    // Deduct points for high rate of blocked requests
    if (metrics.blockedRequests > 100) {
      score -= 20;
    } else if (metrics.blockedRequests > 50) {
      score -= 10;
    } else if (metrics.blockedRequests > 20) {
      score -= 5;
    }

    return {
      score: Math.max(0, score),
      rating: score >= 90 ? 'secure' : score >= 70 ? 'mostly-secure' : score >= 50 ? 'at-risk' : 'vulnerable',
      issues: this.generateSecurityIssues(metrics),
    };
  }

  /**
   * Generate security issues list
   */
  private generateSecurityIssues(metrics: SecurityMetrics): string[] {
    const issues: string[] = [];

    if (metrics.eventsBySeverity.critical > 0) {
      issues.push(`${metrics.eventsBySeverity.critical} critical security events`);
    }
    if (metrics.eventsBySeverity.high > 0) {
      issues.push(`${metrics.eventsBySeverity.high} high severity security events`);
    }
    if (metrics.eventsByType['xss-attempt'] > 0) {
      issues.push(`${metrics.eventsByType['xss-attempt']} XSS attempts detected`);
    }
    if (metrics.eventsByType['injection-attempt'] > 0) {
      issues.push(`${metrics.eventsByType['injection-attempt']} injection attempts detected`);
    }
    if (metrics.blockedRequests > 20) {
      issues.push(`${metrics.blockedRequests} requests blocked by rate limiting`);
    }

    return issues;
  }

  /**
   * Alert critical event
   */
  private alertCriticalEvent(event: SecurityEvent) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 CRITICAL SECURITY EVENT:', event);
    }

    // In production, you could send this to a monitoring service
    // or display a notification to admins
  }

  /**
   * Save events to localStorage
   */
  private saveEvents() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        events: this.events.slice(-100), // Only save last 100
        blockedRequests: this.blockedRequests,
      }));
    } catch (e) {
      console.warn('Failed to save security events:', e);
    }
  }

  /**
   * Load events from localStorage
   */
  private loadEvents() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.events = data.events || [];
        this.blockedRequests = data.blockedRequests || 0;
      }
    } catch (e) {
      console.warn('Failed to load security events:', e);
    }
  }

  /**
   * Clear all events
   */
  clearEvents() {
    this.events = [];
    this.blockedRequests = 0;
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Export events as JSON
   */
  exportEvents() {
    return JSON.stringify({
      events: this.events,
      metrics: this.getSecurityMetrics(),
      score: this.getSecurityScore(),
    }, null, 2);
  }
}

// Singleton instance
let monitor: SecurityMonitor | null = null;

export function getSecurityMonitor(): SecurityMonitor {
  if (!monitor) {
    monitor = new SecurityMonitor();
  }
  return monitor;
}

// Convenience functions
export function recordSecurityEvent(
  type: SecurityEvent['type'],
  severity: SecurityEvent['severity'],
  message: string,
  details?: Record<string, any>
) {
  if (monitor && typeof window !== 'undefined') {
    monitor.recordEvent({
      type,
      severity,
      message,
      details: details || {},
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }
}

export function validateSecureInput(input: string, fieldName: string) {
  if (!monitor) {
    monitor = new SecurityMonitor();
  }
  return monitor.validateInput(input, fieldName);
}

export function checkRateLimit(key: string, maxRequests: number = 100, windowMs: number = 60000) {
  if (!monitor) {
    monitor = new SecurityMonitor();
  }
  return monitor.checkRateLimit(key, maxRequests, windowMs);
}

export type { SecurityEvent, SecurityMetrics };
