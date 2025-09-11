import { test, expect } from '@playwright/test';
import { VenueSearchPage } from '../page-objects/VenueSearchPage';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility and Screen Reader Testing', () => {
  test.describe('WCAG 2.1 AA Compliance', () => {
    test('should have no accessibility violations on venue search page', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Run axe accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Check heading structure
      const headings = await page.$$// SECURITY: eval() removed - ('h1, h2, h3, h4, h5, h6', elements =>
        elements.map(el => ({
          level: parseInt(el.tagName.charAt(1)),
          text: el.textContent?.trim(),
          visible: el.offsetParent !== null
        }))
      );
      
      // Verify main heading exists
      expect(headings.filter(h => h.level === 1 && h.visible)).toHaveLength(1);
      
      // Verify heading hierarchy is logical (no skipping levels)
      for (let i = 1; i < headings.length; i++) {
        const currentLevel = headings[i].level;
        const previousLevel = headings[i - 1].level;
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
    });

    test('should provide proper form labels and descriptions', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Verify all form inputs have labels
      const formInputs = [
        venueSearch.searchQueryInput,
        venueSearch.locationInput,
        venueSearch.venueTypeSelect,
        venueSearch.minimumCapacityInput,
        venueSearch.priceRangeSelect
      ];
      
      for (const input of formInputs) {
        // Each input should have aria-label or associated label
        const hasAriaLabel = await input.getAttribute('aria-label');
        const hasAriaLabelledBy = await input.getAttribute('aria-labelledby');
        const inputId = await input.getAttribute('id');
        
        if (!hasAriaLabel && !hasAriaLabelledBy && inputId) {
          // Check for associated label element
          const associatedLabel = await page.locator(`label[for="${inputId}"]`).count();
          expect(associatedLabel).toBeGreaterThan(0);
        } else {
          expect(hasAriaLabel || hasAriaLabelledBy).toBeTruthy();
        }
      }
    });

    test('should have sufficient color contrast', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Test with axe color contrast rules
      const colorContrastResults = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();
      
      expect(colorContrastResults.violations).toEqual([]);
    });

    test('should support high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.addInitScript(() => {
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: (query: string) => {
            if (query === '(prefers-contrast: high)') {
              return { matches: true, addEventListener: () => {}, removeEventListener: () => {} };
            }
            return { matches: false, addEventListener: () => {}, removeEventListener: () => {} };
          }
        });
      });
      
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Verify high contrast styles are applied
      const containerClass = await page.locator('[data-testid="venue-search-container"]').getAttribute('class');
      expect(containerClass).toContain('high-contrast');
      
      // Take screenshot for visual verification
      await expect(page).toHaveScreenshot('high-contrast-mode.png');
    });

    test('should support reduced motion preferences', async ({ page }) => {
      // Simulate reduced motion preference
      await page.addInitScript(() => {
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: (query: string) => {
            if (query === '(prefers-reduced-motion: reduce)') {
              return { matches: true, addEventListener: () => {}, removeEventListener: () => {} };
            }
            return { matches: false, addEventListener: () => {}, removeEventListener: () => {} };
          }
        });
      });
      
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Verify animations are disabled
      const animatedElements = await page.$$('[data-animate]');
      for (const element of animatedElements) {
        const animationName = await element.evaluate(el => 
          window.getComputedStyle(el).animationName
        );
        expect(animationName).toBe('none');
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should provide meaningful page title and landmarks', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Verify page title is descriptive
      const title = await page.title();
      expect(title).toContain('Wedding Venue Search');
      
      // Verify ARIA landmarks
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('[role="banner"]')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      await expect(page.locator('[role="search"]')).toBeVisible();
    });

    test('should announce search results and status changes', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Verify live regions for status updates
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
      await expect(page.locator('[aria-live="assertive"]')).toBeVisible();
      
      // Perform search and verify announcements
      await venueSearch.enterSearchQuery('wedding venues Sydney');
      await venueSearch.clickSearchButton();
      
      // Verify search status is announced
      const statusRegion = page.locator('[aria-live="polite"]');
      await expect(statusRegion).toContainText(/searching|loading/i);
      
      // Wait for results and verify announcement
      await venueSearch.waitForSearchResults();
      await expect(statusRegion).toContainText(/found|results/i);
    });

    test('should provide accessible venue card information', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      await venueSearch.enterSearchQuery('wedding venues Sydney');
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      const firstVenueCard = page.locator('[data-testid="venue-card"]').first();
      
      // Verify venue card has proper ARIA structure
      await expect(firstVenueCard).toHaveAttribute('role', 'article');
      await expect(firstVenueCard).toHaveAttribute('aria-label');
      
      // Verify venue image has descriptive alt text
      const venueImage = firstVenueCard.locator('img');
      const altText = await venueImage.getAttribute('alt');
      expect(altText).toBeTruthy();
      expect(altText).not.toBe('');
      
      // Verify action buttons have descriptive labels
      const saveButton = firstVenueCard.locator('[data-testid="save-venue-button"]');
      const viewDetailsButton = firstVenueCard.locator('[data-testid="view-details-button"]');
      
      await expect(saveButton).toHaveAttribute('aria-label');
      await expect(viewDetailsButton).toHaveAttribute('aria-label');
    });

    test('should support screen reader navigation with skip links', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Verify skip link is present and functional
      await page.keyboard.press('Tab');
      const skipLink = page.locator('[data-testid="skip-to-content"]');
      await expect(skipLink).toBeFocused();
      
      // Test skip link functionality
      await page.keyboard.press('Enter');
      const mainContent = page.locator('main');
      await expect(mainContent).toBeFocused();
    });

    test('should provide accessible autocomplete suggestions', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Test location autocomplete accessibility
      const locationInput = venueSearch.locationInput;
      
      // Verify combobox attributes
      await expect(locationInput).toHaveAttribute('role', 'combobox');
      await expect(locationInput).toHaveAttribute('aria-expanded', 'false');
      await expect(locationInput).toHaveAttribute('aria-haspopup', 'listbox');
      
      // Start typing to trigger autocomplete
      await venueSearch.startTypingLocation('Sydney');
      
      // Verify expanded state
      await expect(locationInput).toHaveAttribute('aria-expanded', 'true');
      
      // Verify suggestions list
      const suggestionsList = page.locator('[role="listbox"]');
      await expect(suggestionsList).toBeVisible();
      
      // Verify individual options
      const suggestions = page.locator('[role="option"]');
      await expect(suggestions.first()).toHaveAttribute('aria-selected');
      
      // Test keyboard navigation through suggestions
      await page.keyboard.press('ArrowDown');
      await expect(suggestions.nth(1)).toHaveAttribute('aria-selected', 'true');
      
      // Test selection announcement
      await page.keyboard.press('Enter');
      const statusRegion = page.locator('[aria-live="polite"]');
      await expect(statusRegion).toContainText(/selected|chosen/i);
    });

    test('should provide accessible error messaging', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Mock API error
      await page.route('**/maps.googleapis.com/maps/api/place/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service unavailable' })
        });
      });
      
      await venueSearch.enterSearchQuery('wedding venues');
      await venueSearch.clickSearchButton();
      
      // Verify error is announced immediately
      const errorRegion = page.locator('[role="alert"]');
      await expect(errorRegion).toBeVisible();
      await expect(errorRegion).toContainText(/error|unable/i);
      
      // Verify error is associated with search form
      const searchForm = page.locator('[role="search"]');
      const errorId = await errorRegion.getAttribute('id');
      await expect(searchForm).toHaveAttribute('aria-describedby', expect.stringContaining(errorId!));
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support complete keyboard navigation workflow', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Test tab navigation through search form
      await venueSearch.verifyKeyboardNavigation();
      
      // Perform search using keyboard
      await venueSearch.searchQueryInput.fill('wedding venues Sydney');
      await page.keyboard.press('Enter');
      
      await venueSearch.waitForSearchResults();
      
      // Navigate to first venue card using keyboard
      await page.keyboard.press('Tab'); // Focus first venue card
      const firstVenueCard = page.locator('[data-testid="venue-card"]').first();
      await expect(firstVenueCard).toBeFocused();
      
      // Open venue details with keyboard
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="venue-details-modal"]')).toBeVisible();
      
      // Close modal with Escape key
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="venue-details-modal"]')).not.toBeVisible();
    });

    test('should handle focus management in modal dialogs', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      await venueSearch.enterSearchQuery('wedding venues');
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      // Open venue details modal
      await venueSearch.openVenueDetails(0);
      
      // Verify focus is trapped within modal
      const modal = page.locator('[data-testid="venue-details-modal"]');
      const focusableElements = modal.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      
      const firstFocusable = focusableElements.first();
      const lastFocusable = focusableElements.last();
      
      // Focus should be on first focusable element
      await expect(firstFocusable).toBeFocused();
      
      // Tab to last element
      const elementCount = await focusableElements.count();
      for (let i = 0; i < elementCount - 1; i++) {
        await page.keyboard.press('Tab');
      }
      await expect(lastFocusable).toBeFocused();
      
      // Tab again should cycle back to first
      await page.keyboard.press('Tab');
      await expect(firstFocusable).toBeFocused();
      
      // Shift+Tab should go to last element
      await page.keyboard.press('Shift+Tab');
      await expect(lastFocusable).toBeFocused();
    });

    test('should support keyboard shortcuts for power users', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Test global keyboard shortcuts
      
      // Ctrl+K should focus search input
      await page.keyboard.press('Control+KeyK');
      await expect(venueSearch.searchQueryInput).toBeFocused();
      
      // Escape should clear search
      await venueSearch.searchQueryInput.fill('test');
      await page.keyboard.press('Escape');
      await expect(venueSearch.searchQueryInput).toHaveValue('');
      
      // Enter search term and test more shortcuts
      await venueSearch.enterSearchQuery('wedding venues');
      await page.keyboard.press('Enter'); // Enter should trigger search
      await venueSearch.waitForSearchResults();
      
      // 'S' should toggle saved venues tab
      await page.keyboard.press('KeyS');
      await expect(venueSearch.savedVenuesTab).toHaveAttribute('aria-selected', 'true');
      
      // 'R' should return to results tab
      await page.keyboard.press('KeyR');
      await expect(venueSearch.searchResultsTab).toHaveAttribute('aria-selected', 'true');
      
      // '1-9' should select venue by number
      await page.keyboard.press('Digit1');
      const firstVenueCard = page.locator('[data-testid="venue-card"]').first();
      await expect(firstVenueCard).toBeFocused();
    });

    test('should handle keyboard navigation in comparison mode', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      await venueSearch.enterSearchQuery('wedding venues');
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      // Enable comparison mode
      await venueSearch.enableCompareMode();
      
      // Use keyboard to select venues for comparison
      await page.keyboard.press('Tab'); // Focus first venue
      await page.keyboard.press('Space'); // Select first venue
      
      await page.keyboard.press('Tab'); // Focus second venue
      await page.keyboard.press('Space'); // Select second venue
      
      // Open comparison with keyboard shortcut
      await page.keyboard.press('Control+Enter');
      await expect(page.locator('[data-testid="venue-comparison-modal"]')).toBeVisible();
      
      // Navigate through comparison table with arrow keys
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      
      // Verify focus is visible in comparison table
      const focusedCell = page.locator('[data-testid="comparison-table"] [tabindex="0"]');
      await expect(focusedCell).toBeFocused();
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should maintain accessibility on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Run accessibility scan on mobile
      const mobileAccessibilityResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      expect(mobileAccessibilityResults.violations).toEqual([]);
      
      // Verify touch targets meet accessibility standards (44px minimum for iOS)
      const touchTargets = await page.$$('[data-testid*="button"], [role="button"], a, input, select');
      
      for (const target of touchTargets) {
        const boundingBox = await target.boundingBox();
        if (boundingBox) {
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
          expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should support voice control on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Verify voice control attributes
      const searchInput = venueSearch.searchQueryInput;
      await expect(searchInput).toHaveAttribute('aria-label');
      
      const searchButton = venueSearch.searchButton;
      await expect(searchButton).toHaveAttribute('aria-label');
      
      // Verify elements have accessible names for voice commands
      const locationInput = venueSearch.locationInput;
      const ariaLabel = await locationInput.getAttribute('aria-label');
      expect(ariaLabel).toContain('location');
      
      // Test that voice commands would work by checking element naming
      await venueSearch.enterSearchQuery('wedding venues');
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      const venueCards = page.locator('[data-testid="venue-card"]');
      const firstCard = venueCards.first();
      
      const cardLabel = await firstCard.getAttribute('aria-label');
      expect(cardLabel).toBeTruthy();
      expect(cardLabel).toContain('venue');
    });

    test('should work with mobile screen readers', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Simulate mobile screen reader usage
      
      // Verify reading order is logical
      const headingElements = await page.$$('h1, h2, h3, h4, h5, h6');
      const headingTexts = await Promise.all(
        headingElements.map(el => el.textContent())
      );
      
      expect(headingTexts[0]).toContain('Wedding Venue Search');
      
      // Verify swipe navigation works (simulate with keyboard)
      await page.keyboard.press('Tab');
      await expect(venueSearch.searchQueryInput).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(venueSearch.locationInput).toBeFocused();
      
      // Perform search and verify results are accessible
      await venueSearch.enterSearchQuery('wedding venues');
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      // Verify results can be navigated with swipe gestures (Tab simulation)
      await page.keyboard.press('Tab');
      const firstVenueCard = page.locator('[data-testid="venue-card"]').first();
      await expect(firstVenueCard).toBeFocused();
      
      // Verify venue information is announced properly
      const cardAriaLabel = await firstVenueCard.getAttribute('aria-label');
      expect(cardAriaLabel).toContain('venue');
      expect(cardAriaLabel).toContain('rating');
    });
  });

  test.describe('Focus Management and Visual Focus', () => {
    test('should maintain visible focus indicators', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Test focus indicators on form elements
      const focusableElements = [
        venueSearch.searchQueryInput,
        venueSearch.locationInput,
        venueSearch.venueTypeSelect,
        venueSearch.searchButton
      ];
      
      for (const element of focusableElements) {
        await element.focus();
        
        // Verify visible focus indicator
        const focusOutline = await element.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            boxShadow: styles.boxShadow
          };
        });
        
        // Should have some form of focus indicator
        const hasFocusIndicator = focusOutline.outline !== 'none' || 
                                 focusOutline.outlineWidth !== '0px' ||
                                 focusOutline.boxShadow !== 'none';
        
        expect(hasFocusIndicator).toBeTruthy();
      }
    });

    test('should restore focus appropriately after interactions', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      await venueSearch.enterSearchQuery('wedding venues');
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      // Focus a venue card
      const firstVenueCard = page.locator('[data-testid="venue-card"]').first();
      await firstVenueCard.focus();
      
      // Open details modal
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="venue-details-modal"]')).toBeVisible();
      
      // Close modal
      await page.keyboard.press('Escape');
      
      // Focus should return to the venue card that opened the modal
      await expect(firstVenueCard).toBeFocused();
    });

    test('should handle focus for dynamically added content', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      await venueSearch.enterSearchQuery('wedding venues');
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      const initialVenueCount = await page.locator('[data-testid="venue-card"]').count();
      
      // Load more results
      const loadMoreButton = page.locator('[data-testid="load-more-button"]');
      if (await loadMoreButton.isVisible()) {
        await loadMoreButton.click();
        
        // Wait for new content to load
        await page.waitForFunction(
          (initialCount) => {
            const cards = document.querySelectorAll('[data-testid="venue-card"]');
            return cards.length > initialCount;
          },
          initialVenueCount
        );
        
        // Focus should be manageable on new content
        const newVenueCards = page.locator('[data-testid="venue-card"]');
        const lastCard = newVenueCards.last();
        
        await lastCard.focus();
        await expect(lastCard).toBeFocused();
      }
    });
  });
});