import { test, expect, Page } from '@playwright/test';

test.describe('WS-157 Helper Assignment - Bulk Operations', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/dashboard/team');
  });

  test('functional - bulk helper invitation (10+ helpers)', async () => {
    await page.click('[data-testid="bulk-invite-btn"]');
    await expect(page.locator('[data-testid="bulk-invite-modal"]')).toBeVisible();

    const helperData = Array.from({ length: 12 }, (_, i) => ({
      email: `bulk.helper.${i + 1}@example.com`,
      name: `Bulk Helper ${i + 1}`,
      role: i % 3 === 0 ? 'photographer' : i % 3 === 1 ? 'coordinator' : 'assistant'
    }));

    const csvContent = [
      'email,name,role',
      ...helperData.map(h => `${h.email},${h.name},${h.role}`)
    ].join('\n');

    await page.setInputFiles('[data-testid="csv-upload-input"]', {
      name: 'helpers.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });

    await expect(page.locator('[data-testid="bulk-preview-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-row"]')).toHaveCount(12);

    await page.click('[data-testid="send-bulk-invitations-btn"]');
    
    await expect(page.locator('[data-testid="bulk-progress-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-text"]')).toContainText('0/12');
    
    await expect(page.locator('[data-testid="progress-text"]')).toContainText('12/12', { timeout: 30000 });
    await expect(page.locator('[data-testid="bulk-success-message"]')).toContainText('12 invitations sent successfully');

    await page.reload();
    for (const helper of helperData.slice(0, 5)) {
      await expect(page.locator('[data-testid="pending-invitations"]')).toContainText(helper.email);
    }
  });

  test('visual - bulk operations UI progression', async () => {
    await page.click('[data-testid="bulk-invite-btn"]');
    await expect(page).toHaveScreenshot('bulk-invite-modal-empty.png');

    await expect(page.locator('[data-testid="csv-upload-zone"]')).toBeVisible();
    await expect(page).toHaveScreenshot('bulk-csv-upload-zone.png');

    const csvData = 'email,name,role\ntest1@example.com,Test User 1,photographer\ntest2@example.com,Test User 2,coordinator';
    await page.setInputFiles('[data-testid="csv-upload-input"]', {
      name: 'test-helpers.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvData)
    });

    await expect(page.locator('[data-testid="bulk-preview-table"]')).toBeVisible();
    await expect(page).toHaveScreenshot('bulk-preview-table.png');

    await page.click('[data-testid="send-bulk-invitations-btn"]');
    await expect(page.locator('[data-testid="bulk-progress-bar"]')).toBeVisible();
    await expect(page).toHaveScreenshot('bulk-progress-state.png');
  });

  test('performance - bulk operation scalability', async () => {
    const largeHelperData = Array.from({ length: 50 }, (_, i) => 
      `perf.helper.${i + 1}@example.com,Performance Helper ${i + 1},${i % 3 === 0 ? 'photographer' : 'assistant'}`
    );
    
    const largeCsv = ['email,name,role', ...largeHelperData].join('\n');

    const startTime = Date.now();
    
    await page.click('[data-testid="bulk-invite-btn"]');
    await page.setInputFiles('[data-testid="csv-upload-input"]', {
      name: 'large-helpers.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(largeCsv)
    });

    await page.waitForSelector('[data-testid="bulk-preview-table"]');
    const previewTime = Date.now() - startTime;
    expect(previewTime).toBeLessThan(3000);

    const processStartTime = Date.now();
    await page.click('[data-testid="send-bulk-invitations-btn"]');
    await expect(page.locator('[data-testid="progress-text"]')).toContainText('50/50', { timeout: 60000 });
    const processTime = Date.now() - processStartTime;
    
    console.log(`Bulk Performance Metrics:
      - Preview generation (50 helpers): ${previewTime}ms
      - Bulk processing (50 helpers): ${processTime}ms
      - Average per helper: ${processTime / 50}ms`);

    expect(processTime).toBeLessThan(45000);
  });

  test('error-handling - bulk operation failures', async () => {
    await page.click('[data-testid="bulk-invite-btn"]');

    await page.setInputFiles('[data-testid="csv-upload-input"]', {
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('invalid,csv,format\nno-email-field,test')
    });

    await expect(page.locator('[data-testid="csv-error-message"]')).toContainText('Invalid CSV format');
    await expect(page).toHaveScreenshot('bulk-csv-error-state.png');

    const duplicateData = `email,name,role
duplicate@example.com,User 1,photographer
duplicate@example.com,User 2,coordinator`;

    await page.setInputFiles('[data-testid="csv-upload-input"]', {
      name: 'duplicates.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(duplicateData)
    });

    await expect(page.locator('[data-testid="duplicate-warning"]')).toContainText('Duplicate emails detected');
    await expect(page).toHaveScreenshot('bulk-duplicate-warning.png');

    const mixedData = `email,name,role
valid@example.com,Valid User,photographer
invalid-email,Invalid User,coordinator
another.valid@example.com,Another Valid,assistant`;

    await page.setInputFiles('[data-testid="csv-upload-input"]', {
      name: 'mixed.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(mixedData)
    });

    await page.click('[data-testid="send-bulk-invitations-btn"]');
    
    await expect(page.locator('[data-testid="partial-success-message"]')).toContainText('2 of 3 invitations sent');
    await expect(page.locator('[data-testid="failed-invitations-list"]')).toContainText('invalid-email');
  });
});