import { z } from 'zod';
import { BaseHttpClient, BaseHttpClientConfig } from '../core/base-http-client';
import {
  MusicTrack,
  AppropriatenessAnalysis,
  SongResolution,
  WeddingContext,
  RequestContext,
} from '@/types/integrations';

// OpenAI API Response Schemas
const OpenAIMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const OpenAIUsageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
});

const OpenAIChatCompletionSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: OpenAIMessageSchema,
      finish_reason: z.string(),
    }),
  ),
  usage: OpenAIUsageSchema,
});

const OpenAIEmbeddingSchema = z.object({
  object: z.literal('embedding'),
  embedding: z.array(z.number()),
  index: z.number(),
});

const OpenAIEmbeddingResponseSchema = z.object({
  object: z.literal('list'),
  data: z.array(OpenAIEmbeddingSchema),
  model: z.string(),
  usage: z.object({
    prompt_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

export type OpenAIMessage = z.infer<typeof OpenAIMessageSchema>;
export type OpenAIChatCompletion = z.infer<typeof OpenAIChatCompletionSchema>;
export type OpenAIEmbeddingResponse = z.infer<
  typeof OpenAIEmbeddingResponseSchema
>;

export interface OpenAIClientConfig {
  apiKey: string;
  organization?: string;
  maxTokensPerRequest?: number;
  maxCostPerRequest?: number; // USD
  dailyCostLimit?: number; // USD
}

export interface CostTracker {
  dailyCost: number;
  lastResetDate: string;
  totalRequests: number;
  totalTokens: number;
}

const MODEL_PRICING = {
  'gpt-4o': {
    input: 0.0025, // per 1K tokens
    output: 0.01, // per 1K tokens
  },
  'gpt-4o-mini': {
    input: 0.00015,
    output: 0.0006,
  },
  'gpt-3.5-turbo': {
    input: 0.0005,
    output: 0.0015,
  },
  'text-embedding-3-small': {
    input: 0.00002,
    output: 0,
  },
  'text-embedding-3-large': {
    input: 0.00013,
    output: 0,
  },
} as const;

export class CostControlError extends Error {
  constructor(
    message: string,
    public currentCost: number,
    public limit: number,
  ) {
    super(message);
    this.name = 'CostControlError';
  }
}

export class OpenAICostTracker {
  private costData: CostTracker;

  constructor(private config: OpenAIClientConfig) {
    this.costData = this.loadCostData();
  }

  private loadCostData(): CostTracker {
    // In a real implementation, this would load from persistent storage
    const today = new Date().toISOString().split('T')[0];

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('openai_cost_tracker');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.lastResetDate === today) {
          return data;
        }
      }
    }

    // Reset daily cost
    return {
      dailyCost: 0,
      lastResetDate: today,
      totalRequests: 0,
      totalTokens: 0,
    };
  }

  private saveCostData(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'openai_cost_tracker',
        JSON.stringify(this.costData),
      );
    }
  }

  checkCostLimits(estimatedCost: number): void {
    const today = new Date().toISOString().split('T')[0];

    // Reset daily cost if new day
    if (this.costData.lastResetDate !== today) {
      this.costData.dailyCost = 0;
      this.costData.lastResetDate = today;
    }

    // Check per-request limit
    if (
      this.config.maxCostPerRequest &&
      estimatedCost > this.config.maxCostPerRequest
    ) {
      throw new CostControlError(
        `Request cost $${estimatedCost.toFixed(4)} exceeds limit $${this.config.maxCostPerRequest}`,
        estimatedCost,
        this.config.maxCostPerRequest,
      );
    }

    // Check daily limit
    const projectedDailyCost = this.costData.dailyCost + estimatedCost;
    if (
      this.config.dailyCostLimit &&
      projectedDailyCost > this.config.dailyCostLimit
    ) {
      throw new CostControlError(
        `Daily cost limit would be exceeded. Current: $${this.costData.dailyCost.toFixed(4)}, Projected: $${projectedDailyCost.toFixed(4)}, Limit: $${this.config.dailyCostLimit}`,
        projectedDailyCost,
        this.config.dailyCostLimit,
      );
    }
  }

  recordUsage(model: string, usage: any): number {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
    if (!pricing) {
      console.warn(`Unknown model pricing for ${model}`);
      return 0;
    }

    const inputCost = (usage.prompt_tokens / 1000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    this.costData.dailyCost += totalCost;
    this.costData.totalRequests += 1;
    this.costData.totalTokens += usage.total_tokens;

    this.saveCostData();
    return totalCost;
  }

  estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number = 0,
  ): number {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
    if (!pricing) {
      return 0;
    }

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    return inputCost + outputCost;
  }

  getCostData(): CostTracker {
    return { ...this.costData };
  }
}

export class OpenAIMusicAnalyzer {
  private httpClient: BaseHttpClient;
  private costTracker: OpenAICostTracker;

  constructor(config: OpenAIClientConfig) {
    const clientConfig: BaseHttpClientConfig = {
      baseURL: 'https://api.openai.com/v1',
      timeout: 60000, // OpenAI can take a while
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeout: 120000, // 2 minutes
        monitoringWindow: 600000, // 10 minutes
        expectedFailureRate: 0.2,
      },
      retry: {
        maxRetries: 2, // Be conservative with retries for cost
        baseDelay: 2000,
        maxDelay: 60000,
        jitterMax: 2000,
        retryableStatuses: [429, 500, 502, 503, 504],
      },
      rateLimit: {
        requestsPerSecond: 3, // Conservative rate limiting
        burstSize: 5,
        windowSize: 1000,
      },
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        ...(config.organization && {
          'OpenAI-Organization': config.organization,
        }),
      },
    };

    this.httpClient = new BaseHttpClient(clientConfig);
    this.costTracker = new OpenAICostTracker(config);
  }

  async analyzeWeddingAppropriateness(
    track: MusicTrack,
    context?: WeddingContext,
  ): Promise<AppropriatenessAnalysis> {
    const prompt = this.buildAnalysisPrompt(track, context);

    // Estimate input tokens (rough approximation: 4 chars = 1 token)
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedCost = this.costTracker.estimateCost(
      'gpt-4o-mini',
      estimatedInputTokens,
      500,
    );

    // Check cost limits before making the request
    this.costTracker.checkCostLimits(estimatedCost);

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content:
          'You are a professional wedding music consultant with expertise in appropriate music selection for diverse wedding celebrations. Respond only with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.httpClient.request<OpenAIChatCompletion>(
        '/chat/completions',
        {
          method: 'POST',
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            response_format: { type: 'json_object' },
            temperature: 0.2,
            max_tokens: 500,
          }),
        },
        OpenAIChatCompletionSchema,
      );

      // Record actual usage
      const actualCost = this.costTracker.recordUsage(
        'gpt-4o-mini',
        response.usage,
      );
      console.log(
        `OpenAI analysis cost: $${actualCost.toFixed(4)} (${response.usage.total_tokens} tokens)`,
      );

      const analysis = JSON.parse(
        response.choices[0]?.message?.content || '{}',
      );
      return this.validateAnalysis(analysis);
    } catch (error) {
      if (error instanceof Error && error.message.includes('429')) {
        throw new Error('OpenAI rate limit exceeded');
      } else if (error instanceof Error && error.message.includes('quota')) {
        throw new Error('OpenAI quota exceeded');
      }
      throw new Error(`OpenAI analysis failed: ${error}`);
    }
  }

  async resolveSongRequest(
    request: string,
    context?: RequestContext,
  ): Promise<SongResolution> {
    const prompt = this.buildResolutionPrompt(request, context);

    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedCost = this.costTracker.estimateCost(
      'gpt-4o',
      estimatedInputTokens,
      800,
    );

    this.costTracker.checkCostLimits(estimatedCost);

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content:
          'You are an expert wedding DJ with deep knowledge of popular wedding music, movie soundtracks, and song identification from partial descriptions. Respond only with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.httpClient.request<OpenAIChatCompletion>(
        '/chat/completions',
        {
          method: 'POST',
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: messages,
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 800,
          }),
        },
        OpenAIChatCompletionSchema,
      );

      const actualCost = this.costTracker.recordUsage('gpt-4o', response.usage);
      console.log(
        `OpenAI resolution cost: $${actualCost.toFixed(4)} (${response.usage.total_tokens} tokens)`,
      );

      const resolution = JSON.parse(
        response.choices[0]?.message?.content || '{}',
      );
      return this.validateResolution(resolution);
    } catch (error) {
      throw new Error(`OpenAI song resolution failed: ${error}`);
    }
  }

  async generateWeddingPlaylist(preferences: {
    genres?: string[];
    energy?: 'low' | 'medium' | 'high';
    mood?: string;
    occasion?: string;
    excludeExplicit?: boolean;
    guestCount?: number;
    weddingStyle?: string;
  }): Promise<string[]> {
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content:
          'You are a professional wedding music curator with extensive knowledge of music across all genres. Provide song recommendations in the format "Artist - Song Title" only, one per line, no additional text or explanations.',
      },
      {
        role: 'user',
        content: `Please recommend 25 songs for a wedding with these preferences:
- Genres: ${preferences.genres?.join(', ') || 'any'}
- Energy level: ${preferences.energy || 'medium'}
- Mood: ${preferences.mood || 'celebratory'}
- Occasion: ${preferences.occasion || 'reception'}
- Guest count: ${preferences.guestCount || 'not specified'}
- Wedding style: ${preferences.weddingStyle || 'traditional'}
- Explicit content: ${preferences.excludeExplicit ? 'exclude' : 'allow'}

Provide diverse recommendations that would work well for this wedding context. Focus on songs that will get people dancing and create a joyful atmosphere.`,
      },
    ];

    const estimatedInputTokens = Math.ceil(
      messages.map((m) => m.content).join(' ').length / 4,
    );
    const estimatedCost = this.costTracker.estimateCost(
      'gpt-4o-mini',
      estimatedInputTokens,
      1000,
    );

    this.costTracker.checkCostLimits(estimatedCost);

    try {
      const response = await this.httpClient.request<OpenAIChatCompletion>(
        '/chat/completions',
        {
          method: 'POST',
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            max_tokens: 1000,
            temperature: 0.8,
          }),
        },
        OpenAIChatCompletionSchema,
      );

      const actualCost = this.costTracker.recordUsage(
        'gpt-4o-mini',
        response.usage,
      );
      console.log(
        `OpenAI playlist cost: $${actualCost.toFixed(4)} (${response.usage.total_tokens} tokens)`,
      );

      const content = response.choices[0]?.message.content || '';
      return content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line.includes(' - '))
        .slice(0, 25); // Ensure we don't return more than requested
    } catch (error) {
      throw new Error(`OpenAI playlist generation failed: ${error}`);
    }
  }

  async createEmbedding(text: string): Promise<number[]> {
    const estimatedTokens = Math.ceil(text.length / 4);
    const estimatedCost = this.costTracker.estimateCost(
      'text-embedding-3-small',
      estimatedTokens,
    );

    this.costTracker.checkCostLimits(estimatedCost);

    try {
      const response = await this.httpClient.request<OpenAIEmbeddingResponse>(
        '/embeddings',
        {
          method: 'POST',
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text,
          }),
        },
        OpenAIEmbeddingResponseSchema,
      );

      const actualCost = this.costTracker.recordUsage(
        'text-embedding-3-small',
        response.usage,
      );
      console.log(
        `OpenAI embedding cost: $${actualCost.toFixed(4)} (${response.usage.total_tokens} tokens)`,
      );

      return response.data[0]?.embedding || [];
    } catch (error) {
      throw new Error(`OpenAI embedding failed: ${error}`);
    }
  }

  private buildAnalysisPrompt(
    track: MusicTrack,
    context?: WeddingContext,
  ): string {
    return `Analyze the wedding appropriateness of this song:

Song: "${track.title}" by ${track.artist}
Album: ${track.album}
Duration: ${Math.floor(track.duration / 1000 / 60)}:${String(Math.floor(track.duration / 1000) % 60).padStart(2, '0')}
Explicit: ${track.explicit ? 'Yes' : 'No'}
${track.genre ? `Genre: ${track.genre}` : ''}

${
  context
    ? `Wedding Context:
- Wedding Date: ${context.weddingId || 'Not specified'}
- Ceremony: ${context.ceremony ? 'Yes' : 'No'}
- Reception: ${context.reception ? 'Yes' : 'No'}
- Cocktail Hour: ${context.cocktailHour ? 'Yes' : 'No'}
- Religious: ${context.religious ? 'Yes' : 'No'}
- Cultural Traditions: ${context.culturalTraditions?.join(', ') || 'None specified'}`
    : ''
}

Please provide a JSON response with the following structure:
{
  "score": <number 0-100>,
  "recommendation": "<highly_recommended|recommended|caution|not_recommended>",
  "reasons": ["<reason1>", "<reason2>"],
  "tags": ["<tag1>", "<tag2>"],
  "ceremonies": {
    "ceremony": <boolean>,
    "reception": <boolean>,
    "cocktailHour": <boolean>
  }
}

Consider factors like lyrical content, tempo, cultural sensitivity, and wedding appropriateness.`;
  }

  private buildResolutionPrompt(
    request: string,
    context?: RequestContext,
  ): string {
    return `A wedding client is requesting a song but may not have complete or accurate details. Please help identify the most likely songs they're referring to.

Request: "${request}"

${
  context
    ? `Context:
- User ID: ${context.userId || 'Unknown'}
- Wedding ID: ${context.weddingId || 'Unknown'}
- Session: ${context.sessionId || 'Unknown'}`
    : ''
}

Please provide a JSON response with this structure:
{
  "confidence": <number 0-100>,
  "interpretation": "<your interpretation of what they're looking for>",
  "possibleMatches": [
    {
      "artist": "<artist name>",
      "title": "<song title>",
      "album": "<album name if known>",
      "likelihood": <number 0-100>
    }
  ],
  "searchQueries": ["<suggested search query 1>", "<query 2>"]
}

Provide up to 5 possible matches, ranked by likelihood. Consider partial lyrics, movie soundtracks, common wedding songs, and popular music.`;
  }

  private validateAnalysis(analysis: any): AppropriatenessAnalysis {
    try {
      return {
        score: Math.max(0, Math.min(100, analysis.score || 50)),
        reasons: Array.isArray(analysis.reasons) ? analysis.reasons : [],
        recommendation: [
          'highly_recommended',
          'recommended',
          'caution',
          'not_recommended',
        ].includes(analysis.recommendation)
          ? analysis.recommendation
          : 'recommended',
        tags: Array.isArray(analysis.tags) ? analysis.tags : [],
        ceremonies: {
          ceremony: Boolean(analysis.ceremonies?.ceremony),
          reception: Boolean(analysis.ceremonies?.reception),
          cocktailHour: Boolean(analysis.ceremonies?.cocktailHour),
        },
      };
    } catch (error) {
      // Return safe default if validation fails
      return {
        score: 50,
        reasons: ['Analysis validation failed'],
        recommendation: 'caution',
        tags: [],
        ceremonies: {
          ceremony: false,
          reception: true,
          cocktailHour: true,
        },
      };
    }
  }

  private validateResolution(resolution: any): SongResolution {
    try {
      return {
        confidence: Math.max(0, Math.min(100, resolution.confidence || 0)),
        possibleMatches: Array.isArray(resolution.possibleMatches)
          ? resolution.possibleMatches.map((match: any) => ({
              artist: match.artist || 'Unknown Artist',
              title: match.title || 'Unknown Title',
              album: match.album,
              likelihood: Math.max(0, Math.min(100, match.likelihood || 0)),
            }))
          : [],
        interpretation:
          resolution.interpretation || 'Unable to interpret request',
        searchQueries: Array.isArray(resolution.searchQueries)
          ? resolution.searchQueries
          : [],
      };
    } catch (error) {
      // Return safe default if validation fails
      return {
        confidence: 0,
        possibleMatches: [],
        interpretation: 'Resolution validation failed',
        searchQueries: [],
      };
    }
  }

  getCostData(): CostTracker {
    return this.costTracker.getCostData();
  }

  getMetrics() {
    return {
      ...this.httpClient.getMetrics(),
      costData: this.getCostData(),
    };
  }
}
