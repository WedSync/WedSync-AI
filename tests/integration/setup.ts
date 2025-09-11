/**
 * WS-192 Integration Tests Suite - Setup Module
 * Team C - Integration Testing Infrastructure
 * 
 * Provides comprehensive test isolation and database setup for wedding workflow testing
 * Enhanced with security compliance, RLS policy testing, and realistic wedding scenarios
 */

// Jest globals are available without import
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Pool, PoolClient } from 'pg'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'

// WS-192 Integration test configuration with transaction isolation
export const integrationConfig = {
  databaseUrl: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key',
  testTimeout: 30000,
  maxRetries: 3,
  enableTransactionIsolation: true,
  seedTestData: true,
}

// PostgreSQL connection pool for transaction-based isolation
export const testPool = new Pool({
  connectionString: integrationConfig.databaseUrl,
  max: 20, // Allow multiple concurrent test connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

// Test context interface for comprehensive testing
export interface TestContext {
  supabase: SupabaseClient
  database: PoolClient
  organizationId: string
  testId: string
  mocks: {
    getWebhookQueue: () => Array<{ url: string; payload: any; timestamp: Date }>
    simulateWebhook: (url: string, payload: any) => Promise<void>
  }
  cleanup: () => Promise<void>
}

// Test database client with service role for comprehensive testing
export const testSupabase = createClient(
  integrationConfig.supabaseUrl,
  integrationConfig.supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Create isolated test environment with transaction-based isolation
 * Each test gets its own database transaction that's rolled back after completion
 */
export async function createTestContext(testName: string): Promise<TestContext> {
  const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Get dedicated database connection for this test
  const database = await testPool.connect()
  
  try {
    // Start transaction for complete isolation
    await database.query('BEGIN')
    
    // Create test organization for multi-tenant isolation
    const orgResult = await database.query(
      `INSERT INTO organizations (
        id, name, slug, business_type, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 
        $1, 
        $2, 
        'photographer', 
        NOW(), 
        NOW()
      ) RETURNING id`,
      [`Test Org ${testId}`, `test-org-${testId}`]
    )
    
    const organizationId = orgResult.rows[0].id
    
    // Seed essential test data if enabled
    if (integrationConfig.seedTestData) {
      await seedTestData(database, organizationId, testId)
    }
    
    // Mock webhook queue for testing
    const webhookQueue: Array<{ url: string; payload: any; timestamp: Date }> = []
    
    // Cleanup function to rollback transaction
    const cleanup = async () => {
      try {
        await database.query('ROLLBACK')
        database.release()
      } catch (error) {
        console.error('Failed to cleanup test context:', error)
        database.release()
      }
    }
    
    return {
      supabase: testSupabase,
      database,
      organizationId,
      testId,
      mocks: {
        getWebhookQueue: () => [...webhookQueue],
        simulateWebhook: async (url: string, payload: any) => {
          webhookQueue.push({ url, payload, timestamp: new Date() })
        }
      },
      cleanup
    }
  } catch (error) {
    // Rollback and release on setup failure
    await database.query('ROLLBACK')
    database.release()
    throw new Error(`Test setup failed: ${error.message}`)
  }
}

/**
 * Seed test data for wedding industry scenarios
 */
async function seedTestData(database: PoolClient, organizationId: string, testId: string): Promise<void> {
  // Create test user profile
  await database.query(
    `INSERT INTO user_profiles (
      id, organization_id, email, full_name, role, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      $1,
      $2,
      'Test Photographer',
      'admin',
      NOW(),
      NOW()
    )`,
    [organizationId, `photographer-${testId}@test.com`]
  )

  // Create test client (couple)
  await database.query(
    `INSERT INTO clients (
      id, organization_id, first_name, last_name, email, 
      wedding_date, venue, guest_count, budget, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      $1,
      'John',
      'Doe',
      $2,
      '2025-06-15',
      'Beautiful Garden Venue',
      150,
      50000,
      NOW(),
      NOW()
    )`,
    [organizationId, `couple-${testId}@test.com`]
  )
}

// Mock service worker server for external API mocking
export const mockServer = setupServer(
  // SMS Service Mock
  http.post('*/sms/send', () => {
    return HttpResponse.json({
      id: 'mock-sms-id',
      status: 'sent',
      message: 'SMS sent successfully',
    })
  }),
  
  // Email Service Mock
  http.post('*/email/send', () => {
    return HttpResponse.json({
      id: 'mock-email-id',
      status: 'sent',
      message: 'Email sent successfully',
    })
  }),
  
  // Payment Service Mock (Stripe)
  http.post('*/stripe/payments', () => {
    return HttpResponse.json({
      id: 'mock-payment-id',
      status: 'succeeded',
      amount: 10000,
    })
  }),
  
  // WhatsApp Service Mock
  http.post('*/whatsapp/send', () => {
    return HttpResponse.json({
      id: 'mock-whatsapp-id',
      status: 'sent',
      message: 'WhatsApp message sent',
    })
  })
)

// Test data cleanup utilities
export const testCleanup = {
  async clearTestData() {
    const tables = [
      'clients',
      'vendors',
      'journeys',
      'communications',
      'payments',
      'guest_lists',
      'rsvps',
      'timeline_items',
      'tasks',
    ]
    
    for (const table of tables) {
      await testSupabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all test data
    }
  },
  
  async createTestUser(email: string, role: 'planner' | 'vendor' | 'client' = 'planner') {
    const { data, error } = await testSupabase.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: { role },
    })
    
    if (error) throw error
    return data.user
  },
  
  async authenticateAs(email: string) {
    const { data, error } = await testSupabase.auth.signInWithPassword({
      email,
      password: 'test-password-123',
    })
    
    if (error) throw error
    return data.session
  },
  
  async clearAuthentication() {
    await testSupabase.auth.signOut()
  }
}

// Test data factories for realistic wedding scenarios
export const testDataFactory = {
  createClient: (overrides = {}) => ({
    id: crypto.randomUUID(),
    email: 'test-client@example.com',
    first_name: 'John',
    last_name: 'Smith',
    partner_first_name: 'Jane',
    partner_last_name: 'Doe',
    wedding_date: '2025-06-15',
    venue: 'Beautiful Garden Venue',
    guest_count: 150,
    budget: 50000,
    status: 'active',
    created_at: new Date().toISOString(),
    ...overrides,
  }),
  
  createVendor: (overrides = {}) => ({
    id: crypto.randomUUID(),
    business_name: 'Elegant Flowers Co.',
    contact_email: 'info@elegantflowers.com',
    contact_name: 'Sarah Wilson',
    category: 'florist',
    status: 'verified',
    services: ['bridal bouquets', 'ceremony arrangements', 'reception centerpieces'],
    created_at: new Date().toISOString(),
    ...overrides,
  }),
  
  createJourney: (clientId: string, overrides = {}) => ({
    id: crypto.randomUUID(),
    client_id: clientId,
    name: 'Wedding Planning Journey',
    status: 'active',
    steps: [
      { id: 1, name: 'Initial Consultation', status: 'completed' },
      { id: 2, name: 'Venue Selection', status: 'in_progress' },
      { id: 3, name: 'Vendor Booking', status: 'pending' },
    ],
    created_at: new Date().toISOString(),
    ...overrides,
  }),
  
  createGuest: (clientId: string, overrides = {}) => ({
    id: crypto.randomUUID(),
    client_id: clientId,
    first_name: 'Guest',
    last_name: 'Name',
    email: 'guest@example.com',
    phone: '+1234567890',
    rsvp_status: 'pending',
    dietary_restrictions: [],
    plus_one: false,
    created_at: new Date().toISOString(),
    ...overrides,
  })
}

// WS-192 Global integration test setup with transaction isolation
beforeAll(async () => {
  console.log('🧪 Setting up WS-192 integration test environment...')
  
  // Start mock server for external API simulation
  mockServer.listen({
    onUnhandledRequest: 'warn',
  })
  
  // Verify database connection and schema
  await verifyTestDatabase()
  
  console.log('✅ WS-192 Integration test environment ready')
}, integrationConfig.testTimeout)

afterAll(async () => {
  console.log('🧹 Tearing down WS-192 integration test environment...')
  
  // Stop mock server
  mockServer.close()
  
  // Close database pool
  await testPool.end()
  
  console.log('✨ WS-192 Integration test environment cleaned up')
})

beforeEach(async () => {
  // Reset mock server for each test
  mockServer.resetHandlers()
})

afterEach(async () => {
  // Test-specific cleanup handled by TestContext.cleanup()
  // No global cleanup needed due to transaction isolation
})

/**
 * Verify test database connection and required schema
 */
async function verifyTestDatabase(): Promise<void> {
  try {
    // Test database connection
    const client = await testPool.connect()
    await client.query('SELECT 1')
    
    // Verify required tables exist for wedding platform testing
    const requiredTables = [
      'organizations',
      'user_profiles', 
      'clients',
      'forms',
      'submissions',
      'journeys',
      'integrations'
    ]

    for (const table of requiredTables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      )

      if (!result.rows[0].exists) {
        throw new Error(`Required table '${table}' does not exist in test database`)
      }
    }
    
    client.release()
    console.log('✅ Database schema verification completed')
  } catch (error) {
    throw new Error(`Test database verification failed: ${error.message}`)
  }
}

// Utility functions for integration tests
export const integrationHelpers = {
  // Wait for async operations to complete
  async waitFor(condition: () => Promise<boolean>, timeout = 5000): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error(`Condition not met within ${timeout}ms`)
  },
  
  // Create authenticated request context
  async createAuthenticatedContext(email: string) {
    const user = await testCleanup.createTestUser(email)
    const session = await testCleanup.authenticateAs(email)
    return { user, session }
  },
  
  // Verify database state
  async verifyDatabaseState(table: string, conditions: Record<string, any>) {
    const { data, error } = await testSupabase
      .from(table)
      .select('*')
      .match(conditions)
      
    if (error) throw error
    return data
  }
}