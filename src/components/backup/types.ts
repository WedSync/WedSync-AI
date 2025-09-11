/**
 * WS-258: Backup Strategy Implementation System - TypeScript Interfaces
 * Critical P1 system for protecting irreplaceable wedding data
 */

export type BackupStatus =
  | 'healthy'
  | 'warning'
  | 'critical'
  | 'in-progress'
  | 'failed';
export type BackupTier = 'local' | 'cloud' | 'offsite' | 'replication';
export type DataType =
  | 'photos'
  | 'client-data'
  | 'business-files'
  | 'database'
  | 'system-config';
export type RecoveryPriority =
  | 'emergency'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';
export type EmergencyStatus =
  | 'normal'
  | 'alert'
  | 'critical'
  | 'disaster-recovery-active';

export interface BackupSystemStatus {
  id: string;
  overall_status: BackupStatus;
  health_score: number; // 0-100
  last_successful_backup: Date;
  next_scheduled_backup: Date;
  active_backups_count: number;
  failed_backups_count: number;
  total_data_protected: number; // in bytes
  wedding_critical_data_status: BackupStatus;
  emergency_contacts_available: boolean;
}

export interface BackupSchedule {
  id: string;
  name: string;
  data_types: DataType[];
  schedule_expression: string; // cron expression
  backup_tiers: BackupTier[];
  retention_days: number;
  wedding_season_priority: boolean;
  encryption_enabled: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  data_type: DataType;
  daily_retention: number;
  weekly_retention: number;
  monthly_retention: number;
  yearly_retention: number;
  wedding_data_special_retention: number;
  compliance_requirements: string[];
}

export interface RecoveryPoint {
  id: string;
  backup_id: string;
  created_at: Date;
  data_types: DataType[];
  backup_size: number;
  integrity_verified: boolean;
  recovery_priority: RecoveryPriority;
  wedding_event_id?: string;
  metadata: {
    wedding_date?: Date;
    client_names?: string[];
    venue_name?: string;
    photographer_notes?: string;
  };
}

export interface BackupOperation {
  id: string;
  type: 'backup' | 'restore' | 'verify';
  status: BackupStatus;
  progress_percentage: number;
  data_types: DataType[];
  start_time: Date;
  estimated_completion?: Date;
  bytes_processed: number;
  total_bytes: number;
  error_message?: string;
  wedding_critical: boolean;
}

export interface StorageMetrics {
  tier: BackupTier;
  total_capacity: number;
  used_capacity: number;
  available_capacity: number;
  cost_per_gb: number;
  monthly_cost: number;
  optimization_suggestions: string[];
}

export interface RecoveryProgress {
  id: string;
  recovery_point_id: string;
  status: BackupStatus;
  progress_percentage: number;
  estimated_completion: Date;
  recovered_files_count: number;
  total_files_count: number;
  recovered_size: number;
  total_size: number;
  integrity_checks_passed: number;
  integrity_checks_failed: number;
}

export interface EmergencyResponse {
  id: string;
  status: EmergencyStatus;
  incident_type:
    | 'data-loss'
    | 'system-failure'
    | 'corruption'
    | 'security-breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_weddings: string[];
  affected_data_types: DataType[];
  response_time: Date;
  recovery_initiated: boolean;
  estimated_recovery_time?: Date;
  emergency_contacts_notified: boolean;
  automated_responses: string[];
}

export interface LocalBackupConfig {
  enabled: boolean;
  storage_path: string;
  max_storage_gb: number;
  encryption_key?: string;
  compression_enabled: boolean;
  verify_after_backup: boolean;
}

export interface CloudBackupConfig {
  enabled: boolean;
  provider: 'aws' | 'azure' | 'gcp';
  bucket_name: string;
  region: string;
  storage_class: string;
  encryption_enabled: boolean;
  cross_region_replication: boolean;
}

export interface OffsiteBackupConfig {
  enabled: boolean;
  provider: string;
  location: string;
  transport_method: 'internet' | 'physical-media';
  encryption_required: boolean;
  compliance_certifications: string[];
}

export interface ReplicationBackupConfig {
  enabled: boolean;
  target_locations: string[];
  sync_frequency: 'real-time' | 'hourly' | 'daily';
  conflict_resolution: 'latest-wins' | 'manual-review';
  bandwidth_limit_mbps?: number;
}

export interface BackupSystemConfig {
  id: string;
  name: string;
  local_backup: LocalBackupConfig;
  cloud_backup: CloudBackupConfig;
  offsite_backup: OffsiteBackupConfig;
  replication_backup: ReplicationBackupConfig;
  emergency_contacts: {
    primary_email: string;
    primary_phone: string;
    secondary_email?: string;
    secondary_phone?: string;
    escalation_time_minutes: number;
  };
  wedding_specific_settings: {
    priority_booking_days_before: number;
    wedding_day_backup_frequency_minutes: number;
    post_wedding_retention_days: number;
    emergency_response_time_minutes: number;
  };
}

export interface BackupAnalytics {
  success_rate_7d: number;
  success_rate_30d: number;
  average_backup_duration_minutes: number;
  average_recovery_duration_minutes: number;
  storage_growth_trend: {
    date: Date;
    size_gb: number;
  }[];
  cost_trend: {
    date: Date;
    cost_usd: number;
  }[];
  wedding_season_performance: {
    month: string;
    backup_volume_gb: number;
    success_rate: number;
    average_duration_minutes: number;
  }[];
}

export interface ComplianceReport {
  id: string;
  report_date: Date;
  compliance_frameworks: string[]; // GDPR, CCPA, etc.
  retention_compliance: boolean;
  encryption_compliance: boolean;
  access_control_compliance: boolean;
  audit_trail_complete: boolean;
  violations: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    remediation_required: boolean;
  }[];
}

// Component Props Interfaces
export interface BackupStrategyDashboardProps {
  organizationId: string;
  showEmergencyMode?: boolean;
  compactView?: boolean;
}

export interface BackupConfigurationPanelProps {
  dataTypes: DataType[];
  policies: RetentionPolicy[];
  onConfigUpdate: (config: BackupSystemConfig) => void;
  readOnly?: boolean;
}

export interface RecoveryManagementCenterProps {
  recoveryPoints: RecoveryPoint[];
  onRecoveryInitiate: (
    recoveryPoint: RecoveryPoint,
    options: RecoveryOptions,
  ) => void;
  emergencyMode?: boolean;
}

export interface DataProtectionMonitorProps {
  protectionStatus: BackupSystemStatus;
  realTimeUpdates?: boolean;
  showMobileView?: boolean;
}

export interface EmergencyRecoveryDashboardProps {
  emergencyStatus: EmergencyResponse;
  onEmergencyAction: (action: EmergencyAction) => void;
  allowManualOverride?: boolean;
}

export interface BackupTimelineChartProps {
  backupHistory: BackupOperation[];
  recoveryPoints: RecoveryPoint[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface StorageUtilizationDashboardProps {
  storageMetrics: StorageMetrics[];
  showCostOptimization?: boolean;
  showPredictiveAnalytics?: boolean;
}

export interface RecoveryTimeAnalyticsProps {
  recoveryHistory: RecoveryProgress[];
  rtoTargets: {
    emergency: number;
    critical: number;
    standard: number;
  };
}

export interface RecoveryOptions {
  recovery_type:
    | 'full-system'
    | 'selective-files'
    | 'database-only'
    | 'wedding-specific';
  target_location: string;
  overwrite_existing: boolean;
  verify_integrity: boolean;
  notify_on_completion: boolean;
  wedding_event_id?: string;
}

export interface EmergencyAction {
  type:
    | 'initiate-recovery'
    | 'escalate-support'
    | 'activate-failover'
    | 'notify-stakeholders';
  parameters: Record<string, any>;
  authorization_required: boolean;
}

// WebSocket Message Types
export interface BackupWebSocketMessage {
  type:
    | 'status-update'
    | 'progress-update'
    | 'emergency-alert'
    | 'system-notification';
  payload: BackupSystemStatus | BackupOperation | EmergencyResponse | any;
  timestamp: Date;
  organization_id: string;
}

// API Response Types
export interface BackupApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
  metadata?: {
    total_items?: number;
    page?: number;
    per_page?: number;
    wedding_critical?: boolean;
  };
}

// Utility Types
export type BackupHealthColor = 'green' | 'yellow' | 'red';
export type BackupSize = 'small' | 'medium' | 'large' | 'enterprise';
export type WeddingSeasonStatus =
  | 'off-season'
  | 'pre-season'
  | 'peak-season'
  | 'post-season';
