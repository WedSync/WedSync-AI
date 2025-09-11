/**
 * WedSync WS-148 Round 3: Enterprise Security Validation Tests
 * 
 * SECURITY LEVEL: P0 - CRITICAL ENTERPRISE VALIDATION
 * PURPOSE: Comprehensive testing of enterprise security features
 * COMPLIANCE: SOC 2 Type II, ISO 27001, FIPS 140-2 Level 3
 * 
 * @description Enterprise security validation tests for Team D - Batch 12 - Round 3
 * @version 3.0.0
 * @author Team D - Senior Dev
 */

import { test, expect, Page } from '@playwright/test'

// Test configuration for enterprise scenarios
const ENTERPRISE_TEST_CONFIG = {
  BULK_ENCRYPTION_ITEMS: 500,
  DISASTER_RECOVERY_TIMEOUT: 60000, // 1 minute
  HIGH_PRIORITY_TIMEOUT: 3000, // 3 seconds
  AUDIT_COMPLETENESS_THRESHOLD: 100, // 100% audit coverage required
  QUANTUM_RESISTANT_ALGORITHMS: ['Kyber1024', 'Dilithium5', 'SPHINCS+'],
  COMPLIANCE_FRAMEWORKS: ['SOC2', 'ISO27001', 'FIPS140-2']
}

/**
 * Test Suite: SOC 2 Type II Compliance Validation
 * Verifies complete audit trail and compliance requirements
 */
test.describe('SOC 2 Type II Compliance Validation', () => {
  
  test('SOC 2 audit trail completeness', async ({ page }) => {
    // Navigate to enterprise security test environment
    await page.goto('/enterprise/security-test')
    
    // Simulate comprehensive business operations with audit requirements
    const operations = [
      { action: 'create_client', sensitive: true, classification: 'confidential' },
      { action: 'upload_contract', sensitive: true, classification: 'confidential' },
      { action: 'encrypt_photos', sensitive: true, classification: 'secret' },
      { action: 'rotate_keys', sensitive: false, classification: 'standard' },
      { action: 'export_data', sensitive: true, classification: 'confidential' },
      { action: 'delete_client_gdpr', sensitive: true, classification: 'confidential' }
    ]
    
    console.log('🔐 Testing SOC 2 compliance with comprehensive audit trail...')
    
    for (const operation of operations) {
      await test.step(`Performing ${operation.action}`, async () => {
        await page.click(`[data-testid="${operation.action}-button"]`)
        await page.waitForSelector(`[data-testid="${operation.action}-complete"]`, { 
          timeout: 10000 
        })
        
        // Verify immediate audit log creation
        const auditCreated = await page.isVisible(`[data-testid="${operation.action}-audit-logged"]`)
        expect(auditCreated).toBe(true)
      })
    }
    
    // Verify comprehensive audit trail
    await test.step('Verifying audit trail completeness', async () => {
      const auditVerification = await page.evaluate(async () => {
        const response = await fetch('/api/enterprise/compliance/audit-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verification_type: 'soc2_completeness',
            time_range: { hours: 1 },
            compliance_level: 'enterprise'
          })
        })
        return response.json()
      })
      
      // SOC 2 requires complete audit trail with zero gaps
      expect(auditVerification.all_operations_logged).toBe(true)
      expect(auditVerification.missing_audit_records).toHaveLength(0)
      expect(auditVerification.integrity_verified).toBe(true)
      expect(auditVerification.completeness_percentage).toBe(100)
      
      // Verify audit record quality and required fields
      expect(auditVerification.audit_records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            audit_id: expect.any(String),
            user_id: expect.any(String),
            organization_id: expect.any(String),
            operation_performed: expect.any(String),
            audit_event_type: expect.any(String),
            timestamp: expect.any(String),
            source_ip: expect.any(String),
            success_status: expect.any(Boolean),
            data_classification: expect.any(String),
            risk_score: expect.any(Number),
            compliance_level: expect.any(String)
          })
        ])
      )
      
      // Verify Merkle tree integrity
      expect(auditVerification.merkle_tree_verified).toBe(true)
      expect(auditVerification.digital_signature_valid).toBe(true)
    })
    
    console.log('✅ SOC 2 audit trail completeness validation passed')
  })

  test('ISO 27001 access control validation', async ({ page }) => {
    // Setup different user roles and clearance levels for testing
    const testUsers = [
      { 
        role: 'admin', 
        clearance: 5, 
        email: 'admin@enterprise-test.com',
        shouldAccess: ['standard', 'high', 'top_secret'] 
      },
      { 
        role: 'security_officer', 
        clearance: 3, 
        email: 'security@enterprise-test.com',
        shouldAccess: ['standard', 'high'] 
      },
      { 
        role: 'user', 
        clearance: 1, 
        email: 'user@enterprise-test.com',
        shouldAccess: ['standard'] 
      }
    ]
    
    console.log('🔐 Testing ISO 27001 access control matrix...')
    
    for (const user of testUsers) {
      await test.step(`Testing access controls for ${user.role}`, async () => {
        // Login as specific user
        await page.goto('/auth/login')
        await page.fill('[data-testid="username"]', user.email)
        await page.fill('[data-testid="password"]', 'EnterpriseTest123!')
        await page.click('[data-testid="login"]')
        
        await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 })
        await page.goto('/enterprise/access-control-test')
        
        // Test access to different classification levels
        for (const classification of ['standard', 'high', 'top_secret']) {
          await page.click(`[data-testid="access-${classification}-data"]`)
          
          const shouldHaveAccess = user.shouldAccess.includes(classification)
          
          if (shouldHaveAccess) {
            await page.waitForSelector('[data-testid="access-granted"]', { timeout: 5000 })
            const accessGranted = await page.isVisible('[data-testid="access-granted"]')
            expect(accessGranted).toBe(true)
            
            // Verify audit log for successful access
            const auditLogged = await page.isVisible('[data-testid="access-audit-logged"]')
            expect(auditLogged).toBe(true)
          } else {
            await page.waitForSelector('[data-testid="access-denied"]', { timeout: 5000 })
            const accessDenied = await page.isVisible('[data-testid="access-denied"]')
            expect(accessDenied).toBe(true)
            
            // Verify audit log for denied access (security event)
            const securityEventLogged = await page.isVisible('[data-testid="security-event-logged"]')
            expect(securityEventLogged).toBe(true)
          }
          
          // Clear any modal/alert
          await page.keyboard.press('Escape')
        }
        
        // Logout for next user
        await page.click('[data-testid="logout"]')
        await page.waitForSelector('[data-testid="login-form"]', { timeout: 5000 })
      })
    }
    
    console.log('✅ ISO 27001 access control validation passed')
  })
})

/**
 * Test Suite: Quantum-Resistant Cryptography Validation
 * Verifies post-quantum cryptography implementation
 */
test.describe('Quantum-Resistant Cryptography Validation', () => {
  
  test('Quantum-resistant cryptography validation', async ({ page }) => {
    // Enable post-quantum cryptography mode
    await page.goto('/enterprise/quantum-security-test')
    
    console.log('🔮 Testing quantum-resistant cryptography implementation...')
    
    await test.step('Enabling post-quantum crypto mode', async () => {
      await page.click('[data-testid="enable-pq-crypto"]')
      await page.waitForSelector('[data-testid="pq-crypto-enabled"]', { timeout: 10000 })
      
      const pqEnabled = await page.isVisible('[data-testid="pq-crypto-enabled"]')
      expect(pqEnabled).toBe(true)
    })
    
    await test.step('Testing hybrid encryption with quantum resistance', async () => {
      // Create test data with quantum-resistant encryption
      await page.fill('[data-testid="test-data"]', 'Top Secret Wedding Contract - Celebrity Client - Quantum Protected')
      await page.selectOption('[data-testid="crypto-mode"]', 'hybrid-pq')
      await page.selectOption('[data-testid="classification-level"]', 'top_secret')
      await page.click('[data-testid="encrypt-data"]')
      
      await page.waitForSelector('[data-testid="encryption-complete"]', { timeout: 15000 })
      
      // Verify quantum-resistant algorithms were used
      const encryptionDetails = await page.evaluate(async () => {
        const response = await fetch('/api/enterprise/debug/encryption-details', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        return response.json()
      })
      
      // Verify all required quantum-resistant algorithms
      for (const algorithm of ENTERPRISE_TEST_CONFIG.QUANTUM_RESISTANT_ALGORITHMS) {
        expect(encryptionDetails.algorithms_used).toContain(algorithm)
      }
      
      expect(encryptionDetails.quantum_resistant).toBe(true)
      expect(encryptionDetails.classical_fallback_available).toBe(true)
      expect(encryptionDetails.hybrid_encryption).toBe(true)
      expect(encryptionDetails.algorithm_suite).toBe('Hybrid-RSA4096-Kyber1024-AES256')
    })
    
    await test.step('Testing quantum-resistant signature verification', async () => {
      // Test hybrid digital signatures
      await page.click('[data-testid="test-hybrid-signatures"]')
      await page.waitForSelector('[data-testid="signature-test-complete"]', { timeout: 10000 })
      
      const signatureDetails = await page.evaluate(async () => {
        const response = await fetch('/api/enterprise/debug/signature-details', {
          method: 'GET'
        })
        return response.json()
      })
      
      expect(signatureDetails.classical_signature_valid).toBe(true)
      expect(signatureDetails.pq_signature_valid).toBe(true)
      expect(signatureDetails.backup_pq_signature_valid).toBe(true)
      expect(signatureDetails.quantum_safe_verified).toBe(true)
      expect(signatureDetails.signature_suite).toBe('Hybrid-RSAPSS-Dilithium5-SPHINCS')
    })
    
    await test.step('Testing decryption with quantum resistance', async () => {
      // Test decryption still works with quantum-resistant encryption
      await page.click('[data-testid="decrypt-data"]')
      await page.waitForSelector('[data-testid="decryption-complete"]', { timeout: 10000 })
      
      const decryptedText = await page.textContent('[data-testid="decrypted-result"]')
      expect(decryptedText).toBe('Top Secret Wedding Contract - Celebrity Client - Quantum Protected')
      
      // Verify decryption used post-quantum path
      const decryptionPath = await page.getAttribute('[data-testid="decryption-method"]', 'data-method')
      expect(decryptionPath).toBe('post-quantum-primary')
    })
    
    console.log('✅ Quantum-resistant cryptography validation passed')
  })
})

/**
 * Test Suite: HSM Integration and Disaster Recovery
 * Verifies enterprise key management and zero-downtime recovery
 */
test.describe('HSM Integration and Disaster Recovery', () => {
  
  test('HSM key generation and management validation', async ({ page }) => {
    await page.goto('/enterprise/hsm-test')
    
    console.log('🔑 Testing HSM integration and key management...')
    
    await test.step('Testing HSM master key generation', async () => {
      // Generate enterprise master key in HSM
      await page.selectOption('[data-testid="key-purpose"]', 'data_encryption')
      await page.selectOption('[data-testid="compliance-level"]', 'top_secret')
      await page.fill('[data-testid="organization-id"]', 'enterprise-test-org')
      await page.click('[data-testid="generate-hsm-key"]')
      
      await page.waitForSelector('[data-testid="hsm-key-generated"]', { timeout: 15000 })
      
      const keyDetails = await page.evaluate(async () => {
        const response = await fetch('/api/enterprise/debug/hsm-key-details', {
          method: 'GET'
        })
        return response.json()
      })
      
      expect(keyDetails.key_generated_in_hsm).toBe(true)
      expect(keyDetails.key_extractable).toBe(false) // Key never leaves HSM
      expect(keyDetails.algorithm).toBe('AES-256-GCM')
      expect(keyDetails.compliance_level).toBe('top_secret')
      expect(keyDetails.access_policy).toBeDefined()
      expect(keyDetails.audit_trail_created).toBe(true)
    })
    
    await test.step('Testing HSM envelope encryption', async () => {
      // Test enterprise-grade encryption using HSM
      await page.fill('[data-testid="sensitive-data"]', 'Celebrity Wedding Guest List - Confidential')
      await page.selectOption('[data-testid="data-classification"]', 'secret')
      await page.click('[data-testid="hsm-encrypt-data"]')
      
      await page.waitForSelector('[data-testid="hsm-encryption-complete"]', { timeout: 10000 })
      
      const encryptionResult = await page.evaluate(async () => {
        const response = await fetch('/api/enterprise/debug/hsm-encryption-result', {
          method: 'GET'
        })
        return response.json()
      })
      
      expect(encryptionResult.envelope_encryption_used).toBe(true)
      expect(encryptionResult.dek_encrypted_by_hsm).toBe(true)
      expect(encryptionResult.data_encrypted_with_dek).toBe(true)
      expect(encryptionResult.dek_wiped_from_memory).toBe(true)
      expect(encryptionResult.hsm_operation_id).toBeDefined()
      expect(encryptionResult.compliance_audit_logged).toBe(true)
    })
  })
  
  test('Disaster recovery zero-downtime validation', async ({ page }) => {
    // Setup: Create organization with extensive encrypted data
    await page.evaluate(async () => {
      await fetch('/api/enterprise/debug/create-enterprise-test-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_name: 'Disaster Recovery Test Corp',
          client_count: 1000,
          encryption_level: 'enterprise',
          data_classification: 'top_secret'
        })
      })
    })
    
    await page.goto('/enterprise/disaster-recovery-test')
    
    console.log('🚨 Testing zero-downtime disaster recovery...')
    
    await test.step('Verifying normal operations before disaster', async () => {
      await page.click('[data-testid="load-encrypted-data"]')
      await page.waitForSelector('[data-testid="data-loaded"]', { timeout: 10000 })
      
      const preRecoveryCount = await page.textContent('[data-testid="loaded-records-count"]')
      expect(preRecoveryCount).toBe('1000')
      
      const dataAccessible = await page.isVisible('[data-testid="data-accessible"]')
      expect(dataAccessible).toBe(true)
    })
    
    await test.step('Simulating disaster scenario', async () => {
      // Simulate catastrophic HSM failure
      await page.click('[data-testid="simulate-disaster"]')
      await page.waitForSelector('[data-testid="disaster-simulated"]', { timeout: 5000 })
      
      const disasterStatus = await page.textContent('[data-testid="disaster-status"]')
      expect(disasterStatus).toBe('Primary HSM cluster offline')
    })
    
    await test.step('Initiating disaster recovery with key shares', async () => {
      // Use Shamir's Secret Sharing for key recovery
      const recoveryShares = [
        'share-1-enterprise-recovery-abcd1234efgh5678',
        'share-2-enterprise-recovery-ijkl9012mnop3456',
        'share-3-enterprise-recovery-qrst7890uvwx1234',
        'share-4-enterprise-recovery-yzab5678cdef9012'
      ]
      
      for (const [index, share] of recoveryShares.entries()) {
        await page.fill('[data-testid="recovery-share-input"]', share)
        await page.click('[data-testid="add-recovery-share"]')
        await page.waitForSelector(`[data-testid="share-${index + 1}-added"]`)
      }
      
      // Provide multiple authorized approvers (enterprise requirement)
      const approvers = ['admin@disaster-test.com', 'security@disaster-test.com', 'cto@disaster-test.com']
      for (const [index, approver] of approvers.entries()) {
        await page.fill('[data-testid="approver-input"]', approver)
        await page.click('[data-testid="add-approver"]')
        await page.waitForSelector(`[data-testid="approver-${index + 1}-added"]`)
      }
      
      await page.fill('[data-testid="recovery-reason"]', 'Primary HSM cluster catastrophic failure - CEO authorization')
      await page.click('[data-testid="start-disaster-recovery"]')
    })
    
    await test.step('Monitoring zero-downtime recovery process', async () => {
      // Monitor recovery progress - should maintain data access
      await page.waitForSelector('[data-testid="recovery-in-progress"]', { timeout: 5000 })
      
      // Critical: Verify data remains accessible during recovery (zero downtime)
      await page.click('[data-testid="test-data-access-during-recovery"]')
      
      const duringRecoveryAccess = await page.isVisible('[data-testid="data-accessible"]')
      expect(duringRecoveryAccess).toBe(true)
      
      const duringRecoveryCount = await page.textContent('[data-testid="accessible-records-count"]')
      expect(duringRecoveryCount).toBe('1000') // All data still accessible
      
      // Verify recovery performance metrics
      const recoveryMetrics = await page.evaluate(async () => {
        const response = await fetch('/api/enterprise/debug/recovery-metrics')
        return response.json()
      })
      
      expect(recoveryMetrics.downtime_seconds).toBe(0) // Zero downtime requirement
      expect(recoveryMetrics.data_accessibility_maintained).toBe(true)
      expect(recoveryMetrics.new_hsm_partition_ready).toBe(true)
    })
    
    await test.step('Verifying complete recovery success', async () => {
      // Wait for recovery completion
      await page.waitForSelector(
        '[data-testid="disaster-recovery-complete"]', 
        { timeout: ENTERPRISE_TEST_CONFIG.DISASTER_RECOVERY_TIMEOUT }
      )
      
      // Verify all data recovered successfully
      await page.click('[data-testid="verify-recovered-data"]')
      await page.waitForSelector('[data-testid="recovery-verification-complete"]', { timeout: 20000 })
      
      const postRecoveryCount = await page.textContent('[data-testid="recovered-records-count"]')
      expect(postRecoveryCount).toBe('1000')
      
      const recoverySuccessRate = await page.textContent('[data-testid="recovery-success-rate"]')
      expect(recoverySuccessRate).toBe('100%')
      
      const finalDowntime = await page.textContent('[data-testid="total-downtime-minutes"]')
      expect(finalDowntime).toBe('0') // Zero downtime achieved
      
      // Verify comprehensive audit trail
      const recoveryAudit = await page.evaluate(async () => {
        const response = await fetch('/api/enterprise/debug/recovery-audit-trail')
        return response.json()
      })
      
      expect(recoveryAudit.disaster_recovery_logged).toBe(true)
      expect(recoveryAudit.key_reconstruction_logged).toBe(true)
      expect(recoveryAudit.re_encryption_operations_logged).toBe(true)
      expect(recoveryAudit.new_hsm_partition_logged).toBe(true)
      expect(recoveryAudit.authorized_approvers).toEqual(expect.arrayContaining([
        'admin@disaster-test.com',
        'security@disaster-test.com', 
        'cto@disaster-test.com'
      ]))
    })
    
    console.log('✅ Zero-downtime disaster recovery validation passed')
  })
})

/**
 * Test Suite: Enterprise Performance Requirements
 * Verifies performance targets are met under enterprise load
 */
test.describe('Enterprise Performance Requirements', () => {
  
  test('Enterprise-scale encryption performance validation', async ({ page }) => {
    await page.goto('/enterprise/performance-test')
    
    console.log('⚡ Testing enterprise-scale encryption performance...')
    
    await test.step('Testing bulk encryption performance (500+ items)', async () => {
      // Setup bulk encryption test
      await page.fill('[data-testid="bulk-item-count"]', ENTERPRISE_TEST_CONFIG.BULK_ENCRYPTION_ITEMS.toString())
      await page.selectOption('[data-testid="encryption-type"]', 'enterprise-hsm')
      await page.selectOption('[data-testid="data-classification"]', 'confidential')
      
      const startTime = Date.now()
      await page.click('[data-testid="start-bulk-encryption"]')
      
      // Monitor progress
      await page.waitForSelector('[data-testid="bulk-encryption-progress"]', { timeout: 5000 })
      
      // Wait for completion (must be under 30 seconds per requirement)
      await page.waitForSelector('[data-testid="bulk-encryption-complete"]', { timeout: 35000 })
      const endTime = Date.now()
      
      const totalTime = endTime - startTime
      const performanceResults = await page.evaluate(async () => {
        const response = await fetch('/api/enterprise/debug/bulk-encryption-results')
        return response.json()
      })
      
      // Verify performance requirements
      expect(totalTime).toBeLessThan(30000) // Must be under 30 seconds
      expect(performanceResults.items_processed).toBe(ENTERPRISE_TEST_CONFIG.BULK_ENCRYPTION_ITEMS)
      expect(performanceResults.success_rate).toBeGreaterThan(0.99) // 99%+ success rate
      expect(performanceResults.average_item_time_ms).toBeLessThan(60) // Under 60ms per item
      
      console.log(`✅ Bulk encryption: ${performanceResults.items_processed} items in ${totalTime}ms`)
    })
    
    await test.step('Testing dashboard load performance (50+ clients)', async () => {
      // Test enterprise dashboard with 50+ encrypted client records
      await page.click('[data-testid="load-enterprise-dashboard"]')
      
      const dashboardStartTime = Date.now()
      await page.waitForSelector('[data-testid="dashboard-loaded"]', { timeout: 5000 })
      const dashboardLoadTime = Date.now() - dashboardStartTime
      
      // Verify dashboard performance requirement (< 2 seconds)
      expect(dashboardLoadTime).toBeLessThan(2000)
      
      const dashboardMetrics = await page.evaluate(async () => {
        const response = await fetch('/api/enterprise/debug/dashboard-performance')
        return response.json()
      })
      
      expect(dashboardMetrics.clients_loaded).toBeGreaterThanOrEqual(50)
      expect(dashboardMetrics.decryption_cache_hit_rate).toBeGreaterThan(0.8) // 80%+ cache hit
      expect(dashboardMetrics.progressive_decryption_used).toBe(true)
      
      console.log(`✅ Dashboard load: ${dashboardMetrics.clients_loaded} clients in ${dashboardLoadTime}ms`)
    })
  })
})

/**
 * Test Suite: Compliance Audit and Reporting
 * Verifies enterprise compliance reporting capabilities
 */
test.describe('Compliance Audit and Reporting', () => {
  
  test('Real-time compliance monitoring validation', async ({ page }) => {
    await page.goto('/enterprise/compliance-dashboard')
    
    console.log('📊 Testing real-time compliance monitoring...')
    
    await test.step('Verifying SOC 2 compliance metrics', async () => {
      await page.click('[data-testid="load-soc2-dashboard"]')
      await page.waitForSelector('[data-testid="soc2-metrics-loaded"]', { timeout: 10000 })
      
      const soc2Metrics = await page.evaluate(async () => {
        const response = await fetch('/api/enterprise/compliance/soc2-metrics')
        return response.json()
      })
      
      expect(soc2Metrics.audit_completeness_percentage).toBe(100)
      expect(soc2Metrics.control_effectiveness).toBeGreaterThanOrEqual(0.95)
      expect(soc2Metrics.security_incidents_resolved_within_sla).toBeGreaterThanOrEqual(0.95)
      expect(soc2Metrics.access_review_compliance).toBe(100)
      expect(soc2Metrics.encryption_coverage_percentage).toBe(100)
    })
    
    await test.step('Testing automated compliance violation detection', async () => {
      // Simulate potential compliance violation
      await page.click('[data-testid="simulate-compliance-test"]')
      await page.waitForSelector('[data-testid="compliance-test-complete"]', { timeout: 10000 })
      
      const violationDetection = await page.evaluate(async () => {
        const response = await fetch('/api/enterprise/compliance/violation-detection-test')
        return response.json()
      })
      
      expect(violationDetection.real_time_monitoring_active).toBe(true)
      expect(violationDetection.violation_detection_time_ms).toBeLessThan(1000)
      expect(violationDetection.automatic_alert_triggered).toBe(true)
      expect(violationDetection.incident_workflow_initiated).toBe(true)
    })
  })
})

/**
 * Test Utilities and Helper Functions
 */
async function setupEnterpriseTestEnvironment(page: Page): Promise<void> {
  // Setup enterprise test organization with proper security controls
  await page.evaluate(async () => {
    await fetch('/api/enterprise/debug/setup-test-environment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environment: 'enterprise_security_test',
        enable_hsm: true,
        enable_quantum_crypto: true,
        compliance_level: 'top_secret',
        audit_mode: 'comprehensive'
      })
    })
  })
}

async function cleanupEnterpriseTestEnvironment(page: Page): Promise<void> {
  // Cleanup test data while maintaining audit trails
  await page.evaluate(async () => {
    await fetch('/api/enterprise/debug/cleanup-test-environment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environment: 'enterprise_security_test',
        preserve_audit_trails: true,
        secure_data_destruction: true
      })
    })
  })
}

// Global test hooks
test.beforeEach(async ({ page }) => {
  await setupEnterpriseTestEnvironment(page)
})

test.afterEach(async ({ page }) => {
  await cleanupEnterpriseTestEnvironment(page)
})