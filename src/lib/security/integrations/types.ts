/**
 * Security Integration Types and Interfaces
 *
 * Shared type definitions to prevent circular dependencies in the security
 * integrations system. All security services should implement these interfaces
 * to ensure compatibility with the incident orchestrator.
 */

import { z } from 'zod';

// Re-export incident types for convenience
export enum IncidentSeverity {
  CRITICAL = 'critical', // Wedding day blocking - immediate response
  HIGH = 'high', // Service degradation during events
  MEDIUM = 'medium', // Non-critical service issues
  LOW = 'low', // Monitoring alerts only
  INFO = 'info', // General information
}

export enum WeddingIncidentType {
  PAYMENT_FRAUD = 'payment_fraud', // Payment processor fraud detection
  DATA_BREACH = 'data_breach', // Guest/vendor data compromise
  VENUE_SECURITY = 'venue_security', // Venue security system integration
  SUPPLIER_COMPROMISE = 'supplier_compromise', // Wedding supplier security breach
  PLATFORM_OUTAGE = 'platform_outage', // WedSync platform availability
  COMPLIANCE_VIOLATION = 'compliance_violation', // GDPR/regulatory violations
}

// Incident data structure validation schema
export const IncidentSchema = z.object({
  id: z.string().uuid(),
  severity: z.nativeEnum(IncidentSeverity),
  type: z.nativeEnum(WeddingIncidentType),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  source: z.string().min(1).max(100),
  timestamp: z.date(),
  weddingId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
  affectedUsers: z.array(z.string().uuid()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export type Incident = z.infer<typeof IncidentSchema>;

// Integration response tracking interface
export interface IntegrationResponse {
  integration: string;
  success: boolean;
  responseTime: number;
  error?: string;
  data?: Record<string, unknown>;
}

// SIEM Integration Interfaces
export interface SIEMIntegration {
  sendIncident(incident: Incident): Promise<Record<string, unknown>>;
}

// Notification System Interfaces
export interface EmergencyNotifier {
  sendCriticalAlert(incident: Incident): Promise<Record<string, unknown>>;
  sendHighPriorityAlert(incident: Incident): Promise<Record<string, unknown>>;
  sendStandardAlert(incident: Incident): Promise<Record<string, unknown>>;
}

export interface SMSNotifier {
  sendEmergencyAlert(incident: Incident): Promise<Record<string, unknown>>;
}

export interface PagerDutyNotifier {
  createCriticalIncident(incident: Incident): Promise<Record<string, unknown>>;
}

// Compliance Tool Interfaces
export interface GDPRProcessor {
  processDataBreach(incident: Incident): Promise<Record<string, unknown>>;
}

export interface AuditLogger {
  logIncident(incident: Incident): Promise<Record<string, unknown>>;
  logWeddingDayIncident(incident: Incident): Promise<Record<string, unknown>>;
  logError(errorData: {
    type: string;
    message: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }): Promise<Record<string, unknown>>;
  recordMetrics(metrics: {
    processingTimeMs: number;
    responseCount: number;
    timestamp: Date;
    activeIncidents: number;
  }): Promise<Record<string, unknown>>;
}

// Orchestrator configuration
export interface OrchestratorConfig {
  siemEnabled: boolean;
  notificationsEnabled: boolean;
  complianceEnabled: boolean;
  weddingDayMode: boolean;
  maxConcurrentIncidents: number;
  responseTimeoutMs: number;
}

// Service injection interfaces for dependency injection
export interface SecurityServices {
  // SIEM Services
  splunk?: SIEMIntegration;
  qradar?: SIEMIntegration;
  arcsight?: SIEMIntegration;

  // Notification Services
  slackNotifier?: EmergencyNotifier;
  teamsNotifier?: EmergencyNotifier;
  emailNotifier?: EmergencyNotifier;
  smsNotifier?: SMSNotifier;
  pagerduty?: PagerDutyNotifier;

  // Compliance Services
  gdprAutomation?: GDPRProcessor;
  auditIntegration?: AuditLogger;
}
