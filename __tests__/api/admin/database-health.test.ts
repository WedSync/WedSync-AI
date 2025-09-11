/**
 * Database Health API Routes Test Suite - WS-234
 * Tests all database health monitoring API endpoints
 * Focus: Wedding day reliability and vendor access protection
 */

import { NextRequest } from 'next/server'
import { GET as healthHandler } from '@/app/api/admin/database/health/route'
import { GET as metricsHandler } from '@/app/api/admin/database/metrics/route'
import { GET as alertsHandler, POST as createAlertHandler, PATCH as resolveAlertHandler } from '@/app/api/admin/database/alerts/route'
import { GET as weddingStatusHandler } from '@/app/api/admin/database/wedding-status/route'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    rpc: jest.fn()
  }))
}))

// Mock wedding day utilities
jest.mock('@/lib/utils/wedding-day', () => ({
  isWeddingDay: jest.fn(() => false),
  isHighTrafficPeriod: jest.fn(() => false),
  getWeddingDayThresholds: jest.fn(() => ({
    response_time_ms: 500,
    error_rate_percent: 1.0,
    connection_health_percent: 85,
    cache_hit_rate_percent: 90,
    alert_threshold: 'normal'
  }))
}))

// Mock rate limiting
jest.mock('@/lib/middleware/rate-limiting', () => ({
  rateLimit: jest.fn(() => Promise.resolve({ success: true }))
}))

describe('Database Health API Routes', () => {
  const mockAdminUser = {
    id: 'admin-user-id',
    email: 'admin@wedsync.com'
  }

  const mockAdminProfile = {
    role: 'admin',
    organization_id: 'org-123'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default successful auth mock
    const { createClient } = require('@/lib/supabase/server')
    const mockClient = createClient()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    })
    mockClient.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: mockAdminProfile,
            error: null
          }))
        }))
      }))
    })
  })

  describe('/api/admin/database/health', () => {
    it('should return healthy status for normal operations', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockClient = createClient()
      
      // Mock healthy database response
      mockClient.rpc.mockResolvedValueOnce({
        data: [{
          connection_health: 90,
          query_performance: 85,
          storage_usage: 60,
          active_connections: 45,
          slow_queries: 2,
          error_rate: 0.1,
          replication_lag: null,
          cache_hit_ratio: 95
        }],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/admin/database/health')
      const response = await healthHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.wedding_day_mode).toBe(false)
      expect(data.metrics).toHaveProperty('connection_health', 90)
      expect(data.metrics).toHaveProperty('query_performance', 85)
      expect(data.overall_score).toBeGreaterThan(80)
    })

    it('should escalate to emergency status on wedding days with critical issues', async () => {
      // Mock wedding day
      const { isWeddingDay, getWeddingDayThresholds } = require('@/lib/utils/wedding-day')
      isWeddingDay.mockReturnValue(true)
      getWeddingDayThresholds.mockReturnValue({
        response_time_ms: 200,
        error_rate_percent: 0.1,
        connection_health_percent: 95,
        cache_hit_rate_percent: 95,
        alert_threshold: 'ultra-strict'
      })

      const { createClient } = require('@/lib/supabase/server')
      const mockClient = createClient()
      
      // Mock critical database response on wedding day
      mockClient.rpc.mockResolvedValueOnce({
        data: [{
          connection_health: 60,
          query_performance: 40,
          storage_usage: 90,
          active_connections: 85,
          slow_queries: 25,
          error_rate: 2.5,
          replication_lag: 5000,
          cache_hit_ratio: 70
        }],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/admin/database/health')
      const response = await healthHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('emergency')
      expect(data.wedding_day_mode).toBe(true)
      expect(data.overall_score).toBeLessThan(50)
      expect(data.recommendations).toContain('WEDDING DAY PROTOCOL: Immediate attention required')
    })

    it('should return 401 for unauthenticated requests', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockClient = createClient()
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('No user')
      })

      const request = new NextRequest('http://localhost:3000/api/admin/database/health')
      const response = await healthHandler(request)

      expect(response.status).toBe(401)
    })

    it('should return 403 for non-admin users', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockClient = createClient()
      mockClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { role: 'vendor' },
              error: null
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/admin/database/health')
      const response = await healthHandler(request)

      expect(response.status).toBe(403)
    })

    it('should handle rate limiting correctly', async () => {
      const { rateLimit } = require('@/lib/middleware/rate-limiting')
      rateLimit.mockResolvedValue({
        success: false,
        retryAfter: 30
      })

      const request = new NextRequest('http://localhost:3000/api/admin/database/health')
      const response = await healthHandler(request)

      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.retry_after).toBe(30)
    })
  })

  describe('/api/admin/database/metrics', () => {
    it('should return detailed metrics with trend analysis', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockClient = createClient()
      
      // Mock detailed metrics response
      mockClient.rpc
        .mockResolvedValueOnce({
          data: [{
            total_queries: 15000,
            slow_queries: 45,
            avg_duration_ms: 125,
            p95_duration_ms: 400,
            slow_tables: 'guest_responses,wedding_photos',
            active_connections: 42,
            idle_connections: 18,
            max_connections: 100,
            failed_connections: 2,
            cache_hit_ratio: 92,
            buffer_cache_mb: 256,
            shared_buffers_mb: 512,
            buffer_utilization: 0.85
          }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            saturday_avg_response_ms: 180,
            weekend_error_rate: 0.3,
            peak_concurrent_weddings: 47,
            vendor_login_success_rate: 99.2,
            guest_update_avg_ms: 95,
            guest_update_error_rate: 0.1,
            vendor_comm_avg_ms: 145,
            vendor_comm_error_rate: 0.2,
            timeline_avg_ms: 78,
            timeline_error_rate: 0.05,
            critical_operations: []
          }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            total_size_mb: 8470,
            table_sizes: [],
            index_usage: [],
            growth_rate_mb_day: 45
          }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            performance_trend: 'stable',
            storage_trend: 'growing',
            error_trend: 'improving',
            recommendations: 'Monitor storage growth,Optimize slow queries'
          }],
          error: null
        })

      const request = new NextRequest('http://localhost:3000/api/admin/database/metrics?hours=24')
      const response = await metricsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.collection_period.duration_hours).toBe(24)
      expect(data.performance_metrics.query_stats.total_queries).toBe(15000)
      expect(data.performance_metrics.connection_stats.connection_utilization_percent).toBe(42)
      expect(data.wedding_specific_metrics.wedding_day_performance.saturday_avg_response_ms).toBe(180)
      expect(data.trends.performance_trend).toBe('stable')
    })

    it('should validate time range limits', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/database/metrics?hours=200')
      const response = await metricsHandler(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.message).toContain('Maximum time range is 168 hours')
    })
  })

  describe('/api/admin/database/alerts', () => {
    it('should return filtered alerts with pagination', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockClient = createClient()
      
      const mockAlerts = [
        {
          id: 'alert-1',
          severity: 'critical',
          message: 'High response time during wedding ceremony',
          metric_name: 'response_time',
          metric_value: 2500,
          wedding_context: 'Peak ceremony hours - 12 weddings affected',
          created_at: new Date().toISOString(),
          resolved_at: null,
          wedding_day_created: true,
          escalation_level: 3
        },
        {
          id: 'alert-2',
          severity: 'warning',
          message: 'Storage usage above threshold',
          created_at: new Date(Date.now() - 60000).toISOString(),
          resolved_at: null,
          wedding_day_created: false,
          escalation_level: 1
        }
      ]

      mockClient.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({
                not: jest.fn(() => ({
                  is: jest.fn(() => ({
                    gte: jest.fn(() => Promise.resolve({
                      data: mockAlerts,
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          }))
        }))
      })

      // Mock statistics
      mockClient.rpc.mockResolvedValue({
        data: [{
          total_alerts: 15,
          unresolved_alerts: 8,
          emergency_alerts: 2,
          wedding_day_alerts: 5,
          avg_resolution_hours: 2.3
        }],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/admin/database/alerts?severity=critical&hours_back=6')
      const response = await alertsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.alerts).toHaveLength(2)
      expect(data.alerts[0].severity).toBe('critical')
      expect(data.alerts[0].wedding_context).toBeTruthy()
      expect(data.statistics.unresolved_alerts).toBe(8)
      expect(data.statistics.wedding_day_alerts).toBe(5)
    })

    it('should create manual alerts with wedding day priority', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockClient = createClient()
      
      const newAlert = {
        severity: 'critical',
        message: 'Manual intervention required for wedding photo uploads',
        wedding_context: 'Grand Ballroom venue experiencing issues',
        metric_name: 'upload_performance',
        metric_value: 5000
      }

      mockClient.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'new-alert-id',
                ...newAlert,
                created_at: new Date().toISOString(),
                wedding_day_created: true,
                escalation_level: 3
              },
              error: null
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/admin/database/alerts', {
        method: 'POST',
        body: JSON.stringify(newAlert)
      })
      const response = await createAlertHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.alert.severity).toBe('critical')
      expect(data.alert.wedding_day_created).toBe(true)
      expect(data.escalation_triggered).toBeTruthy()
    })

    it('should resolve alerts with proper tracking', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockClient = createClient()
      
      const resolvedAlert = {
        id: 'alert-to-resolve',
        alert_id: 'alert-to-resolve',
        resolution_note: 'Fixed database connection pool configuration'
      }

      mockClient.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            is: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    ...resolvedAlert,
                    resolved_at: new Date().toISOString(),
                    resolved_by: 'Admin User'
                  },
                  error: null
                }))
              }))
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/admin/database/alerts', {
        method: 'PATCH',
        body: JSON.stringify(resolvedAlert)
      })
      const response = await resolveAlertHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.alert.resolved_at).toBeTruthy()
      expect(data.resolved_by).toBe('Admin User')
    })
  })

  describe('/api/admin/database/wedding-status', () => {
    it('should return comprehensive wedding day status', async () => {
      // Mock Saturday
      const { isWeddingDay, isHighTrafficPeriod } = require('@/lib/utils/wedding-day')
      isWeddingDay.mockReturnValue(true)
      isHighTrafficPeriod.mockReturnValue(true)

      const { createClient } = require('@/lib/supabase/server')
      const mockClient = createClient()
      
      // Mock active weddings
      mockClient.rpc.mockResolvedValueOnce({
        data: [
          {
            id: 'wedding-1',
            vendor_name: 'Elegant Photos',
            location: 'Grand Ballroom',
            start_time: '14:30',
            guest_count: 180,
            last_activity: new Date().toISOString(),
            avg_response_time: 145,
            has_recent_issues: false,
            timezone: 'Europe/London'
          },
          {
            id: 'wedding-2',
            vendor_name: 'Perfect Venues',
            location: 'Rose Garden Chapel',
            start_time: '15:00',
            guest_count: 220,
            last_activity: new Date(Date.now() - 300000).toISOString(),
            avg_response_time: 380,
            has_recent_issues: true,
            timezone: 'Europe/London'
          }
        ],
        error: null
      })

      // Mock performance data
      mockClient.rpc.mockResolvedValueOnce({
        data: [{
          avg_response_time: 185,
          error_rate: 0.2
        }],
        error: null
      })

      // Mock critical operations
      mockClient.rpc.mockResolvedValueOnce({
        data: [
          {
            operation_name: 'guest_list_updates',
            status: 'healthy',
            avg_duration_ms: 95,
            error_count_last_hour: 0,
            wedding_impact: 'high'
          },
          {
            operation_name: 'photo_uploads',
            status: 'degraded',
            avg_duration_ms: 2500,
            error_count_last_hour: 3,
            wedding_impact: 'critical'
          }
        ],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/admin/database/wedding-status')
      const response = await weddingStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.is_wedding_day).toBe(true)
      expect(data.wedding_day_mode).toBe('active')
      expect(data.active_weddings.total_count).toBe(2)
      expect(data.active_weddings.critical_weddings).toHaveLength(1)
      expect(data.system_status.performance_mode).toBe('enhanced')
      expect(data.system_status.response_time_target_ms).toBe(200)
      expect(data.monitoring.alert_threshold).toBe('ultra-strict')
      expect(data.emergency_contacts[0].status).toBe('notified')
    })

    it('should handle non-wedding day monitoring', async () => {
      const { isWeddingDay, isHighTrafficPeriod } = require('@/lib/utils/wedding-day')
      isWeddingDay.mockReturnValue(false)
      isHighTrafficPeriod.mockReturnValue(false)

      const { createClient } = require('@/lib/supabase/server')
      const mockClient = createClient()
      
      mockClient.rpc.mockResolvedValue({ data: [], error: null })

      const request = new NextRequest('http://localhost:3000/api/admin/database/wedding-status')
      const response = await weddingStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.is_wedding_day).toBe(false)
      expect(data.wedding_day_mode).toBe('off')
      expect(data.system_status.performance_mode).toBe('normal')
      expect(data.system_status.response_time_target_ms).toBe(500)
      expect(data.system_status.uptime_requirement).toBe('99.9%')
      expect(data.monitoring.alert_threshold).toBe('normal')
    })
  })

  describe('Wedding Day Emergency Protocols', () => {
    it('should trigger emergency escalation for Saturday critical alerts', async () => {
      const { isWeddingDay } = require('@/lib/utils/wedding-day')
      isWeddingDay.mockReturnValue(true)

      const { createClient } = require('@/lib/supabase/server')
      const mockClient = createClient()
      
      // Mock database returning critical status
      mockClient.rpc.mockResolvedValue({
        data: [{
          connection_health: 30,
          query_performance: 20,
          storage_usage: 95,
          active_connections: 98,
          slow_queries: 50,
          error_rate: 5.0,
          cache_hit_ratio: 60
        }],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/admin/database/health')
      const response = await healthHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('emergency')
      expect(data.wedding_day_mode).toBe(true)
      expect(data.recommendations[0]).toContain('WEDDING DAY PROTOCOL')
      expect(data.alerts[0].severity).toBe('emergency')
      expect(data.alerts[0].wedding_context).toContain('wedding')
    })

    it('should maintain strict thresholds during wedding preparations', async () => {
      const { isWeddingDay, isHighTrafficPeriod, getWeddingDayThresholds } = require('@/lib/utils/wedding-day')
      isWeddingDay.mockReturnValue(true)
      isHighTrafficPeriod.mockReturnValue(false) // Preparation time, not peak
      getWeddingDayThresholds.mockReturnValue({
        response_time_ms: 300, // Less strict than peak hours
        error_rate_percent: 0.5,
        connection_health_percent: 90,
        cache_hit_rate_percent: 92,
        alert_threshold: 'strict'
      })

      const { createClient } = require('@/lib/supabase/server')
      const mockClient = createClient()
      
      mockClient.rpc.mockResolvedValue({
        data: [{
          connection_health: 88,
          query_performance: 82,
          storage_usage: 70,
          active_connections: 55,
          slow_queries: 8,
          error_rate: 0.3,
          cache_hit_ratio: 91
        }],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/admin/database/health')
      const response = await healthHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('warning') // Should be warning due to strict wedding day thresholds
      expect(data.wedding_day_mode).toBe(true)
      expect(data.recommendations).toContain('Monitor continuously during active wedding hours')
    })
  })
})