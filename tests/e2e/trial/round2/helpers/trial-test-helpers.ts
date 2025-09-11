/**
 * Trial Test Helpers - WS-167 Round 2
 * Utility functions for trial management testing
 */

import { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class TrialTestHelpers {
  private testUsers: any[] = [];
  private adminUser: any = null;

  async setupTestEnvironment() {
    // Clean up any existing test data
    await this.cleanupAllTestData();
    
    // Create admin user for testing
    this.adminUser = await this.createAdminUser();
  }

  async createTestTrialUser(tenantPrefix = 'default') {
    const timestamp = Date.now();
    const user = {
      id: `trial-${tenantPrefix}-${timestamp}`,
      email: `trial-${tenantPrefix}-${timestamp}@test.wedsync.com`,
      name: `Trial User ${timestamp}`,
      password: 'TestPass123!',
      company: `${tenantPrefix} Wedding Co`,
      trial_start_date: new Date().toISOString(),
      trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      tenant_id: `tenant-${tenantPrefix}`,
      subscription_status: 'trial',
      features_used: [],
      engagement_score: 0
    };

    // Create user in database
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single();

    if (error) {
      console.error('Failed to create test user:', error);
      throw error;
    }

    this.testUsers.push(data);
    return data;
  }

  async createAdminUser() {
    const admin = {
      id: 'admin-test-' + Date.now(),
      email: 'admin@test.wedsync.com',
      name: 'Test Admin',
      password: 'AdminPass123!',
      role: 'admin',
      permissions: ['trial_management', 'user_management', 'billing_management']
    };

    const { data, error } = await supabase
      .from('users')
      .insert([admin])
      .select()
      .single();

    if (error) {
      console.error('Failed to create admin user:', error);
      throw error;
    }

    return data;
  }

  async setTrialExpiration(userId: string, daysRemaining: number) {
    const newEndDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
    
    const { error } = await supabase
      .from('users')
      .update({ trial_end_date: newEndDate.toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update trial expiration:', error);
      throw error;
    }
  }

  async performActivity(page: Page, activity: any) {
    switch (activity.type) {
      case 'create_client':
        await page.click('[data-testid="create-client-button"]');
        await page.fill('[data-testid="client-name"]', activity.data.name);
        if (activity.data.date) {
          await page.fill('[data-testid="wedding-date"]', activity.data.date);
        }
        await page.click('[data-testid="save-client"]');
        await page.waitForSelector('[data-testid^="client-card-"]');
        break;

      case 'create_journey':
        await page.goto('/journey-builder');
        await page.click('[data-testid="new-journey-button"]');
        await page.fill('[data-testid="journey-name"]', activity.data.name);
        await page.click('[data-testid="create-journey"]');
        break;

      case 'view_reports':
        await page.goto('/reports');
        await page.waitForLoadState('networkidle');
        break;

      case 'customize_dashboard':
        await page.goto('/dashboard/customize');
        for (const widget of activity.data.widgets || []) {
          const checkbox = page.locator(`[data-testid="widget-${widget}"]`);
          if (await checkbox.isVisible()) {
            await checkbox.check();
          }
        }
        await page.click('[data-testid="save-dashboard-config"]');
        break;
    }

    // Track activity in localStorage for testing
    await page.evaluate((activityType) => {
      const log = JSON.parse(localStorage.getItem('trial_activity_log') || '[]');
      log.push({
        type: activityType,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('trial_activity_log', JSON.stringify(log));
    }, activity.type);
  }

  async cleanupTestUser(user: any) {
    if (!user) return;

    // Delete user and related data
    const tables = ['clients', 'journeys', 'activities', 'users'];
    
    for (const table of tables) {
      const field = table === 'users' ? 'id' : 'user_id';
      await supabase
        .from(table)
        .delete()
        .eq(field, user.id);
    }

    // Remove from tracked users
    this.testUsers = this.testUsers.filter(u => u.id !== user.id);
  }

  async cleanupAllTestData() {
    // Clean up all test users
    for (const user of this.testUsers) {
      await this.cleanupTestUser(user);
    }
    this.testUsers = [];

    // Clean up admin user
    if (this.adminUser) {
      await this.cleanupTestUser(this.adminUser);
      this.adminUser = null;
    }

    // Clean up test data patterns
    await supabase
      .from('users')
      .delete()
      .like('email', '%@test.wedsync.com');
  }

  getAdminUser() {
    return this.adminUser;
  }

  async verifyTrialLimits(page: Page, limits: any) {
    const checks = [
      { limit: 'max_clients', selector: '[data-testid="client-limit"]' },
      { limit: 'max_journeys', selector: '[data-testid="journey-limit"]' },
      { limit: 'max_automations', selector: '[data-testid="automation-limit"]' }
    ];

    for (const check of checks) {
      if (limits[check.limit]) {
        const element = page.locator(check.selector);
        if (await element.isVisible()) {
          const text = await element.textContent();
          const current = parseInt(text?.match(/\d+/)?.[0] || '0');
          if (current >= limits[check.limit]) {
            return { limited: true, feature: check.limit };
          }
        }
      }
    }

    return { limited: false };
  }

  async simulateHighEngagement(page: Page, userId: string) {
    // Simulate activities that increase engagement score
    const highValueActivities = [
      { action: 'complete_onboarding', points: 20 },
      { action: 'create_first_client', points: 15 },
      { action: 'setup_automation', points: 25 },
      { action: 'invite_team_member', points: 10 },
      { action: 'customize_branding', points: 10 }
    ];

    for (const activity of highValueActivities) {
      await supabase
        .from('trial_activities')
        .insert({
          user_id: userId,
          activity_type: activity.action,
          engagement_points: activity.points,
          created_at: new Date().toISOString()
        });
    }

    // Update engagement score
    const totalPoints = highValueActivities.reduce((sum, a) => sum + a.points, 0);
    await supabase
      .from('users')
      .update({ engagement_score: totalPoints })
      .eq('id', userId);
  }
}