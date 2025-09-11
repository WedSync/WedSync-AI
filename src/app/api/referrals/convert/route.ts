import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ReferralTrackingService } from '@/services/ReferralTrackingService';
import { rateLimit } from '@/lib/utils/rate-limit';

// Rate limiting: 5 requests per minute per IP
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 unique IPs per minute
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip =
      request.ip || request.headers.get('x-forwarded-for') || 'unknown';

    try {
      await limiter.check(5, ip); // 5 requests per minute per IP
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    const supabase = await createServerClient();
    const body = await request.json();
    const { code, conversionType, referredUserId, metadata } = body;

    // Validate required fields
    if (!code || !conversionType || !referredUserId) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: code, conversionType, referredUserId',
        },
        { status: 400 },
      );
    }

    // Validate conversion type
    const validTypes = [
      'signup_started',
      'account_created',
      'premium_upgrade',
      'first_booking',
    ];
    if (!validTypes.includes(conversionType)) {
      return NextResponse.json(
        { error: 'Invalid conversion type' },
        { status: 400 },
      );
    }

    // Sanitize inputs
    const sanitizedCode = code.replace(/[^A-Z0-9]/g, '');
    const sanitizedUserId = referredUserId.replace(/[^a-zA-Z0-9-]/g, '');

    if (sanitizedCode !== code || sanitizedUserId !== referredUserId) {
      return NextResponse.json(
        { error: 'Invalid characters in input' },
        { status: 400 },
      );
    }

    const referralService = new ReferralTrackingService(supabase);

    // Get IP and user agent for fraud detection
    const userAgent = request.headers.get('user-agent') || '';

    await referralService.trackConversion(
      sanitizedCode,
      conversionType,
      sanitizedUserId,
      metadata,
      ip,
      userAgent,
    );

    return NextResponse.json({
      success: true,
      message: 'Conversion tracked successfully',
    });
  } catch (error: any) {
    console.error('Error tracking conversion:', error);

    if (error.message === 'Invalid or inactive referral code') {
      return NextResponse.json(
        { error: 'Referral code not found or inactive' },
        { status: 404 },
      );
    }

    if (error.message === 'Referral blocked due to suspicious activity') {
      return NextResponse.json(
        { error: 'Conversion blocked for security reasons' },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to track conversion' },
      { status: 500 },
    );
  }
}
