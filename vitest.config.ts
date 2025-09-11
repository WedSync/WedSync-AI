/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  // ESBuild configuration for JSX in TypeScript test files
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  
  test: {
    // Environment setup with wedding platform security
    environment: 'jsdom',
    globals: true,
    setupFiles: [
      "./src/__tests__/setup/vitest.setup.ts",
      './tests/setup.ts',
      './src/__tests__/setup/test-environment.ts'
    ],
    
    // Path mappings to match Next.js 15 App Router
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
    
    // Coverage configuration - >80% requirement from spec
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      
      // Global coverage thresholds as per WS-091 specification
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Wedding-critical paths require 95% coverage
        './src/lib/auth/*': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        './src/lib/security/*': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        './src/lib/payments/*': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        './src/app/api/*': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
      
      // Include/exclude patterns
      include: [
        'src/**/*.{ts,tsx}',
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
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'tests/**/*.{test,spec}.{js,jsx,ts,tsx}',
      '__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/',
      '.next/',
      'coverage/',
      'dist/',
      'build/',
      'playwright-report/',
      'test-results/',
    ],
    
    // Performance optimization for wedding platform scale
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
        isolate: true,
      },
    },
    
    // Test timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Wedding-specific test options  
    reporters: [
      ['default', { summary: false }], // Replaces deprecated 'basic' reporter
      'verbose',
      ['json', { outputFile: 'test-results.json' }],
      ['html', { outputFile: 'test-report.html' }],
    ],
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
  },
  
  // Build configuration for test environment
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
  
  // Next.js 15 App Router compatibility
  // Environment variables are handled by secure test-environment.ts setup
})