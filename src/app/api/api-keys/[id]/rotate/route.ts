// /api/api-keys/[id]/rotate/route.ts
// WS-072: API Key Rotation Route
// Handles API key rotation (revoke old, create new)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { apiKeyService } from '@/lib/services/apiKeyService';
import { createAPIError, createAPIResponse } from '@/lib/auth/apiKeyAuth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/api-keys/[id]/rotate - Rotate API key
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = createServerComponentClient({ cookies });

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return createAPIError('Unauthorized', 'AUTH_REQUIRED', 401);
    }

    // Rotate the API key
    const result = await apiKeyService.rotateAPIKey(id);

    // Log the rotation event
    await apiKeyService.logIntegrationEvent(
      result.apiKey.id,
      result.apiKey.integrationType || 'unknown',
      'key_rotated',
      'success',
      {
        oldKeyId: id,
        newKeyId: result.apiKey.id,
      },
    );

    return createAPIResponse({
      apiKey: result.apiKey,
      plainKey: result.plainKey,
      warning:
        'Store this new key securely. The old key has been revoked and you will not be able to view this new key again.',
    });
  } catch (error) {
    console.error('Failed to rotate API key:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return createAPIError('API key not found', 'KEY_NOT_FOUND', 404);
    }

    return createAPIError(
      'Failed to rotate API key',
      'ROTATE_FAILED',
      500,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
