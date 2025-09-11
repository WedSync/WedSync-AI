/**
 * WedSync Database Triggers & Realtime Integration Tests
 * WS-202: Integration testing for database triggers with realtime events
 * 
 * Wedding Industry Context: Tests actual database triggers that fire when
 * RSVP status changes, timeline updates, and vendor coordination events occur.
 * Ensures data consistency and real-time synchronization across all wedding stakeholders.
 */

import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { RealtimeEvent } from '@/types/realtime';
import { RealtimeSubscriptionManager } from '@/lib/supabase/realtime-subscription-manager';

// Test database configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('Database Triggers & Realtime Integration', () => {
  let supabase: SupabaseClient<Database>;
  let subscriptionManager: RealtimeSubscriptionManager;
  let testWeddingId: string;
  let testVendorId: string;
  let testCoupleId: string;
  let receivedEvents: RealtimeEvent[] = [];

  beforeAll(async () => {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Skipping integration tests - Supabase credentials not configured');
      return;
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
    subscriptionManager = new RealtimeSubscriptionManager(supabase);

    // Create test data for integration testing
    await setupTestData();
  });

  afterAll(async () => {
    if (supabase && testWeddingId) {
      await cleanupTestData();
      await subscriptionManager.cleanup();
    }
  });

  beforeEach(() => {
    receivedEvents = [];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  async function setupTestData() {
    // Create test wedding
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .insert({
        title: 'Integration Test Wedding',
        date: '2025-06-15',
        venue_name: 'Test Venue',
        guest_count: 100,
        status: 'planning'
      })
      .select('id')
      .single();

    if (weddingError) throw weddingError;
    testWeddingId = wedding.id;

    // Create test couple
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .insert({
        wedding_id: testWeddingId,
        partner1_name: 'John Doe',
        partner2_name: 'Jane Smith',
        email: 'test@example.com'
      })
      .select('id')
      .single();

    if (coupleError) throw coupleError;
    testCoupleId = couple.id;

    // Create test vendor (photographer)
    const { data: vendor, error: vendorError } = await supabase
      .from('wedding_vendors')
      .insert({
        wedding_id: testWeddingId,
        vendor_type: 'photographer',
        business_name: 'Test Photography',
        contact_email: 'photographer@test.com',
        status: 'confirmed'
      })
      .select('id')
      .single();

    if (vendorError) throw vendorError;
    testVendorId = vendor.id;

    // Create test guests for RSVP testing
    const guests = [
      { name: 'Guest One', email: 'guest1@test.com', rsvp_status: 'pending' },
      { name: 'Guest Two', email: 'guest2@test.com', rsvp_status: 'pending' },
      { name: 'Guest Three', email: 'guest3@test.com', rsvp_status: 'pending' }
    ];

    await supabase
      .from('wedding_guests')
      .insert(
        guests.map(guest => ({
          wedding_id: testWeddingId,
          ...guest
        }))
      );
  }

  async function cleanupTestData() {
    // Cleanup in reverse order of dependencies
    await supabase.from('wedding_guests').delete().eq('wedding_id', testWeddingId);
    await supabase.from('wedding_vendors').delete().eq('wedding_id', testWeddingId);
    await supabase.from('couples').delete().eq('wedding_id', testWeddingId);
    await supabase.from('weddings').delete().eq('id', testWeddingId);
  }

  function setupRealtimeListener() {
    return subscriptionManager.subscribeToWeddingUpdates(
      testWeddingId,
      testVendorId,
      (event: RealtimeEvent) => {
        receivedEvents.push(event);
      }
    );
  }

  describe('RSVP Change Triggers', () => {
    it('should fire realtime event when guest RSVP status changes', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      await setupRealtimeListener();

      // Wait for subscription to be established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update guest RSVP status to trigger database trigger
      const { data: guests } = await supabase
        .from('wedding_guests')
        .select('id')
        .eq('wedding_id', testWeddingId)
        .limit(1);

      if (guests && guests.length > 0) {
        const { error } = await supabase
          .from('wedding_guests')
          .update({ rsvp_status: 'accepted' })
          .eq('id', guests[0].id);

        expect(error).toBeNull();

        // Wait for realtime event to be received
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify realtime event was received
        const rsvpEvents = receivedEvents.filter(event => event.eventType === 'RSVP_CHANGED');
        expect(rsvpEvents.length).toBeGreaterThan(0);

        if (rsvpEvents.length > 0) {
          const rsvpEvent = rsvpEvents[0];
          expect(rsvpEvent.payload).toMatchObject({
            guestId: guests[0].id,
            newStatus: 'accepted',
            weddingId: testWeddingId
          });
          expect(rsvpEvent.metadata.source).toBe('database_trigger');
        }
      }
    });

    it('should trigger guest count recalculation when multiple RSVPs change', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      await setupRealtimeListener();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get all test guests
      const { data: guests } = await supabase
        .from('wedding_guests')
        .select('id')
        .eq('wedding_id', testWeddingId);

      if (guests && guests.length >= 2) {
        // Update multiple guests simultaneously
        const updates = guests.slice(0, 2).map(guest => 
          supabase
            .from('wedding_guests')
            .update({ rsvp_status: 'accepted' })
            .eq('id', guest.id)
        );

        await Promise.all(updates);

        // Wait for all events to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verify guest count update event was triggered
        const guestCountEvents = receivedEvents.filter(event => 
          event.eventType === 'GUEST_COUNT_UPDATED'
        );

        expect(guestCountEvents.length).toBeGreaterThan(0);

        if (guestCountEvents.length > 0) {
          const countEvent = guestCountEvents[0];
          expect(countEvent.payload).toMatchObject({
            weddingId: testWeddingId,
            previousCount: expect.any(Number),
            newCount: expect.any(Number)
          });
        }
      }
    });

    it('should handle dietary requirements updates through triggers', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      await setupRealtimeListener();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: guests } = await supabase
        .from('wedding_guests')
        .select('id')
        .eq('wedding_id', testWeddingId)
        .limit(1);

      if (guests && guests.length > 0) {
        // Update guest with dietary requirements
        const { error } = await supabase
          .from('wedding_guests')
          .update({ 
            dietary_requirements: 'Vegetarian, Gluten-free',
            rsvp_status: 'accepted'
          })
          .eq('id', guests[0].id);

        expect(error).toBeNull();

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify dietary requirements event was triggered
        const dietaryEvents = receivedEvents.filter(event => 
          event.eventType === 'DIETARY_REQUIREMENTS_UPDATED'
        );

        expect(dietaryEvents.length).toBeGreaterThan(0);

        if (dietaryEvents.length > 0) {
          const dietaryEvent = dietaryEvents[0];
          expect(dietaryEvent.payload).toMatchObject({
            guestId: guests[0].id,
            weddingId: testWeddingId,
            requirements: 'Vegetarian, Gluten-free'
          });
        }
      }
    });
  });

  describe('Timeline Update Triggers', () => {
    it('should fire realtime events when wedding timeline is modified', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      await setupRealtimeListener();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create timeline event
      const { data: timelineEvent, error } = await supabase
        .from('wedding_timeline')
        .insert({
          wedding_id: testWeddingId,
          event_name: 'Ceremony',
          start_time: '15:00:00',
          duration_minutes: 30,
          description: 'Wedding ceremony'
        })
        .select('id')
        .single();

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update timeline event
      if (timelineEvent) {
        const { error: updateError } = await supabase
          .from('wedding_timeline')
          .update({ start_time: '15:30:00' })
          .eq('id', timelineEvent.id);

        expect(updateError).toBeNull();

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify timeline update event was received
        const timelineEvents = receivedEvents.filter(event => 
          event.eventType === 'TIMELINE_UPDATED'
        );

        expect(timelineEvents.length).toBeGreaterThan(0);

        if (timelineEvents.length > 0) {
          const updateEvent = timelineEvents[0];
          expect(updateEvent.payload).toMatchObject({
            weddingId: testWeddingId,
            eventId: timelineEvent.id,
            changes: expect.arrayContaining([
              expect.objectContaining({
                field: 'start_time',
                oldValue: '15:00:00',
                newValue: '15:30:00'
              })
            ])
          });
          expect(updateEvent.metadata.priority).toBe('high');
        }
      }
    });

    it('should notify all relevant vendors of timeline changes', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      // Create additional vendor subscriptions
      const vendors = [
        { type: 'florist', email: 'florist@test.com' },
        { type: 'dj', email: 'dj@test.com' },
        { type: 'caterer', email: 'caterer@test.com' }
      ];

      const vendorIds: string[] = [];

      for (const vendor of vendors) {
        const { data, error } = await supabase
          .from('wedding_vendors')
          .insert({
            wedding_id: testWeddingId,
            vendor_type: vendor.type,
            business_name: `Test ${vendor.type}`,
            contact_email: vendor.email,
            status: 'confirmed'
          })
          .select('id')
          .single();

        if (!error && data) {
          vendorIds.push(data.id);
        }
      }

      // Set up multiple vendor subscriptions
      const subscriptions = vendorIds.map(vendorId => 
        subscriptionManager.subscribeToWeddingUpdates(
          testWeddingId,
          vendorId,
          (event: RealtimeEvent) => {
            receivedEvents.push({ ...event, receivedBy: vendorId });
          }
        )
      );

      await Promise.all(subscriptions);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create timeline event that affects multiple vendors
      const { data: timelineEvent, error } = await supabase
        .from('wedding_timeline')
        .insert({
          wedding_id: testWeddingId,
          event_name: 'Reception Start',
          start_time: '18:00:00',
          duration_minutes: 240,
          description: 'Reception begins',
          vendor_notifications: vendorIds // Trigger notifications to specific vendors
        })
        .select('id')
        .single();

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify all vendors received the timeline update
      const timelineNotifications = receivedEvents.filter(event => 
        event.eventType === 'TIMELINE_UPDATED'
      );

      expect(timelineNotifications.length).toBeGreaterThanOrEqual(vendorIds.length);

      // Verify each vendor received notification
      vendorIds.forEach(vendorId => {
        const vendorNotification = timelineNotifications.find(event => 
          event.receivedBy === vendorId
        );
        expect(vendorNotification).toBeDefined();
      });

      // Cleanup additional vendors
      await supabase
        .from('wedding_vendors')
        .delete()
        .in('id', vendorIds);
    });
  });

  describe('Vendor Coordination Triggers', () => {
    it('should trigger realtime events for vendor status updates', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      await setupRealtimeListener();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update vendor status
      const { error } = await supabase
        .from('wedding_vendors')
        .update({ 
          status: 'arrived',
          notes: 'Arrived at venue, setting up equipment'
        })
        .eq('id', testVendorId);

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify vendor status update event
      const vendorEvents = receivedEvents.filter(event => 
        event.eventType === 'VENDOR_STATUS_UPDATED'
      );

      expect(vendorEvents.length).toBeGreaterThan(0);

      if (vendorEvents.length > 0) {
        const statusEvent = vendorEvents[0];
        expect(statusEvent.payload).toMatchObject({
          vendorId: testVendorId,
          weddingId: testWeddingId,
          previousStatus: 'confirmed',
          newStatus: 'arrived',
          notes: 'Arrived at venue, setting up equipment'
        });
      }
    });

    it('should handle vendor messaging triggers', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      await setupRealtimeListener();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create vendor message
      const { data: message, error } = await supabase
        .from('vendor_messages')
        .insert({
          wedding_id: testWeddingId,
          sender_id: testVendorId,
          sender_type: 'vendor',
          recipient_id: testCoupleId,
          recipient_type: 'couple',
          message: 'Ready to begin photography session',
          priority: 'high'
        })
        .select('id')
        .single();

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify vendor message event
      const messageEvents = receivedEvents.filter(event => 
        event.eventType === 'VENDOR_MESSAGE_SENT'
      );

      expect(messageEvents.length).toBeGreaterThan(0);

      if (messageEvents.length > 0) {
        const msgEvent = messageEvents[0];
        expect(msgEvent.payload).toMatchObject({
          messageId: message.id,
          weddingId: testWeddingId,
          senderId: testVendorId,
          senderType: 'vendor',
          recipientId: testCoupleId,
          recipientType: 'couple',
          message: 'Ready to begin photography session'
        });
        expect(msgEvent.metadata.priority).toBe('high');
      }
    });

    it('should handle emergency vendor notifications', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      await setupRealtimeListener();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create emergency notification
      const { data: emergency, error } = await supabase
        .from('vendor_emergencies')
        .insert({
          wedding_id: testWeddingId,
          vendor_id: testVendorId,
          emergency_type: 'equipment_failure',
          description: 'Main camera lens malfunction - switching to backup',
          severity: 'medium',
          status: 'active'
        })
        .select('id')
        .single();

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify emergency notification event
      const emergencyEvents = receivedEvents.filter(event => 
        event.eventType === 'VENDOR_EMERGENCY'
      );

      expect(emergencyEvents.length).toBeGreaterThan(0);

      if (emergencyEvents.length > 0) {
        const emergencyEvent = emergencyEvents[0];
        expect(emergencyEvent.payload).toMatchObject({
          emergencyId: emergency.id,
          vendorId: testVendorId,
          weddingId: testWeddingId,
          emergencyType: 'equipment_failure',
          description: 'Main camera lens malfunction - switching to backup',
          severity: 'medium'
        });
        expect(emergencyEvent.metadata.priority).toBe('critical');
      }
    });
  });

  describe('Data Consistency & Transaction Safety', () => {
    it('should maintain data consistency during concurrent updates', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      await setupRealtimeListener();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get guests for concurrent updates
      const { data: guests } = await supabase
        .from('wedding_guests')
        .select('id')
        .eq('wedding_id', testWeddingId)
        .limit(3);

      if (guests && guests.length >= 3) {
        // Perform concurrent RSVP updates
        const concurrentUpdates = guests.map((guest, index) => 
          supabase
            .from('wedding_guests')
            .update({ rsvp_status: index % 2 === 0 ? 'accepted' : 'declined' })
            .eq('id', guest.id)
        );

        const results = await Promise.allSettled(concurrentUpdates);

        // All updates should succeed
        results.forEach(result => {
          expect(result.status).toBe('fulfilled');
          if (result.status === 'fulfilled') {
            expect(result.value.error).toBeNull();
          }
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verify final guest count is consistent
        const { data: finalGuests } = await supabase
          .from('wedding_guests')
          .select('rsvp_status')
          .eq('wedding_id', testWeddingId);

        if (finalGuests) {
          const acceptedCount = finalGuests.filter(g => g.rsvp_status === 'accepted').length;
          const declinedCount = finalGuests.filter(g => g.rsvp_status === 'declined').length;

          // Verify guest count update events match actual counts
          const guestCountEvents = receivedEvents.filter(event => 
            event.eventType === 'GUEST_COUNT_UPDATED'
          );

          if (guestCountEvents.length > 0) {
            const latestCountEvent = guestCountEvents[guestCountEvents.length - 1];
            expect(latestCountEvent.payload.acceptedCount).toBe(acceptedCount);
            expect(latestCountEvent.payload.declinedCount).toBe(declinedCount);
          }
        }
      }
    });

    it('should handle database rollbacks and trigger cleanup', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      await setupRealtimeListener();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Attempt to create invalid timeline event (should fail)
      const { data: invalidEvent, error } = await supabase
        .from('wedding_timeline')
        .insert({
          wedding_id: testWeddingId,
          event_name: 'Invalid Event',
          start_time: '25:00:00', // Invalid time format
          duration_minutes: -30,  // Invalid negative duration
          description: 'This should fail'
        })
        .select('id')
        .single();

      expect(error).not.toBeNull(); // Should fail due to validation

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify no partial data was created and no spurious events fired
      const timelineEvents = receivedEvents.filter(event => 
        event.eventType === 'TIMELINE_UPDATED' || 
        event.eventType === 'TIMELINE_CREATED'
      );

      // Should not have any timeline events from the failed insertion
      const invalidEvents = timelineEvents.filter(event => 
        event.payload.eventName === 'Invalid Event'
      );

      expect(invalidEvents).toHaveLength(0);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high-frequency trigger events efficiently', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      await setupRealtimeListener();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const startTime = Date.now();
      
      // Create multiple rapid updates
      const rapidUpdates = Array.from({ length: 20 }, (_, i) => 
        supabase
          .from('vendor_messages')
          .insert({
            wedding_id: testWeddingId,
            sender_id: testVendorId,
            sender_type: 'vendor',
            recipient_id: testCoupleId,
            recipient_type: 'couple',
            message: `Update message ${i + 1}`,
            priority: 'low'
          })
      );

      await Promise.all(rapidUpdates);
      
      // Wait for all events to be processed
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const processingTime = Date.now() - startTime;

      // Verify all events were processed
      const messageEvents = receivedEvents.filter(event => 
        event.eventType === 'VENDOR_MESSAGE_SENT'
      );

      expect(messageEvents.length).toBe(20);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify events maintain correct order
      for (let i = 0; i < messageEvents.length; i++) {
        expect(messageEvents[i].payload.message).toContain(`Update message ${i + 1}`);
      }
    });

    it('should maintain sub-500ms latency for critical events', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Skipping test - Supabase not configured');
        return;
      }

      await setupRealtimeListener();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const startTime = Date.now();

      // Create critical emergency event
      const { error } = await supabase
        .from('vendor_emergencies')
        .insert({
          wedding_id: testWeddingId,
          vendor_id: testVendorId,
          emergency_type: 'critical_failure',
          description: 'Critical system failure requiring immediate attention',
          severity: 'critical',
          status: 'active'
        });

      expect(error).toBeNull();

      // Wait for event to be received
      let latency = 0;
      const checkForEvent = () => {
        const emergencyEvents = receivedEvents.filter(event => 
          event.eventType === 'VENDOR_EMERGENCY' && 
          event.metadata.priority === 'critical'
        );

        if (emergencyEvents.length > 0) {
          latency = Date.now() - startTime;
          return true;
        }
        return false;
      };

      // Poll for event with timeout
      const maxWait = 5000; // 5 seconds max
      const pollInterval = 50; // Check every 50ms
      let waited = 0;

      while (waited < maxWait && !checkForEvent()) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        waited += pollInterval;
      }

      expect(latency).toBeGreaterThan(0); // Event was received
      expect(latency).toBeLessThan(500); // Sub-500ms requirement met
    });
  });
});