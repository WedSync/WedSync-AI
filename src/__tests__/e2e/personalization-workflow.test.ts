/**
 * AI Content Personalization E2E Workflow Tests - WS-209 Team E
 *
 * End-to-end testing for the complete AI personalization workflow
 * Simulates real user interactions from template generation to final personalized email
 *
 * Test Scenarios:
 * 1. Complete Template Generation Workflow
 * 2. Personalization Panel User Interactions
 * 3. Live Preview Functionality
 * 4. A/B Testing Variant Selection
 * 5. Email Template Library Management
 * 6. Error Recovery and Edge Cases
 * 7. Mobile/Responsive Experience
 * 8. Performance Under Load
 * 9. Multi-vendor Workflow Testing
 * 10. Integration with External Services
 *
 * @author Team E - Testing & Documentation Specialists
 * @date 2025-01-20
 * @feature WS-209 - AI Content Personalization Engine
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { EmailTemplateGenerator } from '../../lib/ai/email-template-generator';
import {
  ClientContext,
  VendorContext,
  PersonalizationRule,
  EmailPreviewData,
} from '../../types/ai-email';

// Test data fixtures
const testVendorContext: VendorContext = {
  business_name: 'Elegant Photography Studio',
  primary_category: 'photographer',
  years_experience: 8,
  specialties: [
    'Wedding Photography',
    'Portrait Sessions',
    'Engagement Shoots',
  ],
  unique_selling_points: [
    'Award-winning',
    'Same-day editing',
    'Drone photography',
  ],
  pricing_structure: 'Package-based with custom options',
  availability_status: 'available',
};

const testClientContext: ClientContext = {
  couple_names: 'Sarah & Michael',
  wedding_date: '2025-06-15',
  venue_name: 'The Grand Ballroom',
  venue_type: 'indoor',
  guest_count: 120,
  style_preference: 'classic elegance',
  budget_range: 'mid',
  special_requirements: 'Vegetarian meal options',
};

// Page Object Models for cleaner test organization
class PersonalizationWorkflowPage {
  constructor(public page: Page) {}

  async navigateToEmailTemplateGenerator() {
    await this.page.goto('/dashboard/email-templates/generate');
    await this.page.waitForLoadState('networkidle');
  }

  async fillTemplateGenerationForm(config: {
    templateName: string;
    vendorType: string;
    stage: string;
    tone: string;
    variantCount: number;
  }) {
    await this.page.fill(
      '[data-testid="template-name-input"]',
      config.templateName,
    );
    await this.page.selectOption(
      '[data-testid="vendor-type-select"]',
      config.vendorType,
    );
    await this.page.selectOption('[data-testid="stage-select"]', config.stage);
    await this.page.selectOption('[data-testid="tone-select"]', config.tone);
    await this.page.fill(
      '[data-testid="variant-count-input"]',
      config.variantCount.toString(),
    );
  }

  async clickGenerateTemplates() {
    await this.page.click('[data-testid="generate-templates-button"]');
  }

  async waitForGenerationComplete() {
    await this.page.waitForSelector('[data-testid="generation-complete"]', {
      timeout: 30000,
    });
  }

  async selectVariant(variantIndex: number) {
    await this.page.click(`[data-testid="variant-card-${variantIndex}"]`);
  }

  async openPersonalizationPanel() {
    await this.page.click('[data-testid="personalize-button"]');
    await this.page.waitForSelector('[data-testid="personalization-panel"]');
  }

  async fillMergeTag(token: string, value: string) {
    const input = this.page.locator(`[data-testid="merge-tag-input-${token}"]`);
    await input.clear();
    await input.fill(value);
  }

  async switchToPreviewTab() {
    await this.page.click('[data-testid="preview-tab"]');
  }

  async switchToRulesTab() {
    await this.page.click('[data-testid="rules-tab"]');
  }

  async clickSavePersonalization() {
    await this.page.click('[data-testid="save-personalization-button"]');
  }

  async clickPreviewEmail() {
    await this.page.click('[data-testid="preview-email-button"]');
  }

  async waitForPreviewUpdate() {
    await this.page.waitForSelector('[data-testid="preview-updated"]', {
      timeout: 5000,
    });
  }

  async getValidationError(token: string): Promise<string | null> {
    const errorElement = this.page.locator(
      `[data-testid="validation-error-${token}"]`,
    );
    return (await errorElement.isVisible())
      ? await errorElement.textContent()
      : null;
  }

  async getPreviewContent(): Promise<{ subject: string; content: string }> {
    const subject =
      (await this.page
        .locator('[data-testid="preview-subject"]')
        .textContent()) || '';
    const content =
      (await this.page
        .locator('[data-testid="preview-content"]')
        .textContent()) || '';
    return { subject, content };
  }

  async getGeneratedVariantCount(): Promise<number> {
    return await this.page.locator('[data-testid^="variant-card-"]').count();
  }

  async openABTestModal() {
    await this.page.click('[data-testid="ab-test-button"]');
    await this.page.waitForSelector('[data-testid="ab-test-modal"]');
  }

  async selectVariantsForABTest(variantIndices: number[]) {
    for (const index of variantIndices) {
      await this.page.check(
        `[data-testid="ab-test-variant-checkbox-${index}"]`,
      );
    }
  }

  async startABTest(testConfig: {
    name: string;
    sampleSize: number;
    duration: number;
  }) {
    await this.page.fill('[data-testid="ab-test-name"]', testConfig.name);
    await this.page.fill(
      '[data-testid="ab-test-sample-size"]',
      testConfig.sampleSize.toString(),
    );
    await this.page.fill(
      '[data-testid="ab-test-duration"]',
      testConfig.duration.toString(),
    );
    await this.page.click('[data-testid="start-ab-test-button"]');
  }

  async navigateToTemplateLibrary() {
    await this.page.goto('/dashboard/email-templates');
    await this.page.waitForLoadState('networkidle');
  }

  async searchTemplateLibrary(query: string) {
    await this.page.fill('[data-testid="template-search-input"]', query);
    await this.page.press('[data-testid="template-search-input"]', 'Enter');
  }

  async filterTemplatesByVendorType(vendorType: string) {
    await this.page.selectOption(
      '[data-testid="vendor-type-filter"]',
      vendorType,
    );
  }

  async getTemplateLibraryCount(): Promise<number> {
    return await this.page.locator('[data-testid^="template-card-"]').count();
  }
}

// Test suite setup
test.describe('AI Content Personalization E2E Workflow', () => {
  let page: Page;
  let context: BrowserContext;
  let workflowPage: PersonalizationWorkflowPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ['notifications'],
    });
    page = await context.newPage();
    workflowPage = new PersonalizationWorkflowPage(page);

    // Mock API responses for consistent testing
    await page.route('**/api/ai/generate-templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          templates: [
            {
              id: 'template-1',
              templateName: 'Photography Inquiry Response',
              subject: 'Your Wedding Photography Journey with {vendor_name}',
              body: '<p>Dear {couple_names},</p><p>Thank you for considering {vendor_name} for your special day on {wedding_date} at {venue_name}. We would be honored to capture your love story.</p>',
              mergeTagsUsed: [
                '{couple_names}',
                '{wedding_date}',
                '{venue_name}',
                '{vendor_name}',
              ],
              aiMetadata: {
                model: 'gpt-4',
                tokensUsed: { prompt: 150, completion: 100, total: 250 },
                generationTimeMs: 2500,
                promptUsed: 'System prompt for photographer inquiry',
              },
            },
            {
              id: 'template-2',
              templateName: 'Photography Inquiry Response - Variant B',
              subject: "Let's Create Magic Together - {couple_names}!",
              body: '<p>Hello {couple_names}!</p><p>Your inquiry about photography services for {wedding_date} has absolutely made our day! {venue_name} is such a beautiful choice.</p>',
              mergeTagsUsed: [
                '{couple_names}',
                '{wedding_date}',
                '{venue_name}',
              ],
              variant: { label: 'B', performanceScore: 0 },
              aiMetadata: {
                model: 'gpt-4',
                tokensUsed: { prompt: 155, completion: 95, total: 250 },
                generationTimeMs: 2300,
                promptUsed: 'System prompt for photographer inquiry - variant',
              },
            },
          ],
          totalTokensUsed: 500,
          totalGenerationTime: 4800,
        }),
      });
    });

    await page.route('**/api/ai/preview-email', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subject:
            'Your Wedding Photography Journey with Elegant Photography Studio',
          html_content:
            '<p>Dear Sarah & Michael,</p><p>Thank you for considering Elegant Photography Studio for your special day on 2025-06-15 at The Grand Ballroom. We would be honored to capture your love story.</p>',
          personalized_subject:
            'Your Wedding Photography Journey with Elegant Photography Studio',
          personalized_html_content:
            '<p>Dear Sarah & Michael,</p><p>Thank you for considering Elegant Photography Studio for your special day on June 15th, 2025 at The Grand Ballroom. We would be honored to capture your love story.</p>',
          merge_tags_used: [
            '{couple_names}',
            '{wedding_date}',
            '{venue_name}',
            '{vendor_name}',
          ],
          estimated_render_time: 250,
        }),
      });
    });

    // Login simulation
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@vendor.com');
    await page.fill('[data-testid="password-input"]', 'testpass123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('1. Complete Template Generation Workflow', () => {
    test('should successfully generate AI email templates with multiple variants', async () => {
      await workflowPage.navigateToEmailTemplateGenerator();

      // Fill template generation form
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Photography Inquiry Response - E2E Test',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 2,
      });

      // Generate templates
      await workflowPage.clickGenerateTemplates();
      await workflowPage.waitForGenerationComplete();

      // Verify templates were generated
      const variantCount = await workflowPage.getGeneratedVariantCount();
      expect(variantCount).toBe(2);

      // Verify template content is present
      const templateCard = page.locator('[data-testid="variant-card-0"]');
      await expect(templateCard).toContainText('Photography Inquiry Response');
      await expect(templateCard).toContainText('{couple_names}');
    });

    test('should handle generation errors gracefully', async () => {
      // Mock API error
      await page.route('**/api/ai/generate-templates', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error:
              'OpenAI API rate limit exceeded. Please try again in 60 seconds.',
          }),
        });
      });

      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Error Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();

      // Verify error message is displayed
      const errorMessage = page.locator('[data-testid="generation-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('rate limit exceeded');
    });

    test('should validate required form fields before generation', async () => {
      await workflowPage.navigateToEmailTemplateGenerator();

      // Try to generate without filling required fields
      await workflowPage.clickGenerateTemplates();

      // Verify validation errors
      const templateNameError = page.locator(
        '[data-testid="template-name-error"]',
      );
      await expect(templateNameError).toBeVisible();
      await expect(templateNameError).toContainText(
        'Template name is required',
      );
    });
  });

  test.describe('2. Personalization Panel User Interactions', () => {
    test('should open personalization panel and populate merge tags', async () => {
      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Personalization Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();
      await workflowPage.waitForGenerationComplete();
      await workflowPage.selectVariant(0);
      await workflowPage.openPersonalizationPanel();

      // Verify personalization panel is open
      const personalizationPanel = page.locator(
        '[data-testid="personalization-panel"]',
      );
      await expect(personalizationPanel).toBeVisible();

      // Fill merge tags
      await workflowPage.fillMergeTag('couple_names', 'Sarah & Michael');
      await workflowPage.fillMergeTag('wedding_date', '2025-06-15');
      await workflowPage.fillMergeTag('venue_name', 'The Grand Ballroom');
      await workflowPage.fillMergeTag(
        'vendor_name',
        'Elegant Photography Studio',
      );

      // Verify merge tag inputs are filled
      const coupleNamesInput = page.locator(
        '[data-testid="merge-tag-input-couple_names"]',
      );
      await expect(coupleNamesInput).toHaveValue('Sarah & Michael');
    });

    test('should validate required merge tags', async () => {
      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Validation Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();
      await workflowPage.waitForGenerationComplete();
      await workflowPage.selectVariant(0);
      await workflowPage.openPersonalizationPanel();

      // Leave required field empty and try to save
      await workflowPage.fillMergeTag('couple_names', '');
      await workflowPage.clickSavePersonalization();

      // Verify validation error
      const validationError =
        await workflowPage.getValidationError('couple_names');
      expect(validationError).toContain('required');
    });

    test('should auto-populate merge tags from client context', async () => {
      // Mock client context in session storage or API
      await page.evaluate((clientContext) => {
        window.localStorage.setItem(
          'clientContext',
          JSON.stringify(clientContext),
        );
      }, testClientContext);

      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Auto-populate Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();
      await workflowPage.waitForGenerationComplete();
      await workflowPage.selectVariant(0);
      await workflowPage.openPersonalizationPanel();

      // Verify auto-populated values
      const coupleNamesInput = page.locator(
        '[data-testid="merge-tag-input-couple_names"]',
      );
      const weddingDateInput = page.locator(
        '[data-testid="merge-tag-input-wedding_date"]',
      );

      await expect(coupleNamesInput).toHaveValue('Sarah & Michael');
      await expect(weddingDateInput).toHaveValue('2025-06-15');
    });
  });

  test.describe('3. Live Preview Functionality', () => {
    test('should update preview content when merge tags change', async () => {
      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Live Preview Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();
      await workflowPage.waitForGenerationComplete();
      await workflowPage.selectVariant(0);
      await workflowPage.openPersonalizationPanel();

      // Switch to preview tab
      await workflowPage.switchToPreviewTab();

      // Initially should show template with merge tags
      let previewContent = await workflowPage.getPreviewContent();
      expect(previewContent.content).toContain('{couple_names}');

      // Switch back to rules tab and fill merge tags
      await workflowPage.switchToRulesTab();
      await workflowPage.fillMergeTag('couple_names', 'Sarah & Michael');
      await workflowPage.fillMergeTag(
        'vendor_name',
        'Elegant Photography Studio',
      );

      // Wait for live preview update
      await workflowPage.waitForPreviewUpdate();

      // Switch back to preview tab and verify updated content
      await workflowPage.switchToPreviewTab();
      previewContent = await workflowPage.getPreviewContent();
      expect(previewContent.content).toContain('Sarah & Michael');
      expect(previewContent.content).toContain('Elegant Photography Studio');
      expect(previewContent.content).not.toContain('{couple_names}');
    });

    test('should display preview statistics and metrics', async () => {
      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Preview Metrics Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();
      await workflowPage.waitForGenerationComplete();
      await workflowPage.selectVariant(0);
      await workflowPage.openPersonalizationPanel();
      await workflowPage.switchToPreviewTab();

      // Fill merge tags first
      await workflowPage.switchToRulesTab();
      await workflowPage.fillMergeTag('couple_names', 'Sarah & Michael');
      await workflowPage.clickPreviewEmail();

      // Switch to preview and verify metrics
      await workflowPage.switchToPreviewTab();

      const tagsUsedMetric = page.locator('[data-testid="preview-tags-used"]');
      const renderTimeMetric = page.locator(
        '[data-testid="preview-render-time"]',
      );

      await expect(tagsUsedMetric).toBeVisible();
      await expect(renderTimeMetric).toBeVisible();
      await expect(tagsUsedMetric).toContainText('4'); // 4 tags used
      await expect(renderTimeMetric).toContainText('250ms');
    });

    test('should show content warnings when inappropriate content is detected', async () => {
      // Mock preview response with warnings
      await page.route('**/api/ai/preview-email', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            subject: 'URGENT: Wedding Photography DEAL!!!',
            html_content:
              '<p>Dear Sarah & Michael,</p><p>This is a LIMITED TIME OFFER that you MUST respond to IMMEDIATELY!</p>',
            personalized_subject: 'URGENT: Wedding Photography DEAL!!!',
            personalized_html_content:
              '<p>Dear Sarah & Michael,</p><p>This is a LIMITED TIME OFFER that you MUST respond to IMMEDIATELY!</p>',
            merge_tags_used: ['{couple_names}'],
            estimated_render_time: 250,
            content_warnings: [
              'Subject contains urgent/alarming language',
              'Content contains pressure tactics',
              'Excessive use of capital letters',
            ],
          }),
        });
      });

      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Content Warning Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();
      await workflowPage.waitForGenerationComplete();
      await workflowPage.selectVariant(0);
      await workflowPage.openPersonalizationPanel();
      await workflowPage.fillMergeTag('couple_names', 'Sarah & Michael');
      await workflowPage.clickPreviewEmail();
      await workflowPage.switchToPreviewTab();

      // Verify content warnings are displayed
      const contentWarnings = page.locator('[data-testid="content-warnings"]');
      await expect(contentWarnings).toBeVisible();
      await expect(contentWarnings).toContainText('urgent/alarming language');
      await expect(contentWarnings).toContainText('pressure tactics');
    });
  });

  test.describe('4. A/B Testing Variant Selection', () => {
    test('should create A/B test with selected variants', async () => {
      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'A/B Testing Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 2,
      });

      await workflowPage.clickGenerateTemplates();
      await workflowPage.waitForGenerationComplete();

      // Open A/B test modal
      await workflowPage.openABTestModal();

      // Select variants for A/B test
      await workflowPage.selectVariantsForABTest([0, 1]);

      // Configure and start A/B test
      await workflowPage.startABTest({
        name: 'Photography Inquiry Response Test',
        sampleSize: 100,
        duration: 7,
      });

      // Verify A/B test was created
      const successMessage = page.locator('[data-testid="ab-test-success"]');
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toContainText(
        'A/B test started successfully',
      );
    });

    test('should show variant comparison side-by-side', async () => {
      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Variant Comparison Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 2,
      });

      await workflowPage.clickGenerateTemplates();
      await workflowPage.waitForGenerationTime();

      // Enable comparison mode
      await page.click('[data-testid="comparison-mode-toggle"]');

      // Verify side-by-side comparison is visible
      const comparisonView = page.locator('[data-testid="variant-comparison"]');
      await expect(comparisonView).toBeVisible();

      const variantA = page.locator('[data-testid="comparison-variant-a"]');
      const variantB = page.locator('[data-testid="comparison-variant-b"]');

      await expect(variantA).toBeVisible();
      await expect(variantB).toBeVisible();
    });
  });

  test.describe('5. Email Template Library Management', () => {
    test('should save generated template to library', async () => {
      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Library Save Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();
      await workflowPage.waitForGenerationComplete();
      await workflowPage.selectVariant(0);

      // Save template to library
      await page.click('[data-testid="save-to-library-button"]');

      // Verify save confirmation
      const saveConfirmation = page.locator(
        '[data-testid="save-confirmation"]',
      );
      await expect(saveConfirmation).toBeVisible();

      // Navigate to template library and verify template is saved
      await workflowPage.navigateToTemplateLibrary();
      await workflowPage.searchTemplateLibrary('Library Save Test Template');

      const templateCard = page
        .locator('[data-testid^="template-card-"]')
        .first();
      await expect(templateCard).toBeVisible();
      await expect(templateCard).toContainText('Library Save Test Template');
    });

    test('should filter template library by vendor type and stage', async () => {
      await workflowPage.navigateToTemplateLibrary();

      // Apply vendor type filter
      await workflowPage.filterTemplatesByVendorType('photographer');

      // Verify filtered results
      const templateCount = await workflowPage.getTemplateLibraryCount();
      expect(templateCount).toBeGreaterThan(0);

      // Verify all templates are for photographer
      const templateCards = page.locator('[data-testid^="template-card-"]');
      const cardCount = await templateCards.count();

      for (let i = 0; i < cardCount; i++) {
        const card = templateCards.nth(i);
        await expect(card).toContainText('photographer');
      }
    });

    test('should search template library by keywords', async () => {
      await workflowPage.navigateToTemplateLibrary();

      // Search for photography templates
      await workflowPage.searchTemplateLibrary('photography');

      // Verify search results contain photography-related templates
      const templateCards = page.locator('[data-testid^="template-card-"]');
      const cardCount = await templateCards.count();

      expect(cardCount).toBeGreaterThan(0);

      for (let i = 0; i < cardCount; i++) {
        const card = templateCards.nth(i);
        const cardText = (await card.textContent()) || '';
        expect(cardText.toLowerCase()).toMatch(/photo|photography|camera/i);
      }
    });
  });

  test.describe('6. Error Recovery and Edge Cases', () => {
    test('should handle network failures during generation', async () => {
      // Simulate network failure
      await page.route('**/api/ai/generate-templates', async (route) => {
        await route.abort('failed');
      });

      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Network Failure Test',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();

      // Verify error handling
      const networkError = page.locator('[data-testid="network-error"]');
      await expect(networkError).toBeVisible();
      await expect(networkError).toContainText('network error');

      // Verify retry button is available
      const retryButton = page.locator(
        '[data-testid="retry-generation-button"]',
      );
      await expect(retryButton).toBeVisible();
    });

    test('should handle malformed API responses gracefully', async () => {
      // Mock malformed response
      await page.route('**/api/ai/generate-templates', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response',
        });
      });

      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Malformed Response Test',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();

      // Verify error handling for malformed response
      const parseError = page.locator('[data-testid="parse-error"]');
      await expect(parseError).toBeVisible();
    });

    test('should handle browser refresh during generation', async () => {
      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Refresh Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();

      // Refresh page during generation
      await page.reload();

      // Verify graceful recovery
      const recoveryMessage = page.locator('[data-testid="recovery-message"]');
      await expect(recoveryMessage).toBeVisible();
      await expect(recoveryMessage).toContainText('session restored');
    });
  });

  test.describe('7. Mobile/Responsive Experience', () => {
    test('should work correctly on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await workflowPage.navigateToEmailTemplateGenerator();

      // Verify mobile layout
      const mobileContainer = page.locator(
        '[data-testid="mobile-template-generator"]',
      );
      await expect(mobileContainer).toBeVisible();

      // Fill form on mobile
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Mobile Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();
      await workflowPage.waitForGenerationComplete();

      // Verify template cards stack vertically on mobile
      const templateCards = page.locator('[data-testid^="variant-card-"]');
      const firstCard = templateCards.first();
      const cardBox = await firstCard.boundingBox();
      expect(cardBox?.width).toBeLessThan(400); // Should fit mobile width
    });

    test('should have touch-friendly interactions', async () => {
      await page.setViewportSize({ width: 375, height: 667 });

      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Touch Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();
      await workflowPage.waitForGenerationComplete();

      // Test touch interactions
      const templateCard = page.locator('[data-testid="variant-card-0"]');

      // Tap to select (should work with touch)
      await templateCard.tap();
      await expect(templateCard).toHaveClass(/selected/);

      // Test personalization panel on mobile
      await workflowPage.openPersonalizationPanel();

      const personalizationPanel = page.locator(
        '[data-testid="personalization-panel"]',
      );
      await expect(personalizationPanel).toBeVisible();

      // Verify form inputs are touch-friendly (minimum 44px height)
      const mergeTagInputs = page.locator('[data-testid^="merge-tag-input-"]');
      const inputCount = await mergeTagInputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = mergeTagInputs.nth(i);
        const inputBox = await input.boundingBox();
        expect(inputBox?.height).toBeGreaterThanOrEqual(44); // Touch-friendly size
      }
    });
  });

  test.describe('8. Performance Under Load', () => {
    test('should handle multiple concurrent template generations', async () => {
      const startTime = Date.now();

      // Start multiple generations in parallel
      const generationPromises = Array.from({ length: 3 }, async (_, index) => {
        const newPage = await context.newPage();
        const newWorkflowPage = new PersonalizationWorkflowPage(newPage);

        await newWorkflowPage.navigateToEmailTemplateGenerator();
        await newWorkflowPage.fillTemplateGenerationForm({
          templateName: `Load Test Template ${index + 1}`,
          vendorType: 'photographer',
          stage: 'inquiry',
          tone: 'friendly',
          variantCount: 1,
        });

        await newWorkflowPage.clickGenerateTemplates();
        await newWorkflowPage.waitForGenerationComplete();

        const variantCount = await newWorkflowPage.getGeneratedVariantCount();
        await newPage.close();

        return variantCount;
      });

      const results = await Promise.all(generationPromises);
      const endTime = Date.now();

      // Verify all generations completed successfully
      expect(results).toEqual([1, 1, 1]);

      // Verify reasonable performance (should complete within 30 seconds)
      expect(endTime - startTime).toBeLessThan(30000);
    });

    test('should maintain responsiveness during generation', async () => {
      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Responsiveness Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();

      // Test UI responsiveness during generation
      const cancelButton = page.locator(
        '[data-testid="cancel-generation-button"]',
      );
      await expect(cancelButton).toBeVisible();
      await expect(cancelButton).toBeEnabled();

      // Verify progress indicator updates
      const progressBar = page.locator('[data-testid="generation-progress"]');
      await expect(progressBar).toBeVisible();

      // Test navigation while generating (should show warning)
      await page.click('[data-testid="navigation-menu"]');
      const navigationWarning = page.locator(
        '[data-testid="navigation-warning"]',
      );
      await expect(navigationWarning).toBeVisible();
    });
  });

  test.describe('9. Multi-vendor Workflow Testing', () => {
    test('should generate appropriate content for different vendor types', async () => {
      const vendorTypes = ['photographer', 'dj', 'caterer', 'venue', 'florist'];

      for (const vendorType of vendorTypes) {
        await workflowPage.navigateToEmailTemplateGenerator();
        await workflowPage.fillTemplateGenerationForm({
          templateName: `${vendorType} Inquiry Response`,
          vendorType,
          stage: 'inquiry',
          tone: 'professional',
          variantCount: 1,
        });

        await workflowPage.clickGenerateTemplates();
        await workflowPage.waitForGenerationComplete();

        // Verify vendor-specific content
        const templateCard = page.locator('[data-testid="variant-card-0"]');
        const cardText = (await templateCard.textContent()) || '';

        switch (vendorType) {
          case 'photographer':
            expect(cardText.toLowerCase()).toMatch(
              /photo|camera|capture|shoot/i,
            );
            break;
          case 'dj':
            expect(cardText.toLowerCase()).toMatch(
              /music|sound|dance|entertainment/i,
            );
            break;
          case 'caterer':
            expect(cardText.toLowerCase()).toMatch(
              /food|menu|catering|cuisine/i,
            );
            break;
          case 'venue':
            expect(cardText.toLowerCase()).toMatch(
              /venue|space|location|capacity/i,
            );
            break;
          case 'florist':
            expect(cardText.toLowerCase()).toMatch(
              /flower|bouquet|floral|arrangement/i,
            );
            break;
        }
      }
    });
  });

  test.describe('10. Integration with External Services', () => {
    test('should handle OpenAI API rate limiting gracefully', async () => {
      // Mock rate limit response
      await page.route('**/api/ai/generate-templates', async (route) => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Rate limit exceeded',
            retry_after: 60,
          }),
        });
      });

      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Rate Limit Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();

      // Verify rate limit handling
      const rateLimitMessage = page.locator(
        '[data-testid="rate-limit-message"]',
      );
      await expect(rateLimitMessage).toBeVisible();
      await expect(rateLimitMessage).toContainText('Rate limit exceeded');
      await expect(rateLimitMessage).toContainText('60 seconds');

      // Verify retry timer
      const retryTimer = page.locator('[data-testid="retry-timer"]');
      await expect(retryTimer).toBeVisible();
    });

    test('should save templates to Supabase database', async () => {
      // Mock successful database save
      await page.route('**/api/templates/save', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            template_id: 'template-saved-123',
          }),
        });
      });

      await workflowPage.navigateToEmailTemplateGenerator();
      await workflowPage.fillTemplateGenerationForm({
        templateName: 'Database Save Test Template',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        variantCount: 1,
      });

      await workflowPage.clickGenerateTemplates();
      await workflowPage.waitForGenerationComplete();
      await workflowPage.selectVariant(0);

      // Save to database
      await page.click('[data-testid="save-to-database-button"]');

      // Verify save confirmation
      const saveSuccess = page.locator('[data-testid="database-save-success"]');
      await expect(saveSuccess).toBeVisible();
      await expect(saveSuccess).toContainText('Template saved successfully');
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should be keyboard navigable', async () => {
      await workflowPage.navigateToEmailTemplateGenerator();

      // Test keyboard navigation through form
      await page.keyboard.press('Tab'); // Template name input
      await page.keyboard.type('Keyboard Navigation Test');

      await page.keyboard.press('Tab'); // Vendor type select
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      await page.keyboard.press('Tab'); // Stage select
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      await page.keyboard.press('Tab'); // Tone select
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      await page.keyboard.press('Tab'); // Generate button
      await page.keyboard.press('Enter');

      await workflowPage.waitForGenerationComplete();

      // Verify generation completed successfully using keyboard only
      const variantCount = await workflowPage.getGeneratedVariantCount();
      expect(variantCount).toBeGreaterThan(0);
    });

    test('should have proper ARIA labels and semantic markup', async () => {
      await workflowPage.navigateToEmailTemplateGenerator();

      // Check form accessibility
      const templateNameInput = page.locator(
        '[data-testid="template-name-input"]',
      );
      await expect(templateNameInput).toHaveAttribute('aria-label');

      const vendorTypeSelect = page.locator(
        '[data-testid="vendor-type-select"]',
      );
      await expect(vendorTypeSelect).toHaveAttribute('aria-label');

      const generateButton = page.locator(
        '[data-testid="generate-templates-button"]',
      );
      await expect(generateButton).toHaveAttribute('aria-describedby');

      // Check heading hierarchy
      const mainHeading = page.locator('h1');
      await expect(mainHeading).toBeVisible();

      const sectionHeadings = page.locator('h2');
      const headingCount = await sectionHeadings.count();
      expect(headingCount).toBeGreaterThan(0);
    });
  });
});

// Helper functions
async function waitForGenerationComplete(page: Page, timeout = 30000) {
  await page.waitForSelector('[data-testid="generation-complete"]', {
    timeout,
  });
}

// Custom matchers for better test readability
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
