/**
 * WS-240: AI Optimization Configuration API
 * PUT /api/ai-optimization/config
 *
 * Update optimization settings for suppliers.
 * Allows fine-tuning of cost optimization strategies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const ConfigUpdateSchema = z.object({
  supplierId: z.string().uuid(),
  featureType: z.enum([
    'photo_ai',
    'content_generation',
    'chatbot',
    'venue_descriptions',
    'menu_optimization',
    'timeline_assistance',
  ]),
  optimizationLevel: z
    .enum(['aggressive', 'balanced', 'quality_first'])
    .optional(),
  monthlyBudgetPounds: z.number().positive().max(1000).optional(),
  dailyBudgetPounds: z.number().positive().max(100).optional(),
  alertThresholdPercent: z.number().int().min(50).max(95).optional(),
  autoDisableAtLimit: z.boolean().optional(),
  cacheStrategy: z
    .object({
      semantic: z.boolean(),
      exact: z.boolean(),
      ttlHours: z.number().int().min(1).max(168),
      similarityThreshold: z.number().min(0.5).max(1.0),
    })
    .optional(),
  batchProcessingEnabled: z.boolean().optional(),
  seasonalMultiplierEnabled: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const config = ConfigUpdateSchema.parse(body);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Update configuration
    const { data, error } = await supabase
      .from('ai_cost_optimization')
      .upsert(
        {
          supplier_id: config.supplierId,
          feature_type: config.featureType,
          optimization_level: config.optimizationLevel,
          monthly_budget_pounds: config.monthlyBudgetPounds,
          daily_budget_pounds: config.dailyBudgetPounds,
          alert_threshold_percent: config.alertThresholdPercent,
          auto_disable_at_limit: config.autoDisableAtLimit,
          cache_strategy: config.cacheStrategy,
          batch_processing_enabled: config.batchProcessingEnabled,
          seasonal_multiplier_enabled: config.seasonalMultiplierEnabled,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'supplier_id,feature_type',
        },
      )
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: data[0],
    });
  } catch (error) {
    console.error('Config update failed:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 },
    );
  }
}
