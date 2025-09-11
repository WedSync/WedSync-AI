import { Event } from '../../types/timeline';

// =====================================================
// KNOWN GOOD TEST DATA GENERATORS
// =====================================================

export interface ConflictScenario {
  name: string;
  description: string;
  events: Event[];
  expectedConflicts: Array<{
    eventIds: string[];
    severity: 'warning' | 'conflict';
    type: 'time' | 'resource' | 'vendor' | 'location';
    reason: string;
  }>;
}

export interface OptimalSchedule {
  name: string;
  events: Event[];
  expectedFitnessScore: number;
  maxConflicts: number;
  totalDurationHours: number;
}

export function generateKnownGoodEvents(count: number): Event[] {
  const baseDate = new Date('2024-06-01T09:00:00Z');
  const events: Event[] = [];

  // Generate events with proper spacing to avoid conflicts
  for (let i = 0; i < count; i++) {
    const startTime = new Date(baseDate.getTime() + i * 90 * 60 * 1000); // 90 minute intervals
    const duration = 60 + Math.floor(Math.random() * 60); // 60-120 minutes
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    events.push({
      id: `event-${i.toString().padStart(3, '0')}`,
      title: `Event ${i + 1}: ${getEventTitle(i)}`,
      start: startTime,
      end: endTime,
      duration,
      type: getEventType(i),
      priority: Math.floor(Math.random() * 5) + 1,
      location: `location-${Math.floor(i / 5) + 1}`, // Group events by location
      vendors: [`vendor-${Math.floor(Math.random() * 10) + 1}`],
      resources: [`resource-${Math.floor(Math.random() * 15) + 1}`],
      dependencies:
        i > 0 && Math.random() > 0.7
          ? [`event-${(i - 1).toString().padStart(3, '0')}`]
          : [],
      flexibility: Math.round((0.1 + Math.random() * 0.8) * 10) / 10, // 0.1 to 0.9, rounded to 1 decimal
    });
  }

  return events;
}

function getEventTitle(index: number): string {
  const titles = [
    'Venue Setup',
    'Bridal Preparation',
    'Groom Preparation',
    'Guest Arrival',
    'Wedding Ceremony',
    'Cocktail Hour',
    'Family Photos',
    'Couple Photos',
    'Reception Setup',
    'Wedding Reception',
    'First Dance',
    'Dinner Service',
    'Cake Cutting',
    'Dancing',
    'Bouquet Toss',
    'Send-off',
  ];
  return titles[index % titles.length];
}

function getEventType(index: number): Event['type'] {
  const types: Event['type'][] = [
    'preparation',
    'ceremony',
    'photos',
    'reception',
    'transport',
    'vendor_setup',
  ];
  return types[index % types.length];
}

export function generateConflictScenarios(): ConflictScenario[] {
  return [
    {
      name: 'Location Double Booking',
      description: 'Two events scheduled at same location and time',
      events: [
        {
          id: 'ceremony',
          title: 'Wedding Ceremony',
          start: new Date('2024-06-01T14:00:00Z'),
          end: new Date('2024-06-01T15:00:00Z'),
          duration: 60,
          type: 'ceremony',
          priority: 5,
          location: 'main-chapel',
          vendors: [],
          resources: [],
          dependencies: [],
          flexibility: 0.1,
        },
        {
          id: 'rehearsal',
          title: 'Wedding Rehearsal',
          start: new Date('2024-06-01T14:30:00Z'),
          end: new Date('2024-06-01T15:30:00Z'),
          duration: 60,
          type: 'ceremony',
          priority: 3,
          location: 'main-chapel', // Same location
          vendors: [],
          resources: [],
          dependencies: [],
          flexibility: 0.5,
        },
      ],
      expectedConflicts: [
        {
          eventIds: ['ceremony', 'rehearsal'],
          severity: 'conflict',
          type: 'location',
          reason: 'Same location booked for overlapping times',
        },
      ],
    },

    {
      name: 'Vendor Double Booking',
      description: 'Same vendor assigned to overlapping events',
      events: [
        {
          id: 'ceremony-photos',
          title: 'Ceremony Photography',
          start: new Date('2024-06-01T14:00:00Z'),
          end: new Date('2024-06-01T15:00:00Z'),
          duration: 60,
          type: 'photos',
          priority: 5,
          location: 'chapel',
          vendors: ['photographer-1'],
          resources: [],
          dependencies: [],
          flexibility: 0.2,
        },
        {
          id: 'portrait-session',
          title: 'Portrait Session',
          start: new Date('2024-06-01T14:45:00Z'),
          end: new Date('2024-06-01T15:45:00Z'),
          duration: 60,
          type: 'photos',
          priority: 4,
          location: 'garden',
          vendors: ['photographer-1'], // Same vendor
          resources: [],
          dependencies: [],
          flexibility: 0.6,
        },
      ],
      expectedConflicts: [
        {
          eventIds: ['ceremony-photos', 'portrait-session'],
          severity: 'conflict',
          type: 'vendor',
          reason: 'Vendor double-booked for overlapping events',
        },
      ],
    },

    {
      name: 'Resource Conflict',
      description: 'Multiple events requiring same limited resource',
      events: [
        {
          id: 'indoor-ceremony',
          title: 'Indoor Ceremony',
          start: new Date('2024-06-01T14:00:00Z'),
          end: new Date('2024-06-01T15:00:00Z'),
          duration: 60,
          type: 'ceremony',
          priority: 5,
          location: 'chapel',
          vendors: [],
          resources: ['professional-sound-system'],
          dependencies: [],
          flexibility: 0.1,
        },
        {
          id: 'outdoor-cocktails',
          title: 'Outdoor Cocktail Hour',
          start: new Date('2024-06-01T14:30:00Z'),
          end: new Date('2024-06-01T16:00:00Z'),
          duration: 90,
          type: 'reception',
          priority: 4,
          location: 'garden',
          vendors: [],
          resources: ['professional-sound-system'], // Same resource needed
          dependencies: [],
          flexibility: 0.3,
        },
      ],
      expectedConflicts: [
        {
          eventIds: ['indoor-ceremony', 'outdoor-cocktails'],
          severity: 'conflict',
          type: 'resource',
          reason:
            'Resource conflict - professional sound system required by multiple events',
        },
      ],
    },

    {
      name: 'Multiple Overlapping Time Conflicts',
      description: 'Multiple events with various overlap patterns',
      events: [
        {
          id: 'event-a',
          title: 'Event A',
          start: new Date('2024-06-01T13:00:00Z'),
          end: new Date('2024-06-01T15:00:00Z'),
          duration: 120,
          type: 'preparation',
          priority: 3,
          location: 'room-1',
          vendors: [],
          resources: [],
          dependencies: [],
          flexibility: 0.4,
        },
        {
          id: 'event-b',
          title: 'Event B',
          start: new Date('2024-06-01T14:00:00Z'),
          end: new Date('2024-06-01T16:00:00Z'),
          duration: 120,
          type: 'photos',
          priority: 4,
          location: 'room-2', // Different location - warning only
          vendors: [],
          resources: [],
          dependencies: [],
          flexibility: 0.5,
        },
        {
          id: 'event-c',
          title: 'Event C',
          start: new Date('2024-06-01T14:30:00Z'),
          end: new Date('2024-06-01T15:30:00Z'),
          duration: 60,
          type: 'ceremony',
          priority: 5,
          location: 'room-3', // Different location - warning only
          vendors: [],
          resources: [],
          dependencies: [],
          flexibility: 0.2,
        },
      ],
      expectedConflicts: [
        {
          eventIds: ['event-a', 'event-b'],
          severity: 'warning',
          type: 'time',
          reason: 'Time overlap between events at different locations',
        },
        {
          eventIds: ['event-a', 'event-c'],
          severity: 'warning',
          type: 'time',
          reason: 'Time overlap between events at different locations',
        },
        {
          eventIds: ['event-b', 'event-c'],
          severity: 'warning',
          type: 'time',
          reason: 'Time overlap between events at different locations',
        },
      ],
    },

    {
      name: 'Complex Multi-Resource Conflict',
      description: 'Events with multiple overlapping resource requirements',
      events: [
        {
          id: 'reception-dinner',
          title: 'Reception Dinner',
          start: new Date('2024-06-01T17:00:00Z'),
          end: new Date('2024-06-01T19:00:00Z'),
          duration: 120,
          type: 'reception',
          priority: 5,
          location: 'ballroom',
          vendors: ['caterer-1', 'dj-1'],
          resources: ['sound-system', 'lighting-rig', 'tables'],
          dependencies: [],
          flexibility: 0.2,
        },
        {
          id: 'dancing-party',
          title: 'Dancing Party',
          start: new Date('2024-06-01T18:30:00Z'),
          end: new Date('2024-06-01T22:00:00Z'),
          duration: 210,
          type: 'reception',
          priority: 4,
          location: 'dance-floor',
          vendors: ['dj-1'], // Same DJ
          resources: ['sound-system', 'lighting-rig'], // Same resources
          dependencies: [],
          flexibility: 0.4,
        },
      ],
      expectedConflicts: [
        {
          eventIds: ['reception-dinner', 'dancing-party'],
          severity: 'conflict',
          type: 'vendor',
          reason: 'DJ double-booked',
        },
        {
          eventIds: ['reception-dinner', 'dancing-party'],
          severity: 'conflict',
          type: 'resource',
          reason: 'Sound system and lighting rig conflicts',
        },
      ],
    },
  ];
}

export function generateOptimalSchedules(): OptimalSchedule[] {
  return [
    {
      name: 'Perfect Wedding Day Schedule',
      expectedFitnessScore: 0.95,
      maxConflicts: 0,
      totalDurationHours: 12,
      events: [
        {
          id: 'venue-setup',
          title: 'Venue Setup',
          start: new Date('2024-06-01T09:00:00Z'),
          end: new Date('2024-06-01T11:00:00Z'),
          duration: 120,
          type: 'vendor_setup',
          priority: 5,
          location: 'main-venue',
          vendors: ['setup-crew'],
          resources: ['setup-equipment'],
          dependencies: [],
          flexibility: 0.3,
        },
        {
          id: 'bridal-prep',
          title: 'Bridal Preparation',
          start: new Date('2024-06-01T10:00:00Z'),
          end: new Date('2024-06-01T13:00:00Z'),
          duration: 180,
          type: 'preparation',
          priority: 4,
          location: 'bridal-suite',
          vendors: ['hair-makeup'],
          resources: ['styling-equipment'],
          dependencies: [],
          flexibility: 0.4,
        },
        {
          id: 'groom-prep',
          title: 'Groom Preparation',
          start: new Date('2024-06-01T11:00:00Z'),
          end: new Date('2024-06-01T13:00:00Z'),
          duration: 120,
          type: 'preparation',
          priority: 3,
          location: 'groom-suite',
          vendors: ['barber'],
          resources: ['grooming-supplies'],
          dependencies: [],
          flexibility: 0.5,
        },
        {
          id: 'first-look',
          title: 'First Look Photos',
          start: new Date('2024-06-01T13:00:00Z'),
          end: new Date('2024-06-01T13:30:00Z'),
          duration: 30,
          type: 'photos',
          priority: 4,
          location: 'garden',
          vendors: ['photographer'],
          resources: ['camera-equipment'],
          dependencies: ['bridal-prep', 'groom-prep'],
          flexibility: 0.2,
        },
        {
          id: 'ceremony',
          title: 'Wedding Ceremony',
          start: new Date('2024-06-01T14:00:00Z'),
          end: new Date('2024-06-01T15:00:00Z'),
          duration: 60,
          type: 'ceremony',
          priority: 5,
          location: 'altar',
          vendors: ['officiant', 'photographer', 'musician'],
          resources: ['sound-system', 'seating'],
          dependencies: ['venue-setup', 'first-look'],
          flexibility: 0.1,
        },
        {
          id: 'cocktail-hour',
          title: 'Cocktail Hour',
          start: new Date('2024-06-01T15:30:00Z'),
          end: new Date('2024-06-01T16:30:00Z'),
          duration: 60,
          type: 'reception',
          priority: 3,
          location: 'patio',
          vendors: ['bartender', 'caterer'],
          resources: ['bar-setup', 'cocktail-tables'],
          dependencies: ['ceremony'],
          flexibility: 0.3,
        },
        {
          id: 'reception',
          title: 'Wedding Reception',
          start: new Date('2024-06-01T17:00:00Z'),
          end: new Date('2024-06-01T21:00:00Z'),
          duration: 240,
          type: 'reception',
          priority: 5,
          location: 'ballroom',
          vendors: ['caterer', 'dj', 'photographer'],
          resources: ['sound-system', 'lighting', 'tables'],
          dependencies: ['cocktail-hour'],
          flexibility: 0.2,
        },
      ],
    },

    {
      name: 'Challenging Schedule with Tight Constraints',
      expectedFitnessScore: 0.75,
      maxConflicts: 2,
      totalDurationHours: 10,
      events: [
        {
          id: 'quick-setup',
          title: 'Quick Venue Setup',
          start: new Date('2024-06-01T11:00:00Z'),
          end: new Date('2024-06-01T12:00:00Z'),
          duration: 60,
          type: 'vendor_setup',
          priority: 5,
          location: 'venue',
          vendors: ['setup-crew'],
          resources: ['basic-equipment'],
          dependencies: [],
          flexibility: 0.1, // Very rigid
        },
        {
          id: 'prep-overlap',
          title: 'Shared Preparation Space',
          start: new Date('2024-06-01T11:30:00Z'),
          end: new Date('2024-06-01T13:00:00Z'),
          duration: 90,
          type: 'preparation',
          priority: 4,
          location: 'prep-room',
          vendors: ['hair-makeup'],
          resources: ['styling-station'],
          dependencies: [],
          flexibility: 0.2,
        },
        {
          id: 'rushed-ceremony',
          title: 'Ceremony with Time Pressure',
          start: new Date('2024-06-01T13:15:00Z'),
          end: new Date('2024-06-01T14:00:00Z'),
          duration: 45,
          type: 'ceremony',
          priority: 5,
          location: 'venue',
          vendors: ['officiant', 'photographer'],
          resources: ['sound-system', 'seating'],
          dependencies: ['quick-setup', 'prep-overlap'],
          flexibility: 0.1,
        },
        {
          id: 'immediate-reception',
          title: 'Back-to-Back Reception',
          start: new Date('2024-06-01T14:00:00Z'), // Starts immediately
          end: new Date('2024-06-01T18:00:00Z'),
          duration: 240,
          type: 'reception',
          priority: 4,
          location: 'venue', // Same location as ceremony
          vendors: ['caterer', 'photographer'],
          resources: ['sound-system', 'tables'], // Shared sound system
          dependencies: ['rushed-ceremony'],
          flexibility: 0.3,
        },
      ],
    },

    {
      name: 'Multi-Location Wedding with Travel Time',
      expectedFitnessScore: 0.8,
      maxConflicts: 1,
      totalDurationHours: 14,
      events: [
        {
          id: 'church-ceremony',
          title: 'Church Wedding Ceremony',
          start: new Date('2024-06-01T14:00:00Z'),
          end: new Date('2024-06-01T15:00:00Z'),
          duration: 60,
          type: 'ceremony',
          priority: 5,
          location: 'st-marys-church',
          vendors: ['priest', 'church-musician', 'photographer'],
          resources: ['church-sound-system', 'flowers'],
          dependencies: [],
          flexibility: 0.1,
        },
        {
          id: 'travel-time',
          title: 'Travel to Reception Venue',
          start: new Date('2024-06-01T15:00:00Z'),
          end: new Date('2024-06-01T15:45:00Z'),
          duration: 45,
          type: 'transport',
          priority: 4,
          location: 'transportation',
          vendors: ['limo-driver'],
          resources: ['wedding-car'],
          dependencies: ['church-ceremony'],
          flexibility: 0.2,
        },
        {
          id: 'photos-at-park',
          title: 'Photos at Scenic Park',
          start: new Date('2024-06-01T15:45:00Z'),
          end: new Date('2024-06-01T17:00:00Z'),
          duration: 75,
          type: 'photos',
          priority: 4,
          location: 'central-park',
          vendors: ['photographer'],
          resources: ['photography-equipment'],
          dependencies: ['travel-time'],
          flexibility: 0.4,
        },
        {
          id: 'travel-to-reception',
          title: 'Travel to Reception',
          start: new Date('2024-06-01T17:00:00Z'),
          end: new Date('2024-06-01T17:30:00Z'),
          duration: 30,
          type: 'transport',
          priority: 4,
          location: 'transportation',
          vendors: ['limo-driver'],
          resources: ['wedding-car'],
          dependencies: ['photos-at-park'],
          flexibility: 0.2,
        },
        {
          id: 'reception-venue',
          title: 'Reception at Grand Hotel',
          start: new Date('2024-06-01T18:00:00Z'),
          end: new Date('2024-06-01T23:00:00Z'),
          duration: 300,
          type: 'reception',
          priority: 5,
          location: 'grand-hotel-ballroom',
          vendors: ['caterer', 'dj', 'photographer'],
          resources: ['hotel-sound-system', 'lighting', 'tables'],
          dependencies: ['travel-to-reception'],
          flexibility: 0.2,
        },
      ],
    },
  ];
}

// =====================================================
// EDGE CASE GENERATORS
// =====================================================

export function generateCircularDependencyEvents(): Event[] {
  return [
    {
      id: 'event-a',
      title: 'Event A',
      start: new Date('2024-06-01T14:00:00Z'),
      end: new Date('2024-06-01T15:00:00Z'),
      duration: 60,
      type: 'ceremony',
      priority: 3,
      dependencies: ['event-c'], // Depends on C
      flexibility: 0.5,
    },
    {
      id: 'event-b',
      title: 'Event B',
      start: new Date('2024-06-01T15:00:00Z'),
      end: new Date('2024-06-01T16:00:00Z'),
      duration: 60,
      type: 'photos',
      priority: 3,
      dependencies: ['event-a'], // Depends on A
      flexibility: 0.5,
    },
    {
      id: 'event-c',
      title: 'Event C',
      start: new Date('2024-06-01T16:00:00Z'),
      end: new Date('2024-06-01T17:00:00Z'),
      duration: 60,
      type: 'reception',
      priority: 3,
      dependencies: ['event-b'], // Depends on B -> Creates cycle A->C->B->A
      flexibility: 0.5,
    },
  ];
}

export function generateImpossibleConstraintsEvents(): Event[] {
  return [
    {
      id: 'rigid-event-1',
      title: 'Rigid Event 1',
      start: new Date('2024-06-01T14:00:00Z'),
      end: new Date('2024-06-01T15:00:00Z'),
      duration: 60,
      type: 'ceremony',
      priority: 5,
      location: 'venue-a',
      vendors: ['vendor-shared'],
      resources: ['resource-shared'],
      dependencies: [],
      flexibility: 0.0, // Cannot be moved
    },
    {
      id: 'rigid-event-2',
      title: 'Rigid Event 2',
      start: new Date('2024-06-01T14:30:00Z'),
      end: new Date('2024-06-01T15:30:00Z'),
      duration: 60,
      type: 'ceremony',
      priority: 5,
      location: 'venue-a', // Same location
      vendors: ['vendor-shared'], // Same vendor
      resources: ['resource-shared'], // Same resource
      dependencies: [],
      flexibility: 0.0, // Cannot be moved - Creates impossible situation
    },
  ];
}

export function generateResourceOverbookingEvents(
  resourceQuantity: number = 1,
): Event[] {
  const events: Event[] = [];

  // Create more events than resource capacity
  for (let i = 0; i < resourceQuantity + 3; i++) {
    events.push({
      id: `competing-event-${i}`,
      title: `Competing Event ${i + 1}`,
      start: new Date('2024-06-01T14:00:00Z'), // All at same time
      end: new Date('2024-06-01T15:00:00Z'),
      duration: 60,
      type: 'ceremony',
      priority: 5 - i, // Decreasing priority
      location: `location-${i}`,
      vendors: [],
      resources: ['limited-resource'], // All need same resource
      dependencies: [],
      flexibility: 0.3,
    });
  }

  return events;
}

export function generateLastMinuteChangeEvents(): Event[] {
  const baseTime = new Date('2024-06-01T14:00:00Z');

  return [
    {
      id: 'original-ceremony',
      title: 'Original Ceremony Plan',
      start: baseTime,
      end: new Date(baseTime.getTime() + 60 * 60 * 1000),
      duration: 60,
      type: 'ceremony',
      priority: 5,
      location: 'outdoor-garden',
      vendors: ['photographer', 'musician'],
      resources: ['chairs', 'arch'],
      dependencies: [],
      flexibility: 0.1,
    },
    {
      id: 'weather-backup',
      title: 'Indoor Weather Backup',
      start: baseTime,
      end: new Date(baseTime.getTime() + 60 * 60 * 1000),
      duration: 60,
      type: 'ceremony',
      priority: 5,
      location: 'indoor-chapel', // Different location
      vendors: ['photographer', 'musician'], // Same vendors
      resources: ['indoor-sound-system'], // Different resources
      dependencies: [],
      flexibility: 0.0, // No flexibility - emergency backup
    },
    {
      id: 'reception-adjustment',
      title: 'Reception Timing Adjustment',
      start: new Date(baseTime.getTime() + 90 * 60 * 1000), // 1.5 hours later
      end: new Date(baseTime.getTime() + 330 * 60 * 1000), // 4 hours total
      duration: 240,
      type: 'reception',
      priority: 4,
      location: 'ballroom',
      vendors: ['caterer', 'photographer', 'dj'],
      resources: ['sound-system', 'lighting', 'tables'],
      dependencies: ['original-ceremony'], // Depends on original plan
      flexibility: 0.3,
    },
  ];
}

// =====================================================
// BENCHMARK DATA SETS
// =====================================================

export function generateBenchmarkDataSet(
  complexity: 'simple' | 'medium' | 'complex',
): Event[] {
  switch (complexity) {
    case 'simple':
      return generateKnownGoodEvents(25);

    case 'medium':
      return [
        ...generateKnownGoodEvents(40),
        ...generateConflictScenarios()[0].events,
        ...generateConflictScenarios()[1].events,
      ];

    case 'complex':
      return [
        ...generateKnownGoodEvents(60),
        ...generateConflictScenarios().flatMap((scenario) => scenario.events),
        ...generateCircularDependencyEvents(),
        ...generateResourceOverbookingEvents(2),
      ];

    default:
      return generateKnownGoodEvents(25);
  }
}

export function generateAccuracyValidationDataSet(): {
  name: string;
  events: Event[];
  expectedResults: {
    conflictCount: number;
    warningCount: number;
    feasibleSchedule: boolean;
    minFitnessScore: number;
  };
}[] {
  return [
    {
      name: 'Perfect Schedule - No Conflicts',
      events: generateOptimalSchedules()[0].events,
      expectedResults: {
        conflictCount: 0,
        warningCount: 0,
        feasibleSchedule: true,
        minFitnessScore: 0.9,
      },
    },
    {
      name: 'Minor Conflicts - Resolvable',
      events: generateConflictScenarios()
        .slice(0, 2)
        .flatMap((s) => s.events),
      expectedResults: {
        conflictCount: 2,
        warningCount: 0,
        feasibleSchedule: true,
        minFitnessScore: 0.6,
      },
    },
    {
      name: 'Complex Conflicts - Multiple Issues',
      events: generateBenchmarkDataSet('complex'),
      expectedResults: {
        conflictCount: 5,
        warningCount: 3,
        feasibleSchedule: true,
        minFitnessScore: 0.4,
      },
    },
    {
      name: 'Impossible Constraints',
      events: generateImpossibleConstraintsEvents(),
      expectedResults: {
        conflictCount: 3,
        warningCount: 0,
        feasibleSchedule: false,
        minFitnessScore: 0.2,
      },
    },
  ];
}
