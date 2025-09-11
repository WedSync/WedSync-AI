import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withSecureValidation } from '@/lib/validation/middleware';
import { secureStringSchema, emailSchema } from '@/lib/validation/schemas';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { marketingAutomationService } from '@/lib/services/marketing-automation-service';
import { attributionTrackingService } from '@/lib/services/attribution-tracking-service';
import { rateLimitService } from '@/lib/ratelimit';

const viralInvitationSchema = z.object({
  recipient_email: emailSchema,
  wedding_context: z.object({
    couple_name: secureStringSchema.max(100),
    wedding_date: z.string().datetime(),
    venue: secureStringSchema.max(200),
    partner_first_name: secureStringSchema.max(50).optional(),
    partner_last_name: secureStringSchema.max(50).optional(),
    supplier_type: z
      .enum(['photographer', 'florist', 'caterer', 'dj', 'venue'])
      .optional(),
    business_name: secureStringSchema.max(100).optional(),
  }),
  personalization_data: z
    .object({
      relationship_context: z
        .enum(['peer_supplier', 'cross_supplier', 'supplier_to_couple'])
        .optional(),
      custom_message: secureStringSchema.max(500).optional(),
    })
    .optional(),
});

const attributionEventSchema = z.object({
  event_type: z.enum(['signup', 'conversion', 'payment', 'referral']),
  user_id: z.string().uuid(),
  referrer_id: z.string().uuid().optional(),
  conversion_value_cents: z.number().int().min(0).max(10000000), // $100k max
  attribution_source: z.enum([
    'viral_invitation',
    'campaign',
    'organic',
    'paid',
  ]),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/marketing/viral-invitations
 * Send viral invitation with wedding context and attribution tracking
 */
export const POST = withSecureValidation(
  viralInvitationSchema,
  async (request: NextRequest, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for viral invitations
    const rateLimitResult = await rateLimitService.checkViralInvitations(
      session.user.id,
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Viral invitation rate limit exceeded',
          retry_after: rateLimitResult.retry_after,
        },
        { status: 429 },
      );
    }

    try {
      const { recipient_email, wedding_context, personalization_data } =
        validatedData;

      // Convert wedding_context to the format expected by the service
      const weddingContext = {
        coupleName: wedding_context.couple_name,
        weddingDate: wedding_context.wedding_date,
        venue: wedding_context.venue,
        partnerFirstName: wedding_context.partner_first_name,
        partnerLastName: wedding_context.partner_last_name,
        daysUntilWedding: Math.ceil(
          (new Date(wedding_context.wedding_date).getTime() - Date.now()) /
            (24 * 60 * 60 * 1000),
        ),
        supplierType: wedding_context.supplier_type,
        businessName: wedding_context.business_name,
      };

      // Process the viral invitation
      const result = await marketingAutomationService.processViralInvitation(
        session.user.id,
        recipient_email,
        weddingContext,
      );

      if (!result.success) {
        return NextResponse.json(
          {
            error: 'Failed to send viral invitation',
            details: result.error,
          },
          { status: 500 },
        );
      }

      // Track the attribution event
      await attributionTrackingService.trackAttributionEvent({
        user_id: session.user.id,
        referrer_id: null, // This user is initiating the viral chain
        event_type: 'referral',
        attribution_source: 'viral_invitation',
        conversion_value_cents: 0, // Will be updated when recipient converts
        metadata: {
          invite_code: result.inviteCode,
          recipient_email,
          wedding_context: weddingContext,
        },
      });

      return NextResponse.json({
        success: true,
        invite_code: result.inviteCode,
        message_id: result.messageId,
        attribution_id: result.attributionId,
      });
    } catch (error) {
      console.error('Viral invitation API error:', error);
      return NextResponse.json(
        {
          error: 'Internal server error',
        },
        { status: 500 },
      );
    }
  },
);

/**
 * GET /api/marketing/viral-invitations
 * Get viral invitation metrics and performance
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange =
      (searchParams.get('time_range') as '7d' | '30d' | '90d' | 'all') || '30d';
    const includeChain = searchParams.get('include_chain') === 'true';

    // Get user's attribution performance
    const performance =
      await attributionTrackingService.getUserAttributionPerformance(
        session.user.id,
      );

    let response: any = {
      performance,
      time_range: timeRange,
    };

    // Include full viral chain if requested
    if (includeChain) {
      const chainMetrics =
        await attributionTrackingService.calculateViralChainMetrics(
          session.user.id,
        );
      response.viral_chain = chainMetrics;
    }

    // Get revenue attribution
    const revenueAttribution =
      await attributionTrackingService.getRevenueAttribution(
        session.user.id,
        timeRange,
      );
    response.revenue_attribution = revenueAttribution;

    return NextResponse.json(response);
  } catch (error) {
    console.error('Viral invitations GET API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
