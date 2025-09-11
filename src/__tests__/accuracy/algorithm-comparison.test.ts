import { TimelineCalculator } from '../../lib/timeline/calculator';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { Event, Vendor, Location, Resource } from '../../types/timeline';
import { 
  generateOptimalSchedules, 
  generateBenchmarkDataSet, 
  generateAccuracyValidationDataSet,
  OptimalSchedule 
} from './accuracy-test-data';

describe('Algorithm Comparison and Validation Tests', () => {
  let calculator: TimelineCalculator;
  
  beforeEach(() => {
    calculator = new TimelineCalculator();
  });
  describe('Manual vs Algorithmic Scheduling Comparison', () => {
    test('should match or improve upon manually optimized schedules', async () => {
      const manuallyOptimizedSchedules = generateOptimalSchedules();
      
      for (const schedule of manuallyOptimizedSchedules) {
        const algorithmicResult = await calculator.calculateTimeline(schedule.events);
        
        // Algorithm should not perform worse than manual optimization
        const algorithmicFitness = calculateFitnessScore(algorithmicResult);
        expect(algorithmicFitness).toBeGreaterThanOrEqual(schedule.expectedFitnessScore - 0.1); // 10% tolerance
        // Should not create more conflicts than manual schedule
        const criticalConflicts = algorithmicResult.overlaps.filter(o => o.severity === 'conflict');
        expect(criticalConflicts.length).toBeLessThanOrEqual(schedule.maxConflicts);
        console.log(`${schedule.name}: Manual=${schedule.expectedFitnessScore}, Algorithm=${algorithmicFitness.toFixed(3)}`);
      }
    });
    test('should improve suboptimal manual schedules', async () => {
      // Create intentionally suboptimal schedule
      const suboptimalEvents: Event[] = [
        {
          id: 'inefficient-prep',
          title: 'Inefficient Preparation',
          start: new Date('2024-06-01T08:00:00Z'), // Very early start
          end: new Date('2024-06-01T13:00:00Z'),   // 5 hours - too long
          duration: 300,
          type: 'preparation',
          priority: 2,
          location: 'distant-location',
          vendors: ['expensive-vendor'],
          resources: ['premium-equipment'],
          dependencies: [],
          flexibility: 0.8 // High flexibility allows optimization
        },
          id: 'ceremony',
          title: 'Wedding Ceremony',
          start: new Date('2024-06-01T14:00:00Z'),
          end: new Date('2024-06-01T15:00:00Z'),
          duration: 60,
          type: 'ceremony',
          priority: 5,
          location: 'ceremony-venue',
          vendors: ['photographer'],
          resources: ['sound-system'],
          dependencies: ['inefficient-prep'],
          flexibility: 0.1
          id: 'gap-filler',
          title: 'Unnecessary Gap',
          start: new Date('2024-06-01T16:00:00Z'), // 1 hour gap
          end: new Date('2024-06-01T16:30:00Z'),
          duration: 30,
          type: 'photos',
          priority: 1,
          resources: [],
          flexibility: 0.9 // Very flexible
          id: 'reception',
          title: 'Reception',
          start: new Date('2024-06-01T17:00:00Z'),
          end: new Date('2024-06-01T21:00:00Z'),
          duration: 240,
          type: 'reception',
          priority: 4,
          location: 'reception-venue',
          vendors: ['caterer', 'photographer'],
          resources: ['sound-system', 'lighting'],
          dependencies: ['ceremony'],
          flexibility: 0.3
        }
      ];
      const originalFitness = calculateSimpleFitness(suboptimalEvents);
      const optimizationResult = await calculator.optimizeWithGeneticAlgorithm(suboptimalEvents, {
        populationSize: 30,
        generations: 50,
        mutationRate: 0.1
      });
      // Algorithm should improve the schedule
      expect(optimizationResult.fitnessScore).toBeGreaterThan(originalFitness + 0.1);
      expect(optimizationResult.fitnessScore).toBeGreaterThan(0.6); // Should achieve decent score
      console.log(`Suboptimal improvement: ${originalFitness.toFixed(3)} -> ${optimizationResult.fitnessScore.toFixed(3)}`);
  describe('Algorithm Output Consistency', () => {
    test('should produce consistent results for identical inputs', async () => {
      const testEvents = generateBenchmarkDataSet('medium');
      const runs = 5;
      const results = [];
      for (let i = 0; i < runs; i++) {
        const result = await calculator.calculateTimeline([...testEvents]); // Fresh copy
        results.push(result);
      // All runs should detect same number of conflicts
      const conflictCounts = results.map(r => r.overlaps.filter(o => o.severity === 'conflict').length);
      const uniqueConflictCounts = new Set(conflictCounts);
      expect(uniqueConflictCounts.size).toBe(1); // All should be identical
      // Total duration should be consistent
      const durations = results.map(r => r.totalDuration);
      const uniqueDurations = new Set(durations);
      expect(uniqueDurations.size).toBe(1);
      // Event count should always be preserved
      results.forEach(result => {
        expect(result.events).toHaveLength(testEvents.length);
        expect(result.optimizedSchedule).toHaveLength(testEvents.length);
      console.log(`Consistency test: ${runs} runs all produced ${conflictCounts[0]} conflicts`);
    test('should handle edge cases consistently', async () => {
      const edgeCases = [
        { name: 'Empty Schedule', events: [] },
        { name: 'Single Event', events: generateBenchmarkDataSet('simple').slice(0, 1) },
        { name: 'All Same Time', events: generateBenchmarkDataSet('simple').slice(0, 5).map(e => ({
          ...e,
          end: new Date('2024-06-01T15:00:00Z')
        })) }
      for (const testCase of edgeCases) {
        const result = await calculator.calculateTimeline(testCase.events);
        // Should not crash and should preserve event count
        expect(result).toBeDefined();
        expect(result.events).toHaveLength(testCase.events.length);
        // Should provide meaningful results even for edge cases
        if (testCase.events.length > 0) {
          expect(result.totalDuration).toBeGreaterThanOrEqual(0);
          expect(result.optimizedSchedule).toHaveLength(testCase.events.length);
        console.log(`${testCase.name}: ${result.events.length} events, ${result.overlaps.length} overlaps`);
  describe('Benchmark Against Known Optimal Solutions', () => {
    test('should approach optimal solutions for classical scheduling problems', async () => {
      // Interval scheduling problem - should find optimal non-overlapping subset
      const intervalSchedulingEvents: Event[] = [
        { id: 'e1', title: 'Event 1', start: new Date('2024-06-01T09:00:00Z'), end: new Date('2024-06-01T10:00:00Z'), duration: 60, type: 'ceremony', priority: 1, dependencies: [], flexibility: 0.1 },
        { id: 'e2', title: 'Event 2', start: new Date('2024-06-01T09:30:00Z'), end: new Date('2024-06-01T11:00:00Z'), duration: 90, type: 'photos', priority: 2, dependencies: [], flexibility: 0.1 },
        { id: 'e3', title: 'Event 3', start: new Date('2024-06-01T10:30:00Z'), end: new Date('2024-06-01T11:30:00Z'), duration: 60, type: 'reception', priority: 3, dependencies: [], flexibility: 0.1 },
        { id: 'e4', title: 'Event 4', start: new Date('2024-06-01T11:00:00Z'), end: new Date('2024-06-01T12:00:00Z'), duration: 60, type: 'preparation', priority: 4, dependencies: [], flexibility: 0.1 },
        { id: 'e5', title: 'Event 5', start: new Date('2024-06-01T11:30:00Z'), end: new Date('2024-06-01T12:30:00Z'), duration: 60, type: 'photos', priority: 5, dependencies: [], flexibility: 0.1 }
      const result = await calculator.optimizeWithGeneticAlgorithm(intervalSchedulingEvents, {
        populationSize: 50,
        generations: 100,
        mutationRate: 0.05
      // Optimal solution should select events 1, 4, 5 (no overlaps, maximum priority sum = 10)
      const nonOverlapping = findNonOverlappingEvents(result.optimizedEvents);
      const maxPossiblePrioritySum = 10; // Events 1(1) + 4(4) + 5(5)
      const actualPrioritySum = nonOverlapping.reduce((sum, e) => sum + e.priority, 0);
      const optimality = actualPrioritySum / maxPossiblePrioritySum;
      expect(optimality).toBeGreaterThan(0.8); // Should achieve at least 80% of optimal
      expect(result.fitnessScore).toBeGreaterThan(0.7);
      console.log(`Interval scheduling: ${actualPrioritySum}/${maxPossiblePrioritySum} priority (${(optimality*100).toFixed(1)}%)`);
    test('should solve resource allocation problems efficiently', async () => {
      // Multi-resource scheduling problem
      const resources: Resource[] = [
          id: 'sound-system',
          name: 'Sound System',
          type: 'sound_system',
          quantity: 2, // Only 2 available
          availability: [{ start: new Date('2024-06-01T08:00:00Z'), end: new Date('2024-06-01T20:00:00Z') }],
          setupTime: 15,
          breakdownTime: 10,
          transportable: true,
          cost: 500
      // 4 events competing for 2 sound systems
      const resourceEvents: Event[] = [
          title: 'Ceremony',
          location: 'chapel',
          flexibility: 0.2
          id: 'cocktails',
          title: 'Cocktail Hour',
          start: new Date('2024-06-01T14:30:00Z'),
          end: new Date('2024-06-01T15:30:00Z'),
          priority: 3,
          location: 'patio',
          flexibility: 0.6
          start: new Date('2024-06-01T16:00:00Z'),
          end: new Date('2024-06-01T20:00:00Z'),
          location: 'ballroom',
          id: 'after-party',
          title: 'After Party',
          start: new Date('2024-06-01T19:00:00Z'),
          end: new Date('2024-06-01T22:00:00Z'),
          duration: 180,
          location: 'lounge',
          flexibility: 0.7
      const result = await calculator.resolveResourceConflicts(resourceEvents, resources);
      const soundSystemAllocation = result.conflictResolution.find(r => r.resource === 'sound-system');
      expect(soundSystemAllocation).toBeDefined();
      // Should allocate to highest priority events that fit
      // Optimal: Ceremony (5) + Reception (4) = 9 priority points
      const allocatedEvents = soundSystemAllocation!.assignments;
      expect(allocatedEvents.length).toBeLessThanOrEqual(4); // Can't exceed total events
      // Check no more than 2 simultaneous allocations
      let maxConcurrent = 0;
      for (const assignment of allocatedEvents) {
        let concurrent = 1;
        for (const other of allocatedEvents) {
          if (assignment === other) continue;
          if (assignment.timeSlot.start < other.timeSlot.end && 
              assignment.timeSlot.end > other.timeSlot.start) {
            concurrent++;
          }
        maxConcurrent = Math.max(maxConcurrent, concurrent);
      expect(maxConcurrent).toBeLessThanOrEqual(2); // Resource constraint
      console.log(`Resource allocation: ${allocatedEvents.length} assignments, max ${maxConcurrent} concurrent`);
  describe('Algorithm Accuracy Metrics', () => {
    test('should achieve high accuracy on validation dataset', async () => {
      const validationDataSets = generateAccuracyValidationDataSet();
      const accuracyResults = [];
      for (const dataSet of validationDataSets) {
        const result = await calculator.calculateTimeline(dataSet.events);
        const actualConflicts = result.overlaps.filter(o => o.severity === 'conflict').length;
        const actualWarnings = result.overlaps.filter(o => o.severity === 'warning').length;
        const actualFitness = calculateFitnessScore(result);
        const accuracy = {
          name: dataSet.name,
          conflictAccuracy: Math.abs(actualConflicts - dataSet.expectedResults.conflictCount) <= 1, // ±1 tolerance
          warningAccuracy: Math.abs(actualWarnings - dataSet.expectedResults.warningCount) <= 2, // ±2 tolerance
          fitnessAccuracy: actualFitness >= dataSet.expectedResults.minFitnessScore,
          feasibilityAccuracy: (result.alternativeSchedules.length > 0) === dataSet.expectedResults.feasibleSchedule,
          actualResults: {
            conflicts: actualConflicts,
            warnings: actualWarnings,
            fitness: actualFitness
        };
        accuracyResults.push(accuracy);
        console.log(`${dataSet.name}: C:${actualConflicts}/${dataSet.expectedResults.conflictCount}, W:${actualWarnings}/${dataSet.expectedResults.warningCount}, F:${actualFitness.toFixed(3)}`);
      // Calculate overall accuracy metrics
      const overallAccuracy = {
        conflictAccuracy: accuracyResults.filter(r => r.conflictAccuracy).length / accuracyResults.length,
        warningAccuracy: accuracyResults.filter(r => r.warningAccuracy).length / accuracyResults.length,
        fitnessAccuracy: accuracyResults.filter(r => r.fitnessAccuracy).length / accuracyResults.length,
        feasibilityAccuracy: accuracyResults.filter(r => r.feasibilityAccuracy).length / accuracyResults.length
      };
      // Should achieve high accuracy across all metrics
      expect(overallAccuracy.conflictAccuracy).toBeGreaterThan(0.75); // 75% accuracy
      expect(overallAccuracy.fitnessAccuracy).toBeGreaterThan(0.75);
      expect(overallAccuracy.feasibilityAccuracy).toBeGreaterThan(0.75);
      console.log(`Overall accuracy: Conflicts ${(overallAccuracy.conflictAccuracy*100).toFixed(1)}%, Fitness ${(overallAccuracy.fitnessAccuracy*100).toFixed(1)}%`);
    test('should provide accurate confidence intervals', async () => {
      const runs = 10;
      const fitnessScores = [];
      const conflictCounts = [];
        const result = await calculator.calculateTimeline([...testEvents]);
        fitnessScores.push(calculateFitnessScore(result));
        conflictCounts.push(result.overlaps.filter(o => o.severity === 'conflict').length);
      // Calculate statistical measures
      const meanFitness = fitnessScores.reduce((a, b) => a + b, 0) / fitnessScores.length;
      const stdFitness = Math.sqrt(fitnessScores.reduce((sq, f) => sq + Math.pow(f - meanFitness, 2), 0) / fitnessScores.length);
      const meanConflicts = conflictCounts.reduce((a, b) => a + b, 0) / conflictCounts.length;
      const stdConflicts = Math.sqrt(conflictCounts.reduce((sq, c) => sq + Math.pow(c - meanConflicts, 2), 0) / conflictCounts.length);
      // Algorithm should be stable (low standard deviation)
      expect(stdFitness / meanFitness).toBeLessThan(0.1); // Coefficient of variation < 10%
      expect(stdConflicts).toBeLessThan(2); // Standard deviation < 2 conflicts
      console.log(`Stability: Fitness ${meanFitness.toFixed(3)}±${stdFitness.toFixed(3)}, Conflicts ${meanConflicts.toFixed(1)}±${stdConflicts.toFixed(1)}`);
});
// Helper functions
function calculateFitnessScore(result: any): number {
  let fitness = 1.0;
  // Penalize conflicts
  const conflictPenalty = (result.overlaps?.filter((o: any) => o.severity === 'conflict').length || 0) * 0.15;
  const warningPenalty = (result.overlaps?.filter((o: any) => o.severity === 'warning').length || 0) * 0.05;
  fitness -= conflictPenalty + warningPenalty;
  // Penalize resource conflicts
  const resourcePenalty = (result.resourceConflicts?.length || 0) * 0.1;
  fitness -= resourcePenalty;
  // Reward compactness (shorter total duration is better)
  if (result.totalDuration && result.totalDuration > 0) {
    const compactnessBonus = Math.min(0.1, 480 / result.totalDuration); // 8 hours baseline
    fitness += compactnessBonus;
  }
  return Math.max(0, Math.min(1, fitness));
}
function calculateSimpleFitness(events: Event[]): number {
  // Simple fitness based on total duration and flexibility
  if (events.length === 0) return 0;
  const totalDuration = events.reduce((sum, e) => sum + e.duration, 0);
  const avgFlexibility = events.reduce((sum, e) => sum + (e.flexibility || 0.5), 0) / events.length;
  // Prefer shorter duration and higher flexibility
  const durationScore = Math.max(0, 1 - totalDuration / 1440); // 24 hours max
  const flexibilityScore = avgFlexibility;
  return (durationScore + flexibilityScore) / 2;
function findNonOverlappingEvents(events: Event[]): Event[] {
  // Greedy algorithm to find maximum weight independent set (approximation)
  const sortedEvents = [...events].sort((a, b) => {
    // Sort by end time, then by priority
    const endDiff = a.end.getTime() - b.end.getTime();
    return endDiff !== 0 ? endDiff : b.priority - a.priority;
  const selected: Event[] = [];
  let lastEndTime = 0;
  for (const event of sortedEvents) {
    if (event.start.getTime() >= lastEndTime) {
      selected.push(event);
      lastEndTime = event.end.getTime();
    }
  return selected;
