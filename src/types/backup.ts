/**
 * Backup Strategy Implementation System Types
 * Wedding industry focused backup and disaster recovery types
 */

export interface BackupSystemStatus {
  id: string;
  overallHealth: 'healthy' | 'warning' | 'critical';
  healthScore: number; // 0-100
  lastBackupTime: Date;
  nextScheduledBackup: Date;
  activeBackups: number;
  totalDataSize: number;
  encryptionStatus: 'enabled' | 'disabled' | 'partial';
}

export interface BackupSchedule {
  id: string;
  name: string;
  dataType: BackupDataType;
  frequency: BackupFrequency;
  retentionDays: number;
  destinations: BackupDestination[];
  isActive: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  weddingSeasonOptimized: boolean;
  nextRun: Date;
}

export type BackupDataType =
  | 'wedding_photos'
  | 'client_data'
  | 'business_files'
  | 'contracts'
  | 'timelines'
  | 'communications'
  | 'system_config';

export type BackupFrequency =
  | 'real_time'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly';

export interface BackupDestination {
  id: string;
  type: 'local' | 'cloud' | 'offsite' | 'replication';
  name: string;
  endpoint?: string;
  isOnline: boolean;
  storageUsed: number;
  storageLimit: number;
  encryptionEnabled: boolean;
}

export interface RecoveryPoint {
  id: string;
  timestamp: Date;
  dataType: BackupDataType;
  size: number;
  checksum: string;
  isVerified: boolean;
  destination: BackupDestination;
  metadata: {
    weddingDate?: Date;
    clientName?: string;
    criticalData: boolean;
  };
}

export interface BackupOperation {
  id: string;
  type: 'backup' | 'recovery' | 'verification';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  startTime: Date;
  endTime?: Date;
  estimatedCompletionTime?: Date;
  dataType: BackupDataType;
  operation: string;
  errorMessage?: string;
}

export interface RecoveryRequest {
  id: string;
  recoveryPoint: RecoveryPoint;
  targetLocation: string;
  requestedBy: string;
  requestTime: Date;
  priority: 'emergency' | 'urgent' | 'normal';
  status: 'pending' | 'approved' | 'running' | 'completed' | 'failed';
  reason: string;
}

export interface EmergencyStatus {
  isActive: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type:
    | 'data_loss'
    | 'system_failure'
    | 'security_breach'
    | 'corruption'
    | 'disaster';
  startTime?: Date;
  description: string;
  affectedSystems: string[];
  recoveryActions: EmergencyAction[];
}

export interface EmergencyAction {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo?: string;
  startTime?: Date;
  completionTime?: Date;
  notes?: string;
}

export interface BackupAnalytics {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  successRate: number;
  averageBackupTime: number;
  averageRecoveryTime: number;
  dataGrowthRate: number;
  costAnalysis: {
    totalCost: number;
    costPerGB: number;
    projectedCost: number;
  };
  weddingSeasonImpact: {
    peakPeriods: Array<{
      start: Date;
      end: Date;
      backupVolume: number;
      performanceImpact: number;
    }>;
  };
}

export interface RetentionPolicy {
  id: string;
  name: string;
  dataType: BackupDataType;
  rules: RetentionRule[];
  weddingDataSpecial: boolean; // Wedding photos kept longer
  isActive: boolean;
}

export interface RetentionRule {
  frequency: BackupFrequency;
  keepFor: number;
  unit: 'days' | 'weeks' | 'months' | 'years';
  afterWeddingDate?: boolean; // Keep wedding data longer after wedding
}

export interface StorageMetrics {
  tier: 'local' | 'cloud' | 'offsite' | 'archive';
  used: number;
  available: number;
  total: number;
  cost: number;
  performance: {
    readSpeed: number;
    writeSpeed: number;
    availability: number;
  };
}

export interface BackupAlert {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  relatedOperation?: string;
  actionRequired: boolean;
  weddingImpact: boolean; // If this affects wedding day operations
}

export interface RecoveryProgress {
  operationId: string;
  stage:
    | 'preparation'
    | 'download'
    | 'verification'
    | 'restoration'
    | 'validation';
  progress: number;
  estimatedTimeRemaining: number;
  currentFile?: string;
  errors: string[];
  warnings: string[];
}

export interface BackupSystemConfig {
  localBackup: LocalBackupConfig;
  cloudBackup: CloudBackupConfig;
  offsiteBackup: OffsiteBackupConfig;
  replicationBackup: ReplicationBackupConfig;
}

export interface LocalBackupConfig {
  enabled: boolean;
  path: string;
  maxSize: number;
  compressionEnabled: boolean;
  encryptionKey?: string;
}

export interface CloudBackupConfig {
  enabled: boolean;
  provider: 'aws' | 'azure' | 'gcp' | 'dropbox' | 'onedrive';
  region?: string;
  bucket?: string;
  credentials: {
    accessKey?: string;
    secretKey?: string;
    token?: string;
  };
}

export interface OffsiteBackupConfig {
  enabled: boolean;
  provider: string;
  location: string;
  frequency: BackupFrequency;
  transportMethod: 'internet' | 'physical_media' | 'dedicated_line';
}

export interface ReplicationBackupConfig {
  enabled: boolean;
  targets: Array<{
    id: string;
    endpoint: string;
    synchronous: boolean;
  }>;
}

// Wedding-specific backup context
export interface WeddingBackupContext {
  weddingId: string;
  weddingDate: Date;
  clientNames: string[];
  photographerName: string;
  criticalFiles: string[];
  backupPriority: 'standard' | 'high' | 'critical';
  specialInstructions?: string;
}

// Component props interfaces
export interface BackupDashboardProps {
  systemStatus: BackupSystemStatus;
  recentOperations: BackupOperation[];
  alerts: BackupAlert[];
  onEmergencyResponse: () => void;
}

export interface DataProtectionPanelProps {
  schedules: BackupSchedule[];
  policies: RetentionPolicy[];
  onUpdateSchedule: (schedule: BackupSchedule) => void;
  onUpdatePolicy: (policy: RetentionPolicy) => void;
}

export interface RecoveryControlProps {
  recoveryPoints: RecoveryPoint[];
  onInitiateRecovery: (request: RecoveryRequest) => void;
  onCancelRecovery: (operationId: string) => void;
}

export interface EmergencyResponseProps {
  emergencyStatus: EmergencyStatus;
  availableActions: EmergencyAction[];
  onExecuteAction: (action: EmergencyAction) => void;
  onUpdateStatus: (status: EmergencyStatus) => void;
}
