import { NextRequest, NextResponse } from 'next/server';
import { createSecureRoute, SecurityPresets } from '@/lib/middleware/security';
import { auditLogger } from '@/lib/middleware/audit';
import { createClient } from '@/lib/supabase/server';
import {
  reviewCampaignCreateSchema,
  reviewCampaignUpdateSchema,
} from '@/lib/validations/review-schemas';
import { z } from 'zod';

const getCampaignsQuerySchema = z.object({
  supplier_id: z.string().uuid(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /api/reviews/campaigns - List review campaigns for supplier
 */
export const GET = createSecureRoute(
  {
    ...SecurityPresets.SUPPLIER,
    validateQuery: getCampaignsQuerySchema,
  },
  async (req, context) => {
    const supabase = createClient();
    const { supplier_id, status, limit, offset } = (req as any).validatedData
      .query;

    // Verify supplier ownership
    if (supplier_id !== req.supplierId) {
      await auditLogger.logSecurityEvent(
        'suspicious_activity',
        req.ip,
        req.headers.get('user-agent') || undefined,
        req.userId,
        {
          attempted_supplier_id: supplier_id,
          actual_supplier_id: req.supplierId,
          endpoint: '/api/reviews/campaigns',
        },
      );

      return NextResponse.json(
        { error: 'Unauthorized access to supplier data' },
        { status: 403 },
      );
    }

    try {
      let query = supabase
        .from('review_campaigns')
        .select(
          `
          id,
          name,
          trigger_days_after_wedding,
          message_template,
          incentive_type,
          incentive_value,
          target_platforms,
          is_active,
          total_requests_sent,
          total_reviews_collected,
          average_rating,
          response_rate,
          created_at,
          updated_at
        `,
        )
        .eq('supplier_id', supplier_id)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (status) {
        const isActive = status === 'active';
        query = query.eq('is_active', isActive);
      }

      const { data: campaigns, error, count } = await query;

      if (error) {
        throw error;
      }

      return NextResponse.json({
        campaigns: campaigns || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (count || 0) > offset + limit,
        },
      });
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 },
      );
    }
  },
);

/**
 * POST /api/reviews/campaigns - Create new review campaign
 */
export const POST = createSecureRoute(
  {
    ...SecurityPresets.SUPPLIER,
    validateBody: reviewCampaignCreateSchema,
  },
  async (req, context) => {
    const supabase = createClient();
    const campaignData = (req as any).validatedData.body;

    // Verify supplier ownership
    if (campaignData.supplier_id !== req.supplierId) {
      await auditLogger.logSecurityEvent(
        'suspicious_activity',
        req.ip,
        req.headers.get('user-agent') || undefined,
        req.userId,
        {
          attempted_supplier_id: campaignData.supplier_id,
          actual_supplier_id: req.supplierId,
          endpoint: '/api/reviews/campaigns',
        },
      );

      return NextResponse.json(
        { error: 'Unauthorized access to supplier data' },
        { status: 403 },
      );
    }

    try {
      // Check campaign limits for supplier plan
      const { data: existingCampaigns, error: countError } = await supabase
        .from('review_campaigns')
        .select('id', { count: 'exact' })
        .eq('supplier_id', campaignData.supplier_id);

      if (countError) throw countError;

      // Basic plan limit (can be enhanced based on subscription)
      const maxCampaigns = 5;
      if ((existingCampaigns?.length || 0) >= maxCampaigns) {
        return NextResponse.json(
          { error: `Maximum number of campaigns reached (${maxCampaigns})` },
          { status: 400 },
        );
      }

      // Create campaign
      const newCampaign = {
        id: crypto.randomUUID(),
        ...campaignData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: campaign, error } = await supabase
        .from('review_campaigns')
        .insert(newCampaign)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await auditLogger.logCampaignEvent(
        'created',
        campaign.id,
        req.userId,
        req.supplierId!,
        {
          name: campaignData.name,
          trigger_days: campaignData.trigger_days_after_wedding,
          target_platforms: campaignData.target_platforms,
        },
      );

      return NextResponse.json(campaign, { status: 201 });
    } catch (error) {
      console.error('Failed to create campaign:', error);

      await auditLogger.logCampaignEvent(
        'created',
        'failed',
        req.userId,
        req.supplierId!,
        undefined,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          campaign_data: campaignData,
        },
      );

      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 },
      );
    }
  },
);
