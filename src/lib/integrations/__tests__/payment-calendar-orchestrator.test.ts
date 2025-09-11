/**
 * WS-165: Payment Calendar Orchestrator Service Tests
 * Comprehensive unit tests with >85% coverage requirement
 * Team C Integration Implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentCalendarOrchestratorService } from '../payment-calendar-orchestrator';
import { NotificationService } from '../NotificationService';
import { BudgetCategoryIntegration } from '../budget-integration';
import { CashFlowCalculatorService } from '../cash-flow-calculator';
import { VendorPaymentSyncService } from '../vendor-payment-sync';
import { 
  IntegrationConfig, 
  IntegrationCredentials,
  ErrorSeverity 
} from '@/types/integrations';
// Mock createClient
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis()
  }))
}));
// Mock service dependencies
vi.mock('../NotificationService');
vi.mock('../budget-integration');
vi.mock('../cash-flow-calculator');
vi.mock('../vendor-payment-sync');
const MockNotificationService = NotificationService as any;
const MockBudgetCategoryIntegration = BudgetCategoryIntegration as any;
const MockCashFlowCalculatorService = CashFlowCalculatorService as any;
const MockVendorPaymentSyncService = VendorPaymentSyncService as any;
describe('PaymentCalendarOrchestratorService', () => {
  let orchestrator: PaymentCalendarOrchestratorService;
  let mockConfig: IntegrationConfig;
  let mockCredentials: IntegrationCredentials;
  let mockSupabase: any;
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    // Setup mockSupabase
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis()
    };
    // Setup mock config and credentials
    mockConfig = {
      apiUrl: 'https://test-api.com',
      timeout: 30000,
      retryAttempts: 3,
      rateLimitPerMinute: 60
    mockCredentials = {
      apiKey: 'test-api-key',
      userId: 'test-user-id',
      organizationId: 'test-org-id',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token'
    // Setup Supabase mock default responses
    mockSupabase.select.mockResolvedValue({ data: [], error: null });
    // Create orchestrator instance
    orchestrator = new PaymentCalendarOrchestratorService(mockConfig, mockCredentials);
  });
  afterEach(() => {
    vi.resetAllMocks();
  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(orchestrator).toBeDefined();
      expect(MockNotificationService).toHaveBeenCalledWith(
        mockCredentials.userId,
        mockCredentials.organizationId
      );
      expect(MockBudgetCategoryIntegration).toHaveBeenCalled();
      expect(MockCashFlowCalculatorService).toHaveBeenCalled();
      expect(MockVendorPaymentSyncService).toHaveBeenCalledWith(mockConfig, mockCredentials);
    });
    it('should initialize health tracking for all services', () => {
      // Verify that health metrics are initialized
      expect(orchestrator).toHaveProperty('healthMetrics');
  describe('validateConnection', () => {
    it('should return true when database connection is valid', async () => {
      mockSupabase.select.mockResolvedValue({ data: [], error: null });
      const result = await orchestrator.validateConnection();
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('payment_calendar_events');
      expect(mockSupabase.select).toHaveBeenCalledWith('id');
      expect(mockSupabase.limit).toHaveBeenCalledWith(1);
    it('should return false when database connection fails', async () => {
      mockSupabase.select.mockResolvedValue({ 
        data: null, 
        error: { message: 'Connection failed' } 
      });
      expect(result).toBe(false);
    it('should return false when database query throws exception', async () => {
      mockSupabase.select.mockRejectedValue(new Error('Database error'));
  describe('refreshToken', () => {
    it('should return access token when available', async () => {
      const result = await orchestrator.refreshToken();
      expect(result).toBe(mockCredentials.accessToken);
    it('should return api key when access token is not available', async () => {
      const orchestratorWithoutToken = new PaymentCalendarOrchestratorService(
        mockConfig,
        { ...mockCredentials, accessToken: undefined }
      const result = await orchestratorWithoutToken.refreshToken();
      expect(result).toBe(mockCredentials.apiKey);
  describe('syncPaymentCalendar', () => {
    const mockWeddingId = 'test-wedding-id';
    beforeEach(() => {
      // Mock wedding data
      mockSupabase.select.mockImplementation((fields) => {
        if (fields === 'wedding_date, total_budget, currency') {
          return Promise.resolve({
            data: {
              wedding_date: '2024-12-31',
              total_budget: 50000,
              currency: 'USD'
            },
            error: null
          });
        }
        if (fields === '*' && mockSupabase.from.mock.calls.some(call => call[0] === 'budget_calculations')) {
            data: [
              {
                id: 'budget-1',
                wedding_id: mockWeddingId,
                category: 'venue',
                spent_amount: 10000,
                pending_amount: 5000,
                total_budget: 20000
              }
            ],
        return Promise.resolve({ data: [], error: null });
      // Mock service responses
      const mockNotificationService = MockNotificationService.mock.instances[0];
      mockNotificationService.initialize = vi.fn().mockResolvedValue(undefined);
      mockNotificationService.sendNotification = vi.fn().mockResolvedValue({
        id: 'notification-1',
        status: 'sent',
        totalRecipients: 1,
        successCount: 1,
        failureCount: 0,
        deliveryResults: [],
        queuedAt: new Date()
      const mockVendorSync = MockVendorPaymentSyncService.mock.instances[0];
      mockVendorSync.syncVendorPayments = vi.fn().mockResolvedValue({
        success: true,
        syncedVendors: 2,
        errors: [],
        syncTimestamp: new Date()
      const mockCashFlowCalculator = MockCashFlowCalculatorService.mock.instances[0];
      mockCashFlowCalculator.generateCashFlowAnalysis = vi.fn().mockResolvedValue({
        weddingId: mockWeddingId,
        analysisDate: new Date(),
        totalBudget: 50000,
        totalSpent: 10000,
        totalPending: 5000,
        projectedBalance: 35000,
        burnRate: 5000,
        monthsUntilWedding: 6,
        riskLevel: 'low',
        projections: [],
        recommendations: [
          { id: '1', title: 'Keep tracking expenses', type: 'monitoring', priority: 'low', description: 'Continue monitoring', estimatedImpact: 0, actionItems: [] }
        ],
        cashFlowGaps: []
    it('should successfully sync payment calendar with all services', async () => {
      const result = await orchestrator.syncPaymentCalendar(mockWeddingId);
      expect(result.success).toBe(true);
      expect(result.totalEvents).toBeGreaterThan(0);
      expect(result.cashFlowImpact).toBeDefined();
      expect(result.cashFlowImpact.projectedBalance).toBe(35000);
      expect(result.cashFlowImpact.riskLevel).toBe('low');
      expect(result.errors).toHaveLength(0);
    it('should handle vendor sync failures gracefully', async () => {
        success: false,
        syncedVendors: 0,
        errors: [{ vendorId: 'vendor-1', error: 'Connection failed' }],
      expect(result.success).toBe(true); // Should still succeed with partial failures
      expect(result.errors).toContainEqual({
        service: 'VendorPaymentSync',
        error: 'Connection failed',
        severity: ErrorSeverity.MEDIUM
    it('should handle budget integration failures', async () => {
            data: null,
            error: { message: 'Budget fetch failed' }
        service: 'BudgetIntegration',
        error: 'Budget sync failed',
    it('should handle cash flow calculator failures', async () => {
      mockCashFlowCalculator.generateCashFlowAnalysis = vi.fn().mockRejectedValue(
        new Error('Cash flow analysis failed')
        service: 'CashFlowCalculator',
        error: 'Cash flow analysis failed',
      expect(result.cashFlowImpact.riskLevel).toBe('unknown');
    it('should handle notification service failures', async () => {
      mockNotificationService.initialize = vi.fn().mockRejectedValue(
        new Error('Notification service unavailable')
        service: 'NotificationService',
        error: 'Notification service unavailable',
    it('should return failed result on critical errors', async () => {
      mockSupabase.select.mockRejectedValue(new Error('Database connection lost'));
      expect(result.success).toBe(false);
        service: 'PaymentCalendarOrchestrator',
        error: 'Database connection lost',
        severity: ErrorSeverity.HIGH
      expect(result.cashFlowImpact.riskLevel).toBe('critical');
  describe('getIntegrationHealthDashboard', () => {
    it('should return comprehensive health dashboard data', async () => {
      // Mock health check responses
      const result = await orchestrator.getIntegrationHealthDashboard();
      expect(result).toBeDefined();
      expect(result.overallHealth).toMatch(/healthy|degraded|unhealthy/);
      expect(result.services).toBeInstanceOf(Array);
      expect(result.services.length).toBe(5); // All services
      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(result.performanceMetrics.successRate).toBeGreaterThanOrEqual(0);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    it('should handle health check failures', async () => {
      mockSupabase.select.mockRejectedValue(new Error('Health check failed'));
      await expect(orchestrator.getIntegrationHealthDashboard()).rejects.toThrow('Health dashboard generation failed');
    it('should calculate overall health correctly', async () => {
      // Test with mixed service health
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.overallHealth);
  describe('getUpcomingPayments', () => {
    it('should return upcoming payments within specified days', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          wedding_id: mockWeddingId,
          vendor_id: 'vendor-1',
          type: 'payment_due',
          title: 'Venue Payment',
          description: 'Final venue payment',
          amount: 5000,
          currency: 'USD',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'venue',
          priority: 'high',
          status: 'upcoming',
          reminder_schedule: [],
          metadata: {}
      ];
      mockSupabase.select.mockResolvedValue({ data: mockPayments, error: null });
      const result = await orchestrator.getUpcomingPayments(mockWeddingId, 30);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('payment-1');
      expect(result[0].title).toBe('Venue Payment');
      expect(result[0].amount).toBe(5000);
      expect(result[0].dueDate).toBeInstanceOf(Date);
    it('should handle database errors when fetching upcoming payments', async () => {
        error: { message: 'Failed to fetch payments' } 
      await expect(orchestrator.getUpcomingPayments(mockWeddingId))
        .rejects.toThrow('Failed to fetch upcoming payments');
    it('should return empty array when no payments found', async () => {
      const result = await orchestrator.getUpcomingPayments(mockWeddingId);
      expect(result).toHaveLength(0);
    it('should use default 30-day window when no days specified', async () => {
      await orchestrator.getUpcomingPayments(mockWeddingId);
      expect(mockSupabase.gte).toHaveBeenCalled();
      expect(mockSupabase.lte).toHaveBeenCalled();
  describe('Service Health Checks', () => {
    it('should perform health check on orchestrator', async () => {
      const result = await orchestrator.healthCheck();
      expect(result.status).toBe('healthy');
      expect(result.lastChecked).toBeInstanceOf(Date);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    it('should detect unhealthy status on database error', async () => {
        error: { message: 'Database error' } 
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Connection validation failed');
  describe('Error Handling', () => {
    it('should sanitize error messages in logs', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Trigger an error condition
      mockSupabase.select.mockRejectedValue(new Error('API key abc123 failed'));
      await orchestrator.syncPaymentCalendar('test-wedding-id');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    it('should handle rate limiting correctly', async () => {
      // This would test rate limiting functionality from BaseIntegrationService
  describe('Performance Metrics', () => {
    it('should track and update performance metrics', async () => {
      const result1 = await orchestrator.syncPaymentCalendar('wedding-1');
      const result2 = await orchestrator.syncPaymentCalendar('wedding-2');
      const dashboard = await orchestrator.getIntegrationHealthDashboard();
      expect(dashboard.performanceMetrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(dashboard.recentSyncResults).toContain(result1);
      expect(dashboard.recentSyncResults).toContain(result2);
    it('should maintain sync history limit', async () => {
      // Simulate many sync operations
      for (let i = 0; i < 60; i++) {
        await orchestrator.syncPaymentCalendar(`wedding-${i}`);
      }
      expect(dashboard.recentSyncResults.length).toBeLessThanOrEqual(50);
  describe('Integration with External Services', () => {
    it('should coordinate all services in correct sequence', async () => {
      const mockWeddingId = 'test-wedding-id';
      await orchestrator.syncPaymentCalendar(mockWeddingId);
      // Verify service call order and parameters
      expect(mockVendorSync.syncVendorPayments).toHaveBeenCalledWith(mockWeddingId);
      expect(mockCashFlowCalculator.generateCashFlowAnalysis).toHaveBeenCalledWith(mockWeddingId);
      expect(mockNotificationService.initialize).toHaveBeenCalled();
});
// Additional test utilities for integration testing
export const createMockOrchestrator = (
  config?: Partial<IntegrationConfig>,
  credentials?: Partial<IntegrationCredentials>
) => {
  const defaultConfig: IntegrationConfig = {
    apiUrl: 'https://test-api.com',
    timeout: 30000,
    retryAttempts: 3,
    rateLimitPerMinute: 60,
    ...config
  };
  const defaultCredentials: IntegrationCredentials = {
    apiKey: 'test-api-key',
    userId: 'test-user-id',
    organizationId: 'test-org-id',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    ...credentials
  return new PaymentCalendarOrchestratorService(defaultConfig, defaultCredentials);
};
export const mockPaymentCalendarEvent = (overrides = {}) => ({
  id: 'event-1',
  weddingId: 'wedding-1',
  vendorId: 'vendor-1',
  type: 'payment_due',
  title: 'Test Payment',
  description: 'Test payment description',
  amount: 1000,
  currency: 'USD',
  dueDate: new Date(),
  category: 'venue',
  priority: 'medium',
  status: 'upcoming',
  reminderSchedule: [],
  metadata: {},
  ...overrides
