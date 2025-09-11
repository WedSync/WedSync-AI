// WS-055: Unit Tests for Client Intent Scoring Algorithm
// Tests for behavior pattern analysis and intent scoring

import { ClientIntentScorer } from '@/lib/ml/prediction/intent-scorer'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import type { ClientBehaviorData, IntentScore, RealTimeActivity } from '@/lib/ml/prediction/types'
// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: vi.fn(),
          order: jest.fn(() => ({
            limit: vi.fn()
          }))
        })),
        insert: vi.fn()
      }))
    }))
  })
}))
describe('ClientIntentScorer', () => {
  let intentScorer: ClientIntentScorer
  let mockClientData: ClientBehaviorData
  beforeEach(() => {
    intentScorer = new ClientIntentScorer()
    
    mockClientData = {
      client_id: 'test-client-456',
      engagement_score: 75,
      questionnaire_completed_at: new Date('2024-01-15T10:00:00Z'),
      initial_contact_at: new Date('2024-01-15T08:00:00Z'),
      last_activity_at: new Date('2024-01-16T10:00:00Z'),
      responses_count: 8,
      budget_range: 'medium',
      venue_booked: false,
      timeline_interactions: 12,
      vendor_inquiries: 5,
      document_downloads: 3,
      pricing_views: 15,
      session_duration_avg: 420, // 7 minutes
      page_views_total: 40,
      form_interactions: 10,
      response_time_avg: 1200, // 20 minutes
      message_length_avg: 180,
      questions_asked: 6
    }
  describe('Core Intent Scoring', () => {
    test('should calculate intent score correctly for high-engagement client', async () => {
      // Mock the fetchClientBehaviorData method
      vi.spyOn(intentScorer as any, 'fetchClientBehaviorData').mockResolvedValue(mockClientData)
      
      // Mock the analyzeIntentTrend method
      vi.spyOn(intentScorer as any, 'analyzeIntentTrend').mockResolvedValue('increasing')
      const intentScore = await intentScorer.calculateIntentScore('test-client-456')
      expect(intentScore.client_id).toBe('test-client-456')
      expect(intentScore.score).toBeGreaterThan(60) // Should be high for engaged client
      expect(intentScore.category).toMatch(/high|very_high/)
      expect(intentScore.trend).toBe('increasing')
      expect(intentScore.indicators).toBeInstanceOf(Array)
      expect(intentScore.last_updated).toBeInstanceOf(Date)
    })
    test('should calculate lower intent score for low-engagement client', async () => {
      const lowEngagementClient = {
        ...mockClientData,
        engagement_score: 25,
        vendor_inquiries: 1,
        pricing_views: 2,
        form_interactions: 1,
        questions_asked: 0,
        response_time_avg: 7200 // 2 hours
      }
      vi.spyOn(intentScorer as any, 'fetchClientBehaviorData').mockResolvedValue(lowEngagementClient)
      vi.spyOn(intentScorer as any, 'analyzeIntentTrend').mockResolvedValue('declining')
      const intentScore = await intentScorer.calculateIntentScore('low-engagement-client')
      expect(intentScore.score).toBeLessThan(50) // Should be low for unengaged client
      expect(intentScore.category).toMatch(/low|medium/)
      expect(intentScore.trend).toBe('declining')
    test('should handle missing client data gracefully', async () => {
      vi.spyOn(intentScorer as any, 'fetchClientBehaviorData').mockResolvedValue(null)
      await expect(intentScorer.calculateIntentScore('nonexistent-client'))
        .rejects.toThrow('Client data not found')
  describe('Feature Extraction', () => {
    test('should extract session quality features correctly', async () => {
      const features = await (intentScorer as unknown).extractIntentFeatures(mockClientData)
      expect(features.session_quality).toBeGreaterThan(0)
      expect(features.content_engagement).toBeGreaterThan(0)
      expect(features.return_visitor_frequency).toBeGreaterThan(0)
    test('should calculate research behavior features', async () => {
      expect(features.vendor_research_intensity).toBe(0.5) // 5/10 max
      expect(features.pricing_research_depth).toBeGreaterThan(0) // pricing_views/page_views
      expect(features.comparison_behavior).toBe(1) // 5 inquiries / 5 max
    test('should evaluate communication patterns', async () => {
      expect(features.inquiry_proactiveness).toBeGreaterThan(0)
      expect(features.response_urgency).toBeGreaterThan(0) // Fast responses = higher urgency
      expect(features.question_depth).toBeGreaterThan(0)
    test('should handle zero values in features', async () => {
      const minimalClient = {
        vendor_inquiries: 0,
        pricing_views: 0,
        session_duration_avg: 0
      const features = await (intentScorer as unknown).extractIntentFeatures(minimalClient)
      expect(features.vendor_research_intensity).toBe(0)
      expect(features.pricing_research_depth).toBe(0)
      expect(features.question_depth).toBe(0)
  describe('Intent Category Classification', () => {
    test('should classify very high intent correctly', () => {
      const veryHighScore = (intentScorer as unknown).categorizeIntent(85)
      expect(veryHighScore).toBe('very_high')
    test('should classify high intent correctly', () => {
      const highScore = (intentScorer as unknown).categorizeIntent(65)
      expect(highScore).toBe('high')
    test('should classify medium intent correctly', () => {
      const mediumScore = (intentScorer as unknown).categorizeIntent(45)
      expect(mediumScore).toBe('medium')
    test('should classify low intent correctly', () => {
      const lowScore = (intentScorer as unknown).categorizeIntent(25)
      expect(lowScore).toBe('low')
    test('should handle edge cases', () => {
      expect((intentScorer as unknown).categorizeIntent(80)).toBe('very_high')
      expect((intentScorer as unknown).categorizeIntent(60)).toBe('high')
      expect((intentScorer as unknown).categorizeIntent(40)).toBe('medium')
      expect((intentScorer as unknown).categorizeIntent(0)).toBe('low')
  describe('Intent Indicators', () => {
    test('should identify active venue search indicator', () => {
      const highVendorResearchFeatures = {
        vendor_research_intensity: 0.8,
        pricing_research_depth: 0.6,
        response_urgency: 0.7
      const indicators = (intentScorer as unknown).identifyIntentIndicators(
        highVendorResearchFeatures, 
        mockClientData
      )
      expect(indicators).toContain(
        expect.objectContaining({
          indicator_type: 'active_venue_search',
          strength: 8
        })
    test('should identify quick response time indicator', () => {
      const quickResponseFeatures = {
        response_urgency: 0.9,
        vendor_research_intensity: 0.5
        quickResponseFeatures,
          indicator_type: 'quick_response_time',
          strength: 9
    test('should identify multiple vendor inquiries indicator', () => {
      const multipleInquiryClient = {
        vendor_inquiries: 4
        { vendor_research_intensity: 0.6 },
        multipleInquiryClient
          indicator_type: 'multiple_vendor_inquiries',
          strength: 4
    test('should not create indicators when thresholds not met', () => {
      const lowActivityFeatures = {
        vendor_research_intensity: 0.3,
        response_urgency: 0.4,
        pricing_research_depth: 0.2
      const lowActivityClient = {
        vendor_inquiries: 1
        lowActivityFeatures,
        lowActivityClient
      // Should have very few or no indicators
      expect(indicators.length).toBeLessThan(3)
  describe('Behavior Pattern Recognition', () => {
    test('should recognize booking ready pattern', async () => {
      const bookingReadyClient = {
        vendor_inquiries: 8,
        pricing_views: 25,
        venue_booked: true
      vi.spyOn(intentScorer as any, 'extractIntentFeatures').mockResolvedValue({
        session_quality: 0.8,
        urgency_indicators: 0.7,
        pricing_research_depth: 0.9
      })
      const pattern = await intentScorer.recognizeBehaviorPattern(bookingReadyClient)
      expect(pattern.pattern_type).toBe('booking_ready')
      expect(pattern.confidence).toBeGreaterThan(0.8)
      expect(pattern.typical_outcomes.booking_probability).toBeGreaterThan(0.7)
    test('should recognize price shopping pattern', async () => {
        pricing_research_depth: 0.9,
        comparison_behavior: 0.8,
        vendor_research_intensity: 0.4 // Low vendor research but high pricing focus
      const pattern = await intentScorer.recognizeBehaviorPattern(mockClientData)
      expect(pattern.pattern_type).toBe('price_shopping')
      expect(pattern.confidence).toBeGreaterThan(0.7)
    test('should recognize early researcher pattern', async () => {
      const earlyResearchClient = {
        initial_contact_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        content_engagement: 0.7,
        urgency_indicators: 0.2 // Low urgency
      const pattern = await intentScorer.recognizeBehaviorPattern(earlyResearchClient)
      expect(pattern.pattern_type).toBe('early_researcher')
      expect(pattern.typical_outcomes.average_timeline_to_booking).toBeGreaterThan(30)
    test('should recognize churn risk pattern', async () => {
      const churnRiskClient = {
        last_activity_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
        session_quality: 0.2,
        response_urgency: 0.3
      const pattern = await intentScorer.recognizeBehaviorPattern(churnRiskClient)
      expect(pattern.pattern_type).toBe('churn_risk')
      expect(pattern.typical_outcomes.booking_probability).toBeLessThan(0.3)
  describe('Real-Time Activity Processing', () => {
    test('should process real-time activity and update score', async () => {
      const activity: RealTimeActivity = {
        client_id: 'test-client-456',
        activity_type: 'vendor_inquiry',
        timestamp: new Date(),
        metadata: { vendor_type: 'photographer' },
        value_score: 8
      vi.spyOn(intentScorer as any, 'storeActivity').mockResolvedValue(undefined)
      vi.spyOn(intentScorer, 'calculateIntentScore').mockResolvedValue({
        score: 85,
        category: 'very_high',
        indicators: [],
        trend: 'increasing',
        last_updated: new Date()
      const updatedScore = await intentScorer.processRealTimeActivity(activity)
      expect(updatedScore.score).toBe(85)
      expect(updatedScore.category).toBe('very_high')
    test('should trigger real-time updates for significant changes', async () => {
      const highValueActivity: RealTimeActivity = {
        activity_type: 'booking_inquiry',
        metadata: {},
        value_score: 9
      const mockHighIntentScore = {
        score: 90,
        category: 'very_high' as const,
        trend: 'increasing' as const,
      vi.spyOn(intentScorer, 'calculateIntentScore').mockResolvedValue(mockHighIntentScore)
      vi.spyOn(intentScorer as any, 'isSignificantIntentChange').mockReturnValue(true)
      vi.spyOn(intentScorer as any, 'triggerRealTimeUpdate').mockResolvedValue(undefined)
      await intentScorer.processRealTimeActivity(highValueActivity)
      expect((intentScorer as unknown).triggerRealTimeUpdate).toHaveBeenCalledWith(
        'test-client-456',
        mockHighIntentScore
  describe('Trend Analysis', () => {
    test('should analyze increasing intent trend', async () => {
      // Mock historical intent scores showing improvement
      const mockScores = [
        { score: 85, created_at: '2024-01-16T10:00:00Z' },
        { score: 80, created_at: '2024-01-15T10:00:00Z' },
        { score: 75, created_at: '2024-01-14T10:00:00Z' },
        { score: 70, created_at: '2024-01-13T10:00:00Z' },
        { score: 65, created_at: '2024-01-12T10:00:00Z' }
      ]
      vi.spyOn(intentScorer['supabase'], 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockScores,
                error: null
              })
            })
          })
      } as unknown)
      const trend = await (intentScorer as unknown).analyzeIntentTrend('test-client-456')
      expect(trend).toBe('increasing')
    test('should analyze decreasing intent trend', async () => {
        { score: 65, created_at: '2024-01-16T10:00:00Z' },
        { score: 70, created_at: '2024-01-15T10:00:00Z' },
        { score: 80, created_at: '2024-01-13T10:00:00Z' },
        { score: 85, created_at: '2024-01-12T10:00:00Z' }
      expect(trend).toBe('decreasing')
    test('should handle insufficient data for trend analysis', async () => {
                data: [],
      const trend = await (intentScorer as unknown).analyzeIntentTrend('new-client')
      expect(trend).toBe('stable')
  describe('Base Intent Score Calculation', () => {
    test('should calculate weighted score correctly', () => {
      const mockFeatures = {
        return_visitor_frequency: 0.6,
        vendor_research_intensity: 0.9,
        pricing_research_depth: 0.8,
        comparison_behavior: 0.5,
        inquiry_proactiveness: 0.7,
        response_urgency: 0.8,
        question_depth: 0.6,
        urgency_indicators: 0.5,
        planning_progression: 0.6
      const baseScore = (intentScorer as unknown).calculateBaseIntentScore(mockFeatures)
      expect(baseScore).toBeGreaterThan(50) // Should be high for good features
      expect(baseScore).toBeLessThanOrEqual(100) // Should not exceed maximum
    test('should apply urgency multiplier correctly', () => {
      const urgentFeatures = {
        session_quality: 0.5,
        content_engagement: 0.5,
        return_visitor_frequency: 0.5,
        vendor_research_intensity: 0.5,
        pricing_research_depth: 0.5,
        inquiry_proactiveness: 0.5,
        response_urgency: 0.5,
        question_depth: 0.5,
        urgency_indicators: 0.8, // High urgency
        planning_progression: 0.5
      const normalFeatures = { ...urgentFeatures, urgency_indicators: 0.3 }
      const urgentScore = (intentScorer as unknown).calculateBaseIntentScore(urgentFeatures)
      const normalScore = (intentScorer as unknown).calculateBaseIntentScore(normalFeatures)
      expect(urgentScore).toBeGreaterThan(normalScore) // Urgency should boost score
  describe('Performance and Error Handling', () => {
    test('should handle calculation errors gracefully', async () => {
      vi.spyOn(intentScorer as any, 'fetchClientBehaviorData').mockRejectedValue(new Error('Database error'))
      await expect(intentScorer.calculateIntentScore('error-client'))
        .rejects.toThrow('Intent scoring failed')
    test('should complete scoring within performance requirements', async () => {
      vi.spyOn(intentScorer as any, 'analyzeIntentTrend').mockResolvedValue('stable')
      const startTime = performance.now()
      await intentScorer.calculateIntentScore('performance-test-client')
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should be under 1 second
    test('should validate score ranges', async () => {
      const intentScore = await intentScorer.calculateIntentScore('range-test-client')
      expect(intentScore.score).toBeGreaterThanOrEqual(0)
      expect(intentScore.score).toBeLessThanOrEqual(100)
      expect(['low', 'medium', 'high', 'very_high']).toContain(intentScore.category)
  describe('Feature Helper Methods', () => {
    test('should calculate session quality correctly', () => {
      const testClient = {
        session_duration_avg: 240, // 4 minutes
        page_views_total: 20,
        responses_count: 4 // 5 pages per session
      const sessionQuality = (intentScorer as unknown).calculateSessionQuality(testClient)
      expect(sessionQuality).toBeGreaterThan(0)
      expect(sessionQuality).toBeLessThanOrEqual(1)
    test('should calculate return frequency correctly', () => {
      const daysSinceContact = 7 // 1 week
      const returnFreq = (intentScorer as unknown).calculateReturnFrequency(mockClientData, daysSinceContact)
      expect(returnFreq).toBeGreaterThan(0)
      expect(returnFreq).toBeLessThanOrEqual(1)
    test('should handle edge cases in helper methods', () => {
      const edgeCaseClient = {
        session_duration_avg: 0,
        page_views_total: 0,
        responses_count: 0,
        response_time_avg: 0
      const sessionQuality = (intentScorer as unknown).calculateSessionQuality(edgeCaseClient)
      const responseUrgency = (intentScorer as unknown).calculateResponseUrgency(edgeCaseClient)
      expect(sessionQuality).toBe(0)
      expect(responseUrgency).toBe(0)
})
