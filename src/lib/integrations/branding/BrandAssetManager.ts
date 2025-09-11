/**
 * WS-221: Branding Customization - Asset Management System
 * Team C - Logo and asset delivery optimization
 */

import { createClient } from '@supabase/supabase-js';

export interface BrandAsset {
  id: string;
  organizationId: string;
  type: 'logo' | 'favicon' | 'background' | 'icon' | 'custom';
  name: string;
  originalUrl: string;
  optimizedUrl?: string;
  thumbnailUrl?: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  format: string;
  isOptimized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'svg';
  generateThumbnail?: boolean;
  enableCDN?: boolean;
}

export class BrandAssetManager {
  private supabase: ReturnType<typeof createClient>;
  private assetCache: Map<string, BrandAsset> = new Map();
  private preloadCache: Set<string> = new Set();
  private cdnBaseUrl: string;

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase;
    this.cdnBaseUrl = process.env.NEXT_PUBLIC_CDN_URL || '';
  }

  /**
   * Upload and optimize brand asset
   */
  async uploadAsset(
    organizationId: string,
    file: File,
    type: BrandAsset['type'],
    options: AssetOptimizationOptions = {},
  ): Promise<BrandAsset | null> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${organizationId}/${type}/${timestamp}_${sanitizedName}`;

      // Upload original file
      const { data: uploadData, error: uploadError } =
        await this.supabase.storage
          .from('brand-assets')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
          });

      if (uploadError) {
        console.error('[BrandAssetManager] Upload failed:', uploadError);
        return null;
      }

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from('brand-assets')
        .getPublicUrl(fileName);

      const originalUrl = publicUrlData.publicUrl;

      // Get file dimensions for images
      const dimensions = await this.getImageDimensions(file);

      // Create asset record
      const assetData = {
        organization_id: organizationId,
        type,
        name: file.name,
        original_url: originalUrl,
        size: file.size,
        dimensions: dimensions ? JSON.stringify(dimensions) : null,
        format: file.type,
        is_optimized: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: assetRecord, error: dbError } = await this.supabase
        .from('brand_assets')
        .insert(assetData)
        .select()
        .single();

      if (dbError) {
        console.error('[BrandAssetManager] Database insert failed:', dbError);
        return null;
      }

      const brandAsset: BrandAsset = {
        id: assetRecord.id,
        organizationId: assetRecord.organization_id,
        type: assetRecord.type,
        name: assetRecord.name,
        originalUrl: assetRecord.original_url,
        optimizedUrl: assetRecord.optimized_url,
        thumbnailUrl: assetRecord.thumbnail_url,
        size: assetRecord.size,
        dimensions: assetRecord.dimensions
          ? JSON.parse(assetRecord.dimensions)
          : undefined,
        format: assetRecord.format,
        isOptimized: assetRecord.is_optimized,
        createdAt: new Date(assetRecord.created_at),
        updatedAt: new Date(assetRecord.updated_at),
      };

      // Cache the asset
      this.assetCache.set(brandAsset.id, brandAsset);

      // Trigger optimization in background
      this.optimizeAsset(brandAsset.id, options).catch((error) =>
        console.error(
          '[BrandAssetManager] Background optimization failed:',
          error,
        ),
      );

      console.log(`[BrandAssetManager] Asset uploaded: ${brandAsset.name}`);
      return brandAsset;
    } catch (error) {
      console.error('[BrandAssetManager] Upload failed:', error);
      return null;
    }
  }

  /**
   * Optimize existing asset
   */
  async optimizeAsset(
    assetId: string,
    options: AssetOptimizationOptions = {},
  ): Promise<BrandAsset | null> {
    try {
      const asset = await this.getAsset(assetId);
      if (!asset || asset.isOptimized) {
        return asset;
      }

      // Download original image
      const response = await fetch(asset.originalUrl);
      const arrayBuffer = await response.arrayBuffer();
      const originalFile = new File([arrayBuffer], asset.name, {
        type: asset.format,
      });

      // Apply optimizations based on asset type
      const optimizationSettings = this.getOptimizationSettings(
        asset.type,
        options,
      );

      // For now, we'll simulate optimization by copying the original
      // In a real implementation, you'd use an image processing library
      const optimizedUrl = await this.processImage(
        originalFile,
        optimizationSettings,
      );

      let thumbnailUrl: string | undefined;
      if (optimizationSettings.generateThumbnail) {
        thumbnailUrl = await this.generateThumbnail(originalFile);
      }

      // Update database record
      const { data: updatedRecord, error } = await this.supabase
        .from('brand_assets')
        .update({
          optimized_url: optimizedUrl,
          thumbnail_url: thumbnailUrl,
          is_optimized: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assetId)
        .select()
        .single();

      if (error) {
        console.error('[BrandAssetManager] Optimization update failed:', error);
        return null;
      }

      const optimizedAsset: BrandAsset = {
        ...asset,
        optimizedUrl: updatedRecord.optimized_url,
        thumbnailUrl: updatedRecord.thumbnail_url,
        isOptimized: updatedRecord.is_optimized,
        updatedAt: new Date(updatedRecord.updated_at),
      };

      // Update cache
      this.assetCache.set(assetId, optimizedAsset);

      console.log(
        `[BrandAssetManager] Asset optimized: ${optimizedAsset.name}`,
      );
      return optimizedAsset;
    } catch (error) {
      console.error('[BrandAssetManager] Optimization failed:', error);
      return null;
    }
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string): Promise<BrandAsset | null> {
    try {
      // Check cache first
      if (this.assetCache.has(assetId)) {
        return this.assetCache.get(assetId)!;
      }

      // Fetch from database
      const { data, error } = await this.supabase
        .from('brand_assets')
        .select('*')
        .eq('id', assetId)
        .single();

      if (error || !data) {
        return null;
      }

      const asset: BrandAsset = {
        id: data.id,
        organizationId: data.organization_id,
        type: data.type,
        name: data.name,
        originalUrl: data.original_url,
        optimizedUrl: data.optimized_url,
        thumbnailUrl: data.thumbnail_url,
        size: data.size,
        dimensions: data.dimensions ? JSON.parse(data.dimensions) : undefined,
        format: data.format,
        isOptimized: data.is_optimized,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      // Cache the result
      this.assetCache.set(assetId, asset);
      return asset;
    } catch (error) {
      console.error('[BrandAssetManager] Failed to get asset:', error);
      return null;
    }
  }

  /**
   * Get assets by organization and type
   */
  async getAssetsByOrganization(
    organizationId: string,
    type?: BrandAsset['type'],
  ): Promise<BrandAsset[]> {
    try {
      let query = this.supabase
        .from('brand_assets')
        .select('*')
        .eq('organization_id', organizationId);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) {
        console.error('[BrandAssetManager] Failed to get assets:', error);
        return [];
      }

      const assets: BrandAsset[] = data.map((record) => ({
        id: record.id,
        organizationId: record.organization_id,
        type: record.type,
        name: record.name,
        originalUrl: record.original_url,
        optimizedUrl: record.optimized_url,
        thumbnailUrl: record.thumbnail_url,
        size: record.size,
        dimensions: record.dimensions
          ? JSON.parse(record.dimensions)
          : undefined,
        format: record.format,
        isOptimized: record.is_optimized,
        createdAt: new Date(record.created_at),
        updatedAt: new Date(record.updated_at),
      }));

      // Cache all assets
      assets.forEach((asset) => this.assetCache.set(asset.id, asset));

      return assets;
    } catch (error) {
      console.error(
        '[BrandAssetManager] Failed to get assets by organization:',
        error,
      );
      return [];
    }
  }

  /**
   * Preload asset for better performance
   */
  async preloadAsset(url: string): Promise<void> {
    if (this.preloadCache.has(url)) {
      return;
    }

    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = 'image';
      document.head.appendChild(link);

      this.preloadCache.add(url);
      console.log(`[BrandAssetManager] Preloaded asset: ${url}`);
    } catch (error) {
      console.error('[BrandAssetManager] Failed to preload asset:', error);
    }
  }

  /**
   * Delete asset
   */
  async deleteAsset(assetId: string): Promise<boolean> {
    try {
      const asset = await this.getAsset(assetId);
      if (!asset) {
        return false;
      }

      // Extract file path from URL
      const urlParts = asset.originalUrl.split('/');
      const filePath = urlParts.slice(-3).join('/'); // organization/type/filename

      // Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from('brand-assets')
        .remove([filePath]);

      if (storageError) {
        console.warn(
          '[BrandAssetManager] Storage deletion failed:',
          storageError,
        );
      }

      // Delete optimized versions if they exist
      if (asset.optimizedUrl && asset.optimizedUrl !== asset.originalUrl) {
        const optimizedPath = asset.optimizedUrl.split('/').slice(-3).join('/');
        await this.supabase.storage
          .from('brand-assets')
          .remove([optimizedPath]);
      }

      if (asset.thumbnailUrl) {
        const thumbnailPath = asset.thumbnailUrl.split('/').slice(-3).join('/');
        await this.supabase.storage
          .from('brand-assets')
          .remove([thumbnailPath]);
      }

      // Delete from database
      const { error: dbError } = await this.supabase
        .from('brand_assets')
        .delete()
        .eq('id', assetId);

      if (dbError) {
        console.error('[BrandAssetManager] Database deletion failed:', dbError);
        return false;
      }

      // Remove from cache
      this.assetCache.delete(assetId);

      console.log(`[BrandAssetManager] Asset deleted: ${asset.name}`);
      return true;
    } catch (error) {
      console.error('[BrandAssetManager] Failed to delete asset:', error);
      return false;
    }
  }

  /**
   * Get optimization settings based on asset type
   */
  private getOptimizationSettings(
    type: BrandAsset['type'],
    options: AssetOptimizationOptions,
  ): Required<AssetOptimizationOptions> {
    const defaults = {
      logo: {
        maxWidth: 800,
        maxHeight: 400,
        quality: 90,
        format: 'webp' as const,
        generateThumbnail: true,
        enableCDN: true,
      },
      favicon: {
        maxWidth: 64,
        maxHeight: 64,
        quality: 95,
        format: 'png' as const,
        generateThumbnail: false,
        enableCDN: true,
      },
      background: {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 80,
        format: 'webp' as const,
        generateThumbnail: true,
        enableCDN: true,
      },
      icon: {
        maxWidth: 256,
        maxHeight: 256,
        quality: 90,
        format: 'webp' as const,
        generateThumbnail: true,
        enableCDN: true,
      },
      custom: {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 85,
        format: 'webp' as const,
        generateThumbnail: true,
        enableCDN: true,
      },
    };

    return { ...defaults[type], ...options };
  }

  /**
   * Get image dimensions from file
   */
  private async getImageDimensions(
    file: File,
  ): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(null);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };

      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(url);
      };

      img.src = url;
    });
  }

  /**
   * Process image with optimization settings
   * In a real implementation, this would use an image processing library
   */
  private async processImage(
    file: File,
    settings: Required<AssetOptimizationOptions>,
  ): Promise<string> {
    // For now, return the original URL as a placeholder
    // In production, implement actual image processing
    const fileName = `optimized_${Date.now()}_${file.name}`;
    const filePath = `optimized/${fileName}`;

    // Upload optimized version (placeholder - just re-upload original)
    const { data } = await this.supabase.storage
      .from('brand-assets')
      .upload(filePath, file, { cacheControl: '86400' });

    if (data) {
      const { data: publicUrl } = this.supabase.storage
        .from('brand-assets')
        .getPublicUrl(filePath);

      return publicUrl.publicUrl;
    }

    throw new Error('Failed to process image');
  }

  /**
   * Generate thumbnail
   */
  private async generateThumbnail(file: File): Promise<string> {
    // Placeholder implementation - in production, generate actual thumbnail
    const fileName = `thumb_${Date.now()}_${file.name}`;
    const filePath = `thumbnails/${fileName}`;

    const { data } = await this.supabase.storage
      .from('brand-assets')
      .upload(filePath, file, { cacheControl: '86400' });

    if (data) {
      const { data: publicUrl } = this.supabase.storage
        .from('brand-assets')
        .getPublicUrl(filePath);

      return publicUrl.publicUrl;
    }

    throw new Error('Failed to generate thumbnail');
  }

  /**
   * Get CDN URL for asset
   */
  getCDNUrl(originalUrl: string): string {
    if (!this.cdnBaseUrl) {
      return originalUrl;
    }

    // Extract the file path and prepend CDN base URL
    const urlParts = originalUrl.split('/');
    const filePath = urlParts.slice(-3).join('/');
    return `${this.cdnBaseUrl}/${filePath}`;
  }

  /**
   * Clear asset cache
   */
  clearCache(): void {
    this.assetCache.clear();
    this.preloadCache.clear();
    console.log('[BrandAssetManager] Cache cleared');
  }
}

export default BrandAssetManager;
