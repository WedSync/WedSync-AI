/**
 * Encryption Integration Types for WedSync
 *
 * Provides comprehensive type definitions for field-level encryption,
 * GDPR compliance, legacy data migration, and API middleware integration.
 *
 * @file /wedsync/src/types/encryption-integration.ts
 * @version 1.0.0
 * @author WedSync Development Team
 */

/**
 * Base interface for encrypted field data with metadata
 * @template T - The original data type before encryption
 */
export interface EncryptedField<T = unknown> {
  /** The encrypted value as base64 string */
  encrypted_value: string;
  /** Encryption algorithm used (AES-256-GCM, ChaCha20-Poly1305, etc.) */
  algorithm: EncryptionAlgorithm;
  /** Initialization vector for the encryption */
  iv: string;
  /** Authentication tag for verified encryption */
  auth_tag: string;
  /** Timestamp when the field was encrypted */
  encrypted_at: string;
  /** Version of encryption schema for migration compatibility */
  schema_version: number;
  /** Optional field identifier for audit trails */
  field_id?: string;
  /** GDPR compliance metadata */
  gdpr_metadata?: EncryptionMetadata;
}

/**
 * Supported encryption algorithms
 */
export type EncryptionAlgorithm =
  | 'AES-256-GCM'
  | 'AES-256-CBC'
  | 'ChaCha20-Poly1305'
  | 'XSalsa20-Poly1305';

/**
 * Configuration for field-level encryption
 */
export interface FieldEncryptionConfig {
  /** Field name to encrypt */
  field_name: string;
  /** Encryption algorithm to use */
  algorithm: EncryptionAlgorithm;
  /** Whether this field is required for GDPR compliance */
  gdpr_sensitive: boolean;
  /** Whether to maintain search capability (uses deterministic encryption) */
  searchable: boolean;
  /** Custom encryption key derivation path */
  key_derivation_path?: string;
  /** Whether to compress data before encryption */
  compress: boolean;
  /** Maximum plaintext size allowed (bytes) */
  max_size?: number;
  /** Validation rules for the original data type */
  validation_rules?: FieldValidationRule[];
}

/**
 * GDPR compliance metadata for encrypted fields
 */
export interface EncryptionMetadata {
  /** Legal basis for data processing under GDPR */
  legal_basis: GDPRLegalBasis;
  /** Data retention period in days */
  retention_days: number;
  /** Data subject's consent timestamp */
  consent_given_at?: string;
  /** Whether data subject can request deletion */
  deletion_allowed: boolean;
  /** Data processing purpose */
  processing_purpose: string;
  /** Geographic location restrictions */
  location_restrictions?: string[];
  /** Automatic deletion scheduled date */
  scheduled_deletion_at?: string;
  /** Audit trail for data access */
  access_log?: DataAccessRecord[];
}

/**
 * GDPR legal basis enumeration
 */
export type GDPRLegalBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests';

/**
 * Data access record for audit trails
 */
export interface DataAccessRecord {
  /** Timestamp of access */
  accessed_at: string;
  /** User ID who accessed the data */
  accessed_by: string;
  /** Purpose of access */
  access_purpose: string;
  /** IP address of accessor */
  ip_address?: string;
  /** User agent of accessor */
  user_agent?: string;
}

/**
 * Field validation rules for encrypted data
 */
export interface FieldValidationRule {
  /** Validation rule type */
  type: 'regex' | 'length' | 'format' | 'custom';
  /** Rule parameters */
  params: Record<string, unknown>;
  /** Error message for validation failure */
  error_message: string;
}

/**
 * Configuration for legacy data migration to encrypted format
 */
export interface LegacyDataMigrationConfig {
  /** Source table name */
  source_table: string;
  /** Target table name (can be same as source) */
  target_table: string;
  /** Mapping of legacy fields to encrypted fields */
  field_mappings: LegacyFieldMapping[];
  /** Batch size for processing */
  batch_size: number;
  /** Whether to verify encryption after migration */
  verify_encryption: boolean;
  /** Whether to backup original data */
  backup_original: boolean;
  /** Custom transformation functions */
  transformations?: DataTransformation[];
  /** Migration rollback strategy */
  rollback_strategy: MigrationRollbackStrategy;
}

/**
 * Mapping configuration for legacy field migration
 */
export interface LegacyFieldMapping {
  /** Original field name */
  legacy_field: string;
  /** New encrypted field name */
  encrypted_field: string;
  /** Encryption configuration for this field */
  encryption_config: FieldEncryptionConfig;
  /** Whether the legacy field should be dropped after migration */
  drop_legacy_field: boolean;
  /** Default value if legacy field is null */
  default_value?: unknown;
}

/**
 * Data transformation function configuration
 */
export interface DataTransformation {
  /** Transformation name */
  name: string;
  /** Fields this transformation applies to */
  target_fields: string[];
  /** Transformation function type */
  type: 'normalize' | 'format' | 'validate' | 'sanitize';
  /** Transformation parameters */
  params: Record<string, unknown>;
}

/**
 * Migration rollback strategy options
 */
export type MigrationRollbackStrategy =
  | 'restore_backup'
  | 'decrypt_in_place'
  | 'manual_intervention'
  | 'no_rollback';

/**
 * Middleware options for encryption/decryption in API routes
 */
export interface EncryptionMiddlewareOptions {
  /** Fields to automatically encrypt on write operations */
  encrypt_on_write: string[];
  /** Fields to automatically decrypt on read operations */
  decrypt_on_read: string[];
  /** Whether to enable request/response logging */
  enable_logging: boolean;
  /** Error handling strategy for encryption failures */
  error_handling: EncryptionErrorStrategy;
  /** Performance monitoring configuration */
  performance_monitoring: PerformanceMonitoringConfig;
  /** Cache configuration for encryption keys */
  key_cache_config?: KeyCacheConfig;
  /** Rate limiting for encryption operations */
  rate_limiting?: RateLimitingConfig;
}

/**
 * Error handling strategy for encryption operations
 */
export type EncryptionErrorStrategy =
  | 'fail_fast'
  | 'skip_field'
  | 'use_fallback'
  | 'queue_retry';

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitoringConfig {
  /** Enable encryption operation timing */
  track_timing: boolean;
  /** Enable memory usage tracking */
  track_memory: boolean;
  /** Alert threshold for slow operations (ms) */
  slow_operation_threshold: number;
  /** Sample rate for monitoring (0.0 - 1.0) */
  sample_rate: number;
}

/**
 * Key caching configuration
 */
export interface KeyCacheConfig {
  /** Cache TTL in seconds */
  ttl: number;
  /** Maximum number of keys to cache */
  max_keys: number;
  /** Whether to use secure memory for cache */
  secure_memory: boolean;
  /** Cache eviction strategy */
  eviction_strategy: 'lru' | 'lfu' | 'ttl';
}

/**
 * Rate limiting configuration for encryption operations
 */
export interface RateLimitingConfig {
  /** Maximum operations per minute */
  operations_per_minute: number;
  /** Burst allowance */
  burst_limit: number;
  /** Rate limit scope */
  scope: 'global' | 'per_user' | 'per_ip';
}

/**
 * API response wrapper for encrypted data
 * @template T - The original data type
 */
export interface EncryptedApiResponse<T = unknown> {
  /** Whether the response contains encrypted data */
  is_encrypted: boolean;
  /** Encrypted data payload */
  data: T;
  /** Encryption metadata */
  encryption_meta?: {
    /** Fields that are encrypted in the response */
    encrypted_fields: string[];
    /** Client-side decryption required */
    client_decryption_required: boolean;
    /** Encryption schema version */
    schema_version: number;
  };
  /** Standard API response metadata */
  meta: {
    /** Request timestamp */
    timestamp: string;
    /** Request ID for tracking */
    request_id: string;
    /** API version */
    api_version: string;
  };
}

/**
 * Bulk encryption operation request
 */
export interface BulkEncryptionRequest {
  /** Table name to process */
  table_name: string;
  /** Field configurations */
  field_configs: FieldEncryptionConfig[];
  /** Processing options */
  options: {
    /** Batch size for processing */
    batch_size: number;
    /** Whether to run in dry-run mode */
    dry_run: boolean;
    /** Progress callback interval */
    progress_interval: number;
  };
}

/**
 * Bulk encryption operation response
 */
export interface BulkEncryptionResponse {
  /** Operation ID for tracking */
  operation_id: string;
  /** Current status of the operation */
  status: BulkOperationStatus;
  /** Progress information */
  progress: {
    /** Total records to process */
    total_records: number;
    /** Records processed so far */
    processed_records: number;
    /** Records failed to process */
    failed_records: number;
    /** Estimated completion time */
    estimated_completion: string;
  };
  /** Error details if any */
  errors?: OperationError[];
}

/**
 * Bulk operation status
 */
export type BulkOperationStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Operation error details
 */
export interface OperationError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Record ID where error occurred */
  record_id?: string;
  /** Field name where error occurred */
  field_name?: string;
  /** Additional error context */
  context?: Record<string, unknown>;
}

/**
 * Encrypted search query configuration
 */
export interface EncryptedSearchConfig {
  /** Search field name */
  field_name: string;
  /** Search value (will be encrypted for comparison) */
  search_value: string;
  /** Search operation type */
  operation: 'exact' | 'prefix' | 'fuzzy';
  /** Whether to use deterministic encryption for search */
  deterministic: boolean;
}

/**
 * Key rotation configuration
 */
export interface KeyRotationConfig {
  /** Current key version */
  current_version: number;
  /** New key version */
  new_version: number;
  /** Fields to rotate keys for */
  target_fields: string[];
  /** Rotation strategy */
  strategy: KeyRotationStrategy;
  /** Whether to keep old encrypted values during transition */
  keep_old_values: boolean;
  /** Rotation schedule */
  schedule?: {
    /** Start time for rotation */
    start_time: string;
    /** End time for rotation */
    end_time: string;
    /** Days of week to perform rotation */
    days_of_week: number[];
  };
}

/**
 * Key rotation strategy
 */
export type KeyRotationStrategy =
  | 'immediate'
  | 'gradual'
  | 'on_access'
  | 'scheduled';

/**
 * Audit trail configuration for encrypted data
 */
export interface EncryptionAuditConfig {
  /** Enable audit logging */
  enabled: boolean;
  /** Events to log */
  log_events: EncryptionAuditEvent[];
  /** Retention period for audit logs */
  retention_days: number;
  /** Whether to encrypt audit logs themselves */
  encrypt_audit_logs: boolean;
  /** Audit log storage location */
  storage_location: 'database' | 'file' | 'external';
}

/**
 * Encryption audit events
 */
export type EncryptionAuditEvent =
  | 'encrypt'
  | 'decrypt'
  | 'key_rotation'
  | 'access_denied'
  | 'bulk_operation'
  | 'gdpr_request';

/**
 * Type guard to check if a field is encrypted
 */
export type IsEncryptedField<T> =
  T extends EncryptedField<infer U> ? true : false;

/**
 * Utility type to extract original type from encrypted field
 */
export type DecryptedType<T> = T extends EncryptedField<infer U> ? U : T;

/**
 * Utility type for partial encryption of object fields
 */
export type PartiallyEncrypted<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: EncryptedField<T[P]>;
};

/**
 * Database table with encrypted fields
 * @example
 * ```typescript
 * interface User extends EncryptedTable {
 *   id: string;
 *   name: string; // Plain text
 *   email: EncryptedField<string>; // Encrypted
 *   phone: EncryptedField<string>; // Encrypted
 * }
 * ```
 */
export interface EncryptedTable {
  /** Standard database fields */
  id: string;
  created_at: string;
  updated_at: string;
  /** Encryption schema version for this record */
  encryption_schema_version: number;
  /** Last encryption update timestamp */
  last_encryption_update?: string;
}
