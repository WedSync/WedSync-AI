import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for media upload
const mediaUploadSchema = z.object({
  type: z.enum(['logo', 'cover', 'gallery', 'video', 'document']),
  file: z.string(), // Base64 encoded file or URL
  fileName: z.string(),
  mimeType: z.string(),
  caption: z.string().optional(),
  category: z.string().optional(),
  order: z.number().optional(),
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const profileId = params.id;

    // Check authentication
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 },
      );
    }

    // Check if profile exists and belongs to user's organization
    const { data: profile } = await supabase
      .from('directory_supplier_profiles')
      .select('id, organization_id')
      .eq('id', profileId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.organization_id !== userProfile.organization_id) {
      return NextResponse.json(
        { error: 'Unauthorized to upload media' },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = mediaUploadSchema.parse(body);

    // Validate file type based on upload type
    if (
      validatedData.type === 'logo' ||
      validatedData.type === 'cover' ||
      validatedData.type === 'gallery'
    ) {
      if (!ALLOWED_IMAGE_TYPES.includes(validatedData.mimeType)) {
        return NextResponse.json(
          { error: 'Invalid image type' },
          { status: 400 },
        );
      }
    } else if (validatedData.type === 'video') {
      if (!ALLOWED_VIDEO_TYPES.includes(validatedData.mimeType)) {
        return NextResponse.json(
          { error: 'Invalid video type' },
          { status: 400 },
        );
      }
    } else if (validatedData.type === 'document') {
      if (!ALLOWED_DOCUMENT_TYPES.includes(validatedData.mimeType)) {
        return NextResponse.json(
          { error: 'Invalid document type' },
          { status: 400 },
        );
      }
    }

    // Generate file path
    const fileExtension = validatedData.fileName.split('.').pop();
    const timestamp = Date.now();
    const fileName = `${profileId}/${validatedData.type}/${timestamp}.${fileExtension}`;

    // Upload file to Supabase Storage
    let fileUrl = '';

    if (validatedData.file.startsWith('data:')) {
      // Handle base64 encoded file
      const base64Data = validatedData.file.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');

      // Check file size
      if (buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File too large' }, { status: 400 });
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('supplier-media')
        .upload(fileName, buffer, {
          contentType: validatedData.mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('supplier-media').getPublicUrl(fileName);

      fileUrl = publicUrl;
    } else {
      // Handle external URL
      fileUrl = validatedData.file;
    }

    // Update profile based on media type
    let updateData: any = {};

    switch (validatedData.type) {
      case 'logo':
        updateData = { logo_url: fileUrl };
        break;

      case 'cover':
        updateData = { cover_image_url: fileUrl };
        break;

      case 'gallery':
        // Get existing gallery images
        const { data: currentProfile } = await supabase
          .from('directory_supplier_profiles')
          .select('gallery_images')
          .eq('id', profileId)
          .single();

        const galleryImages = currentProfile?.gallery_images || [];
        galleryImages.push({
          url: fileUrl,
          caption: validatedData.caption || '',
          category: validatedData.category || 'general',
          order: validatedData.order || galleryImages.length,
        });

        updateData = { gallery_images: galleryImages };
        break;

      case 'video':
        // Get existing videos
        const { data: profileWithVideos } = await supabase
          .from('directory_supplier_profiles')
          .select('videos')
          .eq('id', profileId)
          .single();

        const videos = profileWithVideos?.videos || [];
        videos.push({
          url: fileUrl,
          title: validatedData.caption || 'Video',
          thumbnail: '', // Could generate thumbnail
          order: validatedData.order || videos.length,
        });

        updateData = { videos: videos };
        break;

      case 'document':
        // Store in documents table for verification
        const { data: document, error: docError } = await supabase
          .from('directory_supplier_documents')
          .insert({
            supplier_profile_id: profileId,
            document_type: validatedData.category || 'other',
            document_name: validatedData.fileName,
            file_url: fileUrl,
            mime_type: validatedData.mimeType,
            verification_status: 'pending',
          })
          .select()
          .single();

        if (docError) {
          console.error('Document save error:', docError);
          throw docError;
        }

        return NextResponse.json({
          success: true,
          document: document,
          message: 'Document uploaded successfully',
        });
    }

    // Update profile with new media
    const { data: updatedProfile, error: updateError } = await supabase
      .from('directory_supplier_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)
      .select()
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      fileUrl: fileUrl,
      profile: updatedProfile,
      message: 'Media uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading media:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const profileId = params.id;

    // Check authentication
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get media URL from request
    const { mediaUrl, mediaType } = await request.json();

    if (!mediaUrl || !mediaType) {
      return NextResponse.json(
        { error: 'Media URL and type required' },
        { status: 400 },
      );
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, organization_id')
      .eq('id', user.id)
      .single();

    // Check if profile belongs to user's organization
    const { data: profile } = await supabase
      .from('directory_supplier_profiles')
      .select('id, organization_id, gallery_images, videos')
      .eq('id', profileId)
      .single();

    if (!profile || profile.organization_id !== userProfile.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Remove media based on type
    let updateData: any = {};

    switch (mediaType) {
      case 'logo':
        updateData = { logo_url: null };
        break;

      case 'cover':
        updateData = { cover_image_url: null };
        break;

      case 'gallery':
        const galleryImages = profile.gallery_images || [];
        const filteredGallery = galleryImages.filter(
          (img: any) => img.url !== mediaUrl,
        );
        updateData = { gallery_images: filteredGallery };
        break;

      case 'video':
        const videos = profile.videos || [];
        const filteredVideos = videos.filter(
          (vid: any) => vid.url !== mediaUrl,
        );
        updateData = { videos: filteredVideos };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid media type' },
          { status: 400 },
        );
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('directory_supplier_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (updateError) {
      throw updateError;
    }

    // Try to delete from storage if it's a local file
    if (mediaUrl.includes('supplier-media')) {
      const pathMatch = mediaUrl.match(/supplier-media\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from('supplier-media').remove([pathMatch[1]]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 },
    );
  }
}
