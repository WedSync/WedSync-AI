import { SpotifyClient, SpotifyTrack } from './music/spotify-client';
import { AppleMusicClient, AppleMusicTrack } from './music/apple-music-client';
import { OpenAIMusicAnalyzer } from './ai/openai-music-analyzer';
import {
  MusicTrack,
  AppropriatenessAnalysis,
  SongResolution,
  WeddingContext,
  RequestContext,
} from '@/types/integrations';

export interface MusicSearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  services?: ('spotify' | 'apple')[];
  market?: string;
}

export interface MusicRecommendationPreferences {
  genres?: string[];
  energy?: 'low' | 'medium' | 'high';
  mood?: string;
  occasion?: string;
  excludeExplicit?: boolean;
  guestCount?: number;
  weddingStyle?: string;
}

export interface MusicIntegrationConfig {
  spotify?: {
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
  };
  appleMusic?: {
    teamId: string;
    keyId: string;
    privateKey: string;
    storefront?: string;
  };
  openAI?: {
    apiKey: string;
    organization?: string;
    maxTokensPerRequest?: number;
    maxCostPerRequest?: number;
    dailyCostLimit?: number;
  };
}

export interface ServiceHealthStatus {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  circuitBreakerState: string;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };
  errors: Array<{
    timestamp: Date;
    error: string;
    type: string;
  }>;
}

export class MusicIntegrationService {
  private spotifyClient?: SpotifyClient;
  private appleMusicClient?: AppleMusicClient;
  private openAIClient?: OpenAIMusicAnalyzer;
  private cache = new Map<string, { data: any; expires: number }>();
  private requestMetrics = new Map<
    string,
    Array<{ timestamp: number; success: boolean; responseTime: number }>
  >();

  constructor(private config: MusicIntegrationConfig) {
    this.initializeClients();
  }

  private initializeClients(): void {
    // Initialize Spotify client
    if (this.config.spotify) {
      this.spotifyClient = new SpotifyClient(this.config.spotify);
    }

    // Initialize Apple Music client
    if (this.config.appleMusic) {
      this.appleMusicClient = new AppleMusicClient(this.config.appleMusic);
    }

    // Initialize OpenAI client
    if (this.config.openAI) {
      this.openAIClient = new OpenAIMusicAnalyzer(this.config.openAI);
    }
  }

  async searchTracks(options: MusicSearchOptions): Promise<MusicTrack[]> {
    const {
      query,
      limit = 20,
      offset = 0,
      services = ['spotify'],
      market,
    } = options;

    // Check cache first
    const cacheKey = `search:${JSON.stringify({ query, limit, offset, services, market })}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const results: MusicTrack[] = [];
    const errors: string[] = [];

    // Search Spotify
    if (services.includes('spotify') && this.spotifyClient) {
      try {
        const startTime = Date.now();
        const spotifyResults = await this.spotifyClient.searchTracks(query, {
          limit,
          offset,
          market,
        });

        const spotifyTracks = spotifyResults.tracks.items.map((track) =>
          this.convertSpotifyTrack(track),
        );
        results.push(...spotifyTracks);

        this.recordMetric('spotify', true, Date.now() - startTime);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown Spotify error';
        errors.push(`Spotify: ${errorMsg}`);
        this.recordMetric('spotify', false, 0, errorMsg);
      }
    }

    // Search Apple Music
    if (services.includes('apple') && this.appleMusicClient) {
      try {
        const startTime = Date.now();
        const appleResults = await this.appleMusicClient.searchTracks(query, {
          limit,
          offset,
          storefront: market,
        });

        if (appleResults.results.songs?.data) {
          const appleTracks = appleResults.results.songs.data.map((track) =>
            this.convertAppleMusicTrack(track),
          );
          results.push(...appleTracks);
        }

        this.recordMetric('apple-music', true, Date.now() - startTime);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown Apple Music error';
        errors.push(`Apple Music: ${errorMsg}`);
        this.recordMetric('apple-music', false, 0, errorMsg);
      }
    }

    // Cache results if successful
    if (results.length > 0) {
      this.setCache(cacheKey, results, 30 * 60 * 1000); // 30 minutes
    }

    // If all services failed, throw an error
    if (results.length === 0 && errors.length === services.length) {
      throw new Error(`All music services failed: ${errors.join(', ')}`);
    }

    return this.deduplicateAndSort(results);
  }

  async getTrackDetails(
    trackId: string,
    service: 'spotify' | 'apple',
  ): Promise<MusicTrack | null> {
    // Check cache first
    const cacheKey = `track:${service}:${trackId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let track: MusicTrack | null = null;
      const startTime = Date.now();

      if (service === 'spotify' && this.spotifyClient) {
        const spotifyTrack = await this.spotifyClient.getTrack(trackId);
        track = this.convertSpotifyTrack(spotifyTrack);
        this.recordMetric('spotify', true, Date.now() - startTime);
      } else if (service === 'apple' && this.appleMusicClient) {
        const appleTrack = await this.appleMusicClient.getTrack(trackId);
        track = this.convertAppleMusicTrack(appleTrack);
        this.recordMetric('apple-music', true, Date.now() - startTime);
      }

      // Cache the result
      if (track) {
        this.setCache(cacheKey, track, 24 * 60 * 60 * 1000); // 24 hours
      }

      return track;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.recordMetric(
        service === 'spotify' ? 'spotify' : 'apple-music',
        false,
        0,
        errorMsg,
      );
      throw error;
    }
  }

  async generateRecommendations(
    preferences: MusicRecommendationPreferences,
  ): Promise<string[]> {
    if (!this.openAIClient) {
      throw new Error('OpenAI client not configured');
    }

    // Check cache first
    const cacheKey = `recommendations:${JSON.stringify(preferences)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startTime = Date.now();
      const recommendations =
        await this.openAIClient.generateWeddingPlaylist(preferences);

      // Cache the recommendations
      this.setCache(cacheKey, recommendations, 60 * 60 * 1000); // 1 hour

      this.recordMetric('openai', true, Date.now() - startTime);
      return recommendations;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown OpenAI error';
      this.recordMetric('openai', false, 0, errorMsg);
      throw error;
    }
  }

  async analyzeTrackForWedding(
    track: MusicTrack,
    context?: WeddingContext,
  ): Promise<AppropriatenessAnalysis> {
    if (!this.openAIClient) {
      throw new Error('OpenAI client not configured');
    }

    const cacheKey = `analysis:${track.id}:${JSON.stringify(context)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startTime = Date.now();
      const analysis = await this.openAIClient.analyzeWeddingAppropriateness(
        track,
        context,
      );

      // Cache analysis for 1 hour
      this.setCache(cacheKey, analysis, 60 * 60 * 1000);

      this.recordMetric('openai', true, Date.now() - startTime);
      return analysis;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown OpenAI error';
      this.recordMetric('openai', false, 0, errorMsg);
      throw error;
    }
  }

  async resolveSongRequest(
    request: string,
    context?: RequestContext,
  ): Promise<SongResolution> {
    if (!this.openAIClient) {
      throw new Error('OpenAI client not configured');
    }

    try {
      const startTime = Date.now();
      const resolution = await this.openAIClient.resolveSongRequest(
        request,
        context,
      );

      this.recordMetric('openai', true, Date.now() - startTime);
      return resolution;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown OpenAI error';
      this.recordMetric('openai', false, 0, errorMsg);
      throw error;
    }
  }

  async createSpotifyPlaylist(
    userId: string,
    name: string,
    tracks: string[],
    options?: {
      description?: string;
      public?: boolean;
      collaborative?: boolean;
    },
  ): Promise<{ playlistId: string; playlistUrl: string }> {
    if (!this.spotifyClient) {
      throw new Error('Spotify client not configured');
    }

    try {
      const startTime = Date.now();

      // Create playlist
      const playlist = await this.spotifyClient.createPlaylist(
        userId,
        name,
        options,
      );

      // Add tracks if provided
      if (tracks.length > 0) {
        const trackUris = tracks.map((id) => `spotify:track:${id}`);
        await this.spotifyClient.addTracksToPlaylist(playlist.id, trackUris);
      }

      this.recordMetric('spotify', true, Date.now() - startTime);

      return {
        playlistId: playlist.id,
        playlistUrl: playlist.external_urls.spotify,
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown Spotify error';
      this.recordMetric('spotify', false, 0, errorMsg);
      throw error;
    }
  }

  private convertSpotifyTrack(track: SpotifyTrack): MusicTrack {
    return {
      id: `spotify:${track.id}`,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      album: track.album.name,
      duration: track.duration_ms,
      previewUrl: track.preview_url || undefined,
      spotifyId: track.id,
      imageUrl: track.album.images[0]?.url,
      externalUrls: {
        spotify: track.external_urls.spotify,
      },
      popularity: track.popularity,
      explicit: track.explicit,
      releaseDate: track.album.release_date,
    };
  }

  private convertAppleMusicTrack(track: AppleMusicTrack): MusicTrack {
    return {
      id: `apple:${track.id}`,
      title: track.attributes.name,
      artist: track.attributes.artistName,
      album: track.attributes.albumName,
      duration: track.attributes.durationInMillis,
      previewUrl: track.attributes.previews?.[0]?.url,
      appleMusicId: track.id,
      imageUrl: track.attributes.artwork?.url
        .replace('{w}', '400')
        .replace('{h}', '400'),
      externalUrls: {
        appleMusic: track.attributes.url,
      },
      explicit: track.attributes.contentRating === 'explicit',
      releaseDate: track.attributes.releaseDate,
    };
  }

  private deduplicateAndSort(tracks: MusicTrack[]): MusicTrack[] {
    const seen = new Set<string>();
    const deduplicated: MusicTrack[] = [];

    for (const track of tracks) {
      // Create a simple key for deduplication
      const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(track);
      }
    }

    // Sort by popularity (Spotify tracks first since they have popularity scores)
    return deduplicated.sort((a, b) => {
      if (a.popularity && b.popularity) {
        return b.popularity - a.popularity;
      }
      if (a.popularity && !b.popularity) return -1;
      if (!a.popularity && b.popularity) return 1;
      return 0;
    });
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs,
    });

    // Simple cache cleanup - remove expired entries occasionally
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (v.expires <= now) {
          this.cache.delete(k);
        }
      }
    }
  }

  private recordMetric(
    service: string,
    success: boolean,
    responseTime: number,
    error?: string,
  ): void {
    const metrics = this.requestMetrics.get(service) || [];
    metrics.push({
      timestamp: Date.now(),
      success,
      responseTime,
    });

    // Keep only last 1000 metrics per service
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    this.requestMetrics.set(service, metrics);
  }

  getHealthStatus(): ServiceHealthStatus[] {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const services: ServiceHealthStatus[] = [];

    for (const [serviceName, metrics] of this.requestMetrics) {
      const recentMetrics = metrics.filter((m) => m.timestamp > oneHourAgo);

      if (recentMetrics.length === 0) {
        services.push({
          serviceName,
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 0,
          errorRate: 0,
          circuitBreakerState: 'CLOSED',
          metrics: {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
          },
          errors: [],
        });
        continue;
      }

      const successful = recentMetrics.filter((m) => m.success);
      const failed = recentMetrics.filter((m) => !m.success);
      const errorRate = failed.length / recentMetrics.length;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (errorRate > 0.5) status = 'unhealthy';
      else if (errorRate > 0.2) status = 'degraded';

      services.push({
        serviceName,
        status,
        lastCheck: new Date(Math.max(...recentMetrics.map((m) => m.timestamp))),
        responseTime:
          successful.length > 0
            ? successful.reduce((sum, m) => sum + m.responseTime, 0) /
              successful.length
            : 0,
        errorRate,
        circuitBreakerState: 'CLOSED', // Would get from actual circuit breaker
        metrics: {
          totalRequests: recentMetrics.length,
          successfulRequests: successful.length,
          failedRequests: failed.length,
          averageResponseTime:
            recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
            recentMetrics.length,
        },
        errors: failed.slice(-5).map((m) => ({
          timestamp: new Date(m.timestamp),
          error: 'Request failed',
          type: 'error',
        })),
      });
    }

    return services;
  }

  getOverallHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
    totalServices: number;
  } {
    const statuses = this.getHealthStatus();

    const healthy = statuses.filter((s) => s.status === 'healthy').length;
    const degraded = statuses.filter((s) => s.status === 'degraded').length;
    const unhealthy = statuses.filter((s) => s.status === 'unhealthy').length;
    const total = statuses.length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (degraded > 0 || (total > 0 && healthy / total < 0.8)) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      healthyServices: healthy,
      degradedServices: degraded,
      unhealthyServices: unhealthy,
      totalServices: total,
    };
  }

  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires > now) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      hitRate: 0, // Would need hit/miss tracking for real implementation
    };
  }

  getServiceMetrics() {
    const metrics: any = {
      cache: this.getCacheStats(),
      health: this.getOverallHealth(),
    };

    if (this.spotifyClient) {
      metrics.spotify = this.spotifyClient.getMetrics();
    }

    if (this.appleMusicClient) {
      metrics.appleMusic = this.appleMusicClient.getMetrics();
    }

    if (this.openAIClient) {
      metrics.openai = this.openAIClient.getMetrics();
    }

    return metrics;
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  destroy(): void {
    this.cache.clear();
    this.requestMetrics.clear();
  }
}
