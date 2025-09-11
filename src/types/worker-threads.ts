/**
 * WS-333 Team B: Worker Thread Type Definitions
 * Comprehensive TypeScript interfaces for parallel report processing
 */

// Worker thread configuration
export interface WorkerThreadConfig {
  maxWorkers: number;
  minWorkers: number;
  taskTimeout: number; // in milliseconds
  maxQueueSize: number;
  workerIdleTimeout: number; // in milliseconds
  maxMemoryPerWorker?: number; // in MB
  weddingSeasonScaling: boolean;
  enableProfiling: boolean;
  resourceLimits?: {
    maxOldGenerationSizeMb?: number;
    maxYoungGenerationSizeMb?: number;
    codeRangeSizeMb?: number;
  };
}

// Task priorities
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

// Task types supported by workers
export type TaskType =
  | 'data_aggregation'
  | 'report_generation'
  | 'excel_processing'
  | 'pdf_generation'
  | 'image_processing'
  | 'email_delivery'
  | 'data_validation'
  | 'file_conversion'
  | 'webhook_processing';

// Task status
export type TaskStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'timeout';

// Worker task definition
export interface WorkerTask {
  taskId: string;
  type: TaskType;
  priority: TaskPriority;
  data: any;
  createdAt: Date;
  assignedAt?: Date;
  status: TaskStatus;
  retryCount?: number;
  maxRetries?: number;
  weddingContext?: WeddingTaskContext;
  metadata?: TaskMetadata;
}

// Wedding-specific task context
export interface WeddingTaskContext {
  weddingId?: string;
  supplierId?: string;
  venueId?: string;
  clientId?: string;
  isWeddingDay: boolean;
  isWeekend: boolean;
  isPeakSeason: boolean;
  daysUntilWedding?: number;
  weddingSeason?: 'spring' | 'summer' | 'fall' | 'winter';
  emergencyLevel?: 'normal' | 'elevated' | 'critical';
}

// Task metadata
export interface TaskMetadata {
  userId?: string;
  organizationId?: string;
  source: string;
  correlationId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

// Worker task result
export interface WorkerResult {
  taskId: string;
  success: boolean;
  data: any;
  error?: string;
  duration: number;
  workerId: number;
  memoryUsage: NodeJS.MemoryUsage;
  completedAt?: Date;
  warnings?: string[];
  metadata?: WorkerResultMetadata;
}

// Worker result metadata
export interface WorkerResultMetadata {
  recordsProcessed?: number;
  filesGenerated?: number;
  cacheHitRatio?: number;
  queryExecutionTime?: number;
  renderingTime?: number;
  compressionRatio?: number;
  outputSize?: number;
  performanceMetrics?: Record<string, number>;
}

// Worker pool metrics
export interface WorkerPoolMetrics {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers?: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgTaskDuration: number;
  peakMemoryUsage: number;
  cpuUtilization: number;
  throughputPerHour: number;
  errorRate?: number;
  queueWaitTime?: number;
  lastUpdated: Date;
}

// Individual worker status
export interface WorkerStatus {
  workerId: number;
  status: 'idle' | 'busy' | 'error' | 'shutting_down';
  currentTask: {
    taskId: string;
    type: TaskType;
    startedAt: Date;
    estimatedCompletion?: Date;
  } | null;
  memoryUsage: number; // in MB
  cpuUsage: number; // percentage
  tasksCompleted: number;
  tasksCompleted24h?: number;
  tasksFailed: number;
  tasksFailed24h?: number;
  uptime: number; // in milliseconds
  averageTaskDuration: number;
  lastTaskCompletedAt?: Date;
  errorMessages?: string[];
}

// Worker performance profile
export interface WorkerPerformanceProfile {
  workerId: number;
  profilePeriod: {
    start: Date;
    end: Date;
  };
  taskTypePerformance: Record<TaskType, TaskTypePerformance>;
  memoryProfile: MemoryProfile;
  cpuProfile: CpuProfile;
  errorProfile: ErrorProfile;
  recommendations: PerformanceRecommendation[];
}

// Task type performance metrics
export interface TaskTypePerformance {
  taskType: TaskType;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  avgDuration: number;
  p95Duration: number;
  p99Duration: number;
  avgMemoryUsage: number;
  peakMemoryUsage: number;
  avgCpuUsage: number;
  peakCpuUsage: number;
  throughputPerHour: number;
  errorRate: number;
}

// Memory usage profile
export interface MemoryProfile {
  samples: MemorySample[];
  averageUsage: NodeJS.MemoryUsage;
  peakUsage: NodeJS.MemoryUsage;
  memoryLeaks: MemoryLeak[];
  garbageCollectionStats: GcStats;
}

// Memory sample point
export interface MemorySample {
  timestamp: Date;
  usage: NodeJS.MemoryUsage;
  taskId?: string;
  taskType?: TaskType;
}

// Memory leak detection
export interface MemoryLeak {
  detectedAt: Date;
  growthRate: number; // MB per hour
  suspected_cause: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

// Garbage collection statistics
export interface GcStats {
  totalCollections: number;
  totalDuration: number; // in milliseconds
  avgDuration: number;
  maxDuration: number;
  collections: GcCollection[];
}

// Individual garbage collection event
export interface GcCollection {
  timestamp: Date;
  type: 'minor' | 'major' | 'incremental';
  duration: number;
  beforeUsage: NodeJS.MemoryUsage;
  afterUsage: NodeJS.MemoryUsage;
  freedMemory: number;
}

// CPU usage profile
export interface CpuProfile {
  samples: CpuSample[];
  averageUsage: number; // percentage
  peakUsage: number;
  usageByTaskType: Record<TaskType, number>;
  hotSpots: CpuHotSpot[];
}

// CPU sample point
export interface CpuSample {
  timestamp: Date;
  usage: number; // percentage
  taskId?: string;
  taskType?: TaskType;
  systemLoad?: number[];
}

// CPU performance hot spots
export interface CpuHotSpot {
  functionName: string;
  fileName: string;
  lineNumber: number;
  totalTime: number; // in milliseconds
  selfTime: number;
  callCount: number;
  avgCallTime: number;
  taskTypes: TaskType[];
}

// Error profile for worker
export interface ErrorProfile {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByTaskType: Record<TaskType, number>;
  criticalErrors: WorkerError[];
  errorTrends: ErrorTrend[];
  recoveryStats: ErrorRecoveryStats;
}

// Individual worker error
export interface WorkerError {
  timestamp: Date;
  taskId?: string;
  taskType?: TaskType;
  errorType: string;
  message: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recovered: boolean;
  recoveryTime?: number; // in milliseconds
  impact: 'task_failed' | 'worker_restarted' | 'system_degraded';
}

// Error trend analysis
export interface ErrorTrend {
  period: '1h' | '24h' | '7d' | '30d';
  errorCount: number;
  errorRate: number; // percentage
  trend: 'increasing' | 'decreasing' | 'stable';
  prediction?: {
    nextHour: number;
    nextDay: number;
    confidence: number;
  };
}

// Error recovery statistics
export interface ErrorRecoveryStats {
  totalRecoveries: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  avgRecoveryTime: number;
  recoveryByErrorType: Record<string, RecoveryTypeStats>;
}

// Recovery statistics by error type
export interface RecoveryTypeStats {
  errorType: string;
  attempts: number;
  successes: number;
  failures: number;
  avgTime: number;
  successRate: number;
}

// Performance recommendations
export interface PerformanceRecommendation {
  type: 'memory' | 'cpu' | 'task_optimization' | 'configuration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImpact: string;
  implementation: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  applicableTasks?: TaskType[];
}

// Worker scaling decision
export interface ScalingDecision {
  timestamp: Date;
  currentWorkers: number;
  targetWorkers: number;
  action: 'scale_up' | 'scale_down' | 'no_change';
  reason: string;
  factors: ScalingFactor[];
  executionTime: number;
  success: boolean;
  error?: string;
}

// Scaling factor analysis
export interface ScalingFactor {
  name: string;
  value: number;
  weight: number;
  influence: 'scale_up' | 'scale_down' | 'neutral';
  description: string;
}

// Task queue analysis
export interface TaskQueueAnalysis {
  timestamp: Date;
  totalQueued: number;
  queuedByPriority: Record<TaskPriority, number>;
  queuedByType: Record<TaskType, number>;
  avgWaitTime: number;
  p95WaitTime: number;
  oldestTaskAge: number; // in milliseconds
  weddingContextAnalysis: {
    weddingDayTasks: number;
    weekendTasks: number;
    peakSeasonTasks: number;
    emergencyTasks: number;
  };
  bottleneckAnalysis: BottleneckAnalysis;
}

// Queue bottleneck analysis
export interface BottleneckAnalysis {
  identified: boolean;
  bottleneckType:
    | 'worker_shortage'
    | 'memory_limit'
    | 'cpu_bound'
    | 'io_bound'
    | 'dependency_wait';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedTaskTypes: TaskType[];
  estimatedDelay: number; // in milliseconds
  suggestedActions: string[];
}

// Worker thread health check
export interface WorkerHealthCheck {
  workerId: number;
  timestamp: Date;
  status: 'healthy' | 'warning' | 'critical' | 'unresponsive';
  checks: HealthCheckResult[];
  overallScore: number; // 0-100
  recommendations: string[];
}

// Individual health check result
export interface HealthCheckResult {
  checkName: string;
  status: 'pass' | 'warning' | 'fail';
  value: number;
  threshold: number;
  unit: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

// Wedding season scaling configuration
export interface WeddingSeasonScalingConfig {
  enabled: boolean;
  peakSeasonMonths: number[]; // 1-12
  scalingMultipliers: {
    peakSeason: number;
    weekend: number;
    weddingDay: number;
    emergency: number;
  };
  thresholds: {
    scaleUpQueueLength: number;
    scaleDownIdleTime: number; // in milliseconds
    maxWorkersPerCore: number;
    memoryLimitMB: number;
  };
  cooldownPeriods: {
    scaleUp: number; // in milliseconds
    scaleDown: number; // in milliseconds
  };
}

// Task execution context
export interface TaskExecutionContext {
  taskId: string;
  workerId: number;
  startTime: Date;
  timeout: number;
  retryAttempt: number;
  resources: {
    maxMemory: number;
    priority: TaskPriority;
    cpuShares?: number;
  };
  dependencies: string[]; // Task IDs this task depends on
  callbacks: {
    onProgress?: (progress: TaskProgress) => void;
    onComplete?: (result: WorkerResult) => void;
    onError?: (error: Error) => void;
    onTimeout?: () => void;
  };
}

// Task progress information
export interface TaskProgress {
  taskId: string;
  progress: number; // 0-100
  stage: string;
  message: string;
  estimatedTimeRemaining?: number; // in milliseconds
  metadata?: Record<string, any>;
}

// Batch task processing
export interface BatchTaskRequest {
  batchId: string;
  tasks: WorkerTask[];
  batchPriority: TaskPriority;
  maxConcurrentTasks: number;
  failurePolicy: 'fail_fast' | 'continue_on_error' | 'retry_failed';
  timeout: number; // in milliseconds
  callback?: (result: BatchTaskResult) => void;
}

// Batch task result
export interface BatchTaskResult {
  batchId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  results: WorkerResult[];
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  success: boolean;
  failureReason?: string;
}

// Worker pool configuration
export interface WorkerPoolConfiguration {
  name: string;
  description: string;
  workerConfig: WorkerThreadConfig;
  scalingConfig: WeddingSeasonScalingConfig;
  monitoringConfig: {
    metricsInterval: number; // in milliseconds
    healthCheckInterval: number; // in milliseconds
    profiling: boolean;
    alerting: boolean;
  };
  persistenceConfig: {
    saveMetrics: boolean;
    metricsRetentionDays: number;
    saveResults: boolean;
    resultsRetentionDays: number;
  };
}

// Export all types for use throughout the application
export type {
  WorkerThreadConfig,
  TaskPriority,
  TaskType,
  TaskStatus,
  WorkerTask,
  WeddingTaskContext,
  TaskMetadata,
  WorkerResult,
  WorkerResultMetadata,
  WorkerPoolMetrics,
  WorkerStatus,
  WorkerPerformanceProfile,
  TaskTypePerformance,
  MemoryProfile,
  MemorySample,
  MemoryLeak,
  GcStats,
  GcCollection,
  CpuProfile,
  CpuSample,
  CpuHotSpot,
  ErrorProfile,
  WorkerError,
  ErrorTrend,
  ErrorRecoveryStats,
  RecoveryTypeStats,
  PerformanceRecommendation,
  ScalingDecision,
  ScalingFactor,
  TaskQueueAnalysis,
  BottleneckAnalysis,
  WorkerHealthCheck,
  HealthCheckResult,
  WeddingSeasonScalingConfig,
  TaskExecutionContext,
  TaskProgress,
  BatchTaskRequest,
  BatchTaskResult,
  WorkerPoolConfiguration,
};
