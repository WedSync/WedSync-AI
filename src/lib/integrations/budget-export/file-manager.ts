import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import * as jwt from 'jsonwebtoken';
import { secureStringSchema } from '../../validation/schemas';

// File metadata interface for type safety
export interface FileMetadata {
  id: string;
  coupleId: string;
  exportId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  compressionRatio?: number;
  originalSize?: number;
  downloadCount: number;
  maxDownloads: number;
  expiresAt: Date;
  createdAt: Date;
  isCompressed: boolean;
  storageUrl: string;
  checksumSha256: string;
}

// Storage configuration
const storageConfig = {
  bucket: 'budget-exports',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: [
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  retentionDays: 7,
  defaultExpirationHours: 24,
};

// Input validation schemas
const storeFileSchema = z.object({
  exportId: z.string().min(1).max(100),
  fileName: z.string().min(1).max(255),
  contentType: z.enum([
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]),
  coupleId: z.string().min(1).max(100),
});

const downloadUrlSchema = z.object({
  exportId: z.string().min(1).max(100),
  expirationHours: z.number().min(1).max(168).optional().default(24), // Max 7 days
});

/**
 * ExportFileManager - Core service for secure file storage and management
 * Handles Supabase Storage integration with security and performance optimizations
 */
export class ExportFileManager {
  private static supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  private static supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  private static jwtSecret =
    process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET!;

  /**
   * Store export file in Supabase Storage with security isolation
   * @param exportId - Unique export identifier
   * @param fileBuffer - File content buffer
   * @param fileName - Original filename
   * @param contentType - MIME type
   * @param coupleId - Couple identifier for RLS security
   * @returns Storage URL and expiration information
   */
  static async storeExportFile(
    exportId: string,
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
    coupleId: string,
  ): Promise<{ url: string; expiresAt: Date; fileId: string }> {
    try {
      // Input validation
      const validation = storeFileSchema.safeParse({
        exportId,
        fileName,
        contentType,
        coupleId,
      });

      if (!validation.success) {
        throw new Error(
          `Invalid input: ${validation.error.issues.map((e) => e.message).join(', ')}`,
        );
      }

      // File size validation
      if (fileBuffer.length > storageConfig.maxFileSize) {
        throw new Error(
          `File too large: ${fileBuffer.length} bytes exceeds ${storageConfig.maxFileSize} bytes`,
        );
      }

      // Content type validation
      if (!storageConfig.allowedTypes.includes(contentType)) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      // Create Supabase client with service role for storage operations
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      // Generate file path with couple isolation: /{couple_id}/{export_id}/{filename}
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `${coupleId}/${exportId}/${timestamp}_${sanitizedFileName}`;

      // Calculate file checksum for integrity verification
      const crypto = await import('crypto');
      const checksumSha256 = crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex');

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(storageConfig.bucket)
        .upload(filePath, fileBuffer, {
          contentType,
          duplex: 'half' as const,
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setHours(
        expiresAt.getHours() + storageConfig.defaultExpirationHours,
      );

      // Store file metadata in database with RLS security
      const fileId = `${exportId}_${Date.now()}`;
      const { data: metadataData, error: metadataError } = await supabase
        .from('budget_export_files')
        .insert({
          id: fileId,
          couple_id: coupleId,
          export_id: exportId,
          file_name: fileName,
          content_type: contentType,
          file_size: fileBuffer.length,
          original_size: fileBuffer.length,
          compression_ratio: 1.0,
          download_count: 0,
          max_downloads: 100, // Default download limit
          expires_at: expiresAt.toISOString(),
          is_compressed: false,
          storage_url: uploadData.path,
          checksum_sha256: checksumSha256,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (metadataError) {
        // Cleanup uploaded file if metadata storage fails
        await supabase.storage.from(storageConfig.bucket).remove([filePath]);
        console.error('Metadata storage error:', metadataError);
        throw new Error(
          `File metadata storage failed: ${metadataError.message}`,
        );
      }

      // Return storage information
      return {
        url: uploadData.path,
        expiresAt,
        fileId,
      };
    } catch (error) {
      console.error('ExportFileManager.storeExportFile error:', error);
      throw error;
    }
  }

  /**
   * Generate secure, time-limited download URL with authentication
   * @param exportId - Export identifier
   * @param coupleId - Couple identifier for security verification
   * @param expirationHours - URL expiration time (default: 24 hours)
   * @returns Secure download URL
   */
  static async generateSecureDownloadUrl(
    exportId: string,
    coupleId: string,
    expirationHours: number = 24,
  ): Promise<string> {
    try {
      // Input validation
      const validation = downloadUrlSchema.safeParse({
        exportId,
        expirationHours,
      });

      if (!validation.success) {
        throw new Error(
          `Invalid input: ${validation.error.issues.map((e) => e.message).join(', ')}`,
        );
      }

      // Verify file exists and couple has access
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      const { data: fileData, error: fileError } = await supabase
        .from('budget_export_files')
        .select('id, storage_url, expires_at, couple_id')
        .eq('export_id', exportId)
        .eq('couple_id', coupleId)
        .single();

      if (fileError || !fileData) {
        throw new Error('File not found or access denied');
      }

      // Check if file has expired
      const now = new Date();
      const fileExpiry = new Date(fileData.expires_at);
      if (now > fileExpiry) {
        throw new Error('File has expired');
      }

      // Generate JWT token for secure access
      const tokenPayload = {
        exportId,
        coupleId,
        fileId: fileData.id,
        exp: Math.floor(Date.now() / 1000) + expirationHours * 3600,
      };

      const downloadToken = jwt.sign(tokenPayload, this.jwtSecret);

      // Create secure download URL
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const secureUrl = `${baseUrl}/api/budget/export/download/${fileData.id}?token=${downloadToken}`;

      return secureUrl;
    } catch (error) {
      console.error(
        'ExportFileManager.generateSecureDownloadUrl error:',
        error,
      );
      throw error;
    }
  }

  /**
   * Get file metadata with security verification
   * @param exportId - Export identifier
   * @param coupleId - Couple identifier for security
   * @returns File metadata
   */
  static async getFileMetadata(
    exportId: string,
    coupleId: string,
  ): Promise<FileMetadata | null> {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      const { data, error } = await supabase
        .from('budget_export_files')
        .select('*')
        .eq('export_id', exportId)
        .eq('couple_id', coupleId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        coupleId: data.couple_id,
        exportId: data.export_id,
        fileName: data.file_name,
        contentType: data.content_type,
        fileSize: data.file_size,
        compressionRatio: data.compression_ratio,
        originalSize: data.original_size,
        downloadCount: data.download_count,
        maxDownloads: data.max_downloads,
        expiresAt: new Date(data.expires_at),
        createdAt: new Date(data.created_at),
        isCompressed: data.is_compressed,
        storageUrl: data.storage_url,
        checksumSha256: data.checksum_sha256,
      };
    } catch (error) {
      console.error('ExportFileManager.getFileMetadata error:', error);
      return null;
    }
  }

  /**
   * Delete expired exports - called by cleanup service
   * @returns Number of files deleted
   */
  static async deleteExpiredExports(): Promise<number> {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      // Find expired files
      const { data: expiredFiles, error: findError } = await supabase
        .from('budget_export_files')
        .select('id, storage_url')
        .lt('expires_at', new Date().toISOString());

      if (findError) {
        console.error('Error finding expired files:', findError);
        return 0;
      }

      if (!expiredFiles || expiredFiles.length === 0) {
        return 0;
      }

      // Delete files from storage
      const storagePaths = expiredFiles.map((file) => file.storage_url);
      const { error: storageError } = await supabase.storage
        .from(storageConfig.bucket)
        .remove(storagePaths);

      if (storageError) {
        console.error('Error deleting files from storage:', storageError);
        // Continue with database cleanup even if storage deletion fails
      }

      // Delete metadata records
      const fileIds = expiredFiles.map((file) => file.id);
      const { error: deleteError } = await supabase
        .from('budget_export_files')
        .delete()
        .in('id', fileIds);

      if (deleteError) {
        console.error('Error deleting file metadata:', deleteError);
        return 0;
      }

      console.log(`Deleted ${expiredFiles.length} expired export files`);
      return expiredFiles.length;
    } catch (error) {
      console.error('ExportFileManager.deleteExpiredExports error:', error);
      return 0;
    }
  }

  /**
   * Update download count for tracking
   * @param fileId - File identifier
   * @returns Updated download count
   */
  static async incrementDownloadCount(fileId: string): Promise<number> {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      // Get current download count and increment
      const { data: currentData, error: fetchError } = await supabase
        .from('budget_export_files')
        .select('download_count')
        .eq('id', fileId)
        .single();

      if (fetchError) {
        console.error('Error fetching current download count:', fetchError);
        return 0;
      }

      const newCount = (currentData?.download_count || 0) + 1;

      // Update with new count
      const { data, error } = await supabase
        .from('budget_export_files')
        .update({
          download_count: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId)
        .select('download_count')
        .single();

      if (error) {
        console.error('Error updating download count:', error);
        return 0;
      }

      return data?.download_count || 0;
    } catch (error) {
      console.error('ExportFileManager.incrementDownloadCount error:', error);
      return 0;
    }
  }

  /**
   * Get storage quota usage for a couple
   * @param coupleId - Couple identifier
   * @returns Storage usage information
   */
  static async getStorageQuotaUsage(coupleId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    quotaLimit: number;
    quotaUsed: number;
    quotaRemaining: number;
  }> {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      // Get current storage usage
      const { data, error } = await supabase
        .from('budget_export_files')
        .select('file_size')
        .eq('couple_id', coupleId)
        .gt('expires_at', new Date().toISOString()); // Only non-expired files

      if (error) {
        console.error('Error fetching storage quota:', error);
        return {
          totalFiles: 0,
          totalSize: 0,
          quotaLimit: 100 * 1024 * 1024, // 100MB default
          quotaUsed: 0,
          quotaRemaining: 100 * 1024 * 1024,
        };
      }

      const totalFiles = data?.length || 0;
      const totalSize =
        data?.reduce((sum, file) => sum + file.file_size, 0) || 0;
      const quotaLimit = 100 * 1024 * 1024; // 100MB per couple
      const quotaUsed = (totalSize / quotaLimit) * 100;
      const quotaRemaining = quotaLimit - totalSize;

      return {
        totalFiles,
        totalSize,
        quotaLimit,
        quotaUsed: Math.round(quotaUsed * 100) / 100, // Round to 2 decimal places
        quotaRemaining: Math.max(0, quotaRemaining),
      };
    } catch (error) {
      console.error('ExportFileManager.getStorageQuotaUsage error:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        quotaLimit: 100 * 1024 * 1024,
        quotaUsed: 0,
        quotaRemaining: 100 * 1024 * 1024,
      };
    }
  }

  /**
   * Verify file integrity using checksum
   * @param fileId - File identifier
   * @returns Integrity verification result
   */
  static async verifyFileIntegrity(
    fileId: string,
  ): Promise<{ valid: boolean; message: string }> {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      // Get file metadata and download file
      const { data: metadata, error: metadataError } = await supabase
        .from('budget_export_files')
        .select('storage_url, checksum_sha256, file_size')
        .eq('id', fileId)
        .single();

      if (metadataError || !metadata) {
        return { valid: false, message: 'File not found' };
      }

      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(storageConfig.bucket)
        .download(metadata.storage_url);

      if (downloadError || !fileData) {
        return { valid: false, message: 'File download failed' };
      }

      // Calculate current checksum
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const crypto = await import('crypto');
      const currentChecksum = crypto
        .createHash('sha256')
        .update(buffer)
        .digest('hex');

      // Verify checksum matches
      if (currentChecksum !== metadata.checksum_sha256) {
        return { valid: false, message: 'Checksum mismatch - file corrupted' };
      }

      // Verify file size matches
      if (buffer.length !== metadata.file_size) {
        return { valid: false, message: 'File size mismatch' };
      }

      return { valid: true, message: 'File integrity verified' };
    } catch (error) {
      console.error('ExportFileManager.verifyFileIntegrity error:', error);
      return { valid: false, message: 'Integrity verification failed' };
    }
  }
}
