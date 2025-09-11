import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auditLogger } from '@/lib/compliance/audit/tamper-proof-logging';
import { z } from 'zod';

// Consent validation schema
const consentUpdateSchema = z.object({
  consentType: z.string().min(1).max(100),
  purpose: z.string().min(10).max(500),
  isGranted: z.boolean(),
  legalBasis: z
    .enum([
      'consent',
      'contract',
      'legal_obligation',
      'vital_interests',
      'public_task',
      'legitimate_interests',
    ])
    .default('consent'),
  expiryDate: z.string().datetime().optional(),
  processingPurpose: z.string().min(10).max(500),
  dataCategories: z.array(z.string()).optional().default([]),
  retentionPeriod: z.string().optional(), // ISO duration format
});

// Legal basis requirements
const LEGAL_BASIS_REQUIREMENTS = {
  consent: { withdrawable: true, requires_explicit_action: true },
  contract: { withdrawable: false, requires_explicit_action: false },
  legal_obligation: { withdrawable: false, requires_explicit_action: false },
  vital_interests: { withdrawable: false, requires_explicit_action: false },
  public_task: { withdrawable: true, requires_explicit_action: false },
  legitimate_interests: { withdrawable: true, requires_explicit_action: false },
};

// Predefined consent types with their purposes and legal basis
const CONSENT_TYPES = {
  marketing_emails: {
    purpose: 'Receive promotional emails about wedding services and offers',
    legal_basis: 'consent',
    data_categories: ['email', 'preferences'],
    retention_period: 'P3Y', // 3 years
  },
  analytics_cookies: {
    purpose: 'Help us improve our service by analyzing usage patterns',
    legal_basis: 'legitimate_interests',
    data_categories: ['usage_data', 'technical_data'],
    retention_period: 'P2Y', // 2 years
  },
  essential_cookies: {
    purpose: 'Required for basic website functionality and security',
    legal_basis: 'legitimate_interests',
    data_categories: ['session_data', 'security_data'],
    retention_period: 'P1Y', // 1 year
  },
  wedding_data_processing: {
    purpose:
      'Process your wedding information to provide core planning services',
    legal_basis: 'contract',
    data_categories: ['personal_data', 'wedding_data', 'guest_data'],
    retention_period: 'P7Y', // 7 years
  },
  vendor_data_sharing: {
    purpose: 'Share relevant wedding details with selected vendors',
    legal_basis: 'consent',
    data_categories: ['contact_data', 'wedding_preferences'],
    retention_period: 'P5Y', // 5 years
  },
  communication_preferences: {
    purpose: 'Manage how we communicate with you about your wedding',
    legal_basis: 'legitimate_interests',
    data_categories: ['contact_data', 'communication_preferences'],
    retention_period: 'P3Y', // 3 years
  },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = consentUpdateSchema.parse(body);

    // Check if this is a predefined consent type
    const predefinedConsent =
      CONSENT_TYPES[validatedData.consentType as keyof typeof CONSENT_TYPES];

    // Use predefined values or allow custom ones
    const consentData = {
      user_id: user.id,
      consent_type: validatedData.consentType,
      purpose: predefinedConsent?.purpose || validatedData.purpose,
      is_granted: validatedData.isGranted,
      legal_basis: predefinedConsent?.legal_basis || validatedData.legalBasis,
      processing_purpose: validatedData.processingPurpose,
      data_categories:
        predefinedConsent?.data_categories || validatedData.dataCategories,
      retention_period:
        predefinedConsent?.retention_period || validatedData.retentionPeriod,
      expiry_date: validatedData.expiryDate
        ? new Date(validatedData.expiryDate)
        : null,
      metadata: {
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        legal_basis_explanation: this.getLegalBasisExplanation(
          predefinedConsent?.legal_basis || validatedData.legalBasis,
        ),
      },
    };

    // Validate legal basis requirements
    const legalBasisReq =
      LEGAL_BASIS_REQUIREMENTS[
        consentData.legal_basis as keyof typeof LEGAL_BASIS_REQUIREMENTS
      ];

    if (
      legalBasisReq.requires_explicit_action &&
      validatedData.isGranted &&
      !body.explicitConsent
    ) {
      return NextResponse.json(
        {
          error: 'Explicit consent required',
          message: 'This consent type requires explicit user action',
        },
        { status: 400 },
      );
    }

    // Check existing consent to determine if this is an update
    const { data: existingConsent, error: fetchError } = await supabase
      .from('consent_records')
      .select('is_granted, granted_at, withdrawn_at')
      .eq('user_id', user.id)
      .eq('consent_type', validatedData.consentType)
      .single();

    // Check for consent conflicts (e.g., trying to withdraw contract-based consent)
    if (
      existingConsent &&
      !validatedData.isGranted &&
      !legalBasisReq.withdrawable
    ) {
      return NextResponse.json(
        {
          error: 'Cannot withdraw consent',
          message: `Consent based on ${consentData.legal_basis} cannot be withdrawn`,
        },
        { status: 400 },
      );
    }

    // Upsert consent record
    const { data: consentRecord, error: upsertError } = await supabase
      .from('consent_records')
      .upsert(consentData, {
        onConflict: 'user_id,consent_type',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (upsertError) {
      throw upsertError;
    }

    // Log consent change for audit trail
    await auditLogger.logConsentChange({
      userId: user.id,
      consentType: validatedData.consentType,
      previousValue: existingConsent?.is_granted || false,
      newValue: validatedData.isGranted,
      purpose: consentData.purpose,
      legalBasis: consentData.legal_basis,
      metadata: {
        data_categories: consentData.data_categories,
        retention_period: consentData.retention_period,
        processing_purpose: consentData.processing_purpose,
        user_initiated: true,
      },
      context: {
        ip_address: consentData.metadata.ip_address,
        user_agent: consentData.metadata.user_agent,
        request_id: crypto.randomUUID(),
      },
    });

    // Additional logging for high-risk consent changes
    if (
      validatedData.consentType === 'vendor_data_sharing' ||
      validatedData.consentType === 'marketing_emails'
    ) {
      await auditLogger.logDataAccess({
        userId: user.id,
        accessedBy: user.id,
        resourceType: 'consent_preferences',
        resourceId: validatedData.consentType,
        purpose: 'consent_management',
        dataTypes: ['consent_data', 'preference_data'],
        metadata: {
          consent_action: validatedData.isGranted ? 'granted' : 'withdrawn',
          high_risk_consent: true,
        },
        context: {
          ip_address: consentData.metadata.ip_address,
          user_agent: consentData.metadata.user_agent,
        },
      });
    }

    // Check for potential data processing implications
    const implications = await this.assessConsentImplications(
      user.id,
      validatedData.consentType,
      validatedData.isGranted,
      supabase,
    );

    return NextResponse.json(
      {
        success: true,
        consent: {
          id: consentRecord.id,
          type: consentRecord.consent_type,
          granted: consentRecord.is_granted,
          legal_basis: consentRecord.legal_basis,
          updated_at: consentRecord.updated_at,
          expiry_date: consentRecord.expiry_date,
          can_withdraw: legalBasisReq.withdrawable,
        },
        implications,
        message: validatedData.isGranted
          ? 'Consent granted successfully'
          : 'Consent withdrawn successfully',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Consent update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid consent data',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    // Log failed consent attempt
    try {
      await auditLogger.logSecurityViolation({
        violationType: 'CONSENT_UPDATE_FAILURE',
        severity: 'medium',
        actorId: 'unknown',
        description: 'Failed consent update attempt',
        preventedAction: 'consent_modification',
        metadata: { error: error.message },
      });
    } catch (logError) {
      console.error('Failed to log consent failure:', logError);
    }

    return NextResponse.json(
      { error: 'Failed to update consent' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's consent records
    const { data: consents, error } = await supabase
      .from('consent_records')
      .select(
        `
        consent_type,
        purpose,
        is_granted,
        granted_at,
        withdrawn_at,
        expiry_date,
        legal_basis,
        processing_purpose,
        data_categories,
        retention_period,
        updated_at
      `,
      )
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Log access for audit trail
    await auditLogger.logDataAccess({
      userId: user.id,
      accessedBy: user.id,
      resourceType: 'consent_records',
      resourceId: 'user_consents',
      purpose: 'consent_dashboard_view',
      dataTypes: ['consent_data'],
      context: {
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Enhance consents with additional metadata
    const enhancedConsents = consents?.map((consent) => {
      const legalBasisReq =
        LEGAL_BASIS_REQUIREMENTS[
          consent.legal_basis as keyof typeof LEGAL_BASIS_REQUIREMENTS
        ];
      const isExpired = consent.expiry_date
        ? new Date(consent.expiry_date) < new Date()
        : false;

      return {
        ...consent,
        can_withdraw: legalBasisReq.withdrawable,
        is_expired: isExpired,
        status: isExpired
          ? 'expired'
          : consent.is_granted
            ? 'active'
            : 'withdrawn',
        legal_basis_explanation: this.getLegalBasisExplanation(
          consent.legal_basis,
        ),
      };
    });

    // Get available consent types that user hasn't configured yet
    const configuredTypes = consents?.map((c) => c.consent_type) || [];
    const availableTypes = Object.entries(CONSENT_TYPES)
      .filter(([type]) => !configuredTypes.includes(type))
      .map(([type, config]) => ({
        type,
        purpose: config.purpose,
        legal_basis: config.legal_basis,
        data_categories: config.data_categories,
        can_withdraw:
          LEGAL_BASIS_REQUIREMENTS[
            config.legal_basis as keyof typeof LEGAL_BASIS_REQUIREMENTS
          ].withdrawable,
      }));

    return NextResponse.json({
      consents: enhancedConsents,
      available_consent_types: availableTypes,
      privacy_rights: {
        can_export_data: true,
        can_delete_data: true,
        can_restrict_processing: true,
        can_object_to_processing: true,
      },
    });
  } catch (error) {
    console.error('Failed to fetch consents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consents' },
      { status: 500 },
    );
  }
}

// Helper methods (these would be class methods in a real implementation)
function getLegalBasisExplanation(legalBasis: string): string {
  const explanations = {
    consent:
      'You have given clear consent for us to process your personal data for this specific purpose.',
    contract:
      'Processing is necessary for the performance of a contract with you.',
    legal_obligation:
      'Processing is necessary for compliance with a legal obligation.',
    vital_interests: 'Processing is necessary to protect vital interests.',
    public_task:
      'Processing is necessary for the performance of a task carried out in the public interest.',
    legitimate_interests:
      'Processing is necessary for our legitimate interests or those of a third party.',
  };
  return (
    explanations[legalBasis as keyof typeof explanations] ||
    'Unknown legal basis'
  );
}

async function assessConsentImplications(
  userId: string,
  consentType: string,
  isGranted: boolean,
  supabase: any,
): Promise<string[]> {
  const implications: string[] = [];

  // Assess implications based on consent type
  switch (consentType) {
    case 'marketing_emails':
      if (!isGranted) {
        implications.push(
          'You will no longer receive promotional emails about wedding services',
        );
        implications.push(
          'You may miss out on special offers and wedding planning tips',
        );
      }
      break;

    case 'analytics_cookies':
      if (!isGranted) {
        implications.push(
          'We cannot analyze your usage patterns to improve your experience',
        );
        implications.push('Some features may not work as expected');
      }
      break;

    case 'vendor_data_sharing':
      if (!isGranted) {
        implications.push(
          'Vendors will not receive your contact information automatically',
        );
        implications.push(
          'You may need to share details manually with each vendor',
        );
      }
      break;

    case 'essential_cookies':
      if (!isGranted) {
        implications.push(
          'WARNING: Essential cookies are required for basic functionality',
        );
        implications.push(
          'The website may not work properly without these cookies',
        );
      }
      break;
  }

  return implications;
}
