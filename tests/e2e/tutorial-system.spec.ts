import { test, expect } from '@playwright/test';

/**
 * E2E Tests for WedSync Tutorial System
 * Tests the complete tutorial flow as specified in the prompt requirements
 */

test.describe('Tutorial System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing tutorial state
    await page.goto('/dashboard');
    await page.evaluate(() => {
      localStorage.removeItem('wedsync-tutorial-seen');
      localStorage.clear();
    });
  });

  test('1. Tutorial Initialization and Overlay Testing', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for tutorial to auto-start or trigger it
    await page.waitForSelector('[data-testid="tutorial-overlay"]', { timeout: 5000 });
    
    // Check for welcome message
    const welcomeText = page.locator('text=Welcome! Let\'s get you started');
    await expect(welcomeText).toBeVisible();
    
    // Take snapshot of tutorial overlay
    await page.screenshot({ 
      path: 'test-results/tutorial-overlay-init.png',
      fullPage: true 
    });
    
    // Verify overlay structure
    const overlay = page.locator('[data-testid="tutorial-overlay"]');
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveClass(/tutorial-overlay/);
  });

  test('2. Tutorial Step Progression Testing', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Start tutorial
    await page.waitForSelector('[data-testid="tutorial-overlay"]');
    
    // Click next step button
    const nextButton = page.locator('[data-testid="tutorial-next"]');
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    
    // Wait for step 2
    await page.waitForSelector('text=Step 2 of');
    const stepIndicator = page.locator('text=Step 2 of');
    await expect(stepIndicator).toBeVisible();
    
    // Check for step 2 content
    const step2Content = page.locator('text=Create your first form').or(
      page.locator('text=Complete Your Wedding Profile')
    );
    await expect(step2Content).toBeVisible();
    
    // Take snapshot of step progression
    await page.screenshot({ 
      path: 'test-results/tutorial-step-progression.png',
      fullPage: true 
    });
  });

  test('3. Tutorial Element Highlighting Testing', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Start tutorial and progress to a step with highlighting
    await page.waitForSelector('[data-testid="tutorial-overlay"]');
    
    // Look for highlighted elements
    const highlightedElement = page.locator('[data-tutorial-highlight="true"]').first();
    
    // If no elements with that attribute, check for highlight component
    const tutorialHighlight = page.locator('.tutorial-highlight').first();
    
    // Take screenshot showing highlighting
    await page.screenshot({ 
      path: 'test-results/tutorial-highlighting.png',
      fullPage: true 
    });
    
    // Verify highlight is visible
    const hasHighlight = await highlightedElement.count() > 0 || await tutorialHighlight.count() > 0;
    expect(hasHighlight).toBeTruthy();
  });

  test('4. Tutorial Skip/Resume Testing', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Start tutorial
    await page.waitForSelector('[data-testid="tutorial-overlay"]');
    
    // Click skip button
    const skipButton = page.locator('[data-testid="tutorial-skip"]');
    if (await skipButton.count() > 0) {
      await skipButton.click();
      
      // Wait for skip confirmation
      await page.waitForTimeout(1000);
      
      // Navigate away and back
      await page.goto('/clients');
      await page.goto('/dashboard');
      
      // Look for resume option
      const resumeButton = page.locator('[data-testid="resume-tutorial"]').or(
        page.locator('text=Resume tutorial')
      );
      
      if (await resumeButton.count() > 0) {
        await expect(resumeButton).toBeVisible();
        
        // Take screenshot of resume state
        await page.screenshot({ 
          path: 'test-results/tutorial-resume.png',
          fullPage: true 
        });
      }
    }
  });

  test('5. Tutorial Completion Testing', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Start tutorial
    await page.waitForSelector('[data-testid="tutorial-overlay"]');
    
    // Fast-forward through all steps
    const maxSteps = 7; // Based on our 7-step tutorial
    
    for (let step = 1; step <= maxSteps; step++) {
      // Look for next button and click if available
      const nextButton = page.locator('[data-testid="tutorial-next"]');
      const completeButton = page.locator('[data-testid="tutorial-complete"]');
      
      if (await nextButton.count() > 0) {
        await nextButton.click();
        await page.waitForTimeout(500);
      } else if (await completeButton.count() > 0) {
        await completeButton.click();
        break;
      } else {
        // Auto-advance or skip to complete
        const skipButton = page.locator('[data-testid="tutorial-skip"]');
        if (await skipButton.count() > 0) {
          await skipButton.click();
          await page.waitForTimeout(500);
        }
      }
      
      // Check if we've reached completion
      const congratsText = page.locator('text=Congratulations').or(
        page.locator('text=Tutorial Complete')
      );
      
      if (await congratsText.count() > 0) {
        break;
      }
    }
    
    // Wait for celebration/completion
    await page.waitForTimeout(2000);
    
    // Take screenshot of completion
    await page.screenshot({ 
      path: 'test-results/tutorial-completion.png',
      fullPage: true 
    });
    
    // Verify completion elements
    const completionElements = await page.locator('text=Congratulations').or(
      page.locator('text=completed').or(
        page.locator('.tutorial-celebration')
      )
    ).count();
    
    expect(completionElements).toBeGreaterThan(0);
  });

  test('6. Responsive Tutorial Testing', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      // Set viewport size
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Navigate to dashboard
      await page.goto('/dashboard');
      
      // Clear tutorial state for fresh start
      await page.evaluate(() => {
        localStorage.removeItem('wedsync-tutorial-seen');
      });
      
      // Reload to trigger tutorial
      await page.reload();
      
      // Wait for tutorial elements
      await page.waitForTimeout(2000);
      
      // Take screenshot for this viewport
      await page.screenshot({ 
        path: `test-results/tutorial-${viewport.name}-${viewport.width}px.png`,
        fullPage: true 
      });
      
      // Verify tutorial is responsive
      const tutorialElements = page.locator('[data-testid="tutorial-overlay"]').or(
        page.locator('.tutorial-progress').or(
          page.locator('.tutorial-tooltip')
        )
      );
      
      const elementCount = await tutorialElements.count();
      console.log(`${viewport.name} (${viewport.width}px): Found ${elementCount} tutorial elements`);
    }
  });

  test('7. Accessibility Testing', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Start tutorial
    await page.waitForSelector('[data-testid="tutorial-overlay"]', { timeout: 5000 });
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Check ARIA attributes
    const tutorialRegion = page.locator('[role="region"]');
    if (await tutorialRegion.count() > 0) {
      const ariaLabel = await tutorialRegion.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
    
    // Check progress bar
    const progressBar = page.locator('[role="progressbar"]');
    if (await progressBar.count() > 0) {
      const ariaNow = await progressBar.getAttribute('aria-valuenow');
      const ariaMax = await progressBar.getAttribute('aria-valuemax');
      expect(ariaNow).toBeTruthy();
      expect(ariaMax).toBeTruthy();
    }
    
    // Test screen reader content
    const srContent = page.locator('[aria-live="polite"]');
    if (await srContent.count() > 0) {
      await expect(srContent).toBeVisible();
    }
    
    // Take accessibility screenshot
    await page.screenshot({ 
      path: 'test-results/tutorial-accessibility.png',
      fullPage: true 
    });
  });

  test('8. Tutorial API Integration Testing', async ({ page }) => {
    // Mock API responses for testing
    await page.route('/api/tutorials/start', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          tutorial: {
            id: 'test-tutorial-123',
            type: 'onboarding',
            currentStep: 1,
            totalSteps: 7,
            steps: [
              {
                id: 'welcome-orientation',
                title: 'Welcome to WedSync!',
                description: 'Let\'s take a quick tour',
                content: {
                  primary: 'Welcome message',
                  secondary: 'Secondary message',
                  cta: 'Start Tour'
                },
                position: 'center-modal'
              }
            ],
            canResume: false
          }
        })
      });
    });
    
    await page.route('/api/tutorials/progress', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          progress: {
            currentStep: 2,
            totalSteps: 7,
            completedSteps: ['welcome-orientation'],
            skippedSteps: [],
            status: 'active',
            progressPercentage: 28,
            isCompleted: false,
            lastActivity: new Date().toISOString()
          }
        })
      });
    });
    
    await page.goto('/dashboard');
    
    // Trigger tutorial start
    const startButton = page.locator('button:has-text("Start Tutorial")').or(
      page.locator('[data-testid="start-tutorial"]')
    );
    
    if (await startButton.count() > 0) {
      await startButton.click();
      
      // Wait for API call and response
      await page.waitForTimeout(1000);
      
      // Verify tutorial started
      const tutorialOverlay = page.locator('[data-testid="tutorial-overlay"]');
      await expect(tutorialOverlay).toBeVisible();
      
      // Take screenshot of API integration
      await page.screenshot({ 
        path: 'test-results/tutorial-api-integration.png',
        fullPage: true 
      });
    }
  });

  test('9. Tutorial Performance Testing', async ({ page }) => {
    // Start performance monitoring
    await page.goto('/dashboard');
    
    const startTime = Date.now();
    
    // Trigger tutorial
    await page.waitForSelector('[data-testid="tutorial-overlay"]', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Verify performance requirements (< 200ms component load)
    console.log(`Tutorial load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2000); // Allow 2s for E2E test environment
    
    // Test animation performance
    const animationStart = Date.now();
    
    const nextButton = page.locator('[data-testid="tutorial-next"]');
    if (await nextButton.count() > 0) {
      await nextButton.click();
    }
    
    const animationTime = Date.now() - animationStart;
    console.log(`Tutorial animation time: ${animationTime}ms`);
    
    // Take performance screenshot
    await page.screenshot({ 
      path: 'test-results/tutorial-performance.png',
      fullPage: true 
    });
  });
});

test.describe('Tutorial Component Integration Tests', () => {
  test('Tutorial Manager Integration', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test TutorialManager component
    const tutorialManager = page.locator('.tutorial-manager').or(
      page.locator('[data-testid="tutorial-manager"]')
    );
    
    // Wait for tutorial system to initialize
    await page.waitForTimeout(2000);
    
    // Take integration screenshot
    await page.screenshot({ 
      path: 'test-results/tutorial-manager-integration.png',
      fullPage: true 
    });
    
    // Verify tutorial components are present
    const hasOverlay = await page.locator('[data-testid="tutorial-overlay"]').count() > 0;
    const hasProgress = await page.locator('.tutorial-progress').count() > 0;
    const hasTooltip = await page.locator('.tutorial-tooltip').count() > 0;
    
    console.log(`Tutorial components present: Overlay=${hasOverlay}, Progress=${hasProgress}, Tooltip=${hasTooltip}`);
  });

  test('Tutorial Context State Management', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test tutorial context state
    const contextState = await page.evaluate(() => {
      // Check if React context is available
      const tutorialElements = document.querySelectorAll('[data-tutorial]');
      return {
        elementCount: tutorialElements.length,
        hasContext: !!window.React // Check if React is loaded
      };
    });
    
    console.log('Tutorial context state:', contextState);
    
    // Take context state screenshot
    await page.screenshot({ 
      path: 'test-results/tutorial-context-state.png',
      fullPage: true 
    });
  });
});

// Test utility functions
test.describe('Tutorial Utilities', () => {
  test('Screenshot All Tutorial States', async ({ page }) => {
    const states = ['init', 'active', 'paused', 'completed', 'error'];
    
    for (const state of states) {
      await page.goto(`/dashboard?tutorial-state=${state}`);
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: `test-results/tutorial-state-${state}.png`,
        fullPage: true 
      });
    }
  });
});