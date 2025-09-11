import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { BrandUploadResponse, BRAND_ASSET_CONSTRAINTS } from '@/types/branding';

// Create Supabase client
async function createSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      (() => {
        throw new Error(
          'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
        );
      })(),
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      (() => {
        throw new Error(
          'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
        );
      })(),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );
}

// Get current user from session
async function getCurrentUser(supabase: any) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Validate file type and size
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size (5MB max)
  if (file.size > BRAND_ASSET_CONSTRAINTS.maxFileSize) {
    return {
      valid: false,
      error: `File size must be less than ${BRAND_ASSET_CONSTRAINTS.maxFileSize / (1024 * 1024)}MB`,
    };
  }

  // Check file type
  if (!BRAND_ASSET_CONSTRAINTS.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, SVG, and WebP files are allowed',
    };
  }

  return { valid: true };
}

// Generate unique filename
function generateFileName(
  originalName: string,
  organizationId: string,
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `${organizationId}/brand-assets/${timestamp}-${random}.${extension}`;
}

// POST - Upload brand asset
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();
    const user = await getCurrentUser(supabase);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'logo' | 'banner' | 'icon'
    const brandId = formData.get('brandId') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      );
    }

    if (!type || !['logo', 'banner', 'icon', 'background'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid asset type' },
        { status: 400 },
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 },
      );
    }

    // If brandId is provided, verify it belongs to the organization
    if (brandId) {
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('id')
        .eq('id', brandId)
        .eq('organization_id', userProfile.organization_id)
        .single();

      if (brandError || !brand) {
        return NextResponse.json(
          { success: false, error: 'Brand not found' },
          { status: 404 },
        );
      }
    }

    // Generate unique filename
    const fileName = generateFileName(file.name, userProfile.organization_id);

    // Convert File to ArrayBuffer for upload
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(fileArrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('brand-assets')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload file' },
        { status: 500 },
      );
    }

    // Get public URL for the uploaded file
    const {
      data: { publicUrl },
    } = supabase.storage.from('brand-assets').getPublicUrl(fileName);

    // Create brand asset record
    const { data: assetData, error: assetError } = await supabase
      .from('brand_assets')
      .insert({
        brand_id: brandId || null,
        organization_id: userProfile.organization_id,
        type: type,
        filename: file.name,
        storage_path: fileName,
        url: publicUrl,
        size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (assetError) {
      console.error('Error creating asset record:', assetError);

      // Clean up uploaded file if database insert fails
      await supabase.storage.from('brand-assets').remove([fileName]);

      return NextResponse.json(
        { success: false, error: 'Failed to save asset information' },
        { status: 500 },
      );
    }

    // If this is a logo upload and brandId is provided, update the brand record
    if (type === 'logo' && brandId) {
      const { error: updateError } = await supabase
        .from('brands')
        .update({
          logo_url: publicUrl,
          logo_file_id: assetData.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', brandId);

      if (updateError) {
        console.error('Error updating brand with logo:', updateError);
        // Note: We don't fail the request here, just log the error
      }
    }

    // Transform response to match BrandAsset interface
    const response: BrandUploadResponse = {
      success: true,
      asset: {
        id: assetData.id,
        brandId: assetData.brand_id,
        type: assetData.type,
        filename: assetData.filename,
        url: assetData.url,
        size: assetData.size,
        mimeType: assetData.mime_type,
        uploadedAt: assetData.uploaded_at,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/branding/upload:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE - Remove brand asset
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();
    const user = await getCurrentUser(supabase);

    // Get asset ID from URL
    const url = new URL(request.url);
    const assetId = url.searchParams.get('id');

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: 'Asset ID is required' },
        { status: 400 },
      );
    }

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Get asset details
    const { data: asset, error: assetError } = await supabase
      .from('brand_assets')
      .select('*')
      .eq('id', assetId)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 },
      );
    }

    // Remove from storage
    const { error: storageError } = await supabase.storage
      .from('brand-assets')
      .remove([asset.storage_path]);

    if (storageError) {
      console.error('Error removing file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Remove from database
    const { error: deleteError } = await supabase
      .from('brand_assets')
      .delete()
      .eq('id', assetId);

    if (deleteError) {
      console.error('Error deleting asset record:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete asset' },
        { status: 500 },
      );
    }

    // If this was a brand logo, clear the logo reference
    if (asset.brand_id && asset.type === 'logo') {
      await supabase
        .from('brands')
        .update({
          logo_url: null,
          logo_file_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', asset.brand_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/branding/upload:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
