import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { VendorCRMSyncManager } from '@/lib/integrations/marketplace/vendor-crm-sync-manager'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
vi.mock('@supabase/supabase-js')
const mockSupabase = vi.mocked(createClient)

// Mock the CRM adapters
vi.mock('@/lib/integrations/marketplace/crm-adapters/HoneyBookAdapter', () => ({
  HoneyBookAdapter: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue({ success: true, accessToken: 'mock-token' }),
    getAllClients: vi.fn().mockResolvedValue([
      { id: '1', name: 'John & Jane Smith', email: 'john@example.com' }
    ]),
    importClients: vi.fn().mockResolvedValue({ clientsImported: 1 }),
    exportLeads: vi.fn().mockResolvedValue({ leadsExported: 2 }),
    syncWorkflowTemplates: vi.fn().mockResolvedValue({ workflowsSynced: 3 })
  }))
}))

vi.mock('@/lib/integrations/marketplace/crm-adapters/TaveAdapter', () => ({
  TaveAdapter: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue({ success: true, apiKey: 'mock-key' }),
    getAllClients: vi.fn().mockResolvedValue([
      { id: '2', name: 'Bob & Alice Johnson', email: 'bob@example.com' }
    ]),
    importClients: vi.fn().mockResolvedValue({ clientsImported: 2 }),
    exportLeads: vi.fn().mockResolvedValue({ leadsExported: 1 })
  }))
}))

vi.mock('@/lib/integrations/marketplace/crm-adapters/LightBlueAdapter', () => ({
  LightBlueAdapter: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue({ success: true, sessionId: 'mock-session' }),
    getAllClients: vi.fn().mockResolvedValue([
      { id: '3', name: 'Mike & Sarah Wilson', email: 'mike@example.com' }
    ]),
    importClients: vi.fn().mockResolvedValue({ clientsImported: 3 }),
    exportLeads: vi.fn().mockResolvedValue({ leadsExported: 4 })
  }))
}))

describe('VendorCRMSyncManager', () => {
  let crmManager: VendorCRMSyncManager
  let mockSupabaseClient: any

  beforeEach(() => {
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      data: []
    }
    
    mockSupabase.mockReturnValue(mockSupabaseClient)
    crmManager = new VendorCRMSyncManager()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('connectCRMPlatform', () => {
    test('should successfully connect to HoneyBook', async () => {
      const vendorId = 'vendor-123'
      const platform = 'honeybook'

      const result = await crmManager.connectCRMPlatform(platform, vendorId)

      expect(result).toEqual({
        success: true,
        platform: 'honeybook',
        connectionId: expect.any(String),
        message: 'Successfully connected to HoneyBook'
      })
    })

    test('should successfully connect to Tave', async () => {
      const vendorId = 'vendor-123'
      const platform = 'tave'

      const result = await crmManager.connectCRMPlatform(platform, vendorId)

      expect(result).toEqual({
        success: true,
        platform: 'tave',
        connectionId: expect.any(String),
        message: 'Successfully connected to Tave'
      })
    })

    test('should successfully connect to Light Blue', async () => {
      const vendorId = 'vendor-123'
      const platform = 'lightblue'

      const result = await crmManager.connectCRMPlatform(platform, vendorId)

      expect(result).toEqual({
        success: true,
        platform: 'lightblue',
        connectionId: expect.any(String),
        message: 'Successfully connected to Light Blue'
      })
    })

    test('should throw error for unsupported platform', async () => {
      const vendorId = 'vendor-123'
      const platform = 'unsupported'

      await expect(crmManager.connectCRMPlatform(platform, vendorId))
        .rejects.toThrow('Unsupported CRM platform: unsupported')
    })
  })

  describe('syncCRMData', () => {
    test('should sync data from HoneyBook', async () => {
      const vendorId = 'vendor-123'
      const platform = 'honeybook'

      const result = await crmManager.syncCRMData(vendorId, platform)

      expect(result).toEqual({
        success: true,
        platform: 'honeybook',
        clientsSynced: 1,
        lastSyncTime: expect.any(Date)
      })
    })

    test('should handle sync errors gracefully', async () => {
      const vendorId = 'vendor-123'
      const platform = 'honeybook'

      // Mock adapter to throw error
      vi.mocked(require('@/lib/integrations/marketplace/crm-adapters/HoneyBookAdapter').HoneyBookAdapter)
        .mockImplementationOnce(() => ({
          authenticate: vi.fn().mockRejectedValue(new Error('Authentication failed')),
          getAllClients: vi.fn()
        }))

      crmManager = new VendorCRMSyncManager()

      await expect(crmManager.syncCRMData(vendorId, platform))
        .rejects.toThrow('Authentication failed')
    })
  })

  describe('importClients', () => {
    test('should import clients from multiple platforms', async () => {
      const vendorId = 'vendor-123'
      
      const honeyBookResult = await crmManager.importClients(vendorId, 'honeybook')
      const taveResult = await crmManager.importClients(vendorId, 'tave')
      const lightBlueResult = await crmManager.importClients(vendorId, 'lightblue')

      expect(honeyBookResult.clientsImported).toBe(1)
      expect(taveResult.clientsImported).toBe(2)
      expect(lightBlueResult.clientsImported).toBe(3)
    })
  })

  describe('exportLeads', () => {
    test('should export leads to CRM platforms', async () => {
      const vendorId = 'vendor-123'
      
      const honeyBookResult = await crmManager.exportLeads(vendorId, 'honeybook')
      const taveResult = await crmManager.exportLeads(vendorId, 'tave')
      const lightBlueResult = await crmManager.exportLeads(vendorId, 'lightblue')

      expect(honeyBookResult.leadsExported).toBe(2)
      expect(taveResult.leadsExported).toBe(1)
      expect(lightBlueResult.leadsExported).toBe(4)
    })
  })

  describe('getAllConnections', () => {
    test('should return all CRM connections for vendor', async () => {
      const vendorId = 'vendor-123'
      
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              { id: '1', platform: 'honeybook', status: 'connected' },
              { id: '2', platform: 'tave', status: 'connected' }
            ],
            error: null
          })
        })
      })

      const result = await crmManager.getAllConnections(vendorId)

      expect(result).toHaveLength(2)
      expect(result[0].platform).toBe('honeybook')
      expect(result[1].platform).toBe('tave')
    })
  })

  describe('getSyncStatus', () => {
    test('should return sync status for platform', async () => {
      const vendorId = 'vendor-123'
      const platform = 'honeybook'
      
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValueOnce({
                data: { 
                  lastSyncTime: new Date().toISOString(), 
                  syncStatus: 'success',
                  clientsSynced: 5
                },
                error: null
              })
            })
          })
        })
      })

      const result = await crmManager.getSyncStatus(vendorId, platform)

      expect(result.syncStatus).toBe('success')
      expect(result.clientsSynced).toBe(5)
    })
  })

  describe('getAvailablePlatforms', () => {
    test('should return list of supported CRM platforms', async () => {
      const platforms = await crmManager.getAvailablePlatforms()

      expect(platforms).toEqual([
        { name: 'HoneyBook', id: 'honeybook', features: ['oauth2', 'webhooks', 'api'] },
        { name: 'Tave', id: 'tave', features: ['api_key', 'rest_api'] },
        { name: 'Light Blue', id: 'lightblue', features: ['screen_scraping', 'form_automation'] }
      ])
    })
  })

  describe('updateSyncSettings', () => {
    test('should update sync settings for connection', async () => {
      const connectionId = 'conn-123'
      const settings = { autoSync: true, syncInterval: 3600 }

      mockSupabaseClient.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: { ...settings, id: connectionId },
            error: null
          })
        })
      })

      const result = await crmManager.updateSyncSettings(connectionId, settings)

      expect(result.autoSync).toBe(true)
      expect(result.syncInterval).toBe(3600)
    })
  })

  describe('toggleAutoSync', () => {
    test('should toggle auto-sync setting', async () => {
      const connectionId = 'conn-123'

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { autoSync: false },
              error: null
            })
          })
        })
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: { autoSync: true },
            error: null
          })
        })
      })

      const result = await crmManager.toggleAutoSync(connectionId)

      expect(result.enabled).toBe(true)
    })
  })

  describe('disconnectCRM', () => {
    test('should disconnect CRM platform', async () => {
      const connectionId = 'conn-123'
      const vendorId = 'vendor-123'

      mockSupabaseClient.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockResolvedValueOnce({
              data: { id: connectionId },
              error: null
            })
          })
        })
      })

      const result = await crmManager.disconnectCRM(connectionId, vendorId)

      expect(result.success).toBe(true)
      expect(result.message).toBe('CRM connection removed successfully')
    })
  })
})