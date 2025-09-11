// API route for admin version status - WS-200 Team A
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { APIVersionData } from '@/types/api-versions';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Check authentication and admin privileges
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Mock data for demonstration - in production this would come from database
    const mockVersionData: APIVersionData = {
      versions: [
        {
          version: 'v1.0',
          status: 'deprecated',
          release_date: '2023-01-15',
          deprecation_date: '2024-01-15',
          sunset_date: '2024-12-31',
          active_clients: 1247,
          monthly_requests: 15600000,
          wedding_features: [
            'Booking Management',
            'Client Communications',
            'Basic Payments',
            'Photo Gallery',
          ],
          breaking_changes: [
            'Authentication method changed',
            'Photo upload endpoint restructured',
          ],
        },
        {
          version: 'v1.1',
          status: 'deprecated',
          release_date: '2023-06-10',
          deprecation_date: '2024-06-10',
          sunset_date: '2025-06-30',
          active_clients: 892,
          monthly_requests: 12300000,
          wedding_features: [
            'Enhanced Booking Management',
            'Email Templates',
            'Payment Processing',
            'Advanced Photo Gallery',
            'Basic Timeline',
          ],
          breaking_changes: [
            'Timeline API restructured',
            'Payment webhook format changed',
          ],
        },
        {
          version: 'v2.0',
          status: 'stable',
          release_date: '2024-01-20',
          active_clients: 3421,
          monthly_requests: 42800000,
          wedding_features: [
            'Advanced Booking System',
            'Automated Workflows',
            'Comprehensive Payment Processing',
            'Interactive Timelines',
            'AI-Powered Recommendations',
            'Vendor Marketplace Integration',
          ],
          breaking_changes: [],
        },
        {
          version: 'v2.1',
          status: 'beta',
          release_date: '2024-11-15',
          active_clients: 156,
          monthly_requests: 2100000,
          wedding_features: [
            'Real-time Collaboration',
            'Advanced Analytics',
            'Mobile-First Design',
            'Enhanced Security',
            'Multi-language Support',
          ],
          breaking_changes: [
            'Websocket connection requirements',
            'New authentication tokens',
          ],
        },
      ],
      usage_analytics: [
        {
          version: 'v1.0',
          unique_clients: 1247,
          total_requests: 15600000,
          wedding_bookings_affected: 8400,
          peak_usage_periods: [
            {
              period: 'May-September',
              requests_per_hour: 2100,
              wedding_season_correlation: 0.87,
            },
          ],
          geographic_distribution: [
            {
              region: 'North America',
              client_count: 623,
              request_volume: 7800000,
            },
            { region: 'Europe', client_count: 421, request_volume: 5200000 },
            {
              region: 'Asia Pacific',
              client_count: 203,
              request_volume: 2600000,
            },
          ],
        },
        {
          version: 'v2.0',
          unique_clients: 3421,
          total_requests: 42800000,
          wedding_bookings_affected: 23100,
          peak_usage_periods: [
            {
              period: 'May-September',
              requests_per_hour: 5800,
              wedding_season_correlation: 0.92,
            },
          ],
          geographic_distribution: [
            {
              region: 'North America',
              client_count: 1710,
              request_volume: 21400000,
            },
            { region: 'Europe', client_count: 1156, request_volume: 14600000 },
            {
              region: 'Asia Pacific',
              client_count: 555,
              request_volume: 6800000,
            },
          ],
        },
      ],
      migration_progress: {
        total_migrations: 2139,
        completed_migrations: 1876,
        in_progress_migrations: 201,
        failed_migrations: 62,
        wedding_critical_migrations: 145,
        estimated_completion_date: '2025-03-15',
      },
      deprecation_schedule: [
        {
          version: 'v1.0',
          description: 'Legacy booking system with limited features',
          deprecation_date: '2024-01-15',
          sunset_date: '2024-12-31',
          affected_clients: 1247,
          wedding_impact_level: 'high',
          migration_resources: [
            {
              type: 'guide',
              title: 'v1 to v2 Migration Guide',
              url: '/docs/migration/v1-to-v2',
              estimated_time: '8-12 hours',
            },
            {
              type: 'tool',
              title: 'Automated Migration Tool',
              url: '/tools/migrate/v1-v2',
              estimated_time: '2-4 hours',
            },
          ],
        },
      ],
      client_breakdown: [
        {
          client_id: 'client_123',
          business_name: 'Elite Wedding Photography',
          business_type: 'photographer',
          current_version: 'v1.0',
          integration_complexity: 'moderate',
          last_api_call: '2024-12-28T14:30:00Z',
          migration_status: 'in_progress',
          wedding_season_priority: true,
        },
        {
          client_id: 'client_456',
          business_name: 'Grandview Manor',
          business_type: 'venue',
          current_version: 'v2.0',
          integration_complexity: 'simple',
          last_api_call: '2024-12-29T09:15:00Z',
          migration_status: 'completed',
          wedding_season_priority: false,
        },
      ],
      wedding_season_impact: {
        peak_wedding_months: [
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
        ],
        migration_window_recommendations: [
          {
            start_date: '2025-01-15',
            end_date: '2025-03-31',
            recommended_versions: ['v2.0'],
            risk_level: 'low',
            affected_wedding_count: 420,
          },
          {
            start_date: '2025-11-01',
            end_date: '2025-12-31',
            recommended_versions: ['v2.1'],
            risk_level: 'medium',
            affected_wedding_count: 180,
          },
        ],
        business_impact_projections: [
          {
            version: 'v1.0',
            migration_period: '2025-Q1',
            projected_downtime: '2-4 hours',
            revenue_impact_estimate: 2500,
            wedding_disruption_risk: 0.15,
          },
        ],
      },
    };

    return NextResponse.json({
      success: true,
      data: mockVersionData,
      message: 'API version data retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching API version data:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch API version data',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 },
    );
  }
}
