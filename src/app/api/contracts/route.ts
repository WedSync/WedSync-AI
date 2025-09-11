import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const contractSchema = z.object({
  client_id: z.string().uuid(),
  supplier_id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  contract_type: z.enum([
    'vendor_service',
    'venue_rental',
    'supplier_agreement',
    'other',
  ]),
  total_amount: z.number().positive(),
  currency: z.string().length(3).default('GBP'),
  deposit_amount: z.number().optional(),
  deposit_percentage: z.number().min(0).max(100).optional(),
  contract_date: z.string().datetime(),
  service_start_date: z.string().datetime().optional(),
  service_end_date: z.string().datetime().optional(),
  contract_expiry_date: z.string().datetime().optional(),
  terms_conditions: z.string().optional(),
  cancellation_policy: z.string().optional(),
  force_majeure_clause: z.string().optional(),
  privacy_policy_accepted: z.boolean().default(false),
  gdpr_consent: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '10');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const client_id = searchParams.get('client_id');
    const search = searchParams.get('search');

    // Get user's organization
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let query = supabase
      .from('contracts_with_payment_status')
      .select(
        `
        *,
        clients!inner(
          id,
          first_name,
          last_name,
          email,
          wedding_date
        ),
        suppliers(
          id,
          business_name,
          email
        )
      `,
      )
      .eq('organization_id', profile.organization_id);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category_id', category);
    }
    if (client_id) {
      query = query.eq('client_id', client_id);
    }
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,contract_number.ilike.%${search}%`,
      );
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: contracts,
      error,
      count,
    } = await query.range(from, to).order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contracts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contracts' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      contracts,
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Contracts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate input
    const validatedData = contractSchema.parse(body);

    // Get user's organization
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Calculate balance amount
    const balance_amount = validatedData.deposit_amount
      ? validatedData.total_amount - validatedData.deposit_amount
      : validatedData.total_amount;

    // Create contract
    const { data: contract, error } = await supabase
      .from('wedding_contracts')
      .insert({
        ...validatedData,
        organization_id: profile.organization_id,
        balance_amount,
        created_by: user.id,
        last_modified_by: user.id,
        contract_date: new Date(validatedData.contract_date)
          .toISOString()
          .split('T')[0],
        service_start_date: validatedData.service_start_date
          ? new Date(validatedData.service_start_date)
              .toISOString()
              .split('T')[0]
          : null,
        service_end_date: validatedData.service_end_date
          ? new Date(validatedData.service_end_date).toISOString().split('T')[0]
          : null,
        contract_expiry_date: validatedData.contract_expiry_date
          ? new Date(validatedData.contract_expiry_date)
              .toISOString()
              .split('T')[0]
          : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contract:', error);
      return NextResponse.json(
        { error: 'Failed to create contract' },
        { status: 500 },
      );
    }

    // Create default deposit milestone if deposit amount provided
    if (validatedData.deposit_amount && validatedData.deposit_amount > 0) {
      const depositDueDate = new Date();
      depositDueDate.setDate(depositDueDate.getDate() + 7); // Due in 7 days

      await supabase.from('contract_payment_milestones').insert({
        contract_id: contract.id,
        organization_id: profile.organization_id,
        milestone_name: 'Deposit Payment',
        description: 'Initial deposit payment',
        milestone_type: 'deposit',
        sequence_order: 1,
        amount: validatedData.deposit_amount,
        percentage_of_total: validatedData.deposit_percentage,
        currency: validatedData.currency,
        due_date: depositDueDate.toISOString().split('T')[0],
        status: 'pending',
      });

      // Create final payment milestone
      const finalDueDate = validatedData.service_start_date
        ? new Date(validatedData.service_start_date)
        : new Date();
      finalDueDate.setDate(finalDueDate.getDate() - 7); // Due 7 days before service

      await supabase.from('contract_payment_milestones').insert({
        contract_id: contract.id,
        organization_id: profile.organization_id,
        milestone_name: 'Final Payment',
        description: 'Final balance payment',
        milestone_type: 'final_payment',
        sequence_order: 2,
        amount: balance_amount,
        percentage_of_total: validatedData.deposit_percentage
          ? 100 - validatedData.deposit_percentage
          : 100,
        currency: validatedData.currency,
        due_date: finalDueDate.toISOString().split('T')[0],
        status: 'pending',
      });
    }

    return NextResponse.json({ contract }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Create contract error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
