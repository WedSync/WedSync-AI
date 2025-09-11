// Multi-Jurisdiction Compliance Service for International Weddings
import { supabase } from '@/lib/supabase/client';
import {
  ComplianceJurisdiction,
  WeddingJurisdictionCompliance,
  JurisdictionAssessmentRequest,
  ComplianceAssessmentResult,
  CrossBorderDataTransfer,
  BreachNotificationRequirement,
  InternationalWeddingComplexity,
  LocalizedNotificationContent,
  WeddingSpecificRisks,
  ComplianceAction,
  ComplianceMonitoringMetrics,
} from '@/lib/types/multi-jurisdiction-compliance';

export class MultiJurisdictionComplianceService {
  /**
   * Assess compliance requirements for an international wedding
   */
  async assessWeddingJurisdictionalRequirements(
    request: JurisdictionAssessmentRequest,
  ): Promise<ComplianceAssessmentResult> {
    try {
      console.log(
        '[MultiJurisdiction] Starting jurisdictional assessment for:',
        request,
      );

      // Get all unique countries involved
      const allCountries = new Set(
        [
          request.ceremonyCountry,
          request.receptionCountry,
          ...request.coupleResidenceCountries,
          ...request.expectedGuestCountries,
          ...request.vendorCountries,
        ].filter(Boolean),
      );

      // Fetch applicable jurisdictions
      const { data: jurisdictions, error: jurisdictionsError } = await supabase
        .from('compliance_jurisdictions')
        .select('*')
        .in('country_code', Array.from(allCountries))
        .eq('is_active', true);

      if (jurisdictionsError) {
        throw new Error(
          `Failed to fetch jurisdictions: ${jurisdictionsError.message}`,
        );
      }

      if (!jurisdictions || jurisdictions.length === 0) {
        throw new Error(
          'No applicable jurisdictions found for the specified countries',
        );
      }

      // Determine primary jurisdiction (ceremony location takes precedence)
      const primaryJurisdiction =
        jurisdictions.find((j) => j.country_code === request.ceremonyCountry) ||
        jurisdictions.find(
          (j) => j.country_code === request.receptionCountry,
        ) ||
        jurisdictions[0];

      // Calculate risk assessment
      const riskAssessment = this.calculateInternationalWeddingRisk(
        jurisdictions,
        request,
      );

      // Generate compliance actions
      const complianceActions = await this.generateComplianceActions(
        jurisdictions,
        request,
        riskAssessment,
      );

      // Create wedding jurisdiction compliance record
      const weddingJurisdictionCompliance =
        await this.createWeddingJurisdictionRecord(
          request,
          jurisdictions,
          primaryJurisdiction,
          riskAssessment,
        );

      return {
        weddingJurisdictionId: weddingJurisdictionCompliance.id,
        applicableJurisdictions: jurisdictions,
        primaryJurisdiction,
        riskAssessment: {
          overallRisk: riskAssessment.overallRisk,
          complexityScore: riskAssessment.score,
          crossBorderRisks: riskAssessment.factors.conflictingRegulations,
          mitigationRequirements:
            riskAssessment.recommendations.transferMechanisms,
        },
        requiredDocumentation: {
          legalBasisRequired:
            riskAssessment.recommendations.documentationRequirements,
          consentRequirements: this.extractConsentRequirements(jurisdictions),
          transferDocumentation:
            riskAssessment.recommendations.transferMechanisms,
        },
        complianceActions,
      };
    } catch (error) {
      console.error('[MultiJurisdiction] Assessment failed:', error);
      throw error;
    }
  }

  /**
   * Create breach notification requirements for multiple jurisdictions
   */
  async createMultiJurisdictionBreachNotifications(
    securityIncidentId: string,
    weddingJurisdictionId: string,
  ): Promise<BreachNotificationRequirement[]> {
    try {
      console.log(
        '[MultiJurisdiction] Creating breach notifications for incident:',
        securityIncidentId,
      );

      // Get wedding jurisdiction compliance record
      const { data: weddingCompliance, error: complianceError } = await supabase
        .from('wedding_jurisdiction_compliance')
        .select(
          `
          *,
          compliance_jurisdictions!inner(*)
        `,
        )
        .eq('id', weddingJurisdictionId)
        .single();

      if (complianceError || !weddingCompliance) {
        throw new Error(
          `Wedding jurisdiction not found: ${complianceError?.message}`,
        );
      }

      // Get all applicable jurisdictions
      const { data: jurisdictions, error: jurisdictionsError } = await supabase
        .from('compliance_jurisdictions')
        .select('*')
        .in('id', weddingCompliance.applicable_jurisdictions);

      if (jurisdictionsError || !jurisdictions) {
        throw new Error(
          `Failed to fetch jurisdictions: ${jurisdictionsError?.message}`,
        );
      }

      const breachNotifications: BreachNotificationRequirement[] = [];

      // Create notification requirements for each jurisdiction
      for (const jurisdiction of jurisdictions) {
        const notificationRequired =
          await this.assessBreachNotificationRequirement(
            securityIncidentId,
            jurisdiction,
          );

        if (notificationRequired) {
          // Create the notification record
          const { data: notification, error: notificationError } =
            await supabase
              .from('multi_jurisdiction_breach_notifications')
              .insert({
                security_incident_id: securityIncidentId,
                wedding_jurisdiction_id: weddingJurisdictionId,
                jurisdiction_id: jurisdiction.id,
                notification_required: true,
                notification_deadline_hours:
                  jurisdiction.breach_notification_deadline_hours,
                localized_content:
                  await this.generateLocalizedNotificationContent(
                    jurisdiction,
                    securityIncidentId,
                  ),
                follow_up_required: this.requiresFollowUp(jurisdiction),
              })
              .select()
              .single();

          if (notificationError) {
            console.error(
              '[MultiJurisdiction] Failed to create notification:',
              notificationError,
            );
            continue;
          }

          breachNotifications.push({
            jurisdictionId: jurisdiction.id,
            jurisdiction: jurisdiction as ComplianceJurisdiction,
            notificationRequired: true,
            deadlineHours: jurisdiction.breach_notification_deadline_hours,
            authorityContact: {
              email: jurisdiction.authority_email,
              phone: jurisdiction.authority_phone,
              website: jurisdiction.authority_website,
            },
            requiredInformation:
              this.getRequiredNotificationInformation(jurisdiction),
            localizedTemplate: (await this.generateLocalizedNotificationContent(
              jurisdiction,
              securityIncidentId,
            )) as any,
            followUpRequirements: {
              required: this.requiresFollowUp(jurisdiction),
              deadlineDays: this.getFollowUpDeadlineDays(jurisdiction),
              format: 'written_report',
            },
          });
        }
      }

      console.log(
        `[MultiJurisdiction] Created ${breachNotifications.length} breach notifications`,
      );
      return breachNotifications;
    } catch (error) {
      console.error(
        '[MultiJurisdiction] Failed to create breach notifications:',
        error,
      );
      throw error;
    }
  }

  /**
   * Track cross-border data transfer
   */
  async trackCrossBorderDataTransfer(
    transfer: Partial<CrossBorderDataTransfer>,
  ): Promise<string> {
    try {
      console.log(
        '[MultiJurisdiction] Tracking cross-border data transfer:',
        transfer,
      );

      // Validate transfer mechanism
      const transferMechanism = await this.validateTransferMechanism(
        transfer.sourceCountry!,
        transfer.destinationCountry!,
        transfer.dataCategory!,
      );

      const { data: transferRecord, error } = await supabase
        .from('cross_border_data_transfers')
        .insert({
          organization_id: transfer.organizationId,
          wedding_jurisdiction_id: transfer.weddingJurisdictionId,
          data_category: transfer.dataCategory,
          source_country: transfer.sourceCountry,
          destination_country: transfer.destinationCountry,
          transfer_mechanism: transferMechanism,
          legal_basis: transfer.legalBasis || 'legitimate_interest',
          transfer_documentation: transfer.transferDocumentation,
          affected_data_subjects_count: transfer.affectedDataSubjectsCount || 0,
          data_subject_categories: transfer.dataSubjectCategories || [],
          transfer_risk_level: await this.assessTransferRisk(
            transfer.sourceCountry!,
            transfer.destinationCountry!,
            transfer.dataCategory!,
          ),
          risk_mitigation_measures: transfer.riskMitigationMeasures,
          next_review_date: this.calculateNextReviewDate(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to track transfer: ${error.message}`);
      }

      // Log the transfer for audit purposes
      await this.logComplianceAudit({
        organizationId: transfer.organizationId!,
        weddingJurisdictionId: transfer.weddingJurisdictionId,
        auditType: 'transfer',
        actionTaken: `Cross-border data transfer tracked: ${transfer.dataCategory} from ${transfer.sourceCountry} to ${transfer.destinationCountry}`,
        actionContext: {
          transferId: transferRecord.id,
          transferMechanism,
          riskLevel: transferRecord.transfer_risk_level,
        },
        complianceRequirementsChecked: ['international_transfer_compliance'],
        complianceStatus: 'compliant',
      });

      console.log(
        '[MultiJurisdiction] Cross-border transfer tracked successfully:',
        transferRecord.id,
      );
      return transferRecord.id;
    } catch (error) {
      console.error(
        '[MultiJurisdiction] Failed to track cross-border transfer:',
        error,
      );
      throw error;
    }
  }

  /**
   * Get compliance monitoring metrics
   */
  async getComplianceMonitoringMetrics(
    organizationId: string,
  ): Promise<ComplianceMonitoringMetrics> {
    try {
      const [weddingsResult, transfersResult, auditsResult, actionsResult] =
        await Promise.all([
          // Count weddings by jurisdiction complexity
          supabase
            .from('wedding_jurisdiction_compliance')
            .select('cross_border_processing_risk, compliance_complexity_score')
            .eq('organization_id', organizationId),

          // Count cross-border transfers
          supabase
            .from('cross_border_data_transfers')
            .select('transfer_risk_level')
            .eq('organization_id', organizationId),

          // Recent audits
          supabase
            .from('multi_jurisdiction_compliance_audit')
            .select('compliance_status')
            .eq('organization_id', organizationId)
            .gte(
              'audit_timestamp',
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            ),

          // Count jurisdictions
          supabase
            .from('compliance_jurisdictions')
            .select('country_code')
            .eq('is_active', true),
        ]);

      const weddings = weddingsResult.data || [];
      const transfers = transfersResult.data || [];
      const audits = auditsResult.data || [];
      const jurisdictions = actionsResult.data || [];

      // Calculate risk distribution
      const riskDistribution = transfers.reduce(
        (acc, transfer) => {
          acc[transfer.transfer_risk_level as keyof typeof acc]++;
          return acc;
        },
        { low: 0, medium: 0, high: 0, critical: 0 },
      );

      // Calculate compliance score (0-100)
      const totalAudits = audits.length;
      const compliantAudits = audits.filter(
        (a) => a.compliance_status === 'compliant',
      ).length;
      const complianceScore =
        totalAudits > 0
          ? Math.round((compliantAudits / totalAudits) * 100)
          : 100;

      return {
        totalWeddings: weddings.length,
        internationalWeddings: weddings.filter(
          (w) => w.compliance_complexity_score > 1,
        ).length,
        jurisdictionsCovered: new Set(jurisdictions.map((j) => j.country_code))
          .size,
        activeCompliance: weddings.filter(
          (w) => w.cross_border_processing_risk !== 'low',
        ).length,
        pendingActions: 0, // Would need to query compliance actions table
        overdueDates: 0, // Would need to check due dates
        riskDistribution,
        recentAudits: audits.length,
        complianceScore,
      };
    } catch (error) {
      console.error('[MultiJurisdiction] Failed to get metrics:', error);
      throw error;
    }
  }

  // Private helper methods
  private async createWeddingJurisdictionRecord(
    request: JurisdictionAssessmentRequest,
    jurisdictions: any[],
    primaryJurisdiction: any,
    riskAssessment: InternationalWeddingComplexity,
  ): Promise<WeddingJurisdictionCompliance> {
    const { data, error } = await supabase
      .from('wedding_jurisdiction_compliance')
      .insert({
        organization_id: request.organizationId,
        wedding_id: request.weddingId,
        ceremony_country_code: request.ceremonyCountry,
        reception_country_code: request.receptionCountry,
        couple_residence_countries: request.coupleResidenceCountries,
        guest_countries: request.expectedGuestCountries,
        vendor_countries: request.vendorCountries,
        applicable_jurisdictions: jurisdictions.map((j) => j.id),
        primary_jurisdiction: primaryJurisdiction.id,
        cross_border_processing_risk: riskAssessment.overallRisk,
        compliance_complexity_score: riskAssessment.score,
        legal_basis_documentation: {},
        transfer_mechanism_documentation: {},
        consent_documentation: {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        `Failed to create wedding jurisdiction record: ${error.message}`,
      );
    }

    return data;
  }

  private calculateInternationalWeddingRisk(
    jurisdictions: any[],
    request: JurisdictionAssessmentRequest,
  ): InternationalWeddingComplexity {
    const numberOfJurisdictions = jurisdictions.length;
    const crossBorderTransfers = this.countCrossBorderTransfers(request);

    // Check for conflicting regulations
    const conflictingRegulations =
      this.identifyConflictingRegulations(jurisdictions);
    const highRiskCombinations =
      this.identifyHighRiskCombinations(jurisdictions);

    // Calculate complexity score (1-10)
    let score = 1;
    score += Math.min(numberOfJurisdictions - 1, 3); // Up to +3 for multiple jurisdictions
    score += crossBorderTransfers > 0 ? 2 : 0; // +2 for cross-border transfers
    score += conflictingRegulations.length > 0 ? 2 : 0; // +2 for conflicts
    score += highRiskCombinations.length > 0 ? 2 : 0; // +2 for high-risk combinations

    const overallRisk =
      score <= 3
        ? 'low'
        : score <= 6
          ? 'medium'
          : score <= 8
            ? 'high'
            : 'critical';

    return {
      score: Math.min(score, 10),
      overallRisk,
      factors: {
        numberOfJurisdictions,
        crossBorderDataTransfers: crossBorderTransfers,
        conflictingRegulations,
        highRiskCombinations,
      },
      recommendations: {
        primaryCompliance:
          jurisdictions[0]?.data_protection_framework || 'GDPR',
        transferMechanisms: this.recommendTransferMechanisms(jurisdictions),
        documentationRequirements:
          this.getDocumentationRequirements(jurisdictions),
        ongoingObligations: this.getOngoingObligations(jurisdictions),
      },
    };
  }

  private async generateComplianceActions(
    jurisdictions: any[],
    request: JurisdictionAssessmentRequest,
    riskAssessment: InternationalWeddingComplexity,
  ): Promise<ComplianceAction[]> {
    const actions: ComplianceAction[] = [];
    let actionId = 1;

    // Generate actions based on jurisdictions and risk level
    for (const jurisdiction of jurisdictions) {
      // Legal basis documentation
      if (jurisdiction.guest_data_requirements?.explicit_consent_required) {
        actions.push({
          id: `action_${actionId++}`,
          type: 'legal_basis',
          title: `Establish Legal Basis - ${jurisdiction.country_name}`,
          description: `Document legal basis for processing guest data under ${jurisdiction.data_protection_framework}`,
          jurisdiction: jurisdiction.country_code,
          priority: 'high',
          status: 'pending',
        });
      }

      // Consent collection requirements
      if (jurisdiction.photo_consent_requirements?.written_consent_required) {
        actions.push({
          id: `action_${actionId++}`,
          type: 'consent_collection',
          title: `Photo Consent Collection - ${jurisdiction.country_name}`,
          description:
            'Set up written consent collection for wedding photography',
          jurisdiction: jurisdiction.country_code,
          priority: 'high',
          status: 'pending',
        });
      }
    }

    // Cross-border transfer actions
    if (riskAssessment.factors.crossBorderDataTransfers > 0) {
      actions.push({
        id: `action_${actionId++}`,
        type: 'transfer_mechanism',
        title: 'Implement Transfer Safeguards',
        description:
          'Set up appropriate safeguards for international data transfers',
        jurisdiction: 'multi',
        priority: 'critical',
        status: 'pending',
      });
    }

    return actions;
  }

  private async assessBreachNotificationRequirement(
    securityIncidentId: string,
    jurisdiction: any,
  ): Promise<boolean> {
    // Get incident details to assess if notification is required
    const { data: incident, error } = await supabase
      .from('security_incidents')
      .select('*')
      .eq('id', securityIncidentId)
      .single();

    if (error || !incident) {
      return false;
    }

    // Wedding industry specific assessment
    const highRiskDataTypes = [
      'guest_personal_data',
      'payment_information',
      'wedding_photos',
    ];
    const hasHighRiskData = incident.data_categories?.some((category: string) =>
      highRiskDataTypes.includes(category),
    );

    const hasLikelyHarm =
      incident.severity_level === 'high' ||
      incident.severity_level === 'critical';
    const affectedDataSubjects = incident.affected_data_subjects_count > 0;

    return hasHighRiskData && (hasLikelyHarm || affectedDataSubjects);
  }

  private async generateLocalizedNotificationContent(
    jurisdiction: any,
    securityIncidentId: string,
  ): Promise<LocalizedNotificationContent> {
    // This would typically integrate with translation services
    // For now, we'll provide templates for major languages
    const templates = {
      en: {
        subject: `Data Breach Notification - Wedding Platform Security Incident`,
        greeting: `Dear ${jurisdiction.authority_name},`,
        incidentSummary:
          'We are writing to notify you of a personal data breach involving our wedding platform.',
        dataSubjectsAffected:
          'The breach may have affected personal data of wedding guests and couples.',
        categoriesOfData:
          'Categories of data involved: guest contact information, dietary requirements, wedding photos.',
        likelyConsequences:
          'Potential consequences include privacy concerns and possible identity theft risk.',
        measuresTaken:
          'Immediate containment measures have been implemented and affected parties notified.',
        contactInformation:
          'For further information, please contact our Data Protection Officer.',
        closing:
          'We remain committed to protecting personal data and preventing future incidents.',
      },
      de: {
        subject:
          'Meldung einer Datenschutzverletzung - Hochzeitsplattform Sicherheitsvorfall',
        greeting: `Sehr geehrte Damen und Herren der ${jurisdiction.authority_name},`,
        incidentSummary:
          'Wir melden hiermit eine Verletzung personenbezogener Daten auf unserer Hochzeitsplattform.',
        dataSubjectsAffected:
          'Die Verletzung könnte personenbezogene Daten von Hochzeitsgästen und Brautpaaren betroffen haben.',
        categoriesOfData:
          'Betroffene Datenkategorien: Kontaktdaten der Gäste, Ernährungsanforderungen, Hochzeitsfotos.',
        likelyConsequences:
          'Mögliche Folgen sind Datenschutzbedenken und Identitätsdiebstahl-Risiko.',
        measuresTaken:
          'Sofortige Eindämmungsmaßnahmen wurden umgesetzt und Betroffene benachrichtigt.',
        contactInformation:
          'Für weitere Informationen kontaktieren Sie bitte unseren Datenschutzbeauftragten.',
        closing:
          'Wir bleiben dem Schutz personenbezogener Daten und der Verhinderung künftiger Vorfälle verpflichtet.',
      },
    };

    const language = jurisdiction.primary_language || 'en';
    const template =
      templates[language as keyof typeof templates] || templates.en;

    return {
      language,
      jurisdiction: jurisdiction.country_code,
      authorityName: jurisdiction.authority_name,
      templates: template,
      legalReferences: this.getLegalReferences(jurisdiction),
      requiredFields: this.getRequiredNotificationFields(jurisdiction),
    };
  }

  private countCrossBorderTransfers(
    request: JurisdictionAssessmentRequest,
  ): number {
    const ceremonyCountry = request.ceremonyCountry;
    const receptionCountry = request.receptionCountry;

    let transfers = 0;

    // Different ceremony/reception countries
    if (
      ceremonyCountry &&
      receptionCountry &&
      ceremonyCountry !== receptionCountry
    ) {
      transfers++;
    }

    // International guests
    if (request.expectedGuestCountries.length > 1) {
      transfers++;
    }

    // International vendors
    if (request.vendorCountries.length > 1) {
      transfers++;
    }

    return transfers;
  }

  private identifyConflictingRegulations(jurisdictions: any[]): string[] {
    const conflicts: string[] = [];

    // Example conflicts (would be more comprehensive in production)
    const hasGDPR = jurisdictions.some(
      (j) => j.data_protection_framework === 'GDPR',
    );
    const hasCCPA = jurisdictions.some((j) =>
      j.data_protection_framework?.includes('CCPA'),
    );

    if (hasGDPR && hasCCPA) {
      conflicts.push('GDPR-CCPA consent mechanism differences');
    }

    return conflicts;
  }

  private identifyHighRiskCombinations(jurisdictions: any[]): string[] {
    const risks: string[] = [];

    const countryCodes = jurisdictions.map((j) => j.country_code);

    // High-risk combinations for wedding industry
    if (
      countryCodes.includes('US') &&
      countryCodes.some((c) => ['DE', 'FR', 'IT'].includes(c))
    ) {
      risks.push('US-EU data transfer complexity');
    }

    return risks;
  }

  private recommendTransferMechanisms(jurisdictions: any[]): string[] {
    const mechanisms: string[] = [];

    const hasEU = jurisdictions.some((j) => j.region === 'EU');
    const hasUS = jurisdictions.some((j) => j.country_code === 'US');

    if (hasEU && hasUS) {
      mechanisms.push('Standard Contractual Clauses (SCCs)');
      mechanisms.push('Data Processing Agreements');
    }

    if (hasEU) {
      mechanisms.push('Adequacy Decision Verification');
    }

    mechanisms.push('Explicit Consent for International Transfers');

    return mechanisms;
  }

  private getDocumentationRequirements(jurisdictions: any[]): string[] {
    return [
      'Legal basis assessment documentation',
      'Data Processing Impact Assessment (DPIA)',
      'International transfer risk assessment',
      'Consent collection procedures',
      'Wedding-specific data handling protocols',
    ];
  }

  private getOngoingObligations(jurisdictions: any[]): string[] {
    return [
      'Regular compliance review (annually)',
      'Guest data subject rights handling',
      'Vendor data processor agreements',
      'Wedding photo consent management',
      'Cross-border transfer monitoring',
    ];
  }

  private extractConsentRequirements(jurisdictions: any[]): string[] {
    const requirements = new Set<string>();

    jurisdictions.forEach((jurisdiction) => {
      if (jurisdiction.guest_data_requirements?.explicit_consent_required) {
        requirements.add('Explicit consent for guest data processing');
      }
      if (jurisdiction.photo_consent_requirements?.written_consent_required) {
        requirements.add('Written consent for wedding photography');
      }
      if (
        jurisdiction.photo_consent_requirements?.commercial_use_separate_consent
      ) {
        requirements.add('Separate consent for commercial use of photos');
      }
    });

    return Array.from(requirements);
  }

  private async validateTransferMechanism(
    sourceCountry: string,
    destinationCountry: string,
    dataCategory: string,
  ): Promise<string> {
    // Simplified validation - would be more sophisticated in production
    if (sourceCountry === destinationCountry) {
      return 'adequacy_decision'; // Same country
    }

    // EU adequacy decisions
    const adequateCountries = ['CA', 'JP', 'NZ', 'CH', 'IL', 'KR', 'GB'];
    if (
      sourceCountry === 'DE' &&
      adequateCountries.includes(destinationCountry)
    ) {
      return 'adequacy_decision';
    }

    return 'sccs'; // Default to Standard Contractual Clauses
  }

  private async assessTransferRisk(
    sourceCountry: string,
    destinationCountry: string,
    dataCategory: string,
  ): Promise<'low' | 'medium' | 'high' | 'critical'> {
    // Wedding-specific risk assessment
    const sensitiveCategories = ['payment_data', 'guest_data'];
    const highRiskCountries = ['CN', 'RU']; // Example high-risk countries

    if (
      sensitiveCategories.includes(dataCategory) &&
      highRiskCountries.includes(destinationCountry)
    ) {
      return 'critical';
    }

    if (sensitiveCategories.includes(dataCategory)) {
      return 'high';
    }

    if (sourceCountry !== destinationCountry) {
      return 'medium';
    }

    return 'low';
  }

  private calculateNextReviewDate(): string {
    // Annual review for international transfers
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
  }

  private requiresFollowUp(jurisdiction: any): boolean {
    // EU jurisdictions typically require follow-up reports
    return jurisdiction.region === 'EU' || jurisdiction.region === 'Europe';
  }

  private getFollowUpDeadlineDays(jurisdiction: any): number {
    return jurisdiction.region === 'EU' ? 30 : 60; // 30 days for EU, 60 for others
  }

  private getRequiredNotificationInformation(jurisdiction: any): string[] {
    return [
      'Nature of the breach',
      'Categories of data subjects affected',
      'Approximate number of affected individuals',
      'Categories of personal data involved',
      'Likely consequences of the breach',
      'Measures taken to address the breach',
      'Contact information for further details',
    ];
  }

  private getLegalReferences(jurisdiction: any): string[] {
    const references: { [key: string]: string[] } = {
      GDPR: ['Article 33 GDPR', 'Article 34 GDPR'],
      'UK GDPR': ['Article 33 UK GDPR', 'Section 67 DPA 2018'],
      CCPA: ['Section 1798.82 Civil Code'],
      PIPEDA: ['Section 10.1 PIPEDA'],
    };

    return references[jurisdiction.data_protection_framework] || [];
  }

  private getRequiredNotificationFields(jurisdiction: any): string[] {
    return [
      'incident_reference',
      'breach_date',
      'discovery_date',
      'notification_date',
      'data_categories',
      'affected_count',
      'likely_consequences',
      'mitigation_measures',
    ];
  }

  private async logComplianceAudit(audit: Partial<any>): Promise<void> {
    try {
      await supabase.from('multi_jurisdiction_compliance_audit').insert({
        organization_id: audit.organizationId,
        wedding_jurisdiction_id: audit.weddingJurisdictionId,
        audit_type: audit.auditType,
        action_taken: audit.actionTaken,
        jurisdiction_id: audit.jurisdictionId,
        user_id: audit.userId,
        action_context: audit.actionContext || {},
        compliance_requirements_checked:
          audit.complianceRequirementsChecked || [],
        compliance_status: audit.complianceStatus || 'under_review',
        issues_identified: audit.issuesIdentified || [],
        recommendations: audit.recommendations || [],
      });
    } catch (error) {
      console.error('[MultiJurisdiction] Failed to log audit:', error);
    }
  }
}
