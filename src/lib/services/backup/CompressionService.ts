/**
 * CompressionService - Stub implementation
 * This is a basic stub to resolve build errors.
 * Full implementation to be added during backup system development.
 */

interface CompressionResult {
  data: any;
  ratio: number;
  originalSize: number;
  compressedSize: number;
}

export class CompressionService {
  async compress(data: any): Promise<CompressionResult> {
    // Stub implementation - returns data as-is with no compression
    const originalSize = this.getDataSize(data);

    console.warn(
      'CompressionService: Using stub implementation - no actual compression applied',
    );

    return {
      data,
      ratio: 1.0, // No compression
      originalSize,
      compressedSize: originalSize,
    };
  }

  async decompress(compressedData: any): Promise<any> {
    // Stub implementation - returns data as-is
    console.warn(
      'CompressionService: Using stub implementation - no actual decompression applied',
    );
    return compressedData;
  }

  private getDataSize(data: any): number {
    if (Buffer.isBuffer(data)) return data.length;
    if (typeof data === 'string') return Buffer.byteLength(data, 'utf8');
    return JSON.stringify(data).length;
  }
}
