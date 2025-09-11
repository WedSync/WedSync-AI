/**
 * Song Request Resolution API Endpoint
 * POST /api/music/resolve-request
 *
 * Resolves vague song requests from couples using AI interpretation
 */

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { createPostRoute } from '../../../../lib/api/route-template';
import { MUSIC_PERMISSION_SETS } from '../../../../lib/api/auth-middleware';
import { withCustomRateLimit } from '../../../../lib/api/rate-limit-middleware';
import { ApiException } from '../../../../lib/api/error-handler';
import {
  secureStringSchema,
  uuidSchema,
} from '../../../../lib/validation/schemas';
import type { ApiResponse, AuthenticatedUser } from '../../../../lib/api/types';

// Song Request Resolution Schema
const songRequestSchema = z.object({
  original_request: secureStringSchema.min(3).max(500),
  wedding_id: uuidSchema.optional(),
  client_id: uuidSchema.optional(),
  context_clues: z.array(secureStringSchema).max(10).optional(),
  preferred_genres: z.array(secureStringSchema).max(20).optional(),
  event_type: z
    .enum(['ceremony', 'cocktail', 'dinner', 'reception', 'first_dance'])
    .optional(),
});

// Resolution Response
interface SongResolution {
  readonly matched_tracks: readonly ResolvedTrack[];
  readonly confidence_score: number; // 0.0-1.0
  readonly interpretation: string;
  readonly suggested_alternatives: readonly ResolvedTrack[];
  readonly needs_clarification: boolean;
  readonly clarification_questions: readonly string[];
}

interface ResolvedTrack {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly album?: string;
  readonly year?: number;
  readonly match_reason: string;
  readonly confidence: number; // 0.0-1.0
  readonly preview_url?: string;
  readonly external_id?: string;
  readonly provider?: string;
}

// AI-powered Song Request Resolution Service
class SongRequestResolver {
  async resolveRequest(
    originalRequest: string,
    context?: {
      weddingId?: string;
      clientId?: string;
      contextClues?: readonly string[];
      preferredGenres?: readonly string[];
      eventType?: string;
    },
    organizationId: string,
  ): Promise<SongResolution> {
    try {
      // TODO: Replace with actual OpenAI integration for better resolution
      // This would use GPT to interpret vague requests like "that song from the movie with the dancing"

      // Mock resolution logic
      const request = originalRequest.toLowerCase().trim();
      const matchedTracks: ResolvedTrack[] = [];
      const suggestedAlternatives: ResolvedTrack[] = [];
      let confidenceScore = 0.5;
      let interpretation = `Interpreting request: "${originalRequest}"`;
      let needsClarification = false;
      const clarificationQuestions: string[] = [];

      // Pattern matching for common wedding song requests
      const commonPatterns = [
        {
          patterns: ['first dance', 'our song', 'special song'],
          tracks: [
            {
              id: 'track-perfect',
              title: 'Perfect',
              artist: 'Ed Sheeran',
              album: '÷ (Divide)',
              year: 2017,
              match_reason: 'Popular first dance song',
              confidence: 0.9,
              provider: 'spotify',
            },
          ],
        },
        {
          patterns: ['wedding march', 'walk down aisle', 'processional'],
          tracks: [
            {
              id: 'track-wedding-march',
              title: 'Wedding March',
              artist: 'Felix Mendelssohn',
              match_reason: 'Traditional wedding processional',
              confidence: 0.95,
              provider: 'spotify',
            },
          ],
        },
        {
          patterns: ['party', 'dancing', 'celebration'],
          tracks: [
            {
              id: 'track-uptown-funk',
              title: 'Uptown Funk',
              artist: 'Mark Ronson ft. Bruno Mars',
              year: 2014,
              match_reason: 'High-energy party song',
              confidence: 0.8,
              provider: 'spotify',
            },
          ],
        },
        {
          patterns: ['love', 'romantic', 'slow dance'],
          tracks: [
            {
              id: 'track-all-of-me',
              title: 'All of Me',
              artist: 'John Legend',
              year: 2013,
              match_reason: 'Romantic love song',
              confidence: 0.85,
              provider: 'spotify',
            },
          ],
        },
      ];

      // Find matching patterns
      for (const pattern of commonPatterns) {
        if (pattern.patterns.some((p) => request.includes(p))) {
          matchedTracks.push(...pattern.tracks);
          confidenceScore = Math.max(
            confidenceScore,
            pattern.tracks[0]?.confidence || 0.5,
          );
          interpretation = `Found matches for "${originalRequest}" - appears to be looking for ${pattern.tracks[0]?.match_reason.toLowerCase()}`;
          break;
        }
      }

      // Handle movie/TV references
      if (
        request.includes('movie') ||
        request.includes('film') ||
        request.includes('tv')
      ) {
        needsClarification = true;
        clarificationQuestions.push(
          'What movie or TV show is the song from?',
          'Do you remember any lyrics from the song?',
          'What genre is the song (pop, rock, classical, etc.)?',
        );
        interpretation = `Request mentions media (movie/TV) - need more specific details to identify the song`;
        confidenceScore = 0.2;
      }

      // Handle lyric fragments
      if (
        request.includes('"') ||
        request.includes('lyrics') ||
        request.includes('goes like')
      ) {
        const lyricMatch = request.match(/"([^"]*)"/);
        if (lyricMatch) {
          interpretation = `Attempting to match lyric fragment: "${lyricMatch[1]}"`;
          // TODO: Implement lyric search via external APIs
          needsClarification = true;
          clarificationQuestions.push(
            'Can you provide more lyrics from the song?',
            'Do you know the artist or approximate year?',
          );
        }
      }

      // Handle decade/era references
      const decadeMatch = request.match(/(\d{2,4})s?/);
      if (decadeMatch) {
        const decade = decadeMatch[1];
        interpretation += ` Looking for songs from the ${decade}s era.`;
        confidenceScore = Math.max(confidenceScore, 0.6);
      }

      // Add genre-specific suggestions if no matches found
      if (matchedTracks.length === 0) {
        const eventType = context?.eventType;
        if (eventType === 'ceremony') {
          suggestedAlternatives.push({
            id: 'track-a-thousand-years',
            title: 'A Thousand Years',
            artist: 'Christina Perri',
            year: 2011,
            match_reason: 'Popular ceremony song',
            confidence: 0.7,
            provider: 'spotify',
          });
        } else if (eventType === 'reception') {
          suggestedAlternatives.push({
            id: 'track-cant-stop-feeling',
            title: "Can't Stop the Feeling",
            artist: 'Justin Timberlake',
            year: 2016,
            match_reason: 'Upbeat reception song',
            confidence: 0.7,
            provider: 'spotify',
          });
        }

        needsClarification = true;
        clarificationQuestions.push(
          'Can you be more specific about the song title or artist?',
          'What type of song are you looking for (slow, upbeat, romantic)?',
          'Is this for a specific part of the wedding (ceremony, reception, etc.)?',
        );
      }

      // If we have preferred genres, adjust suggestions
      if (context?.preferredGenres && context.preferredGenres.length > 0) {
        interpretation += ` Considering preferred genres: ${context.preferredGenres.join(', ')}.`;
        confidenceScore = Math.min(1.0, confidenceScore + 0.1);
      }

      return {
        matched_tracks: matchedTracks,
        confidence_score: confidenceScore,
        interpretation,
        suggested_alternatives: suggestedAlternatives,
        needs_clarification: needsClarification,
        clarification_questions: clarificationQuestions,
      };
    } catch (error) {
      console.error('Song request resolution failed:', error);
      throw ApiException.internal('Failed to resolve song request', {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async logResolution(
    originalRequest: string,
    resolution: SongResolution,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    // TODO: Log the resolution to database for learning and improvement
    console.log(`Song resolution logged for org ${organizationId}:`, {
      request: originalRequest,
      matchCount: resolution.matched_tracks.length,
      confidence: resolution.confidence_score,
      needsClarification: resolution.needs_clarification,
    });
  }
}

const songRequestResolver = new SongRequestResolver();

// Custom rate limit for song request resolution
const withRequestResolutionRateLimit = withCustomRateLimit(30, 3600); // 30 requests per hour

// Create the API route with all middleware applied
export const POST = withRequestResolutionRateLimit(
  createPostRoute<
    z.infer<typeof songRequestSchema>,
    Record<string, string>,
    ApiResponse<SongResolution>
  >({
    permissions: MUSIC_PERMISSION_SETS.SEARCH_MUSIC, // Requires read permission
    bodySchema: songRequestSchema,
    handler: async ({ user, body }): Promise<ApiResponse<SongResolution>> => {
      try {
        const {
          original_request,
          wedding_id,
          client_id,
          context_clues,
          preferred_genres,
          event_type,
        } = body;

        // Resolve the song request
        const resolution = await songRequestResolver.resolveRequest(
          original_request,
          {
            weddingId: wedding_id,
            clientId: client_id,
            contextClues: context_clues,
            preferredGenres: preferred_genres,
            eventType: event_type,
          },
          user.organizationId,
        );

        // Log the resolution for analytics and improvement
        await songRequestResolver.logResolution(
          original_request,
          resolution,
          user.organizationId,
          user.id,
        );

        return {
          success: true,
          data: resolution,
        };
      } catch (error) {
        if (error instanceof ApiException) {
          throw error;
        }

        console.error('Song request resolution failed:', error);

        // Handle AI service errors gracefully
        if (
          error instanceof Error &&
          (error.message.includes('OpenAI') ||
            error.message.includes('AI service'))
        ) {
          throw ApiException.internal(
            'Song resolution service temporarily unavailable',
            { service: 'ai_resolution' },
          );
        }

        throw ApiException.internal('Failed to resolve song request', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  }),
);

// Type-safe route exports
export type SongRequestResolutionRoute = typeof POST;
