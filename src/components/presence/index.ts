// WS-204 Presence Tracking UI Components
// Real-time presence awareness for wedding supplier coordination

export {
  PresenceIndicator,
  ConnectedPresenceIndicator,
} from './PresenceIndicator';

export {
  PresenceList,
  WeddingPresenceList,
  OrganizationPresenceList,
} from './PresenceList';

export {
  ActivityTracker,
  WeddingActivityTracker,
  PhotographerActivityTracker,
} from './ActivityTracker';

export { PresenceSettings } from './PresenceSettings';

// Re-export hooks for convenience
export {
  usePresence,
  useWeddingPresence,
  useOrganizationPresence,
  useGlobalPresence,
} from '@/hooks/usePresence';

// Re-export types for external usage
export type {
  PresenceState,
  PresenceStatus,
  PresenceSettings,
  PresenceVisibility,
  PresenceIndicatorProps,
  PresenceListProps,
  ActivityTrackerProps,
  PresenceSettingsProps,
  UsePresenceOptions,
  UsePresenceReturn,
  WeddingPresenceContext,
} from '@/types/presence';
