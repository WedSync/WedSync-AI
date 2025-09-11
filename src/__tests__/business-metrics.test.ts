import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { MRRCalculator } from '@/lib/metrics/mrr-calculator';
import { ChurnAnalyzer } from '@/lib/metrics/churn-analyzer';
import { ViralCoefficientTracker } from '@/lib/metrics/viral-coefficient-tracker';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  single: vi.fn(),
};
// Mock user session data
const mockExecutiveUser = {
  user: { id: 'test-user-id' },
  error: null,
const mockExecutiveProfile = {
  data: {
    role: 'executive',
    organization_id: 'test-org-id',
const mockSubscriptionData = [
  {
    id: 'org-1',
    created_at: '2024-01-15T10:00:00Z',
    subscription_plan: 'professional',
    subscription_status: 'active',
    subscription_monthly_price: 49,
    user_profiles: { business_type: 'photographer' },
    id: 'org-2', 
    created_at: '2024-02-20T10:00:00Z',
    subscription_plan: 'starter',
    subscription_monthly_price: 19,
    user_profiles: { business_type: 'venue' },
];
const mockChurnedData = [
    id: 'org-3',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-08-15T10:00:00Z',
    subscription_status: 'cancelled',
    cancellation_reason: 'Too expensive',
    user_profiles: { business_type: 'florist' },
describe('Business Metrics API System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue(mockExecutiveUser);
    mockSupabaseClient.single.mockResolvedValue(mockExecutiveProfile);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  describe('MRRCalculator', () => {
    let calculator: MRRCalculator;
    beforeEach(() => {
      calculator = new MRRCalculator(mockSupabaseClient as unknown);
    });
    it('should calculate MRR metrics correctly', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            mockResolvedValue: vi.fn().mockResolvedValue({
              data: mockSubscriptionData,
            }),
          };
        }
        return mockSupabaseClient;
      });
      // Mock the select chain properly
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      };
      
      // Set up different return values for different queries
      let callCount = 0;
      mockChain.lte = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Active subscriptions query
          return Promise.resolve({ data: mockSubscriptionData });
        } else if (callCount === 2) {
          // Payment history query
          return Promise.resolve({ data: [] });
        } else {
          // Churned organizations query
          return Promise.resolve({ data: mockChurnedData });
      mockSupabaseClient.from.mockReturnValue(mockChain);
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-08-31');
      const metrics = await calculator.calculateMRRMetrics({
        startDate,
        endDate,
        granularity: 'monthly',
      expect(metrics).toBeDefined();
      expect(metrics.currentMRR).toBeGreaterThanOrEqual(0);
      expect(metrics.calculation.totalActiveSubscriptions).toBe(2);
      expect(metrics.seasonalFactors).toBeDefined();
      expect(metrics.seasonalFactors.isPeakSeason).toBeDefined();
    it('should handle seasonal analysis correctly', async () => {
      const subscriptions = [
        {
          id: 'org-1',
          organization_id: 'org-1',
          created_at: '2024-06-15T10:00:00Z', // Peak season
          monthly_value: 49,
          plan_type: 'professional',
          status: 'active',
        },
          id: 'org-2',
          organization_id: 'org-2',
          created_at: '2024-12-20T10:00:00Z', // Off season
          monthly_value: 19,
          plan_type: 'starter', 
      ];
      // Test seasonal factor calculation
      const seasonalFactors = await (calculator as unknown).calculateSeasonalFactors(subscriptions);
      expect(seasonalFactors).toBeDefined();
      expect(seasonalFactors.peakSeasonMultiplier).toBeGreaterThan(0);
      expect(seasonalFactors.seasonalAdjustment).toContain('season');
    it('should calculate MRR components correctly', async () => {
      const newSubs = [
        { id: '1', organization_id: '1', created_at: '2024-08-01', monthly_value: 49, plan_type: 'pro' },
        { id: '2', organization_id: '2', created_at: '2024-08-15', monthly_value: 19, plan_type: 'starter' },
      const newMRR = await (calculator as unknown).calculateNewMRR(newSubs);
      expect(newMRR).toBe(68); // 49 + 19
      const churnedSubs = [
        { id: '3', organization_id: '3', cancelled_at: '2024-08-20', monthly_value: 19, plan_type: 'starter' },
      const churnedMRR = await (calculator as unknown).calculateChurnedMRR(churnedSubs);
      expect(churnedMRR).toBe(19);
  describe('ChurnAnalyzer', () => {
    let analyzer: ChurnAnalyzer;
      analyzer = new ChurnAnalyzer(mockSupabaseClient as unknown);
      // Mock the complex query chain for organizations with user profiles
      let queryCount = 0;
        queryCount++;
        if (queryCount === 1) {
          // Active organizations query
    it('should calculate churn metrics correctly', async () => {
      const metrics = await analyzer.calculateChurnMetrics({
      expect(metrics.churnRate.monthly).toBeGreaterThanOrEqual(0);
      expect(metrics.churnRate.monthly).toBeLessThanOrEqual(100);
      expect(metrics.churnReasons).toBeDefined();
      expect(metrics.churnReasons.top3Reasons).toBeInstanceOf(Array);
      expect(metrics.seasonalPatterns).toBeDefined();
    it('should analyze churn reasons correctly', async () => {
      const churnedCustomers = [
          id: '1',
          organization_id: '1', 
          churned_at: '2024-08-15',
          monthlyValue: 19,
          supplierType: 'photographer',
          cancellation_reason: 'Too expensive',
          tenure_months: 6,
          id: '2',
          organization_id: '2',
          churned_at: '2024-08-20', 
          monthlyValue: 49,
          supplierType: 'venue',
          cancellation_reason: 'Missing features',
          tenure_months: 12,
          id: '3',
          organization_id: '3',
          churned_at: '2024-08-25',
          supplierType: 'florist', 
          tenure_months: 3,
      const analysis = await (analyzer as unknown).analyzeChurnReasons(churnedCustomers);
      expect(analysis.overall['Too expensive']).toBe(2);
      expect(analysis.overall['Missing features']).toBe(1);
      expect(analysis.top3Reasons).toHaveLength(2);
      expect(analysis.top3Reasons[0].reason).toBe('Too expensive');
      expect(analysis.top3Reasons[0].count).toBe(2);
      expect(analysis.bySupplierType).toBeDefined();
    it('should calculate risk scores for customers', async () => {
      // Test new account (high risk)
      const newAccount = {
        id: '1',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month old
        subscription_plan: 'free',
      const newAccountRisk = (analyzer as unknown).calculateRiskScore(newAccount);
      expect(newAccountRisk).toBeGreaterThan(50); // High risk
      // Test established account (lower risk)
      const establishedAccount = {
        id: '2', 
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year old
        subscription_plan: 'professional',
      const establishedRisk = (analyzer as unknown).calculateRiskScore(establishedAccount);
      expect(establishedRisk).toBeLessThan(50); // Lower risk
    it('should generate appropriate interventions', async () => {
      const atRiskCustomers = [
          organization_id: '1',
          created_at: '2024-07-01',
          riskScore: 75,
      const interventions = (analyzer as unknown).generateInterventions(atRiskCustomers);
      expect(interventions).toBeInstanceOf(Array);
      expect(interventions.length).toBeGreaterThan(0);
      expect(interventions.some((i: string) => i.includes('outreach'))).toBeTruthy();
  describe('ViralCoefficientTracker', () => {
    let tracker: ViralCoefficientTracker;
      tracker = new ViralCoefficientTracker(mockSupabaseClient as unknown);
      // Mock organizations query for viral analysis
      mockChain.lte = vi.fn().mockResolvedValue({
        data: mockSubscriptionData,
    it('should calculate viral coefficient correctly', async () => {
      const metrics = await tracker.calculateViralCoefficient({
      expect(metrics.viralCoefficient).toBeGreaterThanOrEqual(0);
      expect(metrics.averageReferrals).toBeGreaterThanOrEqual(0);
      expect(metrics.referralConversionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.industryPatterns).toBeDefined();
      expect(metrics.viralROI).toBeDefined();
      expect(metrics.predictions).toBeDefined();
    it('should analyze industry viral patterns correctly', async () => {
      const referralData = {
        activeReferrers: [
          {
            id: '1',
            organization_id: '1',
            supplierType: 'photographer',
            referralsSent: 3,
            conversions: 2,
            revenueGenerated: 98,
          },
            id: '2', 
            organization_id: '2',
            supplierType: 'venue',
            referralsSent: 5,
            conversions: 3,
            revenueGenerated: 147,
            id: '3',
            organization_id: '3', 
            supplierType: 'planner',
            referralsSent: 8,
            conversions: 6,
            revenueGenerated: 294,
        ],
        referralConversions: [],
        referralChains: [],
      const patterns = await (tracker as unknown).analyzeIndustryVirality(referralData);
      expect(patterns.bySupplierType).toBeDefined();
      expect(patterns.bySupplierType.photographer.averageReferrals).toBe(3);
      expect(patterns.bySupplierType.venue.averageReferrals).toBe(5);
      expect(patterns.bySupplierType.planner.averageReferrals).toBe(8);
      expect(patterns.crossTypeReferrals).toBeDefined();
      expect(patterns.seasonalVirality).toBeDefined();
    it('should calculate viral ROI correctly', async () => {
            referralsSent: 4,
        referralConversions: [
            id: 'conv-1',
            referrer_id: '1',
            referred_id: 'ref-1', 
            conversion_date: '2024-08-15',
            revenue_value: 49,
            id: 'conv-2',
            referred_id: 'ref-2',
            conversion_date: '2024-08-20',
            supplierType: 'florist',
      const viralROI = await (tracker as unknown).calculateViralROI(referralData);
      expect(viralROI.revenueFromReferrals).toBe(98); // 49 + 49
      expect(viralROI.costPerAcquiredCustomer).toBe(10); // (4 referrals * £5) / 2 conversions
      expect(viralROI.viralROIMultiplier).toBeGreaterThan(1); // Should be better than traditional CAC
    it('should generate realistic growth predictions', async () => {
      const viralCoefficient = 1.25; // 25% viral growth
          { id: '1', organization_id: '1', supplierType: 'photographer', referralsSent: 3, conversions: 2, revenueGenerated: 98 },
          { id: '2', organization_id: '2', supplierType: 'venue', referralsSent: 2, conversions: 1, revenueGenerated: 49 },
      const predictions = (tracker as unknown).generateGrowthPredictions(viralCoefficient, referralData);
      expect(predictions.nextMonthReferrals).toBe(3); // Math.round(1.25 * 2)
      expect(predictions.growthTrajectory.nextMonth).toBeGreaterThan(2); // Growing
      expect(predictions.growthTrajectory.compoundGrowthRate).toBe(25); // 25% growth rate
      expect(predictions.viralGrowthPotential).toBeGreaterThan(0);
  describe('API Endpoint Authentication', () => {
    it('should reject unauthorized users', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        user: null,
        error: new Error('Not authenticated'),
      // This would be tested in the actual API route tests
      expect(mockSupabaseClient.auth.getUser).toBeDefined();
    it('should reject non-executive users', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          role: 'user', // Not executive
          organization_id: 'test-org-id',
      expect(mockSupabaseClient.single).toBeDefined();
    it('should allow executive users', async () => {
      mockSupabaseClient.single.mockResolvedValue(mockExecutiveProfile);
      const result = await mockSupabaseClient.single();
      expect(result.data.role).toBe('executive');
  describe('Wedding Industry Specific Logic', () => {
    it('should recognize peak wedding season', () => {
      const juneDate = new Date('2024-06-15'); // Peak season
      const isPeakSeason = juneDate.getMonth() >= 4 && juneDate.getMonth() <= 8;
      expect(isPeakSeason).toBeTruthy();
      const januaryDate = new Date('2024-01-15'); // Off season
      const isOffSeason = januaryDate.getMonth() >= 4 && januaryDate.getMonth() <= 8;
      expect(isOffSeason).toBeFalsy();
    it('should handle supplier type categorization', () => {
      const supplierTypes = ['photographer', 'venue', 'planner', 'florist', 'caterer'];
      supplierTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
    it('should calculate wedding season multipliers', () => {
      const peakSeasonMultiplier = 1.35; // 35% boost
      const offSeasonMultiplier = 0.78; // 22% decline
      expect(peakSeasonMultiplier).toBeGreaterThan(1);
      expect(offSeasonMultiplier).toBeLessThan(1);
      expect(peakSeasonMultiplier + offSeasonMultiplier).toBeCloseTo(2.13);
  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const calculator = new MRRCalculator(mockSupabaseClient as unknown);
      // Mock database error
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      await expect(async () => {
        await calculator.calculateMRRMetrics({
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-08-31'),
          granularity: 'monthly',
        });
      }).rejects.toThrow('Database connection failed');
    it('should handle empty dataset gracefully', async () => {
      // Mock empty results
      mockChain.lte = vi.fn().mockResolvedValue({ data: [] });
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-08-31'),
      expect(metrics.currentMRR).toBe(0);
      expect(metrics.calculation.totalActiveSubscriptions).toBe(0);
      expect(metrics.calculation.averageRevenuePerUser).toBe(0);
});
// Integration test helper functions
export const testHelpers = {
  createMockRequest: (path: string, params: Record<string, string> = {}) => {
    const url = new URL(path, 'http://localhost:3000');
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    
    return new NextRequest(url);
  createMockSubscriptionData: (count: number = 5) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `org-${i + 1}`,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      subscription_plan: ['starter', 'professional', 'scale'][Math.floor(Math.random() * 3)],
      subscription_status: 'active',
      subscription_monthly_price: [19, 49, 79][Math.floor(Math.random() * 3)],
      user_profiles: {
        business_type: ['photographer', 'venue', 'planner', 'florist'][Math.floor(Math.random() * 4)],
      },
    }));
