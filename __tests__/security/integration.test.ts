/**
 * WS-177 Security Integration Testing Suite
 * Team D Round 1 Implementation - Ultra Hard Integration Testing Standards
 * 
 * End-to-end security system integration testing with celebrity protection
 * Multi-layered security validation and real-time monitoring integration
 */

import { NextRequest } from 'next/server';
import { POST as auditEventsPost } from '@/app/api/security/audit/events/route';
import { POST as celebrityMonitorPost } from '@/app/api/security/celebrity/monitor/route';
import { POST as complianceReportPost } from '@/app/api/security/compliance/report/route';
import { createMockSupabaseClient, mockSupabaseAuth, mockWeddingData } from '@/__tests__/helpers/supabase-mock';
import { AuditSecurityManager } from '@/lib/security/AuditSecurityManager';
import { SecurityMonitoringService } from '@/lib/security/SecurityMonitoringService';
import { AlertingService } from '@/lib/security/AlertingService';
import { SecurityMetrics } from '@/lib/security/SecurityMetrics';

// Mock all security services
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/security/AuditSecurityManager');
jest.mock('@/lib/security/SecurityMonitoringService');
jest.mock('@/lib/security/AlertingService');
jest.mock('@/lib/security/SecurityMetrics');

describe('Security System Integration Tests', () => {
  let mockSupabase: any;
  let mockAuditManager: jest.Mocked<AuditSecurityManager>;
  let mockMonitoringService: jest.Mocked<SecurityMonitoringService>;
  let mockAlertingService: jest.Mocked<AlertingService>;
  let mockMetricsService: jest.Mocked<SecurityMetrics>;

  const testOrganization = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Celebrity Wedding Services',
    celebrity_access_enabled: true,
    security_clearance_level: 5
  };

  const testCelebrityClient = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    organization_id: testOrganization.id,
    name: 'A-List Celebrity',
    celebrity_tier: 'celebrity',
    privacy_level: 'maximum',
    security_clearance_required: true,
    enhanced_monitoring: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = createMockSupabaseClient();
    mockAuditManager = new AuditSecurityManager() as jest.Mocked<AuditSecurityManager>;
    mockMonitoringService = new SecurityMonitoringService() as jest.Mocked<SecurityMonitoringService>;
    mockAlertingService = new AlertingService() as jest.Mocked<AlertingService>;
    mockMetricsService = new SecurityMetrics() as jest.Mocked<SecurityMetrics>;

    // Setup default successful responses
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockSupabaseAuth.celebrityUser },
      error: null
    });

    mockAuditManager.validateSecurityContext.mockResolvedValue({ isValid: true, errors: [] });
    mockAuditManager.validateCelebrityAccess.mockResolvedValue(true);
    mockAuditManager.verifyMFA.mockResolvedValue(true);
    mockAuditManager.logSecurityEvent.mockResolvedValue({ eventId: 'test_event', timestamp: new Date().toISOString() });
    mockAuditManager.processComplianceEvent.mockResolvedValue();
    
    mockMonitoringService.processSecurityEvent.mockResolvedValue();
    mockMonitoringService.triggerSecurityAlert.mockResolvedValue();
    mockMonitoringService.activateEnhancedCelebrityMonitoring.mockResolvedValue();
    mockMonitoringService.getSecurityDashboardData.mockResolvedValue({
      metrics: {
        activeThreats: 0,
        threatsByLevel: { none: 0, low: 0, medium: 0, high: 0, critical: 0 },
        incidentsToday: 0,
        celebrityThreats: 0,
        complianceViolations: 0,
        vendorViolations: 0,
        averageResponseTime: 15,
        systemHealth: 'healthy',
        lastUpdated: new Date().toISOString()
      },
      recentAlerts: []
    });

    mockAlertingService.processAlert.mockResolvedValue();
    mockMetricsService.recordSecurityMetric.mockResolvedValue();
  });

  describe('Celebrity Client Security Workflow', () => {
    it('should handle complete celebrity security workflow from access to monitoring', async () => {
      // Setup celebrity client data
      mockSupabase.from('clients').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [testCelebrityClient],
              error: null
            })
          })
        })
      });

      // Step 1: Celebrity client data access (should trigger audit event)
      const accessEvent = {
        event_type: 'celebrity_access',
        severity: 'medium',
        organization_id: testOrganization.id,
        client_id: testCelebrityClient.id,
        celebrity_client: true,
        celebrity_tier: 'celebrity',
        event_details: {
          action: 'celebrity_wedding_data_access',
          resource: 'wedding_details',
          ip_address: '10.0.1.50'
        },
        compliance_flags: {
          gdpr_relevant: true,
          soc2_relevant: true
        }
      };

      const auditRequest = new NextRequest('http://localhost:3000/api/security/audit/events', {
        method: 'POST',
        body: JSON.stringify(accessEvent)
      });

      const auditResponse = await auditEventsPost(auditRequest);
      expect(auditResponse.status).toBe(201);

      // Verify audit event was logged
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'celebrity_access',
          celebrity_client: true,
          celebrity_tier: 'celebrity'
        })
      );

      // Verify real-time monitoring was triggered
      expect(mockMonitoringService.processSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'celebrity_access',
          celebrityClient: true
        })
      );

      // Step 2: Celebrity monitoring should detect the access
      const monitoringRequest = {
        organization_id: testOrganization.id,
        client_id: testCelebrityClient.id,
        monitoring_type: 'real_time_activity',
        threat_indicators: {
          suspicious_access_patterns: true,
          privacy_boundary_violations: true
        },
        response_preferences: {
          immediate_alerts: true,
          enhanced_security_measures: true
        }
      };

      const monitorRequest = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(monitoringRequest)
      });

      const monitorResponse = await celebrityMonitorPost(monitorRequest);
      expect(monitorResponse.status).toBe(200);

      const monitorData = await monitorResponse.json();
      expect(monitorData.celebrity_clients_monitored).toBe(1);
      expect(monitorData.monitoring_type).toBe('real_time_activity');

      // Verify celebrity monitoring was activated
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'celebrity_monitoring_performed',
          celebrity_client: true
        })
      );

      // Step 3: Compliance reporting should include celebrity events
      const complianceRequest = {
        organization_id: testOrganization.id,
        report_type: 'comprehensive',
        date_range: {
          start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString()
        },
        include_celebrity_data: true
      };

      mockSupabase.from('audit_logs').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'audit_1',
                  event_type: 'celebrity_access',
                  severity: 'medium',
                  celebrity_client: true,
                  created_at: new Date().toISOString()
                }
              ],
              error: null
            })
          })
        })
      });

      mockSupabase.from('compliance_violations').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      const complianceReportRequest = new NextRequest('http://localhost:3000/api/security/compliance/report', {
        method: 'POST',
        body: JSON.stringify(complianceRequest)
      });

      const complianceResponse = await complianceReportPost(complianceReportRequest);
      expect(complianceResponse.status).toBe(201);

      const complianceData = await complianceResponse.json();
      expect(complianceData.celebrity_compliance).toBeDefined();
      expect(complianceData.metrics.celebrity_events).toBeGreaterThan(0);
    });

    it('should escalate celebrity security incidents through all layers', async () => {
      // Setup high-severity celebrity incident
      const criticalIncident = {
        event_type: 'data_breach',
        severity: 'critical',
        threat_level: 'critical',
        organization_id: testOrganization.id,
        client_id: testCelebrityClient.id,
        celebrity_client: true,
        celebrity_tier: 'celebrity',
        event_details: {
          action: 'unauthorized_celebrity_data_access',
          resource: 'personal_information',
          ip_address: 'unknown',
          breach_scope: 'celebrity_wedding_details'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
        method: 'POST',
        body: JSON.stringify(criticalIncident)
      });

      await auditEventsPost(request);

      // Verify critical event logging
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'data_breach',
          severity: 'critical',
          celebrity_client: true
        })
      );

      // Verify immediate alert triggering
      expect(mockMonitoringService.triggerSecurityAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data_breach',
          severity: 'critical',
          celebrityClient: true
        })
      );

      // Verify compliance processing
      expect(mockAuditManager.processComplianceEvent).toHaveBeenCalled();
    });
  });

  describe('Multi-Tenant Security Isolation', () => {
    it('should maintain strict isolation between organizations', async () => {
      const organization1User = {
        ...mockSupabaseAuth.validUser,
        app_metadata: {
          ...mockSupabaseAuth.validUser.app_metadata,
          organization_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      };

      const organization2User = {
        ...mockSupabaseAuth.validUser,
        id: 'different-user-id',
        app_metadata: {
          ...mockSupabaseAuth.validUser.app_metadata,
          organization_id: '123e4567-e89b-12d3-a456-426614174001' // Different org
        }
      };

      // User from org1 tries to access org2 data
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: organization1User },
        error: null
      });

      mockAuditManager.validateSecurityContext.mockResolvedValue({ isValid: true, errors: [] });
      mockAuditManager.validateOrganizationAccess.mockResolvedValue(false); // Should fail

      const crossOrgEvent = {
        event_type: 'data_access',
        severity: 'low',
        organization_id: '123e4567-e89b-12d3-a456-426614174001', // Different org
        event_details: { action: 'unauthorized_cross_org_access' }
      };

      const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
        method: 'POST',
        body: JSON.stringify(crossOrgEvent)
      });

      const response = await auditEventsPost(request);
      expect(response.status).toBe(403);

      // Verify unauthorized access attempt was logged
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'security_validation_failed',
          severity: 'critical'
        })
      );
    });
  });

  describe('Vendor Security Integration', () => {
    it('should enforce comprehensive vendor security validation', async () => {
      const vendorUser = {
        ...mockSupabaseAuth.vendorUser,
        app_metadata: {
          ...mockSupabaseAuth.vendorUser.app_metadata,
          vendor_clearance_level: 2,
          background_check_verified: true,
          celebrity_access_approved: false
        }
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: vendorUser },
        error: null
      });

      // Vendor tries to access celebrity client data
      const vendorAccessEvent = {
        event_type: 'vendor_activity',
        severity: 'medium',
        organization_id: testOrganization.id,
        vendor_id: vendorUser.app_metadata.vendor_id,
        client_id: testCelebrityClient.id,
        celebrity_client: true,
        event_details: {
          action: 'vendor_celebrity_access_attempt',
          resource: 'celebrity_wedding_data'
        }
      };

      mockAuditManager.validateCelebrityAccess.mockResolvedValue(false); // Vendor denied

      const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
        method: 'POST',
        body: JSON.stringify(vendorAccessEvent)
      });

      const response = await auditEventsPost(request);
      expect(response.status).toBe(403);

      // Verify vendor access denial was logged
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'celebrity_unauthorized_access',
          severity: 'critical',
          vendor_id: vendorUser.app_metadata.vendor_id
        })
      );
    });

    it('should allow approved vendor access with proper monitoring', async () => {
      const approvedVendor = {
        ...mockSupabaseAuth.vendorUser,
        app_metadata: {
          ...mockSupabaseAuth.vendorUser.app_metadata,
          celebrity_access_approved: true,
          security_clearance_level: 4
        }
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: approvedVendor },
        error: null
      });

      mockAuditManager.validateCelebrityAccess.mockResolvedValue(true); // Approved

      const vendorAccessEvent = {
        event_type: 'vendor_activity',
        severity: 'low',
        organization_id: testOrganization.id,
        vendor_id: approvedVendor.app_metadata.vendor_id,
        client_id: testCelebrityClient.id,
        celebrity_client: true,
        event_details: {
          action: 'approved_vendor_celebrity_access',
          resource: 'wedding_photography_schedule'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
        method: 'POST',
        body: JSON.stringify(vendorAccessEvent)
      });

      const response = await auditEventsPost(request);
      expect(response.status).toBe(201);

      // Verify approved access was logged and monitored
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'vendor_activity',
          celebrity_client: true,
          vendor_id: approvedVendor.app_metadata.vendor_id
        })
      );

      expect(mockMonitoringService.processSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'vendor_activity',
          celebrityClient: true
        })
      );
    });
  });

  describe('Real-time Security Monitoring Integration', () => {
    it('should integrate all security events into real-time monitoring', async () => {
      const securityEvents = [
        {
          event_type: 'login_attempt',
          severity: 'low',
          organization_id: testOrganization.id
        },
        {
          event_type: 'suspicious_activity',
          severity: 'high',
          organization_id: testOrganization.id,
          celebrity_client: true
        },
        {
          event_type: 'data_breach',
          severity: 'critical',
          organization_id: testOrganization.id
        }
      ];

      for (const event of securityEvents) {
        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify({
            ...event,
            event_details: { action: 'test_integration' }
          })
        });

        await auditEventsPost(request);
      }

      // Verify all events were processed by monitoring service
      expect(mockMonitoringService.processSecurityEvent).toHaveBeenCalledTimes(securityEvents.length);

      // Verify high-severity events triggered alerts
      expect(mockMonitoringService.triggerSecurityAlert).toHaveBeenCalledTimes(2); // High and critical events
    });

    it('should aggregate metrics across all security layers', async () => {
      // Mock various security activities
      const activities = Array(10).fill(null).map((_, i) => ({
        event_type: i % 2 === 0 ? 'data_access' : 'login_attempt',
        severity: ['low', 'medium', 'high', 'critical'][i % 4],
        organization_id: testOrganization.id,
        celebrity_client: i % 3 === 0,
        event_details: { action: `test_activity_${i}` }
      }));

      for (const activity of activities) {
        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(activity)
        });

        await auditEventsPost(request);
      }

      // Verify metrics were recorded for each activity
      expect(mockMonitoringService.processSecurityEvent).toHaveBeenCalledTimes(activities.length);
      
      // Verify dashboard data integration
      const dashboardData = await mockMonitoringService.getSecurityDashboardData(testOrganization.id);
      expect(dashboardData.metrics).toBeDefined();
      expect(dashboardData.recentAlerts).toBeDefined();
    });
  });

  describe('Compliance and Audit Integration', () => {
    it('should maintain comprehensive audit trail across all systems', async () => {
      const complianceScenarios = [
        { regulation: 'gdpr', action: 'data_subject_request' },
        { regulation: 'ccpa', action: 'opt_out_request' },
        { regulation: 'soc2', action: 'security_control_test' }
      ];

      for (const scenario of complianceScenarios) {
        const event = {
          event_type: 'compliance_activity',
          severity: 'medium',
          organization_id: testOrganization.id,
          event_details: {
            action: scenario.action,
            regulation: scenario.regulation
          },
          compliance_flags: {
            [`${scenario.regulation}_relevant`]: true
          }
        };

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(event)
        });

        await auditEventsPost(request);
      }

      // Verify compliance events were processed
      expect(mockAuditManager.processComplianceEvent).toHaveBeenCalledTimes(complianceScenarios.length);

      // Verify audit trail integrity
      for (const scenario of complianceScenarios) {
        expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            event_type: 'compliance_activity',
            event_details: expect.objectContaining({
              regulation: scenario.regulation
            })
          })
        );
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain security standards under high load', async () => {
      const startTime = Date.now();
      const concurrentEvents = Array(50).fill(null).map((_, i) => ({
        event_type: 'data_access',
        severity: 'low',
        organization_id: testOrganization.id,
        celebrity_client: i % 10 === 0, // 10% celebrity events
        event_details: { action: `load_test_${i}` }
      }));

      // Process events concurrently
      const promises = concurrentEvents.map(event => {
        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(event)
        });
        return auditEventsPost(request);
      });

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Performance should remain acceptable
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // Less than 10 seconds for 50 concurrent requests

      // All security validations should have been performed
      expect(mockAuditManager.validateSecurityContext).toHaveBeenCalledTimes(concurrentEvents.length);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should maintain security even when components fail', async () => {
      // Simulate monitoring service failure
      mockMonitoringService.processSecurityEvent.mockRejectedValue(new Error('Monitoring service down'));

      const event = {
        event_type: 'data_access',
        severity: 'medium',
        organization_id: testOrganization.id,
        event_details: { action: 'test_resilience' }
      };

      const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
        method: 'POST',
        body: JSON.stringify(event)
      });

      const response = await auditEventsPost(request);

      // Event should still be processed and logged despite monitoring failure
      expect(response.status).toBe(201);
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'data_access'
        })
      );

      // System should log the component failure
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'api_error',
          severity: 'high'
        })
      );
    });

    it('should fail securely when critical security validation fails', async () => {
      // Simulate critical security validation failure
      mockAuditManager.validateSecurityContext.mockRejectedValue(new Error('Security validation system failure'));

      const event = {
        event_type: 'celebrity_access',
        severity: 'high',
        organization_id: testOrganization.id,
        celebrity_client: true,
        event_details: { action: 'test_fail_secure' }
      };

      const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
        method: 'POST',
        body: JSON.stringify(event)
      });

      const response = await auditEventsPost(request);

      // Request should fail securely
      expect(response.status).toBe(500);

      // Failure should be logged as a security event
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'api_error',
          severity: 'high'
        })
      );
    });
  });
});