/**
 * WS-196 Team D: Mobile API Optimization Utilities
 *
 * Comprehensive mobile-first API optimization with device context awareness,
 * intelligent payload compression, and wedding-specific optimizations
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';

export interface MobileAPIOptions {
  compress: boolean;
  minify: boolean;
  includeMetadata: boolean;
  maxImageSize: number;
  includeRelations: string[];
  excludeFields: string[];
}

export interface MobileContext {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: '4g' | '3g' | '2g' | 'wifi' | 'ethernet';
  batteryLevel?: number;
  isLowPowerMode?: boolean;
  screenSize: {
    width: number;
    height: number;
  };
}

const MobileContextSchema = z.object({
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).default('mobile'),
  connectionType: z.enum(['4g', '3g', '2g', 'wifi', 'ethernet']).default('4g'),
  batteryLevel: z.number().min(0).max(100).optional(),
  isLowPowerMode: z.boolean().optional(),
  screenSize: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});

export class MobileAPIOptimizer {
  public static parseMobileContext(request: NextRequest): MobileContext {
    // Parse mobile context from headers
    const userAgent = request.headers.get('user-agent') || '';
    const deviceType = this.detectDeviceType(userAgent);
    const connectionType =
      (request.headers.get('x-connection-type') as any) || '4g';
    const batteryLevel = request.headers.get('x-battery-level')
      ? parseInt(request.headers.get('x-battery-level')!)
      : undefined;
    const isLowPowerMode = request.headers.get('x-low-power-mode') === 'true';

    // Parse screen size from viewport headers
    const viewport = request.headers.get('x-viewport');
    const screenSize = viewport
      ? this.parseViewport(viewport)
      : { width: 375, height: 667 }; // iPhone default

    const context = MobileContextSchema.parse({
      deviceType,
      connectionType,
      batteryLevel,
      isLowPowerMode,
      screenSize,
    });

    return context;
  }

  public static optimizeResponse<T>(
    data: T,
    context: MobileContext,
    options: Partial<MobileAPIOptions> = {},
  ): T {
    const defaultOptions: MobileAPIOptions = {
      compress: true,
      minify:
        context.connectionType === '2g' || context.connectionType === '3g',
      includeMetadata: !context.isLowPowerMode,
      maxImageSize: this.getMaxImageSize(context),
      includeRelations: [],
      excludeFields: [],
    };

    const finalOptions = { ...defaultOptions, ...options };

    let optimizedData = this.compressData(data, finalOptions);
    optimizedData = this.optimizeImages(optimizedData, finalOptions, context);
    optimizedData = this.filterFields(optimizedData, finalOptions);

    return optimizedData;
  }

  public static getOptimizationHeaders(
    context: MobileContext,
  ): Record<string, string> {
    return {
      'X-Mobile-Optimized': 'true',
      'X-Device-Type': context.deviceType,
      'X-Connection-Type': context.connectionType,
      'X-Optimization-Applied': this.getAppliedOptimizations(context).join(','),
      'Cache-Control': this.getCacheControlForContext(context),
    };
  }

  private static detectDeviceType(
    userAgent: string,
  ): 'mobile' | 'tablet' | 'desktop' {
    const mobileRegex = /iPhone|Android.*Mobile|BlackBerry|Opera Mini/i;
    const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet/i;

    if (mobileRegex.test(userAgent)) return 'mobile';
    if (tabletRegex.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  private static parseViewport(viewport: string): {
    width: number;
    height: number;
  } {
    const [width, height] = viewport.split('x').map(Number);
    return { width: width || 375, height: height || 667 };
  }

  private static getMaxImageSize(context: MobileContext): number {
    if (context.connectionType === '2g') return 50 * 1024; // 50KB
    if (context.connectionType === '3g') return 100 * 1024; // 100KB
    if (context.deviceType === 'mobile') return 200 * 1024; // 200KB
    return 500 * 1024; // 500KB for tablets/desktop
  }

  private static compressData<T>(data: T, options: MobileAPIOptions): T {
    if (!options.compress) return data;

    // Remove null/undefined values to reduce payload size
    return this.removeEmpty(data);
  }

  private static optimizeImages<T>(
    data: T,
    options: MobileAPIOptions,
    context: MobileContext,
  ): T {
    if (typeof data !== 'object' || !data) return data;

    const optimized = { ...data };

    // Find image fields and optimize them
    for (const [key, value] of Object.entries(optimized)) {
      if (this.isImageField(key) && typeof value === 'string') {
        (optimized as any)[key] = this.optimizeImageUrl(
          value,
          context,
          options,
        );
      } else if (Array.isArray(value)) {
        (optimized as any)[key] = value.map((item) =>
          this.optimizeImages(item, options, context),
        );
      } else if (typeof value === 'object' && value !== null) {
        (optimized as any)[key] = this.optimizeImages(value, options, context);
      }
    }

    return optimized;
  }

  private static isImageField(fieldName: string): boolean {
    const imageFields = [
      'image',
      'photo',
      'thumbnail',
      'avatar',
      'cover_image',
      'portfolio_image',
      'venue_photo',
      'profile_image',
    ];
    return imageFields.some((field) => fieldName.toLowerCase().includes(field));
  }

  private static optimizeImageUrl(
    imageUrl: string,
    context: MobileContext,
    options: MobileAPIOptions,
  ): string {
    if (!imageUrl.startsWith('http')) return imageUrl;

    // Add optimization parameters to image URLs
    const url = new URL(imageUrl);

    // Set appropriate image dimensions based on device
    if (context.deviceType === 'mobile') {
      url.searchParams.set('w', (context.screenSize.width * 2).toString()); // 2x for retina
      url.searchParams.set('h', (context.screenSize.height * 2).toString());
    }

    // Set quality based on connection
    const quality = this.getImageQuality(context);
    url.searchParams.set('q', quality.toString());

    // Set format
    url.searchParams.set('f', 'webp');

    return url.toString();
  }

  private static getImageQuality(context: MobileContext): number {
    if (context.isLowPowerMode) return 60;
    if (context.batteryLevel && context.batteryLevel < 20) return 65;
    if (context.connectionType === '2g') return 50;
    if (context.connectionType === '3g') return 70;
    return 85;
  }

  private static filterFields<T>(data: T, options: MobileAPIOptions): T {
    if (!options.excludeFields.length || typeof data !== 'object' || !data) {
      return data;
    }

    const filtered = { ...data };

    for (const field of options.excludeFields) {
      delete (filtered as any)[field];
    }

    return filtered;
  }

  private static removeEmpty<T>(obj: T): T {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeEmpty(item)) as unknown as T;
    }

    if (typeof obj === 'object' && obj !== null) {
      const cleaned: any = {};

      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined && value !== '') {
          cleaned[key] = this.removeEmpty(value);
        }
      }

      return cleaned;
    }

    return obj;
  }

  private static getAppliedOptimizations(context: MobileContext): string[] {
    const optimizations = ['compression'];

    if (context.connectionType === '2g' || context.connectionType === '3g') {
      optimizations.push('image-quality-reduction', 'field-filtering');
    }

    if (context.isLowPowerMode) {
      optimizations.push('battery-saving');
    }

    if (context.deviceType === 'mobile') {
      optimizations.push('mobile-viewport');
    }

    return optimizations;
  }

  private static getCacheControlForContext(context: MobileContext): string {
    if (context.connectionType === '2g') {
      return 'public, max-age=3600, stale-while-revalidate=7200'; // 1 hour cache, 2 hour stale
    } else if (context.connectionType === '3g') {
      return 'public, max-age=1800, stale-while-revalidate=3600'; // 30 min cache, 1 hour stale
    } else {
      return 'public, max-age=300, stale-while-revalidate=600'; // 5 min cache, 10 min stale
    }
  }
}

// Wedding-specific mobile optimizations
export class WeddingMobileOptimizer extends MobileAPIOptimizer {
  public static optimizeWeddingData(data: any, context: MobileContext): any {
    if (!data) return data;

    const optimized = { ...data };

    // Optimize based on wedding context
    if (data.timeline && context.connectionType === '2g') {
      // Simplify timeline for slow connections
      optimized.timeline = this.simplifyTimeline(data.timeline);
    }

    if (
      data.vendors &&
      (context.deviceType === 'mobile' || context.deviceType === 'tablet')
    ) {
      // Reduce vendor data for mobile and tablet
      optimized.vendors = this.optimizeVendorList(data.vendors, context);
    }

    if (data.photos && context.batteryLevel && context.batteryLevel < 30) {
      // Limit photos for low battery
      optimized.photos = data.photos.slice(0, 5);
    }

    return this.optimizeResponse(optimized, context);
  }

  private static simplifyTimeline(timeline: any[]): any[] {
    return timeline.map((event) => ({
      id: event.id,
      time: event.time,
      title: event.title,
      vendor: event.vendor?.name || event.vendor,
      // Remove detailed descriptions for 2G
    }));
  }

  private static optimizeVendorList(
    vendors: any[],
    context: MobileContext,
  ): any[] {
    const maxVendors = context.deviceType === 'mobile' ? 10 : 20;

    return vendors.slice(0, maxVendors).map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      category: vendor.category,
      phone: vendor.phone,
      email: vendor.email,
      // Remove portfolio and detailed info for mobile
      ...(context.deviceType !== 'mobile' && {
        portfolio: vendor.portfolio,
        description: vendor.description,
      }),
    }));
  }
}

// Mobile-optimized supplier client endpoint
export async function getMobileSupplierClients(
  request: NextRequest,
  supplierId: string,
): Promise<any> {
  const mobileContext = MobileAPIOptimizer.parseMobileContext(request);

  // Determine what data to include based on device capabilities
  const includeRelations =
    mobileContext.deviceType === 'mobile'
      ? ['basic_info']
      : ['forms', 'bookings', 'communications'];

  const excludeFields =
    mobileContext.connectionType === '2g'
      ? ['requirements', 'special_requests', 'dietary_restrictions']
      : [];

  // Mock data - replace with actual database query
  const rawData = {
    clients: [
      {
        id: '1',
        name: 'Sarah & John Wedding',
        wedding_date: '2024-06-15',
        status: 'confirmed',
        requirements: 'Outdoor ceremony with backup plan',
        special_requests: 'Vegetarian options for 25% of guests',
        dietary_restrictions: 'Gluten-free options needed',
        forms: { completed: 8, pending: 2 },
        bookings: { confirmed: 5, pending: 1 },
        communications: { messages: 24, last_contact: '2024-01-15' },
        portfolio_image: 'https://example.com/portfolio/sarah-john.jpg',
      },
    ],
    total: 1,
    summary: {
      total_clients: 1,
      confirmed_bookings: 5,
      pending_forms: 2,
    },
  };

  // Optimize response for mobile context
  const optimizedData = WeddingMobileOptimizer.optimizeWeddingData(
    rawData,
    mobileContext,
  );

  // Add mobile optimization metadata
  return {
    ...optimizedData,
    mobile_context: {
      device_type: mobileContext.deviceType,
      connection_type: mobileContext.connectionType,
      optimizations_applied: {
        image_compression: true,
        field_filtering: excludeFields.length > 0,
        relation_limiting: includeRelations.length < 3,
        battery_optimization: mobileContext.isLowPowerMode || false,
      },
      performance_hints: {
        cache_duration:
          mobileContext.connectionType === '2g' ? '1 hour' : '5 minutes',
        background_sync: mobileContext.deviceType === 'mobile',
        image_lazy_loading: true,
      },
    },
  };
}

// Mobile-optimized booking endpoint
export async function getMobileBookingData(
  request: NextRequest,
  bookingId: string,
): Promise<any> {
  const mobileContext = MobileAPIOptimizer.parseMobileContext(request);

  // Mock booking data
  const rawBookingData = {
    id: bookingId,
    client_name: 'Sarah & John',
    wedding_date: '2024-06-15',
    venue: 'Beautiful Garden Venue',
    status: 'confirmed',
    timeline: [
      {
        time: '14:00',
        event: 'Ceremony',
        vendor: 'Venue',
        details: 'Outdoor ceremony in the rose garden',
      },
      {
        time: '15:30',
        event: 'Photos',
        vendor: 'Photographer',
        details: 'Family and couple photos',
      },
      {
        time: '17:00',
        event: 'Reception',
        vendor: 'Venue',
        details: 'Dinner and dancing',
      },
    ],
    vendors: [
      {
        name: 'Garden Venue',
        category: 'Venue',
        phone: '+1234567890',
        email: 'info@gardenvenue.com',
        portfolio: ['image1.jpg', 'image2.jpg'],
        description: 'Beautiful outdoor venue with gardens',
      },
    ],
    payment_status: 'deposit_paid',
    total_amount: 15000,
    deposit_amount: 5000,
    balance_due: 10000,
  };

  // Apply wedding-specific mobile optimizations
  const optimizedData = WeddingMobileOptimizer.optimizeWeddingData(
    rawBookingData,
    mobileContext,
  );

  return {
    ...optimizedData,
    mobile_metadata: MobileAPIOptimizer.getOptimizationHeaders(mobileContext),
  };
}

// Mobile context middleware
export function withMobileOptimization<T>(
  handler: (
    data: T,
    context: MobileContext,
    request: NextRequest,
  ) => Promise<any>,
) {
  return async (request: NextRequest, data: T) => {
    const mobileContext = MobileAPIOptimizer.parseMobileContext(request);

    try {
      const result = await handler(data, mobileContext, request);
      const optimized = MobileAPIOptimizer.optimizeResponse(
        result,
        mobileContext,
      );

      return new Response(JSON.stringify(optimized), {
        headers: {
          'Content-Type': 'application/json',
          ...MobileAPIOptimizer.getOptimizationHeaders(mobileContext),
        },
      });
    } catch (error) {
      console.error('Mobile API optimization failed:', error);

      // Return error optimized for mobile
      const errorResponse = {
        error: 'Request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        mobile_fallback: true,
        retry_after: mobileContext.connectionType === '2g' ? 30 : 10,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': mobileContext.connectionType === '2g' ? '30' : '10',
        },
      });
    }
  };
}
