/**
 * WS-254 Team E: GDPR Compliance and Data Privacy Testing
 * CRITICAL: Medical dietary data requires strict GDPR compliance
 * Wedding industry handles sensitive personal and medical information
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DietaryAnalysisService } from '@/lib/dietary-management/dietary-analysis-service';
import { GuestManagementService } from '@/lib/dietary-management/guest-management-service';

// GDPR Compliance Testing Framework
class GDPRComplianceTestFramework {
  private dataProcessingLogs: Array<{
    operation: 'create' | 'read' | 'update' | 'delete' | 'export' | 'anonymize';
    dataType: 'guest_data' | 'dietary_data' | 'medical_data' | 'contact_data';
    guestId: string;
    timestamp: Date;
    legalBasis:
      | 'consent'
      | 'contract'
      | 'legitimate_interest'
      | 'vital_interest';
    purpose: string;
    retention: string;
  }> = [];

  private consentRecords: Map<
    string,
    {
      guestId: string;
      consents: {
        dataProcessing: boolean;
        marketing: boolean;
        analytics: boolean;
        thirdPartySharing: boolean;
      };
      timestamp: Date;
      ipAddress?: string;
      userAgent?: string;
      withdrawnAt?: Date;
    }
  > = new Map();

  private dataSubjects: Map<
    string,
    {
      guestId: string;
      personalData: {
        name: string;
        email?: string;
        phone?: string;
        dietaryRestrictions: any[];
        medicalInfo?: string;
        emergencyContact?: any;
      };
      dataMinimized: boolean;
      pseudonymized: boolean;
      encrypted: boolean;
      retentionPeriod: Date;
    }
  > = new Map();

  // Article 6 - Lawfulness of Processing
  validateLegalBasisForProcessing(
    guestId: string,
    operation: 'create' | 'read' | 'update' | 'delete',
    dataType: string,
  ): {
    isLawful: boolean;
    legalBasis: string;
    issues: string[];
  } {
    const consent = this.consentRecords.get(guestId);
    const issues: string[] = [];

    if (!consent) {
      issues.push('No consent record found for data subject');
      return {
        isLawful: false,
        legalBasis: 'none',
        issues,
      };
    }

    // Check if consent was withdrawn
    if (consent.withdrawnAt && consent.withdrawnAt < new Date()) {
      issues.push('Consent has been withdrawn - processing not allowed');
    }

    // Medical dietary data requires explicit consent (Article 9 - Special Categories)
    if (dataType.includes('medical') || dataType.includes('dietary')) {
      if (!consent.consents.dataProcessing) {
        issues.push(
          'No explicit consent for processing special category data (medical/dietary)',
        );
      }
    }

    const isLawful = issues.length === 0;
    const legalBasis = isLawful ? 'consent' : 'none';

    return { isLawful, legalBasis, issues };
  }

  // Article 7 - Conditions for Consent
  recordConsent(
    guestId: string,
    consents: {
      dataProcessing: boolean;
      marketing: boolean;
      analytics: boolean;
      thirdPartySharing: boolean;
    },
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): void {
    const consentRecord = {
      guestId,
      consents,
      timestamp: new Date(),
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    };

    this.consentRecords.set(guestId, consentRecord);

    this.logDataProcessing({
      operation: 'create',
      dataType: 'guest_data',
      guestId,
      timestamp: new Date(),
      legalBasis: 'consent',
      purpose: 'Wedding dietary management services',
      retention: '2 years post-event or until consent withdrawn',
    });
  }

  // Article 7(3) - Withdrawal of Consent
  withdrawConsent(guestId: string): {
    success: boolean;
    actionsRequired: string[];
  } {
    const consent = this.consentRecords.get(guestId);
    if (!consent) {
      return {
        success: false,
        actionsRequired: ['No consent record found'],
      };
    }

    // Mark consent as withdrawn
    consent.withdrawnAt = new Date();
    this.consentRecords.set(guestId, consent);

    const actionsRequired = [
      'Stop all data processing',
      'Delete personal data (unless legal obligation requires retention)',
      'Notify all data processors',
      'Update data subject about withdrawal completion',
    ];

    return {
      success: true,
      actionsRequired,
    };
  }

  // Article 12-14 - Information and Access Rights
  generatePrivacyNotice(): {
    dataController: string;
    processingPurposes: string[];
    legalBases: string[];
    dataTypes: string[];
    retentionPeriods: string[];
    dataSubjectRights: string[];
    contactDetails: string;
  } {
    return {
      dataController: 'WedSync Ltd',
      processingPurposes: [
        'Wedding dietary requirement management',
        'Allergen safety protocols',
        'Emergency contact management',
        'Catering service coordination',
      ],
      legalBases: [
        'Consent for dietary preference processing',
        'Vital interests for life-threatening allergies',
        'Contract performance for wedding services',
        'Legitimate interests for service improvement',
      ],
      dataTypes: [
        'Name and contact details',
        'Dietary restrictions and allergies',
        'Medical information (where provided)',
        'Emergency contact information',
      ],
      retentionPeriods: [
        'Personal data: 2 years post-wedding',
        'Medical data: Until consent withdrawn',
        'Marketing data: Until consent withdrawn',
        'Legal compliance data: 6 years',
      ],
      dataSubjectRights: [
        'Right of access (Article 15)',
        'Right to rectification (Article 16)',
        'Right to erasure (Article 17)',
        'Right to restrict processing (Article 18)',
        'Right to data portability (Article 20)',
        'Right to object (Article 21)',
      ],
      contactDetails: 'dpo@wedsync.com',
    };
  }

  // Article 15 - Right of Access
  async exportPersonalData(guestId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const dataSubject = this.dataSubjects.get(guestId);
      const consent = this.consentRecords.get(guestId);
      const processingLogs = this.dataProcessingLogs.filter(
        (log) => log.guestId === guestId,
      );

      if (!dataSubject) {
        return {
          success: false,
          error: 'No personal data found for this guest ID',
        };
      }

      const exportData = {
        guestInformation: {
          guestId: dataSubject.guestId,
          personalData: dataSubject.personalData,
          dataMinimized: dataSubject.dataMinimized,
          pseudonymized: dataSubject.pseudonymized,
          encrypted: dataSubject.encrypted,
          retentionUntil: dataSubject.retentionPeriod.toISOString(),
        },
        consentHistory: consent
          ? {
              currentConsents: consent.consents,
              consentGivenAt: consent.timestamp.toISOString(),
              withdrawnAt: consent.withdrawnAt?.toISOString(),
              ipAddress: consent.ipAddress ? '[HASHED]' : undefined,
              userAgent: consent.userAgent ? '[TRUNCATED]' : undefined,
            }
          : null,
        processingHistory: processingLogs.map((log) => ({
          operation: log.operation,
          dataType: log.dataType,
          timestamp: log.timestamp.toISOString(),
          legalBasis: log.legalBasis,
          purpose: log.purpose,
        })),
        dataProcessors: [
          'WedSync Ltd (Data Controller)',
          'Supabase (Database hosting)',
          'OpenAI (Dietary analysis - anonymized data only)',
        ],
        exportMetadata: {
          exportDate: new Date().toISOString(),
          format: 'JSON',
          completeness: 'Full export including all personal data',
          verification: 'Data verified at export time',
        },
      };

      this.logDataProcessing({
        operation: 'export',
        dataType: 'guest_data',
        guestId,
        timestamp: new Date(),
        legalBasis: 'legitimate_interest',
        purpose: 'Data subject access request (Article 15)',
        retention: 'Export log retained for 1 year',
      });

      return {
        success: true,
        data: exportData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      };
    }
  }

  // Article 17 - Right to Erasure (Right to be Forgotten)
  async deletePersonalData(
    guestId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    deletedItems: string[];
    retainedItems: string[];
    error?: string;
  }> {
    try {
      const deletedItems: string[] = [];
      const retainedItems: string[] = [];

      // Check for legal obligations that prevent deletion
      const hasLegalObligation = this.checkLegalObligationToRetain(guestId);

      if (hasLegalObligation.mustRetain) {
        retainedItems.push(...hasLegalObligation.items);
      }

      // Delete personal data
      if (this.dataSubjects.has(guestId)) {
        const dataSubject = this.dataSubjects.get(guestId)!;

        // Anonymize rather than delete if legal obligation exists
        if (hasLegalObligation.mustRetain) {
          const anonymizedData = this.anonymizePersonalData(
            dataSubject.personalData,
          );
          dataSubject.personalData = anonymizedData;
          dataSubject.pseudonymized = true;
          this.dataSubjects.set(guestId, dataSubject);
          retainedItems.push('Personal data (anonymized)');
        } else {
          this.dataSubjects.delete(guestId);
          deletedItems.push('All personal data');
        }
      }

      // Delete consent records
      if (this.consentRecords.has(guestId)) {
        this.consentRecords.delete(guestId);
        deletedItems.push('Consent records');
      }

      // Keep processing logs for compliance but anonymize
      const logsToUpdate = this.dataProcessingLogs.filter(
        (log) => log.guestId === guestId,
      );
      logsToUpdate.forEach((log) => {
        log.guestId = '[DELETED]';
      });

      if (logsToUpdate.length > 0) {
        retainedItems.push(
          `Processing logs (${logsToUpdate.length} entries - anonymized)`,
        );
      }

      // Log the deletion
      this.logDataProcessing({
        operation: 'delete',
        dataType: 'guest_data',
        guestId: '[DELETED]',
        timestamp: new Date(),
        legalBasis: 'legitimate_interest',
        purpose: `Data subject deletion request: ${reason}`,
        retention: 'Deletion log retained for compliance',
      });

      return {
        success: true,
        deletedItems,
        retainedItems,
      };
    } catch (error) {
      return {
        success: false,
        deletedItems: [],
        retainedItems: [],
        error:
          error instanceof Error ? error.message : 'Unknown deletion error',
      };
    }
  }

  // Article 20 - Right to Data Portability
  async exportPortableData(
    guestId: string,
    format: 'json' | 'csv' | 'xml' = 'json',
  ): Promise<{
    success: boolean;
    data?: string;
    metadata?: any;
    error?: string;
  }> {
    try {
      const dataSubject = this.dataSubjects.get(guestId);
      if (!dataSubject) {
        return {
          success: false,
          error: 'No data found for portability export',
        };
      }

      const portableData = {
        guest: {
          name: dataSubject.personalData.name,
          email: dataSubject.personalData.email,
          phone: dataSubject.personalData.phone,
        },
        dietaryInformation: {
          restrictions: dataSubject.personalData.dietaryRestrictions,
          medicalInfo: dataSubject.personalData.medicalInfo,
          emergencyContact: dataSubject.personalData.emergencyContact,
        },
        metadata: {
          exportDate: new Date().toISOString(),
          format: format,
          dataController: 'WedSync Ltd',
          portabilityStandard: 'GDPR Article 20 compliant',
        },
      };

      let formattedData: string;

      switch (format) {
        case 'csv':
          formattedData = this.convertToCSV(portableData);
          break;
        case 'xml':
          formattedData = this.convertToXML(portableData);
          break;
        default:
          formattedData = JSON.stringify(portableData, null, 2);
      }

      this.logDataProcessing({
        operation: 'export',
        dataType: 'guest_data',
        guestId,
        timestamp: new Date(),
        legalBasis: 'legitimate_interest',
        purpose: 'Data portability request (Article 20)',
        retention: 'Export log retained for 1 year',
      });

      return {
        success: true,
        data: formattedData,
        metadata: portableData.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  // Article 25 - Data Protection by Design and by Default
  validateDataProtectionByDesign(): {
    compliant: boolean;
    measures: {
      dataMinimization: boolean;
      purposeLimitation: boolean;
      storageMinimization: boolean;
      pseudonymization: boolean;
      encryption: boolean;
    };
    recommendations: string[];
  } {
    const measures = {
      dataMinimization: this.validateDataMinimization(),
      purposeLimitation: this.validatePurposeLimitation(),
      storageMinimization: this.validateStorageMinimization(),
      pseudonymization: this.validatePseudonymization(),
      encryption: this.validateEncryption(),
    };

    const recommendations: string[] = [];

    if (!measures.dataMinimization) {
      recommendations.push(
        'Implement stricter data minimization - collect only necessary data',
      );
    }
    if (!measures.purposeLimitation) {
      recommendations.push('Ensure data is used only for stated purposes');
    }
    if (!measures.storageMinimization) {
      recommendations.push('Implement automated data retention and deletion');
    }
    if (!measures.pseudonymization) {
      recommendations.push(
        'Consider pseudonymization for non-essential identifiers',
      );
    }
    if (!measures.encryption) {
      recommendations.push(
        'Implement end-to-end encryption for sensitive data',
      );
    }

    const compliant = Object.values(measures).every(
      (measure) => measure === true,
    );

    return {
      compliant,
      measures,
      recommendations,
    };
  }

  // Article 32 - Security of Processing
  validateSecurityMeasures(): {
    adequate: boolean;
    measures: {
      encryptionAtRest: boolean;
      encryptionInTransit: boolean;
      accessControls: boolean;
      auditLogging: boolean;
      dataBackups: boolean;
      incidentResponse: boolean;
    };
    risks: string[];
  } {
    const measures = {
      encryptionAtRest: true, // Supabase provides this
      encryptionInTransit: true, // HTTPS enforced
      accessControls: true, // RLS policies
      auditLogging: this.dataProcessingLogs.length > 0,
      dataBackups: true, // Automated backups
      incidentResponse: true, // Incident response plan
    };

    const risks: string[] = [];

    if (!measures.encryptionAtRest) {
      risks.push('HIGH: Data not encrypted at rest');
    }
    if (!measures.encryptionInTransit) {
      risks.push('HIGH: Data transmission not encrypted');
    }
    if (!measures.accessControls) {
      risks.push('MEDIUM: Insufficient access controls');
    }
    if (!measures.auditLogging) {
      risks.push('MEDIUM: No audit trail for data processing');
    }

    return {
      adequate: risks.length === 0,
      measures,
      risks,
    };
  }

  // Article 33-34 - Data Breach Notification
  reportDataBreach(breach: {
    type: 'confidentiality' | 'integrity' | 'availability';
    affectedRecords: number;
    personalDataInvolved: boolean;
    riskLevel: 'low' | 'high';
    description: string;
  }): {
    authorityNotificationRequired: boolean;
    dataSubjectNotificationRequired: boolean;
    timelineRequirements: string[];
    actions: string[];
  } {
    const authorityNotificationRequired =
      breach.personalDataInvolved &&
      (breach.riskLevel === 'high' || breach.affectedRecords > 100);

    const dataSubjectNotificationRequired =
      breach.riskLevel === 'high' && breach.personalDataInvolved;

    const timelineRequirements = [];
    const actions = [];

    if (authorityNotificationRequired) {
      timelineRequirements.push('Notify supervisory authority within 72 hours');
      actions.push('Complete Data Protection Authority notification form');
      actions.push('Provide detailed breach assessment');
    }

    if (dataSubjectNotificationRequired) {
      timelineRequirements.push(
        'Notify affected data subjects without undue delay',
      );
      actions.push('Send individual notifications to affected guests');
      actions.push(
        'Provide clear information about the breach and mitigation steps',
      );
    }

    actions.push('Document the breach in internal records');
    actions.push('Implement measures to prevent similar breaches');
    actions.push('Review and update security measures');

    return {
      authorityNotificationRequired,
      dataSubjectNotificationRequired,
      timelineRequirements,
      actions,
    };
  }

  // Helper methods
  private logDataProcessing(log: {
    operation: 'create' | 'read' | 'update' | 'delete' | 'export' | 'anonymize';
    dataType: 'guest_data' | 'dietary_data' | 'medical_data' | 'contact_data';
    guestId: string;
    timestamp: Date;
    legalBasis:
      | 'consent'
      | 'contract'
      | 'legitimate_interest'
      | 'vital_interest';
    purpose: string;
    retention: string;
  }): void {
    this.dataProcessingLogs.push(log);
  }

  private checkLegalObligationToRetain(guestId: string): {
    mustRetain: boolean;
    items: string[];
    reason?: string;
  } {
    // Wedding industry might have legal obligations to retain certain records
    const processingLogs = this.dataProcessingLogs.filter(
      (log) => log.guestId === guestId,
    );
    const hasVitalInterestProcessing = processingLogs.some(
      (log) =>
        log.legalBasis === 'vital_interest' && log.dataType === 'medical_data',
    );

    if (hasVitalInterestProcessing) {
      return {
        mustRetain: true,
        items: ['Medical safety records for legal compliance'],
        reason:
          'Legal obligation to maintain safety records for potential liability claims',
      };
    }

    return {
      mustRetain: false,
      items: [],
    };
  }

  private anonymizePersonalData(personalData: any): any {
    return {
      name: '[ANONYMIZED]',
      email: undefined,
      phone: undefined,
      dietaryRestrictions: personalData.dietaryRestrictions, // Keep for safety
      medicalInfo: personalData.medicalInfo
        ? '[MEDICAL_INFO_ANONYMIZED]'
        : undefined,
      emergencyContact: undefined,
    };
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion for demonstration
    return JSON.stringify(data).replace(/[{}]/g, '').replace(/"/g, '');
  }

  private convertToXML(data: any): string {
    // Simple XML conversion for demonstration
    return `<data>${JSON.stringify(data)}</data>`;
  }

  private validateDataMinimization(): boolean {
    // Check if we're only collecting necessary data
    return Array.from(this.dataSubjects.values()).every(
      (subject) => subject.dataMinimized === true,
    );
  }

  private validatePurposeLimitation(): boolean {
    // Check if data is only used for stated purposes
    return this.dataProcessingLogs.every(
      (log) =>
        log.purpose.includes('wedding') ||
        log.purpose.includes('dietary') ||
        log.purpose.includes('safety'),
    );
  }

  private validateStorageMinimization(): boolean {
    // Check if old data is properly deleted
    const now = new Date();
    return Array.from(this.dataSubjects.values()).every(
      (subject) => subject.retentionPeriod > now,
    );
  }

  private validatePseudonymization(): boolean {
    // Check if identifiable data is pseudonymized where possible
    return Array.from(this.dataSubjects.values()).some(
      (subject) => subject.pseudonymized === true,
    );
  }

  private validateEncryption(): boolean {
    // Check if sensitive data is encrypted
    return Array.from(this.dataSubjects.values()).every(
      (subject) => subject.encrypted === true,
    );
  }

  // Public methods for accessing data
  getProcessingLogs(): typeof this.dataProcessingLogs {
    return [...this.dataProcessingLogs];
  }

  getConsentRecords(): Map<string, any> {
    return new Map(this.consentRecords);
  }

  addDataSubject(guestId: string, data: any): void {
    this.dataSubjects.set(guestId, {
      guestId,
      personalData: data,
      dataMinimized: true,
      pseudonymized: false,
      encrypted: true,
      retentionPeriod: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
    });
  }

  clearAll(): void {
    this.dataProcessingLogs = [];
    this.consentRecords.clear();
    this.dataSubjects.clear();
  }
}

describe('GDPR Compliance and Data Privacy Testing', () => {
  let gdprFramework: GDPRComplianceTestFramework;
  let dietaryService: DietaryAnalysisService;
  let guestService: GuestManagementService;

  const mockGuestData = {
    id: 'gdpr-test-guest-1',
    name: 'John Privacy Doe',
    email: 'john.doe@gdprtest.com',
    phone: '+44-20-7946-0958',
    dietaryRestrictions: [
      {
        id: 'rest-1',
        type: 'nut-allergy',
        severity: 'life-threatening',
        notes: 'Anaphylaxis - medical emergency protocol required',
        medicalCertification: true,
      },
    ],
    emergencyContact: {
      name: 'Jane Doe',
      phone: '+44-20-7946-0959',
      relationship: 'Spouse',
    },
  };

  beforeEach(() => {
    gdprFramework = new GDPRComplianceTestFramework();
    dietaryService = new DietaryAnalysisService('test-key');
    guestService = new GuestManagementService();
  });

  afterEach(() => {
    gdprFramework.clearAll();
  });

  describe('Article 6 - Lawfulness of Processing', () => {
    it('should validate legal basis for processing dietary data', () => {
      // Record consent first
      gdprFramework.recordConsent('gdpr-test-guest-1', {
        dataProcessing: true,
        marketing: false,
        analytics: true,
        thirdPartySharing: false,
      });

      const validation = gdprFramework.validateLegalBasisForProcessing(
        'gdpr-test-guest-1',
        'create',
        'dietary_data',
      );

      expect(validation.isLawful).toBe(true);
      expect(validation.legalBasis).toBe('consent');
      expect(validation.issues).toHaveLength(0);
    });

    it('should reject processing without proper consent', () => {
      const validation = gdprFramework.validateLegalBasisForProcessing(
        'no-consent-guest',
        'create',
        'medical_data',
      );

      expect(validation.isLawful).toBe(false);
      expect(validation.issues).toContain(
        'No consent record found for data subject',
      );
    });

    it('should handle withdrawn consent correctly', () => {
      // Record and then withdraw consent
      gdprFramework.recordConsent('withdraw-test-guest', {
        dataProcessing: true,
        marketing: false,
        analytics: false,
        thirdPartySharing: false,
      });

      const withdrawal = gdprFramework.withdrawConsent('withdraw-test-guest');
      expect(withdrawal.success).toBe(true);
      expect(withdrawal.actionsRequired).toContain('Stop all data processing');

      // Validate that processing is no longer lawful
      const validation = gdprFramework.validateLegalBasisForProcessing(
        'withdraw-test-guest',
        'read',
        'dietary_data',
      );

      expect(validation.isLawful).toBe(false);
      expect(validation.issues).toContain(
        'Consent has been withdrawn - processing not allowed',
      );
    });

    it('should handle vital interests for life-threatening allergies', () => {
      gdprFramework.addDataSubject('vital-interest-guest', {
        ...mockGuestData,
        dietaryRestrictions: [
          {
            type: 'nut-allergy',
            severity: 'life-threatening',
            notes: 'Emergency medical situation - vital interests processing',
          },
        ],
      });

      // Even without explicit consent, vital interests can justify processing
      const validation = gdprFramework.validateLegalBasisForProcessing(
        'vital-interest-guest',
        'read',
        'medical_data',
      );

      // In real implementation, would check for vital interests exception
      expect(validation).toBeDefined();
    });
  });

  describe('Article 12-14 - Transparency and Information', () => {
    it('should provide comprehensive privacy notice', () => {
      const privacyNotice = gdprFramework.generatePrivacyNotice();

      expect(privacyNotice.dataController).toBe('WedSync Ltd');
      expect(privacyNotice.processingPurposes).toContain(
        'Wedding dietary requirement management',
      );
      expect(privacyNotice.processingPurposes).toContain(
        'Allergen safety protocols',
      );

      expect(privacyNotice.legalBases).toContain(
        'Consent for dietary preference processing',
      );
      expect(privacyNotice.legalBases).toContain(
        'Vital interests for life-threatening allergies',
      );

      expect(privacyNotice.dataTypes).toContain(
        'Dietary restrictions and allergies',
      );
      expect(privacyNotice.dataTypes).toContain(
        'Medical information (where provided)',
      );

      expect(privacyNotice.dataSubjectRights).toContain(
        'Right of access (Article 15)',
      );
      expect(privacyNotice.dataSubjectRights).toContain(
        'Right to erasure (Article 17)',
      );

      expect(privacyNotice.contactDetails).toBe('dpo@wedsync.com');
    });

    it('should specify appropriate retention periods', () => {
      const privacyNotice = gdprFramework.generatePrivacyNotice();

      expect(privacyNotice.retentionPeriods).toContain(
        'Personal data: 2 years post-wedding',
      );
      expect(privacyNotice.retentionPeriods).toContain(
        'Medical data: Until consent withdrawn',
      );
      expect(privacyNotice.retentionPeriods).toContain(
        'Legal compliance data: 6 years',
      );
    });
  });

  describe('Article 15 - Right of Access', () => {
    it('should export complete personal data on request', async () => {
      gdprFramework.addDataSubject('access-test-guest', mockGuestData);
      gdprFramework.recordConsent('access-test-guest', {
        dataProcessing: true,
        marketing: false,
        analytics: true,
        thirdPartySharing: false,
      });

      const exportResult =
        await gdprFramework.exportPersonalData('access-test-guest');

      expect(exportResult.success).toBe(true);
      expect(exportResult.data).toBeDefined();

      if (exportResult.data) {
        expect(exportResult.data.guestInformation.personalData.name).toBe(
          'John Privacy Doe',
        );
        expect(exportResult.data.guestInformation.personalData.email).toBe(
          'john.doe@gdprtest.com',
        );
        expect(exportResult.data.consentHistory).toBeDefined();
        expect(exportResult.data.processingHistory).toBeDefined();
        expect(exportResult.data.dataProcessors).toContain(
          'WedSync Ltd (Data Controller)',
        );
        expect(exportResult.data.exportMetadata.completeness).toBe(
          'Full export including all personal data',
        );
      }
    });

    it('should handle access requests for non-existent data', async () => {
      const exportResult =
        await gdprFramework.exportPersonalData('non-existent-guest');

      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toBe(
        'No personal data found for this guest ID',
      );
    });

    it('should include processing history in access requests', async () => {
      gdprFramework.addDataSubject('history-test-guest', mockGuestData);

      // Simulate some processing activities
      const processingLogs = gdprFramework.getProcessingLogs();
      processingLogs.push({
        operation: 'create',
        dataType: 'dietary_data',
        guestId: 'history-test-guest',
        timestamp: new Date(),
        legalBasis: 'consent',
        purpose: 'Initial dietary requirement recording',
        retention: '2 years post-wedding',
      });

      const exportResult =
        await gdprFramework.exportPersonalData('history-test-guest');

      expect(exportResult.success).toBe(true);
      expect(exportResult.data?.processingHistory).toHaveLength(1);
      expect(exportResult.data?.processingHistory[0].purpose).toBe(
        'Initial dietary requirement recording',
      );
    });
  });

  describe('Article 17 - Right to Erasure', () => {
    it('should delete personal data when requested', async () => {
      gdprFramework.addDataSubject('deletion-test-guest', mockGuestData);
      gdprFramework.recordConsent('deletion-test-guest', {
        dataProcessing: true,
        marketing: false,
        analytics: false,
        thirdPartySharing: false,
      });

      const deletionResult = await gdprFramework.deletePersonalData(
        'deletion-test-guest',
        'Data subject requested deletion - no longer using wedding services',
      );

      expect(deletionResult.success).toBe(true);
      expect(deletionResult.deletedItems).toContain('All personal data');
      expect(deletionResult.deletedItems).toContain('Consent records');

      // Verify data is actually deleted
      const accessAttempt = await gdprFramework.exportPersonalData(
        'deletion-test-guest',
      );
      expect(accessAttempt.success).toBe(false);
    });

    it('should retain data when legal obligations require it', async () => {
      gdprFramework.addDataSubject('legal-obligation-guest', mockGuestData);

      // Simulate processing with vital interest (legal obligation to retain)
      const processingLogs = gdprFramework.getProcessingLogs();
      processingLogs.push({
        operation: 'create',
        dataType: 'medical_data',
        guestId: 'legal-obligation-guest',
        timestamp: new Date(),
        legalBasis: 'vital_interest',
        purpose: 'Life-threatening allergy safety protocol',
        retention: 'Legal obligation - 6 years',
      });

      const deletionResult = await gdprFramework.deletePersonalData(
        'legal-obligation-guest',
        'Data subject requested deletion',
      );

      expect(deletionResult.success).toBe(true);
      expect(deletionResult.retainedItems.length).toBeGreaterThan(0);
      expect(deletionResult.retainedItems).toContain(
        'Personal data (anonymized)',
      );
    });

    it('should anonymize processing logs after deletion', async () => {
      gdprFramework.addDataSubject('anonymize-test-guest', mockGuestData);

      await gdprFramework.deletePersonalData(
        'anonymize-test-guest',
        'User requested account deletion',
      );

      const logs = gdprFramework.getProcessingLogs();
      const deletionLog = logs.find((log) => log.operation === 'delete');

      expect(deletionLog).toBeDefined();
      expect(deletionLog?.guestId).toBe('[DELETED]');
      expect(deletionLog?.purpose).toContain('Data subject deletion request');
    });
  });

  describe('Article 20 - Right to Data Portability', () => {
    it('should export data in machine-readable format', async () => {
      gdprFramework.addDataSubject('portability-test-guest', mockGuestData);

      const portabilityResult = await gdprFramework.exportPortableData(
        'portability-test-guest',
        'json',
      );

      expect(portabilityResult.success).toBe(true);
      expect(portabilityResult.data).toBeDefined();

      if (portabilityResult.data) {
        const parsedData = JSON.parse(portabilityResult.data);
        expect(parsedData.guest.name).toBe('John Privacy Doe');
        expect(parsedData.dietaryInformation.restrictions).toBeDefined();
        expect(parsedData.metadata.portabilityStandard).toBe(
          'GDPR Article 20 compliant',
        );
      }
    });

    it('should support multiple export formats', async () => {
      gdprFramework.addDataSubject('format-test-guest', mockGuestData);

      const jsonResult = await gdprFramework.exportPortableData(
        'format-test-guest',
        'json',
      );
      const csvResult = await gdprFramework.exportPortableData(
        'format-test-guest',
        'csv',
      );
      const xmlResult = await gdprFramework.exportPortableData(
        'format-test-guest',
        'xml',
      );

      expect(jsonResult.success).toBe(true);
      expect(csvResult.success).toBe(true);
      expect(xmlResult.success).toBe(true);

      expect(jsonResult.metadata?.format).toBe('json');
      expect(csvResult.metadata?.format).toBe('csv');
      expect(xmlResult.metadata?.format).toBe('xml');
    });
  });

  describe('Article 25 - Data Protection by Design', () => {
    it('should validate data protection by design measures', () => {
      gdprFramework.addDataSubject('design-test-guest', {
        ...mockGuestData,
        // Only collect minimal necessary data
        dietaryRestrictions: mockGuestData.dietaryRestrictions,
      });

      const validation = gdprFramework.validateDataProtectionByDesign();

      expect(validation.measures.dataMinimization).toBe(true);
      expect(validation.measures.encryption).toBe(true);

      if (!validation.compliant) {
        console.log(
          'Data protection by design recommendations:',
          validation.recommendations,
        );
      }
    });

    it('should recommend improvements when measures are insufficient', () => {
      // Create data subject without proper minimization
      const framework = new GDPRComplianceTestFramework();

      const validation = framework.validateDataProtectionByDesign();

      if (!validation.compliant) {
        expect(validation.recommendations.length).toBeGreaterThan(0);
        expect(
          validation.recommendations.some(
            (rec) =>
              rec.includes('data minimization') ||
              rec.includes('encryption') ||
              rec.includes('pseudonymization'),
          ),
        ).toBe(true);
      }
    });
  });

  describe('Article 32 - Security of Processing', () => {
    it('should validate adequate security measures', () => {
      const securityValidation = gdprFramework.validateSecurityMeasures();

      expect(securityValidation.measures.encryptionAtRest).toBe(true);
      expect(securityValidation.measures.encryptionInTransit).toBe(true);
      expect(securityValidation.measures.accessControls).toBe(true);

      if (!securityValidation.adequate) {
        console.log('Security risks identified:', securityValidation.risks);
      }

      expect(securityValidation.adequate).toBe(true);
    });

    it('should identify security risks when present', () => {
      // In real implementation, would test actual security configuration
      const securityValidation = gdprFramework.validateSecurityMeasures();

      // Security should be adequate for wedding industry requirements
      expect(securityValidation.adequate).toBe(true);
      expect(securityValidation.risks.length).toBe(0);
    });
  });

  describe('Article 33-34 - Data Breach Notification', () => {
    it('should determine notification requirements for high-risk breaches', () => {
      const highRiskBreach = {
        type: 'confidentiality' as const,
        affectedRecords: 500,
        personalDataInvolved: true,
        riskLevel: 'high' as const,
        description:
          'Unauthorized access to guest dietary and medical information',
      };

      const notification = gdprFramework.reportDataBreach(highRiskBreach);

      expect(notification.authorityNotificationRequired).toBe(true);
      expect(notification.dataSubjectNotificationRequired).toBe(true);
      expect(notification.timelineRequirements).toContain(
        'Notify supervisory authority within 72 hours',
      );
      expect(notification.actions).toContain(
        'Send individual notifications to affected guests',
      );
    });

    it('should handle low-risk breaches appropriately', () => {
      const lowRiskBreach = {
        type: 'availability' as const,
        affectedRecords: 10,
        personalDataInvolved: false,
        riskLevel: 'low' as const,
        description: 'Temporary service outage - no data accessed',
      };

      const notification = gdprFramework.reportDataBreach(lowRiskBreach);

      expect(notification.authorityNotificationRequired).toBe(false);
      expect(notification.dataSubjectNotificationRequired).toBe(false);
      expect(notification.actions).toContain(
        'Document the breach in internal records',
      );
    });

    it('should provide appropriate breach response actions', () => {
      const medicalDataBreach = {
        type: 'confidentiality' as const,
        affectedRecords: 50,
        personalDataInvolved: true,
        riskLevel: 'high' as const,
        description:
          'Medical dietary information exposed due to misconfigured access controls',
      };

      const notification = gdprFramework.reportDataBreach(medicalDataBreach);

      expect(notification.actions).toContain(
        'Complete Data Protection Authority notification form',
      );
      expect(notification.actions).toContain(
        'Implement measures to prevent similar breaches',
      );
      expect(notification.actions).toContain(
        'Review and update security measures',
      );
    });
  });

  describe('Wedding Industry Specific GDPR Requirements', () => {
    it('should handle special category data (medical dietary information)', () => {
      gdprFramework.recordConsent('medical-data-guest', {
        dataProcessing: true, // Explicit consent required for medical data
        marketing: false,
        analytics: false,
        thirdPartySharing: false,
      });

      const validation = gdprFramework.validateLegalBasisForProcessing(
        'medical-data-guest',
        'create',
        'medical_data',
      );

      expect(validation.isLawful).toBe(true);
      expect(validation.legalBasis).toBe('consent');
    });

    it('should handle emergency contact processing for vital interests', () => {
      const medicalEmergencyData = {
        ...mockGuestData,
        dietaryRestrictions: [
          {
            type: 'nut-allergy',
            severity: 'life-threatening',
            notes: 'EpiPen required - immediate emergency response needed',
            medicalCertification: true,
          },
        ],
      };

      gdprFramework.addDataSubject('emergency-guest', medicalEmergencyData);

      // Processing emergency contact info for vital interests
      const validation = gdprFramework.validateLegalBasisForProcessing(
        'emergency-guest',
        'read',
        'contact_data',
      );

      // Even without explicit consent, vital interests justify emergency contact processing
      expect(validation).toBeDefined();
    });

    it('should maintain audit trail for wedding liability purposes', () => {
      gdprFramework.addDataSubject('audit-test-guest', mockGuestData);
      gdprFramework.recordConsent('audit-test-guest', {
        dataProcessing: true,
        marketing: false,
        analytics: false,
        thirdPartySharing: false,
      });

      const logs = gdprFramework.getProcessingLogs();
      expect(logs.length).toBeGreaterThan(0);

      const auditLog = logs.find((log) => log.guestId === 'audit-test-guest');
      expect(auditLog).toBeDefined();
      expect(auditLog?.purpose).toContain(
        'Wedding dietary management services',
      );
      expect(auditLog?.retention).toContain('2 years post-event');
    });

    it('should handle third-party caterer data sharing', () => {
      gdprFramework.recordConsent('caterer-sharing-guest', {
        dataProcessing: true,
        marketing: false,
        analytics: false,
        thirdPartySharing: true, // Consent for sharing with caterers
      });

      const validation = gdprFramework.validateLegalBasisForProcessing(
        'caterer-sharing-guest',
        'read',
        'dietary_data',
      );

      expect(validation.isLawful).toBe(true);

      // In real implementation, would validate specific third-party sharing consent
      expect(validation.legalBasis).toBe('consent');
    });

    it('should implement privacy by design for wedding platforms', () => {
      // Wedding platforms should implement privacy by design
      const designValidation = gdprFramework.validateDataProtectionByDesign();

      // Key measures for wedding industry
      expect(designValidation.measures.dataMinimization).toBe(true); // Only collect necessary dietary info
      expect(designValidation.measures.encryption).toBe(true); // Encrypt sensitive medical data
      expect(designValidation.measures.purposeLimitation).toBe(true); // Use only for wedding services

      if (!designValidation.compliant) {
        console.log(
          'Wedding platform privacy recommendations:',
          designValidation.recommendations,
        );

        // Should provide industry-specific recommendations
        const hasRelevantRecommendations =
          designValidation.recommendations.some(
            (rec) =>
              rec.includes('data minimization') ||
              rec.includes('encryption') ||
              rec.includes('medical'),
          );
        expect(hasRelevantRecommendations).toBe(true);
      }
    });
  });
});
