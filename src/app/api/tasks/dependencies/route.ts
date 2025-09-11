import { NextRequest, NextResponse } from 'next/server';
import { TaskDependencyService } from '@/lib/services/task-dependency-service';
import { DependencyType } from '@/types/workflow';

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();
    const dependencyService = new TaskDependencyService();

    switch (action) {
      case 'add_dependency':
        const { predecessorTaskId, successorTaskId, dependencyType, lagTime } =
          data;

        if (!predecessorTaskId || !successorTaskId) {
          return NextResponse.json(
            { error: 'Predecessor and successor task IDs are required' },
            { status: 400 },
          );
        }

        const result = await dependencyService.addDependency(
          predecessorTaskId,
          successorTaskId,
          dependencyType || DependencyType.FINISH_TO_START,
          lagTime || 0,
        );

        return NextResponse.json(result);

      case 'remove_dependency':
        const { dependencyId } = data;

        if (!dependencyId) {
          return NextResponse.json(
            { error: 'Dependency ID is required' },
            { status: 400 },
          );
        }

        const removeResult =
          await dependencyService.removeDependency(dependencyId);
        return NextResponse.json(removeResult);

      case 'validate_dependency':
        const { predecessorId, successorId, depType } = data;

        if (!predecessorId || !successorId) {
          return NextResponse.json(
            { error: 'Predecessor and successor task IDs are required' },
            { status: 400 },
          );
        }

        const validation = await dependencyService.validateDependency(
          predecessorId,
          successorId,
          depType || DependencyType.FINISH_TO_START,
        );

        return NextResponse.json({
          success: true,
          validation,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Dependency API error:', error);
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
    const taskId = searchParams.get('taskId');

    const dependencyService = new TaskDependencyService();

    switch (action) {
      case 'critical_path':
        if (!weddingId) {
          return NextResponse.json(
            { error: 'Wedding ID is required' },
            { status: 400 },
          );
        }

        const criticalPath =
          await dependencyService.calculateCriticalPath(weddingId);
        return NextResponse.json({
          success: true,
          critical_path: criticalPath,
        });

      case 'dependency_suggestions':
        if (!taskId) {
          return NextResponse.json(
            { error: 'Task ID is required' },
            { status: 400 },
          );
        }

        const suggestions =
          await dependencyService.getDependencySuggestions(taskId);
        return NextResponse.json({
          success: true,
          suggestions,
        });

      case 'dependency_report':
        if (!weddingId) {
          return NextResponse.json(
            { error: 'Wedding ID is required' },
            { status: 400 },
          );
        }

        const report =
          await dependencyService.generateDependencyReport(weddingId);
        return NextResponse.json({
          success: true,
          report,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Dependency GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
