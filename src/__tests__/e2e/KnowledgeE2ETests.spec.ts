/**
 * Knowledge E2E Tests - End-to-End Knowledge Base Workflows
 * WS-210 AI Knowledge Base - Team E Implementation
 *
 * Tests complete knowledge workflows from creation to consumption
 * Validates user experience and business value delivery
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { faqKnowledgeBaseIntegrationService } from '@/lib/services/faq-knowledge-base-integration';

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  testSupplier: {
    email: 'test-supplier@example.com',
    password: 'TestPassword123!',
    organizationName: 'Test Wedding Photography',
  },
  testClient: {
    email: 'test-client@example.com',
    password: 'ClientPassword123!',
    weddingDate: '2025-08-15',
  },
};

// Test data
const TEST_KNOWLEDGE_ARTICLES = {
  timeline: {
    title: 'Wedding Day Timeline - Photography Focused',
    content: `
      A well-planned wedding day timeline is essential for capturing every precious moment.
      
      **6 Hours Before Ceremony:**
      - Bridal preparations begin
      - Detail shots of dress, rings, shoes
      - Getting ready candid moments
      
      **4 Hours Before:**
      - Groom preparation
      - Groomsmen gathering
      - Boutonniere placement
      
      **2 Hours Before:**
      - First look (optional)
      - Couple portraits
      - Family arrival
      
      **1 Hour Before:**
      - Guest arrival
      - Final venue checks
      - Equipment positioning
      
      **Ceremony:**
      - Processional coverage
      - Exchange of vows
      - Ring exchange
      - First kiss
      - Recessional
      
      **Post-Ceremony:**
      - Immediate family photos
      - Wedding party photos
      - Couple portraits
      
      **Reception:**
      - Grand entrance
      - First dance
      - Speeches
      - Cake cutting
      - Dancing and celebration
    `,
    category: 'timeline',
    tags: ['photography', 'timeline', 'wedding-day', 'planning', 'schedule'],
  },
  pricing: {
    title: 'Photography Package Pricing Guide',
    content: `
      Our photography packages are designed to capture your special day comprehensively.
      
      **Essential Package (£1,500):**
      - 6 hours coverage
      - 300+ edited photos
      - Online gallery
      - Print release
      
      **Premium Package (£2,500):**
      - 8 hours coverage
      - 500+ edited photos
      - Engagement session
      - Wedding album
      - Online gallery
      - Print release
      
      **Luxury Package (£3,500):**
      - 10 hours coverage
      - 800+ edited photos
      - Engagement session
      - Second photographer
      - Premium wedding album
      - Canvas prints
      - Online gallery
      - Print release
      
      **Add-ons Available:**
      - Additional hours: £150/hour
      - Extra photographer: £400
      - Drone photography: £300
      - Same-day preview: £200
    `,
    category: 'photography',
    tags: ['pricing', 'packages', 'photography', 'wedding'],
  },
  faq: {
    title: 'Frequently Asked Questions',
    content: `
      **Q: How many photos will we receive?**
      A: This depends on your package, but typically ranges from 300-800 edited photos.
      
      **Q: When will we receive our photos?**
      A: Your full gallery will be delivered within 4-6 weeks after your wedding.
      
      **Q: Do you travel for weddings?**
      A: Yes, we travel throughout the UK. Travel fees may apply for locations over 50 miles.
      
      **Q: What happens if you're sick on our wedding day?**
      A: We have a network of trusted photographers who can cover emergencies at no extra cost.
      
      **Q: Can we request specific shots?**
      A: Absolutely! We'll discuss your must-have shot list during our planning meeting.
    `,
    category: 'general',
    tags: ['faq', 'questions', 'answers', 'information'],
  },
};

// Helper functions
async function loginAsSupplier(page: Page) {
  await page.goto(`${TEST_CONFIG.baseUrl}/login`);
  await page.fill('[data-testid="email"]', TEST_CONFIG.testSupplier.email);
  await page.fill(
    '[data-testid="password"]',
    TEST_CONFIG.testSupplier.password,
  );
  await page.click('[data-testid="login-button"]');

  // Wait for successful login
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}

async function loginAsClient(page: Page) {
  await page.goto(`${TEST_CONFIG.baseUrl}/login`);
  await page.fill('[data-testid="email"]', TEST_CONFIG.testClient.email);
  await page.fill('[data-testid="password"]', TEST_CONFIG.testClient.password);
  await page.click('[data-testid="login-button"]');

  // Wait for successful login
  await page.waitForURL('**/couples/**', { timeout: 10000 });
}

async function createKnowledgeArticle(
  page: Page,
  article: typeof TEST_KNOWLEDGE_ARTICLES.timeline,
) {
  // Navigate to knowledge base
  await page.click('[data-testid="nav-knowledge"]');
  await page.waitForURL('**/knowledge', { timeout: 5000 });

  // Create new article
  await page.click('[data-testid="create-article-button"]');
  await page.waitForURL('**/knowledge/create', { timeout: 5000 });

  // Fill article form
  await page.fill('[data-testid="article-title"]', article.title);
  await page.selectOption('[data-testid="article-category"]', article.category);

  // Fill content using rich text editor
  const contentEditor = page.locator(
    '[data-testid="article-content"] .ProseMirror',
  );
  await contentEditor.click();
  await contentEditor.fill(article.content);

  // Add tags
  for (const tag of article.tags) {
    await page.fill('[data-testid="tag-input"]', tag);
    await page.keyboard.press('Enter');
  }

  // Save and publish
  await page.click('[data-testid="save-article"]');
  await page.click('[data-testid="publish-article"]');

  // Verify success
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  await expect(page.locator('[data-testid="article-status"]')).toHaveText(
    'Published',
  );

  return article.title;
}

async function searchKnowledgeBase(page: Page, query: string) {
  await page.goto(`${TEST_CONFIG.baseUrl}/knowledge`);

  const searchInput = page.locator('[data-testid="knowledge-search"]');
  await searchInput.fill(query);
  await page.keyboard.press('Enter');

  // Wait for search results
  await page.waitForSelector('[data-testid="search-results"]', {
    timeout: 5000,
  });
}

test.describe('Knowledge Base E2E Workflows', () => {
  test.beforeEach(async ({ context }) => {
    // Set up authentication context if needed
    await context.addInitScript(() => {
      // Mock any required localStorage or global variables
      window.localStorage.setItem('test-mode', 'true');
    });
  });

  test.describe('Content Creation Workflow', () => {
    test('supplier can create and publish knowledge articles', async ({
      page,
    }) => {
      await loginAsSupplier(page);

      // Create timeline article
      const articleTitle = await createKnowledgeArticle(
        page,
        TEST_KNOWLEDGE_ARTICLES.timeline,
      );

      // Verify article appears in knowledge base
      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge`);
      await expect(
        page.locator(`[data-testid="article-${articleTitle}"]`),
      ).toBeVisible();

      // Verify article content
      await page.click(`[data-testid="article-${articleTitle}"]`);
      await expect(page.locator('[data-testid="article-title"]')).toHaveText(
        articleTitle,
      );
      await expect(
        page.locator('[data-testid="article-content"]'),
      ).toContainText('6 Hours Before Ceremony');
    });

    test('articles are automatically indexed for search', async ({ page }) => {
      await loginAsSupplier(page);

      // Create pricing article
      await createKnowledgeArticle(page, TEST_KNOWLEDGE_ARTICLES.pricing);

      // Search for the article immediately
      await searchKnowledgeBase(page, 'photography pricing');

      // Verify article appears in search results
      const searchResults = page.locator(
        '[data-testid="search-results"] .search-result',
      );
      await expect(searchResults.first()).toContainText(
        'Photography Package Pricing Guide',
      );
    });

    test('AI recommendations are generated for new content', async ({
      page,
    }) => {
      await loginAsSupplier(page);

      // Create FAQ article
      await createKnowledgeArticle(page, TEST_KNOWLEDGE_ARTICLES.faq);

      // Check for AI recommendations
      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge`);
      await page.click('[data-testid="ai-recommendations-tab"]');

      // Should have recommendations for related content
      const recommendations = page.locator(
        '[data-testid="ai-recommendations"] .recommendation',
      );
      await expect(recommendations).toHaveCount.toBeGreaterThan(0);

      const firstRecommendation = recommendations.first();
      await expect(
        firstRecommendation.locator('.confidence-score'),
      ).toContainText(/\d+%/);
    });
  });

  test.describe('Search and Discovery Workflow', () => {
    test('clients can search and find relevant knowledge articles', async ({
      page,
    }) => {
      // First, create content as supplier
      await loginAsSupplier(page);
      await createKnowledgeArticle(page, TEST_KNOWLEDGE_ARTICLES.timeline);
      await createKnowledgeArticle(page, TEST_KNOWLEDGE_ARTICLES.pricing);

      // Logout and login as client
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout"]');
      await loginAsClient(page);

      // Search for wedding timeline information
      await searchKnowledgeBase(page, 'wedding day timeline');

      // Verify relevant results
      const searchResults = page.locator(
        '[data-testid="search-results"] .search-result',
      );
      await expect(searchResults.first()).toContainText('Wedding Day Timeline');

      // Click to read full article
      await searchResults.first().click();
      await expect(
        page.locator('[data-testid="article-content"]'),
      ).toContainText('Bridal preparations begin');
    });

    test('search suggestions and autocomplete work correctly', async ({
      page,
    }) => {
      await loginAsSupplier(page);
      await createKnowledgeArticle(page, TEST_KNOWLEDGE_ARTICLES.pricing);

      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge`);

      // Type partial query
      const searchInput = page.locator('[data-testid="knowledge-search"]');
      await searchInput.fill('photo');

      // Check for autocomplete suggestions
      const suggestions = page.locator('[data-testid="search-suggestions"]');
      await expect(suggestions).toBeVisible();
      await expect(suggestions.locator('.suggestion')).toContainText(
        'photography',
      );

      // Select suggestion
      await suggestions.locator('.suggestion').first().click();

      // Verify search was executed
      await expect(
        page.locator('[data-testid="search-results"]'),
      ).toBeVisible();
    });

    test('category filtering works in search', async ({ page }) => {
      await loginAsSupplier(page);
      await createKnowledgeArticle(page, TEST_KNOWLEDGE_ARTICLES.timeline);
      await createKnowledgeArticle(page, TEST_KNOWLEDGE_ARTICLES.pricing);

      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge`);

      // Filter by photography category
      await page.selectOption('[data-testid="category-filter"]', 'photography');

      // Verify only photography articles shown
      const results = page.locator(
        '[data-testid="knowledge-articles"] .article-card',
      );
      await expect(results).toHaveCount(1);
      await expect(results.first()).toContainText(
        'Photography Package Pricing Guide',
      );
    });
  });

  test.describe('AI Integration Workflow', () => {
    test('AI-generated content is properly marked and scored', async ({
      page,
    }) => {
      await loginAsSupplier(page);

      // Navigate to AI content generation
      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge/ai-generate`);

      // Generate content using AI
      await page.fill(
        '[data-testid="ai-prompt"]',
        'Create a guide about wedding venue selection criteria',
      );
      await page.selectOption('[data-testid="content-category"]', 'venue');
      await page.click('[data-testid="generate-content"]');

      // Wait for AI generation
      await page.waitForSelector('[data-testid="generated-content"]', {
        timeout: 15000,
      });

      // Verify AI confidence score is displayed
      const confidenceScore = page.locator(
        '[data-testid="ai-confidence-score"]',
      );
      await expect(confidenceScore).toBeVisible();
      await expect(confidenceScore).toContainText(/%/);

      // Accept and publish AI content
      await page.click('[data-testid="accept-ai-content"]');
      await page.click('[data-testid="publish-article"]');

      // Verify article is marked as AI-generated
      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge`);
      const aiArticle = page
        .locator('.article-card')
        .filter({ hasText: 'venue selection' });
      await expect(
        aiArticle.locator('[data-testid="ai-generated-badge"]'),
      ).toBeVisible();
    });

    test('AI suggestions improve search results', async ({ page }) => {
      await loginAsSupplier(page);
      await createKnowledgeArticle(page, TEST_KNOWLEDGE_ARTICLES.timeline);

      // Search for related but not exact topic
      await searchKnowledgeBase(page, 'wedding day schedule');

      // Check for AI-powered suggestions
      const aiSuggestions = page.locator(
        '[data-testid="ai-search-suggestions"]',
      );
      await expect(aiSuggestions).toBeVisible();
      await expect(aiSuggestions.locator('.suggestion')).toContainText(
        'timeline',
      );

      // Click AI suggestion
      await aiSuggestions.locator('.suggestion').first().click();

      // Verify improved search results
      const searchResults = page.locator(
        '[data-testid="search-results"] .search-result',
      );
      await expect(searchResults.first()).toContainText('Wedding Day Timeline');
    });
  });

  test.describe('FAQ Integration Workflow', () => {
    test('FAQs are automatically extracted from documents', async ({
      page,
    }) => {
      await loginAsSupplier(page);

      // Navigate to FAQ extraction
      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge/faq-extract`);

      // Upload a document (mock file upload)
      const fileInput = page.locator('[data-testid="document-upload"]');
      await fileInput.setInputFiles({
        name: 'wedding-info.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(
          'Sample wedding document content with questions and answers',
        ),
      });

      // Trigger extraction
      await page.click('[data-testid="extract-faqs"]');

      // Wait for extraction results
      await page.waitForSelector('[data-testid="extracted-faqs"]', {
        timeout: 10000,
      });

      // Verify extracted FAQs appear
      const extractedFaqs = page.locator(
        '[data-testid="extracted-faqs"] .faq-item',
      );
      await expect(extractedFaqs).toHaveCount.toBeGreaterThan(0);

      // Review and approve first FAQ
      await extractedFaqs.first().locator('[data-testid="review-faq"]').click();
      await page.click('[data-testid="approve-faq"]');

      // Verify FAQ appears in knowledge base
      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge`);
      await page.click('[data-testid="faq-tab"]');
      await expect(
        page.locator('[data-testid="faq-list"] .faq-item'),
      ).toHaveCount.toBeGreaterThan(0);
    });

    test('FAQ knowledge base analytics are accurate', async ({ page }) => {
      await loginAsSupplier(page);
      await createKnowledgeArticle(page, TEST_KNOWLEDGE_ARTICLES.faq);

      // Navigate to analytics
      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge/analytics`);

      // Verify analytics dashboard
      await expect(
        page.locator('[data-testid="total-articles"]'),
      ).toContainText('1');
      await expect(
        page.locator('[data-testid="published-articles"]'),
      ).toContainText('1');

      // Check category breakdown
      const categoryChart = page.locator('[data-testid="category-breakdown"]');
      await expect(categoryChart).toBeVisible();
      await expect(categoryChart).toContainText('general');

      // Verify search insights
      const searchInsights = page.locator('[data-testid="search-insights"]');
      await expect(searchInsights).toBeVisible();
    });
  });

  test.describe('Performance and Quality Workflows', () => {
    test('knowledge base search performs within acceptable limits', async ({
      page,
    }) => {
      await loginAsSupplier(page);

      // Create multiple articles for performance testing
      for (const article of Object.values(TEST_KNOWLEDGE_ARTICLES)) {
        await createKnowledgeArticle(page, article);
      }

      // Measure search performance
      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge`);

      const startTime = Date.now();
      await searchKnowledgeBase(page, 'wedding');
      const searchTime = Date.now() - startTime;

      // Verify search completed within 2 seconds
      expect(searchTime).toBeLessThan(2000);

      // Verify results are relevant
      const searchResults = page.locator(
        '[data-testid="search-results"] .search-result',
      );
      await expect(searchResults).toHaveCount.toBeGreaterThan(0);
    });

    test('knowledge quality scoring works correctly', async ({ page }) => {
      await loginAsSupplier(page);
      await createKnowledgeArticle(page, TEST_KNOWLEDGE_ARTICLES.pricing);

      // Navigate to quality dashboard
      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge/quality`);

      // Verify quality metrics
      await expect(
        page.locator('[data-testid="avg-quality-score"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="high-quality-count"]'),
      ).toBeVisible();

      // Check quality recommendations
      const recommendations = page.locator(
        '[data-testid="quality-recommendations"]',
      );
      await expect(recommendations).toBeVisible();

      // Verify improvement suggestions
      const improvements = page.locator(
        '[data-testid="improvement-suggestions"] .suggestion',
      );
      await expect(improvements).toHaveCount.toBeGreaterThan(0);
    });
  });

  test.describe('Mobile Responsive Workflow', () => {
    test('knowledge base works on mobile devices', async ({
      page,
      context,
    }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await loginAsSupplier(page);
      await createKnowledgeArticle(page, TEST_KNOWLEDGE_ARTICLES.timeline);

      // Test mobile search
      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge`);

      // Mobile search should be accessible
      const mobileSearch = page.locator('[data-testid="mobile-search-toggle"]');
      await mobileSearch.click();

      const searchInput = page.locator('[data-testid="mobile-search-input"]');
      await expect(searchInput).toBeVisible();

      // Perform search on mobile
      await searchInput.fill('timeline');
      await page.keyboard.press('Enter');

      // Verify mobile-optimized results
      const mobileResults = page.locator(
        '[data-testid="mobile-search-results"]',
      );
      await expect(mobileResults).toBeVisible();

      // Test mobile article reading
      await mobileResults.locator('.result-item').first().click();
      await expect(
        page.locator('[data-testid="mobile-article-view"]'),
      ).toBeVisible();
    });
  });

  test.describe('Error Handling Workflows', () => {
    test('graceful handling of search service errors', async ({ page }) => {
      await loginAsSupplier(page);

      // Mock search service error
      await page.route('**/api/knowledge/search', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Search service unavailable' }),
        });
      });

      await searchKnowledgeBase(page, 'test query');

      // Verify error is handled gracefully
      const errorMessage = page.locator('[data-testid="search-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Unable to perform search');

      // Verify fallback suggestions are shown
      const fallbackSuggestions = page.locator(
        '[data-testid="fallback-suggestions"]',
      );
      await expect(fallbackSuggestions).toBeVisible();
    });

    test('handling of malformed or missing content', async ({ page }) => {
      await loginAsSupplier(page);

      // Navigate to article with missing content
      await page.goto(
        `${TEST_CONFIG.baseUrl}/knowledge/article/nonexistent-id`,
      );

      // Verify 404 handling
      const notFoundMessage = page.locator('[data-testid="article-not-found"]');
      await expect(notFoundMessage).toBeVisible();
      await expect(notFoundMessage).toContainText('Article not found');

      // Verify suggested alternatives
      const suggestions = page.locator('[data-testid="suggested-articles"]');
      await expect(suggestions).toBeVisible();
    });
  });

  test.describe('Integration with External Services', () => {
    test('knowledge base syncs with CRM data', async ({ page }) => {
      await loginAsSupplier(page);

      // Navigate to integration settings
      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge/integrations`);

      // Enable CRM sync
      await page.check('[data-testid="crm-sync-enabled"]');
      await page.click('[data-testid="save-integration-settings"]');

      // Trigger sync
      await page.click('[data-testid="sync-crm-data"]');

      // Wait for sync completion
      await page.waitForSelector('[data-testid="sync-complete"]', {
        timeout: 15000,
      });

      // Verify CRM data appears in knowledge base
      await page.goto(`${TEST_CONFIG.baseUrl}/knowledge`);
      await searchKnowledgeBase(page, 'client question');

      // Should find articles generated from CRM data
      const crmResults = page.locator(
        '[data-testid="search-results"] .crm-sourced',
      );
      await expect(crmResults).toHaveCount.toBeGreaterThan(0);
    });
  });
});

// Utility function for parallel test execution
test.describe.parallel('Performance Tests', () => {
  test('concurrent search requests handle properly', async ({
    page,
    context,
  }) => {
    await loginAsSupplier(page);

    // Create test content
    for (const article of Object.values(TEST_KNOWLEDGE_ARTICLES)) {
      await createKnowledgeArticle(page, article);
    }

    // Execute multiple concurrent searches
    const searchPromises = [
      'wedding timeline',
      'photography pricing',
      'venue selection',
      'FAQ questions',
    ].map((query) => {
      return page.evaluate(async (searchQuery) => {
        const response = await fetch('/api/placeholder');
        return response.json();
      }, query);
    });

    // Wait for all searches to complete
    const results = await Promise.all(searchPromises);

    // Verify all searches returned results
    results.forEach((result) => {
      expect(result.success).toBe(true);
      expect(result.data.articles).toBeDefined();
    });
  });
});
