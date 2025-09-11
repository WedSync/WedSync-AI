/**
 * WedSync Offline Conflict Resolution Types
 * Feature: WS-172 - Offline Functionality - Conflict Resolution
 * Team: C - Batch 21 - Round 3
 *
 * Comprehensive type definitions for offline conflict detection and resolution
 * in wedding planning contexts with multi-user synchronization support.
 */

// User identification for conflict ownership and security
export interface UserContext {
  readonly id: string;
  readonly role: 'bride' | 'groom' | 'admin' | 'vendor' | 'planner';
  readonly deviceId: string;
  readonly sessionId: string;
}

// Timestamp with timezone information for accurate conflict detection
export interface ConflictTimestamp {
  readonly timestamp: number; // Unix timestamp
  readonly timezone: string;
  readonly deviceTime: number; // Local device time
}

// Generic versioned data wrapper with integrity checking
export interface VersionedData<T = unknown> {
  readonly id: string;
  readonly version: number;
  readonly data: T;
  readonly lastModified: ConflictTimestamp;
  readonly modifiedBy: UserContext;
  readonly checksum: string; // SHA-256 hash for data integrity
}

// Conflict detection metadata
export interface ConflictMetadata {
  readonly conflictId: string;
  readonly detectedAt: ConflictTimestamp;
  readonly affectedFields: readonly string[];
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly autoResolvable: boolean;
}

// Wedding-specific data types using template literal types
export type WeddingDataType =
  | 'timeline-item'
  | 'vendor-contact'
  | 'guest-list'
  | 'budget-item'
  | 'task-assignment'
  | 'venue-details'
  | 'photo-album'
  | 'menu-selection'
  | 'seating-arrangement';

// Resolution strategy using template literals for type safety
export type ResolutionStrategy<T extends WeddingDataType = WeddingDataType> =
  | `${T}-last-write-wins`
  | `${T}-merge-fields`
  | `${T}-user-preference`
  | `${T}-priority-based`
  | `${T}-manual-review`;

// Discriminated union for different conflict types
export type ConflictType =
  | {
      type: 'field-conflict';
      field: string;
      conflictingValues: readonly unknown[];
    }
  | {
      type: 'deletion-conflict';
      deletedBy: UserContext;
      modifiedBy: UserContext;
    }
  | { type: 'creation-conflict'; creators: readonly UserContext[] }
  | {
      type: 'permission-conflict';
      requiredPermission: string;
      userPermissions: readonly string[];
    }
  | { type: 'dependency-conflict'; dependentItems: readonly string[] };

// Main conflict structure
export interface DataConflict<T = unknown> {
  readonly metadata: ConflictMetadata;
  readonly dataType: WeddingDataType;
  readonly localVersion: VersionedData<T>;
  readonly remoteVersion: VersionedData<T>;
  readonly conflictType: ConflictType;
  readonly resolutionStrategy: ResolutionStrategy;
  readonly isResolved: boolean;
  readonly resolvedAt?: ConflictTimestamp;
  readonly resolvedBy?: UserContext;
  readonly resolutionData?: T;
}

// Audit trail entry for compliance and debugging
export interface ConflictAuditEntry {
  readonly entryId: string;
  readonly conflictId: string;
  readonly action:
    | 'detected'
    | 'resolved'
    | 'escalated'
    | 'merged'
    | 'rejected';
  readonly timestamp: ConflictTimestamp;
  readonly user: UserContext;
  readonly details: Record<string, unknown>;
  readonly dataSnapshot?: unknown;
}

// Result type for resolution operations
export type ResolutionResult<T> =
  | { success: true; resolvedData: T; audit: ConflictAuditEntry }
  | {
      success: false;
      error: ConflictResolutionError;
      requiresManualReview: boolean;
    };

// Custom error types for conflict resolution
export class ConflictResolutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly conflictId: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ConflictResolutionError';
  }
}

// Wedding-specific data structures
export interface TimelineItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly location?: string;
  readonly assignedTo: readonly string[];
  readonly priority: 1 | 2 | 3 | 4 | 5;
  readonly status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  readonly dependencies: readonly string[];
  readonly tags: readonly string[];
}

export interface VendorContact {
  readonly id: string;
  readonly name: string;
  readonly company: string;
  readonly category:
    | 'photographer'
    | 'caterer'
    | 'florist'
    | 'venue'
    | 'dj'
    | 'other';
  readonly contact: {
    readonly email: string;
    readonly phone: string;
    readonly address?: string;
  };
  readonly contractStatus: 'inquiring' | 'negotiating' | 'booked' | 'completed';
  readonly budget: {
    readonly estimated: number;
    readonly actual?: number;
    readonly currency: string;
  };
  readonly notes: readonly string[];
}

export interface GuestEntry {
  readonly id: string;
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
  readonly relationship: string;
  readonly invitedBy: 'bride' | 'groom' | 'both';
  readonly rsvpStatus: 'pending' | 'accepted' | 'declined' | 'maybe';
  readonly dietaryRestrictions: readonly string[];
  readonly plusOne: boolean;
  readonly seatingGroup?: string;
}

// Utility types
export type MergeableFields<T> = {
  [K in keyof T]: T[K] extends readonly unknown[]
    ? K
    : T[K] extends string | number | boolean
      ? K
      : never;
}[keyof T];

// Conflict resolution configuration
export interface ConflictResolutionConfig {
  readonly autoResolveThreshold: number; // seconds
  readonly maxConflictsPerUser: number;
  readonly auditRetentionDays: number;
  readonly enableUserNotifications: boolean;
  readonly priorityWeights: Record<UserContext['role'], number>;
}
