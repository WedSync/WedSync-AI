// Wedding Notification System Types for WedSync Platform
// Comprehensive TypeScript interfaces for intelligent notification management

export type NotificationType =
  | 'payment'
  | 'booking'
  | 'timeline'
  | 'weather'
  | 'vendor_update'
  | 'client_message'
  | 'system'
  | 'marketing'
  | 'celebration'
  | 'emergency';

export type NotificationCategory =
  | 'urgent'
  | 'wedding_day'
  | 'payments'
  | 'communications'
  | 'updates'
  | 'reminders'
  | 'celebrations'
  | 'system_alerts';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ActionType =
  | 'approve'
  | 'decline'
  | 'reschedule'
  | 'view_details'
  | 'mark_complete'
  | 'escalate'
  | 'contact_vendor'
  | 'emergency_call'
  | 'update_timeline';

export type ActionStyle = 'primary' | 'secondary' | 'destructive' | 'neutral';

export type NotificationChannel =
  | 'in_app'
  | 'email'
  | 'sms'
  | 'push'
  | 'whatsapp'
  | 'emergency_call';

export type UserRole =
  | 'photographer'
  | 'venue_manager'
  | 'wedding_planner'
  | 'couple'
  | 'vendor'
  | 'admin'
  | 'enterprise_admin';

export type GroupingStrategy =
  | 'by_wedding'
  | 'by_vendor'
  | 'by_type'
  | 'by_urgency'
  | 'by_date'
  | 'smart_context';

export type SwipeAction = 'dismiss' | 'archive' | 'snooze' | 'escalate';

export interface WeddingReference {
  weddingId: string;
  coupleName: string;
  weddingDate: Date;
  venue?: string;
  isWeddingDay: boolean;
  daysUntilWedding: number;
  weddingStatus: 'planning' | 'this_week' | 'today' | 'completed';
}

export interface VendorReference {
  vendorId: string;
  vendorName: string;
  vendorType: string;
  contactInfo: {
    email?: string;
    phone?: string;
    emergencyPhone?: string;
  };
  isEmergencyContact: boolean;
}

export interface NotificationMetadata {
  source: string;
  sourceId?: string;
  previewImage?: string;
  actionUrl?: string;
  weddingContext?: WeddingReference;
  vendorContext?: VendorReference;
  urgencyScore?: number;
  estimatedReadTime?: number;
  requiresResponse?: boolean;
  responseDeadline?: Date;
  attachments?: NotificationAttachment[];
  trackingData?: Record<string, any>;
}

export interface NotificationAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'video' | 'audio';
  size: number;
  thumbnail?: string;
}

export interface NotificationAction {
  actionId: string;
  label: string;
  type: ActionType;
  style: ActionStyle;
  confirmationRequired: boolean;
  confirmationMessage?: string;
  handler: (context: ActionContext) => Promise<ActionResult>;
  icon?: string;
  shortcut?: string;
  isDisabled?: boolean;
  disabledReason?: string;
}

export interface ActionContext {
  notificationId: string;
  userId: string;
  organizationId: string;
  weddingContext?: WeddingReference;
  vendorContext?: VendorReference;
  timestamp: Date;
  userAgent?: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
}

export interface ActionResult {
  success: boolean;
  message?: string;
  redirectUrl?: string;
  followupActions?: NotificationAction[];
  analyticsData?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface Notification {
  notificationId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: PriorityLevel;
  title: string;
  message: string;
  richContent?: {
    html?: string;
    markdown?: string;
    components?: React.ComponentType[];
  };
  timestamp: Date;
  readStatus: boolean;
  readAt?: Date;
  actionRequired: boolean;
  actions: NotificationAction[];
  relatedWedding?: WeddingReference;
  relatedVendor?: VendorReference;
  expiresAt?: Date;
  snoozeUntil?: Date;
  metadata: NotificationMetadata;
  deliveryStatus: {
    inApp: 'pending' | 'delivered' | 'failed';
    email?: 'pending' | 'delivered' | 'failed';
    sms?: 'pending' | 'delivered' | 'failed';
    push?: 'pending' | 'delivered' | 'failed';
  };
  engagement: {
    viewed: boolean;
    viewedAt?: Date;
    clicked: boolean;
    clickedAt?: Date;
    actionTaken: boolean;
    actionTakenAt?: Date;
  };
}

export interface NotificationGroup {
  groupId: string;
  title: string;
  description?: string;
  notifications: Notification[];
  highestPriority: PriorityLevel;
  expanded: boolean;
  totalCount: number;
  unreadCount: number;
  groupType: GroupingStrategy;
  lastUpdated: Date;
  weddingContext?: WeddingReference;
  vendorContext?: VendorReference;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    [K in NotificationChannel]: {
      enabled: boolean;
      types: NotificationType[];
      quietHours?: QuietHoursConfiguration;
    };
  };
  categorySettings: {
    [K in NotificationCategory]: {
      enabled: boolean;
      priority: PriorityLevel;
      channels: NotificationChannel[];
      emergencyOverride: boolean;
    };
  };
  quietHours: QuietHoursConfiguration;
  weddingDaySettings: WeddingDayNotificationSettings;
  emergencyOverrides: EmergencyOverrideSettings;
  personalizations: PersonalizationSettings;
  smartFiltering: SmartFilterConfiguration;
  mobileSettings: MobileNotificationSettings;
}

export interface QuietHoursConfiguration {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  timezone: string;
  emergencyOverride: boolean;
  weddingDayOverride: boolean;
  weekendSettings?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

export interface WeddingDayNotificationSettings {
  enableSpecialMode: boolean;
  criticalAlertsOnly: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  emergencyContactsEnabled: boolean;
  weatherAlertsEnabled: boolean;
  vendorCoordinationEnabled: boolean;
  timelineAlertsEnabled: boolean;
  celebrationNotificationsEnabled: boolean;
}

export interface EmergencyOverrideSettings {
  enabled: boolean;
  emergencyContacts: string[];
  escalationTimeMinutes: number;
  bypassQuietHours: boolean;
  forceSound: boolean;
  forceVibration: boolean;
  requireAcknowledgment: boolean;
}

export interface PersonalizationSettings {
  displayName: string;
  avatar?: string;
  greetingStyle: 'professional' | 'friendly' | 'casual';
  celebrationStyle: 'enthusiastic' | 'gentle' | 'minimal';
  languagePreference: string;
  timezonePreference: string;
  weddingTheme?: {
    primaryColor: string;
    secondaryColor: string;
    fontStyle: 'elegant' | 'modern' | 'classic';
  };
}

export interface SmartFilterConfiguration {
  enabled: boolean;
  duplicateDetection: boolean;
  relatedGrouping: boolean;
  urgencyScoring: boolean;
  predictiveFiltering: boolean;
  learningEnabled: boolean;
  confidenceThreshold: number; // 0-1
}

export interface MobileNotificationSettings {
  swipeGesturesEnabled: boolean;
  hapticFeedbackEnabled: boolean;
  largeTextMode: boolean;
  oneHandedMode: boolean;
  batteryOptimizationEnabled: boolean;
  offlineStorageDays: number;
}

export interface VisualNotificationPreferences {
  theme: 'light' | 'dark' | 'system';
  animationsEnabled: boolean;
  soundEnabled: boolean;
  badgeCountVisible: boolean;
  previewsEnabled: boolean;
  compactMode: boolean;
  showAvatars: boolean;
  showTimestamps: boolean;
  colorCodePriority: boolean;
}

export interface NotificationCenter {
  notifications: Notification[];
  groups: NotificationGroup[];
  unreadCount: number;
  totalCount: number;
  categoryFilters: NotificationCategory[];
  activeCategoryFilter: NotificationCategory | 'all';
  priorityLevels: PriorityLevel[];
  activePriorityFilter: PriorityLevel | 'all';
  isLoading: boolean;
  error?: string;
  lastUpdated: Date;
  hasMore: boolean;
  currentPage: number;
  soundEnabled: boolean;
  visualPreferences: VisualNotificationPreferences;
  smartFiltering: SmartFilterConfiguration;
  realtimeConnection: {
    status: 'connected' | 'disconnected' | 'reconnecting';
    lastHeartbeat?: Date;
  };
}

export interface NotificationSystemProps {
  userId: string;
  organizationId: string;
  userRole: UserRole;
  notificationPreferences: NotificationPreferences;
  weddingContext?: WeddingReference[];
  onNotificationAction: (
    action: NotificationActionRequest,
  ) => Promise<ActionResult>;
  onPreferencesUpdate: (
    preferences: Partial<NotificationPreferences>,
  ) => Promise<void>;
  isWeddingDay?: boolean;
  emergencyMode?: boolean;
}

export interface NotificationActionRequest {
  notificationId: string;
  actionType: ActionType;
  context: ActionContext;
  data?: Record<string, any>;
}

export interface IncomingNotification {
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  priority?: PriorityLevel;
  userId: string;
  organizationId: string;
  weddingId?: string;
  vendorId?: string;
  metadata?: Partial<NotificationMetadata>;
  channels?: NotificationChannel[];
  actions?: Omit<NotificationAction, 'handler'>[];
  expiresAt?: Date;
  scheduledFor?: Date;
}

export interface ProcessedNotification extends Notification {
  urgencyScore: number;
  deliveryChannels: NotificationChannel[];
  groupingKey?: string;
  aiInsights?: {
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: number;
    topics: string[];
    suggestedActions: string[];
  };
}

export interface FilteredNotifications {
  notifications: Notification[];
  filteredCount: number;
  totalCount: number;
  appliedFilters: {
    category?: NotificationCategory;
    priority?: PriorityLevel;
    wedding?: string;
    vendor?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface UrgencyScore {
  score: number; // 0-100
  factors: {
    timeRemaining: number;
    weddingProximity: number;
    userRole: number;
    notificationType: number;
    historicalPattern: number;
  };
  reasoning: string[];
}

export interface UserContext {
  userId: string;
  organizationId: string;
  userRole: UserRole;
  currentWeddings: WeddingReference[];
  preferences: NotificationPreferences;
  timezone: string;
  deviceInfo: {
    type: 'mobile' | 'desktop' | 'tablet';
    os: string;
    browser?: string;
    pushSupport: boolean;
  };
  behaviorData: UserBehaviorData;
}

export interface UserBehaviorData {
  averageResponseTime: number; // minutes
  preferredInteractionTimes: number[]; // hours 0-23
  engagementPatterns: {
    [K in NotificationCategory]: {
      openRate: number;
      responseRate: number;
      dismissRate: number;
    };
  };
  deviceUsagePatterns: {
    mobileUsage: number; // percentage
    desktopUsage: number; // percentage
  };
  lastActiveTime: Date;
}

export interface SmartNotificationEngine {
  processIncomingNotification(
    notification: IncomingNotification,
    context: UserContext,
  ): Promise<ProcessedNotification>;

  applyIntelligentFiltering(
    notifications: Notification[],
    context: UserContext,
  ): Promise<FilteredNotifications>;

  calculateUrgencyScore(
    notification: Notification,
    context: UserContext,
  ): Promise<UrgencyScore>;

  groupRelatedNotifications(
    notifications: Notification[],
    strategy: GroupingStrategy,
  ): Promise<NotificationGroup[]>;

  predictOptimalDeliveryTime(
    notification: Notification,
    userBehavior: UserBehaviorData,
  ): Promise<Date>;

  generateSmartSummary(notifications: Notification[]): Promise<{
    summary: string;
    keyActions: NotificationAction[];
    urgentCount: number;
  }>;
}

export interface WeatherNotification extends Notification {
  weatherData: {
    condition: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    chanceOfRain: number;
    alerts: string[];
    venue: {
      name: string;
      isOutdoor: boolean;
      backup: string;
    };
  };
  recommendations: string[];
}

export interface WeddingDayContext {
  weddingId: string;
  date: Date;
  isToday: boolean;
  hoursUntilCeremony: number;
  currentPhase: 'preparation' | 'ceremony' | 'reception' | 'completed';
  criticalVendors: VendorReference[];
  timeline: {
    eventId: string;
    name: string;
    startTime: Date;
    vendor: string;
    status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  }[];
  weatherStatus: 'good' | 'concerning' | 'critical';
  emergencyContacts: {
    name: string;
    role: string;
    phone: string;
    isPrimary: boolean;
  }[];
}

// Utility types for better type inference
export type NotificationsByCategory = {
  [K in NotificationCategory]: Notification[];
};

export type NotificationsByPriority = {
  [K in PriorityLevel]: Notification[];
};

export type CategoryCounts = {
  [K in NotificationCategory]: number;
} & { all: number };

// Event types for real-time subscriptions
export interface NotificationEvent {
  type:
    | 'notification_received'
    | 'notification_updated'
    | 'notification_deleted'
    | 'bulk_update';
  payload: {
    notification?: Notification;
    notifications?: Notification[];
    notificationId?: string;
    userId: string;
    organizationId: string;
  };
  timestamp: Date;
}

// API Response types
export interface NotificationResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Store types for state management
export interface NotificationState {
  notifications: Notification[];
  groups: NotificationGroup[];
  preferences: NotificationPreferences;
  ui: {
    isOpen: boolean;
    activeFilter: NotificationCategory | 'all';
    activePriorityFilter: PriorityLevel | 'all';
    isLoading: boolean;
    error: string | null;
  };
  realtime: {
    connected: boolean;
    reconnectAttempts: number;
    lastMessage?: Date;
  };
}

export interface NotificationActions {
  // Notification management
  addNotification: (notification: Notification) => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;

  // Filtering and grouping
  setActiveFilter: (filter: NotificationCategory | 'all') => void;
  setPriorityFilter: (filter: PriorityLevel | 'all') => void;
  groupNotifications: (strategy: GroupingStrategy) => void;

  // UI state
  toggleNotificationCenter: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Real-time
  setRealtimeStatus: (connected: boolean) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;

  // Preferences
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
}

export type NotificationStore = NotificationState & NotificationActions;
