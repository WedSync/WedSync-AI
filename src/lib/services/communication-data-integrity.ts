/**
 * WS-155: Guest Communications - Data Integrity & Validation Service
 * Team E - Round 3: Complete data validation and integrity checking
 * Feature ID: WS-155
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Validation schemas
const EmailSchema = z.string().email('Invalid email format');
const PhoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]{10,}$/, 'Invalid phone format');

const GuestCommunicationSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  message_title: z
    .string()
    .min(1, 'Message title required')
    .max(500, 'Title too long'),
  message_content: z.string().min(1, 'Message content required'),
  message_type: z.enum([
    'bulk',
    'targeted',
    'individual',
    'reminder',
    'announcement',
  ]),
  channels: z
    .array(z.enum(['email', 'sms', 'in_app', 'push']))
    .min(1, 'At least one channel required'),
  priority: z.number().min(1).max(10),
  total_recipients: z.number().min(0).optional(),
  personalization_data: z.record(z.any()).optional(),
});

const CommunicationRecipientSchema = z.object({
  communication_id: z.string().uuid('Invalid communication ID'),
  organization_id: z.string().uuid('Invalid organization ID'),
  recipient_email: EmailSchema,
  recipient_phone: PhoneSchema.optional(),
  recipient_name: z
    .string()
    .min(1, 'Recipient name required')
    .max(255, 'Name too long'),
  guest_group: z.string().max(100, 'Guest group name too long').optional(),
  guest_category: z
    .string()
    .max(100, 'Guest category name too long')
    .optional(),
  relationship_to_couple: z
    .string()
    .max(100, 'Relationship description too long')
    .optional(),
});

const MessageTemplateSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  template_name: z
    .string()
    .min(1, 'Template name required')
    .max(255, 'Name too long'),
  template_category: z.enum(['invitation', 'reminder', 'thank_you', 'update']),
  template_type: z.enum(['email', 'sms', 'in_app', 'push', 'multi_channel']),
  subject_template: z.string().max(500, 'Subject too long').optional(),
  content_template: z.string().min(1, 'Content template required'),
  available_variables: z.array(z.string()).optional(),
  required_variables: z.array(z.string()).optional(),
});

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

interface IntegrityCheckResult {
  checkName: string;
  passed: boolean;
  issueCount: number;
  details: any;
  fixedCount?: number;
}

interface DataConsistencyReport {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  issuesFound: number;
  issuesFixed: number;
  results: IntegrityCheckResult[];
}

export class CommunicationDataIntegrityService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Validate guest communication data
   */
  async validateGuestCommunication(data: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Schema validation
      GuestCommunicationSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(
          ...error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
            severity: 'error' as const,
          })),
        );
      }
    }

    // Business logic validation
    await this.performBusinessValidation(data, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate communication recipient data
   */
  async validateCommunicationRecipient(data: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      CommunicationRecipientSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(
          ...error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
            severity: 'error' as const,
          })),
        );
      }
    }

    // Check for duplicates
    if (data.communication_id && data.recipient_email) {
      const { data: existing } = await this.supabase
        .from('communication_recipients')
        .select('id')
        .eq('communication_id', data.communication_id)
        .eq('recipient_email', data.recipient_email)
        .single();

      if (existing) {
        errors.push({
          field: 'recipient_email',
          message: 'Duplicate recipient for this communication',
          code: 'duplicate_recipient',
          severity: 'error',
        });
      }
    }

    // Validate organization access
    if (data.organization_id && data.guest_id) {
      await this.validateOrganizationAccess(
        data.organization_id,
        data.guest_id,
        errors,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate message template data
   */
  async validateMessageTemplate(data: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      MessageTemplateSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(
          ...error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
            severity: 'error' as const,
          })),
        );
      }
    }

    // Validate template syntax
    if (data.content_template) {
      this.validateTemplateSyntax(
        data.content_template,
        data.required_variables || [],
        errors,
        warnings,
      );
    }

    // Check for name conflicts
    if (data.organization_id && data.template_name) {
      const { data: existing } = await this.supabase
        .from('message_templates')
        .select('id')
        .eq('organization_id', data.organization_id)
        .eq('template_name', data.template_name)
        .neq('id', data.id || '')
        .single();

      if (existing) {
        errors.push({
          field: 'template_name',
          message: 'Template name already exists in organization',
          code: 'duplicate_template_name',
          severity: 'error',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Perform business logic validation
   */
  private async performBusinessValidation(
    data: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): Promise<void> {
    // Check scheduled time is not in the past
    if (data.scheduled_at) {
      const scheduledDate = new Date(data.scheduled_at);
      if (scheduledDate < new Date()) {
        errors.push({
          field: 'scheduled_at',
          message: 'Cannot schedule messages in the past',
          code: 'invalid_schedule_time',
          severity: 'error',
        });
      }
    }

    // Validate personalization data matches template
    if (data.template_id && data.personalization_data) {
      await this.validatePersonalizationData(
        data.template_id,
        data.personalization_data,
        errors,
        warnings,
      );
    }

    // Check recipient count for bulk messages
    if (data.message_type === 'bulk' && data.total_recipients === 0) {
      warnings.push({
        field: 'total_recipients',
        message: 'Bulk message has no recipients',
        suggestion: 'Add recipients or change message type',
      });
    }

    // Validate channels for message type
    if (data.message_type === 'sms' && !data.channels.includes('sms')) {
      errors.push({
        field: 'channels',
        message: 'SMS message type requires SMS channel',
        code: 'invalid_channel_config',
        severity: 'error',
      });
    }
  }

  /**
   * Validate template syntax
   */
  private validateTemplateSyntax(
    template: string,
    requiredVariables: string[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Check for template variable syntax {{variable}}
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const foundVariables = new Set<string>();
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const variable = match[1].trim();
      foundVariables.add(variable);

      // Check for invalid variable names
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)) {
        errors.push({
          field: 'content_template',
          message: `Invalid variable name: ${variable}`,
          code: 'invalid_variable_name',
          severity: 'error',
        });
      }
    }

    // Check required variables are present
    for (const required of requiredVariables) {
      if (!foundVariables.has(required)) {
        errors.push({
          field: 'content_template',
          message: `Required variable missing: ${required}`,
          code: 'missing_required_variable',
          severity: 'error',
        });
      }
    }

    // Check for unclosed brackets
    const openBrackets = (template.match(/\{\{/g) || []).length;
    const closeBrackets = (template.match(/\}\}/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push({
        field: 'content_template',
        message: 'Mismatched template brackets',
        code: 'invalid_template_syntax',
        severity: 'error',
      });
    }
  }

  /**
   * Validate personalization data against template
   */
  private async validatePersonalizationData(
    templateId: string,
    personalizationData: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): Promise<void> {
    const { data: template } = await this.supabase
      .from('message_templates')
      .select('required_variables, available_variables')
      .eq('id', templateId)
      .single();

    if (!template) {
      errors.push({
        field: 'template_id',
        message: 'Template not found',
        code: 'template_not_found',
        severity: 'error',
      });
      return;
    }

    const required = template.required_variables || [];
    const available = template.available_variables || [];

    // Check required variables are provided
    for (const variable of required) {
      if (!personalizationData[variable]) {
        errors.push({
          field: 'personalization_data',
          message: `Required personalization variable missing: ${variable}`,
          code: 'missing_personalization_variable',
          severity: 'error',
        });
      }
    }

    // Warn about unused variables
    for (const variable of Object.keys(personalizationData)) {
      if (!available.includes(variable)) {
        warnings.push({
          field: 'personalization_data',
          message: `Unknown personalization variable: ${variable}`,
          suggestion: 'Remove unused variables or update template',
        });
      }
    }
  }

  /**
   * Validate organization access
   */
  private async validateOrganizationAccess(
    organizationId: string,
    guestId: string,
    errors: ValidationError[],
  ): Promise<void> {
    const { data: guest } = await this.supabase
      .from('contacts')
      .select('organization_id')
      .eq('id', guestId)
      .single();

    if (!guest || guest.organization_id !== organizationId) {
      errors.push({
        field: 'organization_id',
        message: 'Guest does not belong to this organization',
        code: 'invalid_organization_access',
        severity: 'error',
      });
    }
  }

  /**
   * Run comprehensive data integrity checks
   */
  async runIntegrityChecks(
    organizationId?: string,
  ): Promise<DataConsistencyReport> {
    const results: IntegrityCheckResult[] = [];

    // Check orphaned recipients
    results.push(await this.checkOrphanedRecipients(organizationId));

    // Check missing delivery statuses
    results.push(await this.checkMissingDeliveryStatuses(organizationId));

    // Check invalid email formats
    results.push(await this.checkInvalidEmailFormats(organizationId));

    // Check duplicate recipients
    results.push(await this.checkDuplicateRecipients(organizationId));

    // Check template variable consistency
    results.push(await this.checkTemplateVariableConsistency(organizationId));

    // Check communication statistics consistency
    results.push(await this.checkCommunicationStatistics(organizationId));

    // Check preference consistency
    results.push(await this.checkPreferenceConsistency(organizationId));

    // Check data retention compliance
    results.push(await this.checkDataRetentionCompliance(organizationId));

    const totalChecks = results.length;
    const passedChecks = results.filter((r) => r.passed).length;
    const failedChecks = totalChecks - passedChecks;
    const issuesFound = results.reduce((sum, r) => sum + r.issueCount, 0);
    const issuesFixed = results.reduce(
      (sum, r) => sum + (r.fixedCount || 0),
      0,
    );

    return {
      totalChecks,
      passedChecks,
      failedChecks,
      issuesFound,
      issuesFixed,
      results,
    };
  }

  /**
   * Check for orphaned recipients
   */
  private async checkOrphanedRecipients(
    organizationId?: string,
  ): Promise<IntegrityCheckResult> {
    let query = this.supabase
      .from('communication_recipients')
      .select(
        `
        id,
        communication_id,
        guest_communications!left(id)
      `,
      )
      .is('guest_communications.id', null);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: orphaned, error } = await query;

    if (error) {
      return {
        checkName: 'orphaned_recipients',
        passed: false,
        issueCount: 0,
        details: { error: error.message },
      };
    }

    // Auto-fix: Delete orphaned recipients
    let fixedCount = 0;
    if (orphaned && orphaned.length > 0) {
      const orphanedIds = orphaned.map((r) => r.id);
      const { error: deleteError } = await this.supabase
        .from('communication_recipients')
        .delete()
        .in('id', orphanedIds);

      if (!deleteError) {
        fixedCount = orphaned.length;
      }
    }

    return {
      checkName: 'orphaned_recipients',
      passed: (orphaned?.length || 0) === 0,
      issueCount: orphaned?.length || 0,
      fixedCount,
      details: {
        orphanedRecipients:
          orphaned?.map((r) => ({
            id: r.id,
            communication_id: r.communication_id,
          })) || [],
      },
    };
  }

  /**
   * Check for missing delivery statuses
   */
  private async checkMissingDeliveryStatuses(
    organizationId?: string,
  ): Promise<IntegrityCheckResult> {
    let query = this.supabase
      .from('communication_recipients')
      .select(
        `
        id,
        communication_id,
        delivery_status!left(id)
      `,
      )
      .is('delivery_status.id', null);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: missing, error } = await query;

    if (error) {
      return {
        checkName: 'missing_delivery_statuses',
        passed: false,
        issueCount: 0,
        details: { error: error.message },
      };
    }

    // Auto-fix: Create missing delivery statuses
    let fixedCount = 0;
    if (missing && missing.length > 0) {
      const deliveryStatuses = missing.map((r) => ({
        communication_id: r.communication_id,
        recipient_id: r.id,
        organization_id: organizationId || '',
        channel: 'email',
        status: 'pending',
      }));

      const { error: insertError } = await this.supabase
        .from('delivery_status')
        .insert(deliveryStatuses);

      if (!insertError) {
        fixedCount = missing.length;
      }
    }

    return {
      checkName: 'missing_delivery_statuses',
      passed: (missing?.length || 0) === 0,
      issueCount: missing?.length || 0,
      fixedCount,
      details: {
        missingStatuses: missing?.map((r) => ({ recipient_id: r.id })) || [],
      },
    };
  }

  /**
   * Check for invalid email formats
   */
  private async checkInvalidEmailFormats(
    organizationId?: string,
  ): Promise<IntegrityCheckResult> {
    let query = this.supabase
      .from('communication_recipients')
      .select('id, recipient_email')
      .not('recipient_email', 'like', '%@%.%');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: invalid, error } = await query;

    return {
      checkName: 'invalid_email_formats',
      passed: (invalid?.length || 0) === 0,
      issueCount: invalid?.length || 0,
      details: {
        invalidEmails:
          invalid?.map((r) => ({ id: r.id, email: r.recipient_email })) || [],
      },
    };
  }

  /**
   * Check for duplicate recipients
   */
  private async checkDuplicateRecipients(
    organizationId?: string,
  ): Promise<IntegrityCheckResult> {
    let query = this.supabase.rpc('find_duplicate_recipients', {});

    if (organizationId) {
      query = this.supabase.rpc('find_duplicate_recipients', {
        org_id: organizationId,
      });
    }

    const { data: duplicates, error } = await query;

    if (error) {
      return {
        checkName: 'duplicate_recipients',
        passed: false,
        issueCount: 0,
        details: { error: error.message },
      };
    }

    return {
      checkName: 'duplicate_recipients',
      passed: (duplicates?.length || 0) === 0,
      issueCount: duplicates?.length || 0,
      details: {
        duplicateGroups: duplicates || [],
      },
    };
  }

  /**
   * Check template variable consistency
   */
  private async checkTemplateVariableConsistency(
    organizationId?: string,
  ): Promise<IntegrityCheckResult> {
    let query = this.supabase
      .from('message_templates')
      .select('id, template_name, content_template, required_variables');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: templates, error } = await query;

    if (error) {
      return {
        checkName: 'template_variable_consistency',
        passed: false,
        issueCount: 0,
        details: { error: error.message },
      };
    }

    const inconsistencies: any[] = [];

    for (const template of templates || []) {
      const variableRegex = /\{\{([^}]+)\}\}/g;
      const foundVariables = new Set<string>();
      let match;

      while ((match = variableRegex.exec(template.content_template)) !== null) {
        foundVariables.add(match[1].trim());
      }

      const requiredVariables = template.required_variables || [];
      const missingRequired = requiredVariables.filter(
        (v: string) => !foundVariables.has(v),
      );

      if (missingRequired.length > 0) {
        inconsistencies.push({
          templateId: template.id,
          templateName: template.template_name,
          missingRequiredVariables: missingRequired,
        });
      }
    }

    return {
      checkName: 'template_variable_consistency',
      passed: inconsistencies.length === 0,
      issueCount: inconsistencies.length,
      details: {
        inconsistencies,
      },
    };
  }

  /**
   * Check communication statistics consistency
   */
  private async checkCommunicationStatistics(
    organizationId?: string,
  ): Promise<IntegrityCheckResult> {
    let query = this.supabase.from('guest_communications').select(`
        id,
        total_recipients,
        sent_count,
        delivered_count,
        communication_recipients!inner(id)
      `);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: communications, error } = await query;

    if (error) {
      return {
        checkName: 'communication_statistics',
        passed: false,
        issueCount: 0,
        details: { error: error.message },
      };
    }

    const inconsistencies: any[] = [];

    for (const comm of communications || []) {
      const actualRecipientCount = comm.communication_recipients?.length || 0;

      if (comm.total_recipients !== actualRecipientCount) {
        inconsistencies.push({
          communicationId: comm.id,
          reportedCount: comm.total_recipients,
          actualCount: actualRecipientCount,
        });
      }
    }

    // Auto-fix statistics
    let fixedCount = 0;
    for (const inconsistency of inconsistencies) {
      const { error: updateError } = await this.supabase
        .from('guest_communications')
        .update({ total_recipients: inconsistency.actualCount })
        .eq('id', inconsistency.communicationId);

      if (!updateError) {
        fixedCount++;
      }
    }

    return {
      checkName: 'communication_statistics',
      passed: inconsistencies.length === 0,
      issueCount: inconsistencies.length,
      fixedCount,
      details: {
        inconsistencies,
      },
    };
  }

  /**
   * Check preference consistency
   */
  private async checkPreferenceConsistency(
    organizationId?: string,
  ): Promise<IntegrityCheckResult> {
    let query = this.supabase
      .from('communication_preferences')
      .select('id, guest_email, global_opt_out, email_enabled, sms_enabled');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: preferences, error } = await query;

    if (error) {
      return {
        checkName: 'preference_consistency',
        passed: false,
        issueCount: 0,
        details: { error: error.message },
      };
    }

    const inconsistencies = (preferences || []).filter(
      (pref) => pref.global_opt_out && (pref.email_enabled || pref.sms_enabled),
    );

    return {
      checkName: 'preference_consistency',
      passed: inconsistencies.length === 0,
      issueCount: inconsistencies.length,
      details: {
        inconsistencies: inconsistencies.map((p) => ({
          id: p.id,
          guest_email: p.guest_email,
          issue: 'Global opt-out but channels still enabled',
        })),
      },
    };
  }

  /**
   * Check data retention compliance
   */
  private async checkDataRetentionCompliance(
    organizationId?: string,
  ): Promise<IntegrityCheckResult> {
    const retentionPeriod = 365; // days
    const cutoffDate = new Date(
      Date.now() - retentionPeriod * 24 * 60 * 60 * 1000,
    );

    let query = this.supabase
      .from('guest_communications')
      .select('id, message_title, created_at')
      .lt('created_at', cutoffDate.toISOString())
      .eq('is_archived', false);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: expired, error } = await query;

    return {
      checkName: 'data_retention_compliance',
      passed: (expired?.length || 0) === 0,
      issueCount: expired?.length || 0,
      details: {
        expiredCommunications:
          expired?.map((c) => ({
            id: c.id,
            title: c.message_title,
            created_at: c.created_at,
            daysPastRetention:
              Math.floor(
                (Date.now() - new Date(c.created_at).getTime()) /
                  (24 * 60 * 60 * 1000),
              ) - retentionPeriod,
          })) || [],
      },
    };
  }

  /**
   * Fix data integrity issues automatically where safe
   */
  async autoFixIntegrityIssues(organizationId?: string): Promise<{
    fixed: number;
    failed: number;
    details: any[];
  }> {
    const report = await this.runIntegrityChecks(organizationId);

    const fixResults = {
      fixed: report.issuesFixed,
      failed: report.issuesFound - report.issuesFixed,
      details: report.results
        .filter((r) => (r.fixedCount || 0) > 0)
        .map((r) => ({
          checkName: r.checkName,
          issuesFound: r.issueCount,
          issuesFixed: r.fixedCount || 0,
        })),
    };

    return fixResults;
  }
}
