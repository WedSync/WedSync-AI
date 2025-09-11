#!/usr/bin/env tsx
/**
 * Comprehensive Security Audit Script
 * Scans the codebase for security vulnerabilities and configuration issues
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface SecurityIssue {
  file: string;
  line: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  suggestion?: string;
}

interface SecurityAuditResult {
  issues: SecurityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

class SecurityAuditor {
  private issues: SecurityIssue[] = [];

  /**
   * Security patterns to detect
   */
  private readonly SECURITY_PATTERNS = [
    {
      pattern: /process\.env\.[A-Z_]+!/g,
      severity: 'medium' as const,
      type: 'Environment Variable',
      message: 'Non-null assertion on environment variable - could cause runtime errors',
      suggestion: 'Use proper validation instead of non-null assertion'
    },
    {
      pattern: /console\.log\(.*password.*\)/gi,
      severity: 'critical' as const,
      type: 'Information Disclosure',
      message: 'Potential password logging detected',
      suggestion: 'Remove password logging or use proper sanitization'
    },
    {
      pattern: /console\.log\(.*secret.*\)/gi,
      severity: 'critical' as const,
      type: 'Information Disclosure',
      message: 'Potential secret logging detected',
      suggestion: 'Remove secret logging or use proper sanitization'
    },
    {
      pattern: /eval\(/g,
      severity: 'critical' as const,
      type: 'Code Injection',
      message: 'Use of eval() detected - potential code injection vulnerability',
      suggestion: 'Replace eval() with safer alternatives'
    },
    {
      pattern: /innerHTML\s*=/g,
      severity: 'high' as const,
      type: 'XSS Vulnerability',
      message: 'Direct innerHTML assignment - potential XSS vulnerability',
      suggestion: 'Use textContent or proper sanitization'
    },
    {
      pattern: /dangerouslySetInnerHTML/g,
      severity: 'high' as const,
      type: 'XSS Vulnerability',
      message: 'dangerouslySetInnerHTML usage - ensure content is sanitized',
      suggestion: 'Verify content is properly sanitized before use'
    },
    {
      pattern: /NEXT_PUBLIC_.*(?:SECRET|KEY|PASSWORD|TOKEN)/gi,
      severity: 'critical' as const,
      type: 'Secret Exposure',
      message: 'Sensitive data exposed to client via NEXT_PUBLIC_ prefix',
      suggestion: 'Remove NEXT_PUBLIC_ prefix for sensitive variables'
    },
    {
      pattern: /\.sql\(`[^`]*\$\{[^}]*\}[^`]*`\)/g,
      severity: 'critical' as const,
      type: 'SQL Injection',
      message: 'Potential SQL injection via template literals',
      suggestion: 'Use parameterized queries instead'
    },
    {
      pattern: /fetch\([^)]*\$\{[^}]*\}[^)]*\)/g,
      severity: 'medium' as const,
      type: 'URL Injection',
      message: 'Dynamic URL construction in fetch - potential injection',
      suggestion: 'Validate and sanitize URL parameters'
    }
  ];

  /**
   * Run comprehensive security audit
   */
  async audit(): Promise<SecurityAuditResult> {
    console.log('🔍 Starting security audit...\n');

    // Scan TypeScript/JavaScript files
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      ignore: ['node_modules/**', '.next/**', 'dist/**', '**/*.test.*', '**/*.spec.*']
    });

    for (const file of files) {
      await this.scanFile(file);
    }

    // Scan configuration files
    await this.scanConfigFiles();

    // Generate summary
    const summary = this.generateSummary();

    return {
      issues: this.issues,
      summary
    };
  }

  /**
   * Scan individual file for security issues
   */
  private async scanFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        this.SECURITY_PATTERNS.forEach(pattern => {
          const matches = line.match(pattern.pattern);
          if (matches) {
            this.issues.push({
              file: filePath,
              line: index + 1,
              severity: pattern.severity,
              type: pattern.type,
              message: pattern.message,
              suggestion: pattern.suggestion
            });
          }
        });
      });
    } catch (error) {
      console.warn(`Warning: Could not scan file ${filePath}:`, error);
    }
  }

  /**
   * Scan configuration files for security issues
   */
  private async scanConfigFiles(): Promise<void> {
    const configFiles = [
      'next.config.ts',
      'next.config.js',
      'package.json',
      '.env.example',
      '.env.local',
      'vercel.json'
    ];

    for (const configFile of configFiles) {
      if (fs.existsSync(configFile)) {
        await this.scanConfigFile(configFile);
      }
    }
  }

  /**
   * Scan specific configuration file
   */
  private async scanConfigFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for hardcoded paths
      if (content.includes('/Users/') || content.includes('C:\\')) {
        this.issues.push({
          file: filePath,
          line: 1,
          severity: 'high',
          type: 'Configuration Issue',
          message: 'Hardcoded absolute paths detected in configuration',
          suggestion: 'Use relative paths or environment variables'
        });
      }

      // Check for debug mode in production configs
      if (filePath.includes('production') && content.includes('debug: true')) {
        this.issues.push({
          file: filePath,
          line: 1,
          severity: 'medium',
          type: 'Configuration Issue',
          message: 'Debug mode enabled in production configuration',
          suggestion: 'Disable debug mode in production'
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not scan config file ${filePath}:`, error);
    }
  }

  /**
   * Generate audit summary
   */
  private generateSummary() {
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    this.issues.forEach(issue => {
      summary[issue.severity]++;
    });

    return summary;
  }

  /**
   * Print audit results
   */
  printResults(result: SecurityAuditResult): void {
    console.log('🛡️  SECURITY AUDIT RESULTS');
    console.log('=' .repeat(50));
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   🔴 Critical: ${result.summary.critical}`);
    console.log(`   🟠 High:     ${result.summary.high}`);
    console.log(`   🟡 Medium:   ${result.summary.medium}`);
    console.log(`   🟢 Low:      ${result.summary.low}`);
    console.log(`   📝 Total:    ${result.issues.length}`);

    if (result.issues.length === 0) {
      console.log('\n✅ No security issues found!');
      return;
    }

    // Group issues by severity
    const groupedIssues = result.issues.reduce((acc, issue) => {
      if (!acc[issue.severity]) acc[issue.severity] = [];
      acc[issue.severity].push(issue);
      return acc;
    }, {} as Record<string, SecurityIssue[]>);

    // Print issues by severity
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const issues = groupedIssues[severity];
      if (issues && issues.length > 0) {
        console.log(`\n${this.getSeverityIcon(severity)} ${severity.toUpperCase()} ISSUES:`);
        issues.forEach(issue => {
          console.log(`   📁 ${issue.file}:${issue.line}`);
          console.log(`      🔍 ${issue.type}: ${issue.message}`);
          if (issue.suggestion) {
            console.log(`      💡 ${issue.suggestion}`);
          }
          console.log('');
        });
      }
    });

    // Exit with error code if critical issues found
    if (result.summary.critical > 0) {
      console.log('🚨 CRITICAL SECURITY ISSUES FOUND - DEPLOYMENT BLOCKED');
      process.exit(1);
    }
  }

  private getSeverityIcon(severity: string): string {
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return icons[severity as keyof typeof icons] || '⚪';
  }
}

// Run audit if called directly
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.audit().then(result => {
    auditor.printResults(result);
  }).catch(error => {
    console.error('Security audit failed:', error);
    process.exit(1);
  });
}

export { SecurityAuditor };
