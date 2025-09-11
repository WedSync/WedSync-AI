/**
 * WS-340: Scaling Actions API Endpoint
 * Team B - Backend/API Development
 *
 * POST /api/scalability/actions/scale
 * Execute manual or automatic scaling actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { IntelligentAutoScalingEngine } from '@/lib/scalability/backend/intelligent-auto-scaling-engine';
import { RealTimePerformanceMonitor } from '@/lib/scalability/backend/real-time-performance-monitor';
import { z } from 'zod';

// Initialize scalability services
const scalabilityEngine = new IntelligentAutoScalingEngine();
const performanceMonitor = new RealTimePerformanceMonitor();

// Validation schema for scaling actions
const ManualScalingActionSchema = z.object({
  service: z.string().min(1, 'Service name is required'),
  targetInstances: z
    .number()
    .int()
    .min(1, 'Target instances must be at least 1'),
  reason: z.string().min(1, 'Reason is required'),
  urgency: z
    .enum(['low', 'medium', 'high', 'critical', 'emergency'])
    .optional()
    .default('medium'),
  weddingContext: z
    .object({
      isWeddingRelated: z.boolean(),
      weddingId: z.string().optional(),
      weddingDate: z.string().datetime().optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    })
    .optional(),
  forceExecution: z.boolean().optional().default(false),
  bypassCostLimits: z.boolean().optional().default(false),
});

type ManualScalingAction = z.infer<typeof ManualScalingActionSchema>;

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const requestBody = await request.json();
    const scalingAction = ManualScalingActionSchema.parse(requestBody);

    console.log(
      `[ScalabilityAPI] Scaling action requested: ${scalingAction.service} -> ${scalingAction.targetInstances} instances`,
    );

    // Validate user access and permissions
    const user = await getCurrentUser();
    await validateScalingPermissions(user.id, scalingAction);

    // Validate the scaling action
    const validation = await validateScalingAction(scalingAction, user);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid scaling action',
          details: validation.errors,
          code: 'INVALID_SCALING_ACTION',
        },
        { status: 400 },
      );
    }

    // Execute the scaling action
    const result = await executeScalingAction(scalingAction, user);

    // Log the scaling action for audit
    await logScalingAction(user.id, scalingAction, result);

    return NextResponse.json({
      success: true,
      data: {
        actionId: result.actionId,
        status: result.status,
        currentInstances: result.currentInstances,
        targetInstances: scalingAction.targetInstances,
        estimatedCompletionTime: result.estimatedCompletionTime,
        costImpact: result.costImpact,
        rollbackPlan: result.rollbackPlan,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ScalabilityAPI] Scaling action error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          details: error.errors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 },
      );
    }

    return handleAPIError(error);
  }
}

async function validateScalingAction(
  action: ManualScalingAction,
  user: any,
): Promise<{
  valid: boolean;
  errors?: string[];
}> {
  const errors: string[] = [];

  try {
    // Check service exists and is scalable
    const serviceExists = await checkServiceExists(action.service);
    if (!serviceExists) {
      errors.push(
        `Service '${action.service}' does not exist or is not scalable`,
      );
    }

    // Get current service state
    const currentState = await getCurrentServiceState(action.service);
    if (!currentState) {
      errors.push(
        `Unable to retrieve current state for service '${action.service}'`,
      );
      return { valid: false, errors };
    }

    // Validate instance count limits
    if (action.targetInstances < currentState.minInstances) {
      errors.push(
        `Target instances (${action.targetInstances}) below minimum (${currentState.minInstances})`,
      );
    }

    if (action.targetInstances > currentState.maxInstances) {
      errors.push(
        `Target instances (${action.targetInstances}) above maximum (${currentState.maxInstances})`,
      );
    }

    // Check scaling rate limits
    const scalingRate =
      Math.abs(action.targetInstances - currentState.currentInstances) /
      currentState.currentInstances;
    const maxScalingRate =
      action.targetInstances > currentState.currentInstances ? 0.5 : 0.3; // 50% up, 30% down

    if (scalingRate > maxScalingRate && !action.forceExecution) {
      errors.push(
        `Scaling rate (${(scalingRate * 100).toFixed(1)}%) exceeds maximum (${(maxScalingRate * 100).toFixed(1)}%)`,
      );
    }

    // Check wedding day protection
    const isWeddingDay = await isCurrentlyWeddingDay();
    if (
      isWeddingDay &&
      action.targetInstances < currentState.currentInstances &&
      !action.weddingContext?.isWeddingRelated
    ) {
      errors.push(
        'Scaling down non-wedding services is prohibited on wedding days',
      );
    }

    // Check cost limits (unless bypassed)
    if (!action.bypassCostLimits) {
      const costValidation = await validateCostLimits(action, currentState);
      if (!costValidation.valid) {
        errors.push(...costValidation.errors);
      }
    }

    // Check user permissions for the specific action
    const permissionValidation = await validateActionPermissions(user, action);
    if (!permissionValidation.valid) {
      errors.push(...permissionValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('[ScalabilityAPI] Validation error:', error);
    errors.push('Internal validation error occurred');
    return { valid: false, errors };
  }
}

async function validateCostLimits(
  action: ManualScalingAction,
  currentState: any,
): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Calculate cost impact
    const instanceDiff = action.targetInstances - currentState.currentInstances;
    const hourlyCost = await estimateHourlyCost(action.service, instanceDiff);
    const dailyCost = hourlyCost * 24;

    // Check against cost limits
    const costLimits = await getCostLimits();

    if (hourlyCost > costLimits.maxHourlyIncrease) {
      errors.push(
        `Hourly cost increase ($${hourlyCost.toFixed(2)}) exceeds limit ($${costLimits.maxHourlyIncrease.toFixed(2)})`,
      );
    }

    if (dailyCost > costLimits.maxDailyBudgetImpact) {
      errors.push(
        `Daily cost impact ($${dailyCost.toFixed(2)}) exceeds budget limit ($${costLimits.maxDailyBudgetImpact.toFixed(2)})`,
      );
    }

    // Check remaining monthly budget
    const remainingBudget = await getRemainingMonthlyBudget();
    const monthlyImpact = dailyCost * 30; // Rough monthly estimate

    if (monthlyImpact > remainingBudget) {
      errors.push(
        `Monthly cost impact ($${monthlyImpact.toFixed(2)}) exceeds remaining budget ($${remainingBudget.toFixed(2)})`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('[ScalabilityAPI] Cost validation error:', error);
    return {
      valid: false,
      errors: ['Unable to validate cost limits'],
    };
  }
}

async function validateActionPermissions(
  user: any,
  action: ManualScalingAction,
): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Check basic scaling permissions
  if (!user.permissions.includes('scalability_write')) {
    errors.push('User does not have permission to execute scaling actions');
  }

  // Check emergency scaling permissions
  if (
    action.urgency === 'emergency' &&
    !user.permissions.includes('emergency_scaling')
  ) {
    errors.push(
      'User does not have permission to execute emergency scaling actions',
    );
  }

  // Check cost bypass permissions
  if (
    action.bypassCostLimits &&
    !user.permissions.includes('cost_limit_bypass')
  ) {
    errors.push('User does not have permission to bypass cost limits');
  }

  // Check force execution permissions
  if (action.forceExecution && !user.permissions.includes('force_scaling')) {
    errors.push('User does not have permission to force scaling execution');
  }

  // Service-specific permissions
  const requiredServicePermission = `scaling_${action.service}`;
  if (
    !user.permissions.includes('scaling_all_services') &&
    !user.permissions.includes(requiredServicePermission)
  ) {
    errors.push(
      `User does not have permission to scale service '${action.service}'`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function executeScalingAction(action: ManualScalingAction, user: any) {
  const actionId = `scale_${action.service}_${Date.now()}`;
  const startTime = Date.now();

  try {
    console.log(`[ScalabilityAPI] Executing scaling action ${actionId}`);

    // Get current service state
    const currentState = await getCurrentServiceState(action.service);
    if (!currentState) {
      throw new Error(
        `Unable to retrieve current state for service ${action.service}`,
      );
    }

    // Create scaling decision object
    const scalingDecision = {
      decisionId: actionId,
      timestamp: new Date(),
      service: action.service,
      currentInstances: currentState.currentInstances,
      targetInstances: action.targetInstances,
      scalingReason: action.reason as any,
      weddingContext: action.weddingContext
        ? {
            weddingId: action.weddingContext.weddingId,
            weddingDate: action.weddingContext.weddingDate
              ? new Date(action.weddingContext.weddingDate)
              : new Date(),
            expectedGuests: 100, // Mock value
            vendorCount: 5, // Mock value
            weddingType: 'medium' as any,
            predictedLoad: {
              predictedLoad: 150,
              confidence: 0.8,
              timeframe: '1h',
              factors: [],
            },
            scalingPriority:
              action.weddingContext.priority || ('medium' as any),
          }
        : undefined,
      confidence: 0.9,
      estimatedCost: await estimateHourlyCost(
        action.service,
        action.targetInstances - currentState.currentInstances,
      ),
      rollbackPlan: {
        planId: `rollback_${actionId}`,
        steps: [
          {
            stepId: `rollback_step_1`,
            description: `Rollback ${action.service} to ${currentState.currentInstances} instances`,
            estimatedDuration: 300000, // 5 minutes
            dependencies: [],
          },
        ],
        estimatedDuration: 300000,
        riskAssessment: 'Low risk - returning to previous stable state',
      },
    };

    // Execute via scaling engine
    const result =
      await scalabilityEngine.executeScalingDecision(scalingDecision);

    // Calculate completion time
    const executionTime = Date.now() - startTime;
    const estimatedCompletionTime = new Date(Date.now() + 300000); // 5 minutes from now

    return {
      actionId,
      status: result.success ? 'completed' : 'failed',
      currentInstances: result.actualInstances || currentState.currentInstances,
      executionTime,
      estimatedCompletionTime,
      costImpact: scalingDecision.estimatedCost,
      errors: result.errors,
      rollbackPlan: scalingDecision.rollbackPlan,
    };
  } catch (error) {
    console.error(`[ScalabilityAPI] Scaling action ${actionId} failed:`, error);
    return {
      actionId,
      status: 'failed',
      currentInstances:
        (await getCurrentServiceState(action.service))?.currentInstances || 0,
      executionTime: Date.now() - startTime,
      estimatedCompletionTime: null,
      costImpact: 0,
      errors: [
        {
          code: 'EXECUTION_FAILED',
          message:
            error instanceof Error ? error.message : 'Unknown execution error',
          severity: 'error',
          recoverable: true,
        },
      ],
      rollbackPlan: null,
    };
  }
}

// Helper functions
async function checkServiceExists(serviceName: string): Promise<boolean> {
  const validServices = [
    'api',
    'database',
    'file-storage',
    'real-time',
    'ai-services',
  ];
  return validServices.includes(serviceName);
}

async function getCurrentServiceState(serviceName: string) {
  // Mock current service state - in production would get from infrastructure
  const serviceStates: Record<string, any> = {
    api: { currentInstances: 3, minInstances: 2, maxInstances: 20 },
    database: { currentInstances: 2, minInstances: 1, maxInstances: 5 },
    'file-storage': { currentInstances: 1, minInstances: 1, maxInstances: 10 },
    'real-time': { currentInstances: 2, minInstances: 2, maxInstances: 15 },
    'ai-services': { currentInstances: 1, minInstances: 1, maxInstances: 8 },
  };

  return serviceStates[serviceName] || null;
}

async function estimateHourlyCost(
  serviceName: string,
  instanceDiff: number,
): Promise<number> {
  const hourlyRates: Record<string, number> = {
    api: 0.2,
    database: 0.5,
    'file-storage': 0.15,
    'real-time': 0.3,
    'ai-services': 0.8,
  };

  const rate = hourlyRates[serviceName] || 0.25;
  return Math.abs(instanceDiff) * rate;
}

async function getCostLimits() {
  return {
    maxHourlyIncrease: 100, // $100/hour max increase
    maxDailyBudgetImpact: 2000, // $2000/day max impact
    maxMonthlyBudget: 50000, // $50k/month total budget
  };
}

async function getRemainingMonthlyBudget(): Promise<number> {
  // Mock remaining budget - in production would get from billing system
  return 25000; // $25k remaining
}

async function isCurrentlyWeddingDay(): Promise<boolean> {
  const dayOfWeek = new Date().getDay();
  return dayOfWeek === 6 || (dayOfWeek === 0 && Math.random() < 0.3); // Saturday or sometimes Sunday
}

async function getCurrentUser() {
  // Mock user - in production would get from auth system
  return {
    id: 'user_123',
    role: 'admin',
    permissions: [
      'scalability_read',
      'scalability_write',
      'emergency_scaling',
      'cost_limit_bypass',
      'force_scaling',
      'scaling_all_services',
    ],
  };
}

async function validateScalingPermissions(
  userId: string,
  action: ManualScalingAction,
) {
  console.log(
    `[ScalabilityAPI] Validating scaling permissions for user ${userId} on service ${action.service}`,
  );
  // Mock permission validation
}

async function logScalingAction(
  userId: string,
  action: ManualScalingAction,
  result: any,
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId,
    actionId: result.actionId,
    service: action.service,
    fromInstances:
      (await getCurrentServiceState(action.service))?.currentInstances || 0,
    toInstances: action.targetInstances,
    reason: action.reason,
    urgency: action.urgency,
    success: result.status === 'completed',
    executionTime: result.executionTime,
    costImpact: result.costImpact,
    weddingRelated: action.weddingContext?.isWeddingRelated || false,
  };

  console.log(
    '[ScalabilityAPI] Scaling action logged:',
    JSON.stringify(logEntry, null, 2),
  );

  // In production, would store in audit log database
}

function handleAPIError(error: unknown): NextResponse {
  if (error instanceof Error) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized access to scaling actions',
          code: 'UNAUTHORIZED',
        },
        { status: 401 },
      );
    }

    if (error.message.includes('Forbidden')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions for scaling action',
          code: 'FORBIDDEN',
        },
        { status: 403 },
      );
    }

    if (error.message.includes('Invalid')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'INVALID_REQUEST',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
    },
    { status: 500 },
  );
}
