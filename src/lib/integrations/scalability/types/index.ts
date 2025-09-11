/**
 * WS-340: Scalability Infrastructure Integration Types
 * Team C: Integration & System Orchestration
 */

export type CloudProvider = 'aws' | 'gcp' | 'azure';
export type ClusterType = 'kubernetes' | 'ecs' | 'gke' | 'aks';
export type MonitoringPlatformType =
  | 'datadog'
  | 'newrelic'
  | 'prometheus'
  | 'grafana'
  | 'pagerduty';
export type ScalingReason =
  | 'manual'
  | 'auto'
  | 'wedding-event'
  | 'seasonal'
  | 'emergency';
export type ScalingStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'rollback';

// Core Wedding Context Types
export interface WeddingScalingContext {
  weddingId?: string;
  weddingDate?: Date;
  expectedGuests?: number;
  vendorCount?: number;
  peakTrafficExpected?: Date;
  isWeddingSeason?: boolean;
  regionPriority?: string[];
  weddingTimeZone?: string;
}

export interface GlobalWeddingSeason {
  seasonId: string;
  startDate: Date;
  endDate: Date;
  expectedWeddingCount: number;
  peakRegions: string[];
  performanceTargets: PerformanceRequirement[];
  costConstraints: CostConstraint[];
  complianceRequirements: ComplianceRequirement[];
  monitoringStrategy: MonitoringStrategy;
  alertingRules: AlertingRule[];
}

// Scaling Request Types
export interface CloudScalingRequest {
  requestId: string;
  targetProvider: CloudProvider[];
  services: ServiceScalingSpec[];
  scalingReason: ScalingReason;
  weddingContext?: WeddingScalingContext;
  costConstraints: CostConstraint[];
  performanceRequirements: PerformanceRequirement[];
  failoverConfiguration: FailoverConfiguration;
  executionTimeLimit?: number;
  rollbackStrategy?: RollbackStrategy;
}

export interface ServiceScalingSpec {
  service: string;
  region: string;
  currentInstances: number;
  targetInstances: number;
  configuration: ScalingConfiguration;
  criticalService: boolean;
  requiresStabilization: boolean;
  weddingPriority?: 'high' | 'medium' | 'low';
}

export interface ScalingConfiguration {
  minInstances: number;
  maxInstances: number;
  instanceType: string;
  autoScaling: boolean;
  healthCheckConfig: HealthCheckConfig;
  resourceLimits: ResourceLimits;
  networkConfig?: NetworkConfiguration;
}

export interface ResourceLimits {
  cpu: string;
  memory: string;
  storage?: string;
  networkBandwidth?: string;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  path?: string;
  port?: number;
}

// Cost and Performance Types
export interface CostConstraint {
  constraintId: string;
  type: 'hourly' | 'daily' | 'monthly';
  maxCost: number;
  currency: string;
  provider?: CloudProvider;
  enforceAutomatically: boolean;
}

export interface PerformanceRequirement {
  requirementId: string;
  metric: 'response-time' | 'throughput' | 'availability' | 'latency';
  target: number;
  unit: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ComplianceRequirement {
  requirementId: string;
  standard: 'GDPR' | 'SOC2' | 'CCPA' | 'PCI-DSS' | 'ISO27001';
  region: string;
  mandatory: boolean;
}

// Monitoring Integration Types
export interface MonitoringIntegration {
  platforms: MonitoringPlatform[];
  metricsConfiguration: MetricsConfiguration;
  alertingRules: AlertingRule[];
  weddingSpecificMonitoring: WeddingMonitoringConfig;
  escalationPolicies: EscalationPolicy[];
  automationRules?: AutomationRule[];
}

export interface MonitoringPlatform {
  type: MonitoringPlatformType;
  config: MonitoringPlatformConfig;
  enabled: boolean;
  priority: number;
}

export interface MonitoringPlatformConfig {
  apiKey?: string;
  endpoint?: string;
  credentials?: Record<string, string>;
  customSettings?: Record<string, unknown>;
}

export interface MetricsConfiguration {
  interval: number;
  retention: number;
  customMetrics: CustomMetric[];
  weddingMetrics: WeddingMetric[];
}

export interface CustomMetric {
  name: string;
  type: 'gauge' | 'counter' | 'histogram';
  description: string;
  unit: string;
  tags: string[];
}

export interface WeddingMetric {
  name: string;
  description: string;
  weddingContext: boolean;
  vendorContext: boolean;
  coupleContext: boolean;
}

export interface AlertingRule {
  ruleId: string;
  name: string;
  condition: string;
  threshold: number;
  duration: number;
  severity: 'critical' | 'warning' | 'info';
  weddingSpecific: boolean;
  escalationPolicy: string;
}

export interface WeddingMonitoringConfig {
  weddingDayAlerts: boolean;
  vendorActivityMonitoring: boolean;
  coupleEngagementTracking: boolean;
  weddingSeasonDashboards: boolean;
  realTimeWeddingMetrics: boolean;
}

export interface EscalationPolicy {
  policyId: string;
  name: string;
  steps: EscalationStep[];
  weddingDayOverride: boolean;
}

export interface EscalationStep {
  stepId: string;
  delay: number;
  targets: string[];
  action: 'notify' | 'auto-scale' | 'failover';
}

export interface AutomationRule {
  ruleId: string;
  trigger: string;
  action: string;
  conditions: string[];
  weddingAware: boolean;
}

export interface MonitoringStrategy {
  strategyId: string;
  platforms: MonitoringPlatformType[];
  metricsCollectionLevel: 'basic' | 'detailed' | 'comprehensive';
  realTimeAlerting: boolean;
  predictiveMonitoring: boolean;
}

// Result Types
export interface CloudScalingResult {
  requestId: string;
  provider: CloudProvider;
  region: string;
  scalingResults: ServiceScalingResult[];
  executionTimeMs: number;
  status: ScalingStatus;
  errorDetails?: string;
  rollbackRequired?: boolean;
}

export interface ServiceScalingResult {
  service: string;
  region: string;
  status: ScalingStatus;
  currentInstances: number;
  targetInstances: number;
  scaledInstances: number;
  executionTimeMs: number;
  costImpact: CostImpact;
  performanceMetrics: PerformanceMetrics;
  error?: string;
  rollbackRequired?: boolean;
}

export interface CostImpact {
  hourlyCostChange: number;
  dailyCostChange: number;
  monthlyCostEstimate: number;
  currency: string;
}

export interface PerformanceMetrics {
  responseTimeMs: number;
  throughputRps: number;
  errorRate: number;
  availabilityPercent: number;
  resourceUtilization: ResourceUtilization;
}

export interface ResourceUtilization {
  cpuPercent: number;
  memoryPercent: number;
  networkUtilization: number;
  storageUtilization?: number;
}

// Additional required types
export interface NetworkConfiguration {
  vpcId?: string;
  subnetIds?: string[];
  securityGroupIds?: string[];
  loadBalancerConfig?: LoadBalancerConfig;
}

export interface LoadBalancerConfig {
  type: 'application' | 'network' | 'classic';
  scheme: 'internet-facing' | 'internal';
  listeners: LoadBalancerListener[];
}

export interface LoadBalancerListener {
  protocol: string;
  port: number;
  targetPort: number;
  healthCheck: HealthCheckConfig;
}

export interface FailoverConfiguration {
  enabled: boolean;
  triggerConditions: FailoverTrigger[];
  targetProviders: CloudProvider[];
  automaticFailover: boolean;
  rollbackConditions: RollbackCondition[];
}

export interface FailoverTrigger {
  triggerId: string;
  condition: string;
  threshold: number;
  duration: number;
  severity: 'critical' | 'high' | 'medium';
}

export interface RollbackStrategy {
  enabled: boolean;
  automaticRollback: boolean;
  rollbackTriggers: RollbackTrigger[];
  rollbackTimeLimit: number;
}

export interface RollbackCondition {
  conditionId: string;
  metric: string;
  threshold: number;
  duration: number;
}

export interface RollbackTrigger {
  triggerId: string;
  condition: string;
  severity: 'critical' | 'high';
  automaticTrigger: boolean;
}

// Utility function to generate unique IDs
export function generateOrchestrationId(): string {
  return `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateIntegrationId(): string {
  return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Error Types
export class ScalabilityIntegrationError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'ScalabilityIntegrationError';
  }
}

export class GlobalScalingOrchestrationError extends ScalabilityIntegrationError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'GlobalScalingOrchestrationError';
  }
}

export class UnsupportedProviderError extends ScalabilityIntegrationError {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedProviderError';
  }
}

export class CriticalServiceScalingError extends ScalabilityIntegrationError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'CriticalServiceScalingError';
  }
}
