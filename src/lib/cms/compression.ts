interface CompressionResult {
  data: string | Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: 'gzip' | 'webp' | 'avif' | 'text';
}

interface CompressionOptions {
  quality?: number; // 0-1 for images
  maxWidth?: number;
  maxHeight?: number;
  progressive?: boolean;
  mobileOptimized?: boolean;
  preserveExif?: boolean;
}

export class ContentCompressionEngine {
  /**
   * Compress image with multiple format support
   */
  static async compressImage(
    file: File,
    options: CompressionOptions = {},
  ): Promise<CompressionResult> {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      progressive = true,
      mobileOptimized = true,
      preserveExif = false,
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = async () => {
        try {
          // Calculate optimal dimensions
          let { width, height } = img;
          const originalSize = file.size;

          // Mobile optimization: smaller dimensions
          const targetMaxWidth = mobileOptimized
            ? Math.min(maxWidth, 1200)
            : maxWidth;
          const targetMaxHeight = mobileOptimized
            ? Math.min(maxHeight, 1200)
            : maxHeight;

          // Maintain aspect ratio
          const aspectRatio = width / height;
          if (width > targetMaxWidth) {
            width = targetMaxWidth;
            height = width / aspectRatio;
          }
          if (height > targetMaxHeight) {
            height = targetMaxHeight;
            width = height * aspectRatio;
          }

          canvas.width = width;
          canvas.height = height;

          // Apply image optimizations
          if (ctx) {
            // Smooth scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, width, height);

            // Try modern formats first
            let bestResult: CompressionResult | null = null;

            // Try AVIF (best compression)
            if (this.supportsFormat('image/avif')) {
              try {
                const avifResult = await this.canvasToBlob(
                  canvas,
                  'image/avif',
                  quality,
                );
                bestResult = {
                  data: avifResult,
                  originalSize,
                  compressedSize: avifResult.size,
                  compressionRatio:
                    ((originalSize - avifResult.size) / originalSize) * 100,
                  algorithm: 'avif',
                };
              } catch (e) {
                console.warn('AVIF compression failed:', e);
              }
            }

            // Try WebP if AVIF failed or not supported
            if (!bestResult && this.supportsFormat('image/webp')) {
              try {
                const webpResult = await this.canvasToBlob(
                  canvas,
                  'image/webp',
                  quality,
                );
                if (
                  !bestResult ||
                  webpResult.size < bestResult.compressedSize
                ) {
                  bestResult = {
                    data: webpResult,
                    originalSize,
                    compressedSize: webpResult.size,
                    compressionRatio:
                      ((originalSize - webpResult.size) / originalSize) * 100,
                    algorithm: 'webp',
                  };
                }
              } catch (e) {
                console.warn('WebP compression failed:', e);
              }
            }

            // Fallback to JPEG
            if (!bestResult) {
              const jpegResult = await this.canvasToBlob(
                canvas,
                'image/jpeg',
                quality,
              );
              bestResult = {
                data: jpegResult,
                originalSize,
                compressedSize: jpegResult.size,
                compressionRatio:
                  ((originalSize - jpegResult.size) / originalSize) * 100,
                algorithm: 'webp',
              };
            }

            resolve(bestResult);
          } else {
            reject(new Error('Canvas context not available'));
          }
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Compress text content (JSON, HTML, CSS, JS)
   */
  static compressText(content: string): CompressionResult {
    const originalSize = new Blob([content]).size;

    // Advanced text compression techniques
    let compressed = content;

    // Remove extra whitespace
    compressed = compressed.replace(/\s+/g, ' ').trim();

    // Remove comments (basic implementation)
    compressed = compressed.replace(/\/\*[\s\S]*?\*\//g, '');
    compressed = compressed.replace(/\/\/.*$/gm, '');

    // Minify common patterns
    compressed = compressed.replace(/;\s*}/g, '}');
    compressed = compressed.replace(/\{\s*/g, '{');
    compressed = compressed.replace(/\s*:\s*/g, ':');
    compressed = compressed.replace(/\s*,\s*/g, ',');

    const compressedSize = new Blob([compressed]).size;

    return {
      data: compressed,
      originalSize,
      compressedSize,
      compressionRatio: ((originalSize - compressedSize) / originalSize) * 100,
      algorithm: 'text',
    };
  }

  /**
   * Progressive image loading optimization
   */
  static async createProgressiveImage(file: File): Promise<{
    thumbnail: Blob;
    medium: Blob;
    full: Blob;
    compressionResults: CompressionResult[];
  }> {
    const results: CompressionResult[] = [];

    // Create thumbnail (fast loading)
    const thumbnailResult = await this.compressImage(file, {
      quality: 0.6,
      maxWidth: 150,
      maxHeight: 150,
      mobileOptimized: true,
    });
    results.push(thumbnailResult);

    // Create medium size (balance of quality and speed)
    const mediumResult = await this.compressImage(file, {
      quality: 0.75,
      maxWidth: 600,
      maxHeight: 600,
      mobileOptimized: true,
    });
    results.push(mediumResult);

    // Create full size (best quality)
    const fullResult = await this.compressImage(file, {
      quality: 0.9,
      maxWidth: 1920,
      maxHeight: 1080,
      progressive: true,
    });
    results.push(fullResult);

    return {
      thumbnail: thumbnailResult.data as Blob,
      medium: mediumResult.data as Blob,
      full: fullResult.data as Blob,
      compressionResults: results,
    };
  }

  /**
   * Batch compression for multiple files
   */
  static async compressBatch(
    files: File[],
    options: CompressionOptions = {},
    onProgress?: (progress: number, file: File) => void,
  ): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        let result: CompressionResult;

        if (file.type.startsWith('image/')) {
          result = await this.compressImage(file, options);
        } else if (this.isTextFile(file)) {
          const text = await this.fileToText(file);
          result = this.compressText(text);
        } else {
          // Skip non-compressible files
          result = {
            data: file,
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 0,
            algorithm: 'gzip',
          };
        }

        results.push(result);

        if (onProgress) {
          onProgress(((i + 1) / files.length) * 100, file);
        }
      } catch (error) {
        console.error(`Failed to compress ${file.name}:`, error);
        // Add failed result
        results.push({
          data: file,
          originalSize: file.size,
          compressedSize: file.size,
          compressionRatio: 0,
          algorithm: 'gzip',
        });
      }
    }

    return results;
  }

  /**
   * Smart compression based on content analysis
   */
  static async smartCompress(
    file: File,
    targetSizeKB?: number,
  ): Promise<CompressionResult> {
    const targetSize = targetSizeKB ? targetSizeKB * 1024 : undefined;

    if (file.type.startsWith('image/')) {
      // For images, adjust quality based on target size
      let quality = 0.8;
      let result = await this.compressImage(file, { quality });

      // If target size specified, adjust quality iteratively
      if (targetSize && result.compressedSize > targetSize) {
        const iterations = 5;
        for (let i = 0; i < iterations; i++) {
          quality -= 0.1;
          if (quality < 0.1) break;

          result = await this.compressImage(file, { quality });
          if (result.compressedSize <= targetSize) break;
        }
      }

      return result;
    } else if (this.isTextFile(file)) {
      const text = await this.fileToText(file);
      return this.compressText(text);
    } else {
      // Return original for non-compressible files
      return {
        data: file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 0,
        algorithm: 'gzip',
      };
    }
  }

  /**
   * Get compression recommendations based on file analysis
   */
  static analyzeFile(file: File): {
    canCompress: boolean;
    recommendedAlgorithm: string;
    estimatedSavings: number;
    mobileOptimizations: string[];
  } {
    const analysis = {
      canCompress: false,
      recommendedAlgorithm: 'none',
      estimatedSavings: 0,
      mobileOptimizations: [] as string[],
    };

    if (file.type.startsWith('image/')) {
      analysis.canCompress = true;

      if (this.supportsFormat('image/avif')) {
        analysis.recommendedAlgorithm = 'AVIF';
        analysis.estimatedSavings = 70; // AVIF typically saves 70%
      } else if (this.supportsFormat('image/webp')) {
        analysis.recommendedAlgorithm = 'WebP';
        analysis.estimatedSavings = 50; // WebP typically saves 50%
      } else {
        analysis.recommendedAlgorithm = 'JPEG';
        analysis.estimatedSavings = 30; // JPEG optimization saves 30%
      }

      analysis.mobileOptimizations = [
        'Resize to mobile-friendly dimensions',
        'Progressive loading',
        'Generate multiple sizes',
        'Add lazy loading attributes',
      ];
    } else if (this.isTextFile(file)) {
      analysis.canCompress = true;
      analysis.recommendedAlgorithm = 'Text minification';
      analysis.estimatedSavings = 20;
      analysis.mobileOptimizations = [
        'Remove unnecessary whitespace',
        'Minify syntax',
        'Enable gzip compression',
      ];
    }

    return analysis;
  }

  // Helper methods
  private static supportsFormat(mimeType: string): boolean {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL(mimeType).startsWith(`data:${mimeType}`);
  }

  private static canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number,
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Failed to create blob for ${type}`));
          }
        },
        type,
        quality,
      );
    });
  }

  private static isTextFile(file: File): boolean {
    return (
      file.type.startsWith('text/') ||
      file.type.includes('json') ||
      file.type.includes('javascript') ||
      file.type.includes('css') ||
      file.type.includes('html')
    );
  }

  private static fileToText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

/**
 * Performance monitoring for compression operations
 */
export class CompressionPerformanceMonitor {
  private metrics: Array<{
    timestamp: number;
    originalSize: number;
    compressedSize: number;
    algorithm: string;
    processingTime: number;
  }> = [];

  recordCompression(result: CompressionResult, processingTime: number): void {
    this.metrics.push({
      timestamp: Date.now(),
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      algorithm: result.algorithm,
      processingTime,
    });

    // Keep only last 100 records
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  getPerformanceStats() {
    if (this.metrics.length === 0) return null;

    const totalOriginal = this.metrics.reduce(
      (sum, m) => sum + m.originalSize,
      0,
    );
    const totalCompressed = this.metrics.reduce(
      (sum, m) => sum + m.compressedSize,
      0,
    );
    const avgProcessingTime =
      this.metrics.reduce((sum, m) => sum + m.processingTime, 0) /
      this.metrics.length;
    const totalSaved = totalOriginal - totalCompressed;

    return {
      totalFiles: this.metrics.length,
      totalOriginalSize: totalOriginal,
      totalCompressedSize: totalCompressed,
      totalSpaceSaved: totalSaved,
      averageCompressionRatio: (totalSaved / totalOriginal) * 100,
      averageProcessingTime: avgProcessingTime,
      algorithmUsage: this.getAlgorithmUsage(),
    };
  }

  private getAlgorithmUsage() {
    const usage: Record<string, number> = {};
    for (const metric of this.metrics) {
      usage[metric.algorithm] = (usage[metric.algorithm] || 0) + 1;
    }
    return usage;
  }
}

export default ContentCompressionEngine;
