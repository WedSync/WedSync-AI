/**
 * WS-190: Splunk SIEM Integration for WedSync Incident Response
 *
 * Integrates with Splunk Enterprise Security for wedding platform security events.
 * Critical for monitoring wedding day security across venues and suppliers.
 */

import { z } from 'zod';
import type { Incident } from '../incident-orchestrator';

// Splunk HEC (HTTP Event Collector) endpoint configuration
const SplunkConfigSchema = z.object({
  hecUrl: z.string().url(),
  hecToken: z.string().min(1),
  index: z.string().default('wedsync_security'),
  source: z.string().default('wedsync_incidents'),
  sourcetype: z.string().default('wedsync:incident'),
  verifySSL: z.boolean().default(true),
  timeoutMs: z.number().default(10000),
});

type SplunkConfig = z.infer<typeof SplunkConfigSchema>;

// Splunk event structure
interface SplunkEvent {
  time: number;
  host: string;
  source: string;
  sourcetype: string;
  index: string;
  event: {
    incident_id: string;
    severity: string;
    type: string;
    title: string;
    description: string;
    wedding_context: {
      wedding_id?: string;
      supplier_id?: string;
      venue_id?: string;
      affected_users: string[];
    };
    metadata: Record<string, unknown>;
    wedsync_fields: {
      platform: 'wedsync';
      environment: string;
      version: string;
      timestamp_iso: string;
    };
  };
}

// Response from Splunk HEC
interface SplunkHECResponse {
  text: string;
  code: number;
  invalid_event_number?: number;
  [key: string]: unknown;
}

/**
 * Splunk Enterprise Security integration for wedding platform incidents
 * Sends structured security events to Splunk for SIEM analysis and correlation
 */
export class SplunkIntegration {
  private config: SplunkConfig;
  private hostname: string;

  constructor() {
    // Load configuration from environment variables
    this.config = SplunkConfigSchema.parse({
      hecUrl:
        process.env.SPLUNK_HEC_URL ||
        'https://splunk.wedsync.com:8088/services/collector',
      hecToken: process.env.SPLUNK_HEC_TOKEN || '',
      index: process.env.SPLUNK_INDEX || 'wedsync_security',
      source: process.env.SPLUNK_SOURCE || 'wedsync_incidents',
      sourcetype: process.env.SPLUNK_SOURCETYPE || 'wedsync:incident',
      verifySSL: process.env.SPLUNK_VERIFY_SSL !== 'false',
      timeoutMs: parseInt(process.env.SPLUNK_TIMEOUT_MS || '10000'),
    });

    this.hostname = process.env.HOSTNAME || 'wedsync-prod';
  }

  /**
   * Send incident to Splunk for SIEM processing
   * Wedding day critical - must not block incident response
   */
  async sendIncident(incident: Incident): Promise<SplunkHECResponse> {
    if (!this.config.hecToken) {
      throw new Error('Splunk HEC token not configured');
    }

    const splunkEvent = this.createSplunkEvent(incident);

    try {
      const response = await fetch(this.config.hecUrl, {
        method: 'POST',
        headers: {
          Authorization: `Splunk ${this.config.hecToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-Security-Integration/1.0',
        },
        body: JSON.stringify(splunkEvent),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Splunk HEC error: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as SplunkHECResponse;

      // Log successful submission for monitoring
      this.logSubmission(incident.id, 'success', result);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Log failed submission for monitoring
      this.logSubmission(incident.id, 'failure', { error: errorMessage });

      throw new Error(`Failed to send incident to Splunk: ${errorMessage}`);
    }
  }

  /**
   * Create properly structured Splunk event for wedding security context
   */
  private createSplunkEvent(incident: Incident): SplunkEvent {
    return {
      time: Math.floor(incident.timestamp.getTime() / 1000), // Unix timestamp
      host: this.hostname,
      source: this.config.source,
      sourcetype: this.config.sourcetype,
      index: this.config.index,
      event: {
        incident_id: incident.id,
        severity: incident.severity,
        type: incident.type,
        title: incident.title,
        description: incident.description,
        wedding_context: {
          wedding_id: incident.weddingId,
          supplier_id: incident.supplierId,
          venue_id: incident.venueId,
          affected_users: incident.affectedUsers,
        },
        metadata: incident.metadata || {},
        wedsync_fields: {
          platform: 'wedsync',
          environment: process.env.NODE_ENV || 'production',
          version: process.env.APP_VERSION || '1.0.0',
          timestamp_iso: incident.timestamp.toISOString(),
        },
      },
    };
  }

  /**
   * Send batch of incidents for bulk processing
   * Used for historical data import or bulk updates
   */
  async sendBatchIncidents(incidents: Incident[]): Promise<SplunkHECResponse> {
    if (!this.config.hecToken) {
      throw new Error('Splunk HEC token not configured');
    }

    if (incidents.length === 0) {
      throw new Error('No incidents provided for batch processing');
    }

    // Create batch of events separated by newlines (NDJSON format)
    const batchEvents = incidents
      .map((incident) => JSON.stringify(this.createSplunkEvent(incident)))
      .join('\n');

    try {
      const response = await fetch(this.config.hecUrl, {
        method: 'POST',
        headers: {
          Authorization: `Splunk ${this.config.hecToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-Security-Integration/1.0',
        },
        body: batchEvents,
        signal: AbortSignal.timeout(this.config.timeoutMs * 2), // Extended timeout for batch
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Splunk HEC batch error: ${response.status} - ${errorText}`,
        );
      }

      const result = (await response.json()) as SplunkHECResponse;

      // Log batch submission
      this.logBatchSubmission(incidents.length, 'success', result);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Log failed batch submission
      this.logBatchSubmission(incidents.length, 'failure', {
        error: errorMessage,
      });

      throw new Error(
        `Failed to send batch incidents to Splunk: ${errorMessage}`,
      );
    }
  }

  /**
   * Query Splunk for related incidents or investigation data
   * Used for incident correlation and threat hunting
   */
  async searchIncidents(
    searchQuery: string,
    timeRange = '-24h',
  ): Promise<unknown[]> {
    if (!process.env.SPLUNK_SEARCH_TOKEN) {
      throw new Error('Splunk search token not configured');
    }

    const searchUrl = `${this.config.hecUrl.replace('/services/collector', '')}/services/search/jobs`;

    try {
      // Create search job
      const searchJobResponse = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          Authorization: `Splunk ${process.env.SPLUNK_SEARCH_TOKEN}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          search: `search index="${this.config.index}" ${searchQuery} earliest="${timeRange}"`,
          output_mode: 'json',
          exec_mode: 'oneshot',
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!searchJobResponse.ok) {
        const errorText = await searchJobResponse.text();
        throw new Error(
          `Splunk search error: ${searchJobResponse.status} - ${errorText}`,
        );
      }

      const searchResults = await searchJobResponse.json();
      return searchResults.results || [];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to search Splunk incidents: ${errorMessage}`);
    }
  }

  /**
   * Test Splunk connectivity and authentication
   */
  async testConnection(): Promise<boolean> {
    try {
      const testEvent = {
        time: Math.floor(Date.now() / 1000),
        host: this.hostname,
        source: 'wedsync_test',
        sourcetype: 'wedsync:test',
        index: this.config.index,
        event: {
          message: 'WedSync Splunk integration test',
          timestamp: new Date().toISOString(),
          test: true,
        },
      };

      const response = await fetch(this.config.hecUrl, {
        method: 'POST',
        headers: {
          Authorization: `Splunk ${this.config.hecToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testEvent),
        signal: AbortSignal.timeout(5000), // Short timeout for test
      });

      return response.ok;
    } catch (error) {
      console.error('Splunk connection test failed:', error);
      return false;
    }
  }

  /**
   * Log submission attempt for monitoring and debugging
   */
  private logSubmission(
    incidentId: string,
    status: 'success' | 'failure',
    data: Record<string, unknown>,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      integration: 'splunk',
      incident_id: incidentId,
      status,
      data,
    };

    // Use console for now - in production, this should go to a monitoring system
    console.log('Splunk submission log:', JSON.stringify(logEntry));
  }

  /**
   * Log batch submission for monitoring
   */
  private logBatchSubmission(
    count: number,
    status: 'success' | 'failure',
    data: Record<string, unknown>,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      integration: 'splunk',
      batch_count: count,
      status,
      data,
    };

    console.log('Splunk batch submission log:', JSON.stringify(logEntry));
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<SplunkConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration (sanitized - no tokens)
   */
  getConfig(): Omit<SplunkConfig, 'hecToken'> {
    const { hecToken, ...sanitizedConfig } = this.config;
    return sanitizedConfig;
  }
}
