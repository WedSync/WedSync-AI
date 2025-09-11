/**
 * WS-190: Incident Response Procedures - Main Integration Coordinator
 *
 * Orchestrates security incident response across multiple platforms and services
 * for the WedSync wedding platform. This is critical wedding day infrastructure
 * that coordinates security responses during live wedding events.
 *
 * Uses dependency injection to avoid circular dependencies with individual
 * security service implementations.
 */

import {
  Incident,
  IncidentSeverity,
  WeddingIncidentType,
  IncidentSchema,
  IntegrationResponse,
  OrchestratorConfig,
  SecurityServices,
  SIEMIntegration,
  EmergencyNotifier,
  SMSNotifier,
  PagerDutyNotifier,
  GDPRProcessor,
  AuditLogger,
} from './types';

/**
 * Main incident response orchestrator for the WedSync platform
 * Coordinates security responses across SIEM, notifications, and compliance tools
 *
 * Uses dependency injection pattern to avoid circular dependencies
 */
export class IncidentOrchestrator {
  private splunk?: SIEMIntegration;
  private qradar?: SIEMIntegration;
  private arcsight?: SIEMIntegration;

  private slackNotifier?: EmergencyNotifier;
  private teamsNotifier?: EmergencyNotifier;
  private emailNotifier?: EmergencyNotifier;
  private smsNotifier?: SMSNotifier;
  private pagerduty?: PagerDutyNotifier;

  private gdprAutomation?: GDPRProcessor;
  private auditIntegration?: AuditLogger;

  private config: OrchestratorConfig;
  private activeIncidents: Map<string, Incident> = new Map();
  private responseMetrics: Map<string, IntegrationResponse[]> = new Map();

  constructor(
    config: Partial<OrchestratorConfig> = {},
    services: SecurityServices = {},
  ) {
    this.config = {
      siemEnabled: true,
      notificationsEnabled: true,
      complianceEnabled: true,
      weddingDayMode: false,
      maxConcurrentIncidents: 100,
      responseTimeoutMs: 30000,
      ...config,
    };

    // Inject services (allows for lazy loading to break circular dependencies)
    this.splunk = services.splunk;
    this.qradar = services.qradar;
    this.arcsight = services.arcsight;
    this.slackNotifier = services.slackNotifier;
    this.teamsNotifier = services.teamsNotifier;
    this.emailNotifier = services.emailNotifier;
    this.smsNotifier = services.smsNotifier;
    this.pagerduty = services.pagerduty;
    this.gdprAutomation = services.gdprAutomation;
    this.auditIntegration = services.auditIntegration;
  }

  /**
   * Primary incident processing method
   * Wedding day critical - must complete within SLA regardless of external failures
   */
  async processIncident(incident: unknown): Promise<{
    incidentId: string;
    processed: boolean;
    responses: IntegrationResponse[];
    errors: string[];
  }> {
    const startTime = Date.now();
    const responses: IntegrationResponse[] = [];
    const errors: string[] = [];

    try {
      // Validate incident data
      const validatedIncident = IncidentSchema.parse(incident);

      // Check capacity limits
      if (this.activeIncidents.size >= this.config.maxConcurrentIncidents) {
        throw new Error('Maximum concurrent incidents exceeded');
      }

      // Add to active incidents
      this.activeIncidents.set(validatedIncident.id, validatedIncident);

      // Wedding day priority handling
      if (
        this.config.weddingDayMode &&
        validatedIncident.severity === IncidentSeverity.CRITICAL
      ) {
        await this.handleWeddingDayEmergency(validatedIncident);
      }

      // Process SIEM integrations in parallel (only if services are available)
      if (this.config.siemEnabled) {
        const siemPromises: Promise<IntegrationResponse>[] = [];

        if (this.splunk) {
          siemPromises.push(
            this.processSiemIntegration(
              'splunk',
              this.splunk,
              validatedIncident,
            ),
          );
        }
        if (this.qradar) {
          siemPromises.push(
            this.processSiemIntegration(
              'qradar',
              this.qradar,
              validatedIncident,
            ),
          );
        }
        if (this.arcsight) {
          siemPromises.push(
            this.processSiemIntegration(
              'arcsight',
              this.arcsight,
              validatedIncident,
            ),
          );
        }

        if (siemPromises.length > 0) {
          const siemResults = await Promise.allSettled(siemPromises);
          responses.push(...this.extractSettledResults(siemResults));
        }
      }

      // Process notifications based on severity
      if (this.config.notificationsEnabled) {
        const notificationResults =
          await this.processNotifications(validatedIncident);
        responses.push(...notificationResults);
      }

      // Handle compliance requirements
      if (
        this.config.complianceEnabled &&
        this.requiresComplianceAction(validatedIncident)
      ) {
        const complianceResults =
          await this.processCompliance(validatedIncident);
        responses.push(...complianceResults);
      }

      // Record metrics
      this.responseMetrics.set(validatedIncident.id, responses);

      return {
        incidentId: validatedIncident.id,
        processed: true,
        responses,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      // Log error for monitoring
      await this.logError('incident_processing_failed', errorMessage, {
        incident,
      });

      return {
        incidentId: 'unknown',
        processed: false,
        responses,
        errors,
      };
    } finally {
      const processingTime = Date.now() - startTime;
      await this.recordProcessingMetrics(processingTime, responses.length);
    }
  }

  /**
   * Wedding day emergency handler - highest priority with redundancy
   */
  private async handleWeddingDayEmergency(incident: Incident): Promise<void> {
    // Immediate high-priority notifications (only if services are available)
    const emergencyPromises: Promise<unknown>[] = [];

    if (this.pagerduty) {
      emergencyPromises.push(this.pagerduty.createCriticalIncident(incident));
    }
    if (this.smsNotifier) {
      emergencyPromises.push(this.smsNotifier.sendEmergencyAlert(incident));
    }
    if (this.slackNotifier) {
      emergencyPromises.push(this.slackNotifier.sendCriticalAlert(incident));
    }

    // Don't wait for these - fire and forget for speed
    if (emergencyPromises.length > 0) {
      Promise.allSettled(emergencyPromises).catch((error) => {
        console.error('Wedding day emergency notification failed:', error);
      });
    }

    // Log for audit trail (if service available)
    if (this.auditIntegration) {
      await this.auditIntegration.logWeddingDayIncident(incident);
    }
  }

  /**
   * Process SIEM integration with timeout and error handling
   */
  private async processSiemIntegration(
    name: string,
    integration: SIEMIntegration,
    incident: Incident,
  ): Promise<IntegrationResponse> {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        integration.sendIncident(incident),
        this.createTimeout(this.config.responseTimeoutMs),
      ]);

      return {
        integration: name,
        success: true,
        responseTime: Date.now() - startTime,
        data: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        integration: name,
        success: false,
        responseTime: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Process notifications based on incident severity and type
   */
  private async processNotifications(
    incident: Incident,
  ): Promise<IntegrationResponse[]> {
    const notificationPromises: Promise<IntegrationResponse>[] = [];

    // Critical incidents get all notification channels (if available)
    if (incident.severity === IncidentSeverity.CRITICAL) {
      if (this.slackNotifier) {
        notificationPromises.push(
          this.processNotification(
            'slack',
            this.slackNotifier.sendCriticalAlert(incident),
          ),
        );
      }
      if (this.teamsNotifier) {
        notificationPromises.push(
          this.processNotification(
            'teams',
            this.teamsNotifier.sendCriticalAlert(incident),
          ),
        );
      }
      if (this.emailNotifier) {
        notificationPromises.push(
          this.processNotification(
            'email',
            this.emailNotifier.sendCriticalAlert(incident),
          ),
        );
      }
      if (this.smsNotifier) {
        notificationPromises.push(
          this.processNotification(
            'sms',
            this.smsNotifier.sendEmergencyAlert(incident),
          ),
        );
      }
      if (this.pagerduty) {
        notificationPromises.push(
          this.processNotification(
            'pagerduty',
            this.pagerduty.createCriticalIncident(incident),
          ),
        );
      }
    }
    // High severity gets most channels (if available)
    else if (incident.severity === IncidentSeverity.HIGH) {
      if (this.slackNotifier) {
        notificationPromises.push(
          this.processNotification(
            'slack',
            this.slackNotifier.sendHighPriorityAlert(incident),
          ),
        );
      }
      if (this.teamsNotifier) {
        notificationPromises.push(
          this.processNotification(
            'teams',
            this.teamsNotifier.sendHighPriorityAlert(incident),
          ),
        );
      }
      if (this.emailNotifier) {
        notificationPromises.push(
          this.processNotification(
            'email',
            this.emailNotifier.sendHighPriorityAlert(incident),
          ),
        );
      }
    }
    // Medium/Low get basic notifications (if available)
    else {
      if (this.slackNotifier) {
        notificationPromises.push(
          this.processNotification(
            'slack',
            this.slackNotifier.sendStandardAlert(incident),
          ),
        );
      }
    }

    const results = await Promise.allSettled(notificationPromises);
    return this.extractSettledResults(results);
  }

  /**
   * Helper to process individual notification with error handling
   */
  private async processNotification(
    name: string,
    promise: Promise<unknown>,
  ): Promise<IntegrationResponse> {
    const startTime = Date.now();

    try {
      const result = await promise;
      return {
        integration: name,
        success: true,
        responseTime: Date.now() - startTime,
        data:
          typeof result === 'object'
            ? (result as Record<string, unknown>)
            : { result },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        integration: name,
        success: false,
        responseTime: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Process compliance requirements based on incident type
   */
  private async processCompliance(
    incident: Incident,
  ): Promise<IntegrationResponse[]> {
    const compliancePromises: Promise<IntegrationResponse>[] = [];

    // Data breach incidents require GDPR processing (if service available)
    if (
      incident.type === WeddingIncidentType.DATA_BREACH &&
      this.gdprAutomation
    ) {
      compliancePromises.push(
        this.processNotification(
          'gdpr',
          this.gdprAutomation.processDataBreach(incident),
        ),
      );
    }

    // All incidents require audit logging (if service available)
    if (this.auditIntegration) {
      compliancePromises.push(
        this.processNotification(
          'audit',
          this.auditIntegration.logIncident(incident),
        ),
      );
    }

    const results = await Promise.allSettled(compliancePromises);
    return this.extractSettledResults(results);
  }

  /**
   * Check if incident requires compliance action
   */
  private requiresComplianceAction(incident: Incident): boolean {
    return (
      incident.type === WeddingIncidentType.DATA_BREACH ||
      incident.type === WeddingIncidentType.COMPLIANCE_VIOLATION ||
      incident.severity === IncidentSeverity.CRITICAL
    );
  }

  /**
   * Extract results from Promise.allSettled
   */
  private extractSettledResults(
    results: PromiseSettledResult<IntegrationResponse>[],
  ): IntegrationResponse[] {
    return results.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : {
            integration: 'unknown',
            success: false,
            responseTime: 0,
            error: result.reason?.message || 'Promise rejected',
          },
    );
  }

  /**
   * Create timeout promise for race conditions
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Integration timeout')), ms),
    );
  }

  /**
   * Log errors for monitoring and debugging
   */
  private async logError(
    type: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      if (this.auditIntegration) {
        await this.auditIntegration.logError({
          type,
          message,
          timestamp: new Date(),
          metadata,
        });
      } else {
        // Fallback to console if audit integration not available
        console.error('Audit integration not available, logging to console:', {
          type,
          message,
          metadata,
        });
      }
    } catch (error) {
      // Fallback to console if audit logging fails
      console.error('Failed to log error:', { type, message, metadata, error });
    }
  }

  /**
   * Record processing metrics for monitoring
   */
  private async recordProcessingMetrics(
    processingTime: number,
    responseCount: number,
  ): Promise<void> {
    try {
      if (this.auditIntegration) {
        await this.auditIntegration.recordMetrics({
          processingTimeMs: processingTime,
          responseCount,
          timestamp: new Date(),
          activeIncidents: this.activeIncidents.size,
        });
      } else {
        // Fallback to console if audit integration not available
        console.error('Audit integration not available, metrics:', {
          processingTimeMs: processingTime,
          responseCount,
          activeIncidents: this.activeIncidents.size,
        });
      }
    } catch (error) {
      console.error('Failed to record processing metrics:', error);
    }
  }

  /**
   * Enable wedding day mode for enhanced response times
   */
  enableWeddingDayMode(): void {
    this.config.weddingDayMode = true;
    this.config.responseTimeoutMs = 10000; // Reduce timeout for faster responses
    this.config.maxConcurrentIncidents = 200; // Increase capacity for wedding day load
  }

  /**
   * Disable wedding day mode
   */
  disableWeddingDayMode(): void {
    this.config.weddingDayMode = false;
    this.config.responseTimeoutMs = 30000; // Standard timeout
    this.config.maxConcurrentIncidents = 100; // Standard capacity
  }

  /**
   * Get current orchestrator status
   */
  getStatus(): {
    activeIncidents: number;
    weddingDayMode: boolean;
    integrations: Record<string, boolean>;
  } {
    return {
      activeIncidents: this.activeIncidents.size,
      weddingDayMode: this.config.weddingDayMode,
      integrations: {
        siem: this.config.siemEnabled,
        notifications: this.config.notificationsEnabled,
        compliance: this.config.complianceEnabled,
      },
    };
  }

  /**
   * Clear resolved incident from active tracking
   */
  resolveIncident(incidentId: string): boolean {
    return this.activeIncidents.delete(incidentId);
  }

  /**
   * Get incident processing metrics
   */
  getMetrics(incidentId: string): IntegrationResponse[] | undefined {
    return this.responseMetrics.get(incidentId);
  }
}

// Export factory function for creating orchestrator with services
export function createIncidentOrchestrator(
  config?: Partial<OrchestratorConfig>,
  services?: SecurityServices,
): IncidentOrchestrator {
  return new IncidentOrchestrator(config, services);
}

// Export singleton instance for application use (lazy-loaded services)
export const incidentOrchestrator = createIncidentOrchestrator();
