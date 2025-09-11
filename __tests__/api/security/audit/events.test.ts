/**
 * WS-177 Security Audit Events API Testing Suite
 * Team D Round 1 Implementation - Ultra Hard Security Testing Standards
 * 
 * Comprehensive testing for security audit events API with celebrity protection
 * Multi-layered security validation and compliance enforcement testing
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/security/audit/events/route';
import { createMockSupabaseClient, mockSupabaseAuth } from '@/__tests__/helpers/supabase-mock';
import { AuditSecurityManager } from '@/lib/security/AuditSecurityManager';
import { SecurityMonitoringService } from '@/lib/security/SecurityMonitoringService';

// Mock implementations
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

jest.mock('@/lib/security/AuditSecurityManager');
jest.mock('@/lib/security/SecurityMonitoringService');

describe('/api/security/audit/events', () => {
  let mockSupabase: any;
  let mockAuditManager: jest.Mocked<AuditSecurityManager>;
  let mockMonitoringService: jest.Mocked<SecurityMonitoringService>;

  const validEventData = {
    event_type: 'data_access',
    severity: 'medium',
    threat_level: 'low',
    organization_id: '123e4567-e89b-12d3-a456-426614174000',
    client_id: '123e4567-e89b-12d3-a456-426614174001',
    celebrity_client: false,
    celebrity_tier: 'standard',
    event_details: {
      action: 'client_data_access',
      resource: 'wedding_details',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0 Test Browser'
    },
    compliance_flags: {
      gdpr_relevant: true,
      soc2_relevant: true,
      ccpa_relevant: false,
      pci_relevant: false
    }
  };

  const celebrityEventData = {
    ...validEventData,
    celebrity_client: true,
    celebrity_tier: 'celebrity',
    event_type: 'celebrity_access'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = createMockSupabaseClient();
    mockAuditManager = new AuditSecurityManager() as jest.Mocked<AuditSecurityManager>;
    mockMonitoringService = new SecurityMonitoringService() as jest.Mocked<SecurityMonitoringService>;

    // Default successful mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockSupabaseAuth.validUser },
      error: null
    });

    mockAuditManager.validateSecurityContext.mockResolvedValue({
      isValid: true,
      errors: []
    });

    mockAuditManager.validateCelebrityAccess.mockResolvedValue(true);
    mockAuditManager.logSecurityEvent.mockResolvedValue({
      eventId: 'audit_123',
      timestamp: '2025-01-29T12:00:00Z'
    });

    mockMonitoringService.processSecurityEvent.mockResolvedValue();
    mockMonitoringService.triggerSecurityAlert.mockResolvedValue();
  });

  describe('POST /api/security/audit/events', () => {
    describe('Authentication and Authorization', () => {
      it('should reject unauthenticated requests', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated')
        });

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(validEventData)
        });

        const response = await POST(request);
        expect(response.status).toBe(401);
        
        const data = await response.json();
        expect(data.error).toBe('Unauthorized access to security audit endpoint');
      });

      it('should reject requests with invalid user', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null
        });

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(validEventData)
        });

        const response = await POST(request);
        expect(response.status).toBe(401);
      });

      it('should validate security context before processing', async () => {
        mockAuditManager.validateSecurityContext.mockResolvedValue({
          isValid: false,
          errors: ['Invalid permissions', 'Access denied']
        });

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(validEventData)
        });

        const response = await POST(request);
        expect(response.status).toBe(403);
        
        const data = await response.json();
        expect(data.error).toBe('Security validation failed');
        expect(data.details).toEqual(['Invalid permissions', 'Access denied']);
      });
    });

    describe('Celebrity Client Protection', () => {
      it('should validate celebrity access for celebrity events', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(celebrityEventData)
        });

        await POST(request);
        
        expect(mockAuditManager.validateCelebrityAccess).toHaveBeenCalledWith(
          expect.objectContaining({
            celebrityTier: 'celebrity'
          })
        );
      });

      it('should reject celebrity events without proper access', async () => {
        mockAuditManager.validateCelebrityAccess.mockResolvedValue(false);

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(celebrityEventData)
        });

        const response = await POST(request);
        expect(response.status).toBe(403);
        
        const data = await response.json();
        expect(data.error).toBe('Insufficient privileges for celebrity client audit access');
      });

      it('should log celebrity access denial attempts', async () => {
        mockAuditManager.validateCelebrityAccess.mockResolvedValue(false);

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(celebrityEventData)
        });

        await POST(request);
        
        expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            event_type: 'celebrity_unauthorized_access',
            severity: 'critical',
            celebrity_client: true
          })
        );
      });
    });

    describe('Input Validation', () => {
      it('should validate required fields', async () => {
        const invalidData = { ...validEventData };
        delete (invalidData as any).event_type;

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(invalidData)
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBe('Validation error');
        expect(data.details).toBeDefined();
      });

      it('should validate event_type enum values', async () => {
        const invalidData = { ...validEventData, event_type: 'invalid_event' };

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(invalidData)
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      });

      it('should validate severity enum values', async () => {
        const invalidData = { ...validEventData, severity: 'invalid_severity' };

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(invalidData)
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      });

      it('should validate UUID format for organization_id', async () => {
        const invalidData = { ...validEventData, organization_id: 'invalid-uuid' };

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(invalidData)
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      });

      it('should validate celebrity_tier enum values', async () => {
        const invalidData = { ...validEventData, celebrity_tier: 'invalid_tier' };

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(invalidData)
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      });
    });

    describe('Wedding Business Logic Validation', () => {
      it('should validate client context when client_id provided', async () => {
        const clientData = { ...validEventData };
        mockSupabase.from('clients').select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: clientData.client_id,
                  organization_id: clientData.organization_id,
                  celebrity_tier: 'standard'
                },
                error: null
              })
            })
          })
        });

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(clientData)
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
        
        expect(mockSupabase.from).toHaveBeenCalledWith('clients');
      });

      it('should reject invalid client context', async () => {
        const clientData = { ...validEventData };
        mockSupabase.from('clients').select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: new Error('Client not found')
              })
            })
          })
        });

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(clientData)
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBe('Invalid wedding client context');
      });

      it('should validate celebrity tier consistency', async () => {
        const celebrityData = { ...celebrityEventData };
        mockSupabase.from('clients').select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: celebrityData.client_id,
                  organization_id: celebrityData.organization_id,
                  celebrity_tier: 'vip' // Different from provided 'celebrity'
                },
                error: null
              })
            })
          })
        });

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(celebrityData)
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBe('Celebrity tier validation failed');
      });
    });

    describe('Security Event Processing', () => {
      it('should successfully log valid security event', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(validEventData)
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.event_id).toBe('audit_123');
        expect(data.organization_id).toBe(validEventData.organization_id);
        expect(data.compliance_processed).toBe(true);
        expect(data.monitoring_active).toBe(true);
        expect(data.celebrity_protection).toBe(false);
      });

      it('should process celebrity events with enhanced logging', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(celebrityEventData)
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
        
        const data = await response.json();
        expect(data.celebrity_protection).toBe(true);
        
        expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            celebrity_client: true,
            celebrity_tier: 'celebrity'
          })
        );
      });

      it('should trigger real-time monitoring for events', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(validEventData)
        });

        await POST(request);
        
        expect(mockMonitoringService.processSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: validEventData.event_type,
            severity: validEventData.severity,
            organizationId: validEventData.organization_id
          })
        );
      });

      it('should trigger alerts for high-severity events', async () => {
        const highSeverityEvent = { ...validEventData, severity: 'critical' };
        
        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(highSeverityEvent)
        });

        await POST(request);
        
        expect(mockMonitoringService.triggerSecurityAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            type: highSeverityEvent.event_type,
            severity: 'critical',
            organizationId: highSeverityEvent.organization_id
          })
        );
      });

      it('should process compliance flags when provided', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(validEventData)
        });

        await POST(request);
        
        expect(mockAuditManager.processComplianceEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventId: 'audit_123',
            organizationId: validEventData.organization_id,
            complianceFlags: validEventData.compliance_flags,
            eventType: validEventData.event_type,
            severity: validEventData.severity
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle audit manager errors gracefully', async () => {
        mockAuditManager.logSecurityEvent.mockRejectedValue(new Error('Database error'));

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(validEventData)
        });

        const response = await POST(request);
        expect(response.status).toBe(500);
        
        const data = await response.json();
        expect(data.error).toBe('Internal server error');
      });

      it('should handle malformed JSON requests', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: 'invalid json'
        });

        const response = await POST(request);
        expect(response.status).toBe(500);
      });

      it('should log API errors as security events', async () => {
        mockAuditManager.logSecurityEvent
          .mockResolvedValueOnce({ eventId: 'audit_123', timestamp: '2025-01-29T12:00:00Z' }) // First call succeeds
          .mockRejectedValueOnce(new Error('Database error')); // Second call fails

        const request = new NextRequest('http://localhost:3000/api/security/audit/events', {
          method: 'POST',
          body: JSON.stringify(validEventData)
        });

        await POST(request);
        
        // Should attempt to log the error as a security event
        expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            event_type: 'api_error',
            severity: 'high',
            organization_id: 'system'
          })
        );
      });
    });
  });

  describe('GET /api/security/audit/events', () => {
    beforeEach(() => {
      mockAuditManager.validateOrganizationAccess.mockResolvedValue(true);
      mockSupabase.from('audit_logs').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'audit_1',
                  event_type: 'data_access',
                  severity: 'low',
                  organization_id: validEventData.organization_id,
                  created_at: '2025-01-29T12:00:00Z'
                }
              ],
              error: null
            })
          })
        })
      });
    });

    describe('Authentication and Authorization', () => {
      it('should require authentication', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated')
        });

        const request = new NextRequest('http://localhost:3000/api/security/audit/events?organization_id=' + validEventData.organization_id);
        
        const response = await GET(request);
        expect(response.status).toBe(401);
      });

      it('should validate organization access', async () => {
        mockAuditManager.validateOrganizationAccess.mockResolvedValue(false);

        const request = new NextRequest('http://localhost:3000/api/security/audit/events?organization_id=' + validEventData.organization_id);
        
        const response = await GET(request);
        expect(response.status).toBe(403);
        
        const data = await response.json();
        expect(data.error).toBe('Unauthorized organization access');
      });

      it('should require organization_id parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/audit/events');
        
        const response = await GET(request);
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBe('Organization ID required');
      });
    });

    describe('Query Parameters', () => {
      it('should support event_type filtering', async () => {
        const request = new NextRequest(
          `http://localhost:3000/api/security/audit/events?organization_id=${validEventData.organization_id}&event_type=data_access`
        );
        
        const response = await GET(request);
        expect(response.status).toBe(200);
        
        // Verify query builder was called with event_type filter
        expect(mockSupabase.from('audit_logs').select().eq().order().range().eq).toHaveBeenCalledWith('event_type', 'data_access');
      });

      it('should support severity filtering', async () => {
        const request = new NextRequest(
          `http://localhost:3000/api/security/audit/events?organization_id=${validEventData.organization_id}&severity=critical`
        );
        
        const response = await GET(request);
        expect(response.status).toBe(200);
        
        expect(mockSupabase.from('audit_logs').select().eq().order().range().eq).toHaveBeenCalledWith('severity', 'critical');
      });

      it('should support celebrity_only filtering', async () => {
        const request = new NextRequest(
          `http://localhost:3000/api/security/audit/events?organization_id=${validEventData.organization_id}&celebrity_only=true`
        );
        
        const response = await GET(request);
        expect(response.status).toBe(200);
        
        expect(mockSupabase.from('audit_logs').select().eq().order().range().eq).toHaveBeenCalledWith('celebrity_client', true);
      });

      it('should support pagination with limit and offset', async () => {
        const request = new NextRequest(
          `http://localhost:3000/api/security/audit/events?organization_id=${validEventData.organization_id}&limit=25&offset=10`
        );
        
        const response = await GET(request);
        expect(response.status).toBe(200);
        
        expect(mockSupabase.from('audit_logs').select().eq().order().range).toHaveBeenCalledWith(10, 34); // offset to offset + limit - 1
      });
    });

    describe('Response Format', () => {
      it('should return audit events with proper format', async () => {
        const request = new NextRequest(
          `http://localhost:3000/api/security/audit/events?organization_id=${validEventData.organization_id}`
        );
        
        const response = await GET(request);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.events).toBeDefined();
        expect(data.total_count).toBeDefined();
        expect(data.filters).toBeDefined();
        expect(data.pagination).toBeDefined();
      });

      it('should log audit query as security event', async () => {
        const request = new NextRequest(
          `http://localhost:3000/api/security/audit/events?organization_id=${validEventData.organization_id}`
        );
        
        await GET(request);
        
        expect(mockAuditManager.logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            event_type: 'data_access',
            severity: 'low',
            organization_id: validEventData.organization_id,
            event_details: expect.objectContaining({
              action: 'audit_events_query'
            })
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle database query errors', async () => {
        mockSupabase.from('audit_logs').select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockRejectedValue(new Error('Database error'))
            })
          })
        });

        const request = new NextRequest(
          `http://localhost:3000/api/security/audit/events?organization_id=${validEventData.organization_id}`
        );
        
        const response = await GET(request);
        expect(response.status).toBe(500);
        
        const data = await response.json();
        expect(data.error).toBe('Failed to retrieve audit events');
      });
    });
  });
});