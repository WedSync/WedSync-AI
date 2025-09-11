/**
 * WS-252 Music Database Integration - Playlist Builder Unit Tests
 * Team E - Round 1: Drag & Drop Playlist Management Testing
 * 
 * WEDDING INDUSTRY REQUIREMENTS:
 * - Seamless playlist building for wedding moments
 * - Drag-and-drop reordering for live events
 * - Real-time duration calculations for timing
 * - Wedding moment categorization (ceremony, cocktail, reception)
 * - Offline playlist management for venue reliability
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MusicPlaylistBuilder } from '@/components/music/MusicPlaylistBuilder'
import { playlistService } from '@/lib/services/playlist-service'
import { weddingTimingService } from '@/lib/services/wedding-timing-service'

// Mock services
vi.mock('@/lib/services/playlist-service', () => ({
  playlistService: {
    createPlaylist: vi.fn(),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    reorderTracks: vi.fn(),
    updatePlaylistTiming: vi.fn(),
    validateWeddingFlow: vi.fn()
  }
}))

vi.mock('@/lib/services/wedding-timing-service', () => ({
  weddingTimingService: {
    calculateTotalDuration: vi.fn(),
    validateMomentTiming: vi.fn(),
    suggestTransitions: vi.fn(),
    checkOverrun: vi.fn()
  }
}))

// Mock drag and drop
vi.mock('react-dnd', async () => {
  const actual = await vi.importActual('react-dnd')
  return {
    ...actual,
    useDrag: vi.fn(() => [{}, vi.fn(), vi.fn()]),
    useDrop: vi.fn(() => [{ isOver: false }, vi.fn()])
  }
})

describe('MusicPlaylistBuilder - Wedding Event Management', () => {
  const mockWeddingTracks = [
    {
      id: 'processional_1',
      name: 'Canon in D',
      artist: 'Pachelbel',
      duration_ms: 300000, // 5 minutes
      wedding_moment: 'ceremony',
      playlist_position: 0,
      bpm: 50,
      energy_level: 'calm'
    },
    {
      id: 'first_dance_1',
      name: 'Perfect',
      artist: 'Ed Sheeran',
      duration_ms: 263400, // 4:23
      wedding_moment: 'first_dance',
      playlist_position: 1,
      bpm: 63,
      energy_level: 'romantic'
    },
    {
      id: 'reception_1',
      name: 'Uptown Funk',
      artist: 'Bruno Mars',
      duration_ms: 270000, // 4:30
      wedding_moment: 'reception',
      playlist_position: 2,
      bpm: 115,
      energy_level: 'high'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderWithDragDrop = (component: React.ReactElement, touchMode = false) => {
    const backend = touchMode ? TouchBackend : HTML5Backend
    return render(
      <DndProvider backend={backend}>
        {component}
      </DndProvider>
    )
  }

  describe('Playlist Creation and Management', () => {
    it('should create wedding playlists for different moments', async () => {
      vi.mocked(playlistService.createPlaylist).mockResolvedValue({
        id: 'ceremony_playlist_123',
        name: 'Wedding Ceremony',
        type: 'ceremony',
        tracks: []
      })

      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialMoment="ceremony"
        />
      )

      const createButton = screen.getByRole('button', { name: /create ceremony playlist/i })
      await userEvent.click(createButton)

      expect(playlistService.createPlaylist).toHaveBeenCalledWith({
        weddingId: 'wedding_123',
        type: 'ceremony',
        name: 'Wedding Ceremony',
        metadata: {
          estimated_duration: 0,
          track_count: 0,
          energy_progression: 'calm'
        }
      })

      // Should show playlist creation success
      expect(screen.getByText(/ceremony playlist created/i)).toBeInTheDocument()
    })

    it('should display wedding moment categories with appropriate styling', () => {
      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialPlaylists={{
            ceremony: mockWeddingTracks.slice(0, 1),
            first_dance: mockWeddingTracks.slice(1, 2),
            reception: mockWeddingTracks.slice(2, 3)
          }}
        />
      )

      // Verify all wedding moment categories are displayed
      expect(screen.getByTestId('ceremony-playlist')).toBeInTheDocument()
      expect(screen.getByTestId('first-dance-playlist')).toBeInTheDocument()
      expect(screen.getByTestId('reception-playlist')).toBeInTheDocument()

      // Verify visual styling matches wedding moments
      const ceremonyPlaylist = screen.getByTestId('ceremony-playlist')
      expect(ceremonyPlaylist).toHaveClass('wedding-moment-ceremony')
      
      const receptionPlaylist = screen.getByTestId('reception-playlist')
      expect(receptionPlaylist).toHaveClass('wedding-moment-reception')
    })

    it('should calculate and display total duration for wedding timing', async () => {
      vi.mocked(weddingTimingService.calculateTotalDuration).mockReturnValue({
        total_ms: 833400, // 13:53
        by_moment: {
          ceremony: 300000,
          first_dance: 263400,
          reception: 270000
        },
        formatted: '13 minutes 53 seconds'
      })

      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialPlaylists={{
            ceremony: [mockWeddingTracks[0]],
            first_dance: [mockWeddingTracks[1]],
            reception: [mockWeddingTracks[2]]
          }}
        />
      )

      // Should display total timing
      expect(screen.getByTestId('total-duration')).toHaveTextContent('13 minutes 53 seconds')
      
      // Should show breakdown by moment
      expect(screen.getByTestId('ceremony-duration')).toHaveTextContent('5:00')
      expect(screen.getByTestId('first-dance-duration')).toHaveTextContent('4:23')
      expect(screen.getByTestId('reception-duration')).toHaveTextContent('4:30')
    })
  })

  describe('Drag and Drop Functionality', () => {
    it('should handle drag and drop reordering within playlists', async () => {
      const reorderSpy = vi.mocked(playlistService.reorderTracks).mockResolvedValue(true)

      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialPlaylists={{
            ceremony: [
              { ...mockWeddingTracks[0], playlist_position: 0 },
              { ...mockWeddingTracks[1], playlist_position: 1, wedding_moment: 'ceremony' }
            ]
          }}
        />
      )

      const firstTrack = screen.getByTestId('track-processional_1')
      const secondTrack = screen.getByTestId('track-first_dance_1')

      // Simulate drag and drop
      fireEvent.dragStart(firstTrack)
      fireEvent.dragEnter(secondTrack)
      fireEvent.dragOver(secondTrack)
      fireEvent.drop(secondTrack)
      fireEvent.dragEnd(firstTrack)

      await waitFor(() => {
        expect(reorderSpy).toHaveBeenCalledWith({
          playlistId: expect.any(String),
          fromPosition: 0,
          toPosition: 1,
          weddingMoment: 'ceremony'
        })
      })
    })

    it('should prevent invalid cross-moment drops with wedding logic', async () => {
      const validateSpy = vi.mocked(playlistService.validateWeddingFlow).mockReturnValue({
        valid: false,
        reason: 'Cannot move reception music to ceremony playlist',
        suggestions: ['Move to cocktail hour instead', 'Choose more appropriate ceremony music']
      })

      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialPlaylists={{
            ceremony: [mockWeddingTracks[0]],
            reception: [mockWeddingTracks[2]]
          }}
        />
      )

      const receptionTrack = screen.getByTestId('track-reception_1')
      const ceremonyPlaylist = screen.getByTestId('ceremony-playlist')

      // Try to drag high-energy reception track to ceremony
      fireEvent.dragStart(receptionTrack)
      fireEvent.dragEnter(ceremonyPlaylist)
      fireEvent.dragOver(ceremonyPlaylist)

      await waitFor(() => {
        // Should show validation warning
        expect(screen.getByTestId('drop-validation-warning')).toBeInTheDocument()
        expect(screen.getByText(/cannot move reception music to ceremony/i)).toBeInTheDocument()
        
        // Should show alternative suggestions
        expect(screen.getByText(/choose more appropriate ceremony music/i)).toBeInTheDocument()
      })

      fireEvent.drop(ceremonyPlaylist)

      // Should not execute the invalid move
      expect(playlistService.reorderTracks).not.toHaveBeenCalled()
    })

    it('should provide touch-friendly drag handles for mobile DJ use', () => {
      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialPlaylists={{ ceremony: [mockWeddingTracks[0]] }}
        />,
        true // Touch mode
      )

      const dragHandle = screen.getByTestId('track-drag-handle-processional_1')
      expect(dragHandle).toBeInTheDocument()
      expect(dragHandle).toHaveClass('touch-friendly')
      
      // Should have appropriate size for touch
      const styles = getComputedStyle(dragHandle)
      expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44) // Minimum touch target
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44)
    })
  })

  describe('Wedding Timing and Flow Validation', () => {
    it('should warn about timing overruns for wedding schedules', async () => {
      vi.mocked(weddingTimingService.checkOverrun).mockReturnValue({
        overrun: true,
        moment: 'ceremony',
        allocated_time: 600000, // 10 minutes
        actual_time: 900000,    // 15 minutes
        suggestions: [
          'Remove 2 songs to fit timing',
          'Discuss extended ceremony time with couple'
        ]
      })

      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          weddingSchedule={{
            ceremony: { allocated_minutes: 10 },
            cocktail_hour: { allocated_minutes: 60 },
            reception: { allocated_minutes: 240 }
          }}
          initialPlaylists={{
            ceremony: [
              mockWeddingTracks[0],
              { ...mockWeddingTracks[1], wedding_moment: 'ceremony' },
              { ...mockWeddingTracks[2], wedding_moment: 'ceremony', duration_ms: 300000 }
            ]
          }}
        />
      )

      // Should show timing warning
      const timingWarning = screen.getByTestId('timing-overrun-warning')
      expect(timingWarning).toBeInTheDocument()
      expect(timingWarning).toHaveTextContent(/ceremony is 5 minutes over schedule/i)

      // Should provide actionable suggestions
      expect(screen.getByText(/remove 2 songs to fit timing/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /auto-adjust timing/i })).toBeInTheDocument()
    })

    it('should suggest smooth transitions between wedding moments', async () => {
      vi.mocked(weddingTimingService.suggestTransitions).mockReturnValue([
        {
          from_moment: 'ceremony',
          to_moment: 'cocktail_hour',
          suggested_tracks: [
            {
              id: 'transition_1',
              name: 'A Sky Full of Stars',
              artist: 'Coldplay',
              reason: 'Perfect energy bridge from ceremony to cocktail hour'
            }
          ],
          fade_duration: 3000
        }
      ])

      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          showTransitions={true}
          initialPlaylists={{
            ceremony: [mockWeddingTracks[0]],
            cocktail_hour: [mockWeddingTracks[2]]
          }}
        />
      )

      // Should show transition suggestions
      const transitionSuggestion = screen.getByTestId('transition-ceremony-to-cocktail_hour')
      expect(transitionSuggestion).toBeInTheDocument()
      
      expect(screen.getByText(/perfect energy bridge/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add transition track/i })).toBeInTheDocument()
    })

    it('should validate energy flow progression for wedding atmosphere', async () => {
      const energyFlowValidation = {
        valid: false,
        issues: [
          {
            position: 1,
            issue: 'Sudden energy drop from high to calm',
            suggestion: 'Add medium-energy bridge song'
          }
        ],
        overall_flow: 'needs_improvement'
      }

      vi.mocked(playlistService.validateWeddingFlow).mockReturnValue(energyFlowValidation)

      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialPlaylists={{
            reception: [
              { ...mockWeddingTracks[2], energy_level: 'high' },  // High energy
              { ...mockWeddingTracks[0], energy_level: 'calm', wedding_moment: 'reception' }  // Sudden drop
            ]
          }}
        />
      )

      // Should highlight energy flow issues
      const flowWarning = screen.getByTestId('energy-flow-warning')
      expect(flowWarning).toBeInTheDocument()
      expect(flowWarning).toHaveTextContent(/sudden energy drop/i)

      // Should suggest fixes
      expect(screen.getByText(/add medium-energy bridge song/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /auto-fix energy flow/i })).toBeInTheDocument()
    })
  })

  describe('Offline Wedding Day Reliability', () => {
    it('should cache playlist changes for offline wedding day use', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialPlaylists={{ ceremony: [mockWeddingTracks[0]] }}
        />
      )

      // Should show offline indicator
      expect(screen.getByTestId('offline-mode-indicator')).toBeInTheDocument()
      expect(screen.getByText(/changes will sync when online/i)).toBeInTheDocument()

      // Make playlist change
      const addButton = screen.getByRole('button', { name: /add track/i })
      await userEvent.click(addButton)

      // Should show pending sync indicator
      expect(screen.getByTestId('pending-sync-indicator')).toBeInTheDocument()
      expect(screen.getByText(/1 change pending sync/i)).toBeInTheDocument()
    })

    it('should sync playlist changes when connectivity returns', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialPlaylists={{ ceremony: [mockWeddingTracks[0]] }}
        />
      )

      // Make changes while offline
      const dragHandle = screen.getByTestId('track-drag-handle-processional_1')
      fireEvent.dragStart(dragHandle)
      fireEvent.drop(dragHandle) // Simulate reorder

      // Go back online
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
      fireEvent(window, new Event('online'))

      await waitFor(() => {
        // Should show syncing state
        expect(screen.getByTestId('syncing-indicator')).toBeInTheDocument()
        expect(screen.getByText(/syncing playlist changes/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Responsiveness', () => {
    it('should handle large playlists efficiently for wedding libraries', () => {
      const largePlaylist = Array.from({ length: 500 }, (_, i) => ({
        id: `track_${i}`,
        name: `Wedding Song ${i}`,
        artist: `Artist ${i}`,
        duration_ms: 180000 + (i * 1000),
        wedding_moment: 'reception',
        playlist_position: i
      }))

      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialPlaylists={{ reception: largePlaylist }}
        />
      )

      // Should implement virtualization for large lists
      const virtualizedList = screen.getByTestId('virtualized-playlist-reception')
      expect(virtualizedList).toBeInTheDocument()

      // Should only render visible items
      const visibleTracks = screen.getAllByTestId(/^track-track_/)
      expect(visibleTracks.length).toBeLessThan(50) // Virtualization limit

      // Should show total count
      expect(screen.getByText(/500 tracks in reception/i)).toBeInTheDocument()
    })

    it('should debounce drag operations to prevent excessive updates', async () => {
      vi.useFakeTimers()

      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialPlaylists={{
            ceremony: [mockWeddingTracks[0], mockWeddingTracks[1]]
          }}
        />
      )

      const track = screen.getByTestId('track-processional_1')

      // Simulate rapid drag movements
      for (let i = 0; i < 10; i++) {
        fireEvent.dragStart(track)
        fireEvent.dragEnd(track)
      }

      // Fast-forward timers
      vi.runAllTimers()

      await waitFor(() => {
        // Should have debounced the updates
        expect(playlistService.reorderTracks).toHaveBeenCalledTimes(1)
      })

      vi.useRealTimers()
    })
  })

  describe('Accessibility for Wedding Professionals', () => {
    it('should provide screen reader support for playlist management', () => {
      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialPlaylists={{ ceremony: [mockWeddingTracks[0]] }}
        />
      )

      // Verify ARIA labels for screen readers
      const playlist = screen.getByRole('list', { name: /ceremony playlist/i })
      expect(playlist).toHaveAttribute('aria-label', 'Ceremony playlist with 1 track')

      const track = screen.getByRole('listitem')
      expect(track).toHaveAttribute('aria-label', expect.stringMatching(/canon in d by pachelbel/i))

      // Verify drag and drop announcements
      const dragHandle = screen.getByTestId('track-drag-handle-processional_1')
      expect(dragHandle).toHaveAttribute('aria-label', 'Drag to reorder Canon in D')
    })

    it('should support keyboard navigation for drag and drop', async () => {
      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialPlaylists={{
            ceremony: [mockWeddingTracks[0], mockWeddingTracks[1]]
          }}
        />
      )

      const firstTrack = screen.getByTestId('track-processional_1')
      firstTrack.focus()

      // Use keyboard to initiate drag
      await userEvent.keyboard('{Space}') // Start drag
      expect(screen.getByText(/canon in d selected for moving/i)).toBeInTheDocument()

      await userEvent.keyboard('{ArrowDown}') // Move down
      expect(screen.getByText(/move canon in d after perfect/i)).toBeInTheDocument()

      await userEvent.keyboard('{Enter}') // Confirm move

      expect(playlistService.reorderTracks).toHaveBeenCalledWith({
        playlistId: expect.any(String),
        fromPosition: 0,
        toPosition: 1,
        weddingMoment: 'ceremony'
      })
    })
  })

  describe('Wedding Day Emergency Features', () => {
    it('should provide quick playlist templates for wedding emergencies', async () => {
      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          emergencyMode={true}
        />
      )

      // Should show emergency playlist options
      const emergencyTemplates = screen.getByTestId('emergency-playlist-templates')
      expect(emergencyTemplates).toBeInTheDocument()

      expect(screen.getByRole('button', { name: /quick ceremony playlist/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /quick reception playlist/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /backup playlist/i })).toBeInTheDocument()

      // Quick template should populate instantly
      const quickCeremony = screen.getByRole('button', { name: /quick ceremony playlist/i })
      await userEvent.click(quickCeremony)

      expect(screen.getByText(/ceremony playlist ready/i)).toBeInTheDocument()
      expect(screen.getAllByTestId(/^track-/).length).toBeGreaterThan(0)
    })

    it('should handle last-minute playlist changes efficiently', async () => {
      vi.mocked(playlistService.addTrack).mockResolvedValue(true)

      renderWithDragDrop(
        <MusicPlaylistBuilder 
          weddingId="wedding_123"
          initialPlaylists={{ reception: [mockWeddingTracks[2]] }}
          lastMinuteMode={true}
        />
      )

      // Should show expedited controls
      const quickAddButton = screen.getByRole('button', { name: /quick add track/i })
      expect(quickAddButton).toBeInTheDocument()

      await userEvent.click(quickAddButton)

      // Should bypass normal validation for speed
      expect(screen.getByTestId('quick-track-search')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search and add instantly/i)).toBeInTheDocument()
    })
  })
})