/**
 * WS-214 Team B: NetworkAPI Component
 *
 * Provides RESTful API layer for vendor connections and networking
 * Integrates with ConnectionEngine to expose network functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  connectionEngine,
  VendorProfile,
  ConnectionRequest,
  NetworkConnection,
  TimeSlot,
  CollaborationHistory,
} from './connection-engine';
import { z } from 'zod';

// Request/Response Schemas
const VendorProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    'photographer',
    'venue',
    'florist',
    'caterer',
    'coordinator',
    'dj',
    'videographer',
    'officiant',
  ]),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
    serviceRadius: z.number(),
  }),
  availability: z.object({
    timeSlots: z.array(
      z.object({
        start: z.string().transform((str) => new Date(str)),
        end: z.string().transform((str) => new Date(str)),
        eventId: z.string().optional(),
        type: z.enum(['available', 'booked', 'tentative']),
      }),
    ),
    blackoutDates: z.array(z.string().transform((str) => new Date(str))),
  }),
  expertise: z.array(z.string()),
  rating: z.number().min(0).max(5),
  reviewCount: z.number(),
  collaborationHistory: z.array(z.any()),
  connectionPreferences: z.object({
    maxConcurrentConnections: z.number(),
    preferredCollaborators: z.array(z.string()),
    blockedVendors: z.array(z.string()),
    autoAcceptReferrals: z.boolean(),
    shareAvailability: z.boolean(),
    notificationPreferences: z.object({
      email: z.boolean(),
      sms: z.boolean(),
      push: z.boolean(),
      inApp: z.boolean(),
    }),
    responseTimeExpectation: z.number(),
  }),
  status: z.enum(['active', 'busy', 'offline', 'away']),
  lastSeen: z.string().transform((str) => new Date(str)),
});

const ConnectionRequestSchema = z.object({
  fromVendorId: z.string(),
  toVendorId: z.string(),
  eventId: z.string().optional(),
  type: z.enum([
    'collaboration',
    'referral',
    'availability_check',
    'resource_share',
  ]),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  message: z.string(),
  metadata: z
    .object({
      eventDate: z
        .string()
        .transform((str) => new Date(str))
        .optional(),
      serviceType: z.string().optional(),
      budget: z.number().optional(),
      clientName: z.string().optional(),
    })
    .optional(),
});

const DiscoveryRequestSchema = z.object({
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    serviceRadius: z.number(),
  }),
  serviceTypes: z.array(z.string()).optional(),
  filters: z
    .object({
      rating: z.number().optional(),
      maxDistance: z.number().optional(),
      availability: z
        .object({
          start: z.string().transform((str) => new Date(str)),
          end: z.string().transform((str) => new Date(str)),
        })
        .optional(),
    })
    .optional(),
});

const AvailabilityUpdateSchema = z.object({
  timeSlots: z.array(
    z.object({
      start: z.string().transform((str) => new Date(str)),
      end: z.string().transform((str) => new Date(str)),
      eventId: z.string().optional(),
      type: z.enum(['available', 'booked', 'tentative']),
    }),
  ),
});

const MessageSchema = z.object({
  connectionId: z.string(),
  message: z.object({
    type: z.string(),
    content: z.any(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    requiresResponse: z.boolean().optional(),
  }),
});

interface NetworkAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    requestId: string;
    rateLimit?: {
      remaining: number;
      resetTime: string;
    };
  };
}

interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  pendingRequests: number;
  messagesSentToday: number;
  averageResponseTime: number;
  networkQuality: string;
}

class NetworkAPI {
  private rateLimits: Map<string, { count: number; resetTime: number }> =
    new Map();
  private messageStats: Map<
    string,
    { sent: number; received: number; lastActivity: Date }
  > = new Map();

  constructor() {
    this.initializeAPI();
  }

  /**
   * Initialize API with connection engine
   */
  private initializeAPI(): void {
    // Listen to connection engine events for real-time updates
    connectionEngine.on('connection_established', (data) => {
      this.broadcastEvent('connection_established', data);
    });

    connectionEngine.on('message_received', (data) => {
      this.updateMessageStats(data.connectionId, 'received');
      this.broadcastEvent('message_received', data);
    });

    connectionEngine.on('network_quality_changed', (data) => {
      this.broadcastEvent('network_quality_changed', data);
    });
  }

  /**
   * Initialize vendor profile
   * POST /api/network/vendors/initialize
   */
  async initializeVendor(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const vendorProfile = VendorProfileSchema.parse(body);

      await connectionEngine.initialize(vendorProfile.id, vendorProfile);

      return this.createResponse({
        success: true,
        data: { vendorId: vendorProfile.id, status: 'initialized' },
      });
    } catch (error) {
      return this.createErrorResponse('Failed to initialize vendor', error);
    }
  }

  /**
   * Discover nearby vendors
   * POST /api/network/vendors/discover
   */
  async discoverVendors(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const discoveryRequest = DiscoveryRequestSchema.parse(body);

      // Apply rate limiting
      const vendorId = this.extractVendorId(request);
      if (!this.checkRateLimit(vendorId, 'discovery', 10, 60000)) {
        // 10 requests per minute
        return this.createErrorResponse(
          'Rate limit exceeded for discovery requests',
          null,
          429,
        );
      }

      const nearbyVendors = await connectionEngine.discoverNearbyVendors();

      // Apply filters
      const filteredVendors = this.applyDiscoveryFilters(
        nearbyVendors,
        discoveryRequest.filters,
      );

      return this.createResponse({
        success: true,
        data: {
          vendors: filteredVendors,
          count: filteredVendors.length,
        },
      });
    } catch (error) {
      return this.createErrorResponse('Failed to discover vendors', error);
    }
  }

  /**
   * Create connection request
   * POST /api/network/connections/request
   */
  async requestConnection(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const connectionRequest = ConnectionRequestSchema.parse(body);

      // Apply rate limiting
      const vendorId = connectionRequest.fromVendorId;
      if (!this.checkRateLimit(vendorId, 'connection_request', 20, 60000)) {
        // 20 requests per minute
        return this.createErrorResponse(
          'Rate limit exceeded for connection requests',
          null,
          429,
        );
      }

      const requestId = await connectionEngine.connect(
        connectionRequest.toVendorId,
        {
          priority: connectionRequest.priority,
          message: connectionRequest.message,
          eventId: connectionRequest.eventId,
          type: connectionRequest.type,
        },
      );

      return this.createResponse({
        success: true,
        data: { requestId },
      });
    } catch (error) {
      return this.createErrorResponse(
        'Failed to create connection request',
        error,
      );
    }
  }

  /**
   * Accept connection request
   * POST /api/network/connections/accept
   */
  async acceptConnection(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { requestId } = z.object({ requestId: z.string() }).parse(body);

      const connection = await connectionEngine.acceptConnection(requestId);

      return this.createResponse({
        success: true,
        data: { connection },
      });
    } catch (error) {
      return this.createErrorResponse('Failed to accept connection', error);
    }
  }

  /**
   * Decline connection request
   * POST /api/network/connections/decline
   */
  async declineConnection(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { requestId, reason } = z
        .object({
          requestId: z.string(),
          reason: z.string().optional(),
        })
        .parse(body);

      await connectionEngine.declineConnection(requestId, reason);

      return this.createResponse({
        success: true,
        data: { requestId, status: 'declined' },
      });
    } catch (error) {
      return this.createErrorResponse('Failed to decline connection', error);
    }
  }

  /**
   * Send message through connection
   * POST /api/network/connections/message
   */
  async sendMessage(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const messageRequest = MessageSchema.parse(body);

      // Apply rate limiting
      const vendorId = this.extractVendorId(request);
      if (!this.checkRateLimit(vendorId, 'message', 100, 60000)) {
        // 100 messages per minute
        return this.createErrorResponse(
          'Rate limit exceeded for messages',
          null,
          429,
        );
      }

      await connectionEngine.sendMessage(
        messageRequest.connectionId,
        messageRequest.message,
      );

      // Update message stats
      this.updateMessageStats(messageRequest.connectionId, 'sent');

      return this.createResponse({
        success: true,
        data: { messageId: this.generateMessageId(), status: 'sent' },
      });
    } catch (error) {
      return this.createErrorResponse('Failed to send message', error);
    }
  }

  /**
   * Check availability of vendors
   * POST /api/network/availability/check
   */
  async checkAvailability(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { vendorIds, dateRange } = z
        .object({
          vendorIds: z.array(z.string()),
          dateRange: z.object({
            start: z.string().transform((str) => new Date(str)),
            end: z.string().transform((str) => new Date(str)),
          }),
        })
        .parse(body);

      const availabilityMap = await connectionEngine.checkAvailability(
        vendorIds,
        dateRange,
      );

      // Convert Map to object for JSON serialization
      const availability: Record<string, TimeSlot[]> = {};
      availabilityMap.forEach((slots, vendorId) => {
        availability[vendorId] = slots;
      });

      return this.createResponse({
        success: true,
        data: { availability },
      });
    } catch (error) {
      return this.createErrorResponse('Failed to check availability', error);
    }
  }

  /**
   * Update vendor availability
   * PUT /api/network/availability/update
   */
  async updateAvailability(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const availabilityUpdate = AvailabilityUpdateSchema.parse(body);

      await connectionEngine.updateAvailability(availabilityUpdate.timeSlots);

      return this.createResponse({
        success: true,
        data: {
          status: 'updated',
          timeSlots: availabilityUpdate.timeSlots.length,
        },
      });
    } catch (error) {
      return this.createErrorResponse('Failed to update availability', error);
    }
  }

  /**
   * Request referral from vendor
   * POST /api/network/referrals/request
   */
  async requestReferral(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { vendorId, serviceType, eventDetails } = z
        .object({
          vendorId: z.string(),
          serviceType: z.string(),
          eventDetails: z.any(),
        })
        .parse(body);

      const requestId = await connectionEngine.requestReferral(
        vendorId,
        serviceType,
        eventDetails,
      );

      return this.createResponse({
        success: true,
        data: { requestId },
      });
    } catch (error) {
      return this.createErrorResponse('Failed to request referral', error);
    }
  }

  /**
   * Get connection statistics
   * GET /api/network/stats
   */
  async getConnectionStats(request: NextRequest): Promise<NextResponse> {
    try {
      const vendorId = this.extractVendorId(request);
      const connections = connectionEngine.getConnections();
      const pendingRequests = connectionEngine.getPendingRequests();

      const stats: ConnectionStats = {
        totalConnections: connections.length,
        activeConnections: connections.filter((conn) => conn.strength > 0.5)
          .length,
        pendingRequests: pendingRequests.length,
        messagesSentToday: this.getMessagesSentToday(vendorId),
        averageResponseTime: this.calculateAverageResponseTime(connections),
        networkQuality: this.getCurrentNetworkQuality(),
      };

      return this.createResponse({
        success: true,
        data: stats,
      });
    } catch (error) {
      return this.createErrorResponse('Failed to get connection stats', error);
    }
  }

  /**
   * Get active connections
   * GET /api/network/connections
   */
  async getConnections(request: NextRequest): Promise<NextResponse> {
    try {
      const connections = connectionEngine.getConnections();

      // Transform connections for API response
      const connectionsResponse = connections.map((conn) => ({
        ...conn,
        lastPing: conn.lastPing.toISOString(),
        vendorProfiles: conn.vendorIds.map((id) =>
          connectionEngine.getVendorProfile(id),
        ),
      }));

      return this.createResponse({
        success: true,
        data: { connections: connectionsResponse },
      });
    } catch (error) {
      return this.createErrorResponse('Failed to get connections', error);
    }
  }

  /**
   * Get pending requests
   * GET /api/network/requests/pending
   */
  async getPendingRequests(request: NextRequest): Promise<NextResponse> {
    try {
      const vendorId = this.extractVendorId(request);
      const allPendingRequests = connectionEngine.getPendingRequests();

      // Filter requests for current vendor
      const vendorRequests = allPendingRequests.filter(
        (req) => req.toVendorId === vendorId || req.fromVendorId === vendorId,
      );

      const requestsResponse = vendorRequests.map((req) => ({
        ...req,
        createdAt: req.createdAt.toISOString(),
        expiresAt: req.expiresAt.toISOString(),
        responseTime: req.responseTime?.toISOString(),
        fromVendorProfile: connectionEngine.getVendorProfile(req.fromVendorId),
        toVendorProfile: connectionEngine.getVendorProfile(req.toVendorId),
      }));

      return this.createResponse({
        success: true,
        data: { requests: requestsResponse },
      });
    } catch (error) {
      return this.createErrorResponse('Failed to get pending requests', error);
    }
  }

  /**
   * Get vendor profile
   * GET /api/network/vendors/:vendorId
   */
  async getVendorProfile(request: NextRequest): Promise<NextResponse> {
    try {
      const vendorId = this.extractVendorIdFromPath(request);
      const profile = connectionEngine.getVendorProfile(vendorId);

      if (!profile) {
        return this.createErrorResponse('Vendor profile not found', null, 404);
      }

      const profileResponse = {
        ...profile,
        lastSeen: profile.lastSeen.toISOString(),
        availability: {
          ...profile.availability,
          timeSlots: profile.availability.timeSlots.map((slot) => ({
            ...slot,
            start: slot.start.toISOString(),
            end: slot.end.toISOString(),
          })),
          blackoutDates: profile.availability.blackoutDates.map((date) =>
            date.toISOString(),
          ),
        },
      };

      return this.createResponse({
        success: true,
        data: { profile: profileResponse },
      });
    } catch (error) {
      return this.createErrorResponse('Failed to get vendor profile', error);
    }
  }

  /**
   * WebSocket endpoint for real-time updates
   * GET /api/network/ws
   */
  async handleWebSocket(request: NextRequest): Promise<NextResponse> {
    // WebSocket implementation would go here
    // For now, return method not implemented
    return this.createErrorResponse(
      'WebSocket not implemented in this version',
      null,
      501,
    );
  }

  /**
   * Health check endpoint
   * GET /api/network/health
   */
  async healthCheck(request: NextRequest): Promise<NextResponse> {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: {
        total: connectionEngine.getConnections().length,
        healthy: connectionEngine
          .getConnections()
          .filter((c) => c.strength > 0.5).length,
      },
      networkQuality: this.getCurrentNetworkQuality(),
      rateLimit: {
        status: 'operational',
      },
    };

    return this.createResponse({
      success: true,
      data: health,
    });
  }

  /**
   * Helper methods
   */

  private applyDiscoveryFilters(
    vendors: VendorProfile[],
    filters?: any,
  ): VendorProfile[] {
    if (!filters) return vendors;

    let filtered = vendors;

    if (filters.rating) {
      filtered = filtered.filter((v) => v.rating >= filters.rating);
    }

    if (filters.availability) {
      filtered = filtered.filter((v) =>
        v.availability.timeSlots.some(
          (slot) =>
            slot.type === 'available' &&
            slot.start <= filters.availability.end &&
            slot.end >= filters.availability.start,
        ),
      );
    }

    return filtered;
  }

  private checkRateLimit(
    vendorId: string,
    operation: string,
    maxRequests: number,
    windowMs: number,
  ): boolean {
    const key = `${vendorId}:${operation}`;
    const now = Date.now();

    const current = this.rateLimits.get(key);
    if (!current || now > current.resetTime) {
      this.rateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (current.count >= maxRequests) {
      return false;
    }

    current.count++;
    return true;
  }

  private updateMessageStats(
    connectionId: string,
    type: 'sent' | 'received',
  ): void {
    const stats = this.messageStats.get(connectionId) || {
      sent: 0,
      received: 0,
      lastActivity: new Date(),
    };
    stats[type]++;
    stats.lastActivity = new Date();
    this.messageStats.set(connectionId, stats);
  }

  private getMessagesSentToday(vendorId: string): number {
    // Simplified calculation - in production would use proper time tracking
    let total = 0;
    this.messageStats.forEach((stats) => {
      const isToday =
        stats.lastActivity.toDateString() === new Date().toDateString();
      if (isToday) {
        total += stats.sent;
      }
    });
    return total;
  }

  private calculateAverageResponseTime(
    connections: NetworkConnection[],
  ): number {
    if (connections.length === 0) return 0;

    const totalResponseTime = connections.reduce(
      (sum, conn) => sum + conn.connectionMetrics.averageResponseTime,
      0,
    );

    return totalResponseTime / connections.length;
  }

  private getCurrentNetworkQuality(): string {
    // Would integrate with mobile network adapter
    return 'good';
  }

  private extractVendorId(request: NextRequest): string {
    // Extract vendor ID from authorization header or query params
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      // Decode JWT token to get vendor ID
      // This is a simplified implementation
      return 'vendor_123';
    }

    return request.nextUrl.searchParams.get('vendorId') || '';
  }

  private extractVendorIdFromPath(request: NextRequest): string {
    const pathSegments = request.nextUrl.pathname.split('/');
    return pathSegments[pathSegments.length - 1];
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createResponse<T>(
    response: NetworkAPIResponse<T>,
    status: number = 200,
  ): NextResponse {
    const fullResponse: NetworkAPIResponse<T> = {
      ...response,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        ...response.meta,
      },
    };

    return NextResponse.json(fullResponse, { status });
  }

  private createErrorResponse(
    message: string,
    error: any,
    status: number = 400,
  ): NextResponse {
    console.error('NetworkAPI Error:', message, error);

    return this.createResponse(
      {
        success: false,
        error: message,
        data:
          process.env.NODE_ENV === 'development'
            ? {
                details: error?.message || error,
              }
            : undefined,
      },
      status,
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private broadcastEvent(eventType: string, data: any): void {
    // In production, this would broadcast to WebSocket connections
    console.log(`Broadcasting event: ${eventType}`, data);
  }
}

// Export singleton instance
export const networkAPI = new NetworkAPI();

// Route handlers for Next.js App Router
export async function GET(
  request: NextRequest,
  context: { params: { slug: string[] } },
) {
  const path = context.params.slug.join('/');

  switch (path) {
    case 'health':
      return networkAPI.healthCheck(request);
    case 'stats':
      return networkAPI.getConnectionStats(request);
    case 'connections':
      return networkAPI.getConnections(request);
    case 'requests/pending':
      return networkAPI.getPendingRequests(request);
    case 'ws':
      return networkAPI.handleWebSocket(request);
    default:
      if (path.startsWith('vendors/')) {
        return networkAPI.getVendorProfile(request);
      }
      return NextResponse.json(
        { error: 'Endpoint not found' },
        { status: 404 },
      );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { slug: string[] } },
) {
  const path = context.params.slug.join('/');

  switch (path) {
    case 'vendors/initialize':
      return networkAPI.initializeVendor(request);
    case 'vendors/discover':
      return networkAPI.discoverVendors(request);
    case 'connections/request':
      return networkAPI.requestConnection(request);
    case 'connections/accept':
      return networkAPI.acceptConnection(request);
    case 'connections/decline':
      return networkAPI.declineConnection(request);
    case 'connections/message':
      return networkAPI.sendMessage(request);
    case 'availability/check':
      return networkAPI.checkAvailability(request);
    case 'referrals/request':
      return networkAPI.requestReferral(request);
    default:
      return NextResponse.json(
        { error: 'Endpoint not found' },
        { status: 404 },
      );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { slug: string[] } },
) {
  const path = context.params.slug.join('/');

  switch (path) {
    case 'availability/update':
      return networkAPI.updateAvailability(request);
    default:
      return NextResponse.json(
        { error: 'Endpoint not found' },
        { status: 404 },
      );
  }
}

// Export types for external use
export type { NetworkAPIResponse, ConnectionStats };

// Export schemas for validation
export {
  VendorProfileSchema,
  ConnectionRequestSchema,
  DiscoveryRequestSchema,
  AvailabilityUpdateSchema,
  MessageSchema,
};
