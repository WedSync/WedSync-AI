/**
 * WS-239: AI Features Billing API - Team B Round 1
 * Detailed billing reports and cost breakdown
 * GET /api/ai-features/billing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { costTrackingService } from '@/lib/ai/dual-system/CostTrackingService';

export async function GET(request: NextRequest) {
  try {
    const { supplierId, error: authError } =
      await authenticateSupplier(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || getCurrentBillingPeriod();

    const costReport = await costTrackingService.generateCostReport(
      supplierId,
      period,
    );

    return NextResponse.json({
      billingPeriod: period,
      summary: costReport.summary,
      breakdown: {
        platform: costReport.platformUsage,
        client: costReport.clientUsage,
      },
      savings: {
        total: costReport.summary.savings,
        percentage: costReport.summary.savingsPercentage,
      },
      recommendations: costReport.recommendations,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Billing data failed' }, { status: 500 });
  }
}

function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

async function authenticateSupplier(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 },
      ),
    };
  }

  const token = authHeader.substring(7);
  const { data: user } = await supabase.auth.getUser(token);
  const { data: userProfile } = await supabase
    .from('users')
    .select('organization_id, user_type')
    .eq('id', user.id)
    .single();

  return { supplierId: userProfile.organization_id };
}
