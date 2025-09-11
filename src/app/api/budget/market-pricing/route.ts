import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { MarketDataService } from '@/lib/services/market-data-service';

// Validation schemas
const MarketPricingRequestSchema = z.object({
  category_name: z.string().min(1).max(100),
  service_type: z.string().min(1).max(200),
  country: z.string().min(1).max(100).default('United Kingdom'),
  region: z.string().min(1).max(100),
  city: z.string().max(100).optional(),
  postcode_prefix: z.string().max(10).optional(),
  currency: z.enum(['GBP', 'USD', 'EUR', 'AUD', 'CAD']).default('GBP'),
  market_tier: z.enum(['budget', 'mid_range', 'premium', 'luxury']).optional(),
});

const UpdatePricingSchema = z
  .object({
    category_name: z.string().min(1).max(100),
    service_type: z.string().min(1).max(200),
    country: z.string().min(1).max(100),
    region: z.string().min(1).max(100),
    city: z.string().max(100).optional(),
    postcode_prefix: z.string().max(10).optional(),
    currency: z.enum(['GBP', 'USD', 'EUR', 'AUD', 'CAD']),
    price_min: z.number().positive(),
    price_max: z.number().positive(),
    price_average: z.number().positive(),
    price_median: z.number().positive().optional(),
    market_tier: z.enum(['budget', 'mid_range', 'premium', 'luxury']),
    supplier_count: z.number().int().min(0).optional(),
    popularity_score: z.number().min(0).max(100).optional(),
    data_source: z.string().min(1).max(100),
    confidence_level: z
      .enum(['low', 'medium', 'high', 'verified'])
      .default('medium'),
    sample_size: z.number().int().min(1).default(1),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.price_min <= data.price_max, {
    message: 'Minimum price must be less than or equal to maximum price',
  })
  .refine(
    (data) =>
      data.price_min <= data.price_average &&
      data.price_average <= data.price_max,
    {
      message: 'Average price must be between minimum and maximum prices',
    },
  );

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Rate limiting for market pricing requests (20 per hour)
    const rateLimitResult = await rateLimit(
      request,
      'market-pricing',
      20,
      3600,
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many market pricing requests',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      category_name: searchParams.get('category_name') || '',
      service_type: searchParams.get('service_type') || '',
      country: searchParams.get('country') || 'United Kingdom',
      region: searchParams.get('region') || '',
      city: searchParams.get('city') || undefined,
      postcode_prefix: searchParams.get('postcode_prefix') || undefined,
      currency: searchParams.get('currency') || 'GBP',
      market_tier: searchParams.get('market_tier') || undefined,
    };

    const validationResult = MarketPricingRequestSchema.safeParse(queryData);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const searchCriteria = validationResult.data;
    const marketDataService = new MarketDataService();

    // Build query for market pricing data
    let query = supabase
      .from('market_pricing_data')
      .select('*')
      .eq('category_name', searchCriteria.category_name)
      .eq('service_type', searchCriteria.service_type)
      .eq('country', searchCriteria.country)
      .eq('region', searchCriteria.region)
      .eq('currency', searchCriteria.currency)
      .gte(
        'last_updated',
        new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      ) // Last 180 days
      .order('last_updated', { ascending: false });

    if (searchCriteria.city) {
      query = query.eq('city', searchCriteria.city);
    }

    if (searchCriteria.postcode_prefix) {
      query = query.eq('postcode_prefix', searchCriteria.postcode_prefix);
    }

    if (searchCriteria.market_tier) {
      query = query.eq('market_tier', searchCriteria.market_tier);
    }

    const { data: marketData, error } = await query.limit(50);

    if (error) {
      console.error('Error fetching market pricing data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch market pricing data' },
        { status: 500 },
      );
    }

    // Calculate aggregate pricing statistics
    const aggregatedPricing = marketDataService.aggregateMarketData(
      marketData || [],
    );

    // Get seasonal adjustments if available
    const seasonalData = await marketDataService.getSeasonalAdjustments(
      marketData?.map((d) => d.id) || [],
      new Date().getMonth() + 1,
    );

    // Apply regional and seasonal multipliers
    const adjustedPricing = marketDataService.applyMarketAdjustments(
      aggregatedPricing,
      searchCriteria.region,
      seasonalData,
    );

    // Log the market data access
    await supabase.from('financial_data_audit').insert({
      table_name: 'market_pricing_data',
      record_id: 'search',
      organization_id: session.user.id, // Use user ID for system-wide data
      action_type: 'READ',
      user_id: session.user.id,
      new_values: {
        search_criteria: searchCriteria,
        results_count: marketData?.length || 0,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      search_criteria: searchCriteria,
      market_data: {
        sample_size: marketData?.length || 0,
        price_range: {
          min: adjustedPricing.price_min,
          max: adjustedPricing.price_max,
          average: adjustedPricing.price_average,
          median: adjustedPricing.price_median,
        },
        market_intelligence: {
          market_tier: adjustedPricing.predominant_tier,
          supplier_count: adjustedPricing.total_suppliers,
          popularity_score: adjustedPricing.average_popularity,
          confidence_level: adjustedPricing.overall_confidence,
        },
        regional_factors: {
          regional_multiplier: adjustedPricing.regional_multiplier,
          seasonal_impact: adjustedPricing.seasonal_impact,
          demand_level: adjustedPricing.demand_level,
        },
        data_freshness: {
          last_updated: adjustedPricing.most_recent_update,
          oldest_data: adjustedPricing.oldest_data_point,
          data_quality_score: adjustedPricing.data_quality_score,
        },
      },
      seasonal_adjustments: seasonalData,
      recommendations: marketDataService.generatePricingRecommendations(
        adjustedPricing,
        searchCriteria,
      ),
      data_sources: Array.from(
        new Set(marketData?.map((d) => d.data_source) || []),
      ),
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Market pricing GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve market pricing data',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Check if user has admin permissions or enterprise subscription
    const { data: userAccess, error: accessError } = await supabase
      .from('user_organization_roles')
      .select(
        `
        organization_id,
        role,
        organizations!inner(subscription_tier)
      `,
      )
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    if (accessError || !userAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const canUpdateMarketData =
      userAccess.role === 'admin' ||
      userAccess.role === 'owner' ||
      userAccess.organizations.subscription_tier === 'ENTERPRISE';

    if (!canUpdateMarketData) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          message:
            'Market pricing updates require admin access or Enterprise subscription',
        },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdatePricingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid pricing data',
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const pricingData = validationResult.data;

    // Check if similar pricing data already exists (to prevent duplicates)
    const { data: existingData, error: checkError } = await supabase
      .from('market_pricing_data')
      .select('id, last_updated')
      .eq('category_name', pricingData.category_name)
      .eq('service_type', pricingData.service_type)
      .eq('country', pricingData.country)
      .eq('region', pricingData.region)
      .eq('currency', pricingData.currency)
      .eq('market_tier', pricingData.market_tier)
      .gte(
        'last_updated',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      ) // Within last 7 days
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error checking existing data:', checkError);
      return NextResponse.json(
        { error: 'Failed to verify data uniqueness' },
        { status: 500 },
      );
    }

    if (existingData) {
      // Update existing record instead of creating duplicate
      const { data: updatedData, error: updateError } = await supabase
        .from('market_pricing_data')
        .update({
          ...pricingData,
          last_updated: new Date().toISOString(),
          sample_size: (pricingData.sample_size || 1) + 1, // Increment sample size
        })
        .eq('id', existingData.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating market pricing data:', updateError);
        return NextResponse.json(
          { error: 'Failed to update pricing data' },
          { status: 500 },
        );
      }

      // Log the update
      await supabase.from('financial_data_audit').insert({
        table_name: 'market_pricing_data',
        record_id: updatedData.id,
        organization_id: userAccess.organization_id,
        action_type: 'UPDATE',
        user_id: session.user.id,
        new_values: {
          ...pricingData,
          update_reason: 'pricing_data_refresh',
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedData,
        action: 'updated',
        message: 'Market pricing data updated successfully',
      });
    } else {
      // Create new record
      const { data: newData, error: insertError } = await supabase
        .from('market_pricing_data')
        .insert({
          ...pricingData,
          last_updated: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting market pricing data:', insertError);
        return NextResponse.json(
          { error: 'Failed to save pricing data' },
          { status: 500 },
        );
      }

      // Log the creation
      await supabase.from('financial_data_audit').insert({
        table_name: 'market_pricing_data',
        record_id: newData.id,
        organization_id: userAccess.organization_id,
        action_type: 'CREATE',
        user_id: session.user.id,
        new_values: {
          ...pricingData,
          creation_reason: 'new_market_data',
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: newData,
          action: 'created',
          message: 'Market pricing data created successfully',
        },
        { status: 201 },
      );
    }
  } catch (error) {
    console.error('Market pricing POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to save market pricing data',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Check if user has admin permissions
    const { data: userAccess, error: accessError } = await supabase
      .from('user_organization_roles')
      .select('organization_id, role')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    if (accessError || !userAccess || userAccess.role !== 'admin') {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          message: 'Only administrators can delete market pricing data',
        },
        { status: 403 },
      );
    }

    // Get pricing data ID from query params
    const { searchParams } = new URL(request.url);
    const pricingId = searchParams.get('id');

    if (!pricingId) {
      return NextResponse.json(
        { error: 'Missing pricing data ID' },
        { status: 400 },
      );
    }

    // Verify the record exists
    const { data: pricingData, error: fetchError } = await supabase
      .from('market_pricing_data')
      .select('*')
      .eq('id', pricingId)
      .single();

    if (fetchError || !pricingData) {
      return NextResponse.json(
        { error: 'Pricing data not found' },
        { status: 404 },
      );
    }

    // Check if this pricing data is referenced in optimizations
    const { data: references, error: refError } = await supabase
      .from('budget_optimizations')
      .select('id')
      .contains('supporting_data', { market_pricing_ids: [pricingId] })
      .limit(1);

    if (refError && refError.code !== 'PGRST116') {
      console.error('Error checking references:', refError);
      return NextResponse.json(
        { error: 'Failed to verify data dependencies' },
        { status: 500 },
      );
    }

    if (references && references.length > 0) {
      // Soft delete by marking as expired instead of hard delete
      const { error: softDeleteError } = await supabase
        .from('market_pricing_data')
        .update({
          expiry_date: new Date().toISOString(),
          confidence_level: 'low',
          notes:
            (pricingData.notes || '') +
            '\n[ARCHIVED] Data marked as expired by administrator.',
        })
        .eq('id', pricingId);

      if (softDeleteError) {
        console.error('Error archiving pricing data:', softDeleteError);
        return NextResponse.json(
          { error: 'Failed to archive pricing data' },
          { status: 500 },
        );
      }

      // Log the soft delete
      await supabase.from('financial_data_audit').insert({
        table_name: 'market_pricing_data',
        record_id: pricingId,
        organization_id: userAccess.organization_id,
        action_type: 'UPDATE',
        user_id: session.user.id,
        old_values: pricingData,
        new_values: {
          action: 'soft_delete',
          reason: 'has_dependent_optimizations',
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Pricing data archived (has dependent optimizations)',
        action: 'archived',
      });
    } else {
      // Hard delete if no dependencies
      const { error: deleteError } = await supabase
        .from('market_pricing_data')
        .delete()
        .eq('id', pricingId);

      if (deleteError) {
        console.error('Error deleting pricing data:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete pricing data' },
          { status: 500 },
        );
      }

      // Log the hard delete
      await supabase.from('financial_data_audit').insert({
        table_name: 'market_pricing_data',
        record_id: pricingId,
        organization_id: userAccess.organization_id,
        action_type: 'DELETE',
        user_id: session.user.id,
        old_values: pricingData,
        new_values: {
          action: 'hard_delete',
          reason: 'no_dependencies',
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Pricing data deleted successfully',
        action: 'deleted',
      });
    }
  } catch (error) {
    console.error('Market pricing DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to delete pricing data',
      },
      { status: 500 },
    );
  }
}
