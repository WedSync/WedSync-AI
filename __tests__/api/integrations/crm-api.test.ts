import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, POST, PUT, DELETE } from '@/app/api/integrations/crm/route'
import { NextRequest } from 'next/server'
import { VendorCRMSyncManager } from '@/lib/integrations/marketplace/vendor-crm-sync-manager'

// Mock the CRM Manager
vi.mock('@/lib/integrations/marketplace/vendor-crm-sync-manager')
const mockCRMManager = vi.mocked(VendorCRMSyncManager)

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }))
}))

describe('/api/integrations/crm', () => {
  let mockCRMManagerInstance: any

  beforeEach(() => {
    mockCRMManagerInstance = {
      getAllConnections: vi.fn(),
      getSyncStatus: vi.fn(),
      getAvailablePlatforms: vi.fn(),
      connectCRMPlatform: vi.fn(),
      syncCRMData: vi.fn(),
      importClients: vi.fn(),
      exportLeads: vi.fn(),
      syncWorkflowTemplates: vi.fn(),
      updateSyncSettings: vi.fn(),
      toggleAutoSync: vi.fn(),
      disconnectCRM: vi.fn()
    }
    
    mockCRMManager.mockImplementation(() => mockCRMManagerInstance)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/integrations/crm', () => {
    test('should return connections for vendor', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm?action=connections&vendorId=vendor-123')
      
      mockCRMManagerInstance.getAllConnections.mockResolvedValue([
        { id: '1', platform: 'honeybook', status: 'connected' },
        { id: '2', platform: 'tave', status: 'connected' }
      ])

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(mockCRMManagerInstance.getAllConnections).toHaveBeenCalledWith('vendor-123')
    })

    test('should return sync status for platform', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm?action=sync-status&vendorId=vendor-123&platform=honeybook')
      
      mockCRMManagerInstance.getSyncStatus.mockResolvedValue({
        platform: 'honeybook',
        lastSync: new Date(),
        status: 'success',
        clientsSynced: 25
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.platform).toBe('honeybook')
      expect(mockCRMManagerInstance.getSyncStatus).toHaveBeenCalledWith('vendor-123', 'honeybook')
    })

    test('should return available platforms', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm?action=platforms&vendorId=vendor-123')
      
      mockCRMManagerInstance.getAvailablePlatforms.mockResolvedValue([
        { name: 'HoneyBook', id: 'honeybook', features: ['oauth2', 'webhooks'] },
        { name: 'Tave', id: 'tave', features: ['api_key'] }
      ])

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
    })

    test('should return 400 for missing vendor ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm?action=connections')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Vendor ID required')
    })

    test('should return 400 for invalid action', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm?action=invalid&vendorId=vendor-123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action')
    })

    test('should handle internal server errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm?action=connections&vendorId=vendor-123')
      
      mockCRMManagerInstance.getAllConnections.mockRejectedValue(new Error('Database error'))

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/integrations/crm', () => {
    test('should connect to CRM platform', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'connect',
          vendorId: 'vendor-123',
          platform: 'honeybook'
        })
      })
      
      mockCRMManagerInstance.connectCRMPlatform.mockResolvedValue({
        success: true,
        platform: 'honeybook',
        connectionId: 'conn-123'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully connected to honeybook')
      expect(mockCRMManagerInstance.connectCRMPlatform).toHaveBeenCalledWith('honeybook', 'vendor-123')
    })

    test('should sync CRM data', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'sync',
          vendorId: 'vendor-123',
          platform: 'tave'
        })
      })
      
      mockCRMManagerInstance.syncCRMData.mockResolvedValue({
        success: true,
        clientsSynced: 15,
        platform: 'tave'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Sync completed for tave')
    })

    test('should import clients', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'import-clients',
          vendorId: 'vendor-123',
          platform: 'honeybook'
        })
      })
      
      mockCRMManagerInstance.importClients.mockResolvedValue({
        clientsImported: 50,
        success: true
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Imported 50 clients from honeybook')
    })

    test('should export leads', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'export-leads',
          vendorId: 'vendor-123',
          platform: 'lightblue'
        })
      })
      
      mockCRMManagerInstance.exportLeads.mockResolvedValue({
        leadsExported: 12,
        success: true
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Exported 12 leads to lightblue')
    })

    test('should sync workflow templates', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'sync-workflows',
          vendorId: 'vendor-123',
          platform: 'honeybook'
        })
      })
      
      mockCRMManagerInstance.syncWorkflowTemplates.mockResolvedValue({
        workflowsSynced: 8,
        success: true
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Synced 8 workflows with honeybook')
    })

    test('should return 400 for missing vendor ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'connect',
          platform: 'honeybook'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Vendor ID required')
    })

    test('should return 400 for missing platform', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'connect',
          vendorId: 'vendor-123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Platform required')
    })
  })

  describe('PUT /api/integrations/crm', () => {
    test('should update sync settings', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'update-settings',
          vendorId: 'vendor-123',
          connectionId: 'conn-123',
          settings: { autoSync: true, syncInterval: 3600 }
        })
      })
      
      mockCRMManagerInstance.updateSyncSettings.mockResolvedValue({
        success: true,
        autoSync: true,
        syncInterval: 3600
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('CRM settings updated successfully')
    })

    test('should toggle auto-sync', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'toggle-auto-sync',
          vendorId: 'vendor-123',
          connectionId: 'conn-123'
        })
      })
      
      mockCRMManagerInstance.toggleAutoSync.mockResolvedValue({
        enabled: true,
        success: true
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Auto-sync enabled')
    })

    test('should return 400 for missing connection ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'update-settings',
          vendorId: 'vendor-123',
          settings: { autoSync: true }
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Connection ID required')
    })
  })

  describe('DELETE /api/integrations/crm', () => {
    test('should disconnect CRM platform', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm?connectionId=conn-123&vendorId=vendor-123', {
        method: 'DELETE'
      })
      
      mockCRMManagerInstance.disconnectCRM.mockResolvedValue({
        success: true,
        message: 'Disconnected successfully'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('CRM connection removed successfully')
      expect(mockCRMManagerInstance.disconnectCRM).toHaveBeenCalledWith('conn-123', 'vendor-123')
    })

    test('should return 400 for missing connection ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm?vendorId=vendor-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Connection ID and Vendor ID required')
    })

    test('should return 400 for missing vendor ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/crm?connectionId=conn-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Connection ID and Vendor ID required')
    })
  })
})