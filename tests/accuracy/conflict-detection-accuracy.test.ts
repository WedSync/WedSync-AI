import { describe, it, expect, beforeEach } from '@jest/globals';
import { expectAccuracy, AccuracyValidator } from '../accuracy/setup';

/**
 * Conflict Detection Accuracy Validation Tests
 * Tests the precision and recall of timeline conflict detection algorithms
 */

interface TimelineEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  duration: number;
  type: string;
  resourceIds?: string[];
  location?: string;
  priority?: 'low' | 'medium' | 'high';
  dependencies?: string[];
}

interface ConflictDetails {
  eventIds: string[];
  type: 'time_overlap' | 'resource_conflict' | 'location_conflict' | 'dependency_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedResolution?: string;
}

interface ValidationScenario {
  name: string;
  events: TimelineEvent[];
  expectedConflicts: ConflictDetails[];
  testType: 'precision' | 'recall' | 'accuracy' | 'edge_case';
}

// Mock conflict detection algorithm implementation
class ConflictDetectionEngine {
  detectConflicts(events: TimelineEvent[]): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    
    // Time overlap detection
    conflicts.push(...this.detectTimeOverlaps(events));
    
    // Resource conflict detection
    conflicts.push(...this.detectResourceConflicts(events));
    
    // Location conflict detection
    conflicts.push(...this.detectLocationConflicts(events));
    
    // Dependency violation detection
    conflicts.push(...this.detectDependencyViolations(events));
    
    return conflicts;
  }

  private detectTimeOverlaps(events: TimelineEvent[]): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];
        
        if (this.eventsOverlap(event1, event2)) {
          const severity = this.calculateOverlapSeverity(event1, event2);
          conflicts.push({
            eventIds: [event1.id, event2.id],
            type: 'time_overlap',
            severity,
            description: `Time overlap between ${event1.title} and ${event2.title}`,
            suggestedResolution: severity === 'critical' ? 'Reschedule one event' : 'Consider buffer time'
          });
        }
      }
    }
    
    return conflicts;
  }

  private detectResourceConflicts(events: TimelineEvent[]): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    const resourceUsage = new Map<string, TimelineEvent[]>();
    
    // Group events by resource
    events.forEach(event => {
      if (event.resourceIds) {
        event.resourceIds.forEach(resourceId => {
          if (!resourceUsage.has(resourceId)) {
            resourceUsage.set(resourceId, []);
          }
          resourceUsage.get(resourceId)!.push(event);
        });
      }
    });
    
    // Check for conflicts within each resource group
    resourceUsage.forEach((resourceEvents, resourceId) => {
      for (let i = 0; i < resourceEvents.length; i++) {
        for (let j = i + 1; j < resourceEvents.length; j++) {
          const event1 = resourceEvents[i];
          const event2 = resourceEvents[j];
          
          if (this.eventsOverlap(event1, event2)) {
            conflicts.push({
              eventIds: [event1.id, event2.id],
              type: 'resource_conflict',
              severity: 'high',
              description: `Resource ${resourceId} double-booked for ${event1.title} and ${event2.title}`,
              suggestedResolution: 'Assign alternative resource or reschedule'
            });
          }
        }
      }
    });
    
    return conflicts;
  }

  private detectLocationConflicts(events: TimelineEvent[]): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    const locationGroups = new Map<string, TimelineEvent[]>();
    
    // Group events by location
    events.forEach(event => {
      if (event.location) {
        if (!locationGroups.has(event.location)) {
          locationGroups.set(event.location, []);
        }
        locationGroups.get(event.location)!.push(event);
      }
    });
    
    // Check for conflicts within each location
    locationGroups.forEach((locationEvents, location) => {
      for (let i = 0; i < locationEvents.length; i++) {
        for (let j = i + 1; j < locationEvents.length; j++) {
          const event1 = locationEvents[i];
          const event2 = locationEvents[j];
          
          if (this.eventsOverlap(event1, event2)) {
            conflicts.push({
              eventIds: [event1.id, event2.id],
              type: 'location_conflict',
              severity: 'medium',
              description: `Location ${location} double-booked for ${event1.title} and ${event2.title}`,
              suggestedResolution: 'Find alternative venue or adjust timing'
            });
          }
        }
      }
    });
    
    return conflicts;
  }

  private detectDependencyViolations(events: TimelineEvent[]): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
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
                severity: 'critical',
                description: `${event.title} starts before ${dependency.title} ends (dependency violation)`,
                suggestedResolution: 'Reschedule dependent event after prerequisite completes'
              });
            }
          }
        });
      }
    });
    
    return conflicts;
  }

  private eventsOverlap(event1: TimelineEvent, event2: TimelineEvent): boolean {
    const start1 = new Date(event1.start).getTime();
    const end1 = new Date(event1.end).getTime();
    const start2 = new Date(event2.start).getTime();
    const end2 = new Date(event2.end).getTime();
    
    return start1 < end2 && start2 < end1;
  }

  private calculateOverlapSeverity(event1: TimelineEvent, event2: TimelineEvent): 'low' | 'medium' | 'high' | 'critical' {
    const overlap = this.calculateOverlapDuration(event1, event2);
    const minDuration = Math.min(event1.duration, event2.duration);
    const overlapPercentage = (overlap / minDuration) * 100;
    
    if (overlapPercentage >= 75) return 'critical';
    if (overlapPercentage >= 50) return 'high';
    if (overlapPercentage >= 25) return 'medium';
    return 'low';
  }

  private calculateOverlapDuration(event1: TimelineEvent, event2: TimelineEvent): number {
    const start1 = new Date(event1.start).getTime();
    const end1 = new Date(event1.end).getTime();
    const start2 = new Date(event2.start).getTime();
    const end2 = new Date(event2.end).getTime();
    
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);
    
    return Math.max(0, overlapEnd - overlapStart) / (60 * 1000); // minutes
  }
}

// Test scenarios for validation
const VALIDATION_SCENARIOS: ValidationScenario[] = [
  {
    name: 'Simple Time Overlap',
    testType: 'precision',
    events: [
      {
        id: 'event-1',
        title: 'Photography Setup',
        start: '2024-06-15T09:00:00Z',
        end: '2024-06-15T10:30:00Z',
        duration: 90,
        type: 'photography'
      },
      {
        id: 'event-2',
        title: 'Venue Decoration',
        start: '2024-06-15T10:00:00Z',
        end: '2024-06-15T11:00:00Z',
        duration: 60,
        type: 'decoration'
      }
    ],
    expectedConflicts: [
      {
        eventIds: ['event-1', 'event-2'],
        type: 'time_overlap',
        severity: 'medium',
        description: 'Time overlap between Photography Setup and Venue Decoration'
      }
    ]
  },
  
  {
    name: 'Resource Double Booking',
    testType: 'precision',
    events: [
      {
        id: 'event-3',
        title: 'Bridal Photography',
        start: '2024-06-15T14:00:00Z',
        end: '2024-06-15T15:00:00Z',
        duration: 60,
        type: 'photography',
        resourceIds: ['photographer-1']
      },
      {
        id: 'event-4',
        title: 'Family Photos',
        start: '2024-06-15T14:30:00Z',
        end: '2024-06-15T15:30:00Z',
        duration: 60,
        type: 'photography',
        resourceIds: ['photographer-1']
      }
    ],
    expectedConflicts: [
      {
        eventIds: ['event-3', 'event-4'],
        type: 'resource_conflict',
        severity: 'high',
        description: 'Resource photographer-1 double-booked for Bridal Photography and Family Photos'
      },
      {
        eventIds: ['event-3', 'event-4'],
        type: 'time_overlap',
        severity: 'medium',
        description: 'Time overlap between Bridal Photography and Family Photos'
      }
    ]
  },
  
  {
    name: 'Location Conflict',
    testType: 'precision',
    events: [
      {
        id: 'event-5',
        title: 'Wedding Ceremony',
        start: '2024-06-15T16:00:00Z',
        end: '2024-06-15T17:00:00Z',
        duration: 60,
        type: 'ceremony',
        location: 'Main Hall'
      },
      {
        id: 'event-6',
        title: 'Sound Check',
        start: '2024-06-15T16:30:00Z',
        end: '2024-06-15T17:00:00Z',
        duration: 30,
        type: 'sound',
        location: 'Main Hall'
      }
    ],
    expectedConflicts: [
      {
        eventIds: ['event-5', 'event-6'],
        type: 'location_conflict',
        severity: 'medium',
        description: 'Location Main Hall double-booked for Wedding Ceremony and Sound Check'
      },
      {
        eventIds: ['event-5', 'event-6'],
        type: 'time_overlap',
        severity: 'medium',
        description: 'Time overlap between Wedding Ceremony and Sound Check'
      }
    ]
  },
  
  {
    name: 'Dependency Violation',
    testType: 'precision',
    events: [
      {
        id: 'event-7',
        title: 'Reception Setup',
        start: '2024-06-15T17:00:00Z',
        end: '2024-06-15T18:00:00Z',
        duration: 60,
        type: 'setup',
        dependencies: ['event-8']
      },
      {
        id: 'event-8',
        title: 'Venue Cleanup',
        start: '2024-06-15T17:30:00Z',
        end: '2024-06-15T18:30:00Z',
        duration: 60,
        type: 'cleanup'
      }
    ],
    expectedConflicts: [
      {
        eventIds: ['event-7', 'event-8'],
        type: 'dependency_violation',
        severity: 'critical',
        description: 'Reception Setup starts before Venue Cleanup ends (dependency violation)'
      },
      {
        eventIds: ['event-7', 'event-8'],
        type: 'time_overlap',
        severity: 'medium',
        description: 'Time overlap between Reception Setup and Venue Cleanup'
      }
    ]
  },
  
  {
    name: 'No Conflicts - Edge Case',
    testType: 'recall',
    events: [
      {
        id: 'event-9',
        title: 'Morning Prep',
        start: '2024-06-15T08:00:00Z',
        end: '2024-06-15T09:00:00Z',
        duration: 60,
        type: 'preparation'
      },
      {
        id: 'event-10',
        title: 'Afternoon Party',
        start: '2024-06-15T15:00:00Z',
        end: '2024-06-15T18:00:00Z',
        duration: 180,
        type: 'party'
      }
    ],
    expectedConflicts: []
  },
  
  {
    name: 'Complex Multi-Conflict Scenario',
    testType: 'accuracy',
    events: [
      {
        id: 'event-11',
        title: 'Band Setup',
        start: '2024-06-15T18:00:00Z',
        end: '2024-06-15T19:00:00Z',
        duration: 60,
        type: 'entertainment',
        location: 'Stage Area',
        resourceIds: ['sound-engineer']
      },
      {
        id: 'event-12',
        title: 'DJ Setup',
        start: '2024-06-15T18:30:00Z',
        end: '2024-06-15T19:30:00Z',
        duration: 60,
        type: 'entertainment',
        location: 'Stage Area',
        resourceIds: ['sound-engineer']
      },
      {
        id: 'event-13',
        title: 'Sound System Test',
        start: '2024-06-15T18:45:00Z',
        end: '2024-06-15T19:15:00Z',
        duration: 30,
        type: 'technical',
        location: 'Stage Area',
        dependencies: ['event-11']
      }
    ],
    expectedConflicts: [
      {
        eventIds: ['event-11', 'event-12'],
        type: 'time_overlap',
        severity: 'medium',
        description: 'Time overlap between Band Setup and DJ Setup'
      },
      {
        eventIds: ['event-11', 'event-12'],
        type: 'location_conflict',
        severity: 'medium',
        description: 'Location Stage Area double-booked for Band Setup and DJ Setup'
      },
      {
        eventIds: ['event-11', 'event-12'],
        type: 'resource_conflict',
        severity: 'high',
        description: 'Resource sound-engineer double-booked for Band Setup and DJ Setup'
      },
      {
        eventIds: ['event-11', 'event-13'],
        type: 'time_overlap',
        severity: 'low',
        description: 'Time overlap between Band Setup and Sound System Test'
      },
      {
        eventIds: ['event-11', 'event-13'],
        type: 'location_conflict',
        severity: 'medium',
        description: 'Location Stage Area double-booked for Band Setup and Sound System Test'
      },
      {
        eventIds: ['event-12', 'event-13'],
        type: 'time_overlap',
        severity: 'medium',
        description: 'Time overlap between DJ Setup and Sound System Test'
      },
      {
        eventIds: ['event-12', 'event-13'],
        type: 'location_conflict',
        severity: 'medium',
        description: 'Location Stage Area double-booked for DJ Setup and Sound System Test'
      },
      {
        eventIds: ['event-13', 'event-11'],
        type: 'dependency_violation',
        severity: 'critical',
        description: 'Sound System Test starts before Band Setup ends (dependency violation)'
      }
    ]
  }
];

describe('Conflict Detection Accuracy Validation', () => {
  let conflictEngine: ConflictDetectionEngine;
  
  beforeEach(() => {
    conflictEngine = new ConflictDetectionEngine();
  });

  describe('Precision Testing', () => {
    VALIDATION_SCENARIOS
      .filter(scenario => scenario.testType === 'precision')
      .forEach(scenario => {
        it(`should accurately detect conflicts in ${scenario.name}`, () => {
          const actualConflicts = conflictEngine.detectConflicts(scenario.events);
          
          expectAccuracy(
            `Conflict Detection - ${scenario.name}`,
            'ConflictDetectionEngine',
            scenario.expectedConflicts,
            actualConflicts,
            AccuracyValidator.validateConflictDetection,
            0.9 // 90% precision required
          );
        });
      });
  });

  describe('Recall Testing', () => {
    VALIDATION_SCENARIOS
      .filter(scenario => scenario.testType === 'recall')
      .forEach(scenario => {
        it(`should correctly identify absence of conflicts in ${scenario.name}`, () => {
          const actualConflicts = conflictEngine.detectConflicts(scenario.events);
          
          expectAccuracy(
            `Conflict Recall - ${scenario.name}`,
            'ConflictDetectionEngine',
            scenario.expectedConflicts,
            actualConflicts,
            AccuracyValidator.validateConflictDetection,
            1.0 // 100% recall for no-conflict scenarios
          );
        });
      });
  });

  describe('Overall Accuracy Testing', () => {
    VALIDATION_SCENARIOS
      .filter(scenario => scenario.testType === 'accuracy')
      .forEach(scenario => {
        it(`should demonstrate high accuracy in complex ${scenario.name}`, () => {
          const actualConflicts = conflictEngine.detectConflicts(scenario.events);
          
          expectAccuracy(
            `Complex Accuracy - ${scenario.name}`,
            'ConflictDetectionEngine',
            scenario.expectedConflicts,
            actualConflicts,
            AccuracyValidator.validateConflictDetection,
            0.85 // 85% accuracy for complex scenarios
          );
        });
      });
  });

  describe('Edge Case Testing', () => {
    it('should handle empty event list', () => {
      const actualConflicts = conflictEngine.detectConflicts([]);
      expect(actualConflicts).toEqual([]);
    });

    it('should handle single event', () => {
      const singleEvent: TimelineEvent = {
        id: 'single',
        title: 'Single Event',
        start: '2024-06-15T10:00:00Z',
        end: '2024-06-15T11:00:00Z',
        duration: 60,
        type: 'test'
      };
      
      const actualConflicts = conflictEngine.detectConflicts([singleEvent]);
      expect(actualConflicts).toEqual([]);
    });

    it('should handle events with identical times', () => {
      const identicalEvents: TimelineEvent[] = [
        {
          id: 'identical-1',
          title: 'Event A',
          start: '2024-06-15T10:00:00Z',
          end: '2024-06-15T11:00:00Z',
          duration: 60,
          type: 'test'
        },
        {
          id: 'identical-2',
          title: 'Event B',
          start: '2024-06-15T10:00:00Z',
          end: '2024-06-15T11:00:00Z',
          duration: 60,
          type: 'test'
        }
      ];
      
      const actualConflicts = conflictEngine.detectConflicts(identicalEvents);
      expect(actualConflicts.length).toBeGreaterThan(0);
      expect(actualConflicts[0].severity).toBe('critical');
    });

    it('should handle events that touch but do not overlap', () => {
      const touchingEvents: TimelineEvent[] = [
        {
          id: 'touching-1',
          title: 'First Event',
          start: '2024-06-15T10:00:00Z',
          end: '2024-06-15T11:00:00Z',
          duration: 60,
          type: 'test'
        },
        {
          id: 'touching-2',
          title: 'Second Event',
          start: '2024-06-15T11:00:00Z',
          end: '2024-06-15T12:00:00Z',
          duration: 60,
          type: 'test'
        }
      ];
      
      const actualConflicts = conflictEngine.detectConflicts(touchingEvents);
      // Events that touch but don't overlap should not create conflicts
      expect(actualConflicts).toEqual([]);
    });
  });

  describe('Performance Benchmarking', () => {
    it('should detect conflicts efficiently with large event sets', () => {
      // Generate large set of events for performance testing
      const largeEventSet: TimelineEvent[] = [];
      for (let i = 0; i < 100; i++) {
        largeEventSet.push({
          id: `perf-event-${i}`,
          title: `Performance Event ${i}`,
          start: new Date(Date.now() + i * 30 * 60 * 1000).toISOString(), // 30-minute intervals
          end: new Date(Date.now() + (i * 30 + 45) * 60 * 1000).toISOString(), // 45-minute duration
          duration: 45,
          type: 'performance-test',
          resourceIds: [`resource-${i % 10}`], // 10 resources, creating conflicts
          location: `location-${i % 5}` // 5 locations, creating conflicts
        });
      }
      
      const startTime = performance.now();
      const actualConflicts = conflictEngine.detectConflicts(largeEventSet);
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(executionTime).toBeLessThan(1000);
      
      // Should detect multiple conflicts due to resource and location overlaps
      expect(actualConflicts.length).toBeGreaterThan(0);
      
      console.log(`Performance test: Processed ${largeEventSet.length} events in ${executionTime.toFixed(2)}ms, found ${actualConflicts.length} conflicts`);
    });
  });

  describe('Conflict Severity Validation', () => {
    it('should assign appropriate severity levels', () => {
      const severityTestEvents: TimelineEvent[] = [
        {
          id: 'severe-1',
          title: 'Critical Event',
          start: '2024-06-15T10:00:00Z',
          end: '2024-06-15T11:00:00Z',
          duration: 60,
          type: 'critical',
          priority: 'high'
        },
        {
          id: 'severe-2',
          title: 'Overlapping Critical',
          start: '2024-06-15T10:00:00Z',
          end: '2024-06-15T11:00:00Z',
          duration: 60,
          type: 'critical',
          priority: 'high'
        }
      ];
      
      const actualConflicts = conflictEngine.detectConflicts(severityTestEvents);
      
      expect(actualConflicts.length).toBeGreaterThan(0);
      expect(actualConflicts[0].severity).toBe('critical');
    });
  });

  describe('Resolution Suggestions Validation', () => {
    it('should provide meaningful resolution suggestions', () => {
      const events = VALIDATION_SCENARIOS[0].events;
      const actualConflicts = conflictEngine.detectConflicts(events);
      
      actualConflicts.forEach(conflict => {
        expect(conflict.suggestedResolution).toBeTruthy();
        expect(conflict.suggestedResolution!.length).toBeGreaterThan(10);
        expect(conflict.description).toBeTruthy();
      });
    });
  });
});