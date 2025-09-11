/**
 * Domain Setup Workflow E2E Tests (WS-222)
 * Complete end-to-end testing of domain setup, verification, and SSL provisioning
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test data
const testDomain = {
  domainName: 'testvendor.wedding',
  subdomain: 'photos',
  fullDomain: 'photos.testvendor.wedding',
  targetCname: 'wedsync.com',
  customIp: '192.168.1.100',
};

const testUser = {
  email: 'domain-test@wedsync.com',
  password: 'TestPassword123!',
  organizationName: 'Test Wedding Photography',
};

// Helper functions
async function loginUser(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', testUser.email);
  await page.fill('[data-testid="password-input"]', testUser.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
}

async function navigateToDomainsPage(page: Page) {
  await page.click('[data-testid="navigation-domains"]');
  await page.waitForURL('/domains');
  await expect(page.locator('[data-testid="domains-page-title"]')).toBeVisible();
}

async function createMockDNSResponses(context: BrowserContext) {
  // Mock DNS verification API responses
  await context.route('**/api/domains/*/verify', async route => {
    const url = route.request().url();
    const method = route.request().method();
    
    if (method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          verification: {
            id: 'verification-123',
            status: 'verified',
            verified_at: new Date().toISOString(),
          },
          success: true,
        }),
      });
    }
  });

  // Mock DNS record validation
  await context.route('**/api/domains/*/dns-check', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        records: [
          {
            type: 'CNAME',
            name: testDomain.subdomain,
            value: testDomain.targetCname,
            valid: true,
            propagated: true,
          }
        ],
        allValid: true,
      }),
    });
  });

  // Mock SSL certificate provisioning
  await context.route('**/api/domains/*/ssl/provision', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        certificate: {
          id: 'ssl-cert-123',
          status: 'active',
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          issued_at: new Date().toISOString(),
        },
        success: true,
      }),
    });
  });
}

test.describe('Domain Setup Workflow', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    page = await context.newPage();
    
    // Setup mock responses
    await createMockDNSResponses(context);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Complete Domain Setup Flow', () => {
    test('should complete full domain setup with CNAME configuration', async () => {
      // Step 1: Login and navigate to domains
      await loginUser(page);
      await navigateToDomainsPage(page);

      // Step 2: Click add domain button
      await page.click('[data-testid="add-domain-button"]');
      await expect(page.locator('[data-testid="add-domain-modal"]')).toBeVisible();

      // Step 3: Fill domain form
      await page.fill('[data-testid="domain-name-input"]', testDomain.domainName);
      await page.fill('[data-testid="subdomain-input"]', testDomain.subdomain);
      await page.fill('[data-testid="target-cname-input"]', testDomain.targetCname);
      await page.fill('[data-testid="domain-notes-input"]', 'E2E test domain for photography');

      // Verify form validation
      await expect(page.locator('[data-testid="domain-form-submit"]')).toBeEnabled();

      // Step 4: Submit domain creation
      await page.click('[data-testid="domain-form-submit"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Domain created successfully');

      // Step 5: Verify domain appears in list
      await expect(page.locator(`[data-testid="domain-row-${testDomain.fullDomain}"]`)).toBeVisible();
      
      // Step 6: Check domain status is pending
      const domainRow = page.locator(`[data-testid="domain-row-${testDomain.fullDomain}"]`);
      await expect(domainRow.locator('[data-testid="domain-status-badge"]')).toContainText('pending');

      // Step 7: Click on domain to view details
      await domainRow.click();
      await page.waitForURL(`/domains/${testDomain.fullDomain}`);

      // Step 8: Verify domain details page
      await expect(page.locator('[data-testid="domain-detail-title"]')).toContainText(testDomain.fullDomain);
      await expect(page.locator('[data-testid="domain-cname-target"]')).toContainText(testDomain.targetCname);
      
      // Step 9: Verify DNS instructions are shown
      await expect(page.locator('[data-testid="dns-instructions"]')).toBeVisible();
      await expect(page.locator('[data-testid="cname-record-instruction"]')).toBeVisible();
      
      const cnameInstruction = page.locator('[data-testid="cname-record-instruction"]');
      await expect(cnameInstruction).toContainText(testDomain.subdomain);
      await expect(cnameInstruction).toContainText(testDomain.targetCname);

      // Step 10: Start verification process
      await page.click('[data-testid="verify-domain-button"]');
      await expect(page.locator('[data-testid="verification-in-progress"]')).toBeVisible();

      // Step 11: Wait for verification to complete (mocked)
      await page.waitForSelector('[data-testid="verification-success"]', { timeout: 10000 });
      await expect(page.locator('[data-testid="domain-status-badge"]')).toContainText('verified');

      // Step 12: Verify SSL provisioning starts automatically
      await expect(page.locator('[data-testid="ssl-provisioning-status"]')).toBeVisible();
      await page.waitForSelector('[data-testid="ssl-active-status"]', { timeout: 15000 });

      // Step 13: Verify final domain status
      await expect(page.locator('[data-testid="domain-status-badge"]')).toContainText('active');
      
      // Step 14: Verify SSL certificate details
      const sslSection = page.locator('[data-testid="ssl-certificate-section"]');
      await expect(sslSection.locator('[data-testid="ssl-status"]')).toContainText('active');
      await expect(sslSection.locator('[data-testid="ssl-expires-at"]')).toBeVisible();
      
      // Step 15: Test external domain link
      const externalLinkPromise = page.waitForEvent('popup');
      await page.click('[data-testid="test-domain-link"]');
      const externalPage = await externalLinkPromise;
      await expect(externalPage).toHaveURL(new RegExp(testDomain.fullDomain));
      await externalPage.close();
    });

    test('should complete domain setup with IP address configuration', async () => {
      await loginUser(page);
      await navigateToDomainsPage(page);

      // Add domain with custom IP
      await page.click('[data-testid="add-domain-button"]');
      await page.fill('[data-testid="domain-name-input"]', 'iptestdomain.com');
      
      // Switch to IP configuration
      await page.click('[data-testid="ip-configuration-tab"]');
      await page.fill('[data-testid="custom-ip-input"]', testDomain.customIp);
      
      await page.click('[data-testid="domain-form-submit"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Verify A record instructions
      const domainRow = page.locator('[data-testid="domain-row-iptestdomain.com"]');
      await domainRow.click();
      
      await expect(page.locator('[data-testid="a-record-instruction"]')).toBeVisible();
      await expect(page.locator('[data-testid="a-record-instruction"]')).toContainText(testDomain.customIp);
    });

    test('should handle domain validation errors', async () => {
      await loginUser(page);
      await navigateToDomainsPage(page);

      await page.click('[data-testid="add-domain-button"]');
      
      // Try invalid domain name
      await page.fill('[data-testid="domain-name-input"]', 'invalid..domain');
      await page.fill('[data-testid="target-cname-input"]', testDomain.targetCname);
      
      await page.click('[data-testid="domain-form-submit"]');
      
      // Verify validation error
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error"]')).toContainText('Invalid domain name format');
      
      // Fix the domain name
      await page.fill('[data-testid="domain-name-input"]', 'validdomain.com');
      
      // Verify error is cleared
      await expect(page.locator('[data-testid="validation-error"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="domain-form-submit"]')).toBeEnabled();
    });
  });

  test.describe('DNS Verification Process', () => {
    test('should show detailed verification instructions', async () => {
      await loginUser(page);
      await navigateToDomainsPage(page);

      // Create a domain first
      await page.click('[data-testid="add-domain-button"]');
      await page.fill('[data-testid="domain-name-input"]', 'verifytest.com');
      await page.fill('[data-testid="subdomain-input"]', 'www');
      await page.fill('[data-testid="target-cname-input"]', testDomain.targetCname);
      await page.click('[data-testid="domain-form-submit"]');

      // Navigate to domain details
      await page.click('[data-testid="domain-row-www.verifytest.com"]');

      // Check DNS instructions
      const dnsInstructions = page.locator('[data-testid="dns-instructions"]');
      await expect(dnsInstructions).toBeVisible();
      
      // Verify CNAME record details
      await expect(dnsInstructions.locator('[data-testid="record-type"]')).toContainText('CNAME');
      await expect(dnsInstructions.locator('[data-testid="record-name"]')).toContainText('www');
      await expect(dnsInstructions.locator('[data-testid="record-value"]')).toContainText(testDomain.targetCname);
      await expect(dnsInstructions.locator('[data-testid="record-ttl"]')).toContainText('3600');

      // Verify copy buttons work
      await page.click('[data-testid="copy-record-name"]');
      await expect(page.locator('[data-testid="copy-success"]')).toBeVisible();

      // Check verification token
      await expect(page.locator('[data-testid="verification-token"]')).toBeVisible();
      await expect(page.locator('[data-testid="verification-token"]')).toHaveText(/^[a-z0-9]{32}$/);
    });

    test('should handle verification retry mechanism', async () => {
      // Mock failed then successful verification
      await context.route('**/api/domains/*/verify', async (route, request) => {
        const requestCount = await page.evaluate(() => window.verifyRequestCount = (window.verifyRequestCount || 0) + 1);
        
        if (requestCount === 1) {
          // First request fails
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'DNS record not found',
              details: 'CNAME record not yet propagated',
            }),
          });
        } else {
          // Second request succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              verification: {
                status: 'verified',
                verified_at: new Date().toISOString(),
              },
            }),
          });
        }
      });

      await loginUser(page);
      await navigateToDomainsPage(page);

      // Navigate to existing domain
      await page.click('[data-testid="domain-row-www.verifytest.com"]');

      // Start verification
      await page.click('[data-testid="verify-domain-button"]');
      
      // Should show error first
      await expect(page.locator('[data-testid="verification-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="verification-error"]')).toContainText('DNS record not found');

      // Click retry
      await page.click('[data-testid="retry-verification-button"]');
      
      // Should succeed on retry
      await page.waitForSelector('[data-testid="verification-success"]');
      await expect(page.locator('[data-testid="domain-status-badge"]')).toContainText('verified');
    });

    test('should show DNS propagation status', async () => {
      await loginUser(page);
      await navigateToDomainsPage(page);
      await page.click('[data-testid="domain-row-www.verifytest.com"]');

      // Click DNS check button
      await page.click('[data-testid="check-dns-propagation"]');
      
      // Should show propagation results
      await expect(page.locator('[data-testid="dns-propagation-results"]')).toBeVisible();
      
      // Check individual record status
      const cnameRecord = page.locator('[data-testid="dns-record-CNAME"]');
      await expect(cnameRecord.locator('[data-testid="record-status"]')).toContainText('Valid');
      await expect(cnameRecord.locator('[data-testid="propagation-status"]')).toContainText('Propagated');
      
      // Verify global propagation check
      await expect(page.locator('[data-testid="global-propagation-status"]')).toContainText('Fully propagated');
    });
  });

  test.describe('SSL Certificate Management', () => {
    test('should automatically provision SSL after domain verification', async () => {
      await loginUser(page);
      await navigateToDomainsPage(page);

      // Navigate to verified domain
      await page.click('[data-testid="domain-row-photos.testvendor.wedding"]');
      
      // SSL section should be visible
      const sslSection = page.locator('[data-testid="ssl-certificate-section"]');
      await expect(sslSection).toBeVisible();
      
      // Check SSL status
      await expect(sslSection.locator('[data-testid="ssl-status-badge"]')).toContainText('active');
      
      // Verify certificate details
      await expect(sslSection.locator('[data-testid="ssl-issuer"]')).toContainText("Let's Encrypt");
      await expect(sslSection.locator('[data-testid="ssl-expires-at"]')).toBeVisible();
      
      // Check days until expiry
      const daysUntilExpiry = sslSection.locator('[data-testid="ssl-days-until-expiry"]');
      await expect(daysUntilExpiry).toBeVisible();
      await expect(daysUntilExpiry).toHaveText(/\d+ days/);
      
      // Verify auto-renewal is enabled
      await expect(sslSection.locator('[data-testid="auto-renewal-status"]')).toContainText('Enabled');
    });

    test('should handle SSL certificate renewal', async () => {
      // Mock SSL renewal API
      await context.route('**/api/domains/*/ssl/renew', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            certificate: {
              id: 'ssl-cert-renewed-123',
              status: 'active',
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              renewed_at: new Date().toISOString(),
            },
          }),
        });
      });

      await loginUser(page);
      await navigateToDomainsPage(page);
      await page.click('[data-testid="domain-row-photos.testvendor.wedding"]');

      const sslSection = page.locator('[data-testid="ssl-certificate-section"]');
      
      // Click renew SSL button
      await page.click('[data-testid="renew-ssl-button"]');
      
      // Should show renewal in progress
      await expect(page.locator('[data-testid="ssl-renewal-progress"]')).toBeVisible();
      
      // Wait for renewal completion
      await page.waitForSelector('[data-testid="ssl-renewal-success"]');
      
      // Verify new expiry date
      await expect(sslSection.locator('[data-testid="ssl-renewed-at"]')).toBeVisible();
    });

    test('should show SSL certificate warnings', async () => {
      // Mock expiring certificate
      await context.route('**/api/domains', async route => {
        const expiringDate = new Date();
        expiringDate.setDate(expiringDate.getDate() + 15); // 15 days from now

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            domains: [{
              id: 'domain-expiring-ssl',
              domain_name: 'expiring.com',
              full_domain: 'expiring.com',
              status: 'active',
              ssl_expires_at: expiringDate.toISOString(),
              days_until_ssl_expiry: 15,
              unresolved_alerts_count: 1,
            }],
            metrics: {
              total_domains: 1,
              active_domains: 1,
              expiring_certificates: 1,
              critical_alerts: 1,
            },
          }),
        });
      });

      await loginUser(page);
      await navigateToDomainsPage(page);
      
      // Should show SSL expiring warning in metrics
      await expect(page.locator('[data-testid="expiring-certificates-metric"]')).toContainText('1');
      
      // Domain row should show warning
      const domainRow = page.locator('[data-testid="domain-row-expiring.com"]');
      await expect(domainRow.locator('[data-testid="ssl-warning-icon"]')).toBeVisible();
      await expect(domainRow.locator('[data-testid="ssl-expiry-text"]')).toContainText('15 days left');
    });
  });

  test.describe('Domain Health Monitoring', () => {
    test('should display health check results', async () => {
      await loginUser(page);
      await navigateToDomainsPage(page);
      await page.click('[data-testid="domain-row-photos.testvendor.wedding"]');

      // Health monitoring section should be visible
      const healthSection = page.locator('[data-testid="health-monitoring-section"]');
      await expect(healthSection).toBeVisible();
      
      // Check health status badge
      await expect(healthSection.locator('[data-testid="health-status-badge"]')).toContainText('healthy');
      
      // Verify response time
      await expect(healthSection.locator('[data-testid="response-time"]')).toHaveText(/\d+ms/);
      
      // Check last health check timestamp
      await expect(healthSection.locator('[data-testid="last-health-check"]')).toBeVisible();
      
      // Verify health check history
      await page.click('[data-testid="view-health-history"]');
      await expect(page.locator('[data-testid="health-history-chart"]')).toBeVisible();
    });

    test('should handle health check alerts', async () => {
      // Mock unhealthy domain
      await context.route('**/api/domains/*/health', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            health_checks: [{
              id: 'health-check-1',
              status: 'unhealthy',
              response_time_ms: 8000,
              error_message: 'Connection timeout',
              checked_at: new Date().toISOString(),
            }],
            alerts: [{
              id: 'alert-1',
              alert_type: 'health_degraded',
              severity: 'error',
              title: 'Domain Health Degraded',
              message: 'Response time exceeded 5 seconds',
              is_resolved: false,
            }],
          }),
        });
      });

      await loginUser(page);
      await navigateToDomainsPage(page);
      await page.click('[data-testid="domain-row-photos.testvendor.wedding"]');

      const healthSection = page.locator('[data-testid="health-monitoring-section"]');
      
      // Should show unhealthy status
      await expect(healthSection.locator('[data-testid="health-status-badge"]')).toContainText('unhealthy');
      
      // Should show error message
      await expect(healthSection.locator('[data-testid="health-error-message"]')).toContainText('Connection timeout');
      
      // Should show alert
      await expect(page.locator('[data-testid="health-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-severity-error"]')).toBeVisible();
      
      // Test alert acknowledgment
      await page.click('[data-testid="acknowledge-alert-button"]');
      await page.fill('[data-testid="alert-notes-input"]', 'Working on fixing the timeout issue');
      await page.click('[data-testid="confirm-acknowledge-button"]');
      
      await expect(page.locator('[data-testid="alert-acknowledged"]')).toBeVisible();
    });

    test('should trigger manual health check', async () => {
      await loginUser(page);
      await navigateToDomainsPage(page);
      await page.click('[data-testid="domain-row-photos.testvendor.wedding"]');

      // Click manual health check
      await page.click('[data-testid="run-health-check-button"]');
      
      // Should show check in progress
      await expect(page.locator('[data-testid="health-check-progress"]')).toBeVisible();
      
      // Wait for completion
      await page.waitForSelector('[data-testid="health-check-complete"]');
      
      // Should update health status
      await expect(page.locator('[data-testid="health-status-badge"]')).toBeVisible();
      await expect(page.locator('[data-testid="last-health-check"]')).toContainText('just now');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network failure
      await context.route('**/api/domains', async route => {
        await route.abort();
      });

      await loginUser(page);
      await navigateToDomainsPage(page);

      // Should show error state
      await expect(page.locator('[data-testid="domains-error-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load domains');
      
      // Should have retry button
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle concurrent domain operations', async () => {
      await loginUser(page);
      await navigateToDomainsPage(page);

      // Create multiple domains simultaneously
      const domain1Promise = (async () => {
        await page.click('[data-testid="add-domain-button"]');
        await page.fill('[data-testid="domain-name-input"]', 'concurrent1.com');
        await page.fill('[data-testid="target-cname-input"]', testDomain.targetCname);
        await page.click('[data-testid="domain-form-submit"]');
      })();

      const domain2Promise = (async () => {
        // Wait a bit then open another modal
        await page.waitForTimeout(100);
        await page.click('[data-testid="add-domain-button"]');
        await page.fill('[data-testid="domain-name-input"]', 'concurrent2.com');
        await page.fill('[data-testid="target-cname-input"]', testDomain.targetCname);
        await page.click('[data-testid="domain-form-submit"]');
      })();

      await Promise.all([domain1Promise, domain2Promise]);

      // Both domains should be created successfully
      await expect(page.locator('[data-testid="domain-row-concurrent1.com"]')).toBeVisible();
      await expect(page.locator('[data-testid="domain-row-concurrent2.com"]')).toBeVisible();
    });

    test('should validate domain ownership conflicts', async () => {
      // Mock domain already exists error
      await context.route('**/api/domains', async (route, request) => {
        if (request.method() === 'POST') {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Domain already exists',
              details: 'This domain is already configured for another organization',
            }),
          });
        }
      });

      await loginUser(page);
      await navigateToDomainsPage(page);

      await page.click('[data-testid="add-domain-button"]');
      await page.fill('[data-testid="domain-name-input"]', 'existingdomain.com');
      await page.fill('[data-testid="target-cname-input"]', testDomain.targetCname);
      await page.click('[data-testid="domain-form-submit"]');

      // Should show conflict error
      await expect(page.locator('[data-testid="domain-conflict-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="domain-conflict-error"]')).toContainText('Domain already exists');
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle large domain lists efficiently', async () => {
      // Mock large domain list
      const largeDomainList = Array.from({ length: 100 }, (_, i) => ({
        id: `domain-${i}`,
        domain_name: `domain${i}.com`,
        full_domain: `domain${i}.com`,
        status: 'active',
        health_status: 'healthy',
        unresolved_alerts_count: 0,
        created_at: new Date().toISOString(),
      }));

      await context.route('**/api/domains', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            domains: largeDomainList,
            metrics: {
              total_domains: 100,
              active_domains: 100,
              expiring_certificates: 5,
              critical_alerts: 0,
            },
            total_count: 100,
          }),
        });
      });

      await loginUser(page);
      
      const startTime = Date.now();
      await navigateToDomainsPage(page);
      const loadTime = Date.now() - startTime;

      // Page should load within reasonable time
      expect(loadTime).toBeLessThan(3000);

      // All domains should be rendered
      await expect(page.locator('[data-testid^="domain-row-domain"]')).toHaveCount(100);

      // Test scrolling performance
      const scrollStartTime = Date.now();
      await page.mouse.wheel(0, 5000);
      await page.waitForTimeout(100);
      const scrollTime = Date.now() - scrollStartTime;

      expect(scrollTime).toBeLessThan(500);
    });

    test('should optimize API calls with debouncing', async () => {
      let apiCallCount = 0;
      await context.route('**/api/domains*', async route => {
        apiCallCount++;
        await route.continue();
      });

      await loginUser(page);
      await navigateToDomainsPage(page);

      const searchInput = page.locator('[data-testid="domain-search-input"]');
      
      // Type quickly (should debounce)
      await searchInput.fill('t');
      await searchInput.fill('te');
      await searchInput.fill('tes');
      await searchInput.fill('test');
      
      // Wait for debounce
      await page.waitForTimeout(500);

      // Should have made minimal API calls due to debouncing
      expect(apiCallCount).toBeLessThan(3);
    });
  });
});