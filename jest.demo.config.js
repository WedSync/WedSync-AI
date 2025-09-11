/**
 * Jest configuration for Demo Suite tests
 * Separate configuration to isolate demo testing
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'Demo Suite Tests',
  testMatch: [
    '<rootDir>/tests/demo/**/*.test.ts',
    '<rootDir>/tests/demo/**/*.test.tsx'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.demo.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/lib/auth/demo-auth.ts',
    'src/lib/services/demo-media-service.ts',
    'src/lib/services/demo-seeding-service.ts',
    'src/lib/services/demo-reset-service.ts',
    'src/components/demo/**/*.{ts,tsx}',
    'src/app/demo/**/*.{ts,tsx}',
    'src/app/api/demo/**/*.ts'
  ],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for critical components
    'src/lib/auth/demo-auth.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/lib/services/demo-media-service.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  coverageDirectory: '<rootDir>/coverage/demo',
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Test timeout for potentially slow operations
  testTimeout: 30000,
  
  // Verbose output for demo tests
  verbose: true,
  
  // Fail fast on first test failure (useful for CI/CD)
  bail: false,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Reset modules between tests
  resetMocks: true,
  
  // Environment variables for testing
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  }
};

// Export Jest configuration
module.exports = createJestConfig(customJestConfig);