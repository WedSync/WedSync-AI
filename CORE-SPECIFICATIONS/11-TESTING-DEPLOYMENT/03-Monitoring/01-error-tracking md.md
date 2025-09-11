# 01-error-tracking.md

# Error Tracking Implementation

## What to Build

Implement comprehensive error tracking using Sentry for both WedSync supplier platform and WedMe couple platform. Track frontend errors, API failures, database issues, and third-party integration problems with proper context and user identification.

## Sentry Configuration

```
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs'
import { User } from '@supabase/supabase-js'

Sentry.init({
  dsn: [process.env.NEXT](http://process.env.NEXT)_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  beforeSend(event, hint) {
    // Sanitize sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies
    }
    if (event.extra?.password) {
      delete event.extra.password
    }
    return event
  },
  ignoreErrors: [
    // Ignore common browser errors
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    // Ignore third-party errors
    'stripe is not defined',
  ],
})

export function identifyUser(user: User) {
  Sentry.setUser({
    id: [user.id](http://user.id),
    email: [user.email](http://user.email),
    username: user.user_metadata?.business_name,
    ip_address: '{{auto}}',
  })
  
  // Add user context
  Sentry.setContext('subscription', {
    tier: user.user_metadata?.tier || 'free',
    vendor_type: user.user_metadata?.vendor_type,
  })
}
```

## Error Boundary Component

```
// components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  context?: string
}

interface State {
  hasError: boolean
  error?: Error
  errorId?: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  
  static getDerivedStateFromError(error: Error): State {
    const errorId = Sentry.lastEventId()
    return { hasError: true, error, errorId }
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    Sentry.withScope((scope) => {
      scope.setExtras({
        componentStack: errorInfo.componentStack,
        context: this.props.context,
      })
      scope.setLevel('error')
      scope.setContext('component', {
        props: this.props,
        state: this.state,
      })
      Sentry.captureException(error)
    })
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="mb-4">We've been notified and are looking into it.</p>
          <p className="text-sm text-gray-500 mb-4">
            Error ID: {this.state.errorId}
          </p>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button 
              variant="outline"
              onClick={() => Sentry.showReportDialog({ eventId: this.state.errorId })}
            >
              Report Issue
            </Button>
          </div>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

## API Error Handler

```
// lib/api/error-handler.ts
import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { ZodError } from 'zod'
import { SupabaseError } from '@/lib/supabase'

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message)
    [this.name](http://this.name) = 'ApiError'
  }
}

export function withErrorHandler<T>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest) => {
    try {
      return await handler(req)
    } catch (error) {
      // Handle different error types
      if (error instanceof ZodError) {
        return NextResponse.json(
          { 
            error: 'Validation failed',
            details: error.errors 
          },
          { status: 400 }
        )
      }
      
      if (error instanceof ApiError) {
        Sentry.captureException(error, {
          level: error.statusCode >= 500 ? 'error' : 'warning',
          extra: { details: error.details },
        })
        
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        )
      }
      
      if (error instanceof SupabaseError) {
        Sentry.captureException(error, {
          tags: { integration: 'supabase' },
        })
        
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        )
      }
      
      // Unknown error
      const eventId = Sentry.captureException(error, {
        contexts: {
          request: {
            url: req.url,
            method: req.method,
            headers: Object.fromEntries(req.headers.entries()),
          },
        },
      })
      
      console.error('Unhandled API error:', error)
      
      return NextResponse.json(
        { 
          error: 'Internal server error',
          errorId: eventId,
        },
        { status: 500 }
      )
    }
  }
}
```

## Form Submission Error Tracking

```
// lib/forms/error-tracking.ts
export function trackFormError(
  formId: string,
  field: string,
  error: Error,
  context: any
) {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'form_submission')
    scope.setContext('form', {
      id: formId,
      field,
      value: context.value,
      validation: context.validation,
    })
    scope.setLevel('warning')
    Sentry.captureException(error)
  })
}

// Usage in form component
try {
  await submitForm(formData)
} catch (error) {
  trackFormError(
    formId,
    error.field || 'unknown',
    error,
    { value: formData[error.field], validation: schema[error.field] }
  )
}
```

## Background Job Error Monitoring

```
// lib/jobs/error-monitoring.ts
import { Queue } from 'bullmq'

export function setupJobErrorHandling(queue: Queue) {
  queue.on('failed', (job, error) => {
    Sentry.withScope((scope) => {
      scope.setTag('job_type', [job.name](http://job.name))
      scope.setContext('job', {
        id: [job.id](http://job.id),
        data: [job.data](http://job.data),
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
      })
      scope.setLevel('error')
      Sentry.captureException(error)
    })
  })
  
  queue.on('stalled', (job) => {
    Sentry.captureMessage(`Job stalled: ${[job.name](http://job.name)}`, 'warning')
  })
}
```

## Client-Side Error Tracking

```
// hooks/useErrorHandler.ts
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export function useErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      Sentry.captureException(event.reason, {
        tags: { type: 'unhandled_promise_rejection' },
        extra: { promise: event.promise },
      })
    }
    
    const handleError = (event: ErrorEvent) => {
      Sentry.captureException(event.error || event.message, {
        tags: { type: 'window_error' },
        extra: {
          message: event.message,
          source: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      })
    }
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])
}
```

## Performance Monitoring

```
// lib/monitoring/performance.ts
export function trackApiPerformance(
  endpoint: string,
  duration: number,
  status: number
) {
  const transaction = Sentry.startTransaction({
    name: endpoint,
    op: 'api.request',
  })
  
  transaction.setData('duration', duration)
  transaction.setData('status', status)
  
  if (duration > 3000) {
    transaction.setTag('performance', 'slow')
    Sentry.captureMessage(
      `Slow API response: ${endpoint} took ${duration}ms`,
      'warning'
    )
  }
  
  transaction.finish()
}
```

## Alert Configuration

```
# .sentryrc
alerts:
  - name: "High Error Rate"
    conditions:
      - id: "event_frequency"
        value: 100
        interval: "1h"
    actions:
      - slack: "#alerts"
      - email: "[team@wedsync.app](mailto:team@wedsync.app)"
  
  - name: "Payment Failures"
    conditions:
      - id: "event_count"
        value: 5
        tags:
          - payment: true
    actions:
      - pagerduty: "critical"
      - slack: "#payments"
  
  - name: "New Error Type"
    conditions:
      - id: "first_seen"
        age: 0
    filters:
      - level: "error"
    actions:
      - slack: "#dev"
  
  - name: "Form Builder Errors"
    conditions:
      - id: "event_count"
        value: 10
        tags:
          - component: "form_builder"
    actions:
      - email: "[product@wedsync.app](mailto:product@wedsync.app)"
```

## Error Dashboard Implementation

```
// app/admin/errors/page.tsx
import { Sentry } from '@sentry/nextjs'

export default async function ErrorDashboard() {
  const issues = await fetch(
    `[https://sentry.io/api/0/projects/${process.env.SENTRY_ORG}/${process.env.SENTRY_PROJECT}/issues/`](https://sentry.io/api/0/projects/${process.env.SENTRY_ORG}/${process.env.SENTRY_PROJECT}/issues/`),
    {
      headers: {
        Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
      },
    }
  ).then(r => r.json())
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Error Monitoring</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard title="24h Errors" value={issues.stats['24h']} />
        <MetricCard title="Affected Users" value={issues.userCount} />
        <MetricCard title="Error Rate" value={`${issues.errorRate}%`} />
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <h2 className="p-4 border-b font-semibold">Recent Issues</h2>
        {[issues.map](http://issues.map)((issue: any) => (
          <IssueRow key={[issue.id](http://issue.id)} issue={issue} />
        ))}
      </div>
    </div>
  )
}
```

## Critical Implementation Notes

- **Never log sensitive data** - Strip passwords, tokens, and PII before sending to Sentry
- **Set up source maps** - Upload source maps for meaningful stack traces in production
- **Configure release tracking** - Tag each deployment with version for better error grouping
- **Implement user feedback** - Allow users to add context when errors occur
- **Monitor error budget** - Set acceptable error rates and alert when exceeded
- **Review errors weekly** - Establish process for triaging and fixing recurring errors
- **Test error handling** - Include error scenarios in integration tests
- **Document known issues** - Maintain list of expected errors and their resolutions