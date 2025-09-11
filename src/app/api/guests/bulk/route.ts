import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const bulkUpdateSchema = z.object({
  guest_ids: z.array(z.string().uuid()).min(1).max(1000),
  updates: z
    .object({
      category: z.enum(['family', 'friends', 'work', 'other']).optional(),
      side: z.enum(['partner1', 'partner2', 'mutual']).optional(),
      table_number: z.number().int().positive().optional().nullable(),
      rsvp_status: z
        .enum(['pending', 'attending', 'declined', 'maybe'])
        .optional(),
      tags: z.array(z.string()).optional(),
      dietary_restrictions: z.string().optional(),
      special_needs: z.string().optional(),
      helper_role: z.string().max(50).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

const bulkDeleteSchema = z.object({
  guest_ids: z.array(z.string().uuid()).min(1).max(1000),
});

const exportSchema = z.object({
  couple_id: z.string().uuid(),
  format: z.enum(['csv', 'xlsx', 'pdf']).default('csv'),
  include_fields: z.array(z.string()).optional(),
  filters: z
    .object({
      category: z.enum(['family', 'friends', 'work', 'other']).optional(),
      rsvp_status: z
        .enum(['pending', 'attending', 'declined', 'maybe'])
        .optional(),
      age_group: z.enum(['adult', 'child', 'infant']).optional(),
      side: z.enum(['partner1', 'partner2', 'mutual']).optional(),
    })
    .optional(),
});

// POST /api/guests/bulk - Bulk operations on guests
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const body = await request.json();

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

    switch (action) {
      case 'update':
        return await handleBulkUpdate(supabase, body, profile.organization_id);
      case 'delete':
        return await handleBulkDelete(supabase, body, profile.organization_id);
      case 'export':
        return await handleExport(supabase, body, profile.organization_id);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/guests/bulk:', error);

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

async function handleBulkUpdate(
  supabase: any,
  body: any,
  organizationId: string,
) {
  const validatedData = bulkUpdateSchema.parse(body);

  // Verify all guests belong to user's organization clients
  const { data: guests, error: verifyError } = await supabase
    .from('guests')
    .select(
      `
      id,
      couple_id,
      clients!inner (
        organization_id
      )
    `,
    )
    .in('id', validatedData.guest_ids)
    .eq('clients.organization_id', organizationId);

  if (
    verifyError ||
    !guests ||
    guests.length !== validatedData.guest_ids.length
  ) {
    return NextResponse.json(
      { error: 'Invalid guest IDs or access denied' },
      { status: 403 },
    );
  }

  // Perform bulk update using stored procedure
  const { data: updateCount, error: updateError } = await supabase.rpc(
    'bulk_update_guests',
    {
      guest_ids: validatedData.guest_ids,
      updates: validatedData.updates,
    },
  );

  if (updateError) {
    console.error('Error in bulk update:', updateError);
    return NextResponse.json(
      { error: 'Failed to update guests' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    updated_count: updateCount,
    message: `Successfully updated ${updateCount} guests`,
  });
}

async function handleBulkDelete(
  supabase: any,
  body: any,
  organizationId: string,
) {
  const validatedData = bulkDeleteSchema.parse(body);

  // Verify all guests belong to user's organization clients
  const { data: guests, error: verifyError } = await supabase
    .from('guests')
    .select(
      `
      id,
      household_id,
      couple_id,
      clients!inner (
        organization_id
      ),
      households (
        primary_contact_id
      )
    `,
    )
    .in('id', validatedData.guest_ids)
    .eq('clients.organization_id', organizationId);

  if (
    verifyError ||
    !guests ||
    guests.length !== validatedData.guest_ids.length
  ) {
    return NextResponse.json(
      { error: 'Invalid guest IDs or access denied' },
      { status: 403 },
    );
  }

  // Delete guests
  const { error: deleteError } = await supabase
    .from('guests')
    .delete()
    .in('id', validatedData.guest_ids);

  if (deleteError) {
    console.error('Error in bulk delete:', deleteError);
    return NextResponse.json(
      { error: 'Failed to delete guests' },
      { status: 500 },
    );
  }

  // Clean up empty households or update primary contacts
  const householdsToUpdate = new Set<string>();
  for (const guest of guests) {
    if (
      guest.household_id &&
      guest.households?.primary_contact_id === guest.id
    ) {
      householdsToUpdate.add(guest.household_id);
    }
  }

  for (const householdId of householdsToUpdate) {
    const { data: remainingGuests } = await supabase
      .from('guests')
      .select('id')
      .eq('household_id', householdId)
      .limit(1);

    if (!remainingGuests || remainingGuests.length === 0) {
      // Delete empty household
      await supabase.from('households').delete().eq('id', householdId);
    } else {
      // Update primary contact
      await supabase
        .from('households')
        .update({ primary_contact_id: remainingGuests[0].id })
        .eq('id', householdId);
    }
  }

  return NextResponse.json({
    success: true,
    deleted_count: validatedData.guest_ids.length,
    message: `Successfully deleted ${validatedData.guest_ids.length} guests`,
  });
}

async function handleExport(supabase: any, body: any, organizationId: string) {
  const validatedData = exportSchema.parse(body);

  // Verify couple belongs to user's organization
  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, last_name')
    .eq('id', validatedData.couple_id)
    .eq('organization_id', organizationId)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Get guests with filters
  let query = supabase
    .from('guests')
    .select(
      `
      first_name,
      last_name,
      email,
      phone,
      category,
      side,
      rsvp_status,
      age_group,
      plus_one,
      plus_one_name,
      table_number,
      dietary_restrictions,
      special_needs,
      helper_role,
      tags,
      notes,
      households (
        name
      )
    `,
    )
    .eq('couple_id', validatedData.couple_id)
    .order('last_name')
    .order('first_name');

  // Apply filters
  if (validatedData.filters) {
    const { category, rsvp_status, age_group, side } = validatedData.filters;
    if (category) query = query.eq('category', category);
    if (rsvp_status) query = query.eq('rsvp_status', rsvp_status);
    if (age_group) query = query.eq('age_group', age_group);
    if (side) query = query.eq('side', side);
  }

  const { data: guests, error } = await query;

  if (error) {
    console.error('Error fetching guests for export:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guests' },
      { status: 500 },
    );
  }

  // Format data for export
  const exportData = guests.map((guest) => ({
    'First Name': guest.first_name,
    'Last Name': guest.last_name,
    Email: guest.email || '',
    Phone: guest.phone || '',
    Category: guest.category,
    Side: guest.side,
    'RSVP Status': guest.rsvp_status,
    'Age Group': guest.age_group,
    'Plus One': guest.plus_one ? 'Yes' : 'No',
    'Plus One Name': guest.plus_one_name || '',
    'Table Number': guest.table_number || '',
    Household: guest.households?.name || '',
    'Dietary Restrictions': guest.dietary_restrictions || '',
    'Special Needs': guest.special_needs || '',
    'Helper Role': guest.helper_role || '',
    Tags: guest.tags.join(', '),
    Notes: guest.notes || '',
  }));

  if (validatedData.format === 'csv') {
    return generateCSVResponse(
      exportData,
      `guests-${client.first_name}-${client.last_name}`,
    );
  } else if (validatedData.format === 'xlsx') {
    return generateExcelResponse(
      exportData,
      `guests-${client.first_name}-${client.last_name}`,
    );
  } else {
    return NextResponse.json(
      { error: 'PDF export not yet implemented' },
      { status: 501 },
    );
  }
}

function generateCSVResponse(data: any[], filename: string) {
  if (data.length === 0) {
    return NextResponse.json({ error: 'No data to export' }, { status: 400 });
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map(
          (header) => `"${(row[header] || '').toString().replace(/"/g, '""')}"`,
        )
        .join(','),
    ),
  ].join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  });
}

function generateExcelResponse(data: any[], filename: string) {
  // This would require the xlsx library
  // For now, return CSV format
  return generateCSVResponse(data, filename);
}
