const { chromium } = require('playwright');
const fs = require('fs');

async function testWedSyncRouting() {
  console.log('🚀 Starting WedSync routing and CSS tests...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Track errors
  const errors = [];
  const consoleMessages = [];
  
  page.on('console', (msg) => {
    const message = `${msg.type()}: ${msg.text()}`;
    consoleMessages.push(message);
    console.log(`Console: ${message}`);
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    const errorMsg = `Page error: ${error.message}`;
    errors.push(errorMsg);
    console.log(`❌ ${errorMsg}`);
  });

  try {
    console.log('\n📱 Test 1: Main landing page and CSS loading');
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    if (!fs.existsSync('screenshots')) {
      fs.mkdirSync('screenshots');
    }
    await page.screenshot({ path: 'screenshots/01-landing-page.png', fullPage: true });
    
    // Check page title
    const title = await page.title();
    console.log(`✅ Page title: ${title}`);
    
    // Check for basic styling
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        fontFamily: styles.fontFamily,
        backgroundColor: styles.backgroundColor,
        margin: styles.margin
      };
    });
    console.log(`✅ Body styles loaded:`, bodyStyles);
    
    // Check for CSS framework (Tailwind)
    const hasTailwind = await page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets);
      return stylesheets.some(sheet => {
        try {
          return Array.from(sheet.cssRules).some(rule => 
            rule.cssText && rule.cssText.includes('tailwind')
          );
        } catch {
          return false;
        }
      });
    });
    console.log(`${hasTailwind ? '✅' : '⚠️'} Tailwind CSS: ${hasTailwind ? 'Detected' : 'Not detected'}`);

    console.log('\n🔐 Test 2: Supplier authentication flow');
    // Look for sign in elements
    const signInSelectors = [
      'text=/sign in/i',
      'text=/login/i',
      'a[href*="sign-in"]',
      'a[href*="login"]',
      'button:has-text("Sign In")',
      'button:has-text("Login")'
    ];
    
    let signInFound = false;
    for (const selector of signInSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0 && await element.isVisible()) {
          console.log(`✅ Found sign in button: ${selector}`);
          await element.click();
          await page.waitForLoadState('networkidle');
          await page.screenshot({ path: 'screenshots/02-supplier-auth.png', fullPage: true });
          
          const currentURL = page.url();
          console.log(`✅ Navigated to: ${currentURL}`);
          signInFound = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!signInFound) {
      console.log('⚠️ No sign in button found');
      await page.screenshot({ path: 'screenshots/02-no-signin.png', fullPage: true });
    }

    console.log('\n💑 Test 3: Couple signup flow');
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    
    // Look for couple-specific elements
    const coupleSelectors = [
      'text=/couples/i',
      'text=/for couples/i',
      'a[href*="couple"]',
      'a[href*="wedme"]',
      'button:has-text("Couples")'
    ];
    
    let coupleFound = false;
    for (const selector of coupleSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0 && await element.isVisible()) {
          console.log(`✅ Found couple signup: ${selector}`);
          await element.click();
          await page.waitForLoadState('networkidle');
          await page.screenshot({ path: 'screenshots/03-couple-signup.png', fullPage: true });
          
          const currentURL = page.url();
          console.log(`✅ Navigated to: ${currentURL}`);
          coupleFound = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!coupleFound) {
      console.log('⚠️ No couple signup found');
      await page.screenshot({ path: 'screenshots/03-no-couple-signup.png', fullPage: true });
    }

    console.log('\n🔍 Test 4: Testing common routes');
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
        const response = await page.goto(`http://localhost:3002${route}`);
        
        if (response) {
          const status = response.status();
          console.log(`${route}: ${status} ${status === 200 ? '✅' : status === 404 ? '❌' : '⚠️'}`);
          
          if (status === 200) {
            await page.waitForLoadState('networkidle');
            const routeName = route.replace(/\//g, '-') || 'root';
            await page.screenshot({ 
              path: `screenshots/04-route${routeName}.png`, 
              fullPage: true 
            });
          }
        }
      } catch (error) {
        console.log(`❌ Error testing route ${route}: ${error.message}`);
      }
    }

    console.log('\n📊 Summary Report');
    console.log('==================');
    console.log(`Total Console Messages: ${consoleMessages.length}`);
    console.log(`Total Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors Found:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No critical errors found');
    }
    
    // Check for failed network requests
    const failedRequests = [];
    page.on('response', (response) => {
      if (!response.ok() && (response.url().includes('.css') || response.url().includes('.js'))) {
        failedRequests.push(`${response.status()} - ${response.url()}`);
      }
    });
    
    if (failedRequests.length > 0) {
      console.log('\n❌ Failed Resource Requests:');
      failedRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req}`);
      });
    }
    
    console.log('\n📸 Screenshots saved to ./screenshots/');
    console.log('✅ Testing complete!');
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

// Run the test
testWedSyncRouting().catch(console.error);