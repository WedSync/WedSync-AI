/**
 * WS-192 Integration Tests Suite - Complete integration test orchestration
 * Team E QA Framework - Comprehensive testing configuration
 * 
 * This configuration coordinates testing across:
 * - Team A (Frontend)
 * - Team B (Backend) 
 * - Team C (Integration)
 * - Team D (Mobile)
 */

import { Config } from '@jest/types';
import { PlaywrightTestConfig } from '@playwright/test';

// Wedding-specific test environment configuration
export const integrationTestConfig: Config.InitialOptions = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
  
  // Test file patterns for all teams
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/mobile/**/*.test.ts',
    '<rootDir>/tests/api/**/*.test.ts',
    '<rootDir>/tests/e2e/**/*.test.ts',
    '<rootDir>/tests/wedding-workflows/**/*.test.ts'
  ],
  
  // Coverage configuration with wedding workflow emphasis
  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'cobertura'],
  
  // Strict coverage thresholds for wedding platform reliability
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Critical wedding API endpoints require higher coverage
    './src/app/api/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Wedding workflow components need maximum coverage
    './src/components/wedding/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Payment and billing systems require 100% coverage
    './src/app/api/stripe/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  
  // Performance settings for CI/CD efficiency
  testTimeout: 30000, // 30 seconds for complex wedding workflows
  maxWorkers: 4, // Parallel execution for faster CI/CD
  
  // Coverage collection patterns
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/test-utils/**',
    '!src/**/*.config.ts',
    '!src/**/types.ts'
  ],
  
  // Module path mapping for clean imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1'
  },
  
  // Wedding day protection settings
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },
  
  // Global test configuration
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },
  
  // Transform configuration for TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx'
      }
    }]
  },
  
  // File extensions to handle
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test result reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'integration-results.xml'
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/test-results',
      filename: 'integration-report.html',
      expand: true,
      hideIcon: false
    }]
  ]
};

// Playwright configuration for E2E and visual testing
export const playwrightConfig: PlaywrightTestConfig = {
  testDir: './tests/e2e',
  
  // Wedding day reliability settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/playwright-results.json' }]
  ],
  
  use: {
    // Base URL for testing
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Tracing for debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  
  // Projects for cross-browser testing
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    
    // Mobile testing (60% of users are mobile)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    },
    {
      name: 'iPhone SE',
      use: { 
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 } // Minimum supported viewport
      }
    },
    
    // Tablet testing
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] }
    }
  ],
  
  // Development server setup
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI
  }
};

// Team-specific test configurations
export const teamConfigurations = {
  teamA: { // Frontend Team
    testMatch: [
      '<rootDir>/tests/frontend/**/*.test.ts',
      '<rootDir>/tests/components/**/*.test.ts',
      '<rootDir>/tests/accessibility/**/*.test.ts'
    ],
    coverageThreshold: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  teamB: { // Backend Team
    testMatch: [
      '<rootDir>/tests/api/**/*.test.ts',
      '<rootDir>/tests/database/**/*.test.ts',
      '<rootDir>/tests/auth/**/*.test.ts'
    ],
    coverageThreshold: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  teamC: { // Integration Team
    testMatch: [
      '<rootDir>/tests/integrations/**/*.test.ts',
      '<rootDir>/tests/webhooks/**/*.test.ts',
      '<rootDir>/tests/sync/**/*.test.ts'
    ],
    coverageThreshold: {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },
  
  teamD: { // Mobile Team
    testMatch: [
      '<rootDir>/tests/mobile/**/*.test.ts',
      '<rootDir>/tests/responsive/**/*.test.ts',
      '<rootDir>/tests/touch/**/*.test.ts'
    ],
    coverageThreshold: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};

// Wedding-specific test patterns
export const weddingTestPatterns = {
  criticalWorkflows: [
    'wedding-creation',
    'supplier-couple-connection',
    'form-submission-journey',
    'real-time-updates',
    'meeting-scheduling',
    'photo-evidence-upload',
    'payment-processing',
    'timeline-management'
  ],
  
  mobileFirstScenarios: [
    'mobile-form-completion',
    'mobile-photo-upload',
    'mobile-real-time-chat',
    'offline-form-saving',
    'mobile-payment-flow'
  ],
  
  performanceTargets: {
    firstContentfulPaint: 1200, // 1.2s
    timeToInteractive: 2500, // 2.5s
    cumulativeLayoutShift: 0.1,
    firstInputDelay: 100 // 100ms
  },
  
  accessibilityTargets: {
    wcagLevel: 'AA',
    colorContrast: 4.5,
    keyboardNavigation: true,
    screenReaderSupport: true
  }
};

// Quality gate thresholds
export const qualityGates = {
  testCoverage: {
    unit: 90,
    integration: 85,
    e2e: 80
  },
  
  performance: {
    maxLoadTime: 2000, // 2 seconds
    maxApiResponse: 500, // 500ms
    maxDatabaseQuery: 100 // 100ms
  },
  
  security: {
    vulnerabilityCount: 0,
    criticalIssues: 0,
    highIssues: 0
  },
  
  accessibility: {
    wcagViolations: 0,
    contrastViolations: 0,
    keyboardViolations: 0
  }
};

// Environment-specific configurations
export const environmentConfigs = {
  development: {
    ...integrationTestConfig,
    verbose: true,
    detectLeaks: true
  },
  
  staging: {
    ...integrationTestConfig,
    bail: 1, // Stop on first failure
    verbose: false
  },
  
  production: {
    ...integrationTestConfig,
    bail: 0, // Continue on failures for reporting
    verbose: false,
    // Wedding day protection - read-only tests only
    testPathIgnorePatterns: [
      '<rootDir>/tests/mutation/',
      '<rootDir>/tests/load/'
    ]
  }
};

export default integrationTestConfig;