import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeddingNotificationIntelligence } from '../WeddingNotificationIntelligence';
import { NotificationChannelRouter } from '../NotificationChannelRouter';
import { WeddingNotificationEngine } from '../WeddingNotificationEngine';
import type {
  ProcessedNotification,
  NotificationEvent,
  WeddingEventContext,
} from '../../../types/notification-backend';

describe('Wedding Industry Business Logic Tests', () => {
  let intelligence: WeddingNotificationIntelligence;
  let channelRouter: NotificationChannelRouter;
  let engine: WeddingNotificationEngine;

  beforeEach(async () => {
    // Mock external dependencies
    vi.mock('ioredis', () => ({
      Redis: vi.fn().mockImplementation(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        quit: vi.fn().mockResolvedValue(undefined),
        hset: vi.fn().mockResolvedValue(1),
        hget: vi.fn().mockResolvedValue('test'),
        pipeline: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([]),
        }),
      })),
    }));

    intelligence = new WeddingNotificationIntelligence();
    channelRouter = new NotificationChannelRouter();
    engine = new WeddingNotificationEngine();

    await channelRouter.initialize();
    await engine.initialize();
  });

  const createWeddingEvent = (
    overrides?: Partial<NotificationEvent>,
  ): NotificationEvent => ({
    id: 'wedding-event-' + Date.now(),
    type: 'vendor_update',
    weddingId: 'wedding-123',
    userId: 'user-456',
    timestamp: new Date(),
    context: {
      weddingTitle: 'John & Jane Wedding',
      weddingDate: '2024-06-15',
      vendorName: 'Test Vendor',
      vendorType: 'Photography',
    },
    ...overrides,
  });

  const createProcessedNotification = (
    overrides?: Partial<ProcessedNotification>,
  ): ProcessedNotification => ({
    id: 'notification-' + Date.now(),
    event: createWeddingEvent(),
    recipientId: 'recipient-123',
    content: 'Test wedding notification',
    priority: 'medium',
    channels: ['email', 'in_app'],
    scheduledFor: new Date(),
    ...overrides,
  });

  describe('Wedding Day Critical Path Protection', () => {
    it('should escalate ALL notifications to emergency priority on wedding day', () => {
      const today = new Date().toISOString().split('T')[0];

      const weddingDayEvent = createWeddingEvent({
        type: 'vendor_update',
        context: {
          weddingTitle: 'Today Wedding',
          weddingDate: today,
          vendorName: 'Last Minute Vendor',
          vendorType: 'Catering',
        },
      });

      const channels = channelRouter.selectChannels(weddingDayEvent, 'medium');

      // Wedding day should use ALL available channels regardless of original priority
      expect(channels).toContain('voice');
      expect(channels).toContain('sms');
      expect(channels).toContain('push');
      expect(channels).toContain('in_app');
      expect(channels).toContain('email');
      expect(channels.length).toBeGreaterThan(4);
    });

    it('should never delay wedding day notifications', async () => {
      const today = new Date().toISOString().split('T')[0];

      const weddingDayNotification = createProcessedNotification({
        event: createWeddingEvent({
          context: {
            weddingTitle: 'Critical Wedding Day',
            weddingDate: today,
            isWeddingDay: true,
          },
        }),
        scheduledFor: new Date(Date.now() + 60000), // Scheduled 1 minute in future
      });

      const enrichedNotification = await intelligence.enrichNotificationContext(
        weddingDayNotification,
      );

      // Should be processed immediately regardless of scheduledFor
      expect(enrichedNotification.priority).toBe('emergency');
      expect(
        new Date(enrichedNotification.scheduledFor).getTime(),
      ).toBeLessThanOrEqual(Date.now() + 5000);
    });

    it('should automatically escalate to manual intervention if wedding day notification fails', async () => {
      const today = new Date().toISOString().split('T')[0];

      const criticalNotification = createProcessedNotification({
        priority: 'emergency',
        event: createWeddingEvent({
          type: 'wedding_emergency',
          context: {
            weddingTitle: 'Wedding Day Emergency',
            weddingDate: today,
            emergencyType: 'Venue Access Issue',
            actionRequired: 'Immediate coordinator intervention required',
          },
        }),
      });

      const enrichedNotification =
        await intelligence.enrichNotificationContext(criticalNotification);

      // Should have escalation flags set
      expect(enrichedNotification.event.context?.requiresManualEscalation).toBe(
        true,
      );
      expect(enrichedNotification.event.context?.escalationLevel).toBe(
        'critical',
      );
    });
  });

  describe('Saturday Wedding Restrictions', () => {
    it('should restrict non-emergency operations on Saturdays', () => {
      // Mock Saturday (day 6)
      const saturday = new Date('2024-06-15'); // Saturday
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = vi.fn().mockReturnValue(6);

      const saturdayEvent = createWeddingEvent({
        type: 'system_maintenance',
        context: {
          weddingTitle: 'Weekend Wedding',
          weddingDate: '2024-06-15',
          operationType: 'non-emergency',
        },
      });

      const channels = channelRouter.selectChannels(saturdayEvent, 'low');

      // Should be minimal channels for non-emergency on Saturday
      expect(channels.length).toBeLessThan(3);
      expect(channels).not.toContain('voice');

      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });

    it('should allow emergency notifications on Saturdays', () => {
      // Mock Saturday
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = vi.fn().mockReturnValue(6);

      const emergencyEvent = createWeddingEvent({
        type: 'wedding_emergency',
        context: {
          weddingTitle: 'Saturday Emergency Wedding',
          weddingDate: '2024-06-15',
          emergencyType: 'Vendor No-Show',
          actionRequired: 'Find replacement immediately',
        },
      });

      const channels = channelRouter.selectChannels(
        emergencyEvent,
        'emergency',
      );

      // Emergency should use all channels even on Saturday
      expect(channels.length).toBeGreaterThan(4);
      expect(channels).toContain('voice');
      expect(channels).toContain('sms');

      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });
  });

  describe('Wedding Timeline Proximity Logic', () => {
    it('should increase urgency as wedding date approaches', () => {
      const testCases = [
        {
          daysOut: 0,
          expectedPriority: 'emergency',
          description: 'wedding day',
        },
        {
          daysOut: 1,
          expectedPriority: 'emergency',
          description: 'day before',
        },
        { daysOut: 7, expectedPriority: 'high', description: 'week before' },
        {
          daysOut: 30,
          expectedPriority: 'medium',
          description: 'month before',
        },
        {
          daysOut: 90,
          expectedPriority: 'low',
          description: 'three months before',
        },
      ];

      testCases.forEach(({ daysOut, expectedPriority, description }) => {
        const weddingDate = new Date(Date.now() + daysOut * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        const event = createWeddingEvent({
          context: {
            weddingTitle: `${description} Wedding`,
            weddingDate,
            vendorType: 'Timeline Test',
          },
        });

        const channels = channelRouter.selectChannels(event, 'medium');

        if (expectedPriority === 'emergency') {
          expect(channels.length).toBeGreaterThan(3);
          expect(channels).toContain('sms');
        } else if (expectedPriority === 'high') {
          expect(channels.length).toBeGreaterThan(2);
        }
      });
    });

    it('should handle past wedding dates gracefully', () => {
      const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        .toISOString()
        .split('T')[0];

      const pastWeddingEvent = createWeddingEvent({
        context: {
          weddingTitle: 'Past Wedding Follow-up',
          weddingDate: pastDate,
          vendorType: 'Photography',
          eventType: 'photo_delivery',
        },
      });

      const channels = channelRouter.selectChannels(pastWeddingEvent, 'medium');

      // Past weddings should use gentle communication channels
      expect(channels).toContain('email');
      expect(channels).toContain('in_app');
      expect(channels).not.toContain('voice');
      expect(channels.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Weather Impact Assessment', () => {
    it('should prioritize weather alerts for outdoor venues', () => {
      const outdoorWeatherEvent = createWeddingEvent({
        type: 'weather_alert',
        context: {
          weddingTitle: 'Garden Wedding',
          weddingDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          venueType: 'outdoor',
          alertType: 'Thunderstorm Warning',
          hasBackupPlan: false,
          weatherConditions: {
            current: 'Clear',
            forecast: 'Severe Thunderstorm',
            probability: 85,
            impact: 'high',
          },
        },
      });

      const channels = channelRouter.selectChannels(
        outdoorWeatherEvent,
        'high',
      );

      // Outdoor weather alerts should use urgent channels
      expect(channels).toContain('voice');
      expect(channels).toContain('sms');
      expect(channels).toContain('push');
      expect(channels.length).toBeGreaterThan(3);
    });

    it('should provide backup plan suggestions for weather issues', async () => {
      const weatherNotification = createProcessedNotification({
        event: createWeddingEvent({
          type: 'weather_alert',
          context: {
            weddingTitle: 'Outdoor Reception',
            weddingDate: new Date(Date.now() + 48 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            venueType: 'outdoor',
            alertType: 'Rain Forecast',
            hasBackupPlan: false,
            weatherConditions: {
              forecast: '60% chance of rain',
              impact: 'medium',
            },
          },
        }),
      });

      const enrichedNotification =
        await intelligence.enrichNotificationContext(weatherNotification);

      expect(enrichedNotification.event.context?.recommendations).toContain(
        'backup',
      );
      expect(enrichedNotification.event.context?.actionRequired).toContain(
        'plan',
      );
    });

    it('should minimize alerts for indoor venues during weather', () => {
      const indoorWeatherEvent = createWeddingEvent({
        type: 'weather_alert',
        context: {
          weddingTitle: 'Hotel Ballroom Wedding',
          weddingDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          venueType: 'indoor',
          alertType: 'Heavy Snow Warning',
          weatherConditions: {
            forecast: 'Blizzard',
            impact: 'low', // Indoor venue, minimal impact
          },
        },
      });

      const channels = channelRouter.selectChannels(
        indoorWeatherEvent,
        'medium',
      );

      // Indoor venues should get gentler weather notifications
      expect(channels).not.toContain('voice');
      expect(channels.length).toBeLessThan(4);
    });
  });

  describe('Vendor Coordination Logic', () => {
    it('should coordinate dependent vendors for timeline changes', async () => {
      const timelineChangeNotification = createProcessedNotification({
        event: createWeddingEvent({
          type: 'timeline_change',
          context: {
            weddingTitle: 'Coordination Test Wedding',
            weddingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            changeType: 'Ceremony Time Move',
            previousTime: '3:00 PM',
            newTime: '4:00 PM',
            affectedVendors: [
              'Photography',
              'Videography',
              'Music',
              'Catering',
            ],
            dependentServices: ['Cocktail Hour', 'Reception Setup'],
          },
        }),
      });

      const enrichedNotification = await intelligence.enrichNotificationContext(
        timelineChangeNotification,
      );

      expect(enrichedNotification.event.context?.coordinationRequired).toBe(
        true,
      );
      expect(enrichedNotification.event.context?.affectedVendors).toHaveLength(
        4,
      );
      expect(enrichedNotification.priority).toBe('high'); // Timeline changes are urgent
    });

    it('should handle vendor cancellation emergencies', async () => {
      const vendorCancellationNotification = createProcessedNotification({
        priority: 'emergency',
        event: createWeddingEvent({
          type: 'vendor_cancellation',
          context: {
            weddingTitle: 'Emergency Vendor Replacement',
            weddingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0], // 3 days out
            vendorName: 'Premier Catering',
            vendorType: 'Catering',
            cancellationReason: 'Kitchen equipment failure',
            replacementNeeded: true,
            criticalService: true,
          },
        }),
      });

      const enrichedNotification = await intelligence.enrichNotificationContext(
        vendorCancellationNotification,
      );

      expect(enrichedNotification.event.context?.requiresManualEscalation).toBe(
        true,
      );
      expect(
        enrichedNotification.event.context?.replacementSuggestions,
      ).toBeDefined();
      expect(enrichedNotification.priority).toBe('emergency');
    });

    it('should suggest vendor alternatives based on location and availability', async () => {
      const vendorReplacementNotification = createProcessedNotification({
        event: createWeddingEvent({
          type: 'vendor_cancellation',
          context: {
            weddingTitle: 'Vendor Replacement Needed',
            weddingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            vendorType: 'Photography',
            vendorName: 'Cancelled Photographer',
            venueLocation: 'San Francisco Bay Area',
            budget: '$3000',
            style: 'Modern',
          },
        }),
      });

      const enrichedNotification = await intelligence.enrichNotificationContext(
        vendorReplacementNotification,
      );

      expect(
        enrichedNotification.event.context?.replacementCriteria,
      ).toBeDefined();
      expect(
        enrichedNotification.event.context?.searchParameters,
      ).toMatchObject({
        location: expect.any(String),
        budget: expect.any(String),
        availability: expect.any(String),
      });
    });
  });

  describe('Communication Preferences and Etiquette', () => {
    it('should use gentle channels for couples and urgent for vendors', () => {
      const coupleNotificationChannels = channelRouter.selectChannels(
        createWeddingEvent({
          context: {
            weddingTitle: 'Couple Communication Test',
            weddingDate: '2024-06-15',
            recipientType: 'couple',
            messageType: 'update',
          },
        }),
        'medium',
      );

      const vendorNotificationChannels = channelRouter.selectChannels(
        createWeddingEvent({
          context: {
            weddingTitle: 'Vendor Communication Test',
            weddingDate: '2024-06-15',
            recipientType: 'vendor',
            messageType: 'update',
          },
        }),
        'medium',
      );

      // Couples should get gentler communication
      expect(coupleNotificationChannels).not.toContain('voice');
      expect(coupleNotificationChannels).toContain('email');
      expect(coupleNotificationChannels).toContain('in_app');

      // Vendors can get more direct communication
      expect(vendorNotificationChannels).toContain('sms');
      expect(vendorNotificationChannels.length).toBeGreaterThanOrEqual(
        coupleNotificationChannels.length,
      );
    });

    it('should respect time zone preferences for communication', async () => {
      const timeZoneNotification = createProcessedNotification({
        event: createWeddingEvent({
          context: {
            weddingTitle: 'Time Zone Test Wedding',
            weddingDate: '2024-06-15',
            venueTimeZone: 'America/Los_Angeles',
            recipientTimeZone: 'America/New_York',
            preferredContactHours: '9am-8pm',
          },
        }),
      });

      const enrichedNotification =
        await intelligence.enrichNotificationContext(timeZoneNotification);

      expect(
        enrichedNotification.event.context?.optimizedSendTime,
      ).toBeDefined();
      expect(
        enrichedNotification.event.context?.timeZoneAdjustment,
      ).toBeDefined();
    });

    it('should handle multilingual notifications', async () => {
      const multilingualNotification = createProcessedNotification({
        event: createWeddingEvent({
          context: {
            weddingTitle: 'International Wedding',
            weddingDate: '2024-06-15',
            primaryLanguage: 'spanish',
            secondaryLanguage: 'english',
            culturalPreferences: ['formal_address', 'family_inclusive'],
          },
        }),
      });

      const enrichedNotification = await intelligence.enrichNotificationContext(
        multilingualNotification,
      );

      expect(
        enrichedNotification.event.context?.localizedContent,
      ).toBeDefined();
      expect(
        enrichedNotification.event.context?.culturalAdaptations,
      ).toBeDefined();
    });
  });

  describe('Peak Season and Load Management', () => {
    it('should handle peak wedding season (June-September) load prioritization', () => {
      // Mock peak season dates
      const peakSeasonDates = [
        '2024-06-15', // June
        '2024-07-20', // July
        '2024-08-10', // August
        '2024-09-05', // September
      ];

      peakSeasonDates.forEach((date) => {
        const peakSeasonEvent = createWeddingEvent({
          context: {
            weddingTitle: 'Peak Season Wedding',
            weddingDate: date,
            peakSeason: true,
            expectedLoad: 'high',
          },
        });

        const channels = channelRouter.selectChannels(
          peakSeasonEvent,
          'medium',
        );

        // Peak season should have optimized channel selection
        expect(channels.length).toBeGreaterThan(2);
        expect(channels).toContain('in_app'); // Always available
        expect(channels).toContain('email'); // Reliable
      });
    });

    it('should optimize for high concurrent wedding scenarios', async () => {
      const concurrentWeddingNotifications = Array.from(
        { length: 10 },
        (_, i) =>
          createProcessedNotification({
            id: `concurrent-${i}`,
            event: createWeddingEvent({
              weddingId: `wedding-${i}`,
              context: {
                weddingTitle: `Concurrent Wedding ${i}`,
                weddingDate: new Date().toISOString().split('T')[0], // All today
                isConcurrentWedding: true,
                concurrentWeddingCount: 10,
              },
            }),
          }),
      );

      // All should be processed without interference
      const enrichedNotifications = await Promise.all(
        concurrentWeddingNotifications.map((n) =>
          intelligence.enrichNotificationContext(n),
        ),
      );

      enrichedNotifications.forEach((notification, index) => {
        expect(notification.event.context?.concurrentWeddingOptimization).toBe(
          true,
        );
        expect(notification.event.weddingId).toBe(`wedding-${index}`);
      });
    });
  });

  describe('Emergency Escalation Paths', () => {
    it('should escalate to multiple stakeholders for critical emergencies', async () => {
      const criticalEmergency = createProcessedNotification({
        priority: 'emergency',
        event: createWeddingEvent({
          type: 'wedding_emergency',
          context: {
            weddingTitle: 'Critical Emergency Wedding',
            weddingDate: new Date().toISOString().split('T')[0],
            emergencyType: 'Venue Fire - Evacuation Required',
            emergencyLevel: 'critical',
            requiresAuthorities: true,
            affectsMultipleWeddings: true,
          },
        }),
      });

      const enrichedNotification =
        await intelligence.enrichNotificationContext(criticalEmergency);

      expect(enrichedNotification.event.context?.escalationPath).toContain(
        'venue_manager',
      );
      expect(enrichedNotification.event.context?.escalationPath).toContain(
        'wedding_coordinator',
      );
      expect(enrichedNotification.event.context?.escalationPath).toContain(
        'emergency_contact',
      );
      expect(enrichedNotification.event.context?.authorityNotification).toBe(
        true,
      );
    });

    it('should provide fallback communication methods for system failures', async () => {
      const systemFailureNotification = createProcessedNotification({
        priority: 'emergency',
        event: createWeddingEvent({
          type: 'system_emergency',
          context: {
            weddingTitle: 'System Failure Wedding',
            weddingDate: new Date().toISOString().split('T')[0],
            emergencyType: 'Communication System Down',
            primaryChannelsFailed: true,
            requiresFallback: true,
          },
        }),
      });

      const enrichedNotification = await intelligence.enrichNotificationContext(
        systemFailureNotification,
      );

      expect(enrichedNotification.event.context?.fallbackMethods).toBeDefined();
      expect(enrichedNotification.event.context?.manualContactRequired).toBe(
        true,
      );
      expect(enrichedNotification.channels).toContain('voice'); // Last resort
    });
  });

  describe('Data Privacy and Compliance', () => {
    it('should redact sensitive information in non-secure channels', async () => {
      const sensitiveNotification = createProcessedNotification({
        event: createWeddingEvent({
          context: {
            weddingTitle: 'Privacy Test Wedding',
            weddingDate: '2024-06-15',
            guestCount: 150,
            budget: '$50,000',
            personalDetails: 'Sensitive family information',
            paymentInfo: 'Credit card ending in 1234',
          },
        }),
        channels: ['email', 'sms', 'webhook'],
      });

      const enrichedNotification = await intelligence.enrichNotificationContext(
        sensitiveNotification,
      );

      expect(enrichedNotification.event.context?.dataPrivacyLevel).toBe(
        'sensitive',
      );
      expect(enrichedNotification.event.context?.redactionRequired).toBe(true);
    });

    it('should handle GDPR compliance for EU weddings', async () => {
      const gdprNotification = createProcessedNotification({
        event: createWeddingEvent({
          context: {
            weddingTitle: 'European Wedding',
            weddingDate: '2024-06-15',
            venueLocation: 'Paris, France',
            jurisdiction: 'EU',
            gdprCompliance: true,
            dataProcessingConsent: true,
          },
        }),
      });

      const enrichedNotification =
        await intelligence.enrichNotificationContext(gdprNotification);

      expect(enrichedNotification.event.context?.gdprCompliant).toBe(true);
      expect(enrichedNotification.event.context?.dataRetention).toBeDefined();
      expect(enrichedNotification.event.context?.rightToErasure).toBe(true);
    });
  });
});
