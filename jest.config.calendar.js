/**
 * Jest Configuration for Calendar Integration Tests
 * Specialized configuration for comprehensive calendar integration testing
 */

module.exports = {
  displayName: 'Calendar Integration Tests',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integrations/calendar'],
  testMatch: [
    '**/tests/integrations/calendar/**/*.test.ts',
    '**/tests/integrations/calendar/**/*.spec.ts'
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/tests/integrations/calendar/setup.ts'],
  coverageDirectory: '<rootDir>/coverage/calendar-integration',
  collectCoverageFrom: [
    'src/lib/integrations/calendar/**/*.ts',
    '!src/lib/integrations/calendar/**/*.d.ts',
    '!src/lib/integrations/calendar/types/**/*.ts'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  testTimeout: 30000, // 30 seconds for integration tests
  verbose: true,
  bail: false, // Continue running tests even if some fail
  maxWorkers: 4, // Parallel test execution
  
  // Mock configuration
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Global test setup
  globalSetup: '<rootDir>/tests/integrations/calendar/global-setup.ts',
  globalTeardown: '<rootDir>/tests/integrations/calendar/global-teardown.ts',
  
  // Test environment variables
  setupFiles: ['<rootDir>/tests/integrations/calendar/env-setup.ts']
};