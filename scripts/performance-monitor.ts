#!/usr/bin/env tsx
/**
 * Real-time Performance Monitor - WS-173
 * Team B - Round 1 Implementation
 * 
 * Monitors API performance in real-time and alerts on threshold violations
 * 
 * Usage:
 * tsx scripts/performance-monitor.ts --interval=10 --threshold=200
 */

import { performance } from 'perf_hooks'
import * as fs from 'fs'
import * as path from 'path'

interface PerformanceMetric {
  timestamp: number
  endpoint: string
  responseTime: number
  status: number
  cacheHit?: boolean
}

interface AlertRule {
  name: string
  condition: (metrics: PerformanceMetric[]) => boolean
  message: string
  severity: 'warning' | 'critical'
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private alertRules: AlertRule[] = []
  private isMonitoring = false
  private baseURL: string
  private interval: number
  private logFile: string

  // Test endpoints to monitor
  private monitoredEndpoints = [
    { path: '/performance/health', critical: true },
    { path: '/clients?limit=5', critical: true },
    { path: '/notifications?limit=10', critical: true },
    { path: '/budget/items?limit=10', critical: false },
    { path: '/vendors?limit=5', critical: false },
    { path: '/tasks?limit=10', critical: false }
  ]

  constructor(options: {
    baseURL?: string
    interval?: number // seconds
    maxMetrics?: number
  } = {}) {
    this.baseURL = options.baseURL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    this.interval = (options.interval || 30) * 1000 // Convert to milliseconds
    this.logFile = path.join(process.cwd(), 'logs', `performance-monitor-${new Date().toISOString().split('T')[0]}.log`)
    
    // Keep only last 1000 metrics to avoid memory issues
    const maxMetrics = options.maxMetrics || 1000
    
    this.setupAlertRules()
    this.ensureLogDirectory()
  }

  private setupAlertRules() {
    this.alertRules = [
      {
        name: 'Critical Endpoint Slow Response',
        condition: (metrics) => {
          const recentCritical = metrics
            .filter(m => Date.now() - m.timestamp < 60000) // Last minute
            .filter(m => this.monitoredEndpoints.find(ep => m.endpoint.includes(ep.path) && ep.critical))
          
          return recentCritical.some(m => m.responseTime > 100)
        },
        message: 'Critical endpoints exceeding 100ms response time',
        severity: 'critical'
      },
      {
        name: 'Standard Endpoint Slow Response',
        condition: (metrics) => {
          const recent = metrics.filter(m => Date.now() - m.timestamp < 300000) // Last 5 minutes
          const slowResponses = recent.filter(m => m.responseTime > 200)
          return slowResponses.length > recent.length * 0.1 // More than 10% slow
        },
        message: 'More than 10% of requests exceeding 200ms in last 5 minutes',
        severity: 'warning'
      },
      {
        name: 'High Error Rate',
        condition: (metrics) => {
          const recent = metrics.filter(m => Date.now() - m.timestamp < 300000)
          const errors = recent.filter(m => m.status >= 400)
          return errors.length > recent.length * 0.05 // More than 5% errors
        },
        message: 'Error rate exceeding 5% in last 5 minutes',
        severity: 'critical'
      },
      {
        name: 'Cache Miss Rate High',
        condition: (metrics) => {
          const recent = metrics.filter(m => Date.now() - m.timestamp < 600000) // Last 10 minutes
          const cacheable = recent.filter(m => m.cacheHit !== undefined)
          const misses = cacheable.filter(m => !m.cacheHit)
          return cacheable.length > 0 && misses.length > cacheable.length * 0.3 // More than 30% misses
        },
        message: 'Cache miss rate exceeding 30% in last 10 minutes',
        severity: 'warning'
      }
    ]
  }

  private ensureLogDirectory() {
    const logDir = path.dirname(this.logFile)
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
  }

  async start() {
    this.isMonitoring = true
    console.log(`🔍 Performance Monitor started`)
    console.log(`📊 Monitoring ${this.monitoredEndpoints.length} endpoints every ${this.interval/1000}s`)
    console.log(`📝 Logging to: ${this.logFile}`)
    console.log(`🌐 Target: ${this.baseURL}`)
    console.log('')

    this.log('info', 'Performance monitoring started')

    // Initial dashboard display
    this.displayDashboard()

    while (this.isMonitoring) {
      await this.collectMetrics()
      this.checkAlerts()
      this.displayDashboard()
      
      await new Promise(resolve => setTimeout(resolve, this.interval))
    }
  }

  stop() {
    this.isMonitoring = false
    this.log('info', 'Performance monitoring stopped')
    console.log('\n🛑 Performance Monitor stopped')
  }

  private async collectMetrics() {
    const promises = this.monitoredEndpoints.map(endpoint => 
      this.measureEndpoint(endpoint.path)
    )

    const results = await Promise.allSettled(promises)
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        this.metrics.push(result.value)
        
        // Log slow responses
        if (result.value.responseTime > 500) {
          this.log('warning', `Slow response: ${result.value.endpoint} - ${result.value.responseTime.toFixed(1)}ms`)
        }
        
        // Log errors
        if (result.value.status >= 400) {
          this.log('error', `HTTP ${result.value.status}: ${result.value.endpoint}`)
        }
      }
    })

    // Trim old metrics to prevent memory issues
    const cutoff = Date.now() - (24 * 60 * 60 * 1000) // Keep last 24 hours
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
  }

  private async measureEndpoint(endpoint: string): Promise<PerformanceMetric | null> {
    const startTime = performance.now()
    const url = `${this.baseURL}/api${endpoint}`
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Performance-Monitor',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
        },
        timeout: 10000 // 10 second timeout
      } as RequestInit)

      const endTime = performance.now()
      const responseTime = endTime - startTime

      // Try to detect cache hits from response headers
      const cacheHit = response.headers.get('x-cache-status') === 'hit' || 
                      response.headers.get('cf-cache-status') === 'HIT'

      return {
        timestamp: Date.now(),
        endpoint,
        responseTime,
        status: response.status,
        cacheHit: response.headers.has('x-cache-status') || response.headers.has('cf-cache-status') ? cacheHit : undefined
      }

    } catch (error) {
      const endTime = performance.now()
      const responseTime = endTime - startTime

      return {
        timestamp: Date.now(),
        endpoint,
        responseTime,
        status: 0 // Network error
      }
    }
  }

  private checkAlerts() {
    this.alertRules.forEach(rule => {
      if (rule.condition(this.metrics)) {
        this.triggerAlert(rule)
      }
    })
  }

  private triggerAlert(rule: AlertRule) {
    const emoji = rule.severity === 'critical' ? '🚨' : '⚠️'
    const message = `${emoji} ALERT [${rule.severity.toUpperCase()}]: ${rule.message}`
    
    console.log(`\n${message}`)
    this.log(rule.severity, rule.message)
    
    // In production, you could send to Slack, email, etc.
    // this.sendSlackAlert(rule)
  }

  private displayDashboard() {
    // Clear screen (works in most terminals)
    process.stdout.write('\x1B[2J\x1B[0f')
    
    const now = new Date().toLocaleString()
    console.log(`📊 WedSync Performance Monitor - ${now}`)
    console.log('=' .repeat(80))

    // Recent metrics summary
    const recent = this.metrics.filter(m => Date.now() - m.timestamp < 300000) // Last 5 minutes
    
    if (recent.length === 0) {
      console.log('⏳ Waiting for metrics...\n')
      return
    }

    // Overall statistics
    const avgResponseTime = recent.reduce((sum, m) => sum + m.responseTime, 0) / recent.length
    const errorRate = (recent.filter(m => m.status >= 400).length / recent.length) * 100
    const successRate = 100 - errorRate

    console.log(`\n🎯 OVERVIEW (Last 5 minutes):`)
    console.log(`   Total Requests: ${recent.length}`)
    console.log(`   Success Rate: ${successRate.toFixed(1)}%`)
    console.log(`   Average Response: ${avgResponseTime.toFixed(1)}ms`)
    console.log(`   Error Rate: ${errorRate.toFixed(1)}%`)

    // Per-endpoint breakdown
    console.log(`\n📋 ENDPOINT STATUS:`)
    
    this.monitoredEndpoints.forEach(monitoredEndpoint => {
      const endpointMetrics = recent.filter(m => m.endpoint.includes(monitoredEndpoint.path))
      
      if (endpointMetrics.length === 0) {
        console.log(`   ❓ ${monitoredEndpoint.path.padEnd(25)} - No recent data`)
        return
      }

      const avg = endpointMetrics.reduce((sum, m) => sum + m.responseTime, 0) / endpointMetrics.length
      const errors = endpointMetrics.filter(m => m.status >= 400).length
      const errorPercent = (errors / endpointMetrics.length) * 100
      
      const threshold = monitoredEndpoint.critical ? 100 : 200
      const status = avg <= threshold && errorPercent < 5 ? '✅' : avg <= threshold * 2 ? '⚠️' : '❌'
      
      const cacheableMetrics = endpointMetrics.filter(m => m.cacheHit !== undefined)
      const cacheInfo = cacheableMetrics.length > 0 
        ? ` Cache: ${((cacheableMetrics.filter(m => m.cacheHit).length / cacheableMetrics.length) * 100).toFixed(0)}%`
        : ''

      console.log(`   ${status} ${monitoredEndpoint.path.padEnd(25)} ${avg.toFixed(1)}ms (${endpointMetrics.length} req)${cacheInfo}`)
    })

    // Performance timeline (last 10 measurements)
    console.log(`\n📈 RESPONSE TIME TIMELINE:`)
    const timeline = this.metrics
      .slice(-10)
      .map(m => ({
        time: new Date(m.timestamp).toLocaleTimeString(),
        endpoint: m.endpoint.split('?')[0].replace('/api', ''),
        responseTime: m.responseTime
      }))

    timeline.forEach(t => {
      const bar = '█'.repeat(Math.min(Math.floor(t.responseTime / 10), 50))
      const emoji = t.responseTime <= 100 ? '🟢' : t.responseTime <= 200 ? '🟡' : '🔴'
      console.log(`   ${emoji} ${t.time} ${t.endpoint.padEnd(20)} ${t.responseTime.toFixed(0)}ms ${bar}`)
    })

    console.log(`\n💾 Log file: ${this.logFile}`)
    console.log(`Press Ctrl+C to stop monitoring\n`)
  }

  private log(level: string, message: string) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`
    
    try {
      fs.appendFileSync(this.logFile, logEntry)
    } catch (error) {
      console.error('Failed to write to log file:', error.message)
    }
  }

  // Export current metrics for analysis
  exportMetrics(filename?: string) {
    const exportFile = filename || path.join(process.cwd(), 'reports', `performance-metrics-${Date.now()}.json`)
    
    const exportData = {
      timestamp: new Date().toISOString(),
      totalMetrics: this.metrics.length,
      timeRange: {
        start: new Date(Math.min(...this.metrics.map(m => m.timestamp))).toISOString(),
        end: new Date(Math.max(...this.metrics.map(m => m.timestamp))).toISOString()
      },
      metrics: this.metrics,
      summary: this.getMetricsSummary()
    }

    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2))
    console.log(`📊 Metrics exported to: ${exportFile}`)
    return exportFile
  }

  private getMetricsSummary() {
    if (this.metrics.length === 0) return null

    const responseTimes = this.metrics.map(m => m.responseTime).sort((a, b) => a - b)
    const successfulRequests = this.metrics.filter(m => m.status >= 200 && m.status < 300)

    return {
      totalRequests: this.metrics.length,
      successRate: (successfulRequests.length / this.metrics.length) * 100,
      avgResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      minResponseTime: responseTimes[0],
      maxResponseTime: responseTimes[responseTimes.length - 1],
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)],
      errorRate: ((this.metrics.length - successfulRequests.length) / this.metrics.length) * 100
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  
  // Parse command line arguments
  const intervalArg = args.find(arg => arg.startsWith('--interval='))
  const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 30
  
  const urlArg = args.find(arg => arg.startsWith('--url='))
  const baseURL = urlArg ? urlArg.split('=')[1] : undefined

  // Create and start monitor
  const monitor = new PerformanceMonitor({
    baseURL,
    interval
  })

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down monitor...')
    monitor.stop()
    
    // Export final metrics
    try {
      monitor.exportMetrics()
    } catch (error) {
      console.error('Failed to export final metrics:', error.message)
    }
    
    process.exit(0)
  })

  try {
    await monitor.start()
  } catch (error) {
    console.error('❌ Monitor failed:', error.message)
    process.exit(1)
  }
}

// Export for programmatic usage
export { PerformanceMonitor }

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}