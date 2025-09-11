import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { MusicIntegrationService } from '@/lib/integrations/music-integration-service';

const SearchRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
  services: z.array(z.enum(['spotify', 'apple'])).default(['spotify']),
  market: z.string().optional(),
});

// Global service instance with connection pooling
let musicService: MusicIntegrationService | null = null;

function getMusicService(): MusicIntegrationService {
  if (!musicService) {
    const config: any = {};

    // Spotify configuration
    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
      config.spotify = {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri: process.env.SPOTIFY_REDIRECT_URI,
      };
    }

    // Apple Music configuration
    if (
      process.env.APPLE_MUSIC_TEAM_ID &&
      process.env.APPLE_MUSIC_KEY_ID &&
      process.env.APPLE_MUSIC_PRIVATE_KEY
    ) {
      config.appleMusic = {
        teamId: process.env.APPLE_MUSIC_TEAM_ID,
        keyId: process.env.APPLE_MUSIC_KEY_ID,
        privateKey: process.env.APPLE_MUSIC_PRIVATE_KEY,
        storefront: process.env.APPLE_MUSIC_STOREFRONT,
      };
    }

    // OpenAI configuration
    if (process.env.OPENAI_API_KEY) {
      config.openAI = {
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORGANIZATION,
        maxTokensPerRequest: parseInt(
          process.env.OPENAI_MAX_TOKENS_PER_REQUEST || '4000',
        ),
        maxCostPerRequest: parseFloat(
          process.env.OPENAI_MAX_COST_PER_REQUEST || '0.10',
        ),
        dailyCostLimit: parseFloat(
          process.env.OPENAI_DAILY_COST_LIMIT || '10.00',
        ),
      };
    }

    musicService = new MusicIntegrationService(config);
  }
  return musicService;
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check - CRITICAL SECURITY FIX
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const requestData = {
      query: searchParams.get('query'),
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 20,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0,
      services: searchParams.get('services')?.split(',') || ['spotify'],
      market: searchParams.get('market') || undefined,
    };

    const validatedData = SearchRequestSchema.parse(requestData);
    const service = getMusicService();

    const tracks = await service.searchTracks(validatedData);

    return NextResponse.json({
      success: true,
      data: tracks,
      meta: {
        query: validatedData.query,
        limit: validatedData.limit,
        offset: validatedData.offset,
        services: validatedData.services,
        total: tracks.length,
      },
    });
  } catch (error) {
    console.error('Music search error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Music search failed',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check - CRITICAL SECURITY FIX
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = SearchRequestSchema.parse(body);
    const service = getMusicService();

    const tracks = await service.searchTracks(validatedData);

    return NextResponse.json({
      success: true,
      data: tracks,
      meta: {
        query: validatedData.query,
        limit: validatedData.limit,
        offset: validatedData.offset,
        services: validatedData.services,
        total: tracks.length,
      },
    });
  } catch (error) {
    console.error('Music search error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Music search failed',
      },
      { status: 500 },
    );
  }
}
