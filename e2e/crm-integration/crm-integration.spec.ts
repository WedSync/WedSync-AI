/**
 * CRM Integration Hub E2E Tests - WS-343 Team E
 * Comprehensive end-to-end testing for CRM integration workflows
 * Includes visual regression testing and wedding industry scenarios
 */

import { test, expect, Page } from '@playwright/test';

test.describe('CRM Integration Hub E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock authenticated user session
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: {
          id: 'test-user-id',
          email: 'photographer@example.com',
          user_metadata: {
            business_name: 'Sarah Johnson Photography'
          }
        }
      }));
    });
    
    // Navigate to CRM integration dashboard
    await page.goto('/dashboard/integrations');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Provider Connection Flow', () => {
    test('OAuth flow - Tave integration', async () => {
      await test.step('Navigate to Tave integration setup', async () => {
        await page.click('[data-testid="add-integration-button"]');
        await page.click('[data-testid="provider-tave"]');
        
        // Visual regression test - Provider selection
        await expect(page).toHaveScreenshot('tave-provider-selection.png');
      });

      await test.step('Initiate OAuth flow', async () => {
        // Mock OAuth redirect to prevent external navigation
        await page.route('**/tave.com/oauth/**', route => {
          route.fulfill({
            status: 302,
            headers: { 
              'Location': '/api/crm/callback?code=mock-auth-code&state=mock-state&provider=tave' 
            }
          });
        });

        await page.click('[data-testid="connect-tave-button"]');
        
        // Wait for OAuth redirect handling
        await page.waitForURL('**/api/crm/callback**');
        
        // Should redirect back to integrations with success
        await page.waitForURL('**/dashboard/integrations**');
        await expect(page.locator('[data-testid="integration-success"]')).toBeVisible();
      });

      await test.step('Verify connection status', async () => {
        await expect(page.locator('[data-testid="tave-status"]')).toHaveText('Connected');
        await expect(page.locator('[data-testid="tave-last-sync"]')).toBeVisible();
        
        // Visual regression test - Connected state
        await expect(page).toHaveScreenshot('tave-connected-state.png');
      });
    });

    test('API key setup - HoneyBook integration', async () => {
      await test.step('Open API key configuration', async () => {
        await page.click('[data-testid="add-integration-button"]');
        await page.click('[data-testid="provider-honeybook"]');
        await page.click('[data-testid="use-api-key-method"]');
        
        // Visual regression test - API key form
        await expect(page).toHaveScreenshot('honeybook-api-key-form.png');
      });

      await test.step('Enter and validate API key', async () => {
        const apiKeyInput = page.locator('[data-testid="api-key-input"]');
        await apiKeyInput.fill('hb_live_1234567890abcdef');
        
        // Mock successful API key validation
        await page.route('**/api/crm/test-connection', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              status: 'connected',
              user: 'photographer@example.com'
            })
          });
        });
        
        await page.click('[data-testid="test-connection-button"]');
        
        // Wait for validation result
        await expect(page.locator('[data-testid="connection-status"]')).toHaveText('✅ Connected');
      });

      await test.step('Save API key configuration', async () => {
        await page.click('[data-testid="save-integration-button"]');
        
        await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
        await expect(page.locator('[data-testid="honeybook-status"]')).toHaveText('Connected');
      });
    });

    test('Error handling - Invalid credentials', async () => {
      await test.step('Attempt connection with invalid API key', async () => {
        await page.click('[data-testid="add-integration-button"]');
        await page.click('[data-testid="provider-lightblue"]');
        
        const apiKeyInput = page.locator('[data-testid="api-key-input"]');
        await apiKeyInput.fill('invalid-key-123');
        
        // Mock authentication error
        await page.route('**/api/crm/test-connection', route => {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Invalid API key',
              message: 'The provided API key is not valid'
            })
          });
        });
        
        await page.click('[data-testid="test-connection-button"]');
      });

      await test.step('Verify error handling', async () => {
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid API key');
        
        // Visual regression test - Error state
        await expect(page).toHaveScreenshot('connection-error-state.png');
        
        // Verify no sensitive data in error display
        const errorText = await page.locator('[data-testid="error-message"]').textContent();
        expect(errorText).not.toContain('invalid-key-123');
      });
    });
  });

  test.describe('Data Sync Operations', () => {
    test.beforeEach(async () => {
      // Setup connected Tave integration
      await page.evaluate(() => {
        window.localStorage.setItem('crm-integrations', JSON.stringify({
          tave: {
            status: 'connected',
            provider: 'tave',
            connected_at: new Date().toISOString(),
            last_sync: null
          }
        }));
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('Full client import - 200+ records', async () => {
      await test.step('Initiate full import', async () => {
        await page.click('[data-testid="tave-sync-button"]');
        await page.click('[data-testid="full-import-option"]');
        
        // Mock large dataset import response
        await page.route('**/api/crm/import**', route => {
          const mockClients = Array.from({ length: 200 }, (_, i) => ({
            id: `client-${i}`,
            first_name: `Sarah${i}`,
            last_name: `Johnson${i}`,
            email: `sarah${i}@example.com`,
            wedding_date: '2024-06-15',
            venue: 'Rosewood Manor'
          }));
          
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              imported: 200,
              duplicates: 5,
              errors: 0,
              clients: mockClients
            })
          });
        });
        
        await page.click('[data-testid="start-import-button"]');
      });

      await test.step('Monitor import progress', async () => {
        // Wait for progress indicator
        await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
        
        // Visual regression test - Import progress
        await expect(page).toHaveScreenshot('import-progress.png');
        
        // Wait for completion
        await expect(page.locator('[data-testid="import-complete"]')).toBeVisible({ timeout: 30000 });
      });

      await test.step('Verify import results', async () => {
        await expect(page.locator('[data-testid="imported-count"]')).toHaveText('200');
        await expect(page.locator('[data-testid="duplicates-count"]')).toHaveText('5');
        await expect(page.locator('[data-testid="errors-count"]')).toHaveText('0');
        
        // Visual regression test - Import results
        await expect(page).toHaveScreenshot('import-results.png');
      });
    });

    test('Incremental sync - New/updated clients', async () => {
      await test.step('Setup existing sync history', async () => {
        await page.evaluate(() => {
          const integrations = JSON.parse(window.localStorage.getItem('crm-integrations') || '{}');
          integrations.tave.last_sync = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          window.localStorage.setItem('crm-integrations', JSON.stringify(integrations));
        });
        
        await page.reload();
      });

      await test.step('Perform incremental sync', async () => {
        await page.click('[data-testid="tave-sync-button"]');
        await page.click('[data-testid="incremental-sync-option"]');
        
        // Mock incremental sync response
        await page.route('**/api/crm/sync**', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              sync_type: 'incremental',
              added: 5,
              updated: 8,
              deleted: 2,
              since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            })
          });
        });
        
        await page.click('[data-testid="start-sync-button"]');
      });

      await test.step('Verify incremental sync results', async () => {
        await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
        await expect(page.locator('[data-testid="added-count"]')).toHaveText('5');
        await expect(page.locator('[data-testid="updated-count"]')).toHaveText('8');
        await expect(page.locator('[data-testid="deleted-count"]')).toHaveText('2');
      });
    });

    test('Field mapping validation', async () => {
      await test.step('Open field mapping interface', async () => {
        await page.click('[data-testid="tave-settings-button"]');
        await page.click('[data-testid="field-mapping-tab"]');
        
        // Visual regression test - Field mapping interface
        await expect(page).toHaveScreenshot('field-mapping-interface.png');
      });

      await test.step('Customize field mappings', async () => {
        // Test wedding industry specific mappings
        const mappings = [
          { source: 'client_name', target: 'display_name' },
          { source: 'shoot_date', target: 'wedding_date' },
          { source: 'location', target: 'venue' },
          { source: 'guest_total', target: 'guest_count' }
        ];
        
        for (const mapping of mappings) {
          await page.selectOption(`[data-testid="field-${mapping.source}"]`, mapping.target);
        }
        
        // Visual regression test - Configured mappings
        await expect(page).toHaveScreenshot('field-mapping-configured.png');
      });

      await test.step('Test mapping preview', async () => {
        await page.click('[data-testid="preview-mapping-button"]');
        
        // Mock sample data preview
        await page.route('**/api/crm/preview-mapping**', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              preview: [
                {
                  source: { client_name: 'Sarah & Michael Johnson', shoot_date: '2024-06-15' },
                  mapped: { display_name: 'Sarah & Michael Johnson', wedding_date: '2024-06-15' }
                }
              ]
            })
          });
        });
        
        await expect(page.locator('[data-testid="mapping-preview"]')).toBeVisible();
        await expect(page.locator('[data-testid="preview-display-name"]')).toHaveText('Sarah & Michael Johnson');
        await expect(page.locator('[data-testid="preview-wedding-date"]')).toHaveText('2024-06-15');
      });

      await test.step('Save field mapping configuration', async () => {
        await page.click('[data-testid="save-mappings-button"]');
        await expect(page.locator('[data-testid="mappings-saved"]')).toBeVisible();
      });
    });
  });

  test.describe('Error Scenarios and Recovery', () => {
    test('Network failure during import', async () => {
      await test.step('Simulate network failure', async () => {
        await page.click('[data-testid="tave-sync-button"]');
        await page.click('[data-testid="full-import-option"]');
        
        // Mock network failure after partial import
        let callCount = 0;
        await page.route('**/api/crm/import**', route => {
          callCount++;
          if (callCount === 1) {
            // First call succeeds with partial data
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                success: true,
                imported: 47,
                total: 200,
                partial: true,
                continue_token: 'partial-import-token-123'
              })
            });
          } else {
            // Subsequent calls fail
            route.abort('failed');
          }
        });
        
        await page.click('[data-testid="start-import-button"]');
      });

      await test.step('Handle network error gracefully', async () => {
        await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="partial-progress"]')).toHaveText('47 / 200');
        
        // Visual regression test - Network error state
        await expect(page).toHaveScreenshot('network-error-recovery.png');
        
        // Verify retry button is available
        await expect(page.locator('[data-testid="retry-import-button"]')).toBeVisible();
      });

      await test.step('Retry and complete import', async () => {
        // Mock successful retry
        await page.route('**/api/crm/import**', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              imported: 153, // Remaining clients
              total: 200,
              recovered_from_token: 'partial-import-token-123',
              complete: true
            })
          });
        });
        
        await page.click('[data-testid="retry-import-button"]');
        
        await expect(page.locator('[data-testid="import-complete"]')).toBeVisible();
        await expect(page.locator('[data-testid="total-imported"]')).toHaveText('200');
      });
    });

    test('Rate limiting handling', async () => {
      await test.step('Trigger rate limit', async () => {
        await page.click('[data-testid="honeybook-sync-button"]');
        
        // Mock rate limit response
        await page.route('**/api/crm/import**', route => {
          route.fulfill({
            status: 429,
            headers: { 'Retry-After': '60' },
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Rate limit exceeded',
              retry_after: 60,
              message: 'HoneyBook API limit: 100 calls per minute'
            })
          });
        });
        
        await page.click('[data-testid="start-import-button"]');
      });

      await test.step('Display rate limit message', async () => {
        await expect(page.locator('[data-testid="rate-limit-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="rate-limit-message"]')).toContainText('Rate limit exceeded');
        await expect(page.locator('[data-testid="retry-countdown"]')).toBeVisible();
        
        // Visual regression test - Rate limit warning
        await expect(page).toHaveScreenshot('rate-limit-warning.png');
      });
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test.beforeEach(async ({ browser }) => {
      // Test on mobile viewport
      page = await browser.newPage({
        viewport: { width: 375, height: 667 } // iPhone SE size
      });
      
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'mock-token',
          user: { id: 'test-user-id', email: 'photographer@example.com' }
        }));
      });
      
      await page.goto('/dashboard/integrations');
      await page.waitForLoadState('networkidle');
    });

    test('Mobile navigation and touch interactions', async () => {
      // Visual regression test - Mobile layout
      await expect(page).toHaveScreenshot('mobile-integrations-dashboard.png');
      
      // Test touch-friendly buttons
      await page.tap('[data-testid="add-integration-button"]');
      await expect(page.locator('[data-testid="provider-grid"]')).toBeVisible();
      
      // Visual regression test - Mobile provider selection
      await expect(page).toHaveScreenshot('mobile-provider-selection.png');
      
      // Test swipe gestures for provider cards
      await page.tap('[data-testid="provider-tave"]');
      await expect(page.locator('[data-testid="tave-config-panel"]')).toBeVisible();
    });

    test('Mobile field mapping interface', async () => {
      // Setup connected integration
      await page.evaluate(() => {
        window.localStorage.setItem('crm-integrations', JSON.stringify({
          tave: { status: 'connected', provider: 'tave' }
        }));
      });
      
      await page.reload();
      await page.tap('[data-testid="tave-settings-button"]');
      await page.tap('[data-testid="field-mapping-tab"]');
      
      // Visual regression test - Mobile field mapping
      await expect(page).toHaveScreenshot('mobile-field-mapping.png');
      
      // Test dropdown interactions on mobile
      await page.tap('[data-testid="field-client_name"]');
      await expect(page.locator('[data-testid="field-options"]')).toBeVisible();
    });
  });

  test.describe('Performance Testing', () => {
    test('Large dataset import performance', async () => {
      await test.step('Monitor import performance metrics', async () => {
        // Setup performance monitoring
        const performanceMetrics: any[] = [];
        
        page.on('response', response => {
          if (response.url().includes('/api/crm/import')) {
            performanceMetrics.push({
              url: response.url(),
              status: response.status(),
              timing: Date.now()
            });
          }
        });
        
        await page.click('[data-testid="tave-sync-button"]');
        await page.click('[data-testid="full-import-option"]');
        
        // Mock performance-test dataset
        await page.route('**/api/crm/import**', async route => {
          // Simulate processing time for large dataset
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              imported: 1000,
              processing_time: 2000,
              memory_used: '45MB',
              records_per_second: 500
            })
          });
        });
        
        const startTime = Date.now();
        await page.click('[data-testid="start-import-button"]');
        await expect(page.locator('[data-testid="import-complete"]')).toBeVisible({ timeout: 30000 });
        const totalTime = Date.now() - startTime;
        
        // Verify performance requirements
        expect(totalTime).toBeLessThan(30000); // Must complete within 30 seconds
        expect(performanceMetrics.length).toBeGreaterThan(0);
      });
    });

    test('Concurrent sync operations performance', async () => {
      // Setup multiple connected integrations
      await page.evaluate(() => {
        window.localStorage.setItem('crm-integrations', JSON.stringify({
          tave: { status: 'connected', provider: 'tave' },
          honeybook: { status: 'connected', provider: 'honeybook' },
          lightblue: { status: 'connected', provider: 'lightblue' }
        }));
      });
      
      await page.reload();
      
      // Start concurrent sync operations
      const syncPromises = [
        page.click('[data-testid="tave-sync-button"]').then(() => page.click('[data-testid="start-sync-button"]')),
        page.click('[data-testid="honeybook-sync-button"]').then(() => page.click('[data-testid="start-sync-button"]')),
        page.click('[data-testid="lightblue-sync-button"]').then(() => page.click('[data-testid="start-sync-button"]'))
      ];
      
      // Mock concurrent responses
      await page.route('**/api/crm/sync**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            sync_type: 'concurrent',
            imported: 50
          })
        });
      });
      
      await Promise.all(syncPromises);
      
      // Verify all syncs complete successfully
      await expect(page.locator('[data-testid="tave-status"]')).toHaveText('Synced');
      await expect(page.locator('[data-testid="honeybook-status"]')).toHaveText('Synced');
      await expect(page.locator('[data-testid="lightblue-status"]')).toHaveText('Synced');
    });
  });

  test.describe('Accessibility Testing', () => {
    test('Keyboard navigation and screen reader support', async () => {
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="add-integration-button"]')).toBeFocused();
      
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="provider-grid"]')).toBeVisible();
      
      // Test ARIA labels and roles
      const addButton = page.locator('[data-testid="add-integration-button"]');
      await expect(addButton).toHaveAttribute('role', 'button');
      await expect(addButton).toHaveAttribute('aria-label');
      
      // Test high contrast mode compatibility
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect(page).toHaveScreenshot('high-contrast-mode.png');
    });
  });
});

// Test utility functions
async function waitForImportCompletion(page: Page, timeout = 30000) {
  await expect(page.locator('[data-testid="import-complete"]')).toBeVisible({ timeout });
}

async function verifyWeddingDataIntegrity(page: Page) {
  const clientData = await page.locator('[data-testid="client-preview"]').first();
  
  // Verify wedding industry fields are present
  await expect(clientData.locator('[data-testid="wedding-date"]')).toBeVisible();
  await expect(clientData.locator('[data-testid="venue"]')).toBeVisible();
  await expect(clientData.locator('[data-testid="guest-count"]')).toBeVisible();
}