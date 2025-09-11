// Viral Growth Types for WS-342 Real-Time Wedding Collaboration
// Team D Platform Development - Viral growth tracking types

export interface ViralAction {
  actionType: ViralActionType;
  userId: string;
  platform: 'wedsync' | 'wedme';
  weddingId: string;
  targetUsers: string[];
  virality: ViralityScore;

  // Growth context
  invitationGenerated: boolean;
  newUserPotential: number;
  networkEffect: NetworkEffect;

  // Tracking
  timestamp: Date;
  trackingId: string;
  campaignId?: string;
}

export type ViralActionType =
  | 'couple_invites_vendor'
  | 'vendor_recommends_vendor'
  | 'wedding_shared_publicly'
  | 'review_published'
  | 'collaboration_showcased'
  | 'referral_program_used'
  | 'social_media_shared';

export type ViralityScore =
  | 'very_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high';

export type NetworkEffect = 'none' | 'low' | 'medium' | 'high' | 'viral';

export interface GrowthAnalysis {
  totalGrowthPotential: number;
  immediateOpportunities: GrowthOpportunity[];
  mediumTermOpportunities: GrowthOpportunity[];
  longTermOpportunities: GrowthOpportunity[];
  recommendedActions: GrowthRecommendation[];

  // Metrics
  currentViralCoefficient: number;
  projectedGrowth: GrowthProjection;
  competitiveAnalysis: CompetitiveInsight[];
}

export interface GrowthOpportunity {
  id: string;
  type: GrowthOpportunityType;
  potential: number; // 0-1 scale
  timeline: GrowthTimeline;
  effort: EffortLevel;
  confidence: number; // 0-1 scale

  // Context
  description: string;
  requirements: string[];
  expectedOutcome: ExpectedOutcome;
  risks: GrowthRisk[];
}

export type GrowthOpportunityType =
  | 'vendor_invitation'
  | 'network_expansion'
  | 'referral_optimization'
  | 'viral_content'
  | 'platform_integration'
  | 'social_sharing'
  | 'collaboration_showcase';

export type GrowthTimeline =
  | 'immediate' // 0-7 days
  | 'short' // 1-4 weeks
  | 'medium' // 1-3 months
  | 'long'; // 3+ months

export type EffortLevel = 'minimal' | 'low' | 'medium' | 'high' | 'extensive';

export interface ExpectedOutcome {
  newUsers: number;
  conversionRate: number;
  revenueImpact: number;
  timeToRealize: number; // days
  sustainability: SustainabilityLevel;
}

export type SustainabilityLevel =
  | 'one_time'
  | 'short_term'
  | 'ongoing'
  | 'compound';

export interface GrowthRisk {
  type: RiskType;
  probability: number; // 0-1 scale
  impact: RiskImpact;
  mitigation: string;
}

export type RiskType =
  | 'low_conversion'
  | 'user_churn'
  | 'negative_feedback'
  | 'technical_failure'
  | 'market_saturation'
  | 'competitive_response';

export type RiskImpact = 'minimal' | 'low' | 'medium' | 'high' | 'critical';

export interface GrowthRecommendation {
  id: string;
  priority: RecommendationPriority;
  action: string;
  rationale: string;
  expectedImpact: ExpectedOutcome;
  implementation: ImplementationPlan;

  // Tracking
  status: RecommendationStatus;
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
}

export type RecommendationPriority =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'optional';

export type RecommendationStatus =
  | 'pending'
  | 'in_progress'
  | 'testing'
  | 'completed'
  | 'cancelled';

export interface ImplementationPlan {
  steps: ImplementationStep[];
  resources: RequiredResource[];
  timeline: number; // days
  dependencies: string[];
  successMetrics: SuccessMetric[];
}

export interface ImplementationStep {
  order: number;
  description: string;
  duration: number; // days
  owner: string;
  prerequisites: string[];
  deliverables: string[];
}

export interface RequiredResource {
  type: ResourceType;
  quantity: number;
  duration: number; // days
  description: string;
}

export type ResourceType =
  | 'developer_time'
  | 'designer_time'
  | 'marketing_budget'
  | 'infrastructure'
  | 'third_party_service'
  | 'content_creation';

export interface SuccessMetric {
  name: string;
  target: number;
  measurement: MeasurementMethod;
  timeframe: number; // days
}

export type MeasurementMethod =
  | 'signup_count'
  | 'conversion_rate'
  | 'engagement_rate'
  | 'retention_rate'
  | 'revenue_generated'
  | 'viral_coefficient';

export interface GrowthProjection {
  timeframe: ProjectionTimeframe;
  scenarios: GrowthScenario[];
  assumptions: GrowthAssumption[];
  confidenceInterval: ConfidenceInterval;
}

export type ProjectionTimeframe = '30_days' | '90_days' | '6_months' | '1_year';

export interface GrowthScenario {
  name: string;
  probability: number; // 0-1 scale
  newUsers: number;
  revenue: number;
  viralCoefficient: number;
  description: string;
}

export interface GrowthAssumption {
  description: string;
  confidence: number; // 0-1 scale
  impact: AssumptionImpact;
  validation: ValidationMethod;
}

export type AssumptionImpact = 'low' | 'medium' | 'high' | 'critical';

export type ValidationMethod =
  | 'historical_data'
  | 'market_research'
  | 'user_testing'
  | 'expert_opinion'
  | 'assumption';

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidence: number; // e.g., 0.95 for 95%
}

export interface CompetitiveInsight {
  competitor: string;
  strength: CompetitiveStrength;
  weakness: CompetitiveWeakness;
  opportunity: CompetitiveOpportunity;
  threat: CompetitiveThreat;
}

export interface CompetitiveStrength {
  area: string;
  description: string;
  impact: CompetitiveImpact;
}

export interface CompetitiveWeakness {
  area: string;
  description: string;
  exploitable: boolean;
  difficulty: ExploitationDifficulty;
}

export interface CompetitiveOpportunity {
  description: string;
  potential: number; // 0-1 scale
  timeframe: GrowthTimeline;
  requirements: string[];
}

export interface CompetitiveThreat {
  description: string;
  probability: number; // 0-1 scale
  impact: CompetitiveImpact;
  mitigation: string[];
}

export type CompetitiveImpact =
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'severe';

export type ExploitationDifficulty =
  | 'easy'
  | 'moderate'
  | 'difficult'
  | 'very_difficult';

export interface VendorInvitation {
  id: string;
  coupleId: string;
  weddingId: string;
  vendorCategory: VendorCategory;
  vendorContact: VendorContact;
  personalMessage?: string;
  invitationSource: InvitationSource;

  // Tracking
  sentAt: Date;
  channels: InvitationChannel[];
  trackingId: string;
  campaignId?: string;

  // Status
  status: InvitationStatus;
  openedAt?: Date;
  respondedAt?: Date;
  signedUpAt?: Date;
  declinedAt?: Date;

  // Growth metrics
  expectedSignupRate: number;
  actualSignupRate?: number;
  viralPotential: ViralPotential;
}

export type VendorCategory =
  | 'photographer'
  | 'videographer'
  | 'venue'
  | 'catering'
  | 'flowers'
  | 'music'
  | 'planning'
  | 'officiant'
  | 'transportation'
  | 'beauty'
  | 'attire'
  | 'decorations'
  | 'other';

export interface VendorContact {
  email: string;
  phone?: string;
  name?: string;
  businessName?: string;
  website?: string;
  socialMedia?: SocialMediaProfile[];
}

export interface SocialMediaProfile {
  platform: SocialPlatform;
  handle: string;
  url: string;
  followerCount?: number;
}

export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'tiktok'
  | 'pinterest'
  | 'youtube';

export type InvitationSource =
  | 'wedme_platform'
  | 'vendor_recommendation'
  | 'couple_request'
  | 'ai_suggestion'
  | 'referral_program'
  | 'social_discovery';

export type InvitationChannel =
  | 'email'
  | 'sms'
  | 'platform_notification'
  | 'social_media'
  | 'phone_call';

export type InvitationStatus =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'responded'
  | 'signed_up'
  | 'declined'
  | 'expired'
  | 'failed';

export interface InvitationProcessResult {
  vendorProfile: VendorProfile;
  invitationResults: InvitationChannelResult[];
  expectedSignupRate: number;
  viralPotential: ViralPotential;

  // Tracking
  trackingId: string;
  followUpScheduled: boolean;
  followUpDate?: Date;
}

export interface VendorProfile {
  id: string;
  email: string;
  businessName?: string;
  category: VendorCategory;
  location?: Location;

  // Platform status
  isNewUser: boolean;
  previousPlatform?: 'wedsync' | 'wedme';
  signupSource: InvitationSource;

  // Business info
  experience: ExperienceLevel;
  portfolio?: PortfolioInfo;
  pricing?: PricingInfo;
}

export interface Location {
  city: string;
  state: string;
  country: string;
  coordinates?: Coordinates;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type ExperienceLevel =
  | 'new'
  | 'emerging'
  | 'experienced'
  | 'established'
  | 'premium';

export interface PortfolioInfo {
  photoCount: number;
  websiteUrl?: string;
  socialMediaFollowers: number;
  averageRating?: number;
  reviewCount: number;
}

export interface PricingInfo {
  startingPrice: number;
  currency: string;
  priceRange: PriceRange;
  packageOptions: number;
}

export type PriceRange = 'budget' | 'mid_range' | 'premium' | 'luxury';

export interface InvitationChannelResult {
  channel: InvitationChannel;
  status: ChannelStatus;
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  expectedSignups: number;
  trackingUrl?: string;
}

export type ChannelStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'opened'
  | 'clicked';

export interface VendorSignup {
  vendorId: string;
  invitationId?: string;
  referralSource: ReferralSource;
  signupData: VendorSignupData;

  // Growth tracking
  viralMetrics: VendorViralMetrics;
  conversionPath: ConversionStep[];

  // Onboarding
  onboardingStatus: OnboardingStatus;
  completedSteps: string[];
  timeToComplete?: number; // minutes
}

export interface ReferralSource {
  type: ReferralType;
  sourceId: string;
  sourcePlatform: 'wedsync' | 'wedme' | 'external';
  referrerId?: string;
  campaignId?: string;
}

export type ReferralType =
  | 'couple_invitation'
  | 'vendor_referral'
  | 'organic_search'
  | 'social_media'
  | 'paid_advertising'
  | 'partnership'
  | 'direct_visit';

export interface VendorSignupData {
  email: string;
  businessName: string;
  category: VendorCategory;
  location: Location;
  experience: ExperienceLevel;

  // Optional
  phone?: string;
  website?: string;
  description?: string;
  services: string[];
  priceRange: PriceRange;
}

export interface VendorViralMetrics {
  signupViralScore: number; // 0-1 scale
  networkPotential: number;
  expectedReferrals: number;
  socialInfluence: SocialInfluence;
  businessNetworkSize: BusinessNetworkSize;
}

export interface SocialInfluence {
  totalFollowers: number;
  engagementRate: number;
  platforms: SocialPlatform[];
  influencerScore: number; // 0-1 scale
}

export type BusinessNetworkSize =
  | 'small' // 1-10 connections
  | 'medium' // 11-50 connections
  | 'large' // 51-200 connections
  | 'extensive'; // 200+ connections

export interface ConversionStep {
  step: string;
  timestamp: Date;
  source: string;
  data?: any;
}

export type OnboardingStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'abandoned';

export interface GrowthResult {
  newUserCount: number;
  conversionRate: number;
  viralCoefficient: number;
  revenueImpact: number;
  networkExpansion: NetworkExpansion;

  // Attribution
  campaignId?: string;
  attributionPath: AttributionStep[];

  // Time metrics
  timeToConversion: number; // minutes
  timeToValue: number; // minutes
  retentionRate?: number;
}

export interface NetworkExpansion {
  newConnections: number;
  networkDensity: number;
  clusteringCoefficient: number;
  reachIncrease: number;
  influenceSpread: InfluenceSpread[];
}

export interface InfluenceSpread {
  sourceUserId: string;
  reachedUsers: string[];
  depth: number;
  strength: number; // 0-1 scale
}

export interface AttributionStep {
  touchpoint: string;
  timestamp: Date;
  contribution: number; // 0-1 scale
  channel: string;
}

export interface GrowthCampaign {
  id: string;
  name: string;
  type: CampaignType;
  objective: CampaignObjective;

  // Targeting
  targetAudience: TargetAudience;
  channels: CampaignChannel[];
  budget: CampaignBudget;

  // Timeline
  startDate: Date;
  endDate: Date;
  duration: number; // days

  // Content
  messaging: CampaignMessaging;
  creatives: CampaignCreative[];
  incentives: CampaignIncentive[];

  // Tracking
  status: CampaignStatus;
  metrics: CampaignMetrics;
}

export type CampaignType =
  | 'vendor_acquisition'
  | 'couple_activation'
  | 'referral_program'
  | 'viral_content'
  | 'retention'
  | 'reactivation';

export interface CampaignObjective {
  primary: ObjectiveType;
  secondary?: ObjectiveType[];
  targets: ObjectiveTarget[];
}

export type ObjectiveType =
  | 'new_signups'
  | 'referrals_generated'
  | 'engagement_increase'
  | 'revenue_growth'
  | 'retention_improvement'
  | 'viral_coefficient';

export interface ObjectiveTarget {
  metric: string;
  target: number;
  timeframe: number; // days
  priority: TargetPriority;
}

export type TargetPriority = 'must_have' | 'should_have' | 'nice_to_have';

export interface TargetAudience {
  segments: AudienceSegment[];
  exclusions?: AudienceExclusion[];
  size: number;
  characteristics: AudienceCharacteristic[];
}

export interface AudienceSegment {
  name: string;
  criteria: SegmentCriteria[];
  size: number;
  priority: SegmentPriority;
}

export interface SegmentCriteria {
  field: string;
  operator: CriteriaOperator;
  value: any;
  weight: number; // 0-1 scale
}

export type CriteriaOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'in_list'
  | 'not_in_list';

export type SegmentPriority = 'primary' | 'secondary' | 'tertiary';

export interface AudienceExclusion {
  criteria: SegmentCriteria[];
  reason: string;
}

export interface AudienceCharacteristic {
  trait: string;
  value: any;
  confidence: number; // 0-1 scale
}

export type CampaignChannel =
  | 'email'
  | 'sms'
  | 'push_notification'
  | 'in_app'
  | 'social_media'
  | 'paid_advertising'
  | 'influencer'
  | 'partnership';

export interface CampaignBudget {
  total: number;
  currency: string;
  allocation: BudgetAllocation[];
  spending: SpendingTracker[];
}

export interface BudgetAllocation {
  channel: CampaignChannel;
  amount: number;
  percentage: number;
  rationale: string;
}

export interface SpendingTracker {
  channel: CampaignChannel;
  spent: number;
  remaining: number;
  efficiency: number; // cost per objective
  lastUpdated: Date;
}

export interface CampaignMessaging {
  mainMessage: string;
  valueProposition: string;
  callToAction: string;
  variations: MessageVariation[];
  personalization: PersonalizationRule[];
}

export interface MessageVariation {
  version: string;
  message: string;
  targetSegment?: string;
  testWeight: number; // 0-1 scale for A/B testing
  performance?: VariationPerformance;
}

export interface VariationPerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  clickThroughRate: number;
  conversionRate: number;
  confidenceLevel: number;
}

export interface PersonalizationRule {
  trigger: PersonalizationTrigger;
  modification: MessageModification;
  priority: number;
}

export interface PersonalizationTrigger {
  userSegment?: string;
  behavior?: string;
  demographic?: any;
  contextual?: any;
}

export interface MessageModification {
  field: 'subject' | 'content' | 'cta' | 'sender';
  change: string;
  fallback?: string;
}

export interface CampaignCreative {
  id: string;
  type: CreativeType;
  format: CreativeFormat;
  content: CreativeContent;
  targeting: CreativeTargeting;
  performance: CreativePerformance;
}

export type CreativeType =
  | 'image'
  | 'video'
  | 'gif'
  | 'carousel'
  | 'story'
  | 'text_only';

export type CreativeFormat =
  | 'square'
  | 'landscape'
  | 'portrait'
  | 'story'
  | 'banner'
  | 'native';

export interface CreativeContent {
  headline: string;
  description: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  callToAction: string;
  brandElements: string[];
}

export interface CreativeTargeting {
  channels: CampaignChannel[];
  segments: string[];
  placements?: string[];
  schedule?: CreativeSchedule;
}

export interface CreativeSchedule {
  startTime: string; // HH:mm format
  endTime: string;
  days: number[]; // 0-6 (Sunday-Saturday)
  timezone: string;
}

export interface CreativePerformance {
  impressions: number;
  clicks: number;
  engagements: number;
  shares: number;
  saves: number;
  clickThroughRate: number;
  engagementRate: number;
  viralityScore: number;
}

export interface CampaignIncentive {
  id: string;
  type: IncentiveType;
  value: number;
  currency?: string;
  description: string;
  conditions: IncentiveCondition[];

  // Limits
  totalBudget: number;
  perUserLimit: number;
  timeLimit?: Date;
  usageLimit?: number;

  // Tracking
  claimed: number;
  redeemed: number;
  cost: number;
  roi: number;
}

export interface IncentiveCondition {
  type: ConditionType;
  requirement: any;
  description: string;
}

export type ConditionType =
  | 'signup_complete'
  | 'profile_complete'
  | 'first_booking'
  | 'referral_complete'
  | 'minimum_spend'
  | 'time_limit';

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface CampaignMetrics {
  // Core metrics
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;

  // Rates
  clickThroughRate: number;
  conversionRate: number;
  costPerClick: number;
  costPerConversion: number;
  returnOnAdSpend: number;

  // Growth metrics
  newUsers: number;
  referralsGenerated: number;
  viralCoefficient: number;
  networkExpansion: number;

  // Time-based
  dailyMetrics: DailyMetric[];
  lastUpdated: Date;
}

export interface DailyMetric {
  date: Date;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  newUsers: number;
  referrals: number;
}

export interface CampaignResult {
  campaignId: string;
  success: boolean;
  metrics: CampaignMetrics;
  insights: CampaignInsight[];
  recommendations: CampaignRecommendation[];

  // Performance
  objectiveAchievement: ObjectiveAchievement[];
  channelPerformance: ChannelPerformance[];
  segmentPerformance: SegmentPerformance[];
}

export interface CampaignInsight {
  type: InsightType;
  description: string;
  confidence: number; // 0-1 scale
  impact: InsightImpact;
  actionable: boolean;
  data?: any;
}

export type InsightType =
  | 'audience_behavior'
  | 'channel_efficiency'
  | 'message_resonance'
  | 'timing_optimization'
  | 'creative_performance'
  | 'budget_allocation';

export type InsightImpact = 'low' | 'medium' | 'high' | 'game_changing';

export interface CampaignRecommendation {
  type: RecommendationType;
  priority: RecommendationPriority;
  description: string;
  expectedImpact: ExpectedOutcome;
  implementation: string;
}

export type RecommendationType =
  | 'budget_reallocation'
  | 'audience_expansion'
  | 'message_optimization'
  | 'creative_refresh'
  | 'channel_adjustment'
  | 'timing_change';

export interface ObjectiveAchievement {
  objective: ObjectiveType;
  target: number;
  actual: number;
  achievement: number; // percentage
  status: AchievementStatus;
}

export type AchievementStatus =
  | 'exceeded'
  | 'met'
  | 'close'
  | 'missed'
  | 'far_behind';

export interface ChannelPerformance {
  channel: CampaignChannel;
  metrics: CampaignMetrics;
  efficiency: ChannelEfficiency;
  insights: string[];
}

export interface ChannelEfficiency {
  costPerConversion: number;
  conversionRate: number;
  viralityScore: number;
  qualityScore: number; // 0-1 scale
  recommendation: ChannelRecommendation;
}

export type ChannelRecommendation =
  | 'increase_budget'
  | 'maintain_current'
  | 'decrease_budget'
  | 'pause_channel'
  | 'optimize_targeting';

export interface SegmentPerformance {
  segment: string;
  size: number;
  metrics: CampaignMetrics;
  engagement: SegmentEngagement;
  insights: string[];
}

export interface SegmentEngagement {
  engagementRate: number;
  timeSpent: number; // seconds
  actionsPerUser: number;
  retentionRate: number;
  referralRate: number;
}

export interface ViralMetrics {
  viralCoefficient: number;
  viralLoopTime: number; // hours
  branchingFactor: number;
  conversionRate: number;

  // Network metrics
  networkGrowthRate: number;
  clusteringCoefficient: number;
  averagePathLength: number;
  networkDensity: number;

  // User behavior
  sharingRate: number;
  invitationAcceptanceRate: number;
  referralConversionRate: number;
  viralContentEngagement: number;

  // Time-based
  timeToViral: number; // hours
  viralPeakTime: number; // hours
  viralDecayRate: number;
  sustainedGrowthRate: number;

  // Quality metrics
  highValueUserRate: number;
  organicGrowthRate: number;
  retentionOfReferredUsers: number;
  lifetimeValueOfReferrals: number;
}
