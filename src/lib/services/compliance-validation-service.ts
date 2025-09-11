/**
 * WS-155: Compliance Validation Service
 * Team C - Batch 15 - Round 3
 * CAN-SPAM and GDPR compliance validation for all communications
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

export interface ComplianceCheck {
  messageId: string;
  checkType: 'CAN-SPAM' | 'GDPR' | 'CCPA' | 'PECR';
  passed: boolean;
  violations: string[];
  timestamp: Date;
}

export interface CANSPAMRequirements {
  hasValidFromHeader: boolean;
  hasAccurateSubject: boolean;
  hasPhysicalAddress: boolean;
  hasUnsubscribeLink: boolean;
  unsubscribeIsHonored: boolean;
  identifiesAsAdvertisement: boolean;
  noMisleadingHeaders: boolean;
}

export interface GDPRRequirements {
  hasLawfulBasis: boolean;
  hasExplicitConsent: boolean;
  consentIsDocumented: boolean;
  dataMinimization: boolean;
  rightToErasure: boolean;
  rightToAccess: boolean;
  dataPortability: boolean;
  privacyByDesign: boolean;
  dataProtectionOfficer: boolean;
  dataProcessingAgreement: boolean;
}

export interface ConsentRecord {
  userId: string;
  consentType: string;
  consentDate: Date;
  consentMethod: string;
  ipAddress: string;
  consentText: string;
  withdrawnDate?: Date;
}

export class ComplianceValidationService {
  private supabase: SupabaseClient;
  private companyAddress: string;
  private privacyPolicyUrl: string;
  private unsubscribeUrl: string;
  private dataProtectionOfficerEmail: string;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.companyAddress =
      process.env.COMPANY_ADDRESS ||
      '123 Wedding Street, Suite 100, San Francisco, CA 94102';
    this.privacyPolicyUrl =
      process.env.PRIVACY_POLICY_URL || 'https://wedsync.com/privacy';
    this.unsubscribeUrl =
      process.env.UNSUBSCRIBE_URL || 'https://wedsync.com/unsubscribe';
    this.dataProtectionOfficerEmail =
      process.env.DPO_EMAIL || 'dpo@wedsync.com';
  }

  /**
   * Validate message compliance with all applicable regulations
   */
  public async validateCompliance(message: any): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    // Check CAN-SPAM compliance for all emails
    if (
      message.type === 'email' ||
      message.recipients?.some((r: any) => r.email)
    ) {
      const canSpamCheck = await this.validateCANSPAM(message);
      checks.push(canSpamCheck);
    }

    // Check GDPR compliance for EU recipients
    if (await this.isEURecipient(message)) {
      const gdprCheck = await this.validateGDPR(message);
      checks.push(gdprCheck);
    }

    // Check CCPA compliance for California recipients
    if (await this.isCaliforniaRecipient(message)) {
      const ccpaCheck = await this.validateCCPA(message);
      checks.push(ccpaCheck);
    }

    // Check PECR compliance for UK recipients
    if (await this.isUKRecipient(message)) {
      const pecrCheck = await this.validatePECR(message);
      checks.push(pecrCheck);
    }

    // Log compliance checks
    await this.logComplianceChecks(message.id, checks);

    return checks;
  }

  /**
   * Validate CAN-SPAM compliance
   */
  public async validateCANSPAM(message: any): Promise<ComplianceCheck> {
    const violations: string[] = [];
    const requirements: CANSPAMRequirements = {
      hasValidFromHeader: true,
      hasAccurateSubject: true,
      hasPhysicalAddress: false,
      hasUnsubscribeLink: false,
      unsubscribeIsHonored: true,
      identifiesAsAdvertisement: false,
      noMisleadingHeaders: true,
    };

    // Check for valid From header
    if (!message.from || !this.isValidEmail(message.from)) {
      requirements.hasValidFromHeader = false;
      violations.push('Invalid or missing From header');
    }

    // Check for accurate subject line
    if (message.isMarketing && !this.hasAccurateSubject(message)) {
      requirements.hasAccurateSubject = false;
      violations.push('Subject line may be misleading');
    }

    // Check for physical address
    if (!this.containsPhysicalAddress(message.content)) {
      requirements.hasPhysicalAddress = false;
      violations.push('Missing physical postal address');
    }

    // Check for unsubscribe link
    if (message.isMarketing && !this.containsUnsubscribeLink(message.content)) {
      requirements.hasUnsubscribeLink = false;
      violations.push('Missing unsubscribe mechanism');
    }

    // Check if unsubscribe requests are honored
    const unsubscribeHonored = await this.checkUnsubscribeHonored(
      message.recipients,
    );
    if (!unsubscribeHonored) {
      requirements.unsubscribeIsHonored = false;
      violations.push('Unsubscribe requests not honored within 10 days');
    }

    // Check if marketing messages are identified as advertisements
    if (
      message.isMarketing &&
      !this.identifiesAsAdvertisement(message.content)
    ) {
      requirements.identifiesAsAdvertisement = false;
      violations.push('Commercial message not identified as advertisement');
    }

    // Check for misleading headers
    if (this.hasMisleadingHeaders(message)) {
      requirements.noMisleadingHeaders = false;
      violations.push('Contains misleading header information');
    }

    return {
      messageId: message.id,
      checkType: 'CAN-SPAM',
      passed: violations.length === 0,
      violations,
      timestamp: new Date(),
    };
  }

  /**
   * Validate GDPR compliance
   */
  public async validateGDPR(message: any): Promise<ComplianceCheck> {
    const violations: string[] = [];
    const requirements: GDPRRequirements = {
      hasLawfulBasis: false,
      hasExplicitConsent: false,
      consentIsDocumented: false,
      dataMinimization: true,
      rightToErasure: true,
      rightToAccess: true,
      dataPortability: true,
      privacyByDesign: true,
      dataProtectionOfficer: true,
      dataProcessingAgreement: true,
    };

    // Check for lawful basis
    const lawfulBasis = await this.checkLawfulBasis(message);
    if (!lawfulBasis) {
      violations.push('No lawful basis for processing');
    } else {
      requirements.hasLawfulBasis = true;
    }

    // Check for explicit consent
    for (const recipient of message.recipients || []) {
      const consent = await this.checkExplicitConsent(recipient);
      if (!consent) {
        violations.push(
          `No explicit consent for recipient: ${recipient.email || recipient.sms}`,
        );
      } else {
        requirements.hasExplicitConsent = true;
        requirements.consentIsDocumented = true;
      }
    }

    // Check data minimization
    if (!this.checkDataMinimization(message)) {
      requirements.dataMinimization = false;
      violations.push('Excessive data collection');
    }

    // Check for privacy policy link
    if (!this.containsPrivacyPolicy(message.content)) {
      violations.push('Missing privacy policy link');
    }

    // Check for data protection officer contact
    if (!this.containsDPOContact(message.content)) {
      requirements.dataProtectionOfficer = false;
      violations.push('Missing DPO contact information');
    }

    // Check for right to erasure
    if (!this.supportsRightToErasure(message)) {
      requirements.rightToErasure = false;
      violations.push('Does not support right to erasure');
    }

    // Check for right to access
    if (!this.supportsRightToAccess(message)) {
      requirements.rightToAccess = false;
      violations.push('Does not support right to access');
    }

    // Check for data portability
    if (!this.supportsDataPortability(message)) {
      requirements.dataPortability = false;
      violations.push('Does not support data portability');
    }

    return {
      messageId: message.id,
      checkType: 'GDPR',
      passed: violations.length === 0,
      violations,
      timestamp: new Date(),
    };
  }

  /**
   * Validate CCPA compliance
   */
  public async validateCCPA(message: any): Promise<ComplianceCheck> {
    const violations: string[] = [];

    // Check for opt-out link
    if (!this.containsOptOutLink(message.content)) {
      violations.push('Missing "Do Not Sell My Personal Information" link');
    }

    // Check for privacy rights disclosure
    if (!this.containsPrivacyRights(message.content)) {
      violations.push('Missing privacy rights disclosure');
    }

    // Check for data collection notice
    if (!this.containsDataCollectionNotice(message.content)) {
      violations.push('Missing data collection notice');
    }

    return {
      messageId: message.id,
      checkType: 'CCPA',
      passed: violations.length === 0,
      violations,
      timestamp: new Date(),
    };
  }

  /**
   * Validate PECR compliance (UK)
   */
  public async validatePECR(message: any): Promise<ComplianceCheck> {
    const violations: string[] = [];

    // Check for cookie consent (if applicable)
    if (message.containsCookies && !(await this.hasCookieConsent(message))) {
      violations.push('Missing cookie consent');
    }

    // Check for marketing consent
    if (message.isMarketing && !(await this.hasMarketingConsent(message))) {
      violations.push(
        'Missing marketing consent for electronic communications',
      );
    }

    return {
      messageId: message.id,
      checkType: 'PECR',
      passed: violations.length === 0,
      violations,
      timestamp: new Date(),
    };
  }

  /**
   * Record consent
   */
  public async recordConsent(consent: ConsentRecord): Promise<void> {
    // Hash IP address for privacy
    const hashedIP = crypto
      .createHash('sha256')
      .update(consent.ipAddress)
      .digest('hex');

    await this.supabase.from('consent_records').insert({
      user_id: consent.userId,
      consent_type: consent.consentType,
      consent_date: consent.consentDate,
      consent_method: consent.consentMethod,
      hashed_ip: hashedIP,
      consent_text: consent.consentText,
      withdrawn_date: consent.withdrawnDate,
    });
  }

  /**
   * Withdraw consent
   */
  public async withdrawConsent(
    userId: string,
    consentType: string,
  ): Promise<void> {
    await this.supabase
      .from('consent_records')
      .update({ withdrawn_date: new Date() })
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .is('withdrawn_date', null);
  }

  /**
   * Check if recipient has given consent
   */
  public async hasConsent(
    recipientId: string,
    consentType: string,
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('consent_records')
      .select('*')
      .eq('user_id', recipientId)
      .eq('consent_type', consentType)
      .is('withdrawn_date', null)
      .order('consent_date', { ascending: false })
      .limit(1)
      .single();

    return !!data;
  }

  /**
   * Generate compliance report
   */
  public async generateComplianceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const { data: checks } = await this.supabase
      .from('compliance_checks')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    const { data: violations } = await this.supabase
      .from('compliance_violations')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    const summary = {
      totalChecks: checks?.length || 0,
      passedChecks: checks?.filter((c) => c.passed).length || 0,
      failedChecks: checks?.filter((c) => !c.passed).length || 0,
      complianceRate: 0,
      violationsByType: {} as any,
      topViolations: [] as any[],
    };

    if (summary.totalChecks > 0) {
      summary.complianceRate =
        (summary.passedChecks / summary.totalChecks) * 100;
    }

    // Group violations by type
    if (violations) {
      for (const violation of violations) {
        if (!summary.violationsByType[violation.violation_type]) {
          summary.violationsByType[violation.violation_type] = 0;
        }
        summary.violationsByType[violation.violation_type]++;
      }

      // Get top violations
      summary.topViolations = Object.entries(summary.violationsByType)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));
    }

    return {
      summary,
      checks,
      violations,
      recommendations: this.generateRecommendations(summary),
    };
  }

  /**
   * Generate compliance recommendations
   */
  private generateRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.complianceRate < 95) {
      recommendations.push(
        'Compliance rate below 95% - review message templates',
      );
    }

    if (summary.violationsByType['missing_unsubscribe'] > 0) {
      recommendations.push('Add unsubscribe links to all marketing emails');
    }

    if (summary.violationsByType['missing_address'] > 0) {
      recommendations.push('Include physical address in all commercial emails');
    }

    if (summary.violationsByType['no_consent'] > 0) {
      recommendations.push(
        'Implement explicit consent collection for EU recipients',
      );
    }

    if (summary.violationsByType['excessive_data'] > 0) {
      recommendations.push(
        'Review data collection practices for GDPR compliance',
      );
    }

    return recommendations;
  }

  // Helper methods

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private hasAccurateSubject(message: any): boolean {
    // Check if subject accurately represents content
    return true; // Simplified for example
  }

  private containsPhysicalAddress(content: any): boolean {
    const addressPattern = /\d+\s+[\w\s]+,\s+[\w\s]+,\s+[A-Z]{2}\s+\d{5}/i;
    return (
      addressPattern.test(content?.body || '') ||
      content?.body?.includes(this.companyAddress)
    );
  }

  private containsUnsubscribeLink(content: any): boolean {
    return (
      content?.body?.includes('unsubscribe') ||
      content?.body?.includes(this.unsubscribeUrl)
    );
  }

  private async checkUnsubscribeHonored(recipients: any[]): Promise<boolean> {
    // Check if any recipients who unsubscribed are still receiving emails
    for (const recipient of recipients || []) {
      const { data } = await this.supabase
        .from('unsubscribe_requests')
        .select('*')
        .eq('email', recipient.email || recipient.sms)
        .single();

      if (data) {
        const daysSinceUnsubscribe =
          (Date.now() - new Date(data.created_at).getTime()) /
          (1000 * 60 * 60 * 24);

        if (daysSinceUnsubscribe > 10) {
          return false; // Unsubscribe not honored within 10 days
        }
      }
    }
    return true;
  }

  private identifiesAsAdvertisement(content: any): boolean {
    const adIndicators = ['advertisement', 'ad', 'sponsored', 'promotional'];
    const bodyLower = content?.body?.toLowerCase() || '';
    return adIndicators.some((indicator) => bodyLower.includes(indicator));
  }

  private hasMisleadingHeaders(message: any): boolean {
    // Check for spoofed or misleading headers
    return false; // Simplified for example
  }

  private async isEURecipient(message: any): Promise<boolean> {
    // Check if any recipients are in EU
    const euCountries = [
      'DE',
      'FR',
      'IT',
      'ES',
      'NL',
      'BE',
      'PL',
      'SE',
      'DK',
      'FI',
    ];
    for (const recipient of message.recipients || []) {
      const { data } = await this.supabase
        .from('user_profiles')
        .select('country')
        .eq('email', recipient.email || recipient.sms)
        .single();

      if (data && euCountries.includes(data.country)) {
        return true;
      }
    }
    return false;
  }

  private async isCaliforniaRecipient(message: any): Promise<boolean> {
    // Check if any recipients are in California
    for (const recipient of message.recipients || []) {
      const { data } = await this.supabase
        .from('user_profiles')
        .select('state')
        .eq('email', recipient.email || recipient.sms)
        .single();

      if (data && data.state === 'CA') {
        return true;
      }
    }
    return false;
  }

  private async isUKRecipient(message: any): Promise<boolean> {
    // Check if any recipients are in UK
    for (const recipient of message.recipients || []) {
      const { data } = await this.supabase
        .from('user_profiles')
        .select('country')
        .eq('email', recipient.email || recipient.sms)
        .single();

      if (data && data.country === 'GB') {
        return true;
      }
    }
    return false;
  }

  private async checkLawfulBasis(message: any): Promise<boolean> {
    // Check if there's a lawful basis for processing (consent, contract, etc.)
    return await this.hasConsent(message.recipientId, 'communications');
  }

  private async checkExplicitConsent(recipient: any): Promise<boolean> {
    return await this.hasConsent(
      recipient.id || recipient.email || recipient.sms,
      'marketing',
    );
  }

  private checkDataMinimization(message: any): boolean {
    // Check if only necessary data is being processed
    const necessaryFields = ['email', 'name', 'wedding_date'];
    const messageFields = Object.keys(message.recipientData || {});
    return messageFields.every((field) => necessaryFields.includes(field));
  }

  private containsPrivacyPolicy(content: any): boolean {
    return (
      content?.body?.includes('privacy') ||
      content?.body?.includes(this.privacyPolicyUrl)
    );
  }

  private containsDPOContact(content: any): boolean {
    return (
      content?.body?.includes('data protection officer') ||
      content?.body?.includes(this.dataProtectionOfficerEmail)
    );
  }

  private supportsRightToErasure(message: any): boolean {
    // Check if system supports data deletion
    return true; // Assuming system supports this
  }

  private supportsRightToAccess(message: any): boolean {
    // Check if system supports data access requests
    return true; // Assuming system supports this
  }

  private supportsDataPortability(message: any): boolean {
    // Check if system supports data export
    return true; // Assuming system supports this
  }

  private containsOptOutLink(content: any): boolean {
    return (
      content?.body?.includes('Do Not Sell') ||
      content?.body?.includes('opt-out')
    );
  }

  private containsPrivacyRights(content: any): boolean {
    return (
      content?.body?.includes('privacy rights') ||
      content?.body?.includes('California Privacy Rights')
    );
  }

  private containsDataCollectionNotice(content: any): boolean {
    return (
      content?.body?.includes('collect') &&
      content?.body?.includes('personal information')
    );
  }

  private async hasCookieConsent(message: any): Promise<boolean> {
    return await this.hasConsent(message.recipientId, 'cookies');
  }

  private async hasMarketingConsent(message: any): Promise<boolean> {
    return await this.hasConsent(message.recipientId, 'marketing');
  }

  private async logComplianceChecks(
    messageId: string,
    checks: ComplianceCheck[],
  ): Promise<void> {
    for (const check of checks) {
      await this.supabase.from('compliance_checks').insert({
        message_id: messageId,
        check_type: check.checkType,
        passed: check.passed,
        violations: check.violations,
        timestamp: check.timestamp,
      });

      // Log violations separately for reporting
      if (!check.passed) {
        for (const violation of check.violations) {
          await this.supabase.from('compliance_violations').insert({
            message_id: messageId,
            violation_type: violation,
            check_type: check.checkType,
            timestamp: check.timestamp,
          });
        }
      }
    }
  }

  /**
   * Audit trail for all communications
   */
  public async createAuditTrail(message: any): Promise<void> {
    const auditRecord = {
      message_id: message.id,
      message_type: message.type,
      sender: message.from,
      recipients: JSON.stringify(message.recipients),
      content_hash: this.hashContent(message.content),
      provider: message.provider,
      compliance_checks: JSON.stringify(await this.validateCompliance(message)),
      timestamp: new Date(),
      ip_address: message.ipAddress,
      user_agent: message.userAgent,
      metadata: JSON.stringify(message.metadata || {}),
    };

    await this.supabase.from('communication_audit_logs').insert(auditRecord);
  }

  private hashContent(content: any): string {
    const contentStr = JSON.stringify(content);
    return crypto.createHash('sha256').update(contentStr).digest('hex');
  }
}

export default ComplianceValidationService;
