import { NextRequest, NextResponse } from 'next/server';
import { FAQWebhookProcessor } from '@/lib/integrations/faq-webhook-processor';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const webhookProcessor = new FAQWebhookProcessor();

const ProcessingStatusEventSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.string().datetime(),
  processingJobId: z.string().uuid(),
  organizationId: z.string().uuid(),
  processingStatus: z.object({
    status: z.enum([
      'queued',
      'processing',
      'completed',
      'failed',
      'cancelled',
    ]),
    currentStage: z.string(),
    totalStages: z.number().int().min(1),
    completedStages: z.number().int().min(0),
    processedFAQs: z.number().int().min(0),
    totalFAQs: z.number().int().min(0),
    errors: z.array(
      z.object({
        stage: z.string(),
        faqId: z.string().optional(),
        error: z.string(),
        errorCode: z.string().optional(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
      }),
    ),
    metrics: z.object({
      startTime: z.string().datetime(),
      estimatedCompletionTime: z.string().datetime().optional(),
      processingRate: z.number().min(0), // FAQs per minute
      averageProcessingTimePerFAQ: z.number().min(0), // milliseconds
      aiTokensUsed: z.number().int().min(0),
      aiCost: z.number().min(0), // in cents
    }),
    stageResults: z.array(
      z.object({
        stage: z.string(),
        status: z.enum([
          'pending',
          'processing',
          'completed',
          'failed',
          'skipped',
        ]),
        processedItems: z.number().int().min(0),
        errors: z.number().int().min(0),
        duration: z.number().int().min(0).optional(), // milliseconds
        aiTokensUsed: z.number().int().min(0).optional(),
      }),
    ),
  }),
  weddingContext: z.object({
    vendorType: z.enum([
      'photographer',
      'venue',
      'caterer',
      'florist',
      'dj',
      'band',
      'planner',
      'other',
    ]),
    specializations: z.array(z.string()),
    averageWeddingBudget: z
      .enum(['under_5k', '5k_10k', '10k_25k', '25k_50k', '50k_plus'])
      .optional(),
    primaryRegions: z.array(z.string()),
  }),
});

export async function POST(request: NextRequest) {
  try {
    // Get organization ID from auth context
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 403 },
      );
    }

    // Get request body and signature
    const body = await request.text();
    const signature = request.headers.get('webhook-signature');
    const contentType = request.headers.get('content-type');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 },
      );
    }

    if (contentType !== 'application/json') {
      return NextResponse.json(
        { error: 'Invalid content type. Expected application/json' },
        { status: 400 },
      );
    }

    // Parse and validate the event
    let eventData;
    try {
      eventData = JSON.parse(body);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 },
      );
    }

    const validationResult = ProcessingStatusEventSchema.safeParse(eventData);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid event data',
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const validatedEvent = validationResult.data;

    // Verify organization ownership
    if (validatedEvent.organizationId !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Forbidden: Organization mismatch' },
        { status: 403 },
      );
    }

    // Get client IP for security logging
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    // Process webhook with the FAQWebhookProcessor
    const processingResult = await webhookProcessor.processWebhook(
      {
        type: 'faq.processing.status',
        id: validatedEvent.eventId,
        timestamp: new Date(validatedEvent.timestamp),
        organizationId: validatedEvent.organizationId,
        data: validatedEvent,
      },
      signature,
      validatedEvent.organizationId,
      clientIp,
    );

    if (!processingResult.success) {
      return NextResponse.json(
        {
          error: 'Webhook processing failed',
          details: processingResult.error,
        },
        { status: 500 },
      );
    }

    // Calculate processing progress
    const progress =
      validatedEvent.processingStatus.totalFAQs > 0
        ? (validatedEvent.processingStatus.processedFAQs /
            validatedEvent.processingStatus.totalFAQs) *
          100
        : 0;

    const stageProgress =
      validatedEvent.processingStatus.totalStages > 0
        ? (validatedEvent.processingStatus.completedStages /
            validatedEvent.processingStatus.totalStages) *
          100
        : 0;

    // Determine response message and alert level
    const status = validatedEvent.processingStatus.status;
    let responseMessage = 'FAQ processing status updated';
    let alertLevel = 'info';

    if (status === 'failed') {
      alertLevel = 'error';
      responseMessage = 'FAQ processing failed';
    } else if (status === 'completed') {
      alertLevel = 'success';
      responseMessage = 'FAQ processing completed successfully';
    } else if (status === 'processing') {
      alertLevel = 'info';
      responseMessage = `FAQ processing in progress: ${Math.round(progress)}% complete`;
    }

    // Log with appropriate detail level
    const logData = {
      eventId: validatedEvent.eventId,
      organizationId: validatedEvent.organizationId,
      processingJobId: validatedEvent.processingJobId,
      status,
      currentStage: validatedEvent.processingStatus.currentStage,
      progress: Math.round(progress),
      stageProgress: Math.round(stageProgress),
      processedFAQs: validatedEvent.processingStatus.processedFAQs,
      totalFAQs: validatedEvent.processingStatus.totalFAQs,
      errorCount: validatedEvent.processingStatus.errors.length,
      aiTokensUsed: validatedEvent.processingStatus.metrics.aiTokensUsed,
      aiCost: validatedEvent.processingStatus.metrics.aiCost,
      vendorType: validatedEvent.weddingContext.vendorType,
      processingTimeMs: processingResult.processingTimeMs,
    };

    if (alertLevel === 'error') {
      console.error(`FAQ processing webhook - processing failed:`, {
        ...logData,
        errors: validatedEvent.processingStatus.errors,
      });
    } else {
      console.log(`FAQ processing webhook processed:`, logData);
    }

    // Return detailed response for progress tracking
    return NextResponse.json({
      success: true,
      eventId: validatedEvent.eventId,
      processingTimeMs: processingResult.processingTimeMs,
      message: responseMessage,
      processingProgress: {
        status,
        currentStage: validatedEvent.processingStatus.currentStage,
        overallProgress: Math.round(progress),
        stageProgress: Math.round(stageProgress),
        processedFAQs: validatedEvent.processingStatus.processedFAQs,
        totalFAQs: validatedEvent.processingStatus.totalFAQs,
        estimatedCompletion:
          validatedEvent.processingStatus.metrics.estimatedCompletionTime,
        processingRate: validatedEvent.processingStatus.metrics.processingRate,
      },
      costs: {
        aiTokensUsed: validatedEvent.processingStatus.metrics.aiTokensUsed,
        aiCostCents: validatedEvent.processingStatus.metrics.aiCost,
      },
      errors: validatedEvent.processingStatus.errors.filter(
        (e) => e.severity === 'high' || e.severity === 'critical',
      ),
    });
  } catch (error) {
    console.error('FAQ processing status webhook error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json({
    status: 'healthy',
    service: 'faq-processing-status-webhook',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    supportedEvents: ['faq.processing.status'],
  });
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        Allow: 'POST, GET, OPTIONS',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'webhook-signature, content-type',
      },
    },
  );
}
