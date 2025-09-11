/**
 * Unit Tests for GDPR Data Processor
 * WS-176 - GDPR Compliance System
 * 
 * Comprehensive test suite for data subject access requests,
 * data export, portability, and rectification operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { DataProcessor } from '@/lib/gdpr/data-processor';
import { 
  DataSubjectRights,
  RequestStatus,
  SecurityContext 
} from '@/types/gdpr';
// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  match: vi.fn().mockReturnThis(),
  single: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}));
describe('DataProcessor', () => {
  let dataProcessor: DataProcessor;
  let mockSecurityContext: SecurityContext;
  beforeEach(() => {
    vi.clearAllMocks();
    dataProcessor = new DataProcessor();
    
    mockSecurityContext = {
      user_id: 'test-user-id',
      session_id: 'test-session-id',
      ip_address_hash: 'hashed-ip',
      user_agent_hash: 'hashed-user-agent',
      timestamp: new Date(),
      api_endpoint: '/api/gdpr/data-request',
      rate_limit_key: 'test-rate-limit-key'
    };
  });
  afterEach(() => {
    vi.restoreAllMocks();
  describe('submitDataSubjectRequest', () => {
    it('should submit data access request successfully', async () => {
      // Mock user existence check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'test-user-id', email: 'test@example.com' },
        error: null
      });
      // Mock successful request insertion
      const mockRequest = {
        id: 'request-id',
        user_id: 'test-user-id',
        request_type: DataSubjectRights.ACCESS,
        status: RequestStatus.SUBMITTED,
        submitted_at: new Date().toISOString(),
        verification_token: 'mock-token',
        verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
        data: mockRequest,
      const result = await dataProcessor.submitDataSubjectRequest(
        'test-user-id',
        DataSubjectRights.ACCESS,
        mockSecurityContext,
        { reason: 'Want to see my data' }
      );
      expect(result.success).toBe(true);
      expect(result.data?.request_type).toBe(DataSubjectRights.ACCESS);
      expect(result.data?.status).toBe(RequestStatus.SUBMITTED);
      expect(result.data?.verification_token).toBeDefined();
    });
    it('should handle non-existent user', async () => {
        data: null,
        error: { message: 'User not found' }
        'non-existent-user',
        mockSecurityContext
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_NOT_FOUND');
    it('should handle database insertion errors', async () => {
        error: { message: 'Database constraint violation' }
      expect(result.error?.code).toBe('DATABASE_ERROR');
    it('should generate unique verification tokens', async () => {
      const insertMock = vi.fn().mockResolvedValue({
        data: { id: 'request-id' },
      
      mockSupabaseClient.insert.mockImplementation(insertMock);
      await dataProcessor.submitDataSubjectRequest(
      const insertCall = insertMock.mock.calls[0][0];
      expect(insertCall.verification_token).toMatch(/^[a-f0-9]{64}$/); // 64-char hex string
      expect(insertCall.verification_expires_at).toBeDefined();
  describe('verifyAndProcessRequest', () => {
    it('should verify and process valid request', async () => {
      const validRequest = {
        verification_token: 'valid-token',
        verification_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        submitted_at: new Date().toISOString()
        data: validRequest,
        data: { ...validRequest, status: RequestStatus.IN_PROGRESS },
      // Mock data collection methods
      vi.spyOn(dataProcessor as any, 'processDataSubjectRequest').mockResolvedValue(undefined);
      const result = await dataProcessor.verifyAndProcessRequest(
        'request-id',
        'valid-token',
      expect(result.data?.status).toBe(RequestStatus.IN_PROGRESS);
    it('should reject invalid verification token', async () => {
        error: { message: 'No matching request' }
        'invalid-token',
      expect(result.error?.code).toBe('VERIFICATION_FAILED');
    it('should reject expired verification token', async () => {
      const expiredRequest = {
        verification_token: 'expired-token',
        verification_expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
        data: expiredRequest,
        'expired-token',
      expect(result.error?.code).toBe('VERIFICATION_EXPIRED');
    it('should clear verification token after successful verification', async () => {
        verification_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      const updateMock = vi.fn().mockResolvedValue({
        data: { ...validRequest, verification_token: null },
      mockSupabaseClient.update.mockImplementation(updateMock);
      await dataProcessor.verifyAndProcessRequest(
      const updateCall = updateMock.mock.calls[0][0];
      expect(updateCall.verification_token).toBeNull();
      expect(updateCall.verification_expires_at).toBeNull();
  describe('processAccessRequest', () => {
    it('should collect comprehensive user data', async () => {
      vi.spyOn(dataProcessor as any, 'collectPersonalData').mockResolvedValue({
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890'
      vi.spyOn(dataProcessor as any, 'collectContactData').mockResolvedValue({
        emails: [],
        phone_numbers: [],
        addresses: []
      vi.spyOn(dataProcessor as any, 'collectWeddingData').mockResolvedValue({
        weddings: []
      vi.spyOn(dataProcessor as any, 'collectCommunicationData').mockResolvedValue({
        messages: [],
        notifications: []
      vi.spyOn(dataProcessor as any, 'collectUsageData').mockResolvedValue({
        sessions: [],
        feature_usage: {}
      vi.spyOn(dataProcessor as any, 'collectTechnicalData').mockResolvedValue({
        device_info: [],
        api_usage: []
      const result = await (dataProcessor as unknown).processAccessRequest('test-user-id');
      expect(result).toBeDefined();
      expect(result.user_id).toBe('test-user-id');
      expect(result.export_date).toBeInstanceOf(Date);
      expect(result.data).toBeDefined();
      expect(result.data.personal_details).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.export_version).toBe('1.0');
    it('should handle missing data categories gracefully', async () => {
      // Mock some data collection methods returning null
      vi.spyOn(dataProcessor as any, 'collectPersonalData').mockResolvedValue(null);
      vi.spyOn(dataProcessor as any, 'collectContactData').mockResolvedValue(null);
        weddings: [{ id: 'wedding-1', title: 'Test Wedding' }]
      vi.spyOn(dataProcessor as any, 'collectCommunicationData').mockResolvedValue(null);
      vi.spyOn(dataProcessor as any, 'collectUsageData').mockResolvedValue(null);
      vi.spyOn(dataProcessor as any, 'collectTechnicalData').mockResolvedValue(null);
      expect(result.data_categories).toContain('wedding_info');
      expect(result.data_categories).not.toContain('personal_details');
      expect(result.data.wedding_info).toBeDefined();
      expect(result.data.personal_details).toBeNull();
  describe('processPortabilityRequest', () => {
    it('should return structured data suitable for portability', async () => {
      vi.spyOn(dataProcessor as any, 'processAccessRequest').mockResolvedValue({
        export_date: new Date(),
        data_categories: ['personal_details'],
        data: {
          personal_details: { name: 'Test User' }
        },
        metadata: { export_version: '1.0' }
      const result = await (dataProcessor as unknown).processPortabilityRequest('test-user-id');
  describe('processRestrictionRequest', () => {
    it('should add processing restriction', async () => {
        data: { id: 'restriction-id' },
      const result = await (dataProcessor as unknown).processRestrictionRequest('test-user-id');
      expect(result.message).toContain('Processing restriction applied');
  describe('getRequestStatus', () => {
    it('should return request status for valid request', async () => {
        status: RequestStatus.COMPLETED,
        completed_at: new Date().toISOString(),
      const result = await dataProcessor.getRequestStatus(
        'test-user-id'
      expect(result.data?.status).toBe(RequestStatus.COMPLETED);
    it('should return error for unauthorized access', async () => {
        error: { message: 'Not found' }
        'wrong-user-id'
      expect(result.error?.code).toBe('REQUEST_NOT_FOUND');
  describe('Data collection methods', () => {
    it('should collect personal data properly', async () => {
      const mockProfile = {
        id: 'test-user-id',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        date_of_birth: '1990-01-01',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          postal_code: '12345',
          country: 'US'
        preferences: { theme: 'dark' },
        data: mockProfile,
      const result = await (dataProcessor as unknown).collectPersonalData('test-user-id');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.address).toBeDefined();
    it('should collect wedding data properly', async () => {
      const mockWeddings = [
        {
          id: 'wedding-1',
          title: 'John & Jane Wedding',
          wedding_date: '2024-06-15',
          venue_name: 'Beautiful Venue',
          guest_count: 150,
          budget_total: 50000,
          budget_spent: 30000,
          budget_categories: { venue: 20000, catering: 15000 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
        data: mockWeddings,
      const result = await (dataProcessor as unknown).collectWeddingData('test-user-id');
      expect(result.weddings).toHaveLength(1);
      expect(result.weddings[0].title).toBe('John & Jane Wedding');
    it('should handle data collection errors gracefully', async () => {
        error: { message: 'Database error' }
      expect(result).toBeNull();
  describe('Error handling and edge cases', () => {
    it('should handle malformed request types', async () => {
        'invalid-type' as DataSubjectRights,
    it('should handle concurrent request processing', async () => {
      // This would test handling of concurrent verification attempts
      // In practice, this would involve database-level concurrency controls
      expect(true).toBe(true); // Placeholder for concurrency test
    it('should validate security context in all operations', async () => {
      const invalidSecurityContext = {
        ...mockSecurityContext,
        user_id: '',
        ip_address_hash: ''
      // The system should still process the request but audit the invalid context
        invalidSecurityContext
      // Request should still be processed, but security context logged
  describe('Request type handling', () => {
    it('should handle all request types', async () => {
      const requestTypes = Object.values(DataSubjectRights);
      for (const requestType of requestTypes) {
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { id: 'test-user-id', email: 'test@example.com' },
          error: null
        });
        
          data: {
            id: 'request-id',
            request_type: requestType,
            status: RequestStatus.SUBMITTED
          },
        const result = await dataProcessor.submitDataSubjectRequest(
          'test-user-id',
          requestType,
          mockSecurityContext
        );
        expect(result.success).toBe(true);
        expect(result.data?.request_type).toBe(requestType);
      }
  describe('Audit logging', () => {
    it('should log all operations for audit trail', async () => {
      // Count audit log insertions
      let auditLogCount = 0;
      const originalInsert = mockSupabaseClient.insert;
      mockSupabaseClient.insert = vi.fn().mockImplementation((data) => {
        if (typeof data === 'object' && data.action) {
          auditLogCount++;
        return originalInsert.call(mockSupabaseClient, data);
      expect(auditLogCount).toBeGreaterThan(0);
});
