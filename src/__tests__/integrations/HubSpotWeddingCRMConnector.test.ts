import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { HubSpotWeddingCRMConnector } from '../../services/integrations/crm/HubSpotWeddingCRMConnector';
import type {
  HubSpotConnectorConfig,
  WeddingCRMContact,
  WeddingCRMDeal,
  CRMSyncResult,
} from '../../types/crm-integration-types';

// Mock HubSpot API Client
jest.mock('@hubspot/api-client');

const mockHubSpotClient = {
  crm: {
    contacts: {
      basicApi: {
        create: jest.fn(),
        update: jest.fn(),
        getById: jest.fn(),
        getPage: jest.fn(),
      },
      searchApi: {
        doSearch: jest.fn(),
      },
    },
    deals: {
      basicApi: {
        create: jest.fn(),
        update: jest.fn(),
        getById: jest.fn(),
        getPage: jest.fn(),
      },
    },
    properties: {
      coreApi: {
        create: jest.fn(),
        getAll: jest.fn(),
      },
    },
  },
  oauth: {
    accessTokensApi: {
      get: jest.fn(),
    },
  },
};

describe('HubSpotWeddingCRMConnector', () => {
  let connector: HubSpotWeddingCRMConnector;
  let config: HubSpotConnectorConfig;

  beforeEach(() => {
    config = {
      platform: 'hubspot',
      enabled: true,
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      portalId: 'test-portal-id',
      rateLimits: {
        requestsPerSecond: 10,
        burstCapacity: 20,
        dailyLimit: 40000,
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        baseDelay: 1000,
      },
      customProperties: {
        weddingDateProperty: 'wedding_date',
        venueProperty: 'wedding_venue',
        budgetProperty: 'wedding_budget',
        guestCountProperty: 'guest_count',
        weddingStyleProperty: 'wedding_style',
        plannerProperty: 'wedding_planner',
        photographerProperty: 'wedding_photographer',
      },
      syncSettings: {
        enableBidirectionalSync: true,
        syncFrequency: 300000, // 5 minutes
        conflictResolution: 'wedsync_wins',
        enableRealTimeWebhooks: true,
      },
    };

    connector = new HubSpotWeddingCRMConnector(config);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Connection and Authentication', () => {
    it('should test connection successfully', async () => {
      mockHubSpotClient.oauth.accessTokensApi.get.mockResolvedValue({
        token: 'valid-token',
        user: 'test-user',
        scopes: ['contacts', 'deals'],
      });

      const isConnected = await connector.testConnection();

      expect(isConnected).toBe(true);
      expect(mockHubSpotClient.oauth.accessTokensApi.get).toHaveBeenCalledWith(
        'test-access-token',
      );
    });

    it('should handle connection failure', async () => {
      mockHubSpotClient.oauth.accessTokensApi.get.mockRejectedValue(
        new Error('Invalid token'),
      );

      const isConnected = await connector.testConnection();

      expect(isConnected).toBe(false);
    });

    it('should refresh access token when expired', async () => {
      // Implementation would depend on OAuth refresh flow
      // This test ensures the refresh mechanism works
      mockHubSpotClient.oauth.accessTokensApi.get
        .mockRejectedValueOnce(new Error('Token expired'))
        .mockResolvedValueOnce({
          token: 'new-valid-token',
          user: 'test-user',
          scopes: ['contacts', 'deals'],
        });

      const isConnected = await connector.testConnection();

      expect(isConnected).toBe(true);
    });
  });

  describe('Wedding Property Creation', () => {
    it('should create custom wedding properties in HubSpot', async () => {
      mockHubSpotClient.crm.properties.coreApi.create.mockResolvedValue({
        name: 'wedding_date',
        label: 'Wedding Date',
        type: 'date',
      });

      await connector.createHubSpotWeddingProperties();

      // Should create all wedding-specific properties
      expect(
        mockHubSpotClient.crm.properties.coreApi.create,
      ).toHaveBeenCalledWith(
        'contacts',
        expect.objectContaining({
          name: 'wedding_date',
          label: 'Wedding Date',
          type: 'date',
        }),
      );

      expect(
        mockHubSpotClient.crm.properties.coreApi.create,
      ).toHaveBeenCalledWith(
        'contacts',
        expect.objectContaining({
          name: 'wedding_venue',
          label: 'Wedding Venue',
          type: 'string',
        }),
      );

      expect(
        mockHubSpotClient.crm.properties.coreApi.create,
      ).toHaveBeenCalledWith(
        'contacts',
        expect.objectContaining({
          name: 'wedding_budget',
          label: 'Wedding Budget',
          type: 'number',
        }),
      );
    });
  });

  describe('Wedding Contact Management', () => {
    it('should create wedding contact with all wedding-specific data', async () => {
      const weddingContact: WeddingCRMContact = {
        id: 'contact-123',
        email: 'bride@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+1234567890',
        weddingDate: '2024-06-15',
        venue: 'Grand Hotel Ballroom',
        budget: 75000,
        guestCount: 150,
        weddingStyle: 'Classic Elegant',
        plannerName: 'Elite Wedding Planners',
        plannerEmail: 'planner@eliteweddings.com',
        photographerName: 'Amazing Photography Studio',
        photographerEmail: 'contact@amazingphoto.com',
        partnerName: 'John Doe',
        partnerEmail: 'groom@example.com',
        customFields: {
          reception_style: 'Seated Dinner',
          music_preference: 'Live Band',
          dietary_restrictions: 'Vegetarian options required',
        },
        source: 'WedSync Import',
        lastUpdated: new Date(),
        notes: 'High-value client, requires premium service',
      };

      mockHubSpotClient.crm.contacts.basicApi.create.mockResolvedValue({
        id: '12345',
        properties: {
          email: 'bride@example.com',
          firstname: 'Jane',
          lastname: 'Doe',
          wedding_date: '2024-06-15',
          wedding_venue: 'Grand Hotel Ballroom',
          wedding_budget: '75000',
        },
      });

      const result = await connector.createContact(weddingContact);

      expect(result.success).toBe(true);
      expect(result.crmId).toBe('12345');
      expect(
        mockHubSpotClient.crm.contacts.basicApi.create,
      ).toHaveBeenCalledWith({
        properties: expect.objectContaining({
          email: 'bride@example.com',
          firstname: 'Jane',
          lastname: 'Doe',
          phone: '+1234567890',
          wedding_date: '2024-06-15',
          wedding_venue: 'Grand Hotel Ballroom',
          wedding_budget: '75000',
          guest_count: '150',
          wedding_style: 'Classic Elegant',
          wedding_planner: 'Elite Wedding Planners',
          wedding_photographer: 'Amazing Photography Studio',
        }),
      });
    });

    it('should handle duplicate contact creation gracefully', async () => {
      const weddingContact: WeddingCRMContact = {
        id: 'contact-123',
        email: 'existing@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        weddingDate: '2024-07-20',
        venue: 'Beach Resort',
        budget: 50000,
        source: 'WedSync',
      };

      // Mock duplicate email error
      mockHubSpotClient.crm.contacts.basicApi.create.mockRejectedValue({
        category: 'VALIDATION_ERROR',
        message: 'Contact already exists with this email',
      });

      // Mock search to find existing contact
      mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValue({
        results: [
          {
            id: '67890',
            properties: {
              email: 'existing@example.com',
              firstname: 'Jane',
              lastname: 'Smith',
            },
          },
        ],
      });

      // Mock update call
      mockHubSpotClient.crm.contacts.basicApi.update.mockResolvedValue({
        id: '67890',
        properties: {
          email: 'existing@example.com',
          wedding_date: '2024-07-20',
          wedding_venue: 'Beach Resort',
        },
      });

      const result = await connector.createContact(weddingContact);

      expect(result.success).toBe(true);
      expect(result.crmId).toBe('67890');
      expect(result.action).toBe('updated');
      expect(mockHubSpotClient.crm.contacts.basicApi.update).toHaveBeenCalled();
    });
  });

  describe('Wedding Deal Management', () => {
    it('should create wedding deal with photography package details', async () => {
      const weddingDeal: WeddingCRMDeal = {
        id: 'deal-456',
        name: 'Johnson Wedding - Photography Package',
        stage: 'qualified',
        amount: 8500,
        currency: 'USD',
        closeDate: '2024-06-15',
        contactIds: ['contact-123'],
        weddingId: 'wedding-789',
        packageType: 'Premium Photography',
        serviceDetails: {
          hours: 8,
          photographers: 2,
          engagementSession: true,
          albumIncluded: true,
          deliveryTimeline: '4-6 weeks',
        },
        customFields: {
          shoot_locations: 'Ceremony, Reception, Portrait Session',
          special_requests: 'Drone photography, Same-day highlights',
          backup_photographer: 'Required',
        },
        probability: 85,
        source: 'WedSync Booking',
        lastUpdated: new Date(),
        notes: 'Couple specifically requested creative outdoor shots',
      };

      mockHubSpotClient.crm.deals.basicApi.create.mockResolvedValue({
        id: '54321',
        properties: {
          dealname: 'Johnson Wedding - Photography Package',
          dealstage: 'qualified',
          amount: '8500',
          closedate: '2024-06-15',
        },
      });

      const result = await connector.createDeal(weddingDeal);

      expect(result.success).toBe(true);
      expect(result.crmId).toBe('54321');
      expect(mockHubSpotClient.crm.deals.basicApi.create).toHaveBeenCalledWith({
        properties: expect.objectContaining({
          dealname: 'Johnson Wedding - Photography Package',
          dealstage: 'qualified',
          amount: '8500',
          closedate: '2024-06-15',
          wedding_id: 'wedding-789',
          package_type: 'Premium Photography',
          service_hours: '8',
          photographers_count: '2',
        }),
        associations: expect.arrayContaining([
          expect.objectContaining({
            to: { id: 'contact-123' },
            types: expect.arrayContaining([
              expect.objectContaining({
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: expect.any(Number),
              }),
            ]),
          }),
        ]),
      });
    });

    it('should update deal stage based on wedding booking status', async () => {
      const dealUpdate = {
        crmId: '54321',
        stage: 'contract_sent',
        amount: 9000,
        notes: 'Contract sent, awaiting signature',
      };

      mockHubSpotClient.crm.deals.basicApi.update.mockResolvedValue({
        id: '54321',
        properties: {
          dealstage: 'contract_sent',
          amount: '9000',
        },
      });

      const result = await connector.updateDeal('54321', dealUpdate);

      expect(result.success).toBe(true);
      expect(mockHubSpotClient.crm.deals.basicApi.update).toHaveBeenCalledWith(
        '54321',
        {
          properties: expect.objectContaining({
            dealstage: 'contract_sent',
            amount: '9000',
          }),
        },
      );
    });
  });

  describe('Wedding Timeline Integration', () => {
    it('should sync wedding milestones to HubSpot tasks/activities', async () => {
      const weddingId = 'wedding-123';
      const milestones = [
        {
          name: 'Engagement Session',
          date: '2024-05-15',
          status: 'scheduled',
          notes: 'Location: Central Park, Time: 10:00 AM',
        },
        {
          name: 'Final Venue Walkthrough',
          date: '2024-06-10',
          status: 'pending',
          notes: 'Meet with venue coordinator',
        },
        {
          name: 'Wedding Day Photography',
          date: '2024-06-15',
          status: 'scheduled',
          notes: 'Full day coverage, 2 photographers',
        },
      ];

      // Mock HubSpot task creation
      mockHubSpotClient.crm.objects = {
        tasks: {
          basicApi: {
            create: jest.fn().mockResolvedValue({
              id: 'task-123',
              properties: {
                hs_task_subject: 'Engagement Session',
                hs_task_body: 'Location: Central Park, Time: 10:00 AM',
                hs_timestamp: '2024-05-15',
              },
            }),
          },
        },
      };

      const result = await connector.syncWeddingMilestones(
        weddingId,
        milestones,
      );

      expect(result.success).toBe(true);
      expect(result.syncedItems).toBe(3);
      expect(
        mockHubSpotClient.crm.objects.tasks.basicApi.create,
      ).toHaveBeenCalledTimes(3);
    });
  });

  describe('Batch Operations', () => {
    it('should batch create multiple wedding contacts', async () => {
      const weddingContacts: WeddingCRMContact[] = [
        {
          id: 'contact-1',
          email: 'bride1@example.com',
          firstName: 'Alice',
          lastName: 'Johnson',
          weddingDate: '2024-06-15',
          venue: 'Grand Hotel',
          budget: 60000,
        },
        {
          id: 'contact-2',
          email: 'bride2@example.com',
          firstName: 'Sarah',
          lastName: 'Williams',
          weddingDate: '2024-07-20',
          venue: 'Beach Resort',
          budget: 45000,
        },
      ];

      mockHubSpotClient.crm.contacts.batchApi = {
        create: jest.fn().mockResolvedValue({
          status: 'COMPLETE',
          results: [
            { id: '111', properties: { email: 'bride1@example.com' } },
            { id: '222', properties: { email: 'bride2@example.com' } },
          ],
        }),
      };

      const results = await connector.batchCreateContacts(weddingContacts);

      expect(results.success).toBe(true);
      expect(results.processedCount).toBe(2);
      expect(results.successCount).toBe(2);
      expect(
        mockHubSpotClient.crm.contacts.batchApi.create,
      ).toHaveBeenCalledWith({
        inputs: expect.arrayContaining([
          expect.objectContaining({
            properties: expect.objectContaining({
              email: 'bride1@example.com',
              firstname: 'Alice',
              lastname: 'Johnson',
            }),
          }),
          expect.objectContaining({
            properties: expect.objectContaining({
              email: 'bride2@example.com',
              firstname: 'Sarah',
              lastname: 'Williams',
            }),
          }),
        ]),
      });
    });
  });

  describe('Wedding Data Synchronization', () => {
    it('should perform bidirectional sync between WedSync and HubSpot', async () => {
      const weddingId = 'wedding-sync-123';

      // Mock HubSpot data retrieval
      mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValue({
        results: [
          {
            id: '999',
            properties: {
              email: 'updated@example.com',
              wedding_date: '2024-06-20', // Date changed in HubSpot
              wedding_venue: 'New Venue Name', // Venue changed in HubSpot
              wedding_budget: '80000', // Budget increased in HubSpot
            },
          },
        ],
      });

      const syncResult = await connector.syncWeddingData(weddingId, {
        direction: 'bidirectional',
        conflictResolution: 'hubspot_wins', // HubSpot data takes precedence
      });

      expect(syncResult.success).toBe(true);
      expect(syncResult.conflictsResolved).toBeGreaterThan(0);
      expect(syncResult.updatedRecords.wedsync).toBeGreaterThan(0);
    });

    it('should handle sync conflicts with configured resolution strategy', async () => {
      const weddingId = 'wedding-conflict-123';

      // Simulate conflict: WedSync has newer data but HubSpot has different data
      const conflictData = {
        contactId: 'contact-conflict',
        wedSyncData: {
          weddingDate: '2024-06-15',
          venue: 'Original Venue',
          lastUpdated: new Date('2024-01-15'),
        },
        hubspotData: {
          wedding_date: '2024-06-20',
          wedding_venue: 'Changed Venue',
          lastmodifieddate: '2024-01-10', // Older than WedSync
        },
      };

      const syncResult = await connector.resolveDataConflict(
        conflictData,
        'wedsync_wins',
      );

      expect(syncResult.resolution).toBe('wedsync_wins');
      expect(syncResult.finalData.weddingDate).toBe('2024-06-15');
      expect(syncResult.finalData.venue).toBe('Original Venue');
    });
  });

  describe('Wedding Analytics Integration', () => {
    it('should export wedding analytics data to HubSpot custom objects', async () => {
      const analyticsData = {
        weddingId: 'wedding-analytics-123',
        bookingConversionRate: 0.75,
        averagePackageValue: 7500,
        clientSatisfactionScore: 4.8,
        referralRate: 0.35,
        timeToBooking: 14, // days
        communicationTouchpoints: 12,
      };

      mockHubSpotClient.crm.objects = {
        basicApi: {
          create: jest.fn().mockResolvedValue({
            id: 'analytics-obj-123',
            properties: analyticsData,
          }),
        },
      };

      const result = await connector.exportWeddingAnalytics(analyticsData);

      expect(result.success).toBe(true);
      expect(
        mockHubSpotClient.crm.objects.basicApi.create,
      ).toHaveBeenCalledWith('wedding_analytics', {
        properties: expect.objectContaining({
          wedding_id: 'wedding-analytics-123',
          booking_conversion_rate: '0.75',
          average_package_value: '7500',
          client_satisfaction_score: '4.8',
        }),
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle HubSpot API rate limiting gracefully', async () => {
      const weddingContact: WeddingCRMContact = {
        id: 'contact-rate-limit',
        email: 'ratelimit@example.com',
        firstName: 'Rate',
        lastName: 'Limit',
        weddingDate: '2024-08-15',
      };

      // First call hits rate limit, second succeeds
      mockHubSpotClient.crm.contacts.basicApi.create
        .mockRejectedValueOnce({
          status: 429,
          message: 'Rate limit exceeded',
        })
        .mockResolvedValueOnce({
          id: 'success-after-retry',
          properties: { email: 'ratelimit@example.com' },
        });

      const result = await connector.createContact(weddingContact);

      expect(result.success).toBe(true);
      expect(result.crmId).toBe('success-after-retry');
      expect(
        mockHubSpotClient.crm.contacts.basicApi.create,
      ).toHaveBeenCalledTimes(2);
    });

    it('should handle partial batch failures', async () => {
      const weddingContacts: WeddingCRMContact[] = [
        {
          id: '1',
          email: 'success@example.com',
          firstName: 'Success',
          lastName: 'Contact',
          weddingDate: '2024-06-01',
        },
        {
          id: '2',
          email: 'invalid-email',
          firstName: 'Invalid',
          lastName: 'Contact',
          weddingDate: '2024-06-01',
        }, // Invalid email
      ];

      mockHubSpotClient.crm.contacts.batchApi = {
        create: jest.fn().mockResolvedValue({
          status: 'COMPLETE',
          results: [
            { id: '111', properties: { email: 'success@example.com' } },
          ],
          errors: [
            {
              index: 1,
              error: { message: 'Invalid email format' },
            },
          ],
        }),
      };

      const results = await connector.batchCreateContacts(weddingContacts);

      expect(results.success).toBe(true); // Partial success
      expect(results.processedCount).toBe(2);
      expect(results.successCount).toBe(1);
      expect(results.errorCount).toBe(1);
      expect(results.errors).toHaveLength(1);
    });
  });

  describe('Configuration Management', () => {
    it('should validate configuration on initialization', () => {
      const invalidConfigs = [
        { ...config, clientId: '' }, // Missing client ID
        { ...config, accessToken: '' }, // Missing access token
        {
          ...config,
          rateLimits: { ...config.rateLimits, requestsPerSecond: 0 },
        }, // Invalid rate limit
      ];

      for (const invalidConfig of invalidConfigs) {
        expect(() => new HubSpotWeddingCRMConnector(invalidConfig)).toThrow();
      }
    });

    it('should return current configuration', () => {
      const currentConfig = connector.getConfig();

      expect(currentConfig.platform).toBe('hubspot');
      expect(currentConfig.enabled).toBe(true);
      expect(currentConfig.rateLimits).toBeDefined();
      expect(currentConfig.customProperties).toBeDefined();
      // Sensitive data should not be exposed
      expect(currentConfig.accessToken).toBeUndefined();
      expect(currentConfig.clientSecret).toBeUndefined();
    });
  });
});
