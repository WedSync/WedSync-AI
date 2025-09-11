import { NextRequest, NextResponse } from 'next/server';
import { DeploymentManager } from '@/lib/services/DeploymentManager';

export async function GET(request: NextRequest) {
  const deploymentManager = new DeploymentManager();

  try {
    const healthCheck = await deploymentManager.performHealthCheck();

    // Enhanced deployment-specific health checks
    const deploymentChecks = {
      ...healthCheck.checks,
      deployment_ready: healthCheck.success,
      wedding_day_ready: await checkWeddingDayReadiness(),
      performance_acceptable: healthCheck.performance
        ? healthCheck.performance.responseTime < 2000
        : false,
    };

    const allHealthy = Object.values(deploymentChecks).every(
      (check) => check === true,
    );

    return NextResponse.json(
      {
        success: allHealthy,
        timestamp: healthCheck.timestamp,
        checks: deploymentChecks,
        performance: healthCheck.performance,
        deployment_status: allHealthy ? 'ready' : 'degraded',
        wedding_day_status: deploymentChecks.wedding_day_ready
          ? 'safe'
          : 'at_risk',
        error: healthCheck.error,
      },
      {
        status: allHealthy ? 200 : 503,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        deployment_status: 'failed',
        wedding_day_status: 'at_risk',
        error:
          error instanceof Error
            ? error.message
            : 'Deployment health check failed',
      },
      {
        status: 503,
      },
    );
  }
}

async function checkWeddingDayReadiness(): Promise<boolean> {
  try {
    // Check if it's Saturday (wedding day)
    const now = new Date();
    const isSaturday = now.getDay() === 6;

    if (isSaturday) {
      // Extra strict checks for wedding days
      const criticalEndpoints = ['/api/forms', '/api/guests', '/api/photos'];
      const checks = await Promise.all(
        criticalEndpoints.map((endpoint) =>
          fetch(
            `${process.env.VERCEL_URL || 'http://localhost:3000'}${endpoint}`,
            {
              method: 'HEAD',
              timeout: 5000,
            },
          )
            .then((res) => res.ok)
            .catch(() => false),
        ),
      );

      return checks.every((check) => check === true);
    }

    return true; // Non-Saturday days have relaxed requirements
  } catch (error) {
    console.error('Wedding day readiness check failed:', error);
    return false;
  }
}
