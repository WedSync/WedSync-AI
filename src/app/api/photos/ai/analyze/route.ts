/**
 * WS-127: AI Photo Analysis API Endpoint
 * Analyzes photos using AI for categorization, quality assessment, and enhancement suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { photoAIService } from '@/lib/ml/photo-ai-service';
import { z } from 'zod';

const analyzeSchema = z.object({
  photo_id: z.string(),
  analysis_types: z
    .array(
      z.enum([
        'categorization',
        'enhancement',
        'face_detection',
        'smart_tagging',
      ]),
    )
    .optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});

const batchAnalyzeSchema = z.object({
  photo_ids: z.array(z.string()).max(10), // Limit batch size
  analysis_types: z
    .array(
      z.enum([
        'categorization',
        'enhancement',
        'face_detection',
        'smart_tagging',
      ]),
    )
    .optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Determine if this is a batch request
    const isBatch = Array.isArray(body.photo_ids);

    if (isBatch) {
      // Batch analysis
      const { photo_ids, analysis_types, priority } =
        batchAnalyzeSchema.parse(body);

      // Check if photos exist and user has access
      const { data: photos, error: photoError } = await supabase
        .from('photos')
        .select('id, uploaded_by, organization_id')
        .in('id', photo_ids);

      if (photoError) {
        return NextResponse.json(
          { error: 'Failed to fetch photos' },
          { status: 500 },
        );
      }

      if (photos.length !== photo_ids.length) {
        return NextResponse.json(
          { error: 'Some photos not found' },
          { status: 404 },
        );
      }

      // Check permissions (simplified - in production would check organization access)
      const hasAccess = photos.every(
        (photo) => photo.uploaded_by === user.id || photo.organization_id,
      );

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to some photos' },
          { status: 403 },
        );
      }

      // Perform batch analysis
      const analyses = await photoAIService.batchAnalyzePhotos(photo_ids);

      // Store analyses in database
      const analysisRecords = analyses.map((analysis) => ({
        id: analysis.id,
        photo_id: analysis.photo_id,
        analysis_data: analysis,
        model_version: analysis.model_version,
        confidence_score: analysis.confidence_score,
        created_by: user.id,
      }));

      const { error: insertError } = await supabase
        .from('photo_ai_analyses')
        .insert(analysisRecords);

      if (insertError) {
        console.error('Failed to store AI analyses:', insertError);
        // Continue anyway - analyses are still returned
      }

      return NextResponse.json({
        success: true,
        analyses: analyses.map((analysis) => ({
          id: analysis.id,
          photo_id: analysis.photo_id,
          primary_category: analysis.primary_category,
          confidence: analysis.confidence_score,
          quality_score: analysis.quality_score,
          categories: analysis.categories,
          enhancement_suggestions: analysis.enhancement_suggestions,
          faces_detected: analysis.faces_detected.length,
          ai_tags: analysis.ai_generated_tags,
          emotion_analysis: analysis.emotion_analysis,
          processing_time_ms: analysis.processing_time_ms,
          created_at: analysis.created_at,
        })),
        batch_processing_time_ms: analyses.reduce(
          (sum, a) => sum + a.processing_time_ms,
          0,
        ),
      });
    } else {
      // Single photo analysis
      const { photo_id, analysis_types, priority } = analyzeSchema.parse(body);

      // Check if photo exists and user has access
      const { data: photo, error: photoError } = await supabase
        .from('photos')
        .select('id, uploaded_by, organization_id')
        .eq('id', photo_id)
        .single();

      if (photoError || !photo) {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
      }

      // Check permissions
      if (photo.uploaded_by !== user.id && !photo.organization_id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Check if analysis already exists (optional caching)
      const { data: existingAnalysis } = await supabase
        .from('photo_ai_analyses')
        .select('*')
        .eq('photo_id', photo_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // If recent analysis exists and priority is not high, return cached result
      if (existingAnalysis && priority !== 'high') {
        const analysisAge =
          Date.now() - new Date(existingAnalysis.created_at).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (analysisAge < maxAge) {
          return NextResponse.json({
            success: true,
            analysis: existingAnalysis.analysis_data,
            cached: true,
            cache_age_hours: Math.floor(analysisAge / (60 * 60 * 1000)),
          });
        }
      }

      // Perform analysis
      const analysis = await photoAIService.analyzePhoto(photo_id);

      // Store analysis in database
      const { error: insertError } = await supabase
        .from('photo_ai_analyses')
        .insert({
          id: analysis.id,
          photo_id: analysis.photo_id,
          analysis_data: analysis,
          model_version: analysis.model_version,
          confidence_score: analysis.confidence_score,
          created_by: user.id,
        });

      if (insertError) {
        console.error('Failed to store AI analysis:', insertError);
        // Continue anyway - analysis is still returned
      }

      return NextResponse.json({
        success: true,
        analysis: {
          id: analysis.id,
          photo_id: analysis.photo_id,
          primary_category: analysis.primary_category,
          confidence: analysis.confidence_score,
          quality_score: analysis.quality_score,
          categories: analysis.categories,
          enhancement_suggestions: analysis.enhancement_suggestions,
          faces_detected: analysis.faces_detected.length,
          people_identified: analysis.people_identified,
          ai_tags: analysis.ai_generated_tags,
          emotion_analysis: analysis.emotion_analysis,
          scene_analysis: analysis.scene_analysis,
          processing_time_ms: analysis.processing_time_ms,
          created_at: analysis.created_at,
        },
        cached: false,
      });
    }
  } catch (error) {
    console.error('AI analysis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'AI analysis failed', message: error.message },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photo_id');
    const includeDetails = searchParams.get('include_details') === 'true';

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID is required' },
        { status: 400 },
      );
    }

    // Check if photo exists and user has access
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, uploaded_by, organization_id')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Check permissions
    if (photo.uploaded_by !== user.id && !photo.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get AI analyses for this photo
    const { data: analyses, error: analysisError } = await supabase
      .from('photo_ai_analyses')
      .select('*')
      .eq('photo_id', photoId)
      .order('created_at', { ascending: false });

    if (analysisError) {
      return NextResponse.json(
        { error: 'Failed to fetch analyses' },
        { status: 500 },
      );
    }

    if (analyses.length === 0) {
      return NextResponse.json({
        success: true,
        photo_id: photoId,
        analyses: [],
        message:
          'No AI analyses found for this photo. Use POST /api/photos/ai/analyze to create one.',
      });
    }

    const formattedAnalyses = analyses.map((analysis) => ({
      id: analysis.id,
      created_at: analysis.created_at,
      model_version: analysis.model_version,
      confidence_score: analysis.confidence_score,
      ...(includeDetails ? { full_analysis: analysis.analysis_data } : {}),
      summary: {
        primary_category: analysis.analysis_data.primary_category,
        quality_score: analysis.analysis_data.quality_score,
        enhancement_suggestions_count:
          analysis.analysis_data.enhancement_suggestions?.length || 0,
        faces_detected: analysis.analysis_data.faces_detected?.length || 0,
        ai_tags_count: analysis.analysis_data.ai_generated_tags?.length || 0,
        overall_mood: analysis.analysis_data.emotion_analysis?.overall_mood,
      },
    }));

    return NextResponse.json({
      success: true,
      photo_id: photoId,
      analyses: formattedAnalyses,
      latest_analysis: formattedAnalyses[0] || null,
    });
  } catch (error) {
    console.error('Fetch AI analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI analyses' },
      { status: 500 },
    );
  }
}
