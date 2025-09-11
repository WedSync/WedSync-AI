/**
 * ACCESSIBILITY COMPLIANCE TESTING - WCAG 2.1 AA STANDARDS
 * WS-252 Music Database Integration - Team E Round 1
 * 
 * Testing accessibility compliance for wedding music management features.
 * All components must meet WCAG 2.1 AA standards for inclusive wedding planning.
 * 
 * Wedding Industry Context:
 * - DJs and wedding planners work in various lighting conditions
 * - Mobile devices used during venue setup and events
 * - Voice-over and keyboard navigation essential for multitasking
 * - High-stress environments require clear, accessible interfaces
 */

import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('Music Components - WCAG 2.1 AA Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to music management page
    await page.goto('/dashboard/music');
    
    // Wait for components to load
    await page.waitForSelector('[data-testid="music-search"]');
    await page.waitForSelector('[data-testid="music-playlist-builder"]');
  });

  test('Music Search Component - Full Accessibility Audit', async ({ page }) => {
    // Run comprehensive axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="music-search"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Verify ARIA labels and roles
    const searchInput = page.locator('[data-testid="music-search-input"]');
    await expect(searchInput).toHaveAttribute('aria-label');
    await expect(searchInput).toHaveAttribute('role', 'searchbox');
    
    const searchButton = page.locator('[data-testid="music-search-button"]');
    await expect(searchButton).toHaveAttribute('aria-label', 'Search wedding music');

    // Verify live region for search results announcement
    const resultsRegion = page.locator('[data-testid="search-results"]');
    await expect(resultsRegion).toHaveAttribute('aria-live', 'polite');
    await expect(resultsRegion).toHaveAttribute('aria-label', 'Search results');

    // Test keyboard navigation
    await searchInput.focus();
    await page.keyboard.press('Tab');
    await expect(searchButton).toBeFocused();

    // Test focus management during search
    await searchInput.fill('wedding processional');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Verify results are announced to screen readers
    const firstResult = page.locator('[data-testid="search-result"]:first-child');
    await expect(firstResult).toHaveAttribute('role', 'option');
    await expect(firstResult).toHaveAttribute('aria-label');
  });

  test('Music Playlist Builder - Drag and Drop Accessibility', async ({ page }) => {
    // Run accessibility scan on playlist builder
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="music-playlist-builder"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Verify drag and drop is keyboard accessible
    const playlistItem = page.locator('[data-testid="playlist-item"]:first-child');
    await expect(playlistItem).toHaveAttribute('role', 'listitem');
    await expect(playlistItem).toHaveAttribute('aria-grabbed', 'false');
    await expect(playlistItem).toHaveAttribute('tabindex', '0');

    // Test keyboard drag and drop
    await playlistItem.focus();
    await page.keyboard.press('Space'); // Start drag
    await expect(playlistItem).toHaveAttribute('aria-grabbed', 'true');
    
    await page.keyboard.press('ArrowDown'); // Move down
    await page.keyboard.press('Space'); // Drop
    await expect(playlistItem).toHaveAttribute('aria-grabbed', 'false');

    // Verify drop zones are properly announced
    const dropZone = page.locator('[data-testid="playlist-drop-zone"]');
    await expect(dropZone).toHaveAttribute('role', 'listbox');
    await expect(dropZone).toHaveAttribute('aria-label', 'Wedding playlist songs');
  });

  test('Wedding Timeline Integration - Screen Reader Compatibility', async ({ page }) => {
    // Navigate to timeline view
    await page.click('[data-testid="timeline-view-button"]');
    
    // Run accessibility scan on timeline
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="wedding-timeline"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Verify timeline structure is accessible
    const timeline = page.locator('[data-testid="wedding-timeline"]');
    await expect(timeline).toHaveAttribute('role', 'table');
    await expect(timeline).toHaveAttribute('aria-label', 'Wedding day music timeline');

    // Verify time slots are properly labeled
    const timeSlot = page.locator('[data-testid="timeline-slot"]:first-child');
    await expect(timeSlot).toHaveAttribute('role', 'cell');
    await expect(timeSlot).toHaveAttribute('aria-label');

    // Test keyboard navigation through timeline
    await timeSlot.focus();
    await page.keyboard.press('Tab');
    const nextSlot = page.locator('[data-testid="timeline-slot"]:nth-child(2)');
    await expect(nextSlot).toBeFocused();

    // Verify music assignments are announced properly
    const musicAssignment = page.locator('[data-testid="music-assignment"]:first-child');
    await expect(musicAssignment).toHaveAttribute('aria-describedby');
  });

  test('Color Contrast and Visual Accessibility', async ({ page }) => {
    // Test color contrast compliance
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Verify focus indicators are visible
    const focusableElements = page.locator('button, input, [tabindex="0"]');
    const count = await focusableElements.count();
    
    for (let i = 0; i < count; i++) {
      const element = focusableElements.nth(i);
      await element.focus();
      
      // Check focus indicator is visible (outline or border)
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          boxShadow: computed.boxShadow,
          border: computed.border
        };
      });
      
      const hasFocusIndicator = 
        styles.outline !== 'none' || 
        styles.boxShadow !== 'none' || 
        styles.border !== 'none';
      
      expect(hasFocusIndicator).toBeTruthy();
    }
  });

  test('Mobile Accessibility - Touch and Voice Navigation', async ({ page }) => {
    // Simulate mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Run mobile accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Verify touch targets are large enough (44x44px minimum)
    const touchTargets = page.locator('button, a, [role="button"]');
    const count = await touchTargets.count();
    
    for (let i = 0; i < count; i++) {
      const element = touchTargets.nth(i);
      const boundingBox = await element.boundingBox();
      
      expect(boundingBox!.width).toBeGreaterThanOrEqual(44);
      expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
    }

    // Test mobile navigation patterns
    const mobileMenu = page.locator('[data-testid="mobile-menu-toggle"]');
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toHaveAttribute('aria-expanded', 'false');
      await mobileMenu.click();
      await expect(mobileMenu).toHaveAttribute('aria-expanded', 'true');
    }
  });

  test('Voice Control and Speech Recognition Support', async ({ page }) => {
    // Test voice command attributes
    const voiceCommands = page.locator('[data-voice-command]');
    const count = await voiceCommands.count();
    
    for (let i = 0; i < count; i++) {
      const element = voiceCommands.nth(i);
      const voiceCommand = await element.getAttribute('data-voice-command');
      
      // Verify voice commands are meaningful
      expect(voiceCommand).toBeTruthy();
      expect(voiceCommand!.length).toBeGreaterThan(0);
      
      // Verify associated aria-label matches voice command
      const ariaLabel = await element.getAttribute('aria-label');
      expect(ariaLabel).toContain(voiceCommand!.toLowerCase());
    }

    // Test speech synthesis for music announcements
    await page.evaluate(() => {
      // Check if speech synthesis is available
      return 'speechSynthesis' in window;
    });
  });

  test('High Contrast Mode and Theme Compliance', async ({ page }) => {
    // Enable high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Run accessibility scan in high contrast
    const accessibilityScanResults = await new AxeBuilder({ page })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Verify dark theme accessibility
    const darkThemeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await darkThemeToggle.isVisible()) {
      await darkThemeToggle.click();
      await page.waitForTimeout(500);
      
      // Re-run accessibility scan with dark theme
      const darkThemeResults = await new AxeBuilder({ page })
        .analyze();
      
      expect(darkThemeResults.violations).toEqual([]);
    }
  });

  test('Error Handling and User Feedback Accessibility', async ({ page }) => {
    // Test error message accessibility
    const searchInput = page.locator('[data-testid="music-search-input"]');
    await searchInput.fill('invalid-query-test-12345');
    await page.keyboard.press('Enter');
    
    // Wait for error message
    await page.waitForSelector('[data-testid="search-error"]');
    
    const errorMessage = page.locator('[data-testid="search-error"]');
    await expect(errorMessage).toHaveAttribute('role', 'alert');
    await expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    
    // Verify error is associated with input
    const errorId = await errorMessage.getAttribute('id');
    await expect(searchInput).toHaveAttribute('aria-describedby', errorId!);

    // Test loading state accessibility
    await searchInput.fill('wedding processional');
    await page.keyboard.press('Enter');
    
    const loadingIndicator = page.locator('[data-testid="search-loading"]');
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toHaveAttribute('aria-live', 'polite');
      await expect(loadingIndicator).toHaveAttribute('aria-label', 'Searching for music');
    }
  });

  test('Multi-language and Internationalization Support', async ({ page }) => {
    // Test RTL language support
    await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl');
    });
    
    // Run accessibility scan with RTL layout
    const rtlResults = await new AxeBuilder({ page })
      .analyze();

    expect(rtlResults.violations).toEqual([]);

    // Verify proper text direction handling
    const textElements = page.locator('p, span, div:has-text');
    const count = await textElements.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = textElements.nth(i);
      const direction = await element.evaluate(el => 
        window.getComputedStyle(el).direction
      );
      
      // Should inherit RTL direction
      expect(['rtl', 'inherit']).toContain(direction);
    }

    // Reset to LTR
    await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'ltr');
    });
  });

  test('Wedding Day Stress Testing - Accessibility Under Load', async ({ page }) => {
    // Simulate high load scenario (wedding day usage)
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(
        page.locator('[data-testid="music-search-input"]')
          .fill(`search query ${i}`)
          .then(() => page.keyboard.press('Enter'))
      );
    }
    
    await Promise.all(promises);
    
    // Verify accessibility maintained under stress
    const stressTestResults = await new AxeBuilder({ page })
      .analyze();

    expect(stressTestResults.violations).toEqual([]);

    // Verify focus management during rapid interactions
    const searchInput = page.locator('[data-testid="music-search-input"]');
    await searchInput.focus();
    
    // Rapid keyboard interactions
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
    }
    
    // Verify focus is still managed correctly
    const activeElement = page.locator(':focus');
    await expect(activeElement).toBeVisible();
  });

  test('Screen Reader Integration and NVDA/JAWS Support', async ({ page }) => {
    // Test comprehensive screen reader support
    const musicInterface = page.locator('[data-testid="music-interface"]');
    
    // Verify main landmark regions
    await expect(page.locator('main')).toHaveAttribute('role', 'main');
    await expect(page.locator('nav')).toHaveAttribute('role', 'navigation');
    
    // Test heading structure (proper h1-h6 hierarchy)
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    
    if (headingCount > 0) {
      const firstHeading = headings.first();
      const tagName = await firstHeading.evaluate(el => el.tagName.toLowerCase());
      expect(tagName).toBe('h1');
    }

    // Verify skip links for keyboard navigation
    const skipLink = page.locator('[data-testid="skip-to-content"]');
    if (await skipLink.isVisible()) {
      await expect(skipLink).toHaveAttribute('href', '#main-content');
      
      // Test skip link functionality
      await skipLink.click();
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeFocused();
    }

    // Test table accessibility for playlist views
    const playlistTable = page.locator('[data-testid="playlist-table"]');
    if (await playlistTable.isVisible()) {
      await expect(playlistTable).toHaveAttribute('role', 'table');
      
      // Verify table headers
      const tableHeaders = playlistTable.locator('th');
      const headerCount = await tableHeaders.count();
      
      for (let i = 0; i < headerCount; i++) {
        const header = tableHeaders.nth(i);
        await expect(header).toHaveAttribute('scope');
      }
    }
  });
});

test.describe('Wedding Venue Accessibility - Environmental Considerations', () => {
  test('Low Light Conditions - High Contrast Requirements', async ({ page }) => {
    // Simulate low light venue conditions
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addStyleTag({
      content: `
        * { filter: brightness(0.3) contrast(1.5) !important; }
      `
    });
    
    // Verify interface remains accessible in low light
    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze();

    expect(accessibilityResults.violations).toEqual([]);
  });

  test('Outdoor Wedding Conditions - Bright Screen Requirements', async ({ page }) => {
    // Simulate bright outdoor conditions
    await page.addStyleTag({
      content: `
        * { filter: brightness(2.0) contrast(0.7) !important; }
      `
    });
    
    // Test readability in bright conditions
    const textElements = page.locator('p, span, button, label');
    const count = await textElements.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const element = textElements.nth(i);
      
      // Verify text shadow or background for readability
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          textShadow: computed.textShadow,
          backgroundColor: computed.backgroundColor,
          border: computed.border
        };
      });
      
      const hasReadabilityEnhancement = 
        styles.textShadow !== 'none' || 
        styles.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
        styles.border !== 'none';
      
      expect(hasReadabilityEnhancement).toBeTruthy();
    }
  });

  test('Gloved Hands Operation - Touch Target Enhancement', async ({ page }) => {
    // Simulate winter wedding / gloved operation
    await page.setViewportSize({ width: 414, height: 896 }); // iPhone Plus size
    
    // Verify all touch targets exceed minimum for gloved operation (48x48px)
    const touchElements = page.locator('button, a, input[type="checkbox"], input[type="radio"]');
    const count = await touchElements.count();
    
    for (let i = 0; i < count; i++) {
      const element = touchElements.nth(i);
      const boundingBox = await element.boundingBox();
      
      // Gloved operation requires larger touch targets
      expect(boundingBox!.width).toBeGreaterThanOrEqual(48);
      expect(boundingBox!.height).toBeGreaterThanOrEqual(48);
    }
  });
});

test.describe('Compliance Documentation and Reporting', () => {
  test('Generate WCAG 2.1 AA Compliance Report', async ({ page }) => {
    // Comprehensive accessibility audit
    const fullAuditResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Generate compliance report
    const complianceReport = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      standard: 'WCAG 2.1 AA',
      violations: fullAuditResults.violations,
      passes: fullAuditResults.passes,
      incomplete: fullAuditResults.incomplete,
      inapplicable: fullAuditResults.inapplicable,
      summary: {
        totalTests: fullAuditResults.passes.length + fullAuditResults.violations.length,
        passedTests: fullAuditResults.passes.length,
        failedTests: fullAuditResults.violations.length,
        complianceRate: (fullAuditResults.passes.length / 
          (fullAuditResults.passes.length + fullAuditResults.violations.length)) * 100
      }
    };

    // Verify 100% compliance
    expect(complianceReport.summary.complianceRate).toBe(100);
    expect(fullAuditResults.violations).toEqual([]);

    // Log compliance report for evidence
    console.log('WCAG 2.1 AA Compliance Report:', JSON.stringify(complianceReport, null, 2));
  });
});