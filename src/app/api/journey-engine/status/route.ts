import { NextResponse } from 'next/server';
import { journeyEngineStartup } from '@/lib/journey-engine/startup';

/**
 * Journey Engine Status API
 * GET /api/journey-engine/status
 */
export async function GET() {
  try {
    const status = await journeyEngineStartup.getSystemStatus();

    const httpStatus =
      status.initialized &&
      status.components.executor &&
      status.components.queue_processor &&
      status.components.error_recovery
        ? 200
        : 503;

    return NextResponse.json(
      {
        status: status.initialized ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        ...status,
      },
      { status: httpStatus },
    );
  } catch (error) {
    console.error('Status check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Journey Engine Control API
 * POST /api/journey-engine/status
 */
export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'initialize':
        await journeyEngineStartup.initialize();
        return NextResponse.json({
          success: true,
          message: 'Journey engine initialized',
        });

      case 'restart':
        await journeyEngineStartup.restart();
        return NextResponse.json({
          success: true,
          message: 'Journey engine restarted',
        });

      case 'shutdown':
        await journeyEngineStartup.shutdown();
        return NextResponse.json({
          success: true,
          message: 'Journey engine shutdown',
        });

      default:
        return NextResponse.json(
          {
            error: 'Invalid action. Use: initialize, restart, or shutdown',
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Control action failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
