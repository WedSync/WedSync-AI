import { NextRequest, NextResponse } from 'next/server';
import { createSecureRoute, SecurityPresets } from '@/lib/middleware/security';
import { auditLogger } from '@/lib/middleware/audit';
import { createClient } from '@/lib/supabase/server';
import { reviewCampaignUpdateSchema } from '@/lib/validations/review-schemas';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /api/reviews/campaigns/[id] - Get single campaign
 */
export const GET = createSecureRoute(
  {
    ...SecurityPresets.SUPPLIER,
    validateParams: paramsSchema,
  },
  async (req, context) => {
    const supabase = createClient();
    const { id } = (req as any).validatedData.params;

    try {
      const { data: campaign, error } = await supabase
        .from('review_campaigns')
        .select(
          `
          *,
          requests:review_requests(count),
          completed_requests:review_requests!inner(count)
        `,
        )
        .eq('id', id)
        .eq('supplier_id', req.supplierId)
        .eq('completed_requests.status', 'completed')
        .single();

      if (error || !campaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 },
        );
      }

      return NextResponse.json(campaign);
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaign' },
        { status: 500 },
      );
    }
  },
);

/**
 * PUT /api/reviews/campaigns/[id] - Update campaign
 */
export const PUT = createSecureRoute(
  {
    ...SecurityPresets.SUPPLIER,
    validateParams: paramsSchema,
    validateBody: reviewCampaignUpdateSchema,
  },
  async (req, context) => {
    const supabase = createClient();
    const { id } = (req as any).validatedData.params;
    const updateData = (req as any).validatedData.body;

    try {
      // Get existing campaign to check ownership and log changes
      const { data: existingCampaign, error: fetchError } = await supabase
        .from('review_campaigns')
        .select('*')
        .eq('id', id)
        .eq('supplier_id', req.supplierId)
        .single();

      if (fetchError || !existingCampaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 },
        );
      }

      // Update campaign
      const { data: campaign, error } = await supabase
        .from('review_campaigns')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('supplier_id', req.supplierId)
        .select()
        .single();

      if (error) throw error;

      // Log changes for audit
      const changes: Record<string, any> = {};
      Object.keys(updateData).forEach((key) => {
        if (existingCampaign[key] !== updateData[key]) {
          changes[key] = {
            from: existingCampaign[key],
            to: updateData[key],
          };
        }
      });

      if (Object.keys(changes).length > 0) {
        await auditLogger.logCampaignEvent(
          'updated',
          id,
          req.userId,
          req.supplierId!,
          changes,
        );
      }

      return NextResponse.json(campaign);
    } catch (error) {
      console.error('Failed to update campaign:', error);
      return NextResponse.json(
        { error: 'Failed to update campaign' },
        { status: 500 },
      );
    }
  },
);

/**
 * DELETE /api/reviews/campaigns/[id] - Delete campaign
 */
export const DELETE = createSecureRoute(
  {
    ...SecurityPresets.SUPPLIER,
    validateParams: paramsSchema,
  },
  async (req, context) => {
    const supabase = createClient();
    const { id } = (req as any).validatedData.params;

    try {
      // Check if campaign has active requests
      const { data: activeRequests, error: requestError } = await supabase
        .from('review_requests')
        .select('id')
        .eq('campaign_id', id)
        .in('status', ['pending', 'sent', 'opened'])
        .limit(1);

      if (requestError) throw requestError;

      if (activeRequests && activeRequests.length > 0) {
        return NextResponse.json(
          { error: 'Cannot delete campaign with active review requests' },
          { status: 400 },
        );
      }

      // Soft delete by marking as inactive
      const { data: campaign, error } = await supabase
        .from('review_campaigns')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('supplier_id', req.supplierId)
        .select()
        .single();

      if (error || !campaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 },
        );
      }

      // Log audit event
      await auditLogger.logCampaignEvent(
        'deleted',
        id,
        req.userId,
        req.supplierId!,
        { soft_delete: true },
      );

      return NextResponse.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      return NextResponse.json(
        { error: 'Failed to delete campaign' },
        { status: 500 },
      );
    }
  },
);
