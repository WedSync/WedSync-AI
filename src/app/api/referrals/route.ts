import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, rateLimitConfigs } from '@/lib/rate-limit';
import { z } from 'zod';
import {
  ReferralEngine,
  CreateProgramRequest,
} from '@/lib/referrals/referral-engine';
import DOMPurify from 'isomorphic-dompurify';

// Validation schemas
const createProgramSchema = z.object({
  name: z.string().min(1).max(100),
  rewardType: z.enum(['monetary', 'percentage', 'upgrade', 'custom']),
  referrerRewardAmount: z.number().min(0),
  refereeRewardAmount: z.number().min(0),
  milestoneRewards: z.record(z.string(), z.number()).optional(),
  attributionWindowDays: z.number().min(1).max(365).optional(),
  expiresAt: z.string().optional(),
});

// Comprehensive input sanitization for referral data
function sanitizeReferralData(data: any): any {
  if (typeof data === 'string') {
    return DOMPurify.sanitize(data, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeReferralData);
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeReferralData(value);
    }
    return sanitized;
  }

  return data;
}

// GET /api/referrals/programs
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, rateLimitConfigs.api);
    if (rateLimitResult) return rateLimitResult;

    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's supplier ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('supplier_id, organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.supplier_id) {
      return NextResponse.json(
        { error: 'No supplier profile found' },
        { status: 400 },
      );
    }

    // Fetch referral programs for this supplier
    const { data: programs, error } = await supabase
      .from('referral_programs')
      .select(
        `
        id,
        name,
        reward_type,
        referrer_reward_amount,
        referee_reward_amount,
        milestone_rewards,
        attribution_window_days,
        is_active,
        expires_at,
        created_at,
        updated_at
      `,
      )
      .eq('supplier_id', profile.supplier_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      programs: programs || [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Error fetching referral programs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral programs' },
      { status: 500 },
    );
  }
}

// POST /api/referrals/programs
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, rateLimitConfigs.api);
    if (rateLimitResult) return rateLimitResult;

    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's supplier ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('supplier_id, organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.supplier_id) {
      return NextResponse.json(
        { error: 'No supplier profile found' },
        { status: 400 },
      );
    }

    const rawBody = await request.json();

    // Sanitize input data first
    const sanitizedBody = sanitizeReferralData(rawBody);

    // Validate sanitized request body
    const validatedData = createProgramSchema.parse(sanitizedBody);

    // Initialize referral engine
    const referralEngine = new ReferralEngine();

    // Create program using the referral engine
    const program = await referralEngine.createProgram(
      profile.supplier_id,
      validatedData as CreateProgramRequest,
    );

    return NextResponse.json(program);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Error creating referral program:', error);
    return NextResponse.json(
      { error: 'Failed to create referral program' },
      { status: 500 },
    );
  }
}
