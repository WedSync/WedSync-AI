import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { AdvancedEncryption } from '@/lib/security/advanced-encryption';
import { z } from 'zod';

const keyRotationSchema = z.object({
  userId: z.string().uuid(),
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
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
    const validation = keyRotationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { userId, currentPassword, newPassword } = validation.data;

    // Verify user can only rotate their own keys
    if (userId !== session.user.id) {
      return NextResponse.json(
        {
          error: 'Cannot rotate keys for other users',
        },
        { status: 403 },
      );
    }

    // Check if a rotation is already in progress
    const { data: inProgressRotation } = await supabase
      .from('key_rotation_history')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .single();

    if (inProgressRotation) {
      return NextResponse.json(
        {
          error: 'Key rotation already in progress',
        },
        { status: 409 },
      );
    }

    // Get current keys
    const { data: currentKeys, error: keysError } = await supabase
      .from('user_encryption_keys')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (keysError || !currentKeys) {
      return NextResponse.json(
        {
          error: 'No active encryption keys found',
        },
        { status: 404 },
      );
    }

    // Initialize encryption service
    const encryption = new AdvancedEncryption();

    // Derive key from current password
    const derivedKey = await encryption.deriveKeyFromPassword(
      currentPassword,
      currentKeys.salt.toString('base64'),
    );

    // TODO: Verify derived key matches stored key hash
    // In production, we would verify the password-derived key

    // Start rotation process
    const startTime = Date.now();

    const rotationResult = await encryption.rotateUserKeys(userId, {
      publicKey: currentKeys.public_key,
      privateKey: currentKeys.encrypted_private_key, // In production, decrypt this first
      salt: currentKeys.salt.toString('base64'),
      version: currentKeys.key_version,
    });

    const rotationTime = Date.now() - startTime;

    // Update user password hash with new password
    // This would typically involve re-encrypting the private key with new password
    const newSalt = crypto.randomBytes(32).toString('base64');
    const newDerivedKey = await encryption.deriveKeyFromPassword(
      newPassword,
      newSalt,
    );

    // Record performance metrics
    await encryption.recordPerformanceMetric(
      'key_rotation',
      'user_encryption_keys',
      'all_fields',
      rotationResult.fieldsRotated * 1024, // Estimate
      rotationTime,
      userId,
    );

    // Audit the operation
    await supabase.from('encryption_audit').insert({
      user_id: userId,
      operation: 'key_rotation',
      field_reference: `version_${currentKeys.key_version}_to_${rotationResult.version}`,
      success: true,
      ip_address:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      newVersion: rotationResult.version,
      fieldsRotated: rotationResult.fieldsRotated,
      rotationTimeMs: rotationTime,
      message: 'Encryption keys rotated successfully',
    });
  } catch (error) {
    console.error('Key rotation error:', error);

    // Audit failed operation
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      await supabase.from('encryption_audit').insert({
        user_id: session.user.id,
        operation: 'key_rotation',
        field_reference: 'failed_rotation',
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
        error: 'Failed to rotate encryption keys',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check rotation status
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

    // Get rotation history for user
    const { data: rotations, error } = await supabase
      .from('key_rotation_history')
      .select('*')
      .eq('user_id', session.user.id)
      .order('started_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to fetch rotation history: ${error.message}`);
    }

    return NextResponse.json({
      rotations: rotations || [],
      hasActiveRotation:
        rotations?.some((r) => r.status === 'in_progress') || false,
    });
  } catch (error) {
    console.error('Get rotation status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve rotation history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Missing crypto import
import * as crypto from 'crypto';
