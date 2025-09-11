import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { TaveBookingConnector } from '../../services/integrations/booking/TaveBookingConnector';
import type {
  TaveConnectorConfig,
  BookingSystemEvent,
  WeddingBookingData,
  BookingSyncResult,
} from '../../types/booking-integration-types';

// Mock TaveAPIClient
jest.mock('../../services/integrations/booking/TaveAPIClient');

const mockTaveAPIClient = {
  testConnection: jest.fn(),
  getJobs: jest.fn(),
  getJob: jest.fn(),
  createJob: jest.fn(),
  updateJob: jest.fn(),
  createSession: jest.fn(),
  updateSession: jest.fn(),
  getWorkflows: jest.fn(),
  triggerWorkflow: jest.fn(),
  getClients: jest.fn(),
  createClient: jest.fn(),
  updateClient: jest.fn(),
  checkAvailability: jest.fn(),
  createTimeBlock: jest.fn(),
  updateTimeBlock: jest.fn(),
};

describe('TaveBookingConnector', () => {
  let connector: TaveBookingConnector;
  let config: TaveConnectorConfig;

  beforeEach(() => {
    config = {
      platform: 'tave',
      enabled: true,
      secretKey: 'test-secret-key',
      studioId: 'test-studio-123',
      baseUrl: 'https://tave.com/api/v1',
      rateLimits: {
        requestsPerSecond: 2,
        burstCapacity: 10,
        dailyLimit: 5000,
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        baseDelay: 1000,
      },
      webhookEndpoint: 'https://wedsync.com/webhooks/tave',
      syncSettings: {
        enableBidirectionalSync: true,
        syncFrequency: 300000, // 5 minutes
        conflictResolution: 'wedsync_wins',
        enableRealTimeWebhooks: true,
      },
      fieldMappings: {
        weddingDateField: 'event_date',
        venueField: 'event_venue',
        budgetField: 'project_value',
        guestCountField: 'guest_count',
        notesField: 'project_notes',
        statusField: 'project_status',
      },
    };

    connector = new TaveBookingConnector(config);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Connection and Authentication', () => {
    it('should test connection successfully', async () => {
      mockTaveAPIClient.testConnection.mockResolvedValue(true);

      const isConnected = await connector.testConnection();

      expect(isConnected).toBe(true);
      expect(mockTaveAPIClient.testConnection).toHaveBeenCalled();
    });

    it('should handle connection failure', async () => {
      mockTaveAPIClient.testConnection.mockResolvedValue(false);

      const isConnected = await connector.testConnection();

      expect(isConnected).toBe(false);
    });

    it('should handle authentication errors', async () => {
      mockTaveAPIClient.testConnection.mockRejectedValue(
        new Error('Invalid secret key'),
      );

      const isConnected = await connector.testConnection();

      expect(isConnected).toBe(false);
    });
  });

  describe('Wedding Job Management', () => {
    it('should create wedding job with complete photography details', async () => {
      const weddingBooking: WeddingBookingData = {
        id: 'booking-123',
        weddingId: 'wedding-456',
        clientId: 'client-789',
        type: 'wedding_photography',
        status: 'confirmed',
        eventDate: '2024-06-15T14:00:00Z',
        venue: {
          name: 'Grand Hotel Ballroom',
          address: '123 Main St, City, State 12345',
          contactPerson: 'Venue Manager',
          contactPhone: '+1234567890',
        },
        packageDetails: {
          name: 'Premium Wedding Package',
          duration: 8,
          photographers: 2,
          includes: [
            'Ceremony coverage',
            'Reception coverage',
            'Engagement session',
            'Online gallery',
            'USB drive with high-res images',
          ],
          value: 8500,
        },
        timeline: [
          {
            time: '12:00:00',
            activity: 'Getting ready photos',
            location: 'Bridal suite',
            duration: 120,
            photographers: 1,
          },
          {
            time: '14:00:00',
            activity: 'Ceremony',
            location: 'Main chapel',
            duration: 60,
            photographers: 2,
          },
          {
            time: '15:30:00',
            activity: 'Cocktail hour & portraits',
            location: 'Garden area',
            duration: 90,
            photographers: 2,
          },
        ],
        specialRequests: [
          'Drone photography for venue shots',
          'Same-day slideshow for reception',
          'Backup photographer required',
        ],
        contractSigned: true,
        depositPaid: true,
        metadata: {
          source: 'wedsync_booking',
          priority: 'high',
          weddingSize: 'large',
        },
      };

      mockTaveAPIClient.createJob.mockResolvedValue({
        id: 'tave-job-123',
        job_number: 'WED-2024-0615',
        client_id: 'tave-client-456',
        event_date: '2024-06-15T14:00:00Z',
        project_value: 8500,
        status: 'booked',
      });

      const result = await connector.createBooking(weddingBooking);

      expect(result.success).toBe(true);
      expect(result.bookingSystemId).toBe('tave-job-123');
      expect(result.externalReference).toBe('WED-2024-0615');
      expect(mockTaveAPIClient.createJob).toHaveBeenCalledWith({
        client_id: expect.any(String),
        event_date: '2024-06-15T14:00:00Z',
        event_venue: 'Grand Hotel Ballroom',
        project_value: 8500,
        project_notes: expect.stringContaining('Premium Wedding Package'),
        project_status: 'booked',
        custom_fields: expect.objectContaining({
          venue_address: '123 Main St, City, State 12345',
          package_duration: '8',
          photographers_count: '2',
          special_requests: expect.stringContaining('Drone photography'),
        }),
      });
    });

    it('should update existing wedding job status', async () => {
      const bookingUpdate = {
        bookingSystemId: 'tave-job-123',
        status: 'in_progress',
        eventDate: '2024-06-15T14:00:00Z',
        packageDetails: {
          value: 9000, // Price increase
        },
        notes: 'Added extra hour of coverage',
      };

      mockTaveAPIClient.updateJob.mockResolvedValue({
        id: 'tave-job-123',
        project_value: 9000,
        project_status: 'in_progress',
        project_notes: 'Added extra hour of coverage',
      });

      const result = await connector.updateBooking(
        'tave-job-123',
        bookingUpdate,
      );

      expect(result.success).toBe(true);
      expect(mockTaveAPIClient.updateJob).toHaveBeenCalledWith('tave-job-123', {
        project_value: 9000,
        project_status: 'in_progress',
        project_notes: 'Added extra hour of coverage',
      });
    });

    it('should cancel wedding booking and update status', async () => {
      mockTaveAPIClient.updateJob.mockResolvedValue({
        id: 'tave-job-123',
        project_status: 'cancelled',
        cancellation_date: '2024-05-01',
        cancellation_reason: 'Client request',
      });

      const result = await connector.cancelBooking('tave-job-123', {
        reason: 'Client request',
        refundAmount: 1000,
        notes: 'Cancelled 45 days before wedding date',
      });

      expect(result.success).toBe(true);
      expect(mockTaveAPIClient.updateJob).toHaveBeenCalledWith('tave-job-123', {
        project_status: 'cancelled',
        cancellation_reason: 'Client request',
        project_notes: expect.stringContaining(
          'Cancelled 45 days before wedding date',
        ),
      });
    });
  });

  describe('Photography Session Management', () => {
    it('should create engagement session for wedding couple', async () => {
      const engagementSession = {
        weddingId: 'wedding-456',
        type: 'engagement',
        scheduledDate: '2024-04-15T10:00:00Z',
        duration: 90,
        location: {
          name: 'Downtown Park',
          address: '456 Park Ave, City, State',
          notes: 'Meet at the main entrance fountain',
        },
        photographer: 'Lead Photographer',
        specialRequests: [
          'Include pet dog in some shots',
          'Casual outdoor setting',
          'Golden hour lighting',
        ],
      };

      mockTaveAPIClient.createSession.mockResolvedValue({
        id: 'tave-session-789',
        job_id: 'tave-job-123',
        session_date: '2024-04-15T10:00:00Z',
        session_type: 'engagement',
        duration: 90,
        location: 'Downtown Park',
        status: 'scheduled',
      });

      const result = await connector.createSession(
        'tave-job-123',
        engagementSession,
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('tave-session-789');
      expect(mockTaveAPIClient.createSession).toHaveBeenCalledWith(
        'tave-job-123',
        {
          session_date: '2024-04-15T10:00:00Z',
          session_type: 'engagement',
          duration: 90,
          location: 'Downtown Park',
          location_address: '456 Park Ave, City, State',
          photographer: 'Lead Photographer',
          special_requests: expect.stringContaining('Include pet dog'),
          notes: 'Meet at the main entrance fountain',
        },
      );
    });

    it('should update session details and handle scheduling changes', async () => {
      const sessionUpdate = {
        sessionId: 'tave-session-789',
        scheduledDate: '2024-04-20T14:00:00Z', // Date changed
        location: {
          name: 'Beach Park',
          address: '789 Beach Rd, Coastal City',
          notes: 'Weather backup location',
        },
        notes: 'Moved due to weather forecast',
      };

      mockTaveAPIClient.updateSession.mockResolvedValue({
        id: 'tave-session-789',
        session_date: '2024-04-20T14:00:00Z',
        location: 'Beach Park',
        notes: 'Moved due to weather forecast',
        status: 'rescheduled',
      });

      const result = await connector.updateSession(
        'tave-session-789',
        sessionUpdate,
      );

      expect(result.success).toBe(true);
      expect(mockTaveAPIClient.updateSession).toHaveBeenCalledWith(
        'tave-session-789',
        {
          session_date: '2024-04-20T14:00:00Z',
          location: 'Beach Park',
          location_address: '789 Beach Rd, Coastal City',
          notes: 'Moved due to weather forecast',
        },
      );
    });
  });

  describe('Timeline and Milestone Management', () => {
    it('should create wedding timeline milestones in Tave', async () => {
      const weddingTimeline = [
        {
          id: 'milestone-1',
          name: 'Contract Signing',
          dueDate: '2024-03-01',
          status: 'completed',
          assignedTo: 'Studio Manager',
          notes: 'Contract signed, deposit received',
        },
        {
          id: 'milestone-2',
          name: 'Pre-wedding Consultation',
          dueDate: '2024-05-15',
          status: 'scheduled',
          assignedTo: 'Lead Photographer',
          notes: 'Discuss shot list and timeline',
        },
        {
          id: 'milestone-3',
          name: 'Engagement Session',
          dueDate: '2024-04-15',
          status: 'scheduled',
          assignedTo: 'Lead Photographer',
          notes: 'Location: Downtown Park',
        },
        {
          id: 'milestone-4',
          name: 'Wedding Day Photography',
          dueDate: '2024-06-15',
          status: 'scheduled',
          assignedTo: 'Lead + Assistant Photographer',
          notes: '8-hour coverage, 2 photographers',
        },
        {
          id: 'milestone-5',
          name: 'Photo Delivery',
          dueDate: '2024-07-15',
          status: 'pending',
          assignedTo: 'Post-Production Team',
          notes: 'Online gallery + USB delivery',
        },
      ];

      // Mock Tave workflow creation for each milestone
      mockTaveAPIClient.triggerWorkflow.mockResolvedValue({
        id: 'workflow-123',
        status: 'active',
        steps: weddingTimeline.length,
      });

      const result = await connector.createTimeline(
        'tave-job-123',
        weddingTimeline,
      );

      expect(result.success).toBe(true);
      expect(result.milestonesCreated).toBe(5);
      expect(mockTaveAPIClient.triggerWorkflow).toHaveBeenCalledWith(
        'tave-job-123',
        {
          workflow_name: 'Wedding Photography Workflow',
          milestones: expect.arrayContaining([
            expect.objectContaining({
              name: 'Contract Signing',
              due_date: '2024-03-01',
              status: 'completed',
            }),
            expect.objectContaining({
              name: 'Wedding Day Photography',
              due_date: '2024-06-15',
              status: 'scheduled',
            }),
          ]),
        },
      );
    });

    it('should update milestone status and trigger notifications', async () => {
      const milestoneUpdate = {
        milestoneId: 'milestone-2',
        status: 'completed',
        completedDate: '2024-05-15',
        notes: 'Consultation completed - shot list finalized',
        nextActions: ['Prepare equipment', 'Confirm timeline with couple'],
      };

      mockTaveAPIClient.triggerWorkflow.mockResolvedValue({
        id: 'workflow-update-456',
        milestone_id: 'milestone-2',
        status: 'completed',
        completed_date: '2024-05-15',
      });

      const result = await connector.updateMilestone(
        'tave-job-123',
        milestoneUpdate,
      );

      expect(result.success).toBe(true);
      expect(mockTaveAPIClient.triggerWorkflow).toHaveBeenCalledWith(
        'tave-job-123',
        {
          action: 'update_milestone',
          milestone_id: 'milestone-2',
          status: 'completed',
          completed_date: '2024-05-15',
          notes: 'Consultation completed - shot list finalized',
        },
      );
    });
  });

  describe('Availability and Scheduling', () => {
    it('should check photographer availability for wedding date', async () => {
      const availabilityRequest = {
        date: '2024-06-15',
        duration: 8,
        photographers: 2,
        timeRange: {
          start: '12:00',
          end: '22:00',
        },
      };

      mockTaveAPIClient.checkAvailability.mockResolvedValue({
        available: true,
        photographers: [
          {
            id: 'photographer-1',
            name: 'Lead Photographer',
            available: true,
            timeSlots: ['12:00-22:00'],
          },
          {
            id: 'photographer-2',
            name: 'Assistant Photographer',
            available: true,
            timeSlots: ['12:00-22:00'],
          },
        ],
        conflicts: [],
      });

      const result = await connector.checkAvailability(availabilityRequest);

      expect(result.available).toBe(true);
      expect(result.photographers).toHaveLength(2);
      expect(result.conflicts).toHaveLength(0);
      expect(mockTaveAPIClient.checkAvailability).toHaveBeenCalledWith({
        date: '2024-06-15',
        start_time: '12:00',
        end_time: '22:00',
        photographers_needed: 2,
      });
    });

    it('should handle scheduling conflicts and suggest alternatives', async () => {
      const availabilityRequest = {
        date: '2024-06-15',
        duration: 8,
        photographers: 2,
        timeRange: {
          start: '14:00',
          end: '22:00',
        },
      };

      mockTaveAPIClient.checkAvailability.mockResolvedValue({
        available: false,
        photographers: [
          {
            id: 'photographer-1',
            name: 'Lead Photographer',
            available: false,
            conflicts: [
              {
                event: 'Another wedding',
                timeSlot: '15:00-21:00',
              },
            ],
          },
        ],
        alternatives: [
          {
            date: '2024-06-16',
            photographers: 2,
            available: true,
          },
          {
            date: '2024-06-14',
            photographers: 2,
            available: true,
          },
        ],
      });

      const result = await connector.checkAvailability(availabilityRequest);

      expect(result.available).toBe(false);
      expect(result.conflicts).toBeDefined();
      expect(result.alternatives).toHaveLength(2);
      expect(result.alternatives[0].date).toBe('2024-06-16');
    });

    it('should block time for confirmed wedding booking', async () => {
      const timeBlock = {
        bookingId: 'tave-job-123',
        date: '2024-06-15',
        startTime: '12:00',
        endTime: '22:00',
        photographers: ['photographer-1', 'photographer-2'],
        type: 'wedding_photography',
        notes: 'Johnson Wedding - Grand Hotel',
      };

      mockTaveAPIClient.createTimeBlock.mockResolvedValue({
        id: 'timeblock-789',
        job_id: 'tave-job-123',
        date: '2024-06-15',
        start_time: '12:00',
        end_time: '22:00',
        photographers: ['photographer-1', 'photographer-2'],
        status: 'confirmed',
      });

      const result = await connector.blockTime(timeBlock);

      expect(result.success).toBe(true);
      expect(result.timeBlockId).toBe('timeblock-789');
      expect(mockTaveAPIClient.createTimeBlock).toHaveBeenCalledWith({
        job_id: 'tave-job-123',
        date: '2024-06-15',
        start_time: '12:00',
        end_time: '22:00',
        photographers: ['photographer-1', 'photographer-2'],
        event_type: 'wedding_photography',
        notes: 'Johnson Wedding - Grand Hotel',
      });
    });
  });

  describe('Client Management Integration', () => {
    it('should create wedding couple as Tave client', async () => {
      const weddingCouple = {
        primaryContact: {
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah@example.com',
          phone: '+1234567890',
        },
        partnerContact: {
          firstName: 'Mike',
          lastName: 'Johnson',
          email: 'mike@example.com',
          phone: '+1234567891',
        },
        weddingDate: '2024-06-15',
        venue: 'Grand Hotel',
        referralSource: 'Google Search',
        notes: 'Interested in premium package with drone photography',
      };

      mockTaveAPIClient.createClient.mockResolvedValue({
        id: 'tave-client-456',
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah@example.com',
        phone: '+1234567890',
        partner_name: 'Mike Johnson',
        partner_email: 'mike@example.com',
        event_date: '2024-06-15',
      });

      const result = await connector.createClient(weddingCouple);

      expect(result.success).toBe(true);
      expect(result.clientId).toBe('tave-client-456');
      expect(mockTaveAPIClient.createClient).toHaveBeenCalledWith({
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah@example.com',
        phone: '+1234567890',
        partner_name: 'Mike Johnson',
        partner_email: 'mike@example.com',
        event_date: '2024-06-15',
        event_venue: 'Grand Hotel',
        referral_source: 'Google Search',
        notes: 'Interested in premium package with drone photography',
      });
    });

    it('should update client information when wedding details change', async () => {
      const clientUpdate = {
        clientId: 'tave-client-456',
        weddingDate: '2024-06-20', // Date changed
        venue: 'Beach Resort', // Venue changed
        guestCount: 120,
        notes: 'Venue changed to outdoor beachfront ceremony',
      };

      mockTaveAPIClient.updateClient.mockResolvedValue({
        id: 'tave-client-456',
        event_date: '2024-06-20',
        event_venue: 'Beach Resort',
        guest_count: 120,
        notes: 'Venue changed to outdoor beachfront ceremony',
      });

      const result = await connector.updateClient(
        'tave-client-456',
        clientUpdate,
      );

      expect(result.success).toBe(true);
      expect(mockTaveAPIClient.updateClient).toHaveBeenCalledWith(
        'tave-client-456',
        {
          event_date: '2024-06-20',
          event_venue: 'Beach Resort',
          guest_count: 120,
          notes: 'Venue changed to outdoor beachfront ceremony',
        },
      );
    });
  });

  describe('Data Synchronization', () => {
    it('should perform bidirectional sync between WedSync and Tave', async () => {
      const weddingId = 'wedding-sync-123';

      // Mock Tave data retrieval
      mockTaveAPIClient.getJob.mockResolvedValue({
        id: 'tave-job-sync',
        event_date: '2024-06-20', // Date changed in Tave
        project_value: 9500, // Price changed in Tave
        project_status: 'in_progress', // Status changed in Tave
        last_modified: '2024-05-20T10:00:00Z',
      });

      const syncResult = await connector.syncBookingData(weddingId, {
        direction: 'bidirectional',
        conflictResolution: 'tave_wins',
      });

      expect(syncResult.success).toBe(true);
      expect(syncResult.conflictsResolved).toBeGreaterThan(0);
      expect(syncResult.updatedRecords.wedsync).toBeGreaterThan(0);
      expect(mockTaveAPIClient.getJob).toHaveBeenCalled();
    });

    it('should handle sync conflicts with configured resolution strategy', async () => {
      const conflictData = {
        bookingId: 'booking-conflict',
        wedSyncData: {
          eventDate: '2024-06-15',
          packageValue: 8500,
          lastUpdated: new Date('2024-05-15'),
        },
        taveData: {
          event_date: '2024-06-20',
          project_value: 9000,
          last_modified: '2024-05-10T10:00:00Z', // Older than WedSync
        },
      };

      const syncResult = await connector.resolveDataConflict(
        conflictData,
        'wedsync_wins',
      );

      expect(syncResult.resolution).toBe('wedsync_wins');
      expect(syncResult.finalData.eventDate).toBe('2024-06-15');
      expect(syncResult.finalData.packageValue).toBe(8500);
    });
  });

  describe('Webhook Processing', () => {
    it('should process Tave webhook for job status change', async () => {
      const webhookPayload = {
        event: 'job.status_changed',
        job_id: 'tave-job-123',
        old_status: 'booked',
        new_status: 'in_progress',
        timestamp: '2024-06-15T08:00:00Z',
        data: {
          job_number: 'WED-2024-0615',
          client_name: 'Johnson Wedding',
          event_date: '2024-06-15',
        },
      };

      const result = await connector.processWebhook(webhookPayload);

      expect(result.success).toBe(true);
      expect(result.event).toEqual({
        type: 'booking_status_changed',
        bookingId: 'tave-job-123',
        oldStatus: 'booked',
        newStatus: 'in_progress',
        timestamp: new Date('2024-06-15T08:00:00Z'),
        data: expect.objectContaining({
          jobNumber: 'WED-2024-0615',
          clientName: 'Johnson Wedding',
        }),
      });
    });

    it('should process Tave webhook for session completion', async () => {
      const webhookPayload = {
        event: 'session.completed',
        job_id: 'tave-job-123',
        session_id: 'tave-session-456',
        session_type: 'engagement',
        completion_date: '2024-04-15T16:00:00Z',
        data: {
          photos_count: 75,
          delivery_method: 'online_gallery',
          notes: 'Beautiful session at downtown park',
        },
      };

      const result = await connector.processWebhook(webhookPayload);

      expect(result.success).toBe(true);
      expect(result.event).toEqual({
        type: 'session_completed',
        bookingId: 'tave-job-123',
        sessionId: 'tave-session-456',
        sessionType: 'engagement',
        completionDate: new Date('2024-04-15T16:00:00Z'),
        data: expect.objectContaining({
          photosCount: 75,
          deliveryMethod: 'online_gallery',
        }),
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Tave API rate limiting gracefully', async () => {
      const weddingBooking: WeddingBookingData = {
        id: 'booking-rate-limit',
        weddingId: 'wedding-456',
        clientId: 'client-789',
        type: 'wedding_photography',
        status: 'confirmed',
        eventDate: '2024-06-15T14:00:00Z',
        venue: { name: 'Test Venue' },
        packageDetails: { value: 5000 },
      };

      // First call hits rate limit, second succeeds
      mockTaveAPIClient.createJob
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({
          id: 'tave-job-success',
          job_number: 'WED-SUCCESS',
          status: 'booked',
        });

      const result = await connector.createBooking(weddingBooking);

      expect(result.success).toBe(true);
      expect(result.bookingSystemId).toBe('tave-job-success');
      expect(mockTaveAPIClient.createJob).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in batch operations', async () => {
      const multipleBookings = [
        {
          id: 'booking-1',
          weddingId: 'wedding-1',
          clientId: 'client-1',
          type: 'wedding_photography',
          eventDate: '2024-06-01',
        },
        {
          id: 'booking-2',
          weddingId: 'wedding-2',
          clientId: 'client-2',
          type: 'wedding_photography',
          eventDate: '2024-06-02',
        },
      ];

      mockTaveAPIClient.createJob
        .mockResolvedValueOnce({ id: 'tave-job-1', status: 'booked' })
        .mockRejectedValueOnce(new Error('Invalid client data'));

      const results = await connector.batchCreateBookings(multipleBookings);

      expect(results.totalProcessed).toBe(2);
      expect(results.successCount).toBe(1);
      expect(results.errorCount).toBe(1);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0].bookingId).toBe('booking-2');
    });
  });

  describe('Analytics and Reporting', () => {
    it('should export booking analytics to external systems', async () => {
      const analyticsData = {
        weddingId: 'wedding-analytics-123',
        bookingConversionRate: 0.85,
        averageBookingValue: 7200,
        sessionCompletionRate: 0.95,
        clientSatisfactionScore: 4.9,
        timeToDelivery: 21, // days
        reschedulingRate: 0.15,
      };

      // Mock Tave custom fields update
      mockTaveAPIClient.updateJob.mockResolvedValue({
        id: 'tave-job-analytics',
        custom_fields: {
          conversion_rate: '0.85',
          average_value: '7200',
          satisfaction_score: '4.9',
        },
      });

      const result = await connector.exportBookingAnalytics(analyticsData);

      expect(result.success).toBe(true);
      expect(mockTaveAPIClient.updateJob).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          custom_fields: expect.objectContaining({
            conversion_rate: '0.85',
            average_value: '7200',
            satisfaction_score: '4.9',
          }),
        }),
      );
    });
  });

  describe('Configuration Management', () => {
    it('should validate configuration on initialization', () => {
      const invalidConfigs = [
        { ...config, secretKey: '' }, // Missing secret key
        { ...config, studioId: '' }, // Missing studio ID
        {
          ...config,
          rateLimits: { ...config.rateLimits, requestsPerSecond: 0 },
        }, // Invalid rate limit
      ];

      for (const invalidConfig of invalidConfigs) {
        expect(() => new TaveBookingConnector(invalidConfig)).toThrow();
      }
    });

    it('should return current configuration without sensitive data', () => {
      const currentConfig = connector.getConfig();

      expect(currentConfig.platform).toBe('tave');
      expect(currentConfig.enabled).toBe(true);
      expect(currentConfig.rateLimits).toBeDefined();
      expect(currentConfig.fieldMappings).toBeDefined();
      // Sensitive data should not be exposed
      expect(currentConfig.secretKey).toBeUndefined();
    });
  });
});
