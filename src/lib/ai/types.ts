// Wedding AI Optimization Types
export interface WeddingContext {
  weddingId: string;
  coupleId: string;
  budget: WeddingBudget;
  timeline: WeddingTimeline;
  weddingDate: Date;
  location: string;
  guestCount: number;
  style: string;
  preferences: CouplePreference[];
  currentVendors: Vendor[];
  venue?: Venue;
  planningProgress: number;
  coupleProfile: CoupleProfile;
}

export interface WeddingBudget {
  total: number;
  allocated: number;
  remaining: number;
  flexibility: number; // 0-1 scale
  allocations: BudgetAllocation[];
  priorities: BudgetPriority[];
  constraints: BudgetConstraint[];
  weddingType: string;
  seasonality: string;
  savingsTargets?: number;
}

export interface BudgetAllocation {
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  priority: 'low' | 'medium' | 'high' | 'essential';
  flexible: boolean;
  notes?: string;
}

export interface BudgetPriority {
  category: string;
  importance: number; // 1-10 scale
  reasoning: string;
  mustHave: boolean;
}

export interface BudgetConstraint {
  type: 'minimum' | 'maximum' | 'fixed';
  category: string;
  amount: number;
  reason: string;
  negotiable: boolean;
}

export interface WeddingTimeline {
  weddingDate: Date;
  tasks: WeddingTask[];
  dependencies: TaskDependency[];
  constraints: TimelineConstraint[];
  coupleAvailability: AvailabilityWindow[];
  vendorRequirements: VendorRequirement[];
  milestones: Milestone[];
}

export interface WeddingTask {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: Date;
  estimatedDuration: number; // in days
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  dependencies: string[]; // task IDs
  assignedTo: string; // vendor or couple
  notes?: string;
  progress?: number; // 0-1
}

export interface TaskDependency {
  taskId: string;
  dependsOn: string[];
  type:
    | 'finish_to_start'
    | 'start_to_start'
    | 'finish_to_finish'
    | 'start_to_finish';
  lag?: number; // days
}

export interface TimelineConstraint {
  type: 'date' | 'duration' | 'sequence';
  description: string;
  startDate?: Date;
  endDate?: Date;
  maxDuration?: number;
  affectedTasks: string[];
}

export interface VendorCriteria {
  budget: number;
  location: string;
  weddingDate: Date;
  preferences: StylePreference[];
  requirements: string[];
  couplePersonality: PersonalityProfile;
  weddingStyle: string;
  mustHaveFeatures: string[];
  dealBreakers: string[];
}

export interface Vendor {
  id: string;
  name: string;
  type: string;
  location: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  availability: Date[];
  pricing: VendorPricing;
  portfolio: string[];
  specialties: string[];
  workingStyle: string[];
  personalityMatch: number;
  responseTime: number;
  cancellationPolicy: string;
}

export interface VendorPricing {
  basePrice: number;
  packages: PricingPackage[];
  additionalServices: AdditionalService[];
  discounts: Discount[];
  paymentTerms: string;
}

export interface PricingPackage {
  name: string;
  price: number;
  description: string;
  includes: string[];
  duration: number;
  maxGuests?: number;
}

export interface CoupleProfile {
  averageAge: number;
  previousExperience: boolean;
  personalityProfile: PersonalityProfile;
  communicationStyle: string;
  decisionMakingStyle: string;
  stressLevel: number; // 1-10
  planningInvolvement: number; // 0-1
  budgetSensitivity: number; // 0-1
  qualitySensitivity: number; // 0-1
}

export interface PersonalityProfile {
  extraversion: number; // 0-1
  openness: number; // 0-1
  conscientiousness: number; // 0-1
  agreeableness: number; // 0-1
  neuroticism: number; // 0-1
  planningStyle: 'detailed' | 'flexible' | 'spontaneous';
  riskTolerance: 'low' | 'medium' | 'high';
}

export interface CouplePreference {
  category: string;
  preference: string;
  importance: number; // 1-10
  reasoning?: string;
  examples?: string[];
}

export interface StylePreference {
  style: string;
  importance: number;
  elements: string[];
  inspiration: string[];
}

export interface OptimizationRequest {
  id: string;
  type: 'comprehensive' | 'budget' | 'vendor' | 'timeline' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: WeddingContext;
  budget: WeddingBudget;
  timeline: WeddingTimeline;
  vendorCriteria: VendorCriteria;
  constraints: OptimizationConstraint[];
  preferences: CouplePreference[];
  goals: OptimizationGoal[];
}

export interface OptimizationConstraint {
  type: 'budget' | 'time' | 'vendor' | 'location' | 'quality';
  description: string;
  value: any;
  negotiable: boolean;
  importance: number; // 1-10
}

export interface OptimizationGoal {
  type:
    | 'cost_savings'
    | 'time_savings'
    | 'quality_improvement'
    | 'stress_reduction';
  target: number;
  priority: number; // 1-10
  measurable: boolean;
}

export interface OptimizationResult {
  id: string;
  type: string;
  status: 'processing' | 'completed' | 'failed';
  processingTime: number;
  qualityScore: number;
  budgetOptimization: BudgetOptimization;
  vendorOptimization: VendorOptimization;
  timelineOptimization: TimelineOptimization;
  recommendations: AIRecommendation[];
  synthesizedPlan: SynthesizedPlan;
  confidence: number;
  potentialSavings: number;
  implementationSteps: ImplementationStep[];
  alternativeOptions: AlternativeOption[];
  riskAssessment: RiskAssessment;
}

export interface BudgetOptimization {
  totalSavings: number;
  optimizedAllocations: BudgetAllocation[];
  qualityMaintained: boolean;
  savingsBreakdown: SavingsBreakdown[];
  riskFactors: string[];
  confidence: number;
  recommendations: BudgetRecommendation[];
}

export interface SavingsBreakdown {
  category: string;
  originalAmount: number;
  optimizedAmount: number;
  savings: number;
  savingsPercentage: number;
  qualityImpact: number; // -1 to 1
  reasoning: string;
}

export interface BudgetRecommendation {
  category: string;
  action: 'reduce' | 'increase' | 'redistribute' | 'eliminate' | 'add';
  amount: number;
  reasoning: string;
  priority: number;
  implementation: string;
}

export interface VendorOptimization {
  matches: VendorMatch[];
  totalSavings: number;
  qualityScore: number;
  compatibilityScore: number;
  recommendations: VendorRecommendation[];
  alternatives: AlternativeVendor[];
}

export interface VendorMatch {
  vendor: Vendor;
  compatibilityScore: number;
  costEfficiency: number;
  qualityScore: number;
  availabilityMatch: number;
  explanations: string[];
  reasoning: MatchReasoning;
  potentialSavings: number;
  riskFactors: string[];
}

export interface MatchReasoning {
  styleMatch: number;
  personalityMatch: number;
  budgetFit: number;
  locationConvenience: number;
  experienceLevel: number;
  portfolioAlignment: number;
  communicationStyle: number;
}

export interface VendorRecommendation {
  vendorId: string;
  action: 'hire' | 'negotiate' | 'consider' | 'avoid' | 'backup';
  reasoning: string;
  confidence: number;
  alternatives: string[];
  negotiationTips?: string[];
}

export interface TimelineOptimization {
  optimizedSchedule: OptimizedTask[];
  conflicts: TimelineConflict[];
  criticalPath: string[];
  bufferRecommendations: BufferRecommendation[];
  efficiencyGains: EfficiencyGain[];
  riskReduction: number;
}

export interface OptimizedTask {
  taskId: string;
  originalDate: Date;
  optimizedDate: Date;
  reasoning: string;
  dependencies: string[];
  bufferDays: number;
  priority: number;
}

export interface TimelineConflict {
  type:
    | 'vendor_availability'
    | 'task_dependency'
    | 'resource_conflict'
    | 'date_constraint';
  description: string;
  affectedTasks: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution: ConflictResolution;
}

export interface ConflictResolution {
  strategy: string;
  steps: string[];
  impact: string;
  alternatives: string[];
}

export interface AIRecommendation {
  id: string;
  title: string;
  summary: string;
  category: string;
  description: string;
  confidence: number;
  personalizedReasoning: string;
  implementationComplexity: number; // 1-10
  potentialImpact: number; // 0-1
  potentialSavings?: number;
  implementationTime: number; // days
  implementationSteps: ImplementationStep[];
  benefits: string[];
  risks: string[];
  alternatives: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeframe: string;
  costImpact: number; // negative = savings, positive = investment
  qualityImpact: number; // -1 to 1
  stressImpact: number; // -1 to 1 (negative = reduces stress)
  affectedVendors?: string[];
}

export interface ImplementationStep {
  order: number;
  title: string;
  description: string;
  estimatedTime: number;
  difficulty: number; // 1-10
  dependencies: string[];
  assignedTo: 'couple' | 'vendor' | 'planner' | 'automated';
  dueDate?: Date;
  resources: string[];
  checkpoints: string[];
}

export interface SynthesizedPlan {
  overview: string;
  totalSavings: number;
  timeToImplement: number;
  qualityScore: number;
  riskLevel: number;
  prioritizedActions: PrioritizedAction[];
  contingencyPlans: ContingencyPlan[];
  successMetrics: SuccessMetric[];
}

export interface PrioritizedAction {
  priority: number;
  action: string;
  category: string;
  timeframe: string;
  impact: number;
  difficulty: number;
  dependencies: string[];
}

export interface WeddingCrisis {
  id: string;
  type:
    | 'vendor_cancellation'
    | 'venue_unavailable'
    | 'budget_shortfall'
    | 'timeline_conflict'
    | 'weather_emergency'
    | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  weddingDate: Date;
  location: string;
  affectedVendors: string[];
  availableBudget: number;
  minimumRequirements: string[];
  timeToWedding: number; // days
  description: string;
  constraints: CrisisConstraint[];
}

export interface CrisisConstraint {
  type: string;
  description: string;
  negotiable: boolean;
  impact: number; // 1-10
}

export interface CrisisOptimization {
  id: string;
  crisisType: string;
  responseTime: number;
  solutions: EmergencySolution[];
  alternativeVendors: Vendor[];
  actionPlan: EmergencyActionPlan;
  riskAssessment: RiskAssessment;
  communicationPlan: CommunicationPlan;
  followUpActions: FollowUpAction[];
}

export interface EmergencySolution {
  id: string;
  title: string;
  description: string;
  feasibility: number; // 0-1
  cost: number;
  timeToImplement: number; // hours
  qualityImpact: number; // -1 to 1
  steps: string[];
  resources: string[];
  risks: string[];
  alternatives: string[];
}

export interface EmergencyActionPlan {
  immediateActions: ImmediateAction[];
  shortTermActions: Action[];
  longTermActions: Action[];
  contingencies: string[];
  timeline: ActionTimeline[];
}

export interface ImmediateAction {
  action: string;
  timeframe: string; // "within X hours"
  responsible: string;
  priority: 'critical' | 'high' | 'medium';
  dependencies: string[];
  success_criteria: string[];
}

export interface Action {
  action: string;
  timeframe: string;
  responsible: string;
  priority: 'high' | 'medium' | 'low';
  cost?: number;
  resources: string[];
}

export interface ActionTimeline {
  hour: number;
  actions: string[];
  milestones: string[];
  checkpoints: string[];
}

export interface RiskAssessment {
  overallRisk: number; // 0-1
  riskFactors: RiskFactor[];
  mitigationStrategies: MitigationStrategy[];
  contingencyPlans: ContingencyPlan[];
  monitoringPoints: string[];
}

export interface RiskFactor {
  type: string;
  description: string;
  probability: number; // 0-1
  impact: number; // 1-10
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
}

export interface MitigationStrategy {
  riskType: string;
  strategy: string;
  implementation: string[];
  effectiveness: number; // 0-1
  cost: number;
}

export interface ContingencyPlan {
  scenario: string;
  trigger: string;
  actions: string[];
  resources: string[];
  timeline: string;
  success_criteria: string[];
}

export interface CommunicationPlan {
  coupleNotification: NotificationPlan;
  vendorCommunication: VendorCommunication[];
  stakeholderUpdates: StakeholderUpdate[];
  mediaStrategy?: MediaStrategy;
  timeline: CommunicationTimeline[];
}

export interface NotificationPlan {
  method: 'call' | 'email' | 'sms' | 'app' | 'in_person';
  urgency: 'immediate' | 'within_hour' | 'within_day';
  message: string;
  followUp: string[];
  supportResources: string[];
}

export interface VendorCommunication {
  vendorId: string;
  message: string;
  urgency: 'immediate' | 'urgent' | 'normal';
  method: 'call' | 'email' | 'platform';
  expectedResponse: string;
  escalation: string;
}

export interface StakeholderUpdate {
  stakeholder: string;
  message: string;
  timing: string;
  method: string;
  includes: string[];
}

export interface CommunicationTimeline {
  timeframe: string;
  communications: string[];
  responsible: string;
  success_criteria: string[];
}

export interface OptimizationFeedback {
  optimizationId: string;
  recommendationId?: string;
  type:
    | 'budget_optimization'
    | 'vendor_match'
    | 'timeline_optimization'
    | 'personal_preference'
    | 'crisis_response';
  rating: number; // 1-5
  outcome: 'accepted' | 'rejected' | 'modified' | 'pending';
  userComments?: string;
  actualSavings?: number;
  actualTimeline?: number;
  satisfactionScore: number; // 0-1
  wouldRecommendToOthers?: boolean;
  improvements?: string[];
  rejectionReason?: string;
  modificationDetails?: string[];
}

export interface AlternativeOption {
  id: string;
  title: string;
  description: string;
  type: 'vendor' | 'timeline' | 'budget' | 'approach';
  pros: string[];
  cons: string[];
  cost: number;
  timeImpact: number;
  qualityImpact: number;
  implementationDifficulty: number;
  confidence: number;
}

export interface SuccessMetric {
  metric: string;
  target: number;
  current: number;
  unit: string;
  priority: number;
  measurableBy: string;
  frequency: string;
}

export interface FollowUpAction {
  action: string;
  timeframe: string;
  responsible: string;
  success_criteria: string[];
  dependencies: string[];
  priority: number;
}

// Machine Learning Types
export interface MLConfig {
  modelVersion: string;
  updateFrequency: 'never' | 'daily' | 'weekly' | 'monthly';
  learningRate?: number;
  batchSize?: number;
  features?: string[];
}

export interface MLModel {
  id: string;
  type: string;
  version: string;
  accuracy: number;
  lastTrained: Date;
  predict(features: any): Promise<MLPrediction>;
  train(data: TrainingData[]): Promise<void>;
  evaluate(testData: TrainingData[]): Promise<ModelEvaluation>;
}

export interface MLPrediction {
  prediction: any;
  confidence: number;
  features: string[];
  explanation?: string;
}

export interface TrainingData {
  inputs: any;
  outputs: any;
  metadata?: any;
  timestamp: Date;
}

export interface ModelEvaluation {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][];
}

export interface RecommendationFeatures {
  personalFeatures: PersonalFeatures;
  budgetFeatures: BudgetFeatures;
  vendorFeatures: VendorFeatures;
  timelineFeatures: TimelineFeatures;
}

export interface PersonalFeatures {
  coupleAge: number;
  weddingStyle: number[];
  budgetLevel: number;
  locationFeatures: number[];
  seasonality: number;
  guestCount: number;
  planningTimeframe: number;
  previousWeddingExperience: boolean;
}

export interface BudgetFeatures {
  totalBudget: number;
  budgetFlexibility: number;
  priorityCategories: number[];
  currentAllocations: number[];
  savingsGoals: number;
}

export interface VendorFeatures {
  requiredVendorTypes: number[];
  stylePreferences: number[];
  locationConstraints: number[];
  budgetConstraints: number[];
}

export interface TimelineFeatures {
  weddingDate: number;
  planningProgress: number;
  taskComplexity: number;
  dependencyCount: number;
  timeToWedding: number;
}

export interface BudgetPrediction {
  optimizedAllocations: BudgetAllocation[];
  potentialSavings: number;
  confidence: number;
  riskFactors: string[];
  recommendations: BudgetRecommendation[];
}

export interface CompatibilityScore {
  overallCompatibility: number;
  styleMatch: number;
  personalityMatch: number;
  budgetFit: number;
  communicationStyle: number;
  workingRelationshipPrediction: number;
  confidenceLevel: number;
  reasoningFactors: string[];
}

export interface TimelineSuccessPrediction {
  successProbability: number;
  potentialConflicts: TimelineConflict[];
  optimizationSuggestions: TimelineOptimization[];
  riskFactors: string[];
  criticalPath: string[];
  bufferRecommendations: BufferRecommendation[];
}

export interface BufferRecommendation {
  taskId: string;
  currentBuffer: number;
  recommendedBuffer: number;
  reasoning: string;
  impact: string;
  priority: number;
}

export interface EfficiencyGain {
  area: string;
  currentDuration: number;
  optimizedDuration: number;
  timeSaved: number;
  method: string;
  confidence: number;
}

// AI Engine Configuration
export interface AIEngineConfig {
  openaiApiKey: string;
  mlConfig: MLConfig;
  budgetConfig: BudgetAIConfig;
  vendorConfig: VendorAIConfig;
  timelineConfig: TimelineAIConfig;
  personalizationConfig: PersonalizationConfig;
}

export interface BudgetAIConfig {
  maxSavingsTarget: number;
  minQualityThreshold: number;
  conservativeMode?: boolean;
  riskTolerance?: number;
}

export interface VendorAIConfig {
  matchingAlgorithm: 'ensemble' | 'collaborative' | 'content_based' | 'hybrid';
  personalityWeighting: number;
  qualityThreshold?: number;
  diversityFactor?: number;
}

export interface TimelineAIConfig {
  bufferDays: number;
  criticalPathOptimization: boolean;
  riskMitigation?: boolean;
  parallelization?: boolean;
}

export interface PersonalizationConfig {
  learningRate: number;
  memoryWindow: number; // days
  adaptationRate?: number;
  privacyLevel?: 'high' | 'medium' | 'low';
}

// Error Types
export class OptimizationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'OptimizationError';
  }
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public service?: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class MLModelError extends Error {
  constructor(
    message: string,
    public modelType?: string,
    public operation?: string,
  ) {
    super(message);
    this.name = 'MLModelError';
  }
}

// Utility Types
export type WeddingPhase =
  | 'planning'
  | 'one_month'
  | 'one_week'
  | 'day_of'
  | 'post_wedding';
export type OptimizationType =
  | 'cost'
  | 'quality'
  | 'time'
  | 'stress'
  | 'satisfaction';
export type RecommendationCategory =
  | 'budget'
  | 'vendor'
  | 'timeline'
  | 'style'
  | 'logistics'
  | 'experience';
export type CrisisSeverity = 'low' | 'medium' | 'high' | 'critical';
export type VendorType =
  | 'photographer'
  | 'videographer'
  | 'florist'
  | 'caterer'
  | 'venue'
  | 'dj'
  | 'band'
  | 'makeup'
  | 'hair'
  | 'cake'
  | 'transportation'
  | 'officiant'
  | 'planner';

// Additional Types for Advanced Features
export interface UserInteraction {
  timestamp: Date;
  type: 'view' | 'click' | 'save' | 'share' | 'rate' | 'comment';
  item: string;
  context: any;
  duration?: number;
}

export interface ContextAnalysis {
  budgetChallenges: string[];
  timelineRisks: string[];
  vendorGaps: string[];
  opportunities: string[];
  stressFactors: string[];
  successFactors: string[];
}

export interface OptimizationSynthesisData {
  budget: BudgetOptimization;
  vendors: VendorOptimization;
  timeline: TimelineOptimization;
  recommendations: AIRecommendation[];
  originalRequest: OptimizationRequest;
}

export interface PreferencePrediction {
  predicted_preference: any;
  confidence: number;
  reasoning: string[];
  similar_users: string[];
}

export interface WeddingTrainingData {
  context: WeddingContext;
  optimizations: OptimizationResult;
  feedback: OptimizationFeedback;
  outcome: WeddingOutcome;
}

export interface WeddingOutcome {
  actualCost: number;
  plannedCost: number;
  satisfactionScore: number;
  stressLevel: number;
  timeToComplete: number;
  vendorSatisfaction: number;
  guestSatisfaction?: number;
  wouldUseAgain: boolean;
}

export interface MLModelResult {
  success: boolean;
  accuracy: number;
  improvements: string[];
  version: string;
  deployedAt?: Date;
}

export interface ModelUpdateResult {
  modelsUpdated: string[];
  improvementGains: { [model: string]: number };
  newAccuracy: { [model: string]: number };
  errors?: string[];
}

export interface WeddingData {
  context: WeddingContext;
  outcome: WeddingOutcome;
  feedback: OptimizationFeedback;
  timeline: WeddingTimeline;
  vendors: Vendor[];
}

export interface RecommendationItem {
  type: string;
  content: any;
  metadata: any;
}

export interface AlternativeVendor {
  vendor: Vendor;
  reason: string;
  confidence: number;
  costImpact: number;
  availabilityMatch: number;
}

export interface Venue {
  id: string;
  name: string;
  location: string;
  capacity: number;
  pricing: VendorPricing;
  amenities: string[];
  restrictions: string[];
  availability: Date[];
}

export interface AdditionalService {
  name: string;
  price: number;
  description: string;
  duration?: number;
  requirements?: string[];
}

export interface Discount {
  type: 'percentage' | 'fixed' | 'package' | 'seasonal';
  amount: number;
  description: string;
  conditions: string[];
  validUntil?: Date;
}

export interface AvailabilityWindow {
  start: Date;
  end: Date;
  type: 'available' | 'preferred' | 'avoid';
  notes?: string;
}

export interface VendorRequirement {
  vendorType: string;
  requirements: string[];
  timeline: string;
  dependencies: string[];
}

export interface Milestone {
  id: string;
  title: string;
  date: Date;
  description: string;
  tasks: string[];
  critical: boolean;
}

export interface MediaStrategy {
  channels: string[];
  messaging: string;
  timeline: string;
  spokesperson: string;
}

// Helper functions for ID generation
export function generateOptimizationId(): string {
  return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateRecommendationId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateCrisisOptimizationId(): string {
  return `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
