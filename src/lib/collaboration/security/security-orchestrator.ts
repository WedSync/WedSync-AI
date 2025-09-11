// WS-342: Real-Time Wedding Collaboration - Security Orchestrator
// Team B Backend Development - Batch 1 Round 1

import { EventEmitter } from 'events';
import { WebSocketSecurityManager } from './websocket-security-manager';
import { EncryptionManager } from './encryption-manager';
import { CSRFProtectionManager } from './csrf-protection-manager';
import { SessionManager } from './session-manager';

interface SecurityConfig {
  enableEncryption: boolean;
  enableCSRFProtection: boolean;
  enableSessionManagement: boolean;
  enableWebSocketSecurity: boolean;
  logSecurityEvents: boolean;
  alertThresholds: {
    suspiciousActivity: number;
    failedAttempts: number;
    riskScore: number;
  };
}

interface SecurityMetrics {
  totalSecurityEvents: number;
  blockedConnections: number;
  encryptedMessages: number;
  validatedTokens: number;
  activeSessions: number;
  securityAlerts: number;
  avgResponseTime: number;
  lastUpdated: Date;
}

interface SecurityEvent {
  id: string;
  type:
    | 'authentication'
    | 'encryption'
    | 'csrf'
    | 'session'
    | 'websocket'
    | 'violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  weddingId?: string;
  details: any;
  timestamp: number;
  resolved: boolean;
}

interface SecurityHealthCheck {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    websocket: { status: string; details: any };
    encryption: { status: string; details: any };
    csrf: { status: string; details: any };
    sessions: { status: string; details: any };
  };
  recommendations: string[];
}

export class SecurityOrchestrator extends EventEmitter {
  private config: SecurityConfig;
  private webSocketSecurity: WebSocketSecurityManager | null = null;
  private encryption: EncryptionManager | null = null;
  private csrfProtection: CSRFProtectionManager | null = null;
  private sessionManager: SessionManager | null = null;

  private metrics: SecurityMetrics;
  private securityEvents: Map<string, SecurityEvent> = new Map();
  private eventQueue: SecurityEvent[] = [];
  private processingTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<SecurityConfig> = {}) {
    super();

    this.config = {
      enableEncryption: true,
      enableCSRFProtection: true,
      enableSessionManagement: true,
      enableWebSocketSecurity: true,
      logSecurityEvents: true,
      alertThresholds: {
        suspiciousActivity: 10,
        failedAttempts: 50,
        riskScore: 7,
      },
      ...config,
    };

    this.metrics = {
      totalSecurityEvents: 0,
      blockedConnections: 0,
      encryptedMessages: 0,
      validatedTokens: 0,
      activeSessions: 0,
      securityAlerts: 0,
      avgResponseTime: 0,
      lastUpdated: new Date(),
    };

    this.initializeComponents();
    this.startEventProcessing();
  }

  // Wedding collaboration security workflow
  async authenticateCollaborationAccess(
    userId: string,
    weddingId: string,
    request: any,
  ): Promise<{
    authenticated: boolean;
    session?: any;
    csrfToken?: string;
    error?: string;
    riskScore: number;
  }> {
    const startTime = Date.now();
    let riskScore = 0;

    try {
      // 1. Session validation
      if (!this.sessionManager) {
        throw new Error('Session manager not initialized');
      }

      const sessionResult =
        await this.sessionManager.createCollaborationSession(
          userId,
          weddingId,
          request,
        );

      if (!sessionResult) {
        riskScore = 8;
        this.recordSecurityEvent({
          type: 'session',
          severity: 'high',
          userId,
          weddingId,
          details: { error: 'Failed to create session' },
        });

        return {
          authenticated: false,
          error: 'Session creation failed',
          riskScore,
        };
      }

      // 2. CSRF token generation
      let csrfToken: string | undefined;
      if (this.csrfProtection) {
        const csrfResult = await this.csrfProtection.generateCollaborationToken(
          userId,
          weddingId,
          request,
        );
        csrfToken = csrfResult.token;
      }

      // 3. Record successful authentication
      this.recordSecurityEvent({
        type: 'authentication',
        severity: 'low',
        userId,
        weddingId,
        details: {
          sessionId: sessionResult.session.id,
          role: sessionResult.session.metadata.role,
          deviceType: sessionResult.session.metadata.deviceType,
        },
      });

      this.metrics.activeSessions++;
      this.updateResponseTime(Date.now() - startTime);

      return {
        authenticated: true,
        session: sessionResult.session,
        csrfToken,
        riskScore,
      };
    } catch (error) {
      console.error('Authentication error:', error);

      this.recordSecurityEvent({
        type: 'authentication',
        severity: 'critical',
        userId,
        weddingId,
        details: { error: error.message },
      });

      return {
        authenticated: false,
        error: error.message,
        riskScore: 9,
      };
    }
  }

  // Secure WebSocket connection establishment
  async establishSecureWebSocket(
    socket: WebSocket,
    request: any,
    sessionToken: string,
  ): Promise<{
    success: boolean;
    connectionId?: string;
    error?: string;
    riskScore: number;
  }> {
    if (!this.webSocketSecurity) {
      return {
        success: false,
        error: 'WebSocket security not initialized',
        riskScore: 10,
      };
    }

    try {
      // Authenticate WebSocket connection
      const authResult = await this.webSocketSecurity.authenticateConnection(
        socket,
        request,
        sessionToken,
      );

      if (!authResult.success) {
        this.metrics.blockedConnections++;

        this.recordSecurityEvent({
          type: 'websocket',
          severity: 'medium',
          details: {
            error: authResult.error,
            closeCode: authResult.closeCode,
          },
        });

        return {
          success: false,
          error: authResult.error,
          riskScore: 7,
        };
      }

      // Generate connection ID and track
      const connectionId = await this.webSocketSecurity.registerConnection(
        authResult.context!.userId,
        authResult.context!.weddingId,
        socket,
      );

      this.recordSecurityEvent({
        type: 'websocket',
        severity: 'low',
        userId: authResult.context!.userId,
        weddingId: authResult.context!.weddingId,
        details: { connectionId },
      });

      return {
        success: true,
        connectionId,
        riskScore: 0,
      };
    } catch (error) {
      console.error('WebSocket security error:', error);
      return {
        success: false,
        error: error.message,
        riskScore: 8,
      };
    }
  }

  // Secure data transmission
  async secureDataTransmission(
    data: any,
    weddingId: string,
    userId: string,
    encryptionRequired: boolean = true,
  ): Promise<{
    success: boolean;
    securedData?: any;
    error?: string;
  }> {
    try {
      if (encryptionRequired && this.encryption) {
        const encryptedData = await this.encryption.encryptCollaborationData(
          data,
          weddingId,
          userId,
        );

        this.metrics.encryptedMessages++;

        this.recordSecurityEvent({
          type: 'encryption',
          severity: 'low',
          userId,
          weddingId,
          details: { dataSize: JSON.stringify(data).length },
        });

        return {
          success: true,
          securedData: encryptedData,
        };
      }

      return {
        success: true,
        securedData: data,
      };
    } catch (error) {
      console.error('Data encryption error:', error);

      this.recordSecurityEvent({
        type: 'encryption',
        severity: 'high',
        userId,
        weddingId,
        details: { error: error.message },
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Validate request security
  async validateRequestSecurity(
    request: any,
    userId: string,
    weddingId: string,
    requireCSRF: boolean = true,
  ): Promise<{
    valid: boolean;
    session?: any;
    riskScore: number;
    error?: string;
  }> {
    let totalRiskScore = 0;
    let session: any;

    try {
      // 1. Session validation
      if (this.sessionManager) {
        const sessionToken = this.extractSessionToken(request);
        if (!sessionToken) {
          return {
            valid: false,
            riskScore: 9,
            error: 'No session token provided',
          };
        }

        const sessionResult = await this.sessionManager.validateSession(
          sessionToken,
          request,
        );
        if (!sessionResult.valid) {
          return {
            valid: false,
            riskScore: sessionResult.riskScore || 8,
            error: sessionResult.error,
          };
        }

        session = sessionResult.session;
        totalRiskScore += sessionResult.riskScore || 0;
      }

      // 2. CSRF validation
      if (requireCSRF && this.csrfProtection) {
        const csrfToken = this.extractCSRFToken(request);
        if (!csrfToken) {
          totalRiskScore += 5;
        } else {
          const csrfResult =
            await this.csrfProtection.validateCollaborationToken(
              csrfToken,
              userId,
              weddingId,
              request,
            );

          if (!csrfResult.valid) {
            return {
              valid: false,
              riskScore: csrfResult.riskScore || 7,
              error: 'Invalid CSRF token',
            };
          }

          totalRiskScore += csrfResult.riskScore || 0;
          this.metrics.validatedTokens++;
        }
      }

      // 3. Additional security checks
      if (this.webSocketSecurity) {
        const riskAssessment =
          await this.webSocketSecurity.assessConnectionRisk(
            this.extractIP(request) || 'unknown',
            request.headers?.['user-agent'] || 'unknown',
          );
        totalRiskScore += riskAssessment.riskScore;
      }

      // Risk evaluation
      if (totalRiskScore > this.config.alertThresholds.riskScore) {
        this.recordSecurityEvent({
          type: 'violation',
          severity: 'high',
          userId,
          weddingId,
          details: {
            riskScore: totalRiskScore,
            checks: {
              session: !!session,
              csrf: requireCSRF,
              ip: this.extractIP(request),
            },
          },
        });

        if (totalRiskScore > 9) {
          return {
            valid: false,
            riskScore: totalRiskScore,
            error: 'Security risk too high',
          };
        }
      }

      return {
        valid: true,
        session,
        riskScore: totalRiskScore,
      };
    } catch (error) {
      console.error('Security validation error:', error);
      return {
        valid: false,
        riskScore: 10,
        error: error.message,
      };
    }
  }

  // Component initialization
  private initializeComponents(): void {
    if (this.config.enableWebSocketSecurity) {
      this.webSocketSecurity = new WebSocketSecurityManager();
      this.webSocketSecurity.on('connection_blocked', (data) => {
        this.recordSecurityEvent({
          type: 'websocket',
          severity: 'medium',
          details: data,
        });
      });
    }

    if (this.config.enableEncryption) {
      this.encryption = new EncryptionManager();
      this.encryption.on('key_rotated', (data) => {
        this.recordSecurityEvent({
          type: 'encryption',
          severity: 'low',
          details: data,
        });
      });
    }

    if (this.config.enableCSRFProtection) {
      this.csrfProtection = new CSRFProtectionManager();
      this.csrfProtection.on('suspicious_csrf_activity', (data) => {
        this.recordSecurityEvent({
          type: 'csrf',
          severity: 'high',
          details: data,
        });
      });
    }

    if (this.config.enableSessionManagement) {
      this.sessionManager = new SessionManager();
      this.sessionManager.on('suspicious_session_activity', (data) => {
        this.recordSecurityEvent({
          type: 'session',
          severity: 'high',
          details: data,
        });
      });
    }
  }

  // Security event management
  private recordSecurityEvent(eventData: {
    type: SecurityEvent['type'];
    severity: SecurityEvent['severity'];
    userId?: string;
    weddingId?: string;
    details: any;
  }): void {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      type: eventData.type,
      severity: eventData.severity,
      userId: eventData.userId,
      weddingId: eventData.weddingId,
      details: eventData.details,
      timestamp: Date.now(),
      resolved: false,
    };

    this.securityEvents.set(event.id, event);
    this.eventQueue.push(event);
    this.metrics.totalSecurityEvents++;

    if (event.severity === 'high' || event.severity === 'critical') {
      this.metrics.securityAlerts++;
      this.emit('security_alert', event);
    }

    if (this.config.logSecurityEvents) {
      console.log(`Security Event [${event.severity.toUpperCase()}]:`, {
        type: event.type,
        details: event.details,
        userId: event.userId,
        weddingId: event.weddingId,
      });
    }
  }

  private startEventProcessing(): void {
    this.processingTimer = setInterval(() => {
      this.processSecurityEvents();
    }, 5000); // Process every 5 seconds
  }

  private processSecurityEvents(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.emit('security_event_processed', event);
      }
    }

    // Clean up old events (keep last 1000)
    if (this.securityEvents.size > 1000) {
      const sortedEvents = Array.from(this.securityEvents.values()).sort(
        (a, b) => b.timestamp - a.timestamp,
      );

      for (let i = 1000; i < sortedEvents.length; i++) {
        this.securityEvents.delete(sortedEvents[i].id);
      }
    }
  }

  // Health check for all security components
  async performHealthCheck(): Promise<SecurityHealthCheck> {
    const results: SecurityHealthCheck = {
      overall: 'healthy',
      components: {
        websocket: { status: 'disabled', details: null },
        encryption: { status: 'disabled', details: null },
        csrf: { status: 'disabled', details: null },
        sessions: { status: 'disabled', details: null },
      },
      recommendations: [],
    };

    let unhealthyCount = 0;
    let degradedCount = 0;

    // Check each component
    if (this.webSocketSecurity) {
      const health = await this.webSocketSecurity.healthCheck();
      results.components.websocket = health;
      if (health.status === 'unhealthy') unhealthyCount++;
      else if (health.status === 'degraded') degradedCount++;
    }

    if (this.encryption) {
      const health = await this.encryption.healthCheck();
      results.components.encryption = health;
      if (health.status === 'unhealthy') unhealthyCount++;
      else if (health.status === 'degraded') degradedCount++;
    }

    if (this.csrfProtection) {
      const health = await this.csrfProtection.healthCheck();
      results.components.csrf = health;
      if (health.status === 'unhealthy') unhealthyCount++;
      else if (health.status === 'degraded') degradedCount++;
    }

    if (this.sessionManager) {
      const health = await this.sessionManager.healthCheck();
      results.components.sessions = health;
      if (health.status === 'unhealthy') unhealthyCount++;
      else if (health.status === 'degraded') degradedCount++;
    }

    // Determine overall health
    if (unhealthyCount > 0) {
      results.overall = 'unhealthy';
      results.recommendations.push(
        'Address unhealthy security components immediately',
      );
    } else if (degradedCount > 1) {
      results.overall = 'degraded';
      results.recommendations.push('Monitor degraded security components');
    }

    // Add general recommendations
    if (
      this.metrics.securityAlerts >
      this.config.alertThresholds.suspiciousActivity
    ) {
      results.recommendations.push(
        'High number of security alerts - review logs',
      );
    }

    if (
      this.metrics.blockedConnections >
      this.config.alertThresholds.failedAttempts
    ) {
      results.recommendations.push(
        'Many blocked connections - possible attack',
      );
    }

    return results;
  }

  // Utility methods
  private extractSessionToken(request: any): string | null {
    return (
      request?.cookies?.['wedsync-session'] ||
      request?.headers?.['authorization']?.replace('Bearer ', '') ||
      null
    );
  }

  private extractCSRFToken(request: any): string | null {
    return (
      request?.headers?.['x-csrf-token'] || request?.body?.csrfToken || null
    );
  }

  private extractIP(request: any): string | undefined {
    return (
      request?.headers?.['x-forwarded-for'] ||
      request?.headers?.['x-real-ip'] ||
      request?.connection?.remoteAddress
    );
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateResponseTime(duration: number): void {
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime + duration) / 2;
    this.metrics.lastUpdated = new Date();
  }

  // Public API
  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  getRecentEvents(limit: number = 50): SecurityEvent[] {
    return Array.from(this.securityEvents.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down security orchestrator...');

    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }

    // Shutdown all components
    if (this.webSocketSecurity) {
      await this.webSocketSecurity.shutdown();
    }
    if (this.encryption) {
      await this.encryption.shutdown();
    }
    if (this.csrfProtection) {
      await this.csrfProtection.shutdown();
    }
    if (this.sessionManager) {
      await this.sessionManager.shutdown();
    }

    console.log('Security orchestrator shutdown complete');
  }
}
