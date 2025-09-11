# TEAM B - ROUND 1: WS-252 - Music Database Integration
## 2025-08-31 - Development Round 1

**YOUR MISSION:** Build secure API endpoints for multi-provider music search, AI appropriateness analysis, and intelligent song request resolution
**FEATURE ID:** WS-252 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about API security, rate limiting, and AI integration for wedding music intelligence

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/music/
cat $WS_ROOT/wedsync/src/app/api/music/search/route.ts | head -20
ls -la $WS_ROOT/wedsync/src/lib/music/
cat $WS_ROOT/wedsync/src/lib/music/wedding-music-ai.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test api/music
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query API patterns and security implementations
await mcp__serena__search_for_pattern("route.ts POST GET withSecureValidation");
await mcp__serena__find_symbol("withSecureValidation secureStringSchema", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/validation/");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");
```

### B. BACKEND DOCUMENTATION LOADING
```typescript
# Use Ref MCP to search for:
# - "Spotify Web API TypeScript SDK authentication"
# - "Apple Music API JavaScript integration"
# - "OpenAI JSON mode structured responses"
# - "Next.js route handlers streaming responses"
# - "Supabase database functions RLS policies"
# - "Rate limiting strategies for external APIs"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX API ARCHITECTURE

### Backend-Specific Sequential Thinking for Music Database APIs

```typescript
// Complex music API architecture analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Music Database APIs need: /api/music/search (multi-provider search), /api/music/analyze-appropriateness (AI wedding analysis), /api/music/resolve-request (vague query resolution), /api/music/playlist/generate (AI playlist creation). Each handles different data types, external API calls, and AI processing.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security analysis critical: Music search handles user queries (XSS risk), external API keys need protection, AI analysis processes song metadata (content validation), playlist generation involves personal wedding data. Need authentication, input validation with Zod, API key management, rate limiting for external calls.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Rate limiting complexity: Spotify API allows 100 req/hour, Apple Music has different limits, OpenAI has token limits, user searches can trigger multiple API calls. Need smart caching, request batching, provider failover, and user-specific rate limiting to prevent abuse.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Database design requirements: music_tracks_cache (deduplicated tracks from all providers), song_requests (vague query resolution history), wedding_music_preferences (couple preferences), song_appropriateness_analysis (AI flagged content), music_api_usage (rate limit tracking). All need proper indexes and RLS policies.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Create secure API middleware first, implement provider clients with error handling, build AI analysis service with caching, create database operations with proper validation, add comprehensive error handling and logging, implement rate limiting and circuit breakers.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive music API requirements:

1. **task-tracker-coordinator** --api-security-focus --external-integration --rate-limiting
   - Mission: Track API endpoint development, monitor security implementation
   
2. **security-compliance-officer** --api-security-audit --input-validation --key-management
   - Mission: Ensure all endpoints use withSecureValidation, protect API keys
   
3. **code-quality-guardian** --api-consistency --error-handling --typescript-strict
   - Mission: Maintain consistent API patterns, proper error responses
   
4. **test-automation-architect** --api-testing --integration-testing --security-testing
   - Mission: Write comprehensive API tests including security scenarios
   
5. **integration-specialist** --external-apis --rate-limiting --failure-handling
   - Mission: Handle Spotify/Apple Music/OpenAI API integration complexities
   
6. **documentation-chronicler** --api-documentation --security-patterns --integration-guides
   - Mission: Document API endpoints with security patterns and usage examples

## 🔒 MANDATORY SECURITY IMPLEMENTATION PATTERNS

### EVERY API ROUTE MUST FOLLOW THIS PATTERN:

```typescript
// File: $WS_ROOT/wedsync/src/app/api/music/search/route.ts
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { secureStringSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';
import { getServerSession } from 'next-auth';
import { authOptions } from '$WS_ROOT/wedsync/src/lib/auth/options';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';

const musicSearchSchema = z.object({
  query: secureStringSchema.min(1).max(200),
  providers: z.array(z.enum(['spotify', 'apple', 'youtube'])).optional().default(['spotify']),
  limit: z.number().min(1).max(50).optional().default(20),
  wedding_context: z.object({
    category: z.enum(['ceremony', 'cocktail', 'dinner', 'dancing']).optional(),
    guest_demographics: z.object({
      age_range: z.string().optional(),
      cultural_background: z.array(z.string()).optional()
    }).optional()
  }).optional()
});

export const POST = withSecureValidation(
  musicSearchSchema,
  async (request, validatedData) => {
    // Check authentication for protected features
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Apply rate limiting (5 searches per minute per user)
    const rateLimitResult = await rateLimitService.checkRateLimit(
      request, 
      `music_search:${session.user.id}`,
      5, // requests
      60 // seconds
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded', 
        retry_after: rateLimitResult.retryAfter 
      }, { status: 429 });
    }
    
    try {
      // Use validated, type-safe data
      const musicService = new MusicDatabaseService();
      const results = await musicService.searchWithWeddingIntelligence(
        validatedData.query,
        validatedData.providers,
        validatedData.wedding_context
      );
      
      return NextResponse.json({
        success: true,
        ...results
      });
      
    } catch (error) {
      // Don't leak internal errors to client
      console.error('Music search error:', error);
      
      if (error.message.includes('API_LIMIT_EXCEEDED')) {
        return NextResponse.json({ 
          error: 'Music service temporarily unavailable' 
        }, { status: 503 });
      }
      
      return NextResponse.json({ 
        error: 'Search failed' 
      }, { status: 500 });
    }
  }
);
```

## 🎯 TECHNICAL SPECIFICATION - API ENDPOINTS TO BUILD

### 1. Music Search API
**Endpoint:** `POST /api/music/search`
```typescript
// Request validation schema (already shown above)
// Response: Multi-provider search results with wedding intelligence
```

### 2. Wedding Appropriateness Analysis API
**Endpoint:** `POST /api/music/analyze-appropriateness`
```typescript
const appropriatenessSchema = z.object({
  track: z.object({
    title: secureStringSchema.max(200),
    artist: secureStringSchema.max(200),
    external_id: z.string().optional(),
    provider: z.enum(['spotify', 'apple', 'youtube', 'manual']).optional()
  }),
  wedding_context: z.object({
    cultural_considerations: z.array(secureStringSchema).max(10).optional(),
    guest_age_range: z.enum(['20s', '30s', '40s', '50+', 'mixed']).optional(),
    venue_type: z.enum(['church', 'outdoor', 'ballroom', 'beach', 'other']).optional()
  }).optional()
});

// Implementation: AI analysis with caching and confidence scoring
```

### 3. Song Request Resolution API
**Endpoint:** `POST /api/music/resolve-request`
```typescript
const songRequestSchema = z.object({
  original_request: secureStringSchema.min(3).max(500),
  wedding_id: z.string().uuid().optional(),
  context_clues: z.array(secureStringSchema).max(10).optional()
});

// Implementation: AI-powered vague query resolution
```

### 4. Playlist Generation API
**Endpoint:** `POST /api/music/playlist/generate`
```typescript
const playlistGenerationSchema = z.object({
  wedding_id: z.string().uuid(),
  preferences: z.object({
    genres: z.array(secureStringSchema).max(20),
    energy_flow: z.enum(['gradual', 'mixed', 'high_energy']),
    must_include: z.array(z.string()).max(50), // Track IDs
    avoid: z.array(z.string()).max(100), // Track IDs or categories
    guest_demographics: z.object({
      age_range: secureStringSchema,
      cultural_background: z.array(secureStringSchema).max(10).optional(),
      musical_preferences: z.array(secureStringSchema).max(20).optional()
    })
  }),
  timeline: z.object({
    ceremony: z.object({ duration_minutes: z.number().min(5).max(180) }).optional(),
    cocktail: z.object({ duration_minutes: z.number().min(15).max(300) }).optional(),
    dinner: z.object({ duration_minutes: z.number().min(30).max(480) }).optional(),
    dancing: z.object({ duration_minutes: z.number().min(60).max(600) }).optional()
  })
});

// Implementation: AI-powered playlist generation with timeline optimization
```

## 🗄️ DATABASE MIGRATION REQUIREMENTS

**⚠️ CRITICAL: Create migration files for SQL Expert, DO NOT apply directly**

### Migration Files to Create:
```sql
-- File: $WS_ROOT/wedsync/supabase/migrations/[TIMESTAMP]_music_database_tables.sql

-- Music tracks cache from external providers
CREATE TABLE IF NOT EXISTS music_tracks_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('spotify', 'apple', 'youtube', 'manual')),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration_ms INTEGER,
  explicit BOOLEAN DEFAULT false,
  preview_url TEXT,
  external_url TEXT,
  popularity INTEGER,
  release_date DATE,
  genre TEXT[],
  tempo INTEGER,
  energy_level DECIMAL(3,2) CHECK (energy_level >= 0 AND energy_level <= 1),
  wedding_categories JSONB DEFAULT '[]'::jsonb,
  appropriateness_score DECIMAL(3,2) CHECK (appropriateness_score >= 0 AND appropriateness_score <= 1),
  ai_analysis_notes TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(provider, external_id)
);

-- Song requests with AI matching
CREATE TABLE IF NOT EXISTS song_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  original_request TEXT NOT NULL,
  normalized_request TEXT,
  matched_track_id UUID REFERENCES music_tracks_cache(id),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  match_method TEXT CHECK (match_method IN ('direct', 'ai_assisted', 'manual')),
  approved BOOLEAN DEFAULT NULL,
  rejection_reason TEXT,
  category_suggestion TEXT,
  notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- AI appropriateness analysis results
CREATE TABLE IF NOT EXISTS song_appropriateness_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES music_tracks_cache(id) ON DELETE CASCADE,
  reason_category TEXT NOT NULL CHECK (reason_category IN ('explicit', 'breakup', 'death', 'violence', 'inappropriate', 'cultural')),
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  analysis_details JSONB,
  flagged_lyrics TEXT[],
  alternative_suggestions UUID[],
  human_verified BOOLEAN DEFAULT false,
  human_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  
  UNIQUE(track_id, reason_category)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tracks_cache_search ON music_tracks_cache USING GIN ((lower(title) || ' ' || lower(artist)));
CREATE INDEX IF NOT EXISTS idx_tracks_wedding_categories ON music_tracks_cache USING GIN (wedding_categories);
CREATE INDEX IF NOT EXISTS idx_tracks_appropriateness ON music_tracks_cache(appropriateness_score DESC) WHERE appropriateness_score IS NOT NULL;

-- Row Level Security policies
ALTER TABLE music_tracks_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_appropriateness_analysis ENABLE ROW LEVEL SECURITY;

-- Suppliers can access cached tracks for their searches
CREATE POLICY "Suppliers can view music tracks cache" ON music_tracks_cache
  FOR SELECT TO authenticated
  USING (true); -- Public read access for cached music data

-- Suppliers can only manage their own song requests
CREATE POLICY "Suppliers manage own song requests" ON song_requests
  FOR ALL TO authenticated
  USING (auth.uid() = supplier_id);

-- Appropriateness analysis is publicly readable but only system-writable
CREATE POLICY "Public read access to appropriateness analysis" ON song_appropriateness_analysis
  FOR SELECT TO authenticated
  USING (true);
```

## 🎵 CORE SERVICE IMPLEMENTATIONS

### 1. MusicDatabaseService
```typescript
// File: $WS_ROOT/wedsync/src/lib/music/spotify-provider.ts
export class SpotifyMusicProvider {
  private spotify: SpotifyApi;
  private rateLimiter: RateLimiter;

  constructor() {
    this.spotify = SpotifyApi.withClientCredentials(
      process.env.SPOTIFY_CLIENT_ID!,
      process.env.SPOTIFY_CLIENT_SECRET!
    );
    
    this.rateLimiter = new RateLimiter({
      requests: 100,
      window: 3600000 // 1 hour
    });
  }

  async search(query: string, limit: number = 20): Promise<Track[]> {
    if (!this.rateLimiter.canMakeRequest()) {
      throw new Error('SPOTIFY_RATE_LIMIT_EXCEEDED');
    }

    try {
      const results = await this.spotify.search(query, ['track'], 'US', limit);
      
      return results.tracks.items.map(track => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        duration_ms: track.duration_ms,
        explicit: track.explicit,
        preview_url: track.preview_url,
        external_url: track.external_urls.spotify,
        provider: 'spotify',
        popularity: track.popularity,
        release_date: track.album.release_date,
        image_url: track.album.images[0]?.url
      }));
      
    } catch (error) {
      if (error.status === 429) {
        throw new Error('SPOTIFY_RATE_LIMIT_EXCEEDED');
      }
      throw new Error(`SPOTIFY_SEARCH_FAILED: ${error.message}`);
    }
  }
}
```

### 2. Wedding Music AI Service
```typescript
// File: $WS_ROOT/wedsync/src/lib/music/wedding-music-ai.ts
export class WeddingMusicAI {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async analyzeWeddingAppropriateness(
    track: Track, 
    context?: WeddingContext
  ): Promise<AppropriatenessAnalysis> {
    // Check cache first
    const cached = await this.getCachedAnalysis(track);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const analysis = await this.performAIAnalysis(track, context);
    await this.cacheAnalysis(track, analysis);
    
    return analysis;
  }

  private async performAIAnalysis(track: Track, context?: WeddingContext): Promise<AppropriatenessAnalysis> {
    const prompt = `Analyze this song for wedding appropriateness:

Title: "${track.title}"
Artist: ${track.artist}
Album: ${track.album}
Explicit: ${track.explicit}
${context ? `Wedding Context: ${JSON.stringify(context)}` : ''}

Analyze for:
1. WEDDING CATEGORIES: ceremony_processional, ceremony_recessional, cocktail_hour, dinner, first_dance, reception_dancing
2. APPROPRIATENESS SCORE (0.0-1.0): 1.0=perfect, 0.8-0.9=great, 0.6-0.7=questionable, 0.3-0.5=inappropriate, 0.0-0.2=definitely inappropriate
3. POTENTIAL ISSUES: explicit language, sad/breakup themes, death/violence, cultural insensitivity, age appropriateness
4. REASONING: Brief explanation

Return JSON: {categories: string[], score: number, issues: string[], reasoning: string, energy_level: number}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a professional wedding music consultant with expertise in appropriate music selection for diverse wedding celebrations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 500
    });

    return JSON.parse(response.choices[0]?.message?.content || '{}');
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] All 4 secure API endpoints implemented with withSecureValidation
- [ ] Multi-provider music search service (Spotify + Apple Music)
- [ ] AI wedding appropriateness analysis service with caching
- [ ] Song request resolution service using AI interpretation
- [ ] Database migration files created (sent to SQL Expert)
- [ ] Rate limiting implemented for all external API calls
- [ ] Comprehensive error handling and logging
- [ ] API documentation with OpenAPI/Swagger specs
- [ ] Unit tests for all services (>80% coverage)
- [ ] Integration tests for external API connections

## 💾 WHERE TO SAVE YOUR WORK

- **API Routes**: `$WS_ROOT/wedsync/src/app/api/music/`
  - `search/route.ts`
  - `analyze-appropriateness/route.ts` 
  - `resolve-request/route.ts`
  - `playlist/generate/route.ts`
- **Services**: `$WS_ROOT/wedsync/src/lib/music/`
  - `spotify-provider.ts`
  - `apple-music-provider.ts`
  - `wedding-music-ai.ts`
  - `song-request-processor.ts`
  - `playlist-generator.ts`
- **Types**: `$WS_ROOT/wedsync/src/types/music.ts`
- **Tests**: `$WS_ROOT/wedsync/tests/api/music/`
- **Migrations**: `$WS_ROOT/wedsync/supabase/migrations/`

## 🏁 COMPLETION CHECKLIST

### Security Verification:
- [ ] NO direct `request.json()` without validation 
- [ ] ALL strings use secureStringSchema
- [ ] ALL routes have withSecureValidation middleware
- [ ] Authentication checks on protected endpoints
- [ ] Rate limiting applied appropriately
- [ ] API keys properly secured in environment variables
- [ ] Error messages don't leak sensitive information

### API Quality:
- [ ] Consistent error response format across all endpoints
- [ ] Proper HTTP status codes used
- [ ] Request/response TypeScript interfaces defined
- [ ] OpenAPI documentation generated
- [ ] Performance monitoring implemented

### Integration Readiness:
- [ ] APIs ready for Team A frontend integration
- [ ] Prepared for Team C external service connections
- [ ] Database schema ready for SQL Expert migration
- [ ] Service interfaces defined for Team D platform features

---

**EXECUTE IMMEDIATELY - This is a comprehensive backend prompt with full security requirements!**