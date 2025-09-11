import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { TrialEmailScheduler } from '@/lib/trial/TrialEmailScheduler';
import { AnalyticsTracker } from '@/lib/analytics/AnalyticsTracker';
import type { Database } from '@/types/database';

// Mock external services
vi.mock('@/lib/services/email-connector', () => ({
  EmailServiceConnector: {
    getInstance: () => ({
      sendEmail: vi.fn().mockResolvedValue({
        message_id: 'test_msg_123',
        status: 'sent',
        delivery_timestamp: new Date().toISOString()
      })
    })
  }
}));

describe('Trial Email Integration Tests', () => {
  let trialEmailScheduler: TrialEmailScheduler;
  let supabase: ReturnType<typeof createClient<Database>>;
  let testUserId: string;

  beforeEach(async () => {
    // Initialize test database connection
    supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    trialEmailScheduler = new TrialEmailScheduler();

    // Create test user
    const { data: user } = await supabase
      .from('user_profiles')
      .insert({
        email: 'test@example.com',
        full_name: 'Test User',
        user_type: 'supplier'
      })
      .select()
      .single();

    testUserId = user.id;
  });

  afterEach(async () => {
    // Cleanup test data
    await supabase
      .from('trial_email_schedules')
      .delete()
      .eq('user_id', testUserId);

    await supabase
      .from('email_analytics')
      .delete()
      .eq('user_id', testUserId);

    await supabase
      .from('user_profiles')
      .delete()
      .eq('id', testUserId);
  });

  it('should schedule welcome email on trial start', async () => {
    const result = await trialEmailScheduler.scheduleTrialEmail(
      'trial_started',
      {
        userId: testUserId,
        email: 'test@example.com',
        fullName: 'Test User',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planType: 'professional'
      }
    );

    expect(result.success).toBe(true);
    expect(result.scheduleId).toBeDefined();

    // Verify email was scheduled in database
    const { data: schedule } = await supabase
      .from('trial_email_schedules')
      .select()
      .eq('user_id', testUserId)
      .eq('email_type', 'welcome')
      .single();

    expect(schedule).toBeDefined();
    expect(schedule.status).toBe('scheduled');
  });

  it('should handle extension confirmation flow', async () => {
    // First schedule a trial ending reminder
    await trialEmailScheduler.scheduleTrialEmail(
      'trial_ending',
      {
        userId: testUserId,
        email: 'test@example.com',
        fullName: 'Test User',
        trialStartDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        trialEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        planType: 'professional'
      }
    );

    // Then confirm extension
    const extensionResult = await trialEmailScheduler.scheduleTrialEmail(
      'extension_confirmed',
      {
        userId: testUserId,
        email: 'test@example.com',
        fullName: 'Test User',
        trialStartDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        trialEndDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        planType: 'professional'
      }
    );

    expect(extensionResult.success).toBe(true);

    // Verify analytics tracked both events
    const { data: analytics } = await supabase
      .from('email_analytics')
      .select()
      .eq('user_id', testUserId);

    expect(analytics.length).toBeGreaterThan(0);
  });

  it('should track email analytics end-to-end', async () => {
    const analyticsTracker = new AnalyticsTracker();
    
    // Schedule and track trial email
    const result = await trialEmailScheduler.scheduleTrialEmail(
      'trial_reminder',
      {
        userId: testUserId,
        email: 'test@example.com',
        fullName: 'Test User',
        trialStartDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        trialEndDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        planType: 'professional'
      }
    );

    expect(result.success).toBe(true);

    // Simulate email sent
    await analyticsTracker.trackTrialEmail('sent', {
      userId: testUserId,
      messageId: 'test_msg_123',
      templateId: 'trial-reminder',
      eventType: 'trial_reminder'
    });

    // Simulate email opened
    await analyticsTracker.trackTrialEmail('opened', {
      userId: testUserId,
      messageId: 'test_msg_123',
      templateId: 'trial-reminder',
      eventType: 'trial_reminder'
    });

    // Verify analytics were recorded
    const { data: analytics } = await supabase
      .from('email_analytics')
      .select()
      .eq('user_id', testUserId)
      .eq('message_id', 'test_msg_123');

    expect(analytics.length).toBeGreaterThan(0);
    
    const sentEvent = analytics.find(a => a.action === 'sent');
    const openedEvent = analytics.find(a => a.action === 'opened');
    
    expect(sentEvent).toBeDefined();
    expect(openedEvent).toBeDefined();
  });

  it('should handle bulk email scheduling', async () => {
    const userContexts = Array.from({ length: 5 }, (_, i) => ({
      userId: `test_user_${i}`,
      email: `test${i}@example.com`,
      fullName: `Test User ${i}`,
      trialStartDate: new Date(),
      trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      planType: 'professional' as const
    }));

    const results = await Promise.all(
      userContexts.map(context => 
        trialEmailScheduler.scheduleTrialEmail('trial_started', context)
      )
    );

    // All emails should be scheduled successfully
    results.forEach(result => {
      expect(result.success).toBe(true);
    });

    // Verify scheduling rate limit was respected
    const scheduleTimestamps = results.map(r => new Date(r.scheduledFor!));
    for (let i = 1; i < scheduleTimestamps.length; i++) {
      const timeDiff = scheduleTimestamps[i].getTime() - scheduleTimestamps[i-1].getTime();
      expect(timeDiff).toBeGreaterThanOrEqual(100); // At least 100ms between schedules
    }
  });

  it('should handle email service failures gracefully', async () => {
    // Mock email service failure
    vi.mocked(trialEmailScheduler).scheduleTrialEmail = vi.fn()
      .mockRejectedValueOnce(new Error('Email service unavailable'));

    const result = await trialEmailScheduler.scheduleTrialEmail(
      'trial_started',
      {
        userId: testUserId,
        email: 'test@example.com',
        fullName: 'Test User',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planType: 'professional'
      }
    ).catch(error => ({ success: false, error: error.message }));

    expect(result.success).toBe(false);
    expect(result.error).toContain('Email service unavailable');
  });
});