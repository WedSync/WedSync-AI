// WS-055: Unit Tests for Real-Time Scoring System
// Tests for real-time activity processing and WebSocket updates

import { RealTimeScoring } from '@/lib/ml/prediction/real-time-scoring'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { BookingPredictor } from '@/lib/ml/prediction/booking-predictor'
import { ClientIntentScorer } from '@/lib/ml/prediction/intent-scorer'
import type { RealTimeActivity, ScoreUpdate, IntentScore } from '@/lib/ml/prediction/types'
// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: () => ({
    from: jest.fn(() => ({
      insert: vi.fn(),
      select: vi.fn()
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: vi.fn()
      }))
    }))
  })
}))
vi.mock('@/lib/ml/prediction/booking-predictor')
vi.mock('@/lib/ml/prediction/intent-scorer')
describe('RealTimeScoring', () => {
  let realTimeScoring: RealTimeScoring
  let mockBookingPredictor: ReturnType<typeof vi.fn>ed<BookingPredictor>
  let mockIntentScorer: ReturnType<typeof vi.fn>ed<ClientIntentScorer>
  beforeEach(() => {
    realTimeScoring = new RealTimeScoring()
    
    // Get mocked instances
    mockBookingPredictor = (realTimeScoring as unknown).bookingPredictor
    mockIntentScorer = (realTimeScoring as unknown).intentScorer
    // Mock basic methods
    mockIntentScorer.calculateIntentScore.mockResolvedValue({
      client_id: 'test-client',
      score: 75,
      category: 'high',
      indicators: [],
      trend: 'stable',
      last_updated: new Date()
    })
    mockBookingPredictor.predictBookingProbability.mockResolvedValue({
      probability: 0.7,
      confidence: 0.8,
      factors: [],
      risk_indicators: [],
      model_version: '1.0.0',
      prediction_date: new Date(),
      inference_time_ms: 100
  describe('System Initialization', () => {
    test('should initialize successfully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation()
      
      await realTimeScoring.initialize()
      expect(consoleSpy).toHaveBeenCalledWith('Initializing real-time scoring system...')
      expect(consoleSpy).toHaveBeenCalledWith('Real-time scoring system initialized')
      consoleSpy.mockRestore()
    test('should set up real-time subscriptions', async () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
      }
      vi.spyOn(realTimeScoring['supabase'], 'channel').mockReturnValue(mockChannel)
      expect(realTimeScoring['supabase'].channel).toHaveBeenCalledWith('client_activities')
      expect(realTimeScoring['supabase'].channel).toHaveBeenCalledWith('clients')
      expect(mockChannel.on).toHaveBeenCalledWith('postgres_changes', expect.any(Object), expect.any(Function))
  describe('Activity Processing', () => {
    test('should process high-value activity immediately', async () => {
      const highValueActivity: RealTimeActivity = {
        client_id: 'test-client',
        activity_type: 'booking_inquiry',
        timestamp: new Date(),
        metadata: { source: 'website' },
        value_score: 9
      vi.spyOn(realTimeScoring as any, 'processActivityImmediate').mockResolvedValue({
        previous_score: 70,
        new_score: 85,
        score_change: 15,
        factors_changed: ['booking_inquiry'],
        confidence: 0.9,
        update_reason: 'Activity: booking_inquiry',
        timestamp: new Date()
      })
      const result = await realTimeScoring.processActivity('test-client', highValueActivity)
      expect(result.score_change).toBe(15)
      expect(result.confidence).toBe(0.9)
      expect((realTimeScoring as unknown).processActivityImmediate).toHaveBeenCalledWith('test-client', highValueActivity)
    test('should queue normal-value activities for batch processing', async () => {
      const normalActivity: RealTimeActivity = {
        activity_type: 'page_view',
        metadata: { page: 'pricing' },
        value_score: 3
      // Mock cache to return existing score
      vi.spyOn(realTimeScoring as any, 'getCachedScore').mockReturnValue({
        intent_score: 75,
        booking_probability: 0.7,
        last_updated: Date.now(),
        version: 1
      const result = await realTimeScoring.processActivity('test-client', normalActivity)
      expect(result.update_reason).toBe('Queued for batch processing')
      expect(result.score_change).toBe(0) // No immediate change
      expect((realTimeScoring as unknown).processingQueue).toContain(normalActivity)
    test('should process urgent activities immediately regardless of value score', async () => {
      const urgentActivity: RealTimeActivity = {
        activity_type: 'phone_call_request',
        metadata: {},
        value_score: 5 // Not high value, but urgent type
      vi.spyOn(realTimeScoring as any, 'isUrgentActivity').mockReturnValue(true)
        previous_score: 60,
        new_score: 75,
        factors_changed: ['phone_call_request'],
        confidence: 0.8,
        update_reason: 'Activity: phone_call_request',
      const result = await realTimeScoring.processActivity('test-client', urgentActivity)
      expect((realTimeScoring as unknown).processActivityImmediate).toHaveBeenCalled()
  describe('Immediate Activity Processing', () => {
    test('should update scores and broadcast changes', async () => {
      const activity: RealTimeActivity = {
        activity_type: 'vendor_inquiry',
        metadata: { vendor_id: 'photographer-123' },
        value_score: 7
      const mockIntentScore: IntentScore = {
        score: 80,
        category: 'high',
        indicators: [
          {
            indicator_type: 'active_venue_search',
            strength: 8,
            description: 'Active vendor research',
            detected_at: new Date()
          }
        ],
        trend: 'increasing',
        last_updated: new Date()
      mockIntentScorer.calculateIntentScore.mockResolvedValue(mockIntentScore)
        intent_score: 70,
        booking_probability: 0.6,
        last_updated: Date.now() - 30000,
      vi.spyOn(realTimeScoring as any, 'storeActivity').mockResolvedValue(undefined)
      vi.spyOn(realTimeScoring as any, 'updateScoreCache').mockImplementation()
      vi.spyOn(realTimeScoring as any, 'broadcastScoreUpdate').mockResolvedValue(undefined)
      const result = await (realTimeScoring as unknown).processActivityImmediate('test-client', activity)
      expect(result.previous_score).toBe(70)
      expect(result.new_score).toBe(80)
      expect(result.score_change).toBe(10)
      expect(mockIntentScorer.calculateIntentScore).toHaveBeenCalledWith('test-client')
      expect((realTimeScoring as unknown).broadcastScoreUpdate).toHaveBeenCalled()
    test('should handle significant score changes', async () => {
        score: 90,
        category: 'very_high',
        indicators: [],
        intent_score: 60,
        booking_probability: 0.5,
      vi.spyOn(realTimeScoring as any, 'isSignificantScoreChange').mockReturnValue(true)
      vi.spyOn(realTimeScoring as any, 'handleSignificantScoreChange').mockResolvedValue(undefined)
      await (realTimeScoring as unknown).processActivityImmediate('test-client', activity)
      expect((realTimeScoring as unknown).handleSignificantScoreChange).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'test-client',
          score_change: 30
        }),
        mockIntentScore
      )
    test('should measure and warn about slow processing', async () => {
        value_score: 2
      // Mock slow operations
      mockIntentScorer.calculateIntentScore.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          score: 75,
          category: 'high',
          indicators: [],
          trend: 'stable',
          last_updated: new Date()
        }), 600)) // 600ms delay
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation()
      vi.spyOn(realTimeScoring as any, 'getCachedScore').mockReturnValue(null)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow real-time processing')
  describe('Batch Processing', () => {
    test('should process batched activities for multiple clients', async () => {
      const activities = [
        {
          client_id: 'client-1',
          activity_type: 'page_view',
          timestamp: new Date(),
          metadata: {},
          value_score: 3
        },
          activity_type: 'form_interaction',
          value_score: 4
          client_id: 'client-2',
          activity_type: 'vendor_inquiry',
          value_score: 6
        }
      ]
      // Add activities to processing queue
      ;(realTimeScoring as unknown).processingQueue.push(...activities)
      vi.spyOn(realTimeScoring as any, 'processBatchedActivities').mockResolvedValue(undefined)
      await (realTimeScoring as unknown).processQueueBatch()
      expect((realTimeScoring as unknown).processBatchedActivities).toHaveBeenCalledTimes(2) // Two clients
      expect((realTimeScoring as unknown).processingQueue).toHaveLength(0) // Queue should be empty
    test('should handle batch processing errors gracefully', async () => {
          client_id: 'error-client',
      vi.spyOn(realTimeScoring as any, 'processBatchedActivities').mockRejectedValue(new Error('Processing error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation()
      expect((realTimeScoring as unknown).isProcessing).toBe(false) // Should reset processing flag
    test('should process multiple activities for single client efficiently', async () => {
      const clientActivities = [
          client_id: 'batch-client',
          value_score: 2
          activity_type: 'pricing_view',
          value_score: 7
      await (realTimeScoring as unknown).processBatchedActivities('batch-client', clientActivities)
      expect(mockIntentScorer.calculateIntentScore).toHaveBeenCalledWith('batch-client')
      expect(mockBookingPredictor.predictBookingProbability).toHaveBeenCalledWith('batch-client')
      expect((realTimeScoring as unknown).storeActivity).toHaveBeenCalledTimes(3)
  describe('Score Change Analysis', () => {
    test('should identify significant score changes', () => {
      const significantChanges = [
        { previous_score: 60, new_score: 80, score_change: 20 }, // Large change
        { previous_score: 50, new_score: 65, score_change: 15 }, // Category boundary cross
        { previous_score: 75, new_score: 85, score_change: 10 }, // High to very high
      significantChanges.forEach(change => {
        const isSignificant = (realTimeScoring as unknown).isSignificantScoreChange(change)
        expect(isSignificant).toBe(true)
    test('should not flag minor score changes as significant', () => {
      const minorChanges = [
        { previous_score: 60, new_score: 65, score_change: 5 },
        { previous_score: 70, new_score: 75, score_change: 5 },
        { previous_score: 80, new_score: 82, score_change: 2 }
      minorChanges.forEach(change => {
        expect(isSignificant).toBe(false)
  describe('Caching System', () => {
    test('should cache and retrieve scores correctly', () => {
      const clientId = 'cache-test-client'
      const intentScore: IntentScore = {
        client_id: clientId,
        score: 75,
        trend: 'stable',
      ;(realTimeScoring as unknown).updateScoreCache(clientId, intentScore, 0.7)
      const cached = (realTimeScoring as unknown).getCachedScore(clientId)
      expect(cached).toBeTruthy()
      expect(cached.intent_score).toBe(75)
      expect(cached.booking_probability).toBe(0.7)
    test('should expire old cache entries', () => {
      const clientId = 'expired-client'
        score: 60,
        category: 'medium',
      // Manually set expired cache entry
      ;(realTimeScoring as unknown).scoreCache.set(clientId, {
        last_updated: Date.now() - 400000, // 6+ minutes ago (expired)
      expect(cached).toBeNull() // Should be null due to expiration
    test('should clean up cache when it gets too large', () => {
      const maxEntries = (realTimeScoring as unknown).config.caching.max_entries
      // Fill cache beyond limit
      for (let i = 0; i <= maxEntries + 10; i++) {
        ;(realTimeScoring as unknown).updateScoreCache(`client-${i}`, {
          client_id: `client-${i}`,
          score: 50,
          category: 'medium',
        }, 0.5)
      expect((realTimeScoring as unknown).scoreCache.size).toBeLessThanOrEqual(maxEntries)
  describe('WebSocket Broadcasting', () => {
    test('should broadcast score updates to connected clients', async () => {
      const mockWebSocketClients = [
          id: 'client-1',
          send: vi.fn(),
          readyState: 1 // WebSocket.OPEN
          id: 'client-2',
          readyState: 1
      realTimeScoring.setWebSocketClients(mockWebSocketClients)
      const scoreUpdate: ScoreUpdate = {
        factors_changed: ['vendor_inquiry'],
        update_reason: 'Activity: vendor_inquiry',
      await (realTimeScoring as unknown).broadcastScoreUpdate(scoreUpdate)
      mockWebSocketClients.forEach(client => {
        expect(client.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'score_update',
            ...scoreUpdate
          })
        )
    test('should handle WebSocket send errors gracefully', async () => {
          id: 'error-client',
          send: vi.fn().mockImplementation(() => {
            throw new Error('WebSocket send error')
          }),
        factors_changed: [],
        update_reason: 'Test update',
      expect(consoleSpy).toHaveBeenCalledWith('Error sending WebSocket message:', expect.any(Error))
  describe('Notification Triggers', () => {
    test('should trigger high intent notifications', async () => {
        client_id: 'high-intent-client',
            strength: 9,
            description: 'Very active research',
      await (realTimeScoring as unknown).triggerHighIntentNotification('high-intent-client', intentScore)
      expect(mockWebSocketClients[0].send).toHaveBeenCalledWith(
        expect.stringContaining('high_intent_notification')
    test('should trigger churn risk alerts', async () => {
        client_id: 'churn-risk-client',
        new_score: 45,
        score_change: -25,
        factors_changed: ['inactivity'],
        update_reason: 'Declining engagement',
      vi.spyOn(realTimeScoring['supabase'], 'from').mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      } as unknown)
      await (realTimeScoring as unknown).triggerChurnRiskAlert('churn-risk-client', scoreUpdate)
      expect(realTimeScoring['supabase'].from).toHaveBeenCalledWith('churn_risk_alerts')
  describe('Utility Methods', () => {
    test('should identify urgent activity types correctly', () => {
      const urgentActivities = [
        'booking_inquiry',
        'phone_call_request', 
        'urgent_message',
        'consultation_request',
        'contract_download'
      urgentActivities.forEach(activityType => {
        const activity: RealTimeActivity = {
          client_id: 'test',
          activity_type: activityType,
          value_score: 5
        const isUrgent = (realTimeScoring as unknown).isUrgentActivity(activity)
        expect(isUrgent).toBe(true)
    test('should not mark normal activities as urgent', () => {
      const normalActivities = ['page_view', 'form_interaction', 'document_download']
      normalActivities.forEach(activityType => {
        expect(isUrgent).toBe(false)
    test('should identify changed factors correctly', () => {
        client_id: 'test',
        value_score: 8
      const factors = (realTimeScoring as unknown).identifyChangedFactors(activity, 10)
      expect(factors).toContain('vendor_inquiry')
      expect(factors).toContain('positive_engagement')
      expect(factors).toContain('high_value_activity')
  describe('Public API Methods', () => {
    test('should return current score from cache or database', async () => {
      const clientId = 'api-test-client'
      // Test with cache hit
        intent_score: 80,
        version: 2
      const cachedResult = await realTimeScoring.getCurrentScore(clientId)
      expect(cachedResult.score).toBe(80)
      expect(cachedResult.source).toBe('cache')
      expect(cachedResult.version).toBe(2)
      // Test with cache miss
      const dbResult = await realTimeScoring.getCurrentScore(clientId)
      expect(dbResult.source).toBe('database')
      expect(dbResult.version).toBe(0)
    test('should simulate TensorFlow predictions', async () => {
      const features = {
        engagement_score: 0.8,
        response_time_avg: 300,
        vendor_inquiries: 5
      const prediction = await realTimeScoring.runTensorFlowPrediction(features)
      expect(prediction.booking_probability).toBeGreaterThanOrEqual(0.3)
      expect(prediction.booking_probability).toBeLessThanOrEqual(0.8)
      expect(prediction.confidence).toBeGreaterThanOrEqual(0.7)
      expect(prediction.model_version).toBe('1.0.0-tf')
      expect(prediction.inference_time).toBeGreaterThan(0)
    test('should provide fallback scoring when ML models fail', async () => {
        engagement_score: 75,
        response_time_avg: 600, // 10 minutes
        vendor_inquiries: 3
      const fallbackScore = await realTimeScoring.calculateFallbackScore(features)
      expect(fallbackScore.score).toBeGreaterThanOrEqual(0)
      expect(fallbackScore.score).toBeLessThanOrEqual(100)
      expect(fallbackScore.method).toBe('rule_based')
  describe('Cleanup and Resource Management', () => {
    test('should cleanup resources properly', async () => {
      // Add some data to cleanup
      ;(realTimeScoring as unknown).scoreCache.set('test-client', {
      ;(realTimeScoring as unknown).processingQueue.push({
      realTimeScoring.setWebSocketClients([
        { id: 'client-1', send: vi.fn(), readyState: 1 }
      ])
      await realTimeScoring.cleanup()
      expect((realTimeScoring as unknown).scoreCache.size).toBe(0)
      expect((realTimeScoring as unknown).processingQueue.length).toBe(0)
      expect((realTimeScoring as unknown).webSocketClients.length).toBe(0)
})
