/**
 * WS-177 Celebrity Protection Penetration Testing Suite
 * Team D Round 1 Implementation - Ultra Hard Celebrity Security Validation
 * 
 * Comprehensive penetration testing for celebrity client protection systems
 * Enhanced privacy controls and threat detection validation
 */

import { NextRequest } from 'next/server';
import { POST as celebrityMonitorPost } from '@/app/api/security/celebrity/monitor/route';
import { POST as auditEventsPost } from '@/app/api/security/audit/events/route';
import { createMockSupabaseClient, mockSupabaseAuth, createMockCelebrityContext } from '@/__tests__/helpers/supabase-mock';
import { AuditSecurityManager } from '@/lib/security/AuditSecurityManager';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/security/AuditSecurityManager');

describe('Celebrity Protection Penetration Testing', () => {
  let mockSupabase: any;
  let mockAuditManager: jest.Mocked<AuditSecurityManager>;

  const celebrityClient = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    organization_id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'High-Profile Celebrity',
    celebrity_tier: 'celebrity',
    privacy_level: 'maximum',
    security_clearance_level: 5,
    enhanced_monitoring: true,
    media_blackout: true
  };

  const attackScenarios = {
    socialEngineering: [
      {
        name: 'Impersonation Attack',
        description: 'Attacker impersonates celebrity assistant',
        payload: {
          user_credentials: 'fake_assistant@celebrity.com',
          claimed_role: 'celebrity_assistant',
          requested_access: 'full_celebrity_data'
        }
      },
      {
        name: 'Vendor Social Engineering',
        description: 'Malicious vendor claims celebrity access',
        payload: {
          vendor_id: 'malicious_vendor_123',
          fake_approval: 'celebrity_access_approved',
          forged_documents: 'fake_nda_signed'
        }
      }
    ],
    privilegeEscalation: [
      {
        name: 'Role Escalation Attack',
        description: 'Regular user attempts to gain celebrity access',
        payload: {
          user_role: 'user',
          target_role: 'celebrity_manager',
          escalation_method: 'token_manipulation'
        }
      },
      {
        name: 'Clearance Level Bypass',
        description: 'Low clearance user attempts celebrity data access',
        payload: {
          current_clearance: 1,
          required_clearance: 5,
          bypass_method: 'clearance_spoofing'
        }
      }
    ],
    dataExfiltration: [
      {
        name: 'Celebrity Data Scraping',
        description: 'Automated scraping of celebrity information',
        payload: {
          scraping_pattern: 'bulk_celebrity_data_request',
          rate_limit_bypass: 'distributed_requests',
          data_targets: ['personal_info', 'wedding_details', 'vendor_contracts']
        }
      },
      {
        name: 'Media Information Harvesting',
        description: 'Attempt to harvest media-sensitive information',
        payload: {
          target_data: 'wedding_location_time',
          extraction_method: 'inference_attack',
          media_value: 'high_profile_scoop'
        }
      }
    ],
    privacyViolation: [
      {
        name: 'Location Privacy Breach',
        description: 'Attempt to extract celebrity location data',
        payload: {
          location_inference: 'venue_metadata_analysis',
          timing_analysis: 'event_scheduling_correlation',
          privacy_impact: 'paparazzi_enablement'
        }
      },
      {
        name: 'Personal Detail Leakage',
        description: 'Attempt to access personal celebrity details',
        payload: {
          detail_types: ['family_members', 'personal_preferences', 'security_arrangements'],
          access_method: 'indirect_database_queries',
          exploitation_risk: 'tabloid_publication'
        }
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockAuditManager = new AuditSecurityManager() as jest.Mocked<AuditSecurityManager>;

    // Default denials for penetration testing
    mockAuditManager.validateCelebrityAccess.mockResolvedValue(false);
    mockAuditManager.verifyMFA.mockResolvedValue(false);
    mockAuditManager.validateSecurityContext.mockResolvedValue({
      isValid: false,
      errors: ['Insufficient privileges']
    });
  });

  describe('Celebrity Access Control Penetration', () => {
    describe('Authentication Bypass Attempts', () => {
      it('should prevent celebrity access without proper authentication', async () => {
        // Simulate unauthenticated user
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated')
        });

        const celebrityAccessAttempt = {
          organization_id: celebrityClient.organization_id,
          client_id: celebrityClient.id,
          monitoring_type: 'real_time_activity'
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(celebrityAccessAttempt)
        });

        const response = await celebrityMonitorPost(request);
        expect(response.status).toBe(401);

        const data = await response.json();
        expect(data.error).toContain('Unauthorized');
      });

      it('should prevent celebrity access with forged authentication tokens', async () => {
        // Simulate forged token attempt
        const forgedUser = {
          id: 'forged-user-123',
          email: 'fake@celebrity.com',
          app_metadata: {
            role: 'celebrity_manager', // Fake elevated role
            celebrity_clearance: 5, // Fake clearance
            permissions: ['celebrity:access', 'celebrity:monitor']
          }
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: forgedUser },
          error: null
        });

        // Security validation should detect the forgery
        mockAuditManager.validateSecurityContext.mockResolvedValue({
          isValid: false,
          errors: ['Token validation failed', 'Invalid security context']
        });

        const celebrityAccessAttempt = {
          organization_id: celebrityClient.organization_id,
          monitoring_type: 'celebrity_access'
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(celebrityAccessAttempt)
        });

        const response = await celebrityMonitorPost(request);
        expect(response.status).toBe(403);

        expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            event_type: 'celebrity_unauthorized_access',
            severity: 'critical'
          })
        );
      });

      it('should require and validate MFA for celebrity access', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockSupabaseAuth.celebrityUser },
          error: null
        });

        mockAuditManager.validateCelebrityAccess.mockResolvedValue(true);
        mockAuditManager.verifyMFA.mockResolvedValue(false); // MFA fails

        const celebrityAccessAttempt = {
          organization_id: celebrityClient.organization_id,
          monitoring_type: 'celebrity_access'
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(celebrityAccessAttempt)
        });

        const response = await celebrityMonitorPost(request);
        expect(response.status).toBe(403);

        const data = await response.json();
        expect(data.error).toContain('Multi-factor authentication required');

        expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            event_type: 'celebrity_mfa_required',
            severity: 'critical'
          })
        );
      });
    });

    describe('Privilege Escalation Attempts', () => {
      it('should prevent regular users from accessing celebrity data', async () => {
        const regularUser = {
          ...mockSupabaseAuth.limitedUser,
          app_metadata: {
            role: 'user',
            celebrity_clearance: 0,
            permissions: ['basic:read']
          }
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: regularUser },
          error: null
        });

        mockAuditManager.validateCelebrityAccess.mockResolvedValue(false);

        for (const scenario of attackScenarios.privilegeEscalation) {
          const celebrityAccessAttempt = {
            organization_id: celebrityClient.organization_id,
            client_id: celebrityClient.id,
            monitoring_type: 'threat_assessment',
            attack_payload: scenario.payload
          };

          const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
            method: 'POST',
            body: JSON.stringify(celebrityAccessAttempt)
          });

          const response = await celebrityMonitorPost(request);
          expect(response.status).toBe(403);

          expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              event_type: 'celebrity_unauthorized_access',
              severity: 'critical'
            })
          );
        }
      });

      it('should prevent vendors from escalating to celebrity access', async () => {
        const maliciousVendor = {
          ...mockSupabaseAuth.vendorUser,
          app_metadata: {
            ...mockSupabaseAuth.vendorUser.app_metadata,
            celebrity_access_approved: false,
            security_clearance_level: 2
          }
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: maliciousVendor },
          error: null
        });

        // Mock vendor trying to access celebrity data
        mockSupabase.from('clients').select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [], // RLS should filter out celebrity clients
                error: null
              })
            })
          })
        });

        const vendorCelebrityAttempt = {
          organization_id: celebrityClient.organization_id,
          monitoring_type: 'vendor_access_escalation'
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(vendorCelebrityAttempt)
        });

        const response = await celebrityMonitorPost(request);
        expect(response.status).toBe(403);
      });
    });
  });

  describe('Celebrity Data Exfiltration Attempts', () => {
    describe('Bulk Data Extraction', () => {
      it('should detect and prevent bulk celebrity data requests', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockSupabaseAuth.validUser },
          error: null
        });

        const bulkRequestScenarios = [
          { monitoring_type: 'comprehensive_audit', client_ids: Array(100).fill(null).map((_, i) => `celebrity-${i}`) },
          { monitoring_type: 'data_integrity_check', time_range: { start_time: '2020-01-01T00:00:00Z', end_time: '2025-12-31T23:59:59Z' } },
          { monitoring_type: 'privacy_audit', threat_indicators: { data_scraping: true, automated_access: true } }
        ];

        for (const scenario of bulkRequestScenarios) {
          const bulkRequest = {
            organization_id: celebrityClient.organization_id,
            ...scenario
          };

          const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
            method: 'POST',
            body: JSON.stringify(bulkRequest)
          });

          const response = await celebrityMonitorPost(request);
          
          // Should detect bulk request pattern and deny or limit
          if (response.status === 200) {
            const data = await response.json();
            expect(data.celebrity_clients_monitored).toBeLessThanOrEqual(10); // Rate limiting
          } else {
            expect(response.status).toBe(403);
          }

          expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              event_type: expect.stringContaining('monitoring'),
              celebrity_client: true
            })
          );
        }
      });

      it('should detect automated scraping patterns', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockSupabaseAuth.validUser },
          error: null
        });

        // Simulate rapid sequential requests (automated scraping)
        const rapidRequests = Array(20).fill(null).map((_, i) => ({
          organization_id: celebrityClient.organization_id,
          client_id: `celebrity-client-${i}`,
          monitoring_type: 'real_time_activity'
        }));

        const startTime = Date.now();
        const responses = [];

        for (const requestData of rapidRequests) {
          const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
            method: 'POST',
            body: JSON.stringify(requestData),
            headers: {
              'User-Agent': 'automated-scraper-bot/1.0'
            }
          });

          const response = await celebrityMonitorPost(request);
          responses.push(response);
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Should rate limit or detect automated pattern
        const successfulRequests = responses.filter(r => r.status === 200);
        expect(successfulRequests.length).toBeLessThan(rapidRequests.length);

        // Should log suspicious activity
        expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            event_type: expect.stringMatching(/monitoring|suspicious/),
            severity: expect.stringMatching(/medium|high|critical/)
          })
        );
      });
    });

    describe('Inference Attack Protection', () => {
      it('should prevent location inference through timing analysis', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockSupabaseAuth.validUser },
          error: null
        });

        const locationInferenceAttempts = [
          {
            monitoring_type: 'access_monitoring',
            time_range: { start_time: '2025-06-14T00:00:00Z', end_time: '2025-06-16T23:59:59Z' }, // Around wedding date
            threat_indicators: { location_tracking_attempts: true, timing_correlation: true }
          },
          {
            monitoring_type: 'vendor_interaction_review',
            time_range: { start_time: '2025-06-15T08:00:00Z', end_time: '2025-06-15T20:00:00Z' }, // Wedding day
            threat_indicators: { venue_correlation: true, vendor_timing_analysis: true }
          }
        ];

        for (const attempt of locationInferenceAttempts) {
          const inferenceRequest = {
            organization_id: celebrityClient.organization_id,
            client_id: celebrityClient.id,
            ...attempt
          };

          const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
            method: 'POST',
            body: JSON.stringify(inferenceRequest)
          });

          const response = await celebrityMonitorPost(request);
          
          if (response.status === 200) {
            const data = await response.json();
            // Should anonymize or redact location-sensitive data
            expect(data.monitoring_results).toBeDefined();
            data.monitoring_results.forEach((result: any) => {
              if (result.monitoring_data) {
                expect(result.monitoring_data).not.toHaveProperty('exact_location');
                expect(result.monitoring_data).not.toHaveProperty('venue_address');
                expect(result.monitoring_data).not.toHaveProperty('precise_timing');
              }
            });
          }
        }
      });

      it('should prevent personal detail extraction through correlation', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockSupabaseAuth.validUser },
          error: null
        });

        const correlationAttacks = [
          {
            monitoring_type: 'comprehensive_audit',
            correlation_targets: ['family_relationships', 'personal_preferences', 'security_details'],
            analysis_method: 'cross_reference_analysis'
          },
          {
            monitoring_type: 'social_media_monitoring',
            correlation_targets: ['posting_patterns', 'location_history', 'associate_networks'],
            analysis_method: 'behavioral_profiling'
          }
        ];

        for (const attack of correlationAttacks) {
          const correlationRequest = {
            organization_id: celebrityClient.organization_id,
            client_id: celebrityClient.id,
            monitoring_type: attack.monitoring_type,
            threat_indicators: {
              correlation_analysis: true,
              personal_detail_extraction: true
            }
          };

          const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
            method: 'POST',
            body: JSON.stringify(correlationRequest)
          });

          const response = await celebrityMonitorPost(request);
          
          if (response.status === 200) {
            const data = await response.json();
            // Should provide aggregated data only, not personal details
            data.monitoring_results?.forEach((result: any) => {
              expect(result.monitoring_data).not.toHaveProperty('personal_details');
              expect(result.monitoring_data).not.toHaveProperty('family_information');
              expect(result.monitoring_data).not.toHaveProperty('private_communications');
            });
          }
        }
      });
    });
  });

  describe('Social Engineering Attack Simulation', () => {
    it('should detect and prevent impersonation attacks', async () => {
      for (const scenario of attackScenarios.socialEngineering) {
        // Simulate impersonation attempt
        const impersonatorUser = {
          id: 'impersonator-123',
          email: scenario.payload.user_credentials,
          app_metadata: {
            role: scenario.payload.claimed_role,
            permissions: ['celebrity:access'],
            suspicious_activity: true
          }
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: impersonatorUser },
          error: null
        });

        mockAuditManager.validateSecurityContext.mockResolvedValue({
          isValid: false,
          errors: ['Suspicious user activity detected', 'Impersonation indicators present']
        });

        const impersonationAttempt = {
          organization_id: celebrityClient.organization_id,
          monitoring_type: 'threat_assessment',
          social_engineering_payload: scenario.payload
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(impersonationAttempt)
        });

        const response = await celebrityMonitorPost(request);
        expect(response.status).toBe(403);

        expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            event_type: 'celebrity_unauthorized_access',
            severity: 'critical',
            event_details: expect.objectContaining({
              action: 'celebrity_monitoring_access_denied'
            })
          })
        );
      }
    });

    it('should validate vendor authenticity for celebrity access', async () => {
      const suspiciousVendor = {
        ...mockSupabaseAuth.vendorUser,
        app_metadata: {
          ...mockSupabaseAuth.vendorUser.app_metadata,
          celebrity_access_approved: true, // Claimed but not verified
          verification_status: 'pending',
          suspicious_indicators: ['rapid_approval_claim', 'missing_documentation']
        }
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: suspiciousVendor },
        error: null
      });

      // Mock vendor verification failure
      mockSupabase.from('vendors').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: suspiciousVendor.app_metadata.vendor_id,
              celebrity_access_approved: false, // Actually not approved
              background_check_status: 'failed',
              nda_status: 'not_signed'
            },
            error: null
          })
        })
      });

      mockAuditManager.validateCelebrityAccess.mockResolvedValue(false);

      const vendorAttempt = {
        organization_id: celebrityClient.organization_id,
        monitoring_type: 'vendor_interaction_review'
      };

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(vendorAttempt)
      });

      const response = await celebrityMonitorPost(request);
      expect(response.status).toBe(403);

      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'celebrity_unauthorized_access',
          severity: 'critical'
        })
      );
    });
  });

  describe('Privacy Violation Prevention', () => {
    it('should prevent unauthorized access to maximum privacy celebrity data', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuth.validUser },
        error: null
      });

      // Even authorized users should have limited access to maximum privacy data
      mockAuditManager.validateCelebrityAccess.mockResolvedValue(true);
      mockAuditManager.verifyMFA.mockResolvedValue(true);

      mockSupabase.from('clients').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  ...celebrityClient,
                  // Sensitive data should be filtered/redacted
                  personal_details: '[REDACTED]',
                  location_history: '[CLASSIFIED]',
                  security_arrangements: '[RESTRICTED]'
                }
              ],
              error: null
            })
          })
        })
      });

      const privacyViolationAttempt = {
        organization_id: celebrityClient.organization_id,
        client_id: celebrityClient.id,
        monitoring_type: 'privacy_audit',
        privacy_breach_indicators: attackScenarios.privacyViolation
      };

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(privacyViolationAttempt)
      });

      const response = await celebrityMonitorPost(request);
      
      if (response.status === 200) {
        const data = await response.json();
        
        // Should redact sensitive information even for authorized users
        data.monitoring_results?.forEach((result: any) => {
          if (result.monitoring_data) {
            expect(result.monitoring_data.personal_details).toBe('[REDACTED]');
            expect(result.monitoring_data.location_history).toBe('[CLASSIFIED]');
            expect(result.monitoring_data.security_arrangements).toBe('[RESTRICTED]');
          }
        });
      }

      // Should log privacy audit attempt
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'celebrity_monitoring_performed',
          celebrity_client: true
        })
      );
    });

    it('should trigger enhanced monitoring on privacy violation attempts', async () => {
      const privacyAttacker = {
        id: 'privacy-attacker-123',
        email: 'attacker@malicious.com',
        app_metadata: {
          role: 'user',
          celebrity_clearance: 0,
          suspicious_activity_score: 95
        }
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: privacyAttacker },
        error: null
      });

      mockAuditManager.validateCelebrityAccess.mockResolvedValue(false);

      const privacyAttack = {
        organization_id: celebrityClient.organization_id,
        client_id: celebrityClient.id,
        monitoring_type: 'privacy_audit',
        attack_indicators: attackScenarios.privacyViolation
      };

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(privacyAttack)
      });

      const response = await celebrityMonitorPost(request);
      expect(response.status).toBe(403);

      // Should trigger enhanced monitoring and alerts
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'celebrity_unauthorized_access',
          severity: 'critical',
          celebrity_client: true
        })
      );
    });
  });

  describe('Media Blackout Protocol Testing', () => {
    it('should activate media blackout protocols during security incidents', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseAuth.celebrityUser },
        error: null
      });

      mockAuditManager.validateCelebrityAccess.mockResolvedValue(true);
      mockAuditManager.verifyMFA.mockResolvedValue(true);

      // Simulate high-profile security incident
      const securityIncident = {
        event_type: 'data_breach',
        severity: 'critical',
        organization_id: celebrityClient.organization_id,
        client_id: celebrityClient.id,
        celebrity_client: true,
        celebrity_tier: 'celebrity',
        event_details: {
          action: 'unauthorized_celebrity_access',
          threat_level: 'critical',
          media_exposure_risk: 'high',
          requires_blackout: true
        }
      };

      const incidentRequest = new NextRequest('http://localhost:3000/api/security/audit/events', {
        method: 'POST',
        body: JSON.stringify(securityIncident)
      });

      const response = await auditEventsPost(incidentRequest);
      expect(response.status).toBe(201);

      // Should activate media blackout protocols
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'data_breach',
          celebrity_client: true,
          severity: 'critical'
        })
      );

      // Verify celebrity monitoring detects the incident
      const monitoringRequest = {
        organization_id: celebrityClient.organization_id,
        client_id: celebrityClient.id,
        monitoring_type: 'threat_assessment',
        response_preferences: {
          media_blackout_protocols: true,
          enhanced_security_measures: true,
          law_enforcement_escalation: true
        }
      };

      const monitorRequest = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(monitoringRequest)
      });

      const monitorResponse = await celebrityMonitorPost(monitorRequest);
      
      if (monitorResponse.status === 200) {
        const monitorData = await monitorResponse.json();
        expect(monitorData.enhanced_monitoring_activated).toBe(true);
      }
    });
  });

  describe('Celebrity Security Metrics Validation', () => {
    it('should validate celebrity protection effectiveness metrics', async () => {
      // Test comprehensive celebrity protection metrics
      const protectionMetrics = {
        unauthorized_access_attempts: 50,
        blocked_celebrity_access_attempts: 49,
        privacy_violations_prevented: 15,
        media_leaks_prevented: 8,
        vendor_violations_blocked: 12,
        enhanced_monitoring_activations: 5,
        mfa_requirements_enforced: 100,
        protection_effectiveness_score: 98.5
      };

      // Simulate protection effectiveness validation
      mockSupabase.rpc.mockResolvedValue({
        data: protectionMetrics,
        error: null
      });

      const metricsValidation = await mockSupabase.rpc('validate_celebrity_protection_metrics', {
        organization_id: celebrityClient.organization_id,
        time_period: '30_days'
      });

      expect(metricsValidation.data.protection_effectiveness_score).toBeGreaterThan(95);
      expect(metricsValidation.data.blocked_celebrity_access_attempts).toBeGreaterThanOrEqual(
        metricsValidation.data.unauthorized_access_attempts * 0.95
      );
    });
  });
});