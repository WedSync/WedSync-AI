/**
 * Scalability Infrastructure Types
 * WS-340: Enterprise-grade scalability monitoring and management types
 */

// Time and metric data structures
export interface TimeRange {
  start: Date;
  end: Date;
  duration: '1h' | '6h' | '24h' | '7d' | '30d';
}

export interface MetricTimeSeries {
  current: number;
  trend: 'up' | 'down' | 'stable';
  history: MetricDataPoint[];
  threshold?: number;
  unit: string;
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface TrafficPattern {
  hour: number;
  expectedLoad: number;
  actualLoad?: number;
  weddingFactor: number;
}

// Service and infrastructure structures
export interface ServiceInstance {
  id: string;
  name: string;
  type: 'web' | 'api' | 'worker' | 'database';
  status: 'healthy' | 'warning' | 'critical' | 'scaling';
  region: string;
  cpuUtilization: number;
  memoryUtilization: number;
  requestRate: number;
  responseTime: number;
  instances: {
    current: number;
    target: number;
    min: number;
    max: number;
  };
  lastScalingEvent?: Date;
}

export interface ScalingMetrics {
  currentInstances: ServiceInstance[];
  targetInstances: number;
  cpuUtilization: MetricTimeSeries;
  memoryUtilization: MetricTimeSeries;
  requestRate: MetricTimeSeries;
  responseTime: MetricTimeSeries;
  errorRate: MetricTimeSeries;
  queueDepth: MetricTimeSeries;
  weddingDayMetrics: WeddingDayMetrics;
  timestamp: Date;
}

export interface WeddingDayMetrics {
  activeWeddings: number;
  peakConcurrentUsers: number;
  weddingDayTrafficPattern: TrafficPattern[];
  vendorUploadRate: number;
  coupleEngagementRate: number;
  emergencyScalingEvents: ScalingEvent[];
  saturdayMultiplier: number;
  expectedPeakTime: Date;
}

// Scaling policies and automation
export interface ScalingPolicy {
  id: string;
  name: string;
  service: string;
  description: string;
  triggers: ScalingTrigger[];
  actions: ScalingAction[];
  weddingAwareRules: WeddingAwareRule[];
  cooldownPeriod: number; // seconds
  enabled: boolean;
  priority: number;
  lastModified: Date;
  createdBy: string;
  performance: PolicyPerformance;
}

export interface ScalingTrigger {
  id: string;
  metric:
    | 'cpu'
    | 'memory'
    | 'requests'
    | 'response_time'
    | 'error_rate'
    | 'queue_depth';
  condition: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  duration: number; // seconds - how long condition must persist
  aggregation: 'avg' | 'max' | 'min' | 'p95' | 'p99';
  windowSize: number; // seconds
}

export interface ScalingAction {
  id: string;
  type: 'scale_up' | 'scale_down' | 'scale_to_target' | 'notify' | 'webhook';
  target: string; // service name or webhook URL
  parameters: {
    instanceCount?: number;
    percentage?: number;
    minInstances?: number;
    maxInstances?: number;
    notificationChannels?: string[];
    webhookPayload?: Record<string, any>;
  };
  delay: number; // seconds before executing
}

export interface WeddingAwareRule {
  id: string;
  name: string;
  condition:
    | 'saturday_peak'
    | 'wedding_season'
    | 'before_wedding'
    | 'during_wedding'
    | 'custom';
  parameters: {
    hoursBeforeWedding?: number;
    weddingCountThreshold?: number;
    seasonMultiplier?: number;
    timeWindow?: { start: string; end: string }; // HH:mm format
    dayOfWeek?: number[]; // 0=Sunday, 6=Saturday
    customCondition?: string;
  };
  scalingModifier: {
    capacityMultiplier: number;
    priorityBoost: number;
    cooldownReduction: number;
  };
  enabled: boolean;
}

export interface PolicyPerformance {
  accuracy: number; // percentage of correct scaling decisions
  averageResponseTime: number; // seconds
  costImpact: number; // percentage cost change
  triggersCount: number;
  successfulScalings: number;
  failedScalings: number;
  lastEvaluated: Date;
}

// Events and notifications
export interface ScalingEvent {
  id: string;
  type:
    | 'scale_up'
    | 'scale_down'
    | 'policy_trigger'
    | 'manual_override'
    | 'emergency_scale';
  service: string;
  timestamp: Date;
  triggeredBy: string; // policy ID or user ID
  reason: string;
  beforeState: {
    instances: number;
    metrics: Record<string, number>;
  };
  afterState: {
    instances: number;
    metrics: Record<string, number>;
  };
  duration: number; // seconds to complete
  success: boolean;
  errorMessage?: string;
  weddingContext?: {
    weddingId?: string;
    weddingDate?: Date;
    expectedGuests?: number;
    weddingType?: string;
  };
}

export interface ScalingAlert {
  id: string;
  level: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  service: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  escalated: boolean;
  escalatedTo?: string[];
  metadata: {
    currentMetrics: Record<string, number>;
    thresholds: Record<string, number>;
    suggestedActions: string[];
  };
}

export interface AlertThreshold {
  id: string;
  metric: string;
  service: string;
  warning: number;
  critical: number;
  emergency: number;
  enabled: boolean;
  notificationChannels: string[];
}

// Wedding-specific structures
export interface WeddingEvent {
  id: string;
  date: Date;
  expectedGuests: number;
  weddingType: 'intimate' | 'standard' | 'large' | 'destination';
  vendors: {
    photographerId: string;
    venueId: string;
    otherVendors: string[];
  };
  expectedLoad: {
    peakTime: Date;
    requestsPerSecond: number;
    uploadVolumeMB: number;
    concurrentUsers: number;
  };
  scalingPlan?: WeddingScalingPlan;
  isHighProfile: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface WeddingScalingPlan {
  id: string;
  weddingId: string;
  preScaleTime: Date;
  peakCapacityPeriod: { start: Date; end: Date };
  postScaleTime: Date;
  targetCapacity: {
    web: number;
    api: number;
    worker: number;
    database: number;
  };
  fallbackPlan: {
    maxCapacity: Record<string, number>;
    emergencyContacts: string[];
    rollbackProcedure: string[];
  };
  status: 'planned' | 'active' | 'completed' | 'failed';
  costEstimate: number;
}

export interface WeddingScalingPrefs {
  autoScaleSaturdays: boolean;
  preScaleBuffer: number; // minutes
  weddingDayMultiplier: number;
  emergencyScalingEnabled: boolean;
  maxCostPerWedding: number;
  notificationChannels: string[];
  fallbackToManual: boolean;
}

export interface WeddingScalePrep {
  weddingId: string;
  scheduledPreScale: Date;
  targetCapacity: Record<string, number>;
  estimatedCost: number;
  duration: number; // hours
  approvedBy: string;
  emergencyContacts: string[];
  rollbackPlan: string[];
}

// Dashboard and UI types
export interface ScalabilityDashboardProps {
  clusterId: string;
  timeRange: TimeRange;
  realTimeUpdates: boolean;
  alertThresholds: AlertThreshold[];
  scalingPolicies: ScalingPolicy[];
  onScalingAction: (action: ManualScalingAction) => void;
  onPolicyUpdate: (policy: ScalingPolicyUpdate) => void;
}

export interface ManualScalingAction {
  service: string;
  action: 'scale_up' | 'scale_down' | 'scale_to_target';
  targetInstances?: number;
  reason: string;
  emergency: boolean;
}

export interface ScalingPolicyCreate {
  name: string;
  service: string;
  description: string;
  triggers: Omit<ScalingTrigger, 'id'>[];
  actions: Omit<ScalingAction, 'id'>[];
  weddingAwareRules: Omit<WeddingAwareRule, 'id'>[];
  cooldownPeriod: number;
  priority: number;
}

export interface ScalingPolicyUpdate {
  id: string;
  name?: string;
  description?: string;
  triggers?: ScalingTrigger[];
  actions?: ScalingAction[];
  weddingAwareRules?: WeddingAwareRule[];
  cooldownPeriod?: number;
  enabled?: boolean;
  priority?: number;
}

// Utility and helper types
export type ScalingStatus =
  | 'stable'
  | 'scaling_up'
  | 'scaling_down'
  | 'emergency'
  | 'maintenance';

export type ChartView = 'timeseries' | 'heatmap' | 'topology';

export type PolicyGroup = 'all' | 'wedding' | 'general' | 'emergency';

export interface ServiceConnection {
  from: string;
  to: string;
  type: 'api_call' | 'database' | 'queue' | 'cache';
  requestRate: number;
  latency: number;
  errorRate: number;
  status: 'healthy' | 'degraded' | 'failed';
}

export interface CapacityProjection {
  service: string;
  currentCapacity: number;
  projectedDemand: MetricDataPoint[];
  recommendedCapacity: number;
  confidenceLevel: number;
  weddingSeasonImpact: number;
  costImplication: number;
}
