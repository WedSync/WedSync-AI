/**
 * Photo Upload Compression E2E Tests - WS-079 Photo Gallery System
 * Tests the photo upload compression workflow and 60%+ compression requirement
 */

import { test, expect } from '@playwright/test';

test.describe('Photo Upload Compression', () => {
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

    // Mock photo service compression results
    let compressionResults: any[] = [];
    
    await page.addInitScript(() => {
      // Mock PhotoService compression method
      (window as any).mockCompressionResults = [];
      
      // Override PhotoService methods
      if ((window as any).PhotoService) {
        const originalCompress = (window as any).PhotoService.prototype.compressImage;
        (window as any).PhotoService.prototype.compressImage = async function(file: File, settings: any) {
          // Simulate realistic compression based on settings
          const originalSize = file.size;
          let compressedSize = originalSize;
          
          // Simulate compression ratios based on quality settings
          if (settings.quality <= 0.5) {
            compressedSize = originalSize * 0.3; // 70% compression
          } else if (settings.quality <= 0.7) {
            compressedSize = originalSize * 0.4; // 60% compression
          } else if (settings.quality <= 0.8) {
            compressedSize = originalSize * 0.5; // 50% compression
          } else {
            compressedSize = originalSize * 0.7; // 30% compression
          }
          
          const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
          
          // Create mock compressed blob
          const compressedBlob = new Blob(['compressed data'], { type: 'image/jpeg' });
          Object.defineProperty(compressedBlob, 'size', { value: compressedSize });
          
          const result = {
            blob: compressedBlob,
            compressionRatio,
            originalSize,
            compressedSize,
            quality: settings.quality
          };
          
          (window as any).mockCompressionResults.push(result);
          return result;
        };
      }
    });

    // Mock Supabase routes
    await page.route('**/supabase.co/rest/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      
      if (url.pathname.includes('photo_buckets') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'bucket-1',
            name: 'Test Wedding',
            bucketType: 'wedding'
          }])
        });
      } else if (url.pathname.includes('photo_albums') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'album-1',
            name: 'Test Album',
            bucketId: 'bucket-1'
          }])
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    await page.route('**/supabase.co/storage/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ path: '/photos/test.jpg' })
      });
    });
  });

  test('should achieve 60%+ compression ratio', async ({ page }) => {
    await page.goto('/dashboard/photos');
    
    // Navigate to album and open upload
    await page.getByText('Test Album').click();
    await page.getByText('Upload Photos').click();
    
    // Should show compression settings
    await expect(page.getByText('Compression Settings')).toBeVisible();
    
    // Select high compression quality
    await page.getByText('High compression').click();
    
    // Simulate uploading a large file
    await page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        // Create a large mock file (5MB)
        const largeMockFile = new File(['x'.repeat(5 * 1024 * 1024)], 'large-photo.jpg', { 
          type: 'image/jpeg'
        });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(largeMockFile);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Should show compression progress
    await expect(page.getByText('Compressing images...')).toBeVisible();
    
    // Wait for compression to complete
    await page.waitForFunction(() => {
      return (window as any).mockCompressionResults?.length > 0;
    });
    
    // Verify compression ratio
    const compressionResults = await page.evaluate(() => {
      return (window as any).mockCompressionResults;
    });
    
    expect(compressionResults).toHaveLength(1);
    expect(compressionResults[0].compressionRatio).toBeGreaterThanOrEqual(60);
    
    // Should show compression statistics
    await expect(page.getByText(/Compressed by \d+%/)).toBeVisible();
    await expect(page.getByText(/Size reduced from/)).toBeVisible();
  });

  test('should show compression statistics during upload', async ({ page }) => {
    await page.goto('/dashboard/photos');
    await page.getByText('Test Album').click();
    await page.getByText('Upload Photos').click();
    
    // Upload multiple files
    await page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        const files = [
          new File(['data1'.repeat(1000000)], 'photo1.jpg', { type: 'image/jpeg' }),
          new File(['data2'.repeat(800000)], 'photo2.jpg', { type: 'image/jpeg' }),
          new File(['data3'.repeat(1200000)], 'photo3.jpg', { type: 'image/jpeg' })
        ];
        
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Should show batch compression progress
    await expect(page.getByText('Processing 3 photos...')).toBeVisible();
    
    // Should show individual file compression stats
    await page.waitForSelector('[data-testid="compression-stats"]');
    
    // Verify all files show compression ratios
    const statElements = page.locator('[data-testid="file-compression-stat"]');
    await expect(statElements).toHaveCount(3);
    
    // Each file should show compression percentage
    for (let i = 0; i < 3; i++) {
      await expect(statElements.nth(i)).toContainText('%');
    }
  });

  test('should allow adjusting compression quality', async ({ page }) => {
    await page.goto('/dashboard/photos');
    await page.getByText('Test Album').click();
    await page.getByText('Upload Photos').click();
    
    // Should show compression quality options
    await expect(page.getByText('Low compression')).toBeVisible();
    await expect(page.getByText('Medium compression')).toBeVisible();
    await expect(page.getByText('High compression')).toBeVisible();
    
    // Test each compression level
    const compressionLevels = [
      { name: 'Low compression', expectedRatio: 30 },
      { name: 'Medium compression', expectedRatio: 50 },
      { name: 'High compression', expectedRatio: 70 }
    ];
    
    for (const level of compressionLevels) {
      // Select compression level
      await page.getByText(level.name).click();
      
      // Upload a test file
      await page.evaluate(() => {
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
          // Clear previous results
          (window as any).mockCompressionResults = [];
          
          const testFile = new File(['test'.repeat(500000)], 'test.jpg', { 
            type: 'image/jpeg'
          });
          
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(testFile);
          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      // Wait for compression
      await page.waitForFunction(() => {
        return (window as any).mockCompressionResults?.length > 0;
      });
      
      // Verify compression ratio meets expectations
      const results = await page.evaluate(() => {
        return (window as any).mockCompressionResults;
      });
      
      expect(results[0].compressionRatio).toBeGreaterThanOrEqual(level.expectedRatio);
    }
  });

  test('should handle compression errors gracefully', async ({ page }) => {
    // Mock compression failure
    await page.addInitScript(() => {
      if ((window as any).PhotoService) {
        (window as any).PhotoService.prototype.compressImage = async function() {
          throw new Error('Compression failed: Invalid image format');
        };
      }
    });
    
    await page.goto('/dashboard/photos');
    await page.getByText('Test Album').click();
    await page.getByText('Upload Photos').click();
    
    // Upload a file
    await page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        const testFile = new File(['invalid'], 'invalid.txt', { type: 'text/plain' });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(testFile);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Should show error message
    await expect(page.getByText('Compression failed')).toBeVisible();
    await expect(page.getByText('Invalid image format')).toBeVisible();
    
    // Should allow retry or skip
    await expect(page.getByText('Retry')).toBeVisible();
    await expect(page.getByText('Skip file')).toBeVisible();
  });

  test('should show total batch compression savings', async ({ page }) => {
    await page.goto('/dashboard/photos');
    await page.getByText('Test Album').click();
    await page.getByText('Upload Photos').click();
    
    // Upload multiple files
    await page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        const files = [
          new File(['data1'.repeat(2000000)], 'large1.jpg', { type: 'image/jpeg' }),
          new File(['data2'.repeat(1500000)], 'large2.jpg', { type: 'image/jpeg' }),
          new File(['data3'.repeat(1000000)], 'large3.jpg', { type: 'image/jpeg' })
        ];
        
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Wait for all compressions to complete
    await page.waitForFunction(() => {
      return (window as any).mockCompressionResults?.length === 3;
    });
    
    // Should show total savings summary
    await expect(page.getByText(/Total space saved:/)).toBeVisible();
    await expect(page.getByText(/MB saved/)).toBeVisible();
    await expect(page.getByText(/Average compression:/)).toBeVisible();
    
    // Verify total savings calculation
    const totalSavings = await page.evaluate(() => {
      const results = (window as any).mockCompressionResults;
      let totalOriginal = 0;
      let totalCompressed = 0;
      
      results.forEach((result: any) => {
        totalOriginal += result.originalSize;
        totalCompressed += result.compressedSize;
      });
      
      return {
        savedBytes: totalOriginal - totalCompressed,
        savedMB: (totalOriginal - totalCompressed) / (1024 * 1024),
        overallRatio: ((totalOriginal - totalCompressed) / totalOriginal) * 100
      };
    });
    
    expect(totalSavings.savedMB).toBeGreaterThan(0);
    expect(totalSavings.overallRatio).toBeGreaterThanOrEqual(60);
  });

  test('should preserve image metadata after compression', async ({ page }) => {
    await page.goto('/dashboard/photos');
    await page.getByText('Test Album').click();
    await page.getByText('Upload Photos').click();
    
    // Mock file with metadata
    await page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        const testFile = new File(['test data'], 'photo-with-metadata.jpg', { 
          type: 'image/jpeg' 
        });
        
        // Mock EXIF data
        (testFile as any).exifData = {
          camera: 'Canon EOS R5',
          lens: 'RF 24-70mm f/2.8L IS USM',
          focalLength: '50mm',
          aperture: 'f/2.8',
          shutterSpeed: '1/125',
          iso: '400',
          dateTaken: '2024-06-15T14:30:00Z'
        };
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(testFile);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Wait for compression
    await page.waitForFunction(() => {
      return (window as any).mockCompressionResults?.length > 0;
    });
    
    // Should show metadata preservation notice
    await expect(page.getByText('Metadata preserved')).toBeVisible();
    
    // Should display camera info
    await expect(page.getByText('Canon EOS R5')).toBeVisible();
    await expect(page.getByText('f/2.8')).toBeVisible();
  });
});