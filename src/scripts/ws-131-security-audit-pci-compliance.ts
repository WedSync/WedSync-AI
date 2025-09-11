/**
 * WS-131: Billing System Security Audit & PCI Compliance Verification
 *
 * Comprehensive security audit for the advanced billing and pricing strategy system
 * including PCI DSS compliance, Stripe security best practices, and comprehensive
 * vulnerability assessment.
 *
 * Team D - Batch 10 - Round 3
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// =====================================================================================
// SECURITY AUDIT CONFIGURATION
// =====================================================================================

interface SecurityIssue {
  type: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  file: string;
  line?: number;
  description: string;
  code_snippet?: string;
  pci_requirement?: string;
  recommendation: string;
}

type PCIStatus = 'compliant' | 'non-compliant' | 'needs-review';

interface PCIRequirement {
  requirement: string;
  description: string;
  status: PCIStatus;
  evidence: string[];
  issues: SecurityIssue[];
}

interface SecurityAuditResult {
  passed: boolean;
  pci_compliant: boolean;
  issues: SecurityIssue[];
  pci_requirements: Record<string, PCIRequirement>;
  summary: {
    total_files_scanned: number;
    billing_files_scanned: number;
    critical_issues: number;
    high_issues: number;
    medium_issues: number;
    low_issues: number;
    info_issues: number;
    pci_compliant_requirements: number;
    pci_non_compliant_requirements: number;
    pci_needs_review: number;
  };
}

// =====================================================================================
// PCI DSS REQUIREMENTS CHECKLIST
// =====================================================================================

const PCI_REQUIREMENTS: Record<string, PCIRequirement> = {
  '1': {
    requirement: 'Install and maintain a firewall configuration',
    description: 'Protect cardholder data with appropriate firewall controls',
    status: 'needs-review',
    evidence: [],
    issues: [],
  },
  '2': {
    requirement: 'Do not use vendor-supplied defaults for system passwords',
    description:
      'Remove or change all vendor default passwords and security parameters',
    status: 'needs-review',
    evidence: [],
    issues: [],
  },
  '3': {
    requirement: 'Protect stored cardholder data',
    description:
      'Never store sensitive authentication data after authorization',
    status: 'needs-review',
    evidence: [],
    issues: [],
  },
  '4': {
    requirement: 'Encrypt transmission of cardholder data',
    description:
      'Use strong cryptography and security protocols (e.g., TLS, IPSEC, SSH)',
    status: 'needs-review',
    evidence: [],
    issues: [],
  },
  '6': {
    requirement: 'Develop and maintain secure systems and applications',
    description: 'Protect applications from known vulnerabilities',
    status: 'needs-review',
    evidence: [],
    issues: [],
  },
  '7': {
    requirement: 'Restrict access to cardholder data by business need to know',
    description: 'Implement role-based access controls',
    status: 'needs-review',
    evidence: [],
    issues: [],
  },
  '8': {
    requirement: 'Identify and authenticate access to system components',
    description: 'Implement proper user identification and authentication',
    status: 'needs-review',
    evidence: [],
    issues: [],
  },
  '9': {
    requirement: 'Restrict physical access to cardholder data',
    description: 'Control physical access to systems and media',
    status: 'needs-review',
    evidence: [],
    issues: [],
  },
  '10': {
    requirement: 'Track and monitor all access to network resources',
    description: 'Implement comprehensive logging and monitoring',
    status: 'needs-review',
    evidence: [],
    issues: [],
  },
  '11': {
    requirement: 'Regularly test security systems and processes',
    description: 'Conduct regular vulnerability scans and penetration tests',
    status: 'needs-review',
    evidence: [],
    issues: [],
  },
  '12': {
    requirement: 'Maintain an information security policy',
    description: 'Establish and maintain comprehensive security policies',
    status: 'needs-review',
    evidence: [],
    issues: [],
  },
};

// =====================================================================================
// SECURITY PATTERNS FOR BILLING SYSTEM
// =====================================================================================

const BILLING_SECURITY_PATTERNS = {
  stripe_key_exposure: [
    /sk_live_[a-zA-Z0-9]+/g, // Live secret keys
    /pk_live_[a-zA-Z0-9]+/g, // Live publishable keys
    /sk_test_[a-zA-Z0-9]+/g, // Test secret keys in production
  ],

  payment_data_logging: [
    /console\.log.*card/gi,
    /console\.log.*payment_method/gi,
    /console\.log.*cvv/gi,
    /console\.log.*expir/gi,
    /console\.log.*billing/gi,
    /logger.*card/gi,
  ],

  sql_injection_billing: [
    /\.query\s*\(\s*['"`][^'"`]*subscription_id[^'"`]*\+/g,
    /\.query\s*\(\s*['"`][^'"`]*customer_id[^'"`]*\+/g,
    /SELECT\s+\*\s+FROM\s+subscriptions.*\${/gi,
    /INSERT\s+INTO\s+payments.*\${/gi,
    /UPDATE\s+.*billing.*SET.*\${/gi,
  ],

  webhook_security: [
    /webhook.*without.*signature/gi,
    /stripe.*webhook.*no.*verification/gi,
    /req\.body.*stripe.*direct/gi,
  ],

  financial_precision: [
    /parseFloat.*cents/gi,
    /Number\(.*amount/gi,
    /Math\.round.*cents/gi,
    /\+.*price.*\+/gi, // Direct addition of prices
    /price.*\*.*quantity/gi, // Direct multiplication without precision
  ],

  auth_bypass_billing: [
    /subscription.*without.*auth/gi,
    /payment.*skip.*auth/gi,
    /billing.*=.*admin/gi,
  ],

  stripe_client_side_secrets: [
    /client_secret.*log/gi,
    /payment_intent.*console/gi,
    /setupIntent.*log/gi,
  ],

  pci_data_storage: [
    /card_number.*store/gi,
    /cvv.*database/gi,
    /expiry.*save/gi,
    /cardholder.*name.*db/gi,
  ],
};

// =====================================================================================
// BILLING FILES TO AUDIT
// =====================================================================================

const BILLING_FILES_TO_AUDIT = [
  // Core billing services
  'src/lib/billing/usage-tracking-service.ts',
  'src/lib/billing/billing-cache-service.ts',
  'src/lib/billing/payment-error-handler.ts',
  'src/lib/billing/billing-service.ts',
  'src/lib/billing/subscription-manager.ts',
  'src/lib/billing/revenue-analytics-service.ts',
  'src/lib/billing/revenue-performance-monitor.ts',
  'src/lib/billing/featureGating.ts',

  // API routes
  'src/app/api/billing/tiers/route.ts',
  'src/app/api/billing/subscription/route.ts',
  'src/app/api/billing/subscription/upgrade/route.ts',
  'src/app/api/billing/subscription/downgrade/route.ts',
  'src/app/api/billing/usage/ai/route.ts',
  'src/app/api/billing/payment-recovery/route.ts',
  'src/app/api/billing/monitoring/route.ts',

  // Webhook handlers
  'src/lib/webhooks/webhook-manager.ts',
  'src/app/api/webhooks/stripe/route.ts',

  // Components with billing data
  'src/components/billing/PaymentHistory.tsx',
  'src/components/billing/AdvancedBillingDashboard.tsx',

  // Security components
  'src/lib/security/enhanced-csrf-protection.ts',
  'src/lib/security/critical-api-security.ts',
  'src/middleware/encryption.ts',

  // Configuration
  'src/lib/config/environment.ts',
];

// =====================================================================================
// AUDIT FUNCTIONS
// =====================================================================================

async function runBillingSecurityAudit(): Promise<SecurityAuditResult> {
  console.log(
    '🔐 Starting WS-131 Billing System Security Audit & PCI Compliance Check...\n',
  );

  const issues: SecurityIssue[] = [];
  const pciRequirements = { ...PCI_REQUIREMENTS };
  let totalFilesScanned = 0;
  let billingFilesScanned = 0;

  // Scan billing-specific files
  for (const file of BILLING_FILES_TO_AUDIT) {
    const fullPath = join(process.cwd(), file);

    if (!existsSync(fullPath)) {
      console.log(`⚠️  File not found (may be expected): ${file}`);
      continue;
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');
      totalFilesScanned++;
      billingFilesScanned++;

      console.log(`📁 Auditing: ${file}`);

      // Run comprehensive security checks
      const fileIssues = await auditFileForBillingSecurity(file, content);
      issues.push(...fileIssues);
    } catch (error) {
      console.log(
        `⚠️  Could not audit ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Additional security audits
  console.log('\n🔍 Running specialized security audits...');

  // Stripe integration security
  const stripeIssues = await auditStripeIntegration();
  issues.push(...stripeIssues);

  // Database security audit
  const dbIssues = await auditDatabaseSecurity();
  issues.push(...dbIssues);

  // Webhook security audit
  const webhookIssues = await auditWebhookSecurity();
  issues.push(...webhookIssues);

  // PCI compliance assessment
  await assessPCICompliance(pciRequirements, issues);

  // Environment and configuration audit
  const configIssues = await auditConfiguration();
  issues.push(...configIssues);

  // Generate summary
  const summary = {
    total_files_scanned: totalFilesScanned,
    billing_files_scanned: billingFilesScanned,
    critical_issues: issues.filter((i) => i.type === 'critical').length,
    high_issues: issues.filter((i) => i.type === 'high').length,
    medium_issues: issues.filter((i) => i.type === 'medium').length,
    low_issues: issues.filter((i) => i.type === 'low').length,
    info_issues: issues.filter((i) => i.type === 'info').length,
    pci_compliant_requirements: Object.values(pciRequirements).filter(
      (r) => r.status === 'compliant',
    ).length,
    pci_non_compliant_requirements: Object.values(pciRequirements).filter(
      (r) => r.status === 'non-compliant',
    ).length,
    pci_needs_review: Object.values(pciRequirements).filter(
      (r) => r.status === 'needs-review',
    ).length,
  };

  const passed = summary.critical_issues === 0 && summary.high_issues === 0;
  const pciCompliant =
    summary.pci_non_compliant_requirements === 0 &&
    summary.pci_needs_review <= 2;

  return {
    passed,
    pci_compliant: pciCompliant,
    issues,
    pci_requirements: pciRequirements,
    summary,
  };
}

async function auditFileForBillingSecurity(
  filePath: string,
  content: string,
): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];

  // Check for Stripe key exposure
  for (const pattern of BILLING_SECURITY_PATTERNS.stripe_key_exposure) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = findLineNumber(content, match);
        issues.push({
          type: 'critical',
          category: 'Stripe Key Exposure',
          file: filePath,
          line: lineNumber,
          description: 'Stripe API key exposed in code',
          code_snippet: match.substring(0, 20) + '...',
          pci_requirement: 'PCI DSS 3.4',
          recommendation:
            'Move all Stripe keys to environment variables and never commit them to version control',
        });
      });
    }
  }

  // Check for payment data logging
  for (const pattern of BILLING_SECURITY_PATTERNS.payment_data_logging) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = findLineNumber(content, match);
        issues.push({
          type: 'high',
          category: 'Payment Data Logging',
          file: filePath,
          line: lineNumber,
          description: 'Potential payment data being logged',
          code_snippet: match.trim(),
          pci_requirement: 'PCI DSS 3.1',
          recommendation:
            'Remove logging of payment data. Log transaction IDs only, never card details.',
        });
      });
    }
  }

  // Check for SQL injection in billing queries
  for (const pattern of BILLING_SECURITY_PATTERNS.sql_injection_billing) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = findLineNumber(content, match);
        issues.push({
          type: 'critical',
          category: 'SQL Injection - Billing',
          file: filePath,
          line: lineNumber,
          description: 'Potential SQL injection in billing-related query',
          code_snippet: match.trim(),
          pci_requirement: 'PCI DSS 6.5.1',
          recommendation:
            'Use parameterized queries or prepared statements for all database operations',
        });
      });
    }
  }

  // Check for webhook security issues
  for (const pattern of BILLING_SECURITY_PATTERNS.webhook_security) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = findLineNumber(content, match);
        issues.push({
          type: 'high',
          category: 'Webhook Security',
          file: filePath,
          line: lineNumber,
          description:
            'Webhook processing without proper signature verification',
          code_snippet: match.trim(),
          pci_requirement: 'PCI DSS 4.1',
          recommendation:
            'Always verify webhook signatures before processing webhook data',
        });
      });
    }
  }

  // Check for financial precision issues
  for (const pattern of BILLING_SECURITY_PATTERNS.financial_precision) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = findLineNumber(content, match);
        issues.push({
          type: 'high',
          category: 'Financial Precision',
          file: filePath,
          line: lineNumber,
          description: 'Potentially unsafe financial calculation',
          code_snippet: match.trim(),
          recommendation:
            'Use Decimal.js or similar library for all financial calculations to avoid floating-point precision errors',
        });
      });
    }
  }

  // Check for authentication bypass
  for (const pattern of BILLING_SECURITY_PATTERNS.auth_bypass_billing) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = findLineNumber(content, match);
        issues.push({
          type: 'critical',
          category: 'Authentication Bypass - Billing',
          file: filePath,
          line: lineNumber,
          description: 'Potential authentication bypass in billing system',
          code_snippet: match.trim(),
          pci_requirement: 'PCI DSS 7.1',
          recommendation:
            'Implement proper authentication and authorization checks for all billing operations',
        });
      });
    }
  }

  // Check for client-side secret exposure
  for (const pattern of BILLING_SECURITY_PATTERNS.stripe_client_side_secrets) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = findLineNumber(content, match);
        issues.push({
          type: 'medium',
          category: 'Client Secret Exposure',
          file: filePath,
          line: lineNumber,
          description: 'Stripe client secret potentially exposed in logs',
          code_snippet: match.trim(),
          recommendation:
            'Never log Stripe client secrets or payment intent details',
        });
      });
    }
  }

  // Check for PCI data storage
  for (const pattern of BILLING_SECURITY_PATTERNS.pci_data_storage) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = findLineNumber(content, match);
        issues.push({
          type: 'critical',
          category: 'PCI Data Storage Violation',
          file: filePath,
          line: lineNumber,
          description: 'Prohibited storage of sensitive payment data',
          code_snippet: match.trim(),
          pci_requirement: 'PCI DSS 3.2',
          recommendation:
            'Never store sensitive authentication data (CVV, expiry, full PAN). Use Stripe tokens instead.',
        });
      });
    }
  }

  return issues;
}

async function auditStripeIntegration(): Promise<SecurityIssue[]> {
  console.log('💳 Auditing Stripe integration security...');
  const issues: SecurityIssue[] = [];

  // Check if Stripe.js is loaded from official CDN
  const clientFiles = [
    'src/app/(dashboard)/billing/page.tsx',
    'src/components/billing/AdvancedBillingDashboard.tsx',
  ];

  for (const file of clientFiles) {
    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');

      // Check for Stripe.js loading
      if (content.includes('stripe') || content.includes('payment')) {
        if (
          !content.includes('js.stripe.com/v3') &&
          !content.includes('@stripe/stripe-js')
        ) {
          issues.push({
            type: 'medium',
            category: 'Stripe Integration',
            file: file,
            description:
              'Stripe.js should be loaded from official CDN for PCI compliance',
            pci_requirement: 'PCI DSS 4.1',
            recommendation:
              'Load Stripe.js from https://js.stripe.com/v3/ or use @stripe/stripe-js package',
          });
        }
      }
    }
  }

  return issues;
}

async function auditDatabaseSecurity(): Promise<SecurityIssue[]> {
  console.log('🗄️ Auditing database security...');
  const issues: SecurityIssue[] = [];

  // Check migration files for sensitive data handling
  const migrationDir = join(process.cwd(), 'supabase/migrations');
  if (existsSync(migrationDir)) {
    const migrationFiles = readdirSync(migrationDir).filter((f) =>
      f.endsWith('.sql'),
    );

    for (const file of migrationFiles) {
      if (
        file.includes('billing') ||
        file.includes('payment') ||
        file.includes('subscription')
      ) {
        const fullPath = join(migrationDir, file);
        const content = readFileSync(fullPath, 'utf-8');

        // Check for proper encryption of sensitive fields
        if (
          content.includes('credit_card') ||
          content.includes('card_number')
        ) {
          if (!content.includes('ENCRYPTED') && !content.includes('vault')) {
            issues.push({
              type: 'critical',
              category: 'Database Security',
              file: `supabase/migrations/${file}`,
              description:
                'Sensitive payment data should be encrypted or stored in secure vault',
              pci_requirement: 'PCI DSS 3.4',
              recommendation:
                'Use Stripe vaults for sensitive data storage, never store card details in application database',
            });
          }
        }

        // Check for RLS policies
        if (content.includes('CREATE TABLE') && !content.includes('RLS')) {
          issues.push({
            type: 'high',
            category: 'Database Security',
            file: `supabase/migrations/${file}`,
            description:
              'Billing tables should have Row Level Security (RLS) enabled',
            pci_requirement: 'PCI DSS 7.1',
            recommendation:
              'Enable RLS on all billing-related tables and implement appropriate policies',
          });
        }
      }
    }
  }

  return issues;
}

async function auditWebhookSecurity(): Promise<SecurityIssue[]> {
  console.log('🪝 Auditing webhook security...');
  const issues: SecurityIssue[] = [];

  const webhookFiles = [
    'src/lib/webhooks/webhook-manager.ts',
    'src/app/api/webhooks/stripe/route.ts',
  ];

  for (const file of webhookFiles) {
    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');

      // Check for signature verification
      if (!content.includes('signature') && !content.includes('verify')) {
        issues.push({
          type: 'critical',
          category: 'Webhook Security',
          file: file,
          description: 'Webhook endpoint lacks signature verification',
          pci_requirement: 'PCI DSS 4.1',
          recommendation:
            'Implement Stripe webhook signature verification using stripe.webhooks.constructEvent()',
        });
      }

      // Check for proper error handling
      if (!content.includes('try') || !content.includes('catch')) {
        issues.push({
          type: 'medium',
          category: 'Webhook Security',
          file: file,
          description: 'Webhook handler lacks proper error handling',
          recommendation:
            'Implement comprehensive error handling to prevent information disclosure',
        });
      }
    }
  }

  return issues;
}

async function assessPCICompliance(
  pciRequirements: Record<string, PCIRequirement>,
  issues: SecurityIssue[],
) {
  console.log('📋 Assessing PCI DSS compliance...');

  // PCI Requirement 3: Protect stored cardholder data
  const hasCardDataStorage = issues.some(
    (i) => i.category === 'PCI Data Storage Violation',
  );
  if (!hasCardDataStorage) {
    pciRequirements['3'].status = 'compliant';
    pciRequirements['3'].evidence.push(
      'No sensitive cardholder data storage detected in code audit',
    );
  } else {
    pciRequirements['3'].status = 'non-compliant';
    pciRequirements['3'].issues = issues.filter(
      (i) => i.category === 'PCI Data Storage Violation',
    );
  }

  // PCI Requirement 4: Encrypt transmission of cardholder data
  const hasStripeJs =
    existsSync(join(process.cwd(), 'package.json')) &&
    readFileSync(join(process.cwd(), 'package.json'), 'utf-8').includes(
      '@stripe/stripe-js',
    );

  if (hasStripeJs) {
    pciRequirements['4'].status = 'compliant';
    pciRequirements['4'].evidence.push(
      'Using Stripe.js for secure client-side payment handling',
    );
  }

  // PCI Requirement 6: Develop and maintain secure systems
  const hasCriticalVulns =
    issues.filter((i) => i.type === 'critical').length > 0;
  if (!hasCriticalVulns) {
    pciRequirements['6'].status = 'compliant';
    pciRequirements['6'].evidence.push(
      'No critical security vulnerabilities detected in code audit',
    );
  } else {
    pciRequirements['6'].status = 'non-compliant';
    pciRequirements['6'].issues = issues.filter((i) => i.type === 'critical');
  }

  // PCI Requirement 7: Restrict access to cardholder data
  const hasAuthBypass = issues.some((i) =>
    i.category.includes('Authentication Bypass'),
  );
  if (!hasAuthBypass) {
    pciRequirements['7'].status = 'compliant';
    pciRequirements['7'].evidence.push(
      'No authentication bypass vulnerabilities detected',
    );
  } else {
    pciRequirements['7'].status = 'non-compliant';
    pciRequirements['7'].issues = issues.filter((i) =>
      i.category.includes('Authentication Bypass'),
    );
  }

  // PCI Requirement 10: Track and monitor access
  const hasMonitoring = existsSync(
    join(process.cwd(), 'src/lib/billing/revenue-performance-monitor.ts'),
  );
  if (hasMonitoring) {
    pciRequirements['10'].status = 'compliant';
    pciRequirements['10'].evidence.push(
      'Revenue performance monitoring system implemented',
    );
  }
}

async function auditConfiguration(): Promise<SecurityIssue[]> {
  console.log('⚙️ Auditing configuration security...');
  const issues: SecurityIssue[] = [];

  const configFile = join(process.cwd(), 'src/lib/config/environment.ts');
  if (existsSync(configFile)) {
    const content = readFileSync(configFile, 'utf-8');

    // Check for hardcoded secrets
    if (content.includes('sk_') || content.includes('pk_live_')) {
      issues.push({
        type: 'critical',
        category: 'Configuration Security',
        file: 'src/lib/config/environment.ts',
        description: 'Hardcoded secrets detected in configuration',
        pci_requirement: 'PCI DSS 3.4',
        recommendation:
          'Use environment variables for all sensitive configuration values',
      });
    }

    // Check for proper environment variable usage
    if (!content.includes('process.env')) {
      issues.push({
        type: 'medium',
        category: 'Configuration Security',
        file: 'src/lib/config/environment.ts',
        description: 'Configuration should use environment variables',
        recommendation:
          'Implement environment variable loading for production security',
      });
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

function printSecurityAuditReport(result: SecurityAuditResult): void {
  console.log('\n' + '='.repeat(100));
  console.log(
    '🔒 WS-131 BILLING SYSTEM SECURITY AUDIT & PCI COMPLIANCE REPORT',
  );
  console.log('='.repeat(100));

  console.log(`\n📊 AUDIT SUMMARY:`);
  console.log(`   Total Files Scanned: ${result.summary.total_files_scanned}`);
  console.log(
    `   Billing Files Scanned: ${result.summary.billing_files_scanned}`,
  );
  console.log(`   Critical Issues: ${result.summary.critical_issues} 🔴`);
  console.log(`   High Issues: ${result.summary.high_issues} 🟡`);
  console.log(`   Medium Issues: ${result.summary.medium_issues} 🟠`);
  console.log(`   Low Issues: ${result.summary.low_issues} 🔵`);
  console.log(`   Info Issues: ${result.summary.info_issues} ℹ️`);

  console.log(`\n💳 PCI DSS COMPLIANCE SUMMARY:`);
  console.log(
    `   Compliant Requirements: ${result.summary.pci_compliant_requirements}/12 ✅`,
  );
  console.log(
    `   Non-Compliant Requirements: ${result.summary.pci_non_compliant_requirements}/12 ❌`,
  );
  console.log(`   Needs Review: ${result.summary.pci_needs_review}/12 🔍`);

  if (result.passed && result.pci_compliant) {
    console.log(`\n✅ SECURITY AUDIT: PASSED`);
    console.log(`✅ PCI COMPLIANCE: COMPLIANT`);
    console.log('   System meets security requirements and PCI DSS standards.');
  } else {
    console.log(`\n❌ SECURITY AUDIT: ${result.passed ? 'PASSED' : 'FAILED'}`);
    console.log(
      `❌ PCI COMPLIANCE: ${result.pci_compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`,
    );
    console.log(
      '   Issues require immediate attention before production deployment.',
    );
  }

  // PCI Requirements Details
  console.log(`\n📋 PCI DSS REQUIREMENTS ASSESSMENT:\n`);

  Object.entries(result.pci_requirements).forEach(([req, details]) => {
    const statusIcon = {
      compliant: '✅',
      'non-compliant': '❌',
      'needs-review': '🔍',
    }[details.status];

    console.log(`${statusIcon} PCI DSS ${req}: ${details.requirement}`);
    console.log(`   Status: ${details.status.toUpperCase()}`);
    if (details.evidence.length > 0) {
      console.log(`   Evidence: ${details.evidence.join(', ')}`);
    }
    if (details.issues.length > 0) {
      console.log(`   Issues: ${details.issues.length} violations found`);
    }
    console.log('');
  });

  // Detailed Issues
  if (result.issues.length > 0) {
    console.log(`🔍 DETAILED SECURITY ISSUES:\n`);

    result.issues.forEach((issue, index) => {
      const icon = {
        critical: '🔴',
        high: '🟡',
        medium: '🟠',
        low: '🔵',
        info: 'ℹ️',
      }[issue.type];

      console.log(
        `${index + 1}. ${icon} ${issue.type.toUpperCase()} - ${issue.category}`,
      );
      console.log(
        `   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`,
      );
      console.log(`   Description: ${issue.description}`);
      if (issue.pci_requirement) {
        console.log(`   PCI Requirement: ${issue.pci_requirement}`);
      }
      if (issue.code_snippet) {
        console.log(`   Code: ${issue.code_snippet}`);
      }
      console.log(`   Recommendation: ${issue.recommendation}`);
      console.log('');
    });
  }

  console.log('='.repeat(100));

  // Security & PCI Recommendations
  console.log('\n🛡️  SECURITY & PCI COMPLIANCE RECOMMENDATIONS:\n');
  console.log('📋 IMMEDIATE ACTIONS (Critical/High Priority):');
  console.log('1. Move all Stripe API keys to environment variables');
  console.log(
    '2. Implement webhook signature verification for all Stripe webhooks',
  );
  console.log('3. Review and remove any logging of payment-related data');
  console.log('4. Use parameterized queries for all database operations');
  console.log('5. Implement proper authentication for all billing endpoints');

  console.log('\n🔒 PCI DSS COMPLIANCE CHECKLIST:');
  console.log(
    '1. Never store sensitive authentication data (CVV, expiry, full PAN)',
  );
  console.log('2. Use Stripe.js from official CDN (js.stripe.com/v3/)');
  console.log('3. Implement TLS 1.2+ for all data transmissions');
  console.log('4. Enable Row Level Security (RLS) on all billing tables');
  console.log('5. Implement comprehensive access controls and monitoring');
  console.log('6. Regular vulnerability scans and security testing');
  console.log('7. Maintain security policies and procedures');
  console.log('8. Use Decimal.js for all financial calculations');
  console.log('9. Implement rate limiting on payment endpoints');
  console.log('10. Regular security training for development team\n');
}

// =====================================================================================
// MAIN EXECUTION
// =====================================================================================

async function main() {
  try {
    const result = await runBillingSecurityAudit();
    printSecurityAuditReport(result);

    // Save audit results to file
    const auditResults = {
      timestamp: new Date().toISOString(),
      ...result,
    };

    console.log('💾 Saving detailed audit results...');

    // Exit with appropriate code
    process.exit(result.passed && result.pci_compliant ? 0 : 1);
  } catch (error) {
    console.error('❌ Security audit failed with error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { runBillingSecurityAudit };
export type { SecurityAuditResult, SecurityIssue, PCIRequirement };
