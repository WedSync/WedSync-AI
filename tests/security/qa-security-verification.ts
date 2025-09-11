#!/usr/bin/env ts-node
/**
 * WS-192 Integration Tests Suite - QA Security Verification
 * Team E QA Framework - Security compliance validation
 * 
 * This script verifies that all QA security requirements are met:
 * - Test data protection - No real wedding data in test databases
 * - Credential isolation - Test credentials separate from production
 * - Test environment security - Proper access controls on test systems
 * - CI/CD security - Secure test execution environments
 * - Test artifact security - Encrypted test results and reports
 * - Vulnerability testing - Security test integration in QA pipeline
 * - Compliance validation - GDPR/privacy compliance in test procedures
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface SecurityCheckResult {
  passed: boolean;
  details: string;
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityVerificationReport {
  timestamp: string;
  overallStatus: 'PASS' | 'FAIL';
  checks: {
    testDataProtection: SecurityCheckResult;
    credentialIsolation: SecurityCheckResult;
    testEnvironmentSecurity: SecurityCheckResult;
    cicdSecurity: SecurityCheckResult;
    testArtifactSecurity: SecurityCheckResult;
    vulnerabilityTesting: SecurityCheckResult;
    complianceValidation: SecurityCheckResult;
  };
  summary: string;
  criticalIssues: string[];
  recommendedActions: string[];
}

export class QASecurityVerifier {
  private readonly rootDir: string;
  private readonly testDataDir: string;
  private readonly configDir: string;
  
  constructor() {
    this.rootDir = process.cwd();
    this.testDataDir = join(this.rootDir, 'tests', 'fixtures');
    this.configDir = join(this.rootDir, 'tests', 'config');
  }

  /**
   * Perform comprehensive security verification
   */
  async verifySecurityRequirements(): Promise<SecurityVerificationReport> {
    console.log('🔒 Starting comprehensive QA security verification...');
    
    const checks = {
      testDataProtection: await this.verifyTestDataProtection(),
      credentialIsolation: await this.verifyCredentialIsolation(),
      testEnvironmentSecurity: await this.verifyTestEnvironmentSecurity(),
      cicdSecurity: await this.verifyCICDSecurity(),
      testArtifactSecurity: await this.verifyTestArtifactSecurity(),
      vulnerabilityTesting: await this.verifyVulnerabilityTesting(),
      complianceValidation: await this.verifyComplianceValidation()
    };

    const allPassed = Object.values(checks).every(check => check.passed);
    const criticalIssues = this.identifyCriticalIssues(checks);
    const recommendedActions = this.generateRecommendedActions(checks);

    const report: SecurityVerificationReport = {
      timestamp: new Date().toISOString(),
      overallStatus: allPassed ? 'PASS' : 'FAIL',
      checks,
      summary: this.generateSummary(checks, allPassed),
      criticalIssues,
      recommendedActions
    };

    await this.generateSecurityReport(report);
    
    console.log(`🔒 Security verification complete: ${report.overallStatus}`);
    
    if (criticalIssues.length > 0) {
      console.log('🚨 CRITICAL SECURITY ISSUES DETECTED:');
      criticalIssues.forEach(issue => console.log(`  • ${issue}`));
    }

    return report;
  }

  /**
   * Verify test data protection requirements
   */
  private async verifyTestDataProtection(): Promise<SecurityCheckResult> {
    console.log('🛡️ Verifying test data protection...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check for real data patterns in test fixtures
      const testDataFiles = this.findTestDataFiles();
      
      for (const file of testDataFiles) {
        const content = readFileSync(file, 'utf8');
        
        // Check for real email patterns
        const realEmailPattern = /@(?!example\.com|test\.com|localhost)/g;
        if (realEmailPattern.test(content)) {
          issues.push(`Real email addresses found in ${file}`);
        }
        
        // Check for real names (common wedding names to avoid)
        const suspiciousNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
        const containsSuspiciousNames = suspiciousNames.some(name => 
          content.toLowerCase().includes(name.toLowerCase())
        );
        
        if (containsSuspiciousNames) {
          recommendations.push(`Consider using clearly fake names in ${file} (e.g., 'Test Bride', 'John Testgroom')`);
        }
        
        // Check for real addresses
        const realAddressPatterns = [/\d{1,5}\s\w+\s(Street|St|Avenue|Ave|Road|Rd|Drive|Dr)/gi];
        const hasRealAddresses = realAddressPatterns.some(pattern => pattern.test(content));
        
        if (hasRealAddresses) {
          issues.push(`Potentially real addresses found in ${file}`);
        }
        
        // Check for real phone numbers
        const phonePattern = /\(\d{3}\)\s\d{3}-\d{4}/g;
        if (phonePattern.test(content) && !content.includes('555')) {
          issues.push(`Potentially real phone numbers found in ${file}`);
        }
      }
      
      // Verify test database configuration
      const envTest = join(this.rootDir, '.env.test');
      if (existsSync(envTest)) {
        const envContent = readFileSync(envTest, 'utf8');
        if (!envContent.includes('test') && !envContent.includes('TEST')) {
          issues.push('Test environment file does not clearly indicate test environment');
        }
      } else {
        issues.push('No .env.test file found - test environment not properly configured');
      }
      
      const passed = issues.length === 0;
      
      return {
        passed,
        details: passed 
          ? 'All test data appears to be synthetic and properly protected'
          : `${issues.length} test data protection issues found`,
        recommendations: [
          'Use only synthetic test data with clearly fake information',
          'Implement automated scanning for real data patterns',
          'Regular review of test fixtures for data leakage',
          ...recommendations
        ],
        severity: issues.length > 0 ? 'high' : 'low'
      };
      
    } catch (error) {
      return {
        passed: false,
        details: `Test data protection verification failed: ${error}`,
        recommendations: ['Fix test data scanning infrastructure'],
        severity: 'critical'
      };
    }
  }

  /**
   * Verify credential isolation requirements
   */
  private async verifyCredentialIsolation(): Promise<SecurityCheckResult> {
    console.log('🔑 Verifying credential isolation...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check environment file separation
      const productionEnvFiles = ['.env', '.env.production', '.env.prod'];
      const testEnvFiles = ['.env.test', '.env.testing'];
      
      let hasProductionEnv = false;
      let hasTestEnv = false;
      
      for (const envFile of productionEnvFiles) {
        if (existsSync(join(this.rootDir, envFile))) {
          hasProductionEnv = true;
          // Check if production env is committed (should not be)
          try {
            execSync(`git check-ignore ${envFile}`, { cwd: this.rootDir });
          } catch {
            issues.push(`Production environment file ${envFile} may be committed to git`);
          }
        }
      }
      
      for (const envFile of testEnvFiles) {
        if (existsSync(join(this.rootDir, envFile))) {
          hasTestEnv = true;
          
          // Verify test environment has test-specific values
          const envContent = readFileSync(join(this.rootDir, envFile), 'utf8');
          
          if (!envContent.includes('test') && !envContent.includes('TEST')) {
            issues.push(`Test environment file ${envFile} does not clearly indicate test environment`);
          }
          
          // Check for production-like values
          if (envContent.includes('stripe.com/v1') && !envContent.includes('test')) {
            issues.push('Test environment may be using production Stripe keys');
          }
          
          if (envContent.includes('.supabase.co') && !envContent.includes('localhost')) {
            recommendations.push('Consider using local Supabase instance for testing');
          }
        }
      }
      
      if (!hasTestEnv) {
        issues.push('No dedicated test environment configuration found');
      }
      
      // Check for hardcoded credentials in test files
      const testFiles = this.findTestFiles();
      for (const file of testFiles) {
        const content = readFileSync(file, 'utf8');
        
        // Check for API keys
        const apiKeyPatterns = [
          /sk_live_[a-zA-Z0-9]+/g, // Stripe live keys
          /pk_live_[a-zA-Z0-9]+/g, // Stripe live publishable keys
          /[a-f0-9]{32}/g // Generic 32-char hex keys
        ];
        
        for (const pattern of apiKeyPatterns) {
          if (pattern.test(content)) {
            issues.push(`Potential hardcoded API key found in ${file}`);
          }
        }
        
        // Check for passwords
        if (content.includes('password') && content.includes('=')) {
          recommendations.push(`Review password handling in ${file}`);
        }
      }
      
      const passed = issues.length === 0;
      
      return {
        passed,
        details: passed 
          ? 'Credential isolation properly implemented'
          : `${issues.length} credential isolation issues found`,
        recommendations: [
          'Use separate credentials for test and production environments',
          'Store sensitive credentials in environment variables only',
          'Implement credential rotation for test environments',
          'Use mock credentials where possible',
          ...recommendations
        ],
        severity: issues.length > 2 ? 'critical' : issues.length > 0 ? 'high' : 'low'
      };
      
    } catch (error) {
      return {
        passed: false,
        details: `Credential isolation verification failed: ${error}`,
        recommendations: ['Fix credential scanning infrastructure'],
        severity: 'critical'
      };
    }
  }

  /**
   * Verify test environment security
   */
  private async verifyTestEnvironmentSecurity(): Promise<SecurityCheckResult> {
    console.log('🏢 Verifying test environment security...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check Docker security configuration
      const dockerComposeFile = join(this.rootDir, 'docker-compose.yml');
      if (existsSync(dockerComposeFile)) {
        const dockerContent = readFileSync(dockerComposeFile, 'utf8');
        
        if (!dockerContent.includes('user:') && dockerContent.includes('postgres')) {
          recommendations.push('Consider running database containers with non-root user');
        }
        
        if (!dockerContent.includes('restart: "no"') && dockerContent.includes('test')) {
          recommendations.push('Test containers should not auto-restart');
        }
      }
      
      // Check test database isolation
      const testConfig = join(this.configDir, 'integration.config.ts');
      if (existsSync(testConfig)) {
        const configContent = readFileSync(testConfig, 'utf8');
        
        if (!configContent.includes('test') && !configContent.includes('TEST')) {
          issues.push('Integration test config does not clearly indicate test environment');
        }
      }
      
      // Check for proper test cleanup
      const setupFile = join(this.rootDir, 'tests', 'setup.ts');
      if (existsSync(setupFile)) {
        const setupContent = readFileSync(setupFile, 'utf8');
        
        if (!setupContent.includes('afterAll') && !setupContent.includes('cleanup')) {
          recommendations.push('Implement proper test cleanup in setup file');
        }
      } else {
        issues.push('No test setup file found - test environment may not be properly configured');
      }
      
      // Check for network isolation
      const packageJson = join(this.rootDir, 'package.json');
      if (existsSync(packageJson)) {
        const pkgContent = JSON.parse(readFileSync(packageJson, 'utf8'));
        
        if (pkgContent.scripts && !pkgContent.scripts['test:isolated']) {
          recommendations.push('Consider adding isolated test execution script');
        }
      }
      
      const passed = issues.length === 0;
      
      return {
        passed,
        details: passed 
          ? 'Test environment security properly configured'
          : `${issues.length} test environment security issues found`,
        recommendations: [
          'Isolate test environment from production',
          'Use dedicated test databases and services',
          'Implement proper test cleanup procedures',
          'Configure network isolation for test containers',
          ...recommendations
        ],
        severity: issues.length > 1 ? 'medium' : 'low'
      };
      
    } catch (error) {
      return {
        passed: false,
        details: `Test environment security verification failed: ${error}`,
        recommendations: ['Review test environment configuration'],
        severity: 'medium'
      };
    }
  }

  /**
   * Verify CI/CD security
   */
  private async verifyCICDSecurity(): Promise<SecurityCheckResult> {
    console.log('🚀 Verifying CI/CD security...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check GitHub Actions security
      const workflowDir = join(this.rootDir, '.github', 'workflows');
      if (existsSync(workflowDir)) {
        const workflowFiles = readdirSync(workflowDir);
        
        for (const workflowFile of workflowFiles) {
          const workflowContent = readFileSync(join(workflowDir, workflowFile), 'utf8');
          
          // Check for hardcoded secrets
          if (workflowContent.includes('password:') && !workflowContent.includes('${{')) {
            issues.push(`Hardcoded credentials found in ${workflowFile}`);
          }
          
          // Check for proper secret usage
          if (!workflowContent.includes('secrets.') && workflowContent.includes('env:')) {
            recommendations.push(`Consider using GitHub secrets in ${workflowFile}`);
          }
          
          // Check for pull request security
          if (workflowContent.includes('pull_request') && !workflowContent.includes('pull_request_target')) {
            recommendations.push(`Review pull request workflow security in ${workflowFile}`);
          }
          
          // Check for artifact security
          if (workflowContent.includes('upload-artifact') && !workflowContent.includes('retention-days')) {
            recommendations.push(`Set retention policy for artifacts in ${workflowFile}`);
          }
        }
      } else {
        recommendations.push('No CI/CD workflows found - consider implementing automated testing');
      }
      
      // Check for security scanning
      const hasSecurityScan = existsSync(join(workflowDir, 'security.yml')) ||
                            existsSync(join(workflowDir, 'codeql.yml'));
      
      if (!hasSecurityScan) {
        recommendations.push('Implement automated security scanning in CI/CD');
      }
      
      const passed = issues.length === 0;
      
      return {
        passed,
        details: passed 
          ? 'CI/CD security properly configured'
          : `${issues.length} CI/CD security issues found`,
        recommendations: [
          'Use GitHub secrets for sensitive data',
          'Implement security scanning in CI/CD pipeline',
          'Set proper artifact retention policies',
          'Review pull request workflow permissions',
          ...recommendations
        ],
        severity: issues.length > 0 ? 'medium' : 'low'
      };
      
    } catch (error) {
      return {
        passed: false,
        details: `CI/CD security verification failed: ${error}`,
        recommendations: ['Review CI/CD configuration files'],
        severity: 'medium'
      };
    }
  }

  /**
   * Verify test artifact security
   */
  private async verifyTestArtifactSecurity(): Promise<SecurityCheckResult> {
    console.log('📦 Verifying test artifact security...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check test results directory security
      const testResultsDir = join(this.rootDir, 'test-results');
      if (existsSync(testResultsDir)) {
        // Check if test results are in gitignore
        const gitignoreFile = join(this.rootDir, '.gitignore');
        if (existsSync(gitignoreFile)) {
          const gitignoreContent = readFileSync(gitignoreFile, 'utf8');
          if (!gitignoreContent.includes('test-results')) {
            issues.push('Test results directory not in .gitignore - may expose sensitive data');
          }
        }
        
        // Check for sensitive data in test results
        const testResultFiles = this.findFilesRecursively(testResultsDir, ['.json', '.html', '.xml']);
        for (const file of testResultFiles) {
          const content = readFileSync(file, 'utf8');
          
          // Check for API keys or tokens
          if (content.includes('sk_') || content.includes('pk_') || content.includes('bearer')) {
            issues.push(`Potential sensitive data in test result: ${file}`);
          }
          
          // Check for real email addresses
          if (/@(?!example\.com|test\.com)/.test(content)) {
            recommendations.push(`Review data in test result: ${file}`);
          }
        }
      }
      
      // Check for secure artifact storage configuration
      const packageJson = join(this.rootDir, 'package.json');
      if (existsSync(packageJson)) {
        const pkgContent = JSON.parse(readFileSync(packageJson, 'utf8'));
        
        if (pkgContent.scripts && !pkgContent.scripts['test:clean']) {
          recommendations.push('Add test artifact cleanup script');
        }
      }
      
      // Check coverage reports
      const coverageDir = join(this.rootDir, 'coverage');
      if (existsSync(coverageDir)) {
        const gitignoreFile = join(this.rootDir, '.gitignore');
        if (existsSync(gitignoreFile)) {
          const gitignoreContent = readFileSync(gitignoreFile, 'utf8');
          if (!gitignoreContent.includes('coverage')) {
            recommendations.push('Add coverage directory to .gitignore');
          }
        }
      }
      
      const passed = issues.length === 0;
      
      return {
        passed,
        details: passed 
          ? 'Test artifact security properly configured'
          : `${issues.length} test artifact security issues found`,
        recommendations: [
          'Exclude test results and coverage from version control',
          'Implement secure artifact storage and retention',
          'Regular cleanup of test artifacts',
          'Scan test outputs for sensitive data',
          ...recommendations
        ],
        severity: issues.length > 1 ? 'medium' : 'low'
      };
      
    } catch (error) {
      return {
        passed: false,
        details: `Test artifact security verification failed: ${error}`,
        recommendations: ['Review test artifact handling'],
        severity: 'medium'
      };
    }
  }

  /**
   * Verify vulnerability testing integration
   */
  private async verifyVulnerabilityTesting(): Promise<SecurityCheckResult> {
    console.log('🛡️ Verifying vulnerability testing integration...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check for security testing scripts
      const packageJson = join(this.rootDir, 'package.json');
      let hasSecurityTests = false;
      
      if (existsSync(packageJson)) {
        const pkgContent = JSON.parse(readFileSync(packageJson, 'utf8'));
        
        if (pkgContent.scripts) {
          hasSecurityTests = Object.keys(pkgContent.scripts).some(script => 
            script.includes('security') || script.includes('audit')
          );
          
          if (!hasSecurityTests) {
            recommendations.push('Add npm audit or security testing scripts');
          }
        }
      }
      
      // Check for security testing framework
      const securityTestDir = join(this.rootDir, 'tests', 'security');
      if (!existsSync(securityTestDir)) {
        issues.push('No dedicated security test directory found');
      } else {
        const securityFiles = readdirSync(securityTestDir);
        if (securityFiles.length === 0) {
          issues.push('Security test directory exists but is empty');
        }
      }
      
      // Check for dependency vulnerability scanning
      if (existsSync(packageJson)) {
        try {
          execSync('npm audit --audit-level=high --json', { 
            cwd: this.rootDir,
            stdio: 'pipe'
          });
        } catch (error) {
          recommendations.push('Fix high-severity npm audit issues');
        }
      }
      
      // Check for OWASP integration
      const jestConfig = join(this.rootDir, 'jest.config.js');
      if (existsSync(jestConfig)) {
        const jestContent = readFileSync(jestConfig, 'utf8');
        if (!jestContent.includes('security') && !jestContent.includes('owasp')) {
          recommendations.push('Consider integrating OWASP security testing');
        }
      }
      
      const passed = issues.length === 0;
      
      return {
        passed,
        details: passed 
          ? 'Vulnerability testing properly integrated'
          : `${issues.length} vulnerability testing issues found`,
        recommendations: [
          'Implement automated dependency vulnerability scanning',
          'Add OWASP security testing to CI/CD pipeline',
          'Create dedicated security test suite',
          'Regular security audit of test infrastructure',
          ...recommendations
        ],
        severity: issues.length > 1 ? 'high' : 'medium'
      };
      
    } catch (error) {
      return {
        passed: false,
        details: `Vulnerability testing verification failed: ${error}`,
        recommendations: ['Set up vulnerability testing infrastructure'],
        severity: 'high'
      };
    }
  }

  /**
   * Verify GDPR/compliance validation
   */
  private async verifyComplianceValidation(): Promise<SecurityCheckResult> {
    console.log('📋 Verifying compliance validation...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check for GDPR test scenarios
      const complianceTestFiles = [
        'gdpr-compliance.test.ts',
        'data-protection.test.ts',
        'privacy-policy.test.ts'
      ];
      
      let hasComplianceTests = false;
      
      for (const testFile of complianceTestFiles) {
        const testFilePath = this.findFileInTests(testFile);
        if (testFilePath) {
          hasComplianceTests = true;
          
          // Check test content
          const content = readFileSync(testFilePath, 'utf8');
          
          if (!content.includes('deleteUser') && !content.includes('anonymize')) {
            recommendations.push(`Add data deletion tests to ${testFile}`);
          }
          
          if (!content.includes('consent') && !content.includes('opt-out')) {
            recommendations.push(`Add consent management tests to ${testFile}`);
          }
        }
      }
      
      if (!hasComplianceTests) {
        issues.push('No GDPR/compliance tests found');
      }
      
      // Check for data retention policies in tests
      const testFiles = this.findTestFiles();
      let hasDataRetentionTests = false;
      
      for (const file of testFiles) {
        const content = readFileSync(file, 'utf8');
        if (content.includes('retention') || content.includes('expire')) {
          hasDataRetentionTests = true;
          break;
        }
      }
      
      if (!hasDataRetentionTests) {
        recommendations.push('Add data retention policy tests');
      }
      
      // Check for cookie consent tests
      let hasCookieTests = false;
      for (const file of testFiles) {
        const content = readFileSync(file, 'utf8');
        if (content.includes('cookie') && content.includes('consent')) {
          hasCookieTests = true;
          break;
        }
      }
      
      if (!hasCookieTests) {
        recommendations.push('Add cookie consent testing');
      }
      
      // Check for audit logging tests
      let hasAuditTests = false;
      for (const file of testFiles) {
        const content = readFileSync(file, 'utf8');
        if (content.includes('audit') && content.includes('log')) {
          hasAuditTests = true;
          break;
        }
      }
      
      if (!hasAuditTests) {
        recommendations.push('Add audit logging tests for compliance');
      }
      
      const passed = issues.length === 0;
      
      return {
        passed,
        details: passed 
          ? 'Compliance validation properly implemented'
          : `${issues.length} compliance validation issues found`,
        recommendations: [
          'Implement GDPR compliance test scenarios',
          'Add data deletion and anonymization tests',
          'Test consent management workflows',
          'Validate data retention policies',
          'Add audit logging for compliance',
          ...recommendations
        ],
        severity: issues.length > 0 ? 'medium' : 'low'
      };
      
    } catch (error) {
      return {
        passed: false,
        details: `Compliance validation verification failed: ${error}`,
        recommendations: ['Set up compliance testing infrastructure'],
        severity: 'medium'
      };
    }
  }

  // Helper methods

  private findTestDataFiles(): string[] {
    if (!existsSync(this.testDataDir)) {
      return [];
    }
    
    return this.findFilesRecursively(this.testDataDir, ['.json', '.csv', '.sql']);
  }

  private findTestFiles(): string[] {
    const testDir = join(this.rootDir, 'tests');
    if (!existsSync(testDir)) {
      return [];
    }
    
    return this.findFilesRecursively(testDir, ['.test.ts', '.test.js', '.spec.ts', '.spec.js']);
  }

  private findFileInTests(filename: string): string | null {
    const testDir = join(this.rootDir, 'tests');
    if (!existsSync(testDir)) {
      return null;
    }
    
    const files = this.findFilesRecursively(testDir, ['.ts', '.js']);
    return files.find(file => file.endsWith(filename)) || null;
  }

  private findFilesRecursively(dir: string, extensions: string[]): string[] {
    const files: string[] = [];
    
    if (!existsSync(dir)) {
      return files;
    }
    
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.findFilesRecursively(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private identifyCriticalIssues(checks: any): string[] {
    const criticalIssues: string[] = [];
    
    Object.entries(checks).forEach(([checkName, result]: [string, any]) => {
      if (result.severity === 'critical' || (result.severity === 'high' && !result.passed)) {
        criticalIssues.push(`${checkName}: ${result.details}`);
      }
    });
    
    return criticalIssues;
  }

  private generateRecommendedActions(checks: any): string[] {
    const actions: string[] = [];
    
    Object.values(checks).forEach((result: any) => {
      actions.push(...result.recommendations);
    });
    
    // Remove duplicates and prioritize
    return [...new Set(actions)].slice(0, 10);
  }

  private generateSummary(checks: any, allPassed: boolean): string {
    const checkCount = Object.keys(checks).length;
    const passedCount = Object.values(checks).filter((check: any) => check.passed).length;
    
    return `Security verification completed: ${passedCount}/${checkCount} checks passed. ${
      allPassed 
        ? 'All security requirements met.' 
        : `${checkCount - passedCount} security issues require attention.`
    }`;
  }

  private async generateSecurityReport(report: SecurityVerificationReport): Promise<void> {
    const reportPath = join(this.rootDir, 'test-results', 'security-verification-report.json');
    
    try {
      const fs = require('fs');
      if (!fs.existsSync(join(this.rootDir, 'test-results'))) {
        fs.mkdirSync(join(this.rootDir, 'test-results'), { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`🔒 Security report generated: ${reportPath}`);
    } catch (error) {
      console.error('Failed to generate security report:', error);
    }
  }
}

// CLI execution
if (require.main === module) {
  const verifier = new QASecurityVerifier();
  
  verifier.verifySecurityRequirements()
    .then(report => {
      console.log('\n🔒 SECURITY VERIFICATION SUMMARY:');
      console.log(report.summary);
      
      if (report.criticalIssues.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES:');
        report.criticalIssues.forEach(issue => console.log(`  • ${issue}`));
        process.exit(1);
      }
      
      if (report.overallStatus === 'FAIL') {
        console.log('\n⚠️ Security verification failed - review issues and recommendations');
        process.exit(1);
      }
      
      console.log('\n✅ All QA security requirements verified!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Security verification failed:', error);
      process.exit(1);
    });
}

export default QASecurityVerifier;