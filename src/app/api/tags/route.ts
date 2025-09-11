import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, rateLimitConfigs } from '@/lib/rate-limit';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { sanitizeString } from '@/lib/security/input-validation';

// Tag validation schemas
const createTagSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  description: z.string().max(200).trim().optional().nullable(),
  color: z.enum([
    'gray',
    'red',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'sky',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
  ]),
  category: z.enum([
    'relationship',
    'venue',
    'season',
    'style',
    'service',
    'priority',
    'custom',
  ]),
});

const tagFilterSchema = z.object({
  category: z
    .enum([
      'relationship',
      'venue',
      'season',
      'style',
      'service',
      'priority',
      'custom',
      'all',
    ])
    .optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'usage_count', 'created_at']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// Comprehensive input sanitization for tag data
function sanitizeTagData(data: any): any {
  if (typeof data === 'string') {
    return DOMPurify.sanitize(data, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeTagData);
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeTagData(value);
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
    const validatedParams = tagFilterSchema.parse(searchParams);

    // Build query with usage count from client_tags junction table
    let query = supabase
      .from('tags')
      .select(
        `
        id,
        name,
        description,
        color,
        category,
        created_at,
        updated_at,
        client_tags!left(count)
      `,
        { count: 'exact' },
      )
      .eq('organization_id', profile.organization_id);

    if (validatedParams.category && validatedParams.category !== 'all') {
      query = query.eq('category', validatedParams.category);
    }

    if (validatedParams.search) {
      query = query.or(`
        name.ilike.%${validatedParams.search}%,
        description.ilike.%${validatedParams.search}%
      `);
    }

    const sortBy = validatedParams.sortBy || 'name';
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

    // Process the data to calculate usage counts
    const processedData =
      data?.map((tag) => ({
        ...tag,
        usage_count: Array.isArray(tag.client_tags)
          ? tag.client_tags.length
          : 0,
        client_tags: undefined, // Remove the junction table data
      })) || [];

    return NextResponse.json({
      tags: processedData,
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
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
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
    const sanitizedBody = sanitizeTagData(rawBody);

    // Validate sanitized request body
    const validatedData = createTagSchema.parse(sanitizedBody);

    // Additional sanitization for tag name and description
    const sanitizedName = sanitizeString(validatedData.name, 50);
    const sanitizedDescription = validatedData.description
      ? sanitizeString(validatedData.description, 200)
      : null;

    if (!sanitizedName) {
      return NextResponse.json(
        { error: 'Invalid tag name provided' },
        { status: 400 },
      );
    }

    // Check for duplicate tag names within organization
    const { data: existingTag } = await supabase
      .from('tags')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('name', sanitizedName)
      .single();

    if (existingTag) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({
        name: sanitizedName,
        description: sanitizedDescription,
        color: validatedData.color,
        category: validatedData.category,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select(
        `
        id,
        name,
        description,
        color,
        category,
        created_at,
        updated_at
      `,
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      tag: {
        ...data,
        usage_count: 0, // New tag has no usage
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 },
    );
  }
}
