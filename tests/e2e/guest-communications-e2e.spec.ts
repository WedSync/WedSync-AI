/**
 * WS-155: End-to-End Guest Communications Testing
 * Comprehensive pipeline validation and integration testing
 */

import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TestContext {
  authToken: string;
  testWeddingId: string;
  testGuestId: string;
  testEmail: string;
  messageIds: string[];
}

test.describe('Guest Communications E2E Pipeline', () => {
  let context: TestContext;
  
  test.beforeAll(async ({ request }) => {
    // Setup test context
    context = {
      authToken: await getAuthToken(request),
      testWeddingId: faker.datatype.uuid(),
      testGuestId: faker.datatype.uuid(),
      testEmail: faker.internet.email(),
      messageIds: []
    };
    
    // Setup test wedding and guest
    await setupTestData(request, context);
  });
  
  test.afterAll(async ({ request }) => {
    // Cleanup test data
    await cleanupTestData(request, context);
  });
  
  test('Complete Message Lifecycle - Single Message', async ({ request }) => {
    console.log('🧪 Testing complete message lifecycle...');
    
    // Step 1: Check compliance before sending
    const complianceCheck = await request.post(
      `${API_BASE_URL}/api/communications/compliance/check`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          email: context.testEmail,
          action: 'send_marketing',
          jurisdiction: 'US'
        }
      }
    );
    
    expect(complianceCheck.ok()).toBeTruthy();
    const compliance = await complianceCheck.json();
    expect(compliance.allowed).toBe(true);
    
    // Step 2: Send message
    const sendResponse = await request.post(
      `${API_BASE_URL}/api/communications/messages/send`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          recipientId: context.testGuestId,
          recipientEmail: context.testEmail,
          subject: 'E2E Test Message',
          content: 'This is an end-to-end test message.',
          type: 'email',
          metadata: {
            weddingId: context.testWeddingId,
            testId: 'e2e-single-message'
          }
        }
      }
    );
    
    expect(sendResponse.ok()).toBeTruthy();
    const sendResult = await sendResponse.json();
    expect(sendResult.messageId).toBeDefined();
    expect(sendResult.status).toBe('queued');
    
    context.messageIds.push(sendResult.messageId);
    
    // Step 3: Track message status
    await waitForMessageDelivery(request, sendResult.messageId);
    
    const statusResponse = await request.get(
      `${API_BASE_URL}/api/communications/messages/${sendResult.messageId}`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    );
    
    expect(statusResponse.ok()).toBeTruthy();
    const status = await statusResponse.json();
    expect(['sent', 'delivered']).toContain(status.status);
    
    console.log('✅ Single message lifecycle completed successfully');
  });
  
  test('Bulk Message Pipeline', async ({ request }) => {
    console.log('🧪 Testing bulk message pipeline...');
    
    // Generate test recipients
    const recipients = Array.from({ length: 10 }, () => ({
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      variables: {
        name: faker.person.fullName(),
        weddingDate: '2024-06-15'
      }
    }));
    
    // Step 1: Send bulk messages
    const bulkResponse = await request.post(
      `${API_BASE_URL}/api/communications/messages/bulk`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          recipients,
          subject: 'Bulk E2E Test: {{name}}',
          content: 'Hi {{name}}, your wedding on {{weddingDate}} approaches!',
          type: 'email',
          batchSize: 5,
          batchDelay: 10
        }
      }
    );
    
    expect(bulkResponse.ok()).toBeTruthy();
    const bulkResult = await bulkResponse.json();
    expect(bulkResult.batchId).toBeDefined();
    expect(bulkResult.totalMessages).toBe(10);
    expect(bulkResult.queuedMessages).toBe(10);
    
    // Step 2: Monitor bulk processing
    await waitForBulkCompletion(request, bulkResult.batchId);
    
    console.log('✅ Bulk message pipeline completed successfully');
  });
  
  test('Template Message Processing', async ({ request }) => {
    console.log('🧪 Testing template message processing...');
    
    // Step 1: Send template message
    const templateResponse = await request.post(
      `${API_BASE_URL}/api/communications/messages/template`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          templateId: 'wedding-invitation',
          recipientEmail: context.testEmail,
          variables: {
            guestName: 'John Doe',
            weddingDate: '2024-06-15',
            venue: 'Grand Ballroom',
            rsvpLink: `https://wedsync.com/rsvp/${context.testWeddingId}`
          }
        }
      }
    );
    
    expect(templateResponse.ok()).toBeTruthy();
    const templateResult = await templateResponse.json();
    expect(templateResult.messageId).toBeDefined();
    
    context.messageIds.push(templateResult.messageId);
    
    // Step 2: Verify template processing
    await waitForMessageDelivery(request, templateResult.messageId);
    
    console.log('✅ Template message processing completed successfully');
  });
  
  test('Compliance Workflow - GDPR', async ({ request }) => {
    console.log('🧪 Testing GDPR compliance workflow...');
    
    // Step 1: Record consent
    const consentResponse = await request.post(
      `${API_BASE_URL}/api/communications/compliance/consent`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          email: context.testEmail,
          consentType: 'marketing',
          granted: true,
          jurisdiction: 'EU'
        }
      }
    );
    
    expect(consentResponse.ok()).toBeTruthy();
    const consent = await consentResponse.json();
    expect(consent.consentId).toBeDefined();
    expect(consent.status).toBe('granted');
    
    // Step 2: Check consent status
    const statusResponse = await request.get(
      `${API_BASE_URL}/api/communications/compliance/status?email=${context.testEmail}`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    );
    
    expect(statusResponse.ok()).toBeTruthy();
    const status = await statusResponse.json();
    expect(status.consents).toBeDefined();
    expect(status.consents.length).toBeGreaterThan(0);
    
    // Step 3: Submit data access request
    const dataRequestResponse = await request.post(
      `${API_BASE_URL}/api/communications/compliance/data-request`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          email: context.testEmail,
          requestType: 'access'
        }
      }
    );
    
    expect(dataRequestResponse.ok()).toBeTruthy();
    const dataRequest = await dataRequestResponse.json();
    expect(dataRequest.requiresVerification).toBe(true);
    
    console.log('✅ GDPR compliance workflow completed successfully');
  });
  
  test('Rate Limiting Protection', async ({ request }) => {
    console.log('🧪 Testing rate limiting protection...');
    
    // Step 1: Make requests within limit
    const normalRequests = [];
    for (let i = 0; i < 5; i++) {
      normalRequests.push(
        request.post(`${API_BASE_URL}/api/communications/messages/send`, {
          headers: {
            'Authorization': `Bearer ${context.authToken}`,
            'Content-Type': 'application/json'
          },
          data: {
            recipientId: context.testGuestId,
            recipientEmail: context.testEmail,
            subject: `Rate Limit Test ${i}`,
            content: 'Testing rate limits',
            type: 'email'
          }
        })
      );
    }
    
    const normalResponses = await Promise.all(normalRequests);
    normalResponses.forEach(response => {
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['x-ratelimit-remaining']).toBeDefined();
    });
    
    // Step 2: Exceed rate limit
    const excessRequests = [];
    for (let i = 0; i < 50; i++) {
      excessRequests.push(
        request.post(`${API_BASE_URL}/api/communications/messages/send`, {
          headers: {
            'Authorization': `Bearer ${context.authToken}`,
            'Content-Type': 'application/json',
            'X-Test-Rate-Limit': 'true'
          },
          data: {
            recipientId: context.testGuestId,
            recipientEmail: context.testEmail,
            subject: `Excess Request ${i}`,
            content: 'Testing rate limit excess',
            type: 'email'
          }
        })
      );
    }
    
    const excessResponses = await Promise.all(excessRequests);
    const rateLimitedResponses = excessResponses.filter(
      response => response.status() === 429
    );
    
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
    
    // Step 3: Verify rate limit headers
    const rateLimitedResponse = rateLimitedResponses[0];
    expect(rateLimitedResponse.headers()['retry-after']).toBeDefined();
    expect(rateLimitedResponse.headers()['x-ratelimit-reset']).toBeDefined();
    
    console.log('✅ Rate limiting protection working correctly');
  });
  
  test('Error Handling and Recovery', async ({ request }) => {
    console.log('🧪 Testing error handling and recovery...');
    
    // Step 1: Test invalid email format
    const invalidEmailResponse = await request.post(
      `${API_BASE_URL}/api/communications/messages/send`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          recipientId: context.testGuestId,
          recipientEmail: 'invalid-email',
          subject: 'Test',
          content: 'Test content',
          type: 'email'
        }
      }
    );
    
    expect(invalidEmailResponse.status()).toBe(400);
    const invalidEmailError = await invalidEmailResponse.json();
    expect(invalidEmailError.error).toBeDefined();
    expect(invalidEmailError.code).toBe('INVALID_EMAIL');
    
    // Step 2: Test missing required fields
    const missingFieldsResponse = await request.post(
      `${API_BASE_URL}/api/communications/messages/send`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          recipientId: context.testGuestId,
          type: 'email'
          // Missing subject and content
        }
      }
    );
    
    expect(missingFieldsResponse.status()).toBe(400);
    
    // Step 3: Test unauthorized access
    const unauthorizedResponse = await request.post(
      `${API_BASE_URL}/api/communications/messages/send`,
      {
        headers: {
          'Content-Type': 'application/json'
          // No authorization header
        },
        data: {
          recipientId: context.testGuestId,
          recipientEmail: context.testEmail,
          subject: 'Test',
          content: 'Test content',
          type: 'email'
        }
      }
    );
    
    expect(unauthorizedResponse.status()).toBe(401);
    
    console.log('✅ Error handling working correctly');
  });
  
  test('Analytics and Monitoring', async ({ request }) => {
    console.log('🧪 Testing analytics and monitoring...');
    
    // Step 1: Get health status
    const healthResponse = await request.get(
      `${API_BASE_URL}/api/communications/health`
    );
    
    expect(healthResponse.ok()).toBeTruthy();
    const health = await healthResponse.json();
    expect(health.status).toBeDefined();
    expect(health.metrics).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    
    // Step 2: Get analytics
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const analyticsResponse = await request.get(
      `${API_BASE_URL}/api/communications/analytics?` +
      `weddingId=${context.testWeddingId}&` +
      `startDate=${startDate.toISOString()}&` +
      `endDate=${endDate.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    );
    
    expect(analyticsResponse.ok()).toBeTruthy();
    const analytics = await analyticsResponse.json();
    expect(analytics.summary).toBeDefined();
    expect(analytics.timeSeries).toBeDefined();
    
    console.log('✅ Analytics and monitoring working correctly');
  });
  
  test('Message List and Filtering', async ({ request }) => {
    console.log('🧪 Testing message list and filtering...');
    
    // Step 1: Get all messages
    const allMessagesResponse = await request.get(
      `${API_BASE_URL}/api/communications/messages?limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    );
    
    expect(allMessagesResponse.ok()).toBeTruthy();
    const allMessages = await allMessagesResponse.json();
    expect(allMessages.messages).toBeDefined();
    expect(allMessages.pagination).toBeDefined();
    
    // Step 2: Filter by wedding ID
    const weddingMessagesResponse = await request.get(
      `${API_BASE_URL}/api/communications/messages?weddingId=${context.testWeddingId}`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    );
    
    expect(weddingMessagesResponse.ok()).toBeTruthy();
    const weddingMessages = await weddingMessagesResponse.json();
    expect(weddingMessages.messages).toBeDefined();
    
    // Step 3: Filter by type
    const emailMessagesResponse = await request.get(
      `${API_BASE_URL}/api/communications/messages?type=email`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    );
    
    expect(emailMessagesResponse.ok()).toBeTruthy();
    const emailMessages = await emailMessagesResponse.json();
    expect(emailMessages.messages).toBeDefined();
    
    console.log('✅ Message listing and filtering working correctly');
  });
});

// Helper functions
async function getAuthToken(request: any): Promise<string> {
  // Implementation would get actual auth token
  // For testing purposes, return a mock token
  return 'test-auth-token-' + Date.now();
}

async function setupTestData(request: any, context: TestContext) {
  console.log('Setting up test data...');
  
  // Create test wedding
  await request.post(`${API_BASE_URL}/api/test/weddings`, {
    headers: {
      'Authorization': `Bearer ${context.authToken}`,
      'Content-Type': 'application/json'
    },
    data: {
      id: context.testWeddingId,
      name: 'E2E Test Wedding',
      date: '2024-06-15'
    }
  });
  
  // Create test guest
  await request.post(`${API_BASE_URL}/api/test/guests`, {
    headers: {
      'Authorization': `Bearer ${context.authToken}`,
      'Content-Type': 'application/json'
    },
    data: {
      id: context.testGuestId,
      email: context.testEmail,
      name: 'E2E Test Guest',
      weddingId: context.testWeddingId
    }
  });
  
  console.log('✅ Test data setup complete');
}

async function cleanupTestData(request: any, context: TestContext) {
  console.log('Cleaning up test data...');
  
  // Delete test messages
  for (const messageId of context.messageIds) {
    await request.delete(
      `${API_BASE_URL}/api/test/messages/${messageId}`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    );
  }
  
  // Delete test guest
  await request.delete(
    `${API_BASE_URL}/api/test/guests/${context.testGuestId}`,
    {
      headers: {
        'Authorization': `Bearer ${context.authToken}`
      }
    }
  );
  
  // Delete test wedding
  await request.delete(
    `${API_BASE_URL}/api/test/weddings/${context.testWeddingId}`,
    {
      headers: {
        'Authorization': `Bearer ${context.authToken}`
      }
    }
  );
  
  console.log('✅ Test data cleanup complete');
}

async function waitForMessageDelivery(
  request: any, 
  messageId: string, 
  maxAttempts: number = 30
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const statusResponse = await request.get(
      `${API_BASE_URL}/api/communications/messages/${messageId}`,
      {
        headers: {
          'Authorization': 'Bearer test-auth-token'
        }
      }
    );
    
    if (statusResponse.ok()) {
      const status = await statusResponse.json();
      if (['sent', 'delivered', 'failed'].includes(status.status)) {
        return;
      }
    }
    
    // Wait 2 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Message ${messageId} did not reach final state within timeout`);
}

async function waitForBulkCompletion(
  request: any, 
  batchId: string, 
  maxAttempts: number = 60
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const statusResponse = await request.get(
      `${API_BASE_URL}/api/communications/batches/${batchId}`,
      {
        headers: {
          'Authorization': 'Bearer test-auth-token'
        }
      }
    );
    
    if (statusResponse.ok()) {
      const status = await statusResponse.json();
      if (['completed', 'failed'].includes(status.status)) {
        return;
      }
    }
    
    // Wait 5 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  throw new Error(`Bulk batch ${batchId} did not complete within timeout`);
}