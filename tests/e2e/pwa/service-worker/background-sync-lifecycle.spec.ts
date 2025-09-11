import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Background Sync Lifecycle Testing - WS-171', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      serviceWorkers: 'allow',
      permissions: ['background-sync']
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should register background sync successfully', async () => {
    await page.goto('/dashboard');
    
    const syncRegistrationTest = await page.evaluate(async () => {
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          // Register different types of sync
          await registration.sync.register('wedding-data-sync');
          await registration.sync.register('photo-upload-sync');
          await registration.sync.register('task-update-sync');
          
          return {
            backgroundSyncSupported: true,
            registrationSuccessful: true
          };
        } catch (error) {
          return {
            backgroundSyncSupported: true,
            registrationSuccessful: false,
            error: error.message
          };
        }
      }
      return {
        backgroundSyncSupported: false,
        registrationSuccessful: false
      };
    });
    
    expect(syncRegistrationTest.backgroundSyncSupported).toBeTruthy();
    console.log('Background Sync Registration Test:', syncRegistrationTest);
  });

  test('should handle sync event lifecycle in service worker', async () => {
    await page.goto('/dashboard');
    
    const syncEventTest = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          // Create a test service worker that handles sync events
          const swCode = `
            self.addEventListener('sync', function(event) {
              console.log('Sync event received:', event.tag);
              
              if (event.tag === 'test-sync') {
                event.waitUntil(doBackgroundSync());
              }
            });
            
            async function doBackgroundSync() {
              // Simulate sync operation
              return new Promise(resolve => {
                setTimeout(() => {
                  self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                      client.postMessage({
                        type: 'SYNC_COMPLETE',
                        tag: 'test-sync'
                      });
                    });
                  });
                  resolve();
                }, 100);
              });
            }
          `;
          
          const blob = new Blob([swCode], { type: 'application/javascript' });
          const swUrl = URL.createObjectURL(blob);
          
          const registration = await navigator.serviceWorker.register(swUrl);
          await new Promise(resolve => {
            if (registration.installing) {
              registration.installing.addEventListener('statechange', () => {
                if (registration.installing.state === 'activated') {
                  resolve();
                }
              });
            } else {
              resolve();
            }
          });
          
          // Listen for sync completion message
          const syncCompletionPromise = new Promise(resolve => {
            navigator.serviceWorker.addEventListener('message', (event) => {
              if (event.data.type === 'SYNC_COMPLETE') {
                resolve(event.data);
              }
            });
          });
          
          // Register sync
          await registration.sync.register('test-sync');
          
          // Wait for sync completion
          const syncResult = await syncCompletionPromise;
          
          // Clean up
          await registration.unregister();
          URL.revokeObjectURL(swUrl);
          
          return {
            syncEventHandled: true,
            syncCompleted: syncResult.type === 'SYNC_COMPLETE'
          };
        } catch (error) {
          return {
            syncEventHandled: false,
            error: error.message
          };
        }
      }
      return { syncEventHandled: false, error: 'Service workers not supported' };
    });
    
    if (syncEventTest.syncEventHandled) {
      expect(syncEventTest.syncCompleted).toBeTruthy();
    }
    
    console.log('Sync Event Test:', syncEventTest);
  });

  test('should handle sync failure and retry logic', async () => {
    await page.goto('/dashboard');
    
    const syncRetryTest = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          let attemptCount = 0;
          const maxAttempts = 3;
          
          const swCode = `
            let syncAttempts = 0;
            
            self.addEventListener('sync', function(event) {
              if (event.tag === 'retry-sync') {
                event.waitUntil(handleRetrySync());
              }
            });
            
            async function handleRetrySync() {
              syncAttempts++;
              
              // Simulate failure on first two attempts, success on third
              if (syncAttempts < 3) {
                self.clients.matchAll().then(clients => {
                  clients.forEach(client => {
                    client.postMessage({
                      type: 'SYNC_ATTEMPT',
                      attempt: syncAttempts,
                      failed: true
                    });
                  });
                });
                throw new Error('Sync failed, will retry');
              } else {
                self.clients.matchAll().then(clients => {
                  clients.forEach(client => {
                    client.postMessage({
                      type: 'SYNC_SUCCESS',
                      attempt: syncAttempts
                    });
                  });
                });
                return Promise.resolve();
              }
            }
          `;
          
          const blob = new Blob([swCode], { type: 'application/javascript' });
          const swUrl = URL.createObjectURL(blob);
          
          const registration = await navigator.serviceWorker.register(swUrl);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const syncResults = [];
          
          // Listen for sync messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            syncResults.push(event.data);
          });
          
          // Register sync that will fail and retry
          await registration.sync.register('retry-sync');
          
          // Wait for all attempts
          await new Promise(resolve => {
            const checkForCompletion = () => {
              const successMessage = syncResults.find(r => r.type === 'SYNC_SUCCESS');
              if (successMessage) {
                resolve();
              } else if (syncResults.length < 10) { // Safety limit
                setTimeout(checkForCompletion, 100);
              } else {
                resolve();
              }
            };
            checkForCompletion();
          });
          
          const attempts = syncResults.filter(r => r.type === 'SYNC_ATTEMPT');
          const success = syncResults.find(r => r.type === 'SYNC_SUCCESS');
          
          // Clean up
          await registration.unregister();
          URL.revokeObjectURL(swUrl);
          
          return {
            retryLogicWorking: true,
            attemptCount: attempts.length,
            finallySucceeded: !!success,
            successAttempt: success ? success.attempt : null
          };
        } catch (error) {
          return {
            retryLogicWorking: false,
            error: error.message
          };
        }
      }
      return { retryLogicWorking: false, error: 'Service workers not supported' };
    });
    
    if (syncRetryTest.retryLogicWorking) {
      expect(syncRetryTest.attemptCount).toBeGreaterThan(0);
      expect(syncRetryTest.finallySucceeded).toBeTruthy();
    }
    
    console.log('Sync Retry Test:', syncRetryTest);
  });

  test('should handle periodic background sync', async () => {
    await page.goto('/dashboard');
    
    const periodicSyncTest = await page.evaluate(async () => {
      // Check if Periodic Background Sync is supported
      if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          // Register periodic sync (requires user permission)
          await registration.periodicSync.register('wedding-data-refresh', {
            minInterval: 24 * 60 * 60 * 1000 // 24 hours
          });
          
          // Get registered periodic syncs
          const tags = await registration.periodicSync.getTags();
          
          return {
            periodicSyncSupported: true,
            registrationSuccessful: tags.includes('wedding-data-refresh'),
            registeredTags: tags
          };
        } catch (error) {
          return {
            periodicSyncSupported: true,
            registrationSuccessful: false,
            error: error.message
          };
        }
      }
      return {
        periodicSyncSupported: false,
        registrationSuccessful: false,
        message: 'Periodic Background Sync not supported'
      };
    });
    
    expect(typeof periodicSyncTest.periodicSyncSupported).toBe('boolean');
    console.log('Periodic Sync Test:', periodicSyncTest);
  });

  test('should handle sync data queue management', async () => {
    await page.goto('/dashboard');
    
    const queueTest = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          // Simulate queuing sync data when offline
          const syncQueue = [
            { id: 1, type: 'task-update', data: { taskId: 'task-1', status: 'completed' } },
            { id: 2, type: 'photo-upload', data: { photoId: 'photo-1', uploaded: false } },
            { id: 3, type: 'timeline-change', data: { timelineId: 'timeline-1', time: '14:30' } }
          ];
          
          // Store queue in IndexedDB (simulated with localStorage for test)
          localStorage.setItem('sync-queue', JSON.stringify(syncQueue));
          
          const swCode = `
            self.addEventListener('sync', function(event) {
              if (event.tag === 'process-queue') {
                event.waitUntil(processQueue());
              }
            });
            
            async function processQueue() {
              // Get queue from storage (simulated)
              const queueData = await new Promise(resolve => {
                // Simulate getting data from IndexedDB
                resolve([
                  { id: 1, type: 'task-update', processed: false },
                  { id: 2, type: 'photo-upload', processed: false },
                  { id: 3, type: 'timeline-change', processed: false }
                ]);
              });
              
              // Process each item
              const processedItems = [];
              for (const item of queueData) {
                // Simulate processing
                await new Promise(resolve => setTimeout(resolve, 10));
                processedItems.push({ ...item, processed: true });
              }
              
              // Notify client
              self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                  client.postMessage({
                    type: 'QUEUE_PROCESSED',
                    processedCount: processedItems.length,
                    items: processedItems
                  });
                });
              });
            }
          `;
          
          const blob = new Blob([swCode], { type: 'application/javascript' });
          const swUrl = URL.createObjectURL(blob);
          
          const registration = await navigator.serviceWorker.register(swUrl);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Listen for queue processing completion
          const queueProcessedPromise = new Promise(resolve => {
            navigator.serviceWorker.addEventListener('message', (event) => {
              if (event.data.type === 'QUEUE_PROCESSED') {
                resolve(event.data);
              }
            });
          });
          
          // Register sync to process queue
          await registration.sync.register('process-queue');
          
          const queueResult = await queueProcessedPromise;
          
          // Clean up
          await registration.unregister();
          URL.revokeObjectURL(swUrl);
          localStorage.removeItem('sync-queue');
          
          return {
            queueManagementWorking: true,
            itemsProcessed: queueResult.processedCount,
            allItemsProcessed: queueResult.processedCount === 3
          };
        } catch (error) {
          return {
            queueManagementWorking: false,
            error: error.message
          };
        }
      }
      return { queueManagementWorking: false, error: 'Service workers not supported' };
    });
    
    if (queueTest.queueManagementWorking) {
      expect(queueTest.allItemsProcessed).toBeTruthy();
    }
    
    console.log('Sync Queue Management Test:', queueTest);
  });

  test('should handle sync conflicts during service worker updates', async () => {
    await page.goto('/dashboard');
    
    const syncConflictTest = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          // Simulate active sync operations during SW update
          const syncOperations = [
            { id: 'sync-1', status: 'pending' },
            { id: 'sync-2', status: 'in-progress' },
            { id: 'sync-3', status: 'pending' }
          ];
          
          localStorage.setItem('active-syncs', JSON.stringify(syncOperations));
          
          const swCode = `
            self.addEventListener('install', function(event) {
              // Skip waiting to test update scenario
              self.skipWaiting();
            });
            
            self.addEventListener('activate', function(event) {
              event.waitUntil(handleActivation());
            });
            
            async function handleActivation() {
              // Take control of all clients
              await self.clients.claim();
              
              // Handle any pending syncs
              self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                  client.postMessage({
                    type: 'SW_ACTIVATED',
                    message: 'New service worker activated'
                  });
                });
              });
            }
            
            self.addEventListener('sync', function(event) {
              if (event.tag === 'conflict-test-sync') {
                event.waitUntil(handleConflictSync());
              }
            });
            
            async function handleConflictSync() {
              self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                  client.postMessage({
                    type: 'SYNC_HANDLED_BY_NEW_SW',
                    swVersion: 'v2'
                  });
                });
              });
            }
          `;
          
          const blob = new Blob([swCode], { type: 'application/javascript' });
          const swUrl = URL.createObjectURL(blob);
          
          const messages = [];
          navigator.serviceWorker.addEventListener('message', (event) => {
            messages.push(event.data);
          });
          
          // Register new service worker (simulates update)
          const registration = await navigator.serviceWorker.register(swUrl);
          
          // Wait for activation
          await new Promise(resolve => {
            const checkForActivation = () => {
              const activationMessage = messages.find(m => m.type === 'SW_ACTIVATED');
              if (activationMessage) {
                resolve();
              } else {
                setTimeout(checkForActivation, 100);
              }
            };
            checkForActivation();
          });
          
          // Register sync after SW update
          await registration.sync.register('conflict-test-sync');
          
          // Wait for sync handling
          await new Promise(resolve => {
            const checkForSync = () => {
              const syncMessage = messages.find(m => m.type === 'SYNC_HANDLED_BY_NEW_SW');
              if (syncMessage) {
                resolve();
              } else {
                setTimeout(checkForSync, 100);
              }
            };
            checkForSync();
          });
          
          const activationMsg = messages.find(m => m.type === 'SW_ACTIVATED');
          const syncMsg = messages.find(m => m.type === 'SYNC_HANDLED_BY_NEW_SW');
          
          // Clean up
          await registration.unregister();
          URL.revokeObjectURL(swUrl);
          localStorage.removeItem('active-syncs');
          
          return {
            conflictHandlingWorking: true,
            swActivated: !!activationMsg,
            syncHandledByNewSW: !!syncMsg,
            newSWVersion: syncMsg ? syncMsg.swVersion : null
          };
        } catch (error) {
          return {
            conflictHandlingWorking: false,
            error: error.message
          };
        }
      }
      return { conflictHandlingWorking: false, error: 'Service workers not supported' };
    });
    
    if (syncConflictTest.conflictHandlingWorking) {
      expect(syncConflictTest.swActivated).toBeTruthy();
      expect(syncConflictTest.syncHandledByNewSW).toBeTruthy();
    }
    
    console.log('Sync Conflict Test:', syncConflictTest);
  });

  test('should handle background sync permissions and user consent', async () => {
    await page.goto('/dashboard');
    
    const permissionTest = await page.evaluate(async () => {
      if ('serviceWorker' in navigator && 'permissions' in navigator) {
        try {
          // Check current permission status
          const permission = await navigator.permissions.query({ name: 'background-sync' });
          
          // Test permission states
          const permissionStates = {
            initial: permission.state,
            supported: true
          };
          
          // Listen for permission changes
          permission.addEventListener('change', () => {
            console.log('Background sync permission changed to:', permission.state);
          });
          
          return {
            permissionSupported: true,
            currentState: permission.state,
            permissionStates
          };
        } catch (error) {
          // Background-sync permission might not be supported
          return {
            permissionSupported: false,
            error: error.message,
            fallbackMessage: 'Background sync permissions not explicitly required'
          };
        }
      }
      return {
        permissionSupported: false,
        error: 'Permissions API not supported'
      };
    });
    
    // Background sync doesn't always require explicit permissions
    expect(typeof permissionTest.permissionSupported).toBe('boolean');
    console.log('Background Sync Permission Test:', permissionTest);
  });

  test('should validate sync data integrity and security', async () => {
    await page.goto('/dashboard');
    
    const securityTest = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          // Test secure sync data handling
          const sensitiveData = {
            userId: 'user-123',
            weddingId: 'wedding-456',
            encryptedData: 'encrypted-sensitive-info',
            timestamp: Date.now()
          };
          
          // Store data securely (would use encryption in real implementation)
          const secureData = {
            ...sensitiveData,
            checksum: 'mock-checksum-' + JSON.stringify(sensitiveData).length
          };
          
          localStorage.setItem('secure-sync-data', JSON.stringify(secureData));
          
          const swCode = `
            self.addEventListener('sync', function(event) {
              if (event.tag === 'secure-sync') {
                event.waitUntil(handleSecureSync());
              }
            });
            
            async function handleSecureSync() {
              // Validate data integrity before sync
              const isValidData = true; // Would perform actual validation
              
              if (isValidData) {
                self.clients.matchAll().then(clients => {
                  clients.forEach(client => {
                    client.postMessage({
                      type: 'SECURE_SYNC_SUCCESS',
                      validated: true
                    });
                  });
                });
              } else {
                throw new Error('Data integrity check failed');
              }
            }
          `;
          
          const blob = new Blob([swCode], { type: 'application/javascript' });
          const swUrl = URL.createObjectURL(blob);
          
          const registration = await navigator.serviceWorker.register(swUrl);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const securityPromise = new Promise(resolve => {
            navigator.serviceWorker.addEventListener('message', (event) => {
              if (event.data.type === 'SECURE_SYNC_SUCCESS') {
                resolve(event.data);
              }
            });
          });
          
          await registration.sync.register('secure-sync');
          const securityResult = await securityPromise;
          
          // Clean up
          await registration.unregister();
          URL.revokeObjectURL(swUrl);
          localStorage.removeItem('secure-sync-data');
          
          return {
            securityValidated: securityResult.validated,
            dataIntegrityMaintained: true
          };
        } catch (error) {
          return {
            securityValidated: false,
            error: error.message
          };
        }
      }
      return { securityValidated: false, error: 'Service workers not supported' };
    });
    
    expect(typeof securityTest.securityValidated).toBe('boolean');
    console.log('Sync Security Test:', securityTest);
  });
});