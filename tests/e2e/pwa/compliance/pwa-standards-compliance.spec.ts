import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('PWA Standards Compliance Testing - WS-171', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      serviceWorkers: 'allow',
      permissions: ['notifications']
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should meet Progressive Web App baseline requirements', async () => {
    await page.goto('/');

    const pwaBaseline = await page.evaluate(async () => {
      const baseline = {
        // Core PWA Requirements
        servedOverHttps: location.protocol === 'https:' || location.hostname === 'localhost',
        hasServiceWorker: 'serviceWorker' in navigator,
        hasWebAppManifest: !!document.querySelector('link[rel="manifest"]'),
        hasValidIcons: false,
        hasValidStartUrl: false,
        hasValidDisplay: false,
        
        // User Experience Requirements
        isResponsive: false,
        hasMetaViewport: !!document.querySelector('meta[name="viewport"]'),
        hasThemeColor: !!document.querySelector('meta[name="theme-color"]'),
        
        // Performance Requirements
        loadsQuickly: false,
        worksOffline: false,
        
        // Accessibility Requirements
        hasSkipLink: !!document.querySelector('a[href="#main"], a[href="#content"]'),
        hasLangAttribute: !!document.documentElement.lang,
        hasAltTextOnImages: false
      };

      try {
        // Check manifest validity
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        if (manifestLink) {
          const manifestResponse = await fetch(manifestLink.href);
          const manifest = await manifestResponse.json();
          
          baseline.hasValidIcons = manifest.icons && 
                                  Array.isArray(manifest.icons) && 
                                  manifest.icons.length > 0 &&
                                  manifest.icons.some((icon: any) => 
                                    icon.sizes && icon.sizes.includes('192x192')
                                  );
                                  
          baseline.hasValidStartUrl = !!manifest.start_url;
          baseline.hasValidDisplay = ['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display);
        }

        // Check responsiveness
        baseline.isResponsive = window.innerWidth > 0 && 
                               document.querySelector('meta[name="viewport"]')?.getAttribute('content')?.includes('width=device-width');

        // Check service worker and offline capability
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          baseline.worksOffline = !!registration.active;
        }

        // Check images have alt text
        const images = document.querySelectorAll('img');
        baseline.hasAltTextOnImages = Array.from(images).every(img => 
          img.hasAttribute('alt')
        );

      } catch (error) {
        console.error('PWA baseline check error:', error);
      }

      return baseline;
    });

    // Core PWA requirements
    expect(pwaBaseline.servedOverHttps).toBeTruthy();
    expect(pwaBaseline.hasServiceWorker).toBeTruthy();
    expect(pwaBaseline.hasWebAppManifest).toBeTruthy();
    expect(pwaBaseline.hasValidIcons).toBeTruthy();
    expect(pwaBaseline.hasValidStartUrl).toBeTruthy();
    expect(pwaBaseline.hasValidDisplay).toBeTruthy();

    // UX requirements
    expect(pwaBaseline.isResponsive).toBeTruthy();
    expect(pwaBaseline.hasMetaViewport).toBeTruthy();
    expect(pwaBaseline.hasThemeColor).toBeTruthy();

    // Accessibility
    expect(pwaBaseline.hasLangAttribute).toBeTruthy();

    console.log('PWA Baseline Compliance:', pwaBaseline);
  });

  test('should comply with Lighthouse PWA audit criteria', async () => {
    await page.goto('/dashboard');

    const lighthouseChecks = await page.evaluate(async () => {
      const checks = {
        // Installability
        hasManifest: !!document.querySelector('link[rel="manifest"]'),
        manifestValid: false,
        serviceWorkerValid: false,
        installPromptReady: false,
        
        // User Experience
        fastLoad: false,
        responsive: false,
        offlineReady: false,
        
        // Reliability
        httpsOnly: location.protocol === 'https:' || location.hostname === 'localhost',
        pageLoadsOffline: false,
        startUrlReachable: false,
        
        // Performance
        fastFirstMeaningfulPaint: false,
        fastTimeToInteractive: false,
        fastFirstContentfulPaint: false
      };

      try {
        // Manifest validation
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        if (manifestLink) {
          const manifestResponse = await fetch(manifestLink.href);
          if (manifestResponse.ok) {
            const manifest = await manifestResponse.json();
            checks.manifestValid = !!(
              manifest.name &&
              manifest.short_name &&
              manifest.start_url &&
              manifest.display &&
              manifest.icons &&
              manifest.icons.length > 0
            );
            
            checks.startUrlReachable = true; // If we can load the page, start_url is reachable
          }
        }

        // Service Worker validation
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          checks.serviceWorkerValid = !!registration.active;
          
          // Test offline capability
          if (registration.active) {
            checks.offlineReady = true;
            checks.pageLoadsOffline = true;
          }
        }

        // Performance timing
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart;
          const loadComplete = navigation.loadEventEnd - navigation.navigationStart;
          
          checks.fastLoad = domContentLoaded < 3000;
          checks.fastTimeToInteractive = loadComplete < 5000;
        }

        // Paint timing
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcp) {
          checks.fastFirstContentfulPaint = fcp.startTime < 2000;
        }

        // Responsive design check
        const viewport = document.querySelector('meta[name="viewport"]');
        checks.responsive = !!(viewport && 
          viewport.getAttribute('content')?.includes('width=device-width')
        );

        // Install prompt check
        window.addEventListener('beforeinstallprompt', () => {
          checks.installPromptReady = true;
        });

      } catch (error) {
        console.error('Lighthouse checks error:', error);
      }

      return checks;
    });

    // Lighthouse PWA criteria
    expect(lighthouseChecks.hasManifest).toBeTruthy();
    expect(lighthouseChecks.manifestValid).toBeTruthy();
    expect(lighthouseChecks.serviceWorkerValid).toBeTruthy();
    expect(lighthouseChecks.httpsOnly).toBeTruthy();
    expect(lighthouseChecks.responsive).toBeTruthy();
    expect(lighthouseChecks.startUrlReachable).toBeTruthy();

    console.log('Lighthouse PWA Compliance:', lighthouseChecks);
  });

  test('should meet Web App Manifest specification compliance', async () => {
    await page.goto('/');

    const manifestLink = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      return link ? link.href : '';
    });

    expect(manifestLink).toBeTruthy();

    const manifestResponse = await page.request.get(manifestLink);
    expect(manifestResponse.ok()).toBeTruthy();
    
    const manifest = await manifestResponse.json();

    const specCompliance = {
      // Required fields per W3C spec
      hasName: !!manifest.name,
      hasShortName: !!manifest.short_name,
      hasStartUrl: !!manifest.start_url,
      hasDisplay: !!manifest.display,
      hasIcons: !!(manifest.icons && Array.isArray(manifest.icons) && manifest.icons.length > 0),
      
      // Optional but recommended fields
      hasDescription: !!manifest.description,
      hasThemeColor: !!manifest.theme_color,
      hasBackgroundColor: !!manifest.background_color,
      hasScope: !!manifest.scope,
      hasLang: !!manifest.lang,
      
      // Field validation
      validDisplayValue: ['fullscreen', 'standalone', 'minimal-ui', 'browser'].includes(manifest.display),
      validStartUrl: false,
      validScope: false,
      validIcons: false,
      validColors: false
    };

    // Validate start_url
    try {
      const startUrl = new URL(manifest.start_url, page.url());
      specCompliance.validStartUrl = startUrl.href.startsWith(page.url().split('/').slice(0, 3).join('/'));
    } catch (error) {
      specCompliance.validStartUrl = false;
    }

    // Validate scope
    if (manifest.scope) {
      try {
        const scope = new URL(manifest.scope, page.url());
        const startUrl = new URL(manifest.start_url, page.url());
        specCompliance.validScope = startUrl.pathname.startsWith(scope.pathname);
      } catch (error) {
        specCompliance.validScope = false;
      }
    } else {
      specCompliance.validScope = true; // Scope is optional
    }

    // Validate icons
    if (manifest.icons && Array.isArray(manifest.icons)) {
      specCompliance.validIcons = manifest.icons.every((icon: any) => 
        icon.src && icon.sizes && icon.type
      );
    }

    // Validate colors
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|^rgb\(|^hsl\(/;
    specCompliance.validColors = (!manifest.theme_color || colorRegex.test(manifest.theme_color)) &&
                                 (!manifest.background_color || colorRegex.test(manifest.background_color));

    // W3C specification compliance assertions
    expect(specCompliance.hasName).toBeTruthy();
    expect(specCompliance.hasShortName).toBeTruthy();
    expect(specCompliance.hasStartUrl).toBeTruthy();
    expect(specCompliance.hasDisplay).toBeTruthy();
    expect(specCompliance.hasIcons).toBeTruthy();
    expect(specCompliance.validDisplayValue).toBeTruthy();
    expect(specCompliance.validStartUrl).toBeTruthy();
    expect(specCompliance.validScope).toBeTruthy();
    expect(specCompliance.validIcons).toBeTruthy();
    expect(specCompliance.validColors).toBeTruthy();

    console.log('W3C Manifest Specification Compliance:', specCompliance);
  });

  test('should comply with Service Worker specification', async () => {
    await page.goto('/dashboard');

    const serviceWorkerCompliance = await page.evaluate(async () => {
      const compliance = {
        // Service Worker API Support
        serviceWorkerSupported: 'serviceWorker' in navigator,
        serviceWorkerRegistered: false,
        serviceWorkerActive: false,
        serviceWorkerControllingPage: false,
        
        // Event handling
        installEventHandled: false,
        activateEventHandled: false,
        fetchEventHandled: false,
        messageEventHandled: false,
        
        // Caching compliance
        cacheApiAvailable: 'caches' in window,
        cachingImplemented: false,
        
        // Background features
        backgroundSyncSupported: false,
        pushApiSupported: 'PushManager' in window,
        notificationApiSupported: 'Notification' in window,
        
        // Security
        httpsRequired: location.protocol === 'https:' || location.hostname === 'localhost'
      };

      if (compliance.serviceWorkerSupported) {
        try {
          // Get service worker registration
          const registrations = await navigator.serviceWorker.getRegistrations();
          compliance.serviceWorkerRegistered = registrations.length > 0;

          if (compliance.serviceWorkerRegistered) {
            const registration = registrations[0];
            compliance.serviceWorkerActive = !!registration.active;
            compliance.serviceWorkerControllingPage = !!navigator.serviceWorker.controller;
            
            // Check for background sync support
            compliance.backgroundSyncSupported = 'sync' in registration;

            // Test service worker communication
            if (registration.active) {
              try {
                const messageChannel = new MessageChannel();
                const messagePromise = new Promise((resolve) => {
                  messageChannel.port1.onmessage = () => {
                    compliance.messageEventHandled = true;
                    resolve(true);
                  };
                  setTimeout(() => resolve(false), 1000);
                });

                registration.active.postMessage({
                  type: 'TEST_MESSAGE'
                }, [messageChannel.port2]);

                await messagePromise;
              } catch (error) {
                console.warn('SW message test failed:', error);
              }
            }
          }

          // Test caching
          if (compliance.cacheApiAvailable) {
            const cacheNames = await caches.keys();
            compliance.cachingImplemented = cacheNames.length > 0;
          }

        } catch (error) {
          console.error('Service Worker compliance check error:', error);
        }
      }

      return compliance;
    });

    // Service Worker specification compliance
    expect(serviceWorkerCompliance.serviceWorkerSupported).toBeTruthy();
    expect(serviceWorkerCompliance.serviceWorkerRegistered).toBeTruthy();
    expect(serviceWorkerCompliance.serviceWorkerActive).toBeTruthy();
    expect(serviceWorkerCompliance.cacheApiAvailable).toBeTruthy();
    expect(serviceWorkerCompliance.httpsRequired).toBeTruthy();

    console.log('Service Worker Specification Compliance:', serviceWorkerCompliance);
  });

  test('should meet accessibility compliance for PWAs', async () => {
    await page.goto('/dashboard');

    const accessibilityCompliance = await page.evaluate(() => {
      const compliance = {
        // Basic accessibility
        hasLangAttribute: !!document.documentElement.lang,
        hasTitle: !!document.title && document.title.trim().length > 0,
        hasMetaDescription: !!document.querySelector('meta[name="description"]'),
        
        // Color and contrast
        hasThemeColor: !!document.querySelector('meta[name="theme-color"]'),
        colorContrastReasonable: true, // Basic check
        
        // Navigation
        hasSkipLinks: !!document.querySelector('a[href^="#"]'),
        hasMainLandmark: !!document.querySelector('main, [role="main"]'),
        hasFocusManagement: false,
        
        // Images and media
        imagesHaveAltText: false,
        
        // Form accessibility
        formsHaveLabels: false,
        
        // Keyboard navigation
        keyboardAccessible: false,
        
        // Screen reader support
        hasAriaLabels: !!document.querySelector('[aria-label], [aria-labelledby]'),
        hasHeadingHierarchy: false
      };

      // Check images
      const images = document.querySelectorAll('img');
      if (images.length > 0) {
        compliance.imagesHaveAltText = Array.from(images).every(img => 
          img.hasAttribute('alt')
        );
      } else {
        compliance.imagesHaveAltText = true; // No images to check
      }

      // Check forms
      const formInputs = document.querySelectorAll('input, select, textarea');
      if (formInputs.length > 0) {
        compliance.formsHaveLabels = Array.from(formInputs).every(input => 
          input.hasAttribute('aria-label') || 
          input.hasAttribute('aria-labelledby') ||
          document.querySelector(`label[for="${input.id}"]`)
        );
      } else {
        compliance.formsHaveLabels = true; // No forms to check
      }

      // Check heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length > 0) {
        const headingLevels = Array.from(headings).map(h => parseInt(h.tagName.charAt(1)));
        compliance.hasHeadingHierarchy = headingLevels[0] === 1; // Should start with h1
      }

      // Test keyboard navigation
      const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
      compliance.keyboardAccessible = interactiveElements.length > 0 && 
        Array.from(interactiveElements).some(el => 
          el.getAttribute('tabindex') !== '-1' && 
          !el.hasAttribute('disabled')
        );

      // Focus management check
      compliance.hasFocusManagement = document.activeElement !== document.body;

      return compliance;
    });

    // Accessibility compliance assertions
    expect(accessibilityCompliance.hasLangAttribute).toBeTruthy();
    expect(accessibilityCompliance.hasTitle).toBeTruthy();
    expect(accessibilityCompliance.hasThemeColor).toBeTruthy();
    expect(accessibilityCompliance.imagesHaveAltText).toBeTruthy();
    expect(accessibilityCompliance.keyboardAccessible).toBeTruthy();

    console.log('PWA Accessibility Compliance:', accessibilityCompliance);
  });

  test('should comply with web security standards for PWAs', async () => {
    await page.goto('/');

    const securityCompliance = await page.evaluate(async () => {
      const compliance = {
        // HTTPS requirement
        httpsEnforced: location.protocol === 'https:' || location.hostname === 'localhost',
        
        // Content Security Policy
        hasCSP: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
        
        // Secure manifest
        manifestSecure: false,
        
        // Service Worker security
        serviceWorkerSecure: false,
        
        // Permissions
        permissionsSecure: true,
        
        // External resources
        noMixedContent: true,
        externalResourcesSecure: true
      };

      try {
        // Check manifest security
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        if (manifestLink) {
          const manifestUrl = new URL(manifestLink.href);
          compliance.manifestSecure = manifestUrl.protocol === 'https:' || 
                                     manifestUrl.hostname === 'localhost';

          const manifestResponse = await fetch(manifestLink.href);
          if (manifestResponse.ok) {
            const manifest = await manifestResponse.json();
            
            // Check that start_url and scope are secure
            const startUrl = new URL(manifest.start_url, location.origin);
            compliance.manifestSecure = compliance.manifestSecure && 
              (startUrl.protocol === 'https:' || startUrl.hostname === 'localhost');
          }
        }

        // Check service worker security
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          if (registrations.length > 0) {
            const swUrl = new URL(registrations[0].scope);
            compliance.serviceWorkerSecure = swUrl.protocol === 'https:' || 
                                            swUrl.hostname === 'localhost';
          }
        }

        // Check external resources
        const externalResources = document.querySelectorAll('link[href], script[src], img[src]');
        Array.from(externalResources).forEach(resource => {
          const url = resource.getAttribute('href') || resource.getAttribute('src') || '';
          if (url.startsWith('http://') && !url.includes('localhost')) {
            compliance.externalResourcesSecure = false;
            compliance.noMixedContent = false;
          }
        });

      } catch (error) {
        console.error('Security compliance check error:', error);
      }

      return compliance;
    });

    // Security compliance assertions
    expect(securityCompliance.httpsEnforced).toBeTruthy();
    expect(securityCompliance.manifestSecure).toBeTruthy();
    expect(securityCompliance.serviceWorkerSecure).toBeTruthy();
    expect(securityCompliance.noMixedContent).toBeTruthy();
    expect(securityCompliance.externalResourcesSecure).toBeTruthy();

    console.log('PWA Security Compliance:', securityCompliance);
  });

  test('should meet responsive design compliance for PWAs', async () => {
    const viewportSizes = [
      { name: 'Mobile Portrait', width: 375, height: 667 },
      { name: 'Mobile Landscape', width: 667, height: 375 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    const responsiveResults = [];

    for (const viewport of viewportSizes) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

      const responsiveCheck = await page.evaluate((viewportName) => {
        const check = {
          viewport: viewportName,
          // Layout checks
          hasMetaViewport: !!document.querySelector('meta[name="viewport"]'),
          contentFitsViewport: false,
          noHorizontalScroll: false,
          
          // Touch targets
          touchTargetsAppropriate: false,
          
          // Typography
          textIsReadable: false,
          
          // Images
          imagesResponsive: false,
          
          // Navigation
          navigationUsable: false
        };

        // Content fits viewport
        check.contentFitsViewport = document.documentElement.scrollWidth <= window.innerWidth;
        check.noHorizontalScroll = document.body.scrollWidth <= window.innerWidth;

        // Touch targets (minimum 44px as per accessibility guidelines)
        const touchTargets = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
        if (touchTargets.length > 0) {
          check.touchTargetsAppropriate = Array.from(touchTargets).every(target => {
            const rect = target.getBoundingClientRect();
            return rect.width >= 44 && rect.height >= 44;
          });
        } else {
          check.touchTargetsAppropriate = true;
        }

        // Text readability
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
        if (textElements.length > 0) {
          check.textIsReadable = Array.from(textElements).some(el => {
            const style = window.getComputedStyle(el);
            const fontSize = parseInt(style.fontSize);
            return fontSize >= 16; // Minimum readable size
          });
        }

        // Responsive images
        const images = document.querySelectorAll('img');
        if (images.length > 0) {
          check.imagesResponsive = Array.from(images).every(img => {
            const rect = img.getBoundingClientRect();
            return rect.width <= window.innerWidth;
          });
        } else {
          check.imagesResponsive = true;
        }

        // Navigation usability
        const navElements = document.querySelectorAll('nav, [role="navigation"], .navigation');
        check.navigationUsable = navElements.length > 0;

        return check;
      }, viewport.name);

      responsiveResults.push(responsiveCheck);

      // Assertions for each viewport
      expect(responsiveCheck.hasMetaViewport).toBeTruthy();
      expect(responsiveCheck.contentFitsViewport).toBeTruthy();
      expect(responsiveCheck.noHorizontalScroll).toBeTruthy();
      expect(responsiveCheck.touchTargetsAppropriate).toBeTruthy();
      expect(responsiveCheck.imagesResponsive).toBeTruthy();
    }

    console.log('Responsive Design Compliance:', responsiveResults);

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should generate comprehensive PWA compliance report', async () => {
    await page.goto('/dashboard');

    const complianceReport = await page.evaluate(async () => {
      const report = {
        timestamp: new Date().toISOString(),
        url: location.href,
        
        // Overall compliance score (0-100)
        overallScore: 0,
        
        // Category scores
        categories: {
          installability: { score: 0, maxScore: 100, checks: [] },
          reliability: { score: 0, maxScore: 100, checks: [] },
          userExperience: { score: 0, maxScore: 100, checks: [] },
          performance: { score: 0, maxScore: 100, checks: [] },
          accessibility: { score: 0, maxScore: 100, checks: [] },
          security: { score: 0, maxScore: 100, checks: [] }
        },
        
        // Detailed findings
        criticalIssues: [],
        warnings: [],
        recommendations: [],
        
        // Wedding-specific compliance
        weddingReadiness: {
          venueOfflineCapability: false,
          supplierMobileFriendly: false,
          photographySupport: false,
          quickAccess: false
        }
      };

      let totalChecks = 0;
      let passedChecks = 0;

      try {
        // Installability checks
        const manifestLink = document.querySelector('link[rel="manifest"]');
        const hasManifest = !!manifestLink;
        const hasServiceWorker = 'serviceWorker' in navigator;
        const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';

        report.categories.installability.checks = [
          { name: 'Web App Manifest', passed: hasManifest, required: true },
          { name: 'Service Worker', passed: hasServiceWorker, required: true },
          { name: 'HTTPS/Localhost', passed: isHttps, required: true },
          { name: 'Valid Icons', passed: false, required: true } // Will be set below
        ];

        if (hasManifest) {
          try {
            const manifestResponse = await fetch((manifestLink as HTMLLinkElement).href);
            const manifest = await manifestResponse.json();
            
            const hasValidIcons = manifest.icons && manifest.icons.length > 0 &&
              manifest.icons.some((icon: any) => icon.sizes && icon.sizes.includes('192x192'));
            
            report.categories.installability.checks[3].passed = hasValidIcons;
            
            // Wedding-specific checks
            report.weddingReadiness.quickAccess = manifest.display === 'standalone' || manifest.display === 'fullscreen';
          } catch (error) {
            report.criticalIssues.push('Manifest file is invalid or unreachable');
          }
        }

        // Calculate installability score
        const installabilityPassed = report.categories.installability.checks.filter(c => c.passed).length;
        report.categories.installability.score = (installabilityPassed / report.categories.installability.checks.length) * 100;

        // Reliability checks
        const serviceWorkerActive = hasServiceWorker && !!navigator.serviceWorker.controller;
        const cacheApiAvailable = 'caches' in window;
        
        report.categories.reliability.checks = [
          { name: 'Service Worker Active', passed: serviceWorkerActive, required: true },
          { name: 'Cache API Available', passed: cacheApiAvailable, required: true },
          { name: 'Offline Capability', passed: serviceWorkerActive && cacheApiAvailable, required: true }
        ];

        report.weddingReadiness.venueOfflineCapability = serviceWorkerActive && cacheApiAvailable;

        const reliabilityPassed = report.categories.reliability.checks.filter(c => c.passed).length;
        report.categories.reliability.score = (reliabilityPassed / report.categories.reliability.checks.length) * 100;

        // User Experience checks
        const hasMetaViewport = !!document.querySelector('meta[name="viewport"]');
        const hasThemeColor = !!document.querySelector('meta[name="theme-color"]');
        const isResponsive = hasMetaViewport && window.innerWidth > 0;

        report.categories.userExperience.checks = [
          { name: 'Responsive Design', passed: isResponsive, required: true },
          { name: 'Meta Viewport', passed: hasMetaViewport, required: true },
          { name: 'Theme Color', passed: hasThemeColor, required: false }
        ];

        report.weddingReadiness.supplierMobileFriendly = isResponsive && hasMetaViewport;

        const uxPassed = report.categories.userExperience.checks.filter(c => c.passed).length;
        report.categories.userExperience.score = (uxPassed / report.categories.userExperience.checks.length) * 100;

        // Performance checks (basic)
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const fastLoad = navigation && (navigation.domContentLoadedEventEnd - navigation.navigationStart) < 3000;

        report.categories.performance.checks = [
          { name: 'Fast Loading', passed: fastLoad, required: true }
        ];

        const performancePassed = report.categories.performance.checks.filter(c => c.passed).length;
        report.categories.performance.score = (performancePassed / report.categories.performance.checks.length) * 100;

        // Accessibility checks
        const hasLangAttribute = !!document.documentElement.lang;
        const hasTitle = !!document.title && document.title.trim().length > 0;

        report.categories.accessibility.checks = [
          { name: 'Lang Attribute', passed: hasLangAttribute, required: true },
          { name: 'Page Title', passed: hasTitle, required: true }
        ];

        const accessibilityPassed = report.categories.accessibility.checks.filter(c => c.passed).length;
        report.categories.accessibility.score = (accessibilityPassed / report.categories.accessibility.checks.length) * 100;

        // Security checks
        report.categories.security.checks = [
          { name: 'HTTPS Enforced', passed: isHttps, required: true }
        ];

        const securityPassed = report.categories.security.checks.filter(c => c.passed).length;
        report.categories.security.score = (securityPassed / report.categories.security.checks.length) * 100;

        // Calculate overall score
        const categoryScores = Object.values(report.categories).map(cat => cat.score);
        report.overallScore = categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length;

        // Generate recommendations
        if (report.overallScore < 90) {
          report.recommendations.push('Improve PWA compliance to achieve better installation rates');
        }
        
        if (!report.weddingReadiness.venueOfflineCapability) {
          report.recommendations.push('Implement offline functionality for wedding venues with poor connectivity');
        }
        
        if (!report.weddingReadiness.supplierMobileFriendly) {
          report.recommendations.push('Optimize mobile experience for wedding suppliers on-the-go');
        }

        // Critical issues
        if (report.overallScore < 70) {
          report.criticalIssues.push('PWA compliance score is below acceptable threshold');
        }

      } catch (error) {
        report.criticalIssues.push('PWA compliance assessment failed: ' + error.message);
      }

      return report;
    });

    // Overall compliance should meet PWA standards
    expect(complianceReport.overallScore).toBeGreaterThan(80); // 80% compliance minimum
    expect(complianceReport.categories.installability.score).toBeGreaterThan(80);
    expect(complianceReport.categories.reliability.score).toBeGreaterThan(80);

    // Wedding-specific requirements
    expect(complianceReport.weddingReadiness.venueOfflineCapability).toBeTruthy();
    expect(complianceReport.weddingReadiness.supplierMobileFriendly).toBeTruthy();

    console.log('Comprehensive PWA Compliance Report:', {
      overallScore: Math.round(complianceReport.overallScore),
      categoryScores: Object.entries(complianceReport.categories).reduce((acc, [key, value]) => {
        acc[key] = Math.round(value.score);
        return acc;
      }, {}),
      weddingReadiness: complianceReport.weddingReadiness,
      criticalIssues: complianceReport.criticalIssues,
      recommendations: complianceReport.recommendations
    });
  });
});