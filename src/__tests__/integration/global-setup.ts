// WS-254: Global Playwright Setup
import { chromium, FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  console.log('🚀 Starting global setup for WS-254 integration tests...');

  // Initialize Supabase client for test data setup
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Setup test database state
    console.log('📊 Setting up test database...');

    // Create test organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .upsert(
        {
          id: 'test-org-123',
          name: 'Test Catering Company',
          slug: 'test-catering',
          subscription_tier: 'professional',
          settings: {
            dietary_management_enabled: true,
            ai_menu_generation_enabled: true,
          },
        },
        {
          onConflict: 'id',
        },
      )
      .select()
      .single();

    if (orgError) {
      console.error('Failed to create test organization:', orgError);
    }

    // Create test user profile
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          id: 'supplier-123',
          email: 'test@example.com',
          full_name: 'Test Supplier',
          role: 'supplier',
          organization_id: 'test-org-123',
          permissions: {
            dietary_management: ['read', 'write', 'delete'],
            menu_generation: ['read', 'write'],
          },
        },
        {
          onConflict: 'id',
        },
      )
      .select()
      .single();

    if (userError) {
      console.error('Failed to create test user profile:', userError);
    }

    // Create test clients and weddings
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .upsert(
        {
          id: 'client-123',
          organization_id: 'test-org-123',
          first_name: 'John',
          last_name: 'Smith',
          email: 'john@example.com',
          phone: '+44123456789',
        },
        {
          onConflict: 'id',
        },
      )
      .select()
      .single();

    if (clientError) {
      console.error('Failed to create test client:', clientError);
    }

    const testWeddings = [
      {
        id: 'wedding-123',
        client_id: 'client-123',
        organization_id: 'test-org-123',
        wedding_date: '2025-06-15',
        venue_name: 'Test Venue',
        guest_count: 120,
        status: 'active',
      },
      {
        id: 'wedding-456',
        client_id: 'client-123',
        organization_id: 'test-org-123',
        wedding_date: '2025-08-20',
        venue_name: 'Garden Venue',
        guest_count: 80,
        status: 'active',
      },
      {
        id: 'wedding-789',
        client_id: 'client-123',
        organization_id: 'test-org-123',
        wedding_date: '2025-09-10',
        venue_name: 'Beach Venue',
        guest_count: 200,
        status: 'active',
      },
    ];

    for (const wedding of testWeddings) {
      const { error: weddingError } = await supabase
        .from('weddings')
        .upsert(wedding, { onConflict: 'id' });

      if (weddingError) {
        console.error(`Failed to create wedding ${wedding.id}:`, weddingError);
      }
    }

    // Create test dietary requirements
    const testDietaryRequirements = [
      {
        id: 'req-1',
        wedding_id: 'wedding-123',
        organization_id: 'test-org-123',
        guest_name: 'Sarah Johnson',
        category: 'allergy',
        severity: 5,
        notes: 'Severe nut allergy - EpiPen required',
        emergency_contact: '+44987654321',
        verified: true,
      },
      {
        id: 'req-2',
        wedding_id: 'wedding-123',
        organization_id: 'test-org-123',
        guest_name: 'Mike Chen',
        category: 'diet',
        severity: 3,
        notes: 'Vegetarian diet',
        verified: true,
      },
      {
        id: 'req-3',
        wedding_id: 'wedding-123',
        organization_id: 'test-org-123',
        guest_name: 'Lisa Brown',
        category: 'allergy',
        severity: 4,
        notes: 'Gluten intolerance',
        verified: false,
      },
    ];

    for (const requirement of testDietaryRequirements) {
      const { error: reqError } = await supabase
        .from('dietary_requirements')
        .upsert(requirement, { onConflict: 'id' });

      if (reqError) {
        console.error(
          `Failed to create dietary requirement ${requirement.id}:`,
          reqError,
        );
      }
    }

    // 2. Setup authentication state
    console.log('🔐 Setting up authentication...');

    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Navigate to the application
    await page.goto(baseURL || 'http://localhost:3000');

    // Set up authentication state in localStorage
    await page.evaluate(() => {
      const authData = {
        access_token: 'mock-test-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        user: {
          id: 'supplier-123',
          email: 'test@example.com',
          role: 'supplier',
          app_metadata: {
            provider: 'email',
            providers: ['email'],
          },
          user_metadata: {
            email: 'test@example.com',
            full_name: 'Test Supplier',
          },
        },
      };

      window.localStorage.setItem(
        'supabase.auth.token',
        JSON.stringify(authData),
      );

      // Also set organization context
      window.localStorage.setItem(
        'wedsync.organization',
        JSON.stringify({
          id: 'test-org-123',
          name: 'Test Catering Company',
          tier: 'professional',
        }),
      );
    });

    // Save authentication state
    await page.context().storageState({ path: 'playwright/.auth/user.json' });
    await browser.close();

    // 3. Pre-populate caches and warm up services
    console.log('🔥 Warming up services...');

    // Warm up API endpoints
    const browser2 = await chromium.launch();
    const context = await browser2.newContext({
      storageState: 'playwright/.auth/user.json',
    });
    const warmupPage = await context.newPage();

    try {
      // Pre-load key pages to warm up caches
      await warmupPage.goto(`${baseURL}/catering/dietary`);
      await warmupPage.waitForLoadState('networkidle');

      await warmupPage.goto(`${baseURL}/catering/menu-generator`);
      await warmupPage.waitForLoadState('networkidle');

      console.log('✅ Services warmed up successfully');
    } catch (error) {
      console.warn('⚠️  Service warmup failed (non-critical):', error);
    } finally {
      await browser2.close();
    }

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;
