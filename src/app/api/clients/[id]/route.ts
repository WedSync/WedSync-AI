import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DynamicAPIRouteContext, extractParams } from '@/types/next15-params';
import {
  isValidUUID,
  validateAndSanitizeObject,
  sanitizeString,
} from '@/lib/security/input-validation';
import { z } from 'zod';
import rateLimit from '@/lib/rate-limit';

// Rate limiting for client operations
const clientRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

// CSRF token validation
function validateCSRFToken(request: NextRequest): boolean {
  const csrfToken = request.headers.get('x-csrf-token');
  const sessionToken = request.cookies.get('csrf-token')?.value;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return false;
  }

  return true;
}

// Client data validation schema
const clientUpdateSchema = z.object({
  company_name: z.string().max(100).optional(),
  contact_name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  website: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  client_type: z.string().max(50).optional(),
  preferred_contact_method: z.enum(['email', 'phone', 'both']).optional(),
});

export async function GET(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  // Extract async params - Next.js 15 requirement
  const params = await extractParams(context.params);
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await clientRateLimit.check(100, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Validate client ID format
    if (!isValidUUID(params.id)) {
      return NextResponse.json(
        { error: 'Invalid client ID format' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('clients')
      .select(
        `
        *,
        client_activities (
          id,
          activity_type,
          activity_title,
          activity_description,
          performed_by_name,
          created_at
        )
      `,
      )
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 },
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  // Extract async params - Next.js 15 requirement
  const params = await extractParams(context.params);
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await clientRateLimit.check(20, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // CSRF protection
    if (!validateCSRFToken(request)) {
      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 },
      );
    }

    // Validate client ID format
    if (!isValidUUID(params.id)) {
      return NextResponse.json(
        { error: 'Invalid client ID format' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();

    // Validate and sanitize client data using Zod schema
    const validatedData = clientUpdateSchema.parse(body);

    // Additional sanitization for strings
    const sanitizedData = validateAndSanitizeObject(validatedData, {
      company_name: 'string',
      contact_name: 'string',
      email: 'email',
      phone: 'phone',
      address: 'string',
      website: 'string',
      notes: 'string',
      status: 'string',
      client_type: 'string',
      preferred_contact_method: 'string',
    });

    if (!sanitizedData) {
      return NextResponse.json(
        { error: 'Invalid client data provided' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('clients')
      .update({
        ...sanitizedData,
        updated_at: new Date().toISOString(),
        last_modified_by: user.id,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 },
        );
      }
      throw error;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, first_name')
      .eq('user_id', user.id)
      .single();

    await supabase.from('client_activities').insert({
      client_id: params.id,
      organization_id: data.organization_id,
      activity_type: 'client_updated',
      activity_title: 'Client information updated',
      activity_description: 'Client details were modified',
      performed_by: user.id,
      performed_by_name: profile?.first_name || user.email,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating client:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid client data',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  // Extract async params - Next.js 15 requirement
  const params = await extractParams(context.params);
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await clientRateLimit.check(10, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // CSRF protection
    if (!validateCSRFToken(request)) {
      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 },
      );
    }

    // Validate client ID format
    if (!isValidUUID(params.id)) {
      return NextResponse.json(
        { error: 'Invalid client ID format' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('clients')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
        last_modified_by: user.id,
      })
      .eq('id', params.id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 },
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error archiving client:', error);
    return NextResponse.json(
      { error: 'Failed to archive client' },
      { status: 500 },
    );
  }
}
