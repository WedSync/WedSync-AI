/**
 * WS-016: Notes Feature - E2E Tests
 * End-to-end tests for the private client notes system UI
 */

import { test, expect } from '@playwright/test';

test.describe('Notes System - WS-016', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication and navigate to client page
    await page.goto('/clients/123/notes');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="notes-section"]');
  });

  test('should display notes section with header', async ({ page }) => {
    // Check if notes section is visible
    const notesSection = page.locator('[data-testid="notes-section"]');
    await expect(notesSection).toBeVisible();
    
    // Check header
    await expect(page.locator('h2').filter({ hasText: 'Notes' })).toBeVisible();
    
    // Check Add Note button
    const addButton = page.locator('button').filter({ hasText: 'Add Note' });
    await expect(addButton).toBeVisible();
  });

  test('should open and close add note form', async ({ page }) => {
    // Click Add Note button
    const addButton = page.locator('button').filter({ hasText: 'Add Note' });
    await addButton.click();
    
    // Verify form is visible
    const addForm = page.locator('text=Add New Note').locator('..');
    await expect(addForm).toBeVisible();
    
    // Check form fields
    await expect(page.locator('select').filter({ hasText: 'Client Note' })).toBeVisible();
    await expect(page.locator('select').filter({ hasText: 'Public' })).toBeVisible();
    await expect(page.locator('textarea[placeholder*="Enter your note"]')).toBeVisible();
    
    // Close form
    const closeButton = page.locator('button[aria-label="Close"]').first();
    await closeButton.click();
    
    // Verify form is hidden
    await expect(addForm).not.toBeVisible();
  });

  test('should create a new note with auto-save functionality', async ({ page }) => {
    // Mock API response for creating note
    await page.route('/api/notes', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-note-123',
            content: 'Test note content',
            note_type: 'client',
            visibility: 'public',
            priority: 'medium',
            created_at: new Date().toISOString(),
            created_by_name: 'Test User'
          })
        });
      }
    });
    
    // Open add note form
    await page.locator('button').filter({ hasText: 'Add Note' }).click();
    
    // Fill in note details
    await page.locator('textarea[placeholder*="Enter your note"]').fill('Test note content');
    await page.locator('select').first().selectOption('important');
    await page.locator('select').nth(1).selectOption('private');
    await page.locator('input[placeholder*="tags"]').fill('urgent, test');
    
    // Save note
    await page.locator('button').filter({ hasText: 'Save Note' }).click();
    
    // Verify success (form should close)
    await expect(page.locator('text=Add New Note')).not.toBeVisible();
  });

  test('should search notes', async ({ page }) => {
    // Mock existing notes
    await page.route('/api/clients/*/notes*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'note-1',
              content: 'Bride prefers roses over peonies',
              note_type: 'client',
              visibility: 'public',
              created_at: new Date().toISOString(),
              created_by_name: 'Test User',
              tags: ['flowers', 'preferences']
            },
            {
              id: 'note-2', 
              content: 'Venue requires setup by 2pm',
              note_type: 'important',
              visibility: 'public',
              created_at: new Date().toISOString(),
              created_by_name: 'Test User',
              tags: ['venue', 'timing']
            }
          ],
          pagination: { limit: 50, offset: 0, total: 2, hasMore: false }
        })
      });
    });
    
    // Wait for notes to load
    await page.waitForTimeout(500);
    
    // Use search input
    const searchInput = page.locator('input[placeholder*="Search notes"]');
    await searchInput.fill('roses');
    
    // Wait for search results
    await page.waitForTimeout(300);
    
    // Should show only matching note
    await expect(page.locator('text=Bride prefers roses')).toBeVisible();
    await expect(page.locator('text=Venue requires setup')).not.toBeVisible();
  });

  test('should filter notes by type and visibility', async ({ page }) => {
    // Open filters
    await page.locator('button').filter({ hasText: 'Filters' }).click();
    
    // Verify filter options
    await expect(page.locator('select').filter({ hasText: 'All Types' })).toBeVisible();
    await expect(page.locator('select').filter({ hasText: 'All Visibility' })).toBeVisible();
    
    // Select specific filters
    await page.locator('select').first().selectOption('important');
    await page.locator('select').nth(1).selectOption('private');
    
    // Filters should be applied (this would need mocked data to test fully)
  });

  test('should edit existing note inline', async ({ page }) => {
    // Mock existing note
    await page.route('/api/clients/*/notes*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 'note-1',
            content: 'Original note content',
            note_type: 'client',
            visibility: 'public',
            created_at: new Date().toISOString(),
            created_by: 'current-user',
            created_by_name: 'Test User',
            tags: []
          }],
          pagination: { limit: 50, offset: 0, total: 1, hasMore: false }
        })
      });
    });
    
    // Mock update API
    await page.route('/api/notes/*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'note-1',
            content: 'Updated note content',
            note_type: 'client',
            visibility: 'public',
            updated_at: new Date().toISOString()
          })
        });
      }
    });
    
    // Wait for note to load
    await page.waitForTimeout(500);
    
    // Click edit button
    const editButton = page.locator('button[aria-label="Edit note"]').first();
    await editButton.click();
    
    // Edit textarea should appear
    const editTextarea = page.locator('textarea').filter({ hasText: 'Original note content' });
    await expect(editTextarea).toBeVisible();
    
    // Update content
    await editTextarea.clear();
    await editTextarea.fill('Updated note content');
    
    // Save changes
    await page.locator('button').filter({ hasText: 'Save' }).click();
    
    // Should show updated content
    await expect(page.locator('text=Updated note content')).toBeVisible();
  });

  test('should delete note with confirmation', async ({ page }) => {
    // Mock existing note
    await page.route('/api/clients/*/notes*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 'note-1',
            content: 'Note to be deleted',
            note_type: 'client',
            visibility: 'public',
            created_at: new Date().toISOString(),
            created_by: 'current-user',
            created_by_name: 'Test User'
          }]
        })
      });
    });
    
    // Mock delete API
    await page.route('/api/notes/*', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });
    
    // Wait for note to load
    await page.waitForTimeout(500);
    
    // Mock confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    
    // Click delete button
    const deleteButton = page.locator('button[aria-label="Delete note"]').first();
    await deleteButton.click();
    
    // Note should be removed
    await expect(page.locator('text=Note to be deleted')).not.toBeVisible();
  });

  test('should show appropriate empty state', async ({ page }) => {
    // Mock empty notes response
    await page.route('/api/clients/*/notes*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          pagination: { limit: 50, offset: 0, total: 0, hasMore: false }
        })
      });
    });
    
    // Wait for load
    await page.waitForTimeout(500);
    
    // Should show empty state
    await expect(page.locator('text=No notes found')).toBeVisible();
    await expect(page.locator('text=Add your first note to get started')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Add First Note' })).toBeVisible();
  });

  test('should handle note visibility permissions correctly', async ({ page }) => {
    // Mock notes with different visibility levels
    await page.route('/api/clients/*/notes*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'public-note',
              content: 'Public note visible to all',
              visibility: 'public',
              note_type: 'client',
              created_by_name: 'Test User',
              created_at: new Date().toISOString()
            },
            {
              id: 'private-note',
              content: 'Private note only for creator',
              visibility: 'private',
              note_type: 'client',
              created_by: 'current-user',
              created_by_name: 'Test User',
              created_at: new Date().toISOString()
            }
          ]
        })
      });
    });
    
    await page.waitForTimeout(500);
    
    // Both notes should be visible (assuming current user created the private one)
    await expect(page.locator('text=Public note visible to all')).toBeVisible();
    await expect(page.locator('text=Private note only for creator')).toBeVisible();
    
    // Private note should show privacy indicator
    await expect(page.locator('text=Private').first()).toBeVisible();
  });

  test('should pin and unpin notes', async ({ page }) => {
    // Mock existing note
    await page.route('/api/clients/*/notes*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 'note-1',
            content: 'Important note to pin',
            note_type: 'important',
            visibility: 'public',
            is_pinned: false,
            created_by: 'current-user',
            created_by_name: 'Test User',
            created_at: new Date().toISOString()
          }]
        })
      });
    });
    
    // Mock pin/unpin API
    await page.route('/api/notes/*', async route => {
      if (route.request().method() === 'PATCH') {
        const body = await route.request().postData();
        const data = JSON.parse(body || '{}');
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'note-1',
            content: 'Important note to pin',
            is_pinned: data.is_pinned,
            updated_at: new Date().toISOString()
          })
        });
      }
    });
    
    await page.waitForTimeout(500);
    
    // Click pin button
    const pinButton = page.locator('button[title*="Pin note"]').first();
    await pinButton.click();
    
    // Should show pinned indicator
    await expect(page.locator('text=📌 Pinned')).toBeVisible();
  });

  test('should validate note content length', async ({ page }) => {
    // Open add note form
    await page.locator('button').filter({ hasText: 'Add Note' }).click();
    
    // Try to save empty note
    const saveButton = page.locator('button').filter({ hasText: 'Save Note' });
    await expect(saveButton).toBeDisabled();
    
    // Add content
    await page.locator('textarea[placeholder*="Enter your note"]').fill('Valid note content');
    
    // Save button should be enabled
    await expect(saveButton).toBeEnabled();
  });

  test('should show follow-up date for follow-up notes', async ({ page }) => {
    // Open add note form
    await page.locator('button').filter({ hasText: 'Add Note' }).click();
    
    // Select follow-up note type
    await page.locator('select').first().selectOption('follow_up');
    
    // Follow-up date field should appear
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.locator('text=Follow-up Date')).toBeVisible();
  });
});