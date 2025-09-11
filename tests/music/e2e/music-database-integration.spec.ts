/**
 * Music Database Integration E2E Tests for WS-252
 * Comprehensive Playwright tests covering all music functionality
 */

import { test, expect, type Page } from '@playwright/test';

// Test data
const mockWeddingData = {
  weddingId: 'test-wedding-123',
  couple: {
    name1: 'Alice Johnson',
    name2: 'Bob Smith'
  },
  weddingDate: '2024-06-15',
  venue: 'Grand Ballroom'
};

const mockMusicSearchResults = [
  {
    id: 'track-1',
    title: 'Perfect',
    artist: 'Ed Sheeran',
    album: 'Divide',
    duration: 263,
    appropriateness_score: 0.95,
    energy_level: 0.6,
    wedding_categories: ['ceremony', 'first_dance']
  },
  {
    id: 'track-2',
    title: 'All of Me',
    artist: 'John Legend',
    album: 'Love in the Future',
    duration: 269,
    appropriateness_score: 0.98,
    energy_level: 0.5,
    wedding_categories: ['ceremony', 'first_dance', 'reception']
  }
];

// Test utilities
async function navigateToMusicDashboard(page: Page) {
  await page.goto('/dashboard');
  await page.click('[data-testid="nav-music-database"]');
  await expect(page).toHaveURL('/dashboard/music');
}

async function mockApiResponses(page: Page) {
  // Mock music search API
  await page.route('**/api/music/search', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          tracks: mockMusicSearchResults,
          total: mockMusicSearchResults.length,
          page: 1,
          limit: 20
        }
      }
    });
  });

  // Mock appropriateness analysis API
  await page.route('**/api/music/analyze-appropriateness', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          score: 0.95,
          categories: ['ceremony', 'reception'],
          issues: [],
          reasoning: 'This track is highly appropriate for wedding celebrations',
          energy_level: 0.6,
          confidence: 0.9
        }
      }
    });
  });

  // Mock playlist creation API
  await page.route('**/api/music/playlists', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          id: 'playlist-123',
          name: 'Wedding Ceremony',
          tracks: mockMusicSearchResults,
          created_at: new Date().toISOString()
        }
      }
    });
  });
}

// Test Suite: Music Database Integration
test.describe('WS-252: Music Database Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication and wedding context
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-token', 'mock-jwt-token');
      window.localStorage.setItem('current-wedding', JSON.stringify({
        id: 'test-wedding-123',
        couple_name: 'Alice & Bob',
        wedding_date: '2024-06-15'
      }));
    });

    await mockApiResponses(page);
  });

  // Core Functionality Tests
  test.describe('Core Music Database Functionality', () => {
    test('should load music dashboard with statistics', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Verify main dashboard elements
      await expect(page.locator('[data-testid="music-dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="music-stats-cards"]')).toBeVisible();
      
      // Check statistics cards
      await expect(page.locator('[data-testid="stat-total-tracks"]')).toContainText('0');
      await expect(page.locator('[data-testid="stat-total-playlists"]')).toContainText('0');
      await expect(page.locator('[data-testid="stat-total-requests"]')).toContainText('0');
    });

    test('should perform music search across all providers', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Click on search tab
      await page.click('[data-testid="provider-tab-spotify"]');

      // Enter search query
      await page.fill('[data-testid="music-search-input"]', 'Perfect Ed Sheeran');
      await page.press('[data-testid="music-search-input"]', 'Enter');

      // Wait for search results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="track-result-track-1"]')).toBeVisible();
      
      // Verify track information
      await expect(page.locator('[data-testid="track-title-track-1"]')).toContainText('Perfect');
      await expect(page.locator('[data-testid="track-artist-track-1"]')).toContainText('Ed Sheeran');
      await expect(page.locator('[data-testid="appropriateness-score-track-1"]')).toContainText('95%');
    });

    test('should switch between music providers', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Test provider switching
      await page.click('[data-testid="provider-tab-apple"]');
      await expect(page.locator('[data-testid="search-provider-apple"]')).toBeVisible();

      await page.click('[data-testid="provider-tab-youtube"]');
      await expect(page.locator('[data-testid="search-provider-youtube"]')).toBeVisible();

      await page.click('[data-testid="provider-tab-spotify"]');
      await expect(page.locator('[data-testid="search-provider-spotify"]')).toBeVisible();
    });

    test('should filter by wedding categories', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Select ceremony category
      await page.click('[data-testid="category-filter-ceremony"]');
      await expect(page.locator('[data-testid="category-filter-ceremony"]')).toHaveClass(/selected/);

      // Select reception category
      await page.click('[data-testid="category-filter-reception"]');
      await expect(page.locator('[data-testid="category-filter-reception"]')).toHaveClass(/selected/);

      // Verify filtering affects search
      await page.fill('[data-testid="music-search-input"]', 'wedding songs');
      await page.press('[data-testid="music-search-input"]', 'Enter');
      
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    });
  });

  // AI-Powered Appropriateness Analysis Tests
  test.describe('AI Appropriateness Analysis', () => {
    test('should analyze track appropriateness for weddings', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Search for a track
      await page.fill('[data-testid="music-search-input"]', 'Perfect');
      await page.press('[data-testid="music-search-input"]', 'Enter');

      // Wait for results and click analyze button
      await page.click('[data-testid="analyze-appropriateness-track-1"]');

      // Verify analysis modal opens
      await expect(page.locator('[data-testid="appropriateness-analysis-modal"]')).toBeVisible();
      
      // Check analysis results
      await expect(page.locator('[data-testid="appropriateness-score"]')).toContainText('95%');
      await expect(page.locator('[data-testid="appropriateness-reasoning"]')).toContainText('highly appropriate');
      await expect(page.locator('[data-testid="suggested-categories"]')).toContainText('ceremony');
      await expect(page.locator('[data-testid="energy-level"]')).toBeVisible();
      await expect(page.locator('[data-testid="ai-confidence"]')).toContainText('90%');
    });

    test('should show contextual appropriateness based on wedding details', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Fill wedding context
      await page.click('[data-testid="wedding-context-toggle"]');
      await page.selectOption('[data-testid="venue-type-select"]', 'church');
      await page.selectOption('[data-testid="guest-age-range-select"]', '50+');

      // Search and analyze
      await page.fill('[data-testid="music-search-input"]', 'party songs');
      await page.press('[data-testid="music-search-input"]', 'Enter');
      await page.click('[data-testid="analyze-appropriateness-track-1"]');

      // Verify contextual analysis
      await expect(page.locator('[data-testid="appropriateness-analysis-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="context-considerations"]')).toContainText('church venue');
    });
  });

  // Vague Song Request Resolution Tests
  test.describe('Vague Song Request Resolution', () => {
    test('should resolve vague song descriptions', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Click on song request resolver
      await page.click('[data-testid="song-request-resolver-tab"]');

      // Enter vague description
      await page.fill(
        '[data-testid="vague-request-input"]', 
        'that romantic song from the movie with Ryan Gosling'
      );
      await page.click('[data-testid="resolve-request-btn"]');

      // Verify resolution results
      await expect(page.locator('[data-testid="resolution-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="suggested-matches"]')).toBeVisible();
      
      // Check confidence scores
      await expect(page.locator('[data-testid="match-confidence"]')).toBeVisible();
      await expect(page.locator('[data-testid="resolution-reasoning"]')).toBeVisible();
    });

    test('should handle multiple interpretation possibilities', async ({ page }) => {
      await navigateToMusicDashboard(page);
      await page.click('[data-testid="song-request-resolver-tab"]');

      // Enter ambiguous request
      await page.fill(
        '[data-testid="vague-request-input"]', 
        'that old song about love'
      );
      await page.click('[data-testid="resolve-request-btn"]');

      // Verify multiple suggestions
      await expect(page.locator('[data-testid="multiple-suggestions"]')).toBeVisible();
      await expect(page.locator('[data-testid="suggestion-item"]')).toHaveCount(3, { timeout: 5000 });
    });

    test('should allow refinement of vague requests', async ({ page }) => {
      await navigateToMusicDashboard(page);
      await page.click('[data-testid="song-request-resolver-tab"]');

      // Initial vague request
      await page.fill('[data-testid="vague-request-input"]', 'slow dance song');
      await page.click('[data-testid="resolve-request-btn"]');

      // Add refinement
      await page.click('[data-testid="refine-request-btn"]');
      await page.fill('[data-testid="refinement-input"]', 'from the 90s');
      await page.click('[data-testid="apply-refinement-btn"]');

      // Verify refined results
      await expect(page.locator('[data-testid="refined-results"]')).toBeVisible();
    });
  });

  // Audio Preview Tests
  test.describe('Audio Preview Functionality', () => {
    test('should preview audio tracks', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Search for track
      await page.fill('[data-testid="music-search-input"]', 'Perfect');
      await page.press('[data-testid="music-search-input"]', 'Enter');

      // Click preview button
      await page.click('[data-testid="preview-track-track-1"]');

      // Verify audio preview
      await expect(page.locator('[data-testid="audio-preview-player"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-play-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-volume-control"]')).toBeVisible();
    });

    test('should control audio playback', async ({ page }) => {
      await navigateToMusicDashboard(page);
      await page.fill('[data-testid="music-search-input"]', 'Perfect');
      await page.press('[data-testid="music-search-input"]', 'Enter');
      await page.click('[data-testid="preview-track-track-1"]');

      // Test play/pause controls
      await page.click('[data-testid="preview-play-button"]');
      await expect(page.locator('[data-testid="preview-pause-button"]')).toBeVisible();

      await page.click('[data-testid="preview-pause-button"]');
      await expect(page.locator('[data-testid="preview-play-button"]')).toBeVisible();
    });

    test('should show waveform visualization during preview', async ({ page }) => {
      await navigateToMusicDashboard(page);
      await page.fill('[data-testid="music-search-input"]', 'Perfect');
      await page.press('[data-testid="music-search-input"]', 'Enter');
      await page.click('[data-testid="preview-track-track-1"]');

      // Verify waveform is shown
      await expect(page.locator('[data-testid="waveform-visualization"]')).toBeVisible();
      await expect(page.locator('[data-testid="waveform-canvas"]')).toBeVisible();
    });
  });

  // Drag-and-Drop Playlist Builder Tests
  test.describe('Drag-and-Drop Playlist Builder', () => {
    test('should create new playlists', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Click on playlist builder tab
      await page.click('[data-testid="playlist-builder-tab"]');

      // Create new playlist
      await page.click('[data-testid="create-playlist-btn"]');
      await page.fill('[data-testid="playlist-name-input"]', 'Wedding Ceremony');
      await page.selectOption('[data-testid="playlist-category-select"]', 'ceremony');
      await page.click('[data-testid="confirm-create-playlist"]');

      // Verify playlist created
      await expect(page.locator('[data-testid="playlist-Wedding Ceremony"]')).toBeVisible();
      await expect(page.locator('[data-testid="playlist-empty-state"]')).toBeVisible();
    });

    test('should drag and drop tracks into playlists', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Create playlist first
      await page.click('[data-testid="playlist-builder-tab"]');
      await page.click('[data-testid="create-playlist-btn"]');
      await page.fill('[data-testid="playlist-name-input"]', 'Test Playlist');
      await page.click('[data-testid="confirm-create-playlist"]');

      // Search for tracks
      await page.click('[data-testid="music-search-tab"]');
      await page.fill('[data-testid="music-search-input"]', 'Perfect');
      await page.press('[data-testid="music-search-input"]', 'Enter');

      // Drag track to playlist
      const trackElement = page.locator('[data-testid="track-result-track-1"]');
      const playlistElement = page.locator('[data-testid="playlist-Test Playlist"]');

      await trackElement.dragTo(playlistElement);

      // Verify track added to playlist
      await page.click('[data-testid="playlist-builder-tab"]');
      await expect(page.locator('[data-testid="playlist-track-track-1"]')).toBeVisible();
    });

    test('should reorder tracks within playlists', async ({ page }) => {
      await navigateToMusicDashboard(page);
      await page.click('[data-testid="playlist-builder-tab"]');

      // Assume playlist with multiple tracks exists
      const firstTrack = page.locator('[data-testid="playlist-track-track-1"]');
      const secondTrack = page.locator('[data-testid="playlist-track-track-2"]');

      // Drag first track below second track
      await firstTrack.dragTo(secondTrack, { targetPosition: { x: 0, y: 50 } });

      // Verify reordering
      await expect(page.locator('[data-testid="playlist-tracks"] > div:first-child')).toContainText('All of Me');
      await expect(page.locator('[data-testid="playlist-tracks"] > div:nth-child(2)')).toContainText('Perfect');
    });

    test('should organize tracks by wedding timeline segments', async ({ page }) => {
      await navigateToMusicDashboard(page);
      await page.click('[data-testid="playlist-builder-tab"]');

      // Select timeline view
      await page.click('[data-testid="timeline-view-toggle"]');

      // Verify timeline segments
      await expect(page.locator('[data-testid="timeline-segment-prelude"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeline-segment-processional"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeline-segment-ceremony"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeline-segment-recessional"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeline-segment-cocktail"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeline-segment-reception"]')).toBeVisible();
    });

    test('should export playlists in multiple formats', async ({ page }) => {
      await navigateToMusicDashboard(page);
      await page.click('[data-testid="playlist-builder-tab"]');

      // Click export button
      await page.click('[data-testid="export-playlist-btn"]');

      // Verify export options
      await expect(page.locator('[data-testid="export-format-spotify"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-format-apple"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-format-pdf"]')).toBeVisible();

      // Test PDF export
      await page.click('[data-testid="export-format-pdf"]');
      // Note: In real tests, you'd verify download started
    });
  });

  // Mobile Responsiveness Tests
  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await navigateToMusicDashboard(page);

      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-music-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-search-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-provider-tabs"]')).toBeVisible();
    });

    test('should support touch interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToMusicDashboard(page);

      // Test touch tap on search
      await page.tap('[data-testid="mobile-search-input"]');
      await expect(page.locator('[data-testid="mobile-search-input"]')).toBeFocused();

      // Test touch swipe for provider switching
      const providerTabs = page.locator('[data-testid="mobile-provider-tabs"]');
      await providerTabs.evaluate(el => {
        el.dispatchEvent(new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 1, target: el, clientX: 200, clientY: 100 })]
        }));
        el.dispatchEvent(new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 1, target: el, clientX: 100, clientY: 100 })]
        }));
        el.dispatchEvent(new TouchEvent('touchend', { touches: [] }));
      });
    });
  });

  // Performance Tests
  test.describe('Performance Requirements', () => {
    test('should load within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await navigateToMusicDashboard(page);
      await expect(page.locator('[data-testid="music-dashboard-header"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should handle large search results efficiently', async ({ page }) => {
      // Mock large result set
      await page.route('**/api/music/search', async (route) => {
        const largeResults = Array.from({ length: 100 }, (_, i) => ({
          id: `track-${i}`,
          title: `Track ${i}`,
          artist: `Artist ${i}`,
          appropriateness_score: 0.8 + (i % 20) / 100
        }));

        await route.fulfill({
          json: {
            success: true,
            data: { tracks: largeResults, total: largeResults.length }
          }
        });
      });

      await navigateToMusicDashboard(page);
      await page.fill('[data-testid="music-search-input"]', 'test');
      
      const searchStart = Date.now();
      await page.press('[data-testid="music-search-input"]', 'Enter');
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      
      const searchTime = Date.now() - searchStart;
      expect(searchTime).toBeLessThan(2000); // Should render within 2 seconds
    });
  });

  // Integration Tests
  test.describe('API Integration', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/music/search', async (route) => {
        await route.fulfill({
          status: 500,
          json: { success: false, error: 'Internal server error' }
        });
      });

      await navigateToMusicDashboard(page);
      await page.fill('[data-testid="music-search-input"]', 'test');
      await page.press('[data-testid="music-search-input"]', 'Enter');

      // Verify error handling
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to search');
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle rate limiting', async ({ page }) => {
      // Mock rate limit response
      await page.route('**/api/music/search', async (route) => {
        await route.fulfill({
          status: 429,
          json: { success: false, error: 'Rate limit exceeded' }
        });
      });

      await navigateToMusicDashboard(page);
      await page.fill('[data-testid="music-search-input"]', 'test');
      await page.press('[data-testid="music-search-input"]', 'Enter');

      // Verify rate limit handling
      await expect(page.locator('[data-testid="rate-limit-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="rate-limit-message"]')).toContainText('Too many requests');
    });

    test('should handle network timeouts', async ({ page }) => {
      // Mock timeout
      await page.route('**/api/music/search', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 30000)); // Long delay
        await route.fulfill({ json: { success: true, data: { tracks: [] } } });
      });

      await navigateToMusicDashboard(page);
      await page.fill('[data-testid="music-search-input"]', 'test');
      await page.press('[data-testid="music-search-input"]', 'Enter');

      // Should show timeout message within 10 seconds
      await expect(page.locator('[data-testid="timeout-message"]')).toBeVisible({ timeout: 10000 });
    });
  });

  // Accessibility Tests
  test.describe('Accessibility Compliance', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Test tab navigation
      await page.press('body', 'Tab');
      await expect(page.locator('[data-testid="music-search-input"]')).toBeFocused();

      await page.press('body', 'Tab');
      await expect(page.locator('[data-testid="provider-tab-spotify"]')).toBeFocused();

      await page.press('body', 'Tab');
      await expect(page.locator('[data-testid="provider-tab-apple"]')).toBeFocused();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Check ARIA labels
      await expect(page.locator('[data-testid="music-search-input"]')).toHaveAttribute('aria-label', 'Search for music tracks');
      await expect(page.locator('[data-testid="provider-tabs"]')).toHaveAttribute('role', 'tablist');
      await expect(page.locator('[data-testid="search-results"]')).toHaveAttribute('aria-live', 'polite');
    });

    test('should support screen readers', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Verify semantic HTML structure
      await expect(page.locator('main[role="main"]')).toBeVisible();
      await expect(page.locator('nav[aria-label="Music provider tabs"]')).toBeVisible();
      await expect(page.locator('section[aria-labelledby="search-results-heading"]')).toBeVisible();
    });
  });

  // Security Tests
  test.describe('Security Validation', () => {
    test('should sanitize search inputs', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Try malicious input
      await page.fill('[data-testid="music-search-input"]', '<script>alert("xss")</script>');
      await page.press('[data-testid="music-search-input"]', 'Enter');

      // Verify input is sanitized (no script execution)
      const alerts = [];
      page.on('dialog', dialog => {
        alerts.push(dialog.message());
        dialog.dismiss();
      });

      await page.waitForTimeout(1000);
      expect(alerts).toHaveLength(0);
    });

    test('should validate CSRF protection', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Intercept requests to check CSRF headers
      let hasCSRFToken = false;
      page.on('request', request => {
        if (request.method() === 'POST') {
          hasCSRFToken = request.headers()['x-csrf-token'] !== undefined;
        }
      });

      // Trigger a POST request (like creating a playlist)
      await page.click('[data-testid="playlist-builder-tab"]');
      await page.click('[data-testid="create-playlist-btn"]');
      await page.fill('[data-testid="playlist-name-input"]', 'Security Test');
      await page.click('[data-testid="confirm-create-playlist"]');

      expect(hasCSRFToken).toBe(true);
    });

    test('should enforce rate limiting on client side', async ({ page }) => {
      await navigateToMusicDashboard(page);

      // Rapid-fire search requests
      for (let i = 0; i < 10; i++) {
        await page.fill('[data-testid="music-search-input"]', `query ${i}`);
        await page.press('[data-testid="music-search-input"]', 'Enter');
        await page.waitForTimeout(100);
      }

      // Should show rate limit warning
      await expect(page.locator('[data-testid="rate-limit-warning"]')).toBeVisible();
    });
  });
});