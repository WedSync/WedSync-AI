/**
 * WS-239: AI Features Test Key API - Team B Round 1
 * Validate client API keys before storing
 * POST /api/ai-features/test-key
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { clientAIService } from '@/lib/ai/dual-system/ClientAIService';
import { Logger } from '@/lib/logging/Logger';

const logger = new Logger('AITestKeyAPI');

const testKeySchema = z.object({
  apiKey: z.string().min(20).max(200),
  provider: z.enum(['openai', 'anthropic', 'google']),
});

/**
 * POST /api/ai-features/test-key
 * Validate API key before storing
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

    // Validate request
    const body = await request.json();
    const validation = testKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { apiKey, provider } = validation.data;

    logger.info('Testing API key', {
      supplierId,
      provider,
      keyLength: apiKey.length,
    });

    // Validate API key
    const result = await clientAIService.validateAPIKey(apiKey, provider);

    logger.info('API key validation result', {
      supplierId,
      provider,
      valid: result.valid,
      hasRateLimits: !!result.rateLimits,
    });

    return NextResponse.json({
      valid: result.valid,
      provider: result.provider,
      error: result.error,
      details: result.valid
        ? {
            rateLimits: result.rateLimits,
            estimatedMonthlyCost: result.estimatedMonthlyCost,
          }
        : undefined,
    });
  } catch (error) {
    logger.error('API key test failed', { error: error.message });
    return NextResponse.json(
      { error: 'Key validation failed', code: 'VALIDATION_ERROR' },
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
