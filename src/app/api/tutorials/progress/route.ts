import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Progress update request schema
const progressUpdateSchema = z.object({
  tutorialType: z.enum(['onboarding', 'feature-discovery', 'advanced']),
  stepId: z.string(),
  action: z.enum(['complete', 'skip', 'start', 'pause', 'resume']),
  currentStep: z.number().min(1),
  data: z.record(z.any()).optional(),
  timeSpent: z.number().optional(),
});

// Progress query schema
const progressQuerySchema = z.object({
  tutorialType: z
    .enum(['onboarding', 'feature-discovery', 'advanced'])
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedData = progressUpdateSchema.parse(body);

    const supabase = await createClient();

    // Get current tutorial progress
    const { data: currentProgress, error: fetchError } = await supabase
      .from('tutorial_progress')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('tutorial_type', validatedData.tutorialType)
      .single();

    if (fetchError || !currentProgress) {
      return NextResponse.json(
        { error: 'Tutorial session not found' },
        { status: 404 },
      );
    }

    // Update progress based on action
    const updatedProgress = { ...currentProgress };

    switch (validatedData.action) {
      case 'complete':
        updatedProgress.completed_steps = [
          ...new Set([
            ...currentProgress.completed_steps,
            validatedData.stepId,
          ]),
        ];
        updatedProgress.current_step = Math.min(
          validatedData.currentStep + 1,
          currentProgress.steps.length,
        );
        break;

      case 'skip':
        updatedProgress.skipped_steps = [
          ...new Set([...currentProgress.skipped_steps, validatedData.stepId]),
        ];
        updatedProgress.current_step = Math.min(
          validatedData.currentStep + 1,
          currentProgress.steps.length,
        );
        break;

      case 'start':
        updatedProgress.current_step = validatedData.currentStep;
        updatedProgress.status = 'active';
        break;

      case 'pause':
        updatedProgress.status = 'paused';
        updatedProgress.paused_at = new Date().toISOString();
        break;

      case 'resume':
        updatedProgress.status = 'active';
        updatedProgress.paused_at = null;
        break;
    }

    // Check if tutorial is completed
    const totalSteps = currentProgress.steps.length;
    const completedCount = updatedProgress.completed_steps.length;
    const skippedCount = updatedProgress.skipped_steps.length;

    if (completedCount + skippedCount >= totalSteps) {
      updatedProgress.status = 'completed';
      updatedProgress.completed_at = new Date().toISOString();
    }

    updatedProgress.last_activity = new Date().toISOString();

    // Update progress in database
    const { data, error } = await supabase
      .from('tutorial_progress')
      .update(updatedProgress)
      .eq('id', currentProgress.id)
      .select()
      .single();

    if (error) {
      console.error('Progress update error:', error);
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 },
      );
    }

    // Track analytics event
    await supabase.from('tutorial_analytics').insert({
      user_id: session.user.id,
      tutorial_type: validatedData.tutorialType,
      event_type: validatedData.action,
      step_id: validatedData.stepId,
      timestamp: new Date().toISOString(),
      data: validatedData.data,
      time_spent: validatedData.timeSpent,
    });

    // Calculate progress percentage
    const progressPercentage = Math.round(
      ((completedCount + skippedCount) / totalSteps) * 100,
    );

    return NextResponse.json({
      success: true,
      progress: {
        currentStep: data.current_step,
        totalSteps: totalSteps,
        completedSteps: data.completed_steps,
        skippedSteps: data.skipped_steps,
        status: data.status,
        progressPercentage,
        isCompleted: data.status === 'completed',
        lastActivity: data.last_activity,
      },
    });
  } catch (error) {
    console.error('Tutorial progress error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const tutorialType = searchParams.get('tutorialType');

    const supabase = await createClient();

    let query = supabase
      .from('tutorial_progress')
      .select('*')
      .eq('user_id', session.user.id);

    if (tutorialType) {
      query = query.eq('tutorial_type', tutorialType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Progress fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 },
      );
    }

    const tutorials = data.map((progress) => {
      const totalSteps = progress.steps.length;
      const completedCount = progress.completed_steps.length;
      const skippedCount = progress.skipped_steps.length;
      const progressPercentage = Math.round(
        ((completedCount + skippedCount) / totalSteps) * 100,
      );

      return {
        type: progress.tutorial_type,
        currentStep: progress.current_step,
        totalSteps,
        completedSteps: progress.completed_steps,
        skippedSteps: progress.skipped_steps,
        status: progress.status,
        progressPercentage,
        isCompleted: progress.status === 'completed',
        startedAt: progress.started_at,
        lastActivity: progress.last_activity,
        canResume:
          progress.status === 'paused' ||
          (progress.status === 'active' && progress.current_step > 1),
      };
    });

    return NextResponse.json({
      success: true,
      tutorials,
    });
  } catch (error) {
    console.error('Tutorial progress fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
