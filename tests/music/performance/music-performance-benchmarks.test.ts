/**
 * WS-252 Music Database Integration - Performance Benchmarks
 * Team E - Round 1: Wedding Day Performance Requirements
 * 
 * CRITICAL PERFORMANCE STANDARDS:
 * - Search response time < 500ms (wedding day requirement)
 * - Mobile load time < 2 seconds (venue 3G networks)
 * - Audio preview load < 3 seconds (DJ evaluation)
 * - Playlist operations < 200ms (real-time responsiveness)
 * - Memory usage < 100MB sustained (mobile device limits)
 * - Concurrent user support (multiple DJs, 1000+ guests)
 */

import { test, expect, devices } from '@playwright/test'
import { performance } from 'perf_hooks'
import { loginAsDJ, setupMockSpotifyAPI } from '../helpers/wedding-test-helpers'

test.describe('Music System Performance Benchmarks', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupMockSpotifyAPI(page)
    await loginAsDJ(page, 'dj@performance-test.com', 'password123')
  })

  test('Search Performance - Wedding Day Requirements', async ({ page }) => {
    await page.goto('/weddings/performance-test/music')
    
    // Baseline search performance measurement
    const searchQueries = [
      'Perfect Ed Sheeran',
      'Canon in D Pachelbel',
      'Uptown Funk Bruno Mars',
      'First Dance Wedding Songs',
      'Reception Party Music'
    ]
    
    const performanceResults = []
    
    for (const query of searchQueries) {
      // Measure search performance
      const startTime = performance.now()
      
      const searchInput = page.locator('[data-testid="music-search-input"]')
      await searchInput.fill(query)
      await searchInput.press('Enter')
      
      // Wait for results to load
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
      const resultsVisible = page.locator('[data-testid="track-result"]').first()
      await expect(resultsVisible).toBeVisible()
      
      const endTime = performance.now()
      const searchDuration = endTime - startTime
      
      performanceResults.push({
        query,
        duration: searchDuration,
        success: searchDuration < 500 // Wedding day requirement
      })
      
      // Critical: All searches must complete within 500ms for wedding day use
      expect(searchDuration).toBeLessThan(500)
      
      // Clear search for next test
      await searchInput.fill('')
    }
    
    // Calculate average performance
    const averageSearchTime = performanceResults.reduce((sum, result) => sum + result.duration, 0) / performanceResults.length
    console.log(`Average search time: ${averageSearchTime.toFixed(2)}ms`)
    
    // Wedding day performance standard: average < 300ms
    expect(averageSearchTime).toBeLessThan(300)
    
    // All searches must pass the 500ms requirement
    const successRate = performanceResults.filter(r => r.success).length / performanceResults.length
    expect(successRate).toBe(1.0) // 100% success rate required
  })

  test('Mobile Performance - Venue Network Conditions', async ({ page, browser }) => {
    // Test on iPhone SE (minimum supported device)
    await page.setViewportSize(devices['iPhone SE'].viewport)
    
    // Simulate slow 3G network (common at wedding venues)
    const client = await page.context().newCDPSession(page)
    await client.send('Network.enable')
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 300 // 300ms latency
    })
    
    // Measure initial load time
    const startTime = performance.now()
    await page.goto('/weddings/mobile-test/music')
    
    // Wait for critical elements to load
    await expect(page.locator('[data-testid="mobile-music-interface"]')).toBeVisible()
    await expect(page.locator('[data-testid="music-search-input"]')).toBeVisible()
    
    const loadTime = performance.now() - startTime
    
    // Mobile load time requirement: < 2 seconds even on slow networks
    expect(loadTime).toBeLessThan(2000)
    console.log(`Mobile load time on 3G: ${loadTime.toFixed(2)}ms`)
    
    // Test mobile search performance
    const mobileSearchStart = performance.now()
    const searchInput = page.locator('[data-testid="music-search-input"]')
    await searchInput.fill('Perfect Ed Sheeran')
    await page.locator('[data-testid="mobile-search-button"]').click()
    
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    const mobileSearchTime = performance.now() - mobileSearchStart
    
    // Mobile search should still be responsive despite network conditions
    expect(mobileSearchTime).toBeLessThan(3000) // 3 seconds max on slow network
    
    // Test touch interaction responsiveness
    const trackResult = page.locator('[data-testid="track-result"]').first()
    const touchStart = performance.now()
    
    await trackResult.click()
    await expect(page.locator('[data-testid="track-details-modal"]') || page.locator('[data-testid="playlist-selection"]')).toBeVisible()
    
    const touchResponseTime = performance.now() - touchStart
    expect(touchResponseTime).toBeLessThan(300) // Immediate UI feedback
  })

  test('Audio Preview Performance', async ({ page }) => {
    await page.goto('/weddings/audio-test/music')
    
    // Search for tracks with audio previews
    const searchInput = page.locator('[data-testid="music-search-input"]')
    await searchInput.fill('Perfect Ed Sheeran')
    await searchInput.press('Enter')
    
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    
    const previewButton = page.locator('[data-testid="preview-button"]').first()
    
    if (await previewButton.isVisible()) {
      // Measure audio preview load time
      const previewStartTime = performance.now()
      await previewButton.click()
      
      // Wait for audio to be ready for playback
      await page.waitForFunction(() => {
        const audio = document.querySelector('audio')
        return audio && audio.readyState >= 2 // HAVE_CURRENT_DATA
      })
      
      const previewLoadTime = performance.now() - previewStartTime
      
      // Audio preview requirement: < 3 seconds for DJ evaluation
      expect(previewLoadTime).toBeLessThan(3000)
      console.log(`Audio preview load time: ${previewLoadTime.toFixed(2)}ms`)
      
      // Test smooth playback without buffering
      const audioElement = page.locator('audio')
      const canPlayThrough = await audioElement.evaluate((audio: HTMLAudioElement) => {
        return audio.readyState === 4 // HAVE_ENOUGH_DATA
      })
      
      // Should have enough data for smooth playback
      expect(canPlayThrough).toBe(true)
      
      // Test multiple preview switches (DJ comparing tracks)
      for (let i = 0; i < 3; i++) {
        await page.locator('[data-testid="pause-button"]').click()
        await page.waitForTimeout(100)
        await page.locator('[data-testid="play-button"]').click()
        await page.waitForTimeout(500)
      }
      
      // Should remain responsive during multiple preview operations
      const playButton = page.locator('[data-testid="play-button"], [data-testid="pause-button"]')
      await expect(playButton).toBeVisible()
    }
  })

  test('Playlist Operations Performance', async ({ page }) => {
    await page.goto('/weddings/playlist-perf-test/music')
    
    // Build ceremony playlist for performance testing
    await page.locator('[data-testid="ceremony-tab"]').click()
    
    const playlistOperations = []
    
    // Add multiple tracks and measure performance
    const tracksToAdd = ['Perfect Ed Sheeran', 'Canon in D', 'Ave Maria', 'Here Comes the Sun', 'A Thousand Years']
    
    for (const trackQuery of tracksToAdd) {
      const addTrackStart = performance.now()
      
      // Search for track
      const searchInput = page.locator('[data-testid="music-search-input"]')
      await searchInput.fill(trackQuery)
      await searchInput.press('Enter')
      
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
      
      // Add to playlist
      const addButton = page.locator('[data-testid="track-result"] [data-testid="add-to-playlist-button"]').first()
      await addButton.click()
      
      await page.locator('[data-testid="ceremony-playlist"]').click()
      await page.locator('[data-testid="confirm-add-button"]').click()
      
      // Wait for playlist update
      await expect(page.locator('[data-testid="playlist-updated-notification"]')).toBeVisible()
      
      const addTrackTime = performance.now() - addTrackStart
      playlistOperations.push({ operation: 'add', duration: addTrackTime })
      
      // Each playlist operation should be < 200ms for real-time responsiveness
      expect(addTrackTime).toBeLessThan(200)
      
      await searchInput.fill('') // Clear for next search
    }
    
    // Test drag and drop reordering performance
    const ceremonySection = page.locator('[data-testid="ceremony-section"]')
    const tracks = ceremonySection.locator('[data-testid="playlist-track"]')
    
    const reorderStart = performance.now()
    
    const firstTrack = tracks.nth(0)
    const thirdTrack = tracks.nth(2)
    
    await firstTrack.dragTo(thirdTrack)
    
    // Wait for reorder completion
    await page.waitForTimeout(500)
    
    const reorderTime = performance.now() - reorderStart
    playlistOperations.push({ operation: 'reorder', duration: reorderTime })
    
    // Drag and drop should be immediate for DJ workflow
    expect(reorderTime).toBeLessThan(200)
    
    // Calculate average playlist operation time
    const avgOperationTime = playlistOperations.reduce((sum, op) => sum + op.duration, 0) / playlistOperations.length
    console.log(`Average playlist operation time: ${avgOperationTime.toFixed(2)}ms`)
    
    expect(avgOperationTime).toBeLessThan(150) // Excellent responsiveness target
  })

  test('Memory Usage - Sustained Wedding Day Use', async ({ page }) => {
    await page.goto('/weddings/memory-test/music')
    
    // Get initial memory baseline
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    console.log(`Initial memory usage: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`)
    
    // Simulate extended DJ session with multiple searches and playlist building
    const searchQueries = [
      'wedding ceremony music', 'first dance songs', 'cocktail hour jazz',
      'reception party hits', 'slow dance classics', 'wedding processional',
      'recessional music', 'dinner background music', 'father daughter dance',
      'mother son dance', 'bouquet toss songs', 'last dance wedding'
    ]
    
    const searchInput = page.locator('[data-testid="music-search-input"]')
    
    // Perform extensive searching (simulating 2-hour wedding planning session)
    for (let round = 0; round < 3; round++) {
      for (const query of searchQueries) {
        await searchInput.fill(query)
        await searchInput.press('Enter')
        await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
        
        // Add some tracks to playlists
        const addButtons = page.locator('[data-testid="add-to-playlist-button"]')
        const buttonCount = await addButtons.count()
        
        if (buttonCount > 0) {
          // Add first two tracks found
          for (let i = 0; i < Math.min(2, buttonCount); i++) {
            await addButtons.nth(i).click()
            await page.locator('[data-testid="reception-playlist"]').click()
            await page.locator('[data-testid="confirm-add-button"]').click()
          }
        }
        
        await searchInput.fill('') // Clear search
        
        // Small delay to simulate real usage
        await page.waitForTimeout(100)
      }
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc()
      }
    })
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    const memoryIncrease = finalMemory - initialMemory
    const memoryIncreaseMB = memoryIncrease / 1024 / 1024
    
    console.log(`Final memory usage: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`)
    
    // Memory requirement: < 100MB sustained increase for mobile compatibility
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // 100MB limit
    
    // Memory efficiency: increase should be < 50MB for excellent performance
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB target
  })

  test('Concurrent User Load Testing', async ({ browser }) => {
    // Simulate multiple DJs using the system simultaneously
    const concurrentUsers = 5
    const promises = []
    
    for (let i = 0; i < concurrentUsers; i++) {
      const promise = (async () => {
        const context = await browser.newContext()
        const page = await context.newPage()
        
        await setupMockSpotifyAPI(page)
        await loginAsDJ(page, `dj${i}@concurrent-test.com`, 'password123')
        
        const startTime = performance.now()
        await page.goto(`/weddings/concurrent-test-${i}/music`)
        
        // Each user performs typical DJ operations
        const searchInput = page.locator('[data-testid="music-search-input"]')
        
        // Stagger searches to simulate real usage
        await page.waitForTimeout(i * 200)
        
        const userQueries = [
          `Perfect Ed Sheeran user ${i}`,
          `Canon in D user ${i}`,
          `Reception music user ${i}`
        ]
        
        for (const query of userQueries) {
          const queryStart = performance.now()
          
          await searchInput.fill(query)
          await searchInput.press('Enter')
          await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
          
          const queryTime = performance.now() - queryStart
          
          // Each user should still get responsive performance
          expect(queryTime).toBeLessThan(1000) // 1 second max under load
        }
        
        const totalTime = performance.now() - startTime
        await context.close()
        
        return {
          userId: i,
          totalTime,
          success: totalTime < 10000 // 10 seconds max for complete session
        }
      })()
      
      promises.push(promise)
    }
    
    // Wait for all concurrent users to complete
    const results = await Promise.all(promises)
    
    // All users should complete successfully
    results.forEach(result => {
      expect(result.success).toBe(true)
      console.log(`User ${result.userId} completed in ${result.totalTime.toFixed(2)}ms`)
    })
    
    // Calculate average performance under load
    const avgTime = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length
    console.log(`Average time under concurrent load: ${avgTime.toFixed(2)}ms`)
    
    // System should handle concurrent users without significant degradation
    expect(avgTime).toBeLessThan(8000) // 8 seconds average
  })

  test('Wedding Day Peak Load Simulation', async ({ page }) => {
    await page.goto('/weddings/peak-load-test/music')
    
    // Simulate Saturday wedding rush (peak usage scenario)
    // Multiple operations happening simultaneously:
    // - DJ searching for music
    // - Couple viewing playlist
    // - Venue coordinator checking timing
    // - Wedding planner making last-minute changes
    
    const peakLoadOperations = []
    
    // Start multiple concurrent operations
    const operations = [
      // DJ searching rapidly for reception music
      (async () => {
        const searchInput = page.locator('[data-testid="music-search-input"]')
        const djSearches = ['party music', 'dance hits', 'wedding reception', 'crowd pleasers']
        
        for (const search of djSearches) {
          const start = performance.now()
          await searchInput.fill(search)
          await searchInput.press('Enter')
          await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
          peakLoadOperations.push({ op: 'search', time: performance.now() - start })
          await searchInput.fill('')
        }
      })(),
      
      // Playlist manipulation operations
      (async () => {
        await page.locator('[data-testid="reception-tab"]').click()
        
        for (let i = 0; i < 5; i++) {
          const start = performance.now()
          
          // Simulate adding tracks to reception playlist
          await page.locator('[data-testid="quick-add-popular-track"]')?.click()
          await page.waitForTimeout(100)
          
          peakLoadOperations.push({ op: 'playlist_add', time: performance.now() - start })
        }
      })(),
      
      // Real-time updates and sync operations
      (async () => {
        for (let i = 0; i < 3; i++) {
          const start = performance.now()
          
          // Force sync with server (simulate real-time updates)
          await page.locator('[data-testid="sync-playlists-button"]')?.click()
          await page.waitForTimeout(200)
          
          peakLoadOperations.push({ op: 'sync', time: performance.now() - start })
        }
      })()
    ]
    
    // Execute all peak load operations concurrently
    await Promise.all(operations)
    
    // Analyze peak load performance
    const searchOperations = peakLoadOperations.filter(op => op.op === 'search')
    const playlistOperations = peakLoadOperations.filter(op => op.op === 'playlist_add')
    const syncOperations = peakLoadOperations.filter(op => op.op === 'sync')
    
    if (searchOperations.length > 0) {
      const avgSearchTime = searchOperations.reduce((sum, op) => sum + op.time, 0) / searchOperations.length
      console.log(`Average search time under peak load: ${avgSearchTime.toFixed(2)}ms`)
      expect(avgSearchTime).toBeLessThan(800) // Slight degradation acceptable under peak load
    }
    
    if (playlistOperations.length > 0) {
      const avgPlaylistTime = playlistOperations.reduce((sum, op) => sum + op.time, 0) / playlistOperations.length
      console.log(`Average playlist operation time under peak load: ${avgPlaylistTime.toFixed(2)}ms`)
      expect(avgPlaylistTime).toBeLessThan(400)
    }
    
    // Verify system remains responsive during peak load
    const responsiveCheck = performance.now()
    await page.locator('[data-testid="ceremony-tab"]').click()
    await expect(page.locator('[data-testid="ceremony-playlist"]')).toBeVisible()
    const responseTime = performance.now() - responsiveCheck
    
    // UI should remain responsive even under load
    expect(responseTime).toBeLessThan(300)
    
    console.log(`UI responsiveness under peak load: ${responseTime.toFixed(2)}ms`)
  })

  test('Network Resilience Performance', async ({ page }) => {
    await page.goto('/weddings/network-test/music')
    
    // Test performance under various network conditions common at wedding venues
    
    // 1. Test with intermittent connectivity
    let requestCount = 0
    await page.route('**/*api/music/search*', route => {
      requestCount++
      
      // Simulate intermittent failures (20% failure rate)
      if (requestCount % 5 === 0) {
        return route.abort()
      }
      
      // Add realistic delay for venue WiFi
      setTimeout(() => route.continue(), 100 + Math.random() * 200)
    })
    
    const searchInput = page.locator('[data-testid="music-search-input"]')
    
    // Multiple searches with network issues
    const networkTestQueries = ['Perfect Ed Sheeran', 'Canon in D', 'Wedding Dance']
    const networkResults = []
    
    for (const query of networkTestQueries) {
      const start = performance.now()
      
      try {
        await searchInput.fill(query)
        await searchInput.press('Enter')
        
        // Should either show results or graceful error handling
        const results = page.locator('[data-testid="search-results"]')
        const errorMessage = page.locator('[data-testid="search-error"]')
        const offlineMode = page.locator('[data-testid="offline-mode"]')
        
        await Promise.race([
          expect(results).toBeVisible(),
          expect(errorMessage).toBeVisible(),
          expect(offlineMode).toBeVisible()
        ])
        
        const duration = performance.now() - start
        networkResults.push({ query, duration, success: true })
        
      } catch (error) {
        const duration = performance.now() - start
        networkResults.push({ query, duration, success: false })
        
        // Even failures should resolve quickly with proper error handling
        expect(duration).toBeLessThan(5000) // 5 second timeout
      }
      
      await searchInput.fill('')
    }
    
    // Verify resilient performance
    const successRate = networkResults.filter(r => r.success).length / networkResults.length
    console.log(`Network resilience success rate: ${(successRate * 100).toFixed(1)}%`)
    
    // Should maintain reasonable success rate even with network issues
    expect(successRate).toBeGreaterThan(0.6) // 60% minimum success rate
    
    // Average response time should account for retries and timeouts
    const avgTime = networkResults.reduce((sum, r) => sum + r.duration, 0) / networkResults.length
    expect(avgTime).toBeLessThan(3000) // 3 seconds average including error handling
  })
})