/**
 * WS-227 System Health - Alert System Types
 * Shared types to prevent circular dependencies
 */

export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  category: 'database' | 'api' | 'service' | 'security' | 'performance';
  title: string;
  message: string;
  source: string;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: Date;
  acknowledgedBy?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  throttle?: number; // Minutes between similar alerts
  weddingDayOverride?: boolean;
}

export interface AlertCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface AlertAction {
  type: 'email' | 'sms' | 'slack' | 'pagerduty' | 'webhook';
  target: string;
  template?: string;
  enabled: boolean;
}

export interface EscalationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: EscalationCondition[];
  escalationLevels: EscalationLevel[];
  weddingDayOverride: boolean;
  timeoutMinutes: number;
}

export interface EscalationCondition {
  alertSeverity: Alert['severity'];
  alertCategory: Alert['category'];
  timeWithoutAcknowledgment: number; // minutes
  consecutiveAlerts?: number;
}

export interface EscalationLevel {
  level: number;
  delayMinutes: number;
  actions: AlertAction[];
  autoResolve?: boolean;
}

export type WeddingDayStatus =
  | 'normal'
  | 'wedding_day'
  | 'peak_season'
  | 'maintenance';

export interface WeddingDayContext {
  status: WeddingDayStatus;
  activeWeddings: number;
  upcomingWeddings: number;
  criticalHours: boolean; // 9 AM - 11 PM on Saturday
  peakSeason: boolean; // June-September
}

// Additional escalation types
export interface EscalationAction {
  type:
    | 'notify'
    | 'create_ticket'
    | 'call_oncall'
    | 'page'
    | 'webhook'
    | 'sms_blast';
  config: Record<string, any>;
  retries: number;
  timeoutSeconds: number;
}

export interface EscalationRecipient {
  type: 'user' | 'group' | 'role' | 'external';
  identifier: string;
  channels: string[];
  availability?: {
    timezone: string;
    workingHours: { start: string; end: string };
    weekdays: number[];
  };
}

export interface EscalationPlan {
  alertId: string;
  ruleId: string;
  currentLevel: number;
  maxLevel: number;
  nextEscalation: Date | null;
  executionHistory: EscalationExecution[];
  isWeddingDay: boolean;
}

export interface EscalationExecution {
  level: number;
  timestamp: Date;
  actions: EscalationActionResult[];
  success: boolean;
  duration: number;
}

export interface EscalationActionResult {
  action: EscalationAction;
  success: boolean;
  message: string;
  executionTime: number;
  retryCount: number;
}

// Alert metrics and monitoring
export interface AlertMetrics {
  totalAlerts: number;
  alertsBySeverity: Record<string, number>;
  alertsByCategory: Record<string, number>;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  averageResolutionTime: number;
  escalatedAlerts: number;
  weddingDayAlerts: number;
}
