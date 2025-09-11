/**
 * Shared service interfaces for integration system
 * Prevents circular dependencies by providing common service contracts
 */

import type {
  WeddingCollaborationEvent,
  IntegrationEvent,
  BroadcastResult,
  SyncResult,
  IntegrationConflict,
  ConflictResolution,
  VendorSystemConfig,
  IntegrationResult,
} from './integration';

// Event broadcasting service interface
export interface EventBroadcasterInterface {
  broadcastEvent(event: WeddingCollaborationEvent): Promise<BroadcastResult[]>;
  subscribeToEvents(
    eventTypes: string[],
    callback: EventSubscriberCallback,
    filter?: EventFilter,
  ): string;
  unsubscribe(subscriptionId: string): void;
  notifySubscribers(event: WeddingCollaborationEvent): Promise<void>;
  broadcastEmergencyAlert(
    weddingId: string,
    emergency: WeddingEmergency,
  ): Promise<BroadcastResult[]>;
}

// Vendor integration management service interface
export interface VendorIntegrationManagerInterface {
  connectVendorSystem(config: VendorSystemConfig): Promise<IntegrationResult>;
  syncVendorData(vendorId: string, dataType: string): Promise<SyncResult>;
  broadcastToVendorSystems(
    event: WeddingCollaborationEvent,
  ): Promise<BroadcastResult[]>;
  coordinateVendorUpdates(
    weddingId: string,
    updates: VendorUpdate[],
  ): Promise<void>;
  trackVendorActivity(
    vendorId: string,
    activity: VendorActivity,
  ): Promise<void>;
}

// Real-time sync orchestration service interface
export interface RealTimeSyncOrchestratorInterface {
  orchestrateCrossSystemSync(
    event: WeddingCollaborationEvent,
  ): Promise<SyncResult[]>;
  handleIntegrationEvent(event: IntegrationEvent): Promise<void>;
  resolveIntegrationConflicts(
    conflicts: IntegrationConflict[],
  ): Promise<ConflictResolution[]>;
  getLastSyncTime(weddingId: string): Promise<Date | null>;
}

// Service dependency injection container
export interface IntegrationServices {
  eventBroadcaster?: EventBroadcasterInterface;
  vendorIntegrationManager?: VendorIntegrationManagerInterface;
  realTimeSyncOrchestrator?: RealTimeSyncOrchestratorInterface;
}

// Supporting interfaces
export interface EventSubscriberCallback {
  (event: WeddingCollaborationEvent): Promise<void>;
}

export interface EventFilter {
  weddingId?: string;
  priority?: string;
  minPriorityLevel?: string;
  systemType?: string;
}

export interface WeddingEmergency {
  type: 'weather' | 'venue' | 'vendor' | 'medical' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  actionRequired: string;
  affectedVendors: string[];
  reportedBy: string;
  reportedAt: Date;
}

export interface VendorUpdate {
  vendorId: string;
  updateType: 'timeline' | 'payment' | 'communication' | 'status';
  data: any;
  timestamp: Date;
  weddingId: string;
}

export interface VendorActivity {
  vendorId: string;
  activityType: string;
  data: any;
  timestamp: Date;
  weddingId?: string;
}
