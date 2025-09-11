/**
 * Global setup for WedSync Demo Mode tests
 * Ensures demo environment is ready before tests run
 */

import { chromium, FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up WedSync Demo Mode tests...');

  // Set demo mode environment
  process.env.NEXT_PUBLIC_DEMO_MODE = 'true';

  try {
    // Check if demo assets exist
    console.log('📦 Checking demo assets...');
    const { stdout: assetCheck } = await execAsync('npm run demo:assets:check');
    console.log(assetCheck);

    // Setup demo database if needed
    console.log('🗄️  Setting up demo database...');
    try {
      await execAsync('npm run db:migrate:demo');
      await execAsync('npm run db:seed:demo');
      console.log('✅ Demo database setup complete');
    } catch (error) {
      console.warn('⚠️  Database setup warning:', error);
      console.log('   Continuing with tests - database may be already set up');
    }

    // Verify demo configuration
    console.log('⚙️  Verifying demo configuration...');
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Quick health check
      await page.goto('http://localhost:3000/demo', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Check if demo page loads
      const title = await page.title();
      if (!title.includes('WedSync')) {
        throw new Error('Demo page did not load correctly');
      }

      console.log('✅ Demo health check passed');
    } catch (error) {
      console.error('❌ Demo health check failed:', error);
      throw error;
    } finally {
      await browser.close();
    }

    // Generate test URLs for reference
    console.log('🔗 Demo test URLs:');
    console.log('   Main: http://localhost:3000/demo');
    console.log('   Photographer: http://localhost:3000/demo?persona=photographer-everlight');
    console.log('   Couple: http://localhost:3000/demo?persona=couple-sarah-michael');
    console.log('   Screenshot: http://localhost:3000/demo?screenshot=1');

    console.log('🎉 Demo setup complete - ready for testing!');

  } catch (error) {
    console.error('❌ Demo setup failed:', error);
    throw error;
  }
}

export default globalSetup;