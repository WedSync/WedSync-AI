import { test, expect } from '@playwright/test';
import crypto from 'crypto';

test.describe('Advanced Encryption System E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test environment
    await page.goto('/');
    // Mock authentication if needed
  });

  test('End-to-end client data encryption workflow', async ({ page }) => {
    // Setup: Login as wedding photographer
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'photographer@wedding.test');
    await page.fill('[data-testid="password"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Navigate to client creation
    await page.goto('/clients/new');
    await page.waitForSelector('[data-testid="client-form"]');
    
    // Fill sensitive client information
    await page.fill('[data-testid="client-name"]', 'John & Jane Smith');
    await page.fill('[data-testid="venue-address"]', '123 Secret Wedding Venue, Beverly Hills, CA');
    await page.fill('[data-testid="budget-amount"]', '85000');
    
    // Handle dietary restrictions dropdown
    await page.click('[data-testid="dietary-restrictions"]');
    await page.click('[data-value="vegan"]');
    await page.click('[data-value="gluten-free"]');
    
    // Submit and verify encryption
    await page.click('[data-testid="save-client"]');
    await page.waitForSelector('[data-testid="client-saved-confirmation"]', { timeout: 10000 });
    
    // Backend verification: Data should be encrypted in database
    const encryptedData = await page.evaluate(async () => {
      const response = await fetch('/api/debug/encryption-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: 'John & Jane Smith' })
      });
      return response.json();
    });
    
    expect(encryptedData.venue_address_encrypted).not.toContain('Beverly Hills');
    expect(encryptedData.budget_amount_encrypted).not.toContain('85000');
    expect(encryptedData.dietary_data_encrypted).not.toContain('vegan');
  });

  test('Crypto-shredding for GDPR deletion', async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@wedding.test');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Navigate to test client
    await page.goto('/clients/test-client-123');
    
    // Verify client data is visible (decrypted correctly)
    await expect(page.locator('[data-testid="client-venue"]')).toBeVisible();
    const venueText = await page.locator('[data-testid="client-venue"]').textContent();
    expect(venueText).toContain('Secret Wedding Venue');
    
    // Initiate GDPR deletion
    await page.goto('/settings/privacy');
    await page.waitForSelector('[data-testid="gdpr-section"]');
    
    // Click delete account button
    await page.click('[data-testid="gdpr-delete-account"]');
    
    // Fill confirmation dialog
    await page.waitForSelector('[data-testid="confirmation-dialog"]');
    await page.fill('[data-testid="confirmation-text"]', 'DELETE MY ACCOUNT');
    
    // Confirm crypto-shred
    await page.click('[data-testid="confirm-crypto-shred"]');
    
    // Wait for shredding process
    await page.waitForSelector('[data-testid="crypto-shred-complete"]', { timeout: 15000 });
    
    // Verify data is truly unrecoverable
    const shredVerification = await page.evaluate(async () => {
      const response = await fetch('/api/debug/verify-crypto-shred', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'test-user-123' })
      });
      return response.json();
    });
    
    expect(shredVerification.keys_shredded).toBe(true);
    expect(shredVerification.data_recoverable).toBe(false);
  });

  test('Key rotation during active session', async ({ page }) => {
    // Login with existing encrypted data
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'photographer@wedding.test');
    await page.fill('[data-testid="password"]', 'CurrentPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Verify existing data displays correctly
    await expect(page.locator('[data-testid="client-count"]')).toBeVisible();
    const clientCount = await page.locator('[data-testid="client-count"]').textContent();
    expect(clientCount).toContain('Active Clients');
    
    // Navigate to security settings
    await page.goto('/settings/security');
    await page.waitForSelector('[data-testid="security-settings"]');
    
    // Initiate key rotation
    await page.click('[data-testid="rotate-encryption-keys"]');
    
    // Fill rotation form
    await page.waitForSelector('[data-testid="rotation-dialog"]');
    await page.fill('[data-testid="current-password"]', 'CurrentPassword123!');
    await page.fill('[data-testid="new-password"]', 'NewStrongerPassword456!');
    await page.fill('[data-testid="confirm-new-password"]', 'NewStrongerPassword456!');
    
    // Start rotation
    await page.click('[data-testid="start-rotation"]');
    
    // Monitor rotation progress
    await page.waitForSelector('[data-testid="rotation-progress"]');
    
    // Wait for rotation to complete
    const rotationComplete = await page.waitForSelector(
      '[data-testid="rotation-complete"]', 
      { timeout: 30000 }
    );
    expect(rotationComplete).toBeTruthy();
    
    // Verify data still accessible with new keys
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="client-count"]')).toBeVisible();
    const newClientCount = await page.locator('[data-testid="client-count"]').textContent();
    expect(newClientCount).toContain('Active Clients');
    
    // Log out
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout"]');
    
    // Log back in with new password
    await page.waitForSelector('[data-testid="login-form"]');
    await page.fill('[data-testid="email"]', 'photographer@wedding.test');
    await page.fill('[data-testid="password"]', 'NewStrongerPassword456!');
    await page.click('[data-testid="login-button"]');
    
    // Confirm all data accessible
    await page.waitForSelector('[data-testid="dashboard"]');
    await expect(page.locator('[data-testid="client-count"]')).toBeVisible();
    const finalClientCount = await page.locator('[data-testid="client-count"]').textContent();
    expect(finalClientCount).toContain('Active Clients');
  });

  test('Field-level encryption for sensitive data', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'supplier@wedding.test');
    await page.fill('[data-testid="password"]', 'SupplierPass123!');
    await page.click('[data-testid="login-button"]');
    
    // Create client with various sensitive fields
    await page.goto('/clients/new');
    await page.waitForSelector('[data-testid="client-form"]');
    
    // Fill sensitive fields
    await page.fill('[data-testid="client-ssn"]', '123-45-6789');
    await page.fill('[data-testid="credit-card"]', '4532-1234-5678-9012');
    await page.fill('[data-testid="bank-account"]', '987654321');
    await page.fill('[data-testid="personal-notes"]', 'Allergic to peanuts, prefers classical music');
    
    // Save client
    await page.click('[data-testid="save-client"]');
    await page.waitForSelector('[data-testid="client-saved-confirmation"]');
    
    // Verify each field is encrypted separately
    const fieldEncryption = await page.evaluate(async () => {
      const response = await fetch('/api/debug/field-encryption-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fields: ['client_ssn', 'credit_card', 'bank_account', 'personal_notes']
        })
      });
      return response.json();
    });
    
    expect(fieldEncryption.client_ssn.encrypted).toBe(true);
    expect(fieldEncryption.credit_card.encrypted).toBe(true);
    expect(fieldEncryption.bank_account.encrypted).toBe(true);
    expect(fieldEncryption.personal_notes.encrypted).toBe(true);
    
    // Verify different nonces for each field
    const nonces = [
      fieldEncryption.client_ssn.nonce,
      fieldEncryption.credit_card.nonce,
      fieldEncryption.bank_account.nonce,
      fieldEncryption.personal_notes.nonce
    ];
    const uniqueNonces = new Set(nonces);
    expect(uniqueNonces.size).toBe(4);
  });

  test('Encryption performance under load', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'performance@wedding.test');
    await page.fill('[data-testid="password"]', 'PerfTest123!');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to bulk import
    await page.goto('/clients/import');
    await page.waitForSelector('[data-testid="import-form"]');
    
    // Upload CSV with 100 clients
    const csvContent = generateBulkClientCSV(100);
    const buffer = Buffer.from(csvContent);
    
    await page.setInputFiles('[data-testid="csv-upload"]', {
      name: 'clients.csv',
      mimeType: 'text/csv',
      buffer
    });
    
    // Start import with encryption
    await page.click('[data-testid="enable-encryption"]');
    await page.click('[data-testid="start-import"]');
    
    // Monitor import progress
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="import-complete"]', { timeout: 60000 });
    const importTime = Date.now() - startTime;
    
    // Verify performance metrics
    const metrics = await page.evaluate(async () => {
      const response = await fetch('/api/encryption/performance-metrics');
      const data = await response.json();
      return data;
    });
    
    // Check average encryption time per field
    expect(metrics.avgEncryptionTimeMs).toBeLessThan(100);
    expect(metrics.totalFieldsEncrypted).toBe(400); // 100 clients × 4 sensitive fields
    expect(importTime).toBeLessThan(30000); // Should complete within 30 seconds
  });

  test('Recovery after failed encryption', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'recovery@wedding.test');
    await page.fill('[data-testid="password"]', 'RecoveryPass123!');
    await page.click('[data-testid="login-button"]');
    
    // Create client
    await page.goto('/clients/new');
    
    // Simulate network interruption during save
    await page.route('**/api/encryption/encrypt-field', route => {
      // Fail first request
      if (!page.url().includes('retry')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    // Fill and save client
    await page.fill('[data-testid="client-name"]', 'Recovery Test Client');
    await page.fill('[data-testid="sensitive-data"]', 'Important Information');
    await page.click('[data-testid="save-client"]');
    
    // Should show retry option
    await page.waitForSelector('[data-testid="encryption-failed-alert"]');
    await page.click('[data-testid="retry-encryption"]');
    
    // Should succeed on retry
    await page.waitForSelector('[data-testid="client-saved-confirmation"]');
    
    // Verify data was encrypted successfully
    const encryptionStatus = await page.evaluate(async () => {
      const response = await fetch('/api/debug/check-encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: 'Recovery Test Client' })
      });
      return response.json();
    });
    
    expect(encryptionStatus.encrypted).toBe(true);
    expect(encryptionStatus.recoverable).toBe(true);
  });
});

// Helper function to generate bulk client CSV
function generateBulkClientCSV(count: number): string {
  const headers = 'name,email,phone,venue,budget,notes\n';
  const rows = [];
  
  for (let i = 0; i < count; i++) {
    rows.push([
      `Client ${i + 1}`,
      `client${i + 1}@test.com`,
      `555-${String(i).padStart(4, '0')}`,
      `Venue ${i + 1} Location`,
      `${50000 + i * 1000}`,
      `Private notes for client ${i + 1}`
    ].join(','));
  }
  
  return headers + rows.join('\n');
}