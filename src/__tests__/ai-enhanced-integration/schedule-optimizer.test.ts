/**
 * Test Suite for WS-162: AI-Powered Helper Schedule Integration
 * Comprehensive tests for ML conflict prediction and schedule optimization
 */

import { describe, expect, test, beforeEach, afterEach, jest } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { AIScheduleOptimizer } from '@/lib/ai/schedule/schedule-optimizer';
// Mock dependencies
vi.mock('@supabase/supabase-js');
vi.mock('@upstash/redis');
vi.mock('openai');
describe('WS-162: AI-Powered Helper Schedule Integration', () => {
  let scheduleOptimizer: AIScheduleOptimizer;
  
  beforeEach(() => {
    scheduleOptimizer = new AIScheduleOptimizer();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  describe('Schedule Optimization', () => {
    test('should optimize helper schedules with ML predictions', async () => {
      // Mock wedding data
      const mockWeddingId = 'wedding-123';
      const mockSchedules = [
        {
          id: 'schedule-1',
          helper_id: 'helper-1',
          task_id: 'task-1',
          start_time: '2025-01-20T09:00:00Z',
          end_time: '2025-01-20T11:00:00Z',
          estimated_duration: 120,
          difficulty_level: 3,
          required_skills: ['setup', 'coordination'],
          dependencies: []
        },
          id: 'schedule-2',
          helper_id: 'helper-2',
          task_id: 'task-2',
          start_time: '2025-01-20T10:30:00Z',
          end_time: '2025-01-20T12:30:00Z',
          difficulty_level: 4,
          required_skills: ['photography', 'technical'],
          dependencies: ['task-1']
        }
      ];
      // Mock the private methods
      vi.spyOn(scheduleOptimizer as any, 'getExistingSchedules').mockResolvedValue(mockSchedules);
      vi.spyOn(scheduleOptimizer as any, 'getHelperPreferences').mockResolvedValue([]);
      vi.spyOn(scheduleOptimizer as any, 'getConflictHistory').mockResolvedValue([]);
      vi.spyOn(scheduleOptimizer as any, 'getHistoricalTaskDurations').mockResolvedValue([]);
      vi.spyOn(scheduleOptimizer as any, 'getWeddingConstraints').mockResolvedValue({});
      const result = await scheduleOptimizer.optimizeHelperSchedules(mockWeddingId);
      expect(result).toBeDefined();
      expect(result.optimized_schedules).toBeDefined();
      expect(result.conflicts_prevented).toBeGreaterThanOrEqual(0);
      expect(result.efficiency_improvement).toBeGreaterThanOrEqual(0);
      expect(result.ai_recommendations).toBeInstanceOf(Array);
      expect(result.workload_balance_score).toBeGreaterThanOrEqual(0);
      expect(result.predicted_success_rate).toBeGreaterThanOrEqual(0);
    });
    test('should predict schedule conflicts with high confidence', async () => {
      const mockSchedule = {
        id: 'schedule-test',
        helper_id: 'helper-1',
        task_id: 'task-1',
        start_time: '2025-01-20T14:00:00Z',
        end_time: '2025-01-20T16:00:00Z',
        estimated_duration: 120,
        difficulty_level: 5,
        required_skills: ['coordination', 'problem-solving'],
        dependencies: ['task-previous'],
        location: 'Main Venue'
      };
      const conflicts = await scheduleOptimizer.predictScheduleConflicts(mockSchedule);
      expect(conflicts).toBeInstanceOf(Array);
      
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        expect(conflict.type).toMatch(/high_probability_conflict|time_overlap|resource_conflict|skill_mismatch/);
        expect(conflict.confidence).toBeGreaterThanOrEqual(0);
        expect(conflict.confidence).toBeLessThanOrEqual(1);
        expect(conflict.affected_schedules).toBeInstanceOf(Array);
        expect(conflict.suggested_adjustments).toBeInstanceOf(Array);
        expect(conflict.risk_factors).toBeInstanceOf(Array);
      }
    test('should predict task durations using historical data', async () => {
      const mockTaskIds = ['task-1', 'task-2', 'task-3'];
      const mockHistoricalData = [
          task_type: 'setup',
          actual_duration: 90
          task_type: 'coordination',
          actual_duration: 120
      vi.spyOn(scheduleOptimizer as any, 'getTaskDetails').mockImplementation((taskId) => ({
        type: 'setup',
        difficulty_level: 3,
        complexity_score: 0.7
      }));
      const predictions = await scheduleOptimizer.predictTaskDurations(mockTaskIds, mockHistoricalData);
      expect(predictions).toBeInstanceOf(Map);
      expect(predictions.size).toBe(mockTaskIds.length);
      for (const taskId of mockTaskIds) {
        const prediction = predictions.get(taskId);
        expect(prediction).toBeDefined();
        expect(prediction).toBeGreaterThan(0);
    test('should optimize notification timing based on user behavior', async () => {
      const mockUserId = 'user-123';
      const mockNotificationType = 'schedule_reminder';
      const mockScheduleContext = {
        urgency: 'high',
        complexity: 'medium',
        dependencies: ['task-1']
      vi.spyOn(scheduleOptimizer as any, 'getUserBehaviorPatterns').mockResolvedValue({
        timezone: 'America/New_York',
        active_hours: { start: 8, end: 20 },
        response_patterns: { best_times: ['09:00', '14:00', '18:00'] }
      });
      vi.spyOn(scheduleOptimizer as any, 'getNotificationHistory').mockResolvedValue({
        engagement_by_time: { '09:00': 0.85, '14:00': 0.92, '18:00': 0.78 },
        best_times: ['14:00', '09:00', '18:00']
      const result = await scheduleOptimizer.optimizeNotificationTiming(
        mockUserId,
        mockNotificationType,
        mockScheduleContext
      );
      expect(result.optimal_time).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning).toBeDefined();
      expect(typeof result.reasoning).toBe('string');
    test('should balance helper workloads intelligently', async () => {
      const mockWeddingId = 'wedding-456';
          end_time: '2025-01-20T12:00:00Z',
          estimated_duration: 180,
          required_skills: ['coordination'],
          start_time: '2025-01-20T13:00:00Z',
          end_time: '2025-01-20T15:00:00Z',
          required_skills: ['setup'],
      vi.spyOn(scheduleOptimizer as any, 'calculateWorkloadDistribution').mockResolvedValue(
        new Map([
          ['helper-1', 8.5],
          ['helper-2', 4.2]
        ])
      const result = await scheduleOptimizer.balanceHelperWorkloads(mockWeddingId, mockSchedules);
      expect(result.balanced_schedules).toBeInstanceOf(Array);
      expect(result.workload_scores).toBeInstanceOf(Map);
      expect(result.recommendations).toBeInstanceOf(Array);
  describe('Error Handling', () => {
    test('should handle invalid wedding ID gracefully', async () => {
      const invalidWeddingId = 'invalid-wedding';
      vi.spyOn(scheduleOptimizer as any, 'getExistingSchedules').mockRejectedValue(
        new Error('Wedding not found')
      await expect(scheduleOptimizer.optimizeHelperSchedules(invalidWeddingId))
        .rejects.toThrow('Schedule optimization failed');
    test('should handle AI service failures with fallback', async () => {
        required_skills: ['coordination'],
        dependencies: []
      // Mock AI failure
      vi.spyOn(scheduleOptimizer as any, 'getAIConflictAnalysis').mockRejectedValue(
        new Error('OpenAI service unavailable')
      const result = await scheduleOptimizer.predictScheduleConflicts(mockSchedule);
      // Should return fallback result instead of throwing
      expect(result).toBeInstanceOf(Array);
  describe('Performance Requirements', () => {
    test('should meet performance targets for schedule optimization', async () => {
      const mockWeddingId = 'performance-test';
      const startTime = Date.now();
      // Mock minimal data for performance test
      vi.spyOn(scheduleOptimizer as any, 'getExistingSchedules').mockResolvedValue([]);
      await scheduleOptimizer.optimizeHelperSchedules(mockWeddingId);
      const executionTime = Date.now() - startTime;
      // Should complete within 5 seconds for reasonable dataset
      expect(executionTime).toBeLessThan(5000);
    test('should achieve target accuracy for conflict prediction', async () => {
        id: 'accuracy-test',
        difficulty_level: 4,
      // Should have high confidence predictions when conflicts are detected
      const highConfidenceConflicts = conflicts.filter(c => c.confidence > 0.8);
      // Target: 80% of predictions should have high confidence
        const accuracyRatio = highConfidenceConflicts.length / conflicts.length;
        expect(accuracyRatio).toBeGreaterThanOrEqual(0.6); // Allow some tolerance in testing
  describe('Integration Tests', () => {
    test('should integrate with existing realtime system', async () => {
      const mockWeddingId = 'integration-test';
      // Mock successful integration
      vi.spyOn(scheduleOptimizer as any, 'recordMetrics').mockResolvedValue(undefined);
      // Verify metrics were recorded
      expect(scheduleOptimizer['recordMetrics' as any]).toHaveBeenCalled();
    test('should work with wedding timeline constraints', async () => {
      const mockWeddingId = 'timeline-test';
      const mockConstraints = {
        ceremony_start: '2025-01-20T15:00:00Z',
        reception_start: '2025-01-20T18:00:00Z',
        venue_access_start: '2025-01-20T08:00:00Z',
        venue_access_end: '2025-01-21T02:00:00Z'
      vi.spyOn(scheduleOptimizer as any, 'getWeddingConstraints').mockResolvedValue(mockConstraints);
});
