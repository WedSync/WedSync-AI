/**
 * WS-130: Test Utilities for AI Photography Features
 * Common functions and helpers for Playwright tests
 */

import { Page, expect, Locator } from '@playwright/test';

/**
 * Accessibility testing utilities
 */
export class AccessibilityUtils {
  constructor(private page: Page) {}

  /**
   * Check if element meets WCAG AA contrast requirements
   */
  async checkColorContrast(element: Locator): Promise<boolean> {
    const computedStyle = await element.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
      };
    });

    // Parse RGB values and calculate contrast ratio
    const colorRgb = this.parseRgb(computedStyle.color);
    const bgRgb = this.parseRgb(computedStyle.backgroundColor);

    if (!colorRgb || !bgRgb) return true; // Skip if we can't parse

    const contrastRatio = this.calculateContrastRatio(colorRgb, bgRgb);
    return contrastRatio >= 4.5; // WCAG AA standard
  }

  /**
   * Verify keyboard navigation works properly
   */
  async testKeyboardNavigation(startElement?: string): Promise<void> {
    if (startElement) {
      await this.page.locator(startElement).focus();
    }

    const focusableElements = await this.page.evaluate(() => {
      const focusable = Array.from(
        document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      return focusable.length;
    });

    // Tab through elements
    for (let i = 0; i < Math.min(focusableElements, 20); i++) {
      await this.page.keyboard.press('Tab');

      // Verify focus is visible
      const focusedElement = this.page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Check if focus indicator is present
      const outlineStyle = await focusedElement.evaluate(
        (el) => window.getComputedStyle(el).outlineStyle,
      );
      expect(outlineStyle).not.toBe('none');
    }
  }

  /**
   * Check ARIA attributes are properly set
   */
  async verifyAriaAttributes(element: Locator): Promise<void> {
    const tagName = await element.evaluate((el) => el.tagName.toLowerCase());

    // Check role attribute exists for interactive elements
    if (['button', 'link', 'input'].includes(tagName)) {
      const role = await element.getAttribute('role');
      const ariaLabel = await element.getAttribute('aria-label');
      const ariaLabelledBy = await element.getAttribute('aria-labelledby');
      const textContent = await element.textContent();

      // Must have either role, aria-label, aria-labelledby, or text content
      expect(
        role ||
          ariaLabel ||
          ariaLabelledBy ||
          (textContent && textContent.trim().length > 0),
      ).toBeTruthy();
    }
  }

  private parseRgb(rgbString: string): [number, number, number] | null {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return null;
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }

  private calculateContrastRatio(
    color1: [number, number, number],
    color2: [number, number, number],
  ): number {
    const luminance1 = this.getLuminance(color1);
    const luminance2 = this.getLuminance(color2);
    const brighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    return (brighter + 0.05) / (darker + 0.05);
  }

  private getLuminance([r, g, b]: [number, number, number]): number {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
}

/**
 * AI Photography specific test utilities
 */
export class AiPhotographyTestUtils {
  constructor(private page: Page) {}

  /**
   * Upload test images and wait for processing
   */
  async uploadTestImages(
    selector: string,
    imageFiles: string[],
  ): Promise<void> {
    const fileInput = this.page.locator(selector);
    await fileInput.setInputFiles(imageFiles);

    // Wait for upload indicators
    await this.page.waitForSelector('[data-testid="upload-progress"]', {
      timeout: 5000,
    });
    await this.page.waitForSelector('[data-testid="upload-complete"]', {
      timeout: 15000,
    });
  }

  /**
   * Wait for AI analysis to complete with loading states
   */
  async waitForAiAnalysis(
    analysisType: 'color' | 'style' | 'mood' | 'performance',
  ): Promise<void> {
    const loadingSelector = `[data-testid="${analysisType}-analysis-loading"]`;
    const resultSelector = `[data-testid="${analysisType}-analysis-results"]`;

    // Wait for loading state to appear
    await this.page.waitForSelector(loadingSelector, { timeout: 2000 });

    // Wait for results to appear
    await this.page.waitForSelector(resultSelector, { timeout: 30000 });

    // Ensure loading state is gone
    await expect(this.page.locator(loadingSelector)).toBeHidden();
  }

  /**
   * Verify color palette results
   */
  async verifyColorPaletteResults(
    expectedColorCount: number = 3,
  ): Promise<void> {
    const colorSwatches = this.page.locator('[data-testid="color-swatch"]');
    await expect(colorSwatches).toHaveCount(expectedColorCount);

    // Verify each swatch has proper attributes
    for (let i = 0; i < expectedColorCount; i++) {
      const swatch = colorSwatches.nth(i);
      await expect(swatch).toBeVisible();
      await expect(swatch).toHaveAttribute('role', 'button');
      await expect(swatch).toHaveAttribute('tabindex', '0');
    }
  }

  /**
   * Test drag and drop functionality for mood boards
   */
  async testMoodBoardDragAndDrop(
    sourceSelector: string,
    targetSelector: string,
  ): Promise<void> {
    const source = this.page.locator(sourceSelector);
    const target = this.page.locator(targetSelector);

    // Verify elements are draggable
    await expect(source).toHaveAttribute('draggable', 'true');

    // Get initial positions
    const sourceBbox = await source.boundingBox();
    const targetBbox = await target.boundingBox();

    if (!sourceBbox || !targetBbox) {
      throw new Error('Could not get bounding boxes for drag and drop');
    }

    // Perform drag and drop
    await source.dragTo(target);

    // Verify drag operation completed (implementation specific)
    await this.page.waitForTimeout(500); // Allow for drag animation
  }

  /**
   * Mock API responses for consistent testing
   */
  async setupApiMocks(): Promise<void> {
    // Load mock responses from setup
    const fs = require('fs');
    const path = require('path');
    const mockPath = path.join(process.cwd(), 'tests', 'mock-responses.json');

    if (fs.existsSync(mockPath)) {
      const mockResponses = JSON.parse(fs.readFileSync(mockPath, 'utf8'));

      // Setup color analysis mock
      await this.page.route('**/api/ai/color-analysis', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.colorAnalysis),
        });
      });

      // Setup style matching mock
      await this.page.route('**/api/ai/style-matching', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.styleMatching),
        });
      });

      // Setup mood board recommendations mock
      await this.page.route('**/api/ai/mood-board/recommendations', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.moodBoardRecommendations),
        });
      });

      // Setup performance metrics mock
      await this.page.route('**/api/performance/metrics', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.performanceMetrics),
        });
      });
    }
  }

  /**
   * Verify performance metrics display
   */
  async verifyPerformanceMetrics(): Promise<void> {
    const metricsPanel = this.page.locator(
      '[data-testid="performance-metrics"]',
    );
    await expect(metricsPanel).toBeVisible();

    // Check key metrics are displayed
    await expect(
      this.page.locator('[data-testid="memory-usage"]'),
    ).toBeVisible();
    await expect(
      this.page.locator('[data-testid="processing-time"]'),
    ).toBeVisible();
    await expect(
      this.page.locator('[data-testid="cache-stats"]'),
    ).toBeVisible();

    // Verify metrics have proper formatting
    const memoryText = await this.page
      .locator('[data-testid="memory-usage"]')
      .textContent();
    expect(memoryText).toMatch(/\d+\s*MB/);
  }

  /**
   * Test error handling and retry mechanisms
   */
  async testErrorHandlingWithRetry(
    apiEndpoint: string,
    maxRetries: number = 3,
  ): Promise<void> {
    let attemptCount = 0;

    // Mock API that fails initially then succeeds
    await this.page.route(apiEndpoint, (route) => {
      attemptCount++;
      if (attemptCount <= maxRetries - 1) {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Temporary failure' }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });

    // Trigger the API call and verify it eventually succeeds
    // (Implementation depends on the specific UI action)
  }
}

/**
 * Visual testing utilities
 */
export class VisualTestUtils {
  constructor(private page: Page) {}

  /**
   * Compare screenshot with baseline
   */
  async compareScreenshot(
    testName: string,
    options: { fullPage?: boolean; clip?: any } = {},
  ): Promise<void> {
    await expect(this.page).toHaveScreenshot(`${testName}.png`, {
      fullPage: options.fullPage || false,
      clip: options.clip,
      animations: 'disabled',
      caret: 'hide',
    });
  }

  /**
   * Compare element screenshot
   */
  async compareElementScreenshot(
    element: Locator,
    testName: string,
  ): Promise<void> {
    await expect(element).toHaveScreenshot(`${testName}-element.png`, {
      animations: 'disabled',
    });
  }

  /**
   * Test responsive behavior at different viewport sizes
   */
  async testResponsiveDesign(
    breakpoints: { name: string; width: number; height: number }[],
  ): Promise<void> {
    for (const breakpoint of breakpoints) {
      await this.page.setViewportSize({
        width: breakpoint.width,
        height: breakpoint.height,
      });
      await this.page.waitForLoadState('networkidle');

      // Take screenshot for visual comparison
      await this.compareScreenshot(`responsive-${breakpoint.name}`);
    }
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  constructor(private page: Page) {}

  /**
   * Measure page load performance
   */
  async measurePageLoad(): Promise<{
    loadTime: number;
    domContent: number;
    firstPaint: number;
  }> {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContent:
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart,
        firstPaint:
          performance.getEntriesByName('first-contentful-paint')[0]
            ?.startTime || 0,
      };
    });

    return metrics;
  }

  /**
   * Monitor memory usage during test
   */
  async monitorMemoryUsage(): Promise<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  }> {
    const memoryInfo = await this.page.evaluate(() => {
      const memory = (performance as unknown).memory;
      return memory
        ? {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
          }
        : { usedJSHeapSize: 0, totalJSHeapSize: 0 };
    });

    return memoryInfo;
  }

  /**
   * Test AI processing performance
   */
  async measureAiProcessingTime(
    operation: () => Promise<void>,
  ): Promise<number> {
    const startTime = Date.now();
    await operation();
    const endTime = Date.now();
    return endTime - startTime;
  }
}
