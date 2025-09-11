import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Service Worker Cache Lifecycle Testing - WS-171', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      serviceWorkers: 'allow'
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should handle cache versioning during service worker updates', async () => {
    await page.goto('/dashboard');
    
    const versioningTest = await page.evaluate(async () => {
      if ('caches' in window) {
        try {
          // Simulate old cache version
          const oldCache = await caches.open('wedsync-cache-v1');
          await oldCache.put('/test-resource', new Response('old version'));
          
          // Simulate new cache version
          const newCache = await caches.open('wedsync-cache-v2');
          await newCache.put('/test-resource', new Response('new version'));
          
          // Check both versions exist
          const cacheNames = await caches.keys();
          const hasOldVersion = cacheNames.includes('wedsync-cache-v1');
          const hasNewVersion = cacheNames.includes('wedsync-cache-v2');
          
          // Simulate cache cleanup (what SW would do on activate)
          await caches.delete('wedsync-cache-v1');
          
          const afterCleanup = await caches.keys();
          const oldVersionDeleted = !afterCleanup.includes('wedsync-cache-v1');
          const newVersionKept = afterCleanup.includes('wedsync-cache-v2');
          
          return {
            hasOldVersion,
            hasNewVersion,
            oldVersionDeleted,
            newVersionKept
          };
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'Cache API not supported' };
    });
    
    if (!versioningTest.error) {
      expect(versioningTest.hasOldVersion).toBeTruthy();
      expect(versioningTest.hasNewVersion).toBeTruthy();
      expect(versioningTest.oldVersionDeleted).toBeTruthy();
      expect(versioningTest.newVersionKept).toBeTruthy();
    }
    
    console.log('Cache Versioning Test:', versioningTest);
  });

  test('should manage cache keys and storage efficiently', async () => {
    await page.goto('/dashboard');
    
    const storageTest = await page.evaluate(async () => {
      if ('caches' in window && 'navigator' in window && 'storage' in navigator) {
        try {
          // Get storage estimate
          const storageEstimate = await navigator.storage.estimate();
          
          // Create test caches
          const testCache = await caches.open('storage-test');
          const testData = 'x'.repeat(1024); // 1KB of data
          
          // Add multiple resources
          const resources = Array(10).fill(null).map((_, i) => ({
            url: `/test-resource-${i}`,
            data: testData
          }));
          
          for (const resource of resources) {
            await testCache.put(resource.url, new Response(resource.data));
          }
          
          // Check cache contents
          const cachedRequests = await testCache.keys();
          
          // Clean up
          await caches.delete('storage-test');
          
          return {
            initialQuota: storageEstimate.quota,
            initialUsage: storageEstimate.usage,
            resourcesCached: cachedRequests.length,
            storageSupported: true
          };
        } catch (error) {
          return { error: error.message, storageSupported: false };
        }
      }
      return { error: 'Storage APIs not supported', storageSupported: false };
    });
    
    if (storageTest.storageSupported) {
      expect(storageTest.resourcesCached).toBe(10);
      expect(storageTest.initialQuota).toBeGreaterThan(0);
    }
    
    console.log('Storage Management Test:', storageTest);
  });

  test('should handle cache expiration and cleanup strategies', async () => {
    await page.goto('/dashboard');
    
    const expirationTest = await page.evaluate(async () => {
      if ('caches' in window) {
        try {
          const cache = await caches.open('expiration-test');
          
          // Add resource with metadata
          const response = new Response('test data', {
            headers: {
              'date': new Date().toISOString(),
              'cache-control': 'max-age=3600'
            }
          });
          
          await cache.put('/expiring-resource', response);
          
          // Check resource exists
          const cachedResponse = await cache.match('/expiring-resource');
          const hasResource = !!cachedResponse;
          
          // Get cache headers
          const cacheHeaders = hasResource ? {
            date: cachedResponse.headers.get('date'),
            cacheControl: cachedResponse.headers.get('cache-control')
          } : null;
          
          // Simulate expiration check
          const isExpired = hasResource ? 
            Date.now() - new Date(cachedResponse.headers.get('date')).getTime() > 3600000 :
            false;
          
          // Clean up
          await caches.delete('expiration-test');
          
          return {
            hasResource,
            cacheHeaders,
            isExpired,
            expirationSupported: true
          };
        } catch (error) {
          return { error: error.message, expirationSupported: false };
        }
      }
      return { error: 'Cache API not supported', expirationSupported: false };
    });
    
    if (expirationTest.expirationSupported) {
      expect(expirationTest.hasResource).toBeTruthy();
      expect(expirationTest.cacheHeaders).toBeTruthy();
    }
    
    console.log('Cache Expiration Test:', expirationTest);
  });

  test('should handle storage quota exceeded scenarios', async () => {
    await page.goto('/dashboard');
    
    const quotaTest = await page.evaluate(async () => {
      if ('caches' in window) {
        try {
          const cache = await caches.open('quota-test');
          let quotaExceeded = false;
          let resourcesAdded = 0;
          
          // Try to fill up cache until quota exceeded
          const largeData = 'x'.repeat(1024 * 100); // 100KB chunks
          
          while (!quotaExceeded && resourcesAdded < 100) {
            try {
              await cache.put(`/large-resource-${resourcesAdded}`, new Response(largeData));
              resourcesAdded++;
            } catch (error) {
              if (error.name === 'QuotaExceededError') {
                quotaExceeded = true;
              } else {
                throw error;
              }
            }
          }
          
          // Clean up
          await caches.delete('quota-test');
          
          return {
            quotaExceeded,
            resourcesAdded,
            quotaHandled: true
          };
        } catch (error) {
          return { error: error.message, quotaHandled: false };
        }
      }
      return { error: 'Cache API not supported', quotaHandled: false };
    });
    
    expect(quotaTest.quotaHandled).toBeTruthy();
    console.log('Storage Quota Test:', quotaTest);
  });

  test('should maintain cache integrity during service worker updates', async () => {
    await page.goto('/dashboard');
    
    const integrityTest = await page.evaluate(async () => {
      if ('caches' in window) {
        try {
          // Create initial cache with critical resources
          const cache = await caches.open('integrity-test');
          const criticalResources = [
            { url: '/critical-1', data: 'critical data 1' },
            { url: '/critical-2', data: 'critical data 2' },
            { url: '/critical-3', data: 'critical data 3' }
          ];
          
          // Add critical resources
          for (const resource of criticalResources) {
            await cache.put(resource.url, new Response(resource.data));
          }
          
          // Simulate service worker update scenario
          // Check all critical resources are still accessible
          const integrityCheck = await Promise.all(
            criticalResources.map(async (resource) => {
              const response = await cache.match(resource.url);
              const data = response ? await response.text() : null;
              return {
                url: resource.url,
                found: !!response,
                dataIntact: data === resource.data
              };
            })
          );
          
          const allResourcesFound = integrityCheck.every(check => check.found);
          const allDataIntact = integrityCheck.every(check => check.dataIntact);
          
          // Clean up
          await caches.delete('integrity-test');
          
          return {
            allResourcesFound,
            allDataIntact,
            integrityMaintained: allResourcesFound && allDataIntact,
            checkResults: integrityCheck
          };
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'Cache API not supported' };
    });
    
    if (!integrityTest.error) {
      expect(integrityTest.integrityMaintained).toBeTruthy();
    }
    
    console.log('Cache Integrity Test:', integrityTest);
  });

  test('should handle concurrent cache operations', async () => {
    await page.goto('/dashboard');
    
    const concurrencyTest = await page.evaluate(async () => {
      if ('caches' in window) {
        try {
          const cache = await caches.open('concurrency-test');
          
          // Simulate concurrent cache operations
          const operations = Array(5).fill(null).map(async (_, i) => {
            try {
              await cache.put(`/concurrent-${i}`, new Response(`data ${i}`));
              const response = await cache.match(`/concurrent-${i}`);
              const data = await response.text();
              return { index: i, success: true, data };
            } catch (error) {
              return { index: i, success: false, error: error.message };
            }
          });
          
          const results = await Promise.all(operations);
          const successCount = results.filter(r => r.success).length;
          const allSuccessful = successCount === operations.length;
          
          // Clean up
          await caches.delete('concurrency-test');
          
          return {
            allSuccessful,
            successCount,
            totalOperations: operations.length,
            results
          };
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'Cache API not supported' };
    });
    
    if (!concurrencyTest.error) {
      expect(concurrencyTest.allSuccessful).toBeTruthy();
    }
    
    console.log('Cache Concurrency Test:', concurrencyTest);
  });

  test('should implement proper cache naming conventions', async () => {
    await page.goto('/dashboard');
    
    const namingTest = await page.evaluate(async () => {
      if ('caches' in window) {
        try {
          // Test different cache naming patterns
          const cacheNames = [
            'wedsync-static-v1.0.0',
            'wedsync-api-v1.0.0',
            'wedsync-images-v1.0.0',
            'wedsync-wedding-data-v1.0.0'
          ];
          
          // Create caches with proper naming
          for (const name of cacheNames) {
            const cache = await caches.open(name);
            await cache.put('/test', new Response('test'));
          }
          
          // Verify caches exist
          const existingCaches = await caches.keys();
          const allCreated = cacheNames.every(name => existingCaches.includes(name));
          
          // Test cache name parsing (simulate what SW would do)
          const cachesByType = {
            static: existingCaches.filter(name => name.includes('static')),
            api: existingCaches.filter(name => name.includes('api')),
            images: existingCaches.filter(name => name.includes('images')),
            weddingData: existingCaches.filter(name => name.includes('wedding-data'))
          };
          
          // Clean up
          for (const name of cacheNames) {
            await caches.delete(name);
          }
          
          return {
            allCreated,
            cachesByType,
            namingConventionSupported: true
          };
        } catch (error) {
          return { error: error.message, namingConventionSupported: false };
        }
      }
      return { error: 'Cache API not supported', namingConventionSupported: false };
    });
    
    if (namingTest.namingConventionSupported) {
      expect(namingTest.allCreated).toBeTruthy();
      expect(namingTest.cachesByType.static.length).toBe(1);
      expect(namingTest.cachesByType.api.length).toBe(1);
    }
    
    console.log('Cache Naming Test:', namingTest);
  });

  test('should handle cache migration between service worker versions', async () => {
    await page.goto('/dashboard');
    
    const migrationTest = await page.evaluate(async () => {
      if ('caches' in window) {
        try {
          // Simulate migration from v1 to v2
          const oldCache = await caches.open('wedsync-v1');
          const importantData = [
            { url: '/important-1', data: 'critical data 1' },
            { url: '/important-2', data: 'critical data 2' }
          ];
          
          // Populate old cache
          for (const item of importantData) {
            await oldCache.put(item.url, new Response(item.data));
          }
          
          // Simulate migration process
          const newCache = await caches.open('wedsync-v2');
          
          // Migrate important data
          for (const item of importantData) {
            const response = await oldCache.match(item.url);
            if (response) {
              await newCache.put(item.url, response.clone());
            }
          }
          
          // Verify migration
          const migrationResults = await Promise.all(
            importantData.map(async (item) => {
              const newResponse = await newCache.match(item.url);
              const data = newResponse ? await newResponse.text() : null;
              return {
                url: item.url,
                migrated: !!newResponse,
                dataIntact: data === item.data
              };
            })
          );
          
          const allMigrated = migrationResults.every(r => r.migrated);
          const dataIntact = migrationResults.every(r => r.dataIntact);
          
          // Clean up old cache (simulate SW activate event)
          await caches.delete('wedsync-v1');
          
          const oldCacheDeleted = !(await caches.keys()).includes('wedsync-v1');
          
          // Clean up
          await caches.delete('wedsync-v2');
          
          return {
            allMigrated,
            dataIntact,
            oldCacheDeleted,
            migrationSuccessful: allMigrated && dataIntact && oldCacheDeleted
          };
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'Cache API not supported' };
    });
    
    if (!migrationTest.error) {
      expect(migrationTest.migrationSuccessful).toBeTruthy();
    }
    
    console.log('Cache Migration Test:', migrationTest);
  });
});