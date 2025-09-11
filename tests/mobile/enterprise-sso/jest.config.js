/**
 * WS-251: Mobile Enterprise SSO - Jest Configuration
 * Specialized Jest config for mobile enterprise SSO testing
 */

module.exports = {
  displayName: 'Mobile Enterprise SSO',
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/mobile/enterprise-sso/setup/test-setup.ts'
  ],
  
  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1'
  },
  
  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test match patterns
  testMatch: [
    '<rootDir>/tests/mobile/enterprise-sso/**/*.test.(ts|tsx)',
    '<rootDir>/tests/mobile/enterprise-sso/**/*.spec.(ts|tsx)'
  ],
  
  // Coverage settings
  collectCoverageFrom: [
    'src/components/mobile/enterprise-auth/**/*.{ts,tsx}',
    '!src/components/mobile/enterprise-auth/**/*.d.ts',
    '!src/components/mobile/enterprise-auth/**/*.stories.{ts,tsx}',
    '!src/components/mobile/enterprise-auth/**/index.{ts,tsx}'
  ],
  
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/components/mobile/enterprise-auth/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Coverage reporters
  coverageReporters: ['html', 'text', 'lcov', 'clover'],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage/mobile-enterprise-sso',
  
  // Mock settings
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Timeout settings
  testTimeout: 30000,
  
  // Global setup
  globalSetup: '<rootDir>/tests/mobile/enterprise-sso/setup/global-setup.js',
  globalTeardown: '<rootDir>/tests/mobile/enterprise-sso/setup/global-teardown.js',
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },
  
  // Verbose output for better debugging
  verbose: true,
  
  // Handle static assets
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 
      '<rootDir>/tests/__mocks__/fileMock.js'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ],
  
  // Transform ignore patterns (for node_modules that need transformation)
  transformIgnorePatterns: [
    'node_modules/(?!((@supabase|@dnd-kit|framer-motion)/.*|uuid|nanoid)/)'
  ],
  
  // Error on deprecated usage
  errorOnDeprecated: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Maximum worker processes
  maxWorkers: '50%',
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results/mobile-enterprise-sso',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],
  
  // Custom matchers
  setupFilesAfterEnv: [
    '<rootDir>/tests/mobile/enterprise-sso/setup/test-setup.ts',
    '<rootDir>/tests/mobile/enterprise-sso/setup/custom-matchers.ts'
  ]
};