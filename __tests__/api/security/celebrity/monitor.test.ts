/**
 * WS-177 Celebrity Client Monitoring API Testing Suite
 * Team D Round 1 Implementation - Ultra Hard Celebrity Protection Testing
 * 
 * Comprehensive testing for celebrity client monitoring with enhanced privacy controls
 * Real-time threat detection and incident response for high-profile wedding clients
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/security/celebrity/monitor/route';
import { createMockSupabaseClient, mockSupabaseAuth, mockWeddingData, createMockCelebrityContext } from '@/__tests__/helpers/supabase-mock';
import { AuditSecurityManager } from '@/lib/security/AuditSecurityManager';
import { SecurityMonitoringService } from '@/lib/security/SecurityMonitoringService';
import { AlertingService } from '@/lib/security/AlertingService';

// Mock implementations
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

jest.mock('@/lib/security/AuditSecurityManager');
jest.mock('@/lib/security/SecurityMonitoringService');
jest.mock('@/lib/security/AlertingService');

describe('/api/security/celebrity/monitor', () => {
  let mockSupabase: any;
  let mockAuditManager: jest.Mocked<AuditSecurityManager>;
  let mockMonitoringService: jest.Mocked<SecurityMonitoringService>;
  let mockAlertingService: jest.Mocked<AlertingService>;

  const validMonitoringRequest = {
    organization_id: '123e4567-e89b-12d3-a456-426614174000',
    client_id: '123e4567-e89b-12d3-a456-426614174002', // Celebrity client
    monitoring_type: 'real_time_activity',
    threat_indicators: {
      suspicious_access_patterns: true,
      unusual_data_requests: true,
      unauthorized_vendor_activity: true,
      social_engineering_attempts: true,
      media_infiltration_attempts: true,
      competitive_intelligence_gathering: true,
      location_tracking_attempts: true,
      privacy_boundary_violations: true
    },
    response_preferences: {
      immediate_alerts: true,
      stakeholder_notifications: true,
      law_enforcement_escalation: false,
      media_blackout_protocols: true,
      enhanced_security_measures: true
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = createMockSupabaseClient();
    mockAuditManager = new AuditSecurityManager() as jest.Mocked<AuditSecurityManager>;
    mockMonitoringService = new SecurityMonitoringService() as jest.Mocked<SecurityMonitoringService>;
    mockAlertingService = new AlertingService() as jest.Mocked<AlertingService>;

    // Default successful mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockSupabaseAuth.celebrityUser },
      error: null
    });

    mockAuditManager.validateCelebrityAccess.mockResolvedValue(true);
    mockAuditManager.verifyMFA.mockResolvedValue(true);
    mockAuditManager.logSecurityEvent.mockResolvedValue({
      eventId: 'celebrity_monitor_123',
      timestamp: '2025-01-29T12:00:00Z'
    });

    mockMonitoringService.activateEnhancedCelebrityMonitoring.mockResolvedValue();
    mockAlertingService.processAlert.mockResolvedValue();

    // Mock celebrity clients data
    mockSupabase.from('clients').select.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [mockWeddingData.clients[1]], // Celebrity client
            error: null
          })
        })
      })
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Unauthorized access to celebrity monitoring');
    });

    it('should require celebrity access privileges', async () => {
      mockAuditManager.validateCelebrityAccess.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
      
      const data = await response.json();
      expect(data.error).toBe('Insufficient privileges for celebrity client monitoring');
    });

    it('should require multi-factor authentication for celebrity access', async () => {
      mockAuditManager.verifyMFA.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
      
      const data = await response.json();
      expect(data.error).toBe('Multi-factor authentication required for celebrity monitoring');
    });

    it('should log celebrity access denial attempts', async () => {
      mockAuditManager.validateCelebrityAccess.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      await POST(request);
      
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'celebrity_unauthorized_access',
          severity: 'critical',
          celebrity_client: true,
          event_details: expect.objectContaining({
            action: 'celebrity_monitoring_access_denied'
          })
        })
      );
    });

    it('should log MFA requirement events', async () => {
      mockAuditManager.verifyMFA.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      await POST(request);
      
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'celebrity_mfa_required',
          severity: 'critical',
          celebrity_client: true
        })
      );
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields', async () => {
      const invalidData = { ...validMonitoringRequest };
      delete (invalidData as any).organization_id;

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Validation error');
    });

    it('should validate monitoring_type enum values', async () => {
      const invalidData = { ...validMonitoringRequest, monitoring_type: 'invalid_type' };

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should validate UUID format for organization_id', async () => {
      const invalidData = { ...validMonitoringRequest, organization_id: 'invalid-uuid' };

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should validate optional client_id UUID format', async () => {
      const invalidData = { ...validMonitoringRequest, client_id: 'invalid-client-uuid' };

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should validate threat_indicators structure', async () => {
      const invalidData = {
        ...validMonitoringRequest,
        threat_indicators: {
          invalid_indicator: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should validate response_preferences structure', async () => {
      const invalidData = {
        ...validMonitoringRequest,
        response_preferences: {
          invalid_preference: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Celebrity Client Monitoring Types', () => {
    describe('Real-time Activity Monitoring', () => {
      it('should monitor real-time celebrity client activity', async () => {
        const monitoringRequest = {
          ...validMonitoringRequest,
          monitoring_type: 'real_time_activity'
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(monitoringRequest)
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.monitoring_type).toBe('real_time_activity');
        expect(data.celebrity_clients_monitored).toBe(1);
      });

      it('should include real-time activity data in response', async () => {
        // Mock recent activity logs
        mockSupabase.from('audit_logs').select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'recent_activity_1',
                    event_type: 'login_attempt',
                    severity: 'low',
                    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
                  }
                ],
                error: null
              })
            })
          })
        });

        const monitoringRequest = {
          ...validMonitoringRequest,
          monitoring_type: 'real_time_activity'
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(monitoringRequest)
        });

        const response = await POST(request);
        const data = await response.json();
        
        expect(data.monitoring_results).toBeDefined();
        expect(data.monitoring_results[0].monitoring_data).toBeDefined();
      });
    });

    describe('Threat Assessment Monitoring', () => {
      it('should perform threat assessment for celebrity clients', async () => {
        const monitoringRequest = {
          ...validMonitoringRequest,
          monitoring_type: 'threat_assessment'
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(monitoringRequest)
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.monitoring_type).toBe('threat_assessment');
        expect(data.monitoring_results).toBeDefined();
      });

      it('should include threat indicators in assessment', async () => {
        // Mock threat events
        mockSupabase.from('audit_logs').select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: [
                  {
                    event_type: 'suspicious_login',
                    severity: 'high',
                    created_at: new Date().toISOString()
                  }
                ],
                error: null
              })
            })
          })
        });

        const monitoringRequest = {
          ...validMonitoringRequest,
          monitoring_type: 'threat_assessment'
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(monitoringRequest)
        });

        const response = await POST(request);
        const data = await response.json();
        
        expect(data.monitoring_results[0].monitoring_data.threat_indicators).toBeDefined();
        expect(data.monitoring_results[0].monitoring_data.total_threats_detected).toBeDefined();
      });
    });

    describe('Privacy Audit Monitoring', () => {
      it('should perform privacy audit for celebrity clients', async () => {
        const monitoringRequest = {
          ...validMonitoringRequest,
          monitoring_type: 'privacy_audit'
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(monitoringRequest)
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.monitoring_type).toBe('privacy_audit');
      });
    });

    describe('Access Monitoring', () => {
      it('should monitor access patterns for celebrity clients', async () => {
        const monitoringRequest = {
          ...validMonitoringRequest,
          monitoring_type: 'access_monitoring'
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(monitoringRequest)
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.monitoring_type).toBe('access_monitoring');
      });

      it('should detect unusual access patterns', async () => {
        // Mock access events at unusual hours
        mockSupabase.from('audit_logs').select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: [
                    {
                      event_type: 'login_attempt',
                      user_id: 'user_123',
                      created_at: new Date(2025, 0, 29, 2, 30, 0).toISOString(), // 2:30 AM
                      event_details: { ip_address: '192.168.1.100' }
                    },
                    {
                      event_type: 'data_access',
                      user_id: 'user_123',
                      created_at: new Date(2025, 0, 29, 3, 15, 0).toISOString(), // 3:15 AM
                      event_details: { ip_address: '192.168.1.100' }
                    }
                  ],
                  error: null
                })
              })
            })
          })
        });

        const monitoringRequest = {
          ...validMonitoringRequest,
          monitoring_type: 'access_monitoring'
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(monitoringRequest)
        });

        const response = await POST(request);
        const data = await response.json();
        
        expect(data.monitoring_results[0].monitoring_data.access_anomalies).toBeDefined();
      });
    });

    describe('Social Media Monitoring', () => {
      it('should monitor social media threats for celebrity clients', async () => {
        const monitoringRequest = {
          ...validMonitoringRequest,
          monitoring_type: 'social_media_monitoring'
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(monitoringRequest)
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.monitoring_type).toBe('social_media_monitoring');
        expect(data.monitoring_results[0].monitoring_data.monitoring_active).toBe(true);
      });
    });

    describe('Paparazzi Threat Detection', () => {
      it('should detect paparazzi threats for celebrity clients', async () => {
        const monitoringRequest = {
          ...validMonitoringRequest,
          monitoring_type: 'paparazzi_threat_detection'
        };

        const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
          method: 'POST',
          body: JSON.stringify(monitoringRequest)
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.monitoring_type).toBe('paparazzi_threat_detection');
        expect(data.monitoring_results[0].monitoring_data.threat_detection_active).toBe(true);
      });
    });
  });

  describe('Celebrity Threat Profile Generation', () => {
    it('should generate comprehensive threat profile for celebrity clients', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(data.monitoring_results[0].threat_profile).toBeDefined();
      expect(data.monitoring_results[0].threat_profile.celebrity_tier).toBe('celebrity');
      expect(data.monitoring_results[0].threat_profile.threat_level).toBeDefined();
      expect(data.monitoring_results[0].threat_profile.protection_measures).toBeDefined();
      expect(data.monitoring_results[0].threat_profile.enhanced_monitoring_active).toBe(true);
    });

    it('should assess threat level based on recent incidents', async () => {
      // Mock critical security events
      mockSupabase.from('audit_logs').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({
                data: [
                  {
                    event_type: 'data_breach',
                    severity: 'critical',
                    celebrity_client: true,
                    created_at: new Date().toISOString()
                  }
                ],
                error: null
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(data.monitoring_results[0].threat_profile.threat_level).toBe('critical');
      expect(data.monitoring_results[0].threat_profile.risk_factors).toContain('Critical security incidents detected');
    });

    it('should include celebrity-specific protection measures', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      const data = await response.json();
      
      const protectionMeasures = data.monitoring_results[0].threat_profile.protection_measures;
      expect(protectionMeasures).toContain('Multi-factor authentication required');
      expect(protectionMeasures).toContain('Media blackout protocols');
      expect(protectionMeasures).toContain('Location privacy controls');
    });
  });

  describe('Alert Processing and Escalation', () => {
    it('should trigger alerts for high-risk celebrity situations', async () => {
      // Mock high threat level
      mockSupabase.from('audit_logs').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({
                data: [
                  { event_type: 'unauthorized_access', severity: 'high' },
                  { event_type: 'suspicious_login', severity: 'high' },
                  { event_type: 'data_breach', severity: 'critical' }
                ],
                error: null
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      await POST(request);
      
      expect(mockAlertingService.processAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'celebrity_high_risk',
          celebrityClient: true,
          title: 'High-risk situation detected for celebrity client'
        })
      );
    });

    it('should activate enhanced monitoring for critical threats', async () => {
      // Mock critical threat scenario
      mockSupabase.from('audit_logs').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({
                data: [
                  { event_type: 'data_breach', severity: 'critical' },
                  { event_type: 'privacy_violation', severity: 'critical' }
                ],
                error: null
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      
      expect(mockMonitoringService.activateEnhancedCelebrityMonitoring).toHaveBeenCalledWith(
        validMonitoringRequest.organization_id,
        [mockWeddingData.clients[1].id]
      );
      
      const data = await response.json();
      expect(data.enhanced_monitoring_activated).toBe(true);
    });

    it('should include response preferences in alert processing', async () => {
      // Mock high-risk scenario
      mockSupabase.from('audit_logs').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({
                data: [{ event_type: 'data_breach', severity: 'critical' }],
                error: null
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      await POST(request);
      
      expect(mockAlertingService.processAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          response_preferences: validMonitoringRequest.response_preferences
        })
      );
    });
  });

  describe('Security Event Analysis', () => {
    it('should analyze celebrity security events comprehensively', async () => {
      // Mock celebrity security events
      mockSupabase.from('audit_logs').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'celebrity_event_1',
                      event_type: 'celebrity_access',
                      severity: 'medium',
                      threat_level: 'medium',
                      celebrity_client: true,
                      created_at: new Date().toISOString(),
                      event_details: {
                        description: 'Celebrity data access',
                        privacy_violation: false
                      }
                    }
                  ],
                  error: null
                })
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(data.monitoring_results[0].security_events).toBeDefined();
      expect(data.monitoring_results[0].security_events[0].privacy_impact).toBeDefined();
      expect(data.monitoring_results[0].security_events[0].media_risk).toBeDefined();
      expect(data.monitoring_results[0].security_events[0].response_actions).toBeDefined();
    });

    it('should assess privacy impact for celebrity events', async () => {
      // Mock data breach event
      mockSupabase.from('audit_logs').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'breach_event',
                      event_type: 'data_breach',
                      severity: 'critical',
                      celebrity_client: true,
                      created_at: new Date().toISOString()
                    }
                  ],
                  error: null
                })
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(data.monitoring_results[0].security_events[0].privacy_impact).toBe('critical');
      expect(data.monitoring_results[0].security_events[0].media_risk).toBe('critical');
    });
  });

  describe('Logging and Audit Trail', () => {
    it('should log celebrity monitoring activity', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      await POST(request);
      
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'celebrity_monitoring_performed',
          severity: 'medium',
          celebrity_client: true,
          event_details: expect.objectContaining({
            action: 'celebrity_monitoring_execution',
            monitoring_type: validMonitoringRequest.monitoring_type,
            clients_monitored: 1
          })
        })
      );
    });

    it('should include monitoring metrics in audit log', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      await POST(request);
      
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_details: expect.objectContaining({
            clients_monitored: expect.any(Number),
            high_risk_clients: expect.any(Number),
            security_events_analyzed: expect.any(Number)
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database query errors gracefully', async () => {
      mockSupabase.from('clients').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle no celebrity clients scenario', async () => {
      mockSupabase.from('clients').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.celebrity_clients).toEqual([]);
    });

    it('should log API errors as security events', async () => {
      mockSupabase.from('clients').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      await POST(request);
      
      expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'api_error',
          severity: 'high',
          event_details: expect.objectContaining({
            action: 'celebrity_monitoring_api_error',
            endpoint: '/api/security/celebrity/monitor'
          })
        })
      );
    });
  });

  describe('Response Format and Structure', () => {
    it('should return comprehensive monitoring results', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.organization_id).toBe(validMonitoringRequest.organization_id);
      expect(data.monitoring_type).toBe(validMonitoringRequest.monitoring_type);
      expect(data.monitoring_timestamp).toBeDefined();
      expect(data.celebrity_clients_monitored).toBeDefined();
      expect(data.monitoring_results).toBeDefined();
      expect(data.security_recommendations).toBeDefined();
      expect(data.next_monitoring_recommended).toBeDefined();
    });

    it('should include threat profile for each monitored client', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(data.monitoring_results[0].threat_profile).toBeDefined();
      expect(data.monitoring_results[0].threat_profile.celebrity_tier).toBe('celebrity');
      expect(data.monitoring_results[0].threat_profile.threat_level).toBeDefined();
      expect(data.monitoring_results[0].threat_profile.protection_measures).toBeDefined();
    });

    it('should provide security recommendations based on findings', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/celebrity/monitor', {
        method: 'POST',
        body: JSON.stringify(validMonitoringRequest)
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(data.security_recommendations).toBeDefined();
      expect(Array.isArray(data.security_recommendations)).toBe(true);
    });
  });
});