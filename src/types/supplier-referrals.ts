/**
 * WS-344: Supplier Referral Gamification System - Type Definitions
 *
 * TypeScript type definitions for supplier-to-supplier referral system
 * Focus: B2B gamification, professional networking, leaderboards
 */

// ===== CORE DATA TYPES =====

/**
 * Supplier referral entry tracking one supplier referring another
 */
export interface SupplierReferral {
  id: string;
  referrer_id: string; // Supplier making the referral
  referee_email: string; // Email of supplier being referred
  referee_id?: string; // Set when referred supplier signs up
  referral_code: string; // Unique referral code/link
  category: SupplierCategory; // Category of referred supplier
  status: ReferralStatus;
  created_at: string;
  clicked_at?: string; // When referral link was first clicked
  signed_up_at?: string; // When referred supplier created account
  trial_started_at?: string; // When referred supplier started trial
  converted_at?: string; // When referred supplier became paid subscriber
  reward_earned?: number; // Commission/reward earned by referrer
  metadata?: ReferralMetadata;
}

/**
 * Real-time statistics for a supplier's referral performance
 */
export interface SupplierReferralStats {
  supplier_id: string;
  total_referrals_sent: number;
  total_clicks: number;
  total_signups: number;
  total_trials_started: number;
  total_conversions: number;
  total_rewards_earned: number;
  click_through_rate: number; // clicks / referrals_sent
  conversion_rate: number; // conversions / clicks
  signup_rate: number; // signups / clicks
  trial_to_paid_rate: number; // conversions / trials
  avg_time_to_conversion_days: number;
  last_referral_sent_at?: string;
  current_month_stats: MonthlyReferralStats;
  lifetime_stats: LifetimeReferralStats;
}

/**
 * Monthly referral performance statistics
 */
export interface MonthlyReferralStats {
  month: string; // YYYY-MM format
  referrals_sent: number;
  conversions: number;
  rewards_earned: number;
  rank_in_category?: number;
  rank_overall?: number;
}

/**
 * Lifetime referral statistics
 */
export interface LifetimeReferralStats {
  total_referrals_sent: number;
  total_conversions: number;
  total_rewards_earned: number;
  best_month_conversions: number;
  best_month_rewards: number;
  current_streak_days: number; // Days with active referral activity
  longest_streak_days: number;
}

/**
 * Leaderboard entry for supplier rankings
 */
export interface LeaderboardEntry {
  supplier_id: string;
  supplier_name: string;
  supplier_category: SupplierCategory;
  location: SupplierLocation;
  rank: number;
  score: number; // Can be conversions, rewards, etc. depending on leaderboard type
  change_from_last_period: number; // +/- change in rank
  badge?: AchievementBadge;
  profile_image_url?: string;
  is_current_user: boolean;
  stats: {
    referrals_sent: number;
    conversions: number;
    rewards_earned: number;
    conversion_rate: number;
  };
}

/**
 * Multi-dimensional leaderboard data
 */
export interface LeaderboardData {
  type: LeaderboardType;
  time_period: TimePeriod;
  filters: LeaderboardFilters;
  entries: LeaderboardEntry[];
  total_participants: number;
  current_user_rank?: number;
  updated_at: string;
}

/**
 * QR code configuration for referral sharing
 */
export interface ReferralQRConfig {
  supplier_id: string;
  referral_url: string;
  qr_code_data: string;
  size: QRCodeSize;
  format: QRCodeFormat;
  logo_included: boolean;
  custom_message?: string;
  expires_at?: string;
  download_count: number;
  created_at: string;
}

/**
 * Achievement badge for gamification
 */
export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  color: BadgeColor;
  criteria: BadgeCriteria;
  earned_at?: string;
  progress_percentage?: number;
}

/**
 * Referral milestone tracking
 */
export interface ReferralMilestone {
  id: string;
  name: string;
  description: string;
  target_value: number;
  current_value: number;
  reward_type: RewardType;
  reward_amount: number;
  is_achieved: boolean;
  achieved_at?: string;
  next_milestone?: ReferralMilestone;
}

// ===== ENUMS & UNIONS =====

export type SupplierCategory =
  | 'photography'
  | 'videography'
  | 'venue'
  | 'catering'
  | 'florist'
  | 'music'
  | 'planning'
  | 'transport'
  | 'stationery'
  | 'beauty'
  | 'entertainment'
  | 'other';

export type ReferralStatus =
  | 'sent' // Referral sent, waiting for click
  | 'clicked' // Link clicked, waiting for signup
  | 'signed_up' // Account created, waiting for trial
  | 'trial_started' // Trial started, waiting for conversion
  | 'converted' // Paid subscription activated
  | 'expired' // Referral link expired
  | 'rejected'; // Referral rejected or invalid

export type LeaderboardType =
  | 'conversions' // Most referrals converted to paid
  | 'total_referrals' // Most referrals sent
  | 'conversion_rate' // Highest conversion percentage
  | 'rewards_earned' // Most money earned from referrals
  | 'recent_activity'; // Most active in last 30 days

export type TimePeriod =
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'all_time';

export type QRCodeSize = 'small' | 'medium' | 'large' | 'custom';

export type QRCodeFormat = 'png' | 'svg' | 'pdf' | 'jpeg';

export type BadgeColor =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'purple'
  | 'blue'
  | 'green'
  | 'red';

export type RewardType = 'free_months' | 'credits' | 'cash' | 'upgrade';

// ===== INTERFACES FOR NESTED OBJECTS =====

export interface SupplierLocation {
  city: string;
  region: string;
  country: string;
  postal_code?: string;
}

export interface ReferralMetadata {
  source?: string; // Where the referral came from (email, QR code, etc.)
  campaign_id?: string;
  notes?: string;
  referral_context?: string; // Context of how they know each other
  [key: string]: any;
}

export interface LeaderboardFilters {
  category?: SupplierCategory;
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
  time_period: TimePeriod;
  min_referrals?: number; // Only show suppliers with X+ referrals
}

export interface BadgeCriteria {
  type: 'referrals_sent' | 'conversions' | 'streak' | 'rewards' | 'rate';
  target: number;
  time_period?: TimePeriod;
}

// ===== API REQUEST/RESPONSE TYPES =====

export interface CreateReferralRequest {
  referee_email: string;
  referee_category: SupplierCategory;
  personal_message?: string;
  source?: string; // Where referral initiated from
}

export interface CreateReferralResponse {
  success: boolean;
  data?: {
    referral_id: string;
    referral_code: string;
    referral_url: string;
    qr_code_url?: string;
  };
  error?: string;
}

export interface GetReferralStatsRequest {
  supplier_id?: string; // If not provided, uses authenticated supplier
  time_period?: TimePeriod;
  include_history?: boolean;
}

export interface GetReferralStatsResponse {
  success: boolean;
  data?: SupplierReferralStats;
  error?: string;
}

export interface GetLeaderboardRequest {
  type: LeaderboardType;
  time_period: TimePeriod;
  filters?: LeaderboardFilters;
  page?: number;
  limit?: number;
}

export interface GetLeaderboardResponse {
  success: boolean;
  data?: LeaderboardData;
  pagination?: PaginationMeta;
  error?: string;
}

export interface GenerateQRCodeRequest {
  referral_code: string;
  size?: QRCodeSize;
  format?: QRCodeFormat;
  include_logo?: boolean;
  custom_message?: string;
}

export interface GenerateQRCodeResponse {
  success: boolean;
  data?: {
    qr_code_id: string;
    qr_code_url: string;
    download_url: string;
    expires_at: string;
  };
  error?: string;
}

// ===== UTILITY TYPES =====

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// ===== VALIDATION & CONSTANTS =====

export const SUPPLIER_REFERRAL_CONSTANTS = {
  MAX_REFERRALS_PER_DAY: 50,
  MAX_REFERRALS_PER_MONTH: 500,
  REFERRAL_LINK_EXPIRY_DAYS: 30,
  MIN_CONVERSION_TIME_HOURS: 1,
  MAX_QR_CODES_PER_DAY: 10,
  LEADERBOARD_UPDATE_INTERVAL_MINUTES: 15,
  STATS_CACHE_DURATION_SECONDS: 300,
} as const;

export const REFERRAL_REWARDS = {
  FIRST_CONVERSION: { type: 'free_months', amount: 1 },
  MILESTONE_5: { type: 'free_months', amount: 2 },
  MILESTONE_10: { type: 'free_months', amount: 3 },
  MILESTONE_25: { type: 'upgrade', amount: 1 }, // Free tier upgrade
  TOP_MONTHLY_REFERRER: { type: 'free_months', amount: 6 },
} as const;

export const BADGE_DEFINITIONS: Record<
  string,
  Omit<AchievementBadge, 'id' | 'earned_at' | 'progress_percentage'>
> = {
  FIRST_REFERRAL: {
    name: 'First Referral',
    description: 'Made your first supplier referral',
    icon_url: '/badges/first-referral.svg',
    color: 'bronze',
    criteria: { type: 'referrals_sent', target: 1 },
  },
  NETWORKING_PRO: {
    name: 'Networking Pro',
    description: 'Referred 10 suppliers successfully',
    icon_url: '/badges/networking-pro.svg',
    color: 'silver',
    criteria: { type: 'conversions', target: 10 },
  },
  COMMUNITY_BUILDER: {
    name: 'Community Builder',
    description: 'Referred 25 suppliers successfully',
    icon_url: '/badges/community-builder.svg',
    color: 'gold',
    criteria: { type: 'conversions', target: 25 },
  },
  CONVERSION_MASTER: {
    name: 'Conversion Master',
    description: '80%+ conversion rate with 5+ referrals',
    icon_url: '/badges/conversion-master.svg',
    color: 'platinum',
    criteria: { type: 'rate', target: 80 },
  },
  MONTHLY_CHAMPION: {
    name: 'Monthly Champion',
    description: 'Top referrer this month',
    icon_url: '/badges/monthly-champion.svg',
    color: 'purple',
    criteria: { type: 'referrals_sent', target: 1, time_period: 'this_month' },
  },
} as const;

// ===== FORM VALIDATION SCHEMAS =====

export const VALIDATION_RULES = {
  REFEREE_EMAIL: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    max_length: 255,
  },
  PERSONAL_MESSAGE: {
    required: false,
    max_length: 500,
    min_length: 10,
  },
  REFERRAL_CODE: {
    required: true,
    pattern: /^[A-Z0-9]{6,12}$/,
    min_length: 6,
    max_length: 12,
  },
} as const;

// ===== COMPONENT PROPS TYPES =====

/**
 * Props for ReferralCenter component
 */
export interface ReferralCenterProps {
  supplierId: string;
  currentTier: string;
  stats: SupplierReferralStats;
  onRefresh: () => Promise<void>;
  className?: string;
}

/**
 * Props for LeaderboardView component
 */
export interface LeaderboardViewProps {
  currentSupplier: {
    id: string;
    category: SupplierCategory;
    location: SupplierLocation;
  };
  filters: LeaderboardFilters;
  onFiltersChange: (filters: LeaderboardFilters) => void;
  className?: string;
}

/**
 * Props for ReferralStats component
 */
export interface ReferralStatsProps {
  stats: SupplierReferralStats;
  onRefresh: () => Promise<void>;
  rankingData?: {
    category_rank: number;
    overall_rank: number;
    total_in_category: number;
    total_overall: number;
  };
  isLoading?: boolean;
  className?: string;
}

/**
 * Props for QRCodeGenerator component
 */
export interface QRCodeGeneratorProps {
  referralCode: string;
  referralUrl: string;
  onGenerate: (config: GenerateQRCodeRequest) => Promise<void>;
  onDownload: (qrCodeId: string) => Promise<void>;
  isGenerating?: boolean;
  className?: string;
}

/**
 * Store interface for Zustand state management
 */
export interface SupplierReferralStore {
  // State
  stats: SupplierReferralStats | null;
  leaderboards: Record<string, LeaderboardData>;
  userRankings: Record<string, number>;
  referralLinks: string[];
  milestones: ReferralMilestone[];
  qrCodes: ReferralQRConfig[];

  // Loading states
  isLoadingStats: boolean;
  isLoadingLeaderboard: boolean;
  isGeneratingQR: boolean;

  // Actions
  refreshStats: () => Promise<void>;
  generateReferralLink: (data: CreateReferralRequest) => Promise<string>;
  fetchLeaderboard: (request: GetLeaderboardRequest) => Promise<void>;
  generateQRCode: (request: GenerateQRCodeRequest) => Promise<void>;
  trackConversion: (referralId: string) => Promise<void>;

  // Setters
  setStats: (stats: SupplierReferralStats) => void;
  setLeaderboard: (key: string, data: LeaderboardData) => void;
  setLoading: (key: string, loading: boolean) => void;
}
