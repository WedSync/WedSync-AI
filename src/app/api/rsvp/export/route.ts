import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Round 2: Enhanced validation schemas for vendor exports
const ExportQuerySchema = z.object({
  event_id: z.string().uuid(),
  format: z.enum(['csv', 'json', 'excel']).default('csv'),
  type: z
    .enum([
      'full',
      'guests',
      'dietary',
      'seating',
      'vendor',
      'analytics',
      'plus_ones',
      'custom_questions',
    ])
    .default('full'),
  include_analytics: z.enum(['true', 'false']).optional(),
  filter_status: z
    .enum(['attending', 'not_attending', 'maybe', 'all'])
    .default('attending'),
  template_id: z.string().uuid().optional(),
});

const CreateTemplateSchema = z.object({
  template_name: z.string().min(1),
  export_format: z.enum(['csv', 'json', 'excel']),
  column_mapping: z.record(z.string()),
  filter_settings: z.record(z.any()).optional(),
  is_default: z.boolean().default(false),
});

// Helper function to escape CSV values
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/rsvp/export - Enhanced vendor export system (Round 2)
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const searchParams = req.nextUrl.searchParams;

    // Parse and validate parameters with Round 2 enhancements
    const queryData = ExportQuerySchema.parse({
      event_id: searchParams.get('event_id'),
      format: searchParams.get('format') || 'csv',
      type: searchParams.get('type') || 'full',
      include_analytics: searchParams.get('include_analytics') || 'false',
      filter_status: searchParams.get('filter_status') || 'attending',
      template_id: searchParams.get('template_id'),
    });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify event ownership
    const { data: event, error: eventError } = await supabase
      .from('rsvp_events')
      .select('*')
      .eq('id', queryData.event_id)
      .eq('vendor_id', user.id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found or unauthorized' },
        { status: 404 },
      );
    }

    // Load export template if specified
    let exportTemplate = null;
    if (queryData.template_id) {
      const { data: template } = await supabase
        .from('rsvp_vendor_export_templates')
        .select('*')
        .eq('id', queryData.template_id)
        .eq('vendor_id', user.id)
        .single();

      if (template) {
        exportTemplate = {
          ...template,
          column_mapping: JSON.parse(template.column_mapping),
          filter_settings: template.filter_settings
            ? JSON.parse(template.filter_settings)
            : {},
        };
      }
    }

    // Fetch comprehensive RSVP data with Round 2 enhancements
    let responseQuery = supabase
      .from('rsvp_responses')
      .select(
        `
        *,
        rsvp_invitations (
          id,
          guest_name,
          guest_email,
          guest_phone,
          is_vip,
          table_assignment,
          invitation_code,
          max_party_size
        ),
        rsvp_guest_details (
          guest_name,
          is_primary,
          meal_preference,
          dietary_restrictions,
          allergies,
          song_request,
          special_needs,
          age_group
        ),
        rsvp_custom_responses (
          rsvp_custom_questions (
            question_text,
            question_type,
            category
          ),
          answer_text,
          answer_json
        )
      `,
      )
      .eq('event_id', queryData.event_id);

    // Apply status filter
    if (queryData.filter_status !== 'all') {
      responseQuery = responseQuery.eq(
        'response_status',
        queryData.filter_status,
      );
    }

    const { data: responses, error: responsesError } =
      await responseQuery.order('responded_at', { ascending: true });

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 },
      );
    }

    // Round 2: Fetch additional data for enhanced exports
    let additionalData: any = {};

    if (['plus_ones', 'full'].includes(queryData.type)) {
      const { data: plusOnes } = await supabase
        .from('rsvp_plus_one_relationships')
        .select(
          `
          *,
          rsvp_invitations!inner (
            event_id
          )
        `,
        )
        .eq('rsvp_invitations.event_id', queryData.event_id);

      additionalData.plus_ones = plusOnes || [];
    }

    if (
      ['analytics', 'full'].includes(queryData.type) ||
      queryData.include_analytics === 'true'
    ) {
      // Get analytics data
      const { HighPerformanceRSVPAnalytics } = await import(
        '@/lib/analytics/high-performance-rsvp-analytics'
      );
      try {
        additionalData.analytics =
          await HighPerformanceRSVPAnalytics.getAnalyticsSnapshot(
            queryData.event_id,
          );
      } catch (analyticsError) {
        console.warn('Failed to fetch analytics for export:', analyticsError);
      }
    }

    // Process data based on type with Round 2 enhancements
    let exportData: any;
    let filename: string;
    let contentType: string;

    switch (queryData.type) {
      case 'guests':
        exportData = generateGuestList(responses, event);
        filename = `${event.event_name}_guest_list_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'dietary':
        exportData = generateDietaryReport(responses, event);
        filename = `${event.event_name}_dietary_requirements_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'seating':
        exportData = generateSeatingChart(responses, event);
        filename = `${event.event_name}_seating_chart_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'vendor':
        exportData = generateVendorReport(responses, event, additionalData);
        filename = `${event.event_name}_vendor_report_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'analytics':
        exportData = generateAnalyticsReport(responses, event, additionalData);
        filename = `${event.event_name}_analytics_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'plus_ones':
        exportData = generatePlusOneReport(responses, event, additionalData);
        filename = `${event.event_name}_plus_ones_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'custom_questions':
        exportData = generateCustomQuestionsReport(responses, event);
        filename = `${event.event_name}_custom_questions_${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        exportData = generateFullReport(responses, event, additionalData);
        filename = `${event.event_name}_full_rsvp_report_${new Date().toISOString().split('T')[0]}`;
    }

    // Apply custom template mapping if provided
    if (exportTemplate) {
      exportData = applyTemplateMapping(exportData, exportTemplate);
    }

    // Log export for audit trail
    await supabase.from('rsvp_export_history').insert({
      event_id: queryData.event_id,
      vendor_id: user.id,
      export_type: queryData.type,
      file_format: queryData.format,
      records_exported: Array.isArray(exportData) ? exportData.length : 1,
      export_settings: {
        type: queryData.type,
        format: queryData.format,
        filter_status: queryData.filter_status,
        include_analytics: queryData.include_analytics,
        template_id: queryData.template_id,
      },
    });

    const processingTime = Date.now() - startTime;

    // Format based on requested format with performance tracking
    switch (queryData.format) {
      case 'json':
        contentType = 'application/json';
        filename += '.json';

        const jsonResponse = {
          export_data: exportData,
          metadata: {
            event_name: event.event_name,
            export_type: queryData.type,
            generated_at: new Date().toISOString(),
            processing_time_ms: processingTime,
            record_count: Array.isArray(exportData) ? exportData.length : 1,
            performance_target_met: processingTime < 3000,
            version: 'round2',
          },
        };

        return new NextResponse(JSON.stringify(jsonResponse, null, 2), {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'X-Processing-Time': processingTime.toString(),
            'X-Record-Count': (Array.isArray(exportData)
              ? exportData.length
              : 1
            ).toString(),
          },
        });

      case 'csv':
      default:
        contentType = 'text/csv';
        filename += '.csv';
        const csvContent = convertToCSV(exportData);

        // Add metadata header for CSV
        const csvWithMetadata = `# Export Generated: ${new Date().toISOString()}\n# Event: ${event.event_name}\n# Type: ${queryData.type}\n# Records: ${Array.isArray(exportData) ? exportData.length : 1}\n# Processing Time: ${processingTime}ms\n\n${csvContent}`;

        return new NextResponse(csvWithMetadata, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'X-Processing-Time': processingTime.toString(),
            'X-Record-Count': (Array.isArray(exportData)
              ? exportData.length
              : 1
            ).toString(),
          },
        });
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
          processing_time_ms: processingTime,
        },
        { status: 400 },
      );
    }

    console.error('Error in GET /api/rsvp/export:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        processing_time_ms: processingTime,
      },
      { status: 500 },
    );
  }
}

// POST /api/rsvp/export/templates - Create export template
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = CreateTemplateSchema.parse(body);

    // Create export template
    const { data: template, error } = await supabase
      .from('rsvp_vendor_export_templates')
      .insert({
        vendor_id: user.id,
        template_name: validatedData.template_name,
        export_format: validatedData.export_format,
        column_mapping: JSON.stringify(validatedData.column_mapping),
        filter_settings: validatedData.filter_settings
          ? JSON.stringify(validatedData.filter_settings)
          : null,
        is_default: validatedData.is_default,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating export template:', error);
      return NextResponse.json(
        { error: 'Failed to create export template' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        template: {
          ...template,
          column_mapping: JSON.parse(template.column_mapping),
          filter_settings: template.filter_settings
            ? JSON.parse(template.filter_settings)
            : null,
        },
        message: 'Export template created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 },
      );
    }
    console.error('Error in POST /api/rsvp/export/templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Generate guest list
function generateGuestList(responses: any[], event: any) {
  const guests: any[] = [];

  responses.forEach((response) => {
    const invitation = response.rsvp_invitations;

    if (response.rsvp_guest_details && response.rsvp_guest_details.length > 0) {
      response.rsvp_guest_details.forEach((guest: any) => {
        guests.push({
          'Primary Guest': invitation.guest_name,
          'Guest Name': guest.guest_name,
          'Is Primary': guest.is_primary ? 'Yes' : 'No',
          Email: invitation.guest_email || '',
          Phone: invitation.guest_phone || '',
          VIP: invitation.is_vip ? 'Yes' : 'No',
          Table: invitation.table_assignment || 'TBD',
          'Age Group': guest.age_group || 'Adult',
          'Party Size': response.party_size,
          'Response Date': new Date(response.responded_at).toLocaleDateString(),
        });
      });
    } else {
      guests.push({
        'Primary Guest': invitation.guest_name,
        'Guest Name': invitation.guest_name,
        'Is Primary': 'Yes',
        Email: invitation.guest_email || '',
        Phone: invitation.guest_phone || '',
        VIP: invitation.is_vip ? 'Yes' : 'No',
        Table: invitation.table_assignment || 'TBD',
        'Age Group': 'Adult',
        'Party Size': response.party_size,
        'Response Date': new Date(response.responded_at).toLocaleDateString(),
      });
    }
  });

  return guests;
}

// Generate dietary requirements report
function generateDietaryReport(responses: any[], event: any) {
  const dietary: any[] = [];
  const summary: any = {
    restrictions: {},
    allergies: {},
    meals: {},
  };

  responses.forEach((response) => {
    const invitation = response.rsvp_invitations;

    response.rsvp_guest_details?.forEach((guest: any) => {
      const entry: any = {
        'Guest Name': guest.guest_name,
        Table: invitation.table_assignment || 'TBD',
        'Meal Choice': guest.meal_preference || 'No preference',
        'Dietary Restrictions':
          guest.dietary_restrictions?.join(', ') || 'None',
        Allergies: guest.allergies?.join(', ') || 'None',
        'Special Needs': guest.special_needs || 'None',
      };

      dietary.push(entry);

      // Update summary
      if (guest.meal_preference) {
        summary.meals[guest.meal_preference] =
          (summary.meals[guest.meal_preference] || 0) + 1;
      }

      guest.dietary_restrictions?.forEach((restriction: string) => {
        summary.restrictions[restriction] =
          (summary.restrictions[restriction] || 0) + 1;
      });

      guest.allergies?.forEach((allergy: string) => {
        summary.allergies[allergy] = (summary.allergies[allergy] || 0) + 1;
      });
    });
  });

  // Add summary at the beginning
  const summaryRows = [
    { 'Guest Name': '=== MEAL SUMMARY ===' },
    ...Object.entries(summary.meals).map(([meal, count]) => ({
      'Guest Name': meal,
      Table: `Count: ${count}`,
    })),
    { 'Guest Name': '' },
    { 'Guest Name': '=== DIETARY RESTRICTIONS ===' },
    ...Object.entries(summary.restrictions).map(([restriction, count]) => ({
      'Guest Name': restriction,
      Table: `Count: ${count}`,
    })),
    { 'Guest Name': '' },
    { 'Guest Name': '=== ALLERGIES ===' },
    ...Object.entries(summary.allergies).map(([allergy, count]) => ({
      'Guest Name': allergy,
      Table: `Count: ${count}`,
    })),
    { 'Guest Name': '' },
    { 'Guest Name': '=== DETAILED LIST ===' },
  ];

  return [...summaryRows, ...dietary];
}

// Generate seating chart
function generateSeatingChart(responses: any[], event: any) {
  const seating: any = {};

  responses.forEach((response) => {
    const invitation = response.rsvp_invitations;
    const table = invitation.table_assignment || 'Unassigned';

    if (!seating[table]) {
      seating[table] = [];
    }

    if (response.rsvp_guest_details && response.rsvp_guest_details.length > 0) {
      response.rsvp_guest_details.forEach((guest: any) => {
        seating[table].push({
          Table: table,
          'Guest Name': guest.guest_name,
          'Primary Contact': invitation.guest_name,
          VIP: invitation.is_vip ? 'Yes' : 'No',
          Meal: guest.meal_preference || 'No preference',
          Dietary: guest.dietary_restrictions?.join(', ') || 'None',
          Notes: response.notes || '',
        });
      });
    } else {
      seating[table].push({
        Table: table,
        'Guest Name': invitation.guest_name,
        'Primary Contact': invitation.guest_name,
        VIP: invitation.is_vip ? 'Yes' : 'No',
        Meal: 'No preference',
        Dietary: 'None',
        Notes: response.notes || '',
      });
    }
  });

  // Flatten seating object to array
  const result: any[] = [];
  Object.keys(seating)
    .sort()
    .forEach((table) => {
      result.push(...seating[table]);
    });

  return result;
}

// Round 2: New export report generators
function generateAnalyticsReport(
  responses: any[],
  event: any,
  additionalData: any,
) {
  const analytics = additionalData.analytics || {};

  return [
    {
      Category: 'Event Overview',
      Metric: 'Event Name',
      Value: event.event_name,
      Details: '',
    },
    {
      Category: 'Event Overview',
      Metric: 'Event Date',
      Value: new Date(event.event_date).toLocaleDateString(),
      Details: '',
    },
    {
      Category: 'Response Statistics',
      Metric: 'Total Invited',
      Value: analytics.total_invited || 0,
      Details: '',
    },
    {
      Category: 'Response Statistics',
      Metric: 'Total Responded',
      Value: analytics.total_responded || 0,
      Details: `${analytics.response_rate_percentage || 0}% response rate`,
    },
    {
      Category: 'Response Statistics',
      Metric: 'Total Attending',
      Value: analytics.total_attending || 0,
      Details: `${analytics.attendance_rate_percentage || 0}% attendance rate`,
    },
    {
      Category: 'Predictions',
      Metric: 'Predicted Final Attendance',
      Value: analytics.predicted_final_attendance || 0,
      Details: `${analytics.prediction_confidence || 0}% confidence`,
    },
    {
      Category: 'Timing',
      Metric: 'Days to Event',
      Value: analytics.days_to_event || 0,
      Details: '',
    },
    {
      Category: 'Timing',
      Metric: 'Response Velocity',
      Value: `${analytics.response_velocity || 0} per day`,
      Details: '',
    },
    {
      Category: 'Capacity',
      Metric: 'Waitlist Count',
      Value: analytics.waitlist_count || 0,
      Details: '',
    },
    {
      Category: 'Capacity',
      Metric: 'Plus Ones Count',
      Value: analytics.plus_ones_count || 0,
      Details: '',
    },
  ];
}

function generatePlusOneReport(
  responses: any[],
  event: any,
  additionalData: any,
) {
  const plusOnes: any[] = [];

  (additionalData.plus_ones || []).forEach((plusOne: any) => {
    plusOnes.push({
      'Primary Guest': plusOne.rsvp_invitations?.guest_name || 'Unknown',
      'Plus One Name': plusOne.plus_one_name,
      'Plus One Email': plusOne.plus_one_email || '',
      'Plus One Phone': plusOne.plus_one_phone || '',
      Relationship: plusOne.relationship_type,
      'Age Group': plusOne.age_group,
      'Meal Preference': plusOne.meal_preference || '',
      'Dietary Restrictions': (plusOne.dietary_restrictions || []).join(', '),
      'Special Needs': plusOne.special_needs || '',
      Confirmed: plusOne.is_confirmed ? 'Yes' : 'No',
    });
  });

  return plusOnes;
}

function generateCustomQuestionsReport(responses: any[], event: any) {
  const customResponses: any[] = [];

  responses.forEach((response) => {
    const invitation = response.rsvp_invitations;

    (response.rsvp_custom_responses || []).forEach((customResponse: any) => {
      customResponses.push({
        'Guest Name': invitation.guest_name,
        Email: invitation.guest_email || '',
        Question:
          customResponse.rsvp_custom_questions?.question_text ||
          'Unknown Question',
        'Question Type':
          customResponse.rsvp_custom_questions?.question_type || '',
        Category: customResponse.rsvp_custom_questions?.category || '',
        Answer:
          customResponse.answer_text ||
          JSON.stringify(customResponse.answer_json) ||
          'No answer',
        'Response Date': new Date(response.responded_at).toLocaleDateString(),
      });
    });
  });

  return customResponses;
}

function applyTemplateMapping(data: any[], template: any) {
  if (!data || !template.column_mapping) return data;

  return data.map((row) => {
    const mappedRow: any = {};

    Object.entries(template.column_mapping).forEach(
      ([originalKey, mappedKey]) => {
        if (row.hasOwnProperty(originalKey)) {
          mappedRow[mappedKey as string] = row[originalKey];
        }
      },
    );

    return mappedRow;
  });
}

// Generate vendor report (Enhanced for Round 2)
function generateVendorReport(
  responses: any[],
  event: any,
  additionalData: any = {},
) {
  const summary = {
    'Event Name': event.event_name,
    'Event Date': new Date(event.event_date).toLocaleDateString(),
    Venue: event.venue_name || 'TBD',
    'Total Confirmed Guests': 0,
    'Total Tables': new Set(),
    'VIP Guests': 0,
    Children: 0,
    Adults: 0,
    'Special Dietary Requirements': 0,
    'Song Requests': 0,
  };

  const details: any[] = [];

  responses.forEach((response) => {
    const invitation = response.rsvp_invitations;

    if (invitation.table_assignment) {
      summary['Total Tables'].add(invitation.table_assignment);
    }

    if (invitation.is_vip) {
      summary['VIP Guests'] += response.party_size;
    }

    response.rsvp_guest_details?.forEach((guest: any) => {
      summary['Total Confirmed Guests']++;

      if (guest.age_group === 'child' || guest.age_group === 'infant') {
        summary['Children']++;
      } else {
        summary['Adults']++;
      }

      if (
        guest.dietary_restrictions?.length > 0 ||
        guest.allergies?.length > 0
      ) {
        summary['Special Dietary Requirements']++;
      }

      if (guest.song_request) {
        summary['Song Requests']++;
      }

      details.push({
        Category: 'Guest Details',
        Item: guest.guest_name,
        Details: `Table: ${invitation.table_assignment || 'TBD'}, Meal: ${guest.meal_preference || 'N/A'}`,
        Notes: guest.special_needs || '',
      });
    });
  });

  // Convert summary to array format
  const summaryArray = Object.entries(summary).map(([key, value]) => ({
    Category: 'Event Summary',
    Item: key,
    Details: key === 'Total Tables' ? (value as Set<any>).size : value,
    Notes: '',
  }));

  return [
    ...summaryArray,
    { Category: '', Item: '', Details: '', Notes: '' },
    ...details,
  ];
}

// Generate full report
function generateFullReport(responses: any[], event: any) {
  return responses.map((response) => {
    const invitation = response.rsvp_invitations;
    const guests = response.rsvp_guest_details || [];

    return {
      Event: event.event_name,
      'Event Date': new Date(event.event_date).toLocaleDateString(),
      'Primary Guest': invitation.guest_name,
      Email: invitation.guest_email || '',
      Phone: invitation.guest_phone || '',
      'Response Status': response.response_status,
      'Party Size': response.party_size,
      Table: invitation.table_assignment || 'TBD',
      VIP: invitation.is_vip ? 'Yes' : 'No',
      'Response Date': new Date(response.responded_at).toLocaleDateString(),
      'Guest Names': guests.map((g: any) => g.guest_name).join(', '),
      'Meal Preferences': guests
        .map((g: any) => g.meal_preference)
        .filter(Boolean)
        .join(', '),
      'Dietary Restrictions': guests
        .flatMap((g: any) => g.dietary_restrictions || [])
        .join(', '),
      Allergies: guests.flatMap((g: any) => g.allergies || []).join(', '),
      'Song Requests': guests
        .map((g: any) => g.song_request)
        .filter(Boolean)
        .join(', '),
      Notes: response.notes || '',
    };
  });
}

// Convert data to CSV format
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return 'No data available';
  }

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.map(escapeCSV).join(',');

  const csvRows = data.map((row) =>
    headers.map((header) => escapeCSV(row[header])).join(','),
  );

  return [csvHeaders, ...csvRows].join('\n');
}
