import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // CRITICAL SECURITY FIX - Authentication required
    const cookieStore = await cookies();
    const supabase = createServerClient(
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
    } = await supabase.auth.getUser();
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

    // Get incoming connection requests (requests sent to this vendor)
    const { data: incomingRequests, error: incomingError } = await supabase
      .from('vendor_connection_requests')
      .select(
        `
        id,
        from_vendor_id,
        from_business_name,
        message,
        status,
        category,
        created_at
      `,
      )
      .eq('to_vendor_id', vendorId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (incomingError) {
      console.error('Error fetching incoming requests:', incomingError);
      return NextResponse.json(
        { error: 'Failed to fetch connection requests' },
        { status: 500 },
      );
    }

    // Get outgoing connection requests (requests sent by this vendor)
    const { data: outgoingRequests, error: outgoingError } = await supabase
      .from('vendor_connection_requests')
      .select(
        `
        id,
        to_vendor_id,
        to_business_name,
        message,
        status,
        category,
        created_at
      `,
      )
      .eq('from_vendor_id', vendorId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (outgoingError) {
      console.error('Error fetching outgoing requests:', outgoingError);
      return NextResponse.json(
        { error: 'Failed to fetch connection requests' },
        { status: 500 },
      );
    }

    // Get mutual connections count for each incoming request
    const requestsWithMutualConnections = await Promise.all(
      (incomingRequests || []).map(async (request) => {
        // Get current vendor's connections
        const { data: currentVendorConnections } = await supabase
          .from('vendor_connections')
          .select('connected_vendor_id')
          .eq('vendor_id', vendorId)
          .eq('status', 'accepted');

        const currentConnectionIds =
          currentVendorConnections?.map((conn) => conn.connected_vendor_id) ||
          [];

        // Get requesting vendor's connections that match current vendor's connections
        const { count: mutualConnections } = await supabase
          .from('vendor_connections')
          .select('id', { count: 'exact' })
          .eq('vendor_id', request.from_vendor_id)
          .in('connected_vendor_id', currentConnectionIds)
          .eq('status', 'accepted');

        return {
          ...request,
          mutual_connections: mutualConnections || 0,
        };
      }),
    );

    // Format the response to match component interface
    const formattedRequests = requestsWithMutualConnections.map((request) => ({
      id: request.id,
      from_vendor_id: request.from_vendor_id,
      to_vendor_id: vendorId,
      from_business_name: request.from_business_name,
      to_business_name: '', // Current vendor's name (not needed for display)
      message: request.message,
      status: request.status as 'pending' | 'accepted' | 'declined',
      created_at: request.created_at,
      category: request.category,
      mutual_connections: request.mutual_connections,
    }));

    return NextResponse.json({
      requests: formattedRequests,
      incoming_count: incomingRequests?.length || 0,
      outgoing_count: outgoingRequests?.length || 0,
      total_pending:
        (incomingRequests?.length || 0) + (outgoingRequests?.length || 0),
    });
  } catch (error) {
    console.error('Error fetching connection requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
