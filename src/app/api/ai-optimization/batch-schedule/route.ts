/**
 * WS-240: Batch Processing Scheduler API
 * POST /api/ai-optimization/batch-schedule
 *
 * Schedule AI requests for batch processing to reduce costs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CostOptimizationEngine } from '@/lib/ai/optimization/CostOptimizationEngine';

const BatchScheduleSchema = z.object({
  supplierId: z.string().uuid(),
  requests: z.array(
    z.object({
      id: z.string(),
      featureType: z.string(),
      prompt: z.string(),
      priority: z.enum(['urgent', 'normal', 'batch']).default('batch'),
    }),
  ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplierId, requests } = BatchScheduleSchema.parse(body);

    const optimizationEngine = new CostOptimizationEngine();

    // Convert to AI request format
    const aiRequests = requests.map((req) => ({
      id: req.id,
      supplierId,
      featureType: req.featureType as any,
      prompt: req.prompt,
      qualityLevel: 'medium' as const,
      priority: req.priority as any,
      clientFacing: false,
    }));

    const batchSchedule =
      await optimizationEngine.scheduleForBatchProcessing(aiRequests);

    return NextResponse.json({
      success: true,
      batchId: batchSchedule.batchId,
      scheduledFor: batchSchedule.scheduledFor,
      estimatedSavings: batchSchedule.estimatedCost * 0.15, // 15% batch savings
      requestCount: batchSchedule.requests.length,
      message: 'Requests scheduled for batch processing during off-peak hours',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to schedule batch processing' },
      { status: 500 },
    );
  }
}
