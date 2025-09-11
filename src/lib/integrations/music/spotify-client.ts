import { z } from 'zod';
import { BaseHttpClient, BaseHttpClientConfig } from '../core/base-http-client';

// Spotify API Response Schemas
const SpotifyTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  artists: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
  album: z.object({
    id: z.string(),
    name: z.string(),
    release_date: z.string(),
    images: z.array(
      z.object({
        url: z.string(),
        height: z.number().nullable(),
        width: z.number().nullable(),
      }),
    ),
  }),
  duration_ms: z.number(),
  popularity: z.number(),
  preview_url: z.string().nullable(),
  explicit: z.boolean(),
  external_urls: z.object({
    spotify: z.string(),
  }),
});

const SpotifySearchResponseSchema = z.object({
  tracks: z.object({
    items: z.array(SpotifyTrackSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
});

const SpotifyPlaylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  images: z.array(
    z.object({
      url: z.string(),
      height: z.number().nullable(),
      width: z.number().nullable(),
    }),
  ),
  tracks: z.object({
    total: z.number(),
  }),
  external_urls: z.object({
    spotify: z.string(),
  }),
});

const SpotifyTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export type SpotifyTrack = z.infer<typeof SpotifyTrackSchema>;
export type SpotifySearchResponse = z.infer<typeof SpotifySearchResponseSchema>;
export type SpotifyPlaylist = z.infer<typeof SpotifyPlaylistSchema>;
export type SpotifyTokenResponse = z.infer<typeof SpotifyTokenResponseSchema>;

export interface SpotifyClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

export class SpotifyTokenManager {
  private accessToken?: string;
  private refreshToken?: string;
  private expiresAt?: number;

  constructor(
    private config: SpotifyClientConfig,
    private httpClient: BaseHttpClient,
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.accessToken && this.expiresAt && Date.now() < this.expiresAt) {
      return this.accessToken;
    }

    if (this.refreshToken) {
      await this.refreshAccessToken();
    } else {
      await this.getClientCredentialsToken();
    }

    if (!this.accessToken) {
      throw new Error('Failed to obtain Spotify access token');
    }

    return this.accessToken;
  }

  private async getClientCredentialsToken(): Promise<void> {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString('base64');

    try {
      const response = await this.httpClient.request<SpotifyTokenResponse>(
        '/api/token',
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials',
        },
        SpotifyTokenResponseSchema,
      );

      this.accessToken = response.access_token;
      this.expiresAt = Date.now() + response.expires_in * 1000 - 60000; // 1 minute buffer
    } catch (error) {
      throw new Error(
        `Failed to get Spotify client credentials token: ${error}`,
      );
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString('base64');

    try {
      const response = await this.httpClient.request<SpotifyTokenResponse>(
        '/api/token',
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `grant_type=refresh_token&refresh_token=${this.refreshToken}`,
        },
        SpotifyTokenResponseSchema,
      );

      this.accessToken = response.access_token;
      this.expiresAt = Date.now() + response.expires_in * 1000 - 60000;

      if (response.refresh_token) {
        this.refreshToken = response.refresh_token;
      }
    } catch (error) {
      throw new Error(`Failed to refresh Spotify access token: ${error}`);
    }
  }

  setTokens(
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number,
  ): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = expiresIn
      ? Date.now() + expiresIn * 1000 - 60000
      : undefined;
  }
}

export class SpotifyClient {
  private authHttpClient: BaseHttpClient;
  private apiHttpClient: BaseHttpClient;
  private tokenManager: SpotifyTokenManager;

  constructor(config: SpotifyClientConfig) {
    const authClientConfig: BaseHttpClientConfig = {
      baseURL: 'https://accounts.spotify.com',
      timeout: 10000,
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
        requestsPerSecond: 5, // Conservative rate limit for auth
        burstSize: 10,
        windowSize: 1000,
      },
    };

    const apiClientConfig: BaseHttpClientConfig = {
      baseURL: 'https://api.spotify.com/v1',
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
        requestsPerSecond: 10, // Conservative rate limit for Spotify API
        burstSize: 20,
        windowSize: 1000,
      },
    };

    this.authHttpClient = new BaseHttpClient(authClientConfig);
    this.apiHttpClient = new BaseHttpClient(apiClientConfig);
    this.tokenManager = new SpotifyTokenManager(config, this.authHttpClient);
  }

  async searchTracks(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      market?: string;
    } = {},
  ): Promise<SpotifySearchResponse> {
    const token = await this.tokenManager.getAccessToken();

    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: (options.limit || 20).toString(),
      offset: (options.offset || 0).toString(),
      ...(options.market && { market: options.market }),
    });

    return await this.apiHttpClient.request<SpotifySearchResponse>(
      `/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      SpotifySearchResponseSchema,
    );
  }

  async getTrack(trackId: string, market?: string): Promise<SpotifyTrack> {
    const token = await this.tokenManager.getAccessToken();

    const params = new URLSearchParams();
    if (market) {
      params.append('market', market);
    }

    return await this.apiHttpClient.request<SpotifyTrack>(
      `/tracks/${trackId}${params.toString() ? `?${params.toString()}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      SpotifyTrackSchema,
    );
  }

  async getMultipleTracks(
    trackIds: string[],
    market?: string,
  ): Promise<SpotifyTrack[]> {
    const token = await this.tokenManager.getAccessToken();

    // Spotify allows up to 50 IDs per request
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 50) {
      chunks.push(trackIds.slice(i, i + 50));
    }

    const allTracks: SpotifyTrack[] = [];

    for (const chunk of chunks) {
      const params = new URLSearchParams({
        ids: chunk.join(','),
      });
      if (market) {
        params.append('market', market);
      }

      const response = await this.apiHttpClient.request<{
        tracks: SpotifyTrack[];
      }>(`/tracks?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.tracks) {
        allTracks.push(...response.tracks);
      }
    }

    return allTracks;
  }

  async createPlaylist(
    userId: string,
    name: string,
    options: {
      description?: string;
      public?: boolean;
      collaborative?: boolean;
    } = {},
  ): Promise<SpotifyPlaylist> {
    const token = await this.tokenManager.getAccessToken();

    return await this.apiHttpClient.request<SpotifyPlaylist>(
      `/users/${userId}/playlists`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: options.description || '',
          public: options.public ?? false,
          collaborative: options.collaborative ?? false,
        }),
      },
      SpotifyPlaylistSchema,
    );
  }

  async addTracksToPlaylist(
    playlistId: string,
    trackUris: string[],
  ): Promise<{ snapshot_id: string }> {
    const token = await this.tokenManager.getAccessToken();

    // Spotify allows max 100 tracks per request
    const chunks = [];
    for (let i = 0; i < trackUris.length; i += 100) {
      chunks.push(trackUris.slice(i, i + 100));
    }

    let lastSnapshot = '';
    for (const chunk of chunks) {
      const result = await this.apiHttpClient.request<{ snapshot_id: string }>(
        `/playlists/${playlistId}/tracks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            uris: chunk,
          }),
        },
      );
      lastSnapshot = result.snapshot_id;
    }

    return { snapshot_id: lastSnapshot };
  }

  async getArtistTopTracks(
    artistId: string,
    market = 'US',
  ): Promise<SpotifyTrack[]> {
    const token = await this.tokenManager.getAccessToken();

    const response = await this.apiHttpClient.request<{
      tracks: SpotifyTrack[];
    }>(`/artists/${artistId}/top-tracks?market=${market}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.tracks || [];
  }

  async getRecommendations(options: {
    seedTracks?: string[];
    seedArtists?: string[];
    seedGenres?: string[];
    limit?: number;
    market?: string;
    targetValence?: number; // 0.0 - 1.0 (musical positiveness)
    targetEnergy?: number; // 0.0 - 1.0
    targetDanceability?: number; // 0.0 - 1.0
  }): Promise<SpotifyTrack[]> {
    const token = await this.tokenManager.getAccessToken();

    const params = new URLSearchParams();

    if (options.seedTracks?.length) {
      params.append('seed_tracks', options.seedTracks.join(','));
    }
    if (options.seedArtists?.length) {
      params.append('seed_artists', options.seedArtists.join(','));
    }
    if (options.seedGenres?.length) {
      params.append('seed_genres', options.seedGenres.join(','));
    }

    params.append('limit', (options.limit || 20).toString());
    if (options.market) params.append('market', options.market);
    if (options.targetValence !== undefined)
      params.append('target_valence', options.targetValence.toString());
    if (options.targetEnergy !== undefined)
      params.append('target_energy', options.targetEnergy.toString());
    if (options.targetDanceability !== undefined)
      params.append(
        'target_danceability',
        options.targetDanceability.toString(),
      );

    const response = await this.apiHttpClient.request<{
      tracks: SpotifyTrack[];
    }>(`/recommendations?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.tracks || [];
  }

  getMetrics() {
    return {
      auth: this.authHttpClient.getMetrics(),
      api: this.apiHttpClient.getMetrics(),
    };
  }
}
