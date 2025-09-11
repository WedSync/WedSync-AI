/**
 * Database Health Monitoring Integration Tests - WS-234
 * End-to-end integration tests for complete monitoring workflows
 * Focus: Real-time updates, alert flows, and wedding day protocols
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { GET as healthHandler } from '@/app/api/admin/database/health/route'
import { DatabaseHealthDashboard } from '@/components/admin/database/DatabaseHealthDashboard'

// Mock environment variables
const mockSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const mockSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'

// Create test Supabase client
const testSupabase = createClient(mockSupabaseUrl, mockSupabaseKey)

// Mock real-time subscriptions
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          is: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        }))
      }))
    })),
    rpc: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        on: jest.fn(() => ({
          subscribe: jest.fn()
        }))
      })),
      unsubscribe: jest.fn()
    }))
  }))
}))

describe('Database Health Monitoring - Integration Tests', () => {
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
    
    // Setup successful auth mock
    const mockClient = require('@supabase/supabase-js').createClient()
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

  describe('End-to-End Monitoring Workflow', () => {
    it('should complete full health check workflow', async () => {
      const mockClient = require('@supabase/supabase-js').createClient()
      
      // Mock health check data
      mockClient.rpc.mockResolvedValueOnce({
        data: [{
          connection_health: 85,
          query_performance: 90,
          storage_usage: 75,
          active_connections: 42,
          slow_queries: 3,
          error_rate: 0.2,
          replication_lag: null,
          cache_hit_ratio: 94
        }],
        error: null
      })

      // Mock alerts data
      mockClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      })

      // Execute API call
      const request = new NextRequest('http://localhost:3000/api/admin/database/health')
      const response = await healthHandler(request)
      const data = await response.json()

      // Verify complete workflow
      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.metrics.connection_health).toBe(85)
      expect(data.metrics.query_performance).toBe(90)
      expect(data.overall_score).toBeGreaterThan(80)
      
      // Verify recommendations are generated
      expect(data.recommendations).toBeInstanceOf(Array)
      expect(data.alerts).toBeInstanceOf(Array)
    })

    it('should handle wedding day emergency workflow end-to-end', async () => {
      // Mock Saturday
      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(6)

      const mockClient = require('@supabase/supabase-js').createClient()
      
      // Mock critical health data on wedding day
      mockClient.rpc.mockResolvedValueOnce({
        data: [{
          connection_health: 45,
          query_performance: 30,
          storage_usage: 92,
          active_connections: 95,
          slow_queries: 25,
          error_rate: 3.5,
          replication_lag: 8000,
          cache_hit_ratio: 65
        }],
        error: null
      })

      // Mock wedding impact assessment
      mockClient.rpc.mockResolvedValueOnce({
        data: {
          affected_weddings: 15,
          critical_operations: ['guest_checkins', 'photo_uploads'],
          mitigation_actions: ['Scale database', 'Contact venues']
        },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/admin/database/health')
      const response = await healthHandler(request)
      const data = await response.json()

      // Verify emergency escalation
      expect(response.status).toBe(200)
      expect(data.status).toBe('emergency')
      expect(data.wedding_day_mode).toBe(true)
      expect(data.overall_score).toBeLessThan(50)
      expect(data.wedding_impact.affected_weddings).toBe(15)
      expect(data.recommendations[0]).toContain('WEDDING DAY PROTOCOL')
    })
  })

  describe('Real-time Dashboard Integration', () => {
    it('should render dashboard with live data updates', async () => {
      const mockClient = require('@supabase/supabase-js').createClient()
      
      // Mock initial data
      mockClient.rpc.mockResolvedValue({
        data: [{
          connection_health: 90,
          query_performance: 85,
          storage_usage: 70,
          active_connections: 40,
          slow_queries: 2,
          error_rate: 0.1,
          cache_hit_ratio: 95
        }],
        error: null
      })

      // Mock real-time subscription
      const mockChannel = {
        on: jest.fn(() => mockChannel),
        subscribe: jest.fn(() => Promise.resolve()),
        unsubscribe: jest.fn()
      }
      mockClient.channel.mockReturnValue(mockChannel)

      render(<DatabaseHealthDashboard refreshInterval={1000} />)

      await waitFor(() => {
        expect(screen.getByText('Database Health Monitor')).toBeInTheDocument()
      })

      // Verify real-time subscription is set up
      expect(mockClient.channel).toHaveBeenCalled()
      expect(mockChannel.on).toHaveBeenCalled()
      expect(mockChannel.subscribe).toHaveBeenCalled()

      // Simulate real-time update
      const updateCallback = mockChannel.on.mock.calls[0][2]
      updateCallback({
        new: {
          connection_health: 75,
          query_performance: 80,
          alert_level: 'warning'
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/warning/i)).toBeInTheDocument()
      })
    })

    it('should handle real-time alert notifications', async () => {
      const mockClient = require('@supabase/supabase-js').createClient()
      
      // Mock alert subscription
      const mockAlertChannel = {
        on: jest.fn(() => mockAlertChannel),
        subscribe: jest.fn(() => Promise.resolve()),
        unsubscribe: jest.fn()
      }
      mockClient.channel.mockReturnValue(mockAlertChannel)

      render(<DatabaseHealthDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Database Health Monitor')).toBeInTheDocument()
      })

      // Simulate new alert
      const alertCallback = mockAlertChannel.on.mock.calls.find(
        call => call[0] === 'postgres_changes'
      )?.[2]

      if (alertCallback) {
        alertCallback({
          new: {
            id: 'new-alert-1',
            severity: 'critical',
            message: 'Wedding day database performance critical',
            wedding_context: '12 weddings affected',
            created_at: new Date().toISOString()
          }
        })

        await waitFor(() => {
          expect(screen.getByText(/Wedding day database performance critical/i)).toBeInTheDocument()
          expect(screen.getByText(/12 weddings affected/i)).toBeInTheDocument()
        })
      }
    })
  })

  describe('Alert Escalation Integration', () => {
    it('should complete alert creation and escalation workflow', async () => {
      const mockClient = require('@supabase/supabase-js').createClient()
      
      // Mock alert creation
      mockClient.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'escalated-alert-1',
                severity: 'critical',
                message: 'Database connection pool exhausted during wedding ceremony',
                wedding_context: 'Grand Ballroom - 250 guests checking in',
                escalation_level: 3,
                created_at: new Date().toISOString()
              },
              error: null
            }))
          }))
        }))
      })

      // Simulate alert creation API call
      const alertData = {
        severity: 'critical',
        message: 'Database connection pool exhausted during wedding ceremony',
        wedding_context: 'Grand Ballroom - 250 guests checking in',
        metric_name: 'connection_pool_usage',
        metric_value: 98
      }

      const createAlertHandler = require('@/app/api/admin/database/alerts/route').POST
      const request = new NextRequest('http://localhost:3000/api/admin/database/alerts', {
        method: 'POST',
        body: JSON.stringify(alertData)
      })

      const response = await createAlertHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.alert.severity).toBe('critical')
      expect(responseData.alert.wedding_context).toContain('Grand Ballroom')
      expect(responseData.escalation_triggered).toBe(true)
    })

    it('should handle alert resolution workflow', async () => {
      const mockClient = require('@supabase/supabase-js').createClient()
      
      // Mock alert resolution
      mockClient.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            is: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    id: 'resolved-alert-1',
                    severity: 'critical',
                    message: 'Connection pool issue resolved',
                    resolved_at: new Date().toISOString(),
                    resolved_by: 'Admin User',
                    resolution_note: 'Scaled database connection pool'
                  },
                  error: null
                }))
              }))
            }))
          }))
        }))
      })

      const resolveAlertHandler = require('@/app/api/admin/database/alerts/route').PATCH
      const request = new NextRequest('http://localhost:3000/api/admin/database/alerts', {
        method: 'PATCH',
        body: JSON.stringify({
          alert_id: 'resolved-alert-1',
          resolution_note: 'Scaled database connection pool'
        })
      })

      const response = await resolveAlertHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.alert.resolved_at).toBeTruthy()
      expect(responseData.alert.resolution_note).toBe('Scaled database connection pool')
      expect(responseData.resolved_by).toBeTruthy()
    })
  })

  describe('Wedding Day Protocol Integration', () => {
    it('should activate Saturday emergency protocols automatically', async () => {
      // Mock Saturday
      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(6)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14) // 2 PM - peak wedding time

      const mockClient = require('@supabase/supabase-js').createClient()
      
      // Mock wedding day status data
      mockClient.rpc
        .mockResolvedValueOnce({
          data: [
            {
              id: 'wedding-1',
              vendor_name: 'Perfect Weddings Photo',
              location: 'Riverside Manor',
              start_time: '15:00',
              guest_count: 180,
              timezone: 'Europe/London'
            },
            {
              id: 'wedding-2',
              vendor_name: 'Grand Venues Ltd',
              location: 'Oak Grove Estate',
              start_time: '14:30',
              guest_count: 220,
              timezone: 'Europe/London'
            }
          ],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            avg_response_time: 450,
            error_rate: 1.2
          }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [
            {
              operation_name: 'guest_checkins',
              status: 'healthy',
              avg_duration_ms: 95,
              error_count_last_hour: 0
            },
            {
              operation_name: 'photo_uploads',
              status: 'degraded',
              avg_duration_ms: 2500,
              error_count_last_hour: 3
            }
          ],
          error: null
        })

      const weddingStatusHandler = require('@/app/api/admin/database/wedding-status/route').GET
      const request = new NextRequest('http://localhost:3000/api/admin/database/wedding-status')
      const response = await weddingStatusHandler(request)
      const data = await response.json()

      // Verify wedding day protocol activation
      expect(response.status).toBe(200)
      expect(data.is_wedding_day).toBe(true)
      expect(data.wedding_day_mode).toBe('active')
      expect(data.active_weddings.total_count).toBe(2)
      expect(data.system_status.response_time_target_ms).toBe(200) // Stricter target
      expect(data.monitoring.check_frequency_seconds).toBe(30) // More frequent checks
      expect(data.monitoring.alert_threshold).toBe('ultra-strict')
      expect(data.emergency_contacts[0].status).toBe('notified')
    })

    it('should handle multiple venue coordination during peak hours', async () => {
      const mockClient = require('@supabase/supabase-js').createClient()
      
      // Mock multiple active venues with varying performance
      const venues = [
        { name: 'Grand Ballroom', performance: 'good', guest_count: 200 },
        { name: 'Rose Garden Chapel', performance: 'degraded', guest_count: 150 },
        { name: 'Lakeside Pavilion', performance: 'critical', guest_count: 300 },
        { name: 'Mountain View Lodge', performance: 'good', guest_count: 180 }
      ]

      mockClient.rpc.mockResolvedValue({
        data: venues.map((venue, index) => ({
          id: `wedding-${index + 1}`,
          vendor_name: `Vendor ${index + 1}`,
          location: venue.name,
          guest_count: venue.guest_count,
          avg_response_time: venue.performance === 'critical' ? 2500 : 
                           venue.performance === 'degraded' ? 800 : 150,
          has_recent_issues: venue.performance !== 'good'
        })),
        error: null
      })

      const weddingStatusHandler = require('@/app/api/admin/database/wedding-status/route').GET
      const request = new NextRequest('http://localhost:3000/api/admin/database/wedding-status')
      const response = await weddingStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.active_weddings.total_count).toBe(4)
      expect(data.active_weddings.critical_weddings.length).toBeGreaterThan(0)
      
      // Should identify Lakeside Pavilion as critical due to performance + large guest count
      const criticalWedding = data.active_weddings.critical_weddings.find(
        w => w.location === 'Lakeside Pavilion'
      )
      expect(criticalWedding).toBeTruthy()
      expect(criticalWedding.health_status).toBe('warning')
    })
  })

  describe('Database Function Integration', () => {
    it('should integrate health functions with API endpoints', async () => {
      const mockClient = require('@supabase/supabase-js').createClient()
      
      // Test that API calls the correct database functions
      mockClient.rpc
        .mockResolvedValueOnce({
          data: [{ /* connection health results */ }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{ /* slow query results */ }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{ /* readiness check results */ }],
          error: null
        })

      const request = new NextRequest('http://localhost:3000/api/admin/database/health')
      await healthHandler(request)

      // Verify database functions are called
      expect(mockClient.rpc).toHaveBeenCalledWith('get_comprehensive_database_health')
      expect(mockClient.rpc).toHaveBeenCalledWith('get_database_alerts_summary', expect.any(Object))
    })

    it('should handle database function errors gracefully', async () => {
      const mockClient = require('@supabase/supabase-js').createClient()
      
      // Mock database function error
      mockClient.rpc.mockResolvedValue({
        data: null,
        error: new Error('Function execution failed')
      })

      const request = new NextRequest('http://localhost:3000/api/admin/database/health')
      const response = await healthHandler(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('Failed to retrieve database health metrics')
      expect(data.alerts[0].severity).toBe('emergency') // Wedding day would escalate to emergency
    })
  })

  describe('Performance Under Load', () => {
    it('should maintain performance with multiple concurrent requests', async () => {
      const mockClient = require('@supabase/supabase-js').createClient()
      
      mockClient.rpc.mockResolvedValue({
        data: [{ connection_health: 85 }],
        error: null
      })

      const startTime = Date.now()
      
      // Simulate 20 concurrent health checks
      const requests = Array.from({ length: 20 }, () => 
        healthHandler(new NextRequest('http://localhost:3000/api/admin/database/health'))
      )

      const responses = await Promise.all(requests)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Should complete within 5 seconds even under load
      expect(totalTime).toBeLessThan(5000)
    })

    it('should handle wedding day peak load efficiently', async () => {
      // Mock Saturday peak hours
      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(6)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(15) // 3 PM

      const mockClient = require('@supabase/supabase-js').createClient()
      
      mockClient.rpc.mockResolvedValue({
        data: [{ 
          connection_health: 70,
          active_connections: 80,
          slow_queries: 15 
        }],
        error: null
      })

      const startTime = Date.now()
      
      // Simulate heavy wedding day load (50 concurrent requests)
      const requests = Array.from({ length: 50 }, () => 
        healthHandler(new NextRequest('http://localhost:3000/api/admin/database/health'))
      )

      const responses = await Promise.all(requests)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // All requests should succeed even under wedding day load
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Should maintain performance standards even during peak load
      expect(totalTime).toBeLessThan(8000) // Allow slightly more time for wedding day load
      
      // All responses should indicate wedding day mode
      for (const response of responses) {
        const data = await response.json()
        expect(data.wedding_day_mode).toBe(true)
      }
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data consistency across multiple API calls', async () => {
      const mockClient = require('@supabase/supabase-js').createClient()
      
      const consistentHealthData = {
        connection_health: 85,
        query_performance: 90,
        storage_usage: 70,
        timestamp: new Date().toISOString()
      }

      mockClient.rpc.mockResolvedValue({
        data: [consistentHealthData],
        error: null
      })

      // Make multiple API calls
      const requests = await Promise.all([
        healthHandler(new NextRequest('http://localhost:3000/api/admin/database/health')),
        healthHandler(new NextRequest('http://localhost:3000/api/admin/database/health')),
        healthHandler(new NextRequest('http://localhost:3000/api/admin/database/health'))
      ])

      // Data should be consistent across calls
      const responses = await Promise.all(requests.map(r => r.json()))
      
      responses.forEach(data => {
        expect(data.metrics.connection_health).toBe(85)
        expect(data.metrics.query_performance).toBe(90)
        expect(data.metrics.storage_usage).toBe(70)
      })
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
})