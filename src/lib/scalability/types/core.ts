/**
 * WS-340: Scalability Infrastructure Backend Engine - Core Types
 * Team B - Backend/API Development
 *
 * Enterprise-grade scalability types with wedding-aware intelligence
 */

export interface ScalabilityBackendEngine {
  // Core scaling operations
  executeScalingDecision(decision: ScalingDecision): Promise<ScalingResult>;
  analyzeSystemMetrics(metrics: SystemMetrics): Promise<MetricsAnalysis>;
  predictCapacityNeeds(forecast: CapacityForecast): Promise<CapacityPrediction>;
  orchestrateInfrastructureChange(
    change: InfrastructureChange,
  ): Promise<OrchestrationResult>;

  // Wedding-specific scaling
  prepareWeddingDayScaling(wedding: WeddingEvent): Promise<WeddingScalingPrep>;
  executeWeddingAwareScaling(
    context: WeddingContext,
  ): Promise<WeddingScalingResult>;
  optimizeWeddingSeasonCapacity(
    season: WeddingSeason,
  ): Promise<SeasonOptimization>;

  // Performance monitoring
  collectRealTimeMetrics(services: string[]): Promise<MetricsCollection>;
  analyzePeformanceBottlenecks(
    analysis: PerformanceAnalysis,
  ): Promise<BottleneckReport>;
  generateCapacityRecommendations(
    usage: UsagePattern,
  ): Promise<CapacityRecommendations>;
}

// Core Scaling Types
export interface ScalingDecision {
  decisionId: string;
  timestamp: Date;
  service: string;
  currentInstances: number;
  targetInstances: number;
  scalingReason: ScalingReason;
  weddingContext?: WeddingScalingContext;
  confidence: number;
  estimatedCost: number;
  rollbackPlan: RollbackPlan;
}

export interface WeddingScalingContext {
  weddingId?: string;
  weddingDate: Date;
  expectedGuests: number;
  vendorCount: number;
  weddingType: 'intimate' | 'medium' | 'large' | 'luxury';
  predictedLoad: LoadPrediction;
  scalingPriority: ScalingPriority;
}

export interface SystemMetrics {
  timestamp: Date;
  services: ServiceMetrics[];
  infrastructure: InfrastructureMetrics;
  application: ApplicationMetrics;
  wedding: WeddingMetrics;
  costs: CostMetrics;
}

export interface ServiceMetrics {
  serviceName: string;
  instances: number;
  minInstances: number;
  maxInstances: number;
  currentMetrics: {
    cpuUtilization: number;
    memoryUtilization: number;
    requestRate: number;
    averageResponseTime: number;
    errorRate: number;
  };
  scalingThresholds: {
    cpuScaleUp: number;
    cpuScaleDown: number;
    memoryScaleUp: number;
    memoryScaleDown: number;
    requestRateScaleUp: number;
    responseTimeThreshold: number;
    queueDepthThreshold?: number;
  };
  queueMetrics?: {
    depth: number;
    processingRate: number;
    averageWaitTime: number;
  };
}

export interface InfrastructureMetrics {
  totalCpuCapacity: number;
  totalMemoryCapacity: number;
  networkThroughput: number;
  storageUtilization: number;
  availabilityZones: AvailabilityZoneMetrics[];
}

export interface AvailabilityZoneMetrics {
  zone: string;
  cpuUtilization: number;
  memoryUtilization: number;
  networkLatency: number;
  healthScore: number;
}

export interface ApplicationMetrics {
  activeUsers: number;
  concurrentSessions: number;
  dataTransfer: number;
  databaseConnections: number;
  cacheHitRate: number;
  apiCallVolume: number;
}

export interface WeddingMetrics {
  activeWeddings: number;
  upcomingWeddings: number;
  weddingDayActivity: WeddingDayActivity[];
  seasonalTrends: SeasonalTrends;
  vendorActivity: VendorActivityMetrics;
}

export interface WeddingDayActivity {
  weddingId: string;
  weddingDate: Date;
  currentPhase: WeddingPhase;
  activityLevel: 'low' | 'medium' | 'high' | 'peak';
  userEngagement: UserEngagementMetrics;
}

export interface CostMetrics {
  currentHourlyRate: number;
  projectedDailyCost: number;
  projectedMonthlyCost: number;
  costPerRequest: number;
  costPerUser: number;
  optimizationSavings: number;
}

// Scaling Decision Types
export type ScalingReason =
  | 'cpu_utilization'
  | 'memory_utilization'
  | 'request_rate'
  | 'response_time'
  | 'queue_depth'
  | 'wedding_day_prep'
  | 'seasonal_demand'
  | 'cost_optimization'
  | 'predictive_scaling'
  | 'emergency_response';

export type ScalingPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'emergency';

export type WeddingPhase =
  | 'planning'
  | 'preparation'
  | 'ceremony_prep'
  | 'ceremony'
  | 'reception'
  | 'cleanup'
  | 'post_wedding';

// Prediction Types
export interface LoadPrediction {
  predictedLoad: number;
  confidence: number;
  timeframe: string;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  factor: string;
  impact: number;
  confidence: number;
}

export interface CapacityForecast {
  timeRange: {
    start: Date;
    end: Date;
  };
  expectedDemand: DemandPattern[];
  historicalData: HistoricalPattern[];
  seasonalFactors: SeasonalFactor[];
}

export interface DemandPattern {
  timestamp: Date;
  expectedLoad: number;
  weddingEvents: WeddingEvent[];
  confidence: number;
}

export interface HistoricalPattern {
  period: string;
  averageLoad: number;
  peakLoad: number;
  scalingEvents: ScalingEvent[];
}

export interface SeasonalFactor {
  factor: string;
  multiplier: number;
  timeRange: {
    start: string; // MM-DD format
    end: string; // MM-DD format
  };
}

// Wedding-Specific Types
export interface WeddingEvent {
  id: string;
  date: Date;
  type: 'intimate' | 'medium' | 'large' | 'luxury';
  expectedGuests: number;
  vendors: WeddingVendor[];
  venue: WeddingVenue;
  schedule: WeddingSchedule;
  predictedLoad: LoadPrediction;
}

export interface WeddingVendor {
  id: string;
  type: string;
  expectedActivity: ActivityLevel;
}

export interface WeddingVenue {
  id: string;
  type: string;
  capacity: number;
  techRequirements: TechRequirement[];
}

export interface WeddingSchedule {
  events: ScheduledEvent[];
  duration: number;
  timeZone: string;
}

export interface ScheduledEvent {
  name: string;
  startTime: Date;
  duration: number;
  expectedActivity: ActivityLevel;
}

export type ActivityLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'peak';

export interface TechRequirement {
  type: string;
  priority: 'nice_to_have' | 'important' | 'critical';
  resourceImpact: number;
}

// Result Types
export interface ScalingResult {
  decisionId: string;
  success: boolean;
  actualInstances: number;
  executionTime: number;
  errors?: ScalingError[];
  metrics: PostScalingMetrics;
}

export interface ScalingError {
  code: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  recoverable: boolean;
}

export interface PostScalingMetrics {
  cpuUtilization: number;
  memoryUtilization: number;
  responseTime: number;
  throughput: number;
  costImpact: number;
}

export interface MetricsAnalysis {
  overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
  trends: Trend[];
  anomalies: Anomaly[];
}

export interface Bottleneck {
  service: string;
  type: string;
  severity: 'minor' | 'moderate' | 'severe';
  impact: string;
  recommendation: string;
}

export interface Recommendation {
  type: 'scaling' | 'optimization' | 'configuration';
  priority: 'low' | 'medium' | 'high';
  description: string;
  estimatedImpact: string;
  estimatedCost: number;
}

export interface Trend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number;
  significance: 'low' | 'medium' | 'high';
}

export interface Anomaly {
  metric: string;
  detectedAt: Date;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  possibleCauses: string[];
}

// Infrastructure Types
export interface InfrastructureChange {
  changeId: string;
  type: 'scale_up' | 'scale_down' | 'reconfigure' | 'migrate';
  targetServices: string[];
  parameters: Record<string, any>;
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OrchestrationResult {
  changeId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  progress: number;
  completedActions: string[];
  remainingActions: string[];
  estimatedCompletion?: Date;
}

export interface RollbackPlan {
  planId: string;
  steps: RollbackStep[];
  estimatedDuration: number;
  riskAssessment: string;
}

export interface RollbackStep {
  stepId: string;
  description: string;
  action: () => Promise<void>;
  estimatedDuration: number;
  dependencies: string[];
}

// Capacity and Prediction Result Types
export interface CapacityPrediction {
  forecastId: string;
  predictions: TimedPrediction[];
  recommendations: CapacityRecommendation[];
  confidence: number;
  validUntil: Date;
}

export interface TimedPrediction {
  timestamp: Date;
  predictedCapacityNeed: number;
  confidence: number;
  drivingFactors: string[];
}

export interface CapacityRecommendation {
  type: 'scale_up' | 'scale_down' | 'maintain';
  service: string;
  recommendedInstances: number;
  timing: Date;
  reasoning: string;
  estimatedCost: number;
}

export interface WeddingScalingPrep {
  weddingId: string;
  prepActions: PrepAction[];
  monitoringPlan: MonitoringPlan;
  rollbackStrategy: RollbackStrategy;
}

export interface PrepAction {
  actionId: string;
  type: 'pre_scale' | 'configure' | 'cache_warm' | 'health_check';
  scheduledTime: Date;
  description: string;
  estimatedDuration: number;
}

export interface MonitoringPlan {
  metrics: string[];
  thresholds: Record<string, number>;
  alerting: AlertingConfiguration;
}

export interface AlertingConfiguration {
  channels: string[];
  escalation: EscalationRule[];
  suppressions: SuppressionRule[];
}

export interface EscalationRule {
  condition: string;
  delay: number;
  action: string;
}

export interface SuppressionRule {
  condition: string;
  duration: number;
}

export interface RollbackStrategy {
  triggers: string[];
  actions: RollbackAction[];
  maxDuration: number;
}

export interface RollbackAction {
  actionId: string;
  type: string;
  parameters: Record<string, any>;
  order: number;
}

export interface WeddingScalingResult {
  weddingId: string;
  executionResults: ScalingResult[];
  overallSuccess: boolean;
  performanceImpact: PerformanceImpact;
  costImpact: number;
}

export interface PerformanceImpact {
  responseTimeChange: number;
  throughputChange: number;
  errorRateChange: number;
  userExperienceScore: number;
}

export interface SeasonOptimization {
  seasonId: string;
  optimizations: Optimization[];
  estimatedSavings: number;
  implementationPlan: ImplementationPlan;
}

export interface Optimization {
  type: string;
  description: string;
  estimatedImpact: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ImplementationPlan {
  phases: ImplementationPhase[];
  totalDuration: number;
  dependencies: string[];
}

export interface ImplementationPhase {
  phaseId: string;
  name: string;
  actions: string[];
  duration: number;
  prerequisites: string[];
}

// Collection and Analysis Types
export interface MetricsCollection {
  collectionId: string;
  metrics: ServiceMetrics[];
  timestamp: Date;
  completeness: number;
  quality: number;
}

export interface PerformanceAnalysis {
  analysisId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  services: string[];
  depth: 'shallow' | 'standard' | 'deep';
}

export interface BottleneckReport {
  reportId: string;
  bottlenecks: IdentifiedBottleneck[];
  systemImpact: SystemImpact;
  recommendations: BottleneckRecommendation[];
}

export interface IdentifiedBottleneck {
  location: string;
  type: string;
  severity: number;
  impact: string;
  evidence: Evidence[];
}

export interface Evidence {
  type: string;
  data: any;
  confidence: number;
}

export interface SystemImpact {
  overallPerformanceReduction: number;
  affectedUsers: number;
  estimatedRevenueLoss: number;
}

export interface BottleneckRecommendation {
  bottleneckId: string;
  recommendations: string[];
  estimatedEffort: number;
  expectedImprovement: number;
}

export interface UsagePattern {
  patternId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  pattern: UsageDataPoint[];
  characteristics: PatternCharacteristic[];
}

export interface UsageDataPoint {
  timestamp: Date;
  usage: number;
  context: Record<string, any>;
}

export interface PatternCharacteristic {
  type: string;
  value: number;
  significance: number;
}

export interface CapacityRecommendations {
  recommendationId: string;
  timeframe: string;
  recommendations: IndividualCapacityRecommendation[];
  overallStrategy: string;
  estimatedCost: number;
}

export interface IndividualCapacityRecommendation {
  service: string;
  currentCapacity: number;
  recommendedCapacity: number;
  reasoning: string;
  timeline: string;
  costImpact: number;
}

// Wedding Season Types
export interface WeddingSeason {
  year: number;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  weeks: WeekDefinition[];
  characteristics: SeasonCharacteristics;
  bufferRequirements: BufferRequirements;
}

export interface WeekDefinition {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  expectedWeddings: number;
}

export interface SeasonCharacteristics {
  averageWeddingSize: number;
  peakDays: string[];
  traditionalPatterns: string[];
  regionalFactors: string[];
}

export interface BufferRequirements {
  minimumBuffer: number;
  recommendedBuffer: number;
  peakDayBuffer: number;
}

// Additional Supporting Types
export interface UserEngagementMetrics {
  activeUsers: number;
  sessionDuration: number;
  pageViews: number;
  interactions: number;
}

export interface SeasonalTrends {
  currentTrend: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number;
  seasonalMultiplier: number;
  historicalComparison: number;
}

export interface VendorActivityMetrics {
  activeVendors: number;
  averageEngagement: number;
  peakActivityTimes: string[];
  serviceUtilization: Record<string, number>;
}

export interface ScalingEvent {
  eventId: string;
  timestamp: Date;
  type: 'scale_up' | 'scale_down';
  trigger: string;
  success: boolean;
  impact: string;
}

// Enums and Constants
export const SCALING_THRESHOLDS = {
  CPU_SCALE_UP: 80,
  CPU_SCALE_DOWN: 30,
  MEMORY_SCALE_UP: 85,
  MEMORY_SCALE_DOWN: 40,
  RESPONSE_TIME_THRESHOLD: 1000, // ms
  ERROR_RATE_THRESHOLD: 0.01, // 1%
  QUEUE_DEPTH_THRESHOLD: 100,
} as const;

export const WEDDING_SCALING_PRIORITIES = {
  WEDDING_DAY: 'critical',
  WEEK_BEFORE: 'high',
  MONTH_BEFORE: 'medium',
  PLANNING_PHASE: 'low',
} as const;

export const SCALING_COOLDOWN_PERIODS = {
  SCALE_UP: 300000, // 5 minutes
  SCALE_DOWN: 900000, // 15 minutes
  EMERGENCY: 60000, // 1 minute
  WEDDING_DAY: 180000, // 3 minutes
} as const;

// Additional shared types for scaling recommendations (moved from intelligent-auto-scaling-engine.ts to avoid circular dependencies)
export interface ScalingRecommendation {
  recommendationId: string;
  service: string;
  type: 'scale_up' | 'scale_down';
  currentInstances: number;
  targetInstances: number;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  confidence: number;
  estimatedCost: number;
  estimatedBenefit: number;
  requiresStabilization: boolean;
  weddingContext?: {
    isWeddingRelated: boolean;
    priority: string;
    weddingId?: string;
    weddingDate?: Date;
    weddingCount: number;
  };
}

export interface WeddingContext {
  hasUpcomingWeddings: boolean;
  upcomingWeddings: any[];
  isWeddingSeason: boolean;
  seasonalMultiplier: number;
  criticalPeriod: boolean;
}

export interface ScalingContext {
  systemAnalysis: MetricsAnalysis;
  weddingContext: WeddingContext;
  historicalPatterns: any;
  costConstraints: any;
}
