/**
 * WS-204: Activity Tracker Service Tests
 *
 * Comprehensive test suite for the ActivityTracker service covering:
 * - Page view tracking with device information
 * - User interaction logging with wedding context
 * - Activity report generation for organizations
 * - Wedding-specific activity insights
 * - Privacy-compliant analytics
 * - Batch processing optimization
 * - Enterprise compliance features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { ActivityTracker } from '../activity-tracker';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

// Mock Next.js headers and cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

describe('ActivityTracker', () => {
  let activityTracker: ActivityTracker;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabaseClient = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() =>
                    Promise.resolve({ data: [], error: null }),
                  ),
                })),
              })),
            })),
          })),
        })),
        upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({
            data: { user: { id: 'test-user-id' } },
            error: null,
          }),
        ),
      },
    };

    (createClient as any).mockReturnValue(mockSupabaseClient);

    // Create ActivityTracker instance
    activityTracker = new ActivityTracker();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Page View Tracking', () => {
    it('should track page view with device information', async () => {
      const userId = 'user-123';
      const page = '/dashboard/weddings';
      const deviceInfo = {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        screenResolution: '390x844',
        platform: 'iPhone',
        language: 'en-US',
        timezone: 'America/New_York',
        isMobile: true,
      };

      await activityTracker.trackPageView(userId, page, deviceInfo);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'presence_activity_logs',
      );
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith({
        user_id: userId,
        activity_type: 'page_view',
        page_path: page,
        metadata: {
          device: deviceInfo,
          timestamp: expect.any(String),
          sessionId: expect.any(String),
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle mobile device detection correctly', async () => {
      const mobileDeviceInfo = {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        screenResolution: '375x667',
        platform: 'iPhone',
        language: 'en-US',
        timezone: 'America/New_York',
        isMobile: true,
      };

      await activityTracker.trackPageView(
        'user-123',
        '/mobile-page',
        mobileDeviceInfo,
      );

      const insertCall = mockSupabaseClient.from().insert.mock.calls[0][0];
      expect(insertCall.metadata.device.isMobile).toBe(true);
      expect(insertCall.metadata.device.platform).toBe('iPhone');
    });

    it('should track different page types correctly', async () => {
      const userId = 'user-123';
      const deviceInfo = { isMobile: false, platform: 'desktop' };

      // Test wedding page
      await activityTracker.trackPageView(
        userId,
        '/weddings/wedding-123',
        deviceInfo,
      );

      // Test client page
      await activityTracker.trackPageView(
        userId,
        '/clients/client-456',
        deviceInfo,
      );

      // Test settings page
      await activityTracker.trackPageView(userId, '/settings', deviceInfo);

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(3);
    });
  });

  describe('User Interaction Tracking', () => {
    it('should track form submissions with wedding context', async () => {
      const userId = 'user-123';
      const interactionType = 'form_submission';
      const context = {
        formType: 'wedding_details',
        weddingId: 'wedding-456',
        fieldsModified: ['venue', 'date', 'guest_count'],
        validationErrors: [],
        submissionTime: 2.5,
      };

      await activityTracker.trackUserInteraction(
        userId,
        interactionType,
        context,
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'presence_activity_logs',
      );
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith({
        user_id: userId,
        activity_type: interactionType,
        metadata: {
          ...context,
          timestamp: expect.any(String),
          sessionId: expect.any(String),
        },
        timestamp: expect.any(String),
      });
    });

    it('should track button clicks with interaction details', async () => {
      const context = {
        buttonId: 'save-wedding-btn',
        buttonText: 'Save Wedding Details',
        location: '/weddings/123',
        weddingId: 'wedding-123',
      };

      await activityTracker.trackUserInteraction(
        'user-123',
        'button_click',
        context,
      );

      const insertCall = mockSupabaseClient.from().insert.mock.calls[0][0];
      expect(insertCall.activity_type).toBe('button_click');
      expect(insertCall.metadata.buttonId).toBe('save-wedding-btn');
      expect(insertCall.metadata.weddingId).toBe('wedding-123');
    });

    it('should track file uploads with wedding context', async () => {
      const context = {
        fileType: 'image/jpeg',
        fileSize: 2048576, // 2MB
        fileName: 'wedding-venue-photo.jpg',
        weddingId: 'wedding-123',
        uploadDuration: 3.2,
        compressionApplied: true,
      };

      await activityTracker.trackUserInteraction(
        'user-123',
        'file_upload',
        context,
      );

      const insertCall = mockSupabaseClient.from().insert.mock.calls[0][0];
      expect(insertCall.metadata.fileSize).toBe(2048576);
      expect(insertCall.metadata.uploadDuration).toBe(3.2);
    });
  });

  describe('Activity Report Generation', () => {
    it('should generate organization activity report', async () => {
      const organizationId = 'org-123';
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      // Mock activity data
      const mockActivityData = [
        {
          user_id: 'user-1',
          activity_type: 'page_view',
          page_path: '/dashboard',
          timestamp: '2025-01-15T10:00:00Z',
          metadata: { device: { isMobile: false } },
        },
        {
          user_id: 'user-2',
          activity_type: 'form_submission',
          page_path: '/weddings/123',
          timestamp: '2025-01-16T14:30:00Z',
          metadata: { weddingId: 'wedding-123' },
        },
      ];

      mockSupabaseClient.from().select.mockReturnValue({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: mockActivityData,
                  error: null,
                }),
              ),
            })),
          })),
        })),
      });

      const report = await activityTracker.generateActivityReport(
        organizationId,
        dateRange,
      );

      expect(report).toHaveProperty('organizationId', organizationId);
      expect(report).toHaveProperty('dateRange');
      expect(report).toHaveProperty('totalUsers');
      expect(report).toHaveProperty('totalSessions');
      expect(report).toHaveProperty('pageViews');
      expect(report).toHaveProperty('mostActiveUsers');
      expect(report).toHaveProperty('deviceBreakdown');
      expect(report).toHaveProperty('dailyTrends');
    });

    it('should calculate activity metrics correctly', async () => {
      const mockData = [
        {
          user_id: 'user-1',
          activity_type: 'page_view',
          timestamp: '2025-01-15T10:00:00Z',
          metadata: { device: { isMobile: true } },
        },
        {
          user_id: 'user-1',
          activity_type: 'page_view',
          timestamp: '2025-01-15T10:05:00Z',
          metadata: { device: { isMobile: true } },
        },
        {
          user_id: 'user-2',
          activity_type: 'form_submission',
          timestamp: '2025-01-15T11:00:00Z',
          metadata: { device: { isMobile: false } },
        },
        {
          user_id: 'user-1',
          activity_type: 'button_click',
          timestamp: '2025-01-16T09:00:00Z',
          metadata: { device: { isMobile: true } },
        },
      ];

      mockSupabaseClient
        .from()
        .select()
        .eq()
        .gte()
        .lte()
        .order.mockResolvedValue({
          data: mockData,
          error: null,
        });

      const report = await activityTracker.generateActivityReport('org-123', {
        start: new Date('2025-01-15'),
        end: new Date('2025-01-16'),
      });

      expect(report.totalUsers).toBe(2);
      expect(report.deviceBreakdown.mobile).toBeGreaterThan(0);
      expect(report.deviceBreakdown.desktop).toBeGreaterThan(0);
    });
  });

  describe('Wedding Activity Insights', () => {
    it('should generate wedding-specific activity insights', async () => {
      const weddingId = 'wedding-123';
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const mockWeddingData = [
        {
          user_id: 'couple-user',
          activity_type: 'page_view',
          page_path: '/wedding/123/timeline',
          timestamp: '2025-01-15T10:00:00Z',
          metadata: { weddingId, userRole: 'couple' },
        },
        {
          user_id: 'vendor-user',
          activity_type: 'form_submission',
          page_path: '/wedding/123/services',
          timestamp: '2025-01-15T14:00:00Z',
          metadata: {
            weddingId,
            userRole: 'vendor',
            serviceType: 'photography',
          },
        },
      ];

      mockSupabaseClient
        .from()
        .select()
        .eq()
        .gte()
        .lte()
        .order.mockResolvedValue({
          data: mockWeddingData,
          error: null,
        });

      const insights = await activityTracker.generateWeddingActivityInsights(
        weddingId,
        dateRange,
      );

      expect(insights).toHaveProperty('weddingId', weddingId);
      expect(insights).toHaveProperty('collaborators');
      expect(insights).toHaveProperty('activityByRole');
      expect(insights).toHaveProperty('timelineInteractions');
      expect(insights).toHaveProperty('vendorEngagement');
      expect(insights).toHaveProperty('coupleActivity');
      expect(insights).toHaveProperty('weddingProgress');
    });

    it('should track vendor engagement patterns', async () => {
      const weddingData = [
        {
          user_id: 'vendor-1',
          metadata: {
            userRole: 'vendor',
            serviceType: 'photography',
            weddingId: 'wedding-123',
          },
        },
        {
          user_id: 'vendor-1',
          metadata: {
            userRole: 'vendor',
            serviceType: 'photography',
            weddingId: 'wedding-123',
          },
        },
        {
          user_id: 'vendor-2',
          metadata: {
            userRole: 'vendor',
            serviceType: 'catering',
            weddingId: 'wedding-123',
          },
        },
        {
          user_id: 'couple-1',
          metadata: { userRole: 'couple', weddingId: 'wedding-123' },
        },
      ];

      mockSupabaseClient
        .from()
        .select()
        .eq()
        .gte()
        .lte()
        .order.mockResolvedValue({
          data: weddingData,
          error: null,
        });

      const insights = await activityTracker.generateWeddingActivityInsights(
        'wedding-123',
        {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
      );

      expect(insights.vendorEngagement).toHaveProperty('totalVendors');
      expect(insights.vendorEngagement).toHaveProperty('serviceTypes');
      expect(insights.vendorEngagement.serviceTypes).toContain('photography');
      expect(insights.vendorEngagement.serviceTypes).toContain('catering');
    });
  });

  describe('User Activity Summary', () => {
    it('should generate user activity summary with privacy controls', async () => {
      const userId = 'user-123';
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const mockUserData = [
        {
          activity_type: 'page_view',
          timestamp: '2025-01-15T10:00:00Z',
          metadata: { page_path: '/dashboard', device: { isMobile: false } },
        },
        {
          activity_type: 'form_submission',
          timestamp: '2025-01-16T14:00:00Z',
          metadata: { formType: 'wedding_details', weddingId: 'wedding-123' },
        },
      ];

      mockSupabaseClient
        .from()
        .select()
        .eq()
        .gte()
        .lte()
        .order()
        .limit.mockResolvedValue({
          data: mockUserData,
          error: null,
        });

      const summary = await activityTracker.generateUserActivitySummary(
        userId,
        dateRange,
      );

      expect(summary).toHaveProperty('userId', userId);
      expect(summary).toHaveProperty('totalActivities');
      expect(summary).toHaveProperty('sessionCount');
      expect(summary).toHaveProperty('averageSessionDuration');
      expect(summary).toHaveProperty('mostUsedFeatures');
      expect(summary).toHaveProperty('devicePreference');
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple activities in batch', async () => {
      const activities = [
        { userId: 'user-1', type: 'page_view', data: { page: '/dashboard' } },
        {
          userId: 'user-2',
          type: 'form_submission',
          data: { form: 'wedding_details' },
        },
        {
          userId: 'user-3',
          type: 'button_click',
          data: { button: 'save-btn' },
        },
      ];

      await activityTracker.batchTrackActivities(activities);

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: 'user-1',
            activity_type: 'page_view',
          }),
          expect.objectContaining({
            user_id: 'user-2',
            activity_type: 'form_submission',
          }),
          expect.objectContaining({
            user_id: 'user-3',
            activity_type: 'button_click',
          }),
        ]),
      );
    });

    it('should handle batch processing errors gracefully', async () => {
      const activities = [
        { userId: 'user-1', type: 'page_view', data: { page: '/dashboard' } },
      ];

      mockSupabaseClient.from().insert.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(
        activityTracker.batchTrackActivities(activities),
      ).rejects.toThrow('Failed to batch track activities');
    });
  });

  describe('Privacy Compliance', () => {
    it('should sanitize sensitive data from activity logs', async () => {
      const sensitiveContext = {
        email: 'user@example.com',
        phone: '+1234567890',
        creditCard: '4111-1111-1111-1111',
        personalNote: 'Private wedding notes',
        weddingId: 'wedding-123',
      };

      await activityTracker.trackUserInteraction(
        'user-123',
        'form_submission',
        sensitiveContext,
      );

      const insertCall = mockSupabaseClient.from().insert.mock.calls[0][0];

      // Sensitive data should be sanitized
      expect(insertCall.metadata.email).toBeUndefined();
      expect(insertCall.metadata.phone).toBeUndefined();
      expect(insertCall.metadata.creditCard).toBeUndefined();

      // Non-sensitive data should remain
      expect(insertCall.metadata.weddingId).toBe('wedding-123');
    });

    it('should respect user privacy settings', async () => {
      // Mock user with privacy settings
      const userId = 'privacy-conscious-user';

      // User has opted out of detailed activity tracking
      await activityTracker.trackUserInteraction(userId, 'page_view', {
        privacyLevel: 'minimal',
        page: '/sensitive-page',
      });

      const insertCall = mockSupabaseClient.from().insert.mock.calls[0][0];

      // Should store minimal information when privacy level is set
      expect(insertCall.metadata.page).toBeUndefined();
      expect(insertCall.activity_type).toBe('page_view');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from().insert.mockResolvedValue({
        data: null,
        error: {
          message: 'Database connection failed',
          code: 'CONNECTION_ERROR',
        },
      });

      await expect(
        activityTracker.trackPageView('user-123', '/dashboard', {
          isMobile: false,
        }),
      ).rejects.toThrow('Failed to track page view');
    });

    it('should handle malformed activity data', async () => {
      const malformedData = {
        userId: null, // Invalid user ID
        type: 'invalid_type',
        data: undefined,
      };

      await expect(
        activityTracker.trackUserInteraction(
          malformedData.userId,
          malformedData.type,
          malformedData.data,
        ),
      ).rejects.toThrow();
    });

    it('should handle report generation errors', async () => {
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .gte()
        .lte()
        .order.mockResolvedValue({
          data: null,
          error: { message: 'Query timeout', code: 'TIMEOUT' },
        });

      await expect(
        activityTracker.generateActivityReport('org-123', {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        }),
      ).rejects.toThrow('Failed to generate activity report');
    });
  });

  describe('Wedding Industry Specific Features', () => {
    it('should track wedding milestone activities', async () => {
      const milestoneActivities = [
        {
          milestone: 'venue_booked',
          weddingId: 'wedding-123',
          date: '2025-06-15',
        },
        {
          milestone: 'photographer_hired',
          weddingId: 'wedding-123',
          vendorId: 'photographer-456',
        },
        {
          milestone: 'invitations_sent',
          weddingId: 'wedding-123',
          guestCount: 150,
        },
      ];

      for (const milestone of milestoneActivities) {
        await activityTracker.trackUserInteraction(
          'couple-123',
          'milestone_completed',
          milestone,
        );
      }

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(3);

      const calls = mockSupabaseClient.from().insert.mock.calls;
      expect(calls[0][0].metadata.milestone).toBe('venue_booked');
      expect(calls[1][0].metadata.milestone).toBe('photographer_hired');
      expect(calls[2][0].metadata.milestone).toBe('invitations_sent');
    });

    it('should track vendor-couple interactions', async () => {
      const interactionContext = {
        weddingId: 'wedding-123',
        vendorId: 'vendor-456',
        coupleId: 'couple-789',
        interactionType: 'message_sent',
        messageLength: 245,
        hasAttachment: true,
      };

      await activityTracker.trackUserInteraction(
        'vendor-456',
        'vendor_couple_interaction',
        interactionContext,
      );

      const insertCall = mockSupabaseClient.from().insert.mock.calls[0][0];
      expect(insertCall.metadata.interactionType).toBe('message_sent');
      expect(insertCall.metadata.weddingId).toBe('wedding-123');
      expect(insertCall.metadata.hasAttachment).toBe(true);
    });

    it('should generate wedding progress insights', async () => {
      const weddingActivities = [
        {
          metadata: {
            milestone: 'venue_booked',
            timestamp: '2025-01-01T00:00:00Z',
          },
        },
        {
          metadata: {
            milestone: 'photographer_hired',
            timestamp: '2025-01-15T00:00:00Z',
          },
        },
        {
          metadata: {
            milestone: 'catering_booked',
            timestamp: '2025-02-01T00:00:00Z',
          },
        },
      ];

      mockSupabaseClient
        .from()
        .select()
        .eq()
        .gte()
        .lte()
        .order.mockResolvedValue({
          data: weddingActivities,
          error: null,
        });

      const insights = await activityTracker.generateWeddingActivityInsights(
        'wedding-123',
        {
          start: new Date('2025-01-01'),
          end: new Date('2025-12-31'),
        },
      );

      expect(insights.weddingProgress).toHaveProperty('milestonesCompleted');
      expect(insights.weddingProgress).toHaveProperty('progressPercentage');
      expect(insights.weddingProgress).toHaveProperty('timeline');
      expect(insights.weddingProgress.milestonesCompleted).toBeGreaterThan(0);
    });
  });
});
