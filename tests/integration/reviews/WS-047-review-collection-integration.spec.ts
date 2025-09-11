/**
 * WS-047 Review Collection System - Integration Tests
 * Comprehensive Playwright integration tests for review platform integrations
 * 
 * Tests OAuth flows, webhook processing, email automation, and platform management
 */

import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  testSupplier: {
    id: 'test-supplier-123',
    email: 'supplier@test.com',
    businessName: 'Test Wedding Photography',
  },
  testCouple: {
    id: 'test-couple-456',
    email: 'couple@test.com',
    partner1Name: 'Sarah',
    partner2Name: 'Mike',
  },
  testWedding: {
    id: 'test-wedding-789',
    date: '2025-06-15',
  },
};

// Supabase client for test data setup/cleanup
const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey);

test.describe('WS-047 Review Collection System Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Setup test data
    await setupTestData();
    
    // Navigate to login and authenticate as supplier
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email"]', TEST_CONFIG.testSupplier.email);
    await page.fill('[data-testid="password"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test.afterEach(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  test.describe('Google Business Profile Integration', () => {
    
    test('should initiate Google Business OAuth flow', async ({ page, context }) => {
      // Navigate to integrations page
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/integrations`);
      
      // Click connect Google Business Profile
      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        page.click('[data-testid="connect-google-business"]')
      ]);
      
      // Verify OAuth URL structure
      expect(popup.url()).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(popup.url()).toContain('client_id=');
      expect(popup.url()).toContain('scope=');
      expect(popup.url()).toContain('code_challenge=');
      expect(popup.url()).toContain('code_challenge_method=S256');
      
      // Close popup
      await popup.close();
    });
    
    test('should handle Google Business OAuth callback', async ({ page }) => {
      // Mock successful OAuth callback
      const mockAuthCode = 'test_auth_code_123';
      const mockState = 'test_state_456';
      
      // Navigate to callback URL
      await page.goto(`${TEST_CONFIG.baseUrl}/api/auth/google-business/callback?code=${mockAuthCode}&state=${mockState}`);
      
      // Should redirect to success page or dashboard
      await expect(page).toHaveURL(/\/(dashboard|integrations)/);
      
      // Check for success message
      await expect(page.locator('[data-testid="integration-success"]')).toBeVisible({ timeout: 10000 });
    });
    
    test('should display Google Business connection status', async ({ page }) => {
      // Setup mock connected status
      await setupMockGoogleConnection();
      
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/integrations`);
      
      // Check connection status
      await expect(page.locator('[data-testid="google-business-status"]')).toHaveText('Connected');
      await expect(page.locator('[data-testid="google-business-last-sync"]')).toBeVisible();
      
      // Check disconnect button is available
      await expect(page.locator('[data-testid="disconnect-google-business"]')).toBeVisible();
    });

    test('should sync Google Business reviews', async ({ page }) => {
      await setupMockGoogleConnection();
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/reviews`);
      
      // Trigger manual sync
      await page.click('[data-testid="sync-reviews"]');
      
      // Wait for sync completion
      await expect(page.locator('[data-testid="sync-status"]')).toHaveText('Synced successfully', { timeout: 30000 });
      
      // Check reviews are displayed
      await expect(page.locator('[data-testid="review-item"]')).toHaveCount({ min: 1 });
      
      // Verify review data structure
      const firstReview = page.locator('[data-testid="review-item"]').first();
      await expect(firstReview.locator('[data-testid="reviewer-name"]')).toBeVisible();
      await expect(firstReview.locator('[data-testid="rating"]')).toBeVisible();
      await expect(firstReview.locator('[data-testid="review-text"]')).toBeVisible();
    });
  });

  test.describe('Facebook Integration', () => {
    
    test('should initiate Facebook OAuth flow', async ({ page, context }) => {
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/integrations`);
      
      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        page.click('[data-testid="connect-facebook"]')
      ]);
      
      // Verify Facebook OAuth URL
      expect(popup.url()).toContain('facebook.com');
      expect(popup.url()).toContain('oauth');
      expect(popup.url()).toContain('client_id=');
      
      await popup.close();
    });
    
    test('should handle Facebook OAuth callback', async ({ page }) => {
      const mockAuthCode = 'fb_test_code_123';
      const mockState = 'fb_test_state_456';
      
      await page.goto(`${TEST_CONFIG.baseUrl}/api/auth/facebook/callback?code=${mockAuthCode}&state=${mockState}`);
      
      await expect(page).toHaveURL(/\/(dashboard|integrations)/);
      await expect(page.locator('[data-testid="integration-success"]')).toBeVisible({ timeout: 10000 });
    });
    
    test('should display Facebook pages for selection', async ({ page }) => {
      await setupMockFacebookConnection();
      
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/integrations/facebook`);
      
      // Check page selection interface
      await expect(page.locator('[data-testid="facebook-pages"]')).toBeVisible();
      await expect(page.locator('[data-testid="page-item"]')).toHaveCount({ min: 1 });
      
      // Select a page and enable monitoring
      await page.click('[data-testid="page-item"]  [data-testid="enable-monitoring"]');
      
      // Verify webhook subscription setup
      await expect(page.locator('[data-testid="webhook-status"]')).toHaveText('Active', { timeout: 15000 });
    });
  });

  test.describe('Unified Review Management', () => {
    
    test('should display unified review dashboard', async ({ page }) => {
      await setupMockReviews();
      
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/reviews`);
      
      // Check dashboard components
      await expect(page.locator('[data-testid="reviews-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="platform-tabs"]')).toBeVisible();
      
      // Check review metrics
      await expect(page.locator('[data-testid="total-reviews"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-rating"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent-reviews"]')).toBeVisible();
      
      // Test platform filtering
      await page.click('[data-testid="google-tab"]');
      await expect(page.locator('[data-testid="review-item"][data-platform="google"]')).toHaveCount({ min: 1 });
      
      await page.click('[data-testid="facebook-tab"]');
      await expect(page.locator('[data-testid="review-item"][data-platform="facebook"]')).toHaveCount({ min: 1 });
    });
    
    test('should handle review reply functionality', async ({ page }) => {
      await setupMockReviews();
      
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/reviews`);
      
      // Find a review without a reply
      const unrepliedReview = page.locator('[data-testid="review-item"][data-replied="false"]').first();
      
      // Click reply button
      await unrepliedReview.locator('[data-testid="reply-button"]').click();
      
      // Fill reply form
      const replyText = 'Thank you so much for your wonderful review! It was our pleasure to be part of your special day.';
      await page.fill('[data-testid="reply-textarea"]', replyText);
      
      // Submit reply
      await page.click('[data-testid="submit-reply"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="reply-success"]')).toBeVisible({ timeout: 10000 });
      
      // Verify reply appears in UI
      await expect(unrepliedReview.locator('[data-testid="reply-text"]')).toHaveText(replyText);
    });
    
    test('should filter and search reviews', async ({ page }) => {
      await setupMockReviews();
      
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/reviews`);
      
      // Test star rating filter
      await page.selectOption('[data-testid="rating-filter"]', '5');
      await page.waitForTimeout(1000);
      
      const fiveStarReviews = page.locator('[data-testid="review-item"][data-rating="5"]');
      await expect(fiveStarReviews).toHaveCount({ min: 1 });
      
      // Test date range filter
      await page.fill('[data-testid="date-from"]', '2025-01-01');
      await page.fill('[data-testid="date-to"]', '2025-12-31');
      await page.click('[data-testid="apply-filters"]');
      
      // Test search functionality
      await page.fill('[data-testid="review-search"]', 'amazing');
      await page.waitForTimeout(1000);
      
      const searchResults = page.locator('[data-testid="review-item"]');
      await expect(searchResults).toHaveCount({ min: 1 });
      
      // Verify search results contain the search term
      const firstResult = searchResults.first();
      const reviewText = await firstResult.locator('[data-testid="review-text"]').textContent();
      expect(reviewText?.toLowerCase()).toContain('amazing');
    });
  });

  test.describe('Email Automation', () => {
    
    test('should create email template', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/reviews/templates`);
      
      // Click create template
      await page.click('[data-testid="create-template"]');
      
      // Fill template form
      await page.selectOption('[data-testid="template-type"]', 'review_request');
      await page.fill('[data-testid="template-name"]', 'Test Review Request Template');
      await page.fill('[data-testid="subject-line"]', 'How was your experience with {{supplier_name}}?');
      
      // Fill HTML content
      const htmlContent = `
        <p>Dear {{couple_names}},</p>
        <p>We hope your wedding on {{wedding_date}} was everything you dreamed of!</p>
        <p><a href="{{review_url}}">Please share your experience</a></p>
      `;
      await page.fill('[data-testid="html-content"]', htmlContent);
      
      // Fill text content
      const textContent = 'Dear {{couple_names}}, Please share your experience: {{review_url}}';
      await page.fill('[data-testid="text-content"]', textContent);
      
      // Save template
      await page.click('[data-testid="save-template"]');
      
      // Verify success
      await expect(page.locator('[data-testid="template-saved"]')).toBeVisible({ timeout: 10000 });
    });
    
    test('should schedule review request email', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/reviews/automation`);
      
      // Set up automation rule
      await page.click('[data-testid="create-rule"]');
      
      await page.fill('[data-testid="rule-name"]', 'Post-Wedding Review Request');
      await page.selectOption('[data-testid="trigger-event"]', 'wedding_completed');
      await page.fill('[data-testid="delay-days"]', '10');
      await page.selectOption('[data-testid="template-type"]', 'review_request');
      
      // Save rule
      await page.click('[data-testid="save-rule"]');
      
      // Verify rule is active
      await expect(page.locator('[data-testid="rule-active"]')).toBeVisible({ timeout: 10000 });
      
      // Trigger manual schedule for test wedding
      await page.click('[data-testid="trigger-manual"]');
      await page.selectOption('[data-testid="select-wedding"]', TEST_CONFIG.testWedding.id);
      await page.click('[data-testid="schedule-now"]');
      
      // Verify email is scheduled
      await expect(page.locator('[data-testid="email-scheduled"]')).toBeVisible({ timeout: 10000 });
    });
    
    test('should track email delivery status', async ({ page }) => {
      await setupMockEmailRequests();
      
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/reviews/emails`);
      
      // Check email request list
      await expect(page.locator('[data-testid="email-requests"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-item"]')).toHaveCount({ min: 1 });
      
      // Check email status
      const emailItem = page.locator('[data-testid="email-item"]').first();
      await expect(emailItem.locator('[data-testid="email-status"]')).toBeVisible();
      await expect(emailItem.locator('[data-testid="sent-date"]')).toBeVisible();
      
      // Click to view details
      await emailItem.click();
      
      // Verify email details
      await expect(page.locator('[data-testid="email-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="delivery-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="tracking-events"]')).toBeVisible();
    });
  });

  test.describe('Webhook Processing', () => {
    
    test('should process Google Business webhook', async ({ page, request }) => {
      const mockWebhookPayload = {
        eventType: 'review.created',
        location: {
          name: 'locations/test-location-123'
        },
        review: {
          reviewId: 'review-123',
          reviewer: {
            displayName: 'Happy Customer',
            isAnonymous: false
          },
          starRating: 'FIVE',
          comment: 'Amazing service! Highly recommend.',
          createTime: '2025-01-20T10:00:00Z'
        }
      };
      
      // Send webhook to endpoint
      const response = await request.post(`${TEST_CONFIG.baseUrl}/api/reviews/webhooks/google`, {
        data: mockWebhookPayload,
        headers: {
          'x-goog-signature': 'test-signature',
          'x-goog-timestamp': Date.now().toString(),
        }
      });
      
      expect(response.ok()).toBeTruthy();
      
      // Verify review appears in dashboard
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/reviews`);
      await page.waitForTimeout(2000); // Allow for webhook processing
      
      await expect(page.locator('[data-testid="review-item"]')).toHaveCount({ min: 1 });
      
      const newReview = page.locator('[data-testid="review-item"]').first();
      await expect(newReview.locator('[data-testid="reviewer-name"]')).toHaveText('Happy Customer');
      await expect(newReview.locator('[data-testid="rating"]')).toHaveText('5');
    });
    
    test('should process Facebook webhook', async ({ page, request }) => {
      const mockFacebookWebhook = {
        entry: [{
          id: 'test-page-123',
          time: Math.floor(Date.now() / 1000),
          changes: [{
            field: 'ratings',
            value: {
              rating: 5,
              reviewer_id: 'user-456',
              review_text: 'Fantastic photographer!',
              created_time: new Date().toISOString()
            }
          }]
        }]
      };
      
      const response = await request.post(`${TEST_CONFIG.baseUrl}/api/reviews/webhooks/facebook`, {
        data: mockFacebookWebhook,
        headers: {
          'x-hub-signature-256': 'sha256=test-signature',
        }
      });
      
      expect(response.ok()).toBeTruthy();
      
      // Verify review processing
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/reviews`);
      await page.waitForTimeout(2000);
      
      await expect(page.locator('[data-testid="review-item"][data-platform="facebook"]')).toHaveCount({ min: 1 });
    });
    
    test('should handle email tracking webhook', async ({ page, request }) => {
      await setupMockEmailRequests();
      
      const mockEmailWebhook = {
        type: 'email.opened',
        data: {
          id: 'email-123',
          to: [TEST_CONFIG.testCouple.email],
          headers: {
            'x-tracking-token': 'test-tracking-token-123'
          }
        },
        created_at: new Date().toISOString()
      };
      
      const response = await request.post(`${TEST_CONFIG.baseUrl}/api/reviews/webhooks/email`, {
        data: mockEmailWebhook,
        headers: {
          'resend-signature': 'test-signature'
        }
      });
      
      expect(response.ok()).toBeTruthy();
      
      // Check email status update
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/reviews/emails`);
      
      const emailItem = page.locator('[data-testid="email-item"]').first();
      await expect(emailItem.locator('[data-testid="email-status"]')).toHaveText('Opened');
    });
  });

  test.describe('Performance and Error Handling', () => {
    
    test('should handle API rate limiting gracefully', async ({ page, request }) => {
      // Make multiple rapid API calls to trigger rate limiting
      const promises = Array.from({ length: 20 }, (_, i) => 
        request.get(`${TEST_CONFIG.baseUrl}/api/reviews?limit=10&offset=${i * 10}`)
      );
      
      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // UI should handle rate limiting gracefully
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/reviews`);
      
      // Should show loading or error state, not crash
      await expect(page.locator('body')).toBeVisible(); // Basic page load check
    });
    
    test('should recover from integration failures', async ({ page }) => {
      // Simulate integration failure
      await setupMockIntegrationError();
      
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/integrations`);
      
      // Should display error state
      await expect(page.locator('[data-testid="integration-error"]')).toBeVisible();
      
      // Should provide retry option
      await expect(page.locator('[data-testid="retry-connection"]')).toBeVisible();
      
      // Test retry functionality
      await page.click('[data-testid="retry-connection"]');
      
      // Should show retry in progress
      await expect(page.locator('[data-testid="retrying"]')).toBeVisible({ timeout: 5000 });
    });
    
    test('should handle large review datasets efficiently', async ({ page }) => {
      await setupMockLargeReviewDataset();
      
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/reviews`);
      
      // Check initial page load performance
      const startTime = Date.now();
      await expect(page.locator('[data-testid="reviews-list"]')).toBeVisible();
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (< 5 seconds)
      expect(loadTime).toBeLessThan(5000);
      
      // Test pagination
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
      
      // Test lazy loading on scroll
      await page.locator('[data-testid="reviews-list"]').scrollIntoViewIfNeeded();
      
      // Should load more reviews
      await expect(page.locator('[data-testid="review-item"]')).toHaveCount({ min: 20 });
    });
  });
});

/**
 * Test data setup and cleanup functions
 */
async function setupTestData(): Promise<void> {
  try {
    // Insert test supplier
    await supabase.from('suppliers').upsert({
      id: TEST_CONFIG.testSupplier.id,
      email: TEST_CONFIG.testSupplier.email,
      business_name: TEST_CONFIG.testSupplier.businessName,
    });
    
    // Insert test couple
    await supabase.from('couples').upsert({
      id: TEST_CONFIG.testCouple.id,
      email: TEST_CONFIG.testCouple.email,
      partner1_name: TEST_CONFIG.testCouple.partner1Name,
      partner2_name: TEST_CONFIG.testCouple.partner2Name,
    });
    
    // Insert test wedding
    await supabase.from('weddings').upsert({
      id: TEST_CONFIG.testWedding.id,
      couple_id: TEST_CONFIG.testCouple.id,
      supplier_id: TEST_CONFIG.testSupplier.id,
      wedding_date: TEST_CONFIG.testWedding.date,
      status: 'completed',
    });
    
    console.log('Test data setup completed');
  } catch (error) {
    console.error('Test data setup failed:', error);
  }
}

async function cleanupTestData(): Promise<void> {
  try {
    // Clean up in reverse dependency order
    await supabase.from('unified_reviews').delete().eq('supplier_id', TEST_CONFIG.testSupplier.id);
    await supabase.from('review_email_requests').delete().eq('supplier_id', TEST_CONFIG.testSupplier.id);
    await supabase.from('platform_connections').delete().eq('supplier_id', TEST_CONFIG.testSupplier.id);
    await supabase.from('weddings').delete().eq('id', TEST_CONFIG.testWedding.id);
    await supabase.from('couples').delete().eq('id', TEST_CONFIG.testCouple.id);
    await supabase.from('suppliers').delete().eq('id', TEST_CONFIG.testSupplier.id);
    
    console.log('Test data cleanup completed');
  } catch (error) {
    console.error('Test data cleanup failed:', error);
  }
}

async function setupMockGoogleConnection(): Promise<void> {
  await supabase.from('platform_connections').upsert({
    supplier_id: TEST_CONFIG.testSupplier.id,
    platform: 'google_business',
    status: 'active',
    last_sync: new Date().toISOString(),
  });
}

async function setupMockFacebookConnection(): Promise<void> {
  await supabase.from('platform_connections').upsert({
    supplier_id: TEST_CONFIG.testSupplier.id,
    platform: 'facebook',
    status: 'active',
    last_sync: new Date().toISOString(),
  });
}

async function setupMockReviews(): Promise<void> {
  const mockReviews = [
    {
      supplier_id: TEST_CONFIG.testSupplier.id,
      platform: 'google_business',
      platform_review_id: 'google-review-1',
      location_id: 'location-123',
      reviewer: { name: 'Alice Johnson', is_anonymous: false },
      rating: 5,
      review_text: 'Amazing photographer! Captured our day perfectly.',
      created_at: '2025-01-15T10:00:00Z',
      status: 'new',
    },
    {
      supplier_id: TEST_CONFIG.testSupplier.id,
      platform: 'facebook',
      platform_review_id: 'facebook-review-1',
      location_id: 'page-456',
      reviewer: { name: 'Bob Smith', is_anonymous: false },
      rating: 5,
      review_text: 'Fantastic service, highly recommend!',
      created_at: '2025-01-18T14:30:00Z',
      status: 'new',
    },
  ];
  
  for (const review of mockReviews) {
    await supabase.from('unified_reviews').upsert(review);
  }
}

async function setupMockEmailRequests(): Promise<void> {
  await supabase.from('review_email_requests').upsert({
    supplier_id: TEST_CONFIG.testSupplier.id,
    couple_id: TEST_CONFIG.testCouple.id,
    wedding_id: TEST_CONFIG.testWedding.id,
    template_type: 'review_request',
    scheduled_for: new Date().toISOString(),
    status: 'sent',
    tracking_token: 'test-tracking-token-123',
    sent_at: new Date().toISOString(),
    email_data: {
      to_email: TEST_CONFIG.testCouple.email,
      couple_names: `${TEST_CONFIG.testCouple.partner1Name} & ${TEST_CONFIG.testCouple.partner2Name}`,
      supplier_name: TEST_CONFIG.testSupplier.businessName,
      wedding_date: TEST_CONFIG.testWedding.date,
    },
  });
}

async function setupMockIntegrationError(): Promise<void> {
  await supabase.from('platform_connections').upsert({
    supplier_id: TEST_CONFIG.testSupplier.id,
    platform: 'google_business',
    status: 'error',
    error_message: 'Connection timeout',
    last_sync: null,
  });
}

async function setupMockLargeReviewDataset(): Promise<void> {
  const mockReviews = Array.from({ length: 100 }, (_, i) => ({
    supplier_id: TEST_CONFIG.testSupplier.id,
    platform: i % 2 === 0 ? 'google_business' : 'facebook',
    platform_review_id: `review-${i}`,
    location_id: `location-${i % 10}`,
    reviewer: { name: `Customer ${i}`, is_anonymous: false },
    rating: Math.floor(Math.random() * 5) + 1,
    review_text: `Review text ${i} with some content to make it realistic.`,
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'new',
  }));
  
  // Insert in batches to avoid timeout
  for (let i = 0; i < mockReviews.length; i += 10) {
    const batch = mockReviews.slice(i, i + 10);
    await supabase.from('unified_reviews').upsert(batch);
  }
}