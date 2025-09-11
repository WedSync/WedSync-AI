import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { TrialEmailScheduler } from '@/lib/trial/TrialEmailScheduler';
import { AnalyticsTracker } from '@/lib/analytics/AnalyticsTracker';

// Mock dependencies
vi.mock('@supabase/supabase-js');
vi.mock('@/lib/analytics/AnalyticsTracker');
vi.mock('@/lib/services/email-connector');

describe('TrialEmailScheduler Unit Tests', () => {
  let trialEmailScheduler: TrialEmailScheduler;
  let mockSupabase: any;
  let mockAnalytics: Mock;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      functions: {
        invoke: vi.fn()
      }
    };

    // Mock analytics tracker
    mockAnalytics = vi.mocked(AnalyticsTracker.prototype.trackTrialEmail);
    mockAnalytics.mockResolvedValue(undefined);

    trialEmailScheduler = new TrialEmailScheduler();
  });

  describe('Email Template Selection', () => {
    it('should select correct template for trial_started event', () => {
      const template = trialEmailScheduler.getEmailTemplate('trial_started');
      
      expect(template.id).toBe('trial-welcome');
      expect(template.subject).toContain('Welcome');
      expect(template.category).toBe('journey');
    });

    it('should select correct template for trial_ending event', () => {
      const template = trialEmailScheduler.getEmailTemplate('trial_ending');
      
      expect(template.id).toBe('trial-ending');
      expect(template.subject).toContain('ending');
      expect(template.category).toBe('journey');
    });

    it('should select correct template for extension_confirmed event', () => {
      const template = trialEmailScheduler.getEmailTemplate('extension_confirmed');
      
      expect(template.id).toBe('trial-extended');
      expect(template.subject).toContain('extended');
      expect(template.category).toBe('transactional');
    });
  });

  describe('Scheduling Calculations', () => {
    it('should calculate immediate delivery for trial_started', () => {
      const userContext = {
        userId: 'test-user',
        email: 'test@example.com',
        fullName: 'Test User',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planType: 'professional' as const
      };

      const deliveryTime = trialEmailScheduler.calculateDeliveryTime(
        'trial_started',
        userContext
      );

      const now = new Date();
      const timeDiff = Math.abs(deliveryTime.getTime() - now.getTime());
      expect(timeDiff).toBeLessThan(60000); // Within 1 minute
    });

    it('should calculate correct timing for trial_ending reminder', () => {
      const trialEndDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const userContext = {
        userId: 'test-user',
        email: 'test@example.com',
        fullName: 'Test User',
        trialStartDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        trialEndDate,
        planType: 'professional' as const
      };

      const deliveryTime = trialEmailScheduler.calculateDeliveryTime(
        'trial_ending',
        userContext
      );

      // Should be scheduled for 3 days before trial end
      const expectedTime = new Date(trialEndDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(deliveryTime.getTime() - expectedTime.getTime());
      expect(timeDiff).toBeLessThan(60000); // Within 1 minute tolerance
    });
  });

  describe('Variable Processing', () => {
    it('should process template variables correctly', () => {
      const userContext = {
        userId: 'test-user',
        email: 'test@example.com',
        fullName: 'John Doe',
        trialStartDate: new Date('2025-01-01'),
        trialEndDate: new Date('2025-01-31'),
        planType: 'professional' as const
      };

      const variables = trialEmailScheduler.processTemplateVariables(
        'trial_started',
        userContext
      );

      expect(variables.fullName).toBe('John Doe');
      expect(variables.firstName).toBe('John');
      expect(variables.planType).toBe('professional');
      expect(variables.trialDays).toBe('30');
      expect(variables.trialEndDate).toContain('January 31');
    });

    it('should handle missing user name gracefully', () => {
      const userContext = {
        userId: 'test-user',
        email: 'test@example.com',
        fullName: '',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planType: 'professional' as const
      };

      const variables = trialEmailScheduler.processTemplateVariables(
        'trial_started',
        userContext
      );

      expect(variables.fullName).toBe('');
      expect(variables.firstName).toBe('there');
    });
  });

  describe('Error Handling', () => {
    it('should handle database insertion errors', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Database error'));

      const userContext = {
        userId: 'test-user',
        email: 'test@example.com',
        fullName: 'Test User',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planType: 'professional' as const
      };

      const result = await trialEmailScheduler.scheduleTrialEmail(
        'trial_started',
        userContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

    it('should handle analytics tracking errors gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'schedule-123' }
      });
      
      mockAnalytics.mockRejectedValue(new Error('Analytics service down'));

      const userContext = {
        userId: 'test-user',
        email: 'test@example.com',
        fullName: 'Test User',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planType: 'professional' as const
      };

      // Should still succeed even if analytics fails
      const result = await trialEmailScheduler.scheduleTrialEmail(
        'trial_started',
        userContext
      );

      expect(result.success).toBe(true);
      expect(result.scheduleId).toBe('schedule-123');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting for bulk operations', async () => {
      const mockDelay = vi.fn();
      trialEmailScheduler.applyRateLimit = mockDelay;

      const userContexts = Array.from({ length: 3 }, (_, i) => ({
        userId: `test-user-${i}`,
        email: `test${i}@example.com`,
        fullName: `Test User ${i}`,
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planType: 'professional' as const
      }));

      await Promise.all(
        userContexts.map(context =>
          trialEmailScheduler.scheduleTrialEmail('trial_started', context)
        )
      );

      expect(mockDelay).toHaveBeenCalledTimes(3);
    });
  });

  describe('Email Content Generation', () => {
    it('should generate proper email data structure', () => {
      const userContext = {
        userId: 'test-user',
        email: 'test@example.com',
        fullName: 'John Doe',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planType: 'professional' as const
      };

      const emailData = trialEmailScheduler.generateEmailData(
        'trial_started',
        userContext
      );

      expect(emailData.to).toBe('test@example.com');
      expect(emailData.template_id).toBe('trial-welcome');
      expect(emailData.variables.fullName).toBe('John Doe');
      expect(emailData.tracking.enabled).toBe(true);
      expect(emailData.analytics.event_type).toBe('trial_started');
    });

    it('should include proper analytics metadata', () => {
      const userContext = {
        userId: 'test-user',
        email: 'test@example.com',
        fullName: 'John Doe',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planType: 'professional' as const
      };

      const emailData = trialEmailScheduler.generateEmailData(
        'extension_confirmed',
        userContext
      );

      expect(emailData.analytics.user_id).toBe('test-user');
      expect(emailData.analytics.event_type).toBe('extension_confirmed');
      expect(emailData.analytics.template_id).toBe('trial-extended');
      expect(emailData.analytics.user_segment).toBe('trial_extension');
    });
  });
});