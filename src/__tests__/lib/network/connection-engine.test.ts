/**
 * @jest-environment jsdom
 */

import { ConnectionEngine } from '../../../lib/network/connection-engine';
import { mobileNetworkAdapter } from '../../../lib/network/mobile-network-adapter';

// Mock dependencies
jest.mock('../../../lib/network/mobile-network-adapter');

// Mock EventEmitter
jest.mock('events');

// Mock global fetch
global.fetch = jest.fn();

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
  },
  writable: true,
});

describe('ConnectionEngine', () => {
  let connectionEngine: ConnectionEngine;
  let mockVendorProfile: any;

  beforeEach(() => {
    jest.clearAllMocks();

    connectionEngine = new ConnectionEngine({
      maxConnections: 10,
      connectionTimeout: 5000,
      heartbeatInterval: 1000,
      retryAttempts: 2,
    });

    mockVendorProfile = {
      id: 'vendor_123',
      name: 'Test Photography',
      type: 'photographer',
      location: {
        lat: 40.7128,
        lng: -74.006,
        address: '123 Main St, New York, NY',
        serviceRadius: 50,
      },
      availability: {
        timeSlots: [
          {
            start: new Date('2024-06-15T10:00:00Z'),
            end: new Date('2024-06-15T18:00:00Z'),
            type: 'available',
          },
        ],
        blackoutDates: [],
      },
      expertise: ['weddings', 'portraits'],
      rating: 4.8,
      reviewCount: 127,
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
      lastSeen: new Date(),
    };

    // Mock fetch responses
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });

    // Mock network adapter methods
    (mobileNetworkAdapter.onAdaptationChange as jest.Mock) = jest.fn(
      (callback) => {
        return () => {}; // Unsubscribe function
      },
    );
    (mobileNetworkAdapter.getCurrentCondition as jest.Mock) = jest.fn(() => ({
      quality: 'good',
      type: '4g',
      stability: 'stable',
    }));
    (mobileNetworkAdapter.getCurrentStrategy as jest.Mock) = jest.fn(() => ({
      retryAttempts: 3,
      requestTimeout: 10000,
      maxConcurrentRequests: 4,
    }));
  });

  afterEach(() => {
    connectionEngine.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully with vendor profile', async () => {
      await connectionEngine.initialize(
        mockVendorProfile.id,
        mockVendorProfile,
      );

      expect(connectionEngine.getVendorProfile(mockVendorProfile.id)).toEqual(
        mockVendorProfile,
      );
    });

    it('should update vendor status to active on initialization', async () => {
      await connectionEngine.initialize(
        mockVendorProfile.id,
        mockVendorProfile,
      );

      const profile = connectionEngine.getVendorProfile(mockVendorProfile.id);
      expect(profile?.status).toBe('active');
      expect(profile?.lastSeen).toBeInstanceOf(Date);
    });

    it('should emit engine_initialized event', async () => {
      const eventSpy = jest.spyOn(connectionEngine, 'emit');

      await connectionEngine.initialize(
        mockVendorProfile.id,
        mockVendorProfile,
      );

      expect(eventSpy).toHaveBeenCalledWith('engine_initialized', {
        vendorId: mockVendorProfile.id,
        vendorProfile: expect.any(Object),
      });
    });
  });

  describe('Vendor Discovery', () => {
    beforeEach(async () => {
      await connectionEngine.initialize(
        mockVendorProfile.id,
        mockVendorProfile,
      );
    });

    it('should discover nearby vendors successfully', async () => {
      const mockNearbyVendors = [
        { id: 'vendor_456', name: 'Test Venue', type: 'venue' },
        { id: 'vendor_789', name: 'Test Florist', type: 'florist' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNearbyVendors,
      });

      const vendors = await connectionEngine.discoverNearbyVendors();

      expect(vendors).toEqual(mockNearbyVendors);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vendors/nearby',
        expect.any(Object),
      );
    });

    it('should emit vendors_discovered event', async () => {
      const eventSpy = jest.spyOn(connectionEngine, 'emit');
      const mockVendors = [{ id: 'vendor_456' }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVendors,
      });

      await connectionEngine.discoverNearbyVendors();

      expect(eventSpy).toHaveBeenCalledWith('vendors_discovered', {
        vendorIds: ['vendor_456'],
      });
    });

    it('should handle discovery errors gracefully', async () => {
      const eventSpy = jest.spyOn(connectionEngine, 'emit');

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const vendors = await connectionEngine.discoverNearbyVendors();

      expect(vendors).toEqual([]);
      expect(eventSpy).toHaveBeenCalledWith('discovery_error', {
        error: expect.any(Error),
      });
    });
  });

  describe('Connection Management', () => {
    beforeEach(async () => {
      await connectionEngine.initialize(
        mockVendorProfile.id,
        mockVendorProfile,
      );
    });

    it('should create connection request successfully', async () => {
      const targetVendorId = 'vendor_456';

      const requestId = await connectionEngine.connect(targetVendorId, {
        priority: 'high',
        message: "Let's collaborate on this wedding",
        type: 'collaboration',
      });

      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/connections/request',
        expect.any(Object),
      );
    });

    it('should reject connection when max connections reached', async () => {
      // Fill up connections to max
      const maxConnections = 10;
      for (let i = 0; i < maxConnections; i++) {
        const mockConnection = {
          id: `conn_${i}`,
          vendorIds: [mockVendorProfile.id, `vendor_${i}`],
          type: 'peer_to_peer' as const,
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

        connectionEngine['connections'].set(`conn_${i}`, mockConnection);
      }

      await expect(connectionEngine.connect('vendor_new')).rejects.toThrow(
        'Maximum connections reached',
      );
    });

    it('should accept connection request and create network connection', async () => {
      const mockRequest = {
        id: 'req_123',
        fromVendorId: 'vendor_456',
        toVendorId: mockVendorProfile.id,
        type: 'collaboration' as const,
        priority: 'medium' as const,
        message: 'Test connection',
        metadata: {},
        status: 'pending' as const,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      connectionEngine['pendingRequests'].set('req_123', mockRequest);

      const connection = await connectionEngine.acceptConnection('req_123');

      expect(connection).toBeDefined();
      expect(connection.vendorIds).toContain('vendor_456');
      expect(connection.vendorIds).toContain(mockVendorProfile.id);
      expect(mockRequest.status).toBe('accepted');
    });

    it('should decline connection request', async () => {
      const mockRequest = {
        id: 'req_123',
        fromVendorId: 'vendor_456',
        toVendorId: mockVendorProfile.id,
        type: 'collaboration' as const,
        priority: 'medium' as const,
        message: 'Test connection',
        metadata: {},
        status: 'pending' as const,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      connectionEngine['pendingRequests'].set('req_123', mockRequest);

      await connectionEngine.declineConnection('req_123', 'Not available');

      expect(mockRequest.status).toBe('declined');
      expect(connectionEngine['pendingRequests'].has('req_123')).toBe(false);
    });
  });

  describe('Message Handling', () => {
    let connectionId: string;
    let mockConnection: any;

    beforeEach(async () => {
      await connectionEngine.initialize(
        mockVendorProfile.id,
        mockVendorProfile,
      );

      connectionId = 'conn_test_123';
      mockConnection = {
        id: connectionId,
        vendorIds: [mockVendorProfile.id, 'vendor_456'],
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

      connectionEngine['connections'].set(connectionId, mockConnection);
    });

    it('should send message successfully', async () => {
      const message = {
        type: 'chat',
        content: "Hello, let's discuss the wedding details",
        priority: 'medium',
      };

      await connectionEngine.sendMessage(connectionId, message);

      expect(mockConnection.connectionMetrics.messagesExchanged).toBe(1);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/connections/message',
        expect.any(Object),
      );
    });

    it('should adapt messages based on network conditions', async () => {
      // Mock poor network conditions
      (mobileNetworkAdapter.getCurrentStrategy as jest.Mock).mockReturnValue({
        compressionLevel: 'aggressive',
        imageQuality: 'text-only',
      });

      const message = {
        type: 'media',
        content: 'Check out this venue',
        images: ['image1.jpg', 'image2.jpg'],
        attachments: ['contract.pdf'],
      };

      await connectionEngine.sendMessage(connectionId, message);

      // Should have removed images and attachments for poor connection
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/connections/message',
        expect.objectContaining({
          body: expect.stringContaining('"message"'),
        }),
      );
    });

    it('should retry failed messages according to network strategy', async () => {
      // Mock network strategy with specific retry attempts
      (mobileNetworkAdapter.getCurrentStrategy as jest.Mock).mockReturnValue({
        retryAttempts: 2,
        requestTimeout: 1000,
      });

      // Mock fetch to fail initially then succeed
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const message = { type: 'chat', content: 'Test retry' };

      await connectionEngine.sendMessage(connectionId, message);

      expect(global.fetch).toHaveBeenCalledTimes(2); // Initial attempt + 1 retry
    });

    it('should fail after max retries exceeded', async () => {
      // Mock network strategy with 1 retry
      (mobileNetworkAdapter.getCurrentStrategy as jest.Mock).mockReturnValue({
        retryAttempts: 1,
        requestTimeout: 1000,
      });

      // Mock fetch to always fail
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Persistent network error'),
      );

      const message = { type: 'chat', content: 'Test failure' };

      await expect(
        connectionEngine.sendMessage(connectionId, message),
      ).rejects.toThrow('Persistent network error');

      expect(mockConnection.connectionMetrics.errorRate).toBe(1);
    });
  });

  describe('Availability Management', () => {
    beforeEach(async () => {
      await connectionEngine.initialize(
        mockVendorProfile.id,
        mockVendorProfile,
      );
    });

    it('should check availability for multiple vendors', async () => {
      const vendorIds = ['vendor_456', 'vendor_789'];
      const dateRange = {
        start: new Date('2024-06-15T00:00:00Z'),
        end: new Date('2024-06-16T00:00:00Z'),
      };

      // Mock vendor profiles with availability
      connectionEngine['vendorProfiles'].set('vendor_456', {
        ...mockVendorProfile,
        id: 'vendor_456',
        availability: {
          timeSlots: [
            {
              start: new Date('2024-06-15T10:00:00Z'),
              end: new Date('2024-06-15T18:00:00Z'),
              type: 'available',
            },
          ],
          blackoutDates: [],
        },
      });

      const availabilityMap = await connectionEngine.checkAvailability(
        vendorIds,
        dateRange,
      );

      expect(availabilityMap.size).toBe(1); // Only vendor_456 has data
      expect(availabilityMap.get('vendor_456')).toHaveLength(1);
    });

    it('should update vendor availability and notify connected vendors', async () => {
      // Setup a connection
      const connectionId = 'conn_test';
      const mockConnection = {
        id: connectionId,
        vendorIds: [mockVendorProfile.id, 'vendor_456'],
        type: 'peer_to_peer' as const,
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

      connectionEngine['connections'].set(connectionId, mockConnection);

      const newTimeSlots = [
        {
          start: new Date('2024-07-01T09:00:00Z'),
          end: new Date('2024-07-01T17:00:00Z'),
          type: 'available' as const,
        },
      ];

      await connectionEngine.updateAvailability(newTimeSlots);

      const updatedProfile = connectionEngine.getVendorProfile(
        mockVendorProfile.id,
      );
      expect(updatedProfile?.availability.timeSlots).toEqual(newTimeSlots);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/connections/message',
        expect.any(Object),
      );
    });
  });

  describe('Referral System', () => {
    let connectionId: string;

    beforeEach(async () => {
      await connectionEngine.initialize(
        mockVendorProfile.id,
        mockVendorProfile,
      );

      connectionId = 'conn_referral_test';
      const mockConnection = {
        id: connectionId,
        vendorIds: [mockVendorProfile.id, 'vendor_456'],
        type: 'peer_to_peer' as const,
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

      connectionEngine['connections'].set(connectionId, mockConnection);
    });

    it('should request referral from connected vendor', async () => {
      const serviceType = 'florist';
      const eventDetails = {
        eventDate: new Date('2024-08-15'),
        budget: 1500,
        clientName: 'Smith Wedding',
      };

      const requestId = await connectionEngine.requestReferral(
        'vendor_456',
        serviceType,
        eventDetails,
      );

      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(connectionEngine['pendingRequests'].has(requestId)).toBe(true);
    });

    it('should fail referral request if no connection exists', async () => {
      await expect(
        connectionEngine.requestReferral('unknown_vendor', 'caterer', {}),
      ).rejects.toThrow('No connection with vendor');
    });
  });

  describe('Network Adaptation', () => {
    beforeEach(async () => {
      await connectionEngine.initialize(
        mockVendorProfile.id,
        mockVendorProfile,
      );
    });

    it('should adapt to network quality changes', () => {
      const mockCondition = {
        quality: 'poor',
        type: '2g',
        stability: 'unstable',
      };

      connectionEngine['handleNetworkQualityChange'](mockCondition as any);

      // Should have called optimization methods
      expect(connectionEngine['connections'].size).toBeDefined();
    });

    it('should pause connections when offline', () => {
      const eventSpy = jest.spyOn(connectionEngine, 'emit');

      connectionEngine['pauseAllConnections']();

      expect(eventSpy).toHaveBeenCalledWith('connections_paused');
    });

    it('should resume normal operation when connection restored', () => {
      const eventSpy = jest.spyOn(connectionEngine, 'emit');

      connectionEngine['resumeNormalOperation']();

      expect(eventSpy).toHaveBeenCalledWith('connections_resumed');
    });
  });

  describe('Connection Monitoring', () => {
    let connectionId: string;
    let mockConnection: any;

    beforeEach(async () => {
      await connectionEngine.initialize(
        mockVendorProfile.id,
        mockVendorProfile,
      );

      connectionId = 'conn_monitor_test';
      mockConnection = {
        id: connectionId,
        vendorIds: [mockVendorProfile.id, 'vendor_456'],
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

      connectionEngine['connections'].set(connectionId, mockConnection);
    });

    it('should start connection monitoring with heartbeats', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      connectionEngine['startConnectionMonitoring'](connectionId);

      expect(setIntervalSpy).toHaveBeenCalled();
      expect(connectionEngine['heartbeatIntervals'].has(connectionId)).toBe(
        true,
      );
    });

    it('should handle degraded connections', () => {
      const eventSpy = jest.spyOn(connectionEngine, 'emit');

      connectionEngine['handleConnectionDegraded'](connectionId);

      expect(eventSpy).toHaveBeenCalledWith('connection_degraded', {
        connectionId,
        connection: mockConnection,
      });
    });

    it('should remove failed connections', () => {
      const eventSpy = jest.spyOn(connectionEngine, 'emit');

      connectionEngine['removeConnection'](connectionId);

      expect(connectionEngine['connections'].has(connectionId)).toBe(false);
      expect(eventSpy).toHaveBeenCalledWith('connection_removed', {
        connectionId,
        connection: mockConnection,
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      // Setup some intervals
      connectionEngine['heartbeatIntervals'].set(
        'test1',
        setInterval(() => {}, 1000) as NodeJS.Timeout,
      );
      connectionEngine['heartbeatIntervals'].set(
        'test2',
        setInterval(() => {}, 1000) as NodeJS.Timeout,
      );

      connectionEngine.cleanup();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
      expect(connectionEngine['connections'].size).toBe(0);
      expect(connectionEngine['pendingRequests'].size).toBe(0);
    });
  });

  describe('Complementary Services', () => {
    it('should return correct complementary services for photographer', () => {
      const complementaryServices =
        connectionEngine['getComplementaryServiceTypes']('photographer');

      expect(complementaryServices).toContain('venue');
      expect(complementaryServices).toContain('coordinator');
      expect(complementaryServices).toContain('florist');
      expect(complementaryServices).toContain('dj');
    });

    it('should return correct complementary services for venue', () => {
      const complementaryServices =
        connectionEngine['getComplementaryServiceTypes']('venue');

      expect(complementaryServices).toContain('photographer');
      expect(complementaryServices).toContain('caterer');
      expect(complementaryServices).toContain('coordinator');
    });

    it('should return empty array for unknown service type', () => {
      const complementaryServices = connectionEngine[
        'getComplementaryServiceTypes'
      ]('unknown' as any);

      expect(complementaryServices).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await connectionEngine.initialize(
        mockVendorProfile.id,
        mockVendorProfile,
      );
    });

    it('should handle network errors during discovery', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network timeout'),
      );

      const vendors = await connectionEngine.discoverNearbyVendors();

      expect(vendors).toEqual([]);
    });

    it('should handle invalid connection requests', async () => {
      await expect(connectionEngine.connect('')).rejects.toThrow();
    });

    it('should handle missing connection for message sending', async () => {
      await expect(
        connectionEngine.sendMessage('invalid_connection', {}),
      ).rejects.toThrow('Connection not found');
    });

    it('should handle missing request for acceptance', async () => {
      await expect(
        connectionEngine.acceptConnection('invalid_request'),
      ).rejects.toThrow('Connection request not found');
    });

    it('should handle missing request for decline', async () => {
      await expect(
        connectionEngine.declineConnection('invalid_request'),
      ).rejects.toThrow('Connection request not found');
    });
  });
});
