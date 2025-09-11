/**
 * 🛡️ WEDDING PLATFORM SECURITY GUARDIAN
 *
 * This file ensures that NO test data ever touches production wedding data.
 * Your couples' memories and vendor data are SACRED and must be protected.
 */

// Test-only database configuration - NEVER touches production
export const TEST_DATABASE_CONFIG = {
  projectId: 'test-wedding-platform',
  projectUrl: 'http://localhost:54321', // Local Supabase only
  anonKey: 'test_anon_key_safe_for_testing',
  serviceKey: 'test_service_key_safe_for_testing',
} as const;

// Secure test secrets - clearly marked as test-only
export const TEST_WEBHOOK_SECRETS = {
  STRIPE_WEBHOOK_SECRET: 'TEST_WEBHOOK_PLACEHOLDER',
  EMAIL_WEBHOOK_SECRET: 'test_email_webhook_secret_isolated_from_production',
  SUPPLIER_WEBHOOK_SECRET: 'test_supplier_webhook_secret_safe_for_testing',
  SMS_WEBHOOK_SECRET: 'test_sms_webhook_secret_testing_environment_only',
} as const;

// Test-only payment configuration
export const TEST_PAYMENT_CONFIG = {
  stripePublishableKey: 'pk_test_wedding_platform_testing_safe',
  stripeSecretKey: 'TEST_STRIPE_KEY_PLACEHOLDER',
  // Test mode price IDs - these won't charge real money
  priceIds: {
    starter_monthly: 'price_test_starter_monthly_safe',
    starter_yearly: 'price_test_starter_yearly_safe',
    professional_monthly: 'price_test_professional_monthly_safe',
    professional_yearly: 'price_test_professional_yearly_safe',
    scale_monthly: 'price_test_scale_monthly_safe',
    scale_yearly: 'price_test_scale_yearly_safe',
  },
} as const;

// Wedding-specific test data - realistic but clearly fake
export const TEST_WEDDING_DATA = {
  couples: {
    testCouple1: {
      bride: 'Emma Test',
      groom: 'James Test',
      weddingDate: '2025-06-15',
      venue: 'Test Wedding Venue',
      email: 'test.couple@weddingtest.com',
    },
    testCouple2: {
      bride: 'Sarah Testing',
      groom: 'Michael Testing',
      weddingDate: '2025-07-20',
      venue: 'Testing Gardens Venue',
      email: 'testing.couple@weddingtest.com',
    },
  },
  suppliers: {
    photographer: {
      name: 'Test Photography Studio',
      email: 'test.photographer@suppliertest.com',
      type: 'photography',
      tier: 'professional',
    },
    venue: {
      name: 'Test Wedding Venue',
      email: 'test.venue@suppliertest.com',
      type: 'venue',
      tier: 'scale',
    },
  },
} as const;

/**
 * 🚨 PRODUCTION SAFETY CHECK
 * This function ensures we're NEVER accidentally testing against production
 */
export function ensureTestEnvironment(): void {
  const productionIndicators = [
    'azhgptjkqiiqvvvhapml', // Your actual Supabase project ID
    'wedsync-prod',
    'production',
    'prod',
    'live',
    'stripe.com/dashboard', // Real Stripe
    'resend.com', // Real email service
  ];

  // Check environment variables for any production indicators
  const envString = JSON.stringify(process.env);

  for (const indicator of productionIndicators) {
    if (envString.includes(indicator)) {
      throw new Error(`
        🚨 PRODUCTION SAFETY VIOLATION DETECTED! 🚨
        
        Found production indicator "${indicator}" in test environment.
        This could result in test data contaminating real weddings!
        
        Tests are BLOCKED to protect your couples and suppliers.
        
        Please ensure you're using test-only configuration:
        - Test database: ${TEST_DATABASE_CONFIG.projectUrl}
        - Test project ID: ${TEST_DATABASE_CONFIG.projectId}
        - All secrets must be test-only versions
        
        WEDDING DATA IS SACRED - WE NEVER RISK REAL WEDDINGS!
      `);
    }
  }

  // Ensure we're using localhost for database connections
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('127.0.0.1')
  ) {
    throw new Error(`
      🚨 DATABASE SAFETY VIOLATION! 🚨
      
      Tests are trying to connect to a remote database: ${process.env.NEXT_PUBLIC_SUPABASE_URL}
      This could corrupt real wedding data!
      
      Tests must ONLY use local database: ${TEST_DATABASE_CONFIG.projectUrl}
    `);
  }
}

/**
 * Set up completely isolated test environment
 * This ensures NO interaction with production systems
 */
export function setupTestEnvironment(): void {
  // First, run our safety check
  ensureTestEnvironment();

  // Set safe test environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_SUPABASE_URL = TEST_DATABASE_CONFIG.projectUrl;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = TEST_DATABASE_CONFIG.anonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_DATABASE_CONFIG.serviceKey;

  // Set test webhook secrets
  process.env.STRIPE_WEBHOOK_SECRET =
    TEST_WEBHOOK_SECRETS.STRIPE_WEBHOOK_SECRET;
  process.env.EMAIL_WEBHOOK_SECRET = TEST_WEBHOOK_SECRETS.EMAIL_WEBHOOK_SECRET;
  process.env.SUPPLIER_WEBHOOK_SECRET =
    TEST_WEBHOOK_SECRETS.SUPPLIER_WEBHOOK_SECRET;
  process.env.SMS_WEBHOOK_SECRET = TEST_WEBHOOK_SECRETS.SMS_WEBHOOK_SECRET;

  // Set test payment configuration
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY =
    TEST_PAYMENT_CONFIG.stripePublishableKey;
  process.env.STRIPE_SECRET_KEY = TEST_PAYMENT_CONFIG.stripeSecretKey;

  // Clear any production price IDs to prevent accidental charges
  process.env.STRIPE_STARTER_MONTHLY_PRICE_ID =
    TEST_PAYMENT_CONFIG.priceIds.starter_monthly;
  process.env.STRIPE_STARTER_YEARLY_PRICE_ID =
    TEST_PAYMENT_CONFIG.priceIds.starter_yearly;
  process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID =
    TEST_PAYMENT_CONFIG.priceIds.professional_monthly;
  process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID =
    TEST_PAYMENT_CONFIG.priceIds.professional_yearly;
  process.env.STRIPE_SCALE_MONTHLY_PRICE_ID =
    TEST_PAYMENT_CONFIG.priceIds.scale_monthly;
  process.env.STRIPE_SCALE_YEARLY_PRICE_ID =
    TEST_PAYMENT_CONFIG.priceIds.scale_yearly;

  console.log('🛡️ Test environment secured - wedding data protected!');
}

/**
 * Clean up test environment after tests complete
 */
export function cleanupTestEnvironment(): void {
  // Remove all test environment variables
  const testEnvVars = [
    'STRIPE_WEBHOOK_SECRET',
    'EMAIL_WEBHOOK_SECRET',
    'SUPPLIER_WEBHOOK_SECRET',
    'SMS_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
  ];

  testEnvVars.forEach((varName) => {
    delete process.env[varName];
  });

  console.log('🧹 Test environment cleaned - ready for next test run');
}

/**
 * Mock wedding-critical dates to prevent Saturday deployment issues
 */
export function mockWeddingDates(mockDate: Date): void {
  // If it's a Saturday, tests should simulate wedding day protection
  if (mockDate.getDay() === 6) {
    // Saturday
    process.env.WEDDING_DAY_PROTECTION = 'true';
    process.env.READ_ONLY_MODE = 'true';
    console.log(
      '🎊 Saturday detected - wedding day protection activated in tests',
    );
  } else {
    delete process.env.WEDDING_DAY_PROTECTION;
    delete process.env.READ_ONLY_MODE;
  }
}

/**
 * Create test wedding scenarios for comprehensive testing
 */
export function createTestWeddingScenario(
  scenario: 'normal' | 'high_load' | 'poor_signal' | 'payment_failure',
): void {
  switch (scenario) {
    case 'normal':
      // Standard happy path testing
      break;
    case 'high_load':
      // Simulate wedding day with 200+ guests uploading photos
      process.env.TEST_SCENARIO = 'high_load';
      process.env.SIMULATED_USERS = '250';
      break;
    case 'poor_signal':
      // Simulate venue with poor mobile signal
      process.env.TEST_SCENARIO = 'poor_signal';
      process.env.SIMULATED_LATENCY = '3000'; // 3 second delays
      break;
    case 'payment_failure':
      // Test payment system resilience
      process.env.TEST_SCENARIO = 'payment_failure';
      process.env.SIMULATE_PAYMENT_FAILURES = 'true';
      break;
  }
}
