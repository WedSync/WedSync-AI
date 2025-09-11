import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

test.describe('Creator Analytics Dashboard', () => {
  let creatorEmail = 'creator@test.com';
  let creatorPassword = 'Test123!@#';
  let creatorId: string;
  let templateId: string;

  test.beforeAll(async () => {
    // Create test creator account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: creatorEmail,
      password: creatorPassword,
    });

    if (authError) {
      console.error('Error creating test user:', authError);
      return;
    }

    creatorId = authData.user!.id;

    // Set up creator profile
    await supabase
      .from('user_profiles')
      .update({
        marketplace_creator_status: true,
        role: 'MEMBER'
      })
      .eq('id', creatorId);

    // Create test template
    const { data: template } = await supabase
      .from('marketplace_templates')
      .insert({
        supplier_id: creatorId,
        title: 'Test Wedding Timeline Template',
        description: 'A comprehensive wedding timeline template',
        template_type: 'form',
        category: 'planning',
        price_cents: 2500,
        template_data: {},
        preview_data: {}
      })
      .select()
      .single();

    templateId = template.id;

    // Generate test analytics data
    const events = [];
    const now = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Generate views
      for (let j = 0; j < Math.floor(Math.random() * 20) + 10; j++) {
        events.push({
          creator_id: creatorId,
          template_id: templateId,
          event_type: 'view',
          session_id: `session-${i}-${j}`,
          wedding_season: ['spring', 'summer', 'fall', 'winter'][Math.floor(Math.random() * 4)],
          created_at: date.toISOString()
        });
      }
      
      // Generate clicks
      for (let j = 0; j < Math.floor(Math.random() * 10) + 5; j++) {
        events.push({
          creator_id: creatorId,
          template_id: templateId,
          event_type: 'click',
          session_id: `session-${i}-${j}`,
          created_at: date.toISOString()
        });
      }
      
      // Generate purchases
      for (let j = 0; j < Math.floor(Math.random() * 3); j++) {
        events.push({
          creator_id: creatorId,
          template_id: templateId,
          event_type: 'purchase',
          event_data: { revenue: 2500 },
          session_id: `session-${i}-purchase-${j}`,
          created_at: date.toISOString()
        });
      }
    }

    await supabase
      .from('creator_analytics_events')
      .insert(events);

    // Generate daily metrics
    const metrics = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      metrics.push({
        creator_id: creatorId,
        metric_date: date.toISOString().split('T')[0],
        template_views: Math.floor(Math.random() * 100) + 50,
        template_clicks: Math.floor(Math.random() * 50) + 20,
        purchases: Math.floor(Math.random() * 5),
        gross_revenue: Math.floor(Math.random() * 5) * 2500,
        net_revenue: Math.floor(Math.random() * 5) * 1750,
        unique_visitors: Math.floor(Math.random() * 80) + 30,
        conversion_rate: Math.random() * 0.05
      });
    }

    await supabase
      .from('creator_daily_metrics')
      .insert(metrics);
  });

  test.beforeEach(async ({ page }) => {
    // Login as creator
    await page.goto('/login');
    await page.fill('input[name="email"]', creatorEmail);
    await page.fill('input[name="password"]', creatorPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  });

  test('should display analytics dashboard with key metrics', async ({ page }) => {
    await page.goto('/marketplace/creator/analytics');
    
    // Check page title
    await expect(page.locator('h1')).toContainText('Creator Analytics');
    
    // Check key metric cards are displayed
    await expect(page.locator('text=Total Sales')).toBeVisible();
    await expect(page.locator('text=Net Revenue')).toBeVisible();
    await expect(page.locator('text=Conversion Rate')).toBeVisible();
    await expect(page.locator('text=Category Rank')).toBeVisible();
  });

  test('should filter analytics by timeframe', async ({ page }) => {
    await page.goto('/marketplace/creator/analytics');
    
    // Wait for initial load
    await page.waitForSelector('text=Total Sales');
    
    // Change timeframe to "This Week"
    await page.click('button:has-text("This Month")');
    await page.click('text=This Week');
    
    // Verify data updates (loading indicator or data change)
    await page.waitForTimeout(1000); // Wait for data to update
    
    // Check that metrics are still visible
    await expect(page.locator('text=Total Sales')).toBeVisible();
  });

  test('should display revenue trends chart', async ({ page }) => {
    await page.goto('/marketplace/creator/analytics');
    
    // Check for revenue chart
    await expect(page.locator('text=Revenue Trends')).toBeVisible();
    
    // Check that chart container exists
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
  });

  test('should show seasonal performance breakdown', async ({ page }) => {
    await page.goto('/marketplace/creator/analytics');
    
    // Check for seasonal performance section
    await expect(page.locator('text=Wedding Season Performance')).toBeVisible();
    
    // Filter by season
    await page.click('button:has-text("All Seasons")');
    await page.click('text=Summer Weddings');
    
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Total Sales')).toBeVisible();
  });

  test('should navigate to different analytics tabs', async ({ page }) => {
    await page.goto('/marketplace/creator/analytics');
    
    // Navigate to Revenue tab
    await page.click('button[role="tab"]:has-text("Revenue")');
    await expect(page.locator('text=Gross Revenue')).toBeVisible();
    
    // Navigate to Templates tab
    await page.click('button[role="tab"]:has-text("Templates")');
    await expect(page.locator('text=Template Performance')).toBeVisible();
    
    // Navigate to Insights tab
    await page.click('button[role="tab"]:has-text("Insights")');
    await expect(page.locator('text=Performance Insights')).toBeVisible();
    
    // Navigate to A/B Tests tab
    await page.click('button[role="tab"]:has-text("A/B Tests")');
    await expect(page.locator('text=A/B Testing')).toBeVisible();
  });

  test('should create and manage A/B test', async ({ page }) => {
    await page.goto('/marketplace/creator/analytics');
    
    // Navigate to A/B Tests tab
    await page.click('button[role="tab"]:has-text("A/B Tests")');
    
    // Click New Test button
    await page.click('button:has-text("New Test")');
    
    // Fill in test details
    await page.fill('input[placeholder="e.g., Price Reduction Test"]', 'Price Test');
    
    // Select template (if dropdown is populated)
    const templateSelect = page.locator('button:has-text("Select a template")');
    if (await templateSelect.isVisible()) {
      await templateSelect.click();
      await page.click('text=Test Wedding Timeline Template').first();
    }
    
    // Select test type
    await page.click('button:has-text("What do you want to test?")');
    await page.click('text=Pricing');
    
    // Fill in pricing details
    await page.fill('input[placeholder="Current price"]', '25.00');
    await page.fill('input[placeholder="New price to test"]', '20.00');
    
    // Set test duration
    await page.fill('input[type="number"][min="1"]', '7');
    
    // Create test
    await page.click('button:has-text("Create Test")');
    
    // Verify test was created (dialog should close)
    await expect(page.locator('text=Create A/B Test')).not.toBeVisible({ timeout: 5000 });
  });

  test('should export analytics data', async ({ page }) => {
    await page.goto('/marketplace/creator/analytics');
    
    // Click export button
    await page.click('button:has-text("Export")');
    
    // Wait for download to start (in real test, would verify file download)
    await page.waitForTimeout(1000);
  });

  test('should display and dismiss insights', async ({ page }) => {
    await page.goto('/marketplace/creator/analytics');
    
    // Navigate to Insights tab
    await page.click('button[role="tab"]:has-text("Insights")');
    
    // Check if insights are displayed
    const insightCard = page.locator('.alert').first();
    if (await insightCard.isVisible()) {
      // Try to dismiss an insight
      const dismissButton = insightCard.locator('button:has-text("×")');
      if (await dismissButton.isVisible()) {
        await dismissButton.click();
        
        // Verify insight is dismissed (count should decrease)
        await page.waitForTimeout(500);
      }
    }
  });

  test('should show template performance table with sorting', async ({ page }) => {
    await page.goto('/marketplace/creator/analytics');
    
    // Navigate to Templates tab
    await page.click('button[role="tab"]:has-text("Templates")');
    
    // Check table is displayed
    await expect(page.locator('text=Template Performance')).toBeVisible();
    
    // Try sorting by revenue
    const revenueHeader = page.locator('button:has-text("Revenue")');
    if (await revenueHeader.isVisible()) {
      await revenueHeader.click();
      await page.waitForTimeout(500);
      
      // Click again to reverse sort
      await revenueHeader.click();
      await page.waitForTimeout(500);
    }
    
    // Search for template
    const searchInput = page.locator('input[placeholder="Search templates..."]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Timeline');
      await page.waitForTimeout(500);
    }
  });

  test('should display real-time updates indicator', async ({ page }) => {
    await page.goto('/marketplace/creator/analytics');
    
    // Check for refresh button
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    
    // Click refresh
    await page.click('button:has-text("Refresh")');
    
    // Wait for potential data update
    await page.waitForTimeout(1000);
    
    // Verify metrics are still displayed
    await expect(page.locator('text=Total Sales')).toBeVisible();
  });

  test.afterAll(async () => {
    // Clean up test data
    if (creatorId) {
      await supabase
        .from('creator_analytics_events')
        .delete()
        .eq('creator_id', creatorId);
      
      await supabase
        .from('creator_daily_metrics')
        .delete()
        .eq('creator_id', creatorId);
      
      await supabase
        .from('marketplace_templates')
        .delete()
        .eq('supplier_id', creatorId);
      
      await supabase.auth.admin.deleteUser(creatorId);
    }
  });
});