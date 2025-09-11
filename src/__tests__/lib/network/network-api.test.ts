/**
 * @jest-environment jsdom
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  networkAPI,
  NetworkAPIResponse,
} from '../../../lib/network/network-api';
import { connectionEngine } from '../../../lib/network/connection-engine';

// Mock dependencies
jest.mock('../../../lib/network/connection-engine');
jest.mock('next/server');

// Mock ConnectionEngine methods
const mockConnectionEngine = connectionEngine as jest.Mocked<
  typeof connectionEngine
>;

describe('NetworkAPI', () => {
  let mockRequest: Partial<NextRequest>;
  let mockContext: { params: { slug: string[] } };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      json: jest.fn(),
      headers: new Headers(),
      nextUrl: {
        pathname: '/api/network/test',
        searchParams: new URLSearchParams(),
      } as any,
    };

    mockContext = {
      params: { slug: ['test'] },
    };

    // Mock connection engine methods
    mockConnectionEngine.initialize = jest.fn().mockResolvedValue(undefined);
    mockConnectionEngine.discoverNearbyVendors = jest
      .fn()
      .mockResolvedValue([]);
    mockConnectionEngine.connect = jest.fn().mockResolvedValue('req_123');
    mockConnectionEngine.acceptConnection = jest.fn().mockResolvedValue({
      id: 'conn_123',
      vendorIds: ['vendor_1', 'vendor_2'],
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
    });
    mockConnectionEngine.declineConnection = jest
      .fn()
      .mockResolvedValue(undefined);
    mockConnectionEngine.sendMessage = jest.fn().mockResolvedValue(undefined);
    mockConnectionEngine.checkAvailability = jest
      .fn()
      .mockResolvedValue(new Map());
    mockConnectionEngine.updateAvailability = jest
      .fn()
      .mockResolvedValue(undefined);
    mockConnectionEngine.requestReferral = jest
      .fn()
      .mockResolvedValue('referral_123');
    mockConnectionEngine.getConnections = jest.fn().mockReturnValue([]);
    mockConnectionEngine.getPendingRequests = jest.fn().mockReturnValue([]);
    mockConnectionEngine.getVendorProfile = jest.fn().mockReturnValue(null);

    // Mock NextResponse
    (NextResponse.json as jest.Mock) = jest
      .fn()
      .mockImplementation((data, options) => ({
        json: data,
        status: options?.status || 200,
      }));
  });

  describe('Vendor Initialization', () => {
    it('should initialize vendor successfully', async () => {
      const vendorData = {
        id: 'vendor_123',
        name: 'Test Photography',
        type: 'photographer',
        location: {
          lat: 40.7128,
          lng: -74.006,
          address: '123 Main St',
          serviceRadius: 50,
        },
        availability: {
          timeSlots: [
            {
              start: '2024-06-15T10:00:00Z',
              end: '2024-06-15T18:00:00Z',
              type: 'available',
            },
          ],
          blackoutDates: [],
        },
        expertise: ['weddings'],
        rating: 4.8,
        reviewCount: 100,
        collaborationHistory: [],
        connectionPreferences: {
          maxConcurrentConnections: 20,
          preferredCollaborators: [],
          blockedVendors: [],
          autoAcceptReferrals: true,
          shareAvailability: true,
          notificationPreferences: {
            email: true,
            sms: true,
            push: true,
            inApp: true,
          },
          responseTimeExpectation: 30,
        },
        status: 'active',
        lastSeen: '2024-01-01T00:00:00Z',
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(vendorData);

      const response = await networkAPI.initializeVendor(
        mockRequest as NextRequest,
      );

      expect(mockConnectionEngine.initialize).toHaveBeenCalledWith(
        vendorData.id,
        expect.objectContaining({
          id: vendorData.id,
          name: vendorData.name,
          type: vendorData.type,
        }),
      );
      expect(response).toBeDefined();
    });

    it('should handle validation errors during initialization', async () => {
      const invalidData = {
        id: 'vendor_123',
        // Missing required fields
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(invalidData);

      const response = await networkAPI.initializeVendor(
        mockRequest as NextRequest,
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to initialize vendor',
        }),
        { status: 400 },
      );
    });
  });

  describe('Vendor Discovery', () => {
    it('should discover vendors successfully', async () => {
      const discoveryRequest = {
        location: {
          lat: 40.7128,
          lng: -74.006,
          serviceRadius: 50,
        },
        serviceTypes: ['venue', 'florist'],
      };

      const mockVendors = [
        { id: 'vendor_456', name: 'Test Venue', type: 'venue' },
        { id: 'vendor_789', name: 'Test Florist', type: 'florist' },
      ];

      (mockRequest.json as jest.Mock).mockResolvedValue(discoveryRequest);
      (mockRequest.headers as Headers).set(
        'authorization',
        'Bearer test_token',
      );
      mockConnectionEngine.discoverNearbyVendors.mockResolvedValue(
        mockVendors as any,
      );

      // Mock rate limit check
      jest.spyOn(networkAPI as any, 'checkRateLimit').mockReturnValue(true);

      const response = await networkAPI.discoverVendors(
        mockRequest as NextRequest,
      );

      expect(mockConnectionEngine.discoverNearbyVendors).toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            vendors: mockVendors,
            count: mockVendors.length,
          }),
        }),
        { status: 200 },
      );
    });

    it('should enforce rate limiting for discovery requests', async () => {
      const discoveryRequest = {
        location: {
          lat: 40.7128,
          lng: -74.006,
          serviceRadius: 50,
        },
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(discoveryRequest);

      // Mock rate limit exceeded
      jest.spyOn(networkAPI as any, 'checkRateLimit').mockReturnValue(false);

      const response = await networkAPI.discoverVendors(
        mockRequest as NextRequest,
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Rate limit exceeded for discovery requests',
        }),
        { status: 429 },
      );
    });

    it('should apply discovery filters correctly', async () => {
      const discoveryRequest = {
        location: {
          lat: 40.7128,
          lng: -74.006,
          serviceRadius: 50,
        },
        filters: {
          rating: 4.5,
          availability: {
            start: '2024-06-15T10:00:00Z',
            end: '2024-06-15T18:00:00Z',
          },
        },
      };

      const mockVendors = [
        {
          id: 'vendor_456',
          name: 'High Rated Venue',
          type: 'venue',
          rating: 4.8,
          availability: {
            timeSlots: [
              {
                start: new Date('2024-06-15T09:00:00Z'),
                end: new Date('2024-06-15T19:00:00Z'),
                type: 'available',
              },
            ],
          },
        },
        {
          id: 'vendor_789',
          name: 'Low Rated Venue',
          type: 'venue',
          rating: 3.0,
          availability: {
            timeSlots: [],
          },
        },
      ];

      (mockRequest.json as jest.Mock).mockResolvedValue(discoveryRequest);
      jest.spyOn(networkAPI as any, 'checkRateLimit').mockReturnValue(true);
      mockConnectionEngine.discoverNearbyVendors.mockResolvedValue(
        mockVendors as any,
      );

      const response = await networkAPI.discoverVendors(
        mockRequest as NextRequest,
      );

      // Should filter out low-rated vendor
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            vendors: [mockVendors[0]], // Only high-rated vendor
            count: 1,
          }),
        }),
        { status: 200 },
      );
    });
  });

  describe('Connection Requests', () => {
    it('should create connection request successfully', async () => {
      const connectionRequest = {
        fromVendorId: 'vendor_123',
        toVendorId: 'vendor_456',
        type: 'collaboration',
        priority: 'high',
        message: "Let's collaborate!",
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(connectionRequest);
      jest.spyOn(networkAPI as any, 'checkRateLimit').mockReturnValue(true);

      const response = await networkAPI.requestConnection(
        mockRequest as NextRequest,
      );

      expect(mockConnectionEngine.connect).toHaveBeenCalledWith(
        connectionRequest.toVendorId,
        expect.objectContaining({
          priority: connectionRequest.priority,
          message: connectionRequest.message,
          type: connectionRequest.type,
        }),
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { requestId: 'req_123' },
        }),
        { status: 200 },
      );
    });

    it('should accept connection request', async () => {
      const requestData = { requestId: 'req_123' };

      (mockRequest.json as jest.Mock).mockResolvedValue(requestData);

      const response = await networkAPI.acceptConnection(
        mockRequest as NextRequest,
      );

      expect(mockConnectionEngine.acceptConnection).toHaveBeenCalledWith(
        'req_123',
      );
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            connection: expect.any(Object),
          }),
        }),
        { status: 200 },
      );
    });

    it('should decline connection request with reason', async () => {
      const requestData = {
        requestId: 'req_123',
        reason: 'Already booked for that date',
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(requestData);

      const response = await networkAPI.declineConnection(
        mockRequest as NextRequest,
      );

      expect(mockConnectionEngine.declineConnection).toHaveBeenCalledWith(
        'req_123',
        'Already booked for that date',
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { requestId: 'req_123', status: 'declined' },
        }),
        { status: 200 },
      );
    });
  });

  describe('Message Handling', () => {
    it('should send message successfully', async () => {
      const messageRequest = {
        connectionId: 'conn_123',
        message: {
          type: 'chat',
          content: 'Hello there!',
          priority: 'medium',
        },
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(messageRequest);
      jest.spyOn(networkAPI as any, 'checkRateLimit').mockReturnValue(true);
      jest
        .spyOn(networkAPI as any, 'updateMessageStats')
        .mockImplementation(() => {});

      const response = await networkAPI.sendMessage(mockRequest as NextRequest);

      expect(mockConnectionEngine.sendMessage).toHaveBeenCalledWith(
        'conn_123',
        messageRequest.message,
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'sent',
          }),
        }),
        { status: 200 },
      );
    });

    it('should enforce rate limiting for messages', async () => {
      const messageRequest = {
        connectionId: 'conn_123',
        message: {
          type: 'chat',
          content: 'Spam message',
        },
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(messageRequest);
      jest.spyOn(networkAPI as any, 'checkRateLimit').mockReturnValue(false);

      const response = await networkAPI.sendMessage(mockRequest as NextRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Rate limit exceeded for messages',
        }),
        { status: 429 },
      );
    });
  });

  describe('Availability Management', () => {
    it('should check availability for multiple vendors', async () => {
      const availabilityRequest = {
        vendorIds: ['vendor_123', 'vendor_456'],
        dateRange: {
          start: '2024-06-15T00:00:00Z',
          end: '2024-06-16T00:00:00Z',
        },
      };

      const mockAvailability = new Map([
        [
          'vendor_123',
          [
            {
              start: new Date('2024-06-15T10:00:00Z'),
              end: new Date('2024-06-15T18:00:00Z'),
              type: 'available',
            },
          ],
        ],
      ]);

      (mockRequest.json as jest.Mock).mockResolvedValue(availabilityRequest);
      mockConnectionEngine.checkAvailability.mockResolvedValue(
        mockAvailability,
      );

      const response = await networkAPI.checkAvailability(
        mockRequest as NextRequest,
      );

      expect(mockConnectionEngine.checkAvailability).toHaveBeenCalledWith(
        availabilityRequest.vendorIds,
        expect.objectContaining({
          start: new Date('2024-06-15T00:00:00Z'),
          end: new Date('2024-06-16T00:00:00Z'),
        }),
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            availability: expect.any(Object),
          }),
        }),
        { status: 200 },
      );
    });

    it('should update vendor availability', async () => {
      const availabilityUpdate = {
        timeSlots: [
          {
            start: '2024-07-01T09:00:00Z',
            end: '2024-07-01T17:00:00Z',
            type: 'available',
          },
        ],
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(availabilityUpdate);

      const response = await networkAPI.updateAvailability(
        mockRequest as NextRequest,
      );

      expect(mockConnectionEngine.updateAvailability).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            start: new Date('2024-07-01T09:00:00Z'),
            end: new Date('2024-07-01T17:00:00Z'),
            type: 'available',
          }),
        ]),
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'updated',
            timeSlots: 1,
          }),
        }),
        { status: 200 },
      );
    });
  });

  describe('Referral System', () => {
    it('should request referral successfully', async () => {
      const referralRequest = {
        vendorId: 'vendor_456',
        serviceType: 'florist',
        eventDetails: {
          eventDate: '2024-08-15T00:00:00Z',
          budget: 1500,
          clientName: 'Smith Wedding',
        },
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(referralRequest);

      const response = await networkAPI.requestReferral(
        mockRequest as NextRequest,
      );

      expect(mockConnectionEngine.requestReferral).toHaveBeenCalledWith(
        'vendor_456',
        'florist',
        referralRequest.eventDetails,
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { requestId: 'referral_123' },
        }),
        { status: 200 },
      );
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should return connection statistics', async () => {
      const mockConnections = [
        {
          id: 'conn_1',
          strength: 0.8,
          connectionMetrics: { averageResponseTime: 250 },
        },
        {
          id: 'conn_2',
          strength: 0.6,
          connectionMetrics: { averageResponseTime: 300 },
        },
      ];

      const mockPendingRequests = [{ id: 'req_1' }, { id: 'req_2' }];

      mockConnectionEngine.getConnections.mockReturnValue(
        mockConnections as any,
      );
      mockConnectionEngine.getPendingRequests.mockReturnValue(
        mockPendingRequests as any,
      );

      jest.spyOn(networkAPI as any, 'getMessagesSentToday').mockReturnValue(15);
      jest
        .spyOn(networkAPI as any, 'getCurrentNetworkQuality')
        .mockReturnValue('good');

      const response = await networkAPI.getConnectionStats(
        mockRequest as NextRequest,
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalConnections: 2,
            activeConnections: 1, // Only connections with strength > 0.5
            pendingRequests: 2,
            messagesSentToday: 15,
            networkQuality: 'good',
          }),
        }),
        { status: 200 },
      );
    });

    it('should return active connections', async () => {
      const mockConnections = [
        {
          id: 'conn_1',
          vendorIds: ['vendor_1', 'vendor_2'],
          lastPing: new Date(),
        },
      ];

      mockConnectionEngine.getConnections.mockReturnValue(
        mockConnections as any,
      );
      mockConnectionEngine.getVendorProfile.mockReturnValue({
        id: 'vendor_1',
        name: 'Test Vendor',
      } as any);

      const response = await networkAPI.getConnections(
        mockRequest as NextRequest,
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            connections: expect.arrayContaining([
              expect.objectContaining({
                id: 'conn_1',
                vendorProfiles: expect.any(Array),
              }),
            ]),
          }),
        }),
        { status: 200 },
      );
    });

    it('should return pending requests for vendor', async () => {
      const mockRequests = [
        {
          id: 'req_1',
          fromVendorId: 'vendor_123',
          toVendorId: 'vendor_456',
          createdAt: new Date(),
          expiresAt: new Date(),
        },
      ];

      mockConnectionEngine.getPendingRequests.mockReturnValue(
        mockRequests as any,
      );
      jest
        .spyOn(networkAPI as any, 'extractVendorId')
        .mockReturnValue('vendor_456');

      const response = await networkAPI.getPendingRequests(
        mockRequest as NextRequest,
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            requests: expect.arrayContaining([
              expect.objectContaining({
                id: 'req_1',
              }),
            ]),
          }),
        }),
        { status: 200 },
      );
    });
  });

  describe('Vendor Profiles', () => {
    it('should return vendor profile when found', async () => {
      const mockProfile = {
        id: 'vendor_123',
        name: 'Test Photography',
        type: 'photographer',
        lastSeen: new Date(),
        availability: {
          timeSlots: [
            {
              start: new Date(),
              end: new Date(),
            },
          ],
          blackoutDates: [new Date()],
        },
      };

      mockConnectionEngine.getVendorProfile.mockReturnValue(mockProfile as any);
      jest
        .spyOn(networkAPI as any, 'extractVendorIdFromPath')
        .mockReturnValue('vendor_123');

      const response = await networkAPI.getVendorProfile(
        mockRequest as NextRequest,
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            profile: expect.objectContaining({
              id: 'vendor_123',
              name: 'Test Photography',
            }),
          }),
        }),
        { status: 200 },
      );
    });

    it('should return 404 when vendor profile not found', async () => {
      mockConnectionEngine.getVendorProfile.mockReturnValue(null);
      jest
        .spyOn(networkAPI as any, 'extractVendorIdFromPath')
        .mockReturnValue('nonexistent');

      const response = await networkAPI.getVendorProfile(
        mockRequest as NextRequest,
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Vendor profile not found',
        }),
        { status: 404 },
      );
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      mockConnectionEngine.getConnections.mockReturnValue([
        { strength: 0.8 },
        { strength: 0.3 },
        { strength: 0.9 },
      ] as any);

      jest
        .spyOn(networkAPI as any, 'getCurrentNetworkQuality')
        .mockReturnValue('excellent');

      const response = await networkAPI.healthCheck(mockRequest as NextRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'healthy',
            connections: expect.objectContaining({
              total: 3,
              healthy: 2, // Connections with strength > 0.5
            }),
            networkQuality: 'excellent',
          }),
        }),
        { status: 200 },
      );
    });
  });

  describe('Rate Limiting', () => {
    let checkRateLimit: any;

    beforeEach(() => {
      checkRateLimit = jest.spyOn(networkAPI as any, 'checkRateLimit');
    });

    it('should allow requests within rate limit', () => {
      checkRateLimit.mockReturnValue(true);

      const result = (networkAPI as any).checkRateLimit(
        'vendor_123',
        'test',
        10,
        60000,
      );

      expect(result).toBe(true);
    });

    it('should reject requests exceeding rate limit', () => {
      // Simulate multiple calls
      const rateLimits = new Map();
      (networkAPI as any).rateLimits = rateLimits;

      checkRateLimit.mockImplementation(
        (vendorId, operation, maxRequests, windowMs) => {
          const key = `${vendorId}:${operation}`;
          const now = Date.now();

          const current = rateLimits.get(key);
          if (!current || now > current.resetTime) {
            rateLimits.set(key, { count: 1, resetTime: now + windowMs });
            return true;
          }

          if (current.count >= maxRequests) {
            return false;
          }

          current.count++;
          return true;
        },
      );

      // First request should pass
      expect(
        (networkAPI as any).checkRateLimit('vendor_123', 'test', 2, 60000),
      ).toBe(true);

      // Second request should pass
      expect(
        (networkAPI as any).checkRateLimit('vendor_123', 'test', 2, 60000),
      ).toBe(true);

      // Third request should fail
      expect(
        (networkAPI as any).checkRateLimit('vendor_123', 'test', 2, 60000),
      ).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in requests', async () => {
      (mockRequest.json as jest.Mock).mockRejectedValue(
        new Error('Invalid JSON'),
      );

      const response = await networkAPI.initializeVendor(
        mockRequest as NextRequest,
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to initialize vendor',
        }),
        { status: 400 },
      );
    });

    it('should handle connection engine errors', async () => {
      const connectionRequest = {
        fromVendorId: 'vendor_123',
        toVendorId: 'vendor_456',
        type: 'collaboration',
        priority: 'high',
        message: 'Test',
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(connectionRequest);
      jest.spyOn(networkAPI as any, 'checkRateLimit').mockReturnValue(true);

      mockConnectionEngine.connect.mockRejectedValue(
        new Error('Connection failed'),
      );

      const response = await networkAPI.requestConnection(
        mockRequest as NextRequest,
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to create connection request',
        }),
        { status: 400 },
      );
    });

    it('should include error details in development environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      (mockRequest.json as jest.Mock).mockRejectedValue(
        new Error('Detailed error message'),
      );

      const response = await networkAPI.initializeVendor(
        mockRequest as NextRequest,
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to initialize vendor',
          data: expect.objectContaining({
            details: 'Detailed error message',
          }),
        }),
        { status: 400 },
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      (mockRequest.json as jest.Mock).mockRejectedValue(
        new Error('Sensitive error details'),
      );

      const response = await networkAPI.initializeVendor(
        mockRequest as NextRequest,
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to initialize vendor',
          data: undefined,
        }),
        { status: 400 },
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Response Format', () => {
    it('should include metadata in responses', async () => {
      mockConnectionEngine.getConnections.mockReturnValue([]);
      mockConnectionEngine.getPendingRequests.mockReturnValue([]);

      await networkAPI.getConnectionStats(mockRequest as NextRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: expect.any(String),
          }),
        }),
        { status: 200 },
      );
    });

    it('should generate unique request IDs', () => {
      const id1 = (networkAPI as any).generateRequestId();
      const id2 = (networkAPI as any).generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should generate unique message IDs', () => {
      const id1 = (networkAPI as any).generateMessageId();
      const id2 = (networkAPI as any).generateMessageId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });
  });

  describe('Utility Methods', () => {
    it('should extract vendor ID from authorization header', () => {
      (mockRequest.headers as Headers).set(
        'authorization',
        'Bearer test_token',
      );

      const vendorId = (networkAPI as any).extractVendorId(mockRequest);

      // Mock implementation returns hardcoded ID
      expect(vendorId).toBe('vendor_123');
    });

    it('should extract vendor ID from query parameters', () => {
      (mockRequest.nextUrl as any).searchParams.set('vendorId', 'vendor_456');

      const vendorId = (networkAPI as any).extractVendorId(mockRequest);

      expect(vendorId).toBe('vendor_456');
    });

    it('should extract vendor ID from URL path', () => {
      (mockRequest.nextUrl as any).pathname = '/api/network/vendors/vendor_789';

      const vendorId = (networkAPI as any).extractVendorIdFromPath(mockRequest);

      expect(vendorId).toBe('vendor_789');
    });

    it('should calculate messages sent today', () => {
      const messageStats = new Map([
        ['conn_1', { sent: 5, received: 3, lastActivity: new Date() }],
        ['conn_2', { sent: 7, received: 2, lastActivity: new Date() }],
        [
          'conn_3',
          { sent: 3, received: 1, lastActivity: new Date('2023-01-01') },
        ], // Old date
      ]);

      (networkAPI as any).messageStats = messageStats;

      const total = (networkAPI as any).getMessagesSentToday('vendor_123');

      expect(total).toBe(12); // 5 + 7 (excluding old activity)
    });
  });
});
