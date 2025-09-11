/**
 * WS-239: AI Features Config API - Team B Round 1
 * Manage supplier AI configuration and encrypted API keys
 * GET/PUT /api/ai-features/config
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { clientAIService } from '@/lib/ai/dual-system/ClientAIService';
import { Logger } from '@/lib/logging/Logger';

const logger = new Logger('AIConfigAPI');

// Configuration update schema
const configUpdateSchema = z.object({
  // Platform settings
  platformFeaturesEnabled: z.boolean().optional(),

  // Client API settings
  clientApiEnabled: z.boolean().optional(),
  clientApiProvider: z.enum(['openai', 'anthropic', 'google']).optional(),
  clientApiKey: z.string().min(20).max(200).optional(), // New API key (will be encrypted)
  clientMonthlyBudgetPounds: z.number().min(1).max(10000).optional(),
  clientAutoDisableAtLimit: z.boolean().optional(),
  clientCostAlertsEnabled: z.boolean().optional(),
  clientAlertThresholds: z.array(z.number().min(0).max(1)).max(5).optional(),

  // Migration settings
  migrationStatus: z
    .enum(['platform_only', 'hybrid', 'client_only', 'migrating'])
    .optional(),
});

/**
 * GET /api/ai-features/config
 * Get supplier's AI configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
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

    // Fetch AI configuration
    const { data: config, error: configError } = await supabase
      .from('ai_feature_config')
      .select(
        `
        id,
        platform_features_enabled,
        platform_usage_tier,
        platform_monthly_limits,
        platform_overage_rate_pounds,
        client_api_enabled,
        client_api_provider,
        client_monthly_budget_pounds,
        client_auto_disable_at_limit,
        client_cost_alerts_enabled,
        client_alert_thresholds,
        migration_status,
        client_api_health_status,
        platform_api_health_status,
        created_at,
        updated_at
      `,
      )
      .eq('supplier_id', supplierId)
      .single();

    if (configError) {
      logger.error('Failed to fetch AI config', {
        supplierId,
        error: configError,
      });
      return NextResponse.json(
        { error: 'Configuration not found', code: 'CONFIG_NOT_FOUND' },
        { status: 404 },
      );
    }

    // Get current usage for context
    const { data: currentUsage } = await supabase
      .from('ai_billing_summary')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('billing_period', getCurrentBillingPeriod())
      .single();

    // Format response (never include encrypted API keys)
    const response = {
      id: config.id,
      supplierId,

      // Platform configuration
      platform: {
        enabled: config.platform_features_enabled,
        usageTier: config.platform_usage_tier,
        monthlyLimits: config.platform_monthly_limits,
        overageRatePounds: parseFloat(config.platform_overage_rate_pounds),
        healthStatus: config.platform_api_health_status,
      },

      // Client configuration (no API key!)
      client: {
        enabled: config.client_api_enabled,
        provider: config.client_api_provider,
        hasApiKey: config.client_api_enabled && !!config.client_api_provider,
        monthlyBudgetPounds: parseFloat(config.client_monthly_budget_pounds),
        autoDisableAtLimit: config.client_auto_disable_at_limit,
        costAlertsEnabled: config.client_cost_alerts_enabled,
        alertThresholds: config.client_alert_thresholds,
        healthStatus: config.client_api_health_status,
      },

      // Migration settings
      migration: {
        status: config.migration_status,
      },

      // Current usage context
      currentUsage: currentUsage
        ? {
            platformRequests: currentUsage.platform_requests,
            platformCost: parseFloat(currentUsage.platform_overage_cost_pounds),
            clientRequests: currentUsage.client_requests,
            clientCost: parseFloat(currentUsage.client_cost_pounds),
            totalSavings: parseFloat(currentUsage.client_savings_pounds),
          }
        : null,

      // Metadata
      timestamps: {
        created: config.created_at,
        updated: config.updated_at,
      },
    };

    logger.info('AI config retrieved', {
      supplierId,
      hasClientApi: response.client.hasApiKey,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('GET AI config failed', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to retrieve configuration', code: 'FETCH_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/ai-features/config
 * Update supplier's AI configuration
 */
export async function PUT(request: NextRequest) {
  try {
    // Authentication
    const {
      user,
      supplierId,
      error: authError,
    } = await authenticateSupplier(request);
    if (authError) return authError;

    // Validate request body
    const body = await request.json();
    const validation = configUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid configuration data',
          code: 'VALIDATION_ERROR',
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const config = validation.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Handle API key update separately (requires encryption)
    if (config.clientApiKey && config.clientApiProvider) {
      const storeResult = await clientAIService.storeAPIKey(
        supplierId,
        config.clientApiKey,
        config.clientApiProvider,
        config.clientMonthlyBudgetPounds || 50.0,
      );

      if (!storeResult.success) {
        return NextResponse.json(
          {
            error: 'Failed to store API key',
            code: 'API_KEY_STORE_ERROR',
            details: storeResult.error,
          },
          { status: 400 },
        );
      }

      logger.info('API key updated', {
        supplierId,
        provider: config.clientApiProvider,
      });
    }

    // Update other configuration fields
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (config.platformFeaturesEnabled !== undefined) {
      updateData.platform_features_enabled = config.platformFeaturesEnabled;
    }

    if (config.clientApiEnabled !== undefined) {
      updateData.client_api_enabled = config.clientApiEnabled;
    }

    if (config.clientMonthlyBudgetPounds !== undefined) {
      updateData.client_monthly_budget_pounds =
        config.clientMonthlyBudgetPounds;
    }

    if (config.clientAutoDisableAtLimit !== undefined) {
      updateData.client_auto_disable_at_limit = config.clientAutoDisableAtLimit;
    }

    if (config.clientCostAlertsEnabled !== undefined) {
      updateData.client_cost_alerts_enabled = config.clientCostAlertsEnabled;
    }

    if (config.clientAlertThresholds !== undefined) {
      updateData.client_alert_thresholds = config.clientAlertThresholds;
    }

    if (config.migrationStatus !== undefined) {
      updateData.migration_status = config.migrationStatus;

      // Set migration date if transitioning
      if (config.migrationStatus === 'migrating') {
        updateData.migration_date = new Date().toISOString();
      }
    }

    // Apply updates to database
    const { error: updateError } = await supabase
      .from('ai_feature_config')
      .update(updateData)
      .eq('supplier_id', supplierId);

    if (updateError) {
      logger.error('Failed to update AI config', {
        supplierId,
        error: updateError,
      });
      return NextResponse.json(
        { error: 'Failed to update configuration', code: 'UPDATE_ERROR' },
        { status: 500 },
      );
    }

    logger.info('AI config updated', {
      supplierId,
      updatedFields: Object.keys(updateData),
      hasNewApiKey: !!config.clientApiKey,
    });

    // Return updated configuration (refetch to ensure consistency)
    return GET(request);
  } catch (error) {
    logger.error('PUT AI config failed', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Configuration update failed', code: 'UPDATE_FAILED' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/ai-features/config
 * Remove client API key (reset to platform-only)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authentication
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

    // Remove client API configuration
    const { error: updateError } = await supabase
      .from('ai_feature_config')
      .update({
        client_api_enabled: false,
        client_api_provider: null,
        client_api_key_encrypted: null,
        client_api_key_iv: null,
        migration_status: 'platform_only',
        updated_at: new Date().toISOString(),
      })
      .eq('supplier_id', supplierId);

    if (updateError) {
      logger.error('Failed to remove client API config', {
        supplierId,
        error: updateError,
      });
      return NextResponse.json(
        { error: 'Failed to remove API key', code: 'REMOVE_ERROR' },
        { status: 500 },
      );
    }

    logger.info('Client API key removed', { supplierId });

    return NextResponse.json({
      success: true,
      message: 'Client API key removed - reverted to platform-only mode',
    });
  } catch (error) {
    logger.error('DELETE AI config failed', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to remove configuration', code: 'DELETE_FAILED' },
      { status: 500 },
    );
  }
}

/**
 * Helper functions
 */
async function authenticateSupplier(request: NextRequest): Promise<{
  user?: any;
  supplierId?: string;
  error?: NextResponse;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { error: 'Authorization required', code: 'AUTH_REQUIRED' },
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
        { error: 'Invalid authentication', code: 'AUTH_INVALID' },
        { status: 401 },
      ),
    };
  }

  // Get user's organization
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('organization_id, user_type')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile || userProfile.user_type !== 'supplier') {
    return {
      error: NextResponse.json(
        { error: 'Supplier access required', code: 'NOT_SUPPLIER' },
        { status: 403 },
      ),
    };
  }

  return {
    user,
    supplierId: userProfile.organization_id,
  };
}

function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}
