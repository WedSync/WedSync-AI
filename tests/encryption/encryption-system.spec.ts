/**
 * WedSync P0 Security: Encryption System Tests
 * 
 * SECURITY LEVEL: P0 - CRITICAL
 * PURPOSE: Comprehensive testing of AES-256-GCM encryption system
 * 
 * @description End-to-end tests for field-level encryption with Playwright
 * @version 2.0.0
 */

import { test, expect } from '@playwright/test'
import { randomBytes } from 'crypto'

// Test configuration
const TEST_TIMEOUT = 30000 // 30 seconds for encryption operations
const PERFORMANCE_THRESHOLD_MS = 100 // Max 100ms latency requirement

test.describe('P0 Security: Wedding Data Encryption System', () => {
  test.setTimeout(TEST_TIMEOUT)

  test.beforeEach(async ({ page }) => {
    // Navigate to test environment
    await page.goto('http://localhost:3000')
    
    // Login with test credentials
    await page.fill('[data-testid="email-input"]', 'test@wedsync.com')
    await page.fill('[data-testid="password-input"]', 'TestPassword123!')
    await page.click('[data-testid="login-button"]')
    
    // Wait for dashboard
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 })
  })

  test('Field-level encryption for celebrity data', async ({ page }) => {
    // Test data for celebrity couple
    const celebrityData = {
      guestName: 'Brad Pitt',
      email: 'brad@celebrity.com',
      phone: '+1-310-555-0001',
      address: '123 Beverly Hills, CA 90210',
      securityDetails: 'VIP Protection Level 5'
    }

    // Navigate to encryption test page
    await page.goto('http://localhost:3000/api/test/encryption')

    // Test encryption via API
    const encryptionResponse = await page.evaluate(async (data) => {
      const response = await fetch('/api/test/encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.json()
    }, celebrityData)

    // Verify encryption succeeded
    expect(encryptionResponse.success).toBe(true)
    expect(encryptionResponse.tenantId).toBeTruthy()
    
    // Verify data is encrypted (not plaintext)
    expect(encryptionResponse.stored).not.toContain('Brad Pitt')
    expect(encryptionResponse.stored).not.toContain('brad@celebrity.com')
    expect(encryptionResponse.stored).not.toContain('+1-310-555-0001')
    
    // Verify encryption metadata
    expect(encryptionResponse.metadata.algorithm).toBe('aes-256-gcm')
    expect(encryptionResponse.metadata.version).toBe(2)
    expect(encryptionResponse.metadata.keyId).toBeTruthy()
    
    // Verify encrypted format (Base64-like)
    expect(encryptionResponse.encrypted.guestName).toMatch(/^[A-Za-z0-9+/]+/)
    expect(encryptionResponse.encrypted.email).toMatch(/^[A-Za-z0-9+/]+/)
    expect(encryptionResponse.encrypted.phone).toMatch(/^[A-Za-z0-9+/]+/)
  })

  test('Decryption with integrity verification', async ({ page }) => {
    // Test decryption endpoint
    const decryptionResponse = await page.evaluate(async () => {
      const response = await fetch('/api/test/decryption', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      return response.json()
    })

    // Verify decryption succeeded
    expect(decryptionResponse.success).toBe(true)
    expect(decryptionResponse.guestName).toBe('John Doe')
    expect(decryptionResponse.email).toBe('john@example.com')
    expect(decryptionResponse.phone).toBe('+1234567890')
    
    // Verify performance metrics
    expect(decryptionResponse.performance.compliance.withinCompliance).toBe(true)
    expect(decryptionResponse.performance.decryptionMetrics.avg).toBeLessThan(PERFORMANCE_THRESHOLD_MS)
  })

  test('File encryption for vendor contracts', async ({ page }) => {
    // Create test contract file
    const contractContent = 'Confidential Wedding Contract - $500,000 budget'
    const fileName = 'test-contract.pdf'
    
    // Create file input and upload
    await page.setInputFiles('[data-testid="file-upload"]', {
      name: fileName,
      mimeType: 'application/pdf',
      buffer: Buffer.from(contractContent)
    })

    // Test file encryption
    const fileEncryptionResponse = await page.evaluate(async () => {
      const fileInput = document.querySelector('[data-testid="file-upload"]') as HTMLInputElement
      const file = fileInput?.files?.[0]
      
      if (!file) throw new Error('No file found')
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/test/file-encryption', {
        method: 'POST',
        body: formData
      })
      return response.json()
    })

    // Verify file encryption
    expect(fileEncryptionResponse.success).toBe(true)
    expect(fileEncryptionResponse.encrypted).toBe(true)
    expect(fileEncryptionResponse.metadata.originalName).toBe(fileName)
    expect(fileEncryptionResponse.metadata.mimeType).toBe('application/pdf')
    
    // Verify encrypted content doesn't contain plaintext
    expect(fileEncryptionResponse.encryptedData).not.toContain('Confidential Wedding Contract')
    expect(fileEncryptionResponse.encryptedData).not.toContain('500,000')
  })

  test('Bulk encryption for guest list', async ({ page }) => {
    // Large guest list for performance testing
    const guestList = Array.from({ length: 100 }, (_, i) => ({
      id: `guest-${i}`,
      data: {
        fullName: `Guest ${i}`,
        email: `guest${i}@example.com`,
        phone: `+1-555-${String(i).padStart(4, '0')}`,
        address: `${i} Main St, City, State`,
        dietaryRestrictions: `Restriction ${i}`,
        tableNumber: Math.floor(i / 10) + 1
      }
    }))

    const startTime = Date.now()
    
    // Test bulk encryption
    const bulkResponse = await page.evaluate(async (guests) => {
      const response = await fetch('/api/test/bulk-encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guests })
      })
      return response.json()
    }, guestList)

    const encryptionTime = Date.now() - startTime

    // Verify bulk encryption succeeded
    expect(bulkResponse.success).toBe(true)
    expect(bulkResponse.encrypted.length).toBe(100)
    
    // Verify performance (should handle 100 records quickly)
    expect(encryptionTime).toBeLessThan(10000) // Under 10 seconds for 100 records
    
    // Verify each guest is encrypted
    bulkResponse.encrypted.forEach((guest: any, index: number) => {
      expect(guest.id).toBe(`guest-${index}`)
      expect(guest.data.fullName.encrypted).toBeTruthy()
      expect(guest.data.email.encrypted).toBeTruthy()
      expect(guest.data.phone.encrypted).toBeTruthy()
    })
  })

  test('Key rotation without data loss', async ({ page }) => {
    // First, encrypt some data
    const testData = {
      venueName: 'Secret Wedding Location',
      securityCode: 'ULTRA-SECRET-123',
      accessInstructions: 'Enter through north gate'
    }

    // Encrypt with current key
    const encryptResponse = await page.evaluate(async (data) => {
      const response = await fetch('/api/test/venue-encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.json()
    }, testData)

    expect(encryptResponse.success).toBe(true)
    const originalKeyId = encryptResponse.keyId

    // Trigger key rotation
    const rotationResponse = await page.evaluate(async () => {
      const response = await fetch('/api/test/key-rotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      return response.json()
    })

    expect(rotationResponse.success).toBe(true)
    expect(rotationResponse.newKeyId).not.toBe(originalKeyId)

    // Verify data can still be decrypted after rotation
    const decryptAfterRotation = await page.evaluate(async () => {
      const response = await fetch('/api/test/venue-decryption', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      return response.json()
    })

    expect(decryptAfterRotation.success).toBe(true)
    expect(decryptAfterRotation.venueName).toBe('Secret Wedding Location')
    expect(decryptAfterRotation.securityCode).toBe('ULTRA-SECRET-123')
    expect(decryptAfterRotation.accessInstructions).toBe('Enter through north gate')
  })

  test('Encryption middleware integration', async ({ page }) => {
    // Test that middleware automatically encrypts sensitive routes
    await page.goto('http://localhost:3000/clients')
    
    // Add new client with sensitive data
    await page.click('[data-testid="add-client-button"]')
    await page.fill('[data-testid="client-name"]', 'Tom Cruise')
    await page.fill('[data-testid="client-email"]', 'tom@celebrity.com')
    await page.fill('[data-testid="client-phone"]', '+1-310-555-0002')
    await page.fill('[data-testid="client-budget"]', '5000000')
    await page.click('[data-testid="save-client-button"]')

    // Intercept network request to verify encryption
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/clients')),
      page.click('[data-testid="save-client-button"]')
    ])

    const requestData = request.postDataJSON()
    
    // Verify data is encrypted in transit
    expect(requestData.fullName).toHaveProperty('encrypted')
    expect(requestData.fullName).toHaveProperty('metadata')
    expect(requestData.email).toHaveProperty('encrypted')
    expect(requestData.phone).toHaveProperty('encrypted')
    
    // Verify plaintext is not sent
    expect(JSON.stringify(requestData)).not.toContain('Tom Cruise')
    expect(JSON.stringify(requestData)).not.toContain('tom@celebrity.com')
  })

  test('Encryption audit logging', async ({ page }) => {
    // Perform encryption operation
    await page.evaluate(async () => {
      const response = await fetch('/api/test/encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: 'Audit Test User',
          email: 'audit@test.com',
          phone: '+1-555-AUDIT'
        })
      })
      return response.json()
    })

    // Check audit logs
    const auditLogs = await page.evaluate(async () => {
      const response = await fetch('/api/test/audit-logs', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      return response.json()
    })

    // Verify audit log entry exists
    expect(auditLogs.logs).toContainEqual(
      expect.objectContaining({
        operation: 'encrypt',
        success: true,
        field_path: expect.stringContaining('guestName')
      })
    )
  })

  test('Zero-knowledge architecture verification', async ({ page }) => {
    // Test that server cannot access plaintext after encryption
    const encryptResponse = await page.evaluate(async () => {
      const response = await fetch('/api/test/zero-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretData: 'Ultra Confidential Wedding Plans'
        })
      })
      return response.json()
    })

    // Verify server response doesn't contain plaintext
    expect(encryptResponse.serverKnowledge).toBe('encrypted_data_only')
    expect(encryptResponse.canAccessPlaintext).toBe(false)
    expect(JSON.stringify(encryptResponse)).not.toContain('Ultra Confidential Wedding Plans')
  })

  test('Performance benchmarks under load', async ({ page }) => {
    const operations = 1000
    const results: number[] = []

    // Run encryption operations
    for (let i = 0; i < operations; i++) {
      const startTime = Date.now()
      
      await page.evaluate(async (index) => {
        const response = await fetch('/api/test/encryption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestName: `Performance Test ${index}`,
            email: `perf${index}@test.com`,
            phone: `+1-555-${index}`
          })
        })
        return response.json()
      }, i)

      results.push(Date.now() - startTime)
    }

    // Calculate statistics
    const avgLatency = results.reduce((a, b) => a + b, 0) / results.length
    const maxLatency = Math.max(...results)
    const p95Latency = results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)]

    // Verify performance requirements
    expect(avgLatency).toBeLessThan(PERFORMANCE_THRESHOLD_MS)
    expect(p95Latency).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 1.5) // Allow 50% overhead for p95
    expect(maxLatency).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 2) // Allow 2x for worst case
    
    console.log(`Performance Results:
      Average: ${avgLatency.toFixed(2)}ms
      P95: ${p95Latency.toFixed(2)}ms  
      Max: ${maxLatency.toFixed(2)}ms
      Operations: ${operations}`)
  })
})

test.describe('Security Compliance Tests', () => {
  test('OWASP encryption standards compliance', async ({ page }) => {
    const complianceCheck = await page.evaluate(async () => {
      const response = await fetch('/api/test/compliance-check', {
        method: 'GET'
      })
      return response.json()
    })

    // Verify OWASP compliance
    expect(complianceCheck.algorithm).toBe('aes-256-gcm')
    expect(complianceCheck.keyLength).toBe(256)
    expect(complianceCheck.ivLength).toBe(128)
    expect(complianceCheck.tagLength).toBe(128)
    expect(complianceCheck.saltLength).toBeGreaterThanOrEqual(256)
    expect(complianceCheck.keyDerivation).toBe('scrypt')
    expect(complianceCheck.owaspCompliant).toBe(true)
  })

  test('GDPR/CCPA data protection compliance', async ({ page }) => {
    const gdprCheck = await page.evaluate(async () => {
      const response = await fetch('/api/test/gdpr-compliance', {
        method: 'GET'
      })
      return response.json()
    })

    // Verify GDPR/CCPA compliance features
    expect(gdprCheck.encryptionAtRest).toBe(true)
    expect(gdprCheck.encryptionInTransit).toBe(true)
    expect(gdprCheck.rightToErasure).toBe(true)
    expect(gdprCheck.dataPortability).toBe(true)
    expect(gdprCheck.auditLogging).toBe(true)
    expect(gdprCheck.keyRotation).toBe(true)
    expect(gdprCheck.complianceStatus).toBe('compliant')
  })
})