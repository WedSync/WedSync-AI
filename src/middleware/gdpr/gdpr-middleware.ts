import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { workflowPrivacyManager } from '../../lib/integrations/gdpr/workflow-privacy';
import { consentAutomationManager } from '../../lib/integrations/gdpr/consent-automation';
import { privacyImpactTracker } from '../../lib/integrations/gdpr/privacy-impact-tracker';

export interface GDPRMiddlewareConfig {
  enableAutoConsent: boolean;
  enableImpactTracking: boolean;
  requireExplicitConsent: string[];
  exemptPaths: string[];
  logAllOperations: boolean;
}

export interface PrivacyContext {
  userId?: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  path: string;
  method: string;
  hasValidConsent: boolean;
  consentTypes: string[];
}

const gdprConfigSchema = z.object({
  enableAutoConsent: z.boolean(),
  enableImpactTracking: z.boolean(),
  requireExplicitConsent: z.array(z.string()),
  exemptPaths: z.array(z.string()),
  logAllOperations: z.boolean(),
});

export class GDPRMiddleware {
  private config: GDPRMiddlewareConfig;
  private supabase;

  constructor(config: Partial<GDPRMiddlewareConfig> = {}) {
    // SENIOR CODE REVIEWER FIX: Provide all required properties with defaults
    const configWithDefaults: GDPRMiddlewareConfig = {
      enableAutoConsent: config.enableAutoConsent ?? true,
      enableImpactTracking: config.enableImpactTracking ?? true,
      requireExplicitConsent: config.requireExplicitConsent ?? [
        'marketing',
        'analytics',
      ],
      exemptPaths: config.exemptPaths ?? ['/api/health', '/api/auth'],
      logAllOperations: config.logAllOperations ?? true,
    };

    // SENIOR CODE REVIEWER FIX: Cast parsed config to ensure type compliance
    this.config = gdprConfigSchema.parse(
      configWithDefaults,
    ) as GDPRMiddlewareConfig;

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async handle(request: NextRequest): Promise<NextResponse | null> {
    const context = await this.createPrivacyContext(request);

    // Skip processing for exempt paths
    if (this.isExemptPath(context.path)) {
      return null; // Continue to next middleware
    }

    try {
      // Pre-request privacy checks
      const preCheck = await this.performPreRequestChecks(request, context);
      if (preCheck.block) {
        return preCheck.response;
      }

      // Track the operation if impact tracking is enabled
      if (this.config.enableImpactTracking) {
        await this.trackPrivacyImpact(request, context);
      }

      // Log the operation if logging is enabled
      if (this.config.logAllOperations) {
        await this.logGDPROperation(context, 'request_processed');
      }

      return null; // Continue to actual route handler
    } catch (error) {
      await this.logGDPROperation(context, 'error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        { error: 'Privacy compliance check failed' },
        { status: 500 },
      );
    }
  }

  async validateDataProcessing(
    request: NextRequest,
    dataToProcess: any,
    processingPurpose: string,
  ): Promise<{
    allowed: boolean;
    consentRequired: string[];
    privacyNotices: string[];
    response?: NextResponse;
  }> {
    const context = await this.createPrivacyContext(request);

    if (!context.userId) {
      return {
        allowed: false,
        consentRequired: ['authentication'],
        privacyNotices: ['Please log in to continue'],
        response: NextResponse.json(
          { error: 'Authentication required for data processing' },
          { status: 401 },
        ),
      };
    }

    // Check if consent automation should handle this
    if (this.config.enableAutoConsent) {
      const automation =
        await consentAutomationManager.automateConsentCollection(
          {
            userId: context.userId,
            sessionId: context.sessionId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            dataBeingProcessed: this.extractDataFields(dataToProcess),
            processingPurpose,
          },
          dataToProcess,
        );

      if (
        automation.shouldPromptUser &&
        automation.requiredPrompts.length > 0
      ) {
        return {
          allowed: false,
          consentRequired: automation.requiredPrompts.map((p) => p.consentType),
          privacyNotices: automation.requiredPrompts.map((p) => p.displayText),
          response: NextResponse.json(
            {
              error: 'Consent required',
              consentRequired: automation.requiredPrompts,
              suggestedConsents: automation.suggestedPrompts,
            },
            { status: 403 },
          ),
        };
      }
    }

    // Additional explicit consent checks
    const explicitConsentNeeded = await this.checkExplicitConsentRequirements(
      context.userId,
      processingPurpose,
      dataToProcess,
    );

    if (explicitConsentNeeded.length > 0) {
      return {
        allowed: false,
        consentRequired: explicitConsentNeeded,
        privacyNotices: [
          `Explicit consent required for: ${explicitConsentNeeded.join(', ')}`,
        ],
        response: NextResponse.json(
          {
            error: 'Explicit consent required',
            explicitConsentNeeded,
          },
          { status: 403 },
        ),
      };
    }

    return {
      allowed: true,
      consentRequired: [],
      privacyNotices: [],
    };
  }

  async enforceDataMinimization(
    originalData: any,
    processingPurpose: string,
    userContext: PrivacyContext,
  ): Promise<{
    minimizedData: any;
    removedFields: string[];
    justification: Record<string, string>;
  }> {
    const removedFields: string[] = [];
    const justification: Record<string, string> = {};
    const minimizedData = { ...originalData };

    // Define field requirements for different purposes
    const purposeRequirements: Record<string, string[]> = {
      wedding_planning: ['name', 'email', 'phone', 'wedding_date', 'venue'],
      photo_sharing: ['name', 'email', 'photo_permissions'],
      vendor_coordination: ['name', 'email', 'phone', 'service_type'],
      marketing: ['email', 'preferences'],
      analytics: ['user_id', 'session_data'],
    };

    const requiredFields = purposeRequirements[processingPurpose] || [];

    // Remove fields not required for this purpose
    Object.keys(originalData).forEach((field) => {
      if (!requiredFields.includes(field) && !field.startsWith('_')) {
        delete minimizedData[field];
        removedFields.push(field);
        justification[field] = `Not required for ${processingPurpose}`;
      }
    });

    // Log data minimization
    await this.logGDPROperation(userContext, 'data_minimization', {
      purpose: processingPurpose,
      originalFields: Object.keys(originalData).length,
      minimizedFields: Object.keys(minimizedData).length,
      removedFields,
    });

    return {
      minimizedData,
      removedFields,
      justification,
    };
  }

  async handleDataSubjectRights(
    request: NextRequest,
    rightType:
      | 'access'
      | 'rectification'
      | 'erasure'
      | 'portability'
      | 'restriction',
  ): Promise<NextResponse> {
    const context = await this.createPrivacyContext(request);

    if (!context.userId) {
      return NextResponse.json(
        { error: 'Authentication required for data subject rights' },
        { status: 401 },
      );
    }

    try {
      switch (rightType) {
        case 'access':
          return await this.handleDataAccess(context.userId);

        case 'rectification':
          return await this.handleDataRectification(request, context.userId);

        case 'erasure':
          return await this.handleDataErasure(context.userId);

        case 'portability':
          return await this.handleDataPortability(context.userId);

        case 'restriction':
          return await this.handleProcessingRestriction(
            request,
            context.userId,
          );

        default:
          return NextResponse.json(
            { error: 'Invalid data subject right request' },
            { status: 400 },
          );
      }
    } catch (error) {
      await this.logGDPROperation(context, 'data_subject_right_error', {
        rightType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        { error: 'Failed to process data subject right request' },
        { status: 500 },
      );
    }
  }

  private async createPrivacyContext(
    request: NextRequest,
  ): Promise<PrivacyContext> {
    const sessionId =
      request.cookies.get('session')?.value ||
      request.headers.get('x-session-id') ||
      crypto.randomUUID();

    // Extract user ID from session/auth header
    let userId: string | undefined;
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        // Validate JWT or session token and extract user ID
        // This is a simplified example - implement proper auth validation
        userId = await this.extractUserIdFromAuth(authHeader);
      }
    } catch (error) {
      // User not authenticated - continue without user ID
    }

    // Check existing consent status
    let hasValidConsent = false;
    let consentTypes: string[] = [];

    if (userId) {
      const { data: consents } = await this.supabase
        .from('gdpr_consent_records')
        .select('consent_type, granted, expiry_date')
        .eq('user_id', userId)
        .eq('granted', true);

      if (consents) {
        const now = new Date();
        const validConsents = consents.filter(
          (c) => !c.expiry_date || new Date(c.expiry_date) > now,
        );

        hasValidConsent = validConsents.length > 0;
        consentTypes = validConsents.map((c) => c.consent_type);
      }
    }

    return {
      userId,
      sessionId,
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      path: request.nextUrl.pathname,
      method: request.method,
      hasValidConsent,
      consentTypes,
    };
  }

  private async performPreRequestChecks(
    request: NextRequest,
    context: PrivacyContext,
  ): Promise<{ block: boolean; response?: NextResponse }> {
    // Check for data processing operations
    if (['POST', 'PUT', 'PATCH'].includes(context.method)) {
      try {
        const body = await request.clone().json();

        // Check if this is a high-risk operation
        const containsPersonalData = this.detectPersonalData(body);

        if (containsPersonalData && !context.hasValidConsent) {
          return {
            block: true,
            response: NextResponse.json(
              {
                error: 'Consent required for processing personal data',
                consentUrl: '/api/gdpr/consent',
                dataProcessingNotice:
                  'This operation processes personal data and requires your consent.',
              },
              { status: 403 },
            ),
          };
        }
      } catch (error) {
        // Body is not JSON or cannot be parsed - continue
      }
    }

    return { block: false };
  }

  private async trackPrivacyImpact(
    request: NextRequest,
    context: PrivacyContext,
  ): Promise<void> {
    const operationId = `${context.method}-${context.path}-${Date.now()}`;

    // Analyze the operation for privacy impact
    const privacyOperation = {
      id: operationId,
      operation: `${context.method} ${context.path}`,
      dataTypes: await this.identifyDataTypes(request, context),
      sensitivityLevel: this.determineSensitivityLevel(context.path),
      processingPurpose: this.inferProcessingPurpose(context.path),
      dataSubjects: context.userId ? 1 : 0,
      thirdPartySharing: this.checkThirdPartySharing(context.path),
      crossBorderTransfer: false, // Configure based on your setup
      automatedDecisionMaking: this.checkAutomatedDecisionMaking(context.path),
    } as const;

    await privacyImpactTracker.trackOperation(privacyOperation);
  }

  private async checkExplicitConsentRequirements(
    userId: string,
    purpose: string,
    data: any,
  ): Promise<string[]> {
    const explicitConsentNeeded: string[] = [];

    // Check if explicit consent is required for this purpose
    if (this.config.requireExplicitConsent.includes(purpose)) {
      const { data: consent } = await this.supabase
        .from('gdpr_consent_records')
        .select('*')
        .eq('user_id', userId)
        .eq('purpose', purpose)
        .eq('granted', true)
        .eq('explicit', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!consent || consent.length === 0) {
        explicitConsentNeeded.push(purpose);
      }
    }

    // Check for special category data
    if (this.containsSpecialCategoryData(data)) {
      const { data: specialConsent } = await this.supabase
        .from('gdpr_consent_records')
        .select('*')
        .eq('user_id', userId)
        .eq('consent_type', 'special_category')
        .eq('granted', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!specialConsent || specialConsent.length === 0) {
        explicitConsentNeeded.push('special_category');
      }
    }

    return explicitConsentNeeded;
  }

  private async handleDataAccess(userId: string): Promise<NextResponse> {
    // Collect all data associated with the user
    const userData = await this.collectUserData(userId);

    await this.logGDPROperation(
      {
        userId,
        sessionId: 'data_access',
        path: '/api/gdpr/access',
        method: 'GET',
        hasValidConsent: true,
        consentTypes: [],
      },
      'data_access_request',
    );

    return NextResponse.json({
      message: 'Data access request processed',
      data: userData,
      generated: new Date().toISOString(),
    });
  }

  private async handleDataRectification(
    request: NextRequest,
    userId: string,
  ): Promise<NextResponse> {
    const corrections = await request.json();

    // Apply corrections to user data
    await this.applyDataCorrections(userId, corrections);

    await this.logGDPROperation(
      {
        userId,
        sessionId: 'data_rectification',
        path: '/api/gdpr/rectify',
        method: 'POST',
        hasValidConsent: true,
        consentTypes: [],
      },
      'data_rectification',
      { corrections },
    );

    return NextResponse.json({ message: 'Data rectification completed' });
  }

  private async handleDataErasure(userId: string): Promise<NextResponse> {
    // Perform data erasure while maintaining necessary records
    await this.performDataErasure(userId);

    await this.logGDPROperation(
      {
        userId,
        sessionId: 'data_erasure',
        path: '/api/gdpr/erase',
        method: 'DELETE',
        hasValidConsent: true,
        consentTypes: [],
      },
      'data_erasure_request',
    );

    return NextResponse.json({ message: 'Data erasure request processed' });
  }

  private async handleDataPortability(userId: string): Promise<NextResponse> {
    const portableData = await this.generatePortableData(userId);

    return NextResponse.json({
      message: 'Data portability export ready',
      data: portableData,
      format: 'JSON',
    });
  }

  private async handleProcessingRestriction(
    request: NextRequest,
    userId: string,
  ): Promise<NextResponse> {
    const restrictions = await request.json();

    // Apply processing restrictions
    await this.applyProcessingRestrictions(userId, restrictions);

    return NextResponse.json({ message: 'Processing restrictions applied' });
  }

  // Utility methods
  private isExemptPath(path: string): boolean {
    return this.config.exemptPaths.some((exemptPath) =>
      path.startsWith(exemptPath),
    );
  }

  private getClientIP(request: NextRequest): string | undefined {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined
    );
  }

  private async extractUserIdFromAuth(
    authHeader: string,
  ): Promise<string | undefined> {
    // Implement JWT validation or session lookup
    // This is a placeholder - implement according to your auth system
    return undefined;
  }

  private detectPersonalData(data: any): boolean {
    const personalDataIndicators = [
      'email',
      'phone',
      'address',
      'name',
      'birthday',
      'ssn',
    ];
    const dataStr = JSON.stringify(data).toLowerCase();

    return personalDataIndicators.some((indicator) =>
      dataStr.includes(indicator),
    );
  }

  private containsSpecialCategoryData(data: any): boolean {
    const specialCategoryIndicators = [
      'health',
      'medical',
      'religious',
      'political',
      'racial',
      'sexual',
    ];
    const dataStr = JSON.stringify(data).toLowerCase();

    return specialCategoryIndicators.some((indicator) =>
      dataStr.includes(indicator),
    );
  }

  private extractDataFields(data: any): string[] {
    return Object.keys(data || {});
  }

  private async identifyDataTypes(
    request: NextRequest,
    context: PrivacyContext,
  ): Promise<string[]> {
    // Analyze request to identify data types
    return ['user_data']; // Simplified implementation
  }

  private determineSensitivityLevel(
    path: string,
  ): 'personal' | 'sensitive' | 'special_category' {
    if (path.includes('/health') || path.includes('/medical')) {
      return 'special_category';
    }
    if (path.includes('/payment') || path.includes('/financial')) {
      return 'sensitive';
    }
    return 'personal';
  }

  private inferProcessingPurpose(path: string): string {
    if (path.includes('/wedding')) return 'wedding_planning';
    if (path.includes('/photo')) return 'photo_sharing';
    if (path.includes('/vendor')) return 'vendor_coordination';
    if (path.includes('/marketing')) return 'marketing';
    return 'application_functionality';
  }

  private checkThirdPartySharing(path: string): boolean {
    return (
      path.includes('/share') ||
      path.includes('/export') ||
      path.includes('/vendor')
    );
  }

  private checkAutomatedDecisionMaking(path: string): boolean {
    return (
      path.includes('/recommendation') ||
      path.includes('/suggest') ||
      path.includes('/auto')
    );
  }

  private async logGDPROperation(
    context: PrivacyContext,
    operation: string,
    metadata?: any,
  ): Promise<void> {
    await this.supabase.from('gdpr_operations_log').insert({
      user_id: context.userId,
      session_id: context.sessionId,
      operation,
      path: context.path,
      method: context.method,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      metadata,
      created_at: new Date().toISOString(),
    });
  }

  // Placeholder methods for data subject rights (implement according to your schema)
  private async collectUserData(userId: string): Promise<any> {
    // Implement comprehensive data collection from all relevant tables
    return { placeholder: 'Implement data collection' };
  }

  private async applyDataCorrections(
    userId: string,
    corrections: any,
  ): Promise<void> {
    // Implement data correction logic
  }

  private async performDataErasure(userId: string): Promise<void> {
    // Implement secure data erasure while maintaining legal requirements
  }

  private async generatePortableData(userId: string): Promise<any> {
    // Generate machine-readable data export
    return { placeholder: 'Implement data export' };
  }

  private async applyProcessingRestrictions(
    userId: string,
    restrictions: any,
  ): Promise<void> {
    // Implement processing restriction logic
  }
}

// Factory function to create GDPR middleware
export function createGDPRMiddleware(config?: Partial<GDPRMiddlewareConfig>) {
  const middleware = new GDPRMiddleware(config);

  return async function gdprMiddleware(request: NextRequest) {
    return await middleware.handle(request);
  };
}

// Export default middleware instance
export const gdprMiddleware = createGDPRMiddleware();

// Higher-order function to wrap API route handlers with GDPR compliance
export function withGDPRCompliance<T extends [NextRequest, ...any[]], R>(
  handler: (...args: T) => Promise<R>,
  config?: {
    processingPurpose?: string;
    requireExplicitConsent?: boolean;
    enableDataMinimization?: boolean;
  },
) {
  return async (...args: T): Promise<R> => {
    const [request] = args;
    const middleware = new GDPRMiddleware();

    // Perform GDPR compliance checks
    if (config?.processingPurpose && request.method !== 'GET') {
      try {
        const body = await request.clone().json();
        const validation = await middleware.validateDataProcessing(
          request,
          body,
          config.processingPurpose,
        );

        if (!validation.allowed && validation.response) {
          return validation.response as R;
        }
      } catch (error) {
        // Continue if body parsing fails
      }
    }

    return await handler(...args);
  };
}
