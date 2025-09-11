import { test, expect, Page } from '@playwright/test';

test.describe('Enhanced Viral Coefficient Tracking System E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock admin authentication
    await page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'admin-user-id', role: 'admin' }
        })
      });
    });

    // Mock viral metrics API responses
    await page.route('**/api/admin/viral-metrics', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enhanced: {
            coefficient: 1.25,
            sustainableCoefficient: 1.1,
            acceptanceRate: 0.75,
            conversionTime: 12,
            qualityScore: 0.8,
            seasonalMultiplier: 1.4,
            velocityTrend: 'accelerating',
            weddingIndustryFactors: {
              seasonalImpact: 'peak',
              vendorDensity: 'high',
              marketMaturity: 'mature'
            },
            metadata: {
              totalInvitations: 150,
              totalAcceptances: 112,
              analysisDate: '2024-06-15T10:00:00Z',
              cohortSize: 75
            }
          },
          historical: [
            { date: '2024-05-01', coefficient: 1.1, invitationRate: 2.5, conversionRate: 0.65, activationRate: 0.8 },
            { date: '2024-05-15', coefficient: 1.2, invitationRate: 2.8, conversionRate: 0.7, activationRate: 0.85 },
            { date: '2024-06-01', coefficient: 1.25, invitationRate: 3.0, conversionRate: 0.75, activationRate: 0.9 }
          ],
          loops: [
            { type: 'supplier_to_couple', count: 45, conversionRate: 0.8, revenue: 35000, efficiency: 0.9 },
            { type: 'couple_to_supplier', count: 32, conversionRate: 0.65, revenue: 25000, efficiency: 0.75 }
          ],
          seasonal: {
            currentMultiplier: 1.4,
            peakSeason: { months: [5, 6, 7, 8, 9], multiplier: 1.4 },
            offSeason: { months: [11, 12, 1, 2, 3], multiplier: 0.7 }
          }
        })
      });
    });

    await page.route('**/api/admin/viral-metrics/bottlenecks', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bottlenecks: [
            { 
              stage: 'invitation_acceptance', 
              impact: 0.2, 
              severity: 'medium', 
              description: 'Room for improvement in acceptance rates',
              affectedUsers: 15,
              priority: 'medium'
            }
          ],
          recommendations: [
            { 
              priority: 'high', 
              category: 'messaging', 
              action: 'Optimize invitation messaging for wedding industry context', 
              expectedImpact: 0.15, 
              implementationEffort: 'medium', 
              roi: 2.5,
              weddingContext: 'Wedding communications must be elegant and professional',
              timeline: '1-2 months',
              successMetrics: ['A/B test lift >10%', 'Brand sentiment improvement']
            }
          ]
        })
      });
    });

    await page.route('**/api/admin/viral-metrics/simulate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          projectedOutcome: {
            baselineCoefficient: 1.25,
            projectedCoefficient: 1.45,
            expectedNewUsers: 175,
            projectedRevenue: 65000,
            confidenceLevel: 0.87
          },
          riskAnalysis: {
            implementationRisk: 'medium',
            marketRisk: 'low',
            seasonalRisk: 'low',
            overallRisk: 'medium'
          },
          timelineProjections: [
            { week: 1, coefficient: 1.28, users: 580 },
            { week: 2, coefficient: 1.35, users: 615 },
            { week: 3, coefficient: 1.42, users: 655 },
            { week: 4, coefficient: 1.45, users: 695 }
          ],
          roiAnalysis: {
            investmentCost: 2500,
            projectedReturn: 22000,
            roi: 7.8,
            paybackPeriod: 3,
            breakEvenPoint: 2
          },
          recommendations: [
            'Launch during peak wedding season (May-September)',
            'Focus on photographer segment for highest conversion',
            'Emphasize exclusive benefits in messaging'
          ]
        })
      });
    });
  });

  test('should display viral coefficient dashboard with all key metrics', async () => {
    await page.goto('/admin/viral-dashboard');

    // Wait for the dashboard to load
    await expect(page.getByText('Enhanced Viral Coefficient Tracking')).toBeVisible();

    // Verify key metrics are displayed
    await expect(page.getByText('1.25')).toBeVisible(); // Viral coefficient
    await expect(page.getByText('75%')).toBeVisible(); // Acceptance rate  
    await expect(page.getByText('12 days')).toBeVisible(); // Conversion time
    await expect(page.getByText('Healthy')).toBeVisible(); // Health status

    // Verify health indicator
    await expect(page.locator('[data-testid="check-circle-icon"]')).toBeVisible();

    // Verify growth trend
    await expect(page.locator('[data-testid="trending-up-icon"]')).toBeVisible();

    // Verify wedding industry context
    await expect(page.getByText('Peak Season')).toBeVisible();
    await expect(page.getByText('High Density')).toBeVisible();
    await expect(page.getByText('Mature Market')).toBeVisible();
  });

  test('should navigate between dashboard tabs correctly', async () => {
    await page.goto('/admin/viral-dashboard');

    // Test Viral Loops tab
    await page.click('text=Viral Loops');
    await expect(page.getByText('Loop Performance Analysis')).toBeVisible();
    await expect(page.getByText('supplier_to_couple')).toBeVisible();
    await expect(page.getByText('couple_to_supplier')).toBeVisible();

    // Test Seasonal tab
    await page.click('text=Seasonal');
    await expect(page.getByText('Wedding Season Impact')).toBeVisible();
    await expect(page.getByText('Peak Season (1.4x)')).toBeVisible();

    // Test Simulation tab
    await page.click('text=Simulation');
    await expect(page.getByText('Viral Growth Simulation')).toBeVisible();
    await expect(page.getByText('Referral Incentive Campaign')).toBeVisible();

    // Test Optimization tab
    await page.click('text=Optimization');
    await expect(page.getByText('Growth Optimization Recommendations')).toBeVisible();
    await expect(page.getByText('Current Bottlenecks')).toBeVisible();

    // Return to Overview
    await page.click('text=Overview');
    await expect(page.getByText('Current Viral Coefficient')).toBeVisible();
  });

  test('should run viral simulation and display results', async () => {
    await page.goto('/admin/viral-dashboard');

    // Navigate to simulation tab
    await page.click('text=Simulation');

    // Click on first simulation preset
    const runSimulationButtons = page.locator('text=Run Simulation');
    await runSimulationButtons.first().click();

    // Wait for simulation results to appear
    await expect(page.getByText('Simulation Results')).toBeVisible({ timeout: 10000 });

    // Verify projected outcome
    await expect(page.getByText('1.45')).toBeVisible(); // Projected coefficient
    await expect(page.getByText('175')).toBeVisible(); // Expected new users
    await expect(page.getByText('£65,000')).toBeVisible(); // Projected revenue

    // Verify ROI analysis
    await expect(page.getByText('7.8x')).toBeVisible(); // ROI multiplier
    await expect(page.getByText('3 weeks')).toBeVisible(); // Payback period

    // Verify recommendations
    await expect(page.getByText('Launch during peak wedding season')).toBeVisible();
    await expect(page.getByText('Focus on photographer segment')).toBeVisible();
  });

  test('should display bottlenecks and optimization recommendations', async () => {
    await page.goto('/admin/viral-dashboard');

    // Navigate to optimization tab
    await page.click('text=Optimization');

    // Verify bottlenecks section
    await expect(page.getByText('Current Bottlenecks')).toBeVisible();
    await expect(page.getByText('invitation_acceptance')).toBeVisible();
    await expect(page.getByText('Room for improvement in acceptance rates')).toBeVisible();
    await expect(page.getByText('Medium')).toBeVisible(); // Severity

    // Verify recommendations section
    await expect(page.getByText('Recommended Actions')).toBeVisible();
    await expect(page.getByText('Optimize invitation messaging')).toBeVisible();
    await expect(page.getByText('High Priority')).toBeVisible();
    await expect(page.getByText('Expected Impact: 15%')).toBeVisible();
    await expect(page.getByText('ROI: 2.5x')).toBeVisible();

    // Verify wedding industry context
    await expect(page.getByText('Wedding communications must be elegant and professional')).toBeVisible();
    await expect(page.getByText('1-2 months')).toBeVisible(); // Timeline
  });

  test('should handle different time ranges', async () => {
    await page.goto('/admin/viral-dashboard');

    // Find and change the time range selector
    const timeRangeSelect = page.locator('select').first();
    await timeRangeSelect.selectOption('7d');

    // Verify API was called with new timeframe
    await page.waitForResponse('**/api/admin/viral-metrics?timeframe=7d&**');

    // Change to 90 days
    await timeRangeSelect.selectOption('90d');
    await page.waitForResponse('**/api/admin/viral-metrics?timeframe=90d&**');
  });

  test('should handle refresh functionality', async () => {
    await page.goto('/admin/viral-dashboard');

    // Wait for initial load
    await expect(page.getByText('1.25')).toBeVisible();

    // Click refresh button
    const refreshButton = page.locator('[data-testid="refresh-icon"]').locator('..');
    await refreshButton.click();

    // Verify API was called again
    await page.waitForResponse('**/api/admin/viral-metrics**');
  });

  test('should handle error states gracefully', async () => {
    // Mock error response
    await page.route('**/api/admin/viral-metrics', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database connection failed' })
      });
    });

    await page.goto('/admin/viral-dashboard');

    // Verify error message is displayed
    await expect(page.getByText('Error loading viral metrics')).toBeVisible();
    await expect(page.getByText('Database connection failed')).toBeVisible();
  });

  test('should require admin authentication', async () => {
    // Mock non-admin user
    await page.route('**/api/admin/viral-metrics**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized. Admin access required.' })
      });
    });

    await page.goto('/admin/viral-dashboard');

    // Should show unauthorized error
    await expect(page.getByText('Unauthorized. Admin access required.')).toBeVisible();
  });

  test('should display charts and visualizations', async () => {
    await page.goto('/admin/viral-dashboard');

    // Verify trend chart exists
    await expect(page.locator('[data-testid="line-chart"]')).toBeVisible();

    // Go to Viral Loops tab and check bar chart
    await page.click('text=Viral Loops');
    await expect(page.locator('[data-testid="bar-chart"]')).toBeVisible();

    // Go to Seasonal tab and check seasonal chart
    await page.click('text=Seasonal');
    await expect(page.locator('[data-testid="line-chart"]')).toBeVisible();
  });

  test('should be responsive on mobile devices', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/viral-dashboard');

    // Verify dashboard still loads and is usable
    await expect(page.getByText('Enhanced Viral Coefficient Tracking')).toBeVisible();
    await expect(page.getByText('1.25')).toBeVisible();

    // Test tab navigation on mobile
    await page.click('text=Viral Loops');
    await expect(page.getByText('Loop Performance Analysis')).toBeVisible();

    // Test simulation on mobile
    await page.click('text=Simulation');
    await expect(page.getByText('Referral Incentive Campaign')).toBeVisible();
  });

  test('should support keyboard navigation', async () => {
    await page.goto('/admin/viral-dashboard');

    // Use keyboard to navigate tabs
    const viralLoopsTab = page.getByText('Viral Loops');
    await viralLoopsTab.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText('Loop Performance Analysis')).toBeVisible();

    // Navigate to simulation tab with keyboard
    const simulationTab = page.getByText('Simulation');
    await simulationTab.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText('Viral Growth Simulation')).toBeVisible();
  });

  test('should handle simulation loading states', async () => {
    // Mock delayed simulation response
    await page.route('**/api/admin/viral-metrics/simulate', route => {
      // Delay response by 2 seconds to test loading state
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            projectedOutcome: { projectedCoefficient: 1.45 }
          })
        });
      }, 2000);
    });

    await page.goto('/admin/viral-dashboard');
    await page.click('text=Simulation');

    // Start simulation
    const runSimulationButtons = page.locator('text=Run Simulation');
    await runSimulationButtons.first().click();

    // Verify loading state is shown
    await expect(page.getByText('Running simulation...')).toBeVisible();

    // Wait for results
    await expect(page.getByText('Simulation Results')).toBeVisible({ timeout: 5000 });
  });

  test('should handle wedding season context correctly', async () => {
    await page.goto('/admin/viral-dashboard');

    // Verify peak season is displayed
    await expect(page.getByText('Peak Season')).toBeVisible();

    // Go to seasonal tab for more details
    await page.click('text=Seasonal');
    
    // Verify seasonal recommendations
    await expect(page.getByText('Peak season - maximize viral campaigns')).toBeVisible();
    await expect(page.getByText('High vendor density - leverage network effects')).toBeVisible();

    // Verify current multiplier
    await expect(page.getByText('1.4x')).toBeVisible();
  });
});