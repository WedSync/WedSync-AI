# TEAM D - ROUND 1: WS-199 - Rate Limiting System  
## 2025-08-31 - Development Round 1

**YOUR MISSION:** Implement mobile-optimized rate limiting with WedMe platform integration and offline capability
**FEATURE ID:** WS-199 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about mobile network constraints and WedMe platform rate limiting UX

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/platform/rate-limiting/
cat $WS_ROOT/wedsync/src/lib/platform/mobile-rate-limiter.ts | head -20
cat $WS_ROOT/wedsync/src/components/mobile/RateLimitIndicator.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test mobile-rate-limiting
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

// Query mobile platform patterns
await mcp__serena__search_for_pattern("mobile platform PWA offline");
await mcp__serena__find_symbol("WedMeComponent", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/mobile/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide for mobile features
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// Mobile-specific UI patterns for WedMe platform
# Use Ref MCP to search for:
# - "Untitled UI mobile responsive components"
# - "Magic UI mobile animations touch"
# - "PWA offline indicators user experience"
```

### C. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand mobile platform architecture
await mcp__serena__find_referencing_symbols("mobile PWA service-worker");
await mcp__serena__search_for_pattern("WedMe platform couple");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/app/wedme/");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR MOBILE PLATFORM INTEGRATION

### Platform-Specific Sequential Thinking Patterns

#### Pattern 1: Mobile Rate Limiting UX Strategy
```typescript
// Before building mobile rate limiting features
mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile rate limiting needs: Visual indicators when approaching limits, graceful degradation for couples on slow networks, offline capability for viewing rate limit status, WedMe platform integration with supplier coordination, and touch-optimized rate limit management interface for suppliers.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile network constraints: Couples often have poor connectivity at wedding venues, suppliers work from various locations with different network quality. Rate limiting must account for request retries due to network issues, implement smart batching for bulk operations, and provide offline queuing when connectivity is poor.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "WedMe platform considerations: Couples access wedding info through mobile-first interface, suppliers coordinate through WedMe integration, rate limiting affects both platforms differently. Need unified rate limiting that works across WedSync supplier dashboard and WedMe couple platform with shared limits but different UX patterns.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "PWA offline integration: When couples are offline, they should see cached rate limit status, queued requests should process when connectivity returns, service worker must handle rate limit responses intelligently, and offline actions should sync with proper rate limiting when reconnected.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile implementation strategy: Create mobile-optimized rate limit indicator components, implement smart request queuing for poor networks, design touch-friendly rate limit configuration interface, integrate with PWA service worker for offline support, and optimize for mobile performance constraints.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with mobile platform focus:

1. **task-tracker-coordinator** --think-hard --mobile-focus --track-dependencies --sequential-thinking-enabled
   - Mission: Track WedMe platform integration and mobile UX requirements
   
2. **react-ui-specialist** --think-ultra-hard --mobile-first --sequential-thinking-for-architecture
   - Mission: Design touch-optimized rate limit indicators using Untitled UI
   
3. **performance-optimization-expert** --think-ultra-hard --mobile-performance --sequential-thinking-quality
   - Mission: Optimize rate limiting for mobile network constraints and PWA
   
4. **ui-ux-designer** --continuous --mobile-ux --sequential-thinking-testing
   - Mission: Design rate limiting UX that doesn't frustrate wedding coordination
   
5. **test-automation-architect** --mobile-testing --device-testing --sequential-thinking-testing
   - Mission: Test rate limiting across mobile devices and network conditions
   
6. **documentation-chronicler** --detailed-evidence --mobile-examples --sequential-thinking-docs
   - Mission: Document mobile rate limiting patterns and WedMe integration

**AGENT COORDINATION:** Focus on mobile UX optimization and WedMe platform consistency

## 🎯 TEAM D SPECIALIZATION: Platform/WedMe Focus

**PLATFORM/WEDME FOCUS:**
- Mobile-first design principles
- PWA functionality implementation  
- WedMe platform features
- Offline capability support
- Cross-platform compatibility
- Mobile performance optimization

## 📋 TECHNICAL SPECIFICATION

**Based on:** `/WORKFLOW-V2-DRAFT/OUTBOX/feature-designer/WS-199-rate-limiting-system-technical.md`

**Mobile Context:** WedMe couples access wedding coordination on mobile devices with varying network quality. Rate limiting must provide clear feedback, support offline queuing, and maintain responsive UX even when limits are approached.

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Primary Mobile Components:
- [ ] **Mobile Rate Limit Indicator** (`/src/components/mobile/RateLimitIndicator.tsx`)
- [ ] **WedMe Integration Service** (`/src/lib/platform/wedme-rate-limits.ts`)
- [ ] **Offline Request Queue** (`/src/lib/platform/offline-rate-queue.ts`)
- [ ] **PWA Service Worker Integration** (rate limit caching)
- [ ] **Mobile Performance Optimization** for rate limit checks
- [ ] **Touch-optimized Configuration UI** for suppliers  
- [ ] **Mobile Integration Tests** across devices and networks

### 1. Mobile Rate Limit Indicator Component
```typescript
// /src/components/mobile/RateLimitIndicator.tsx
import { useState, useEffect } from 'react';
import { Badge } from '$WS_ROOT/wedsync/src/components/ui/badge';
import { Progress } from '$WS_ROOT/wedsync/src/components/ui/progress';

interface RateLimitIndicatorProps {
  currentUsage: number;
  limit: number;
  resetTime: number;
  subscriptionTier: string;
  showUpgradePrompt?: boolean;
}

export function RateLimitIndicator({
  currentUsage,
  limit, 
  resetTime,
  subscriptionTier,
  showUpgradePrompt = false
}: RateLimitIndicatorProps) {
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  const usagePercentage = Math.round((currentUsage / limit) * 100);
  const isApproachingLimit = usagePercentage > 80;
  const isAtLimit = usagePercentage >= 100;

  useEffect(() => {
    // Update countdown timer for mobile users
    const interval = setInterval(() => {
      const now = Date.now();
      const timeLeft = Math.max(0, resetTime - now);
      
      if (timeLeft > 0) {
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        setTimeUntilReset(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeUntilReset('Resetting...');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [resetTime]);

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm z-50">
      {/* Mobile-optimized rate limit display */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          API Usage
        </span>
        <Badge variant={isAtLimit ? "destructive" : isApproachingLimit ? "warning" : "secondary"}>
          {subscriptionTier}
        </Badge>
      </div>
      
      <Progress 
        value={usagePercentage} 
        className={`mb-2 ${isAtLimit ? 'bg-red-100' : isApproachingLimit ? 'bg-yellow-100' : 'bg-green-100'}`}
      />
      
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>{currentUsage} / {limit} requests</span>
        <span>Resets in {timeUntilReset}</span>
      </div>
      
      {(isApproachingLimit || showUpgradePrompt) && (
        <button 
          className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 rounded-md transition-colors"
          onClick={() => window.open('/billing/upgrade', '_blank')}
        >
          {isAtLimit ? 'Upgrade for More Requests' : 'Upgrade Plan'}
        </button>
      )}
    </div>
  );
}
```

### 2. WedMe Platform Integration
```typescript
// /src/lib/platform/wedme-rate-limits.ts
export class WedMeRateLimitIntegration {
  // Rate limiting specifically for WedMe couple platform
  
  async getWedMeRateLimits(coupleId: string): Promise<WedMeRateLimits> {
    // Couples have different rate limiting needs than suppliers
    const rateLimits = {
      // Wedding coordination actions
      taskUpdates: { minute: 20, hour: 200, day: 1000 },
      photoUploads: { minute: 5, hour: 50, day: 300 },
      vendorMessages: { minute: 10, hour: 100, day: 500 },
      guestListUpdates: { minute: 15, hour: 150, day: 800 },
      
      // Browsing and search (higher limits)
      supplierSearch: { minute: 30, hour: 500, day: 2000 },
      portfolioBrowsing: { minute: 50, hour: 800, day: 3000 }
    };

    return {
      ...rateLimits,
      weddingDate: await this.getWeddingDate(coupleId),
      isNearWeddingDay: await this.isNearWeddingDay(coupleId), // Higher limits near wedding
      couplesSubscriptionTier: await this.getCoupleSubscriptionTier(coupleId)
    };
  }

  async handleWedMeRateLimit(
    action: string, 
    rateLimitResult: RateLimitResult
  ): Promise<WedMeRateLimitResponse> {
    if (!rateLimitResult.allowed) {
      // Provide wedding-context appropriate messaging
      const weddingContextMessage = this.getWeddingContextMessage(action, rateLimitResult);
      
      return {
        blocked: true,
        message: weddingContextMessage,
        retryAfter: rateLimitResult.retryAfter,
        alternativeActions: this.suggestAlternativeActions(action),
        upgradeRecommendation: this.getWedMeUpgradeRecommendation(action)
      };
    }

    return { blocked: false };
  }

  private getWeddingContextMessage(action: string, result: RateLimitResult): string {
    const messages = {
      taskUpdates: `You've made a lot of wedding task updates recently! Your enthusiasm is great, but let's take a quick breather. You can make more updates in ${Math.ceil(result.retryAfter / 60)} minutes.`,
      photoUploads: `Your wedding photos are being uploaded! To keep things running smoothly for all couples, please wait ${Math.ceil(result.retryAfter / 60)} minutes before uploading more.`,
      vendorMessages: `You've been actively coordinating with your vendors - fantastic! Give them a moment to respond before sending more messages (${Math.ceil(result.retryAfter / 60)} minutes).`,
      supplierSearch: `You've been busy exploring vendor options! Take a break to review what you've found, then continue searching in ${Math.ceil(result.retryAfter / 60)} minutes.`
    };

    return messages[action] || `Please wait ${Math.ceil(result.retryAfter / 60)} minutes before trying this action again.`;
  }
}
```

### 3. Offline Request Queuing
```typescript
// /src/lib/platform/offline-rate-queue.ts
export class OfflineRateLimitQueue {
  // Handle rate limited requests when mobile goes offline
  
  private offlineQueue: Map<string, QueuedRequest[]> = new Map();
  
  async queueRateLimitedRequest(request: QueuedRateLimitRequest): Promise<void> {
    // Store rate limited requests for processing when limits reset
    const queueKey = `${request.userId}:${request.endpoint}`;
    const existingQueue = this.offlineQueue.get(queueKey) || [];
    
    // Add request to queue with rate limit context
    existingQueue.push({
      ...request,
      queuedAt: Date.now(),
      expectedProcessingTime: request.retryAfter * 1000,
      weddingPriority: this.calculateWeddingPriority(request.action),
      isWeddingCritical: this.isWeddingCriticalAction(request.action)
    });

    this.offlineQueue.set(queueKey, existingQueue);
    
    // Schedule processing when rate limits reset
    setTimeout(() => {
      this.processQueuedRequest(queueKey);
    }, request.retryAfter * 1000);
  }

  async processQueuedRequests(): Promise<ProcessingResult> {
    // Process all queued requests when connectivity returns
    const results = [];
    
    for (const [queueKey, requests] of this.offlineQueue.entries()) {
      // Process wedding-critical actions first
      const sortedRequests = requests.sort((a, b) => 
        b.weddingPriority - a.weddingPriority
      );
      
      for (const request of sortedRequests) {
        try {
          const result = await this.executeQueuedRequest(request);
          results.push({ request, result, status: 'success' });
        } catch (error) {
          results.push({ request, error, status: 'failed' });
        }
      }
    }

    return { processedCount: results.length, results };
  }

  private calculateWeddingPriority(action: string): number {
    // Priority scoring for wedding coordination actions
    const priorities = {
      vendorEmergencyContact: 10, // Highest priority
      weddingDayTaskUpdate: 9,
      vendorCoordination: 8, 
      taskStatusUpdate: 7,
      guestListUpdate: 6,
      photoUpload: 5,
      supplierSearch: 3,
      portfolioBrowsing: 1 // Lowest priority
    };

    return priorities[action] || 2;
  }
}
```

### 4. PWA Service Worker Integration
```typescript
// /src/lib/platform/service-worker-rate-limits.ts
// Note: This integrates with existing service worker

// Add to service worker for offline rate limit handling
self.addEventListener('fetch', event => {
  // Handle rate limited API requests in service worker
  if (event.request.url.includes('/api/')) {
    event.respondWith(handleApiRequestWithRateLimit(event.request));
  }
});

async function handleApiRequestWithRateLimit(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    
    // Check if response is rate limited
    if (response.status === 429) {
      const rateLimitData = await response.json();
      
      // Queue request for retry
      await queueRateLimitedRequest({
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: request.body,
        retryAfter: rateLimitData.retryAfter,
        rateLimitReason: rateLimitData.error
      });
      
      // Return user-friendly offline response
      return new Response(JSON.stringify({
        queued: true,
        message: 'Request queued due to rate limiting. Will process when limits reset.',
        retryAfter: rateLimitData.retryAfter,
        queuePosition: await getQueuePosition(request.url)
      }), {
        status: 202, // Accepted for processing
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return response;
  } catch (error) {
    // Network error - queue for later
    return handleNetworkErrorWithQueue(request, error);
  }
}
```

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

### Mobile Navigation Integration
```typescript
// MUST integrate rate limit indicator into mobile navigation
// File: $WS_ROOT/wedsync/src/components/mobile/layout.tsx

// Add rate limit status to mobile header
<div className="flex items-center space-x-2">
  <RateLimitIndicator 
    subscriptionTier={userTier}
    showInMobileHeader={true}
  />
  {/* Existing mobile navigation items */}
</div>

// WedMe platform navigation integration
// File: $WS_ROOT/wedsync/src/app/wedme/layout.tsx
<WedMeHeader>
  <RateLimitIndicator 
    mode="wedme"
    showForCouples={true}
    weddingDateContext={weddingDate}
  />
</WedMeHeader>
```

## 🔗 DEPENDENCIES

**What you need from other teams:**
- Team B: Core rate limiting engine and Redis integration
- Team A: Admin dashboard components for mobile monitoring
- Team C: Redis cluster status for mobile connectivity optimization

**What others need from you:**
- Mobile rate limit indicator components
- WedMe platform rate limiting integration
- Offline request queuing mechanisms  
- Mobile-optimized rate limiting UX patterns

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### Mobile Security Checklist:
- [ ] **Secure offline storage** - Rate limit data encrypted in browser storage
- [ ] **Request queue encryption** - Offline queued requests properly secured  
- [ ] **Mobile authentication** - Rate limiting respects mobile session management
- [ ] **WedMe cross-platform security** - Consistent security across platforms
- [ ] **Touch security** - Prevent accidental rate limit configuration changes
- [ ] **PWA security** - Service worker rate limiting doesn't expose sensitive data

### Mobile-Specific Security:
```typescript
// Secure mobile rate limiting patterns
export class MobileRateLimitSecurity {
  async validateMobileRequest(request: MobileRateLimitRequest): Promise<boolean> {
    // Validate mobile client authenticity
    const deviceFingerprint = await this.generateDeviceFingerprint(request);
    const sessionValid = await this.validateMobileSession(request.sessionToken);
    
    return deviceFingerprint.isValid && sessionValid;
  }

  async encryptOfflineQueue(queueData: QueuedRequest[]): Promise<string> {
    // Encrypt sensitive data before storing in browser storage
    return await this.mobileEncryption.encrypt(JSON.stringify(queueData));
  }
}
```

## 📱 MOBILE IMPLEMENTATION REQUIREMENTS  

### 1. Touch-Optimized Rate Limit Configuration
```typescript
// /src/components/mobile/RateLimitConfig.tsx
export function MobileRateLimitConfig({ userType }: { userType: 'supplier' | 'couple' }) {
  // Touch-friendly interface for managing rate limits
  
  return (
    <div className="p-4 space-y-6">
      {/* Touch targets >= 44px for accessibility */}
      <div className="grid grid-cols-1 gap-4">
        {userType === 'supplier' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Your API Usage</h3>
            
            {/* Visual usage indicators optimized for mobile */}
            <div className="space-y-4">
              <UsageBar 
                label="Client Management" 
                current={45} 
                limit={100}
                touchOptimized={true}
              />
              <UsageBar 
                label="Photo Uploads" 
                current={12} 
                limit={50}
                touchOptimized={true}
              />
              <UsageBar 
                label="Portfolio Updates" 
                current={8} 
                limit={25}
                touchOptimized={true}
              />
            </div>

            {/* Touch-friendly upgrade button */}
            <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md text-base font-medium">
              Upgrade for Higher Limits
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 2. WedMe Couple Platform Integration
```typescript
// /src/lib/platform/wedme-rate-limits.ts
export class WedMeRateLimitIntegration {
  // Specialized rate limiting for couple platform
  
  async getWedMeCoupleRateLimits(coupleId: string): Promise<WedMeRateLimits> {
    const couple = await this.getCoupleContext(coupleId);
    const isNearWedding = this.isNearWeddingDay(couple.weddingDate);
    
    // Higher limits as wedding day approaches
    const proximityMultiplier = isNearWedding ? 2.0 : 1.0;
    
    return {
      // Wedding coordination activities (higher priority)
      taskCoordination: {
        minute: Math.floor(15 * proximityMultiplier),
        hour: Math.floor(200 * proximityMultiplier),
        day: Math.floor(1000 * proximityMultiplier)
      },
      
      // Vendor communication (critical near wedding)  
      vendorMessages: {
        minute: Math.floor(10 * proximityMultiplier),
        hour: Math.floor(120 * proximityMultiplier),
        day: Math.floor(600 * proximityMultiplier)
      },
      
      // Guest management (moderate priority)
      guestUpdates: {
        minute: 8,
        hour: 100, 
        day: 500
      },
      
      // Photo and content (lower priority)
      photoViewing: {
        minute: 25,
        hour: 300,
        day: 1500
      }
    };
  }

  private isNearWeddingDay(weddingDate: Date): boolean {
    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilWedding <= 30; // Within 30 days of wedding
  }
}
```

### 3. Mobile Performance Optimization
```typescript
// /src/lib/platform/mobile-rate-limiter.ts  
export class MobileRateLimitOptimizer {
  // Optimize rate limiting for mobile constraints
  
  private connectionQuality: 'fast' | 'good' | 'slow' | 'offline' = 'good';
  private requestQueue: PendingRequest[] = [];

  async optimizeForMobileNetwork(
    request: RateLimitRequest
  ): Promise<OptimizedRateLimitResult> {
    // Adjust rate limiting behavior based on network quality
    const networkQuality = await this.detectNetworkQuality();
    
    if (networkQuality === 'slow') {
      // More generous limits on slow networks to account for retries
      request.limits = this.applySlowNetworkAdjustment(request.limits);
    }
    
    if (networkQuality === 'offline') {
      // Queue for when connectivity returns
      await this.queueForOfflineProcessing(request);
      return { queued: true, estimated_processing_time: 300000 }; // 5 minutes
    }

    return await this.processWithOptimizedLimits(request);
  }

  private async detectNetworkQuality(): Promise<NetworkQuality> {
    // Use Network Information API where available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      if (connection.effectiveType === '4g') return 'fast';
      if (connection.effectiveType === '3g') return 'good';
      if (connection.effectiveType === '2g') return 'slow';
    }

    // Fallback: measure request timing
    const startTime = performance.now();
    try {
      await fetch('/api/health', { method: 'HEAD' });
      const responseTime = performance.now() - startTime;
      
      if (responseTime < 100) return 'fast';
      if (responseTime < 500) return 'good';
      return 'slow';
    } catch {
      return 'offline';
    }
  }
}
```

### 4. Mobile UI Components
```typescript
// /src/components/mobile/RateLimitToast.tsx
export function MobileRateLimitToast({ 
  isVisible, 
  message, 
  retryAfter, 
  onUpgrade, 
  onDismiss 
}: MobileRateLimitToastProps) {
  // Mobile-optimized toast notifications for rate limits
  
  return (
    <div 
      className={`fixed bottom-20 left-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 transform transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ zIndex: 9999 }}
    >
      {/* Wedding-friendly messaging */}
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <ClockIcon className="h-6 w-6 text-blue-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {message}
          </p>
          {retryAfter && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Try again in {Math.ceil(retryAfter / 60)} minutes
            </p>
          )}
        </div>
      </div>
      
      {/* Touch-optimized action buttons */}
      <div className="mt-3 flex space-x-2">
        <button
          onClick={onUpgrade}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium"
        >
          Upgrade Plan
        </button>
        <button
          onClick={onDismiss}  
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
```

## 🧪 MOBILE TESTING REQUIREMENTS

### 1. Cross-Device Testing
```typescript
describe('Mobile Rate Limiting', () => {
  const devices = ['iPhone 13', 'iPad', 'Galaxy S21', 'Pixel 6'];
  
  devices.forEach(device => {
    it(`should work correctly on ${device}`, async () => {
      await page.emulate(devices[device]);
      // Test rate limiting UX on each device
    });
  });
});
```

### 2. Network Condition Testing
```typescript
describe('Network Condition Handling', () => {
  it('should queue requests gracefully on slow networks', async () => {
    await page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: 50 * 1024, // 50kb/s (slow 3G)
      uploadThroughput: 50 * 1024,
      latency: 2000 // 2 second latency
    });
    
    // Test rate limiting behavior under poor network conditions
  });

  it('should handle offline scenarios properly', async () => {
    await page.setOfflineMode(true);
    // Test offline request queuing
  });
});
```

### 3. PWA Integration Testing
```typescript
describe('PWA Rate Limiting Integration', () => {
  it('should maintain rate limit state across PWA sessions', async () => {
    // Test service worker rate limit caching
  });
  
  it('should sync queued requests when connectivity returns', async () => {
    // Test offline-to-online transition
  });
});
```

## 💾 WHERE TO SAVE YOUR WORK

**Mobile Platform Files:**
- `/src/lib/platform/mobile-rate-limiter.ts` - Mobile-optimized rate limiting
- `/src/lib/platform/wedme-rate-limits.ts` - WedMe couple platform integration
- `/src/lib/platform/offline-rate-queue.ts` - Offline request queuing  
- `/src/lib/platform/service-worker-rate-limits.ts` - PWA integration

**Mobile UI Components:**
- `/src/components/mobile/RateLimitIndicator.tsx` - Usage display
- `/src/components/mobile/RateLimitConfig.tsx` - Configuration interface
- `/src/components/mobile/RateLimitToast.tsx` - User notifications

**Test Files:**
- `/tests/mobile/rate-limiting.test.ts` - Mobile-specific testing
- `/tests/platform/wedme-rate-limits.test.ts` - WedMe integration tests
- `/tests/pwa/offline-rate-queue.test.ts` - PWA offline testing

## ⚠️ CRITICAL WARNINGS

### Mobile Network Considerations:
- Poor venue WiFi during wedding coordination can cause request retries
- Mobile data limits vary by user location and carrier  
- Touch interfaces need larger hit targets (>=44px) for rate limit controls
- Battery optimization - rate limit checks shouldn't drain mobile battery

### WedMe Platform Integration:
- Couples have different usage patterns than suppliers
- Wedding day proximity affects rate limiting priority
- Guest management actions need higher limits near wedding date
- Vendor coordination is time-sensitive and needs priority handling

### PWA and Offline Support:
- Service worker must handle rate limit responses intelligently
- Offline queue must sync properly when connectivity returns
- Critical wedding actions should get priority in offline queue
- Rate limit state should persist across PWA sessions

## 🏁 COMPLETION CHECKLIST (WITH MOBILE VERIFICATION)

### Mobile UX Verification:
```bash
# Test mobile responsive design
npm test mobile-responsiveness
# Must work on 375px, 768px, 1024px screens

# Verify touch targets meet accessibility standards
npm test touch-accessibility
# Must show: All interactive elements >= 44px

# Test PWA offline functionality
npm test pwa-offline-rate-limits
# Must show: Proper offline queuing and sync
```

### Platform Integration Verification:
```bash
# Test WedMe platform integration
npm test wedme-rate-limiting
# Must show: Couple-specific rate limiting working

# Verify mobile performance
npm test mobile-performance
# Must show: <100ms rate limit check on mobile

# Test cross-platform consistency
npm test platform-consistency
# Must show: Same limits across WedSync and WedMe
```

### Final Mobile Checklist:
- [ ] Rate limit indicator works on all mobile devices  
- [ ] WedMe platform integration maintains consistent limits
- [ ] Offline request queuing handles poor connectivity
- [ ] PWA service worker properly caches rate limit state
- [ ] Touch interactions are responsive and accessible
- [ ] Mobile performance optimized for slow networks
- [ ] TypeScript compiles with NO errors
- [ ] All mobile tests pass across devices
- [ ] Wedding day priority logic working correctly

## 📊 SUCCESS METRICS

### Mobile Performance:
- Rate limit check latency on mobile: <100ms (95th percentile)
- PWA offline queue sync time: <5 seconds when online
- Mobile UI responsiveness: <16ms frame render time
- Battery impact: <2% per hour of active use

### Wedding Platform Impact:
- Zero wedding coordination delays due to mobile rate limiting
- Couples can manage wedding tasks effectively on mobile
- Suppliers maintain productivity on mobile devices
- Wedding day coordination uninterrupted by rate limits

### Cross-Platform Consistency:
- Rate limits identical between WedSync dashboard and WedMe platform
- Offline sync maintains rate limit accuracy >99%
- Mobile upgrade conversions: >8% from rate limit prompts
- User satisfaction: >95% find mobile rate limiting helpful not hindering

---

**EXECUTE IMMEDIATELY - Focus on mobile UX optimization and WedMe platform integration!**