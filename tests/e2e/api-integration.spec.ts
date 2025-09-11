import { test, expect } from '@playwright/test';

/**
 * API Integration Testing Suite
 * Tests all API endpoints, services, and integrations
 */

test.describe('API Integration Tests', () => {
  
  let authToken: string;
  
  test.beforeAll(async ({ request }) => {
    // Mock authentication for API tests
    const authResponse = await request.post('/api/auth/login', {
      data: {
        email: 'test-api@wedsync.com',
        password: 'test-password-123'
      }
    });
    
    if (authResponse.ok()) {
      const authData = await authResponse.json();
      authToken = authData.token || 'mock-api-token';
    }
  });

  test.describe('Client Management API', () => {
    
    test('POST /api/clients - Create Client', async ({ request }) => {
      const clientData = {
        name: 'API Test Client',
        email: 'api-client@example.com',
        phone: '+1234567890',
        weddingDate: '2024-12-31',
        weddingType: 'traditional',
        notes: 'Created via API integration test'
      };

      const response = await request.post('/api/clients', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: clientData
      });

      expect(response.status()).toBe(201);
      
      const responseData = await response.json();
      expect(responseData).toHaveProperty('id');
      expect(responseData.name).toBe(clientData.name);
      expect(responseData.email).toBe(clientData.email);
      expect(responseData.status).toBe('active');
    });

    test('GET /api/clients - List Clients', async ({ request }) => {
      const response = await request.get('/api/clients', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(200);
      
      const responseData = await response.json();
      expect(Array.isArray(responseData.clients)).toBe(true);
      expect(responseData).toHaveProperty('total');
      expect(responseData).toHaveProperty('page');
      expect(responseData).toHaveProperty('limit');
    });

    test('GET /api/clients/[id] - Get Client Details', async ({ request }) => {
      // First create a client
      const createResponse = await request.post('/api/clients', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: 'Test Client for Details',
          email: 'details-test@example.com',
          phone: '+1987654321'
        }
      });

      const createdClient = await createResponse.json();
      const clientId = createdClient.id;

      // Get client details
      const response = await request.get(`/api/clients/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(200);
      
      const clientData = await response.json();
      expect(clientData.id).toBe(clientId);
      expect(clientData.name).toBe('Test Client for Details');
      expect(clientData.email).toBe('details-test@example.com');
    });

    test('PUT /api/clients/[id] - Update Client', async ({ request }) => {
      // Create client first
      const createResponse = await request.post('/api/clients', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: 'Client to Update',
          email: 'update-test@example.com'
        }
      });

      const createdClient = await createResponse.json();
      const clientId = createdClient.id;

      // Update client
      const updateData = {
        name: 'Updated Client Name',
        phone: '+1111111111',
        weddingDate: '2025-06-15'
      };

      const response = await request.put(`/api/clients/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: updateData
      });

      expect(response.status()).toBe(200);
      
      const updatedClient = await response.json();
      expect(updatedClient.name).toBe(updateData.name);
      expect(updatedClient.phone).toBe(updateData.phone);
      expect(updatedClient.weddingDate).toBe(updateData.weddingDate);
    });
  });

  test.describe('Journey Management API', () => {
    
    test('POST /api/journeys - Create Journey', async ({ request }) => {
      const journeyData = {
        name: 'API Test Journey',
        description: 'Journey created via API test',
        trigger: {
          type: 'form_submit',
          config: {
            formId: 'contact-form'
          }
        },
        nodes: [
          {
            id: 'start',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Form Submit' }
          },
          {
            id: 'email',
            type: 'action',
            position: { x: 300, y: 100 },
            data: { 
              label: 'Send Welcome Email',
              actionType: 'send-email',
              template: 'welcome'
            }
          }
        ],
        edges: [
          {
            id: 'start-email',
            source: 'start',
            target: 'email'
          }
        ]
      };

      const response = await request.post('/api/journeys', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: journeyData
      });

      expect(response.status()).toBe(201);
      
      const responseData = await response.json();
      expect(responseData).toHaveProperty('id');
      expect(responseData.name).toBe(journeyData.name);
      expect(responseData.status).toBe('draft');
      expect(responseData.nodes).toHaveLength(2);
      expect(responseData.edges).toHaveLength(1);
    });

    test('POST /api/journeys/[id]/publish - Publish Journey', async ({ request }) => {
      // Create journey first
      const createResponse = await request.post('/api/journeys', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: 'Journey to Publish',
          description: 'Test journey for publishing',
          nodes: [
            {
              id: 'trigger',
              type: 'trigger',
              data: { label: 'Start' }
            }
          ]
        }
      });

      const journey = await createResponse.json();
      const journeyId = journey.id;

      // Publish journey
      const response = await request.post(`/api/journeys/${journeyId}/publish`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(200);
      
      const publishedJourney = await response.json();
      expect(publishedJourney.status).toBe('active');
      expect(publishedJourney).toHaveProperty('publishedAt');
    });

    test('POST /api/journeys/execute - Execute Journey', async ({ request }) => {
      const executionData = {
        journeyId: 'journey-test-123',
        triggerData: {
          formSubmissionId: 'form-sub-456',
          clientData: {
            name: 'Test Client',
            email: 'test@example.com'
          }
        }
      };

      const response = await request.post('/api/journeys/execute', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: executionData
      });

      expect(response.status()).toBe(200);
      
      const executionResult = await response.json();
      expect(executionResult).toHaveProperty('executionId');
      expect(executionResult.status).toBe('initiated');
      expect(Array.isArray(executionResult.steps)).toBe(true);
    });
  });

  test.describe('Email Service API', () => {
    
    test('POST /api/email/send - Send Email', async ({ request }) => {
      const emailData = {
        to: 'test-recipient@example.com',
        templateId: 'welcome',
        data: {
          clientName: 'Test Client',
          weddingDate: '2024-12-31'
        },
        trackingId: 'email-track-123'
      };

      const response = await request.post('/api/email/send', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: emailData
      });

      expect(response.status()).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toHaveProperty('messageId');
      expect(responseData.status).toBe('queued');
      expect(responseData.to).toBe(emailData.to);
      expect(responseData.template).toBe(emailData.templateId);
    });

    test('GET /api/email/status/[messageId] - Check Email Status', async ({ request }) => {
      const messageId = 'msg-test-123';
      
      const response = await request.get(`/api/email/status/${messageId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(200);
      
      const statusData = await response.json();
      expect(statusData).toHaveProperty('messageId', messageId);
      expect(statusData).toHaveProperty('status');
      expect(statusData).toHaveProperty('events');
      expect(Array.isArray(statusData.events)).toBe(true);
    });

    test('POST /api/webhooks/sendgrid - SendGrid Webhook', async ({ request }) => {
      const webhookData = [
        {
          email: 'test@example.com',
          timestamp: Math.floor(Date.now() / 1000),
          event: 'delivered',
          'sg_message_id': 'msg-test-webhook-123',
          'sg_event_id': 'event-test-456'
        }
      ];

      const response = await request.post('/api/webhooks/sendgrid', {
        headers: {
          'Content-Type': 'application/json',
          'X-Twilio-Email-Event-Webhook-Signature': 'mock-signature',
          'X-Twilio-Email-Event-Webhook-Timestamp': Date.now().toString()
        },
        data: webhookData
      });

      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result.processed).toBe(1);
      expect(result.status).toBe('success');
    });
  });

  test.describe('SMS Service API', () => {
    
    test('POST /api/sms/send - Send SMS', async ({ request }) => {
      const smsData = {
        to: '+1234567890',
        message: 'Test SMS from API integration',
        trackingId: 'sms-track-789'
      };

      const response = await request.post('/api/sms/send', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: smsData
      });

      expect(response.status()).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toHaveProperty('sid');
      expect(responseData.status).toBe('queued');
      expect(responseData.to).toBe(smsData.to);
    });

    test('POST /api/webhooks/twilio - Twilio SMS Webhook', async ({ request }) => {
      const webhookData = new URLSearchParams({
        MessageSid: 'sms-test-webhook-456',
        MessageStatus: 'delivered',
        To: '+1234567890',
        From: '+1987654321',
        Body: 'Test webhook message'
      });

      const response = await request.post('/api/webhooks/twilio', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': 'mock-twilio-signature'
        },
        data: webhookData.toString()
      });

      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result.status).toBe('success');
      expect(result.messageSid).toBe('sms-test-webhook-456');
    });
  });

  test.describe('Form Management API', () => {
    
    test('POST /api/forms - Create Form', async ({ request }) => {
      const formData = {
        name: 'API Test Form',
        slug: 'api-test-form',
        description: 'Form created via API test',
        fields: [
          {
            id: 'name',
            type: 'text',
            label: 'Full Name',
            required: true,
            validation: {
              minLength: 2,
              maxLength: 100
            }
          },
          {
            id: 'email',
            type: 'email',
            label: 'Email Address',
            required: true
          },
          {
            id: 'message',
            type: 'textarea',
            label: 'Message',
            required: false
          }
        ],
        settings: {
          enableCaptcha: true,
          redirectUrl: '/thank-you',
          emailNotifications: true
        }
      };

      const response = await request.post('/api/forms', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: formData
      });

      expect(response.status()).toBe(201);
      
      const responseData = await response.json();
      expect(responseData).toHaveProperty('id');
      expect(responseData.name).toBe(formData.name);
      expect(responseData.slug).toBe(formData.slug);
      expect(responseData.fields).toHaveLength(3);
      expect(responseData.status).toBe('active');
    });

    test('POST /api/forms/[id]/submit - Submit Form', async ({ request }) => {
      const formId = 'form-test-123';
      const submissionData = {
        name: 'API Test Submitter',
        email: 'submitter@example.com',
        message: 'This is a test submission via API'
      };

      const response = await request.post(`/api/forms/${formId}/submit`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.100'
        },
        data: submissionData
      });

      expect(response.status()).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toHaveProperty('submissionId');
      expect(responseData.status).toBe('success');
      expect(responseData).toHaveProperty('triggeredJourneys');
      expect(Array.isArray(responseData.triggeredJourneys)).toBe(true);
    });

    test('GET /api/forms/[id]/submissions - Get Form Submissions', async ({ request }) => {
      const formId = 'form-test-123';
      
      const response = await request.get(`/api/forms/${formId}/submissions`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(200);
      
      const responseData = await response.json();
      expect(Array.isArray(responseData.submissions)).toBe(true);
      expect(responseData).toHaveProperty('total');
      expect(responseData).toHaveProperty('page');
    });
  });

  test.describe('Analytics API', () => {
    
    test('GET /api/analytics/overview - Get Analytics Overview', async ({ request }) => {
      const response = await request.get('/api/analytics/overview', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(200);
      
      const analyticsData = await response.json();
      expect(analyticsData).toHaveProperty('metrics');
      expect(analyticsData.metrics).toHaveProperty('totalClients');
      expect(analyticsData.metrics).toHaveProperty('totalJourneys');
      expect(analyticsData.metrics).toHaveProperty('emailsSent');
      expect(analyticsData.metrics).toHaveProperty('conversionRate');
    });

    test('GET /api/analytics/journeys - Get Journey Analytics', async ({ request }) => {
      const response = await request.get('/api/analytics/journeys?period=last-30-days', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(200);
      
      const journeyAnalytics = await response.json();
      expect(Array.isArray(journeyAnalytics.journeys)).toBe(true);
      expect(journeyAnalytics).toHaveProperty('summary');
      expect(journeyAnalytics.summary).toHaveProperty('totalExecutions');
      expect(journeyAnalytics.summary).toHaveProperty('successRate');
    });

    test('GET /api/analytics/performance - Get Performance Metrics', async ({ request }) => {
      const response = await request.get('/api/analytics/performance', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(200);
      
      const performanceData = await response.json();
      expect(performanceData).toHaveProperty('responseTime');
      expect(performanceData).toHaveProperty('throughput');
      expect(performanceData).toHaveProperty('errorRate');
      expect(performanceData).toHaveProperty('uptime');
    });
  });

  test.describe('Health and Status API', () => {
    
    test('GET /api/health - Health Check', async ({ request }) => {
      const response = await request.get('/api/health');

      expect(response.status()).toBe(200);
      
      const healthData = await response.json();
      expect(healthData.status).toBe('healthy');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('services');
      expect(healthData.services).toHaveProperty('database');
      expect(healthData.services).toHaveProperty('email');
      expect(healthData.services).toHaveProperty('sms');
    });

    test('GET /api/status - System Status', async ({ request }) => {
      const response = await request.get('/api/status', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(200);
      
      const statusData = await response.json();
      expect(statusData).toHaveProperty('system');
      expect(statusData).toHaveProperty('version');
      expect(statusData).toHaveProperty('uptime');
      expect(statusData).toHaveProperty('environment');
    });
  });

  test.describe('Error Handling and Rate Limiting', () => {
    
    test('Rate Limiting - Exceeded Limits', async ({ request }) => {
      // Simulate rapid requests to trigger rate limiting
      const requests = Array.from({ length: 20 }, (_, i) => 
        request.get('/api/clients', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      
      // Should have some rate limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Check rate limit headers
      const rateLimitedResponse = rateLimitedResponses[0];
      const headers = rateLimitedResponse.headers();
      expect(headers).toHaveProperty('x-ratelimit-limit');
      expect(headers).toHaveProperty('x-ratelimit-remaining');
      expect(headers).toHaveProperty('retry-after');
    });

    test('Invalid Authentication', async ({ request }) => {
      const response = await request.get('/api/clients', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      expect(response.status()).toBe(401);
      
      const errorData = await response.json();
      expect(errorData).toHaveProperty('error');
      expect(errorData.error).toContain('Authentication');
    });

    test('Invalid Request Data', async ({ request }) => {
      const response = await request.post('/api/clients', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          // Missing required fields
          name: '',
          email: 'invalid-email'
        }
      });

      expect(response.status()).toBe(400);
      
      const errorData = await response.json();
      expect(errorData).toHaveProperty('error');
      expect(errorData).toHaveProperty('validation');
      expect(Array.isArray(errorData.validation.errors)).toBe(true);
    });

    test('Not Found Resources', async ({ request }) => {
      const response = await request.get('/api/clients/non-existent-id', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(404);
      
      const errorData = await response.json();
      expect(errorData).toHaveProperty('error');
      expect(errorData.error).toContain('not found');
    });
  });
});