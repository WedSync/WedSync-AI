/**
 * WS-190: IBM QRadar SIEM Integration for WedSync Incident Response
 *
 * Integrates with IBM QRadar Security Intelligence Platform for advanced
 * threat detection and security analytics for wedding platform events.
 */

import { z } from 'zod';
import type { Incident } from '../incident-orchestrator';

// QRadar API configuration
const QRadarConfigSchema = z.object({
  apiUrl: z.string().url(),
  apiToken: z.string().min(1),
  apiVersion: z.string().default('14.0'),
  verifySSL: z.boolean().default(true),
  timeoutMs: z.number().default(15000),
  maxRetries: z.number().default(3),
});

type QRadarConfig = z.infer<typeof QRadarConfigSchema>;

// QRadar event structure for Custom Properties
interface QRadarEvent {
  sourceip: string;
  destinationip: string;
  starttime: number;
  eventtime: number;
  qid: number;
  magnitude: number;
  severity: number;
  credibility: number;
  relevance: number;
  category: number;
  devicetime: number;
  eventcount: number;
  sourceport?: number;
  destinationport?: number;
  protocolid?: number;
  // Custom properties for WedSync
  custom_properties: {
    WedSync_Incident_ID: string;
    WedSync_Wedding_ID?: string;
    WedSync_Supplier_ID?: string;
    WedSync_Venue_ID?: string;
    WedSync_Incident_Type: string;
    WedSync_Platform: string;
    WedSync_Severity: string;
    WedSync_Title: string;
    WedSync_Description: string;
    WedSync_Affected_Users: string;
  };
}

// QRadar offense (incident) structure
interface QRadarOffense {
  id: number;
  description: string;
  status: 'OPEN' | 'HIDDEN' | 'CLOSED';
  offense_type: number;
  severity: number;
  magnitude: number;
  credibility: number;
  relevance: number;
  assigned_to?: string;
  categories: string[];
  source_network: string;
  destination_networks: string[];
  start_time: number;
  last_updated_time: number;
  event_count: number;
  flow_count: number;
  rules: Array<{ id: number; type: string; name: string }>;
}

// QRadar API response wrapper
interface QRadarResponse<T = unknown> {
  data?: T;
  error?: string;
  status_code: number;
}

/**
 * IBM QRadar SIEM integration for advanced security analytics
 * Provides threat correlation and security intelligence for wedding platform
 */
export class QRadarIntegration {
  private config: QRadarConfig;
  private baseHeaders: Record<string, string>;

  // QRadar severity mapping from WedSync incident severity
  private readonly severityMapping = {
    critical: 10,
    high: 7,
    medium: 5,
    low: 3,
    info: 1,
  };

  // QRadar category mapping for wedding-specific incident types
  private readonly categoryMapping = {
    payment_fraud: 6001, // Financial fraud
    data_breach: 1002, // Data leakage
    venue_security: 4001, // Physical security
    supplier_compromise: 3001, // Account compromise
    platform_outage: 5001, // Service availability
    compliance_violation: 2001, // Policy violation
  };

  constructor() {
    // Load configuration from environment variables
    this.config = QRadarConfigSchema.parse({
      apiUrl: process.env.QRADAR_API_URL || 'https://qradar.wedsync.com/api',
      apiToken: process.env.QRADAR_API_TOKEN || '',
      apiVersion: process.env.QRADAR_API_VERSION || '14.0',
      verifySSL: process.env.QRADAR_VERIFY_SSL !== 'false',
      timeoutMs: parseInt(process.env.QRADAR_TIMEOUT_MS || '15000'),
      maxRetries: parseInt(process.env.QRADAR_MAX_RETRIES || '3'),
    });

    this.baseHeaders = {
      SEC: this.config.apiToken,
      Version: this.config.apiVersion,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'WedSync-Security-Integration/1.0',
    };
  }

  /**
   * Send incident to QRadar as a custom event
   * Wedding day critical - must not block incident response
   */
  async sendIncident(incident: Incident): Promise<QRadarResponse> {
    if (!this.config.apiToken) {
      throw new Error('QRadar API token not configured');
    }

    const qradarEvent = this.createQRadarEvent(incident);

    return this.executeWithRetry(async () => {
      const response = await fetch(`${this.config.apiUrl}/siem/events`, {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify(qradarEvent),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`QRadar API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // Log successful submission
      this.logSubmission(incident.id, 'success', result);

      return {
        data: result,
        status_code: response.status,
      };
    });
  }

  /**
   * Create QRadar offense (incident) for high-severity wedding day issues
   * Offenses group related events and trigger analyst workflows
   */
  async createOffense(
    incident: Incident,
  ): Promise<QRadarResponse<QRadarOffense>> {
    if (!this.config.apiToken) {
      throw new Error('QRadar API token not configured');
    }

    // Only create offenses for high-impact incidents
    if (!['critical', 'high'].includes(incident.severity)) {
      throw new Error(
        'Offense creation limited to critical/high severity incidents',
      );
    }

    const offenseData = {
      description: `WedSync ${incident.type}: ${incident.title}`,
      offense_type: 1, // Custom offense type
      assigned_to: 'wedsync_security_team',
      custom_properties: {
        WedSync_Incident_ID: incident.id,
        WedSync_Wedding_ID: incident.weddingId || '',
        WedSync_Supplier_ID: incident.supplierId || '',
        WedSync_Venue_ID: incident.venueId || '',
        WedSync_Incident_Type: incident.type,
        WedSync_Severity: incident.severity,
      },
    };

    return this.executeWithRetry(async () => {
      const response = await fetch(`${this.config.apiUrl}/siem/offenses`, {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify(offenseData),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `QRadar offense creation error: ${response.status} - ${errorText}`,
        );
      }

      const result = await response.json();

      // Log offense creation
      this.logSubmission(incident.id, 'offense_created', result);

      return {
        data: result as QRadarOffense,
        status_code: response.status,
      };
    });
  }

  /**
   * Query QRadar for related incidents or threat intelligence
   * Used for correlation analysis and threat hunting
   */
  async searchEvents(
    filter: string,
    timeRange = 'LAST 24 HOURS',
    limit = 100,
  ): Promise<QRadarResponse<unknown[]>> {
    if (!this.config.apiToken) {
      throw new Error('QRadar API token not configured');
    }

    const searchParams = new URLSearchParams({
      filter,
      range: timeRange,
      limit: limit.toString(),
      fields:
        'qid,magnitude,severity,eventtime,sourceip,destinationip,custom_properties',
    });

    return this.executeWithRetry(async () => {
      const response = await fetch(
        `${this.config.apiUrl}/siem/events?${searchParams}`,
        {
          method: 'GET',
          headers: this.baseHeaders,
          signal: AbortSignal.timeout(this.config.timeoutMs),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `QRadar search error: ${response.status} - ${errorText}`,
        );
      }

      const result = await response.json();

      return {
        data: Array.isArray(result) ? result : [result],
        status_code: response.status,
      };
    });
  }

  /**
   * Get QRadar offenses related to WedSync incidents
   * Used for incident correlation and status tracking
   */
  async getOffenses(
    filter = "custom_properties.'WedSync_Platform'='wedsync'",
    limit = 50,
  ): Promise<QRadarResponse<QRadarOffense[]>> {
    if (!this.config.apiToken) {
      throw new Error('QRadar API token not configured');
    }

    const searchParams = new URLSearchParams({
      filter,
      limit: limit.toString(),
      fields:
        'id,description,status,severity,magnitude,start_time,last_updated_time,categories',
    });

    return this.executeWithRetry(async () => {
      const response = await fetch(
        `${this.config.apiUrl}/siem/offenses?${searchParams}`,
        {
          method: 'GET',
          headers: this.baseHeaders,
          signal: AbortSignal.timeout(this.config.timeoutMs),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `QRadar offenses query error: ${response.status} - ${errorText}`,
        );
      }

      const result = await response.json();

      return {
        data: Array.isArray(result)
          ? (result as QRadarOffense[])
          : [result as QRadarOffense],
        status_code: response.status,
      };
    });
  }

  /**
   * Close QRadar offense when WedSync incident is resolved
   */
  async closeOffense(
    offenseId: number,
    closingReason = 'Resolved in WedSync platform',
  ): Promise<QRadarResponse> {
    if (!this.config.apiToken) {
      throw new Error('QRadar API token not configured');
    }

    const updateData = {
      status: 'CLOSED' as const,
      closing_reason: closingReason,
      closing_user: 'wedsync_automation',
    };

    return this.executeWithRetry(async () => {
      const response = await fetch(
        `${this.config.apiUrl}/siem/offenses/${offenseId}`,
        {
          method: 'POST',
          headers: this.baseHeaders,
          body: JSON.stringify(updateData),
          signal: AbortSignal.timeout(this.config.timeoutMs),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `QRadar offense closure error: ${response.status} - ${errorText}`,
        );
      }

      const result = await response.json();

      return {
        data: result,
        status_code: response.status,
      };
    });
  }

  /**
   * Test QRadar connectivity and authentication
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/system/about`, {
        method: 'GET',
        headers: this.baseHeaders,
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      console.error('QRadar connection test failed:', error);
      return false;
    }
  }

  /**
   * Create properly structured QRadar event for wedding security context
   */
  private createQRadarEvent(incident: Incident): QRadarEvent {
    const currentTime = Math.floor(Date.now() / 1000);
    const incidentTime = Math.floor(incident.timestamp.getTime() / 1000);

    return {
      sourceip: '10.0.0.1', // Default - should be actual source IP
      destinationip: '10.0.0.2', // Default - should be actual destination IP
      starttime: incidentTime,
      eventtime: incidentTime,
      devicetime: incidentTime,
      qid: 999999, // Custom QID for WedSync events
      magnitude:
        this.severityMapping[
          incident.severity as keyof typeof this.severityMapping
        ] || 5,
      severity:
        this.severityMapping[
          incident.severity as keyof typeof this.severityMapping
        ] || 5,
      credibility: 7, // High credibility for internal incidents
      relevance: 8, // High relevance for business
      category:
        this.categoryMapping[
          incident.type as keyof typeof this.categoryMapping
        ] || 9999,
      eventcount: 1,
      custom_properties: {
        WedSync_Incident_ID: incident.id,
        WedSync_Wedding_ID: incident.weddingId || '',
        WedSync_Supplier_ID: incident.supplierId || '',
        WedSync_Venue_ID: incident.venueId || '',
        WedSync_Incident_Type: incident.type,
        WedSync_Platform: 'wedsync',
        WedSync_Severity: incident.severity,
        WedSync_Title: incident.title.substring(0, 255), // QRadar field length limit
        WedSync_Description: incident.description.substring(0, 1024),
        WedSync_Affected_Users: incident.affectedUsers.join(','),
      },
    };
  }

  /**
   * Execute API call with retry logic for resilience
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
        `QRadar operation failed after ${this.config.maxRetries} retries: ${errorMessage}`,
      );
    }
  }

  /**
   * Log submission attempt for monitoring and debugging
   */
  private logSubmission(
    incidentId: string,
    status: string,
    data: Record<string, unknown>,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      integration: 'qradar',
      incident_id: incidentId,
      status,
      data,
    };

    // Use console for now - in production, this should go to a monitoring system
    console.log('QRadar submission log:', JSON.stringify(logEntry));
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<QRadarConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update headers if API token changed
    if (newConfig.apiToken) {
      this.baseHeaders['SEC'] = newConfig.apiToken;
    }
    if (newConfig.apiVersion) {
      this.baseHeaders['Version'] = newConfig.apiVersion;
    }
  }

  /**
   * Get current configuration (sanitized - no tokens)
   */
  getConfig(): Omit<QRadarConfig, 'apiToken'> {
    const { apiToken, ...sanitizedConfig } = this.config;
    return sanitizedConfig;
  }

  /**
   * Get QRadar system information and health status
   */
  async getSystemInfo(): Promise<QRadarResponse> {
    if (!this.config.apiToken) {
      throw new Error('QRadar API token not configured');
    }

    return this.executeWithRetry(async () => {
      const response = await fetch(`${this.config.apiUrl}/system/about`, {
        method: 'GET',
        headers: this.baseHeaders,
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `QRadar system info error: ${response.status} - ${errorText}`,
        );
      }

      const result = await response.json();

      return {
        data: result,
        status_code: response.status,
      };
    });
  }
}
