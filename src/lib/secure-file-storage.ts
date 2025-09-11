/**
 * Secure File Storage Service
 * Handles encrypted file storage, signed URLs, and automatic cleanup
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface StorageConfig {
  encryptionEnabled: boolean;
  signedUrlExpiry: number; // seconds
  autoDeleteAfter: number; // hours
  maxFileSize: number; // bytes
}

interface EncryptedFile {
  encryptedData: Buffer;
  iv: string;
  authTag: string;
  algorithm: string;
}

interface StorageResult {
  success: boolean;
  path?: string;
  signedUrl?: string;
  error?: string;
}

export class SecureFileStorage {
  private readonly config: StorageConfig;
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly ENCRYPTION_KEY: Buffer;

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      encryptionEnabled: true,
      signedUrlExpiry: 300, // 5 minutes
      autoDeleteAfter: 24, // 24 hours
      maxFileSize: 50 * 1024 * 1024, // 50MB
      ...config,
    };

    // Get or generate encryption key
    const keyString =
      process.env.FILE_ENCRYPTION_KEY || this.generateEncryptionKey();
    this.ENCRYPTION_KEY = Buffer.from(keyString, 'hex');
  }

  /**
   * Generate a new encryption key (only for initial setup)
   */
  private generateEncryptionKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    console.warn(
      'Generated new encryption key. Set FILE_ENCRYPTION_KEY env variable:',
      key,
    );
    return key;
  }

  /**
   * Store file securely with encryption and organization isolation
   */
  async storeFile(
    fileBuffer: Buffer,
    filename: string,
    userId: string,
    organizationId: string,
    metadata?: Record<string, any>,
  ): Promise<StorageResult> {
    try {
      // Validate file size
      if (fileBuffer.length > this.config.maxFileSize) {
        return {
          success: false,
          error: `File size exceeds ${this.config.maxFileSize / 1024 / 1024}MB limit`,
        };
      }

      // Encrypt file if enabled
      let dataToStore = fileBuffer;
      let encryptionMetadata = {};

      if (this.config.encryptionEnabled) {
        const encrypted = this.encryptFile(fileBuffer);
        dataToStore = encrypted.encryptedData;
        encryptionMetadata = {
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          algorithm: encrypted.algorithm,
        };
      }

      // Generate secure path with organization isolation
      const securePath = this.generateSecurePath(
        organizationId,
        userId,
        filename,
      );

      // Store in Supabase Storage
      const { data, error } = await supabase.storage
        .from('pdf-uploads')
        .upload(securePath, dataToStore, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Storage error:', error);
        return {
          success: false,
          error: 'Failed to store file',
        };
      }

      // Store metadata in database
      const { error: metadataError } = await supabase
        .from('secure_file_metadata')
        .insert({
          file_path: securePath,
          organization_id: organizationId,
          user_id: userId,
          original_filename: filename,
          file_size: fileBuffer.length,
          encryption_metadata: this.config.encryptionEnabled
            ? encryptionMetadata
            : null,
          auto_delete_at: new Date(
            Date.now() + this.config.autoDeleteAfter * 60 * 60 * 1000,
          ),
          custom_metadata: metadata,
        });

      if (metadataError) {
        console.error('Metadata storage error:', metadataError);
        // Try to clean up the uploaded file
        await this.deleteFile(securePath);
        return {
          success: false,
          error: 'Failed to store file metadata',
        };
      }

      // Generate signed URL
      const signedUrl = await this.generateSignedUrl(securePath);

      // Schedule automatic deletion
      this.scheduleAutoDeletion(securePath, this.config.autoDeleteAfter);

      return {
        success: true,
        path: securePath,
        signedUrl,
      };
    } catch (error) {
      console.error('File storage error:', error);
      return {
        success: false,
        error: 'Internal storage error',
      };
    }
  }

  /**
   * Retrieve file with decryption
   */
  async retrieveFile(
    filePath: string,
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; data?: Buffer; error?: string }> {
    try {
      // Verify access permissions
      const hasAccess = await this.verifyAccess(
        filePath,
        userId,
        organizationId,
      );
      if (!hasAccess) {
        return {
          success: false,
          error: 'Access denied',
        };
      }

      // Download file from storage
      const { data, error } = await supabase.storage
        .from('pdf-uploads')
        .download(filePath);

      if (error || !data) {
        console.error('Download error:', error);
        return {
          success: false,
          error: 'Failed to retrieve file',
        };
      }

      // Convert blob to buffer
      const arrayBuffer = await data.arrayBuffer();
      let fileBuffer = Buffer.from(arrayBuffer);

      // Decrypt if needed
      if (this.config.encryptionEnabled) {
        const { data: metadata } = await supabase
          .from('secure_file_metadata')
          .select('encryption_metadata')
          .eq('file_path', filePath)
          .single();

        if (metadata?.encryption_metadata) {
          fileBuffer = this.decryptFile(
            fileBuffer,
            metadata.encryption_metadata.iv,
            metadata.encryption_metadata.authTag,
          );
        }
      }

      return {
        success: true,
        data: fileBuffer,
      };
    } catch (error) {
      console.error('File retrieval error:', error);
      return {
        success: false,
        error: 'Failed to retrieve file',
      };
    }
  }

  /**
   * Encrypt file data
   */
  private encryptFile(buffer: Buffer): EncryptedFile {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.ENCRYPTION_ALGORITHM,
      this.ENCRYPTION_KEY,
      iv,
    );

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: this.ENCRYPTION_ALGORITHM,
    };
  }

  /**
   * Decrypt file data
   */
  private decryptFile(
    encryptedBuffer: Buffer,
    ivHex: string,
    authTagHex: string,
  ): Buffer {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      this.ENCRYPTION_ALGORITHM,
      this.ENCRYPTION_KEY,
      iv,
    );
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);

    return decrypted;
  }

  /**
   * Generate secure file path with organization isolation
   */
  private generateSecurePath(
    organizationId: string,
    userId: string,
    filename: string,
  ): string {
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const ext = filename.split('.').pop() || 'pdf';

    // Structure: org_id/year/month/user_id/secure_filename
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const secureName = `${timestamp}_${randomId}.${ext}`;

    return `${organizationId}/${year}/${month}/${userId}/${secureName}`;
  }

  /**
   * Generate signed URL with expiration
   */
  async generateSignedUrl(filePath: string): Promise<string | undefined> {
    try {
      const { data, error } = await supabase.storage
        .from('pdf-uploads')
        .createSignedUrl(filePath, this.config.signedUrlExpiry);

      if (error) {
        console.error('Signed URL error:', error);
        return undefined;
      }

      return data?.signedUrl;
    } catch (error) {
      console.error('Signed URL generation error:', error);
      return undefined;
    }
  }

  /**
   * Verify user has access to file
   */
  private async verifyAccess(
    filePath: string,
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    try {
      // Check if file belongs to user's organization
      const { data, error } = await supabase
        .from('secure_file_metadata')
        .select('organization_id')
        .eq('file_path', filePath)
        .single();

      if (error || !data) {
        return false;
      }

      return data.organization_id === organizationId;
    } catch (error) {
      console.error('Access verification error:', error);
      return false;
    }
  }

  /**
   * Delete file and metadata
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('pdf-uploads')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Delete metadata
      const { error: metadataError } = await supabase
        .from('secure_file_metadata')
        .delete()
        .eq('file_path', filePath);

      if (metadataError) {
        console.error('Metadata deletion error:', metadataError);
      }

      return !storageError && !metadataError;
    } catch (error) {
      console.error('File deletion error:', error);
      return false;
    }
  }

  /**
   * Schedule automatic file deletion
   */
  private scheduleAutoDeletion(filePath: string, hours: number): void {
    setTimeout(
      async () => {
        console.log(`Auto-deleting file: ${filePath}`);
        await this.deleteFile(filePath);
      },
      hours * 60 * 60 * 1000,
    );
  }

  /**
   * Clean up expired files (run periodically)
   */
  async cleanupExpiredFiles(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('secure_file_metadata')
        .select('file_path')
        .lt('auto_delete_at', new Date().toISOString());

      if (error || !data) {
        console.error('Cleanup query error:', error);
        return 0;
      }

      let deletedCount = 0;
      for (const file of data) {
        if (await this.deleteFile(file.file_path)) {
          deletedCount++;
        }
      }

      console.log(`Cleaned up ${deletedCount} expired files`);
      return deletedCount;
    } catch (error) {
      console.error('Cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get storage statistics for organization
   */
  async getOrganizationStorageStats(organizationId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    encryptedFiles: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('secure_file_metadata')
        .select('file_size, encryption_metadata')
        .eq('organization_id', organizationId);

      if (error || !data) {
        return { totalFiles: 0, totalSize: 0, encryptedFiles: 0 };
      }

      const totalFiles = data.length;
      const totalSize = data.reduce(
        (sum, file) => sum + (file.file_size || 0),
        0,
      );
      const encryptedFiles = data.filter(
        (file) => file.encryption_metadata !== null,
      ).length;

      return { totalFiles, totalSize, encryptedFiles };
    } catch (error) {
      console.error('Stats error:', error);
      return { totalFiles: 0, totalSize: 0, encryptedFiles: 0 };
    }
  }
}

// Export singleton instance
export const secureFileStorage = new SecureFileStorage();
