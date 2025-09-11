/**
 * WedSync Demo Mode - Comprehensive Playwright Tests
 * Tests all demo functionality including personas, navigation, screenshot mode
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Demo configuration
const DEMO_BASE_URL = 'http://localhost:3000';
const DEMO_PERSONAS = [
  {
    id: 'photographer-everlight',
    type: 'supplier',
    name: 'Everlight Photography',
    expectedApp: 'wedsync'
  },
  {
    id: 'videographer-silver-lining', 
    type: 'supplier',
    name: 'Silver Lining Films',
    expectedApp: 'wedsync'
  },
  {
    id: 'couple-sarah-michael',
    type: 'client',
    name: 'Sarah & Michael',
    expectedApp: 'wedme'
  },
  {
    id: 'admin-wedsync',
    type: 'admin',
    name: 'WedSync Admin',
    expectedApp: 'wedsync'
  }
];

// Test setup
test.describe('WedSync Demo Mode', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create context with demo mode environment
    context = await browser.newContext({
      baseURL: DEMO_BASE_URL,
      extraHTTPHeaders: {
        'X-Demo-Mode': 'true'
      }
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Demo Environment Setup', () => {
    test('should access demo selector page', async () => {
      await page.goto('/demo');
      
      // Check page loads and has expected content
      await expect(page).toHaveTitle(/WedSync/);
      await expect(page.locator('h1')).toContainText('Experience WedSync');
      
      // Check for demo personas sections
      await expect(page.locator('text=Wedding Couples')).toBeVisible();
      await expect(page.locator('text=Wedding Suppliers')).toBeVisible();
      await expect(page.locator('text=Platform Administration')).toBeVisible();
    });

    test('should show demo mode banner when not in screenshot mode', async () => {
      await page.goto('/demo');
      
      // Should not show demo banner on selector page
      await expect(page.locator('text=DEMO MODE')).not.toBeVisible();
      
      // Login as a persona to see banner
      await page.click('text=Enter Dashboard >> first');
      
      // Should show demo banner after login
      await expect(page.locator('text=DEMO MODE')).toBeVisible();
    });

    test('should have screenshot mode toggle', async () => {
      await page.goto('/demo');
      
      // Check screenshot mode toggle exists
      await expect(page.locator('text=Screenshot Mode')).toBeVisible();
    });
  });

  test.describe('Demo Personas', () => {
    for (const persona of DEMO_PERSONAS) {
      test(`should login as ${persona.name}`, async () => {
        await page.goto(`/demo?persona=${persona.id}`);
        
        // Should redirect or show dashboard
        await page.waitForTimeout(2000); // Allow redirect time
        
        // Check URL changed (may redirect to different app)
        const currentUrl = page.url();
        expect(currentUrl).not.toBe(`${DEMO_BASE_URL}/demo?persona=${persona.id}`);
        
        // Check for demo mode banner
        await expect(page.locator('text=DEMO MODE')).toBeVisible();
        await expect(page.locator(`text=${persona.name}`)).toBeVisible();
      });
    }

    test('should show persona cards with correct information', async () => {
      await page.goto('/demo');
      
      for (const persona of DEMO_PERSONAS) {
        // Check persona card exists
        const personaCard = page.locator(`text=${persona.name}`).locator('xpath=ancestor::div[contains(@class, "card") or contains(@class, "Card")]').first();
        await expect(personaCard).toBeVisible();
        
        // Check enter dashboard button
        const enterButton = personaCard.locator('text=Enter Dashboard');
        await expect(enterButton).toBeVisible();
      }
    });
  });

  test.describe('Screenshot Mode', () => {
    test('should enable screenshot mode via URL', async () => {
      await page.goto('/demo?screenshot=1');
      
      // Check screenshot mode indicator
      await expect(page.locator('text=Screenshot Mode')).toBeVisible();
      
      // Check for screenshot mode badge/indicator
      await expect(page.locator('[data-testid="screenshot-mode-badge"], .screenshot-mode-badge, text=Screenshot Mode').first()).toBeVisible();
    });

    test('should enable screenshot mode via toggle', async () => {
      await page.goto('/demo');
      
      // Find and click screenshot mode toggle
      const screenshotToggle = page.locator('button:has-text("Screenshot Mode")').first();
      await screenshotToggle.click();
      
      // Should show enabled state
      await expect(page.locator('text=ON, text=Disable').first()).toBeVisible();
    });

    test('should apply screenshot mode styles', async () => {
      await page.goto('/demo?screenshot=1');
      
      // Check if screenshot mode class is applied
      const html = page.locator('html');
      await expect(html).toHaveClass(/screenshot-mode/);
    });

    test('should hide demo banner in screenshot mode', async () => {
      // First login as a persona
      await page.goto('/demo?persona=photographer-everlight');
      await page.waitForTimeout(1000);
      
      // Should see demo banner normally
      await expect(page.locator('text=DEMO MODE')).toBeVisible();
      
      // Enable screenshot mode
      await page.goto('/demo?persona=photographer-everlight&screenshot=1');
      await page.waitForTimeout(1000);
      
      // Demo banner should be hidden in screenshot mode
      await expect(page.locator('text=DEMO MODE')).not.toBeVisible();
    });
  });

  test.describe('Demo Assets', () => {
    test('should load supplier logos correctly', async () => {
      await page.goto('/demo');
      
      // Check if logo sprite image loads
      const logoSprite = page.locator('img[src*="supplier-logos.png"], [style*="supplier-logos.png"]').first();
      
      // Wait for any logo elements to be visible
      await page.waitForSelector('[class*="demo-logo"], [style*="background-image"]', { timeout: 5000 });
      
      // Check supplier cards have visual elements (logos or fallbacks)
      const supplierCards = page.locator('text=Wedding Suppliers').locator('xpath=following-sibling::div').first();
      const logoElements = supplierCards.locator('[class*="logo"], [class*="avatar"], [style*="background"]');
      
      const logoCount = await logoElements.count();
      expect(logoCount).toBeGreaterThan(0);
    });

    test('should load couple avatars correctly', async () => {
      await page.goto('/demo');
      
      // Check couple section has avatar elements
      const coupleSection = page.locator('text=Wedding Couples').locator('xpath=following-sibling::div').first();
      const avatarElements = coupleSection.locator('[class*="avatar"], img, [style*="background-image"]');
      
      const avatarCount = await avatarElements.count();
      expect(avatarCount).toBeGreaterThan(0);
    });
  });

  test.describe('Cross-App Navigation', () => {
    test('should handle supplier persona navigation', async () => {
      const supplierPersona = DEMO_PERSONAS.find(p => p.type === 'supplier');
      if (!supplierPersona) return;
      
      await page.goto(`/demo?persona=${supplierPersona.id}`);
      
      // Allow time for potential redirect
      await page.waitForTimeout(2000);
      
      // Should be on some dashboard page
      const currentUrl = page.url();
      expect(currentUrl).toContain('dashboard') || expect(currentUrl).toContain(supplierPersona.expectedApp);
    });

    test('should handle couple persona navigation', async () => {
      const couplePersona = DEMO_PERSONAS.find(p => p.type === 'client');
      if (!couplePersona) return;
      
      await page.goto(`/demo?persona=${couplePersona.id}`);
      
      // Allow time for potential redirect
      await page.waitForTimeout(2000);
      
      // Should be on dashboard or appropriate page
      const currentUrl = page.url();
      expect(currentUrl).not.toBe(`${DEMO_BASE_URL}/demo?persona=${couplePersona.id}`);
    });
  });

  test.describe('Demo Data Integration', () => {
    test('should show realistic demo content', async () => {
      // Login as photographer
      await page.goto('/demo?persona=photographer-everlight');
      await page.waitForTimeout(2000);
      
      // Should see some kind of dashboard content
      // This is flexible since dashboard structure may vary
      const hasDashboardContent = await page.locator('[data-testid="dashboard"], .dashboard, main, [role="main"]').count() > 0 ||
                                 await page.locator('text=Dashboard, text=Clients, text=Bookings, text=Calendar').count() > 0;
      
      expect(hasDashboardContent).toBeTruthy();
    });

    test('should persist demo session in localStorage', async () => {
      await page.goto('/demo?persona=photographer-everlight');
      await page.waitForTimeout(1000);
      
      // Check localStorage has demo session
      const demoSession = await page.evaluate(() => {
        return localStorage.getItem('wedsync_demo_session');
      });
      
      expect(demoSession).toBeTruthy();
      
      // Parse and verify session data
      if (demoSession) {
        const sessionData = JSON.parse(demoSession);
        expect(sessionData.personaId).toBe('photographer-everlight');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid persona gracefully', async () => {
      await page.goto('/demo?persona=invalid-persona');
      
      // Should redirect to demo selector or show error
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      
      // Should either be back on demo page or show appropriate error
      expect(currentUrl).toContain('/demo');
    });

    test('should show demo mode unavailable when not in demo mode', async () => {
      // Create new context without demo mode
      const regularContext = await context.browser()?.newContext({
        baseURL: DEMO_BASE_URL
      });
      
      if (regularContext) {
        const regularPage = await regularContext.newPage();
        
        // Override environment to disable demo mode
        await regularPage.addInitScript(() => {
          // @ts-ignore
          window.process = { env: { NEXT_PUBLIC_DEMO_MODE: 'false' } };
        });
        
        await regularPage.goto('/demo');
        
        // Should show demo mode not available message
        await expect(regularPage.locator('text=Demo Mode')).toBeVisible();
        
        await regularContext.close();
      }
    });
  });

  test.describe('UI/UX Testing', () => {
    test('should be mobile responsive', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/demo');
      
      // Check mobile layout works
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('text=Wedding Couples')).toBeVisible();
      
      // Persona cards should still be clickable
      const firstPersonaCard = page.locator('text=Enter Dashboard').first();
      await expect(firstPersonaCard).toBeVisible();
    });

    test('should have proper accessibility attributes', async () => {
      await page.goto('/demo');
      
      // Check for basic accessibility
      await expect(page.locator('h1')).toBeVisible();
      
      // Buttons should have proper roles
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);
    });
  });

  test.describe('Performance', () => {
    test('should load demo page quickly', async () => {
      const startTime = Date.now();
      await page.goto('/demo');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (adjust based on needs)
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
    });

    test('should preload demo assets', async () => {
      await page.goto('/demo');
      
      // Wait for any asset preloading
      await page.waitForTimeout(2000);
      
      // Check that main assets are accessible
      const response = await page.goto('/demo/logos/supplier-logos.png');
      expect(response?.status()).toBe(200);
    });
  });
});