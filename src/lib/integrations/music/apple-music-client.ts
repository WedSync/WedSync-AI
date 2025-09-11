import { z } from 'zod';
import { BaseHttpClient, BaseHttpClientConfig } from '../core/base-http-client';
import jwt from 'jsonwebtoken';

// Apple Music API Response Schemas
const AppleMusicArtworkSchema = z.object({
  width: z.number(),
  height: z.number(),
  url: z.string(),
});

const AppleMusicArtistSchema = z.object({
  id: z.string(),
  type: z.literal('artists'),
  attributes: z.object({
    name: z.string(),
    genreNames: z.array(z.string()).optional(),
  }),
});

const AppleMusicTrackSchema = z.object({
  id: z.string(),
  type: z.literal('songs'),
  attributes: z.object({
    name: z.string(),
    artistName: z.string(),
    albumName: z.string(),
    durationInMillis: z.number(),
    releaseDate: z.string().optional(),
    contentRating: z.string().optional(),
    playParams: z
      .object({
        id: z.string(),
        kind: z.string(),
      })
      .optional(),
    artwork: AppleMusicArtworkSchema.optional(),
    url: z.string().optional(),
    previews: z
      .array(
        z.object({
          url: z.string(),
        }),
      )
      .optional(),
  }),
  relationships: z
    .object({
      artists: z
        .object({
          data: z.array(
            z.object({
              id: z.string(),
              type: z.literal('artists'),
            }),
          ),
        })
        .optional(),
    })
    .optional(),
});

const AppleMusicSearchResponseSchema = z.object({
  results: z.object({
    songs: z
      .object({
        data: z.array(AppleMusicTrackSchema),
        href: z.string().optional(),
        next: z.string().optional(),
      })
      .optional(),
  }),
});

export type AppleMusicTrack = z.infer<typeof AppleMusicTrackSchema>;
export type AppleMusicSearchResponse = z.infer<
  typeof AppleMusicSearchResponseSchema
>;

export interface AppleMusicClientConfig {
  teamId: string;
  keyId: string;
  privateKey: string;
  storefront?: string;
}

export class AppleMusicTokenManager {
  private token?: string;
  private expiresAt?: number;

  constructor(private config: AppleMusicClientConfig) {}

  async getAccessToken(): Promise<string> {
    if (this.token && this.expiresAt && Date.now() < this.expiresAt) {
      return this.token;
    }

    await this.generateToken();

    if (!this.token) {
      throw new Error('Failed to generate Apple Music JWT token');
    }

    return this.token;
  }

  private async generateToken(): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 180 * 24 * 60 * 60; // 180 days (Apple Music maximum)

      const payload = {
        iss: this.config.teamId,
        exp: exp,
        iat: now,
      };

      const header = {
        alg: 'ES256',
        kid: this.config.keyId,
      };

      this.token = jwt.sign(payload, this.config.privateKey, {
        algorithm: 'ES256',
        header: header,
      });

      this.expiresAt = exp * 1000 - 60000; // 1 minute buffer
    } catch (error) {
      throw new Error(`Failed to generate Apple Music JWT token: ${error}`);
    }
  }
}

export class AppleMusicClient {
  private httpClient: BaseHttpClient;
  private tokenManager: AppleMusicTokenManager;

  constructor(config: AppleMusicClientConfig) {
    const clientConfig: BaseHttpClientConfig = {
      baseURL: 'https://api.music.apple.com/v1',
      timeout: 15000,
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringWindow: 300000,
        expectedFailureRate: 0.5,
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        jitterMax: 1000,
        retryableStatuses: [429, 500, 502, 503, 504],
      },
      rateLimit: {
        requestsPerSecond: 8, // Conservative rate limit for Apple Music
        burstSize: 15,
        windowSize: 1000,
      },
    };

    this.httpClient = new BaseHttpClient(clientConfig);
    this.tokenManager = new AppleMusicTokenManager(config);
  }

  async searchTracks(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      storefront?: string;
    } = {},
  ): Promise<AppleMusicSearchResponse> {
    const token = await this.tokenManager.getAccessToken();
    const storefront = options.storefront || this.getStorefront();

    const params = new URLSearchParams({
      term: query,
      types: 'songs',
      limit: (options.limit || 20).toString(),
      ...(options.offset && { offset: options.offset.toString() }),
    });

    return await this.httpClient.request<AppleMusicSearchResponse>(
      `/catalog/${storefront}/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Music-User-Token': '', // User token if available for personalized results
        },
      },
      AppleMusicSearchResponseSchema,
    );
  }

  async getTrack(
    trackId: string,
    options: {
      storefront?: string;
    } = {},
  ): Promise<AppleMusicTrack> {
    const token = await this.tokenManager.getAccessToken();
    const storefront = options.storefront || this.getStorefront();

    const response = await this.httpClient.request<{ data: [AppleMusicTrack] }>(
      `/catalog/${storefront}/songs/${trackId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.data || response.data.length === 0) {
      throw new Error(`Track not found: ${trackId}`);
    }

    return response.data[0];
  }

  async getMultipleTracks(
    trackIds: string[],
    options: {
      storefront?: string;
    } = {},
  ): Promise<AppleMusicTrack[]> {
    const token = await this.tokenManager.getAccessToken();
    const storefront = options.storefront || this.getStorefront();

    // Apple Music allows up to 300 IDs per request
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 300) {
      chunks.push(trackIds.slice(i, i + 300));
    }

    const allTracks: AppleMusicTrack[] = [];

    for (const chunk of chunks) {
      const params = new URLSearchParams({
        ids: chunk.join(','),
      });

      const response = await this.httpClient.request<{
        data: AppleMusicTrack[];
      }>(`/catalog/${storefront}/songs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data) {
        allTracks.push(...response.data);
      }
    }

    return allTracks;
  }

  async searchArtists(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      storefront?: string;
    } = {},
  ): Promise<{ results: { artists?: { data: AppleMusicArtistSchema[] } } }> {
    const token = await this.tokenManager.getAccessToken();
    const storefront = options.storefront || this.getStorefront();

    const params = new URLSearchParams({
      term: query,
      types: 'artists',
      limit: (options.limit || 20).toString(),
      ...(options.offset && { offset: options.offset.toString() }),
    });

    return await this.httpClient.request(
      `/catalog/${storefront}/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  }

  async getArtistTopSongs(
    artistId: string,
    options: {
      limit?: number;
      storefront?: string;
    } = {},
  ): Promise<AppleMusicTrack[]> {
    const token = await this.tokenManager.getAccessToken();
    const storefront = options.storefront || this.getStorefront();

    const params = new URLSearchParams({
      limit: (options.limit || 10).toString(),
    });

    const response = await this.httpClient.request<{ data: AppleMusicTrack[] }>(
      `/catalog/${storefront}/artists/${artistId}/songs?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data || [];
  }

  async getGenres(
    storefront?: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const token = await this.tokenManager.getAccessToken();
    const store = storefront || this.getStorefront();

    const response = await this.httpClient.request<{
      data: Array<{
        id: string;
        attributes: { name: string };
      }>;
    }>(`/catalog/${store}/genres`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return (response.data || []).map((genre) => ({
      id: genre.id,
      name: genre.attributes.name,
    }));
  }

  async getCuratorPlaylists(
    curatorId: string,
    options: {
      limit?: number;
      offset?: number;
      storefront?: string;
    } = {},
  ): Promise<any[]> {
    const token = await this.tokenManager.getAccessToken();
    const storefront = options.storefront || this.getStorefront();

    const params = new URLSearchParams({
      limit: (options.limit || 20).toString(),
      ...(options.offset && { offset: options.offset.toString() }),
    });

    const response = await this.httpClient.request<{ data: any[] }>(
      `/catalog/${storefront}/curators/${curatorId}/playlists?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data || [];
  }

  private getStorefront(): string {
    // Default to US storefront, could be made configurable
    return 'us';
  }

  getMetrics() {
    return this.httpClient.getMetrics();
  }
}
