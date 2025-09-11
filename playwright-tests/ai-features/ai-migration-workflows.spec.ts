/**
 * WS-239 AI Migration Workflows E2E Tests
 * End-to-end testing of AI migration user journeys with visual validation
 * Tests complete user workflows from platform to client AI and vice versa
 */

import { test, expect } from '@playwright/test'
import { LoginHelper } from '../helpers/login-helper'
import { AISettingsHelper } from '../helpers/ai-settings-helper'
import { MockDataHelper } from '../helpers/mock-data-helper'

// Test data for different supplier types
const testSuppliers = {
  photographer: {
    email: 'photographer@test.wedsync.com',
    password: 'TestPassword123!',
    name: 'Elite Photography Studio',
    subscription_tier: 'professional',
    current_usage: 850, // Close to 1000 limit
    monthly_weddings: 15
  },
  venue: {
    email: 'venue@test.wedsync.com', 
    password: 'TestPassword123!',
    name: 'Garden Manor Venue',
    subscription_tier: 'scale',
    current_usage: 1200, // Over 1000, under 2000 
    monthly_events: 8
  },
  planner: {
    email: 'planner@test.wedsync.com',
    password: 'TestPassword123!',
    name: 'Dream Weddings Planning',
    subscription_tier: 'enterprise',
    current_usage: 3500, // High volume user
    client_portfolio: 25
  }
}

test.describe('AI Migration Workflows - WS-239', () => {
  let loginHelper: LoginHelper
  let aiHelper: AISettingsHelper
  let mockData: MockDataHelper

  test.beforeEach(async ({ page }) => {
    loginHelper = new LoginHelper(page)
    aiHelper = new AISettingsHelper(page)
    mockData = new MockDataHelper(page)

    // Setup mock data for testing
    await mockData.setupAIMigrationTestData()
  })

  test.describe('Platform to Client Migration Journey', () => {
    test('should guide photographer through quota limit migration @critical @migration', async ({ page }) => {
      // Login as photographer approaching quota limit
      await loginHelper.loginAsSupplier(testSuppliers.photographer)
      
      // Verify login success and navigate to AI settings
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible()
      await page.click('[data-testid="settings-menu"]')
      await page.click('[data-testid="ai-settings-link"]')
      
      // Verify AI settings page loads
      await expect(page.locator('[data-testid="ai-settings-page"]')).toBeVisible()
      
      // Check current usage display
      await expect(page.locator('[data-testid="current-usage-display"]')).toContainText('850 / 1000')
      await expect(page.locator('[data-testid="usage-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="usage-warning"]')).toContainText('85% of quota used')

      // Click on migration recommendation
      await expect(page.locator('[data-testid="migration-recommendation"]')).toBeVisible()
      await page.click('[data-testid="start-migration-button"]')

      // Verify migration wizard opens
      await expect(page.locator('[data-testid="migration-wizard"]')).toBeVisible()
      await expect(page.locator('[data-testid="wizard-title"]')).toContainText('Migrate to Client AI')

      // Step 1: Choose provider
      await expect(page.locator('[data-testid="provider-selection"]')).toBeVisible()
      await page.click('[data-testid="openai-provider-option"]')
      await page.click('[data-testid="next-step-button"]')

      // Step 2: API key input
      await expect(page.locator('[data-testid="api-key-input"]')).toBeVisible()
      await page.fill('[data-testid="openai-api-key-input"]', 'sk-test-migration-key-123456789')
      
      // Test API key validation
      await page.click('[data-testid="validate-key-button"]')
      await expect(page.locator('[data-testid="validation-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="key-credits-display"]')).toContainText('$15.00 available')
      
      await page.click('[data-testid="next-step-button"]')

      // Step 3: Cost comparison
      await expect(page.locator('[data-testid="cost-comparison"]')).toBeVisible()
      
      const platformCost = await page.locator('[data-testid="platform-monthly-cost"]').textContent()
      const clientCost = await page.locator('[data-testid="client-monthly-cost"]').textContent()
      const savings = await page.locator('[data-testid="monthly-savings"]').textContent()
      
      expect(platformCost).toMatch(/£\d+\.\d+/)
      expect(clientCost).toMatch(/£\d+\.\d+/)
      expect(savings).toMatch(/£\d+\.\d+/)
      
      // Verify savings calculation
      await expect(page.locator('[data-testid="savings-highlight"]')).toContainText('Save up to')
      
      await page.click('[data-testid="proceed-migration-button"]')

      // Step 4: Migration execution with progress
      await expect(page.locator('[data-testid="migration-progress"]')).toBeVisible()
      
      // Wait for migration steps to complete
      await expect(page.locator('[data-testid="step-backup-data"]')).toHaveClass(/completed/)
      await expect(page.locator('[data-testid="step-validate-key"]')).toHaveClass(/completed/)
      await expect(page.locator('[data-testid="step-switch-provider"]')).toHaveClass(/completed/)
      await expect(page.locator('[data-testid="step-test-connection"]')).toHaveClass(/completed/)
      
      // Verify zero downtime
      const downtimeDisplay = await page.locator('[data-testid="downtime-counter"]').textContent()
      expect(downtimeDisplay).toBe('0:00')

      // Migration completion
      await expect(page.locator('[data-testid="migration-complete"]')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('[data-testid="completion-message"]')).toContainText('Successfully migrated to OpenAI')
      
      // Verify new provider is active
      await expect(page.locator('[data-testid="active-provider"]')).toContainText('OpenAI Client')
      await expect(page.locator('[data-testid="provider-status"]')).toContainText('Connected')

      // Test AI functionality post-migration
      await page.click('[data-testid="test-ai-button"]')
      await page.fill('[data-testid="test-prompt"]', 'Generate photo tags for wedding ceremony')
      await page.click('[data-testid="run-test-button"]')
      
      await expect(page.locator('[data-testid="ai-test-result"]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('[data-testid="test-status"]')).toContainText('Success')
      await expect(page.locator('[data-testid="response-provider"]')).toContainText('OpenAI')
    })

    test('should handle migration failure with automatic rollback @error-handling @migration', async ({ page }) => {
      await loginHelper.loginAsSupplier(testSuppliers.venue)
      
      // Navigate to AI settings
      await page.goto('/settings/ai')
      await expect(page.locator('[data-testid="ai-settings-page"]')).toBeVisible()

      // Start migration with invalid key to trigger failure
      await page.click('[data-testid="start-migration-button"]')
      await page.click('[data-testid="openai-provider-option"]')
      await page.click('[data-testid="next-step-button"]')
      
      // Enter invalid API key
      await page.fill('[data-testid="openai-api-key-input"]', 'sk-invalid-key-format')
      await page.click('[data-testid="validate-key-button"]')
      
      // Verify validation failure
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid API key')
      
      // Try to proceed anyway to test rollback
      await page.fill('[data-testid="openai-api-key-input"]', 'sk-test-rollback-scenario-key')
      
      // Mock successful validation but migration failure
      await mockData.mockMigrationFailure('client_setup_error')
      
      await page.click('[data-testid="validate-key-button"]')
      await page.click('[data-testid="next-step-button"]')
      await page.click('[data-testid="next-step-button"]') // Skip cost comparison
      await page.click('[data-testid="proceed-migration-button"]')

      // Watch rollback process
      await expect(page.locator('[data-testid="migration-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="rollback-initiated"]')).toBeVisible()
      
      // Verify rollback steps
      await expect(page.locator('[data-testid="rollback-step-restore-settings"]')).toHaveClass(/completed/)
      await expect(page.locator('[data-testid="rollback-step-verify-platform"]')).toHaveClass(/completed/)
      
      // Verify system restored to original state
      await expect(page.locator('[data-testid="rollback-complete"]')).toBeVisible()
      await expect(page.locator('[data-testid="active-provider"]')).toContainText('Platform AI')
      await expect(page.locator('[data-testid="provider-status"]')).toContainText('Connected')
      
      // Test that platform AI still works
      await page.click('[data-testid="test-ai-button"]')
      await page.fill('[data-testid="test-prompt"]', 'Test platform AI after rollback')
      await page.click('[data-testid="run-test-button"]')
      
      await expect(page.locator('[data-testid="test-status"]')).toContainText('Success')
      await expect(page.locator('[data-testid="response-provider"]')).toContainText('Platform')
    })

    test('should preserve ongoing AI requests during migration @zero-downtime @migration', async ({ page }) => {
      await loginHelper.loginAsSupplier(testSuppliers.planner)
      
      // Start some AI processing tasks
      await page.goto('/dashboard')
      await page.click('[data-testid="ai-tools-menu"]')
      await page.click('[data-testid="timeline-generator"]')
      
      // Start timeline generation (long-running task)
      await page.fill('[data-testid="timeline-input"]', 'Generate detailed wedding timeline for garden ceremony and ballroom reception')
      await page.click('[data-testid="generate-timeline-button"]')
      
      // Verify processing has started
      await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible()
      
      // Start migration while processing
      await page.goto('/settings/ai')
      await page.click('[data-testid="start-migration-button"]')
      await page.click('[data-testid="openai-provider-option"]')
      await page.click('[data-testid="next-step-button"]')
      
      await page.fill('[data-testid="openai-api-key-input"]', 'sk-test-concurrent-processing-key')
      await page.click('[data-testid="validate-key-button"]')
      await page.click('[data-testid="next-step-button"]')
      await page.click('[data-testid="next-step-button"]')
      
      // Verify migration acknowledges ongoing requests
      await expect(page.locator('[data-testid="ongoing-requests-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="concurrent-requests-count"]')).toContainText('1 active request')
      
      await page.click('[data-testid="proceed-migration-button"]')
      
      // Verify migration preserves ongoing request
      await expect(page.locator('[data-testid="request-preservation-status"]')).toContainText('Active requests preserved')
      
      // Check that original request completes successfully
      await page.goto('/dashboard')
      await expect(page.locator('[data-testid="timeline-generation-complete"]')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('[data-testid="generation-provider"]')).toContainText('Platform AI') // Should complete on original provider
      
      // Verify new requests use new provider
      await page.click('[data-testid="ai-tools-menu"]')
      await page.click('[data-testid="email-generator"]')
      await page.fill('[data-testid="email-input"]', 'Generate client follow-up email')
      await page.click('[data-testid="generate-email-button"]')
      
      await expect(page.locator('[data-testid="email-generation-complete"]')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('[data-testid="generation-provider"]')).toContainText('OpenAI') // New requests use new provider
    })
  })

  test.describe('Client to Platform Migration Journey', () => {
    test('should handle client API key expiration with graceful migration @api-key @migration', async ({ page }) => {
      // Setup supplier with existing client setup
      await mockData.setupClientAISupplier(testSuppliers.photographer, {
        provider: 'openai',
        keyStatus: 'expiring_soon'
      })
      
      await loginHelper.loginAsSupplier(testSuppliers.photographer)
      await page.goto('/settings/ai')
      
      // Verify client AI is active but warning shown
      await expect(page.locator('[data-testid="active-provider"]')).toContainText('OpenAI Client')
      await expect(page.locator('[data-testid="key-expiration-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="expiration-notice"]')).toContainText('API key expires in 3 days')
      
      // Click to start migration back to platform
      await page.click('[data-testid="migrate-to-platform-button"]')
      
      // Verify reverse migration wizard
      await expect(page.locator('[data-testid="reverse-migration-wizard"]')).toBeVisible()
      await expect(page.locator('[data-testid="wizard-title"]')).toContainText('Migrate to Platform AI')
      
      // Show cost comparison (platform may be more expensive but more reliable)
      await expect(page.locator('[data-testid="reliability-comparison"]')).toBeVisible()
      await expect(page.locator('[data-testid="platform-reliability"]')).toContainText('99.9% uptime')
      await expect(page.locator('[data-testid="client-reliability"]')).toContainText('Depends on OpenAI')
      
      await page.click('[data-testid="proceed-platform-migration"]')
      
      // Migration execution
      await expect(page.locator('[data-testid="migration-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="step-backup-client-data"]')).toHaveClass(/completed/)
      await expect(page.locator('[data-testid="step-switch-to-platform"]')).toHaveClass(/completed/)
      await expect(page.locator('[data-testid="step-verify-platform"]')).toHaveClass(/completed/)
      
      // Verify completion
      await expect(page.locator('[data-testid="migration-complete"]')).toBeVisible()
      await expect(page.locator('[data-testid="active-provider"]')).toContainText('Platform AI')
      await expect(page.locator('[data-testid="provider-status"]')).toContainText('Connected')
      
      // Verify no key expiration warnings
      await expect(page.locator('[data-testid="key-expiration-warning"]')).not.toBeVisible()
    })

    test('should handle emergency migration when client API fails @emergency @migration', async ({ page }) => {
      // Setup supplier with failing client API
      await mockData.setupClientAISupplier(testSuppliers.venue, {
        provider: 'openai',
        keyStatus: 'failing',
        simulateFailure: true
      })
      
      await loginHelper.loginAsSupplier(testSuppliers.venue)
      
      // Try to use AI feature that fails
      await page.goto('/dashboard')
      await page.click('[data-testid="ai-tools-menu"]')
      await page.click('[data-testid="venue-description-generator"]')
      
      await page.fill('[data-testid="venue-input"]', 'Generate description for garden wedding venue')
      await page.click('[data-testid="generate-description-button"]')
      
      // Verify failure and emergency migration offer
      await expect(page.locator('[data-testid="ai-service-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-message"]')).toContainText('OpenAI API error')
      await expect(page.locator('[data-testid="emergency-migration-offer"]')).toBeVisible()
      
      await page.click('[data-testid="start-emergency-migration"]')
      
      // Emergency migration should be faster
      await expect(page.locator('[data-testid="emergency-migration-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="migration-type"]')).toContainText('Emergency Migration')
      
      // Should complete quickly
      await expect(page.locator('[data-testid="emergency-migration-complete"]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('[data-testid="completion-time"]')).toMatch(/\d+\.\d+s/) // Should show completion time < 3s
      
      // Retry the original request
      await page.click('[data-testid="retry-request-button"]')
      
      await expect(page.locator('[data-testid="venue-description-complete"]')).toBeVisible()
      await expect(page.locator('[data-testid="generation-provider"]')).toContainText('Platform AI')
      await expect(page.locator('[data-testid="emergency-recovery-success"]')).toBeVisible()
    })
  })

  test.describe('Multi-Provider Migration Scenarios', () => {
    test('should handle migration between client providers @multi-provider @migration', async ({ page }) => {
      // Setup supplier with OpenAI client
      await mockData.setupClientAISupplier(testSuppliers.planner, {
        provider: 'openai',
        keyStatus: 'active'
      })
      
      await loginHelper.loginAsSupplier(testSuppliers.planner)
      await page.goto('/settings/ai')
      
      // Verify current OpenAI setup
      await expect(page.locator('[data-testid="active-provider"]')).toContainText('OpenAI Client')
      
      // Start migration to Anthropic
      await page.click('[data-testid="add-provider-button"]')
      await page.click('[data-testid="anthropic-provider-option"]')
      
      await page.fill('[data-testid="anthropic-api-key-input"]', 'sk-ant-test-multi-provider-key')
      await page.click('[data-testid="validate-anthropic-key-button"]')
      
      await expect(page.locator('[data-testid="validation-success"]')).toBeVisible()
      
      // Set up intelligent routing
      await page.click('[data-testid="setup-intelligent-routing"]')
      
      await expect(page.locator('[data-testid="routing-config"]')).toBeVisible()
      
      // Configure routing rules
      await page.selectOption('[data-testid="photo-tagging-provider"]', 'openai') // Better for photos
      await page.selectOption('[data-testid="content-writing-provider"]', 'anthropic') // Better for writing
      await page.selectOption('[data-testid="default-provider"]', 'openai')
      
      await page.click('[data-testid="save-routing-config"]')
      
      // Test intelligent routing
      await page.goto('/dashboard')
      
      // Test photo tagging (should use OpenAI)
      await page.click('[data-testid="ai-tools-menu"]')
      await page.click('[data-testid="photo-tagger"]')
      await page.fill('[data-testid="photo-description"]', 'Wedding ceremony photo with bride and groom')
      await page.click('[data-testid="tag-photo-button"]')
      
      await expect(page.locator('[data-testid="tagging-complete"]')).toBeVisible()
      await expect(page.locator('[data-testid="provider-used"]')).toContainText('OpenAI')
      
      // Test content writing (should use Anthropic)
      await page.click('[data-testid="ai-tools-menu"]')
      await page.click('[data-testid="content-writer"]')
      await page.fill('[data-testid="content-prompt"]', 'Write elegant venue description')
      await page.click('[data-testid="generate-content-button"]')
      
      await expect(page.locator('[data-testid="content-complete"]')).toBeVisible()
      await expect(page.locator('[data-testid="provider-used"]')).toContainText('Anthropic')
    })

    test('should handle provider failover automatically @failover @migration', async ({ page }) => {
      // Setup multi-provider configuration
      await mockData.setupMultiProviderSupplier(testSuppliers.venue, {
        primary: 'openai',
        fallback: 'anthropic',
        platform_backup: true
      })
      
      await loginHelper.loginAsSupplier(testSuppliers.venue)
      
      // Simulate primary provider failure during usage
      await page.goto('/dashboard')
      await page.click('[data-testid="ai-tools-menu"]')
      await page.click('[data-testid="venue-description-generator"]')
      
      // Mock primary provider failure
      await mockData.simulateProviderFailure('openai')
      
      await page.fill('[data-testid="venue-input"]', 'Generate description for lakeside wedding venue')
      await page.click('[data-testid="generate-description-button"]')
      
      // Verify automatic failover notification
      await expect(page.locator('[data-testid="failover-notification"]')).toBeVisible()
      await expect(page.locator('[data-testid="failover-message"]')).toContainText('Switched to Anthropic')
      
      // Verify request completes successfully
      await expect(page.locator('[data-testid="venue-description-complete"]')).toBeVisible()
      await expect(page.locator('[data-testid="generation-provider"]')).toContainText('Anthropic')
      await expect(page.locator('[data-testid="failover-success"]')).toBeVisible()
      
      // Check provider health dashboard
      await page.goto('/settings/ai')
      await page.click('[data-testid="provider-health-tab"]')
      
      await expect(page.locator('[data-testid="openai-status"]')).toContainText('Unhealthy')
      await expect(page.locator('[data-testid="anthropic-status"]')).toContainText('Healthy')
      await expect(page.locator('[data-testid="platform-status"]')).toContainText('Healthy')
      
      // Verify failover was logged
      await expect(page.locator('[data-testid="failover-history"]')).toBeVisible()
      await expect(page.locator('[data-testid="latest-failover"]')).toContainText('OpenAI → Anthropic')
    })
  })

  test.describe('Wedding Day Migration Protocols', () => {
    test('should prevent migration on active wedding days @wedding-day @migration', async ({ page }) => {
      // Setup supplier with active wedding today
      await mockData.setupWeddingDaySupplier(testSuppliers.photographer, {
        wedding_today: true,
        ceremony_time: '14:00',
        current_time: '13:00' // 1 hour before ceremony
      })
      
      await loginHelper.loginAsSupplier(testSuppliers.photographer)
      await page.goto('/settings/ai')
      
      // Verify wedding day protection is active
      await expect(page.locator('[data-testid="wedding-day-protection"]')).toBeVisible()
      await expect(page.locator('[data-testid="protection-message"]')).toContainText('Wedding day protection active')
      
      // Try to start migration
      await page.click('[data-testid="start-migration-button"]')
      
      // Verify migration is blocked
      await expect(page.locator('[data-testid="migration-blocked"]')).toBeVisible()
      await expect(page.locator('[data-testid="block-reason"]')).toContainText('Active wedding detected')
      await expect(page.locator('[data-testid="ceremony-countdown"]')).toBeVisible()
      
      // Verify scheduling option is offered
      await expect(page.locator('[data-testid="schedule-migration"]')).toBeVisible()
      await page.click('[data-testid="schedule-for-tomorrow"]')
      
      await expect(page.locator('[data-testid="migration-scheduled"]')).toBeVisible()
      await expect(page.locator('[data-testid="scheduled-time"]')).toContainText('Tomorrow at 00:00')
    })

    test('should allow emergency migration during wedding disasters @emergency @wedding-day', async ({ page }) => {
      // Setup wedding day emergency scenario
      await mockData.setupWeddingEmergency(testSuppliers.photographer, {
        wedding_today: true,
        emergency_type: 'platform_failure',
        severity: 'critical'
      })
      
      await loginHelper.loginAsSupplier(testSuppliers.photographer)
      
      // Emergency notification should appear
      await expect(page.locator('[data-testid="emergency-alert"]')).toBeVisible()
      await expect(page.locator('[data-testid="emergency-message"]')).toContainText('AI service failure detected')
      
      await page.click('[data-testid="emergency-migration-button"]')
      
      // Emergency migration should bypass wedding day protection
      await expect(page.locator('[data-testid="emergency-migration-wizard"]')).toBeVisible()
      await expect(page.locator('[data-testid="emergency-override"]')).toContainText('Wedding day protection overridden')
      
      // Fast-track migration
      await page.fill('[data-testid="emergency-api-key"]', 'sk-emergency-wedding-key')
      await page.click('[data-testid="emergency-validate"]')
      await page.click('[data-testid="emergency-migrate-now"]')
      
      // Should complete in under 30 seconds
      await expect(page.locator('[data-testid="emergency-migration-complete"]')).toBeVisible({ timeout: 30000 })
      await expect(page.locator('[data-testid="migration-time"]')).toMatch(/\d+s/) // Should show time under 30s
      
      // Verify service is restored
      await page.goto('/dashboard')
      await page.click('[data-testid="test-ai-service"]')
      
      await expect(page.locator('[data-testid="service-restored"]')).toBeVisible()
      await expect(page.locator('[data-testid="wedding-operations-secure"]')).toContainText('Wedding day operations secure')
    })
  })

  test.describe('Mobile Migration Experience', () => {
    test('should provide optimized mobile migration interface @mobile @migration', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile-specific test')
      
      await loginHelper.loginAsSupplier(testSuppliers.venue)
      await page.goto('/settings/ai')
      
      // Verify mobile-optimized migration interface
      await expect(page.locator('[data-testid="mobile-migration-card"]')).toBeVisible()
      await expect(page.locator('[data-testid="migration-benefits"]')).toBeVisible()
      
      // Touch-friendly migration start
      await page.tap('[data-testid="start-mobile-migration"]')
      
      // Mobile wizard should use bottom sheet
      await expect(page.locator('[data-testid="mobile-migration-sheet"]')).toBeVisible()
      
      // Swipe through migration steps
      await page.swipe('[data-testid="wizard-container"]', { direction: 'left' })
      await page.tap('[data-testid="openai-mobile-option"]')
      
      await page.swipe('[data-testid="wizard-container"]', { direction: 'left' })
      await page.fill('[data-testid="mobile-api-key"]', 'sk-mobile-test-key')
      
      // Mobile-optimized validation
      await page.tap('[data-testid="mobile-validate-key"]')
      await expect(page.locator('[data-testid="mobile-validation-success"]')).toBeVisible()
      
      // Complete migration
      await page.tap('[data-testid="mobile-complete-migration"]')
      
      // Verify mobile success screen
      await expect(page.locator('[data-testid="mobile-success-screen"]')).toBeVisible()
      await expect(page.locator('[data-testid="mobile-provider-badge"]')).toContainText('OpenAI')
    })
  })
})

// Helper function to take screenshots during migration for visual regression testing
async function captureState(page: any, stage: string) {
  await page.screenshot({ 
    path: `migration-states/${stage}.png`,
    fullPage: true 
  })
}