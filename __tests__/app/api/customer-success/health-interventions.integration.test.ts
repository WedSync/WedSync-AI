/**
 * WS-168: Integration Tests for Health Interventions API
 * Tests real API endpoints for customer success intervention workflows
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT } from '@/app/api/customer-success/health-interventions/route';
import { createClient } from '@/lib/supabase/server';
import { healthInterventionService } from '@/lib/services/health-intervention-service';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/services/health-intervention-service');

const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn()
};

const mockHealthInterventionService = healthInterventionService as jest.Mocked<typeof healthInterventionService>;

// Test fixtures
const mockUser = {
  id: 'user-123',
  email: 'test@wedsync.com',
  user_metadata: {
    organizationId: 'org-456'
  }
};

const mockAdminUser = {
  id: 'admin-123',
  email: 'admin@wedsync.com',
  user_metadata: {
    organizationId: 'org-456',
    isAdmin: true
  }
};

const mockInterventionMetrics = {
  totalInterventions: 45,
  successfulInterventions: 38,
  averageResponseTime: 2.5,
  riskReduction: 15.3,
  churnPrevented: 8
};

const mockAlerts = [
  {
    id: 'alert-1',
    organization_id: 'org-456',
    supplier_id: 'user-789',
    alert_type: 'critical_health_drop',
    message: 'Health score dropped below 40%',
    created_at: '2024-01-15T10:00:00Z',
    acknowledged: false
  },
  {
    id: 'alert-2',
    organization_id: 'org-456',
    supplier_id: 'user-456',
    alert_type: 'engagement_decline',
    message: 'No activity in 7 days',
    created_at: '2024-01-14T15:30:00Z',
    acknowledged: true
  }
];

const mockNotifications = [
  {
    id: 'notif-1',
    supplier_id: 'user-789',
    organization_id: 'org-456',
    notification_type: 'health_check',
    status: 'sent',
    created_at: '2024-01-15T10:05:00Z'
  },
  {
    id: 'notif-2',
    supplier_id: 'user-456',
    organization_id: 'org-456',
    notification_type: 'engagement_reminder',
    status: 'opened',
    created_at: '2024-01-14T16:00:00Z'
  }
];

const mockHealthSummary = {
  totalSuppliers: 25,
  criticalRisk: 2,
  highRisk: 5,
  mediumRisk: 8,
  lowRisk: 10,
  averageHealthScore: 72.5
};

const mockInterventionResult = {
  processed: true,
  healthScore: 65,
  riskLevel: 'medium',
  interventionSent: true,
  notificationId: 'notif-123'
};

describe('Health Interventions API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    
    // Default successful authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  describe('GET /api/customer-success/health-interventions', () => {
    describe('Metrics Endpoint', () => {
      it('should return intervention metrics for organization', async () => {
        mockHealthInterventionService.getInterventionMetrics.mockResolvedValue(mockInterventionMetrics);

        const url = new URL('http://localhost:3000/api/customer-success/health-interventions');
        url.searchParams.set('action', 'metrics');
        url.searchParams.set('organizationId', 'org-456');
        
        const request = new NextRequest(url);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.metrics).toEqual(mockInterventionMetrics);
        expect(mockHealthInterventionService.getInterventionMetrics).toHaveBeenCalledWith(
          'org-456',
          expect.any(Date),
          expect.any(Date)
        );
      });

      it('should use custom date range when provided', async () => {
        mockHealthInterventionService.getInterventionMetrics.mockResolvedValue(mockInterventionMetrics);

        const url = new URL('http://localhost:3000/api/customer-success/health-interventions');
        url.searchParams.set('action', 'metrics');
        url.searchParams.set('organizationId', 'org-456');
        url.searchParams.set('startDate', '2024-01-01');
        url.searchParams.set('endDate', '2024-01-31');
        
        const request = new NextRequest(url);
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(mockHealthInterventionService.getInterventionMetrics).toHaveBeenCalledWith(
          'org-456',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );
      });

      it('should require organizationId for metrics', async () => {
        const url = new URL('http://localhost:3000/api/customer-success/health-interventions');
        url.searchParams.set('action', 'metrics');
        
        const request = new NextRequest(url);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Organization ID required');
      });
    });

    describe('Alerts Endpoint', () => {
      it('should return admin alerts for organization', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'admin_alerts') {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: mockAlerts, error: null })
                  })
                })
              })
            };
          }
        });

        const url = new URL('http://localhost:3000/api/customer-success/health-interventions');
        url.searchParams.set('action', 'alerts');
        url.searchParams.set('organizationId', 'org-456');
        
        const request = new NextRequest(url);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.alerts).toEqual(mockAlerts);
      });

      it('should filter unacknowledged alerts when requested', async () => {
        const unacknowledgedAlerts = mockAlerts.filter(alert => !alert.acknowledged);
        
        mockSupabase.from.mockImplementation(() => ({
          select: () => ({
            eq: (field: string, value: any) => {
              if (field === 'acknowledged' && value === false) {
                return {
                  order: () => ({
                    limit: () => Promise.resolve({ data: unacknowledgedAlerts, error: null })
                  })
                };
              }
              return {
                eq: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: mockAlerts, error: null })
                  })
                }),
                order: () => ({
                  limit: () => Promise.resolve({ data: mockAlerts, error: null })
                })
              };
            }
          })
        }));

        const url = new URL('http://localhost:3000/api/customer-success/health-interventions');
        url.searchParams.set('action', 'alerts');
        url.searchParams.set('organizationId', 'org-456');
        url.searchParams.set('status', 'unacknowledged');
        
        const request = new NextRequest(url);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.alerts).toEqual(unacknowledgedAlerts);
      });

      it('should respect limit parameter for alerts', async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: (limitNum: number) => {
                  expect(limitNum).toBe(25);
                  return Promise.resolve({ data: mockAlerts.slice(0, 25), error: null });
                }
              })
            })
          })
        }));

        const url = new URL('http://localhost:3000/api/customer-success/health-interventions');
        url.searchParams.set('action', 'alerts');
        url.searchParams.set('organizationId', 'org-456');
        url.searchParams.set('limit', '25');
        
        const request = new NextRequest(url);
        const response = await GET(request);

        expect(response.status).toBe(200);
      });
    });

    describe('Notifications Endpoint', () => {
      it('should return intervention notifications', async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: mockNotifications, error: null })
            }),
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: mockNotifications, error: null })
              })
            })
          })
        }));

        const url = new URL('http://localhost:3000/api/customer-success/health-interventions');
        url.searchParams.set('action', 'notifications');
        
        const request = new NextRequest(url);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.notifications).toEqual(mockNotifications);
      });

      it('should filter notifications by supplier ID', async () => {
        const supplierNotifications = mockNotifications.filter(n => n.supplier_id === 'user-789');
        
        mockSupabase.from.mockImplementation(() => ({
          select: () => ({
            order: () => ({
              limit: () => ({
                eq: (field: string, value: string) => {
                  if (field === 'supplier_id' && value === 'user-789') {
                    return Promise.resolve({ data: supplierNotifications, error: null });
                  }
                  return Promise.resolve({ data: mockNotifications, error: null });
                }
              })
            })
          })
        }));

        const url = new URL('http://localhost:3000/api/customer-success/health-interventions');
        url.searchParams.set('action', 'notifications');
        url.searchParams.set('supplierId', 'user-789');
        
        const request = new NextRequest(url);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.notifications).toEqual(supplierNotifications);
      });
    });

    describe('Health Summary Endpoint', () => {
      it('should return organization health summary', async () => {
        const mockSuppliers = [
          { user_id: 'supplier-1' },
          { user_id: 'supplier-2' },
          { user_id: 'supplier-3' }
        ];

        mockSupabase.from.mockImplementation(() => ({
          select: () => ({
            eq: (field: string, value: any) => {
              if (field === 'organization_id') {
                return {
                  eq: (field2: string, value2: any) => ({
                    eq: (field3: string, value3: any) => Promise.resolve({ 
                      data: mockSuppliers, 
                      error: null 
                    })
                  })
                };
              }
            }
          })
        }));

        mockHealthInterventionService.processHealthIntervention.mockImplementation((userId) => {
          const healthScores = {
            'supplier-1': { healthScore: 85, riskLevel: 'low' },
            'supplier-2': { healthScore: 45, riskLevel: 'high' },
            'supplier-3': { healthScore: 65, riskLevel: 'medium' }
          };
          return Promise.resolve(healthScores[userId as keyof typeof healthScores] || { healthScore: 0, riskLevel: 'unknown' });
        });

        const url = new URL('http://localhost:3000/api/customer-success/health-interventions');
        url.searchParams.set('action', 'health-summary');
        url.searchParams.set('organizationId', 'org-456');
        
        const request = new NextRequest(url);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.summary).toHaveProperty('totalSuppliers', 3);
        expect(data.summary).toHaveProperty('lowRisk');
        expect(data.summary).toHaveProperty('mediumRisk');
        expect(data.summary).toHaveProperty('highRisk');
        expect(data.summary).toHaveProperty('averageHealthScore');
        expect(data.details).toHaveLength(3);
      });
    });

    describe('Authentication and Authorization', () => {
      it('should require authentication', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated')
        });

        const url = new URL('http://localhost:3000/api/customer-success/health-interventions');
        url.searchParams.set('action', 'metrics');
        
        const request = new NextRequest(url);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });

      it('should return error for invalid action', async () => {
        const url = new URL('http://localhost:3000/api/customer-success/health-interventions');
        url.searchParams.set('action', 'invalid-action');
        
        const request = new NextRequest(url);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid action parameter');
      });

      it('should handle database errors gracefully', async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: null, error: new Error('Database error') })
              })
            })
          })
        }));

        const url = new URL('http://localhost:3000/api/customer-success/health-interventions');
        url.searchParams.set('action', 'alerts');
        url.searchParams.set('organizationId', 'org-456');
        
        const request = new NextRequest(url);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });
    });
  });

  describe('POST /api/customer-success/health-interventions', () => {
    describe('Process Intervention Action', () => {
      it('should process health intervention for supplier', async () => {
        mockHealthInterventionService.processHealthIntervention.mockResolvedValue(mockInterventionResult);

        const requestBody = {
          action: 'process-intervention',
          supplierId: 'user-789',
          organizationId: 'org-456',
          forceNotification: false
        };

        const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockInterventionResult);
        expect(mockHealthInterventionService.processHealthIntervention).toHaveBeenCalledWith(
          'user-789',
          'org-456',
          false
        );
      });

      it('should validate required fields for intervention processing', async () => {
        const invalidRequestBody = {
          action: 'process-intervention',
          supplierId: 'invalid-uuid',
          organizationId: 'org-456'
        };

        const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
          method: 'POST',
          body: JSON.stringify(invalidRequestBody)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request data');
      });

      it('should handle force notification parameter', async () => {
        mockHealthInterventionService.processHealthIntervention.mockResolvedValue({
          ...mockInterventionResult,
          interventionSent: true
        });

        const requestBody = {
          action: 'process-intervention',
          supplierId: 'user-789',
          organizationId: 'org-456',
          forceNotification: true
        };

        const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(mockHealthInterventionService.processHealthIntervention).toHaveBeenCalledWith(
          'user-789',
          'org-456',
          true
        );
      });
    });

    describe('Batch Process Action', () => {
      it('should process batch interventions for organization', async () => {
        const batchResult = {
          processed: 5,
          successful: 4,
          failed: 1,
          results: mockInterventionResult
        };

        mockHealthInterventionService.batchProcessInterventions.mockResolvedValue(batchResult);

        const requestBody = {
          action: 'batch-process',
          organizationId: 'org-456',
          supplierIds: ['user-1', 'user-2', 'user-3']
        };

        const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(batchResult);
        expect(mockHealthInterventionService.batchProcessInterventions).toHaveBeenCalledWith(
          'org-456',
          ['user-1', 'user-2', 'user-3']
        );
      });

      it('should validate batch process request data', async () => {
        const invalidRequestBody = {
          action: 'batch-process',
          organizationId: 'invalid-uuid'
        };

        const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
          method: 'POST',
          body: JSON.stringify(invalidRequestBody)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request data');
      });
    });

    describe('Update Tracking Action', () => {
      it('should update notification tracking', async () => {
        mockHealthInterventionService.updateNotificationTracking.mockResolvedValue(undefined);

        const requestBody = {
          action: 'update-tracking',
          notificationId: 'notif-123',
          event: 'opened',
          metadata: { source: 'email' }
        };

        const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockHealthInterventionService.updateNotificationTracking).toHaveBeenCalledWith(
          'notif-123',
          'opened',
          { source: 'email' }
        );
      });

      it('should validate tracking event types', async () => {
        const invalidRequestBody = {
          action: 'update-tracking',
          notificationId: 'notif-123',
          event: 'invalid-event'
        };

        const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
          method: 'POST',
          body: JSON.stringify(invalidRequestBody)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request data');
      });
    });

    describe('Acknowledge Alert Action', () => {
      it('should acknowledge admin alert', async () => {
        mockSupabase.from.mockImplementation(() => ({
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null })
          })
        }));

        const requestBody = {
          action: 'acknowledge-alert',
          alertId: 'alert-123',
          acknowledgedBy: 'admin-456'
        };

        const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });

      it('should handle database errors when acknowledging alerts', async () => {
        mockSupabase.from.mockImplementation(() => ({
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: new Error('Database error') })
          })
        }));

        const requestBody = {
          action: 'acknowledge-alert',
          alertId: 'alert-123',
          acknowledgedBy: 'admin-456'
        };

        const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });
    });

    describe('Test Intervention Action', () => {
      it('should run test intervention', async () => {
        mockHealthInterventionService.processHealthIntervention.mockResolvedValue({
          ...mockInterventionResult,
          test: true
        });

        const requestBody = {
          action: 'test-intervention',
          supplierId: 'user-123',
          organizationId: 'org-456'
        };

        const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.test).toBe(true);
        expect(mockHealthInterventionService.processHealthIntervention).toHaveBeenCalledWith(
          'user-123',
          'org-456',
          true // Force notification for testing
        );
      });
    });

    describe('Error Handling', () => {
      it('should return error for invalid action', async () => {
        const requestBody = {
          action: 'invalid-action'
        };

        const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid action');
      });

      it('should handle malformed JSON requests', async () => {
        const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
          method: 'POST',
          body: 'invalid json'
        });

        const response = await POST(request);

        expect(response.status).toBe(500);
      });
    });
  });

  describe('PUT /api/customer-success/health-interventions (Webhook)', () => {
    it('should handle email tracking webhooks', async () => {
      mockHealthInterventionService.updateNotificationTracking.mockResolvedValue(undefined);

      const webhookBody = {
        event: 'email.opened',
        data: {
          metadata: {
            notificationId: 'notif-123'
          },
          timestamp: '2024-01-15T10:30:00Z'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
        method: 'PUT',
        body: JSON.stringify(webhookBody)
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockHealthInterventionService.updateNotificationTracking).toHaveBeenCalledWith(
        'notif-123',
        'opened',
        webhookBody.data
      );
    });

    it('should handle email click tracking webhooks', async () => {
      mockHealthInterventionService.updateNotificationTracking.mockResolvedValue(undefined);

      const webhookBody = {
        event: 'email.clicked',
        data: {
          metadata: {
            notificationId: 'notif-456'
          },
          clickUrl: 'https://wedsync.com/dashboard'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
        method: 'PUT',
        body: JSON.stringify(webhookBody)
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockHealthInterventionService.updateNotificationTracking).toHaveBeenCalledWith(
        'notif-456',
        'clicked',
        webhookBody.data
      );
    });

    it('should ignore webhooks without notification ID', async () => {
      const webhookBody = {
        event: 'email.opened',
        data: {
          timestamp: '2024-01-15T10:30:00Z'
          // No notificationId in metadata
        }
      };

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
        method: 'PUT',
        body: JSON.stringify(webhookBody)
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockHealthInterventionService.updateNotificationTracking).not.toHaveBeenCalled();
    });

    it('should handle webhook processing errors gracefully', async () => {
      mockHealthInterventionService.updateNotificationTracking.mockRejectedValue(
        new Error('Processing failed')
      );

      const webhookBody = {
        event: 'email.opened',
        data: {
          metadata: {
            notificationId: 'notif-123'
          }
        }
      };

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
        method: 'PUT',
        body: JSON.stringify(webhookBody)
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Webhook processing failed');
    });
  });
});