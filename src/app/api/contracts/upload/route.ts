import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import crypto from 'crypto';

const uploadSchema = z.object({
  contract_id: z.string().uuid(),
  document_type: z.enum(['original', 'signed', 'amendment']),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  security_level: z
    .enum(['low', 'standard', 'high', 'critical'])
    .default('standard'),
  is_compliance_required: z.boolean().default(false),
  expiry_date: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user's organization
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = JSON.parse(formData.get('metadata') as string);

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate metadata
    const validatedMetadata = uploadSchema.parse(metadata);

    // Verify contract exists and user has access
    const { data: contract } = await supabase
      .from('wedding_contracts')
      .select('id, title, contract_number')
      .eq('id', validatedMetadata.contract_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 },
      );
    }

    // Validate file type (only allow PDFs for contracts)
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Only PDF files are allowed for contracts.',
        },
        { status: 400 },
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File too large. Maximum size is 50MB.',
        },
        { status: 400 },
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomId = crypto.randomBytes(8).toString('hex');
    const storedFilename = `contract-${contract.contract_number}-${validatedMetadata.document_type}-${timestamp}-${randomId}.${fileExtension}`;

    // Create file path in storage
    const filePath = `contracts/${profile.organization_id}/${contract.id}/${storedFilename}`;

    // Convert file to ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    // Calculate file hash for integrity verification
    const fileHash = crypto
      .createHash('sha256')
      .update(fileBytes)
      .digest('hex');

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(filePath, fileBytes, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 },
      );
    }

    // Get contract category for document categorization
    const { data: contractWithCategory } = await supabase
      .from('wedding_contracts')
      .select('category_id, contract_categories(name)')
      .eq('id', validatedMetadata.contract_id)
      .single();

    // Find or create appropriate document category
    let documentCategoryId = null;
    const { data: docCategory } = await supabase
      .from('document_categories')
      .select('id')
      .eq('name', 'contracts_agreements')
      .single();

    if (docCategory) {
      documentCategoryId = docCategory.id;
    }

    // Create document record
    const documentData = {
      user_id: user.id,
      category_id: documentCategoryId,
      original_filename: file.name,
      stored_filename: storedFilename,
      file_path: filePath,
      mime_type: file.type,
      file_size: file.size,
      file_hash: fileHash,
      title: validatedMetadata.title,
      description: validatedMetadata.description,
      security_level: validatedMetadata.security_level,
      is_compliance_required: validatedMetadata.is_compliance_required,
      expiry_date: validatedMetadata.expiry_date
        ? new Date(validatedMetadata.expiry_date).toISOString().split('T')[0]
        : null,
      status: 'active',
      virus_scan_status: 'pending',
    };

    const { data: document, error: docError } = await supabase
      .from('business_documents')
      .insert(documentData)
      .select()
      .single();

    if (docError) {
      console.error('Document creation error:', docError);
      // Clean up uploaded file if document creation fails
      await supabase.storage.from('contracts').remove([filePath]);
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 },
      );
    }

    // Update contract with document reference
    const updateField =
      validatedMetadata.document_type === 'signed'
        ? 'signed_document_id'
        : 'original_document_id';

    await supabase
      .from('wedding_contracts')
      .update({ [updateField]: document.id })
      .eq('id', validatedMetadata.contract_id);

    // If this is a signed document, update contract status
    if (validatedMetadata.document_type === 'signed') {
      await supabase
        .from('wedding_contracts')
        .update({
          signing_status: 'fully_signed',
          signed_date: new Date().toISOString().split('T')[0],
          status: 'active',
        })
        .eq('id', validatedMetadata.contract_id);
    }

    // Parse contract using PDF.js if it's a new contract
    if (validatedMetadata.document_type === 'original') {
      // This would be implemented with a background job or Edge Function
      // For now, we'll just create a placeholder for contract parsing
      console.log(
        'Contract parsing would be triggered here for document:',
        document.id,
      );
    }

    return NextResponse.json(
      {
        document,
        message: 'Contract uploaded successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Contract upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
