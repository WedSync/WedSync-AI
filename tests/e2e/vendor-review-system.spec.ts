import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test data setup
const TEST_USER = {
  email: 'test.couple@wedsync.com',
  password: 'TestPassword123!',
  firstName: 'Jane',
  lastName: 'Smith'
};

const TEST_VENDOR = {
  businessName: 'Amazing Photography Studio',
  category: 'Photography',
  email: 'contact@amazingphoto.com'
};

const TEST_REVIEW = {
  title: 'Absolutely fantastic photographer!',
  content: 'John and his team were incredible. They captured every precious moment of our wedding day. The photos are stunning and we couldn\'t be happier. They were professional, creative, and made us feel comfortable throughout the day.',
  overallRating: 5,
  weddingDate: '2024-06-15',
  serviceType: 'Wedding Photography',
  packageDetails: 'Full day coverage with engagement shoot',
  amountPaid: 3500,
  wouldRecommend: true,
  hiredAgain: true
};

test.describe('Vendor Review System - End to End', () => {
  let supabase: any;
  let testVendorId: string;
  let testClientId: string;

  test.beforeAll(async () => {
    // Initialize Supabase client for test setup
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  test.beforeEach(async ({ page }) => {
    // Set up test data
    await setupTestData();
    
    // Navigate to the application
    await page.goto('/');
  });

  test.afterEach(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  test('Complete review submission workflow', async ({ page }) => {
    // Step 1: Login as couple
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await expect(page).toHaveURL(/\/dashboard/);

    // Step 2: Navigate to review form
    await page.goto(`/vendors/reviews/new?vendorId=${testVendorId}&clientId=${testClientId}`);
    
    // Verify we're on the review form
    await expect(page).toHaveURL(/\/vendors\/reviews\/new/);
    await expect(page.locator('h2')).toContainText('Select Your Vendor');

    // Step 3: Fill out vendor details (Step 1)
    await page.selectOption('select[name="vendorId"]', testVendorId);
    await page.fill('input[name="weddingDate"]', TEST_REVIEW.weddingDate);
    await page.fill('input[name="vendorServiceType"]', TEST_REVIEW.serviceType);
    await page.fill('textarea[name="vendorPackageDetails"]', TEST_REVIEW.packageDetails);
    await page.fill('input[name="totalAmountPaid"]', TEST_REVIEW.amountPaid.toString());
    
    // Click Next
    await page.click('button:has-text("Next")');
    
    // Step 4: Fill out review content (Step 2)
    await expect(page.locator('h2')).toContainText('Write Your Review');
    
    // Set overall rating
    await page.click(`button[data-rating="${TEST_REVIEW.overallRating}"]`);
    
    // Fill out review details
    await page.fill('input[name="title"]', TEST_REVIEW.title);
    await page.fill('textarea[name="content"]', TEST_REVIEW.content);
    
    // Set recommendations
    if (TEST_REVIEW.wouldRecommend) {
      await page.check('input[name="wouldRecommend"]');
    }
    if (TEST_REVIEW.hiredAgain) {
      await page.check('input[name="hiredAgain"]');
    }
    
    // Click Next
    await page.click('button:has-text("Next")');
    
    // Step 5: Fill out category ratings (Step 3)
    await expect(page.locator('h2')).toContainText('Rate Specific Categories');
    
    // Rate each category (Communication, Quality, etc.)
    const categories = ['Communication', 'Quality of Service', 'Professionalism', 'Value for Money'];
    for (const category of categories) {
      const categorySection = page.locator(`label:has-text("${category}")`).locator('..').locator('..');
      await categorySection.locator('button[data-rating="5"]').click();
    }
    
    // Click Next
    await page.click('button:has-text("Next")');
    
    // Step 6: Review and submit (Step 4)
    await expect(page.locator('h2')).toContainText('Review & Submit');
    
    // Verify review summary
    await expect(page.locator('text=' + TEST_VENDOR.businessName)).toBeVisible();
    await expect(page.locator('text=' + TEST_REVIEW.title)).toBeVisible();
    
    // Submit review
    await page.click('button:has-text("Submit Review")');
    
    // Step 7: Verify success
    await expect(page).toHaveURL(/\/vendors\/reviews\/thank-you/);
    await expect(page.locator('text=Thank you for your review')).toBeVisible();
    
    // Verify review was created in database
    const { data: review } = await supabase
      .from('vendor_reviews')
      .select('*')
      .eq('vendor_id', testVendorId)
      .eq('client_id', testClientId)
      .single();
    
    expect(review).toBeTruthy();
    expect(review.title).toBe(TEST_REVIEW.title);
    expect(review.overall_rating).toBe(TEST_REVIEW.overallRating);
    expect(review.moderation_status).toBe('pending');
  });

  test('Review moderation workflow', async ({ page }) => {
    // Create a test review first
    const { data: review } = await supabase
      .from('vendor_reviews')
      .insert({
        vendor_id: testVendorId,
        client_id: testClientId,
        user_id: TEST_USER.id,
        organization_id: 'test-org-id',
        title: TEST_REVIEW.title,
        content: TEST_REVIEW.content,
        overall_rating: TEST_REVIEW.overallRating,
        wedding_date: TEST_REVIEW.weddingDate,
        vendor_service_type: TEST_REVIEW.serviceType,
        would_recommend: TEST_REVIEW.wouldRecommend
      })
      .select()
      .single();

    // Login as moderator
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'moderator@wedsync.com');
    await page.fill('input[name="password"]', 'ModeratorPass123!');
    await page.click('button[type="submit"]');
    
    // Navigate to moderation dashboard
    await page.goto('/admin/reviews/moderation');
    
    // Find the test review
    await expect(page.locator('text=' + TEST_REVIEW.title)).toBeVisible();
    
    // Click on the review to select it
    await page.click(`text=${TEST_REVIEW.title}`);
    
    // Verify review details panel opens
    await expect(page.locator('text=Review Details')).toBeVisible();
    await expect(page.locator('text=' + TEST_REVIEW.content)).toBeVisible();
    
    // Approve the review
    await page.click('button:has-text("Approve Review")');
    
    // Verify status change
    await expect(page.locator('text=Approved')).toBeVisible();
    
    // Verify in database
    const { data: updatedReview } = await supabase
      .from('vendor_reviews')
      .select('moderation_status')
      .eq('id', review.id)
      .single();
    
    expect(updatedReview.moderation_status).toBe('approved');
  });

  test('Review display and filtering', async ({ page }) => {
    // Create multiple test reviews with different ratings
    const reviews = [
      { ...TEST_REVIEW, title: 'Excellent service', overall_rating: 5 },
      { ...TEST_REVIEW, title: 'Good but could be better', overall_rating: 3 },
      { ...TEST_REVIEW, title: 'Outstanding work', overall_rating: 5 },
      { ...TEST_REVIEW, title: 'Average experience', overall_rating: 3 }
    ];

    for (const reviewData of reviews) {
      await supabase.from('vendor_reviews').insert({
        vendor_id: testVendorId,
        client_id: testClientId,
        user_id: TEST_USER.id,
        organization_id: 'test-org-id',
        moderation_status: 'approved',
        ...reviewData,
        wedding_date: TEST_REVIEW.weddingDate,
        vendor_service_type: TEST_REVIEW.serviceType
      });
    }

    // Navigate to vendor page with reviews
    await page.goto(`/vendors/${testVendorId}`);
    
    // Verify all reviews are displayed
    await expect(page.locator('text=Customer Reviews (4)')).toBeVisible();
    
    // Test rating filter
    await page.click('button:has-text("Filters")');
    await page.selectOption('select[name="rating"]', '5');
    
    // Verify only 5-star reviews are shown
    await expect(page.locator('text=Excellent service')).toBeVisible();
    await expect(page.locator('text=Outstanding work')).toBeVisible();
    await expect(page.locator('text=Good but could be better')).not.toBeVisible();
    
    // Test search functionality
    await page.fill('input[placeholder="Search reviews..."]', 'outstanding');
    await expect(page.locator('text=Outstanding work')).toBeVisible();
    await expect(page.locator('text=Excellent service')).not.toBeVisible();
    
    // Clear search and filters
    await page.fill('input[placeholder="Search reviews..."]', '');
    await page.selectOption('select[name="rating"]', '');
    
    // Test sorting
    await page.selectOption('select[name="sortBy"]', 'lowest');
    
    // Verify reviews are sorted by lowest rating first
    const firstReview = page.locator('.review-card').first();
    await expect(firstReview.locator('text=Good but could be better')).toBeVisible();
  });

  test('Review voting (helpful/not helpful)', async ({ page }) => {
    // Create an approved test review
    const { data: review } = await supabase
      .from('vendor_reviews')
      .insert({
        vendor_id: testVendorId,
        client_id: testClientId,
        user_id: 'other-user-id',
        organization_id: 'test-org-id',
        moderation_status: 'approved',
        title: TEST_REVIEW.title,
        content: TEST_REVIEW.content,
        overall_rating: TEST_REVIEW.overallRating,
        wedding_date: TEST_REVIEW.weddingDate,
        vendor_service_type: TEST_REVIEW.serviceType
      })
      .select()
      .single();

    // Login as different user
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Navigate to vendor page
    await page.goto(`/vendors/${testVendorId}`);
    
    // Find the review and vote helpful
    const reviewCard = page.locator('.review-card').first();
    await reviewCard.locator('button:has-text("Helpful")').click();
    
    // Verify vote count updated
    await expect(reviewCard.locator('text=Helpful (1)')).toBeVisible();
    
    // Verify vote was recorded in database
    const { data: vote } = await supabase
      .from('vendor_review_votes')
      .select('*')
      .eq('review_id', review.id)
      .eq('user_id', TEST_USER.id)
      .single();
    
    expect(vote.is_helpful).toBe(true);
    
    // Click again to remove vote
    await reviewCard.locator('button:has-text("Helpful")').click();
    await expect(reviewCard.locator('text=Helpful (0)')).toBeVisible();
  });

  test('Review flagging workflow', async ({ page }) => {
    // Create an approved test review
    await supabase.from('vendor_reviews').insert({
      vendor_id: testVendorId,
      client_id: testClientId,
      user_id: 'other-user-id',
      organization_id: 'test-org-id',
      moderation_status: 'approved',
      title: 'Inappropriate Review Title',
      content: 'This contains inappropriate content that should be flagged',
      overall_rating: 1,
      wedding_date: TEST_REVIEW.weddingDate,
      vendor_service_type: TEST_REVIEW.serviceType
    });

    // Login as user
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Navigate to vendor page
    await page.goto(`/vendors/${testVendorId}`);
    
    // Flag the review
    await page.click('button[title="Report review"]');
    
    // Verify flag was submitted (you might have a modal or alert)
    const dialog = page.locator('text=Thank you for reporting this review');
    await expect(dialog).toBeVisible();
    
    // Verify flag was recorded in database
    const { data: flag } = await supabase
      .from('vendor_review_flags')
      .select('*')
      .eq('flagger_id', TEST_USER.id)
      .single();
    
    expect(flag).toBeTruthy();
    expect(flag.flag_type).toBe('inappropriate');
  });

  test('Vendor performance analytics display', async ({ page }) => {
    // Create multiple reviews to generate analytics data
    const reviews = Array.from({ length: 10 }, (_, i) => ({
      vendor_id: testVendorId,
      client_id: testClientId,
      user_id: `user-${i}`,
      organization_id: 'test-org-id',
      moderation_status: 'approved',
      title: `Review ${i + 1}`,
      content: `This is review number ${i + 1} with detailed feedback`,
      overall_rating: Math.floor(Math.random() * 5) + 1,
      wedding_date: new Date(2024, 5, 15 + i).toISOString().split('T')[0],
      vendor_service_type: TEST_REVIEW.serviceType,
      would_recommend: Math.random() > 0.3
    }));

    for (const review of reviews) {
      await supabase.from('vendor_reviews').insert(review);
    }

    // Login as admin
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'admin@wedsync.com');
    await page.fill('input[name="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');
    
    // Navigate to analytics dashboard
    await page.goto('/admin/analytics/vendor-reviews');
    
    // Verify analytics components are loaded
    await expect(page.locator('text=Vendor Review Analytics')).toBeVisible();
    await expect(page.locator('text=Total Reviews')).toBeVisible();
    await expect(page.locator('text=Average Rating')).toBeVisible();
    await expect(page.locator('text=Recommendation Rate')).toBeVisible();
    
    // Test filters
    await page.selectOption('select[name="timeRange"]', '30d');
    await page.selectOption('select[name="category"]', TEST_VENDOR.category);
    
    // Verify charts are rendered
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
    
    // Test export functionality
    await page.click('button:has-text("Export")');
    
    // Verify export dialog or download starts
    // This depends on your export implementation
  });

  test('Mobile responsive review form', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login as couple
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Navigate to review form
    await page.goto(`/vendors/reviews/new?vendorId=${testVendorId}&clientId=${testClientId}`);
    
    // Verify mobile layout
    await expect(page.locator('h2')).toContainText('Select Your Vendor');
    
    // Test that form elements are properly sized for mobile
    const vendorSelect = page.locator('select[name="vendorId"]');
    await expect(vendorSelect).toBeVisible();
    
    // Fill out form on mobile
    await page.selectOption('select[name="vendorId"]', testVendorId);
    await page.fill('input[name="weddingDate"]', TEST_REVIEW.weddingDate);
    await page.fill('input[name="vendorServiceType"]', TEST_REVIEW.serviceType);
    
    // Verify next button is accessible
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    
    // Continue through mobile flow
    await expect(page.locator('h2')).toContainText('Write Your Review');
    
    // Test star rating on mobile
    const starButtons = page.locator('button[data-rating]');
    await expect(starButtons).toHaveCount(5);
    await starButtons.nth(4).click(); // Click 5th star
    
    // Verify mobile-optimized text areas
    const contentTextarea = page.locator('textarea[name="content"]');
    await expect(contentTextarea).toBeVisible();
    await contentTextarea.fill(TEST_REVIEW.content);
  });

  // Helper functions
  async function setupTestData() {
    // Create test vendor
    const { data: vendor } = await supabase
      .from('vendors')
      .insert({
        business_name: TEST_VENDOR.businessName,
        category: TEST_VENDOR.category,
        contact_email: TEST_VENDOR.email,
        organization_id: 'test-org-id'
      })
      .select()
      .single();
    
    testVendorId = vendor.id;

    // Create test client
    const { data: client } = await supabase
      .from('clients')
      .insert({
        first_name: TEST_USER.firstName,
        last_name: TEST_USER.lastName,
        email: TEST_USER.email,
        organization_id: 'test-org-id'
      })
      .select()
      .single();
    
    testClientId = client.id;

    // Create test user if needed
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(TEST_USER.email);
    if (!existingUser.user) {
      await supabase.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        email_confirm: true
      });
    }
  }

  async function cleanupTestData() {
    // Clean up in reverse order due to foreign keys
    await supabase.from('vendor_review_votes').delete().eq('review_id', 'test-review-id');
    await supabase.from('vendor_review_flags').delete().eq('review_id', 'test-review-id');
    await supabase.from('vendor_review_ratings').delete().eq('review_id', 'test-review-id');
    await supabase.from('vendor_review_photos').delete().eq('review_id', 'test-review-id');
    await supabase.from('vendor_review_responses').delete().eq('review_id', 'test-review-id');
    await supabase.from('vendor_reviews').delete().eq('vendor_id', testVendorId);
    await supabase.from('vendor_performance_metrics').delete().eq('vendor_id', testVendorId);
    await supabase.from('vendors').delete().eq('id', testVendorId);
    await supabase.from('clients').delete().eq('id', testClientId);
  }
});

test.describe('Performance and Accessibility Tests', () => {
  test('Review form performance', async ({ page }) => {
    // Test form load time
    const startTime = Date.now();
    await page.goto('/vendors/reviews/new');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
    
    // Test form interaction performance
    const ratingButtonStartTime = Date.now();
    await page.click('button[data-rating="5"]');
    const ratingButtonTime = Date.now() - ratingButtonStartTime;
    
    expect(ratingButtonTime).toBeLessThan(500); // Should respond in under 500ms
  });

  test('Review form accessibility', async ({ page }) => {
    await page.goto('/vendors/reviews/new');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Should focus first interactive element
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Test ARIA labels
    const ratingSection = page.locator('[role="group"]').first();
    await expect(ratingSection).toHaveAttribute('aria-label');
    
    // Test form validation accessibility
    await page.click('button:has-text("Next")'); // Submit without filling required fields
    
    // Verify error messages are accessible
    const errorMessages = page.locator('[role="alert"]');
    await expect(errorMessages.first()).toBeVisible();
    
    // Test screen reader compatibility
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    for (let i = 0; i < await headings.count(); i++) {
      await expect(headings.nth(i)).toBeVisible();
    }
  });
});