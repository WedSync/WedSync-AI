/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/collaboration/test-setup.ts',
    '<rootDir>/src/test-setup.ts' // If exists
  ],

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/collaboration/**/*.test.ts',
    '<rootDir>/tests/collaboration/**/*.test.tsx'
  ],

  // Module name mapping for collaboration tests
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
    '^y-websocket$': '<rootDir>/node_modules/y-websocket',
    '^yjs$': '<rootDir>/node_modules/yjs'
  },

  // Transform patterns
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        resolveJsonModule: true
      }
    }]
  },

  // Coverage collection
  collectCoverageFrom: [
    'src/lib/collaboration/**/*.ts',
    'src/lib/collaboration/**/*.tsx',
    'src/components/**/collaborative*.tsx',
    'src/components/**/Collaboration*.tsx',
    'src/hooks/useCollaboration*.ts',
    'src/hooks/useRealtime*.ts',
    'src/utils/operational-transform/**/*.ts',
    'src/services/collaboration/**/*.ts'
  ],

  // Coverage thresholds for WS-244 requirements
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Specific thresholds for critical collaboration modules
    'src/lib/collaboration/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },

  // Test timeout for collaboration tests (longer due to network simulation)
  testTimeout: 30000,

  // Run collaboration tests serially to avoid WebSocket conflicts
  maxWorkers: 1,

  // Global test setup
  globalSetup: '<rootDir>/tests/collaboration/global-setup.ts',
  globalTeardown: '<rootDir>/tests/collaboration/global-teardown.ts',

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Environment variables for testing
  setupFiles: ['<rootDir>/tests/collaboration/jest-env-setup.ts'],

  // Handle static assets and styles
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/__mocks__/fileMock.js'
  },

  // Mock browser APIs
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // Verbose output for debugging
  verbose: true,

  // Report configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-results',
        filename: 'collaboration-test-report.html',
        openReport: false,
        pageTitle: 'WS-244 Collaboration Test Results'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'collaboration-junit.xml',
        suiteName: 'WS-244 Real-Time Collaboration Tests'
      }
    ]
  ]
};