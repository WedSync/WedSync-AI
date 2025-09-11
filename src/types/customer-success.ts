// ============================================================================
// WS-168: Customer Success Dashboard - TypeScript Interfaces
// ============================================================================
// Team D - Round 1 Implementation
// Date: 2025-08-27
//
// Type definitions for customer health tracking, success milestones,
// and support interactions for the customer success dashboard.
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Health status categories for customer organizations
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  AT_RISK = 'at_risk',
  CRITICAL = 'critical',
  CHURNING = 'churning',
}

/**
 * Risk levels for customer organizations
 */
export enum RiskLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Payment status for subscriptions
 */
export enum PaymentStatus {
  CURRENT = 'current',
  OVERDUE = 'overdue',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Types of milestones that can be achieved
 */
export enum MilestoneType {
  FIRST_LOGIN = 'first_login',
  FIRST_CLIENT = 'first_client',
  FIRST_FORM = 'first_form',
  FIRST_JOURNEY = 'first_journey',
  FIRST_PAYMENT = 'first_payment',
  TEN_CLIENTS = 'ten_clients',
  FIFTY_CLIENTS = 'fifty_clients',
  HUNDRED_CLIENTS = 'hundred_clients',
  FIRST_MONTH_ACTIVE = 'first_month_active',
  THREE_MONTHS_ACTIVE = 'three_months_active',
  SIX_MONTHS_ACTIVE = 'six_months_active',
  ONE_YEAR_ACTIVE = 'one_year_active',
  FEATURE_POWER_USER = 'feature_power_user',
  HIGH_ENGAGEMENT = 'high_engagement',
  REFERRAL_MADE = 'referral_made',
  CASE_STUDY = 'case_study',
  TESTIMONIAL = 'testimonial',
  CUSTOM = 'custom',
}

/**
 * Types of support interactions
 */
export enum InteractionType {
  CHECK_IN = 'check_in',
  ONBOARDING = 'onboarding',
  TRAINING = 'training',
  SUPPORT_TICKET = 'support_ticket',
  FEATURE_REQUEST = 'feature_request',
  BUG_REPORT = 'bug_report',
  ACCOUNT_REVIEW = 'account_review',
  RETENTION_CALL = 'retention_call',
  UPGRADE_DISCUSSION = 'upgrade_discussion',
  DOWNGRADE_PREVENTION = 'downgrade_prevention',
  CHURN_PREVENTION = 'churn_prevention',
  WIN_BACK = 'win_back',
  FEEDBACK_SESSION = 'feedback_session',
  SUCCESS_PLANNING = 'success_planning',
  ESCALATION = 'escalation',
}

/**
 * Communication channels for support
 */
export enum CommunicationChannel {
  EMAIL = 'email',
  PHONE = 'phone',
  CHAT = 'chat',
  VIDEO = 'video',
  IN_APP = 'in_app',
  TICKET = 'ticket',
}

/**
 * Support interaction status
 */
export enum InteractionStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_CUSTOMER = 'waiting_customer',
  WAITING_INTERNAL = 'waiting_internal',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

/**
 * Priority levels for support interactions
 */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Outcomes of support interactions
 */
export enum InteractionOutcome {
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  DEFERRED = 'deferred',
  NO_RESPONSE = 'no_response',
  CUSTOMER_SATISFIED = 'customer_satisfied',
  CUSTOMER_UNSATISFIED = 'customer_unsatisfied',
  RETAINED = 'retained',
  CHURNED = 'churned',
  UPGRADED = 'upgraded',
  DOWNGRADED = 'downgraded',
}

/**
 * Sentiment analysis results
 */
export enum Sentiment {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  MIXED = 'mixed',
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Risk factor information
 */
export interface RiskFactor {
  type: string;
  severity: RiskLevel;
  description: string;
  detectedAt: Date;
}

/**
 * Feature usage information
 */
export interface FeatureUsage {
  featureId: string;
  name: string;
  lastUsedAt: Date;
  usageCount: number;
  isCore: boolean;
}

/**
 * Customer Health data model
 */
export interface CustomerHealth {
  // Primary key
  id: string;

  // Foreign keys
  organizationId: string;

  // Health metrics (0-100 scale)
  overallHealthScore: number;
  engagementScore?: number;
  featureAdoptionScore?: number;
  activityScore?: number;
  satisfactionScore?: number;

  // Health status
  healthStatus: HealthStatus;

  // Usage metrics
  lastLoginAt?: Date;
  daysSinceLastActivity: number;
  totalLogins30d: number;
  totalActions30d: number;

  // Feature adoption
  featuresUsed: FeatureUsage[];
  featuresTotal: number;
  coreFeaturesAdopted: number;

  // Client metrics
  activeClients: number;
  totalClients: number;
  clientGrowthRate?: number;

  // Engagement metrics
  messagesSent30d: number;
  formsCreated30d: number;
  journeysCreated30d: number;
  documentsUploaded30d: number;

  // Risk indicators
  riskFactors: RiskFactor[];
  riskLevel?: RiskLevel;
  churnProbability?: number;

  // Intervention tracking
  lastInterventionAt?: Date;
  interventionNeeded: boolean;
  interventionReason?: string;

  // Billing & subscription
  subscriptionTier?: string;
  mrrValue?: number;
  paymentStatus?: PaymentStatus;
  nextRenewalDate?: Date;

  // Metadata
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reward information for milestones
 */
export interface MilestoneReward {
  type: string;
  value: any;
  description?: string;
  deliveredAt?: Date;
}

/**
 * Success Milestone data model
 */
export interface SuccessMilestone {
  // Primary key
  id: string;

  // Foreign keys
  organizationId: string;

  // Milestone information
  milestoneType: MilestoneType;
  milestoneName: string;
  milestoneDescription?: string;
  milestoneValue: Record<string, any>;

  // Impact metrics
  healthScoreImpact?: number;
  retentionImpact?: string;

  // Achievement tracking
  achievedAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;

  // Rewards/recognition
  rewardType?: string;
  rewardValue?: MilestoneReward;
  rewardDelivered: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Support Interaction data model
 */
export interface SupportInteraction {
  // Primary key
  id: string;

  // Foreign keys
  organizationId: string;
  initiatedBy?: string;
  assignedTo?: string;

  // Interaction details
  interactionType: InteractionType;
  channel?: CommunicationChannel;

  // Content
  subject: string;
  description?: string;
  notes?: string;

  // Status tracking
  status: InteractionStatus;
  priority: Priority;
  urgencyReason?: string;

  // Outcome tracking
  outcome?: InteractionOutcome;
  outcomeNotes?: string;

  // Health impact
  healthScoreBefore?: number;
  healthScoreAfter?: number;
  healthImpact?: number;

  // Sentiment analysis
  sentiment?: Sentiment;
  sentimentScore?: number;

  // Follow-up tracking
  followUpRequired: boolean;
  followUpDate?: Date;
  followUpCompleted: boolean;

  // Resolution metrics
  responseTimeHours?: number;
  resolutionTimeHours?: number;
  customerEffortScore?: number; // 1-5
  satisfactionRating?: number; // 1-5

  // Related items
  relatedTicketId?: string;
  relatedFeatureId?: string;
  relatedMilestoneId?: string;

  // Timestamps
  interactionAt: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DASHBOARD VIEW MODELS
// ============================================================================

/**
 * Summary statistics for the dashboard
 */
export interface DashboardSummary {
  totalOrganizations: number;
  healthyOrganizations: number;
  atRiskOrganizations: number;
  criticalOrganizations: number;
  averageHealthScore: number;
  totalInterventionsNeeded: number;
  openSupportTickets: number;
  upcomingRenewals: number;
  recentMilestones: number;
  churnRiskOrganizations: number;
}

/**
 * Organization health summary for list views
 */
export interface OrganizationHealthSummary {
  organizationId: string;
  organizationName: string;
  healthScore: number;
  healthStatus: HealthStatus;
  riskLevel?: RiskLevel;
  lastActivity: Date;
  activeClients: number;
  interventionNeeded: boolean;
  upcomingMilestone?: string;
  assignedCSM?: string;
}

/**
 * Intervention queue item
 */
export interface InterventionQueueItem {
  organizationId: string;
  organizationName: string;
  healthScore: number;
  riskLevel: RiskLevel;
  churnProbability?: number;
  interventionReason: string;
  suggestedAction: string;
  priority: Priority;
  daysSinceLastContact?: number;
}

/**
 * Health trend data point
 */
export interface HealthTrendPoint {
  date: Date;
  healthScore: number;
  engagementScore?: number;
  adoptionScore?: number;
  activityScore?: number;
}

/**
 * Health trends for charts
 */
export interface HealthTrends {
  organizationId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  dataPoints: HealthTrendPoint[];
  trend: 'improving' | 'stable' | 'declining';
  trendPercentage: number;
}

// ============================================================================
// API REQUEST/RESPONSE MODELS
// ============================================================================

/**
 * Request to update customer health metrics
 */
export interface UpdateHealthRequest {
  organizationId: string;
  metrics?: {
    engagementScore?: number;
    featureAdoptionScore?: number;
    activityScore?: number;
    satisfactionScore?: number;
  };
  recalculate?: boolean;
}

/**
 * Response from health calculation
 */
export interface HealthCalculationResponse {
  organizationId: string;
  previousScore: number;
  newScore: number;
  scoreChange: number;
  newStatus: HealthStatus;
  interventionTriggered: boolean;
  riskFactorsIdentified: RiskFactor[];
}

/**
 * Request to create support interaction
 */
export interface CreateInteractionRequest {
  organizationId: string;
  interactionType: InteractionType;
  channel?: CommunicationChannel;
  subject: string;
  description?: string;
  priority?: Priority;
  assignedTo?: string;
}

/**
 * Request to acknowledge milestone
 */
export interface AcknowledgeMilestoneRequest {
  milestoneId: string;
  acknowledgedBy: string;
  rewardType?: string;
  rewardValue?: any;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Date range filter
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Health filter options for queries
 */
export interface HealthFilterOptions extends PaginationOptions {
  healthStatus?: HealthStatus[];
  riskLevel?: RiskLevel[];
  interventionNeeded?: boolean;
  minHealthScore?: number;
  maxHealthScore?: number;
  dateRange?: DateRange;
}

/**
 * Interaction filter options for queries
 */
export interface InteractionFilterOptions extends PaginationOptions {
  status?: InteractionStatus[];
  priority?: Priority[];
  interactionType?: InteractionType[];
  assignedTo?: string;
  sentiment?: Sentiment[];
  followUpRequired?: boolean;
  dateRange?: DateRange;
}

/**
 * Milestone filter options for queries
 */
export interface MilestoneFilterOptions extends PaginationOptions {
  milestoneType?: MilestoneType[];
  acknowledged?: boolean;
  rewardDelivered?: boolean;
  dateRange?: DateRange;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  CustomerHealth,
  SuccessMilestone,
  SupportInteraction,
  DashboardSummary,
  OrganizationHealthSummary,
  InterventionQueueItem,
  HealthTrends,
  HealthTrendPoint,
  UpdateHealthRequest,
  HealthCalculationResponse,
  CreateInteractionRequest,
  AcknowledgeMilestoneRequest,
  PaginationOptions,
  DateRange,
  HealthFilterOptions,
  InteractionFilterOptions,
  MilestoneFilterOptions,
  RiskFactor,
  FeatureUsage,
  MilestoneReward,
};
