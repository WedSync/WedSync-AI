/**
 * Data Protection Enforcement System for WedSync
 * Automated data protection policies and enforcement mechanisms for wedding data
 *
 * Features:
 * - Real-time data loss prevention (DLP)
 * - Automated access control enforcement
 * - Data classification and tagging
 * - Wedding-specific protection policies
 * - Cross-platform data protection
 * - Automated policy violation response
 */

import { createClient } from '@supabase/supabase-js';
import { SecurityAuditLogger } from './security-audit-logger';
import { GDPRComplianceEngine } from './gdpr-compliance-engine';
import {
  sanitizeInput,
  containsSqlInjection,
  containsXss,
} from './input-sanitization';

// Data Protection Types
export interface DataProtectionPolicy {
  policyId: string;
  name: string;
  description: string;
  policyType:
    | 'access_control'
    | 'data_loss_prevention'
    | 'encryption'
    | 'retention'
    | 'classification';
  rules: DataProtectionRule[];
  enforcement: 'warn' | 'block' | 'audit' | 'encrypt';
  scope: PolicyScope;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DataProtectionRule {
  ruleId: string;
  condition: RuleCondition;
  action: RuleAction;
  parameters: Record<string, any>;
}

export interface RuleCondition {
  type:
    | 'data_type'
    | 'user_role'
    | 'location'
    | 'time'
    | 'device'
    | 'network'
    | 'data_sensitivity';
  operator:
    | 'equals'
    | 'contains'
    | 'matches'
    | 'greater_than'
    | 'less_than'
    | 'in_list';
  value: any;
  additionalConditions?: RuleCondition[];
}

export interface RuleAction {
  type:
    | 'allow'
    | 'deny'
    | 'encrypt'
    | 'anonymize'
    | 'log'
    | 'alert'
    | 'require_approval';
  parameters: Record<string, any>;
}

export interface PolicyScope {
  organizationIds?: string[];
  weddingIds?: string[];
  dataTypes: WeddingDataType[];
  userRoles?: string[];
  applications?: string[];
}

export type WeddingDataType =
  | 'guest_personal_info'
  | 'guest_contact_details'
  | 'dietary_requirements'
  | 'photo_metadata'
  | 'vendor_communications'
  | 'payment_information'
  | 'rsvp_responses'
  | 'timeline_data'
  | 'form_submissions'
  | 'analytics_data';

export interface DataClassification {
  dataId: string;
  dataType: WeddingDataType;
  sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  personalDataTypes: PersonalDataType[];
  retentionPeriod: string;
  encryptionRequired: boolean;
  accessRestrictions: string[];
  complianceRequirements: string[];
}

export type PersonalDataType =
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'date_of_birth'
  | 'dietary_info'
  | 'medical_info'
  | 'photo_biometric'
  | 'preferences'
  | 'relationship_status';

export interface AccessRequest {
  requestId: string;
  userId: string;
  organizationId: string;
  weddingId?: string;
  dataType: WeddingDataType;
  requestedAccess: 'read' | 'write' | 'delete' | 'export';
  justification: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  deniedAt?: string;
  deniedReason?: string;
  expiresAt?: string;
}

export interface ViolationReport {
  violationId: string;
  policyId: string;
  policyName: string;
  violationType:
    | 'policy_violation'
    | 'access_denied'
    | 'data_leak'
    | 'unauthorized_access'
    | 'retention_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  organizationId: string;
  weddingId?: string;
  dataInvolved: WeddingDataType[];
  description: string;
  detectedAt: string;
  resolvedAt?: string;
  resolution?: string;
  metadata: Record<string, any>;
}

export class DataProtectionEnforcer {
  private supabase;
  private auditLogger: SecurityAuditLogger;
  private gdprEngine: GDPRComplianceEngine;
  private encryptionService: EncryptionService;
  private dlpEngine: DLPEngine;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.auditLogger = new SecurityAuditLogger();
    this.gdprEngine = new GDPRComplianceEngine();
    this.encryptionService = new EncryptionService();
    this.dlpEngine = new DLPEngine();
  }

  /**
   * Initialize default data protection policies for wedding data
   */
  async initializeDefaultPolicies(
    organizationId: string,
  ): Promise<DataProtectionPolicy[]> {
    const defaultPolicies: Partial<DataProtectionPolicy>[] = [
      {
        name: 'Guest Personal Data Protection',
        description:
          'Protect guest personal information from unauthorized access',
        policyType: 'access_control',
        rules: [
          {
            ruleId: 'guest_data_access',
            condition: {
              type: 'data_type',
              operator: 'in_list',
              value: ['guest_personal_info', 'guest_contact_details'],
            },
            action: {
              type: 'require_approval',
              parameters: {
                approverRoles: ['owner', 'admin'],
                autoApproveForRoles: ['owner'],
                timeoutHours: 24,
              },
            },
            parameters: {},
          },
        ],
        enforcement: 'block',
        scope: {
          organizationIds: [organizationId],
          dataTypes: ['guest_personal_info', 'guest_contact_details'],
          userRoles: ['member', 'viewer'],
        },
        priority: 1,
        enabled: true,
      },
      {
        name: 'Wedding Day Data Protection',
        description: 'Enhanced protection during wedding day',
        policyType: 'access_control',
        rules: [
          {
            ruleId: 'wedding_day_read_only',
            condition: {
              type: 'time',
              operator: 'equals',
              value: 'wedding_day',
            },
            action: {
              type: 'deny',
              parameters: {
                allowedOperations: ['read'],
                deniedOperations: ['write', 'delete', 'export'],
              },
            },
            parameters: {},
          },
        ],
        enforcement: 'block',
        scope: {
          organizationIds: [organizationId],
          dataTypes: [
            'guest_personal_info',
            'vendor_communications',
            'timeline_data',
          ],
          userRoles: ['member', 'viewer'],
        },
        priority: 10,
        enabled: true,
      },
      {
        name: 'Data Loss Prevention',
        description: 'Prevent bulk export and unauthorized data transfer',
        policyType: 'data_loss_prevention',
        rules: [
          {
            ruleId: 'bulk_export_limit',
            condition: {
              type: 'data_type',
              operator: 'contains',
              value: 'export',
              additionalConditions: [
                {
                  type: 'user_role',
                  operator: 'in_list',
                  value: ['member', 'viewer'],
                },
              ],
            },
            action: {
              type: 'require_approval',
              parameters: {
                maxRecordsWithoutApproval: 50,
                approverRoles: ['owner', 'admin'],
              },
            },
            parameters: {},
          },
        ],
        enforcement: 'block',
        scope: {
          organizationIds: [organizationId],
          dataTypes: [
            'guest_personal_info',
            'guest_contact_details',
            'vendor_communications',
          ],
          userRoles: ['member', 'viewer'],
        },
        priority: 5,
        enabled: true,
      },
      {
        name: 'Sensitive Data Encryption',
        description: 'Automatic encryption of sensitive wedding data',
        policyType: 'encryption',
        rules: [
          {
            ruleId: 'encrypt_sensitive_data',
            condition: {
              type: 'data_sensitivity',
              operator: 'greater_than',
              value: 'confidential',
            },
            action: {
              type: 'encrypt',
              parameters: {
                encryptionLevel: 'AES-256',
                keyRotationDays: 90,
              },
            },
            parameters: {},
          },
        ],
        enforcement: 'encrypt',
        scope: {
          organizationIds: [organizationId],
          dataTypes: [
            'guest_personal_info',
            'payment_information',
            'dietary_requirements',
          ],
          applications: ['wedsync', 'wedme'],
        },
        priority: 2,
        enabled: true,
      },
      {
        name: 'Data Retention Policy',
        description: 'Automatic data deletion after retention period',
        policyType: 'retention',
        rules: [
          {
            ruleId: 'auto_delete_expired_data',
            condition: {
              type: 'time',
              operator: 'greater_than',
              value: 'retention_period',
            },
            action: {
              type: 'anonymize',
              parameters: {
                keepAggregatedData: true,
                notifyBeforeDays: 30,
              },
            },
            parameters: {},
          },
        ],
        enforcement: 'audit',
        scope: {
          organizationIds: [organizationId],
          dataTypes: [
            'guest_personal_info',
            'form_submissions',
            'analytics_data',
          ],
        },
        priority: 3,
        enabled: true,
      },
    ];

    const createdPolicies: DataProtectionPolicy[] = [];

    for (const policyTemplate of defaultPolicies) {
      const policy: DataProtectionPolicy = {
        policyId: this.generatePolicyId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...policyTemplate,
      } as DataProtectionPolicy;

      const { data, error } = await this.supabase
        .from('data_protection_policies')
        .insert({
          policy_id: policy.policyId,
          organization_id: organizationId,
          name: policy.name,
          description: policy.description,
          policy_type: policy.policyType,
          rules: policy.rules,
          enforcement: policy.enforcement,
          scope: policy.scope,
          priority: policy.priority,
          enabled: policy.enabled,
          created_at: policy.createdAt,
          updated_at: policy.updatedAt,
        })
        .select()
        .single();

      if (!error && data) {
        createdPolicies.push(policy);

        await this.auditLogger.logConfigurationChange(
          'system',
          'data_protection',
          `policy/${policy.policyId}`,
          null,
          policy,
          {
            ipAddress: '127.0.0.1',
            userAgent: 'DataProtectionEnforcer',
            organizationId,
          },
        );
      }
    }

    return createdPolicies;
  }

  /**
   * Enforce data protection policies before data access
   */
  async enforceDataAccess(
    userId: string,
    organizationId: string,
    weddingId: string | null,
    dataType: WeddingDataType,
    operation: 'read' | 'write' | 'delete' | 'export',
    metadata: {
      ipAddress: string;
      userAgent: string;
      recordCount?: number;
      urgency?: string;
    },
  ): Promise<{
    allowed: boolean;
    requiresApproval: boolean;
    encryptionRequired: boolean;
    restrictions: string[];
    violationReports: ViolationReport[];
  }> {
    // Input validation
    if (
      containsSqlInjection(userId) ||
      containsSqlInjection(organizationId) ||
      (weddingId && containsSqlInjection(weddingId))
    ) {
      throw new Error('Invalid input detected');
    }

    const result = {
      allowed: false,
      requiresApproval: false,
      encryptionRequired: false,
      restrictions: [],
      violationReports: [],
    };

    try {
      // Get applicable policies
      const policies = await this.getApplicablePolicies(
        organizationId,
        dataType,
        userId,
      );

      // Check if it's wedding day (enhanced protection)
      const isWeddingDay = weddingId
        ? await this.isWeddingDay(weddingId)
        : false;

      // Get user context
      const userContext = await this.getUserContext(userId, organizationId);

      // Evaluate each policy
      for (const policy of policies.sort((a, b) => b.priority - a.priority)) {
        if (!policy.enabled) continue;

        const policyResult = await this.evaluatePolicy(policy, {
          userId,
          organizationId,
          weddingId,
          dataType,
          operation,
          isWeddingDay,
          userContext,
          metadata,
        });

        // Apply policy results
        if (policyResult.action === 'deny') {
          result.allowed = false;
          result.restrictions.push(`Denied by policy: ${policy.name}`);

          // Create violation report
          const violation = await this.createViolationReport({
            policyId: policy.policyId,
            policyName: policy.name,
            violationType: 'access_denied',
            userId,
            organizationId,
            weddingId,
            dataInvolved: [dataType],
            operation,
            metadata,
          });
          result.violationReports.push(violation);

          break; // First deny wins
        }

        if (policyResult.action === 'require_approval') {
          result.requiresApproval = true;
          result.restrictions.push(`Approval required: ${policy.name}`);
        }

        if (policyResult.action === 'encrypt') {
          result.encryptionRequired = true;
        }

        if (policyResult.action === 'allow') {
          result.allowed = true;
        }
      }

      // Default to allow if no policies explicitly deny
      if (!result.violationReports.length && !result.requiresApproval) {
        result.allowed = true;
      }

      // DLP check for data exfiltration
      if (
        operation === 'export' &&
        metadata.recordCount &&
        metadata.recordCount > 100
      ) {
        const dlpResult = await this.dlpEngine.checkDataExfiltration(
          userId,
          dataType,
          metadata.recordCount,
          userContext,
        );

        if (dlpResult.suspicious) {
          result.allowed = false;
          result.restrictions.push(
            'Data Loss Prevention: Suspicious bulk export detected',
          );

          const violation = await this.createViolationReport({
            policyId: 'dlp_bulk_export',
            policyName: 'Data Loss Prevention',
            violationType: 'data_leak',
            userId,
            organizationId,
            weddingId,
            dataInvolved: [dataType],
            operation,
            metadata: { ...metadata, dlpReason: dlpResult.reason },
          });
          result.violationReports.push(violation);
        }
      }

      // Log enforcement decision
      await this.auditLogger.logWeddingDataAccess(
        userId,
        weddingId || 'none',
        `data_protection_enforcement_${operation}`,
        this.mapDataTypeToResourceType(dataType),
        result.allowed ? 'success' : 'blocked',
        {
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          organizationId,
          recordsAccessed: metadata.recordCount,
        },
      );

      return result;
    } catch (error: any) {
      await this.auditLogger.logWeddingDataAccess(
        userId,
        weddingId || 'none',
        'data_protection_error',
        this.mapDataTypeToResourceType(dataType),
        'failure',
        {
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          organizationId,
          recordsAccessed: metadata.recordCount,
        },
      );

      throw new Error(`Data protection enforcement failed: ${error.message}`);
    }
  }

  /**
   * Create and manage access approval requests
   */
  async createAccessRequest(
    userId: string,
    organizationId: string,
    weddingId: string | null,
    dataType: WeddingDataType,
    requestedAccess: 'read' | 'write' | 'delete' | 'export',
    justification: string,
    urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ): Promise<AccessRequest> {
    const requestId = this.generateRequestId();

    // Sanitize inputs
    const sanitizedJustification = sanitizeInput(justification, {
      maxLength: 1000,
      allowSpecialChars: true,
      stripWhitespace: true,
    });

    const expiresAt = new Date();
    expiresAt.setHours(
      expiresAt.getHours() + (urgency === 'critical' ? 2 : 24),
    );

    const accessRequest: AccessRequest = {
      requestId,
      userId,
      organizationId,
      weddingId: weddingId || undefined,
      dataType,
      requestedAccess,
      justification: sanitizedJustification,
      urgency,
      requestedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Store access request
    await this.supabase.from('access_requests').insert({
      request_id: requestId,
      user_id: userId,
      organization_id: organizationId,
      wedding_id: weddingId,
      data_type: dataType,
      requested_access: requestedAccess,
      justification: sanitizedJustification,
      urgency,
      requested_at: accessRequest.requestedAt,
      expires_at: accessRequest.expiresAt,
    });

    // Send notification to approvers
    await this.notifyApprovers(accessRequest);

    // Auto-approve for certain conditions
    const autoApproval = await this.checkAutoApproval(accessRequest);
    if (autoApproval.approved) {
      return await this.approveAccessRequest(
        requestId,
        autoApproval.approvedBy,
        'Auto-approved',
      );
    }

    return accessRequest;
  }

  /**
   * Classify wedding data based on sensitivity and type
   */
  async classifyData(
    dataId: string,
    dataContent: any,
    dataType: WeddingDataType,
    context: {
      organizationId: string;
      weddingId?: string;
      userId: string;
    },
  ): Promise<DataClassification> {
    // Analyze data content for personal information
    const personalDataTypes = await this.identifyPersonalDataTypes(dataContent);

    // Determine sensitivity level
    const sensitivityLevel = this.calculateSensitivityLevel(
      dataType,
      personalDataTypes,
    );

    // Determine retention period based on data type and regulations
    const retentionPeriod = this.getRetentionPeriod(dataType, sensitivityLevel);

    // Check encryption requirements
    const encryptionRequired = this.requiresEncryption(
      sensitivityLevel,
      personalDataTypes,
    );

    // Define access restrictions
    const accessRestrictions = this.defineAccessRestrictions(
      sensitivityLevel,
      dataType,
    );

    // Identify compliance requirements
    const complianceRequirements = this.identifyComplianceRequirements(
      personalDataTypes,
      dataType,
    );

    const classification: DataClassification = {
      dataId,
      dataType,
      sensitivityLevel,
      personalDataTypes,
      retentionPeriod,
      encryptionRequired,
      accessRestrictions,
      complianceRequirements,
    };

    // Store classification
    await this.supabase.from('data_classifications').insert({
      data_id: dataId,
      data_type: dataType,
      sensitivity_level: sensitivityLevel,
      personal_data_types: personalDataTypes,
      retention_period: retentionPeriod,
      encryption_required: encryptionRequired,
      access_restrictions: accessRestrictions,
      compliance_requirements: complianceRequirements,
      organization_id: context.organizationId,
      wedding_id: context.weddingId,
      classified_by: context.userId,
      classified_at: new Date().toISOString(),
    });

    return classification;
  }

  /**
   * Monitor and respond to policy violations in real-time
   */
  async monitorViolations(): Promise<void> {
    // This would typically run as a background service
    const recentViolations = await this.supabase
      .from('policy_violations')
      .select('*')
      .gte('detected_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .eq('resolved_at', null);

    if (recentViolations.data && recentViolations.data.length > 0) {
      for (const violation of recentViolations.data) {
        await this.respondToViolation(violation);
      }
    }
  }

  // Helper methods
  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async isWeddingDay(weddingId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('weddings')
      .select('wedding_date')
      .eq('id', weddingId)
      .single();

    if (!data?.wedding_date) return false;

    const weddingDate = new Date(data.wedding_date);
    const today = new Date();

    return weddingDate.toDateString() === today.toDateString();
  }

  private mapDataTypeToResourceType(
    dataType: WeddingDataType,
  ):
    | 'guest_list'
    | 'photos'
    | 'timeline'
    | 'vendors'
    | 'rsvp'
    | 'forms'
    | 'communications' {
    const mapping = {
      guest_personal_info: 'guest_list',
      guest_contact_details: 'guest_list',
      photo_metadata: 'photos',
      timeline_data: 'timeline',
      vendor_communications: 'vendors',
      rsvp_responses: 'rsvp',
      form_submissions: 'forms',
      dietary_requirements: 'guest_list',
      payment_information: 'forms',
      analytics_data: 'forms',
    };
    return mapping[dataType] || 'forms';
  }

  private calculateSensitivityLevel(
    dataType: WeddingDataType,
    personalDataTypes: PersonalDataType[],
  ): DataClassification['sensitivityLevel'] {
    // High sensitivity data types
    const highSensitivity = ['payment_information', 'dietary_requirements'];
    if (highSensitivity.includes(dataType)) return 'restricted';

    // Check for sensitive personal data
    const sensitivePII = ['date_of_birth', 'medical_info', 'photo_biometric'];
    if (personalDataTypes.some((type) => sensitivePII.includes(type)))
      return 'restricted';

    // Medium sensitivity
    const mediumSensitivity = ['guest_personal_info', 'vendor_communications'];
    if (mediumSensitivity.includes(dataType)) return 'confidential';

    // Standard personal data
    if (personalDataTypes.length > 0) return 'internal';

    return 'public';
  }

  private getRetentionPeriod(
    dataType: WeddingDataType,
    sensitivityLevel: DataClassification['sensitivityLevel'],
  ): string {
    // Legal requirements for wedding data
    if (['payment_information', 'form_submissions'].includes(dataType))
      return '7 years';
    if (sensitivityLevel === 'restricted') return '3 years';
    if (sensitivityLevel === 'confidential') return '2 years';
    return '1 year';
  }

  private requiresEncryption(
    sensitivityLevel: DataClassification['sensitivityLevel'],
    personalDataTypes: PersonalDataType[],
  ): boolean {
    if (sensitivityLevel === 'restricted') return true;
    if (sensitivityLevel === 'confidential' && personalDataTypes.length > 0)
      return true;
    return false;
  }

  private defineAccessRestrictions(
    sensitivityLevel: DataClassification['sensitivityLevel'],
    dataType: WeddingDataType,
  ): string[] {
    const restrictions = [];

    if (sensitivityLevel === 'restricted') {
      restrictions.push(
        'owner_approval_required',
        'mfa_required',
        'audit_log_required',
      );
    }

    if (sensitivityLevel === 'confidential') {
      restrictions.push('admin_approval_required', 'audit_log_required');
    }

    if (dataType === 'payment_information') {
      restrictions.push('pci_compliance_required', 'encrypted_transmission');
    }

    return restrictions;
  }

  private identifyComplianceRequirements(
    personalDataTypes: PersonalDataType[],
    dataType: WeddingDataType,
  ): string[] {
    const requirements = [];

    if (personalDataTypes.length > 0) requirements.push('GDPR');
    if (dataType === 'payment_information') requirements.push('PCI-DSS');
    if (personalDataTypes.includes('medical_info')) requirements.push('HIPAA');

    return requirements;
  }

  // Placeholder methods for additional functionality
  private async getApplicablePolicies(
    organizationId: string,
    dataType: WeddingDataType,
    userId: string,
  ): Promise<DataProtectionPolicy[]> {
    return [];
  }
  private async getUserContext(
    userId: string,
    organizationId: string,
  ): Promise<any> {
    return {};
  }
  private async evaluatePolicy(
    policy: DataProtectionPolicy,
    context: any,
  ): Promise<{ action: string }> {
    return { action: 'allow' };
  }
  private async createViolationReport(params: any): Promise<ViolationReport> {
    return {} as ViolationReport;
  }
  private async identifyPersonalDataTypes(
    dataContent: any,
  ): Promise<PersonalDataType[]> {
    return [];
  }
  private async notifyApprovers(request: AccessRequest): Promise<void> {}
  private async checkAutoApproval(
    request: AccessRequest,
  ): Promise<{ approved: boolean; approvedBy: string }> {
    return { approved: false, approvedBy: '' };
  }
  private async approveAccessRequest(
    requestId: string,
    approvedBy: string,
    reason: string,
  ): Promise<AccessRequest> {
    return {} as AccessRequest;
  }
  private async respondToViolation(violation: any): Promise<void> {}
}

/**
 * Encryption service for wedding data protection
 */
class EncryptionService {
  async encryptSensitiveData(
    data: any,
    encryptionLevel: string,
  ): Promise<string> {
    // Implementation for data encryption
    return 'encrypted_data';
  }

  async decryptData(encryptedData: string): Promise<any> {
    // Implementation for data decryption
    return {};
  }
}

/**
 * Data Loss Prevention engine
 */
class DLPEngine {
  async checkDataExfiltration(
    userId: string,
    dataType: WeddingDataType,
    recordCount: number,
    userContext: any,
  ): Promise<{ suspicious: boolean; reason?: string }> {
    // Check for suspicious bulk export patterns
    if (recordCount > 1000 && userContext.role !== 'owner') {
      return { suspicious: true, reason: 'Bulk export by non-owner user' };
    }

    if (recordCount > 100 && this.isOffHours()) {
      return { suspicious: true, reason: 'Large export during off hours' };
    }

    return { suspicious: false };
  }

  private isOffHours(): boolean {
    const hour = new Date().getHours();
    return hour < 6 || hour > 22;
  }
}

export { EncryptionService, DLPEngine };
