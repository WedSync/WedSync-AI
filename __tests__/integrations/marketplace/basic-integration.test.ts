import { describe, test, expect } from 'vitest'
import { VendorCRMSyncManager } from '@/lib/integrations/marketplace/vendor-crm-sync-manager'
import { SocialMediaConnector } from '@/lib/integrations/marketplace/social-media-connector'
import { IntegrationHealthMonitor } from '@/lib/integrations/marketplace/integration-health-monitor'

describe('Marketplace Integration - Basic Functionality', () => {
  test('VendorCRMSyncManager can be instantiated', () => {
    const crmManager = new VendorCRMSyncManager()
    expect(crmManager).toBeDefined()
    expect(typeof crmManager.connectCRMPlatform).toBe('function')
    expect(typeof crmManager.syncCRMData).toBe('function')
    expect(typeof crmManager.importClients).toBe('function')
  })

  test('SocialMediaConnector can be instantiated', () => {
    const socialConnector = new SocialMediaConnector()
    expect(socialConnector).toBeDefined()
    expect(typeof socialConnector.connectSocialPlatform).toBe('function')
    expect(typeof socialConnector.postContent).toBe('function')
    expect(typeof socialConnector.schedulePost).toBe('function')
  })

  test('IntegrationHealthMonitor can be instantiated', () => {
    const healthMonitor = new IntegrationHealthMonitor()
    expect(healthMonitor).toBeDefined()
    expect(typeof healthMonitor.getOverallHealth).toBe('function')
    expect(typeof healthMonitor.runDiagnostics).toBe('function')
    expect(typeof healthMonitor.attemptAutoRepair).toBe('function')
  })

  test('VendorCRMSyncManager - getAvailablePlatforms returns expected platforms', async () => {
    const crmManager = new VendorCRMSyncManager()
    const platforms = await crmManager.getAvailablePlatforms()
    
    expect(platforms).toHaveLength(3)
    expect(platforms.map(p => p.id)).toEqual(['honeybook', 'tave', 'lightblue'])
  })

  test('SocialMediaConnector - getSupportedPlatforms returns expected platforms', async () => {
    const socialConnector = new SocialMediaConnector()
    const platforms = await socialConnector.getSupportedPlatforms()
    
    expect(platforms).toHaveLength(3)
    expect(platforms.map(p => p.id)).toEqual(['instagram', 'facebook', 'pinterest'])
  })

  test('VendorCRMSyncManager - connectCRMPlatform returns success response', async () => {
    const crmManager = new VendorCRMSyncManager()
    const result = await crmManager.connectCRMPlatform('honeybook', 'vendor-123')
    
    expect(result.success).toBe(true)
    expect(result.platform).toBe('honeybook')
    expect(result.connectionId).toBeDefined()
    expect(result.message).toContain('Successfully connected')
  })

  test('SocialMediaConnector - connectSocialPlatform returns success response', async () => {
    const socialConnector = new SocialMediaConnector()
    const result = await socialConnector.connectSocialPlatform('instagram', 'vendor-123')
    
    expect(result.success).toBe(true)
    expect(result.platform).toBe('instagram')
    expect(result.connectionId).toBeDefined()
    expect(result.message).toContain('Successfully connected')
  })
})