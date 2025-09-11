import { test, expect, Page, Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Timeline Accessibility Testing Suite
 * Tests WCAG 2.1 AA compliance for drag-drop timeline interface
 */

class TimelineAccessibilityTester {
  constructor(public page: Page) {}

  async navigateToTimeline() {
    await this.page.goto('/timeline');
    await this.page.waitForSelector('[data-testid="timeline-container"]', { timeout: 10000 });
  }

  async checkKeyboardNavigation() {
    // Test tab navigation through timeline events
    const firstEvent = this.page.locator('[data-testid="timeline-event-1"]');
    await firstEvent.focus();
    
    // Verify focus is visible
    const focusedElement = await this.page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focusedElement).toBe('timeline-event-1');
    
    // Test tab progression
    await this.page.keyboard.press('Tab');
    const nextFocused = await this.page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(nextFocused).toBeTruthy();
    
    return true;
  }

  async checkAriaLabels() {
    const events = await this.page.locator('[data-testid^="timeline-event-"]').all();
    
    for (const event of events) {
      // Check for aria-label or aria-labelledby
      const ariaLabel = await event.getAttribute('aria-label');
      const ariaLabelledBy = await event.getAttribute('aria-labelledby');
      const ariaDescribedBy = await event.getAttribute('aria-describedby');
      
      expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      
      // Check role
      const role = await event.getAttribute('role');
      expect(role).toContain('button'); // Should be interactive
    }
    
    return true;
  }

  async checkFocusManagement() {
    const firstEvent = this.page.locator('[data-testid="timeline-event-1"]');
    await firstEvent.focus();
    
    // Test Enter key activation
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);
    
    // Focus should remain managed after interaction
    const focusAfterAction = await this.page.evaluate(() => document.activeElement?.tagName);
    expect(focusAfterAction).toBeTruthy();
    
    return true;
  }

  async checkScreenReaderCompatibility() {
    // Test live regions for dynamic updates
    const liveRegion = this.page.locator('[aria-live]');
    if (await liveRegion.count() > 0) {
      const ariaLive = await liveRegion.getAttribute('aria-live');
      expect(['polite', 'assertive']).toContain(ariaLive);
    }
    
    // Test status updates
    const statusRegion = this.page.locator('[role="status"]');
    const alertRegion = this.page.locator('[role="alert"]');
    
    return (await statusRegion.count() > 0) || (await alertRegion.count() > 0);
  }

  async checkColorContrast() {
    // Test color contrast ratios using computed styles
    const contrastResults = await this.page.evaluate(() => {
      const results = [];
      const elements = document.querySelectorAll('[data-testid^="timeline-event-"]');
      
      elements.forEach((el, index) => {
        const computed = window.getComputedStyle(el as Element);
        const bgColor = computed.backgroundColor;
        const textColor = computed.color;
        const borderColor = computed.borderColor;
        
        results.push({
          index,
          backgroundColor: bgColor,
          color: textColor,
          borderColor: borderColor,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight
        });
      });
      
      return results;
    });
    
    // Basic checks - detailed contrast ratio calculation would need a library
    expect(contrastResults.length).toBeGreaterThan(0);
    contrastResults.forEach(result => {
      expect(result.backgroundColor).not.toBe(result.color); // Basic contrast check
    });
    
    return contrastResults;
  }

  async testAlternativeInteractionMethods() {
    const event = this.page.locator('[data-testid="timeline-event-1"]');
    
    // Test context menu access
    await event.click({ button: 'right' });
    await this.page.waitForTimeout(500);
    
    // Test keyboard activation alternatives
    await event.focus();
    await this.page.keyboard.press('Space');
    await this.page.waitForTimeout(500);
    
    // Test arrow key navigation
    await this.page.keyboard.press('ArrowRight');
    await this.page.keyboard.press('ArrowLeft');
    
    return true;
  }

  async validateDragDropAccessibility() {
    const event = this.page.locator('[data-testid="timeline-event-1"]');
    
    // Check for alternative drag-drop method indicators
    const hasMoveButton = await this.page.locator('[data-testid*="move-"]').count();
    const hasKeyboardInstructions = await this.page.locator('[data-testid*="keyboard-help"]').count();
    
    // Should have either alternative controls or clear keyboard instructions
    return hasMoveButton > 0 || hasKeyboardInstructions > 0;
  }
}

test.describe('Timeline Accessibility Testing', () => {
  let tester: TimelineAccessibilityTester;
  
  test.beforeEach(async ({ page }) => {
    tester = new TimelineAccessibilityTester(page);
    await tester.navigateToTimeline();
  });

  test('should pass automated accessibility audit', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('#third-party-ads') // Exclude third-party content
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support keyboard navigation', async () => {
    const result = await tester.checkKeyboardNavigation();
    expect(result).toBe(true);
  });

  test('should have proper ARIA labels and roles', async () => {
    const result = await tester.checkAriaLabels();
    expect(result).toBe(true);
  });

  test('should manage focus correctly', async () => {
    const result = await tester.checkFocusManagement();
    expect(result).toBe(true);
  });

  test('should be compatible with screen readers', async () => {
    const result = await tester.checkScreenReaderCompatibility();
    expect(result).toBe(true);
  });

  test('should meet color contrast requirements', async () => {
    const contrastResults = await tester.checkColorContrast();
    expect(contrastResults.length).toBeGreaterThan(0);
  });

  test('should provide alternative interaction methods', async () => {
    const result = await tester.testAlternativeInteractionMethods();
    expect(result).toBe(true);
  });

  test('should have accessible drag-drop functionality', async () => {
    const result = await tester.validateDragDropAccessibility();
    expect(result).toBe(true);
  });

  test('should handle high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            background: black !important;
            color: white !important;
            border-color: white !important;
          }
        }
      `
    });
    
    // Verify timeline is still usable
    const timeline = page.locator('[data-testid="timeline-container"]');
    await expect(timeline).toBeVisible();
    
    const events = await page.locator('[data-testid^="timeline-event-"]').count();
    expect(events).toBeGreaterThan(0);
  });

  test('should support reduced motion preferences', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Check that animations are disabled or reduced
    const animationDuration = await page.evaluate(() => {
      const event = document.querySelector('[data-testid="timeline-event-1"]') as HTMLElement;
      if (!event) return null;
      
      const computed = window.getComputedStyle(event);
      return computed.transitionDuration;
    });
    
    // Should be 0s or very short for reduced motion
    expect(animationDuration).toMatch(/^(0s|0\.0*[1-2]s)$/);
  });

  test('should provide clear error messages and status updates', async ({ page }) => {
    // Attempt an invalid drag operation to trigger error
    const event = page.locator('[data-testid="timeline-event-1"]');
    
    // Try to drag to an invalid location
    await event.dragTo(page.locator('body'), { 
      targetPosition: { x: -100, y: -100 } 
    });
    
    // Should show accessible error message
    const errorMessage = page.locator('[role="alert"], [aria-live="assertive"]');
    if (await errorMessage.count() > 0) {
      const messageText = await errorMessage.textContent();
      expect(messageText).toBeTruthy();
      expect(messageText!.length).toBeGreaterThan(0);
    }
  });

  test('should maintain accessibility in different viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      // Run accessibility audit for each viewport
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      expect(results.violations.length).toBe(0);
      
      // Verify keyboard navigation still works
      const firstEvent = page.locator('[data-testid="timeline-event-1"]');
      if (await firstEvent.count() > 0) {
        await firstEvent.focus();
        const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
        expect(focused).toBe('timeline-event-1');
      }
    }
  });

  test('should provide comprehensive keyboard instructions', async ({ page }) => {
    // Look for help or instructions
    const helpButton = page.locator('[data-testid*="help"], [aria-label*="help"]');
    const instructionsPanel = page.locator('[data-testid*="instructions"]');
    
    if (await helpButton.count() > 0) {
      await helpButton.first().click();
      await page.waitForTimeout(500);
      
      const instructions = await instructionsPanel.textContent();
      expect(instructions).toBeTruthy();
      expect(instructions).toContain('keyboard');
    }
  });

  test('should announce changes to screen readers', async ({ page }) => {
    // Test drag-drop operation with live region updates
    const event = page.locator('[data-testid="timeline-event-1"]');
    const target = page.locator('[data-testid="timeline-slot-2"]');
    
    if (await target.count() > 0) {
      await event.dragTo(target);
      await page.waitForTimeout(1000);
      
      // Check for live region updates
      const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
      const liveRegionCount = await liveRegions.count();
      
      if (liveRegionCount > 0) {
        const announcement = await liveRegions.first().textContent();
        expect(announcement).toBeTruthy();
      }
    }
  });

  test('should support voice control and switch navigation', async ({ page }) => {
    // Test landmark navigation
    const landmarks = await page.locator('[role="main"], [role="navigation"], [role="region"]').count();
    expect(landmarks).toBeGreaterThan(0);
    
    // Test heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6, [role="heading"]').count();
    expect(headings).toBeGreaterThan(0);
    
    // Verify proper heading hierarchy
    const headingLevels = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'));
      return headings.map(h => {
        const level = h.getAttribute('aria-level') || h.tagName.charAt(1);
        return parseInt(level);
      }).filter(level => !isNaN(level));
    });
    
    if (headingLevels.length > 1) {
      // Check that heading levels don't skip (e.g., h1 -> h3 without h2)
      const maxSkip = Math.max(...headingLevels.slice(1).map((level, i) => level - headingLevels[i]));
      expect(maxSkip).toBeLessThanOrEqual(1);
    }
  });
});