/**
 * WedSync Broadcast Events System - Component Exports
 * Complete notification system for wedding industry professionals
 */

export { BroadcastToast } from './BroadcastToast';
export { BroadcastCenter } from './BroadcastCenter';
export { BroadcastInbox } from './BroadcastInbox';
export { BroadcastPreferences } from './BroadcastPreferences';
export { BroadcastBadge } from './BroadcastBadge';

// Re-export types and utilities
export type {
  BroadcastMessage,
  BroadcastPriority,
  BroadcastPriorityQueue,
} from '@/lib/broadcast/priority-queue';

export {
  createWeddingBroadcastQueue,
  createTestBroadcast,
} from '@/lib/broadcast/priority-queue';

export {
  useBroadcastSubscription,
  useBroadcastPreferences,
} from '@/hooks/useBroadcastSubscription';

export type { BroadcastConnectionStatus } from '@/hooks/useBroadcastSubscription';
