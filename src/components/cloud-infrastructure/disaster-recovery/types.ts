/**
 * Disaster Recovery Types for WedSync
 * Wedding industry-specific emergency protocols and DR management
 */

export type DRSiteStatus = 'healthy' | 'warning' | 'critical' | 'offline';
export type BackupStatus =
  | 'completed'
  | 'running'
  | 'failed'
  | 'pending'
  | 'corrupted';
export type FailoverStatus =
  | 'ready'
  | 'in_progress'
  | 'failed'
  | 'completed'
  | 'testing';
export type DataIntegrityLevel = 'excellent' | 'good' | 'warning' | 'critical';

export interface DRSite {
  id: string;
  name: string;
  status: DRSiteStatus;
  location: string;
  provider: 'aws' | 'azure' | 'gcp' | 'digitalocean' | 'hybrid';
  lastHealthCheck: Date;
  rto: number; // Recovery Time Objective (minutes)
  rpo: number; // Recovery Point Objective (minutes)
  currentLoad: number; // percentage
  capacity: number; // percentage available
  lastSyncTime: Date;
  replicationLag: number; // seconds
  endpoints: {
    primary: string;
    backup: string;
    management: string;
  };
  weddingDayReady: boolean;
}

export interface BackupConfiguration {
  id: string;
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  schedule: string; // cron expression
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  encryption: boolean;
  compression: boolean;
  incremental: boolean;
  weddingDataPriority: boolean;
  lastBackup: Date;
  status: BackupStatus;
  sizeGB: number;
  integrityCheck: DataIntegrityLevel;
  estimatedRestoreTime: number; // minutes
}

export interface ReplicationStatus {
  sourceLocation: string;
  targetLocation: string;
  provider: string;
  lag: number; // seconds
  bytesReplicated: number;
  status: 'synced' | 'syncing' | 'error' | 'paused';
  lastSync: Date;
  errorCount: number;
  dataIntegrity: number; // percentage
  weddingCriticalData: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  role:
    | 'technical_lead'
    | 'wedding_coordinator'
    | 'business_owner'
    | 'external_support';
  phone: string;
  email: string;
  availableWeekends: boolean;
  timezone: string;
  escalationOrder: number;
}

export interface WeddingDayProtocol {
  isWeddingDay: boolean; // Saturday detection
  activeWeddings: number;
  emergencyContacts: EmergencyContact[];
  backupVenues?: string[];
  photographerAlert: boolean;
  doubleConfirmation: boolean;
  restrictedActions: string[];
  emergencyEscalation: boolean;
  maxAllowedDowntime: number; // minutes (usually 2-3 for Saturdays)
}

export interface FailoverProcedure {
  id: string;
  name: string;
  description: string;
  sourceSite: string;
  targetSite: string;
  estimatedTime: number; // minutes
  steps: FailoverStep[];
  prerequisites: string[];
  rollbackPlan: string[];
  weddingDayModified: boolean;
  testLastRun: Date;
  testSuccess: boolean;
}

export interface FailoverStep {
  id: string;
  order: number;
  description: string;
  command?: string;
  expectedDuration: number; // seconds
  critical: boolean;
  rollbackCommand?: string;
  verificationStep: string;
}

export interface DRTestResult {
  id: string;
  testType:
    | 'full_failover'
    | 'backup_restore'
    | 'data_integrity'
    | 'network_failover'
    | 'wedding_simulation';
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'passed' | 'failed' | 'cancelled';
  rtoAchieved?: number;
  rpoAchieved?: number;
  issues: DRIssue[];
  weddingScenario?: string;
  performanceMetrics: {
    dataTransferSpeed: number; // MB/s
    applicationStartTime: number; // seconds
    databaseSyncTime: number; // seconds
    dnsFailoverTime: number; // seconds
  };
}

export interface DRIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  component: string;
  weddingImpact: 'none' | 'minimal' | 'moderate' | 'severe';
  resolution?: string;
  resolvedAt?: Date;
}

export interface DRDashboardData {
  sites: DRSite[];
  backups: BackupConfiguration[];
  replicationStatus: ReplicationStatus[];
  activeTests: DRTestResult[];
  recentIssues: DRIssue[];
  weddingProtocol: WeddingDayProtocol;
  lastUpdated: Date;
  overallHealth: 'healthy' | 'warning' | 'critical';
  emergencyMode: boolean;
}

export interface DRControlPanelProps {
  organizationId: string;
  showWeddingProtocols?: boolean;
  enableEmergencyMode?: boolean;
  refreshInterval?: number;
  onEmergencyAlert?: (alert: DRIssue) => void;
  className?: string;
}

export interface FailoverConfirmation {
  reason: string;
  estimatedDowntime: number;
  affectedServices: string[];
  weddingImpactAcknowledged: boolean;
  emergencyContactNotified: boolean;
  doubleConfirmed: boolean;
}
