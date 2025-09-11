/**
 * DDoS Protection System for WedSync Production
 * Multi-layered protection against various attack vectors
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';
import { createClient } from '@supabase/supabase-js';

interface DDoSConfig {
  // Connection limits
  maxConnectionsPerIP: number;
  maxConnectionsGlobal: number;

  // Request pattern analysis
  rapidRequestThreshold: number; // requests per second
  burstRequestWindow: number; // ms

  // Payload protection
  maxPayloadSize: number; // bytes
  maxHeaderSize: number; // bytes

  // Geographic restrictions
  allowedCountries?: string[];
  blockedCountries?: string[];

  // Pattern detection
  enablePatternDetection: boolean;
  suspiciousPatternThreshold: number;

  // Auto-mitigation
  enableAutoMitigation: boolean;
  mitigationDuration: number; // seconds
}

interface AttackVector {
  type: 'volumetric' | 'protocol' | 'application' | 'slowloris' | 'layer7';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  indicators: string[];
}

interface MitigationAction {
  type: 'block' | 'challenge' | 'throttle' | 'captcha';
  duration: number;
  reason: string;
}

export class DDoSProtectionSystem {
  private config: DDoSConfig;
  private connectionTracker = new Map<string, number>();
  private requestTracker = new Map<string, number[]>();
  private patternTracker = new Map<string, string[]>();
  private mitigationCache = new Map<string, MitigationAction>();
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  constructor(config: DDoSConfig) {
    this.config = config;
    this.startCleanupTasks();
  }

  async analyzeRequest(req: NextRequest): Promise<{
    allowed: boolean;
    attackVectors: AttackVector[];
    mitigation?: MitigationAction;
    reason?: string;
  }> {
    const startTime = Date.now();
    const ip = this.extractIP(req);
    const userAgent = req.headers.get('user-agent') || '';

    try {
      // Check existing mitigations
      const existingMitigation = this.mitigationCache.get(ip);
      if (existingMitigation) {
        return {
          allowed: false,
          attackVectors: [],
          mitigation: existingMitigation,
          reason: 'active_mitigation',
        };
      }

      // Analyze potential attack vectors
      const attackVectors = await this.detectAttackVectors(req, ip);

      // Determine if request should be allowed
      const criticalVectors = attackVectors.filter(
        (v) => v.severity === 'critical',
      );
      const highVectors = attackVectors.filter((v) => v.severity === 'high');

      let allowed = true;
      let mitigation: MitigationAction | undefined;

      if (criticalVectors.length > 0) {
        allowed = false;
        mitigation = {
          type: 'block',
          duration: this.config.mitigationDuration * 4,
          reason: `Critical attack detected: ${criticalVectors.map((v) => v.type).join(', ')}`,
        };
      } else if (highVectors.length >= 2) {
        allowed = false;
        mitigation = {
          type: 'throttle',
          duration: this.config.mitigationDuration * 2,
          reason: `Multiple high-severity indicators: ${highVectors.map((v) => v.type).join(', ')}`,
        };
      } else if (highVectors.length === 1 && this.config.enableAutoMitigation) {
        allowed = false;
        mitigation = {
          type: 'challenge',
          duration: this.config.mitigationDuration,
          reason: `High-severity attack indicator: ${highVectors[0].type}`,
        };
      }

      // Apply mitigation if needed
      if (mitigation) {
        this.mitigationCache.set(ip, mitigation);
        setTimeout(() => {
          this.mitigationCache.delete(ip);
        }, mitigation.duration * 1000);

        // Log security event
        await this.logSecurityEvent(req, ip, attackVectors, mitigation);
      }

      // Update tracking data
      this.updateTrackingData(ip, req);

      // Record metrics
      metrics.incrementCounter('ddos_protection.requests_analyzed', 1, {
        ip_classification: this.classifyIP(ip),
        attack_vectors: attackVectors.length.toString(),
        allowed: allowed.toString(),
      });

      if (attackVectors.length > 0) {
        attackVectors.forEach((vector) => {
          metrics.incrementCounter('ddos_protection.attack_vectors', 1, {
            type: vector.type,
            severity: vector.severity,
          });
        });
      }

      return {
        allowed,
        attackVectors,
        mitigation,
        reason: mitigation?.reason,
      };
    } catch (error) {
      logger.error('DDoS analysis failed', error as Error, {
        ip,
        url: req.url,
      });

      // Fail open for availability
      return {
        allowed: true,
        attackVectors: [],
        reason: 'analysis_error',
      };
    } finally {
      metrics.recordHistogram(
        'ddos_protection.analysis_duration',
        Date.now() - startTime,
      );
    }
  }

  private async detectAttackVectors(
    req: NextRequest,
    ip: string,
  ): Promise<AttackVector[]> {
    const vectors: AttackVector[] = [];

    // Check volumetric attacks
    const volumetricVector = await this.detectVolumetricAttack(ip);
    if (volumetricVector) vectors.push(volumetricVector);

    // Check protocol attacks
    const protocolVector = this.detectProtocolAttack(req);
    if (protocolVector) vectors.push(protocolVector);

    // Check application layer attacks
    const applicationVector = this.detectApplicationAttack(req, ip);
    if (applicationVector) vectors.push(applicationVector);

    // Check slowloris attacks
    const slowlorisVector = await this.detectSlowlorisAttack(ip);
    if (slowlorisVector) vectors.push(slowlorisVector);

    // Check Layer 7 attacks
    const layer7Vector = this.detectLayer7Attack(req, ip);
    if (layer7Vector) vectors.push(layer7Vector);

    return vectors;
  }

  private async detectVolumetricAttack(
    ip: string,
  ): Promise<AttackVector | null> {
    const now = Date.now();
    const requests = this.requestTracker.get(ip) || [];

    // Clean old requests (older than 1 minute)
    const recentRequests = requests.filter(
      (timestamp) => now - timestamp < 60000,
    );
    this.requestTracker.set(ip, recentRequests);

    // Check for rapid requests
    const rapidWindow = this.config.burstRequestWindow;
    const recentRapidRequests = recentRequests.filter(
      (timestamp) => now - timestamp < rapidWindow,
    );

    if (recentRapidRequests.length > this.config.rapidRequestThreshold) {
      const rps = recentRapidRequests.length / (rapidWindow / 1000);

      return {
        type: 'volumetric',
        severity: rps > 100 ? 'critical' : rps > 50 ? 'high' : 'medium',
        confidence: Math.min(rps / 100, 1),
        indicators: [
          `${rps.toFixed(1)} requests/second`,
          `${recentRapidRequests.length} requests in ${rapidWindow}ms`,
        ],
      };
    }

    return null;
  }

  private detectProtocolAttack(req: NextRequest): AttackVector | null {
    const indicators: string[] = [];
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for malformed headers
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > this.config.maxPayloadSize) {
      indicators.push(`Oversized payload: ${contentLength} bytes`);
      severity = 'high';
    }

    // Check for suspicious HTTP methods
    const method = req.method;
    const suspiciousMethods = ['TRACE', 'CONNECT', 'OPTIONS'];
    if (suspiciousMethods.includes(method)) {
      indicators.push(`Suspicious HTTP method: ${method}`);
      severity = 'medium';
    }

    // Check for header bombing
    const headerCount = Array.from(req.headers.keys()).length;
    if (headerCount > 50) {
      indicators.push(`Excessive headers: ${headerCount}`);
      severity = 'high';
    }

    // Check for malformed User-Agent
    const userAgent = req.headers.get('user-agent');
    if (!userAgent || userAgent.length < 10 || userAgent.length > 500) {
      indicators.push('Suspicious User-Agent');
      severity = Math.max(
        severity === 'low' ? 'medium' : severity,
        'medium',
      ) as any;
    }

    if (indicators.length > 0) {
      return {
        type: 'protocol',
        severity,
        confidence: indicators.length / 5,
        indicators,
      };
    }

    return null;
  }

  private detectApplicationAttack(
    req: NextRequest,
    ip: string,
  ): AttackVector | null {
    const url = new URL(req.url);
    const path = url.pathname;
    const query = url.search;
    const indicators: string[] = [];
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // SQL injection patterns
    const sqlPatterns = [
      /(\b(union|select|insert|delete|update|drop|create|alter|exec)\b)/i,
      /((\%27)|(\'))((\%6f)|o|(\%4f))((\%72)|r|(\%52))/i,
      /(((\%3d)|(=))[^\n]*((\%27)|(\')|((\%22)|("))))/i,
    ];

    // XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>.*?<\/iframe>/gi,
    ];

    // Path traversal patterns
    const pathTraversalPatterns = [
      /\.\.[\/\\]/,
      /((\%2e)|\.){2,}((\%2f)|\/|((\%5c)|\\))/i,
      /\w*((\%27)|(\'))((\%6f)|o|(\%4f))((\%72)|r|(\%52))/i,
    ];

    const fullUrl = path + query;

    // Check for SQL injection
    if (sqlPatterns.some((pattern) => pattern.test(fullUrl))) {
      indicators.push('SQL injection pattern detected');
      severity = 'high';
    }

    // Check for XSS
    if (xssPatterns.some((pattern) => pattern.test(fullUrl))) {
      indicators.push('XSS pattern detected');
      severity = 'high';
    }

    // Check for path traversal
    if (pathTraversalPatterns.some((pattern) => pattern.test(fullUrl))) {
      indicators.push('Path traversal pattern detected');
      severity = 'high';
    }

    // Check for unusual query parameter count
    const paramCount = url.searchParams.size;
    if (paramCount > 20) {
      indicators.push(`Excessive parameters: ${paramCount}`);
      severity = 'medium';
    }

    // Check for extremely long URLs
    if (fullUrl.length > 2000) {
      indicators.push(`Oversized URL: ${fullUrl.length} characters`);
      severity = 'medium';
    }

    // Check for pattern repetition (potential fuzzing)
    const patterns = this.patternTracker.get(ip) || [];
    patterns.push(path);
    if (patterns.length > 10) {
      patterns.splice(0, patterns.length - 10); // Keep only last 10
    }
    this.patternTracker.set(ip, patterns);

    const uniquePatterns = new Set(patterns);
    if (patterns.length >= 5 && uniquePatterns.size / patterns.length < 0.3) {
      indicators.push('Repetitive pattern detected (possible fuzzing)');
      severity = 'medium';
    }

    if (indicators.length > 0) {
      return {
        type: 'application',
        severity,
        confidence: Math.min(indicators.length / 3, 1),
        indicators,
      };
    }

    return null;
  }

  private async detectSlowlorisAttack(
    ip: string,
  ): Promise<AttackVector | null> {
    // Track connection duration and incomplete requests
    const connectionCount = this.connectionTracker.get(ip) || 0;

    if (connectionCount > this.config.maxConnectionsPerIP) {
      return {
        type: 'slowloris',
        severity:
          connectionCount > this.config.maxConnectionsPerIP * 2
            ? 'critical'
            : 'high',
        confidence: Math.min(
          connectionCount / this.config.maxConnectionsPerIP,
          1,
        ),
        indicators: [
          `${connectionCount} concurrent connections from single IP`,
        ],
      };
    }

    return null;
  }

  private detectLayer7Attack(
    req: NextRequest,
    ip: string,
  ): AttackVector | null {
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';
    const indicators: string[] = [];
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Bot detection patterns
    const botPatterns = [
      /bot|crawl|slurp|spider|scrape/i,
      /python|curl|wget|libwww|perl|php/i,
      /scanner|probe|check|monitor/i,
    ];

    if (botPatterns.some((pattern) => pattern.test(userAgent))) {
      indicators.push('Bot-like User-Agent detected');
      severity = 'medium';
    }

    // Check for missing critical headers
    if (!req.headers.get('accept')) {
      indicators.push('Missing Accept header');
      severity = 'low';
    }

    if (!req.headers.get('accept-language')) {
      indicators.push('Missing Accept-Language header');
      severity = 'low';
    }

    // Check for unusual header combinations
    const hasJavascriptUA = /javascript/i.test(userAgent);
    const hasNoReferer = !referer;

    if (hasJavascriptUA && hasNoReferer) {
      indicators.push('Unusual header combination');
      severity = 'medium';
    }

    // Check for rapid endpoint scanning
    const path = new URL(req.url).pathname;
    const patterns = this.patternTracker.get(ip) || [];

    // Look for common attack paths
    const attackPaths = [
      '/admin',
      '/wp-admin',
      '/.env',
      '/config',
      '/api/admin',
      '/phpmyadmin',
      '/.git',
      '/backup',
      '/test',
      '/dev',
    ];

    if (attackPaths.some((attackPath) => path.includes(attackPath))) {
      indicators.push(`Suspicious path accessed: ${path}`);
      severity = 'high';
    }

    if (indicators.length > 0) {
      return {
        type: 'layer7',
        severity,
        confidence: indicators.length / 4,
        indicators,
      };
    }

    return null;
  }

  private extractIP(req: NextRequest): string {
    // Enhanced IP extraction for production with reverse proxies
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    const xClientIp = req.headers.get('x-client-ip');

    // Prioritize Cloudflare IP, then other sources
    return (
      cfConnectingIp ||
      realIp ||
      forwarded?.split(',')[0]?.trim() ||
      '127.0.0.1'
    );
  }

  private classifyIP(ip: string): string {
    // Basic IP classification for metrics
    if (
      ip.startsWith('127.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.')
    ) {
      return 'private';
    }
    if (ip.includes(':')) {
      return 'ipv6';
    }
    return 'public_ipv4';
  }

  private updateTrackingData(ip: string, req: NextRequest): void {
    // Update request timestamps
    const requests = this.requestTracker.get(ip) || [];
    requests.push(Date.now());
    this.requestTracker.set(ip, requests);

    // Update connection count
    const connections = this.connectionTracker.get(ip) || 0;
    this.connectionTracker.set(ip, connections + 1);

    // Decrement connection count after request processing
    setTimeout(() => {
      const current = this.connectionTracker.get(ip) || 0;
      if (current > 0) {
        this.connectionTracker.set(ip, current - 1);
      }
    }, 1000); // Assume average request processing time
  }

  private async logSecurityEvent(
    req: NextRequest,
    ip: string,
    attackVectors: AttackVector[],
    mitigation: MitigationAction,
  ): Promise<void> {
    try {
      await this.supabase.from('security_events').insert({
        event_type: 'ddos_protection',
        ip_address: ip,
        user_agent: req.headers.get('user-agent'),
        endpoint: new URL(req.url).pathname,
        details: {
          attack_vectors: attackVectors,
          mitigation_applied: mitigation,
          request_headers: Object.fromEntries(req.headers.entries()),
        },
        severity: this.determineSeverity(attackVectors),
        created_at: new Date().toISOString(),
      });

      logger.warn('DDoS protection triggered', {
        ip,
        attackVectors: attackVectors.map((v) => v.type),
        mitigation: mitigation.type,
        severity: this.determineSeverity(attackVectors),
      });
    } catch (error) {
      logger.error('Failed to log DDoS security event', error as Error);
    }
  }

  private determineSeverity(
    attackVectors: AttackVector[],
  ): 'low' | 'medium' | 'high' {
    if (attackVectors.some((v) => v.severity === 'critical')) return 'high';
    if (attackVectors.some((v) => v.severity === 'high')) return 'high';
    if (attackVectors.some((v) => v.severity === 'medium')) return 'medium';
    return 'low';
  }

  private startCleanupTasks(): void {
    // Cleanup tracking data every 5 minutes
    setInterval(
      () => {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes

        // Clean request tracker - use forEach for downlevelIteration compatibility
        this.requestTracker.forEach((requests, ip) => {
          const recentRequests = requests.filter(
            (timestamp) => now - timestamp < maxAge,
          );
          if (recentRequests.length === 0) {
            this.requestTracker.delete(ip);
          } else {
            this.requestTracker.set(ip, recentRequests);
          }
        });

        // Clean pattern tracker - use forEach for downlevelIteration compatibility
        this.patternTracker.forEach((patterns, ip) => {
          if (patterns.length === 0) {
            this.patternTracker.delete(ip);
          }
        });

        // Clean connection tracker of zero counts - use forEach for downlevelIteration compatibility
        this.connectionTracker.forEach((count, ip) => {
          if (count <= 0) {
            this.connectionTracker.delete(ip);
          }
        });
      },
      5 * 60 * 1000,
    );
  }

  // Emergency methods for manual intervention
  async blockIP(ip: string, duration: number, reason: string): Promise<void> {
    const mitigation: MitigationAction = {
      type: 'block',
      duration,
      reason: `Manual block: ${reason}`,
    };

    this.mitigationCache.set(ip, mitigation);
    setTimeout(() => {
      this.mitigationCache.delete(ip);
    }, duration * 1000);

    logger.warn('IP manually blocked', { ip, duration, reason });
  }

  async unblockIP(ip: string): Promise<void> {
    this.mitigationCache.delete(ip);
    logger.info('IP manually unblocked', { ip });
  }

  getStatus(): {
    activeConnections: number;
    activeMitigations: number;
    trackedIPs: number;
  } {
    return {
      activeConnections: Array.from(this.connectionTracker.values()).reduce(
        (sum, count) => sum + count,
        0,
      ),
      activeMitigations: this.mitigationCache.size,
      trackedIPs: this.requestTracker.size,
    };
  }
}

// Production configuration
export const productionDDoSConfig: DDoSConfig = {
  maxConnectionsPerIP: 100,
  maxConnectionsGlobal: 10000,
  rapidRequestThreshold: 50, // 50 requests per second triggers detection
  burstRequestWindow: 5000, // 5 second window
  maxPayloadSize: 50 * 1024 * 1024, // 50MB
  maxHeaderSize: 32 * 1024, // 32KB
  enablePatternDetection: true,
  suspiciousPatternThreshold: 10,
  enableAutoMitigation: true,
  mitigationDuration: 300, // 5 minutes base duration
};

// Create production DDoS protection instance
export const ddosProtection = new DDoSProtectionSystem(productionDDoSConfig);
