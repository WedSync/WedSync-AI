import { EventEmitter } from 'events'

export interface WeddingDayStatus {
  isWeddingDay: boolean
  currentWeddings: WeddingEvent[]
  systemStatus: 'normal' | 'wedding-protected' | 'emergency' | 'critical'
  readOnlyMode: boolean
  emergencyOverrideActive: boolean
  lastChecked: Date
}

export interface WeddingEvent {
  id: string
  photographerId: string
  venueId: string
  date: Date
  status: 'scheduled' | 'in-progress' | 'completed' | 'emergency'
  guestCount: number
  vendorCount: number
  systemLoad: number
  criticalSystems: string[]
}

export interface WeddingDayMetrics {
  totalSystemRequests: number
  blockedOperations: number
  emergencyOverrides: number
  systemResponseTime: number
  errorRate: number
  weddingSuccessRate: number
  vendorSatisfaction: number
}

export class WeddingDayMonitor extends EventEmitter {
  private currentStatus: WeddingDayStatus
  private metrics: WeddingDayMetrics
  private monitoringInterval: NodeJS.Timer | null = null
  
  constructor() {
    super()
    this.currentStatus = {
      isWeddingDay: false,
      currentWeddings: [],
      systemStatus: 'normal',
      readOnlyMode: false,
      emergencyOverrideActive: false,
      lastChecked: new Date()
    }
    
    this.metrics = {
      totalSystemRequests: 0,
      blockedOperations: 0,
      emergencyOverrides: 0,
      systemResponseTime: 0,
      errorRate: 0,
      weddingSuccessRate: 100,
      vendorSatisfaction: 98.5
    }
  }

  async startMonitoring(): Promise<void> {
    // Check every 30 seconds for wedding day status
    this.monitoringInterval = setInterval(async () => {
      await this.checkWeddingDayStatus()
    }, 30000)

    // Initial check
    await this.checkWeddingDayStatus()
    
    this.emit('monitoring-started')
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    
    this.emit('monitoring-stopped')
  }

  private async checkWeddingDayStatus(): Promise<void> {
    const today = new Date()
    const isSaturday = today.getDay() === 6
    
    // Get current weddings for today
    const currentWeddings = await this.getCurrentWeddings(today)
    
    // Determine system status
    const previousStatus = this.currentStatus.systemStatus
    let newSystemStatus: WeddingDayStatus['systemStatus'] = 'normal'
    
    if (isSaturday && currentWeddings.length > 0) {
      const emergencyWeddings = currentWeddings.filter(w => w.status === 'emergency')
      
      if (emergencyWeddings.length > 0) {
        newSystemStatus = 'critical'
      } else {
        newSystemStatus = 'wedding-protected'
      }
    }

    // Update status
    this.currentStatus = {
      isWeddingDay: isSaturday && currentWeddings.length > 0,
      currentWeddings,
      systemStatus: newSystemStatus,
      readOnlyMode: newSystemStatus === 'wedding-protected' || newSystemStatus === 'critical',
      emergencyOverrideActive: newSystemStatus === 'critical',
      lastChecked: today
    }

    // Emit status changes
    if (previousStatus !== newSystemStatus) {
      this.emit('status-changed', {
        from: previousStatus,
        to: newSystemStatus,
        weddings: currentWeddings.length,
        timestamp: today
      })

      // Special handling for wedding day activation
      if (newSystemStatus === 'wedding-protected') {
        this.emit('wedding-day-activated', {
          weddings: currentWeddings,
          readOnlyMode: true
        })
      }

      // Critical alert for emergency status
      if (newSystemStatus === 'critical') {
        this.emit('wedding-emergency', {
          emergencyWeddings: currentWeddings.filter(w => w.status === 'emergency'),
          immediateAction: 'EMERGENCY_OVERRIDE_AVAILABLE'
        })
      }
    }

    // Update metrics
    await this.updateMetrics()
  }

  private async getCurrentWeddings(date: Date): Promise<WeddingEvent[]> {
    // In real implementation, this would query the database
    // For testing purposes, simulate weddings on Saturdays
    
    if (date.getDay() !== 6) return [] // Not Saturday
    
    // Simulate wedding events for testing
    const weddings: WeddingEvent[] = []
    
    // Summer peak season simulation
    const isWeddingSeason = date.getMonth() >= 5 && date.getMonth() <= 8 // June-September
    
    if (isWeddingSeason) {
      // Generate realistic wedding load
      const weddingCount = Math.floor(Math.random() * 5) + 1 // 1-5 weddings per Saturday
      
      for (let i = 0; i < weddingCount; i++) {
        weddings.push({
          id: `wedding-${date.toISOString().split('T')[0]}-${i + 1}`,
          photographerId: `photographer-${i + 1}`,
          venueId: `venue-${i + 1}`,
          date,
          status: 'in-progress',
          guestCount: Math.floor(Math.random() * 200) + 50,
          vendorCount: Math.floor(Math.random() * 8) + 3,
          systemLoad: Math.floor(Math.random() * 50) + 20,
          criticalSystems: ['payment', 'communication', 'gallery', 'timeline']
        })
      }
    }
    
    return weddings
  }

  private async updateMetrics(): Promise<void> {
    // Update real-time metrics
    this.metrics = {
      ...this.metrics,
      totalSystemRequests: this.metrics.totalSystemRequests + Math.floor(Math.random() * 100),
      systemResponseTime: await this.measureResponseTime(),
      errorRate: await this.calculateErrorRate()
    }

    // Emit metrics update
    this.emit('metrics-updated', this.metrics)
  }

  private async measureResponseTime(): Promise<number> {
    // Simulate response time measurement
    const baseTime = this.currentStatus.isWeddingDay ? 100 : 50 // Higher on wedding days
    const variance = Math.random() * 50
    return Math.round(baseTime + variance)
  }

  private async calculateErrorRate(): Promise<number> {
    // Simulate error rate calculation
    const baseRate = this.currentStatus.systemStatus === 'critical' ? 0.5 : 0.1
    const variance = Math.random() * 0.2
    return Math.round((baseRate + variance) * 100) / 100
  }

  // Public methods for external integration
  async recordEmergencyOverride(reason: string, userId: string): Promise<void> {
    this.metrics.emergencyOverrides++
    
    this.emit('emergency-override', {
      reason,
      userId,
      timestamp: new Date(),
      systemStatus: this.currentStatus.systemStatus
    })
  }

  async recordBlockedOperation(operation: string, userId: string): Promise<void> {
    this.metrics.blockedOperations++
    
    this.emit('operation-blocked', {
      operation,
      userId,
      timestamp: new Date(),
      reason: 'Wedding day protection active'
    })
  }

  getStatus(): WeddingDayStatus {
    return { ...this.currentStatus }
  }

  getMetrics(): WeddingDayMetrics {
    return { ...this.metrics }
  }

  async generateWeddingDayReport(): Promise<WeddingDayReport> {
    return {
      date: new Date(),
      weddingCount: this.currentStatus.currentWeddings.length,
      systemStatus: this.currentStatus.systemStatus,
      metrics: this.metrics,
      incidents: await this.getIncidents(),
      recommendations: this.generateRecommendations()
    }
  }

  private async getIncidents(): Promise<WeddingDayIncident[]> {
    // In real implementation, query incident database
    return [
      {
        id: 'incident-1',
        timestamp: new Date(),
        type: 'performance-degradation',
        severity: 'medium',
        description: 'Response time increased during peak load',
        resolved: true,
        resolution: 'Auto-scaling activated'
      }
    ]
  }

  private generateRecommendations(): string[] {
    const recommendations = []

    if (this.metrics.errorRate > 1.0) {
      recommendations.push('Monitor error logs closely - rate above 1%')
    }

    if (this.metrics.systemResponseTime > 500) {
      recommendations.push('Consider activating additional server capacity')
    }

    if (this.currentStatus.currentWeddings.length > 3) {
      recommendations.push('High wedding volume - ensure support team is available')
    }

    return recommendations
  }
}

export interface WeddingDayReport {
  date: Date
  weddingCount: number
  systemStatus: WeddingDayStatus['systemStatus']
  metrics: WeddingDayMetrics
  incidents: WeddingDayIncident[]
  recommendations: string[]
}

export interface WeddingDayIncident {
  id: string
  timestamp: Date
  type: 'system-error' | 'performance-degradation' | 'emergency-override' | 'vendor-issue'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  resolved: boolean
  resolution?: string
}