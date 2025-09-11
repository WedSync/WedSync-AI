import { AttributionModelingService } from '@/lib/services/attribution-modeling-service';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import type { 
  MultiTouchAttributionConfig, 
  MultiTouchAttributionResult,
  LifetimeValueCalculation,
  TouchpointData 
} from '@/lib/services/attribution-modeling-service';

// Mock Supabase
const mockSupabaseQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  insert: vi.fn().mockResolvedValue({ data: null, error: null })
};
const mockSupabase = {
  from: jest.fn(() => mockSupabaseQuery),
  rpc: vi.fn().mockResolvedValue({ data: [], error: null })
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerComponentClient: jest.fn(() => mockSupabase)
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn()
describe('AttributionModelingService', () => {
  let attributionService: AttributionModelingService;
  beforeEach(() => {
    vi.clearAllMocks();
    attributionService = AttributionModelingService.getInstance();
  });
  describe('Multi-Touch Attribution Calculation', () => {
    const mockTouchpoints = [
      {
        id: 'tp1',
        touchpointType: 'email_open',
        campaignId: 'camp1',
        channelSource: 'email',
        touchpointValue: 50,
        timestamp: new Date('2025-01-01T10:00:00Z')
      },
        id: 'tp2',
        touchpointType: 'viral_invitation_click',
        campaignId: 'camp2',
        channelSource: 'viral_invitation',
        touchpointValue: 120,
        timestamp: new Date('2025-01-02T15:30:00Z')
        id: 'tp3',
        touchpointType: 'conversion',
        campaignId: 'camp3',
        channelSource: 'referral',
        touchpointValue: 300,
        timestamp: new Date('2025-01-03T09:15:00Z')
      }
    ];
    beforeEach(() => {
      mockSupabaseQuery.select.mockResolvedValue({
        data: mockTouchpoints,
        error: null
      });
    });
    it('should calculate first-touch attribution correctly', async () => {
      const config: MultiTouchAttributionConfig = {
        modelType: 'first_touch',
        lookbackWindow: 90,
        includeViewThrough: true,
        viralAttributionBonus: 1.0
      };
      const result = await attributionService.calculateMultiTouchAttribution('user123', config);
      expect(result.modelType).toBe('first_touch');
      expect(result.touchpoints).toHaveLength(3);
      expect(result.totalTouchpoints).toBe(3);
      expect(result.attributedValue).toBeGreaterThan(0);
      
      // First touch should get 100% attribution
      const firstTouchpoint = result.touchpoints.find(tp => tp.touchpointId === 'tp1');
      expect(firstTouchpoint?.attributionWeight).toBe(1.0);
    it('should calculate last-touch attribution correctly', async () => {
        modelType: 'last_touch',
      expect(result.modelType).toBe('last_touch');
      // Last touch should get 100% attribution
      const lastTouchpoint = result.touchpoints.find(tp => tp.touchpointId === 'tp3');
      expect(lastTouchpoint?.attributionWeight).toBe(1.0);
    it('should calculate linear attribution correctly', async () => {
        modelType: 'linear',
      expect(result.modelType).toBe('linear');
      // Linear should distribute attribution equally
      result.touchpoints.forEach(tp => {
        expect(tp.attributionWeight).toBeCloseTo(1/3, 2);
    it('should apply time-decay attribution with half-life', async () => {
        modelType: 'time_decay',
        timeDecayHalfLife: 168, // 7 days in hours
      expect(result.modelType).toBe('time_decay');
      // More recent touchpoints should have higher attribution weights
      const sortedTouchpoints = result.touchpoints.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      expect(sortedTouchpoints[0].attributionWeight).toBeGreaterThanOrEqual(
        sortedTouchpoints[1].attributionWeight
      expect(sortedTouchpoints[1].attributionWeight).toBeGreaterThanOrEqual(
        sortedTouchpoints[2].attributionWeight
    it('should apply position-based attribution (40/20/40)', async () => {
        modelType: 'position_based',
        positionBasedFirstTouchWeight: 0.4,
        positionBasedLastTouchWeight: 0.4,
      expect(result.modelType).toBe('position_based');
      expect(firstTouchpoint?.attributionWeight).toBeCloseTo(0.4, 1);
      expect(lastTouchpoint?.attributionWeight).toBeCloseTo(0.4, 1);
    it('should apply custom wedding industry attribution model', async () => {
        modelType: 'custom_wedding_industry',
        viralAttributionBonus: 1.2
      expect(result.modelType).toBe('custom_wedding_industry');
      // Viral touchpoints should have bonus attribution
      const viralTouchpoint = result.touchpoints.find(tp => 
        tp.channelSource === 'viral_invitation'
      expect(viralTouchpoint?.attributionWeight).toBeGreaterThan(0);
    it('should handle empty touchpoints gracefully', async () => {
      mockSupabaseQuery.select.mockResolvedValueOnce({
        data: [],
      expect(result.touchpoints).toHaveLength(0);
      expect(result.totalTouchpoints).toBe(0);
      expect(result.attributedValue).toBe(0);
  describe('Lifetime Value Calculation', () => {
    const mockUserData = {
      id: 'user123',
      registrationDate: '2024-01-01',
      totalRevenue: 2450,
      transactionCount: 8,
      avgOrderValue: 306.25,
      lastTransactionDate: '2025-01-15'
    };
    const mockTransactions = [
      { amount: 150, date: '2024-02-01' },
      { amount: 300, date: '2024-04-15' },
      { amount: 450, date: '2024-07-20' },
      { amount: 275, date: '2024-10-10' },
      { amount: 380, date: '2024-12-05' },
      { amount: 895, date: '2025-01-15' }
      mockSupabaseQuery.single.mockResolvedValue({
        data: mockUserData,
        data: mockTransactions,
    it('should calculate accurate lifetime value prediction', async () => {
      const result = await attributionService.calculateLifetimeValue('user123');
      expect(result.userId).toBe('user123');
      expect(result.currentLTV).toBeGreaterThan(0);
      expect(result.predictedLTV).toBeGreaterThan(result.currentLTV);
      expect(result.customerLifespan).toBeGreaterThan(0);
      expect(result.churnProbability).toBeLessThan(1.0);
      expect(result.confidenceScore).toBeGreaterThan(0);
    it('should identify high-value segments accurately', async () => {
      expect(result.segment).toBeDefined();
      expect(['high_value', 'medium_value', 'low_value', 'new_customer']).toContain(result.segment);
    it('should calculate transaction frequency and recency metrics', async () => {
      expect(result.avgTransactionFrequency).toBeGreaterThan(0);
      expect(result.recencyScore).toBeGreaterThan(0);
      expect(result.frequencyScore).toBeGreaterThan(0);
      expect(result.monetaryScore).toBeGreaterThan(0);
    it('should handle new users with minimal transaction history', async () => {
      const newUserData = {
        ...mockUserData,
        totalRevenue: 150,
        transactionCount: 1
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: newUserData,
      expect(result.segment).toBe('new_customer');
      expect(result.predictedLTV).toBeGreaterThanOrEqual(result.currentLTV);
  describe('Conversion Path Analysis', () => {
    const mockConversionPaths = [
        pathId: 'path1',
        userId: 'user1',
        touchpoints: ['email', 'viral_invitation', 'conversion'],
        pathLength: 3,
        timeToConversion: 7, // days
        pathValue: 450
        pathId: 'path2',
        userId: 'user2',
        touchpoints: ['organic_visit', 'referral', 'email', 'conversion'],
        pathLength: 4,
        timeToConversion: 14,
        pathValue: 320
      mockSupabase.rpc.mockResolvedValue({
        data: mockConversionPaths,
    it('should analyze common conversion paths', async () => {
      const timeframe = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      const result = await attributionService.analyzeConversionPaths(timeframe, 5);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('pathSequence');
      expect(result[0]).toHaveProperty('frequency');
      expect(result[0]).toHaveProperty('conversionRate');
      expect(result[0]).toHaveProperty('avgTimeToConversion');
      expect(result[0]).toHaveProperty('avgPathValue');
    it('should filter paths by minimum frequency', async () => {
      const result = await attributionService.analyzeConversionPaths(timeframe, 10);
      // Paths with frequency below threshold should be filtered out
      result.forEach(path => {
        expect(path.frequency).toBeGreaterThanOrEqual(10);
  describe('Touchpoint Tracking', () => {
    it('should track touchpoint with proper validation', async () => {
      const touchpointData: TouchpointData = {
        userId: 'user123',
        touchpointType: 'email_click',
        campaignId: 'camp456',
        touchpointValue: 75,
        metadata: {
          subjectLine: 'Your Wedding Photo Gallery Is Ready!',
          campaignVariant: 'A'
        }
      mockSupabaseQuery.insert.mockResolvedValue({
        data: { id: 'tp_new_123' },
      const touchpointId = await attributionService.trackTouchpoint(touchpointData);
      expect(touchpointId).toBe('tp_new_123');
      expect(mockSupabaseQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user123',
          touchpoint_type: 'email_click',
          campaign_id: 'camp456',
          channel_source: 'email',
          touchpoint_value: 75
        })
    it('should handle tracking errors gracefully', async () => {
        touchpointType: 'viral_invitation_send',
        touchpointValue: 0
        data: null,
        error: { message: 'Database error' }
      await expect(
        attributionService.trackTouchpoint(touchpointData)
      ).rejects.toThrow('Failed to track touchpoint');
  describe('ROI Optimization', () => {
    const mockCampaignData = [
        currentSpend: 500,
        revenue: 2200,
        roi: 4.4,
        attributedConversions: 12
        currentSpend: 800,
        revenue: 1600,
        roi: 2.0,
        attributedConversions: 8
        data: mockCampaignData,
    it('should provide ROI optimization recommendations', async () => {
      const campaignIds = ['camp1', 'camp2'];
      const optimizations = await attributionService.optimizeCampaignROI(campaignIds);
      expect(optimizations).toHaveLength(2);
      optimizations.forEach(optimization => {
        expect(optimization).toHaveProperty('campaignId');
        expect(optimization).toHaveProperty('currentROI');
        expect(optimization).toHaveProperty('projectedROI');
        expect(optimization).toHaveProperty('recommendation');
        expect(['increase', 'decrease', 'maintain', 'pause']).toContain(optimization.recommendation);
        expect(optimization).toHaveProperty('optimizedSpend');
        expect(optimization.optimizedSpend).toBeGreaterThan(0);
    it('should recommend budget increases for high-performing campaigns', async () => {
      const optimizations = await attributionService.optimizeCampaignROI(['camp1']);
      const highPerformingOptimization = optimizations[0];
      // Campaign with ROI > 4.0 should get increase recommendation
      expect(highPerformingOptimization.recommendation).toBe('increase');
      expect(highPerformingOptimization.optimizedSpend).toBeGreaterThan(
        highPerformingOptimization.currentSpend
    it('should handle campaigns with poor performance', async () => {
      const poorCampaignData = {
        campaignId: 'camp_poor',
        currentSpend: 1000,
        revenue: 500,
        roi: 0.5,
        attributedConversions: 2
        data: [poorCampaignData],
      const optimizations = await attributionService.optimizeCampaignROI(['camp_poor']);
      expect(optimizations[0].recommendation).toMatch(/decrease|pause/);
  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
        error: { message: 'Connection failed' }
        attributionService.calculateMultiTouchAttribution('user123')
      ).rejects.toThrow('Failed to fetch touchpoint data');
    it('should validate attribution model configuration', async () => {
      const invalidConfig = {
        modelType: 'invalid_model' as any,
        lookbackWindow: -30, // Invalid negative window
        attributionService.calculateMultiTouchAttribution('user123', invalidConfig)
      ).rejects.toThrow();
    it('should handle malformed touchpoint data', async () => {
      const malformedTouchpoints = [
        { id: 'tp1' }, // Missing required fields
        { touchpointType: 'email_open' }, // Missing id and other fields
      ];
        data: malformedTouchpoints,
      const result = await attributionService.calculateMultiTouchAttribution('user123');
      // Should filter out malformed touchpoints
  describe('Performance and Optimization', () => {
    it('should handle large datasets efficiently', async () => {
      const largeTouchpointSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `tp_${i}`,
        campaignId: `camp_${i % 10}`,
        touchpointValue: Math.random() * 100,
        timestamp: new Date(Date.now() - i * 1000 * 60 * 60) // Spread over time
      }));
        data: largeTouchpointSet,
      const startTime = Date.now();
      const executionTime = Date.now() - startTime;
      expect(result.touchpoints).toHaveLength(1000);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    it('should cache expensive calculations appropriately', async () => {
      const userId = 'user123';
      // First call
      const result1 = await attributionService.calculateLifetimeValue(userId);
      // Second call - should utilize caching mechanisms
      const result2 = await attributionService.calculateLifetimeValue(userId);
      expect(result1.predictedLTV).toBe(result2.predictedLTV);
      expect(result1.customerLifespan).toBe(result2.customerLifespan);
});
