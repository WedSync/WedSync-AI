import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exportWeddingAnalytics } from '@/lib/analytics/wedding-metrics';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: weddingId } = await params;
    const body = await request.json();
    const { format = 'csv', include_all = true } = body;

    // Verify user has access to this wedding
    const supabase = await createClient();
    const { data: wedding, error: weddingError } = await supabase
      .from('wedding_events')
      .select('id, user_id, wedding_name')
      .eq('id', weddingId)
      .single();

    if (weddingError || !wedding) {
      return NextResponse.json(
        { error: 'Wedding not found or access denied' },
        { status: 404 },
      );
    }

    // Generate export data
    const exportData = await exportWeddingAnalytics(weddingId, format);

    // Set appropriate headers for file download
    const headers = new Headers();

    if (format === 'csv') {
      headers.set('Content-Type', 'text/csv');
      headers.set(
        'Content-Disposition',
        `attachment; filename="wedding_analytics_${wedding.wedding_name}_${Date.now()}.csv"`,
      );
    } else {
      headers.set('Content-Type', 'application/json');
      headers.set(
        'Content-Disposition',
        `attachment; filename="wedding_analytics_${wedding.wedding_name}_${Date.now()}.json"`,
      );
    }

    return new NextResponse(exportData, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error exporting wedding analytics:', error);
    return NextResponse.json(
      {
        error: 'Failed to export wedding analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: weddingId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    // Verify user has access to this wedding
    const supabase = await createClient();
    const { data: wedding, error: weddingError } = await supabase
      .from('wedding_events')
      .select('id, user_id, wedding_name')
      .eq('id', weddingId)
      .single();

    if (weddingError || !wedding) {
      return NextResponse.json(
        { error: 'Wedding not found or access denied' },
        { status: 404 },
      );
    }

    // Return export metadata for preview/planning
    const metadata = {
      wedding_id: weddingId,
      wedding_name: wedding.wedding_name,
      available_formats: ['csv', 'json'],
      estimated_records: 1000, // This would be calculated based on actual data
      estimated_size_kb: 150,
      estimated_time_seconds: 2,
      recommended_batch_size: 500,
      preview_available: true,
    };

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error getting export metadata:', error);
    return NextResponse.json(
      {
        error: 'Failed to get export metadata',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
