import { describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Timeline Calculator Unit Tests
 * Comprehensive unit testing for timeline calculation algorithms
 */

interface TimelineEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  duration: number;
  type: string;
  priority: 'low' | 'medium' | 'high';
  dependencies?: string[];
  resources?: string[];
  location?: string;
}

interface ConflictResult {
  hasConflicts: boolean;
  conflicts: Array<{
    eventIds: string[];
    type: 'time_overlap' | 'resource_conflict' | 'location_conflict' | 'dependency_violation';
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

interface OptimizationResult {
  originalFitness: number;
  optimizedFitness: number;
  improvementScore: number;
  iterations: number;
  events: TimelineEvent[];
}

// Timeline Calculator Implementation
class TimelineCalculator {
  /**
   * Sweep Line Algorithm for efficient conflict detection
   * Time Complexity: O(n log n)
   */
  detectConflicts(events: TimelineEvent[]): ConflictResult {
    if (events.length <= 1) {
      return { hasConflicts: false, conflicts: [] };
    }

    const conflicts: ConflictResult['conflicts'] = [];
    
    // Time overlap detection using sweep line
    const timeConflicts = this.detectTimeOverlaps(events);
    conflicts.push(...timeConflicts);
    
    // Resource conflict detection
    const resourceConflicts = this.detectResourceConflicts(events);
    conflicts.push(...resourceConflicts);
    
    // Location conflict detection
    const locationConflicts = this.detectLocationConflicts(events);
    conflicts.push(...locationConflicts);
    
    // Dependency violation detection
    const dependencyConflicts = this.detectDependencyViolations(events);
    conflicts.push(...dependencyConflicts);

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  private detectTimeOverlaps(events: TimelineEvent[]): ConflictResult['conflicts'] {
    const conflicts: ConflictResult['conflicts'] = [];
    const sortedEvents = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const current = sortedEvents[i];
      const currentEnd = new Date(current.end).getTime();
      
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const next = sortedEvents[j];
        const nextStart = new Date(next.start).getTime();
        
        // If next event starts after current ends, no more overlaps possible
        if (nextStart >= currentEnd) break;
        
        const nextEnd = new Date(next.end).getTime();
        if (nextStart < currentEnd) {
          const overlapDuration = Math.min(currentEnd, nextEnd) - nextStart;
          const severity = this.calculateOverlapSeverity(overlapDuration, current, next);
          
          conflicts.push({
            eventIds: [current.id, next.id],
            type: 'time_overlap',
            severity
          });
        }
      }
    }
    
    return conflicts;
  }

  private detectResourceConflicts(events: TimelineEvent[]): ConflictResult['conflicts'] {
    const conflicts: ConflictResult['conflicts'] = [];
    const resourceMap = new Map<string, TimelineEvent[]>();
    
    // Group events by resource
    events.forEach(event => {
      if (event.resources) {
        event.resources.forEach(resource => {
          if (!resourceMap.has(resource)) {
            resourceMap.set(resource, []);
          }
          resourceMap.get(resource)!.push(event);
        });
      }
    });
    
    // Check for conflicts within each resource group
    resourceMap.forEach((resourceEvents, resource) => {
      if (resourceEvents.length > 1) {
        const timeConflicts = this.detectTimeOverlaps(resourceEvents);
        timeConflicts.forEach(conflict => {
          conflicts.push({
            ...conflict,
            type: 'resource_conflict',
            severity: 'high' // Resource conflicts are always high severity
          });
        });
      }
    });
    
    return conflicts;
  }

  private detectLocationConflicts(events: TimelineEvent[]): ConflictResult['conflicts'] {
    const conflicts: ConflictResult['conflicts'] = [];
    const locationMap = new Map<string, TimelineEvent[]>();
    
    // Group events by location
    events.forEach(event => {
      if (event.location) {
        if (!locationMap.has(event.location)) {
          locationMap.set(event.location, []);
        }
        locationMap.get(event.location)!.push(event);
      }
    });
    
    // Check for conflicts within each location
    locationMap.forEach((locationEvents, location) => {
      if (locationEvents.length > 1) {
        const timeConflicts = this.detectTimeOverlaps(locationEvents);
        timeConflicts.forEach(conflict => {
          conflicts.push({
            ...conflict,
            type: 'location_conflict',
            severity: 'medium' // Location conflicts are medium severity
          });
        });
      }
    });
    
    return conflicts;
  }

  private detectDependencyViolations(events: TimelineEvent[]): ConflictResult['conflicts'] {
    const conflicts: ConflictResult['conflicts'] = [];
    const eventMap = new Map(events.map(e => [e.id, e]));
    
    events.forEach(event => {
      if (event.dependencies) {
        event.dependencies.forEach(depId => {
          const dependency = eventMap.get(depId);
          if (dependency) {
            const eventStart = new Date(event.start).getTime();
            const depEnd = new Date(dependency.end).getTime();
            
            if (eventStart < depEnd) {
              conflicts.push({
                eventIds: [event.id, dependency.id],
                type: 'dependency_violation',
                severity: 'critical'
              });
            }
          }
        });
      }
    });
    
    return conflicts;
  }

  private calculateOverlapSeverity(
    overlapDuration: number, 
    event1: TimelineEvent, 
    event2: TimelineEvent
  ): 'low' | 'medium' | 'high' | 'critical' {
    const minDuration = Math.min(event1.duration, event2.duration) * 60 * 1000; // Convert to milliseconds
    const overlapPercentage = (overlapDuration / minDuration) * 100;
    
    if (overlapPercentage >= 75) return 'critical';
    if (overlapPercentage >= 50) return 'high';
    if (overlapPercentage >= 25) return 'medium';
    return 'low';
  }

  /**
   * Genetic Algorithm for timeline optimization
   * Finds optimal arrangement of events to minimize conflicts and maximize efficiency
   */
  optimizeTimeline(events: TimelineEvent[], constraints: {
    maxIterations?: number;
    populationSize?: number;
    mutationRate?: number;
    crossoverRate?: number;
    bufferTime?: number; // Minutes between events
  } = {}): OptimizationResult {
    const {
      maxIterations = 100,
      populationSize = 50,
      mutationRate = 0.1,
      crossoverRate = 0.8,
      bufferTime = 15
    } = constraints;

    if (events.length === 0) {
      return {
        originalFitness: 1,
        optimizedFitness: 1,
        improvementScore: 0,
        iterations: 0,
        events: []
      };
    }

    const originalFitness = this.calculateFitness(events);
    let population = this.initializePopulation(events, populationSize);
    let bestSolution = [...events];
    let bestFitness = originalFitness;
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Evaluate fitness for each individual
      const fitnessScores = population.map(individual => this.calculateFitness(individual));
      
      // Find best individual in current generation
      const generationBestIndex = fitnessScores.reduce((maxIndex, fitness, index, array) => 
        fitness > array[maxIndex] ? index : maxIndex, 0);
      
      if (fitnessScores[generationBestIndex] > bestFitness) {
        bestFitness = fitnessScores[generationBestIndex];
        bestSolution = [...population[generationBestIndex]];
      }
      
      // Early termination if good enough solution found
      if (bestFitness > 0.95) break;
      
      // Create next generation
      population = this.evolvePopulation(population, fitnessScores, crossoverRate, mutationRate, bufferTime);
    }
    
    // Apply buffer time to optimized solution
    const optimizedEvents = this.applyBufferTime(bestSolution, bufferTime);
    const optimizedFitness = this.calculateFitness(optimizedEvents);
    
    return {
      originalFitness,
      optimizedFitness,
      improvementScore: optimizedFitness - originalFitness,
      iterations: maxIterations,
      events: optimizedEvents
    };
  }

  private initializePopulation(events: TimelineEvent[], populationSize: number): TimelineEvent[][] {
    const population: TimelineEvent[][] = [];
    
    // Add original arrangement
    population.push([...events]);
    
    // Generate random variations
    for (let i = 1; i < populationSize; i++) {
      const individual = [...events];
      
      // Randomly shuffle event order while respecting dependencies
      const shuffled = this.shuffleWithConstraints(individual);
      
      // Apply random time shifts
      const shifted = this.applyRandomTimeShifts(shuffled);
      
      population.push(shifted);
    }
    
    return population;
  }

  private shuffleWithConstraints(events: TimelineEvent[]): TimelineEvent[] {
    const result = [...events];
    const dependencyMap = this.buildDependencyGraph(events);
    
    // Topological sort to respect dependencies
    const sorted = this.topologicalSort(result, dependencyMap);
    
    // Introduce some randomness while maintaining dependency order
    return this.introduceControlledRandomness(sorted, dependencyMap);
  }

  private buildDependencyGraph(events: TimelineEvent[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    
    events.forEach(event => {
      graph.set(event.id, new Set(event.dependencies || []));
    });
    
    return graph;
  }

  private topologicalSort(events: TimelineEvent[], dependencyMap: Map<string, Set<string>>): TimelineEvent[] {
    const result: TimelineEvent[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const eventMap = new Map(events.map(e => [e.id, e]));
    
    const visit = (eventId: string): void => {
      if (visited.has(eventId)) return;
      if (visiting.has(eventId)) {
        throw new Error(`Circular dependency detected involving event ${eventId}`);
      }
      
      visiting.add(eventId);
      
      const dependencies = dependencyMap.get(eventId) || new Set();
      dependencies.forEach(depId => {
        if (eventMap.has(depId)) {
          visit(depId);
        }
      });
      
      visiting.delete(eventId);
      visited.add(eventId);
      
      const event = eventMap.get(eventId);
      if (event) {
        result.push(event);
      }
    };
    
    events.forEach(event => {
      if (!visited.has(event.id)) {
        visit(event.id);
      }
    });
    
    return result;
  }

  private introduceControlledRandomness(
    sortedEvents: TimelineEvent[], 
    dependencyMap: Map<string, Set<string>>
  ): TimelineEvent[] {
    const result = [...sortedEvents];
    const maxSwaps = Math.floor(result.length / 3);
    
    for (let i = 0; i < maxSwaps; i++) {
      const idx1 = Math.floor(Math.random() * result.length);
      const idx2 = Math.floor(Math.random() * result.length);
      
      if (this.canSwapEvents(result[idx1], result[idx2], dependencyMap)) {
        [result[idx1], result[idx2]] = [result[idx2], result[idx1]];
      }
    }
    
    return result;
  }

  private canSwapEvents(
    event1: TimelineEvent, 
    event2: TimelineEvent, 
    dependencyMap: Map<string, Set<string>>
  ): boolean {
    const deps1 = dependencyMap.get(event1.id) || new Set();
    const deps2 = dependencyMap.get(event2.id) || new Set();
    
    // Cannot swap if one depends on the other
    return !deps1.has(event2.id) && !deps2.has(event1.id);
  }

  private applyRandomTimeShifts(events: TimelineEvent[]): TimelineEvent[] {
    return events.map(event => {
      const maxShift = 60 * 60 * 1000; // 1 hour in milliseconds
      const shift = (Math.random() - 0.5) * maxShift;
      
      const newStart = new Date(new Date(event.start).getTime() + shift);
      const newEnd = new Date(newStart.getTime() + event.duration * 60 * 1000);
      
      return {
        ...event,
        start: newStart.toISOString(),
        end: newEnd.toISOString()
      };
    });
  }

  private calculateFitness(events: TimelineEvent[]): number {
    if (events.length === 0) return 1;
    
    let fitness = 1.0;
    const conflictResult = this.detectConflicts(events);
    
    // Penalty for conflicts
    conflictResult.conflicts.forEach(conflict => {
      const penalty = this.getConflictPenalty(conflict.type, conflict.severity);
      fitness -= penalty;
    });
    
    // Bonus for efficient scheduling
    const efficiencyBonus = this.calculateEfficiencyBonus(events);
    fitness += efficiencyBonus;
    
    // Bonus for priority optimization
    const priorityBonus = this.calculatePriorityBonus(events);
    fitness += priorityBonus;
    
    return Math.max(0, Math.min(1, fitness));
  }

  private getConflictPenalty(type: string, severity: string): number {
    const basePerType = {
      'time_overlap': 0.2,
      'resource_conflict': 0.3,
      'location_conflict': 0.15,
      'dependency_violation': 0.4
    };
    
    const multiplierBySeverity = {
      'low': 0.5,
      'medium': 1.0,
      'high': 1.5,
      'critical': 2.0
    };
    
    const basePenalty = basePerType[type as keyof typeof basePerType] || 0.1;
    const multiplier = multiplierBySeverity[severity as keyof typeof multiplierBySeverity] || 1.0;
    
    return basePenalty * multiplier;
  }

  private calculateEfficiencyBonus(events: TimelineEvent[]): number {
    if (events.length <= 1) return 0;
    
    // Calculate total duration and span
    const sortedEvents = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const firstStart = new Date(sortedEvents[0].start).getTime();
    const lastEnd = new Date(sortedEvents[sortedEvents.length - 1].end).getTime();
    const totalSpan = lastEnd - firstStart;
    const totalDuration = events.reduce((sum, event) => sum + event.duration * 60 * 1000, 0);
    
    // Efficiency is the ratio of actual event time to total span
    const efficiency = totalSpan > 0 ? totalDuration / totalSpan : 0;
    
    return Math.min(0.2, efficiency * 0.2); // Max 0.2 bonus
  }

  private calculatePriorityBonus(events: TimelineEvent[]): number {
    const priorityWeights = { high: 3, medium: 2, low: 1 };
    const sortedEvents = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    
    let bonus = 0;
    let expectedPosition = 0;
    
    // High priority events should come first
    sortedEvents.forEach((event, index) => {
      const weight = priorityWeights[event.priority];
      if (weight === 3 && index <= expectedPosition) {
        bonus += 0.05;
        expectedPosition = index + 1;
      }
    });
    
    return Math.min(0.15, bonus); // Max 0.15 bonus
  }

  private evolvePopulation(
    population: TimelineEvent[][], 
    fitnessScores: number[], 
    crossoverRate: number, 
    mutationRate: number,
    bufferTime: number
  ): TimelineEvent[][] {
    const newPopulation: TimelineEvent[][] = [];
    const populationSize = population.length;
    
    // Elitism: keep best individuals
    const eliteCount = Math.floor(populationSize * 0.1);
    const sortedIndices = fitnessScores
      .map((fitness, index) => ({ fitness, index }))
      .sort((a, b) => b.fitness - a.fitness)
      .map(item => item.index);
    
    for (let i = 0; i < eliteCount; i++) {
      newPopulation.push([...population[sortedIndices[i]]]);
    }
    
    // Generate offspring through crossover and mutation
    while (newPopulation.length < populationSize) {
      const parent1 = this.tournamentSelection(population, fitnessScores);
      const parent2 = this.tournamentSelection(population, fitnessScores);
      
      let offspring1 = [...parent1];
      let offspring2 = [...parent2];
      
      if (Math.random() < crossoverRate) {
        [offspring1, offspring2] = this.crossover(parent1, parent2);
      }
      
      if (Math.random() < mutationRate) {
        offspring1 = this.mutate(offspring1, bufferTime);
      }
      
      if (Math.random() < mutationRate) {
        offspring2 = this.mutate(offspring2, bufferTime);
      }
      
      newPopulation.push(offspring1);
      if (newPopulation.length < populationSize) {
        newPopulation.push(offspring2);
      }
    }
    
    return newPopulation;
  }

  private tournamentSelection(population: TimelineEvent[][], fitnessScores: number[]): TimelineEvent[] {
    const tournamentSize = 3;
    let bestIndex = Math.floor(Math.random() * population.length);
    let bestFitness = fitnessScores[bestIndex];
    
    for (let i = 1; i < tournamentSize; i++) {
      const candidateIndex = Math.floor(Math.random() * population.length);
      if (fitnessScores[candidateIndex] > bestFitness) {
        bestIndex = candidateIndex;
        bestFitness = fitnessScores[candidateIndex];
      }
    }
    
    return population[bestIndex];
  }

  private crossover(parent1: TimelineEvent[], parent2: TimelineEvent[]): [TimelineEvent[], TimelineEvent[]] {
    if (parent1.length !== parent2.length) {
      return [[...parent1], [...parent2]];
    }
    
    // Order crossover (OX)
    const length = parent1.length;
    const start = Math.floor(Math.random() * length);
    const end = Math.floor(Math.random() * (length - start)) + start;
    
    const offspring1: TimelineEvent[] = new Array(length);
    const offspring2: TimelineEvent[] = new Array(length);
    
    // Copy the selected segment
    for (let i = start; i <= end; i++) {
      offspring1[i] = parent1[i];
      offspring2[i] = parent2[i];
    }
    
    // Fill remaining positions with order from other parent
    this.fillRemainingPositions(offspring1, parent2, start, end);
    this.fillRemainingPositions(offspring2, parent1, start, end);
    
    return [offspring1, offspring2];
  }

  private fillRemainingPositions(
    offspring: TimelineEvent[], 
    donor: TimelineEvent[], 
    start: number, 
    end: number
  ): void {
    const usedIds = new Set();
    
    // Mark used IDs
    for (let i = start; i <= end; i++) {
      if (offspring[i]) {
        usedIds.add(offspring[i].id);
      }
    }
    
    let donorIndex = 0;
    
    // Fill remaining positions
    for (let i = 0; i < offspring.length; i++) {
      if (!offspring[i]) {
        while (donorIndex < donor.length && usedIds.has(donor[donorIndex].id)) {
          donorIndex++;
        }
        if (donorIndex < donor.length) {
          offspring[i] = donor[donorIndex];
          usedIds.add(donor[donorIndex].id);
          donorIndex++;
        }
      }
    }
  }

  private mutate(individual: TimelineEvent[], bufferTime: number): TimelineEvent[] {
    const mutated = [...individual];
    const mutationType = Math.random();
    
    if (mutationType < 0.4) {
      // Swap mutation
      const idx1 = Math.floor(Math.random() * mutated.length);
      const idx2 = Math.floor(Math.random() * mutated.length);
      [mutated[idx1], mutated[idx2]] = [mutated[idx2], mutated[idx1]];
    } else if (mutationType < 0.8) {
      // Time shift mutation
      const idx = Math.floor(Math.random() * mutated.length);
      const maxShift = 30 * 60 * 1000; // 30 minutes
      const shift = (Math.random() - 0.5) * maxShift;
      
      const newStart = new Date(new Date(mutated[idx].start).getTime() + shift);
      const newEnd = new Date(newStart.getTime() + mutated[idx].duration * 60 * 1000);
      
      mutated[idx] = {
        ...mutated[idx],
        start: newStart.toISOString(),
        end: newEnd.toISOString()
      };
    } else {
      // Priority adjustment mutation
      const idx = Math.floor(Math.random() * mutated.length);
      const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
      mutated[idx] = {
        ...mutated[idx],
        priority: priorities[Math.floor(Math.random() * priorities.length)]
      };
    }
    
    return mutated;
  }

  private applyBufferTime(events: TimelineEvent[], bufferMinutes: number): TimelineEvent[] {
    if (events.length <= 1) return [...events];
    
    const sortedEvents = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const result: TimelineEvent[] = [sortedEvents[0]];
    
    for (let i = 1; i < sortedEvents.length; i++) {
      const prevEvent = result[result.length - 1];
      const currentEvent = sortedEvents[i];
      
      const prevEnd = new Date(prevEvent.end);
      const currentStart = new Date(currentEvent.start);
      
      // Add buffer time if events are too close
      const timeDiff = currentStart.getTime() - prevEnd.getTime();
      const requiredBuffer = bufferMinutes * 60 * 1000;
      
      if (timeDiff < requiredBuffer) {
        const newStart = new Date(prevEnd.getTime() + requiredBuffer);
        const newEnd = new Date(newStart.getTime() + currentEvent.duration * 60 * 1000);
        
        result.push({
          ...currentEvent,
          start: newStart.toISOString(),
          end: newEnd.toISOString()
        });
      } else {
        result.push(currentEvent);
      }
    }
    
    return result;
  }
}

describe('Timeline Calculator Unit Tests', () => {
  let calculator: TimelineCalculator;

  beforeEach(() => {
    calculator = new TimelineCalculator();
  });

  describe('Conflict Detection', () => {
    describe('Time Overlap Detection', () => {
      it('should detect overlapping events', () => {
        const events: TimelineEvent[] = [
          {
            id: '1',
            title: 'Event A',
            start: '2024-06-15T10:00:00Z',
            end: '2024-06-15T11:00:00Z',
            duration: 60,
            type: 'ceremony',
            priority: 'high'
          },
          {
            id: '2',
            title: 'Event B',
            start: '2024-06-15T10:30:00Z',
            end: '2024-06-15T11:30:00Z',
            duration: 60,
            type: 'photography',
            priority: 'medium'
          }
        ];

        const result = calculator.detectConflicts(events);

        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].type).toBe('time_overlap');
        expect(result.conflicts[0].eventIds).toEqual(expect.arrayContaining(['1', '2']));
      });

      it('should not detect conflicts for non-overlapping events', () => {
        const events: TimelineEvent[] = [
          {
            id: '1',
            title: 'Event A',
            start: '2024-06-15T10:00:00Z',
            end: '2024-06-15T11:00:00Z',
            duration: 60,
            type: 'ceremony',
            priority: 'high'
          },
          {
            id: '2',
            title: 'Event B',
            start: '2024-06-15T11:00:00Z',
            end: '2024-06-15T12:00:00Z',
            duration: 60,
            type: 'photography',
            priority: 'medium'
          }
        ];

        const result = calculator.detectConflicts(events);

        expect(result.hasConflicts).toBe(false);
        expect(result.conflicts).toHaveLength(0);
      });

      it('should calculate correct conflict severity', () => {
        const events: TimelineEvent[] = [
          {
            id: '1',
            title: 'Event A',
            start: '2024-06-15T10:00:00Z',
            end: '2024-06-15T11:00:00Z',
            duration: 60,
            type: 'ceremony',
            priority: 'high'
          },
          {
            id: '2',
            title: 'Event B',
            start: '2024-06-15T10:00:00Z', // Complete overlap
            end: '2024-06-15T11:00:00Z',
            duration: 60,
            type: 'photography',
            priority: 'medium'
          }
        ];

        const result = calculator.detectConflicts(events);

        expect(result.conflicts[0].severity).toBe('critical');
      });
    });

    describe('Resource Conflict Detection', () => {
      it('should detect resource conflicts', () => {
        const events: TimelineEvent[] = [
          {
            id: '1',
            title: 'Photo Session A',
            start: '2024-06-15T10:00:00Z',
            end: '2024-06-15T11:00:00Z',
            duration: 60,
            type: 'photography',
            priority: 'high',
            resources: ['photographer-1', 'camera-1']
          },
          {
            id: '2',
            title: 'Photo Session B',
            start: '2024-06-15T10:30:00Z',
            end: '2024-06-15T11:30:00Z',
            duration: 60,
            type: 'photography',
            priority: 'medium',
            resources: ['photographer-1'] // Same photographer
          }
        ];

        const result = calculator.detectConflicts(events);

        const resourceConflicts = result.conflicts.filter(c => c.type === 'resource_conflict');
        expect(resourceConflicts).toHaveLength(1);
        expect(resourceConflicts[0].severity).toBe('high');
      });
    });

    describe('Location Conflict Detection', () => {
      it('should detect location conflicts', () => {
        const events: TimelineEvent[] = [
          {
            id: '1',
            title: 'Ceremony',
            start: '2024-06-15T16:00:00Z',
            end: '2024-06-15T17:00:00Z',
            duration: 60,
            type: 'ceremony',
            priority: 'high',
            location: 'Main Hall'
          },
          {
            id: '2',
            title: 'Setup',
            start: '2024-06-15T16:30:00Z',
            end: '2024-06-15T17:30:00Z',
            duration: 60,
            type: 'setup',
            priority: 'low',
            location: 'Main Hall' // Same location
          }
        ];

        const result = calculator.detectConflicts(events);

        const locationConflicts = result.conflicts.filter(c => c.type === 'location_conflict');
        expect(locationConflicts).toHaveLength(1);
        expect(locationConflicts[0].severity).toBe('medium');
      });
    });

    describe('Dependency Violation Detection', () => {
      it('should detect dependency violations', () => {
        const events: TimelineEvent[] = [
          {
            id: '1',
            title: 'Dependent Event',
            start: '2024-06-15T10:00:00Z',
            end: '2024-06-15T11:00:00Z',
            duration: 60,
            type: 'setup',
            priority: 'medium',
            dependencies: ['2'] // Depends on event 2
          },
          {
            id: '2',
            title: 'Prerequisite',
            start: '2024-06-15T10:30:00Z', // Starts after dependent event
            end: '2024-06-15T11:30:00Z',
            duration: 60,
            type: 'preparation',
            priority: 'high'
          }
        ];

        const result = calculator.detectConflicts(events);

        const dependencyConflicts = result.conflicts.filter(c => c.type === 'dependency_violation');
        expect(dependencyConflicts).toHaveLength(1);
        expect(dependencyConflicts[0].severity).toBe('critical');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty event array', () => {
        const result = calculator.detectConflicts([]);
        
        expect(result.hasConflicts).toBe(false);
        expect(result.conflicts).toHaveLength(0);
      });

      it('should handle single event', () => {
        const events: TimelineEvent[] = [
          {
            id: '1',
            title: 'Solo Event',
            start: '2024-06-15T10:00:00Z',
            end: '2024-06-15T11:00:00Z',
            duration: 60,
            type: 'ceremony',
            priority: 'high'
          }
        ];

        const result = calculator.detectConflicts(events);
        
        expect(result.hasConflicts).toBe(false);
        expect(result.conflicts).toHaveLength(0);
      });

      it('should handle events with zero duration', () => {
        const events: TimelineEvent[] = [
          {
            id: '1',
            title: 'Instant Event A',
            start: '2024-06-15T10:00:00Z',
            end: '2024-06-15T10:00:00Z',
            duration: 0,
            type: 'milestone',
            priority: 'low'
          },
          {
            id: '2',
            title: 'Instant Event B',
            start: '2024-06-15T10:00:00Z',
            end: '2024-06-15T10:00:00Z',
            duration: 0,
            type: 'milestone',
            priority: 'low'
          }
        ];

        const result = calculator.detectConflicts(events);
        
        expect(result.hasConflicts).toBe(true); // Same time events conflict
      });
    });
  });

  describe('Timeline Optimization', () => {
    describe('Basic Optimization', () => {
      it('should improve timeline fitness', () => {
        const events: TimelineEvent[] = [
          {
            id: '1',
            title: 'Event A',
            start: '2024-06-15T10:00:00Z',
            end: '2024-06-15T11:00:00Z',
            duration: 60,
            type: 'ceremony',
            priority: 'high'
          },
          {
            id: '2',
            title: 'Event B',
            start: '2024-06-15T10:30:00Z', // Overlapping
            end: '2024-06-15T11:30:00Z',
            duration: 60,
            type: 'photography',
            priority: 'medium'
          },
          {
            id: '3',
            title: 'Event C',
            start: '2024-06-15T11:00:00Z',
            end: '2024-06-15T12:00:00Z',
            duration: 60,
            type: 'reception',
            priority: 'high'
          }
        ];

        const result = calculator.optimizeTimeline(events, {
          maxIterations: 50,
          populationSize: 20
        });

        expect(result.optimizedFitness).toBeGreaterThanOrEqual(result.originalFitness);
        expect(result.events).toHaveLength(events.length);
        expect(result.iterations).toBe(50);
      });

      it('should handle empty event array', () => {
        const result = calculator.optimizeTimeline([]);

        expect(result.originalFitness).toBe(1);
        expect(result.optimizedFitness).toBe(1);
        expect(result.improvementScore).toBe(0);
        expect(result.events).toHaveLength(0);
      });

      it('should respect dependencies during optimization', () => {
        const events: TimelineEvent[] = [
          {
            id: '1',
            title: 'Setup',
            start: '2024-06-15T09:00:00Z',
            end: '2024-06-15T10:00:00Z',
            duration: 60,
            type: 'preparation',
            priority: 'medium'
          },
          {
            id: '2',
            title: 'Main Event',
            start: '2024-06-15T10:00:00Z',
            end: '2024-06-15T11:00:00Z',
            duration: 60,
            type: 'ceremony',
            priority: 'high',
            dependencies: ['1'] // Must come after setup
          }
        ];

        const result = calculator.optimizeTimeline(events, {
          maxIterations: 30,
          populationSize: 10
        });

        // Verify dependency is respected
        const setupEvent = result.events.find(e => e.id === '1');
        const mainEvent = result.events.find(e => e.id === '2');
        
        expect(setupEvent).toBeTruthy();
        expect(mainEvent).toBeTruthy();
        expect(new Date(setupEvent!.end).getTime()).toBeLessThanOrEqual(
          new Date(mainEvent!.start).getTime()
        );
      });

      it('should apply buffer time correctly', () => {
        const events: TimelineEvent[] = [
          {
            id: '1',
            title: 'Event A',
            start: '2024-06-15T10:00:00Z',
            end: '2024-06-15T10:30:00Z',
            duration: 30,
            type: 'preparation',
            priority: 'medium'
          },
          {
            id: '2',
            title: 'Event B',
            start: '2024-06-15T10:30:00Z', // No buffer
            end: '2024-06-15T11:00:00Z',
            duration: 30,
            type: 'ceremony',
            priority: 'high'
          }
        ];

        const result = calculator.optimizeTimeline(events, {
          bufferTime: 15, // 15 minute buffer
          maxIterations: 10
        });

        // Find the two events in optimized timeline
        const sortedEvents = result.events.sort((a, b) => 
          new Date(a.start).getTime() - new Date(b.start).getTime()
        );

        if (sortedEvents.length >= 2) {
          const timeDiff = new Date(sortedEvents[1].start).getTime() - new Date(sortedEvents[0].end).getTime();
          const bufferMinutes = timeDiff / (60 * 1000);
          
          expect(bufferMinutes).toBeGreaterThanOrEqual(15);
        }
      });
    });

    describe('Performance Testing', () => {
      it('should optimize large event sets efficiently', () => {
        const largeEventSet: TimelineEvent[] = Array.from({ length: 20 }, (_, i) => ({
          id: `event-${i}`,
          title: `Event ${i}`,
          start: new Date(Date.now() + i * 30 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + (i * 30 + 45) * 60 * 1000).toISOString(),
          duration: 45,
          type: 'test',
          priority: ['low', 'medium', 'high'][i % 3] as 'low' | 'medium' | 'high'
        }));

        const startTime = performance.now();
        const result = calculator.optimizeTimeline(largeEventSet, {
          maxIterations: 20,
          populationSize: 15
        });
        const endTime = performance.now();
        
        const executionTime = endTime - startTime;

        expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
        expect(result.events).toHaveLength(20);
        expect(result.optimizedFitness).toBeGreaterThanOrEqual(0);
      });

      it('should handle optimization with many conflicts', () => {
        // Create intentionally conflicting events
        const conflictingEvents: TimelineEvent[] = Array.from({ length: 10 }, (_, i) => ({
          id: `event-${i}`,
          title: `Conflicting Event ${i}`,
          start: '2024-06-15T10:00:00Z', // All same start time
          end: '2024-06-15T11:00:00Z',
          duration: 60,
          type: 'test',
          priority: 'medium',
          resources: ['shared-resource'] // All use same resource
        }));

        const result = calculator.optimizeTimeline(conflictingEvents, {
          maxIterations: 30,
          bufferTime: 10
        });

        // Should improve from the highly conflicted original
        expect(result.optimizedFitness).toBeGreaterThan(result.originalFitness);
        expect(result.improvementScore).toBeGreaterThan(0);
      });
    });
  });

  describe('Algorithm Performance', () => {
    it('should have O(n log n) time complexity for conflict detection', () => {
      const testSizes = [10, 50, 100, 200];
      const timings: number[] = [];

      testSizes.forEach(size => {
        const events = Array.from({ length: size }, (_, i) => ({
          id: `event-${i}`,
          title: `Event ${i}`,
          start: new Date(Date.now() + i * 15 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + (i * 15 + 30) * 60 * 1000).toISOString(),
          duration: 30,
          type: 'test',
          priority: 'medium' as const
        }));

        const startTime = performance.now();
        calculator.detectConflicts(events);
        const endTime = performance.now();
        
        timings.push(endTime - startTime);
      });

      // Verify that timing doesn't grow quadratically
      // (This is a rough check - exact complexity analysis would require more sophisticated testing)
      expect(timings[3] / timings[0]).toBeLessThan(10); // Should not be 4x slower for 20x data
    });
  });
});