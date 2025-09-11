/**
 * WS-101 Alert System Types and Interfaces
 * Core definitions for the WedSync alert system
 */

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  SYSTEM_DOWN = 'system_down',
  WEDDING_EMERGENCY = 'wedding_emergency',
  VENDOR_CRITICAL = 'vendor_critical',
  TIMELINE_CRITICAL = 'timeline_critical',
}

export enum AlertType {
  SYSTEM = 'system',
  PERFORMANCE = 'performance',
  DATABASE = 'database',
  API_ERROR = 'api_error',
  DEPLOYMENT = 'deployment',
  ROLLBACK = 'rollback',
  VENDOR_ALERT = 'vendor_alert',
  WEDDING_CRITICAL = 'wedding_critical',
  PAYMENT_URGENT = 'payment_urgent',
  SECURITY = 'security',
  USER_ACTION = 'user_action',
}

export enum AlertStatus {
  NEW = 'new',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  IGNORED = 'ignored',
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  severity: AlertSeverity;
  status?: AlertStatus;
  timestamp: Date;
  source?: string;
  organizationId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  escalationLevel?: number;
  relatedAlerts?: string[];
  actionRequired?: boolean;
  actionUrl?: string;
  expiresAt?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  severity: AlertSeverity;
  type: AlertType;
  cooldownMinutes?: number;
  lastTriggered?: Date;
  organizationId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  field: string;
  operator:
    | 'equals'
    | 'notEquals'
    | 'greaterThan'
    | 'lessThan'
    | 'contains'
    | 'regex';
  value: any;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  timeWindow?: number; // in minutes
}

export interface AlertAction {
  type: 'notify' | 'escalate' | 'webhook' | 'runbook' | 'autoResolve';
  config: Record<string, any>;
  delay?: number; // in seconds
}

export interface AlertEscalation {
  id: string;
  alertId: string;
  level: number;
  escalatedTo: string[];
  escalatedAt: Date;
  reason: string;
  automaticEscalation: boolean;
  nextEscalation?: Date;
}

export interface AlertHistory {
  id: string;
  alertId: string;
  action:
    | 'created'
    | 'acknowledged'
    | 'escalated'
    | 'resolved'
    | 'commented'
    | 'reopened';
  performedBy: string;
  performedAt: Date;
  comment?: string;
  previousStatus?: AlertStatus;
  newStatus?: AlertStatus;
  metadata?: Record<string, any>;
}

export interface AlertMetrics {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  averageResolutionTime: number; // in minutes
  averageAcknowledgmentTime: number; // in minutes
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByType: Record<AlertType, number>;
  recentAlerts: Alert[];
  topAlertSources: Array<{ source: string; count: number }>;
  escalationRate: number; // percentage
  falsePositiveRate: number; // percentage
}

export interface AlertSubscription {
  id: string;
  userId: string;
  channels: string[];
  severities: AlertSeverity[];
  types: AlertType[];
  sources?: string[];
  keywords?: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertAggregation {
  key: string;
  count: number;
  alerts: Alert[];
  firstOccurrence: Date;
  lastOccurrence: Date;
  pattern?: string;
  suggestedAction?: string;
}

export interface AlertThreshold {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  comparison: 'above' | 'below' | 'equals';
  duration?: number; // in minutes
  enabled: boolean;
  severity: AlertSeverity;
  type: AlertType;
  notificationChannels: string[];
}

export interface AlertSuppression {
  id: string;
  pattern?: string;
  source?: string;
  type?: AlertType;
  severity?: AlertSeverity;
  startTime: Date;
  endTime: Date;
  reason: string;
  createdBy: string;
  enabled: boolean;
}

export class AlertError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any,
  ) {
    super(message);
    this.name = 'AlertError';
  }
}
