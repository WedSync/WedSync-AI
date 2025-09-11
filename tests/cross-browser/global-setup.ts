import { chromium, firefox, webkit, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup(config: FullConfig) {
  console.log('🌐 Starting Cross-Browser Timeline Testing Setup...');
  
  // Create necessary directories
  const testResultsDir = path.join(process.cwd(), 'test-results', 'cross-browser');
  const screenshotsDir = path.join(testResultsDir, 'screenshots');
  
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }
  
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  // Initialize browser compatibility tracking
  const compatibilityState = {
    startTime: new Date().toISOString(),
    browsers: {
      chromium: { installed: false, version: null, features: [] },
      firefox: { installed: false, version: null, features: [] },
      webkit: { installed: false, version: null, features: [] }
    },
    testEnvironment: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch
    },
    features: {
      dragDrop: { tested: false, results: {} },
      cssAnimations: { tested: false, results: {} },
      responsiveDesign: { tested: false, results: {} },
      keyboardNavigation: { tested: false, results: {} },
      touchEvents: { tested: false, results: {} }
    }
  };
  
  // Check browser availability and versions
  try {
    console.log('📦 Checking browser installations...');
    
    // Check Chromium
    try {
      const chromiumBrowser = await chromium.launch();
      const version = await chromiumBrowser.version();
      compatibilityState.browsers.chromium.installed = true;
      compatibilityState.browsers.chromium.version = version;
      await chromiumBrowser.close();
      console.log(`✅ Chromium ${version} available`);
    } catch (error) {
      console.log(`❌ Chromium not available: ${error}`);
    }
    
    // Check Firefox
    try {
      const firefoxBrowser = await firefox.launch();
      const version = await firefoxBrowser.version();
      compatibilityState.browsers.firefox.installed = true;
      compatibilityState.browsers.firefox.version = version;
      await firefoxBrowser.close();
      console.log(`✅ Firefox ${version} available`);
    } catch (error) {
      console.log(`❌ Firefox not available: ${error}`);
    }
    
    // Check WebKit (Safari)
    try {
      const webkitBrowser = await webkit.launch();
      const version = await webkitBrowser.version();
      compatibilityState.browsers.webkit.installed = true;
      compatibilityState.browsers.webkit.version = version;
      await webkitBrowser.close();
      console.log(`✅ WebKit ${version} available`);
    } catch (error) {
      console.log(`❌ WebKit not available: ${error}`);
    }
    
  } catch (error) {
    console.error('Error checking browser installations:', error);
  }
  
  // Save initial state
  const stateFile = path.join(testResultsDir, 'compatibility-state.json');
  fs.writeFileSync(stateFile, JSON.stringify(compatibilityState, null, 2));
  
  console.log('🚀 Cross-browser testing setup complete!');
  console.log(`📊 State saved to: ${stateFile}`);
  
  // Create browser-specific test data
  const browserTestData = {
    timeline: {
      events: [
        { id: 'event-1', title: 'Photography', start: '09:00', duration: 120, type: 'photo' },
        { id: 'event-2', title: 'Ceremony', start: '11:00', duration: 60, type: 'ceremony' },
        { id: 'event-3', title: 'Reception', start: '13:00', duration: 180, type: 'reception' },
        { id: 'event-4', title: 'Dancing', start: '16:00', duration: 120, type: 'entertainment' }
      ],
      conflicts: [
        { eventIds: ['event-1', 'event-2'], severity: 'high' },
        { eventIds: ['event-3', 'event-4'], severity: 'low' }
      ]
    },
    viewport: {
      desktop: { width: 1920, height: 1080 },
      tablet: { width: 1024, height: 768 },
      mobile: { width: 375, height: 667 }
    }
  };
  
  const testDataFile = path.join(testResultsDir, 'test-data.json');
  fs.writeFileSync(testDataFile, JSON.stringify(browserTestData, null, 2));
  
  return compatibilityState;
}

export default globalSetup;