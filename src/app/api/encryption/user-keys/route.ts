import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { AdvancedEncryption } from '@/lib/security/advanced-encryption';
import { z } from 'zod';

const userKeySetupSchema = z.object({
  userId: z.string().uuid(),
  clientPublicKey: z.string(),
  passwordHash: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const validation = userKeySetupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { userId, clientPublicKey, passwordHash } = validation.data;

    // Verify user can only setup their own keys
    if (userId !== session.user.id) {
      return NextResponse.json(
        {
          error: 'Cannot setup keys for other users',
        },
        { status: 403 },
      );
    }

    // Initialize encryption service
    const encryption = new AdvancedEncryption();

    // Check if keys already exist
    const { data: existingKeys } = await supabase
      .from('user_encryption_keys')
      .select('user_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (existingKeys) {
      return NextResponse.json(
        {
          error: 'Encryption keys already exist for this user',
        },
        { status: 409 },
      );
    }

    // Generate and store user keys
    const startTime = Date.now();
    const keys = await encryption.generateUserKeys(userId);
    const generationTime = Date.now() - startTime;

    // Record performance metrics
    await encryption.recordPerformanceMetric(
      'key_generation',
      'user_encryption_keys',
      'public_key',
      JSON.stringify(keys).length,
      generationTime,
      userId,
    );

    // Audit the operation
    await supabase.from('encryption_audit').insert({
      user_id: userId,
      operation: 'key_setup',
      field_reference: 'user_encryption_keys',
      success: true,
      ip_address:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      publicKey: keys.publicKey,
      version: keys.version,
      message: 'Encryption keys successfully generated',
    });
  } catch (error) {
    console.error('User key setup error:', error);

    // Audit failed operation
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      await supabase.from('encryption_audit').insert({
        user_id: session.user.id,
        operation: 'key_setup',
        field_reference: 'user_encryption_keys',
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        ip_address:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to setup encryption keys',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's active encryption keys
    const { data: keys, error } = await supabase
      .from('user_encryption_keys')
      .select(
        'public_key, key_version, algorithm, created_at, rotated_at, status',
      )
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    if (error || !keys) {
      return NextResponse.json(
        {
          error: 'No active encryption keys found',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      publicKey: keys.public_key,
      version: keys.key_version,
      algorithm: keys.algorithm,
      createdAt: keys.created_at,
      rotatedAt: keys.rotated_at,
      status: keys.status,
    });
  } catch (error) {
    console.error('Get user keys error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve encryption keys',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
