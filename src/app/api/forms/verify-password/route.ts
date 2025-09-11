import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import rateLimit from '@/lib/rate-limit';

// Rate limiting for password verification
const passwordRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100,
});

const verifyPasswordSchema = z.object({
  slug: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting based on IP
    const clientIP =
      request.ip || request.headers.get('x-forwarded-for') || 'anonymous';
    const { success } = await passwordRateLimit.check(5, clientIP); // 5 attempts per minute

    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many password attempts. Please wait before trying again.',
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { slug, password } = verifyPasswordSchema.parse(body);

    const supabase = await createClient();

    // Get form by slug with password settings
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(
        `
        id,
        title,
        sharing_settings,
        status,
        clients!inner(
          id,
          company_name
        )
      `,
      )
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (formError || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Check if form is actually password protected
    if (
      !form.sharing_settings?.password_protected ||
      !form.sharing_settings?.password_hash
    ) {
      return NextResponse.json(
        { error: 'This form is not password protected' },
        { status: 400 },
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      form.sharing_settings.password_hash,
    );

    if (!isPasswordValid) {
      // Log failed attempt for security monitoring
      console.warn(
        `Failed password attempt for form ${form.id} from IP ${clientIP}`,
      );

      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 401 },
      );
    }

    // Generate access token
    // 🔒 SECURITY: Validate JWT_SECRET is configured
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      console.error('🚨 CRITICAL SECURITY ERROR: JWT_SECRET not configured for form password verification');
      return NextResponse.json(
        { error: 'Security configuration error' },
        { status: 500 }
      );
    }
    
    const token = sign(
      {
        formId: form.id,
        slug: slug,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      },
      secret,
    );

    // Log successful access for security monitoring
    console.info(
      `Successful password verification for form ${form.id} from IP ${clientIP}`,
    );

    return NextResponse.json({
      success: true,
      token: token,
      message: 'Password verified successfully',
    });
  } catch (error) {
    console.error('Password verification error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Password verification failed' },
      { status: 500 },
    );
  }
}
