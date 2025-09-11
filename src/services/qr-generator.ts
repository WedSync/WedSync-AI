import * as QRCode from 'qrcode';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface QRCodeOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  type?: 'image/png' | 'image/jpeg';
  quality?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  width?: number;
}

export interface QRCodeResult {
  success: boolean;
  qrCodeUrl?: string;
  fileName?: string;
  size?: number;
  error?: string;
}

export interface QRBatchRequest {
  link: string;
  supplierId: string;
  options?: QRCodeOptions;
}

export interface QRBatchResult {
  successful: number;
  failed: number;
  results: {
    request: QRBatchRequest;
    result: QRCodeResult | null;
    error: any;
  }[];
}

export class IntegrationError extends Error {
  constructor(
    message: string,
    public cause?: any,
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class QRGeneratorService {
  private readonly storage: SupabaseClient;

  constructor() {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error('Missing required Supabase environment variables');
    }

    this.storage = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }

  async generateReferralQR(
    referralLink: string,
    supplierId: string,
    options: QRCodeOptions = {},
  ): Promise<QRCodeResult> {
    try {
      // Validate inputs
      if (!referralLink || !supplierId) {
        throw new IntegrationError(
          'Missing required parameters: referralLink and supplierId',
        );
      }

      if (!this.isValidUrl(referralLink)) {
        throw new IntegrationError('Invalid referral link URL');
      }

      // Wedding-themed styling with high error correction for reliability
      const qrOptions = {
        errorCorrectionLevel: 'M' as const,
        type: 'image/png' as const,
        quality: 0.92,
        margin: 2, // Slightly larger margin for printing
        color: {
          dark: '#1F2937', // Wedding dark gray
          light: '#FFFFFF',
        },
        width: 512, // Higher resolution for print quality
        ...options,
      };

      // Generate QR code as buffer
      const qrBuffer = await QRCode.toBuffer(referralLink, {
        errorCorrectionLevel: qrOptions.errorCorrectionLevel as
          | 'L'
          | 'M'
          | 'Q'
          | 'H',
        type: 'png',
        margin: qrOptions.margin,
        color: qrOptions.color,
        width: qrOptions.width,
      });

      // Upload to Supabase Storage with organized folder structure
      const timestamp = Date.now();
      const fileName = `qr-codes/referrals/${supplierId}/referral-${timestamp}.png`;

      const { data: uploadData, error: uploadError } =
        await this.storage.storage
          .from('public-assets')
          .upload(fileName, qrBuffer, {
            contentType: 'image/png',
            cacheControl: '86400', // Cache for 24 hours
            upsert: false, // Prevent overwriting
          });

      if (uploadError) {
        throw new IntegrationError(
          `Failed to upload QR code: ${uploadError.message}`,
          uploadError,
        );
      }

      // Get public URL
      const { data: urlData } = this.storage.storage
        .from('public-assets')
        .getPublicUrl(fileName);

      // Log successful generation for monitoring
      await this.logQRGeneration(
        supplierId,
        fileName,
        qrBuffer.length,
        'success',
      );

      return {
        success: true,
        qrCodeUrl: urlData.publicUrl,
        fileName,
        size: qrBuffer.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.logError('qr_generation_failed', {
        supplierId,
        error: errorMessage,
        referralLink: this.sanitizeUrl(referralLink), // Remove sensitive params
      });

      if (error instanceof IntegrationError) {
        throw error;
      }

      throw new IntegrationError('Failed to generate QR code', error);
    }
  }

  async generateBatchQRCodes(
    requests: QRBatchRequest[],
  ): Promise<QRBatchResult> {
    if (!requests || requests.length === 0) {
      throw new IntegrationError('No QR code requests provided');
    }

    if (requests.length > 50) {
      throw new IntegrationError(
        'Batch size too large (max 50 QR codes per batch)',
      );
    }

    // Handle bulk QR generation for viral periods with concurrency control
    const concurrencyLimit = 5; // Limit concurrent generations to avoid overwhelming Supabase
    const results: {
      request: QRBatchRequest;
      result: QRCodeResult | null;
      error: any;
    }[] = [];

    // Process in chunks to manage load
    for (let i = 0; i < requests.length; i += concurrencyLimit) {
      const chunk = requests.slice(i, i + concurrencyLimit);
      const chunkPromises = chunk.map(async (req) => {
        try {
          const result = await this.generateReferralQR(
            req.link,
            req.supplierId,
            req.options,
          );
          return { request: req, result, error: null };
        } catch (error) {
          return { request: req, result: null, error };
        }
      });

      const chunkResults = await Promise.allSettled(chunkPromises);

      chunkResults.forEach((settledResult) => {
        if (settledResult.status === 'fulfilled') {
          results.push(settledResult.value);
        } else {
          // This shouldn't happen given our error handling, but safety first
          results.push({
            request: chunk[results.length % chunk.length], // Best guess
            result: null,
            error: settledResult.reason,
          });
        }
      });

      // Small delay between chunks to prevent overwhelming the system
      if (i + concurrencyLimit < requests.length) {
        await this.delay(100);
      }
    }

    const successful = results.filter((r) => r.result?.success).length;
    const failed = results.length - successful;

    // Log batch operation results
    await this.logBatchOperation(requests.length, successful, failed);

    return {
      successful,
      failed,
      results,
    };
  }

  async validateQRCode(qrCodeUrl: string): Promise<boolean> {
    try {
      // Check if QR code exists in storage
      const fileName = this.extractFileNameFromUrl(qrCodeUrl);
      if (!fileName) return false;

      const { data, error } = await this.storage.storage
        .from('public-assets')
        .download(fileName);

      return !error && !!data;
    } catch (error) {
      await this.logError('qr_validation_failed', { qrCodeUrl, error });
      return false;
    }
  }

  async deleteQRCode(fileName: string): Promise<boolean> {
    try {
      const { error } = await this.storage.storage
        .from('public-assets')
        .remove([fileName]);

      if (!error) {
        await this.logQRGeneration('system', fileName, 0, 'deleted');
      }

      return !error;
    } catch (error) {
      await this.logError('qr_deletion_failed', { fileName, error });
      return false;
    }
  }

  // Health check method for integration monitoring
  async getHealthStatus(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Test QR generation with a small test QR
      const testUrl = 'https://wedsync.com/test';
      const testSupplierId = 'health-check';

      const testBuffer = await QRCode.toBuffer(testUrl, {
        type: 'png',
        width: 64,
        margin: 1,
      });

      // Test storage connectivity (without actually uploading)
      const { data: bucketData, error: bucketError } =
        await this.storage.storage
          .from('public-assets')
          .list('qr-codes', { limit: 1 });

      if (bucketError) {
        throw new Error(`Storage connectivity failed: ${bucketError.message}`);
      }

      return {
        healthy: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('https://') || url.startsWith('http://');
    } catch {
      return false;
    }
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove sensitive query parameters
      ['token', 'api_key', 'secret', 'key'].forEach((param) => {
        urlObj.searchParams.delete(param);
      });
      return urlObj.toString();
    } catch {
      return 'invalid-url';
    }
  }

  private extractFileNameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      // Find the part that starts with 'qr-codes'
      const qrCodesIndex = pathParts.findIndex((part) => part === 'qr-codes');
      if (qrCodesIndex >= 0) {
        return pathParts.slice(qrCodesIndex).join('/');
      }
      return null;
    } catch {
      return null;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async logQRGeneration(
    supplierId: string,
    fileName: string,
    fileSize: number,
    status: 'success' | 'deleted',
  ): Promise<void> {
    try {
      // In a real implementation, this would log to a proper logging service
      // For now, we'll use console.log with structured data
      console.log(`[QRGenerator] QR ${status}:`, {
        timestamp: new Date().toISOString(),
        supplierId,
        fileName,
        fileSize,
        status,
        service: 'qr-generator',
      });
    } catch (error) {
      // Don't throw errors from logging
      console.error('[QRGenerator] Logging failed:', error);
    }
  }

  private async logBatchOperation(
    total: number,
    successful: number,
    failed: number,
  ): Promise<void> {
    try {
      console.log(`[QRGenerator] Batch operation completed:`, {
        timestamp: new Date().toISOString(),
        total,
        successful,
        failed,
        successRate: Math.round((successful / total) * 100),
        service: 'qr-generator',
      });
    } catch (error) {
      console.error('[QRGenerator] Batch logging failed:', error);
    }
  }

  private async logError(event: string, metadata: any): Promise<void> {
    try {
      // Sanitize metadata to remove sensitive information
      const sanitizedMetadata = { ...metadata };
      if (sanitizedMetadata.referralLink) {
        sanitizedMetadata.referralLink = this.sanitizeUrl(
          sanitizedMetadata.referralLink,
        );
      }

      console.error(`[QRGenerator] ${event}:`, {
        timestamp: new Date().toISOString(),
        event,
        ...sanitizedMetadata,
        service: 'qr-generator',
      });
    } catch (error) {
      // Last resort logging
      console.error('[QRGenerator] Critical logging failure:', error);
    }
  }
}

// Export singleton instance for use across the application
export const qrGeneratorService = new QRGeneratorService();
