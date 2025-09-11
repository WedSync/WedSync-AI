import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { MonitoringService } from '@/lib/services/monitoring/MonitoringService';
import { rateLimit } from '@/lib/utils/rate-limit';

const healthCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many environment health check requests',
});

export async function GET(
  request: NextRequest,
  { params }: { params: { environment: string } },
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await healthCheckLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    const headersList = await headers();
    const organizationId = headersList.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization context required' },
        { status: 401 },
      );
    }

    const { environment } = params;
    const monitoringService = new MonitoringService();

    // Get environment-specific health
    const environmentHealth = await monitoringService.checkEnvironmentHealth(
      organizationId,
      environment,
    );

    return NextResponse.json({
      environment_id: environment,
      status: environmentHealth.status,
      health_score: environmentHealth.health_score,
      deployment_readiness: environmentHealth.deployment_readiness,
      wedding_day_readiness: environmentHealth.wedding_day_readiness,
      missing_variables: environmentHealth.missing_variables,
      configuration_drift: environmentHealth.configuration_drift,
      security_violations: environmentHealth.security_violations,
      last_validation: environmentHealth.last_validation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Environment health check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check environment health' },
      { status: 500 },
    );
  }
}
