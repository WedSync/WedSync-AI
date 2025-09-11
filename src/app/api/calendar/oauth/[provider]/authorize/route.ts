/**
 * WS-336: Calendar Integration System - OAuth Authorization Endpoint
 *
 * Initiates OAuth 2.0 flow for calendar providers (Google, Outlook, Apple).
 * Implements PKCE, state validation, and comprehensive security measures.
 *
 * POST /api/calendar/oauth/[provider]/authorize
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import {
  CalendarOAuthService,
  type CalendarProvider,
} from '@/lib/calendar/oauth-service';

// Input validation schema
const AuthorizeRequestSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  returnUrl: z.string().url().optional(),
  setPrimary: z.boolean().default(false),
  syncDirection: z
    .enum(['import_only', 'export_only', 'bidirectional'])
    .default('bidirectional'),
});

// Provider validation
const SUPPORTED_PROVIDERS: CalendarProvider[] = ['google', 'outlook', 'apple'];

// Rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware
 */
async function checkRateLimit(
  request: NextRequest,
  key: string,
): Promise<boolean> {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5; // 5 OAuth attempts per IP per 15min

  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (existing.count >= maxRequests) {
    return false;
  }

  existing.count += 1;
  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } },
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Rate limiting
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = `oauth_auth:${clientIp}`;

    if (!(await checkRateLimit(request, rateLimitKey))) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // Authentication check
    const session = await getServerSession();
    if (!session?.user || !('id' in session.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Provider validation
    const provider = params.provider as CalendarProvider;
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        {
          error: 'Unsupported provider',
          supportedProviders: SUPPORTED_PROVIDERS,
        },
        { status: 400 },
      );
    }

    // Input validation
    const body = await request.json();
    const validationResult = AuthorizeRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 },
      );
    }

    const { organizationId, returnUrl, setPrimary, syncDirection } =
      validationResult.data;

    // Verify user belongs to the organization
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', (session.user as any).id)
      .single();

    if (
      profileError ||
      !userProfile ||
      userProfile.organization_id !== organizationId
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Generate OAuth authorization URL
    const authResult = await CalendarOAuthService.generateAuthUrl(
      provider,
      organizationId,
      (session.user as any).id,
      returnUrl,
    );

    if (!authResult) {
      return NextResponse.json(
        { error: 'Failed to generate OAuth URL' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      authUrl: authResult.url,
      state: authResult.state,
      provider,
      organizationId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('OAuth authorization endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
