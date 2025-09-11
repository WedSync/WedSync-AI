// WS-129: Vendor Floral Specialties API
// API endpoint for managing vendor floral capabilities and integration

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const specialtyType = searchParams.get('specialty');
    const style = searchParams.get('style');
    const location = searchParams.get('location');
    const budgetRange = searchParams.get('budget');
    const arrangements = searchParams.get('arrangements')?.split(',');

    // Build query for vendor specialties
    let query = supabase.from('vendor_floral_specialties').select(`
        *,
        suppliers!inner(
          id,
          business_name,
          contact_name,
          email,
          phone,
          location,
          rating,
          reviews_count,
          verified,
          portfolio_images
        )
      `);

    // Filter by specialty type
    if (specialtyType) {
      query = query.overlaps('specialty_types', [specialtyType]);
    }

    // Filter by signature styles
    if (style) {
      query = query.overlaps('signature_styles', [style]);
    }

    // Filter by arrangement types if specific arrangements requested
    if (arrangements && arrangements.length > 0) {
      query = query.overlaps('specialty_types', arrangements);
    }

    // Execute query
    const { data: vendors, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch floral vendors: ${error.message}`);
    }

    // Filter by location if provided (basic implementation)
    let filteredVendors = vendors;
    if (location) {
      filteredVendors = vendors.filter((vendor) =>
        vendor.suppliers.location
          ?.toLowerCase()
          .includes(location.toLowerCase()),
      );
    }

    // Sort by rating and verification status
    filteredVendors = filteredVendors.sort((a, b) => {
      // Verified vendors first
      if (a.suppliers.verified !== b.suppliers.verified) {
        return b.suppliers.verified ? 1 : -1;
      }
      // Then by rating
      return (b.suppliers.rating || 0) - (a.suppliers.rating || 0);
    });

    // Calculate matching scores for recommendations
    const vendorRecommendations = filteredVendors
      .map((vendor) => {
        let matchScore = 0;
        let matchReasons = [];

        // Specialty match
        if (specialtyType && vendor.specialty_types?.includes(specialtyType)) {
          matchScore += 30;
          matchReasons.push(`Specializes in ${specialtyType}`);
        }

        // Style match
        if (style && vendor.signature_styles?.includes(style)) {
          matchScore += 25;
          matchReasons.push(`Expert in ${style} style`);
        }

        // Arrangements match
        if (arrangements) {
          const matchingArrangements = arrangements.filter((arr) =>
            vendor.specialty_types?.includes(arr),
          );
          matchScore += matchingArrangements.length * 10;
          if (matchingArrangements.length > 0) {
            matchReasons.push(`Offers ${matchingArrangements.join(', ')}`);
          }
        }

        // Capability bonuses
        if (vendor.custom_arrangements) {
          matchScore += 5;
          matchReasons.push('Custom arrangements available');
        }
        if (vendor.delivery_available) {
          matchScore += 5;
          matchReasons.push('Delivery service included');
        }
        if (vendor.setup_services) {
          matchScore += 10;
          matchReasons.push('On-site setup service');
        }

        // Rating bonus
        matchScore += (vendor.suppliers.rating || 0) * 2;

        return {
          ...vendor,
          match_score: matchScore,
          match_reasons: matchReasons,
          recommendation_priority:
            matchScore >= 50 ? 'high' : matchScore >= 30 ? 'medium' : 'low',
        };
      })
      .sort((a, b) => b.match_score - a.match_score);

    return NextResponse.json({
      vendors: vendorRecommendations,
      total_count: filteredVendors.length,
      filters_applied: {
        specialty_type: specialtyType,
        style,
        location,
        arrangements,
      },
    });
  } catch (error) {
    console.error('Floral vendors API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch floral vendors' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      supplier_id,
      specialty_types,
      signature_styles,
      featured_flowers,
      custom_arrangements,
      delivery_available,
      setup_services,
      consultation_available,
      local_flower_sources,
      international_sourcing,
      greenhouse_partnership,
      seasonal_specialty,
      portfolio_arrangements,
      style_portfolio,
      pricing_model,
      minimum_order_value,
      rush_order_available,
      rush_order_fee_percentage,
      delivery_radius_miles,
      setup_radius_miles,
    } = body;

    if (!supplier_id || !specialty_types) {
      return NextResponse.json(
        { error: 'supplier_id and specialty_types are required' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Insert or update vendor floral specialties
    const { data, error } = await supabase
      .from('vendor_floral_specialties')
      .upsert({
        supplier_id,
        specialty_types,
        signature_styles: signature_styles || [],
        featured_flowers: featured_flowers || [],
        custom_arrangements: custom_arrangements ?? true,
        delivery_available: delivery_available ?? true,
        setup_services: setup_services ?? false,
        consultation_available: consultation_available ?? true,
        local_flower_sources: local_flower_sources || [],
        international_sourcing: international_sourcing ?? false,
        greenhouse_partnership: greenhouse_partnership ?? false,
        seasonal_specialty: seasonal_specialty ?? false,
        portfolio_arrangements: portfolio_arrangements || {},
        style_portfolio: style_portfolio || {},
        pricing_model: pricing_model || 'per_arrangement',
        minimum_order_value: minimum_order_value
          ? parseFloat(minimum_order_value)
          : null,
        rush_order_available: rush_order_available ?? false,
        rush_order_fee_percentage: rush_order_fee_percentage
          ? parseFloat(rush_order_fee_percentage)
          : null,
        delivery_radius_miles: delivery_radius_miles
          ? parseInt(delivery_radius_miles)
          : 25,
        setup_radius_miles: setup_radius_miles
          ? parseInt(setup_radius_miles)
          : 15,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save vendor specialties: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      vendor_specialty: data,
      message: 'Vendor floral specialties updated successfully',
    });
  } catch (error) {
    console.error('Vendor specialty creation error:', error);
    return NextResponse.json(
      { error: 'Failed to save vendor specialties' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const specialtyId = searchParams.get('id');
    const supplierId = searchParams.get('supplier_id');

    if (!specialtyId && !supplierId) {
      return NextResponse.json(
        { error: 'Either specialty id or supplier_id is required' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    let query = supabase.from('vendor_floral_specialties').delete();

    if (specialtyId) {
      query = query.eq('id', specialtyId);
    } else {
      query = query.eq('supplier_id', supplierId);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Failed to delete vendor specialties: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Vendor floral specialties removed successfully',
    });
  } catch (error) {
    console.error('Vendor specialty deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor specialties' },
      { status: 500 },
    );
  }
}
