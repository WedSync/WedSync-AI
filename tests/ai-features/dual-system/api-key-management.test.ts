/**
 * WS-239 API Key Management Testing
 * Security testing for encrypted storage, validation, and rotation of client AI keys
 * Critical for maintaining vendor trust and secure AI integrations
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { APIKeyManager } from '@/lib/ai/api-key-manager'
import { EncryptionService } from '@/lib/security/encryption-service'
import { KeyRotationScheduler } from '@/lib/ai/key-rotation-scheduler'
import { SecurityAuditLogger } from '@/lib/security/audit-logger'
import { createMockWeddingVendor } from '../../setup'

// Mock encryption service
const mockEncryptionService = {
  encrypt: vi.fn().mockImplementation((data) => `encrypted_${data}`),
  decrypt: vi.fn().mockImplementation((data) => data.replace('encrypted_', '')),
  generateKeyHash: vi.fn().mockImplementation((key) => `hash_${key.slice(-8)}`),
  validateEncryption: vi.fn().mockResolvedValue(true)
}

// Mock external AI provider validation
const mockOpenAIValidator = {
  validateKey: vi.fn().mockResolvedValue({ 
    valid: true, 
    credits: 150.0, 
    usage: { requests: 1200, tokens: 45000 } 
  }),
  testConnection: vi.fn().mockResolvedValue(true),
  getUsageLimits: vi.fn().mockResolvedValue({ 
    dailyLimit: 10000, 
    monthlyLimit: 300000 
  })
}

const mockDatabase = {
  storeEncryptedKey: vi.fn(),
  retrieveEncryptedKey: vi.fn(),
  updateKeyMetadata: vi.fn(),
  deleteKey: vi.fn(),
  logKeyOperation: vi.fn(),
  getKeyHistory: vi.fn()
}

const mockAuditLogger = {
  logKeyValidation: vi.fn(),
  logKeyRotation: vi.fn(),
  logKeyFailure: vi.fn(),
  logSecurityEvent: vi.fn()
}

describe('API Key Management Testing - WS-239', () => {
  let apiKeyManager: APIKeyManager
  let encryptionService: EncryptionService
  let rotationScheduler: KeyRotationScheduler
  let auditLogger: SecurityAuditLogger
  let photographyStudio: any
  let venueCoordinator: any

  beforeEach(() => {
    vi.clearAllMocks()

    photographyStudio = createMockWeddingVendor({
      id: 'photography-secure-shots-001',
      service_type: 'photographer',
      subscription_tier: 'professional',
      security_tier: 'high',
      compliance_requirements: ['GDPR', 'ISO27001']
    })

    venueCoordinator = createMockWeddingVendor({
      id: 'venue-premium-events-002',
      service_type: 'venue',
      subscription_tier: 'enterprise',
      security_tier: 'enterprise',
      compliance_requirements: ['GDPR', 'SOC2', 'PCI-DSS']
    })

    encryptionService = mockEncryptionService as any
    auditLogger = mockAuditLogger as any
    rotationScheduler = new KeyRotationScheduler(mockDatabase, auditLogger)
    apiKeyManager = new APIKeyManager(
      encryptionService,
      mockOpenAIValidator,
      mockDatabase,
      auditLogger
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('API Key Storage and Encryption', () => {
    test('should encrypt and store client API keys securely', async () => {
      const clientApiKey = 'sk-test-1234567890abcdef1234567890abcdef'

      const storeResult = await apiKeyManager.storeClientKey({
        supplierId: photographyStudio.id,
        apiKey: clientApiKey,
        provider: 'openai',
        keyName: 'Photography Studio Primary Key'
      })

      expect(storeResult.success).toBe(true)
      expect(storeResult.keyId).toBeDefined()
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(clientApiKey)
      expect(mockDatabase.storeEncryptedKey).toHaveBeenCalledWith({
        supplierId: photographyStudio.id,
        encryptedKey: `encrypted_${clientApiKey}`,
        keyHash: `hash_${clientApiKey.slice(-8)}`,
        provider: 'openai',
        keyName: 'Photography Studio Primary Key',
        createdAt: expect.any(Date),
        lastValidated: expect.any(Date)
      })

      // Verify audit logging
      expect(mockAuditLogger.logKeyValidation).toHaveBeenCalledWith({
        supplierId: photographyStudio.id,
        action: 'key_stored',
        provider: 'openai',
        success: true,
        keyHash: `hash_${clientApiKey.slice(-8)}`
      })
    })

    test('should never store unencrypted keys in database', async () => {
      const plainKey = 'sk-plaintext-key-should-never-be-stored'

      await apiKeyManager.storeClientKey({
        supplierId: photographyStudio.id,
        apiKey: plainKey,
        provider: 'openai'
      })

      // Verify encryption was called
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(plainKey)
      
      // Verify no plain text stored
      const storedData = mockDatabase.storeEncryptedKey.mock.calls[0][0]
      expect(storedData.encryptedKey).not.toBe(plainKey)
      expect(storedData.encryptedKey).toBe(`encrypted_${plainKey}`)
      expect(storedData).not.toHaveProperty('plainKey')
    })

    test('should retrieve and decrypt keys securely for authorized operations', async () => {
      const encryptedKey = 'encrypted_sk-test-authorized-key-123'
      mockDatabase.retrieveEncryptedKey.mockResolvedValueOnce({
        encryptedKey,
        keyHash: 'hash_ed-key-123',
        provider: 'openai',
        supplierId: photographyStudio.id
      })

      const retrievedKey = await apiKeyManager.getClientKey({
        supplierId: photographyStudio.id,
        purpose: 'ai_request',
        requestContext: {
          requestType: 'photo_tagging',
          urgency: 'normal'
        }
      })

      expect(retrievedKey.success).toBe(true)
      expect(retrievedKey.apiKey).toBe('sk-test-authorized-key-123')
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(encryptedKey)
      expect(mockAuditLogger.logKeyValidation).toHaveBeenCalledWith({
        supplierId: photographyStudio.id,
        action: 'key_retrieved',
        purpose: 'ai_request',
        success: true
      })
    })

    test('should implement secure key deletion with audit trail', async () => {
      const deleteResult = await apiKeyManager.deleteClientKey({
        supplierId: photographyStudio.id,
        keyId: 'key-id-to-delete',
        reason: 'user_requested',
        confirmedBy: 'supplier_admin'
      })

      expect(deleteResult.success).toBe(true)
      expect(mockDatabase.deleteKey).toHaveBeenCalledWith('key-id-to-delete')
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
        supplierId: photographyStudio.id,
        action: 'key_deleted',
        reason: 'user_requested',
        confirmedBy: 'supplier_admin',
        timestamp: expect.any(Date)
      })
    })
  })

  describe('API Key Validation and Health Checks', () => {
    test('should validate client API keys before first use', async () => {
      const newApiKey = 'sk-test-validation-key-123456789'

      const validationResult = await apiKeyManager.validateNewKey({
        apiKey: newApiKey,
        provider: 'openai',
        supplierId: photographyStudio.id
      })

      expect(validationResult.valid).toBe(true)
      expect(validationResult.credits).toBe(150.0)
      expect(validationResult.usage).toMatchObject({
        requests: 1200,
        tokens: 45000
      })
      expect(mockOpenAIValidator.validateKey).toHaveBeenCalledWith(newApiKey)
      expect(mockOpenAIValidator.testConnection).toHaveBeenCalledWith(newApiKey)
    })

    test('should detect and handle invalid API keys gracefully', async () => {
      const invalidKey = 'sk-invalid-key-format'
      mockOpenAIValidator.validateKey.mockResolvedValueOnce({
        valid: false,
        error: 'Invalid API key format',
        errorCode: 'INVALID_FORMAT'
      })

      const validationResult = await apiKeyManager.validateNewKey({
        apiKey: invalidKey,
        provider: 'openai',
        supplierId: photographyStudio.id
      })

      expect(validationResult.valid).toBe(false)
      expect(validationResult.error).toBe('Invalid API key format')
      expect(mockAuditLogger.logKeyFailure).toHaveBeenCalledWith({
        supplierId: photographyStudio.id,
        action: 'validation_failed',
        error: 'Invalid API key format',
        errorCode: 'INVALID_FORMAT'
      })
    })

    test('should perform periodic health checks on stored keys', async () => {
      mockDatabase.retrieveEncryptedKey.mockResolvedValueOnce({
        encryptedKey: 'encrypted_sk-health-check-key',
        supplierId: photographyStudio.id,
        lastHealthCheck: new Date(Date.now() - 86400000) // 24 hours ago
      })

      const healthCheckResult = await apiKeyManager.performHealthCheck({
        supplierId: photographyStudio.id,
        forceCheck: false
      })

      expect(healthCheckResult.healthy).toBe(true)
      expect(healthCheckResult.lastChecked).toBeInstanceOf(Date)
      expect(mockOpenAIValidator.validateKey).toHaveBeenCalled()
      expect(mockDatabase.updateKeyMetadata).toHaveBeenCalledWith(
        photographyStudio.id,
        {
          lastHealthCheck: expect.any(Date),
          healthStatus: 'healthy'
        }
      )
    })

    test('should handle API rate limits and usage quotas', async () => {
      mockOpenAIValidator.getUsageLimits.mockResolvedValueOnce({
        dailyLimit: 10000,
        monthlyLimit: 300000,
        currentDailyUsage: 8500, // Close to limit
        currentMonthlyUsage: 250000
      })

      const usageCheck = await apiKeyManager.checkUsageLimits({
        supplierId: photographyStudio.id,
        estimatedTokens: 2000 // Would exceed daily limit
      })

      expect(usageCheck.withinLimits).toBe(false)
      expect(usageCheck.dailyLimitExceeded).toBe(true)
      expect(usageCheck.monthlyLimitExceeded).toBe(false)
      expect(usageCheck.recommendedAction).toBe('wait_for_reset')
      expect(usageCheck.resetTime).toBeDefined()
    })
  })

  describe('Key Rotation and Security Management', () => {
    test('should rotate API keys without service interruption', async () => {
      const oldKey = 'sk-old-key-to-rotate-123'
      const newKey = 'sk-new-rotated-key-456'
      
      const rotationResult = await apiKeyManager.rotateClientKey({
        supplierId: photographyStudio.id,
        currentKey: oldKey,
        newKey: newKey,
        rotationReason: 'scheduled_rotation'
      })

      expect(rotationResult.success).toBe(true)
      expect(rotationResult.downtime).toBe(0)
      expect(rotationResult.oldKeyDeactivated).toBe(true)
      expect(rotationResult.newKeyActivated).toBe(true)
      
      // Verify graceful transition
      expect(rotationResult.transitionPeriod).toBeGreaterThan(0)
      expect(rotationResult.transitionPeriod).toBeLessThan(60000) // <60s transition
      
      expect(mockAuditLogger.logKeyRotation).toHaveBeenCalledWith({
        supplierId: photographyStudio.id,
        action: 'key_rotated',
        reason: 'scheduled_rotation',
        oldKeyHash: expect.any(String),
        newKeyHash: expect.any(String),
        downtime: 0
      })
    })

    test('should implement automated key rotation schedule', async () => {
      const rotationSchedule = await rotationScheduler.scheduleRotation({
        supplierId: photographyStudio.id,
        rotationPolicy: 'monthly',
        securityTier: 'high',
        lastRotation: new Date('2024-05-15'),
        nextRotation: new Date('2024-06-15')
      })

      expect(rotationSchedule.scheduled).toBe(true)
      expect(rotationSchedule.nextRotation).toBeInstanceOf(Date)
      expect(rotationSchedule.policy).toBe('monthly')
      expect(rotationSchedule.daysUntilRotation).toBeGreaterThan(0)
      
      // High security tier should have more frequent rotation
      expect(rotationSchedule.rotationInterval).toBeLessThan(35) // <35 days for high security
    })

    test('should handle emergency key rotation for security breaches', async () => {
      const emergencyRotation = await apiKeyManager.emergencyKeyRotation({
        supplierId: photographyStudio.id,
        securityIncident: {
          type: 'potential_key_compromise',
          severity: 'high',
          detectedAt: new Date(),
          source: 'automated_monitoring'
        }
      })

      expect(emergencyRotation.success).toBe(true)
      expect(emergencyRotation.executionTime).toBeLessThan(5000) // <5s emergency response
      expect(emergencyRotation.oldKeyRevoked).toBe(true)
      expect(emergencyRotation.newKeyGenerated).toBe(true)
      expect(emergencyRotation.incidentLogged).toBe(true)
      
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
        supplierId: photographyStudio.id,
        action: 'emergency_key_rotation',
        incident: expect.any(Object),
        responseTime: expect.any(Number)
      })
    })

    test('should validate key rotation permissions and authorization', async () => {
      const unauthorizedRotation = await apiKeyManager.rotateClientKey({
        supplierId: photographyStudio.id,
        currentKey: 'sk-test-key',
        newKey: 'sk-new-key',
        rotationReason: 'unauthorized_attempt',
        requestedBy: 'non_admin_user'
      })

      expect(unauthorizedRotation.success).toBe(false)
      expect(unauthorizedRotation.error).toBe('Insufficient permissions')
      expect(unauthorizedRotation.requiredRole).toBe('supplier_admin')
      
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
        supplierId: photographyStudio.id,
        action: 'unauthorized_rotation_attempt',
        requestedBy: 'non_admin_user',
        timestamp: expect.any(Date)
      })
    })
  })

  describe('Multi-Provider Key Management', () => {
    test('should manage keys for multiple AI providers per supplier', async () => {
      const multiProviderSetup = await apiKeyManager.setupMultiProvider({
        supplierId: venueCoordinator.id,
        providers: [
          {
            provider: 'openai',
            apiKey: 'sk-openai-key-123',
            primary: true,
            useCases: ['content_generation', 'description_writing']
          },
          {
            provider: 'anthropic',
            apiKey: 'sk-ant-key-456',
            primary: false,
            useCases: ['analysis', 'summarization']
          }
        ]
      })

      expect(multiProviderSetup.success).toBe(true)
      expect(multiProviderSetup.providersConfigured).toBe(2)
      expect(multiProviderSetup.primaryProvider).toBe('openai')
      
      // Verify each key stored separately
      expect(mockDatabase.storeEncryptedKey).toHaveBeenCalledTimes(2)
      expect(mockAuditLogger.logKeyValidation).toHaveBeenCalledTimes(2)
    })

    test('should handle provider failover with backup keys', async () => {
      // Setup primary provider failure
      mockOpenAIValidator.validateKey.mockRejectedValueOnce(new Error('API service unavailable'))

      const failoverResult = await apiKeyManager.handleProviderFailover({
        supplierId: venueCoordinator.id,
        failedProvider: 'openai',
        requestType: 'venue_description'
      })

      expect(failoverResult.failoverExecuted).toBe(true)
      expect(failoverResult.backupProvider).toBe('anthropic')
      expect(failoverResult.serviceInterruption).toBe(0)
      expect(failoverResult.fallbackKeyValid).toBe(true)
      
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
        supplierId: venueCoordinator.id,
        action: 'provider_failover',
        failedProvider: 'openai',
        backupProvider: 'anthropic',
        requestType: 'venue_description'
      })
    })
  })

  describe('Compliance and Audit Requirements', () => {
    test('should maintain GDPR-compliant key handling for EU suppliers', async () => {
      const gdprSupplier = createMockWeddingVendor({
        id: 'eu-wedding-venue-001',
        location: 'Berlin, Germany',
        gdprRequired: true,
        dataResidency: 'EU'
      })

      const gdprCompliance = await apiKeyManager.ensureGDPRCompliance({
        supplierId: gdprSupplier.id,
        apiKey: 'sk-gdpr-test-key',
        dataSubject: 'supplier_organization',
        processingBasis: 'legitimate_interest'
      })

      expect(gdprCompliance.compliant).toBe(true)
      expect(gdprCompliance.dataResidency).toBe('EU')
      expect(gdprCompliance.encryptionStandard).toBe('AES-256')
      expect(gdprCompliance.auditTrailComplete).toBe(true)
      expect(gdprCompliance.rightsImplemented).toContain('right_to_erasure')
      expect(gdprCompliance.rightsImplemented).toContain('right_to_portability')
    })

    test('should generate comprehensive audit trails for enterprise clients', async () => {
      const auditTrail = await apiKeyManager.generateAuditTrail({
        supplierId: venueCoordinator.id, // Enterprise tier
        dateRange: {
          start: new Date('2024-06-01'),
          end: new Date('2024-06-30')
        },
        includeOperations: ['key_storage', 'key_rotation', 'key_validation', 'key_usage']
      })

      expect(auditTrail.totalOperations).toBeGreaterThan(0)
      expect(auditTrail.operations).toBeInstanceOf(Array)
      expect(auditTrail.securityEvents).toBeInstanceOf(Array)
      expect(auditTrail.complianceStatus).toBe('compliant')
      
      // Verify audit trail completeness
      auditTrail.operations.forEach(operation => {
        expect(operation).toMatchObject({
          timestamp: expect.any(Date),
          operation: expect.any(String),
          supplierId: venueCoordinator.id,
          success: expect.any(Boolean),
          hash: expect.any(String) // Immutable audit hash
        })
      })
    })

    test('should implement key access logging for security monitoring', async () => {
      // Simulate key access for AI request
      await apiKeyManager.getClientKey({
        supplierId: photographyStudio.id,
        purpose: 'photo_processing',
        requestContext: {
          requestId: 'req-photo-batch-001',
          userAgent: 'WedSync-Mobile/2.1.0',
          ipAddress: '192.168.1.100'
        }
      })

      expect(mockAuditLogger.logKeyValidation).toHaveBeenCalledWith({
        supplierId: photographyStudio.id,
        action: 'key_retrieved',
        purpose: 'photo_processing',
        success: true,
        context: {
          requestId: 'req-photo-batch-001',
          userAgent: 'WedSync-Mobile/2.1.0',
          ipAddress: '192.168.1.100'
        }
      })
    })
  })

  describe('Performance and Scalability', () => {
    test('should handle concurrent key operations without conflicts', async () => {
      // Simulate concurrent key operations
      const concurrentOperations = [
        apiKeyManager.validateNewKey({ 
          apiKey: 'sk-concurrent-1', 
          provider: 'openai', 
          supplierId: 'supplier-1' 
        }),
        apiKeyManager.validateNewKey({ 
          apiKey: 'sk-concurrent-2', 
          provider: 'openai', 
          supplierId: 'supplier-2' 
        }),
        apiKeyManager.rotateClientKey({ 
          supplierId: 'supplier-3', 
          currentKey: 'sk-old', 
          newKey: 'sk-new-3' 
        }),
        apiKeyManager.performHealthCheck({ 
          supplierId: 'supplier-4' 
        })
      ]

      const results = await Promise.all(concurrentOperations)
      
      expect(results).toHaveLength(4)
      results.forEach(result => {
        expect(result.success || result.valid || result.healthy).toBe(true)
      })
    })

    test('should maintain performance under high key validation load', async () => {
      const startTime = Date.now()
      
      // Perform 50 concurrent validations
      const validations = Array.from({ length: 50 }, (_, i) =>
        apiKeyManager.validateNewKey({
          apiKey: `sk-load-test-${i}`,
          provider: 'openai',
          supplierId: `load-supplier-${i}`
        })
      )

      const results = await Promise.all(validations)
      const endTime = Date.now()
      const totalTime = endTime - startTime
      const avgTime = totalTime / 50

      expect(results).toHaveLength(50)
      expect(avgTime).toBeLessThan(100) // <100ms average per validation
      expect(totalTime).toBeLessThan(5000) // <5s total for 50 validations
      
      // Verify all validations succeeded
      results.forEach(result => {
        expect(result.valid).toBe(true)
      })
    })
  })
})