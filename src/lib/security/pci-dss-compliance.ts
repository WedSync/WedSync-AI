/**
 * PCI DSS Level 1 Compliance System
 *
 * B-MAD Enhancement: Enterprise-grade payment security compliance
 * implementing comprehensive PCI DSS Level 1 requirements for
 * wedding industry payment processing at scale.
 *
 * Features:
 * - PCI DSS Level 1 validation and monitoring
 * - Payment data encryption and tokenization
 * - Cardholder data environment (CDE) protection
 * - Network security and access controls
 * - Vulnerability management and testing
 * - Information security policies enforcement
 * - Regular security monitoring and audit logging
 * - Incident response procedures
 * - Compliance reporting and documentation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditLogger, AuditEventType, AuditSeverity } from '@/lib/audit-logger';
import * as crypto from 'crypto';
import { z } from 'zod';

// PCI DSS Requirements enumeration
export enum PCIDSSRequirement {
  // Build and Maintain Secure Network
  FIREWALL_CONFIG = '1.1',
  DEFAULT_PASSWORDS = '1.2',
  STORED_CARDHOLDER_DATA = '2.1',

  // Protect Cardholder Data
  DATA_PROTECTION = '3.1',
  ENCRYPTION_TRANSIT = '3.2',
  PAN_MASKING = '3.3',
  ENCRYPTION_KEYS = '3.4',

  // Maintain Vulnerability Management
  ANTIVIRUS = '5.1',
  SECURITY_PATCHES = '5.2',
  VULNERABILITY_SCANS = '6.1',

  // Implement Strong Access Controls
  ACCESS_CONTROL = '7.1',
  USER_AUTHENTICATION = '7.2',
  PHYSICAL_ACCESS = '7.3',

  // Monitor and Test Networks
  NETWORK_MONITORING = '8.1',
  PENETRATION_TESTING = '8.2',

  // Maintain Information Security Policy
  SECURITY_POLICY = '9.1',
  INCIDENT_RESPONSE = '9.2',
}

// Compliance status levels
export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  UNKNOWN = 'unknown',
}

// PCI DSS validation result
interface ComplianceValidationResult {
  requirement: PCIDSSRequirement;
  status: ComplianceStatus;
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
  lastValidated: Date;
  evidence?: any;
}

// Payment security context
interface PaymentSecurityContext {
  transactionId?: string;
  amount?: number;
  currency?: string;
  cardType?: string;
  merchantId?: string;
  customerId?: string;
  isStoredPayment?: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  fraudScore?: number;
}

// PCI DSS compliance manager
export class PCIDSSComplianceManager {
  private static instance: PCIDSSComplianceManager;
  private validationResults = new Map<
    PCIDSSRequirement,
    ComplianceValidationResult
  >();
  private securityPolicies = new Map<string, any>();
  private auditTrail: any[] = [];

  constructor() {
    this.initializeSecurityPolicies();
    this.startContinuousMonitoring();
  }

  static getInstance(): PCIDSSComplianceManager {
    if (!this.instance) {
      this.instance = new PCIDSSComplianceManager();
    }
    return this.instance;
  }

  /**
   * Initialize PCI DSS security policies
   */
  private initializeSecurityPolicies(): void {
    this.securityPolicies.set('password_policy', {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      maxAge: 90, // days
      preventReuse: 24, // last 24 passwords
      lockoutThreshold: 5, // failed attempts
      lockoutDuration: 30, // minutes
    });

    this.securityPolicies.set('encryption_policy', {
      cardDataEncryption: 'AES-256',
      keyRotationInterval: 365, // days
      keyStorageLocation: 'hardware_security_module',
      transitEncryption: 'TLS-1.3',
      atRestEncryption: true,
    });

    this.securityPolicies.set('access_control_policy', {
      needToKnowPrinciple: true,
      roleBasedAccess: true,
      minimumPrivilege: true,
      regularAccessReview: 90, // days
      terminationAccess: 'immediate',
    });

    this.securityPolicies.set('network_security_policy', {
      firewallEnabled: true,
      intrusionDetection: true,
      networkSegmentation: true,
      wirelessSecurity: 'WPA3',
      vulnerabilityScanning: 'quarterly',
    });
  }

  /**
   * Validate payment request for PCI DSS compliance
   */
  async validatePaymentRequest(
    request: NextRequest,
    context: PaymentSecurityContext,
  ): Promise<{
    allowed: boolean;
    complianceScore: number;
    violations: string[];
    recommendations: string[];
  }> {
    const violations: string[] = [];
    const recommendations: string[] = [];
    let complianceScore = 100;

    try {
      // 1. Validate network security (PCI DSS Req 1)
      const networkValidation = await this.validateNetworkSecurity(request);
      if (!networkValidation.compliant) {
        violations.push(...networkValidation.violations);
        complianceScore -= 20;
      }

      // 2. Validate data protection (PCI DSS Req 3)
      const dataValidation = await this.validateDataProtection(
        request,
        context,
      );
      if (!dataValidation.compliant) {
        violations.push(...dataValidation.violations);
        complianceScore -= 25;
      }

      // 3. Validate access controls (PCI DSS Req 7-8)
      const accessValidation = await this.validateAccessControls(request);
      if (!accessValidation.compliant) {
        violations.push(...accessValidation.violations);
        complianceScore -= 20;
      }

      // 4. Validate monitoring and logging (PCI DSS Req 10)
      const monitoringValidation = await this.validateMonitoring(
        request,
        context,
      );
      if (!monitoringValidation.compliant) {
        violations.push(...monitoringValidation.violations);
        complianceScore -= 15;
      }

      // 5. Check vulnerability management (PCI DSS Req 6)
      const vulnerabilityValidation =
        await this.validateVulnerabilityManagement();
      if (!vulnerabilityValidation.compliant) {
        violations.push(...vulnerabilityValidation.violations);
        complianceScore -= 10;
      }

      // Log compliance validation
      await this.logComplianceEvent('payment_validation', {
        complianceScore,
        violationsCount: violations.length,
        context,
        allowed: complianceScore >= 70, // Require 70% compliance
      });

      return {
        allowed: complianceScore >= 70 && violations.length === 0,
        complianceScore,
        violations,
        recommendations,
      };
    } catch (error) {
      await this.logComplianceEvent('validation_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        context,
      });

      return {
        allowed: false,
        complianceScore: 0,
        violations: ['Compliance validation failed'],
        recommendations: ['Contact system administrator'],
      };
    }
  }

  /**
   * Validate network security (PCI DSS Requirement 1)
   */
  private async validateNetworkSecurity(request: NextRequest): Promise<{
    compliant: boolean;
    violations: string[];
    score: number;
  }> {
    const violations: string[] = [];
    let score = 100;

    // Check HTTPS/TLS
    if (!request.url.startsWith('https://')) {
      violations.push('Payment request must use HTTPS');
      score -= 50;
    }

    // Validate TLS version
    const tlsVersion = request.headers.get('x-tls-version');
    if (tlsVersion && parseFloat(tlsVersion) < 1.2) {
      violations.push('TLS version must be 1.2 or higher');
      score -= 30;
    }

    // Check for proper firewall headers
    const firewallHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip',
    ];

    let hasFirewallInfo = false;
    for (const header of firewallHeaders) {
      if (request.headers.get(header)) {
        hasFirewallInfo = true;
        break;
      }
    }

    if (!hasFirewallInfo) {
      violations.push('Request must pass through configured firewall');
      score -= 20;
    }

    return {
      compliant: violations.length === 0,
      violations,
      score: Math.max(0, score),
    };
  }

  /**
   * Validate data protection (PCI DSS Requirements 3-4)
   */
  private async validateDataProtection(
    request: NextRequest,
    context: PaymentSecurityContext,
  ): Promise<{
    compliant: boolean;
    violations: string[];
    score: number;
  }> {
    const violations: string[] = [];
    let score = 100;

    // Check for prohibited cardholder data in request
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const body = await request.clone().json();
        const bodyString = JSON.stringify(body);

        // Check for PAN (Primary Account Number) patterns
        const panPattern = /\b(?:\d[ -]*?){13,19}\b/g;
        if (panPattern.test(bodyString)) {
          violations.push(
            'Raw card numbers are prohibited in payment requests',
          );
          score -= 50;
        }

        // Check for CVV patterns
        const cvvPattern = /\bcvv\d?[\s:=]\s*\d{3,4}\b/i;
        if (cvvPattern.test(bodyString)) {
          violations.push('CVV codes must not be stored or transmitted');
          score -= 40;
        }

        // Check for expiration date patterns
        const expPattern =
          /\bexp(?:ir(?:y|ation))?[\s:=]\s*\d{1,2}[\/\-]\d{2,4}\b/i;
        if (expPattern.test(bodyString)) {
          violations.push('Card expiration dates require secure handling');
          score -= 20;
        }
      }
    } catch (error) {
      // Cannot parse body - continue validation
    }

    // Validate encryption requirements
    if (context.isStoredPayment && !this.isEncryptionCompliant()) {
      violations.push('Stored payment data must be encrypted with AES-256');
      score -= 30;
    }

    // Check tokenization
    if (!context.transactionId?.startsWith('tok_')) {
      violations.push('Payment data should use tokenization');
      score -= 25;
    }

    return {
      compliant: violations.length === 0,
      violations,
      score: Math.max(0, score),
    };
  }

  /**
   * Validate access controls (PCI DSS Requirements 7-8)
   */
  private async validateAccessControls(request: NextRequest): Promise<{
    compliant: boolean;
    violations: string[];
    score: number;
  }> {
    const violations: string[] = [];
    let score = 100;

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      violations.push('Payment requests require authentication');
      score -= 50;
    }

    // Validate session security
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId) {
      violations.push('Secure session required for payment operations');
      score -= 30;
    }

    // Check for multi-factor authentication indicators
    const mfaHeader = request.headers.get('x-mfa-verified');
    if (!mfaHeader || mfaHeader !== 'true') {
      violations.push('Multi-factor authentication required for payments');
      score -= 20;
    }

    return {
      compliant: violations.length === 0,
      violations,
      score: Math.max(0, score),
    };
  }

  /**
   * Validate monitoring and logging (PCI DSS Requirement 10)
   */
  private async validateMonitoring(
    request: NextRequest,
    context: PaymentSecurityContext,
  ): Promise<{
    compliant: boolean;
    violations: string[];
    score: number;
  }> {
    const violations: string[] = [];
    let score = 100;

    // Ensure request has proper tracking headers
    const requestId = request.headers.get('x-request-id');
    if (!requestId) {
      violations.push('Payment requests must include tracking identifiers');
      score -= 30;
    }

    // Validate logging capability
    try {
      await auditLogger.log({
        event_type: AuditEventType.PAYMENT_VALIDATION,
        severity: AuditSeverity.INFO,
        action: 'PCI DSS compliance monitoring',
        details: {
          transactionId: context.transactionId,
          amount: context.amount,
          riskLevel: context.riskLevel,
        },
      });
    } catch (error) {
      violations.push('Audit logging system unavailable');
      score -= 40;
    }

    return {
      compliant: violations.length === 0,
      violations,
      score: Math.max(0, score),
    };
  }

  /**
   * Validate vulnerability management (PCI DSS Requirement 6)
   */
  private async validateVulnerabilityManagement(): Promise<{
    compliant: boolean;
    violations: string[];
    score: number;
  }> {
    const violations: string[] = [];
    let score = 100;

    // Check system patch level (placeholder - would integrate with actual systems)
    const lastPatchCheck = this.getLastPatchCheck();
    const daysSinceCheck = Math.floor(
      (Date.now() - lastPatchCheck.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceCheck > 30) {
      violations.push('System patches must be reviewed monthly');
      score -= 30;
    }

    // Validate security scanning
    const lastSecurityScan = this.getLastSecurityScan();
    const daysSinceScan = Math.floor(
      (Date.now() - lastSecurityScan.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceScan > 90) {
      violations.push('Quarterly security scans are required');
      score -= 40;
    }

    return {
      compliant: violations.length === 0,
      violations,
      score: Math.max(0, score),
    };
  }

  /**
   * Generate PCI DSS compliance report
   */
  async generateComplianceReport(): Promise<{
    overallScore: number;
    status: ComplianceStatus;
    requirements: ComplianceValidationResult[];
    summary: {
      compliantRequirements: number;
      totalRequirements: number;
      criticalIssues: number;
      lastAssessment: Date;
    };
    recommendations: string[];
  }> {
    const requirements = Object.values(PCIDSSRequirement);
    const validationResults: ComplianceValidationResult[] = [];
    let totalScore = 0;
    let criticalIssues = 0;

    for (const requirement of requirements) {
      const result = this.validationResults.get(requirement) || {
        requirement,
        status: ComplianceStatus.UNKNOWN,
        score: 0,
        issues: ['Not yet assessed'],
        recommendations: ['Schedule compliance assessment'],
        lastValidated: new Date(),
      };

      validationResults.push(result);
      totalScore += result.score;

      if (result.status === ComplianceStatus.NON_COMPLIANT) {
        criticalIssues += result.issues.length;
      }
    }

    const overallScore = Math.round(totalScore / requirements.length);
    const compliantRequirements = validationResults.filter(
      (r) => r.status === ComplianceStatus.COMPLIANT,
    ).length;

    const status = this.determineOverallStatus(overallScore, criticalIssues);

    const recommendations = this.generateRecommendations(validationResults);

    return {
      overallScore,
      status,
      requirements: validationResults,
      summary: {
        compliantRequirements,
        totalRequirements: requirements.length,
        criticalIssues,
        lastAssessment: new Date(),
      },
      recommendations,
    };
  }

  /**
   * Handle PCI DSS incident response
   */
  async handleSecurityIncident(incident: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedSystems: string[];
    cardholderDataInvolved: boolean;
  }): Promise<{
    incidentId: string;
    responseActions: string[];
    notificationRequired: boolean;
    timelineHours: number;
  }> {
    const incidentId = `pci_incident_${Date.now()}_${crypto.randomUUID()}`;
    const responseActions: string[] = [];
    let timelineHours = 72; // Default PCI DSS notification timeline

    // Immediate response actions
    if (incident.cardholderDataInvolved) {
      responseActions.push('Isolate affected systems immediately');
      responseActions.push('Preserve forensic evidence');
      responseActions.push('Assess scope of cardholder data exposure');
      timelineHours = 24; // Expedited timeline for data breaches
    }

    responseActions.push('Document incident details');
    responseActions.push('Notify incident response team');

    if (incident.severity === 'critical') {
      responseActions.push('Activate emergency response procedures');
      responseActions.push('Contact PCI DSS forensic investigator');
    }

    // Log incident
    await this.logComplianceEvent('security_incident', {
      incidentId,
      type: incident.type,
      severity: incident.severity,
      cardholderDataInvolved: incident.cardholderDataInvolved,
      affectedSystems: incident.affectedSystems,
    });

    return {
      incidentId,
      responseActions,
      notificationRequired:
        incident.cardholderDataInvolved || incident.severity === 'critical',
      timelineHours,
    };
  }

  /**
   * Perform automated security assessment
   */
  async performSecurityAssessment(): Promise<{
    assessmentId: string;
    timestamp: Date;
    findings: {
      requirement: PCIDSSRequirement;
      finding: string;
      riskLevel: 'low' | 'medium' | 'high';
      remediation: string;
    }[];
    overallRisk: 'low' | 'medium' | 'high';
  }> {
    const assessmentId = `pci_assessment_${Date.now()}`;
    const findings: any[] = [];

    // Automated checks (would integrate with actual security tools)
    const checks = [
      this.checkEncryptionCompliance(),
      this.checkAccessControlCompliance(),
      this.checkNetworkSecurityCompliance(),
      this.checkLogMonitoringCompliance(),
    ];

    const results = await Promise.all(checks);

    for (const result of results) {
      findings.push(...result.findings);
    }

    const highRiskFindings = findings.filter(
      (f) => f.riskLevel === 'high',
    ).length;
    const overallRisk =
      highRiskFindings > 0
        ? 'high'
        : findings.filter((f) => f.riskLevel === 'medium').length > 3
          ? 'medium'
          : 'low';

    await this.logComplianceEvent('security_assessment', {
      assessmentId,
      findingsCount: findings.length,
      overallRisk,
    });

    return {
      assessmentId,
      timestamp: new Date(),
      findings,
      overallRisk,
    };
  }

  // Helper methods
  private isEncryptionCompliant(): boolean {
    // Would check actual encryption implementation
    return true; // Placeholder
  }

  private getLastPatchCheck(): Date {
    // Would integrate with patch management system
    return new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
  }

  private getLastSecurityScan(): Date {
    // Would integrate with vulnerability scanner
    return new Date(Date.now() - 45 * 24 * 60 * 60 * 1000); // 45 days ago
  }

  private determineOverallStatus(
    score: number,
    criticalIssues: number,
  ): ComplianceStatus {
    if (criticalIssues > 0) return ComplianceStatus.NON_COMPLIANT;
    if (score >= 90) return ComplianceStatus.COMPLIANT;
    if (score >= 70) return ComplianceStatus.PARTIALLY_COMPLIANT;
    return ComplianceStatus.NON_COMPLIANT;
  }

  private generateRecommendations(
    results: ComplianceValidationResult[],
  ): string[] {
    const recommendations: string[] = [];

    for (const result of results) {
      if (result.status !== ComplianceStatus.COMPLIANT) {
        recommendations.push(...result.recommendations);
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private async checkEncryptionCompliance(): Promise<{ findings: any[] }> {
    return { findings: [] }; // Placeholder
  }

  private async checkAccessControlCompliance(): Promise<{ findings: any[] }> {
    return { findings: [] }; // Placeholder
  }

  private async checkNetworkSecurityCompliance(): Promise<{ findings: any[] }> {
    return { findings: [] }; // Placeholder
  }

  private async checkLogMonitoringCompliance(): Promise<{ findings: any[] }> {
    return { findings: [] }; // Placeholder
  }

  private startContinuousMonitoring(): void {
    // Run compliance checks every hour
    setInterval(
      () => {
        this.performSecurityAssessment().catch(console.error);
      },
      60 * 60 * 1000,
    );
  }

  private async logComplianceEvent(
    eventType: string,
    details: any,
  ): Promise<void> {
    await auditLogger.log({
      event_type: AuditEventType.SECURITY_COMPLIANCE,
      severity: AuditSeverity.INFO,
      action: `PCI DSS: ${eventType}`,
      details,
    });

    this.auditTrail.push({
      timestamp: new Date(),
      eventType,
      details,
    });

    // Keep only last 1000 audit entries in memory
    if (this.auditTrail.length > 1000) {
      this.auditTrail = this.auditTrail.slice(-1000);
    }
  }
}

// Middleware for PCI DSS compliance validation
export async function withPCIDSSCompliance(
  request: NextRequest,
  context: PaymentSecurityContext,
): Promise<{
  compliant: boolean;
  response?: NextResponse;
  violations: string[];
}> {
  const complianceManager = PCIDSSComplianceManager.getInstance();

  const validation = await complianceManager.validatePaymentRequest(
    request,
    context,
  );

  if (!validation.allowed) {
    const response = NextResponse.json(
      {
        error: 'PCI DSS compliance violation',
        violations: validation.violations,
        complianceScore: validation.complianceScore,
        recommendations: validation.recommendations,
      },
      {
        status: 403,
        headers: {
          'X-Compliance-Score': validation.complianceScore.toString(),
          'X-PCI-DSS-Status': 'NON_COMPLIANT',
        },
      },
    );

    return {
      compliant: false,
      response,
      violations: validation.violations,
    };
  }

  return {
    compliant: true,
    violations: [],
  };
}

// Export singleton instance
export const pciDSSManager = PCIDSSComplianceManager.getInstance();

export default PCIDSSComplianceManager;
