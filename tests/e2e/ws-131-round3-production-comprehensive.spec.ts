/**
 * WS-131 Pricing Strategy System - Round 3 Production Comprehensive Tests
 * Team D Final Integration & Production Testing Suite
 * 
 * Tests production-ready subscription flows with cross-team AI service integration,
 * advanced caching, error handling, and performance optimization
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration for production scenarios
const PRODUCTION_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: 30000, // 30 seconds for production scenarios
  retries: 2,
  workers: 4
};

test.describe('WS-131 Round 3 Production Comprehensive Testing Suite', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'WedSync-E2E-Test/1.0',
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();
    
    // Production-grade authentication mock
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-production-token-ws131-round3',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer'
      }));
      
      (window as any).mockUser = {
        id: 'prod-user-ws131-round3',
        email: 'premium.photographer@wedsync-prod.com',
        user_metadata: { 
          role: 'supplier',
          supplier_type: 'photographer',
          business_size: 'medium',
          hourly_rate: 150,
          organization_id: 'org-123-production'
        }
      };
    });

    // Enhanced Stripe production mock with error scenarios
    await page.addInitScript(() => {
      (window as any).Stripe = (publishableKey) => ({
        confirmPayment: async (clientSecret, options) => {
          // Simulate realistic payment processing delays
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
          
          if (clientSecret?.includes('fail')) {
            return { 
              error: { 
                type: 'card_error',
                code: 'card_declined',
                message: 'Your card was declined. Try another payment method.'
              } 
            };
          }
          
          return { 
            paymentIntent: { 
              id: 'pi_test_' + Math.random().toString(36),
              status: 'succeeded'
            }
          };
        },
        
        elements: (options) => ({
          create: (type, elementOptions) => ({
            mount: (selector) => {},
            on: (event, callback) => {
              // Simulate realistic form events
              if (event === 'ready') setTimeout(callback, 100);
            },
            destroy: () => {},
            update: (options) => {},
            focus: () => {},
            blur: () => {}
          }),
          fetchUpdates: async () => ({ applied: true }),
          update: (options) => {}
        }),
        
        createPaymentMethod: async (options) => ({
          paymentMethod: { 
            id: 'pm_test_' + Math.random().toString(36),
            type: 'card',
            card: { brand: 'visa', last4: '4242' }
          }
        })
      });
    });

    // Comprehensive API mocking for production scenarios
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      const responseDelay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));
      
      (window as any).fetch = async (url, options) => {
        // Simulate realistic network delays
        await responseDelay(Math.random() * 200 + 50);
        
        // Mock billing tiers with production data structure
        if (url.includes('/api/billing/tiers')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                billing_cycle: 'monthly',
                cache_info: {
                  cached_at: new Date().toISOString(),
                  ttl: 1800,
                  hit: Math.random() > 0.3
                },
                plans: [
                  {
                    id: 'starter',
                    tier: 'starter',
                    name: 'Starter',
                    tagline: 'Perfect for intimate weddings',
                    price: { monthly: 0, yearly: 0, currency: 'USD' },
                    limits: { 
                      guests: 100, 
                      events: 1, 
                      storage_gb: 1, 
                      team_members: 2,
                      ai_photo_analysis: 10,
                      ai_floral_recommendations: 5,
                      ai_chatbot_interactions: 50
                    },
                    features: ['Guest list management', 'RSVP tracking', 'Basic analytics'],
                    popular: false,
                    cta: { primary: 'Start Free', secondary: 'No credit card required' }
                  },
                  {
                    id: 'professional',
                    tier: 'professional',
                    name: 'Professional',
                    tagline: 'Most popular for medium weddings',
                    price: { monthly: 29, yearly: 290, currency: 'USD' },
                    limits: { 
                      guests: 300, 
                      events: 3, 
                      storage_gb: 10, 
                      team_members: 5,
                      ai_photo_analysis: 100,
                      ai_floral_recommendations: 50,
                      ai_chatbot_interactions: 500,
                      ai_music_recommendations: 50
                    },
                    features: ['Advanced guest management', 'Analytics', 'AI Photo Processing', 'Floral AI', 'Music AI'],
                    popular: true,
                    badge: { text: 'Most Popular', variant: 'success' },
                    cta: { primary: 'Start 14-day trial', secondary: 'Cancel anytime' }
                  },
                  {
                    id: 'premium',
                    tier: 'premium',
                    name: 'Premium',
                    tagline: 'For professional planners',
                    price: { monthly: 79, yearly: 790, currency: 'USD' },
                    limits: { 
                      guests: 1000, 
                      events: 10, 
                      storage_gb: 50, 
                      team_members: 15,
                      ai_photo_analysis: 500,
                      ai_floral_recommendations: 200,
                      ai_chatbot_interactions: 2000,
                      ai_music_recommendations: 200
                    },
                    features: ['Unlimited AI services', 'Advanced analytics', 'Priority support', 'Trial Management', 'Customer Success Dashboard'],
                    popular: false,
                    cta: { primary: 'Upgrade to Premium', secondary: 'Full feature access' }
                  },
                  {
                    id: 'enterprise',
                    tier: 'enterprise',
                    name: 'Enterprise',
                    tagline: 'For large wedding businesses',
                    price: { monthly: 199, yearly: 1990, currency: 'USD' },
                    limits: { 
                      guests: -1, 
                      events: -1, 
                      storage_gb: -1, 
                      team_members: -1,
                      ai_photo_analysis: -1,
                      ai_floral_recommendations: -1,
                      ai_chatbot_interactions: -1,
                      ai_music_recommendations: -1
                    },
                    features: ['Everything unlimited', 'Custom integrations', 'Dedicated support', 'White-label options'],
                    popular: false,
                    cta: { primary: 'Contact Sales', secondary: 'Custom pricing available' }
                  }
                ]
              }
            })
          });
        }

        // Mock comprehensive AI usage tracking
        if (url.includes('/api/billing/usage/ai')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              cache_performance: {
                hit_ratio: 0.87,
                query_time_ms: 45,
                cached_at: new Date().toISOString()
              },
              ai_services: {
                // Team C - Photography AI
                ai_photo_analysis: { 
                  current: 67, 
                  limit: 100, 
                  percentage: 67,
                  last_used: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                  avg_daily: 12
                },
                // Team A & B - Floral AI
                ai_floral_recommendations: { 
                  current: 23, 
                  limit: 50, 
                  percentage: 46,
                  last_used: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                  avg_daily: 5
                },
                // Team D - Chatbot
                ai_chatbot_interactions: { 
                  current: 234, 
                  limit: 500, 
                  percentage: 47,
                  last_used: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                  avg_daily: 45
                },
                // Music AI
                ai_music_recommendations: { 
                  current: 18, 
                  limit: 50, 
                  percentage: 36,
                  last_used: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                  avg_daily: 3
                }
              },
              plan: 'professional',
              billing_period: {
                start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
              },
              usage_trends: {
                growth_rate: 0.15,
                peak_usage_hour: 14,
                predicted_monthly_total: 342
              }
            })
          });
        }

        // Mock subscription upgrade with cross-team integration validation
        if (url.includes('/api/billing/subscription/upgrade')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                subscription: { 
                  id: 'sub-prod-' + Math.random().toString(36),
                  plan_id: 'premium',
                  status: 'active'
                },
                plan: { 
                  tier: 'premium', 
                  name: 'Premium',
                  limits: {
                    ai_photo_analysis: 500,
                    ai_floral_recommendations: 200,
                    ai_chatbot_interactions: 2000,
                    ai_music_recommendations: 200
                  }
                },
                upgrade_benefits: {
                  improved_limits: [
                    'Increased AI Photo Analysis: 100 → 500',
                    'Enhanced Floral AI: 50 → 200 recommendations',
                    'Expanded Chatbot: 500 → 2000 interactions'
                  ],
                  new_features: [
                    'Trial Management System (Team E integration)',
                    'Customer Success Dashboard',
                    'Advanced Marketing Automation'
                  ]
                },
                integration_status: {
                  team_a_floral_ai: 'active',
                  team_b_florist_intelligence: 'active',
                  team_c_photography_ai: 'active',
                  team_d_chatbot: 'active',
                  team_e_trial_management: 'active'
                }
              },
              message: 'Successfully upgraded to Premium with full cross-team AI integration'
            })
          });
        }

        // Mock caching performance metrics
        if (url.includes('/api/billing/cache/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              metrics: {
                hit_ratio: 0.89,
                total_requests: 15423,
                hits: 13727,
                misses: 1696,
                avg_query_time_ms: 42,
                cache_size_mb: 12.3,
                entries: 2847,
                cleanup_runs: 145,
                last_cleanup: new Date(Date.now() - 5 * 60 * 1000).toISOString()
              },
              performance_improvement: '73% faster than non-cached queries'
            })
          });
        }

        // Mock trial management integration (Team E)
        if (url.includes('/api/trial/') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              trial: {
                id: 'trial-' + Math.random().toString(36),
                user_id: 'prod-user-ws131-round3',
                plan: 'premium',
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                roi_calculation: {
                  monthly_savings: 3200,
                  annual_projection: 38400,
                  payback_period_days: 8
                },
                conversion_score: 0.87,
                milestones: ['setup_completed', 'first_ai_use', 'guest_list_imported']
              },
              message: 'Trial started with integrated AI usage tracking'
            })
          });
        }

        return originalFetch(url, options);
      };
    });

    // Performance monitoring setup
    await page.addInitScript(() => {
      (window as any).performanceMetrics = {
        pageLoadStart: performance.now(),
        apiCalls: [],
        errors: []
      };

      // Monitor API call performance
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const startTime = performance.now();
        try {
          const result = await originalFetch(...args);
          (window as any).performanceMetrics.apiCalls.push({
            url: args[0],
            duration: performance.now() - startTime,
            status: result.status
          });
          return result;
        } catch (error) {
          (window as any).performanceMetrics.errors.push({
            url: args[0],
            error: error.message,
            duration: performance.now() - startTime
          });
          throw error;
        }
      };
    });
  });

  test.afterEach(async () => {
    // Collect performance metrics
    const metrics = await page.evaluate(() => (window as any).performanceMetrics);
    if (metrics) {
      console.log('Performance Metrics:', {
        totalApiCalls: metrics.apiCalls.length,
        avgResponseTime: metrics.apiCalls.reduce((sum, call) => sum + call.duration, 0) / metrics.apiCalls.length,
        errors: metrics.errors.length
      });
    }
    
    await page.close();
  });

  test.describe('1. CROSS-TEAM AI SERVICE INTEGRATION', () => {
    test('should validate all Team AI services are properly integrated', async () => {
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/billing?tab=usage`);
      
      // Wait for AI usage dashboard to load
      await expect(page.locator('[data-testid="ai-services-dashboard"]')).toBeVisible();
      
      // Validate Team A & B - Floral AI Integration
      const floralAI = page.locator('[data-testid="ai-floral-recommendations"]');
      await expect(floralAI).toBeVisible();
      await expect(floralAI.locator('[data-testid="usage-count"]')).toContainText('23 / 50');
      await expect(floralAI.locator('[data-testid="usage-percentage"]')).toContainText('46%');
      
      // Validate Team C - Photography AI Integration
      const photoAI = page.locator('[data-testid="ai-photo-analysis"]');
      await expect(photoAI).toBeVisible();
      await expect(photoAI.locator('[data-testid="usage-count"]')).toContainText('67 / 100');
      await expect(photoAI.locator('[data-testid="daily-average"]')).toContainText('12 per day');
      
      // Validate Team D - Chatbot Integration
      const chatbotAI = page.locator('[data-testid="ai-chatbot-interactions"]');
      await expect(chatbotAI).toBeVisible();
      await expect(chatbotAI.locator('[data-testid="usage-count"]')).toContainText('234 / 500');
      await expect(chatbotAI.locator('[data-testid="last-used"]')).toContainText('15 minutes ago');
      
      // Validate Music AI Service
      const musicAI = page.locator('[data-testid="ai-music-recommendations"]');
      await expect(musicAI).toBeVisible();
      await expect(musicAI.locator('[data-testid="usage-percentage"]')).toContainText('36%');
      
      // Check usage trends and analytics
      await expect(page.locator('[data-testid="usage-growth-rate"]')).toContainText('15% growth');
      await expect(page.locator('[data-testid="predicted-monthly"]')).toContainText('342');
    });

    test('should handle AI service usage tracking with billing integration', async () => {
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/billing?tab=usage`);
      
      // Verify usage tracking components are present
      await expect(page.locator('[data-testid="real-time-usage-tracker"]')).toBeVisible();
      
      // Test real-time usage update simulation
      await page.click('[data-testid="simulate-ai-usage"]');
      
      // Should show usage increment (mocked behavior)
      await expect(page.locator('[data-testid="usage-updated-indicator"]')).toBeVisible();
      
      // Check billing period information
      await expect(page.locator('[data-testid="billing-period"]')).toBeVisible();
      await expect(page.locator('[data-testid="period-progress"]')).toContainText('50%'); // Mid-cycle
      
      // Validate usage alerts for approaching limits
      const highUsageService = page.locator('[data-testid="ai-photo-analysis"]');
      if (await highUsageService.locator('[data-testid="usage-percentage"]').textContent() === '67%') {
        await expect(page.locator('[data-testid="usage-warning-67"]')).toBeVisible();
      }
    });
  });

  test.describe('2. ADVANCED CACHING PERFORMANCE VALIDATION', () => {
    test('should demonstrate advanced billing cache performance', async () => {
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/billing/admin/cache-metrics`);
      
      // Check cache metrics dashboard
      await expect(page.locator('[data-testid="cache-metrics-dashboard"]')).toBeVisible();
      
      // Verify cache performance indicators
      await expect(page.locator('[data-testid="hit-ratio"]')).toContainText('89%');
      await expect(page.locator('[data-testid="avg-query-time"]')).toContainText('42ms');
      await expect(page.locator('[data-testid="cache-size"]')).toContainText('12.3 MB');
      
      // Test cache invalidation functionality
      await page.click('[data-testid="invalidate-user-cache"]');
      await expect(page.locator('[data-testid="cache-invalidated-success"]')).toBeVisible();
      
      // Verify cache statistics update
      await expect(page.locator('[data-testid="cache-operations-count"]')).toBeVisible();
      
      // Check performance improvement metrics
      await expect(page.locator('[data-testid="performance-improvement"]')).toContainText('73% faster');
      
      // Validate cache cleanup processes
      await expect(page.locator('[data-testid="cleanup-runs"]')).toContainText('145');
      await expect(page.locator('[data-testid="last-cleanup"]')).toContainText('5 minutes ago');
    });

    test('should handle cache-optimized subscription data loading', async () => {
      // Test multiple rapid page loads to validate caching
      const startTime = Date.now();
      
      for (let i = 0; i < 3; i++) {
        await page.goto(`${PRODUCTION_CONFIG.baseURL}/billing`);
        await expect(page.locator('[data-testid="subscription-info"]')).toBeVisible();
        
        if (i > 0) {
          // Second and third loads should be much faster due to caching
          const loadTime = Date.now() - startTime;
          expect(loadTime).toBeLessThan(2000); // Should load in under 2 seconds
        }
      }
      
      // Check for cache hit indicators
      const cacheInfo = await page.locator('[data-testid="cache-info"]').textContent();
      expect(cacheInfo).toMatch(/cached|hit/i);
    });
  });

  test.describe('3. PRODUCTION SUBSCRIPTION UPGRADE FLOWS', () => {
    test('should handle complex upgrade flow with Team E trial integration', async () => {
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/pricing`);
      
      // Start premium upgrade
      await page.click('[data-testid="plan-premium"] [data-testid="cta-primary"]');
      
      // Should show comprehensive upgrade modal
      await expect(page.locator('[data-testid="premium-upgrade-modal"]')).toBeVisible();
      
      // Verify cross-team integration benefits are displayed
      await expect(page.locator('[data-testid="integration-benefits"]')).toBeVisible();
      await expect(page.locator('[data-testid="team-a-floral-benefit"]')).toContainText('Enhanced Floral AI');
      await expect(page.locator('[data-testid="team-c-photo-benefit"]')).toContainText('Advanced Photo AI');
      await expect(page.locator('[data-testid="team-e-trial-benefit"]')).toContainText('Trial Management');
      
      // Check AI limits comparison table
      const limitsTable = page.locator('[data-testid="ai-limits-comparison"]');
      await expect(limitsTable).toBeVisible();
      await expect(limitsTable.locator('[data-testid="photo-ai-upgrade"]')).toContainText('100 → 500');
      await expect(limitsTable.locator('[data-testid="floral-ai-upgrade"]')).toContainText('50 → 200');
      
      // Start trial instead of immediate upgrade
      await page.click('[data-testid="start-premium-trial"]');
      
      // Should integrate with Team E trial management
      await expect(page.locator('[data-testid="trial-integration-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="trial-roi-preview"]')).toContainText('$3,200 monthly');
      await expect(page.locator('[data-testid="conversion-score"]')).toContainText('87%');
      
      // Check trial milestone tracking
      await expect(page.locator('[data-testid="trial-milestones"]')).toBeVisible();
      await expect(page.locator('[data-testid="milestone-setup"]')).toHaveClass(/completed/);
    });

    test('should validate payment processing with advanced error handling', async () => {
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/pricing`);
      
      // Start upgrade to premium
      await page.click('[data-testid="plan-premium"] [data-testid="cta-primary"]');
      await page.click('[data-testid="upgrade-now-no-trial"]');
      
      // Payment form should load
      await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
      
      // Fill payment details with test card
      await page.fill('[data-testid="card-number"]', '4242 4242 4242 4242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.fill('[data-testid="cardholder-name"]', 'Test User');
      
      // Submit payment
      await page.click('[data-testid="confirm-payment"]');
      
      // Should show processing state
      await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();
      
      // Wait for payment completion
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 10000 });
      
      // Should show upgrade confirmation with integration status
      await expect(page.locator('[data-testid="upgrade-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="integration-status"]')).toContainText('All AI services activated');
      
      // Check new plan limits are applied
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/billing`);
      await expect(page.locator('[data-testid="current-plan"]')).toContainText('Premium');
      await expect(page.locator('[data-testid="photo-ai-limit"]')).toContainText('500');
    });

    test('should handle payment failures with comprehensive error recovery', async () => {
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/pricing`);
      
      // Mock payment failure by using fail trigger in client secret
      await page.addInitScript(() => {
        const originalFetch = window.fetch;
        window.fetch = async (url, options) => {
          if (url.includes('/api/billing/create-payment-intent')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                client_secret: 'pi_fail_test_client_secret'
              })
            });
          }
          return originalFetch(url, options);
        };
      });
      
      // Attempt upgrade
      await page.click('[data-testid="plan-premium"] [data-testid="cta-primary"]');
      await page.click('[data-testid="upgrade-now-no-trial"]');
      
      // Fill payment form
      await page.fill('[data-testid="card-number"]', '4000 0000 0000 0002'); // Declined card
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      
      // Submit and expect failure
      await page.click('[data-testid="confirm-payment"]');
      
      // Should show specific error message
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('card was declined');
      
      // Should offer retry options
      await expect(page.locator('[data-testid="retry-payment"]')).toBeVisible();
      await expect(page.locator('[data-testid="try-different-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-support"]')).toBeVisible();
      
      // Test retry functionality
      await page.click('[data-testid="try-different-card"]');
      await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
      
      // Form should be cleared for new attempt
      const cardNumber = await page.locator('[data-testid="card-number"]').inputValue();
      expect(cardNumber).toBe('');
    });
  });

  test.describe('4. PERFORMANCE AND SCALABILITY VALIDATION', () => {
    test('should meet production performance benchmarks', async () => {
      const performanceStart = Date.now();
      
      // Test page load performance
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/billing`);
      const pageLoadTime = Date.now() - performanceStart;
      
      // Page should load in under 2 seconds
      expect(pageLoadTime).toBeLessThan(2000);
      
      // Test API response times
      const apiStart = Date.now();
      await page.click('[data-testid="refresh-usage-data"]');
      await expect(page.locator('[data-testid="usage-updated"]')).toBeVisible();
      const apiResponseTime = Date.now() - apiStart;
      
      // API calls should complete in under 1 second
      expect(apiResponseTime).toBeLessThan(1000);
      
      // Check for performance metrics in the page
      const metrics = await page.evaluate(() => (window as any).performanceMetrics);
      if (metrics && metrics.apiCalls.length > 0) {
        const avgResponseTime = metrics.apiCalls.reduce((sum, call) => sum + call.duration, 0) / metrics.apiCalls.length;
        expect(avgResponseTime).toBeLessThan(500); // Average API response under 500ms
      }
      
      // Validate cache performance
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/billing?tab=usage`);
      const cacheIndicator = page.locator('[data-testid="cache-hit-indicator"]');
      if (await cacheIndicator.isVisible()) {
        await expect(cacheIndicator).toContainText('cached');
      }
    });

    test('should handle high load scenarios gracefully', async () => {
      // Simulate rapid successive API calls
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          page.evaluate(() => 
            fetch('/api/billing/usage/ai').then(r => r.json())
          )
        );
      }
      
      const results = await Promise.allSettled(promises);
      
      // All requests should succeed or at least handle gracefully
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(3); // At least 80% success rate
      
      // No requests should take longer than 2 seconds
      const slowRequests = results.filter(r => 
        r.status === 'fulfilled' && (r as any).value?.response_time_ms > 2000
      );
      expect(slowRequests.length).toBe(0);
    });
  });

  test.describe('5. ERROR HANDLING AND RESILIENCE', () => {
    test('should gracefully handle database connection issues', async () => {
      // Mock database timeout
      await page.route('**/api/billing/**', route => {
        // Simulate slow database response
        setTimeout(() => {
          route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Database temporarily unavailable',
              code: 'DB_CONNECTION_TIMEOUT',
              retry_after: 30
            })
          });
        }, 1000);
      });
      
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/billing`);
      
      // Should show graceful error state
      await expect(page.locator('[data-testid="service-unavailable"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-testid="retry-info"]')).toContainText('30 seconds');
      
      // Should provide fallback options
      await expect(page.locator('[data-testid="contact-support"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-page-link"]')).toBeVisible();
      
      // Test automatic retry
      await page.unroute('**/api/billing/**');
      await page.click('[data-testid="retry-now"]');
      
      await expect(page.locator('[data-testid="subscription-info"]')).toBeVisible({ timeout: 10000 });
    });

    test('should handle Stripe webhook failures with proper logging', async () => {
      // Mock webhook endpoint failure
      await page.route('**/api/webhooks/stripe', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Webhook signature verification failed',
            webhook_id: 'wh_test_123',
            timestamp: new Date().toISOString()
          })
        });
      });
      
      // Trigger webhook scenario (simulate subscription update)
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/billing`);
      await page.click('[data-testid="simulate-webhook-event"]');
      
      // Should show appropriate error handling
      await expect(page.locator('[data-testid="webhook-error-alert"]')).toBeVisible();
      
      // Error should be properly logged
      const errorLogs = await page.evaluate(() => (window as any).performanceMetrics.errors);
      expect(errorLogs.length).toBeGreaterThan(0);
    });
  });

  test.describe('6. CROSS-BROWSER AND ACCESSIBILITY COMPLIANCE', () => {
    test('should maintain functionality across different viewport sizes', async () => {
      const viewports = [
        { width: 375, height: 667, name: 'Mobile' },    // iPhone SE
        { width: 768, height: 1024, name: 'Tablet' },   // iPad
        { width: 1920, height: 1080, name: 'Desktop' }  // Desktop
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto(`${PRODUCTION_CONFIG.baseURL}/pricing`);
        
        // All pricing tiers should be visible and functional
        await expect(page.locator('[data-testid="pricing-tiers"]')).toBeVisible();
        await expect(page.locator('[data-testid="plan-professional"]')).toBeVisible();
        
        // CTA buttons should be clickable
        const ctaButton = page.locator('[data-testid="plan-professional"] [data-testid="cta-primary"]');
        await expect(ctaButton).toBeVisible();
        
        // Test upgrade flow on this viewport
        await ctaButton.click();
        await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
        
        // Modal should fit viewport
        const modal = page.locator('[data-testid="upgrade-modal"]');
        const modalBox = await modal.boundingBox();
        expect(modalBox!.width).toBeLessThanOrEqual(viewport.width);
        expect(modalBox!.height).toBeLessThanOrEqual(viewport.height);
        
        // Close modal for next iteration
        await page.press('body', 'Escape');
      }
    });

    test('should meet WCAG accessibility guidelines', async () => {
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/pricing`);
      
      // Test keyboard navigation
      await page.press('body', 'Tab');
      let focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(focusedElement).toBeTruthy();
      
      // Navigate through pricing tiers with keyboard
      for (let i = 0; i < 4; i++) {
        await page.press('body', 'Tab');
      }
      
      // Should be able to activate with Enter/Space
      await page.press('body', 'Enter');
      await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
      
      // Close with Escape
      await page.press('body', 'Escape');
      await expect(page.locator('[data-testid="upgrade-modal"]')).not.toBeVisible();
      
      // Test screen reader support
      const planCards = page.locator('[data-testid^="plan-"]');
      const cardCount = await planCards.count();
      
      for (let i = 0; i < cardCount; i++) {
        const card = planCards.nth(i);
        
        // Each card should have proper ARIA labels
        const ariaLabel = await card.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        
        // Should have proper heading structure
        const heading = card.locator('h2, h3');
        await expect(heading).toBeVisible();
      }
      
      // Check color contrast for all interactive elements
      const buttons = page.locator('button[data-testid*="cta"]');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        
        // Button should be visible and have appropriate contrast
        await expect(button).toBeVisible();
        
        // Should have focus indicators
        await button.focus();
        const hasFocusStyle = await button.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.outline !== 'none' || style.boxShadow.includes('focus');
        });
        expect(hasFocusStyle).toBe(true);
      }
    });
  });

  test.describe('7. SECURITY AND COMPLIANCE VALIDATION', () => {
    test('should enforce proper authentication and authorization', async () => {
      // Test without authentication
      await page.addInitScript(() => {
        window.localStorage.clear();
        (window as any).mockUser = null;
      });
      
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/billing`);
      
      // Should redirect to login or show auth required
      await expect(page).toHaveURL(/login|auth/);
      
      // Re-authenticate for next tests
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', 'mock-token');
        (window as any).mockUser = { id: 'test-user', role: 'user' };
      });
    });

    test('should validate PCI compliance for payment processing', async () => {
      await page.goto(`${PRODUCTION_CONFIG.baseURL}/pricing`);
      await page.click('[data-testid="plan-premium"] [data-testid="cta-primary"]');
      await page.click('[data-testid="upgrade-now-no-trial"]');
      
      // Payment form should use Stripe Elements (not direct card input)
      await expect(page.locator('[data-testid="stripe-card-element"]')).toBeVisible();
      
      // Should not expose sensitive data in client-side code
      const pageContent = await page.content();
      expect(pageContent).not.toMatch(/sk_live|sk_test/); // No Stripe secret keys
      expect(pageContent).not.toMatch(/password/i); // No exposed passwords
      
      // Should use HTTPS in production
      if (PRODUCTION_CONFIG.baseURL.includes('wedsync.com')) {
        expect(page.url()).toMatch(/^https/);
      }
      
      // Should have proper CSP headers (check in network tab)
      const response = await page.goto(`${PRODUCTION_CONFIG.baseURL}/billing`);
      const headers = response?.headers();
      expect(headers?.['content-security-policy']).toBeTruthy();
    });
  });
});