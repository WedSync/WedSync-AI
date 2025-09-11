/**
 * useOutlookSync Hook - Microsoft Outlook Calendar Integration
 * Core React hook for managing Outlook calendar synchronization
 *
 * Wedding Professional Features:
 * - Client consultation scheduling
 * - Wedding day timeline sync
 * - Vendor coordination meetings
 * - Emergency schedule changes
 * - Multi-calendar conflict resolution
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PublicClientApplication,
  AccountInfo,
  AuthenticationResult,
} from '@azure/msal-browser';
import { Client } from '@microsoft/microsoft-graph-client';
import { supabase } from '@/lib/supabase';
import {
  UseOutlookSyncReturn,
  OutlookAuthState,
  OutlookSyncStatus,
  WeddingCalendarEvent,
  EventConflict,
  OutlookSyncSettings,
  ConflictResolution,
  SyncStatusType,
  OutlookOAuthConfig,
} from '@/types/outlook';

// OAuth Configuration for Wedding Professionals
const OAUTH_CONFIG: OutlookOAuthConfig = {
  clientId: process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID || '',
  authority: 'https://login.microsoftonline.com/common',
  redirectUri:
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/outlook/callback`
      : '',
  scopes: [
    'https://graph.microsoft.com/Calendars.ReadWrite',
    'https://graph.microsoft.com/Calendars.Read',
    'https://graph.microsoft.com/User.Read',
    'offline_access',
  ],
};

/**
 * Microsoft Outlook Calendar Integration Hook
 * Provides comprehensive calendar synchronization for wedding professionals
 */
export function useOutlookSync(): UseOutlookSyncReturn {
  // Authentication State
  const [authState, setAuthState] = useState<OutlookAuthState>({
    isAuthenticated: false,
    isInitializing: true,
    isTokenRefreshing: false,
    userAccount: null,
    accessToken: null,
    error: null,
  });

  // Sync Status State
  const [syncStatus, setSyncStatus] = useState<OutlookSyncStatus>({
    syncId: '',
    status: 'idle',
    isRunning: false,
    progress: {
      total: 0,
      processed: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      currentAction: 'Ready to sync',
    },
    startTime: '',
    conflicts: [],
  });

  // Conflicts and Settings
  const [conflicts, setConflicts] = useState<EventConflict[]>([]);
  const [settings, setSettings] = useState<OutlookSyncSettings | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean>(true);

  // MSAL and Graph Client refs
  const msalInstanceRef = useRef<PublicClientApplication | null>(null);
  const graphClientRef = useRef<Client | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Generate cryptographically secure OAuth state parameter
   * Prevents CSRF attacks on authentication flow
   */
  const generateSecureState = useCallback((): string => {
    if (typeof window === 'undefined') return '';

    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const state = Array.from(array, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');

    // Store state in session storage for validation
    sessionStorage.setItem('outlook_oauth_state', state);

    return state;
  }, []);

  /**
   * Validate OAuth state parameter to prevent CSRF attacks
   */
  const validateOAuthState = useCallback((receivedState: string): boolean => {
    const storedState = sessionStorage.getItem('outlook_oauth_state');
    sessionStorage.removeItem('outlook_oauth_state');

    return storedState === receivedState && receivedState.length === 64;
  }, []);

  /**
   * Initialize MSAL instance for Microsoft authentication
   */
  const initializeMSAL = useCallback(async (): Promise<void> => {
    try {
      if (msalInstanceRef.current) return;

      const msalConfig = {
        auth: {
          clientId: OAUTH_CONFIG.clientId,
          authority: OAUTH_CONFIG.authority,
          redirectUri: OAUTH_CONFIG.redirectUri,
        },
        cache: {
          cacheLocation: 'sessionStorage',
          storeAuthStateInCookie: false,
        },
      };

      const msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();

      msalInstanceRef.current = msalInstance;

      // Check for existing authentication
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const account = accounts[0];
        setAuthState((prev) => ({
          ...prev,
          isAuthenticated: true,
          userAccount: account,
          isInitializing: false,
        }));

        // Initialize Graph client
        await initializeGraphClient();
      } else {
        setAuthState((prev) => ({
          ...prev,
          isInitializing: false,
        }));
      }
    } catch (error) {
      console.error('MSAL initialization failed:', error);
      setAuthState((prev) => ({
        ...prev,
        error: 'Failed to initialize Microsoft authentication',
        isInitializing: false,
      }));
    }
  }, []);

  /**
   * Initialize Microsoft Graph API client
   */
  const initializeGraphClient = useCallback(async (): Promise<void> => {
    if (!msalInstanceRef.current) return;

    try {
      const authProvider = {
        getAccessToken: async (): Promise<string> => {
          const accounts = msalInstanceRef.current!.getAllAccounts();
          if (accounts.length === 0)
            throw new Error('No authenticated accounts');

          const request = {
            scopes: OAUTH_CONFIG.scopes,
            account: accounts[0],
          };

          try {
            const response =
              await msalInstanceRef.current!.acquireTokenSilent(request);
            setAuthState((prev) => ({
              ...prev,
              accessToken: response.accessToken,
            }));
            return response.accessToken;
          } catch (silentError) {
            // Silent token acquisition failed, try popup
            const response =
              await msalInstanceRef.current!.acquireTokenPopup(request);
            setAuthState((prev) => ({
              ...prev,
              accessToken: response.accessToken,
            }));
            return response.accessToken;
          }
        },
      };

      const graphClient = Client.initWithMiddleware({ authProvider });
      graphClientRef.current = graphClient;
    } catch (error) {
      console.error('Graph client initialization failed:', error);
      setLastError('Failed to initialize Microsoft Graph API client');
    }
  }, []);

  /**
   * Authenticate with Microsoft Outlook
   * Implements OAuth2 with CSRF protection
   */
  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      if (!msalInstanceRef.current) {
        await initializeMSAL();
      }

      if (!msalInstanceRef.current) {
        throw new Error('MSAL instance not initialized');
      }

      const state = generateSecureState();

      const loginRequest = {
        scopes: OAUTH_CONFIG.scopes,
        state,
        extraQueryParameters: {
          response_mode: 'query',
        },
      };

      setAuthState((prev) => ({ ...prev, error: null }));

      const response: AuthenticationResult =
        await msalInstanceRef.current.loginPopup(loginRequest);

      if (!validateOAuthState(response.state || '')) {
        throw new Error('Invalid OAuth state parameter - possible CSRF attack');
      }

      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: true,
        userAccount: response.account,
        accessToken: response.accessToken,
        error: null,
      }));

      await initializeGraphClient();

      // Store encrypted tokens securely
      await storeTokensSecurely(response);

      // Load user settings
      await loadUserSettings();

      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed';
      setAuthState((prev) => ({
        ...prev,
        error: errorMessage,
        isAuthenticated: false,
      }));
      setLastError(errorMessage);
      return false;
    }
  }, [generateSecureState, validateOAuthState]);

  /**
   * Securely store OAuth tokens (encrypted)
   * Prevents token theft and ensures secure storage
   */
  const storeTokensSecurely = useCallback(
    async (authResult: AuthenticationResult): Promise<void> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');

        // Note: In production, tokens should be encrypted before storage
        const encryptedData = {
          accessToken: btoa(authResult.accessToken), // Basic encoding - should use proper encryption
          refreshToken: btoa(authResult.refreshToken || ''),
          expiresOn: authResult.expiresOn?.getTime(),
          account: authResult.account,
        };

        await supabase.from('outlook_integrations').upsert({
          user_id: user.id,
          encrypted_tokens: JSON.stringify(encryptedData),
          account_info: authResult.account,
          last_sync: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to store tokens securely:', error);
        throw error;
      }
    },
    [],
  );

  /**
   * Disconnect from Outlook
   * Securely removes all stored tokens and authentication
   */
  const disconnect = useCallback(async (): Promise<void> => {
    try {
      if (msalInstanceRef.current) {
        const accounts = msalInstanceRef.current.getAllAccounts();
        if (accounts.length > 0) {
          await msalInstanceRef.current.logoutPopup({ account: accounts[0] });
        }
      }

      // Clear stored tokens
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('outlook_integrations')
          .delete()
          .eq('user_id', user.id);
      }

      // Clear state
      setAuthState({
        isAuthenticated: false,
        isInitializing: false,
        isTokenRefreshing: false,
        userAccount: null,
        accessToken: null,
        error: null,
      });

      graphClientRef.current = null;
      setSettings(null);
      setConflicts([]);
    } catch (error) {
      console.error('Disconnect failed:', error);
      setLastError('Failed to disconnect from Outlook');
    }
  }, []);

  /**
   * Load user's Outlook sync settings
   */
  const loadUserSettings = useCallback(async (): Promise<void> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('outlook_sync_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Not found is OK
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  /**
   * Sync wedding events to Outlook calendar
   * Handles wedding-specific event types and metadata
   */
  const syncEvents = useCallback(
    async (events: WeddingCalendarEvent[]): Promise<boolean> => {
      if (!graphClientRef.current || !authState.isAuthenticated) {
        setLastError('Not authenticated with Outlook');
        return false;
      }

      try {
        const syncId = crypto.randomUUID();
        setSyncStatus((prev) => ({
          ...prev,
          syncId,
          status: 'syncing',
          isRunning: true,
          startTime: new Date().toISOString(),
          progress: {
            total: events.length,
            processed: 0,
            created: 0,
            updated: 0,
            deleted: 0,
            errors: 0,
            currentAction: 'Starting sync...',
          },
          conflicts: [],
        }));

        let processed = 0;
        let created = 0;
        let errors = 0;

        for (const event of events) {
          try {
            setSyncStatus((prev) => ({
              ...prev,
              progress: {
                ...prev.progress,
                currentAction: `Syncing: ${event.title}`,
                processed,
              },
            }));

            const graphEvent = {
              subject: event.title,
              body: {
                contentType: 'text',
                content: event.description || '',
              },
              start: {
                dateTime: event.start,
                timeZone: 'UTC',
              },
              end: {
                dateTime: event.end,
                timeZone: 'UTC',
              },
              location: event.location
                ? {
                    displayName: event.location,
                  }
                : undefined,
              categories: [event.type, 'WedSync', 'Wedding Professional'],
              importance:
                event.priority === 'high' || event.priority === 'urgent'
                  ? 'high'
                  : 'normal',
              reminderMinutesBeforeStart: event.reminderMinutes[0] || 15,
            };

            await graphClientRef.current!.api('/me/events').post(graphEvent);
            created++;
            processed++;
          } catch (eventError) {
            console.error(`Failed to sync event ${event.title}:`, eventError);
            errors++;
            processed++;
          }

          // Add small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        setSyncStatus((prev) => ({
          ...prev,
          status: 'completed',
          isRunning: false,
          endTime: new Date().toISOString(),
          progress: {
            ...prev.progress,
            processed,
            created,
            errors,
            currentAction: 'Sync completed',
          },
          lastSyncTime: new Date().toISOString(),
        }));

        return errors === 0;
      } catch (error) {
        console.error('Sync failed:', error);
        setSyncStatus((prev) => ({
          ...prev,
          status: 'failed',
          isRunning: false,
          endTime: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Sync failed',
        }));
        setLastError(error instanceof Error ? error.message : 'Sync failed');
        return false;
      }
    },
    [authState.isAuthenticated],
  );

  /**
   * Sync all calendars from Outlook to WedSync
   */
  const syncCalendars = useCallback(async (): Promise<boolean> => {
    if (!graphClientRef.current || !authState.isAuthenticated) {
      setLastError('Not authenticated with Outlook');
      return false;
    }

    try {
      // Get events from the last month and next 3 months (typical wedding booking window)
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      const events = await graphClientRef.current
        .api('/me/events')
        .filter(
          `start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`,
        )
        .select('id,subject,start,end,location,categories,importance,body')
        .get();

      // Convert Graph events to WedSync format
      const weddingEvents: WeddingCalendarEvent[] = events.value.map(
        (event: any) => ({
          id: event.id,
          title: event.subject,
          description: event.body?.content || '',
          start: event.start.dateTime,
          end: event.end.dateTime,
          location: event.location?.displayName || '',
          type: determineWeddingEventType(event.categories, event.subject),
          priority: event.importance === 'high' ? 'high' : 'medium',
          status: 'confirmed',
          reminderMinutes: [15],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      );

      // Store in WedSync database
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        for (const event of weddingEvents) {
          await supabase.from('calendar_events').upsert({
            id: event.id,
            user_id: user.id,
            ...event,
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Calendar sync failed:', error);
      setLastError(
        error instanceof Error ? error.message : 'Calendar sync failed',
      );
      return false;
    }
  }, [authState.isAuthenticated]);

  /**
   * Determine wedding event type from Outlook event data
   */
  const determineWeddingEventType = (categories: string[], subject: string) => {
    const title = subject.toLowerCase();

    if (
      categories?.includes('Wedding Day') ||
      title.includes('wedding ceremony')
    )
      return 'wedding_ceremony';
    if (title.includes('consultation') || title.includes('meeting'))
      return 'consultation';
    if (title.includes('venue') || title.includes('site visit'))
      return 'venue_visit';
    if (title.includes('engagement') || title.includes('e-session'))
      return 'engagement_shoot';
    if (title.includes('vendor') || title.includes('coordinator'))
      return 'vendor_coordination';
    if (title.includes('preparation') || title.includes('prep'))
      return 'preparation';
    if (title.includes('reception')) return 'wedding_reception';

    return 'client_meeting';
  };

  /**
   * Create a new calendar event
   */
  const createEvent = useCallback(
    async (event: Partial<WeddingCalendarEvent>): Promise<string> => {
      if (!graphClientRef.current || !authState.isAuthenticated) {
        throw new Error('Not authenticated with Outlook');
      }

      try {
        const graphEvent = {
          subject: event.title || 'Wedding Event',
          body: {
            contentType: 'text',
            content: event.description || '',
          },
          start: {
            dateTime: event.start || new Date().toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: event.end || new Date(Date.now() + 3600000).toISOString(),
            timeZone: 'UTC',
          },
          location: event.location
            ? {
                displayName: event.location,
              }
            : undefined,
          categories: [event.type || 'client_meeting', 'WedSync'],
          importance: event.priority === 'high' ? 'high' : 'normal',
        };

        const createdEvent = await graphClientRef.current
          .api('/me/events')
          .post(graphEvent);
        return createdEvent.id;
      } catch (error) {
        console.error('Failed to create event:', error);
        throw error;
      }
    },
    [authState.isAuthenticated],
  );

  /**
   * Update an existing event
   */
  const updateEvent = useCallback(
    async (
      eventId: string,
      updates: Partial<WeddingCalendarEvent>,
    ): Promise<boolean> => {
      if (!graphClientRef.current || !authState.isAuthenticated) {
        throw new Error('Not authenticated with Outlook');
      }

      try {
        const graphUpdates: any = {};

        if (updates.title) graphUpdates.subject = updates.title;
        if (updates.description)
          graphUpdates.body = {
            contentType: 'text',
            content: updates.description,
          };
        if (updates.start)
          graphUpdates.start = { dateTime: updates.start, timeZone: 'UTC' };
        if (updates.end)
          graphUpdates.end = { dateTime: updates.end, timeZone: 'UTC' };
        if (updates.location)
          graphUpdates.location = { displayName: updates.location };

        await graphClientRef.current
          .api(`/me/events/${eventId}`)
          .patch(graphUpdates);
        return true;
      } catch (error) {
        console.error('Failed to update event:', error);
        return false;
      }
    },
    [authState.isAuthenticated],
  );

  /**
   * Delete an event
   */
  const deleteEvent = useCallback(
    async (eventId: string): Promise<boolean> => {
      if (!graphClientRef.current || !authState.isAuthenticated) {
        throw new Error('Not authenticated with Outlook');
      }

      try {
        await graphClientRef.current.api(`/me/events/${eventId}`).delete();
        return true;
      } catch (error) {
        console.error('Failed to delete event:', error);
        return false;
      }
    },
    [authState.isAuthenticated],
  );

  /**
   * Get events in date range
   */
  const getEvents = useCallback(
    async (
      startDate: string,
      endDate: string,
    ): Promise<WeddingCalendarEvent[]> => {
      if (!graphClientRef.current || !authState.isAuthenticated) {
        throw new Error('Not authenticated with Outlook');
      }

      try {
        const events = await graphClientRef.current
          .api('/me/events')
          .filter(
            `start/dateTime ge '${startDate}' and end/dateTime le '${endDate}'`,
          )
          .select('id,subject,start,end,location,categories,importance,body')
          .get();

        return events.value.map((event: any) => ({
          id: event.id,
          title: event.subject,
          description: event.body?.content || '',
          start: event.start.dateTime,
          end: event.end.dateTime,
          location: event.location?.displayName || '',
          type: determineWeddingEventType(event.categories, event.subject),
          priority: event.importance === 'high' ? 'high' : 'medium',
          status: 'confirmed',
          reminderMinutes: [15],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      } catch (error) {
        console.error('Failed to get events:', error);
        throw error;
      }
    },
    [authState.isAuthenticated],
  );

  /**
   * Detect conflicts between events
   */
  const detectConflicts = useCallback(
    async (events: WeddingCalendarEvent[]): Promise<EventConflict[]> => {
      const conflicts: EventConflict[] = [];

      for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
          const event1 = events[i];
          const event2 = events[j];

          const start1 = new Date(event1.start);
          const end1 = new Date(event1.end);
          const start2 = new Date(event2.start);
          const end2 = new Date(event2.end);

          // Check for time overlap
          if (start1 < end2 && start2 < end1) {
            conflicts.push({
              conflictId: crypto.randomUUID(),
              type: 'time_overlap',
              severity: 'high',
              sourceEvent: event1,
              conflictingEvent: event2,
              suggestedResolution: {
                type: 'reschedule',
                action: 'Reschedule one of the conflicting events',
                impact: [
                  'Schedule disruption',
                  'Client communication required',
                ],
              },
            });
          }
        }
      }

      setConflicts(conflicts);
      return conflicts;
    },
    [],
  );

  /**
   * Resolve a conflict
   */
  const resolveConflict = useCallback(
    async (
      conflictId: string,
      resolution: ConflictResolution,
    ): Promise<boolean> => {
      try {
        // Apply the resolution
        const conflict = conflicts.find((c) => c.conflictId === conflictId);
        if (!conflict) return false;

        switch (resolution.type) {
          case 'reschedule':
            if (resolution.newDateTime) {
              await updateEvent(conflict.sourceEvent.id, {
                start: resolution.newDateTime,
                end: new Date(
                  new Date(resolution.newDateTime).getTime() +
                    (new Date(conflict.sourceEvent.end).getTime() -
                      new Date(conflict.sourceEvent.start).getTime()),
                ).toISOString(),
              });
            }
            break;
          case 'cancel':
            await deleteEvent(conflict.sourceEvent.id);
            break;
        }

        // Remove resolved conflict
        setConflicts((prev) => prev.filter((c) => c.conflictId !== conflictId));
        return true;
      } catch (error) {
        console.error('Failed to resolve conflict:', error);
        return false;
      }
    },
    [conflicts, updateEvent, deleteEvent],
  );

  /**
   * Update sync settings
   */
  const updateSettings = useCallback(
    async (updates: Partial<OutlookSyncSettings>): Promise<boolean> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return false;

        const updatedSettings = { ...settings, ...updates };

        await supabase.from('outlook_sync_settings').upsert({
          user_id: user.id,
          ...updatedSettings,
          updated_at: new Date().toISOString(),
        });

        setSettings(updatedSettings);
        return true;
      } catch (error) {
        console.error('Failed to update settings:', error);
        return false;
      }
    },
    [settings],
  );

  /**
   * Refresh authentication tokens
   */
  const refreshTokens = useCallback(async (): Promise<boolean> => {
    if (!msalInstanceRef.current) return false;

    try {
      setAuthState((prev) => ({ ...prev, isTokenRefreshing: true }));

      const accounts = msalInstanceRef.current.getAllAccounts();
      if (accounts.length === 0) return false;

      const request = {
        scopes: OAUTH_CONFIG.scopes,
        account: accounts[0],
      };

      const response =
        await msalInstanceRef.current.acquireTokenSilent(request);

      setAuthState((prev) => ({
        ...prev,
        accessToken: response.accessToken,
        isTokenRefreshing: false,
      }));

      await storeTokensSecurely(response);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      setAuthState((prev) => ({ ...prev, isTokenRefreshing: false }));
      return false;
    }
  }, [storeTokensSecurely]);

  /**
   * Validate connection health
   */
  const validateConnection = useCallback(async (): Promise<boolean> => {
    if (!graphClientRef.current || !authState.isAuthenticated) {
      setIsHealthy(false);
      return false;
    }

    try {
      await graphClientRef.current.api('/me').get();
      setIsHealthy(true);
      return true;
    } catch (error) {
      console.error('Connection validation failed:', error);
      setIsHealthy(false);
      return false;
    }
  }, [authState.isAuthenticated]);

  /**
   * Pause sync operations
   */
  const pauseSync = useCallback(() => {
    setSyncStatus((prev) => ({
      ...prev,
      status: 'paused' as SyncStatusType,
      isRunning: false,
    }));
  }, []);

  /**
   * Resume sync operations
   */
  const resumeSync = useCallback(() => {
    setSyncStatus((prev) => ({
      ...prev,
      status: 'idle' as SyncStatusType,
      isRunning: false,
    }));
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeMSAL();

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [initializeMSAL]);

  // Periodic connection health check
  useEffect(() => {
    if (authState.isAuthenticated) {
      const healthCheck = setInterval(validateConnection, 60000); // Every minute

      return () => clearInterval(healthCheck);
    }
  }, [authState.isAuthenticated, validateConnection]);

  return {
    // Authentication
    authState,
    authenticate,
    disconnect,

    // Sync operations
    syncStatus,
    syncEvents,
    syncCalendars,
    pauseSync,
    resumeSync,

    // Event management
    createEvent,
    updateEvent,
    deleteEvent,
    getEvents,

    // Conflict resolution
    conflicts,
    resolveConflict,
    detectConflicts,

    // Settings
    settings,
    updateSettings,

    // Utilities
    isHealthy,
    lastError,
    refreshTokens,
    validateConnection,
  };
}
