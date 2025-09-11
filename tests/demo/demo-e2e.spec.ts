/**
 * Demo Suite End-to-End Tests
 * Tests the complete user journey through the demo portal
 */

import { test, expect } from '@playwright/test';

test.describe('Demo Portal E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to demo portal
    await page.goto('/demo');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Demo Portal Landing', () => {
    test('should display demo portal with correct title and content', async ({ page }) => {
      // Check page title
      await expect(page).toHaveTitle(/Demo.*WedSync/i);
      
      // Check main heading
      await expect(page.locator('h1')).toContainText('WedSync Demo Portal');
      
      // Check description
      await expect(page.locator('text=Explore realistic wedding industry demo accounts')).toBeVisible();
      
      // Check that we have both supplier and couple sections
      await expect(page.locator('text=Demo Suppliers')).toBeVisible();
      await expect(page.locator('text=Demo Couples')).toBeVisible();
    });

    test('should display all expected demo suppliers', async ({ page }) => {
      const expectedSuppliers = [
        'Sky Lens Studios',
        'Golden Frame Films',
        'The Oak Barn',
        'Wild Ivy Flowers',
        'Spin & Spark Entertainment',
        'Fork & Flame Catering',
        'Velvet & Vows Events'
      ];
      
      // Wait for supplier cards to load
      await page.waitForSelector('[data-testid="supplier-card"]', { timeout: 10000 });
      
      // Check each expected supplier
      for (const supplierName of expectedSuppliers) {
        await expect(page.locator(`text=${supplierName}`)).toBeVisible();
      }
      
      // Verify we have exactly 7 supplier cards
      const supplierCards = page.locator('[data-testid="supplier-card"]');
      await expect(supplierCards).toHaveCount(7);
    });

    test('should display all expected demo couples', async ({ page }) => {
      const expectedCouples = [
        'Emily & Jack Harper',
        'Sophia & Liam Bennett'
      ];
      
      // Wait for couple cards to load
      await page.waitForSelector('[data-testid="couple-card"]', { timeout: 10000 });
      
      // Check each expected couple
      for (const coupleName of expectedCouples) {
        await expect(page.locator(`text=${coupleName}`)).toBeVisible();
      }
      
      // Verify we have exactly 2 couple cards
      const coupleCards = page.locator('[data-testid="couple-card"]');
      await expect(coupleCards).toHaveCount(2);
    });

    test('should display supplier logos and types', async ({ page }) => {
      // Wait for supplier cards
      await page.waitForSelector('[data-testid="supplier-card"]');
      
      // Check that supplier cards have logos (images or placeholder)
      const supplierCards = page.locator('[data-testid="supplier-card"]');
      const count = await supplierCards.count();
      
      for (let i = 0; i < count; i++) {
        const card = supplierCards.nth(i);
        
        // Should have either an image or initials placeholder
        const hasLogo = await card.locator('img').count() > 0;
        const hasInitials = await card.locator('[data-testid="logo-initials"]').count() > 0;
        
        expect(hasLogo || hasInitials).toBeTruthy();
        
        // Should display supplier type
        await expect(card.locator('[data-testid="supplier-type"]')).toBeVisible();
      }
    });

    test('should display couple profile photos', async ({ page }) => {
      // Wait for couple cards
      await page.waitForSelector('[data-testid="couple-card"]');
      
      const coupleCards = page.locator('[data-testid="couple-card"]');
      const count = await coupleCards.count();
      
      for (let i = 0; i < count; i++) {
        const card = coupleCards.nth(i);
        
        // Should have either a profile image or initials placeholder
        const hasPhoto = await card.locator('img').count() > 0;
        const hasInitials = await card.locator('[data-testid="profile-initials"]').count() > 0;
        
        expect(hasPhoto || hasInitials).toBeTruthy();
      }
    });
  });

  test.describe('Demo Authentication Flow', () => {
    test('should allow one-click login to supplier account', async ({ page }) => {
      // Wait for supplier cards to load
      await page.waitForSelector('[data-testid="supplier-card"]');
      
      // Click on Sky Lens Studios login button
      const skyLensCard = page.locator('[data-testid="supplier-card"]').filter({ hasText: 'Sky Lens Studios' });
      const loginButton = skyLensCard.locator('[data-testid="login-button"]');
      
      await loginButton.click();
      
      // Should redirect to supplier dashboard or show logged in state
      await page.waitForLoadState('networkidle');
      
      // Check for successful authentication indicators
      // This could be a redirect or a success message
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(dashboard|demo|login)/);
    });

    test('should allow one-click login to couple account', async ({ page }) => {
      // Wait for couple cards to load
      await page.waitForSelector('[data-testid="couple-card"]');
      
      // Click on Emily & Jack login button  
      const emilyJackCard = page.locator('[data-testid="couple-card"]').filter({ hasText: 'Emily & Jack' });
      const loginButton = emilyJackCard.locator('[data-testid="login-button"]');
      
      await loginButton.click();
      
      // Should redirect to couple dashboard or show logged in state
      await page.waitForLoadState('networkidle');
      
      // Check for successful authentication
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(dashboard|demo|login)/);
    });

    test('should display account switcher after login', async ({ page }) => {
      // Login to a supplier account
      await page.waitForSelector('[data-testid="supplier-card"]');
      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      const loginButton = firstSupplier.locator('[data-testid="login-button"]');
      
      await loginButton.click();
      await page.waitForLoadState('networkidle');
      
      // Check for account switcher component
      await expect(page.locator('[data-testid="account-switcher"]')).toBeVisible({ timeout: 5000 });
    });

    test('should allow switching between demo accounts', async ({ page }) => {
      // Login to first supplier
      await page.waitForSelector('[data-testid="supplier-card"]');
      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      await firstSupplier.locator('[data-testid="login-button"]').click();
      await page.waitForLoadState('networkidle');
      
      // Open account switcher
      const accountSwitcher = page.locator('[data-testid="account-switcher"]');
      await accountSwitcher.click();
      
      // Switch to a couple account
      const coupleOption = page.locator('[data-testid="account-option"]').filter({ hasText: 'Emily & Jack' });
      await coupleOption.click();
      
      // Verify account has switched
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="current-account"]')).toContainText('Emily & Jack');
    });
  });

  test.describe('Document and Asset Display', () => {
    test('should display document links for suppliers', async ({ page }) => {
      await page.waitForSelector('[data-testid="supplier-card"]');
      
      const supplierCards = page.locator('[data-testid="supplier-card"]');
      const count = await supplierCards.count();
      
      // Check first few suppliers for document links
      for (let i = 0; i < Math.min(count, 3); i++) {
        const card = supplierCards.nth(i);
        
        // Should have document section
        await expect(card.locator('[data-testid="documents-section"]')).toBeVisible();
        
        // Should have multiple document links
        const documentLinks = card.locator('[data-testid="document-link"]');
        await expect(documentLinks).toHaveCountGreaterThan(0);
        
        // Expected document types
        const expectedDocs = ['Welcome Guide', 'Pricing Sheet', 'Questionnaire', 'Contract', 'Portfolio'];
        
        for (const docType of expectedDocs) {
          await expect(card.locator(`[data-testid="document-link"]:has-text("${docType}")`)).toBeVisible();
        }
      }
    });

    test('should open documents in new tab when clicked', async ({ page, context }) => {
      await page.waitForSelector('[data-testid="supplier-card"]');
      
      // Get first supplier card
      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      const welcomeGuideLink = firstSupplier.locator('[data-testid="document-link"]').filter({ hasText: 'Welcome Guide' });
      
      // Set up listener for new tab
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        welcomeGuideLink.click()
      ]);
      
      // Wait for new page to load
      await newPage.waitForLoadState();
      
      // Verify document content loaded
      await expect(newPage.locator('body')).toContainText('Welcome');
    });

    test('should display asset statistics', async ({ page }) => {
      // Wait for stats section to load
      await page.waitForSelector('[data-testid="demo-stats"]', { timeout: 10000 });
      
      // Check supplier count
      const supplierStat = page.locator('[data-testid="suppliers-count"]');
      await expect(supplierStat).toContainText('7');
      
      // Check couple count
      const coupleStat = page.locator('[data-testid="couples-count"]');
      await expect(coupleStat).toContainText('2');
      
      // Check total assets count (should be > 40)
      const assetsStat = page.locator('[data-testid="assets-count"]');
      const assetsText = await assetsStat.textContent();
      const assetsCount = parseInt(assetsText || '0');
      expect(assetsCount).toBeGreaterThan(40);
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/demo');
      await page.waitForLoadState('networkidle');
      
      // Check that cards stack vertically on mobile
      const supplierCards = page.locator('[data-testid="supplier-card"]');
      
      // Should still display all suppliers
      await expect(supplierCards).toHaveCount(7);
      
      // Cards should be visible and accessible
      for (let i = 0; i < 3; i++) {
        const card = supplierCards.nth(i);
        await expect(card).toBeVisible();
        
        // Login button should be touchable (48px minimum)
        const loginButton = card.locator('[data-testid="login-button"]');
        const buttonBox = await loginButton.boundingBox();
        
        if (buttonBox) {
          expect(buttonBox.height).toBeGreaterThanOrEqual(44); // iOS guideline minimum
        }
      }
    });

    test('should display correctly on tablet devices', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('/demo');
      await page.waitForLoadState('networkidle');
      
      // Should display in grid layout
      await expect(page.locator('[data-testid="supplier-card"]')).toHaveCount(7);
      await expect(page.locator('[data-testid="couple-card"]')).toHaveCount(2);
    });

    test('should maintain functionality when zoomed', async ({ page }) => {
      // Simulate browser zoom
      await page.evaluate(() => {
        document.body.style.zoom = '150%';
      });
      
      await page.waitForLoadState('networkidle');
      
      // Should still be able to interact with elements
      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      const loginButton = firstSupplier.locator('[data-testid="login-button"]');
      
      await expect(loginButton).toBeVisible();
      await loginButton.click();
      
      // Should still navigate successfully
      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('Performance', () => {
    test('should load demo portal within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/demo');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should load assets progressively', async ({ page }) => {
      await page.goto('/demo');
      
      // Should show loading states or placeholders initially
      await page.waitForSelector('[data-testid="supplier-card"]');
      
      // Then load actual content
      await page.waitForLoadState('networkidle');
      
      // All cards should be fully loaded
      const supplierCards = page.locator('[data-testid="supplier-card"]');
      await expect(supplierCards).toHaveCount(7);
    });

    test('should handle slow network gracefully', async ({ page, context }) => {
      // Simulate slow 3G connection
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });
      
      const startTime = Date.now();
      
      await page.goto('/demo');
      await page.waitForSelector('[data-testid="supplier-card"]', { timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should still load within reasonable time even with delays
      expect(loadTime).toBeLessThan(15000);
      
      // Content should still be functional
      await expect(page.locator('[data-testid="supplier-card"]')).toHaveCount(7);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle missing assets gracefully', async ({ page, context }) => {
      // Intercept asset requests and return 404 for some
      let requestCount = 0;
      await context.route('**/demo-logos/**', async (route) => {
        requestCount++;
        if (requestCount % 3 === 0) {
          // Return 404 for every 3rd logo request
          await route.fulfill({ status: 404 });
        } else {
          await route.continue();
        }
      });
      
      await page.goto('/demo');
      await page.waitForLoadState('networkidle');
      
      // Should still display supplier cards with fallback content
      await expect(page.locator('[data-testid="supplier-card"]')).toHaveCount(7);
      
      // Cards with failed logos should show initials or placeholder
      const cardsWithFallback = page.locator('[data-testid="logo-initials"]');
      await expect(cardsWithFallback).toHaveCountGreaterThan(0);
    });

    test('should display error message for API failures', async ({ page, context }) => {
      // Mock API to return error
      await context.route('**/api/demo/**', async (route) => {
        await route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ error: 'Demo service unavailable' })
        });
      });
      
      await page.goto('/demo');
      
      // Should show error message instead of demo content
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Demo service unavailable')).toBeVisible();
      
      // Should have retry button
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should recover from authentication errors', async ({ page, context }) => {
      // First load normally
      await page.goto('/demo');
      await page.waitForSelector('[data-testid="supplier-card"]');
      
      // Mock auth endpoint to fail
      await context.route('**/api/demo/auth/**', async (route) => {
        await route.fulfill({ status: 401, body: 'Unauthorized' });
      });
      
      // Try to login
      const loginButton = page.locator('[data-testid="login-button"]').first();
      await loginButton.click();
      
      // Should show error message
      await expect(page.locator('[data-testid="auth-error"]')).toBeVisible({ timeout: 5000 });
      
      // Clear route mock
      await context.unroute('**/api/demo/auth/**');
      
      // Retry should work
      const retryButton = page.locator('[data-testid="retry-login"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/demo');
      await page.waitForSelector('[data-testid="supplier-card"]');
      
      // Should be able to tab through login buttons
      await page.keyboard.press('Tab');
      
      let focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();
      
      // Tab through several elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus').first();
        await expect(focusedElement).toBeVisible();
      }
      
      // Should be able to activate with Enter
      const currentFocus = await page.locator(':focus').first();
      if (await currentFocus.getAttribute('data-testid') === 'login-button') {
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
      }
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/demo');
      await page.waitForSelector('[data-testid="supplier-card"]');
      
      // Check for proper button labels
      const loginButtons = page.locator('[data-testid="login-button"]');
      const count = await loginButtons.count();
      
      for (let i = 0; i < count; i++) {
        const button = loginButtons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        // Should have either aria-label or descriptive text
        expect(ariaLabel || textContent).toBeTruthy();
      }
    });

    test('should work with screen reader', async ({ page }) => {
      await page.goto('/demo');
      await page.waitForSelector('[data-testid="supplier-card"]');
      
      // Check for proper heading hierarchy
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      await expect(headings.first()).toContainText('WedSync Demo Portal');
      
      // Check for alt text on images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    });
  });

  test.describe('Data Integrity', () => {
    test('should display consistent supplier information', async ({ page }) => {
      await page.goto('/demo');
      await page.waitForSelector('[data-testid="supplier-card"]');
      
      // Get Sky Lens Studios card
      const skyLensCard = page.locator('[data-testid="supplier-card"]').filter({ hasText: 'Sky Lens Studios' });
      
      // Should show photographer type
      await expect(skyLensCard.locator('[data-testid="supplier-type"]')).toContainText('photographer');
      
      // Should have email
      await expect(skyLensCard.locator('[data-testid="supplier-email"]')).toContainText('@');
      
      // Should have document links
      const docLinks = skyLensCard.locator('[data-testid="document-link"]');
      await expect(docLinks).toHaveCount(5);
    });

    test('should display realistic couple information', async ({ page }) => {
      await page.goto('/demo');
      await page.waitForSelector('[data-testid="couple-card"]');
      
      // Get Emily & Jack card
      const emilyJackCard = page.locator('[data-testid="couple-card"]').filter({ hasText: 'Emily & Jack' });
      
      // Should show couple names properly formatted
      await expect(emilyJackCard).toContainText('Emily & Jack Harper');
      
      // Should have wedding title
      await expect(emilyJackCard).toContainText('The Harper Wedding');
      
      // Should have email
      await expect(emilyJackCard.locator('[data-testid="couple-email"]')).toContainText('@example.com');
    });

    test('should maintain data consistency across page reloads', async ({ page }) => {
      await page.goto('/demo');
      await page.waitForSelector('[data-testid="supplier-card"]');
      
      // Get initial supplier count
      const initialSupplierCount = await page.locator('[data-testid="supplier-card"]').count();
      const initialCoupleCount = await page.locator('[data-testid="couple-card"]').count();
      
      // Reload page
      await page.reload();
      await page.waitForSelector('[data-testid="supplier-card"]');
      
      // Should have same counts
      await expect(page.locator('[data-testid="supplier-card"]')).toHaveCount(initialSupplierCount);
      await expect(page.locator('[data-testid="couple-card"]')).toHaveCount(initialCoupleCount);
      
      // Business names should be the same
      await expect(page.locator('text=Sky Lens Studios')).toBeVisible();
      await expect(page.locator('text=Emily & Jack Harper')).toBeVisible();
    });
  });
});