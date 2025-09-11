// Multi-Jurisdiction Compliance API for International Weddings
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { MultiJurisdictionComplianceService } from '@/lib/services/multi-jurisdiction-compliance.service';
import { z } from 'zod';

// Rate limiting
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // Max 20 requests per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now });
    return true;
  }

  if (now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Validation schemas
const JurisdictionAssessmentSchema = z.object({
  organizationId: z.string().uuid(),
  weddingId: z.string().uuid().optional(),
  ceremonyCountry: z.string().length(2).optional(),
  receptionCountry: z.string().length(2).optional(),
  coupleResidenceCountries: z.array(z.string().length(2)),
  expectedGuestCountries: z.array(z.string().length(2)),
  vendorCountries: z.array(z.string().length(2)),
  dataProcessingRequirements: z.object({
    guestListProcessing: z.boolean(),
    photoProcessing: z.boolean(),
    paymentProcessing: z.boolean(),
    vendorDataSharing: z.boolean(),
  }),
});

const CrossBorderTransferSchema = z.object({
  organizationId: z.string().uuid(),
  weddingJurisdictionId: z.string().uuid().optional(),
  dataCategory: z.enum(['guest_data', 'photos', 'payment_data', 'vendor_data']),
  sourceCountry: z.string().length(2),
  destinationCountry: z.string().length(2),
  legalBasis: z.string(),
  transferDocumentation: z.string().optional(),
  affectedDataSubjectsCount: z.number().min(0),
  dataSubjectCategories: z.array(z.string()),
  riskMitigationMeasures: z.string().optional(),
});

const BreachNotificationSchema = z.object({
  securityIncidentId: z.string().uuid(),
  weddingJurisdictionId: z.string().uuid(),
});

// POST - Handle multi-jurisdiction compliance requests
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check authentication
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }

    // Rate limiting
    const userId = session.user.id;
    if (!checkRateLimit(`multi-jurisdiction-${userId}`)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          details: 'Maximum 20 requests per minute allowed',
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { action, ...data } = body;

    const complianceService = new MultiJurisdictionComplianceService();

    console.log(
      `[MultiJurisdictionAPI] Processing ${action} request for user:`,
      userId,
    );

    switch (action) {
      case 'assess_jurisdiction_requirements': {
        const validatedData = JurisdictionAssessmentSchema.parse(data);

        // Verify user has access to the organization
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('organization_id, role')
          .eq('id', userId)
          .single();

        if (
          profileError ||
          !userProfile ||
          userProfile.organization_id !== validatedData.organizationId
        ) {
          return NextResponse.json(
            { error: 'Access denied to organization', code: 'FORBIDDEN' },
            { status: 403 },
          );
        }

        console.log(
          '[MultiJurisdictionAPI] Starting jurisdictional assessment for organization:',
          validatedData.organizationId,
        );

        const assessment =
          await complianceService.assessWeddingJurisdictionalRequirements(
            validatedData,
          );

        return NextResponse.json({
          success: true,
          data: assessment,
          message: 'Jurisdictional assessment completed successfully',
          metadata: {
            assessmentId: assessment.weddingJurisdictionId,
            jurisdictionsCount: assessment.applicableJurisdictions.length,
            riskLevel: assessment.riskAssessment.overallRisk,
          },
        });
      }

      case 'create_breach_notifications': {
        const validatedData = BreachNotificationSchema.parse(data);

        // Verify user has access to the security incident
        const { data: incident, error: incidentError } = await supabase
          .from('security_incidents')
          .select(
            `
            *,
            organizations!inner(id)
          `,
          )
          .eq('id', validatedData.securityIncidentId)
          .single();

        if (incidentError || !incident) {
          return NextResponse.json(
            { error: 'Security incident not found', code: 'NOT_FOUND' },
            { status: 404 },
          );
        }

        // Check user has access to the organization
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', userId)
          .single();

        if (
          profileError ||
          !userProfile ||
          userProfile.organization_id !== incident.organizations.id
        ) {
          return NextResponse.json(
            { error: 'Access denied to security incident', code: 'FORBIDDEN' },
            { status: 403 },
          );
        }

        console.log(
          '[MultiJurisdictionAPI] Creating breach notifications for incident:',
          validatedData.securityIncidentId,
        );

        const notifications =
          await complianceService.createMultiJurisdictionBreachNotifications(
            validatedData.securityIncidentId,
            validatedData.weddingJurisdictionId,
          );

        return NextResponse.json({
          success: true,
          data: notifications,
          message: `Created ${notifications.length} multi-jurisdiction breach notifications`,
          metadata: {
            notificationsCount: notifications.length,
            jurisdictions: notifications.map((n) => n.jurisdiction.countryCode),
            deadlines: notifications.map((n) => ({
              country: n.jurisdiction.countryCode,
              deadlineHours: n.deadlineHours,
            })),
          },
        });
      }

      case 'track_cross_border_transfer': {
        const validatedData = CrossBorderTransferSchema.parse(data);

        // Verify user has access to the organization
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', userId)
          .single();

        if (
          profileError ||
          !userProfile ||
          userProfile.organization_id !== validatedData.organizationId
        ) {
          return NextResponse.json(
            { error: 'Access denied to organization', code: 'FORBIDDEN' },
            { status: 403 },
          );
        }

        console.log('[MultiJurisdictionAPI] Tracking cross-border transfer:', {
          dataCategory: validatedData.dataCategory,
          from: validatedData.sourceCountry,
          to: validatedData.destinationCountry,
        });

        const transferId =
          await complianceService.trackCrossBorderDataTransfer(validatedData);

        return NextResponse.json({
          success: true,
          data: { transferId },
          message: 'Cross-border data transfer tracked successfully',
          metadata: {
            dataCategory: validatedData.dataCategory,
            sourceCountry: validatedData.sourceCountry,
            destinationCountry: validatedData.destinationCountry,
            affectedSubjects: validatedData.affectedDataSubjectsCount,
          },
        });
      }

      case 'get_compliance_metrics': {
        const { organizationId } = data;

        if (!organizationId) {
          return NextResponse.json(
            { error: 'Organization ID is required', code: 'MISSING_PARAMETER' },
            { status: 400 },
          );
        }

        // Verify user has access to the organization
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', userId)
          .single();

        if (
          profileError ||
          !userProfile ||
          userProfile.organization_id !== organizationId
        ) {
          return NextResponse.json(
            { error: 'Access denied to organization', code: 'FORBIDDEN' },
            { status: 403 },
          );
        }

        console.log(
          '[MultiJurisdictionAPI] Getting compliance metrics for organization:',
          organizationId,
        );

        const metrics =
          await complianceService.getComplianceMonitoringMetrics(
            organizationId,
          );

        return NextResponse.json({
          success: true,
          data: metrics,
          message: 'Compliance metrics retrieved successfully',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action specified', code: 'INVALID_ACTION' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('[MultiJurisdictionAPI] Request failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      // Wedding day safety - never expose sensitive errors during live weddings
      const isWeddingDay = new Date().getDay() === 6; // Saturday
      const errorMessage = isWeddingDay
        ? 'Service temporarily unavailable'
        : error.message;

      return NextResponse.json(
        {
          error: errorMessage,
          code: 'INTERNAL_ERROR',
          details: isWeddingDay ? 'Please contact support' : error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
      },
      { status: 500 },
    );
  }
}

// GET - Retrieve compliance information
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check authentication
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const organizationId = searchParams.get('organizationId');
    const weddingJurisdictionId = searchParams.get('weddingJurisdictionId');

    // Rate limiting
    const userId = session.user.id;
    if (!checkRateLimit(`multi-jurisdiction-get-${userId}`)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          details: 'Maximum 20 requests per minute allowed',
        },
        { status: 429 },
      );
    }

    // Verify user has access to the organization
    if (organizationId) {
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (
        profileError ||
        !userProfile ||
        userProfile.organization_id !== organizationId
      ) {
        return NextResponse.json(
          { error: 'Access denied to organization', code: 'FORBIDDEN' },
          { status: 403 },
        );
      }
    }

    console.log(
      `[MultiJurisdictionAPI] Processing GET ${action} request for user:`,
      userId,
    );

    switch (action) {
      case 'list_jurisdictions': {
        const { data: jurisdictions, error } = await supabase
          .from('compliance_jurisdictions')
          .select('*')
          .eq('is_active', true)
          .order('country_name');

        if (error) {
          throw new Error(`Failed to fetch jurisdictions: ${error.message}`);
        }

        return NextResponse.json({
          success: true,
          data: jurisdictions,
          message: 'Jurisdictions retrieved successfully',
        });
      }

      case 'get_wedding_compliance': {
        if (!weddingJurisdictionId) {
          return NextResponse.json(
            {
              error: 'Wedding jurisdiction ID is required',
              code: 'MISSING_PARAMETER',
            },
            { status: 400 },
          );
        }

        const { data: weddingCompliance, error } = await supabase
          .from('wedding_jurisdiction_compliance')
          .select(
            `
            *,
            compliance_jurisdictions!primary_jurisdiction(*)
          `,
          )
          .eq('id', weddingJurisdictionId)
          .single();

        if (error || !weddingCompliance) {
          return NextResponse.json(
            { error: 'Wedding compliance record not found', code: 'NOT_FOUND' },
            { status: 404 },
          );
        }

        return NextResponse.json({
          success: true,
          data: weddingCompliance,
          message: 'Wedding compliance retrieved successfully',
        });
      }

      case 'get_cross_border_transfers': {
        if (!organizationId) {
          return NextResponse.json(
            { error: 'Organization ID is required', code: 'MISSING_PARAMETER' },
            { status: 400 },
          );
        }

        const { data: transfers, error } = await supabase
          .from('cross_border_data_transfers')
          .select('*')
          .eq('organization_id', organizationId)
          .order('transfer_date', { ascending: false })
          .limit(100);

        if (error) {
          throw new Error(`Failed to fetch transfers: ${error.message}`);
        }

        return NextResponse.json({
          success: true,
          data: transfers,
          message: 'Cross-border transfers retrieved successfully',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action specified', code: 'INVALID_ACTION' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('[MultiJurisdictionAPI] GET request failed:', error);

    if (error instanceof Error) {
      // Wedding day safety - never expose sensitive errors during live weddings
      const isWeddingDay = new Date().getDay() === 6; // Saturday
      const errorMessage = isWeddingDay
        ? 'Service temporarily unavailable'
        : error.message;

      return NextResponse.json(
        {
          error: errorMessage,
          code: 'INTERNAL_ERROR',
          details: isWeddingDay ? 'Please contact support' : error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
      },
      { status: 500 },
    );
  }
}
