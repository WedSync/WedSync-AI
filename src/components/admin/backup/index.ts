// Backup Dashboard Components - WS-178 & WS-191
// Export all backup-related components for clean imports

// WS-178 Components (existing)
export { default as BackupDashboard } from './BackupDashboard';
export { default as BackupStatusCard } from './BackupStatusCard';

// WS-191 Components (new)
export { default as WS191BackupDashboard } from './WS191BackupDashboard';
export { RecoveryPointTimeline } from './RecoveryPointTimeline';
export { ManualBackupForm } from './ManualBackupForm';
export { BackupHistoryTable } from './BackupHistoryTable';

// Re-export types for convenience
export type {
  // WS-178 types
  BackupStatus,
  BackupMetrics,
  BackupConfig,
  BackupHistoryEntry,
  BackupDataType,
  RestoreRequest,
  BackupFilters,
  BackupStatusFilter,
  BackupDateRange,
  BackupError,
  BackupErrorBoundaryState,
  // WS-191 types
  ExtendedBackupStatus,
  BackupOperation,
  RecoveryPoint,
  BackupFormData,
  BackupComponent,
  BackupOptions,
  BackupStatusCardProps,
  RecoveryPointTimelineProps,
  ManualBackupFormProps,
  BackupHistoryTableProps,
  ExtendedBackupDashboardProps,
  BackupAPIResponse,
  ExtendedBackupMetrics,
  AdminUser,
  BackupPermission,
  BackupAuditLog,
  BackupRealtimeUpdate,
  BackupUIError,
} from '../../../types/backup';
