import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const exportSchema = z.object({
  client_id: z.string().uuid(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  format: z.enum(['json', 'csv']).default('json'),
  batch_size: z.number().min(100).max(10000).default(5000),
  filters: z
    .object({
      status: z.string().optional(),
      search: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params = exportSchema.parse(body);

    const supabase = await createClient();

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use streaming response for large datasets
    const encoder = new TextEncoder();
    let offset = 0;
    let hasMore = true;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send headers for CSV format
          if (params.format === 'csv') {
            const csvHeader =
              'id,form_id,created_at,updated_at,status,response_time_seconds,metadata\n';
            controller.enqueue(encoder.encode(csvHeader));
          } else {
            controller.enqueue(encoder.encode('{"data":['));
          }

          let isFirstBatch = true;

          while (hasMore) {
            // Build query with filters
            let query = supabase
              .from('form_submissions')
              .select(
                `
                id,
                form_id,
                created_at,
                updated_at,
                status,
                data,
                metadata
              `,
              )
              .eq('form_id', params.client_id)
              .gte('created_at', params.start_date)
              .lte('created_at', params.end_date)
              .order('created_at', { ascending: false })
              .range(offset, offset + params.batch_size - 1);

            // Apply filters
            if (params.filters?.status && params.filters.status !== 'all') {
              query = query.eq('status', params.filters.status);
            }

            const { data: batchData, error } = await query;

            if (error) throw error;

            if (!batchData || batchData.length === 0) {
              hasMore = false;
              break;
            }

            // Process batch and calculate response times
            const processedData = batchData.map((row) => ({
              ...row,
              response_time_seconds: row.updated_at
                ? (new Date(row.updated_at).getTime() -
                    new Date(row.created_at).getTime()) /
                  1000
                : null,
            }));

            // Filter by search term if provided
            let filteredData = processedData;
            if (params.filters?.search) {
              const searchTerm = params.filters.search.toLowerCase();
              filteredData = processedData.filter(
                (row) =>
                  JSON.stringify(row.data).toLowerCase().includes(searchTerm) ||
                  row.status.toLowerCase().includes(searchTerm) ||
                  row.id.toLowerCase().includes(searchTerm),
              );
            }

            if (filteredData.length === 0) {
              offset += params.batch_size;
              continue;
            }

            // Process batch based on format
            if (params.format === 'csv') {
              const csvData =
                filteredData
                  .map((row: any) => {
                    const metadata = JSON.stringify(row.metadata || {}).replace(
                      /"/g,
                      '""',
                    );
                    return `"${row.id}","${row.form_id}","${row.created_at}","${row.updated_at || ''}","${row.status}",${row.response_time_seconds || ''},\"${metadata}\"`;
                  })
                  .join('\n') + '\n';
              controller.enqueue(encoder.encode(csvData));
            } else {
              const jsonPrefix = isFirstBatch ? '' : ',';
              const jsonData =
                jsonPrefix +
                filteredData.map((row) => JSON.stringify(row)).join(',');
              controller.enqueue(encoder.encode(jsonData));
              isFirstBatch = false;
            }

            offset += params.batch_size;
            hasMore = batchData.length === params.batch_size;

            // Add small delay to prevent overwhelming the database
            if (hasMore) {
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          }

          // Close JSON format
          if (params.format === 'json') {
            controller.enqueue(encoder.encode(']}'));
          }
        } catch (error) {
          console.error('Export stream error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    const headers: Record<string, string> = {
      'Content-Type': params.format === 'csv' ? 'text/csv' : 'application/json',
      'Content-Disposition': `attachment; filename="responses_export_${Date.now()}.${params.format}"`,
      'Transfer-Encoding': 'chunked',
    };

    return new Response(stream, { headers });
  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 },
    );
  }
}

// GET endpoint for export status/metadata
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!clientId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get count estimate for export size
    const { count, error } = await supabase
      .from('form_submissions')
      .select('*', { count: 'estimated', head: true })
      .eq('form_id', clientId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    const estimatedSize = Math.round((count || 0) * 0.5); // Rough KB estimate
    const estimatedTime = Math.ceil((count || 0) / 5000) * 2; // Seconds estimate

    return NextResponse.json({
      estimated_records: count,
      estimated_size_kb: estimatedSize,
      estimated_time_seconds: estimatedTime,
      max_batch_size: 10000,
      recommended_batch_size: count && count > 50000 ? 1000 : 5000,
    });
  } catch (error) {
    console.error('Export metadata API error:', error);
    return NextResponse.json(
      { error: 'Failed to get export metadata' },
      { status: 500 },
    );
  }
}
