module.exports = {
  displayName: 'Algorithm Accuracy Tests',
  testMatch: ['**/__tests__/accuracy/**/*.test.ts'],
  testTimeout: 30000, // 30 seconds for accuracy validation
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/accuracy/setup.ts'],
  collectCoverageFrom: [
    'src/lib/timeline/**/*.ts',
    '!src/lib/timeline/**/*.test.ts'
  ],
  coverageReporters: ['text', 'json', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Specific thresholds for algorithm components
    'src/lib/timeline/calculator.ts': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    }
  },
  verbose: true,
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  rootDir: '.',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  // Accuracy testing specific configurations
  globals: {
    'ts-jest': {
      tsconfig: {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true
        }
      }
    }
  },
  // Custom reporters for accuracy metrics
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'accuracy-test-results',
      outputName: 'accuracy-results.xml'
    }],
    ['./src/__tests__/accuracy/accuracy-reporter.js', {
      outputFile: 'accuracy-test-results/accuracy-report.json'
    }]
  ]
};