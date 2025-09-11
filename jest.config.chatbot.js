/** @type {import('jest').Config} */
const config = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/components/chatbot/__tests__/setup.ts'
  ],

  // Test patterns - specifically for chatbot components
  testMatch: [
    '<rootDir>/src/components/chatbot/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/hooks/__tests__/useChat.test.{ts,tsx}',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/components/chatbot/**/*.{ts,tsx}',
    'src/hooks/useChat.{ts,tsx}',
    '!src/components/chatbot/**/*.stories.{ts,tsx}',
    '!src/components/chatbot/**/*.d.ts',
    '!src/components/chatbot/__tests__/**',
  ],

  // Coverage thresholds for chatbot components
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/components/chatbot/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/hooks/useChat.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },

  // Module name mapping for aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/__mocks__/fileMock.js',
  },

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@dnd-kit|framer-motion))',
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output for detailed test results
  verbose: true,

  // Maximum worker processes
  maxWorkers: '50%',

  // Test timeout (30 seconds)
  testTimeout: 30000,

  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src',
  ],

  // Reporters for test output
  reporters: [
    'default',
  ],

  // Error handling
  errorOnDeprecated: true,

  // ESM support
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};

module.exports = config;