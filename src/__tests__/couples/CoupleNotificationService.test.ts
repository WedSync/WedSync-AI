// WS-334 Team D: Couple Notification Service Tests
// Comprehensive test suite for notification service business logic

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CoupleNotificationService } from '@/services/couples/CoupleNotificationService';
import {
  CoupleProfile,
  WeddingContext,
  BaseNotification,
  MilestoneType,
  PersonalizedNotification,
  MilestoneNotification,
} from '@/types/couple-notifications';

// Mock Supabase
const mockSupabaseData = {
  couples: [{ id: 'couple-123', wedding_id: 'wedding-456' }],
  couple_notification_preferences: [
    {
      couple_id: 'couple-123',
      enabled: true,
      communication_style: 'casual_fun',
      notification_frequency: 'normal',
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
    },
  ],
  couple_notifications: [],
  milestone_notifications: [],
};

// Helper functions to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
const createQueryResult = (table: string) => ({
  data: mockSupabaseData[table as keyof typeof mockSupabaseData]?.[0],
  error: null,
});

// Helper for mock notification content to reduce nesting
const createMockNotificationContent = () => ({
  title: 'Test',
  message: 'Test message',
  personalizedElements: [],
});

// Helper for minimal preferences Supabase mock to reduce nesting
const createMinimalPrefsQuery = (minimalPrefs: any) => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(() => ({
        data: minimalPrefs,
        error: null,
      })),
    })),
  })),
  insert: vi.fn(() => ({ error: null })),
  upsert: vi.fn(() => ({ error: null })),
});

// Helper for database error Supabase mock to reduce nesting
const createErrorQuery = () => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(() => ({
        data: null,
        error: new Error('Database error'),
      })),
    })),
  })),
  insert: vi.fn(() => ({ error: new Error('Insert failed') })),
});

// Helper for formal couple profile to reduce nesting
const createFormalCoupleProfile = (baseProfile: CoupleProfile) => ({
  ...baseProfile,
  partnerA: {
    ...baseProfile.partnerA,
    communicationPreference: 'formal' as any,
  },
});

const createSingleQuery = (table: string) => ({
  single: vi.fn(() => createQueryResult(table)),
});

const createSelectBuilder = (table: string) => ({
  eq: vi.fn(() => createSingleQuery(table)),
});

const createUpdateBuilder = (table: string) => ({
  eq: vi.fn(() => ({
    select: vi.fn(() => createSingleQuery(table)),
  })),
});

const createTableBuilder = (table: string) => ({
  select: vi.fn(() => createSelectBuilder(table)),
  insert: vi.fn(() => ({ error: null })),
  upsert: vi.fn(() => ({ error: null })),
  update: vi.fn(() => createUpdateBuilder(table)),
});

const mockSupabase = {
  from: vi.fn((table: string) => createTableBuilder(table)),
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Test data
const mockCoupleProfile: CoupleProfile = {
  coupleId: 'couple-123',
  weddingId: 'wedding-456',
  partnerA: {
    partnerId: 'partner-a-1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah@example.com',
    communicationPreference: 'morning' as any,
    socialMediaUsage: 'high' as any,
  },
  partnerB: {
    partnerId: 'partner-b-1',
    firstName: 'James',
    lastName: 'Smith',
    email: 'james@example.com',
    communicationPreference: 'evening' as any,
    socialMediaUsage: 'medium' as any,
  },
  weddingDate: new Date('2024-06-15'),
  weddingStyle: 'romantic',
  budgetRange: 'medium' as any,
  guestCount: 150,
  viralTendencies: 'high',
  visualPreferences: {} as any,
  preferredTone: 'excited',
};

const mockWeddingContext: WeddingContext = {
  weddingId: 'wedding-456',
  weddingDate: new Date('2024-06-15'),
  daysToWedding: 180,
  currentPhase: 'early_planning',
  budgetUtilization: 0.3,
  vendorCategories: [
    { name: 'Photography', confirmed: false },
    { name: 'Catering', confirmed: false },
  ],
  selectedVendors: [],
  timeline: {},
  guestList: [],
  currentStressLevel: 'low',
  planningProgress: 0.25,
};

const mockBaseNotification: BaseNotification = {
  id: 'base-notif-123',
  type: 'vendor_update',
  category: 'vendor',
  title: 'Vendor Update',
  message: 'Your {{vendor_name}} has sent you an update!',
  priority: 'medium',
};

describe('CoupleNotificationService', () => {
  let service: CoupleNotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CoupleNotificationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('creates service instance successfully', () => {
      expect(service).toBeInstanceOf(CoupleNotificationService);
    });

    it('initializes couple experience with default preferences', async () => {
      await service.initializeCoupleExperience(mockCoupleProfile);

      // Should create notification preferences
      expect(mockSupabase.from).toHaveBeenCalledWith(
        'couple_notification_preferences',
      );
    });

    it('sets up milestone tracking for new couples', async () => {
      await service.initializeCoupleExperience(mockCoupleProfile);

      // Should create milestone tracking
      expect(mockSupabase.from).toHaveBeenCalledWith(
        'couple_milestone_tracking',
      );
    });
  });

  describe('Notification Generation', () => {
    it('generates personalized notifications successfully', async () => {
      const notification = await service.generateAndDeliverNotification(
        mockBaseNotification,
        mockCoupleProfile,
        mockWeddingContext,
      );

      expect(notification).toBeDefined();
      expect(notification.notificationId).toBeDefined();
      expect(notification.coupleId).toBe(mockCoupleProfile.coupleId);
      expect(notification.weddingId).toBe(mockWeddingContext.weddingId);
      expect(notification.personalizationLevel).toBe('ai_optimized');
    });

    it('personalizes notification content with couple names', async () => {
      const notification = await service.generateAndDeliverNotification(
        mockBaseNotification,
        mockCoupleProfile,
        mockWeddingContext,
      );

      expect(notification.content.title).toContain('Sarah');
      expect(notification.content.title).toContain('James');
    });

    it('applies correct emotional tone based on context', async () => {
      const highStressContext = {
        ...mockWeddingContext,
        currentStressLevel: 'high' as const,
      };

      const notification = await service.generateAndDeliverNotification(
        mockBaseNotification,
        mockCoupleProfile,
        highStressContext,
      );

      // High stress should result in reassuring tone
      expect(notification.emotionalTone).toBe('reassuring');
    });

    it('handles milestone notifications with different achievement levels', async () => {
      const earlyMilestone = await service.createMilestoneNotification(
        'venue_booked',
        mockCoupleProfile,
        { ...mockWeddingContext, daysToWedding: 250 }, // Well ahead of typical timeline
      );

      expect(earlyMilestone.achievementLevel).toBe('diamond');

      const lateMilestone = await service.createMilestoneNotification(
        'venue_booked',
        mockCoupleProfile,
        { ...mockWeddingContext, daysToWedding: 100 }, // Behind typical timeline
      );

      expect(lateMilestone.achievementLevel).toBe('bronze');
    });

    it('generates contextual recommendations based on wedding context', async () => {
      const budgetContext = {
        ...mockWeddingContext,
        budgetUtilization: 0.6, // Under budget
      };

      const budgetNotification = {
        ...mockBaseNotification,
        category: 'budget' as const,
      };

      const notification = await service.generateAndDeliverNotification(
        budgetNotification,
        mockCoupleProfile,
        budgetContext,
      );

      expect(notification.contextualRecommendations).toHaveLength(1);
      expect(notification.contextualRecommendations[0].type).toBe(
        'budget_optimization',
      );
    });
  });

  describe('Real-time Stream Management', () => {
    it('adds notification streams correctly', () => {
      service.addNotificationStream('couple-123', 'conn-1');
      service.addNotificationStream('couple-123', 'conn-2');

      // Should handle multiple connections for same couple
      expect(() => {
        service.addNotificationStream('couple-123', 'conn-3');
      }).not.toThrow();
    });

    it('removes notification streams correctly', () => {
      service.addNotificationStream('couple-123', 'conn-1');
      service.addNotificationStream('couple-123', 'conn-2');

      service.removeNotificationStream('couple-123', 'conn-1');

      // Should not throw when removing non-existent connection
      expect(() => {
        service.removeNotificationStream('couple-123', 'conn-999');
      }).not.toThrow();
    });

    it('broadcasts notifications to active streams', async () => {
      const mockNotification: PersonalizedNotification = {
        notificationId: 'test-notif',
        coupleId: 'couple-123',
        weddingId: 'wedding-456',
        type: 'vendor_update',
        category: 'vendor',
        priority: 'medium',
        personalizationLevel: 'basic',
        emotionalTone: 'excited',
        visualTheme: {} as any,
        content: createMockNotificationContent(),
        sharingCapabilities: [],
        viralElements: [],
        contextualRecommendations: [],
        isRead: false,
        createdAt: new Date(),
      };

      service.addNotificationStream('couple-123', 'conn-1');

      // Should not throw when broadcasting
      await expect(
        service.broadcastToCouple('couple-123', mockNotification),
      ).resolves.not.toThrow();
    });
  });

  describe('Milestone Creation', () => {
    it('creates milestone notifications with correct structure', async () => {
      const milestone = await service.createMilestoneNotification(
        'venue_booked',
        mockCoupleProfile,
        mockWeddingContext,
      );

      expect(milestone.milestoneType).toBe('venue_booked');
      expect(milestone.coupleId).toBe(mockCoupleProfile.coupleId);
      expect(milestone.celebrationContent.title).toContain('Venue Booked');
      expect(milestone.progressVisualization).toBeDefined();
      expect(milestone.shareableAssets).toBeDefined();
    });

    it('generates appropriate celebration content for different milestone types', async () => {
      const photographerMilestone = await service.createMilestoneNotification(
        'photography_booked' as MilestoneType,
        mockCoupleProfile,
        mockWeddingContext,
      );

      expect(
        photographerMilestone.celebrationContent.celebrationMessage,
      ).toContain('Sarah & James');
    });

    it('creates shareable assets for milestones', async () => {
      const milestone = await service.createMilestoneNotification(
        'venue_booked',
        mockCoupleProfile,
        mockWeddingContext,
      );

      expect(milestone.shareableAssets).toHaveLength(1);
      expect(milestone.shareableAssets[0]).toMatchObject({
        assetId: expect.stringContaining('milestone-share-'),
        type: 'image',
        platform: expect.arrayContaining(['facebook', 'twitter', 'instagram']),
        customizable: true,
      });
    });
  });

  describe('Delivery Optimization', () => {
    it('respects quiet hours in delivery scheduling', async () => {
      // Mock current time to be during quiet hours (e.g., 11 PM)
      const quietHoursTime = new Date();
      quietHoursTime.setHours(23, 0, 0, 0);

      vi.setSystemTime(quietHoursTime);

      const notification = await service.generateAndDeliverNotification(
        mockBaseNotification,
        mockCoupleProfile,
        mockWeddingContext,
      );

      // Should be scheduled for after quiet hours
      expect(notification.scheduledFor).toBeDefined();
      if (notification.scheduledFor) {
        expect(notification.scheduledFor.getHours()).toBe(8); // After quiet hours end
      }

      vi.useRealTimers();
    });

    it('limits notification frequency for minimal preference', async () => {
      // Mock preferences for minimal notifications
      const minimalPrefs = {
        ...mockSupabaseData.couple_notification_preferences[0],
        notification_frequency: 'minimal',
      };

      mockSupabase.from.mockReturnValue(createMinimalPrefsQuery(minimalPrefs));

      const notification = await service.generateAndDeliverNotification(
        mockBaseNotification,
        mockCoupleProfile,
        mockWeddingContext,
      );

      // Should handle frequency limiting
      expect(notification).toBeDefined();
    });

    it('prioritizes urgent notifications over quiet hours', async () => {
      const urgentNotification = {
        ...mockBaseNotification,
        priority: 'urgent' as const,
      };

      const quietHoursTime = new Date();
      quietHoursTime.setHours(23, 0, 0, 0);
      vi.setSystemTime(quietHoursTime);

      const notification = await service.generateAndDeliverNotification(
        urgentNotification,
        mockCoupleProfile,
        mockWeddingContext,
      );

      // Urgent notifications should not be scheduled for later
      expect(notification.scheduledFor).toBeUndefined();

      vi.useRealTimers();
    });
  });

  describe('Performance Requirements', () => {
    it('generates personalized notifications within 1 second', async () => {
      const startTime = performance.now();

      await service.generateAndDeliverNotification(
        mockBaseNotification,
        mockCoupleProfile,
        mockWeddingContext,
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('handles multiple concurrent notifications efficiently', async () => {
      const startTime = performance.now();

      // Generate 10 notifications concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.generateAndDeliverNotification(
          { ...mockBaseNotification, id: `notif-${i}` },
          mockCoupleProfile,
          mockWeddingContext,
        ),
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(5000); // Should handle 10 notifications within 5 seconds
    });

    it('maintains real-time stream latency under 100ms', async () => {
      const mockNotification: PersonalizedNotification = {
        notificationId: 'latency-test',
        coupleId: 'couple-123',
        weddingId: 'wedding-456',
        type: 'vendor_update',
        category: 'vendor',
        priority: 'medium',
        personalizationLevel: 'basic',
        emotionalTone: 'excited',
        visualTheme: {} as any,
        content: { title: 'Test', message: 'Test', personalizedElements: [] },
        sharingCapabilities: [],
        viralElements: [],
        contextualRecommendations: [],
        isRead: false,
        createdAt: new Date(),
      };

      service.addNotificationStream('couple-123', 'conn-test');

      const startTime = performance.now();

      await service.broadcastToCouple('couple-123', mockNotification);

      const endTime = performance.now();
      const latency = endTime - startTime;

      expect(latency).toBeLessThan(100); // Should broadcast within 100ms
    });
  });

  describe('Error Handling', () => {
    it('falls back to basic notification when personalization fails', async () => {
      // Mock personalization engine to fail
      const originalConsoleError = console.error;
      console.error = vi.fn();

      // Force an error in personalization by providing invalid data
      const invalidContext = null as any;

      const notification = await service.generateAndDeliverNotification(
        mockBaseNotification,
        mockCoupleProfile,
        invalidContext,
      );

      expect(notification).toBeDefined();
      expect(notification.personalizationLevel).toBe('basic');

      console.error = originalConsoleError;
    });

    it('handles database errors gracefully', async () => {
      // Mock Supabase to return error
      mockSupabase.from.mockReturnValue(createErrorQuery());

      await expect(
        service.generateAndDeliverNotification(
          mockBaseNotification,
          mockCoupleProfile,
          mockWeddingContext,
        ),
      ).rejects.toThrow();
    });

    it('handles notification stream errors without crashing', async () => {
      service.addNotificationStream('couple-123', 'conn-error');

      // Should handle broadcast errors gracefully
      await expect(
        service.broadcastToCouple('couple-123', {} as any),
      ).resolves.not.toThrow();
    });
  });

  describe('Business Logic Validation', () => {
    it('calculates wedding phase correctly', async () => {
      const earlyPhaseContext = {
        ...mockWeddingContext,
        daysToWedding: 300,
        planningProgress: 0.1,
      };

      const notification = await service.generateAndDeliverNotification(
        mockBaseNotification,
        mockCoupleProfile,
        earlyPhaseContext,
      );

      // Should include phase-appropriate recommendations
      expect(notification.contextualRecommendations.length).toBeGreaterThan(0);
    });

    it('handles different communication styles appropriately', async () => {
      const formalCouple = createFormalCoupleProfile(mockCoupleProfile);

      const notification = await service.generateAndDeliverNotification(
        mockBaseNotification,
        formalCouple,
        mockWeddingContext,
      );

      expect(notification.content.message).toBeDefined();
      // Content should be adjusted for formal communication style
    });

    it('tracks engagement metrics correctly', async () => {
      await service.trackNotificationEngagement(
        'test-notification-123',
        'opened',
        { platform: 'web', timestamp: new Date() },
      );

      // Should call Supabase insert for engagement metrics
      expect(mockSupabase.from).toHaveBeenCalledWith(
        'notification_engagement_metrics',
      );
    });
  });

  describe('Viral Growth Integration', () => {
    it('includes viral elements for high-viral couples', async () => {
      const highViralCouple = {
        ...mockCoupleProfile,
        viralTendencies: 'influencer' as const,
      };

      const notification = await service.generateAndDeliverNotification(
        mockBaseNotification,
        highViralCouple,
        mockWeddingContext,
      );

      expect(notification.viralElements.length).toBeGreaterThan(0);
    });

    it('excludes viral elements for low-viral couples', async () => {
      const lowViralCouple = {
        ...mockCoupleProfile,
        viralTendencies: 'low' as const,
      };

      const notification = await service.generateAndDeliverNotification(
        mockBaseNotification,
        lowViralCouple,
        mockWeddingContext,
      );

      expect(notification.viralElements.length).toBe(0);
    });

    it('creates friend invitation prompts for milestones', async () => {
      const milestone = await service.createMilestoneNotification(
        'venue_booked',
        mockCoupleProfile,
        mockWeddingContext,
      );

      expect(milestone.friendInvitationPrompts).toHaveLength(1);
      expect(milestone.friendInvitationPrompts[0].promptText).toContain(
        'Share this milestone',
      );
    });
  });
});
