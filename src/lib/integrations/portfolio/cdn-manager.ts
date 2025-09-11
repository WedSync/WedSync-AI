import { BaseIntegrationService } from '../BaseIntegrationService';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  IntegrationError,
  ErrorCategory,
} from '@/types/integrations';

interface CDNProvider {
  id: 'cloudflare' | 'aws-cloudfront' | 'fastly';
  name: string;
  baseUrl: string;
  regions: string[];
  status: 'active' | 'fallback' | 'disabled';
}

interface ImageTransformation {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  crop?: 'fill' | 'fit' | 'scale';
  watermark?: {
    text?: string;
    image?: string;
    position:
      | 'top-left'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-right'
      | 'center';
    opacity: number;
  };
}

interface CacheStrategy {
  ttl: number;
  staleWhileRevalidate?: number;
  purgeOnUpdate: boolean;
  varyOnUserAgent: boolean;
  varyOnAcceptHeader: boolean;
}

export class CDNManager extends BaseIntegrationService {
  protected serviceName = 'CDN Manager';
  private providers: Map<string, CDNProvider> = new Map();
  private primaryProvider: string = 'cloudflare';
  private fallbackProviders: string[] = ['aws-cloudfront', 'fastly'];
  private imageFormats: string[] = ['webp', 'avif', 'jpeg', 'png'];

  constructor(config: IntegrationConfig, credentials: IntegrationCredentials) {
    super(config, credentials);
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const providers: CDNProvider[] = [
      {
        id: 'cloudflare',
        name: 'Cloudflare',
        baseUrl: 'https://cdn.wedsync.com',
        regions: ['global'],
        status: 'active',
      },
      {
        id: 'aws-cloudfront',
        name: 'AWS CloudFront',
        baseUrl: 'https://d123456789.cloudfront.net',
        regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
        status: 'fallback',
      },
      {
        id: 'fastly',
        name: 'Fastly',
        baseUrl: 'https://wedsync.fastly.com',
        regions: ['global'],
        status: 'fallback',
      },
    ];

    providers.forEach((provider) => {
      this.providers.set(provider.id, provider);
    });
  }

  async validateConnection(): Promise<boolean> {
    try {
      const primaryProvider = this.providers.get(this.primaryProvider);
      if (!primaryProvider) return false;

      const response = await fetch(`${primaryProvider.baseUrl}/health`, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'WedSync-CDN-Health-Check',
        },
      });

      return response.ok;
    } catch (error) {
      console.warn('Primary CDN provider health check failed:', error);
      return this.checkFallbackProviders();
    }
  }

  private async checkFallbackProviders(): Promise<boolean> {
    for (const providerId of this.fallbackProviders) {
      const provider = this.providers.get(providerId);
      if (!provider) continue;

      try {
        const response = await fetch(`${provider.baseUrl}/health`, {
          method: 'HEAD',
          timeout: 5000,
        } as RequestInit);

        if (response.ok) {
          console.log(`Fallback provider ${providerId} is healthy`);
          return true;
        }
      } catch (error) {
        console.warn(`Fallback provider ${providerId} failed:`, error);
      }
    }

    return false;
  }

  async refreshToken(): Promise<string> {
    // CDN services typically use API keys
    return this.credentials.apiKey;
  }

  protected async makeRequest(
    endpoint: string,
    options?: any,
  ): Promise<IntegrationResponse> {
    const provider = this.providers.get(this.primaryProvider);
    if (!provider) {
      throw new IntegrationError(
        'Primary CDN provider not configured',
        'PROVIDER_NOT_CONFIGURED',
        ErrorCategory.CONFIGURATION,
      );
    }

    const url = `${provider.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: options?.method || 'GET',
        headers: {
          Authorization: `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        throw new IntegrationError(
          `CDN request failed with status ${response.status}`,
          'CDN_REQUEST_FAILED',
          ErrorCategory.EXTERNAL_API,
        );
      }

      const data = response.status !== 204 ? await response.json() : null;
      return {
        success: true,
        data,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new IntegrationError(
        'CDN request execution failed',
        'CDN_EXECUTION_FAILED',
        ErrorCategory.EXTERNAL_API,
        error as Error,
      );
    }
  }

  async uploadToGlobalCDN(
    file: Buffer | Blob,
    key: string,
    metadata?: Record<string, string>,
  ): Promise<{
    url: string;
    cdnUrls: Map<string, string>;
    uploadTime: number;
  }> {
    const startTime = Date.now();
    const cdnUrls = new Map<string, string>();

    try {
      // Upload to primary provider
      const primaryUrl = await this.uploadToProvider(
        this.primaryProvider,
        file,
        key,
        metadata,
      );
      cdnUrls.set(this.primaryProvider, primaryUrl);

      // Replicate to fallback providers asynchronously
      this.replicateToFallbacks(file, key, metadata, cdnUrls);

      const uploadTime = Date.now() - startTime;

      return {
        url: primaryUrl,
        cdnUrls,
        uploadTime,
      };
    } catch (error) {
      throw new IntegrationError(
        'Global CDN upload failed',
        'CDN_UPLOAD_FAILED',
        ErrorCategory.EXTERNAL_API,
        error as Error,
      );
    }
  }

  private async uploadToProvider(
    providerId: string,
    file: Buffer | Blob,
    key: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Implementation would vary by CDN provider
    const formData = new FormData();
    formData.append('file', file instanceof Buffer ? new Blob([file]) : file);
    formData.append('key', key);

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await fetch(`${provider.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.credentials.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload to ${providerId} failed: ${response.statusText}`);
    }

    const result = await response.json();
    return `${provider.baseUrl}/${key}`;
  }

  private async replicateToFallbacks(
    file: Buffer | Blob,
    key: string,
    metadata: Record<string, string> = {},
    cdnUrls: Map<string, string>,
  ): Promise<void> {
    const replicationPromises = this.fallbackProviders.map(
      async (providerId) => {
        try {
          const url = await this.uploadToProvider(
            providerId,
            file,
            key,
            metadata,
          );
          cdnUrls.set(providerId, url);
        } catch (error) {
          console.warn(`Replication to ${providerId} failed:`, error);
        }
      },
    );

    // Don't await - let replication happen in background
    Promise.all(replicationPromises);
  }

  async generateOptimizedUrl(
    originalKey: string,
    transformations: ImageTransformation,
    userLocation?: { country: string; region?: string },
  ): Promise<string> {
    const bestProvider = this.selectBestProvider(userLocation);
    const provider = this.providers.get(bestProvider);

    if (!provider) {
      throw new IntegrationError(
        'No suitable CDN provider available',
        'NO_PROVIDER_AVAILABLE',
        ErrorCategory.CONFIGURATION,
      );
    }

    const transformParams = this.buildTransformationParams(transformations);
    return `${provider.baseUrl}/transform/${originalKey}?${transformParams}`;
  }

  private selectBestProvider(userLocation?: {
    country: string;
    region?: string;
  }): string {
    if (!userLocation) return this.primaryProvider;

    // Geographic routing logic
    const providers = Array.from(this.providers.values()).filter(
      (p) => p.status === 'active',
    );

    // Simplified geographic routing - in production, use actual routing table
    if (userLocation.country === 'US') {
      const awsProvider = providers.find((p) => p.id === 'aws-cloudfront');
      if (awsProvider) return awsProvider.id;
    }

    if (['GB', 'DE', 'FR', 'IT', 'ES'].includes(userLocation.country)) {
      const fastlyProvider = providers.find((p) => p.id === 'fastly');
      if (fastlyProvider) return fastlyProvider.id;
    }

    return this.primaryProvider;
  }

  private buildTransformationParams(
    transformations: ImageTransformation,
  ): string {
    const params = new URLSearchParams();

    if (transformations.width)
      params.append('w', transformations.width.toString());
    if (transformations.height)
      params.append('h', transformations.height.toString());
    if (transformations.quality)
      params.append('q', transformations.quality.toString());
    if (transformations.format) params.append('f', transformations.format);
    if (transformations.crop) params.append('c', transformations.crop);

    if (transformations.watermark) {
      const { watermark } = transformations;
      if (watermark.text) params.append('wm_text', watermark.text);
      if (watermark.image) params.append('wm_image', watermark.image);
      params.append('wm_pos', watermark.position);
      params.append('wm_opacity', watermark.opacity.toString());
    }

    return params.toString();
  }

  async generateResponsiveImageSet(
    originalKey: string,
    breakpoints: number[] = [320, 640, 768, 1024, 1280, 1920],
    formats: Array<'webp' | 'avif' | 'jpeg'> = ['webp', 'avif', 'jpeg'],
  ): Promise<{
    srcSet: string;
    sources: Array<{ media: string; srcSet: string; type: string }>;
  }> {
    const sources: Array<{ media: string; srcSet: string; type: string }> = [];
    let srcSet = '';

    for (const format of formats) {
      const formatSrcSet = await Promise.all(
        breakpoints.map(async (width) => {
          const url = await this.generateOptimizedUrl(originalKey, {
            width,
            format,
            quality: format === 'jpeg' ? 85 : 80,
          });
          return `${url} ${width}w`;
        }),
      );

      const srcSetString = formatSrcSet.join(', ');

      if (format === 'jpeg') {
        srcSet = srcSetString; // Fallback for older browsers
      }

      sources.push({
        media: `(max-width: ${Math.max(...breakpoints)}px)`,
        srcSet: srcSetString,
        type: `image/${format}`,
      });
    }

    return { srcSet, sources };
  }

  async purgeCache(keys: string[] | string): Promise<void> {
    const keysArray = Array.isArray(keys) ? keys : [keys];

    const purgePromises = Array.from(this.providers.values())
      .filter((provider) => provider.status !== 'disabled')
      .map(async (provider) => {
        try {
          await this.makeRequest('/purge', {
            method: 'POST',
            body: { keys: keysArray },
          });
        } catch (error) {
          console.warn(`Cache purge failed for ${provider.id}:`, error);
        }
      });

    await Promise.allSettled(purgePromises);
  }

  async setCacheStrategy(key: string, strategy: CacheStrategy): Promise<void> {
    const cacheHeaders = {
      'Cache-Control': `max-age=${strategy.ttl}`,
      'CDN-Cache-Control': `max-age=${strategy.ttl}`,
    };

    if (strategy.staleWhileRevalidate) {
      cacheHeaders['Cache-Control'] +=
        `, stale-while-revalidate=${strategy.staleWhileRevalidate}`;
    }

    if (strategy.varyOnUserAgent) {
      cacheHeaders['Vary'] = 'User-Agent';
    }

    if (strategy.varyOnAcceptHeader) {
      cacheHeaders['Vary'] = cacheHeaders['Vary']
        ? `${cacheHeaders['Vary']}, Accept`
        : 'Accept';
    }

    await this.makeRequest(`/cache-strategy/${key}`, {
      method: 'PUT',
      body: { headers: cacheHeaders, strategy },
    });
  }

  async getPerformanceMetrics(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<{
    bandwidth: number;
    requests: number;
    cacheHitRatio: number;
    avgResponseTime: number;
    errorRate: number;
    topCountries: Array<{ country: string; requests: number }>;
  }> {
    const response = await this.makeRequest(`/analytics?range=${timeRange}`);

    return response.data;
  }

  async optimizeImageDelivery(
    portfolioId: string,
    images: Array<{ key: string; metadata?: Record<string, string> }>,
  ): Promise<{
    optimizedUrls: Map<string, string>;
    estimatedSavings: { bandwidth: number; loadTime: number };
  }> {
    const optimizedUrls = new Map<string, string>();
    let totalBandwidthSaving = 0;
    let totalLoadTimeSaving = 0;

    for (const image of images) {
      try {
        // Generate multiple format variants
        const webpUrl = await this.generateOptimizedUrl(image.key, {
          format: 'webp',
          quality: 80,
        });

        const avifUrl = await this.generateOptimizedUrl(image.key, {
          format: 'avif',
          quality: 75,
        });

        optimizedUrls.set(`${image.key}-webp`, webpUrl);
        optimizedUrls.set(`${image.key}-avif`, avifUrl);

        // Estimate savings (simplified calculation)
        totalBandwidthSaving += 0.3; // 30% average saving with modern formats
        totalLoadTimeSaving += 200; // 200ms average improvement
      } catch (error) {
        console.warn(`Optimization failed for ${image.key}:`, error);
      }
    }

    return {
      optimizedUrls,
      estimatedSavings: {
        bandwidth: totalBandwidthSaving,
        loadTime: totalLoadTimeSaving,
      },
    };
  }

  async preloadImages(
    keys: string[],
    priority: 'high' | 'medium' | 'low' = 'medium',
  ): Promise<void> {
    const preloadPromises = keys.map(async (key) => {
      try {
        const provider = this.providers.get(this.primaryProvider);
        if (!provider) return;

        await fetch(`${provider.baseUrl}/preload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key,
            priority,
            regions: provider.regions,
          }),
        });
      } catch (error) {
        console.warn(`Preload failed for ${key}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  getProviderStatus(): Map<
    string,
    {
      id: string;
      name: string;
      status: 'active' | 'fallback' | 'disabled';
      health: boolean;
      responseTime?: number;
    }
  > {
    const status = new Map();

    this.providers.forEach((provider, id) => {
      status.set(id, {
        id: provider.id,
        name: provider.name,
        status: provider.status,
        health: true, // Would check actual health in production
        responseTime: Math.random() * 100 + 50, // Mock response time
      });
    });

    return status;
  }

  async switchPrimaryProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new IntegrationError(
        `Provider ${providerId} not found`,
        'PROVIDER_NOT_FOUND',
        ErrorCategory.CONFIGURATION,
      );
    }

    // Validate new provider is healthy
    const isHealthy = await this.validateConnection();
    if (!isHealthy) {
      throw new IntegrationError(
        `Provider ${providerId} is not healthy`,
        'PROVIDER_UNHEALTHY',
        ErrorCategory.EXTERNAL_API,
      );
    }

    const oldPrimary = this.primaryProvider;
    this.primaryProvider = providerId;

    // Update provider statuses
    const newPrimary = this.providers.get(providerId)!;
    newPrimary.status = 'active';

    if (this.providers.has(oldPrimary)) {
      this.providers.get(oldPrimary)!.status = 'fallback';
    }

    console.log(
      `Switched primary CDN provider from ${oldPrimary} to ${providerId}`,
    );
  }
}
