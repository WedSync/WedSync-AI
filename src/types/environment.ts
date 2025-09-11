/**
 * Environment Management Type Definitions for WedSync Wedding Platform
 *
 * Comprehensive TypeScript interfaces for environment monitoring, secret management,
 * feature flags, compliance validation, and audit logging with wedding-specific context.
 *
 * @fileoverview Central type definitions for environment management system
 * @author WedSync Development Team
 * @since 2025-01-20
 */

import { z } from 'zod';

// ============================================================================
// CORE ENVIRONMENT TYPES
// ============================================================================

/**
 * Environment types supported by the wedding platform
 */
export type Environment = 'production' | 'staging' | 'development';

/**
 * Service health status enumeration
 */
export type ServiceHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'down'
  | 'maintenance';

/**
 * Priority levels for environment events and alerts
 */
export type Priority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Wedding industry supplier types for context and filtering
 */
export type SupplierType =
  | 'photographer'
  | 'venue'
  | 'caterer'
  | 'florist'
  | 'dj'
  | 'band'
  | 'planner'
  | 'videographer'
  | 'makeup'
  | 'transport'
  | 'other';

/**
 * Wedding timeline phases for context-aware monitoring
 */
export type WeddingPhase = 'planning' | 'week_of' | 'day_of' | 'post_wedding';

/**
 * User roles in the wedding platform system
 */
export type UserRole = 'admin' | 'supplier' | 'couple' | 'venue' | 'system';

// ============================================================================
// WEDDING CONTEXT TYPES
// ============================================================================

/**
 * Wedding-specific context for environment events and monitoring
 */
export interface WeddingContext {
  /** Wedding date if applicable */
  weddingDate?: Date;

  /** Whether this is a Saturday wedding (critical day) */
  isSaturdayWedding?: boolean;

  /** Couple information for context */
  coupleId?: string;

  /** Couple names for display purposes */
  coupleNames?: string;

  /** Wedding venue information */
  venueId?: string;

  /** Venue name for context */
  venueName?: string;

  /** Supplier involved in the operation */
  supplierId?: string;

  /** Supplier business name */
  supplierName?: string;

  /** Type of supplier for categorization */
  supplierType?: SupplierType;

  /** Whether guest data is involved (privacy implications) */
  guestDataAccessed?: boolean;

  /** Number of guest records affected */
  guestRecordCount?: number;

  /** Current wedding timeline phase */
  weddingPhase?: WeddingPhase;

  /** Critical period indicator (within 7 days of wedding) */
  isCriticalPeriod?: boolean;

  /** Wedding budget amount for payment context */
  weddingBudget?: number;

  /** Number of vendors involved */
  vendorCount?: number;
}

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

/**
 * Environment configuration interface
 */
export interface EnvironmentConfig {
  /** Environment identifier */
  id: string;

  /** Environment name */
  name: string;

  /** Environment type */
  type: Environment;

  /** Environment description */
  description: string;

  /** Current health status */
  status: ServiceHealthStatus;

  /** Environment URL */
  url: string;

  /** Configuration variables */
  variables: Record<string, string>;

  /** Services running in this environment */
  services: ServiceConfig[];

  /** Wedding-specific configuration */
  weddingConfig?: WeddingEnvironmentConfig;

  /** Last updated timestamp */
  lastUpdated: Date;

  /** Whether environment is active */
  isActive: boolean;

  /** Maintenance mode status */
  maintenanceMode: boolean;

  /** Deployment information */
  deployment?: DeploymentInfo;
}

/**
 * Wedding-specific environment configuration
 */
export interface WeddingEnvironmentConfig {
  /** Saturday deployment protection enabled */
  saturdayProtection: boolean;

  /** Wedding season awareness (April-October) */
  weddingSeasonMode: boolean;

  /** Maximum concurrent weddings */
  maxConcurrentWeddings: number;

  /** Guest data retention period in days */
  guestDataRetentionDays: number;

  /** Photo storage duration in years */
  photoStorageDurationYears: number;

  /** Payment processing settings */
  paymentConfig: {
    provider: 'stripe' | 'other';
    webhookUrl: string;
    currency: string;
    processingFeesIncluded: boolean;
  };

  /** Communication settings */
  communicationConfig: {
    emailProvider: 'resend' | 'sendgrid' | 'other';
    smsProvider: 'twilio' | 'other';
    notificationChannels: string[];
  };
}

/**
 * Service configuration within an environment
 */
export interface ServiceConfig {
  /** Service identifier */
  id: string;

  /** Service name */
  name: string;

  /** Service display name */
  displayName: string;

  /** Current health status */
  status: ServiceHealthStatus;

  /** Service URL */
  url: string;

  /** Health check endpoint */
  healthCheckUrl: string;

  /** Service version */
  version: string;

  /** Wedding criticality rating */
  weddingCriticality: Priority;

  /** Service dependencies */
  dependencies: string[];

  /** Performance metrics */
  metrics: ServiceMetrics;

  /** Last health check */
  lastHealthCheck: Date;

  /** Wedding context for this service */
  weddingContext: string;
}

/**
 * Service performance metrics
 */
export interface ServiceMetrics {
  /** Response time in milliseconds */
  responseTime: number;

  /** Error rate percentage */
  errorRate: number;

  /** Request rate per second */
  requestRate: number;

  /** CPU usage percentage */
  cpuUsage: number;

  /** Memory usage percentage */
  memoryUsage: number;

  /** Uptime percentage */
  uptime: number;

  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Deployment information
 */
export interface DeploymentInfo {
  /** Deployment identifier */
  deploymentId: string;

  /** Deployment version */
  version: string;

  /** Git commit hash */
  commit: string;

  /** Deployment timestamp */
  deployedAt: Date;

  /** Deployed by user */
  deployedBy: string;

  /** Deployment status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';

  /** Wedding safety check passed */
  weddingSafetyCheck: boolean;

  /** Saturday deployment blocked */
  saturdayBlocked?: boolean;
}

// ============================================================================
// SECRET MANAGEMENT TYPES
// ============================================================================

/**
 * Secret information with expiration and rotation tracking
 */
export interface SecretInfo {
  /** Unique secret identifier */
  id: string;

  /** Service name (Stripe, Twilio, OpenAI, etc.) */
  service: string;

  /** Secret type classification */
  type: SecretType;

  /** Human-readable description */
  description: string;

  /** Expiration date */
  expiresAt: Date;

  /** Last rotation date */
  lastRotated: Date;

  /** Criticality for wedding operations */
  criticality: Priority;

  /** Essential for live wedding operations */
  weddingCritical: boolean;

  /** Environment where secret is used */
  environment: Environment;

  /** Days before expiration to show warnings */
  warningThreshold: number;

  /** Auto-rotation capability */
  canAutoRotate: boolean;

  /** Current status */
  status: SecretStatus;

  /** Rotation history */
  rotationHistory: RotationRecord[];

  /** Wedding contexts where this secret is used */
  weddingUsage?: WeddingSecretUsage;
}

/**
 * Secret type enumeration
 */
export type SecretType =
  | 'api_key'
  | 'webhook_secret'
  | 'certificate'
  | 'oauth_token'
  | 'database_password';

/**
 * Secret status enumeration
 */
export type SecretStatus =
  | 'healthy'
  | 'warning'
  | 'critical'
  | 'expired'
  | 'rotating';

/**
 * Wedding-specific secret usage context
 */
export interface WeddingSecretUsage {
  /** Payment processing usage */
  paymentProcessing: boolean;

  /** Guest communication usage */
  guestCommunication: boolean;

  /** Vendor integration usage */
  vendorIntegration: boolean;

  /** Photo/media storage usage */
  mediaStorage: boolean;

  /** Wedding data access usage */
  weddingDataAccess: boolean;

  /** Estimated weddings affected if secret fails */
  estimatedWeddingsAffected: number;
}

/**
 * Secret rotation record for audit purposes
 */
export interface RotationRecord {
  /** Rotation record identifier */
  id: string;

  /** Associated secret identifier */
  secretId: string;

  /** Rotation timestamp */
  rotatedAt: Date;

  /** Who/what performed the rotation */
  rotatedBy: string;

  /** User role of rotator */
  rotatorRole: UserRole;

  /** Rotation method */
  method: 'manual' | 'automatic' | 'emergency';

  /** Success status */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Additional notes */
  notes?: string;

  /** Wedding impact assessment */
  weddingImpact?: string;

  /** Saturday rotation flag */
  wasSaturdayRotation: boolean;
}

// ============================================================================
// FEATURE FLAG TYPES
// ============================================================================

/**
 * Feature flag configuration
 */
export interface FeatureFlag {
  /** Feature flag identifier */
  id: string;

  /** Feature flag name */
  name: string;

  /** Feature description */
  description: string;

  /** Flag enabled status */
  enabled: boolean;

  /** Environment-specific overrides */
  environmentOverrides: Record<Environment, boolean>;

  /** Rollout configuration */
  rollout: FeatureFlagRollout;

  /** Target audience */
  targeting: FeatureFlagTargeting;

  /** Wedding-specific settings */
  weddingSettings: WeddingFeatureSettings;

  /** Creation and modification dates */
  createdAt: Date;
  updatedAt: Date;

  /** Flag owner */
  owner: string;

  /** Flag status */
  status: FeatureFlagStatus;

  /** Associated tags */
  tags: string[];
}

/**
 * Feature flag rollout configuration
 */
export interface FeatureFlagRollout {
  /** Rollout type */
  type: 'full' | 'percentage' | 'targeted' | 'scheduled';

  /** Rollout percentage (0-100) */
  percentage: number;

  /** Rollout schedule */
  schedule?: {
    startDate: Date;
    endDate?: Date;
    timeZone: string;
  };

  /** Rollout metrics */
  metrics: RolloutMetrics;

  /** Wedding season restrictions */
  weddingSeasonRestrictions: boolean;

  /** Saturday deployment blocked */
  saturdayBlocked: boolean;
}

/**
 * Feature flag targeting rules
 */
export interface FeatureFlagTargeting {
  /** User segments to target */
  userSegments: string[];

  /** Supplier types to target */
  supplierTypes: SupplierType[];

  /** Geographic targeting */
  geographicRules?: {
    countries: string[];
    regions: string[];
    excludedCountries: string[];
  };

  /** Wedding-specific targeting */
  weddingTargeting?: {
    weddingPhases: WeddingPhase[];
    minBudget?: number;
    maxBudget?: number;
    vendorCountRange?: [number, number];
  };
}

/**
 * Wedding-specific feature flag settings
 */
export interface WeddingFeatureSettings {
  /** Affects wedding day operations */
  affectsWeddingDay: boolean;

  /** Affects payment processing */
  affectsPayments: boolean;

  /** Affects guest data */
  affectsGuestData: boolean;

  /** Critical for wedding operations */
  weddingCritical: boolean;

  /** Requires wedding season approval */
  requiresWeddingSeasonApproval: boolean;

  /** Saturday testing allowed */
  saturdayTestingAllowed: boolean;
}

/**
 * Feature flag status enumeration
 */
export type FeatureFlagStatus = 'active' | 'paused' | 'completed' | 'archived';

/**
 * Rollout metrics for feature flags
 */
export interface RolloutMetrics {
  /** Total users exposed */
  totalExposed: number;

  /** Total users enabled */
  totalEnabled: number;

  /** Conversion metrics */
  conversionRate: number;

  /** Error rate with flag enabled */
  errorRate: number;

  /** Performance impact */
  performanceImpact: number;

  /** Wedding-specific metrics */
  weddingMetrics?: {
    weddingsAffected: number;
    suppliersAffected: number;
    guestDataAccessed: number;
    paymentTransactions: number;
  };

  /** Last updated */
  lastUpdated: Date;
}

// ============================================================================
// COMPLIANCE & AUDIT TYPES
// ============================================================================

/**
 * Compliance framework configuration
 */
export interface ComplianceFramework {
  /** Framework identifier */
  id: string;

  /** Framework name (GDPR, SOC2, PCI DSS, etc.) */
  name: string;

  /** Framework description */
  description: string;

  /** Framework category */
  category: 'privacy' | 'security' | 'payment' | 'industry';

  /** Priority level */
  priority: Priority;

  /** Wedding industry context */
  weddingContext: string;

  /** Compliance rules */
  rules: ComplianceRule[];

  /** Current compliance score */
  score: number;

  /** Last assessment date */
  lastAssessment: Date;

  /** Next assessment due */
  nextAssessmentDue: Date;
}

/**
 * Individual compliance rule
 */
export interface ComplianceRule {
  /** Rule identifier */
  id: string;

  /** Associated framework */
  frameworkId: string;

  /** Rule title */
  title: string;

  /** Rule description */
  description: string;

  /** Compliance requirement */
  requirement: string;

  /** Rule category */
  category: string;

  /** Severity level */
  severity: Priority;

  /** Current compliance status */
  isCompliant: boolean;

  /** Last check timestamp */
  lastChecked: Date;

  /** Wedding-specific rule */
  weddingSpecific: boolean;

  /** Remediation steps */
  remediation?: string[];

  /** Automated check available */
  hasAutomatedCheck: boolean;

  /** Wedding impact description */
  weddingImpact?: string;
}

/**
 * Compliance violation record
 */
export interface ComplianceViolation {
  /** Violation identifier */
  id: string;

  /** Associated rule */
  ruleId: string;

  /** Associated framework */
  frameworkId: string;

  /** Violation title */
  title: string;

  /** Violation description */
  description: string;

  /** Severity level */
  severity: Priority;

  /** Business impact */
  impact: string;

  /** Remediation steps */
  remediation: string[];

  /** Estimated fix time */
  estimatedFixTime: string;

  /** Wedding-specific impact */
  weddingImpact: string;

  /** Detection timestamp */
  detectedAt: Date;

  /** Resolution status */
  status: ViolationStatus;

  /** Resolved timestamp */
  resolvedAt?: Date;

  /** Assigned to user */
  assignedTo?: string;
}

/**
 * Violation status enumeration
 */
export type ViolationStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'accepted_risk'
  | 'false_positive';

/**
 * Comprehensive compliance report
 */
export interface ComplianceReport {
  /** Report identifier */
  id: string;

  /** Report generation timestamp */
  generatedAt: Date;

  /** Overall compliance score */
  overallScore: number;

  /** Framework-specific scores */
  frameworkScores: Record<string, number>;

  /** Total rules evaluated */
  totalRules: number;

  /** Compliant rules count */
  compliantRules: number;

  /** Active violations */
  violations: ComplianceViolation[];

  /** Recommendations */
  recommendations: string[];

  /** Next assessment due date */
  nextAssessmentDue: Date;

  /** Wedding season readiness */
  weddingSeasonReadiness: 'ready' | 'partial' | 'not_ready';

  /** Executive summary */
  executiveSummary: string;

  /** Risk assessment */
  riskAssessment: {
    highRiskAreas: string[];
    mitigationPlan: string[];
    businessImpact: string;
  };
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

/**
 * Comprehensive audit log entry
 */
export interface AuditLogEntry {
  /** Unique log entry identifier */
  id: string;

  /** Event timestamp */
  timestamp: Date;

  /** Type of action performed */
  action: AuditAction;

  /** Event severity */
  severity: Priority;

  /** User who performed the action */
  userId?: string;

  /** User display name */
  userName?: string;

  /** User role */
  userRole?: UserRole;

  /** Action description */
  description: string;

  /** Detailed event data */
  details: Record<string, unknown>;

  /** Wedding context if applicable */
  weddingContext?: WeddingContext;

  /** Request metadata */
  requestMetadata: RequestMetadata;

  /** Environment where action occurred */
  environment: Environment;

  /** Operation duration */
  duration?: number;

  /** Error information */
  error?: ErrorInfo;

  /** Correlation IDs for related events */
  correlationIds?: string[];

  /** Event tags for categorization */
  tags: string[];

  /** Event source */
  source: string;
}

/**
 * Audit action types
 */
export type AuditAction =
  | 'system_change'
  | 'user_action'
  | 'security_event'
  | 'environment_config'
  | 'payment_change'
  | 'wedding_data_access'
  | 'vendor_integration'
  | 'compliance_check'
  | 'secret_rotation'
  | 'feature_flag_change';

/**
 * Request metadata for audit logs
 */
export interface RequestMetadata {
  /** Client IP address */
  ipAddress: string;

  /** User agent string */
  userAgent: string;

  /** Session identifier */
  sessionId: string;

  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /** API endpoint */
  endpoint?: string;

  /** HTTP status code */
  statusCode?: number;

  /** Request headers */
  headers?: Record<string, string>;

  /** Geographic information */
  geographic?: {
    country: string;
    region: string;
    city: string;
  };
}

/**
 * Error information for audit logs
 */
export interface ErrorInfo {
  /** Error message */
  message: string;

  /** Error code */
  code?: string;

  /** Stack trace */
  stackTrace?: string;

  /** Error category */
  category:
    | 'validation'
    | 'authentication'
    | 'authorization'
    | 'system'
    | 'business_logic'
    | 'integration';

  /** Wedding impact */
  weddingImpact?: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Zod schema for environment configuration validation
 */
export const EnvironmentConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['production', 'staging', 'development']),
  description: z.string(),
  status: z.enum(['healthy', 'degraded', 'down', 'maintenance']),
  url: z.string().url(),
  variables: z.record(z.string()),
  isActive: z.boolean(),
  maintenanceMode: z.boolean(),
});

/**
 * Zod schema for secret information validation
 */
export const SecretInfoSchema = z.object({
  id: z.string().min(1),
  service: z.string().min(1),
  type: z.enum([
    'api_key',
    'webhook_secret',
    'certificate',
    'oauth_token',
    'database_password',
  ]),
  description: z.string(),
  expiresAt: z.date(),
  lastRotated: z.date(),
  criticality: z.enum(['critical', 'high', 'medium', 'low']),
  weddingCritical: z.boolean(),
  environment: z.enum(['production', 'staging', 'development']),
  warningThreshold: z.number().min(1).max(365),
  canAutoRotate: z.boolean(),
});

/**
 * Zod schema for feature flag validation
 */
export const FeatureFlagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  enabled: z.boolean(),
  environmentOverrides: z.record(z.boolean()),
  tags: z.array(z.string()),
});

/**
 * Zod schema for wedding context validation
 */
export const WeddingContextSchema = z.object({
  weddingDate: z.date().optional(),
  isSaturdayWedding: z.boolean().optional(),
  coupleId: z.string().optional(),
  coupleNames: z.string().optional(),
  venueId: z.string().optional(),
  venueName: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  supplierType: z
    .enum([
      'photographer',
      'venue',
      'caterer',
      'florist',
      'dj',
      'band',
      'planner',
      'videographer',
      'makeup',
      'transport',
      'other',
    ])
    .optional(),
  guestDataAccessed: z.boolean().optional(),
  guestRecordCount: z.number().min(0).optional(),
  weddingPhase: z
    .enum(['planning', 'week_of', 'day_of', 'post_wedding'])
    .optional(),
  isCriticalPeriod: z.boolean().optional(),
});

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  /** Success status */
  success: boolean;

  /** Response data */
  data?: T;

  /** Error message */
  error?: string;

  /** Error code */
  code?: string;

  /** Response metadata */
  metadata?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T> {
  /** Items in current page */
  items: T[];

  /** Total number of items */
  total: number;

  /** Current page number */
  page: number;

  /** Items per page */
  limit: number;

  /** Total number of pages */
  totalPages: number;

  /** Has next page */
  hasNext: boolean;

  /** Has previous page */
  hasPrevious: boolean;
}

/**
 * Search filter interface
 */
export interface SearchFilter<T> {
  /** Search query */
  query?: string;

  /** Field-specific filters */
  filters?: Partial<T>;

  /** Sort configuration */
  sort?: {
    field: keyof T;
    direction: 'asc' | 'desc';
  };

  /** Pagination */
  pagination?: {
    page: number;
    limit: number;
  };

  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Wedding-specific search filter
 */
export interface WeddingSearchFilter<T> extends SearchFilter<T> {
  /** Wedding-specific filters */
  weddingFilters?: {
    saturdayWeddingsOnly?: boolean;
    criticalPeriodOnly?: boolean;
    supplierTypes?: SupplierType[];
    weddingPhases?: WeddingPhase[];
    guestDataAccessOnly?: boolean;
  };
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

// Export all interfaces and types for component consumption
export type {
  Environment,
  ServiceHealthStatus,
  Priority,
  SupplierType,
  WeddingPhase,
  UserRole,
  WeddingContext,
  EnvironmentConfig,
  WeddingEnvironmentConfig,
  ServiceConfig,
  ServiceMetrics,
  DeploymentInfo,
  SecretInfo,
  SecretType,
  SecretStatus,
  WeddingSecretUsage,
  RotationRecord,
  FeatureFlag,
  FeatureFlagRollout,
  FeatureFlagTargeting,
  WeddingFeatureSettings,
  FeatureFlagStatus,
  RolloutMetrics,
  ComplianceFramework,
  ComplianceRule,
  ComplianceViolation,
  ViolationStatus,
  ComplianceReport,
  AuditLogEntry,
  AuditAction,
  RequestMetadata,
  ErrorInfo,
  ApiResponse,
  PaginatedResponse,
  SearchFilter,
  WeddingSearchFilter,
};

// Validation schemas are already exported above with their definitions

// Default export for convenience
export default {
  // Type guards and utility functions can be added here
  isWeddingSaturday: (date: Date): boolean => date.getDay() === 6,
  isWeddingSeason: (date: Date): boolean => {
    const month = date.getMonth() + 1;
    return month >= 4 && month <= 10;
  },
  isCriticalPeriod: (
    weddingDate: Date,
    currentDate: Date = new Date(),
  ): boolean => {
    const diffTime = weddingDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  },
};
