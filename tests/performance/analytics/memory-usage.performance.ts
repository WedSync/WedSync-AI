/**
 * Memory Usage Performance Tests
 * WS-246 Vendor Performance Analytics System
 * 
 * Tests for memory leaks, usage patterns, and optimization
 * Validates analytics system memory efficiency under various loads
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { performance } from 'perf_hooks'

// Memory monitoring utilities
interface MemorySnapshot {
  timestamp: number
  heapUsed: number
  heapTotal: number
  external: number
  rss: number
  arrayBuffers: number
}

interface MemoryLeak {
  component: string
  startMemory: number
  endMemory: number
  leaked: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// Memory thresholds (wedding industry requirements)
const MEMORY_THRESHOLDS = {
  maxHeapGrowth: 100 * 1024 * 1024,    // 100MB max heap growth
  maxRSSGrowth: 200 * 1024 * 1024,     // 200MB max RSS growth  
  maxLeakPerComponent: 10 * 1024 * 1024, // 10MB max leak per component
  gcEfficiency: 0.8,                    // 80% memory should be freed after GC
  sustainedUsageLimit: 500 * 1024 * 1024, // 500MB sustained usage limit
  mobileDeviceLimit: 150 * 1024 * 1024   // 150MB limit for mobile devices
}

class MemoryMonitor {
  private snapshots: MemorySnapshot[] = []
  private leaks: MemoryLeak[] = []
  private isMonitoring: boolean = false
  private monitoringInterval: NodeJS.Timeout | null = null

  startMonitoring(intervalMs: number = 1000): void {
    this.isMonitoring = true
    this.snapshots = []
    
    this.monitoringInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.takeSnapshot()
      }
    }, intervalMs)
    
    // Take initial snapshot
    this.takeSnapshot()
  }

  stopMonitoring(): MemorySnapshot[] {
    this.isMonitoring = false
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    
    return [...this.snapshots]
  }

  private takeSnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage()
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers
    }
    
    this.snapshots.push(snapshot)
    return snapshot
  }

  analyzeMemoryUsage(): {
    totalGrowth: number
    averageUsage: number
    peakUsage: number
    memoryEfficiency: number
    potentialLeaks: MemoryLeak[]
  } {
    if (this.snapshots.length < 2) {
      throw new Error('Need at least 2 snapshots for analysis')
    }
    
    const first = this.snapshots[0]
    const last = this.snapshots[this.snapshots.length - 1]
    
    const totalGrowth = last.heapUsed - first.heapUsed
    const averageUsage = this.snapshots.reduce((sum, s) => sum + s.heapUsed, 0) / this.snapshots.length
    const peakUsage = Math.max(...this.snapshots.map(s => s.heapUsed))
    
    // Calculate efficiency (lower is better)
    const memoryEfficiency = totalGrowth / (last.timestamp - first.timestamp)
    
    // Detect potential memory leaks
    const potentialLeaks = this.detectMemoryLeaks()
    
    return {
      totalGrowth,
      averageUsage,
      peakUsage,
      memoryEfficiency,
      potentialLeaks
    }
  }

  private detectMemoryLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = []
    const windowSize = 10 // Analyze in windows of 10 snapshots
    
    if (this.snapshots.length < windowSize * 2) {
      return leaks
    }
    
    // Check for sustained memory growth patterns
    for (let i = windowSize; i < this.snapshots.length - windowSize; i += windowSize) {
      const windowStart = this.snapshots[i - windowSize]
      const windowEnd = this.snapshots[i + windowSize - 1]
      
      const growth = windowEnd.heapUsed - windowStart.heapUsed
      
      if (growth > MEMORY_THRESHOLDS.maxLeakPerComponent) {
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
        
        if (growth > MEMORY_THRESHOLDS.maxLeakPerComponent * 3) severity = 'critical'
        else if (growth > MEMORY_THRESHOLDS.maxLeakPerComponent * 2) severity = 'high'
        else if (growth > MEMORY_THRESHOLDS.maxLeakPerComponent * 1.5) severity = 'medium'
        
        leaks.push({
          component: `Window ${Math.floor(i / windowSize)}`,
          startMemory: windowStart.heapUsed,
          endMemory: windowEnd.heapUsed,
          leaked: growth,
          severity
        })
      }
    }
    
    return leaks
  }

  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc()
    } else {
      console.warn('Garbage collection not exposed. Run with --expose-gc flag.')
    }
  }
}

// Mock analytics components that might leak memory
class AnalyticsComponent {
  private data: any[] = []
  private subscriptions: any[] = []
  private timers: NodeJS.Timeout[] = []

  simulateDataProcessing(size: number): void {
    // Simulate processing large datasets
    for (let i = 0; i < size; i++) {
      this.data.push({
        id: i,
        timestamp: new Date(),
        metrics: Array.from({ length: 100 }, () => Math.random()),
        metadata: {
          vendor: `vendor-${i}`,
          bookings: Math.floor(Math.random() * 50),
          revenue: Math.random() * 10000
        }
      })
    }
  }

  simulateRealtimeSubscriptions(count: number): void {
    // Simulate WebSocket/SSE subscriptions
    for (let i = 0; i < count; i++) {
      const subscription = {
        id: i,
        channel: `analytics-${i}`,
        callback: (data: any) => this.data.push(data),
        connected: true
      }
      this.subscriptions.push(subscription)
    }
  }

  simulatePeriodicTasks(count: number): void {
    // Simulate periodic data refresh tasks
    for (let i = 0; i < count; i++) {
      const timer = setInterval(() => {
        this.data.push({
          periodic: true,
          timestamp: Date.now(),
          data: Math.random()
        })
      }, 1000 + (Math.random() * 5000))
      
      this.timers.push(timer)
    }
  }

  cleanup(): void {
    this.data = []
    this.subscriptions = []
    this.timers.forEach(timer => clearInterval(timer))
    this.timers = []
  }
}

describe('Analytics Memory Usage Performance Tests', () => {
  let memoryMonitor: MemoryMonitor
  let analyticsComponent: AnalyticsComponent
  let initialMemory: MemorySnapshot

  beforeAll(async () => {
    memoryMonitor = new MemoryMonitor()
    console.log('🧠 Starting memory usage performance tests...')
    
    // Force initial garbage collection
    memoryMonitor.forceGarbageCollection()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    initialMemory = memoryMonitor.takeSnapshot()
  })

  afterAll(async () => {
    const finalMemory = memoryMonitor.takeSnapshot()
    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed
    
    console.log('📊 Memory usage test summary:')
    console.log(`- Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
    console.log(`- Final memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
    console.log(`- Total growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`)
    
    // Final cleanup
    memoryMonitor.forceGarbageCollection()
  })

  beforeEach(() => {
    analyticsComponent = new AnalyticsComponent()
    memoryMonitor.forceGarbageCollection()
  })

  afterEach(() => {
    analyticsComponent.cleanup()
    memoryMonitor.forceGarbageCollection()
  })

  describe('Component Memory Usage', () => {
    it('should not leak memory during dashboard data processing', async () => {
      memoryMonitor.startMonitoring(500)
      const startSnapshot = memoryMonitor.takeSnapshot()
      
      // Simulate 10 cycles of dashboard data loading
      for (let cycle = 0; cycle < 10; cycle++) {
        // Load dashboard data
        analyticsComponent.simulateDataProcessing(1000)
        
        // Process the data
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Clear processed data (simulate component cleanup)
        analyticsComponent.cleanup()
        analyticsComponent = new AnalyticsComponent()
        
        // Force GC every few cycles
        if (cycle % 3 === 0) {
          memoryMonitor.forceGarbageCollection()
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      const snapshots = memoryMonitor.stopMonitoring()
      const analysis = memoryMonitor.analyzeMemoryUsage()
      
      // Memory should not grow significantly after GC
      expect(analysis.totalGrowth).toBeLessThan(MEMORY_THRESHOLDS.maxLeakPerComponent)
      expect(analysis.potentialLeaks.length).toBe(0)
      
      console.log(`Dashboard processing - Memory growth: ${(analysis.totalGrowth / 1024 / 1024).toFixed(2)}MB`)
    })

    it('should handle large vendor dataset processing efficiently', async () => {
      const largeDatasetSize = 10000
      const startMemory = process.memoryUsage().heapUsed
      
      memoryMonitor.startMonitoring(1000)
      
      // Process large vendor dataset
      analyticsComponent.simulateDataProcessing(largeDatasetSize)
      
      // Allow processing time
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const peakMemory = process.memoryUsage().heapUsed
      const memoryUsed = peakMemory - startMemory
      
      // Cleanup
      analyticsComponent.cleanup()
      memoryMonitor.forceGarbageCollection()
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryFreed = peakMemory - finalMemory
      const gcEfficiency = memoryFreed / memoryUsed
      
      const snapshots = memoryMonitor.stopMonitoring()
      
      expect(memoryUsed).toBeLessThan(MEMORY_THRESHOLDS.maxHeapGrowth)
      expect(gcEfficiency).toBeGreaterThan(MEMORY_THRESHOLDS.gcEfficiency)
      
      console.log(`Large dataset (${largeDatasetSize} items):`)
      console.log(`- Memory used: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`)
      console.log(`- GC efficiency: ${(gcEfficiency * 100).toFixed(1)}%`)
    })

    it('should manage real-time subscription memory efficiently', async () => {
      const subscriptionCount = 50
      
      memoryMonitor.startMonitoring(500)
      const startMemory = process.memoryUsage().heapUsed
      
      // Create real-time subscriptions
      analyticsComponent.simulateRealtimeSubscriptions(subscriptionCount)
      
      // Simulate 2 minutes of real-time data
      const simulationDuration = 30000 // 30 seconds for testing
      const dataInterval = setInterval(() => {
        // Simulate incoming real-time data
        analyticsComponent.simulateDataProcessing(10)
      }, 100)
      
      await new Promise(resolve => setTimeout(resolve, simulationDuration))
      clearInterval(dataInterval)
      
      const peakMemory = process.memoryUsage().heapUsed
      
      // Cleanup subscriptions
      analyticsComponent.cleanup()
      memoryMonitor.forceGarbageCollection()
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const snapshots = memoryMonitor.stopMonitoring()
      const analysis = memoryMonitor.analyzeMemoryUsage()
      
      const finalMemory = process.memoryUsage().heapUsed
      const sustainedGrowth = finalMemory - startMemory
      
      expect(sustainedGrowth).toBeLessThan(MEMORY_THRESHOLDS.maxLeakPerComponent)
      expect(analysis.potentialLeaks.filter(l => l.severity === 'critical').length).toBe(0)
      
      console.log(`Real-time subscriptions (${subscriptionCount}):`)
      console.log(`- Sustained growth: ${(sustainedGrowth / 1024 / 1024).toFixed(2)}MB`)
      console.log(`- Potential leaks: ${analysis.potentialLeaks.length}`)
    })
  })

  describe('Long-Running Analytics Operations', () => {
    it('should maintain stable memory usage during extended operations', async () => {
      const operationDuration = 60000 // 1 minute
      const cycleInterval = 5000 // 5 seconds
      
      memoryMonitor.startMonitoring(1000)
      
      let cycles = 0
      const maxCycles = operationDuration / cycleInterval
      
      const operationTimer = setInterval(() => {
        cycles++
        
        // Simulate various analytics operations
        analyticsComponent.simulateDataProcessing(500)
        analyticsComponent.simulateRealtimeSubscriptions(5)
        analyticsComponent.simulatePeriodicTasks(2)
        
        // Cleanup old data (simulate normal operation)
        if (cycles % 3 === 0) {
          analyticsComponent.cleanup()
          analyticsComponent = new AnalyticsComponent()
        }
        
        // Force periodic GC
        if (cycles % 5 === 0) {
          memoryMonitor.forceGarbageCollection()
        }
        
        if (cycles >= maxCycles) {
          clearInterval(operationTimer)
        }
      }, cycleInterval)
      
      // Wait for operation to complete
      await new Promise(resolve => {
        const checkComplete = setInterval(() => {
          if (cycles >= maxCycles) {
            clearInterval(checkComplete)
            resolve(undefined)
          }
        }, 1000)
      })
      
      const snapshots = memoryMonitor.stopMonitoring()
      const analysis = memoryMonitor.analyzeMemoryUsage()
      
      expect(analysis.averageUsage).toBeLessThan(MEMORY_THRESHOLDS.sustainedUsageLimit)
      expect(analysis.potentialLeaks.filter(l => l.severity === 'high' || l.severity === 'critical').length).toBe(0)
      
      console.log(`Extended operations (${cycles} cycles):`)
      console.log(`- Average usage: ${(analysis.averageUsage / 1024 / 1024).toFixed(2)}MB`)
      console.log(`- Peak usage: ${(analysis.peakUsage / 1024 / 1024).toFixed(2)}MB`)
      console.log(`- High/Critical leaks: ${analysis.potentialLeaks.filter(l => l.severity === 'high' || l.severity === 'critical').length}`)
    })

    it('should handle concurrent user memory patterns', async () => {
      const concurrentUsers = 20
      const userSessionDuration = 30000 // 30 seconds
      
      memoryMonitor.startMonitoring(1000)
      const startMemory = process.memoryUsage().heapUsed
      
      // Simulate concurrent user sessions
      const userPromises = Array.from({ length: concurrentUsers }, async (_, userId) => {
        const userComponent = new AnalyticsComponent()
        const sessionEnd = Date.now() + userSessionDuration
        
        while (Date.now() < sessionEnd) {
          // Simulate user actions
          userComponent.simulateDataProcessing(100)
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
          
          // Cleanup some data (simulate navigation/page changes)
          if (Math.random() > 0.7) {
            userComponent.cleanup()
          }
        }
        
        userComponent.cleanup()
      })
      
      await Promise.all(userPromises)
      
      const snapshots = memoryMonitor.stopMonitoring()
      const analysis = memoryMonitor.analyzeMemoryUsage()
      
      // Force cleanup
      memoryMonitor.forceGarbageCollection()
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const finalMemory = process.memoryUsage().heapUsed
      const residualMemory = finalMemory - startMemory
      
      expect(analysis.peakUsage - startMemory).toBeLessThan(MEMORY_THRESHOLDS.maxHeapGrowth)
      expect(residualMemory).toBeLessThan(MEMORY_THRESHOLDS.maxLeakPerComponent)
      
      console.log(`Concurrent users (${concurrentUsers}):`)
      console.log(`- Peak memory increase: ${((analysis.peakUsage - startMemory) / 1024 / 1024).toFixed(2)}MB`)
      console.log(`- Residual memory: ${(residualMemory / 1024 / 1024).toFixed(2)}MB`)
    })
  })

  describe('Mobile Device Memory Constraints', () => {
    it('should respect mobile device memory limits', async () => {
      // Simulate mobile device constraints
      const mobileScenarios = [
        { name: 'iPhone SE', memoryLimit: 1024 * 1024 * 1024 }, // 1GB
        { name: 'Android Budget', memoryLimit: 2 * 1024 * 1024 * 1024 }, // 2GB
        { name: 'iPad', memoryLimit: 3 * 1024 * 1024 * 1024 } // 3GB
      ]
      
      for (const scenario of mobileScenarios) {
        memoryMonitor.startMonitoring(500)
        const startMemory = process.memoryUsage().heapUsed
        
        // Simulate mobile analytics usage pattern
        analyticsComponent.simulateDataProcessing(500) // Smaller dataset for mobile
        analyticsComponent.simulateRealtimeSubscriptions(5) // Fewer subscriptions
        
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        const snapshots = memoryMonitor.stopMonitoring()
        const analysis = memoryMonitor.analyzeMemoryUsage()
        
        const maxUsage = analysis.peakUsage
        
        expect(maxUsage).toBeLessThan(MEMORY_THRESHOLDS.mobileDeviceLimit)
        
        analyticsComponent.cleanup()
        memoryMonitor.forceGarbageCollection()
        
        console.log(`${scenario.name}: Peak usage ${(maxUsage / 1024 / 1024).toFixed(2)}MB`)
      }
    })

    it('should optimize memory usage for low-end devices', async () => {
      // Simulate low-end device scenario
      const lowEndScenario = {
        maxConcurrentData: 100,
        maxSubscriptions: 3,
        refreshInterval: 5000 // Slower refresh
      }
      
      memoryMonitor.startMonitoring(1000)
      
      // Progressive loading simulation
      for (let batch = 1; batch <= 5; batch++) {
        analyticsComponent.simulateDataProcessing(lowEndScenario.maxConcurrentData)
        
        await new Promise(resolve => setTimeout(resolve, lowEndScenario.refreshInterval))
        
        // Cleanup old batches (simulate pagination/virtualization)
        if (batch > 2) {
          analyticsComponent.cleanup()
          analyticsComponent = new AnalyticsComponent()
        }
        
        const currentMemory = process.memoryUsage().heapUsed
        expect(currentMemory).toBeLessThan(MEMORY_THRESHOLDS.mobileDeviceLimit)
      }
      
      const snapshots = memoryMonitor.stopMonitoring()
      const analysis = memoryMonitor.analyzeMemoryUsage()
      
      expect(analysis.averageUsage).toBeLessThan(MEMORY_THRESHOLDS.mobileDeviceLimit * 0.7) // 70% of limit
      expect(analysis.potentialLeaks.length).toBe(0)
      
      console.log(`Low-end device optimization:`)
      console.log(`- Average usage: ${(analysis.averageUsage / 1024 / 1024).toFixed(2)}MB`)
      console.log(`- Memory efficiency: ${(analysis.memoryEfficiency * 1000).toFixed(2)} bytes/ms`)
    })
  })

  describe('Garbage Collection Efficiency', () => {
    it('should maintain efficient garbage collection patterns', async () => {
      const iterations = 10
      const gcMetrics: { 
        beforeGC: number, 
        afterGC: number, 
        freed: number, 
        efficiency: number 
      }[] = []
      
      for (let i = 0; i < iterations; i++) {
        // Create memory pressure
        analyticsComponent.simulateDataProcessing(2000)
        analyticsComponent.simulateRealtimeSubscriptions(20)
        
        const beforeGC = process.memoryUsage().heapUsed
        
        // Force garbage collection
        memoryMonitor.forceGarbageCollection()
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const afterGC = process.memoryUsage().heapUsed
        const freed = beforeGC - afterGC
        const efficiency = freed / beforeGC
        
        gcMetrics.push({ beforeGC, afterGC, freed, efficiency })
        
        analyticsComponent.cleanup()
        analyticsComponent = new AnalyticsComponent()
        
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      const averageEfficiency = gcMetrics.reduce((sum, metric) => sum + metric.efficiency, 0) / gcMetrics.length
      const totalFreed = gcMetrics.reduce((sum, metric) => sum + metric.freed, 0)
      
      expect(averageEfficiency).toBeGreaterThan(MEMORY_THRESHOLDS.gcEfficiency)
      expect(totalFreed).toBeGreaterThan(0)
      
      console.log(`Garbage Collection Analysis (${iterations} iterations):`)
      console.log(`- Average efficiency: ${(averageEfficiency * 100).toFixed(1)}%`)
      console.log(`- Total memory freed: ${(totalFreed / 1024 / 1024).toFixed(2)}MB`)
      console.log(`- Average freed per GC: ${(totalFreed / iterations / 1024 / 1024).toFixed(2)}MB`)
    })
  })
})