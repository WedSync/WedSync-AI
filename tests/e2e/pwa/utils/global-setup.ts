/**
 * PWA Test Suite Global Setup - WS-171
 * Initializes test environment for comprehensive PWA testing
 */

import { chromium, firefox, webkit, FullConfig } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting PWA Test Suite Global Setup...\n');
  
  const setupResults = {
    timestamp: new Date().toISOString(),
    baseURL: config.projects[0]?.use?.baseURL || 'http://localhost:3000',
    browsers: {
      chromium: { available: false, version: '' },
      firefox: { available: false, version: '' },
      webkit: { available: false, version: '' }
    },
    testEnvironment: {
      serviceWorkerSupport: false,
      cacheAPISupport: false,
      backgroundSyncSupport: false,
      pushAPISupport: false,
      manifestSupport: false
    },
    weddingSyncApp: {
      reachable: false,
      manifestValid: false,
      serviceWorkerActive: false,
      pwaCompliant: false
    },
    setupErrors: []
  };

  try {
    // Create test output directories
    const directories = [
      'test-results',
      'test-results/pwa-artifacts',
      'test-results/screenshots',
      'test-results/videos',
      'playwright-report/pwa-tests'
    ];

    directories.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });

    // Test browser availability
    console.log('🌐 Testing browser availability...');
    
    // Chromium
    try {
      const chromiumBrowser = await chromium.launch({ headless: true });
      const chromiumVersion = chromiumBrowser.version();
      await chromiumBrowser.close();
      setupResults.browsers.chromium = { available: true, version: chromiumVersion };
      console.log(`✅ Chromium available: ${chromiumVersion}`);
    } catch (error) {
      console.log(`❌ Chromium not available: ${error.message}`);
      setupResults.setupErrors.push(`Chromium: ${error.message}`);
    }

    // Firefox
    try {
      const firefoxBrowser = await firefox.launch({ headless: true });
      const firefoxVersion = firefoxBrowser.version();
      await firefoxBrowser.close();
      setupResults.browsers.firefox = { available: true, version: firefoxVersion };
      console.log(`✅ Firefox available: ${firefoxVersion}`);
    } catch (error) {
      console.log(`❌ Firefox not available: ${error.message}`);
      setupResults.setupErrors.push(`Firefox: ${error.message}`);
    }

    // WebKit
    try {
      const webkitBrowser = await webkit.launch({ headless: true });
      const webkitVersion = webkitBrowser.version();
      await webkitBrowser.close();
      setupResults.browsers.webkit = { available: true, version: webkitVersion };
      console.log(`✅ WebKit available: ${webkitVersion}`);
    } catch (error) {
      console.log(`❌ WebKit not available: ${error.message}`);
      setupResults.setupErrors.push(`WebKit: ${error.message}`);
    }

    // Test application and PWA features
    console.log('\n🔍 Testing WedSync PWA features...');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ 
      serviceWorkers: 'allow',
      permissions: ['notifications'] 
    });
    const page = await context.newPage();

    try {
      // Test application reachability
      const response = await page.goto(setupResults.baseURL, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      
      if (response && response.ok()) {
        setupResults.weddingSyncApp.reachable = true;
        console.log('✅ WedSync application reachable');

        // Test PWA features
        const pwaFeatures = await page.evaluate(async () => {
          const features = {
            serviceWorkerSupport: 'serviceWorker' in navigator,
            cacheAPISupport: 'caches' in window,
            backgroundSyncSupport: false,
            pushAPISupport: 'PushManager' in window,
            manifestSupport: !!document.querySelector('link[rel="manifest"]'),
            manifestValid: false,
            serviceWorkerActive: false
          };

          // Test background sync
          if ('serviceWorker' in navigator) {
            try {
              const registration = await navigator.serviceWorker.ready;
              features.backgroundSyncSupport = 'sync' in registration;
              features.serviceWorkerActive = !!registration.active;
            } catch (error) {
              console.warn('Service worker check failed:', error);
            }
          }

          // Test manifest validity
          if (features.manifestSupport) {
            try {
              const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
              const manifestResponse = await fetch(manifestLink.href);
              if (manifestResponse.ok) {
                const manifest = await manifestResponse.json();
                features.manifestValid = !!(manifest.name && manifest.icons && manifest.start_url);
              }
            } catch (error) {
              console.warn('Manifest check failed:', error);
            }
          }

          return features;
        });

        // Update setup results with PWA feature test results
        setupResults.testEnvironment = {
          serviceWorkerSupport: pwaFeatures.serviceWorkerSupport,
          cacheAPISupport: pwaFeatures.cacheAPISupport,
          backgroundSyncSupport: pwaFeatures.backgroundSyncSupport,
          pushAPISupport: pwaFeatures.pushAPISupport,
          manifestSupport: pwaFeatures.manifestSupport
        };

        setupResults.weddingSyncApp = {
          reachable: true,
          manifestValid: pwaFeatures.manifestValid,
          serviceWorkerActive: pwaFeatures.serviceWorkerActive,
          pwaCompliant: pwaFeatures.serviceWorkerSupport && 
                        pwaFeatures.cacheAPISupport && 
                        pwaFeatures.manifestValid
        };

        console.log(`✅ Service Worker support: ${pwaFeatures.serviceWorkerSupport}`);
        console.log(`✅ Cache API support: ${pwaFeatures.cacheAPISupport}`);
        console.log(`✅ Background Sync support: ${pwaFeatures.backgroundSyncSupport}`);
        console.log(`✅ Push API support: ${pwaFeatures.pushAPISupport}`);
        console.log(`✅ Manifest present: ${pwaFeatures.manifestSupport}`);
        console.log(`✅ Manifest valid: ${pwaFeatures.manifestValid}`);
        console.log(`✅ Service Worker active: ${pwaFeatures.serviceWorkerActive}`);
        console.log(`✅ PWA compliant: ${setupResults.weddingSyncApp.pwaCompliant}`);

      } else {
        throw new Error(`Application returned ${response?.status()} status`);
      }

    } catch (error) {
      console.log(`❌ Application test failed: ${error.message}`);
      setupResults.setupErrors.push(`Application: ${error.message}`);
      setupResults.weddingSyncApp.reachable = false;
    }

    await context.close();
    await browser.close();

    // Generate setup report
    const setupReportPath = join('test-results', 'pwa-setup-report.json');
    writeFileSync(setupReportPath, JSON.stringify(setupResults, null, 2));
    console.log(`\n📊 Setup report saved to: ${setupReportPath}`);

    // Check for critical setup issues
    const criticalIssues = [];
    
    if (!setupResults.browsers.chromium.available) {
      criticalIssues.push('Chromium browser not available - core PWA tests may fail');
    }
    
    if (!setupResults.weddingSyncApp.reachable) {
      criticalIssues.push('WedSync application not reachable - all tests will fail');
    }
    
    if (!setupResults.weddingSyncApp.pwaCompliant) {
      criticalIssues.push('Application is not PWA compliant - PWA tests may fail');
    }

    if (criticalIssues.length > 0) {
      console.log('\n⚠️  Critical Setup Issues:');
      criticalIssues.forEach(issue => console.log(`   - ${issue}`));
    }

    // Create test environment summary
    const envSummary = `
PWA Test Environment Summary
============================
Timestamp: ${setupResults.timestamp}
Base URL: ${setupResults.baseURL}

Browser Support:
- Chromium: ${setupResults.browsers.chromium.available ? '✅' : '❌'} ${setupResults.browsers.chromium.version}
- Firefox: ${setupResults.browsers.firefox.available ? '✅' : '❌'} ${setupResults.browsers.firefox.version}  
- WebKit: ${setupResults.browsers.webkit.available ? '✅' : '❌'} ${setupResults.browsers.webkit.version}

PWA Features:
- Service Workers: ${setupResults.testEnvironment.serviceWorkerSupport ? '✅' : '❌'}
- Cache API: ${setupResults.testEnvironment.cacheAPISupport ? '✅' : '❌'}
- Background Sync: ${setupResults.testEnvironment.backgroundSyncSupport ? '✅' : '❌'}
- Push API: ${setupResults.testEnvironment.pushAPISupport ? '✅' : '❌'}
- Web App Manifest: ${setupResults.testEnvironment.manifestSupport ? '✅' : '❌'}

Application Status:
- Reachable: ${setupResults.weddingSyncApp.reachable ? '✅' : '❌'}
- Manifest Valid: ${setupResults.weddingSyncApp.manifestValid ? '✅' : '❌'}
- Service Worker Active: ${setupResults.weddingSyncApp.serviceWorkerActive ? '✅' : '❌'}
- PWA Compliant: ${setupResults.weddingSyncApp.pwaCompliant ? '✅' : '❌'}

Setup Errors: ${setupResults.setupErrors.length}
${setupResults.setupErrors.map(error => `- ${error}`).join('\n')}
`;

    writeFileSync(join('test-results', 'environment-summary.txt'), envSummary);
    console.log(envSummary);

    if (criticalIssues.length > 0) {
      console.log('⚠️  Setup completed with warnings. Some tests may fail.\n');
    } else {
      console.log('✅ PWA Test Suite setup completed successfully!\n');
    }

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    setupResults.setupErrors.push(`Global setup: ${error.message}`);
    
    // Save error report
    writeFileSync(
      join('test-results', 'pwa-setup-error.json'), 
      JSON.stringify({ error: error.message, stack: error.stack, setupResults }, null, 2)
    );
    
    throw error;
  }
}

export default globalSetup;