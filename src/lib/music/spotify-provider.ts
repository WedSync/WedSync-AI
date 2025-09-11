/**
 * Spotify Music Provider Service
 * Integrates with Spotify Web API for music search and metadata
 */

import type { MusicTrack, MusicSearchFilters } from '../types/music';
import { ApiException } from '../api/error-handler';

// Spotify API Types
interface SpotifyTrack {
  readonly id: string;
  readonly name: string;
  readonly artists: readonly { name: string; id: string }[];
  readonly album: {
    readonly name: string;
    readonly release_date: string;
    readonly images: readonly { url: string; height: number; width: number }[];
  };
  readonly duration_ms: number;
  readonly explicit: boolean;
  readonly preview_url: string | null;
  readonly external_urls: {
    readonly spotify: string;
  };
  readonly popularity: number;
}

interface SpotifySearchResponse {
  readonly tracks: {
    readonly items: readonly SpotifyTrack[];
    readonly total: number;
    readonly limit: number;
    readonly offset: number;
    readonly next: string | null;
    readonly previous: string | null;
  };
}

interface SpotifyAudioFeatures {
  readonly id: string;
  readonly energy: number; // 0.0 - 1.0
  readonly danceability: number; // 0.0 - 1.0
  readonly valence: number; // 0.0 - 1.0
  readonly tempo: number; // BPM
  readonly key: number; // Pitch class notation
  readonly mode: number; // Major (1) or minor (0)
  readonly acousticness: number;
  readonly instrumentalness: number;
  readonly liveness: number;
  readonly loudness: number;
  readonly speechiness: number;
  readonly time_signature: number;
}

// Rate Limiting Implementation
class SpotifyRateLimiter {
  private requestCount: number = 0;
  private windowStart: number = Date.now();
  private readonly maxRequests: number = 100; // Spotify allows 100 requests per hour
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

// Spotify Web API Client
export class SpotifyMusicProvider {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly rateLimiter = new SpotifyRateLimiter();
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl = 'https://api.spotify.com/v1';

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID!;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables are required',
      );
    }
  }

  /**
   * Get access token using Client Credentials flow
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(
          `Spotify token request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        access_token: string;
        token_type: string;
        expires_in: number;
      };

      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000; // 1 minute buffer

      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Spotify access token:', error);
      throw ApiException.internal('Failed to authenticate with Spotify API', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Make authenticated request to Spotify API
   */
  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<T> {
    if (!this.rateLimiter.canMakeRequest()) {
      const status = this.rateLimiter.getStatus();
      throw ApiException.rateLimit(
        `Spotify API rate limit exceeded. Reset at ${new Date(status.resetTime).toISOString()}`,
      );
    }

    try {
      const token = await this.getAccessToken();
      const url = new URL(`${this.baseUrl}${endpoint}`);

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      this.rateLimiter.recordRequest();

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw ApiException.rateLimit(
          `Spotify API rate limited. Retry after ${retryAfter} seconds`,
        );
      }

      if (!response.ok) {
        throw new Error(
          `Spotify API error: ${response.status} ${response.statusText}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }

      console.error('Spotify API request failed:', error);
      throw ApiException.internal('Spotify API request failed', {
        endpoint,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Search for tracks using Spotify Web API
   */
  async searchTracks(
    filters: MusicSearchFilters,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ tracks: MusicTrack[]; total: number }> {
    try {
      // Build search query
      let query = filters.query || '';

      if (filters.artist) {
        query += ` artist:"${filters.artist}"`;
      }

      if (filters.genre) {
        query += ` genre:"${filters.genre}"`;
      }

      if (filters.yearMin && filters.yearMax) {
        query += ` year:${filters.yearMin}-${filters.yearMax}`;
      } else if (filters.yearMin) {
        query += ` year:${filters.yearMin}-`;
      } else if (filters.yearMax) {
        query += ` year:-${filters.yearMax}`;
      }

      if (!query.trim()) {
        query = 'wedding'; // Default search if no query provided
      }

      // Make search request
      const searchResponse = await this.makeRequest<SpotifySearchResponse>(
        '/search',
        {
          q: query.trim(),
          type: 'track',
          limit: Math.min(limit, 50).toString(), // Spotify max limit is 50
          offset: offset.toString(),
          market: 'US',
        },
      );

      // Get audio features for enhanced metadata
      const trackIds = searchResponse.tracks.items.map((track) => track.id);
      const audioFeatures = await this.getAudioFeatures(trackIds);

      // Convert to internal format
      const tracks: MusicTrack[] = searchResponse.tracks.items.map(
        (spotifyTrack) => {
          const features = audioFeatures.find((f) => f.id === spotifyTrack.id);

          return {
            id: `spotify-${spotifyTrack.id}`,
            title: spotifyTrack.name,
            artist: spotifyTrack.artists.map((a) => a.name).join(', '),
            album: spotifyTrack.album.name,
            duration: Math.round(spotifyTrack.duration_ms / 1000), // Convert to seconds
            genre: undefined, // Spotify doesn't provide genre in search results
            year: spotifyTrack.album.release_date
              ? parseInt(spotifyTrack.album.release_date.split('-')[0])
              : undefined,
            spotifyId: spotifyTrack.id,
            previewUrl: spotifyTrack.preview_url || undefined,
            isExplicit: spotifyTrack.explicit,
            bpm: features?.tempo ? Math.round(features.tempo) : undefined,
            key: features
              ? this.convertSpotifyKey(features.key, features.mode)
              : undefined,
            energy: features?.energy,
            danceability: features?.danceability,
            valence: features?.valence,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        },
      );

      // Apply additional filters that Spotify doesn't support natively
      let filteredTracks = tracks;

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

      if (filters.energyMin !== undefined || filters.energyMax !== undefined) {
        filteredTracks = filteredTracks.filter((track) => {
          if (!track.energy) return false;
          if (
            filters.energyMin !== undefined &&
            track.energy < filters.energyMin
          )
            return false;
          if (
            filters.energyMax !== undefined &&
            track.energy > filters.energyMax
          )
            return false;
          return true;
        });
      }

      if (filters.bpmMin !== undefined || filters.bpmMax !== undefined) {
        filteredTracks = filteredTracks.filter((track) => {
          if (!track.bpm) return false;
          if (filters.bpmMin !== undefined && track.bpm < filters.bpmMin)
            return false;
          if (filters.bpmMax !== undefined && track.bpm > filters.bpmMax)
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
        total: searchResponse.tracks.total,
      };
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }

      console.error('Spotify search failed:', error);
      throw ApiException.internal('Failed to search Spotify music catalog', {
        filters,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get audio features for multiple tracks
   */
  private async getAudioFeatures(
    trackIds: readonly string[],
  ): Promise<SpotifyAudioFeatures[]> {
    if (trackIds.length === 0) return [];

    try {
      const response = await this.makeRequest<{
        audio_features: (SpotifyAudioFeatures | null)[];
      }>('/audio-features', {
        ids: trackIds.join(','),
      });

      // Filter out null results (tracks without audio features)
      return response.audio_features.filter(
        (features): features is SpotifyAudioFeatures => features !== null,
      );
    } catch (error) {
      console.warn('Failed to get audio features:', error);
      return []; // Return empty array if audio features fail - not critical
    }
  }

  /**
   * Convert Spotify key notation to musical key string
   */
  private convertSpotifyKey(key: number, mode: number): string {
    const keys = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ];
    const keyName = keys[key] || '?';
    const modeName = mode === 1 ? 'major' : 'minor';

    return `${keyName} ${modeName}`;
  }

  /**
   * Get detailed track information by Spotify ID
   */
  async getTrackDetails(spotifyId: string): Promise<MusicTrack | null> {
    try {
      const [trackData, audioFeatures] = await Promise.all([
        this.makeRequest<SpotifyTrack>(`/tracks/${spotifyId}`),
        this.getAudioFeatures([spotifyId]),
      ]);

      const features = audioFeatures[0];

      return {
        id: `spotify-${trackData.id}`,
        title: trackData.name,
        artist: trackData.artists.map((a) => a.name).join(', '),
        album: trackData.album.name,
        duration: Math.round(trackData.duration_ms / 1000),
        genre: undefined,
        year: trackData.album.release_date
          ? parseInt(trackData.album.release_date.split('-')[0])
          : undefined,
        spotifyId: trackData.id,
        previewUrl: trackData.preview_url || undefined,
        isExplicit: trackData.explicit,
        bpm: features?.tempo ? Math.round(features.tempo) : undefined,
        key: features
          ? this.convertSpotifyKey(features.key, features.mode)
          : undefined,
        energy: features?.energy,
        danceability: features?.danceability,
        valence: features?.valence,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get Spotify track details:', error);
      return null;
    }
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): { remaining: number; resetTime: number } {
    return this.rateLimiter.getStatus();
  }
}

// Export singleton instance
export const spotifyProvider = new SpotifyMusicProvider();
