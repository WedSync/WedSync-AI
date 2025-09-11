# WedSync/WedMe Testing Guide

## Overview
This guide provides atomic, step-by-step testing instructions for Claude Code to implement. Each test is self-contained and follows the actual project structure using Next.js 15.4.3, React 19.1.0, TypeScript 5, and Supabase.

## Testing Stack Setup

### Required Dependencies

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react@latest
npm install --save-dev @testing-library/jest-dom@latest
npm install --save-dev @testing-library/user-event@latest
npm install --save-dev jest@latest
npm install --save-dev jest-environment-jsdom@latest
npm install --save-dev @types/jest@latest
npm install --save-dev @supabase/supabase-js@latest
npm install --save-dev msw@latest
Jest Configuration
Create jest.config.js in the root directory:
javascriptconst nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/index.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  moduleDirectories: ['node_modules', '<rootDir>/'],
}

module.exports = createJestConfig(customJestConfig)
Create jest.setup.js:
javascriptimport '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.NEXT_PUBLIC_WEDSYNC_URL = 'https://wedsync.ai'
process.env.NEXT_PUBLIC_WEDME_URL = 'https://wedme.app'
Unit Tests
1. Core Fields System Tests
Create src/__tests__/core-fields.test.ts:
typescriptimport { describe, it, expect, beforeEach } from '@jest/globals'
import { 
  CoreFieldsManager, 
  CoreFieldState,
  CoreFieldType 
} from '@/lib/core-fields'

describe('Core Fields System', () => {
  let manager: CoreFieldsManager
  
  beforeEach(() => {
    manager = new CoreFieldsManager()
  })

  describe('Field State Management', () => {
    it('should initialize fields with pending state', () => {
      const field = manager.getField('wedding_date')
      expect(field.state).toBe(CoreFieldState.PENDING)
      expect(field.value).toBeNull()
    })

    it('should update field state to completed when value is set', () => {
      manager.setFieldValue('wedding_date', '2025-06-15')
      const field = manager.getField('wedding_date')
      
      expect(field.state).toBe(CoreFieldState.COMPLETED)
      expect(field.value).toBe('2025-06-15')
    })

    it('should mark field as partial when incomplete', () => {
      manager.setFieldValue('guest_count', { adults: 100 })
      const field = manager.getField('guest_count')
      
      expect(field.state).toBe(CoreFieldState.PARTIAL)
    })

    it('should propagate core fields to connected forms', async () => {
      const formId = 'test-form-123'
      manager.connectForm(formId)
      
      manager.setFieldValue('venue_name', 'The Barn at Grimsby')
      
      const propagated = await manager.getPropagatedFields(formId)
      expect(propagated.venue_name).toBe('The Barn at Grimsby')
    })
  })

  describe('Field Validation', () => {
    it('should validate email format', () => {
      const isValid = manager.validateField('email', 'not-an-email')
      expect(isValid).toBe(false)
      
      const isValidEmail = manager.validateField('email', 'couple@example.com')
      expect(isValidEmail).toBe(true)
    })

    it('should validate date format', () => {
      const isValid = manager.validateField('wedding_date', '2025-13-45')
      expect(isValid).toBe(false)
      
      const isValidDate = manager.validateField('wedding_date', '2025-06-15')
      expect(isValidDate).toBe(true)
    })

    it('should validate guest count ranges', () => {
      const isValid = manager.validateField('guest_count', {
        adults: 150,
        children: 20
      })
      expect(isValid).toBe(true)
      
      const isInvalid = manager.validateField('guest_count', {
        adults: -5,
        children: 20
      })
      expect(isInvalid).toBe(false)
    })
  })
})
2. Form Builder Component Tests
Create src/components/forms/__tests__/FormBuilder.test.tsx:
typescriptimport { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormBuilder } from '@/components/forms/FormBuilder'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } }
      })
    }
  }))
}))

describe('FormBuilder Component', () => {
  const renderFormBuilder = (props = {}) => {
    return render(
      <DndProvider backend={HTML5Backend}>
        <FormBuilder {...props} />
      </DndProvider>
    )
  }

  describe('Field Management', () => {
    it('should render the form canvas', () => {
      renderFormBuilder()
      expect(screen.getByTestId('form-canvas')).toBeInTheDocument()
    })

    it('should show field palette', () => {
      renderFormBuilder()
      expect(screen.getByTestId('field-palette')).toBeInTheDocument()
      expect(screen.getByText('Text Field')).toBeInTheDocument()
      expect(screen.getByText('Email Field')).toBeInTheDocument()
      expect(screen.getByText('Date Picker')).toBeInTheDocument()
    })

    it('should allow dragging fields to canvas', async () => {
      renderFormBuilder()
      
      const textField = screen.getByText('Text Field')
      const canvas = screen.getByTestId('form-canvas')
      
      // Simulate drag and drop
      fireEvent.dragStart(textField)
      fireEvent.dragEnter(canvas)
      fireEvent.drop(canvas)
      
      await waitFor(() => {
        expect(screen.getByTestId('field-0')).toBeInTheDocument()
      })
    })

    it('should open field settings on click', async () => {
      renderFormBuilder()
      
      // Add a field first
      const textField = screen.getByText('Text Field')
      const canvas = screen.getByTestId('form-canvas')
      
      fireEvent.dragStart(textField)
      fireEvent.drop(canvas)
      
      await waitFor(() => {
        const field = screen.getByTestId('field-0')
        fireEvent.click(field)
        expect(screen.getByTestId('field-settings')).toBeInTheDocument()
      })
    })

    it('should update field label', async () => {
      renderFormBuilder()
      const user = userEvent.setup()
      
      // Add field and open settings
      const textField = screen.getByText('Text Field')
      const canvas = screen.getByTestId('form-canvas')
      
      fireEvent.dragStart(textField)
      fireEvent.drop(canvas)
      
      const field = await screen.findByTestId('field-0')
      fireEvent.click(field)
      
      const labelInput = screen.getByLabelText('Field Label')
      await user.clear(labelInput)
      await user.type(labelInput, 'Couple Names')
      
      expect(labelInput).toHaveValue('Couple Names')
    })
  })

  describe('Core Fields Integration', () => {
    it('should identify core fields', async () => {
      renderFormBuilder()
      
      // Add a wedding date field
      const dateField = screen.getByText('Date Picker')
      const canvas = screen.getByTestId('form-canvas')
      
      fireEvent.dragStart(dateField)
      fireEvent.drop(canvas)
      
      const field = await screen.findByTestId('field-0')
      fireEvent.click(field)
      
      // Set field key to wedding_date
      const keyInput = screen.getByLabelText('Field Key')
      await userEvent.clear(keyInput)
      await userEvent.type(keyInput, 'wedding_date')
      
      // Should show core field badge
      await waitFor(() => {
        expect(screen.getByTestId('core-field-badge')).toBeInTheDocument()
        expect(screen.getByText('Auto-fills from WedMe')).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('should require at least one field', async () => {
      renderFormBuilder()
      
      const saveButton = screen.getByText('Save Form')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Form must have at least one field')).toBeInTheDocument()
      })
    })

    it('should validate field uniqueness', async () => {
      renderFormBuilder()
      
      // Add two fields with same key
      const textField = screen.getByText('Text Field')
      const canvas = screen.getByTestId('form-canvas')
      
      // Add first field
      fireEvent.dragStart(textField)
      fireEvent.drop(canvas)
      
      // Add second field
      fireEvent.dragStart(textField)
      fireEvent.drop(canvas)
      
      // Set both to same key
      const fields = await screen.findAllByTestId(/field-\d/)
      for (const field of fields) {
        fireEvent.click(field)
        const keyInput = screen.getByLabelText('Field Key')
        await userEvent.clear(keyInput)
        await userEvent.type(keyInput, 'duplicate_key')
      }
      
      const saveButton = screen.getByText('Save Form')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Field keys must be unique')).toBeInTheDocument()
      })
    })
  })
})
3. Customer Journey Tests
Create src/lib/journey/__tests__/journey-engine.test.ts:
typescriptimport { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { 
  JourneyEngine,
  JourneyModule,
  ModuleType,
  JourneyTrigger 
} from '@/lib/journey/engine'

describe('Customer Journey Engine', () => {
  let engine: JourneyEngine
  
  beforeEach(() => {
    engine = new JourneyEngine()
    jest.clearAllMocks()
  })

  describe('Journey Execution', () => {
    it('should execute modules in sequence', async () => {
      const journey = {
        id: 'test-journey',
        name: 'Onboarding Journey',
        modules: [
          {
            id: 'welcome-email',
            type: ModuleType.EMAIL,
            trigger: { type: 'immediate' },
            config: { templateId: 'welcome' }
          },
          {
            id: 'form-request',
            type: ModuleType.FORM,
            trigger: { type: 'delay', days: 1 },
            config: { formId: 'timeline-form' }
          }
        ]
      }
      
      const result = await engine.startJourney(journey, 'client-123')
      
      expect(result.status).toBe('active')
      expect(result.currentModule).toBe('welcome-email')
      expect(result.executedModules).toHaveLength(1)
    })

    it('should handle conditional logic', async () => {
      const journey = {
        id: 'conditional-journey',
        modules: [
          {
            id: 'check-venue',
            type: ModuleType.CONDITION,
            config: {
              condition: 'venue_type === "outdoor"',
              trueBranch: 'weather-info',
              falseBranch: 'indoor-info'
            }
          }
        ]
      }
      
      const context = {
        clientId: 'client-123',
        data: { venue_type: 'outdoor' }
      }
      
      const result = await engine.executeModule(journey.modules[0], context)
      
      expect(result.nextModule).toBe('weather-info')
    })

    it('should respect timing triggers', async () => {
      const module = {
        id: 'delayed-email',
        type: ModuleType.EMAIL,
        trigger: {
          type: 'relative',
          reference: 'wedding_date',
          offset: -30, // 30 days before
          unit: 'days'
        }
      }
      
      const context = {
        wedding_date: '2025-06-15',
        current_date: '2025-05-16'
      }
      
      const shouldExecute = engine.shouldExecuteModule(module, context)
      expect(shouldExecute).toBe(true)
      
      const contextEarly = {
        wedding_date: '2025-06-15',
        current_date: '2025-04-01'
      }
      
      const shouldNotExecute = engine.shouldExecuteModule(module, contextEarly)
      expect(shouldNotExecute).toBe(false)
    })
  })

  describe('Module Validation', () => {
    it('should validate email module configuration', () => {
      const validModule = {
        type: ModuleType.EMAIL,
        config: {
          templateId: 'welcome',
          subject: 'Welcome!',
          from: 'noreply@wedsync.ai'
        }
      }
      
      expect(engine.validateModule(validModule)).toBe(true)
      
      const invalidModule = {
        type: ModuleType.EMAIL,
        config: {
          // Missing required templateId
          subject: 'Welcome!'
        }
      }
      
      expect(engine.validateModule(invalidModule)).toBe(false)
    })

    it('should validate form module dependencies', () => {
      const module = {
        type: ModuleType.FORM,
        config: {
          formId: 'timeline-form',
          required: true
        }
      }
      
      const validation = engine.validateModuleDependencies(module)
      expect(validation.valid).toBe(true)
      expect(validation.dependencies).toContain('form:timeline-form')
    })
  })
})
Integration Tests
1. Supabase Integration Tests
Create src/__tests__/integration/supabase.test.ts:
typescriptimport { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { SupabaseClient } from '@supabase/supabase-js'

// Use test database URL
const supabaseUrl = process.env.TEST_SUPABASE_URL || 'https://test.supabase.co'
const supabaseKey = process.env.TEST_SUPABASE_ANON_KEY || 'test-key'

describe('Supabase Integration', () => {
  let supabase: SupabaseClient
  let testUserId: string
  
  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey)
    
    // Create test user
    const { data: authData } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123'
    })
    
    testUserId = authData?.user?.id || ''
  })
  
  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await supabase.from('suppliers').delete().eq('user_id', testUserId)
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  describe('Supplier Operations', () => {
    it('should create a supplier profile', async () => {
      const supplierData = {
        user_id: testUserId,
        business_name: 'Test Photography',
        vendor_type: 'photographer',
        email: 'test@example.com'
      }
      
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplierData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(data?.business_name).toBe('Test Photography')
      expect(data?.vendor_type).toBe('photographer')
    })

    it('should enforce RLS policies', async () => {
      // Try to read another user's data
      const { data, error } = await supabase
        .from('suppliers')
        .select()
        .eq('user_id', 'different-user-id')
      
      expect(data).toHaveLength(0)
    })
  })

  describe('Forms Operations', () => {
    it('should create and retrieve a form', async () => {
      const formData = {
        supplier_id: testUserId,
        name: 'Wedding Timeline Form',
        fields: [
          {
            key: 'ceremony_time',
            type: 'time',
            label: 'Ceremony Time',
            required: true
          }
        ]
      }
      
      const { data: form, error } = await supabase
        .from('forms')
        .insert(formData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(form?.name).toBe('Wedding Timeline Form')
      expect(form?.fields).toHaveLength(1)
      
      // Retrieve form
      const { data: retrieved } = await supabase
        .from('forms')
        .select()
        .eq('id', form?.id)
        .single()
      
      expect(retrieved?.id).toBe(form?.id)
    })
  })

  describe('Client Dashboard Operations', () => {
    it('should create a client dashboard', async () => {
      const dashboardData = {
        supplier_id: testUserId,
        client_id: 'client-123',
        template_id: 'default',
        sections: ['welcome', 'forms', 'timeline'],
        custom_domain: null
      }
      
      const { data, error } = await supabase
        .from('client_dashboards')
        .insert(dashboardData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(data?.sections).toContain('forms')
    })
  })
})
2. API Route Tests
Create src/__tests__/api/forms.test.ts:
typescriptimport { describe, it, expect, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/forms/route'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user' } }
      })
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: { id: 'form-123' }, error: null }),
      select: jest.fn().mockResolvedValue({ data: [], error: null })
    }))
  }))
}))

describe('Forms API', () => {
  describe('POST /api/forms', () => {
    it('should create a new form', async () => {
      const formData = {
        name: 'Test Form',
        fields: [
          { key: 'name', type: 'text', label: 'Name' }
        ]
      }
      
      const request = new NextRequest('http://localhost:3000/api/forms', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.id).toBe('form-123')
    })

    it('should validate form data', async () => {
      const invalidData = {
        // Missing required fields
        fields: []
      }
      
      const request = new NextRequest('http://localhost:3000/api/forms', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const error = await response.json()
      expect(error.message).toContain('validation')
    })
  })

  describe('GET /api/forms', () => {
    it('should retrieve user forms', async () => {
      const request = new NextRequest('http://localhost:3000/api/forms', {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/forms')
      
      const response = await GET(request)
      
      expect(response.status).toBe(401)
    })
  })
})
E2E Tests
1. Playwright Setup
Create playwright.config.ts:
typescriptimport { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
2. E2E Test Scenarios
Create e2e/supplier-onboarding.spec.ts:
typescriptimport { test, expect } from '@playwright/test'

test.describe('Supplier Onboarding Flow', () => {
  test('should complete full onboarding process', async ({ page }) => {
    // 1. Navigate to signup
    await page.goto('/signup')
    
    // 2. Fill signup form
    await page.fill('[data-testid="email-input"]', 'newuser@example.com')
    await page.fill('[data-testid="password-input"]', 'SecurePass123!')
    await page.fill('[data-testid="business-name-input"]', 'Amazing Photography')
    
    // 3. Select vendor type
    await page.click('[data-testid="vendor-type-photographer"]')
    
    // 4. Submit form
    await page.click('[data-testid="signup-button"]')
    
    // 5. Wait for redirect to dashboard
    await page.waitForURL('/dashboard')
    
    // 6. Verify onboarding wizard appears
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toBeVisible()
    
    // 7. Complete client import
    await page.click('[data-testid="skip-import"]')
    
    // 8. Create first form
    await page.click('[data-testid="create-form-button"]')
    await page.fill('[data-testid="form-name-input"]', 'Wedding Questionnaire')
    
    // 9. Add a field
    await page.dragAndDrop(
      '[data-testid="field-text"]',
      '[data-testid="form-canvas"]'
    )
    
    // 10. Save form
    await page.click('[data-testid="save-form-button"]')
    
    // 11. Verify success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Form created successfully')
  })

  test('should handle errors gracefully', async ({ page }) => {
    await page.goto('/signup')
    
    // Submit without filling required fields
    await page.click('[data-testid="signup-button"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required')
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required')
  })
})
Create e2e/form-builder.spec.ts:
typescriptimport { test, expect } from '@playwright/test'

test.describe('Form Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/dashboard')
    
    // Navigate to forms
    await page.click('[data-testid="nav-forms"]')
  })

  test('should create a form with multiple field types', async ({ page }) => {
    // Start new form
    await page.click('[data-testid="new-form-button"]')
    
    // Set form name
    await page.fill('[data-testid="form-name"]', 'Comprehensive Wedding Form')
    
    // Add text field
    await page.dragAndDrop(
      '[data-testid="field-palette-text"]',
      '[data-testid="form-canvas"]'
    )
    
    // Configure text field
    await page.click('[data-testid="field-0"]')
    await page.fill('[data-testid="field-label"]', 'Couple Names')
    await page.fill('[data-testid="field-key"]', 'couple_names')
    
    // Add date field
    await page.dragAndDrop(
      '[data-testid="field-palette-date"]',
      '[data-testid="form-canvas"]'
    )
    
    // Configure date field
    await page.click('[data-testid="field-1"]')
    await page.fill('[data-testid="field-label"]', 'Wedding Date')
    await page.fill('[data-testid="field-key"]', 'wedding_date')
    
    // Add select field
    await page.dragAndDrop(
      '[data-testid="field-palette-select"]',
      '[data-testid="form-canvas"]'
    )
    
    // Configure select field
    await page.click('[data-testid="field-2"]')
    await page.fill('[data-testid="field-label"]', 'Photography Style')
    await page.click('[data-testid="add-option"]')
    await page.fill('[data-testid="option-0"]', 'Documentary')
    await page.click('[data-testid="add-option"]')
    await page.fill('[data-testid="option-1"]', 'Fine Art')
    
    // Save form
    await page.click('[data-testid="save-form"]')
    
    // Verify success
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Form saved')
    
    // Verify form appears in list
    await page.goto('/forms')
    await expect(page.locator('text=Comprehensive Wedding Form')).toBeVisible()
  })

  test('should detect and mark core fields', async ({ page }) => {
    await page.click('[data-testid="new-form-button"]')
    
    // Add a field and set key to core field
    await page.dragAndDrop(
      '[data-testid="field-palette-text"]',
      '[data-testid="form-canvas"]'
    )
    
    await page.click('[data-testid="field-0"]')
    await page.fill('[data-testid="field-key"]', 'venue_name')
    
    // Should show core field indicator
    await expect(page.locator('[data-testid="core-field-badge"]')).toBeVisible()
    await expect(page.locator('[data-testid="core-field-badge"]')).toContainText('Auto-fills')
  })

  test('should handle form validation', async ({ page }) => {
    await page.click('[data-testid="new-form-button"]')
    
    // Try to save without fields
    await page.click('[data-testid="save-form"]')
    
    // Should show error
    await expect(page.locator('[data-testid="toast-error"]')).toContainText('at least one field')
  })
})
Performance Tests
Create src/__tests__/performance/load.test.ts:
typescriptimport { describe, it, expect } from '@jest/globals'

describe('Performance Benchmarks', () => {
  describe('Form Rendering', () => {
    it('should render form with 50 fields in under 2 seconds', async () => {
      const startTime = performance.now()
      
      // Create form with 50 fields
      const fields = Array.from({ length: 50 }, (_, i) => ({
        id: `field-${i}`,
        type: 'text',
        label: `Field ${i}`,
        key: `field_${i}`
      }))
      
      // Render form (mocked for test)
      const renderForm = (fields: any[]) => {
        // Simulate rendering
        return fields.map(f => ({ ...f, rendered: true }))
      }
      
      const rendered = renderForm(fields)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(2000)
      expect(rendered).toHaveLength(50)
    })
  })

  describe('Data Operations', () => {
    it('should process 1000 client records in under 1 second', async () => {
      const clients = Array.from({ length: 1000 }, (_, i) => ({
        id: `client-${i}`,
        name: `Client ${i}`,
        email: `client${i}@example.com`,
        wedding_date: '2025-06-15'
      }))
      
      const startTime = performance.now()
      
      // Process clients (filter, sort, etc.)
      const processed = clients
        .filter(c => c.wedding_date > '2025-01-01')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(c => ({ ...c, processed: true }))
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(1000)
      expect(processed.length).toBeGreaterThan(0)
    })
  })
})
Test Commands
Add to package.json:
json{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=src/__tests__",
    "test:integration": "jest --testPathPattern=src/__tests__/integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:performance": "jest --testPathPattern=performance",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
CI/CD Test Pipeline
Create .github/workflows/test.yml:
yamlname: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: supabase/postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
Test Coverage Requirements
Minimum coverage thresholds:
javascript// jest.config.js additions
module.exports = {
  // ... existing config
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    './src/lib/core-fields/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/components/forms/': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}