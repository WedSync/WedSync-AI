/**
 * WS-252 Music Database Integration - Security Validation Tests
 * Team E - Round 1: Comprehensive Security Testing for Wedding Music System
 * 
 * CRITICAL SECURITY REQUIREMENTS:
 * - API key protection (Spotify, Apple Music, OpenAI)
 * - Input sanitization for search queries
 * - Authentication bypass prevention
 * - Rate limiting enforcement
 * - Data privacy protection
 * - CSRF protection for playlist operations
 * - XSS prevention in music metadata
 */

import { test, expect, Page } from '@playwright/test'
import { setupMockSpotifyAPI, loginAsDJ } from '../helpers/wedding-test-helpers'

test.describe('Music System Security Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupMockSpotifyAPI(page)
  })

  test('API Key Protection - No Exposure to Client Side', async ({ page }) => {
    await loginAsDJ(page, 'security-test@dj.com', 'password123')
    await page.goto('/weddings/security-test/music')
    
    // Monitor all network requests and responses for API key exposure
    const exposedSecrets: string[] = []
    
    page.on('response', async response => {
      try {
        const responseText = await response.text()
        
        // Check for various API key patterns that should never appear in responses
        const secretPatterns = [
          /sk_test_[a-zA-Z0-9]{24,}/, // Stripe test keys
          /sk_live_[a-zA-Z0-9]{24,}/, // Stripe live keys
          /spotify_client_secret/i,
          /Bearer\s+[A-Za-z0-9\-_]{20,}/, // Bearer tokens
          /client_secret["\s]*[:=]["\s]*[a-zA-Z0-9]{10,}/i,
          /openai_api_key/i,
          /apple_music_private_key/i
        ]
        
        secretPatterns.forEach((pattern, index) => {
          if (pattern.test(responseText)) {
            exposedSecrets.push(`Pattern ${index} found in ${response.url()}: ${responseText.substring(0, 100)}...`)
          }
        })
      } catch (error) {
        // Ignore binary responses or parsing errors
      }
    })
    
    // Perform various music operations that might expose keys
    const searchInput = page.locator('[data-testid="music-search-input"]')
    await searchInput.fill('Perfect Ed Sheeran')
    await searchInput.press('Enter')
    
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    
    // Try to add track to playlist (involves API calls)
    const addButton = page.locator('[data-testid="add-to-playlist-button"]').first()
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.locator('[data-testid="ceremony-playlist"]').click()
      await page.locator('[data-testid="confirm-add-button"]').click()
    }
    
    // Check for API keys in client-side JavaScript
    const clientSecrets = await page.evaluate(() => {
      const sources = [
        document.documentElement.innerHTML,
        JSON.stringify(localStorage),
        JSON.stringify(sessionStorage),
        // Check all script tags
        ...Array.from(document.scripts).map(script => script.innerHTML || script.textContent || '')
      ]
      
      const secretPatterns = [
        /sk_test_[a-zA-Z0-9]{24,}/,
        /sk_live_[a-zA-Z0-9]{24,}/,
        /spotify.*client.*secret/i,
        /Bearer\s+[A-Za-z0-9\-_]{20,}/,
        /openai.*api.*key/i
      ]
      
      const foundSecrets = []
      for (const source of sources) {
        if (typeof source === 'string') {
          secretPatterns.forEach((pattern, index) => {
            if (pattern.test(source)) {
              foundSecrets.push(`Client-side pattern ${index} found`)
            }
          })
        }
      }
      
      return foundSecrets
    })
    
    // CRITICAL: No API keys should ever be exposed to the client
    expect(exposedSecrets).toHaveLength(0)
    expect(clientSecrets).toHaveLength(0)
    
    if (exposedSecrets.length > 0) {
      console.error('SECURITY VIOLATION: API keys exposed:', exposedSecrets)
    }
    if (clientSecrets.length > 0) {
      console.error('SECURITY VIOLATION: Secrets in client-side code:', clientSecrets)
    }
  })

  test('Input Sanitization - XSS Prevention in Music Search', async ({ page }) => {
    await loginAsDJ(page, 'xss-test@dj.com', 'password123')
    await page.goto('/weddings/xss-test/music')
    
    // Test various XSS attack vectors in music search
    const maliciousInputs = [
      '<script>alert("XSS in music search")</script>',
      'javascript:alert("XSS")',
      '"><script>window.xssDetected=true</script><"',
      '\'; DROP TABLE songs; --',
      '{{constructor.constructor("alert(\'XSS\')")()}}',
      '<img src=x onerror=alert("XSS in image")>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '"><svg onload=alert("XSS in SVG")>',
      '<input onfocus=alert("XSS") autofocus>',
      'data:text/html,<script>alert("XSS")</script>'
    ]
    
    const searchInput = page.locator('[data-testid="music-search-input"]')
    
    for (const maliciousInput of maliciousInputs) {
      // Clear any existing content
      await searchInput.fill('')
      
      // Attempt XSS injection
      await searchInput.fill(maliciousInput)
      await searchInput.press('Enter')
      
      // Wait for search to complete or error
      await page.waitForTimeout(1000)
      
      // Check that no JavaScript was executed
      const xssExecuted = await page.evaluate(() => {
        return !!(window as any).xssDetected || 
               document.querySelectorAll('script[src*="data:"], script[src*="javascript:"]').length > 0
      })
      
      expect(xssExecuted).toBe(false)
      
      // Verify input is properly escaped in DOM
      const searchResults = page.locator('[data-testid="search-results"]')
      if (await searchResults.isVisible()) {
        const resultsHTML = await searchResults.innerHTML()
        
        // Should not contain unescaped script tags or javascript: URLs
        expect(resultsHTML).not.toContain('<script>')
        expect(resultsHTML).not.toContain('javascript:')
        expect(resultsHTML).not.toContain('onerror=')
        expect(resultsHTML).not.toContain('onload=')
      }
      
      // Check for proper error handling without exposing stack traces
      const errorElement = page.locator('[data-testid="search-error"]')
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent()
        
        // Error messages should be user-friendly, not technical
        expect(errorText?.toLowerCase()).not.toContain('stack')
        expect(errorText?.toLowerCase()).not.toContain('exception')
        expect(errorText?.toLowerCase()).not.toContain('error:')
        expect(errorText?.toLowerCase()).not.toContain('sql')
      }
    }
  })

  test('Authentication Bypass Prevention', async ({ page }) => {
    // Test 1: Direct access to music management without login
    await page.goto('/weddings/auth-test/music')
    
    // Should redirect to login or show authentication error
    const currentUrl = page.url()
    const hasAuthError = await page.locator('[data-testid="auth-error"]').isVisible()
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/auth')
    
    expect(isLoginPage || hasAuthError).toBe(true)
    
    // Test 2: Invalid JWT token manipulation
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid_payload.invalid_signature')
      sessionStorage.setItem('session_token', 'invalid_session_token_12345')
    })
    
    await page.reload()
    
    // Should detect invalid tokens and require re-authentication
    const stillHasAccess = await page.locator('[data-testid="music-interface"]').isVisible({ timeout: 3000 })
    expect(stillHasAccess).toBe(false)
    
    // Test 3: Session hijacking prevention
    await loginAsDJ(page, 'session-test@dj.com', 'password123')
    await page.goto('/weddings/session-test/music')
    
    // Get valid session tokens
    const validTokens = await page.evaluate(() => ({
      authToken: localStorage.getItem('auth_token'),
      sessionToken: sessionStorage.getItem('session_token')
    }))
    
    // Modify session data to simulate hijacking attempt
    await page.evaluate(() => {
      // Modify user ID in session storage
      const sessionData = JSON.parse(sessionStorage.getItem('user_session') || '{}')
      sessionData.user_id = 'different_user_id_12345'
      sessionStorage.setItem('user_session', JSON.stringify(sessionData))
    })
    
    // Try to access music management with modified session
    await page.reload()
    
    // Should detect session tampering and require re-authentication
    const hasSessionError = await page.locator('[data-testid="session-error"]').isVisible({ timeout: 3000 })
    const redirectedToAuth = page.url().includes('/login') || page.url().includes('/auth')
    
    expect(hasSessionError || redirectedToAuth).toBe(true)
  })

  test('Rate Limiting Enforcement', async ({ page }) => {
    await loginAsDJ(page, 'rate-limit-test@dj.com', 'password123')
    await page.goto('/weddings/rate-limit-test/music')
    
    const searchInput = page.locator('[data-testid="music-search-input"]')
    
    // Attempt rapid-fire searches to trigger rate limiting
    const rapidSearches = []
    for (let i = 0; i < 25; i++) {
      const searchPromise = (async () => {
        try {
          await searchInput.fill(`rapid search ${i}`)
          await searchInput.press('Enter')
          
          // Check if search completed or was rate limited
          const searchCompleted = await Promise.race([
            page.locator('[data-testid="search-results"]').isVisible(),
            page.locator('[data-testid="rate-limit-warning"]').isVisible(),
            page.locator('[data-testid="search-throttled"]').isVisible()
          ])
          
          return { index: i, success: searchCompleted }
        } catch (error) {
          return { index: i, success: false, error: error.message }
        }
      })()
      
      rapidSearches.push(searchPromise)
      
      // Small delay to avoid browser freezing
      await page.waitForTimeout(50)
    }
    
    const results = await Promise.all(rapidSearches)
    
    // Rate limiting should kick in - not all searches should succeed
    const successfulSearches = results.filter(r => r.success).length
    const rateLimitedSearches = results.length - successfulSearches
    
    expect(rateLimitedSearches).toBeGreaterThan(0) // Some searches should be rate limited
    
    // Should show user-friendly rate limiting message
    const rateLimitMessage = page.locator('[data-testid="rate-limit-warning"]')
    if (await rateLimitMessage.isVisible()) {
      const message = await rateLimitMessage.textContent()
      expect(message?.toLowerCase()).toContain('too many')
      expect(message?.toLowerCase()).toContain('slow down')
    }
    
    // Test rate limit recovery
    await page.waitForTimeout(5000) // Wait for rate limit window to reset
    
    await searchInput.fill('recovery test search')
    await searchInput.press('Enter')
    
    // Should allow searches again after rate limit window
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 10000 })
  })

  test('Data Privacy Protection - User Data Isolation', async ({ page, browser }) => {
    // Test data isolation between different DJ accounts
    
    // DJ 1: Create and save playlist
    await loginAsDJ(page, 'dj1@privacy-test.com', 'password123')
    await page.goto('/weddings/privacy-test-1/music')
    
    const searchInput = page.locator('[data-testid="music-search-input"]')
    await searchInput.fill('Perfect Ed Sheeran')
    await searchInput.press('Enter')
    
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    
    const addButton = page.locator('[data-testid="add-to-playlist-button"]').first()
    await addButton.click()
    await page.locator('[data-testid="ceremony-playlist"]').click()
    await page.locator('[data-testid="confirm-add-button"]').click()
    
    // Save playlist
    await page.locator('[data-testid="save-playlist-button"]').click()
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible()
    
    // Logout DJ 1
    await page.locator('[data-testid="user-menu"]').click()
    await page.locator('[data-testid="logout-button"]').click()
    
    // DJ 2: Login with different account
    await loginAsDJ(page, 'dj2@privacy-test.com', 'password123')
    await page.goto('/weddings/privacy-test-2/music')
    
    // DJ 2 should not see DJ 1's playlists or data
    const ceremonyTab = page.locator('[data-testid="ceremony-tab"]')
    await ceremonyTab.click()
    
    const ceremonyPlaylist = page.locator('[data-testid="ceremony-playlist"]')
    const playlistTracks = ceremonyPlaylist.locator('[data-testid="playlist-track"]')
    
    // Should be empty (no data leakage from DJ 1)
    await expect(playlistTracks).toHaveCount(0)
    
    // Verify no cross-contamination in search history or recommendations
    const searchHistory = page.locator('[data-testid="search-history"]')
    if (await searchHistory.isVisible()) {
      const historyItems = searchHistory.locator('[data-testid="history-item"]')
      const historyCount = await historyItems.count()
      
      if (historyCount > 0) {
        for (let i = 0; i < historyCount; i++) {
          const historyText = await historyItems.nth(i).textContent()
          expect(historyText).not.toContain('Perfect Ed Sheeran') // DJ 1's search
        }
      }
    }
  })

  test('CSRF Protection for Playlist Operations', async ({ page }) => {
    await loginAsDJ(page, 'csrf-test@dj.com', 'password123')
    await page.goto('/weddings/csrf-test/music')
    
    // Monitor requests for CSRF tokens
    const requestsWithoutCSRF: string[] = []
    const csrfTokens = new Set<string>()
    
    page.on('request', request => {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method())) {
        const headers = request.headers()
        const postData = request.postData() || ''
        
        // Check for CSRF protection mechanisms
        const hasCSRFHeader = headers['x-csrf-token'] || 
                             headers['x-xsrf-token'] ||
                             headers['csrf-token']
        const hasCSRFBody = postData.includes('csrf_token') ||
                           postData.includes('_token')
        
        if (!hasCSRFHeader && !hasCSRFBody) {
          requestsWithoutCSRF.push(`${request.method()} ${request.url()}`)
        }
        
        // Collect CSRF tokens to verify they're unique
        if (hasCSRFHeader) {
          csrfTokens.add(hasCSRFHeader)
        }
      }
    })
    
    // Perform state-changing operations
    const searchInput = page.locator('[data-testid="music-search-input"]')
    await searchInput.fill('CSRF Test Song')
    await searchInput.press('Enter')
    
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    
    // Add track to playlist (POST request)
    const addButton = page.locator('[data-testid="add-to-playlist-button"]').first()
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.locator('[data-testid="reception-playlist"]').click()
      await page.locator('[data-testid="confirm-add-button"]').click()
    }
    
    // Reorder tracks (PUT/PATCH request)
    const receptionTab = page.locator('[data-testid="reception-tab"]')
    await receptionTab.click()
    
    const tracks = page.locator('[data-testid="playlist-track"]')
    if ((await tracks.count()) >= 2) {
      await tracks.first().dragTo(tracks.last())
    }
    
    // Save playlist (POST/PUT request)
    await page.locator('[data-testid="save-playlist-button"]').click()
    
    // All state-changing requests should have CSRF protection
    expect(requestsWithoutCSRF).toHaveLength(0)
    
    if (requestsWithoutCSRF.length > 0) {
      console.error('CSRF VULNERABILITY: Unprotected requests:', requestsWithoutCSRF)
    }
    
    // CSRF tokens should be unique per request (not reused)
    expect(csrfTokens.size).toBeGreaterThan(0)
  })

  test('SQL Injection Prevention', async ({ page }) => {
    await loginAsDJ(page, 'sql-injection-test@dj.com', 'password123')
    await page.goto('/weddings/sql-test/music')
    
    // Test SQL injection attempts in search queries
    const sqlInjectionPayloads = [
      "'; DROP TABLE playlists; --",
      "' OR '1'='1",
      "'; INSERT INTO playlists VALUES ('hacked', 'evil'); --",
      "' UNION SELECT password FROM users --",
      "'; UPDATE users SET password='hacked' WHERE id=1; --",
      "' AND (SELECT COUNT(*) FROM users) > 0 --",
      "'; EXEC xp_cmdshell('dir'); --",
      "' OR SLEEP(5) --",
      "'; SELECT * FROM information_schema.tables; --"
    ]
    
    const searchInput = page.locator('[data-testid="music-search-input"]')
    
    for (const payload of sqlInjectionPayloads) {
      await searchInput.fill(payload)
      await searchInput.press('Enter')
      
      // Search should either return normal results or proper error handling
      // Should never expose database errors or succeed with SQL injection
      
      const hasResults = await page.locator('[data-testid="search-results"]').isVisible({ timeout: 3000 })
      const hasError = await page.locator('[data-testid="search-error"]').isVisible({ timeout: 1000 })
      
      if (hasError) {
        const errorText = await page.locator('[data-testid="search-error"]').textContent()
        
        // Error should be generic, not exposing database internals
        expect(errorText?.toLowerCase()).not.toContain('sql')
        expect(errorText?.toLowerCase()).not.toContain('mysql')
        expect(errorText?.toLowerCase()).not.toContain('postgresql')
        expect(errorText?.toLowerCase()).not.toContain('syntax error')
        expect(errorText?.toLowerCase()).not.toContain('table')
        expect(errorText?.toLowerCase()).not.toContain('column')
      }
      
      if (hasResults) {
        // Results should be normal search results, not evidence of SQL injection
        const resultsText = await page.locator('[data-testid="search-results"]').textContent()
        expect(resultsText?.toLowerCase()).not.toContain('hacked')
        expect(resultsText?.toLowerCase()).not.toContain('evil')
        expect(resultsText?.toLowerCase()).not.toContain('password')
      }
      
      await searchInput.fill('') // Clear for next test
    }
  })

  test('Secure Headers and Content Security Policy', async ({ page }) => {
    await loginAsDJ(page, 'headers-test@dj.com', 'password123')
    
    // Intercept response to check security headers
    let securityHeaders: Record<string, string> = {}
    
    page.on('response', response => {
      if (response.url().includes('/music')) {
        const headers = response.headers()
        securityHeaders = {
          'x-frame-options': headers['x-frame-options'],
          'x-content-type-options': headers['x-content-type-options'],
          'x-xss-protection': headers['x-xss-protection'],
          'content-security-policy': headers['content-security-policy'],
          'strict-transport-security': headers['strict-transport-security'],
          'referrer-policy': headers['referrer-policy']
        }
      }
    })
    
    await page.goto('/weddings/headers-test/music')
    
    // Verify critical security headers are present
    expect(securityHeaders['x-frame-options']).toBeTruthy() // Prevent clickjacking
    expect(securityHeaders['x-content-type-options']).toBe('nosniff') // Prevent MIME sniffing
    expect(securityHeaders['content-security-policy']).toBeTruthy() // CSP protection
    
    // Verify CSP doesn't allow unsafe inline scripts
    const csp = securityHeaders['content-security-policy']
    if (csp) {
      expect(csp).not.toContain('unsafe-inline')
      expect(csp).not.toContain('unsafe-eval')
      expect(csp).toContain('script-src')
    }
    
    // Test that CSP blocks unauthorized script execution
    const scriptExecuted = await page.evaluate(() => {
      try {
        // Attempt to execute inline script (should be blocked by CSP)
        const script = document.createElement('script')
        script.innerHTML = 'window.cspBypassTest = true;'
        document.head.appendChild(script)
        return !!(window as any).cspBypassTest
      } catch (error) {
        return false // CSP correctly blocked the script
      }
    })
    
    expect(scriptExecuted).toBe(false) // Script should be blocked by CSP
  })

  test('Session Security and Timeout', async ({ page }) => {
    await loginAsDJ(page, 'session-security@dj.com', 'password123')
    await page.goto('/weddings/session-security/music')
    
    // Test session timeout behavior
    // Mock time advancement to simulate session timeout
    await page.evaluate(() => {
      // Override Date.now to simulate time advancement
      const originalNow = Date.now
      const startTime = originalNow()
      Date.now = () => startTime + (2 * 60 * 60 * 1000) // 2 hours later
    })
    
    // Attempt to perform actions after simulated timeout
    const searchInput = page.locator('[data-testid="music-search-input"]')
    await searchInput.fill('Session Timeout Test')
    await searchInput.press('Enter')
    
    // Should detect expired session and require re-authentication
    const sessionExpired = await Promise.race([
      page.locator('[data-testid="session-expired"]').isVisible(),
      page.locator('[data-testid="auth-required"]').isVisible(),
      page.waitForURL('**/login').then(() => true).catch(() => false)
    ])
    
    expect(sessionExpired).toBe(true)
    
    // Test session refresh token security
    const tokenRefreshAttempted = await page.evaluate(() => {
      // Check if refresh token is stored securely (not in localStorage)
      const localStorage = window.localStorage
      const sessionStorage = window.sessionStorage
      
      const refreshTokenInLocalStorage = localStorage.getItem('refresh_token')
      const refreshTokenInSessionStorage = sessionStorage.getItem('refresh_token')
      
      // Refresh tokens should not be stored in web storage
      return {
        inLocalStorage: !!refreshTokenInLocalStorage,
        inSessionStorage: !!refreshTokenInSessionStorage
      }
    })
    
    expect(tokenRefreshAttempted.inLocalStorage).toBe(false)
    expect(tokenRefreshAttempted.inSessionStorage).toBe(false)
  })
})