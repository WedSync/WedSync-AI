/**
 * WS-239: AI Features Limits API - Team B Round 1
 * Get usage limits and remaining quota
 * GET /api/ai-features/limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { costTrackingService } from '@/lib/ai/dual-system/CostTrackingService';
import { Logger } from '@/lib/logging/Logger';

const logger = new Logger('AILimitsAPI');

export async function GET(request: NextRequest) {
  try {
    const {
      user,
      supplierId,
      error: authError,
    } = await authenticateSupplier(request);
    if (authError) return authError;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: config } = await supabase
      .from('ai_feature_config')
      .select('*')
      .eq('supplier_id', supplierId)
      .single();

    const [platformBudget, clientBudget] = await Promise.all([
      costTrackingService.getBudgetStatus(supplierId, 'platform'),
      costTrackingService.getBudgetStatus(supplierId, 'client'),
    ]);

    return NextResponse.json({
      platform: {
        tier: config.platform_usage_tier,
        monthlyLimits: config.platform_monthly_limits,
        overageRate: parseFloat(config.platform_overage_rate_pounds),
        currentUsage: {
          totalRequests:
            platformBudget.currentSpend /
            parseFloat(config.platform_overage_rate_pounds),
          remainingBudget:
            platformBudget.monthlyBudget - platformBudget.currentSpend,
        },
      },
      client: {
        enabled: config.client_api_enabled,
        monthlyBudget: parseFloat(config.client_monthly_budget_pounds),
        currentSpend: clientBudget.currentSpend,
        remainingBudget: clientBudget.monthlyBudget - clientBudget.currentSpend,
        utilizationRate: clientBudget.utilizationRate,
        alertThresholds: config.client_alert_thresholds,
        triggeredAlerts: clientBudget.triggeredAlerts,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch limits' },
      { status: 500 },
    );
  }
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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 },
      ),
    };
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('organization_id, user_type')
    .eq('id', user.id)
    .single();

  if (!userProfile || userProfile.user_type !== 'supplier') {
    return {
      error: NextResponse.json(
        { error: 'Supplier access required' },
        { status: 403 },
      ),
    };
  }

  return { user, supplierId: userProfile.organization_id };
}
