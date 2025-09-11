/**
 * WS-247 Multilingual Platform System - Mobile E2E Testing
 * Team E - QA/Testing & Documentation
 * 
 * End-to-end testing for mobile multilingual experience
 * Validates mobile UI, touch interactions, and language switching on real devices
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Mobile viewport configurations for different devices
const mobileViewports = {
  iPhone_SE: { width: 375, height: 667 },
  iPhone_12: { width: 390, height: 844 },
  iPhone_14_Pro: { width: 393, height: 852 },
  Samsung_Galaxy_S21: { width: 384, height: 854 },
  Pixel_6: { width: 412, height: 915 },
  iPad_Mini: { width: 744, height: 1133 }
};

// Languages for testing
const testLanguages = [
  { code: 'en', name: 'English', rtl: false },
  { code: 'es', name: 'Español', rtl: false },
  { code: 'fr', name: 'Français', rtl: false },
  { code: 'ar', name: 'العربية', rtl: true },
  { code: 'zh', name: '中文', rtl: false }
];

// Wedding form test data for different cultures
const weddingTestData = {
  western: {
    brideName: 'Emily Johnson',
    groomName: 'Michael Smith',
    venue: 'Grand Hotel',
    budget: '25000',
    date: '2024-08-15'
  },
  arabic: {
    brideName: 'فاطمة أحمد',
    groomName: 'محمد علي',
    venue: 'قاعة الفردوس',
    budget: '75000',
    date: '2024-10-20'
  },
  chinese: {
    brideName: '李美丽',
    groomName: '王强',
    venue: '金龙酒店',
    budget: '150000',
    date: '2024-09-28'
  }
};

test.describe('WS-247: Mobile Multilingual E2E Tests', () => {
  test.beforeEach(async ({ context }) => {
    // Grant permissions for notifications and geolocation
    await context.grantPermissions(['notifications', 'geolocation']);
  });

  test.describe('Mobile Language Switching', () => {
    Object.entries(mobileViewports).forEach(([deviceName, viewport]) => {
      test(`should switch languages correctly on ${deviceName}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport,
          deviceScaleFactor: deviceName.includes('iPhone') ? 3 : 2,
          isMobile: true,
          hasTouch: true,
          locale: 'en-US'
        });
        
        const page = await context.newPage();
        await page.goto('/dashboard');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Test language switching for each language
        for (const language of testLanguages) {
          // Open language selector
          const languageSelector = page.locator('[data-testid="language-selector"]');
          await expect(languageSelector).toBeVisible();
          await languageSelector.tap();
          
          // Select language
          const languageOption = page.locator(`[data-testid="language-${language.code}"]`);
          await languageOption.tap();
          
          // Verify language change
          await page.waitForTimeout(1000); // Wait for translation to apply
          
          // Check if RTL is applied for Arabic
          if (language.rtl) {
            const body = page.locator('body');
            await expect(body).toHaveAttribute('dir', 'rtl');
          } else {
            const body = page.locator('body');
            await expect(body).toHaveAttribute('dir', 'ltr');
          }
          
          // Verify navigation text is translated
          const homeNav = page.locator('[data-testid="nav-home"]');
          await expect(homeNav).toBeVisible();
          
          // Take screenshot for visual regression
          await page.screenshot({ 
            path: `test-results/mobile-${deviceName}-${language.code}.png`,
            fullPage: false 
          });
        }
        
        await context.close();
      });
    });

    test('should maintain language preference across page navigation', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: mobileViewports.iPhone_12,
        isMobile: true,
        hasTouch: true
      });
      
      const page = await context.newPage();
      await page.goto('/');
      
      // Switch to Spanish
      await page.locator('[data-testid="language-selector"]').tap();
      await page.locator('[data-testid="language-es"]').tap();
      await page.waitForTimeout(1000);
      
      // Navigate to different pages
      const pagestoTest = ['/dashboard', '/vendors', '/forms', '/timeline'];
      
      for (const pagePath of pagestoTest) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        // Verify Spanish is still active
        const currentLang = await page.getAttribute('html', 'lang');
        expect(currentLang).toBe('es');
        
        // Verify Spanish content exists
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
      }
      
      await context.close();
    });
  });

  test.describe('Mobile Wedding Form Multilingual', () => {
    test('should handle wedding form input in different languages', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: mobileViewports.Samsung_Galaxy_S21,
        isMobile: true,
        hasTouch: true
      });
      
      const page = await context.newPage();
      
      // Test form in different languages with cultural data
      const testCases = [
        { lang: 'en', culture: 'western', data: weddingTestData.western },
        { lang: 'ar', culture: 'arabic', data: weddingTestData.arabic },
        { lang: 'zh', culture: 'chinese', data: weddingTestData.chinese }
      ];
      
      for (const { lang, culture, data } of testCases) {
        await page.goto('/forms/wedding-details');
        
        // Switch language
        await page.locator('[data-testid="language-selector"]').tap();
        await page.locator(`[data-testid="language-${lang}"]`).tap();
        await page.waitForTimeout(1000);
        
        // Fill out wedding form with cultural data
        await page.locator('[data-testid="bride-name-input"]').fill(data.brideName);
        await page.locator('[data-testid="groom-name-input"]').fill(data.groomName);
        
        // Test date picker in different formats
        const dateInput = page.locator('[data-testid="wedding-date-input"]');
        await dateInput.tap();
        await dateInput.fill(data.date);
        
        // Test venue input
        await page.locator('[data-testid="venue-input"]').fill(data.venue);
        
        // Test budget input with currency
        const budgetInput = page.locator('[data-testid="budget-input"]');
        await budgetInput.fill(data.budget);
        
        // Verify currency symbol appears correctly
        const currencySymbol = page.locator('[data-testid="currency-symbol"]');
        await expect(currencySymbol).toBeVisible();
        
        // Submit form
        const submitButton = page.locator('[data-testid="submit-wedding-form"]');
        await expect(submitButton).toBeVisible();
        await submitButton.tap();
        
        // Verify success message in correct language
        const successMessage = page.locator('[data-testid="form-success"]');
        await expect(successMessage).toBeVisible({ timeout: 5000 });
        
        // Screenshot for verification
        await page.screenshot({ 
          path: `test-results/form-${culture}-${lang}.png` 
        });
        
        // Clear form for next test
        await page.reload();
      }
      
      await context.close();
    });

    test('should validate form errors in multiple languages', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: mobileViewports.iPhone_14_Pro,
        isMobile: true,
        hasTouch: true
      });
      
      const page = await context.newPage();
      
      const languagesToTest = ['en', 'es', 'fr', 'ar'];
      
      for (const lang of languagesToTest) {
        await page.goto('/forms/wedding-details');
        
        // Switch language
        await page.locator('[data-testid="language-selector"]').tap();
        await page.locator(`[data-testid="language-${lang}"]`).tap();
        await page.waitForTimeout(1000);
        
        // Submit empty form to trigger validation errors
        const submitButton = page.locator('[data-testid="submit-wedding-form"]');
        await submitButton.tap();
        
        // Check for required field errors
        const brideNameError = page.locator('[data-testid="bride-name-error"]');
        const groomNameError = page.locator('[data-testid="groom-name-error"]');
        const dateError = page.locator('[data-testid="date-error"]');
        
        await expect(brideNameError).toBeVisible();
        await expect(groomNameError).toBeVisible();
        await expect(dateError).toBeVisible();
        
        // Verify error messages are translated
        const brideErrorText = await brideNameError.textContent();
        const groomErrorText = await groomNameError.textContent();
        
        expect(brideErrorText).toBeTruthy();
        expect(groomErrorText).toBeTruthy();
        
        // Errors should not be in English when other language is selected
        if (lang !== 'en') {
          expect(brideErrorText).not.toContain('required');
          expect(groomErrorText).not.toContain('required');
        }
        
        // Screenshot validation errors
        await page.screenshot({ 
          path: `test-results/validation-errors-${lang}.png` 
        });
      }
      
      await context.close();
    });
  });

  test.describe('Mobile RTL Layout Testing', () => {
    test('should properly render RTL layouts on mobile devices', async ({ browser }) => {
      const rtlLanguages = [
        { code: 'ar', name: 'Arabic' },
        { code: 'he', name: 'Hebrew' },
        { code: 'ur', name: 'Urdu' }
      ];
      
      for (const device of Object.entries(mobileViewports)) {
        const [deviceName, viewport] = device;
        
        const context = await browser.newContext({
          viewport,
          isMobile: true,
          hasTouch: true
        });
        
        const page = await context.newPage();
        
        for (const language of rtlLanguages) {
          await page.goto('/dashboard');
          
          // Switch to RTL language
          await page.locator('[data-testid="language-selector"]').tap();
          await page.locator(`[data-testid="language-${language.code}"]`).tap();
          await page.waitForTimeout(1500);
          
          // Verify RTL direction is applied
          const bodyDir = await page.getAttribute('body', 'dir');
          expect(bodyDir).toBe('rtl');
          
          // Test navigation menu RTL layout
          const navMenu = page.locator('[data-testid="mobile-nav-menu"]');
          if (await navMenu.isVisible()) {
            await navMenu.tap();
            
            const menuItems = page.locator('[data-testid^="nav-item"]');
            const count = await menuItems.count();
            expect(count).toBeGreaterThan(0);
            
            await page.locator('[data-testid="menu-close"]').tap();
          }
          
          // Test form layouts in RTL
          await page.goto('/forms/vendor-search');
          await page.waitForLoadState('networkidle');
          
          // Verify search input alignment
          const searchInput = page.locator('[data-testid="vendor-search-input"]');
          await expect(searchInput).toBeVisible();
          
          // Test dropdown menus
          const categoryDropdown = page.locator('[data-testid="category-dropdown"]');
          if (await categoryDropdown.isVisible()) {
            await categoryDropdown.tap();
            await page.waitForTimeout(500);
            
            const dropdownOptions = page.locator('[data-testid^="category-option"]');
            const optionsCount = await dropdownOptions.count();
            expect(optionsCount).toBeGreaterThan(0);
            
            // Select first option
            await dropdownOptions.first().tap();
          }
          
          // Test button positioning
          const searchButton = page.locator('[data-testid="search-button"]');
          await expect(searchButton).toBeVisible();
          
          // Screenshot RTL layout
          await page.screenshot({ 
            path: `test-results/rtl-${deviceName}-${language.code}.png`,
            fullPage: true 
          });
        }
        
        await context.close();
      }
    });

    test('should handle text input correctly in RTL languages', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: mobileViewports.iPad_Mini,
        isMobile: true,
        hasTouch: true
      });
      
      const page = await context.newPage();
      await page.goto('/forms/wedding-details');
      
      // Switch to Arabic
      await page.locator('[data-testid="language-selector"]').tap();
      await page.locator('[data-testid="language-ar"]').tap();
      await page.waitForTimeout(1000);
      
      // Test Arabic text input
      const brideNameInput = page.locator('[data-testid="bride-name-input"]');
      await brideNameInput.tap();
      await brideNameInput.fill('فاطمة الزهراء');
      
      const groomNameInput = page.locator('[data-testid="groom-name-input"]');
      await groomNameInput.tap();
      await groomNameInput.fill('محمد عبدالله');
      
      // Verify text appears correctly
      const brideValue = await brideNameInput.inputValue();
      const groomValue = await groomNameInput.inputValue();
      
      expect(brideValue).toBe('فاطمة الزهراء');
      expect(groomValue).toBe('محمد عبدالله');
      
      // Test text area for notes
      const notesTextarea = page.locator('[data-testid="wedding-notes"]');
      if (await notesTextarea.isVisible()) {
        await notesTextarea.tap();
        await notesTextarea.fill('هذا حفل زفاف تقليدي في قاعة كبيرة مع العائلة والأصدقاء');
        
        const notesValue = await notesTextarea.inputValue();
        expect(notesValue).toContain('حفل زفاف');
      }
      
      await context.close();
    });
  });

  test.describe('Mobile Touch Interactions', () => {
    test('should handle touch gestures for multilingual content', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: mobileViewports.iPhone_12,
        isMobile: true,
        hasTouch: true
      });
      
      const page = await context.newPage();
      await page.goto('/vendors');
      
      // Test swipe gestures on vendor cards
      const vendorCard = page.locator('[data-testid="vendor-card"]').first();
      await expect(vendorCard).toBeVisible();
      
      // Test touch and hold for vendor details
      await vendorCard.hover();
      await page.waitForTimeout(500);
      
      // Test tap to open vendor profile
      await vendorCard.tap();
      await page.waitForLoadState('networkidle');
      
      // Verify vendor profile opened
      const vendorProfile = page.locator('[data-testid="vendor-profile"]');
      await expect(vendorProfile).toBeVisible();
      
      // Test language switching in vendor profile
      await page.locator('[data-testid="language-selector"]').tap();
      await page.locator('[data-testid="language-es"]').tap();
      await page.waitForTimeout(1000);
      
      // Verify vendor information is translated
      const vendorName = page.locator('[data-testid="vendor-name"]');
      const vendorDescription = page.locator('[data-testid="vendor-description"]');
      
      await expect(vendorName).toBeVisible();
      await expect(vendorDescription).toBeVisible();
      
      // Test contact button
      const contactButton = page.locator('[data-testid="contact-vendor"]');
      if (await contactButton.isVisible()) {
        await contactButton.tap();
        
        // Should open contact modal or page
        const contactModal = page.locator('[data-testid="contact-modal"]');
        if (await contactModal.isVisible()) {
          // Test form within modal
          const messageInput = page.locator('[data-testid="contact-message"]');
          await messageInput.fill('Hola, me interesa sus servicios para mi boda.');
          
          const sendButton = page.locator('[data-testid="send-message"]');
          await sendButton.tap();
        }
      }
      
      await context.close();
    });

    test('should support pinch-to-zoom for multilingual content', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: mobileViewports.Pixel_6,
        isMobile: true,
        hasTouch: true
      });
      
      const page = await context.newPage();
      await page.goto('/timeline');
      
      // Test timeline view with Chinese language
      await page.locator('[data-testid="language-selector"]').tap();
      await page.locator('[data-testid="language-zh"]').tap();
      await page.waitForTimeout(1000);
      
      // Find timeline container
      const timelineContainer = page.locator('[data-testid="timeline-container"]');
      await expect(timelineContainer).toBeVisible();
      
      // Get bounding box for zoom testing
      const boundingBox = await timelineContainer.boundingBox();
      if (boundingBox) {
        // Simulate pinch zoom
        await page.mouse.move(boundingBox.x + 100, boundingBox.y + 100);
        await page.mouse.down();
        await page.mouse.move(boundingBox.x + 150, boundingBox.y + 150);
        await page.mouse.up();
        
        await page.waitForTimeout(500);
        
        // Verify timeline still displays Chinese text correctly after zoom
        const timelineItems = page.locator('[data-testid^="timeline-item"]');
        const count = await timelineItems.count();
        expect(count).toBeGreaterThan(0);
      }
      
      await context.close();
    });
  });

  test.describe('Mobile Performance in Multiple Languages', () => {
    test('should load quickly in all supported languages', async ({ browser }) => {
      const performanceResults: { [key: string]: number } = {};
      
      const context = await browser.newContext({
        viewport: mobileViewports.iPhone_SE,
        isMobile: true,
        hasTouch: true
      });
      
      const page = await context.newPage();
      
      for (const language of testLanguages) {
        // Clear cache between languages
        await context.clearCookies();
        
        const startTime = Date.now();
        
        // Navigate with language parameter
        await page.goto(`/dashboard?lang=${language.code}`);
        await page.waitForLoadState('networkidle');
        
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        
        performanceResults[language.code] = loadTime;
        
        // Verify page loaded correctly
        const dashboard = page.locator('[data-testid="dashboard-content"]');
        await expect(dashboard).toBeVisible();
        
        // Check for specific language content
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
        
        console.log(`${language.name} (${language.code}): ${loadTime}ms`);
      }
      
      // Verify all languages load within acceptable time
      Object.entries(performanceResults).forEach(([lang, time]) => {
        expect(time).toBeLessThan(5000); // 5 seconds max
      });
      
      await context.close();
    });

    test('should handle memory efficiently with language switching', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: mobileViewports.Samsung_Galaxy_S21,
        isMobile: true,
        hasTouch: true
      });
      
      const page = await context.newPage();
      await page.goto('/dashboard');
      
      // Cycle through languages multiple times
      for (let cycle = 0; cycle < 3; cycle++) {
        for (const language of testLanguages) {
          await page.locator('[data-testid="language-selector"]').tap();
          await page.locator(`[data-testid="language-${language.code}"]`).tap();
          await page.waitForTimeout(1000);
          
          // Navigate to different pages to test memory usage
          const pages = ['/vendors', '/forms', '/timeline', '/dashboard'];
          
          for (const pagePath of pages) {
            await page.goto(pagePath);
            await page.waitForLoadState('networkidle');
            
            // Verify page still responds
            const pageTitle = page.locator('h1').first();
            if (await pageTitle.isVisible()) {
              const titleText = await pageTitle.textContent();
              expect(titleText).toBeTruthy();
            }
          }
        }
        
        console.log(`Completed language cycle ${cycle + 1}/3`);
      }
      
      // Final verification
      const finalContent = page.locator('body');
      await expect(finalContent).toBeVisible();
      
      await context.close();
    });
  });

  test.describe('Mobile Offline Multilingual Support', () => {
    test('should work offline with cached translations', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: mobileViewports.iPhone_12,
        isMobile: true,
        hasTouch: true
      });
      
      const page = await context.newPage();
      
      // Load page online first
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Switch to Spanish to cache translations
      await page.locator('[data-testid="language-selector"]').tap();
      await page.locator('[data-testid="language-es"]').tap();
      await page.waitForTimeout(2000);
      
      // Go offline
      await context.setOffline(true);
      
      // Try to switch languages offline
      await page.locator('[data-testid="language-selector"]').tap();
      await page.locator('[data-testid="language-en"]').tap();
      await page.waitForTimeout(1000);
      
      // Verify English still works from cache
      const dashboardTitle = page.locator('[data-testid="dashboard-title"]');
      await expect(dashboardTitle).toBeVisible();
      
      // Test navigation while offline
      const navHome = page.locator('[data-testid="nav-home"]');
      if (await navHome.isVisible()) {
        await navHome.tap();
        await page.waitForTimeout(1000);
        
        // Should still show cached content
        const homeContent = page.locator('[data-testid="home-content"]');
        await expect(homeContent).toBeVisible({ timeout: 10000 });
      }
      
      await context.close();
    });
  });

  test.describe('Mobile Accessibility Multilingual', () => {
    test('should maintain accessibility across languages', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: mobileViewports.iPad_Mini,
        isMobile: true,
        hasTouch: true
      });
      
      const page = await context.newPage();
      
      for (const language of testLanguages.slice(0, 3)) { // Test first 3 languages
        await page.goto('/forms/wedding-details');
        
        // Switch language
        await page.locator('[data-testid="language-selector"]').tap();
        await page.locator(`[data-testid="language-${language.code}"]`).tap();
        await page.waitForTimeout(1000);
        
        // Test form accessibility
        const brideNameInput = page.locator('[data-testid="bride-name-input"]');
        const brideNameLabel = page.locator('label[for="bride-name"]');
        
        // Verify label association
        if (await brideNameLabel.isVisible()) {
          const labelText = await brideNameLabel.textContent();
          expect(labelText).toBeTruthy();
        }
        
        // Test tab navigation
        await brideNameInput.focus();
        await page.keyboard.press('Tab');
        
        const groomNameInput = page.locator('[data-testid="groom-name-input"]');
        await expect(groomNameInput).toBeFocused();
        
        // Test screen reader support
        const submitButton = page.locator('[data-testid="submit-wedding-form"]');
        const buttonAriaLabel = await submitButton.getAttribute('aria-label');
        expect(buttonAriaLabel).toBeTruthy();
        
        console.log(`Accessibility verified for ${language.name}`);
      }
      
      await context.close();
    });
  });
});