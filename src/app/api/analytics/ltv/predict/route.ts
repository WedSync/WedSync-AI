import { NextRequest, NextResponse } from 'next/server';
import {
  LTVPredictionEngine,
  LTVPredictionResult,
} from '@/lib/analytics/ltv-prediction-engine';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';

// Interface definitions
interface LTVPredictionRequest {
  supplierId: string;
  predictionHorizon?: number; // months, default 24
  includeBreakdown?: boolean;
  segmentContext?: SegmentContext;
}

interface SegmentContext {
  businessType?: string;
  subscriptionTier?: string;
  acquisitionChannel?: string;
  marketPosition?: string;
}

interface LTVPredictionResponse {
  supplierId: string;
  historicalLTV: number;
  predictedLTV: number;
  totalLTV: number;
  confidence: number; // 0-1
  paybackPeriod: number; // months
  ltvCacRatio: number;
  predictionBreakdown?: ModelBreakdown[];
  calculatedAt: string;
  modelVersion: string;
  riskFactors?: string[];
  churnProbability?: number;
  expansionPotential?: number;
  segmentBenchmarks?: SegmentBenchmark;
}

interface ModelBreakdown {
  modelType: 'cohort_based' | 'probabilistic' | 'ml_regression' | 'ensemble';
  prediction: number;
  confidence: number;
  weight: number;
  contributingFactors: string[];
}

interface SegmentBenchmark {
  segmentAverageLTV: number;
  percentileRank: number;
  performanceCategory:
    | 'top_quartile'
    | 'above_average'
    | 'average'
    | 'below_average';
}

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ltvEngine = new LTVPredictionEngine();

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many LTV prediction requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication and authorization
async function authenticateRequest(
  request: NextRequest,
): Promise<{ userId: string; role: string } | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Get user role and permissions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, permissions')
      .eq('id', user.id)
      .single();

    // Check if user has financial analytics access
    const requiredPermissions = ['analytics:read', 'financial:read'];
    const userPermissions = profile?.permissions || [];
    const hasPermission =
      requiredPermissions.some((perm) => userPermissions.includes(perm)) ||
      profile?.role === 'admin' ||
      profile?.role === 'executive';

    if (!hasPermission) {
      return null;
    }

    return {
      userId: user.id,
      role: profile?.role || 'user',
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// Validate supplier access
async function validateSupplierAccess(
  userId: string,
  supplierId: string,
  role: string,
): Promise<boolean> {
  if (role === 'admin' || role === 'executive') {
    return true;
  }

  // Check if user has access to this supplier
  const { data, error } = await supabase
    .from('supplier_access')
    .select('supplier_id')
    .eq('user_id', userId)
    .eq('supplier_id', supplierId)
    .single();

  return !error && data !== null;
}

// Get segment benchmarks
async function getSegmentBenchmarks(
  supplierId: string,
  totalLTV: number,
): Promise<SegmentBenchmark | undefined> {
  try {
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('business_type, subscription_tier, acquisition_channel')
      .eq('id', supplierId)
      .single();

    if (!supplier) return undefined;

    // Get segment average LTV
    const { data: segmentData } = await supabase
      .from('ltv_segments')
      .select('avg_ltv, median_ltv')
      .eq('segment_type', 'vendor_type')
      .eq('segment_value', supplier.business_type)
      .single();

    if (!segmentData) return undefined;

    const segmentAverageLTV = segmentData.avg_ltv || 0;

    // Calculate percentile rank
    const { data: allLTVs } = await supabase
      .from('customer_ltv_calculations')
      .select('predicted_ltv_24m')
      .not('predicted_ltv_24m', 'is', null)
      .order('predicted_ltv_24m');

    if (!allLTVs?.length) return undefined;

    const belowCount = allLTVs.filter(
      (ltv) => ltv.predicted_ltv_24m < totalLTV,
    ).length;
    const percentileRank = (belowCount / allLTVs.length) * 100;

    let performanceCategory:
      | 'top_quartile'
      | 'above_average'
      | 'average'
      | 'below_average';
    if (percentileRank >= 75) performanceCategory = 'top_quartile';
    else if (percentileRank >= 60) performanceCategory = 'above_average';
    else if (percentileRank >= 40) performanceCategory = 'average';
    else performanceCategory = 'below_average';

    return {
      segmentAverageLTV,
      percentileRank,
      performanceCategory,
    };
  } catch (error) {
    console.error('Error calculating segment benchmarks:', error);
    return undefined;
  }
}

// Audit logging
async function logPredictionRequest(
  userId: string,
  supplierId: string,
  predictionResult: LTVPredictionResult,
  requestMetadata: any,
): Promise<void> {
  try {
    await supabase.from('financial_audit_log').insert({
      user_id: userId,
      action: 'ltv_prediction',
      resource_id: supplierId,
      resource_type: 'supplier',
      details: {
        predictedLTV: predictionResult.predictedLTV,
        confidence: predictionResult.confidence,
        modelVersion: predictionResult.modelVersion,
        requestMetadata,
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
    });
  } catch (error) {
    console.error('Failed to log prediction request:', error);
  }
}

// Main POST handler
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized access to financial analytics' },
        { status: 401 },
      );
    }

    // Parse request body
    let body: LTVPredictionRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 },
      );
    }

    // Validate required fields
    if (!body.supplierId) {
      return NextResponse.json(
        { error: 'supplierId is required' },
        { status: 400 },
      );
    }

    // Validate supplier access
    const hasAccess = await validateSupplierAccess(
      auth.userId,
      body.supplierId,
      auth.role,
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to supplier data' },
        { status: 403 },
      );
    }

    // Set defaults
    const predictionHorizon = body.predictionHorizon || 24;
    const includeBreakdown = body.includeBreakdown ?? false;

    // Validate prediction horizon
    if (predictionHorizon < 1 || predictionHorizon > 36) {
      return NextResponse.json(
        { error: 'predictionHorizon must be between 1 and 36 months' },
        { status: 400 },
      );
    }

    // Generate LTV prediction
    const predictionResult = await ltvEngine.predictSupplierLTV(
      body.supplierId,
      predictionHorizon,
    );

    // Get segment benchmarks
    const segmentBenchmarks = await getSegmentBenchmarks(
      body.supplierId,
      predictionResult.totalLTV,
    );

    // Prepare response
    const response: LTVPredictionResponse = {
      supplierId: predictionResult.supplierId,
      historicalLTV: Math.round(predictionResult.historicalLTV * 100) / 100,
      predictedLTV: Math.round(predictionResult.predictedLTV * 100) / 100,
      totalLTV: Math.round(predictionResult.totalLTV * 100) / 100,
      confidence: Math.round(predictionResult.confidence * 100) / 100,
      paybackPeriod: predictionResult.paybackPeriod,
      ltvCacRatio: Math.round(predictionResult.ltvCacRatio * 100) / 100,
      calculatedAt: predictionResult.calculatedAt.toISOString(),
      modelVersion: predictionResult.modelVersion,
    };

    // Include optional fields based on request
    if (includeBreakdown) {
      response.predictionBreakdown = predictionResult.predictionBreakdown;
      response.riskFactors = predictionResult.riskFactors;
      response.churnProbability =
        Math.round(predictionResult.churnProbability * 100) / 100;
      response.expansionPotential =
        Math.round(predictionResult.expansionPotential * 100) / 100;
    }

    if (segmentBenchmarks) {
      response.segmentBenchmarks = segmentBenchmarks;
    }

    // Audit logging
    const requestMetadata = {
      ip:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      predictionHorizon,
      includeBreakdown,
      timestamp: new Date().toISOString(),
    };

    await logPredictionRequest(
      auth.userId,
      body.supplierId,
      predictionResult,
      requestMetadata,
    );

    // Cache response for 5 minutes
    const cacheHeaders = {
      'Cache-Control': 'private, max-age=300',
      ETag: `"ltv-${body.supplierId}-${predictionResult.calculatedAt.getTime()}"`,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: cacheHeaders,
    });
  } catch (error) {
    console.error('LTV prediction error:', error);

    // Return user-friendly error message
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Supplier not found or insufficient data for prediction' },
          { status: 404 },
        );
      }

      if (error.message.includes('insufficient data')) {
        return NextResponse.json(
          {
            error: 'Insufficient data for accurate prediction',
            suggestion:
              'Supplier needs more historical activity for reliable LTV calculation',
          },
          { status: 422 },
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error during LTV prediction',
        requestId: `ltv-${Date.now()}`,
      },
      { status: 500 },
    );
  }
}

// GET handler for supplier LTV history
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (!supplierId) {
      return NextResponse.json(
        { error: 'supplierId query parameter is required' },
        { status: 400 },
      );
    }

    // Validate supplier access
    const hasAccess = await validateSupplierAccess(
      auth.userId,
      supplierId,
      auth.role,
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to supplier data' },
        { status: 403 },
      );
    }

    // Get historical LTV calculations
    const { data: ltvHistory, error } = await supabase
      .from('customer_ltv_calculations')
      .select('*')
      .eq('customer_id', supplierId)
      .order('calculation_date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({
      supplierId,
      history: ltvHistory || [],
      count: ltvHistory?.length || 0,
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('LTV history retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve LTV history' },
      { status: 500 },
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
