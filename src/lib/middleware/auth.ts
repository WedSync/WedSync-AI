// lib/middleware/auth.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createClient } from '@supabase/supabase-js';
// import { randomUUID } from 'crypto'; // Edge Runtime compatibility

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
    process.env.SUPABASE_SERVICE_KEY!,
  );

  async authenticateRequest(
    request: NextRequest,
    requestId: string,
  ): Promise<AuthResult> {
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
        raw: false,
      });

      if (!decodedToken) {
        return { success: false, error: 'Invalid or malformed JWT token' };
      }

      // Step 3: Validate active session in database
      const sessionResult = await this.validateActiveSession(
        decodedToken.jti,
        request,
      );
      if (!sessionResult.success) {
        return sessionResult;
      }

      // Step 4: Build comprehensive user context with wedding industry data
      const user = await this.buildUserContext(sessionResult.session!);

      // Step 5: Update session activity and security tracking
      await this.updateSessionActivity(
        sessionResult.session!.id,
        request,
        requestId,
      );

      // Step 6: Check for suspicious activity patterns
      await this.checkSuspiciousActivity(user, request);

      return {
        success: true,
        user,
        sessionExpiry: new Date(sessionResult.session!.expires_at),
      };
    } catch (error) {
      return {
        success: false,
        error: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    const sessionToken =
      request.cookies.get('next-auth.session-token')?.value ||
      request.cookies.get('__Secure-next-auth.session-token')?.value;

    return sessionToken || null;
  }

  private async validateActiveSession(
    tokenId: string | undefined,
    request: NextRequest,
  ): Promise<{
    success: boolean;
    session?: any;
    error?: string;
  }> {
    if (!tokenId) {
      return { success: false, error: 'Missing token identifier' };
    }

    const { data: session, error } = await this.supabase
      .from('active_sessions')
      .select(
        `
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
      `,
      )
      .eq('session_token', tokenId)
      .eq('is_active', true)
      .eq('user.is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return {
        success: false,
        error: 'Session not found, expired, or user account disabled',
      };
    }

    // Check for account security flags
    if (!session.user.email_verified) {
      return { success: false, error: 'Email verification required' };
    }

    // Check session security flags
    if (session.is_suspicious) {
      return {
        success: false,
        error: 'Session flagged for suspicious activity',
      };
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
        'create:own_forms',
      );

      // Premium supplier permissions
      if (user.supplier.subscription_tier === 'premium') {
        permissions.push(
          'read:analytics',
          'export:client_data',
          'bulk:client_operations',
          'advanced:form_features',
        );
      }

      // Enterprise supplier permissions
      if (user.supplier.subscription_tier === 'enterprise') {
        permissions.push(
          'api:full_access',
          'webhook:manage',
          'integration:third_party',
          'bulk:advanced_operations',
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
        'view:bookings',
      );

      // Enhanced permissions for couples with upcoming weddings
      if (user.couple.wedding_date) {
        const weddingDate = new Date(user.couple.wedding_date);
        const daysUntilWedding = Math.ceil(
          (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
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
        'admin:security',
      );
    }

    return permissions;
  }

  private async updateSessionActivity(
    sessionId: string,
    request: NextRequest,
    requestId: string,
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

  private async checkSuspiciousActivity(
    user: AuthenticatedUser,
    request: NextRequest,
  ): Promise<void> {
    const currentTime = Date.now();
    const userAgent = request.headers.get('user-agent');
    const ipAddress = this.getClientIP(request);

    // Check for rapid requests from same user (potential automation)
    const recentRequests = await this.getRecentRequestCount(user.id, 300); // 5 minutes
    if (recentRequests > 100) {
      await this.flagSuspiciousActivity(user, 'rapid_requests', {
        requestCount: recentRequests,
        timeWindow: '5_minutes',
      });
    }

    // Check for unusual user agent patterns
    if (userAgent && this.isSuspiciousUserAgent(userAgent)) {
      await this.flagSuspiciousActivity(user, 'suspicious_user_agent', {
        userAgent,
        ipAddress,
      });
    }

    // Check for access patterns inconsistent with wedding industry workflows
    const recentEndpoints = await this.getRecentEndpointAccess(user.id, 3600); // 1 hour
    if (this.isUnusualAccessPattern(recentEndpoints, user.user_type)) {
      await this.flagSuspiciousActivity(user, 'unusual_access_pattern', {
        endpoints: recentEndpoints,
        userType: user.user_type,
      });
    }
  }

  private async flagSuspiciousActivity(
    user: AuthenticatedUser,
    activityType: string,
    details: any,
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
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /headless/i,
      /phantom/i,
      /selenium/i,
      /python-requests/i,
      /curl/i,
      /wget/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  private isUnusualAccessPattern(
    endpoints: string[],
    userType: string,
  ): boolean {
    // Define normal patterns for each user type
    const normalPatterns = {
      supplier: [
        '/api/suppliers/',
        '/api/clients/',
        '/api/bookings/',
        '/api/forms/',
      ],
      couple: ['/api/couples/', '/api/suppliers/search', '/api/forms/submit'],
      admin: [], // Admins can access anything
    };

    if (userType === 'admin') return false;

    const normalPrefixes =
      normalPatterns[userType as keyof typeof normalPatterns] || [];
    const unusualEndpoints = endpoints.filter(
      (endpoint) =>
        !normalPrefixes.some((prefix) => endpoint.startsWith(prefix)),
    );

    // Flag if more than 30% of requests are to unusual endpoints
    return unusualEndpoints.length / endpoints.length > 0.3;
  }

  private getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.ip ||
      '0.0.0.0'
    );
  }

  private async getRecentRequestCount(
    userId: string,
    seconds: number,
  ): Promise<number> {
    const since = new Date(Date.now() - seconds * 1000).toISOString();

    const { count } = await this.supabase
      .from('request_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);

    return count || 0;
  }

  private async getRecentEndpointAccess(
    userId: string,
    seconds: number,
  ): Promise<string[]> {
    const since = new Date(Date.now() - seconds * 1000).toISOString();

    const { data } = await this.supabase
      .from('request_logs')
      .select('request_path')
      .eq('user_id', userId)
      .gte('created_at', since)
      .limit(100);

    return data?.map((row) => row.request_path) || [];
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
      request_id: crypto.randomUUID(),
      ip_address: event.newIP || '0.0.0.0',
      user_id: event.userId,
      severity: event.severity,
      description: event.description,
      additional_data: event.additionalData,
      action_taken: 'logged',
      created_at: new Date().toISOString(),
    });
  }

  async hasPermission(
    user: AuthenticatedUser,
    permission: string,
  ): Promise<boolean> {
    return (
      user.permissions.includes(permission) || user.permissions.includes('*')
    );
  }

  async requirePermission(
    user: AuthenticatedUser,
    permission: string,
  ): Promise<void> {
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
