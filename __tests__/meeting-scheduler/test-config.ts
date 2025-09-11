/**
 * Test Configuration for Meeting Scheduler
 * WS-064: Meeting Scheduler - Test Suite Configuration
 */

import { defineConfig } from 'vitest/config';
import { configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Setup files
    setupFiles: ['./test-setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/components/scheduling/**',
        'src/lib/services/calendar-service.ts'
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Specific thresholds for critical components
        'src/components/scheduling/ClientBookingForm.tsx': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/lib/services/calendar-service.ts': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    },
    
    // Test timeout
    testTimeout: 10000,
    
    // Globals
    globals: true,
    
    // Mock CSS imports
    css: false,
    
    // Exclude patterns
    exclude: [
      ...configDefaults.exclude,
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**'
    ],
    
    // Test patterns
    include: [
      '**/__tests__/meeting-scheduler/**/*.test.{ts,tsx}',
      '**/__tests__/meeting-scheduler/**/*.spec.{ts,tsx}'
    ]
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
      '@/components': path.resolve(__dirname, '../../src/components'),
      '@/lib': path.resolve(__dirname, '../../src/lib'),
      '@/types': path.resolve(__dirname, '../../src/types')
    }
  },
  
  // Define constants
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.NEXT_PUBLIC_SUPABASE_URL': '"https://test.supabase.co"',
    'process.env.SUPABASE_SERVICE_ROLE_KEY': '"test-key"',
    'process.env.CALENDAR_ENCRYPTION_KEY': '"test-encryption-key"'
  }
});

// Test categories for organization
export const testCategories = {
  unit: [
    'BookingPageBuilder.test.tsx',
    'AvailabilityCalendar.test.tsx', 
    'ClientBookingForm.test.tsx',
    'CalendarService.test.ts'
  ],
  integration: [
    'booking-workflow.e2e.test.ts'
  ],
  performance: [
    'booking-performance.test.ts'
  ],
  security: [
    'client-verification.test.ts'
  ]
};

// Test utilities
export const testUtils = {
  // Mock data generators
  generateMockBooking: (overrides = {}) => ({
    id: 'booking-123',
    client_name: 'John & Jane Smith',
    client_email: 'john.smith@example.com',
    scheduled_at: '2024-01-01T10:00:00Z',
    duration_minutes: 30,
    meeting_type_name: 'Initial Consultation',
    timezone: 'Europe/London',
    ...overrides
  }),
  
  generateMockClient: (overrides = {}) => ({
    id: 'client-123',
    name: 'John & Jane Smith',
    email: 'john.smith@example.com',
    phone: '+44 7123 456789',
    wedding_date: '2024-06-15',
    ...overrides
  }),
  
  generateMockMeetingType: (overrides = {}) => ({
    id: 'meeting-1',
    name: 'Initial Consultation',
    duration_minutes: 30,
    color: '#7F56D9',
    is_active: true,
    requires_questionnaire: false,
    questionnaire_questions: [],
    ...overrides
  }),
  
  // Performance helpers
  measureAsyncOperation: async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    return { result, duration };
  },
  
  // Mock API responses
  mockApiResponses: {
    clientLookup: {
      existing: {
        id: 'client-123',
        name: 'John & Jane Smith',
        email: 'existing@client.com',
        phone: '+44 7123 456789',
        wedding_date: '2024-06-15',
        partner_name: 'Jane Smith',
        venue_name: 'The Grand Hotel',
        guest_count: 100,
        wedding_style: 'Classic'
      },
      notFound: null
    },
    
    bookingSubmission: {
      success: {
        success: true,
        bookingId: 'BOOK-ABC123'
      },
      failure: {
        success: false,
        error: 'Booking failed due to calendar conflict'
      }
    },
    
    calendarSync: {
      success: {
        success: true,
        eventId: 'google-event-123'
      },
      failure: {
        success: false,
        error: 'Calendar API rate limit exceeded'
      }
    }
  }
};

// Test data validation helpers
export const validators = {
  isValidBookingData: (data: any): boolean => {
    return !!(
      data.client_id &&
      data.client_name &&
      data.client_email &&
      data.scheduled_at &&
      data.duration_minutes &&
      data.meeting_type_name
    );
  },
  
  isValidTimeSlot: (slot: any): boolean => {
    return !!(
      slot.id &&
      slot.start &&
      slot.end &&
      new Date(slot.start) < new Date(slot.end)
    );
  },
  
  isValidCalendarEvent: (event: any): boolean => {
    return !!(
      event.title &&
      event.start &&
      event.end &&
      event.timezone
    );
  }
};

// Test constants
export const testConstants = {
  PERFORMANCE_THRESHOLDS: {
    COMPONENT_RENDER: 100, // ms
    API_RESPONSE: 500, // ms
    BOOKING_CONFIRMATION: 500, // ms
    CALENDAR_SYNC: 1000 // ms
  },
  
  SECURITY_REQUIREMENTS: {
    CLIENT_VERIFICATION_REQUIRED: true,
    EMAIL_VALIDATION_REQUIRED: true,
    TERMS_ACCEPTANCE_REQUIRED: true,
    PRIVACY_ACCEPTANCE_REQUIRED: true
  },
  
  UI_REQUIREMENTS: {
    MIN_TOUCH_TARGET_SIZE: 44, // pixels
    VIEWPORT_MOBILE: { width: 375, height: 667 },
    VIEWPORT_TABLET: { width: 768, height: 1024 },
    VIEWPORT_DESKTOP: { width: 1280, height: 720 }
  }
};

export default testUtils;