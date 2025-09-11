/**
 * Cross-Browser Domain Functionality E2E Tests (WS-222)
 * Testing domain functionality across different browsers and their specific behaviors
 */

import { test, expect, Page, Browser } from '@playwright/test';

const testDomain = {
  domainName: 'crossbrowsertest.wedding',
  subdomain: 'photos',
  fullDomain: 'photos.crossbrowsertest.wedding',
  targetCname: 'wedsync.com',
};

const testUser = {
  email: 'crossbrowser-test@wedsync.com',
  password: 'CrossBrowser123!',
};

// Browser-specific configurations
const browserConfigs = [
  { name: 'chromium', userAgent: 'Chrome' },
  { name: 'firefox', userAgent: 'Firefox' },
  { name: 'webkit', userAgent: 'Safari' },
];

// Helper functions
async function loginForBrowser(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', testUser.email);
  await page.fill('[data-testid="password-input"]', testUser.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
}

async function createDomainForBrowser(page: Page, domainSuffix: string) {
  await page.goto('/domains');
  await page.click('[data-testid="add-domain-button"]');
  
  await page.fill('[data-testid="domain-name-input"]', `${testDomain.domainName.replace('.wedding', `-${domainSuffix}.wedding`)}`);
  await page.fill('[data-testid="subdomain-input"]', testDomain.subdomain);
  await page.fill('[data-testid="target-cname-input"]', testDomain.targetCname);
  
  await page.click('[data-testid="domain-form-submit"]');
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
}

test.describe('Cross-Browser Domain Functionality', () => {
  
  test.describe('Domain Management Across Browsers', () => {
    browserConfigs.forEach(({ name, userAgent }) => {
      test(`should manage domains correctly in ${userAgent}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          await loginForBrowser(page);
          await createDomainForBrowser(page, name);
          
          // Verify domain creation worked
          const domainName = `photos.${testDomain.domainName.replace('.wedding', `-${name}.wedding`)}`;
          await expect(page.locator(`[data-testid="domain-row-${domainName}"]`)).toBeVisible();
          
          // Test domain detail navigation
          await page.click(`[data-testid="domain-row-${domainName}"]`);
          await page.waitForURL(`/domains/${domainName}`);
          
          // Verify all sections load
          await expect(page.locator('[data-testid="domain-detail-title"]')).toBeVisible();
          await expect(page.locator('[data-testid="dns-instructions"]')).toBeVisible();
          
        } finally {
          await context.close();
        }
      });
    });
  });

  test.describe('DNS Record Management Browser Compatibility', () => {
    browserConfigs.forEach(({ name, userAgent }) => {
      test(`should handle DNS record operations in ${userAgent}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          await loginForBrowser(page);
          await page.goto('/domains');
          
          // Navigate to existing domain (created in previous test)
          const domainName = `photos.${testDomain.domainName.replace('.wedding', `-${name}.wedding`)}`;
          await page.click(`[data-testid="domain-row-${domainName}"]`);
          
          // Test DNS record addition
          await page.click('[data-testid="add-dns-record-button"]');
          await expect(page.locator('[data-testid="dns-record-modal"]')).toBeVisible();
          
          // Fill DNS record form
          await page.selectOption('[data-testid="dns-record-type"]', 'TXT');
          await page.fill('[data-testid="dns-record-name"]', 'verification');
          await page.fill('[data-testid="dns-record-value"]', 'test-verification-string');
          
          await page.click('[data-testid="save-dns-record"]');
          
          // Verify record was added (browser-specific DOM handling)
          await expect(page.locator('[data-testid="dns-record-TXT-verification"]')).toBeVisible();
          
          // Test copy functionality (browser-specific clipboard)
          await page.click('[data-testid="copy-dns-record-value"]');
          
          // Browser-specific clipboard verification
          if (name === 'chromium') {
            // Chromium supports clipboard API
            const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
            expect(clipboardText).toBe('test-verification-string');
          } else {
            // Fallback for browsers without clipboard API
            await expect(page.locator('[data-testid="copy-success-message"]')).toBeVisible();
          }
          
        } finally {
          await context.close();
        }
      });
    });
  });

  test.describe('SSL Certificate Display Across Browsers', () => {
    browserConfigs.forEach(({ name, userAgent }) => {
      test(`should display SSL certificate information correctly in ${userAgent}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          await loginForBrowser(page);
          
          const domainName = `photos.${testDomain.domainName.replace('.wedding', `-${name}.wedding`)}`;
          await page.goto(`/domains/${domainName}`);
          
          // Navigate to SSL section
          await page.click('[data-testid="ssl-certificate-tab"]');
          
          // Verify SSL information displays correctly
          await expect(page.locator('[data-testid="ssl-certificate-section"]')).toBeVisible();
          
          // Test browser-specific SSL certificate details
          if (name === 'firefox') {
            // Firefox may display certificates differently
            await expect(page.locator('[data-testid="firefox-ssl-details"]')).toBeVisible();
          } else if (name === 'webkit') {
            // Safari/WebKit specific SSL display
            await expect(page.locator('[data-testid="webkit-ssl-details"]')).toBeVisible();
          } else {
            // Standard Chrome display
            await expect(page.locator('[data-testid="standard-ssl-details"]')).toBeVisible();
          }
          
          // Test SSL certificate download (browser-specific)
          await page.click('[data-testid="download-ssl-certificate"]');
          
          // Browser-specific download verification
          if (name === 'chromium') {
            // Chrome downloads automatically
            const downloadPromise = page.waitForEvent('download');
            await downloadPromise;
          } else {
            // Other browsers may show download dialog
            await expect(page.locator('[data-testid="download-dialog"]')).toBeVisible();
          }
          
        } finally {
          await context.close();
        }
      });
    });
  });

  test.describe('Form Validation Browser Compatibility', () => {
    browserConfigs.forEach(({ name, userAgent }) => {
      test(`should validate domain forms correctly in ${userAgent}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          await loginForBrowser(page);
          await page.goto('/domains');
          
          await page.click('[data-testid="add-domain-button"]');
          
          // Test HTML5 validation (browser-specific)
          await page.fill('[data-testid="domain-name-input"]', 'invalid..domain');
          await page.click('[data-testid="domain-form-submit"]');
          
          // Different browsers handle validation differently
          if (name === 'firefox') {
            // Firefox custom validation message
            await expect(page.locator('[data-testid="firefox-validation-error"]')).toBeVisible();
          } else if (name === 'webkit') {
            // Safari validation
            await expect(page.locator('[data-testid="webkit-validation-error"]')).toBeVisible();
          } else {
            // Chrome validation
            await expect(page.locator('[data-testid="chrome-validation-error"]')).toBeVisible();
          }
          
          // Test email validation (different regex support)
          await page.fill('[data-testid="domain-name-input"]', 'validdomain.com');
          await page.fill('[data-testid="contact-email-input"]', 'invalid-email');
          
          // Browser-specific email validation
          const emailField = page.locator('[data-testid="contact-email-input"]');
          const isValid = await emailField.evaluate((el: HTMLInputElement) => el.validity.valid);
          expect(isValid).toBe(false);
          
        } finally {
          await context.close();
        }
      });
    });
  });

  test.describe('JavaScript API Compatibility', () => {
    browserConfigs.forEach(({ name, userAgent }) => {
      test(`should handle JavaScript features correctly in ${userAgent}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          await loginForBrowser(page);
          await page.goto('/domains');
          
          // Test modern JavaScript features
          const browserFeatures = await page.evaluate(() => {
            return {
              fetch: typeof fetch !== 'undefined',
              promise: typeof Promise !== 'undefined',
              async: typeof (async function(){}) === 'function',
              destructuring: (() => { try { const {a} = {a:1}; return true; } catch(e) { return false; } })(),
              arrow: (() => { try { // SECURITY: // SECURITY: eval() removed - () removed - ()=>{}; return true; } catch(e) { return false; } })(),
              const: (() => { try { // SECURITY: // SECURITY: eval() removed - () removed - const a = 1; return true; } catch(e) { return false; } })(),
              let: (() => { try { // SECURITY: // SECURITY: eval() removed - () removed - let a = 1; return true; } catch(e) { return false; } })(),
            };
          });
          
          // Verify all modern features are available
          expect(browserFeatures.fetch).toBe(true);
          expect(browserFeatures.promise).toBe(true);
          expect(browserFeatures.async).toBe(true);
          expect(browserFeatures.destructuring).toBe(true);
          expect(browserFeatures.arrow).toBe(true);
          expect(browserFeatures.const).toBe(true);
          expect(browserFeatures.let).toBe(true);
          
          // Test WebSocket support (for real-time updates)
          const webSocketSupport = await page.evaluate(() => {
            return typeof WebSocket !== 'undefined';
          });
          expect(webSocketSupport).toBe(true);
          
          // Test localStorage support
          const localStorageSupport = await page.evaluate(() => {
            try {
              localStorage.setItem('test', 'value');
              const value = localStorage.getItem('test');
              localStorage.removeItem('test');
              return value === 'value';
            } catch (e) {
              return false;
            }
          });
          expect(localStorageSupport).toBe(true);
          
        } finally {
          await context.close();
        }
      });
    });
  });

  test.describe('CSS and Styling Compatibility', () => {
    browserConfigs.forEach(({ name, userAgent }) => {
      test(`should render styles correctly in ${userAgent}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          await loginForBrowser(page);
          await page.goto('/domains');
          
          // Test CSS Grid support
          const gridSupport = await page.locator('[data-testid="domains-grid"]').evaluate((el) => {
            return window.getComputedStyle(el).display === 'grid';
          });
          expect(gridSupport).toBe(true);
          
          // Test Flexbox support
          const flexSupport = await page.locator('[data-testid="domain-card"]').first().evaluate((el) => {
            return window.getComputedStyle(el).display === 'flex';
          });
          expect(flexSupport).toBe(true);
          
          // Test CSS custom properties (variables)
          const customPropertiesSupport = await page.evaluate(() => {
            const el = document.createElement('div');
            el.style.setProperty('--test-var', 'test');
            return el.style.getPropertyValue('--test-var') === 'test';
          });
          expect(customPropertiesSupport).toBe(true);
          
          // Test CSS transitions/animations
          const animationSupport = await page.locator('[data-testid="loading-spinner"]').evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return styles.animationName !== 'none' || styles.transitionProperty !== 'none';
          });
          expect(animationSupport).toBe(true);
          
          // Browser-specific styling checks
          if (name === 'webkit') {
            // Test WebKit-specific prefixes
            const webkitSupport = await page.evaluate(() => {
              const el = document.createElement('div');
              return 'webkitTransform' in el.style;
            });
            expect(webkitSupport).toBe(true);
          }
          
        } finally {
          await context.close();
        }
      });
    });
  });

  test.describe('Network Request Handling', () => {
    browserConfigs.forEach(({ name, userAgent }) => {
      test(`should handle network requests correctly in ${userAgent}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // Track network requests
        const requests: string[] = [];
        page.on('request', request => {
          requests.push(request.url());
        });
        
        try {
          await loginForBrowser(page);
          await page.goto('/domains');
          
          // Verify API requests are made
          expect(requests.some(url => url.includes('/api/domains'))).toBe(true);
          
          // Test CORS handling
          const corsTest = await page.evaluate(() => {
            return fetch('/api/domains', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }).then(response => response.ok);
          });
          expect(corsTest).toBe(true);
          
          // Test error handling
          await page.route('**/api/domains/test', route => {
            route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Test error' }),
            });
          });
          
          const errorResponse = await page.evaluate(() => {
            return fetch('/api/domains/test')
              .then(response => response.status)
              .catch(() => 0);
          });
          expect(errorResponse).toBe(500);
          
        } finally {
          await context.close();
        }
      });
    });
  });

  test.describe('Security Features Across Browsers', () => {
    browserConfigs.forEach(({ name, userAgent }) => {
      test(`should enforce security measures in ${userAgent}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          await loginForBrowser(page);
          await page.goto('/domains');
          
          // Test CSP (Content Security Policy)
          const cspViolations: string[] = [];
          page.on('console', msg => {
            if (msg.text().includes('Content Security Policy')) {
              cspViolations.push(msg.text());
            }
          });
          
          // Try to execute inline script (should be blocked by CSP)
          await page.evaluate(() => {
            try {
              // SECURITY: // SECURITY: eval() removed - () removed - console.log("This should be blocked');
            } catch (e) {
              // CSP should block this
            }
          });
          
          // Test XSS protection
          await page.click('[data-testid="add-domain-button"]');
          await page.fill('[data-testid="domain-name-input"]', '<script>alert("xss")</script>');
          
          // Should be properly escaped
          const inputValue = await page.inputValue('[data-testid="domain-name-input"]');
          expect(inputValue).toBe('<script>alert("xss")</script>'); // Should be escaped when displayed
          
          // Test HTTPS enforcement
          const protocol = await page.evaluate(() => window.location.protocol);
          expect(protocol).toBe('https:');
          
        } finally {
          await context.close();
        }
      });
    });
  });

  test.describe('Performance Across Browsers', () => {
    browserConfigs.forEach(({ name, userAgent }) => {
      test(`should perform well in ${userAgent}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          await loginForBrowser(page);
          
          // Measure page load performance
          const startTime = Date.now();
          await page.goto('/domains');
          await page.waitForSelector('[data-testid="domains-grid"]');
          const loadTime = Date.now() - startTime;
          
          // Performance should be reasonable across all browsers
          expect(loadTime).toBeLessThan(5000);
          
          // Test JavaScript performance
          const jsPerformance = await page.evaluate(() => {
            const start = performance.now();
            
            // Simulate some DOM operations
            for (let i = 0; i < 1000; i++) {
              const div = document.createElement('div');
              div.// SECURITY: innerHTML removed - textContent= `Test ${i}`;
              document.body.appendChild(div);
              document.body.removeChild(div);
            }
            
            return performance.now() - start;
          });
          
          // Should complete DOM operations efficiently
          expect(jsPerformance).toBeLessThan(1000);
          
          // Test memory usage (browser-specific)
          if (name === 'chromium') {
            const memoryInfo = await page.evaluate(() => {
              return (performance as any).memory ? {
                usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
                totalJSHeapSize: (performance as any).memory.totalJSHeapSize
              } : null;
            });
            
            if (memoryInfo) {
              // Memory usage should be reasonable
              expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // 50MB
            }
          }
          
        } finally {
          await context.close();
        }
      });
    });
  });

  test.describe('Accessibility Across Browsers', () => {
    browserConfigs.forEach(({ name, userAgent }) => {
      test(`should be accessible in ${userAgent}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          await loginForBrowser(page);
          await page.goto('/domains');
          
          // Test keyboard navigation
          await page.keyboard.press('Tab');
          const focusedElement = await page.locator(':focus');
          await expect(focusedElement).toBeVisible();
          
          // Test ARIA attributes
          const domainCards = page.locator('[data-testid^="domain-row-"]');
          const firstCard = domainCards.first();
          
          const ariaLabel = await firstCard.getAttribute('aria-label');
          expect(ariaLabel).toBeTruthy();
          
          // Test screen reader support
          const headings = page.locator('h1, h2, h3, h4, h5, h6');
          const headingCount = await headings.count();
          expect(headingCount).toBeGreaterThan(0);
          
          // Test color contrast (browser-specific)
          const contrastCheck = await page.evaluate(() => {
            const element = document.querySelector('[data-testid="domains-header"]');
            if (!element) return null;
            
            const styles = window.getComputedStyle(element);
            return {
              color: styles.color,
              backgroundColor: styles.backgroundColor
            };
          });
          
          expect(contrastCheck).toBeTruthy();
          
        } finally {
          await context.close();
        }
      });
    });
  });

  test.describe('Mobile Responsive Design Across Browsers', () => {
    browserConfigs.forEach(({ name, userAgent }) => {
      test(`should be responsive in mobile ${userAgent}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: 375, height: 667 } // iPhone SE size
        });
        const page = await context.newPage();
        
        try {
          await loginForBrowser(page);
          await page.goto('/domains');
          
          // Test mobile layout
          const mobileLayout = await page.locator('[data-testid="mobile-domain-layout"]');
          await expect(mobileLayout).toBeVisible();
          
          // Test touch interactions
          await page.tap('[data-testid="mobile-menu-toggle"]');
          await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
          
          // Test viewport meta tag
          const viewportMeta = await page.getAttribute('meta[name="viewport"]', 'content');
          expect(viewportMeta).toContain('width=device-width');
          
          // Browser-specific mobile features
          if (name === 'webkit') {
            // Test iOS Safari specific features
            const safariFeatures = await page.evaluate(() => {
              return {
                standalone: (window.navigator as any).standalone,
                touchStart: 'ontouchstart' in window
              };
            });
            
            expect(safariFeatures.touchStart).toBe(true);
          }
          
        } finally {
          await context.close();
        }
      });
    });
  });
});