import { z } from 'zod';
import { secureStringSchema } from '../../validation/schemas';

// Progress callback type for large file operations
export type ProgressCallback = (progress: number) => void;

// Compression result interface
export interface CompressionResult {
  compressed: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
  metadata: {
    processingTime: number;
    memoryPeak: number;
  };
}

// Archive file interface
export interface ArchiveFile {
  name: string;
  buffer: Buffer;
  contentType?: string;
  lastModified?: Date;
}

// Compression configuration
const compressionConfig = {
  defaultLevel: 6,
  maxMemoryUsage: 128 * 1024 * 1024, // 128MB
  chunkSize: 64 * 1024, // 64KB chunks for streaming
  maxConcurrentOperations: 3,
  supportedFormats: ['zip', 'gzip'],
  pdfOptimizationLevel: 'medium' as const,
};

// Input validation schemas
const compressFileSchema = z.object({
  compressionLevel: z.number().min(1).max(9).optional().default(6),
  algorithm: z.enum(['gzip', 'brotli']).optional().default('gzip'),
});

const createArchiveSchema = z.object({
  archiveName: z.string().min(1).max(255).optional(),
  compressionLevel: z.number().min(1).max(9).optional().default(6),
});

const optimizePDFSchema = z.object({
  quality: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  preserveMetadata: z.boolean().optional().default(false),
});

/**
 * FileCompressionService - Advanced compression and optimization service
 * Handles ZIP archives, PDF optimization, and progressive compression
 */
export class FileCompressionService {
  private static activeOperations = new Map<string, AbortController>();
  private static memoryUsage = 0;

  /**
   * Compress a single file with configurable algorithms
   * @param fileBuffer - File content buffer
   * @param compressionLevel - Compression level (1-9)
   * @param algorithm - Compression algorithm
   * @param progressCallback - Progress tracking callback
   * @returns Compression result with metrics
   */
  static async compressFile(
    fileBuffer: Buffer,
    compressionLevel: number = 6,
    algorithm: 'gzip' | 'brotli' = 'gzip',
    progressCallback?: ProgressCallback,
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    const operationId = `compress_${Date.now()}_${Math.random()}`;

    try {
      // Input validation
      const validation = compressFileSchema.safeParse({
        compressionLevel,
        algorithm,
      });

      if (!validation.success) {
        throw new Error(
          `Invalid compression parameters: ${validation.error.issues.map((e) => e.message).join(', ')}`,
        );
      }

      // Memory usage check
      const estimatedMemoryUsage = fileBuffer.length * 2; // Estimate 2x for compression
      if (
        this.memoryUsage + estimatedMemoryUsage >
        compressionConfig.maxMemoryUsage
      ) {
        throw new Error('Memory limit exceeded for compression operation');
      }

      // Track memory usage
      this.memoryUsage += estimatedMemoryUsage;

      // Create abort controller for cancellation
      const abortController = new AbortController();
      this.activeOperations.set(operationId, abortController);

      const originalSize = fileBuffer.length;
      let compressed: Buffer;

      try {
        if (algorithm === 'gzip') {
          compressed = await this.compressGzip(
            fileBuffer,
            compressionLevel,
            progressCallback,
          );
        } else {
          compressed = await this.compressBrotli(
            fileBuffer,
            compressionLevel,
            progressCallback,
          );
        }

        const compressedSize = compressed.length;
        const compressionRatio =
          Math.round(
            ((originalSize - compressedSize) / originalSize) * 100 * 100,
          ) / 100;
        const processingTime = Date.now() - startTime;

        return {
          compressed,
          originalSize,
          compressedSize,
          compressionRatio,
          algorithm,
          metadata: {
            processingTime,
            memoryPeak: estimatedMemoryUsage,
          },
        };
      } finally {
        // Cleanup
        this.memoryUsage -= estimatedMemoryUsage;
        this.activeOperations.delete(operationId);
      }
    } catch (error) {
      // Cleanup on error
      this.memoryUsage = Math.max(0, this.memoryUsage - fileBuffer.length * 2);
      this.activeOperations.delete(operationId);

      console.error('FileCompressionService.compressFile error:', error);
      throw error;
    }
  }

  /**
   * Create ZIP archive from multiple files with progress tracking
   * @param files - Array of files to archive
   * @param archiveName - Optional archive name
   * @param compressionLevel - Compression level (1-9)
   * @param progressCallback - Progress tracking callback
   * @returns Compressed ZIP archive buffer
   */
  static async createZipArchive(
    files: ArchiveFile[],
    archiveName?: string,
    compressionLevel: number = 6,
    progressCallback?: ProgressCallback,
  ): Promise<Buffer> {
    const startTime = Date.now();

    try {
      // Input validation
      const validation = createArchiveSchema.safeParse({
        archiveName,
        compressionLevel,
      });

      if (!validation.success) {
        throw new Error(
          `Invalid archive parameters: ${validation.error.issues.map((e) => e.message).join(', ')}`,
        );
      }

      if (!files || files.length === 0) {
        throw new Error('No files provided for archive creation');
      }

      // Calculate total size for memory management
      const totalSize = files.reduce(
        (sum, file) => sum + file.buffer.length,
        0,
      );
      const estimatedMemoryUsage = totalSize * 1.5; // Estimate 1.5x for ZIP overhead

      if (
        this.memoryUsage + estimatedMemoryUsage >
        compressionConfig.maxMemoryUsage
      ) {
        throw new Error('Memory limit exceeded for ZIP archive creation');
      }

      this.memoryUsage += estimatedMemoryUsage;

      try {
        // Use dynamic import to load archiver only when needed
        const archiver = await import('archiver');
        const stream = require('stream');

        return new Promise<Buffer>((resolve, reject) => {
          const bufferChunks: Buffer[] = [];
          const archive = archiver('zip', {
            zlib: { level: compressionLevel },
            forceLocalTime: true,
            forceZip64: false,
          });

          // Create output stream
          const output = new stream.PassThrough();

          output.on('data', (chunk) => {
            bufferChunks.push(chunk);
          });

          output.on('end', () => {
            const result = Buffer.concat(bufferChunks);
            resolve(result);
          });

          archive.on('error', (error) => {
            console.error('ZIP archive creation error:', error);
            reject(error);
          });

          archive.on('progress', (progressData) => {
            if (progressCallback && totalSize > 0) {
              const progress = Math.min(
                100,
                (progressData.fs.processedBytes / totalSize) * 100,
              );
              progressCallback(progress);
            }
          });

          // Pipe archive to output stream
          archive.pipe(output);

          // Add files to archive
          let processedFiles = 0;
          for (const file of files) {
            // Sanitize file names to prevent directory traversal
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

            archive.append(file.buffer, {
              name: sanitizedName,
              date: file.lastModified || new Date(),
            });

            processedFiles++;

            // Update progress for file addition
            if (progressCallback) {
              const fileProgress = (processedFiles / files.length) * 50; // First 50% for file addition
              progressCallback(fileProgress);
            }
          }

          // Finalize archive
          archive.finalize();
        });
      } finally {
        this.memoryUsage -= estimatedMemoryUsage;
      }
    } catch (error) {
      console.error('FileCompressionService.createZipArchive error:', error);
      throw error;
    }
  }

  /**
   * Optimize PDF file size while preserving quality
   * @param pdfBuffer - PDF file buffer
   * @param quality - Optimization quality level
   * @param preserveMetadata - Whether to preserve PDF metadata
   * @returns Optimized PDF buffer
   */
  static async optimizePDF(
    pdfBuffer: Buffer,
    quality: 'low' | 'medium' | 'high' = 'medium',
    preserveMetadata: boolean = false,
  ): Promise<Buffer> {
    try {
      // Input validation
      const validation = optimizePDFSchema.safeParse({
        quality,
        preserveMetadata,
      });

      if (!validation.success) {
        throw new Error(
          `Invalid PDF optimization parameters: ${validation.error.issues.map((e) => e.message).join(', ')}`,
        );
      }

      // Check if buffer is actually a PDF
      if (!this.isPDFBuffer(pdfBuffer)) {
        throw new Error('Invalid PDF file format');
      }

      const originalSize = pdfBuffer.length;

      // Memory usage check
      const estimatedMemoryUsage = originalSize * 2;
      if (
        this.memoryUsage + estimatedMemoryUsage >
        compressionConfig.maxMemoryUsage
      ) {
        throw new Error('Memory limit exceeded for PDF optimization');
      }

      this.memoryUsage += estimatedMemoryUsage;

      try {
        // Use dynamic import to load PDF optimization library
        const PDFDocument = await import('pdf-lib').then((m) => m.PDFDocument);

        // Load PDF document
        const pdfDoc = await PDFDocument.load(pdfBuffer);

        // Apply optimization based on quality level
        let optimizedBuffer: Uint8Array;

        switch (quality) {
          case 'low':
            // Aggressive optimization - may impact quality significantly
            optimizedBuffer = await pdfDoc.save({
              useObjectStreams: true,
              addDefaultPage: false,
              objectsPerTick: 50,
              updateFieldAppearances: false,
            });
            break;

          case 'medium':
            // Balanced optimization - good quality/size ratio
            optimizedBuffer = await pdfDoc.save({
              useObjectStreams: true,
              addDefaultPage: false,
              objectsPerTick: 100,
              updateFieldAppearances: true,
            });
            break;

          case 'high':
            // Conservative optimization - preserve quality
            optimizedBuffer = await pdfDoc.save({
              useObjectStreams: false,
              addDefaultPage: false,
              objectsPerTick: 200,
              updateFieldAppearances: true,
            });
            break;

          default:
            optimizedBuffer = await pdfDoc.save();
        }

        const optimizedSize = optimizedBuffer.length;
        const savings = Math.round(
          ((originalSize - optimizedSize) / originalSize) * 100,
        );

        console.log(
          `PDF optimized: ${originalSize} bytes → ${optimizedSize} bytes (${savings}% reduction)`,
        );

        return Buffer.from(optimizedBuffer);
      } finally {
        this.memoryUsage -= estimatedMemoryUsage;
      }
    } catch (error) {
      console.error('FileCompressionService.optimizePDF error:', error);
      throw error;
    }
  }

  /**
   * Cancel active compression operation
   * @param operationId - Operation identifier to cancel
   * @returns Success status
   */
  static cancelOperation(operationId: string): boolean {
    const controller = this.activeOperations.get(operationId);
    if (controller) {
      controller.abort();
      this.activeOperations.delete(operationId);
      return true;
    }
    return false;
  }

  /**
   * Get current memory usage statistics
   * @returns Memory usage information
   */
  static getMemoryUsage(): {
    current: number;
    maximum: number;
    activeOperations: number;
    utilizationPercentage: number;
  } {
    return {
      current: this.memoryUsage,
      maximum: compressionConfig.maxMemoryUsage,
      activeOperations: this.activeOperations.size,
      utilizationPercentage: Math.round(
        (this.memoryUsage / compressionConfig.maxMemoryUsage) * 100,
      ),
    };
  }

  /**
   * Private method: Compress using gzip algorithm
   */
  private static async compressGzip(
    buffer: Buffer,
    level: number,
    progressCallback?: ProgressCallback,
  ): Promise<Buffer> {
    const zlib = await import('zlib');

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let processedBytes = 0;

      const gzipStream = zlib.createGzip({ level });

      gzipStream.on('data', (chunk) => {
        chunks.push(chunk);
        processedBytes += chunk.length;

        if (progressCallback) {
          const progress = Math.min(
            100,
            (processedBytes / buffer.length) * 100,
          );
          progressCallback(progress);
        }
      });

      gzipStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      gzipStream.on('error', reject);

      // Write data to compression stream
      gzipStream.write(buffer);
      gzipStream.end();
    });
  }

  /**
   * Private method: Compress using brotli algorithm
   */
  private static async compressBrotli(
    buffer: Buffer,
    level: number,
    progressCallback?: ProgressCallback,
  ): Promise<Buffer> {
    const zlib = await import('zlib');

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let processedBytes = 0;

      const brotliStream = zlib.createBrotliCompress({
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: level,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
        },
      });

      brotliStream.on('data', (chunk) => {
        chunks.push(chunk);
        processedBytes += chunk.length;

        if (progressCallback) {
          const progress = Math.min(
            100,
            (processedBytes / buffer.length) * 100,
          );
          progressCallback(progress);
        }
      });

      brotliStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      brotliStream.on('error', reject);

      brotliStream.write(buffer);
      brotliStream.end();
    });
  }

  /**
   * Private method: Check if buffer contains valid PDF data
   */
  private static isPDFBuffer(buffer: Buffer): boolean {
    // PDF files start with "%PDF-" signature
    const pdfSignature = Buffer.from('%PDF-');
    return buffer.subarray(0, 5).equals(pdfSignature);
  }

  /**
   * Determine optimal compression strategy based on file type and size
   * @param contentType - MIME type of file
   * @param fileSize - Size in bytes
   * @returns Recommended compression strategy
   */
  static getOptimalCompressionStrategy(
    contentType: string,
    fileSize: number,
  ): {
    shouldCompress: boolean;
    algorithm: 'gzip' | 'brotli';
    level: number;
    reason: string;
  } {
    // Don't compress if file is already small
    if (fileSize < 1024) {
      return {
        shouldCompress: false,
        algorithm: 'gzip',
        level: 1,
        reason: 'File too small to benefit from compression',
      };
    }

    // Don't compress already compressed formats
    const compressedFormats = ['image/jpeg', 'image/png', 'video/', 'audio/'];
    if (compressedFormats.some((format) => contentType.startsWith(format))) {
      return {
        shouldCompress: false,
        algorithm: 'gzip',
        level: 1,
        reason: 'File format already compressed',
      };
    }

    // Text-based formats benefit most from compression
    const textFormats = [
      'text/',
      'application/json',
      'application/xml',
      'text/csv',
    ];
    if (textFormats.some((format) => contentType.startsWith(format))) {
      return {
        shouldCompress: true,
        algorithm: fileSize > 10 * 1024 * 1024 ? 'gzip' : 'brotli', // Use gzip for large files
        level: fileSize > 1024 * 1024 ? 6 : 9, // Lower compression for large files
        reason: 'Text-based format benefits from compression',
      };
    }

    // PDF files benefit from specialized optimization
    if (contentType === 'application/pdf') {
      return {
        shouldCompress: false, // Use specialized PDF optimization instead
        algorithm: 'gzip',
        level: 6,
        reason: 'PDF requires specialized optimization',
      };
    }

    // Default strategy for other formats
    return {
      shouldCompress: fileSize > 5 * 1024, // Compress if larger than 5KB
      algorithm: 'gzip',
      level: 6,
      reason: 'Standard compression for general file types',
    };
  }
}
