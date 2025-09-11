// =====================================================
// VIRAL TRACKING TYPES
// WS-230 Enhanced Viral Coefficient Tracking System
// Mobile/PWA TypeScript Definitions
// =====================================================

import { z } from 'zod';

// =====================================================
// CORE VIRAL TRACKING INTERFACES
// =====================================================

export interface ViralChannel {
  id: string;
  channel_code: string;
  channel_name: string;
  description: string | null;
  is_active: boolean;
  cost_per_invite: number;
  conversion_multiplier: number;
  created_at: string;
  updated_at: string;
}

export interface ViralInvitation {
  id: string;
  invitation_code: string;
  inviter_id: string;
  inviter_organization_id: string | null;
  invitee_email: string | null;
  invitee_phone: string | null;
  invitee_name: string | null;
  invitee_type: 'COUPLE' | 'VENDOR' | 'VENUE' | 'PLANNER';
  wedding_id: string | null;
  channel_id: string;
  invitation_context: Record<string, any> | null;
  subject_line: string | null;
  custom_message: string | null;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  expired_at: string | null;
  status:
    | 'PENDING'
    | 'SENT'
    | 'DELIVERED'
    | 'OPENED'
    | 'CLICKED'
    | 'EXPIRED'
    | 'FAILED';
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViralConversion {
  id: string;
  invitation_id: string;
  converted_user_id: string;
  converted_organization_id: string | null;
  time_to_activation: string; // PostgreSQL interval as string
  activation_type:
    | 'SIGNUP'
    | 'TRIAL_START'
    | 'FIRST_LOGIN'
    | 'FIRST_FORM'
    | 'FIRST_CLIENT'
    | 'PAID_UPGRADE';
  conversion_value: number | null;
  tier_upgraded_to: string | null;
  landing_page: string | null;
  signup_flow: string | null;
  onboarding_completed: boolean;
  first_meaningful_action_at: string | null;
  quality_score: number | null; // 1-10
  engagement_score: number | null;
  retention_day_7: boolean;
  retention_day_30: boolean;
  converted_at: string;
  activated_at: string;
  created_at: string;
  updated_at: string;
}

export interface ViralCoefficient {
  id: string;
  calculation_date: string;
  period_type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  organization_id: string | null;
  channel_id: string | null;
  user_tier: string | null;
  invitee_type: string | null;
  total_invitations: number;
  total_conversions: number;
  conversion_rate: number; // Decimal percentage
  viral_coefficient: number;
  k_factor: number; // Key metric: viral_coefficient * conversion_rate
  cycle_time: string | null; // PostgreSQL interval as string
  compound_growth_rate: number | null;
  avg_time_to_activation: string | null;
  avg_quality_score: number | null;
  high_value_conversions: number;
  cost_per_invitation: number;
  cost_per_conversion: number;
  roi: number;
  cohort_size: number | null;
  cohort_generation: number;
  calculation_method: string;
  confidence_interval: number | null;
  sample_size: number | null;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface ViralMilestone {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  milestone_type: string;
  milestone_name: string;
  milestone_description: string | null;
  target_value: number;
  current_value: number;
  achieved_value: number | null;
  is_achieved: boolean;
  achieved_at: string | null;
  reward_type: string | null;
  reward_value: number | null;
  reward_granted: boolean;
  reward_granted_at: string | null;
  progress_percentage: number; // Auto-calculated
  start_date: string;
  target_date: string;
  achieved_date: string | null;
  category: string | null;
  priority: number; // 1-10
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// MOBILE UI STATE INTERFACES
// =====================================================

export interface ViralDashboardState {
  selectedPeriod: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  isRefreshing: boolean;
  lastUpdated: Date | null;
  selectedMetric:
    | 'K_FACTOR'
    | 'VIRAL_COEFFICIENT'
    | 'CONVERSIONS'
    | 'INVITATIONS';
  showBottomSheet: boolean;
  bottomSheetContent: 'INVITATIONS' | 'CONVERSIONS' | 'MILESTONES' | null;
}

export interface TouchGesture {
  type: 'SWIPE' | 'PINCH' | 'PULL' | 'TAP' | 'LONG_PRESS';
  direction?: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
  deltaX?: number;
  deltaY?: number;
  scale?: number;
  velocity?: number;
}

export interface HapticFeedback {
  type: 'LIGHT' | 'MEDIUM' | 'HEAVY' | 'SUCCESS' | 'WARNING' | 'ERROR';
  pattern?: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'PATTERN';
}

// =====================================================
// MOBILE CHART DATA INTERFACES
// =====================================================

export interface ViralChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
    fill?: boolean;
    tension?: number;
  }[];
}

export interface ConversionFunnelData {
  stage: string;
  value: number;
  percentage: number;
  color: string;
}

export interface MilestoneProgressData {
  milestoneId: string;
  name: string;
  current: number;
  target: number;
  percentage: number;
  color: string;
  isAchieved: boolean;
}

// =====================================================
// PWA OFFLINE STATE INTERFACES
// =====================================================

export interface OfflineViralData {
  invitations: ViralInvitation[];
  conversions: ViralConversion[];
  coefficients: ViralCoefficient[];
  milestones: ViralMilestone[];
  lastSyncAt: string;
  pendingSync: boolean;
  syncQueue: ViralSyncAction[];
}

export interface ViralSyncAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: 'invitations' | 'conversions' | 'milestones';
  data: any;
  timestamp: string;
}

// =====================================================
// API REQUEST/RESPONSE INTERFACES
// =====================================================

export interface SendInvitationRequest {
  invitee_email?: string;
  invitee_phone?: string;
  invitee_name?: string;
  invitee_type: 'COUPLE' | 'VENDOR' | 'VENUE' | 'PLANNER';
  channel_code: string;
  wedding_id?: string;
  custom_message?: string;
  utm_campaign?: string;
}

export interface ViralAnalyticsRequest {
  start_date: string;
  end_date: string;
  period_type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  organization_id?: string;
  channel_id?: string;
  metrics: ('K_FACTOR' | 'VIRAL_COEFFICIENT' | 'CONVERSIONS' | 'INVITATIONS')[];
}

export interface ViralAnalyticsResponse {
  coefficients: ViralCoefficient[];
  trends: {
    metric: string;
    change_percentage: number;
    trend_direction: 'UP' | 'DOWN' | 'STABLE';
  }[];
  summary: {
    total_invitations: number;
    total_conversions: number;
    avg_k_factor: number;
    top_channel: string;
  };
}

// =====================================================
// ZOD VALIDATION SCHEMAS
// =====================================================

export const SendInvitationSchema = z
  .object({
    invitee_email: z.string().email().optional(),
    invitee_phone: z
      .string()
      .regex(/^\+?[\d\s\-\(\)]{10,}$/)
      .optional(),
    invitee_name: z.string().min(1).max(255).optional(),
    invitee_type: z.enum(['COUPLE', 'VENDOR', 'VENUE', 'PLANNER']),
    channel_code: z.string().min(1).max(20),
    wedding_id: z.string().uuid().optional(),
    custom_message: z.string().max(1000).optional(),
    utm_campaign: z.string().max(100).optional(),
  })
  .refine((data) => data.invitee_email || data.invitee_phone, {
    message: 'Either email or phone must be provided',
  });

export const ViralAnalyticsSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  organization_id: z.string().uuid().optional(),
  channel_id: z.string().uuid().optional(),
  metrics: z
    .array(
      z.enum(['K_FACTOR', 'VIRAL_COEFFICIENT', 'CONVERSIONS', 'INVITATIONS']),
    )
    .min(1),
});

// =====================================================
// MOBILE NOTIFICATION INTERFACES
// =====================================================

export interface ViralNotification {
  id: string;
  type:
    | 'MILESTONE_ACHIEVED'
    | 'CONVERSION_SPIKE'
    | 'INVITE_OPENED'
    | 'NEW_SIGNUP';
  title: string;
  message: string;
  icon: string;
  badge?: number;
  vibrate?: number[];
  actions?: {
    action: string;
    title: string;
    icon?: string;
  }[];
  data?: {
    milestoneId?: string;
    invitationId?: string;
    conversionId?: string;
    url?: string;
  };
}

// =====================================================
// PERFORMANCE MONITORING INTERFACES
// =====================================================

export interface ViralPerformanceMetrics {
  renderTime: number; // Component render time in ms
  chartLoadTime: number; // Chart rendering time in ms
  apiResponseTime: number; // API call response time in ms
  cacheHitRate: number; // Percentage of cache hits
  offlineActions: number; // Number of actions while offline
  syncLatency: number; // Time to sync when back online
}

// =====================================================
// ACCESSIBILITY INTERFACES
// =====================================================

export interface ViralAccessibility {
  screenReader: {
    announcements: string[];
    liveRegion: 'polite' | 'assertive' | 'off';
  };
  keyboardNavigation: {
    focusIndex: number;
    focusableElements: string[];
  };
  highContrast: boolean;
  reducedMotion: boolean;
  textSize: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE';
}

// =====================================================
// EXPORT TYPE GUARDS
// =====================================================

export const isViralInvitation = (obj: any): obj is ViralInvitation => {
  return obj && typeof obj === 'object' && 'invitation_code' in obj;
};

export const isViralConversion = (obj: any): obj is ViralConversion => {
  return (
    obj &&
    typeof obj === 'object' &&
    'invitation_id' in obj &&
    'converted_user_id' in obj
  );
};

export const isViralMilestone = (obj: any): obj is ViralMilestone => {
  return (
    obj &&
    typeof obj === 'object' &&
    'milestone_type' in obj &&
    'target_value' in obj
  );
};

// =====================================================
// UTILITY TYPE HELPERS
// =====================================================

export type ViralMetricType =
  | 'K_FACTOR'
  | 'VIRAL_COEFFICIENT'
  | 'CONVERSIONS'
  | 'INVITATIONS';
export type ViralChannelCode =
  | 'EMAIL'
  | 'SMS'
  | 'WHATSAPP'
  | 'DIRECT_LINK'
  | 'QR_CODE'
  | 'WEDDING_WEBSITE'
  | 'VENDOR_DIRECTORY'
  | 'REFERRAL_PROGRAM';
export type ViralPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
export type InviteeType = 'COUPLE' | 'VENDOR' | 'VENUE' | 'PLANNER';
export type InvitationStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'EXPIRED'
  | 'FAILED';
export type ActivationType =
  | 'SIGNUP'
  | 'TRIAL_START'
  | 'FIRST_LOGIN'
  | 'FIRST_FORM'
  | 'FIRST_CLIENT'
  | 'PAID_UPGRADE';

// =====================================================
// CONSTANTS
// =====================================================

export const VIRAL_COLORS = {
  K_FACTOR: '#10B981', // Green for growth
  VIRAL_COEFFICIENT: '#3B82F6', // Blue for coefficient
  CONVERSIONS: '#F59E0B', // Orange for conversions
  INVITATIONS: '#8B5CF6', // Purple for invitations
  MILESTONE: '#EF4444', // Red for achievements
  SUCCESS: '#059669',
  WARNING: '#D97706',
  ERROR: '#DC2626',
  NEUTRAL: '#6B7280',
} as const;

export const HAPTIC_PATTERNS = {
  SUCCESS: [50, 50, 100],
  MILESTONE: [100, 50, 100, 50, 200],
  NOTIFICATION: [50],
  ERROR: [200, 100, 200],
} as const;

export const CHART_CONFIG = {
  MOBILE_HEIGHT: 200,
  TABLET_HEIGHT: 300,
  DESKTOP_HEIGHT: 400,
  ANIMATION_DURATION: 300,
  REFRESH_INTERVAL: 30000, // 30 seconds
  OFFLINE_CACHE_DURATION: 86400000, // 24 hours
} as const;
