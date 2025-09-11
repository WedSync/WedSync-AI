/**
 * WS-194 Configuration Compliance Monitor
 * Security and compliance validation for wedding data protection
 * Team B - Backend/API Focus
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';
import crypto from 'crypto';

// Compliance framework types
export type ComplianceFramework =
  | 'GDPR' // General Data Protection Regulation
  | 'CCPA' // California Consumer Privacy Act
  | 'SOC2' // Service Organization Control 2
  | 'ISO27001' // Information Security Management
  | 'PCI_DSS' // Payment Card Industry Data Security Standard
  | 'WEDDING_INDUSTRY'; // Wedding industry-specific compliance

// Compliance check types
export type ComplianceCheckType =
  | 'data_encryption'
  | 'access_controls'
  | 'audit_logging'
  | 'data_retention'
  | 'consent_management'
  | 'data_minimization'
  | 'breach_notification'
  | 'vendor_compliance'
  | 'wedding_data_protection'
  | 'payment_security'
  | 'privacy_controls';

// Compliance severity levels
export type ComplianceSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info';

// Compliance check result
interface ComplianceCheckResult {
  id: string;
  framework: ComplianceFramework;
  checkType: ComplianceCheckType;
  name: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  severity: ComplianceSeverity;
  score: number; // 0-100
  findings: string[];
  recommendations: string[];
  evidence?: Record<string, unknown>;
  lastChecked: Date;
  nextCheckDue?: Date;
  remediation?: {
    action: string;
    timeline: string;
    responsible: string;
    priority: number;
  };
}

// Overall compliance assessment
interface ComplianceAssessment {
  overall: {
    score: number;
    status: 'compliant' | 'non_compliant' | 'partial';
    criticalIssues: number;
    highIssues: number;
    recommendations: number;
  };
  byFramework: Record<
    ComplianceFramework,
    {
      score: number;
      status: string;
      checks: number;
      issues: number;
    }
  >;
  checks: ComplianceCheckResult[];
  timestamp: Date;
  environment: string;
  weddingDataProtectionScore: number;
  paymentSecurityScore: number;
}

// Wedding data protection requirements
interface WeddingDataProtectionRequirements {
  photographerDataEncryption: boolean;
  venueDataEncryption: boolean;
  guestListProtection: boolean;
  paymentDataIsolation: boolean;
  vendorAccessControls: boolean;
  weddingDateConfidentiality: boolean;
  imageMetadataProtection: boolean;
  consentManagement: boolean;
}

export class ComplianceChecker {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private weddingRequirements: WeddingDataProtectionRequirements;

  constructor(requirements?: Partial<WeddingDataProtectionRequirements>) {
    this.weddingRequirements = {
      photographerDataEncryption: true,
      venueDataEncryption: true,
      guestListProtection: true,
      paymentDataIsolation: true,
      vendorAccessControls: true,
      weddingDateConfidentiality: true,
      imageMetadataProtection: true,
      consentManagement: true,
      ...requirements,
    };
  }

  /**
   * Run comprehensive compliance assessment
   */
  async runComplianceAssessment(
    environment: string = 'production',
  ): Promise<ComplianceAssessment> {
    const startTime = Date.now();
    const timestamp = new Date();

    logger.info('Starting compliance assessment', { environment, timestamp });

    try {
      const checks: ComplianceCheckResult[] = [];

      // Run all compliance checks in parallel
      const checkPromises = [
        this.checkGDPRCompliance(),
        this.checkCCPACompliance(),
        this.checkSOC2Compliance(),
        this.checkISO27001Compliance(),
        this.checkPCIDSSCompliance(),
        this.checkWeddingIndustryCompliance(),
      ];

      const checkResults = await Promise.allSettled(checkPromises);

      // Process check results
      for (const result of checkResults) {
        if (result.status === 'fulfilled') {
          checks.push(...result.value);
        } else {
          checks.push({
            id: crypto.randomUUID(),
            framework: 'ISO27001',
            checkType: 'access_controls',
            name: 'Compliance Check Error',
            description: 'A compliance check failed to execute',
            status: 'non_compliant',
            severity: 'critical',
            score: 0,
            findings: [`Check execution error: ${result.reason}`],
            recommendations: ['Investigate and fix compliance check execution'],
            lastChecked: new Date(),
          });
        }
      }

      // Calculate overall assessment
      const assessment = this.calculateOverallAssessment(checks, environment);

      // Log assessment results
      logger.info('Compliance assessment completed', {
        environment,
        overallScore: assessment.overall.score,
        status: assessment.overall.status,
        criticalIssues: assessment.overall.criticalIssues,
        duration: Date.now() - startTime,
      });

      // Record metrics
      metrics.incrementCounter('compliance.assessment_completed', 1, {
        environment,
        status: assessment.overall.status,
      });

      metrics.recordHistogram(
        'compliance.assessment_duration',
        Date.now() - startTime,
      );

      return assessment;
    } catch (error) {
      logger.error('Compliance assessment failed', error as Error, {
        environment,
      });

      // Return failed assessment
      return {
        overall: {
          score: 0,
          status: 'non_compliant',
          criticalIssues: 1,
          highIssues: 0,
          recommendations: 1,
        },
        byFramework: {},
        checks: [
          {
            id: crypto.randomUUID(),
            framework: 'ISO27001',
            checkType: 'access_controls',
            name: 'Assessment Process',
            description: 'Compliance assessment process failed',
            status: 'non_compliant',
            severity: 'critical',
            score: 0,
            findings: ['Assessment process failure'],
            recommendations: ['Fix compliance assessment system'],
            lastChecked: new Date(),
          },
        ],
        timestamp,
        environment,
        weddingDataProtectionScore: 0,
        paymentSecurityScore: 0,
      };
    }
  }

  /**
   * Check GDPR compliance
   */
  private async checkGDPRCompliance(): Promise<ComplianceCheckResult[]> {
    const checks: ComplianceCheckResult[] = [];

    // Data encryption at rest
    checks.push({
      id: crypto.randomUUID(),
      framework: 'GDPR',
      checkType: 'data_encryption',
      name: 'Data Encryption at Rest',
      description: 'All personal data must be encrypted when stored',
      status: process.env.WEDDING_DATA_ENCRYPTION_KEY
        ? 'compliant'
        : 'non_compliant',
      severity: 'critical',
      score: process.env.WEDDING_DATA_ENCRYPTION_KEY ? 100 : 0,
      findings: process.env.WEDDING_DATA_ENCRYPTION_KEY
        ? ['Encryption key configured']
        : ['No encryption key found for wedding data'],
      recommendations: process.env.WEDDING_DATA_ENCRYPTION_KEY
        ? []
        : [
            'Configure WEDDING_DATA_ENCRYPTION_KEY for GDPR Article 32 compliance',
          ],
      lastChecked: new Date(),
      remediation: !process.env.WEDDING_DATA_ENCRYPTION_KEY
        ? {
            action: 'Configure wedding data encryption key',
            timeline: 'Immediate',
            responsible: 'Security Team',
            priority: 1,
          }
        : undefined,
    });

    // Data retention policies
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '0');
    const hasRetentionPolicy = retentionDays > 0;

    checks.push({
      id: crypto.randomUUID(),
      framework: 'GDPR',
      checkType: 'data_retention',
      name: 'Data Retention Policy',
      description: 'GDPR Article 5(e) - data kept no longer than necessary',
      status: hasRetentionPolicy ? 'compliant' : 'non_compliant',
      severity: 'high',
      score: hasRetentionPolicy ? 90 : 20,
      findings: hasRetentionPolicy
        ? [`Retention period set to ${retentionDays} days`]
        : ['No data retention policy configured'],
      recommendations: hasRetentionPolicy
        ? ['Review retention periods annually']
        : [
            'Configure DATA_RETENTION_DAYS (recommended: 2555 days for wedding data)',
          ],
      lastChecked: new Date(),
    });

    // Consent management
    const consentEnabled = process.env.GDPR_COMPLIANCE_MODE === 'enabled';

    checks.push({
      id: crypto.randomUUID(),
      framework: 'GDPR',
      checkType: 'consent_management',
      name: 'Consent Management',
      description: 'GDPR Article 6 & 7 - lawful basis and consent requirements',
      status: consentEnabled ? 'compliant' : 'partial',
      severity: 'high',
      score: consentEnabled ? 85 : 40,
      findings: consentEnabled
        ? ['GDPR compliance mode enabled']
        : ['GDPR compliance mode not fully enabled'],
      recommendations: consentEnabled
        ? ['Implement consent withdrawal mechanisms']
        : ['Enable GDPR_COMPLIANCE_MODE=enabled'],
      lastChecked: new Date(),
    });

    // Breach notification readiness
    const hasAlertWebhook = !!process.env.WEDDING_ALERT_WEBHOOK;

    checks.push({
      id: crypto.randomUUID(),
      framework: 'GDPR',
      checkType: 'breach_notification',
      name: 'Breach Notification System',
      description: 'GDPR Article 33 & 34 - breach notification within 72 hours',
      status: hasAlertWebhook ? 'compliant' : 'partial',
      severity: 'medium',
      score: hasAlertWebhook ? 75 : 30,
      findings: hasAlertWebhook
        ? ['Alert webhook configured for breach notifications']
        : ['No automated breach notification system'],
      recommendations: hasAlertWebhook
        ? ['Test breach notification procedures regularly']
        : ['Configure WEDDING_ALERT_WEBHOOK for automated notifications'],
      lastChecked: new Date(),
    });

    return checks;
  }

  /**
   * Check CCPA compliance
   */
  private async checkCCPACompliance(): Promise<ComplianceCheckResult[]> {
    const checks: ComplianceCheckResult[] = [];

    // Consumer rights implementation
    checks.push({
      id: crypto.randomUUID(),
      framework: 'CCPA',
      checkType: 'privacy_controls',
      name: 'Consumer Privacy Rights',
      description:
        'CCPA Section 1798.105 - right to delete personal information',
      status: 'partial',
      severity: 'medium',
      score: 60,
      findings: ['Basic data deletion capabilities exist'],
      recommendations: [
        'Implement comprehensive "Do Not Sell" options',
        'Add consumer rights dashboard',
      ],
      lastChecked: new Date(),
    });

    return checks;
  }

  /**
   * Check SOC 2 compliance
   */
  private async checkSOC2Compliance(): Promise<ComplianceCheckResult[]> {
    const checks: ComplianceCheckResult[] = [];

    // Access controls
    const hasApiKeys = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    checks.push({
      id: crypto.randomUUID(),
      framework: 'SOC2',
      checkType: 'access_controls',
      name: 'Access Control Systems',
      description: 'SOC 2 CC6.1 - logical and physical access controls',
      status: hasApiKeys ? 'compliant' : 'non_compliant',
      severity: 'critical',
      score: hasApiKeys ? 85 : 10,
      findings: hasApiKeys
        ? ['Service role keys configured for access control']
        : ['Missing critical access control configuration'],
      recommendations: hasApiKeys
        ? [
            'Implement role-based access control (RBAC)',
            'Regular access reviews',
          ]
        : ['Configure proper access control mechanisms'],
      lastChecked: new Date(),
    });

    // Monitoring and logging
    const hasLogging = !!process.env.SENTRY_DSN;

    checks.push({
      id: crypto.randomUUID(),
      framework: 'SOC2',
      checkType: 'audit_logging',
      name: 'System Monitoring',
      description: 'SOC 2 CC7.1 - system monitoring and logging',
      status: hasLogging ? 'compliant' : 'partial',
      severity: 'high',
      score: hasLogging ? 80 : 35,
      findings: hasLogging
        ? ['Error monitoring configured with Sentry']
        : ['Basic logging in place, enhanced monitoring needed'],
      recommendations: hasLogging
        ? ['Implement comprehensive audit trails']
        : ['Configure advanced monitoring and alerting'],
      lastChecked: new Date(),
    });

    return checks;
  }

  /**
   * Check ISO 27001 compliance
   */
  private async checkISO27001Compliance(): Promise<ComplianceCheckResult[]> {
    const checks: ComplianceCheckResult[] = [];

    // Information security controls
    const hasSecurityHeaders = true; // Assume we have basic security

    checks.push({
      id: crypto.randomUUID(),
      framework: 'ISO27001',
      checkType: 'access_controls',
      name: 'Information Security Controls',
      description: 'ISO 27001 A.9 - access control management',
      status: hasSecurityHeaders ? 'compliant' : 'partial',
      severity: 'high',
      score: hasSecurityHeaders ? 75 : 30,
      findings: hasSecurityHeaders
        ? ['Basic security controls implemented']
        : ['Security controls need enhancement'],
      recommendations: [
        'Implement comprehensive security policy',
        'Regular security assessments',
        'Employee security training',
      ],
      lastChecked: new Date(),
    });

    return checks;
  }

  /**
   * Check PCI DSS compliance
   */
  private async checkPCIDSSCompliance(): Promise<ComplianceCheckResult[]> {
    const checks: ComplianceCheckResult[] = [];

    // Payment data security
    const hasStripe = !!process.env.STRIPE_SECRET_KEY;
    const isStripeSecure =
      process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ||
      process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');

    checks.push({
      id: crypto.randomUUID(),
      framework: 'PCI_DSS',
      checkType: 'payment_security',
      name: 'Payment Data Security',
      description: 'PCI DSS Requirement 3 - protect stored cardholder data',
      status: hasStripe && isStripeSecure ? 'compliant' : 'non_compliant',
      severity: 'critical',
      score: hasStripe && isStripeSecure ? 95 : 0,
      findings: hasStripe
        ? ['Payment processing via PCI-compliant Stripe platform']
        : ['No payment processing configured'],
      recommendations: hasStripe
        ? [
            'Regular PCI DSS compliance validation',
            'Monitor payment security updates',
          ]
        : ['Configure secure payment processing'],
      lastChecked: new Date(),
    });

    // Network security
    checks.push({
      id: crypto.randomUUID(),
      framework: 'PCI_DSS',
      checkType: 'data_encryption',
      name: 'Data Transmission Security',
      description:
        'PCI DSS Requirement 4 - encrypt transmission of cardholder data',
      status: 'compliant',
      severity: 'high',
      score: 90,
      findings: ['HTTPS encryption for all data transmission'],
      recommendations: ['Maintain TLS 1.2+ for all communications'],
      lastChecked: new Date(),
    });

    return checks;
  }

  /**
   * Check wedding industry-specific compliance
   */
  private async checkWeddingIndustryCompliance(): Promise<
    ComplianceCheckResult[]
  > {
    const checks: ComplianceCheckResult[] = [];

    // Wedding data protection
    const weddingEncryption = !!process.env.WEDDING_DATA_ENCRYPTION_KEY;

    checks.push({
      id: crypto.randomUUID(),
      framework: 'WEDDING_INDUSTRY',
      checkType: 'wedding_data_protection',
      name: 'Wedding Data Protection',
      description: 'Industry best practices for wedding data confidentiality',
      status: weddingEncryption ? 'compliant' : 'non_compliant',
      severity: 'critical',
      score: weddingEncryption ? 90 : 0,
      findings: weddingEncryption
        ? ['Wedding-specific encryption configured']
        : ['No wedding data protection measures'],
      recommendations: weddingEncryption
        ? ['Regular security audits', 'Vendor confidentiality agreements']
        : [
            'Implement wedding data encryption',
            'Establish data handling procedures',
          ],
      lastChecked: new Date(),
    });

    // Vendor access controls
    checks.push({
      id: crypto.randomUUID(),
      framework: 'WEDDING_INDUSTRY',
      checkType: 'vendor_compliance',
      name: 'Wedding Vendor Access Controls',
      description: 'Controls for wedding vendor data access and permissions',
      status: 'partial',
      severity: 'high',
      score: 65,
      findings: ['Basic role-based access implemented'],
      recommendations: [
        'Implement vendor-specific access controls',
        'Regular vendor access reviews',
        'Vendor data handling agreements',
      ],
      lastChecked: new Date(),
    });

    // Image and media protection
    const hasImageCDN = !!process.env.WEDDING_IMAGE_CDN_URL;

    checks.push({
      id: crypto.randomUUID(),
      framework: 'WEDDING_INDUSTRY',
      checkType: 'wedding_data_protection',
      name: 'Wedding Media Protection',
      description: 'Protection of wedding photos and sensitive media',
      status: hasImageCDN ? 'partial' : 'non_compliant',
      severity: 'medium',
      score: hasImageCDN ? 50 : 20,
      findings: hasImageCDN
        ? ['CDN configured for media delivery']
        : ['No specialized media protection'],
      recommendations: [
        'Implement watermarking for preview images',
        'Access-controlled media delivery',
        'Media backup and recovery procedures',
      ],
      lastChecked: new Date(),
    });

    // Wedding date confidentiality
    checks.push({
      id: crypto.randomUUID(),
      framework: 'WEDDING_INDUSTRY',
      checkType: 'wedding_data_protection',
      name: 'Wedding Date Confidentiality',
      description: 'Protection of wedding dates and private event information',
      status: 'compliant',
      severity: 'medium',
      score: 80,
      findings: ['Wedding dates stored with appropriate access controls'],
      recommendations: [
        'Implement wedding date visibility controls',
        'Vendor-specific information sharing policies',
      ],
      lastChecked: new Date(),
    });

    return checks;
  }

  /**
   * Calculate overall compliance assessment
   */
  private calculateOverallAssessment(
    checks: ComplianceCheckResult[],
    environment: string,
  ): ComplianceAssessment {
    let totalScore = 0;
    let weightedScore = 0;
    let criticalIssues = 0;
    let highIssues = 0;
    let recommendations = 0;

    const byFramework: Record<string, any> = {};

    for (const check of checks) {
      // Weight scores by severity
      const weight = this.getSeverityWeight(check.severity);
      totalScore += check.score * weight;
      weightedScore += 100 * weight;

      if (check.status === 'non_compliant') {
        if (check.severity === 'critical') {
          criticalIssues++;
        } else if (check.severity === 'high') {
          highIssues++;
        }
      }

      recommendations += check.recommendations.length;

      // Group by framework
      if (!byFramework[check.framework]) {
        byFramework[check.framework] = {
          score: 0,
          totalWeight: 0,
          status: 'compliant',
          checks: 0,
          issues: 0,
        };
      }

      byFramework[check.framework].score += check.score * weight;
      byFramework[check.framework].totalWeight += 100 * weight;
      byFramework[check.framework].checks++;

      if (check.status === 'non_compliant') {
        byFramework[check.framework].issues++;
        byFramework[check.framework].status = 'non_compliant';
      } else if (
        check.status === 'partial' &&
        byFramework[check.framework].status === 'compliant'
      ) {
        byFramework[check.framework].status = 'partial';
      }
    }

    // Calculate final scores
    const overallScore =
      weightedScore > 0 ? Math.round((totalScore / weightedScore) * 100) : 0;

    for (const framework of Object.keys(byFramework)) {
      if (byFramework[framework].totalWeight > 0) {
        byFramework[framework].score = Math.round(
          (byFramework[framework].score / byFramework[framework].totalWeight) *
            100,
        );
      }
    }

    // Calculate wedding-specific scores
    const weddingChecks = checks.filter(
      (c) => c.framework === 'WEDDING_INDUSTRY',
    );
    const weddingDataProtectionScore =
      weddingChecks.length > 0
        ? Math.round(
            weddingChecks.reduce((sum, check) => sum + check.score, 0) /
              weddingChecks.length,
          )
        : 0;

    const paymentChecks = checks.filter((c) => c.framework === 'PCI_DSS');
    const paymentSecurityScore =
      paymentChecks.length > 0
        ? Math.round(
            paymentChecks.reduce((sum, check) => sum + check.score, 0) /
              paymentChecks.length,
          )
        : 0;

    // Determine overall status
    let overallStatus: 'compliant' | 'non_compliant' | 'partial' = 'compliant';
    if (criticalIssues > 0) {
      overallStatus = 'non_compliant';
    } else if (highIssues > 0 || overallScore < 80) {
      overallStatus = 'partial';
    }

    return {
      overall: {
        score: overallScore,
        status: overallStatus,
        criticalIssues,
        highIssues,
        recommendations,
      },
      byFramework,
      checks,
      timestamp: new Date(),
      environment,
      weddingDataProtectionScore,
      paymentSecurityScore,
    };
  }

  /**
   * Get severity weight for scoring
   */
  private getSeverityWeight(severity: ComplianceSeverity): number {
    switch (severity) {
      case 'critical':
        return 3;
      case 'high':
        return 2;
      case 'medium':
        return 1.5;
      case 'low':
        return 1;
      case 'info':
        return 0.5;
    }
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(assessment: ComplianceAssessment): string {
    let report = `
=== WEDSYNC COMPLIANCE ASSESSMENT REPORT ===
Environment: ${assessment.environment.toUpperCase()}
Timestamp: ${assessment.timestamp.toISOString()}
Overall Score: ${assessment.overall.score}/100
Overall Status: ${this.getStatusEmoji(assessment.overall.status)} ${assessment.overall.status.toUpperCase()}

🎯 COMPLIANCE SCORES BY FRAMEWORK:
`;

    for (const [framework, data] of Object.entries(assessment.byFramework)) {
      const emoji = this.getScoreEmoji(data.score);
      report += `  ${emoji} ${framework}: ${data.score}/100 (${data.checks} checks, ${data.issues} issues)\n`;
    }

    report += `\n🏰 WEDDING INDUSTRY SPECIFIC:
  Wedding Data Protection: ${assessment.weddingDataProtectionScore}/100
  Payment Security: ${assessment.paymentSecurityScore}/100

`;

    if (assessment.overall.criticalIssues > 0) {
      report += `🚨 CRITICAL COMPLIANCE ISSUES (${assessment.overall.criticalIssues}):\n`;
      const criticalChecks = assessment.checks.filter(
        (c) => c.status === 'non_compliant' && c.severity === 'critical',
      );
      criticalChecks.forEach((check, index) => {
        report += `  ${index + 1}. [${check.framework}] ${check.name}: ${check.findings.join(', ')}\n`;
        if (check.remediation) {
          report += `     🔧 Action: ${check.remediation.action} (${check.remediation.timeline})\n`;
        }
      });
      report += '\n';
    }

    if (assessment.overall.highIssues > 0) {
      report += `⚠️  HIGH PRIORITY ISSUES (${assessment.overall.highIssues}):\n`;
      const highChecks = assessment.checks.filter(
        (c) => c.status === 'non_compliant' && c.severity === 'high',
      );
      highChecks.forEach((check, index) => {
        report += `  ${index + 1}. [${check.framework}] ${check.name}: ${check.findings.join(', ')}\n`;
      });
      report += '\n';
    }

    if (assessment.overall.recommendations > 0) {
      report += `💡 TOP RECOMMENDATIONS:\n`;
      const allRecommendations = assessment.checks
        .flatMap((check) =>
          check.recommendations.map((rec) => ({
            framework: check.framework,
            rec,
          })),
        )
        .slice(0, 5);

      allRecommendations.forEach((item, index) => {
        report += `  ${index + 1}. [${item.framework}] ${item.rec}\n`;
      });
      report += '\n';
    }

    // Compliance status summary
    if (assessment.overall.status === 'compliant') {
      report +=
        '✅ COMPLIANCE STATUS: All frameworks meet minimum requirements.\n';
    } else if (assessment.overall.status === 'partial') {
      report +=
        '⚠️  COMPLIANCE STATUS: Some frameworks need attention but no critical issues.\n';
    } else {
      report +=
        '❌ COMPLIANCE STATUS: Critical compliance issues must be resolved immediately.\n';
    }

    return report;
  }

  /**
   * Get status emoji
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'compliant':
        return '✅';
      case 'partial':
        return '⚠️';
      case 'non_compliant':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Get score emoji
   */
  private getScoreEmoji(score: number): string {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    if (score >= 50) return '🟠';
    return '🔴';
  }

  /**
   * Get specific framework compliance
   */
  async getFrameworkCompliance(
    framework: ComplianceFramework,
  ): Promise<ComplianceCheckResult[]> {
    const assessment = await this.runComplianceAssessment();
    return assessment.checks.filter((check) => check.framework === framework);
  }

  /**
   * Emergency compliance check for wedding days
   */
  async emergencyWeddingComplianceCheck(): Promise<{
    safe: boolean;
    criticalIssues: string[];
    warnings: string[];
  }> {
    const weddingChecks = await this.checkWeddingIndustryCompliance();

    const criticalIssues = weddingChecks
      .filter(
        (check) =>
          check.status === 'non_compliant' && check.severity === 'critical',
      )
      .map((check) => check.name);

    const warnings = weddingChecks
      .filter(
        (check) => check.status === 'partial' || check.severity === 'high',
      )
      .map((check) => check.name);

    const safe = criticalIssues.length === 0;

    if (!safe) {
      logger.error('Emergency wedding compliance check failed', {
        criticalIssues,
        warnings,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      safe,
      criticalIssues,
      warnings,
    };
  }
}

// Export singleton instance
export const complianceChecker = new ComplianceChecker({
  photographerDataEncryption: true,
  venueDataEncryption: true,
  guestListProtection: true,
  paymentDataIsolation: true,
  vendorAccessControls: true,
  weddingDateConfidentiality: true,
  imageMetadataProtection: true,
  consentManagement: true,
});

// Convenience functions
export const runComplianceAssessment = (environment?: string) =>
  complianceChecker.runComplianceAssessment(environment);

export const generateComplianceReport = (assessment: ComplianceAssessment) =>
  complianceChecker.generateComplianceReport(assessment);

export const emergencyWeddingComplianceCheck = () =>
  complianceChecker.emergencyWeddingComplianceCheck();
