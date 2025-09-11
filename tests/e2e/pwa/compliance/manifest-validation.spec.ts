import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('PWA Manifest Validation and Compliance - WS-171', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      serviceWorkers: 'allow'
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should have valid Web App Manifest structure', async () => {
    await page.goto('/');
    
    // Check if manifest is linked in HTML
    const manifestLink = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      return link ? {
        href: link.href,
        exists: true
      } : { exists: false };
    });

    expect(manifestLink.exists).toBeTruthy();
    expect(manifestLink.href).toContain('manifest.json');

    // Fetch and validate manifest content
    const manifestResponse = await page.request.get(manifestLink.href);
    expect(manifestResponse.ok()).toBeTruthy();
    
    const manifest = await manifestResponse.json();

    // Required PWA manifest fields
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBeDefined();
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Wedding-specific validation
    expect(manifest.name).toContain('WedSync');
    expect(manifest.description).toContain('wedding');

    console.log('Manifest Structure Validation:', {
      name: manifest.name,
      shortName: manifest.short_name,
      startUrl: manifest.start_url,
      display: manifest.display,
      iconCount: manifest.icons?.length || 0,
      hasThemeColor: !!manifest.theme_color,
      hasBackgroundColor: !!manifest.background_color
    });
  });

  test('should validate required icon specifications', async () => {
    await page.goto('/');
    
    const manifestLink = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      return link ? link.href : '';
    });

    const manifestResponse = await page.request.get(manifestLink);
    const manifest = await manifestResponse.json();

    // Icon validation
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBeTruthy();

    const requiredIconSizes = ['192x192', '512x512'];
    const iconSizes = manifest.icons.map((icon: any) => icon.sizes);
    
    requiredIconSizes.forEach(size => {
      expect(iconSizes.some((iconSize: string) => iconSize.includes(size)))
        .toBeTruthy();
    });

    // Validate icon formats and accessibility
    const iconValidation = await Promise.all(
      manifest.icons.map(async (icon: any) => {
        try {
          const iconResponse = await page.request.get(icon.src);
          return {
            src: icon.src,
            sizes: icon.sizes,
            type: icon.type,
            exists: iconResponse.ok(),
            contentType: iconResponse.headers()['content-type'] || ''
          };
        } catch (error) {
          return {
            src: icon.src,
            sizes: icon.sizes,
            type: icon.type,
            exists: false,
            error: error.message
          };
        }
      })
    );

    // All icons should exist and be valid
    iconValidation.forEach(icon => {
      expect(icon.exists).toBeTruthy();
      expect(icon.contentType).toMatch(/image\/(png|jpeg|webp|svg)/);
    });

    // Check for maskable icons (Android adaptive icons)
    const hasMaskableIcon = manifest.icons.some((icon: any) => 
      icon.purpose && icon.purpose.includes('maskable')
    );

    console.log('Icon Validation Results:', {
      totalIcons: manifest.icons.length,
      requiredSizesPresent: requiredIconSizes.every(size => 
        iconSizes.some((iconSize: string) => iconSize.includes(size))
      ),
      hasMaskableIcon,
      iconDetails: iconValidation
    });
  });

  test('should validate display modes and installation criteria', async () => {
    await page.goto('/');
    
    const manifestLink = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      return link ? link.href : '';
    });

    const manifestResponse = await page.request.get(manifestLink);
    const manifest = await manifestResponse.json();

    // Display mode validation
    const validDisplayModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
    expect(validDisplayModes).toContain(manifest.display);

    // For wedding venue usage, standalone or fullscreen is preferred
    expect(['standalone', 'fullscreen']).toContain(manifest.display);

    // Scope and start URL validation
    expect(manifest.start_url).toBeDefined();
    expect(manifest.scope).toBeDefined();
    
    // Start URL should be within scope
    const startUrl = new URL(manifest.start_url, page.url());
    const scope = new URL(manifest.scope, page.url());
    expect(startUrl.pathname).toMatch(new RegExp(`^${scope.pathname}`));

    // Theme and background color validation
    expect(manifest.theme_color).toBeDefined();
    expect(manifest.background_color).toBeDefined();
    
    // Colors should be valid CSS colors
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    expect(manifest.theme_color).toMatch(colorRegex);
    expect(manifest.background_color).toMatch(colorRegex);

    // Orientation validation (important for wedding photography)
    if (manifest.orientation) {
      const validOrientations = [
        'any', 'natural', 'landscape', 'portrait',
        'portrait-primary', 'portrait-secondary',
        'landscape-primary', 'landscape-secondary'
      ];
      expect(validOrientations).toContain(manifest.orientation);
    }

    console.log('Display and Installation Validation:', {
      display: manifest.display,
      startUrl: manifest.start_url,
      scope: manifest.scope,
      themeColor: manifest.theme_color,
      backgroundColor: manifest.background_color,
      orientation: manifest.orientation,
      categories: manifest.categories
    });
  });

  test('should validate PWA installability requirements', async () => {
    await page.goto('/');
    
    const installabilityTest = await page.evaluate(async () => {
      const results = {
        manifestLinked: false,
        serviceWorkerActive: false,
        httpsOrLocalhost: false,
        validIcons: false,
        installPromptFired: false,
        beforeInstallPromptSupported: 'onbeforeinstallprompt' in window,
        getInstalledAppsSupported: 'getInstalledRelatedApps' in navigator
      };

      // Check manifest link
      const manifestLink = document.querySelector('link[rel="manifest"]');
      results.manifestLinked = !!manifestLink;

      // Check HTTPS or localhost
      results.httpsOrLocalhost = location.protocol === 'https:' || 
                                location.hostname === 'localhost' ||
                                location.hostname === '127.0.0.1';

      // Check service worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          results.serviceWorkerActive = !!registration.active;
        } catch (error) {
          results.serviceWorkerActive = false;
        }
      }

      // Check if icons are valid (simplified check)
      if (manifestLink) {
        try {
          const manifestUrl = (manifestLink as HTMLLinkElement).href;
          const response = await fetch(manifestUrl);
          const manifest = await response.json();
          
          results.validIcons = manifest.icons && 
                              Array.isArray(manifest.icons) && 
                              manifest.icons.length > 0 &&
                              manifest.icons.some((icon: any) => 
                                icon.sizes && icon.sizes.includes('192x192')
                              );
        } catch (error) {
          results.validIcons = false;
        }
      }

      // Listen for install prompt
      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          resolve(results);
        }, 3000);

        window.addEventListener('beforeinstallprompt', (e) => {
          results.installPromptFired = true;
          clearTimeout(timeoutId);
          resolve(results);
        });
      });
    });

    // PWA installability criteria
    expect(installabilityTest.manifestLinked).toBeTruthy();
    expect(installabilityTest.serviceWorkerActive).toBeTruthy();
    expect(installabilityTest.httpsOrLocalhost).toBeTruthy();
    expect(installabilityTest.validIcons).toBeTruthy();

    console.log('PWA Installability Test:', installabilityTest);
  });

  test('should validate cross-browser manifest compatibility', async () => {
    await page.goto('/');
    
    const crossBrowserTest = await page.evaluate(async () => {
      const results = {
        manifestSupport: false,
        webkitMetaTags: {
          appleWebAppCapable: false,
          appleWebAppStatusBar: false,
          appleWebAppTitle: false,
          appleTouchIcon: false
        },
        microsoftTags: {
          msApplicationTileColor: false,
          msApplicationTileImage: false,
          msApplicationConfig: false
        },
        manifestData: null
      };

      // Check manifest support
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      results.manifestSupport = !!manifestLink;

      // Check Safari/WebKit specific meta tags
      results.webkitMetaTags.appleWebAppCapable = !!document.querySelector('meta[name="apple-mobile-web-app-capable"]');
      results.webkitMetaTags.appleWebAppStatusBar = !!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      results.webkitMetaTags.appleWebAppTitle = !!document.querySelector('meta[name="apple-mobile-web-app-title"]');
      results.webkitMetaTags.appleTouchIcon = !!document.querySelector('link[rel="apple-touch-icon"]');

      // Check Microsoft/Edge specific tags
      results.microsoftTags.msApplicationTileColor = !!document.querySelector('meta[name="msapplication-TileColor"]');
      results.microsoftTags.msApplicationTileImage = !!document.querySelector('meta[name="msapplication-TileImage"]');
      results.microsoftTags.msApplicationConfig = !!document.querySelector('meta[name="msapplication-config"]');

      // Get manifest data
      if (manifestLink) {
        try {
          const response = await fetch(manifestLink.href);
          results.manifestData = await response.json();
        } catch (error) {
          results.manifestData = { error: error.message };
        }
      }

      return results;
    });

    // Manifest should be supported
    expect(crossBrowserTest.manifestSupport).toBeTruthy();

    // Safari compatibility (iOS PWA support)
    expect(crossBrowserTest.webkitMetaTags.appleWebAppCapable).toBeTruthy();
    expect(crossBrowserTest.webkitMetaTags.appleTouchIcon).toBeTruthy();

    // Manifest data should be valid
    if (crossBrowserTest.manifestData && !crossBrowserTest.manifestData.error) {
      expect(crossBrowserTest.manifestData.name).toBeDefined();
      expect(crossBrowserTest.manifestData.icons).toBeDefined();
    }

    console.log('Cross-Browser Compatibility:', crossBrowserTest);
  });

  test('should validate manifest security and best practices', async () => {
    await page.goto('/');
    
    const manifestLink = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      return link ? link.href : '';
    });

    const manifestResponse = await page.request.get(manifestLink);
    const manifest = await manifestResponse.json();

    // Security validations
    const securityChecks = {
      httpsStartUrl: false,
      scopeWithinOrigin: false,
      noExternalIcons: false,
      validCategories: false,
      appropriatePermissions: false
    };

    // Start URL should use HTTPS in production
    const startUrl = new URL(manifest.start_url, page.url());
    securityChecks.httpsStartUrl = startUrl.protocol === 'https:' || 
                                   startUrl.hostname === 'localhost';

    // Scope should be within same origin
    const scope = new URL(manifest.scope || '/', page.url());
    securityChecks.scopeWithinOrigin = scope.origin === new URL(page.url()).origin;

    // Icons should be from same origin (security best practice)
    securityChecks.noExternalIcons = manifest.icons.every((icon: any) => {
      const iconUrl = new URL(icon.src, page.url());
      return iconUrl.origin === new URL(page.url()).origin;
    });

    // Categories should be appropriate for a wedding app
    if (manifest.categories) {
      const appropriateCategories = [
        'productivity', 'lifestyle', 'business', 'photo', 'social', 'utilities'
      ];
      securityChecks.validCategories = manifest.categories.every((category: string) => 
        appropriateCategories.includes(category.toLowerCase())
      );
    } else {
      securityChecks.validCategories = true; // Categories are optional
    }

    // Check for inappropriate permissions requests
    const dangerousFeatures = ['geolocation', 'camera', 'microphone', 'notifications'];
    securityChecks.appropriatePermissions = true; // Assume good unless proven otherwise

    // Best practices validation
    const bestPractices = {
      shortNameLength: manifest.short_name && manifest.short_name.length <= 12,
      nameLength: manifest.name && manifest.name.length <= 45,
      descriptionProvided: !!manifest.description,
      langSpecified: !!manifest.lang,
      properDisplayMode: ['standalone', 'fullscreen'].includes(manifest.display)
    };

    // Security assertions
    expect(securityChecks.httpsStartUrl).toBeTruthy();
    expect(securityChecks.scopeWithinOrigin).toBeTruthy();
    expect(securityChecks.noExternalIcons).toBeTruthy();
    expect(securityChecks.validCategories).toBeTruthy();

    // Best practices assertions
    expect(bestPractices.shortNameLength).toBeTruthy();
    expect(bestPractices.nameLength).toBeTruthy();
    expect(bestPractices.properDisplayMode).toBeTruthy();

    console.log('Security and Best Practices Validation:', {
      securityChecks,
      bestPractices,
      manifestSize: JSON.stringify(manifest).length
    });
  });

  test('should validate wedding-specific manifest customization', async () => {
    await page.goto('/');
    
    const manifestLink = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      return link ? link.href : '';
    });

    const manifestResponse = await page.request.get(manifestLink);
    const manifest = await manifestResponse.json();

    // Wedding-specific validations
    const weddingFeatures = {
      appropriateName: false,
      weddingDescription: false,
      suitableThemeColor: false,
      photographyOrientation: false,
      appropriateCategories: false,
      offlineCapability: false
    };

    // Name should be wedding-related
    weddingFeatures.appropriateName = 
      manifest.name.toLowerCase().includes('wed') ||
      manifest.name.toLowerCase().includes('wedding') ||
      manifest.name.toLowerCase().includes('marriage');

    // Description should mention wedding functionality
    if (manifest.description) {
      const desc = manifest.description.toLowerCase();
      weddingFeatures.weddingDescription = 
        desc.includes('wedding') ||
        desc.includes('bride') ||
        desc.includes('groom') ||
        desc.includes('venue') ||
        desc.includes('supplier');
    }

    // Theme color should be appropriate for weddings
    if (manifest.theme_color) {
      // Wedding-appropriate colors (not too bright or jarring)
      const color = manifest.theme_color.toLowerCase();
      weddingFeatures.suitableThemeColor = 
        !color.includes('#ff0000') && // Not bright red
        !color.includes('#00ff00') && // Not bright green
        color.length === 7; // Valid hex format
    }

    // Orientation should support photography
    weddingFeatures.photographyOrientation = 
      !manifest.orientation || 
      manifest.orientation === 'any' ||
      manifest.orientation.includes('portrait');

    // Categories should be wedding-relevant
    if (manifest.categories) {
      const weddingCategories = ['lifestyle', 'photo', 'productivity', 'social'];
      weddingFeatures.appropriateCategories = 
        manifest.categories.some((cat: string) => 
          weddingCategories.includes(cat.toLowerCase())
        );
    }

    // Check for offline capability indicators
    weddingFeatures.offlineCapability = 
      manifest.display === 'standalone' || 
      manifest.display === 'fullscreen';

    // Wedding app specific requirements
    expect(weddingFeatures.appropriateName).toBeTruthy();
    expect(weddingFeatures.suitableThemeColor).toBeTruthy();
    expect(weddingFeatures.offlineCapability).toBeTruthy();

    console.log('Wedding-Specific Manifest Validation:', {
      ...weddingFeatures,
      manifestName: manifest.name,
      manifestDescription: manifest.description,
      themeColor: manifest.theme_color,
      orientation: manifest.orientation,
      categories: manifest.categories
    });
  });

  test('should validate manifest accessibility and inclusive design', async () => {
    await page.goto('/');
    
    const manifestLink = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      return link ? link.href : '';
    });

    const manifestResponse = await page.request.get(manifestLink);
    const manifest = await manifestResponse.json();

    const accessibilityChecks = {
      iconContrast: false,
      colorContrast: false,
      multipleIconFormats: false,
      descriptiveNames: false,
      languageSupport: false
    };

    // Check for multiple icon formats (accessibility)
    const iconFormats = manifest.icons.map((icon: any) => icon.type);
    accessibilityChecks.multipleIconFormats = 
      iconFormats.includes('image/png') && 
      iconFormats.length > 1;

    // Check theme and background color contrast
    if (manifest.theme_color && manifest.background_color) {
      // Basic contrast check (simplified)
      accessibilityChecks.colorContrast = 
        manifest.theme_color !== manifest.background_color;
    }

    // Check for descriptive naming
    accessibilityChecks.descriptiveNames = 
      manifest.name.length > 5 && 
      manifest.short_name.length > 2 &&
      manifest.name !== manifest.short_name;

    // Language support
    accessibilityChecks.languageSupport = !!manifest.lang;

    // Icon accessibility - check for maskable icons
    const hasMaskableIcon = manifest.icons.some((icon: any) => 
      icon.purpose && icon.purpose.includes('maskable')
    );

    const hasMonochromeIcon = manifest.icons.some((icon: any) => 
      icon.purpose && icon.purpose.includes('monochrome')
    );

    console.log('Accessibility Validation:', {
      ...accessibilityChecks,
      hasMaskableIcon,
      hasMonochromeIcon,
      totalIcons: manifest.icons.length,
      iconPurposes: manifest.icons.map((icon: any) => icon.purpose).filter(Boolean)
    });

    // Accessibility requirements
    expect(accessibilityChecks.descriptiveNames).toBeTruthy();
    expect(accessibilityChecks.colorContrast).toBeTruthy();
  });

  test('should validate manifest performance and optimization', async () => {
    await page.goto('/');
    
    const manifestLink = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      return link ? link.href : '';
    });

    // Test manifest loading performance
    const loadStart = Date.now();
    const manifestResponse = await page.request.get(manifestLink);
    const loadTime = Date.now() - loadStart;
    
    expect(manifestResponse.ok()).toBeTruthy();
    expect(loadTime).toBeLessThan(500); // Should load quickly

    const manifest = await manifestResponse.json();
    const manifestSize = JSON.stringify(manifest).length;

    // Performance checks
    const performanceChecks = {
      smallFileSize: manifestSize < 8192, // 8KB limit
      quickLoad: loadTime < 500,
      optimizedIcons: false,
      minimalFields: false
    };

    // Check icon optimization
    performanceChecks.optimizedIcons = manifest.icons.every((icon: any) => {
      // Icons should have appropriate sizes
      return icon.sizes && icon.type && icon.src;
    });

    // Check for minimal but complete field set
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
    const presentFields = Object.keys(manifest);
    performanceChecks.minimalFields = 
      requiredFields.every(field => presentFields.includes(field)) &&
      presentFields.length < 15; // Not too many fields

    // Test icon loading performance
    const iconLoadTests = await Promise.all(
      manifest.icons.slice(0, 3).map(async (icon: any) => {
        const iconStart = Date.now();
        try {
          const iconResponse = await page.request.get(icon.src);
          const iconLoadTime = Date.now() - iconStart;
          const iconSize = parseInt(iconResponse.headers()['content-length'] || '0');
          
          return {
            src: icon.src,
            loadTime: iconLoadTime,
            size: iconSize,
            success: iconResponse.ok()
          };
        } catch (error) {
          return {
            src: icon.src,
            loadTime: Date.now() - iconStart,
            size: 0,
            success: false,
            error: error.message
          };
        }
      })
    );

    // Performance assertions
    expect(performanceChecks.smallFileSize).toBeTruthy();
    expect(performanceChecks.quickLoad).toBeTruthy();
    expect(performanceChecks.optimizedIcons).toBeTruthy();

    // Icon loading performance
    iconLoadTests.forEach(iconTest => {
      expect(iconTest.success).toBeTruthy();
      expect(iconTest.loadTime).toBeLessThan(1000); // Icons load < 1s
    });

    console.log('Performance Validation:', {
      ...performanceChecks,
      manifestSize,
      loadTime,
      iconLoadTests: iconLoadTests.map(test => ({
        src: test.src.split('/').pop(),
        loadTime: test.loadTime,
        sizeKB: Math.round(test.size / 1024)
      }))
    });
  });
});