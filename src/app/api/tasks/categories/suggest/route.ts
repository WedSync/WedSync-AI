/**
 * WS-158: AI Category Suggestion API Endpoint
 * Provides intelligent category recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { categorySuggestionEngine } from '@/lib/ai/task-categorization/categorySuggestionEngine';

// Input validation schema
const SuggestCategoryRequestSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  timeSlot: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  helperSkills: z.array(z.string()).optional(),
});

// Initialize Supabase client
function getSupabaseClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );
}

/**
 * POST /api/tasks/categories/suggest
 * Get AI-powered category suggestion for a task
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient(req);

    // Validate request body
    const body = await req.json();
    const validated = SuggestCategoryRequestSchema.parse(body);

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get AI suggestion
    const startTime = Date.now();
    const suggestion = await categorySuggestionEngine.suggestCategory({
      id: validated.taskId,
      title: validated.title,
      description: validated.description,
      timeSlot: validated.timeSlot,
      dependencies: validated.dependencies,
      helperSkills: validated.helperSkills,
    });

    const processingTime = Date.now() - startTime;

    // Check if processing was fast enough
    if (processingTime > 500) {
      console.warn(
        `Category suggestion took ${processingTime}ms, target is 500ms`,
      );
    }

    // Store suggestion for ML training
    await supabase.from('ai_category_predictions').insert({
      task_id: validated.taskId,
      predicted_category: suggestion.suggestedCategory,
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
      alternative_categories: suggestion.alternativeCategories,
      contextual_factors: suggestion.contextualFactors,
      processing_time_ms: processingTime,
      user_id: user.id,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      suggestion,
      processingTime,
    });
  } catch (error) {
    console.error('Category suggestion error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/tasks/categories/suggest
 * Provide feedback on AI suggestion for training
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = getSupabaseClient(req);

    const body = await req.json();
    const { taskId, actualCategory, feedback } = body;

    if (!taskId || !actualCategory) {
      return NextResponse.json(
        { error: 'Task ID and actual category required' },
        { status: 400 },
      );
    }

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update the prediction with actual category
    const { error: updateError } = await supabase
      .from('ai_category_predictions')
      .update({
        actual_category: actualCategory,
        feedback,
        feedback_user_id: user.id,
        feedback_at: new Date().toISOString(),
      })
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded for ML training',
    });
  } catch (error) {
    console.error('Feedback recording error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
