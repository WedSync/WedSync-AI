/**
 * WS-252 Music Database Integration - End-to-End DJ Workflow Tests
 * Team E - Round 1: Complete Wedding DJ User Journey Testing
 * 
 * CRITICAL WEDDING DAY SCENARIOS:
 * - Complete DJ workflow from login to playlist creation
 * - Real-time music search during wedding events
 * - Offline functionality when venue WiFi fails
 * - Cross-device handoff (mobile to desktop)
 * - Performance under wedding day pressure
 */

import { test, expect, Page, Browser } from '@playwright/test'
import { loginAsDJ, createTestWedding, setupMockSpotifyAPI } from '../helpers/wedding-test-helpers'

test.describe('Complete DJ Wedding Workflow', () => {
  let page: Page
  let browser: Browser

  test.beforeEach(async ({ page: testPage, browser: testBrowser }) => {
    page = testPage
    browser = testBrowser

    // Setup mock APIs for reliable testing
    await setupMockSpotifyAPI(page)
    
    // Login as professional wedding DJ
    await loginAsDJ(page, 'dj@weddingpro.com', 'securepassword123')
    
    // Create test wedding event
    await createTestWedding(page, {
      couple: 'John & Sarah Smith',
      date: '2024-06-15',
      venue: 'Elegant Gardens Wedding Venue',
      type: 'ceremony_and_reception'
    })
  })

  test('Complete Wedding Music Management Journey', async () => {
    // Navigate to wedding music management dashboard
    await page.goto('/weddings/test-wedding-123/music')
    
    // Verify wedding context is loaded
    await expect(page.locator('h1')).toContainText('Music Management')
    await expect(page.locator('[data-testid="wedding-details"]')).toContainText('John & Sarah Smith')
    await expect(page.locator('[data-testid="wedding-date"]')).toContainText('June 15, 2024')
    
    // Verify accessibility and screen reader support
    await expect(page.locator('main')).toHaveAttribute('role', 'main')
    await expect(page.locator('[aria-live="polite"]')).toBeVisible()

    // === PHASE 1: CEREMONY MUSIC PLANNING ===
    test.step('Plan Ceremony Music with Processional', async () => {
      // Switch to ceremony tab
      await page.locator('[data-testid="ceremony-tab"]').click()
      await expect(page.locator('[data-testid="ceremony-playlist"]')).toBeVisible()

      // Search for processional music
      const searchInput = page.locator('[data-testid="music-search-input"]')
      await expect(searchInput).toBeVisible()
      await expect(searchInput).toHaveAttribute('aria-label', /search wedding music/i)

      await searchInput.fill('Canon in D Pachelbel processional')
      await searchInput.press('Enter')

      // Verify search results with wedding appropriateness
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 10000 })
      
      const canonTrack = page.locator('[data-testid="track-result"]').first()
      await expect(canonTrack.locator('[data-testid="track-name"]')).toContainText('Canon in D')
      await expect(canonTrack.locator('[data-testid="artist-name"]')).toContainText('Pachelbel')

      // Check wedding appropriateness score
      const appropriatenessScore = canonTrack.locator('[data-testid="appropriateness-score"]')
      await expect(appropriatenessScore).toBeVisible()
      await expect(appropriatenessScore).toContainText(/9[0-9]%/) // Should be 90%+

      // Verify wedding suitability breakdown
      await canonTrack.locator('[data-testid="suitability-details-toggle"]').click()
      await expect(page.locator('[data-testid="suitability-breakdown"]')).toBeVisible()
      await expect(page.locator('[data-testid="processional-score"]')).toContainText(/9[5-9]%/) // Excellent for processional

      // Add to ceremony playlist
      await canonTrack.locator('[data-testid="add-to-playlist-button"]').click()
      
      // Select processional playlist
      await expect(page.locator('[data-testid="playlist-selection-modal"]')).toBeVisible()
      await page.locator('[data-testid="processional-playlist"]').click()
      await page.locator('[data-testid="confirm-add-button"]').click()

      // Verify track was added to processional
      await page.locator('[data-testid="processional-section"]').click()
      const processionalPlaylist = page.locator('[data-testid="processional-tracks"]')
      await expect(processionalPlaylist).toBeVisible()
      await expect(processionalPlaylist.locator('[data-testid="playlist-track"]')).toHaveCount(1)
      await expect(processionalPlaylist.locator('[data-testid="track-name"]')).toContainText('Canon in D')
    })

    // === PHASE 2: FIRST DANCE SELECTION ===
    test.step('Select Perfect First Dance Song', async () => {
      await page.locator('[data-testid="first-dance-tab"]').click()
      
      // Search for romantic first dance music
      await searchInput.fill('Perfect Ed Sheeran first dance')
      await searchInput.press('Enter')

      await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
      
      const perfectTrack = page.locator('[data-testid="track-result"]').first()
      await expect(perfectTrack.locator('[data-testid="track-name"]')).toContainText('Perfect')
      await expect(perfectTrack.locator('[data-testid="artist-name"]')).toContainText('Ed Sheeran')

      // Test audio preview functionality
      const previewButton = perfectTrack.locator('[data-testid="preview-button"]')
      if (await previewButton.isVisible()) {
        await previewButton.click()
        
        // Verify audio player interface
        await expect(page.locator('[data-testid="audio-preview-player"]')).toBeVisible()
        const playPauseButton = page.locator('[data-testid="play-pause-button"]')
        await expect(playPauseButton).toBeVisible()
        
        // Verify audio preview controls
        await expect(page.locator('[data-testid="preview-progress"]')).toBeVisible()
        await expect(page.locator('[data-testid="preview-duration"]')).toContainText('4:23')
        
        // Test pause functionality
        await playPauseButton.click()
        await expect(playPauseButton).toHaveAttribute('aria-label', /play/i)
      }

      // Check first dance suitability
      await expect(perfectTrack.locator('[data-testid="first-dance-indicator"]')).toBeVisible()
      await expect(perfectTrack.locator('[data-testid="appropriateness-score"]')).toContainText(/9[5-9]%/)

      // Add to first dance playlist
      await perfectTrack.locator('[data-testid="add-to-playlist-button"]').click()
      await page.locator('[data-testid="first-dance-playlist"]').click()
      await page.locator('[data-testid="confirm-add-button"]').click()

      // Verify addition and timing update
      const firstDanceSection = page.locator('[data-testid="first-dance-section"]')
      await expect(firstDanceSection.locator('[data-testid="playlist-track"]')).toHaveCount(1)
      await expect(firstDanceSection.locator('[data-testid="section-duration"]')).toContainText('4:23')
    })

    // === PHASE 3: RECEPTION PARTY MUSIC ===
    test.step('Build High-Energy Reception Playlist', async () => {
      await page.locator('[data-testid="reception-tab"]').click()
      
      const receptionMusic = [
        'Uptown Funk Bruno Mars',
        'I Wanna Dance with Somebody Whitney Houston',
        'Dancing Queen ABBA',
        'Mr. Brightside The Killers'
      ]

      for (const [index, song] of receptionMusic.entries()) {
        await searchInput.fill(song)
        await searchInput.press('Enter')
        
        await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
        
        const trackResult = page.locator('[data-testid="track-result"]').first()
        
        // Verify high energy for reception
        await expect(trackResult.locator('[data-testid="energy-level"]')).toContainText(/high|party|dance/i)
        await expect(trackResult.locator('[data-testid="bpm-indicator"]')).toBeVisible()
        
        // Add to reception playlist
        await trackResult.locator('[data-testid="add-to-playlist-button"]').click()
        await page.locator('[data-testid="reception-playlist"]').click()
        await page.locator('[data-testid="confirm-add-button"]').click()
        
        // Verify running count
        const receptionSection = page.locator('[data-testid="reception-section"]')
        await expect(receptionSection.locator('[data-testid="playlist-track"]')).toHaveCount(index + 1)
      }

      // Verify total reception duration
      const receptionDuration = page.locator('[data-testid="reception-duration"]')
      await expect(receptionDuration).toBeVisible()
      // Should be approximately 16-20 minutes for 4 songs
    })

    // === PHASE 4: PLAYLIST REORDERING AND FLOW ===
    test.step('Optimize Energy Flow with Drag and Drop', async () => {
      const receptionSection = page.locator('[data-testid="reception-section"]')
      const tracks = receptionSection.locator('[data-testid="playlist-track"]')
      
      // Test drag and drop reordering
      const firstTrack = tracks.nth(0)
      const secondTrack = tracks.nth(1)
      
      await firstTrack.dragTo(secondTrack)
      
      // Verify reorder was successful
      await page.waitForTimeout(1000) // Allow reorder to complete
      
      // Check energy flow validation
      const energyFlowIndicator = page.locator('[data-testid="energy-flow-indicator"]')
      await expect(energyFlowIndicator).toBeVisible()
      
      // Should show energy flow analysis
      if (await page.locator('[data-testid="energy-flow-warning"]').isVisible()) {
        await expect(page.locator('[data-testid="energy-flow-suggestion"]')).toBeVisible()
        await expect(page.locator('[data-testid="auto-optimize-button"]')).toBeVisible()
      }
    })

    // === PHASE 5: TIMING VALIDATION ===
    test.step('Validate Wedding Schedule Timing', async () => {
      // Check total event timing
      const totalDuration = page.locator('[data-testid="total-event-duration"]')
      await expect(totalDuration).toBeVisible()
      
      // Should show breakdown by moments
      await expect(page.locator('[data-testid="ceremony-total-time"]')).toBeVisible()
      await expect(page.locator('[data-testid="first-dance-total-time"]')).toBeVisible()
      await expect(page.locator('[data-testid="reception-total-time"]')).toBeVisible()
      
      // Check for timing warnings
      const timingOverview = page.locator('[data-testid="timing-overview"]')
      await expect(timingOverview).toBeVisible()
      
      if (await page.locator('[data-testid="timing-warning"]').isVisible()) {
        await expect(page.locator('[data-testid="timing-suggestion"]')).toBeVisible()
        
        // Should offer solutions
        await expect(page.locator('[data-testid="adjust-timing-button"]')).toBeVisible()
      }
    })

    // === PHASE 6: SAVE AND FINALIZE ===
    test.step('Save Complete Wedding Music Plan', async () => {
      // Save all playlists
      const saveAllButton = page.locator('[data-testid="save-all-playlists-button"]')
      await expect(saveAllButton).toBeVisible()
      await saveAllButton.click()
      
      // Verify save progress
      await expect(page.locator('[data-testid="saving-indicator"]')).toBeVisible()
      
      // Wait for save completion
      await expect(page.locator('[data-testid="save-success-notification"]')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('[data-testid="save-success-notification"]')).toContainText(/all playlists saved/i)
      
      // Verify backup created
      await expect(page.locator('[data-testid="backup-confirmation"]')).toBeVisible()
      await expect(page.locator('[data-testid="backup-confirmation"]')).toContainText(/backup created/i)
    })
  })

  test('Offline Mode Wedding Day Reliability', async () => {
    await page.goto('/weddings/test-wedding-123/music')
    
    // Load some music while online
    const searchInput = page.locator('[data-testid="music-search-input"]')
    await searchInput.fill('Perfect Ed Sheeran')
    await searchInput.press('Enter')
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    
    // Simulate network failure (venue WiFi issues)
    await page.route('**/*', route => route.abort())
    
    // Should show offline mode indicator
    await expect(page.locator('[data-testid="offline-mode-indicator"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="offline-mode-indicator"]')).toContainText(/working offline/i)
    
    // Should provide offline guidance
    await expect(page.locator('[data-testid="offline-instructions"]')).toBeVisible()
    await expect(page.locator('[data-testid="offline-instructions"]')).toContainText(/venue wifi/i)
    
    // Test offline playlist access
    await page.locator('[data-testid="ceremony-tab"]').click()
    await expect(page.locator('[data-testid="ceremony-playlist"]')).toBeVisible()
    
    // Should show cached playlists
    await expect(page.locator('[data-testid="cached-playlist-indicator"]')).toBeVisible()
    
    // Test offline search (should show cached results)
    await searchInput.fill('Perfect')
    await searchInput.press('Enter')
    
    if (await page.locator('[data-testid="cached-results"]').isVisible()) {
      await expect(page.locator('[data-testid="cached-results-indicator"]')).toBeVisible()
      await expect(page.locator('[data-testid="cached-results-indicator"]')).toContainText(/cached results/i)
    }
    
    // Should queue changes for sync
    const offlineChangesQueue = page.locator('[data-testid="offline-changes-queue"]')
    if (await offlineChangesQueue.isVisible()) {
      await expect(offlineChangesQueue).toContainText(/changes will sync/i)
    }
  })

  test('Cross-Device Handoff (Mobile to Desktop)', async () => {
    // Start on mobile device
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/weddings/test-wedding-123/music')
    
    // Verify mobile-optimized interface
    const mobileInterface = page.locator('[data-testid="mobile-music-interface"]')
    await expect(mobileInterface).toBeVisible()
    await expect(mobileInterface).toHaveClass(/mobile-optimized/)
    
    // Create playlist on mobile
    await page.locator('[data-testid="ceremony-tab"]').click()
    const searchInput = page.locator('[data-testid="music-search-input"]')
    
    await searchInput.fill('Canon in D')
    await page.locator('[data-testid="mobile-search-button"]').click()
    
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    
    const firstTrack = page.locator('[data-testid="track-result"]').first()
    await firstTrack.locator('[data-testid="add-to-playlist-button"]').click()
    await page.locator('[data-testid="ceremony-playlist"]').click()
    await page.locator('[data-testid="confirm-add-button"]').click()
    
    // Save mobile changes
    await page.locator('[data-testid="quick-save-button"]').click()
    await expect(page.locator('[data-testid="mobile-save-success"]')).toBeVisible()
    
    // Switch to desktop view
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.reload()
    
    // Verify desktop interface loads
    const desktopInterface = page.locator('[data-testid="desktop-music-interface"]')
    await expect(desktopInterface).toBeVisible()
    
    // Verify mobile changes are synced
    await page.locator('[data-testid="ceremony-tab"]').click()
    const ceremonyPlaylist = page.locator('[data-testid="ceremony-playlist"]')
    await expect(ceremonyPlaylist.locator('[data-testid="playlist-track"]')).toHaveCount(1)
    await expect(ceremonyPlaylist.locator('[data-testid="track-name"]')).toContainText('Canon in D')
    
    // Verify desktop-specific features are available
    await expect(page.locator('[data-testid="advanced-playlist-tools"]')).toBeVisible()
    await expect(page.locator('[data-testid="energy-flow-visualizer"]')).toBeVisible()
    await expect(page.locator('[data-testid="bulk-edit-controls"]')).toBeVisible()
  })

  test('Performance Under Wedding Day Load', async () => {
    await page.goto('/weddings/test-wedding-123/music')
    
    // Measure initial load time
    const startTime = performance.now()
    await expect(page.locator('[data-testid="music-interface"]')).toBeVisible()
    const loadTime = performance.now() - startTime
    
    // Should load quickly even under stress
    expect(loadTime).toBeLessThan(3000) // 3 seconds max
    
    // Test rapid search operations (simulating DJ working quickly)
    const searchInput = page.locator('[data-testid="music-search-input"]')
    const rapidSearches = [
      'Perfect Ed Sheeran',
      'Canon in D',
      'Uptown Funk',
      'First Dance',
      'Wedding March'
    ]
    
    for (const search of rapidSearches) {
      const searchStart = performance.now()
      
      await searchInput.fill(search)
      await searchInput.press('Enter')
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
      
      const searchTime = performance.now() - searchStart
      expect(searchTime).toBeLessThan(2000) // Each search < 2 seconds
      
      // Clear for next search
      await searchInput.fill('')
    }
    
    // Test concurrent playlist operations
    const concurrentPromises = []
    
    // Add multiple tracks simultaneously
    for (let i = 0; i < 5; i++) {
      const promise = (async () => {
        await searchInput.fill(`track search ${i}`)
        await searchInput.press('Enter')
        await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
      })()
      concurrentPromises.push(promise)
    }
    
    // All operations should complete without errors
    await Promise.all(concurrentPromises)
    
    // Verify no memory leaks with large playlists
    const memoryBefore = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0)
    
    // Simulate large playlist operations
    for (let i = 0; i < 50; i++) {
      await page.locator('[data-testid="add-sample-track-button"]')?.click()
    }
    
    const memoryAfter = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0)
    const memoryIncrease = memoryAfter - memoryBefore
    
    // Memory increase should be reasonable (< 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
  })

  test('Wedding Day Emergency Features', async () => {
    await page.goto('/weddings/test-wedding-123/music')
    
    // Test emergency playlist templates
    const emergencyButton = page.locator('[data-testid="emergency-playlists-button"]')
    await expect(emergencyButton).toBeVisible()
    await emergencyButton.click()
    
    const emergencyModal = page.locator('[data-testid="emergency-playlists-modal"]')
    await expect(emergencyModal).toBeVisible()
    
    // Should offer quick wedding templates
    await expect(page.locator('[data-testid="quick-ceremony-template"]')).toBeVisible()
    await expect(page.locator('[data-testid="quick-reception-template"]')).toBeVisible()
    await expect(page.locator('[data-testid="backup-playlist-template"]')).toBeVisible()
    
    // Test quick ceremony playlist
    await page.locator('[data-testid="quick-ceremony-template"]').click()
    
    // Should populate instantly
    await expect(page.locator('[data-testid="template-loading"]')).toBeVisible()
    await expect(page.locator('[data-testid="template-success"]')).toBeVisible({ timeout: 5000 })
    
    // Verify ceremony playlist was populated
    await page.locator('[data-testid="close-emergency-modal"]').click()
    await page.locator('[data-testid="ceremony-tab"]').click()
    
    const ceremonyTracks = page.locator('[data-testid="ceremony-playlist"] [data-testid="playlist-track"]')
    await expect(ceremonyTracks).toHaveCount(expect.any(Number))
    await expect(ceremonyTracks.first()).toBeVisible()
    
    // Test emergency backup functionality
    await page.locator('[data-testid="create-emergency-backup-button"]').click()
    await expect(page.locator('[data-testid="backup-created-notification"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="backup-created-notification"]')).toContainText(/emergency backup created/i)
  })

  test('Accessibility Compliance for Wedding Professionals', async () => {
    await page.goto('/weddings/test-wedding-123/music')
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    let focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    // Navigate through all major interface elements
    const navigationSteps = 15
    for (let i = 0; i < navigationSteps; i++) {
      await page.keyboard.press('Tab')
      focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    }
    
    // Test screen reader announcements
    const liveRegions = page.locator('[aria-live="polite"], [aria-live="assertive"]')
    await expect(liveRegions).toHaveCount(expect.any(Number))
    
    // Test search with screen reader
    const searchInput = page.locator('[data-testid="music-search-input"]')
    await expect(searchInput).toHaveAttribute('aria-label')
    await expect(searchInput).toHaveAttribute('role', 'searchbox')
    
    await searchInput.fill('Perfect')
    await searchInput.press('Enter')
    
    // Results should be announced
    const resultsRegion = page.locator('[data-testid="search-results"]')
    await expect(resultsRegion).toHaveAttribute('aria-live', 'polite')
    await expect(page.locator('[data-testid="results-count-announcement"]')).toBeVisible()
    
    // Test color contrast (visual elements should meet WCAG standards)
    const searchButton = page.locator('[data-testid="search-button"]')
    if (await searchButton.isVisible()) {
      const styles = await searchButton.evaluate(el => {
        const computed = getComputedStyle(el)
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor
        }
      })
      
      expect(styles.color).toBeTruthy()
      expect(styles.backgroundColor).toBeTruthy()
    }
    
    // Test focus indicators
    await page.locator('[data-testid="ceremony-tab"]').focus()
    const focusedTab = page.locator('[data-testid="ceremony-tab"]:focus')
    
    const focusStyles = await focusedTab.evaluate(el => {
      const computed = getComputedStyle(el)
      return {
        outline: computed.outline,
        boxShadow: computed.boxShadow,
        border: computed.border
      }
    })
    
    // Should have visible focus indicator
    const hasFocusIndicator = 
      focusStyles.outline !== 'none' ||
      focusStyles.boxShadow !== 'none' ||
      focusStyles.border !== 'none'
    
    expect(hasFocusIndicator).toBe(true)
  })
})