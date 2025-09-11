/**
 * Apple Music API Provider Service
 * Integrates with Apple Music API for music search and metadata
 */

import type { MusicTrack, MusicSearchFilters } from '../types/music';
import { ApiException } from '../api/error-handler';

// Apple Music API Types
interface AppleMusicTrack {
  readonly id: string;
  readonly type: 'songs';
  readonly attributes: {
    readonly name: string;
    readonly artistName: string;
    readonly albumName: string;
    readonly durationInMillis: number;
    readonly contentRating?: string; // 'explicit' if explicit
    readonly previews?: readonly { url: string }[];
    readonly url?: string;
    readonly releaseDate: string;
    readonly genreNames: readonly string[];
    readonly isrc?: string;
  };
}

interface AppleMusicSearchResponse {
  readonly results: {
    readonly songs?: {
      readonly data: readonly AppleMusicTrack[];
      readonly next?: string;
    };
  };
}

// Apple Music rate limiting (more conservative than Spotify)
class AppleMusicRateLimiter {
  private requestCount: number = 0;
  private windowStart: number = Date.now();
  private readonly maxRequests: number = 1000; // Apple Music allows more requests
  private readonly windowMs: number = 3600000; // 1 hour

  canMakeRequest(): boolean {
    const now = Date.now();

    // Reset window if expired
    if (now - this.windowStart >= this.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    return this.requestCount < this.maxRequests;
  }

  recordRequest(): void {
    this.requestCount++;
  }

  getStatus(): { remaining: number; resetTime: number } {
    const now = Date.now();
    const remaining = Math.max(0, this.maxRequests - this.requestCount);
    const resetTime = this.windowStart + this.windowMs;

    return { remaining, resetTime };
  }
}

// Apple Music API Client
export class AppleMusicProvider {
  private readonly rateLimiter = new AppleMusicRateLimiter();
  private readonly baseUrl = 'https://api.music.apple.com/v1';
  private readonly developerToken: string;

  constructor() {
    this.developerToken = process.env.APPLE_MUSIC_DEVELOPER_TOKEN!;

    if (!this.developerToken) {
      throw new Error(
        'APPLE_MUSIC_DEVELOPER_TOKEN environment variable is required',
      );
    }
  }

  /**
   * Make authenticated request to Apple Music API
   */
  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<T> {
    if (!this.rateLimiter.canMakeRequest()) {
      const status = this.rateLimiter.getStatus();
      throw ApiException.rateLimit(
        `Apple Music API rate limit exceeded. Reset at ${new Date(status.resetTime).toISOString()}`,
      );
    }

    try {
      const url = new URL(`${this.baseUrl}${endpoint}`);

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.developerToken}`,
          Accept: 'application/json',
          'Music-User-Token': '', // Optional: for user-specific features
        },
      });

      this.rateLimiter.recordRequest();

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw ApiException.rateLimit(
          `Apple Music API rate limited. Retry after ${retryAfter} seconds`,
        );
      }

      if (!response.ok) {
        throw new Error(
          `Apple Music API error: ${response.status} ${response.statusText}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }

      console.error('Apple Music API request failed:', error);
      throw ApiException.internal('Apple Music API request failed', {
        endpoint,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Search for tracks using Apple Music API
   */
  async searchTracks(
    filters: MusicSearchFilters,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ tracks: MusicTrack[]; total: number }> {
    try {
      // Build search query - Apple Music uses different syntax than Spotify
      let query = filters.query || '';

      if (filters.artist) {
        query += ` artist:"${filters.artist}"`;
      }

      if (!query.trim()) {
        query = 'wedding'; // Default search if no query provided
      }

      // Apple Music doesn't support offset, but supports limit
      const searchResponse = await this.makeRequest<AppleMusicSearchResponse>(
        '/catalog/us/search',
        {
          term: query.trim(),
          types: 'songs',
          limit: Math.min(limit, 25).toString(), // Apple Music max limit is 25
          // Note: Apple Music doesn't provide total count in search results
        },
      );

      if (!searchResponse.results.songs?.data) {
        return { tracks: [], total: 0 };
      }

      // Convert to internal format
      const tracks: MusicTrack[] = searchResponse.results.songs.data.map(
        (appleMusicTrack) => {
          const isExplicit =
            appleMusicTrack.attributes.contentRating === 'explicit';
          const previewUrl = appleMusicTrack.attributes.previews?.[0]?.url;
          const year = appleMusicTrack.attributes.releaseDate
            ? parseInt(appleMusicTrack.attributes.releaseDate.split('-')[0])
            : undefined;

          return {
            id: `apple-${appleMusicTrack.id}`,
            title: appleMusicTrack.attributes.name,
            artist: appleMusicTrack.attributes.artistName,
            album: appleMusicTrack.attributes.albumName,
            duration: Math.round(
              appleMusicTrack.attributes.durationInMillis / 1000,
            ),
            genre: appleMusicTrack.attributes.genreNames[0] || undefined,
            year,
            appleMusicId: appleMusicTrack.id,
            previewUrl,
            isExplicit,
            // Apple Music doesn't provide audio features like Spotify
            bpm: undefined,
            key: undefined,
            energy: undefined,
            danceability: undefined,
            valence: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        },
      );

      // Apply client-side filters since Apple Music has limited search capabilities
      let filteredTracks = tracks;

      if (filters.genre) {
        filteredTracks = filteredTracks.filter(
          (track) =>
            track.genre &&
            track.genre.toLowerCase().includes(filters.genre!.toLowerCase()),
        );
      }

      if (filters.yearMin !== undefined || filters.yearMax !== undefined) {
        filteredTracks = filteredTracks.filter((track) => {
          if (!track.year) return false;
          if (filters.yearMin !== undefined && track.year < filters.yearMin)
            return false;
          if (filters.yearMax !== undefined && track.year > filters.yearMax)
            return false;
          return true;
        });
      }

      if (
        filters.durationMin !== undefined ||
        filters.durationMax !== undefined
      ) {
        filteredTracks = filteredTracks.filter((track) => {
          if (
            filters.durationMin !== undefined &&
            track.duration < filters.durationMin
          )
            return false;
          if (
            filters.durationMax !== undefined &&
            track.duration > filters.durationMax
          )
            return false;
          return true;
        });
      }

      if (filters.isExplicit !== undefined) {
        filteredTracks = filteredTracks.filter(
          (track) => track.isExplicit === filters.isExplicit,
        );
      }

      return {
        tracks: filteredTracks,
        total: filteredTracks.length, // Apple Music doesn't provide total count
      };
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }

      console.error('Apple Music search failed:', error);
      throw ApiException.internal('Failed to search Apple Music catalog', {
        filters,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get detailed track information by Apple Music ID
   */
  async getTrackDetails(appleMusicId: string): Promise<MusicTrack | null> {
    try {
      const response = await this.makeRequest<{
        data: AppleMusicTrack[];
      }>(`/catalog/us/songs/${appleMusicId}`);

      const trackData = response.data[0];
      if (!trackData) return null;

      const isExplicit = trackData.attributes.contentRating === 'explicit';
      const previewUrl = trackData.attributes.previews?.[0]?.url;
      const year = trackData.attributes.releaseDate
        ? parseInt(trackData.attributes.releaseDate.split('-')[0])
        : undefined;

      return {
        id: `apple-${trackData.id}`,
        title: trackData.attributes.name,
        artist: trackData.attributes.artistName,
        album: trackData.attributes.albumName,
        duration: Math.round(trackData.attributes.durationInMillis / 1000),
        genre: trackData.attributes.genreNames[0] || undefined,
        year,
        appleMusicId: trackData.id,
        previewUrl,
        isExplicit,
        bpm: undefined,
        key: undefined,
        energy: undefined,
        danceability: undefined,
        valence: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get Apple Music track details:', error);
      return null;
    }
  }

  /**
   * Get multiple tracks by IDs
   */
  async getMultipleTracks(
    appleMusicIds: readonly string[],
  ): Promise<MusicTrack[]> {
    if (appleMusicIds.length === 0) return [];

    try {
      // Apple Music allows up to 300 IDs in a single request
      const batchSize = 100; // Conservative batch size
      const results: MusicTrack[] = [];

      for (let i = 0; i < appleMusicIds.length; i += batchSize) {
        const batchIds = appleMusicIds.slice(i, i + batchSize);

        const response = await this.makeRequest<{
          data: AppleMusicTrack[];
        }>('/catalog/us/songs', {
          ids: batchIds.join(','),
        });

        const batchTracks = response.data.map((trackData) => {
          const isExplicit = trackData.attributes.contentRating === 'explicit';
          const previewUrl = trackData.attributes.previews?.[0]?.url;
          const year = trackData.attributes.releaseDate
            ? parseInt(trackData.attributes.releaseDate.split('-')[0])
            : undefined;

          return {
            id: `apple-${trackData.id}`,
            title: trackData.attributes.name,
            artist: trackData.attributes.artistName,
            album: trackData.attributes.albumName,
            duration: Math.round(trackData.attributes.durationInMillis / 1000),
            genre: trackData.attributes.genreNames[0] || undefined,
            year,
            appleMusicId: trackData.id,
            previewUrl,
            isExplicit,
            bpm: undefined,
            key: undefined,
            energy: undefined,
            danceability: undefined,
            valence: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });

        results.push(...batchTracks);
      }

      return results;
    } catch (error) {
      console.error('Failed to get multiple Apple Music tracks:', error);
      return [];
    }
  }

  /**
   * Search for albums by artist
   */
  async searchAlbumsByArtist(
    artistName: string,
    limit: number = 10,
  ): Promise<any[]> {
    try {
      const response = await this.makeRequest<any>('/catalog/us/search', {
        term: `artist:"${artistName}"`,
        types: 'albums',
        limit: limit.toString(),
      });

      return response.results.albums?.data || [];
    } catch (error) {
      console.error('Failed to search Apple Music albums:', error);
      return [];
    }
  }

  /**
   * Get recommendations based on genre
   */
  async getRecommendationsByGenre(
    genre: string,
    limit: number = 20,
  ): Promise<MusicTrack[]> {
    try {
      // Use search with genre filter as Apple Music doesn't have a dedicated recommendations endpoint
      return await this.searchTracks({ genre }, limit);
    } catch (error) {
      console.error('Failed to get Apple Music recommendations:', error);
      return [];
    }
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): { remaining: number; resetTime: number } {
    return this.rateLimiter.getStatus();
  }

  /**
   * Check if Apple Music is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      // Make a simple request to check if the service is available
      await this.makeRequest<any>('/catalog/us/charts', {
        types: 'songs',
        limit: '1',
      });
      return true;
    } catch (error) {
      console.error('Apple Music service unavailable:', error);
      return false;
    }
  }
}

// Export singleton instance
export const appleMusicProvider = new AppleMusicProvider();
