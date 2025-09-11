# TEAM C - ROUND 1: WS-252 - Music Database Integration
## 2025-08-31 - Development Round 1

**YOUR MISSION:** Build robust integrations with Spotify, Apple Music, OpenAI APIs, and real-time playlist synchronization systems
**FEATURE ID:** WS-252 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about API failure scenarios, rate limiting strategies, and real-time data synchronization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/music/
cat $WS_ROOT/wedsync/src/lib/integrations/music/spotify-client.ts | head -20
ls -la $WS_ROOT/wedsync/src/lib/integrations/ai/
cat $WS_ROOT/wedsync/src/lib/integrations/ai/openai-music-analyzer.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test integrations/music
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

// Query integration patterns and external service handling
await mcp__serena__search_for_pattern("integration webhook external service api");
await mcp__serena__find_symbol("fetch axios client provider", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");
await mcp__serena__search_for_pattern("rate limit retry circuit breaker");
```

### B. INTEGRATION DOCUMENTATION LOADING
```typescript
# Use Ref MCP to search for:
# - "Spotify Web API authentication scopes webhooks"
# - "Apple Music API MusicKit JavaScript"
# - "OpenAI API rate limiting best practices"
# - "Supabase realtime subscriptions broadcast"
# - "Next.js server-sent events streaming"
# - "Circuit breaker pattern Node.js"
# - "Exponential backoff retry strategies"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX INTEGRATION ARCHITECTURE

### Integration-Specific Sequential Thinking for Music Database

```typescript
// Complex multi-system integration analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Music Database integrations require: Spotify Web API (search, track details, playlist export), Apple Music API (parallel search, metadata), OpenAI API (appropriateness analysis, song request resolution), Supabase Realtime (live playlist updates), webhook handlers (external playlist changes). Each has different auth, rate limits, and failure modes.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration complexity analysis: Spotify needs OAuth for user playlists, Apple Music requires MusicKit setup, OpenAI has token limits and costs, realtime updates need connection management. Failures can cascade - if Spotify fails, search should fallback to Apple Music, if OpenAI fails, use cached appropriateness scores.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Rate limiting coordination: Spotify allows 100/hour per app, Apple Music has request quotas, OpenAI charges per token. Need intelligent request batching, response caching, user-based throttling, and provider rotation to maximize throughput while staying within limits.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Real-time sync challenges: When DJ updates playlist, couples need instant updates on WedMe app, other vendors need notifications of music changes, external playlist platforms need sync. Need event-driven architecture with reliable message delivery, conflict resolution for simultaneous edits.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Build resilient HTTP clients with retry logic, implement circuit breaker pattern for failing services, create event-driven playlist sync, design graceful degradation when external services fail, add comprehensive monitoring and alerting for integration health.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive integration requirements:

1. **task-tracker-coordinator** --integration-focus --external-services --failure-handling
   - Mission: Track integration development, monitor external service dependencies
   
2. **integration-specialist** --api-clients --rate-limiting --circuit-breakers
   - Mission: Build resilient external service clients with proper error handling
   
3. **security-compliance-officer** --api-security --webhook-validation --key-management  
   - Mission: Secure external API connections, validate webhook payloads
   
4. **code-quality-guardian** --integration-patterns --error-handling --monitoring
   - Mission: Ensure consistent integration patterns and comprehensive monitoring
   
5. **test-automation-architect** --integration-testing --mock-services --failure-scenarios
   - Mission: Test integration resilience with mock services and failure injection
   
6. **documentation-chronicler** --integration-docs --failure-scenarios --monitoring-guides
   - Mission: Document integration patterns, failure handling, and monitoring setup

## 🎯 TECHNICAL SPECIFICATION - INTEGRATIONS TO BUILD

### 1. Spotify Web API Integration

```typescript
// File: $WS_ROOT/wedsync/src/lib/integrations/music/spotify-client.ts
export class SpotifyClient {
  private client: SpotifyApi;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;
  private cache: Cache;

  constructor() {
    this.client = SpotifyApi.withClientCredentials(
      process.env.SPOTIFY_CLIENT_ID!,
      process.env.SPOTIFY_CLIENT_SECRET!
    );
    
    this.rateLimiter = new RateLimiter({
      requests: 95, // Leave buffer under 100/hour limit
      window: 3600000, // 1 hour
      identifier: 'spotify-api'
    });
    
    this.circuitBreaker = new CircuitBreaker(this.makeRequest.bind(this), {
      timeout: 10000, // 10 second timeout
      errorThresholdPercentage: 50,
      resetTimeout: 30000 // 30 second reset
    });
    
    this.cache = new Cache({ ttl: 300000 }); // 5 minute cache
  }

  async searchTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
    // Check cache first
    const cacheKey = `spotify:search:${query}:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Check rate limits
    if (!await this.rateLimiter.canMakeRequest()) {
      throw new IntegrationError(
        'SPOTIFY_RATE_LIMIT_EXCEEDED', 
        'Spotify API rate limit exceeded',
        { retryAfter: this.rateLimiter.getResetTime() }
      );
    }

    try {
      const result = await this.circuitBreaker.fire(async () => {
        const response = await this.client.search(query, ['track'], 'US', limit);
        return this.transformSpotifyTracks(response.tracks.items);
      });

      // Cache successful results
      await this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      if (error.status === 429) {
        throw new IntegrationError('SPOTIFY_RATE_LIMIT', 'Rate limit exceeded');
      } else if (error.status >= 500) {
        throw new IntegrationError('SPOTIFY_SERVER_ERROR', 'Spotify server error');
      }
      throw new IntegrationError('SPOTIFY_SEARCH_FAILED', error.message);
    }
  }

  async createPlaylist(userId: string, name: string, tracks: string[]): Promise<string> {
    // Requires user OAuth - implement OAuth flow
    if (!this.client.getAccessToken()) {
      throw new IntegrationError('SPOTIFY_AUTH_REQUIRED', 'User authentication required for playlist creation');
    }

    try {
      // Create playlist
      const playlist = await this.client.playlists.createPlaylist(userId, {
        name,
        description: 'Created by WedSync AI Music Database',
        public: false
      });

      // Add tracks in batches (Spotify allows max 100 per request)
      const batchSize = 100;
      for (let i = 0; i < tracks.length; i += batchSize) {
        const batch = tracks.slice(i, i + batchSize);
        const spotifyUris = batch.map(id => `spotify:track:${id}`);
        
        await this.client.playlists.addItemsToPlaylist(
          playlist.id, 
          spotifyUris
        );
        
        // Respect rate limits between batches
        await this.sleep(100);
      }

      return playlist.external_urls.spotify;

    } catch (error) {
      throw new IntegrationError('SPOTIFY_PLAYLIST_CREATION_FAILED', error.message);
    }
  }

  private transformSpotifyTracks(tracks: SpotifyTrack[]): Track[] {
    return tracks.map(track => ({
      external_id: track.id,
      provider: 'spotify',
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      duration_ms: track.duration_ms,
      explicit: track.explicit,
      preview_url: track.preview_url,
      external_url: track.external_urls.spotify,
      popularity: track.popularity,
      release_date: track.album.release_date,
      image_url: track.album.images[0]?.url
    }));
  }
}
```

### 2. Apple Music API Integration

```typescript
// File: $WS_ROOT/wedsync/src/lib/integrations/music/apple-music-client.ts
export class AppleMusicClient {
  private jwt: string;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.jwt = this.generateJWT();
    this.rateLimiter = new RateLimiter({
      requests: 1000, // Apple Music allows more requests
      window: 3600000, // 1 hour
      identifier: 'apple-music-api'
    });
    
    this.circuitBreaker = new CircuitBreaker(this.makeRequest.bind(this), {
      timeout: 15000,
      errorThresholdPercentage: 40,
      resetTimeout: 45000
    });
  }

  private generateJWT(): string {
    const payload = {
      iss: process.env.APPLE_MUSIC_TEAM_ID,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60) // 6 months
    };

    return jwt.sign(payload, process.env.APPLE_MUSIC_PRIVATE_KEY!, {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: process.env.APPLE_MUSIC_KEY_ID
      }
    });
  }

  async searchTracks(query: string, limit: number = 20): Promise<Track[]> {
    if (!await this.rateLimiter.canMakeRequest()) {
      throw new IntegrationError('APPLE_MUSIC_RATE_LIMIT_EXCEEDED', 'Apple Music API rate limit exceeded');
    }

    try {
      const result = await this.circuitBreaker.fire(async () => {
        const response = await fetch(
          `https://api.music.apple.com/v1/catalog/us/search?term=${encodeURIComponent(query)}&types=songs&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${this.jwt}`,
              'User-Agent': 'WedSync/1.0'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Apple Music API error: ${response.status}`);
        }

        const data = await response.json();
        return this.transformAppleMusicTracks(data.results.songs?.data || []);
      });

      return result;

    } catch (error) {
      throw new IntegrationError('APPLE_MUSIC_SEARCH_FAILED', error.message);
    }
  }

  private transformAppleMusicTracks(tracks: AppleMusicTrack[]): Track[] {
    return tracks.map(track => ({
      external_id: track.id,
      provider: 'apple',
      title: track.attributes.name,
      artist: track.attributes.artistName,
      album: track.attributes.albumName,
      duration_ms: track.attributes.durationInMillis,
      explicit: track.attributes.contentRating === 'explicit',
      preview_url: track.attributes.previews?.[0]?.url,
      external_url: track.attributes.url,
      popularity: null, // Apple Music doesn't provide popularity scores
      release_date: track.attributes.releaseDate,
      image_url: track.attributes.artwork?.url?.replace('{w}', '400').replace('{h}', '400')
    }));
  }
}
```

### 3. OpenAI Integration for Music Analysis

```typescript
// File: $WS_ROOT/wedsync/src/lib/integrations/ai/openai-music-analyzer.ts
export class OpenAIMusicAnalyzer {
  private openai: OpenAI;
  private tokenTracker: TokenUsageTracker;
  private rateLimiter: RateLimiter;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000 // 30 second timeout
    });

    this.tokenTracker = new TokenUsageTracker({
      dailyLimit: 100000, // 100k tokens per day
      costLimit: 50 // $50 per day
    });

    this.rateLimiter = new RateLimiter({
      requests: 50, // Conservative limit for GPT-3.5
      window: 60000, // 1 minute
      identifier: 'openai-api'
    });
  }

  async analyzeWeddingAppropriateness(
    track: Track, 
    context?: WeddingContext
  ): Promise<AppropriatenessAnalysis> {
    // Check daily usage limits
    if (!await this.tokenTracker.canMakeRequest()) {
      throw new IntegrationError(
        'OPENAI_DAILY_LIMIT_EXCEEDED', 
        'Daily OpenAI usage limit exceeded'
      );
    }

    // Check rate limits
    if (!await this.rateLimiter.canMakeRequest()) {
      throw new IntegrationError(
        'OPENAI_RATE_LIMIT_EXCEEDED', 
        'OpenAI rate limit exceeded'
      );
    }

    try {
      const prompt = this.buildAnalysisPrompt(track, context);
      
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

      // Track token usage
      await this.tokenTracker.recordUsage(response.usage);

      const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');
      return this.validateAnalysis(analysis);

    } catch (error) {
      if (error.status === 429) {
        throw new IntegrationError('OPENAI_RATE_LIMIT', 'OpenAI rate limit exceeded');
      } else if (error.type === 'insufficient_quota') {
        throw new IntegrationError('OPENAI_QUOTA_EXCEEDED', 'OpenAI quota exceeded');
      }
      throw new IntegrationError('OPENAI_ANALYSIS_FAILED', error.message);
    }
  }

  async resolveSongRequest(
    request: string, 
    context?: RequestContext
  ): Promise<SongResolution> {
    const prompt = this.buildResolutionPrompt(request, context);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4', // Use GPT-4 for better interpretation
        messages: [
          {
            role: 'system',
            content: 'You are an expert wedding DJ with deep knowledge of popular wedding music, movie soundtracks, and song identification from partial descriptions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 800
      });

      await this.tokenTracker.recordUsage(response.usage);
      
      const resolution = JSON.parse(response.choices[0]?.message?.content || '{}');
      return this.validateResolution(resolution);

    } catch (error) {
      throw new IntegrationError('OPENAI_SONG_RESOLUTION_FAILED', error.message);
    }
  }
}
```

### 4. Real-time Playlist Synchronization

```typescript
// File: $WS_ROOT/wedsync/src/lib/integrations/realtime/playlist-sync.ts
export class PlaylistSyncService {
  private supabase: SupabaseClient;
  private eventBus: EventBus;

  constructor() {
    this.supabase = createSupabaseServiceClient();
    this.eventBus = new EventBus();
  }

  async initializePlaylistSync(weddingId: string): Promise<void> {
    // Subscribe to playlist changes
    const channel = this.supabase
      .channel(`playlist_sync:${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wedding_playlists',
          filter: `wedding_id=eq.${weddingId}`
        },
        (payload) => this.handlePlaylistChange(payload)
      )
      .on(
        'broadcast',
        { event: 'playlist_update' },
        (payload) => this.handleBroadcastUpdate(payload)
      )
      .subscribe();

    // Track active connections for this wedding
    await this.supabase
      .from('playlist_sync_sessions')
      .upsert({
        wedding_id: weddingId,
        channel_name: channel.topic,
        connected_at: new Date().toISOString()
      });
  }

  async broadcastPlaylistUpdate(
    weddingId: string, 
    update: PlaylistUpdate
  ): Promise<void> {
    const channel = this.supabase.channel(`playlist_sync:${weddingId}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'playlist_update',
      payload: {
        type: update.type, // 'track_added', 'track_removed', 'reordered'
        playlist_id: update.playlist_id,
        changes: update.changes,
        updated_by: update.user_id,
        timestamp: new Date().toISOString()
      }
    });

    // Also trigger webhook notifications
    await this.triggerWebhookNotifications(weddingId, update);
  }

  private async handlePlaylistChange(payload: any): Promise<void> {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    // Process different types of changes
    switch (eventType) {
      case 'INSERT':
        await this.handlePlaylistCreation(newRecord);
        break;
      case 'UPDATE':
        await this.handlePlaylistModification(newRecord, oldRecord);
        break;
      case 'DELETE':
        await this.handlePlaylistDeletion(oldRecord);
        break;
    }
  }

  private async triggerWebhookNotifications(
    weddingId: string, 
    update: PlaylistUpdate
  ): Promise<void> {
    // Get all webhook subscriptions for this wedding
    const { data: webhooks } = await this.supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('event_type', 'playlist.updated')
      .eq('active', true);

    // Send notifications in parallel
    const notifications = (webhooks || []).map(webhook => 
      this.sendWebhookNotification(webhook, update)
    );

    await Promise.allSettled(notifications);
  }

  private async sendWebhookNotification(
    webhook: WebhookSubscription, 
    update: PlaylistUpdate
  ): Promise<void> {
    try {
      const payload = {
        event: 'playlist.updated',
        data: update,
        timestamp: new Date().toISOString(),
        webhook_id: webhook.id
      };

      const signature = this.generateWebhookSignature(payload, webhook.secret);

      await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WedSync-Signature': signature,
          'X-WedSync-Event': 'playlist.updated'
        },
        body: JSON.stringify(payload)
      });

    } catch (error) {
      console.error('Webhook notification failed:', error);
      // Log failed webhook delivery for retry
      await this.logFailedWebhook(webhook.id, error);
    }
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] Resilient Spotify Web API client with OAuth flow
- [ ] Apple Music API client with JWT authentication
- [ ] OpenAI integration for appropriateness analysis and song resolution
- [ ] Real-time playlist synchronization using Supabase Realtime
- [ ] Webhook notification system for external integrations
- [ ] Circuit breaker pattern for all external services
- [ ] Comprehensive rate limiting across all APIs
- [ ] Token usage tracking and cost monitoring (OpenAI)
- [ ] Integration health monitoring and alerting
- [ ] Graceful degradation when services fail
- [ ] Integration test suite with mock services
- [ ] Error handling and retry mechanisms

## 💾 WHERE TO SAVE YOUR WORK

- **API Clients**: `$WS_ROOT/wedsync/src/lib/integrations/music/`
  - `spotify-client.ts`
  - `apple-music-client.ts`
  - `integration-error.ts`
  - `rate-limiter.ts`
  - `circuit-breaker.ts`
- **AI Integration**: `$WS_ROOT/wedsync/src/lib/integrations/ai/`
  - `openai-music-analyzer.ts`
  - `token-usage-tracker.ts`
- **Real-time Sync**: `$WS_ROOT/wedsync/src/lib/integrations/realtime/`
  - `playlist-sync.ts`
  - `webhook-handler.ts`
- **Utilities**: `$WS_ROOT/wedsync/src/lib/integrations/utils/`
  - `cache.ts`
  - `retry.ts`
  - `monitoring.ts`
- **Types**: `$WS_ROOT/wedsync/src/types/integrations.ts`
- **Tests**: `$WS_ROOT/wedsync/tests/integrations/music/`

## 🏁 COMPLETION CHECKLIST

### Integration Resilience:
- [ ] Circuit breakers implemented for all external services
- [ ] Exponential backoff retry logic for transient failures
- [ ] Graceful degradation when services are unavailable
- [ ] Rate limiting respects all external service limits
- [ ] Proper error classification and handling
- [ ] Integration health monitoring implemented

### Real-time Features:
- [ ] Supabase Realtime subscriptions working
- [ ] Playlist changes broadcast in real-time
- [ ] Webhook notifications for external systems
- [ ] Connection management for long-lived subscriptions
- [ ] Conflict resolution for simultaneous edits

### Security & Compliance:
- [ ] API keys properly secured and rotated
- [ ] OAuth flows implemented securely
- [ ] Webhook signature validation
- [ ] Input validation for all external data
- [ ] Audit logging for all integration events

### Performance & Monitoring:
- [ ] Response time monitoring for all APIs
- [ ] Cost tracking for OpenAI usage
- [ ] Cache hit rate monitoring
- [ ] Integration uptime tracking
- [ ] Alert thresholds configured

---

**EXECUTE IMMEDIATELY - This is a comprehensive integration prompt with full resilience requirements!**