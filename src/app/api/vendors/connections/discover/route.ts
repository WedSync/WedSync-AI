import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // CRITICAL SECURITY FIX - Authentication required for vendor data access
    const cookieStore = await cookies();
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY',
          );
        })(),
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      },
    );

    // Check authentication - CRITICAL SECURITY REQUIREMENT
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 },
      );
    }
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendor_id');

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 },
      );
    }

    // Use authenticated client instead of bypassing RLS with service role
    const supabase = authSupabase;

    // Get current vendor details for location-based filtering
    const { data: currentVendor } = await supabase
      .from('suppliers')
      .select('city, county, primary_category, service_radius_miles')
      .eq('id', vendorId)
      .single();

    if (!currentVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Get existing connections to exclude them from discovery
    const { data: existingConnections } = await supabase
      .from('vendor_connections')
      .select('connected_vendor_id')
      .eq('vendor_id', vendorId)
      .eq('status', 'accepted');

    const connectedVendorIds =
      existingConnections?.map((conn) => conn.connected_vendor_id) || [];

    // Get pending connection requests (both sent and received)
    const { data: pendingConnections } = await supabase
      .from('vendor_connection_requests')
      .select('from_vendor_id, to_vendor_id')
      .or(`from_vendor_id.eq.${vendorId},to_vendor_id.eq.${vendorId}`)
      .eq('status', 'pending');

    const pendingVendorIds: string[] = [];
    pendingConnections?.forEach((conn) => {
      if (conn.from_vendor_id === vendorId) {
        pendingVendorIds.push(conn.to_vendor_id);
      } else {
        pendingVendorIds.push(conn.from_vendor_id);
      }
    });

    // Discover new vendors to connect with
    let query = supabase
      .from('suppliers')
      .select(
        `
        id,
        business_name,
        primary_category,
        secondary_categories,
        city,
        county,
        average_rating,
        total_reviews,
        is_verified,
        featured_image,
        years_in_business,
        service_radius_miles,
        profile_completion_score,
        last_active_at
      `,
      )
      .neq('id', vendorId) // Exclude current vendor
      .eq('is_published', true) // Only published vendors
      .gte('profile_completion_score', 60); // Minimum profile completion

    // Exclude already connected and pending vendors
    const excludeIds = [...connectedVendorIds, ...pendingVendorIds];
    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data: vendors, error } = await query
      .order('profile_completion_score', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching vendors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vendors' },
        { status: 500 },
      );
    }

    // Add connection status and mutual connection info for each vendor
    const vendorsWithConnectionInfo = await Promise.all(
      (vendors || []).map(async (vendor) => {
        // Get mutual connections count
        const { count: mutualConnectionsCount } = await supabase
          .from('vendor_connections')
          .select('id', { count: 'exact' })
          .eq('vendor_id', vendor.id)
          .in('connected_vendor_id', connectedVendorIds)
          .eq('status', 'accepted');

        // Get shared weddings count (vendors who worked on same weddings)
        const { count: sharedWeddingsCount } = await supabase
          .from('wedding_vendors')
          .select('wedding_id', { count: 'exact' })
          .eq('vendor_id', vendor.id)
          .in(
            'wedding_id',
            supabase
              .from('wedding_vendors')
              .select('wedding_id')
              .eq('vendor_id', vendorId),
          );

        // Determine connection status
        let connectionStatus = 'none';
        const pendingRequest = pendingConnections?.find(
          (conn) =>
            (conn.from_vendor_id === vendorId &&
              conn.to_vendor_id === vendor.id) ||
            (conn.to_vendor_id === vendorId &&
              conn.from_vendor_id === vendor.id),
        );

        if (pendingRequest) {
          if (pendingRequest.from_vendor_id === vendorId) {
            connectionStatus = 'pending_sent';
          } else {
            connectionStatus = 'pending_received';
          }
        }

        return {
          ...vendor,
          vendor_id: vendor.id, // Add vendor_id for consistency with component interface
          connection_status: connectionStatus,
          mutual_connections_count: mutualConnectionsCount || 0,
          shared_weddings_count: sharedWeddingsCount || 0,
        };
      }),
    );

    // Sort by relevance (prioritize same location, same category, high ratings)
    const sortedVendors = vendorsWithConnectionInfo.sort((a, b) => {
      let aScore = 0;
      let bScore = 0;

      // Same city bonus
      if (a.city === currentVendor.city) aScore += 10;
      if (b.city === currentVendor.city) bScore += 10;

      // Same county bonus
      if (a.county === currentVendor.county) aScore += 5;
      if (b.county === currentVendor.county) bScore += 5;

      // Complementary services bonus (different categories)
      if (a.primary_category !== currentVendor.primary_category) aScore += 3;
      if (b.primary_category !== currentVendor.primary_category) bScore += 3;

      // Rating bonus
      aScore += a.average_rating;
      bScore += b.average_rating;

      // Mutual connections bonus
      aScore += a.mutual_connections_count * 2;
      bScore += b.mutual_connections_count * 2;

      // Profile completion bonus
      aScore += a.profile_completion_score / 10;
      bScore += b.profile_completion_score / 10;

      return bScore - aScore;
    });

    return NextResponse.json({
      vendors: sortedVendors,
      total: sortedVendors.length,
    });
  } catch (error) {
    console.error('Error in vendor discovery:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
