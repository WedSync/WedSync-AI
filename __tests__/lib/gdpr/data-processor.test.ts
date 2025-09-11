/**
 * GDPR Data Processor Unit Tests
 * WS-176 - GDPR Compliance System
 * 
 * Comprehensive test suite for data subject request processing
 * Testing access, portability, rectification, and other GDPR rights
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DataProcessor } from '@/lib/gdpr/data-processor';
import {
  DataSubjectRights,
  RequestStatus,
  SecurityContext,
  DataCategory
} from '@/types/gdpr';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  upsert: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  order: jest.fn(() => mockSupabaseClient),
  limit: jest.fn(() => mockSupabaseClient)
};

// Mock createClient
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}));

describe('DataProcessor', () => {
  let dataProcessor: DataProcessor;
  let mockSecurityContext: SecurityContext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    dataProcessor = new DataProcessor();
    
    mockSecurityContext = {
      user_id: 'test-user-123',
      session_id: 'test-session-123',
      ip_address_hash: 'hashed-ip',
      user_agent_hash: 'hashed-agent',
      timestamp: new Date('2025-08-29T10:00:00Z'),
      api_endpoint: '/api/gdpr/data-request',
      rate_limit_key: 'test-key'
    };
  });

  describe('submitDataSubjectRequest', () => {
    it('should successfully submit data access request', async () => {
      // Mock user exists
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'test-user-123', email: 'test@example.com' },
        error: null
      });

      // Mock successful request insert
      const mockRequest = {
        id: 'request-123',
        user_id: 'test-user-123',
        request_type: DataSubjectRights.ACCESS,
        status: RequestStatus.SUBMITTED,
        submitted_at: '2025-08-29T10:00:00Z',
        verification_token: 'verification-token-123',
        verification_expires_at: '2025-08-30T10:00:00Z',
        created_at: '2025-08-29T10:00:00Z',
        updated_at: '2025-08-29T10:00:00Z'
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockRequest,
        error: null
      });

      const result = await dataProcessor.submitDataSubjectRequest(
        'test-user-123',
        DataSubjectRights.ACCESS,
        mockSecurityContext,
        { export_format: 'json' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.request_type).toBe(DataSubjectRights.ACCESS);
      expect(result.data?.status).toBe(RequestStatus.SUBMITTED);
      
      // Verify database calls
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('data_subject_requests');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          request_type: DataSubjectRights.ACCESS,
          status: RequestStatus.SUBMITTED
        })
      );
    });

    it('should handle user not found error', async () => {
      // Mock user not found
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: new Error('User not found')
      });

      const result = await dataProcessor.submitDataSubjectRequest(
        'nonexistent-user',
        DataSubjectRights.ACCESS,
        mockSecurityContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_NOT_FOUND');
    });

    it('should submit erasure request successfully', async () => {
      // Mock user exists
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'test-user-123', email: 'test@example.com' },
        error: null
      });

      const mockRequest = {
        id: 'request-456',
        user_id: 'test-user-123',
        request_type: DataSubjectRights.ERASURE,
        status: RequestStatus.SUBMITTED,
        submitted_at: '2025-08-29T10:00:00Z',
        verification_token: 'verification-token-456',
        verification_expires_at: '2025-08-30T10:00:00Z',
        created_at: '2025-08-29T10:00:00Z',
        updated_at: '2025-08-29T10:00:00Z'
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockRequest,
        error: null
      });

      const result = await dataProcessor.submitDataSubjectRequest(
        'test-user-123',
        DataSubjectRights.ERASURE,
        mockSecurityContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.request_type).toBe(DataSubjectRights.ERASURE);
    });

    it('should handle database insert errors', async () => {
      // Mock user exists
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'test-user-123', email: 'test@example.com' },
        error: null
      });

      // Mock database error
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Database constraint violation')
      });

      const result = await dataProcessor.submitDataSubjectRequest(
        'test-user-123',
        DataSubjectRights.ACCESS,
        mockSecurityContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DATABASE_ERROR');
    });
  });

  describe('verifyAndProcessRequest', () => {
    it('should successfully verify and process request', async () => {
      // Mock valid request with verification token
      const mockRequest = {
        id: 'request-123',
        user_id: 'test-user-123',
        request_type: DataSubjectRights.ACCESS,
        status: RequestStatus.SUBMITTED,
        verification_token: 'valid-token',
        verification_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour future
        submitted_at: '2025-08-29T10:00:00Z'
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockRequest,
        error: null
      });

      // Mock successful status update
      const updatedRequest = {
        ...mockRequest,
        status: RequestStatus.IN_PROGRESS,
        processed_at: '2025-08-29T10:05:00Z',
        verification_token: null,
        verification_expires_at: null
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: updatedRequest,
        error: null
      });

      // Mock processDataSubjectRequest (private method)
      const dataProcessorSpy = jest.spyOn(dataProcessor as any, 'processDataSubjectRequest');
      dataProcessorSpy.mockResolvedValueOnce(undefined);

      const result = await dataProcessor.verifyAndProcessRequest(
        'request-123',
        'valid-token',
        mockSecurityContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(RequestStatus.IN_PROGRESS);
      
      // Verify update call
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: RequestStatus.IN_PROGRESS,
        verification_token: null,
        verification_expires_at: null,
        processed_at: expect.any(String)
      });

      dataProcessorSpy.mockRestore();
    });

    it('should handle invalid verification token', async () => {
      // Mock request not found with token
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await dataProcessor.verifyAndProcessRequest(
        'request-123',
        'invalid-token',
        mockSecurityContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VERIFICATION_FAILED');
    });

    it('should handle expired verification token', async () => {
      // Mock request with expired token
      const mockRequest = {
        id: 'request-123',
        user_id: 'test-user-123',
        verification_token: 'expired-token',
        verification_expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockRequest,
        error: null
      });

      const result = await dataProcessor.verifyAndProcessRequest(
        'request-123',
        'expired-token',
        mockSecurityContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VERIFICATION_EXPIRED');
    });
  });

  describe('getRequestStatus', () => {
    it('should return request status for authorized user', async () => {
      const mockRequest = {
        id: 'request-123',
        user_id: 'test-user-123',
        request_type: DataSubjectRights.ACCESS,
        status: RequestStatus.COMPLETED,
        submitted_at: '2025-08-29T10:00:00Z',
        processed_at: '2025-08-29T10:05:00Z',
        completed_at: '2025-08-29T10:30:00Z',
        created_at: '2025-08-29T10:00:00Z',
        updated_at: '2025-08-29T10:30:00Z'
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockRequest,
        error: null
      });

      const result = await dataProcessor.getRequestStatus(
        'request-123',
        'test-user-123'
      );

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('request-123');
      expect(result.data?.status).toBe(RequestStatus.COMPLETED);
      expect(result.data?.request_type).toBe(DataSubjectRights.ACCESS);
    });

    it('should handle request not found', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await dataProcessor.getRequestStatus(
        'nonexistent-request',
        'test-user-123'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REQUEST_NOT_FOUND');
    });

    it('should prevent access to other users requests', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await dataProcessor.getRequestStatus(
        'request-123',
        'different-user-456'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REQUEST_NOT_FOUND');
    });
  });

  describe('processAccessRequest', () => {
    it('should compile comprehensive user data export', async () => {
      // Mock collectPersonalData
      const mockPersonalData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-08-29T10:00:00Z',
        preferences: { theme: 'dark' }
      };

      // Mock collectWeddingData
      const mockWeddingData = {
        weddings: [
          {
            id: 'wedding-123',
            title: 'John & Jane Wedding',
            date: '2025-12-25',
            venue: 'Grand Hotel',
            guest_count: 150,
            suppliers: [],
            tasks: [],
            budget: { total: 50000, spent: 25000, categories: {} },
            created_at: '2025-08-01T00:00:00Z',
            updated_at: '2025-08-29T10:00:00Z'
          }
        ]
      };

      // Spy on private methods
      const collectPersonalDataSpy = jest.spyOn(dataProcessor as any, 'collectPersonalData');
      const collectContactDataSpy = jest.spyOn(dataProcessor as any, 'collectContactData');
      const collectWeddingDataSpy = jest.spyOn(dataProcessor as any, 'collectWeddingData');
      const collectCommunicationDataSpy = jest.spyOn(dataProcessor as any, 'collectCommunicationData');
      const collectUsageDataSpy = jest.spyOn(dataProcessor as any, 'collectUsageData');
      const collectTechnicalDataSpy = jest.spyOn(dataProcessor as any, 'collectTechnicalData');

      collectPersonalDataSpy.mockResolvedValueOnce(mockPersonalData);
      collectContactDataSpy.mockResolvedValueOnce({ emails: [], phone_numbers: [], addresses: [] });
      collectWeddingDataSpy.mockResolvedValueOnce(mockWeddingData);
      collectCommunicationDataSpy.mockResolvedValueOnce({ messages: [], notifications: [] });
      collectUsageDataSpy.mockResolvedValueOnce({ sessions: [], feature_usage: {} });
      collectTechnicalDataSpy.mockResolvedValueOnce({ device_info: [], api_usage: [] });

      // Test the private method via reflection
      const result = await (dataProcessor as any).processAccessRequest('test-user-123');

      expect(result).toBeDefined();
      expect(result.user_id).toBe('test-user-123');
      expect(result.data.personal_details).toEqual(mockPersonalData);
      expect(result.data.wedding_info).toEqual(mockWeddingData);
      expect(result.data_categories).toContain('personal_details' as DataCategory);
      expect(result.data_categories).toContain('wedding_info' as DataCategory);
      expect(result.metadata.total_records).toBeGreaterThan(0);

      // Restore spies
      [
        collectPersonalDataSpy,
        collectContactDataSpy,
        collectWeddingDataSpy,
        collectCommunicationDataSpy,
        collectUsageDataSpy,
        collectTechnicalDataSpy
      ].forEach(spy => spy.mockRestore());
    });
  });

  describe('collectPersonalData', () => {
    it('should collect personal data from user profile', async () => {
      const mockProfile = {
        id: 'test-user-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        date_of_birth: '1990-01-01',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          postal_code: '12345',
          country: 'US'
        },
        preferences: { theme: 'dark', notifications: true },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-08-29T10:00:00Z'
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null
      });

      const result = await (dataProcessor as any).collectPersonalData('test-user-123');

      expect(result).toBeDefined();
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.address).toEqual(mockProfile.address);
      expect(result.preferences).toEqual(mockProfile.preferences);
      
      // Verify database call
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'test-user-123');
    });

    it('should return null when user profile not found', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await (dataProcessor as any).collectPersonalData('nonexistent-user');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Database connection error')
      });

      const result = await (dataProcessor as any).collectPersonalData('test-user-123');

      expect(result).toBeNull();
    });
  });

  describe('collectWeddingData', () => {
    it('should collect wedding data from weddings table', async () => {
      const mockWeddings = [
        {
          id: 'wedding-123',
          title: 'John & Jane Wedding',
          wedding_date: '2025-12-25',
          venue_name: 'Grand Hotel',
          guest_count: 150,
          budget_total: 50000,
          budget_spent: 25000,
          budget_categories: { venue: 20000, catering: 15000 },
          created_at: '2025-08-01T00:00:00Z',
          updated_at: '2025-08-29T10:00:00Z'
        }
      ];

      // First call returns the weddings
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockWeddings,
        error: null
      });

      const result = await (dataProcessor as any).collectWeddingData('test-user-123');

      expect(result).toBeDefined();
      expect(result.weddings).toHaveLength(1);
      expect(result.weddings[0].id).toBe('wedding-123');
      expect(result.weddings[0].title).toBe('John & Jane Wedding');
      expect(result.weddings[0].budget.total).toBe(50000);
      expect(result.weddings[0].budget.spent).toBe(25000);
    });

    it('should return null when no weddings found', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await (dataProcessor as any).collectWeddingData('test-user-123');

      expect(result).toBeNull();
    });
  });

  describe('processRestrictionRequest', () => {
    it('should add user to processing restriction list', async () => {
      mockSupabaseClient.upsert.mockReturnValue(mockSupabaseClient);

      const result = await (dataProcessor as any).processRestrictionRequest('test-user-123');

      expect(result).toBeDefined();
      expect(result.message).toContain('Processing restriction applied');
      expect(result.scope).toBe('All non-essential processing restricted');
      
      // Verify upsert call
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('processing_restrictions');
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith({
        user_id: 'test-user-123',
        restricted_at: expect.any(String),
        restriction_reason: 'User requested processing restriction',
        active: true
      });
    });
  });

  describe('countTotalRecords', () => {
    it('should count records in nested data structure', () => {
      const testData = {
        personal_details: { name: 'John', email: 'john@test.com' },
        weddings: [
          { id: '1', title: 'Wedding 1' },
          { id: '2', title: 'Wedding 2' }
        ],
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' }
        }
      };

      const count = (dataProcessor as any).countTotalRecords(testData);

      expect(count).toBeGreaterThan(0);
      // Should count arrays and their elements
      expect(count).toBe(2); // Two weddings array
    });

    it('should handle empty data structure', () => {
      const emptyData = {};
      const count = (dataProcessor as any).countTotalRecords(emptyData);
      expect(count).toBe(0);
    });
  });
});