# 01-unit-tests.md

# Unit Tests Implementation

## What to Build

Implement comprehensive unit testing for all WedSync/WedMe components using Vitest as the primary testing framework. Tests should cover individual functions, React components, API utilities, and database operations in isolation.

## Tech Stack

```json
{
  "test-runner": "vitest",
  "component-testing": "@testing-library/react",
  "mocking": "vitest-mock",
  "coverage": "@vitest/coverage-v8"
}
```

## Project Structure

```
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '*.config.*']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib')
    }
  }
})
```

## Component Testing Pattern

```
// src/components/forms/__tests__/FormBuilder.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FormBuilder } from '../FormBuilder'

describe('FormBuilder Component', () => {
  it('should render empty canvas on mount', () => {
    render(<FormBuilder supplierId="test-123" />)
    expect(screen.getByTestId('form-canvas')).toBeInTheDocument()
    expect(screen.queryByTestId('form-field')).not.toBeInTheDocument()
  })

  it('should add field when dragged from palette', async () => {
    const { getByTestId } = render(<FormBuilder supplierId="test-123" />)
    const textField = getByTestId('field-type-text')
    const canvas = getByTestId('form-canvas')
    
    fireEvent.dragStart(textField)
    fireEvent.drop(canvas)
    
    expect(await screen.findByTestId('form-field-0')).toBeInTheDocument()
  })
})
```

## Utility Function Testing

```
// src/lib/utils/__tests__/core-fields.test.ts
import { describe, it, expect } from 'vitest'
import { mapCoreFields, validateCoreField } from '../core-fields'

describe('Core Fields Utilities', () => {
  describe('mapCoreFields', () => {
    it('should map wedding date to all date fields', () => {
      const input = { wedding_date: '2025-06-15' }
      const result = mapCoreFields(input, ['ceremony_date', 'event_date'])
      
      expect(result).toEqual({
        ceremony_date: '2025-06-15',
        event_date: '2025-06-15'
      })
    })

    it('should handle missing core fields gracefully', () => {
      const result = mapCoreFields({}, ['venue_name'])
      expect(result.venue_name).toBeUndefined()
    })
  })
})
```

## Database Function Testing

```
// src/lib/db/__tests__/suppliers.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createSupplierProfile, updateSupplierTier } from '../suppliers'
import { mockSupabase } from '../../tests/mocks/supabase'

describe('Supplier Database Functions', () => {
  beforeEach(() => {
    mockSupabase.reset()
  })

  it('should create supplier with correct tier', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: { id: 'sup-123' } })
    })

    const result = await createSupplierProfile({
      email: '[photo@test.com](mailto:photo@test.com)',
      vendor_type: 'photographer',
      tier: 'professional'
    })

    expect([result.id](http://result.id)).toBe('sup-123')
    expect(mockSupabase.from).toHaveBeenCalledWith('suppliers')
  })
})
```

## API Route Testing

```
// src/app/api/forms/__tests__/route.test.ts
import { describe, it, expect } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

describe('Forms API Route', () => {
  it('should validate required fields', async () => {
    const request = new NextRequest('[http://localhost/api/forms](http://localhost/api/forms)', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Form' }) // Missing supplier_id
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('supplier_id required')
  })
})
```

## Test Coverage Requirements

```
# Minimum coverage targets
coverage:
  statements: 80%
  branches: 75%
  functions: 80%
  lines: 80%

# Critical paths requiring 100% coverage:
- Authentication flows
- Payment processing
- Core fields mapping
- Data validation
```

## Running Tests

```
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run specific test file
npm run test src/components/forms/__tests__/FormBuilder.test.tsx
```

## Critical Implementation Notes

- Mock all external dependencies (Supabase, Stripe, OpenAI)
- Test both success and error paths
- Use test-ids for reliable element selection
- Keep tests isolated - no shared state between tests
- Mock timers for animation and debounce testing
- Test accessibility with @testing-library/jest-dom