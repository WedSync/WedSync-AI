import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export interface PrivacyWorkflowHook {
  operation: 'create' | 'update' | 'delete' | 'read';
  entityType: string;
  dataFields: string[];
  requiresConsent: boolean;
  retentionPeriod?: number;
  purpose: string;
}

export interface WorkflowPrivacyContext {
  userId: string;
  weddingId?: string;
  sessionId: string;
  userRole: 'couple' | 'supplier' | 'guest' | 'admin';
  consentStatus: ConsentStatus;
}

export interface ConsentStatus {
  hasDataProcessingConsent: boolean;
  hasMarketingConsent: boolean;
  hasPhotoSharingConsent: boolean;
  consentTimestamp: Date;
  consentVersion: string;
}

const privacyHookSchema = z.object({
  operation: z.enum(['create', 'update', 'delete', 'read']),
  entityType: z.string(),
  dataFields: z.array(z.string()),
  requiresConsent: z.boolean(),
  retentionPeriod: z.number().optional(),
  purpose: z.string(),
});

export class WorkflowPrivacyManager {
  public supabase;
  private privacyHooks: Map<string, PrivacyWorkflowHook[]> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  registerWorkflowPrivacyHook(
    workflowId: string,
    hook: PrivacyWorkflowHook,
  ): void {
    // SENIOR CODE REVIEWER FIX: Cast validated hook to ensure type compliance
    const validatedHook = privacyHookSchema.parse(hook) as PrivacyWorkflowHook;

    if (!this.privacyHooks.has(workflowId)) {
      this.privacyHooks.set(workflowId, []);
    }

    this.privacyHooks.get(workflowId)!.push(validatedHook);
  }

  async validatePrivacyCompliance(
    workflowId: string,
    operation: string,
    context: WorkflowPrivacyContext,
    data: any,
  ): Promise<{
    compliant: boolean;
    violations: string[];
    requiresConsent: boolean;
  }> {
    const hooks = this.privacyHooks.get(workflowId) || [];
    const violations: string[] = [];
    let requiresConsent = false;

    for (const hook of hooks) {
      if (hook.operation === operation) {
        if (
          hook.requiresConsent &&
          !context.consentStatus.hasDataProcessingConsent
        ) {
          violations.push(
            `Consent required for ${hook.entityType} ${hook.operation}`,
          );
          requiresConsent = true;
        }

        if (hook.dataFields.some((field) => this.isPersonalData(field, data))) {
          const consentCheck = await this.checkConsentForDataProcessing(
            context.userId,
            hook.purpose,
            hook.entityType,
          );

          if (!consentCheck.hasConsent) {
            violations.push(
              `Missing consent for processing ${hook.entityType} personal data`,
            );
            requiresConsent = true;
          }
        }
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      requiresConsent,
    };
  }

  async integratePastWorkflowStep(
    workflowId: string,
    stepId: string,
    context: WorkflowPrivacyContext,
    stepData: any,
  ): Promise<{
    allowed: boolean;
    consentRequired: string[];
    privacyNotices: string[];
  }> {
    const hooks = this.privacyHooks.get(workflowId) || [];
    const consentRequired: string[] = [];
    const privacyNotices: string[] = [];

    await this.logPrivacyWorkflowEvent({
      workflowId,
      stepId,
      userId: context.userId,
      operation: 'step_execution',
      dataProcessed: Object.keys(stepData),
      timestamp: new Date(),
      consentStatus: context.consentStatus,
    });

    for (const hook of hooks) {
      if (this.containsPersonalData(stepData, hook.dataFields)) {
        if (!context.consentStatus.hasDataProcessingConsent) {
          consentRequired.push(
            `Data processing consent for ${hook.entityType}`,
          );
        }

        privacyNotices.push(
          `Your ${hook.entityType} data will be processed for: ${hook.purpose}`,
        );
      }
    }

    const allowed = consentRequired.length === 0;

    return {
      allowed,
      consentRequired,
      privacyNotices,
    };
  }

  async automaticPrivacyCleanup(workflowId: string): Promise<void> {
    const hooks = this.privacyHooks.get(workflowId) || [];

    for (const hook of hooks) {
      if (hook.retentionPeriod) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - hook.retentionPeriod);

        await this.supabase
          .from('privacy_workflow_events')
          .delete()
          .eq('workflow_id', workflowId)
          .eq('entity_type', hook.entityType)
          .lt('created_at', cutoffDate.toISOString());
      }
    }
  }

  async getWorkflowPrivacyReport(
    workflowId: string,
    userId: string,
  ): Promise<{
    dataProcessed: string[];
    consentStatus: ConsentStatus;
    privacyEvents: any[];
    retentionPolicies: any[];
  }> {
    const { data: events } = await this.supabase
      .from('privacy_workflow_events')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('user_id', userId);

    const { data: consent } = await this.supabase
      .from('gdpr_consent_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const hooks = this.privacyHooks.get(workflowId) || [];

    return {
      dataProcessed: events?.map((e) => e.data_processed).flat() || [],
      consentStatus: consent || {
        hasDataProcessingConsent: false,
        hasMarketingConsent: false,
        hasPhotoSharingConsent: false,
        consentTimestamp: new Date(),
        consentVersion: '1.0',
      },
      privacyEvents: events || [],
      retentionPolicies: hooks
        .filter((h) => h.retentionPeriod)
        .map((h) => ({
          entityType: h.entityType,
          retentionDays: h.retentionPeriod,
          purpose: h.purpose,
        })),
    };
  }

  private async checkConsentForDataProcessing(
    userId: string,
    purpose: string,
    entityType: string,
  ): Promise<{ hasConsent: boolean; consentDate?: Date }> {
    const { data } = await this.supabase
      .from('gdpr_consent_records')
      .select('*')
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .eq('entity_type', entityType)
      .eq('status', 'granted')
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      hasConsent: !!data?.[0],
      consentDate: data?.[0]?.created_at
        ? new Date(data[0].created_at)
        : undefined,
    };
  }

  private isPersonalData(fieldName: string, data: any): boolean {
    const personalDataPatterns = [
      'email',
      'phone',
      'address',
      'name',
      'birthday',
      'photo',
      'location',
      'contact',
      'personal',
    ];

    return (
      personalDataPatterns.some((pattern) =>
        fieldName.toLowerCase().includes(pattern),
      ) && data[fieldName] !== undefined
    );
  }

  private containsPersonalData(data: any, fields: string[]): boolean {
    return fields.some((field) => this.isPersonalData(field, data));
  }

  private async logPrivacyWorkflowEvent(event: {
    workflowId: string;
    stepId: string;
    userId: string;
    operation: string;
    dataProcessed: string[];
    timestamp: Date;
    consentStatus: ConsentStatus;
  }): Promise<void> {
    await this.supabase.from('privacy_workflow_events').insert({
      workflow_id: event.workflowId,
      step_id: event.stepId,
      user_id: event.userId,
      operation: event.operation,
      data_processed: event.dataProcessed,
      consent_status: event.consentStatus,
      created_at: event.timestamp.toISOString(),
    });
  }
}

export const workflowPrivacyManager = new WorkflowPrivacyManager();

export async function withWorkflowPrivacy<T>(
  workflowId: string,
  context: WorkflowPrivacyContext,
  operation: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();

    await workflowPrivacyManager.supabase
      .from('privacy_workflow_events')
      .insert({
        workflow_id: workflowId,
        user_id: context.userId,
        operation: 'workflow_execution',
        duration_ms: Date.now() - startTime,
        status: 'success',
        consent_status: context.consentStatus,
      });

    return result;
  } catch (error) {
    await workflowPrivacyManager.supabase
      .from('privacy_workflow_events')
      .insert({
        workflow_id: workflowId,
        user_id: context.userId,
        operation: 'workflow_execution',
        duration_ms: Date.now() - startTime,
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        consent_status: context.consentStatus,
      });

    throw error;
  }
}
