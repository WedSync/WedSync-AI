/**
 * Mobile Offline Components - WS-188 Implementation
 * Export all mobile-optimized offline functionality components
 */

// Core mobile offline management components
export { MobileOfflineManager } from './MobileOfflineManager';
export { TouchConflictResolver } from './TouchConflictResolver';
export { WedMeOfflineSync } from './WedMeOfflineSync';
export { MobileEmergencyOffline } from './MobileEmergencyOffline';

// Type exports for component props and interfaces
export type {
  MobileOfflineManagerProps,
  TouchConflictResolverProps,
  WedMeOfflineSyncProps,
  MobileEmergencyOfflineProps,
} from './types';

// Re-export integration services and hooks
export { wedMeIntegration } from '@/lib/integrations/WedMeIntegration';
export { pwaService } from '@/lib/integrations/PWAService';
export { useWedMeOfflineSync } from '@/hooks/useWedMeOfflineSync';

// Re-export types from integration services
export type {
  WedMeAuthToken,
  WedMeDevice,
  WedMeSyncItem,
} from '@/lib/integrations/WedMeIntegration';

export type {
  PWACapabilities,
  PushNotificationPayload,
} from '@/lib/integrations/PWAService';

export type {
  WedMeSyncStatus,
  UseWedMeOfflineSyncReturn,
} from '@/hooks/useWedMeOfflineSync';
