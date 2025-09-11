// WS-186: Image Processing Service - Team B Round 1
// Multi-resolution image generation with Sharp optimization and format conversion

import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import ExifReader from 'exifreader';

export interface ImageProcessingOptions {
  supplierId: string;
  uploadJobId: string;
  originalFileName: string;
  filePath: string;
  category: string;
  enableWatermark?: boolean;
  watermarkPosition?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'center';
  qualitySettings?: {
    thumbnail: number;
    medium: number;
    large: number;
    original: number;
  };
}

export interface ProcessedImageResult {
  id: string;
  originalPath: string;
  versions: {
    thumbnail: { path: string; width: number; height: number; size: number };
    medium: { path: string; width: number; height: number; size: number };
    large: { path: string; width: number; height: number; size: number };
    original: { path: string; width: number; height: number; size: number };
  };
  metadata: {
    exif: any;
    dimensions: { width: number; height: number };
    format: string;
    colorSpace: string;
    hasAlpha: boolean;
    orientation?: number;
  };
  processingTime: number;
  optimizationRatio: number;
}

export interface ExifData {
  camera?: {
    make?: string;
    model?: string;
    lens?: string;
  };
  settings?: {
    iso?: number;
    aperture?: string;
    shutterSpeed?: string;
    focalLength?: string;
  };
  timestamp?: string;
  // Location data filtered for privacy
  locationFiltered: boolean;
}

export class PortfolioImageProcessor {
  private supabase;
  private watermarkBuffer: Buffer | null = null;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Process uploaded image with multi-resolution generation
   */
  async processImage(
    options: ImageProcessingOptions,
  ): Promise<ProcessedImageResult> {
    const startTime = Date.now();

    try {
      // Download original image from Supabase Storage
      const { data: fileData, error: downloadError } =
        await this.supabase.storage
          .from('portfolio-images')
          .download(options.filePath);

      if (downloadError) {
        throw new Error(`Failed to download image: ${downloadError.message}`);
      }

      const originalBuffer = Buffer.from(await fileData.arrayBuffer());
      const originalSize = originalBuffer.length;

      // Create Sharp instance and get metadata
      const image = sharp(originalBuffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image: missing dimensions');
      }

      // Extract EXIF data with privacy filtering
      const exifData = await this.extractFilteredExif(originalBuffer);

      // Fix orientation if needed
      const orientedImage = image.rotate(); // Auto-rotate based on EXIF

      // Generate multiple resolutions
      const versions = await this.generateImageVersions(
        orientedImage,
        options,
        metadata,
      );

      // Calculate total optimized size
      const totalOptimizedSize = Object.values(versions).reduce(
        (sum, version) => sum + version.size,
        0,
      );

      const processingTime = Date.now() - startTime;
      const optimizationRatio =
        (originalSize - totalOptimizedSize) / originalSize;

      // Create portfolio image record
      const imageId = crypto.randomUUID();

      const { error: dbError } = await this.supabase
        .from('portfolio_images')
        .insert({
          id: imageId,
          supplier_id: options.supplierId,
          upload_job_id: options.uploadJobId,
          original_filename: options.originalFileName,
          file_path: versions.original.path,
          thumbnail_path: versions.thumbnail.path,
          medium_path: versions.medium.path,
          large_path: versions.large.path,
          category: options.category,
          status: 'processing', // Will be updated to 'active' after AI processing
          processing_status: 'completed',
          metadata: {
            originalSize,
            optimizedSize: totalOptimizedSize,
            optimizationRatio,
            processingTime,
            dimensions: {
              width: metadata.width,
              height: metadata.height,
            },
            format: metadata.format,
            exif: exifData,
            versions: Object.fromEntries(
              Object.entries(versions).map(([key, value]) => [
                key,
                { width: value.width, height: value.height, size: value.size },
              ]),
            ),
          },
        });

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Log processing completion
      console.log(`Image processed successfully: ${imageId}`, {
        originalSize,
        optimizedSize: totalOptimizedSize,
        optimizationRatio: Math.round(optimizationRatio * 100),
        processingTime,
      });

      return {
        id: imageId,
        originalPath: options.filePath,
        versions,
        metadata: {
          exif: exifData,
          dimensions: { width: metadata.width, height: metadata.height },
          format: metadata.format || 'unknown',
          colorSpace: metadata.space || 'unknown',
          hasAlpha: metadata.hasAlpha || false,
          orientation: metadata.orientation,
        },
        processingTime,
        optimizationRatio,
      };
    } catch (error) {
      console.error('Image processing error:', error);

      // Log processing failure
      await this.supabase.from('portfolio_processing_errors').insert({
        supplier_id: options.supplierId,
        upload_job_id: options.uploadJobId,
        original_filename: options.originalFileName,
        file_path: options.filePath,
        error_message:
          error instanceof Error ? error.message : 'Unknown processing error',
        error_details: {
          options,
          timestamp: new Date().toISOString(),
        },
      });

      throw error;
    }
  }

  /**
   * Generate multiple image resolutions
   */
  private async generateImageVersions(
    image: sharp.Sharp,
    options: ImageProcessingOptions,
    metadata: sharp.Metadata,
  ) {
    const baseFilename = options.filePath.replace(/\.[^/.]+$/, '');
    const qualitySettings = options.qualitySettings || {
      thumbnail: 80,
      medium: 85,
      large: 90,
      original: 95,
    };

    // Load watermark if enabled
    if (options.enableWatermark && !this.watermarkBuffer) {
      await this.loadWatermark();
    }

    const versions = {
      thumbnail: await this.generateVersion(
        image,
        { width: 400, height: 300 },
        `${baseFilename}_thumb.webp`,
        qualitySettings.thumbnail,
        options.enableWatermark,
        options.watermarkPosition,
      ),
      medium: await this.generateVersion(
        image,
        { width: 800, height: 600 },
        `${baseFilename}_medium.webp`,
        qualitySettings.medium,
        options.enableWatermark,
        options.watermarkPosition,
      ),
      large: await this.generateVersion(
        image,
        { width: 1400, height: 1050 },
        `${baseFilename}_large.webp`,
        qualitySettings.large,
        options.enableWatermark,
        options.watermarkPosition,
      ),
      original: await this.generateVersion(
        image,
        {
          width: metadata.width!,
          height: metadata.height!,
        },
        `${baseFilename}_original.jpg`,
        qualitySettings.original,
        false, // No watermark on original
        undefined,
        'jpeg', // Keep original as JPEG for compatibility
      ),
    };

    return versions;
  }

  /**
   * Generate a specific image version
   */
  private async generateVersion(
    image: sharp.Sharp,
    dimensions: { width: number; height: number },
    filename: string,
    quality: number,
    enableWatermark: boolean = false,
    watermarkPosition?: string,
    format: 'webp' | 'jpeg' = 'webp',
  ) {
    let processedImage = image
      .clone()
      .resize(dimensions.width, dimensions.height, {
        fit: 'inside',
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      });

    // Add watermark if enabled
    if (enableWatermark && this.watermarkBuffer) {
      processedImage = await this.addWatermark(
        processedImage,
        watermarkPosition || 'bottom-right',
      );
    }

    // Apply format-specific optimizations
    if (format === 'webp') {
      processedImage = processedImage.webp({
        quality,
        effort: 6, // Higher effort for better compression
        smartSubsample: true,
      });
    } else {
      processedImage = processedImage.jpeg({
        quality,
        progressive: true,
        mozjpeg: true,
        optimiseScans: true,
      });
    }

    const buffer = await processedImage.toBuffer({ resolveWithObject: true });

    // Upload to Supabase Storage
    const { error: uploadError } = await this.supabase.storage
      .from('portfolio-images')
      .upload(filename, buffer.data, {
        contentType: format === 'webp' ? 'image/webp' : 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload ${filename}: ${uploadError.message}`);
    }

    return {
      path: filename,
      width: buffer.info.width,
      height: buffer.info.height,
      size: buffer.data.length,
    };
  }

  /**
   * Add watermark to image
   */
  private async addWatermark(
    image: sharp.Sharp,
    position: string,
  ): Promise<sharp.Sharp> {
    if (!this.watermarkBuffer) return image;

    const { width: imageWidth, height: imageHeight } = await image.metadata();
    if (!imageWidth || !imageHeight) return image;

    // Calculate watermark size (10% of image width, max 200px)
    const watermarkSize = Math.min(Math.floor(imageWidth * 0.1), 200);

    const resizedWatermark = await sharp(this.watermarkBuffer)
      .resize(watermarkSize, watermarkSize, { fit: 'inside' })
      .png({ palette: true })
      .toBuffer();

    // Calculate position
    const margin = 20;
    let left = 0,
      top = 0;

    switch (position) {
      case 'top-left':
        left = margin;
        top = margin;
        break;
      case 'top-right':
        left = imageWidth - watermarkSize - margin;
        top = margin;
        break;
      case 'bottom-left':
        left = margin;
        top = imageHeight - watermarkSize - margin;
        break;
      case 'bottom-right':
        left = imageWidth - watermarkSize - margin;
        top = imageHeight - watermarkSize - margin;
        break;
      case 'center':
        left = Math.floor((imageWidth - watermarkSize) / 2);
        top = Math.floor((imageHeight - watermarkSize) / 2);
        break;
    }

    return image.composite([
      {
        input: resizedWatermark,
        left: Math.max(0, left),
        top: Math.max(0, top),
        blend: 'over',
      },
    ]);
  }

  /**
   * Load watermark image
   */
  private async loadWatermark() {
    try {
      // Try to load from Supabase Storage first
      const { data: watermarkData, error } = await this.supabase.storage
        .from('assets')
        .download('watermark.png');

      if (!error && watermarkData) {
        this.watermarkBuffer = Buffer.from(await watermarkData.arrayBuffer());
        return;
      }

      // Fallback to creating a text-based watermark
      const textWatermark = await sharp({
        create: {
          width: 200,
          height: 50,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        },
      })
        .composite([
          {
            input: Buffer.from(`
            <svg width="200" height="50">
              <text x="100" y="30" text-anchor="middle" font-family="Arial" font-size="16" fill="white" opacity="0.7">
                WedSync Portfolio
              </text>
            </svg>
          `),
            top: 0,
            left: 0,
          },
        ])
        .png()
        .toBuffer();

      this.watermarkBuffer = textWatermark;
    } catch (error) {
      console.warn('Failed to load watermark, continuing without:', error);
      this.watermarkBuffer = null;
    }
  }

  /**
   * Extract EXIF data with privacy filtering
   */
  private async extractFilteredExif(buffer: Buffer): Promise<ExifData> {
    try {
      const exifData = ExifReader.load(buffer);

      const filteredExif: ExifData = {
        locationFiltered: true,
      };

      // Extract camera information (safe to include)
      if (exifData.Make?.description) {
        filteredExif.camera = {
          make: exifData.Make.description,
          model: exifData.Model?.description,
          lens: exifData.LensModel?.description,
        };
      }

      // Extract technical settings (safe to include)
      filteredExif.settings = {
        iso: exifData.ISOSpeedRatings?.value,
        aperture: exifData.FNumber?.description,
        shutterSpeed: exifData.ExposureTime?.description,
        focalLength: exifData.FocalLength?.description,
      };

      // Extract timestamp (safe to include)
      if (exifData.DateTime?.description) {
        filteredExif.timestamp = exifData.DateTime.description;
      }

      // Note: GPS and location data is intentionally filtered out for privacy

      return filteredExif;
    } catch (error) {
      console.warn('EXIF extraction failed:', error);
      return { locationFiltered: true };
    }
  }

  /**
   * Batch process multiple images
   */
  async batchProcessImages(
    imageProcessingTasks: ImageProcessingOptions[],
  ): Promise<ProcessedImageResult[]> {
    const results: ProcessedImageResult[] = [];
    const errors: Array<{ task: ImageProcessingOptions; error: Error }> = [];

    // Process images in parallel batches of 3 to avoid overwhelming the system
    const batchSize = 3;
    for (let i = 0; i < imageProcessingTasks.length; i += batchSize) {
      const batch = imageProcessingTasks.slice(i, i + batchSize);

      const batchPromises = batch.map(async (task) => {
        try {
          return await this.processImage(task);
        } catch (error) {
          errors.push({ task, error: error as Error });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...(batchResults.filter(Boolean) as ProcessedImageResult[]));
    }

    // Log batch processing summary
    console.log('Batch processing completed:', {
      successful: results.length,
      failed: errors.length,
      totalTasks: imageProcessingTasks.length,
    });

    if (errors.length > 0) {
      console.error('Batch processing errors:', errors);
    }

    return results;
  }

  /**
   * Cleanup orphaned image files
   */
  async cleanupOrphanedFiles(olderThanHours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

      // Find orphaned processing jobs
      const { data: orphanedJobs, error } = await this.supabase
        .from('portfolio_upload_jobs')
        .select('id, upload_urls')
        .lt('created_at', cutoffTime.toISOString())
        .in('status', ['failed', 'abandoned']);

      if (error || !orphanedJobs?.length) {
        return;
      }

      for (const job of orphanedJobs) {
        if (job.upload_urls) {
          for (const urlInfo of job.upload_urls) {
            try {
              await this.supabase.storage
                .from('portfolio-images')
                .remove([urlInfo.fileName]);
            } catch (cleanupError) {
              console.warn(
                'Failed to cleanup file:',
                urlInfo.fileName,
                cleanupError,
              );
            }
          }
        }
      }

      console.log(`Cleaned up ${orphanedJobs.length} orphaned upload jobs`);
    } catch (error) {
      console.error('Cleanup process error:', error);
    }
  }
}

// Export singleton instance
export const portfolioImageProcessor = new PortfolioImageProcessor();
