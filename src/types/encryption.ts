/**
 * WS-175 Advanced Data Encryption - Type Definitions
 * Team B - Round 1 Implementation
 *
 * Field-level encryption types for GDPR compliance
 * and wedding supplier data protection
 */

export interface EncryptionKey {
  id: string;
  keyHash: string;
  status: 'active' | 'rotating' | 'deprecated';
  algorithm: string;
  createdAt: Date;
  expiresAt: Date;
  rotationScheduledAt?: Date;
  createdBy: string;
}

export interface EncryptionResult {
  encryptedData: string;
  keyId: string;
  algorithm: string;
  iv: string;
  authTag: string;
  version: number;
}

export interface EncryptionContext {
  userId: string;
  fieldType: FieldType;
  tableName?: string;
  recordId?: string;
  timestamp?: Date;
}

export type FieldType =
  | 'email'
  | 'phone'
  | 'notes'
  | 'address'
  | 'dietary_requirements'
  | 'contact_info'
  | 'personal_details';

export interface DecryptionOptions {
  validateContext?: boolean;
  requireActiveKey?: boolean;
  auditAccess?: boolean;
}

export interface EncryptionOptions {
  keyVersion?: 'current' | 'previous';
  compressionEnabled?: boolean;
  auditEncryption?: boolean;
}

export interface EncryptedField {
  data: EncryptionResult;
  context: EncryptionContext;
  createdAt: Date;
  lastAccessedAt?: Date;
  accessCount: number;
}

export interface KeyRotationResult {
  oldKeyId: string;
  newKeyId: string;
  rotatedFields: number;
  failedFields: number;
  completedAt: Date;
  rollbackAvailable: boolean;
}

export interface SecurityAuditEvent {
  id: string;
  action: SecurityAction;
  userId: string;
  fieldType?: FieldType;
  keyId?: string;
  success: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export type SecurityAction =
  | 'FIELD_ENCRYPTED'
  | 'FIELD_DECRYPTED'
  | 'BULK_ENCRYPTION_COMPLETED'
  | 'BULK_DECRYPTION_COMPLETED'
  | 'BULK_ENCRYPTION_FAILED'
  | 'BULK_DECRYPTION_FAILED'
  | 'KEY_GENERATED'
  | 'KEY_ROTATED'
  | 'KEY_DEPRECATED'
  | 'KEY_ROTATION_SCHEDULED'
  | 'KEY_ROTATION_SCHEDULE_FAILED'
  | 'KEY_GENERATION_FAILED'
  | 'KEY_DEPRECATION_FAILED'
  | 'KEY_HEALTH_CHECK'
  | 'KEY_HEALTH_CHECK_FAILED'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'FIELD_ENCRYPTION_FAILED'
  | 'FIELD_DECRYPTION_FAILED'
  | 'FIELD_UPDATED'
  | 'FIELD_UPDATE_FAILED'
  | 'UNAUTHORIZED_ACCESS'
  | 'KEY_ROTATION_FAILED'
  | 'GDPR_DATA_REQUEST'
  | 'GDPR_DATA_DELETION'
  | 'GDPR_BULK_DATA_DELETION'
  | 'GDPR_DATA_DELETION_FAILED';

export interface GDPRComplianceRecord {
  dataSubjectId: string;
  fieldType: FieldType;
  encryptionKeyId: string;
  legalBasis: string;
  consentTimestamp?: Date;
  retentionPeriod: number;
  scheduledDeletion?: Date;
  processingPurpose: string;
}

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyLength: 256;
  ivLength: 16;
  tagLength: 16;
  saltLength: 32;
  iterations: 100000;
  rotationIntervalDays: 90;
  maxKeyAge: number;
  compressionThreshold: 1024;
  auditAllOperations: boolean;
}

export interface StorageBackend {
  encrypt(
    data: string,
    context: EncryptionContext,
    options?: EncryptionOptions,
  ): Promise<EncryptionResult>;
  decrypt(
    encryptedData: EncryptionResult,
    context: EncryptionContext,
    options?: DecryptionOptions,
  ): Promise<string>;
  rotateKeys(): Promise<KeyRotationResult>;
  getActiveKey(): Promise<EncryptionKey>;
  auditOperation(event: SecurityAuditEvent): Promise<void>;
}

export interface FieldEncryptionService {
  encryptField(
    plaintext: string,
    context: EncryptionContext,
  ): Promise<EncryptionResult>;
  decryptField(
    encryptedData: EncryptionResult,
    context: EncryptionContext,
  ): Promise<string>;
  encryptBulk(
    fields: Array<{ data: string; context: EncryptionContext }>,
  ): Promise<EncryptionResult[]>;
  decryptBulk(
    fields: Array<{ data: EncryptionResult; context: EncryptionContext }>,
  ): Promise<string[]>;
  validateEncryptedData(data: EncryptionResult): boolean;
}

export interface KeyManagementService {
  generateKey(): Promise<EncryptionKey>;
  rotateKeys(force?: boolean): Promise<KeyRotationResult>;
  getKey(keyId: string): Promise<EncryptionKey | null>;
  getActiveKey(): Promise<EncryptionKey>;
  scheduleRotation(keyId: string, scheduleDate: Date): Promise<void>;
  deprecateKey(keyId: string): Promise<void>;
  validateKeyHealth(): Promise<boolean>;
}

export interface SecureStorageService {
  store(
    tableName: string,
    recordId: string,
    fieldName: string,
    encryptedData: EncryptionResult,
  ): Promise<void>;
  retrieve(
    tableName: string,
    recordId: string,
    fieldName: string,
  ): Promise<EncryptionResult | null>;
  update(
    tableName: string,
    recordId: string,
    fieldName: string,
    encryptedData: EncryptionResult,
  ): Promise<void>;
  delete(
    tableName: string,
    recordId: string,
    fieldName?: string,
  ): Promise<void>;
  bulkStore(
    operations: Array<{
      tableName: string;
      recordId: string;
      fieldName: string;
      encryptedData: EncryptionResult;
    }>,
  ): Promise<void>;
  search(criteria: {
    tableName?: string;
    fieldType?: FieldType;
    userId?: string;
    dateRange?: { from: Date; to: Date };
  }): Promise<EncryptedField[]>;
}

export class EncryptionError extends Error {
  code: string;
  context?: EncryptionContext;
  keyId?: string;
  operation?: string;
  recoverable: boolean;
  cause?: unknown;

  constructor(
    message: string,
    options: {
      code: string;
      context?: EncryptionContext;
      keyId?: string;
      operation?: string;
      recoverable?: boolean;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = 'EncryptionError';
    this.code = options.code;
    this.context = options.context;
    this.keyId = options.keyId;
    this.operation = options.operation;
    this.recoverable = options.recoverable ?? false;
    this.cause = options.cause;
  }
}

export interface EncryptionMetrics {
  totalEncryptions: number;
  totalDecryptions: number;
  failedOperations: number;
  averageEncryptionTime: number;
  averageDecryptionTime: number;
  activeKeys: number;
  keysScheduledForRotation: number;
  gdprRequests: number;
  complianceScore: number;
}

// Database table interfaces for migrations
export interface EncryptionKeysTable {
  id: string;
  key_hash: string;
  status: string;
  algorithm: string;
  created_at: string;
  expires_at: string;
  rotation_scheduled_at?: string;
  created_by: string;
}

export interface EncryptionAuditTable {
  id: string;
  action: string;
  user_id: string;
  field_type?: string;
  key_id?: string;
  success: boolean;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
}

export interface GDPRComplianceTable {
  id: string;
  data_subject_id: string;
  field_type: string;
  encryption_key_id: string;
  legal_basis: string;
  consent_timestamp?: string;
  retention_period: number;
  scheduled_deletion?: string;
  processing_purpose: string;
  created_at: string;
  updated_at: string;
}

// Frontend Component Types for WS-175 Team A Implementation

export type EncryptionStatusLevel =
  | 'none'
  | 'basic'
  | 'standard'
  | 'high'
  | 'maximum';
export type EncryptionDisplayStatus =
  | 'encrypted'
  | 'decrypted'
  | 'pending'
  | 'error'
  | 'loading';

// Encryption Status Indicator Component Props
export interface EncryptionStatusIndicatorProps {
  status: EncryptionDisplayStatus;
  level: EncryptionStatusLevel;
  fieldName?: string;
  algorithm?: string;
  lastEncrypted?: Date;
  keyId?: string;
  complianceLevel?: 'GDPR' | 'PCI' | 'HIPAA' | 'SOX';
  showDetails?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'inline' | 'detailed';
  interactive?: boolean;
  onStatusClick?: () => void;
}

// Encryption Key Manager Component Props
export interface EncryptionKeyManagerProps {
  keys: EncryptionKey[];
  currentKeyId?: string;
  onKeyRotate: (keyId: string) => Promise<void>;
  onKeyRevoke: (keyId: string) => Promise<void>;
  onKeyCreate: (keyConfig: Partial<EncryptionKey>) => Promise<void>;
  readOnly?: boolean;
  showAdvanced?: boolean;
  className?: string;
  loading?: boolean;
  error?: string;
}

// Secure Data Display Component Props
export interface SecureDataDisplayProps<T = any> {
  encryptedData?: EncryptionResult;
  plainData?: T;
  fieldName: string;
  fieldType: FieldType;
  onEncrypt?: (data: T) => Promise<EncryptionResult>;
  onDecrypt?: (encryptedData: EncryptionResult) => Promise<T>;
  showEncryptionStatus?: boolean;
  allowToggle?: boolean;
  readOnly?: boolean;
  redactSensitive?: boolean;
  maskPattern?: string;
  className?: string;
  loading?: boolean;
  error?: string;
}

// Key Rotation Policy Interface for UI
export interface KeyRotationPolicy {
  enabled: boolean;
  rotationIntervalDays: number;
  warningDays: number;
  autoRotate: boolean;
  retainOldKeys: boolean;
  maxKeyAge: number;
}

// Extended Key Interface for UI Display
export interface UIEncryptionKey extends EncryptionKey {
  displayName?: string;
  usageCount?: number;
  lastUsed?: Date;
  healthScore?: number;
  rotationProgress?: number;
  isExpiring?: boolean;
  canRotate?: boolean;
  canRevoke?: boolean;
}

// Component Event Handlers
export interface EncryptionEventHandlers {
  onEncryptionChange?: (
    status: EncryptionDisplayStatus,
    level: EncryptionStatusLevel,
  ) => void;
  onKeyRotation?: (oldKeyId: string, newKeyId: string) => void;
  onEncryptionError?: (error: EncryptionError) => void;
  onDecryptionError?: (error: EncryptionError) => void;
  onStatusUpdate?: (fieldName: string, status: EncryptionDisplayStatus) => void;
}

// Encryption Loading States
export interface EncryptionLoadingState {
  isEncrypting?: boolean;
  isDecrypting?: boolean;
  isRotatingKey?: boolean;
  isValidating?: boolean;
  progress?: number;
  statusMessage?: string;
}

// Wedding-specific UI types
export interface WeddingDataEncryptionConfig {
  guestPersonalInfo: {
    required: boolean;
    level: EncryptionStatusLevel;
    fields: string[];
  };
  vendorContacts: {
    required: boolean;
    level: EncryptionStatusLevel;
    fields: string[];
  };
  paymentInfo: {
    required: boolean;
    level: EncryptionStatusLevel;
    fields: string[];
  };
  privateNotes: {
    required: boolean;
    level: EncryptionStatusLevel;
    fields: string[];
  };
}

// Toast/Notification Types for Encryption Events
export interface EncryptionNotification {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action?: 'encrypt' | 'decrypt' | 'rotate' | 'revoke';
  fieldName?: string;
  keyId?: string;
  timestamp: Date;
  persistent?: boolean;
}
