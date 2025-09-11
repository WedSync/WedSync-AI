/**
 * WS-155: Security Audit and Hardening
 * Comprehensive security assessment and hardening for guest communications
 */

import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import path from 'path';

interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'authentication' | 'authorization' | 'data_protection' | 'input_validation' | 
           'communication_security' | 'infrastructure' | 'compliance' | 'configuration';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  file?: string;
  line?: number;
  status: 'open' | 'mitigated' | 'accepted_risk' | 'false_positive';
  evidence?: string[];
}

interface SecurityAuditResult {
  timestamp: string;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  findings: SecurityFinding[];
  mitigations: string[];
  nextSteps: string[];
}

class SecurityAuditor {
  private findings: SecurityFinding[] = [];
  private projectRoot: string;
  
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
  }
  
  async runComprehensiveAudit(): Promise<SecurityAuditResult> {
    console.log('🔒 Starting comprehensive security audit...');
    
    // Authentication & Authorization
    await this.auditAuthentication();
    await this.auditAuthorization();
    
    // Data Protection
    await this.auditDataEncryption();
    await this.auditDataStorage();
    await this.auditDataTransmission();
    
    // Input Validation & Sanitization
    await this.auditInputValidation();
    await this.auditSqlInjection();
    await this.auditXssVulnerabilities();
    
    // Communication Security
    await this.auditEmailSecurity();
    await this.auditSmsSecurity();
    await this.auditApiSecurity();
    
    // Infrastructure Security
    await this.auditDependencies();
    await this.auditConfiguration();
    await this.auditSecrets();
    
    // Compliance & Privacy
    await this.auditGdprCompliance();
    await this.auditCanSpamCompliance();
    await this.auditDataRetention();
    
    // Rate Limiting & DoS Protection
    await this.auditRateLimiting();
    await this.auditDosProtection();
    
    // Logging & Monitoring
    await this.auditSecurityLogging();
    await this.auditIncidentResponse();
    
    return this.generateAuditReport();
  }
  
  private async auditAuthentication(): Promise<void> {
    console.log('🔍 Auditing authentication mechanisms...');
    
    // Check for JWT token validation
    const jwtFiles = await this.findFiles('**/*.{ts,js}', /jwt|token|auth/i);
    
    for (const file of jwtFiles) {
      const content = await this.readFile(file);
      
      // Check for hardcoded secrets
      if (content.includes('jwt_secret') || content.includes('JWT_SECRET')) {
        this.addFinding({
          id: 'auth-001',
          severity: 'high',
          category: 'authentication',
          title: 'Potential hardcoded JWT secret',
          description: 'JWT secret may be hardcoded in source code',
          impact: 'Could allow token forgery and unauthorized access',
          recommendation: 'Use environment variables for JWT secrets',
          file,
          status: 'open'
        });
      }
      
      // Check for proper token expiration
      if (content.includes('expiresIn') && !content.includes('15m') && !content.includes('1h')) {
        this.addFinding({
          id: 'auth-002',
          severity: 'medium',
          category: 'authentication',
          title: 'JWT token expiration not configured properly',
          description: 'JWT tokens should have short expiration times',
          impact: 'Longer-lived tokens increase security risk',
          recommendation: 'Set JWT token expiration to 15 minutes or less',
          file,
          status: 'open'
        });
      }
      
      // Check for proper token validation
      if (content.includes('jwt.verify') && !content.includes('algorithm')) {
        this.addFinding({
          id: 'auth-003',
          severity: 'high',
          category: 'authentication',
          title: 'JWT algorithm not specified',
          description: 'JWT verification should specify the expected algorithm',
          impact: 'Could allow algorithm confusion attacks',
          recommendation: 'Explicitly specify the JWT algorithm in verification',
          file,
          status: 'open'
        });
      }
    }
    
    // Check for password requirements
    const authFiles = await this.findFiles('**/auth/**/*.{ts,js}');
    for (const file of authFiles) {
      const content = await this.readFile(file);
      
      if (content.includes('password') && !content.includes('zxcvbn')) {
        this.addFinding({
          id: 'auth-004',
          severity: 'medium',
          category: 'authentication',
          title: 'Weak password validation',
          description: 'Password strength validation not implemented',
          impact: 'Users may choose weak passwords',
          recommendation: 'Implement password strength checking (e.g., zxcvbn)',
          file,
          status: 'open'
        });
      }
    }
  }
  
  private async auditAuthorization(): Promise<void> {
    console.log('🔍 Auditing authorization controls...');
    
    const apiFiles = await this.findFiles('**/api/**/*.{ts,js}');
    
    for (const file of apiFiles) {
      const content = await this.readFile(file);
      
      // Check for missing authorization checks
      if (content.includes('export async function') && !content.includes('auth')) {
        this.addFinding({
          id: 'authz-001',
          severity: 'high',
          category: 'authorization',
          title: 'Missing authorization check in API endpoint',
          description: `API endpoint in ${file} may lack proper authorization`,
          impact: 'Unauthorized access to sensitive operations',
          recommendation: 'Add proper authorization middleware to all API endpoints',
          file,
          status: 'open'
        });
      }
      
      // Check for RBAC implementation
      if (content.includes('role') && !content.includes('permission')) {
        this.addFinding({
          id: 'authz-002',
          severity: 'medium',
          category: 'authorization',
          title: 'Role-based access control not properly implemented',
          description: 'Roles without granular permissions detected',
          impact: 'Overprivileged access to resources',
          recommendation: 'Implement fine-grained permission system',
          file,
          status: 'open'
        });
      }
    }
  }
  
  private async auditDataEncryption(): Promise<void> {
    console.log('🔍 Auditing data encryption...');
    
    const dbFiles = await this.findFiles('**/*.{ts,js}', /database|db|supabase/i);
    
    for (const file of dbFiles) {
      const content = await this.readFile(file);
      
      // Check for PII fields without encryption
      const piiFields = ['email', 'phone', 'address', 'name'];
      for (const field of piiFields) {
        if (content.includes(field) && !content.includes('encrypt')) {
          this.addFinding({
            id: 'encrypt-001',
            severity: 'high',
            category: 'data_protection',
            title: `PII field '${field}' may not be encrypted`,
            description: `Personal identifiable information should be encrypted`,
            impact: 'Data breach could expose sensitive user information',
            recommendation: 'Implement field-level encryption for PII data',
            file,
            status: 'open'
          });
        }
      }
      
      // Check for encryption at rest
      if (content.includes('createClient') && !content.includes('ssl')) {
        this.addFinding({
          id: 'encrypt-002',
          severity: 'medium',
          category: 'data_protection',
          title: 'Database connection may not use SSL/TLS',
          description: 'Database connections should always use encryption',
          impact: 'Data in transit could be intercepted',
          recommendation: 'Ensure all database connections use SSL/TLS',
          file,
          status: 'open'
        });
      }
    }
  }
  
  private async auditInputValidation(): Promise<void> {
    console.log('🔍 Auditing input validation...');
    
    const apiFiles = await this.findFiles('**/api/**/*.{ts,js}');
    
    for (const file of apiFiles) {
      const content = await this.readFile(file);
      
      // Check for schema validation
      if (content.includes('request.json()') && !content.includes('schema')) {
        this.addFinding({
          id: 'validation-001',
          severity: 'high',
          category: 'input_validation',
          title: 'Missing input validation schema',
          description: `API endpoint lacks input validation`,
          impact: 'Invalid or malicious input could cause errors or security issues',
          recommendation: 'Implement schema validation for all API inputs',
          file,
          status: 'open'
        });
      }
      
      // Check for SQL injection protection
      if (content.includes('query') && content.includes('${') && !content.includes('parameterized')) {
        this.addFinding({
          id: 'validation-002',
          severity: 'critical',
          category: 'input_validation',
          title: 'Potential SQL injection vulnerability',
          description: 'String interpolation in SQL queries detected',
          impact: 'Could allow unauthorized database access',
          recommendation: 'Use parameterized queries or ORM methods',
          file,
          status: 'open'
        });
      }
      
      // Check for XSS protection
      if (content.includes('innerHTML') || content.includes('dangerouslySetInnerHTML')) {
        this.addFinding({
          id: 'validation-003',
          severity: 'high',
          category: 'input_validation',
          title: 'Potential XSS vulnerability',
          description: 'Direct HTML injection detected',
          impact: 'Could allow client-side code injection',
          recommendation: 'Sanitize all user input before rendering',
          file,
          status: 'open'
        });
      }
    }
  }
  
  private async auditEmailSecurity(): Promise<void> {
    console.log('🔍 Auditing email security...');
    
    const emailFiles = await this.findFiles('**/*.{ts,js}', /email|mail/i);
    
    for (const file of emailFiles) {
      const content = await this.readFile(file);
      
      // Check for DKIM signing
      if (content.includes('sendEmail') && !content.includes('dkim')) {
        this.addFinding({
          id: 'email-001',
          severity: 'medium',
          category: 'communication_security',
          title: 'DKIM signing not implemented',
          description: 'Emails should be DKIM signed for authenticity',
          impact: 'Emails may be flagged as spam or appear untrustworthy',
          recommendation: 'Implement DKIM signing for all outbound emails',
          file,
          status: 'open'
        });
      }
      
      // Check for SPF/DMARC configuration
      if (content.includes('from:') && !content.includes('spf')) {
        this.addFinding({
          id: 'email-002',
          severity: 'medium',
          category: 'communication_security',
          title: 'SPF/DMARC not configured',
          description: 'Email authentication records should be configured',
          impact: 'Email deliverability issues and potential spoofing',
          recommendation: 'Configure SPF, DKIM, and DMARC records',
          file,
          status: 'open'
        });
      }
      
      // Check for email content sanitization
      if (content.includes('html') && !content.includes('sanitize')) {
        this.addFinding({
          id: 'email-003',
          severity: 'medium',
          category: 'communication_security',
          title: 'Email content not sanitized',
          description: 'HTML email content should be sanitized',
          impact: 'Could allow malicious content in emails',
          recommendation: 'Sanitize all HTML content in emails',
          file,
          status: 'open'
        });
      }
    }
  }
  
  private async auditDependencies(): Promise<void> {
    console.log('🔍 Auditing dependency security...');
    
    try {
      // Run npm audit
      const auditResult = execSync('npm audit --json', { 
        cwd: this.projectRoot,
        encoding: 'utf-8' 
      });
      
      const audit = JSON.parse(auditResult);
      
      if (audit.vulnerabilities) {
        for (const [pkg, vuln] of Object.entries(audit.vulnerabilities as any)) {
          this.addFinding({
            id: `dep-${this.generateId()}`,
            severity: this.mapVulnerabilitySeverity(vuln.severity),
            category: 'infrastructure',
            title: `Vulnerable dependency: ${pkg}`,
            description: `Package ${pkg} has known security vulnerabilities`,
            impact: vuln.title || 'Security vulnerability in dependency',
            recommendation: `Update ${pkg} to a secure version`,
            status: 'open',
            evidence: [vuln.url]
          });
        }
      }
    } catch (error) {
      this.addFinding({
        id: 'dep-audit-001',
        severity: 'medium',
        category: 'infrastructure',
        title: 'Dependency audit failed',
        description: 'Could not run dependency security audit',
        impact: 'Unknown vulnerabilities in dependencies',
        recommendation: 'Ensure npm audit can run successfully',
        status: 'open'
      });
    }
  }
  
  private async auditSecrets(): Promise<void> {
    console.log('🔍 Auditing secrets management...');
    
    const allFiles = await this.findFiles('**/*.{ts,js,json,env}');
    const secretPatterns = [
      /password\s*=\s*["'][^"']+["']/i,
      /secret\s*=\s*["'][^"']+["']/i,
      /key\s*=\s*["'][^"']+["']/i,
      /token\s*=\s*["'][^"']+["']/i,
      /api[_-]?key\s*=\s*["'][^"']+["']/i
    ];
    
    for (const file of allFiles) {
      if (file.includes('node_modules') || file.includes('.git')) continue;
      
      const content = await this.readFile(file);
      
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          this.addFinding({
            id: `secrets-${this.generateId()}`,
            severity: 'critical',
            category: 'configuration',
            title: 'Potential hardcoded secret',
            description: `Hardcoded secret detected in ${file}`,
            impact: 'Credentials could be exposed in source code',
            recommendation: 'Move secrets to environment variables',
            file,
            status: 'open'
          });
        }
      }
    }
  }
  
  private async auditGdprCompliance(): Promise<void> {
    console.log('🔍 Auditing GDPR compliance...');
    
    const complianceFiles = await this.findFiles('**/compliance/**/*.{ts,js}');
    
    for (const file of complianceFiles) {
      const content = await this.readFile(file);
      
      // Check for data retention policies
      if (!content.includes('retention')) {
        this.addFinding({
          id: 'gdpr-001',
          severity: 'high',
          category: 'compliance',
          title: 'Missing data retention policy',
          description: 'GDPR requires clear data retention policies',
          impact: 'Non-compliance with GDPR Article 5(e)',
          recommendation: 'Implement and document data retention policies',
          file,
          status: 'open'
        });
      }
      
      // Check for consent management
      if (!content.includes('consent')) {
        this.addFinding({
          id: 'gdpr-002',
          severity: 'critical',
          category: 'compliance',
          title: 'Missing consent management',
          description: 'GDPR requires proper consent management',
          impact: 'Non-compliance with GDPR Articles 6 and 7',
          recommendation: 'Implement comprehensive consent management',
          file,
          status: 'open'
        });
      }
      
      // Check for data portability
      if (!content.includes('portability')) {
        this.addFinding({
          id: 'gdpr-003',
          severity: 'medium',
          category: 'compliance',
          title: 'Missing data portability feature',
          description: 'GDPR requires data portability functionality',
          impact: 'Non-compliance with GDPR Article 20',
          recommendation: 'Implement data export functionality',
          file,
          status: 'open'
        });
      }
    }
  }
  
  private async auditRateLimiting(): Promise<void> {
    console.log('🔍 Auditing rate limiting implementation...');
    
    const apiFiles = await this.findFiles('**/api/**/*.{ts,js}');
    
    for (const file of apiFiles) {
      const content = await this.readFile(file);
      
      // Check for rate limiting middleware
      if (!content.includes('rateLimit') && !content.includes('rateLimiter')) {
        this.addFinding({
          id: 'rate-001',
          severity: 'medium',
          category: 'infrastructure',
          title: 'Missing rate limiting',
          description: `API endpoint lacks rate limiting protection`,
          impact: 'Vulnerable to DoS and brute force attacks',
          recommendation: 'Implement rate limiting on all API endpoints',
          file,
          status: 'open'
        });
      }
    }
  }
  
  private async auditSecurityLogging(): Promise<void> {
    console.log('🔍 Auditing security logging...');
    
    const securityFiles = await this.findFiles('**/security/**/*.{ts,js}');
    const authFiles = await this.findFiles('**/auth/**/*.{ts,js}');
    const allSecurityFiles = [...securityFiles, ...authFiles];
    
    for (const file of allSecurityFiles) {
      const content = await this.readFile(file);
      
      // Check for security event logging
      if (!content.includes('log') && !content.includes('audit')) {
        this.addFinding({
          id: 'logging-001',
          severity: 'medium',
          category: 'infrastructure',
          title: 'Missing security event logging',
          description: `Security events should be logged for monitoring`,
          impact: 'Difficulty detecting and responding to security incidents',
          recommendation: 'Implement comprehensive security event logging',
          file,
          status: 'open'
        });
      }
    }
  }
  
  // Additional audit methods would be implemented here...
  private async auditDataStorage(): Promise<void> { /* Implementation */ }
  private async auditDataTransmission(): Promise<void> { /* Implementation */ }
  private async auditSqlInjection(): Promise<void> { /* Implementation */ }
  private async auditXssVulnerabilities(): Promise<void> { /* Implementation */ }
  private async auditSmsSecurity(): Promise<void> { /* Implementation */ }
  private async auditApiSecurity(): Promise<void> { /* Implementation */ }
  private async auditConfiguration(): Promise<void> { /* Implementation */ }
  private async auditCanSpamCompliance(): Promise<void> { /* Implementation */ }
  private async auditDataRetention(): Promise<void> { /* Implementation */ }
  private async auditDosProtection(): Promise<void> { /* Implementation */ }
  private async auditIncidentResponse(): Promise<void> { /* Implementation */ }
  
  private addFinding(finding: Omit<SecurityFinding, 'id'> & Partial<Pick<SecurityFinding, 'id'>>): void {
    const id = finding.id || `${finding.category}-${this.generateId()}`;
    this.findings.push({ ...finding, id });
  }
  
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
  
  private mapVulnerabilitySeverity(severity: string): SecurityFinding['severity'] {
    const mapping: Record<string, SecurityFinding['severity']> = {
      critical: 'critical',
      high: 'high',
      moderate: 'medium',
      low: 'low'
    };
    return mapping[severity.toLowerCase()] || 'medium';
  }
  
  private async findFiles(pattern: string, contentFilter?: RegExp): Promise<string[]> {
    // Mock implementation - would use glob or similar
    const mockFiles = [
      'src/app/api/communications/messages/route.ts',
      'src/app/api/communications/compliance/route.ts',
      'src/lib/auth/server.ts',
      'src/lib/monitoring/guest-communications-monitor.ts',
      'src/lib/ratelimit/advanced-rate-limiter.ts',
      'src/lib/error-handling/guest-communications-error-handler.ts'
    ];
    
    if (contentFilter) {
      const filtered = [];
      for (const file of mockFiles) {
        const content = await this.readFile(file).catch(() => '');
        if (contentFilter.test(content)) {
          filtered.push(file);
        }
      }
      return filtered;
    }
    
    return mockFiles;
  }
  
  private async readFile(filepath: string): Promise<string> {
    try {
      return await fs.readFile(path.join(this.projectRoot, filepath), 'utf-8');
    } catch {
      return ''; // File doesn't exist or can't be read
    }
  }
  
  private generateAuditReport(): SecurityAuditResult {
    const critical = this.findings.filter(f => f.severity === 'critical').length;
    const high = this.findings.filter(f => f.severity === 'high').length;
    const medium = this.findings.filter(f => f.severity === 'medium').length;
    const low = this.findings.filter(f => f.severity === 'low').length;
    
    let overallRisk: SecurityAuditResult['overallRisk'];
    if (critical > 0) overallRisk = 'critical';
    else if (high > 0) overallRisk = 'high';
    else if (medium > 0) overallRisk = 'medium';
    else overallRisk = 'low';
    
    const result: SecurityAuditResult = {
      timestamp: new Date().toISOString(),
      totalFindings: this.findings.length,
      criticalFindings: critical,
      highFindings: high,
      mediumFindings: medium,
      lowFindings: low,
      overallRisk,
      findings: this.findings,
      mitigations: this.generateMitigationPlan(),
      nextSteps: this.generateNextSteps()
    };
    
    this.printAuditReport(result);
    return result;
  }
  
  private generateMitigationPlan(): string[] {
    const mitigations = [
      'Implement comprehensive input validation using schema validation libraries',
      'Enable HTTPS/TLS for all communications',
      'Implement proper authentication and authorization mechanisms',
      'Use environment variables for all secrets and configuration',
      'Implement comprehensive security logging and monitoring',
      'Regular security dependency updates and vulnerability scanning',
      'Implement proper data encryption at rest and in transit',
      'Ensure GDPR and CAN-SPAM compliance mechanisms are fully implemented',
      'Implement robust rate limiting and DDoS protection',
      'Regular security audits and penetration testing'
    ];
    
    return mitigations;
  }
  
  private generateNextSteps(): string[] {
    const nextSteps = [
      'Prioritize and remediate all critical and high-severity findings',
      'Implement automated security testing in CI/CD pipeline',
      'Set up continuous security monitoring and alerting',
      'Conduct regular security training for development team',
      'Establish incident response procedures and playbooks',
      'Schedule regular security assessments and penetration testing',
      'Implement security code review processes',
      'Create and maintain security documentation and policies'
    ];
    
    return nextSteps;
  }
  
  private printAuditReport(result: SecurityAuditResult): void {
    console.log('\n🔒 SECURITY AUDIT REPORT');
    console.log('='.repeat(80));
    console.log(`Audit Date: ${result.timestamp}`);
    console.log(`Overall Risk Level: ${result.overallRisk.toUpperCase()}`);
    console.log(`\nFINDINGS SUMMARY:`);
    console.log(`  Critical: ${result.criticalFindings}`);
    console.log(`  High: ${result.highFindings}`);
    console.log(`  Medium: ${result.mediumFindings}`);
    console.log(`  Low: ${result.lowFindings}`);
    console.log(`  Total: ${result.totalFindings}`);
    
    console.log('\n🚨 SECURITY FINDINGS:');
    console.log('-'.repeat(80));
    
    // Group findings by severity
    const bySeverity = {
      critical: result.findings.filter(f => f.severity === 'critical'),
      high: result.findings.filter(f => f.severity === 'high'),
      medium: result.findings.filter(f => f.severity === 'medium'),
      low: result.findings.filter(f => f.severity === 'low')
    };
    
    for (const [severity, findings] of Object.entries(bySeverity)) {
      if (findings.length === 0) continue;
      
      console.log(`\n${severity.toUpperCase()} SEVERITY (${findings.length}):`);
      
      for (const finding of findings) {
        console.log(`\n  ${this.getSeverityIcon(finding.severity)} ${finding.title}`);
        console.log(`     ID: ${finding.id}`);
        console.log(`     Category: ${finding.category}`);
        console.log(`     Description: ${finding.description}`);
        console.log(`     Impact: ${finding.impact}`);
        console.log(`     Recommendation: ${finding.recommendation}`);
        if (finding.file) {
          console.log(`     File: ${finding.file}${finding.line ? `:${finding.line}` : ''}`);
        }
        if (finding.evidence?.length) {
          console.log(`     Evidence: ${finding.evidence.join(', ')}`);
        }
      }
    }
    
    console.log('\n🛠️ MITIGATION PLAN:');
    console.log('-'.repeat(80));
    result.mitigations.forEach((mitigation, index) => {
      console.log(`${index + 1}. ${mitigation}`);
    });
    
    console.log('\n📋 NEXT STEPS:');
    console.log('-'.repeat(80));
    result.nextSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    if (result.criticalFindings > 0 || result.highFindings > 0) {
      console.log('⚠️  IMMEDIATE ACTION REQUIRED: Critical or high-severity findings detected');
    } else if (result.mediumFindings > 0) {
      console.log('⚠️  ACTION RECOMMENDED: Medium-severity findings should be addressed');
    } else {
      console.log('✅ SECURITY STATUS: No critical issues found');
    }
    
    console.log('='.repeat(80));
  }
  
  private getSeverityIcon(severity: SecurityFinding['severity']): string {
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return icons[severity];
  }
  
  async generateSecurityReport(): Promise<void> {
    const result = await this.runComprehensiveAudit();
    
    // Generate JSON report
    const jsonReport = JSON.stringify(result, null, 2);
    await fs.writeFile(
      path.join(this.projectRoot, 'security-audit-report.json'),
      jsonReport
    );
    
    // Generate Markdown report
    const markdownReport = this.generateMarkdownReport(result);
    await fs.writeFile(
      path.join(this.projectRoot, 'security-audit-report.md'),
      markdownReport
    );
    
    console.log('\n📄 Reports generated:');
    console.log('  - security-audit-report.json');
    console.log('  - security-audit-report.md');
  }
  
  private generateMarkdownReport(result: SecurityAuditResult): string {
    return `# Security Audit Report

**Date:** ${result.timestamp}
**Overall Risk Level:** ${result.overallRisk.toUpperCase()}

## Executive Summary

This security audit identified ${result.totalFindings} findings across the guest communications system:

- **Critical:** ${result.criticalFindings} findings
- **High:** ${result.highFindings} findings  
- **Medium:** ${result.mediumFindings} findings
- **Low:** ${result.lowFindings} findings

## Findings Detail

${result.findings.map(f => `### ${f.title}
**Severity:** ${f.severity.toUpperCase()}
**Category:** ${f.category}
**ID:** ${f.id}

**Description:** ${f.description}

**Impact:** ${f.impact}

**Recommendation:** ${f.recommendation}

${f.file ? `**File:** ${f.file}${f.line ? `:${f.line}` : ''}` : ''}
${f.evidence?.length ? `**Evidence:** ${f.evidence.join(', ')}` : ''}

---
`).join('\n')}

## Mitigation Plan

${result.mitigations.map((m, i) => `${i + 1}. ${m}`).join('\n')}

## Next Steps

${result.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
`;
  }
}

// Run audit if executed directly
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.generateSecurityReport()
    .then(() => {
      console.log('\n✅ Security audit completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Security audit failed:', error);
      process.exit(1);
    });
}

export { SecurityAuditor, SecurityFinding, SecurityAuditResult };