# TEAM B - ROUND 1: WS-197 - Middleware Setup
## 2025-08-29 - Development Round 1

**YOUR MISSION:** Create comprehensive middleware infrastructure with authentication layers, rate limiting systems, security event logging, and session management for protecting wedding industry APIs from abuse and unauthorized access
**FEATURE ID:** WS-197 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about authentication security, distributed rate limiting, session management, and ensuring wedding suppliers can safely access client data while preventing abuse during peak wedding season traffic spikes

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/middleware.ts
cat $WS_ROOT/wedsync/lib/middleware/auth.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test middleware
# MUST show: "All middleware tests passing"
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__search_for_pattern("middleware authentication rate limiting");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/lib/middleware/");
```

## 🧠 STEP 2: SEQUENTIAL THINKING FOR MIDDLEWARE ARCHITECTURE

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Middleware Setup needs: comprehensive Next.js middleware stack with JWT authentication, Redis-backed rate limiting, session management with wedding industry context, CSRF protection for form submissions, security event logging, request validation, and performance monitoring. Key patterns: tier-based rate limits (free suppliers: 100/hr, premium: 2000/hr), wedding season scaling, security headers compliance, and distributed session storage.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**MIDDLEWARE INFRASTRUCTURE:**
- Comprehensive Next.js middleware with authentication and session validation
- Redis-backed distributed rate limiting with tier-based controls
- Security event logging with severity classification and automated alerting
- Session management with wedding industry context and suspicious activity detection
- CSRF protection for form submissions and state-changing operations
- Request validation middleware with wedding-specific business logic
- Performance monitoring and middleware optimization for peak wedding season

## 📋 TECHNICAL DELIVERABLES

- [ ] Next.js middleware stack with comprehensive authentication and session handling
- [ ] Redis-backed rate limiting system with tier-based controls and burst protection
- [ ] Security event logging infrastructure with severity classification
- [ ] Session management system with wedding industry context tracking
- [ ] CSRF protection middleware for form submissions and data modification
- [ ] Request validation framework with business logic validation
- [ ] Middleware performance monitoring and optimization system

## 💾 WHERE TO SAVE YOUR WORK
- Main Middleware: $WS_ROOT/wedsync/middleware.ts
- Authentication: $WS_ROOT/wedsync/lib/middleware/auth.ts
- Rate Limiting: $WS_ROOT/wedsync/lib/middleware/rate-limiting.ts
- Logging: $WS_ROOT/wedsync/lib/middleware/logging.ts

## 🔐 MIDDLEWARE PATTERNS

### Comprehensive Authentication Middleware
```typescript
// lib/middleware/auth.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface AuthenticatedUser {
  id: string;
  email: string;
  user_type: 'supplier' | 'couple' | 'admin';
  supplier_id?: string;
  couple_id?: string;
  subscription_tier: string;
  wedding_date?: string;
  session_id: string;
  permissions: string[];
  is_wedding_season_active?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  requiresTwoFactor?: boolean;
  sessionExpiry?: Date;
}

export class AuthenticationMiddleware {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  async authenticateRequest(request: NextRequest, requestId: string): Promise<AuthResult> {
    try {
      // Step 1: Extract JWT token from multiple sources
      const token = await this.extractAuthToken(request);
      if (!token) {
        return { success: false, error: 'No authentication token provided' };
      }

      // Step 2: Validate JWT token structure and signature
      const decodedToken = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET,
        raw: false
      });

      if (!decodedToken) {
        return { success: false, error: 'Invalid or malformed JWT token' };
      }

      // Step 3: Validate active session in database
      const sessionResult = await this.validateActiveSession(decodedToken.jti, request);
      if (!sessionResult.success) {
        return sessionResult;
      }

      // Step 4: Build comprehensive user context with wedding industry data
      const user = await this.buildUserContext(sessionResult.session!);
      
      // Step 5: Update session activity and security tracking
      await this.updateSessionActivity(sessionResult.session!.id, request, requestId);

      // Step 6: Check for suspicious activity patterns
      await this.checkSuspiciousActivity(user, request);

      return { 
        success: true, 
        user,
        sessionExpiry: new Date(sessionResult.session!.expires_at)
      };

    } catch (error) {
      return { 
        success: false, 
        error: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private async extractAuthToken(request: NextRequest): Promise<string | null> {
    // Check Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check for session cookie (fallback)
    const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
                        request.cookies.get('__Secure-next-auth.session-token')?.value;
    
    return sessionToken || null;
  }

  private async validateActiveSession(tokenId: string | undefined, request: NextRequest): Promise<{
    success: boolean;
    session?: any;
    error?: string;
  }> {
    if (!tokenId) {
      return { success: false, error: 'Missing token identifier' };
    }

    const { data: session, error } = await this.supabase
      .from('active_sessions')
      .select(`
        *,
        user:users!inner(
          id, 
          email, 
          user_type,
          is_active,
          email_verified,
          supplier:suppliers(
            id, 
            name,
            subscription_tier,
            is_active,
            wedding_seasons_active,
            supplier_type
          ),
          couple:couples(
            id, 
            couple_name,
            wedding_date,
            venue_name,
            guest_count,
            budget_range
          )
        )
      `)
      .eq('session_token', tokenId)
      .eq('is_active', true)
      .eq('user.is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return { success: false, error: 'Session not found, expired, or user account disabled' };
    }

    // Check for account security flags
    if (!session.user.email_verified) {
      return { success: false, error: 'Email verification required' };
    }

    // Check session security flags
    if (session.is_suspicious) {
      return { success: false, error: 'Session flagged for suspicious activity' };
    }

    // Verify IP consistency for security
    const currentIP = this.getClientIP(request);
    if (session.ip_address && session.ip_address !== currentIP) {
      // Log IP change event
      await this.logSecurityEvent({
        eventType: 'session_ip_change',
        userId: session.user.id,
        sessionId: session.id,
        severity: 'medium',
        description: `Session IP changed from ${session.ip_address} to ${currentIP}`,
        oldIP: session.ip_address,
        newIP: currentIP,
      });
    }

    return { success: true, session };
  }

  private async buildUserContext(session: any): Promise<AuthenticatedUser> {
    const user = session.user;
    
    // Determine if currently in peak wedding season
    const isWeddingSeasonActive = this.isCurrentlyWeddingSeason();
    
    // Build comprehensive permissions based on user type and context
    const permissions = await this.buildUserPermissions(user);

    return {
      id: user.id,
      email: user.email,
      user_type: user.user_type,
      supplier_id: user.supplier?.id,
      couple_id: user.couple?.id,
      subscription_tier: user.supplier?.subscription_tier || 'free',
      wedding_date: user.couple?.wedding_date,
      session_id: session.id,
      permissions,
      is_wedding_season_active: isWeddingSeasonActive,
    };
  }

  private async buildUserPermissions(user: any): Promise<string[]> {
    const permissions: string[] = [];

    // Base permissions for all authenticated users
    permissions.push('read:own_profile', 'update:own_profile');

    // Supplier permissions
    if (user.user_type === 'supplier' && user.supplier) {
      permissions.push(
        'read:own_clients',
        'create:own_clients', 
        'update:own_clients',
        'read:own_bookings',
        'create:own_bookings',
        'read:own_forms',
        'create:own_forms'
      );

      // Premium supplier permissions
      if (user.supplier.subscription_tier === 'premium') {
        permissions.push(
          'read:analytics',
          'export:client_data',
          'bulk:client_operations',
          'advanced:form_features'
        );
      }

      // Enterprise supplier permissions
      if (user.supplier.subscription_tier === 'enterprise') {
        permissions.push(
          'api:full_access',
          'webhook:manage',
          'integration:third_party',
          'bulk:advanced_operations'
        );
      }
    }

    // Couple permissions
    if (user.user_type === 'couple' && user.couple) {
      permissions.push(
        'read:own_wedding',
        'update:own_wedding',
        'read:suppliers',
        'contact:suppliers',
        'submit:forms',
        'view:bookings'
      );

      // Enhanced permissions for couples with upcoming weddings
      if (user.couple.wedding_date) {
        const weddingDate = new Date(user.couple.wedding_date);
        const daysUntilWedding = Math.ceil(
          (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilWedding <= 90 && daysUntilWedding > 0) {
          permissions.push('priority:support', 'expedited:requests');
        }
      }
    }

    // Admin permissions
    if (user.user_type === 'admin') {
      permissions.push(
        'read:all',
        'write:all',
        'delete:all',
        'admin:system',
        'admin:users',
        'admin:security'
      );
    }

    return permissions;
  }

  private async updateSessionActivity(
    sessionId: string, 
    request: NextRequest, 
    requestId: string
  ): Promise<void> {
    const currentIP = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent');
    
    await this.supabase
      .from('active_sessions')
      .update({
        last_activity: new Date().toISOString(),
        ip_address: currentIP,
        user_agent: userAgent,
        // Reset failed requests on successful auth
        failed_requests: 0,
      })
      .eq('id', sessionId);
  }

  private async checkSuspiciousActivity(user: AuthenticatedUser, request: NextRequest): Promise<void> {
    const currentTime = Date.now();
    const userAgent = request.headers.get('user-agent');
    const ipAddress = this.getClientIP(request);

    // Check for rapid requests from same user (potential automation)
    const recentRequests = await this.getRecentRequestCount(user.id, 300); // 5 minutes
    if (recentRequests > 100) {
      await this.flagSuspiciousActivity(user, 'rapid_requests', {
        requestCount: recentRequests,
        timeWindow: '5_minutes'
      });
    }

    // Check for unusual user agent patterns
    if (userAgent && this.isSuspiciousUserAgent(userAgent)) {
      await this.flagSuspiciousActivity(user, 'suspicious_user_agent', {
        userAgent,
        ipAddress
      });
    }

    // Check for access patterns inconsistent with wedding industry workflows
    const recentEndpoints = await this.getRecentEndpointAccess(user.id, 3600); // 1 hour
    if (this.isUnusualAccessPattern(recentEndpoints, user.user_type)) {
      await this.flagSuspiciousActivity(user, 'unusual_access_pattern', {
        endpoints: recentEndpoints,
        userType: user.user_type
      });
    }
  }

  private async flagSuspiciousActivity(
    user: AuthenticatedUser, 
    activityType: string, 
    details: any
  ): Promise<void> {
    // Mark session as suspicious
    await this.supabase
      .from('active_sessions')
      .update({ is_suspicious: true })
      .eq('id', user.session_id);

    // Log security event
    await this.logSecurityEvent({
      eventType: 'suspicious_activity',
      userId: user.id,
      sessionId: user.session_id,
      severity: 'medium',
      description: `Suspicious activity detected: ${activityType}`,
      additionalData: details,
    });
  }

  private isCurrentlyWeddingSeason(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    return currentMonth >= 4 && currentMonth <= 9; // April through September
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /headless/i, /phantom/i, /selenium/i,
      /python-requests/i, /curl/i, /wget/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private isUnusualAccessPattern(endpoints: string[], userType: string): boolean {
    // Define normal patterns for each user type
    const normalPatterns = {
      supplier: ['/api/suppliers/', '/api/clients/', '/api/bookings/', '/api/forms/'],
      couple: ['/api/couples/', '/api/suppliers/search', '/api/forms/submit'],
      admin: [] // Admins can access anything
    };

    if (userType === 'admin') return false;

    const normalPrefixes = normalPatterns[userType as keyof typeof normalPatterns] || [];
    const unusualEndpoints = endpoints.filter(endpoint =>
      !normalPrefixes.some(prefix => endpoint.startsWith(prefix))
    );

    // Flag if more than 30% of requests are to unusual endpoints
    return unusualEndpoints.length / endpoints.length > 0.3;
  }

  private getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           request.headers.get('x-real-ip') ||
           request.ip ||
           '0.0.0.0';
  }

  private async getRecentRequestCount(userId: string, seconds: number): Promise<number> {
    const since = new Date(Date.now() - seconds * 1000).toISOString();
    
    const { count } = await this.supabase
      .from('request_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);

    return count || 0;
  }

  private async getRecentEndpointAccess(userId: string, seconds: number): Promise<string[]> {
    const since = new Date(Date.now() - seconds * 1000).toISOString();
    
    const { data } = await this.supabase
      .from('request_logs')
      .select('request_path')
      .eq('user_id', userId)
      .gte('created_at', since)
      .limit(100);

    return data?.map(row => row.request_path) || [];
  }

  private async logSecurityEvent(event: {
    eventType: string;
    userId?: string;
    sessionId?: string;
    severity: string;
    description: string;
    additionalData?: any;
    oldIP?: string;
    newIP?: string;
  }): Promise<void> {
    await this.supabase.from('security_events').insert({
      event_type: event.eventType,
      request_id: uuidv4(),
      ip_address: event.newIP || '0.0.0.0',
      user_id: event.userId,
      severity: event.severity,
      description: event.description,
      additional_data: event.additionalData,
      action_taken: 'logged',
      created_at: new Date().toISOString(),
    });
  }

  async hasPermission(user: AuthenticatedUser, permission: string): Promise<boolean> {
    return user.permissions.includes(permission) || user.permissions.includes('*');
  }

  async requirePermission(user: AuthenticatedUser, permission: string): Promise<void> {
    const hasAccess = await this.hasPermission(user, permission);
    if (!hasAccess) {
      throw new Error(`Insufficient permissions: ${permission} required`);
    }
  }

  async createSession(userId: string, request: NextRequest): Promise<string> {
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.supabase.from('active_sessions').insert({
      session_token: sessionToken,
      user_id: userId,
      ip_address: this.getClientIP(request),
      user_agent: request.headers.get('user-agent'),
      expires_at: expiresAt.toISOString(),
      is_active: true,
    });

    return sessionToken;
  }

  async invalidateSession(sessionId: string, reason: string): Promise<void> {
    await this.supabase
      .from('active_sessions')
      .update({
        is_active: false,
        invalidated_at: new Date().toISOString(),
        invalidation_reason: reason,
      })
      .eq('id', sessionId);
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.supabase
      .from('active_sessions')
      .update({ is_active: false, invalidation_reason: 'expired' })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true);
  }
}

export const authMiddleware = new AuthenticationMiddleware();
```

### Distributed Rate Limiting System
```typescript
// lib/middleware/rate-limiting.ts
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
  burstLimit?: number;
  identifier: string;
  endpoint: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetTime: number;
  retryAfterMinutes?: number;
  reason?: string;
}

export interface RateLimitRequest {
  identifier: string;
  endpoint: string;
  windowSeconds: number;
  maxRequests: number;
  userId?: string;
  supplierId?: string;
  subscriptionTier: string;
  requestId: string;
}

export class DistributedRateLimiter {
  private redis = Redis.fromEnv();
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Wedding industry rate limit configurations
  private readonly RATE_LIMIT_TIERS = {
    free: {
      api: { windowSeconds: 3600, maxRequests: 100, burstLimit: 10 },
      forms: { windowSeconds: 3600, maxRequests: 20, burstLimit: 3 },
      ai: { windowSeconds: 3600, maxRequests: 10, burstLimit: 2 },
      search: { windowSeconds: 60, maxRequests: 30, burstLimit: 10 },
    },
    basic: {
      api: { windowSeconds: 3600, maxRequests: 500, burstLimit: 25 },
      forms: { windowSeconds: 3600, maxRequests: 100, burstLimit: 10 },
      ai: { windowSeconds: 3600, maxRequests: 50, burstLimit: 5 },
      search: { windowSeconds: 60, maxRequests: 100, burstLimit: 20 },
    },
    premium: {
      api: { windowSeconds: 3600, maxRequests: 2000, burstLimit: 100 },
      forms: { windowSeconds: 3600, maxRequests: 500, burstLimit: 25 },
      ai: { windowSeconds: 3600, maxRequests: 200, burstLimit: 20 },
      search: { windowSeconds: 60, maxRequests: 300, burstLimit: 50 },
    },
    enterprise: {
      api: { windowSeconds: 3600, maxRequests: 10000, burstLimit: 500 },
      forms: { windowSeconds: 3600, maxRequests: 2000, burstLimit: 100 },
      ai: { windowSeconds: 3600, maxRequests: 1000, burstLimit: 100 },
      search: { windowSeconds: 60, maxRequests: 1000, burstLimit: 200 },
    },
  };

  async checkRateLimit(request: RateLimitRequest): Promise<RateLimitResult> {
    try {
      // Determine rate limit configuration
      const config = this.getRateLimitConfig(request.endpoint, request.subscriptionTier);
      
      // Create cache keys for different time windows
      const hourlyKey = this.createRedisKey(request.identifier, request.endpoint, 'hourly');
      const burstKey = this.createRedisKey(request.identifier, request.endpoint, 'burst');
      
      // Check burst limit (1 minute window)
      const burstResult = await this.checkBurstLimit(burstKey, config);
      if (!burstResult.allowed) {
        await this.logRateLimitViolation(request, 'burst_limit_exceeded', burstResult);
        return burstResult;
      }

      // Check hourly limit
      const hourlyResult = await this.checkHourlyLimit(hourlyKey, config);
      if (!hourlyResult.allowed) {
        await this.logRateLimitViolation(request, 'hourly_limit_exceeded', hourlyResult);
        return hourlyResult;
      }

      // Check for wedding season adjustments
      const seasonAdjustment = await this.applyWeddingSeasonAdjustment(request);
      if (!seasonAdjustment.allowed) {
        await this.logRateLimitViolation(request, 'wedding_season_limit', seasonAdjustment);
        return seasonAdjustment;
      }

      // Increment counters for successful requests
      await Promise.all([
        this.incrementCounter(burstKey, 60), // 1 minute expiry
        this.incrementCounter(hourlyKey, 3600), // 1 hour expiry
      ]);

      // Update rate limit bucket in database for persistence
      await this.updateRateLimitBucket(request, config);

      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - hourlyResult.currentCount - 1),
        limit: config.maxRequests,
        resetTime: Date.now() + (config.windowSeconds * 1000),
      };

    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open for rate limiting errors to avoid blocking legitimate users
      return {
        allowed: true,
        remaining: 100,
        limit: 1000,
        resetTime: Date.now() + 3600000, // 1 hour
        reason: 'Rate limiting service unavailable',
      };
    }
  }

  private getRateLimitConfig(endpoint: string, tier: string): {
    windowSeconds: number;
    maxRequests: number;
    burstLimit: number;
  } {
    const tierConfig = this.RATE_LIMIT_TIERS[tier as keyof typeof this.RATE_LIMIT_TIERS] || 
                      this.RATE_LIMIT_TIERS.free;

    // Determine endpoint category
    if (endpoint.includes('/api/ai')) {
      return tierConfig.ai;
    } else if (endpoint.includes('/api/forms/submit')) {
      return tierConfig.forms;
    } else if (endpoint.includes('/api/suppliers/search') || endpoint.includes('/api/venues/search')) {
      return tierConfig.search;
    } else {
      return tierConfig.api;
    }
  }

  private createRedisKey(identifier: string, endpoint: string, window: string): string {
    const endpointHash = endpoint.replace(/\/\d+/g, '/:id'); // Normalize dynamic routes
    return `ratelimit:${window}:${identifier}:${endpointHash}`;
  }

  private async checkBurstLimit(key: string, config: any): Promise<RateLimitResult> {
    const current = await this.redis.get<number>(key) || 0;
    const limit = config.burstLimit || 10;
    
    if (current >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetTime: Date.now() + 60000, // 1 minute
        retryAfterMinutes: 1,
        reason: 'Burst limit exceeded - too many requests in short time',
      };
    }

    return {
      allowed: true,
      remaining: limit - current - 1,
      limit,
      resetTime: Date.now() + 60000,
      currentCount: current,
    } as RateLimitResult & { currentCount: number };
  }

  private async checkHourlyLimit(key: string, config: any): Promise<RateLimitResult> {
    const current = await this.redis.get<number>(key) || 0;
    const limit = config.maxRequests;
    
    if (current >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetTime: Date.now() + (config.windowSeconds * 1000),
        retryAfterMinutes: Math.ceil(config.windowSeconds / 60),
        reason: 'Hourly rate limit exceeded',
      };
    }

    return {
      allowed: true,
      remaining: limit - current - 1,
      limit,
      resetTime: Date.now() + (config.windowSeconds * 1000),
      currentCount: current,
    } as RateLimitResult & { currentCount: number };
  }

  private async applyWeddingSeasonAdjustment(request: RateLimitRequest): Promise<RateLimitResult> {
    // During peak wedding season (May-September), apply stricter limits for non-premium users
    const currentMonth = new Date().getMonth() + 1;
    const isPeakSeason = currentMonth >= 5 && currentMonth <= 9;
    
    if (isPeakSeason && !['premium', 'enterprise'].includes(request.subscriptionTier)) {
      // Apply 25% reduction to rate limits during peak season for free/basic users
      const seasonalKey = this.createRedisKey(request.identifier, 'seasonal', 'peak');
      const seasonalLimit = Math.floor(this.RATE_LIMIT_TIERS[request.subscriptionTier as keyof typeof this.RATE_LIMIT_TIERS].api.maxRequests * 0.75);
      
      const current = await this.redis.get<number>(seasonalKey) || 0;
      
      if (current >= seasonalLimit) {
        return {
          allowed: false,
          remaining: 0,
          limit: seasonalLimit,
          resetTime: Date.now() + 3600000, // 1 hour
          retryAfterMinutes: 60,
          reason: 'Peak wedding season rate limit - upgrade for higher limits',
        };
      }

      await this.incrementCounter(seasonalKey, 3600); // 1 hour expiry
    }

    return { allowed: true, remaining: 100, limit: 1000, resetTime: Date.now() + 3600000 };
  }

  private async incrementCounter(key: string, expireSeconds: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, expireSeconds);
    await pipeline.exec();
  }

  private async updateRateLimitBucket(request: RateLimitRequest, config: any): Promise<void> {
    const windowStart = new Date(Math.floor(Date.now() / (config.windowSeconds * 1000)) * config.windowSeconds * 1000);
    
    await this.supabase.from('rate_limit_buckets').upsert({
      identifier: request.identifier,
      endpoint_pattern: request.endpoint.replace(/\/\d+/g, '/:id'),
      requests_count: 1,
      window_start: windowStart.toISOString(),
      window_duration_seconds: config.windowSeconds,
      max_requests: config.maxRequests,
      user_id: request.userId,
      supplier_id: request.supplierId,
      subscription_tier: request.subscriptionTier,
    }, {
      onConflict: 'identifier,endpoint_pattern',
      ignoreDuplicates: false,
    });
  }

  private async logRateLimitViolation(
    request: RateLimitRequest,
    violationType: string,
    result: RateLimitResult
  ): Promise<void> {
    await this.supabase.from('security_events').insert({
      event_type: 'rate_limit_exceeded',
      request_id: request.requestId,
      ip_address: '0.0.0.0', // Will be populated by calling middleware
      user_id: request.userId,
      supplier_id: request.supplierId,
      severity: 'medium',
      description: `Rate limit violation: ${violationType}`,
      action_taken: 'throttled',
      blocked_duration_minutes: result.retryAfterMinutes,
      additional_data: {
        endpoint: request.endpoint,
        subscription_tier: request.subscriptionTier,
        limit: result.limit,
        current_count: (result as any).currentCount,
        violation_type: violationType,
      },
    });
  }

  async resetRateLimit(identifier: string, endpoint?: string): Promise<void> {
    if (endpoint) {
      // Reset specific endpoint
      const keys = [
        this.createRedisKey(identifier, endpoint, 'hourly'),
        this.createRedisKey(identifier, endpoint, 'burst'),
      ];
      await this.redis.del(...keys);
    } else {
      // Reset all limits for identifier
      const pattern = `ratelimit:*:${identifier}:*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }

  async getRateLimitStatus(identifier: string): Promise<{
    hourlyUsage: number;
    hourlyLimit: number;
    burstUsage: number;
    burstLimit: number;
    resetTime: number;
  }> {
    // Get general API usage (most common endpoint type)
    const hourlyKey = this.createRedisKey(identifier, '/api/general', 'hourly');
    const burstKey = this.createRedisKey(identifier, '/api/general', 'burst');

    const [hourlyUsage, burstUsage] = await Promise.all([
      this.redis.get<number>(hourlyKey),
      this.redis.get<number>(burstKey),
    ]);

    return {
      hourlyUsage: hourlyUsage || 0,
      hourlyLimit: 1000, // Default, should be determined by tier
      burstUsage: burstUsage || 0,
      burstLimit: 50,
      resetTime: Date.now() + 3600000, // 1 hour from now
    };
  }

  async cleanupExpiredBuckets(): Promise<void> {
    // Clean up old rate limit buckets from database
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    await this.supabase
      .from('rate_limit_buckets')
      .delete()
      .lt('window_start', cutoffTime.toISOString());
  }
}

export const rateLimiter = new DistributedRateLimiter();

export async function rateLimitCheck(request: RateLimitRequest): Promise<RateLimitResult> {
  return rateLimiter.checkRateLimit(request);
}
```

### Security Event Logging System
```typescript
// lib/middleware/logging.ts
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface SecurityEvent {
  eventType: 'auth_failure' | 'rate_limit_exceeded' | 'invalid_token' | 'suspicious_request' | 
           'csrf_violation' | 'permission_denied' | 'malformed_request' | 'ip_blocked' |
           'middleware_error' | 'session_ip_change' | 'suspicious_activity';
  requestId: string;
  ipAddress: string;
  userAgent?: string;
  requestPath: string;
  requestMethod: string;
  userId?: string;
  supplierId?: string;
  sessionId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  additionalData?: Record<string, any>;
  actionTaken?: 'blocked' | 'throttled' | 'logged' | 'alerted';
  blockedDurationMinutes?: number;
  affectedCouples?: string[];
  dataAccessAttempted?: string[];
}

export interface RequestLog {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  supplierId?: string;
  userAgent?: string;
  ipAddress?: string;
  subscriptionTier?: string;
  responseTime: number;
  rateLimitRemaining?: number;
  isPublic?: boolean;
  businessContext?: {
    weddingDate?: string;
    venueType?: string;
    supplierType?: string;
    guestCount?: number;
    budgetRange?: string;
  };
}

export interface PerformanceMetric {
  middlewareName: 'auth' | 'rate_limit' | 'validation' | 'logging' | 'csrf';
  executionTimeMs: number;
  memoryUsageMb?: number;
  requestSizeBytes?: number;
  endpointPattern: string;
  requestMethod: string;
  userType?: 'supplier' | 'couple' | 'admin' | 'anonymous';
  isWeddingSeason: boolean;
  concurrentUsers?: number;
  success: boolean;
  errorMessage?: string;
}

export class MiddlewareLoggingSystem {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  private requestBuffer: RequestLog[] = [];
  private eventBuffer: SecurityEvent[] = [];
  private performanceBuffer: PerformanceMetric[] = [];
  private readonly BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  constructor() {
    // Start periodic buffer flush
    setInterval(() => this.flushBuffers(), this.FLUSH_INTERVAL);
    
    // Flush buffers on process exit
    process.on('exit', () => this.flushBuffersSync());
    process.on('SIGINT', () => this.flushBuffersSync());
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    // Add timestamp and enrich event data
    const enrichedEvent = {
      ...event,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      // Add wedding industry context if available
      wedding_context: await this.getWeddingContext(event.userId, event.supplierId),
    };

    this.eventBuffer.push(enrichedEvent as any);

    // Flush immediately for critical events
    if (event.severity === 'critical') {
      await this.flushSecurityEvents();
      await this.sendCriticalAlert(enrichedEvent);
    }

    // Check buffer size
    if (this.eventBuffer.length >= this.BUFFER_SIZE) {
      await this.flushSecurityEvents();
    }
  }

  async logRequest(log: RequestLog): Promise<void> {
    const enrichedLog = {
      ...log,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      // Calculate additional metrics
      is_slow_request: log.responseTime > 1000,
      is_wedding_season: this.isWeddingSeason(),
    };

    this.requestBuffer.push(enrichedLog as any);

    // Check buffer size
    if (this.requestBuffer.length >= this.BUFFER_SIZE) {
      await this.flushRequestLogs();
    }
  }

  async logPerformanceMetric(metric: PerformanceMetric): Promise<void> {
    const enrichedMetric = {
      ...metric,
      id: uuidv4(),
      measured_at: new Date().toISOString(),
      is_wedding_season: this.isWeddingSeason(),
    };

    this.performanceBuffer.push(enrichedMetric as any);

    // Check buffer size
    if (this.performanceBuffer.length >= this.BUFFER_SIZE) {
      await this.flushPerformanceMetrics();
    }
  }

  private async flushBuffers(): Promise<void> {
    await Promise.all([
      this.flushRequestLogs(),
      this.flushSecurityEvents(),
      this.flushPerformanceMetrics(),
    ]);
  }

  private async flushRequestLogs(): Promise<void> {
    if (this.requestBuffer.length === 0) return;

    try {
      const logs = [...this.requestBuffer];
      this.requestBuffer = [];

      await this.supabase.from('request_logs').insert(logs);
    } catch (error) {
      console.error('Failed to flush request logs:', error);
      // Re-add failed logs to buffer for retry
      this.requestBuffer.unshift(...this.requestBuffer);
    }
  }

  private async flushSecurityEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      const events = [...this.eventBuffer];
      this.eventBuffer = [];

      await this.supabase.from('security_events').insert(events);
    } catch (error) {
      console.error('Failed to flush security events:', error);
      // Re-add failed events to buffer for retry
      this.eventBuffer.unshift(...this.eventBuffer);
    }
  }

  private async flushPerformanceMetrics(): Promise<void> {
    if (this.performanceBuffer.length === 0) return;

    try {
      const metrics = [...this.performanceBuffer];
      this.performanceBuffer = [];

      await this.supabase.from('middleware_performance').insert(metrics);
    } catch (error) {
      console.error('Failed to flush performance metrics:', error);
      // Re-add failed metrics to buffer for retry
      this.performanceBuffer.unshift(...this.performanceBuffer);
    }
  }

  private flushBuffersSync(): void {
    // Synchronous flush for process exit
    this.flushBuffers().catch(console.error);
  }

  private async getWeddingContext(userId?: string, supplierId?: string): Promise<any> {
    if (!userId && !supplierId) return null;

    try {
      let context: any = {};

      if (supplierId) {
        const { data: supplier } = await this.supabase
          .from('suppliers')
          .select('supplier_type, wedding_seasons_active, subscription_tier')
          .eq('id', supplierId)
          .single();
        
        if (supplier) {
          context.supplier_type = supplier.supplier_type;
          context.wedding_seasons_active = supplier.wedding_seasons_active;
          context.subscription_tier = supplier.subscription_tier;
        }
      }

      if (userId) {
        const { data: user } = await this.supabase
          .from('users')
          .select(`
            user_type,
            couple:couples(wedding_date, guest_count, budget_range, venue_name)
          `)
          .eq('id', userId)
          .single();

        if (user?.couple) {
          context.wedding_date = user.couple.wedding_date;
          context.guest_count = user.couple.guest_count;
          context.budget_range = user.couple.budget_range;
          context.venue_type = this.categorizeVenue(user.couple.venue_name);
        }
      }

      return Object.keys(context).length > 0 ? context : null;
    } catch (error) {
      return null; // Don't fail logging due to context enrichment errors
    }
  }

  private categorizeVenue(venueName?: string): string | undefined {
    if (!venueName) return undefined;
    
    const name = venueName.toLowerCase();
    if (name.includes('church') || name.includes('cathedral')) return 'religious';
    if (name.includes('hall') || name.includes('manor') || name.includes('estate')) return 'historic';
    if (name.includes('garden') || name.includes('outdoor') || name.includes('park')) return 'outdoor';
    if (name.includes('hotel') || name.includes('resort')) return 'hospitality';
    if (name.includes('barn') || name.includes('farm')) return 'rustic';
    
    return 'other';
  }

  private async sendCriticalAlert(event: any): Promise<void> {
    // Send critical security alerts through multiple channels
    try {
      // Email alert to security team
      // Implementation would integrate with email service
      
      // Slack alert to security channel
      // Implementation would integrate with Slack webhook
      
      // Log critical event to external monitoring
      console.error(`CRITICAL SECURITY EVENT: ${event.event_type}`, {
        description: event.description,
        user_id: event.user_id,
        ip_address: event.ip_address,
        timestamp: event.created_at,
      });
    } catch (error) {
      console.error('Failed to send critical alert:', error);
    }
  }

  private isWeddingSeason(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    return currentMonth >= 4 && currentMonth <= 9; // April through September
  }

  async getSecurityMetrics(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    topThreats: Array<{ type: string; count: number; latest: string }>;
    blockedIPs: string[];
  }> {
    const now = new Date();
    let since: Date;
    
    switch (timeRange) {
      case 'hour':
        since = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'week':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const { data: events } = await this.supabase
      .from('security_events')
      .select('event_type, severity, ip_address, created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (!events) {
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        topThreats: [],
        blockedIPs: [],
      };
    }

    // Aggregate metrics
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const threatCounts: Record<string, { count: number; latest: string }> = {};
    const blockedIPs = new Set<string>();

    for (const event of events) {
      eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      
      if (!threatCounts[event.event_type] || event.created_at > threatCounts[event.event_type].latest) {
        threatCounts[event.event_type] = {
          count: eventsByType[event.event_type],
          latest: event.created_at,
        };
      }

      if (['high', 'critical'].includes(event.severity)) {
        blockedIPs.add(event.ip_address);
      }
    }

    const topThreats = Object.entries(threatCounts)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5)
      .map(([type, data]) => ({ type, count: data.count, latest: data.latest }));

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      topThreats,
      blockedIPs: Array.from(blockedIPs),
    };
  }
}

export const middlewareLogger = new MiddlewareLoggingSystem();

// Export convenience functions
export const logSecurityEvent = (event: SecurityEvent) => middlewareLogger.logSecurityEvent(event);
export const logRequest = (log: RequestLog) => middlewareLogger.logRequest(log);
export const logPerformanceMetric = (metric: PerformanceMetric) => middlewareLogger.logPerformanceMetric(metric);
```

---

**EXECUTE IMMEDIATELY - Comprehensive middleware infrastructure with authentication, rate limiting, and security monitoring for wedding industry APIs!**