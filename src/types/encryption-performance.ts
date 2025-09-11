/**
 * WS-175 Advanced Data Encryption - Performance Types
 * TypeScript interfaces for encryption performance optimization system
 */

import type { z } from 'zod';

// Base encryption performance metrics
export interface EncryptionMetrics {
  operation: EncryptionOperation;
  operationId: string;
  duration: number; // milliseconds
  inputSize: number; // bytes
  outputSize: number; // bytes
  throughput: number; // bytes per second
  timestamp: Date;
  cacheHit?: boolean;
  workerUsed?: boolean;
}

// Supported encryption operations
export type EncryptionOperation =
  | 'encrypt'
  | 'decrypt'
  | 'bulk_encrypt'
  | 'bulk_decrypt'
  | 'key_derivation'
  | 'cache_lookup';

// Cache configuration and status
export interface CacheConfig {
  maxSize: number; // Maximum cache entries
  ttlMs: number; // Time to live in milliseconds
  maxKeySize: number; // Maximum key size in bytes
  compressionEnabled: boolean;
  encryptionAlgorithm: string;
  keyRotationIntervalMs: number;
}

export interface CacheEntry {
  key: string;
  encryptedValue: Buffer;
  derivedKey: Buffer;
  metadata: EncryptionMetadata;
  accessCount: number;
  lastAccessed: Date;
  createdAt: Date;
  expiresAt: Date;
}

export interface CacheMetrics {
  hitRate: number; // 0-1
  missRate: number; // 0-1
  evictionCount: number;
  totalEntries: number;
  memoryUsageBytes: number;
  avgAccessTime: number; // milliseconds
  hotKeys: string[]; // Most frequently accessed keys
}

// Bulk operation interfaces
export interface BulkEncryptionRequest {
  fields: EncryptionField[];
  batchSize: number;
  useWorkers: boolean;
  priority: BulkOperationPriority;
  callback?: (progress: BulkOperationProgress) => void;
}

export interface EncryptionField {
  fieldId: string;
  fieldName: string;
  value: string | Buffer;
  encryptionLevel: EncryptionLevel;
  metadata?: EncryptionMetadata;
}

export type EncryptionLevel =
  | 'standard' // AES-256-GCM
  | 'high' // AES-256-GCM with additional key stretching
  | 'maximum'; // ChaCha20-Poly1305 with enhanced security

export type BulkOperationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface BulkOperationProgress {
  operationId: string;
  totalFields: number;
  processedFields: number;
  failedFields: number;
  progress: number; // 0-1
  averageTimePerField: number; // milliseconds
  estimatedTimeRemaining: number; // milliseconds
  errors: EncryptionError[];
}

export interface BulkEncryptionResult {
  operationId: string;
  results: EncryptionResult[];
  metrics: BulkOperationMetrics;
  errors: EncryptionError[];
  completedAt: Date;
}

export interface EncryptionResult {
  fieldId: string;
  success: boolean;
  encryptedValue?: Buffer;
  error?: EncryptionError;
  metrics: EncryptionMetrics;
}

// Performance monitoring interfaces
export interface PerformanceThreshold {
  operation: EncryptionOperation;
  maxDurationMs: number;
  maxMemoryUsageMB: number;
  minThroughputBytesPerSec: number;
  alertOnViolation: boolean;
}

export interface PerformanceAlert {
  alertId: string;
  operation: EncryptionOperation;
  threshold: PerformanceThreshold;
  actualValue: number;
  expectedValue: number;
  severity: AlertSeverity;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface SystemPerformanceSnapshot {
  timestamp: Date;
  cpuUsage: number; // 0-1
  memoryUsage: number; // bytes
  activeOperations: number;
  queuedOperations: number;
  cacheMetrics: CacheMetrics;
  throughputMetrics: ThroughputMetrics;
}

export interface ThroughputMetrics {
  operationsPerSecond: number;
  bytesPerSecond: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number; // 0-1
}

// Security configuration interfaces
export interface SecurityConfig {
  encryption: EncryptionSecurityConfig;
  cache: CacheSecurityConfig;
  performance: PerformanceSecurityConfig;
  compliance: ComplianceConfig;
}

export interface EncryptionSecurityConfig {
  defaultAlgorithm: string;
  keyDerivationIterations: number;
  saltSize: number;
  keyRotationPolicy: KeyRotationPolicy;
  allowedAlgorithms: string[];
  requireIntegrityCheck: boolean;
  auditLogging: boolean;
}

export interface CacheSecurityConfig {
  encryptCacheAtRest: boolean;
  memoryProtection: boolean;
  clearOnExit: boolean;
  maxCacheLifetimeMs: number;
  secureWipeOnEviction: boolean;
  accessLogging: boolean;
}

export interface PerformanceSecurityConfig {
  maxConcurrentOperations: number;
  rateLimitPerMinute: number;
  timeoutMs: number;
  resourceLimits: ResourceLimits;
  emergencyShutdownThresholds: EmergencyThresholds;
}

export interface KeyRotationPolicy {
  enabled: boolean;
  intervalMs: number;
  gracePeriodMs: number;
  automaticRotation: boolean;
  notificationWebhook?: string;
}

export interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuUsage: number; // 0-1
  maxDiskUsageMB: number;
  maxOpenFiles: number;
}

export interface EmergencyThresholds {
  memoryUsageThreshold: number; // 0-1
  cpuUsageThreshold: number; // 0-1
  errorRateThreshold: number; // 0-1
  responseTimeThresholdMs: number;
}

export interface ComplianceConfig {
  fipsCompliance: boolean;
  gdprCompliance: boolean;
  auditTrail: boolean;
  dataRetentionDays: number;
  encryptionStandards: string[];
}

// Wedding-specific interfaces
export interface WeddingDataEncryption {
  weddingId: string;
  guestRecords: EncryptedGuestData[];
  vendorInformation: EncryptedVendorData[];
  sensitiveNotes: EncryptedNote[];
  totalRecords: number;
  encryptionLevel: EncryptionLevel;
  performanceRequirements: WeddingPerformanceRequirements;
}

export interface EncryptedGuestData {
  guestId: string;
  personalInfo: Buffer; // Encrypted JSON
  dietaryRestrictions: Buffer; // Encrypted JSON
  contactInfo: Buffer; // Encrypted JSON
  accessibilityNeeds: Buffer; // Encrypted JSON
  encryptionMetadata: EncryptionMetadata;
}

export interface EncryptedVendorData {
  vendorId: string;
  contactDetails: Buffer; // Encrypted JSON
  contractInfo: Buffer; // Encrypted JSON
  paymentDetails: Buffer; // Encrypted JSON
  encryptionMetadata: EncryptionMetadata;
}

export interface EncryptedNote {
  noteId: string;
  content: Buffer; // Encrypted content
  authorId: string;
  encryptionMetadata: EncryptionMetadata;
}

export interface WeddingPerformanceRequirements {
  maxEncryptionLatencyMs: number; // <10ms per operation
  batchSizeOptimization: boolean;
  cacheGuestData: boolean;
  priorityOperations: EncryptionOperation[];
  peakUsagePatterns: PeakUsagePattern[];
}

export interface PeakUsagePattern {
  description: string;
  expectedOperationsPerSecond: number;
  durationMinutes: number;
  criticalityLevel: BulkOperationPriority;
}

// Metadata and error handling
export interface EncryptionMetadata {
  algorithm: string;
  keyVersion: string;
  encryptionTime: Date;
  integrityHash: string;
  compressionUsed?: boolean;
  customHeaders?: Record<string, string>;
}

export interface EncryptionError {
  errorId: string;
  operation: EncryptionOperation;
  code: EncryptionErrorCode;
  message: string;
  fieldId?: string;
  timestamp: Date;
  recoverable: boolean;
  retryCount?: number;
  stackTrace?: string;
}

export type EncryptionErrorCode =
  | 'INVALID_INPUT'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'KEY_DERIVATION_FAILED'
  | 'CACHE_ERROR'
  | 'TIMEOUT'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'WORKER_UNAVAILABLE'
  | 'INTEGRITY_CHECK_FAILED'
  | 'ALGORITHM_NOT_SUPPORTED'
  | 'CONFIGURATION_ERROR';

// Operation result types
export interface BulkOperationMetrics {
  operationId: string;
  totalDurationMs: number;
  averageFieldDurationMs: number;
  throughputBytesPerSecond: number;
  cacheHitRate: number;
  workerUtilization: number;
  memoryPeakUsageMB: number;
  errorsCount: number;
  successRate: number; // 0-1
}

// Service interfaces
export interface EncryptionCacheService {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, value: Buffer, metadata: EncryptionMetadata): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getMetrics(): CacheMetrics;
  configure(config: CacheConfig): void;
}

export interface BulkEncryptionService {
  encryptBatch(request: BulkEncryptionRequest): Promise<BulkEncryptionResult>;
  decryptBatch(request: BulkEncryptionRequest): Promise<BulkEncryptionResult>;
  cancelOperation(operationId: string): Promise<boolean>;
  getOperationStatus(
    operationId: string,
  ): Promise<BulkOperationProgress | null>;
}

export interface PerformanceMonitorService {
  recordMetrics(metrics: EncryptionMetrics): void;
  getSnapshot(): SystemPerformanceSnapshot;
  checkThresholds(): PerformanceAlert[];
  configureThresholds(thresholds: PerformanceThreshold[]): void;
  exportMetrics(format: 'json' | 'csv' | 'prometheus'): string;
}

// Validation schemas (will be used by Zod)
export type EncryptionFieldSchema = z.ZodSchema<EncryptionField>;
export type BulkEncryptionRequestSchema = z.ZodSchema<BulkEncryptionRequest>;
export type CacheConfigSchema = z.ZodSchema<CacheConfig>;
export type SecurityConfigSchema = z.ZodSchema<SecurityConfig>;
export type WeddingDataEncryptionSchema = z.ZodSchema<WeddingDataEncryption>;
