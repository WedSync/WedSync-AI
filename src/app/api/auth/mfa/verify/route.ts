import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { mfaService } from '@/lib/auth/mfa';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { factorId, challengeId, code } = body;

    if (!factorId || !challengeId || !code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid code format. Must be 6 digits.' },
        { status: 400 },
      );
    }

    const result = await mfaService.verify(
      factorId,
      challengeId,
      code,
      user.id,
    );

    if (result.error) {
      // Check if account is locked
      if (result.error.message.includes('locked')) {
        return NextResponse.json(
          {
            error: 'ACCOUNT_LOCKED',
            message: result.error.message,
            lockoutDuration: 1800, // 30 minutes in seconds
          },
          { status: 423 }, // Locked status
        );
      }

      return NextResponse.json(
        { error: result.error.message },
        { status: 400 },
      );
    }

    // Set AAL2 session cookie
    const response = NextResponse.json({
      success: true,
      data: result.data,
      message: 'MFA verification successful',
    });

    // Set secure session cookie indicating AAL2
    response.cookies.set('aal-level', 'aal2', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 60, // 30 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('MFA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify MFA code' },
      { status: 500 },
    );
  }
}
