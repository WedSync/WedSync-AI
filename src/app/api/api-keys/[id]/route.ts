// /api/api-keys/[id]/route.ts
// WS-072: Individual API Key Management Routes
// Handles operations on specific API keys

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { apiKeyService } from '@/lib/services/apiKeyService';
import { createAPIError, createAPIResponse } from '@/lib/auth/apiKeyAuth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/api-keys/[id] - Get API key details
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Get API key
    const apiKeys = await apiKeyService.listAPIKeys();
    const apiKey = apiKeys.find((key) => key.id === id);

    if (!apiKey) {
      return createAPIError('API key not found', 'KEY_NOT_FOUND', 404);
    }

    // Get query parameters
    const url = new URL(request.url);
    const includeUsage = url.searchParams.get('include_usage') === 'true';
    const usageDays = parseInt(url.searchParams.get('usage_days') || '30');

    let keyWithUsage = apiKey;

    if (includeUsage) {
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - usageDays);

        const usage = await apiKeyService.getUsageAnalytics(
          apiKey.id,
          startDate,
          new Date(),
        );

        keyWithUsage = { ...apiKey, usage };
      } catch (error) {
        console.error(`Failed to get usage for key ${apiKey.id}:`, error);
      }
    }

    return createAPIResponse(keyWithUsage);
  } catch (error) {
    console.error('Failed to get API key:', error);
    return createAPIError(
      'Failed to get API key',
      'GET_FAILED',
      500,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// PUT /api/api-keys/[id] - Update API key
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Parse request body
    const body = await request.json();

    // Validate scopes if provided
    if (body.scopes && Array.isArray(body.scopes)) {
      const availableScopes = await apiKeyService.getAvailableScopes();
      const availableScopeNames = availableScopes.map((s) => s.scope);

      const invalidScopes = body.scopes.filter(
        (scope: string) => !availableScopeNames.includes(scope),
      );

      if (invalidScopes.length > 0) {
        return createAPIError(
          `Invalid scopes: ${invalidScopes.join(', ')}`,
          'INVALID_SCOPES',
          400,
          { invalidScopes, availableScopes: availableScopeNames },
        );
      }
    }

    // Update the API key
    const updatedKey = await apiKeyService.updateAPIKey(id, body);

    return createAPIResponse(updatedKey);
  } catch (error) {
    console.error('Failed to update API key:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return createAPIError('API key not found', 'KEY_NOT_FOUND', 404);
    }

    return createAPIError(
      'Failed to update API key',
      'UPDATE_FAILED',
      500,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// DELETE /api/api-keys/[id] - Revoke/delete API key
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Get reason from query parameters or body
    const url = new URL(request.url);
    const reason = url.searchParams.get('reason') || 'Manually revoked';

    // Revoke the API key
    await apiKeyService.revokeAPIKey(id, reason);

    return createAPIResponse({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Failed to revoke API key:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return createAPIError('API key not found', 'KEY_NOT_FOUND', 404);
    }

    return createAPIError(
      'Failed to revoke API key',
      'REVOKE_FAILED',
      500,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
