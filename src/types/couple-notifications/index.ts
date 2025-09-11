// WS-334 Team D: Couple Notification Platform Types
// Wedding-specific notification types for personalized couple experience

export interface CoupleNotificationPlatform {
  initializeCoupleExperience(
    couple: CoupleProfile,
  ): Promise<NotificationExperience>;
  generatePersonalizedNotifications(
    context: CoupleContext,
  ): Promise<PersonalizedNotification[]>;
  createMilestoneNotifications(
    milestones: WeddingMilestone[],
  ): Promise<MilestoneNotification[]>;
  manageCouplePreferences(
    preferences: CoupleNotificationPreferences,
  ): Promise<PreferenceResult>;
  generateShareableContent(
    notification: CoupleNotification,
  ): Promise<ShareableContent>;
}

export interface CoupleNotificationExperience {
  experienceId: string;
  coupleId: string;
  weddingId: string;
  personalizationProfile: PersonalizationProfile;
  communicationStyle: CommunicationStyle;
  milestoneTracking: MilestoneTracker;
  viralGrowthFeatures: ViralGrowthFeature[];
  emotionalJourneyMap: EmotionalJourneyMap;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalizedNotification {
  notificationId: string;
  coupleId: string;
  weddingId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  personalizationLevel: PersonalizationLevel;
  emotionalTone: EmotionalTone;
  visualTheme: VisualTheme;
  content: PersonalizedContent;
  sharingCapabilities: SharingCapability[];
  viralElements: ViralElement[];
  contextualRecommendations: ContextualRecommendation[];
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  scheduledFor?: Date;
}

export interface MilestoneNotification {
  milestoneId: string;
  milestoneType: MilestoneType;
  coupleId: string;
  weddingId: string;
  achievementLevel: AchievementLevel;
  celebrationContent: CelebrationContent;
  progressVisualization: ProgressVisualization;
  shareableAssets: ShareableAsset[];
  friendInvitationPrompts: InvitationPrompt[];
  vendorAppreciationContent: VendorAppreciation[];
  isShared: boolean;
  sharedCount: number;
  celebratedAt: Date;
  createdAt: Date;
}

export interface CoupleNotificationPreferences {
  coupleId: string;
  communicationStyle: CommunicationStyle;
  notificationFrequency: NotificationFrequency;
  contentPersonalization: ContentPersonalization;
  privacySettings: CouplePrivacySettings;
  sharingPreferences: SharingPreferences;
  weddingStylePreferences: WeddingStylePreferences;
  partnerCoordination: PartnerCoordination;
  quietHours: QuietHours;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeddingJourneyOrchestrator {
  trackJourneyProgress(
    journeyData: WeddingJourneyData,
  ): Promise<JourneyProgress>;
  generateJourneyInsights(
    insights: JourneyInsightRequest,
  ): Promise<JourneyInsights>;
  createJourneyMilestones(
    milestoneConfig: MilestoneConfiguration,
  ): Promise<JourneyMilestone[]>;
  optimizeJourneyExperience(
    optimization: JourneyOptimization,
  ): Promise<OptimizationResult>;
  facilitatePartnerSync(
    partnerSync: PartnerSynchronization,
  ): Promise<SyncResult>;
}

export interface ViralGrowthEngine {
  generateViralContent(content: NotificationContent): Promise<ViralContent>;
  createSharableMoments(moments: WeddingMoment[]): Promise<SharableMoment[]>;
  facilitateFriendInvitations(
    invitations: FriendInvitation[],
  ): Promise<InvitationResult>;
  trackViralMetrics(metrics: ViralMetricsRequest): Promise<ViralAnalytics>;
  optimizeViralFeatures(
    optimization: ViralOptimization,
  ): Promise<ViralOptimizationResult>;
}

// Core Types
export interface CoupleProfile {
  coupleId: string;
  weddingId: string;
  partnerA: Partner;
  partnerB: Partner;
  weddingDate: Date;
  weddingStyle: WeddingStyle;
  budgetRange: BudgetRange;
  guestCount: number;
  viralTendencies: ViralTendency;
  visualPreferences: VisualPreference;
  couplePhoto?: string;
  relationshipStartDate?: Date;
  engagementDate?: Date;
  preferredTone: EmotionalTone;
}

export interface Partner {
  partnerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthDate?: Date;
  personalityType?: PersonalityType;
  communicationPreference: CommunicationPreference;
  socialMediaUsage: SocialMediaUsage;
}

export interface WeddingContext {
  weddingId: string;
  weddingDate: Date;
  daysToWedding: number;
  currentPhase: WeddingPhase;
  venueName?: string;
  venueLocation?: string;
  budgetUtilization: number;
  vendorCategories: VendorCategory[];
  selectedVendors: SelectedVendor[];
  timeline: WeddingTimeline;
  guestList: GuestInfo[];
  currentStressLevel: StressLevel;
  planningProgress: number;
}

export interface PersonalizedContent {
  title: string;
  message: string;
  subtitle?: string;
  callToAction?: CallToAction;
  richContent?: RichContent;
  personalizedElements: PersonalizedElement[];
}

export interface CelebrationContent {
  title: string;
  description: string;
  celebrationMessage: string;
  achievementBadge?: string;
  confettiAnimation?: AnimationType;
  soundEffect?: SoundEffect;
}

export interface ShareableContent {
  contentId: string;
  type: ShareableContentType;
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  customGraphics: CustomGraphic[];
  socialMediaFormats: SocialMediaFormat[];
  hashtagSuggestions: string[];
  templateVariants: TemplateVariant[];
}

// Enumeration Types
export type MilestoneType =
  | 'venue_booked'
  | 'vendor_confirmed'
  | 'budget_milestone'
  | 'timeline_complete'
  | 'guest_responses'
  | 'final_details'
  | 'engagement_announcement'
  | 'save_the_dates_sent'
  | 'invitations_sent'
  | 'dress_purchased'
  | 'catering_booked'
  | 'photography_booked'
  | 'music_booked'
  | 'flowers_ordered'
  | 'honeymoon_planned'
  | 'rehearsal_scheduled'
  | 'wedding_party_complete';

export type EmotionalTone =
  | 'excited'
  | 'romantic'
  | 'celebratory'
  | 'reassuring'
  | 'motivational'
  | 'grateful'
  | 'nostalgic'
  | 'anticipatory'
  | 'proud'
  | 'loving';

export type PersonalizationLevel =
  | 'basic'
  | 'enhanced'
  | 'hyper_personalized'
  | 'ai_optimized';

export type CommunicationStyle =
  | 'formal_elegant'
  | 'casual_fun'
  | 'romantic_dreamy'
  | 'modern_minimal'
  | 'traditional_classic'
  | 'quirky_unique'
  | 'luxury_sophisticated';

export type NotificationType =
  | 'milestone'
  | 'vendor_update'
  | 'timeline_reminder'
  | 'budget_alert'
  | 'guest_response'
  | 'planning_tip'
  | 'celebration'
  | 'social_invitation'
  | 'recommendation'
  | 'achievement';

export type NotificationCategory =
  | 'vendor'
  | 'planning'
  | 'milestone'
  | 'budget'
  | 'guest'
  | 'timeline'
  | 'social'
  | 'recommendation';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type AchievementLevel =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond';

export type WeddingPhase =
  | 'engagement'
  | 'early_planning'
  | 'vendor_selection'
  | 'detail_planning'
  | 'final_preparations'
  | 'wedding_week'
  | 'post_wedding';

export type StressLevel = 'low' | 'moderate' | 'high' | 'very_high';

export type WeddingStyle =
  | 'traditional'
  | 'modern'
  | 'rustic'
  | 'bohemian'
  | 'vintage'
  | 'destination'
  | 'intimate'
  | 'luxury'
  | 'beach'
  | 'garden'
  | 'industrial';

export type ViralTendency = 'low' | 'moderate' | 'high' | 'influencer';

export type PersonalityType =
  | 'extrovert'
  | 'introvert'
  | 'planner'
  | 'spontaneous'
  | 'detail_oriented'
  | 'big_picture'
  | 'social'
  | 'private';

export type ShareableContentType =
  | 'milestone_card'
  | 'progress_infographic'
  | 'couple_story'
  | 'vendor_appreciation'
  | 'countdown_graphic'
  | 'planning_tip'
  | 'behind_scenes';

// Supporting Interfaces
export interface ProgressVisualization {
  visualType:
    | 'progress_bar'
    | 'circular_progress'
    | 'milestone_path'
    | 'achievement_tree';
  currentProgress: number;
  totalSteps: number;
  completedMilestones: string[];
  nextMilestone?: string;
  visualStyle: VisualStyle;
}

export interface ShareableAsset {
  assetId: string;
  type: 'image' | 'video' | 'gif' | 'story_template';
  url: string;
  thumbnailUrl: string;
  dimensions: { width: number; height: number };
  platform: SocialPlatform[];
  customizable: boolean;
}

export interface InvitationPrompt {
  promptId: string;
  promptText: string;
  suggestedMessage: string;
  incentive?: string;
  callToAction: string;
}

export interface VendorAppreciation {
  vendorId: string;
  vendorName: string;
  appreciationMessage: string;
  shareableContent?: ShareableAsset;
  reviewPrompt?: string;
}

export interface ViralElement {
  elementType:
    | 'social_share_button'
    | 'friend_invitation'
    | 'achievement_badge'
    | 'hashtag_suggestion';
  content: string;
  shareUrl?: string;
  incentive?: string;
}

export interface ContextualRecommendation {
  recommendationId: string;
  type:
    | 'budget_optimization'
    | 'timeline_optimization'
    | 'vendor_completion'
    | 'guest_management';
  title: string;
  description: string;
  action: {
    label: string;
    link: string;
  };
  urgency: 'low' | 'medium' | 'high';
}

export interface WeddingJourneyData {
  weddingId: string;
  currentPhase: WeddingPhase;
  completedTasks: CompletedTask[];
  upcomingDeadlines: Deadline[];
  vendorStatus: VendorStatus[];
  budgetStatus: BudgetStatus;
  guestStatus: GuestStatus;
}

export interface JourneyProgress {
  overallProgress: number;
  completedMilestones: number;
  totalMilestones: number;
  phaseProgress: Record<WeddingPhase, number>;
  criticalPath: CriticalPathItem[];
  recommendations: string[];
}

export interface SharableMoment {
  momentId: string;
  title: string;
  description: string;
  imageUrl?: string;
  shareableContent: ShareableContent;
  socialPlatforms: SocialPlatform[];
  viralScore: number;
  engagementPrediction: number;
}

export interface FriendInvitation {
  invitationId: string;
  coupleId: string;
  friendEmail?: string;
  friendPhone?: string;
  personalMessage: string;
  invitationType: InvitationType;
  incentive?: string;
  shareableLink: string;
}

export interface ViralAnalytics {
  totalShares: number;
  platformBreakdown: Record<SocialPlatform, number>;
  engagementRate: number;
  viralCoefficient: number;
  friendInvitations: number;
  conversionRate: number;
}

export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'tiktok'
  | 'pinterest'
  | 'whatsapp';
export type InvitationType = 'email' | 'sms' | 'social_share' | 'direct_link';

// Additional supporting types
export interface NotificationExperience {
  totalNotifications: number;
  readRate: number;
  engagementScore: number;
  preferredDeliveryTime: Date;
  lastOptimized: Date;
}

export interface PreferenceResult {
  success: boolean;
  updatedPreferences: CoupleNotificationPreferences;
  effectiveDate: Date;
}

export interface CoupleContext {
  coupleProfile: CoupleProfile;
  weddingContext: WeddingContext;
  currentEngagement: EngagementMetrics;
  personalizedHistory: PersonalizedNotification[];
}

export interface EngagementMetrics {
  dailyActiveTime: number;
  notificationOpenRate: number;
  milestoneShareRate: number;
  friendInvitationRate: number;
}

export interface WeddingMilestone {
  milestoneId: string;
  type: MilestoneType;
  title: string;
  description: string;
  targetDate: Date;
  isComplete: boolean;
  completedDate?: Date;
  associatedVendors?: string[];
}

export interface CoupleNotification {
  notificationId: string;
  content: PersonalizedContent;
  metadata: NotificationMetadata;
}

export interface NotificationMetadata {
  deliveredAt: Date;
  openedAt?: Date;
  actionTaken?: string;
  shareCount: number;
  engagementScore: number;
}
