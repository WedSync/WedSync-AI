import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const location = searchParams.get('location');
    const verified = searchParams.get('verified');
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('is_published', true);

    if (category && category !== 'all') {
      query = query.eq('primary_category', category);
    }

    if (search) {
      query = query.or(`
        business_name.ilike.%${search}%,
        description.ilike.%${search}%,
        city.ilike.%${search}%
      `);
    }

    if (location) {
      query = query.or(`
        city.ilike.%${location}%,
        county.ilike.%${location}%
      `);
    }

    if (verified === 'true') {
      query = query.eq('is_verified', true);
    }

    query = query
      .order('average_rating', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      suppliers: data,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const body = await request.json();

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        ...body,
        organization_id: profile.organization_id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 },
    );
  }
}
