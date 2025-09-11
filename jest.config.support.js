// Jest configuration specific to WS-235 Support Operations Ticket Management System
// Team D - Mobile/PWA Development - Comprehensive Testing Suite

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Display name for this test suite
  displayName: 'WS-235 Support System Tests',
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/src/__tests__/setup/support-test-setup.ts'
  ],
  
  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/__tests__/support/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/api/support/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/performance/**/*.test.{js,jsx,ts,tsx}'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/components/support/**/*.{js,jsx,ts,tsx}',
    'src/hooks/useRealtime*.{js,jsx,ts,tsx}',
    'src/app/api/support/**/*.{js,jsx,ts,tsx}',
    'src/lib/pwa/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/*.stories.{js,jsx,ts,tsx}',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  
  // Coverage thresholds (>90% as per specification)
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Specific thresholds for critical components
    'src/components/support/mobile/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/app/api/support/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage/support',
  
  // Test timeout for async operations
  testTimeout: 10000,
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/e2e/' // E2E tests run separately with Playwright
  ],
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  
  // Global test variables
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }
  },
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results/support',
        outputName: 'junit-support.xml',
        suiteName: 'WS-235 Support System Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › '
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results/support',
        filename: 'support-test-report.html',
        openReport: false,
        pageTitle: 'WS-235 Support System Test Report'
      }
    ]
  ],
  
  // Verbose output for debugging
  verbose: false,
  
  // Watch options for development
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/'
  ],
  
  // Error handling
  errorOnDeprecated: true,
  
  // Custom matchers and utilities
  setupFiles: [
    '<rootDir>/src/__tests__/setup/support-polyfills.ts'
  ],
  
  // Parallel execution
  maxWorkers: '50%',
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache/support'
};

// Create the final Jest config
module.exports = createJestConfig(customJestConfig);