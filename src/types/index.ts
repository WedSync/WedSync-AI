// WedSync Platform - Comprehensive Type System
// Central type definitions for the entire WedSync wedding platform

// ============================================================================
// NOTIFICATION SYSTEM TYPES (Team A - Frontend Notification System)
// ============================================================================

// Core notification system types for suppliers and general platform use
export type {
  // Core notification interfaces
  Notification,
  NotificationCenter,
  NotificationGroup,
  NotificationPreferences,
  NotificationSystemProps,
  NotificationAction,
  NotificationActionRequest,
  ActionContext,
  ActionResult,
  IncomingNotification,
  ProcessedNotification,
  FilteredNotifications,
  UrgencyScore,
  UserContext,
  UserBehaviorData,
  NotificationEvent,
  NotificationResponse,
  NotificationState,
  NotificationActions,
  NotificationStore,
  SmartNotificationEngine,
  WeatherNotification,
  WeddingDayContext,

  // Metadata and references
  NotificationMetadata as SupplierNotificationMetadata,
  NotificationAttachment,
  WeddingReference,
  VendorReference,

  // Preference interfaces
  QuietHoursConfiguration,
  WeddingDayNotificationSettings,
  EmergencyOverrideSettings,
  PersonalizationSettings as SupplierPersonalizationSettings,
  SmartFilterConfiguration,
  MobileNotificationSettings,
  VisualNotificationPreferences,

  // Enums and unions
  NotificationType as SupplierNotificationType,
  NotificationCategory as SupplierNotificationCategory,
  PriorityLevel,
  ActionType,
  ActionStyle,
  NotificationChannel,
  UserRole,
  GroupingStrategy,
  SwipeAction,

  // Utility types
  NotificationsByCategory,
  NotificationsByPriority,
  CategoryCounts,
} from './notifications';

// ============================================================================
// COUPLE NOTIFICATION SYSTEM TYPES (Team D - Couple Platform)
// ============================================================================

// Couple-specific notification types for personalized wedding journey
export type {
  // Main platform interfaces
  CoupleNotificationPlatform,
  CoupleNotificationExperience,
  PersonalizedNotification,
  MilestoneNotification,
  CoupleNotificationPreferences,
  WeddingJourneyOrchestrator,
  ViralGrowthEngine,

  // Core couple types
  CoupleProfile,
  Partner,
  WeddingContext as CoupleWeddingContext,
  PersonalizedContent,
  CelebrationContent,
  ShareableContent,

  // Journey and milestone types
  WeddingJourneyData,
  JourneyProgress,
  WeddingMilestone,
  SharableMoment,
  FriendInvitation,
  ViralAnalytics,

  // Supporting interfaces
  ProgressVisualization,
  ShareableAsset,
  InvitationPrompt,
  VendorAppreciation,
  ViralElement,
  ContextualRecommendation,
  NotificationExperience,
  PreferenceResult,
  CoupleContext,
  EngagementMetrics,
  CoupleNotification,

  // Couple-specific enums
  MilestoneType,
  EmotionalTone,
  PersonalizationLevel,
  CommunicationStyle,
  NotificationType as CoupleNotificationType,
  NotificationCategory as CoupleNotificationCategory,
  NotificationPriority,
  AchievementLevel,
  WeddingPhase,
  StressLevel,
  WeddingStyle,
  ViralTendency,
  PersonalityType,
  ShareableContentType,
  SocialPlatform,
  InvitationType,
} from './couple-notifications';

// ============================================================================
// COMMON SYSTEM TYPES
// ============================================================================

// Shared types used across multiple domains
export interface BaseUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  type: 'supplier' | 'venue' | 'enterprise';
  plan: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  notificationsEnabled: boolean;
  weddingDayProtocol: boolean;
  emergencyContacts: string[];
  branding?: BrandingSettings;
}

export interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
  customDomain?: string;
}

// ============================================================================
// WEDDING DOMAIN TYPES
// ============================================================================

export interface Wedding {
  id: string;
  coupleId: string;
  organizationId: string;
  weddingDate: Date;
  venue?: VenueInfo;
  guestCount: number;
  budget?: number;
  status: WeddingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface VenueInfo {
  name: string;
  address: string;
  isOutdoor: boolean;
  capacity: number;
  contactInfo?: ContactInfo;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  emergencyPhone?: string;
}

export type WeddingStatus =
  | 'planning'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

// ============================================================================
// FORM SYSTEM TYPES
// ============================================================================

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: ValidationRule[];
  options?: FieldOption[];
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'min' | 'max' | 'pattern';
  value?: string | number;
  message: string;
}

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'time'
  | 'file'
  | 'signature';

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
}

export interface ResponseMeta {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: Date;
  version: string;
}

// ============================================================================
// REAL-TIME TYPES
// ============================================================================

export interface RealtimeEvent<T = any> {
  type: string;
  payload: T;
  timestamp: Date;
  userId?: string;
  organizationId?: string;
}

export interface RealtimeConnection {
  status: 'connected' | 'disconnected' | 'reconnecting';
  lastHeartbeat?: Date;
  reconnectAttempts: number;
  subscriptions: string[];
}

// ============================================================================
// MOBILE & RESPONSIVE TYPES
// ============================================================================

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser?: string;
  screenSize: {
    width: number;
    height: number;
  };
  touchSupport: boolean;
  pushSupport: boolean;
}

export interface TouchGesture {
  type: 'tap' | 'swipe' | 'pinch' | 'long_press';
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  duration?: number;
}

// ============================================================================
// SECURITY & COMPLIANCE TYPES
// ============================================================================

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  ipRestrictions?: string[];
  auditLogEnabled: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// PERFORMANCE & MONITORING TYPES
// ============================================================================

export interface PerformanceMetrics {
  loadTime: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  errorCount: number;
  timestamp: Date;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  services: ServiceHealth[];
  uptime: number;
  lastCheck: Date;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  errorRate?: number;
  lastCheck: Date;
}

// ============================================================================
// EXPORT UTILITY FUNCTIONS TYPE GUARDS
// ============================================================================

export const isSupplierNotification = (
  notification: any,
): notification is Notification => {
  return (
    notification &&
    typeof notification.notificationId === 'string' &&
    typeof notification.title === 'string' &&
    typeof notification.message === 'string'
  );
};

export const isCoupleNotification = (
  notification: any,
): notification is PersonalizedNotification => {
  return (
    notification &&
    typeof notification.notificationId === 'string' &&
    typeof notification.coupleId === 'string' &&
    typeof notification.weddingId === 'string'
  );
};

export const isWeddingDay = (date: Date): boolean => {
  const today = new Date();
  const weddingDate = new Date(date);
  return (
    today.getFullYear() === weddingDate.getFullYear() &&
    today.getMonth() === weddingDate.getMonth() &&
    today.getDate() === weddingDate.getDate()
  );
};

export const getDaysUntilWedding = (weddingDate: Date): number => {
  const today = new Date();
  const wedding = new Date(weddingDate);
  const diffTime = wedding.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ============================================================================
// RE-EXPORTS FROM OTHER TYPE FILES
// ============================================================================

// Re-export commonly used types from other files
export type { Database } from './supabase';
export type { FormData } from './forms';
export type { PaymentIntent, SubscriptionStatus } from './payments';
export type { RealtimeChannel } from './realtime';
export type { AnalyticsEvent } from './analytics';

// ============================================================================
// CONDITIONAL TYPES AND UTILITIES
// ============================================================================

// Utility type for making all properties optional
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Utility type for making specific properties required
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Utility type for extracting notification types by category
export type NotificationByType<T extends SupplierNotificationType> = Extract<
  Notification,
  { type: T }
>;

// Utility type for notification actions by type
export type ActionsByType<T extends ActionType> = Extract<
  NotificationAction,
  { type: T }
>;

// ============================================================================
// VERSION INFORMATION
// ============================================================================

export const TYPES_VERSION = '1.0.0';
export const LAST_UPDATED = '2025-01-22';
export const COMPATIBLE_API_VERSION = '2.0.0';
