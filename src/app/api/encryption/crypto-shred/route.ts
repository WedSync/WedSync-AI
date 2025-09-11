import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { AdvancedEncryption } from '@/lib/security/advanced-encryption';
import { z } from 'zod';
import * as crypto from 'crypto';

const cryptoShredSchema = z.object({
  userId: z.string().uuid(),
  confirmationToken: z.string(),
  reason: z.enum(['user_request', 'gdpr_compliance', 'security_incident']),
});

export async function DELETE(request: NextRequest) {
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
    const validation = cryptoShredSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { userId, confirmationToken, reason } = validation.data;

    // Verify user can only shred their own keys (unless admin for security incident)
    const isAdmin = await checkAdminStatus(session.user.id, supabase);

    if (
      userId !== session.user.id &&
      (!isAdmin || reason !== 'security_incident')
    ) {
      return NextResponse.json(
        {
          error: 'Cannot perform crypto-shredding for other users',
        },
        { status: 403 },
      );
    }

    // Verify confirmation token (should be a hash of "DELETE MY ACCOUNT" or similar)
    const expectedToken = crypto
      .createHash('sha256')
      .update(`DELETE-${userId}-PERMANENTLY`)
      .digest('hex');

    if (confirmationToken !== expectedToken) {
      return NextResponse.json(
        {
          error: 'Invalid confirmation token',
          hint: 'Token should be SHA256 hash of "DELETE-{userId}-PERMANENTLY"',
        },
        { status: 400 },
      );
    }

    // Check if already shredded
    const { data: existingShred } = await supabase
      .from('shredded_keys')
      .select('shredded_at')
      .eq('user_id', userId)
      .single();

    if (existingShred) {
      return NextResponse.json(
        {
          error: 'Keys have already been crypto-shredded',
          shreddedAt: existingShred.shredded_at,
        },
        { status: 409 },
      );
    }

    // Initialize encryption service
    const encryption = new AdvancedEncryption();

    // Perform crypto-shredding
    const startTime = Date.now();
    await encryption.cryptoShred(userId, reason);
    const shredTime = Date.now() - startTime;

    // Verify shredding was successful
    const verificationResult = await supabase.rpc('verify_crypto_shred', {
      target_user_id: userId,
    });

    if (
      !verificationResult.data?.keys_shredded ||
      verificationResult.data?.data_recoverable
    ) {
      throw new Error('Crypto-shredding verification failed');
    }

    // Record performance metrics
    await encryption.recordPerformanceMetric(
      'crypto_shred',
      'all_tables',
      'all_fields',
      0, // No data size after shredding
      shredTime,
      session.user.id,
    );

    // Send notification to user (if not already deleted)
    if (reason === 'gdpr_compliance' || reason === 'user_request') {
      // In production, send email confirmation of data deletion
      console.log(`GDPR deletion completed for user ${userId}`);
    }

    return NextResponse.json({
      success: true,
      message: 'All encryption keys permanently destroyed',
      userId,
      reason,
      shredTimeMs: shredTime,
      dataRecoverable: false,
      gdprCompliant: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Crypto-shredding error:', error);

    // Audit failed operation
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      await supabase.from('encryption_audit').insert({
        user_id: session.user.id,
        operation: 'crypto_shred_failed',
        field_reference: 'all_user_data',
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
        error: 'Failed to perform crypto-shredding',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// GET endpoint to verify if keys have been shredded
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

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId') || session.user.id;

    // Verify user can only check their own shred status (unless admin)
    const isAdmin = await checkAdminStatus(session.user.id, supabase);

    if (targetUserId !== session.user.id && !isAdmin) {
      return NextResponse.json(
        {
          error: 'Cannot check shred status for other users',
        },
        { status: 403 },
      );
    }

    // Check shred status
    const encryption = new AdvancedEncryption();
    const shredAudit = await encryption.getShredAudit(targetUserId);

    if (!shredAudit) {
      return NextResponse.json({
        shredded: false,
        message: 'Keys have not been crypto-shredded',
      });
    }

    // Verify current state
    const verificationResult = await supabase.rpc('verify_crypto_shred', {
      target_user_id: targetUserId,
    });

    return NextResponse.json({
      shredded: true,
      reason: shredAudit.reason,
      shreddedAt: shredAudit.shredded_at,
      dataRecoverable: verificationResult.data?.data_recoverable || false,
      activeKeys: verificationResult.data?.active_keys || false,
      encryptedFieldsCount:
        verificationResult.data?.encrypted_fields_count || 0,
    });
  } catch (error) {
    console.error('Get shred status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve shred status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Helper function to check admin status
async function checkAdminStatus(
  userId: string,
  supabase: any,
): Promise<boolean> {
  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return data?.role === 'admin';
}
