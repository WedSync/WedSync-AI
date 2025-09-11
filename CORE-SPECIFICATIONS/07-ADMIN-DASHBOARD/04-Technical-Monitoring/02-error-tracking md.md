# 02-error-tracking.md

# Error Tracking Implementation for WedSync/WedMe

## Overview

Error tracking is critical for maintaining platform reliability and user satisfaction. This guide covers implementing comprehensive error monitoring across the WedSync platform using modern cloud-native approaches.

## Error Classification System

### Severity Levels

```tsx
enum ErrorSeverity {
  CRITICAL = 'critical',    // System down, data loss, security breach
  HIGH = 'high',            // Feature broken, payment failures
  MEDIUM = 'medium',        // Degraded performance, non-critical failures
  LOW = 'low',              // Minor UI issues, warnings
  INFO = 'info'             // Tracked events, not errors
}

```

### Error Categories

```tsx
interface ErrorCategory {
  DATABASE: 'database_error',
  AUTH: 'authentication_error',
  PAYMENT: 'payment_error',
  API: 'api_error',
  INTEGRATION: 'integration_error',
  VALIDATION: 'validation_error',
  PERFORMANCE: 'performance_error',
  SECURITY: 'security_error',
  USER: 'user_error'
}

```

## Implementation Architecture

### 1. Client-Side Error Tracking (Next.js)

```tsx
// lib/errorTracking.ts
import * as Sentry from '@sentry/nextjs';

class ErrorTracker {
  private static instance: ErrorTracker;
  private errorQueue: ErrorEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  initialize() {
    // Initialize Sentry
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      beforeSend(event, hint) {
        // Filter out non-critical errors in production
        if (process.env.NODE_ENV === 'production') {
          if (event.level === 'info' || event.level === 'warning') {
            return null;
          }
        }
        return event;
      }
    });

    // Global error handlers
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers() {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        severity: ErrorSeverity.HIGH,
        category: 'unhandled_promise',
        stack: event.reason?.stack,
        metadata: {
          promise: event.promise,
          timestamp: new Date().toISOString()
        }
      });
    });

    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        severity: ErrorSeverity.HIGH,
        category: 'global_error',
        stack: event.error?.stack,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });
  }

  captureError(error: ErrorEvent) {
    // Add to queue for batching
    this.errorQueue.push({
      ...error,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    });

    // Batch send every 5 seconds or when queue reaches 10 errors
    if (this.errorQueue.length >= 10) {
      this.flushErrors();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushErrors(), 5000);
    }

    // Send to Sentry immediately for critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      Sentry.captureException(new Error(error.message), {
        level: 'fatal',
        extra: error.metadata
      });
      this.flushErrors();
    }
  }

  private async flushErrors() {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      await fetch('/api/errors/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors })
      });
    } catch (err) {
      console.error('Failed to send error batch:', err);
      // Re-add errors to queue for retry
      this.errorQueue = [...errors, ...this.errorQueue];
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}

```

### 2. Server-Side Error Tracking (API Routes)

```tsx
// app/api/errors/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    const { errors } = await request.json();

    // Process and store errors
    const processedErrors = errors.map((error: any) => ({
      ...error,
      processed_at: new Date().toISOString(),
      fingerprint: generateErrorFingerprint(error),
      environment: process.env.NODE_ENV,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION
    }));

    // Store in database
    const { error: dbError } = await supabase
      .from('error_logs')
      .insert(processedErrors);

    if (dbError) throw dbError;

    // Check for critical errors
    const criticalErrors = errors.filter(
      (e: any) => e.severity === 'critical'
    );

    if (criticalErrors.length > 0) {
      await triggerCriticalAlerts(criticalErrors);
    }

    // Update error metrics
    await updateErrorMetrics(errors);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing error batch:', error);
    return NextResponse.json(
      { error: 'Failed to process errors' },
      { status: 500 }
    );
  }
}

function generateErrorFingerprint(error: any): string {
  // Create unique fingerprint for error grouping
  const components = [
    error.message,
    error.category,
    error.stack?.split('\n')[0] || '',
    error.metadata?.filename || ''
  ];

  return Buffer.from(components.join('|')).toString('base64');
}

```

### 3. Database Schema for Error Tracking

```sql
-- Error logs table
CREATE TABLE error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  fingerprint VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(255),
  url TEXT,
  user_agent TEXT,
  metadata JSONB,
  environment VARCHAR(20),
  app_version VARCHAR(20),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_fingerprint ON error_logs(fingerprint);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);

-- Error metrics table for aggregation
CREATE TABLE error_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour < 24),
  severity VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  count INTEGER DEFAULT 0,
  affected_users INTEGER DEFAULT 0,
  fingerprints TEXT[],
  UNIQUE(date, hour, severity, category)
);

```

### 4. Real-Time Error Monitoring

```tsx
// lib/errorMonitor.ts
export class ErrorMonitor {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    this.ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);

    this.ws.onopen = () => {
      console.log('Connected to error monitoring');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const error = JSON.parse(event.data);
      this.handleRealtimeError(error);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.reconnect();
    };

    this.ws.onclose = () => {
      this.reconnect();
    };
  }

  private handleRealtimeError(error: any) {
    // Show notification for critical errors
    if (error.severity === 'critical') {
      this.showCriticalErrorNotification(error);
    }

    // Update dashboard metrics
    this.updateDashboardMetrics(error);
  }

  private showCriticalErrorNotification(error: any) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Critical Error Detected', {
        body: error.message,
        icon: '/error-icon.png',
        tag: error.fingerprint
      });
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(), delay);
    }
  }
}

```

### 5. Error Analytics & Reporting

```tsx
// lib/errorAnalytics.ts
export class ErrorAnalytics {
  async getErrorTrends(timeRange: string) {
    const query = `
      SELECT
        date_trunc('hour', timestamp) as hour,
        severity,
        COUNT(*) as error_count,
        COUNT(DISTINCT user_id) as affected_users,
        COUNT(DISTINCT fingerprint) as unique_errors
      FROM error_logs
      WHERE timestamp > NOW() - INTERVAL '${timeRange}'
      GROUP BY hour, severity
      ORDER BY hour DESC
    `;

    return await this.executeQuery(query);
  }

  async getTopErrors(limit = 10) {
    const query = `
      SELECT
        fingerprint,
        message,
        category,
        severity,
        COUNT(*) as occurrences,
        COUNT(DISTINCT user_id) as affected_users,
        MAX(timestamp) as last_seen,
        MIN(timestamp) as first_seen
      FROM error_logs
      WHERE timestamp > NOW() - INTERVAL '24 hours'
        AND resolved = FALSE
      GROUP BY fingerprint, message, category, severity
      ORDER BY occurrences DESC
      LIMIT ${limit}
    `;

    return await this.executeQuery(query);
  }

  async getErrorImpactScore(errorFingerprint: string) {
    // Calculate impact based on severity, frequency, and affected users
    const metrics = await this.getErrorMetrics(errorFingerprint);

    const severityWeight = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1,
      info: 0.1
    };

    const impactScore =
      (metrics.occurrences * 0.3) +
      (metrics.affectedUsers * 0.5) +
      (severityWeight[metrics.severity] * 0.2);

    return {
      score: Math.min(impactScore, 100),
      metrics,
      recommendation: this.getRecommendation(impactScore)
    };
  }

  private getRecommendation(score: number): string {
    if (score > 80) return 'Immediate action required';
    if (score > 60) return 'High priority fix needed';
    if (score > 40) return 'Schedule for next sprint';
    if (score > 20) return 'Monitor and batch with similar issues';
    return 'Low priority, fix when convenient';
  }
}

```

### 6. Alert Configuration

```tsx
// config/errorAlerts.ts
export const alertConfig = {
  critical: {
    database: {
      connectionFailure: {
        threshold: 1,
        window: '1 minute',
        channels: ['sms', 'email', 'slack', 'pagerduty']
      },
      queryTimeout: {
        threshold: 5,
        window: '5 minutes',
        channels: ['email', 'slack']
      }
    },
    payment: {
      processingFailure: {
        threshold: 3,
        window: '10 minutes',
        channels: ['sms', 'email', 'slack']
      }
    },
    security: {
      authenticationFailure: {
        threshold: 10,
        window: '5 minutes',
        channels: ['sms', 'email', 'slack', 'pagerduty']
      }
    }
  },

  high: {
    api: {
      highErrorRate: {
        threshold: '5%',
        window: '10 minutes',
        channels: ['email', 'slack']
      },
      slowResponse: {
        threshold: '3 seconds',
        percentile: 95,
        window: '15 minutes',
        channels: ['slack']
      }
    }
  },

  escalation: {
    unacknowledged: {
      critical: '5 minutes',
      high: '30 minutes',
      medium: '2 hours'
    }
  }
};

```

### 7. Error Recovery & Self-Healing

```tsx
// lib/errorRecovery.ts
export class ErrorRecovery {
  private recoveryStrategies = new Map<string, RecoveryStrategy>();

  constructor() {
    this.registerStrategies();
  }

  private registerStrategies() {
    // Database connection recovery
    this.recoveryStrategies.set('database_connection', {
      canRecover: true,
      maxAttempts: 3,
      backoffMs: 1000,
      recover: async () => {
        // Attempt to reconnect to database
        await this.reconnectDatabase();
      }
    });

    // API rate limit recovery
    this.recoveryStrategies.set('rate_limit', {
      canRecover: true,
      maxAttempts: 1,
      backoffMs: 60000,
      recover: async () => {
        // Wait and retry with exponential backoff
        await this.handleRateLimit();
      }
    });

    // Cache invalidation on error
    this.recoveryStrategies.set('cache_corruption', {
      canRecover: true,
      maxAttempts: 1,
      backoffMs: 0,
      recover: async () => {
        await this.invalidateCache();
      }
    });
  }

  async attemptRecovery(error: ErrorEvent): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(error.category);

    if (!strategy || !strategy.canRecover) {
      return false;
    }

    let attempts = 0;
    while (attempts < strategy.maxAttempts) {
      try {
        await this.delay(strategy.backoffMs * Math.pow(2, attempts));
        await strategy.recover();

        // Log successful recovery
        await this.logRecovery(error, attempts + 1);
        return true;
      } catch (recoveryError) {
        attempts++;
        if (attempts >= strategy.maxAttempts) {
          await this.logRecoveryFailure(error, recoveryError);
          return false;
        }
      }
    }

    return false;
  }
}

```

## Monitoring Dashboard Components

### Error Summary Widget

```tsx
// components/ErrorSummaryWidget.tsx
export function ErrorSummaryWidget() {
  const { data: errorStats } = useErrorStats('24h');

  return (
    <div className="error-summary">
      <div className="metric">
        <span className="label">Total Errors (24h)</span>
        <span className="value">{errorStats?.total || 0}</span>
        <span className="trend">{errorStats?.trend || '—'}</span>
      </div>

      <div className="breakdown">
        <div className="critical">
          Critical: {errorStats?.critical || 0}
        </div>
        <div className="high">
          High: {errorStats?.high || 0}
        </div>
        <div className="medium">
          Medium: {errorStats?.medium || 0}
        </div>
      </div>

      <div className="affected-users">
        Affected Users: {errorStats?.affectedUsers || 0}
      </div>
    </div>
  );
}

```

## Best Practices

### 1. Error Sampling

- Sample non-critical errors in production (10% sampling rate)
- Always capture 100% of critical errors
- Increase sampling during incident investigation

### 2. PII Protection

- Never log sensitive user data (passwords, payment info)
- Sanitize error messages before storage
- Use user IDs instead of personal information

### 3. Error Grouping

- Use fingerprinting to group similar errors
- Consider stack trace, message, and location
- Automatic de-duplication of repeated errors

### 4. Performance Impact

- Batch error reports to reduce API calls
- Use async processing for non-critical errors
- Implement circuit breakers for error reporting

### 5. Alert Fatigue Prevention

- Smart alerting based on error patterns
- Suppress duplicate alerts within time windows
- Escalation paths for unacknowledged alerts

## Integration with Third-Party Services

### Sentry Configuration

```jsx
dsn: process.env.SENTRY_DSN
environment: production
tracesSampleRate: 0.1
integrations: [
  new Integrations.BrowserTracing(),
  new Integrations.Replay()
]

```

### PagerDuty Integration

```jsx
criticalErrorThreshold: 5
escalationPolicy: 'wedding-platform-oncall'
deduplicationKey: error.fingerprint

```

## Success Metrics

- **Error Detection Rate**: >99% of errors captured
- **Mean Time to Detection**: <1 minute for critical errors
- **False Positive Rate**: <5% of alerts
- **Recovery Success Rate**: >80% for recoverable errors
- **Alert Response Time**: <5 minutes for critical alerts