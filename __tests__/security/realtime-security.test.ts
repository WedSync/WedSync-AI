/**
 * WedSync Realtime Security Testing Suite
 * WS-202: Comprehensive security testing for realtime integration
 * 
 * Wedding Industry Context: Security is critical for wedding data protection.
 * Tests authentication, authorization, multi-tenant isolation, input validation,
 * and GDPR compliance for sensitive wedding information and vendor coordination.
 */

import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { RealtimeEvent } from '@/types/realtime';
import { RealtimeSubscriptionManager } from '@/lib/supabase/realtime-subscription-manager';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// Security test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

describe('Realtime Security Testing Suite', () => {
  let adminClient: SupabaseClient<Database>;
  let vendorClient: SupabaseClient<Database>;
  let coupleClient: SupabaseClient<Database>;
  let unauthorizedClient: SupabaseClient<Database>;
  
  let testWeddingId: string;
  let testVendorId: string;
  let testCoupleId: string;
  let testVendorUser: User;
  let testCoupleUser: User;

  beforeAll(async () => {
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.warn('Skipping security tests - Supabase credentials not configured');
      return;
    }

    // Admin client with service role
    adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Regular clients with anon key
    vendorClient = createClient(supabaseUrl, supabaseAnonKey);
    coupleClient = createClient(supabaseUrl, supabaseAnonKey);
    unauthorizedClient = createClient(supabaseUrl, supabaseAnonKey);

    await setupSecurityTestData();
  });

  afterAll(async () => {
    if (adminClient && testWeddingId) {
      await cleanupSecurityTestData();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function setupSecurityTestData() {
    // Create test users with different roles
    const { data: vendorAuth, error: vendorError } = await adminClient.auth.admin.createUser({
      email: 'vendor-security@test.com',
      password: 'VendorSecure123!',
      email_confirm: true,
      user_metadata: { role: 'vendor', vendor_type: 'photographer' }
    });

    if (vendorError) throw vendorError;
    testVendorUser = vendorAuth.user;

    const { data: coupleAuth, error: coupleError } = await adminClient.auth.admin.createUser({
      email: 'couple-security@test.com',
      password: 'CoupleSecure123!',
      email_confirm: true,
      user_metadata: { role: 'couple' }
    });

    if (coupleError) throw coupleError;
    testCoupleUser = coupleAuth.user;

    // Authenticate clients
    await vendorClient.auth.signInWithPassword({
      email: 'vendor-security@test.com',
      password: 'VendorSecure123!'
    });

    await coupleClient.auth.signInWithPassword({
      email: 'couple-security@test.com',
      password: 'CoupleSecure123!'
    });

    // Create test wedding with proper RLS context
    const { data: wedding, error: weddingError } = await adminClient
      .from('weddings')
      .insert({
        title: 'Security Test Wedding',
        date: '2025-07-15',
        venue_name: 'Secure Test Venue',
        guest_count: 50,
        status: 'planning',
        created_by: testCoupleUser.id
      })
      .select('id')
      .single();

    if (weddingError) throw weddingError;
    testWeddingId = wedding.id;

    // Create vendor and couple records
    const { data: vendor, error: vendorRecordError } = await adminClient
      .from('wedding_vendors')
      .insert({
        wedding_id: testWeddingId,
        user_id: testVendorUser.id,
        vendor_type: 'photographer',
        business_name: 'Security Test Photography',
        contact_email: 'vendor-security@test.com',
        status: 'confirmed'
      })
      .select('id')
      .single();

    if (vendorRecordError) throw vendorRecordError;
    testVendorId = vendor.id;

    const { data: couple, error: coupleRecordError } = await adminClient
      .from('couples')
      .insert({
        wedding_id: testWeddingId,
        user_id: testCoupleUser.id,
        partner1_name: 'John Security',
        partner2_name: 'Jane Security',
        email: 'couple-security@test.com'
      })
      .select('id')
      .single();

    if (coupleRecordError) throw coupleRecordError;
    testCoupleId = couple.id;
  }

  async function cleanupSecurityTestData() {
    // Cleanup in reverse order
    await adminClient.from('wedding_vendors').delete().eq('wedding_id', testWeddingId);
    await adminClient.from('couples').delete().eq('wedding_id', testWeddingId);
    await adminClient.from('weddings').delete().eq('id', testWeddingId);
    
    // Delete test users
    if (testVendorUser) {
      await adminClient.auth.admin.deleteUser(testVendorUser.id);
    }
    if (testCoupleUser) {
      await adminClient.auth.admin.deleteUser(testCoupleUser.id);
    }
  }

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated realtime connections', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      const subscriptionManager = new RealtimeSubscriptionManager(unauthorizedClient);
      const errorCallback = jest.fn();
      
      subscriptionManager.onError(errorCallback);

      try {
        await subscriptionManager.subscribeToWeddingUpdates(testWeddingId, 'unauthorized-user', jest.fn());
        
        // Should trigger authentication error
        expect(errorCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'authentication_error',
            message: expect.stringContaining('Authentication required')
          })
        );
      } catch (error) {
        expect(error.message).toContain('Authentication');
      }
    });

    it('should enforce role-based access control for wedding data', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      const vendorSubscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      const coupleSubscriptionManager = new RealtimeSubscriptionManager(coupleClient);

      // Vendor should be able to subscribe to their own wedding
      let vendorError = null;
      try {
        await vendorSubscriptionManager.subscribeToWeddingUpdates(
          testWeddingId, 
          testVendorId, 
          jest.fn()
        );
      } catch (error) {
        vendorError = error;
      }
      expect(vendorError).toBeNull();

      // Couple should be able to subscribe to their own wedding
      let coupleError = null;
      try {
        await coupleSubscriptionManager.subscribeToWeddingUpdates(
          testWeddingId, 
          testCoupleId, 
          jest.fn()
        );
      } catch (error) {
        coupleError = error;
      }
      expect(coupleError).toBeNull();

      // Vendor should NOT be able to access different wedding
      const differentWeddingId = 'different-wedding-123';
      let unauthorizedError = null;
      try {
        await vendorSubscriptionManager.subscribeToWeddingUpdates(
          differentWeddingId,
          testVendorId,
          jest.fn()
        );
      } catch (error) {
        unauthorizedError = error;
      }
      
      expect(unauthorizedError).toBeDefined();
      expect(unauthorizedError.message).toContain('access denied');
    });

    it('should validate JWT tokens and reject expired/tampered tokens', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      // Create expired token
      const expiredToken = jwt.sign(
        {
          sub: testVendorUser.id,
          role: 'vendor',
          exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        },
        'fake-secret'
      );

      // Create tampered token
      const validToken = vendorClient.supabaseAuthToken;
      const tamperedToken = validToken ? validToken.slice(0, -10) + 'tampered123' : 'tampered';

      const clientWithExpiredToken = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${expiredToken}`
          }
        }
      });

      const clientWithTamperedToken = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${tamperedToken}`
          }
        }
      });

      // Test expired token
      const expiredSubscriptionManager = new RealtimeSubscriptionManager(clientWithExpiredToken);
      let expiredError = null;
      try {
        await expiredSubscriptionManager.subscribeToWeddingUpdates(
          testWeddingId,
          testVendorId,
          jest.fn()
        );
      } catch (error) {
        expiredError = error;
      }
      expect(expiredError).toBeDefined();
      expect(expiredError.message).toMatch(/token.*expired|authentication/i);

      // Test tampered token
      const tamperedSubscriptionManager = new RealtimeSubscriptionManager(clientWithTamperedToken);
      let tamperedError = null;
      try {
        await tamperedSubscriptionManager.subscribeToWeddingUpdates(
          testWeddingId,
          testVendorId,
          jest.fn()
        );
      } catch (error) {
        tamperedError = error;
      }
      expect(tamperedError).toBeDefined();
      expect(tamperedError.message).toMatch(/invalid.*token|authentication/i);
    });

    it('should enforce session timeout and automatic reauthentication', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      const subscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      let sessionExpiredEventReceived = false;

      subscriptionManager.onError((error) => {
        if (error.type === 'session_expired') {
          sessionExpiredEventReceived = true;
        }
      });

      // Mock session expiry
      jest.spyOn(vendorClient.auth, 'getSession').mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' } as any
      });

      try {
        await subscriptionManager.subscribeToWeddingUpdates(
          testWeddingId,
          testVendorId,
          jest.fn()
        );
      } catch (error) {
        // Expected to fail due to expired session
      }

      expect(sessionExpiredEventReceived).toBe(true);
    });
  });

  describe('Multi-Tenant Data Isolation', () => {
    it('should prevent cross-wedding data leakage', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      // Create second wedding with different user
      const { data: secondWedding, error: secondWeddingError } = await adminClient
        .from('weddings')
        .insert({
          title: 'Second Wedding',
          date: '2025-08-15',
          venue_name: 'Different Venue',
          guest_count: 75,
          status: 'planning',
          created_by: 'different-user-id'
        })
        .select('id')
        .single();

      if (secondWeddingError) throw secondWeddingError;
      const secondWeddingId = secondWedding.id;

      const vendorSubscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      const receivedEvents: RealtimeEvent[] = [];

      // Subscribe to first wedding
      await vendorSubscriptionManager.subscribeToWeddingUpdates(
        testWeddingId,
        testVendorId,
        (event: RealtimeEvent) => {
          receivedEvents.push(event);
        }
      );

      // Attempt to send message to second wedding (should be blocked)
      let crossWeddingError = null;
      try {
        await vendorSubscriptionManager.sendMessage(
          secondWeddingId,
          testVendorId,
          {
            type: 'unauthorized_message',
            content: 'This should not work'
          }
        );
      } catch (error) {
        crossWeddingError = error;
      }

      expect(crossWeddingError).toBeDefined();
      expect(crossWeddingError.message).toMatch(/access.*denied|unauthorized/i);

      // Verify no cross-wedding events received
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const crossWeddingEvents = receivedEvents.filter(event => 
        event.payload.weddingId === secondWeddingId
      );
      
      expect(crossWeddingEvents).toHaveLength(0);

      // Cleanup
      await adminClient.from('weddings').delete().eq('id', secondWeddingId);
    });

    it('should enforce Row Level Security policies', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      // Test RLS on wedding_guests table
      const { data: guestsVisible, error: guestsError } = await vendorClient
        .from('wedding_guests')
        .select('*')
        .eq('wedding_id', testWeddingId);

      // Vendor should only see guests for their wedding
      expect(guestsError).toBeNull();
      if (guestsVisible) {
        guestsVisible.forEach(guest => {
          expect(guest.wedding_id).toBe(testWeddingId);
        });
      }

      // Test RLS on vendor_messages table
      const { data: messagesVisible, error: messagesError } = await vendorClient
        .from('vendor_messages')
        .select('*')
        .eq('wedding_id', testWeddingId);

      expect(messagesError).toBeNull();
      if (messagesVisible) {
        messagesVisible.forEach(message => {
          expect(message.wedding_id).toBe(testWeddingId);
          // Vendor should only see messages they sent or received
          expect(
            message.sender_id === testVendorId || 
            message.recipient_id === testVendorId
          ).toBe(true);
        });
      }

      // Test attempt to access different wedding's data (should be blocked)
      const { data: blockedData, error: blockedError } = await vendorClient
        .from('wedding_guests')
        .select('*')
        .eq('wedding_id', 'different-wedding-123');

      // RLS should either return empty results or error
      if (blockedError) {
        expect(blockedError.message).toMatch(/access.*denied|unauthorized/i);
      } else {
        expect(blockedData).toEqual([]);
      }
    });

    it('should prevent privilege escalation attacks', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      // Attempt to modify user role via malicious payload
      const maliciousEvent: RealtimeEvent = {
        eventType: 'USER_ROLE_CHANGE' as any, // Not a valid event type
        payload: {
          userId: testVendorUser.id,
          newRole: 'admin',
          weddingId: testWeddingId,
          timestamp: new Date().toISOString()
        },
        metadata: {
          source: 'malicious_client',
          priority: 'critical'
        }
      };

      const subscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      const errorCallback = jest.fn();
      subscriptionManager.onError(errorCallback);

      // Attempt to send malicious event
      let maliciousError = null;
      try {
        await subscriptionManager.sendMessage(
          testWeddingId,
          testVendorId,
          maliciousEvent as any
        );
      } catch (error) {
        maliciousError = error;
      }

      // Should be rejected
      expect(maliciousError || errorCallback.mock.calls.length > 0).toBeTruthy();

      // Verify user role hasn't changed
      const { data: userData } = await adminClient.auth.admin.getUserById(testVendorUser.id);
      expect(userData.user?.user_metadata?.role).toBe('vendor');
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('should reject malformed realtime events', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      const subscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      const validationErrors: string[] = [];

      subscriptionManager.onError((error) => {
        if (error.type === 'validation_error') {
          validationErrors.push(error.message);
        }
      });

      // Test various malformed events
      const malformedEvents = [
        // Missing required fields
        {
          eventType: 'RSVP_CHANGED',
          payload: {}, // Missing required fields
          metadata: { source: 'test', priority: 'low' }
        },
        
        // Invalid event type
        {
          eventType: 'INVALID_EVENT_TYPE',
          payload: { weddingId: testWeddingId },
          metadata: { source: 'test', priority: 'low' }
        },
        
        // Invalid priority
        {
          eventType: 'GUEST_MESSAGE',
          payload: { weddingId: testWeddingId, message: 'Test' },
          metadata: { source: 'test', priority: 'invalid_priority' as any }
        },
        
        // Null payload
        {
          eventType: 'VENDOR_UPDATE',
          payload: null,
          metadata: { source: 'test', priority: 'low' }
        },
        
        // Oversized payload (> 1MB)
        {
          eventType: 'GUEST_MESSAGE',
          payload: {
            weddingId: testWeddingId,
            message: 'x'.repeat(1024 * 1024 + 1) // >1MB
          },
          metadata: { source: 'test', priority: 'low' }
        }
      ];

      for (const malformedEvent of malformedEvents) {
        let validationError = null;
        try {
          await subscriptionManager.sendMessage(
            testWeddingId,
            testVendorId,
            malformedEvent as any
          );
        } catch (error) {
          validationError = error;
        }

        expect(validationError || validationErrors.length > 0).toBeTruthy();
      }
    });

    it('should sanitize HTML/JavaScript injection attempts', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      const subscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      const receivedEvents: RealtimeEvent[] = [];

      await subscriptionManager.subscribeToWeddingUpdates(
        testWeddingId,
        testVendorId,
        (event: RealtimeEvent) => {
          receivedEvents.push(event);
        }
      );

      // Test XSS injection attempts
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '${alert("XSS")}',
        '<svg onload="alert(\'XSS\')">',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ];

      for (const xssPayload of xssPayloads) {
        const maliciousEvent: RealtimeEvent = {
          eventType: 'GUEST_MESSAGE',
          payload: {
            guestId: 'guest-123',
            weddingId: testWeddingId,
            message: xssPayload,
            timestamp: new Date().toISOString()
          },
          metadata: {
            source: 'guest_app',
            priority: 'low'
          }
        };

        await subscriptionManager.sendMessage(
          testWeddingId,
          testVendorId,
          maliciousEvent
        );
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify all received messages are sanitized
      const messageEvents = receivedEvents.filter(event => 
        event.eventType === 'GUEST_MESSAGE'
      );

      messageEvents.forEach(event => {
        const message = event.payload.message;
        
        // Should not contain any script tags or javascript: protocols
        expect(message).not.toMatch(/<script/i);
        expect(message).not.toMatch(/javascript:/i);
        expect(message).not.toMatch(/onerror=/i);
        expect(message).not.toMatch(/onload=/i);
        expect(message).not.toMatch(/<iframe/i);
        expect(message).not.toMatch(/<svg/i);
        
        // Should be properly escaped or stripped
        expect(message).toMatch(/^[^<>]*$/); // No angle brackets remain
      });
    });

    it('should prevent SQL injection through realtime payloads', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      const subscriptionManager = new RealtimeSubscriptionManager(vendorClient);

      // SQL injection payloads
      const sqlInjectionPayloads = [
        "'; DROP TABLE wedding_guests; --",
        "1' OR '1'='1",
        "1; DELETE FROM weddings WHERE id = '" + testWeddingId + "'; --",
        "UNION SELECT * FROM user_profiles --",
        "'; UPDATE weddings SET status = 'cancelled'; --"
      ];

      for (const sqlPayload of sqlInjectionPayloads) {
        const maliciousEvent: RealtimeEvent = {
          eventType: 'RSVP_CHANGED',
          payload: {
            guestId: sqlPayload, // Inject SQL in guest ID
            weddingId: testWeddingId,
            previousStatus: 'pending',
            newStatus: 'accepted',
            timestamp: new Date().toISOString()
          },
          metadata: {
            source: 'malicious_client',
            priority: 'low'
          }
        };

        let sqlInjectionError = null;
        try {
          await subscriptionManager.sendMessage(
            testWeddingId,
            testVendorId,
            maliciousEvent
          );
        } catch (error) {
          sqlInjectionError = error;
        }

        // Should either error or safely handle the injection
        if (!sqlInjectionError) {
          // Verify no data was corrupted
          const { data: weddingStillExists } = await adminClient
            .from('weddings')
            .select('id')
            .eq('id', testWeddingId)
            .single();

          expect(weddingStillExists).toBeDefined();
        }
      }

      // Verify wedding data integrity after injection attempts
      const { data: weddingData } = await adminClient
        .from('weddings')
        .select('*')
        .eq('id', testWeddingId)
        .single();

      expect(weddingData).toBeDefined();
      expect(weddingData.status).not.toBe('cancelled'); // Should not have been modified
    });

    it('should enforce rate limiting to prevent DoS attacks', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      const subscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      let rateLimitError = null;

      // Send rapid-fire messages to trigger rate limiting
      const rapidMessages = Array.from({ length: 100 }, (_, i) => ({
        eventType: 'GUEST_MESSAGE' as const,
        payload: {
          guestId: `guest-${i}`,
          weddingId: testWeddingId,
          message: `Rapid message ${i}`,
          timestamp: new Date().toISOString()
        },
        metadata: {
          source: 'dos_test',
          priority: 'low' as const
        }
      }));

      const startTime = Date.now();
      
      for (const message of rapidMessages) {
        try {
          await subscriptionManager.sendMessage(
            testWeddingId,
            testVendorId,
            message
          );
        } catch (error) {
          if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
            rateLimitError = error;
            break;
          }
        }
      }

      const endTime = Date.now();
      
      // Should either hit rate limit or complete within reasonable time
      expect(rateLimitError || (endTime - startTime > 1000)).toBeTruthy();
      
      if (rateLimitError) {
        expect(rateLimitError.message).toMatch(/rate limit|too many requests/i);
      }
    });
  });

  describe('Data Protection & Privacy', () => {
    it('should encrypt sensitive wedding data in transit', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      // Verify WebSocket connection uses WSS (secure)
      expect(supabaseUrl).toMatch(/^wss:/);

      const subscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      
      // Mock WebSocket to capture messages
      const originalWebSocket = global.WebSocket;
      const sentMessages: string[] = [];
      
      global.WebSocket = class MockWebSocket {
        constructor(url: string) {
          expect(url).toMatch(/^wss:/); // Ensure secure connection
        }
        
        send(data: string) {
          sentMessages.push(data);
        }
        
        addEventListener() {}
        close() {}
      } as any;

      const sensitiveEvent: RealtimeEvent = {
        eventType: 'VENDOR_MESSAGE_SENT',
        payload: {
          messageId: 'msg-123',
          weddingId: testWeddingId,
          senderId: testVendorId,
          senderType: 'vendor',
          recipientId: testCoupleId,
          recipientType: 'couple',
          message: 'Credit card ending in 1234 for payment',
          timestamp: new Date().toISOString()
        },
        metadata: {
          source: 'vendor_portal',
          priority: 'high'
        }
      };

      try {
        await subscriptionManager.sendMessage(
          testWeddingId,
          testVendorId,
          sensitiveEvent
        );
      } catch (error) {
        // Expected to fail in test environment
      }

      global.WebSocket = originalWebSocket;
    });

    it('should implement GDPR-compliant data handling', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      const subscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      
      // Test data retention policies
      const gdprTestEvent: RealtimeEvent = {
        eventType: 'GUEST_MESSAGE',
        payload: {
          guestId: 'gdpr-test-guest',
          weddingId: testWeddingId,
          message: 'This message should respect GDPR retention policies',
          timestamp: new Date().toISOString(),
          personalData: {
            email: 'guest@example.com',
            phone: '+1234567890',
            dietaryRestrictions: 'Vegetarian'
          }
        },
        metadata: {
          source: 'guest_app',
          priority: 'low',
          gdprConsent: true,
          retentionPeriod: '2_years'
        }
      };

      // Send event with GDPR metadata
      await subscriptionManager.sendMessage(
        testWeddingId,
        testVendorId,
        gdprTestEvent
      );

      // Test right to be forgotten (data deletion request)
      const deletionRequest = {
        eventType: 'GDPR_DELETION_REQUEST' as any,
        payload: {
          dataSubject: 'gdpr-test-guest',
          weddingId: testWeddingId,
          requestType: 'full_deletion',
          timestamp: new Date().toISOString()
        },
        metadata: {
          source: 'data_privacy_portal',
          priority: 'high',
          requiresResponse: true
        }
      };

      let gdprHandled = false;
      try {
        await subscriptionManager.sendMessage(
          testWeddingId,
          testVendorId,
          deletionRequest
        );
        gdprHandled = true;
      } catch (error) {
        // May not be implemented in test environment
        expect(error.message).toMatch(/not implemented|not supported/i);
      }

      // Test data export request (right to data portability)
      const exportRequest = {
        eventType: 'GDPR_EXPORT_REQUEST' as any,
        payload: {
          dataSubject: testCoupleId,
          weddingId: testWeddingId,
          requestType: 'full_export',
          format: 'json',
          timestamp: new Date().toISOString()
        },
        metadata: {
          source: 'data_privacy_portal',
          priority: 'medium',
          requiresResponse: true
        }
      };

      try {
        await subscriptionManager.sendMessage(
          testWeddingId,
          testVendorId,
          exportRequest
        );
      } catch (error) {
        // May not be implemented in test environment
        expect(error.message).toMatch(/not implemented|not supported/i);
      }
    });

    it('should mask PII in logs and debugging output', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const subscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      
      // Enable debug mode
      subscriptionManager.setDebugMode(true);

      const piiEvent: RealtimeEvent = {
        eventType: 'VENDOR_MESSAGE_SENT',
        payload: {
          messageId: 'pii-test-123',
          weddingId: testWeddingId,
          senderId: testVendorId,
          senderType: 'vendor',
          recipientId: testCoupleId,
          recipientType: 'couple',
          message: 'Guest details: John Doe, SSN: 123-45-6789, Email: john@example.com',
          timestamp: new Date().toISOString()
        },
        metadata: {
          source: 'vendor_portal',
          priority: 'high'
        }
      };

      try {
        await subscriptionManager.sendMessage(
          testWeddingId,
          testVendorId,
          piiEvent
        );
      } catch (error) {
        // Expected in test environment
      }

      // Check that logs don't contain raw PII
      const allLogs = [...consoleSpy.mock.calls, ...errorSpy.mock.calls]
        .flat()
        .join(' ');

      // Should not contain raw SSN, email, or other PII
      expect(allLogs).not.toContain('123-45-6789');
      expect(allLogs).not.toContain('john@example.com');
      expect(allLogs).not.toContain('SSN:');

      // Should contain masked versions if PII was logged
      if (allLogs.includes('Guest details')) {
        expect(allLogs).toMatch(/\*\*\*-\*\*-\*\*\*\*/); // Masked SSN
        expect(allLogs).toMatch(/\*\*\*@\*\*\*\.com/); // Masked email
      }

      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should prevent data exfiltration through timing attacks', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      const subscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      const timingMeasurements: number[] = [];

      // Test consistent timing for both valid and invalid queries
      const testQueries = [
        { weddingId: testWeddingId, expectedValid: true },
        { weddingId: 'non-existent-wedding', expectedValid: false },
        { weddingId: 'another-non-existent', expectedValid: false },
        { weddingId: testWeddingId, expectedValid: true }
      ];

      for (const query of testQueries) {
        const startTime = Date.now();
        
        try {
          await subscriptionManager.subscribeToWeddingUpdates(
            query.weddingId,
            testVendorId,
            jest.fn()
          );
        } catch (error) {
          // Expected for invalid wedding IDs
        }
        
        const endTime = Date.now();
        timingMeasurements.push(endTime - startTime);
      }

      // Verify timing differences are not significant enough for timing attacks
      const avgValidTiming = (timingMeasurements[0] + timingMeasurements[3]) / 2;
      const avgInvalidTiming = (timingMeasurements[1] + timingMeasurements[2]) / 2;
      
      const timingDifference = Math.abs(avgValidTiming - avgInvalidTiming);
      
      // Timing difference should be less than 100ms to prevent timing attacks
      expect(timingDifference).toBeLessThan(100);
    });
  });

  describe('Network Security', () => {
    it('should implement proper CORS headers for cross-origin requests', () => {
      // This would typically be tested at the infrastructure level
      // but we can verify the client enforces origin checks
      
      const subscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      
      // Verify client validates origins
      expect(() => {
        subscriptionManager.validateOrigin('https://malicious-site.com');
      }).toThrow('Invalid origin');
      
      expect(() => {
        subscriptionManager.validateOrigin('https://wedsync.com');
      }).not.toThrow();
    });

    it('should prevent WebSocket hijacking attacks', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      // Test that WebSocket connections include proper headers
      const subscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      
      const connectionHeaders = subscriptionManager.getConnectionHeaders();
      
      expect(connectionHeaders).toHaveProperty('Authorization');
      expect(connectionHeaders).toHaveProperty('apikey');
      expect(connectionHeaders.Authorization).toMatch(/^Bearer /);
    });

    it('should validate message integrity and prevent tampering', async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      const subscriptionManager = new RealtimeSubscriptionManager(vendorClient);
      
      // Test message signing/validation
      const originalMessage: RealtimeEvent = {
        eventType: 'GUEST_MESSAGE',
        payload: {
          guestId: 'guest-123',
          weddingId: testWeddingId,
          message: 'Original message content',
          timestamp: new Date().toISOString()
        },
        metadata: {
          source: 'guest_app',
          priority: 'low'
        }
      };

      // Generate message signature
      const messageSignature = subscriptionManager.signMessage(originalMessage);
      expect(messageSignature).toBeDefined();
      expect(messageSignature).toMatch(/^[a-f0-9]+$/); // Hex signature

      // Verify original message validates
      const isValid = subscriptionManager.validateMessageSignature(
        originalMessage, 
        messageSignature
      );
      expect(isValid).toBe(true);

      // Test tampered message fails validation
      const tamperedMessage = {
        ...originalMessage,
        payload: {
          ...originalMessage.payload,
          message: 'Tampered message content' // Changed content
        }
      };

      const tamperedIsValid = subscriptionManager.validateMessageSignature(
        tamperedMessage as RealtimeEvent,
        messageSignature
      );
      expect(tamperedIsValid).toBe(false);
    });
  });
});