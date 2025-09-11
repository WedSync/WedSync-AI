// WedMe File Management Types - Team D Platform Development
// Core types for couple-facing file platform with viral growth mechanics

export interface WedMeFileExperience {
  initializeCoupleFileHub(couple: CoupleProfile): Promise<FileHubExperience>;
  createMagicalTimeline(files: WeddingFile[]): Promise<TimelineExperience>;
  generateSocialContentSuggestions(
    files: WeddingFile[],
  ): Promise<ContentSuggestion[]>;
  orchestrateViralSharing(sharing: ViralSharingRequest): Promise<ViralResult>;
  discoverVendorsFromFiles(files: WeddingFile[]): Promise<VendorDiscovery[]>;
  generateVendorRecommendations(
    preferences: CouplePreferences,
  ): Promise<VendorRecommendation[]>;
  facilitateVendorBooking(
    vendor: VendorProfile,
    couple: CoupleProfile,
  ): Promise<BookingFacilitation>;
}

export interface CoupleProfile {
  id: string;
  partnerOne: PartnerProfile;
  partnerTwo: PartnerProfile;
  weddingDate: Date;
  weddingLocation: Location;
  weddingStyle: WeddingStyle;
  budget: BudgetProfile;
  preferences: CouplePreferences;
  vendorPreferences: VendorPreferences;
  personalityProfile: PersonalityProfile;
  socialHistory: SocialHistory;
  vendorNetwork: VendorConnection[];
  friendsNetwork: FriendConnection[];
  connectedPlatforms: SocialPlatform[];
  socialSettings: SocialSettings;
  familySettings: FamilySettings;
  viralSettings: ViralSettings;
  contacts: CoupleContact[];
  contactsIntegration: ContactsIntegration;
  downloadTracking: DownloadTracking;
  sharingMetrics: SharingMetrics;
  familyFeedback: FamilyFeedback;
  viralMetrics: ViralMetrics;
  friendsEngagement: FriendEngagement;
  vendorConnections: VendorConnection[];
}

export interface PartnerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  socialProfiles: SocialProfile[];
  familyContacts: Contact[];
  friendsContacts: Contact[];
}

export interface FileHubExperience {
  coupleId: string;
  weddingDate: Date;
  fileCollections: FileCollection[];
  socialIntegrations: SocialIntegration[];
  familyAccess: FamilyAccessControl[];
  vendorConnections: VendorConnection[];
  viralMetrics: ViralMetrics;
  memoryTimeline: MemoryTimeline;
  sharingHistory: SharingEvent[];
  contentSuggestions: ContentSuggestion[];
}

export interface WeddingFile {
  id: string;
  type: WeddingFileType;
  url: string;
  thumbnailUrl: string;
  metadata: WeddingFileMetadata;
  vendor?: VendorProfile;
  weddingMoment: WeddingMoment;
  socialMetrics: SocialMetrics;
  familyTags: FamilyTag[];
  aiAnalysis: WeddingAIAnalysis;
  viralPotential: ViralScore;
  uploadedAt: Date;
  uploadedBy: string;
  fileSize: number;
  duration?: number; // for videos
  dimensions?: ImageDimensions;
  location?: Location;
  timestamp?: Date; // when photo/video was taken
}

export type WeddingFileType =
  | 'photo'
  | 'video'
  | 'document'
  | 'audio'
  | 'timeline_entry'
  | 'vendor_portfolio'
  | 'inspiration'
  | 'contract'
  | 'invoice';

export interface WeddingFileMetadata {
  originalFilename: string;
  mimeType: string;
  exifData?: ExifData;
  colorPalette: ColorPalette;
  tags: string[];
  description?: string;
  category: FileCategory;
  privacyLevel: PrivacyLevel;
  qualityScore: number;
  aiTags: AITag[];
}

export interface WeddingMoment {
  id: string;
  name: string;
  timestamp: Date;
  phase: WeddingPhase;
  emotionalTone: EmotionalTone;
  participants: string[];
  location?: Location;
  significance: SignificanceLevel;
  shareability: ShareabilityScore;
}

export type WeddingPhase =
  | 'engagement'
  | 'planning'
  | 'pre_wedding'
  | 'getting_ready'
  | 'ceremony'
  | 'cocktail_hour'
  | 'reception'
  | 'after_party'
  | 'honeymoon'
  | 'anniversary';

export type EmotionalTone =
  | 'joyful'
  | 'romantic'
  | 'peaceful'
  | 'energetic'
  | 'intimate'
  | 'celebratory'
  | 'emotional'
  | 'fun'
  | 'elegant'
  | 'dramatic';

// Viral Sharing System Types
export interface ViralSharingRequest {
  files: WeddingFile[];
  platforms: SocialPlatform[];
  audienceSegments: AudienceSegment[];
  vendorTagging: VendorTaggingConfig;
  viralOptimization: ViralOptimization;
  schedulingPreferences: SharingSchedule;
  privacyControls: PrivacyControl[];
  contentStrategy: ContentStrategy;
  hashtagStrategy: HashtagStrategy;
}

export interface SocialPlatform {
  id: string;
  name:
    | 'instagram'
    | 'facebook'
    | 'pinterest'
    | 'tiktok'
    | 'twitter'
    | 'linkedin';
  isConnected: boolean;
  accountId: string;
  accessToken?: string;
  permissions: PlatformPermission[];
  audienceInsights: AudienceInsights;
  performanceMetrics: PlatformMetrics;
}

export interface ContentStrategy {
  storyArc: StoryArc;
  postingCadence: PostingCadence;
  contentMix: ContentMix;
  vendorSpotlightFrequency: number;
  behindScenesRatio: number;
  userGeneratedContentGoals: UGCGoals;
}

export interface ViralOptimization {
  aiContentOptimization: boolean;
  optimalTimingAnalysis: boolean;
  hashtagOptimization: boolean;
  crossPlatformSyncing: boolean;
  influencerTagging: boolean;
  vendorAmplification: boolean;
  friendNetworkLeverage: boolean;
  trendingTopicIntegration: boolean;
}

export interface ViralResult {
  sharingId: string;
  platforms: PlatformResult[];
  predictedReach: ReachPrediction;
  viralCoefficient: number;
  vendorImpact: VendorImpactMetrics;
  friendEngagement: FriendEngagementMetrics;
  scheduledPosts: ScheduledPost[];
  trackingUrls: TrackingUrl[];
}

// Timeline Experience Types
export interface TimelineExperience {
  timeline: MagicalTimeline;
  interactiveElements: InteractiveElement[];
  sharingOptions: SharingOption[];
  emotionalJourney: EmotionalJourney;
  storyNarrative: StoryNarrative;
  socialOptimization: SocialOptimization;
}

export interface MagicalTimeline {
  id: string;
  storyArcs: StoryArc[];
  emotionalCurve: EmotionalCurve;
  narrativeMoments: NarrativeMoment[];
  keyMoments: KeyMoment[];
  socialContent: SocialContent[];
  viralPotential: ViralPotential;
  memoryHighlights: MemoryHighlight[];
  sharingRecommendations: SharingRecommendation[];
  moments: TimelineMoment[];
}

export interface TimelineMoment {
  id: string;
  timestamp: Date;
  title: string;
  description: string;
  files: WeddingFile[];
  emotionalWeight: number;
  shareability: number;
  participants: Participant[];
  location?: Location;
  vendor?: VendorProfile;
  tags: string[];
  aiInsights: AIInsight[];
}

export interface StoryArc {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  emotionalProgression: EmotionalProgression;
  keyMoments: KeyMoment[];
  characterDevelopment: CharacterDevelopment;
  visualTheme: VisualTheme;
  narrativeFlow: NarrativeFlow;
}

// Vendor Discovery Types
export interface VendorDiscovery {
  vendor: VendorProfile;
  workExamples: WeddingFile[];
  discoverySource: DiscoverySource;
  confidence?: number;
  contextMatch: number;
  similarityScore: number;
  availabilityStatus: AvailabilityStatus;
  pricingEstimate?: PricingEstimate;
  reviewSummary: ReviewSummary;
  portfolioHighlights: PortfolioHighlight[];
}

export type DiscoverySource =
  | 'file_metadata'
  | 'ai_recognition'
  | 'style_matching'
  | 'location_based'
  | 'social_network'
  | 'recommendation_engine';

export interface VendorProfile {
  id: string;
  name: string;
  businessName: string;
  category: VendorCategory;
  specialties: string[];
  location: Location;
  contactInfo: ContactInfo;
  portfolio: PortfolioItem[];
  socialProfiles: SocialProfile[];
  reviews: Review[];
  pricing: PricingStructure;
  availability: Availability[];
  viralScore: number;
  trendingStatus: TrendingStatus;
  collaborationHistory: CollaborationHistory[];
}

export interface VendorRecommendation {
  vendor: VendorProfile;
  matchScore: number;
  matchReasons: MatchReason[];
  availabilityMatch: boolean;
  budgetCompatibility: BudgetCompatibility;
  styleAlignment: StyleAlignment;
  locationProximity: number;
  socialProof: SocialProof;
  bookingUrgency: BookingUrgency;
}

// Family & Friends Sharing Types
export interface SharingGroup {
  id: string;
  name: string;
  contacts: CoupleContact[];
  permissions: GroupPermissions;
  contentPreferences: ContentPreferences;
  accessLevel: AccessLevel;
  invitationStatus: InvitationStatus;
  activityMetrics: ActivityMetrics;
}

export interface IntelligentSharingGroup extends SharingGroup {
  intelligenceScore: number;
  groupingCriteria: GroupingCriteria;
  suggestedContent: WeddingFile[];
  engagementPrediction: number;
  privacyRecommendations: PrivacyRecommendation[];
}

export interface GroupPermissions {
  download: boolean;
  share: boolean;
  comment: boolean;
  fullAccess: boolean;
  albumCreation: boolean;
  tagOthers: boolean;
  inviteOthers: boolean;
}

export interface ContentPreferences {
  includePrivateMemories?: boolean;
  includeBehindScenes?: boolean;
  includeVendorContent?: boolean;
  includeCeremonyHighlights?: boolean;
  includeReceptionFun?: boolean;
  includeGroupPhotos?: boolean;
  qualityThreshold: number;
  contentTypes: WeddingFileType[];
}

export interface FamilyAccessControl {
  groupId: string;
  accessLevel: AccessLevel;
  expirationDate?: Date;
  downloadLimit?: number;
  shareLimit?: number;
  trackingEnabled: boolean;
  watermarkRequired: boolean;
}

export type AccessLevel =
  | 'view_only'
  | 'download'
  | 'share'
  | 'full_access'
  | 'admin';

// Viral Metrics Types
export interface ViralMetrics {
  viralCoefficient: number;
  totalReach: number;
  engagement: EngagementMetrics;
  vendorViralContributions: VendorViralContribution[];
  newBookingsGenerated: BookingConversion[];
  followerGrowth: FollowerGrowth;
  engagementRates: EngagementRate[];
  viralPosts: ViralPost[];
  friendConnections: FriendConnection[];
  weddingInfluence: WeddingInfluence;
  referralsGenerated: Referral[];
  sharingVelocity: SharingVelocity;
  crossPlatformAmplification: CrossPlatformAmplification;
}

export interface VendorViralContribution {
  vendorId: string;
  totalImpressions: number;
  clickThroughs: number;
  bookingInquiries: number;
  conversions: number;
  revenueAttribution: number;
  viralAmplification: number;
}

export interface BookingConversion {
  vendorId: string;
  coupleId: string;
  conversionSource: ConversionSource;
  conversionValue: number;
  conversionDate: Date;
  touchpoints: ConversionTouchpoint[];
}

// Supporting Types
export interface Location {
  address: string;
  city: string;
  state: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  venue?: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  website?: string;
  address: Location;
  socialMedia: SocialProfile[];
}

export interface SocialProfile {
  platform: string;
  username: string;
  url: string;
  followerCount?: number;
  engagementRate?: number;
  verified: boolean;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewer: string;
  date: Date;
  photos?: string[];
  helpfulVotes: number;
  weddingDate?: Date;
  verified: boolean;
}

export interface CoupleContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  relationship: RelationshipType;
  weddingRole?: WeddingRole;
  socialProfiles: SocialProfile[];
  location?: Location;
  importSource: ImportSource;
}

export type RelationshipType =
  | 'immediate_family'
  | 'extended_family'
  | 'wedding_party'
  | 'close_friend'
  | 'friend'
  | 'colleague'
  | 'vendor'
  | 'other';

export type WeddingRole =
  | 'maid_of_honor'
  | 'best_man'
  | 'bridesmaid'
  | 'groomsman'
  | 'officiant'
  | 'parent'
  | 'grandparent'
  | 'flower_girl'
  | 'ring_bearer'
  | 'usher'
  | 'reader'
  | 'musician'
  | 'photographer'
  | 'videographer';

// AI Analysis Types
export interface WeddingAIAnalysis {
  sceneRecognition: SceneRecognition;
  emotionDetection: EmotionDetection;
  qualityAssessment: QualityAssessment;
  contentSuggestions: AIContentSuggestion[];
  viralPrediction: ViralPrediction;
  vendorRecognition: VendorRecognition;
  momentSignificance: MomentSignificance;
}

export interface SceneRecognition {
  scene: WeddingScene;
  confidence: number;
  participants: PersonRecognition[];
  location: LocationRecognition;
  timeOfDay: TimeOfDay;
  weatherCondition?: WeatherCondition;
}

export interface EmotionDetection {
  dominantEmotion: EmotionalTone;
  emotionScores: EmotionScore[];
  facialExpressions: FacialExpression[];
  bodyLanguage: BodyLanguage[];
  overallMood: OverallMood;
}

export type WeddingScene =
  | 'ceremony'
  | 'reception'
  | 'first_dance'
  | 'cake_cutting'
  | 'bouquet_toss'
  | 'speeches'
  | 'dancing'
  | 'portraits'
  | 'getting_ready'
  | 'cocktail_hour'
  | 'send_off';

// Utility Types
export type ViralScore = number; // 0-100
export type ShareabilityScore = number; // 0-100
export type SignificanceLevel = 'low' | 'medium' | 'high' | 'milestone';
export type PrivacyLevel =
  | 'public'
  | 'friends'
  | 'family'
  | 'private'
  | 'vendors_only';
export type TrendingStatus = 'hot' | 'rising' | 'stable' | 'declining';
export type ConversionSource =
  | 'file_discovery'
  | 'social_share'
  | 'direct_referral'
  | 'search';
export type ImportSource =
  | 'manual'
  | 'google_contacts'
  | 'facebook'
  | 'instagram'
  | 'vendor_import';

// Configuration Types
export interface WedMeConfig {
  viralFeatures: ViralFeatureConfig;
  socialIntegration: SocialIntegrationConfig;
  aiFeatures: AIFeatureConfig;
  sharingControls: SharingControlConfig;
  performanceSettings: PerformanceConfig;
}

export interface ViralFeatureConfig {
  enabled: boolean;
  viralCoefficientTarget: number;
  autoSharingEnabled: boolean;
  vendorTaggingEnabled: boolean;
  friendInvitesEnabled: boolean;
  socialOptimizationEnabled: boolean;
}
