/**
 * Deployment Management Types - Shared definitions
 *
 * Shared type definitions to prevent circular dependencies in the deployment
 * management system. All deployment services should use these types
 * to ensure compatibility and avoid circular imports.
 */

// Core deployment and rollback interfaces
export interface RollbackConfig {
  targetCommit: string;
  reason:
    | 'health'
    | 'manual'
    | 'emergency'
    | 'security'
    | 'database_corruption';
  environment: 'production' | 'staging' | 'development';
  disableWeddingProtection?: boolean;
  skipHealthChecks?: boolean;
  dryRun?: boolean;
}

export interface RollbackMetrics {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'blocked';
  weddingCheck?: WeddingCheckResult;
  healthCheck?: HealthCheckResult;
  verificationResults?: VerificationResult[];
  errorMessage?: string;
}

// Wedding protection interfaces
export interface WeddingCheckResult {
  hasActiveWeddings: boolean;
  weddingCount: number;
  weddings?: Array<{
    clientName: string;
    weddingDate: Date;
    phone: string;
    emergencyContact?: string;
  }>;
  protectionOverridden?: boolean;
}

// Health monitoring interfaces
export interface HealthEndpoint {
  name: string;
  url: string;
  critical: boolean;
  expectedStatus?: number;
  maxResponseTime?: number;
}

export interface HealthMetrics {
  timestamp: Date;
  overallHealth: number;
  endpoints: EndpointHealth[];
  triggerRollback: boolean;
  weddingProtection: boolean;
}

export interface EndpointHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'failed';
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

export interface HealthCheckResult {
  overallHealth: number;
  endpoints: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'failed';
    responseTime?: number;
  }>;
  shouldRollback: boolean;
}

// Verification interfaces
export interface VerificationResult {
  check: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  timestamp: Date;
}

// Service interfaces for dependency injection
export interface RollbackManagerInterface {
  initiateRollback(config: RollbackConfig): Promise<RollbackMetrics>;
}

export interface HealthMonitorInterface {
  performHealthCheck(environment: string): Promise<void>;
  checkSystemHealth(environment: string): Promise<HealthMetrics>;
  getCurrentHealth(): HealthMetrics | undefined;
  isMonitoring(): boolean;
}

export interface RollbackNotificationInterface {
  notifyWeddingBlocked(
    rollbackId: string,
    weddingCheck: WeddingCheckResult,
  ): Promise<void>;
  notifyRollbackStarted(
    rollbackId: string,
    config: RollbackConfig,
  ): Promise<void>;
  notifyRollbackCompleted(
    rollbackId: string,
    metrics: RollbackMetrics,
  ): Promise<void>;
  notifyRollbackFailed(rollbackId: string, error: string): Promise<void>;
}

// Service dependency injection interface
export interface DeploymentServices {
  rollbackManager?: RollbackManagerInterface;
  healthMonitor?: HealthMonitorInterface;
  notificationManager?: RollbackNotificationInterface;
}
