// WS-010 Round 2: ML Vendor Analysis API Route
// Next.js 15 App Router API endpoint for vendor performance analysis

import { NextRequest, NextResponse } from 'next/server';
import { mlAPI } from '@/lib/ml/ml-api';
import {
  MLVendorAnalysisRequest,
  MLVendorAnalysisResponse,
} from '@/lib/ml/types';

export const runtime = 'edge';

/**
 * POST /api/ml/vendors - Analyze vendor performance using ML
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<MLVendorAnalysisResponse>> {
  try {
    const body: MLVendorAnalysisRequest = await request.json();

    // Run ML vendor analysis
    const result = await mlAPI.analyzeVendors(body);

    const statusCode = result.success ? 200 : 500;

    return NextResponse.json(result, {
      status: statusCode,
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
        'X-ML-Feature': 'vendor-analysis',
      },
    });
  } catch (error) {
    console.error('ML vendor analysis API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during vendor analysis',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/ml/vendors - Get vendor analysis capabilities
 */
export async function GET(): Promise<NextResponse> {
  try {
    const healthCheck = await mlAPI.validateModelHealth();

    return NextResponse.json({
      vendor_analysis_available:
        healthCheck.vendor_analyzer.status === 'healthy',
      performance_score: healthCheck.vendor_analyzer.performance,
      supported_categories: [
        'catering',
        'photography',
        'videography',
        'florals',
        'venue',
        'music',
        'transportation',
        'attire',
        'beauty',
        'decorations',
        'entertainment',
        'planning',
        'other',
      ],
      analysis_features: {
        historical_performance: true,
        trend_prediction: true,
        risk_assessment: true,
        seasonal_analysis: true,
        cost_variance_prediction: true,
      },
    });
  } catch (error) {
    console.error('Vendor analysis capabilities API error:', error);

    return NextResponse.json(
      { error: 'Failed to get vendor analysis capabilities' },
      { status: 500 },
    );
  }
}
