#!/usr/bin/env tsx
/**
 * Performance Load Testing Script - WS-173
 * Team B - Round 1 Implementation
 * 
 * Simulates realistic wedding management usage patterns
 * Tests API performance under various load conditions
 * 
 * Usage:
 * npm run performance:load-test
 * tsx scripts/performance-load-test.ts --scenario=wedding-planning
 */

import { performance } from 'perf_hooks'
import { Worker } from 'worker_threads'
import * as fs from 'fs'
import * as path from 'path'

// Load test scenarios
interface LoadTestScenario {
  name: string
  description: string
  duration: number // seconds
  users: number // concurrent users
  endpoints: Array<{
    path: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    weight: number // probability weight
    body?: any
    expectedStatus?: number
  }>
}

const SCENARIOS: Record<string, LoadTestScenario> = {
  'wedding-planning': {
    name: 'Wedding Planning Flow',
    description: 'Simulates couples planning their wedding',
    duration: 300, // 5 minutes
    users: 50,
    endpoints: [
      { path: '/clients/me', method: 'GET', weight: 10 },
      { path: '/budget/items?limit=20', method: 'GET', weight: 8 },
      { path: '/tasks?status=pending', method: 'GET', weight: 7 },
      { path: '/vendors?category=catering', method: 'GET', weight: 6 },
      { path: '/timeline/events', method: 'GET', weight: 5 },
      { 
        path: '/budget/items', 
        method: 'POST', 
        weight: 3,
        body: { 
          category_id: 'catering',
          planned_amount: 5000,
          description: 'Wedding catering'
        }
      },
      {
        path: '/tasks',
        method: 'POST',
        weight: 2,
        body: {
          title: 'Book photographer',
          priority: 'high',
          due_date: '2025-06-01'
        }
      }
    ]
  },

  'vendor-management': {
    name: 'Vendor Management',
    description: 'Vendors updating their services and availability',
    duration: 180, // 3 minutes
    users: 25,
    endpoints: [
      { path: '/vendors/me/profile', method: 'GET', weight: 8 },
      { path: '/vendors/me/bookings', method: 'GET', weight: 7 },
      { path: '/vendors/me/reviews', method: 'GET', weight: 5 },
      {
        path: '/vendors/me/availability',
        method: 'PUT',
        weight: 4,
        body: { available_dates: ['2025-06-15', '2025-06-22'] }
      },
      {
        path: '/vendors/me/services',
        method: 'PUT',
        weight: 3,
        body: { 
          base_price: 2500,
          package_details: 'Updated wedding package'
        }
      }
    ]
  },

  'analytics-dashboard': {
    name: 'Analytics Dashboard',
    description: 'Heavy analytics queries for admin dashboards',
    duration: 120, // 2 minutes
    users: 10,
    endpoints: [
      { path: '/analytics/dashboard?timeRange=30d', method: 'GET', weight: 10 },
      { path: '/analytics/reports/revenue?period=quarterly', method: 'GET', weight: 8 },
      { path: '/analytics/reports/user-engagement', method: 'GET', weight: 6 },
      { path: '/analytics/reports/wedding-trends', method: 'GET', weight: 5 },
      { path: '/performance/metrics?timeRange=24h', method: 'GET', weight: 4 }
    ]
  },

  'mobile-usage': {
    name: 'Mobile Usage Pattern',
    description: 'Quick mobile interactions with caching',
    duration: 240, // 4 minutes  
    users: 100, // Higher user count for mobile
    endpoints: [
      { path: '/notifications?limit=10', method: 'GET', weight: 12 },
      { path: '/clients/me/wedding-summary', method: 'GET', weight: 10 },
      { path: '/tasks?limit=5&status=pending', method: 'GET', weight: 8 },
      { path: '/budget/summary', method: 'GET', weight: 7 },
      { path: '/timeline/next-events?limit=3', method: 'GET', weight: 6 },
      {
        path: '/tasks/quick-update',
        method: 'POST',
        weight: 3,
        body: { task_id: 'test-task', status: 'in_progress' }
      }
    ]
  }
}

// Performance metrics collector
class PerformanceCollector {
  private metrics: Array<{
    timestamp: number
    endpoint: string
    method: string
    responseTime: number
    status: number
    userId: string
  }> = []

  record(endpoint: string, method: string, responseTime: number, status: number, userId: string) {
    this.metrics.push({
      timestamp: Date.now(),
      endpoint,
      method,
      responseTime,
      status,
      userId
    })
  }

  getStatistics() {
    if (this.metrics.length === 0) return null

    const responseTimes = this.metrics.map(m => m.responseTime).sort((a, b) => a - b)
    const successfulRequests = this.metrics.filter(m => m.status >= 200 && m.status < 300)
    const failedRequests = this.metrics.filter(m => m.status >= 400)
    const errorRequests = this.metrics.filter(m => m.status >= 500)

    // Calculate percentiles
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)]
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)]
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)]

    // Group by endpoint
    const endpointStats = this.metrics.reduce((acc, metric) => {
      const key = `${metric.method} ${metric.endpoint}`
      if (!acc[key]) {
        acc[key] = { 
          count: 0, 
          totalTime: 0, 
          errors: 0,
          responseTimes: []
        }
      }
      acc[key].count++
      acc[key].totalTime += metric.responseTime
      acc[key].responseTimes.push(metric.responseTime)
      if (metric.status >= 400) acc[key].errors++
      return acc
    }, {} as Record<string, any>)

    // Calculate endpoint averages
    Object.keys(endpointStats).forEach(key => {
      const stat = endpointStats[key]
      stat.avgResponseTime = stat.totalTime / stat.count
      stat.errorRate = (stat.errors / stat.count) * 100
      stat.responseTimes.sort((a, b) => a - b)
      stat.p95 = stat.responseTimes[Math.floor(stat.responseTimes.length * 0.95)]
    })

    return {
      total: {
        requests: this.metrics.length,
        successful: successfulRequests.length,
        failed: failedRequests.length,
        errors: errorRequests.length,
        successRate: (successfulRequests.length / this.metrics.length) * 100,
        avgResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
        minResponseTime: responseTimes[0],
        maxResponseTime: responseTimes[responseTimes.length - 1],
        p50,
        p95,
        p99
      },
      endpoints: endpointStats,
      timeline: this.getTimelineStats()
    }
  }

  private getTimelineStats() {
    // Group metrics by 30-second intervals
    const intervals = new Map<number, number[]>()
    const startTime = Math.min(...this.metrics.map(m => m.timestamp))
    
    this.metrics.forEach(metric => {
      const interval = Math.floor((metric.timestamp - startTime) / 30000) // 30 second intervals
      if (!intervals.has(interval)) {
        intervals.set(interval, [])
      }
      intervals.get(interval)!.push(metric.responseTime)
    })

    return Array.from(intervals.entries()).map(([interval, times]) => ({
      interval,
      timestamp: startTime + (interval * 30000),
      requests: times.length,
      avgResponseTime: times.reduce((sum, time) => sum + time, 0) / times.length
    }))
  }

  exportResults(filename: string) {
    const stats = this.getStatistics()
    const reportData = {
      timestamp: new Date().toISOString(),
      statistics: stats,
      rawMetrics: this.metrics
    }

    fs.writeFileSync(filename, JSON.stringify(reportData, null, 2))
    console.log(`📊 Performance report exported to: ${filename}`)
  }
}

// Virtual user simulator
class VirtualUser {
  private userId: string
  private baseURL: string
  private authToken: string
  private collector: PerformanceCollector
  private isRunning = false

  constructor(userId: string, baseURL: string, authToken: string, collector: PerformanceCollector) {
    this.userId = userId
    this.baseURL = baseURL
    this.authToken = authToken
    this.collector = collector
  }

  async start(scenario: LoadTestScenario) {
    this.isRunning = true
    console.log(`👤 User ${this.userId} started`)

    while (this.isRunning) {
      try {
        // Select random endpoint based on weights
        const endpoint = this.selectEndpoint(scenario.endpoints)
        await this.makeRequest(endpoint)
        
        // Random delay between requests (1-5 seconds)
        const delay = Math.random() * 4000 + 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      } catch (error) {
        console.error(`❌ User ${this.userId} error:`, error.message)
      }
    }

    console.log(`👤 User ${this.userId} stopped`)
  }

  stop() {
    this.isRunning = false
  }

  private selectEndpoint(endpoints: LoadTestScenario['endpoints']) {
    const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0)
    let random = Math.random() * totalWeight
    
    for (const endpoint of endpoints) {
      random -= endpoint.weight
      if (random <= 0) {
        return endpoint
      }
    }
    
    return endpoints[0] // fallback
  }

  private async makeRequest(endpoint: LoadTestScenario['endpoints'][0]) {
    const startTime = performance.now()
    const url = `${this.baseURL}/api${endpoint.path}`
    
    try {
      const response = await fetch(url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
          'User-Agent': `LoadTest-User-${this.userId}`
        },
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
      })

      const endTime = performance.now()
      const responseTime = endTime - startTime

      this.collector.record(
        endpoint.path,
        endpoint.method,
        responseTime,
        response.status,
        this.userId
      )

      // Optional: consume response to simulate real usage
      if (response.ok) {
        await response.text()
      }

    } catch (error) {
      const endTime = performance.now()
      const responseTime = endTime - startTime

      this.collector.record(
        endpoint.path,
        endpoint.method,
        responseTime,
        500, // Error status
        this.userId
      )
    }
  }
}

// Main load test orchestrator
class LoadTestOrchestrator {
  private baseURL: string
  private authToken: string
  private collector = new PerformanceCollector()

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    this.authToken = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    if (!this.authToken) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required')
    }
  }

  async runScenario(scenarioName: string) {
    const scenario = SCENARIOS[scenarioName]
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioName}`)
    }

    console.log(`🚀 Starting load test: ${scenario.name}`)
    console.log(`📝 Description: ${scenario.description}`)
    console.log(`👥 Virtual Users: ${scenario.users}`)
    console.log(`⏱️  Duration: ${scenario.duration} seconds`)
    console.log(`🌐 Target URL: ${this.baseURL}`)
    console.log('')

    // Create virtual users
    const users: VirtualUser[] = []
    for (let i = 0; i < scenario.users; i++) {
      users.push(new VirtualUser(`user-${i}`, this.baseURL, this.authToken, this.collector))
    }

    // Start all users
    const userPromises = users.map(user => user.start(scenario))

    // Stop test after duration
    setTimeout(() => {
      console.log('\n⏰ Time limit reached, stopping all users...')
      users.forEach(user => user.stop())
    }, scenario.duration * 1000)

    // Wait for all users to complete
    await Promise.allSettled(userPromises)

    // Generate report
    console.log('\n📊 Generating performance report...')
    const stats = this.collector.getStatistics()
    
    if (stats) {
      this.printReport(scenario, stats)
      
      // Export detailed report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `performance-report-${scenarioName}-${timestamp}.json`
      this.collector.exportResults(path.join(process.cwd(), 'reports', filename))
    }

    return stats
  }

  private printReport(scenario: LoadTestScenario, stats: any) {
    console.log(`\n📈 PERFORMANCE REPORT: ${scenario.name}`)
    console.log('=' .repeat(60))
    
    console.log('\n🎯 OVERALL STATISTICS:')
    console.log(`Total Requests: ${stats.total.requests}`)
    console.log(`Success Rate: ${stats.total.successRate.toFixed(1)}%`)
    console.log(`Average Response Time: ${stats.total.avgResponseTime.toFixed(1)}ms`)
    console.log(`95th Percentile: ${stats.total.p95.toFixed(1)}ms`)
    console.log(`99th Percentile: ${stats.total.p99.toFixed(1)}ms`)
    console.log(`Min Response Time: ${stats.total.minResponseTime.toFixed(1)}ms`)
    console.log(`Max Response Time: ${stats.total.maxResponseTime.toFixed(1)}ms`)

    console.log('\n📋 ENDPOINT BREAKDOWN:')
    Object.entries(stats.endpoints).forEach(([endpoint, stat]: [string, any]) => {
      const status = stat.avgResponseTime < 200 ? '✅' : stat.avgResponseTime < 500 ? '⚠️' : '❌'
      console.log(`${status} ${endpoint}`)
      console.log(`   Requests: ${stat.count}, Avg: ${stat.avgResponseTime.toFixed(1)}ms, P95: ${stat.p95.toFixed(1)}ms, Errors: ${stat.errorRate.toFixed(1)}%`)
    })

    console.log('\n⚡ PERFORMANCE THRESHOLDS:')
    const criticalEndpoints = Object.entries(stats.endpoints).filter(([endpoint, stat]: [string, any]) => 
      endpoint.includes('/clients/') || endpoint.includes('/notifications')
    )
    const standardEndpoints = Object.entries(stats.endpoints).filter(([endpoint, stat]: [string, any]) => 
      !endpoint.includes('/analytics') && !criticalEndpoints.some(([ep]) => ep === endpoint)
    )
    const analyticsEndpoints = Object.entries(stats.endpoints).filter(([endpoint]) => 
      endpoint.includes('/analytics') || endpoint.includes('/performance')
    )

    this.checkThresholds('Critical (<100ms)', criticalEndpoints, 100)
    this.checkThresholds('Standard (<200ms)', standardEndpoints, 200)  
    this.checkThresholds('Analytics (<500ms)', analyticsEndpoints, 500)
  }

  private checkThresholds(category: string, endpoints: Array<[string, any]>, threshold: number) {
    if (endpoints.length === 0) return

    console.log(`\n${category}:`)
    endpoints.forEach(([endpoint, stat]) => {
      const status = stat.avgResponseTime < threshold ? '✅ PASS' : '❌ FAIL'
      console.log(`   ${status} ${endpoint}: ${stat.avgResponseTime.toFixed(1)}ms`)
    })
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  const scenarioArg = args.find(arg => arg.startsWith('--scenario='))
  const scenarioName = scenarioArg ? scenarioArg.split('=')[1] : 'wedding-planning'
  
  if (!SCENARIOS[scenarioName]) {
    console.error(`❌ Unknown scenario: ${scenarioName}`)
    console.log(`Available scenarios: ${Object.keys(SCENARIOS).join(', ')}`)
    process.exit(1)
  }

  // Ensure reports directory exists
  const reportsDir = path.join(process.cwd(), 'reports')
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }

  try {
    const orchestrator = new LoadTestOrchestrator()
    const stats = await orchestrator.runScenario(scenarioName)
    
    // Exit with appropriate code
    if (stats && stats.total.successRate < 95) {
      console.log('\n❌ Load test failed: Success rate below 95%')
      process.exit(1)
    } else {
      console.log('\n✅ Load test completed successfully')
      process.exit(0)
    }
    
  } catch (error) {
    console.error('❌ Load test failed:', error.message)
    process.exit(1)
  }
}

// Export for programmatic usage
export { LoadTestOrchestrator, VirtualUser, PerformanceCollector, SCENARIOS }

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}