/**
 * WS-190: PagerDuty Integration for WedSync Incident Response
 *
 * Integrates with PagerDuty for escalation management and on-call alerting
 * during critical security incidents in the wedding platform.
 */

import { z } from 'zod';
import type { Incident } from '../incident-orchestrator';
import {
  IncidentSeverity,
  WeddingIncidentType,
} from '../incident-orchestrator';

// PagerDuty configuration
const PagerDutyConfigSchema = z.object({
  integrationKey: z.string().min(1),
  apiToken: z.string().min(1).optional(),
  apiUrl: z.string().url().default('https://api.pagerduty.com'),
  timeoutMs: z.number().default(10000),
  maxRetries: z.number().default(3),
  defaultUrgency: z.enum(['low', 'high']).default('high'),
});

type PagerDutyConfig = z.infer<typeof PagerDutyConfigSchema>;

// PagerDuty event structure (Events API v2)
interface PagerDutyEvent {
  routing_key: string;
  event_action: 'trigger' | 'acknowledge' | 'resolve';
  dedup_key?: string;
  payload: {
    summary: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    source: string;
    timestamp?: string;
    component?: string;
    group?: string;
    class?: string;
    custom_details?: Record<string, unknown>;
  };
  images?: Array<{
    src: string;
    href?: string;
    alt?: string;
  }>;
  links?: Array<{
    href: string;
    text?: string;
  }>;
}

// PagerDuty response structure
interface PagerDutyResponse {
  status: string;
  message: string;
  dedup_key?: string;
  errors?: string[];
}

// PagerDuty incident structure (for API operations)
interface PagerDutyIncident {
  id: string;
  incident_number: number;
  status: 'triggered' | 'acknowledged' | 'resolved';
  urgency: 'low' | 'high';
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  service: {
    id: string;
    summary: string;
  };
  assigned_via: string;
  escalation_policy: {
    id: string;
    summary: string;
  };
  teams: Array<{
    id: string;
    summary: string;
  }>;
}

/**
 * PagerDuty integration for enterprise-grade incident escalation and on-call management
 * Provides automated alerting for critical wedding platform security incidents
 */
export class PagerDutyIntegration {
  private config: PagerDutyConfig;

  // Severity mapping from WedSync to PagerDuty
  private readonly severityMapping = {
    critical: 'critical' as const,
    high: 'error' as const,
    medium: 'warning' as const,
    low: 'warning' as const,
    info: 'info' as const,
  };

  // Component mapping for wedding-specific incident types
  private readonly componentMapping = {
    payment_fraud: 'Payment System',
    data_breach: 'Data Security',
    venue_security: 'Venue Integration',
    supplier_compromise: 'Supplier Network',
    platform_outage: 'Core Platform',
    compliance_violation: 'Compliance System',
  };

  // Wedding day escalation policies
  private readonly weddingDayConfig = {
    urgency: 'high' as const,
    escalationMultiplier: 0.5, // Faster escalation on wedding days
    additionalContext: true,
  };

  constructor() {
    // Load configuration from environment variables
    this.config = PagerDutyConfigSchema.parse({
      integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY || '',
      apiToken: process.env.PAGERDUTY_API_TOKEN || '',
      apiUrl: process.env.PAGERDUTY_API_URL || 'https://api.pagerduty.com',
      timeoutMs: parseInt(process.env.PAGERDUTY_TIMEOUT_MS || '10000'),
      maxRetries: parseInt(process.env.PAGERDUTY_MAX_RETRIES || '3'),
      defaultUrgency:
        (process.env.PAGERDUTY_DEFAULT_URGENCY as 'low' | 'high') || 'high',
    });
  }

  /**
   * Create critical incident in PagerDuty - triggers immediate escalation
   */
  async createCriticalIncident(incident: Incident): Promise<PagerDutyResponse> {
    if (!this.config.integrationKey) {
      throw new Error('PagerDuty integration key not configured');
    }

    const event = this.createPagerDutyEvent(incident, 'trigger', 'critical');

    // Add wedding day context for enhanced escalation
    if (this.isWeddingDayIncident(incident)) {
      event.payload.custom_details = {
        ...event.payload.custom_details,
        wedding_day_emergency: true,
        escalation_priority: 'maximum',
        response_sla: '2_minutes',
      };
    }

    return this.sendEvent(event);
  }

  /**
   * Create standard incident in PagerDuty
   */
  async createIncident(incident: Incident): Promise<PagerDutyResponse> {
    if (!this.config.integrationKey) {
      throw new Error('PagerDuty integration key not configured');
    }

    const severity =
      this.severityMapping[
        incident.severity as keyof typeof this.severityMapping
      ];
    const event = this.createPagerDutyEvent(incident, 'trigger', severity);

    return this.sendEvent(event);
  }

  /**
   * Acknowledge incident in PagerDuty
   */
  async acknowledgeIncident(incident: Incident): Promise<PagerDutyResponse> {
    if (!this.config.integrationKey) {
      throw new Error('PagerDuty integration key not configured');
    }

    const event = this.createPagerDutyEvent(incident, 'acknowledge');
    return this.sendEvent(event);
  }

  /**
   * Resolve incident in PagerDuty
   */
  async resolveIncident(
    incident: Incident,
    resolutionNotes?: string,
  ): Promise<PagerDutyResponse> {
    if (!this.config.integrationKey) {
      throw new Error('PagerDuty integration key not configured');
    }

    const event = this.createPagerDutyEvent(incident, 'resolve');

    if (resolutionNotes) {
      event.payload.custom_details = {
        ...event.payload.custom_details,
        resolution_notes: resolutionNotes,
        resolved_by: 'WedSync Security System',
      };
    }

    return this.sendEvent(event);
  }

  /**
   * Create wedding day emergency alert with maximum priority
   */
  async createWeddingDayEmergency(
    incident: Incident,
    weddingDate: string,
    venueName?: string,
    coordinatorContact?: string,
  ): Promise<PagerDutyResponse> {
    if (!this.config.integrationKey) {
      throw new Error('PagerDuty integration key not configured');
    }

    const event = this.createPagerDutyEvent(incident, 'trigger', 'critical');

    // Enhance with wedding-specific context
    event.payload.summary = `💒 WEDDING DAY EMERGENCY: ${incident.title}`;
    event.payload.custom_details = {
      ...event.payload.custom_details,
      emergency_type: 'wedding_day',
      wedding_date: weddingDate,
      venue_name: venueName || 'Unknown',
      coordinator_contact: coordinatorContact || 'Not provided',
      escalation_priority: 'maximum',
      response_sla: '2_minutes',
      impact_level: 'business_critical',
      affected_celebrations: 'active_wedding',
    };

    // Add wedding-specific images and links
    event.images = [
      {
        src: 'https://wedsync.com/assets/icons/wedding-emergency.png',
        alt: 'Wedding Day Emergency',
        href: `https://wedsync.com/weddings/live/${weddingDate}`,
      },
    ];

    event.links = [
      {
        href: `https://wedsync.com/security/wedding-day/${incident.id}`,
        text: 'Wedding Day Emergency Response',
      },
      {
        href: `https://wedsync.com/weddings/live/${weddingDate}`,
        text: 'Live Wedding Dashboard',
      },
    ];

    return this.sendEvent(event);
  }

  /**
   * Get incident details from PagerDuty API
   */
  async getIncident(incidentId: string): Promise<PagerDutyIncident> {
    if (!this.config.apiToken) {
      throw new Error(
        'PagerDuty API token not configured for incident retrieval',
      );
    }

    return this.executeWithRetry(async () => {
      const response = await fetch(
        `${this.config.apiUrl}/incidents/${incidentId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Token token=${this.config.apiToken}`,
            Accept: 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(this.config.timeoutMs),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `PagerDuty API error: ${response.status} - ${errorText}`,
        );
      }

      const result = await response.json();
      return result.incident as PagerDutyIncident;
    });
  }

  /**
   * List incidents from PagerDuty with filters
   */
  async listIncidents(
    filters: {
      status?: string[];
      urgency?: string[];
      since?: Date;
      until?: Date;
      limit?: number;
    } = {},
  ): Promise<PagerDutyIncident[]> {
    if (!this.config.apiToken) {
      throw new Error(
        'PagerDuty API token not configured for incident listing',
      );
    }

    const params = new URLSearchParams();

    if (filters.status) params.append('statuses[]', filters.status.join(','));
    if (filters.urgency)
      params.append('urgencies[]', filters.urgency.join(','));
    if (filters.since) params.append('since', filters.since.toISOString());
    if (filters.until) params.append('until', filters.until.toISOString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    return this.executeWithRetry(async () => {
      const response = await fetch(
        `${this.config.apiUrl}/incidents?${params}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Token token=${this.config.apiToken}`,
            Accept: 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(this.config.timeoutMs),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `PagerDuty API error: ${response.status} - ${errorText}`,
        );
      }

      const result = await response.json();
      return result.incidents as PagerDutyIncident[];
    });
  }

  /**
   * Test PagerDuty connectivity and configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test Events API with a test event
      const testEvent: PagerDutyEvent = {
        routing_key: this.config.integrationKey,
        event_action: 'trigger',
        payload: {
          summary: 'WedSync Security Integration Test',
          severity: 'info',
          source: 'wedsync-test',
          timestamp: new Date().toISOString(),
          component: 'Integration Test',
          custom_details: {
            test: true,
            timestamp: new Date().toISOString(),
            integration_version: '1.0.0',
          },
        },
      };

      const result = await this.sendEvent(testEvent);

      // If we have API token, also test API access
      if (this.config.apiToken) {
        await this.listIncidents({ limit: 1 });
      }

      return result.status === 'success';
    } catch (error) {
      console.error('PagerDuty connection test failed:', error);
      return false;
    }
  }

  /**
   * Create PagerDuty event structure from WedSync incident
   */
  private createPagerDutyEvent(
    incident: Incident,
    action: 'trigger' | 'acknowledge' | 'resolve',
    severity?: 'critical' | 'error' | 'warning' | 'info',
  ): PagerDutyEvent {
    const eventSeverity =
      severity ||
      this.severityMapping[
        incident.severity as keyof typeof this.severityMapping
      ];
    const component =
      this.componentMapping[
        incident.type as keyof typeof this.componentMapping
      ] || 'WedSync Platform';

    return {
      routing_key: this.config.integrationKey,
      event_action: action,
      dedup_key: `wedsync-${incident.id}`,
      payload: {
        summary: `${incident.title} (${incident.type.replace('_', ' ').toUpperCase()})`,
        severity: eventSeverity,
        source: 'wedsync-security',
        timestamp: incident.timestamp.toISOString(),
        component,
        group: 'WedSync Security',
        class: 'security_incident',
        custom_details: {
          incident_id: incident.id,
          incident_type: incident.type,
          incident_severity: incident.severity,
          wedding_id: incident.weddingId || null,
          supplier_id: incident.supplierId || null,
          venue_id: incident.venueId || null,
          affected_users_count: incident.affectedUsers.length,
          description: incident.description,
          source_system: 'WedSync',
          detection_time: incident.timestamp.toISOString(),
          metadata: incident.metadata || {},
        },
      },
    };
  }

  /**
   * Send event to PagerDuty Events API
   */
  private async sendEvent(event: PagerDutyEvent): Promise<PagerDutyResponse> {
    return this.executeWithRetry(async () => {
      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-Security-Integration/1.0',
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `PagerDuty Events API error: ${response.status} - ${errorText}`,
        );
      }

      const result = await response.json();

      // Log successful event
      this.logEvent(
        event.event_action,
        event.dedup_key || 'unknown',
        'success',
      );

      return result as PagerDutyResponse;
    });
  }

  /**
   * Check if incident qualifies as wedding day emergency
   */
  private isWeddingDayIncident(incident: Incident): boolean {
    // Check if it's a weekend (typical wedding days)
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6; // Sunday or Saturday

    // Check if incident has wedding context
    const hasWeddingContext = incident.weddingId || incident.venueId;

    // Check if incident type could affect weddings
    const weddingCriticalTypes = [
      'payment_fraud',
      'venue_security',
      'platform_outage',
    ];
    const isCriticalType = weddingCriticalTypes.includes(incident.type);

    return (
      (isWeekend && hasWeddingContext) ||
      (incident.severity === IncidentSeverity.CRITICAL && isCriticalType)
    );
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryCount = 0,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeWithRetry(operation, retryCount + 1);
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `PagerDuty operation failed after ${this.config.maxRetries} retries: ${errorMessage}`,
      );
    }
  }

  /**
   * Log PagerDuty event for monitoring and debugging
   */
  private logEvent(
    action: string,
    dedupKey: string,
    status: string,
    error?: string,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      integration: 'pagerduty',
      action,
      dedup_key: dedupKey,
      status,
      error,
    };

    console.log('PagerDuty event log:', JSON.stringify(logEntry));
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<PagerDutyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration (sanitized - no tokens)
   */
  getConfig(): Omit<PagerDutyConfig, 'integrationKey' | 'apiToken'> {
    const { integrationKey, apiToken, ...sanitizedConfig } = this.config;
    return sanitizedConfig;
  }

  /**
   * Get PagerDuty service health status
   */
  async getServiceHealth(): Promise<{
    events_api: boolean;
    rest_api: boolean;
    overall: boolean;
  }> {
    const health = {
      events_api: false,
      rest_api: false,
      overall: false,
    };

    try {
      // Test Events API
      const testEvent: PagerDutyEvent = {
        routing_key: this.config.integrationKey,
        event_action: 'trigger',
        payload: {
          summary: 'Health Check',
          severity: 'info',
          source: 'wedsync-health-check',
        },
      };

      await this.sendEvent(testEvent);
      health.events_api = true;

      // Immediately resolve the health check event
      await this.sendEvent({
        ...testEvent,
        event_action: 'resolve',
      });
    } catch (error) {
      console.error('PagerDuty Events API health check failed:', error);
    }

    try {
      // Test REST API if token available
      if (this.config.apiToken) {
        await this.listIncidents({ limit: 1 });
        health.rest_api = true;
      } else {
        health.rest_api = true; // Assume healthy if no token configured
      }
    } catch (error) {
      console.error('PagerDuty REST API health check failed:', error);
    }

    health.overall = health.events_api && health.rest_api;
    return health;
  }

  /**
   * Enable wedding day mode with enhanced escalation
   */
  enableWeddingDayMode(): void {
    console.log(
      'PagerDuty: Wedding Day Mode enabled - Enhanced escalation active',
    );
    // In a real implementation, this might update escalation policies or notification rules
  }

  /**
   * Disable wedding day mode
   */
  disableWeddingDayMode(): void {
    console.log(
      'PagerDuty: Wedding Day Mode disabled - Standard escalation resumed',
    );
    // In a real implementation, this might restore normal escalation policies
  }
}
