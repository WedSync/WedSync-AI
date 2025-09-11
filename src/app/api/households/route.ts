import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createHouseholdSchema = z.object({
  couple_id: z.string().uuid(),
  guest_ids: z.array(z.string().uuid()).min(1).max(20),
  name: z.string().min(1).max(200).optional(),
  address: z.record(z.any()).optional(),
});

const updateHouseholdSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.record(z.any()).optional(),
  invitation_sent: z.boolean().optional(),
  primary_contact_id: z.string().uuid().optional(),
});

// GET /api/households - List households for a couple
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const coupleId = searchParams.get('couple_id');

    if (!coupleId) {
      return NextResponse.json(
        { error: 'couple_id parameter required' },
        { status: 400 },
      );
    }

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
      .eq('id', coupleId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const { data: households, error } = await supabase
      .from('households')
      .select(
        `
        *,
        primary_contact:guests!primary_contact_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        guests (
          id,
          first_name,
          last_name,
          email,
          age_group,
          rsvp_status
        )
      `,
      )
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching households:', error);
      return NextResponse.json(
        { error: 'Failed to fetch households' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: households || [],
    });
  } catch (error) {
    console.error('Error in GET /api/households:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/households - Create new household
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createHouseholdSchema.parse(body);

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

    // Verify all guests belong to this couple and aren't already in households
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('id, household_id, first_name, last_name, address')
      .in('id', validatedData.guest_ids)
      .eq('couple_id', validatedData.couple_id);

    if (
      guestsError ||
      !guests ||
      guests.length !== validatedData.guest_ids.length
    ) {
      return NextResponse.json({ error: 'Invalid guest IDs' }, { status: 400 });
    }

    // Check if any guests are already in households
    const guestsInHouseholds = guests.filter((g) => g.household_id);
    if (guestsInHouseholds.length > 0) {
      return NextResponse.json(
        {
          error: 'Some guests are already in households',
          guests_in_households: guestsInHouseholds.map((g) => ({
            id: g.id,
            name: `${g.first_name} ${g.last_name}`,
          })),
        },
        { status: 409 },
      );
    }

    // Generate household name if not provided
    let householdName = validatedData.name;
    if (!householdName) {
      const { data: generatedName } = await supabase.rpc(
        'generate_household_name',
        {
          guest_ids: validatedData.guest_ids,
        },
      );
      householdName = generatedName || 'New Household';
    }

    // Create household using stored procedure
    const { data: householdId, error: createError } = await supabase.rpc(
      'create_household_from_guests',
      {
        guest_ids: validatedData.guest_ids,
        household_name: householdName,
      },
    );

    if (createError || !householdId) {
      console.error('Error creating household:', createError);
      return NextResponse.json(
        { error: 'Failed to create household' },
        { status: 500 },
      );
    }

    // Update address if provided
    if (validatedData.address) {
      await supabase
        .from('households')
        .update({ address: validatedData.address })
        .eq('id', householdId);
    }

    // Fetch the created household with relations
    const { data: createdHousehold } = await supabase
      .from('households')
      .select(
        `
        *,
        primary_contact:guests!primary_contact_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        guests (
          id,
          first_name,
          last_name,
          email,
          age_group,
          rsvp_status
        )
      `,
      )
      .eq('id', householdId)
      .single();

    return NextResponse.json(
      {
        success: true,
        data: createdHousehold,
        message: `Household created with ${validatedData.guest_ids.length} guests`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in POST /api/households:', error);

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

// PUT /api/households/[id] - Update household
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateHouseholdSchema.parse(body);

    // Set invitation sent date if status is being changed to true
    if (validatedData.invitation_sent === true) {
      (validatedData as any).invitation_sent_date = new Date().toISOString();
    }

    const { data: household, error } = await supabase
      .from('households')
      .update(validatedData)
      .eq('id', params.id)
      .select(
        `
        *,
        primary_contact:guests!primary_contact_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        guests (
          id,
          first_name,
          last_name,
          email,
          age_group,
          rsvp_status
        )
      `,
      )
      .single();

    if (error) {
      console.error('Error updating household:', error);
      return NextResponse.json(
        { error: 'Failed to update household' },
        { status: 500 },
      );
    }

    if (!household) {
      return NextResponse.json(
        { error: 'Household not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: household,
    });
  } catch (error) {
    console.error('Error in PUT /api/households/[id]:', error);

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

// DELETE /api/households/[id] - Delete household
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, remove household association from all guests
    await supabase
      .from('guests')
      .update({ household_id: null })
      .eq('household_id', params.id);

    // Then delete the household
    const { error } = await supabase
      .from('households')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting household:', error);
      return NextResponse.json(
        { error: 'Failed to delete household' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Household deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/households/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
