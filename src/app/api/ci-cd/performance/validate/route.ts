import { NextRequest, NextResponse } from 'next/server';
import {
  PerformanceGate,
  PerformanceTestConfig,
  DeploymentContext,
} from '../../../../../lib/ci-cd/performance-gate';
import { GitHubActionsIntegration } from '../../../../../lib/ci-cd/github-actions-integration';
import { VercelDeploymentHook } from '../../../../../lib/ci-cd/vercel-deployment-hook';

interface ValidationRequest {
  buildId: string;
  environment: 'staging' | 'production';
  gitHash: string;
  testConfig: PerformanceTestConfig;
  deploymentContext?: DeploymentContext;
  triggerSource?: 'github_actions' | 'vercel_hook' | 'manual';
}

interface ValidationResponse {
  success: boolean;
  validationId: string;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'blocked';
  metrics?: any;
  violations?: any[];
  blockingReasons?: string[];
  estimatedCompletion?: string;
  timestamp: string;
  buildId: string;
  environment: string;
}

/**
 * POST /api/ci-cd/performance/validate
 * Triggers performance validation for CI/CD deployments
 *
 * Used by:
 * - GitHub Actions workflows
 * - Vercel deployment hooks
 * - Manual deployment validation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    console.log('🚀 Starting CI/CD performance validation');

    // 1. Parse and validate request
    const body: ValidationRequest = await request.json();

    if (!body.buildId || !body.environment || !body.testConfig) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: buildId, environment, testConfig',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    // 2. Initialize performance gate
    const performanceGate = new PerformanceGate(
      process.env.GITHUB_TOKEN,
      process.env.VERCEL_TOKEN,
      process.env.MONITORING_WEBHOOK_URL,
    );

    // 3. Execute performance validation
    console.log(`📊 Validating build ${body.buildId} for ${body.environment}`);

    const validationResult = await performanceGate.validateDeployment(
      body.buildId,
      body.environment,
      body.testConfig,
      body.deploymentContext,
    );

    // 4. Update GitHub status if triggered from GitHub Actions
    if (
      body.triggerSource === 'github_actions' &&
      body.gitHash &&
      process.env.GITHUB_TOKEN
    ) {
      try {
        const githubIntegration = new GitHubActionsIntegration(
          process.env.GITHUB_TOKEN,
          process.env.GITHUB_OWNER || 'WedSync',
          process.env.GITHUB_REPO || 'WedSync-2.0',
        );

        const status = validationResult.passed ? 'success' : 'failure';
        const description = validationResult.passed
          ? 'Performance validation passed'
          : `Performance validation failed: ${validationResult.violations.length} violations`;

        await githubIntegration.createStatusCheck(
          body.gitHash,
          status,
          description,
          validationResult.violations,
        );

        console.log('✅ GitHub status check updated');
      } catch (githubError) {
        console.error('⚠️ Failed to update GitHub status:', githubError);
        // Don't fail the entire validation due to GitHub status update failure
      }
    }

    // 5. Calculate estimated completion time
    const processingTime = Date.now() - startTime;
    const estimatedCompletion = new Date(
      Date.now() + body.testConfig.duration * 1000 + 30000, // Test duration + 30s buffer
    ).toISOString();

    // 6. Prepare response
    const response: ValidationResponse = {
      success: true,
      validationId: validationResult.validationId,
      status: validationResult.passed
        ? 'passed'
        : validationResult.blockedDeployment
          ? 'blocked'
          : 'failed',
      metrics: validationResult.metrics,
      violations: validationResult.violations,
      blockingReasons: validationResult.blockedDeployment
        ? [validationResult.recommendation]
        : undefined,
      estimatedCompletion: validationResult.passed
        ? undefined
        : estimatedCompletion,
      timestamp: new Date().toISOString(),
      buildId: body.buildId,
      environment: body.environment,
    };

    // 7. Log validation completion
    console.log(`⏱️ Performance validation completed in ${processingTime}ms`);
    console.log(
      `${validationResult.passed ? '✅' : '❌'} Result: ${response.status}`,
    );

    // 8. Return appropriate HTTP status
    const httpStatus = validationResult.passed
      ? 200
      : validationResult.blockedDeployment
        ? 422
        : 500;

    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    console.error('❌ Performance validation failed:', error);

    const errorResponse = {
      success: false,
      error: 'Performance validation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      buildId: 'unknown',
      environment: 'unknown',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/ci-cd/performance/validate
 * Returns information about the performance validation endpoint
 */
export async function GET(): Promise<NextResponse> {
  const info = {
    endpoint: '/api/ci-cd/performance/validate',
    methods: ['POST'],
    description: 'CI/CD performance validation endpoint',
    authentication: 'API key or GitHub token required',
    parameters: {
      buildId: 'string - Unique build identifier',
      environment: 'string - staging | production',
      gitHash: 'string - Git commit hash',
      testConfig: 'object - Performance test configuration',
      deploymentContext: 'object - Optional deployment context',
      triggerSource: 'string - github_actions | vercel_hook | manual',
    },
    responses: {
      200: 'Performance validation passed',
      422: 'Performance validation failed - deployment blocked',
      500: 'Performance validation error',
    },
    weddingContext: {
      purpose:
        'Prevents performance regressions from affecting wedding couples',
      criticalPeriods: 'Peak wedding season (May-Oct), weekends, evenings',
      userImpact:
        'Protects photographers, couples, and vendors from slow platform performance',
    },
    examples: {
      request: {
        buildId: 'build_123456',
        environment: 'production',
        gitHash: 'abc123def456',
        testConfig: {
          testType: 'load',
          duration: 300,
          userCount: 100,
          targetUrl: 'https://wedsync.com',
          thresholds: {
            responseTime: 2000,
            errorRate: 0.01,
            throughput: 100,
            coreWebVitals: {
              LCP: 2500,
              FID: 100,
              CLS: 0.1,
              TTFB: 800,
            },
          },
        },
        triggerSource: 'github_actions',
      },
      response: {
        success: true,
        validationId: 'val_1234567890_abc123',
        status: 'passed',
        metrics: {
          responseTime: 1850,
          errorRate: 0.005,
          throughput: 120,
          coreWebVitals: {
            LCP: 2200,
            FID: 85,
            CLS: 0.08,
            TTFB: 650,
          },
        },
        timestamp: '2025-01-20T10:30:00Z',
        buildId: 'build_123456',
        environment: 'production',
      },
    },
  };

  return NextResponse.json(info, { status: 200 });
}

/**
 * OPTIONS /api/ci-cd/performance/validate
 * CORS preflight handling
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}
