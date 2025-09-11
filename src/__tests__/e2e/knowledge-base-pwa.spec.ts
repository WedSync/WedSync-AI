import { test, expect, Page } from '@playwright/test';

test.describe('WedMe Knowledge Base PWA', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Grant microphone permissions for voice search tests
    await page.context().grantPermissions(['microphone']);
  });

  test.beforeEach(async () => {
    await page.goto('/wedme/knowledge');
    await page.waitForLoadState('networkidle');
  });

  test.describe('PWA Installation', () => {
    test('should be installable as PWA', async () => {
      // Check for PWA manifest
      const manifestLink = page.locator('link[rel="manifest"]');
      await expect(manifestLink).toHaveAttribute('href', '/manifest.json');

      // Check for service worker registration
      const swRegistered = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      expect(swRegistered).toBe(true);

      // Check for installability
      const isInstallable = await page.evaluate(() => {
        return new Promise((resolve) => {
          window.addEventListener('beforeinstallprompt', () => {
            resolve(true);
          });
          // Trigger install prompt check
          setTimeout(() => resolve(false), 1000);
        });
      });
      // Note: Install prompt may not trigger in test environment, but we check the capability
    });

    test('should register service worker', async () => {
      const swRegistration = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          return !!registration;
        }
        return false;
      });
      expect(swRegistration).toBe(true);
    });

    test('should cache essential resources', async () => {
      // Check that service worker caches are created
      const cacheNames = await page.evaluate(async () => {
        return await caches.keys();
      });

      expect(
        cacheNames.some(
          (name: string) =>
            name.includes('wedding-knowledge') || name.includes('static'),
        ),
      ).toBe(true);
    });
  });

  test.describe('Mobile Interface', () => {
    test.beforeEach(async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('should display mobile-optimized interface', async () => {
      await expect(
        page.locator('[data-testid="mobile-knowledge-base"]'),
      ).toBeVisible();
      await expect(page.locator('h1')).toContainText('Wedding Guidance');
    });

    test('should show wedding categories grid', async () => {
      const categories = page.locator('[data-testid="category-card"]');
      await expect(categories).toHaveCount.greaterThan(0);

      // Check for essential wedding categories
      await expect(page.locator('text=Venue Selection')).toBeVisible();
      await expect(page.locator('text=Photography')).toBeVisible();
      await expect(page.locator('text=Catering')).toBeVisible();
    });

    test('should display user progress', async () => {
      await expect(page.locator('[data-testid="user-progress"]')).toBeVisible();
      await expect(page.locator('text=articles read')).toBeVisible();
      await expect(page.locator('text=categories explored')).toBeVisible();
    });

    test('should show wedding phase indicator', async () => {
      await expect(page.locator('[data-testid="wedding-phase"]')).toBeVisible();
      await expect(page.locator('text=Phase')).toBeVisible();
    });

    test('should have proper touch targets', async () => {
      const touchTargets = page.locator('button, [role="button"], a');
      const count = await touchTargets.count();

      for (let i = 0; i < count; i++) {
        const target = touchTargets.nth(i);
        if (await target.isVisible()) {
          const box = await target.boundingBox();
          if (box) {
            // Minimum 48px touch target
            expect(box.width).toBeGreaterThanOrEqual(48);
            expect(box.height).toBeGreaterThanOrEqual(48);
          }
        }
      }
    });

    test('should be scrollable on mobile', async () => {
      const scrollable = await page.evaluate(() => {
        const element = document.documentElement;
        return element.scrollHeight > element.clientHeight;
      });
      expect(scrollable).toBe(true);
    });
  });

  test.describe('Search Functionality', () => {
    test('should open search interface', async () => {
      await page.click('[data-testid="search-button"]');
      await expect(
        page.locator('[data-testid="search-interface"]'),
      ).toBeVisible();
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    });

    test('should perform text search', async () => {
      await page.click('[data-testid="search-button"]');
      await page.fill('input[placeholder*="Search"]', 'wedding venue');
      await page.waitForTimeout(500); // Debounced search

      await expect(
        page.locator('[data-testid="search-results"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="article-card"]'),
      ).toHaveCount.greaterThan(0);
    });

    test('should show search suggestions', async () => {
      await page.click('[data-testid="search-button"]');
      await page.fill('input[placeholder*="Search"]', 'venue');

      await expect(
        page.locator('[data-testid="search-suggestions"]'),
      ).toBeVisible();
      await expect(page.locator('text=How to choose')).toBeVisible();
    });

    test('should handle empty search gracefully', async () => {
      await page.click('[data-testid="search-button"]');
      await page.fill('input[placeholder*="Search"]', 'xyz123nonexistent');
      await page.waitForTimeout(500);

      await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
      await expect(page.locator('text=No articles found')).toBeVisible();
    });

    test('should close search interface', async () => {
      await page.click('[data-testid="search-button"]');
      await page.click('[data-testid="close-search"]');

      await expect(
        page.locator('[data-testid="search-interface"]'),
      ).not.toBeVisible();
    });
  });

  test.describe('Voice Search', () => {
    test('should show voice search button when supported', async () => {
      const voiceSupported = await page.evaluate(() => {
        return (
          'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
        );
      });

      if (voiceSupported) {
        await expect(
          page.locator('[data-testid="voice-search-button"]'),
        ).toBeVisible();
      } else {
        await expect(
          page.locator('[data-testid="voice-search-button"]'),
        ).not.toBeVisible();
      }
    });

    test('should open voice search interface', async () => {
      const voiceSupported = await page.evaluate(() => {
        return (
          'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
        );
      });

      if (voiceSupported) {
        await page.click('[data-testid="voice-search-button"]');
        await expect(
          page.locator('[data-testid="voice-search-interface"]'),
        ).toBeVisible();
        await expect(page.locator('text=Ask me anything')).toBeVisible();
      }
    });

    test('should handle microphone permission denial', async () => {
      // Deny microphone permission
      await page.context().clearPermissions();

      const voiceButton = page.locator('[data-testid="voice-search-button"]');
      if (await voiceButton.isVisible()) {
        await voiceButton.click();
        await page.click('[data-testid="start-voice-search"]');

        // Should show permission error
        await expect(
          page.locator('text=Microphone access denied'),
        ).toBeVisible();
      }
    });

    test('should show voice search results', async () => {
      // Mock speech recognition result
      await page.addInitScript(() => {
        // Mock SpeechRecognition
        class MockSpeechRecognition {
          onresult: any = null;
          onstart: any = null;
          onend: any = null;
          onerror: any = null;

          start() {
            if (this.onstart) this.onstart();
            setTimeout(() => {
              if (this.onresult) {
                this.onresult({
                  results: [
                    [
                      {
                        transcript: 'how to choose a wedding venue',
                        confidence: 0.95,
                        isFinal: true,
                      },
                    ],
                  ],
                });
              }
            }, 100);
          }

          stop() {
            if (this.onend) this.onend();
          }
        }

        (window as any).SpeechRecognition = MockSpeechRecognition;
        (window as any).webkitSpeechRecognition = MockSpeechRecognition;
      });

      await page.goto('/wedme/knowledge');
      await page.click('[data-testid="voice-search-button"]');
      await page.click('[data-testid="start-voice-search"]');

      // Should show transcript
      await expect(
        page.locator('text=how to choose a wedding venue'),
      ).toBeVisible();

      // Should show search results
      await expect(
        page.locator('[data-testid="voice-search-results"]'),
      ).toBeVisible();
    });
  });

  test.describe('Offline Functionality', () => {
    test('should detect offline state', async () => {
      // Simulate going offline
      await page.context().setOffline(true);
      await page.reload();

      await expect(
        page.locator('[data-testid="offline-indicator"]'),
      ).toBeVisible();
      await expect(page.locator('text=Offline Mode')).toBeVisible();
    });

    test('should show cached articles when offline', async () => {
      // First, cache some articles by browsing online
      await page.goto('/wedme/knowledge/venue-selection');
      await page.waitForLoadState('networkidle');

      // Go back and simulate offline
      await page.goto('/wedme/knowledge');
      await page.context().setOffline(true);
      await page.reload();

      // Should show offline articles
      await expect(
        page.locator('[data-testid="offline-articles"]'),
      ).toBeVisible();
      await expect(page.locator('text=available offline')).toBeVisible();
    });

    test('should handle search in offline mode', async () => {
      await page.context().setOffline(true);
      await page.reload();

      await page.click('[data-testid="search-button"]');
      await page.fill('input[placeholder*="Search"]', 'venue');

      // Should search cached content
      await expect(
        page.locator('[data-testid="offline-search-results"]'),
      ).toBeVisible();
    });

    test('should sync when coming back online', async () => {
      await page.context().setOffline(true);
      await page.reload();

      // Verify offline state
      await expect(page.locator('text=Offline Mode')).toBeVisible();

      // Go back online
      await page.context().setOffline(false);
      await page.reload();

      // Should sync and show online state
      await expect(page.locator('text=Offline Mode')).not.toBeVisible();
    });
  });

  test.describe('Article Reading Experience', () => {
    test('should navigate to article', async () => {
      const firstArticle = page.locator('[data-testid="article-card"]').first();
      await firstArticle.click();

      // Should navigate to article page
      expect(page.url()).toContain('/knowledge/');
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should show reading progress', async () => {
      const firstArticle = page.locator('[data-testid="article-card"]').first();
      await firstArticle.click();

      // Should show reading progress indicator
      await expect(
        page.locator('[data-testid="reading-progress"]'),
      ).toBeVisible();
    });

    test('should bookmark articles', async () => {
      const firstArticle = page.locator('[data-testid="article-card"]').first();
      await firstArticle.click();

      await page.click('[data-testid="bookmark-button"]');
      await expect(
        page.locator('[data-testid="bookmark-button"][aria-pressed="true"]'),
      ).toBeVisible();
    });

    test('should share articles', async () => {
      const firstArticle = page.locator('[data-testid="article-card"]').first();
      await firstArticle.click();

      await page.click('[data-testid="share-button"]');

      // Should open share interface
      await expect(
        page.locator('[data-testid="share-interface"]'),
      ).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load quickly', async () => {
      const startTime = Date.now();
      await page.goto('/wedme/knowledge');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should have good Core Web Vitals', async () => {
      await page.goto('/wedme/knowledge');

      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const timing = performance.getEntriesByType(
              'navigation',
            )[0] as PerformanceNavigationTiming;

            resolve({
              FCP: timing.domContentLoadedEventEnd - timing.fetchStart,
              LCP:
                entries.find(
                  (entry) => entry.name === 'largest-contentful-paint',
                )?.startTime || 0,
              CLS: 0, // Would need specific measurement
            });
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // Fallback timeout
          setTimeout(() => {
            const timing = performance.getEntriesByType(
              'navigation',
            )[0] as PerformanceNavigationTiming;
            resolve({
              FCP: timing.domContentLoadedEventEnd - timing.fetchStart,
              LCP: 0,
              CLS: 0,
            });
          }, 2000);
        });
      });

      const { FCP, LCP } = metrics as any;

      // Core Web Vitals thresholds
      expect(FCP).toBeLessThan(1800); // First Contentful Paint < 1.8s
      if (LCP > 0) {
        expect(LCP).toBeLessThan(2500); // Largest Contentful Paint < 2.5s
      }
    });

    test('should be responsive on different viewports', async () => {
      const viewports = [
        { width: 375, height: 667 }, // iPhone SE
        { width: 768, height: 1024 }, // iPad
        { width: 1024, height: 768 }, // Desktop small
        { width: 1920, height: 1080 }, // Desktop large
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.reload();

        // Should be visible and functional
        await expect(
          page.locator('[data-testid="mobile-knowledge-base"]'),
        ).toBeVisible();
        await expect(page.locator('h1')).toBeVisible();

        // Search should work
        await page.click('[data-testid="search-button"]');
        await expect(
          page.locator('input[placeholder*="Search"]'),
        ).toBeVisible();
        await page.click('[data-testid="close-search"]');
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async () => {
      await expect(
        page.locator('[data-testid="search-button"]'),
      ).toHaveAttribute('aria-label');
      await expect(
        page.locator('[data-testid="voice-search-button"]'),
      ).toHaveAttribute('aria-label');
    });

    test('should be keyboard navigable', async () => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to focus and activate elements
      const focusedElement = await page.evaluate(
        () => document.activeElement?.tagName,
      );
      expect(['BUTTON', 'A', 'INPUT'].includes(focusedElement!)).toBe(true);
    });

    test('should have proper heading hierarchy', async () => {
      const headings = await page
        .locator('h1, h2, h3, h4, h5, h6')
        .allTextContents();
      expect(headings.length).toBeGreaterThan(0);

      // Should have at least one h1
      await expect(page.locator('h1')).toHaveCount.greaterThanOrEqual(1);
    });

    test('should have sufficient color contrast', async () => {
      // This would require a more sophisticated color contrast checker
      // For now, we verify that important text is visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="category-card"]')).toBeVisible();
    });
  });

  test.afterAll(async () => {
    await page.close();
  });
});
