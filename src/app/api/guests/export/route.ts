import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGuestService } from '@/lib/services/guestService';
import { z } from 'zod';

// Validation schema for export
const exportSchema = z.object({
  couple_id: z.string().uuid(),
  format: z.enum(['csv', 'xlsx', 'json']).default('csv'),
  filters: z
    .object({
      search: z.string().optional(),
      category: z.enum(['family', 'friends', 'work', 'other']).optional(),
      rsvp_status: z
        .enum(['pending', 'attending', 'declined', 'maybe'])
        .optional(),
      age_group: z.enum(['adult', 'child', 'infant']).optional(),
      side: z.enum(['partner1', 'partner2', 'mutual']).optional(),
      has_dietary_restrictions: z.boolean().optional(),
      has_plus_one: z.boolean().optional(),
      table_assigned: z.boolean().optional(),
      household_id: z.string().uuid().optional(),
    })
    .optional(),
  include_fields: z
    .array(
      z.enum([
        'first_name',
        'last_name',
        'email',
        'phone',
        'address',
        'category',
        'side',
        'rsvp_status',
        'age_group',
        'plus_one',
        'plus_one_name',
        'table_number',
        'dietary_restrictions',
        'special_needs',
        'helper_role',
        'tags',
        'notes',
        'household_name',
        'created_at',
        'updated_at',
      ]),
    )
    .optional(),
  sort_by: z
    .enum(['name', 'category', 'rsvp_status', 'table_number', 'created_at'])
    .default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().int().min(1).max(10000).optional(),
  include_analytics: z.boolean().default(false),
});

// GET /api/guests/export - High-performance guest export
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Parse and validate parameters
    const processedParams = {
      ...queryParams,
      filters: queryParams.filters ? JSON.parse(queryParams.filters) : {},
      include_fields: queryParams.include_fields
        ? queryParams.include_fields.split(',')
        : undefined,
      include_analytics: queryParams.include_analytics === 'true',
      limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
    };

    const validatedData = exportSchema.parse(processedParams);

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
      .select('id, first_name, last_name')
      .eq('id', validatedData.couple_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Initialize guest service
    const guestService = await createGuestService();

    // Build optimized query
    const guestQuery = await buildOptimizedGuestQuery(
      supabase,
      validatedData,
      validatedData.include_fields,
    );

    // Execute query with performance monitoring
    const queryStartTime = Date.now();
    const { data: guests, error } = await guestQuery;

    if (error) {
      console.error('Error fetching guests for export:', error);
      return NextResponse.json(
        { error: 'Failed to fetch guests' },
        { status: 500 },
      );
    }

    const queryTime = Date.now() - queryStartTime;

    // Get analytics if requested
    let analytics = null;
    if (validatedData.include_analytics) {
      analytics = await guestService.calculateGuestCounts(
        validatedData.couple_id,
      );
    }

    // Format data based on requested format
    const formatStartTime = Date.now();
    const exportResult = await formatExportData(
      guests || [],
      validatedData.format,
      validatedData.include_fields,
      client,
      analytics,
    );
    const formatTime = Date.now() - formatStartTime;

    // Performance metrics
    const totalTime = Date.now() - startTime;
    const performanceMetrics = {
      total_time_ms: totalTime,
      query_time_ms: queryTime,
      format_time_ms: formatTime,
      guests_processed: guests?.length || 0,
      guests_per_second: Math.round(((guests?.length || 0) / totalTime) * 1000),
    };

    // Return formatted data based on format
    if (validatedData.format === 'json') {
      return NextResponse.json({
        success: true,
        data: exportResult.data,
        analytics,
        performance_metrics: performanceMetrics,
        export_info: {
          exported_at: new Date().toISOString(),
          total_guests: guests?.length || 0,
          client_name: `${client.first_name} ${client.last_name}`,
          filters_applied: Object.keys(validatedData.filters || {}).length > 0,
        },
      });
    } else {
      // Return file download
      return new NextResponse(exportResult.content, {
        headers: {
          'Content-Type': exportResult.contentType,
          'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
          'X-Performance-Metrics': JSON.stringify(performanceMetrics),
          'X-Total-Guests': (guests?.length || 0).toString(),
        },
      });
    }
  } catch (error) {
    console.error('Error in GET /api/guests/export:', error);

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

// Helper function to build optimized guest query
async function buildOptimizedGuestQuery(
  supabase: any,
  config: any,
  includeFields?: string[],
) {
  // Default fields for performance
  const defaultFields = [
    'id',
    'first_name',
    'last_name',
    'email',
    'phone',
    'category',
    'side',
    'rsvp_status',
    'age_group',
    'plus_one',
    'plus_one_name',
    'table_number',
    'dietary_restrictions',
  ];

  // Determine which fields to select
  const fieldsToSelect = includeFields || defaultFields;
  const selectClause = fieldsToSelect.join(', ');

  // Add household information if needed
  const includeHousehold =
    includeFields?.includes('household_name') || config.filters?.household_id;

  let query = supabase
    .from('guests')
    .select(
      includeHousehold ? `${selectClause}, households(id, name)` : selectClause,
    )
    .eq('couple_id', config.couple_id);

  // Apply filters
  if (config.filters) {
    const filters = config.filters;

    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
      );
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.rsvp_status) {
      query = query.eq('rsvp_status', filters.rsvp_status);
    }

    if (filters.age_group) {
      query = query.eq('age_group', filters.age_group);
    }

    if (filters.side) {
      query = query.eq('side', filters.side);
    }

    if (filters.has_dietary_restrictions === true) {
      query = query.not('dietary_restrictions', 'is', null);
    } else if (filters.has_dietary_restrictions === false) {
      query = query.is('dietary_restrictions', null);
    }

    if (filters.has_plus_one === true) {
      query = query.eq('plus_one', true);
    } else if (filters.has_plus_one === false) {
      query = query.eq('plus_one', false);
    }

    if (filters.table_assigned === true) {
      query = query.not('table_number', 'is', null);
    } else if (filters.table_assigned === false) {
      query = query.is('table_number', null);
    }

    if (filters.household_id) {
      query = query.eq('household_id', filters.household_id);
    }
  }

  // Apply sorting
  if (config.sort_by === 'name') {
    query = query.order('last_name', {
      ascending: config.sort_order === 'asc',
    });
    query = query.order('first_name', {
      ascending: config.sort_order === 'asc',
    });
  } else {
    query = query.order(config.sort_by, {
      ascending: config.sort_order === 'asc',
    });
  }

  // Apply limit if specified
  if (config.limit) {
    query = query.limit(config.limit);
  }

  return query;
}

// Helper function to format export data
async function formatExportData(
  guests: any[],
  format: string,
  includeFields?: string[],
  client?: any,
  analytics?: any,
): Promise<{
  data?: any;
  content?: string | Buffer;
  contentType: string;
  filename: string;
}> {
  const timestamp = new Date().toISOString().split('T')[0];
  const clientName = client
    ? `${client.first_name}-${client.last_name}`
    : 'guests';
  const filename = `${clientName}-guests-${timestamp}`;

  // Transform guest data for export
  const exportData = guests.map((guest) => {
    const exportGuest: any = {};

    // Map fields with proper formatting
    if (!includeFields || includeFields.includes('first_name')) {
      exportGuest['First Name'] = guest.first_name || '';
    }
    if (!includeFields || includeFields.includes('last_name')) {
      exportGuest['Last Name'] = guest.last_name || '';
    }
    if (!includeFields || includeFields.includes('email')) {
      exportGuest['Email'] = guest.email || '';
    }
    if (!includeFields || includeFields.includes('phone')) {
      exportGuest['Phone'] = guest.phone || '';
    }
    if (!includeFields || includeFields.includes('address')) {
      exportGuest['Address'] = guest.address
        ? typeof guest.address === 'object'
          ? Object.values(guest.address).join(', ')
          : guest.address.toString()
        : '';
    }
    if (!includeFields || includeFields.includes('category')) {
      exportGuest['Category'] = guest.category || '';
    }
    if (!includeFields || includeFields.includes('side')) {
      exportGuest['Side'] = guest.side || '';
    }
    if (!includeFields || includeFields.includes('rsvp_status')) {
      exportGuest['RSVP Status'] = guest.rsvp_status || '';
    }
    if (!includeFields || includeFields.includes('age_group')) {
      exportGuest['Age Group'] = guest.age_group || '';
    }
    if (!includeFields || includeFields.includes('plus_one')) {
      exportGuest['Plus One'] = guest.plus_one ? 'Yes' : 'No';
    }
    if (!includeFields || includeFields.includes('plus_one_name')) {
      exportGuest['Plus One Name'] = guest.plus_one_name || '';
    }
    if (!includeFields || includeFields.includes('table_number')) {
      exportGuest['Table Number'] = guest.table_number || '';
    }
    if (!includeFields || includeFields.includes('dietary_restrictions')) {
      exportGuest['Dietary Restrictions'] = guest.dietary_restrictions || '';
    }
    if (!includeFields || includeFields.includes('special_needs')) {
      exportGuest['Special Needs'] = guest.special_needs || '';
    }
    if (!includeFields || includeFields.includes('helper_role')) {
      exportGuest['Helper Role'] = guest.helper_role || '';
    }
    if (!includeFields || includeFields.includes('tags')) {
      exportGuest['Tags'] = Array.isArray(guest.tags)
        ? guest.tags.join(', ')
        : '';
    }
    if (!includeFields || includeFields.includes('notes')) {
      exportGuest['Notes'] = guest.notes || '';
    }
    if (!includeFields || includeFields.includes('household_name')) {
      exportGuest['Household'] = guest.households?.name || '';
    }
    if (includeFields?.includes('created_at')) {
      exportGuest['Created At'] = guest.created_at || '';
    }
    if (includeFields?.includes('updated_at')) {
      exportGuest['Updated At'] = guest.updated_at || '';
    }

    return exportGuest;
  });

  // Generate format-specific output
  switch (format) {
    case 'json':
      return {
        data: {
          guests: exportData,
          summary: {
            total_guests: guests.length,
            export_timestamp: new Date().toISOString(),
            client_name: client
              ? `${client.first_name} ${client.last_name}`
              : null,
          },
          analytics,
        },
        contentType: 'application/json',
        filename: `${filename}.json`,
      };

    case 'csv':
      const csvContent = generateCSV(exportData);
      return {
        content: csvContent,
        contentType: 'text/csv; charset=utf-8',
        filename: `${filename}.csv`,
      };

    case 'xlsx':
      const excelBuffer = await generateExcel(exportData, analytics);
      return {
        content: excelBuffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${filename}.xlsx`,
      };

    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

// Helper function to generate CSV
function generateCSV(data: any[]): string {
  if (data.length === 0) {
    return 'No data to export';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header] || '';
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const escapedValue = value.toString().replace(/"/g, '""');
          return /[,"\n]/.test(escapedValue)
            ? `"${escapedValue}"`
            : escapedValue;
        })
        .join(','),
    ),
  ];

  return csvRows.join('\n');
}

// Helper function to generate Excel
async function generateExcel(data: any[], analytics?: any): Promise<Buffer> {
  try {
    const XLSX = await import('xlsx');

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add guests sheet
    const guestsSheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, guestsSheet, 'Guests');

    // Add analytics sheet if provided
    if (analytics) {
      const analyticsData = Object.entries(analytics).map(([key, value]) => ({
        Metric: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        Value: value,
      }));
      const analyticsSheet = XLSX.utils.json_to_sheet(analyticsData);
      XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Analytics');
    }

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  } catch (error) {
    console.error('Excel generation error:', error);
    // Fallback to CSV format
    const csvContent = generateCSV(data);
    return Buffer.from(csvContent, 'utf-8');
  }
}
