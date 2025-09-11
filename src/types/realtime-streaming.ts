/**
 * WS-333 Team B: Real-Time Streaming Type Definitions
 * Comprehensive TypeScript interfaces for Kafka-based wedding event streaming
 */

// Core wedding event stream structure
export interface WeddingEventStream {
  eventId: string;
  eventType: WeddingEventType;
  weddingId: string;
  supplierId?: string;
  clientId?: string;
  venueId?: string;
  timestamp: Date;
  data: Record<string, any>;
  source: string;
  version: string;
  correlationId?: string;

  // Enriched context (added during processing)
  weddingContext?: WeddingContext;
  supplierContext?: SupplierContext;
  metadata?: EventMetadata;
}

// All possible wedding event types
export type WeddingEventType =
  // Booking Events
  | 'wedding_booking_confirmed'
  | 'wedding_booking_cancelled'
  | 'wedding_booking_modified'
  | 'service_package_selected'
  | 'contract_signed'
  | 'contract_modified'

  // Payment Events
  | 'wedding_payment_received'
  | 'payment_failed'
  | 'payment_refunded'
  | 'deposit_received'
  | 'final_payment_received'
  | 'invoice_generated'
  | 'payment_overdue'

  // Supplier Events
  | 'supplier_status_updated'
  | 'supplier_availability_changed'
  | 'supplier_cancellation'
  | 'supplier_assigned'
  | 'supplier_performance_rated'
  | 'supplier_communication_sent'

  // Venue Events
  | 'venue_availability_changed'
  | 'venue_booking_confirmed'
  | 'venue_capacity_updated'
  | 'venue_facilities_modified'

  // Client Communication Events
  | 'client_communication_sent'
  | 'client_communication_received'
  | 'client_feedback_submitted'
  | 'client_inquiry_created'
  | 'client_concern_raised'

  // Media Events
  | 'photo_upload_completed'
  | 'video_upload_completed'
  | 'gallery_shared'
  | 'media_approved'
  | 'media_revision_requested'

  // Timeline Events
  | 'timeline_created'
  | 'timeline_modified'
  | 'timeline_shared'
  | 'milestone_completed'
  | 'deadline_approaching'
  | 'deadline_missed'

  // Guest Management Events
  | 'guest_list_updated'
  | 'rsvp_received'
  | 'guest_dietary_requirements_updated'
  | 'seating_arrangement_changed'

  // System Events
  | 'system_notification_sent'
  | 'automation_triggered'
  | 'report_generated'
  | 'backup_completed'
  | 'sync_completed'

  // Emergency Events
  | 'emergency_alert'
  | 'wedding_day_issue'
  | 'critical_system_failure';

// Wedding context for event enrichment
export interface WeddingContext {
  id: string;
  wedding_date: string;
  venue_id?: string;
  is_weekend: boolean;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  guest_count: number;
  budget_tier: 'starter' | 'professional' | 'scale' | 'enterprise';
  status: 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  couples?: Array<{ name: string; email: string }>;
  venue?: { name: string; location: string };
}

// Supplier context for event enrichment
export interface SupplierContext {
  id: string;
  business_name: string;
  service_type:
    | 'photography'
    | 'venue'
    | 'catering'
    | 'flowers'
    | 'music'
    | 'planning'
    | 'transport'
    | 'other';
  tier: 'starter' | 'professional' | 'scale' | 'enterprise';
  region: string;
  rating?: number;
  active_weddings?: number;
}

// Additional event metadata
export interface EventMetadata {
  source_system: string;
  source_user_id?: string;
  source_ip?: string;
  device_type?: 'mobile' | 'desktop' | 'tablet';
  user_agent?: string;
  session_id?: string;
  is_automated: boolean;
  retry_count?: number;
  processing_flags?: string[];
}

// Stream processing configuration
export interface StreamProcessingConfig {
  kafkaBrokers: string[];
  redisHost: string;
  redisPort: number;
  processingConcurrency: number;
  batchSize: number;
  batchTimeout: number;
  enableDLQ: boolean;
  enableMetrics: boolean;
  weddingSeasonOptimization: boolean;
  emergencyAlertThresholds: EmergencyAlertThresholds;
}

// Emergency alert thresholds
export interface EmergencyAlertThresholds {
  supplierCancellationDays: number; // Alert if cancellation within X days
  paymentOverdueDays: number;
  timelineChangesDays: number; // Alert for major changes within X days
  venueUnavailabilityImmediate: boolean;
  criticalSystemErrorImmediate: boolean;
}

// Real-time aggregation definition
export interface RealtimeAggregation {
  aggregationId: string;
  name: string;
  description: string;
  eventTypes: WeddingEventType[];
  aggregationType:
    | 'sum'
    | 'count'
    | 'average'
    | 'min'
    | 'max'
    | 'distinct_count';
  aggregationField?: string;
  timeWindow: TimeWindow;
  groupBy: string[];
  filters: AggregationFilter[];
  outputDestination: 'redis' | 'database' | 'both';
  weddingSpecific: boolean;
}

// Time window for aggregations
export interface TimeWindow {
  type: 'tumbling' | 'sliding' | 'session';
  size: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
  advance?: number; // For sliding windows
  sessionTimeout?: number; // For session windows
}

// Aggregation filters
export interface AggregationFilter {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'in'
    | 'not_in';
  value: any;
  weddingContextPath?: string; // e.g., "weddingContext.is_weekend"
}

// Stream processing result
export interface StreamProcessingResult {
  eventId: string;
  processedAt: Date;
  processingLatency: number;
  success: boolean;
  error?: string;
  aggregationsUpdated: string[];
  alertsTriggered: string[];
  dashboardUpdatesPublished: number;
}

// Performance metrics for stream processing
export interface StreamMetrics {
  eventsProcessed: number;
  eventsPerSecond: number;
  avgProcessingLatency: number;
  errorRate: number;
  lastProcessedTimestamp: Date;
  activeBatches: number;
  backpressureLevel: number; // 0-1 scale
  kafkaLag?: number;
  redisConnectionHealth?: 'healthy' | 'degraded' | 'unhealthy';
}

// Real-time dashboard update
export interface DashboardUpdate {
  type: string;
  weddingId?: string;
  supplierId?: string;
  venueId?: string;
  timestamp: Date;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
  celebration?: boolean; // For positive updates
}

// Wedding-specific alert
export interface WeddingAlert {
  alertId: string;
  type: string;
  weddingId: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionRequired: boolean;
  actionUrl?: string;
  daysUntilWedding?: number;
  affectedParties: string[]; // ['couple', 'supplier', 'venue', 'admin']
  metadata: Record<string, any>;
  createdAt: Date;
  resolvedAt?: Date;
}

// Stream topic configuration
export interface StreamTopicConfig {
  topicName: string;
  partitions: number;
  replicationFactor: number;
  retentionHours: number;
  compactionEnabled: boolean;
  weddingSpecific: boolean;
  expectedVolumePerHour: number;
  priorityLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Event serialization configuration
export interface EventSerializationConfig {
  format: 'json' | 'avro' | 'protobuf';
  compressionType: 'none' | 'gzip' | 'snappy' | 'lz4';
  schemaRegistry?: {
    url: string;
    schemaId: string;
    schemaVersion: string;
  };
}

// Consumer group configuration
export interface ConsumerGroupConfig {
  groupId: string;
  consumerInstanceId: string;
  sessionTimeoutMs: number;
  heartbeatIntervalMs: number;
  maxPollRecords: number;
  autoOffsetReset: 'earliest' | 'latest' | 'none';
  enableAutoCommit: boolean;
  autoCommitIntervalMs?: number;
}

// Producer configuration
export interface ProducerConfig {
  acks: 'all' | '1' | '0';
  retries: number;
  batchSize: number;
  lingerMs: number;
  bufferMemory: number;
  compressionType: 'none' | 'gzip' | 'snappy' | 'lz4';
  maxInFlightRequestsPerConnection: number;
  idempotence: boolean;
}

// Wedding season optimization settings
export interface WeddingSeasonOptimization {
  enabled: boolean;
  peakSeasonMonths: number[]; // 1-12 (January = 1)
  peakSeasonMultiplier: number; // Resource scaling multiplier
  offSeasonReduction: number; // Resource reduction percentage
  weekendPriorityBoost: number; // Priority boost for weekend events
  emergencyResponseTime: {
    normal: number; // seconds
    weddingDay: number; // seconds
    peak: number; // seconds
  };
}

// Dead Letter Queue configuration
export interface DLQConfig {
  enabled: boolean;
  topicName: string;
  maxRetries: number;
  retryDelayMs: number;
  alertOnDLQMessage: boolean;
  dlqRetentionHours: number;
}

// Monitoring and alerting configuration
export interface MonitoringConfig {
  metricsEnabled: boolean;
  alertingEnabled: boolean;
  performanceThresholds: {
    maxLatencyMs: number;
    maxErrorRate: number;
    minThroughput: number;
  };
  alertChannels: AlertChannel[];
  dashboardUpdateFrequency: number; // seconds
}

// Alert channel configuration
export interface AlertChannel {
  type: 'email' | 'sms' | 'slack' | 'webhook' | 'supabase_realtime';
  configuration: Record<string, any>;
  enabled: boolean;
  urgencyFilter: ('low' | 'medium' | 'high' | 'critical')[];
}

// Cache configuration for event processing
export interface EventCacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  maxSize: number;
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
  weddingContextTTL: number;
  supplierContextTTL: number;
  preloadWeddingContext: boolean; // Preload upcoming weddings
}

// Batch processing configuration
export interface BatchProcessingConfig {
  enabled: boolean;
  batchSize: number;
  batchTimeoutMs: number;
  maxBatchWaitTime: number;
  parallelBatches: number;
  errorHandling: 'fail_fast' | 'continue_on_error' | 'retry_failed';
}

// Schema evolution configuration
export interface SchemaEvolutionConfig {
  compatibilityLevel: 'backward' | 'forward' | 'full' | 'none';
  validateSchema: boolean;
  allowSchemaUpgrade: boolean;
  schemaVersioning: 'auto' | 'manual';
  migrationStrategy: 'immediate' | 'gradual' | 'parallel';
}

// Export all types for use throughout the application
export type {
  WeddingEventStream,
  WeddingEventType,
  WeddingContext,
  SupplierContext,
  EventMetadata,
  StreamProcessingConfig,
  EmergencyAlertThresholds,
  RealtimeAggregation,
  TimeWindow,
  AggregationFilter,
  StreamProcessingResult,
  StreamMetrics,
  DashboardUpdate,
  WeddingAlert,
  StreamTopicConfig,
  EventSerializationConfig,
  ConsumerGroupConfig,
  ProducerConfig,
  WeddingSeasonOptimization,
  DLQConfig,
  MonitoringConfig,
  AlertChannel,
  EventCacheConfig,
  BatchProcessingConfig,
  SchemaEvolutionConfig,
};
