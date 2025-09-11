/**
 * WS-177 Security Testing Suite Configuration
 * Team D Round 1 Implementation - Ultra Hard Testing Standards
 * 
 * Jest configuration for comprehensive security testing with celebrity protection
 * Optimized for wedding platform security architecture validation
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Custom Jest configuration for security testing
const securityTestConfig = {
  // Test environment configuration
  testEnvironment: 'node',
  
  // Test file patterns for security tests
  testMatch: [
    '<rootDir>/__tests__/security/**/*.test.{js,ts}',
    '<rootDir>/__tests__/api/security/**/*.test.{js,ts}',
    '<rootDir>/__tests__/components/security/**/*.test.{js,ts}',
    '<rootDir>/__tests__/lib/security/**/*.test.{js,ts}'
  ],

  // Setup files for security testing
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/security/setup.ts'
  ],

  // Module name mapping for security components
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/__tests__/(.*)$': '<rootDir>/__tests__/$1'
  },

  // Coverage configuration for security code
  collectCoverageFrom: [
    'src/lib/security/**/*.{js,ts}',
    'src/app/api/security/**/*.{js,ts}',
    'src/components/security/**/*.{js,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,ts}',
    '!src/**/*.test.{js,ts}'
  ],

  // Coverage thresholds - Ultra Hard standards
  coverageThreshold: {
    global: {
      branches: 95,      // High branch coverage for security logic
      functions: 98,     // Critical function coverage
      lines: 96,         // Comprehensive line coverage
      statements: 96     // Statement coverage for security flows
    },
    // Specific thresholds for critical security components
    'src/lib/security/AuditSecurityManager.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/lib/security/SecurityMonitoringService.ts': {
      branches: 98,
      functions: 100,
      lines: 98,
      statements: 98
    },
    'src/app/api/security/**/*.ts': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95
    }
  },

  // Coverage reporting
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage/security',

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Test timeout for security tests (some may take longer due to encryption/validation)
  testTimeout: 30000, // 30 seconds

  // Global test setup
  globalSetup: '<rootDir>/__tests__/security/globalSetup.ts',
  globalTeardown: '<rootDir>/__tests__/security/globalTeardown.ts',

  // Security-specific test environment variables
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },

  // Reporter configuration for security testing
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/security/html-report',
        filename: 'security-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'WS-177 Security Test Report',
        logoImgPath: undefined,
        inlineSource: false
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './coverage/security',
        outputName: 'security-test-results.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: false,
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],

  // Verbose output for security test debugging
  verbose: true,

  // Clear mocks between tests for security isolation
  clearMocks: true,
  restoreMocks: true,

  // Security test tags and filtering
  testNamePattern: undefined,
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/'
  ],

  // Mock configuration for security tests
  modulePathIgnorePatterns: [
    '<rootDir>/dist/'
  ],

  // Globals for security testing
  globals: {
    'ts-jest': {
      useESM: false,
      isolatedModules: true
    }
  },

  // Error handling for failed security tests
  bail: false, // Continue running all security tests even if some fail
  
  // Snapshot configuration
  updateSnapshot: false, // Require explicit snapshot updates for security tests

  // Custom test sequencer for security tests (run critical tests first)
  testSequencer: '<rootDir>/__tests__/security/testSequencer.js'
};

// Export the Jest configuration
module.exports = createJestConfig(securityTestConfig);