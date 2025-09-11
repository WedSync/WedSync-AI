/**
 * WS-187: App Store Asset Generation Service
 * Automated screenshot, icon, and metadata generation with Sharp and Playwright
 */

import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

interface AssetGenerationJob {
  id: string;
  organization_id: string;
  job_type:
    | 'screenshot_generation'
    | 'icon_optimization'
    | 'metadata_update'
    | 'bulk_processing';
  platform: string;
  job_config: {
    asset_types: string[];
    device_presets: string[];
    optimization_level: 'standard' | 'aggressive';
    branding?: {
      primary_color: string;
      secondary_color?: string;
      logo_url?: string;
    };
    quality_settings?: {
      screenshot_quality: number;
      icon_quality: number;
      compression_type: 'lossless' | 'optimized';
    };
  };
  created_by: string;
}

interface DevicePreset {
  name: string;
  width: number;
  height: number;
  device_type: 'mobile' | 'tablet';
  platform: 'apple' | 'google_play';
  scale_factor: number;
}

interface GeneratedAsset {
  type: 'screenshot' | 'icon' | 'metadata';
  device_preset?: string;
  file_path: string;
  file_size: number;
  dimensions: { width: number; height: number };
  quality_score: number;
}

export class AssetGenerationService {
  private supabase: any;
  private readonly DEVICE_PRESETS: Record<string, DevicePreset> = {
    // Apple presets
    iphone_6_7: {
      name: 'iPhone 6.7"',
      width: 1290,
      height: 2796,
      device_type: 'mobile',
      platform: 'apple',
      scale_factor: 3,
    },
    iphone_6_5: {
      name: 'iPhone 6.5"',
      width: 1242,
      height: 2688,
      device_type: 'mobile',
      platform: 'apple',
      scale_factor: 3,
    },
    iphone_6_1: {
      name: 'iPhone 6.1"',
      width: 1170,
      height: 2532,
      device_type: 'mobile',
      platform: 'apple',
      scale_factor: 3,
    },
    iphone_5_5: {
      name: 'iPhone 5.5"',
      width: 1242,
      height: 2208,
      device_type: 'mobile',
      platform: 'apple',
      scale_factor: 3,
    },
    ipad_12_9: {
      name: 'iPad Pro 12.9"',
      width: 2048,
      height: 2732,
      device_type: 'tablet',
      platform: 'apple',
      scale_factor: 2,
    },
    ipad_11: {
      name: 'iPad Pro 11"',
      width: 1668,
      height: 2388,
      device_type: 'tablet',
      platform: 'apple',
      scale_factor: 2,
    },

    // Google Play presets
    android_phone: {
      name: 'Android Phone',
      width: 1080,
      height: 1920,
      device_type: 'mobile',
      platform: 'google_play',
      scale_factor: 3,
    },
    android_tablet_7: {
      name: 'Android 7" Tablet',
      width: 1200,
      height: 1920,
      device_type: 'tablet',
      platform: 'google_play',
      scale_factor: 2,
    },
    android_tablet_10: {
      name: 'Android 10" Tablet',
      width: 1600,
      height: 2560,
      device_type: 'tablet',
      platform: 'google_play',
      scale_factor: 2,
    },
  };

  private readonly ICON_SIZES = {
    apple: [
      { size: 1024, name: 'app-icon-1024.png', required: true },
      { size: 512, name: 'app-icon-512.png', required: false },
      { size: 256, name: 'app-icon-256.png', required: false },
      { size: 128, name: 'app-icon-128.png', required: false },
      { size: 64, name: 'app-icon-64.png', required: false },
      { size: 32, name: 'app-icon-32.png', required: false },
      { size: 16, name: 'app-icon-16.png', required: false },
    ],
    google_play: [
      { size: 512, name: 'app-icon-512.png', required: true },
      { size: 192, name: 'app-icon-192.png', required: false },
      { size: 144, name: 'app-icon-144.png', required: false },
      { size: 96, name: 'app-icon-96.png', required: false },
      { size: 72, name: 'app-icon-72.png', required: false },
      { size: 48, name: 'app-icon-48.png', required: false },
    ],
  };

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Create a new asset generation job
   */
  async createGenerationJob(
    jobData: Omit<AssetGenerationJob, 'id'>,
  ): Promise<AssetGenerationJob> {
    const { data, error } = await this.supabase
      .from('asset_generation_jobs')
      .insert({
        organization_id: jobData.organization_id,
        job_type: jobData.job_type,
        platform: jobData.platform,
        status: 'queued',
        progress_percentage: 0,
        total_assets: this.calculateTotalAssets(jobData.job_config),
        job_config: jobData.job_config,
        created_by: jobData.created_by,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create generation job: ${error.message}`);
    }

    return { ...jobData, id: data.id };
  }

  /**
   * Process asset generation job
   */
  async processAssetGeneration(jobId: string): Promise<void> {
    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, 'processing', 0);

      const job = await this.getJob(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      const results: GeneratedAsset[] = [];
      let processedAssets = 0;
      const totalAssets = job.total_assets || 0;

      // Generate screenshots if requested
      if (job.job_config.asset_types.includes('screenshots')) {
        const screenshots = await this.generateScreenshots(job);
        results.push(...screenshots);
        processedAssets += screenshots.length;

        await this.updateJobProgress(
          jobId,
          Math.round((processedAssets / totalAssets) * 100),
        );
      }

      // Generate icons if requested
      if (job.job_config.asset_types.includes('icons')) {
        const icons = await this.generateIcons(job);
        results.push(...icons);
        processedAssets += icons.length;

        await this.updateJobProgress(
          jobId,
          Math.round((processedAssets / totalAssets) * 100),
        );
      }

      // Generate metadata if requested
      if (job.job_config.asset_types.includes('metadata')) {
        const metadata = await this.generateMetadata(job);
        results.push(...metadata);
        processedAssets += metadata.length;

        await this.updateJobProgress(
          jobId,
          Math.round((processedAssets / totalAssets) * 100),
        );
      }

      // Store generated assets in database
      await this.storeGeneratedAssets(job.organization_id, results);

      // Complete the job
      await this.completeJob(jobId, results);
    } catch (error) {
      console.error(`Asset generation failed for job ${jobId}:`, error);
      await this.failJob(
        jobId,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  /**
   * Generate screenshots using Playwright automation
   */
  private async generateScreenshots(
    job: AssetGenerationJob,
  ): Promise<GeneratedAsset[]> {
    const results: GeneratedAsset[] = [];

    try {
      // Import Playwright dynamically to avoid bundling issues
      const { chromium } = await import('playwright');

      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      for (const presetName of job.job_config.device_presets) {
        const preset = this.DEVICE_PRESETS[presetName];
        if (!preset) {
          console.warn(`Unknown device preset: ${presetName}`);
          continue;
        }

        const context = await browser.newContext({
          viewport: { width: preset.width, height: preset.height },
          deviceScaleFactor: preset.scale_factor,
          hasTouch: preset.device_type === 'mobile',
          isMobile: preset.device_type === 'mobile',
        });

        const page = await context.newPage();

        // Navigate to WedSync application
        const baseUrl =
          process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';
        await page.goto(`${baseUrl}/demo/wedding-dashboard`, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        // Wait for page to fully load
        await page.waitForTimeout(3000);

        // Take screenshot
        const screenshotBuffer = await page.screenshot({
          type: 'png',
          quality: job.job_config.quality_settings?.screenshot_quality || 90,
          fullPage: false,
        });

        // Optimize image with Sharp
        const optimizedBuffer = await this.optimizeScreenshot(
          screenshotBuffer,
          preset,
          job.job_config.optimization_level,
        );

        // Upload to storage
        const fileName = `screenshots/${job.id}/${preset.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.png`;
        const filePath = await this.uploadToStorage(optimizedBuffer, fileName);

        results.push({
          type: 'screenshot',
          device_preset: presetName,
          file_path: filePath,
          file_size: optimizedBuffer.length,
          dimensions: { width: preset.width, height: preset.height },
          quality_score: this.calculateQualityScore(optimizedBuffer, preset),
        });

        await context.close();
      }

      await browser.close();
    } catch (error) {
      console.error('Screenshot generation error:', error);
      throw new Error(
        `Screenshot generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return results;
  }

  /**
   * Generate icons with multiple resolutions
   */
  private async generateIcons(
    job: AssetGenerationJob,
  ): Promise<GeneratedAsset[]> {
    const results: GeneratedAsset[] = [];

    try {
      // Get base icon (either from branding config or default)
      let baseIconBuffer: Buffer;

      if (job.job_config.branding?.logo_url) {
        // Fetch logo from URL
        const response = await fetch(job.job_config.branding.logo_url);
        if (!response.ok) {
          throw new Error(`Failed to fetch logo: ${response.statusText}`);
        }
        baseIconBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        // Use default WedSync logo
        const defaultLogoPath = process.cwd() + '/public/logo.png';
        baseIconBuffer = await sharp(defaultLogoPath).png().toBuffer();
      }

      const platform = job.platform === 'apple' ? 'apple' : 'google_play';
      const iconSizes = this.ICON_SIZES[platform];

      for (const iconSize of iconSizes) {
        const iconBuffer = await sharp(baseIconBuffer)
          .resize(iconSize.size, iconSize.size, {
            fit: 'cover',
            position: 'center',
            background: { r: 255, g: 255, b: 255, alpha: 0 },
          })
          .png({
            quality: job.job_config.quality_settings?.icon_quality || 95,
            compressionLevel:
              job.job_config.quality_settings?.compression_type === 'lossless'
                ? 0
                : 6,
            progressive: true,
          })
          .toBuffer();

        // Apply branding if specified
        const brandedIconBuffer = await this.applyIconBranding(
          iconBuffer,
          iconSize.size,
          job.job_config.branding,
        );

        // Upload to storage
        const fileName = `icons/${job.id}/${iconSize.name}`;
        const filePath = await this.uploadToStorage(
          brandedIconBuffer,
          fileName,
        );

        results.push({
          type: 'icon',
          file_path: filePath,
          file_size: brandedIconBuffer.length,
          dimensions: { width: iconSize.size, height: iconSize.size },
          quality_score: this.calculateIconQualityScore(
            brandedIconBuffer,
            iconSize.size,
          ),
        });
      }
    } catch (error) {
      console.error('Icon generation error:', error);
      throw new Error(
        `Icon generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return results;
  }

  /**
   * Generate optimized metadata
   */
  private async generateMetadata(
    job: AssetGenerationJob,
  ): Promise<GeneratedAsset[]> {
    const results: GeneratedAsset[] = [];

    try {
      // Generate AI-enhanced app descriptions
      const weddingKeywords = [
        'wedding planning',
        'wedding management',
        'bridal',
        'groom',
        'venue booking',
        'vendor coordination',
        'guest list',
        'RSVP',
        'timeline',
        'budget tracking',
        'photography',
        'catering',
        'floral',
        'music',
        'decoration',
      ];

      const platformSpecificMetadata = this.generatePlatformMetadata(
        job.platform,
        weddingKeywords,
      );

      // Store metadata as JSON file
      const metadataContent = JSON.stringify(platformSpecificMetadata, null, 2);
      const metadataBuffer = Buffer.from(metadataContent, 'utf-8');

      const fileName = `metadata/${job.id}/app_metadata.json`;
      const filePath = await this.uploadToStorage(metadataBuffer, fileName);

      results.push({
        type: 'metadata',
        file_path: filePath,
        file_size: metadataBuffer.length,
        dimensions: { width: 0, height: 0 },
        quality_score: this.calculateMetadataQualityScore(
          platformSpecificMetadata,
        ),
      });
    } catch (error) {
      console.error('Metadata generation error:', error);
      throw new Error(
        `Metadata generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return results;
  }

  /**
   * Optimize screenshot with Sharp
   */
  private async optimizeScreenshot(
    buffer: Buffer,
    preset: DevicePreset,
    optimizationLevel: 'standard' | 'aggressive',
  ): Promise<Buffer> {
    let pipeline = sharp(buffer);

    if (optimizationLevel === 'aggressive') {
      // Aggressive optimization
      pipeline = pipeline.png({
        quality: 80,
        compressionLevel: 9,
        progressive: true,
        palette: true,
      });
    } else {
      // Standard optimization
      pipeline = pipeline.png({
        quality: 90,
        compressionLevel: 6,
        progressive: true,
      });
    }

    return pipeline.toBuffer();
  }

  /**
   * Apply branding to icons
   */
  private async applyIconBranding(
    iconBuffer: Buffer,
    size: number,
    branding?: AssetGenerationJob['job_config']['branding'],
  ): Promise<Buffer> {
    if (!branding) {
      return iconBuffer;
    }

    try {
      // Apply color overlay or border if primary color is specified
      let pipeline = sharp(iconBuffer);

      if (branding.primary_color) {
        // Create a subtle border with the primary color
        const borderWidth = Math.max(2, Math.round(size * 0.02));

        pipeline = pipeline.extend({
          top: borderWidth,
          bottom: borderWidth,
          left: borderWidth,
          right: borderWidth,
          background: branding.primary_color,
        });
      }

      return pipeline.toBuffer();
    } catch (error) {
      console.error('Icon branding error:', error);
      return iconBuffer; // Return original if branding fails
    }
  }

  /**
   * Generate platform-specific metadata
   */
  private generatePlatformMetadata(platform: string, keywords: string[]) {
    const baseMetadata = {
      app_title: 'WedSync Pro - Wedding Planning',
      app_description:
        'Complete wedding planning and management solution for photographers, planners, and couples. Streamline vendor coordination, guest management, timeline planning, and budget tracking in one powerful platform.',
      keywords: keywords,
      category: platform === 'apple' ? 'Lifestyle' : 'LIFESTYLE',
      content_rating: platform === 'apple' ? '4+' : 'Everyone',
      privacy_policy_url: 'https://wedsync.app/privacy',
      support_url: 'https://wedsync.app/support',
    };

    if (platform === 'apple') {
      return {
        ...baseMetadata,
        app_subtitle: 'Professional Wedding Management',
        promotional_text:
          'The complete solution for wedding professionals and couples.',
        marketing_url: 'https://wedsync.app',
        app_review_information: {
          contact_email: 'support@wedsync.app',
          contact_phone: '+1-555-WEDSYNC',
          review_notes:
            'Demo account available for review. Contact support for credentials.',
        },
      };
    } else {
      return {
        ...baseMetadata,
        short_description:
          'Complete wedding planning and vendor management platform',
        full_description: baseMetadata.app_description,
        graphic_image_url:
          'https://wedsync.app/store-assets/feature-graphic.png',
        promo_video_url: 'https://wedsync.app/store-assets/promo-video.mp4',
      };
    }
  }

  /**
   * Calculate quality score for assets
   */
  private calculateQualityScore(buffer: Buffer, preset: DevicePreset): number {
    const fileSizeKB = buffer.length / 1024;
    const pixelCount = preset.width * preset.height;
    const compressionRatio = fileSizeKB / (pixelCount / 1000);

    // Quality score based on file size efficiency and dimensions
    let score = 1.0;

    if (compressionRatio < 50) score = 0.95;
    else if (compressionRatio < 100) score = 0.9;
    else if (compressionRatio < 200) score = 0.85;
    else score = 0.8;

    return Math.max(0.5, Math.min(1.0, score));
  }

  private calculateIconQualityScore(buffer: Buffer, size: number): number {
    const fileSizeKB = buffer.length / 1024;
    const expectedSize = size >= 512 ? 100 : size >= 256 ? 50 : 20;

    let score = 1.0;
    if (fileSizeKB > expectedSize * 2) score = 0.85;
    else if (fileSizeKB > expectedSize * 1.5) score = 0.9;
    else if (fileSizeKB < expectedSize * 0.5) score = 0.8; // Too compressed

    return Math.max(0.5, Math.min(1.0, score));
  }

  private calculateMetadataQualityScore(metadata: any): number {
    let score = 0.5;

    if (metadata.app_title && metadata.app_title.length > 10) score += 0.1;
    if (metadata.app_description && metadata.app_description.length > 100)
      score += 0.1;
    if (metadata.keywords && metadata.keywords.length >= 10) score += 0.1;
    if (metadata.privacy_policy_url) score += 0.1;
    if (metadata.support_url) score += 0.1;

    return Math.min(1.0, score);
  }

  /**
   * Upload buffer to Supabase storage
   */
  private async uploadToStorage(
    buffer: Buffer,
    fileName: string,
  ): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('app-store-assets')
      .upload(fileName, buffer, {
        contentType: fileName.endsWith('.json')
          ? 'application/json'
          : 'image/png',
        upsert: true,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = this.supabase.storage.from('app-store-assets').getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * Store generated assets in database
   */
  private async storeGeneratedAssets(
    organizationId: string,
    assets: GeneratedAsset[],
  ): Promise<void> {
    const assetRecords = assets.map((asset) => ({
      organization_id: organizationId,
      asset_type: asset.type,
      platform: asset.device_preset
        ? this.getPresetPlatform(asset.device_preset)
        : 'web',
      version_number: '1.0.0',
      file_path: asset.file_path,
      file_size: asset.file_size,
      mime_type: asset.type === 'metadata' ? 'application/json' : 'image/png',
      dimensions: asset.dimensions,
      status: 'ready',
      quality_score: asset.quality_score,
      metadata: asset.device_preset
        ? { device_preset: asset.device_preset }
        : {},
    }));

    const { error } = await this.supabase
      .from('app_store_assets')
      .insert(assetRecords);

    if (error) {
      throw new Error(`Failed to store assets: ${error.message}`);
    }
  }

  private getPresetPlatform(presetName: string): string {
    const preset = this.DEVICE_PRESETS[presetName];
    return preset?.platform || 'web';
  }

  private calculateTotalAssets(
    config: AssetGenerationJob['job_config'],
  ): number {
    let total = 0;

    if (config.asset_types.includes('screenshots')) {
      total += config.device_presets.length;
    }

    if (config.asset_types.includes('icons')) {
      const platform =
        config.device_presets[0]?.startsWith('iphone') ||
        config.device_presets[0]?.startsWith('ipad')
          ? 'apple'
          : 'google_play';
      total += this.ICON_SIZES[platform].length;
    }

    if (config.asset_types.includes('metadata')) {
      total += 1;
    }

    return total;
  }

  private async getJob(jobId: string): Promise<AssetGenerationJob | null> {
    const { data, error } = await this.supabase
      .from('asset_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Get job error:', error);
      return null;
    }

    return data;
  }

  private async updateJobStatus(
    jobId: string,
    status: string,
    progress: number,
  ): Promise<void> {
    const updates: any = {
      status,
      progress_percentage: progress,
      updated_at: new Date().toISOString(),
    };

    if (status === 'processing') {
      updates.started_at = new Date().toISOString();
    }

    await this.supabase
      .from('asset_generation_jobs')
      .update(updates)
      .eq('id', jobId);
  }

  private async updateJobProgress(
    jobId: string,
    progress: number,
  ): Promise<void> {
    await this.supabase
      .from('asset_generation_jobs')
      .update({
        progress_percentage: Math.min(100, Math.max(0, progress)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  private async completeJob(
    jobId: string,
    results: GeneratedAsset[],
  ): Promise<void> {
    const endTime = new Date();

    await this.supabase
      .from('asset_generation_jobs')
      .update({
        status: 'completed',
        progress_percentage: 100,
        processed_assets: results.length,
        completed_at: endTime.toISOString(),
        updated_at: endTime.toISOString(),
      })
      .eq('id', jobId);
  }

  private async failJob(jobId: string, errorMessage: string): Promise<void> {
    await this.supabase
      .from('asset_generation_jobs')
      .update({
        status: 'failed',
        error_log: [
          { timestamp: new Date().toISOString(), message: errorMessage },
        ],
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}
