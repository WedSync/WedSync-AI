import { createClient } from '@/lib/supabase/client';
import {
  AppStoreMetadata,
  AssetGenerationConfig,
  GeneratedAsset,
  PackageManifest,
  AssetDistributorInterface,
} from './types';

// Interfaces now imported from types.ts

export class AssetDistributor implements AssetDistributorInterface {
  private supabase: ReturnType<typeof createClient>;
  private cdnBaseUrl: string;
  private assetBucket: string;

  constructor() {
    this.supabase = createClient();
    this.cdnBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.assetBucket = 'app-store-assets';
  }

  async generatePlatformAssets(
    platform: 'microsoft' | 'google' | 'apple',
    metadata: AppStoreMetadata,
    testMode: boolean = false,
  ): Promise<FormData> {
    const config: AssetGenerationConfig = {
      platform,
      testMode,
      brandingOptions: {
        primaryColor: '#6366F1', // WedSync brand color
        secondaryColor: '#EC4899',
        logo: await this.getWedSyncLogo(),
        watermarkText: testMode ? 'TEST BUILD' : undefined,
      },
      localization: {
        language: 'en',
        region: 'US',
        currency: 'USD',
      },
    };

    try {
      // Generate all required assets for the platform
      const icons = await this.generateIcons(platform, config);
      const screenshots = await this.generateScreenshots(
        platform,
        metadata,
        config,
      );
      const manifest = await this.generateManifest(
        platform,
        metadata,
        icons,
        config,
      );
      const packageData = await this.generatePackage(
        platform,
        manifest,
        icons,
        screenshots,
      );

      // Create FormData for platform submission
      const formData = new FormData();

      // Add manifest file
      formData.append(
        'manifest',
        new Blob([JSON.stringify(manifest)], { type: 'application/json' }),
        'manifest.json',
      );

      // Add icons
      for (const [size, iconData] of Object.entries(icons)) {
        formData.append(
          `icon_${size}`,
          iconData.blob,
          `icon_${size}.${iconData.format}`,
        );
      }

      // Add screenshots
      screenshots.forEach((screenshot, index) => {
        formData.append(
          `screenshot_${index}`,
          screenshot.blob,
          `screenshot_${index}.${screenshot.format}`,
        );
      });

      // Add platform-specific package
      if (packageData) {
        formData.append('package', packageData.blob, packageData.filename);
      }

      // Store asset references in database
      await this.storeAssetReferences(
        platform,
        metadata,
        icons,
        screenshots,
        manifest,
      );

      return formData;
    } catch (error) {
      console.error('Asset generation failed:', error);
      throw error;
    }
  }

  private async generateIcons(
    platform: string,
    config: AssetGenerationConfig,
  ): Promise<{ [size: string]: { blob: Blob; format: string; url: string } }> {
    const iconSizes = this.getRequiredIconSizes(platform);
    const generatedIcons: {
      [size: string]: { blob: Blob; format: string; url: string };
    } = {};

    for (const iconSpec of iconSizes) {
      const { size, format } = iconSpec;
      const [width, height] = size.split('x').map(Number);

      try {
        // Generate icon using canvas or image processing
        const iconData = await this.generateIcon(width, height, format, config);
        const fileName = `${platform}/icons/icon_${size}.${format}`;

        // Upload to Supabase storage
        const { data: uploadData, error } = await this.supabase.storage
          .from(this.assetBucket)
          .upload(fileName, iconData.blob, {
            contentType: `image/${format}`,
            cacheControl: '3600',
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = this.supabase.storage
          .from(this.assetBucket)
          .getPublicUrl(fileName);

        generatedIcons[size] = {
          blob: iconData.blob,
          format: format,
          url: urlData.publicUrl,
        };
      } catch (error) {
        console.error(`Failed to generate icon ${size}:`, error);
        throw error;
      }
    }

    return generatedIcons;
  }

  private async generateScreenshots(
    platform: string,
    metadata: AppStoreMetadata,
    config: AssetGenerationConfig,
  ): Promise<{ blob: Blob; format: string; url: string; size: string }[]> {
    const screenshotSpecs = this.getRequiredScreenshotSizes(platform);
    const screenshots: {
      blob: Blob;
      format: string;
      url: string;
      size: string;
    }[] = [];

    for (const spec of screenshotSpecs) {
      const { size, format } = spec;
      const [width, height] = size.split('x').map(Number);

      try {
        // Generate screenshot showing wedding-specific functionality
        const screenshotData = await this.generateWeddingScreenshot(
          width,
          height,
          format,
          metadata,
          config,
        );

        const fileName = `${platform}/screenshots/screenshot_${size}_${Date.now()}.${format}`;

        // Upload to Supabase storage
        const { data: uploadData, error } = await this.supabase.storage
          .from(this.assetBucket)
          .upload(fileName, screenshotData.blob, {
            contentType: `image/${format}`,
            cacheControl: '3600',
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = this.supabase.storage
          .from(this.assetBucket)
          .getPublicUrl(fileName);

        screenshots.push({
          blob: screenshotData.blob,
          format: format,
          url: urlData.publicUrl,
          size: size,
        });
      } catch (error) {
        console.error(`Failed to generate screenshot ${size}:`, error);
        throw error;
      }
    }

    return screenshots;
  }

  private async generateManifest(
    platform: string,
    metadata: AppStoreMetadata,
    icons: { [size: string]: { blob: Blob; format: string; url: string } },
    config: AssetGenerationConfig,
  ): Promise<PackageManifest> {
    const manifest: PackageManifest = {
      name: metadata.title,
      version: metadata.version,
      platform: platform,
      files: {
        manifest: 'manifest.json',
        icons: Object.fromEntries(
          Object.entries(icons).map(([size, data]) => [size, data.url]),
        ),
        screenshots: [],
        packageFile: undefined,
      },
      metadata: metadata,
      signatures: {
        manifest: await this.generateSignature(JSON.stringify(metadata)),
        package: undefined,
      },
    };

    // Platform-specific manifest adjustments
    switch (platform) {
      case 'microsoft':
        await this.enhanceManifestForMicrosoft(manifest, metadata, config);
        break;
      case 'google':
        await this.enhanceManifestForGoogle(manifest, metadata, config);
        break;
      case 'apple':
        await this.enhanceManifestForApple(manifest, metadata, config);
        break;
    }

    return manifest;
  }

  private async generatePackage(
    platform: string,
    manifest: PackageManifest,
    icons: { [size: string]: { blob: Blob; format: string; url: string } },
    screenshots: { blob: Blob; format: string; url: string; size: string }[],
  ): Promise<{ blob: Blob; filename: string } | null> {
    switch (platform) {
      case 'microsoft':
        return await this.generateMicrosoftPackage(
          manifest,
          icons,
          screenshots,
        );
      case 'google':
        return await this.generateGoogleBundle(manifest, icons, screenshots);
      case 'apple':
        return null; // Apple doesn't require a package for API submission
      default:
        return null;
    }
  }

  private async generateIcon(
    width: number,
    height: number,
    format: string,
    config: AssetGenerationConfig,
  ): Promise<{ blob: Blob }> {
    // Create a canvas for icon generation
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, config.brandingOptions.primaryColor);
    gradient.addColorStop(1, config.brandingOptions.secondaryColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add WedSync logo/text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(width * 0.2)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('W', width / 2, height / 2);

    // Add wedding ring icon (simple representation)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.floor(width * 0.05);
    const ringRadius = Math.floor(width * 0.15);
    ctx.beginPath();
    ctx.arc(width * 0.3, height * 0.7, ringRadius, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width * 0.7, height * 0.7, ringRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Add test watermark if in test mode
    if (config.testMode && config.brandingOptions.watermarkText) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = `${Math.floor(width * 0.1)}px Arial`;
      ctx.fillText(
        config.brandingOptions.watermarkText,
        width / 2,
        height * 0.9,
      );
    }

    const blob = await canvas.convertToBlob({
      type: `image/${format}`,
      quality: 0.95,
    });
    return { blob };
  }

  private async generateWeddingScreenshot(
    width: number,
    height: number,
    format: string,
    metadata: AppStoreMetadata,
    config: AssetGenerationConfig,
  ): Promise<{ blob: Blob }> {
    // Create a canvas for screenshot generation
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Background
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, width, height);

    // Header
    const headerHeight = height * 0.1;
    ctx.fillStyle = config.brandingOptions.primaryColor;
    ctx.fillRect(0, 0, width, headerHeight);

    // Header text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(headerHeight * 0.4)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(metadata.title, width / 2, headerHeight / 2);

    // Mock wedding dashboard content
    await this.drawWeddingDashboard(ctx, width, height, headerHeight, config);

    // Add test watermark if needed
    if (config.testMode && config.brandingOptions.watermarkText) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.font = `${Math.floor(width * 0.05)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(
        config.brandingOptions.watermarkText,
        width / 2,
        height - 50,
      );
    }

    const blob = await canvas.convertToBlob({
      type: `image/${format}`,
      quality: 0.9,
    });
    return { blob };
  }

  private async drawWeddingDashboard(
    ctx: OffscreenCanvasRenderingContext2D,
    width: number,
    height: number,
    headerHeight: number,
    config: AssetGenerationConfig,
  ): Promise<void> {
    const contentY = headerHeight + 20;
    const contentWidth = width - 40;
    const cardHeight = (height - contentY - 40) / 3;

    // Wedding timeline card
    this.drawCard(
      ctx,
      20,
      contentY,
      contentWidth,
      cardHeight,
      'Wedding Timeline',
      config.brandingOptions.primaryColor,
    );

    // Budget tracking card
    this.drawCard(
      ctx,
      20,
      contentY + cardHeight + 10,
      contentWidth,
      cardHeight,
      'Budget Tracking',
      config.brandingOptions.secondaryColor,
    );

    // Vendor management card
    this.drawCard(
      ctx,
      20,
      contentY + 2 * (cardHeight + 10),
      contentWidth,
      cardHeight,
      'Vendor Management',
      config.brandingOptions.primaryColor,
    );
  }

  private drawCard(
    ctx: OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    color: string,
  ): void {
    // Card background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, width, height);

    // Card border
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Card header
    const headerHeight = height * 0.3;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, headerHeight);

    // Card title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(headerHeight * 0.4)}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x + 15, y + headerHeight / 2);

    // Mock content
    ctx.fillStyle = '#6B7280';
    ctx.font = `${Math.floor(headerHeight * 0.25)}px Arial`;
    ctx.fillText(
      '• Wedding Date: June 15, 2024',
      x + 15,
      y + headerHeight + 30,
    );
    ctx.fillText('• Venue: Confirmed', x + 15, y + headerHeight + 55);
    ctx.fillText('• Photographer: Booked', x + 15, y + headerHeight + 80);
  }

  private async enhanceManifestForMicrosoft(
    manifest: PackageManifest,
    metadata: AppStoreMetadata,
    config: AssetGenerationConfig,
  ): Promise<void> {
    // Microsoft Store specific manifest enhancements
    manifest.files.packageFile = 'wedsync.appx';

    // Add Microsoft-specific metadata
    (manifest as any).msAppxManifest = {
      name: metadata.title,
      displayName: metadata.title,
      description: metadata.fullDescription,
      version: metadata.version,
      minVersion: '10.0.17763.0',
      targetDeviceFamily: 'Windows.Universal',
      capabilities: ['internetClient'],
      startPage: config.testMode
        ? 'https://test.wedsync.com'
        : 'https://wedsync.com',
    };
  }

  private async enhanceManifestForGoogle(
    manifest: PackageManifest,
    metadata: AppStoreMetadata,
    config: AssetGenerationConfig,
  ): Promise<void> {
    // Google Play specific manifest enhancements
    manifest.files.packageFile = 'wedsync.aab';

    // Add Android-specific metadata
    (manifest as any).androidManifest = {
      package: 'com.wedsync.app',
      versionCode: parseInt(metadata.version.replace(/\./g, '')),
      versionName: metadata.version,
      minSdkVersion: 21,
      targetSdkVersion: 34,
      permissions: ['INTERNET', 'WRITE_EXTERNAL_STORAGE'],
      activities: [
        {
          name: 'MainActivity',
          exported: true,
          launchMode: 'singleTop',
        },
      ],
    };
  }

  private async enhanceManifestForApple(
    manifest: PackageManifest,
    metadata: AppStoreMetadata,
    config: AssetGenerationConfig,
  ): Promise<void> {
    // Apple App Store specific manifest enhancements
    (manifest as any).infoPlist = {
      CFBundleDisplayName: metadata.title,
      CFBundleIdentifier: 'com.wedsync.app',
      CFBundleVersion: metadata.version,
      CFBundleShortVersionString: metadata.version,
      LSMinimumSystemVersion: '14.0',
      UIRequiredDeviceCapabilities: ['arm64'],
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        NSExceptionDomains: {
          'wedsync.com': {
            NSExceptionAllowsInsecureHTTPLoads: false,
            NSExceptionMinimumTLSVersion: '1.2',
          },
        },
      },
    };
  }

  private async generateMicrosoftPackage(
    manifest: PackageManifest,
    icons: { [size: string]: { blob: Blob; format: string; url: string } },
    screenshots: { blob: Blob; format: string; url: string; size: string }[],
  ): Promise<{ blob: Blob; filename: string }> {
    // Create APPX package (simplified implementation)
    // In a real implementation, this would use proper APPX packaging

    const packageData = {
      manifest: manifest,
      icons: icons,
      screenshots: screenshots,
      type: 'microsoft-appx',
    };

    const blob = new Blob([JSON.stringify(packageData)], {
      type: 'application/json',
    });
    return { blob, filename: 'wedsync.appx' };
  }

  private async generateGoogleBundle(
    manifest: PackageManifest,
    icons: { [size: string]: { blob: Blob; format: string; url: string } },
    screenshots: { blob: Blob; format: string; url: string; size: string }[],
  ): Promise<{ blob: Blob; filename: string }> {
    // Create Android App Bundle (simplified implementation)
    // In a real implementation, this would use proper AAB packaging

    const bundleData = {
      manifest: manifest,
      icons: icons,
      screenshots: screenshots,
      type: 'android-aab',
    };

    const blob = new Blob([JSON.stringify(bundleData)], {
      type: 'application/json',
    });
    return { blob, filename: 'wedsync.aab' };
  }

  private getRequiredIconSizes(
    platform: string,
  ): { size: string; format: string }[] {
    const sizes = {
      microsoft: [
        { size: '44x44', format: 'png' },
        { size: '150x150', format: 'png' },
        { size: '310x150', format: 'png' },
        { size: '310x310', format: 'png' },
      ],
      google: [
        { size: '512x512', format: 'png' },
        { size: '192x192', format: 'png' },
        { size: '144x144', format: 'png' },
        { size: '96x96', format: 'png' },
      ],
      apple: [
        { size: '1024x1024', format: 'png' },
        { size: '512x512', format: 'png' },
        { size: '256x256', format: 'png' },
        { size: '128x128', format: 'png' },
      ],
    };

    return sizes[platform as keyof typeof sizes] || [];
  }

  private getRequiredScreenshotSizes(
    platform: string,
  ): { size: string; format: string }[] {
    const sizes = {
      microsoft: [
        { size: '1366x768', format: 'png' },
        { size: '1920x1080', format: 'png' },
      ],
      google: [
        { size: '1080x1920', format: 'png' },
        { size: '1920x1080', format: 'png' },
      ],
      apple: [
        { size: '1284x2778', format: 'png' },
        { size: '2048x2732', format: 'png' },
      ],
    };

    return sizes[platform as keyof typeof sizes] || [];
  }

  private async getWedSyncLogo(): Promise<string> {
    // Return base64 encoded WedSync logo or URL
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }

  private async generateSignature(data: string): Promise<string> {
    // Generate SHA-256 hash for data integrity
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private async storeAssetReferences(
    platform: string,
    metadata: AppStoreMetadata,
    icons: { [size: string]: { blob: Blob; format: string; url: string } },
    screenshots: { blob: Blob; format: string; url: string; size: string }[],
    manifest: PackageManifest,
  ): Promise<void> {
    const assetReferences = {
      platform,
      metadata: metadata,
      icons: Object.fromEntries(
        Object.entries(icons).map(([size, data]) => [size, data.url]),
      ),
      screenshots: screenshots.map((s) => ({ url: s.url, size: s.size })),
      manifest_url: `${this.cdnBaseUrl}/storage/v1/object/public/${this.assetBucket}/${platform}/manifest.json`,
      generated_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('app_store_asset_references')
      .insert(assetReferences);

    if (error) {
      console.error('Failed to store asset references:', error);
      throw error;
    }
  }

  async getAssetHistory(platform: string, limit: number = 50): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('app_store_asset_references')
      .select('*')
      .eq('platform', platform)
      .order('generated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get asset history:', error);
      throw error;
    }

    return data || [];
  }

  async cleanupOldAssets(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Get old asset references
    const { data: oldAssets, error } = await this.supabase
      .from('app_store_asset_references')
      .select('*')
      .lt('generated_at', cutoffDate.toISOString());

    if (error || !oldAssets) {
      console.error('Failed to get old assets:', error);
      return;
    }

    // Delete files from storage
    for (const asset of oldAssets) {
      try {
        // Delete icons
        for (const iconUrl of Object.values(asset.icons)) {
          const filePath = (iconUrl as string).split(
            '/storage/v1/object/public/' + this.assetBucket + '/',
          )[1];
          if (filePath) {
            await this.supabase.storage
              .from(this.assetBucket)
              .remove([filePath]);
          }
        }

        // Delete screenshots
        for (const screenshot of asset.screenshots) {
          const filePath = screenshot.url.split(
            '/storage/v1/object/public/' + this.assetBucket + '/',
          )[1];
          if (filePath) {
            await this.supabase.storage
              .from(this.assetBucket)
              .remove([filePath]);
          }
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup asset files:', cleanupError);
      }
    }

    // Delete asset references
    await this.supabase
      .from('app_store_asset_references')
      .delete()
      .lt('generated_at', cutoffDate.toISOString());
  }
}
