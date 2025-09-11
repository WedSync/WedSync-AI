import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createClientSchema,
  clientFilterSchema,
} from '@/lib/validations/client';
import { rateLimit, rateLimitConfigs } from '@/lib/rate-limit';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import {
  sanitizeString,
  sanitizeHTML,
  validateAndSanitizeObject,
} from '@/lib/security/input-validation';

// Comprehensive input sanitization for client data
function sanitizeClientData(data: any): any {
  if (typeof data === 'string') {
    return DOMPurify.sanitize(data, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeClientData);
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeClientData(value);
    }
    return sanitized;
  }

  return data;
}

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, rateLimitConfigs.api);
    if (rateLimitResult) return rateLimitResult;

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

    // Validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validatedParams = clientFilterSchema.parse(searchParams);

    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('organization_id', profile.organization_id);

    if (validatedParams.status && validatedParams.status !== 'all') {
      query = query.eq('status', validatedParams.status);
    }

    if (validatedParams.search) {
      query = query.or(`
        first_name.ilike.%${validatedParams.search}%,
        last_name.ilike.%${validatedParams.search}%,
        email.ilike.%${validatedParams.search}%
      `);
    }

    const sortBy = validatedParams.sortBy || 'created_at';
    const sortOrder = validatedParams.sortOrder === 'asc';

    query = query
      .order(sortBy, { ascending: sortOrder })
      .range(
        validatedParams.offset,
        validatedParams.offset + validatedParams.limit - 1,
      );

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      clients: data,
      total: count,
      limit: validatedParams.limit,
      offset: validatedParams.offset,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, rateLimitConfigs.api);
    if (rateLimitResult) return rateLimitResult;

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

    const rawBody = await request.json();

    // Sanitize input data first
    const sanitizedBody = sanitizeClientData(rawBody);

    // Validate sanitized request body
    const validatedData = createClientSchema.parse(sanitizedBody);

    // Additional comprehensive sanitization
    const finalSanitizedData = validateAndSanitizeObject(validatedData, {
      first_name: 'string',
      last_name: 'string',
      email: 'email',
      phone: 'phone',
      company: 'string',
      address: 'string',
      notes: 'string',
      preferred_contact_method: 'string',
      wedding_date: 'string',
      budget: 'string',
      guest_count: 'string',
    });

    if (!finalSanitizedData) {
      return NextResponse.json(
        { error: 'Invalid client data provided' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        ...finalSanitizedData,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Sanitize data for activity feed
    const sanitizedFirstName = sanitizeString(data.first_name, 50) || 'Unknown';
    const sanitizedLastName = sanitizeString(data.last_name, 50) || 'Client';

    await supabase.from('client_activities').insert({
      client_id: data.id,
      organization_id: profile.organization_id,
      activity_type: 'client_created',
      activity_title: 'Client added',
      activity_description: `Client ${sanitizedFirstName} ${sanitizedLastName} was added to the system`,
      performed_by: user.id,
      performed_by_name:
        sanitizeString(profile.first_name, 50) ||
        sanitizeString(user.email, 50) ||
        'Unknown User',
    });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 },
    );
  }
}
