// WS-254: Authentication Setup for Integration Tests
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication for integration tests...');

  // Navigate to the application
  await page.goto('http://localhost:3000');

  // Set up mock authentication in localStorage
  await page.evaluate(() => {
    const mockAuthData = {
      access_token: 'mock-test-token-' + Date.now(),
      refresh_token: 'mock-refresh-token',
      expires_at: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      expires_in: 86400,
      token_type: 'bearer',
      user: {
        id: 'supplier-123',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'test@example.com',
        email_confirmed_at: '2025-01-01T00:00:00.000Z',
        phone: '',
        confirmed_at: '2025-01-01T00:00:00.000Z',
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {
          provider: 'email',
          providers: ['email'],
        },
        user_metadata: {
          email: 'test@example.com',
          full_name: 'Test Supplier',
          avatar_url: '',
          role: 'supplier',
        },
        identities: [
          {
            id: 'supplier-123',
            user_id: 'supplier-123',
            identity_data: {
              email: 'test@example.com',
              sub: 'supplier-123',
            },
            provider: 'email',
            created_at: '2025-01-01T00:00:00.000Z',
            last_sign_in_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          },
        ],
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: new Date().toISOString(),
      },
    };

    // Store in the format expected by Supabase Auth
    window.localStorage.setItem(
      'supabase.auth.token',
      JSON.stringify(mockAuthData),
    );

    // Also set session data
    window.localStorage.setItem(
      'sb-' + window.location.hostname.replace(/\./g, '-') + '-auth-token',
      JSON.stringify(mockAuthData),
    );

    // Set organization context
    window.localStorage.setItem(
      'wedsync.organization',
      JSON.stringify({
        id: 'test-org-123',
        name: 'Test Catering Company',
        slug: 'test-catering',
        tier: 'professional',
        features: {
          dietary_management: true,
          ai_menu_generation: true,
          advanced_analytics: true,
        },
      }),
    );

    // Set user preferences
    window.localStorage.setItem(
      'wedsync.preferences',
      JSON.stringify({
        theme: 'light',
        notifications: {
          email: true,
          browser: true,
          high_severity_alerts: true,
        },
        dietary_settings: {
          auto_save_interval: 30,
          show_compliance_warnings: true,
          require_emergency_contact_high_severity: true,
        },
      }),
    );
  });

  // Verify authentication works by navigating to a protected route
  await page.goto('/catering/dietary');

  // Wait for the page to load and verify we're authenticated
  await expect(page.locator('[data-testid="dietary-dashboard"]')).toBeVisible({
    timeout: 10000,
  });

  // Verify user is logged in (should not see login button)
  await expect(page.locator('text=Sign In')).not.toBeVisible();

  // Save authenticated state
  await page.context().storageState({ path: authFile });

  console.log('✅ Authentication setup completed');
});
