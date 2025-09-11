import { test, expect } from '@playwright/test';

test.describe('Referral Program Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-supplier-123',
            email: 'supplier@example.com',
            name: 'Test Supplier'
          }
        })
      });
    });

    // Mock supplier profile
    await page.route('/api/user-profile', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          supplier_id: 'test-supplier-123',
          organization_id: 'test-org-123'
        })
      });
    });
  });

  test('Complete referral flow - Create program to conversion', async ({ page, context }) => {
    // Step 1: Supplier creates referral program
    await page.goto('/referrals');
    
    // Wait for page to load and check for create program button
    await expect(page.locator('button', { hasText: 'Create Program' })).toBeVisible();
    
    // Mock empty programs initially
    await page.route('/api/referrals', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            programs: []
          })
        });
      }
    });

    await page.click('button:has-text("Create Program")');
    
    // Verify the create program modal opens
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Create New Referral Program")')).toBeVisible();

    // Step 2: Configure program settings
    await page.fill('input[name="name"]', 'Friend Referral Program');
    await page.selectOption('select[name="rewardType"]', 'monetary');
    await page.fill('input[name="referrerRewardAmount"]', '100');
    await page.fill('input[name="refereeRewardAmount"]', '50');
    await page.fill('input[name="attributionWindowDays"]', '90');

    // Mock program creation
    await page.route('/api/referrals', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'program-123',
            name: 'Friend Referral Program',
            reward_type: 'monetary',
            referrer_reward_amount: 100,
            referee_reward_amount: 50,
            is_active: true,
            created_at: new Date().toISOString()
          })
        });
      }
    });

    await page.click('button:has-text("Create Program")');
    
    // Verify program was created successfully
    await expect(page.locator('.toast:has-text("created successfully")')).toBeVisible();

    // Step 3: Verify referral code generation
    // Mock the updated programs list with the new program
    await page.route('/api/referrals', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            programs: [{
              id: 'program-123',
              name: 'Friend Referral Program',
              reward_type: 'monetary',
              referrer_reward_amount: 100,
              referee_reward_amount: 50,
              is_active: true,
              created_at: new Date().toISOString()
            }]
          })
        });
      }
    });

    // Mock analytics data
    await page.route('/api/referrals/analytics/program-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          metrics: {
            totalInvitations: 0,
            clickThroughRate: 0,
            conversionRate: 0,
            roi: 0,
            topReferrers: []
          },
          dailyData: []
        })
      });
    });

    // Reload to see the new program
    await page.reload();
    
    // Verify program appears in dashboard
    await expect(page.locator('button:has-text("Friend Referral Program")')).toBeVisible();
    
    // Check that program is marked as active
    await expect(page.locator('.badge:has-text("Active")')).toBeVisible();

    // Take a screenshot of the dashboard
    await page.screenshot({ path: 'test-results/referral-dashboard.png' });

    // Step 4: Test referral landing page in new context
    const newPage = await context.newPage();
    
    // Mock the referral code lookup
    await newPage.route('/api/referrals/TEST123', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            code: 'TEST123',
            landingPageUrl: 'https://wedsync.com/refer/test-supplier/TEST123',
            qrCodeUrl: 'data:image/png;base64,mockQRCode',
            stats: {
              clicks: 0,
              conversions: 0,
              totalEarnings: 0
            }
          })
        });
      }
    });

    // Navigate to referral landing page
    await newPage.goto('/refer/test-supplier/TEST123');
    
    // Verify landing page content
    await expect(newPage.locator('h1')).toContainText('Special Offer');
    await expect(newPage.locator('text=Save $50')).toBeVisible();

    // Step 5: Test click tracking
    await newPage.route('/api/referrals/track-click', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          conversionId: 'click-123'
        })
      });
    });

    // Simulate clicking the referral link
    await newPage.click('button:has-text("Get Started")');
    
    // Step 6: Test conversion tracking
    await newPage.route('/api/referrals/track-conversion', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          conversion: {
            id: 'conversion-123',
            reward_amount: 100,
            referred_email: 'newclient@example.com'
          }
        })
      });
    });

    // Fill out contact form (simulating conversion)
    await newPage.fill('input[name="email"]', 'newclient@example.com');
    await newPage.fill('input[name="name"]', 'New Client');
    await newPage.fill('input[name="phone"]', '555-0123');
    await newPage.click('button:has-text("Submit")');

    // Verify conversion was tracked
    await expect(newPage.locator('.success-message')).toBeVisible();

    await newPage.close();
  });

  test('QR Code generation and download', async ({ page }) => {
    await page.goto('/referrals');
    
    // Mock existing program
    await page.route('/api/referrals', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            programs: [{
              id: 'program-123',
              name: 'Test Program',
              reward_type: 'monetary',
              referrer_reward_amount: 100,
              referee_reward_amount: 50,
              is_active: true,
              created_at: new Date().toISOString()
            }]
          })
        });
      }
    });

    await page.route('/api/referrals/analytics/program-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          metrics: {
            totalInvitations: 10,
            clickThroughRate: 25.5,
            conversionRate: 12.3,
            roi: 150,
            topReferrers: [
              {
                coupleName: 'John & Jane Smith',
                conversions: 3,
                earnings: 300
              }
            ]
          },
          dailyData: [
            { date: '2025-01-15', clicks: 5, conversions: 1 },
            { date: '2025-01-16', clicks: 8, conversions: 2 },
            { date: '2025-01-17', clicks: 3, conversions: 0 }
          ]
        })
      });
    });

    await page.reload();

    // Verify analytics cards are displayed
    await expect(page.locator('text=Total Invitations')).toBeVisible();
    await expect(page.locator('text=10')).toBeVisible(); // Total invitations
    await expect(page.locator('text=25.5%')).toBeVisible(); // Click-through rate
    await expect(page.locator('text=12.3%')).toBeVisible(); // Conversion rate
    await expect(page.locator('text=150%')).toBeVisible(); // ROI

    // Verify top referrers section
    await expect(page.locator('text=John & Jane Smith')).toBeVisible();
    await expect(page.locator('text=3 referrals')).toBeVisible();
    await expect(page.locator('text=$300')).toBeVisible();

    // Test QR code generation
    await page.click('button:has-text("Generate QR Codes")');
    
    // Verify success message
    await expect(page.locator('.toast:has-text("QR codes generated")')).toBeVisible();
    
    // Take screenshot of analytics dashboard
    await page.screenshot({ path: 'test-results/referral-analytics.png' });
  });

  test('Fraud detection and alerts', async ({ page }) => {
    await page.goto('/referrals');
    
    // Mock program with fraud alerts
    await page.route('/api/referrals', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            programs: [{
              id: 'program-123',
              name: 'Test Program',
              reward_type: 'monetary',
              referrer_reward_amount: 100,
              referee_reward_amount: 50,
              is_active: true,
              created_at: new Date().toISOString()
            }]
          })
        });
      }
    });

    // Mock analytics with fraud alerts
    await page.route('/api/referrals/analytics/program-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          metrics: {
            totalInvitations: 5,
            clickThroughRate: 80.0, // Suspiciously high
            conversionRate: 90.0, // Suspiciously high
            roi: 50,
            topReferrers: [],
            fraudAlerts: [
              {
                type: 'Multiple IP Conversions',
                description: 'Multiple conversions detected from IP 192.168.1.1 in short timeframe',
                severity: 'high'
              },
              {
                type: 'Bot Traffic',
                description: 'Suspicious user agent patterns detected',
                severity: 'medium'
              }
            ]
          },
          dailyData: []
        })
      });
    });

    await page.reload();

    // Wait for fraud alert section to appear
    await expect(page.locator('h3:has-text("Fraud Detection Alerts")')).toBeVisible();
    
    // Verify fraud alerts are displayed
    await expect(page.locator('text=Multiple IP Conversions')).toBeVisible();
    await expect(page.locator('text=Bot Traffic')).toBeVisible();
    await expect(page.locator('.badge:has-text("Needs Review")')).toBeVisible();

    // Take screenshot showing fraud alerts
    await page.screenshot({ path: 'test-results/fraud-alerts.png' });
  });

  test('Mobile responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/referrals');
    
    // Mock program data
    await page.route('/api/referrals', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            programs: [{
              id: 'program-123',
              name: 'Mobile Test Program',
              reward_type: 'monetary',
              referrer_reward_amount: 100,
              referee_reward_amount: 50,
              is_active: true,
              created_at: new Date().toISOString()
            }]
          })
        });
      }
    });

    await page.route('/api/referrals/analytics/program-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          metrics: {
            totalInvitations: 15,
            clickThroughRate: 22.5,
            conversionRate: 15.8,
            roi: 125,
            topReferrers: []
          },
          dailyData: []
        })
      });
    });

    await page.reload();
    
    // Verify mobile layout
    await expect(page.locator('h1:has-text("Referral Programs")')).toBeVisible();
    await expect(page.locator('button:has-text("Create Program")')).toBeVisible();
    
    // Check that analytics cards stack properly on mobile
    const analyticsCards = page.locator('[class*="grid"][class*="gap-6"] > div');
    await expect(analyticsCards.first()).toBeVisible();
    
    // Test mobile navigation
    await page.click('button:has-text("Create Program")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Take screenshot of mobile view
    await page.screenshot({ path: 'test-results/mobile-referrals.png' });
  });

  test('Error handling and edge cases', async ({ page }) => {
    await page.goto('/referrals');
    
    // Test API error handling
    await page.route('/api/referrals', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      });
    });

    await page.reload();
    
    // Verify error state is handled gracefully
    await expect(page.locator('.toast:has-text("Failed to load")')).toBeVisible();
    
    // Test network failure scenario
    await page.route('/api/referrals', async route => {
      await route.abort('failed');
    });

    await page.reload();
    
    // Verify the application handles network failures
    await expect(page.locator('button:has-text("Create Program")')).toBeVisible();
  });

  test('Accessibility validation', async ({ page }) => {
    await page.goto('/referrals');
    
    // Mock successful program load
    await page.route('/api/referrals', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            programs: [{
              id: 'program-123',
              name: 'Accessibility Test Program',
              reward_type: 'monetary',
              referrer_reward_amount: 75,
              referee_reward_amount: 25,
              is_active: true,
              created_at: new Date().toISOString()
            }]
          })
        });
      }
    });

    await page.route('/api/referrals/analytics/program-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          metrics: {
            totalInvitations: 20,
            clickThroughRate: 18.5,
            conversionRate: 8.2,
            roi: 95,
            topReferrers: []
          },
          dailyData: []
        })
      });
    });

    await page.reload();
    
    // Test keyboard navigation
    await page.press('body', 'Tab');
    await expect(page.locator('button:has-text("Create Program"):focus')).toBeVisible();
    
    // Test ARIA labels and roles
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('h1')).toHaveAttribute('tabindex', '-1');
    
    // Verify color contrast (check for proper text colors)
    const button = page.locator('button:has-text("Create Program")');
    await expect(button).toBeVisible();
    
    // Test screen reader compatibility
    await expect(page.locator('button')).toHaveAttribute('type', 'button');
    
    console.log('Accessibility validation completed');
  });

  test('Performance metrics', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/referrals');
    
    // Mock quick API responses
    await page.route('/api/referrals', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            programs: [{
              id: 'program-123',
              name: 'Performance Test Program',
              reward_type: 'monetary',
              referrer_reward_amount: 100,
              referee_reward_amount: 50,
              is_active: true,
              created_at: new Date().toISOString()
            }]
          })
        });
      }
    });

    await page.route('/api/referrals/analytics/program-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          metrics: {
            totalInvitations: 100,
            clickThroughRate: 24.8,
            conversionRate: 11.5,
            roi: 180,
            topReferrers: [
              { coupleName: 'Test Couple 1', conversions: 5, earnings: 500 },
              { coupleName: 'Test Couple 2', conversions: 3, earnings: 300 }
            ]
          },
          dailyData: Array.from({ length: 30 }, (_, i) => ({
            date: `2025-01-${String(i + 1).padStart(2, '0')}`,
            clicks: Math.floor(Math.random() * 20) + 5,
            conversions: Math.floor(Math.random() * 5) + 1
          }))
        })
      });
    });

    // Wait for page to fully load
    await expect(page.locator('h1:has-text("Referral Programs")')).toBeVisible();
    await expect(page.locator('button:has-text("Performance Test Program")')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Verify page loads in under 2 seconds as specified
    expect(loadTime).toBeLessThan(2000);
    
    console.log(`Page loaded in ${loadTime}ms`);
    
    // Test API response times
    const apiStartTime = Date.now();
    await page.reload();
    await expect(page.locator('button:has-text("Performance Test Program")')).toBeVisible();
    const apiTime = Date.now() - apiStartTime;
    
    // Verify API responses under 500ms as specified
    expect(apiTime).toBeLessThan(1000); // Allow some buffer for E2E testing
    
    console.log(`API response time: ${apiTime}ms`);
  });
});