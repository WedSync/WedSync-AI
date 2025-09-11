/**
 * WS-223 Content Media Management API
 * Team B - Secure file upload and media processing system
 *
 * Features:
 * - Secure file upload with validation and scanning
 * - Image optimization and thumbnail generation
 * - Media metadata extraction
 * - Deduplication using file hashes
 * - Virus scanning integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { z } from 'zod';
import crypto from 'crypto';
import sharp from 'sharp';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
);

// File validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];

// Validation schemas
const MediaUploadSchema = z.object({
  alt_text: z.string().optional(),
  caption: z.string().optional(),
  content_id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
});

// Helper functions
function getMediaType(mimeType: string): string {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video';
  if (ALLOWED_AUDIO_TYPES.includes(mimeType)) return 'audio';
  if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) return 'document';
  return 'other';
}

function generateSecureFilename(
  originalFilename: string,
  organizationId: string,
): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const extension = originalFilename.split('.').pop() || '';
  return `${organizationId}/${timestamp}-${random}.${extension}`;
}

async function calculateFileHash(buffer: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function scanFileForViruses(
  buffer: Buffer,
): Promise<{ status: string; details: any }> {
  // Placeholder for virus scanning integration
  // In production, integrate with ClamAV, VirusTotal, or similar service

  // Basic checks for malicious patterns
  const suspiciousPatterns = [
    /eval\s*\(/gi,
    /<script/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
  ];

  const fileContent = buffer.toString('utf8', 0, Math.min(1024, buffer.length));

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fileContent)) {
      return {
        status: 'failed',
        details: {
          reason: 'Suspicious content detected',
          pattern: pattern.source,
        },
      };
    }
  }

  return {
    status: 'passed',
    details: {
      scanned_at: new Date().toISOString(),
      file_size: buffer.length,
    },
  };
}

async function extractImageMetadata(
  buffer: Buffer,
): Promise<{ width?: number; height?: number }> {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    console.error('Failed to extract image metadata:', error);
    return {};
  }
}

async function optimizeImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{
  optimizedBuffer: Buffer;
  thumbnailBuffer: Buffer;
  optimizationData: any;
}> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Optimize main image
    let optimizedBuffer = buffer;
    let compressionRatio = 1;

    if (metadata.width && metadata.width > 2000) {
      // Resize large images
      optimizedBuffer = await image
        .resize(2000, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      compressionRatio = optimizedBuffer.length / buffer.length;
    } else if (mimeType === 'image/jpeg') {
      // Compress JPEG without resizing
      optimizedBuffer = await image.jpeg({ quality: 85 }).toBuffer();

      compressionRatio = optimizedBuffer.length / buffer.length;
    }

    // Generate thumbnail (300x300 max)
    const thumbnailBuffer = await image
      .resize(300, 300, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      optimizedBuffer:
        optimizedBuffer.length < buffer.length ? optimizedBuffer : buffer,
      thumbnailBuffer,
      optimizationData: {
        original_size: buffer.length,
        optimized_size: optimizedBuffer.length,
        compression_ratio: compressionRatio,
        thumbnail_size: thumbnailBuffer.length,
        optimized_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Image optimization failed:', error);
    return {
      optimizedBuffer: buffer,
      thumbnailBuffer: buffer,
      optimizationData: {
        error: 'Optimization failed',
        original_size: buffer.length,
      },
    };
  }
}

/**
 * POST /api/content/media - Upload media files with security and optimization
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        },
        { status: 413 },
      );
    }

    // Validate file type
    if (!ALL_ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed` },
        { status: 415 },
      );
    }

    // Parse additional form data
    const mediaData: any = {};
    for (const [key, value] of formData.entries()) {
      if (key !== 'file') {
        mediaData[key] = value;
      }
    }

    // Validate form data
    const validationResult = MediaUploadSchema.safeParse(mediaData);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid form data',
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { alt_text, caption, content_id, organization_id } =
      validationResult.data;

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Calculate file hash for deduplication
    const fileHash = await calculateFileHash(fileBuffer);

    // Check if file already exists
    const { data: existingFile } = await supabase
      .from('content_media')
      .select('id, file_url, filename')
      .eq('organization_id', organization_id)
      .eq('file_hash', fileHash)
      .single();

    if (existingFile) {
      return NextResponse.json({
        success: true,
        data: {
          media: existingFile,
          message: 'File already exists, using existing version',
        },
      });
    }

    // Security scan
    const scanResult = await scanFileForViruses(fileBuffer);
    if (scanResult.status === 'failed') {
      return NextResponse.json(
        {
          error: 'File failed security scan',
          details: scanResult.details,
        },
        { status: 422 },
      );
    }

    // Generate secure filename
    const secureFilename = generateSecureFilename(file.name, organization_id);
    const mediaType = getMediaType(file.type);

    // Process file based on type
    let finalBuffer = fileBuffer;
    let thumbnailBuffer: Buffer | null = null;
    let optimizationData: any = {};
    let width: number | undefined;
    let height: number | undefined;

    if (mediaType === 'image') {
      // Extract image metadata
      const imageMetadata = await extractImageMetadata(fileBuffer);
      width = imageMetadata.width;
      height = imageMetadata.height;

      // Optimize image
      const optimization = await optimizeImage(fileBuffer, file.type);
      finalBuffer = optimization.optimizedBuffer;
      thumbnailBuffer = optimization.thumbnailBuffer;
      optimizationData = optimization.optimizationData;
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('content-media')
      .upload(secureFilename, finalBuffer, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 },
      );
    }

    // Upload thumbnail if exists
    let thumbnailPath: string | null = null;
    if (thumbnailBuffer) {
      const thumbnailFilename = secureFilename.replace(
        /\.([^.]+)$/,
        '_thumb.jpg',
      );
      const { data: thumbData } = await supabase.storage
        .from('content-media')
        .upload(thumbnailFilename, thumbnailBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (thumbData) {
        thumbnailPath = thumbData.path;
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('content-media')
      .getPublicUrl(uploadData.path);

    // Save media record to database
    const mediaRecord = {
      content_id: content_id || null,
      filename: secureFilename,
      original_filename: file.name,
      file_path: uploadData.path,
      file_url: urlData.publicUrl,
      file_size_bytes: finalBuffer.length,
      mime_type: file.type,
      file_hash: fileHash,
      media_type: mediaType,
      width,
      height,
      alt_text: alt_text || null,
      caption: caption || null,
      organization_id,
      security_scan_status: scanResult.status,
      scan_details: scanResult.details,
      is_optimized:
        mediaType === 'image' && finalBuffer.length < fileBuffer.length,
      optimization_data: optimizationData,
      uploaded_by: organization_id, // This should be user ID from auth
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: savedMedia, error: saveError } = await supabase
      .from('content_media')
      .insert(mediaRecord)
      .select()
      .single();

    if (saveError) {
      console.error('Database save error:', saveError);

      // Cleanup uploaded file
      await supabase.storage.from('content-media').remove([uploadData.path]);

      return NextResponse.json(
        { error: 'Failed to save media record' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          media: savedMedia,
          thumbnail_url: thumbnailPath
            ? supabase.storage.from('content-media').getPublicUrl(thumbnailPath)
                .data.publicUrl
            : null,
          optimization_stats: optimizationData,
          message: 'Media uploaded successfully',
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/content/media - List media files with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    const organizationId = searchParams.get('organization_id');
    const mediaType = searchParams.get('media_type');
    const contentId = searchParams.get('content_id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 },
      );
    }

    let query = supabase
      .from('content_media')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (mediaType) {
      query = query.eq('media_type', mediaType);
    }

    if (contentId) {
      query = query.eq('content_id', contentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Media fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch media' },
        { status: 500 },
      );
    }

    // Get total count
    const { count } = await supabase
      .from('content_media')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    return NextResponse.json({
      success: true,
      data: {
        media: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (error) {
    console.error('Media API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/content/media - Update media metadata
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, alt_text, caption, organization_id } = body;

    if (!id || !organization_id) {
      return NextResponse.json(
        { error: 'Media ID and Organization ID are required' },
        { status: 400 },
      );
    }

    // Verify ownership
    const { data: media, error: fetchError } = await supabase
      .from('content_media')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (fetchError || !media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    if (media.organization_id !== organization_id) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this media' },
        { status: 403 },
      );
    }

    // Update media
    const { data: updatedMedia, error: updateError } = await supabase
      .from('content_media')
      .update({
        alt_text,
        caption,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Media update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update media' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        media: updatedMedia,
        message: 'Media updated successfully',
      },
    });
  } catch (error) {
    console.error('Media API PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/content/media - Delete media file
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('id');
    const organizationId = searchParams.get('organization_id');

    if (!mediaId || !organizationId) {
      return NextResponse.json(
        { error: 'Media ID and Organization ID are required' },
        { status: 400 },
      );
    }

    // Get media record
    const { data: media, error: fetchError } = await supabase
      .from('content_media')
      .select('*')
      .eq('id', mediaId)
      .single();

    if (fetchError || !media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    if (media.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this media' },
        { status: 403 },
      );
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('content-media')
      .remove([media.file_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('content_media')
      .delete()
      .eq('id', mediaId);

    if (deleteError) {
      console.error('Database deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete media' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
    });
  } catch (error) {
    console.error('Media API DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
