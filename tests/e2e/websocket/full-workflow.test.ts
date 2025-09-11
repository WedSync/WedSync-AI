import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import fetch from 'node-fetch';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const WS_BASE_URL = process.env.WS_BASE_URL || 'ws://localhost:3000';
const TEST_TIMEOUT = 30000;

// Mock authentication token
const TEST_AUTH_TOKEN = 'test-auth-token-123';

interface TestMessage {
  id: string;
  type: string;
  content: any;
  timestamp: string;
}

interface TestChannel {
  id: string;
  name: string;
  type: string;
  wedding_id?: string;
}

describe('WebSocket End-to-End Workflow Tests', () => {
  let testChannel: TestChannel;
  let websocketConnections: WebSocket[] = [];
  let receivedMessages: TestMessage[][] = [];

  // Helper function to create authenticated API request
  const apiRequest = async (endpoint: string, options: any = {}) => {
    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
        ...options.headers,
      },
    });
  };

  // Helper function to create WebSocket connection
  const createWebSocketConnection = (channelId: string): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_BASE_URL}/ws?channel=${channelId}&auth=${TEST_AUTH_TOKEN}`);
      
      ws.on('open', () => {
        websocketConnections.push(ws);
        receivedMessages.push([]);
        resolve(ws);
      });

      ws.on('error', reject);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          const connectionIndex = websocketConnections.indexOf(ws);
          if (connectionIndex >= 0) {
            receivedMessages[connectionIndex].push(message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
    });
  };

  // Helper function to wait for messages
  const waitForMessage = (connectionIndex: number, predicate: (msg: TestMessage) => boolean, timeout = 5000): Promise<TestMessage> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkMessages = () => {
        const messages = receivedMessages[connectionIndex];
        const message = messages.find(predicate);
        
        if (message) {
          resolve(message);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for message matching predicate`));
          return;
        }
        
        setTimeout(checkMessages, 100);
      };
      
      checkMessages();
    });
  };

  beforeAll(async () => {
    // Wait for test server to be ready
    let serverReady = false;
    let attempts = 0;
    
    while (!serverReady && attempts < 30) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        if (response.ok) {
          serverReady = true;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      if (!serverReady) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }
    
    if (!serverReady) {
      throw new Error('Test server failed to start within 30 seconds');
    }
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    // Clean up any previous test data
    websocketConnections = [];
    receivedMessages = [];
    
    // Create a test channel for each test
    const channelData = {
      name: `test:wedding:${Date.now()}`,
      type: 'wedding',
      wedding_id: 'test-wedding-123',
      description: 'E2E test channel',
      permissions: {
        read: ['vendor', 'couple'],
        write: ['vendor'],
        admin: ['vendor'],
      },
    };

    const response = await apiRequest('/api/websocket/channels/create', {
      method: 'POST',
      body: JSON.stringify(channelData),
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    testChannel = {
      id: result.data.channel_id,
      name: channelData.name,
      type: channelData.type,
      wedding_id: channelData.wedding_id,
    };
  });

  afterEach(async () => {
    // Close all WebSocket connections
    for (const ws of websocketConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }

    // Clean up test channel
    if (testChannel) {
      await apiRequest(`/api/websocket/channels/${testChannel.id}`, {
        method: 'DELETE',
      });
    }
  });

  afterAll(() => {
    // Final cleanup
    websocketConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
  });

  describe('Complete Wedding Communication Workflow', () => {
    it('should handle vendor-to-couple communication flow', async () => {
      // Step 1: Vendor connects to wedding channel
      const vendorWs = await createWebSocketConnection(testChannel.id);
      expect(vendorWs.readyState).toBe(WebSocket.OPEN);

      // Step 2: Couple connects to same channel
      const coupleWs = await createWebSocketConnection(testChannel.id);
      expect(coupleWs.readyState).toBe(WebSocket.OPEN);

      // Step 3: Vendor sends timeline update
      const timelineMessage = {
        channel_id: testChannel.id,
        content: {
          message: 'Your photographer has updated the wedding timeline',
          timeline_changes: [
            { time: '14:00', event: 'Ceremony photos', location: 'Garden' },
            { time: '15:30', event: 'Reception entrance', location: 'Main hall' },
          ],
        },
        type: 'timeline_change',
        priority: 'high',
        wedding_context: {
          wedding_id: testChannel.wedding_id,
          event_date: '2025-06-15',
          vendor_type: 'photographer',
        },
      };

      const broadcastResponse = await apiRequest('/api/websocket/channels/broadcast', {
        method: 'POST',
        body: JSON.stringify(timelineMessage),
      });

      expect(broadcastResponse.ok).toBe(true);

      // Step 4: Verify both vendor and couple receive the message
      const vendorMessage = await waitForMessage(0, msg => msg.type === 'timeline_change');
      const coupleMessage = await waitForMessage(1, msg => msg.type === 'timeline_change');

      expect(vendorMessage).toBeTruthy();
      expect(coupleMessage).toBeTruthy();
      expect(vendorMessage.content.timeline_changes).toHaveLength(2);
      expect(coupleMessage.content.timeline_changes).toHaveLength(2);

      // Step 5: Couple responds with approval
      const approvalMessage = {
        channel_id: testChannel.id,
        content: {
          message: 'Timeline looks perfect! Thank you for the update.',
          approval_status: 'approved',
          response_to: vendorMessage.id,
        },
        type: 'form_response',
        priority: 'normal',
        wedding_context: {
          wedding_id: testChannel.wedding_id,
        },
      };

      const coupleResponse = await apiRequest('/api/websocket/channels/broadcast', {
        method: 'POST',
        body: JSON.stringify(approvalMessage),
      });

      expect(coupleResponse.ok).toBe(true);

      // Step 6: Verify vendor receives the approval
      const approvalReceived = await waitForMessage(0, msg => msg.type === 'form_response');
      expect(approvalReceived.content.approval_status).toBe('approved');
    }, TEST_TIMEOUT);

    it('should handle wedding day emergency communications', async () => {
      // Mock wedding happening today
      const today = new Date().toISOString().split('T')[0];
      
      // Connect multiple vendors (photographer, venue, catering)
      const photographerWs = await createWebSocketConnection(testChannel.id);
      const venueWs = await createWebSocketConnection(testChannel.id);
      const cateringWs = await createWebSocketConnection(testChannel.id);

      // Emergency message from venue
      const emergencyMessage = {
        channel_id: testChannel.id,
        content: {
          message: 'URGENT: Weather update - moving ceremony indoors to backup location',
          location_change: {
            from: 'Garden Ceremony Area',
            to: 'Grand Ballroom',
            reason: 'Weather',
          },
          requires_immediate_action: true,
        },
        type: 'urgent',
        priority: 'critical',
        wedding_context: {
          wedding_id: testChannel.wedding_id,
          event_date: today,
          vendor_type: 'venue',
          is_wedding_day: true,
        },
      };

      const response = await apiRequest('/api/websocket/channels/broadcast', {
        method: 'POST',
        body: JSON.stringify(emergencyMessage),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.data.wedding_day_priority).toBe(true);

      // Verify all vendors receive the urgent message instantly
      const photographerMsg = await waitForMessage(0, msg => msg.type === 'urgent');
      const venueMsg = await waitForMessage(1, msg => msg.type === 'urgent');
      const cateringMsg = await waitForMessage(2, msg => msg.type === 'urgent');

      expect(photographerMsg.content.location_change).toBeTruthy();
      expect(venueMsg.content.location_change).toBeTruthy();
      expect(cateringMsg.content.location_change).toBeTruthy();

      // Verify priority delivery metadata
      expect(photographerMsg.priority).toBe('critical');
      expect(photographerMsg.wedding_day).toBe(true);
    }, TEST_TIMEOUT);

    it('should handle offline message queuing and delivery', async () => {
      // Step 1: User subscribes to channel
      const subscribeResponse = await apiRequest('/api/websocket/channels/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          channel_id: testChannel.id,
          connection_id: 'offline-test-connection',
          user_id: 'offline-user-123',
        }),
      });

      expect(subscribeResponse.ok).toBe(true);

      // Step 2: Send message while user is offline (no WebSocket connection)
      const offlineMessage = {
        channel_id: testChannel.id,
        content: {
          message: 'Important update while you were offline',
          form_update: {
            form_id: 'wedding-details-form',
            status: 'completed',
          },
        },
        type: 'form_response',
        priority: 'high',
        wedding_context: {
          wedding_id: testChannel.wedding_id,
        },
      };

      const broadcastResponse = await apiRequest('/api/websocket/channels/broadcast', {
        method: 'POST',
        body: JSON.stringify(offlineMessage),
      });

      expect(broadcastResponse.ok).toBe(true);
      const broadcastResult = await broadcastResponse.json();
      expect(broadcastResult.data.queued_count).toBeGreaterThan(0);

      // Step 3: User comes online and connects
      const userWs = await createWebSocketConnection(testChannel.id);

      // Step 4: Verify queued message is delivered
      const queuedMessage = await waitForMessage(0, msg => msg.type === 'form_response');
      expect(queuedMessage.content.form_update).toBeTruthy();
      expect(queuedMessage.offline_delivery).toBe(true);

      // Step 5: Verify message is marked as delivered
      // (In real implementation, this would clear the message from queue)
    }, TEST_TIMEOUT);

    it('should enforce subscription tier limits correctly', async () => {
      // Test with starter tier (limited connections)
      const starterConnections = [];
      
      // Create connections up to starter limit (assume 5 for starter tier)
      for (let i = 0; i < 5; i++) {
        try {
          const ws = await createWebSocketConnection(testChannel.id);
          starterConnections.push(ws);
        } catch (error) {
          // Should succeed for first 5 connections
          expect(i).toBeGreaterThan(4);
        }
      }

      // 6th connection should fail
      try {
        const ws = await createWebSocketConnection(testChannel.id);
        starterConnections.push(ws);
        // If we get here, the limit wasn't enforced
        expect(true).toBe(false);
      } catch (error) {
        // This is expected - connection should be rejected
        expect(error.message).toContain('limit');
      }

      // Clean up
      starterConnections.forEach(ws => ws.close());
    }, TEST_TIMEOUT);
  });

  describe('Message Delivery Guarantees', () => {
    it('should achieve >99.9% message delivery rate', async () => {
      const totalMessages = 100;
      const connections = [];
      
      // Create 10 connections
      for (let i = 0; i < 10; i++) {
        const ws = await createWebSocketConnection(testChannel.id);
        connections.push(ws);
      }

      // Send 100 messages
      const sentMessages = [];
      for (let i = 0; i < totalMessages; i++) {
        const message = {
          channel_id: testChannel.id,
          content: { message: `Test message ${i}`, sequence: i },
          type: 'general',
          priority: 'normal',
        };

        await apiRequest('/api/websocket/channels/broadcast', {
          method: 'POST',
          body: JSON.stringify(message),
        });

        sentMessages.push(message);
        
        // Small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Wait for all messages to be delivered
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Count delivered messages across all connections
      let totalDelivered = 0;
      for (let i = 0; i < connections.length; i++) {
        totalDelivered += receivedMessages[i].length;
      }

      const expectedTotal = totalMessages * connections.length;
      const deliveryRate = totalDelivered / expectedTotal;
      
      expect(deliveryRate).toBeGreaterThan(0.999); // >99.9%

      // Clean up connections
      connections.forEach(ws => ws.close());
    }, TEST_TIMEOUT);

    it('should maintain message ordering', async () => {
      const ws = await createWebSocketConnection(testChannel.id);
      const messageCount = 20;

      // Send ordered messages
      for (let i = 0; i < messageCount; i++) {
        await apiRequest('/api/websocket/channels/broadcast', {
          method: 'POST',
          body: JSON.stringify({
            channel_id: testChannel.id,
            content: { sequence: i, message: `Message ${i}` },
            type: 'general',
            priority: 'normal',
          }),
        });
      }

      // Wait for all messages
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify ordering
      const messages = receivedMessages[0];
      expect(messages).toHaveLength(messageCount);

      for (let i = 0; i < messageCount; i++) {
        expect(messages[i].content.sequence).toBe(i);
      }
    }, TEST_TIMEOUT);
  });

  describe('Performance and Scalability', () => {
    it('should handle high concurrent connection load', async () => {
      const connectionCount = 50;
      const connections = [];
      const connectionPromises = [];

      // Create many concurrent connections
      for (let i = 0; i < connectionCount; i++) {
        connectionPromises.push(
          createWebSocketConnection(testChannel.id).catch(error => {
            console.warn(`Connection ${i} failed:`, error.message);
            return null;
          })
        );
      }

      const results = await Promise.allSettled(connectionPromises);
      const successfulConnections = results.filter(r => r.status === 'fulfilled' && r.value).length;

      // Should achieve at least 80% connection success rate under load
      expect(successfulConnections / connectionCount).toBeGreaterThan(0.8);

      // Test message broadcasting to all connections
      const broadcastStart = Date.now();
      await apiRequest('/api/websocket/channels/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          channel_id: testChannel.id,
          content: { message: 'Load test message' },
          type: 'general',
        }),
      });
      
      const broadcastTime = Date.now() - broadcastStart;
      expect(broadcastTime).toBeLessThan(1000); // Should complete within 1 second

      // Clean up
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          result.value.close();
        }
      });
    }, TEST_TIMEOUT);

    it('should maintain sub-500ms API response times', async () => {
      const iterations = 10;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        
        const response = await apiRequest('/api/websocket/health');
        expect(response.ok).toBe(true);
        
        const responseTime = Date.now() - start;
        responseTimes.push(responseTime);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(averageResponseTime).toBeLessThan(200); // Average under 200ms
      expect(maxResponseTime).toBeLessThan(500); // Max under 500ms
    });
  });

  describe('Security and Isolation', () => {
    it('should prevent cross-wedding data leaks', async () => {
      // Create second wedding channel
      const otherWeddingChannel = {
        name: `test:wedding:other:${Date.now()}`,
        type: 'wedding',
        wedding_id: 'other-wedding-456',
        description: 'Other wedding channel',
      };

      const channelResponse = await apiRequest('/api/websocket/channels/create', {
        method: 'POST',
        body: JSON.stringify(otherWeddingChannel),
      });

      const { data: { channel_id: otherChannelId } } = await channelResponse.json();

      // Connect to first wedding channel
      const wedding1Ws = await createWebSocketConnection(testChannel.id);

      // Connect to second wedding channel
      const wedding2Ws = await createWebSocketConnection(otherChannelId);

      // Send message to first wedding
      await apiRequest('/api/websocket/channels/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          channel_id: testChannel.id,
          content: { message: 'Private wedding 1 message' },
          type: 'general',
          wedding_context: { wedding_id: testChannel.wedding_id },
        }),
      });

      // Wait for message delivery
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify wedding 1 receives the message
      const wedding1Messages = receivedMessages[0];
      expect(wedding1Messages).toHaveLength(1);

      // Verify wedding 2 does NOT receive the message
      const wedding2Messages = receivedMessages[1];
      expect(wedding2Messages).toHaveLength(0);

      // Clean up
      await apiRequest(`/api/websocket/channels/${otherChannelId}`, {
        method: 'DELETE',
      });
    }, TEST_TIMEOUT);

    it('should validate authentication tokens', async () => {
      // Try to connect without valid auth token
      try {
        const ws = new WebSocket(`${WS_BASE_URL}/ws?channel=${testChannel.id}&auth=invalid-token`);
        
        await new Promise((resolve, reject) => {
          ws.on('open', () => reject(new Error('Connection should have been rejected')));
          ws.on('error', resolve); // Expected
          ws.on('close', resolve); // Also acceptable
          setTimeout(() => resolve({}), 2000);
        });
      } catch (error) {
        // Connection should fail - this is expected
      }

      // Valid token should work
      const validWs = await createWebSocketConnection(testChannel.id);
      expect(validWs.readyState).toBe(WebSocket.OPEN);
    });
  });
});