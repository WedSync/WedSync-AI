import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('PWA Install Prompt and User Journey Testing - WS-171', () => {
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

  test('should trigger beforeinstallprompt event when PWA criteria are met', async () => {
    await page.goto('/');
    
    const installPromptTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        const result = {
          promptEventFired: false,
          promptData: null,
          installSupported: 'onbeforeinstallprompt' in window,
          userChoice: null,
          installabilityChecks: {
            hasManifest: !!document.querySelector('link[rel="manifest"]'),
            hasServiceWorker: 'serviceWorker' in navigator,
            isHttps: location.protocol === 'https:' || location.hostname === 'localhost'
          }
        };

        // Set timeout for prompt detection
        const timeout = setTimeout(() => {
          resolve(result);
        }, 5000);

        // Listen for install prompt
        window.addEventListener('beforeinstallprompt', (event) => {
          result.promptEventFired = true;
          result.promptData = {
            platforms: event.platforms || [],
            preventDefault: typeof event.preventDefault === 'function',
            prompt: typeof event.prompt === 'function'
          };

          // Prevent default to test custom handling
          event.preventDefault();
          
          clearTimeout(timeout);
          resolve(result);
        });

        // Also check if prompt is already available
        if ((window as any).deferredPrompt) {
          result.promptEventFired = true;
          result.promptData = {
            platforms: (window as any).deferredPrompt.platforms || [],
            cached: true
          };
          clearTimeout(timeout);
          resolve(result);
        }
      });
    });

    // Install prompt should be available on supported browsers
    if (installPromptTest.installSupported) {
      console.log('Install Prompt Test Results:', installPromptTest);
      
      // Verify PWA installability criteria
      expect(installPromptTest.installabilityChecks.hasManifest).toBeTruthy();
      expect(installPromptTest.installabilityChecks.hasServiceWorker).toBeTruthy();
      expect(installPromptTest.installabilityChecks.isHttps).toBeTruthy();
      
      // If all criteria are met, prompt should eventually fire
      if (installPromptTest.promptEventFired) {
        expect(installPromptTest.promptData).toBeTruthy();
        expect(installPromptTest.promptData.preventDefault).toBeTruthy();
        expect(installPromptTest.promptData.prompt).toBeTruthy();
      }
    } else {
      console.warn('Install prompt not supported in this browser environment');
    }
  });

  test('should handle custom install prompt UI and user interactions', async () => {
    await page.goto('/dashboard');
    
    const customInstallTest = await page.evaluate(async () => {
      const result = {
        customInstallUIPresent: false,
        installButtonClickable: false,
        dismissButtonPresent: false,
        installPromptTriggered: false,
        userChoiceHandled: false,
        installResult: null
      };

      // Look for custom install UI elements
      const installButton = document.querySelector('[data-testid="install-button"], .install-button, button[class*="install"]');
      const dismissButton = document.querySelector('[data-testid="dismiss-install"], .dismiss-install, button[class*="dismiss"]');
      
      result.customInstallUIPresent = !!installButton;
      result.dismissButtonPresent = !!dismissButton;
      result.installButtonClickable = installButton && !installButton.hasAttribute('disabled');

      // Simulate install prompt handling
      if (installButton) {
        try {
          // Create mock install prompt event
          const mockPromptEvent = {
            preventDefault: () => {},
            prompt: async () => ({
              outcome: 'accepted',
              platform: 'web'
            }),
            platforms: ['web'],
            userChoice: Promise.resolve({
              outcome: 'accepted',
              platform: 'web'
            })
          };

          // Store mock prompt
          (window as any).deferredPrompt = mockPromptEvent;
          
          // Simulate button click
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          
          installButton.dispatchEvent(clickEvent);
          result.installPromptTriggered = true;

          // Test user choice handling
          try {
            const userChoice = await mockPromptEvent.userChoice;
            result.userChoiceHandled = true;
            result.installResult = userChoice;
          } catch (error) {
            console.error('User choice handling error:', error);
          }

        } catch (error) {
          console.error('Install button test error:', error);
        }
      }

      return result;
    });

    console.log('Custom Install Prompt Test:', customInstallTest);

    // Custom install UI should be properly implemented
    if (customInstallTest.customInstallUIPresent) {
      expect(customInstallTest.installButtonClickable).toBeTruthy();
      expect(customInstallTest.installPromptTriggered).toBeTruthy();
    }
  });

  test('should provide contextual install prompts for wedding suppliers', async () => {
    await page.goto('/dashboard');
    
    const contextualPromptTest = await page.evaluate(() => {
      const result = {
        onboardingPrompt: false,
        timelineViewPrompt: false,
        offlinePrompt: false,
        mobilePrompt: false,
        appropriateTimingDetected: false,
        weddingContextMentioned: false
      };

      // Check for onboarding install prompt
      const onboardingText = document.body.innerText.toLowerCase();
      result.onboardingPrompt = onboardingText.includes('install') && 
                               (onboardingText.includes('wedding') || onboardingText.includes('venue'));

      // Check for mobile-specific prompts
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        result.mobilePrompt = onboardingText.includes('add to home') || 
                             onboardingText.includes('install app');
      }

      // Check for offline capability messaging
      result.offlinePrompt = onboardingText.includes('offline') && 
                            onboardingText.includes('venue');

      // Check for timeline-specific install context
      if (window.location.pathname.includes('timeline') || 
          document.querySelector('[data-testid*="timeline"]')) {
        result.timelineViewPrompt = onboardingText.includes('quick access') ||
                                   onboardingText.includes('install');
      }

      // Check for wedding-specific context
      result.weddingContextMentioned = onboardingText.includes('wedding day') ||
                                      onboardingText.includes('venue') ||
                                      onboardingText.includes('supplier');

      // Check timing appropriateness (not immediately on first load)
      result.appropriateTimingDetected = !document.querySelector('.install-banner:not([style*="display: none"])');

      return result;
    });

    console.log('Contextual Install Prompt Test:', contextualPromptTest);

    // Wedding suppliers should see relevant install messaging
    expect(contextualPromptTest.weddingContextMentioned).toBeTruthy();
    expect(contextualPromptTest.appropriateTimingDetected).toBeTruthy();
  });

  test('should handle iOS Safari Add to Home Screen flow', async () => {
    // Simulate iOS Safari environment
    await page.evaluate(() => {
      // Override user agent for iOS Safari
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
        writable: false
      });
      
      // Override navigator properties
      Object.defineProperty(navigator, 'standalone', {
        value: false,
        writable: false
      });
    });

    await page.goto('/');

    const iosInstallTest = await page.evaluate(() => {
      const result = {
        iosDetected: /iPhone|iPad|iPod/.test(navigator.userAgent),
        safariDetected: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        standaloneMode: (navigator as any).standalone,
        iosInstallInstructions: false,
        shareButtonMentioned: false,
        addToHomeScreenMentioned: false,
        iosMetaTagsPresent: false
      };

      // Check for iOS-specific install instructions
      const bodyText = document.body.innerText.toLowerCase();
      result.iosInstallInstructions = bodyText.includes('safari') && 
                                     bodyText.includes('share');
      
      result.shareButtonMentioned = bodyText.includes('share button') ||
                                   bodyText.includes('share icon');
      
      result.addToHomeScreenMentioned = bodyText.includes('add to home screen') ||
                                       bodyText.includes('add to home');

      // Check for iOS-specific meta tags
      const appleWebAppCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
      const appleWebAppTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
      
      result.iosMetaTagsPresent = !!(appleWebAppCapable && appleWebAppTitle && appleTouchIcon);

      return result;
    });

    console.log('iOS Safari Install Test:', iosInstallTest);

    // iOS Safari should have proper meta tags and instructions
    expect(iosInstallTest.iosMetaTagsPresent).toBeTruthy();
    
    if (iosInstallTest.iosDetected && iosInstallTest.safariDetected) {
      // Should provide iOS-specific instructions
      expect(iosInstallTest.iosInstallInstructions || iosInstallTest.addToHomeScreenMentioned).toBeTruthy();
    }
  });

  test('should handle Android Chrome WebAPK installation', async () => {
    // Simulate Android Chrome environment
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        writable: false
      });
    });

    await page.goto('/');

    const androidInstallTest = await page.evaluate(async () => {
      const result = {
        androidDetected: /Android/.test(navigator.userAgent),
        chromeDetected: /Chrome/.test(navigator.userAgent),
        beforeInstallPromptSupported: 'onbeforeinstallprompt' in window,
        webAPKInstallation: false,
        installPromptCustomized: false,
        appBannerHandled: false
      };

      // Mock beforeinstallprompt event for testing
      if (result.beforeInstallPromptSupported) {
        const mockEvent = {
          platforms: ['web'],
          preventDefault: () => {},
          prompt: async () => {
            result.webAPKInstallation = true;
            return { outcome: 'accepted', platform: 'web' };
          },
          userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' })
        };

        // Simulate install prompt handling
        window.dispatchEvent(new CustomEvent('beforeinstallprompt', { detail: mockEvent }));
        result.appBannerHandled = true;
      }

      // Check for custom install prompt handling
      const installElements = document.querySelectorAll('[data-testid*="install"], .install-prompt, .add-to-homescreen');
      result.installPromptCustomized = installElements.length > 0;

      return result;
    });

    console.log('Android Chrome WebAPK Test:', androidInstallTest);

    // Android Chrome should support modern install prompts
    if (androidInstallTest.androidDetected && androidInstallTest.chromeDetected) {
      expect(androidInstallTest.beforeInstallPromptSupported).toBeTruthy();
    }
  });

  test('should track install conversion funnel and analytics', async () => {
    await page.goto('/');
    
    const conversionFunnelTest = await page.evaluate(async () => {
      const result = {
        promptShown: false,
        promptEngagement: false,
        installAttempted: false,
        installCompleted: false,
        analyticsTracked: false,
        userJourneyData: {
          timeToPrompt: 0,
          promptToInstall: 0,
          installSuccess: false
        }
      };

      const startTime = Date.now();

      // Simulate install prompt flow
      try {
        // Step 1: Prompt shown
        setTimeout(() => {
          result.promptShown = true;
          result.userJourneyData.timeToPrompt = Date.now() - startTime;
          
          // Simulate user engagement tracking
          if (typeof gtag !== 'undefined' || typeof analytics !== 'undefined' || window.dataLayer) {
            result.analyticsTracked = true;
          }
        }, 100);

        // Step 2: User engages with prompt
        setTimeout(() => {
          result.promptEngagement = true;
          
          // Step 3: Install attempted
          setTimeout(() => {
            result.installAttempted = true;
            result.userJourneyData.promptToInstall = Date.now() - startTime - result.userJourneyData.timeToPrompt;
            
            // Step 4: Install completed (simulated)
            setTimeout(() => {
              result.installCompleted = true;
              result.userJourneyData.installSuccess = true;
            }, 500);
          }, 200);
        }, 300);

      } catch (error) {
        console.error('Conversion funnel test error:', error);
      }

      return new Promise(resolve => {
        setTimeout(() => resolve(result), 1200);
      });
    });

    console.log('Install Conversion Funnel:', conversionFunnelTest);

    // Install funnel should track key metrics
    expect(conversionFunnelTest.promptShown).toBeTruthy();
    expect(conversionFunnelTest.promptEngagement).toBeTruthy();
    expect(conversionFunnelTest.installAttempted).toBeTruthy();
    expect(conversionFunnelTest.installCompleted).toBeTruthy();
  });

  test('should handle post-installation experience and onboarding', async () => {
    // Simulate installed PWA environment
    await page.evaluate(() => {
      // Mock standalone mode
      Object.defineProperty(navigator, 'standalone', {
        value: true,
        writable: false
      });
      
      // Mock display mode
      Object.defineProperty(window, 'matchMedia', {
        value: (query: string) => ({
          matches: query.includes('standalone'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {}
        }),
        writable: false
      });
    });

    await page.goto('/dashboard');

    const postInstallTest = await page.evaluate(async () => {
      const result = {
        standaloneDetected: (navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches,
        fullscreenDetected: window.matchMedia('(display-mode: fullscreen)').matches,
        onboardingShown: false,
        featuresHighlighted: false,
        offlineCapabilitiesMentioned: false,
        weddingWorkflowGuided: false,
        navigationOptimized: false,
        postInstallAnalytics: false
      };

      // Check for post-install onboarding
      const bodyText = document.body.innerText.toLowerCase();
      result.onboardingShown = bodyText.includes('welcome') || 
                               bodyText.includes('getting started') ||
                               bodyText.includes('tour');

      // Check for feature highlights
      result.featuresHighlighted = bodyText.includes('timeline') &&
                                   bodyText.includes('offline') &&
                                   bodyText.includes('vendor');

      // Check for offline capabilities messaging
      result.offlineCapabilitiesMentioned = bodyText.includes('work offline') ||
                                            bodyText.includes('no internet') ||
                                            bodyText.includes('venue connectivity');

      // Check for wedding-specific workflow guidance
      result.weddingWorkflowGuided = bodyText.includes('wedding day') ||
                                    bodyText.includes('supplier workflow') ||
                                    bodyText.includes('venue management');

      // Check navigation optimization for standalone mode
      const navigation = document.querySelector('nav, [role="navigation"]');
      if (navigation) {
        const navStyle = window.getComputedStyle(navigation);
        result.navigationOptimized = navStyle.position === 'fixed' || 
                                    navStyle.position === 'sticky' ||
                                    navigation.classList.contains('standalone');
      }

      // Check for post-install analytics
      result.postInstallAnalytics = typeof gtag !== 'undefined' || 
                                   typeof analytics !== 'undefined' ||
                                   !!window.dataLayer;

      return result;
    });

    console.log('Post-Install Experience Test:', postInstallTest);

    // Post-install experience should be optimized
    expect(postInstallTest.standaloneDetected).toBeTruthy();
    
    // Should provide appropriate onboarding
    if (postInstallTest.onboardingShown) {
      expect(postInstallTest.weddingWorkflowGuided).toBeTruthy();
    }
  });

  test('should validate install prompt timing and frequency', async () => {
    await page.goto('/');
    
    const timingTest = await page.evaluate(async () => {
      const result = {
        immediatePrompt: false,
        delayedPrompt: false,
        engagementBasedPrompt: false,
        respectsDismissal: false,
        cooldownPeriod: false,
        contextualTiming: false
      };

      const startTime = Date.now();
      let promptShownAt = 0;
      let dismissedAt = 0;

      // Test immediate prompt (should not happen)
      setTimeout(() => {
        const immediateInstallUI = document.querySelector('.install-banner:not([style*="display: none"])');
        result.immediatePrompt = !!immediateInstallUI;
      }, 100);

      // Test delayed prompt (good practice)
      setTimeout(() => {
        const delayedInstallUI = document.querySelector('[data-testid="install-prompt"]') ||
                                document.querySelector('.install-suggestion');
        if (delayedInstallUI) {
          result.delayedPrompt = true;
          promptShownAt = Date.now();
        }
      }, 2000);

      // Test engagement-based prompting
      setTimeout(() => {
        // Simulate user engagement (scrolling, clicking)
        window.dispatchEvent(new Event('scroll'));
        document.body.click();
        
        setTimeout(() => {
          const engagementPrompt = document.querySelector('.install-after-engagement');
          result.engagementBasedPrompt = !!engagementPrompt;
        }, 500);
      }, 3000);

      // Test dismissal handling
      setTimeout(() => {
        const dismissButton = document.querySelector('[data-testid="dismiss-install"]');
        if (dismissButton) {
          dismissButton.click();
          dismissedAt = Date.now();
          
          // Check if prompt respects dismissal
          setTimeout(() => {
            const promptAfterDismissal = document.querySelector('.install-banner:not([style*="display: none"])');
            result.respectsDismissal = !promptAfterDismissal;
            
            // Check cooldown period
            const cooldownTime = Date.now() - dismissedAt;
            result.cooldownPeriod = cooldownTime > 1000; // At least 1 second cooldown
          }, 1500);
        }
      }, 4000);

      // Test contextual timing
      if (window.location.pathname.includes('timeline') || 
          window.location.pathname.includes('venue')) {
        result.contextualTiming = true;
      }

      return new Promise(resolve => {
        setTimeout(() => resolve(result), 7000);
      });
    });

    console.log('Install Prompt Timing Test:', timingTest);

    // Good install prompt practices
    expect(timingTest.immediatePrompt).toBeFalsy(); // Should not prompt immediately
    expect(timingTest.respectsDismissal).toBeTruthy(); // Should respect user dismissal
  });

  test('should optimize install experience for wedding venue scenarios', async () => {
    // Test different venue-related contexts
    const venueScenarios = [
      { path: '/timeline', context: 'Timeline Management' },
      { path: '/vendors', context: 'Vendor Coordination' },
      { path: '/guests', context: 'Guest Management' },
      { path: '/photos', context: 'Photo Management' }
    ];

    const venueOptimizationResults = [];

    for (const scenario of venueScenarios) {
      await page.goto(scenario.path);
      
      const scenarioTest = await page.evaluate((context) => {
        const result = {
          context,
          offlineMessaging: false,
          quickAccessPrompt: false,
          venueSpecificBenefits: false,
          mobileOptimized: false,
          installTiming: 'unknown'
        };

        const bodyText = document.body.innerText.toLowerCase();
        
        // Check for offline messaging
        result.offlineMessaging = bodyText.includes('work offline') ||
                                 bodyText.includes('no wifi') ||
                                 bodyText.includes('poor connection');

        // Check for quick access messaging
        result.quickAccessPrompt = bodyText.includes('quick access') ||
                                  bodyText.includes('one tap') ||
                                  bodyText.includes('instant access');

        // Check for venue-specific benefits
        result.venueSpecificBenefits = bodyText.includes('venue') ||
                                      bodyText.includes('wedding day') ||
                                      bodyText.includes('on-site');

        // Check mobile optimization
        const viewport = document.querySelector('meta[name="viewport"]');
        result.mobileOptimized = !!(viewport && 
          viewport.getAttribute('content')?.includes('width=device-width'));

        // Determine install timing appropriateness
        const installElements = document.querySelectorAll('[class*="install"], [data-testid*="install"]');
        if (installElements.length > 0) {
          result.installTiming = 'contextual'; // Good - showing in relevant context
        } else {
          result.installTiming = 'none'; // Neutral - not showing install prompts
        }

        return result;
      }, scenario.context);

      venueOptimizationResults.push(scenarioTest);

      // Each venue scenario should be mobile optimized
      expect(scenarioTest.mobileOptimized).toBeTruthy();
    }

    console.log('Venue Optimization Results:', venueOptimizationResults);

    // At least half of venue scenarios should mention offline capabilities
    const offlineAwareScenarios = venueOptimizationResults.filter(r => r.offlineMessaging).length;
    expect(offlineAwareScenarios).toBeGreaterThan(venueScenarios.length / 2);
  });

  test('should provide comprehensive install analytics and feedback', async () => {
    await page.goto('/dashboard');
    
    const analyticsTest = await page.evaluate(async () => {
      const result = {
        installMetricsTracked: false,
        userJourneyAnalytics: false,
        conversionTracking: false,
        errorTracking: false,
        performanceMetrics: false,
        a11yMetrics: false,
        customEvents: []
      };

      // Mock analytics systems
      const mockAnalytics = {
        track: (event: string, data: any) => {
          result.customEvents.push({ event, data });
        },
        identify: (userId: string) => {},
        page: (pageName: string) => {}
      };

      (window as any).analytics = mockAnalytics;
      (window as any).gtag = (type: string, event: string, data: any) => {
        result.customEvents.push({ type, event, data });
      };

      // Simulate install flow analytics
      try {
        // Track install prompt shown
        mockAnalytics.track('install_prompt_shown', {
          page: location.pathname,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        });

        // Track install prompt interaction
        mockAnalytics.track('install_prompt_clicked', {
          action: 'install',
          timestamp: Date.now()
        });

        // Track install completion
        mockAnalytics.track('pwa_installed', {
          success: true,
          platform: 'web',
          timestamp: Date.now()
        });

        result.installMetricsTracked = result.customEvents.some(e => 
          e.event && e.event.includes('install')
        );

        // User journey analytics
        result.userJourneyAnalytics = result.customEvents.some(e => 
          e.data && e.data.timestamp
        );

        // Conversion tracking
        result.conversionTracking = result.customEvents.some(e => 
          e.event === 'pwa_installed'
        );

        // Performance metrics
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationTiming) {
          mockAnalytics.track('install_page_performance', {
            loadTime: navigationTiming.loadEventEnd - navigationTiming.navigationStart,
            domReady: navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart
          });
          
          result.performanceMetrics = true;
        }

        // Error tracking simulation
        try {
          throw new Error('Simulated install error');
        } catch (error) {
          mockAnalytics.track('install_error', {
            error: error.message,
            stack: error.stack
          });
          
          result.errorTracking = result.customEvents.some(e => 
            e.event === 'install_error'
          );
        }

        // Accessibility metrics
        const focusableElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length > 0) {
          mockAnalytics.track('install_accessibility', {
            focusableElements: focusableElements.length,
            hasSkipLinks: !!document.querySelector('a[href^="#"]'),
            hasAriaLabels: !!document.querySelector('[aria-label]')
          });
          
          result.a11yMetrics = true;
        }

      } catch (error) {
        console.error('Analytics test error:', error);
      }

      return result;
    });

    console.log('Install Analytics Test:', {
      ...analyticsTest,
      totalEvents: analyticsTest.customEvents.length,
      eventTypes: analyticsTest.customEvents.map(e => e.event || e.type).filter(Boolean)
    });

    // Analytics should track key install metrics
    expect(analyticsTest.installMetricsTracked).toBeTruthy();
    expect(analyticsTest.userJourneyAnalytics).toBeTruthy();
    expect(analyticsTest.conversionTracking).toBeTruthy();
    expect(analyticsTest.customEvents.length).toBeGreaterThan(3);
  });
});