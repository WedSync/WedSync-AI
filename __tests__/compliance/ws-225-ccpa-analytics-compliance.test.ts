// WS-225 CCPA Analytics Compliance Testing  
// Tests California Consumer Privacy Act compliance for client portal analytics

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

interface CCPAComplianceResult {
  testName: string;
  compliant: boolean;
  violations: string[];
  recommendations: string[];
  evidence: any[];
}

describe('WS-225 CCPA Analytics Compliance', () => {
  let supabase: ReturnType<typeof createClient>;
  let testComplianceResults: CCPAComplianceResult[] = [];

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await setupCCPATestData();
  });

  afterAll(async () => {
    await cleanupCCPATestData();
    await generateCCPAComplianceReport(testComplianceResults);
  });

  describe('Right to Know - Consumer Data Disclosure', () => {
    test('Consumer can request information about collected personal data', async () => {
      const testName = 'CCPA Right to Know - Data Collection Disclosure';
      const violations: string[] = [];
      const evidence: any[] = [];

      const testClientId = 'ccpa-test-client-know';
      const testSupplierId = 'ccpa-test-supplier-know';

      await setupClientWithAnalytics(testClientId, testSupplierId);

      // Test the "Right to Know" request endpoint
      const knowResponse = await fetch('/api/ccpa/consumer-data-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: testClientId,
          request_type: 'right_to_know',
          consumer_email: 'ccpa.know@example.com',
          verification_method: 'email'
        })
      });

      if (!knowResponse.ok) {
        violations.push('CCPA Right to Know endpoint not implemented');
        evidence.push({ know_response_status: knowResponse.status });
      } else {
        try {
          const disclosureData = await knowResponse.json();

          // CCPA requires disclosure of specific information categories
          const requiredDisclosures = [
            'categories_collected',
            'sources_of_information',
            'business_purposes',
            'categories_shared',
            'third_parties_shared_with'
          ];

          requiredDisclosures.forEach(disclosure => {
            if (!disclosureData[disclosure]) {
              violations.push(`Missing required CCPA disclosure: ${disclosure}`);
            }
          });

          // Verify analytics data categorization
          if (disclosureData.categories_collected) {
            const categories = disclosureData.categories_collected;
            
            // Should include wedding industry relevant categories
            const expectedCategories = [
              'identifiers',
              'internet_activity',
              'commercial_information',
              'geolocation_data',
              'professional_information'
            ];

            expectedCategories.forEach(category => {
              if (!categories.includes(category)) {
                violations.push(`Missing analytics data category: ${category}`);
              }
            });

            evidence.push({ disclosed_categories: categories });
          }

          // Verify business purposes are specific to wedding services
          if (disclosureData.business_purposes) {
            const purposes = disclosureData.business_purposes;
            const weddingPurposes = [
              'wedding_planning_analytics',
              'vendor_service_improvement',
              'customer_journey_optimization'
            ];

            let hasWeddingSpecificPurposes = false;
            weddingPurposes.forEach(purpose => {
              if (purposes.some((p: string) => p.includes(purpose))) {
                hasWeddingSpecificPurposes = true;
              }
            });

            if (!hasWeddingSpecificPurposes) {
              violations.push('Business purposes not specific to wedding services');
            }

            evidence.push({ business_purposes: purposes });
          }

          // Check for sale disclosure (important for CCPA)
          if (!disclosureData.personal_info_sold) {
            violations.push('Missing disclosure about whether personal information is sold');
          } else {
            evidence.push({ 
              personal_info_sold: disclosureData.personal_info_sold,
              sale_details: disclosureData.sale_details || 'Not disclosed'
            });
          }

        } catch (error) {
          violations.push('CCPA disclosure response is not valid JSON');
          evidence.push({ parse_error: (error as Error).message });
        }
      }

      // Test 12-month data disclosure requirement
      const historicalResponse = await fetch(`/api/ccpa/historical-data/${testClientId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!historicalResponse.ok) {
        violations.push('12-month historical data disclosure not available');
      } else {
        const historicalData = await historicalResponse.json();
        
        if (!historicalData.time_range || !historicalData.time_range.includes('12 months')) {
          violations.push('Historical data disclosure does not cover required 12-month period');
        }

        evidence.push({ 
          historical_data_period: historicalData.time_range,
          record_count: historicalData.records?.length || 0
        });
      }

      const result: CCPAComplianceResult = {
        testName,
        compliant: violations.length === 0,
        violations,
        recommendations: violations.length > 0 ? [
          'Implement comprehensive CCPA consumer data request endpoint',
          'Provide detailed categorization of collected analytics data',
          'Include wedding industry specific business purposes',
          'Clearly disclose information sharing and sale practices',
          'Ensure 12-month historical data availability'
        ] : ['Excellent CCPA Right to Know implementation'],
        evidence
      };

      testComplianceResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  describe('Right to Delete Personal Information', () => {
    test('Consumer can request deletion of personal analytics data', async () => {
      const testName = 'CCPA Right to Delete';
      const violations: string[] = [];
      const evidence: any[] = [];

      const testClientId = 'ccpa-test-client-delete';
      const testSupplierId = 'ccpa-test-supplier-delete';

      await setupClientWithAnalytics(testClientId, testSupplierId);

      // Verify initial data exists
      const { data: initialData } = await supabase
        .from('client_analytics_data')
        .select('*')
        .eq('client_id', testClientId);

      evidence.push({ initial_record_count: initialData?.length || 0 });

      // Submit deletion request
      const deleteResponse = await fetch('/api/ccpa/delete-personal-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: testClientId,
          consumer_email: 'ccpa.delete@example.com',
          deletion_categories: ['identifiers', 'internet_activity', 'commercial_information'],
          verification_code: 'CCPA-DELETE-123'
        })
      });

      if (!deleteResponse.ok) {
        violations.push('CCPA deletion request endpoint not implemented');
        evidence.push({ delete_response_status: deleteResponse.status });
      } else {
        const deleteResult = await deleteResponse.json();
        
        // CCPA requires acknowledgment within specific timeframes
        if (!deleteResult.acknowledgment_date) {
          violations.push('Deletion request acknowledgment date not provided');
        }

        if (!deleteResult.estimated_completion_date) {
          violations.push('Deletion completion estimate not provided');
        }

        // Check deletion timeframe (CCPA allows up to 45 days)
        if (deleteResult.estimated_completion_date) {
          const completionDate = new Date(deleteResult.estimated_completion_date);
          const requestDate = new Date();
          const daysDifference = Math.ceil((completionDate.getTime() - requestDate.getTime()) / (1000 * 3600 * 24));
          
          if (daysDifference > 45) {
            violations.push('Deletion completion estimate exceeds CCPA 45-day requirement');
          }

          evidence.push({ 
            estimated_completion_days: daysDifference,
            within_ccpa_timeframe: daysDifference <= 45
          });
        }

        evidence.push({ deletion_response: deleteResult });
      }

      // Wait for deletion processing (simulate)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify actual deletion
      const { data: remainingData } = await supabase
        .from('client_analytics_data')
        .select('*')
        .eq('client_id', testClientId);

      if (remainingData && remainingData.length > 0) {
        // Check if remaining data is properly anonymized
        let properlyAnonymized = true;
        remainingData.forEach(record => {
          if (record.ip_address && !isAnonymizedIP(record.ip_address)) {
            properlyAnonymized = false;
          }
          if (record.user_agent && record.user_agent.includes('ccpa.delete@example.com')) {
            properlyAnonymized = false;
          }
        });

        if (!properlyAnonymized) {
          violations.push('Personal information not properly deleted or anonymized');
        }

        evidence.push({ 
          remaining_record_count: remainingData.length,
          properly_anonymized: properlyAnonymized
        });
      } else {
        evidence.push({ complete_deletion: true });
      }

      // Check deletion log for audit trail
      const { data: deletionLog } = await supabase
        .from('ccpa_deletion_log')
        .select('*')
        .eq('client_id', testClientId);

      if (!deletionLog || deletionLog.length === 0) {
        violations.push('No CCPA deletion audit log created');
      } else {
        evidence.push({ deletion_audit_log: deletionLog[0] });
      }

      const result: CCPAComplianceResult = {
        testName,
        compliant: violations.length === 0,
        violations,
        recommendations: violations.length > 0 ? [
          'Implement CCPA compliant deletion request processing',
          'Provide timely acknowledgment of deletion requests',
          'Complete deletions within 45-day CCPA requirement',
          'Maintain proper audit logs for deletion requests',
          'Ensure complete removal or proper anonymization of personal data'
        ] : ['Good CCPA deletion compliance'],
        evidence
      };

      testComplianceResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  describe('Right to Opt-Out of Sale', () => {
    test('Consumer can opt-out of personal information sale', async () => {
      const testName = 'CCPA Right to Opt-Out of Sale';
      const violations: string[] = [];
      const evidence: any[] = [];

      const testClientId = 'ccpa-test-client-optout';
      const testSupplierId = 'ccpa-test-supplier-optout';

      await setupClientWithAnalytics(testClientId, testSupplierId);

      // Check if "Do Not Sell My Personal Information" link exists
      const optOutPageResponse = await fetch('/api/ccpa/do-not-sell', {
        method: 'GET'
      });

      if (!optOutPageResponse.ok) {
        violations.push('"Do Not Sell My Personal Information" page/endpoint not available');
      }

      // Test opt-out submission
      const optOutResponse = await fetch('/api/ccpa/opt-out-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: testClientId,
          consumer_email: 'ccpa.optout@example.com',
          opt_out_request: true,
          verification_method: 'email'
        })
      });

      if (!optOutResponse.ok) {
        violations.push('CCPA opt-out of sale endpoint not implemented');
        evidence.push({ opt_out_response_status: optOutResponse.status });
      } else {
        const optOutResult = await optOutResponse.json();
        
        if (!optOutResult.opt_out_effective_date) {
          violations.push('Opt-out effective date not provided');
        }

        if (!optOutResult.confirmation_number) {
          violations.push('Opt-out confirmation number not provided');
        }

        evidence.push({ opt_out_confirmation: optOutResult });
      }

      // Verify opt-out status is recorded
      const { data: optOutStatus } = await supabase
        .from('ccpa_opt_out_status')
        .select('*')
        .eq('client_id', testClientId);

      if (!optOutStatus || optOutStatus.length === 0) {
        violations.push('Opt-out status not recorded in database');
      } else {
        const status = optOutStatus[0];
        if (!status.opted_out || !status.effective_date) {
          violations.push('Opt-out status not properly recorded');
        }
        evidence.push({ recorded_opt_out_status: status });
      }

      // Test that data sharing stops after opt-out
      const sharingResponse = await fetch('/api/analytics/third-party-sharing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: testClientId,
          data_type: 'analytics_insights',
          third_party: 'marketing_partner'
        })
      });

      // Sharing should be blocked for opted-out clients
      if (sharingResponse.ok) {
        const sharingResult = await sharingResponse.json();
        if (sharingResult.sharing_allowed !== false) {
          violations.push('Data sharing not properly blocked after opt-out');
        }
      }

      // Test global privacy control recognition
      const gpcResponse = await fetch('/api/analytics/track-event', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Sec-GPC': '1' // Global Privacy Control header
        },
        body: JSON.stringify({
          client_id: testClientId,
          event_type: 'page_view',
          page_url: '/dashboard'
        })
      });

      if (gpcResponse.ok) {
        // Should respect GPC signal and not track for sale purposes
        const { data: gpcTracking } = await supabase
          .from('client_analytics_data')
          .select('*')
          .eq('client_id', testClientId)
          .eq('for_sale_purpose', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (gpcTracking && gpcTracking.length > 0) {
          violations.push('Global Privacy Control signal not respected');
        }
      }

      const result: CCPAComplianceResult = {
        testName,
        compliant: violations.length === 0,
        violations,
        recommendations: violations.length > 0 ? [
          'Implement "Do Not Sell My Personal Information" page and process',
          'Provide clear opt-out confirmation with tracking numbers',
          'Stop all data sharing immediately upon opt-out',
          'Recognize and respect Global Privacy Control signals',
          'Maintain accurate opt-out status records'
        ] : ['Good CCPA opt-out implementation'],
        evidence
      };

      testComplianceResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  describe('Non-Discrimination Protection', () => {
    test('Consumers are not discriminated against for exercising CCPA rights', async () => {
      const testName = 'CCPA Non-Discrimination Protection';
      const violations: string[] = [];
      const evidence: any[] = [];

      const controlClientId = 'ccpa-test-control-client';
      const optOutClientId = 'ccpa-test-optout-client';
      const deletionClientId = 'ccpa-test-deletion-client';
      const testSupplierId = 'ccpa-test-supplier-discrimination';

      // Set up clients with different CCPA request statuses
      await setupClientWithAnalytics(controlClientId, testSupplierId);
      await setupClientWithAnalytics(optOutClientId, testSupplierId);
      await setupClientWithAnalytics(deletionClientId, testSupplierId);

      // Record opt-out status for one client
      await supabase.from('ccpa_opt_out_status').insert({
        client_id: optOutClientId,
        opted_out: true,
        effective_date: new Date().toISOString()
      });

      // Record deletion request for another client
      await supabase.from('ccpa_deletion_log').insert({
        client_id: deletionClientId,
        deletion_requested: true,
        request_date: new Date().toISOString()
      });

      // Test service quality equality
      const serviceTestClients = [controlClientId, optOutClientId, deletionClientId];
      const serviceResponses = [];

      for (const clientId of serviceTestClients) {
        const serviceResponse = await fetch(`/api/clients/${clientId}/dashboard`, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer test-token' }
        });

        serviceResponses.push({
          client_id: clientId,
          response_status: serviceResponse.status,
          response_time: serviceResponse.headers.get('response-time') || 'not-measured'
        });
      }

      // Analyze service quality differences
      const statusCodes = serviceResponses.map(r => r.response_status);
      const uniqueStatuses = [...new Set(statusCodes)];

      if (uniqueStatuses.length > 1) {
        violations.push('Different service response codes based on CCPA request status');
        evidence.push({ service_responses: serviceResponses });
      }

      // Test feature access equality
      const featureTestEndpoints = [
        '/api/analytics/dashboard',
        '/api/clients/profile-update',
        '/api/weddings/timeline-access',
        '/api/vendors/communication'
      ];

      for (const endpoint of featureTestEndpoints) {
        const featureResponses = [];

        for (const clientId of serviceTestClients) {
          const featureResponse = await fetch(endpoint, {
            method: 'GET',
            headers: { 
              'Authorization': 'Bearer test-token',
              'X-Client-ID': clientId
            }
          });

          featureResponses.push({
            client_id: clientId,
            endpoint,
            status: featureResponse.status,
            access_granted: featureResponse.status === 200
          });
        }

        // Check for access discrimination
        const accessLevels = featureResponses.map(r => r.access_granted);
        const uniqueAccess = [...new Set(accessLevels)];

        if (uniqueAccess.length > 1) {
          violations.push(`Feature access discrimination detected for ${endpoint}`);
          evidence.push({ discriminatory_endpoint: endpoint, responses: featureResponses });
        }
      }

      // Test pricing equality (important for wedding services)
      const pricingResponses = [];
      
      for (const clientId of serviceTestClients) {
        const pricingResponse = await fetch(`/api/pricing/client-quotes/${clientId}`, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer test-token' }
        });

        if (pricingResponse.ok) {
          const pricingData = await pricingResponse.json();
          pricingResponses.push({
            client_id: clientId,
            base_pricing: pricingData.base_price || 0,
            premium_features: pricingData.premium_features || []
          });
        }
      }

      if (pricingResponses.length > 0) {
        const basePrices = pricingResponses.map(r => r.base_pricing);
        const uniquePrices = [...new Set(basePrices)];

        if (uniquePrices.length > 1) {
          violations.push('Price discrimination detected based on CCPA request status');
          evidence.push({ pricing_discrimination: pricingResponses });
        }
      }

      // Test for incentive offers (CCPA allows reasonable incentives)
      const incentiveResponse = await fetch('/api/ccpa/privacy-incentives', {
        method: 'GET'
      });

      if (incentiveResponse.ok) {
        const incentiveData = await incentiveResponse.json();
        
        // Verify incentives are reasonable and not coercive
        if (incentiveData.incentives) {
          incentiveData.incentives.forEach((incentive: any) => {
            if (incentive.type === 'mandatory_discount_loss') {
              violations.push('Coercive incentive offered for not exercising CCPA rights');
            }
            
            if (incentive.value_threshold && incentive.value_threshold > 100) {
              violations.push('Incentive value may be unreasonably high to discourage CCPA rights');
            }
          });

          evidence.push({ privacy_incentives: incentiveData.incentives });
        }
      }

      const result: CCPAComplianceResult = {
        testName,
        compliant: violations.length === 0,
        violations,
        recommendations: violations.length > 0 ? [
          'Ensure equal service quality regardless of CCPA request status',
          'Provide identical feature access to all clients',
          'Maintain consistent pricing without CCPA-based discrimination', 
          'Offer only reasonable incentives for data sharing',
          'Regular audits for discriminatory practices'
        ] : ['Excellent non-discrimination compliance'],
        evidence
      };

      testComplianceResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  describe('Business Information Disclosures', () => {
    test('Required CCPA business information disclosures are available', async () => {
      const testName = 'CCPA Business Disclosures';
      const violations: string[] = [];
      const evidence: any[] = [];

      // Test privacy policy availability and content
      const privacyPolicyResponse = await fetch('/privacy-policy', {
        method: 'GET'
      });

      if (!privacyPolicyResponse.ok) {
        violations.push('Privacy policy page not accessible');
      } else {
        const policyContent = await privacyPolicyResponse.text();
        
        // Required CCPA disclosures in privacy policy
        const requiredDisclosures = [
          'categories of personal information collected',
          'sources of personal information',
          'business purposes for collecting',
          'categories of third parties',
          'sale of personal information',
          'consumer rights under CCPA'
        ];

        requiredDisclosures.forEach(disclosure => {
          if (!policyContent.toLowerCase().includes(disclosure.toLowerCase())) {
            violations.push(`Privacy policy missing required CCPA disclosure: ${disclosure}`);
          }
        });

        // Check for wedding industry specific disclosures
        const weddingDisclosures = [
          'wedding planning data',
          'vendor relationship information',
          'event coordination data'
        ];

        let hasWeddingDisclosures = false;
        weddingDisclosures.forEach(disclosure => {
          if (policyContent.toLowerCase().includes(disclosure.toLowerCase())) {
            hasWeddingDisclosures = true;
          }
        });

        if (!hasWeddingDisclosures) {
          violations.push('Privacy policy lacks wedding industry specific data disclosures');
        }

        evidence.push({ 
          privacy_policy_length: policyContent.length,
          has_wedding_disclosures: hasWeddingDisclosures
        });
      }

      // Test "Do Not Sell My Personal Information" link prominence
      const homePageResponse = await fetch('/', {
        method: 'GET'
      });

      if (homePageResponse.ok) {
        const homePageContent = await homePageResponse.text();
        
        if (!homePageContent.includes('Do Not Sell My Personal Information')) {
          violations.push('"Do Not Sell" link not prominently displayed on homepage');
        }

        // Check link accessibility
        if (!homePageContent.includes('href="/do-not-sell"') && 
            !homePageContent.includes('href="/ccpa/do-not-sell"')) {
          violations.push('"Do Not Sell" link not properly implemented');
        }

        evidence.push({ has_do_not_sell_link: homePageContent.includes('Do Not Sell') });
      }

      // Test consumer rights explanation page
      const rightsResponse = await fetch('/ccpa/consumer-rights', {
        method: 'GET'
      });

      if (!rightsResponse.ok) {
        violations.push('CCPA consumer rights explanation page not available');
      } else {
        const rightsContent = await rightsResponse.text();
        
        const requiredRights = [
          'right to know',
          'right to delete',
          'right to opt-out',
          'right to non-discrimination'
        ];

        requiredRights.forEach(right => {
          if (!rightsContent.toLowerCase().includes(right.toLowerCase())) {
            violations.push(`Consumer rights page missing explanation of: ${right}`);
          }
        });

        evidence.push({ consumer_rights_explained: requiredRights.length });
      }

      // Test contact information for CCPA requests
      const contactResponse = await fetch('/api/ccpa/contact-info', {
        method: 'GET'
      });

      if (!contactResponse.ok) {
        violations.push('CCPA contact information not available');
      } else {
        const contactData = await contactResponse.json();
        
        const requiredContactInfo = ['email', 'phone', 'mailing_address'];
        requiredContactInfo.forEach(info => {
          if (!contactData[info]) {
            violations.push(`Missing CCPA contact information: ${info}`);
          }
        });

        if (contactData.response_timeframe && contactData.response_timeframe > 45) {
          violations.push('Promised response timeframe exceeds CCPA 45-day limit');
        }

        evidence.push({ ccpa_contact_info: contactData });
      }

      const result: CCPAComplianceResult = {
        testName,
        compliant: violations.length === 0,
        violations,
        recommendations: violations.length > 0 ? [
          'Update privacy policy with all required CCPA disclosures',
          'Add prominent "Do Not Sell" link to website',
          'Create comprehensive consumer rights explanation page',
          'Provide clear contact information for CCPA requests',
          'Include wedding industry specific data processing disclosures'
        ] : ['Good CCPA business disclosure compliance'],
        evidence
      };

      testComplianceResults.push(result);
      expect(violations.length).toBe(0);
    });
  });

  // Helper functions
  async function setupCCPATestData() {
    console.log('🏗️ Setting up CCPA compliance test data...');
    
    const suppliers = [
      { id: 'ccpa-test-supplier-know', name: 'CCPA Test Supplier Know', email: 'know@ccpatest.com' },
      { id: 'ccpa-test-supplier-delete', name: 'CCPA Test Supplier Delete', email: 'delete@ccpatest.com' },
      { id: 'ccpa-test-supplier-optout', name: 'CCPA Test Supplier OptOut', email: 'optout@ccpatest.com' },
      { id: 'ccpa-test-supplier-discrimination', name: 'CCPA Test Supplier Discrimination', email: 'discrimination@ccpatest.com' }
    ];

    await supabase.from('suppliers').upsert(suppliers);
  }

  async function cleanupCCPATestData() {
    console.log('🧹 Cleaning up CCPA test data...');
    
    const testClientIds = [
      'ccpa-test-client-know',
      'ccpa-test-client-delete', 
      'ccpa-test-client-optout',
      'ccpa-test-control-client',
      'ccpa-test-optout-client',
      'ccpa-test-deletion-client'
    ];

    const testSupplierIds = [
      'ccpa-test-supplier-know',
      'ccpa-test-supplier-delete',
      'ccpa-test-supplier-optout',
      'ccpa-test-supplier-discrimination'
    ];

    await Promise.all([
      supabase.from('client_analytics_data').delete().in('client_id', testClientIds),
      supabase.from('ccpa_opt_out_status').delete().in('client_id', testClientIds),
      supabase.from('ccpa_deletion_log').delete().in('client_id', testClientIds),
      supabase.from('journey_instances').delete().in('client_id', testClientIds),
      supabase.from('clients').delete().in('id', testClientIds),
      supabase.from('suppliers').delete().in('id', testSupplierIds)
    ]);
  }

  async function setupClientWithAnalytics(clientId: string, supplierId: string) {
    // Create client
    await supabase.from('clients').insert({
      id: clientId,
      supplier_id: supplierId,
      name: `CCPA Test Client ${clientId}`,
      email: `${clientId}@example.com`,
      wedding_date: '2025-08-15',
      created_at: new Date().toISOString()
    });

    // Create analytics data
    const analyticsData = [
      {
        id: `analytics-${clientId}-1`,
        client_id: clientId,
        supplier_id: supplierId,
        event_type: 'page_view',
        page_url: '/dashboard',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 Test Browser',
        timestamp: new Date().toISOString(),
        session_id: `session-${clientId}`
      },
      {
        id: `analytics-${clientId}-2`, 
        client_id: clientId,
        supplier_id: supplierId,
        event_type: 'form_interaction',
        form_data: JSON.stringify({ 
          form_type: 'contact_form',
          preferences: ['photography', 'catering']
        }),
        timestamp: new Date().toISOString(),
        for_sale_purpose: true
      }
    ];

    await supabase.from('client_analytics_data').insert(analyticsData);

    // Create journey data
    await supabase.from('journey_instances').insert({
      id: `journey-${clientId}`,
      client_id: clientId,
      supplier_id: supplierId,
      journey_name: 'Wedding Planning Journey',
      status: 'active',
      metadata: JSON.stringify({
        wedding_type: 'outdoor',
        guest_count: 150,
        budget_range: '10000-15000'
      })
    });
  }

  function isAnonymizedIP(ipAddress: string): boolean {
    const parts = ipAddress.split('.');
    return parts.length === 4 && parts[3] === '0';
  }

  async function generateCCPAComplianceReport(results: CCPAComplianceResult[]) {
    const report = {
      timestamp: new Date().toISOString(),
      regulation: 'CCPA (California Consumer Privacy Act)',
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
        v.includes('discrimination') || v.includes('opt-out') || v.includes('deletion') || v.includes('disclosure')
      ),
      recommendations: results.flatMap(r => r.recommendations)
    };

    console.log('\n🏛️ CCPA COMPLIANCE REPORT');
    console.log('=========================');
    console.log(`Overall Compliance: ${report.overall_compliance ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
    console.log(`Compliance Rate: ${report.summary.compliance_rate}`);
    console.log(`Tests Passed: ${report.summary.compliant_tests}/${report.summary.total_tests}`);
    
    if (report.critical_violations.length > 0) {
      console.log('\n🚨 Critical CCPA Violations:');
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
      '/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/compliance/ccpa-compliance-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ CCPA compliance report saved to ccpa-compliance-report.json');
  }
});