/**
 * Unit Tests for GDPR Deletion Engine
 * WS-176 - GDPR Compliance System
 * 
 * Comprehensive test suite for automated GDPR erasure implementation,
 * deletion planning, and data anonymization.
 */

import { describe, it, expect, beforeEach, jest, afterEach } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { DeletionEngine } from '@/lib/gdpr/deletion-engine';
import { 
  DeletionType,
  DeletionStatus,
  DataDeletionRequest,
  SecurityContext 
} from '@/types/gdpr';
// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  match: vi.fn().mockReturnThis(),
  single: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}));
// Mock crypto module
vi.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
  randomBytes: jest.fn(() => ({ toString: () => 'mock-hex' })),
  createHash: jest.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash')
  }))
describe('DeletionEngine', () => {
  let deletionEngine: DeletionEngine;
  let mockSecurityContext: SecurityContext;
  let mockDeletionRequest: DataDeletionRequest;
  beforeEach(() => {
    vi.clearAllMocks();
    deletionEngine = new DeletionEngine();
    
    mockSecurityContext = {
      user_id: 'test-user-id',
      session_id: 'test-session-id',
      ip_address_hash: 'hashed-ip',
      user_agent_hash: 'hashed-user-agent',
      timestamp: new Date(),
      api_endpoint: '/api/gdpr/deletion',
      rate_limit_key: 'test-rate-limit-key'
    };
    mockDeletionRequest = {
      deletion_type: DeletionType.COMPLETE_ERASURE,
      data_categories: [],
      reason: 'User requested account deletion',
      verify_identity: true,
      immediate_deletion: false
  });
  afterEach(() => {
    vi.restoreAllMocks();
  describe('createDeletionPlan', () => {
    it('should create comprehensive deletion plan', async () => {
      // Mock data distribution analysis
      vi.spyOn(deletionEngine as any, 'analyzeUserDataDistribution').mockResolvedValue({
        'user_profiles': 1,
        'weddings': 2,
        'messages': 15,
        'payments': 5,
        'analytics_events': 100,
        'wedding_guests': 50,
        'supplier_communications': 10,
        'wedding_tasks': 25,
        'user_files': 30,
        'consent_records': 6,
        'gdpr_audit_logs': 20
      });
      // Mock plan storage
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { plan_id: 'mock-plan-id' },
        error: null
      const result = await deletionEngine.createDeletionPlan(
        mockDeletionRequest,
        mockSecurityContext
      );
      expect(result.success).toBe(true);
      expect(result.data?.plan_id).toBeDefined();
      expect(result.data?.tables_to_process).toBeDefined();
      expect(result.data?.retention_exceptions).toBeDefined();
      expect(result.data?.execution_order).toBeDefined();
      expect(result.data?.estimated_duration_minutes).toBeGreaterThan(0);
    });
    it('should handle tables with no data', async () => {
        'weddings': 0,
        'messages': 0,
        'payments': 0
      // Should only include tables with data
      expect(result.data?.tables_to_process.length).toBe(1);
    it('should identify retention exceptions', async () => {
        'gdpr_audit_logs': 10
      expect(result.data?.retention_exceptions.length).toBeGreaterThan(0);
      
      const retentionTable = result.data?.retention_exceptions.find(
        r => r.table_name === 'payments'
      expect(retentionTable).toBeDefined();
      expect(retentionTable?.retention_period_days).toBe(2555); // 7 years
    it('should handle immediate deletion override', async () => {
      const immediateDeletionRequest = {
        ...mockDeletionRequest,
        immediate_deletion: true
      };
        'messages': 10
        immediateDeletionRequest,
      // All strategies should be COMPLETE_ERASURE for immediate deletion
      result.data?.tables_to_process.forEach(table => {
        expect(table.deletion_strategy).toBe(DeletionType.COMPLETE_ERASURE);
    it('should calculate proper execution order based on dependencies', async () => {
        'messages': 10,
        'user_sessions': 5
      const executionOrder = result.data?.execution_order;
      // Dependencies should be processed before dependents
      const messagesIndex = executionOrder?.indexOf('messages');
      const userProfilesIndex = executionOrder?.indexOf('user_profiles');
      if (messagesIndex !== undefined && userProfilesIndex !== undefined) {
        expect(messagesIndex).toBeLessThan(userProfilesIndex);
      }
    it('should handle database errors during plan creation', async () => {
        'user_profiles': 1
        data: null,
        error: { message: 'Database error' }
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PLAN_CREATION_ERROR');
  describe('executeDeletionPlan', () => {
    it('should execute deletion plan successfully', async () => {
      const mockPlan = {
        plan_data: {
          user_id: 'test-user-id',
          plan_id: 'mock-plan-id',
          tables_to_process: [
            {
              table_name: 'messages',
              deletion_strategy: DeletionType.COMPLETE_ERASURE,
              conditions: "user_id = 'test-user-id'",
              estimated_records: 10
            },
              table_name: 'user_profiles',
              deletion_strategy: DeletionType.ANONYMIZATION,
              conditions: "id = 'test-user-id'",
              estimated_records: 1
            }
          ],
          execution_order: ['messages', 'user_profiles']
        }
      // Mock plan retrieval
        data: mockPlan,
      // Mock plan status updates
      mockSupabaseClient.update.mockResolvedValue({
        data: { status: 'executing' },
      // Mock table deletion executions
      vi.spyOn(deletionEngine as any, 'executeTableDeletion')
        .mockResolvedValueOnce({
          table_name: 'messages',
          records_deleted: 10,
          records_anonymized: 0,
          status: 'success'
        })
          table_name: 'user_profiles',
          records_deleted: 0,
          records_anonymized: 1,
        });
      // Mock result storage
        data: { execution_id: 'mock-execution-id' },
      const result = await deletionEngine.executeDeletionPlan(
        'mock-plan-id',
      expect(result.data?.status).toBe(DeletionStatus.COMPLETED);
      expect(result.data?.tables_processed).toHaveLength(2);
    it('should handle plan not found', async () => {
        error: { message: 'Plan not found' }
        'non-existent-plan',
      expect(result.error?.code).toBe('PLAN_NOT_FOUND');
    it('should handle partial failures', async () => {
            { table_name: 'messages', deletion_strategy: DeletionType.COMPLETE_ERASURE },
            { table_name: 'user_profiles', deletion_strategy: DeletionType.ANONYMIZATION }
      // Mock one success and one failure
          status: 'failed',
          error: 'Database constraint error'
      expect(result.data?.status).toBe(DeletionStatus.PARTIALLY_COMPLETED);
    it('should generate verification hash', async () => {
            { table_name: 'messages', deletion_strategy: DeletionType.COMPLETE_ERASURE }
          execution_order: ['messages']
      vi.spyOn(deletionEngine as any, 'executeTableDeletion').mockResolvedValue({
        table_name: 'messages',
        records_deleted: 10,
        records_anonymized: 0,
        status: 'success'
      expect(result.data?.verification_hash).toBeDefined();
      expect(result.data?.verification_hash).toBe('mock-hash');
  describe('executeTableDeletion', () => {
    it('should execute complete erasure', async () => {
      const tableConfig = {
        deletion_strategy: DeletionType.COMPLETE_ERASURE,
        conditions: "user_id = 'test-user-id'"
      mockSupabaseClient.delete.mockResolvedValueOnce({
        count: 15,
      const result = await (deletionEngine as unknown).executeTableDeletion(
        tableConfig,
        'test-user-id',
      expect(result.status).toBe('success');
      expect(result.records_deleted).toBe(15);
      expect(result.records_anonymized).toBe(0);
    it('should execute anonymization', async () => {
        table_name: 'user_profiles',
        deletion_strategy: DeletionType.ANONYMIZATION,
        conditions: "id = 'test-user-id'"
      mockSupabaseClient.update.mockResolvedValueOnce({
        count: 1,
      expect(result.records_deleted).toBe(0);
      expect(result.records_anonymized).toBe(1);
    it('should execute pseudonymization', async () => {
        table_name: 'analytics_events',
        deletion_strategy: DeletionType.PSEUDONYMIZATION,
        count: 50,
      expect(result.records_anonymized).toBe(50);
    it('should execute soft delete', async () => {
        table_name: 'user_files',
        deletion_strategy: DeletionType.SOFT_DELETE,
        count: 10,
      expect(result.records_deleted).toBe(10);
    it('should handle database errors during deletion', async () => {
        count: null,
        error: { message: 'Constraint violation' }
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Constraint violation');
  describe('analyzeUserDataDistribution', () => {
    it('should analyze data across all configured tables', async () => {
      // Mock various table counts
      mockSupabaseClient.select
        .mockResolvedValueOnce({ count: 1, error: null })  // user_profiles
        .mockResolvedValueOnce({ count: 2, error: null })  // weddings
        .mockResolvedValueOnce({ count: 15, error: null }) // messages
        .mockResolvedValueOnce({ count: 5, error: null })  // payments
        .mockResolvedValueOnce({ count: 100, error: null }) // analytics_events
        .mockResolvedValueOnce({ count: 50, error: null }) // wedding_guests
        .mockResolvedValueOnce({ count: 0, error: null }); // supplier_communications
      const result = await (deletionEngine as unknown).analyzeUserDataDistribution('test-user-id');
      expect(result).toBeDefined();
      expect(result['user_profiles']).toBe(1);
      expect(result['weddings']).toBe(2);
      expect(result['messages']).toBe(15);
      expect(result['supplier_communications']).toBe(0);
    it('should handle non-existent tables gracefully', async () => {
      mockSupabaseClient.select.mockRejectedValue(new Error('Table does not exist'));
      // Should return 0 for tables that don't exist or can't be accessed
      expect(Object.values(result).every(count => count >= 0)).toBe(true);
  describe('getDeletionPlanStatus', () => {
    it('should return plan status for valid plan', async () => {
        plan_id: 'test-plan-id',
        user_id: 'test-user-id',
        status: 'completed',
        created_at: new Date().toISOString(),
        execution_id: 'test-execution-id',
        completed_at: new Date().toISOString()
      const result = await deletionEngine.getDeletionPlanStatus(
        'test-plan-id',
        'test-user-id'
      expect(result.data?.status).toBe('completed');
      expect(result.data?.execution_id).toBe('test-execution-id');
    it('should return error for unauthorized access', async () => {
        error: { message: 'Not found' }
        'wrong-user-id'
  describe('Anonymization utilities', () => {
    it('should generate appropriate anonymized values', async () => {
      const nameValue = (deletionEngine as unknown).generateAnonymizedValue('name');
      const emailValue = (deletionEngine as unknown).generateAnonymizedValue('email');
      const phoneValue = (deletionEngine as unknown).generateAnonymizedValue('phone');
      const addressValue = (deletionEngine as unknown).generateAnonymizedValue('address');
      expect(nameValue).toContain('Anonymized User');
      expect(emailValue).toContain('@anonymized.local');
      expect(phoneValue).toMatch(/^\+1555/);
      expect(addressValue).toContain('Anonymized Address');
    it('should identify field types correctly', async () => {
      const nameType = (deletionEngine as unknown).getFieldType('full_name');
      const emailType = (deletionEngine as unknown).getFieldType('email_address');
      const phoneType = (deletionEngine as unknown).getFieldType('phone_number');
      const addressType = (deletionEngine as unknown).getFieldType('street_address');
      expect(nameType).toBe('name');
      expect(emailType).toBe('email');
      expect(phoneType).toBe('phone');
      expect(addressType).toBe('address');
  describe('Edge cases and error handling', () => {
    it('should handle empty execution plans', async () => {
      const emptyPlan = {
          tables_to_process: [],
          execution_order: []
        data: emptyPlan,
        'empty-plan-id',
      expect(result.data?.tables_processed).toHaveLength(0);
    it('should validate conditions parsing', async () => {
      const validConditions = "user_id = 'test-user-id'";
      const parsedConditions = (deletionEngine as unknown).parseConditions(validConditions);
      expect(parsedConditions).toEqual({ user_id: 'test-user-id' });
      const invalidConditions = "invalid condition format";
      const parsedInvalid = (deletionEngine as unknown).parseConditions(invalidConditions);
      expect(parsedInvalid).toEqual({});
    it('should estimate duration accurately', async () => {
      const tables = [
        { estimated_records: 1000 },
        { estimated_records: 500 },
        { estimated_records: 2000 }
      ];
      const duration = (deletionEngine as unknown).estimateExecutionDuration(tables);
      // Should estimate based on 1000 records per minute
      expect(duration).toBe(4); // 3500 records = 4 minutes (rounded up)
    it('should calculate execution order with complex dependencies', async () => {
        { table_name: 'A', dependencies: ['B', 'C'] },
        { table_name: 'B', dependencies: ['D'] },
        { table_name: 'C', dependencies: [] },
        { table_name: 'D', dependencies: [] }
      const order = (deletionEngine as unknown).calculateExecutionOrder(tables);
      expect(order).toContain('D');
      expect(order).toContain('B');
      expect(order).toContain('C');
      expect(order).toContain('A');
      // A should come after B and C
      expect(order.indexOf('A')).toBeGreaterThan(order.indexOf('B'));
      expect(order.indexOf('A')).toBeGreaterThan(order.indexOf('C'));
      // B should come after D
      expect(order.indexOf('B')).toBeGreaterThan(order.indexOf('D'));
  describe('Audit logging', () => {
    it('should log all deletion operations', async () => {
      let auditLogCount = 0;
      const originalInsert = mockSupabaseClient.insert;
      mockSupabaseClient.insert = vi.fn().mockImplementation((data) => {
        if (typeof data === 'object' && data.action) {
          auditLogCount++;
        return originalInsert.call(mockSupabaseClient, data);
      await deletionEngine.createDeletionPlan(
      expect(auditLogCount).toBeGreaterThan(0);
});
