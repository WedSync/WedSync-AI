import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WS-157 Helper Assignment - Accessibility Testing', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/dashboard/team');
    await page.waitForLoadState('networkidle');
  });

  test('should meet WCAG 2.1 AA standards for team management page', async () => {
    console.log('🎯 Testing team management page accessibility...');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Log accessibility score
    const passedRules = accessibilityScanResults.passes.length;
    const totalRules = passedRules + accessibilityScanResults.violations.length;
    const score = Math.round((passedRules / totalRules) * 100);
    
    console.log(`   ✅ Accessibility Score: ${score}%`);
    console.log(`   ✅ Rules Passed: ${passedRules}`);
    console.log(`   ✅ Violations: ${accessibilityScanResults.violations.length}`);
    
    expect(score).toBeGreaterThanOrEqual(100); // Perfect score required
  });

  test('should support full keyboard navigation', async () => {
    console.log('⌨️  Testing keyboard navigation...');
    
    // Start from the beginning of the page
    await page.keyboard.press('Tab');
    
    // Navigate to invite helper button
    let currentElement = await page.locator(':focus').first();
    let attempts = 0;
    
    while (attempts < 20) {
      const testId = await currentElement.getAttribute('data-testid');
      if (testId === 'invite-helper-btn') {
        break;
      }
      await page.keyboard.press('Tab');
      currentElement = await page.locator(':focus').first();
      attempts++;
    }
    
    // Open modal with keyboard
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="invite-helper-modal"]')).toBeVisible();
    
    // Navigate through form fields
    await page.keyboard.press('Tab'); // Email field
    await page.keyboard.type('keyboard.test@example.com');
    
    await page.keyboard.press('Tab'); // Name field
    await page.keyboard.type('Keyboard Test User');
    
    await page.keyboard.press('Tab'); // Role select
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // Navigate to permissions
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space'); // Check first permission
    
    // Navigate to submit button
    let submitButton = null;
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      currentElement = await page.locator(':focus').first();
      const testId = await currentElement.getAttribute('data-testid');
      if (testId === 'send-invitation-btn') {
        submitButton = currentElement;
        break;
      }
    }
    
    expect(submitButton).not.toBeNull();
    await page.keyboard.press('Enter');
    
    // Verify success
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    
    console.log('   ✅ Full keyboard navigation successful');
  });

  test('should have proper ARIA labels and roles', async () => {
    console.log('🏷️  Testing ARIA labels and roles...');
    
    // Check main elements have proper ARIA attributes
    const ariaTests = [
      { selector: '[data-testid="team-management-page"]', attribute: 'aria-label', required: true },
      { selector: '[data-testid="invite-helper-btn"]', attribute: 'aria-describedby', required: true },
      { selector: '[data-testid="helpers-list"]', attribute: 'role', expected: 'list' },
      { selector: '[data-testid="helper-card"]', attribute: 'role', expected: 'listitem' }
    ];
    
    for (const test of ariaTests) {
      const elements = page.locator(test.selector);
      const count = await elements.count();
      
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        const attributeValue = await element.getAttribute(test.attribute);
        
        if (test.required) {
          expect(attributeValue).toBeTruthy();
          console.log(`   ✅ ${test.selector} has ${test.attribute}`);
        }
        
        if (test.expected) {
          expect(attributeValue).toBe(test.expected);
          console.log(`   ✅ ${test.selector} has correct ${test.attribute}: ${test.expected}`);
        }
      }
    }
    
    // Open modal to test dialog ARIA
    await page.click('[data-testid="invite-helper-btn"]');
    await expect(page.locator('[data-testid="invite-helper-modal"]')).toBeVisible();
    
    const modalRole = await page.locator('[data-testid="invite-helper-modal"]').getAttribute('role');
    expect(modalRole).toBe('dialog');
    
    const modalLabel = await page.locator('[data-testid="invite-helper-modal"]').getAttribute('aria-labelledby');
    expect(modalLabel).toBeTruthy();
    
    console.log('   ✅ Modal has proper dialog role and labeling');
  });

  test('should support screen reader navigation', async () => {
    console.log('📢 Testing screen reader support...');
    
    // Test heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // Verify heading hierarchy
    const headingLevels = [];
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName.charAt(1));
      headingLevels.push(level);
    }
    
    // Check for proper heading hierarchy (no skipping levels)
    for (let i = 1; i < headingLevels.length; i++) {
      const currentLevel = headingLevels[i];
      const previousLevel = headingLevels[i - 1];
      expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
    }
    
    console.log(`   ✅ Proper heading hierarchy: ${headingLevels.join(' → ')}`);
    
    // Test form labels
    await page.click('[data-testid="invite-helper-btn"]');
    
    const formInputs = await page.locator('input, select, textarea').all();
    for (const input of formInputs) {
      const label = await input.getAttribute('aria-label');
      const labelledBy = await input.getAttribute('aria-labelledby');
      const associatedLabel = await page.locator(`label[for="${await input.getAttribute('id')}"]`).count();
      
      const hasLabel = label || labelledBy || associatedLabel > 0;
      expect(hasLabel).toBe(true);
    }
    
    console.log(`   ✅ All ${formInputs.length} form inputs have proper labels`);
  });

  test('should have sufficient color contrast', async () => {
    console.log('🎨 Testing color contrast ratios...');
    
    const colorContrastScan = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('[data-testid="team-management-page"]')
      .analyze();
    
    const contrastViolations = colorContrastScan.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    
    expect(contrastViolations).toEqual([]);
    
    // Test specific elements that should have high contrast
    const highContrastElements = [
      '[data-testid="invite-helper-btn"]',
      '[data-testid="helper-card"] h3',
      '[data-testid="helper-status"]',
      '[data-testid="error-message"]'
    ];
    
    for (const selector of highContrastElements) {
      const elements = page.locator(selector);
      const count = await elements.count();
      
      if (count > 0) {
        const element = elements.first();
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize
          };
        });
        
        console.log(`   ✅ ${selector}: ${styles.color} on ${styles.backgroundColor}`);
      }
    }
    
    console.log('   ✅ All color contrasts meet WCAG AA standards');
  });

  test('should work with high contrast mode', async () => {
    console.log('🔆 Testing high contrast mode compatibility...');
    
    // Simulate high contrast mode
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            background-color: black !important;
            color: white !important;
            border-color: white !important;
          }
          button {
            background-color: white !important;
            color: black !important;
          }
        }
      `
    });
    
    // Emulate high contrast preference
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Test that elements are still visible and functional
    await page.click('[data-testid="invite-helper-btn"]');
    await expect(page.locator('[data-testid="invite-helper-modal"]')).toBeVisible();
    
    await page.fill('[data-testid="helper-email-input"]', 'contrast.test@example.com');
    await page.fill('[data-testid="helper-name-input"]', 'Contrast Test');
    
    // Take screenshot for manual verification
    await expect(page).toHaveScreenshot('high-contrast-modal.png');
    
    console.log('   ✅ High contrast mode compatible');
  });

  test('should support focus management', async () => {
    console.log('🎯 Testing focus management...');
    
    // Test focus trap in modal
    await page.click('[data-testid="invite-helper-btn"]');
    await expect(page.locator('[data-testid="invite-helper-modal"]')).toBeVisible();
    
    // Focus should be on first focusable element in modal
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Tab through modal elements and ensure focus stays within modal
    const modalBounds = page.locator('[data-testid="invite-helper-modal"]');
    
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const currentFocus = page.locator(':focus');
      
      // Check if focused element is within modal
      const isWithinModal = await currentFocus.evaluate((el, modalEl) => {
        return modalEl.contains(el);
      }, await modalBounds.elementHandle());
      
      expect(isWithinModal).toBe(true);
      
      // If we've cycled back to first element, break
      const focusId = await currentFocus.getAttribute('data-testid');
      if (i > 5 && focusId === 'helper-email-input') {
        break;
      }
    }
    
    // Test focus restoration after modal close
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="invite-helper-modal"]')).not.toBeVisible();
    
    // Focus should return to trigger button
    const restoredFocus = await page.locator(':focus').getAttribute('data-testid');
    expect(restoredFocus).toBe('invite-helper-btn');
    
    console.log('   ✅ Focus management working correctly');
  });

  test('should provide proper error announcements', async () => {
    console.log('📢 Testing error announcements...');
    
    await page.click('[data-testid="invite-helper-btn"]');
    
    // Submit form without required fields to trigger errors
    await page.click('[data-testid="send-invitation-btn"]');
    
    // Check for ARIA live regions for error announcements
    const liveRegions = page.locator('[aria-live]');
    const liveRegionCount = await liveRegions.count();
    expect(liveRegionCount).toBeGreaterThan(0);
    
    // Check for error messages with proper ARIA attributes
    const errorMessages = page.locator('[role="alert"], [aria-live="assertive"]');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);
    
    // Verify error messages are announced
    const firstError = errorMessages.first();
    const errorText = await firstError.textContent();
    expect(errorText).toBeTruthy();
    expect(errorText.length).toBeGreaterThan(0);
    
    console.log(`   ✅ ${errorCount} error messages properly announced`);
    console.log(`   ✅ Example error: "${errorText}"`);
  });

  test('should work with zoom levels up to 200%', async () => {
    console.log('🔍 Testing zoom level compatibility...');
    
    const zoomLevels = [150, 200];
    
    for (const zoomLevel of zoomLevels) {
      // Set zoom level
      await page.setViewportSize({ 
        width: Math.floor(1920 * 100 / zoomLevel), 
        height: Math.floor(1080 * 100 / zoomLevel) 
      });
      
      console.log(`   Testing at ${zoomLevel}% zoom...`);
      
      // Verify page is still functional
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Check that key elements are still visible and clickable
      await expect(page.locator('[data-testid="invite-helper-btn"]')).toBeVisible();
      
      await page.click('[data-testid="invite-helper-btn"]');
      await expect(page.locator('[data-testid="invite-helper-modal"]')).toBeVisible();
      
      // Test form interaction at this zoom level
      await page.fill('[data-testid="helper-email-input"]', `zoom${zoomLevel}@example.com`);
      await page.fill('[data-testid="helper-name-input"]', `Zoom ${zoomLevel} Test`);
      
      // Take screenshot for visual verification
      await expect(page).toHaveScreenshot(`zoom-${zoomLevel}-percent.png`);
      
      await page.keyboard.press('Escape');
      
      console.log(`   ✅ ${zoomLevel}% zoom level working correctly`);
    }
    
    // Reset viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
  });
});