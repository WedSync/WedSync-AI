import { NextRequest, NextResponse } from 'next/server';
import { getExecutiveMetrics } from '@/lib/analytics/executiveMetrics';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Request validation schema
const metricsRequestSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  forceRefresh: z.boolean().optional().default(false),
  includeProjections: z.boolean().optional().default(false),
  region: z.string().optional(),
  supplierCategory: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 },
      );
    }

    // Validate query parameters
    const queryParams = {
      organizationId: searchParams.get('organizationId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      forceRefresh: searchParams.get('forceRefresh') === 'true',
      includeProjections: searchParams.get('includeProjections') === 'true',
      region: searchParams.get('region'),
      supplierCategory: searchParams.get('supplierCategory'),
    };

    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(queryParams).filter(([_, value]) => value !== null),
    );

    const validatedParams = metricsRequestSchema.parse(cleanParams);

    // Verify user has access to the organization
    const { data: orgAccess, error: orgError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', validatedParams.organizationId)
      .single();

    if (orgError || !orgAccess) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this organization' },
        { status: 403 },
      );
    }

    // Check if user has executive-level access
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'Failed to verify user permissions' },
        { status: 500 },
      );
    }

    // Only allow admin and owner roles to access executive metrics
    const allowedRoles = ['admin', 'owner'];
    if (!allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Executive-level access required' },
        { status: 403 },
      );
    }

    try {
      // Fetch executive metrics
      const metrics = await getExecutiveMetrics(
        validatedParams.organizationId,
        validatedParams.startDate,
        validatedParams.endDate,
        { forceRefresh: validatedParams.forceRefresh },
      );

      // Apply filters if specified
      let filteredMetrics = { ...metrics };

      if (validatedParams.region) {
        // Apply regional filtering
        const regionMultiplier = getRegionMultiplier(validatedParams.region);
        filteredMetrics = {
          ...filteredMetrics,
          totalRevenue: filteredMetrics.totalRevenue * regionMultiplier,
          revenueChart: filteredMetrics.revenueChart?.map((data: any) => ({
            ...data,
            revenue: data.revenue * regionMultiplier,
          })),
        };
      }

      if (validatedParams.supplierCategory) {
        // Filter by supplier category
        filteredMetrics = {
          ...filteredMetrics,
          vendorChart: filteredMetrics.vendorChart?.filter((vendor: any) =>
            vendor.name
              .toLowerCase()
              .includes(validatedParams.supplierCategory!.toLowerCase()),
          ),
        };
      }

      if (validatedParams.includeProjections) {
        // Add revenue and growth projections
        filteredMetrics = {
          ...filteredMetrics,
          projections: generateProjections(filteredMetrics),
        };
      }

      // Add metadata
      const response = {
        data: filteredMetrics,
        metadata: {
          organizationId: validatedParams.organizationId,
          timeRange: {
            startDate: validatedParams.startDate,
            endDate: validatedParams.endDate,
          },
          generatedAt: new Date().toISOString(),
          filters: {
            region: validatedParams.region,
            supplierCategory: validatedParams.supplierCategory,
            includeProjections: validatedParams.includeProjections,
          },
          cacheStatus: validatedParams.forceRefresh ? 'fresh' : 'cached',
        },
      };

      return NextResponse.json(response);
    } catch (metricsError) {
      console.error('Error fetching executive metrics:', metricsError);
      return NextResponse.json(
        {
          error: 'Failed to fetch executive metrics',
          details:
            metricsError instanceof Error
              ? metricsError.message
              : 'Unknown error',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Executive metrics API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Helper functions
function getRegionMultiplier(region: string): number {
  const regionMultipliers: { [key: string]: number } = {
    london: 1.25,
    manchester: 0.95,
    birmingham: 0.9,
    edinburgh: 0.85,
    bristol: 0.8,
  };

  return regionMultipliers[region.toLowerCase()] || 1.0;
}

function generateProjections(metrics: any): any {
  const currentRevenue = metrics.totalRevenue || 0;
  const growthRate = (metrics.revenueGrowth || 0) / 100;

  return {
    nextMonth: {
      revenue: currentRevenue * (1 + growthRate / 12),
      clients: Math.round(
        metrics.activeClients * (1 + (metrics.clientGrowth || 0) / 100 / 12),
      ),
      bookings: Math.round(
        metrics.weddingBookings * (1 + (metrics.bookingGrowth || 0) / 100 / 12),
      ),
    },
    nextQuarter: {
      revenue: currentRevenue * (1 + growthRate / 4),
      clients: Math.round(
        metrics.activeClients * (1 + (metrics.clientGrowth || 0) / 100 / 4),
      ),
      bookings: Math.round(
        metrics.weddingBookings * (1 + (metrics.bookingGrowth || 0) / 100 / 4),
      ),
    },
    yearEnd: {
      revenue: currentRevenue * (1 + growthRate),
      clients: Math.round(
        metrics.activeClients * (1 + (metrics.clientGrowth || 0) / 100),
      ),
      bookings: Math.round(
        metrics.weddingBookings * (1 + (metrics.bookingGrowth || 0) / 100),
      ),
    },
  };
}
