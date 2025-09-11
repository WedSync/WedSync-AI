import { NextRequest, NextResponse } from 'next/server';
import { createSecureRoute, SecurityPresets } from '@/lib/middleware/security';
import { ReviewEngine } from '@/lib/reviews/review-engine';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const paramsSchema = z.object({
  token: z.string().uuid(),
});

/**
 * GET /api/reviews/request/[token] - Get review form data for client
 */
export const GET = createSecureRoute(
  {
    ...SecurityPresets.PUBLIC, // Public endpoint for clients
    validateParams: paramsSchema,
  },
  async (req, context) => {
    const supabase = createClient();
    const reviewEngine = new ReviewEngine();
    const { token } = (req as any).validatedData.params;

    try {
      // Track the request opening
      await reviewEngine.trackRequestOpen(token);

      // Get review request data
      const { data: request, error } = await supabase
        .from('review_requests')
        .select(
          `
          id,
          client_name,
          wedding_date,
          status,
          campaigns:review_campaigns!inner(
            id,
            name,
            message_template,
            target_platforms,
            incentive_type,
            incentive_value,
            suppliers:suppliers!inner(
              id,
              business_name,
              logo_url,
              website_url
            )
          )
        `,
        )
        .eq('request_token', token)
        .neq('status', 'expired')
        .single();

      if (error || !request) {
        return NextResponse.json(
          { error: 'Review request not found or expired' },
          { status: 404 },
        );
      }

      // Check if already completed
      if (request.status === 'completed') {
        return NextResponse.json(
          {
            error: 'Review already submitted',
            completed: true,
          },
          { status: 409 },
        );
      }

      // Process message template
      const processedMessage = request.campaigns.message_template
        .replace(/\{client_name\}/g, request.client_name)
        .replace(
          /\{supplier_name\}/g,
          request.campaigns.suppliers.business_name,
        )
        .replace(
          /\{wedding_date\}/g,
          new Date(request.wedding_date).toLocaleDateString(),
        );

      return NextResponse.json({
        id: request.id,
        client_name: request.client_name,
        wedding_date: request.wedding_date,
        status: request.status,
        supplier: {
          name: request.campaigns.suppliers.business_name,
          logo_url: request.campaigns.suppliers.logo_url,
          website_url: request.campaigns.suppliers.website_url,
        },
        campaign: {
          name: request.campaigns.name,
          message: processedMessage,
          target_platforms: request.campaigns.target_platforms,
          incentive: {
            type: request.campaigns.incentive_type,
            value: request.campaigns.incentive_value,
          },
        },
      });
    } catch (error) {
      console.error('Failed to fetch review request:', error);
      return NextResponse.json(
        { error: 'Failed to fetch review request' },
        { status: 500 },
      );
    }
  },
);
