/**
 * Integration Test Configuration
 * Configures Jest for comprehensive integration testing of Environment Variables Management System
 */

const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../../../tsconfig.json');

module.exports = {
  displayName: 'Environment Variables Integration Tests',
  testMatch: [
    '<rootDir>/src/components/environment-variables/__tests__/integration/**/*.test.{ts,tsx}'
  ],
  
  // Test Environment
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/src/components/environment-variables/__tests__/integration/setup.ts'
  ],
  
  // Module Resolution
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, {
      prefix: '<rootDir>/'
    }),
    // Mock static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js'
  },
  
  // Transform Configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Coverage Configuration
  collectCoverageFrom: [
    'src/components/environment-variables/**/*.{ts,tsx}',
    '!src/components/environment-variables/**/*.test.{ts,tsx}',
    '!src/components/environment-variables/**/*.stories.{ts,tsx}',
    '!src/components/environment-variables/**/index.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Test Timeouts (longer for integration tests)
  testTimeout: 30000,
  
  // Globals
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Module File Extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test Results Processing
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results/integration',
      outputName: 'environment-variables-integration-results.xml',
      suiteName: 'Environment Variables Integration Tests'
    }],
    ['jest-html-reporters', {
      publicPath: './test-results/integration',
      filename: 'integration-test-report.html',
      expand: true
    }]
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Performance monitoring
  detectOpenHandles: true,
  forceExit: true,
  
  // Verbose output for integration tests
  verbose: true,
  
  // Custom test sequencer for integration tests
  testSequencer: '<rootDir>/src/components/environment-variables/__tests__/integration/testSequencer.js'
};