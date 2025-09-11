/**
 * WS-214 Team B: ConnectionEngine Component
 *
 * Handles vendor-to-vendor connections, networking, and collaboration
 * within the WedSync ecosystem for wedding suppliers
 */

import {
  mobileNetworkAdapter,
  NetworkCondition,
  AdaptationStrategy,
} from './mobile-network-adapter';
import { EventEmitter } from 'events';

export interface VendorProfile {
  id: string;
  name: string;
  type:
    | 'photographer'
    | 'venue'
    | 'florist'
    | 'caterer'
    | 'coordinator'
    | 'dj'
    | 'videographer'
    | 'officiant';
  location: {
    lat: number;
    lng: number;
    address: string;
    serviceRadius: number;
  };
  availability: {
    timeSlots: TimeSlot[];
    blackoutDates: Date[];
  };
  expertise: string[];
  rating: number;
  reviewCount: number;
  collaborationHistory: CollaborationHistory[];
  connectionPreferences: ConnectionPreferences;
  status: 'active' | 'busy' | 'offline' | 'away';
  lastSeen: Date;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  eventId?: string;
  type: 'available' | 'booked' | 'tentative';
}

export interface CollaborationHistory {
  vendorId: string;
  eventId: string;
  eventDate: Date;
  rating: number;
  feedback: string;
  collaborationType: 'primary' | 'secondary' | 'referral';
}

export interface ConnectionPreferences {
  maxConcurrentConnections: number;
  preferredCollaborators: string[];
  blockedVendors: string[];
  autoAcceptReferrals: boolean;
  shareAvailability: boolean;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  responseTimeExpectation: number; // minutes
}

export interface ConnectionRequest {
  id: string;
  fromVendorId: string;
  toVendorId: string;
  eventId?: string;
  type: 'collaboration' | 'referral' | 'availability_check' | 'resource_share';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  metadata: {
    eventDate?: Date;
    serviceType?: string;
    budget?: number;
    clientName?: string;
  };
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  responseTime?: Date;
}

export interface NetworkConnection {
  id: string;
  vendorIds: string[];
  type: 'peer_to_peer' | 'hub_spoke' | 'mesh';
  strength: number; // 0-1 connection quality
  latency: number;
  bandwidth: number;
  reliability: number;
  lastPing: Date;
  connectionMetrics: ConnectionMetrics;
}

export interface ConnectionMetrics {
  messagesExchanged: number;
  successfulCollaborations: number;
  averageResponseTime: number;
  referralConversions: number;
  uptime: number;
  errorRate: number;
}

export interface NetworkEvent {
  type:
    | 'connection_established'
    | 'connection_lost'
    | 'message_received'
    | 'collaboration_request'
    | 'availability_update';
  vendorId: string;
  data: any;
  timestamp: Date;
}

export interface ConnectionEngineConfig {
  maxConnections: number;
  connectionTimeout: number;
  heartbeatInterval: number;
  retryAttempts: number;
  queueSize: number;
  compressionEnabled: boolean;
  encryptionLevel: 'basic' | 'standard' | 'enterprise';
  networkOptimization: boolean;
}

class ConnectionEngine extends EventEmitter {
  private connections: Map<string, NetworkConnection> = new Map();
  private vendorProfiles: Map<string, VendorProfile> = new Map();
  private pendingRequests: Map<string, ConnectionRequest> = new Map();
  private messageQueue: Map<string, any[]> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private currentVendorId: string | null = null;
  private config: ConnectionEngineConfig;
  private networkCondition: NetworkCondition | null = null;
  private adaptationStrategy: AdaptationStrategy | null = null;

  constructor(config: Partial<ConnectionEngineConfig> = {}) {
    super();

    this.config = {
      maxConnections: 50,
      connectionTimeout: 30000,
      heartbeatInterval: 15000,
      retryAttempts: 3,
      queueSize: 100,
      compressionEnabled: true,
      encryptionLevel: 'standard',
      networkOptimization: true,
      ...config,
    };

    this.initializeNetworkAdaptation();
    this.setupEventHandlers();
  }

  /**
   * Initialize network adaptation integration
   */
  private initializeNetworkAdaptation(): void {
    // Monitor network conditions
    mobileNetworkAdapter.onAdaptationChange((strategy) => {
      this.adaptationStrategy = strategy;
      this.adaptConnectionsToNetworkConditions();
    });

    // Get current conditions
    this.networkCondition = mobileNetworkAdapter.getCurrentCondition();
    this.adaptationStrategy = mobileNetworkAdapter.getCurrentStrategy();

    if (this.adaptationStrategy) {
      this.adaptConnectionsToNetworkConditions();
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Network quality changes
    window.addEventListener('networkchange', (event: CustomEvent) => {
      this.networkCondition = event.detail.condition;
      this.handleNetworkQualityChange(event.detail.condition);
    });

    // Connection events
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Initialize connection engine for a vendor
   */
  async initialize(
    vendorId: string,
    vendorProfile: VendorProfile,
  ): Promise<void> {
    this.currentVendorId = vendorId;
    this.vendorProfiles.set(vendorId, vendorProfile);

    // Update vendor status to active
    vendorProfile.status = 'active';
    vendorProfile.lastSeen = new Date();

    // Start discovery process
    await this.discoverNearbyVendors();

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();

    // Initialize message queues
    this.messageQueue.set(vendorId, []);

    this.emit('engine_initialized', { vendorId, vendorProfile });
  }

  /**
   * Discover nearby vendors based on location and service type
   */
  async discoverNearbyVendors(): Promise<VendorProfile[]> {
    if (!this.currentVendorId) {
      throw new Error('Connection engine not initialized');
    }

    const currentVendor = this.vendorProfiles.get(this.currentVendorId);
    if (!currentVendor) {
      throw new Error('Current vendor profile not found');
    }

    try {
      // API call to discover nearby vendors
      const response = await this.makeNetworkRequest('/api/vendors/nearby', {
        method: 'POST',
        body: JSON.stringify({
          location: currentVendor.location,
          serviceTypes: this.getComplementaryServiceTypes(currentVendor.type),
          radius: currentVendor.location.serviceRadius,
        }),
      });

      const nearbyVendors: VendorProfile[] = await response.json();

      // Update vendor profiles cache
      nearbyVendors.forEach((vendor) => {
        this.vendorProfiles.set(vendor.id, vendor);
      });

      this.emit('vendors_discovered', {
        vendorIds: nearbyVendors.map((v) => v.id),
      });
      return nearbyVendors;
    } catch (error) {
      console.error('Error discovering nearby vendors:', error);
      this.emit('discovery_error', { error });
      return [];
    }
  }

  /**
   * Get complementary service types for vendor networking
   */
  private getComplementaryServiceTypes(
    vendorType: VendorProfile['type'],
  ): string[] {
    const complementaryServices: Record<VendorProfile['type'], string[]> = {
      photographer: ['venue', 'coordinator', 'florist', 'dj'],
      venue: ['photographer', 'caterer', 'coordinator', 'florist', 'dj'],
      florist: ['photographer', 'venue', 'coordinator'],
      caterer: ['venue', 'coordinator', 'photographer'],
      coordinator: [
        'photographer',
        'venue',
        'florist',
        'caterer',
        'dj',
        'videographer',
      ],
      dj: ['photographer', 'venue', 'coordinator', 'videographer'],
      videographer: ['photographer', 'coordinator', 'dj'],
      officiant: ['photographer', 'coordinator', 'venue'],
    };

    return complementaryServices[vendorType] || [];
  }

  /**
   * Establish connection with another vendor
   */
  async connect(
    targetVendorId: string,
    options: {
      priority?: ConnectionRequest['priority'];
      message?: string;
      eventId?: string;
      type?: ConnectionRequest['type'];
    } = {},
  ): Promise<string> {
    if (!this.currentVendorId) {
      throw new Error('Connection engine not initialized');
    }

    // Check connection limits
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Maximum connections reached');
    }

    // Check if already connected
    const existingConnection = Array.from(this.connections.values()).find(
      (conn) => conn.vendorIds.includes(targetVendorId),
    );

    if (existingConnection) {
      return existingConnection.id;
    }

    // Create connection request
    const requestId = this.generateId();
    const connectionRequest: ConnectionRequest = {
      id: requestId,
      fromVendorId: this.currentVendorId,
      toVendorId: targetVendorId,
      eventId: options.eventId,
      type: options.type || 'collaboration',
      priority: options.priority || 'medium',
      message:
        options.message || 'Would like to connect for potential collaboration',
      metadata: {},
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    this.pendingRequests.set(requestId, connectionRequest);

    try {
      // Send connection request
      await this.sendConnectionRequest(connectionRequest);

      this.emit('connection_requested', { requestId, targetVendorId });
      return requestId;
    } catch (error) {
      this.pendingRequests.delete(requestId);
      throw error;
    }
  }

  /**
   * Send connection request to target vendor
   */
  private async sendConnectionRequest(
    request: ConnectionRequest,
  ): Promise<void> {
    await this.makeNetworkRequest('/api/connections/request', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Accept incoming connection request
   */
  async acceptConnection(requestId: string): Promise<NetworkConnection> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error('Connection request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Connection request already processed');
    }

    // Create network connection
    const connectionId = this.generateId();
    const connection: NetworkConnection = {
      id: connectionId,
      vendorIds: [request.fromVendorId, request.toVendorId],
      type: 'peer_to_peer',
      strength: 1.0,
      latency: 0,
      bandwidth: 0,
      reliability: 1.0,
      lastPing: new Date(),
      connectionMetrics: {
        messagesExchanged: 0,
        successfulCollaborations: 0,
        averageResponseTime: 0,
        referralConversions: 0,
        uptime: 1.0,
        errorRate: 0,
      },
    };

    // Update request status
    request.status = 'accepted';
    request.responseTime = new Date();

    // Store connection
    this.connections.set(connectionId, connection);

    // Start connection monitoring
    this.startConnectionMonitoring(connectionId);

    // Notify API
    await this.makeNetworkRequest('/api/connections/accept', {
      method: 'POST',
      body: JSON.stringify({ requestId, connectionId }),
    });

    this.emit('connection_established', { connection, request });
    return connection;
  }

  /**
   * Decline incoming connection request
   */
  async declineConnection(requestId: string, reason?: string): Promise<void> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error('Connection request not found');
    }

    request.status = 'declined';
    request.responseTime = new Date();

    // Notify API
    await this.makeNetworkRequest('/api/connections/decline', {
      method: 'POST',
      body: JSON.stringify({ requestId, reason }),
    });

    // Clean up
    this.pendingRequests.delete(requestId);

    this.emit('connection_declined', { request, reason });
  }

  /**
   * Send message through established connection
   */
  async sendMessage(connectionId: string, message: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Adapt message based on network conditions
    const adaptedMessage = this.adaptMessageForNetwork(message);

    // Add to message queue with retry logic
    await this.queueMessage(connectionId, adaptedMessage);

    // Update connection metrics
    connection.connectionMetrics.messagesExchanged++;

    this.emit('message_sent', { connectionId, message: adaptedMessage });
  }

  /**
   * Adapt message based on current network conditions
   */
  private adaptMessageForNetwork(message: any): any {
    if (!this.adaptationStrategy) {
      return message;
    }

    const adapted = { ...message };

    // Compress large messages on poor connections
    if (
      this.adaptationStrategy.compressionLevel === 'aggressive' &&
      JSON.stringify(message).length > 1024
    ) {
      adapted._compressed = true;
      // In production, implement actual compression
    }

    // Remove non-essential data on poor connections
    if (this.adaptationStrategy.imageQuality === 'text-only') {
      delete adapted.images;
      delete adapted.attachments;
    }

    return adapted;
  }

  /**
   * Queue message with network-aware retry logic
   */
  private async queueMessage(
    connectionId: string,
    message: any,
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const retryAttempts =
      this.adaptationStrategy?.retryAttempts || this.config.retryAttempts;
    const timeout =
      this.adaptationStrategy?.requestTimeout || this.config.connectionTimeout;

    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        await Promise.race([
          this.makeNetworkRequest('/api/connections/message', {
            method: 'POST',
            body: JSON.stringify({ connectionId, message }),
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout),
          ),
        ]);

        return; // Success
      } catch (error) {
        console.warn(`Message send attempt ${attempt + 1} failed:`, error);

        if (attempt === retryAttempts - 1) {
          // Final attempt failed
          connection.connectionMetrics.errorRate++;
          throw error;
        }

        // Wait before retry with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
      }
    }
  }

  /**
   * Get availability from connected vendors
   */
  async checkAvailability(
    vendorIds: string[],
    dateRange: { start: Date; end: Date },
  ): Promise<Map<string, TimeSlot[]>> {
    const availabilityMap = new Map<string, TimeSlot[]>();

    // Check each vendor's availability
    for (const vendorId of vendorIds) {
      const vendor = this.vendorProfiles.get(vendorId);
      if (!vendor) continue;

      // Filter availability within date range
      const availability = vendor.availability.timeSlots.filter(
        (slot) =>
          slot.start >= dateRange.start &&
          slot.end <= dateRange.end &&
          slot.type === 'available',
      );

      availabilityMap.set(vendorId, availability);
    }

    return availabilityMap;
  }

  /**
   * Request referral from connected vendor
   */
  async requestReferral(
    vendorId: string,
    serviceType: string,
    eventDetails: any,
  ): Promise<string> {
    const connection = Array.from(this.connections.values()).find((conn) =>
      conn.vendorIds.includes(vendorId),
    );

    if (!connection) {
      throw new Error('No connection with vendor');
    }

    const requestId = this.generateId();
    const referralRequest: ConnectionRequest = {
      id: requestId,
      fromVendorId: this.currentVendorId!,
      toVendorId: vendorId,
      type: 'referral',
      priority: 'medium',
      message: `Requesting referral for ${serviceType}`,
      metadata: {
        serviceType,
        ...eventDetails,
      },
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    await this.sendMessage(connection.id, {
      type: 'referral_request',
      request: referralRequest,
    });

    this.pendingRequests.set(requestId, referralRequest);
    return requestId;
  }

  /**
   * Start connection monitoring with heartbeats
   */
  private startConnectionMonitoring(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const heartbeatInterval = setInterval(async () => {
      try {
        const startTime = Date.now();

        await this.makeNetworkRequest('/api/connections/ping', {
          method: 'POST',
          body: JSON.stringify({ connectionId }),
        });

        const latency = Date.now() - startTime;
        connection.latency = latency;
        connection.lastPing = new Date();

        // Update connection strength based on latency
        if (latency < 100) connection.strength = 1.0;
        else if (latency < 300) connection.strength = 0.8;
        else if (latency < 500) connection.strength = 0.6;
        else if (latency < 1000) connection.strength = 0.4;
        else connection.strength = 0.2;
      } catch (error) {
        connection.connectionMetrics.errorRate++;
        connection.strength = Math.max(0.1, connection.strength * 0.9);

        if (connection.strength < 0.3) {
          this.handleConnectionDegraded(connectionId);
        }
      }
    }, this.config.heartbeatInterval);

    this.heartbeatIntervals.set(connectionId, heartbeatInterval);
  }

  /**
   * Handle network quality changes
   */
  private handleNetworkQualityChange(condition: NetworkCondition): void {
    if (condition.quality === 'offline') {
      this.pauseAllConnections();
    } else if (condition.quality === 'poor') {
      this.optimizeForPoorConnection();
    } else {
      this.resumeNormalOperation();
    }

    this.emit('network_quality_changed', { condition });
  }

  /**
   * Adapt connections to current network conditions
   */
  private adaptConnectionsToNetworkConditions(): void {
    if (!this.adaptationStrategy) return;

    // Adjust heartbeat intervals based on network quality
    const baseInterval = this.config.heartbeatInterval;
    let adaptedInterval: number;

    switch (this.networkCondition?.quality) {
      case 'excellent':
        adaptedInterval = baseInterval * 0.5;
        break;
      case 'good':
        adaptedInterval = baseInterval;
        break;
      case 'poor':
        adaptedInterval = baseInterval * 2;
        break;
      case 'offline':
        adaptedInterval = baseInterval * 10;
        break;
      default:
        adaptedInterval = baseInterval;
    }

    // Update all heartbeat intervals
    this.heartbeatIntervals.forEach((interval, connectionId) => {
      clearInterval(interval);
      this.startConnectionMonitoring(connectionId);
    });
  }

  /**
   * Pause all connections (offline mode)
   */
  private pauseAllConnections(): void {
    this.connections.forEach((connection) => {
      connection.reliability = 0;
    });

    this.emit('connections_paused');
  }

  /**
   * Optimize for poor connection
   */
  private optimizeForPoorConnection(): void {
    // Reduce message frequency
    // Compress all messages
    // Increase retry timeouts

    this.emit('connection_optimized', { mode: 'poor_connection' });
  }

  /**
   * Resume normal operation
   */
  private resumeNormalOperation(): void {
    this.connections.forEach((connection) => {
      connection.reliability = 1.0;
    });

    this.emit('connections_resumed');
  }

  /**
   * Handle degraded connection
   */
  private handleConnectionDegraded(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    this.emit('connection_degraded', { connectionId, connection });

    // Attempt to restore connection
    setTimeout(() => {
      this.attemptConnectionRestore(connectionId);
    }, 5000);
  }

  /**
   * Attempt to restore degraded connection
   */
  private async attemptConnectionRestore(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // Test connection
      await this.makeNetworkRequest('/api/connections/test', {
        method: 'POST',
        body: JSON.stringify({ connectionId }),
      });

      // Restore connection strength
      connection.strength = 1.0;
      connection.reliability = 1.0;

      this.emit('connection_restored', { connectionId });
    } catch (error) {
      // Connection restore failed - remove connection
      this.removeConnection(connectionId);
    }
  }

  /**
   * Remove connection and cleanup
   */
  private removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Clear heartbeat interval
    const interval = this.heartbeatIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(connectionId);
    }

    // Remove from connections
    this.connections.delete(connectionId);

    this.emit('connection_removed', { connectionId, connection });
  }

  /**
   * Start heartbeat monitoring for all connections
   */
  private startHeartbeatMonitoring(): void {
    // Monitor existing connections
    this.connections.forEach((_, connectionId) => {
      this.startConnectionMonitoring(connectionId);
    });
  }

  /**
   * Make network request with adaptation
   */
  private async makeNetworkRequest(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const timeout =
      this.adaptationStrategy?.requestTimeout || this.config.connectionTimeout;
    const maxConcurrent = this.adaptationStrategy?.maxConcurrentRequests || 6;

    return Promise.race([
      fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout),
      ),
    ]);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all active connections
   */
  getConnections(): NetworkConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): NetworkConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get pending requests
   */
  getPendingRequests(): ConnectionRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  /**
   * Get vendor profile
   */
  getVendorProfile(vendorId: string): VendorProfile | undefined {
    return this.vendorProfiles.get(vendorId);
  }

  /**
   * Update vendor availability
   */
  async updateAvailability(timeSlots: TimeSlot[]): Promise<void> {
    if (!this.currentVendorId) return;

    const vendor = this.vendorProfiles.get(this.currentVendorId);
    if (!vendor) return;

    vendor.availability.timeSlots = timeSlots;
    vendor.lastSeen = new Date();

    // Notify connected vendors
    const connectedVendors = this.getConnectedVendorIds();
    for (const vendorId of connectedVendors) {
      const connection = Array.from(this.connections.values()).find((conn) =>
        conn.vendorIds.includes(vendorId),
      );

      if (connection) {
        await this.sendMessage(connection.id, {
          type: 'availability_update',
          vendorId: this.currentVendorId,
          availability: timeSlots,
        });
      }
    }

    this.emit('availability_updated', { timeSlots });
  }

  /**
   * Get connected vendor IDs
   */
  private getConnectedVendorIds(): string[] {
    const connectedIds = new Set<string>();

    this.connections.forEach((connection) => {
      connection.vendorIds.forEach((id) => {
        if (id !== this.currentVendorId) {
          connectedIds.add(id);
        }
      });
    });

    return Array.from(connectedIds);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear all intervals
    this.heartbeatIntervals.forEach((interval) => clearInterval(interval));
    this.heartbeatIntervals.clear();

    // Clear maps
    this.connections.clear();
    this.pendingRequests.clear();
    this.messageQueue.clear();

    // Remove event listeners
    this.removeAllListeners();
  }
}

// Export singleton instance
export const connectionEngine = new ConnectionEngine();
