# 02-performance-monitoring.md

## What to Build

Implement real-time performance monitoring using Vercel Analytics, custom Web Vitals tracking, and database query performance monitoring.

## Web Vitals Tracking

```
// lib/web-vitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } from 'web-vitals'

type MetricName = 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP'

function sendToAnalytics(metric: { name: MetricName; value: number; id: string }) {
  // Send to your analytics endpoint
  fetch('/api/analytics/vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metric: [metric.name](http://metric.name),
      value: Math.round(metric.value),
      id: [metric.id](http://metric.id),
      page: window.location.pathname,
      timestamp: [Date.now](http://Date.now)(),
    }),
  })
  
  // Also send to Vercel Analytics
  if (window.gtag) {
    window.gtag('event', [metric.name](http://metric.name), {
      value: Math.round(metric.value),
      metric_id: [metric.id](http://metric.id),
      metric_value: metric.value,
      metric_delta: metric.value,
    })
  }
}

export function initWebVitals() {
  onCLS(sendToAnalytics)
  onFID(sendToAnalytics)
  onFCP(sendToAnalytics)
  onLCP(sendToAnalytics)
  onTTFB(sendToAnalytics)
  onINP(sendToAnalytics)
}
```

## API Performance Monitoring

```
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { performance } from 'perf_hooks'

export async function middleware(request: NextRequest) {
  const start = [performance.now](http://performance.now)()
  const response = [NextResponse.next](http://NextResponse.next)()
  
  // Track API performance
  if (request.nextUrl.pathname.startsWith('/api')) {
    const duration = [performance.now](http://performance.now)() - start
    
    // Log slow APIs
    if (duration > 1000) {
      await logSlowAPI({
        path: request.nextUrl.pathname,
        method: request.method,
        duration,
        timestamp: new Date().toISOString(),
      })
    }
    
    // Add performance headers
    response.headers.set('X-Response-Time', `${duration}ms`)
    response.headers.set('X-Request-Id', crypto.randomUUID())
  }
  
  return response
}

async function logSlowAPI(data: any) {
  await fetch(`${process.env.MONITORING_ENDPOINT}/slow-api`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
```

## Database Query Monitoring

```
// lib/db-monitoring.ts
import { createClient } from '@supabase/supabase-js'
import { performance } from 'perf_hooks'

class DatabaseMonitor {
  private queryMetrics: Map<string, number[]> = new Map()
  
  async monitorQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const start = [performance.now](http://performance.now)()
    
    try {
      const result = await queryFn()
      const duration = [performance.now](http://performance.now)() - start
      
      // Track metrics
      this.recordMetric(queryName, duration)
      
      // Log slow queries
      if (duration > 100) {
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`)
        await this.logSlowQuery(queryName, duration)
      }
      
      return result
    } catch (error) {
      const duration = [performance.now](http://performance.now)() - start
      await this.logQueryError(queryName, error, duration)
      throw error
    }
  }
  
  private recordMetric(queryName: string, duration: number) {
    const metrics = this.queryMetrics.get(queryName) || []
    metrics.push(duration)
    
    // Keep last 100 measurements
    if (metrics.length > 100) {
      metrics.shift()
    }
    
    this.queryMetrics.set(queryName, metrics)
  }
  
  getStats(queryName: string) {
    const metrics = this.queryMetrics.get(queryName) || []
    if (metrics.length === 0) return null
    
    const sorted = [...metrics].sort((a, b) => a - b)
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: metrics.reduce((a, b) => a + b, 0) / metrics.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    }
  }
  
  private async logSlowQuery(queryName: string, duration: number) {
    // Send to monitoring service
    await fetch('/api/monitoring/slow-query', {
      method: 'POST',
      body: JSON.stringify({ queryName, duration }),
    })
  }
  
  private async logQueryError(queryName: string, error: any, duration: number) {
    // Log to error tracking
    await fetch('/api/monitoring/query-error', {
      method: 'POST',
      body: JSON.stringify({ queryName, error: error.message, duration }),
    })
  }
}

export const dbMonitor = new DatabaseMonitor()
```

## Real-time Dashboard

```
// app/admin/performance/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState({
    webVitals: {},
    apiPerformance: [],
    dbQueries: [],
  })
  
  useEffect(() => {
    const ws = new WebSocket([process.env.NEXT](http://process.env.NEXT)_PUBLIC_WS_URL!)
    
    ws.onmessage = (event) => {
      const data = JSON.parse([event.data](http://event.data))
      setMetrics(prev => ({
        ...prev,
        [data.type]: data.payload,
      }))
    }
    
    return () => ws.close()
  }, [])
  
  return (
    <div className="performance-dashboard">
      <h1>Performance Monitoring</h1>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="metric-card">
          <h3>Core Web Vitals</h3>
          <div>LCP: {metrics.webVitals.LCP || '-'}ms</div>
          <div>FID: {metrics.webVitals.FID || '-'}ms</div>
          <div>CLS: {metrics.webVitals.CLS || '-'}</div>
        </div>
        
        <div className="metric-card">
          <h3>API Performance</h3>
          <div>Avg Response: {calculateAvg(metrics.apiPerformance)}ms</div>
          <div>P95: {calculateP95(metrics.apiPerformance)}ms</div>
        </div>
        
        <div className="metric-card">
          <h3>Database Queries</h3>
          <div>Slow Queries: {countSlowQueries(metrics.dbQueries)}</div>
          <div>Error Rate: {calculateErrorRate(metrics.dbQueries)}%</div>
        </div>
      </div>
      
      <div className="charts">
        <Line data={getChartData(metrics)} options={chartOptions} />
      </div>
    </div>
  )
}
```

## Performance Budgets

```
// performance-budget.json
{
  "budgets": [
    {
      "path": "/*",
      "timings": [
        {
          "metric": "first-contentful-paint",
          "budget": 1000
        },
        {
          "metric": "largest-contentful-paint",
          "budget": 2500
        },
        {
          "metric": "cumulative-layout-shift",
          "budget": 0.1
        },
        {
          "metric": "time-to-interactive",
          "budget": 3800
        }
      ],
      "resourceSizes": [
        {
          "resourceType": "script",
          "budget": 300
        },
        {
          "resourceType": "image",
          "budget": 500
        },
        {
          "resourceType": "total",
          "budget": 1500
        }
      ]
    }
  ]
}
```

## Alert Configuration

```
// monitoring/alerts.ts
export const performanceAlerts = [
  {
    name: 'High LCP',
    condition: 'webVitals.LCP > 2500',
    threshold: '5 minutes',
    action: 'notify-slack',
  },
  {
    name: 'API Latency',
    condition: 'api.p95 > 1000',
    threshold: '3 minutes',
    action: 'notify-oncall',
  },
  {
    name: 'Database Slow',
    condition: 'db.slowQueries > 10',
    threshold: '1 minute',
    action: 'page-engineer',
  },
]
```

## Critical Implementation Notes

- Track both synthetic and real user monitoring (RUM)
- Set up performance budgets in CI/CD
- Monitor third-party script impact
- Track performance by user segment (free vs paid)
- Implement performance regression alerts
- Regular performance audits with Lighthouse