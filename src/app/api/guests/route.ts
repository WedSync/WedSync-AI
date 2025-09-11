import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const createGuestSchema = z.object({
  couple_id: z.string().uuid(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.record(z.any()).optional(),
  category: z.enum(['family', 'friends', 'work', 'other']).default('family'),
  side: z.enum(['partner1', 'partner2', 'mutual']).default('mutual'),
  plus_one: z.boolean().default(false),
  plus_one_name: z.string().max(100).optional().nullable(),
  age_group: z.enum(['adult', 'child', 'infant']).default('adult'),
  table_number: z.number().int().positive().optional().nullable(),
  helper_role: z.string().max(50).optional().nullable(),
  dietary_restrictions: z.string().optional().nullable(),
  special_needs: z.string().optional().nullable(),
  rsvp_status: z
    .enum(['pending', 'attending', 'declined', 'maybe'])
    .default('pending'),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  household_id: z.string().uuid().optional().nullable(),
});

const searchGuestsSchema = z.object({
  couple_id: z.string().uuid(),
  search: z.string().optional(),
  category: z.enum(['family', 'friends', 'work', 'other']).optional(),
  rsvp_status: z.enum(['pending', 'attending', 'declined', 'maybe']).optional(),
  age_group: z.enum(['adult', 'child', 'infant']).optional(),
  side: z.enum(['partner1', 'partner2', 'mutual']).optional(),
  has_dietary_restrictions: z.boolean().optional(),
  has_plus_one: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

// GET /api/guests - Search and list guests
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Convert string parameters to appropriate types
    const processedParams = {
      ...queryParams,
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 50,
      has_dietary_restrictions:
        queryParams.has_dietary_restrictions === 'true'
          ? true
          : queryParams.has_dietary_restrictions === 'false'
            ? false
            : undefined,
      has_plus_one:
        queryParams.has_plus_one === 'true'
          ? true
          : queryParams.has_plus_one === 'false'
            ? false
            : undefined,
    };

    const validatedParams = searchGuestsSchema.parse(processedParams);

    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 },
      );
    }

    // Verify couple belongs to user's organization
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', validatedParams.couple_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Use the search function for advanced filtering
    const { data: guests, error } = await supabase.rpc('search_guests', {
      couple_id_param: validatedParams.couple_id,
      search_query: validatedParams.search || null,
      category_filter: validatedParams.category || null,
      rsvp_filter: validatedParams.rsvp_status || null,
      age_group_filter: validatedParams.age_group || null,
      side_filter: validatedParams.side || null,
      has_dietary_restrictions:
        validatedParams.has_dietary_restrictions ?? null,
      has_plus_one: validatedParams.has_plus_one ?? null,
      page_size: validatedParams.limit,
      page_offset: (validatedParams.page - 1) * validatedParams.limit,
    });

    if (error) {
      console.error('Error searching guests:', error);
      return NextResponse.json(
        { error: 'Failed to search guests' },
        { status: 500 },
      );
    }

    // Get analytics for the couple
    const { data: analytics } = await supabase.rpc('get_guest_analytics', {
      couple_id_param: validatedParams.couple_id,
    });

    return NextResponse.json({
      success: true,
      data: guests || [],
      analytics: analytics?.[0] || {},
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: analytics?.[0]?.total_guests || 0,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/guests:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
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

// POST /api/guests - Create new guest
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createGuestSchema.parse(body);

    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 },
      );
    }

    // Verify couple belongs to user's organization
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', validatedData.couple_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check for duplicates
    const { data: duplicates } = await supabase.rpc('find_duplicate_guests', {
      couple_id_param: validatedData.couple_id,
      email_param: validatedData.email,
      first_name_param: validatedData.first_name,
      last_name_param: validatedData.last_name,
      phone_param: validatedData.phone,
    });

    if (
      duplicates &&
      duplicates.length > 0 &&
      duplicates[0].match_score >= 80
    ) {
      return NextResponse.json(
        {
          error: 'Potential duplicate found',
          duplicate: duplicates[0],
        },
        { status: 409 },
      );
    }

    // Create guest
    const { data: guest, error } = await supabase
      .from('guests')
      .insert(validatedData)
      .select(
        `
        *,
        households (
          id, name, total_members
        )
      `,
      )
      .single();

    if (error) {
      console.error('Error creating guest:', error);
      return NextResponse.json(
        { error: 'Failed to create guest' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: guest,
        duplicates_found: duplicates?.length || 0,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in POST /api/guests:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
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
