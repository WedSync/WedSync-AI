/**
 * Core Integration Types for WedSync Reporting Engine Integration Orchestration
 * Team C - Integration Orchestration System
 *
 * Comprehensive type definitions for integrating with BI platforms, CRM systems,
 * and data warehouses for wedding suppliers' reporting needs.
 */

export type IntegrationPlatform =
  | 'tableau'
  | 'powerbi'
  | 'looker'
  | 'qlik'
  | 'snowflake'
  | 'bigquery'
  | 'redshift'
  | 'hubspot'
  | 'salesforce'
  | 'pipedrive';

export type SynchronizationType =
  | 'full_sync'
  | 'incremental'
  | 'real_time'
  | 'batch';

export type SyncPriority = 'low' | 'normal' | 'high' | 'critical';

export type ConflictResolutionStrategy =
  | 'source_wins'
  | 'target_wins'
  | 'merge'
  | 'manual';

export interface ReportingIntegrationOrchestrator {
  initializeIntegration(
    config: IntegrationConfiguration,
  ): Promise<IntegrationInstance>;
  synchronizeReportData(
    sync: DataSynchronizationRequest,
  ): Promise<SynchronizationResult>;
  manageConnections(action: ConnectionAction): Promise<ConnectionResult>;
  transformReportData(
    transformation: DataTransformation,
  ): Promise<TransformedData>;
  monitorIntegrationHealth(integrationId: string): Promise<HealthStatus>;
}

export interface IntegrationConfiguration {
  integrationId: string;
  organizationId: string;
  platform: IntegrationPlatform;
  connectionConfig: ConnectionConfiguration;
  dataMapping: FieldMapping[];
  syncSchedule: SynchronizationSchedule;
  transformationRules: TransformationRule[];
  errorHandling: ErrorHandlingConfig;
  securityConfig: SecurityConfiguration;
}

export interface ConnectionConfiguration {
  serverUrl?: string;
  credentials: PlatformCredentials;
  timeout: number;
  retryAttempts: number;
  poolSize: number;
  sslConfig?: SSLConfiguration;
}

export interface PlatformCredentials {
  type: 'api_key' | 'oauth2' | 'basic_auth' | 'token';
  apiKey?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tenantId?: string;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: FieldTransformation;
  required: boolean;
  dataType: DataFieldType;
}

export interface FieldTransformation {
  type: 'format' | 'calculate' | 'lookup' | 'aggregate';
  config: Record<string, any>;
}

export type DataFieldType =
  | 'string'
  | 'number'
  | 'date'
  | 'boolean'
  | 'array'
  | 'object';

export interface SynchronizationSchedule {
  frequency: 'real_time' | 'minutes' | 'hours' | 'daily' | 'weekly' | 'monthly';
  interval?: number;
  cronExpression?: string;
  timezone: string;
  enabled: boolean;
}

export interface TransformationRule {
  id: string;
  name: string;
  condition: string;
  action: TransformationAction;
  priority: number;
  enabled: boolean;
}

export interface TransformationAction {
  type: 'map' | 'filter' | 'aggregate' | 'validate' | 'enrich';
  config: Record<string, any>;
}

export interface ErrorHandlingConfig {
  retryPolicy: RetryPolicy;
  deadLetterQueue: DeadLetterConfig;
  alerting: AlertingConfig;
  fallbackBehavior: FallbackBehavior;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface DeadLetterConfig {
  enabled: boolean;
  maxMessages: number;
  retentionDays: number;
}

export interface AlertingConfig {
  enabled: boolean;
  channels: AlertChannel[];
  thresholds: AlertThreshold[];
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
}

export interface AlertThreshold {
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'ne';
  value: number;
  duration: number;
}

export type FallbackBehavior = 'skip' | 'queue' | 'default_value' | 'fail';

export interface SecurityConfiguration {
  encryption: EncryptionConfig;
  accessControl: AccessControlConfig;
  auditLogging: AuditConfig;
  compliance: ComplianceConfig;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: 'AES-256-GCM' | 'AES-256-CBC';
  keyRotationDays: number;
}

export interface AccessControlConfig {
  rbacEnabled: boolean;
  allowedRoles: string[];
  ipWhitelist?: string[];
  requireMFA: boolean;
}

export interface AuditConfig {
  enabled: boolean;
  logLevel: 'basic' | 'detailed' | 'full';
  retentionDays: number;
}

export interface ComplianceConfig {
  gdprEnabled: boolean;
  hipaaEnabled: boolean;
  soc2Enabled: boolean;
  dataRetentionDays: number;
}

export interface DataSynchronizationRequest {
  syncId: string;
  sourceReportId: string;
  targetIntegration: IntegrationInstance;
  syncType: SynchronizationType;
  dataFilters: DataFilter[];
  batchSize: number;
  priority: SyncPriority;
  conflictResolution: ConflictResolutionStrategy;
}

export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface IntegrationInstance {
  id: string;
  organizationId: string;
  platform: IntegrationPlatform;
  status: IntegrationStatus;
  config: IntegrationConfiguration;
  connection?: any;
  lastSync?: Date;
  healthStatus?: HealthStatus;
}

export type IntegrationStatus =
  | 'initializing'
  | 'connected'
  | 'syncing'
  | 'error'
  | 'disabled';

export interface SynchronizationResult {
  syncId: string;
  status: SyncStatus;
  recordsProcessed: number;
  recordsSuccess: number;
  recordsFailure: number;
  startTime: Date;
  endTime: Date;
  errors: SyncError[];
  metrics: SyncMetrics;
}

export type SyncStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface SyncError {
  recordId?: string;
  errorCode: string;
  errorMessage: string;
  timestamp: Date;
  retry: boolean;
}

export interface SyncMetrics {
  throughputRecordsPerSecond: number;
  averageLatencyMs: number;
  memoryUsageMB: number;
  networkBytesTransferred: number;
}

export interface ConnectionAction {
  type: 'test' | 'connect' | 'disconnect' | 'reconnect' | 'refresh';
  integrationId: string;
  parameters?: Record<string, any>;
}

export interface ConnectionResult {
  integrationId: string;
  action: string;
  success: boolean;
  message: string;
  timestamp: Date;
  connectionInfo?: ConnectionInfo;
}

export interface ConnectionInfo {
  status: 'connected' | 'disconnected' | 'error';
  latencyMs: number;
  version?: string;
  features?: string[];
}

export interface DataTransformation {
  transformationId: string;
  sourceData: any;
  rules: TransformationRule[];
  context: TransformationContext;
}

export interface TransformationContext {
  organizationId: string;
  integrationId: string;
  metadata: Record<string, any>;
}

export interface TransformedData {
  transformationId: string;
  data: any;
  metadata: TransformationMetadata;
  validationResults: ValidationResult[];
}

export interface TransformationMetadata {
  recordCount: number;
  transformationsApplied: string[];
  processingTimeMs: number;
  dataSize: number;
}

export interface ValidationResult {
  field: string;
  valid: boolean;
  errorMessage?: string;
  warningMessage?: string;
}

export interface HealthStatus {
  integrationId: string;
  status: HealthLevel;
  checks: HealthCheck[];
  lastCheck: Date;
  nextCheck: Date;
  uptime: number;
}

export type HealthLevel = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheck {
  name: string;
  status: HealthLevel;
  message: string;
  responseTimeMs?: number;
  threshold?: number;
  lastCheck: Date;
}

export interface SSLConfiguration {
  enabled: boolean;
  certificatePath?: string;
  privateKeyPath?: string;
  caPath?: string;
  verifyPeer: boolean;
}

// Wedding-specific data types
export interface WeddingReportData {
  organizationId: string;
  reportType: 'revenue' | 'satisfaction' | 'performance' | 'analytics';
  timeRange: DateRange;
  weddings: WeddingData[];
  metrics: WeddingMetrics;
  aggregations: WeddingAggregations;
}

export interface WeddingData {
  id: string;
  clientName: string;
  weddingDate: Date;
  venueName: string;
  guestCount: number;
  totalBudget: number;
  status: WeddingStatus;
  satisfactionScore: number;
  services: WeddingService[];
  revenue: number;
}

export type WeddingStatus =
  | 'inquiry'
  | 'booked'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface WeddingService {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  deliveryDate: Date;
  status: ServiceStatus;
  feedback?: string;
}

export type ServiceCategory =
  | 'photography'
  | 'videography'
  | 'catering'
  | 'venue'
  | 'florals'
  | 'music'
  | 'planning';

export type ServiceStatus =
  | 'booked'
  | 'in_progress'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export interface WeddingMetrics {
  totalRevenue: number;
  averageSatisfaction: number;
  conversionRate: number;
  repeatClientRate: number;
  referralRate: number;
  profitMargin: number;
}

export interface WeddingAggregations {
  byCategory: CategoryAggregation[];
  byMonth: MonthlyAggregation[];
  bySeason: SeasonalAggregation[];
  byVenue: VenueAggregation[];
}

export interface CategoryAggregation {
  category: ServiceCategory;
  count: number;
  totalRevenue: number;
  averageSatisfaction: number;
}

export interface MonthlyAggregation {
  month: string;
  count: number;
  revenue: number;
  satisfaction: number;
}

export interface SeasonalAggregation {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  count: number;
  revenue: number;
  averageGuestCount: number;
}

export interface VenueAggregation {
  venueName: string;
  count: number;
  revenue: number;
  satisfaction: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}
