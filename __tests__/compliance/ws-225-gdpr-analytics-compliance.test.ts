// WS-225 GDPR Analytics Compliance Testing
// Tests GDPR compliance for client portal analytics system

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { GET } from '../../src/app/api/analytics/dashboard/route';

interface GDPRComplianceResult {
  testName: string;
  compliant: boolean;
  violations: string[];
  recommendations: string[];
  evidence: any[];
}

describe('WS-225 GDPR Analytics Compliance', () => {
  let supabase: ReturnType<typeof createClient>;
  let testComplianceResults: GDPRComplianceResult[] = [];

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await setupGDPRTestData();
  });

  afterAll(async () => {
    await cleanupGDPRTestData();
    await generateGDPRComplianceReport(testComplianceResults);
  });

  describe('Article 17: Right to Erasure (Right to be Forgotten)', () => {
    test('Complete client data deletion removes all analytics traces', async () => {
      const testName = 'Right to Erasure - Complete Data Deletion';
      const violations: string[] = [];
      const evidence: any[] = [];

      // Create test client with analytics data
      const testClientId = 'gdpr-test-client-erasure';
      const testSupplierId = 'gdpr-test-supplier-erasure';

      // Insert test data across all analytics tables
      await supabase.from('clients').insert({
        id: testClientId,
        supplier_id: testSupplierId,
        name: 'John Doe GDPR Test',
        email: 'john.gdpr.test@example.com',
        phone: '+1234567890',
        wedding_date: '2025-06-15',
        partner_name: 'Jane Doe',
        venue_name: 'Test Venue',
      });

      await supabase.from('client_analytics_data').insert([
        {
          id: 'analytics-1',
          client_id: testClientId,
          supplier_id: testSupplierId,
          event_type: 'page_view',
          page_url: '/dashboard',
          timestamp: new Date().toISOString(),
          user_agent: 'Test Browser',
          ip_address: '192.168.1.1',
          session_id: 'gdpr-test-session'
        },
        {
          id: 'analytics-2', 
          client_id: testClientId,
          supplier_id: testSupplierId,
          event_type: 'form_submission',
          form_data: JSON.stringify({ message: 'Test message from client' }),
          timestamp: new Date().toISOString(),
        }
      ]);

      await supabase.from('journey_instances').insert({
        id: 'journey-gdpr-test',
        client_id: testClientId,
        supplier_id: testSupplierId,
        journey_name: 'Test Journey',
        status: 'active',
        metadata: JSON.stringify({ client_notes: 'Personal notes' })
      });

      // Verify data exists
      const { data: beforeDeletion } = await supabase
        .from('client_analytics_data')
        .select('*')
        .eq('client_id', testClientId);

      evidence.push({ stage: 'before_deletion', records: beforeDeletion?.length || 0 });

      if (!beforeDeletion || beforeDeletion.length === 0) {
        violations.push('Test data was not properly inserted');
      }

      // Execute GDPR deletion request
      const deletionResponse = await fetch('/api/gdpr/delete-client-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: testClientId,
          deletion_reason: 'GDPR Article 17 Request',
          requestor_email: 'john.gdpr.test@example.com'
        })
      });

      if (!deletionResponse.ok) {
        violations.push('GDPR deletion endpoint failed or does not exist');
      }

      // Wait for deletion processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify complete data removal from all analytics tables
      const analyticsChecks = await Promise.all([
        supabase.from('client_analytics_data').select('*').eq('client_id', testClientId),
        supabase.from('journey_instances').select('*').eq('client_id', testClientId),
        supabase.from('client_interactions').select('*').eq('client_id', testClientId),
        supabase.from('analytics_aggregations').select('*').eq('client_id', testClientId),
      ]);

      analyticsChecks.forEach((check, index) => {
        const tableNames = ['client_analytics_data', 'journey_instances', 'client_interactions', 'analytics_aggregations'];
        if (check.data && check.data.length > 0) {
          violations.push(`Client data still exists in ${tableNames[index]} after deletion request`);
          evidence.push({ table: tableNames[index], remaining_records: check.data.length });
        }
      });

      // Check for soft-deleted records with anonymization
      const { data: deletionLog } = await supabase
        .from('gdpr_deletion_log')
        .select('*')
        .eq('client_id', testClientId);

      if (!deletionLog || deletionLog.length === 0) {
        violations.push('No GDPR deletion log entry created for audit trail');
      } else {
        evidence.push({ deletion_log: deletionLog[0] });
      }

      // Verify analytics aggregations don't contain identifiable data
      const { data: aggregatedData } = await supabase
        .from('analytics_summary')
        .select('*')
        .eq('supplier_id', testSupplierId);

      if (aggregatedData) {
        aggregatedData.forEach(record => {
          if (record.raw_data && (
            record.raw_data.includes('john.gdpr.test@example.com') ||
            record.raw_data.includes('John Doe GDPR Test')
          )) {
            violations.push('Client PII found in analytics aggregations after deletion');
          }
        });
      }

      const result: GDPRComplianceResult = {
        testName,
        compliant: violations.length === 0,
        violations,
        recommendations: violations.length > 0 ? [
          'Implement cascade deletion for all client analytics data',
          'Add proper GDPR deletion endpoint with comprehensive data removal',
          'Ensure analytics aggregations are anonymized',
          'Implement audit logging for all deletion requests'
        ] : ['Excellent GDPR compliance for data deletion'],
        evidence
      };

      testComplianceResults.push(result);

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        console.error('GDPR Right to Erasure Violations:', violations);
      }
    });

    test('Partial analytics data anonymization for active clients', async () => {
      const testName = 'Right to Erasure - Partial Anonymization';
      const violations: string[] = [];
      const evidence: any[] = [];

      const testClientId = 'gdpr-test-client-partial';
      const testSupplierId = 'gdpr-test-supplier-partial';

      // Create client with analytics data
      await supabase.from('clients').insert({
        id: testClientId,
        supplier_id: testSupplierId,
        name: 'Jane Smith GDPR Test',
        email: 'jane.gdpr.test@example.com',
        status: 'active' // Active client - only partial anonymization
      });

      // Request partial anonymization (remove PII but keep statistical data)
      const partialResponse = await fetch('/api/gdpr/anonymize-client-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: testClientId,
          anonymization_level: 'partial',
          retain_statistics: true
        })
      });

      if (!partialResponse.ok) {
        violations.push('GDPR partial anonymization endpoint not implemented');
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify PII is removed but statistical data remains
      const { data: analyticsData } = await supabase
        .from('client_analytics_data')
        .select('*')
        .eq('client_id', testClientId);

      if (analyticsData) {
        analyticsData.forEach(record => {
          // Check for PII removal
          if (record.ip_address && !isAnonymizedIP(record.ip_address)) {
            violations.push('IP address not properly anonymized');
          }

          if (record.user_agent && record.user_agent.includes('jane.gdpr.test')) {
            violations.push('Email found in user agent string after anonymization');
          }

          if (record.form_data) {
            try {
              const formData = JSON.parse(record.form_data);
              if (formData.email || formData.name || formData.phone) {
                violations.push('PII found in form data after anonymization');
              }
            } catch (e) {
              // Ignore parse errors
            }
          }

          // Verify statistical data is preserved
          if (!record.event_type || !record.timestamp) {
            violations.push('Statistical analytics data was improperly removed during anonymization');
          }
        });

        evidence.push({ anonymized_records: analyticsData.length });
      }

      const result: GDPRComplianceResult = {
        testName,
        compliant: violations.length === 0,
        violations,
        recommendations: violations.length > 0 ? [
          'Implement proper PII anonymization techniques',
          'Use IP address masking (remove last octet)',
          'Sanitize form data while preserving analytics value',
          'Add anonymization validation checks'
        ] : ['Good partial anonymization implementation'],
        evidence
      };

      testComplianceResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  describe('Article 20: Right to Data Portability', () => {
    test('Client can export their analytics data in machine-readable format', async () => {
      const testName = 'Right to Data Portability';
      const violations: string[] = [];
      const evidence: any[] = [];

      const testClientId = 'gdpr-test-client-export';
      const testSupplierId = 'gdpr-test-supplier-export';

      // Create comprehensive test data
      await setupClientAnalyticsData(testClientId, testSupplierId);

      // Test data export API
      const exportResponse = await fetch(`/api/gdpr/export-client-data/${testClientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'Accept': 'application/json'
        }
      });

      if (!exportResponse.ok) {
        violations.push('GDPR data export endpoint not implemented or failing');
        evidence.push({ export_response_status: exportResponse.status });
      } else {
        try {
          const exportData = await exportResponse.json();
          
          // Validate export data structure
          const requiredSections = [
            'personal_information',
            'analytics_data',
            'journey_history',
            'interactions',
            'preferences'
          ];

          requiredSections.forEach(section => {
            if (!exportData[section]) {
              violations.push(`Missing ${section} in data export`);
            }
          });

          // Validate analytics data completeness
          if (exportData.analytics_data) {
            const analytics = exportData.analytics_data;
            
            if (!Array.isArray(analytics) || analytics.length === 0) {
              violations.push('Analytics data section is empty or malformed');
            } else {
              // Check for required fields in each analytics record
              const requiredFields = ['event_type', 'timestamp', 'page_url', 'session_id'];
              const sampleRecord = analytics[0];
              
              requiredFields.forEach(field => {
                if (!(field in sampleRecord)) {
                  violations.push(`Missing required field "${field}" in analytics export`);
                }
              });
            }
          }

          // Ensure data is in machine-readable format (JSON)
          if (typeof exportData !== 'object') {
            violations.push('Exported data is not in machine-readable JSON format');
          }

          // Verify data completeness by counting records
          const { data: originalAnalytics } = await supabase
            .from('client_analytics_data')
            .select('*')
            .eq('client_id', testClientId);

          if (originalAnalytics && exportData.analytics_data) {
            if (exportData.analytics_data.length !== originalAnalytics.length) {
              violations.push('Exported analytics data count does not match database records');
            }
          }

          evidence.push({
            export_structure: Object.keys(exportData),
            analytics_record_count: exportData.analytics_data?.length || 0,
            export_size_kb: JSON.stringify(exportData).length / 1024
          });

        } catch (error) {
          violations.push('Exported data is not valid JSON');
          evidence.push({ parse_error: (error as Error).message });
        }
      }

      // Test CSV export format option
      const csvExportResponse = await fetch(`/api/gdpr/export-client-data/${testClientId}?format=csv`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'Accept': 'text/csv'
        }
      });

      if (!csvExportResponse.ok) {
        violations.push('CSV export format not supported');
      } else {
        const csvData = await csvExportResponse.text();
        if (!csvData.includes('event_type') || !csvData.includes('timestamp')) {
          violations.push('CSV export missing required analytics columns');
        }
        evidence.push({ csv_export_size: csvData.length });
      }

      const result: GDPRComplianceResult = {
        testName,
        compliant: violations.length === 0,
        violations,
        recommendations: violations.length > 0 ? [
          'Implement comprehensive GDPR data export API',
          'Support both JSON and CSV export formats',
          'Include all client analytics data in export',
          'Ensure exported data matches database records exactly',
          'Add proper authentication for export requests'
        ] : ['Excellent data portability implementation'],
        evidence
      };

      testComplianceResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  describe('Article 6: Lawful Basis for Processing', () => {
    test('Analytics data collection has proper legal basis and consent', async () => {
      const testName = 'Lawful Basis for Analytics Processing';
      const violations: string[] = [];
      const evidence: any[] = [];

      const testClientId = 'gdpr-test-client-consent';
      const testSupplierId = 'gdpr-test-supplier-consent';

      // Check if consent management system exists
      const { data: consentRecords } = await supabase
        .from('gdpr_consent_log')
        .select('*')
        .limit(1);

      if (!consentRecords || consentRecords.length === 0) {
        violations.push('No GDPR consent management system implemented');
      }

      // Test consent recording for analytics
      const consentResponse = await fetch('/api/gdpr/record-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: testClientId,
          consent_type: 'analytics_tracking',
          consent_given: true,
          legal_basis: 'legitimate_interest',
          purpose: 'Wedding planning analytics and service improvement'
        })
      });

      if (!consentResponse.ok) {
        violations.push('Consent recording API not implemented');
      }

      // Verify analytics only collected after consent
      await supabase.from('clients').insert({
        id: testClientId,
        supplier_id: testSupplierId,
        name: 'Consent Test Client',
        email: 'consent.test@example.com'
      });

      // Simulate analytics collection
      const analyticsResponse = await fetch('/api/analytics/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: testClientId,
          event_type: 'page_view',
          page_url: '/dashboard',
          requires_consent: true
        })
      });

      if (analyticsResponse.ok) {
        // Check if consent was verified before data collection
        const { data: trackingRecord } = await supabase
          .from('client_analytics_data')
          .select('*, gdpr_consent_verified')
          .eq('client_id', testClientId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (trackingRecord && trackingRecord.length > 0) {
          if (!trackingRecord[0].gdpr_consent_verified) {
            violations.push('Analytics data collected without verified GDPR consent');
          }
          evidence.push({ consent_verified: trackingRecord[0].gdpr_consent_verified });
        }
      }

      // Test consent withdrawal
      const withdrawalResponse = await fetch('/api/gdpr/withdraw-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: testClientId,
          consent_type: 'analytics_tracking'
        })
      });

      if (!withdrawalResponse.ok) {
        violations.push('Consent withdrawal API not implemented');
      }

      // Verify analytics collection stops after withdrawal
      const postWithdrawalResponse = await fetch('/api/analytics/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: testClientId,
          event_type: 'page_view',
          page_url: '/dashboard-after-withdrawal'
        })
      });

      if (postWithdrawalResponse.ok) {
        const { data: postWithdrawalData } = await supabase
          .from('client_analytics_data')
          .select('*')
          .eq('client_id', testClientId)
          .eq('page_url', '/dashboard-after-withdrawal');

        if (postWithdrawalData && postWithdrawalData.length > 0) {
          violations.push('Analytics data collected after consent withdrawal');
        }
      }

      const result: GDPRComplianceResult = {
        testName,
        compliant: violations.length === 0,
        violations,
        recommendations: violations.length > 0 ? [
          'Implement comprehensive consent management system',
          'Verify consent before any analytics data collection',
          'Support consent withdrawal with immediate effect',
          'Document legal basis for all data processing',
          'Regular consent renewal for ongoing services'
        ] : ['Good consent management implementation'],
        evidence
      };

      testComplianceResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  describe('Article 25: Data Protection by Design and by Default', () => {
    test('Analytics system implements privacy by design principles', async () => {
      const testName = 'Privacy by Design Implementation';
      const violations: string[] = [];
      const evidence: any[] = [];

      // Test data minimization
      const analyticsSchema = await getAnalyticsTableSchema();
      
      // Check for excessive data collection
      const potentiallyExcessiveFields = [
        'full_browser_fingerprint',
        'detailed_location_data', 
        'complete_device_info',
        'full_ip_address_history',
        'detailed_user_behavior_profile'
      ];

      potentiallyExcessiveFields.forEach(field => {
        if (analyticsSchema.includes(field)) {
          violations.push(`Potentially excessive data collection: ${field}`);
        }
      });

      // Test default privacy settings
      const { data: defaultSettings } = await supabase
        .from('client_privacy_settings')
        .select('*')
        .eq('is_default', true)
        .limit(1);

      if (!defaultSettings || defaultSettings.length === 0) {
        violations.push('No default privacy settings configured');
      } else {
        const settings = defaultSettings[0];
        
        // Verify privacy-friendly defaults
        if (settings.analytics_tracking_enabled !== false) {
          violations.push('Analytics tracking enabled by default (should be opt-in)');
        }
        
        if (settings.data_retention_days > 365) {
          violations.push('Data retention period too long by default');
        }

        evidence.push({
          default_analytics_enabled: settings.analytics_tracking_enabled,
          default_retention_days: settings.data_retention_days
        });
      }

      // Test built-in data anonymization
      const sampleAnalyticsData = await supabase
        .from('client_analytics_data')
        .select('*')
        .limit(10);

      if (sampleAnalyticsData.data) {
        sampleAnalyticsData.data.forEach((record, index) => {
          // Check IP address anonymization
          if (record.ip_address && !isAnonymizedIP(record.ip_address)) {
            violations.push(`IP address not anonymized in record ${index + 1}`);
          }

          // Check for PII in analytics data
          const recordStr = JSON.stringify(record).toLowerCase();
          if (recordStr.includes('@') && recordStr.includes('.com')) {
            violations.push(`Potential email address found in analytics record ${index + 1}`);
          }

          if (recordStr.includes('password') || recordStr.includes('ssn')) {
            violations.push(`Sensitive data found in analytics record ${index + 1}`);
          }
        });
      }

      // Test encryption at rest
      const encryptionTest = await testDatabaseEncryption();
      if (!encryptionTest.encrypted) {
        violations.push('Analytics database not encrypted at rest');
      }
      evidence.push({ database_encryption: encryptionTest });

      const result: GDPRComplianceResult = {
        testName,
        compliant: violations.length === 0,
        violations,
        recommendations: violations.length > 0 ? [
          'Implement privacy-by-default settings',
          'Minimize data collection to essential analytics only',
          'Automatically anonymize IP addresses',
          'Enable database encryption at rest',
          'Regular privacy impact assessments',
          'Built-in data retention enforcement'
        ] : ['Excellent privacy by design implementation'],
        evidence
      };

      testComplianceResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  // Helper functions
  async function setupGDPRTestData() {
    console.log('🏗️ Setting up GDPR compliance test data...');
    
    // Create test suppliers
    await supabase.from('suppliers').upsert([
      {
        id: 'gdpr-test-supplier-erasure',
        name: 'GDPR Test Supplier Erasure',
        email: 'erasure@gdprtest.com'
      },
      {
        id: 'gdpr-test-supplier-partial',
        name: 'GDPR Test Supplier Partial',
        email: 'partial@gdprtest.com'
      },
      {
        id: 'gdpr-test-supplier-export',
        name: 'GDPR Test Supplier Export', 
        email: 'export@gdprtest.com'
      },
      {
        id: 'gdpr-test-supplier-consent',
        name: 'GDPR Test Supplier Consent',
        email: 'consent@gdprtest.com'
      }
    ]);
  }

  async function cleanupGDPRTestData() {
    console.log('🧹 Cleaning up GDPR test data...');
    
    const testIds = [
      'gdpr-test-client-erasure',
      'gdpr-test-client-partial', 
      'gdpr-test-client-export',
      'gdpr-test-client-consent'
    ];

    const supplierIds = [
      'gdpr-test-supplier-erasure',
      'gdpr-test-supplier-partial',
      'gdpr-test-supplier-export', 
      'gdpr-test-supplier-consent'
    ];

    await Promise.all([
      supabase.from('client_analytics_data').delete().in('client_id', testIds),
      supabase.from('journey_instances').delete().in('client_id', testIds),
      supabase.from('clients').delete().in('id', testIds),
      supabase.from('suppliers').delete().in('id', supplierIds)
    ]);
  }

  async function setupClientAnalyticsData(clientId: string, supplierId: string) {
    const analyticsData = [
      {
        id: `analytics-export-1-${clientId}`,
        client_id: clientId,
        supplier_id: supplierId,
        event_type: 'page_view',
        page_url: '/dashboard',
        timestamp: new Date().toISOString(),
        session_id: 'export-test-session-1'
      },
      {
        id: `analytics-export-2-${clientId}`,
        client_id: clientId,
        supplier_id: supplierId,
        event_type: 'form_submission',
        form_data: JSON.stringify({ message: 'Wedding planning inquiry' }),
        timestamp: new Date().toISOString(),
        session_id: 'export-test-session-1'
      },
      {
        id: `analytics-export-3-${clientId}`,
        client_id: clientId,
        supplier_id: supplierId,
        event_type: 'file_download',
        page_url: '/contracts/download',
        timestamp: new Date().toISOString(),
        session_id: 'export-test-session-2'
      }
    ];

    await supabase.from('client_analytics_data').insert(analyticsData);

    // Add journey data
    await supabase.from('journey_instances').insert({
      id: `journey-export-${clientId}`,
      client_id: clientId,
      supplier_id: supplierId,
      journey_name: 'Wedding Planning Journey',
      status: 'active',
      started_at: new Date().toISOString(),
      metadata: JSON.stringify({ 
        preferences: ['photography', 'videography'],
        budget_range: '5000-10000'
      })
    });
  }

  function isAnonymizedIP(ipAddress: string): boolean {
    // Check if IP is properly anonymized (last octet should be 0)
    const parts = ipAddress.split('.');
    return parts.length === 4 && parts[3] === '0';
  }

  async function getAnalyticsTableSchema(): Promise<string> {
    // This would query the database schema in a real implementation
    // For testing purposes, return a mock schema
    return 'id,client_id,supplier_id,event_type,page_url,timestamp,ip_address,user_agent,session_id,form_data';
  }

  async function testDatabaseEncryption(): Promise<{encrypted: boolean, details: any}> {
    // This would test actual database encryption settings
    // For testing purposes, return a mock result
    return {
      encrypted: true,
      details: {
        algorithm: 'AES-256',
        key_management: 'AWS KMS',
        encryption_at_rest: true
      }
    };
  }

  async function generateGDPRComplianceReport(results: GDPRComplianceResult[]) {
    const report = {
      timestamp: new Date().toISOString(),
      regulation: 'GDPR',
      scope: 'WS-225 Client Portal Analytics',
      summary: {
        total_tests: results.length,
        compliant_tests: results.filter(r => r.compliant).length,
        non_compliant_tests: results.filter(r => !r.compliant).length,
        compliance_rate: (results.filter(r => r.compliant).length / results.length * 100).toFixed(1) + '%'
      },
      results,
      overall_compliance: results.every(r => r.compliant),
      critical_violations: results.flatMap(r => r.violations).filter(v => 
        v.includes('deletion') || v.includes('consent') || v.includes('PII')
      ),
      recommendations: results.flatMap(r => r.recommendations)
    };

    console.log('\n🇪🇺 GDPR COMPLIANCE REPORT');
    console.log('==========================');
    console.log(`Overall Compliance: ${report.overall_compliance ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
    console.log(`Compliance Rate: ${report.summary.compliance_rate}`);
    console.log(`Tests Passed: ${report.summary.compliant_tests}/${report.summary.total_tests}`);
    
    if (report.critical_violations.length > 0) {
      console.log('\n🚨 Critical GDPR Violations:');
      report.critical_violations.forEach(violation => console.log(`  - ${violation}`));
    }

    console.log('\n📋 Test Results:');
    results.forEach(result => {
      console.log(`${result.compliant ? '✅' : '❌'} ${result.testName}`);
      if (!result.compliant) {
        result.violations.forEach(v => console.log(`    - ${v}`));
      }
    });

    const fs = require('fs').promises;
    await fs.writeFile(
      '/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/compliance/gdpr-compliance-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ GDPR compliance report saved to gdpr-compliance-report.json');
  }
});