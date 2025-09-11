import { test, expect, Page } from '@playwright/test';

test.describe('WedSync Routing and CSS Loading Tests', () => {
  const baseURL = 'http://localhost:3002';

  test.beforeEach(async ({ page }) => {
    // Set up error tracking
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
      }
    });

    page.on('pageerror', (error) => {
      console.error(`Page error: ${error.message}`);
    });
  });

  test('1. Test main landing page and CSS loading', async ({ page }) => {
    console.log('🧪 Testing main landing page...');
    
    // Navigate to main page
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Check if page loaded successfully
    await expect(page).toHaveTitle(/WedSync/i);
    
    // Take screenshot of landing page
    await page.screenshot({ 
      path: 'screenshots/01-landing-page.png', 
      fullPage: true 
    });
    
    // Check for CSS loading - look for styled elements
    const header = page.locator('header, nav, .header, [data-testid="header"]').first();
    if (await header.count() > 0) {
      const headerStyles = await header.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          display: styles.display,
          padding: styles.padding
        };
      });
      console.log('Header styles:', headerStyles);
      
      // Check if styles are applied (not just default browser styles)
      expect(headerStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    }
    
    // Check for critical styling elements
    const mainContent = page.locator('main, .main, [role="main"]').first();
    if (await mainContent.count() > 0) {
      const isVisible = await mainContent.isVisible();
      expect(isVisible).toBe(true);
    }
    
    // Look for sign-in button/link
    const signInButton = page.locator('text=/sign in|login|sign up/i').first();
    if (await signInButton.count() > 0) {
      await expect(signInButton).toBeVisible();
      console.log('✅ Sign in button found and visible');
    } else {
      console.log('⚠️  No sign in button found on landing page');
    }
  });

  test('2. Test supplier authentication flow', async ({ page }) => {
    console.log('🧪 Testing supplier authentication flow...');
    
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Look for sign in button/link
    const signInSelectors = [
      'text=/sign in/i',
      'text=/login/i', 
      'a[href*="sign-in"]',
      'a[href*="login"]',
      'a[href*="auth"]',
      'button:has-text("Sign In")',
      'button:has-text("Login")'
    ];
    
    let signInButton = null;
    for (const selector of signInSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0 && await element.isVisible()) {
        signInButton = element;
        break;
      }
    }
    
    if (signInButton) {
      console.log('✅ Found sign in button, clicking...');
      await signInButton.click();
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of auth page
      await page.screenshot({ 
        path: 'screenshots/02-supplier-auth.png', 
        fullPage: true 
      });
      
      // Check if we're on an auth page
      const currentURL = page.url();
      console.log(`Current URL after clicking sign in: ${currentURL}`);
      
      // Look for auth form elements
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      
      if (await emailInput.count() > 0) {
        console.log('✅ Email input found on auth page');
        await expect(emailInput).toBeVisible();
      } else {
        console.log('⚠️  No email input found on auth page');
      }
      
      if (await passwordInput.count() > 0) {
        console.log('✅ Password input found on auth page');
        await expect(passwordInput).toBeVisible();
      } else {
        console.log('⚠️  No password input found on auth page');
      }
      
    } else {
      console.log('❌ No sign in button found on landing page');
      await page.screenshot({ 
        path: 'screenshots/02-no-signin-button.png', 
        fullPage: true 
      });
    }
  });

  test('3. Test couple signup flow', async ({ page }) => {
    console.log('🧪 Testing couple signup flow...');
    
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Look for couple-specific signup
    const coupleSignupSelectors = [
      'text=/couples/i',
      'text=/for couples/i',
      'text=/couple sign/i',
      'a[href*="couple"]',
      'a[href*="wedme"]',
      'button:has-text("Couples")',
      'text=/sign up/i'
    ];
    
    let coupleSignupButton = null;
    for (const selector of coupleSignupSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0 && await element.isVisible()) {
        coupleSignupButton = element;
        break;
      }
    }
    
    if (coupleSignupButton) {
      console.log('✅ Found couple signup option, clicking...');
      await coupleSignupButton.click();
      await page.waitForLoadState('networkidle');
      
      // Take screenshot
      await page.screenshot({ 
        path: 'screenshots/03-couple-signup.png', 
        fullPage: true 
      });
      
      const currentURL = page.url();
      console.log(`Current URL after clicking couple signup: ${currentURL}`);
      
    } else {
      console.log('⚠️  No specific couple signup found, checking general signup...');
      
      // Try general signup
      const generalSignup = page.locator('text=/sign up/i').first();
      if (await generalSignup.count() > 0) {
        await generalSignup.click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ 
          path: 'screenshots/03-general-signup.png', 
          fullPage: true 
        });
      }
    }
  });

  test('4. Check for console errors and CSS loading issues', async ({ page }) => {
    console.log('🧪 Checking for console errors and CSS loading issues...');
    
    const errors: string[] = [];
    const consoleMessages: string[] = [];
    
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      errors.push(`Page error: ${error.message}`);
    });
    
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Wait a bit more to catch any delayed errors
    await page.waitForTimeout(2000);
    
    // Check for failed CSS/JS resources
    const failedResources: string[] = [];
    page.on('response', (response) => {
      if (!response.ok() && (response.url().includes('.css') || response.url().includes('.js'))) {
        failedResources.push(`${response.status()} - ${response.url()}`);
      }
    });
    
    // Check if Tailwind/CSS is loaded by testing some basic styling
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        fontFamily: styles.fontFamily,
        margin: styles.margin,
        backgroundColor: styles.backgroundColor
      };
    });
    
    console.log('Body styles:', bodyStyles);
    console.log('Console messages:', consoleMessages);
    console.log('Errors found:', errors);
    console.log('Failed resources:', failedResources);
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: 'screenshots/04-console-errors-check.png', 
      fullPage: true 
    });
    
    // Report findings
    if (errors.length > 0) {
      console.log(`❌ Found ${errors.length} errors`);
    } else {
      console.log('✅ No console errors found');
    }
    
    if (failedResources.length > 0) {
      console.log(`❌ Found ${failedResources.length} failed resources`);
    } else {
      console.log('✅ No failed CSS/JS resources');
    }
  });

  test('5. Test key page navigation and routing', async ({ page }) => {
    console.log('🧪 Testing key page navigation...');
    
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Test common routes
    const routesToTest = [
      '/pricing',
      '/about',
      '/contact',
      '/features',
      '/login',
      '/signup',
      '/auth/sign-in',
      '/auth/sign-up'
    ];
    
    for (const route of routesToTest) {
      try {
        console.log(`Testing route: ${route}`);
        const response = await page.goto(`${baseURL}${route}`);
        
        if (response) {
          const status = response.status();
          console.log(`${route}: ${status}`);
          
          if (status === 200) {
            await page.waitForLoadState('networkidle');
            await page.screenshot({ 
              path: `screenshots/05-route-${route.replace(/\//g, '-')}.png`, 
              fullPage: true 
            });
          }
        }
      } catch (error) {
        console.log(`❌ Error testing route ${route}: ${error}`);
      }
    }
  });
});