/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Integration test specific configuration
    name: 'integration',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/integration/setup.ts'],
    
    // Integration tests run slower and need more time
    testTimeout: 30000,
    hookTimeout: 10000,
    
    // Path mappings consistent with main config
    alias: {
      '@': resolve(__dirname, './src'),
      '@/app': resolve(__dirname, './src/app'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/types': resolve(__dirname, './src/types'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/stores': resolve(__dirname, './src/stores'),
      '@/styles': resolve(__dirname, './src/styles'),
      '@/contexts': resolve(__dirname, './src/contexts'),
    },
    
    // Integration test file patterns
    include: [
      'src/__tests__/integration/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'tests/integration/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    
    // Exclude unit tests and other patterns
    exclude: [
      'node_modules/',
      '.next/',
      'coverage/',
      'dist/',
      'build/',
      'playwright-report/',
      'test-results/',
      'src/__tests__/unit/**/*',
      'src/__tests__/components/**/*',
      'src/__tests__/lib/**/*',
      'src/__tests__/api/**/*',
      'src/__tests__/hooks/**/*',
    ],
    
    // Integration test coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/integration',
      
      // Integration test coverage thresholds
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
        // Critical integration paths require higher coverage
        './src/app/api/*': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        './src/lib/auth/*': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
      
      include: [
        'src/app/api/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'src/components/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.stories.{ts,tsx}',
        '!src/**/*.config.{ts,js}',
      ],
      exclude: [
        'node_modules/',
        '.next/',
        'coverage/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'src/types/**',
        'src/styles/**',
      ],
    },
    
    // Parallel execution for integration tests
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 2, // Reduced for integration tests to avoid database conflicts
        isolate: true,
      },
    },
    
    // Integration test reporting
    reporters: [
      'default',
      'verbose',
      ['json', { outputFile: 'integration-test-results.json' }],
      ['html', { outputFile: 'integration-test-report.html' }],
    ],
    
    // Mock configuration for integration tests
    clearMocks: true,
    restoreMocks: true,
    mockReset: false, // Keep MSW mocks active
    
    // Environment variables for integration tests
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_ENV: 'integration-test',
      SUPABASE_URL: process.env.SUPABASE_TEST_URL || 'http://localhost:54321',
      SUPABASE_ANON_KEY: process.env.SUPABASE_TEST_KEY || 'test-key',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_TEST_SERVICE_KEY || 'test-service-key',
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
    },
  },
  
  // Build configuration for integration test environment
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/app': resolve(__dirname, './src/app'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/types': resolve(__dirname, './src/types'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/stores': resolve(__dirname, './src/stores'),
      '@/styles': resolve(__dirname, './src/styles'),
      '@/contexts': resolve(__dirname, './src/contexts'),
    },
  },
  
  // Integration test specific defines
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.NEXT_PUBLIC_ENV': '"integration-test"',
    'process.env.IS_INTEGRATION_TEST': 'true',
  },
})