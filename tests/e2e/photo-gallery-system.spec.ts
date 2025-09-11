/**
 * Photo Gallery System E2E Tests - WS-079 Photo Gallery System
 * Tests the complete photo upload, organization, and sharing workflow
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Photo Gallery System', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            app_metadata: { organization_id: 'test-org-id' }
          },
          session: { access_token: 'mock-token' }
        })
      });
    });

    // Mock Supabase API calls
    await page.route('**/supabase.co/rest/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      
      // Mock photo buckets endpoint
      if (url.pathname.includes('photo_buckets')) {
        if (method === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'bucket-1',
              name: 'Test Wedding',
              description: 'Test wedding photos',
              bucketType: 'wedding',
              isPublic: false,
              clientId: 'client-1',
              vendorId: null,
              photoCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          });
        }
      }
      
      // Mock photo albums endpoint
      else if (url.pathname.includes('photo_albums')) {
        if (method === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'album-1',
              name: 'Ceremony',
              description: 'Wedding ceremony photos',
              bucketId: 'bucket-1',
              eventDate: '2024-06-15',
              location: 'Central Park',
              isFeatured: false,
              photoCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          });
        }
      }
      
      // Mock photos endpoint
      else if (url.pathname.includes('photos')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
      
      // Default fallback
      else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    // Mock Supabase Storage API
    await page.route('**/supabase.co/storage/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      
      if (method === 'POST' && url.pathname.includes('upload')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            path: '/photos/test-photo.jpg',
            fullPath: 'bucket-1/photos/test-photo.jpg'
          })
        });
      } else if (method === 'GET' && url.pathname.includes('buckets')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ name: 'photos' }])
        });
      } else {
        await route.fulfill({ status: 200, body: '{}' });
      }
    });
  });

  test('should display photo gallery interface', async ({ page }) => {
    await page.goto('/dashboard/photos');
    
    // Wait for the page to load
    await expect(page).toHaveTitle(/Photo Gallery/);
    
    // Should show albums view by default
    await expect(page.getByText('Albums')).toBeVisible();
    await expect(page.getByText('New Album')).toBeVisible();
    
    // Should show empty state
    await expect(page.getByText('No albums yet')).toBeVisible();
    await expect(page.getByText('Create your first album to organize photos')).toBeVisible();
  });

  test('should create a new album', async ({ page }) => {
    await page.goto('/dashboard/photos');
    
    // Click New Album button
    await page.getByText('New Album').click();
    
    // Fill out album creation form
    await expect(page.getByText('Create New Album')).toBeVisible();
    
    await page.fill('[placeholder="Enter album name"]', 'Ceremony Photos');
    await page.fill('[placeholder="Optional description"]', 'Beautiful ceremony moments');
    await page.fill('input[type="date"]', '2024-06-15');
    await page.fill('[placeholder="Event location"]', 'Central Park');
    
    // Submit the form
    await page.getByRole('button', { name: 'Create Album' }).click();
    
    // Should close modal and show success
    await expect(page.getByText('Create New Album')).not.toBeVisible();
    
    // Should show the created album
    await expect(page.getByText('Ceremony Photos')).toBeVisible();
  });

  test('should handle photo upload workflow', async ({ page }) => {
    await page.goto('/dashboard/photos');
    
    // Create an album first
    await page.getByText('New Album').click();
    await page.fill('[placeholder="Enter album name"]', 'Test Album');
    await page.getByRole('button', { name: 'Create Album' }).click();
    
    // Click on the album to enter photos view
    await page.getByText('Test Album').click();
    
    // Should show photos view with upload button
    await expect(page.getByText('Upload Photos')).toBeVisible();
    await expect(page.getByText('No photos yet')).toBeVisible();
    
    // Click upload button
    await page.getByText('Upload Photos').click();
    
    // Should open upload modal
    await expect(page.getByText('Upload Photos')).toBeVisible();
    await expect(page.getByText('Drag and drop photos here')).toBeVisible();
    
    // Test file upload (simulate)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    
    // Create test files
    const testFile1 = path.join(__dirname, 'test-assets', 'test-photo-1.jpg');
    const testFile2 = path.join(__dirname, 'test-assets', 'test-photo-2.jpg');
    
    // Mock file selection (since we can't create actual files in test)
    await page.evaluate(() => {
      // Simulate file selection event
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        const mockFiles = [
          new File(['mock image data 1'], 'test-photo-1.jpg', { type: 'image/jpeg' }),
          new File(['mock image data 2'], 'test-photo-2.jpg', { type: 'image/jpeg' })
        ];
        
        // Create a mock DataTransfer object
        const dataTransfer = new DataTransfer();
        mockFiles.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
        
        // Dispatch change event
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Should show upload progress
    await expect(page.getByText('Uploading photos...')).toBeVisible();
    await expect(page.getByText('Compressing images...')).toBeVisible();
    
    // Wait for upload completion (mocked)
    await page.waitForTimeout(2000);
    
    // Should show completion
    await expect(page.getByText('Upload completed successfully')).toBeVisible();
    
    // Close upload modal
    await page.getByText('Done').click();
    
    // Should show uploaded photos in gallery
    await expect(page.getByText('2 photos')).toBeVisible();
  });

  test('should support photo selection and bulk operations', async ({ page }) => {
    await page.goto('/dashboard/photos');
    
    // Mock existing photos
    await page.route('**/supabase.co/rest/v1/photos*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'photo-1',
            filename: 'ceremony-1.jpg',
            filePath: '/photos/ceremony-1.jpg',
            title: 'Ceremony Photo 1',
            isApproved: true,
            viewCount: 10,
            downloadCount: 2
          },
          {
            id: 'photo-2',
            filename: 'ceremony-2.jpg',
            filePath: '/photos/ceremony-2.jpg',
            title: 'Ceremony Photo 2',
            isApproved: true,
            viewCount: 8,
            downloadCount: 1
          }
        ])
      });
    });
    
    // Navigate to photos view
    await page.getByText('All Photos').click();
    
    // Should show photos
    await expect(page.getByText('Ceremony Photo 1')).toBeVisible();
    await expect(page.getByText('Ceremony Photo 2')).toBeVisible();
    
    // Select first photo
    await page.getByTestId('photo-card-photo-1').getByText('Select').click();
    
    // Should show selection controls
    await expect(page.getByText('1 selected')).toBeVisible();
    await expect(page.getByText('Share')).toBeVisible();
    await expect(page.getByText('Download')).toBeVisible();
    await expect(page.getByText('Delete')).toBeVisible();
    
    // Select all photos
    await page.getByText('Select All').click();
    await expect(page.getByText('2 selected')).toBeVisible();
    
    // Clear selection
    await page.getByText('Clear').click();
    await expect(page.getByText('selected')).not.toBeVisible();
  });

  test('should open vendor sharing modal', async ({ page }) => {
    await page.goto('/dashboard/photos');
    
    // Mock existing photos
    await page.route('**/supabase.co/rest/v1/photos*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'photo-1',
            filename: 'ceremony-1.jpg',
            filePath: '/photos/ceremony-1.jpg',
            title: 'Ceremony Photo 1',
            isApproved: true
          }
        ])
      });
    });
    
    // Navigate to photos and select one
    await page.getByText('All Photos').click();
    await page.getByTestId('photo-card-photo-1').getByText('Select').click();
    
    // Click share button
    await page.getByText('Share').click();
    
    // Should open vendor sharing modal
    await expect(page.getByText('Share with Vendors')).toBeVisible();
    
    // Should show vendor types
    await expect(page.getByText('Photographer')).toBeVisible();
    await expect(page.getByText('Florist')).toBeVisible();
    await expect(page.getByText('Venue')).toBeVisible();
    
    // Select photographers
    await page.getByText('Photographer').click();
    
    // Should show permission options
    await expect(page.getByText('View only')).toBeVisible();
    await expect(page.getByText('Download')).toBeVisible();
    
    // Set expiry date
    await page.fill('input[type="date"]', '2024-12-31');
    
    // Share photos
    await page.getByRole('button', { name: 'Share Photos' }).click();
    
    // Should close modal and show success
    await expect(page.getByText('Share with Vendors')).not.toBeVisible();
    await expect(page.getByText('Photos shared successfully')).toBeVisible();
  });

  test('should switch between view modes', async ({ page }) => {
    await page.goto('/dashboard/photos');
    
    // Should start in albums view
    await expect(page.getByText('Albums')).toBeVisible();
    await expect(page.getByText('Albums')).toHaveClass(/active/);
    
    // Switch to photos view
    await page.getByText('All Photos').click();
    await expect(page.getByText('All Photos')).toHaveClass(/active/);
    
    // Should show photos interface
    await expect(page.getByPlaceholderText('Search photos...')).toBeVisible();
  });

  test('should toggle between grid and list layouts', async ({ page }) => {
    await page.goto('/dashboard/photos');
    
    // Mock existing photos
    await page.route('**/supabase.co/rest/v1/photos*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'photo-1',
            filename: 'test.jpg',
            filePath: '/photos/test.jpg',
            title: 'Test Photo'
          }
        ])
      });
    });
    
    // Navigate to photos view
    await page.getByText('All Photos').click();
    
    // Should start in grid view
    await expect(page.getByRole('button', { name: /grid/i })).toHaveAttribute('aria-pressed', 'true');
    
    // Switch to list view
    await page.getByRole('button', { name: /list/i }).click();
    await expect(page.getByRole('button', { name: /list/i })).toHaveAttribute('aria-pressed', 'true');
    
    // Switch back to grid view
    await page.getByRole('button', { name: /grid/i }).click();
    await expect(page.getByRole('button', { name: /grid/i })).toHaveAttribute('aria-pressed', 'true');
  });

  test('should handle photo search functionality', async ({ page }) => {
    await page.goto('/dashboard/photos');
    
    // Mock existing photos with searchable data
    await page.route('**/supabase.co/rest/v1/photos*', async (route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('title');
      
      let photos = [
        {
          id: 'photo-1',
          filename: 'ceremony-entrance.jpg',
          title: 'Ceremony Entrance',
          filePath: '/photos/ceremony-entrance.jpg'
        },
        {
          id: 'photo-2',
          filename: 'reception-dance.jpg',
          title: 'Reception Dance',
          filePath: '/photos/reception-dance.jpg'
        }
      ];
      
      // Filter by search if provided
      if (search) {
        photos = photos.filter(photo => 
          photo.title.toLowerCase().includes(search.toLowerCase()) ||
          photo.filename.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(photos)
      });
    });
    
    // Navigate to photos view
    await page.getByText('All Photos').click();
    
    // Should show all photos initially
    await expect(page.getByText('Ceremony Entrance')).toBeVisible();
    await expect(page.getByText('Reception Dance')).toBeVisible();
    
    // Search for ceremony photos
    const searchInput = page.getByPlaceholderText('Search photos...');
    await searchInput.fill('ceremony');
    
    // Should filter results
    await expect(page.getByText('Ceremony Entrance')).toBeVisible();
    await expect(page.getByText('Reception Dance')).not.toBeVisible();
    
    // Clear search
    await searchInput.clear();
    
    // Should show all photos again
    await expect(page.getByText('Ceremony Entrance')).toBeVisible();
    await expect(page.getByText('Reception Dance')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/supabase.co/rest/v1/photos*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.goto('/dashboard/photos');
    await page.getByText('All Photos').click();
    
    // Should show error state
    await expect(page.getByText('Failed to load photos')).toBeVisible();
    await expect(page.getByText('Try again')).toBeVisible();
    
    // Mock successful retry
    await page.route('**/supabase.co/rest/v1/photos*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'photo-1',
            filename: 'test.jpg',
            title: 'Test Photo',
            filePath: '/photos/test.jpg'
          }
        ])
      });
    });
    
    // Click retry
    await page.getByText('Try again').click();
    
    // Should load successfully
    await expect(page.getByText('Test Photo')).toBeVisible();
    await expect(page.getByText('Failed to load photos')).not.toBeVisible();
  });

  test('should handle drag and drop photo upload', async ({ page }) => {
    await page.goto('/dashboard/photos');
    
    // Create album first
    await page.getByText('New Album').click();
    await page.fill('[placeholder="Enter album name"]', 'Drag Drop Test');
    await page.getByRole('button', { name: 'Create Album' }).click();
    await page.getByText('Drag Drop Test').click();
    
    // Open upload modal
    await page.getByText('Upload Photos').click();
    
    // Should show drop zone
    const dropZone = page.getByText('Drag and drop photos here');
    await expect(dropZone).toBeVisible();
    
    // Simulate drag and drop
    await page.evaluate(() => {
      const dropZone = document.querySelector('[data-testid="photo-drop-zone"]') as HTMLElement;
      if (dropZone) {
        const mockFiles = [
          new File(['mock data'], 'dropped-photo.jpg', { type: 'image/jpeg' })
        ];
        
        const dataTransfer = new DataTransfer();
        mockFiles.forEach(file => dataTransfer.items.add(file));
        
        // Simulate drop event
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          dataTransfer
        });
        
        dropZone.dispatchEvent(dropEvent);
      }
    });
    
    // Should show file being processed
    await expect(page.getByText('Processing files...')).toBeVisible();
  });
});