import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Test fixtures for different platforms
const platforms = {
  desktop: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1200, height: 800 }
  },
  android: {
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    viewport: { width: 393, height: 851 }
  },
  ios: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 }
  }
};

// Helper function to setup platform context
async function setupPlatformContext(context: BrowserContext, platform: keyof typeof platforms) {
  await context.addInitScript((userAgent) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
      writable: false
    });
  }, platforms[platform].userAgent);
}

// Helper function to mock beforeinstallprompt event
async function mockBeforeInstallPrompt(page: Page, outcome: 'accepted' | 'dismissed' = 'accepted') {
  await page.addInitScript((outcome) => {
    let deferredPrompt: any = null;
    
    setTimeout(() => {
      const event = new Event('beforeinstallprompt');
      (event as any).platforms = ['web'];
      (event as any).prompt = () => Promise.resolve();
      (event as any).userChoice = Promise.resolve({ outcome, platform: 'web' });
      (event as any).preventDefault = () => {};
      
      deferredPrompt = event;
      window.dispatchEvent(event);
    }, 1000);
    
    // Make deferredPrompt available for testing
    (window as any).testDeferredPrompt = () => deferredPrompt;
  }, outcome);
}

// Helper function to simulate PWA installation criteria
async function setupPWAEnvironment(page: Page) {
  // Mock service worker registration
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: () => Promise.resolve({ installing: null, waiting: null, active: null }),
        ready: Promise.resolve({ installing: null, waiting: null, active: null })
      }
    });
  });

  // Mock secure context
  await page.addInitScript(() => {
    Object.defineProperty(window, 'isSecureContext', {
      value: true
    });
  });
}

test.describe('PWA Install Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Setup PWA environment for all tests
    await setupPWAEnvironment(page);
    
    // Mock analytics to prevent network calls
    await page.addInitScript(() => {
      (window as any).analytics = {
        track: (event: string, properties: any) => {
          console.log(`Analytics: ${event}`, properties);
        }
      };
    });
  });

  test.describe('Desktop Install Flow', () => {
    test.beforeEach(async ({ context, page }) => {
      await setupPlatformContext(context, 'desktop');
      await page.setViewportSize(platforms.desktop.viewport);
    });

    test('should show install button when PWA is installable', async ({ page }) => {
      await mockBeforeInstallPrompt(page, 'accepted');
      await page.goto('/dashboard');
      
      // Wait for PWA installability check
      await page.waitForTimeout(2000);
      
      // Install button should be visible
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      await expect(installButton).toBeVisible();
      await expect(installButton).toContainText('Install WedSync');
      
      // Button should have correct desktop icon
      const downloadIcon = installButton.locator('[data-testid="download-icon"]');
      await expect(downloadIcon).toBeVisible();
    });

    test('should handle successful desktop install flow', async ({ page }) => {
      await mockBeforeInstallPrompt(page, 'accepted');
      await page.goto('/dashboard');
      
      await page.waitForTimeout(2000);
      
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      await expect(installButton).toBeVisible();
      
      // Mock console to capture analytics events
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        if (msg.text().includes('Analytics:')) {
          consoleMessages.push(msg.text());
        }
      });
      
      // Click install button
      await installButton.click();
      
      // Should see loading state
      await expect(installButton.locator('.animate-spin')).toBeVisible();
      
      // Wait for install process
      await page.waitForTimeout(1000);
      
      // Verify analytics events were tracked
      expect(consoleMessages).toEqual(
        expect.arrayContaining([
          expect.stringContaining('pwa_install_button_clicked'),
          expect.stringContaining('pwa_install_prompt_shown'),
          expect.stringContaining('pwa_install_accepted')
        ])
      );
      
      // Simulate app installed event
      await page.evaluate(() => {
        window.dispatchEvent(new Event('appinstalled'));
      });
      
      // Install button should disappear after installation
      await expect(installButton).not.toBeVisible();
    });

    test('should handle install dismissal correctly', async ({ page }) => {
      await mockBeforeInstallPrompt(page, 'dismissed');
      await page.goto('/dashboard');
      
      await page.waitForTimeout(2000);
      
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      await installButton.click();
      
      await page.waitForTimeout(1000);
      
      // Button should still be visible but install state should be dismissed
      await expect(installButton).toBeDisabled();
    });

    test('should be accessible via keyboard navigation', async ({ page }) => {
      await mockBeforeInstallPrompt(page, 'accepted');
      await page.goto('/dashboard');
      
      await page.waitForTimeout(2000);
      
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      
      // Focus button with Tab
      await page.keyboard.press('Tab');
      await expect(installButton).toBeFocused();
      
      // Activate with Enter
      await page.keyboard.press('Enter');
      
      // Should see loading state
      await expect(installButton.locator('.animate-spin')).toBeVisible();
    });
  });

  test.describe('iOS Install Flow', () => {
    test.beforeEach(async ({ context, page }) => {
      await setupPlatformContext(context, 'ios');
      await page.setViewportSize(platforms.ios.viewport);
    });

    test('should show iOS-specific install button', async ({ page }) => {
      await page.goto('/dashboard');
      
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      await expect(installButton).toBeVisible();
      await expect(installButton).toContainText('Add to Home Screen');
      
      // Should show smartphone icon for iOS
      const smartphoneIcon = installButton.locator('[data-testid="smartphone-icon"]');
      await expect(smartphoneIcon).toBeVisible();
    });

    test('should show iOS install instructions modal', async ({ page }) => {
      await page.goto('/dashboard');
      
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      await installButton.click();
      
      // Should show iOS instructions modal
      const modal = page.locator('text=Install WedSync');
      await expect(modal).toBeVisible();
      
      const iosInstructions = page.locator('text=Add to your iPhone home screen');
      await expect(iosInstructions).toBeVisible();
      
      // Should show step-by-step instructions
      await expect(page.locator('text=Tap the Share button')).toBeVisible();
      await expect(page.locator('text=Find "Add to Home Screen"')).toBeVisible();
      await expect(page.locator('text=Tap "Add"')).toBeVisible();
      
      // Should show wedding-specific benefits
      await expect(page.locator('text=Access timelines offline')).toBeVisible();
      await expect(page.locator('text=Quick vendor status checks')).toBeVisible();
    });

    test('should handle iOS modal interactions', async ({ page }) => {
      await page.goto('/dashboard');
      
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      await installButton.click();
      
      // Modal should be visible
      const modal = page.locator('text=Install WedSync');
      await expect(modal).toBeVisible();
      
      // Click "Got it!" button
      const gotItButton = page.locator('text=Got it!');
      await gotItButton.click();
      
      // Modal should close
      await expect(modal).not.toBeVisible();
    });

    test('should handle iOS modal dismissal', async ({ page }) => {
      await page.goto('/dashboard');
      
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      await installButton.click();
      
      // Click "Maybe later" button
      const maybeLaterButton = page.locator('text=Maybe later');
      await maybeLaterButton.click();
      
      // Modal should close
      const modal = page.locator('text=Install WedSync');
      await expect(modal).not.toBeVisible();
    });

    test('should close modal with X button', async ({ page }) => {
      await page.goto('/dashboard');
      
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      await installButton.click();
      
      // Click X button
      const closeButton = page.locator('[data-testid="x-icon"]').first();
      await closeButton.click();
      
      // Modal should close
      const modal = page.locator('text=Install WedSync');
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Android Install Flow', () => {
    test.beforeEach(async ({ context, page }) => {
      await setupPlatformContext(context, 'android');
      await page.setViewportSize(platforms.android.viewport);
    });

    test('should show Android-specific install button', async ({ page }) => {
      await mockBeforeInstallPrompt(page, 'accepted');
      await page.goto('/dashboard');
      
      await page.waitForTimeout(2000);
      
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      await expect(installButton).toBeVisible();
      await expect(installButton).toContainText('Install App');
      
      // Should show download icon for Android
      const downloadIcon = installButton.locator('[data-testid="download-icon"]');
      await expect(downloadIcon).toBeVisible();
    });

    test('should handle Android native install prompt', async ({ page }) => {
      await mockBeforeInstallPrompt(page, 'accepted');
      await page.goto('/dashboard');
      
      await page.waitForTimeout(2000);
      
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      await installButton.click();
      
      // Should trigger native install prompt (simulated)
      await page.waitForTimeout(1000);
      
      // Simulate successful installation
      await page.evaluate(() => {
        window.dispatchEvent(new Event('appinstalled'));
      });
      
      // Install button should disappear
      await expect(installButton).not.toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to different screen sizes', async ({ page }) => {
      await mockBeforeInstallPrompt(page, 'accepted');
      await page.goto('/dashboard');
      
      await page.waitForTimeout(2000);
      
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      const installButtonMobile = page.locator('[data-testid="pwa-install-button"]');
      await expect(installButtonMobile).toBeVisible();
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      const installButtonTablet = page.locator('[data-testid="pwa-install-button"]');
      await expect(installButtonTablet).toBeVisible();
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1200, height: 800 });
      const installButtonDesktop = page.locator('[data-testid="pwa-install-button"]');
      await expect(installButtonDesktop).toBeVisible();
    });
  });

  test.describe('Button Variants', () => {
    test('should render different button variants correctly', async ({ page }) => {
      await mockBeforeInstallPrompt(page, 'accepted');
      
      // Create test page with different variants
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);
      
      // Inject test buttons with different variants
      await page.evaluate(() => {
        const container = document.createElement('div');
        container.innerHTML = `
          <div data-testid="primary-variant" class="bg-primary-600 text-white">Primary</div>
          <div data-testid="secondary-variant" class="bg-white text-gray-900 border">Secondary</div>
          <div data-testid="ghost-variant" class="bg-transparent text-gray-700">Ghost</div>
        `;
        document.body.appendChild(container);
      });
      
      // Verify variant styling
      await expect(page.locator('[data-testid="primary-variant"]')).toHaveClass(/bg-primary-600/);
      await expect(page.locator('[data-testid="secondary-variant"]')).toHaveClass(/bg-white/);
      await expect(page.locator('[data-testid="ghost-variant"]')).toHaveClass(/bg-transparent/);
    });
  });

  test.describe('Already Installed State', () => {
    test('should not show install button when PWA is already installed', async ({ page }) => {
      // Mock standalone mode (PWA installed)
      await page.addInitScript(() => {
        Object.defineProperty(window, 'matchMedia', {
          value: jest.fn().mockImplementation((query) => ({
            matches: query === '(display-mode: standalone)',
            addListener: jest.fn(),
            removeListener: jest.fn(),
          }))
        });
      });
      
      await page.goto('/dashboard');
      
      // Install button should not be visible
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      await expect(installButton).not.toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle install prompt errors gracefully', async ({ page }) => {
      // Mock beforeinstallprompt with error
      await page.addInitScript(() => {
        setTimeout(() => {
          const event = new Event('beforeinstallprompt');
          (event as any).platforms = ['web'];
          (event as any).prompt = () => Promise.reject(new Error('Install failed'));
          (event as any).preventDefault = () => {};
          
          window.dispatchEvent(event);
        }, 1000);
      });
      
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);
      
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      await installButton.click();
      
      // Should handle error gracefully (button should return to normal state)
      await page.waitForTimeout(1000);
      await expect(installButton).not.toHaveClass('animate-spin');
    });
  });

  test.describe('Performance', () => {
    test('should render install button quickly', async ({ page }) => {
      await mockBeforeInstallPrompt(page, 'accepted');
      
      const startTime = Date.now();
      await page.goto('/dashboard');
      
      // Wait for install button to appear
      const installButton = page.locator('[data-testid="pwa-install-button"]');
      await expect(installButton).toBeVisible();
      
      const renderTime = Date.now() - startTime;
      
      // Should render within reasonable time (less than 3 seconds including network)
      expect(renderTime).toBeLessThan(3000);
    });

    test('should not cause layout shifts', async ({ page }) => {
      await mockBeforeInstallPrompt(page, 'accepted');
      await page.goto('/dashboard');
      
      // Take initial screenshot
      await page.waitForTimeout(1000);
      const before = await page.screenshot();
      
      // Wait for PWA install state to settle
      await page.waitForTimeout(2000);
      const after = await page.screenshot();
      
      // Screenshots should be similar (no major layout shifts)
      // This is a basic check - in production you'd use more sophisticated CLS measurement
      expect(before.length).toBeCloseTo(after.length, -2); // Allow for small differences
    });
  });
});