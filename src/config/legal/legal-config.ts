/**
 * WS-176 GDPR Compliance System - Team D Round 1
 * Legal configuration system for different jurisdiction requirements
 *
 * @fileoverview Comprehensive legal configuration management system that handles
 * multi-jurisdictional compliance requirements, regulatory frameworks, and
 * automated adaptation to different legal environments for wedding platforms
 */

import {
  LegalConfiguration,
  Jurisdiction,
  Regulation,
  DataProtectionAuthority,
  LegalRequirement,
  PenaltyStructure,
  TransferRestriction,
  TransferMechanism,
  RequirementCategory,
  ComplianceLevel,
  LegalConfigurationError,
} from '../../types/gdpr-compliance';
import { createClient } from '@supabase/supabase-js';
import { auditLogger } from '../../lib/middleware/audit';

/**
 * Legal configuration management system
 * Manages jurisdiction-specific legal requirements and compliance frameworks
 */
export class LegalConfigurationManager {
  private static instance: LegalConfigurationManager;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  private configurations: Map<Jurisdiction, LegalConfiguration> = new Map();
  private lastUpdated: Date = new Date();

  private constructor() {
    this.initializeDefaultConfigurations();
  }

  /**
   * Singleton instance getter
   */
  public static getInstance(): LegalConfigurationManager {
    if (!LegalConfigurationManager.instance) {
      LegalConfigurationManager.instance = new LegalConfigurationManager();
    }
    return LegalConfigurationManager.instance;
  }

  /**
   * Initialize default legal configurations for major jurisdictions
   */
  private initializeDefaultConfigurations(): void {
    const configurations: LegalConfiguration[] = [
      // European Union (GDPR)
      {
        id: 'eu-gdpr-config',
        jurisdiction: 'EU',
        regulations: [
          {
            name: 'General Data Protection Regulation',
            abbreviation: 'GDPR',
            effectiveDate: new Date('2018-05-25'),
            lastAmended: new Date('2018-05-25'),
            scope: [
              'personal_data_processing',
              'data_subject_rights',
              'privacy_by_design',
            ],
            keyRequirements: [
              'Lawful basis for processing',
              'Data subject consent management',
              'Right to erasure (right to be forgotten)',
              'Data portability',
              'Privacy by design and by default',
              'Data Protection Impact Assessments',
              'Appointment of Data Protection Officer',
              'Breach notification (72 hours)',
            ],
            officialUrl: 'https://gdpr-info.eu/',
          },
        ],
        dataProtectionAuthority: {
          name: 'European Data Protection Board',
          jurisdiction: 'EU',
          contactInfo: {
            address: 'Rue Wiertz 60, 1047 Brussels, Belgium',
            email: 'edpb@edpb.europa.eu',
            website: 'https://edpb.europa.eu/',
            phone: '+32 2 281 95 00',
          },
          reportingRequirements: [
            {
              trigger: 'Personal data breach likely to result in risk',
              timeline: '72 hours',
              format: 'online_form',
              mandatoryFields: [
                'nature_of_breach',
                'data_categories',
                'affected_individuals',
                'likely_consequences',
                'measures_taken',
                'dpo_contact',
              ],
            },
          ],
          notificationTimeline: '72 hours',
        },
        requirements: [
          {
            id: 'gdpr-consent-management',
            category: 'consent_management',
            description: 'Implement comprehensive consent management system',
            legalReference: 'GDPR Article 7',
            compliance: 'mandatory',
            verificationMethod: 'Technical audit of consent mechanisms',
          },
          {
            id: 'gdpr-data-minimization',
            category: 'data_minimization',
            description:
              'Ensure data processing is limited to what is necessary',
            legalReference: 'GDPR Article 5(1)(c)',
            compliance: 'mandatory',
            verificationMethod: 'Data processing audit',
          },
          {
            id: 'gdpr-retention-limits',
            category: 'retention_limits',
            description: 'Implement automated data retention and deletion',
            legalReference: 'GDPR Article 5(1)(e)',
            compliance: 'mandatory',
            verificationMethod: 'Retention policy implementation review',
          },
          {
            id: 'gdpr-dpo-appointment',
            category: 'dpo_appointment',
            description: 'Appoint qualified Data Protection Officer',
            legalReference: 'GDPR Article 37',
            compliance: 'mandatory',
            implementationDeadline: new Date('2024-12-31'),
            verificationMethod: 'DPO qualification and activity review',
          },
          {
            id: 'gdpr-impact-assessments',
            category: 'impact_assessments',
            description:
              'Conduct Privacy Impact Assessments for high-risk processing',
            legalReference: 'GDPR Article 35',
            compliance: 'mandatory',
            verificationMethod: 'PIA documentation review',
          },
        ],
        penalties: {
          currency: 'EUR',
          maxFineAmount: 20000000, // €20 million
          maxFinePercentage: 4, // 4% of annual turnover
          criminalLiability: false,
          additionalConsequences: [
            'Processing ban',
            'Compensation orders',
            'Regulatory audits',
            'Reputational damage',
          ],
        },
        transferRestrictions: [
          {
            from: 'EU',
            to: 'US_CALIFORNIA',
            mechanism: 'standard_contractual_clauses',
            additionalSafeguards: ['Encryption in transit', 'Access controls'],
            isAllowed: true,
          },
          {
            from: 'EU',
            to: 'UK',
            mechanism: 'adequacy_decision',
            additionalSafeguards: [],
            isAllowed: true,
          },
          {
            from: 'EU',
            to: 'CANADA',
            mechanism: 'adequacy_decision',
            additionalSafeguards: [],
            isAllowed: true,
          },
        ],
        isActive: true,
        lastUpdated: new Date(),
      },

      // United Kingdom (UK GDPR)
      {
        id: 'uk-gdpr-config',
        jurisdiction: 'UK',
        regulations: [
          {
            name: 'UK General Data Protection Regulation',
            abbreviation: 'UK GDPR',
            effectiveDate: new Date('2021-01-01'),
            lastAmended: new Date('2021-01-01'),
            scope: [
              'personal_data_processing',
              'data_subject_rights',
              'privacy_by_design',
            ],
            keyRequirements: [
              'Lawful basis for processing',
              'Data subject consent management',
              'Right to erasure',
              'Data portability',
              'Privacy by design',
              'Data Protection Impact Assessments',
              'Data Protection Officer appointment',
              'Breach notification (72 hours to ICO)',
            ],
            officialUrl:
              'https://ico.org.uk/for-organisations/guide-to-data-protection/',
          },
        ],
        dataProtectionAuthority: {
          name: "Information Commissioner's Office",
          jurisdiction: 'UK',
          contactInfo: {
            address: 'Wycliffe House, Water Lane, Wilmslow, Cheshire SK9 5AF',
            email: 'casework@ico.org.uk',
            website: 'https://ico.org.uk/',
            phone: '+44 303 123 1113',
          },
          reportingRequirements: [
            {
              trigger: 'Personal data breach likely to result in risk',
              timeline: '72 hours',
              format: 'online_form',
              mandatoryFields: [
                'nature_of_breach',
                'data_categories',
                'affected_individuals',
                'likely_consequences',
                'measures_taken',
              ],
            },
          ],
          notificationTimeline: '72 hours',
        },
        requirements: [
          {
            id: 'uk-gdpr-consent',
            category: 'consent_management',
            description: 'Implement UK-specific consent requirements',
            legalReference: 'UK GDPR Article 7',
            compliance: 'mandatory',
            verificationMethod: 'Consent mechanism audit',
          },
        ],
        penalties: {
          currency: 'GBP',
          maxFineAmount: 17500000, // £17.5 million
          maxFinePercentage: 4,
          criminalLiability: false,
          additionalConsequences: [
            'Processing restrictions',
            'Compensation orders',
          ],
        },
        transferRestrictions: [],
        isActive: true,
        lastUpdated: new Date(),
      },

      // California (CCPA/CPRA)
      {
        id: 'ca-ccpa-config',
        jurisdiction: 'US_CALIFORNIA',
        regulations: [
          {
            name: 'California Privacy Rights Act',
            abbreviation: 'CPRA',
            effectiveDate: new Date('2023-01-01'),
            lastAmended: new Date('2023-01-01'),
            scope: [
              'consumer_privacy_rights',
              'data_sales_restrictions',
              'sensitive_data_protection',
            ],
            keyRequirements: [
              'Consumer right to know',
              'Consumer right to delete',
              'Consumer right to opt-out of sale/sharing',
              'Consumer right to correct',
              'Consumer right to limit sensitive data use',
              'Privacy policy disclosures',
              'Data minimization',
              'Risk assessments for sensitive data',
            ],
            officialUrl: 'https://cppa.ca.gov/',
          },
        ],
        dataProtectionAuthority: {
          name: 'California Privacy Protection Agency',
          jurisdiction: 'US_CALIFORNIA',
          contactInfo: {
            address: '2101 Arena Blvd, Sacramento, CA 95834',
            email: 'info@cppa.ca.gov',
            website: 'https://cppa.ca.gov/',
            phone: '+1 916 999-6714',
          },
          reportingRequirements: [
            {
              trigger:
                'Cybersecurity incident affecting sensitive personal information',
              timeline: 'Without unreasonable delay',
              format: 'online_form',
              mandatoryFields: [
                'incident_description',
                'affected_consumers',
                'data_elements_involved',
                'circumstances',
                'remediation_measures',
              ],
            },
          ],
          notificationTimeline: 'Without unreasonable delay',
        },
        requirements: [
          {
            id: 'ccpa-privacy-policy',
            category: 'privacy_by_design',
            description:
              'Maintain comprehensive privacy policy with required disclosures',
            legalReference: 'CCPA Section 1798.130',
            compliance: 'mandatory',
            verificationMethod: 'Privacy policy content review',
          },
          {
            id: 'ccpa-opt-out',
            category: 'data_subject_rights',
            description:
              'Provide clear opt-out mechanisms for data sales/sharing',
            legalReference: 'CCPA Section 1798.135',
            compliance: 'mandatory',
            verificationMethod: 'Opt-out mechanism functionality test',
          },
        ],
        penalties: {
          currency: 'USD',
          maxFineAmount: 7500, // $7,500 per violation (intentional)
          maxFinePercentage: 0,
          criminalLiability: false,
          additionalConsequences: [
            'Injunctive relief',
            'Civil lawsuits (damages up to $750 per consumer)',
          ],
        },
        transferRestrictions: [],
        isActive: true,
        lastUpdated: new Date(),
      },

      // Canada (PIPEDA)
      {
        id: 'ca-pipeda-config',
        jurisdiction: 'CANADA',
        regulations: [
          {
            name: 'Personal Information Protection and Electronic Documents Act',
            abbreviation: 'PIPEDA',
            effectiveDate: new Date('2001-01-01'),
            lastAmended: new Date('2015-06-18'),
            scope: [
              'personal_information_protection',
              'consent_requirements',
              'breach_notification',
            ],
            keyRequirements: [
              'Consent for collection, use, and disclosure',
              'Purpose limitation',
              'Data minimization',
              'Accuracy requirements',
              'Safeguards for personal information',
              'Openness about policies and practices',
              'Individual access rights',
              'Breach notification to Privacy Commissioner and individuals',
            ],
            officialUrl:
              'https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/',
          },
        ],
        dataProtectionAuthority: {
          name: 'Office of the Privacy Commissioner of Canada',
          jurisdiction: 'CANADA',
          contactInfo: {
            address: '30 Victoria Street, Gatineau, Quebec K1A 1H3',
            email: 'info@priv.gc.ca',
            website: 'https://www.priv.gc.ca/',
            phone: '+1 819 994-5444',
          },
          reportingRequirements: [
            {
              trigger:
                'Breach of security safeguards involving personal information',
              timeline: 'As soon as feasible',
              format: 'online_form',
              mandatoryFields: [
                'breach_description',
                'personal_information_involved',
                'affected_individuals',
                'circumstances',
                'steps_taken',
                'steps_being_taken',
              ],
            },
          ],
          notificationTimeline: 'As soon as feasible',
        },
        requirements: [
          {
            id: 'pipeda-consent',
            category: 'consent_management',
            description:
              'Obtain meaningful consent for personal information processing',
            legalReference: 'PIPEDA Schedule 1, Principle 3',
            compliance: 'mandatory',
            verificationMethod: 'Consent mechanism review',
          },
        ],
        penalties: {
          currency: 'CAD',
          maxFineAmount: 100000, // $100,000 for summary conviction
          maxFinePercentage: 0,
          criminalLiability: true,
          additionalConsequences: ['Compliance orders', 'Audit requirements'],
        },
        transferRestrictions: [],
        isActive: true,
        lastUpdated: new Date(),
      },
    ];

    configurations.forEach((config) => {
      this.configurations.set(config.jurisdiction, config);
    });

    this.lastUpdated = new Date();
  }

  /**
   * Get legal configuration for specific jurisdiction
   */
  public getConfiguration(
    jurisdiction: Jurisdiction,
  ): LegalConfiguration | null {
    const config = this.configurations.get(jurisdiction);
    if (!config) {
      console.warn(
        `No legal configuration found for jurisdiction: ${jurisdiction}`,
      );
      return null;
    }
    return config;
  }

  /**
   * Get all active configurations
   */
  public getAllConfigurations(): LegalConfiguration[] {
    return Array.from(this.configurations.values()).filter(
      (config) => config.isActive,
    );
  }

  /**
   * Get applicable jurisdictions for user/organization
   */
  public async getApplicableJurisdictions(
    userLocation?: string,
    organizationLocation?: string,
    processingLocations?: string[],
  ): Promise<Jurisdiction[]> {
    const applicable: Set<Jurisdiction> = new Set();

    // Add jurisdiction based on user location
    if (userLocation) {
      const userJurisdiction = this.mapLocationToJurisdiction(userLocation);
      if (userJurisdiction) {
        applicable.add(userJurisdiction);
      }
    }

    // Add jurisdiction based on organization location
    if (organizationLocation) {
      const orgJurisdiction =
        this.mapLocationToJurisdiction(organizationLocation);
      if (orgJurisdiction) {
        applicable.add(orgJurisdiction);
      }
    }

    // Add jurisdictions for processing locations
    if (processingLocations) {
      for (const location of processingLocations) {
        const jurisdiction = this.mapLocationToJurisdiction(location);
        if (jurisdiction) {
          applicable.add(jurisdiction);
        }
      }
    }

    return Array.from(applicable);
  }

  /**
   * Check if data transfer is allowed between jurisdictions
   */
  public isTransferAllowed(
    from: Jurisdiction,
    to: Jurisdiction,
    mechanism?: TransferMechanism,
  ): {
    allowed: boolean;
    requiredMechanism?: TransferMechanism;
    additionalSafeguards?: string[];
    restrictions?: string[];
  } {
    const fromConfig = this.configurations.get(from);
    if (!fromConfig) {
      return { allowed: false, restrictions: ['Unknown source jurisdiction'] };
    }

    // Check specific transfer restrictions
    const restriction = fromConfig.transferRestrictions.find(
      (r) => r.to === to,
    );
    if (restriction) {
      if (!restriction.isAllowed) {
        return {
          allowed: false,
          restrictions: ['Transfer explicitly prohibited by regulation'],
        };
      }

      if (mechanism && mechanism !== restriction.mechanism) {
        return {
          allowed: false,
          requiredMechanism: restriction.mechanism,
          restrictions: [
            `Required transfer mechanism: ${restriction.mechanism}`,
          ],
        };
      }

      return {
        allowed: true,
        requiredMechanism: restriction.mechanism,
        additionalSafeguards: restriction.additionalSafeguards,
      };
    }

    // Default rules for EU transfers
    if (from === 'EU') {
      const adequateCountries = [
        'UK',
        'CANADA',
        'SWITZERLAND',
        'NEW_ZEALAND',
        'JAPAN',
      ];
      const isAdequate = adequateCountries.some((country) =>
        to.includes(country),
      );

      if (isAdequate) {
        return {
          allowed: true,
          requiredMechanism: 'adequacy_decision',
        };
      } else {
        return {
          allowed: mechanism ? true : false,
          requiredMechanism: mechanism || 'standard_contractual_clauses',
          additionalSafeguards: [
            'Encryption in transit and at rest',
            'Access controls and logging',
            'Regular security assessments',
          ],
        };
      }
    }

    // Default: allow with standard safeguards
    return {
      allowed: true,
      requiredMechanism: 'standard_contractual_clauses',
      additionalSafeguards: ['Standard data protection measures'],
    };
  }

  /**
   * Get compliance requirements for specific category
   */
  public getRequirementsByCategory(
    jurisdiction: Jurisdiction,
    category: RequirementCategory,
  ): LegalRequirement[] {
    const config = this.configurations.get(jurisdiction);
    if (!config) {
      return [];
    }

    return config.requirements.filter((req) => req.category === category);
  }

  /**
   * Get mandatory requirements with approaching deadlines
   */
  public getMandatoryRequirementsWithDeadlines(
    jurisdiction: Jurisdiction,
    withinDays: number = 90,
  ): LegalRequirement[] {
    const config = this.configurations.get(jurisdiction);
    if (!config) {
      return [];
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + withinDays);

    return config.requirements.filter(
      (req) =>
        req.compliance === 'mandatory' &&
        req.implementationDeadline &&
        req.implementationDeadline <= cutoffDate,
    );
  }

  /**
   * Get breach notification requirements
   */
  public getBreachNotificationRequirements(jurisdiction: Jurisdiction): {
    timeline: string;
    authority: string;
    format: string;
    mandatoryFields: string[];
    contactInfo: any;
  } | null {
    const config = this.configurations.get(jurisdiction);
    if (!config) {
      return null;
    }

    const dpa = config.dataProtectionAuthority;
    const requirement = dpa.reportingRequirements.find((req) =>
      req.trigger.toLowerCase().includes('breach'),
    );

    if (!requirement) {
      return null;
    }

    return {
      timeline: requirement.timeline,
      authority: dpa.name,
      format: requirement.format,
      mandatoryFields: requirement.mandatoryFields,
      contactInfo: dpa.contactInfo,
    };
  }

  /**
   * Update configuration
   */
  public async updateConfiguration(
    jurisdiction: Jurisdiction,
    updates: Partial<LegalConfiguration>,
  ): Promise<void> {
    const existingConfig = this.configurations.get(jurisdiction);
    if (!existingConfig) {
      throw new LegalConfigurationError(
        `Configuration not found for jurisdiction: ${jurisdiction}`,
        jurisdiction,
      );
    }

    const updatedConfig: LegalConfiguration = {
      ...existingConfig,
      ...updates,
      id: existingConfig.id, // Prevent ID changes
      jurisdiction, // Prevent jurisdiction changes
      lastUpdated: new Date(),
    };

    // Validate updated configuration
    this.validateConfiguration(updatedConfig);

    // Update in memory
    this.configurations.set(jurisdiction, updatedConfig);

    // Store in database
    await this.saveConfiguration(updatedConfig);

    await auditLogger.log({
      event_type: 'LEGAL_CONFIGURATION_UPDATED',
      resource_type: 'legal_configuration',
      resource_id: updatedConfig.id,
      metadata: {
        jurisdiction,
        updated_fields: Object.keys(updates),
        updated_by: 'legal-configuration-manager',
      },
    });
  }

  /**
   * Add custom requirement
   */
  public async addRequirement(
    jurisdiction: Jurisdiction,
    requirement: Omit<LegalRequirement, 'id'>,
  ): Promise<string> {
    const config = this.configurations.get(jurisdiction);
    if (!config) {
      throw new LegalConfigurationError(
        `Configuration not found for jurisdiction: ${jurisdiction}`,
        jurisdiction,
      );
    }

    const requirementId = crypto.randomUUID();
    const fullRequirement: LegalRequirement = {
      id: requirementId,
      ...requirement,
    };

    // Validate requirement
    this.validateRequirement(fullRequirement);

    config.requirements.push(fullRequirement);
    config.lastUpdated = new Date();

    await this.saveConfiguration(config);

    await auditLogger.log({
      event_type: 'LEGAL_REQUIREMENT_ADDED',
      resource_type: 'legal_requirement',
      resource_id: requirementId,
      metadata: {
        jurisdiction,
        category: requirement.category,
        compliance_level: requirement.compliance,
        added_by: 'legal-configuration-manager',
      },
    });

    return requirementId;
  }

  /**
   * Check compliance status for jurisdiction
   */
  public async checkComplianceStatus(jurisdiction: Jurisdiction): Promise<{
    overallCompliance: number;
    mandatoryRequirements: {
      total: number;
      compliant: number;
      overdue: number;
    };
    recommendations: string[];
  }> {
    const config = this.configurations.get(jurisdiction);
    if (!config) {
      throw new LegalConfigurationError(
        `Configuration not found for jurisdiction: ${jurisdiction}`,
        jurisdiction,
      );
    }

    const mandatoryReqs = config.requirements.filter(
      (req) => req.compliance === 'mandatory',
    );
    const overdueReqs = this.getMandatoryRequirementsWithDeadlines(
      jurisdiction,
      0,
    );

    // This would integrate with actual compliance checking system
    const compliantCount = mandatoryReqs.length - overdueReqs.length;
    const overallCompliance =
      mandatoryReqs.length > 0
        ? Math.round((compliantCount / mandatoryReqs.length) * 100)
        : 100;

    const recommendations: string[] = [];

    if (overdueReqs.length > 0) {
      recommendations.push(
        `${overdueReqs.length} mandatory requirements are overdue`,
      );
    }

    const upcomingDeadlines = this.getMandatoryRequirementsWithDeadlines(
      jurisdiction,
      30,
    );
    if (upcomingDeadlines.length > 0) {
      recommendations.push(
        `${upcomingDeadlines.length} requirements have deadlines within 30 days`,
      );
    }

    return {
      overallCompliance,
      mandatoryRequirements: {
        total: mandatoryReqs.length,
        compliant: compliantCount,
        overdue: overdueReqs.length,
      },
      recommendations,
    };
  }

  /**
   * Get regulatory update notifications
   */
  public async checkForRegulatoryUpdates(): Promise<{
    updates: Array<{
      jurisdiction: Jurisdiction;
      regulation: string;
      updateType: 'amendment' | 'new_requirement' | 'deadline_change';
      description: string;
      effectiveDate: Date;
      actionRequired: boolean;
    }>;
    lastChecked: Date;
  }> {
    // This would integrate with regulatory update feeds
    // For now, return mock data
    const updates = [
      {
        jurisdiction: 'EU' as Jurisdiction,
        regulation: 'GDPR',
        updateType: 'amendment' as const,
        description:
          'Updates to standard contractual clauses for international transfers',
        effectiveDate: new Date('2024-06-01'),
        actionRequired: true,
      },
    ];

    return {
      updates,
      lastChecked: new Date(),
    };
  }

  /**
   * Helper methods
   */
  private mapLocationToJurisdiction(location: string): Jurisdiction | null {
    const mapping: Record<string, Jurisdiction> = {
      // EU countries
      DE: 'EU',
      FR: 'EU',
      IT: 'EU',
      ES: 'EU',
      NL: 'EU',
      BE: 'EU',
      AT: 'EU',
      PT: 'EU',
      GR: 'EU',
      IE: 'EU',
      FI: 'EU',
      DK: 'EU',
      SE: 'EU',
      PL: 'EU',
      CZ: 'EU',
      HU: 'EU',
      SK: 'EU',
      SI: 'EU',
      HR: 'EU',
      RO: 'EU',
      BG: 'EU',
      CY: 'EU',
      MT: 'EU',
      LU: 'EU',
      EE: 'EU',
      LV: 'EU',
      LT: 'EU',

      // Other jurisdictions
      UK: 'UK',
      GB: 'UK',
      'US-CA': 'US_CALIFORNIA',
      'CA-CA': 'US_CALIFORNIA',
      CA: 'CANADA',
      AU: 'AUSTRALIA',
      BR: 'BRAZIL',
      SG: 'SINGAPORE',
    };

    return mapping[location.toUpperCase()] || null;
  }

  private validateConfiguration(config: LegalConfiguration): void {
    if (!config.id || !config.jurisdiction) {
      throw new LegalConfigurationError(
        'Configuration must have ID and jurisdiction',
        config.jurisdiction,
      );
    }

    if (config.regulations.length === 0) {
      throw new LegalConfigurationError(
        'Configuration must have at least one regulation',
        config.jurisdiction,
      );
    }

    for (const requirement of config.requirements) {
      this.validateRequirement(requirement);
    }
  }

  private validateRequirement(requirement: LegalRequirement): void {
    if (!requirement.id || !requirement.category || !requirement.description) {
      throw new LegalConfigurationError(
        'Requirement must have ID, category, and description',
        undefined,
        requirement.id,
      );
    }

    if (
      requirement.compliance === 'mandatory' &&
      requirement.implementationDeadline &&
      requirement.implementationDeadline < new Date()
    ) {
      console.warn(
        `Mandatory requirement ${requirement.id} has a past deadline`,
      );
    }
  }

  private async saveConfiguration(config: LegalConfiguration): Promise<void> {
    const { error } = await this.supabase.from('legal_configurations').upsert([
      {
        id: config.id,
        jurisdiction: config.jurisdiction,
        regulations: config.regulations,
        data_protection_authority: config.dataProtectionAuthority,
        requirements: config.requirements,
        penalties: config.penalties,
        transfer_restrictions: config.transferRestrictions,
        is_active: config.isActive,
        last_updated: config.lastUpdated.toISOString(),
      },
    ]);

    if (error) {
      throw new LegalConfigurationError(
        `Failed to save configuration: ${error.message}`,
        config.jurisdiction,
      );
    }
  }

  /**
   * Export configuration for external systems
   */
  public exportConfiguration(
    jurisdiction: Jurisdiction,
    format: 'json' | 'xml' = 'json',
  ): string {
    const config = this.configurations.get(jurisdiction);
    if (!config) {
      throw new LegalConfigurationError(
        `Configuration not found for jurisdiction: ${jurisdiction}`,
        jurisdiction,
      );
    }

    if (format === 'json') {
      return JSON.stringify(config, null, 2);
    } else {
      // XML export would be implemented here
      throw new Error('XML export not yet implemented');
    }
  }

  /**
   * Import configuration from external source
   */
  public async importConfiguration(
    jurisdiction: Jurisdiction,
    configData: string,
    format: 'json' | 'xml' = 'json',
  ): Promise<void> {
    let parsedConfig: Partial<LegalConfiguration>;

    try {
      if (format === 'json') {
        parsedConfig = JSON.parse(configData);
      } else {
        throw new Error('XML import not yet implemented');
      }
    } catch (error) {
      throw new LegalConfigurationError(
        `Failed to parse configuration data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        jurisdiction,
      );
    }

    // Validate and apply imported configuration
    await this.updateConfiguration(jurisdiction, parsedConfig);

    await auditLogger.log({
      event_type: 'LEGAL_CONFIGURATION_IMPORTED',
      resource_type: 'legal_configuration',
      resource_id: `${jurisdiction}-import`,
      metadata: {
        jurisdiction,
        format,
        import_time: new Date().toISOString(),
      },
    });
  }
}

// Export singleton instance
export const legalConfigurationManager =
  LegalConfigurationManager.getInstance();
