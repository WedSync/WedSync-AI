# 02-integration-tests.md

# Integration Tests Implementation

## What to Build

Create comprehensive integration tests that verify interactions between multiple components, API endpoints with database operations, and third-party service integrations. Tests should validate complete data flows and business logic across system boundaries.

## Test Environment Setup

```
// tests/integration/setup.ts
import { createClient } from '@supabase/supabase-js'
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { execSync } from 'child_process'

// Create test database client
export const testDb = createClient(
  process.env.SUPABASE_TEST_URL!,
  process.env.SUPABASE_TEST_SERVICE_KEY!
)

// Test user contexts
export const testSupplier = {
  id: 'test-supplier-123',
  email: '[supplier@test.com](mailto:supplier@test.com)',
  tier: 'professional'
}

export const testCouple = {
  id: 'test-couple-456',
  email: '[couple@test.com](mailto:couple@test.com)'
}

beforeAll(async () => {
  // Run database migrations
  execSync('npm run db:migrate:test')
  
  // Seed test data
  await testDb.rpc('seed_test_data')
})

beforeEach(async () => {
  // Start transaction for test isolation
  await testDb.rpc('begin_test_transaction')
})

afterEach(async () => {
  // Rollback transaction to clean state
  await testDb.rpc('rollback_test_transaction')
})

afterAll(async () => {
  // Clean up test database
  await testDb.rpc('cleanup_test_database')
})
```

## Supplier-Couple Connection Flow

```
// tests/integration/supplier-couple-flow.test.ts
import { describe, it, expect } from 'vitest'
import { testDb, testSupplier, testCouple } from './setup'
import { connectSupplierToCouple } from '@/lib/connections'

describe('Supplier-Couple Connection Integration', () => {
  it('should establish full connection with data sync', async () => {
    // Create supplier with forms
    const supplier = await testDb
      .from('suppliers')
      .insert(testSupplier)
      .select()
      .single()
    
    const form = await testDb
      .from('forms')
      .insert({
        supplier_id: [supplier.data.id](http://supplier.data.id),
        name: 'Photography Questionnaire',
        fields: [
          { id: 'wedding_date', type: 'date', core_field: true },
          { id: 'venue_name', type: 'text', core_field: true },
          { id: 'photo_style', type: 'select', core_field: false }
        ]
      })
      .select()
      .single()
    
    // Create couple with core fields
    const couple = await testDb
      .from('couples')
      .insert({
        ...testCouple,
        core_fields: {
          wedding_date: '2025-06-15',
          venue_name: 'The Barn at Grimsby',
          guest_count: 120
        }
      })
      .select()
      .single()
    
    // Connect supplier to couple
    const connection = await connectSupplierToCouple(
      [supplier.data.id](http://supplier.data.id),
      [couple.data.id](http://couple.data.id)
    )
    
    // Verify connection created
    expect(connection.status).toBe('connected')
    
    // Verify couple can access supplier's forms
    const accessibleForms = await testDb
      .from('form_access')
      .select('*')
      .eq('couple_id', [couple.data.id](http://couple.data.id))
      .eq('form_id', [form.data.id](http://form.data.id))
    
    expect([accessibleForms.data](http://accessibleForms.data)).toHaveLength(1)
    
    // Verify core fields are populated in form view
    const formView = await testDb.rpc('get_form_with_core_fields', {
      form_id: [form.data.id](http://form.data.id),
      couple_id: [couple.data.id](http://couple.data.id)
    })
    
    expect([formView.data](http://formView.data).fields[0].value).toBe('2025-06-15')
    expect([formView.data](http://formView.data).fields[1].value).toBe('The Barn at Grimsby')
  })
})
```

## Customer Journey Automation Test

```
// tests/integration/journey-automation.test.ts
import { describe, it, expect, vi } from 'vitest'
import { executeJourneyModule } from '@/lib/journeys'
import { sendEmail } from '@/lib/email'
import { createMeeting } from '@/lib/calendar'

// Mock external services
vi.mock('@/lib/email')
vi.mock('@/lib/calendar')

describe('Customer Journey Automation', () => {
  it('should execute journey modules in sequence', async () => {
    // Create journey with multiple modules
    const journey = await testDb
      .from('customer_journeys')
      .insert({
        supplier_id: [testSupplier.id](http://testSupplier.id),
        name: 'Photography Journey',
        modules: [
          {
            id: 'mod-1',
            type: 'email',
            trigger: 'immediate',
            config: { template_id: 'welcome' }
          },
          {
            id: 'mod-2',
            type: 'wait',
            trigger: 'after_previous',
            config: { duration: '2 days' }
          },
          {
            id: 'mod-3',
            type: 'form',
            trigger: 'after_previous',
            config: { form_id: 'form-123' }
          },
          {
            id: 'mod-4',
            type: 'meeting',
            trigger: 'form_complete',
            config: { meeting_type: 'consultation' }
          }
        ]
      })
      .select()
      .single()
    
    // Start journey for client
    const execution = await testDb
      .from('journey_executions')
      .insert({
        journey_id: [journey.data.id](http://journey.data.id),
        client_id: 'client-789',
        started_at: new Date().toISOString()
      })
      .select()
      .single()
    
    // Execute first module (email)
    await executeJourneyModule([execution.data.id](http://execution.data.id), 'mod-1')
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.any(String),
        template_id: 'welcome'
      })
    )
    
    // Fast-forward time and execute wait module
    vi.setSystemTime(new Date([Date.now](http://Date.now)() + 2 * 24 * 60 * 60 * 1000))
    await executeJourneyModule([execution.data.id](http://execution.data.id), 'mod-2')
    
    // Execute form module
    await executeJourneyModule([execution.data.id](http://execution.data.id), 'mod-3')
    const formStatus = await testDb
      .from('form_submissions')
      .select('status')
      .eq('execution_id', [execution.data.id](http://execution.data.id))
      .single()
    expect([formStatus.data](http://formStatus.data).status).toBe('pending')
    
    // Simulate form completion and trigger meeting
    await testDb
      .from('form_submissions')
      .update({ status: 'completed' })
      .eq('execution_id', [execution.data.id](http://execution.data.id))
    
    await executeJourneyModule([execution.data.id](http://execution.data.id), 'mod-4')
    expect(createMeeting).toHaveBeenCalled()
  })
})
```

## Core Fields Synchronization Test

```
// tests/integration/core-fields-sync.test.ts
describe('Core Fields Synchronization', () => {
  it('should sync core fields across all connected suppliers', async () => {
    // Setup couple with multiple suppliers
    const couple = await createTestCouple()
    const photographer = await createTestSupplier('photographer')
    const caterer = await createTestSupplier('caterer')
    const venue = await createTestSupplier('venue')
    
    // Connect all suppliers
    await Promise.all([
      connectSupplierToCouple([photographer.id](http://photographer.id), [couple.id](http://couple.id)),
      connectSupplierToCouple([caterer.id](http://caterer.id), [couple.id](http://couple.id)),
      connectSupplierToCouple([venue.id](http://venue.id), [couple.id](http://couple.id))
    ])
    
    // Update core field from couple dashboard
    await testDb
      .from('couples')
      .update({
        core_fields: {
          wedding_date: '2025-08-20',
          venue_name: 'New Venue',
          guest_count: 150
        }
      })
      .eq('id', [couple.id](http://couple.id))
    
    // Trigger sync
    await testDb.rpc('sync_core_fields', { couple_id: [couple.id](http://couple.id) })
    
    // Verify all supplier forms received updates
    const photographerForms = await testDb
      .from('form_field_values')
      .select('*')
      .eq('supplier_id', [photographer.id](http://photographer.id))
      .eq('couple_id', [couple.id](http://couple.id))
    
    expect([photographerForms.data](http://photographerForms.data)).toContainEqual(
      expect.objectContaining({
        field_name: 'wedding_date',
        value: '2025-08-20'
      })
    )
  })
})
```

## API Integration Chain Test

```
// tests/integration/api-chain.test.ts
import request from 'supertest'
import { app } from '@/app'

describe('API Request Chain', () => {
  it('should handle complete form submission flow', async () => {
    // Authenticate supplier
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: [testSupplier.email](http://testSupplier.email), password: 'test123' })
    
    const token = authResponse.body.token
    
    // Create form
    const formResponse = await request(app)
      .post('/api/forms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Form',
        fields: [{ type: 'text', label: 'Name' }]
      })
    
    expect(formResponse.status).toBe(201)
    const formId = [formResponse.body.id](http://formResponse.body.id)
    
    // Share form with couple
    const shareResponse = await request(app)
      .post(`/api/forms/${formId}/share`)
      .set('Authorization', `Bearer ${token}`)
      .send({ couple_id: [testCouple.id](http://testCouple.id) })
    
    expect(shareResponse.status).toBe(200)
    
    // Submit form as couple
    const coupleAuth = await request(app)
      .post('/api/auth/login')
      .send({ email: [testCouple.email](http://testCouple.email), password: 'test456' })
    
    const submissionResponse = await request(app)
      .post(`/api/forms/${formId}/submit`)
      .set('Authorization', `Bearer ${coupleAuth.body.token}`)
      .send({ fields: { name: 'Test Couple' } })
    
    expect(submissionResponse.status).toBe(200)
    
    // Verify submission in database
    const submission = await testDb
      .from('form_submissions')
      .select('*')
      .eq('form_id', formId)
      .single()
    
    expect([submission.data.data.fields.name](http://submission.data.data.fields.name)).toBe('Test Couple')
  })
})
```

## Test Data Factories

```
// tests/factories/index.ts
import { faker } from '@faker-js/faker'
import { testDb } from '../integration/setup'

export const supplierFactory = {
  create: async (overrides = {}) => {
    const supplier = await testDb
      .from('suppliers')
      .insert({
        email: [faker.internet.email](http://faker.internet.email)(),
        business_name: [faker.company.name](http://faker.company.name)(),
        vendor_type: 'photographer',
        tier: 'professional',
        ...overrides
      })
      .select()
      .single()
    return [supplier.data](http://supplier.data)
  }
}

export const coupleFactory = {
  create: async (overrides = {}) => {
    const couple = await testDb
      .from('couples')
      .insert({
        email: [faker.internet.email](http://faker.internet.email)(),
        names: `${faker.person.firstName()} & ${faker.person.firstName()}`,
        wedding_date: [faker.date](http://faker.date).future(),
        ...overrides
      })
      .select()
      .single()
    return [couple.data](http://couple.data)
  }
}

export const formFactory = {
  create: async (supplierId: string, overrides = {}) => {
    const form = await testDb
      .from('forms')
      .insert({
        supplier_id: supplierId,
        name: faker.lorem.words(3),
        fields: [
          { type: 'text', label: 'Name', required: true },
          { type: 'email', label: 'Email', required: true }
        ],
        ...overrides
      })
      .select()
      .single()
    return [form.data](http://form.data)
  }
}
```

## Running Integration Tests

```
# Run all integration tests
npm run test:integration

# Run specific test suite
npm run test:integration supplier-couple-flow

# Run with database reset
npm run test:integration:fresh

# Run in watch mode
npm run test:integration:watch

# Debug specific test
DEBUG=wedsync:* npm run test:integration -- --grep="core fields"
```

## Critical Implementation Notes

- Use separate test database with identical schema to production
- Implement transaction-based test isolation for parallel execution
- Mock external services (Stripe, OpenAI, Twilio) but test their integration points
- Use realistic test data volumes (100+ clients, multiple forms)
- Test error scenarios and edge cases (network failures, invalid data)
- Implement retry logic for flaky external service tests
- Monitor test execution time and optimize slow tests
- Use database triggers to verify data integrity constraints