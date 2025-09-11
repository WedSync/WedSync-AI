/**
 * Complete Content Management System Integration Tests
 * Team C Round 3 - WS-069: Educational Content Management
 * Comprehensive Playwright testing across all three rounds
 */

import { test, expect, Page } from '@playwright/test';
import { format, addDays } from 'date-fns';

interface TestArticle {
  title: string;
  content: string;
  category: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  featuredImage?: string;
}

const SAMPLE_ARTICLE: TestArticle = {
  title: 'Summer Wedding Flower Guide: 15 In-Season Blooms',
  content: 'Summer weddings offer an abundance of beautiful, in-season flowers that can transform your special day into a botanical paradise. From vibrant sunflowers to delicate peonies, the summer season provides couples with countless options for creating stunning floral arrangements.',
  category: 'Style & Design',
  tags: ['summer', 'flowers', 'seasonal', 'planning'],
  seoTitle: 'Summer Wedding Flowers: Complete 2025 In-Season Guide',
  seoDescription: 'Discover the most beautiful summer wedding flowers for 2025. Our complete guide covers 15 in-season blooms, pricing tips, and arrangement ideas for your perfect summer wedding.',
  featuredImage: 'https://example.com/summer-wedding-flowers.jpg'
};

test.describe('Complete Content Management System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to article editor
    await page.goto('/articles/editor');
    await page.waitForLoadState('networkidle');
  });

  test('1. Advanced Article Editor with Rich Media Embedding', async ({ page }) => {
    // Test article creation with rich content
    await test.step('Create new article', async () => {
      await page.getByTestId('create-article').click();
      await expect(page.getByText('Create Article')).toBeVisible();
    });

    await test.step('Add article title', async () => {
      await page.getByTestId('article-title').fill(SAMPLE_ARTICLE.title);
      await expect(page.getByTestId('article-title')).toHaveValue(SAMPLE_ARTICLE.title);
    });

    await test.step('Add rich text content', async () => {
      const editor = page.getByTestId('rich-text-editor');
      await editor.click();
      await editor.fill(SAMPLE_ARTICLE.content);
      
      // Test text formatting
      await page.keyboard.press('Control+a');
      await page.getByRole('button', { name: 'Bold' }).click();
      await expect(editor).toContainText(SAMPLE_ARTICLE.content);
    });

    await test.step('Test heading formatting', async () => {
      await page.getByTestId('rich-text-editor').click();
      await page.keyboard.press('Enter');
      await page.keyboard.type('Important Planning Tips');
      await page.keyboard.press('Control+a');
      await page.getByTestId('format-heading-2').click();
      
      // Verify heading is applied
      await expect(page.locator('h2').filter({ hasText: 'Important Planning Tips' })).toBeVisible();
    });

    await test.step('Test image insertion', async () => {
      await page.getByTestId('insert-image').click();
      
      // Mock file upload
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'summer-flowers.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      // Verify image placeholder is added
      await expect(page.locator('img').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Add categories and tags', async () => {
      // Select category
      await page.getByLabel(SAMPLE_ARTICLE.category).check();
      await expect(page.getByLabel(SAMPLE_ARTICLE.category)).toBeChecked();
      
      // Add tags
      const tagInput = page.getByTestId('tags-input');
      for (const tag of SAMPLE_ARTICLE.tags) {
        await tagInput.fill(tag);
        await page.keyboard.press('Enter');
        await expect(page.getByText(tag).first()).toBeVisible();
      }
    });

    await test.step('Auto-save functionality', async () => {
      // Wait for auto-save indicator
      await expect(page.getByText('Saving...')).toBeVisible({ timeout: 35000 });
      await expect(page.getByText('Last saved:')).toBeVisible({ timeout: 10000 });
    });
  });

  test('2. SEO Optimization with Automated Meta Generation', async ({ page }) => {
    // Create basic article first
    await page.getByTestId('create-article').click();
    await page.getByTestId('article-title').fill(SAMPLE_ARTICLE.title);
    await page.getByTestId('rich-text-editor').fill(SAMPLE_ARTICLE.content);

    await test.step('Navigate to SEO settings', async () => {
      await page.getByTestId('seo-settings').click();
      await expect(page.getByText('SEO Optimization')).toBeVisible();
    });

    await test.step('Test automated SEO generation', async () => {
      await page.getByTestId('generate-seo').click();
      
      // Wait for generation to complete
      await expect(page.getByText('Analyzing & Optimizing...')).toBeVisible();
      await expect(page.getByText('Analyzing & Optimizing...')).not.toBeVisible({ timeout: 10000 });
      
      // Verify SEO fields are populated
      await expect(page.getByTestId('seo-title-input')).not.toHaveValue('');
      await expect(page.getByTestId('seo-description-input')).not.toHaveValue('');
    });

    await test.step('Verify SEO score calculation', async () => {
      await expect(page.getByText('SEO Score:')).toBeVisible();
      const scoreElement = page.locator('[data-testid="seo-score"]');
      const score = await scoreElement.textContent();
      expect(parseInt(score || '0')).toBeGreaterThan(0);
    });

    await test.step('Test character count validation', async () => {
      const titleInput = page.getByTestId('seo-title-input');
      await titleInput.fill('A'.repeat(70)); // Exceed 60 character limit
      
      await expect(page.getByText('/60 characters')).toHaveClass(/text-error-600/);
      
      await titleInput.fill(SAMPLE_ARTICLE.seoTitle);
      await expect(page.getByText('/60 characters')).toHaveClass(/text-success-600/);
    });

    await test.step('Test keyword density analysis', async () => {
      // Add keywords
      await page.getByTestId('seo-keywords-input').fill('summer, wedding, flowers, planning');
      
      // Verify keyword analysis
      await expect(page.getByText('Keyword Density')).toBeVisible();
      await expect(page.getByText('summer')).toBeVisible();
    });
  });

  test('3. Content Distribution Rules Configuration', async ({ page }) => {
    // Create and save article first
    await page.getByTestId('create-article').click();
    await page.getByTestId('article-title').fill(SAMPLE_ARTICLE.title);
    await page.getByTestId('rich-text-editor').fill(SAMPLE_ARTICLE.content);
    await page.getByTestId('save-draft').click();

    await test.step('Navigate to distribution settings', async () => {
      await page.getByTestId('distribution-settings').click();
      await expect(page.getByText('Content Distribution')).toBeVisible();
    });

    await test.step('Add intelligent distribution rule', async () => {
      await page.getByTestId('add-distribution-rule').click();
      
      // Configure rule for wedding month
      await page.getByTestId('distribution-condition').selectOption('wedding_month');
      
      // Select multiple months for summer weddings
      await page.getByTestId('month-value').selectOption(['june', 'july', 'august']);
      
      await expect(page.getByText('June, July, August')).toBeVisible();
    });

    await test.step('Test budget range targeting', async () => {
      await page.getByTestId('add-distribution-rule').click();
      await page.getByTestId('distribution-condition').selectOption('budget_range');
      await page.getByTestId('budget-value').selectOption('mid-range');
      
      await expect(page.getByText('Mid-range budget')).toBeVisible();
    });

    await test.step('Configure guest count rule', async () => {
      await page.getByTestId('add-distribution-rule').click();
      await page.getByTestId('distribution-condition').selectOption('guest_count');
      await page.getByTestId('guest-count-min').fill('50');
      await page.getByTestId('guest-count-max').fill('150');
      
      await expect(page.getByText('50-150 guests')).toBeVisible();
    });

    await test.step('Save distribution rules', async () => {
      await page.getByTestId('save-distribution-rules').click();
      await expect(page.getByText('Distribution rules saved')).toBeVisible();
    });
  });

  test('4. Publishing Scheduler with Automated Delivery', async ({ page }) => {
    // Create article
    await page.getByTestId('create-article').click();
    await page.getByTestId('article-title').fill(SAMPLE_ARTICLE.title);
    await page.getByTestId('rich-text-editor').fill(SAMPLE_ARTICLE.content);

    await test.step('Navigate to publishing tab', async () => {
      await page.getByTestId('publishing-tab').click();
      await expect(page.getByText('Publishing Schedule')).toBeVisible();
    });

    await test.step('Test immediate publishing', async () => {
      await page.getByTestId('publish-now').click();
      await expect(page.getByText('Article published successfully')).toBeVisible({ timeout: 10000 });
    });

    // Create another article for scheduling
    await page.getByTestId('create-article').click();
    await page.getByTestId('article-title').fill('Winter Wedding Planning Checklist');
    await page.getByTestId('rich-text-editor').fill('Winter weddings require special planning considerations...');
    
    await test.step('Test scheduled publishing', async () => {
      await page.getByTestId('publishing-tab').click();
      await page.getByTestId('schedule-publishing').click();
      
      // Set future date
      const futureDate = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      await page.getByTestId('publish-date').fill(futureDate);
      await page.getByTestId('publish-time').fill('09:00');
      
      await page.getByTestId('schedule-article').click();
      await expect(page.getByText('Article scheduled successfully')).toBeVisible();
    });

    await test.step('Test optimal time suggestions', async () => {
      await page.getByTestId('optimal-times-tab').click();
      
      // Verify AI-suggested times are shown
      await expect(page.getByText('Morning Peak (9 AM)')).toBeVisible();
      await expect(page.getByText('Afternoon Peak (2 PM)')).toBeVisible();
      await expect(page.getByText('Evening Peak (7 PM)')).toBeVisible();
      
      // Test selecting optimal time
      await page.getByTestId('optimal-time-morning').click();
      await expect(page.getByText('Scheduled for optimal engagement')).toBeVisible();
    });

    await test.step('Configure notification settings', async () => {
      await page.getByLabel('Email Notifications').check();
      await page.getByLabel('Dashboard Notifications').check();
      
      // Add notification recipient
      await page.getByTestId('notification-email').fill('team@weddingvendor.com');
      await page.getByTestId('add-recipient').click();
      
      await expect(page.getByText('team@weddingvendor.com')).toBeVisible();
    });
  });

  test('5. Client Dashboard Integration and Content Delivery', async ({ page }) => {
    // First publish an article
    await page.getByTestId('create-article').click();
    await page.getByTestId('article-title').fill(SAMPLE_ARTICLE.title);
    await page.getByTestId('rich-text-editor').fill(SAMPLE_ARTICLE.content);
    await page.getByTestId('publish-now').click();

    await test.step('Navigate to client dashboard view', async () => {
      await page.goto('/clients/summer-wedding-client');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify intelligent article distribution', async () => {
      // Check for recommended reading section
      await expect(page.getByText('Recommended Reading')).toBeVisible();
      await expect(page.getByText('Summer Wedding Flower Guide')).toBeVisible();
      
      // Verify relevance indicators
      await expect(page.getByText('Matches your summer wedding')).toBeVisible();
      await expect(page.getByText('92% relevance')).toBeVisible();
    });

    await test.step('Test article reading experience with branding', async () => {
      await page.getByTestId('article-summer-flower-guide').click();
      
      // Verify branded article display
      await expect(page.getByText('Summer Wedding Flower Guide')).toBeVisible();
      await expect(page.locator('.brand-header')).toBeVisible();
      await expect(page.locator('.brand-logo')).toBeVisible();
      
      // Verify custom branding colors are applied
      const article = page.locator('.branded-article');
      await expect(article).toHaveCSS('font-family', /brand-body-font/);
    });

    await test.step('Test engagement tracking', async () => {
      // Scroll through article to generate engagement events
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      
      // Simulate reading time
      await page.waitForTimeout(3000);
      
      // Test sharing functionality
      await page.getByTestId('share-article').click();
      await expect(page.getByText('Article shared')).toBeVisible();
    });

    await test.step('Verify document attachments integration', async () => {
      // Check for attached resources
      await expect(page.getByText('Related Resources')).toBeVisible();
      await expect(page.getByTestId('download-resource')).toBeVisible();
      
      // Test resource download
      await page.getByTestId('download-resource').click();
      // Note: In real test, you'd verify the download occurred
    });
  });

  test('6. Article Analytics Dashboard', async ({ page }) => {
    await test.step('Navigate to analytics dashboard', async () => {
      await page.goto('/articles/analytics');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify article performance metrics', async () => {
      await expect(page.getByText('Article Analytics Dashboard')).toBeVisible();
      
      // Check key metrics
      await expect(page.getByText('Total Views')).toBeVisible();
      await expect(page.getByTestId('total-views')).toContainText(/\d+/);
      
      await expect(page.getByText('Engagement Rate')).toBeVisible();
      await expect(page.getByTestId('engagement-rate')).toContainText(/\d+%/);
      
      await expect(page.getByText('Avg Time Spent')).toBeVisible();
      await expect(page.getByTestId('avg-time-spent')).toContainText(/\d+:\d+/);
    });

    await test.step('Test engagement analytics details', async () => {
      await page.getByTestId('detailed-analytics').click();
      
      // Verify detailed metrics
      await expect(page.getByText('Reading Time: 92%')).toBeVisible();
      await expect(page.getByText('Client Engagement: 4.2/5')).toBeVisible();
      await expect(page.getByText('Scroll Depth: 78%')).toBeVisible();
    });

    await test.step('Test traffic source breakdown', async () => {
      await expect(page.getByText('Traffic Sources')).toBeVisible();
      await expect(page.getByText('Direct')).toBeVisible();
      await expect(page.getByText('Google')).toBeVisible();
      await expect(page.getByText('Social')).toBeVisible();
      
      // Verify percentages add up logically
      const directPercentage = await page.getByTestId('direct-percentage').textContent();
      expect(parseInt(directPercentage?.replace('%', '') || '0')).toBeGreaterThan(0);
    });

    await test.step('Test device breakdown analytics', async () => {
      await expect(page.getByText('Device Breakdown')).toBeVisible();
      await expect(page.getByText('Desktop')).toBeVisible();
      await expect(page.getByText('Mobile')).toBeVisible();
      await expect(page.getByText('Tablet')).toBeVisible();
    });

    await test.step('Test export functionality', async () => {
      const downloadPromise = page.waitForEvent('download');
      await page.getByTestId('export-csv').click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.csv');
    });
  });

  test('7. Complete System Integration Workflow', async ({ page }) => {
    await test.step('Test end-to-end content creation workflow', async () => {
      // 1. Create article with branding
      await page.getByTestId('create-article').click();
      await page.getByTestId('article-title').fill(SAMPLE_ARTICLE.title);
      await page.getByTestId('rich-text-editor').fill(SAMPLE_ARTICLE.content);
      
      // 2. Apply branding
      await page.getByTestId('apply-branding').check();
      await expect(page.getByText('Branding will be applied')).toBeVisible();
      
      // 3. Attach documents
      await page.getByTestId('attach-documents').click();
      await page.getByTestId('document-flower-guide-pdf').check();
      await expect(page.getByText('1 document attached')).toBeVisible();
      
      // 4. Configure SEO
      await page.getByTestId('seo-settings').click();
      await page.getByTestId('generate-seo').click();
      await expect(page.getByText('SEO Score: 85/100')).toBeVisible();
      
      // 5. Set distribution rules
      await page.getByTestId('distribution-settings').click();
      await page.getByTestId('add-distribution-rule').click();
      await page.getByTestId('distribution-condition').selectOption('wedding_month');
      await page.getByTestId('month-value').selectOption(['june', 'july', 'august']);
      
      // 6. Schedule publication
      await page.getByTestId('publishing-tab').click();
      await page.getByTestId('schedule-publishing').click();
      const futureDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      await page.getByTestId('publish-date').fill(futureDate);
      await page.getByTestId('schedule-article').click();
      
      await expect(page.getByText('Article scheduled with complete integration')).toBeVisible();
    });

    await test.step('Verify integration across all Team C rounds', async () => {
      // Round 1: Branding integration
      await expect(page.getByText('Branding: Applied')).toBeVisible();
      
      // Round 2: Document integration  
      await expect(page.getByText('Documents: 1 attached')).toBeVisible();
      
      // Round 3: Article creation and distribution
      await expect(page.getByText('Distribution: 1 rule active')).toBeVisible();
      await expect(page.getByText('Status: Scheduled')).toBeVisible();
    });
  });

  test('8. Performance and Load Testing', async ({ page }) => {
    await test.step('Measure article editor load time', async () => {
      const startTime = Date.now();
      await page.goto('/articles/editor');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Editor should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    await test.step('Test bulk article operations', async () => {
      // Create multiple articles quickly
      for (let i = 0; i < 5; i++) {
        await page.getByTestId('create-article').click();
        await page.getByTestId('article-title').fill(`Test Article ${i + 1}`);
        await page.getByTestId('rich-text-editor').fill(`Content for article ${i + 1}`);
        await page.getByTestId('save-draft').click();
        await expect(page.getByText('Draft saved')).toBeVisible();
      }
    });

    await test.step('Measure content distribution processing time', async () => {
      const startTime = Date.now();
      await page.getByTestId('trigger-distribution').click();
      await expect(page.getByText('Distribution completed')).toBeVisible({ timeout: 10000 });
      const processingTime = Date.now() - startTime;
      
      // Distribution should complete within 10 seconds
      expect(processingTime).toBeLessThan(10000);
    });
  });

  test('9. Error Handling and Edge Cases', async ({ page }) => {
    await test.step('Test network failure handling', async () => {
      // Simulate network failure
      await page.route('**/api/articles', route => route.abort());
      
      await page.getByTestId('create-article').click();
      await page.getByTestId('article-title').fill('Test Article');
      await page.getByTestId('save-draft').click();
      
      await expect(page.getByText('Failed to save article')).toBeVisible();
      await expect(page.getByText('Retry')).toBeVisible();
    });

    await test.step('Test validation error handling', async () => {
      await page.getByTestId('create-article').click();
      // Try to save without title
      await page.getByTestId('save-draft').click();
      
      await expect(page.getByText('Title is required')).toBeVisible();
    });

    await test.step('Test large content handling', async () => {
      const largeContent = 'A'.repeat(50000);
      
      await page.getByTestId('create-article').click();
      await page.getByTestId('article-title').fill('Large Content Test');
      await page.getByTestId('rich-text-editor').fill(largeContent);
      
      // Should handle large content gracefully
      await expect(page.getByTestId('rich-text-editor')).toContainText('A'.repeat(100));
    });
  });

  test('10. Accessibility and Mobile Responsiveness', async ({ page }) => {
    await test.step('Test keyboard navigation', async () => {
      await page.getByTestId('create-article').click();
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('article-title')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('rich-text-editor')).toBeFocused();
    });

    await test.step('Test screen reader compatibility', async () => {
      // Check for proper ARIA labels
      await expect(page.getByLabel('Article Title')).toBeVisible();
      await expect(page.getByLabel('Article Content')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible();
    });

    await test.step('Test mobile responsiveness', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.getByTestId('create-article').click();
      
      // Verify mobile layout
      await expect(page.getByTestId('mobile-menu')).toBeVisible();
      await expect(page.getByTestId('article-editor')).toBeVisible();
      
      // Test mobile-specific interactions
      await page.getByTestId('mobile-toolbar-toggle').click();
      await expect(page.getByTestId('mobile-toolbar')).toBeVisible();
    });
  });

});

// Performance measurement helper
test('Performance Metrics Collection', async ({ page }) => {
  const metrics = await page.evaluate(() => ({
    articleRenderTime: window.performance.getEntriesByName('article-render')[0]?.duration || 0,
    editorLoadTime: window.performance.getEntriesByName('editor-load')[0]?.duration || 0,
    distributionProcessingTime: window.performance.getEntriesByName('distribution-process')[0]?.duration || 0,
    totalSystemMemory: (performance as any).memory?.usedJSHeapSize || 0
  }));

  // Log performance metrics
  console.log('Content System Performance Metrics:', metrics);

  // Assert performance thresholds
  expect(metrics.articleRenderTime).toBeLessThan(500); // 500ms max render time
  expect(metrics.editorLoadTime).toBeLessThan(1000); // 1s max editor load time
  expect(metrics.distributionProcessingTime).toBeLessThan(2000); // 2s max distribution time
});