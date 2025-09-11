/**
 * WS-251: Mobile Enterprise SSO End-to-End Testing Suite
 * Team E - Round 1
 * 
 * Comprehensive E2E testing for enterprise SSO on mobile devices
 * Testing mobile authentication flows, biometric integration, and wedding day scenarios
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import {
  MobileAuthenticationFlow,
  BiometricAuthenticationService,
  MobileSSOTokenManager,
  OfflineModeManager
} from '@/lib/auth/mobile-enterprise';

describe('Mobile Enterprise SSO Authentication Flows', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let mobileAuthFlow: MobileAuthenticationFlow;

  beforeEach(async () => {
    browser = await chromium.launch();
    context = await browser.newContext({
      viewport: { width: 375, height: 812 }, // iPhone X dimensions
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      hasTouch: true,
      isMobile: true
    });
    page = await context.newPage();
    mobileAuthFlow = new MobileAuthenticationFlow(context);
  });

  afterEach(async () => {
    await browser.close();
  });

  describe('Mobile SSO Login Flow for Wedding Professionals', () => {
    test('should complete SAML SSO login flow on mobile device', async () => {
      // Navigate to WedSync mobile login
      await page.goto('https://wedsync.com/mobile/login');
      
      // Wait for mobile-optimized login interface
      await page.waitForSelector('[data-testid="mobile-sso-login"]');
      
      // Select enterprise SSO option
      await page.tap('[data-testid="enterprise-sso-button"]');
      
      // Enter wedding business domain
      await page.fill('[data-testid="business-domain"]', 'luxuryweddings.com');
      await page.tap('[data-testid="continue-button"]');
      
      // Should redirect to enterprise IdP
      await page.waitForURL(/identity\.luxuryweddings\.com/);
      
      // Mock enterprise authentication
      await page.fill('[data-testid="username"]', 'wedding.planner@luxuryweddings.com');
      await page.fill('[data-testid="password"]', 'SecureWeddingPassword123!');
      await page.tap('[data-testid="sign-in-button"]');
      
      // Handle MFA on mobile
      await page.waitForSelector('[data-testid="mfa-code-input"]');
      await page.fill('[data-testid="mfa-code-input"]', '123456');
      await page.tap('[data-testid="verify-button"]');
      
      // Should redirect back to WedSync
      await page.waitForURL(/wedsync\.com/);
      
      // Verify successful authentication
      const userProfile = await page.locator('[data-testid="user-profile"]');
      await expect(userProfile).toContainText('wedding.planner@luxuryweddings.com');
      
      // Verify mobile-specific wedding dashboard loaded
      await expect(page.locator('[data-testid="mobile-wedding-dashboard"]')).toBeVisible();
      
      // Verify touch-friendly navigation
      const mobileNav = page.locator('[data-testid="mobile-nav"]');
      await expect(mobileNav).toBeVisible();
    });

    test('should handle OIDC authentication with PKCE on mobile', async () => {
      await page.goto('https://wedsync.com/mobile/login');
      
      // Select OIDC provider
      await page.tap('[data-testid="oidc-login"]');
      await page.selectOption('[data-testid="oidc-provider"]', 'azure-ad');
      
      // Should initiate PKCE flow
      const authUrl = await page.url();
      expect(authUrl).toContain('code_challenge');
      expect(authUrl).toContain('code_challenge_method=S256');
      
      // Complete OIDC flow
      await completeMockOIDCFlow(page);
      
      // Verify tokens received
      const tokenInfo = await mobileAuthFlow.getTokenInfo();
      expect(tokenInfo.accessToken).toBeDefined();
      expect(tokenInfo.refreshToken).toBeDefined();
      expect(tokenInfo.idToken).toBeDefined();
      
      // Verify wedding industry claims in token
      const claims = await mobileAuthFlow.parseIdToken(tokenInfo.idToken);
      expect(claims.wedding_role).toBeDefined();
      expect(claims.venue_access).toBeDefined();
    });

    test('should support social login integration for small wedding businesses', async () => {
      await page.goto('https://wedsync.com/mobile/login');
      
      // Test Google SSO for small businesses
      await page.tap('[data-testid="google-sso"]');
      
      // Should open Google OAuth flow in mobile webview
      await page.waitForURL(/accounts\.google\.com/);
      
      // Complete Google authentication
      await page.fill('input[type="email"]', 'wedding@smallbiz.com');
      await page.tap('#identifierNext');
      await page.waitForSelector('input[type="password"]');
      await page.fill('input[type="password"]', 'GooglePassword123');
      await page.tap('#passwordNext');
      
      // Handle consent screen for wedding app permissions
      await page.waitForSelector('[data-testid="consent-wedding-access"]');
      await page.tap('[data-testid="allow-button"]');
      
      // Verify successful login
      await page.waitForURL(/wedsync\.com/);
      const welcomeMessage = page.locator('[data-testid="welcome-message"]');
      await expect(welcomeMessage).toContainText('Welcome to WedSync');
    });
  });

  describe('Biometric Authentication Integration', () => {
    test('should enable biometric authentication after initial SSO setup', async () => {
      // Complete initial SSO login
      await completeInitialSSOLogin(page);
      
      // Navigate to security settings
      await page.tap('[data-testid="menu-button"]');
      await page.tap('[data-testid="security-settings"]');
      
      // Enable biometric authentication
      await page.tap('[data-testid="enable-biometric-auth"]');
      
      // Mock biometric enrollment (TouchID/FaceID)
      await page.evaluate(() => {
        // Simulate biometric capability detection
        (window as any).mockBiometricSupport = true;
        (window as any).mockBiometricEnrollment = 'success';
      });
      
      // Verify biometric setup
      const biometricStatus = await page.locator('[data-testid="biometric-status"]');
      await expect(biometricStatus).toContainText('Enabled');
      
      // Test subsequent login with biometrics
      await page.tap('[data-testid="logout-button"]');
      await page.goto('https://wedsync.com/mobile/login');
      
      // Should show biometric login option
      const biometricLogin = page.locator('[data-testid="biometric-login"]');
      await expect(biometricLogin).toBeVisible();
      
      // Simulate biometric authentication
      await page.tap('[data-testid="biometric-login"]');
      await page.evaluate(() => {
        (window as any).mockBiometricAuth = 'success';
      });
      
      // Should login automatically with biometric
      await page.waitForURL(/wedsync\.com\/dashboard/);
      const dashboard = page.locator('[data-testid="mobile-wedding-dashboard"]');
      await expect(dashboard).toBeVisible();
    });

    test('should fallback to SSO when biometric authentication fails', async () => {
      await setupBiometricAuthUser(page);
      
      await page.goto('https://wedsync.com/mobile/login');
      await page.tap('[data-testid="biometric-login"]');
      
      // Simulate biometric failure
      await page.evaluate(() => {
        (window as any).mockBiometricAuth = 'failed';
      });
      
      // Should show fallback options
      await expect(page.locator('[data-testid="biometric-fallback"]')).toBeVisible();
      await page.tap('[data-testid="use-sso-instead"]');
      
      // Should redirect to SSO flow
      await expect(page.locator('[data-testid="enterprise-sso-button"]')).toBeVisible();
    });
  });

  describe('Wedding Day Mobile Authentication Scenarios', () => {
    test('should handle wedding day venue login with poor network conditions', async () => {
      // Simulate poor network (wedding venues often have weak WiFi)
      await context.route('**/*', route => {
        if (Math.random() < 0.3) { // 30% chance of timeout
          route.abort('timeout');
        } else {
          route.continue();
        }
      });
      
      await page.goto('https://wedsync.com/mobile/login');
      
      // Should show offline-capable login options
      const offlineLogin = page.locator('[data-testid="offline-login-available"]');
      await expect(offlineLogin).toBeVisible();
      
      // Use cached credentials if available
      await page.tap('[data-testid="use-cached-login"]');
      
      // Verify limited functionality in offline mode
      await page.waitForSelector('[data-testid="offline-mode-banner"]');
      const offlineBanner = page.locator('[data-testid="offline-mode-banner"]');
      await expect(offlineBanner).toContainText('Limited offline access');
      
      // Essential wedding day functions should still work
      await expect(page.locator('[data-testid="guest-checkin"]')).toBeVisible();
      await expect(page.locator('[data-testid="seating-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeline-view"]')).toBeVisible();
    });

    test('should support multiple venue staff simultaneous login', async () => {
      // Simulate multiple staff members logging in
      const staffAccounts = [
        { email: 'coordinator@grandvenue.com', role: 'venue_coordinator' },
        { email: 'catering@grandvenue.com', role: 'catering_manager' },
        { email: 'security@grandvenue.com', role: 'venue_security' }
      ];

      for (const staff of staffAccounts) {
        // Open new context for each staff member
        const staffContext = await browser.newContext({
          viewport: { width: 375, height: 812 },
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          hasTouch: true,
          isMobile: true
        });
        
        const staffPage = await staffContext.newPage();
        
        await staffPage.goto('https://wedsync.com/mobile/login');
        await staffPage.tap('[data-testid="enterprise-sso-button"]');
        await staffPage.fill('[data-testid="email"]', staff.email);
        
        // Complete authentication flow
        await completeMockAuthentication(staffPage, staff);
        
        // Verify role-based access
        const roleIndicator = staffPage.locator('[data-testid="user-role"]');
        await expect(roleIndicator).toContainText(staff.role);
        
        // Verify appropriate wedding day tools are available
        await verifyWeddingDayTools(staffPage, staff.role);
        
        await staffContext.close();
      }
    });

    test('should handle emergency access during wedding events', async () => {
      await page.goto('https://wedsync.com/mobile/login');
      
      // Emergency access button for wedding day issues
      await page.tap('[data-testid="emergency-access"]');
      
      // Verify wedding date and venue
      await page.fill('[data-testid="wedding-date"]', '2024-06-22');
      await page.fill('[data-testid="venue-code"]', 'GRAND-BALLROOM-123');
      await page.tap('[data-testid="verify-emergency"]');
      
      // Should provide temporary access
      await page.waitForSelector('[data-testid="emergency-access-granted"]');
      
      // Limited time access with essential features only
      const accessTimer = page.locator('[data-testid="access-timer"]');
      await expect(accessTimer).toBeVisible();
      
      // Essential wedding day features should be available
      await expect(page.locator('[data-testid="emergency-contacts"]')).toBeVisible();
      await expect(page.locator('[data-testid="vendor-coordination"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeline-emergency"]')).toBeVisible();
    });
  });

  describe('Mobile Token Management and Security', () => {
    test('should securely store and refresh SSO tokens on mobile', async () => {
      const tokenManager = new MobileSSOTokenManager();
      
      await completeInitialSSOLogin(page);
      
      // Verify tokens are stored securely in device keychain
      const tokenStorage = await tokenManager.getTokenStorageInfo();
      expect(tokenStorage.useSecureStorage).toBe(true);
      expect(tokenStorage.biometricProtection).toBe(true);
      
      // Test token refresh before expiration
      await page.evaluate(() => {
        // Fast forward time to near token expiration
        jest.advanceTimersByTime(3300000); // 55 minutes
      });
      
      // Make API call that triggers token refresh
      await page.tap('[data-testid="refresh-dashboard"]');
      
      // Verify token was refreshed silently
      const newTokenInfo = await tokenManager.getTokenInfo();
      expect(newTokenInfo.refreshCount).toBe(1);
      expect(newTokenInfo.lastRefresh).toBeDefined();
      
      // User should not have been interrupted
      const dashboard = page.locator('[data-testid="mobile-wedding-dashboard"]');
      await expect(dashboard).toBeVisible();
    });

    test('should handle token expiration gracefully', async () => {
      await completeInitialSSOLogin(page);
      
      // Simulate token expiration
      await page.evaluate(() => {
        localStorage.setItem('tokenExpired', 'true');
      });
      
      // Navigate to protected resource
      await page.tap('[data-testid="client-details"]');
      
      // Should redirect to re-authentication
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
      
      // Should offer quick re-authentication options
      const quickAuth = page.locator('[data-testid="quick-reauth"]');
      await expect(quickAuth).toBeVisible();
      
      // Biometric re-auth should work if enabled
      if (await page.locator('[data-testid="biometric-reauth"]').isVisible()) {
        await page.tap('[data-testid="biometric-reauth"]');
        
        // Mock successful biometric re-auth
        await page.evaluate(() => {
          (window as any).mockBiometricAuth = 'success';
        });
        
        // Should continue to original destination
        await page.waitForSelector('[data-testid="client-details-page"]');
      }
    });

    test('should support session management across app lifecycle', async () => {
      await completeInitialSSOLogin(page);
      
      // Simulate app backgrounding (common during wedding day)
      await page.evaluate(() => {
        window.dispatchEvent(new Event('pagehide'));
      });
      
      // Simulate returning to app after 30 minutes
      setTimeout(async () => {
        await page.evaluate(() => {
          window.dispatchEvent(new Event('pageshow'));
        });
      }, 100);
      
      // Should prompt for re-authentication after extended background time
      await expect(page.locator('[data-testid="session-verification"]')).toBeVisible();
      
      // Quick verification should work
      await page.tap('[data-testid="verify-session"]');
      
      // Should continue with previous session
      const dashboard = page.locator('[data-testid="mobile-wedding-dashboard"]');
      await expect(dashboard).toBeVisible();
    });
  });

  describe('Offline Mode and Progressive Web App Features', () => {
    test('should cache essential wedding data for offline access', async () => {
      const offlineModeManager = new OfflineModeManager();
      
      await completeInitialSSOLogin(page);
      
      // Load wedding day data
      await page.tap('[data-testid="todays-weddings"]');
      await page.waitForSelector('[data-testid="wedding-list"]');
      
      // Verify data is cached for offline access
      const cachedData = await offlineModeManager.getCachedWeddingData();
      expect(cachedData.weddings).toBeDefined();
      expect(cachedData.guestLists).toBeDefined();
      expect(cachedData.seatingCharts).toBeDefined();
      expect(cachedData.timelines).toBeDefined();
      
      // Simulate going offline
      await context.setOffline(true);
      
      // Refresh page to test offline functionality
      await page.reload();
      
      // Should show offline mode banner
      await expect(page.locator('[data-testid="offline-mode-active"]')).toBeVisible();
      
      // Cached wedding data should still be accessible
      const offlineWeddings = page.locator('[data-testid="offline-wedding-list"]');
      await expect(offlineWeddings).toBeVisible();
      
      // Essential features should work offline
      await page.tap('[data-testid="wedding-item-0"]');
      await expect(page.locator('[data-testid="offline-guest-checkin"]')).toBeVisible();
    });

    test('should sync changes when connection is restored', async () => {
      await setupOfflineMode(page);
      
      // Make changes while offline
      await page.tap('[data-testid="guest-item-0"]');
      await page.tap('[data-testid="mark-arrived"]');
      
      // Changes should be queued for sync
      const pendingChanges = await page.evaluate(() => {
        return localStorage.getItem('pendingSyncItems');
      });
      expect(JSON.parse(pendingChanges).length).toBe(1);
      
      // Restore connection
      await context.setOffline(false);
      await page.tap('[data-testid="sync-now"]');
      
      // Should sync changes automatically
      await page.waitForSelector('[data-testid="sync-completed"]');
      
      // Verify changes persisted
      const guestStatus = page.locator('[data-testid="guest-status-0"]');
      await expect(guestStatus).toContainText('Arrived');
    });
  });
});

// Helper functions for testing
async function completeInitialSSOLogin(page: Page) {
  await page.goto('https://wedsync.com/mobile/login');
  await page.tap('[data-testid="enterprise-sso-button"]');
  await page.fill('[data-testid="business-domain"]', 'testwedding.com');
  await page.tap('[data-testid="continue-button"]');
  await page.waitForURL(/wedsync\.com\/dashboard/);
}

async function completeMockOIDCFlow(page: Page) {
  // Mock OIDC provider authentication
  await page.fill('[data-testid="oidc-username"]', 'wedding.pro@testwedding.com');
  await page.fill('[data-testid="oidc-password"]', 'SecurePassword123!');
  await page.tap('[data-testid="oidc-signin"]');
  await page.waitForURL(/wedsync\.com/);
}

async function setupBiometricAuthUser(page: Page) {
  await completeInitialSSOLogin(page);
  await page.tap('[data-testid="menu-button"]');
  await page.tap('[data-testid="security-settings"]');
  await page.tap('[data-testid="enable-biometric-auth"]');
  await page.evaluate(() => {
    (window as any).mockBiometricEnrollment = 'success';
  });
}

async function completeMockAuthentication(page: Page, staff: { email: string; role: string }) {
  await page.fill('[data-testid="password"]', 'StaffPassword123!');
  await page.tap('[data-testid="login-button"]');
  await page.waitForSelector('[data-testid="mobile-wedding-dashboard"]');
}

async function verifyWeddingDayTools(page: Page, role: string) {
  const roleTools = {
    'venue_coordinator': ['guest-checkin', 'room-setup', 'vendor-coordination'],
    'catering_manager': ['menu-management', 'dietary-restrictions', 'service-timeline'],
    'venue_security': ['guest-verification', 'emergency-contacts', 'access-control']
  };
  
  for (const tool of roleTools[role] || []) {
    await expect(page.locator(`[data-testid="${tool}"]`)).toBeVisible();
  }
}

async function setupOfflineMode(page: Page) {
  await completeInitialSSOLogin(page);
  await page.tap('[data-testid="todays-weddings"]');
  await page.waitForSelector('[data-testid="wedding-list"]');
  await page.context().setOffline(true);
}