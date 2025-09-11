/**
 * Type definitions for WS-188 Mobile Offline Components
 */

export interface MobileOfflineManagerProps {
  weddingId: string;
  professionalId: string;
  onEmergencyAccess?: () => void;
  className?: string;
}

export interface TouchConflictResolverProps {
  conflicts: ConflictData[];
  onResolveConflict: (
    conflictId: string,
    resolution: 'local' | 'server' | 'merge',
  ) => Promise<void>;
  weddingId: string;
  className?: string;
}

export interface WedMeOfflineSyncProps {
  weddingId: string;
  professionalId: string;
  onSyncComplete?: () => void;
  className?: string;
}

export interface MobileEmergencyOfflineProps {
  weddingId: string;
  onEmergencyAccess?: () => void;
  className?: string;
}

export interface ConflictData {
  id: string;
  type: 'task' | 'timeline' | 'photo' | 'note' | 'guest';
  title: string;
  description: string;
  localValue: any;
  serverValue: any;
  timestamp: Date;
  userId: string;
  userName: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  priority: 'critical' | 'high' | 'medium';
  isAvailable: boolean;
  lastSeen?: Date;
}

export interface CriticalWeddingData {
  couple: string;
  date: Date;
  time: string;
  venue: string;
  venueAddress: string;
  venuePhone: string;
  timeline: Array<{
    time: string;
    event: string;
    location: string;
    contacts: string[];
  }>;
  emergencyContacts: EmergencyContact[];
  vendors: Array<{
    type: 'photographer' | 'dj' | 'caterer' | 'florist' | 'transport';
    name: string;
    contact: string;
    critical: boolean;
  }>;
}

export interface SyncStatus {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error' | 'complete';
  queuedItems: number;
  batteryLevel: number;
  lastSync: Date | null;
  criticalDataCached: boolean;
}

export interface OfflineData {
  weddingData: any;
  cachedAt: Date;
  isValid: boolean;
  syncRequired: boolean;
}

export interface SyncAction {
  type: 'manual' | 'auto' | 'retry';
  priority: 'low' | 'normal' | 'high';
  data?: any;
}

export interface ResolutionChoice {
  conflictId: string;
  resolution: 'local' | 'server' | 'merge';
  reason?: string;
}

export type SwipeDirection = 'left' | 'right' | 'up' | null;
