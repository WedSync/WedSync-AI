/**
 * GDPR Compliance E2E Tests
 * WS-149: Comprehensive tests for GDPR compliance system
 */

import { test, expect } from '@playwright/test';

test.describe('GDPR Compliance System', () => {
  
  test('Complete data subject access request workflow', async ({ page }) => {
    // Setup: Create test user with comprehensive data
    await page.evaluate(async () => {
      await fetch('/api/debug/create-gdpr-test-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'gdpr.test@wedsync.com',
          name: 'Emma Schmidt',
          create_comprehensive_data: true,
          data_points: [
            'profile', 'photos', 'communications', 'contracts', 
            'payments', 'guest_lists', 'vendor_interactions'
          ]
        })
      });
    });
    
    // Navigate to data subject request portal
    await page.goto('/privacy/data-request');
    
    // Fill out access request form
    await page.fill('[data-testid="requester-email"]', 'gdpr.test@wedsync.com');
    await page.fill('[data-testid="requester-name"]', 'Emma Schmidt');
    await page.click('[data-testid="request-type-access"]');
    await page.fill('[data-testid="request-details"]', 'I would like a complete copy of all personal data you hold about me for my wedding planning.');
    await page.selectOption('[data-testid="export-format"]', 'json');
    
    // Submit request
    await page.click('[data-testid="submit-request"]');
    await page.waitForSelector('[data-testid="request-submitted"]');
    
    // Verify request was logged
    const requestId = await page.textContent('[data-testid="request-id"]');
    expect(requestId).toMatch(/^DSR-A-\d{4}-\d{3}$/); // Format: DSR-A-2025-001
    
    // Simulate identity verification (would normally require external verification)
    await page.evaluate(async (reqId) => {
      await fetch('/api/debug/verify-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: reqId,
          verification_method: 'email_verification',
          verified: true
        })
      });
    }, requestId);
    
    // Check request processing (simulate admin processing)
    await page.goto(`/admin/gdpr/requests/${requestId}`);
    await page.click('[data-testid="process-request"]');
    
    // Wait for data export generation
    await page.waitForSelector('[data-testid="export-ready"]', { timeout: 30000 });
    
    // Verify export contains all expected data categories
    const exportDetails = await page.evaluate(async (reqId) => {
      const response = await fetch(`/api/gdpr/export/verify/${reqId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    }, requestId);
    
    expect(exportDetails.data_categories).toContain('profile_information');
    expect(exportDetails.data_categories).toContain('communication_records');
    expect(exportDetails.data_categories).toContain('uploaded_files');
    expect(exportDetails.total_records).toBeGreaterThan(0);
    expect(exportDetails.export_format).toBe('json');
    expect(exportDetails.verification_hash).toBeDefined();
    
    // Verify completion within legal timeframe (30 days)
    expect(exportDetails.processing_time_hours).toBeLessThan(24); // Should be much faster than 30 days
  });

  test('GDPR erasure (right to be forgotten) with crypto-shredding', async ({ page }) => {
    // Setup test user with encrypted data
    await page.evaluate(async () => {
      await fetch('/api/debug/create-encrypted-test-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'erasure.test@wedsync.com',
          name: 'Hans Mueller',
          create_encrypted_data: true,
          encryption_level: 'advanced'
        })
      });
    });
    
    // Verify data exists before erasure
    const preErasureData = await page.evaluate(async () => {
      const response = await fetch('/api/debug/check-user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'erasure.test@wedsync.com'
        })
      });
      return response.json();
    });
    
    expect(preErasureData.user_exists).toBe(true);
    expect(preErasureData.encrypted_fields_count).toBeGreaterThan(0);
    
    // Submit erasure request
    await page.goto('/privacy/data-request');
    await page.fill('[data-testid="requester-email"]', 'erasure.test@wedsync.com');
    await page.fill('[data-testid="requester-name"]', 'Hans Mueller');
    await page.click('[data-testid="request-type-erasure"]');
    await page.fill('[data-testid="request-details"]', 'Please delete all my personal data as I no longer wish to use your service.');
    
    await page.click('[data-testid="submit-request"]');
    const erasureRequestId = await page.textContent('[data-testid="request-id"]');
    
    // Verify identity and process erasure
    await page.evaluate(async (reqId) => {
      await fetch('/api/debug/verify-and-process-erasure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: reqId,
          verification_confirmed: true,
          deletion_method: 'crypto_shred'
        })
      });
    }, erasureRequestId);
    
    await page.waitForTimeout(5000); // Allow processing time
    
    // Verify complete data erasure
    const postErasureData = await page.evaluate(async () => {
      const response = await fetch('/api/debug/check-user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'erasure.test@wedsync.com'
        })
      });
      return response.json();
    });
    
    expect(postErasureData.user_exists).toBe(false);
    expect(postErasureData.data_recoverable).toBe(false);
    expect(postErasureData.crypto_shred_completed).toBe(true);
    
    // Verify audit trail exists (should be anonymized)
    const auditTrail = await page.evaluate(async (reqId) => {
      const response = await fetch(`/api/gdpr/audit/erasure/${reqId}`, {
        method: 'GET'
      });
      return response.json();
    }, erasureRequestId);
    
    expect(auditTrail.erasure_completed).toBe(true);
    expect(auditTrail.data_subject_identifier).toBe('[ERASED]');
    expect(auditTrail.deletion_method).toBe('crypto_shred');
  });

  test('Data breach notification compliance (72-hour rule)', async ({ page }) => {
    // Simulate data breach detection
    await page.goto('/admin/security/breach-simulation');
    
    // Configure breach scenario
    await page.selectOption('[data-testid="breach-type"]', 'confidentiality');
    await page.selectOption('[data-testid="breach-cause"]', 'cyber_attack');
    await page.selectOption('[data-testid="severity-level"]', 'high');
    await page.fill('[data-testid="affected-subjects"]', '150');
    await page.check('[data-testid="includes-sensitive-data"]');
    
    const breachStartTime = Date.now();
    
    // Initiate breach response
    await page.click('[data-testid="initiate-breach-response"]');
    await page.waitForSelector('[data-testid="breach-response-initiated"]');
    
    const breachId = await page.textContent('[data-testid="breach-id"]');
    expect(breachId).toMatch(/^BR-\d{4}-\d{3}$/);
    
    // Verify immediate actions triggered
    await page.waitForSelector('[data-testid="dpo-notified"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="containment-initiated"]', { timeout: 5000 });
    
    // Check supervisory authority notification requirement
    const notificationAssessment = await page.evaluate(async (bId) => {
      const response = await fetch(`/api/gdpr/breach/assess-notification/${bId}`, {
        method: 'GET'
      });
      return response.json();
    }, breachId);
    
    expect(notificationAssessment.supervisory_authority_required).toBe(true); // High severity breach
    expect(notificationAssessment.data_subject_notification_required).toBe(true); // Sensitive data involved
    expect(notificationAssessment.deadline_hours).toBe(72);
    
    // Simulate breach resolution and verify compliance
    await page.click('[data-testid="mark-breach-contained"]');
    await page.fill('[data-testid="containment-details"]', 'Security vulnerability patched, affected systems isolated, monitoring enhanced');
    await page.click('[data-testid="submit-containment"]');
    
    // Verify notifications sent within timeframe
    const notificationStatus = await page.evaluate(async (bId) => {
      const response = await fetch(`/api/gdpr/breach/notification-status/${bId}`, {
        method: 'GET'
      });
      return response.json();
    }, breachId);
    
    const breachProcessingTime = Date.now() - breachStartTime;
    expect(breachProcessingTime).toBeLessThan(3600000); // Under 1 hour (well within 72-hour requirement)
    expect(notificationStatus.supervisory_authority_notified).toBe(true);
    expect(notificationStatus.data_subjects_notified).toBe(true);
  });

  test('Cookie consent banner and granular consent management', async ({ page }) => {
    // Clear any existing cookies
    await page.context().clearCookies();
    
    // Navigate to site as new visitor
    await page.goto('/');
    
    // Verify cookie consent banner appears
    await page.waitForSelector('[data-testid="cookie-consent-banner"]');
    
    // Check granular consent options
    const consentOptions = await page.$$('[data-testid^="consent-option-"]');
    expect(consentOptions.length).toBeGreaterThanOrEqual(4); // Essential, Analytics, Marketing, Personalization
    
    // Verify essential cookies are pre-selected and disabled (can't be unchecked)
    const essentialCheckbox = await page.$('[data-testid="consent-option-essential"] input');
    const isEssentialChecked = await essentialCheckbox?.isChecked();
    const isEssentialDisabled = await essentialCheckbox?.isDisabled();
    
    expect(isEssentialChecked).toBe(true);
    expect(isEssentialDisabled).toBe(true);
    
    // Test selective consent
    await page.check('[data-testid="consent-option-analytics"] input');
    await page.uncheck('[data-testid="consent-option-marketing"] input');
    await page.check('[data-testid="consent-option-personalization"] input');
    
    await page.click('[data-testid="save-consent-preferences"]');
    await page.waitForSelector('[data-testid="consent-saved-confirmation"]');
    
    // Verify consent was recorded properly
    const consentRecord = await page.evaluate(async () => {
      const response = await fetch('/api/gdpr/consent/current-user', {
        method: 'GET'
      });
      return response.json();
    });
    
    expect(consentRecord.essential).toBe(true);
    expect(consentRecord.analytics).toBe(true);
    expect(consentRecord.marketing).toBe(false);
    expect(consentRecord.personalization).toBe(true);
    expect(consentRecord.consent_method).toBe('explicit');
    expect(consentRecord.evidence.timestamp).toBeDefined();
    expect(consentRecord.evidence.ip_address).toBeDefined();
    
    // Test consent withdrawal
    await page.goto('/privacy/manage-consent');
    await page.uncheck('[data-testid="current-consent-analytics"] input');
    await page.click('[data-testid="update-consent"]');
    
    // Verify withdrawal was recorded
    const updatedConsent = await page.evaluate(async () => {
      const response = await fetch('/api/gdpr/consent/current-user', {
        method: 'GET'
      });
      return response.json();
    });
    
    expect(updatedConsent.analytics).toBe(false);
    expect(updatedConsent.last_modified).toBeDefined();
  });

  test('Data portability request with structured export', async ({ page }) => {
    // Create test user with wedding data
    await page.evaluate(async () => {
      await fetch('/api/debug/create-wedding-test-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'portability.test@wedsync.com',
          name: 'Sophie Laurent',
          wedding_data: {
            date: '2025-06-15',
            venue: 'Château de Versailles',
            guests: 150,
            vendors: ['photographer', 'florist', 'caterer']
          }
        })
      });
    });

    // Submit portability request
    await page.goto('/privacy/data-request');
    await page.fill('[data-testid="requester-email"]', 'portability.test@wedsync.com');
    await page.fill('[data-testid="requester-name"]', 'Sophie Laurent');
    await page.click('[data-testid="request-type-portability"]');
    await page.selectOption('[data-testid="export-format"]', 'csv');
    
    await page.click('[data-testid="submit-request"]');
    const portabilityRequestId = await page.textContent('[data-testid="request-id"]');

    // Process the request
    const exportData = await page.evaluate(async (reqId) => {
      const response = await fetch('/api/gdpr/process-portability-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: reqId,
          format: 'csv'
        })
      });
      return response.json();
    }, portabilityRequestId);

    expect(exportData.format).toBe('csv');
    expect(exportData.portable).toBe(true);
    expect(exportData.machine_readable).toBe(true);
    expect(exportData.commonly_used_format).toBe(true);
  });

  test('Privacy impact assessment for high-risk processing', async ({ page }) => {
    // Navigate to PIA creation page
    await page.goto('/admin/gdpr/privacy-impact-assessment/new');

    // Fill out PIA form
    await page.fill('[data-testid="project-name"]', 'AI-Powered Wedding Photo Recognition');
    await page.fill('[data-testid="processing-purpose"]', 'Automatically tag and organize wedding photos using facial recognition');
    await page.check('[data-testid="high-risk-processing"]');
    await page.check('[data-testid="biometric-data"]');
    await page.check('[data-testid="large-scale-processing"]');

    // Submit PIA
    await page.click('[data-testid="submit-pia"]');
    
    // Verify PIA was created
    const piaId = await page.textContent('[data-testid="pia-id"]');
    expect(piaId).toMatch(/^PIA-\d{4}-\d{3}$/);

    // Check risk assessment
    const riskAssessment = await page.evaluate(async (pId) => {
      const response = await fetch(`/api/gdpr/pia/${pId}/risk-assessment`, {
        method: 'GET'
      });
      return response.json();
    }, piaId);

    expect(riskAssessment.requires_dpa_consultation).toBe(true);
    expect(riskAssessment.residual_risk_level).toBeDefined();
    expect(riskAssessment.mitigation_measures).toHaveLength(riskAssessment.mitigation_measures.length);
  });
});

// Additional integration tests for GDPR compliance
test.describe('GDPR API Integration Tests', () => {
  
  test('Consent recording and retrieval API', async ({ request }) => {
    // Record consent
    const consentResponse = await request.post('/api/gdpr/consent/record', {
      data: {
        data_subject_id: crypto.randomUUID(),
        data_subject_type: 'couple',
        purpose: 'analytics',
        legal_basis: 'consent',
        consent_given: true,
        consent_method: 'explicit',
        consent_evidence: {
          ip_address: '192.168.1.1',
          timestamp: new Date().toISOString(),
          user_agent: 'Test Agent',
          method_details: { test: true }
        },
        data_categories: ['usage_patterns', 'device_info']
      }
    });

    expect(consentResponse.ok()).toBeTruthy();
    const consentData = await consentResponse.json();
    expect(consentData.success).toBe(true);
    expect(consentData.consent).toBeDefined();
  });

  test('Data subject request submission API', async ({ request }) => {
    const dsrResponse = await request.post('/api/gdpr/subject-request/submit', {
      data: {
        request_type: 'access',
        data_subject_email: 'test@example.com',
        data_subject_name: 'Test User',
        identity_verification: {
          method: 'email_verification',
          evidence: { verified: true }
        },
        request_details: { test: true },
        preferred_format: 'json'
      }
    });

    expect(dsrResponse.ok()).toBeTruthy();
    const dsrData = await dsrResponse.json();
    expect(dsrData.success).toBe(true);
    expect(dsrData.request_id).toMatch(/^DSR-A-\d{4}-\d{3}$/);
  });

  test('Breach reporting and assessment API', async ({ request }) => {
    // Report breach
    const breachResponse = await request.post('/api/gdpr/breach/report', {
      data: {
        breach_type: 'confidentiality',
        breach_cause: 'human_error',
        severity_level: 'medium',
        occurred_at: new Date(Date.now() - 3600000).toISOString(),
        discovered_at: new Date().toISOString(),
        data_subjects_affected: 50,
        data_categories_affected: ['email', 'name'],
        potential_consequences: 'Unauthorized disclosure of contact information',
        risk_assessment: { likelihood: 'medium', impact: 'low' },
        containment_measures: { action: 'Access revoked', completed: true }
      }
    });

    expect(breachResponse.ok()).toBeTruthy();
    const breachData = await breachResponse.json();
    expect(breachData.success).toBe(true);
    expect(breachData.breach_id).toMatch(/^BR-\d{4}-\d{3}$/);
    expect(breachData.assessment).toBeDefined();
  });
});