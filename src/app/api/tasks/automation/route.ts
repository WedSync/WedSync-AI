import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TaskAutomationService } from '@/lib/services/task-automation-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const { action, weddingId, data } = await request.json();

    if (!weddingId) {
      return NextResponse.json(
        { error: 'Wedding ID is required' },
        { status: 400 },
      );
    }

    const automationService = new TaskAutomationService();

    switch (action) {
      case 'assign_tasks':
        const { taskIds } = data;
        if (!taskIds || !Array.isArray(taskIds)) {
          return NextResponse.json(
            { error: 'Task IDs array is required' },
            { status: 400 },
          );
        }

        const assignments = await automationService.assignTasksAutomatically(
          weddingId,
          taskIds,
        );
        return NextResponse.json({
          success: true,
          assignments,
          message: `Successfully assigned ${assignments.length} tasks`,
        });

      case 'process_trigger':
        const { triggerType, triggerData } = data;
        if (!triggerType || !triggerData) {
          return NextResponse.json(
            { error: 'Trigger type and data are required' },
            { status: 400 },
          );
        }

        await automationService.processAutomationTriggers(
          weddingId,
          triggerType,
          triggerData,
        );
        return NextResponse.json({
          success: true,
          message: `Processed ${triggerType} trigger`,
        });

      case 'handle_rsvp_threshold':
        const { newCount, previousCount } = data;
        if (typeof newCount !== 'number' || typeof previousCount !== 'number') {
          return NextResponse.json(
            { error: 'RSVP counts must be numbers' },
            { status: 400 },
          );
        }

        await automationService.handleRSVPThreshold(
          weddingId,
          newCount,
          previousCount,
        );
        return NextResponse.json({
          success: true,
          message: 'RSVP threshold processing completed',
        });

      case 'get_analytics':
        const analytics =
          await automationService.getAssignmentAnalytics(weddingId);
        return NextResponse.json({
          success: true,
          analytics,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Task automation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get('weddingId');
    const action = searchParams.get('action');

    if (!weddingId) {
      return NextResponse.json(
        { error: 'Wedding ID is required' },
        { status: 400 },
      );
    }

    const automationService = new TaskAutomationService();

    switch (action) {
      case 'analytics':
        const analytics =
          await automationService.getAssignmentAnalytics(weddingId);
        return NextResponse.json({
          success: true,
          analytics,
        });

      case 'templates':
        const guestCount = parseInt(searchParams.get('guestCount') || '0');
        const templates =
          TaskAutomationService.getTemplatesByGuestCount(guestCount);
        return NextResponse.json({
          success: true,
          templates,
        });

      case 'available_templates':
        const allTemplates = TaskAutomationService.getAvailableTemplates();
        return NextResponse.json({
          success: true,
          templates: allTemplates,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Task automation GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
