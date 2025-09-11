import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CalendarAPIIntegration } from '../../../src/integrations/api-gateway/CalendarAPIIntegration';

// Mock dependencies
vi.mock('../../../src/integrations/api-gateway/ExternalAPIConnector');

describe('CalendarAPIIntegration', () => {
  let integration: CalendarAPIIntegration;
  const mockConfig = {
    supportedProviders: ['google', 'outlook', 'apple', 'yahoo'],
    defaultSyncInterval: 300000, // 5 minutes
    enableRealTimeSync: true,
    enableConflictDetection: true,
    enableWeddingEventTypes: true,
    maxSyncRetries: 3,
    syncTimeout: 30000,
    weddingSpecificFeatures: {
      enableWeddingTimeline: true,
      enableVendorCoordination: true,
      enableGuestInvitations: true,
      enableReminders: true,
      emergencyNotifications: true
    },
    conflictResolution: {
      strategy: 'prompt_user',
      autoResolve: false,
      prioritizeWeddingEvents: true
    }
  };

  beforeEach(() => {
    integration = new CalendarAPIIntegration(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Calendar Provider Management', () => {
    it('should register Google Calendar provider', async () => {
      const googleProvider = {
        providerId: 'google-calendar-main',
        name: 'Google Calendar',
        provider: 'google',
        version: 'v3',
        credentials: {
          clientId: 'google_client_id',
          clientSecret: 'google_client_secret',
          refreshToken: 'google_refresh_token',
          accessToken: 'google_access_token'
        },
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ],
        capabilities: [
          'read_events', 'create_events', 'update_events', 'delete_events',
          'manage_calendars', 'share_calendars', 'set_reminders'
        ],
        rateLimiting: {
          requestsPerSecond: 10,
          dailyQuota: 1000000
        },
        webhookSupport: true,
        realTimeSyncSupport: true
      };

      const result = await integration.registerProvider(googleProvider);

      expect(result.success).toBe(true);
      expect(result.providerId).toBe('google-calendar-main');
    });

    it('should register Outlook Calendar provider', async () => {
      const outlookProvider = {
        providerId: 'outlook-calendar-main',
        name: 'Microsoft Outlook Calendar',
        provider: 'outlook',
        version: 'v1.0',
        credentials: {
          clientId: 'outlook_client_id',
          clientSecret: 'outlook_client_secret',
          refreshToken: 'outlook_refresh_token',
          accessToken: 'outlook_access_token'
        },
        scopes: [
          'https://graph.microsoft.com/calendars.readwrite',
          'https://graph.microsoft.com/calendars.read'
        ],
        capabilities: [
          'read_events', 'create_events', 'update_events', 'delete_events',
          'manage_calendars', 'set_reminders', 'manage_permissions'
        ],
        rateLimiting: {
          requestsPerSecond: 5,
          dailyQuota: 500000
        },
        webhookSupport: true,
        realTimeSyncSupport: true
      };

      const result = await integration.registerProvider(outlookProvider);

      expect(result.success).toBe(true);
      expect(result.providerId).toBe('outlook-calendar-main');
    });

    it('should validate provider configuration', async () => {
      const invalidProvider = {
        providerId: '',
        name: 'Invalid Provider',
        provider: 'unknown',
        version: '',
        credentials: {},
        scopes: [],
        capabilities: [],
        rateLimiting: {},
        webhookSupport: false,
        realTimeSyncSupport: false
      };

      await expect(integration.registerProvider(invalidProvider)).rejects.toThrow('Invalid provider configuration');
    });

    it('should handle provider authentication refresh', async () => {
      const googleProvider = {
        providerId: 'google-auth-test',
        name: 'Google Auth Test',
        provider: 'google',
        version: 'v3',
        credentials: {
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret',
          refreshToken: 'expired_refresh_token',
          accessToken: 'expired_access_token'
        },
        scopes: ['https://www.googleapis.com/auth/calendar'],
        capabilities: ['read_events', 'create_events'],
        rateLimiting: { requestsPerSecond: 10 },
        webhookSupport: true,
        realTimeSyncSupport: true
      };

      await integration.registerProvider(googleProvider);

      const authResult = await integration.refreshProviderAuth('google-auth-test');

      expect(authResult.success).toBe(true);
      expect(authResult.newAccessToken).toBeDefined();
      expect(authResult.expiresIn).toBeDefined();
    });
  });

  describe('Wedding Event Management', () => {
    beforeEach(async () => {
      // Register test providers
      const googleProvider = {
        providerId: 'google-test',
        name: 'Google Test',
        provider: 'google',
        version: 'v3',
        credentials: {
          clientId: 'test_client',
          clientSecret: 'test_secret',
          accessToken: 'test_token',
          refreshToken: 'test_refresh'
        },
        scopes: ['https://www.googleapis.com/auth/calendar'],
        capabilities: ['read_events', 'create_events', 'update_events'],
        rateLimiting: { requestsPerSecond: 10 },
        webhookSupport: true,
        realTimeSyncSupport: true
      };

      await integration.registerProvider(googleProvider);
    });

    it('should create wedding ceremony event', async () => {
      const ceremonyEvent = {
        eventId: 'wedding-ceremony-001',
        providerId: 'google-test',
        calendarId: 'primary',
        weddingId: 'wedding-123',
        eventType: 'wedding_ceremony',
        title: 'John & Jane Wedding Ceremony',
        description: 'Wedding ceremony at Central Park',
        startTime: '2024-06-15T16:00:00Z',
        endTime: '2024-06-15T17:00:00Z',
        location: {
          address: 'Central Park, New York, NY',
          coordinates: { lat: 40.7829, lng: -73.9654 },
          venue: 'Bethesda Fountain'
        },
        attendees: [
          {
            email: 'bride@example.com',
            name: 'Jane Smith',
            role: 'bride',
            responseStatus: 'accepted'
          },
          {
            email: 'groom@example.com',
            name: 'John Doe',
            role: 'groom',
            responseStatus: 'accepted'
          },
          {
            email: 'officiant@weddings.com',
            name: 'Rev. Smith',
            role: 'officiant',
            responseStatus: 'accepted'
          }
        ],
        weddingDetails: {
          coupleNames: ['John Doe', 'Jane Smith'],
          weddingStyle: 'traditional',
          guestCount: 150,
          dress_code: 'formal'
        },
        vendors: [
          { vendorId: 'photographer-123', category: 'photography', arrivalTime: '15:30:00Z' },
          { vendorId: 'florist-456', category: 'florist', setupTime: '14:00:00Z' }
        ],
        reminders: [
          { method: 'email', minutes: 1440 }, // 24 hours before
          { method: 'popup', minutes: 60 }, // 1 hour before
          { method: 'sms', minutes: 30 } // 30 minutes before
        ]
      };

      const result = await integration.createWeddingEvent(ceremonyEvent);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('wedding-ceremony-001');
      expect(result.calendarEventId).toBeDefined();
      expect(result.weddingIntegration).toBe(true);
    });

    it('should create wedding reception event', async () => {
      const receptionEvent = {
        eventId: 'wedding-reception-001',
        providerId: 'google-test',
        calendarId: 'primary',
        weddingId: 'wedding-123',
        eventType: 'wedding_reception',
        title: 'John & Jane Wedding Reception',
        description: 'Wedding reception dinner and dancing',
        startTime: '2024-06-15T18:00:00Z',
        endTime: '2024-06-15T23:00:00Z',
        location: {
          address: 'Grand Ballroom, NYC',
          coordinates: { lat: 40.7589, lng: -73.9851 },
          venue: 'Grand Ballroom'
        },
        attendees: [
          {
            email: 'bride@example.com',
            name: 'Jane Smith',
            role: 'bride',
            responseStatus: 'accepted'
          },
          {
            email: 'groom@example.com',
            name: 'John Doe',
            role: 'groom',
            responseStatus: 'accepted'
          }
        ],
        weddingDetails: {
          coupleNames: ['John Doe', 'Jane Smith'],
          menu: 'italian',
          entertainment: 'live_band',
          firstDance: '19:30:00Z'
        },
        vendors: [
          { vendorId: 'caterer-789', category: 'catering', setupTime: '16:00:00Z' },
          { vendorId: 'band-321', category: 'entertainment', setupTime: '17:00:00Z' },
          { vendorId: 'photographer-123', category: 'photography', arrivalTime: '18:00:00Z' }
        ],
        timeline: [
          { time: '18:00:00Z', event: 'cocktail_hour', duration: 60 },
          { time: '19:00:00Z', event: 'dinner_service', duration: 90 },
          { time: '20:30:00Z', event: 'speeches', duration: 30 },
          { time: '21:00:00Z', event: 'dancing', duration: 120 }
        ]
      };

      const result = await integration.createWeddingEvent(receptionEvent);

      expect(result.success).toBe(true);
      expect(result.timelineIntegration).toBe(true);
      expect(result.vendorCoordination).toBe(true);
    });

    it('should handle wedding timeline coordination', async () => {
      const weddingTimeline = {
        timelineId: 'timeline-wedding-123',
        weddingId: 'wedding-123',
        weddingDate: '2024-06-15',
        providerId: 'google-test',
        calendarId: 'wedding-timeline-calendar',
        events: [
          {
            eventType: 'preparation',
            title: 'Bridal Preparation',
            startTime: '10:00:00Z',
            duration: 180, // 3 hours
            location: 'Bridal Suite',
            vendors: ['makeup-artist-001', 'hair-stylist-002']
          },
          {
            eventType: 'photography',
            title: 'First Look Photos',
            startTime: '14:00:00Z',
            duration: 60,
            location: 'Garden Area',
            vendors: ['photographer-123']
          },
          {
            eventType: 'ceremony',
            title: 'Wedding Ceremony',
            startTime: '16:00:00Z',
            duration: 60,
            location: 'Central Park',
            vendors: ['photographer-123', 'florist-456', 'officiant-789']
          },
          {
            eventType: 'cocktails',
            title: 'Cocktail Hour',
            startTime: '18:00:00Z',
            duration: 60,
            location: 'Grand Ballroom Foyer',
            vendors: ['caterer-789', 'bar-service-456']
          },
          {
            eventType: 'reception',
            title: 'Reception Dinner',
            startTime: '19:00:00Z',
            duration: 240, // 4 hours
            location: 'Grand Ballroom',
            vendors: ['caterer-789', 'band-321', 'photographer-123']
          }
        ],
        bufferTime: 15, // 15 minutes between events
        emergencyContacts: [
          { name: 'Wedding Planner', phone: '+1-555-0123', email: 'planner@weddings.com' }
        ]
      };

      const result = await integration.createWeddingTimeline(weddingTimeline);

      expect(result.success).toBe(true);
      expect(result.createdEvents).toHaveLength(5);
      expect(result.vendorNotifications).toBeDefined();
      expect(result.conflictChecks).toBe('passed');
    });

    it('should detect and resolve event conflicts', async () => {
      // Create conflicting events
      const event1 = {
        eventId: 'conflict-event-1',
        providerId: 'google-test',
        calendarId: 'primary',
        weddingId: 'wedding-123',
        eventType: 'vendor_meeting',
        title: 'Photographer Meeting',
        startTime: '2024-06-01T14:00:00Z',
        endTime: '2024-06-01T15:00:00Z',
        vendors: ['photographer-123']
      };

      const event2 = {
        eventId: 'conflict-event-2',
        providerId: 'google-test',
        calendarId: 'primary',
        weddingId: 'wedding-123',
        eventType: 'vendor_meeting',
        title: 'Cake Tasting',
        startTime: '2024-06-01T14:30:00Z', // Overlaps with event1
        endTime: '2024-06-01T15:30:00Z',
        vendors: ['cake-baker-456']
      };

      await integration.createWeddingEvent(event1);

      const conflictResult = await integration.createWeddingEvent(event2);

      expect(conflictResult.success).toBe(false);
      expect(conflictResult.conflicts).toBeDefined();
      expect(conflictResult.conflicts).toHaveLength(1);
      expect(conflictResult.suggestedAlternatives).toBeDefined();
    });
  });

  describe('Vendor Calendar Synchronization', () => {
    beforeEach(async () => {
      const providers = [
        {
          providerId: 'google-vendor-sync',
          name: 'Google Vendor Sync',
          provider: 'google',
          version: 'v3',
          credentials: { clientId: 'test', clientSecret: 'test', accessToken: 'test' },
          scopes: ['https://www.googleapis.com/auth/calendar'],
          capabilities: ['read_events', 'create_events', 'update_events'],
          rateLimiting: { requestsPerSecond: 10 },
          webhookSupport: true,
          realTimeSyncSupport: true
        }
      ];

      for (const provider of providers) {
        await integration.registerProvider(provider);
      }
    });

    it('should sync vendor availability with calendar', async () => {
      const vendorSync = {
        syncId: 'vendor-sync-001',
        vendorId: 'photographer-123',
        providerId: 'google-vendor-sync',
        vendorCalendarId: 'vendor@photography.com',
        weddingCalendarId: 'wedding-calendar-123',
        syncType: 'bidirectional',
        syncSettings: {
          syncAvailability: true,
          syncBookings: true,
          syncTravelTime: true,
          autoBlockUnavailable: true,
          notifyConflicts: true
        },
        vendorDetails: {
          name: 'John\'s Photography',
          category: 'photography',
          serviceArea: 'New York Metro',
          setupTime: 60, // minutes needed for setup
          teardownTime: 30 // minutes needed for teardown
        }
      };

      const result = await integration.setupVendorSync(vendorSync);

      expect(result.success).toBe(true);
      expect(result.syncId).toBe('vendor-sync-001');
      expect(result.syncStatus).toBe('active');
    });

    it('should check vendor availability for specific dates', async () => {
      const availabilityCheck = {
        vendorId: 'photographer-123',
        providerId: 'google-vendor-sync',
        calendarId: 'vendor@photography.com',
        dateRange: {
          start: '2024-06-01T00:00:00Z',
          end: '2024-06-30T23:59:59Z'
        },
        eventDuration: 480, // 8 hours for wedding
        includeBufferTime: true,
        bufferBefore: 60, // 1 hour setup
        bufferAfter: 30, // 30 min cleanup
        preferredDays: ['saturday', 'sunday'],
        excludeHolidays: true
      };

      const availability = await integration.checkVendorAvailability(availabilityCheck);

      expect(availability.success).toBe(true);
      expect(availability.availableDates).toBeDefined();
      expect(availability.conflictingEvents).toBeDefined();
      expect(availability.suggestedAlternatives).toBeDefined();
    });

    it('should coordinate multiple vendors for same event', async () => {
      const multiVendorCoordination = {
        coordinationId: 'coord-wedding-123',
        weddingId: 'wedding-123',
        eventDate: '2024-06-15',
        eventStartTime: '16:00:00Z',
        eventEndTime: '23:00:00Z',
        location: {
          address: 'Grand Ballroom, NYC',
          coordinates: { lat: 40.7589, lng: -73.9851 }
        },
        vendors: [
          {
            vendorId: 'photographer-123',
            category: 'photography',
            arrivalTime: '15:30:00Z',
            departureTime: '23:30:00Z',
            calendarId: 'photo@studio.com',
            setupRequirements: ['lighting_check', 'equipment_setup']
          },
          {
            vendorId: 'florist-456',
            category: 'florist',
            arrivalTime: '12:00:00Z',
            departureTime: '17:00:00Z',
            calendarId: 'flowers@garden.com',
            setupRequirements: ['altar_decoration', 'reception_centerpieces']
          },
          {
            vendorId: 'caterer-789',
            category: 'catering',
            arrivalTime: '14:00:00Z',
            departureTime: '24:00:00Z',
            calendarId: 'catering@delicious.com',
            setupRequirements: ['kitchen_prep', 'table_setup', 'service_briefing']
          }
        ],
        coordinationRules: {
          mandatorySequence: ['florist_setup', 'photography_test', 'catering_prep'],
          conflictResolution: 'priority_based',
          emergencyProtocol: 'immediate_notification'
        }
      };

      const coordination = await integration.coordinateMultipleVendors(multiVendorCoordination);

      expect(coordination.success).toBe(true);
      expect(coordination.createdEvents).toHaveLength(3);
      expect(coordination.sequenceValidation).toBe('passed');
      expect(coordination.conflictResolution).toBeDefined();
    });

    it('should handle vendor cancellation and rescheduling', async () => {
      const cancellation = {
        cancellationId: 'cancel-001',
        originalEventId: 'wedding-ceremony-001',
        vendorId: 'photographer-123',
        cancellationReason: 'illness',
        notificationTime: new Date().toISOString(),
        weddingDate: '2024-06-15',
        urgency: 'high', // Wedding is soon
        replacementNeeded: true,
        replacementCriteria: {
          category: 'photography',
          experience: 'wedding_specialist',
          location: 'New York Metro',
          availability: '2024-06-15T15:30:00Z'
        },
        emergencyProtocol: {
          notifyCouple: true,
          notifyPlanner: true,
          activateReplacementSearch: true,
          escalateToSupport: true
        }
      };

      const result = await integration.handleVendorCancellation(cancellation);

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBeGreaterThan(0);
      expect(result.replacementSearchActivated).toBe(true);
      expect(result.emergencyProtocolActivated).toBe(true);
    });
  });

  describe('Guest Calendar Integration', () => {
    it('should send calendar invites to wedding guests', async () => {
      const guestInvitation = {
        invitationId: 'invite-wedding-123',
        weddingId: 'wedding-123',
        eventDetails: {
          eventType: 'wedding_ceremony_and_reception',
          coupleNames: ['John Doe', 'Jane Smith'],
          ceremonyTime: '2024-06-15T16:00:00Z',
          receptionTime: '2024-06-15T18:00:00Z',
          location: {
            ceremony: 'Central Park, NYC',
            reception: 'Grand Ballroom, NYC'
          }
        },
        guestList: [
          {
            guestId: 'guest-001',
            name: 'Alice Johnson',
            email: 'alice@example.com',
            role: 'family',
            rsvpStatus: 'pending',
            plusOne: true
          },
          {
            guestId: 'guest-002',
            name: 'Bob Smith',
            email: 'bob@example.com',
            role: 'friend',
            rsvpStatus: 'pending',
            plusOne: false
          }
        ],
        invitationSettings: {
          includeDirections: true,
          includeDressCode: true,
          includeGiftRegistry: true,
          rsvpDeadline: '2024-05-01',
          allowPlusOnes: true,
          dietaryRestrictions: true
        },
        customMessage: 'We are so excited to celebrate with you on our special day!'
      };

      const result = await integration.sendGuestInvitations(guestInvitation);

      expect(result.success).toBe(true);
      expect(result.invitationsSent).toBe(2);
      expect(result.calendarEventsCreated).toBe(2);
      expect(result.rsvpTrackingEnabled).toBe(true);
    });

    it('should track RSVP responses from calendar invites', async () => {
      const rsvpTracking = {
        weddingId: 'wedding-123',
        guestResponses: [
          {
            guestId: 'guest-001',
            email: 'alice@example.com',
            responseStatus: 'accepted',
            responseDate: '2024-03-15T10:30:00Z',
            plusOneConfirmed: true,
            dietaryRestrictions: ['vegetarian'],
            specialRequests: 'Near the dance floor please'
          },
          {
            guestId: 'guest-002',
            email: 'bob@example.com',
            responseStatus: 'declined',
            responseDate: '2024-03-16T14:22:00Z',
            declineReason: 'Prior commitment'
          }
        ]
      };

      const result = await integration.processRSVPResponses(rsvpTracking);

      expect(result.success).toBe(true);
      expect(result.acceptedCount).toBe(1);
      expect(result.declinedCount).toBe(1);
      expect(result.pendingCount).toBeDefined();
      expect(result.guestListUpdated).toBe(true);
    });

    it('should manage wedding reminders and notifications', async () => {
      const reminderSystem = {
        weddingId: 'wedding-123',
        providerId: 'google-test',
        reminderSchedule: [
          {
            reminderType: 'save_the_date',
            sendDate: '2024-01-15T09:00:00Z',
            recipients: 'all_guests',
            message: 'Save the Date for John & Jane\'s Wedding!'
          },
          {
            reminderType: 'rsvp_reminder',
            sendDate: '2024-04-15T09:00:00Z',
            recipients: 'pending_rsvp',
            message: 'Don\'t forget to RSVP for our wedding!'
          },
          {
            reminderType: 'week_before',
            sendDate: '2024-06-08T09:00:00Z',
            recipients: 'confirmed_guests',
            message: 'Our wedding is next week! Can\'t wait to see you!'
          },
          {
            reminderType: 'day_before',
            sendDate: '2024-06-14T18:00:00Z',
            recipients: 'confirmed_guests',
            message: 'Our wedding is tomorrow! See you there!'
          }
        ],
        personalization: {
          includeNames: true,
          includeWeddingDetails: true,
          includeDirections: true,
          includeWeatherUpdate: true
        }
      };

      const result = await integration.setupWeddingReminders(reminderSystem);

      expect(result.success).toBe(true);
      expect(result.scheduledReminders).toBe(4);
      expect(result.recipientCount).toBeGreaterThan(0);
      expect(result.personalizationEnabled).toBe(true);
    });
  });

  describe('Real-time Synchronization', () => {
    it('should establish real-time webhook connections', async () => {
      const webhookConfig = {
        webhookId: 'webhook-wedding-123',
        providerId: 'google-test',
        calendarId: 'wedding-calendar-123',
        eventTypes: [
          'event_created', 'event_updated', 'event_deleted',
          'rsvp_changed', 'attendee_added', 'attendee_removed'
        ],
        callbackUrl: 'https://api.wedsync.com/webhooks/calendar',
        authentication: {
          method: 'hmac_sha256',
          secret: 'webhook_secret_key'
        },
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential'
        }
      };

      const result = await integration.setupWebhookSubscription(webhookConfig);

      expect(result.success).toBe(true);
      expect(result.webhookId).toBe('webhook-wedding-123');
      expect(result.subscriptionActive).toBe(true);
      expect(result.verificationStatus).toBe('verified');
    });

    it('should process webhook notifications', async () => {
      const webhookNotification = {
        webhookId: 'webhook-wedding-123',
        eventType: 'event_updated',
        timestamp: '2024-03-20T15:30:00Z',
        providerId: 'google-test',
        calendarId: 'wedding-calendar-123',
        eventData: {
          eventId: 'wedding-ceremony-001',
          changes: {
            startTime: {
              from: '2024-06-15T16:00:00Z',
              to: '2024-06-15T16:30:00Z' // 30 minute delay
            },
            location: {
              from: 'Central Park, NYC',
              to: 'Brooklyn Bridge Park, NYC'
            }
          }
        },
        signature: 'webhook_signature_hash'
      };

      const result = await integration.processWebhookNotification(webhookNotification);

      expect(result.success).toBe(true);
      expect(result.eventUpdated).toBe(true);
      expect(result.notificationsSent).toBeGreaterThan(0);
      expect(result.vendorNotifications).toBe(true);
      expect(result.guestNotifications).toBe(true);
    });

    it('should handle real-time conflict detection', async () => {
      const realTimeConflict = {
        conflictId: 'conflict-realtime-001',
        timestamp: '2024-03-20T10:15:00Z',
        conflictType: 'vendor_double_booking',
        affectedEvent: {
          eventId: 'wedding-ceremony-001',
          weddingId: 'wedding-123',
          vendorId: 'photographer-123'
        },
        conflictingEvent: {
          eventId: 'other-wedding-456',
          startTime: '2024-06-15T16:00:00Z',
          endTime: '2024-06-15T17:00:00Z'
        },
        severity: 'critical',
        autoResolution: false,
        requiresImmediateAction: true
      };

      const result = await integration.handleRealTimeConflict(realTimeConflict);

      expect(result.success).toBe(true);
      expect(result.conflictDetected).toBe(true);
      expect(result.emergencyNotificationSent).toBe(true);
      expect(result.resolutionOptions).toBeDefined();
      expect(result.escalatedToSupport).toBe(true);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache calendar data efficiently', async () => {
      const cacheConfig = {
        providerId: 'google-test',
        calendarId: 'wedding-calendar-123',
        cacheStrategy: 'intelligent',
        cacheDuration: 300000, // 5 minutes
        invalidationTriggers: [
          'event_modified', 'vendor_availability_changed', 'guest_rsvp_updated'
        ]
      };

      const result = await integration.configureCaching(cacheConfig);
      expect(result.success).toBe(true);

      // Test cache performance
      const start = Date.now();
      await integration.getCalendarEvents('google-test', 'wedding-calendar-123');
      const firstCallTime = Date.now() - start;

      const start2 = Date.now();
      await integration.getCalendarEvents('google-test', 'wedding-calendar-123');
      const secondCallTime = Date.now() - start2;

      expect(secondCallTime).toBeLessThan(firstCallTime); // Should be faster due to caching
    });

    it('should handle rate limiting gracefully', async () => {
      const rateLimitConfig = {
        providerId: 'google-test',
        requestsPerSecond: 2, // Low limit to test
        burstAllowance: 5,
        backoffStrategy: 'exponential',
        maxWaitTime: 30000
      };

      await integration.configureRateLimit(rateLimitConfig);

      // Make multiple rapid requests
      const requests = Array.from({ length: 10 }, (_, i) => 
        integration.getCalendarEvents('google-test', `calendar-${i}`)
      );

      const results = await Promise.allSettled(requests);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      expect(successful).toBeGreaterThan(0);
      // Some requests should be throttled but eventually succeed
    });

    it('should optimize batch operations', async () => {
      const batchOperations = {
        batchId: 'batch-wedding-123',
        operations: [
          {
            type: 'create_event',
            eventData: {
              title: 'Venue Walk-through',
              startTime: '2024-05-01T14:00:00Z',
              endTime: '2024-05-01T15:00:00Z'
            }
          },
          {
            type: 'create_event',
            eventData: {
              title: 'Cake Tasting',
              startTime: '2024-05-05T16:00:00Z',
              endTime: '2024-05-05T17:00:00Z'
            }
          },
          {
            type: 'update_event',
            eventId: 'existing-event-123',
            updates: {
              location: 'Updated Venue Address'
            }
          }
        ],
        providerId: 'google-test',
        calendarId: 'wedding-planning-calendar'
      };

      const result = await integration.executeBatchOperations(batchOperations);

      expect(result.success).toBe(true);
      expect(result.successfulOperations).toBe(3);
      expect(result.failedOperations).toBe(0);
      expect(result.executionTime).toBeLessThan(10000); // Should be efficient
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle authentication failures', async () => {
      const invalidProvider = {
        providerId: 'invalid-auth-provider',
        name: 'Invalid Auth Provider',
        provider: 'google',
        version: 'v3',
        credentials: {
          clientId: 'invalid_client_id',
          clientSecret: 'invalid_client_secret',
          accessToken: 'expired_access_token',
          refreshToken: 'invalid_refresh_token'
        },
        scopes: ['https://www.googleapis.com/auth/calendar'],
        capabilities: ['read_events'],
        rateLimiting: { requestsPerSecond: 10 },
        webhookSupport: false,
        realTimeSyncSupport: false
      };

      await integration.registerProvider(invalidProvider);

      const result = await integration.getCalendarEvents('invalid-auth-provider', 'primary');

      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication');
      expect(result.reauthRequired).toBe(true);
    });

    it('should recover from network failures', async () => {
      const networkFailureEvent = {
        eventId: 'network-fail-event',
        providerId: 'google-test',
        calendarId: 'primary',
        eventType: 'vendor_meeting',
        title: 'Network Failure Test',
        startTime: '2024-07-01T10:00:00Z',
        endTime: '2024-07-01T11:00:00Z',
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000
        }
      };

      const result = await integration.createWeddingEvent(networkFailureEvent);

      // Should succeed eventually with retry logic
      expect(result.success || result.retryScheduled).toBe(true);
    });

    it('should handle calendar service outages', async () => {
      const outageScenario = {
        providerId: 'google-test',
        outageType: 'service_unavailable',
        estimatedDuration: 3600000, // 1 hour
        affectedFeatures: ['create_events', 'update_events'],
        fallbackStrategy: 'queue_operations'
      };

      const result = await integration.handleServiceOutage(outageScenario);

      expect(result.success).toBe(true);
      expect(result.fallbackActivated).toBe(true);
      expect(result.operationsQueued).toBeGreaterThanOrEqual(0);
      expect(result.userNotificationSent).toBe(true);
    });
  });
});