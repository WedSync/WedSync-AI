import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { productManagementIntegration } from '@/lib/integrations/external-systems/ProductManagementIntegration';
import { z } from 'zod';

// Validation schema
const SyncRequestSchema = z.object({
  featureRequestId: z.string().uuid().optional(),
  syncAll: z.boolean().optional(),
});

/**
 * POST /api/feature-requests/external-systems/sync
 * Sync feature request status with external systems
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Authenticate user
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    // Validate request
    const body = await request.json();
    const validatedData = SyncRequestSchema.parse(body);

    if (validatedData.syncAll) {
      // Sync all feature requests with external issues
      const { data: featureRequests, error } = await supabase
        .from('feature_requests')
        .select('id')
        .not('external_issues', 'is', null);

      if (error) {
        throw new Error('Failed to fetch feature requests');
      }

      const syncResults = [];

      for (const fr of featureRequests || []) {
        const results =
          await productManagementIntegration.syncFeatureRequestStatus(fr.id);
        syncResults.push({
          featureRequestId: fr.id,
          results,
        });
      }

      return NextResponse.json({
        success: true,
        syncedCount: syncResults.length,
        results: syncResults,
        message: 'Bulk sync completed',
      });
    } else if (validatedData.featureRequestId) {
      // Sync specific feature request
      const results =
        await productManagementIntegration.syncFeatureRequestStatus(
          validatedData.featureRequestId,
        );

      const successCount = results.filter((r) => r.success).length;

      return NextResponse.json({
        success: successCount > 0,
        results,
        message: `Synced ${successCount}/${results.length} external systems`,
      });
    } else {
      return NextResponse.json(
        { error: 'Either featureRequestId or syncAll must be provided' },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Sync error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
