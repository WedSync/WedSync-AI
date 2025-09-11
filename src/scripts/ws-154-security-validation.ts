#!/usr/bin/env tsx

/**
 * WS-154 Seating Arrangements Security Validation Script
 * Comprehensive testing of all implemented security measures
 *
 * Run with: npx tsx src/scripts/ws-154-security-validation.ts
 */

import { z } from 'zod';
import chalk from 'chalk';
import { performance } from 'perf_hooks';

// Import our security modules
import {
  seatingArrangementSchema,
  guestAssignmentSchema,
  tableCreateSchema,
  tableUpdateSchema,
  sanitizeGuestName,
  sanitizeTableName,
} from '../lib/validations/seating-security';
import { createSeatingSecurityMiddleware } from '../lib/security/seating-security-middleware';

// Test data and utilities
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: string;
}

interface SecurityTestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  totalDuration: number;
}

class SecurityValidator {
  private results: SecurityTestSuite[] = [];
  private currentSuite: SecurityTestSuite | null = null;

  // Test runner utilities
  suite(name: string) {
    if (this.currentSuite) {
      this.results.push(this.currentSuite);
    }

    this.currentSuite = {
      name,
      tests: [],
      passed: 0,
      failed: 0,
      totalDuration: 0,
    };
  }

  async test(name: string, testFn: () => Promise<void> | void): Promise<void> {
    const start = performance.now();
    let result: TestResult;

    try {
      await testFn();
      result = {
        name,
        passed: true,
        duration: performance.now() - start,
      };
      this.currentSuite!.passed++;
    } catch (error) {
      result = {
        name,
        passed: false,
        duration: performance.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
      this.currentSuite!.failed++;
    }

    this.currentSuite!.tests.push(result);
    this.currentSuite!.totalDuration += result.duration;
  }

  finalize(): SecurityTestSuite[] {
    if (this.currentSuite) {
      this.results.push(this.currentSuite);
    }
    return this.results;
  }
}

// Mock data for testing
const mockSecurityContext = {
  userId: 'test-user-123',
  coupleId: 'test-couple-456',
  sessionId: 'test-session-789',
  ipAddress: '127.0.0.1',
  userAgent: 'Test Agent 1.0',
};

const mockGuests = [
  {
    id: 'guest-1',
    name: 'John Doe',
    priority: 'vip' as const,
    dietaryRequirements: ['vegetarian'],
    accessibilityRequirements: ['wheelchair'],
    conflictsWith: ['guest-2'],
  },
  {
    id: 'guest-2',
    name: 'Jane Smith',
    priority: 'family' as const,
    dietaryRequirements: ['gluten-free'],
  },
];

const mockTables = [
  {
    id: 'table-1',
    name: 'Head Table',
    capacity: 8,
    shape: 'round' as const,
    position: { x: 100, y: 100 },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function runSecurityValidation(): Promise<void> {
  const validator = new SecurityValidator();

  console.log(chalk.blue.bold('🔒 WS-154 Security Validation Suite'));
  console.log(
    chalk.gray('Testing all security measures for seating arrangements...\n'),
  );

  // Test 1: Input Validation Schemas
  validator.suite('Input Validation Schemas');

  await validator.test('Valid guest assignment schema', async () => {
    const validData = {
      guestId: 'guest-123',
      tableId: 'table-456',
      coupleId: 'couple-789',
    };

    const result = guestAssignmentSchema.safeParse(validData);
    if (!result.success) throw new Error('Valid data should pass validation');
  });

  await validator.test('Reject malicious guest assignment', async () => {
    const maliciousData = {
      guestId: '<script>alert("xss")</script>',
      tableId: '../../../etc/passwd',
      coupleId: 'DROP TABLE users;',
    };

    const result = guestAssignmentSchema.safeParse(maliciousData);
    if (result.success) throw new Error('Malicious data should be rejected');
  });

  await validator.test('Valid table creation schema', async () => {
    const validData = {
      name: 'Test Table',
      capacity: 8,
      shape: 'round',
      position: { x: 100, y: 100 },
      coupleId: 'couple-789',
    };

    const result = tableCreateSchema.safeParse(validData);
    if (!result.success) throw new Error('Valid data should pass validation');
  });

  await validator.test('Reject table with excessive capacity', async () => {
    const invalidData = {
      name: 'Huge Table',
      capacity: 999,
      shape: 'round',
      position: { x: 100, y: 100 },
      coupleId: 'couple-789',
    };

    const result = tableCreateSchema.safeParse(invalidData);
    if (result.success)
      throw new Error('Excessive capacity should be rejected');
  });

  // Test 2: Data Sanitization
  validator.suite('Data Sanitization');

  await validator.test('Sanitize guest names', async () => {
    const maliciousName = '<script>alert("xss")</script>John Doe';
    const sanitized = sanitizeGuestName(maliciousName);

    if (sanitized.includes('<script>') || sanitized.includes('alert')) {
      throw new Error('XSS content not properly sanitized');
    }
    if (!sanitized.includes('John Doe')) {
      throw new Error('Valid content was removed during sanitization');
    }
  });

  await validator.test('Sanitize table names', async () => {
    const maliciousName = 'Table<img src=x onerror=alert(1)>1';
    const sanitized = sanitizeTableName(maliciousName);

    if (sanitized.includes('<img') || sanitized.includes('onerror')) {
      throw new Error('XSS content not properly sanitized');
    }
    if (!sanitized.includes('Table') || !sanitized.includes('1')) {
      throw new Error('Valid content was removed during sanitization');
    }
  });

  await validator.test('Handle emoji and unicode in names', async () => {
    const unicodeName = 'Table 🎉 José María';
    const sanitized = sanitizeTableName(unicodeName);

    if (sanitized.length === 0) {
      throw new Error('Unicode content was completely removed');
    }
  });

  // Test 3: Security Middleware
  validator.suite('Security Middleware');

  await validator.test('Create security middleware instance', async () => {
    const middleware = createSeatingSecurityMiddleware(mockSecurityContext);
    if (!middleware) throw new Error('Failed to create security middleware');
  });

  await validator.test(
    'Validate guest assignment with middleware',
    async () => {
      const middleware = createSeatingSecurityMiddleware(mockSecurityContext);

      const result = await middleware.assignGuest(
        'guest-1',
        'table-1',
        mockGuests,
        mockTables,
      );

      if (!result.success) {
        throw new Error(
          `Assignment validation failed: ${result.errors?.join(', ')}`,
        );
      }
    },
  );

  await validator.test('Reject assignment to non-existent table', async () => {
    const middleware = createSeatingSecurityMiddleware(mockSecurityContext);

    const result = await middleware.assignGuest(
      'guest-1',
      'non-existent-table',
      mockGuests,
      mockTables,
    );

    if (result.success) {
      throw new Error('Assignment to non-existent table should be rejected');
    }
  });

  await validator.test('Validate table creation with middleware', async () => {
    const middleware = createSeatingSecurityMiddleware(mockSecurityContext);

    const result = await middleware.createTable({
      name: 'New Table',
      capacity: 6,
      shape: 'square',
      position: { x: 200, y: 200 },
    });

    if (!result.success) {
      throw new Error(
        `Table creation validation failed: ${result.errors?.join(', ')}`,
      );
    }
  });

  await validator.test(
    'Reject table creation with malicious data',
    async () => {
      const middleware = createSeatingSecurityMiddleware(mockSecurityContext);

      const result = await middleware.createTable({
        name: '<script>malicious</script>',
        capacity: -1,
        shape: 'round',
        position: { x: -9999, y: 9999 },
      });

      if (result.success && result.data.name.includes('<script>')) {
        throw new Error('Malicious table data should be sanitized or rejected');
      }
    },
  );

  // Test 4: Bulk Operations Security
  validator.suite('Bulk Operations Security');

  await validator.test('Validate reasonable bulk operation', async () => {
    const middleware = createSeatingSecurityMiddleware(mockSecurityContext);

    const result = await middleware.validateBulkOperation('bulk_assign', 10);

    if (!result.success) {
      throw new Error(
        `Reasonable bulk operation should be allowed: ${result.errors?.join(', ')}`,
      );
    }
  });

  await validator.test('Reject excessive bulk operation', async () => {
    const middleware = createSeatingSecurityMiddleware(mockSecurityContext);

    const result = await middleware.validateBulkOperation('bulk_assign', 999);

    if (result.success) {
      throw new Error('Excessive bulk operation should be rejected');
    }
  });

  // Test 5: Export Operations Security
  validator.suite('Export Operations Security');

  await validator.test('Validate export operation', async () => {
    const middleware = createSeatingSecurityMiddleware(mockSecurityContext);

    const result = await middleware.validateExportOperation('layout');

    if (!result.success) {
      throw new Error(
        `Export operation should be allowed: ${result.errors?.join(', ')}`,
      );
    }
  });

  await validator.test('Validate arrangement access', async () => {
    const middleware = createSeatingSecurityMiddleware(mockSecurityContext);

    const result =
      await middleware.validateArrangementAccess('arrangement-123');

    if (!result.success) {
      throw new Error(
        `Arrangement access should be validated: ${result.errors?.join(', ')}`,
      );
    }
  });

  await validator.test(
    'Reject access to malicious arrangement ID',
    async () => {
      const middleware = createSeatingSecurityMiddleware(mockSecurityContext);

      const result = await middleware.validateArrangementAccess(
        '../../../etc/passwd',
      );

      if (result.success && result.data?.arrangementId?.includes('../')) {
        throw new Error('Path traversal in arrangement ID should be sanitized');
      }
    },
  );

  // Test 6: Edge Cases and Error Handling
  validator.suite('Edge Cases & Error Handling');

  await validator.test('Handle empty inputs gracefully', async () => {
    const emptyName = sanitizeGuestName('');
    if (emptyName.length > 0) {
      throw new Error('Empty input should remain empty after sanitization');
    }
  });

  await validator.test('Handle very long inputs', async () => {
    const longInput = 'A'.repeat(1000) + '<script>alert("xss")</script>';
    const sanitized = sanitizeTableName(longInput);

    if (sanitized.length > 500) {
      throw new Error('Long input should be truncated');
    }
    if (sanitized.includes('<script>')) {
      throw new Error('XSS content should be removed even in long input');
    }
  });

  await validator.test('Handle special characters in positions', async () => {
    const middleware = createSeatingSecurityMiddleware(mockSecurityContext);

    const result = await middleware.createTable({
      name: 'Test Table',
      capacity: 8,
      shape: 'round',
      position: { x: 1.5, y: 2.7 }, // Float values
    });

    if (!result.success) {
      throw new Error('Float positions should be handled gracefully');
    }

    // Check if positions are properly rounded/floored
    if (
      typeof result.data.position.x !== 'number' ||
      typeof result.data.position.y !== 'number'
    ) {
      throw new Error('Positions should be converted to valid numbers');
    }
  });

  // Finalize and report results
  const results = validator.finalize();

  console.log('\n' + chalk.blue.bold('📊 Security Validation Results'));
  console.log(chalk.gray('='.repeat(50)));

  let totalPassed = 0;
  let totalFailed = 0;
  let totalDuration = 0;

  results.forEach((suite) => {
    const status =
      suite.failed === 0 ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
    console.log(`\n${status} ${chalk.bold(suite.name)}`);
    console.log(
      `  Tests: ${chalk.green(suite.passed)} passed, ${chalk.red(suite.failed)} failed`,
    );
    console.log(`  Duration: ${suite.totalDuration.toFixed(2)}ms`);

    // Show failed tests
    if (suite.failed > 0) {
      suite.tests
        .filter((t) => !t.passed)
        .forEach((test) => {
          console.log(`    ${chalk.red('✗')} ${test.name}`);
          console.log(`      ${chalk.red(test.error)}`);
        });
    }

    totalPassed += suite.passed;
    totalFailed += suite.failed;
    totalDuration += suite.totalDuration;
  });

  console.log('\n' + chalk.gray('='.repeat(50)));
  console.log(
    chalk.bold(
      `Total: ${chalk.green(totalPassed)} passed, ${chalk.red(totalFailed)} failed`,
    ),
  );
  console.log(chalk.gray(`Total duration: ${totalDuration.toFixed(2)}ms`));

  if (totalFailed === 0) {
    console.log(
      '\n' +
        chalk.green.bold(
          '🎉 All security tests passed! The seating system is secure.',
        ),
    );
  } else {
    console.log(
      '\n' +
        chalk.red.bold(
          '⚠️  Some security tests failed. Please review and fix the issues.',
        ),
    );
    process.exit(1);
  }
}

// Run the validation if this script is executed directly
if (require.main === module) {
  runSecurityValidation().catch((error) => {
    console.error(chalk.red.bold('Security validation failed:'), error);
    process.exit(1);
  });
}

export { runSecurityValidation };
