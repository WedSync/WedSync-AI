import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { AdvancedEncryption } from '@/lib/security/advanced-encryption';
import { z } from 'zod';

const fieldEncryptionSchema = z.object({
  tableId: z.string(),
  fieldName: z.string(),
  recordId: z.string().uuid(),
  plaintext: z.string(),
  userEncryptionKey: z.string(),
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
    const validation = fieldEncryptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { tableId, fieldName, recordId, plaintext, userEncryptionKey } =
      validation.data;

    // Get user's public key
    const { data: keyData, error: keyError } = await supabase
      .from('user_encryption_keys')
      .select('public_key, key_version')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    if (keyError || !keyData) {
      return NextResponse.json(
        {
          error: 'No active encryption keys found for user',
        },
        { status: 404 },
      );
    }

    // Initialize encryption service
    const encryption = new AdvancedEncryption();

    // Measure encryption performance
    const startTime = Date.now();
    const dataSizeBytes = Buffer.byteLength(plaintext, 'utf8');

    // Encrypt the field
    const encryptedField = await encryption.encryptField(
      plaintext,
      keyData.public_key,
      fieldName,
    );

    const encryptionTime = Date.now() - startTime;

    // Store encrypted field in database
    const { error: insertError } = await supabase
      .from('encrypted_fields')
      .upsert(
        {
          table_name: tableId,
          column_name: fieldName,
          record_id: recordId,
          encrypted_value: encryptedField.ciphertext,
          encryption_key_id: session.user.id,
          nonce: Buffer.from(encryptedField.nonce, 'base64'),
        },
        {
          onConflict: 'table_name,column_name,record_id',
        },
      );

    if (insertError) {
      throw new Error(
        `Failed to store encrypted field: ${insertError.message}`,
      );
    }

    // Record performance metrics
    await encryption.recordPerformanceMetric(
      'encrypt',
      tableId,
      fieldName,
      dataSizeBytes,
      encryptionTime,
      session.user.id,
    );

    // Audit the operation
    await supabase.from('encryption_audit').insert({
      user_id: session.user.id,
      operation: 'field_encryption',
      field_reference: `${tableId}.${fieldName}`,
      success: true,
      ip_address:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      fieldId: `${tableId}.${fieldName}.${recordId}`,
      encrypted: true,
      algorithm: encryptedField.algorithm,
      keyVersion: encryptedField.keyVersion,
      encryptionTimeMs: encryptionTime,
      message: 'Field encrypted successfully',
    });
  } catch (error) {
    console.error('Field encryption error:', error);

    // Audit failed operation
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      await supabase.from('encryption_audit').insert({
        user_id: session.user.id,
        operation: 'field_encryption',
        field_reference: 'unknown',
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
        error: 'Failed to encrypt field',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
