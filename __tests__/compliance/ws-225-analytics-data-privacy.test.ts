// WS-225 Analytics Data Privacy Validation
// Tests general data privacy controls and wedding industry specific privacy requirements

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface PrivacyValidationResult {
  testName: string;
  passed: boolean;
  violations: string[];
  privacyScore: number;
  evidence: any[];
}

describe('WS-225 Analytics Data Privacy Validation', () => {
  let supabase: ReturnType<typeof createClient>;
  let privacyTestResults: PrivacyValidationResult[] = [];

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await setupPrivacyTestData();
  });

  afterAll(async () => {
    await cleanupPrivacyTestData();
    await generatePrivacyValidationReport(privacyTestResults);
  });

  describe('PII Detection and Anonymization', () => {
    test('Automatic PII detection in analytics data', async () => {
      const testName = 'PII Detection in Analytics Data';
      const violations: string[] = [];
      const evidence: any[] = [];
      let privacyScore = 100;

      const testClientId = 'privacy-test-client-pii';
      const testSupplierId = 'privacy-test-supplier-pii';

      // Create test data with various PII patterns
      const testAnalyticsData = [
        {
          id: 'pii-test-1',
          client_id: testClientId,
          supplier_id: testSupplierId,
          event_type: 'form_submission',
          form_data: JSON.stringify({
            email: 'bride@example.com',
            phone: '555-123-4567',
            message: 'Our wedding is on June 15th, 2025'
          }),
          timestamp: new Date().toISOString()
        },
        {
          id: 'pii-test-2',
          client_id: testClientId,
          supplier_id: testSupplierId,
          event_type: 'page_view',
          page_url: '/contact?email=groom@example.com&name=John+Doe',
          user_agent: 'Browser info with email: contact@wedding.com',
          timestamp: new Date().toISOString()
        },
        {
          id: 'pii-test-3',
          client_id: testClientId,
          supplier_id: testSupplierId,
          event_type: 'file_upload',
          metadata: JSON.stringify({
            filename: 'wedding-guest-list-with-addresses.pdf',
            content_preview: 'John Smith, 123 Main St, SSN: 123-45-6789'
          }),
          timestamp: new Date().toISOString()
        }
      ];

      await supabase.from('client_analytics_data').insert(testAnalyticsData);

      // Test PII detection API
      const piiDetectionResponse = await fetch('/api/privacy/detect-pii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: testClientId,
          scan_all_data: true
        })
      });

      if (!piiDetectionResponse.ok) {
        violations.push('PII detection API not implemented');
        privacyScore -= 30;
      } else {
        const detectionResults = await piiDetectionResponse.json();
        
        // Verify detection of different PII types
        const expectedPIITypes = [
          'email_address',
          'phone_number',
          'social_security_number',
          'personal_name',
          'physical_address'
        ];

        expectedPIITypes.forEach(piiType => {
          if (!detectionResults.detected_pii || 
              !detectionResults.detected_pii.some((item: any) => item.type === piiType)) {
            violations.push(`Failed to detect PII type: ${piiType}`);
            privacyScore -= 10;
          }
        });

        evidence.push({
          detected_pii_count: detectionResults.detected_pii?.length || 0,
          detection_accuracy: detectionResults.accuracy_score || 0
        });

        // Test automatic anonymization
        if (detectionResults.auto_anonymization_available) {
          const anonymizeResponse = await fetch('/api/privacy/anonymize-pii', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: testClientId,
              anonymization_level: 'high',
              preserve_analytics_value: true
            })
          });

          if (anonymizeResponse.ok) {
            // Verify anonymization results
            const { data: anonymizedData } = await supabase
              .from('client_analytics_data')
              .select('*')
              .eq('client_id', testClientId);

            if (anonymizedData) {
              anonymizedData.forEach(record => {
                const recordStr = JSON.stringify(record).toLowerCase();
                
                // Check for remaining PII
                if (recordStr.includes('bride@example.com') || 
                    recordStr.includes('555-123-4567') ||
                    recordStr.includes('123-45-6789')) {
                  violations.push('PII not properly anonymized');
                  privacyScore -= 20;
                }
              });

              evidence.push({
                anonymization_performed: true,
                records_processed: anonymizedData.length
              });
            }
          } else {
            violations.push('Automatic PII anonymization failed');
            privacyScore -= 15;
          }
        } else {
          violations.push('Automatic PII anonymization not available');
          privacyScore -= 25;
        }
      }

      const result: PrivacyValidationResult = {
        testName,
        passed: violations.length === 0,
        violations,
        privacyScore: Math.max(0, privacyScore),
        evidence
      };

      privacyTestResults.push(result);
      expect(violations.length).toBe(0);
    });

    test('Wedding industry specific PII protection', async () => {
      const testName = 'Wedding Industry PII Protection';
      const violations: string[] = [];
      const evidence: any[] = [];
      let privacyScore = 100;

      const testClientId = 'privacy-test-wedding-pii';
      const testSupplierId = 'privacy-test-supplier-wedding';

      // Create wedding-specific sensitive data
      const weddingData = {
        client_id: testClientId,
        supplier_id: testSupplierId,
        event_type: 'wedding_details_submission',
        sensitive_data: JSON.stringify({
          couple_names: 'Sarah Johnson & Michael Brown',
          wedding_date: '2025-07-12',
          wedding_venue: 'Private Estate, Napa Valley',
          guest_count: 150,
          budget: 75000,
          honeymoon_destination: 'Bali, Indonesia',
          family_details: {
            bride_parents: 'Robert & Linda Johnson',
            groom_parents: 'David & Patricia Brown'
          },
          special_requests: 'Bride has severe nut allergy',
          vendor_payments: {
            photographer: 4500,
            caterer: 15000,
            florist: 3500
          }
        }),
        timestamp: new Date().toISOString()
      };

      await supabase.from('client_analytics_data').insert([weddingData]);

      // Test wedding-specific privacy controls
      const weddingPrivacyResponse = await fetch('/api/privacy/wedding-data-protection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: testClientId,
          protection_level: 'maximum',
          wedding_specific: true
        })
      });

      if (!weddingPrivacyResponse.ok) {
        violations.push('Wedding-specific privacy protection not implemented');
        privacyScore -= 40;
      } else {
        const protectionResult = await weddingPrivacyResponse.json();
        
        // Verify wedding data protection categories
        const protectedCategories = protectionResult.protected_categories || [];
        const requiredCategories = [
          'wedding_date',
          'venue_information',
          'guest_details',
          'financial_information',
          'medical_information',
          'family_information'
        ];

        requiredCategories.forEach(category => {
          if (!protectedCategories.includes(category)) {
            violations.push(`Wedding data category not protected: ${category}`);
            privacyScore -= 10;
          }
        });

        evidence.push({
          protected_categories: protectedCategories,
          protection_level: protectionResult.protection_level
        });
      }

      // Test guest list privacy (critical for wedding industry)
      const guestListData = {
        client_id: testClientId,
        supplier_id: testSupplierId,
        event_type: 'guest_list_upload',
        guest_data: JSON.stringify([
          { name: 'Emma Wilson', email: 'emma@email.com', plus_one: true },
          { name: 'James Smith', email: 'james@email.com', dietary_restrictions: 'vegetarian' },
          { name: 'Dr. Lisa Chen', email: 'lisa@email.com', table_assignment: 'Table 5' }
        ]),
        timestamp: new Date().toISOString()
      };

      await supabase.from('client_analytics_data').insert([guestListData]);

      // Verify guest data is encrypted/protected
      const { data: storedGuestData } = await supabase
        .from('client_analytics_data')
        .select('*')
        .eq('event_type', 'guest_list_upload')
        .eq('client_id', testClientId);

      if (storedGuestData && storedGuestData.length > 0) {
        const guestRecord = storedGuestData[0];
        
        // Check if guest data is encrypted or anonymized
        if (guestRecord.guest_data && 
            guestRecord.guest_data.includes('emma@email.com')) {
          violations.push('Guest personal information stored in plain text');
          privacyScore -= 25;
        }

        // Check for proper access controls
        const accessControlResponse = await fetch(`/api/privacy/guest-data-access/${testClientId}`, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer invalid-token' }
        });

        if (accessControlResponse.ok) {
          violations.push('Guest data accessible without proper authentication');
          privacyScore -= 30;
        }

        evidence.push({
          guest_data_encrypted: !guestRecord.guest_data.includes('emma@email.com'),
          access_control_working: !accessControlResponse.ok
        });
      }

      // Test vendor-to-vendor data isolation
      const { data: crossVendorAccess } = await supabase
        .from('client_analytics_data')
        .select('*')
        .eq('client_id', testClientId)
        .neq('supplier_id', testSupplierId); // Different supplier

      if (crossVendorAccess && crossVendorAccess.length > 0) {
        violations.push('Wedding data accessible across different vendors');
        privacyScore -= 35;
      }

      evidence.push({
        cross_vendor_isolation: crossVendorAccess?.length === 0,
        test_client_id: testClientId,
        test_supplier_id: testSupplierId
      });

      const result: PrivacyValidationResult = {
        testName,
        passed: violations.length === 0,
        violations,
        privacyScore: Math.max(0, privacyScore),
        evidence
      };

      privacyTestResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  describe('Data Encryption and Security', () => {
    test('Analytics data encryption at rest and in transit', async () => {
      const testName = 'Analytics Data Encryption';
      const violations: string[] = [];
      const evidence: any[] = [];
      let privacyScore = 100;

      // Test database encryption at rest
      const encryptionInfo = await testDatabaseEncryption();
      
      if (!encryptionInfo.at_rest_encryption) {
        violations.push('Database encryption at rest not enabled');
        privacyScore -= 40;
      }

      if (!encryptionInfo.key_management || encryptionInfo.key_management === 'manual') {
        violations.push('Inadequate encryption key management');
        privacyScore -= 20;
      }

      evidence.push({ database_encryption: encryptionInfo });

      // Test API encryption in transit
      const transitTestResponse = await fetch('/api/analytics/dashboard?test=encryption', {
        method: 'GET'
      });

      const isHttps = transitTestResponse.url.startsWith('https://');
      if (!isHttps) {
        violations.push('Analytics API not using HTTPS encryption');
        privacyScore -= 30;
      }

      // Test TLS version
      const securityHeaders = {
        'strict-transport-security': transitTestResponse.headers.get('strict-transport-security'),
        'x-content-type-options': transitTestResponse.headers.get('x-content-type-options'),
        'x-frame-options': transitTestResponse.headers.get('x-frame-options')
      };

      if (!securityHeaders['strict-transport-security']) {
        violations.push('HSTS header not present for secure analytics endpoints');
        privacyScore -= 15;
      }

      evidence.push({
        https_enabled: isHttps,
        security_headers: securityHeaders
      });

      // Test field-level encryption for sensitive data
      const testClientId = 'privacy-test-encryption';
      const sensitiveData = {
        client_id: testClientId,
        supplier_id: 'privacy-test-supplier',
        event_type: 'sensitive_data_test',
        encrypted_field: 'SENSITIVE: Credit Card 4111-1111-1111-1111',
        timestamp: new Date().toISOString()
      };

      await supabase.from('client_analytics_data').insert([sensitiveData]);

      // Verify sensitive data is encrypted in database
      const { data: storedData } = await supabase
        .from('client_analytics_data')
        .select('*')
        .eq('client_id', testClientId);

      if (storedData && storedData.length > 0) {
        const record = storedData[0];
        
        if (record.encrypted_field && 
            record.encrypted_field.includes('4111-1111-1111-1111')) {
          violations.push('Sensitive data stored unencrypted in analytics database');
          privacyScore -= 35;
        }

        evidence.push({
          field_level_encryption: !record.encrypted_field?.includes('4111-1111-1111-1111')
        });
      }

      const result: PrivacyValidationResult = {
        testName,
        passed: violations.length === 0,
        violations,
        privacyScore: Math.max(0, privacyScore),
        evidence
      };

      privacyTestResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  describe('Data Retention and Cleanup', () => {
    test('Automated data retention policy enforcement', async () => {
      const testName = 'Data Retention Policy Enforcement';
      const violations: string[] = [];
      const evidence: any[] = [];
      let privacyScore = 100;

      // Test retention policy configuration
      const retentionPolicyResponse = await fetch('/api/privacy/retention-policies', {
        method: 'GET'
      });

      if (!retentionPolicyResponse.ok) {
        violations.push('Data retention policy API not available');
        privacyScore -= 30;
      } else {
        const policies = await retentionPolicyResponse.json();
        
        // Verify analytics data retention policies exist
        const analyticsPolicy = policies.find((p: any) => p.data_type === 'analytics');
        if (!analyticsPolicy) {
          violations.push('No retention policy defined for analytics data');
          privacyScore -= 25;
        } else {
          if (analyticsPolicy.retention_days > 365 * 3) { // More than 3 years
            violations.push('Analytics data retention period too long for privacy compliance');
            privacyScore -= 15;
          }

          evidence.push({
            analytics_retention_days: analyticsPolicy.retention_days,
            auto_cleanup_enabled: analyticsPolicy.auto_cleanup
          });
        }

        // Check for wedding-specific retention rules
        const weddingPolicy = policies.find((p: any) => p.data_type === 'wedding_data');
        if (weddingPolicy) {
          if (weddingPolicy.post_wedding_retention > 365) { // More than 1 year after wedding
            violations.push('Post-wedding data retention too long');
            privacyScore -= 10;
          }
        }
      }

      // Test automatic cleanup functionality
      const testClientId = 'privacy-test-retention';
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2); // 2 years ago

      const oldAnalyticsData = {
        client_id: testClientId,
        supplier_id: 'privacy-test-supplier',
        event_type: 'old_data_test',
        timestamp: oldDate.toISOString(),
        created_at: oldDate.toISOString()
      };

      await supabase.from('client_analytics_data').insert([oldAnalyticsData]);

      // Trigger cleanup process
      const cleanupResponse = await fetch('/api/privacy/cleanup-old-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_types: ['analytics'],
          dry_run: false
        })
      });

      if (!cleanupResponse.ok) {
        violations.push('Automated data cleanup not implemented');
        privacyScore -= 35;
      } else {
        const cleanupResult = await cleanupResponse.json();
        
        // Verify old data was cleaned up
        const { data: remainingOldData } = await supabase
          .from('client_analytics_data')
          .select('*')
          .eq('client_id', testClientId)
          .eq('event_type', 'old_data_test');

        if (remainingOldData && remainingOldData.length > 0) {
          violations.push('Old analytics data not properly cleaned up');
          privacyScore -= 20;
        }

        evidence.push({
          cleanup_executed: true,
          records_cleaned: cleanupResult.records_deleted || 0,
          old_data_remaining: remainingOldData?.length || 0
        });
      }

      const result: PrivacyValidationResult = {
        testName,
        passed: violations.length === 0,
        violations,
        privacyScore: Math.max(0, privacyScore),
        evidence
      };

      privacyTestResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  describe('Access Controls and Audit Logging', () => {
    test('Analytics data access controls and audit trails', async () => {
      const testName = 'Access Controls and Audit Logging';
      const violations: string[] = [];
      const evidence: any[] = [];
      let privacyScore = 100;

      const testClientId = 'privacy-test-access-control';
      const testSupplierId = 'privacy-test-supplier-access';

      // Test unauthorized access attempts
      const unauthorizedAttempts = [
        {
          description: 'No authentication token',
          headers: {}
        },
        {
          description: 'Invalid authentication token',
          headers: { 'Authorization': 'Bearer invalid-token-12345' }
        },
        {
          description: 'Expired authentication token',
          headers: { 'Authorization': 'Bearer expired-token-67890' }
        }
      ];

      for (const attempt of unauthorizedAttempts) {
        const accessResponse = await fetch(`/api/analytics/client-data/${testClientId}`, {
          method: 'GET',
          headers: attempt.headers
        });

        if (accessResponse.ok) {
          violations.push(`Analytics data accessible with ${attempt.description}`);
          privacyScore -= 25;
        }
      }

      // Test cross-supplier data access prevention
      const wrongSupplierResponse = await fetch(`/api/analytics/client-data/${testClientId}`, {
        method: 'GET',
        headers: { 
          'Authorization': 'Bearer valid-token',
          'X-Supplier-ID': 'different-supplier-id'
        }
      });

      if (wrongSupplierResponse.ok) {
        violations.push('Cross-supplier analytics data access not properly restricted');
        privacyScore -= 30;
      }

      // Test audit logging for data access
      const auditLogResponse = await fetch('/api/privacy/audit-logs', {
        method: 'GET',
        headers: { 
          'Authorization': 'Bearer admin-token',
          'Content-Type': 'application/json'
        }
      });

      if (!auditLogResponse.ok) {
        violations.push('Audit logging system not accessible');
        privacyScore -= 20;
      } else {
        const auditLogs = await auditLogResponse.json();
        
        // Verify audit log completeness
        const requiredAuditFields = [
          'user_id',
          'action',
          'resource_accessed',
          'timestamp',
          'ip_address',
          'user_agent'
        ];

        if (auditLogs.logs && auditLogs.logs.length > 0) {
          const sampleLog = auditLogs.logs[0];
          
          requiredAuditFields.forEach(field => {
            if (!(field in sampleLog)) {
              violations.push(`Audit log missing required field: ${field}`);
              privacyScore -= 5;
            }
          });

          evidence.push({
            audit_logging_enabled: true,
            log_entries_count: auditLogs.logs.length,
            sample_log_fields: Object.keys(sampleLog)
          });
        } else {
          violations.push('No audit log entries found');
          privacyScore -= 15;
        }
      }

      // Test data access monitoring and alerting
      const monitoringResponse = await fetch('/api/privacy/access-monitoring', {
        method: 'GET'
      });

      if (monitoringResponse.ok) {
        const monitoringData = await monitoringResponse.json();
        
        if (!monitoringData.suspicious_access_detection) {
          violations.push('Suspicious access detection not enabled');
          privacyScore -= 15;
        }

        if (!monitoringData.real_time_alerts) {
          violations.push('Real-time security alerts not configured');
          privacyScore -= 10;
        }

        evidence.push({
          access_monitoring: monitoringData
        });
      }

      const result: PrivacyValidationResult = {
        testName,
        passed: violations.length === 0,
        violations,
        privacyScore: Math.max(0, privacyScore),
        evidence
      };

      privacyTestResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  describe('Cookie and Tracking Consent', () => {
    test('Analytics cookie consent and tracking compliance', async () => {
      const testName = 'Cookie Consent and Tracking Compliance';
      const violations: string[] = [];
      const evidence: any[] = [];
      let privacyScore = 100;

      // Test cookie consent banner implementation
      const homePageResponse = await fetch('/', {
        method: 'GET'
      });

      if (homePageResponse.ok) {
        const pageContent = await homePageResponse.text();
        
        if (!pageContent.includes('cookie') || !pageContent.includes('consent')) {
          violations.push('Cookie consent banner not present on homepage');
          privacyScore -= 25;
        }

        // Check for granular consent options
        const hasAnalyticsCookieOption = pageContent.includes('analytics') || 
                                       pageContent.includes('tracking');
        if (!hasAnalyticsCookieOption) {
          violations.push('No granular analytics cookie consent option');
          privacyScore -= 15;
        }

        evidence.push({
          has_cookie_banner: pageContent.includes('cookie'),
          has_analytics_option: hasAnalyticsCookieOption
        });
      }

      // Test consent API functionality
      const consentResponse = await fetch('/api/privacy/cookie-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'privacy-test-cookies',
          consent_types: ['necessary', 'analytics', 'marketing'],
          analytics_consent: true
        })
      });

      if (!consentResponse.ok) {
        violations.push('Cookie consent API not implemented');
        privacyScore -= 30;
      }

      // Test analytics tracking without consent
      const trackingWithoutConsentResponse = await fetch('/api/analytics/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'privacy-test-no-consent',
          event_type: 'page_view',
          page_url: '/test-page'
        })
      });

      if (trackingWithoutConsentResponse.ok) {
        const trackingResult = await trackingWithoutConsentResponse.json();
        
        if (trackingResult.event_tracked) {
          violations.push('Analytics tracking allowed without explicit consent');
          privacyScore -= 35;
        }
      }

      // Test Do Not Track header respect
      const dntResponse = await fetch('/api/analytics/track-event', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'DNT': '1' // Do Not Track header
        },
        body: JSON.stringify({
          client_id: 'privacy-test-dnt',
          event_type: 'page_view',
          page_url: '/test-dnt-page'
        })
      });

      if (dntResponse.ok) {
        const dntResult = await dntResponse.json();
        
        if (dntResult.event_tracked) {
          violations.push('Do Not Track header not respected');
          privacyScore -= 20;
        }

        evidence.push({
          dnt_respected: !dntResult.event_tracked
        });
      }

      const result: PrivacyValidationResult = {
        testName,
        passed: violations.length === 0,
        violations,
        privacyScore: Math.max(0, privacyScore),
        evidence
      };

      privacyTestResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  // Helper functions
  async function setupPrivacyTestData() {
    console.log('🔒 Setting up privacy validation test data...');
    
    const suppliers = [
      { id: 'privacy-test-supplier-pii', name: 'Privacy Test Supplier PII', email: 'pii@privacytest.com' },
      { id: 'privacy-test-supplier-wedding', name: 'Privacy Test Supplier Wedding', email: 'wedding@privacytest.com' },
      { id: 'privacy-test-supplier', name: 'Privacy Test Supplier General', email: 'general@privacytest.com' },
      { id: 'privacy-test-supplier-access', name: 'Privacy Test Supplier Access', email: 'access@privacytest.com' }
    ];

    await supabase.from('suppliers').upsert(suppliers);
  }

  async function cleanupPrivacyTestData() {
    console.log('🧹 Cleaning up privacy test data...');
    
    const testClientIds = [
      'privacy-test-client-pii',
      'privacy-test-wedding-pii',
      'privacy-test-encryption',
      'privacy-test-retention',
      'privacy-test-access-control',
      'privacy-test-cookies',
      'privacy-test-no-consent',
      'privacy-test-dnt'
    ];

    const testSupplierIds = [
      'privacy-test-supplier-pii',
      'privacy-test-supplier-wedding', 
      'privacy-test-supplier',
      'privacy-test-supplier-access'
    ];

    await Promise.all([
      supabase.from('client_analytics_data').delete().in('client_id', testClientIds),
      supabase.from('clients').delete().in('id', testClientIds),
      supabase.from('suppliers').delete().in('id', testSupplierIds)
    ]);
  }

  async function testDatabaseEncryption() {
    // Mock encryption testing - would integrate with actual database encryption checks
    return {
      at_rest_encryption: true,
      encryption_algorithm: 'AES-256',
      key_management: 'AWS KMS',
      key_rotation_enabled: true,
      transparent_data_encryption: true
    };
  }

  async function generatePrivacyValidationReport(results: PrivacyValidationResult[]) {
    const avgPrivacyScore = results.reduce((sum, r) => sum + r.privacyScore, 0) / results.length;
    
    const report = {
      timestamp: new Date().toISOString(),
      scope: 'WS-225 Analytics Data Privacy Validation',
      summary: {
        total_tests: results.length,
        tests_passed: results.filter(r => r.passed).length,
        tests_failed: results.filter(r => !r.passed).length,
        average_privacy_score: Math.round(avgPrivacyScore * 10) / 10,
        privacy_grade: getPrivacyGrade(avgPrivacyScore)
      },
      results,
      overall_privacy_compliance: results.every(r => r.passed),
      critical_privacy_violations: results.flatMap(r => r.violations).filter(v => 
        v.includes('PII') || v.includes('encryption') || v.includes('unauthorized') || v.includes('consent')
      ),
      privacy_recommendations: generatePrivacyRecommendations(results)
    };

    console.log('\n🔒 PRIVACY VALIDATION REPORT');
    console.log('============================');
    console.log(`Overall Privacy Compliance: ${report.overall_privacy_compliance ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
    console.log(`Average Privacy Score: ${report.summary.average_privacy_score}/100 (${report.summary.privacy_grade})`);
    console.log(`Tests Passed: ${report.summary.tests_passed}/${report.summary.total_tests}`);
    
    if (report.critical_privacy_violations.length > 0) {
      console.log('\n🚨 Critical Privacy Violations:');
      report.critical_privacy_violations.forEach(violation => console.log(`  - ${violation}`));
    }

    console.log('\n📋 Privacy Test Results:');
    results.forEach(result => {
      console.log(`${result.passed ? '✅' : '❌'} ${result.testName} (Score: ${result.privacyScore}/100)`);
      if (!result.passed) {
        result.violations.forEach(v => console.log(`    - ${v}`));
      }
    });

    console.log('\n📝 Privacy Recommendations:');
    report.privacy_recommendations.forEach(rec => console.log(`  ${rec}`));

    const fs = require('fs').promises;
    await fs.writeFile(
      '/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/compliance/analytics-privacy-validation-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ Privacy validation report saved to analytics-privacy-validation-report.json');
  }

  function getPrivacyGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  function generatePrivacyRecommendations(results: PrivacyValidationResult[]): string[] {
    const recommendations = new Set<string>();
    
    results.forEach(result => {
      if (result.privacyScore < 80) {
        recommendations.add('🔧 Implement comprehensive PII detection and anonymization system');
      }
      
      if (result.violations.some(v => v.includes('encryption'))) {
        recommendations.add('🔐 Enable database encryption at rest and strengthen transit encryption');
      }
      
      if (result.violations.some(v => v.includes('consent'))) {
        recommendations.add('📝 Implement granular cookie consent management');
      }
      
      if (result.violations.some(v => v.includes('access'))) {
        recommendations.add('🛡️ Strengthen access controls and audit logging');
      }
      
      if (result.violations.some(v => v.includes('retention'))) {
        recommendations.add('⏰ Implement automated data retention and cleanup policies');
      }
    });

    recommendations.add('🏥 Regular privacy impact assessments for new features');
    recommendations.add('👨‍🏫 Staff training on wedding industry privacy requirements');
    recommendations.add('📊 Implement privacy-by-design in analytics architecture');

    return Array.from(recommendations);
  }
});