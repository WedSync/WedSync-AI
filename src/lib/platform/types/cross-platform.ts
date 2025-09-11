// Cross-Platform Integration Types for WS-342 Real-Time Wedding Collaboration
// Team D Platform Development - Cross-platform type definitions

export interface CrossPlatformEvent {
  id: string;
  sourceType: 'wedsync' | 'wedme';
  targetPlatform: 'wedsync' | 'wedme' | 'both';
  eventType: CrossPlatformEventType;
  weddingId: string;
  userId: string;
  data: any;
  timestamp: Date;

  // Growth tracking
  viralPotential: ViralPotential;
  invitationTrigger?: InvitationTrigger;
}

export type CrossPlatformEventType =
  | 'vendor_invitation_sent'
  | 'couple_onboarded'
  | 'collaboration_started'
  | 'timeline_shared'
  | 'budget_collaborated'
  | 'vendor_recommended'
  | 'review_shared'
  | 'referral_generated'
  | 'platform_switch_detected';

export interface SyncResult {
  success: boolean;
  eventId: string;
  syncedPlatforms: ('wedsync' | 'wedme')[];
  errors?: SyncError[];
  timestamp: Date;
}

export interface SyncError {
  platform: 'wedsync' | 'wedme';
  errorCode: string;
  message: string;
  retryable: boolean;
}

export interface PlatformConflict {
  conflictId: string;
  weddingId: string;
  conflictType: ConflictType;
  sourceData: any;
  targetData: any;
  platforms: ('wedsync' | 'wedme')[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolutionRequired: boolean;
}

export type ConflictType =
  | 'data_mismatch'
  | 'concurrent_edit'
  | 'permission_conflict'
  | 'version_conflict'
  | 'business_rule_violation';

export interface ConflictResolution {
  conflictId: string;
  resolution: ResolutionStrategy;
  resolvedData: any;
  appliedToPlatforms: ('wedsync' | 'wedme')[];
  timestamp: Date;
  resolvedBy: string;
}

export type ResolutionStrategy =
  | 'merge_data'
  | 'prefer_source'
  | 'prefer_target'
  | 'manual_resolution'
  | 'create_both';

export interface Platform {
  id: 'wedsync' | 'wedme';
  name: string;
  version: string;
  capabilities: PlatformCapability[];
  syncEnabled: boolean;
  lastSyncTime?: Date;
}

export type PlatformCapability =
  | 'real_time_sync'
  | 'presence_tracking'
  | 'collaboration'
  | 'file_sharing'
  | 'video_calls'
  | 'notifications'
  | 'offline_support';

export interface ViralPotential {
  score: number; // 0-1 scale
  factors: ViralFactor[];
  expectedNewUsers: number;
  networkReach: number;
}

export interface ViralFactor {
  type: ViralFactorType;
  impact: number; // 0-1 scale
  confidence: number; // 0-1 scale
}

export type ViralFactorType =
  | 'user_engagement'
  | 'network_size'
  | 'content_quality'
  | 'timing'
  | 'social_proof'
  | 'incentive_strength';

export interface InvitationTrigger {
  triggerId: string;
  triggerType: InvitationTriggerType;
  targetUsers: string[];
  message?: string;
  incentives?: Incentive[];
  expiresAt?: Date;
}

export type InvitationTriggerType =
  | 'missing_vendor_category'
  | 'vendor_recommendation'
  | 'timeline_milestone'
  | 'budget_threshold'
  | 'collaboration_opportunity';

export interface Incentive {
  type: IncentiveType;
  value: number;
  currency?: string;
  description: string;
  conditions?: string[];
}

export type IncentiveType =
  | 'discount'
  | 'credit'
  | 'upgrade'
  | 'referral_bonus'
  | 'feature_unlock';
