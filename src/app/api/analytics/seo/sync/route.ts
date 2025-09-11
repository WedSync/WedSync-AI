import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { GoogleSearchConsoleService } from '@/lib/services/google-search-console';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get supplier ID and integration details
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id, business_name, website_url')
      .eq('user_id', session.user.id)
      .single();

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 },
      );
    }

    // Get Google Search Console credentials
    const { data: integration } = await supabase
      .from('supplier_integrations')
      .select('credentials')
      .eq('supplier_id', supplier.id)
      .eq('integration_type', 'google_search_console')
      .single();

    if (!integration || !integration.credentials?.refresh_token) {
      return NextResponse.json(
        { error: 'Google Search Console not connected' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { syncType = 'all' } = body;

    // Initialize Google Search Console service
    const searchConsole = new GoogleSearchConsoleService(
      {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectUri: process.env.GOOGLE_REDIRECT_URI!,
        refreshToken: integration.credentials.refresh_token,
      },
      supplier.id,
    );

    const siteUrl =
      supplier.website_url ||
      `https://${supplier.business_name.toLowerCase().replace(/\s+/g, '-')}.com`;
    const results: any = {};

    // Sync based on type
    if (syncType === 'all' || syncType === 'keywords') {
      const keywordSync = await searchConsole.syncKeywordRankings(siteUrl);
      results.keywords = keywordSync;
    }

    if (syncType === 'all' || syncType === 'traffic') {
      const trafficSync = await searchConsole.syncOrganicTraffic(siteUrl);
      results.traffic = trafficSync;
    }

    if (syncType === 'all' || syncType === 'performance') {
      const trends = await searchConsole.getPerformanceTrends(siteUrl, 30);

      // Store performance trends
      for (const trend of trends) {
        await supabase.from('seo_organic_traffic').upsert({
          supplier_id: supplier.id,
          page_url: siteUrl,
          sessions: trend.clicks,
          pageviews: trend.impressions,
          date: trend.date,
          source: 'organic',
          device_category: 'all',
        });
      }

      results.performance = { success: true, count: trends.length };
    }

    if (syncType === 'all' || syncType === 'device') {
      const deviceData = await searchConsole.getDevicePerformance(siteUrl);

      // Store device-specific data
      for (const device of deviceData) {
        await supabase.from('seo_organic_traffic').upsert({
          supplier_id: supplier.id,
          page_url: siteUrl,
          sessions: device.clicks,
          pageviews: device.impressions,
          device_category: device.device.toLowerCase(),
          date: new Date().toISOString().split('T')[0],
          source: 'organic',
        });
      }

      results.device = { success: true, count: deviceData.length };
    }

    // Update last sync timestamp
    await supabase
      .from('supplier_integrations')
      .update({
        last_synced: new Date().toISOString(),
        sync_status: 'success',
      })
      .eq('supplier_id', supplier.id)
      .eq('integration_type', 'google_search_console');

    // Refresh materialized views
    await supabase.rpc('refresh_seo_materialized_views');

    return NextResponse.json({
      success: true,
      results,
      lastSynced: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error syncing SEO data:', error);

    // Update sync status to failed
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (supplier) {
        await supabase
          .from('supplier_integrations')
          .update({
            sync_status: 'failed',
            sync_error:
              error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('supplier_id', supplier.id)
          .eq('integration_type', 'google_search_console');
      }
    }

    return NextResponse.json(
      { error: 'Failed to sync SEO data' },
      { status: 500 },
    );
  }
}
