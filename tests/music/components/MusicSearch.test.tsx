/**
 * WS-252 Music Database Integration - Unit Tests
 * Team E - Round 1: Comprehensive Testing Suite
 * 
 * CRITICAL WEDDING INDUSTRY REQUIREMENTS:
 * - Zero tolerance for music search failures during events
 * - 100% uptime requirement for Saturday weddings
 * - Accurate appropriateness scoring to prevent inappropriate music
 * - Reliable offline functionality when venue WiFi fails
 * - Consistent cross-device experience as DJs switch between devices
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MusicSearch } from '@/components/music/MusicSearch'
import { musicSearchService } from '@/lib/services/music-search-service'
import { appropriatenessAnalyzer } from '@/lib/services/appropriateness-analyzer'

// Mock the music search service
vi.mock('@/lib/services/music-search-service', () => ({
  musicSearchService: {
    searchTracks: vi.fn(),
    getTrackAnalysis: vi.fn(),
    checkAppropriateness: vi.fn(),
    cacheSearch: vi.fn(),
    getOfflineResults: vi.fn()
  }
}))

// Mock appropriateness analyzer
vi.mock('@/lib/services/appropriateness-analyzer', () => ({
  appropriatenessAnalyzer: {
    analyzeTrack: vi.fn(),
    getWeddingScore: vi.fn(),
    flagInappropriateContent: vi.fn()
  }
}))

// Mock audio element for preview testing
Object.defineProperty(window, 'HTMLAudioElement', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    canPlayType: vi.fn().mockReturnValue('probably'),
    readyState: 4, // HAVE_ENOUGH_DATA
    duration: 263,
    currentTime: 0,
    volume: 1,
    muted: false
  }))
})

describe('MusicSearch Component - Wedding DJ Workflows', () => {
  let queryClient: QueryClient
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  describe('Search Functionality - Wedding Event Requirements', () => {
    it('should render search input with proper wedding context accessibility', () => {
      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="ceremony" />)
      
      const searchInput = screen.getByRole('searchbox', { name: /search wedding music/i })
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveAttribute('aria-describedby')
      expect(searchInput).toHaveAttribute('placeholder', 'Search for ceremony music...')
      
      // Wedding context should be displayed
      expect(screen.getByText(/ceremony music/i)).toBeInTheDocument()
    })

    it('should search tracks for wedding ceremony with debouncing', async () => {
      const mockTracks = [
        {
          id: 'perfect_ed_sheeran',
          name: 'Perfect',
          artist: 'Ed Sheeran',
          album: 'Divide',
          duration_ms: 263400,
          explicit: false,
          preview_url: 'https://example.com/preview.mp3',
          appropriateness_score: 0.95,
          wedding_moments: ['ceremony', 'first_dance'],
          energy_level: 'romantic',
          bpm: 63
        }
      ]

      const mockAnalysis = {
        appropriateness_score: 0.95,
        reasoning: 'Perfect romantic song for wedding ceremonies',
        concerns: [],
        wedding_suitability: {
          ceremony: 0.98,
          cocktail_hour: 0.7,
          reception: 0.8,
          first_dance: 0.99
        }
      }

      vi.mocked(musicSearchService.searchTracks).mockResolvedValue(mockTracks)
      vi.mocked(appropriatenessAnalyzer.analyzeTrack).mockResolvedValue(mockAnalysis)

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="ceremony" />)
      
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'Perfect Ed Sheeran')

      // Should debounce and only search after delay
      await waitFor(() => {
        expect(musicSearchService.searchTracks).toHaveBeenCalledWith('Perfect Ed Sheeran', {
          context: 'ceremony',
          filter_explicit: true,
          wedding_appropriate: true
        })
      }, { timeout: 1500 })

      // Verify search results display
      expect(screen.getByText('Perfect')).toBeInTheDocument()
      expect(screen.getByText('Ed Sheeran')).toBeInTheDocument()
      
      // Verify appropriateness score display
      const scoreElement = screen.getByTestId('appropriateness-score')
      expect(scoreElement).toHaveTextContent('95%')
      expect(scoreElement).toHaveClass('score-excellent')
    })

    it('should handle search errors gracefully during wedding events', async () => {
      vi.mocked(musicSearchService.searchTracks).mockRejectedValue(
        new Error('Network error - venue WiFi unstable')
      )

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="reception" />)
      
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'test query')

      await waitFor(() => {
        expect(screen.getByText(/unable to search music/i)).toBeInTheDocument()
      })

      // Should show offline mode option for wedding day reliability
      expect(screen.getByRole('button', { name: /use offline mode/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry search/i })).toBeInTheDocument()
      
      // Should display wedding day specific messaging
      expect(screen.getByText(/venue wifi issues/i)).toBeInTheDocument()
    })

    it('should provide wedding day loading state with ETA', async () => {
      vi.mocked(musicSearchService.searchTracks).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 2000))
      )

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="cocktail_hour" />)
      
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'cocktail music')

      await waitFor(() => {
        const loadingElement = screen.getByTestId('search-loading')
        expect(loadingElement).toBeInTheDocument()
        expect(loadingElement).toHaveAttribute('aria-live', 'polite')
        
        // Should show estimated time for wedding context
        expect(screen.getByText(/searching cocktail music/i)).toBeInTheDocument()
        expect(screen.getByText(/typically takes 2-3 seconds/i)).toBeInTheDocument()
      })
    })

    it('should filter inappropriate content automatically', async () => {
      const mockMixedTracks = [
        {
          id: 'explicit_track',
          name: 'Inappropriate Song',
          artist: 'Artist',
          explicit: true,
          appropriateness_score: 0.2,
          preview_url: null
        },
        {
          id: 'clean_track',
          name: 'Beautiful Wedding Song',
          artist: 'Artist',
          explicit: false,
          appropriateness_score: 0.9,
          preview_url: 'https://preview.com/clean.mp3'
        }
      ]

      vi.mocked(musicSearchService.searchTracks).mockResolvedValue(mockMixedTracks)

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="ceremony" />)
      
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'test query')

      await waitFor(() => {
        // Should only show wedding-appropriate content
        expect(screen.getByText('Beautiful Wedding Song')).toBeInTheDocument()
        expect(screen.queryByText('Inappropriate Song')).not.toBeInTheDocument()
      })

      // Should show filtering notification
      expect(screen.getByText(/filtered 1 inappropriate track/i)).toBeInTheDocument()
    })
  })

  describe('Track Selection and Wedding Context', () => {
    it('should call onTrackSelect with wedding context metadata', async () => {
      const mockTrackSelect = vi.fn()
      const mockTrack = {
        id: 'canon_in_d',
        name: 'Canon in D',
        artist: 'Pachelbel',
        appropriateness_score: 0.98,
        wedding_moments: ['ceremony', 'processional'],
        classical: true
      }

      vi.mocked(musicSearchService.searchTracks).mockResolvedValue([mockTrack])

      renderWithProvider(
        <MusicSearch 
          onTrackSelect={mockTrackSelect} 
          weddingContext="ceremony"
          playlistType="processional"
        />
      )
      
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'Canon in D')

      await waitFor(() => {
        expect(screen.getByText('Canon in D')).toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add canon in d to processional playlist/i })
      await user.click(addButton)

      expect(mockTrackSelect).toHaveBeenCalledWith({
        track: mockTrack,
        context: 'ceremony',
        playlist_type: 'processional',
        selected_at: expect.any(Date),
        wedding_appropriateness: 0.98
      })
    })

    it('should show wedding suitability breakdown for different moments', async () => {
      const mockTrack = {
        id: 'versatile_song',
        name: 'A Thousand Years',
        artist: 'Christina Perri',
        appropriateness_score: 0.92,
        wedding_suitability: {
          ceremony: 0.95,
          cocktail_hour: 0.8,
          first_dance: 0.98,
          reception_dancing: 0.6,
          processional: 0.9,
          recessional: 0.85
        }
      }

      vi.mocked(musicSearchService.searchTracks).mockResolvedValue([mockTrack])

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="ceremony" />)
      
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'A Thousand Years')

      await waitFor(() => {
        expect(screen.getByText('A Thousand Years')).toBeInTheDocument()
      })

      // Click to expand wedding suitability details
      const detailsButton = screen.getByRole('button', { name: /wedding suitability details/i })
      await user.click(detailsButton)

      // Verify suitability breakdown
      expect(screen.getByText('Ceremony: 95%')).toBeInTheDocument()
      expect(screen.getByText('First Dance: 98%')).toBeInTheDocument()
      expect(screen.getByText('Cocktail Hour: 80%')).toBeInTheDocument()
      expect(screen.getByText('Reception Dancing: 60%')).toBeInTheDocument()
    })

    it('should warn about low appropriateness scores with wedding context', async () => {
      const inappropriateTrack = {
        id: 'party_song',
        name: 'Party Hard',
        artist: 'Artist',
        appropriateness_score: 0.4,
        concerns: ['high_energy_for_ceremony', 'lyrics_mention_drinking'],
        wedding_suitability: {
          ceremony: 0.2,
          cocktail_hour: 0.7,
          reception_dancing: 0.8
        }
      }

      vi.mocked(musicSearchService.searchTracks).mockResolvedValue([inappropriateTrack])

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="ceremony" />)
      
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'party hard')

      await waitFor(() => {
        const warningElement = screen.getByTestId('appropriateness-warning')
        expect(warningElement).toBeInTheDocument()
        expect(warningElement).toHaveTextContent(/not suitable for ceremony/i)
        
        // Should suggest better context
        expect(screen.getByText(/better for reception dancing/i)).toBeInTheDocument()
      })
    })
  })

  describe('Audio Preview for Wedding Planning', () => {
    it('should handle audio preview for wedding music evaluation', async () => {
      const mockTrack = {
        id: 'preview_track',
        name: 'Wedding March',
        artist: 'Traditional',
        preview_url: 'https://example.com/wedding-march-preview.mp3',
        duration_ms: 180000,
        appropriateness_score: 0.99
      }

      vi.mocked(musicSearchService.searchTracks).mockResolvedValue([mockTrack])

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="ceremony" />)
      
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'wedding march')

      await waitFor(() => {
        expect(screen.getByText('Wedding March')).toBeInTheDocument()
      })

      const previewButton = screen.getByRole('button', { name: /preview wedding march/i })
      await user.click(previewButton)

      // Verify audio preview interface
      await waitFor(() => {
        const audioPlayer = screen.getByTestId('audio-preview-player')
        expect(audioPlayer).toBeInTheDocument()
        
        const playPauseButton = screen.getByRole('button', { name: /pause/i })
        expect(playPauseButton).toBeInTheDocument()
        
        const progressBar = screen.getByRole('slider', { name: /audio progress/i })
        expect(progressBar).toBeInTheDocument()
      })

      // Should show wedding-specific preview controls
      expect(screen.getByRole('button', { name: /loop preview/i })).toBeInTheDocument()
      expect(screen.getByText(/30 second preview/i)).toBeInTheDocument()
    })

    it('should handle missing preview gracefully for wedding planning', async () => {
      const mockTrackNoPreview = {
        id: 'no_preview',
        name: 'Classical Piece',
        artist: 'Composer',
        preview_url: null,
        appropriateness_score: 0.9
      }

      vi.mocked(musicSearchService.searchTracks).mockResolvedValue([mockTrackNoPreview])

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="ceremony" />)
      
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'classical piece')

      await waitFor(() => {
        expect(screen.getByText('Classical Piece')).toBeInTheDocument()
        expect(screen.getByText(/preview not available/i)).toBeInTheDocument()
        
        // Should offer alternative preview sources for wedding planning
        expect(screen.getByRole('button', { name: /find on youtube/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /search spotify/i })).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation for Wedding Events', () => {
    it('should support full keyboard navigation for accessibility', async () => {
      const mockTracks = [
        { id: 'track1', name: 'Track 1', artist: 'Artist 1', appropriateness_score: 0.9 },
        { id: 'track2', name: 'Track 2', artist: 'Artist 2', appropriateness_score: 0.8 }
      ]

      vi.mocked(musicSearchService.searchTracks).mockResolvedValue(mockTracks)

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="reception" />)
      
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'test tracks')

      await waitFor(() => {
        expect(screen.getByText('Track 1')).toBeInTheDocument()
      })

      // Test keyboard navigation through results
      await user.keyboard('{ArrowDown}')
      expect(screen.getByTestId('track-result-0')).toHaveClass('focused')

      await user.keyboard('{ArrowDown}')
      expect(screen.getByTestId('track-result-1')).toHaveClass('focused')

      await user.keyboard('{Enter}')
      // Should open track details or add to playlist
      expect(screen.getByTestId('track-details-modal') || screen.getByTestId('playlist-selection')).toBeInTheDocument()
    })

    it('should provide skip links for screen reader users', () => {
      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="ceremony" />)
      
      const skipLink = screen.getByRole('link', { name: /skip to search results/i })
      expect(skipLink).toBeInTheDocument()
      expect(skipLink).toHaveAttribute('href', '#search-results')
    })
  })

  describe('Mobile Wedding Day Experience', () => {
    it('should render mobile-optimized interface for venue use', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true })

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="cocktail_hour" />)
      
      const container = screen.getByTestId('music-search-container')
      expect(container).toHaveClass('mobile-optimized')
      
      // Touch targets should be large enough for wedding day use
      const searchButton = screen.getByRole('button', { name: /search/i })
      expect(searchButton).toHaveStyle({ minHeight: '48px', minWidth: '48px' })
    })

    it('should handle touch interactions for mobile DJs', async () => {
      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="reception" />)
      
      const searchInput = screen.getByRole('searchbox')
      
      // Simulate touch interaction
      fireEvent.touchStart(searchInput)
      fireEvent.touchEnd(searchInput)
      fireEvent.click(searchInput)
      
      expect(searchInput).toHaveFocus()
      
      // Mobile keyboard should not cover important controls
      const mobileKeyboardSpacer = screen.getByTestId('mobile-keyboard-spacer')
      expect(mobileKeyboardSpacer).toBeInTheDocument()
    })
  })

  describe('Offline Mode for Wedding Day Reliability', () => {
    it('should gracefully handle offline mode during venues with poor connectivity', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

      vi.mocked(musicSearchService.getOfflineResults).mockResolvedValue([
        {
          id: 'cached_track',
          name: 'Cached Wedding Song',
          artist: 'Cached Artist',
          appropriateness_score: 0.9,
          cached: true
        }
      ])

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="ceremony" />)
      
      // Should show offline indicator
      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument()
      expect(screen.getByText(/working offline/i)).toBeInTheDocument()
      
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'wedding song')

      await waitFor(() => {
        expect(musicSearchService.getOfflineResults).toHaveBeenCalled()
        expect(screen.getByText('Cached Wedding Song')).toBeInTheDocument()
        expect(screen.getByTestId('cached-result-indicator')).toBeInTheDocument()
      })
    })

    it('should sync search results when connectivity returns', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="reception" />)
      
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'sync test')

      // Go back online
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
      fireEvent(window, new Event('online'))

      await waitFor(() => {
        expect(screen.getByTestId('sync-indicator')).toBeInTheDocument()
        expect(screen.getByText(/syncing with server/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance Optimization for Wedding Events', () => {
    it('should complete searches within wedding performance requirements', async () => {
      const mockTracks = Array.from({ length: 50 }, (_, i) => ({
        id: `track_${i}`,
        name: `Track ${i}`,
        artist: `Artist ${i}`,
        appropriateness_score: 0.8 + (i % 3) * 0.1
      }))

      vi.mocked(musicSearchService.searchTracks).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockTracks), 300))
      )

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="reception" />)
      
      const searchInput = screen.getByRole('searchbox')
      const startTime = performance.now()
      
      await user.type(searchInput, 'performance test')

      await waitFor(() => {
        expect(screen.getByText('Track 0')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const searchTime = endTime - startTime

      // Should complete within wedding day performance requirements (< 2 seconds)
      expect(searchTime).toBeLessThan(2000)
    })

    it('should handle large result sets efficiently for wedding libraries', async () => {
      const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `wedding_track_${i}`,
        name: `Wedding Song ${i}`,
        artist: `Wedding Artist ${i}`,
        appropriateness_score: Math.random() * 0.4 + 0.6 // 0.6-1.0
      }))

      vi.mocked(musicSearchService.searchTracks).mockResolvedValue(largeResultSet)

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="ceremony" />)
      
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'wedding songs')

      await waitFor(() => {
        // Should implement virtual scrolling for large lists
        const virtualScroller = screen.getByTestId('virtual-scroller')
        expect(virtualScroller).toBeInTheDocument()
        
        // Should only render visible items for performance
        const visibleItems = screen.getAllByTestId(/^track-result-/)
        expect(visibleItems.length).toBeLessThan(50) // Virtual scrolling limit
      })

      // Should show total count
      expect(screen.getByText(/1,000 wedding songs found/i)).toBeInTheDocument()
    })
  })

  describe('Error Boundaries and Reliability', () => {
    it('should recover gracefully from component errors during weddings', () => {
      // Mock console.error to avoid test output noise
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Force a component error
      vi.mocked(musicSearchService.searchTracks).mockImplementation(() => {
        throw new Error('Critical search service failure')
      })

      renderWithProvider(<MusicSearch onTrackSelect={vi.fn()} weddingContext="ceremony" />)
      
      const searchInput = screen.getByRole('searchbox')
      user.type(searchInput, 'error test')

      // Should show error boundary with wedding-specific messaging
      expect(screen.getByText(/music search temporarily unavailable/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /use backup search/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /contact support/i })).toBeInTheDocument()

      consoleError.mockRestore()
    })
  })
})