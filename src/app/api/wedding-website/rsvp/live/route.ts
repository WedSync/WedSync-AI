import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('website_id');

    if (!websiteId) {
      return NextResponse.json(
        { error: 'Website ID is required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get live RSVP stats for the wedding website
    const { data: rsvpStats, error: statsError } = await supabase
      .from('rsvp_responses')
      .select(
        `
        response_status,
        party_size,
        created_at,
        rsvp_invitations (
          guest_name,
          max_party_size
        )
      `,
      )
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false });

    if (statsError) {
      console.error('Error fetching RSVP stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch RSVP statistics' },
        { status: 500 },
      );
    }

    // Calculate statistics
    const stats = {
      total_responses: rsvpStats?.length || 0,
      attending: 0,
      not_attending: 0,
      maybe: 0,
      total_guests_attending: 0,
      response_rate: 0,
      recent_responses: [],
    };

    let totalInvited = 0;

    rsvpStats?.forEach((response: any) => {
      totalInvited += response.rsvp_invitations?.max_party_size || 1;

      switch (response.response_status) {
        case 'attending':
          stats.attending++;
          stats.total_guests_attending += response.party_size || 1;
          break;
        case 'not_attending':
          stats.not_attending++;
          break;
        case 'maybe':
          stats.maybe++;
          break;
      }
    });

    // Calculate response rate
    if (totalInvited > 0) {
      stats.response_rate = Math.round(
        (stats.total_responses / totalInvited) * 100,
      );
    }

    // Get recent responses for live feed
    stats.recent_responses =
      rsvpStats?.slice(0, 10).map((response: any) => ({
        guest_name: response.rsvp_invitations?.guest_name || 'Anonymous',
        response_status: response.response_status,
        party_size: response.party_size,
        timestamp: response.created_at,
      })) || [];

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error in live RSVP endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
