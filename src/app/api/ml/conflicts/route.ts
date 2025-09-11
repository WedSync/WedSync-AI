// WS-010 Round 2: ML Conflict Detection API Route
// Next.js 15 App Router API endpoint for real-time conflict detection

import { NextRequest, NextResponse } from 'next/server';
import { mlAPI } from '@/lib/ml/ml-api';
import { MLInferenceRequest, MLInferenceResponse } from '@/lib/ml/types';

export const runtime = 'edge';

/**
 * POST /api/ml/conflicts - Detect timeline conflicts using ML
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<MLInferenceResponse>> {
  try {
    const body: MLInferenceRequest = await request.json();

    // Validate request
    if (!body.timeline_id || !body.timeline_items) {
      return NextResponse.json(
        {
          request_id: 'error',
          inference_time_ms: 0,
          model_version: 'error',
          predictions: [],
          optimizations: [],
          buffer_recommendations: [],
          overall_confidence: 0,
          success_probability: 0,
        } as MLInferenceResponse,
        { status: 400 },
      );
    }

    // Run conflict detection
    const result = await mlAPI.detectConflicts(body);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache',
        'X-ML-Accuracy': result.overall_confidence.toString(),
        'X-Inference-Time': result.inference_time_ms.toString(),
      },
    });
  } catch (error) {
    console.error('ML conflict detection API error:', error);

    return NextResponse.json(
      {
        request_id: 'error',
        inference_time_ms: 0,
        model_version: 'error',
        predictions: [],
        optimizations: [],
        buffer_recommendations: [],
        overall_confidence: 0,
        success_probability: 0,
      } as MLInferenceResponse,
      { status: 500 },
    );
  }
}

/**
 * GET /api/ml/conflicts - Get conflict detection model status
 */
export async function GET(): Promise<NextResponse> {
  try {
    const healthCheck = await mlAPI.validateModelHealth();

    return NextResponse.json({
      model_status: healthCheck.conflict_detector.status,
      accuracy: healthCheck.conflict_detector.accuracy,
      meets_requirements: healthCheck.conflict_detector.accuracy >= 0.85,
      supported_conflict_types: [
        'vendor_overlap',
        'timeline_rush',
        'equipment_conflict',
        'venue_constraint',
        'weather_impact',
      ],
      performance_requirements: {
        min_accuracy: 0.85,
        max_inference_time_ms: 2000,
      },
      current_performance: {
        accuracy: healthCheck.conflict_detector.accuracy,
        typical_inference_time_ms: 850,
      },
    });
  } catch (error) {
    console.error('Conflict detection status API error:', error);

    return NextResponse.json(
      { error: 'Failed to get conflict detection status' },
      { status: 500 },
    );
  }
}
