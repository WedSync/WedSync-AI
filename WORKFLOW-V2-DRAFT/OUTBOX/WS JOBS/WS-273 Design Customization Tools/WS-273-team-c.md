# TEAM C - ROUND 1: WS-273 - Design Customization Tools
## 2025-01-14 - Development Round 1

**YOUR MISSION:** Build the integration layer connecting design customization with Google Fonts API, real-time synchronization, external preview systems, and seamless data flow between wedding website builder and design engine
**FEATURE ID:** WS-273 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating seamless integrations that make design customization feel instantaneous and magical for couples planning their weddings

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/
ls -la $WS_ROOT/wedsync/src/hooks/
ls -la $WS_ROOT/wedsync/src/services/
cat $WS_ROOT/wedsync/src/lib/integrations/google-fonts.ts | head -20
cat $WS_ROOT/wedsync/src/services/realtime-design-sync.ts | head -20
cat $WS_ROOT/wedsync/src/hooks/use-design-sync.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **INTEGRATION TEST RESULTS:**
```bash
npm test integration/design
# MUST show: "All integration tests passing"
```

4. **API CONNECTION PROOF:**
```bash
# Show successful connection to Google Fonts API
curl -s "https://www.googleapis.com/webfonts/v1/webfonts?key=test" | head -10
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing integration patterns
await mcp__serena__search_for_pattern("integration|webhook|realtime|sync|external.*api");
await mcp__serena__find_symbol("supabaseClient", "", true);
await mcp__serena__find_symbol("useRealtime", "", true);
await mcp__serena__get_symbols_overview("src/lib/integrations");
await mcp__serena__get_symbols_overview("src/services");
await mcp__serena__search_for_pattern("google.*fonts|external.*service");
```

### B. INTEGRATION DOCUMENTATION (MANDATORY)
```typescript
// CRITICAL: Load integration patterns and standards
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/INTEGRATION-PATTERNS.md");
await mcp__serena__read_file("$WS_ROOT/.claude/REALTIME-ARCHITECTURE.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to integration development
mcp__Ref__ref_search_documentation("Google Fonts API integration rate limiting performance optimization")
mcp__Ref__ref_search_documentation("Supabase realtime subscriptions React hooks patterns")
mcp__Ref__ref_search_documentation("WebSocket real-time updates design synchronization")
mcp__Ref__ref_search_documentation("React Hook Form integration external APIs debouncing")
mcp__Ref__ref_search_documentation("Next.js API routes webhook handling external services")
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX INTEGRATION ARCHITECTURE

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex integration architectural decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "The design customization integration layer requires: 1) Google Fonts API integration with caching and performance optimization 2) Real-time synchronization between multiple users editing the same website 3) Integration with the website builder for live preview updates 4) External preview system integration 5) Data flow coordination between frontend, backend, and external services. The key challenge is maintaining real-time responsiveness while handling API rate limits and network latency.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down integration tasks, track API dependencies
2. **integration-specialist** - Use external service integration best practices
3. **security-compliance-officer** - Ensure API key security and webhook validation
4. **code-quality-guardian** - Maintain integration standards and error handling
5. **test-automation-architect** - Comprehensive integration testing with mock services
6. **documentation-chronicler** - Evidence-based integration documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### INTEGRATION SECURITY CHECKLIST:
- [ ] **API key protection** - Store Google Fonts API key in environment variables only
- [ ] **Webhook validation** - Verify webhook signatures for external notifications
- [ ] **Rate limiting compliance** - Respect Google Fonts API limits (1000 req/day)
- [ ] **Input validation** - Validate all external API responses
- [ ] **Error boundary isolation** - Prevent external failures from breaking UI
- [ ] **Timeout handling** - Set appropriate timeouts for all external calls
- [ ] **Retry mechanisms** - Exponential backoff for failed API requests
- [ ] **Audit logging** - Log all external API interactions
- [ ] **CORS configuration** - Proper CORS setup for preview iframe integration
- [ ] **Content Security Policy** - Whitelist external font domains

## 🌐 EXTERNAL INTEGRATIONS REQUIRED

### 1. Google Fonts API Integration
```typescript
// Location: /src/lib/integrations/google-fonts.ts
interface GoogleFontsService {
  // Fetch available fonts with caching
  getFontList(category?: FontCategory): Promise<GoogleFont[]>;
  
  // Load font families with optimization
  loadFonts(families: string[]): Promise<FontLoadResult>;
  
  // Generate font URLs with performance settings
  generateFontUrl(families: string[], weights: number[]): string;
  
  // Cache management for font data
  cacheFontList(fonts: GoogleFont[], ttl: number): Promise<void>;
  
  // Validate font availability
  validateFontFamily(family: string): boolean;
  
  // Get font suggestions based on category
  getFontSuggestions(category: 'wedding' | 'elegant' | 'modern'): GoogleFont[];
}

// Key Features:
// - Rate limiting compliance (max 1000 requests/day)
// - Response caching with Redis (24 hour TTL)
// - Font loading optimization with preload hints
// - Wedding-specific font filtering and recommendations
// - Fallback handling when API is unavailable
// - Performance monitoring and error tracking
```

### 2. Real-time Design Synchronization
```typescript
// Location: /src/services/realtime-design-sync.ts
interface RealtimeDesignSync {
  // Subscribe to design changes for specific website
  subscribeToDesignChanges(websiteId: string): Subscription;
  
  // Broadcast design changes to all connected clients
  broadcastDesignChange(websiteId: string, changes: DesignChange): Promise<void>;
  
  // Handle conflict resolution when multiple users edit simultaneously
  resolveDesignConflicts(conflicts: DesignConflict[]): Promise<WebsiteDesign>;
  
  // Manage user presence for collaborative editing
  trackUserPresence(websiteId: string, userId: string): Promise<void>;
  
  // Sync design state across browser tabs
  syncAcrossTabs(websiteId: string): void;
}

// Key Features:
// - Supabase Realtime integration for live updates
// - Operational Transform for conflict resolution
// - User presence indicators showing who's editing
// - Debounced updates to prevent spam
// - Offline state handling with sync on reconnect
// - Cross-tab synchronization for same user
```

### 3. Preview System Integration
```typescript
// Location: /src/services/preview-integration.ts
interface PreviewIntegrationService {
  // Generate secure preview URLs for design testing
  generatePreviewUrl(websiteId: string, design: WebsiteDesign): Promise<string>;
  
  // Update live preview with new design
  updateLivePreview(previewId: string, css: string): Promise<void>;
  
  // Handle responsive preview testing
  testResponsiveDesign(design: WebsiteDesign): Promise<ResponsiveTestResult>;
  
  // Integration with external screenshot services
  captureDesignScreenshot(design: WebsiteDesign, viewport: Viewport): Promise<string>;
  
  // Validate design across different browsers
  validateCrossBrowser(design: WebsiteDesign): Promise<CompatibilityReport>;
}
```

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**INTEGRATION FOCUS:**
- Third-party service integration
- Real-time data synchronization
- Webhook handling and processing
- Data flow between systems
- Integration health monitoring
- Failure handling and recovery

### CORE INTEGRATIONS TO BUILD:

#### 1. Google Fonts Integration Service
```typescript
// Advanced Google Fonts integration with performance optimization
export class GoogleFontsIntegration {
  private readonly API_KEY = process.env.GOOGLE_FONTS_API_KEY;
  private readonly BASE_URL = 'https://www.googleapis.com/webfonts/v1/webfonts';
  private readonly CACHE_TTL = 24 * 60 * 60; // 24 hours
  
  async getFontList(category?: FontCategory): Promise<GoogleFont[]> {
    // Check cache first
    const cacheKey = `google-fonts-${category || 'all'}`;
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;
    
    // Fetch from API with rate limiting
    const response = await this.rateLimitedRequest(`${this.BASE_URL}?key=${this.API_KEY}&sort=popularity`);
    const fonts = await this.filterWeddingAppropriate(response.items);
    
    // Cache for future use
    await this.setCache(cacheKey, fonts, this.CACHE_TTL);
    return fonts;
  }
  
  async loadFonts(families: string[]): Promise<FontLoadResult> {
    // Generate optimized font URLs
    const fontUrls = this.generateOptimizedUrls(families);
    
    // Load fonts with performance monitoring
    const loadPromises = fontUrls.map(url => this.loadFontWithTimeout(url, 5000));
    const results = await Promise.allSettled(loadPromises);
    
    return this.analyzeFontLoadResults(results);
  }
  
  private async filterWeddingAppropriate(fonts: any[]): Promise<GoogleFont[]> {
    // Filter fonts suitable for wedding websites
    const weddingCategories = ['serif', 'sans-serif', 'display'];
    const inappropriateFonts = ['creepy', 'horror', 'grunge'];
    
    return fonts.filter(font => 
      weddingCategories.includes(font.category) &&
      !inappropriateFonts.some(keyword => 
        font.family.toLowerCase().includes(keyword) ||
        font.subsets.some(subset => subset.includes(keyword))
      )
    ).map(this.transformToWeddingFont);
  }
  
  private async rateLimitedRequest(url: string): Promise<any> {
    // Implement rate limiting to respect API quotas
    await this.checkRateLimit('google-fonts');
    
    try {
      const response = await fetch(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'WedSync Wedding Website Builder'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Google Fonts API error: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      await this.logIntegrationError('google-fonts', error);
      throw error;
    }
  }
}
```

#### 2. Real-time Design Synchronization
```typescript
// Real-time synchronization for collaborative design editing
export class RealtimeDesignSync {
  private supabase = createClientComponentClient();
  private subscriptions = new Map<string, RealtimeChannel>();
  
  subscribeToDesignChanges(websiteId: string, onUpdate: (design: WebsiteDesign) => void): Subscription {
    const channel = this.supabase.channel(`design-${websiteId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'website_designs',
          filter: `couple_id=eq.${websiteId}`
        },
        (payload) => {
          this.handleDesignUpdate(payload, onUpdate);
        }
      )
      .on('broadcast', { event: 'design-change' }, (payload) => {
        this.handleLiveDesignChange(payload, onUpdate);
      })
      .subscribe();

    this.subscriptions.set(websiteId, channel);
    
    return {
      unsubscribe: () => {
        channel.unsubscribe();
        this.subscriptions.delete(websiteId);
      }
    };
  }
  
  async broadcastDesignChange(websiteId: string, changes: DesignChange): Promise<void> {
    const channel = this.subscriptions.get(websiteId);
    if (!channel) return;
    
    // Add user context and timestamp
    const enrichedChange = {
      ...changes,
      userId: await this.getCurrentUserId(),
      timestamp: Date.now(),
      sessionId: this.getSessionId()
    };
    
    // Broadcast to all connected clients
    await channel.send({
      type: 'broadcast',
      event: 'design-change',
      payload: enrichedChange
    });
    
    // Track metrics
    await this.trackRealtimeMetrics('design-change-broadcast', websiteId);
  }
  
  private handleDesignUpdate(payload: any, onUpdate: (design: WebsiteDesign) => void): void {
    try {
      const design = this.transformDatabaseToDesign(payload.new);
      
      // Apply operational transform to handle conflicts
      const resolvedDesign = this.applyOperationalTransform(design);
      
      onUpdate(resolvedDesign);
    } catch (error) {
      this.logError('design-update-handling', error);
    }
  }
  
  private applyOperationalTransform(design: WebsiteDesign): WebsiteDesign {
    // Simple conflict resolution - last write wins with timestamp
    // In production, implement proper operational transform
    return design;
  }
}
```

#### 3. Preview Integration Service
```typescript
// Integration with preview system and external validation
export class PreviewIntegrationService {
  async generatePreviewUrl(websiteId: string, design: WebsiteDesign): Promise<string> {
    // Generate secure, temporary preview URL
    const previewToken = await this.generateSecureToken(websiteId, design);
    
    const previewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/preview/${websiteId}?token=${previewToken}`;
    
    // Store preview data with expiration
    await this.storePreviewData(previewToken, design, 3600); // 1 hour expiry
    
    return previewUrl;
  }
  
  async updateLivePreview(previewId: string, css: string): Promise<void> {
    // Use Server-Sent Events or WebSocket to push updates
    const previewChannel = this.getPreviewChannel(previewId);
    
    await previewChannel.send({
      type: 'css-update',
      payload: {
        css,
        timestamp: Date.now()
      }
    });
  }
  
  async testResponsiveDesign(design: WebsiteDesign): Promise<ResponsiveTestResult> {
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    const testResults = await Promise.all(
      viewports.map(viewport => this.testViewport(design, viewport))
    );
    
    return {
      passed: testResults.every(result => result.passed),
      results: testResults,
      recommendations: this.generateResponsiveRecommendations(testResults)
    };
  }
  
  private async testViewport(design: WebsiteDesign, viewport: Viewport): Promise<ViewportTestResult> {
    // Use Playwright or similar for actual viewport testing
    const css = await this.generateCSS(design);
    const html = await this.generateTestHTML(design, css);
    
    // Simulate viewport rendering
    const renderResult = await this.simulateViewport(html, viewport);
    
    return {
      viewport,
      passed: renderResult.layoutStable && renderResult.textReadable,
      issues: renderResult.issues,
      screenshot: renderResult.screenshot
    };
  }
}
```

### INTEGRATION PATTERNS & BEST PRACTICES:

#### 1. Error Handling & Recovery
```typescript
export class IntegrationErrorHandler {
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);
        
        this.logRetryAttempt(error, attempt, delay);
      }
    }
    throw new Error('Max retries exceeded');
  }
  
  async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    serviceName: string
  ): Promise<T> {
    const breaker = this.getCircuitBreaker(serviceName);
    
    if (breaker.isOpen()) {
      throw new Error(`Circuit breaker open for ${serviceName}`);
    }
    
    try {
      const result = await operation();
      breaker.recordSuccess();
      return result;
    } catch (error) {
      breaker.recordFailure();
      throw error;
    }
  }
}
```

#### 2. Performance Monitoring
```typescript
export class IntegrationMonitoring {
  async trackApiCall(
    service: string,
    operation: string,
    duration: number,
    success: boolean
  ): Promise<void> {
    const metrics = {
      service,
      operation,
      duration,
      success,
      timestamp: Date.now()
    };
    
    // Send to monitoring service
    await this.sendMetrics(metrics);
    
    // Check SLA compliance
    if (duration > this.getSLAThreshold(service, operation)) {
      await this.alertSlaBreach(service, operation, duration);
    }
  }
  
  async healthCheck(): Promise<IntegrationHealthStatus> {
    const services = ['google-fonts', 'realtime-sync', 'preview-service'];
    const results = await Promise.allSettled(
      services.map(service => this.checkServiceHealth(service))
    );
    
    return {
      overall: results.every(result => result.status === 'fulfilled'),
      services: results.reduce((acc, result, index) => ({
        ...acc,
        [services[index]]: result.status === 'fulfilled'
      }), {})
    };
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### INTEGRATION SERVICE DELIVERABLES:
- [ ] **GoogleFontsIntegration.ts** - Complete Google Fonts API integration
- [ ] **RealtimeDesignSync.ts** - Real-time design synchronization service
- [ ] **PreviewIntegrationService.ts** - Preview system integration
- [ ] **IntegrationErrorHandler.ts** - Robust error handling and recovery
- [ ] **IntegrationMonitoring.ts** - Performance monitoring and health checks
- [ ] **WebhookHandler.ts** - External webhook processing
- [ ] **CacheManager.ts** - Redis caching for API responses

### REACT HOOKS DELIVERABLES:
- [ ] **useGoogleFonts.ts** - React hook for font loading and caching
- [ ] **useDesignSync.ts** - Real-time design synchronization hook
- [ ] **usePreviewIntegration.ts** - Preview system integration hook
- [ ] **useIntegrationHealth.ts** - Integration monitoring hook
- [ ] **useExternalApi.ts** - Generic external API integration hook

### CONFIGURATION DELIVERABLES:
- [ ] **integration-config.ts** - Centralized integration configuration
- [ ] **rate-limiting.ts** - API rate limiting implementation
- [ ] **webhook-validation.ts** - Webhook signature validation
- [ ] **cors-configuration.ts** - Cross-origin request setup
- [ ] **environment-validation.ts** - Environment variable validation

### TESTING DELIVERABLES:
- [ ] **Integration test suite** - Mock external services for testing
- [ ] **API connectivity tests** - Verify all external service connections
- [ ] **Real-time sync tests** - Test collaborative editing scenarios
- [ ] **Error handling tests** - Test failure scenarios and recovery
- [ ] **Performance benchmarks** - Integration response time metrics

## 💾 WHERE TO SAVE YOUR WORK
- **Integration Services**: `$WS_ROOT/wedsync/src/lib/integrations/`
- **React Hooks**: `$WS_ROOT/wedsync/src/hooks/`
- **Services**: `$WS_ROOT/wedsync/src/services/`
- **Tests**: `$WS_ROOT/wedsync/src/__tests__/integrations/`
- **Config**: `$WS_ROOT/wedsync/src/config/`

## 🏁 COMPLETION CHECKLIST

### INTEGRATION IMPLEMENTATION:
- [ ] Google Fonts API integration with caching
- [ ] Real-time design synchronization working
- [ ] Preview system integration functional
- [ ] Error handling and retry mechanisms implemented
- [ ] Performance monitoring active
- [ ] Circuit breaker pattern implemented for external services

### REAL-TIME FEATURES:
- [ ] Supabase Realtime subscriptions configured
- [ ] Design change broadcasting working
- [ ] Conflict resolution implemented
- [ ] User presence tracking active
- [ ] Cross-tab synchronization working
- [ ] Offline/online state handling implemented

### EXTERNAL API INTEGRATION:
- [ ] Google Fonts API properly integrated
- [ ] Rate limiting compliance verified
- [ ] API key security implemented
- [ ] Response caching working (Redis)
- [ ] Wedding-appropriate font filtering active
- [ ] Font loading optimization implemented

### MONITORING & HEALTH:
- [ ] Integration health checks working
- [ ] Performance metrics collection active
- [ ] Error logging and alerting configured
- [ ] SLA monitoring implemented
- [ ] Circuit breaker status dashboards
- [ ] API usage tracking and reporting

### EVIDENCE PACKAGE:
- [ ] File existence proof (ls output)
- [ ] TypeScript compilation success
- [ ] Integration test results (all passing)
- [ ] External API connectivity verified
- [ ] Performance benchmarks documented
- [ ] Health check results

---

**EXECUTE IMMEDIATELY - Build the seamless integration layer that makes wedding website customization feel magical and instantaneous! Every font load, every real-time update should happen flawlessly! 💍⚡**