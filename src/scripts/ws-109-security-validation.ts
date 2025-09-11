/**
 * WS-109: Commission System Security Validation Script
 *
 * Comprehensive security validation for the commission calculation and payout system
 * including SQL injection prevention, input validation, and authentication checks.
 *
 * Team B - Batch 8 - Round 2
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// =====================================================================================
// SECURITY VALIDATION CONFIGURATION
// =====================================================================================

interface SecurityIssue {
  type: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line?: number;
  description: string;
  code_snippet?: string;
}

interface ValidationResult {
  passed: boolean;
  issues: SecurityIssue[];
  summary: {
    total_files_scanned: number;
    critical_issues: number;
    high_issues: number;
    medium_issues: number;
    low_issues: number;
  };
}

// =====================================================================================
// SECURITY PATTERNS TO DETECT
// =====================================================================================

const SECURITY_PATTERNS = {
  sql_injection: [
    /\.query\s*\(\s*['"`][^'"`]*\+/g, // String concatenation in queries
    /SELECT\s+\*\s+FROM\s+[^;]*\${/gi, // Dynamic table/column names in SQL
    /INSERT\s+INTO\s+[^;]*\${/gi, // Dynamic table/column names in INSERT
    /UPDATE\s+[^;]*SET\s+[^;]*\${/gi, // Dynamic columns in UPDATE
    /DELETE\s+FROM\s+[^;]*\${/gi, // Dynamic table names in DELETE
  ],

  auth_bypass: [
    /auth.*=.*null/gi,
    /\.role.*=.*['"`]admin['"`]/gi,
    /if\s*\(\s*!auth/gi,
  ],

  data_exposure: [
    /console\.log.*password/gi,
    /console\.log.*token/gi,
    /console\.log.*secret/gi,
    /res\.json.*password/gi,
  ],

  input_validation: [
    /req\.body\.[^;]*without.*validation/gi,
    /parseInt\(.*req\./gi, // Unsafe number parsing
    /eval\s*\(/gi, // Code execution
  ],

  financial_precision: [
    /parseFloat.*cents/gi,
    /Math\.round.*\//gi, // Division before rounding
    /\+.*cents.*\+/gi, // Direct number addition on cents
  ],
};

// =====================================================================================
// VALIDATION FUNCTIONS
// =====================================================================================

async function runSecurityValidation(): Promise<ValidationResult> {
  console.log('🔐 Starting WS-109 Commission System Security Validation...\n');

  const issues: SecurityIssue[] = [];
  let totalFilesScanned = 0;

  // Define commission system files to scan
  const filesToScan = [
    'src/lib/services/commissionCalculationService.ts',
    'src/lib/services/payoutProcessingService.ts',
    'src/lib/services/creatorTierManagementService.ts',
    'src/lib/services/financialDataProcessingService.ts',
    'src/app/api/marketplace/commission/calculate/route.ts',
    'src/app/api/marketplace/commission/process-payouts/route.ts',
    'src/app/api/marketplace/commission/creator/[id]/route.ts',
    'src/app/api/marketplace/financial/record-sale/route.ts',
    'src/app/api/marketplace/financial/analytics/route.ts',
    'src/app/api/marketplace/financial/creator/[id]/earnings/route.ts',
  ];

  for (const file of filesToScan) {
    const fullPath = join(process.cwd(), file);

    try {
      const content = readFileSync(fullPath, 'utf-8');
      totalFilesScanned++;

      console.log(`📁 Scanning: ${file}`);

      // Run security checks
      const fileIssues = await scanFileForSecurityIssues(file, content);
      issues.push(...fileIssues);
    } catch (error) {
      console.log(
        `⚠️  Could not scan ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Validate Decimal.js usage for financial precision
  console.log('\n💰 Validating financial precision...');
  const precisionIssues = validateFinancialPrecision(filesToScan);
  issues.push(...precisionIssues);

  // Validate authentication implementation
  console.log('🔑 Validating authentication patterns...');
  const authIssues = validateAuthenticationPatterns(filesToScan);
  issues.push(...authIssues);

  // Generate summary
  const summary = {
    total_files_scanned: totalFilesScanned,
    critical_issues: issues.filter((i) => i.type === 'critical').length,
    high_issues: issues.filter((i) => i.type === 'high').length,
    medium_issues: issues.filter((i) => i.type === 'medium').length,
    low_issues: issues.filter((i) => i.type === 'low').length,
  };

  return {
    passed: summary.critical_issues === 0 && summary.high_issues === 0,
    issues,
    summary,
  };
}

async function scanFileForSecurityIssues(
  filePath: string,
  content: string,
): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  const lines = content.split('\n');

  // Check for SQL injection patterns
  for (const pattern of SECURITY_PATTERNS.sql_injection) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = findLineNumber(content, match);
        issues.push({
          type: 'critical',
          category: 'SQL Injection',
          file: filePath,
          line: lineNumber,
          description: 'Potential SQL injection vulnerability detected',
          code_snippet: match.trim(),
        });
      });
    }
  }

  // Check for authentication bypass patterns
  for (const pattern of SECURITY_PATTERNS.auth_bypass) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = findLineNumber(content, match);
        issues.push({
          type: 'high',
          category: 'Authentication Bypass',
          file: filePath,
          line: lineNumber,
          description: 'Potential authentication bypass detected',
          code_snippet: match.trim(),
        });
      });
    }
  }

  // Check for data exposure patterns
  for (const pattern of SECURITY_PATTERNS.data_exposure) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = findLineNumber(content, match);
        issues.push({
          type: 'high',
          category: 'Data Exposure',
          file: filePath,
          line: lineNumber,
          description: 'Potential sensitive data exposure in logs or responses',
          code_snippet: match.trim(),
        });
      });
    }
  }

  // Check for input validation issues
  for (const pattern of SECURITY_PATTERNS.input_validation) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = findLineNumber(content, match);
        issues.push({
          type: 'medium',
          category: 'Input Validation',
          file: filePath,
          line: lineNumber,
          description: 'Potentially unsafe input handling detected',
          code_snippet: match.trim(),
        });
      });
    }
  }

  // Check for financial precision issues
  for (const pattern of SECURITY_PATTERNS.financial_precision) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = findLineNumber(content, match);
        issues.push({
          type: 'high',
          category: 'Financial Precision',
          file: filePath,
          line: lineNumber,
          description: 'Potentially unsafe financial calculation detected',
          code_snippet: match.trim(),
        });
      });
    }
  }

  return issues;
}

function validateFinancialPrecision(filesToScan: string[]): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  for (const file of filesToScan) {
    const fullPath = join(process.cwd(), file);

    try {
      const content = readFileSync(fullPath, 'utf-8');

      // Check if Decimal.js is imported and used for financial calculations
      const hasDecimalImport =
        /import.*Decimal.*from.*['"`]decimal\.js['"`]/.test(content);
      const hasFinancialCalculations = /cents|commission|earnings|payout/.test(
        content,
      );

      if (hasFinancialCalculations && !hasDecimalImport) {
        // Check if native JavaScript number operations are used
        const hasUnsafeOperations =
          /\*|\+|-|\//.test(content) && !/Math\.round/.test(content);

        if (hasUnsafeOperations) {
          issues.push({
            type: 'medium',
            category: 'Financial Precision',
            file: file,
            description:
              'Financial calculations should use Decimal.js for precision. Consider importing and using Decimal.js for monetary operations.',
          });
        }
      }
    } catch (error) {
      // File doesn't exist or can't be read - skip
    }
  }

  return issues;
}

function validateAuthenticationPatterns(
  filesToScan: string[],
): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  for (const file of filesToScan) {
    if (!file.includes('/api/')) continue; // Only check API routes

    const fullPath = join(process.cwd(), file);

    try {
      const content = readFileSync(fullPath, 'utf-8');

      // Check if API routes have proper authentication
      const hasAuthCheck =
        /Authorization.*header|auth.*token|verifyAdminAccess|verifyCreatorAccess/.test(
          content,
        );
      const isAuthenticatedRoute = /marketplace|commission|financial/.test(
        file,
      );

      if (isAuthenticatedRoute && !hasAuthCheck) {
        issues.push({
          type: 'critical',
          category: 'Missing Authentication',
          file: file,
          description:
            'API route lacks proper authentication checks. All marketplace/commission/financial endpoints should verify user authentication.',
        });
      }

      // Check for proper role-based access control
      const hasRoleCheck = /role.*admin|role.*creator|profile\.role/.test(
        content,
      );
      const requiresRoleCheck = /admin|creator|earnings|payout/.test(file);

      if (requiresRoleCheck && hasAuthCheck && !hasRoleCheck) {
        issues.push({
          type: 'high',
          category: 'Missing Authorization',
          file: file,
          description:
            'API route has authentication but lacks proper role-based authorization checks.',
        });
      }
    } catch (error) {
      // File doesn't exist or can't be read - skip
    }
  }

  return issues;
}

function findLineNumber(content: string, searchTerm: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchTerm)) {
      return i + 1;
    }
  }
  return 1;
}

function printSecurityReport(result: ValidationResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('🔒 WS-109 COMMISSION SYSTEM SECURITY VALIDATION REPORT');
  console.log('='.repeat(80));

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Files Scanned: ${result.summary.total_files_scanned}`);
  console.log(`   Critical Issues: ${result.summary.critical_issues} 🔴`);
  console.log(`   High Issues: ${result.summary.high_issues} 🟡`);
  console.log(`   Medium Issues: ${result.summary.medium_issues} 🟠`);
  console.log(`   Low Issues: ${result.summary.low_issues} 🔵`);

  if (result.passed) {
    console.log(`\n✅ SECURITY VALIDATION: PASSED`);
    console.log('   No critical or high-severity security issues detected.');
  } else {
    console.log(`\n❌ SECURITY VALIDATION: FAILED`);
    console.log(
      '   Critical or high-severity security issues require immediate attention.',
    );
  }

  if (result.issues.length > 0) {
    console.log(`\n🔍 DETAILED ISSUES:\n`);

    result.issues.forEach((issue, index) => {
      const icon = {
        critical: '🔴',
        high: '🟡',
        medium: '🟠',
        low: '🔵',
      }[issue.type];

      console.log(
        `${index + 1}. ${icon} ${issue.type.toUpperCase()} - ${issue.category}`,
      );
      console.log(
        `   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`,
      );
      console.log(`   Description: ${issue.description}`);
      if (issue.code_snippet) {
        console.log(`   Code: ${issue.code_snippet}`);
      }
      console.log('');
    });
  }

  console.log('='.repeat(80));

  // Security recommendations
  console.log('\n🛡️  SECURITY RECOMMENDATIONS:\n');
  console.log('1. Ensure all API endpoints have proper authentication');
  console.log('2. Use parameterized queries to prevent SQL injection');
  console.log(
    '3. Implement role-based access control for sensitive operations',
  );
  console.log('4. Use Decimal.js for all financial calculations');
  console.log('5. Sanitize all user inputs before processing');
  console.log('6. Never log sensitive information (passwords, tokens, etc.)');
  console.log('7. Validate all input data types and ranges');
  console.log('8. Use HTTPS for all production communications');
  console.log('9. Implement rate limiting for API endpoints');
  console.log('10. Regular security audits and dependency updates\n');
}

// =====================================================================================
// MAIN EXECUTION
// =====================================================================================

async function main() {
  try {
    const result = await runSecurityValidation();
    printSecurityReport(result);

    // Exit with appropriate code
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Security validation failed with error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { runSecurityValidation };
export type { ValidationResult, SecurityIssue };
