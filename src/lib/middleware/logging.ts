// lib/middleware/logging.ts
import { createClient } from '@supabase/supabase-js';
// import { randomUUID } from 'crypto'; // Edge Runtime compatibility

export interface SecurityEvent {
  eventType:
    | 'auth_failure'
    | 'rate_limit_exceeded'
    | 'invalid_token'
    | 'suspicious_request'
    | 'csrf_violation'
    | 'permission_denied'
    | 'malformed_request'
    | 'ip_blocked'
    | 'middleware_error'
    | 'session_ip_change'
    | 'suspicious_activity';
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
  mobileContext?: {
    isMobile: boolean;
    deviceType?: string;
    screenSize?: string;
    touchSupport?: boolean;
  };
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
  mobileContext?: {
    isMobile: boolean;
    deviceType?: string;
    screenSize?: string;
    touchSupport?: boolean;
  };
}

export interface PerformanceMetric {
  middlewareName:
    | 'auth'
    | 'rate_limit'
    | 'validation'
    | 'logging'
    | 'csrf'
    | 'mobile-optimization';
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
  additionalData?: Record<string, any>;
}

export class MiddlewareLoggingSystem {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
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
    // Skip process events in Edge Runtime environment
    if (typeof process !== 'undefined' && process.on) {
      process.on('exit', () => this.flushBuffersSync());
      process.on('SIGINT', () => this.flushBuffersSync());
    }
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    // Add timestamp and enrich event data
    const enrichedEvent = {
      ...event,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      // Add wedding industry context if available
      wedding_context: await this.getWeddingContext(
        event.userId,
        event.supplierId,
      ),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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

  private async getWeddingContext(
    userId?: string,
    supplierId?: string,
  ): Promise<any> {
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
          .select(
            `
            user_type,
            couple:couples(wedding_date, guest_count, budget_range, venue_name)
          `,
          )
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
    if (name.includes('church') || name.includes('cathedral'))
      return 'religious';
    if (
      name.includes('hall') ||
      name.includes('manor') ||
      name.includes('estate')
    )
      return 'historic';
    if (
      name.includes('garden') ||
      name.includes('outdoor') ||
      name.includes('park')
    )
      return 'outdoor';
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

  async getSecurityMetrics(
    timeRange: 'hour' | 'day' | 'week' = 'day',
  ): Promise<{
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
      eventsByType[event.event_type] =
        (eventsByType[event.event_type] || 0) + 1;
      eventsBySeverity[event.severity] =
        (eventsBySeverity[event.severity] || 0) + 1;

      if (
        !threatCounts[event.event_type] ||
        event.created_at > threatCounts[event.event_type].latest
      ) {
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
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([type, data]) => ({
        type,
        count: data.count,
        latest: data.latest,
      }));

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
export const logSecurityEvent = (event: SecurityEvent) =>
  middlewareLogger.logSecurityEvent(event);
export const logRequest = (log: RequestLog) => middlewareLogger.logRequest(log);
export const logPerformanceMetric = (metric: PerformanceMetric) =>
  middlewareLogger.logPerformanceMetric(metric);
