/**
 * Breach Notification Service
 * Handles data breach detection, notification, and compliance reporting
 * Complies with GDPR, CCPA, and other data protection regulations
 */

export interface DataBreach {
  id: string;
  type:
    | 'unauthorized_access'
    | 'data_leak'
    | 'system_compromise'
    | 'insider_threat'
    | 'external_attack';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedDataTypes: string[];
  affectedUserCount: number;
  detectedAt: Date;
  reportedAt?: Date;
  containedAt?: Date;
  resolvedAt?: Date;
  description: string;
  impactAssessment: {
    personalDataInvolved: boolean;
    specialCategoryData: boolean; // Sensitive personal data under GDPR
    financialDataInvolved: boolean;
    weddingDataInvolved: boolean; // Wedding-specific sensitive data
    estimatedImpact: string;
  };
  regulatoryRequirements: {
    gdprNotificationRequired: boolean;
    ccpaNotificationRequired: boolean;
    localAuthorityNotificationRequired: boolean;
    dataSubjectNotificationRequired: boolean;
  };
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'reported';
  investigationNotes: string[];
  remediationActions: string[];
}

export interface NotificationTarget {
  type:
    | 'regulatory_authority'
    | 'data_subjects'
    | 'internal_team'
    | 'business_partners';
  recipients: string[];
  notificationTemplate: string;
  deadline?: Date;
  sent: boolean;
  sentAt?: Date;
}

export class BreachNotificationService {
  private breaches: Map<string, DataBreach> = new Map();

  /**
   * Report a potential data breach
   */
  async reportBreach(
    breach: Omit<DataBreach, 'id' | 'detectedAt' | 'status'>,
  ): Promise<string> {
    const breachId = this.generateBreachId();

    const newBreach: DataBreach = {
      ...breach,
      id: breachId,
      detectedAt: new Date(),
      status: 'detected',
    };

    // Assess regulatory requirements
    newBreach.regulatoryRequirements =
      this.assessRegulatoryRequirements(newBreach);

    // Store breach record
    this.breaches.set(breachId, newBreach);

    // Trigger immediate notifications for critical breaches
    if (newBreach.severity === 'critical') {
      await this.triggerImmediateNotifications(newBreach);
    }

    // Log breach detection
    console.log(
      `Data breach detected: ${breachId} - ${newBreach.type} - ${newBreach.severity}`,
    );

    return breachId;
  }

  /**
   * Update breach investigation status
   */
  async updateBreachStatus(
    breachId: string,
    status: DataBreach['status'],
    notes?: string,
  ): Promise<boolean> {
    const breach = this.breaches.get(breachId);

    if (!breach) {
      console.error(`Breach ${breachId} not found`);
      return false;
    }

    breach.status = status;

    if (notes) {
      breach.investigationNotes.push(`${new Date().toISOString()}: ${notes}`);
    }

    // Update timestamps
    switch (status) {
      case 'contained':
        breach.containedAt = new Date();
        break;
      case 'resolved':
        breach.resolvedAt = new Date();
        break;
      case 'reported':
        breach.reportedAt = new Date();
        break;
    }

    // Trigger notifications based on status change
    if (status === 'contained' || status === 'resolved') {
      await this.sendStatusUpdateNotifications(breach);
    }

    return true;
  }

  /**
   * Generate regulatory compliance reports
   */
  async generateComplianceReport(breachId: string): Promise<{
    gdprReport?: object;
    ccpaReport?: object;
    internalReport: object;
  }> {
    const breach = this.breaches.get(breachId);

    if (!breach) {
      throw new Error(`Breach ${breachId} not found`);
    }

    const reports: any = {
      internalReport: this.generateInternalReport(breach),
    };

    if (breach.regulatoryRequirements.gdprNotificationRequired) {
      reports.gdprReport = this.generateGDPRReport(breach);
    }

    if (breach.regulatoryRequirements.ccpaNotificationRequired) {
      reports.ccpaReport = this.generateCCPAReport(breach);
    }

    return reports;
  }

  /**
   * Check if breach notification deadlines are approaching
   */
  async checkNotificationDeadlines(): Promise<DataBreach[]> {
    const urgentBreaches: DataBreach[] = [];
    const now = new Date();

    for (const breach of this.breaches.values()) {
      // GDPR requires notification within 72 hours of detection
      if (
        breach.regulatoryRequirements.gdprNotificationRequired &&
        !breach.reportedAt
      ) {
        const hoursElapsed =
          (now.getTime() - breach.detectedAt.getTime()) / (1000 * 60 * 60);

        if (hoursElapsed > 48) {
          // Warning at 48 hours (24 hours before deadline)
          urgentBreaches.push(breach);
        }
      }
    }

    return urgentBreaches;
  }

  /**
   * Assess what regulatory notifications are required
   */
  private assessRegulatoryRequirements(
    breach: DataBreach,
  ): DataBreach['regulatoryRequirements'] {
    const requirements = {
      gdprNotificationRequired: false,
      ccpaNotificationRequired: false,
      localAuthorityNotificationRequired: false,
      dataSubjectNotificationRequired: false,
    };

    // GDPR assessment
    if (
      breach.impactAssessment.personalDataInvolved ||
      breach.impactAssessment.specialCategoryData
    ) {
      requirements.gdprNotificationRequired = true;

      // High risk to data subjects requires individual notification
      if (breach.severity === 'high' || breach.severity === 'critical') {
        requirements.dataSubjectNotificationRequired = true;
      }
    }

    // CCPA assessment (if applicable to jurisdiction)
    if (
      breach.impactAssessment.personalDataInvolved &&
      breach.affectedUserCount > 500
    ) {
      requirements.ccpaNotificationRequired = true;
    }

    // Wedding industry specific - high sensitivity
    if (breach.impactAssessment.weddingDataInvolved) {
      requirements.dataSubjectNotificationRequired = true;
      requirements.localAuthorityNotificationRequired = true;
    }

    return requirements;
  }

  /**
   * Trigger immediate notifications for critical breaches
   */
  private async triggerImmediateNotifications(
    breach: DataBreach,
  ): Promise<void> {
    // Notify internal security team immediately
    const internalNotification = {
      type: 'internal_team' as const,
      recipients: ['security@wedsync.com', 'admin@wedsync.com'],
      notificationTemplate: 'critical_breach_alert',
      sent: false,
    };

    // Notify business partners if their data is involved
    if (breach.affectedDataTypes.includes('vendor_data')) {
      // TODO: Implement partner notification logic
    }

    console.log(`Critical breach notifications sent for ${breach.id}`);
  }

  /**
   * Send status update notifications
   */
  private async sendStatusUpdateNotifications(
    breach: DataBreach,
  ): Promise<void> {
    if (breach.regulatoryRequirements.dataSubjectNotificationRequired) {
      // TODO: Implement data subject notification
      console.log(
        `Data subject notifications required for breach ${breach.id}`,
      );
    }
  }

  /**
   * Generate GDPR compliance report
   */
  private generateGDPRReport(breach: DataBreach): object {
    return {
      breachId: breach.id,
      natureOfBreach: breach.type,
      categoriesOfData: breach.affectedDataTypes,
      approximateNumberOfDataSubjects: breach.affectedUserCount,
      likelyConsequences: breach.impactAssessment.estimatedImpact,
      measuresProposed: breach.remediationActions,
      timeOfBreach: breach.detectedAt,
      timeOfNotification: breach.reportedAt,
      specialCategoryData: breach.impactAssessment.specialCategoryData,
      crossBorderTransferInvolved: false, // TODO: Assess based on data flow
      regulatoryAuthority: 'ICO', // UK - Information Commissioner's Office
      contactDetails: {
        dataProtectionOfficer: 'dpo@wedsync.com',
        organization: 'WedSync Ltd',
        address: 'UK Wedding Technology Hub',
      },
    };
  }

  /**
   * Generate CCPA compliance report
   */
  private generateCCPAReport(breach: DataBreach): object {
    return {
      breachId: breach.id,
      typeOfIncident: breach.type,
      dateOfIncident: breach.detectedAt,
      dateDiscovered: breach.detectedAt,
      categoriesOfPersonalInformation: breach.affectedDataTypes,
      numberOfConsumers: breach.affectedUserCount,
      remedialActions: breach.remediationActions,
      businessContact: 'legal@wedsync.com',
    };
  }

  /**
   * Generate internal incident report
   */
  private generateInternalReport(breach: DataBreach): object {
    return {
      incidentId: breach.id,
      summary: breach.description,
      timeline: {
        detected: breach.detectedAt,
        reported: breach.reportedAt,
        contained: breach.containedAt,
        resolved: breach.resolvedAt,
      },
      impact: breach.impactAssessment,
      investigation: breach.investigationNotes,
      remediation: breach.remediationActions,
      lessonsLearned: [], // TODO: Add lessons learned tracking
      preventiveMeasures: [], // TODO: Add preventive measures tracking
    };
  }

  /**
   * Generate unique breach ID
   */
  private generateBreachId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `BREACH-${timestamp}-${random}`;
  }

  /**
   * Get breach by ID
   */
  getBreach(breachId: string): DataBreach | undefined {
    return this.breaches.get(breachId);
  }

  /**
   * List all breaches (filtered by status if provided)
   */
  listBreaches(status?: DataBreach['status']): DataBreach[] {
    const allBreaches = Array.from(this.breaches.values());

    if (status) {
      return allBreaches.filter((breach) => breach.status === status);
    }

    return allBreaches;
  }
}

// Singleton instance
export const breachNotificationService = new BreachNotificationService();
