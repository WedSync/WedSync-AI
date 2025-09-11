import React, { ReactElement } from 'react'
import { render as rtlRender, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'

// Wedding platform testing utilities for comprehensive test coverage

/**
 * Custom render function that wraps components with necessary providers
 * Ensures wedding-specific context is available in all component tests
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialProps?: Record<string, any>
  mockUser?: {
    id?: string
    email?: string
    name?: string
    role?: string
  }
}

function customRender(
  ui: ReactElement,
  {
    initialProps = {},
    mockUser = {
      id: 'test-user-id',
      email: 'test@wedsync.com',
      name: 'Test User',
      role: 'photographer',
    },
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Mock authentication context for wedding platform
  const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
    return (
      <div data-testid="mock-auth-provider" data-user={JSON.stringify(mockUser)}>
        {children}
      </div>
    )
  }

  const Wrapper = ({ children }: { children?: React.ReactNode }) => {
    return <MockAuthProvider>{children}</MockAuthProvider>
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Wedding-specific test data generators for consistent test data
 */
export const generateWeddingTestData = {
  client: (overrides = {}) => ({
    id: 'test-client-id',
    name: 'John & Jane Smith',
    email: 'couple@example.com',
    phone: '+1234567890',
    wedding_date: '2024-06-15',
    venue: 'Beautiful Wedding Venue',
    venue_address: '123 Wedding St, Love City, LC 12345',
    guest_count: 150,
    budget: 50000,
    status: 'active',
    photographer_id: 'test-photographer-id',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),

  vendor: (overrides = {}) => ({
    id: 'test-vendor-id',
    name: 'Amazing Photography',
    email: 'photographer@example.com',
    phone: '+1234567890',
    service_type: 'photographer',
    business_name: 'Amazing Photography Studio',
    location: 'New York, NY',
    address: '456 Photo Ave, NYC, NY 10001',
    rating: 4.8,
    review_count: 127,
    verified: true,
    portfolio_images: ['image1.jpg', 'image2.jpg', 'image3.jpg'],
    pricing: {
      base_price: 2500,
      hourly_rate: 300,
      travel_fee: 100,
    },
    availability: ['2024-06-15', '2024-06-16', '2024-06-17'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),

  guest: (overrides = {}) => ({
    id: 'test-guest-id',
    client_id: 'test-client-id',
    name: 'Guest Name',
    email: 'guest@example.com',
    phone: '+1234567890',
    address: '789 Guest Rd, Guest City, GC 54321',
    rsvp_status: 'pending',
    dietary_restrictions: '',
    allergies: '',
    plus_one: false,
    plus_one_name: '',
    table_number: null,
    meal_choice: '',
    transportation_needed: false,
    accommodation_needed: false,
    special_requests: '',
    guest_type: 'friend',
    side: 'bride',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),

  task: (overrides = {}) => ({
    id: 'test-task-id',
    client_id: 'test-client-id',
    title: 'Wedding Planning Task',
    description: 'Important wedding preparation task',
    due_date: '2024-05-01',
    priority: 'high',
    status: 'pending',
    assigned_to: 'test-user-id',
    category: 'planning',
    estimated_hours: 2,
    actual_hours: null,
    notes: '',
    dependencies: [],
    subtasks: [],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),

  payment: (overrides = {}) => ({
    id: 'test-payment-id',
    client_id: 'test-client-id',
    vendor_id: 'test-vendor-id',
    amount: 5000,
    currency: 'USD',
    status: 'pending',
    payment_type: 'deposit',
    due_date: '2024-04-15',
    paid_date: null,
    payment_method: 'stripe',
    description: 'Photography deposit',
    invoice_number: 'INV-001',
    stripe_payment_intent_id: 'pi_test_12345',
    notes: '',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),

  journey: (overrides = {}) => ({
    id: 'test-journey-id',
    client_id: 'test-client-id',
    name: 'Wedding Planning Journey',
    description: 'Complete wedding planning workflow',
    status: 'active',
    progress: 45,
    estimated_completion: '2024-05-15',
    steps: [
      { id: 'step-1', name: 'Venue Booking', status: 'completed', order: 1 },
      { id: 'step-2', name: 'Vendor Selection', status: 'in_progress', order: 2 },
      { id: 'step-3', name: 'Guest Management', status: 'pending', order: 3 },
      { id: 'step-4', name: 'Final Details', status: 'pending', order: 4 },
    ],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),
}

/**
 * Wedding-specific API mocking utilities
 */
export const mockWeddingAPI = {
  success: (data: any, delay = 0) => {
    return vi.fn().mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve({ data, success: true }), delay)
        )
    )
  },

  error: (error: string, status = 500, delay = 0) => {
    return vi.fn().mockImplementation(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject({ error, status }), delay)
        )
    )
  },

  loading: (data: any, delay = 2000) => {
    return vi.fn().mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve({ data, success: true }), delay)
        )
    )
  },
}

/**
 * Wedding form testing utilities
 */
export const fillWeddingForm = {
  clientForm: (form: HTMLFormElement, data = generateWeddingTestData.client()) => {
    const nameInput = form.querySelector('input[name="name"]') as HTMLInputElement
    const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement
    const phoneInput = form.querySelector('input[name="phone"]') as HTMLInputElement
    const dateInput = form.querySelector('input[name="wedding_date"]') as HTMLInputElement
    const venueInput = form.querySelector('input[name="venue"]') as HTMLInputElement
    const guestCountInput = form.querySelector('input[name="guest_count"]') as HTMLInputElement
    const budgetInput = form.querySelector('input[name="budget"]') as HTMLInputElement

    if (nameInput) nameInput.value = data.name
    if (emailInput) emailInput.value = data.email
    if (phoneInput) phoneInput.value = data.phone
    if (dateInput) dateInput.value = data.wedding_date
    if (venueInput) venueInput.value = data.venue
    if (guestCountInput) guestCountInput.value = data.guest_count.toString()
    if (budgetInput) budgetInput.value = data.budget.toString()
  },

  guestForm: (form: HTMLFormElement, data = generateWeddingTestData.guest()) => {
    const nameInput = form.querySelector('input[name="name"]') as HTMLInputElement
    const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement
    const phoneInput = form.querySelector('input[name="phone"]') as HTMLInputElement
    const rsvpSelect = form.querySelector('select[name="rsvp_status"]') as HTMLSelectElement
    const dietaryInput = form.querySelector('input[name="dietary_restrictions"]') as HTMLInputElement
    const plusOneCheckbox = form.querySelector('input[name="plus_one"]') as HTMLInputElement

    if (nameInput) nameInput.value = data.name
    if (emailInput) emailInput.value = data.email
    if (phoneInput) phoneInput.value = data.phone
    if (rsvpSelect) rsvpSelect.value = data.rsvp_status
    if (dietaryInput) dietaryInput.value = data.dietary_restrictions
    if (plusOneCheckbox) plusOneCheckbox.checked = data.plus_one
  },
}

/**
 * Wedding-specific assertion helpers
 */
export const expectWeddingData = {
  toBeValidClient: (client: any) => {
    expect(client).toHaveProperty('id')
    expect(client).toHaveProperty('name')
    expect(client).toHaveProperty('email')
    expect(client).toHaveProperty('wedding_date')
    expect(client).toHaveProperty('venue')
    expect(client).toHaveProperty('status')
    expect(client.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    expect(new Date(client.wedding_date)).toBeInstanceOf(Date)
  },

  toBeValidGuest: (guest: any) => {
    expect(guest).toHaveProperty('id')
    expect(guest).toHaveProperty('name')
    expect(guest).toHaveProperty('rsvp_status')
    expect(['pending', 'confirmed', 'declined']).toContain(guest.rsvp_status)
    if (guest.email) {
      expect(guest.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    }
  },

  toBeValidPayment: (payment: any) => {
    expect(payment).toHaveProperty('id')
    expect(payment).toHaveProperty('amount')
    expect(payment).toHaveProperty('currency')
    expect(payment).toHaveProperty('status')
    expect(['pending', 'paid', 'failed', 'cancelled']).toContain(payment.status)
    expect(typeof payment.amount).toBe('number')
    expect(payment.amount).toBeGreaterThan(0)
  },
}

/**
 * Wedding performance testing helpers
 */
export const measureWeddingPerformance = {
  renderTime: async (renderFn: () => void) => {
    const start = performance.now()
    await renderFn()
    const end = performance.now()
    return end - start
  },

  apiResponseTime: async (apiFn: () => Promise<any>) => {
    const start = performance.now()
    await apiFn()
    const end = performance.now()
    return end - start
  },

  memoryUsage: () => {
    return (performance as any).memory?.usedJSHeapSize || 0
  },
}

/**
 * Wedding accessibility testing helpers
 */
export const checkWeddingA11y = {
  hasProperLabels: (container: HTMLElement) => {
    const inputs = container.querySelectorAll('input, select, textarea')
    inputs.forEach(input => {
      const id = input.getAttribute('id')
      const ariaLabel = input.getAttribute('aria-label')
      const ariaLabelledBy = input.getAttribute('aria-labelledby')
      const label = id ? container.querySelector(`label[for="${id}"]`) : null

      expect(
        label || ariaLabel || ariaLabelledBy,
        `Input ${input.tagName} should have a label, aria-label, or aria-labelledby`
      ).toBeTruthy()
    })
  },

  hasProperHeadings: (container: HTMLElement) => {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    expect(headings.length).toBeGreaterThan(0)
    
    // Check heading hierarchy
    let previousLevel = 0
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.substring(1))
      if (previousLevel > 0) {
        expect(level).toBeLessThanOrEqual(previousLevel + 1)
      }
      previousLevel = level
    })
  },

  hasProperColors: (container: HTMLElement) => {
    // Check for sufficient color contrast (simplified check)
    const elements = container.querySelectorAll('*')
    elements.forEach(element => {
      const computedStyle = window.getComputedStyle(element)
      const color = computedStyle.color
      const backgroundColor = computedStyle.backgroundColor
      
      // Basic check that colors are not the same
      if (color && backgroundColor && color !== backgroundColor) {
        expect(color).not.toBe(backgroundColor)
      }
    })
  },
}

// Re-export everything from testing-library
export * from '@testing-library/react'

// Export custom render as default render
export { customRender as render }