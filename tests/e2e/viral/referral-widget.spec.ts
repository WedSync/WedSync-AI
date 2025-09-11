import { test, expect } from '@playwright/test';
import { ReferralStats } from '@/components/viral/ReferralWidget';

const mockReferralStats: ReferralStats = {
  totalReferrals: 12,
  activeReferrals: 8,
  pendingRewards: 250,
  totalEarned: 1200,
  conversionRate: 75.5
};

test.describe('ReferralWidget Component', () => {
  test.beforeEach(async ({ page }) => {
    // Create a test page with the component
    await page.goto('/test-referral-widget');
  });

  test.describe('Referral Code Display', () => {
    test('should display referral code correctly', async ({ page }) => {
      const referralCode = page.locator('[data-testid="referral-code"]');
      await expect(referralCode).toBeVisible();
      await expect(referralCode).toContainText(/^[A-Z0-9]{8}$/);
    });

    test('should copy referral code to clipboard', async ({ page }) => {
      const copyButton = page.locator('[data-testid="copy-code-button"]');
      
      // Grant clipboard permissions
      await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
      
      await copyButton.click();
      
      // Check for success feedback
      const checkIcon = page.locator('[data-testid="copy-code-button"] svg');
      await expect(checkIcon).toBeVisible();
      
      // Verify clipboard content
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toMatch(/^[A-Z0-9]{8}$/);
    });

    test('should show active badge', async ({ page }) => {
      const activeBadge = page.locator('text=Active');
      await expect(activeBadge).toBeVisible();
      await expect(activeBadge).toHaveClass(/bg-green-50/);
    });
  });

  test.describe('Social Sharing', () => {
    test('should display all social sharing buttons', async ({ page }) => {
      const socialButtons = page.locator('[data-testid="social-share-buttons"]');
      await expect(socialButtons).toBeVisible();
      
      // Check for all platform buttons
      await expect(page.locator('[data-testid="share-twitter"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-facebook"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-linkedin"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-email"]')).toBeVisible();
    });

    test('should open Twitter share dialog', async ({ page, context }) => {
      const twitterButton = page.locator('[data-testid="share-twitter"]');
      
      // Listen for new page creation
      const pagePromise = context.waitForEvent('page');
      await twitterButton.click();
      
      const newPage = await pagePromise;
      await newPage.waitForLoadState();
      
      expect(newPage.url()).toContain('twitter.com/intent/tweet');
      expect(newPage.url()).toContain('WedSync');
      
      await newPage.close();
    });

    test('should open Facebook share dialog', async ({ page, context }) => {
      const facebookButton = page.locator('[data-testid="share-facebook"]');
      
      const pagePromise = context.waitForEvent('page');
      await facebookButton.click();
      
      const newPage = await pagePromise;
      await newPage.waitForLoadState();
      
      expect(newPage.url()).toContain('facebook.com/sharer');
      
      await newPage.close();
    });

    test('should open LinkedIn share dialog', async ({ page, context }) => {
      const linkedinButton = page.locator('[data-testid="share-linkedin"]');
      
      const pagePromise = context.waitForEvent('page');
      await linkedinButton.click();
      
      const newPage = await pagePromise;
      await newPage.waitForLoadState();
      
      expect(newPage.url()).toContain('linkedin.com/sharing');
      
      await newPage.close();
    });

    test('should create mailto link for email sharing', async ({ page }) => {
      const emailButton = page.locator('[data-testid="share-email"]');
      
      // Mock window.location.href to capture email intent
      await page.evaluate(() => {
        (window as any).mockLocation = '';
        const originalSetter = Object.getOwnPropertyDescriptor(window, 'location');
        Object.defineProperty(window, 'location', {
          set: (value) => { (window as any).mockLocation = value; },
          get: () => ({ href: (window as any).mockLocation })
        });
      });
      
      await emailButton.click();
      
      const emailHref = await page.evaluate(() => (window as any).mockLocation);
      expect(emailHref).toContain('mailto:');
      expect(emailHref).toContain('WedSync');
    });
  });

  test.describe('QR Code Generation', () => {
    test('should show/hide QR code on button click', async ({ page }) => {
      const qrButton = page.locator('[data-testid="show-qr-button"]');
      
      // Initially QR code should be hidden
      await expect(page.locator('[data-testid="qr-code-image"]')).not.toBeVisible();
      
      // Click to show QR code
      await qrButton.click();
      await expect(page.locator('[data-testid="qr-code-image"]')).toBeVisible();
      
      // Button should change to hide
      await expect(page.locator('[data-testid="hide-qr-button"]')).toBeVisible();
      
      // Click to hide QR code
      await page.locator('[data-testid="hide-qr-button"]').click();
      await expect(page.locator('[data-testid="qr-code-image"]')).not.toBeVisible();
    });

    test('should show QR code loading state', async ({ page }) => {
      const qrButton = page.locator('[data-testid="show-qr-button"]');
      await qrButton.click();
      
      // Should show loading placeholder while QR code generates
      const loadingPlaceholder = page.locator('.animate-pulse');
      await expect(loadingPlaceholder).toBeVisible();
    });

    test('should enable download button after QR generation', async ({ page }) => {
      const qrButton = page.locator('[data-testid="show-qr-button"]');
      await qrButton.click();
      
      // Wait for QR code to generate
      await page.waitForTimeout(1000);
      
      const downloadButton = page.locator('text=Download');
      await expect(downloadButton).toBeVisible();
      await expect(downloadButton).toBeEnabled();
    });
  });

  test.describe('Link Copying', () => {
    test('should copy referral link to clipboard', async ({ page }) => {
      const copyLinkButton = page.locator('[data-testid="copy-link-button"]');
      
      await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
      
      await copyLinkButton.click();
      
      // Check for success feedback
      const successText = page.locator('text=Copied!');
      await expect(successText).toBeVisible();
      
      // Verify clipboard content
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('http');
    });
  });

  test.describe('Referral Stats', () => {
    test('should display referral statistics correctly', async ({ page }) => {
      const statsContainer = page.locator('[data-testid="referral-stats"]');
      await expect(statsContainer).toBeVisible();
      
      // Check total referrals
      await expect(page.locator('text=12')).toBeVisible(); // totalReferrals
      await expect(page.locator('text=Total Referrals')).toBeVisible();
      
      // Check total earned
      await expect(page.locator('text=$1200')).toBeVisible(); // totalEarned formatted
      await expect(page.locator('text=Total Earned')).toBeVisible();
      
      // Check active referrals
      await expect(page.locator('text=8')).toBeVisible(); // activeReferrals
      
      // Check pending rewards
      await expect(page.locator('text=$250')).toBeVisible(); // pendingRewards
      
      // Check conversion rate
      await expect(page.locator('text=75.5% conversion rate')).toBeVisible();
    });

    test('should show appropriate colors for stats cards', async ({ page }) => {
      // Primary card should have primary colors
      const primaryCard = page.locator('[data-testid="referral-stats"] > div').first();
      await expect(primaryCard).toHaveClass(/bg-primary-50/);
      
      // Earned card should have green colors
      const earnedCard = page.locator('[data-testid="referral-stats"] > div').nth(1);
      await expect(earnedCard).toHaveClass(/bg-green-50/);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      // Main widget should have region role
      const widget = page.locator('[data-testid="referral-widget"]');
      await expect(widget).toHaveAttribute('role', 'region');
      await expect(widget).toHaveAttribute('aria-label', 'Referral Program');
      
      // Buttons should have proper labels
      await expect(page.locator('[data-testid="copy-code-button"]')).toHaveAttribute('aria-label', 'Copy referral code');
      await expect(page.locator('[data-testid="share-twitter"]')).toHaveAttribute('aria-label', 'Share on Twitter');
      await expect(page.locator('[data-testid="share-facebook"]')).toHaveAttribute('aria-label', 'Share on Facebook');
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab'); // Copy code button
      let focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focused).toBe('copy-code-button');
      
      await page.keyboard.press('Tab'); // First social button
      focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focused).toBe('share-twitter');
      
      await page.keyboard.press('Tab'); // Second social button
      focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focused).toBe('share-facebook');
    });

    test('should have proper heading structure', async ({ page }) => {
      const title = page.locator('h3, h4, h5');
      await expect(title.first()).toBeVisible();
      
      // Check for proper heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const widget = page.locator('[data-testid="referral-widget"]');
      await expect(widget).toBeVisible();
      
      // Check that buttons are touch-friendly
      const buttons = page.locator('button');
      const firstButton = buttons.first();
      const buttonBox = await firstButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // iOS touch target
    });

    test('should work on tablet (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      const widget = page.locator('[data-testid="referral-widget"]');
      await expect(widget).toBeVisible();
      
      // Social buttons should be in grid layout
      const socialGrid = page.locator('[data-testid="social-share-buttons"]');
      await expect(socialGrid).toHaveClass(/grid-cols-2/);
    });

    test('should work on desktop (1920px)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      const widget = page.locator('[data-testid="referral-widget"]');
      await expect(widget).toBeVisible();
      
      // Widget should not exceed max width
      const widgetBox = await widget.boundingBox();
      expect(widgetBox?.width).toBeLessThanOrEqual(400); // max-w-md = 28rem = ~448px
    });
  });

  test.describe('Error Handling', () => {
    test('should handle clipboard API not available', async ({ page }) => {
      // Mock clipboard API to fail
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
          value: undefined,
          writable: true
        });
      });
      
      const copyButton = page.locator('[data-testid="copy-code-button"]');
      await copyButton.click();
      
      // Should show error toast or fallback behavior
      const errorMessage = page.locator('text=Failed to copy');
      await expect(errorMessage).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure for social sharing
      await page.route('**/twitter.com/**', route => route.abort());
      
      const twitterButton = page.locator('[data-testid="share-twitter"]');
      await twitterButton.click();
      
      // Should still show success feedback even if network fails
      const successToast = page.locator('text=Shared on Twitter!');
      await expect(successToast).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load component within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/test-referral-widget');
      await page.locator('[data-testid="referral-widget"]').waitFor();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000); // Under 2 seconds
    });

    test('should not cause layout shift', async ({ page }) => {
      await page.goto('/test-referral-widget');
      
      // Measure CLS (Cumulative Layout Shift)
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let cls = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                cls += (entry as any).value;
              }
            }
            setTimeout(() => resolve(cls), 1000);
          }).observe({ type: 'layout-shift', buffered: true });
        });
      });
      
      expect(cls).toBeLessThan(0.1); // Good CLS score
    });
  });

  test.describe('Integration', () => {
    test('should handle prop changes correctly', async ({ page }) => {
      // Test with different referral codes
      await page.goto('/test-referral-widget?code=TESTCODE');
      await expect(page.locator('[data-testid="referral-code"]')).toContainText('TESTCODE');
      
      // Navigate to different code
      await page.goto('/test-referral-widget?code=NEWCODE1');
      await expect(page.locator('[data-testid="referral-code"]')).toContainText('NEWCODE1');
    });

    test('should trigger callback functions', async ({ page }) => {
      // Mock callback tracking
      await page.addInitScript(() => {
        (window as any).callbackTracker = {
          onCodeCopy: 0,
          onShare: 0,
          onQRCodeGenerate: 0
        };
      });
      
      // Test copy callback
      const copyButton = page.locator('[data-testid="copy-code-button"]');
      await page.context().grantPermissions(['clipboard-write']);
      await copyButton.click();
      
      const copyCallbacks = await page.evaluate(() => (window as any).callbackTracker.onCodeCopy);
      expect(copyCallbacks).toBe(1);
    });
  });
});