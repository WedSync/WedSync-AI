/**
 * Jest Configuration for Enhanced Viral Coefficient Tracking System Tests
 * WS-230 Implementation Test Suite
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Custom Jest configuration for viral tracking tests
const customJestConfig = {
  displayName: 'WS-230 Enhanced Viral Tracking System',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  
  // Include specific test files for viral tracking system
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1'
  },
  
  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/lib/analytics/advanced-viral-calculator.ts',
    'src/lib/analytics/wedding-viral-analyzer.ts', 
    'src/lib/analytics/viral-optimization-engine.ts',
    'src/hooks/useEnhancedViralMetrics.ts',
    'src/components/admin/EnhancedViralDashboard.tsx',
    'src/app/api/admin/viral-metrics/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.(js|jsx|ts|tsx)',
    '!src/**/*.spec.(js|jsx|ts|tsx)'
  ],
  
  // Coverage thresholds - ensuring high quality
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/lib/analytics/advanced-viral-calculator.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/lib/analytics/viral-optimization-engine.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/hooks/useEnhancedViralMetrics.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Setup files
  setupFiles: ['<rootDir>/src/__tests__/setup/env.setup.js'],
  
  // Test environment setup
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/'],
  
  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/src/__tests__/setup/global-setup.ts',
  globalTeardown: '<rootDir>/src/__tests__/setup/global-teardown.ts',
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Performance monitoring
  detectOpenHandles: true,
  detectLeaks: true,
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-reports/viral-tracking',
        filename: 'viral-tracking-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'WS-230 Enhanced Viral Tracking System Test Report'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './test-reports/viral-tracking',
        outputName: 'junit.xml',
        suiteName: 'WS-230 Viral Tracking Tests'
      }
    ]
  ],
  
  // Projects for different test types
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: [
        '<rootDir>/src/lib/analytics/__tests__/*.test.ts',
        '<rootDir>/src/hooks/__tests__/*.test.ts'
      ],
      testEnvironment: 'node'
    },
    {
      displayName: 'Component Tests', 
      testMatch: [
        '<rootDir>/src/components/**/__tests__/*.test.tsx'
      ],
      testEnvironment: 'jsdom'
    },
    {
      displayName: 'API Integration Tests',
      testMatch: [
        '<rootDir>/src/app/api/**/__tests__/*.test.ts'
      ],
      testEnvironment: 'node'
    },
    {
      displayName: 'Database Migration Tests',
      testMatch: [
        '<rootDir>/supabase/migrations/__tests__/*.test.ts'
      ],
      testEnvironment: 'node',
      testTimeout: 60000 // Longer timeout for DB operations
    }
  ]
};

// Export Jest configuration
module.exports = createJestConfig(customJestConfig);