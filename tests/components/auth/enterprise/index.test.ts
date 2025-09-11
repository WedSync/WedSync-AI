/**
 * Enterprise SSO Integration System Test Suite
 * WS-251 Team A Round 1 - Comprehensive Test Coverage
 * 
 * This file exports all enterprise SSO tests for centralized execution
 * and ensures comprehensive coverage of the enterprise authentication system.
 */

// Core SSO Components Tests
export * from './SSOLoginInterface.test'
export * from './EnterpriseProviderSelector.test'
export * from './DomainBasedRouting.test'

// Team Management Tests  
export * from './TeamMemberInvitation.test'
export * from './RoleManagementInterface.test'

// Wedding-Specific SSO Tests
export * from './WeddingTeamSSO.test'
export * from './MultiVendorAccess.test'
export * from './WeddingSeasonAccess.test'
export * from './VendorNetworkSSO.test'

// Test configuration for enterprise SSO system
export const testConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/components/auth/enterprise/**/*.{ts,tsx}',
    '!src/components/auth/enterprise/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}

// Wedding industry specific test utilities
export const weddingTestUtils = {
  mockWeddingVendor: {
    id: 'vendor-123',
    businessName: 'Elite Wedding Photography',
    businessType: 'photography',
    location: {
      city: 'San Francisco',
      state: 'CA',
      serviceRadius: 50
    },
    networkStatus: {
      isVerified: true,
      trustScore: 95,
      averageRating: 4.8
    }
  },
  
  mockWedding: {
    id: 'wedding-123',
    coupleName: 'Sarah & Michael',
    weddingDate: new Date('2024-06-15'),
    venueName: 'Garden Oaks Estate'
  },
  
  mockSSOProvider: {
    id: 'provider-123',
    name: 'Microsoft Azure AD',
    type: 'oidc',
    domains: ['company.com'],
    enabled: true
  }
}

// Test scenarios for wedding industry SSO
export const testScenarios = {
  // Peak wedding season testing
  peakSeason: {
    season: 'summer',
    expectedLoad: 'extreme',
    userLimit: 1000,
    responseTimeThreshold: 500
  },
  
  // Off-season testing
  offSeason: {
    season: 'winter', 
    expectedLoad: 'low',
    userLimit: 100,
    responseTimeThreshold: 200
  },
  
  // Wedding day emergency scenarios
  emergencyAccess: {
    override: true,
    bypassRestrictions: true,
    maxResponseTime: 100
  },
  
  // Multi-vendor collaboration
  vendorCollaboration: {
    permissions: ['view_timeline', 'share_documents', 'coordinate_vendors'],
    trustLevel: 'trusted',
    connectionType: 'collaboration'
  }
}

// Performance benchmarks for enterprise SSO
export const performanceBenchmarks = {
  ssoAuthentication: {
    maxDuration: 3000, // 3 seconds
    successRate: 0.99 // 99%
  },
  
  providerDetection: {
    maxDuration: 1000, // 1 second
    accuracy: 0.95 // 95%
  },
  
  roleAssignment: {
    maxDuration: 500, // 0.5 seconds
    consistency: 1.0 // 100%
  },
  
  seasonalAccess: {
    ruleEvaluation: 100, // 100ms
    cacheHitRate: 0.90 // 90%
  }
}

// Wedding-specific test data generators
export const testDataGenerators = {
  generateVendorProfile: (type = 'photography') => ({
    id: `vendor-${Math.random().toString(36).substr(2, 9)}`,
    businessName: `${type.charAt(0).toUpperCase() + type.slice(1)} Excellence`,
    businessType: type,
    location: {
      city: 'San Francisco',
      state: 'CA',
      serviceRadius: Math.floor(Math.random() * 100) + 10
    },
    networkStatus: {
      isVerified: Math.random() > 0.3,
      trustScore: Math.floor(Math.random() * 40) + 60,
      averageRating: Math.random() * 2 + 3
    },
    ssoProfile: {
      enabled: Math.random() > 0.5,
      providers: ['microsoft', 'google'],
      teamSize: Math.floor(Math.random() * 10) + 1
    }
  }),
  
  generateWeddingTeamMember: (role = 'coordinator') => ({
    id: `member-${Math.random().toString(36).substr(2, 9)}`,
    email: `${role}@wedding-vendor.com`,
    role,
    isAuthenticated: Math.random() > 0.2,
    permissions: getDefaultPermissions(role),
    weddingAccessLevel: role === 'couple' ? 'full' : 'limited'
  }),
  
  generateSSOProvider: (type = 'oidc') => ({
    id: `provider-${Math.random().toString(36).substr(2, 9)}`,
    name: `${type.toUpperCase()} Provider`,
    type,
    enabled: true,
    domains: [`company-${Math.random().toString(36).substr(2, 4)}.com`],
    metadata: {}
  })
}

function getDefaultPermissions(role: string): string[] {
  const permissionMap: Record<string, string[]> = {
    couple: ['view_all', 'approve_changes', 'guest_management'],
    coordinator: ['manage_timeline', 'coordinate_vendors', 'day_of_execution'],
    photographer: ['photo_management', 'timeline_access', 'gallery_creation'],
    vendor: ['view_weddings', 'timeline_access']
  }
  
  return permissionMap[role] || ['view_dashboard']
}

// Integration test helpers
export const integrationHelpers = {
  setupTestDatabase: async () => {
    // Mock database setup for integration tests
    return {
      organizations: [],
      sso_providers: [],
      roles: [],
      team_members: [],
      weddings: [],
      vendor_connections: []
    }
  },
  
  cleanupTestData: async (organizationId: string) => {
    // Cleanup test data after integration tests
    return Promise.resolve()
  },
  
  mockSupabaseClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    auth: {
      signInWithOAuth: vi.fn(() => Promise.resolve({ error: null })),
      signInWithOtp: vi.fn(() => Promise.resolve({ error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null }))
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }
  })
}

// Test categories for organized execution
export const testCategories = {
  unit: [
    'SSOLoginInterface',
    'EnterpriseProviderSelector', 
    'DomainBasedRouting',
    'TeamMemberInvitation',
    'RoleManagementInterface'
  ],
  
  integration: [
    'WeddingTeamSSO',
    'MultiVendorAccess',
    'WeddingSeasonAccess',
    'VendorNetworkSSO'
  ],
  
  performance: [
    'SSO Authentication Speed',
    'Provider Detection Accuracy',
    'Role Assignment Consistency',
    'Seasonal Access Rule Evaluation'
  ],
  
  security: [
    'Authentication Flow Security',
    'Permission Validation',
    'Cross-Vendor Access Control',
    'Emergency Override Protection'
  ]
}

export default testConfig