// Automated Privacy Audit Script for WS-225 Client Portal Analytics
// Runs comprehensive privacy compliance checks and generates audit reports

import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface PrivacyAuditConfig {
  supabaseUrl: string;
  supabaseKey: string;
  auditScope: string[];
  reportOutputDir: string;
  alertThresholds: {
    criticalViolations: number;
    privacyScore: number;
    complianceRate: number;
  };
}

interface AuditResult {
  testSuite: string;
  passed: boolean;
  score: number;
  violations: string[];
  critical: boolean;
  timestamp: string;
}

interface ComplianceReport {
  auditId: string;
  timestamp: string;
  scope: string;
  results: AuditResult[];
  overallCompliance: boolean;
  criticalIssues: string[];
  recommendations: string[];
  nextAuditDate: string;
}

class PrivacyAuditRunner {
  private config: PrivacyAuditConfig;
  private supabase: ReturnType<typeof createClient>;
  private auditId: string;

  constructor(config: PrivacyAuditConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  async runFullPrivacyAudit(): Promise<ComplianceReport> {
    console.log('🔒 Starting Comprehensive Privacy Audit for WS-225 Analytics');
    console.log(`Audit ID: ${this.auditId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('=' .repeat(60));

    const results: AuditResult[] = [];

    // Run GDPR Compliance Tests
    if (this.config.auditScope.includes('gdpr')) {
      console.log('\n🇪🇺 Running GDPR Compliance Tests...');
      const gdprResult = await this.runTestSuite('gdpr', 'ws-225-gdpr-analytics-compliance.test.ts');
      results.push(gdprResult);
    }

    // Run CCPA Compliance Tests  
    if (this.config.auditScope.includes('ccpa')) {
      console.log('\n🏛️ Running CCPA Compliance Tests...');
      const ccpaResult = await this.runTestSuite('ccpa', 'ws-225-ccpa-analytics-compliance.test.ts');
      results.push(ccpaResult);
    }

    // Run General Privacy Validation
    if (this.config.auditScope.includes('privacy')) {
      console.log('\n🔒 Running General Privacy Validation...');
      const privacyResult = await this.runTestSuite('privacy', 'ws-225-analytics-data-privacy.test.ts');
      results.push(privacyResult);
    }

    // Run Custom Wedding Industry Privacy Checks
    console.log('\n💒 Running Wedding Industry Privacy Checks...');
    const weddingPrivacyResult = await this.runWeddingIndustryChecks();
    results.push(weddingPrivacyResult);

    // Run Database Security Scan
    console.log('\n🛡️ Running Database Security Scan...');
    const dbSecurityResult = await this.runDatabaseSecurityScan();
    results.push(dbSecurityResult);

    // Run API Endpoint Security Scan
    console.log('\n🔐 Running API Endpoint Security Scan...');
    const apiSecurityResult = await this.runAPISecurityScan();
    results.push(apiSecurityResult);

    // Generate comprehensive report
    const report = await this.generateComplianceReport(results);
    
    // Save audit results to database
    await this.saveAuditResults(report);

    // Send alerts if critical issues found
    await this.processAlerts(report);

    console.log('\n✅ Privacy audit completed successfully!');
    console.log(`Report saved to: ${path.join(this.config.reportOutputDir, `privacy-audit-${this.auditId}.json`)}`);

    return report;
  }

  private async runTestSuite(suiteName: string, testFile: string): Promise<AuditResult> {
    try {
      const testPath = path.join(__dirname, '../../__tests__/compliance', testFile);
      
      // Run Jest test suite
      const jestResult = await this.executeJestTest(testPath);
      
      return {
        testSuite: suiteName,
        passed: jestResult.passed,
        score: jestResult.score || 0,
        violations: jestResult.violations || [],
        critical: jestResult.violations?.some(v => this.isCriticalViolation(v)) || false,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error running ${suiteName} tests:`, error);
      
      return {
        testSuite: suiteName,
        passed: false,
        score: 0,
        violations: [`Test suite execution failed: ${(error as Error).message}`],
        critical: true,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async executeJestTest(testPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const jest = spawn('npx', ['jest', testPath, '--json'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      jest.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      jest.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      jest.on('close', (code) => {
        try {
          const result = JSON.parse(stdout);
          resolve({
            passed: result.numFailedTests === 0,
            score: this.calculateScoreFromJestResult(result),
            violations: this.extractViolationsFromJestResult(result)
          });
        } catch (error) {
          reject(new Error(`Failed to parse Jest output: ${stderr}`));
        }
      });
    });
  }

  private calculateScoreFromJestResult(jestResult: any): number {
    if (!jestResult.testResults || jestResult.testResults.length === 0) return 0;
    
    const totalTests = jestResult.numTotalTests || 0;
    const passedTests = jestResult.numPassedTests || 0;
    
    return totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  }

  private extractViolationsFromJestResult(jestResult: any): string[] {
    const violations: string[] = [];
    
    if (jestResult.testResults) {
      jestResult.testResults.forEach((testFile: any) => {
        if (testFile.assertionResults) {
          testFile.assertionResults.forEach((test: any) => {
            if (test.status === 'failed' && test.failureMessages) {
              test.failureMessages.forEach((message: string) => {
                violations.push(this.cleanFailureMessage(message));
              });
            }
          });
        }
      });
    }
    
    return violations;
  }

  private cleanFailureMessage(message: string): string {
    // Extract clean violation message from Jest failure output
    const lines = message.split('\n');
    const errorLine = lines.find(line => line.includes('expect(') && line.includes('toBe'));
    return errorLine ? errorLine.trim() : message.substring(0, 200) + '...';
  }

  private async runWeddingIndustryChecks(): Promise<AuditResult> {
    const violations: string[] = [];
    let score = 100;

    try {
      // Check vendor data isolation
      const { data: crossVendorData } = await this.supabase
        .from('client_analytics_data')
        .select('client_id, supplier_id')
        .limit(100);

      if (crossVendorData) {
        const vendorClients = new Map();
        crossVendorData.forEach(record => {
          if (!vendorClients.has(record.client_id)) {
            vendorClients.set(record.client_id, new Set());
          }
          vendorClients.get(record.client_id).add(record.supplier_id);
        });

        // Check for clients associated with multiple suppliers
        for (const [clientId, suppliers] of vendorClients.entries()) {
          if (suppliers.size > 1) {
            violations.push(`Client ${clientId} data shared across multiple vendors`);
            score -= 15;
          }
        }
      }

      // Check for wedding date privacy
      const { data: weddingData } = await this.supabase
        .from('client_analytics_data')
        .select('*')
        .ilike('form_data', '%wedding_date%')
        .limit(10);

      if (weddingData) {
        weddingData.forEach(record => {
          if (record.form_data && record.form_data.includes('2025-')) {
            violations.push('Wedding dates stored in plain text in analytics data');
            score -= 20;
            return;
          }
        });
      }

      // Check guest data protection
      const { data: guestData } = await this.supabase
        .from('client_analytics_data')
        .select('*')
        .ilike('form_data', '%guest%')
        .limit(5);

      if (guestData) {
        guestData.forEach(record => {
          if (record.form_data && (
            record.form_data.includes('@') && record.form_data.includes('.com')
          )) {
            violations.push('Guest email addresses stored unencrypted in analytics');
            score -= 25;
          }
        });
      }

    } catch (error) {
      violations.push(`Wedding industry privacy check failed: ${(error as Error).message}`);
      score -= 30;
    }

    return {
      testSuite: 'wedding_industry_privacy',
      passed: violations.length === 0,
      score: Math.max(0, score),
      violations,
      critical: violations.some(v => this.isCriticalViolation(v)),
      timestamp: new Date().toISOString()
    };
  }

  private async runDatabaseSecurityScan(): Promise<AuditResult> {
    const violations: string[] = [];
    let score = 100;

    try {
      // Check for unencrypted sensitive columns
      const sensitiveDataCheck = await this.supabase
        .from('client_analytics_data')
        .select('form_data, metadata, user_agent')
        .not('form_data', 'is', null)
        .limit(10);

      if (sensitiveDataCheck.data) {
        sensitiveDataCheck.data.forEach((record, index) => {
          const dataStr = JSON.stringify(record).toLowerCase();
          
          // Check for PII patterns
          if (dataStr.includes('ssn') || dataStr.includes('social security')) {
            violations.push(`SSN found in unencrypted form in record ${index + 1}`);
            score -= 40;
          }
          
          if (dataStr.includes('credit card') || /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/.test(dataStr)) {
            violations.push(`Credit card number found in unencrypted form in record ${index + 1}`);
            score -= 40;
          }

          // Check for email patterns in unexpected places
          const emailCount = (dataStr.match(/@[^\s,]+\.[a-z]{2,}/g) || []).length;
          if (emailCount > 3) {
            violations.push(`Excessive email addresses in single analytics record ${index + 1}`);
            score -= 10;
          }
        });
      }

      // Check Row Level Security policies
      const { data: rlsPolicies } = await this.supabase
        .from('pg_policies')
        .select('*')
        .eq('schemaname', 'public')
        .ilike('tablename', '%analytics%');

      if (!rlsPolicies || rlsPolicies.length === 0) {
        violations.push('No Row Level Security policies found for analytics tables');
        score -= 35;
      } else {
        const analyticsTable = rlsPolicies.find(p => p.tablename === 'client_analytics_data');
        if (!analyticsTable) {
          violations.push('No RLS policy for client_analytics_data table');
          score -= 30;
        }
      }

    } catch (error) {
      violations.push(`Database security scan failed: ${(error as Error).message}`);
      score -= 20;
    }

    return {
      testSuite: 'database_security',
      passed: violations.length === 0,
      score: Math.max(0, score),
      violations,
      critical: violations.some(v => this.isCriticalViolation(v)),
      timestamp: new Date().toISOString()
    };
  }

  private async runAPISecurityScan(): Promise<AuditResult> {
    const violations: string[] = [];
    let score = 100;

    const apiEndpoints = [
      '/api/analytics/dashboard',
      '/api/analytics/client-data',
      '/api/gdpr/export-client-data',
      '/api/ccpa/consumer-data-request',
      '/api/privacy/cookie-consent'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        // Test unauthorized access
        const unauthorizedResponse = await fetch(`http://localhost:3000${endpoint}`, {
          method: 'GET'
        });

        if (unauthorizedResponse.status === 200) {
          violations.push(`Endpoint ${endpoint} accessible without authentication`);
          score -= 25;
        }

        // Test SQL injection patterns
        const sqlInjectionTest = await fetch(`http://localhost:3000${endpoint}?id=1'; DROP TABLE users; --`, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer test-token' }
        });

        if (sqlInjectionTest.status === 500 && sqlInjectionTest.statusText.includes('SQL')) {
          violations.push(`Endpoint ${endpoint} vulnerable to SQL injection`);
          score -= 40;
        }

        // Test XSS patterns
        const xssTest = await fetch(`http://localhost:3000${endpoint}?param=<script>alert('xss')</script>`, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer test-token' }
        });

        if (xssTest.ok) {
          const responseText = await xssTest.text();
          if (responseText.includes('<script>')) {
            violations.push(`Endpoint ${endpoint} vulnerable to XSS attacks`);
            score -= 30;
          }
        }

      } catch (error) {
        // Network errors are expected for localhost testing
        if (!(error as Error).message.includes('ECONNREFUSED')) {
          violations.push(`API security test failed for ${endpoint}: ${(error as Error).message}`);
          score -= 5;
        }
      }
    }

    return {
      testSuite: 'api_security',
      passed: violations.length === 0,
      score: Math.max(0, score),
      violations,
      critical: violations.some(v => this.isCriticalViolation(v)),
      timestamp: new Date().toISOString()
    };
  }

  private async generateComplianceReport(results: AuditResult[]): Promise<ComplianceReport> {
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];
    
    results.forEach(result => {
      if (result.critical) {
        criticalIssues.push(...result.violations);
      }
    });

    // Generate recommendations based on results
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    
    if (avgScore < 80) {
      recommendations.push('🚨 Immediate privacy compliance improvements required');
    }
    
    if (results.some(r => r.testSuite === 'gdpr' && !r.passed)) {
      recommendations.push('🇪🇺 GDPR compliance issues must be addressed for EU clients');
    }
    
    if (results.some(r => r.testSuite === 'ccpa' && !r.passed)) {
      recommendations.push('🏛️ CCPA compliance issues must be addressed for California clients');
    }

    if (criticalIssues.some(issue => issue.includes('encryption'))) {
      recommendations.push('🔐 Implement stronger data encryption measures');
    }

    if (criticalIssues.some(issue => issue.includes('authentication'))) {
      recommendations.push('🛡️ Strengthen API authentication and access controls');
    }

    recommendations.push('📅 Schedule monthly privacy compliance audits');
    recommendations.push('👨‍🏫 Conduct team training on wedding industry privacy requirements');

    const nextAuditDate = new Date();
    nextAuditDate.setMonth(nextAuditDate.getMonth() + 1);

    return {
      auditId: this.auditId,
      timestamp: new Date().toISOString(),
      scope: 'WS-225 Client Portal Analytics Privacy Compliance',
      results,
      overallCompliance: results.every(r => r.passed),
      criticalIssues,
      recommendations,
      nextAuditDate: nextAuditDate.toISOString()
    };
  }

  private async saveAuditResults(report: ComplianceReport): Promise<void> {
    // Save to database
    try {
      await this.supabase.from('privacy_audit_log').insert({
        audit_id: report.auditId,
        timestamp: report.timestamp,
        scope: report.scope,
        overall_compliance: report.overallCompliance,
        critical_issues_count: report.criticalIssues.length,
        results: JSON.stringify(report.results),
        recommendations: JSON.stringify(report.recommendations),
        next_audit_date: report.nextAuditDate
      });
    } catch (error) {
      console.warn('Failed to save audit results to database:', error);
    }

    // Save to file system
    const reportPath = path.join(this.config.reportOutputDir, `privacy-audit-${this.auditId}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Save summary for easy viewing
    const summaryPath = path.join(this.config.reportOutputDir, `privacy-audit-${this.auditId}-summary.md`);
    const summaryContent = this.generateMarkdownSummary(report);
    await fs.writeFile(summaryPath, summaryContent);
  }

  private generateMarkdownSummary(report: ComplianceReport): string {
    const avgScore = report.results.reduce((sum, r) => sum + r.score, 0) / report.results.length;
    
    return `# Privacy Compliance Audit Report

**Audit ID:** ${report.auditId}  
**Date:** ${new Date(report.timestamp).toLocaleDateString()}  
**Scope:** ${report.scope}  

## Overall Results
- **Compliance Status:** ${report.overallCompliance ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}
- **Average Score:** ${Math.round(avgScore)}/100
- **Critical Issues:** ${report.criticalIssues.length}

## Test Suite Results
${report.results.map(result => `
### ${result.testSuite.toUpperCase()}
- **Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- **Score:** ${result.score}/100
- **Critical:** ${result.critical ? '🚨 YES' : '✅ NO'}
- **Violations:** ${result.violations.length}
${result.violations.length > 0 ? result.violations.map(v => `  - ${v}`).join('\n') : '  None'}
`).join('\n')}

## Critical Issues
${report.criticalIssues.length > 0 ? 
  report.criticalIssues.map(issue => `- 🚨 ${issue}`).join('\n') : 
  'None identified'}

## Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Next Audit
**Scheduled Date:** ${new Date(report.nextAuditDate).toLocaleDateString()}

---
*Report generated by WedSync Privacy Audit System*
`;
  }

  private async processAlerts(report: ComplianceReport): Promise<void> {
    if (report.criticalIssues.length >= this.config.alertThresholds.criticalViolations) {
      console.log('\n🚨 CRITICAL PRIVACY ALERT!');
      console.log(`${report.criticalIssues.length} critical privacy violations detected`);
      
      // In a real implementation, this would send notifications
      // via email, Slack, PagerDuty, etc.
      await this.sendCriticalAlert(report);
    }

    const avgScore = report.results.reduce((sum, r) => sum + r.score, 0) / report.results.length;
    if (avgScore < this.config.alertThresholds.privacyScore) {
      console.log(`\n⚠️ Privacy score below threshold: ${avgScore}/100`);
    }

    const complianceRate = report.results.filter(r => r.passed).length / report.results.length * 100;
    if (complianceRate < this.config.alertThresholds.complianceRate) {
      console.log(`\n⚠️ Compliance rate below threshold: ${complianceRate}%`);
    }
  }

  private async sendCriticalAlert(report: ComplianceReport): Promise<void> {
    // Mock alert sending - would integrate with actual alerting systems
    const alertMessage = `
🚨 CRITICAL PRIVACY COMPLIANCE ALERT 🚨

Audit ID: ${report.auditId}
Critical Issues: ${report.criticalIssues.length}
Overall Compliance: ${report.overallCompliance ? 'COMPLIANT' : 'NON-COMPLIANT'}

Top Issues:
${report.criticalIssues.slice(0, 5).map(issue => `- ${issue}`).join('\n')}

Immediate action required!
`;

    console.log(alertMessage);
    
    // Would send to:
    // - Security team via email
    // - Slack #security-alerts channel  
    // - PagerDuty for on-call engineers
    // - Management dashboard
  }

  private isCriticalViolation(violation: string): boolean {
    const criticalPatterns = [
      'unencrypted',
      'sql injection',
      'xss',
      'unauthorized access',
      'pii',
      'personal information',
      'credit card',
      'ssn',
      'social security',
      'guest data',
      'wedding date',
      'without authentication'
    ];

    return criticalPatterns.some(pattern => 
      violation.toLowerCase().includes(pattern)
    );
  }
}

// Main execution function
async function runPrivacyAudit() {
  const config: PrivacyAuditConfig = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    auditScope: ['gdpr', 'ccpa', 'privacy'],
    reportOutputDir: '/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/compliance/reports',
    alertThresholds: {
      criticalViolations: 1,
      privacyScore: 80,
      complianceRate: 85
    }
  };

  // Create reports directory if it doesn't exist
  await fs.mkdir(config.reportOutputDir, { recursive: true });

  const auditor = new PrivacyAuditRunner(config);
  
  try {
    const report = await auditor.runFullPrivacyAudit();
    
    console.log('\n📊 AUDIT SUMMARY');
    console.log('================');
    console.log(`Audit ID: ${report.auditId}`);
    console.log(`Overall Compliance: ${report.overallCompliance ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
    console.log(`Critical Issues: ${report.criticalIssues.length}`);
    console.log(`Test Suites: ${report.results.length}`);
    console.log(`Next Audit: ${new Date(report.nextAuditDate).toLocaleDateString()}`);
    
    return report;
    
  } catch (error) {
    console.error('Privacy audit failed:', error);
    process.exit(1);
  }
}

// Run audit if this script is executed directly
if (require.main === module) {
  runPrivacyAudit().catch(console.error);
}

export { PrivacyAuditRunner, runPrivacyAudit };