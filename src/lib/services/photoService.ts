/**
 * Photo Service - WS-079 Photo Gallery System
 * Handles photo upload, compression, optimization and Supabase Storage integration
 */

import { createClient } from '@supabase/supabase-js';
import {
  Photo,
  PhotoBucket,
  PhotoAlbum,
  PhotoSharingPermission,
  UploadProgress,
  BatchUploadSession,
  PhotoTag,
  PhotoComment,
  Gallery,
  PhotoFilters,
  PhotoDownloadOptions,
  ShareSettings,
} from '@/types/photos';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Image compression settings
const COMPRESSION_SETTINGS = {
  thumbnail: { width: 150, height: 150, quality: 0.8 },
  preview: { width: 800, height: 600, quality: 0.85 },
  optimized: { maxWidth: 2048, maxHeight: 2048, quality: 0.9 },
};

// Supported file types
const SUPPORTED_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
];

export class PhotoService {
  private static instance: PhotoService;
  public readonly supabase = supabase;

  public static getInstance(): PhotoService {
    if (!PhotoService.instance) {
      PhotoService.instance = new PhotoService();
    }
    return PhotoService.instance;
  }

  /**
   * Create or get the photos storage bucket
   */
  async ensureStorageBucket(): Promise<void> {
    const { data: buckets } = await supabase.storage.listBuckets();
    const photoBucket = buckets?.find((bucket) => bucket.name === 'photos');

    if (!photoBucket) {
      const { error } = await supabase.storage.createBucket('photos', {
        public: false,
        allowedMimeTypes: SUPPORTED_FORMATS,
        fileSizeLimit: '50MB',
      });

      if (error) {
        throw new Error(`Failed to create photos bucket: ${error.message}`);
      }
    }
  }

  /**
   * Compress and optimize an image file
   */
  async compressImage(
    file: File,
    settings: { width?: number; height?: number; quality: number },
  ): Promise<{ blob: Blob; compressionRatio: number }> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate dimensions
          let { width, height } = img;
          const maxWidth = settings.width || width;
          const maxHeight = settings.height || height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              const compressionRatio =
                ((file.size - blob.size) / file.size) * 100;
              resolve({ blob, compressionRatio });
            },
            'image/jpeg',
            settings.quality,
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate optimized versions of an image
   */
  async generateOptimizedVersions(file: File): Promise<{
    thumbnail: Blob;
    preview: Blob;
    optimized: Blob;
    compressionRatio: number;
  }> {
    const [thumbnailResult, previewResult, optimizedResult] = await Promise.all(
      [
        this.compressImage(file, COMPRESSION_SETTINGS.thumbnail),
        this.compressImage(file, COMPRESSION_SETTINGS.preview),
        this.compressImage(file, COMPRESSION_SETTINGS.optimized),
      ],
    );

    return {
      thumbnail: thumbnailResult.blob,
      preview: previewResult.blob,
      optimized: optimizedResult.blob,
      compressionRatio: optimizedResult.compressionRatio,
    };
  }

  /**
   * Upload photo with optimization to Supabase Storage
   */
  async uploadPhoto(
    file: File,
    bucketId: string,
    albumId?: string,
    metadata?: {
      title?: string;
      description?: string;
      photographerCredit?: string;
      location?: string;
    },
    onProgress?: (progress: number) => void,
  ): Promise<Photo> {
    try {
      // Validate file
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        throw new Error(`Unsupported file format: ${file.type}`);
      }

      await this.ensureStorageBucket();

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const baseFilename = `${timestamp}-${Math.random().toString(36).substring(2)}`;

      onProgress?.(10);

      // Generate optimized versions
      const optimizedVersions = await this.generateOptimizedVersions(file);
      onProgress?.(30);

      // Upload original file
      const originalPath = `photos/${baseFilename}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(originalPath, file);

      if (uploadError) throw uploadError;
      onProgress?.(50);

      // Upload optimized versions
      const thumbnailPath = `photos/thumbs/${baseFilename}_thumb.jpg`;
      const previewPath = `photos/previews/${baseFilename}_preview.jpg`;
      const optimizedPath = `photos/optimized/${baseFilename}_opt.jpg`;

      await Promise.all([
        supabase.storage
          .from('photos')
          .upload(thumbnailPath, optimizedVersions.thumbnail),
        supabase.storage
          .from('photos')
          .upload(previewPath, optimizedVersions.preview),
        supabase.storage
          .from('photos')
          .upload(optimizedPath, optimizedVersions.optimized),
      ]);

      onProgress?.(70);

      // Get image dimensions
      const dimensions = await this.getImageDimensions(file);

      // Save photo record to database
      const { data: photo, error: dbError } = await supabase
        .from('photos')
        .insert({
          bucket_id: bucketId,
          album_id: albumId,
          filename: `${baseFilename}.${fileExt}`,
          original_filename: file.name,
          file_path: originalPath,
          file_size_bytes: file.size,
          mime_type: file.type,
          width: dimensions.width,
          height: dimensions.height,
          thumbnail_path: thumbnailPath,
          preview_path: previewPath,
          optimized_path: optimizedPath,
          compression_ratio: optimizedVersions.compressionRatio,
          title: metadata?.title,
          description: metadata?.description,
          photographer_credit: metadata?.photographerCredit,
          location: metadata?.location,
          sort_order: 0,
          is_featured: false,
          is_approved: false,
          approval_status: 'pending',
          view_count: 0,
          download_count: 0,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      onProgress?.(90);

      // Log the upload action
      await this.logPhotoAccess(photo.id, 'upload');
      onProgress?.(100);

      return this.mapDatabasePhotoToPhoto(photo);
    } catch (error) {
      console.error('Photo upload failed:', error);
      throw error;
    }
  }

  /**
   * Batch upload multiple photos
   */
  async uploadBatch(
    files: File[],
    bucketId: string,
    albumId?: string,
    onProgress?: (session: BatchUploadSession) => void,
  ): Promise<BatchUploadSession> {
    const sessionId = crypto.randomUUID();
    const session: BatchUploadSession = {
      id: sessionId,
      totalFiles: files.length,
      completedFiles: 0,
      failedFiles: 0,
      startedAt: new Date().toISOString(),
      uploads: files.map((file) => ({
        photoId: crypto.randomUUID(),
        filename: file.name,
        progress: 0,
        status: 'pending',
      })),
    };

    onProgress?.(session);

    const uploadPromises = files.map(async (file, index) => {
      try {
        session.uploads[index].status = 'uploading';
        onProgress?.(session);

        const photo = await this.uploadPhoto(
          file,
          bucketId,
          albumId,
          undefined,
          (progress) => {
            session.uploads[index].progress = progress;
            onProgress?.(session);
          },
        );

        session.uploads[index].photoId = photo.id;
        session.uploads[index].status = 'completed';
        session.completedFiles++;
      } catch (error) {
        session.uploads[index].status = 'error';
        session.uploads[index].error =
          error instanceof Error ? error.message : 'Upload failed';
        session.failedFiles++;
      }
    });

    await Promise.all(uploadPromises);

    session.completedAt = new Date().toISOString();
    onProgress?.(session);

    return session;
  }

  /**
   * Get photos with filters (legacy compatibility)
   */
  async getPhotos_old(filters?: PhotoFilters): Promise<{
    photos: Photo[];
    hasMore: boolean;
  }> {
    const result = await this.getPhotos(filters?.galleryId);
    return {
      photos: result.photos,
      hasMore: result.total > result.photos.length,
    };
  }

  /**
   * Add tags to a photo
   */
  async addTags(photoId: string, tagIds: string[]): Promise<void> {
    const assignments = tagIds.map((tagId) => ({
      photo_id: photoId,
      tag_id: tagId,
    }));

    const { error } = await supabase
      .from('photo_tag_assignments')
      .insert(assignments);

    if (error) throw error;
  }

  /**
   * Remove a tag from a photo
   */
  async removeTag(photoId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('photo_tag_assignments')
      .delete()
      .eq('photo_id', photoId)
      .eq('tag_id', tagId);

    if (error) throw error;
  }

  /**
   * Create a new gallery
   */
  async createGallery(
    gallery: Omit<Gallery, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Gallery> {
    const response = await fetch('/api/galleries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gallery),
    });

    if (!response.ok) {
      throw new Error('Failed to create gallery');
    }

    return response.json();
  }

  /**
   * Update gallery settings
   */
  async updateGallery(
    galleryId: string,
    updates: Partial<Gallery>,
  ): Promise<Gallery> {
    const response = await fetch(`/api/galleries/${galleryId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update gallery');
    }

    return response.json();
  }

  /**
   * Generate shareable link for gallery
   */
  async generateShareableLink(
    galleryId: string,
    settings: ShareSettings,
  ): Promise<{ link: string }> {
    const response = await fetch(`/api/galleries/${galleryId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error('Failed to generate shareable link');
    }

    return response.json();
  }

  /**
   * Download a photo from Supabase Storage
   */
  async downloadPhoto(
    photoId: string,
    quality: 'thumbnail' | 'preview' | 'optimized' | 'original' = 'original',
  ): Promise<Blob> {
    // Get photo record to find file path
    const { data: photo, error } = await supabase
      .from('photos')
      .select('file_path, thumbnail_path, preview_path, optimized_path')
      .eq('id', photoId)
      .single();

    if (error || !photo) throw new Error('Photo not found');

    // Determine which path to use based on quality
    let filePath: string;
    switch (quality) {
      case 'thumbnail':
        filePath =
          photo.thumbnail_path || photo.preview_path || photo.file_path;
        break;
      case 'preview':
        filePath =
          photo.preview_path || photo.optimized_path || photo.file_path;
        break;
      case 'optimized':
        filePath = photo.optimized_path || photo.file_path;
        break;
      default:
        filePath = photo.file_path;
    }

    // Download from Supabase Storage
    const { data, error: downloadError } = await supabase.storage
      .from('photos')
      .download(filePath);

    if (downloadError) throw downloadError;
    return data;
  }

  /**
   * Delete a photo and its files
   */
  async deletePhoto(photoId: string): Promise<void> {
    // Get photo record to find all file paths
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('file_path, thumbnail_path, preview_path, optimized_path')
      .eq('id', photoId)
      .single();

    if (fetchError) throw fetchError;

    // Delete files from storage
    const filesToDelete = [
      photo.file_path,
      photo.thumbnail_path,
      photo.preview_path,
      photo.optimized_path,
    ].filter(Boolean);

    if (filesToDelete.length > 0) {
      await supabase.storage.from('photos').remove(filesToDelete);
    }

    // Delete database record (cascades to related tables)
    const { error } = await supabase.from('photos').delete().eq('id', photoId);

    if (error) throw error;

    // Log the deletion
    await this.logPhotoAccess(photoId, 'delete');
  }

  /**
   * Delete multiple photos
   */
  async deleteBatch(photoIds: string[]): Promise<void> {
    for (const photoId of photoIds) {
      await this.deletePhoto(photoId);
    }
  }

  /**
   * Get photo analytics from database
   */
  async getPhotoAnalytics(photoId: string): Promise<{
    views: number;
    downloads: number;
    shares: number;
  }> {
    const { data: photo, error } = await supabase
      .from('photos')
      .select('view_count, download_count')
      .eq('id', photoId)
      .single();

    if (error) throw error;

    // Count active sharing permissions as shares
    const { count: shareCount } = await supabase
      .from('photo_sharing_permissions')
      .select('*', { count: 'exact', head: true })
      .eq('photo_id', photoId)
      .eq('is_active', true);

    return {
      views: photo.view_count || 0,
      downloads: photo.download_count || 0,
      shares: shareCount || 0,
    };
  }

  /**
   * Get public URL for a photo file
   */
  async getPhotoPublicUrl(filePath: string): Promise<string> {
    const { data } = supabase.storage.from('photos').getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Get photos from bucket or album with vendor access control
   */
  async getPhotos(
    bucketId?: string,
    albumId?: string,
    vendorType?: string,
    page = 1,
    limit = 50,
  ): Promise<{ photos: Photo[]; total: number }> {
    let query = supabase
      .from('photos_with_sharing')
      .select('*', { count: 'exact' });

    if (bucketId) query = query.eq('bucket_id', bucketId);
    if (albumId) query = query.eq('album_id', albumId);

    // Apply vendor access filter
    if (vendorType) {
      query = query.contains('shared_with_vendor_types', [vendorType]);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return {
      photos: data?.map(this.mapDatabasePhotoToPhoto) || [],
      total: count || 0,
    };
  }

  /**
   * Share photo or album with vendors
   */
  async shareWithVendors(
    photoId?: string,
    albumId?: string,
    bucketId?: string,
    vendorTypes: string[],
    permissionLevel: 'view' | 'download' | 'edit' = 'view',
    expiresAt?: string,
  ): Promise<PhotoSharingPermission[]> {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error('User not authenticated');

    const permissions = vendorTypes.map((vendorType) => ({
      photo_id: photoId,
      album_id: albumId,
      bucket_id: bucketId,
      shared_with_vendor_type: vendorType,
      permission_level: permissionLevel,
      expires_at: expiresAt,
      is_active: true,
      can_reshare: false,
      shared_by: currentUser.user!.id,
    }));

    const { data, error } = await supabase
      .from('photo_sharing_permissions')
      .insert(permissions)
      .select();

    if (error) throw error;

    return data.map(this.mapDatabaseSharingToSharing);
  }

  /**
   * Create photo bucket
   */
  async createBucket(
    name: string,
    description: string,
    bucketType: 'engagement' | 'venue' | 'styling' | 'general' | 'portfolio',
    clientId?: string,
    vendorId?: string,
  ): Promise<PhotoBucket> {
    const { data, error } = await supabase
      .from('photo_buckets')
      .insert({
        name,
        description,
        bucket_type: bucketType,
        client_id: clientId,
        vendor_id: vendorId,
        is_public: false,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapDatabaseBucketToBucket(data);
  }

  /**
   * Create photo album
   */
  async createAlbum(
    bucketId: string,
    name: string,
    description?: string,
    eventDate?: string,
    location?: string,
  ): Promise<PhotoAlbum> {
    const { data, error } = await supabase
      .from('photo_albums')
      .insert({
        bucket_id: bucketId,
        name,
        description,
        event_date: eventDate,
        location,
        sort_order: 0,
        is_featured: false,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapDatabaseAlbumToAlbum(data);
  }

  /**
   * Get image dimensions from file
   */
  private getImageDimensions(
    file: File,
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Log photo access for security audit
   */
  private async logPhotoAccess(
    photoId: string,
    action: 'view' | 'download' | 'share' | 'upload' | 'delete' | 'edit',
  ): Promise<void> {
    const { data: currentUser } = await supabase.auth.getUser();

    await supabase.rpc('log_photo_access', {
      p_photo_id: photoId,
      p_action: action,
      p_user_id: currentUser.user?.id,
      p_ip_address: null, // Would be populated server-side
      p_user_agent: navigator.userAgent,
    });
  }

  /**
   * Database mapping functions
   */
  private mapDatabasePhotoToPhoto(dbPhoto: any): Photo {
    return {
      id: dbPhoto.id,
      albumId: dbPhoto.album_id,
      bucketId: dbPhoto.bucket_id,
      organizationId: dbPhoto.organization_id,
      filename: dbPhoto.filename,
      originalFilename: dbPhoto.original_filename,
      filePath: dbPhoto.file_path,
      fileSizeBytes: dbPhoto.file_size_bytes,
      mimeType: dbPhoto.mime_type,
      width: dbPhoto.width,
      height: dbPhoto.height,
      thumbnailPath: dbPhoto.thumbnail_path,
      previewPath: dbPhoto.preview_path,
      optimizedPath: dbPhoto.optimized_path,
      compressionRatio: dbPhoto.compression_ratio,
      title: dbPhoto.title,
      description: dbPhoto.description,
      altText: dbPhoto.alt_text,
      photographerCredit: dbPhoto.photographer_credit,
      takenAt: dbPhoto.taken_at,
      location: dbPhoto.location,
      sortOrder: dbPhoto.sort_order,
      isFeatured: dbPhoto.is_featured,
      isApproved: dbPhoto.is_approved,
      approvalStatus: dbPhoto.approval_status,
      viewCount: dbPhoto.view_count,
      downloadCount: dbPhoto.download_count,
      createdAt: dbPhoto.created_at,
      updatedAt: dbPhoto.updated_at,
      uploadedBy: dbPhoto.uploaded_by,
      approvedBy: dbPhoto.approved_by,
      tags: [], // Would be populated separately
    };
  }

  private mapDatabaseBucketToBucket(dbBucket: any): PhotoBucket {
    return {
      id: dbBucket.id,
      name: dbBucket.name,
      description: dbBucket.description,
      clientId: dbBucket.client_id,
      vendorId: dbBucket.vendor_id,
      organizationId: dbBucket.organization_id,
      bucketType: dbBucket.bucket_type,
      isPublic: dbBucket.is_public,
      createdAt: dbBucket.created_at,
      updatedAt: dbBucket.updated_at,
      createdBy: dbBucket.created_by,
    };
  }

  private mapDatabaseAlbumToAlbum(dbAlbum: any): PhotoAlbum {
    return {
      id: dbAlbum.id,
      name: dbAlbum.name,
      description: dbAlbum.description,
      bucketId: dbAlbum.bucket_id,
      coverPhotoUrl: dbAlbum.cover_photo_url,
      sortOrder: dbAlbum.sort_order,
      isFeatured: dbAlbum.is_featured,
      eventDate: dbAlbum.event_date,
      location: dbAlbum.location,
      createdAt: dbAlbum.created_at,
      updatedAt: dbAlbum.updated_at,
      createdBy: dbAlbum.created_by,
    };
  }

  private mapDatabaseSharingToSharing(dbSharing: any): PhotoSharingPermission {
    return {
      id: dbSharing.id,
      photoId: dbSharing.photo_id,
      albumId: dbSharing.album_id,
      bucketId: dbSharing.bucket_id,
      organizationId: dbSharing.organization_id,
      sharedWithUserId: dbSharing.shared_with_user_id,
      sharedWithVendorType: dbSharing.shared_with_vendor_type,
      permissionLevel: dbSharing.permission_level,
      expiresAt: dbSharing.expires_at,
      isActive: dbSharing.is_active,
      canReshare: dbSharing.can_reshare,
      createdAt: dbSharing.created_at,
      updatedAt: dbSharing.updated_at,
      sharedBy: dbSharing.shared_by,
    };
  }

  // Legacy compatibility methods for existing API calls
  async uploadPhoto_legacy(
    file: File,
    options?: {
      galleryId?: string;
      clientId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<Photo> {
    // For backward compatibility - assumes default bucket
    return this.uploadPhoto(file, 'default-bucket', options?.galleryId);
  }

  async getPhotos_legacy(filters?: PhotoFilters): Promise<{
    photos: Photo[];
    hasMore: boolean;
  }> {
    const result = await this.getPhotos(filters?.galleryId);
    return {
      photos: result.photos,
      hasMore: result.total > result.photos.length,
    };
  }
}

// Export singleton instance
export const photoService = PhotoService.getInstance();
