/**
 * WS-167 Trial Management System - Performance Testing Configuration
 * Specialized Vitest configuration for performance and database tests
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'performance',
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup/performance-setup.ts'],
    testTimeout: 30000, // Extended timeout for performance tests
    hookTimeout: 10000,
    teardownTimeout: 10000,
    
    // Performance test specific includes
    include: [
      'tests/performance/**/*.test.{ts,js}',
      'tests/performance/**/*.spec.{ts,js}'
    ],
    
    exclude: [
      'node_modules/**',
      'tests/unit/**',
      'tests/integration/**',
      'tests/e2e/**'
    ],
    
    // Coverage configuration for performance tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/performance',
      include: [
        'src/lib/trial/**',
        'src/app/api/trial/**'
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.config.{ts,js}',
        'tests/**',
        'node_modules/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 75,
          lines: 75,
          statements: 75
        }
      }
    },
    
    // Performance benchmark reporting
    benchmark: {
      include: ['tests/performance/**/*.bench.{ts,js}'],
      exclude: ['node_modules/**'],
      reporters: ['verbose'],
      outputFile: './reports/performance-benchmarks.json'
    },
    
    // Parallel execution for performance tests
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1
      }
    },
    
    // Extended memory limits for bulk data operations
    // workerThreads: true, // Removed as it's not a valid property in current vitest version
    isolate: true,
    
    // Performance test reporters
    reporter: [
      'verbose',
      'json',
      'html',
      ['junit', { outputFile: './reports/performance-junit.xml' }]
    ],
    
    outputFile: './reports/performance-results.json'
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/tests': path.resolve(__dirname, './tests')
    }
  },
  
  esbuild: {
    target: 'node18'
  }
});