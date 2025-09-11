/**
 * WS-190: ArcSight SIEM Integration for WedSync Incident Response
 *
 * Integrates with Micro Focus ArcSight ESM for comprehensive security
 * event management and correlation across wedding platform infrastructure.
 */

import { z } from 'zod';
import type { Incident } from '../incident-orchestrator';

// ArcSight ESM configuration
const ArcSightConfigSchema = z.object({
  esmServer: z.string().url(),
  username: z.string().min(1),
  password: z.string().min(1),
  port: z.number().default(8443),
  useSSL: z.boolean().default(true),
  timeoutMs: z.number().default(20000),
  maxRetries: z.number().default(3),
  sessionTimeout: z.number().default(3600), // 1 hour
});

type ArcSightConfig = z.infer<typeof ArcSightConfigSchema>;

// ArcSight Common Event Format (CEF) structure
interface CEFEvent {
  version: string;
  deviceVendor: string;
  deviceProduct: string;
  deviceVersion: string;
  deviceEventClassId: string;
  name: string;
  severity: number;
  extensions: Record<string, string | number>;
}

// ArcSight Web Services API session
interface ArcSightSession {
  sessionId: string;
  loginTime: Date;
  lastActivity: Date;
  isValid: boolean;
}

// ArcSight event response
interface ArcSightResponse {
  success: boolean;
  eventId?: string;
  message?: string;
  timestamp: Date;
}

// ArcSight query result
interface ArcSightQueryResult {
  events: Array<Record<string, unknown>>;
  totalCount: number;
  queryTime: number;
}

/**
 * ArcSight ESM integration for enterprise-grade security event management
 * Provides comprehensive logging and correlation for wedding platform security
 */
export class ArcSightIntegration {
  private config: ArcSightConfig;
  private session: ArcSightSession | null = null;
  private sessionRefreshTimer: NodeJS.Timeout | null = null;

  // ArcSight severity mapping from WedSync incident severity
  private readonly severityMapping = {
    critical: 10,
    high: 7,
    medium: 5,
    low: 3,
    info: 1,
  };

  // Wedding-specific device event class IDs
  private readonly eventClassMapping = {
    payment_fraud: 'WEDSYNC:FRAUD:001',
    data_breach: 'WEDSYNC:BREACH:001',
    venue_security: 'WEDSYNC:PHYSICAL:001',
    supplier_compromise: 'WEDSYNC:COMPROMISE:001',
    platform_outage: 'WEDSYNC:AVAILABILITY:001',
    compliance_violation: 'WEDSYNC:COMPLIANCE:001',
  };

  constructor() {
    // Load configuration from environment variables
    this.config = ArcSightConfigSchema.parse({
      esmServer:
        process.env.ARCSIGHT_ESM_SERVER || 'https://arcsight.wedsync.com',
      username: process.env.ARCSIGHT_USERNAME || '',
      password: process.env.ARCSIGHT_PASSWORD || '',
      port: parseInt(process.env.ARCSIGHT_PORT || '8443'),
      useSSL: process.env.ARCSIGHT_USE_SSL !== 'false',
      timeoutMs: parseInt(process.env.ARCSIGHT_TIMEOUT_MS || '20000'),
      maxRetries: parseInt(process.env.ARCSIGHT_MAX_RETRIES || '3'),
      sessionTimeout: parseInt(process.env.ARCSIGHT_SESSION_TIMEOUT || '3600'),
    });

    // Initialize session management
    this.initializeSessionManagement();
  }

  /**
   * Send incident to ArcSight as CEF event
   * Wedding day critical - must not block incident response
   */
  async sendIncident(incident: Incident): Promise<ArcSightResponse> {
    if (!this.config.username || !this.config.password) {
      throw new Error('ArcSight credentials not configured');
    }

    // Ensure valid session
    await this.ensureValidSession();

    const cefEvent = this.createCEFEvent(incident);

    return this.executeWithRetry(async () => {
      const response = await fetch(
        `${this.config.esmServer}:${this.config.port}/www/core-service/rest/EventService/receiveEvents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `ArcSight-Token ${this.session?.sessionId}`,
            'User-Agent': 'WedSync-Security-Integration/1.0',
          },
          body: JSON.stringify({
            events: [cefEvent],
            format: 'cef',
          }),
          signal: AbortSignal.timeout(this.config.timeoutMs),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();

        // Handle session expiry
        if (response.status === 401) {
          await this.refreshSession();
          throw new Error('Session expired, retrying with new session');
        }

        throw new Error(
          `ArcSight API error: ${response.status} - ${errorText}`,
        );
      }

      const result = await response.json();

      // Log successful submission
      this.logSubmission(incident.id, 'success', result);

      return {
        success: true,
        eventId: result.eventId || result.id,
        message: 'Event successfully submitted to ArcSight',
        timestamp: new Date(),
      };
    });
  }

  /**
   * Send batch of incidents for bulk processing
   * Optimized for historical data import or bulk correlation
   */
  async sendBatchIncidents(incidents: Incident[]): Promise<ArcSightResponse[]> {
    if (!this.config.username || !this.config.password) {
      throw new Error('ArcSight credentials not configured');
    }

    if (incidents.length === 0) {
      throw new Error('No incidents provided for batch processing');
    }

    // Ensure valid session
    await this.ensureValidSession();

    // Convert all incidents to CEF events
    const cefEvents = incidents.map((incident) =>
      this.createCEFEvent(incident),
    );

    // Process in smaller batches to avoid timeout
    const batchSize = 100;
    const results: ArcSightResponse[] = [];

    for (let i = 0; i < cefEvents.length; i += batchSize) {
      const batch = cefEvents.slice(i, i + batchSize);

      const batchResult = await this.executeWithRetry(async () => {
        const response = await fetch(
          `${this.config.esmServer}:${this.config.port}/www/core-service/rest/EventService/receiveEvents`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `ArcSight-Token ${this.session?.sessionId}`,
              'User-Agent': 'WedSync-Security-Integration/1.0',
            },
            body: JSON.stringify({
              events: batch,
              format: 'cef',
            }),
            signal: AbortSignal.timeout(this.config.timeoutMs * 2), // Extended timeout for batch
          },
        );

        if (!response.ok) {
          const errorText = await response.text();

          if (response.status === 401) {
            await this.refreshSession();
            throw new Error('Session expired, retrying with new session');
          }

          throw new Error(
            `ArcSight batch API error: ${response.status} - ${errorText}`,
          );
        }

        return await response.json();
      });

      // Convert batch result to individual responses
      const batchResponses = batch.map((_, index) => ({
        success: true,
        eventId: `batch_${i + index}`,
        message: `Batch event ${i + index} processed`,
        timestamp: new Date(),
      }));

      results.push(...batchResponses);
    }

    // Log batch submission
    this.logBatchSubmission(incidents.length, 'success', {
      batches: Math.ceil(incidents.length / batchSize),
    });

    return results;
  }

  /**
   * Query ArcSight for events matching criteria
   * Used for incident correlation and threat investigation
   */
  async queryEvents(
    query: string,
    startTime?: Date,
    endTime?: Date,
    maxResults = 1000,
  ): Promise<ArcSightQueryResult> {
    if (!this.config.username || !this.config.password) {
      throw new Error('ArcSight credentials not configured');
    }

    // Ensure valid session
    await this.ensureValidSession();

    const queryParams = {
      query,
      startTime:
        startTime?.toISOString() ||
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endTime: endTime?.toISOString() || new Date().toISOString(),
      maxResults,
      timeout: this.config.timeoutMs,
    };

    return this.executeWithRetry(async () => {
      const response = await fetch(
        `${this.config.esmServer}:${this.config.port}/www/core-service/rest/QueryService/query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `ArcSight-Token ${this.session?.sessionId}`,
          },
          body: JSON.stringify(queryParams),
          signal: AbortSignal.timeout(this.config.timeoutMs),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();

        if (response.status === 401) {
          await this.refreshSession();
          throw new Error('Session expired, retrying with new session');
        }

        throw new Error(
          `ArcSight query error: ${response.status} - ${errorText}`,
        );
      }

      const result = await response.json();

      return {
        events: result.events || [],
        totalCount: result.totalCount || 0,
        queryTime: result.queryTime || 0,
      };
    });
  }

  /**
   * Test ArcSight connectivity and authentication
   */
  async testConnection(): Promise<boolean> {
    try {
      const loginResult = await this.login();
      if (loginResult) {
        await this.logout();
        return true;
      }
      return false;
    } catch (error) {
      console.error('ArcSight connection test failed:', error);
      return false;
    }
  }

  /**
   * Create CEF (Common Event Format) event for ArcSight
   */
  private createCEFEvent(incident: Incident): CEFEvent {
    const severity =
      this.severityMapping[
        incident.severity as keyof typeof this.severityMapping
      ] || 5;
    const deviceEventClassId =
      this.eventClassMapping[
        incident.type as keyof typeof this.eventClassMapping
      ] || 'WEDSYNC:GENERIC:001';

    return {
      version: '0',
      deviceVendor: 'WedSync',
      deviceProduct: 'Wedding Platform',
      deviceVersion: '1.0',
      deviceEventClassId,
      name: incident.title,
      severity,
      extensions: {
        // Standard CEF fields
        rt: incident.timestamp.getTime(), // Receipt time
        start: incident.timestamp.getTime(), // Start time
        end: incident.timestamp.getTime(), // End time
        msg: incident.description,

        // Custom WedSync fields
        cs1Label: 'Incident ID',
        cs1: incident.id,
        cs2Label: 'Wedding ID',
        cs2: incident.weddingId || '',
        cs3Label: 'Supplier ID',
        cs3: incident.supplierId || '',
        cs4Label: 'Venue ID',
        cs4: incident.venueId || '',
        cs5Label: 'Incident Type',
        cs5: incident.type,
        cs6Label: 'Platform',
        cs6: 'wedsync',

        // Numeric custom fields
        cn1Label: 'Affected Users Count',
        cn1: incident.affectedUsers.length,
        cn2Label: 'Severity Level',
        cn2: severity,

        // Additional fields
        dhost: process.env.HOSTNAME || 'wedsync-prod',
        duser: 'system',
        src: '0.0.0.0', // Will be set by actual source
        dst: '0.0.0.0', // Will be set by actual destination

        // Custom metadata as JSON string
        flexString1Label: 'Metadata',
        flexString1: JSON.stringify(incident.metadata || {}),

        // Affected users as comma-separated
        flexString2Label: 'Affected Users',
        flexString2: incident.affectedUsers.join(','),
      },
    };
  }

  /**
   * Initialize session management with automatic refresh
   */
  private initializeSessionManagement(): void {
    // Set up session refresh timer
    this.sessionRefreshTimer = setInterval(async () => {
      if (this.session && this.isSessionExpiring()) {
        try {
          await this.refreshSession();
        } catch (error) {
          console.error('Automatic session refresh failed:', error);
          this.session = null;
        }
      }
    }, 300000); // Check every 5 minutes
  }

  /**
   * Ensure we have a valid session for API calls
   */
  private async ensureValidSession(): Promise<void> {
    if (!this.session || !this.isSessionValid()) {
      await this.login();
    }
  }

  /**
   * Login to ArcSight and establish session
   */
  private async login(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.esmServer}:${this.config.port}/www/core-service/rest/LoginService/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            login: this.config.username,
            password: this.config.password,
            altDetail: true,
          }),
          signal: AbortSignal.timeout(this.config.timeoutMs),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `ArcSight login failed: ${response.status} - ${errorText}`,
        );
      }

      const result = await response.json();

      this.session = {
        sessionId: result.log.return,
        loginTime: new Date(),
        lastActivity: new Date(),
        isValid: true,
      };

      return true;
    } catch (error) {
      console.error('ArcSight login failed:', error);
      this.session = null;
      return false;
    }
  }

  /**
   * Refresh existing session
   */
  private async refreshSession(): Promise<void> {
    if (!this.session) {
      await this.login();
      return;
    }

    try {
      const response = await fetch(
        `${this.config.esmServer}:${this.config.port}/www/core-service/rest/LoginService/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `ArcSight-Token ${this.session.sessionId}`,
          },
          signal: AbortSignal.timeout(this.config.timeoutMs),
        },
      );

      if (response.ok) {
        this.session.lastActivity = new Date();
      } else {
        // If refresh fails, try new login
        await this.login();
      }
    } catch (error) {
      console.error('ArcSight session refresh failed:', error);
      await this.login();
    }
  }

  /**
   * Logout and cleanup session
   */
  private async logout(): Promise<void> {
    if (!this.session) return;

    try {
      await fetch(
        `${this.config.esmServer}:${this.config.port}/www/core-service/rest/LoginService/logout`,
        {
          method: 'POST',
          headers: {
            Authorization: `ArcSight-Token ${this.session.sessionId}`,
          },
          signal: AbortSignal.timeout(5000),
        },
      );
    } catch (error) {
      console.error('ArcSight logout failed:', error);
    } finally {
      this.session = null;
    }
  }

  /**
   * Check if session is valid
   */
  private isSessionValid(): boolean {
    if (!this.session) return false;

    const now = Date.now();
    const sessionAge = now - this.session.loginTime.getTime();

    return sessionAge < this.config.sessionTimeout * 1000;
  }

  /**
   * Check if session is about to expire (within 5 minutes)
   */
  private isSessionExpiring(): boolean {
    if (!this.session) return false;

    const now = Date.now();
    const sessionAge = now - this.session.loginTime.getTime();
    const expiryThreshold = (this.config.sessionTimeout - 300) * 1000; // 5 minutes before expiry

    return sessionAge > expiryThreshold;
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryCount = 0,
  ): Promise<T> {
    try {
      const result = await operation();

      // Update session activity on successful operation
      if (this.session) {
        this.session.lastActivity = new Date();
      }

      return result;
    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeWithRetry(operation, retryCount + 1);
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `ArcSight operation failed after ${this.config.maxRetries} retries: ${errorMessage}`,
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
      integration: 'arcsight',
      incident_id: incidentId,
      status,
      data,
    };

    console.log('ArcSight submission log:', JSON.stringify(logEntry));
  }

  /**
   * Log batch submission for monitoring
   */
  private logBatchSubmission(
    count: number,
    status: string,
    data: Record<string, unknown>,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      integration: 'arcsight',
      batch_count: count,
      status,
      data,
    };

    console.log('ArcSight batch submission log:', JSON.stringify(logEntry));
  }

  /**
   * Cleanup resources on shutdown
   */
  async cleanup(): Promise<void> {
    if (this.sessionRefreshTimer) {
      clearInterval(this.sessionRefreshTimer);
      this.sessionRefreshTimer = null;
    }

    await this.logout();
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<ArcSightConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // If credentials changed, invalidate session
    if (newConfig.username || newConfig.password) {
      this.session = null;
    }
  }

  /**
   * Get current configuration (sanitized - no credentials)
   */
  getConfig(): Omit<ArcSightConfig, 'username' | 'password'> {
    const { username, password, ...sanitizedConfig } = this.config;
    return sanitizedConfig;
  }

  /**
   * Get session status for monitoring
   */
  getSessionStatus(): {
    hasSession: boolean;
    sessionAge?: number;
    isValid: boolean;
    expiresIn?: number;
  } {
    if (!this.session) {
      return {
        hasSession: false,
        isValid: false,
      };
    }

    const now = Date.now();
    const sessionAge = now - this.session.loginTime.getTime();
    const expiresIn = this.config.sessionTimeout * 1000 - sessionAge;

    return {
      hasSession: true,
      sessionAge: sessionAge / 1000, // in seconds
      isValid: this.isSessionValid(),
      expiresIn: Math.max(0, expiresIn / 1000), // in seconds
    };
  }
}
