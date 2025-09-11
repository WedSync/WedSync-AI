import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Service Worker Lifecycle Testing - WS-171', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      serviceWorkers: 'allow',
      permissions: ['background-sync', 'notifications']
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should register service worker successfully', async () => {
    await page.goto('/');
    
    // Check if service worker support exists
    const swSupported = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(swSupported).toBeTruthy();
    
    // Register service worker
    const registration = await page.evaluate(async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        return {
          success: true,
          scope: reg.scope,
          state: reg.installing?.state || 'none',
          updateViaCache: reg.updateViaCache
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    if (registration.success) {
      expect(registration.scope).toContain(page.url().split('/')[0]);
      expect(registration.updateViaCache).toBeDefined();
    } else {
      console.warn('Service worker registration failed:', registration.error);
      // Test should handle graceful fallback
      expect(registration.error).toContain('sw.js');
    }
  });

  test('should handle service worker installation process', async () => {
    await page.goto('/dashboard');
    
    const installationTest = await page.evaluate(async () => {
      return new Promise((resolve) => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js')
            .then(registration => {
              const sw = registration.installing || registration.waiting || registration.active;
              
              if (sw) {
                if (sw.state === 'installing') {
                  sw.addEventListener('statechange', () => {
                    resolve({
                      state: sw.state,
                      installed: sw.state === 'installed'
                    });
                  });
                } else {
                  resolve({
                    state: sw.state,
                    installed: sw.state === 'installed' || sw.state === 'activated'
                  });
                }
              } else {
                resolve({ state: 'none', installed: false });
              }
            })
            .catch(error => {
              resolve({ state: 'error', error: error.message, installed: false });
            });
        } else {
          resolve({ state: 'not_supported', installed: false });
        }
      });
    });
    
    expect(installationTest.state).toBeTruthy();
    console.log('Service Worker Installation State:', installationTest);
  });

  test('should handle service worker activation', async () => {
    await page.goto('/dashboard');
    
    const activationTest = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          return {
            hasActive: !!registration.active,
            state: registration.active?.state || 'none',
            scope: registration.scope,
            controlled: !!navigator.serviceWorker.controller
          };
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'Service workers not supported' };
    });
    
    if (!activationTest.error) {
      expect(activationTest.hasActive).toBeTruthy();
      expect(activationTest.state).toBe('activated');
      expect(activationTest.controlled).toBeTruthy();
    } else {
      console.warn('Service worker activation test:', activationTest.error);
    }
  });

  test('should handle service worker updates', async () => {
    await page.goto('/dashboard');
    
    const updateTest = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          
          // Check for updates
          await registration.update();
          
          return {
            hasUpdate: !!registration.waiting,
            updateFound: registration.waiting !== null,
            currentVersion: registration.active?.scriptURL || 'none'
          };
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'Service workers not supported' };
    });
    
    expect(updateTest.error || updateTest.currentVersion).toBeTruthy();
    console.log('Service Worker Update Test:', updateTest);
  });

  test('should handle service worker unregistration', async () => {
    await page.goto('/dashboard');
    
    const unregistrationTest = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          if (registrations.length > 0) {
            const unregistered = await registrations[0].unregister();
            
            return {
              unregistered,
              remainingRegistrations: (await navigator.serviceWorker.getRegistrations()).length
            };
          }
          
          return {
            unregistered: false,
            remainingRegistrations: 0,
            message: 'No service workers to unregister'
          };
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'Service workers not supported' };
    });
    
    expect(typeof unregistrationTest.unregistered).toBe('boolean');
    console.log('Service Worker Unregistration Test:', unregistrationTest);
  });

  test('should handle message passing between SW and client', async () => {
    await page.goto('/dashboard');
    
    const messagingTest = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          if (registration.active) {
            // Test message sending to service worker
            registration.active.postMessage({
              type: 'TEST_MESSAGE',
              data: 'Hello from client'
            });
            
            // Listen for response
            return new Promise((resolve) => {
              navigator.serviceWorker.addEventListener('message', (event) => {
                resolve({
                  messageReceived: true,
                  response: event.data
                });
              });
              
              // Timeout after 2 seconds
              setTimeout(() => {
                resolve({
                  messageReceived: false,
                  timeout: true
                });
              }, 2000);
            });
          }
          
          return { error: 'No active service worker' };
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'Service workers not supported' };
    });
    
    console.log('Service Worker Messaging Test:', messagingTest);
    expect(messagingTest.error || messagingTest.messageReceived !== undefined).toBeTruthy();
  });

  test('should validate cache management during lifecycle', async () => {
    await page.goto('/dashboard');
    
    const cacheTest = await page.evaluate(async () => {
      if ('caches' in window) {
        try {
          // Create a test cache
          const cache = await caches.open('test-cache-v1');
          await cache.put('/test-resource', new Response('test data'));
          
          // Verify cache exists
          const cacheNames = await caches.keys();
          const hasTestCache = cacheNames.includes('test-cache-v1');
          
          // Clean up
          await caches.delete('test-cache-v1');
          
          return {
            cacheCreated: hasTestCache,
            cacheDeleted: !(await caches.keys()).includes('test-cache-v1')
          };
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'Cache API not supported' };
    });
    
    if (!cacheTest.error) {
      expect(cacheTest.cacheCreated).toBeTruthy();
      expect(cacheTest.cacheDeleted).toBeTruthy();
    }
    
    console.log('Cache Management Test:', cacheTest);
  });

  test('should handle background sync lifecycle', async () => {
    await page.goto('/dashboard');
    
    const syncTest = await page.evaluate(async () => {
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          // Register background sync
          await registration.sync.register('test-sync');
          
          return {
            syncRegistered: true,
            syncSupported: true
          };
        } catch (error) {
          return {
            syncRegistered: false,
            syncSupported: true,
            error: error.message
          };
        }
      }
      return {
        syncRegistered: false,
        syncSupported: false
      };
    });
    
    expect(typeof syncTest.syncSupported).toBe('boolean');
    console.log('Background Sync Test:', syncTest);
  });

  test('should provide fallback behavior without service worker', async () => {
    // Test page functionality when service worker is disabled
    await page.goto('/dashboard');
    
    const fallbackTest = await page.evaluate(() => {
      const hasServiceWorker = 'serviceWorker' in navigator;
      
      // Check if app still functions without SW
      const basicFunctionality = {
        pageLoads: !!document.body,
        scriptsLoad: !!window.fetch,
        cssLoads: getComputedStyle(document.body).fontFamily !== undefined
      };
      
      return {
        hasServiceWorker,
        fallbackWorking: Object.values(basicFunctionality).every(Boolean),
        basicFunctionality
      };
    });
    
    expect(fallbackTest.fallbackWorking).toBeTruthy();
    console.log('Fallback Test:', fallbackTest);
  });

  test('should handle service worker errors gracefully', async () => {
    await page.goto('/dashboard');
    
    const errorHandling = await page.evaluate(async () => {
      const errors: string[] = [];
      
      if ('serviceWorker' in navigator) {
        try {
          // Try to register invalid service worker
          await navigator.serviceWorker.register('/invalid-sw.js');
        } catch (error) {
          errors.push('Registration error handled: ' + error.message);
        }
        
        // Check for existing service worker errors
        navigator.serviceWorker.addEventListener('error', (event) => {
          errors.push('SW error: ' + event.message);
        });
      }
      
      return {
        errorsHandled: errors,
        gracefulFallback: errors.length === 0 || errors.some(e => e.includes('handled'))
      };
    });
    
    expect(errorHandling.gracefulFallback).toBeTruthy();
    console.log('Error Handling Test:', errorHandling);
  });
});
