/**
 * WedSync P0 Security: Encryption Test API Endpoint
 *
 * SECURITY LEVEL: P0 - CRITICAL
 * PURPOSE: Test encryption functionality
 *
 * @description API endpoint for testing field-level encryption
 * @version 2.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { weddingEncryptionEngine } from '@/lib/security/encryption';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientComponentClient();

    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant ID from user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    const tenantId = profile?.organization_id || session.user.id;

    // Get test data from request
    const body = await request.json();
    const { guestName, email, phone } = body;

    // Encrypt each field
    const encryptedName = await weddingEncryptionEngine.encryptField(
      tenantId,
      'guestName',
      guestName,
    );

    const encryptedEmail = await weddingEncryptionEngine.encryptField(
      tenantId,
      'email',
      email,
    );

    const encryptedPhone = await weddingEncryptionEngine.encryptField(
      tenantId,
      'phone',
      phone,
    );

    // Store in database (simulation)
    const storedData = {
      guestName: encryptedName,
      email: encryptedEmail,
      phone: encryptedPhone,
    };

    // Return encrypted data for verification
    return NextResponse.json({
      success: true,
      tenantId,
      stored: JSON.stringify(storedData).substring(0, 100), // First 100 chars for verification
      encrypted: {
        guestName: encryptedName.encrypted.substring(0, 20) + '...',
        email: encryptedEmail.encrypted.substring(0, 20) + '...',
        phone: encryptedPhone.encrypted.substring(0, 20) + '...',
      },
      metadata: {
        algorithm: encryptedName.metadata.algorithm,
        version: encryptedName.metadata.version,
        keyId: encryptedName.metadata.keyId,
      },
    });
  } catch (error) {
    console.error('Encryption test failed:', error);
    return NextResponse.json(
      {
        error: 'Encryption test failed',
        message:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
