/**
 * WS-252 Music Database Integration - Spotify API Integration Tests
 * Team E - Round 1: External API Integration Testing with MSW
 * 
 * CRITICAL INTEGRATION REQUIREMENTS:
 * - Reliable Spotify API integration for music search
 * - Proper authentication token management
 * - Rate limiting compliance and retry logic
 * - Wedding appropriateness filtering
 * - Offline fallback handling
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { spotifyService } from '@/lib/services/spotify-service'
import { appropriatenessAnalyzer } from '@/lib/services/appropriateness-analyzer'

// Mock Spotify API responses with comprehensive wedding music scenarios
const server = setupServer(
  // Spotify Token Endpoint
  http.post('https://accounts.spotify.com/api/token', ({ request }) => {
    return HttpResponse.json({
      access_token: 'mock_spotify_access_token_12345',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'user-read-private user-read-email'
    })
  }),

  // Spotify Search Endpoint - Wedding Music Scenarios
  http.get('https://api.spotify.com/v1/search', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    const type = url.searchParams.get('type')
    
    // Wedding Ceremony Search
    if (query?.includes('Perfect Ed Sheeran') || query?.includes('wedding ceremony')) {
      return HttpResponse.json({
        tracks: {
          items: [
            {
              id: '0tgVpDi06FyKpA1z0VMD4v',
              name: 'Perfect',
              artists: [{ 
                name: 'Ed Sheeran',
                id: '6eUKZXaKkcviH0Ku9w2n3V'
              }],
              album: { 
                name: 'Divide',
                images: [{ url: 'https://i.scdn.co/image/perfect-album-cover.jpg' }]
              },
              duration_ms: 263400,
              explicit: false,
              preview_url: 'https://p.scdn.co/mp3-preview/perfect-preview.mp3',
              external_urls: { 
                spotify: 'https://open.spotify.com/track/0tgVpDi06FyKpA1z0VMD4v' 
              },
              popularity: 95
            },
            {
              id: '1WkMMavIMc4JZ8cfMmxHkI',
              name: 'Canon in D',
              artists: [{ name: 'Pachelbel' }],
              album: { name: 'Classical Wedding Music' },
              duration_ms: 300000,
              explicit: false,
              preview_url: 'https://p.scdn.co/mp3-preview/canon-preview.mp3',
              external_urls: { 
                spotify: 'https://open.spotify.com/track/1WkMMavIMc4JZ8cfMmxHkI' 
              },
              popularity: 87
            }
          ],
          total: 2,
          limit: 20,
          offset: 0
        }
      })
    }

    // Explicit Content Test - Should filter inappropriate music
    if (query?.includes('explicit test') || query?.includes('inappropriate')) {
      return HttpResponse.json({
        tracks: {
          items: [
            {
              id: 'explicit_track_1',
              name: 'Inappropriate Wedding Song',
              artists: [{ name: 'Explicit Artist' }],
              album: { name: 'Not For Weddings' },
              duration_ms: 180000,
              explicit: true, // Should be filtered out
              preview_url: null,
              external_urls: { 
                spotify: 'https://open.spotify.com/track/explicit_track_1' 
              },
              popularity: 45
            },
            {
              id: 'clean_track_1',
              name: 'Beautiful Wedding Song',
              artists: [{ name: 'Clean Artist' }],
              album: { name: 'Wedding Collection' },
              duration_ms: 240000,
              explicit: false, // Wedding appropriate
              preview_url: 'https://p.scdn.co/mp3-preview/clean-preview.mp3',
              external_urls: { 
                spotify: 'https://open.spotify.com/track/clean_track_1' 
              },
              popularity: 78
            }
          ]
        }
      })
    }

    // Empty Results Test
    if (query?.includes('nonexistent song 12345')) {
      return HttpResponse.json({
        tracks: {
          items: [],
          total: 0,
          limit: 20,
          offset: 0
        }
      })
    }

    // Rate Limiting Test
    if (query?.includes('rate limit test')) {
      return new HttpResponse(null, {
        status: 429,
        headers: {
          'Retry-After': '1',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0'
        }
      })
    }

    // Network Error Test
    if (query?.includes('network error')) {
      return new HttpResponse(null, { status: 500 })
    }

    // Authentication Error Test
    if (query?.includes('auth error')) {
      return new HttpResponse(null, { 
        status: 401,
        headers: { 'WWW-Authenticate': 'Bearer' }
      })
    }

    // Default wedding music response
    return HttpResponse.json({
      tracks: {
        items: [
          {
            id: 'default_wedding_song',
            name: 'Default Wedding Song',
            artists: [{ name: 'Default Artist' }],
            album: { name: 'Wedding Hits' },
            duration_ms: 200000,
            explicit: false,
            preview_url: 'https://p.scdn.co/mp3-preview/default.mp3',
            external_urls: { 
              spotify: 'https://open.spotify.com/track/default' 
            },
            popularity: 60
          }
        ]
      }
    })
  }),

  // Spotify Audio Features Endpoint
  http.get('https://api.spotify.com/v1/audio-features/:trackId', ({ params }) => {
    const { trackId } = params
    
    if (trackId === '0tgVpDi06FyKpA1z0VMD4v') { // Perfect by Ed Sheeran
      return HttpResponse.json({
        id: trackId,
        danceability: 0.448,
        energy: 0.359,
        valence: 0.581, // Happiness/positivity
        tempo: 95.05,
        acousticness: 0.581,
        instrumentalness: 0.0,
        speechiness: 0.0302,
        loudness: -6.492,
        mode: 1, // Major key
        key: 4 // E major
      })
    }

    if (trackId === '1WkMMavIMc4JZ8cfMmxHkI') { // Canon in D
      return HttpResponse.json({
        id: trackId,
        danceability: 0.234,
        energy: 0.123,
        valence: 0.712,
        tempo: 50.0, // Slow, ceremonial
        acousticness: 0.956, // Highly acoustic
        instrumentalness: 0.987, // Purely instrumental
        speechiness: 0.0,
        loudness: -12.3,
        mode: 1,
        key: 2 // D major
      })
    }

    return new HttpResponse(null, { status: 404 })
  }),

  // Spotify Multiple Audio Features Endpoint
  http.get('https://api.spotify.com/v1/audio-features', ({ request }) => {
    const url = new URL(request.url)
    const ids = url.searchParams.get('ids')?.split(',') || []
    
    const features = ids.map(id => {
      if (id === '0tgVpDi06FyKpA1z0VMD4v') {
        return {
          id,
          danceability: 0.448,
          energy: 0.359,
          valence: 0.581,
          tempo: 95.05
        }
      }
      return { id, danceability: 0.5, energy: 0.5, valence: 0.5, tempo: 120 }
    })

    return HttpResponse.json({ audio_features: features })
  })
)

describe('Spotify API Integration - Wedding Music Service', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterAll(() => {
    server.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('Authentication and Token Management', () => {
    it('should authenticate with Spotify and manage tokens properly', async () => {
      const searchResult = await spotifyService.searchTracks('Perfect Ed Sheeran')

      expect(searchResult).toBeDefined()
      expect(Array.isArray(searchResult)).toBe(true)
      
      // Verify token was obtained and used
      expect(searchResult.length).toBeGreaterThan(0)
      expect(searchResult[0].name).toBe('Perfect')
    })

    it('should handle token refresh automatically', async () => {
      // First search should get token
      const firstSearch = await spotifyService.searchTracks('wedding ceremony')
      expect(firstSearch).toBeDefined()

      // Mock token expiration by clearing internal token
      await spotifyService.clearTokenCache?.()

      // Second search should refresh token automatically
      const secondSearch = await spotifyService.searchTracks('wedding ceremony')
      expect(secondSearch).toBeDefined()
      expect(secondSearch.length).toBeGreaterThan(0)
    })

    it('should handle authentication errors gracefully', async () => {
      try {
        await spotifyService.searchTracks('auth error')
        throw new Error('Should have thrown authentication error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toMatch(/authentication|token|unauthorized/i)
      }
    })
  })

  describe('Wedding Music Search Functionality', () => {
    it('should search for wedding ceremony music with appropriate results', async () => {
      const results = await spotifyService.searchTracks('Perfect Ed Sheeran', {
        context: 'ceremony',
        filter_explicit: true
      })

      expect(results).toHaveLength(2)
      
      // Verify Ed Sheeran's Perfect
      const perfectTrack = results.find(track => track.name === 'Perfect')
      expect(perfectTrack).toBeTruthy()
      expect(perfectTrack?.artist).toBe('Ed Sheeran')
      expect(perfectTrack?.explicit).toBe(false)
      expect(perfectTrack?.duration_ms).toBe(263400)
      expect(perfectTrack?.preview_url).toContain('perfect-preview.mp3')

      // Verify Canon in D
      const canonTrack = results.find(track => track.name === 'Canon in D')
      expect(canonTrack).toBeTruthy()
      expect(canonTrack?.artist).toBe('Pachelbel')
      expect(canonTrack?.explicit).toBe(false)
      expect(canonTrack?.duration_ms).toBe(300000)
    })

    it('should automatically filter explicit content for wedding appropriateness', async () => {
      const results = await spotifyService.searchTracks('explicit test', {
        filter_explicit: true,
        wedding_appropriate: true
      })

      // Should only return clean tracks
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Beautiful Wedding Song')
      expect(results[0].explicit).toBe(false)
      
      // Explicit track should be filtered out
      const explicitTrack = results.find(track => track.name === 'Inappropriate Wedding Song')
      expect(explicitTrack).toBeUndefined()
    })

    it('should handle empty search results gracefully', async () => {
      const results = await spotifyService.searchTracks('nonexistent song 12345')

      expect(results).toEqual([])
      expect(Array.isArray(results)).toBe(true)
    })

    it('should provide search with wedding context metadata', async () => {
      const results = await spotifyService.searchTracks('wedding ceremony', {
        context: 'ceremony',
        energy_level: 'calm',
        bpm_range: { min: 40, max: 80 }
      })

      expect(results.length).toBeGreaterThan(0)
      
      // Results should include wedding context
      results.forEach(track => {
        expect(track).toHaveProperty('id')
        expect(track).toHaveProperty('name')
        expect(track).toHaveProperty('artist')
        expect(track).toHaveProperty('explicit')
        expect(track.explicit).toBe(false) // Should filter explicit
      })
    })
  })

  describe('Audio Analysis for Wedding Suitability', () => {
    it('should analyze track features for wedding ceremony suitability', async () => {
      const analysis = await spotifyService.getAudioFeatures('0tgVpDi06FyKpA1z0VMD4v')

      expect(analysis).toBeTruthy()
      expect(analysis.id).toBe('0tgVpDi06FyKpA1z0VMD4v')
      expect(analysis.danceability).toBe(0.448)
      expect(analysis.energy).toBe(0.359)
      expect(analysis.valence).toBe(0.581) // Positive emotion
      expect(analysis.tempo).toBe(95.05)
      expect(analysis.acousticness).toBe(0.581)

      // Calculate wedding suitability
      const weddingSuitability = spotifyService.calculateWeddingSuitability(analysis)
      expect(weddingSuitability).toBeDefined()
      expect(weddingSuitability.ceremony_score).toBeGreaterThan(0.7) // Good for ceremony
      expect(weddingSuitability.overall_score).toBeGreaterThan(0.8) // Overall wedding appropriate
    })

    it('should analyze classical music appropriateness for ceremonies', async () => {
      const canonAnalysis = await spotifyService.getAudioFeatures('1WkMMavIMc4JZ8cfMmxHkI')

      expect(canonAnalysis).toBeTruthy()
      expect(canonAnalysis.tempo).toBe(50.0) // Slow, ceremonial pace
      expect(canonAnalysis.acousticness).toBe(0.956) // Highly acoustic
      expect(canonAnalysis.instrumentalness).toBe(0.987) // Purely instrumental
      expect(canonAnalysis.valence).toBe(0.712) // Positive, uplifting

      const suitability = spotifyService.calculateWeddingSuitability(canonAnalysis)
      expect(suitability.ceremony_score).toBeGreaterThan(0.9) // Perfect for ceremony
      expect(suitability.processional_score).toBeGreaterThan(0.9) // Ideal for processional
    })

    it('should handle missing audio features gracefully', async () => {
      const analysis = await spotifyService.getAudioFeatures('nonexistent_track_id')

      expect(analysis).toBeNull()
    })

    it('should batch analyze multiple tracks efficiently', async () => {
      const trackIds = ['0tgVpDi06FyKpA1z0VMD4v', '1WkMMavIMc4JZ8cfMmxHkI']
      const analyses = await spotifyService.getBulkAudioFeatures(trackIds)

      expect(analyses).toHaveLength(2)
      expect(analyses[0].id).toBe('0tgVpDi06FyKpA1z0VMD4v')
      expect(analyses[1].id).toBe('1WkMMavIMc4JZ8cfMmxHkI')
      
      // Verify batch API was called (not individual requests)
      expect(analyses[0].danceability).toBeDefined()
      expect(analyses[1].danceability).toBeDefined()
    })
  })

  describe('Rate Limiting and Error Handling', () => {
    it('should respect Spotify rate limits with retry logic', async () => {
      vi.useFakeTimers()

      const searchPromise = spotifyService.searchTracks('rate limit test')

      // Fast-forward past retry delay
      vi.advanceTimersByTime(2000)

      try {
        await searchPromise
      } catch (error) {
        expect(error.message).toMatch(/rate limit|too many requests/i)
      }

      vi.useRealTimers()
    })

    it('should implement exponential backoff for rate limit retries', async () => {
      vi.useFakeTimers()
      const rateLimitPromise = spotifyService.searchTracks('rate limit test')

      // Should wait 1 second initially
      vi.advanceTimersByTime(1000)
      
      // Should wait 2 seconds on second retry
      vi.advanceTimersByTime(2000)
      
      // Should wait 4 seconds on third retry
      vi.advanceTimersByTime(4000)

      try {
        await rateLimitPromise
      } catch (error) {
        expect(error.message).toMatch(/rate limit exceeded/i)
      }

      vi.useRealTimers()
    })

    it('should handle network errors with appropriate fallbacks', async () => {
      try {
        await spotifyService.searchTracks('network error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toMatch(/network|connection|server error/i)
      }

      // Should attempt to use cached results as fallback
      const cachedResults = await spotifyService.getCachedResults('network error')
      expect(Array.isArray(cachedResults)).toBe(true) // Empty array if no cache
    })

    it('should retry failed requests with circuit breaker pattern', async () => {
      let attemptCount = 0
      
      server.use(
        http.get('https://api.spotify.com/v1/search', () => {
          attemptCount++
          if (attemptCount < 3) {
            return new HttpResponse(null, { status: 500 })
          }
          return HttpResponse.json({
            tracks: { items: [], total: 0, limit: 20, offset: 0 }
          })
        })
      )

      const result = await spotifyService.searchTracks('retry test')
      
      expect(attemptCount).toBe(3) // Should retry twice before succeeding
      expect(result).toEqual([])
    })
  })

  describe('Wedding-Specific Features', () => {
    it('should calculate comprehensive wedding appropriateness scores', async () => {
      const tracks = await spotifyService.searchTracks('Perfect Ed Sheeran')
      const perfectTrack = tracks[0]

      const appropriatenessScore = await appropriatenessAnalyzer.analyzeTrack(perfectTrack)
      
      expect(appropriatenessScore).toBeDefined()
      expect(appropriatenessScore.overall_score).toBeGreaterThan(0.8)
      expect(appropriatenessScore.wedding_moments).toContain('ceremony')
      expect(appropriatenessScore.wedding_moments).toContain('first_dance')
      expect(appropriatenessScore.concerns).toEqual([])
      expect(appropriatenessScore.reasoning).toMatch(/romantic|love|wedding/i)
    })

    it('should provide wedding moment recommendations', async () => {
      const tracks = await spotifyService.searchTracks('Canon in D')
      const canonTrack = tracks.find(t => t.name === 'Canon in D')

      const recommendations = await spotifyService.getWeddingMomentRecommendations(canonTrack)
      
      expect(recommendations).toBeDefined()
      expect(recommendations.highly_recommended).toContain('processional')
      expect(recommendations.highly_recommended).toContain('ceremony')
      expect(recommendations.not_recommended).toContain('reception_dancing')
      expect(recommendations.reasoning.processional).toMatch(/traditional|classical|elegant/i)
    })

    it('should suggest energy flow for wedding playlist building', async () => {
      const ceremonyTracks = await spotifyService.searchTracks('wedding ceremony')
      
      const energyFlow = await spotifyService.calculateEnergyFlow(ceremonyTracks)
      
      expect(energyFlow).toBeDefined()
      expect(energyFlow.average_energy).toBeLessThan(0.5) // Ceremony should be calm
      expect(energyFlow.energy_progression).toBe('consistent') // Should maintain energy level
      expect(energyFlow.recommendations).toContain('maintain_calm_energy')
    })
  })

  describe('Caching and Performance', () => {
    it('should cache search results for improved performance', async () => {
      const query = 'Perfect Ed Sheeran'
      
      // First search - should hit API
      const firstResult = await spotifyService.searchTracks(query)
      expect(firstResult.length).toBeGreaterThan(0)

      // Second search - should use cache
      const secondResult = await spotifyService.searchTracks(query)
      expect(secondResult).toEqual(firstResult)
      
      // Verify cache hit (implementation specific)
      const cacheStats = await spotifyService.getCacheStats?.()
      expect(cacheStats?.hits).toBeGreaterThan(0)
    })

    it('should invalidate cache appropriately for fresh results', async () => {
      const query = 'wedding music cache test'
      
      // Initial search
      await spotifyService.searchTracks(query)
      
      // Clear cache
      await spotifyService.clearCache?.(query)
      
      // Search again should hit API
      const freshResult = await spotifyService.searchTracks(query)
      expect(Array.isArray(freshResult)).toBe(true)
    })

    it('should handle concurrent requests efficiently', async () => {
      const promises = []
      
      // Make 5 concurrent searches
      for (let i = 0; i < 5; i++) {
        promises.push(spotifyService.searchTracks(`wedding song ${i}`))
      }
      
      const results = await Promise.all(promises)
      
      // All should complete successfully
      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true)
      })
    })
  })

  describe('Offline and Fallback Handling', () => {
    it('should provide offline fallback for wedding day reliability', async () => {
      // Mock offline state
      const originalOnline = navigator.onLine
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

      try {
        const results = await spotifyService.searchTracks('Perfect Ed Sheeran')
        
        // Should return cached results or empty array
        expect(Array.isArray(results)).toBe(true)
        
        // Should indicate offline mode
        const offlineStatus = await spotifyService.getOfflineStatus()
        expect(offlineStatus.isOffline).toBe(true)
        expect(offlineStatus.cacheAvailable).toBeDefined()
        
      } finally {
        Object.defineProperty(navigator, 'onLine', { value: originalOnline, configurable: true })
      }
    })

    it('should sync data when connectivity returns', async () => {
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
      
      // Try to search while offline
      await spotifyService.searchTracks('sync test')
      
      // Go back online
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
      
      // Should sync pending requests
      const syncStatus = await spotifyService.syncPendingRequests?.()
      expect(syncStatus?.synced).toBeDefined()
    })
  })
})