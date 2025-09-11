const { chromium } = require('playwright');

async function quickTest() {
  console.log('🔍 Quick test of WedSync routes...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Test main page
  try {
    console.log('Testing http://localhost:3002...');
    const response = await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    console.log(`Main page: ${response.status()}`);
    
    if (response.status() === 200) {
      const title = await page.title();
      console.log(`✅ Title: ${title}`);
      
      // Check for major elements
      const content = await page.textContent('body');
      if (content.includes('WedSync') || content.includes('Wedding')) {
        console.log('✅ Content looks correct');
      } else {
        console.log('⚠️ Content might be missing');
      }
    }
    
  } catch (error) {
    console.log(`❌ Main page error: ${error.message}`);
  }

  // Test login page
  try {
    console.log('Testing http://localhost:3002/login...');
    const response = await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
    console.log(`Login page: ${response.status()}`);
    
    if (response.status() === 200) {
      // Look for login form
      const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
      const hasPasswordInput = await page.locator('input[type="password"]').count() > 0;
      console.log(`✅ Email input: ${hasEmailInput ? 'Found' : 'Missing'}`);
      console.log(`✅ Password input: ${hasPasswordInput ? 'Found' : 'Missing'}`);
    }
    
  } catch (error) {
    console.log(`❌ Login page error: ${error.message}`);
  }

  await browser.close();
  console.log('✅ Quick test complete');
}

quickTest().catch(console.error);