import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export interface ConsentTrigger {
  id: string;
  dataType: string;
  operation: 'create' | 'update' | 'collect' | 'share';
  consentType: 'essential' | 'functional' | 'marketing' | 'analytics';
  purpose: string;
  requiredForOperation: boolean;
  autoPrompt: boolean;
  displayText: string;
}

export interface ConsentContext {
  userId: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  weddingId?: string;
  dataBeingProcessed: string[];
  processingPurpose: string;
}

export interface ConsentDecision {
  userId: string;
  consentType: string;
  purpose: string;
  granted: boolean;
  timestamp: Date;
  expiryDate?: Date;
  context: ConsentContext;
  version: string;
}

const consentTriggerSchema = z.object({
  id: z.string(),
  dataType: z.string(),
  operation: z.enum(['create', 'update', 'collect', 'share']),
  consentType: z.enum(['essential', 'functional', 'marketing', 'analytics']),
  purpose: z.string(),
  requiredForOperation: z.boolean(),
  autoPrompt: z.boolean(),
  displayText: z.string(),
});

const consentDecisionSchema = z.object({
  userId: z.string(),
  consentType: z.string(),
  purpose: z.string(),
  granted: z.boolean(),
  timestamp: z.date(),
  expiryDate: z.date().optional(),
  context: z.object({
    userId: z.string(),
    sessionId: z.string(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    weddingId: z.string().optional(),
    dataBeingProcessed: z.array(z.string()),
    processingPurpose: z.string(),
  }),
  version: z.string(),
});

export class ConsentAutomationManager {
  private supabase;
  private consentTriggers: Map<string, ConsentTrigger[]> = new Map();
  private consentVersion = '2.1';

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.initializeDefaultTriggers();
  }

  private initializeDefaultTriggers(): void {
    const weddingDataTriggers: ConsentTrigger[] = [
      {
        id: 'guest_list_processing',
        dataType: 'guest_information',
        operation: 'create',
        consentType: 'essential',
        purpose: 'wedding_planning',
        requiredForOperation: true,
        autoPrompt: true,
        displayText:
          'We need to process guest information for wedding planning purposes.',
      },
      {
        id: 'photo_sharing',
        dataType: 'wedding_photos',
        operation: 'share',
        consentType: 'functional',
        purpose: 'photo_sharing',
        requiredForOperation: false,
        autoPrompt: true,
        displayText: 'Allow sharing of wedding photos with guests and vendors?',
      },
      {
        id: 'vendor_communication',
        dataType: 'contact_details',
        operation: 'share',
        consentType: 'functional',
        purpose: 'vendor_coordination',
        requiredForOperation: true,
        autoPrompt: true,
        displayText:
          'Share contact details with selected wedding vendors for coordination?',
      },
      {
        id: 'marketing_communications',
        dataType: 'email_address',
        operation: 'collect',
        consentType: 'marketing',
        purpose: 'marketing',
        requiredForOperation: false,
        autoPrompt: false,
        displayText:
          'Receive wedding tips, vendor recommendations, and special offers?',
      },
    ];

    this.consentTriggers.set('wedding_workflows', weddingDataTriggers);
  }

  async checkConsentRequirements(
    workflowId: string,
    operation: string,
    dataTypes: string[],
    context: ConsentContext,
  ): Promise<{
    requiredConsents: ConsentTrigger[];
    optionalConsents: ConsentTrigger[];
    existingConsents: ConsentDecision[];
    canProceed: boolean;
  }> {
    const triggers = this.consentTriggers.get(workflowId) || [];
    const requiredConsents: ConsentTrigger[] = [];
    const optionalConsents: ConsentTrigger[] = [];

    dataTypes.forEach((dataType) => {
      const matchingTriggers = triggers.filter(
        (trigger) =>
          trigger.dataType === dataType && trigger.operation === operation,
      );

      matchingTriggers.forEach((trigger) => {
        if (trigger.requiredForOperation) {
          requiredConsents.push(trigger);
        } else {
          optionalConsents.push(trigger);
        }
      });
    });

    const existingConsents = await this.getExistingConsents(
      context.userId,
      requiredConsents.concat(optionalConsents),
    );

    const hasRequiredConsents = requiredConsents.every((required) =>
      existingConsents.some(
        (existing) =>
          existing.purpose === required.purpose &&
          existing.granted &&
          this.isConsentValid(existing),
      ),
    );

    return {
      requiredConsents,
      optionalConsents,
      existingConsents,
      canProceed: hasRequiredConsents,
    };
  }

  async automateConsentCollection(
    context: ConsentContext,
    dataEntry: any,
  ): Promise<{
    shouldPromptUser: boolean;
    requiredPrompts: ConsentTrigger[];
    suggestedPrompts: ConsentTrigger[];
    autoGrantedConsents: ConsentDecision[];
  }> {
    const detectedDataTypes = this.detectDataTypes(dataEntry);
    const allTriggers = Array.from(this.consentTriggers.values()).flat();

    const applicableTriggers = allTriggers.filter((trigger) =>
      detectedDataTypes.includes(trigger.dataType),
    );

    const requiredPrompts = applicableTriggers.filter(
      (t) => t.requiredForOperation && t.autoPrompt,
    );

    const suggestedPrompts = applicableTriggers.filter(
      (t) => !t.requiredForOperation && t.autoPrompt,
    );

    const autoGrantedConsents: ConsentDecision[] = [];

    // Auto-grant essential consents for basic functionality
    for (const trigger of applicableTriggers) {
      if (trigger.consentType === 'essential' && trigger.requiredForOperation) {
        const consent: ConsentDecision = {
          userId: context.userId,
          consentType: trigger.consentType,
          purpose: trigger.purpose,
          granted: true,
          timestamp: new Date(),
          expiryDate: this.calculateExpiryDate(trigger.consentType),
          context,
          version: this.consentVersion,
        };

        await this.storeConsentDecision(consent);
        autoGrantedConsents.push(consent);
      }
    }

    const shouldPromptUser =
      requiredPrompts.length > 0 || suggestedPrompts.length > 0;

    await this.logConsentAutomationEvent({
      userId: context.userId,
      sessionId: context.sessionId,
      detectedDataTypes,
      autoGrantedCount: autoGrantedConsents.length,
      promptsRequired: requiredPrompts.length,
      promptsSuggested: suggestedPrompts.length,
      timestamp: new Date(),
    });

    return {
      shouldPromptUser,
      requiredPrompts,
      suggestedPrompts,
      autoGrantedConsents,
    };
  }

  async processConsentDecisions(
    context: ConsentContext,
    decisions: Array<{
      triggerId: string;
      granted: boolean;
      customPurpose?: string;
    }>,
  ): Promise<{
    successful: ConsentDecision[];
    failed: Array<{ triggerId: string; error: string }>;
    operationsNowAllowed: string[];
  }> {
    const successful: ConsentDecision[] = [];
    const failed: Array<{ triggerId: string; error: string }> = [];
    const operationsNowAllowed: string[] = [];

    for (const decision of decisions) {
      try {
        const trigger = this.findTriggerById(decision.triggerId);
        if (!trigger) {
          failed.push({
            triggerId: decision.triggerId,
            error: 'Trigger not found',
          });
          continue;
        }

        const consentDecision: ConsentDecision = {
          userId: context.userId,
          consentType: trigger.consentType,
          purpose: decision.customPurpose || trigger.purpose,
          granted: decision.granted,
          timestamp: new Date(),
          expiryDate: this.calculateExpiryDate(trigger.consentType),
          context,
          version: this.consentVersion,
        };

        // SENIOR CODE REVIEWER FIX: Cast validated decision to ensure type compliance
        const validatedDecision = consentDecisionSchema.parse(
          consentDecision,
        ) as ConsentDecision;
        await this.storeConsentDecision(validatedDecision);
        successful.push(validatedDecision);

        if (decision.granted) {
          operationsNowAllowed.push(trigger.operation);
        }
      } catch (error) {
        failed.push({
          triggerId: decision.triggerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      successful,
      failed,
      operationsNowAllowed,
    };
  }

  async generateConsentSummary(userId: string): Promise<{
    totalConsents: number;
    activeConsents: number;
    expiredConsents: number;
    grantedByType: Record<string, number>;
    recentChanges: ConsentDecision[];
    nextExpirations: Array<{ purpose: string; expiryDate: Date }>;
  }> {
    const { data: allConsents } = await this.supabase
      .from('gdpr_consent_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const consents = allConsents || [];
    const now = new Date();

    const activeConsents = consents.filter(
      (c) => c.granted && (!c.expiry_date || new Date(c.expiry_date) > now),
    );

    const expiredConsents = consents.filter(
      (c) => c.expiry_date && new Date(c.expiry_date) <= now,
    );

    const grantedByType = consents
      .filter((c) => c.granted)
      .reduce(
        (acc, consent) => {
          acc[consent.consent_type] = (acc[consent.consent_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

    const recentChanges = consents
      .filter((c) => {
        const changeDate = new Date(c.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return changeDate > thirtyDaysAgo;
      })
      .slice(0, 10);

    const nextExpirations = activeConsents
      .filter((c) => c.expiry_date)
      .map((c) => ({
        purpose: c.purpose,
        expiryDate: new Date(c.expiry_date),
      }))
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
      .slice(0, 5);

    return {
      totalConsents: consents.length,
      activeConsents: activeConsents.length,
      expiredConsents: expiredConsents.length,
      grantedByType,
      recentChanges,
      nextExpirations,
    };
  }

  private detectDataTypes(data: any): string[] {
    const dataTypes: string[] = [];
    const dataString = JSON.stringify(data).toLowerCase();

    const typePatterns = {
      guest_information: ['guest', 'attendee', 'invite', 'rsvp'],
      wedding_photos: ['photo', 'image', 'picture', 'album'],
      contact_details: ['email', 'phone', 'address', 'contact'],
      personal_details: ['name', 'birthday', 'age', 'personal'],
      vendor_information: ['vendor', 'supplier', 'service', 'provider'],
      payment_information: ['payment', 'billing', 'transaction', 'invoice'],
    };

    Object.entries(typePatterns).forEach(([dataType, patterns]) => {
      if (patterns.some((pattern) => dataString.includes(pattern))) {
        dataTypes.push(dataType);
      }
    });

    return dataTypes;
  }

  private findTriggerById(triggerId: string): ConsentTrigger | undefined {
    const entries = Array.from(this.consentTriggers.values());
    for (const triggers of entries) {
      const found = triggers.find((t) => t.id === triggerId);
      if (found) return found;
    }
    return undefined;
  }

  private async getExistingConsents(
    userId: string,
    triggers: ConsentTrigger[],
  ): Promise<ConsentDecision[]> {
    const purposes = triggers.map((t) => t.purpose);

    const { data } = await this.supabase
      .from('gdpr_consent_records')
      .select('*')
      .eq('user_id', userId)
      .in('purpose', purposes)
      .order('created_at', { ascending: false });

    return (
      data?.map((d) => ({
        userId: d.user_id,
        consentType: d.consent_type,
        purpose: d.purpose,
        granted: d.granted,
        timestamp: new Date(d.created_at),
        expiryDate: d.expiry_date ? new Date(d.expiry_date) : undefined,
        context: d.context,
        version: d.version,
      })) || []
    );
  }

  private isConsentValid(consent: ConsentDecision): boolean {
    if (!consent.granted) return false;
    if (!consent.expiryDate) return true;
    return consent.expiryDate > new Date();
  }

  private calculateExpiryDate(consentType: string): Date | undefined {
    const expiryMonths = {
      essential: undefined, // No expiry
      functional: 24,
      marketing: 12,
      analytics: 12,
    };

    const months = expiryMonths[consentType as keyof typeof expiryMonths];
    if (!months) return undefined;

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + months);
    return expiry;
  }

  private async storeConsentDecision(decision: ConsentDecision): Promise<void> {
    await this.supabase.from('gdpr_consent_records').insert({
      user_id: decision.userId,
      consent_type: decision.consentType,
      purpose: decision.purpose,
      granted: decision.granted,
      expiry_date: decision.expiryDate?.toISOString(),
      context: decision.context,
      version: decision.version,
      created_at: decision.timestamp.toISOString(),
    });
  }

  private async logConsentAutomationEvent(event: {
    userId: string;
    sessionId: string;
    detectedDataTypes: string[];
    autoGrantedCount: number;
    promptsRequired: number;
    promptsSuggested: number;
    timestamp: Date;
  }): Promise<void> {
    await this.supabase.from('gdpr_automation_logs').insert({
      user_id: event.userId,
      session_id: event.sessionId,
      detected_data_types: event.detectedDataTypes,
      auto_granted_count: event.autoGrantedCount,
      prompts_required: event.promptsRequired,
      prompts_suggested: event.promptsSuggested,
      created_at: event.timestamp.toISOString(),
    });
  }
}

export const consentAutomationManager = new ConsentAutomationManager();

export async function withAutomatedConsent<T>(
  context: ConsentContext,
  dataEntry: any,
  operation: () => Promise<T>,
): Promise<{
  result?: T;
  consentRequired: boolean;
  promptsNeeded: ConsentTrigger[];
  error?: string;
}> {
  try {
    const automation = await consentAutomationManager.automateConsentCollection(
      context,
      dataEntry,
    );

    if (automation.shouldPromptUser && automation.requiredPrompts.length > 0) {
      return {
        consentRequired: true,
        promptsNeeded: automation.requiredPrompts.concat(
          automation.suggestedPrompts,
        ),
      };
    }

    const result = await operation();

    return {
      result,
      consentRequired: false,
      promptsNeeded: [],
    };
  } catch (error) {
    return {
      consentRequired: false,
      promptsNeeded: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
