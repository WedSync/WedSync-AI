/**
 * WS-239: AI Features Migration API - Team B Round 1
 * Handle migration from platform to client AI systems
 * POST /api/ai-features/migrate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { costTrackingService } from '@/lib/ai/dual-system/CostTrackingService';
import { Logger } from '@/lib/logging/Logger';

const logger = new Logger('AIMigrateAPI');

const migrateSchema = z.object({
  direction: z.enum(['to_client', 'to_platform', 'to_hybrid']),
  confirmCosts: z.boolean().default(false),
  expectedSavings: z.number().optional(),
});

/**
 * POST /api/ai-features/migrate
 * Migrate AI features between platform and client systems
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const {
      user,
      supplierId,
      error: authError,
    } = await authenticateSupplier(request);
    if (authError) return authError;

    const body = await request.json();
    const validation = migrateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid migration request',
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { direction, confirmCosts } = validation.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get current configuration
    const { data: currentConfig, error: configError } = await supabase
      .from('ai_feature_config')
      .select('*')
      .eq('supplier_id', supplierId)
      .single();

    if (configError || !currentConfig) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 },
      );
    }

    // Calculate cost projections for migration
    const projections =
      await costTrackingService.calculateProjectedCosts(supplierId);
    const currentUsage = await costTrackingService.getUsageAnalytics(
      supplierId,
      {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    );

    let newMigrationStatus: string;
    let estimatedSavings = 0;
    let warnings: string[] = [];

    switch (direction) {
      case 'to_client':
        if (!currentConfig.client_api_enabled) {
          return NextResponse.json(
            { error: 'Client API not configured. Add API key first.' },
            { status: 400 },
          );
        }
        newMigrationStatus = 'client_only';
        estimatedSavings = Math.max(
          0,
          projections.platform.projected - projections.client.projected,
        );
        break;

      case 'to_platform':
        newMigrationStatus = 'platform_only';
        estimatedSavings = Math.max(
          0,
          projections.client.projected - projections.platform.projected,
        );
        if (estimatedSavings < 0) {
          warnings.push('Migration to platform will increase costs');
        }
        break;

      case 'to_hybrid':
        newMigrationStatus = 'hybrid';
        estimatedSavings = projections.platform.projected * 0.3; // Estimate 30% savings
        warnings.push('Hybrid mode requires careful monitoring');
        break;
    }

    if (!confirmCosts && estimatedSavings < 0) {
      return NextResponse.json(
        {
          error: 'Migration would increase costs',
          requiresConfirmation: true,
          costImpact: {
            currentMonthlyCost:
              projections.platform.current + projections.client.current,
            projectedMonthlyCost:
              direction === 'to_platform'
                ? projections.platform.projected
                : projections.client.projected,
            estimatedChange: estimatedSavings,
            warnings,
          },
        },
        { status: 400 },
      );
    }

    // Perform migration
    const { error: migrationError } = await supabase
      .from('ai_feature_config')
      .update({
        migration_status: newMigrationStatus,
        migration_date: new Date().toISOString(),
        migration_savings_estimate_pounds: estimatedSavings,
        updated_at: new Date().toISOString(),
      })
      .eq('supplier_id', supplierId);

    if (migrationError) {
      logger.error('Migration failed', {
        supplierId,
        direction,
        error: migrationError,
      });
      return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
    }

    logger.info('AI migration completed', {
      supplierId,
      direction,
      newStatus: newMigrationStatus,
      estimatedSavings,
    });

    return NextResponse.json({
      success: true,
      migrationStatus: newMigrationStatus,
      estimatedMonthlySavings: estimatedSavings,
      effectiveDate: new Date().toISOString(),
      recommendations: [
        'Monitor usage patterns for the next 30 days',
        'Set up cost alerts if using client API',
        'Review monthly cost reports',
      ],
    });
  } catch (error) {
    logger.error('Migration request failed', { error: error.message });
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}

/**
 * GET /api/ai-features/migrate
 * Get migration cost estimates
 */
export async function GET(request: NextRequest) {
  try {
    const {
      user,
      supplierId,
      error: authError,
    } = await authenticateSupplier(request);
    if (authError) return authError;

    const projections =
      await costTrackingService.calculateProjectedCosts(supplierId);

    const estimates = {
      toClient: {
        monthlySavings: Math.max(
          0,
          projections.platform.projected - projections.client.projected,
        ),
        savingsPercentage:
          projections.platform.projected > 0
            ? ((projections.platform.projected - projections.client.projected) /
                projections.platform.projected) *
              100
            : 0,
      },
      toPlatform: {
        monthlyCost: projections.platform.projected,
        costIncrease: Math.max(
          0,
          projections.platform.projected - projections.client.projected,
        ),
      },
      recommendations: projections.recommendations,
    };

    return NextResponse.json(estimates);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to calculate estimates' },
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

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('organization_id, user_type')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile || userProfile.user_type !== 'supplier') {
    return {
      error: NextResponse.json(
        { error: 'Supplier access required' },
        { status: 403 },
      ),
    };
  }

  return { user, supplierId: userProfile.organization_id };
}
