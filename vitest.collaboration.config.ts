import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    name: 'collaboration',
    root: '.',
    environment: 'jsdom',
    globals: true,
    setupFiles: [
      './tests/collaboration/jest-env-setup.ts',
      './tests/collaboration/global-setup.ts'
    ],
    globalSetup: './tests/collaboration/global-setup.ts',
    teardownTimeout: 10000,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/collaboration',
      include: [
        'src/components/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
        'src/app/**/*.{ts,tsx}'
      ],
      exclude: [
        'node_modules/',
        'coverage/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'src/app/**/*.stories.{ts,tsx}',
        'tests/',
        '.next/',
        'dist/'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        perFile: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    include: [
      'tests/collaboration/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.next/'
    ],
    // Run tests serially to avoid WebSocket conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, './')
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.TEST_WS_SERVER': '"ws://localhost:1234"',
    'process.env.TEST_MODE': '"collaboration"'
  }
})