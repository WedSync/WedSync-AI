# 02-music-database.md

# Music Database AI Integration

## What to Build

Comprehensive music database integration with Spotify, Apple Music, and wedding-specific song intelligence for DJs and live musicians.

## Key Technical Requirements

### Multi-Platform Music API Integration

```
interface MusicProvider {
  search(query: string): Promise<Track[]>
  getTrack(id: string): Promise<Track>
  getArtistTopTracks(artistId: string): Promise<Track[]>
  createPlaylist(name: string, tracks: string[]): Promise<Playlist>
}

class SpotifyProvider implements MusicProvider {
  private client: SpotifyWebApi
  
  constructor(clientId: string, clientSecret: string) {
    this.client = new SpotifyWebApi({
      clientId,
      clientSecret
    })
  }
  
  async search(query: string): Promise<Track[]> {
    const results = await this.client.searchTracks(query, { limit: 50 })
    
    return [results.body.tracks.items.map](http://results.body.tracks.items.map)(track => ({
      id: [track.id](http://track.id),
      name: [track.name](http://track.name),
      artist: track.artists[0].name,
      album: [track.album.name](http://track.album.name),
      duration: track.duration_ms,
      explicit: track.explicit,
      popularity: track.popularity,
      preview_url: track.preview_url,
      external_url: track.external_urls.spotify,
      release_date: track.album.release_date
    }))
  }
}

class AppleMusicProvider implements MusicProvider {
  private client: AppleMusic
  
  async search(query: string): Promise<Track[]> {
    const results = await [this.client.api.music](http://this.client.api.music)('/v1/catalog/us/search', {
      term: query,
      types: 'songs',
      limit: 50
    })
    
    return [results.data.results.songs.data.map](http://results.data.results.songs.data.map)(song => ({
      id: [song.id](http://song.id),
      name: [song.attributes.name](http://song.attributes.name),
      artist: song.attributes.artistName,
      album: song.attributes.albumName,
      duration: song.attributes.durationInMillis,
      explicit: song.attributes.contentRating === 'explicit',
      preview_url: song.attributes.previews?.[0]?.url,
      external_url: song.attributes.url
    }))
  }
}
```

### Wedding-Specific Music Intelligence

```
class WeddingMusicAI {
  private weddingCategories = {
    processional: {
      keywords: ['processional', 'aisle', 'bridal entrance', 'walking'],
      characteristics: { tempo: 'slow', mood: 'romantic', instrumental: true },
      duration: { min: 180, max: 300 } // 3-5 minutes
    },
    recessional: {
      keywords: ['recessional', 'exit', 'celebration'],
      characteristics: { tempo: 'upbeat', mood: 'joyful' },
      duration: { min: 120, max: 240 }
    },
    firstDance: {
      keywords: ['first dance', 'couple dance'],
      characteristics: { tempo: 'slow', mood: 'romantic', lyrics: true },
      duration: { min: 180, max: 360 }
    },
    reception: {
      keywords: ['reception', 'party', 'dancing'],
      characteristics: { tempo: 'varied', mood: 'celebratory', danceable: true }
    }
  }
  
  async categorizeTrack(track: Track): Promise<WeddingCategory[]> {
    const prompt = `Analyze this song for wedding suitability:
      Title: ${[track.name](http://track.name)}
      Artist: ${track.artist}
      Tempo: ${track.tempo || 'unknown'}
      
      Determine if suitable for:
      - Processional (walking down aisle)
      - Recessional (exiting ceremony)
      - First dance
      - Reception dancing
      - Cocktail hour
      
      Consider lyrics, tempo, mood, and cultural appropriateness.
      Return as JSON with categories and suitability scores (0-1).`
    
    const analysis = await openai.complete({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
    
    return JSON.parse(analysis).categories
  }
  
  async suggestSimilar(referenceTrack: Track, category: string): Promise<Track[]> {
    // Use multiple sources for suggestions
    const spotifyRecs = await this.getSpotifyRecommendations(referenceTrack)
    const aiRecs = await this.getAIRecommendations(referenceTrack, category)
    
    return this.mergeAndRankSuggestions(spotifyRecs, aiRecs)
  }
}
```

### Smart Song Request Processing

```
class SongRequestProcessor {
  async processSongRequest(request: string): Promise<TrackMatch[]> {
    // Handle partial/incorrect song titles
    const normalized = this.normalizeRequest(request)
    
    // Try direct search first
    let matches = await this.directSearch(normalized)
    
    if (matches.length === 0) {
      // Use AI to interpret fuzzy requests
      matches = await this.aiAssistedSearch(request)
    }
    
    return this.rankMatches(matches)
  }
  
  private normalizeRequest(request: string): string {
    return request
      .toLowerCase()
      .replace(/[""'']/g, '') // Remove smart quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }
  
  private async aiAssistedSearch(request: string): Promise<TrackMatch[]> {
    const interpretation = await openai.complete({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: 'You are a music expert helping identify songs from partial or incorrect descriptions.'
      }, {
        role: 'user',
        content: `Song request: "${request}"
          
          What song is this likely referring to?
          Provide: artist name, song title, confidence level
          Consider common misspellings and partial lyrics.
          
          Return as JSON with multiple possibilities ranked by confidence.`
      }],
      response_format: { type: 'json_object' }
    })
    
    const possibilities = JSON.parse(interpretation)
    const matches = []
    
    for (const possibility of possibilities.songs || []) {
      const searchResults = await this.directSearch(
        `${possibility.artist} ${possibility.title}`
      )
      
      matches.push(...[searchResults.map](http://searchResults.map)(result => ({
        ...result,
        confidence: possibility.confidence * result.similarity
      })))
    }
    
    return matches
  }
}
```

### Do-Not-Play List Intelligence

```
class DoNotPlayAnalyzer {
  private problematicCategories = {
    explicit: { weight: 1.0, reason: 'Contains explicit content' },
    breakup: { weight: 0.9, reason: 'About relationship ending' },
    death: { weight: 0.95, reason: 'References death/loss' },
    violence: { weight: 0.85, reason: 'Contains violent themes' },
    inappropriate: { weight: 0.8, reason: 'May be inappropriate for wedding' }
  }
  
  async analyzeSong(track: Track): Promise<Appropriateness> {
    // Check explicit flag first
    if (track.explicit) {
      return {
        appropriate: false,
        confidence: 1.0,
        reasons: ['Marked as explicit content'],
        category: 'explicit'
      }
    }
    
    // Analyze lyrics if available
    const lyrics = await this.getLyrics(track)
    if (lyrics) {
      return await this.analyzeLyrics(lyrics, track)
    }
    
    // Fallback to title/artist analysis
    return await this.analyzeTitleArtist(track)
  }
  
  private async analyzeLyrics(lyrics: string, track: Track): Promise<Appropriateness> {
    const analysis = await openai.complete({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: 'Analyze song lyrics for wedding appropriateness. Consider themes, language, and context.'
      }, {
        role: 'user',
        content: `Song: "${[track.name](http://track.name)}" by ${track.artist}
          
          Lyrics: ${lyrics}
          
          Rate appropriateness for wedding (0-1 scale):
          - 1.0 = Perfect for wedding
          - 0.8-0.9 = Good choice
          - 0.6-0.7 = Questionable
          - 0.0-0.5 = Inappropriate
          
          Consider: explicit language, themes (love vs breakup), cultural sensitivity
          
          Return JSON with score, reasoning, and flagged themes.`
      }],
      response_format: { type: 'json_object' }
    })
    
    return JSON.parse(analysis)
  }
}
```

## Critical Implementation Notes

### API Rate Limiting & Caching

```
class MusicAPIManager {
  private cache = new Map<string, CachedResult>()
  private rateLimiter = new RateLimiter({
    spotify: { requests: 100, per: 'hour' },
    appleMusic: { requests: 1000, per: 'hour' }
  })
  
  async search(query: string, provider: string): Promise<Track[]> {
    const cacheKey = `${provider}:${query}`
    
    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached && !this.isExpired(cached)) {
      return [cached.data](http://cached.data)
    }
    
    // Check rate limits
    if (!this.rateLimiter.canMakeRequest(provider)) {
      throw new Error(`Rate limit exceeded for ${provider}`)
    }
    
    // Make API request
    const results = await this.providers[provider].search(query)
    
    // Cache results
    this.cache.set(cacheKey, {
      data: results,
      timestamp: [Date.now](http://Date.now)(),
      ttl: 3600000 // 1 hour
    })
    
    return results
  }
}
```

### Database Schema

```
CREATE TABLE music_tracks_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL, -- Spotify/Apple Music ID
  provider TEXT NOT NULL, -- 'spotify', 'apple', 'youtube'
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration_ms INTEGER,
  explicit BOOLEAN DEFAULT false,
  preview_url TEXT,
  external_url TEXT,
  popularity INTEGER,
  wedding_categories JSONB,
  appropriateness_score DECIMAL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(provider, external_id)
);

CREATE TABLE song_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  wedding_id UUID,
  original_request TEXT NOT NULL,
  matched_track_id UUID REFERENCES music_tracks_cache(id),
  confidence_score DECIMAL,
  approved BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE do_not_play_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES music_tracks_cache(id),
  reason_category TEXT NOT NULL,
  confidence DECIMAL NOT NULL,
  analysis_notes TEXT,
  human_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_music_cache_provider ON music_tracks_cache(provider, external_id);
CREATE INDEX idx_song_requests_supplier ON song_requests(supplier_id);
CREATE INDEX idx_do_not_play_category ON do_not_play_analysis(reason_category);
```

### Smart Playlist Generation

```
class PlaylistGenerator {
  async generateWeddingPlaylist(
    preferences: MusicPreferences,
    timeline: WeddingTimeline
  ): Promise<Playlist> {
    const segments = [
      {
        name: 'Cocktail Hour',
        duration: 60,
        style: 'background',
        energy: 'low-medium'
      },
      {
        name: 'Dinner',
        duration: 90,
        style: 'conversation-friendly',
        energy: 'low'
      },
      {
        name: 'Dancing',
        duration: 120,
        style: 'danceable',
        energy: 'high'
      }
    ]
    
    const playlist = { tracks: [], total_duration: 0 }
    
    for (const segment of segments) {
      const tracks = await this.generateSegment(segment, preferences)
      playlist.tracks.push(...tracks)
      [playlist.total](http://playlist.total)_duration += segment.duration
    }
    
    return this.optimizePlaylist(playlist)
  }
  
  private async generateSegment(
    segment: PlaylistSegment,
    preferences: MusicPreferences
  ): Promise<Track[]> {
    const prompt = `Generate ${segment.duration} minutes of music for ${[segment.name](http://segment.name)}:
      Style: ${[segment.style](http://segment.style)}
      Energy: ${[segment.energy](http://segment.energy)}
      Preferences: ${JSON.stringify(preferences)}
      
      Consider:
      - Age demographics
      - Musical preferences
      - Cultural background
      - Time of day
      
      Return song suggestions as JSON array`
    
    const suggestions = await openai.complete({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
    
    return await this.findTracks(JSON.parse(suggestions).songs)
  }
}
```

### API Endpoints

```
// Search across all music platforms
GET /api/music/search?q=:query&providers=spotify,apple

// Get song recommendations
POST /api/music/recommendations
{
  referenceTrack: Track,
  category: 'processional' | 'recessional' | 'firstDance' | 'reception',
  guestPreferences?: MusicPreferences
}

// Analyze song appropriateness
POST /api/music/analyze
{
  track: Track,
  checkCategories: string[]
}

// Generate playlist
POST /api/music/playlist/generate
{
  preferences: MusicPreferences,
  timeline: WeddingTimeline,
  duration: number
}

// Process fuzzy song requests
POST /api/music/resolve-request
{
  request: string,
  context?: string
}
```

### Performance Targets

- **Search response**: <500ms
- **Song analysis**: <2 seconds
- **Playlist generation**: <10 seconds
- **Cache hit rate**: >70%
- **Song match accuracy**: >95%

This music database integration provides DJs and musicians with professional-grade tools for managing wedding music, ensuring appropriate song selection and seamless music discovery across platforms.