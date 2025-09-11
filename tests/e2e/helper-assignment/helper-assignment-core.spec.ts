import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('WS-157 Helper Assignment - Core Workflows', () => {
  let context: BrowserContext;
  let page: Page;
  let supplierPage: Page;
  let helperPage: Page;
  
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    supplierPage = await context.newPage();
    helperPage = await context.newPage();
  });

  test.beforeEach(async () => {
    await supplierPage.goto('/dashboard/team');
    await supplierPage.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('functional - complete helper invitation flow', async () => {
    await supplierPage.click('[data-testid="team-management-tab"]');
    await expect(supplierPage.locator('h1')).toContainText('Team Management');

    await supplierPage.click('[data-testid="invite-helper-btn"]');
    await expect(supplierPage.locator('[data-testid="invite-helper-modal"]')).toBeVisible();

    const helperEmail = `helper.test.${Date.now()}@example.com`;
    await supplierPage.fill('[data-testid="helper-email-input"]', helperEmail);
    await supplierPage.fill('[data-testid="helper-name-input"]', 'Test Helper');
    await supplierPage.selectOption('[data-testid="helper-role-select"]', 'photographer');
    
    await supplierPage.check('[data-testid="permission-client-access"]');
    await supplierPage.check('[data-testid="permission-photo-upload"]');
    await supplierPage.uncheck('[data-testid="permission-billing-access"]');

    await supplierPage.click('[data-testid="send-invitation-btn"]');
    
    await expect(supplierPage.locator('[data-testid="success-toast"]')).toContainText('Invitation sent successfully');
    await expect(supplierPage.locator('[data-testid="pending-invitations"]')).toContainText(helperEmail);

    await helperPage.goto(`/auth/accept-invitation?token=test-token-${Date.now()}`);
    await helperPage.fill('[data-testid="password-input"]', 'TestPassword123!');
    await helperPage.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
    await helperPage.click('[data-testid="accept-invitation-btn"]');

    await expect(helperPage.locator('h1')).toContainText('Helper Dashboard');
    
    await supplierPage.reload();
    await expect(supplierPage.locator('[data-testid="active-helpers"]')).toContainText('Test Helper');
    await expect(supplierPage.locator('[data-testid="helper-role"]')).toContainText('photographer');
  });

  test('visual - helper assignment UI states', async () => {
    await supplierPage.goto('/dashboard/team?empty=true');
    await expect(supplierPage).toHaveScreenshot('helper-assignment-empty-state.png');

    await supplierPage.click('[data-testid="invite-helper-btn"]');
    await expect(supplierPage.locator('[data-testid="invite-helper-modal"]')).toBeVisible();
    await expect(supplierPage).toHaveScreenshot('helper-invitation-modal.png');

    await supplierPage.click('[data-testid="send-invitation-btn"]');
    await expect(supplierPage.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(supplierPage).toHaveScreenshot('helper-invitation-validation-errors.png');

    await supplierPage.fill('[data-testid="helper-email-input"]', 'test@example.com');
    await supplierPage.fill('[data-testid="helper-name-input"]', 'Test Helper');
    await supplierPage.selectOption('[data-testid="helper-role-select"]', 'photographer');
    await expect(supplierPage).toHaveScreenshot('helper-invitation-filled-form.png');

    await supplierPage.check('[data-testid="permission-client-access"]');
    await supplierPage.check('[data-testid="permission-photo-upload"]');
    await expect(supplierPage).toHaveScreenshot('helper-permissions-selected.png');
  });

  test('performance - helper assignment load times', async () => {
    const startTime = Date.now();
    
    await supplierPage.goto('/dashboard/team');
    await supplierPage.waitForLoadState('networkidle');
    const teamPageLoad = Date.now() - startTime;
    expect(teamPageLoad).toBeLessThan(2000);

    const modalStartTime = Date.now();
    await supplierPage.click('[data-testid="invite-helper-btn"]');
    await supplierPage.waitForSelector('[data-testid="invite-helper-modal"]');
    const modalLoadTime = Date.now() - modalStartTime;
    expect(modalLoadTime).toBeLessThan(500);

    await supplierPage.fill('[data-testid="helper-email-input"]', 'perf.test@example.com');
    await supplierPage.fill('[data-testid="helper-name-input"]', 'Performance Test');
    await supplierPage.selectOption('[data-testid="helper-role-select"]', 'coordinator');
    
    const submitStartTime = Date.now();
    await supplierPage.click('[data-testid="send-invitation-btn"]');
    await supplierPage.waitForSelector('[data-testid="success-toast"]');
    const submitTime = Date.now() - submitStartTime;
    expect(submitTime).toBeLessThan(3000);

    console.log(`Performance Metrics:
      - Team page load: ${teamPageLoad}ms
      - Modal open: ${modalLoadTime}ms  
      - Form submission: ${submitTime}ms`);
  });

  test('accessibility - WCAG compliance', async () => {
    await supplierPage.goto('/dashboard/team');
    const teamPageViolations = await supplierPage.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-ignore - axe-core injected in test setup
        window.axe.run().then((results: any) => {
          resolve(results.violations);
        });
      });
    });
    expect(teamPageViolations).toEqual([]);

    await supplierPage.keyboard.press('Tab');
    await supplierPage.keyboard.press('Enter');
    await expect(supplierPage.locator('[data-testid="invite-helper-modal"]')).toBeVisible();

    await supplierPage.keyboard.press('Tab');
    await supplierPage.keyboard.type('keyboard.test@example.com');
    await supplierPage.keyboard.press('Tab');
    await supplierPage.keyboard.type('Keyboard Test User');

    await expect(supplierPage.locator('[data-testid="helper-email-input"]')).toHaveAttribute('aria-label');
    await expect(supplierPage.locator('[data-testid="invite-helper-modal"]')).toHaveAttribute('role', 'dialog');
    await expect(supplierPage.locator('[data-testid="send-invitation-btn"]')).toHaveAttribute('aria-describedby');
  });

  test('mobile - responsive helper assignment', async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard/team');

    await expect(page).toHaveScreenshot('mobile-375-team-management.png');

    await page.click('[data-testid="mobile-menu-btn"]');
    await page.click('[data-testid="invite-helper-mobile-btn"]');
    await expect(page.locator('[data-testid="invite-helper-modal"]')).toBeVisible();
    await expect(page).toHaveScreenshot('mobile-375-invitation-modal.png');

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page).toHaveScreenshot('tablet-768-team-management.png');

    await page.tap('[data-testid="invite-helper-btn"]');
    await expect(page.locator('[data-testid="invite-helper-modal"]')).toBeVisible();
    
    await page.tap('[data-testid="helper-email-input"]');
    await page.fill('[data-testid="helper-email-input"]', 'mobile.test@example.com');
    await page.tap('[data-testid="helper-role-select"]');
    await page.selectOption('[data-testid="helper-role-select"]', 'photographer');
    
    await expect(page).toHaveScreenshot('tablet-768-filled-form.png');
  });
});