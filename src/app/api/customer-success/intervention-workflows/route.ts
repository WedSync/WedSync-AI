/**
 * WS-168: Customer Success Dashboard - Round 2 Enhancement
 * Advanced Intervention Workflow Management API
 * Team E - Round 2 Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/ratelimit';

// Validation schemas
const createWorkflowSchema = z.object({
  organizationId: z.string().uuid(),
  supplierName: z.string().min(1).max(200),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  healthScoreBefore: z.number().min(0).max(100),
  interventionReason: z.string().min(1).max(500),
  templateIds: z.array(z.string().uuid()).min(1).max(10),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignedTo: z.string().uuid().optional(),
  scheduledStartDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

const updateWorkflowSchema = z.object({
  status: z
    .enum(['draft', 'active', 'paused', 'completed', 'cancelled'])
    .optional(),
  currentStep: z.number().min(0).optional(),
  healthScoreAfter: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
  completionReason: z.string().max(500).optional(),
});

const executeStepSchema = z.object({
  workflowId: z.string().uuid(),
  stepId: z.string().uuid(),
  action: z.enum(['start', 'complete', 'skip', 'fail']),
  notes: z.string().max(1000).optional(),
  outcome: z.enum(['positive', 'neutral', 'negative', 'mixed']).optional(),
  nextAction: z.string().max(500).optional(),
  scheduledFollowUp: z.string().datetime().optional(),
});

const querySchema = z.object({
  status: z
    .enum(['all', 'draft', 'active', 'paused', 'completed', 'cancelled'])
    .default('all'),
  priority: z.enum(['all', 'low', 'medium', 'high', 'critical']).default('all'),
  assignedTo: z.string().uuid().optional(),
  riskLevel: z
    .enum(['all', 'low', 'medium', 'high', 'critical'])
    .default('all'),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z
    .enum(['created_at', 'updated_at', 'health_score', 'priority'])
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /api/customer-success/intervention-workflows
 * Get intervention workflows with filtering and pagination
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const identifier = request.ip ?? 'anonymous';
  const { success } = await rateLimit.limit(identifier);

  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Check admin permissions
    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validatedQuery = querySchema.parse(queryParams);

    const supabase = createClient();

    // Build query with filters
    let query = supabase
      .from('intervention_workflows')
      .select(
        `
        *,
        organization:organizations!inner(name, id),
        assigned_user:user_profiles(name, email),
        steps:intervention_steps(*)
      `,
      )
      .order(validatedQuery.sortBy, {
        ascending: validatedQuery.sortOrder === 'asc',
      })
      .range(
        validatedQuery.offset,
        validatedQuery.offset + validatedQuery.limit - 1,
      );

    // Apply filters
    if (validatedQuery.status !== 'all') {
      query = query.eq('status', validatedQuery.status);
    }

    if (validatedQuery.priority !== 'all') {
      query = query.eq('priority', validatedQuery.priority);
    }

    if (validatedQuery.riskLevel !== 'all') {
      query = query.eq('risk_level', validatedQuery.riskLevel);
    }

    if (validatedQuery.assignedTo) {
      query = query.eq('assigned_to', validatedQuery.assignedTo);
    }

    // Only show workflows for user's organization unless super admin
    if (!session.user.isSuperAdmin) {
      query = query.eq('organization_id', session.user.organizationId);
    }

    const { data: workflows, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 },
      );
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('intervention_workflows')
      .select('*', { count: 'exact', head: true });

    // Calculate progress and analytics
    const workflowsWithProgress =
      workflows?.map((workflow) => {
        const completedSteps = workflow.steps.filter(
          (step: any) => step.status === 'completed',
        ).length;
        const totalSteps = workflow.steps.length;
        const progressPercentage =
          totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

        return {
          ...workflow,
          progress: {
            completed: completedSteps,
            total: totalSteps,
            percentage: progressPercentage,
          },
          estimatedCompletion: calculateEstimatedCompletion(workflow),
          healthImpactPrediction: calculateHealthImpactPrediction(workflow),
        };
      }) || [];

    // Calculate summary statistics
    const summary = {
      total: totalCount || 0,
      active: workflowsWithProgress.filter((w) => w.status === 'active').length,
      completed: workflowsWithProgress.filter((w) => w.status === 'completed')
        .length,
      paused: workflowsWithProgress.filter((w) => w.status === 'paused').length,
      avgProgressPercentage:
        workflowsWithProgress.length > 0
          ? Math.round(
              workflowsWithProgress.reduce(
                (sum, w) => sum + w.progress.percentage,
                0,
              ) / workflowsWithProgress.length,
            )
          : 0,
      criticalCount: workflowsWithProgress.filter(
        (w) => w.priority === 'critical',
      ).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        workflows: workflowsWithProgress,
        summary,
        pagination: {
          total: totalCount || 0,
          offset: validatedQuery.offset,
          limit: validatedQuery.limit,
          hasMore:
            validatedQuery.offset + validatedQuery.limit < (totalCount || 0),
        },
      },
    });
  } catch (error) {
    console.error('Intervention workflows API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch intervention workflows',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/customer-success/intervention-workflows
 * Create a new intervention workflow
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const identifier = request.ip ?? 'anonymous';
  const { success } = await rateLimit.limit(identifier);

  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = createWorkflowSchema.parse(body);

    const supabase = createClient();

    // Verify organization access
    if (
      !session.user.isSuperAdmin &&
      validatedData.organizationId !== session.user.organizationId
    ) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 },
      );
    }

    // Get intervention templates
    const { data: templates, error: templatesError } = await supabase
      .from('intervention_templates')
      .select('*')
      .in('id', validatedData.templateIds);

    if (
      templatesError ||
      !templates ||
      templates.length !== validatedData.templateIds.length
    ) {
      return NextResponse.json(
        { error: 'Invalid intervention templates' },
        { status: 400 },
      );
    }

    // Create the workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('intervention_workflows')
      .insert({
        organization_id: validatedData.organizationId,
        supplier_name: validatedData.supplierName,
        risk_level: validatedData.riskLevel,
        health_score_before: validatedData.healthScoreBefore,
        intervention_reason: validatedData.interventionReason,
        priority: validatedData.priority,
        assigned_to: validatedData.assignedTo,
        scheduled_start_date: validatedData.scheduledStartDate,
        notes: validatedData.notes,
        status: 'draft',
        current_step: 0,
        total_steps: templates.length,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (workflowError || !workflow) {
      console.error('Workflow creation error:', workflowError);
      return NextResponse.json(
        { error: 'Failed to create workflow' },
        { status: 500 },
      );
    }

    // Create workflow steps
    const steps = templates.map((template, index) => ({
      workflow_id: workflow.id,
      template_id: template.id,
      order: index + 1,
      status: 'pending',
      scheduled_for: calculateStepSchedule(
        validatedData.scheduledStartDate,
        index,
        template.estimated_duration,
      ),
      created_by: session.user.id,
    }));

    const { error: stepsError } = await supabase
      .from('intervention_steps')
      .insert(steps);

    if (stepsError) {
      console.error('Steps creation error:', stepsError);
      // Rollback workflow creation
      await supabase
        .from('intervention_workflows')
        .delete()
        .eq('id', workflow.id);
      return NextResponse.json(
        { error: 'Failed to create workflow steps' },
        { status: 500 },
      );
    }

    // Log the workflow creation
    await supabase.from('support_interactions').insert({
      organization_id: validatedData.organizationId,
      interaction_type: 'success_planning',
      subject: `Intervention workflow created: ${validatedData.supplierName}`,
      description: `Created ${templates.length}-step intervention workflow for ${validatedData.riskLevel} risk supplier`,
      status: 'open',
      priority: validatedData.priority,
      initiated_by: session.user.id,
      assigned_to: validatedData.assignedTo || session.user.id,
      health_score_before: validatedData.healthScoreBefore,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          workflow: {
            ...workflow,
            steps,
            templates,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create workflow API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create intervention workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/customer-success/intervention-workflows/[id]
 * Update an existing workflow
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    const { pathname } = new URL(request.url);
    const workflowId = pathname.split('/').pop();

    if (!workflowId || !z.string().uuid().safeParse(workflowId).success) {
      return NextResponse.json(
        { error: 'Invalid workflow ID' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validatedData = updateWorkflowSchema.parse(body);

    const supabase = createClient();

    // Update the workflow
    const { data: updatedWorkflow, error } = await supabase
      .from('intervention_workflows')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
        updated_by: session.user.id,
      })
      .eq('id', workflowId)
      .select()
      .single();

    if (error) {
      console.error('Workflow update error:', error);
      return NextResponse.json(
        { error: 'Failed to update workflow' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { workflow: updatedWorkflow },
    });
  } catch (error) {
    console.error('Update workflow API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/customer-success/intervention-workflows/execute-step
 * Execute a specific workflow step
 */
export async function executeWorkflowStep(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = executeStepSchema.parse(body);

    const supabase = createClient();

    // Update the step
    const stepUpdate: any = {
      status:
        validatedData.action === 'start'
          ? 'in_progress'
          : validatedData.action === 'complete'
            ? 'completed'
            : validatedData.action === 'skip'
              ? 'skipped'
              : 'failed',
      updated_at: new Date().toISOString(),
      updated_by: session.user.id,
    };

    if (validatedData.action === 'start') {
      stepUpdate.started_at = new Date().toISOString();
    } else if (validatedData.action === 'complete') {
      stepUpdate.completed_at = new Date().toISOString();
      stepUpdate.outcome = validatedData.outcome;
      stepUpdate.next_action = validatedData.nextAction;
    }

    if (validatedData.notes) {
      stepUpdate.notes = validatedData.notes;
    }

    if (validatedData.scheduledFollowUp) {
      stepUpdate.follow_up_date = validatedData.scheduledFollowUp;
    }

    const { error: stepError } = await supabase
      .from('intervention_steps')
      .update(stepUpdate)
      .eq('id', validatedData.stepId)
      .eq('workflow_id', validatedData.workflowId);

    if (stepError) {
      console.error('Step update error:', stepError);
      return NextResponse.json(
        { error: 'Failed to update step' },
        { status: 500 },
      );
    }

    // Update workflow progress
    if (validatedData.action === 'complete') {
      const { data: workflow } = await supabase
        .from('intervention_workflows')
        .select('*, steps:intervention_steps(*)')
        .eq('id', validatedData.workflowId)
        .single();

      if (workflow) {
        const completedSteps = workflow.steps.filter(
          (step: any) => step.status === 'completed',
        ).length;
        const workflowUpdate: any = {
          current_step: completedSteps,
          updated_at: new Date().toISOString(),
        };

        // Check if workflow is complete
        if (completedSteps === workflow.total_steps) {
          workflowUpdate.status = 'completed';
          workflowUpdate.completed_at = new Date().toISOString();
        }

        await supabase
          .from('intervention_workflows')
          .update(workflowUpdate)
          .eq('id', validatedData.workflowId);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Step ${validatedData.action}d successfully`,
    });
  } catch (error) {
    console.error('Execute step API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute step',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Helper functions
function calculateEstimatedCompletion(workflow: any): string | null {
  if (workflow.status === 'completed') return null;

  const pendingSteps = workflow.steps.filter(
    (step: any) => step.status === 'pending',
  ).length;
  const avgStepDuration = 2; // days (could be calculated from historical data)

  const estimatedDays = pendingSteps * avgStepDuration;
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);

  return estimatedDate.toISOString();
}

function calculateHealthImpactPrediction(workflow: any): number {
  // Simplified prediction based on workflow type and risk level
  const baseImpact =
    workflow.priority === 'critical'
      ? 25
      : workflow.priority === 'high'
        ? 15
        : workflow.priority === 'medium'
          ? 10
          : 5;

  const riskMultiplier =
    workflow.risk_level === 'critical'
      ? 1.5
      : workflow.risk_level === 'high'
        ? 1.3
        : workflow.risk_level === 'medium'
          ? 1.1
          : 1.0;

  return Math.round(baseImpact * riskMultiplier);
}

function calculateStepSchedule(
  startDate: string | undefined,
  stepIndex: number,
  estimatedDuration: number,
): string | null {
  if (!startDate) return null;

  const start = new Date(startDate);
  const stepDate = new Date(start);
  stepDate.setDate(stepDate.getDate() + stepIndex * estimatedDuration);

  return stepDate.toISOString();
}
