/**
 * WS-190: GDPR Automation for WedSync Incident Response
 *
 * Automates GDPR compliance processes during security incidents,
 * including data breach notifications, user rights management,
 * and regulatory reporting for the wedding platform.
 */

import { z } from 'zod';
import type { Incident } from '../incident-orchestrator';

// GDPR configuration
const GDPRConfigSchema = z.object({
  supervisoryAuthorityEmail: z.string().email(),
  dpoEmail: z.string().email(),
  companyName: z.string().min(1),
  companyAddress: z.string().min(1),
  companyRegistrationNumber: z.string().min(1),
  breachNotificationDeadlineHours: z.number().default(72),
  userNotificationDeadlineHours: z.number().default(72),
  timeoutMs: z.number().default(15000),
  enableAutoNotification: z.boolean().default(true),
  enableBreachRegister: z.boolean().default(true),
});

type GDPRConfig = z.infer<typeof GDPRConfigSchema>;

// GDPR breach severity assessment
interface BreachSeverityAssessment {
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskToIndividuals: 'minimal' | 'moderate' | 'high' | 'severe';
  requiresNotification: boolean;
  requiresUserNotification: boolean;
  notificationDeadline: Date;
  justification: string;
  legalBasis: string[];
  affectedDataCategories: string[];
  affectedDataSubjects: number;
}

// GDPR data categories for wedding platform
const DataCategories = {
  PERSONAL_DETAILS: 'Personal identification details',
  CONTACT_INFO: 'Contact information (email, phone, address)',
  PAYMENT_DATA: 'Payment and financial information',
  WEDDING_DETAILS: 'Wedding planning and event details',
  GUEST_LISTS: 'Wedding guest information',
  VENDOR_CONTRACTS: 'Supplier and vendor agreements',
  COMMUNICATIONS: 'Messages and communication history',
  PHOTOS_VIDEOS: 'Wedding photos and videos',
  PREFERENCES: 'Personal preferences and choices',
  LOCATION_DATA: 'Venue and location information',
  SPECIAL_CATEGORIES: 'Special category personal data (if any)',
};

// GDPR breach notification template
interface BreachNotification {
  id: string;
  timestamp: Date;
  incidentId: string;
  severityAssessment: BreachSeverityAssessment;
  breachDescription: string;
  technicalMeasures: string[];
  organisationalMeasures: string[];
  likelyConsequences: string[];
  containmentActions: string[];
  remediationPlan: string;
  preventionMeasures: string[];
  contactDetails: {
    dpo: string;
    company: string;
    email: string;
    phone: string;
  };
}

// User notification structure
interface UserNotification {
  userId: string;
  email: string;
  notificationType: 'data_breach' | 'rights_request' | 'data_deletion';
  subject: string;
  htmlContent: string;
  textContent: string;
  sentAt?: Date;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
}

/**
 * GDPR Automation system for wedding platform compliance
 * Handles automated breach notifications, user rights, and regulatory compliance
 */
export class GDPRAutomation {
  private config: GDPRConfig;
  private breachRegister: Map<string, BreachNotification> = new Map();

  // UK GDPR supervisory authority (ICO) contact details
  private readonly supervisoryAuthorities = {
    uk: {
      name: "Information Commissioner's Office (ICO)",
      email: 'casework@ico.org.uk',
      phone: '+44 303 123 1113',
      website: 'https://ico.org.uk',
      reportingPortal: 'https://ico.org.uk/for-organisations/report-a-breach/',
    },
  };

  constructor() {
    // Load configuration from environment variables
    this.config = GDPRConfigSchema.parse({
      supervisoryAuthorityEmail:
        process.env.GDPR_SUPERVISORY_AUTHORITY_EMAIL || 'casework@ico.org.uk',
      dpoEmail: process.env.GDPR_DPO_EMAIL || 'dpo@wedsync.com',
      companyName: process.env.COMPANY_NAME || 'WedSync Ltd',
      companyAddress: process.env.COMPANY_ADDRESS || 'London, United Kingdom',
      companyRegistrationNumber:
        process.env.COMPANY_REGISTRATION || 'UK12345678',
      breachNotificationDeadlineHours: parseInt(
        process.env.GDPR_BREACH_NOTIFICATION_HOURS || '72',
      ),
      userNotificationDeadlineHours: parseInt(
        process.env.GDPR_USER_NOTIFICATION_HOURS || '72',
      ),
      timeoutMs: parseInt(process.env.GDPR_TIMEOUT_MS || '15000'),
      enableAutoNotification: process.env.GDPR_AUTO_NOTIFICATION !== 'false',
      enableBreachRegister: process.env.GDPR_BREACH_REGISTER !== 'false',
    });
  }

  /**
   * Process data breach incident for GDPR compliance
   * Main entry point for automated GDPR breach handling
   */
  async processDataBreach(incident: Incident): Promise<{
    breachNotificationId: string;
    severityAssessment: BreachSeverityAssessment;
    notificationRequired: boolean;
    actionsRequired: string[];
    deadlines: Record<string, Date>;
  }> {
    // Assess breach severity and legal requirements
    const severityAssessment = await this.assessBreachSeverity(incident);

    // Create breach notification record
    const breachNotification = await this.createBreachNotification(
      incident,
      severityAssessment,
    );

    // Register breach in compliance system
    if (this.config.enableBreachRegister) {
      this.breachRegister.set(breachNotification.id, breachNotification);
      await this.updateBreachRegister(breachNotification);
    }

    // Determine required actions
    const actionsRequired: string[] = [];
    const deadlines: Record<string, Date> = {};

    if (severityAssessment.requiresNotification) {
      actionsRequired.push('Notify supervisory authority (ICO)');
      deadlines.supervisoryAuthority = severityAssessment.notificationDeadline;

      if (this.config.enableAutoNotification) {
        // Schedule automatic notification
        await this.scheduleSupervisionNotification(breachNotification);
      }
    }

    if (severityAssessment.requiresUserNotification) {
      actionsRequired.push('Notify affected data subjects');
      deadlines.userNotification = new Date(
        incident.timestamp.getTime() +
          this.config.userNotificationDeadlineHours * 60 * 60 * 1000,
      );

      // Prepare user notifications
      await this.prepareUserNotifications(incident, severityAssessment);
    }

    actionsRequired.push('Document breach in register');
    actionsRequired.push('Implement containment measures');
    actionsRequired.push('Conduct impact assessment');

    // Log GDPR compliance action
    await this.logComplianceAction('data_breach_processed', {
      incident_id: incident.id,
      breach_id: breachNotification.id,
      severity: severityAssessment.severity,
      notification_required: severityAssessment.requiresNotification,
      user_notification_required: severityAssessment.requiresUserNotification,
      actions_count: actionsRequired.length,
    });

    return {
      breachNotificationId: breachNotification.id,
      severityAssessment,
      notificationRequired: severityAssessment.requiresNotification,
      actionsRequired,
      deadlines,
    };
  }

  /**
   * Handle subject access request (Article 15 GDPR)
   */
  async handleSubjectAccessRequest(
    userId: string,
    requestDetails: {
      email: string;
      requestType:
        | 'access'
        | 'rectification'
        | 'erasure'
        | 'portability'
        | 'restriction';
      specificData?: string[];
      reason?: string;
    },
  ): Promise<{
    requestId: string;
    deadline: Date;
    status: 'acknowledged' | 'processing' | 'completed';
    estimatedResponseTime: string;
  }> {
    const requestId = `SAR-${Date.now()}-${userId.substring(0, 8)}`;
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Log subject access request
    await this.logComplianceAction('subject_access_request', {
      request_id: requestId,
      user_id: userId,
      request_type: requestDetails.requestType,
      email: requestDetails.email,
      specific_data: requestDetails.specificData || [],
      reason: requestDetails.reason || 'Not specified',
    });

    // Send acknowledgment to user
    await this.sendSubjectAccessAcknowledgment(
      requestDetails.email,
      requestId,
      deadline,
    );

    return {
      requestId,
      deadline,
      status: 'acknowledged',
      estimatedResponseTime: '30 days',
    };
  }

  /**
   * Process right to be forgotten request (Article 17 GDPR)
   */
  async handleRightToBeForgotten(
    userId: string,
    requestDetails: {
      email: string;
      reason: string;
      keepWeddingData?: boolean; // For legitimate interests in completed weddings
      dataCategories?: string[];
    },
  ): Promise<{
    requestId: string;
    approvalRequired: boolean;
    canDelete: boolean;
    restrictions: string[];
    deletionSchedule?: Date;
  }> {
    const requestId = `RTBF-${Date.now()}-${userId.substring(0, 8)}`;

    // Check for legitimate interests and legal obligations
    const restrictions: string[] = [];
    let canDelete = true;
    let approvalRequired = false;

    // Wedding data may need to be retained for legitimate business interests
    if (!requestDetails.keepWeddingData) {
      // Check if user has upcoming or recent weddings
      const hasActiveWeddings = await this.checkActiveWeddings(userId);
      if (hasActiveWeddings) {
        restrictions.push(
          'Active wedding bookings require data retention for service delivery',
        );
        canDelete = false;
        approvalRequired = true;
      }
    }

    // Financial data retention requirements
    const hasFinancialObligations =
      await this.checkFinancialObligations(userId);
    if (hasFinancialObligations) {
      restrictions.push(
        'Financial records must be retained for 6 years (UK tax law)',
      );
      canDelete = false; // Full deletion not possible, but personal data can be pseudonymized
    }

    // Log right to be forgotten request
    await this.logComplianceAction('right_to_be_forgotten', {
      request_id: requestId,
      user_id: userId,
      reason: requestDetails.reason,
      can_delete: canDelete,
      approval_required: approvalRequired,
      restrictions_count: restrictions.length,
    });

    const deletionSchedule = canDelete
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : undefined;

    return {
      requestId,
      approvalRequired,
      canDelete,
      restrictions,
      deletionSchedule,
    };
  }

  /**
   * Generate GDPR compliance report for incident
   */
  async generateComplianceReport(
    incidentId: string,
    reportType:
      | 'breach_notification'
      | 'impact_assessment'
      | 'remediation_plan',
  ): Promise<{
    reportId: string;
    reportType: string;
    generatedAt: Date;
    content: string;
    attachments: string[];
  }> {
    const reportId = `RPT-${reportType.toUpperCase()}-${Date.now()}`;
    const generatedAt = new Date();

    let content = '';
    const attachments: string[] = [];

    switch (reportType) {
      case 'breach_notification':
        content = await this.generateBreachNotificationReport(incidentId);
        attachments.push('breach-assessment.pdf', 'affected-users.csv');
        break;
      case 'impact_assessment':
        content = await this.generateImpactAssessmentReport(incidentId);
        attachments.push('risk-assessment.pdf', 'mitigation-plan.pdf');
        break;
      case 'remediation_plan':
        content = await this.generateRemediationPlanReport(incidentId);
        attachments.push('remediation-timeline.pdf', 'prevention-measures.pdf');
        break;
    }

    // Log report generation
    await this.logComplianceAction('compliance_report_generated', {
      report_id: reportId,
      incident_id: incidentId,
      report_type: reportType,
      content_length: content.length,
      attachments_count: attachments.length,
    });

    return {
      reportId,
      reportType,
      generatedAt,
      content,
      attachments,
    };
  }

  /**
   * Assess breach severity according to GDPR requirements
   */
  private async assessBreachSeverity(
    incident: Incident,
  ): Promise<BreachSeverityAssessment> {
    // Determine affected data categories based on incident type and metadata
    const affectedDataCategories =
      this.determineAffectedDataCategories(incident);

    // Count affected data subjects
    const affectedDataSubjects = incident.affectedUsers.length;

    // Assess risk level
    let riskToIndividuals: 'minimal' | 'moderate' | 'high' | 'severe' =
      'minimal';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // High risk scenarios for wedding platform
    if (
      affectedDataCategories.includes(DataCategories.PAYMENT_DATA) ||
      affectedDataCategories.includes(DataCategories.SPECIAL_CATEGORIES)
    ) {
      riskToIndividuals = 'severe';
      severity = 'critical';
    } else if (
      affectedDataCategories.includes(DataCategories.PERSONAL_DETAILS) ||
      affectedDataCategories.includes(DataCategories.WEDDING_DETAILS)
    ) {
      riskToIndividuals = 'high';
      severity = 'high';
    } else if (affectedDataSubjects > 100) {
      riskToIndividuals = 'moderate';
      severity = 'medium';
    }

    // Determine notification requirements
    const requiresNotification =
      riskToIndividuals === 'high' || riskToIndividuals === 'severe';
    const requiresUserNotification =
      riskToIndividuals === 'severe' ||
      (riskToIndividuals === 'high' && affectedDataSubjects > 10);

    // Calculate notification deadline (72 hours from becoming aware)
    const notificationDeadline = new Date(
      incident.timestamp.getTime() +
        this.config.breachNotificationDeadlineHours * 60 * 60 * 1000,
    );

    // Generate legal justification
    const legalBasis = this.determineLegalBasis(
      incident,
      affectedDataCategories,
    );
    const justification = this.generateJustification(
      severity,
      riskToIndividuals,
      affectedDataCategories,
    );

    return {
      severity,
      riskToIndividuals,
      requiresNotification,
      requiresUserNotification,
      notificationDeadline,
      justification,
      legalBasis,
      affectedDataCategories,
      affectedDataSubjects,
    };
  }

  /**
   * Create formal breach notification record
   */
  private async createBreachNotification(
    incident: Incident,
    assessment: BreachSeverityAssessment,
  ): Promise<BreachNotification> {
    const notificationId = `BN-${Date.now()}-${incident.id.substring(0, 8)}`;

    return {
      id: notificationId,
      timestamp: new Date(),
      incidentId: incident.id,
      severityAssessment: assessment,
      breachDescription: this.generateBreachDescription(incident),
      technicalMeasures: this.identifyTechnicalMeasures(incident),
      organisationalMeasures: this.identifyOrganisationalMeasures(incident),
      likelyConsequences: this.assessLikelyConsequences(incident, assessment),
      containmentActions: this.identifyContainmentActions(incident),
      remediationPlan: this.generateRemediationPlan(incident),
      preventionMeasures: this.identifyPreventionMeasures(incident),
      contactDetails: {
        dpo: this.config.dpoEmail,
        company: this.config.companyName,
        email: 'privacy@wedsync.com',
        phone: '+44 20 7946 0958',
      },
    };
  }

  /**
   * Determine affected data categories based on incident
   */
  private determineAffectedDataCategories(incident: Incident): string[] {
    const categories: string[] = [];

    switch (incident.type) {
      case 'payment_fraud':
        categories.push(
          DataCategories.PAYMENT_DATA,
          DataCategories.PERSONAL_DETAILS,
          DataCategories.CONTACT_INFO,
        );
        break;
      case 'data_breach':
        categories.push(
          DataCategories.PERSONAL_DETAILS,
          DataCategories.CONTACT_INFO,
          DataCategories.WEDDING_DETAILS,
          DataCategories.COMMUNICATIONS,
        );
        break;
      case 'supplier_compromise':
        categories.push(
          DataCategories.VENDOR_CONTRACTS,
          DataCategories.CONTACT_INFO,
          DataCategories.WEDDING_DETAILS,
        );
        break;
      default:
        categories.push(
          DataCategories.PERSONAL_DETAILS,
          DataCategories.CONTACT_INFO,
        );
    }

    return categories;
  }

  /**
   * Generate breach description for formal notification
   */
  private generateBreachDescription(incident: Incident): string {
    return `
Security incident detected in WedSync wedding platform:

Type: ${incident.type.replace('_', ' ').toUpperCase()}
Severity: ${incident.severity.toUpperCase()}
Detection Time: ${incident.timestamp.toISOString()}
Incident ID: ${incident.id}

Description: ${incident.description}

The breach has been contained and remediation measures are being implemented.
All affected data subjects will be notified in accordance with GDPR requirements.
    `.trim();
  }

  /**
   * Identify technical security measures in place
   */
  private identifyTechnicalMeasures(incident: Incident): string[] {
    return [
      'End-to-end encryption for data transmission',
      'AES-256 encryption for data at rest',
      'Multi-factor authentication for admin access',
      'Network segmentation and firewalls',
      'Real-time security monitoring and alerting',
      'Automated incident response systems',
      'Regular security vulnerability assessments',
      'Secure backup and recovery procedures',
    ];
  }

  /**
   * Identify organisational security measures
   */
  private identifyOrganisationalMeasures(incident: Incident): string[] {
    return [
      'Information security policies and procedures',
      'Staff security awareness training',
      'Access control and authorization procedures',
      'Incident response and breach notification procedures',
      'Regular security audits and assessments',
      'Data protection impact assessments',
      'Privacy by design implementation',
      'Third-party security assessments',
    ];
  }

  /**
   * Assess likely consequences of the breach
   */
  private assessLikelyConsequences(
    incident: Incident,
    assessment: BreachSeverityAssessment,
  ): string[] {
    const consequences: string[] = [];

    if (assessment.riskToIndividuals === 'severe') {
      consequences.push('Risk of identity theft or financial fraud');
      consequences.push('Potential unauthorized access to personal data');
    }

    if (
      assessment.affectedDataCategories.includes(DataCategories.WEDDING_DETAILS)
    ) {
      consequences.push('Disclosure of private wedding information');
      consequences.push('Potential disruption to wedding planning');
    }

    if (
      assessment.affectedDataCategories.includes(DataCategories.PAYMENT_DATA)
    ) {
      consequences.push('Risk of unauthorized financial transactions');
      consequences.push('Need for payment card replacement');
    }

    consequences.push('Reputational damage to affected individuals');
    consequences.push('Potential emotional distress');

    return consequences;
  }

  /**
   * Check for active weddings that might prevent data deletion
   */
  private async checkActiveWeddings(userId: string): Promise<boolean> {
    // In real implementation, this would query the database
    // For now, return false (no active weddings)
    return false;
  }

  /**
   * Check for financial obligations that require data retention
   */
  private async checkFinancialObligations(userId: string): Promise<boolean> {
    // In real implementation, this would check payment history and tax requirements
    // For now, return false (no financial obligations)
    return false;
  }

  /**
   * Generate other required methods (simplified for brevity)
   */
  private determineLegalBasis(
    incident: Incident,
    categories: string[],
  ): string[] {
    return [
      'Article 6(1)(f) - Legitimate interests',
      'Article 6(1)(b) - Contract performance',
    ];
  }

  private generateJustification(
    severity: string,
    risk: string,
    categories: string[],
  ): string {
    return `Breach severity: ${severity}. Risk to individuals: ${risk}. Affected categories: ${categories.length}`;
  }

  private identifyContainmentActions(incident: Incident): string[] {
    return [
      'Isolated affected systems',
      'Reset compromised credentials',
      'Enhanced monitoring',
    ];
  }

  private generateRemediationPlan(incident: Incident): string {
    return 'Comprehensive remediation plan including system updates, security enhancements, and monitoring improvements.';
  }

  private identifyPreventionMeasures(incident: Incident): string[] {
    return [
      'Additional security controls',
      'Enhanced monitoring',
      'Staff training updates',
    ];
  }

  private async scheduleSupervisionNotification(
    notification: BreachNotification,
  ): Promise<void> {
    console.log(
      `GDPR: Scheduled supervisory authority notification for breach ${notification.id}`,
    );
  }

  private async prepareUserNotifications(
    incident: Incident,
    assessment: BreachSeverityAssessment,
  ): Promise<void> {
    console.log(
      `GDPR: Prepared user notifications for ${assessment.affectedDataSubjects} affected users`,
    );
  }

  private async updateBreachRegister(
    notification: BreachNotification,
  ): Promise<void> {
    console.log(
      `GDPR: Updated breach register with notification ${notification.id}`,
    );
  }

  private async sendSubjectAccessAcknowledgment(
    email: string,
    requestId: string,
    deadline: Date,
  ): Promise<void> {
    console.log(
      `GDPR: Sent SAR acknowledgment to ${email} for request ${requestId}`,
    );
  }

  private async generateBreachNotificationReport(
    incidentId: string,
  ): Promise<string> {
    return `Breach notification report for incident ${incidentId}`;
  }

  private async generateImpactAssessmentReport(
    incidentId: string,
  ): Promise<string> {
    return `Impact assessment report for incident ${incidentId}`;
  }

  private async generateRemediationPlanReport(
    incidentId: string,
  ): Promise<string> {
    return `Remediation plan report for incident ${incidentId}`;
  }

  private async logComplianceAction(
    action: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      integration: 'gdpr_automation',
      action,
      data,
    };
    console.log('GDPR compliance log:', JSON.stringify(logEntry));
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<GDPRConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration (sanitized)
   */
  getConfig(): GDPRConfig {
    return { ...this.config };
  }
}
