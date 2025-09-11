import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'vendor') {
      return NextResponse.json(
        { error: 'Supplier profile not found' },
        { status: 404 },
      );
    }

    // Get vendor/supplier details
    const { data: supplier, error: supplierError } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (supplierError) {
      console.error('Error fetching supplier:', supplierError);
      return NextResponse.json(
        { error: 'Failed to fetch supplier data' },
        { status: 500 },
      );
    }

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error in supplier profile API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Update vendor/supplier profile
    const { data: supplier, error: updateError } = await supabase
      .from('vendors')
      .update({
        business_name: body.business_name,
        contact_name: body.contact_name,
        email: body.email,
        phone: body.phone,
        website: body.website,
        description: body.description,
        services: body.services,
        availability: body.availability,
        location: body.location,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating supplier:', updateError);
      return NextResponse.json(
        { error: 'Failed to update supplier profile' },
        { status: 500 },
      );
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error in supplier profile update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
