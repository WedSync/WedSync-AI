/**
 * Conflict Resolution Type Exports
 * Re-exports types from the main offline types file for convenience
 */

export type {
  UserContext,
  ConflictTimestamp,
  VersionedData,
  ConflictMetadata,
  WeddingDataType,
  ResolutionStrategy,
  ConflictType,
  DataConflict,
  ConflictAuditEntry,
  ResolutionResult,
  TimelineItem,
  VendorContact,
  GuestEntry,
  MergeableFields,
  ConflictResolutionConfig,
} from '../../../types/offline';

export { ConflictResolutionError } from '../../../types/offline';
