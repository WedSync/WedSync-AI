/**
 * WS-190: Webhook Security Handler for WedSync Incident Response
 *
 * Secure webhook processing system for external security alerts and integrations.
 * Handles inbound security events from third-party systems with proper validation,
 * authentication, and rate limiting for the wedding platform.
 */

import { z } from 'zod';
import { createHmac, timingSafeEqual, randomUUID, randomBytes } from 'crypto';
import type { Incident } from './incident-orchestrator';
import { IncidentSeverity, WeddingIncidentType } from './incident-orchestrator';

// Webhook configuration
const WebhookConfigSchema = z.object({
  secretKey: z.string().min(32), // Minimum 32 characters for security
  maxPayloadSize: z.number().default(1048576), // 1MB max payload
  rateLimitWindowMs: z.number().default(60000), // 1 minute window
  maxRequestsPerWindow: z.number().default(100),
  signatureHeader: z.string().default('X-Signature'),
  timestampHeader: z.string().default('X-Timestamp'),
  timestampToleranceMs: z.number().default(300000), // 5 minutes
  enableIpWhitelist: z.boolean().default(true),
  allowedIps: z.array(z.string()).default([]),
  logAllRequests: z.boolean().default(true),
  encryptStoredPayloads: z.boolean().default(true),
});

type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

// Webhook request structure
interface WebhookRequest {
  id: string;
  timestamp: Date;
  source: string;
  signature: string;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  ipAddress: string;
  userAgent: string;
  contentLength: number;
}

// Processed webhook event
interface ProcessedWebhookEvent {
  id: string;
  source: string;
  eventType: string;
  timestamp: Date;
  verified: boolean;
  processed: boolean;
  incident?: Incident;
  error?: string;
  processingTime: number;
}

// Security alert from external systems
interface ExternalSecurityAlert {
  alertId: string;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  title: string;
  description: string;
  timestamp: string;
  affectedSystems: string[];
  indicators: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  recommendations: string[];
  metadata: Record<string, unknown>;
}

// Rate limiting tracker
interface RateLimitEntry {
  windowStart: number;
  requestCount: number;
  blocked: boolean;
}

// Webhook source configuration
interface WebhookSource {
  name: string;
  secretKey: string;
  enabled: boolean;
  ipWhitelist: string[];
  eventTypes: string[];
  signatureValidation: 'hmac-sha256' | 'hmac-sha1' | 'jwt';
  customHeaders: Record<string, string>;
}

/**
 * Secure webhook handler for external security system integrations
 * Processes security alerts from third-party vendors and security tools
 */
export class WebhookSecurityHandler {
  private config: WebhookConfig;
  private rateLimitTracker: Map<string, RateLimitEntry> = new Map();
  private webhookSources: Map<string, WebhookSource> = new Map();
  private processedEvents: Map<string, ProcessedWebhookEvent> = new Map();

  // Supported webhook sources for wedding platform security
  private readonly defaultSources: WebhookSource[] = [
    {
      name: 'cloudflare',
      secretKey: process.env.CLOUDFLARE_WEBHOOK_SECRET || '',
      enabled: true,
      ipWhitelist: ['173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22'],
      eventTypes: ['security.attack', 'security.anomaly', 'security.blocked'],
      signatureValidation: 'hmac-sha256',
      customHeaders: { 'CF-Webhook-Auth': 'required' },
    },
    {
      name: 'stripe',
      secretKey: process.env.STRIPE_WEBHOOK_SECRET || '',
      enabled: true,
      ipWhitelist: ['54.187.174.169', '54.187.205.235', '54.187.216.72'],
      eventTypes: [
        'invoice.payment_failed',
        'radar.early_fraud_warning.created',
      ],
      signatureValidation: 'hmac-sha256',
      customHeaders: { 'Stripe-Signature': 'required' },
    },
    {
      name: 'supabase',
      secretKey: process.env.SUPABASE_WEBHOOK_SECRET || '',
      enabled: true,
      ipWhitelist: ['3.123.23.123'], // Supabase webhook IPs
      eventTypes: [
        'auth.failed_login',
        'db.connection_limit',
        'storage.quota_exceeded',
      ],
      signatureValidation: 'hmac-sha256',
      customHeaders: { Authorization: 'required' },
    },
    {
      name: 'venue_security',
      secretKey: process.env.VENUE_WEBHOOK_SECRET || '',
      enabled: true,
      ipWhitelist: [], // Venue systems vary
      eventTypes: [
        'venue.security_alert',
        'venue.access_denied',
        'venue.emergency',
      ],
      signatureValidation: 'hmac-sha256',
      customHeaders: { 'X-Venue-Auth': 'required' },
    },
  ];

  constructor() {
    // Load configuration from environment variables
    this.config = WebhookConfigSchema.parse({
      secretKey: process.env.WEBHOOK_SECRET_KEY || this.generateSecretKey(),
      maxPayloadSize: parseInt(
        process.env.WEBHOOK_MAX_PAYLOAD_SIZE || '1048576',
      ),
      rateLimitWindowMs: parseInt(
        process.env.WEBHOOK_RATE_LIMIT_WINDOW || '60000',
      ),
      maxRequestsPerWindow: parseInt(
        process.env.WEBHOOK_MAX_REQUESTS_PER_WINDOW || '100',
      ),
      signatureHeader: process.env.WEBHOOK_SIGNATURE_HEADER || 'X-Signature',
      timestampHeader: process.env.WEBHOOK_TIMESTAMP_HEADER || 'X-Timestamp',
      timestampToleranceMs: parseInt(
        process.env.WEBHOOK_TIMESTAMP_TOLERANCE || '300000',
      ),
      enableIpWhitelist: process.env.WEBHOOK_ENABLE_IP_WHITELIST !== 'false',
      allowedIps: process.env.WEBHOOK_ALLOWED_IPS?.split(',') || [],
      logAllRequests: process.env.WEBHOOK_LOG_ALL_REQUESTS !== 'false',
      encryptStoredPayloads: process.env.WEBHOOK_ENCRYPT_PAYLOADS !== 'false',
    });

    // Initialize webhook sources
    this.initializeWebhookSources();

    // Set up rate limit cleanup
    setInterval(() => this.cleanupRateLimitTracker(), 60000); // Clean up every minute
  }

  /**
   * Process incoming webhook request with security validation
   * Main entry point for all webhook requests
   */
  async processWebhookRequest(
    payload: string,
    headers: Record<string, string>,
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    success: boolean;
    eventId?: string;
    error?: string;
    statusCode: number;
  }> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Create webhook request object
      const webhookRequest: WebhookRequest = {
        id: requestId,
        timestamp: new Date(),
        source: this.identifySource(headers),
        signature: headers[this.config.signatureHeader.toLowerCase()] || '',
        payload: JSON.parse(payload),
        headers,
        ipAddress,
        userAgent,
        contentLength: payload.length,
      };

      // Log incoming request if enabled
      if (this.config.logAllRequests) {
        await this.logWebhookRequest(webhookRequest);
      }

      // Security validation pipeline
      const validationResult =
        await this.validateWebhookRequest(webhookRequest);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          statusCode: validationResult.statusCode,
        };
      }

      // Process the validated webhook
      const processedEvent = await this.processValidatedWebhook(webhookRequest);

      // Store processed event
      this.processedEvents.set(processedEvent.id, processedEvent);

      return {
        success: true,
        eventId: processedEvent.id,
        statusCode: 200,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Log processing error
      await this.logWebhookError(requestId, errorMessage, {
        payload_length: payload.length,
        ip_address: ipAddress,
        processing_time: Date.now() - startTime,
      });

      return {
        success: false,
        error: errorMessage,
        statusCode: 500,
      };
    }
  }

  /**
   * Validate webhook request security
   */
  private async validateWebhookRequest(request: WebhookRequest): Promise<{
    valid: boolean;
    error?: string;
    statusCode: number;
  }> {
    // Check rate limiting
    if (!this.checkRateLimit(request.ipAddress)) {
      return {
        valid: false,
        error: 'Rate limit exceeded',
        statusCode: 429,
      };
    }

    // Check payload size
    if (request.contentLength > this.config.maxPayloadSize) {
      return {
        valid: false,
        error: 'Payload too large',
        statusCode: 413,
      };
    }

    // Check IP whitelist if enabled
    if (this.config.enableIpWhitelist) {
      const source = this.webhookSources.get(request.source);
      if (source && source.ipWhitelist.length > 0) {
        if (!this.isIpAllowed(request.ipAddress, source.ipWhitelist)) {
          return {
            valid: false,
            error: 'IP not whitelisted',
            statusCode: 403,
          };
        }
      } else if (this.config.allowedIps.length > 0) {
        if (!this.isIpAllowed(request.ipAddress, this.config.allowedIps)) {
          return {
            valid: false,
            error: 'IP not whitelisted',
            statusCode: 403,
          };
        }
      }
    }

    // Check timestamp freshness
    const timestampValid = this.validateTimestamp(
      request.headers[this.config.timestampHeader.toLowerCase()],
    );
    if (!timestampValid) {
      return {
        valid: false,
        error: 'Invalid or stale timestamp',
        statusCode: 400,
      };
    }

    // Verify signature
    const signatureValid = await this.verifySignature(request);
    if (!signatureValid) {
      return {
        valid: false,
        error: 'Invalid signature',
        statusCode: 401,
      };
    }

    // Check required headers for source
    const source = this.webhookSources.get(request.source);
    if (source) {
      const headerCheckResult = this.validateRequiredHeaders(
        request.headers,
        source.customHeaders,
      );
      if (!headerCheckResult.valid) {
        return {
          valid: false,
          error: headerCheckResult.error,
          statusCode: 400,
        };
      }
    }

    return { valid: true, statusCode: 200 };
  }

  /**
   * Process validated webhook and convert to security incident if needed
   */
  private async processValidatedWebhook(
    request: WebhookRequest,
  ): Promise<ProcessedWebhookEvent> {
    const startTime = Date.now();

    const processedEvent: ProcessedWebhookEvent = {
      id: request.id,
      source: request.source,
      eventType: this.extractEventType(request.payload),
      timestamp: request.timestamp,
      verified: true,
      processed: false,
      processingTime: 0,
    };

    try {
      // Parse security alert based on source
      const securityAlert = await this.parseSecurityAlert(request);

      if (securityAlert) {
        // Convert to WedSync incident format
        const incident = await this.convertToIncident(
          securityAlert,
          request.source,
        );
        processedEvent.incident = incident;

        // Process the incident through the main orchestrator
        // This would integrate with the IncidentOrchestrator
        await this.forwardToIncidentOrchestrator(incident);
      }

      processedEvent.processed = true;
      processedEvent.processingTime = Date.now() - startTime;

      // Log successful processing
      await this.logWebhookProcessing(processedEvent);

      return processedEvent;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      processedEvent.error = errorMessage;
      processedEvent.processingTime = Date.now() - startTime;

      // Log processing error
      await this.logWebhookError(request.id, errorMessage, {
        source: request.source,
        event_type: processedEvent.eventType,
        processing_time: processedEvent.processingTime,
      });

      return processedEvent;
    }
  }

  /**
   * Parse security alert from different webhook sources
   */
  private async parseSecurityAlert(
    request: WebhookRequest,
  ): Promise<ExternalSecurityAlert | null> {
    const { source, payload } = request;

    switch (source) {
      case 'cloudflare':
        return this.parseCloudflareAlert(payload);
      case 'stripe':
        return this.parseStripeAlert(payload);
      case 'supabase':
        return this.parseSupabaseAlert(payload);
      case 'venue_security':
        return this.parseVenueSecurityAlert(payload);
      default:
        return this.parseGenericAlert(payload);
    }
  }

  /**
   * Parse Cloudflare security alert
   */
  private parseCloudflareAlert(
    payload: Record<string, unknown>,
  ): ExternalSecurityAlert | null {
    // Cloudflare security event structure
    if (
      payload.type === 'security.attack' ||
      payload.type === 'security.anomaly'
    ) {
      return {
        alertId: (payload.id as string) || `cf-${Date.now()}`,
        source: 'cloudflare',
        severity: this.mapCloudflareToSeverity(payload.severity as string),
        type: payload.type as string,
        title: (payload.description as string) || 'Cloudflare Security Alert',
        description:
          (payload.details as string) ||
          'Security event detected by Cloudflare',
        timestamp: (payload.occurred_at as string) || new Date().toISOString(),
        affectedSystems: ['cdn', 'web_application_firewall'],
        indicators: [
          {
            type: 'ip_address',
            value: (payload.source_ip as string) || 'unknown',
            confidence: 90,
          },
        ],
        recommendations: [
          'Review firewall rules',
          'Check for patterns',
          'Consider IP blocking',
        ],
        metadata: {
          ray_id: payload.ray_id,
          country: payload.country,
          user_agent: payload.user_agent,
        },
      };
    }
    return null;
  }

  /**
   * Parse Stripe fraud alert
   */
  private parseStripeAlert(
    payload: Record<string, unknown>,
  ): ExternalSecurityAlert | null {
    const eventType = payload.type as string;

    if (
      eventType === 'radar.early_fraud_warning.created' ||
      eventType === 'invoice.payment_failed'
    ) {
      const data = payload.data as Record<string, unknown>;

      return {
        alertId: (payload.id as string) || `stripe-${Date.now()}`,
        source: 'stripe',
        severity: eventType.includes('fraud') ? 'high' : 'medium',
        type: 'payment_fraud',
        title: `Stripe ${eventType.replace('.', ' ').toUpperCase()}`,
        description: `Payment security event: ${eventType}`,
        timestamp: new Date(
          ((payload.created as number) || Date.now()) * 1000,
        ).toISOString(),
        affectedSystems: ['payment_processing', 'billing_system'],
        indicators: [
          {
            type: 'payment_id',
            value:
              ((data?.object as Record<string, unknown>)?.id as string) ||
              'unknown',
            confidence: 95,
          },
        ],
        recommendations: [
          'Review transaction',
          'Check customer history',
          'Consider payment method verification',
        ],
        metadata: {
          event_type: eventType,
          stripe_account: payload.account,
          livemode: payload.livemode,
        },
      };
    }
    return null;
  }

  /**
   * Parse Supabase security alert
   */
  private parseSupabaseAlert(
    payload: Record<string, unknown>,
  ): ExternalSecurityAlert | null {
    const eventType = payload.event_type as string;

    if (
      eventType === 'auth.failed_login' ||
      eventType === 'db.connection_limit'
    ) {
      return {
        alertId: `supabase-${Date.now()}`,
        source: 'supabase',
        severity: eventType === 'auth.failed_login' ? 'medium' : 'high',
        type: eventType.includes('auth')
          ? 'authentication_failure'
          : 'system_overload',
        title: `Supabase ${eventType.replace('.', ' ').toUpperCase()}`,
        description:
          (payload.description as string) || 'Supabase security event',
        timestamp: (payload.timestamp as string) || new Date().toISOString(),
        affectedSystems: ['database', 'authentication'],
        indicators: [
          {
            type: 'user_id',
            value: (payload.user_id as string) || 'unknown',
            confidence: 100,
          },
        ],
        recommendations: [
          'Check user behavior',
          'Review auth policies',
          'Monitor connection patterns',
        ],
        metadata: {
          project_id: payload.project_id,
          region: payload.region,
          details: payload.details,
        },
      };
    }
    return null;
  }

  /**
   * Parse venue security system alert
   */
  private parseVenueSecurityAlert(
    payload: Record<string, unknown>,
  ): ExternalSecurityAlert | null {
    const alertType = payload.alert_type as string;

    if (
      alertType === 'security_breach' ||
      alertType === 'access_denied' ||
      alertType === 'emergency'
    ) {
      return {
        alertId: (payload.alert_id as string) || `venue-${Date.now()}`,
        source: 'venue_security',
        severity: alertType === 'emergency' ? 'critical' : 'high',
        type: 'venue_security',
        title: `Venue Security: ${alertType.replace('_', ' ').toUpperCase()}`,
        description:
          (payload.description as string) || 'Venue security event detected',
        timestamp: (payload.timestamp as string) || new Date().toISOString(),
        affectedSystems: ['venue_access', 'physical_security'],
        indicators: [
          {
            type: 'venue_id',
            value: (payload.venue_id as string) || 'unknown',
            confidence: 100,
          },
        ],
        recommendations: [
          'Contact venue security',
          'Verify with coordinator',
          'Check guest access',
        ],
        metadata: {
          venue_name: payload.venue_name,
          location: payload.location,
          wedding_id: payload.wedding_id,
          contact: payload.emergency_contact,
        },
      };
    }
    return null;
  }

  /**
   * Parse generic security alert
   */
  private parseGenericAlert(
    payload: Record<string, unknown>,
  ): ExternalSecurityAlert | null {
    if (payload.alert_type || payload.severity) {
      return {
        alertId: (payload.id as string) || `generic-${Date.now()}`,
        source: 'external_system',
        severity:
          (payload.severity as 'low' | 'medium' | 'high' | 'critical') ||
          'medium',
        type: (payload.alert_type as string) || 'generic_security_alert',
        title: (payload.title as string) || 'External Security Alert',
        description:
          (payload.description as string) ||
          'Security alert from external system',
        timestamp: (payload.timestamp as string) || new Date().toISOString(),
        affectedSystems: (payload.affected_systems as string[]) || ['unknown'],
        indicators: [],
        recommendations: (payload.recommendations as string[]) || [
          'Review alert details',
        ],
        metadata: (payload.metadata as Record<string, unknown>) || {},
      };
    }
    return null;
  }

  /**
   * Convert external security alert to WedSync incident
   */
  private async convertToIncident(
    alert: ExternalSecurityAlert,
    source: string,
  ): Promise<Incident> {
    return {
      id: randomUUID(),
      severity: this.mapSeverityToIncident(alert.severity),
      type: this.mapAlertTypeToIncident(alert.type),
      title: alert.title,
      description: `External security alert from ${source}: ${alert.description}`,
      source: `webhook:${source}`,
      timestamp: new Date(alert.timestamp),
      weddingId: this.extractWeddingId(alert),
      supplierId: this.extractSupplierId(alert),
      venueId: this.extractVenueId(alert),
      affectedUsers: [],
      metadata: {
        external_alert_id: alert.alertId,
        external_source: source,
        original_severity: alert.severity,
        indicators: alert.indicators,
        recommendations: alert.recommendations,
        affected_systems: alert.affectedSystems,
        ...alert.metadata,
      },
    };
  }

  /**
   * Forward processed incident to the main orchestrator
   */
  private async forwardToIncidentOrchestrator(
    incident: Incident,
  ): Promise<void> {
    // In a real implementation, this would import and use the IncidentOrchestrator
    console.log('Forwarding incident to orchestrator:', incident.id);

    // For now, just log the incident creation
    await this.logIncidentCreation(incident);
  }

  /**
   * Helper methods for validation and processing
   */
  private checkRateLimit(ipAddress: string): boolean {
    const now = Date.now();
    const entry = this.rateLimitTracker.get(ipAddress);

    if (!entry) {
      this.rateLimitTracker.set(ipAddress, {
        windowStart: now,
        requestCount: 1,
        blocked: false,
      });
      return true;
    }

    if (now - entry.windowStart > this.config.rateLimitWindowMs) {
      // Reset window
      entry.windowStart = now;
      entry.requestCount = 1;
      entry.blocked = false;
      return true;
    }

    entry.requestCount++;

    if (entry.requestCount > this.config.maxRequestsPerWindow) {
      entry.blocked = true;
      return false;
    }

    return !entry.blocked;
  }

  private isIpAllowed(ipAddress: string, allowedIps: string[]): boolean {
    if (allowedIps.length === 0) return true;

    // Simple IP checking - in production, use proper CIDR matching
    return allowedIps.some((allowedIp) => {
      if (allowedIp.includes('/')) {
        // CIDR notation - simplified check
        return ipAddress.startsWith(allowedIp.split('/')[0].slice(0, -1));
      }
      return ipAddress === allowedIp;
    });
  }

  private validateTimestamp(timestamp?: string): boolean {
    if (!timestamp) return true; // Optional timestamp

    try {
      const ts = parseInt(timestamp);
      const now = Date.now();
      const diff = Math.abs(now - ts * 1000);

      return diff <= this.config.timestampToleranceMs;
    } catch {
      return false;
    }
  }

  private async verifySignature(request: WebhookRequest): Promise<boolean> {
    if (!request.signature) return false;

    const source = this.webhookSources.get(request.source);
    const secretKey = source?.secretKey || this.config.secretKey;

    if (!secretKey) return false;

    try {
      const payloadString = JSON.stringify(request.payload);
      const expectedSignature = createHmac('sha256', secretKey)
        .update(payloadString)
        .digest('hex');

      // Remove signature prefix if present (e.g., "sha256=")
      const cleanSignature = request.signature.replace(/^sha256=/, '');

      return timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(cleanSignature, 'hex'),
      );
    } catch {
      return false;
    }
  }

  private validateRequiredHeaders(
    headers: Record<string, string>,
    requiredHeaders: Record<string, string>,
  ): { valid: boolean; error?: string } {
    for (const [headerName, requirement] of Object.entries(requiredHeaders)) {
      const headerValue = headers[headerName.toLowerCase()];

      if (requirement === 'required' && !headerValue) {
        return {
          valid: false,
          error: `Missing required header: ${headerName}`,
        };
      }
    }

    return { valid: true };
  }

  private identifySource(headers: Record<string, string>): string {
    // Identify webhook source based on headers
    if (headers['cf-webhook-auth']) return 'cloudflare';
    if (headers['stripe-signature']) return 'stripe';
    if (headers['x-supabase-signature']) return 'supabase';
    if (headers['x-venue-auth']) return 'venue_security';

    return 'unknown';
  }

  private extractEventType(payload: Record<string, unknown>): string {
    return (payload.type ||
      payload.event_type ||
      payload.alert_type ||
      'webhook_event') as string;
  }

  private mapCloudflareToSeverity(
    cfSeverity: string,
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (cfSeverity?.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  }

  private mapSeverityToIncident(severity: string): IncidentSeverity {
    switch (severity) {
      case 'critical':
        return IncidentSeverity.CRITICAL;
      case 'high':
        return IncidentSeverity.HIGH;
      case 'medium':
        return IncidentSeverity.MEDIUM;
      case 'low':
        return IncidentSeverity.LOW;
      default:
        return IncidentSeverity.INFO;
    }
  }

  private mapAlertTypeToIncident(alertType: string): WeddingIncidentType {
    switch (alertType) {
      case 'security.attack':
      case 'data_breach':
        return WeddingIncidentType.DATA_BREACH;
      case 'payment_fraud':
        return WeddingIncidentType.PAYMENT_FRAUD;
      case 'venue_security':
        return WeddingIncidentType.VENUE_SECURITY;
      case 'supplier_compromise':
        return WeddingIncidentType.SUPPLIER_COMPROMISE;
      case 'system_overload':
      case 'platform_outage':
        return WeddingIncidentType.PLATFORM_OUTAGE;
      case 'compliance_violation':
        return WeddingIncidentType.COMPLIANCE_VIOLATION;
      default:
        return WeddingIncidentType.DATA_BREACH; // Default to data breach for security incidents
    }
  }

  private extractWeddingId(alert: ExternalSecurityAlert): string | undefined {
    return alert.metadata?.wedding_id as string;
  }

  private extractSupplierId(alert: ExternalSecurityAlert): string | undefined {
    return alert.metadata?.supplier_id as string;
  }

  private extractVenueId(alert: ExternalSecurityAlert): string | undefined {
    return alert.metadata?.venue_id as string;
  }

  private generateRequestId(): string {
    return `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSecretKey(): string {
    return randomBytes(32).toString('hex');
  }

  private initializeWebhookSources(): void {
    this.defaultSources.forEach((source) => {
      if (source.secretKey) {
        // Only add if secret key is configured
        this.webhookSources.set(source.name, source);
      }
    });
  }

  private cleanupRateLimitTracker(): void {
    const now = Date.now();
    // Use forEach pattern for downlevelIteration compatibility
    this.rateLimitTracker.forEach((entry, ip) => {
      if (now - entry.windowStart > this.config.rateLimitWindowMs * 2) {
        this.rateLimitTracker.delete(ip);
      }
    });
  }

  /**
   * Logging methods
   */
  private async logWebhookRequest(request: WebhookRequest): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'webhook_request',
      request_id: request.id,
      source: request.source,
      ip_address: request.ipAddress,
      content_length: request.contentLength,
      user_agent: request.userAgent,
    };

    console.log('Webhook request log:', JSON.stringify(logEntry));
  }

  private async logWebhookProcessing(
    event: ProcessedWebhookEvent,
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'webhook_processed',
      event_id: event.id,
      source: event.source,
      event_type: event.eventType,
      verified: event.verified,
      processed: event.processed,
      processing_time: event.processingTime,
      has_incident: !!event.incident,
    };

    console.log('Webhook processing log:', JSON.stringify(logEntry));
  }

  private async logWebhookError(
    requestId: string,
    error: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'webhook_error',
      request_id: requestId,
      error,
      metadata,
    };

    console.log('Webhook error log:', JSON.stringify(logEntry));
  }

  private async logIncidentCreation(incident: Incident): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'incident_created',
      incident_id: incident.id,
      severity: incident.severity,
      incident_type: incident.type,
      source: incident.source,
      title: incident.title,
    };

    console.log('Incident creation log:', JSON.stringify(logEntry));
  }

  /**
   * Public API methods
   */

  /**
   * Get webhook processing statistics
   */
  getStatistics(): {
    totalProcessed: number;
    successfullyProcessed: number;
    errors: number;
    incidentsCreated: number;
    averageProcessingTime: number;
  } {
    const events = Array.from(this.processedEvents.values());

    return {
      totalProcessed: events.length,
      successfullyProcessed: events.filter((e) => e.processed && !e.error)
        .length,
      errors: events.filter((e) => !!e.error).length,
      incidentsCreated: events.filter((e) => !!e.incident).length,
      averageProcessingTime:
        events.reduce((sum, e) => sum + e.processingTime, 0) / events.length ||
        0,
    };
  }

  /**
   * Get processed event by ID
   */
  getProcessedEvent(eventId: string): ProcessedWebhookEvent | undefined {
    return this.processedEvents.get(eventId);
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<WebhookConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Add or update webhook source configuration
   */
  addWebhookSource(source: WebhookSource): void {
    this.webhookSources.set(source.name, source);
  }

  /**
   * Remove webhook source
   */
  removeWebhookSource(sourceName: string): boolean {
    return this.webhookSources.delete(sourceName);
  }

  /**
   * Get current configuration (sanitized)
   */
  getConfig(): Omit<WebhookConfig, 'secretKey'> {
    const { secretKey, ...sanitizedConfig } = this.config;
    return sanitizedConfig;
  }

  /**
   * Get configured webhook sources (sanitized)
   */
  getWebhookSources(): Array<Omit<WebhookSource, 'secretKey'>> {
    return Array.from(this.webhookSources.values()).map(
      ({ secretKey, ...source }) => source,
    );
  }
}
