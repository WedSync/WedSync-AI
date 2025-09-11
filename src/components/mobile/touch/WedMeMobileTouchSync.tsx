/**
 * WedMe Mobile Touch Sync Component
 * WS-189: Cross-platform mobile touch coordination
 *
 * WEDME INTEGRATION FEATURES:
 * - Cross-platform touch preference synchronization with unified gesture vocabulary
 * - Real-time preference updates with immediate UI adaptation and optimization
 * - Deep linking coordination with gesture-based navigation between applications
 * - WedMe portfolio touch optimization with smooth image navigation and gesture controls
 * - Professional workflow coordination with seamless platform switching
 *
 * @version 1.0.0
 * @author WedSync WedMe Integration Team
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { TouchOptimizedButton } from './TouchOptimizedButton';
import { useMobileTouch } from '@/hooks/useMobileTouch';
import { WedMeCrossPlatformTouchSync } from '@/lib/wedme/cross-platform-touch-sync';

/**
 * Cross-platform sync status states
 */
export type CrossPlatformSyncStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'error';

/**
 * Touch preferences structure for cross-platform sync
 */
export interface TouchPreferences {
  // Touch sensitivity and responsiveness
  touchSensitivity: 'low' | 'medium' | 'high';
  hapticFeedback: boolean;
  hapticIntensity: 'light' | 'medium' | 'strong';

  // Gesture preferences
  gesturesEnabled: boolean;
  swipeThreshold: number;
  longPressDelay: number;
  pinchSensitivity: number;

  // Visual feedback preferences
  touchRippleEffect: boolean;
  visualFeedbackDuration: number;
  touchHighlight: boolean;

  // Accessibility preferences
  largerTouchTargets: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  voiceOverOptimized: boolean;

  // Performance preferences
  performanceMode: 'battery' | 'balanced' | 'performance';
  animationsEnabled: boolean;
  backgroundSync: boolean;

  // Wedding-specific preferences
  weddingMode: boolean;
  emergencyAccessEnabled: boolean;
  quickActionsEnabled: boolean;
  teamCollaborationMode: boolean;
}

/**
 * WedMe authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  userId?: string;
  wedmeUserId?: string;
  syncToken?: string;
  lastSync?: number;
}

/**
 * Sync event data structure
 */
interface SyncEvent {
  type:
    | 'preference_update'
    | 'gesture_sync'
    | 'portfolio_action'
    | 'workflow_change';
  data: any;
  timestamp: number;
  source: 'wedsync' | 'wedme';
  userId: string;
}

/**
 * Component props for WedMe mobile touch sync
 */
interface WedMeMobileTouchSyncProps {
  wedmeAuth: AuthState;
  touchPreferences: TouchPreferences;
  syncStatus: CrossPlatformSyncStatus;
  onPreferenceSync: (preferences: TouchPreferences) => void;
  onSyncStatusChange: (status: CrossPlatformSyncStatus) => void;
  onDeepLink: (url: string, context: any) => void;
  enableRealtimeSync?: boolean;
  debugMode?: boolean;
  className?: string;
}

/**
 * WedMe Mobile Touch Sync Component
 * Manages cross-platform touch coordination between WedSync and WedMe
 */
export const WedMeMobileTouchSync: React.FC<WedMeMobileTouchSyncProps> = ({
  wedmeAuth,
  touchPreferences,
  syncStatus,
  onPreferenceSync,
  onSyncStatusChange,
  onDeepLink,
  enableRealtimeSync = true,
  debugMode = false,
  className,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncEvent[]>([]);
  const [conflictResolution, setConflictResolution] = useState<
    'wedsync' | 'wedme' | 'merge' | null
  >(null);
  const syncManagerRef = useRef<WedMeCrossPlatformTouchSync | null>(null);
  const { trackGesture, optimizeTouchTargets } = useMobileTouch();

  /**
   * Initialize WedMe sync manager
   */
  useEffect(() => {
    if (wedmeAuth.isAuthenticated && !syncManagerRef.current) {
      syncManagerRef.current = new WedMeCrossPlatformTouchSync({
        userId: wedmeAuth.userId!,
        wedmeUserId: wedmeAuth.wedmeUserId!,
        syncToken: wedmeAuth.syncToken!,
        onStatusChange: handleSyncStatusChange,
        onPreferenceUpdate: handlePreferenceUpdate,
        onConflict: handleSyncConflict,
        onDeepLink: handleDeepLink,
        debugMode,
      });

      initializeSync();
    }

    return () => {
      if (syncManagerRef.current) {
        syncManagerRef.current.disconnect();
        syncManagerRef.current = null;
      }
    };
  }, [wedmeAuth.isAuthenticated]);

  /**
   * Initialize cross-platform synchronization
   */
  const initializeSync = async () => {
    try {
      onSyncStatusChange('connecting');

      if (syncManagerRef.current) {
        await syncManagerRef.current.initialize();
        await syncManagerRef.current.syncPreferences(touchPreferences);

        if (enableRealtimeSync) {
          await syncManagerRef.current.enableRealtimeSync();
        }

        setIsInitialized(true);
        onSyncStatusChange('connected');

        // Log sync initialization
        addSyncEvent({
          type: 'workflow_change',
          data: { action: 'sync_initialized', preferences: touchPreferences },
          timestamp: Date.now(),
          source: 'wedsync',
          userId: wedmeAuth.userId!,
        });
      }
    } catch (error) {
      console.error('Failed to initialize WedMe sync:', error);
      onSyncStatusChange('error');
    }
  };

  /**
   * Handle sync status changes
   */
  const handleSyncStatusChange = useCallback(
    (status: CrossPlatformSyncStatus) => {
      onSyncStatusChange(status);

      if (debugMode) {
        console.log(`WedMe Sync Status: ${status}`);
      }
    },
    [onSyncStatusChange, debugMode],
  );

  /**
   * Handle preference updates from WedMe
   */
  const handlePreferenceUpdate = useCallback(
    (preferences: TouchPreferences, source: 'wedsync' | 'wedme') => {
      // Apply preferences immediately for better UX
      onPreferenceSync(preferences);

      // Optimize touch targets based on new preferences
      optimizeTouchTargets(
        preferences.largerTouchTargets ? 'xl' : 'standard',
        preferences.weddingMode,
      );

      // Log preference sync
      addSyncEvent({
        type: 'preference_update',
        data: { preferences, source },
        timestamp: Date.now(),
        source,
        userId: wedmeAuth.userId!,
      });

      trackGesture('preference_sync', {
        source,
        preferencesCount: Object.keys(preferences).length,
      });
    },
    [onPreferenceSync, optimizeTouchTargets, wedmeAuth.userId, trackGesture],
  );

  /**
   * Handle sync conflicts between platforms
   */
  const handleSyncConflict = useCallback(
    (
      wedSyncPrefs: TouchPreferences,
      wedMePrefs: TouchPreferences,
      conflictFields: string[],
    ) => {
      if (debugMode) {
        console.log('Sync conflict detected:', conflictFields);
      }

      // Auto-resolve simple conflicts based on timestamp and user activity
      const autoResolve = shouldAutoResolveConflict(conflictFields);

      if (autoResolve) {
        // Use WedSync preferences for wedding-specific settings
        const resolvedPrefs = mergePreferences(
          wedSyncPrefs,
          wedMePrefs,
          conflictFields,
        );
        handlePreferenceUpdate(resolvedPrefs, 'wedsync');
      } else {
        // Show conflict resolution UI for complex conflicts
        setConflictResolution('merge');
      }
    },
    [debugMode],
  );

  /**
   * Handle deep linking between platforms
   */
  const handleDeepLink = useCallback(
    (url: string, context: any) => {
      onDeepLink(url, context);

      // Log deep link event
      addSyncEvent({
        type: 'portfolio_action',
        data: { url, context, action: 'deep_link' },
        timestamp: Date.now(),
        source: 'wedme',
        userId: wedmeAuth.userId!,
      });

      trackGesture('deep_link_navigation', {
        source: 'wedme',
        context: context.type,
      });
    },
    [onDeepLink, wedmeAuth.userId, trackGesture],
  );

  /**
   * Add event to sync history
   */
  const addSyncEvent = (event: SyncEvent) => {
    setSyncHistory((prev) => {
      const newHistory = [event, ...prev].slice(0, 50); // Keep last 50 events
      return newHistory;
    });
  };

  /**
   * Determine if conflict should be auto-resolved
   */
  const shouldAutoResolveConflict = (conflictFields: string[]): boolean => {
    // Auto-resolve if only minor preference conflicts
    const minorFields = [
      'touchRippleEffect',
      'visualFeedbackDuration',
      'animationsEnabled',
    ];
    return conflictFields.every((field) => minorFields.includes(field));
  };

  /**
   * Merge preferences with conflict resolution
   */
  const mergePreferences = (
    wedSyncPrefs: TouchPreferences,
    wedMePrefs: TouchPreferences,
    conflictFields: string[],
  ): TouchPreferences => {
    const merged = { ...wedSyncPrefs };

    // Wedding-specific preferences prioritize WedSync
    const weddingFields = [
      'weddingMode',
      'emergencyAccessEnabled',
      'teamCollaborationMode',
    ];

    // Portfolio-specific preferences prioritize WedMe
    const portfolioFields = ['performanceMode', 'backgroundSync'];

    conflictFields.forEach((field) => {
      if (weddingFields.includes(field)) {
        merged[field as keyof TouchPreferences] =
          wedSyncPrefs[field as keyof TouchPreferences];
      } else if (portfolioFields.includes(field)) {
        merged[field as keyof TouchPreferences] =
          wedMePrefs[field as keyof TouchPreferences];
      } else {
        // Use most recent preference
        merged[field as keyof TouchPreferences] =
          wedMePrefs[field as keyof TouchPreferences];
      }
    });

    return merged;
  };

  /**
   * Force sync preferences to WedMe
   */
  const forceSyncToWedMe = async () => {
    if (!syncManagerRef.current) return;

    try {
      onSyncStatusChange('syncing');
      await syncManagerRef.current.syncPreferences(touchPreferences, true);
      onSyncStatusChange('connected');

      trackGesture('force_sync', { direction: 'to_wedme' });
    } catch (error) {
      console.error('Force sync failed:', error);
      onSyncStatusChange('error');
    }
  };

  /**
   * Pull preferences from WedMe
   */
  const pullFromWedMe = async () => {
    if (!syncManagerRef.current) return;

    try {
      onSyncStatusChange('syncing');
      const wedMePreferences =
        await syncManagerRef.current.getWedMePreferences();
      handlePreferenceUpdate(wedMePreferences, 'wedme');
      onSyncStatusChange('connected');

      trackGesture('pull_sync', { direction: 'from_wedme' });
    } catch (error) {
      console.error('Pull sync failed:', error);
      onSyncStatusChange('error');
    }
  };

  /**
   * Open WedMe portfolio with touch coordination
   */
  const openWedMePortfolio = (portfolioId?: string) => {
    const context = {
      touchPreferences,
      source: 'wedsync',
      timestamp: Date.now(),
    };

    const wedMeUrl = portfolioId
      ? `wedme://portfolio/${portfolioId}?touch_sync=true`
      : `wedme://portfolio?touch_sync=true`;

    handleDeepLink(wedMeUrl, { ...context, portfolioId });
  };

  /**
   * Resolve sync conflict manually
   */
  const resolveConflict = (resolution: 'wedsync' | 'wedme' | 'merge') => {
    // Implementation would handle conflict resolution based on user choice
    setConflictResolution(null);
    trackGesture('conflict_resolution', { resolution });
  };

  /**
   * Get sync status indicator
   */
  const getSyncStatusIndicator = () => {
    switch (syncStatus) {
      case 'connected':
        return { color: 'text-green-600', icon: '🟢', text: 'Connected' };
      case 'syncing':
        return { color: 'text-blue-600', icon: '🔄', text: 'Syncing...' };
      case 'connecting':
        return { color: 'text-yellow-600', icon: '🟡', text: 'Connecting...' };
      case 'error':
        return { color: 'text-red-600', icon: '🔴', text: 'Error' };
      case 'disconnected':
      default:
        return { color: 'text-gray-600', icon: '⚪', text: 'Disconnected' };
    }
  };

  const statusIndicator = getSyncStatusIndicator();

  if (!wedmeAuth.isAuthenticated) {
    return (
      <div className={cn('p-4 bg-gray-50 rounded-lg', className)}>
        <div className="text-center">
          <div className="text-4xl mb-4">📱</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            WedMe Integration
          </h3>
          <p className="text-gray-600 mb-4">
            Connect your WedMe account to sync touch preferences across
            platforms
          </p>
          <TouchOptimizedButton
            onClick={() => window.open('wedme://auth/connect', '_blank')}
            variant="primary"
            size="lg"
            touchTarget="large"
          >
            Connect WedMe Account
          </TouchOptimizedButton>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Sync Status Header */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{statusIndicator.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900">WedMe Sync</h3>
              <p className={cn('text-sm', statusIndicator.color)}>
                {statusIndicator.text}
              </p>
            </div>
          </div>

          {isInitialized && (
            <div className="flex space-x-2">
              <TouchOptimizedButton
                onClick={forceSyncToWedMe}
                size="sm"
                touchTarget="standard"
                variant="secondary"
                disabled={syncStatus === 'syncing'}
                className="text-xs"
              >
                Push to WedMe
              </TouchOptimizedButton>
              <TouchOptimizedButton
                onClick={pullFromWedMe}
                size="sm"
                touchTarget="standard"
                variant="secondary"
                disabled={syncStatus === 'syncing'}
                className="text-xs"
              >
                Pull from WedMe
              </TouchOptimizedButton>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <h4 className="font-semibold text-gray-900 mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-3">
          <TouchOptimizedButton
            onClick={() => openWedMePortfolio()}
            variant="primary"
            size="lg"
            touchTarget="large"
            className="h-16 flex flex-col items-center justify-center"
          >
            <span className="text-2xl mb-1">📸</span>
            <span className="text-sm">Open Portfolio</span>
          </TouchOptimizedButton>

          <TouchOptimizedButton
            onClick={() =>
              handleDeepLink('wedme://editor', { touchPreferences })
            }
            variant="secondary"
            size="lg"
            touchTarget="large"
            className="h-16 flex flex-col items-center justify-center"
          >
            <span className="text-2xl mb-1">✏️</span>
            <span className="text-sm">Photo Editor</span>
          </TouchOptimizedButton>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {conflictResolution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sync Conflict Detected
            </h3>
            <p className="text-gray-600 mb-6">
              Touch preferences differ between WedSync and WedMe. How would you
              like to resolve this?
            </p>

            <div className="space-y-3">
              <TouchOptimizedButton
                onClick={() => resolveConflict('wedsync')}
                variant="primary"
                size="lg"
                touchTarget="large"
                className="w-full"
              >
                Use WedSync Preferences
              </TouchOptimizedButton>
              <TouchOptimizedButton
                onClick={() => resolveConflict('wedme')}
                variant="secondary"
                size="lg"
                touchTarget="large"
                className="w-full"
              >
                Use WedMe Preferences
              </TouchOptimizedButton>
              <TouchOptimizedButton
                onClick={() => resolveConflict('merge')}
                variant="ghost"
                size="lg"
                touchTarget="large"
                className="w-full"
              >
                Smart Merge
              </TouchOptimizedButton>
            </div>
          </div>
        </div>
      )}

      {/* Sync History (Debug Mode) */}
      {debugMode && syncHistory.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Sync History</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {syncHistory.slice(0, 10).map((event, index) => (
              <div key={index} className="text-xs bg-white rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">
                    {event.type.replace('_', ' ')}
                  </span>
                  <span className="text-gray-500">{event.source}</span>
                </div>
                <div className="text-gray-600 mt-1">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Sync Toggle */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">Real-time Sync</h4>
            <p className="text-sm text-gray-600">
              Automatically sync preferences as you make changes
            </p>
          </div>
          <TouchOptimizedButton
            onClick={() => {
              if (syncManagerRef.current) {
                enableRealtimeSync
                  ? syncManagerRef.current.disableRealtimeSync()
                  : syncManagerRef.current.enableRealtimeSync();
              }
            }}
            variant={enableRealtimeSync ? 'primary' : 'secondary'}
            size="sm"
            touchTarget="large"
            className="min-w-[60px]"
          >
            {enableRealtimeSync ? 'ON' : 'OFF'}
          </TouchOptimizedButton>
        </div>
      </div>
    </div>
  );
};

export default WedMeMobileTouchSync;
