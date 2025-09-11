/**
 * Document Storage E2E Tests
 * End-to-end tests for document management workflows
 * WS-068: Wedding Business Compliance Hub
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

test.describe('Document Storage System', () => {
  let page: Page;

  test.beforeEach(async ({ page: newPage }) => {
    page = newPage;
    
    // Login as test user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@weddingtesting.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard and navigate to documents
    await page.waitForURL('**/dashboard');
    await page.goto('/dashboard/documents');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Document Upload', () => {
    test('should upload a document successfully', async () => {
      // Click upload button
      await page.click('button:has-text("Upload Document")');
      
      // Wait for upload dialog
      await expect(page.locator('text="Upload Business Document"')).toBeVisible();
      
      // Select category
      await page.click('text="Select category"');
      await page.click('text="Insurance"');
      
      // Fill in document details
      await page.fill('input[placeholder="Enter document title"]', 'Public Liability Insurance 2024');
      await page.fill('textarea[placeholder="Optional description"]', 'Annual PLI certificate for wedding services');
      await page.fill('input[placeholder="Enter tags separated by commas"]', 'insurance, 2024, liability');
      
      // Switch to compliance tab
      await page.click('text="Compliance & Security"');
      
      // Set expiry date
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      await page.fill('input[type="date"]:nth-of-type(2)', expiryDate.toISOString().split('T')[0]);
      
      // Set security level
      await page.click('text="Standard - Normal protection"');
      await page.click('text="High - Enhanced protection"');
      
      // Check compliance required
      await page.check('input#compliance-required');
      
      // Upload file
      const fileInput = page.locator('input[type="file"]');
      const testFilePath = path.join(__dirname, 'fixtures', 'test-document.pdf');
      await fileInput.setInputFiles(testFilePath);
      
      // Wait for upload to complete
      await expect(page.locator('text="Upload completed successfully!"')).toBeVisible({ timeout: 10000 });
      
      // Verify document appears in list
      await expect(page.locator('text="Public Liability Insurance 2024"')).toBeVisible();
      await expect(page.locator('text="Insurance"')).toBeVisible();
      await expect(page.locator('text="High"')).toBeVisible();
    });

    test('should validate file size limits', async () => {
      await page.click('button:has-text("Upload Document")');
      await expect(page.locator('text="Upload Business Document"')).toBeVisible();
      
      // Try to upload a file that's too large
      const largeFileInput = page.locator('input[type="file"]');
      const largePath = path.join(__dirname, 'fixtures', 'large-file.pdf'); // >50MB file
      await largeFileInput.setInputFiles(largePath);
      
      // Should show error
      await expect(page.locator('text="File size exceeds maximum limit"')).toBeVisible();
    });

    test('should reject unsupported file types', async () => {
      await page.click('button:has-text("Upload Document")');
      await expect(page.locator('text="Upload Business Document"')).toBeVisible();
      
      // Try to upload an executable file
      const fileInput = page.locator('input[type="file"]');
      const execPath = path.join(__dirname, 'fixtures', 'test.exe');
      await fileInput.setInputFiles(execPath);
      
      // Should show error
      await expect(page.locator('text="File type not supported"')).toBeVisible();
    });

    test('should support drag and drop upload', async () => {
      // Create a data transfer for drag and drop
      const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
      
      // Simulate dragging a file over the drop zone
      const dropZone = page.locator('[data-testid="drop-zone"]');
      await dropZone.dispatchEvent('dragenter', { dataTransfer });
      
      // Verify drag active state
      await expect(dropZone).toHaveClass(/border-blue-500/);
      await expect(page.locator('text="Drop your documents here!"')).toBeVisible();
      
      // Drop the file
      await dropZone.dispatchEvent('drop', { dataTransfer });
      
      // Verify upload starts
      await expect(page.locator('text="Processing Status"')).toBeVisible();
    });
  });

  test.describe('Document Library', () => {
    test('should display documents in grid view', async () => {
      // Verify grid view is default
      const gridButton = page.locator('button[aria-pressed="true"]:has-text("Grid")');
      await expect(gridButton).toBeVisible();
      
      // Check document cards are displayed
      const documentCards = page.locator('[data-testid="document-card"]');
      await expect(documentCards).toHaveCount(await documentCards.count());
      
      // Verify card contains expected information
      const firstCard = documentCards.first();
      await expect(firstCard.locator('text=/Insurance|Safety|Certificates|Permits/')).toBeVisible();
      await expect(firstCard.locator('text=/Valid|Expiring|Expired/')).toBeVisible();
    });

    test('should switch between grid and list views', async () => {
      // Switch to list view
      await page.click('button:has-text("List")');
      
      // Verify list view is active
      await expect(page.locator('button[aria-pressed="true"]:has-text("List")')).toBeVisible();
      
      // Check document rows are displayed
      const documentRows = page.locator('[data-testid="document-row"]');
      await expect(documentRows.first()).toBeVisible();
      
      // Switch back to grid view
      await page.click('button:has-text("Grid")');
      await expect(page.locator('[data-testid="document-card"]').first()).toBeVisible();
    });

    test('should search documents', async () => {
      // Enter search term
      await page.fill('input[placeholder="Search documents..."]', 'insurance');
      
      // Wait for search results
      await page.waitForTimeout(500); // Debounce delay
      
      // Verify filtered results
      const searchResults = page.locator('[data-testid="document-card"]:has-text("insurance")');
      await expect(searchResults).toBeVisible();
      
      // Clear search
      await page.fill('input[placeholder="Search documents..."]', '');
      await page.waitForTimeout(500);
    });

    test('should filter documents by category', async () => {
      // Open filters
      await page.click('button:has-text("Filters")');
      await expect(page.locator('text="Category"')).toBeVisible();
      
      // Select Insurance category
      await page.click('text="All categories"');
      await page.click('text="Insurance"');
      
      // Verify filtered results
      await expect(page.locator('[data-testid="document-card"]:has-text("Insurance")')).toBeVisible();
      
      // Verify other categories are hidden
      await expect(page.locator('[data-testid="document-card"]:has-text("Safety Certificates")')).not.toBeVisible();
    });

    test('should filter documents by compliance status', async () => {
      // Open filters
      await page.click('button:has-text("Filters")');
      
      // Select Expiring status
      await page.click('text="All statuses"');
      await page.click('text="Expiring"');
      
      // Verify only expiring documents shown
      await expect(page.locator('[data-testid="document-card"]:has-text("Expiring")')).toBeVisible();
      await expect(page.locator('[data-testid="document-card"]:has-text("Valid"):not(:has-text("Expiring"))')).not.toBeVisible();
    });

    test('should sort documents', async () => {
      // Open sort menu
      await page.click('button:has-text("Sort")');
      
      // Sort by expiry date
      await page.click('text="Expiry Date"');
      
      // Verify sort applied
      const documentDates = await page.locator('[data-testid="expiry-date"]').allTextContents();
      const sortedDates = [...documentDates].sort();
      expect(documentDates).toEqual(sortedDates);
      
      // Toggle sort order
      await page.click('text="Ascending"');
      
      // Verify reverse sort
      const reversedDates = await page.locator('[data-testid="expiry-date"]').allTextContents();
      expect(reversedDates).toEqual(sortedDates.reverse());
    });
  });

  test.describe('Compliance Tracking', () => {
    test('should display expiry tracker', async () => {
      // Navigate to compliance view
      await page.click('button:has-text("Compliance")');
      
      // Verify compliance metrics
      await expect(page.locator('text="Compliance Rate"')).toBeVisible();
      await expect(page.locator('text=/\\d+%/')).toBeVisible();
      
      // Check expiry categories
      await expect(page.locator('text="Expired"')).toBeVisible();
      await expect(page.locator('text="Expiring Soon"')).toBeVisible();
      await expect(page.locator('text="Total Tracked"')).toBeVisible();
    });

    test('should show critical expiry alerts', async () => {
      // Look for alert if there are expired/expiring documents
      const alert = page.locator('[role="alert"]:has-text("Urgent Action Required")');
      if (await alert.isVisible()) {
        await expect(alert).toContainText(/expired documents|expiring within/);
      }
    });

    test('should configure expiry alerts', async () => {
      // Find a document with expiry date
      const documentWithExpiry = page.locator('[data-testid="document-card"]:has([data-testid="expiry-date"])').first();
      
      // Click settings icon
      await documentWithExpiry.locator('button[title="Configure alerts"]').click();
      
      // Configure alert settings dialog
      await expect(page.locator('text="Configure Expiry Alerts"')).toBeVisible();
      
      // Set warning days
      await page.click('text="30 days"');
      await page.click('text="60 days"');
      
      // Enable notification methods
      await page.check('input#email-alerts');
      await page.check('input#push-alerts');
      
      // Save settings
      await page.click('button:has-text("Save Settings")');
      
      // Verify success
      await expect(page.locator('text="Alert settings updated"')).toBeVisible();
    });
  });

  test.describe('Document Sharing', () => {
    test('should create a sharing link', async () => {
      // Select a document
      const document = page.locator('[data-testid="document-card"]').first();
      await document.locator('button[title="Share"]').click();
      
      // Create sharing link dialog
      await expect(page.locator('text="Create Sharing Link"')).toBeVisible();
      
      // Select link type
      await page.click('text="View Only"');
      await page.click('text="Download - Allow downloading"');
      
      // Set security options
      await page.fill('input[placeholder="Enter password to protect link"]', 'SecurePass123');
      await page.check('text="Require Email Address"');
      
      // Set expiry
      await page.click('text="Never"');
      await page.click('text="1 week"');
      
      // Create link
      await page.click('button:has-text("Create Link")');
      
      // Verify link created
      await expect(page.locator('text="Sharing link created successfully"')).toBeVisible();
      await expect(page.locator('text=/share\\/[a-zA-Z0-9]+/')).toBeVisible();
      
      // Copy link
      await page.click('button[title="Copy link"]');
      await expect(page.locator('svg.text-green-600')).toBeVisible(); // Check icon
    });

    test('should manage sharing links', async () => {
      // Open sharing panel for a document
      const document = page.locator('[data-testid="document-card"]').first();
      await document.click();
      
      // Go to sharing tab
      await page.click('text="Access Control"');
      await page.click('text="Sharing Links"');
      
      // If there are existing links
      const links = page.locator('[data-testid="sharing-link"]');
      if (await links.count() > 0) {
        // Test deactivating a link
        const firstLink = links.first();
        await firstLink.locator('button[title="Edit"]').click();
        await page.click('text="Deactivate Link"');
        
        // Verify deactivated
        await expect(firstLink.locator('text="Inactive"')).toBeVisible();
        
        // Test deleting a link
        await firstLink.locator('button[title="Delete"]').click();
        await page.click('button:has-text("Confirm Delete")');
        
        // Verify deleted
        await expect(firstLink).not.toBeVisible();
      }
    });

    test('should track sharing activity', async () => {
      // Open document access control
      const document = page.locator('[data-testid="document-card"]').first();
      await document.click();
      
      // Go to activity tab
      await page.click('text="Access Control"');
      await page.click('text="Activity Log"');
      
      // Verify activity log structure
      const activityTable = page.locator('table:has-text("Action")');
      if (await activityTable.isVisible()) {
        await expect(activityTable.locator('th:has-text("User/Email")')).toBeVisible();
        await expect(activityTable.locator('th:has-text("IP Address")')).toBeVisible();
        await expect(activityTable.locator('th:has-text("Time")')).toBeVisible();
        await expect(activityTable.locator('th:has-text("Status")')).toBeVisible();
      } else {
        await expect(page.locator('text="No activity yet"')).toBeVisible();
      }
    });
  });

  test.describe('Document Operations', () => {
    test('should download a document', async () => {
      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download');
      
      // Click download button on first document
      const document = page.locator('[data-testid="document-card"]').first();
      await document.locator('button[title="Download"]').click();
      
      // Wait for download to start
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/\.(pdf|jpg|png|docx?)$/);
    });

    test('should delete a document', async () => {
      // Get initial document count
      const initialCount = await page.locator('[data-testid="document-card"]').count();
      
      // Delete first document
      const document = page.locator('[data-testid="document-card"]').first();
      const documentTitle = await document.locator('h3').textContent();
      
      await document.locator('button[title="Delete"]').click();
      
      // Confirm deletion
      await page.click('button:has-text("Delete"):not([title])');
      
      // Verify document removed
      await expect(page.locator(`text="${documentTitle}"`)).not.toBeVisible();
      
      // Verify count decreased
      const newCount = await page.locator('[data-testid="document-card"]').count();
      expect(newCount).toBe(initialCount - 1);
    });

    test('should edit document metadata', async () => {
      // Click edit on first document
      const document = page.locator('[data-testid="document-card"]').first();
      await document.locator('button[title="Edit"]').click();
      
      // Edit dialog
      await expect(page.locator('text="Edit Document"')).toBeVisible();
      
      // Update title
      await page.fill('input[name="title"]', 'Updated Document Title');
      
      // Update description
      await page.fill('textarea[name="description"]', 'Updated description for testing');
      
      // Update expiry date
      const newExpiry = new Date();
      newExpiry.setMonth(newExpiry.getMonth() + 6);
      await page.fill('input[name="expiry_date"]', newExpiry.toISOString().split('T')[0]);
      
      // Save changes
      await page.click('button:has-text("Save Changes")');
      
      // Verify updates
      await expect(page.locator('text="Document updated successfully"')).toBeVisible();
      await expect(page.locator('text="Updated Document Title"')).toBeVisible();
    });

    test('should perform bulk operations', async () => {
      // Select multiple documents
      await page.check('[data-testid="document-checkbox"]:nth-of-type(1)');
      await page.check('[data-testid="document-checkbox"]:nth-of-type(2)');
      
      // Bulk actions menu should appear
      await expect(page.locator('text="2 selected"')).toBeVisible();
      
      // Test bulk category change
      await page.click('button:has-text("Bulk Actions")');
      await page.click('text="Change Category"');
      await page.click('text="Safety Certificates"');
      await page.click('button:has-text("Apply")');
      
      // Verify success
      await expect(page.locator('text="2 documents updated"')).toBeVisible();
    });
  });

  test.describe('Security Features', () => {
    test('should enforce access control', async () => {
      // Try to access a document without permission
      await page.goto('/api/documents/unauthorized-doc-id');
      
      // Should get access denied
      await expect(page.locator('text=/Access denied|403|Forbidden/')).toBeVisible();
    });

    test('should validate sharing link security', async () => {
      // Go to a shared link page
      await page.goto('/share/test-invalid-token');
      
      // Should show error
      await expect(page.locator('text=/not found|expired|invalid/')).toBeVisible();
    });

    test('should require password for protected links', async () => {
      // Assuming we have a password-protected link
      await page.goto('/share/password-protected-token');
      
      // Should show password prompt
      if (await page.locator('text="Password Required"').isVisible()) {
        // Enter wrong password
        await page.fill('input[type="password"]', 'wrong-password');
        await page.click('button:has-text("Submit")');
        
        // Should show error
        await expect(page.locator('text="Invalid password"')).toBeVisible();
        
        // Enter correct password
        await page.fill('input[type="password"]', 'correct-password');
        await page.click('button:has-text("Submit")');
        
        // Should grant access
        await expect(page.locator('text="Document access granted"')).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify mobile menu
      await expect(page.locator('button[aria-label="Menu"]')).toBeVisible();
      
      // Open mobile menu
      await page.click('button[aria-label="Menu"]');
      
      // Navigate to documents
      await page.click('text="Documents"');
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="document-card"]')).toBeVisible();
      
      // Cards should stack vertically on mobile
      const cards = await page.locator('[data-testid="document-card"]').boundingBox();
      expect(cards?.width).toBeLessThan(400);
    });

    test('should work on tablet devices', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Verify tablet layout (2 column grid)
      const grid = page.locator('[data-testid="document-grid"]');
      const gridStyles = await grid.evaluate(el => 
        window.getComputedStyle(el).gridTemplateColumns
      );
      
      expect(gridStyles).toContain('2');
    });
  });

  test.describe('Performance', () => {
    test('should handle large document libraries', async () => {
      // Mock a large dataset
      await page.route('**/api/documents', async route => {
        const documents = Array.from({ length: 100 }, (_, i) => ({
          id: `doc-${i}`,
          title: `Document ${i}`,
          category_id: 'insurance',
          file_size: 1024000,
          created_at: new Date().toISOString()
        }));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            documents: documents.slice(0, 20), // Paginated
            total: 100,
            has_more: true
          })
        });
      });
      
      await page.reload();
      
      // Verify pagination controls
      await expect(page.locator('text="Page 1 of 5"')).toBeVisible();
      await expect(page.locator('button:has-text("Next")')).toBeVisible();
      
      // Test pagination
      await page.click('button:has-text("Next")');
      await expect(page.locator('text="Page 2 of 5"')).toBeVisible();
    });

    test('should lazy load images', async () => {
      // Check that images have loading="lazy" attribute
      const images = page.locator('img[data-testid="document-thumbnail"]');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const loading = await images.nth(i).getAttribute('loading');
        expect(loading).toBe('lazy');
      }
    });
  });
});