import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { IntegrationHealthMonitor } from '@/lib/integrations/marketplace/integration-health-monitor'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
vi.mock('@supabase/supabase-js')
const mockSupabase = vi.mocked(createClient)

describe('IntegrationHealthMonitor', () => {
  let healthMonitor: IntegrationHealthMonitor
  let mockSupabaseClient: any

  beforeEach(() => {
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      data: []
    }
    
    mockSupabase.mockReturnValue(mockSupabaseClient)
    healthMonitor = new IntegrationHealthMonitor()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getOverallHealth', () => {
    test('should return overall health status for vendor', async () => {
      const vendorId = 'vendor-123'
      
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              { platform: 'honeybook', status: 'healthy', lastCheck: new Date().toISOString() },
              { platform: 'instagram', status: 'healthy', lastCheck: new Date().toISOString() },
              { platform: 'stripe', status: 'warning', lastCheck: new Date().toISOString() }
            ],
            error: null
          })
        })
      })

      const result = await healthMonitor.getOverallHealth(vendorId)

      expect(result).toEqual({
        overallStatus: 'healthy',
        healthyIntegrations: 2,
        warningIntegrations: 1,
        failingIntegrations: 0,
        totalIntegrations: 3,
        lastUpdated: expect.any(Date)
      })
    })

    test('should handle failing integrations correctly', async () => {
      const vendorId = 'vendor-123'
      
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              { platform: 'honeybook', status: 'failed', lastCheck: new Date().toISOString() },
              { platform: 'instagram', status: 'healthy', lastCheck: new Date().toISOString() }
            ],
            error: null
          })
        })
      })

      const result = await healthMonitor.getOverallHealth(vendorId)

      expect(result.overallStatus).toBe('critical')
      expect(result.failingIntegrations).toBe(1)
      expect(result.healthyIntegrations).toBe(1)
    })
  })

  describe('getPlatformHealth', () => {
    test('should return health status for specific platform', async () => {
      const vendorId = 'vendor-123'
      const platform = 'honeybook'
      
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValueOnce({
                data: {
                  platform: 'honeybook',
                  status: 'healthy',
                  lastCheck: new Date().toISOString(),
                  responseTime: 150,
                  uptime: 99.8,
                  errorRate: 0.1
                },
                error: null
              })
            })
          })
        })
      })

      const result = await healthMonitor.getPlatformHealth(vendorId, platform)

      expect(result.platform).toBe('honeybook')
      expect(result.status).toBe('healthy')
      expect(result.responseTime).toBe(150)
      expect(result.uptime).toBe(99.8)
    })
  })

  describe('runDiagnostics', () => {
    test('should run comprehensive diagnostics for integration', async () => {
      const integrationId = 'integration-123'
      
      // Mock the integration data
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: integrationId,
                platform: 'honeybook',
                status: 'healthy',
                lastSync: new Date().toISOString()
              },
              error: null
            })
          })
        })
      })

      const result = await healthMonitor.runDiagnostics(integrationId)

      expect(result).toEqual({
        integrationId,
        platform: 'honeybook',
        diagnostics: {
          connectivity: 'passed',
          authentication: 'passed',
          apiLimits: 'passed',
          dataSync: 'passed',
          performance: 'good'
        },
        recommendations: [],
        lastRun: expect.any(Date)
      })
    })

    test('should identify issues in diagnostics', async () => {
      const integrationId = 'integration-123'
      
      // Mock integration with issues
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: integrationId,
                platform: 'instagram',
                status: 'warning',
                lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                errorCount: 5
              },
              error: null
            })
          })
        })
      })

      const result = await healthMonitor.runDiagnostics(integrationId)

      expect(result.diagnostics.dataSync).toBe('warning')
      expect(result.recommendations).toContain('Consider increasing sync frequency')
      expect(result.recommendations).toContain('Review recent error logs')
    })
  })

  describe('attemptAutoRepair', () => {
    test('should successfully repair integration', async () => {
      const integrationId = 'integration-123'
      const repairOptions = { refreshAuth: true, resetConnection: false }

      // Mock successful repair
      const result = await healthMonitor.attemptAutoRepair(integrationId, repairOptions)

      expect(result).toEqual({
        success: true,
        integrationId,
        repairActions: ['refreshed_authentication'],
        timestamp: expect.any(Date),
        message: 'Auto-repair completed successfully'
      })
    })

    test('should handle failed repair attempts', async () => {
      const integrationId = 'integration-123'
      const repairOptions = { refreshAuth: true, resetConnection: true }

      // Mock the integration to simulate auth failure
      vi.spyOn(healthMonitor as any, 'refreshAuthentication').mockResolvedValueOnce({
        success: false,
        error: 'Token refresh failed'
      })

      const result = await healthMonitor.attemptAutoRepair(integrationId, repairOptions)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Token refresh failed')
    })
  })

  describe('testConnection', () => {
    test('should test integration connection successfully', async () => {
      const integrationId = 'integration-123'

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                platform: 'honeybook',
                credentials: { accessToken: 'valid-token' }
              },
              error: null
            })
          })
        })
      })

      const result = await healthMonitor.testConnection(integrationId)

      expect(result).toEqual({
        success: true,
        integrationId,
        responseTime: expect.any(Number),
        timestamp: expect.any(Date),
        message: 'Connection test passed'
      })
    })
  })

  describe('getHealthHistory', () => {
    test('should return health history for vendor', async () => {
      const vendorId = 'vendor-123'
      const days = 7
      
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            gte: vi.fn().mockReturnValueOnce({
              order: vi.fn().mockResolvedValueOnce({
                data: [
                  { date: '2024-01-20', healthyCount: 5, warningCount: 1, failedCount: 0 },
                  { date: '2024-01-19', healthyCount: 4, warningCount: 2, failedCount: 0 },
                  { date: '2024-01-18', healthyCount: 6, warningCount: 0, failedCount: 0 }
                ],
                error: null
              })
            })
          })
        })
      })

      const result = await healthMonitor.getHealthHistory(vendorId, days)

      expect(result).toHaveLength(3)
      expect(result[0].date).toBe('2024-01-20')
      expect(result[0].healthyCount).toBe(5)
    })
  })

  describe('getErrorLogs', () => {
    test('should return error logs for vendor', async () => {
      const vendorId = 'vendor-123'
      const options = { limit: 10, severity: 'error' }
      
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              order: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockResolvedValueOnce({
                  data: [
                    { 
                      id: '1',
                      platform: 'instagram',
                      severity: 'error',
                      message: 'API rate limit exceeded',
                      timestamp: new Date().toISOString()
                    },
                    { 
                      id: '2',
                      platform: 'honeybook',
                      severity: 'warning',
                      message: 'Slow response time detected',
                      timestamp: new Date().toISOString()
                    }
                  ],
                  error: null
                })
              })
            })
          })
        })
      })

      const result = await healthMonitor.getErrorLogs(vendorId, options)

      expect(result).toHaveLength(2)
      expect(result[0].platform).toBe('instagram')
      expect(result[0].severity).toBe('error')
    })
  })

  describe('getFailingIntegrations', () => {
    test('should return list of failing integrations', async () => {
      const vendorId = 'vendor-123'
      
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockResolvedValueOnce({
              data: [
                { 
                  id: '1',
                  platform: 'lightblue',
                  status: 'failed',
                  errorMessage: 'Authentication expired',
                  lastError: new Date().toISOString()
                }
              ],
              error: null
            })
          })
        })
      })

      const result = await healthMonitor.getFailingIntegrations(vendorId)

      expect(result).toHaveLength(1)
      expect(result[0].platform).toBe('lightblue')
      expect(result[0].status).toBe('failed')
    })
  })

  describe('getHealthAlerts', () => {
    test('should return active health alerts', async () => {
      const vendorId = 'vendor-123'
      
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockResolvedValueOnce({
              data: [
                { 
                  id: '1',
                  type: 'performance',
                  severity: 'warning',
                  message: 'Instagram API response time above threshold',
                  platform: 'instagram',
                  createdAt: new Date().toISOString()
                },
                { 
                  id: '2',
                  type: 'connectivity',
                  severity: 'critical',
                  message: 'HoneyBook connection failed',
                  platform: 'honeybook',
                  createdAt: new Date().toISOString()
                }
              ],
              error: null
            })
          })
        })
      })

      const result = await healthMonitor.getHealthAlerts(vendorId)

      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('performance')
      expect(result[1].severity).toBe('critical')
    })
  })

  describe('runHealthCheck', () => {
    test('should run comprehensive health check', async () => {
      const vendorId = 'vendor-123'
      const platform = 'honeybook'

      // Mock integrations data
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockResolvedValueOnce({
              data: [
                { id: 'int-1', platform: 'honeybook', status: 'healthy' },
                { id: 'int-2', platform: 'instagram', status: 'warning' }
              ],
              error: null
            })
          })
        })
      })

      const result = await healthMonitor.runHealthCheck(vendorId, platform)

      expect(result).toEqual({
        vendorId,
        platform: 'honeybook',
        overallStatus: 'healthy',
        integrationsChecked: 1,
        healthyCount: 1,
        warningCount: 0,
        failedCount: 0,
        timestamp: expect.any(Date)
      })
    })
  })

  describe('clearAlert', () => {
    test('should clear health alert', async () => {
      const alertId = 'alert-123'

      mockSupabaseClient.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: { id: alertId, status: 'cleared' },
            error: null
          })
        })
      })

      const result = await healthMonitor.clearAlert(alertId)

      expect(result.success).toBe(true)
      expect(result.alertId).toBe(alertId)
    })
  })

  describe('getSystemStatus', () => {
    test('should return overall system health status', async () => {
      // Mock system-wide health data
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockResolvedValueOnce({
          data: [
            { platform: 'honeybook', status: 'healthy', vendor_count: 150 },
            { platform: 'instagram', status: 'healthy', vendor_count: 200 },
            { platform: 'stripe', status: 'warning', vendor_count: 180 }
          ],
          error: null
        })
      })

      const result = await healthMonitor.getSystemStatus()

      expect(result).toEqual({
        overallStatus: 'healthy',
        totalVendors: 530,
        platformsHealthy: 2,
        platformsWarning: 1,
        platformsFailed: 0,
        lastUpdated: expect.any(Date)
      })
    })
  })
})