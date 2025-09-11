/**
 * Viral A/B Testing Variant Selection API - GET /api/viral/ab-testing/select
 * WS-141 Round 2: Real-time variant selection for invitations
 * SECURITY: Rate limited, authenticated, optimized for <50ms response
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import {
  ViralABTestingService,
  type RelationshipType,
} from '@/lib/services/viral-ab-testing-service';

// Query parameter validation schema
const variantSelectionSchema = z.object({
  relationship_type: z.enum(['past_client', 'vendor', 'friend']),
  user_id: z.string().uuid().optional(), // Optional - will use session user if not provided
  context: z
    .object({
      recipient_email: z.string().email().optional(),
      campaign_id: z.string().optional(),
      channel: z.enum(['email', 'sms', 'whatsapp']).default('email'),
    })
    .optional(),
});

// Response type for variant selection
interface VariantSelectionResponse {
  success: true;
  data: {
    variant_id: string;
    template: string;
    tracking_id: string;
    test_group: 'control' | 'variant_a' | 'variant_b' | 'variant_c';
    relationship_type: string;
    selection_metadata: {
      selected_at: string;
      user_id: string;
      algorithm_version: string;
      processing_time_ms: number;
    };
  };
  cache_ttl: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      );
    }

    // High-frequency rate limiting for variant selection (performance critical)
    const rateLimitResult = await rateLimit.check(
      `viral_variant_select:${session.user.id}`,
      60, // 60 requests
      60, // per minute (1 per second average)
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Variant selection rate limit exceeded.',
          retry_after: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Parse context if provided
    if (queryParams.context) {
      try {
        queryParams.context = JSON.parse(queryParams.context);
      } catch {
        return NextResponse.json(
          {
            error: 'INVALID_CONTEXT',
            message: 'Context parameter must be valid JSON',
          },
          { status: 400 },
        );
      }
    }

    const validationResult = variantSelectionSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'INVALID_QUERY_PARAMETERS',
          message: 'Invalid query parameters provided',
          details: validationResult.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`,
          ),
        },
        { status: 400 },
      );
    }

    const { relationship_type, user_id, context } = validationResult.data;
    const targetUserId = user_id || session.user.id;

    // Performance-critical variant selection
    const selectionStartTime = Date.now();
    const variantSelection =
      await ViralABTestingService.selectInvitationVariant(
        relationship_type as RelationshipType,
        targetUserId,
      );
    const selectionTime = Date.now() - selectionStartTime;

    // Log performance metrics if approaching limit
    if (selectionTime > 40) {
      console.warn(
        `Variant selection took ${selectionTime}ms - approaching 50ms limit`,
        {
          relationship_type,
          user_id: targetUserId,
          variant: variantSelection.variant,
        },
      );
    }

    // Track selection context for optimization
    if (context) {
      // Fire-and-forget context tracking for future optimization
      trackSelectionContext(variantSelection.tracking_id, context).catch(
        (error) => console.error('Context tracking failed:', error),
      );
    }

    const response: VariantSelectionResponse = {
      success: true,
      data: {
        variant_id: variantSelection.variant,
        template: variantSelection.template,
        tracking_id: variantSelection.tracking_id,
        test_group: variantSelection.test_group,
        relationship_type,
        selection_metadata: {
          selected_at: new Date().toISOString(),
          user_id: targetUserId,
          algorithm_version: '2.0.0',
          processing_time_ms: selectionTime,
        },
      },
      cache_ttl: 3600, // 1 hour cache for same user/relationship_type combo
    };

    const totalProcessingTime = Date.now() - startTime;

    // Add performance headers for monitoring
    return NextResponse.json(response, {
      headers: {
        'X-Processing-Time': `${totalProcessingTime}ms`,
        'X-Selection-Time': `${selectionTime}ms`,
        'Cache-Control': 'private, max-age=3600', // 1 hour cache
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
        'X-Algorithm-Version': '2.0.0',
      },
    });
  } catch (error) {
    console.error('Variant selection API error:', error);

    const processingTime = Date.now() - startTime;

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to select variant',
        timestamp: new Date().toISOString(),
        processing_time: `${processingTime}ms`,
      },
      { status: 500 },
    );
  }
}

// Helper function for context tracking
async function trackSelectionContext(
  trackingId: string,
  context: any,
): Promise<void> {
  try {
    const query = `
      INSERT INTO viral_ab_selection_context
      (tracking_id, recipient_email, campaign_id, channel, context_data, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (tracking_id) DO UPDATE SET
        updated_at = NOW(),
        context_data = $5
    `;

    await fetch('/api/internal/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        params: [
          trackingId,
          context.recipient_email || null,
          context.campaign_id || null,
          context.channel || 'email',
          JSON.stringify(context),
        ],
      }),
    });
  } catch (error) {
    console.error('Context tracking error:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * POST /api/viral/ab-testing/select
 * Batch variant selection for multiple users/relationships
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      );
    }

    // Higher rate limit for batch operations
    const rateLimitResult = await rateLimit.check(
      `viral_batch_select:${session.user.id}`,
      10, // 10 requests
      300, // per 5 minutes
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Batch selection rate limit exceeded.',
          retry_after: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Parse and validate request body
    const body = await request.json();

    const batchSelectionSchema = z.object({
      selections: z
        .array(
          z.object({
            user_id: z.string().uuid(),
            relationship_type: z.enum(['past_client', 'vendor', 'friend']),
            context: z
              .object({
                recipient_email: z.string().email().optional(),
                campaign_id: z.string().optional(),
                channel: z.enum(['email', 'sms', 'whatsapp']).default('email'),
              })
              .optional(),
          }),
        )
        .min(1)
        .max(50), // Limit batch size to prevent abuse
    });

    const validationResult = batchSelectionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST_BODY',
          message: 'Invalid batch selection request',
          details: validationResult.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`,
          ),
        },
        { status: 400 },
      );
    }

    const { selections } = validationResult.data;

    // Process selections in parallel for performance
    const selectionPromises = selections.map(async (selection) => {
      try {
        const variantSelection =
          await ViralABTestingService.selectInvitationVariant(
            selection.relationship_type as RelationshipType,
            selection.user_id,
          );

        return {
          success: true,
          user_id: selection.user_id,
          relationship_type: selection.relationship_type,
          variant_id: variantSelection.variant,
          template: variantSelection.template,
          tracking_id: variantSelection.tracking_id,
          test_group: variantSelection.test_group,
        };
      } catch (error) {
        console.error(
          `Batch selection failed for user ${selection.user_id}:`,
          error,
        );
        return {
          success: false,
          user_id: selection.user_id,
          relationship_type: selection.relationship_type,
          error: 'SELECTION_FAILED',
          message: 'Failed to select variant for this user',
        };
      }
    });

    const results = await Promise.all(selectionPromises);
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        total_requests: selections.length,
        successful_selections: successful.length,
        failed_selections: failed.length,
        results: results,
        processing_time_ms: processingTime,
      },
      message: `Processed ${selections.length} variant selections`,
    };

    return NextResponse.json(response, {
      headers: {
        'X-Processing-Time': `${processingTime}ms`,
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error('Batch variant selection error:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process batch variant selection',
        timestamp: new Date().toISOString(),
        processing_time: `${Date.now() - startTime}ms`,
      },
      { status: 500 },
    );
  }
}
