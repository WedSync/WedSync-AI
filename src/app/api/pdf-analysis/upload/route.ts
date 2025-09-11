import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// File validation schema
const uploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.type === 'application/pdf',
      'Only PDF files are allowed',
    )
    .refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB limit
      'File size must be under 10MB',
    ),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 },
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    const validation = uploadSchema.safeParse({ file });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 },
      );
    }

    // Generate unique analysis ID
    const analysisId = uuidv4();
    const fileName = `${analysisId}-${file.name}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdf-analysis')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 },
      );
    }

    // Create analysis record in database
    const { data: analysisData, error: dbError } = await supabase
      .from('pdf_analyses')
      .insert({
        id: analysisId,
        organization_id: profile.organization_id,
        user_id: user.id,
        original_filename: file.name,
        storage_path: uploadData.path,
        file_size: file.size,
        status: 'processing',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('pdf-analysis').remove([uploadData.path]);
      return NextResponse.json(
        { error: 'Failed to create analysis record' },
        { status: 500 },
      );
    }

    // Start AI analysis process (in a real implementation, this would be a background job)
    // For now, we'll simulate the process
    setTimeout(async () => {
      await startAIAnalysisProcess(analysisId, supabase);
    }, 1000);

    return NextResponse.json({
      analysisId,
      message: 'File uploaded successfully',
      status: 'processing',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Simulate AI analysis process (in production, this would be handled by a queue/worker)
async function startAIAnalysisProcess(analysisId: string, supabase: any) {
  try {
    // Stage 1: PDF Parsing (30 seconds)
    await supabase
      .from('pdf_analyses')
      .update({
        current_stage: 'pdf_parsing',
        stage_progress: 0,
      })
      .eq('id', analysisId);

    // Simulate progress updates
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await supabase
        .from('pdf_analyses')
        .update({
          stage_progress: progress,
        })
        .eq('id', analysisId);
    }

    // Stage 2: Vision Analysis (45 seconds)
    await supabase
      .from('pdf_analyses')
      .update({
        current_stage: 'vision_analysis',
        stage_progress: 0,
      })
      .eq('id', analysisId);

    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      await supabase
        .from('pdf_analyses')
        .update({
          stage_progress: progress,
        })
        .eq('id', analysisId);
    }

    // Stage 3: Field Extraction (60 seconds)
    await supabase
      .from('pdf_analyses')
      .update({
        current_stage: 'field_extraction',
        stage_progress: 0,
      })
      .eq('id', analysisId);

    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await supabase
        .from('pdf_analyses')
        .update({
          stage_progress: progress,
        })
        .eq('id', analysisId);
    }

    // Stage 4: Validation (15 seconds)
    await supabase
      .from('pdf_analyses')
      .update({
        current_stage: 'validation',
        stage_progress: 0,
      })
      .eq('id', analysisId);

    for (let progress = 0; progress <= 100; progress += 20) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await supabase
        .from('pdf_analyses')
        .update({
          stage_progress: progress,
        })
        .eq('id', analysisId);
    }

    // Complete analysis with mock extracted fields
    const mockExtractedFields = [
      {
        id: 'field-1',
        name: 'Bride Name',
        type: 'text',
        value: 'Emily Johnson',
        confidence: 95,
        category: 'Basic Details',
        required: true,
        wedding_context: {
          importance: 'critical',
          tips: ['Always verify spelling for invitations and certificates'],
          related_fields: ['groom_name', 'couple_names'],
        },
      },
      {
        id: 'field-2',
        name: 'Groom Name',
        type: 'text',
        value: 'James Johnson',
        confidence: 94,
        category: 'Basic Details',
        required: true,
        wedding_context: {
          importance: 'critical',
          tips: ['Check preferred name vs legal name'],
          related_fields: ['bride_name', 'couple_names'],
        },
      },
      {
        id: 'field-3',
        name: 'Wedding Date',
        type: 'date',
        value: '2024-06-15',
        confidence: 98,
        category: 'Event Details',
        required: true,
        wedding_context: {
          importance: 'critical',
          tips: ['Verify this matches contract and venue booking'],
          related_fields: ['ceremony_time', 'reception_time'],
        },
      },
      {
        id: 'field-4',
        name: 'Venue Name',
        type: 'text',
        value: 'Ashridge House',
        confidence: 89,
        category: 'Event Details',
        required: true,
        wedding_context: {
          importance: 'critical',
          tips: ['Check venue restrictions and requirements'],
          related_fields: ['venue_address', 'venue_contact'],
        },
      },
      {
        id: 'field-5',
        name: 'Guest Count',
        type: 'number',
        value: '120',
        confidence: 87,
        category: 'Planning Details',
        required: false,
        wedding_context: {
          importance: 'important',
          tips: ['This affects catering, seating, and photography planning'],
          related_fields: ['ceremony_guests', 'reception_guests'],
        },
      },
    ];

    await supabase
      .from('pdf_analyses')
      .update({
        status: 'completed',
        current_stage: 'completed',
        stage_progress: 100,
        extracted_fields: mockExtractedFields,
        fields_count: mockExtractedFields.length,
        confidence_score: Math.round(
          mockExtractedFields.reduce(
            (sum, field) => sum + field.confidence,
            0,
          ) / mockExtractedFields.length,
        ),
        processing_time: 150, // 2.5 minutes
        completed_at: new Date().toISOString(),
      })
      .eq('id', analysisId);

    console.log(`Analysis ${analysisId} completed successfully`);
  } catch (error) {
    console.error(`Analysis ${analysisId} failed:`, error);

    // Mark as failed
    await supabase
      .from('pdf_analyses')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', analysisId);
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
