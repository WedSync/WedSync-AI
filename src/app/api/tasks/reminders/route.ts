import { NextRequest, NextResponse } from 'next/server';
import { TaskReminderService } from '@/lib/services/task-reminder-service';

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();
    const reminderService = new TaskReminderService();

    switch (action) {
      case 'schedule_reminders':
        const { taskId } = data;
        if (!taskId) {
          return NextResponse.json(
            { error: 'Task ID is required' },
            { status: 400 },
          );
        }

        await reminderService.scheduleTaskReminders(taskId);
        return NextResponse.json({
          success: true,
          message: 'Reminders scheduled successfully',
        });

      case 'process_due_reminders':
        const result = await reminderService.processDueReminders();
        return NextResponse.json({
          success: true,
          result,
          message: `Processed reminders: ${result.sent} sent, ${result.failed} failed`,
        });

      case 'cancel_task_reminders':
        const { taskId: cancelTaskId } = data;
        if (!cancelTaskId) {
          return NextResponse.json(
            { error: 'Task ID is required' },
            { status: 400 },
          );
        }

        await reminderService.cancelTaskReminders(cancelTaskId);
        return NextResponse.json({
          success: true,
          message: 'Task reminders cancelled',
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Reminder API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const weddingId = searchParams.get('weddingId');

    const reminderService = new TaskReminderService();

    switch (action) {
      case 'stats':
        const stats = await reminderService.getReminderStats(
          weddingId || undefined,
        );
        return NextResponse.json({
          success: true,
          stats,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Reminder GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
