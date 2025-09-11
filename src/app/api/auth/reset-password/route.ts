import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { emailServiceConnector } from '@/lib/services/email-connector';
import bcrypt from 'bcryptjs';
import { ratelimit } from '@/lib/ratelimit';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Reset Password API
 * POST /api/auth/reset-password
 * Validates reset token and updates user password
 */
export async function POST(request: NextRequest) {
  try {
    const { token, password, confirmPassword } = await request.json();

    // Validate input
    if (!token || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Token, password, and password confirmation are required' },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 },
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          error: 'Password does not meet security requirements',
          requirements: passwordValidation.requirements,
        },
        { status: 400 },
      );
    }

    // Rate limiting - max 5 reset attempts per hour per IP
    const identifier = getClientIP(request) || 'anonymous';
    const { success, limit, reset, remaining } = await ratelimit.limit(
      `password_reset_complete:${identifier}`,
    );

    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many password reset attempts. Please try again later.',
          retry_after: Math.round((reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(reset).toISOString(),
          },
        },
      );
    }

    // Validate reset token
    const { data: resetTokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !resetTokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 },
      );
    }

    // Check token expiration
    const now = new Date();
    const expiresAt = new Date(resetTokenData.expires_at);

    if (now > expiresAt) {
      // Mark token as expired
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token);

      return NextResponse.json(
        {
          error:
            'Reset token has expired. Please request a new password reset.',
        },
        { status: 400 },
      );
    }

    // Get user information
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', resetTokenData.user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    try {
      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user password
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password: hashedPassword,
          password_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error('Failed to update password');
      }

      // Mark token as used
      await supabase
        .from('password_reset_tokens')
        .update({
          used: true,
          used_at: new Date().toISOString(),
        })
        .eq('token', token);

      // Invalidate all existing sessions for this user (optional security measure)
      await supabase
        .from('sessions')
        .update({
          expires: new Date().toISOString(), // Expire immediately
        })
        .eq('userId', user.id);

      // Log successful password reset
      await supabase.from('security_events').insert({
        event_type: 'password_reset_completed',
        user_id: user.id,
        ip_address: getClientIP(request),
        user_agent: request.headers.get('user-agent'),
        event_data: {
          email: user.email,
          timestamp: new Date().toISOString(),
          token_used: token.substring(0, 8) + '...', // Log partial token for debugging
        },
      });

      // Send confirmation email
      try {
        await emailServiceConnector.sendEmail({
          template_id: 'password_reset_confirmation',
          recipient: {
            email: user.email,
            name: user.name || 'User',
          },
          variables: {
            user_name: user.name || 'there',
            user_email: user.email,
            reset_time: new Date().toLocaleString(),
            ip_address: getClientIP(request) || 'Unknown',
            user_agent: request.headers.get('user-agent') || 'Unknown',
            support_email: process.env.SUPPORT_EMAIL || 'support@wedsync.co',
            login_url: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
          },
          priority: 'high',
          track_opens: false,
          track_clicks: false,
        });
      } catch (emailError) {
        console.error('Error sending password reset confirmation:', emailError);
        // Don't fail the request if confirmation email fails
      }

      console.log(`Password successfully reset for user: ${user.email}`);

      return NextResponse.json({
        message:
          'Password has been successfully reset. You can now log in with your new password.',
        success: true,
      });
    } catch (updateError) {
      console.error('Password update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Reset password API error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 },
    );
  }
}

/**
 * Verify Reset Token (GET request)
 * GET /api/auth/reset-password?token=<token>
 * Validates reset token without consuming it
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 },
      );
    }

    // Validate reset token
    const { data: resetTokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('user_id, email, expires_at, used')
      .eq('token', token)
      .single();

    if (tokenError || !resetTokenData) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid reset token',
        },
        { status: 400 },
      );
    }

    if (resetTokenData.used) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Reset token has already been used',
        },
        { status: 400 },
      );
    }

    // Check token expiration
    const now = new Date();
    const expiresAt = new Date(resetTokenData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Reset token has expired',
        },
        { status: 400 },
      );
    }

    // Return token validity info
    const minutesUntilExpiry = Math.round(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60),
    );

    return NextResponse.json({
      valid: true,
      email: resetTokenData.email,
      expires_in_minutes: minutesUntilExpiry,
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Validate password strength
 */
function validatePassword(password: string): {
  valid: boolean;
  requirements: string[];
} {
  const requirements = [];

  if (password.length < 8) {
    requirements.push('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    requirements.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    requirements.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    requirements.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    requirements.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password',
    '123456',
    'qwerty',
    'abc123',
    'password123',
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    requirements.push(
      'Password is too common. Please choose a more secure password',
    );
  }

  return {
    valid: requirements.length === 0,
    requirements,
  };
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string | null {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');

  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  if (xRealIp) {
    return xRealIp;
  }

  return request.ip || null;
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
