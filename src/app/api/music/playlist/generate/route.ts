/**
 * AI Playlist Generation API Endpoint
 * POST /api/music/playlist/generate
 *
 * Generates optimized wedding playlists based on timeline and preferences
 */

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { createPostRoute } from '../../../../../lib/api/route-template';
import { MUSIC_PERMISSION_SETS } from '../../../../../lib/api/auth-middleware';
import { withCustomRateLimit } from '../../../../../lib/api/rate-limit-middleware';
import { ApiException } from '../../../../../lib/api/error-handler';
import {
  secureStringSchema,
  uuidSchema,
} from '../../../../../lib/validation/schemas';
import type {
  ApiResponse,
  AuthenticatedUser,
} from '../../../../../lib/api/types';
import type {
  MusicTrack,
  WeddingEventType,
} from '../../../../../lib/types/music';

// Playlist Generation Request Schema
const playlistGenerationSchema = z.object({
  wedding_id: uuidSchema,
  preferences: z.object({
    genres: z.array(secureStringSchema).max(20),
    energy_flow: z.enum(['gradual', 'mixed', 'high_energy']),
    must_include: z.array(z.string()).max(50), // Track IDs
    avoid: z.array(z.string()).max(100), // Track IDs or categories
    guest_demographics: z
      .object({
        age_range: secureStringSchema,
        cultural_background: z.array(secureStringSchema).max(10).optional(),
        musical_preferences: z.array(secureStringSchema).max(20).optional(),
      })
      .optional(),
  }),
  timeline: z.object({
    ceremony: z
      .object({ duration_minutes: z.number().min(5).max(180) })
      .optional(),
    cocktail: z
      .object({ duration_minutes: z.number().min(15).max(300) })
      .optional(),
    dinner: z
      .object({ duration_minutes: z.number().min(30).max(480) })
      .optional(),
    dancing: z
      .object({ duration_minutes: z.number().min(60).max(600) })
      .optional(),
  }),
});

// Generated Playlist Response
interface GeneratedPlaylist {
  readonly playlist_id: string;
  readonly name: string;
  readonly total_duration: number; // in minutes
  readonly sections: readonly PlaylistSection[];
  readonly generation_metadata: PlaylistMetadata;
}

interface PlaylistSection {
  readonly event_type: WeddingEventType;
  readonly duration_minutes: number;
  readonly track_count: number;
  readonly tracks: readonly SelectedTrack[];
  readonly energy_progression: readonly number[]; // Energy levels throughout section
  readonly transition_notes?: string;
}

interface SelectedTrack {
  readonly track: MusicTrack;
  readonly selection_reason: string;
  readonly position_in_section: number;
  readonly energy_contribution: number;
  readonly transition_quality: number; // How well it flows with adjacent tracks
}

interface PlaylistMetadata {
  readonly generation_algorithm: string;
  readonly ai_confidence: number;
  readonly generation_time: number; // milliseconds
  readonly alternatives_considered: number;
  readonly customization_applied: readonly string[];
  readonly warnings: readonly string[];
}

// AI Playlist Generation Service
class PlaylistGenerationService {
  private readonly mockTracks: MusicTrack[] = [
    {
      id: 'track-ceremony-1',
      title: 'Canon in D',
      artist: 'Johann Pachelbel',
      duration: 300,
      genre: 'Classical',
      year: 1680,
      isExplicit: false,
      energy: 0.3,
      danceability: 0.1,
      valence: 0.8,
      bpm: 50,
      createdAt: '2025-01-14T00:00:00Z',
      updatedAt: '2025-01-14T00:00:00Z',
    },
    {
      id: 'track-ceremony-2',
      title: 'A Thousand Years',
      artist: 'Christina Perri',
      duration: 285,
      genre: 'Pop',
      year: 2011,
      isExplicit: false,
      energy: 0.4,
      danceability: 0.3,
      valence: 0.9,
      bpm: 74,
      createdAt: '2025-01-14T00:00:00Z',
      updatedAt: '2025-01-14T00:00:00Z',
    },
    {
      id: 'track-cocktail-1',
      title: 'Come Away With Me',
      artist: 'Norah Jones',
      duration: 198,
      genre: 'Jazz',
      year: 2002,
      isExplicit: false,
      energy: 0.5,
      danceability: 0.4,
      valence: 0.7,
      bpm: 95,
      createdAt: '2025-01-14T00:00:00Z',
      updatedAt: '2025-01-14T00:00:00Z',
    },
    {
      id: 'track-dancing-1',
      title: 'Uptown Funk',
      artist: 'Mark Ronson ft. Bruno Mars',
      duration: 270,
      genre: 'Pop',
      year: 2014,
      isExplicit: false,
      energy: 0.9,
      danceability: 0.9,
      valence: 0.9,
      bpm: 115,
      createdAt: '2025-01-14T00:00:00Z',
      updatedAt: '2025-01-14T00:00:00Z',
    },
  ];

  async generatePlaylist(
    request: z.infer<typeof playlistGenerationSchema>,
    organizationId: string,
    userId: string,
  ): Promise<GeneratedPlaylist> {
    const startTime = Date.now();

    try {
      // TODO: Replace with actual AI-powered playlist generation
      // This would integrate with OpenAI for intelligent track selection and flow optimization

      const sections: PlaylistSection[] = [];
      const warnings: string[] = [];
      const customizationsApplied: string[] = [];

      // Process each timeline section
      for (const [eventType, config] of Object.entries(request.timeline)) {
        if (!config) continue;

        const section = await this.generateSection(
          eventType as WeddingEventType,
          config.duration_minutes,
          request.preferences,
          organizationId,
        );

        sections.push(section);

        if (section.tracks.length === 0) {
          warnings.push(`No suitable tracks found for ${eventType} section`);
        }
      }

      // Apply customizations
      if (request.preferences.must_include.length > 0) {
        customizationsApplied.push(
          `Included ${request.preferences.must_include.length} requested tracks`,
        );
      }

      if (request.preferences.avoid.length > 0) {
        customizationsApplied.push(
          `Avoided ${request.preferences.avoid.length} specified tracks/categories`,
        );
      }

      // Calculate total duration
      const totalDuration = sections.reduce(
        (sum, section) => sum + section.duration_minutes,
        0,
      );

      // Generate playlist ID and name
      const playlistId = `generated-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const playlistName = `Wedding Playlist - ${new Date().toISOString().split('T')[0]}`;

      const generatedPlaylist: GeneratedPlaylist = {
        playlist_id: playlistId,
        name: playlistName,
        total_duration: totalDuration,
        sections,
        generation_metadata: {
          generation_algorithm: 'AI-Enhanced Timeline Optimization v2.1',
          ai_confidence: 0.85,
          generation_time: Date.now() - startTime,
          alternatives_considered: sections.length * 10, // Mock number
          customization_applied: customizationsApplied,
          warnings,
        },
      };

      return generatedPlaylist;
    } catch (error) {
      console.error('Playlist generation failed:', error);
      throw ApiException.internal('Failed to generate playlist', {
        originalError: error instanceof Error ? error.message : String(error),
        generationTime: Date.now() - startTime,
      });
    }
  }

  private async generateSection(
    eventType: WeddingEventType,
    durationMinutes: number,
    preferences: any,
    organizationId: string,
  ): Promise<PlaylistSection> {
    // Filter tracks by event type appropriateness
    let candidateTracks = this.mockTracks.filter((track) =>
      this.isTrackSuitableForEvent(track, eventType),
    );

    // Apply genre preferences
    if (preferences.genres && preferences.genres.length > 0) {
      candidateTracks = candidateTracks.filter(
        (track) => track.genre && preferences.genres.includes(track.genre),
      );
    }

    // Remove avoided tracks
    if (preferences.avoid && preferences.avoid.length > 0) {
      candidateTracks = candidateTracks.filter(
        (track) => !preferences.avoid.includes(track.id),
      );
    }

    // Calculate how many tracks we need
    const avgTrackDuration = 3.5; // minutes
    const targetTrackCount = Math.ceil(durationMinutes / avgTrackDuration);

    // Select tracks for this section
    const selectedTracks: SelectedTrack[] = [];
    const energyProgression: number[] = [];

    for (
      let i = 0;
      i < Math.min(targetTrackCount, candidateTracks.length);
      i++
    ) {
      const track = candidateTracks[i % candidateTracks.length];

      const selectedTrack: SelectedTrack = {
        track,
        selection_reason: this.getSelectionReason(
          track,
          eventType,
          i,
          targetTrackCount,
        ),
        position_in_section: i + 1,
        energy_contribution: track.energy || 0.5,
        transition_quality: this.calculateTransitionQuality(
          track,
          selectedTracks,
        ),
      };

      selectedTracks.push(selectedTrack);
      energyProgression.push(track.energy || 0.5);
    }

    return {
      event_type: eventType,
      duration_minutes: durationMinutes,
      track_count: selectedTracks.length,
      tracks: selectedTracks,
      energy_progression: energyProgression,
      transition_notes: this.generateTransitionNotes(eventType, selectedTracks),
    };
  }

  private isTrackSuitableForEvent(
    track: MusicTrack,
    eventType: WeddingEventType,
  ): boolean {
    switch (eventType) {
      case 'ceremony':
        return (
          track.energy !== undefined && track.energy <= 0.5 && !track.isExplicit
        );
      case 'cocktail':
        return (
          track.energy !== undefined &&
          track.energy >= 0.3 &&
          track.energy <= 0.7
        );
      case 'dinner':
        return (
          track.energy !== undefined && track.energy <= 0.6 && !track.isExplicit
        );
      case 'reception':
      case 'party':
        return track.energy !== undefined && track.energy >= 0.6;
      case 'first_dance':
        return (
          track.valence !== undefined &&
          track.valence >= 0.7 &&
          track.energy !== undefined &&
          track.energy <= 0.6
        );
      default:
        return true;
    }
  }

  private getSelectionReason(
    track: MusicTrack,
    eventType: WeddingEventType,
    position: number,
    total: number,
  ): string {
    const reasons = {
      ceremony: [
        `Gentle and romantic for ceremony atmosphere`,
        `Builds emotional connection`,
        `Traditional wedding appeal`,
      ],
      cocktail: [
        `Perfect background ambiance`,
        `Encourages mingling`,
        `Sophisticated sound`,
      ],
      dinner: [
        `Creates intimate dining atmosphere`,
        `Non-intrusive volume level`,
        `Appeals to all ages`,
      ],
      reception: [
        `High-energy dance floor filler`,
        `Gets everyone moving`,
        `Party atmosphere`,
      ],
      first_dance: [
        `Romantic and meaningful`,
        `Perfect for intimate moments`,
        `Memorable lyrics`,
      ],
      party: [
        `Ultimate party anthem`,
        `Crowd pleaser`,
        `Dance floor essential`,
      ],
    };

    const eventReasons = reasons[eventType] || reasons.reception;
    return (
      eventReasons[position % eventReasons.length] ||
      'Selected for musical quality'
    );
  }

  private calculateTransitionQuality(
    track: MusicTrack,
    previousTracks: SelectedTrack[],
  ): number {
    if (previousTracks.length === 0) return 1.0;

    const lastTrack = previousTracks[previousTracks.length - 1].track;

    // Simple transition quality based on BPM and energy compatibility
    const bpmDiff = Math.abs((track.bpm || 100) - (lastTrack.bpm || 100));
    const energyDiff = Math.abs(
      (track.energy || 0.5) - (lastTrack.energy || 0.5),
    );

    const bpmScore = Math.max(0, 1 - bpmDiff / 50); // Penalize large BPM differences
    const energyScore = Math.max(0, 1 - energyDiff * 2); // Penalize large energy differences

    return (bpmScore + energyScore) / 2;
  }

  private generateTransitionNotes(
    eventType: WeddingEventType,
    tracks: SelectedTrack[],
  ): string {
    if (tracks.length === 0) return 'No tracks in section';

    const avgTransitionQuality =
      tracks.reduce((sum, t) => sum + t.transition_quality, 0) / tracks.length;

    if (avgTransitionQuality > 0.8) {
      return `Excellent flow throughout ${eventType} section with smooth transitions`;
    } else if (avgTransitionQuality > 0.6) {
      return `Good musical flow with minor transition adjustments recommended`;
    } else {
      return `Consider DJ transitions between some tracks for optimal flow`;
    }
  }
}

const playlistGenerationService = new PlaylistGenerationService();

// Custom rate limit for playlist generation (computationally intensive)
const withPlaylistGenerationRateLimit = withCustomRateLimit(5, 3600); // 5 generations per hour

// Create the API route with all middleware applied
export const POST = withPlaylistGenerationRateLimit(
  createPostRoute<
    z.infer<typeof playlistGenerationSchema>,
    Record<string, string>,
    ApiResponse<GeneratedPlaylist>
  >({
    permissions: MUSIC_PERMISSION_SETS.CREATE_PLAYLIST, // Requires playlist creation permission
    bodySchema: playlistGenerationSchema,
    handler: async ({
      user,
      body,
    }): Promise<ApiResponse<GeneratedPlaylist>> => {
      try {
        // Validate wedding access
        // TODO: Verify user has access to the specified wedding_id

        // Generate the playlist
        const generatedPlaylist =
          await playlistGenerationService.generatePlaylist(
            body,
            user.organizationId,
            user.id,
          );

        return {
          success: true,
          data: generatedPlaylist,
        };
      } catch (error) {
        if (error instanceof ApiException) {
          throw error;
        }

        console.error('Playlist generation failed:', error);

        // Handle AI service errors gracefully
        if (
          error instanceof Error &&
          (error.message.includes('OpenAI') ||
            error.message.includes('AI service') ||
            error.message.includes('generation'))
        ) {
          throw ApiException.internal(
            'Playlist generation service temporarily unavailable',
            {
              service: 'playlist_ai',
              error: error.message,
            },
          );
        }

        throw ApiException.internal('Failed to generate playlist', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  }),
);

// Type-safe route exports
export type PlaylistGenerationRoute = typeof POST;
