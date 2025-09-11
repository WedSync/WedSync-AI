/**
 * CrossPlatformAuthSync - Enterprise SSO Authentication Synchronization
 *
 * Handles cross-platform authentication synchronization for WedSync's
 * enterprise SSO system with wedding team coordination features.
 *
 * Wedding Industry Context:
 * - Wedding teams use multiple devices (phones, tablets, laptops)
 * - Seamless handoff between team members during events
 * - Synchronized authentication state across all platforms
 * - Emergency access coordination for wedding day operations
 *
 * @author WedSync Security Team
 * @version 2.0.0
 */

import { createClient } from '@supabase/supabase-js';

// Types and Interfaces
interface AuthSession {
  sessionId: string;
  userId: string;
  organizationId: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web' | 'desktop';
  userAgent: string;
  ipAddress?: string;
  location?: GeolocationCoordinates;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  status: 'active' | 'suspended' | 'expired';
  permissions: string[];
  weddingContext?: WeddingSessionContext;
}

interface WeddingSessionContext {
  weddingId: string;
  weddingDate: Date;
  venueId: string;
  teamRole: string;
  isWeddingDay: boolean;
  emergencyAccess: boolean;
  coordinatorOverride: boolean;
}

interface SyncConfiguration {
  syncIntervalMs: number;
  maxConcurrentSessions: number;
  sessionTimeoutMs: number;
  weddingDayExtensionMs: number;
  emergencySessionTimeoutMs: number;
  crossDeviceSyncEnabled: boolean;
  realtimeUpdatesEnabled: boolean;
}

interface SessionSyncEvent {
  type:
    | 'session_created'
    | 'session_updated'
    | 'session_expired'
    | 'session_revoked'
    | 'emergency_access';
  sessionId: string;
  userId: string;
  deviceId: string;
  timestamp: Date;
  data: any;
  weddingContext?: WeddingSessionContext;
}

interface DeviceSession {
  deviceId: string;
  platform: string;
  deviceName?: string;
  lastSeen: Date;
  sessionCount: number;
  trustedDevice: boolean;
}

class CrossPlatformAuthSync {
  private supabase;
  private sessionStore: Map<string, AuthSession> = new Map();
  private deviceSessions: Map<string, DeviceSession> = new Map();
  private syncConfiguration: SyncConfiguration;
  private realtimeSubscription: any = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private secureStorage: IDBDatabase | null = null;
  private currentUserId: string | null = null;

  constructor(config?: Partial<SyncConfiguration>) {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    this.syncConfiguration = {
      syncIntervalMs: 30000, // 30 seconds
      maxConcurrentSessions: 5, // Per user
      sessionTimeoutMs: 8 * 60 * 60 * 1000, // 8 hours
      weddingDayExtensionMs: 16 * 60 * 60 * 1000, // 16 hours for wedding days
      emergencySessionTimeoutMs: 4 * 60 * 60 * 1000, // 4 hours for emergency access
      crossDeviceSyncEnabled: true,
      realtimeUpdatesEnabled: true,
      ...config,
    };

    this.initializeSync();
  }

  /**
   * Initialize synchronization system
   */
  private async initializeSync(): Promise<void> {
    try {
      await this.initializeSecureStorage();
      await this.loadStoredSessions();

      if (this.syncConfiguration.realtimeUpdatesEnabled) {
        await this.setupRealtimeSync();
      }

      if (this.syncConfiguration.crossDeviceSyncEnabled) {
        this.startPeriodicSync();
      }

      console.log('🔄 CrossPlatformAuthSync initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CrossPlatformAuthSync:', error);
      throw error;
    }
  }

  /**
   * Initialize secure storage for session data
   */
  private async initializeSecureStorage(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedSyncAuthSync', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.secureStorage = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', {
            keyPath: 'sessionId',
          });
          sessionStore.createIndex('userId', 'userId', { unique: false });
          sessionStore.createIndex('deviceId', 'deviceId', { unique: false });
          sessionStore.createIndex('status', 'status', { unique: false });
          sessionStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // Device sessions store
        if (!db.objectStoreNames.contains('devices')) {
          const deviceStore = db.createObjectStore('devices', {
            keyPath: 'deviceId',
          });
          deviceStore.createIndex('lastSeen', 'lastSeen', { unique: false });
          deviceStore.createIndex('trustedDevice', 'trustedDevice', {
            unique: false,
          });
        }

        // Sync events store
        if (!db.objectStoreNames.contains('sync_events')) {
          const eventStore = db.createObjectStore('sync_events', {
            keyPath: 'id',
            autoIncrement: true,
          });
          eventStore.createIndex('timestamp', 'timestamp', { unique: false });
          eventStore.createIndex('type', 'type', { unique: false });
          eventStore.createIndex('userId', 'userId', { unique: false });
        }
      };
    });
  }

  /**
   * Load stored sessions from IndexedDB
   */
  private async loadStoredSessions(): Promise<void> {
    if (!this.secureStorage) return;

    try {
      const transaction = this.secureStorage.transaction(
        ['sessions', 'devices'],
        'readonly',
      );
      const sessionStore = transaction.objectStore('sessions');
      const deviceStore = transaction.objectStore('devices');

      // Load sessions
      const sessionRequest = sessionStore.getAll();
      sessionRequest.onsuccess = () => {
        const sessions: AuthSession[] = sessionRequest.result;
        sessions.forEach((session) => {
          // Only load active, non-expired sessions
          if (
            session.status === 'active' &&
            new Date(session.expiresAt) > new Date()
          ) {
            this.sessionStore.set(session.sessionId, {
              ...session,
              createdAt: new Date(session.createdAt),
              lastActivity: new Date(session.lastActivity),
              expiresAt: new Date(session.expiresAt),
              weddingContext: session.weddingContext
                ? {
                    ...session.weddingContext,
                    weddingDate: new Date(session.weddingContext.weddingDate),
                  }
                : undefined,
            });
          }
        });
      };

      // Load device sessions
      const deviceRequest = deviceStore.getAll();
      deviceRequest.onsuccess = () => {
        const devices: DeviceSession[] = deviceRequest.result;
        devices.forEach((device) => {
          this.deviceSessions.set(device.deviceId, {
            ...device,
            lastSeen: new Date(device.lastSeen),
          });
        });
      };

      console.log(
        `📱 Loaded ${this.sessionStore.size} sessions and ${this.deviceSessions.size} devices`,
      );
    } catch (error) {
      console.error('Failed to load stored sessions:', error);
    }
  }

  /**
   * Setup realtime synchronization
   */
  private async setupRealtimeSync(): Promise<void> {
    try {
      // Subscribe to session changes in Supabase
      this.realtimeSubscription = this.supabase
        .channel('auth_sessions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'auth_sessions',
          },
          (payload) => {
            this.handleRealtimeSessionUpdate(payload);
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wedding_team_sessions',
          },
          (payload) => {
            this.handleRealtimeWeddingUpdate(payload);
          },
        )
        .subscribe();

      console.log('🔄 Realtime sync established');
    } catch (error) {
      console.error('Failed to setup realtime sync:', error);
    }
  }

  /**
   * Handle realtime session updates
   */
  private handleRealtimeSessionUpdate(payload: any): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        this.handleSessionCreated(newRecord);
        break;
      case 'UPDATE':
        this.handleSessionUpdated(newRecord, oldRecord);
        break;
      case 'DELETE':
        this.handleSessionRevoked(oldRecord);
        break;
    }
  }

  /**
   * Handle realtime wedding context updates
   */
  private handleRealtimeWeddingUpdate(payload: any): void {
    const { eventType, new: newRecord } = payload;

    if (eventType === 'UPDATE' && newRecord.emergency_access) {
      this.handleEmergencyAccessActivated(newRecord);
    }
  }

  /**
   * Start periodic synchronization
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncWithServer();
        await this.cleanupExpiredSessions();
      } catch (error) {
        console.error('Periodic sync failed:', error);
      }
    }, this.syncConfiguration.syncIntervalMs);
  }

  /**
   * Create new authentication session
   */
  public async createSession(
    userId: string,
    organizationId: string,
    deviceId: string,
    platform: string,
    permissions: string[] = [],
    weddingContext?: WeddingSessionContext,
  ): Promise<AuthSession> {
    try {
      // Check concurrent session limit
      const userSessions = Array.from(this.sessionStore.values()).filter(
        (session) => session.userId === userId && session.status === 'active',
      );

      if (userSessions.length >= this.syncConfiguration.maxConcurrentSessions) {
        // Revoke oldest session
        const oldestSession = userSessions.sort(
          (a, b) => a.lastActivity.getTime() - b.lastActivity.getTime(),
        )[0];
        await this.revokeSession(
          oldestSession.sessionId,
          'concurrent_limit_exceeded',
        );
      }

      // Calculate session timeout based on context
      let timeoutMs = this.syncConfiguration.sessionTimeoutMs;
      if (weddingContext?.isWeddingDay) {
        timeoutMs = this.syncConfiguration.weddingDayExtensionMs;
      } else if (weddingContext?.emergencyAccess) {
        timeoutMs = this.syncConfiguration.emergencySessionTimeoutMs;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + timeoutMs);

      const session: AuthSession = {
        sessionId: await this.generateSessionId(),
        userId,
        organizationId,
        deviceId,
        platform: platform as AuthSession['platform'],
        userAgent: navigator.userAgent,
        ipAddress: await this.getUserIPAddress(),
        location: await this.getUserLocation(),
        createdAt: now,
        lastActivity: now,
        expiresAt,
        status: 'active',
        permissions,
        weddingContext,
      };

      // Store locally
      this.sessionStore.set(session.sessionId, session);
      await this.storeSession(session);

      // Update device session
      await this.updateDeviceSession(deviceId, platform);

      // Store in Supabase
      await this.syncSessionToServer(session);

      // Log session creation
      await this.logSyncEvent({
        type: 'session_created',
        sessionId: session.sessionId,
        userId,
        deviceId,
        timestamp: now,
        data: { platform, permissions },
        weddingContext,
      });

      this.currentUserId = userId;
      console.log(
        `✅ Session created: ${session.sessionId} for user ${userId}`,
      );

      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Update existing session
   */
  public async updateSession(
    sessionId: string,
    updates: Partial<
      Pick<AuthSession, 'permissions' | 'weddingContext' | 'lastActivity'>
    >,
  ): Promise<AuthSession | null> {
    try {
      const session = this.sessionStore.get(sessionId);
      if (!session || session.status !== 'active') {
        return null;
      }

      // Update session
      const updatedSession: AuthSession = {
        ...session,
        ...updates,
        lastActivity: new Date(),
      };

      // Store locally
      this.sessionStore.set(sessionId, updatedSession);
      await this.storeSession(updatedSession);

      // Sync to server
      await this.syncSessionToServer(updatedSession);

      // Log update
      await this.logSyncEvent({
        type: 'session_updated',
        sessionId,
        userId: session.userId,
        deviceId: session.deviceId,
        timestamp: new Date(),
        data: updates,
        weddingContext: updatedSession.weddingContext,
      });

      return updatedSession;
    } catch (error) {
      console.error('Failed to update session:', error);
      return null;
    }
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): AuthSession | null {
    const session = this.sessionStore.get(sessionId);
    return session &&
      session.status === 'active' &&
      new Date() < session.expiresAt
      ? session
      : null;
  }

  /**
   * Get all sessions for a user
   */
  public getUserSessions(userId: string): AuthSession[] {
    return Array.from(this.sessionStore.values()).filter(
      (session) =>
        session.userId === userId &&
        session.status === 'active' &&
        new Date() < session.expiresAt,
    );
  }

  /**
   * Get sessions by wedding context
   */
  public getWeddingSessions(weddingId: string): AuthSession[] {
    return Array.from(this.sessionStore.values()).filter(
      (session) =>
        session.weddingContext?.weddingId === weddingId &&
        session.status === 'active' &&
        new Date() < session.expiresAt,
    );
  }

  /**
   * Revoke session
   */
  public async revokeSession(
    sessionId: string,
    reason: string = 'user_requested',
  ): Promise<boolean> {
    try {
      const session = this.sessionStore.get(sessionId);
      if (!session) {
        return false;
      }

      // Update session status
      const revokedSession: AuthSession = {
        ...session,
        status: 'expired',
        lastActivity: new Date(),
      };

      this.sessionStore.set(sessionId, revokedSession);
      await this.storeSession(revokedSession);

      // Remove from server
      await this.revokeSessionOnServer(sessionId, reason);

      // Log revocation
      await this.logSyncEvent({
        type: 'session_revoked',
        sessionId,
        userId: session.userId,
        deviceId: session.deviceId,
        timestamp: new Date(),
        data: { reason },
        weddingContext: session.weddingContext,
      });

      console.log(`🚫 Session revoked: ${sessionId} (${reason})`);
      return true;
    } catch (error) {
      console.error('Failed to revoke session:', error);
      return false;
    }
  }

  /**
   * Revoke all sessions for a user
   */
  public async revokeAllUserSessions(
    userId: string,
    reason: string = 'security_revocation',
  ): Promise<number> {
    const userSessions = this.getUserSessions(userId);
    let revokedCount = 0;

    for (const session of userSessions) {
      if (await this.revokeSession(session.sessionId, reason)) {
        revokedCount++;
      }
    }

    return revokedCount;
  }

  /**
   * Enable emergency access for wedding day operations
   */
  public async enableEmergencyAccess(
    weddingId: string,
    coordinatorUserId: string,
    reason: string,
  ): Promise<boolean> {
    try {
      // Get all sessions for this wedding
      const weddingSessions = this.getWeddingSessions(weddingId);

      for (const session of weddingSessions) {
        const emergencyContext: WeddingSessionContext = {
          ...session.weddingContext!,
          emergencyAccess: true,
          coordinatorOverride: session.userId === coordinatorUserId,
        };

        // Extend session timeout for emergency access
        const extendedExpiry = new Date();
        extendedExpiry.setTime(
          extendedExpiry.getTime() +
            this.syncConfiguration.emergencySessionTimeoutMs,
        );

        await this.updateSession(session.sessionId, {
          weddingContext: emergencyContext,
          lastActivity: new Date(),
        });

        // Update expiry
        session.expiresAt = extendedExpiry;
        await this.storeSession(session);
      }

      // Log emergency access activation
      await this.logSyncEvent({
        type: 'emergency_access',
        sessionId: 'multiple',
        userId: coordinatorUserId,
        deviceId: 'multiple',
        timestamp: new Date(),
        data: {
          weddingId,
          reason,
          affectedSessions: weddingSessions.length,
        },
      });

      console.log(`🚨 Emergency access enabled for wedding ${weddingId}`);
      return true;
    } catch (error) {
      console.error('Failed to enable emergency access:', error);
      return false;
    }
  }

  /**
   * Sync sessions with server
   */
  private async syncWithServer(): Promise<void> {
    try {
      // Get server sessions
      const { data: serverSessions, error } = await this.supabase
        .from('auth_sessions')
        .select('*')
        .in('session_id', Array.from(this.sessionStore.keys()));

      if (error) throw error;

      // Compare and sync differences
      for (const serverSession of serverSessions || []) {
        const localSession = this.sessionStore.get(serverSession.session_id);

        if (!localSession) {
          // Server has session we don't - add it locally
          await this.handleSessionCreated(serverSession);
        } else if (
          new Date(serverSession.last_activity) > localSession.lastActivity
        ) {
          // Server session is newer - update local
          await this.handleSessionUpdated(serverSession, localSession);
        } else if (
          localSession.lastActivity > new Date(serverSession.last_activity)
        ) {
          // Local session is newer - sync to server
          await this.syncSessionToServer(localSession);
        }
      }

      // Check for sessions that exist locally but not on server
      const serverSessionIds = new Set(
        serverSessions?.map((s) => s.session_id) || [],
      );
      for (const [sessionId, localSession] of this.sessionStore.entries()) {
        if (
          !serverSessionIds.has(sessionId) &&
          localSession.status === 'active'
        ) {
          // Local session missing from server - sync it
          await this.syncSessionToServer(localSession);
        }
      }
    } catch (error) {
      console.error('Server sync failed:', error);
    }
  }

  /**
   * Sync session to server
   */
  private async syncSessionToServer(session: AuthSession): Promise<void> {
    try {
      const { error } = await this.supabase.from('auth_sessions').upsert({
        session_id: session.sessionId,
        user_id: session.userId,
        organization_id: session.organizationId,
        device_id: session.deviceId,
        platform: session.platform,
        user_agent: session.userAgent,
        ip_address: session.ipAddress,
        location: session.location,
        created_at: session.createdAt.toISOString(),
        last_activity: session.lastActivity.toISOString(),
        expires_at: session.expiresAt.toISOString(),
        status: session.status,
        permissions: session.permissions,
        wedding_context: session.weddingContext,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to sync session to server:', error);
    }
  }

  /**
   * Store session in local storage
   */
  private async storeSession(session: AuthSession): Promise<void> {
    if (!this.secureStorage) return;

    try {
      const transaction = this.secureStorage.transaction(
        ['sessions'],
        'readwrite',
      );
      const store = transaction.objectStore('sessions');
      await store.put(session);
    } catch (error) {
      console.error('Failed to store session locally:', error);
    }
  }

  /**
   * Update device session tracking
   */
  private async updateDeviceSession(
    deviceId: string,
    platform: string,
  ): Promise<void> {
    try {
      let deviceSession = this.deviceSessions.get(deviceId);

      if (!deviceSession) {
        deviceSession = {
          deviceId,
          platform,
          deviceName: await this.getDeviceName(),
          lastSeen: new Date(),
          sessionCount: 1,
          trustedDevice: false,
        };
      } else {
        deviceSession.lastSeen = new Date();
        deviceSession.sessionCount++;
      }

      this.deviceSessions.set(deviceId, deviceSession);

      if (this.secureStorage) {
        const transaction = this.secureStorage.transaction(
          ['devices'],
          'readwrite',
        );
        const store = transaction.objectStore('devices');
        await store.put(deviceSession);
      }
    } catch (error) {
      console.error('Failed to update device session:', error);
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessionStore.entries()) {
      if (session.expiresAt < now || session.status === 'expired') {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      const session = this.sessionStore.get(sessionId);
      if (session) {
        await this.logSyncEvent({
          type: 'session_expired',
          sessionId,
          userId: session.userId,
          deviceId: session.deviceId,
          timestamp: now,
          data: { expiredAt: session.expiresAt.toISOString() },
        });
      }

      this.sessionStore.delete(sessionId);
    }

    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Handle session created event
   */
  private async handleSessionCreated(sessionData: any): Promise<void> {
    try {
      const session: AuthSession = {
        sessionId: sessionData.session_id,
        userId: sessionData.user_id,
        organizationId: sessionData.organization_id,
        deviceId: sessionData.device_id,
        platform: sessionData.platform,
        userAgent: sessionData.user_agent,
        ipAddress: sessionData.ip_address,
        location: sessionData.location,
        createdAt: new Date(sessionData.created_at),
        lastActivity: new Date(sessionData.last_activity),
        expiresAt: new Date(sessionData.expires_at),
        status: sessionData.status,
        permissions: sessionData.permissions || [],
        weddingContext: sessionData.wedding_context,
      };

      this.sessionStore.set(session.sessionId, session);
      await this.storeSession(session);
    } catch (error) {
      console.error('Failed to handle session created:', error);
    }
  }

  /**
   * Handle session updated event
   */
  private async handleSessionUpdated(
    newData: any,
    oldData: any,
  ): Promise<void> {
    try {
      const session = this.sessionStore.get(newData.session_id);
      if (session) {
        const updatedSession: AuthSession = {
          ...session,
          lastActivity: new Date(newData.last_activity),
          status: newData.status,
          permissions: newData.permissions || session.permissions,
          weddingContext: newData.wedding_context || session.weddingContext,
        };

        this.sessionStore.set(session.sessionId, updatedSession);
        await this.storeSession(updatedSession);
      }
    } catch (error) {
      console.error('Failed to handle session updated:', error);
    }
  }

  /**
   * Handle session revoked event
   */
  private async handleSessionRevoked(sessionData: any): Promise<void> {
    try {
      this.sessionStore.delete(sessionData.session_id);

      if (this.secureStorage) {
        const transaction = this.secureStorage.transaction(
          ['sessions'],
          'readwrite',
        );
        const store = transaction.objectStore('sessions');
        await store.delete(sessionData.session_id);
      }
    } catch (error) {
      console.error('Failed to handle session revoked:', error);
    }
  }

  /**
   * Handle emergency access activation
   */
  private async handleEmergencyAccessActivated(
    weddingData: any,
  ): Promise<void> {
    try {
      const weddingSessions = this.getWeddingSessions(weddingData.wedding_id);

      for (const session of weddingSessions) {
        if (session.weddingContext) {
          session.weddingContext.emergencyAccess = true;
          await this.storeSession(session);
        }
      }

      console.log(
        `🚨 Emergency access activated for wedding ${weddingData.wedding_id}`,
      );
    } catch (error) {
      console.error('Failed to handle emergency access activation:', error);
    }
  }

  /**
   * Revoke session on server
   */
  private async revokeSessionOnServer(
    sessionId: string,
    reason: string,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('auth_sessions')
        .update({
          status: 'expired',
          last_activity: new Date().toISOString(),
          revocation_reason: reason,
        })
        .eq('session_id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to revoke session on server:', error);
    }
  }

  /**
   * Log synchronization event
   */
  private async logSyncEvent(event: SessionSyncEvent): Promise<void> {
    try {
      if (this.secureStorage) {
        const transaction = this.secureStorage.transaction(
          ['sync_events'],
          'readwrite',
        );
        const store = transaction.objectStore('sync_events');
        await store.add(event);
      }

      // Also log to console for development
      console.log(`🔄 Sync Event [${event.type}]:`, {
        sessionId: event.sessionId,
        userId: event.userId,
        deviceId: event.deviceId,
        timestamp: event.timestamp,
        weddingContext: event.weddingContext,
      });
    } catch (error) {
      console.error('Failed to log sync event:', error);
    }
  }

  /**
   * Generate secure session ID
   */
  private async generateSessionId(): Promise<string> {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const hex = Array.from(array, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    return `wedsync_session_${hex}`;
  }

  /**
   * Get user IP address (if available)
   */
  private async getUserIPAddress(): Promise<string | undefined> {
    try {
      // This would typically use a service to get the user's IP
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return undefined;
    }
  }

  /**
   * Get user location (if available)
   */
  private async getUserLocation(): Promise<GeolocationCoordinates | undefined> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        () => resolve(undefined),
        { timeout: 5000, enableHighAccuracy: false },
      );
    });
  }

  /**
   * Get device name
   */
  private async getDeviceName(): Promise<string | undefined> {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows Device';
    if (userAgent.includes('Mac')) return 'Mac';

    return 'Unknown Device';
  }

  /**
   * Get current session for user
   */
  public getCurrentSession(): AuthSession | null {
    if (!this.currentUserId) return null;

    const userSessions = this.getUserSessions(this.currentUserId);
    return userSessions.length > 0 ? userSessions[0] : null;
  }

  /**
   * Check if user has active session
   */
  public hasActiveSession(userId: string): boolean {
    const sessions = this.getUserSessions(userId);
    return sessions.length > 0;
  }

  /**
   * Get device sessions
   */
  public getDeviceSessions(): DeviceSession[] {
    return Array.from(this.deviceSessions.values());
  }

  /**
   * Trust a device
   */
  public async trustDevice(deviceId: string): Promise<boolean> {
    try {
      const device = this.deviceSessions.get(deviceId);
      if (device) {
        device.trustedDevice = true;
        await this.updateDeviceSession(deviceId, device.platform);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to trust device:', error);
      return false;
    }
  }

  /**
   * Get sync statistics
   */
  public getSyncStats(): {
    activeSessions: number;
    totalDevices: number;
    trustedDevices: number;
    lastSyncTime: Date | null;
    syncErrors: number;
  } {
    const activeSessions = Array.from(this.sessionStore.values()).filter(
      (s) => s.status === 'active' && new Date() < s.expiresAt,
    ).length;

    const devices = Array.from(this.deviceSessions.values());
    const trustedDevices = devices.filter((d) => d.trustedDevice).length;

    return {
      activeSessions,
      totalDevices: devices.length,
      trustedDevices,
      lastSyncTime: null, // Would track actual sync times
      syncErrors: 0, // Would track sync errors
    };
  }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    try {
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }

      if (this.realtimeSubscription) {
        await this.supabase.removeChannel(this.realtimeSubscription);
        this.realtimeSubscription = null;
      }

      if (this.secureStorage) {
        this.secureStorage.close();
        this.secureStorage = null;
      }

      console.log('🔄 CrossPlatformAuthSync shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}

export default CrossPlatformAuthSync;
export type {
  AuthSession,
  WeddingSessionContext,
  SyncConfiguration,
  SessionSyncEvent,
  DeviceSession,
};
