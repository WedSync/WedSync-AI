import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { DeploymentIntegrationService } from '@/lib/services/deployment/DeploymentIntegrationService';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { z } from 'zod';

// Rate limiting: 20 requests per minute for validation checks
const validateLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Too many validation requests',
});

const ValidationRequestSchema = z.object({
  environment_id: z.string().uuid(),
  deployment_target_types: z
    .array(z.enum(['github_actions', 'vercel', 'docker', 'kubernetes']))
    .optional(),
  check_dependencies: z.boolean().default(true),
  check_wedding_day_compliance: z.boolean().default(true),
  detailed_analysis: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await validateLimiter(request);
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

    const body = await request.json();
    const validatedRequest = ValidationRequestSchema.parse(body);

    const deploymentService = new DeploymentIntegrationService();
    const supabase = createClient();

    // Get environment details
    const { data: environment } = await supabase
      .from('environments')
      .select('*')
      .eq('id', validatedRequest.environment_id)
      .eq('organization_id', organizationId)
      .single();

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 },
      );
    }

    // Core deployment readiness validation
    const deploymentValidation =
      await deploymentService.validateDeploymentReadiness(
        organizationId,
        validatedRequest.environment_id,
      );

    // Additional validations
    const validationResults = {
      basic_validation: deploymentValidation,
      security_validation: await performSecurityValidation(
        supabase,
        organizationId,
        validatedRequest.environment_id,
      ),
      dependency_validation: validatedRequest.check_dependencies
        ? await performDependencyValidation(
            supabase,
            organizationId,
            validatedRequest.environment_id,
          )
        : null,
      target_compatibility: validatedRequest.deployment_target_types
        ? await performTargetCompatibilityValidation(
            supabase,
            organizationId,
            validatedRequest.environment_id,
            validatedRequest.deployment_target_types,
          )
        : null,
      wedding_day_compliance: validatedRequest.check_wedding_day_compliance
        ? await performWeddingDayComplianceCheck(
            supabase,
            organizationId,
            environment,
          )
        : null,
      performance_validation: await performPerformanceValidation(
        supabase,
        organizationId,
        validatedRequest.environment_id,
      ),
      detailed_analysis: validatedRequest.detailed_analysis
        ? await performDetailedAnalysis(
            supabase,
            organizationId,
            validatedRequest.environment_id,
          )
        : null,
    };

    // Calculate overall deployment score (0-100)
    const deploymentScore = calculateDeploymentScore(validationResults);

    // Determine deployment recommendation
    const deploymentRecommendation = generateDeploymentRecommendation(
      deploymentScore,
      validationResults,
      environment,
    );

    // Check if it's wedding day
    const isWeddingDay = new Date().getDay() === 6;
    const weddingDayOverride =
      isWeddingDay && environment.name.toLowerCase().includes('prod');

    const response = {
      environment: {
        id: validatedRequest.environment_id,
        name: environment.name,
        type: environment.environment_type,
      },
      validation_results: validationResults,
      deployment_score: deploymentScore,
      deployment_recommendation: deploymentRecommendation,
      wedding_day: {
        is_wedding_day: isWeddingDay,
        production_deployment: weddingDayOverride,
        restrictions_active: weddingDayOverride,
        emergency_only: weddingDayOverride,
      },
      summary: {
        ready_to_deploy:
          deploymentValidation.deployment_readiness && deploymentScore >= 80,
        critical_issues: getCriticalIssues(validationResults),
        warnings: getWarnings(validationResults),
        blocking_issues: getBlockingIssues(validationResults),
      },
      next_steps: generateNextSteps(
        validationResults,
        deploymentScore,
        isWeddingDay,
      ),
      validation_timestamp: new Date().toISOString(),
    };

    // Log validation event
    await logValidationEvent(supabase, organizationId, {
      environmentId: validatedRequest.environment_id,
      deploymentScore,
      readyToDeploy: response.summary.ready_to_deploy,
      criticalIssues: response.summary.critical_issues.length,
      warnings: response.summary.warnings.length,
      weddingDay: isWeddingDay,
    });

    const httpStatus = response.summary.ready_to_deploy
      ? 200
      : response.summary.critical_issues.length > 0
        ? 400
        : 206; // Partial content (warnings but deployable)

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'X-Deployment-Score': deploymentScore.toString(),
        'X-Ready-To-Deploy': response.summary.ready_to_deploy.toString(),
        'X-Wedding-Day': isWeddingDay.toString(),
        'X-Critical-Issues': response.summary.critical_issues.length.toString(),
      },
    });
  } catch (error) {
    console.error('Deployment validation failed:', error);
    return NextResponse.json(
      {
        error: 'Deployment validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Security validation
async function performSecurityValidation(
  supabase: any,
  organizationId: string,
  environmentId: string,
): Promise<any> {
  try {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for unencrypted sensitive variables
    const { data: unencryptedSecrets } = await supabase
      .from('environment_variables')
      .select(
        `
        *,
        environment_values!inner(is_encrypted, value)
      `,
      )
      .eq('organization_id', organizationId)
      .eq('environment_values.environment_id', environmentId)
      .gte('classification_level', 8) // CONFIDENTIAL and above
      .eq('environment_values.is_encrypted', false);

    if (unencryptedSecrets && unencryptedSecrets.length > 0) {
      issues.push(
        `${unencryptedSecrets.length} high-security variables are not encrypted`,
      );
    }

    // Check for variables with weak validation patterns
    const { data: weakValidation } = await supabase
      .from('environment_variables')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('classification_level', 5)
      .is('validation_pattern', null);

    if (weakValidation && weakValidation.length > 0) {
      warnings.push(
        `${weakValidation.length} variables lack validation patterns`,
      );
    }

    // Check for recent security violations
    const { data: recentViolations } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('event_type', 'security_violation')
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      );

    if (recentViolations && recentViolations.length > 0) {
      issues.push(
        `${recentViolations.length} security violations in the last 24 hours`,
      );
    }

    return {
      passed: issues.length === 0,
      issues,
      warnings,
      unencrypted_secrets_count: unencryptedSecrets?.length || 0,
      recent_violations_count: recentViolations?.length || 0,
    };
  } catch (error) {
    return {
      passed: false,
      issues: ['Security validation failed'],
      warnings: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Dependency validation
async function performDependencyValidation(
  supabase: any,
  organizationId: string,
  environmentId: string,
): Promise<any> {
  try {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for circular dependencies between environments
    const dependencies = await checkCircularDependencies(
      supabase,
      organizationId,
      environmentId,
    );
    if (dependencies.hasCircular) {
      issues.push('Circular dependency detected between environments');
    }

    // Check for missing dependent variables
    const { data: dependencies_check } = await supabase
      .from('variable_dependencies')
      .select(
        `
        *,
        environment_variables!variable_dependencies_depends_on_fkey(*)
      `,
      )
      .eq('organization_id', organizationId)
      .eq('environment_id', environmentId);

    for (const dep of dependencies_check || []) {
      if (!dep.environment_variables) {
        issues.push(`Missing dependent variable: ${dep.depends_on}`);
      }
    }

    return {
      passed: issues.length === 0,
      issues,
      warnings,
      circular_dependencies: dependencies.hasCircular,
      missing_dependencies: issues.filter((i) => i.includes('Missing')).length,
    };
  } catch (error) {
    return {
      passed: false,
      issues: ['Dependency validation failed'],
      warnings: [],
    };
  }
}

// Target compatibility validation
async function performTargetCompatibilityValidation(
  supabase: any,
  organizationId: string,
  environmentId: string,
  targetTypes: string[],
): Promise<any> {
  try {
    const compatibility: Record<string, any> = {};

    for (const targetType of targetTypes) {
      const { data: variables } = await supabase
        .from('environment_variables')
        .select('*')
        .eq('organization_id', organizationId);

      const compatibleVars =
        variables?.filter((v) => {
          const maxLevels = {
            github_actions: 7,
            vercel: 7,
            docker: 7,
            kubernetes: 8,
          };
          return (
            v.classification_level <=
            maxLevels[targetType as keyof typeof maxLevels]
          );
        }) || [];

      const incompatibleVars = (variables?.length || 0) - compatibleVars.length;

      compatibility[targetType] = {
        compatible: incompatibleVars === 0,
        compatible_variables: compatibleVars.length,
        incompatible_variables: incompatibleVars,
        compatibility_score:
          (compatibleVars.length / (variables?.length || 1)) * 100,
      };
    }

    return {
      overall_compatible: Object.values(compatibility).every(
        (c: any) => c.compatible,
      ),
      target_compatibility: compatibility,
    };
  } catch (error) {
    return {
      overall_compatible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Wedding day compliance check
async function performWeddingDayComplianceCheck(
  supabase: any,
  organizationId: string,
  environment: any,
): Promise<any> {
  try {
    const isWeddingDay = new Date().getDay() === 6;
    const isProduction = environment.name.toLowerCase().includes('prod');

    if (!isWeddingDay) {
      return {
        compliant: true,
        wedding_day_active: false,
        message: 'No wedding day restrictions active',
      };
    }

    const issues: string[] = [];
    const requirements: string[] = [];

    if (isProduction) {
      requirements.push(
        'Production deployments require force=true on Saturdays',
      );
      requirements.push('Emergency contacts must be available');
      requirements.push('Rollback plan must be prepared');
      requirements.push('Extra monitoring will be activated');
    }

    // Check emergency contacts
    const { data: emergencyContacts } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (
      isProduction &&
      (!emergencyContacts || emergencyContacts.length === 0)
    ) {
      issues.push(
        'No emergency contacts configured for wedding day deployments',
      );
    }

    // Check for active weddings today
    const today = new Date().toISOString().split('T')[0];
    const { data: weddings } = await supabase
      .from('weddings')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('wedding_date', today)
      .lt(
        'wedding_date',
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      );

    return {
      compliant: issues.length === 0,
      wedding_day_active: isWeddingDay,
      production_environment: isProduction,
      active_weddings_today: weddings?.length || 0,
      emergency_contacts_configured: (emergencyContacts?.length || 0) > 0,
      issues,
      requirements,
      extra_precautions_required: isProduction,
    };
  } catch (error) {
    return {
      compliant: false,
      wedding_day_active: new Date().getDay() === 6,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Performance validation
async function performPerformanceValidation(
  supabase: any,
  organizationId: string,
  environmentId: string,
): Promise<any> {
  try {
    const warnings: string[] = [];

    // Check for large variable counts that might impact sync performance
    const { count: variableCount } = await supabase
      .from('environment_variables')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId);

    if ((variableCount || 0) > 100) {
      warnings.push(
        `High variable count (${variableCount}) may impact sync performance`,
      );
    }

    // Check for recent sync performance issues
    const { data: recentSyncs } = await supabase
      .from('sync_results')
      .select('sync_duration_ms')
      .eq('organization_id', organizationId)
      .eq('environment_id', environmentId)
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      );

    const avgSyncTime =
      recentSyncs?.length > 0
        ? recentSyncs.reduce(
            (sum, sync) => sum + (sync.sync_duration_ms || 0),
            0,
          ) / recentSyncs.length
        : 0;

    if (avgSyncTime > 30000) {
      // 30 seconds
      warnings.push(
        `Average sync time is high: ${Math.round(avgSyncTime / 1000)}s`,
      );
    }

    return {
      performance_acceptable: warnings.length === 0,
      variable_count: variableCount || 0,
      average_sync_time_ms: Math.round(avgSyncTime),
      warnings,
    };
  } catch (error) {
    return {
      performance_acceptable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Detailed analysis
async function performDetailedAnalysis(
  supabase: any,
  organizationId: string,
  environmentId: string,
): Promise<any> {
  try {
    const { data: variables } = await supabase
      .from('environment_variables')
      .select(
        `
        *,
        environment_values!inner(*)
      `,
      )
      .eq('organization_id', organizationId)
      .eq('environment_values.environment_id', environmentId);

    const analysis = {
      total_variables: variables?.length || 0,
      by_classification: {},
      by_type: {},
      encryption_status: {
        encrypted: 0,
        unencrypted: 0,
      },
      validation_coverage: 0,
      last_updated_distribution: {},
    };

    variables?.forEach((variable) => {
      // Classification distribution
      const classLevel = `Level_${variable.classification_level}`;
      analysis.by_classification = {
        ...analysis.by_classification,
        [classLevel]:
          ((analysis.by_classification as any)[classLevel] || 0) + 1,
      };

      // Type distribution
      const varType = variable.variable_type || 'unknown';
      analysis.by_type = {
        ...analysis.by_type,
        [varType]: ((analysis.by_type as any)[varType] || 0) + 1,
      };

      // Encryption status
      if (variable.environment_values[0]?.is_encrypted) {
        analysis.encryption_status.encrypted++;
      } else {
        analysis.encryption_status.unencrypted++;
      }
    });

    analysis.validation_coverage =
      variables?.filter((v) => v.validation_pattern).length || 0;

    return analysis;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper functions
function calculateDeploymentScore(validationResults: any): number {
  let score = 100;

  // Basic validation issues
  if (!validationResults.basic_validation.deployment_readiness) {
    score -= 30;
  }
  score -= validationResults.basic_validation.missing_required.length * 10;
  score -= validationResults.basic_validation.invalid_values.length * 5;

  // Security issues
  if (
    validationResults.security_validation &&
    !validationResults.security_validation.passed
  ) {
    score -= 20;
  }
  score -=
    (validationResults.security_validation?.unencrypted_secrets_count || 0) * 5;

  // Wedding day compliance
  if (
    validationResults.wedding_day_compliance &&
    !validationResults.wedding_day_compliance.compliant
  ) {
    score -= 15;
  }

  // Performance warnings
  score -=
    (validationResults.performance_validation?.warnings?.length || 0) * 3;

  return Math.max(0, Math.min(100, score));
}

function generateDeploymentRecommendation(
  score: number,
  validationResults: any,
  environment: any,
): any {
  if (score >= 90) {
    return {
      action: 'PROCEED',
      confidence: 'HIGH',
      message: 'Environment is fully ready for deployment',
    };
  } else if (score >= 80) {
    return {
      action: 'PROCEED_WITH_CAUTION',
      confidence: 'MEDIUM',
      message: 'Environment is ready with minor warnings',
    };
  } else if (score >= 60) {
    return {
      action: 'FIX_WARNINGS_FIRST',
      confidence: 'LOW',
      message: 'Address validation warnings before deployment',
    };
  } else {
    return {
      action: 'DO_NOT_DEPLOY',
      confidence: 'CRITICAL',
      message: 'Critical issues must be resolved before deployment',
    };
  }
}

function getCriticalIssues(validationResults: any): string[] {
  const issues: string[] = [];

  if (!validationResults.basic_validation.deployment_readiness) {
    issues.push('Basic deployment readiness check failed');
  }

  if (
    validationResults.security_validation &&
    !validationResults.security_validation.passed
  ) {
    issues.push('Security validation failed');
  }

  validationResults.basic_validation.missing_required?.forEach(
    (missing: string) => {
      issues.push(`Missing required variable: ${missing}`);
    },
  );

  return issues;
}

function getWarnings(validationResults: any): string[] {
  const warnings: string[] = [];

  validationResults.basic_validation.security_warnings?.forEach(
    (warning: any) => {
      warnings.push(warning.warning);
    },
  );

  validationResults.security_validation?.warnings?.forEach(
    (warning: string) => {
      warnings.push(warning);
    },
  );

  validationResults.performance_validation?.warnings?.forEach(
    (warning: string) => {
      warnings.push(warning);
    },
  );

  return warnings;
}

function getBlockingIssues(validationResults: any): string[] {
  const blocking: string[] = [];

  validationResults.basic_validation.invalid_values?.forEach((invalid: any) => {
    blocking.push(`Invalid value for variable: ${invalid.variable_id}`);
  });

  if (
    validationResults.dependency_validation &&
    !validationResults.dependency_validation.passed
  ) {
    blocking.push('Dependency validation failed');
  }

  return blocking;
}

function generateNextSteps(
  validationResults: any,
  score: number,
  isWeddingDay: boolean,
): string[] {
  const steps: string[] = [];

  if (score < 80) {
    steps.push('1. Fix critical validation issues');
    steps.push('2. Re-run validation to confirm fixes');
  }

  if (validationResults.basic_validation.missing_required?.length > 0) {
    steps.push('3. Add missing required variables');
  }

  if (
    validationResults.security_validation &&
    !validationResults.security_validation.passed
  ) {
    steps.push('4. Address security violations');
  }

  if (isWeddingDay) {
    steps.push('5. Ensure emergency contacts are available');
    steps.push('6. Use force=true flag for Saturday deployments');
  }

  if (steps.length === 0) {
    steps.push('✅ Environment is ready for deployment');
  }

  return steps;
}

async function checkCircularDependencies(
  supabase: any,
  organizationId: string,
  environmentId: string,
): Promise<{ hasCircular: boolean }> {
  // Simplified circular dependency check
  // In production, would implement proper graph traversal
  return { hasCircular: false };
}

async function logValidationEvent(
  supabase: any,
  organizationId: string,
  event: any,
): Promise<void> {
  try {
    await supabase.from('deployment_validation_logs').insert({
      organization_id: organizationId,
      environment_id: event.environmentId,
      deployment_score: event.deploymentScore,
      ready_to_deploy: event.readyToDeploy,
      critical_issues_count: event.criticalIssues,
      warnings_count: event.warnings,
      wedding_day_validation: event.weddingDay,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log validation event:', error);
  }
}
