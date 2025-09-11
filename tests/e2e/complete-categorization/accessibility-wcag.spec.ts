import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// WCAG 2.1 AA Compliance Testing for Task Categorization System
test.describe('WCAG 2.1 AA Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Login to application
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@wedding.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test.describe('Automated Accessibility Scanning', () => {
    test('task creation page should have no accessibility violations', async ({ page }) => {
      await page.goto('/tasks/create');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('[data-testid="third-party-widget"]') // Exclude third-party components
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('task list with categories should be accessible', async ({ page }) => {
      await page.goto('/tasks');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('category filter interface should be accessible', async ({ page }) => {
      await page.goto('/tasks');
      await page.click('[data-testid="open-filters"]');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Color Contrast (WCAG 1.4.3)', () => {
    test('category color coding should meet contrast requirements', async ({ page }) => {
      await page.goto('/tasks');

      // Check contrast for each category color
      const categories = ['setup', 'ceremony', 'reception', 'breakdown'];
      
      for (const category of categories) {
        const element = page.locator(`[data-testid="category-badge-${category}"]`).first();
        
        if (await element.isVisible()) {
          const backgroundColor = await element.evaluate(el => 
            window.getComputedStyle(el).backgroundColor
          );
          
          const textColor = await element.evaluate(el => 
            window.getComputedStyle(el).color
          );
          
          // Calculate contrast ratio
          const contrast = await page.evaluate(([bg, fg]) => {
            // Convert rgb to luminance
            const getLuminance = (rgb: string) => {
              const matches = rgb.match(/\d+/g);
              if (!matches) return 0;
              
              const [r, g, b] = matches.map(Number);
              const [rs, gs, bs] = [r, g, b].map(c => {
                c = c / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
              });
              
              return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
            };
            
            const l1 = getLuminance(bg);
            const l2 = getLuminance(fg);
            
            return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          }, [backgroundColor, textColor]);
          
          // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
          expect(contrast).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    test('focus indicators should have sufficient contrast', async ({ page }) => {
      await page.goto('/tasks');
      
      // Tab to first interactive element
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      const outline = await focusedElement.evaluate(el => 
        window.getComputedStyle(el).outline
      );
      
      expect(outline).not.toBe('none');
      expect(outline).toContain('px'); // Should have visible outline
    });
  });

  test.describe('Keyboard Navigation (WCAG 2.1.1)', () => {
    test('should navigate task categories with keyboard only', async ({ page }) => {
      await page.goto('/tasks');
      
      // Tab to category filter
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should focus on first category filter
      const focusedElement = await page.evaluate(() => 
        document.activeElement?.getAttribute('data-testid')
      );
      expect(focusedElement).toContain('filter-');
      
      // Navigate between categories with arrow keys
      await page.keyboard.press('ArrowRight');
      const newFocus = await page.evaluate(() => 
        document.activeElement?.getAttribute('data-testid')
      );
      expect(newFocus).not.toBe(focusedElement);
      
      // Activate filter with Enter
      await page.keyboard.press('Enter');
      
      // Verify filter was applied
      await expect(page.locator('[data-testid="active-filters"]')).toBeVisible();
    });

    test('should complete task creation with keyboard only', async ({ page }) => {
      await page.goto('/tasks/create');
      
      // Navigate through form with Tab
      await page.keyboard.press('Tab'); // Skip to title
      await page.keyboard.type('Keyboard navigation test task');
      
      await page.keyboard.press('Tab'); // Description
      await page.keyboard.type('Testing keyboard accessibility');
      
      await page.keyboard.press('Tab'); // Category dropdown
      await page.keyboard.press('Enter'); // Open dropdown
      await page.keyboard.press('ArrowDown'); // Navigate options
      await page.keyboard.press('Enter'); // Select option
      
      await page.keyboard.press('Tab'); // Priority
      await page.keyboard.press('Space'); // Select priority
      
      // Submit with keyboard
      await page.keyboard.press('Tab'); // Navigate to submit
      await page.keyboard.press('Enter');
      
      // Verify task was created
      await expect(page.locator('[data-testid="task-created-toast"]')).toBeVisible();
    });

    test('should trap focus in modals', async ({ page }) => {
      await page.goto('/tasks');
      
      // Open task details modal
      await page.click('[data-testid="task-item"]');
      
      // Check focus trap
      const modalElements = await page.locator('[role="dialog"] *:is(button, input, select, textarea, a[href], [tabindex])').count();
      
      // Tab through all elements
      for (let i = 0; i < modalElements + 1; i++) {
        await page.keyboard.press('Tab');
      }
      
      // Focus should wrap back to first element in modal
      const focusedElement = await page.evaluate(() => 
        document.activeElement?.closest('[role="dialog"]')
      );
      expect(focusedElement).not.toBeNull();
    });
  });

  test.describe('Screen Reader Support (WCAG 1.3.1)', () => {
    test('should have proper ARIA labels for categories', async ({ page }) => {
      await page.goto('/tasks');
      
      const categories = ['setup', 'ceremony', 'reception', 'breakdown'];
      
      for (const category of categories) {
        const filter = page.locator(`[data-testid="filter-${category}"]`);
        
        if (await filter.isVisible()) {
          const ariaLabel = await filter.getAttribute('aria-label');
          expect(ariaLabel).toBeTruthy();
          expect(ariaLabel).toContain(category);
          
          // Check for aria-pressed state
          const ariaPressed = await filter.getAttribute('aria-pressed');
          expect(['true', 'false']).toContain(ariaPressed);
        }
      }
    });

    test('should announce category changes to screen readers', async ({ page }) => {
      await page.goto('/tasks');
      
      // Check for live region
      const liveRegion = page.locator('[role="status"][aria-live="polite"]');
      await expect(liveRegion).toHaveCount(1);
      
      // Apply filter and check announcement
      await page.click('[data-testid="filter-ceremony"]');
      
      const announcement = await liveRegion.textContent();
      expect(announcement).toContain('ceremony');
    });

    test('should have descriptive labels for form elements', async ({ page }) => {
      await page.goto('/tasks/create');
      
      // Check all form inputs have labels
      const inputs = page.locator('input, select, textarea');
      const count = await inputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        
        if (id) {
          // Check for associated label
          const label = page.locator(`label[for="${id}"]`);
          const labelText = await label.textContent();
          expect(labelText).toBeTruthy();
        } else {
          // Check for aria-label
          const ariaLabel = await input.getAttribute('aria-label');
          expect(ariaLabel).toBeTruthy();
        }
      }
    });

    test('should provide context for category badges', async ({ page }) => {
      await page.goto('/tasks');
      
      const badge = page.locator('[data-testid^="category-badge-"]').first();
      
      if (await badge.isVisible()) {
        const ariaLabel = await badge.getAttribute('aria-label');
        expect(ariaLabel).toContain('Category:');
        
        // Check for additional context
        const ariaDescribedBy = await badge.getAttribute('aria-describedby');
        if (ariaDescribedBy) {
          const description = page.locator(`#${ariaDescribedBy}`);
          const descText = await description.textContent();
          expect(descText).toBeTruthy();
        }
      }
    });
  });

  test.describe('Focus Management (WCAG 2.4.3)', () => {
    test('should maintain focus order logically', async ({ page }) => {
      await page.goto('/tasks');
      
      const expectedOrder = [
        'skip-navigation',
        'main-navigation',
        'search-input',
        'filter-setup',
        'filter-ceremony',
        'filter-reception',
        'filter-breakdown',
        'task-item'
      ];
      
      const actualOrder = [];
      
      for (let i = 0; i < expectedOrder.length; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => 
          document.activeElement?.getAttribute('data-testid')
        );
        if (focused) {
          actualOrder.push(focused);
        }
      }
      
      // Check if order matches expected pattern
      for (const expected of expectedOrder) {
        expect(actualOrder.some(actual => actual?.includes(expected))).toBe(true);
      }
    });

    test('should restore focus after modal closes', async ({ page }) => {
      await page.goto('/tasks');
      
      // Focus on a task
      const taskButton = page.locator('[data-testid="task-item"]').first();
      await taskButton.focus();
      
      // Open modal
      await taskButton.click();
      await page.waitForSelector('[role="dialog"]');
      
      // Close modal
      await page.keyboard.press('Escape');
      
      // Focus should return to the task button
      const focusedElement = await page.evaluate(() => 
        document.activeElement?.getAttribute('data-testid')
      );
      expect(focusedElement).toBe('task-item');
    });
  });

  test.describe('Text Alternatives (WCAG 1.1.1)', () => {
    test('should provide alt text for category icons', async ({ page }) => {
      await page.goto('/tasks');
      
      const icons = page.locator('[data-testid^="category-icon-"] img');
      const count = await icons.count();
      
      for (let i = 0; i < count; i++) {
        const icon = icons.nth(i);
        const alt = await icon.getAttribute('alt');
        expect(alt).toBeTruthy();
        expect(alt).not.toBe(''); // Not empty
        expect(alt).not.toMatch(/image|icon|img/i); // Descriptive, not redundant
      }
    });

    test('should provide text alternatives for color coding', async ({ page }) => {
      await page.goto('/tasks');
      
      const coloredElements = page.locator('[data-category-color]');
      const count = await coloredElements.count();
      
      for (let i = 0; i < count; i++) {
        const element = coloredElements.nth(i);
        
        // Should have text or aria-label in addition to color
        const text = await element.textContent();
        const ariaLabel = await element.getAttribute('aria-label');
        
        expect(text || ariaLabel).toBeTruthy();
      }
    });
  });

  test.describe('Responsive Text (WCAG 1.4.4)', () => {
    test('should allow text resizing up to 200%', async ({ page }) => {
      await page.goto('/tasks');
      
      // Set zoom to 200%
      await page.evaluate(() => {
        document.body.style.zoom = '2';
      });
      
      // Check that content is still functional
      const taskTitle = page.locator('[data-testid="task-item"]').first();
      await expect(taskTitle).toBeVisible();
      
      // Check no horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => 
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasHorizontalScroll).toBe(false);
      
      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = '1';
      });
    });
  });

  test.describe('Error Identification (WCAG 3.3.1)', () => {
    test('should clearly identify form errors', async ({ page }) => {
      await page.goto('/tasks/create');
      
      // Submit empty form
      await page.click('[data-testid="save-task"]');
      
      // Check for error messages
      const errors = page.locator('[role="alert"]');
      const errorCount = await errors.count();
      expect(errorCount).toBeGreaterThan(0);
      
      // Errors should be associated with fields
      const titleInput = page.locator('[data-testid="task-title"]');
      const ariaInvalid = await titleInput.getAttribute('aria-invalid');
      expect(ariaInvalid).toBe('true');
      
      const ariaDescribedBy = await titleInput.getAttribute('aria-describedby');
      expect(ariaDescribedBy).toBeTruthy();
      
      // Error message should be readable
      const errorMessage = page.locator(`#${ariaDescribedBy}`);
      const errorText = await errorMessage.textContent();
      expect(errorText).toContain('required');
    });
  });

  test.describe('Touch Target Size (WCAG 2.5.5)', () => {
    test('should have adequate touch target sizes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport
      await page.goto('/tasks');
      
      // Check category filter buttons
      const filterButtons = page.locator('[data-testid^="filter-"]');
      const count = await filterButtons.count();
      
      for (let i = 0; i < count; i++) {
        const button = filterButtons.nth(i);
        const box = await button.boundingBox();
        
        if (box) {
          // WCAG 2.5.5 requires 44x44 CSS pixels minimum
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe('Motion and Animation (WCAG 2.3.3)', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/tasks');
      
      // Check that animations are disabled
      const hasTransition = await page.evaluate(() => {
        const element = document.querySelector('[data-testid="task-item"]');
        if (!element) return false;
        
        const transition = window.getComputedStyle(element).transition;
        return transition !== 'none' && transition !== '';
      });
      
      expect(hasTransition).toBe(false);
    });
  });

  test.describe('Consistent Navigation (WCAG 3.2.3)', () => {
    test('should maintain consistent navigation across pages', async ({ page }) => {
      const pages = ['/tasks', '/helpers', '/dashboard'];
      const navItems = [];
      
      for (const pageUrl of pages) {
        await page.goto(pageUrl);
        
        const nav = await page.locator('nav [data-testid^="nav-"]').allTextContents();
        navItems.push(nav);
      }
      
      // All pages should have the same navigation items
      for (let i = 1; i < navItems.length; i++) {
        expect(navItems[i]).toEqual(navItems[0]);
      }
    });
  });

  test.describe('Page Language (WCAG 3.1.1)', () => {
    test('should specify page language', async ({ page }) => {
      await page.goto('/tasks');
      
      const lang = await page.getAttribute('html', 'lang');
      expect(lang).toBeTruthy();
      expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., 'en' or 'en-US'
    });
  });

  test.describe('Headings Structure (WCAG 1.3.1)', () => {
    test('should have logical heading hierarchy', async ({ page }) => {
      await page.goto('/tasks');
      
      const headings = await page.evaluate(() => {
        const h1 = document.querySelectorAll('h1');
        const h2 = document.querySelectorAll('h2');
        const h3 = document.querySelectorAll('h3');
        
        return {
          h1Count: h1.length,
          h2Count: h2.length,
          h3Count: h3.length,
          h1Text: Array.from(h1).map(h => h.textContent),
          firstH2Level: h2[0]?.tagName,
          hasSkippedLevels: document.querySelector('h1 + h3') !== null
        };
      });
      
      // Should have exactly one h1
      expect(headings.h1Count).toBe(1);
      
      // Should not skip heading levels
      expect(headings.hasSkippedLevels).toBe(false);
    });
  });

  test.afterEach(async ({ page }) => {
    // Capture accessibility tree for debugging
    const snapshot = await page.accessibility.snapshot();
    if (snapshot) {
      console.log('Accessibility tree captured for debugging');
    }
  });
});