/**
 * Wedding Music AI Analysis Service
 * Provides AI-powered music analysis for wedding appropriateness
 */

import OpenAI from 'openai';
import type { MusicTrack, WeddingEventType } from '../types/music';
import { ApiException } from '../api/error-handler';

// AI Analysis Types
export interface WeddingAppropriatenessAnalysis {
  readonly score: number; // 0.0-1.0 appropriateness score
  readonly categories: readonly WeddingEventType[];
  readonly issues: readonly string[];
  readonly reasoning: string;
  readonly energy_level: number; // 0.0-1.0
  readonly confidence: number; // 0.0-1.0 AI confidence
  readonly alternatives?: readonly string[]; // suggested alternatives if inappropriate
  readonly cultural_considerations?: readonly string[];
  readonly age_appropriateness?: {
    readonly min_age: number;
    readonly concerns: readonly string[];
  };
}

export interface WeddingContext {
  readonly cultural_considerations?: readonly string[];
  readonly guest_age_range?: string;
  readonly venue_type?: string;
  readonly event_type?: WeddingEventType;
  readonly religious_considerations?: boolean;
  readonly family_friendly?: boolean;
}

// Rate Limiting for OpenAI API
class OpenAIRateLimiter {
  private requestCount: number = 0;
  private windowStart: number = Date.now();
  private readonly maxRequests: number = 500; // Conservative limit for GPT-3.5
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
    const remaining = Math.max(0, this.maxRequests - this.requestCount);
    const resetTime = this.windowStart + this.windowMs;

    return { remaining, resetTime };
  }
}

// AI Analysis Cache
interface CacheEntry {
  readonly analysis: WeddingAppropriatenessAnalysis;
  readonly timestamp: number;
  readonly context_hash: string;
}

class AnalysisCache {
  private cache = new Map<string, CacheEntry>();
  private readonly ttl: number = 24 * 60 * 60 * 1000; // 24 hours

  private generateKey(track: MusicTrack, context?: WeddingContext): string {
    const contextHash = context
      ? Buffer.from(JSON.stringify(context)).toString('base64')
      : 'default';
    return `${track.id}-${contextHash}`;
  }

  get(
    track: MusicTrack,
    context?: WeddingContext,
  ): WeddingAppropriatenessAnalysis | null {
    const key = this.generateKey(track, context);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.analysis;
  }

  set(
    track: MusicTrack,
    analysis: WeddingAppropriatenessAnalysis,
    context?: WeddingContext,
  ): void {
    const key = this.generateKey(track, context);
    const contextHash = context
      ? Buffer.from(JSON.stringify(context)).toString('base64')
      : 'default';

    this.cache.set(key, {
      analysis,
      timestamp: Date.now(),
      context_hash: contextHash,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Main Wedding Music AI Service
export class WeddingMusicAI {
  private openai: OpenAI;
  private rateLimiter = new OpenAIRateLimiter();
  private cache = new AnalysisCache();

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 2,
    });
  }

  /**
   * Analyze music track for wedding appropriateness
   */
  async analyzeWeddingAppropriateness(
    track: MusicTrack,
    context?: WeddingContext,
  ): Promise<WeddingAppropriatenessAnalysis> {
    // Check cache first
    const cached = this.cache.get(track, context);
    if (cached) {
      return cached;
    }

    // Check rate limits
    if (!this.rateLimiter.canMakeRequest()) {
      const status = this.rateLimiter.getStatus();
      throw ApiException.rateLimit(
        `OpenAI API rate limit exceeded. Reset at ${new Date(status.resetTime).toISOString()}`,
      );
    }

    try {
      const analysis = await this.performAIAnalysis(track, context);
      this.rateLimiter.recordRequest();

      // Cache the result
      this.cache.set(track, analysis, context);

      return analysis;
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }

      console.error('OpenAI analysis failed:', error);
      throw ApiException.internal('AI music analysis failed', {
        trackId: track.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Perform AI analysis using OpenAI structured output
   */
  private async performAIAnalysis(
    track: MusicTrack,
    context?: WeddingContext,
  ): Promise<WeddingAppropriatenessAnalysis> {
    const prompt = this.buildAnalysisPrompt(track, context);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional wedding music consultant with expertise in appropriate music selection for diverse wedding celebrations. You understand cultural sensitivities, religious considerations, and age-appropriate content for family celebrations.

Your task is to analyze songs for wedding appropriateness and provide detailed, actionable feedback. Consider lyrics, themes, energy level, and cultural context.

Respond only with valid JSON matching this exact structure:
{
  "score": number, // 0.0-1.0 appropriateness score
  "categories": string[], // Array of suitable wedding event types
  "issues": string[], // Array of potential concerns
  "reasoning": string, // Brief explanation
  "energy_level": number, // 0.0-1.0 energy assessment
  "confidence": number, // 0.0-1.0 confidence in analysis
  "alternatives": string[], // Optional suggestions if inappropriate
  "cultural_considerations": string[], // Optional cultural notes
  "age_appropriateness": {
    "min_age": number,
    "concerns": string[]
  }
}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const parsed = JSON.parse(content);

      // Validate and clean the response
      return this.validateAndCleanAnalysis(parsed);
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('Failed to parse OpenAI JSON response:', error);
        throw ApiException.internal('AI analysis returned invalid format');
      }

      throw error;
    }
  }

  /**
   * Build analysis prompt for OpenAI
   */
  private buildAnalysisPrompt(
    track: MusicTrack,
    context?: WeddingContext,
  ): string {
    let prompt = `Analyze this song for wedding appropriateness:

**Song Details:**
- Title: "${track.title}"
- Artist: ${track.artist}`;

    if (track.album) {
      prompt += `\n- Album: ${track.album}`;
    }

    if (track.year) {
      prompt += `\n- Year: ${track.year}`;
    }

    if (track.genre) {
      prompt += `\n- Genre: ${track.genre}`;
    }

    if (track.isExplicit) {
      prompt += `\n- Contains explicit content: Yes`;
    }

    if (track.energy !== undefined) {
      prompt += `\n- Energy Level: ${(track.energy * 100).toFixed(0)}% (${track.energy < 0.3 ? 'Low' : track.energy < 0.7 ? 'Medium' : 'High'})`;
    }

    if (track.valence !== undefined) {
      prompt += `\n- Musical Positivity: ${(track.valence * 100).toFixed(0)}% (${track.valence < 0.3 ? 'Sad/Dark' : track.valence < 0.7 ? 'Neutral' : 'Happy/Uplifting'})`;
    }

    if (track.bpm) {
      prompt += `\n- Tempo: ${track.bpm} BPM`;
    }

    if (context) {
      prompt += `\n\n**Wedding Context:**`;

      if (context.event_type) {
        prompt += `\n- Event Type: ${context.event_type}`;
      }

      if (context.venue_type) {
        prompt += `\n- Venue Type: ${context.venue_type}`;
      }

      if (context.guest_age_range) {
        prompt += `\n- Guest Age Range: ${context.guest_age_range}`;
      }

      if (
        context.cultural_considerations &&
        context.cultural_considerations.length > 0
      ) {
        prompt += `\n- Cultural Background: ${context.cultural_considerations.join(', ')}`;
      }

      if (context.religious_considerations) {
        prompt += `\n- Religious Considerations: Yes - ensure appropriate for religious ceremonies`;
      }

      if (context.family_friendly) {
        prompt += `\n- Family Event: Yes - must be appropriate for all ages including children`;
      }
    }

    prompt += `\n\n**Analysis Requirements:**
1. Rate appropriateness (0.0-1.0): 1.0=perfect, 0.8-0.9=great, 0.6-0.7=questionable, 0.3-0.5=inappropriate, 0.0-0.2=definitely inappropriate
2. Identify suitable wedding event categories: ceremony, cocktail, dinner, reception, first_dance, party
3. List any potential issues: explicit content, sad themes (breakup, death), inappropriate references, cultural insensitivity
4. Assess energy level for event matching (0.0-1.0)
5. Provide confidence level in your analysis (0.0-1.0)
6. If inappropriate, suggest 2-3 alternative songs
7. Note any cultural considerations
8. Determine minimum appropriate age and concerns`;

    return prompt;
  }

  /**
   * Validate and clean AI analysis response
   */
  private validateAndCleanAnalysis(
    parsed: any,
  ): WeddingAppropriatenessAnalysis {
    // Ensure required fields are present and valid
    const score =
      typeof parsed.score === 'number'
        ? Math.max(0, Math.min(1, parsed.score))
        : 0.5;

    const categories = Array.isArray(parsed.categories)
      ? parsed.categories.filter(
          (cat: any) =>
            typeof cat === 'string' &&
            [
              'ceremony',
              'cocktail',
              'dinner',
              'reception',
              'first_dance',
              'party',
            ].includes(cat),
        )
      : [];

    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.filter((issue: any) => typeof issue === 'string')
      : [];

    const reasoning =
      typeof parsed.reasoning === 'string'
        ? parsed.reasoning
        : 'Analysis completed';

    const energy_level =
      typeof parsed.energy_level === 'number'
        ? Math.max(0, Math.min(1, parsed.energy_level))
        : 0.5;

    const confidence =
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.7;

    const alternatives = Array.isArray(parsed.alternatives)
      ? parsed.alternatives
          .filter((alt: any) => typeof alt === 'string')
          .slice(0, 5)
      : undefined;

    const cultural_considerations = Array.isArray(
      parsed.cultural_considerations,
    )
      ? parsed.cultural_considerations.filter(
          (cc: any) => typeof cc === 'string',
        )
      : undefined;

    const age_appropriateness =
      parsed.age_appropriateness &&
      typeof parsed.age_appropriateness === 'object'
        ? {
            min_age:
              typeof parsed.age_appropriateness.min_age === 'number'
                ? Math.max(0, Math.min(21, parsed.age_appropriateness.min_age))
                : 0,
            concerns: Array.isArray(parsed.age_appropriateness.concerns)
              ? parsed.age_appropriateness.concerns.filter(
                  (c: any) => typeof c === 'string',
                )
              : [],
          }
        : undefined;

    return {
      score,
      categories: categories as WeddingEventType[],
      issues,
      reasoning,
      energy_level,
      confidence,
      alternatives,
      cultural_considerations,
      age_appropriateness,
    };
  }

  /**
   * Batch analyze multiple tracks
   */
  async batchAnalyze(
    tracks: readonly MusicTrack[],
    context?: WeddingContext,
  ): Promise<Map<string, WeddingAppropriatenessAnalysis>> {
    const results = new Map<string, WeddingAppropriatenessAnalysis>();
    const analysisPromises: Promise<void>[] = [];

    // Process tracks in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);

      for (const track of batch) {
        const promise = this.analyzeWeddingAppropriateness(track, context)
          .then((analysis) => {
            results.set(track.id, analysis);
          })
          .catch((error) => {
            console.error(`Failed to analyze track ${track.id}:`, error);
            // Continue with other tracks even if one fails
          });

        analysisPromises.push(promise);
      }

      // Add delay between batches to respect rate limits
      if (i + batchSize < tracks.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    await Promise.all(analysisPromises);
    return results;
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): { remaining: number; resetTime: number } {
    return this.rateLimiter.getStatus();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size(),
    };
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const weddingMusicAI = new WeddingMusicAI();
