/**
 * Cloud Provider Regions API
 * GET /api/cloud/providers/[id]/regions - List provider regions
 * WS-257 Team B Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { MultiCloudOrchestrationService } from '@/lib/services/cloud-orchestration-service';

// Rate limiting
const RATE_LIMIT = { requests: 50, windowMs: 60000 }; // 50 requests per minute
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const current = requestCounts.get(clientId);

  if (!current || now > current.resetTime) {
    requestCounts.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return true;
  }

  if (current.count >= RATE_LIMIT.requests) {
    return false;
  }

  current.count++;
  return true;
}

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  return `ip:${ip}`;
}

async function getUserFromAuth(request: NextRequest) {
  const supabase = (await import('@/lib/supabase/server')).createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required');
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    throw new Error('User not found');
  }

  return {
    userId: user.id,
    organizationId: userData.organization_id,
    role: userData.role,
  };
}

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/cloud/providers/[id]/regions
 * List all available regions for a cloud provider
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting
    const clientId = getClientId(request);
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // Authentication
    const user = await getUserFromAuth(request);
    const { id: providerId } = params;

    if (!providerId?.trim()) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 },
      );
    }

    // Create orchestration service
    const orchestrationService = new MultiCloudOrchestrationService({
      organizationId: user.organizationId,
      userId: user.userId,
    });

    // Get provider and list regions
    const provider = await orchestrationService.getCloudProvider(providerId);
    const regions = await provider.listRegions();

    return NextResponse.json({
      providerId,
      regions,
      totalCount: regions.length,
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error listing provider regions:', error);

    if (error instanceof Error) {
      if (error.message.includes('Authentication')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Provider not found' },
          { status: 404 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to retrieve regions' },
      { status: 500 },
    );
  }
}
