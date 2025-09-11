import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import * as sharp from 'sharp';
import * as crypto from 'crypto';
import { rateLimit } from '@/lib/rate-limit';

// Validation schemas
const UploadReceiptSchema = z.object({
  transaction_id: z.string().uuid().optional(),
  wedding_id: z.string().uuid(),
  file_name: z.string().min(1),
  file_type: z
    .string()
    .refine(
      (type) =>
        ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(
          type,
        ),
      { message: 'Only JPEG, PNG, WebP images and PDF files are allowed' },
    ),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const RECEIPT_BUCKET = 'budget-receipts';

// Rate limiting: 10 uploads per minute per user
const UPLOAD_RATE_LIMIT = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await UPLOAD_RATE_LIMIT(request);
    if (rateLimitResult.success === false) {
      return NextResponse.json(
        { error: 'Too many upload attempts. Please try again later.' },
        { status: 429 },
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const transactionId = formData.get('transaction_id') as string;
    const weddingId = formData.get('wedding_id') as string;

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!weddingId) {
      return NextResponse.json(
        { error: 'wedding_id is required' },
        { status: 400 },
      );
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB allowed`,
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Only ${ALLOWED_TYPES.join(', ')} are allowed`,
        },
        { status: 400 },
      );
    }

    // Check user has access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!['owner', 'partner', 'planner', 'family'].includes(teamMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to upload receipts' },
        { status: 403 },
      );
    }

    // If transaction_id is provided, verify it belongs to this wedding
    if (transactionId) {
      const { data: transaction, error: transactionError } = await supabase
        .from('budget_transactions')
        .select('id, wedding_id')
        .eq('id', transactionId)
        .eq('wedding_id', weddingId)
        .single();

      if (transactionError || !transaction) {
        return NextResponse.json(
          {
            error:
              'Budget transaction not found or does not belong to this wedding',
          },
          { status: 404 },
        );
      }
    }

    // Process file
    const fileBuffer = await file.arrayBuffer();
    let processedBuffer = Buffer.from(fileBuffer);
    let contentType = file.type;
    let fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

    // Optimize images using Sharp
    if (file.type.startsWith('image/')) {
      try {
        const image = sharp(processedBuffer);
        const metadata = await image.metadata();

        // Compress and resize if necessary
        let processedImage = image;

        // Resize if image is too large (max 2000px width/height)
        if (metadata.width && metadata.width > 2000) {
          processedImage = processedImage.resize(2000, null, {
            withoutEnlargement: true,
            fit: 'inside',
          });
        }

        if (metadata.height && metadata.height > 2000) {
          processedImage = processedImage.resize(null, 2000, {
            withoutEnlargement: true,
            fit: 'inside',
          });
        }

        // Convert to WebP for better compression (except if original is PNG with transparency)
        const hasAlpha = metadata.hasAlpha;
        if (!hasAlpha || file.type !== 'image/png') {
          processedBuffer = Buffer.from(
            await processedImage.webp({ quality: 85, effort: 4 }).toBuffer(),
          );
          contentType = 'image/webp';
          fileExtension = 'webp';
        } else {
          // Keep PNG for images with transparency but compress
          processedBuffer = Buffer.from(
            await processedImage.png({ compressionLevel: 8 }).toBuffer(),
          );
        }
      } catch (imageError) {
        console.error('Image processing error:', imageError);
        // Fall back to original file if processing fails
        processedBuffer = Buffer.from(fileBuffer);
      }
    }

    // Generate secure filename with path traversal protection
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().replace(/-/g, '');
    // Aggressive sanitization to prevent path traversal
    const sanitizedFileName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars
      .replace(/\.\./g, '_') // Prevent path traversal
      .replace(/^\./, '_') // Remove leading dots
      .substring(0, 50); // Limit length

    // Use UUID for wedding folder to prevent enumeration
    const secureWeddingPath = `receipts/${weddingId.replace(/-/g, '')}`;
    const uniqueFileName = `${secureWeddingPath}/${timestamp}_${randomId}_${sanitizedFileName}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .upload(uniqueFileName, processedBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 },
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(RECEIPT_BUCKET).getPublicUrl(uniqueFileName);

    // If transaction_id provided, update the transaction with receipt URL
    if (transactionId) {
      // Update budget transaction with receipt URL and filename
      const { error: updateError } = await supabase
        .from('budget_transactions')
        .update({
          receipt_url: publicUrl,
          receipt_filename: file.name,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error(
          'Error updating transaction with receipt URL:',
          updateError,
        );
        // Don't fail the upload, just warn
        console.warn(
          'Receipt uploaded successfully but failed to link to transaction',
        );
      }
    }

    // Store receipt metadata in database
    const { data: receiptRecord, error: dbError } = await supabase
      .from('budget_receipts')
      .insert([
        {
          wedding_id: weddingId,
          transaction_id: transactionId || null,
          filename: file.name,
          storage_path: uniqueFileName,
          content_type: contentType,
          file_size: processedBuffer.length,
          public_url: publicUrl,
          uploaded_by: user.id,
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Receipt database error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from(RECEIPT_BUCKET).remove([uniqueFileName]);

      return NextResponse.json(
        { error: 'Failed to save receipt metadata' },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: weddingId,
      action: 'upload_budget_receipt',
      resource_type: 'budget_receipt',
      resource_id: receiptRecord.id,
      metadata: {
        filename: file.name,
        file_size: processedBuffer.length,
        content_type: contentType,
        transaction_id: transactionId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: receiptRecord.id,
          filename: receiptRecord.filename,
          url: receiptRecord.public_url,
          size: receiptRecord.file_size,
          content_type: receiptRecord.content_type,
          created_at: receiptRecord.created_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/receipts/upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      },
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get parameters
    const { searchParams } = new URL(request.url);
    const receiptId = searchParams.get('id');
    const storagePath = searchParams.get('storage_path');
    const transactionId = searchParams.get('transaction_id');
    const receiptUrl = searchParams.get('receipt_url');

    if (!receiptId && !storagePath) {
      return NextResponse.json(
        { error: 'Either receipt ID or storage_path is required' },
        { status: 400 },
      );
    }

    let receipt;

    // Get receipt details
    if (receiptId) {
      const { data: receiptData, error: receiptError } = await supabase
        .from('budget_receipts')
        .select('id, wedding_id, storage_path, filename, transaction_id')
        .eq('id', receiptId)
        .single();

      if (receiptError || !receiptData) {
        return NextResponse.json(
          { error: 'Receipt not found' },
          { status: 404 },
        );
      }
      receipt = receiptData;
    } else {
      // Legacy approach using storage_path
      const weddingId = storagePath.split('/')[0];
      receipt = { wedding_id: weddingId, storage_path: storagePath };
    }

    // Check user has access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', receipt.wedding_id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!['owner', 'partner', 'planner'].includes(teamMember.role)) {
      return NextResponse.json(
        { error: 'Only wedding owners/partners/planners can delete receipts' },
        { status: 403 },
      );
    }

    // Remove from storage
    const { error: storageError } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .remove([receipt.storage_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    // Remove receipt URL from transaction if linked
    if (receipt.transaction_id) {
      await supabase
        .from('budget_transactions')
        .update({
          receipt_url: null,
          receipt_filename: null,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', receipt.transaction_id);
    }

    // Delete from database
    let dbError;
    if (receiptId) {
      const { error } = await supabase
        .from('budget_receipts')
        .delete()
        .eq('id', receiptId);
      dbError = error;
    }

    if (dbError) {
      console.error('Receipt database deletion error:', dbError);
      return NextResponse.json(
        { error: 'Failed to delete receipt' },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: receipt.wedding_id,
      action: 'delete_budget_receipt',
      resource_type: 'budget_receipt',
      resource_id: receiptId || 'legacy',
      metadata: {
        filename: receipt.filename || 'unknown',
        transaction_id: receipt.transaction_id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Receipt deleted successfully',
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/receipts/upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Get receipt info/metadata
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      },
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transaction_id');
    const weddingId = searchParams.get('wedding_id');

    if (!transactionId && !weddingId) {
      return NextResponse.json(
        { error: 'Either transaction_id or wedding_id is required' },
        { status: 400 },
      );
    }

    // Check user has access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let query = supabase
      .from('budget_receipts')
      .select(
        `
        id,
        filename,
        storage_path,
        content_type,
        file_size,
        public_url,
        transaction_id,
        created_at,
        budget_transactions(
          id,
          description,
          amount
        )
      `,
      )
      .eq('wedding_id', weddingId);

    if (transactionId) {
      query = query.eq('transaction_id', transactionId);
    }

    const { data: receipts, error } = await query;

    if (error) {
      console.error('Error fetching receipts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch receipts' },
        { status: 500 },
      );
    }

    // Format receipts data
    const formattedReceipts =
      receipts?.map((receipt) => ({
        id: receipt.id,
        filename: receipt.filename,
        url: receipt.public_url,
        storage_path: receipt.storage_path,
        content_type: receipt.content_type,
        file_size: receipt.file_size,
        transaction_id: receipt.transaction_id,
        transaction_description: receipt.budget_transactions?.[0]?.description,
        transaction_amount: receipt.budget_transactions?.[0]?.amount,
        created_at: receipt.created_at,
      })) || [];

    return NextResponse.json({
      success: true,
      data: {
        receipts: formattedReceipts,
        count: formattedReceipts.length,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/receipts/upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
