/**
 * WS-146: PWA Icon Generator for App Store Requirements
 * Generates all required icon sizes for PWA and app stores
 */

export interface IconSize {
  size: number;
  name: string;
  purpose?: 'any' | 'maskable' | 'maskable any';
  platform?: 'ios' | 'android' | 'windows' | 'all';
}

export const REQUIRED_ICON_SIZES: IconSize[] = [
  // Standard PWA sizes
  {
    size: 72,
    name: 'icon-72x72.png',
    purpose: 'maskable any',
    platform: 'all',
  },
  {
    size: 96,
    name: 'icon-96x96.png',
    purpose: 'maskable any',
    platform: 'all',
  },
  {
    size: 128,
    name: 'icon-128x128.png',
    purpose: 'maskable any',
    platform: 'all',
  },
  {
    size: 144,
    name: 'icon-144x144.png',
    purpose: 'maskable any',
    platform: 'all',
  },
  {
    size: 152,
    name: 'icon-152x152.png',
    purpose: 'maskable any',
    platform: 'all',
  },
  {
    size: 192,
    name: 'icon-192x192.png',
    purpose: 'maskable any',
    platform: 'all',
  },
  {
    size: 384,
    name: 'icon-384x384.png',
    purpose: 'maskable any',
    platform: 'all',
  },
  {
    size: 512,
    name: 'icon-512x512.png',
    purpose: 'maskable any',
    platform: 'all',
  },

  // App Store requirement
  { size: 1024, name: 'icon-1024x1024.png', purpose: 'any', platform: 'ios' },

  // iOS specific sizes
  { size: 180, name: 'icon-180x180.png', purpose: 'any', platform: 'ios' },
  { size: 167, name: 'icon-167x167.png', purpose: 'any', platform: 'ios' },
  { size: 120, name: 'icon-120x120.png', purpose: 'any', platform: 'ios' },

  // Android specific adaptive icons
  { size: 432, name: 'icon-432x432.png', purpose: 'any', platform: 'android' },

  // Windows tile sizes
  { size: 70, name: 'icon-70x70.png', purpose: 'any', platform: 'windows' },
  { size: 150, name: 'icon-150x150.png', purpose: 'any', platform: 'windows' },
  { size: 310, name: 'icon-310x310.png', purpose: 'any', platform: 'windows' },
];

export class IconGenerator {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }
  }

  /**
   * Generate icon with WedSync branding
   */
  async generateIcon(size: number, maskable: boolean = false): Promise<Blob> {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not available');
    }

    this.canvas.width = size;
    this.canvas.height = size;
    const ctx = this.ctx;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Background
    if (maskable) {
      // Add safe zone padding for maskable icons
      const padding = size * 0.1;
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#6366F1');
      gradient.addColorStop(1, '#4F46E5');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Draw icon within safe zone
      this.drawWedSyncLogo(
        ctx,
        padding,
        padding,
        size - padding * 2,
        size - padding * 2,
      );
    } else {
      // No padding for regular icons
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#6366F1');
      gradient.addColorStop(1, '#4F46E5');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      this.drawWedSyncLogo(ctx, 0, 0, size, size);
    }

    return new Promise((resolve) => {
      this.canvas!.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });
  }

  /**
   * Draw WedSync logo
   */
  private drawWedSyncLogo(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    ctx.save();

    // Draw "W" logo
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${width * 0.5}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('W', x + width / 2, y + height / 2);

    // Add subtle shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = width * 0.05;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = width * 0.02;

    ctx.restore();
  }

  /**
   * Generate all required icon sizes
   */
  async generateAllIcons(): Promise<Map<string, Blob>> {
    const icons = new Map<string, Blob>();

    for (const iconConfig of REQUIRED_ICON_SIZES) {
      const isMaskable = iconConfig.purpose?.includes('maskable') || false;
      const blob = await this.generateIcon(iconConfig.size, isMaskable);
      icons.set(iconConfig.name, blob);
    }

    return icons;
  }

  /**
   * Validate that all required icons exist
   */
  static async validateIcons(): Promise<{ valid: boolean; missing: string[] }> {
    const missing: string[] = [];

    for (const iconConfig of REQUIRED_ICON_SIZES) {
      const path = `/app-store-assets/icons/${iconConfig.name}`;
      try {
        const response = await fetch(path, { method: 'HEAD' });
        if (!response.ok) {
          missing.push(iconConfig.name);
        }
      } catch {
        missing.push(iconConfig.name);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

/**
 * App store metadata for icon requirements
 */
export const APP_STORE_ICON_REQUIREMENTS = {
  appleAppStore: {
    required: [1024],
    recommended: [180, 167, 152, 144, 120, 76, 60, 40, 29, 20],
    notes: 'App Store requires 1024x1024 PNG without alpha channel',
  },
  googlePlay: {
    required: [512],
    recommended: [192, 144, 96, 72, 48, 36],
    adaptiveIcon: [432], // 108dp * 4 for xxxhdpi
    notes: 'Google Play requires 512x512 PNG, adaptive icons recommended',
  },
  microsoftStore: {
    required: [300],
    recommended: [310, 150, 70, 44, 30],
    tiles: [310, 150, 70],
    notes: 'Microsoft Store requires square PNG logos',
  },
};
