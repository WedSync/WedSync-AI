import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import {
  PresenceAwareNotificationRouter,
  getWeddingNotificationRule,
} from '../notification-router';
import {
  PresenceState,
  NotificationUrgency,
  Notification,
  WeddingPresenceContext,
} from '@/types/presence';
import {
  getBulkPresence,
  getUserPresence,
} from '@/lib/presence/presence-manager';
import {
  sendImmediateNotification,
  scheduleNotification,
} from '@/lib/notifications/notification-service';

// Mock dependencies
vi.mock('@/lib/presence/presence-manager');
vi.mock('@/lib/notifications/notification-service');
vi.mock('@/lib/integrations/audit-logger');
vi.mock('@/lib/analytics/presence-analytics');

const mockGetBulkPresence = getBulkPresence as Mock;
const mockGetUserPresence = getUserPresence as Mock;
const mockSendImmediateNotification = sendImmediateNotification as Mock;
const mockScheduleNotification = scheduleNotification as Mock;

describe('PresenceAwareNotificationRouter', () => {
  let router: PresenceAwareNotificationRouter;

  beforeEach(() => {
    router = new PresenceAwareNotificationRouter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('filterRecipientsByPresence', () => {
    const recipients = [
      'online-user',
      'busy-user',
      'away-user',
      'offline-user',
    ];

    beforeEach(() => {
      mockGetBulkPresence.mockResolvedValue({
        'online-user': {
          userId: 'online-user',
          status: 'online',
          lastActivity: new Date().toISOString(),
        } as PresenceState,
        'busy-user': {
          userId: 'busy-user',
          status: 'busy',
          customStatus: 'In wedding planning meeting',
          lastActivity: new Date().toISOString(),
        } as PresenceState,
        'away-user': {
          userId: 'away-user',
          status: 'away',
          lastActivity: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        } as PresenceState,
        'offline-user': {
          userId: 'offline-user',
          status: 'offline',
          lastActivity: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        } as PresenceState,
      });
    });

    it('should filter recipients based on presence and medium urgency', async () => {
      const mediumUrgency: NotificationUrgency = {
        level: 'medium',
        deferIfBusy: true,
        respectDoNotDisturb: true,
        maxDelay: 120, // 2 hours
      };

      const filteredRecipients = await router.filterRecipientsByPresence(
        recipients,
        mediumUrgency,
      );

      // Only online user should receive immediate notification
      expect(filteredRecipients).toEqual(['online-user']);
    });

    it('should send to online and idle users for high urgency', async () => {
      const highUrgency: NotificationUrgency = {
        level: 'high',
        deferIfBusy: false,
        respectDoNotDisturb: true,
        maxDelay: 30,
      };

      // Update mock to include idle user
      mockGetBulkPresence.mockResolvedValue({
        'online-user': {
          userId: 'online-user',
          status: 'online',
          lastActivity: new Date().toISOString(),
        },
        'idle-user': {
          userId: 'idle-user',
          status: 'idle',
          lastActivity: new Date().toISOString(),
        },
        'busy-user': {
          userId: 'busy-user',
          status: 'busy',
          lastActivity: new Date().toISOString(),
        },
        'away-user': {
          userId: 'away-user',
          status: 'away',
          lastActivity: new Date().toISOString(),
        },
      });

      const filteredRecipients = await router.filterRecipientsByPresence(
        ['online-user', 'idle-user', 'busy-user', 'away-user'],
        highUrgency,
      );

      // Should include online, idle, and busy (high urgency overrides deferIfBusy: false)
      expect(filteredRecipients).toContain('online-user');
      expect(filteredRecipients).toContain('idle-user');
      expect(filteredRecipients).toContain('busy-user');
    });

    it('should always send urgent notifications regardless of presence', async () => {
      const urgentLevel: NotificationUrgency = {
        level: 'urgent',
        deferIfBusy: false,
        respectDoNotDisturb: false,
        maxDelay: 0,
      };

      const filteredRecipients = await router.filterRecipientsByPresence(
        recipients,
        urgentLevel,
      );

      // All recipients should receive urgent notifications
      expect(filteredRecipients).toEqual(recipients);
    });

    it('should respect do not disturb custom status', async () => {
      mockGetBulkPresence.mockResolvedValue({
        'dnd-user': {
          userId: 'dnd-user',
          status: 'online',
          customStatus: 'do not disturb - client meeting',
          lastActivity: new Date().toISOString(),
        },
      });

      const mediumUrgency: NotificationUrgency = {
        level: 'medium',
        respectDoNotDisturb: true,
        deferIfBusy: true,
        maxDelay: 60,
      };

      const filteredRecipients = await router.filterRecipientsByPresence(
        ['dnd-user'],
        mediumUrgency,
      );

      // Should be deferred due to DND status
      expect(filteredRecipients).toEqual([]);
    });
  });

  describe('sendPresenceAwareNotification', () => {
    it('should send immediate notifications to available users', async () => {
      const notification: Notification = {
        id: 'notif-123',
        title: 'Timeline Update',
        message: 'Wedding timeline has been updated',
        type: 'timeline_update',
        urgency: {
          level: 'high',
          deferIfBusy: false,
          respectDoNotDisturb: true,
          maxDelay: 30,
        },
        createdAt: new Date(),
      };

      const recipients = ['user1', 'user2'];

      mockGetBulkPresence.mockResolvedValue({
        user1: {
          userId: 'user1',
          status: 'online',
          lastActivity: new Date().toISOString(),
        },
        user2: {
          userId: 'user2',
          status: 'online',
          lastActivity: new Date().toISOString(),
        },
      });

      mockSendImmediateNotification.mockResolvedValue(undefined);

      await router.sendPresenceAwareNotification(notification, recipients);

      expect(mockSendImmediateNotification).toHaveBeenCalledWith(
        notification,
        recipients,
      );
    });

    it('should handle mixed immediate and deferred recipients', async () => {
      const notification: Notification = {
        id: 'notif-456',
        title: 'General Update',
        message: 'New features available',
        type: 'general_update',
        urgency: {
          level: 'medium',
          deferIfBusy: true,
          respectDoNotDisturb: true,
          maxDelay: 120,
        },
        createdAt: new Date(),
      };

      const recipients = ['online-user', 'busy-user'];

      mockGetBulkPresence.mockResolvedValue({
        'online-user': {
          userId: 'online-user',
          status: 'online',
          lastActivity: new Date().toISOString(),
        },
        'busy-user': {
          userId: 'busy-user',
          status: 'busy',
          lastActivity: new Date().toISOString(),
        },
      });

      mockSendImmediateNotification.mockResolvedValue(undefined);
      mockScheduleNotification.mockResolvedValue(undefined);

      await router.sendPresenceAwareNotification(notification, recipients);

      // Should send immediately to online user
      expect(mockSendImmediateNotification).toHaveBeenCalledWith(notification, [
        'online-user',
      ]);

      // Should schedule for busy user (implementation would call scheduleNotificationForLater)
    });
  });

  describe('wedding context integration', () => {
    it('should prioritize wedding day notifications', async () => {
      const weddingDayContext: WeddingPresenceContext = {
        weddingId: 'wedding-123',
        weddingDate: new Date(),
        role: 'photographer',
        isWeddingDay: true,
        priorityLevel: 'critical',
        venueLocation: 'Grand Ballroom',
      };

      const notification: Notification = {
        id: 'wedding-notif',
        title: 'Ceremony Starting Soon',
        message: 'Ceremony begins in 15 minutes',
        type: 'timeline_update',
        urgency: {
          level: 'medium', // Would normally defer for busy users
          deferIfBusy: true,
          respectDoNotDisturb: true,
          maxDelay: 15,
        },
        createdAt: new Date(),
      };

      mockGetBulkPresence.mockResolvedValue({
        'busy-photographer': {
          userId: 'busy-photographer',
          status: 'busy',
          customStatus: 'Equipment setup',
          lastActivity: new Date().toISOString(),
        },
      });

      mockSendImmediateNotification.mockResolvedValue(undefined);

      await router.sendPresenceAwareNotification(
        notification,
        ['busy-photographer'],
        weddingDayContext,
      );

      // Should send immediately despite busy status due to wedding day context
      expect(mockSendImmediateNotification).toHaveBeenCalledWith(notification, [
        'busy-photographer',
      ]);
    });

    it('should respect business hours for wedding professionals', async () => {
      const weddingContext: WeddingPresenceContext = {
        role: 'photographer',
        isWeddingDay: false,
        priorityLevel: 'low',
      };

      // Mock current time to be outside business hours (late night)
      const mockDate = new Date('2024-06-15T23:30:00Z'); // 11:30 PM
      vi.setSystemTime(mockDate);

      const notification: Notification = {
        id: 'low-priority-notif',
        title: 'Portfolio Review',
        message: 'Please review the uploaded photos',
        type: 'general_update',
        urgency: {
          level: 'low',
          deferIfBusy: true,
          respectDoNotDisturb: true,
          maxDelay: 480, // 8 hours
        },
        createdAt: new Date(),
      };

      mockGetBulkPresence.mockResolvedValue({
        photographer: {
          userId: 'photographer',
          status: 'online',
          lastActivity: new Date().toISOString(),
          businessHours: false,
        },
      });

      const filteredRecipients = await router.filterRecipientsByPresence(
        ['photographer'],
        notification.urgency,
        weddingContext,
      );

      // Should defer low priority notifications outside business hours
      expect(filteredRecipients).toEqual([]);

      vi.useRealTimers();
    });
  });

  describe('wedding notification rules', () => {
    it('should return correct urgency for timeline updates', () => {
      const rule = getWeddingNotificationRule('timelineUpdate');

      expect(rule.level).toBe('high');
      expect(rule.deferIfBusy).toBe(false);
      expect(rule.respectDoNotDisturb).toBe(true);
      expect(rule.maxDelay).toBe(30);
    });

    it('should return correct urgency for emergency coordination', () => {
      const rule = getWeddingNotificationRule('emergencyCoordination');

      expect(rule.level).toBe('urgent');
      expect(rule.deferIfBusy).toBe(false);
      expect(rule.respectDoNotDisturb).toBe(false);
      expect(rule.maxDelay).toBe(0);
    });

    it('should return correct urgency for general updates', () => {
      const rule = getWeddingNotificationRule('generalUpdate');

      expect(rule.level).toBe('medium');
      expect(rule.deferIfBusy).toBe(true);
      expect(rule.respectDoNotDisturb).toBe(true);
      expect(rule.maxDelay).toBe(120);
    });
  });

  describe('bulk notification handling', () => {
    it('should process bulk notifications efficiently', async () => {
      const notifications: Notification[] = [
        {
          id: 'bulk-1',
          title: 'Update 1',
          message: 'First update',
          type: 'general_update',
          urgency: getWeddingNotificationRule('generalUpdate'),
          createdAt: new Date(),
        },
        {
          id: 'bulk-2',
          title: 'Update 2',
          message: 'Second update',
          type: 'general_update',
          urgency: getWeddingNotificationRule('generalUpdate'),
          createdAt: new Date(),
        },
      ];

      const recipients = ['user1', 'user2'];

      mockGetBulkPresence.mockResolvedValue({
        user1: {
          userId: 'user1',
          status: 'online',
          lastActivity: new Date().toISOString(),
        },
        user2: {
          userId: 'user2',
          status: 'online',
          lastActivity: new Date().toISOString(),
        },
      });

      mockSendImmediateNotification.mockResolvedValue(undefined);

      await router.sendBulkPresenceAwareNotification(notifications, recipients);

      // Should call sendImmediateNotification for each notification
      expect(mockSendImmediateNotification).toHaveBeenCalledTimes(2);
    });
  });
});
