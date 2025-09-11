import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { BIPlatformConnector } from '@/lib/integrations/analytics/bi-platform-connector';
import { DataWarehouseManager } from '@/lib/integrations/analytics/data-warehouse-manager';
import { ThirdPartyAnalyticsIntegrator } from '@/lib/integrations/analytics/third-party-analytics';
import { WeddingIndustryDataIntegrator } from '@/lib/integrations/analytics/wedding-industry-data';
import { FinancialAnalyticsHub } from '@/lib/integrations/analytics/financial-analytics-hub';
import { MarketingAnalyticsPlatform } from '@/lib/integrations/analytics/marketing-analytics-platform';

const SyncRequestSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  syncType: z.enum(['incremental', 'full', 'real-time']),
  platforms: z.array(
    z.enum([
      'tableau',
      'powerbi',
      'looker',
      'qlik',
      'sisense',
      'domo',
      'snowflake',
      'bigquery',
      'redshift',
      'databricks',
      'synapse',
      'google_analytics',
      'mixpanel',
      'amplitude',
      'segment',
      'hotjar',
      'fullstory',
      'theknot',
      'weddingwire',
      'zola',
      'weddingspot',
      'herecomestheguide',
      'quickbooks',
      'xero',
      'freshbooks',
      'stripe',
      'square',
      'paypal',
      'facebook_ads',
      'google_ads',
      'instagram',
      'pinterest',
      'mailchimp',
      'klaviyo',
    ]),
  ),
  dateRange: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
  weddingSeasonOptimization: z.boolean().default(true),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

const SyncResponseSchema = z.object({
  syncId: z.string().uuid(),
  status: z.enum(['initiated', 'in_progress', 'completed', 'failed']),
  platformResults: z.array(
    z.object({
      platform: z.string(),
      status: z.enum(['success', 'failed', 'partial']),
      recordsProcessed: z.number(),
      errors: z.array(z.string()).optional(),
      weddingMetrics: z
        .object({
          totalWeddings: z.number(),
          seasonalTrends: z.array(
            z.object({
              month: z.string(),
              weddingCount: z.number(),
              revenueImpact: z.number(),
            }),
          ),
          vendorPerformance: z.object({
            totalVendors: z.number(),
            activeVendors: z.number(),
            averageBookingValue: z.number(),
          }),
        })
        .optional(),
    }),
  ),
  estimatedCompletion: z.string().datetime().optional(),
  totalRecords: z.number(),
  errors: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const authorization = headersList.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 },
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authorization.replace('Bearer ', ''));

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedData = SyncRequestSchema.parse(body);

    // Verify organization access
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', validatedData.organizationId)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Organization access denied' },
        { status: 403 },
      );
    }

    // Check subscription tier permissions for analytics
    const { data: organization, error: subscriptionError } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', validatedData.organizationId)
      .single();

    if (subscriptionError) {
      return NextResponse.json(
        { error: 'Failed to verify subscription' },
        { status: 500 },
      );
    }

    // Professional tier or higher required for advanced analytics
    const allowedTiers = ['professional', 'scale', 'enterprise'];
    if (!allowedTiers.includes(organization.subscription_tier)) {
      return NextResponse.json(
        {
          error: 'Analytics integration requires Professional tier or higher',
          requiredTier: 'professional',
          currentTier: organization.subscription_tier,
        },
        { status: 403 },
      );
    }

    // Generate unique sync ID
    const syncId = crypto.randomUUID();

    // Initialize analytics integrators
    const biConnector = new BIPlatformConnector({
      organizationId: validatedData.organizationId,
      weddingOptimized: validatedData.weddingSeasonOptimization,
    });

    const dataWarehouse = new DataWarehouseManager({
      organizationId: validatedData.organizationId,
      multiCloudEnabled: true,
    });

    const thirdPartyAnalytics = new ThirdPartyAnalyticsIntegrator({
      organizationId: validatedData.organizationId,
      weddingEventTracking: true,
    });

    const industryData = new WeddingIndustryDataIntegrator({
      organizationId: validatedData.organizationId,
    });

    const financialHub = new FinancialAnalyticsHub({
      organizationId: validatedData.organizationId,
      weddingSpecificCategories: true,
    });

    const marketingPlatform = new MarketingAnalyticsPlatform({
      organizationId: validatedData.organizationId,
      weddingVendorOptimized: true,
    });

    // Create sync job record
    const { error: syncJobError } = await supabase
      .from('analytics_sync_jobs')
      .insert({
        id: syncId,
        organization_id: validatedData.organizationId,
        sync_type: validatedData.syncType,
        platforms: validatedData.platforms,
        date_range: validatedData.dateRange,
        priority: validatedData.priority,
        status: 'initiated',
        created_by: user.id,
        wedding_season_optimization: validatedData.weddingSeasonOptimization,
      });

    if (syncJobError) {
      console.error('Failed to create sync job:', syncJobError);
      return NextResponse.json(
        { error: 'Failed to initiate sync job' },
        { status: 500 },
      );
    }

    // Process platforms concurrently for better performance
    const platformResults = await Promise.allSettled(
      validatedData.platforms.map(async (platform) => {
        try {
          let result;
          let recordsProcessed = 0;
          let weddingMetrics;

          // Route to appropriate integrator based on platform
          if (
            [
              'tableau',
              'powerbi',
              'looker',
              'qlik',
              'sisense',
              'domo',
            ].includes(platform)
          ) {
            result = await biConnector.syncPlatformData(platform as any, {
              syncType: validatedData.syncType,
              dateRange: validatedData.dateRange,
            });
            recordsProcessed = result.recordsProcessed || 0;
          } else if (
            [
              'snowflake',
              'bigquery',
              'redshift',
              'databricks',
              'synapse',
            ].includes(platform)
          ) {
            result = await dataWarehouse.syncWarehouse(platform as any, {
              syncType: validatedData.syncType,
              dateRange: validatedData.dateRange,
            });
            recordsProcessed = result.recordsProcessed || 0;
          } else if (
            [
              'google_analytics',
              'mixpanel',
              'amplitude',
              'segment',
              'hotjar',
              'fullstory',
            ].includes(platform)
          ) {
            result = await thirdPartyAnalytics.syncPlatform(platform as any, {
              syncType: validatedData.syncType,
              dateRange: validatedData.dateRange,
            });
            recordsProcessed = result.recordsProcessed || 0;
            weddingMetrics = result.weddingMetrics;
          } else if (
            [
              'theknot',
              'weddingwire',
              'zola',
              'weddingspot',
              'herecomestheguide',
            ].includes(platform)
          ) {
            result = await industryData.syncIndustryData(platform as any, {
              syncType: validatedData.syncType,
              dateRange: validatedData.dateRange,
            });
            recordsProcessed = result.recordsProcessed || 0;
            weddingMetrics = result.marketIntelligence;
          } else if (
            [
              'quickbooks',
              'xero',
              'freshbooks',
              'stripe',
              'square',
              'paypal',
            ].includes(platform)
          ) {
            result = await financialHub.syncFinancialData(platform as any, {
              syncType: validatedData.syncType,
              dateRange: validatedData.dateRange,
            });
            recordsProcessed = result.recordsProcessed || 0;
          } else if (
            [
              'facebook_ads',
              'google_ads',
              'instagram',
              'pinterest',
              'mailchimp',
              'klaviyo',
            ].includes(platform)
          ) {
            result = await marketingPlatform.syncPlatform(platform as any, {
              syncType: validatedData.syncType,
              dateRange: validatedData.dateRange,
            });
            recordsProcessed = result.recordsProcessed || 0;
            weddingMetrics = result.weddingInsights;
          }

          return {
            platform,
            status: 'success' as const,
            recordsProcessed,
            weddingMetrics,
          };
        } catch (error) {
          console.error(`Platform sync failed for ${platform}:`, error);
          return {
            platform,
            status: 'failed' as const,
            recordsProcessed: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
          };
        }
      }),
    );

    // Process results
    const processedResults = platformResults.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          platform: 'unknown',
          status: 'failed' as const,
          recordsProcessed: 0,
          errors: [result.reason?.message || 'Platform sync failed'],
        };
      }
    });

    const totalRecords = processedResults.reduce(
      (sum, result) => sum + result.recordsProcessed,
      0,
    );
    const allErrors = processedResults.flatMap((result) => result.errors || []);
    const hasFailures = processedResults.some(
      (result) => result.status === 'failed',
    );

    const finalStatus = hasFailures ? 'partial' : 'completed';

    // Update sync job status
    await supabase
      .from('analytics_sync_jobs')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        total_records: totalRecords,
        platform_results: processedResults,
        errors: allErrors.length > 0 ? allErrors : null,
      })
      .eq('id', syncId);

    // Prepare wedding-optimized response
    const response = {
      syncId,
      status: finalStatus as 'completed' | 'partial',
      platformResults: processedResults,
      totalRecords,
      errors: allErrors,
      weddingInsights: {
        seasonalOptimizationEnabled: validatedData.weddingSeasonOptimization,
        totalWeddingsAnalyzed: processedResults
          .filter((r) => r.weddingMetrics)
          .reduce((sum, r) => sum + (r.weddingMetrics?.totalWeddings || 0), 0),
        vendorPerformanceTracked:
          processedResults.filter((r) => r.weddingMetrics?.vendorPerformance)
            .length > 0,
      },
    };

    // Log successful sync for audit trail
    await supabase.from('analytics_audit_log').insert({
      organization_id: validatedData.organizationId,
      action: 'data_sync',
      details: {
        syncId,
        platforms: validatedData.platforms,
        recordsProcessed: totalRecords,
        status: finalStatus,
      },
      performed_by: user.id,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Analytics data sync error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error during data sync' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const syncId = searchParams.get('syncId');
    const organizationId = searchParams.get('organizationId');

    if (!syncId && !organizationId) {
      return NextResponse.json(
        { error: 'syncId or organizationId parameter required' },
        { status: 400 },
      );
    }

    const headersList = await headers();
    const authorization = headersList.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 },
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authorization.replace('Bearer ', ''));

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 },
      );
    }

    let query = supabase.from('analytics_sync_jobs').select('*');

    if (syncId) {
      query = query.eq('id', syncId);
    } else {
      query = query.eq('organization_id', organizationId);
    }

    // Verify user has access to the organization
    if (organizationId) {
      const { data: orgMember, error: orgError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .single();

      if (orgError || !orgMember) {
        return NextResponse.json(
          { error: 'Organization access denied' },
          { status: 403 },
        );
      }
    }

    const { data: syncJobs, error } = await query
      .order('created_at', { ascending: false })
      .limit(syncId ? 1 : 50);

    if (error) {
      console.error('Failed to fetch sync jobs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sync status' },
        { status: 500 },
      );
    }

    if (syncId) {
      const job = syncJobs[0];
      if (!job) {
        return NextResponse.json(
          { error: 'Sync job not found' },
          { status: 404 },
        );
      }

      // Verify user has access to this job's organization
      const { data: orgMember, error: orgError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', job.organization_id)
        .single();

      if (orgError || !orgMember) {
        return NextResponse.json(
          { error: 'Access denied to this sync job' },
          { status: 403 },
        );
      }

      return NextResponse.json(job, { status: 200 });
    }

    return NextResponse.json(
      {
        syncJobs,
        total: syncJobs.length,
        weddingOptimized: syncJobs.filter(
          (job) => job.wedding_season_optimization,
        ).length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Analytics sync status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
