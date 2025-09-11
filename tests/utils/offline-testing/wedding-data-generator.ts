/**
 * Wedding Data Generator for Offline Testing
 * WS-172: Comprehensive offline functionality testing
 * 
 * Generates realistic wedding data for testing offline scenarios:
 * - Wedding timelines with multiple events
 * - Vendor lists with contact information
 * - Client forms with various states
 * - Coordinator notes and updates
 * - Photo upload queues
 */

import { faker } from '@faker-js/faker'

export interface WeddingTestData {
  id: string
  coupleId: string
  date: string
  venue: {
    name: string
    address: string
    contact: string
    wifi?: boolean
    cellularStrength?: 'poor' | 'fair' | 'good' | 'excellent'
  }
  timeline: TimelineEvent[]
  vendors: Vendor[]
  coordinator: Coordinator
  clients: Client[]
  priority: number
  status: 'upcoming' | 'active' | 'completed'
  lastSync: string
  syncStatus: 'synced' | 'pending' | 'conflict' | 'failed'
}

export interface TimelineEvent {
  id: string
  time: string
  title: string
  description: string
  vendor?: string
  location?: string
  status: 'pending' | 'in_progress' | 'completed' | 'delayed'
  notes?: string
  photos?: string[]
  syncStatus: 'synced' | 'pending' | 'conflict'
}

export interface Vendor {
  id: string
  name: string
  category: 'photographer' | 'catering' | 'florist' | 'music' | 'transportation' | 'venue' | 'other'
  contact: {
    name: string
    phone: string
    email: string
  }
  status: 'confirmed' | 'arrived' | 'setup_complete' | 'active' | 'departed'
  checkInTime?: string
  notes?: string
  syncStatus: 'synced' | 'pending' | 'conflict'
}

export interface Coordinator {
  id: string
  name: string
  phone: string
  email: string
  device: {
    type: 'mobile' | 'tablet' | 'laptop'
    os: 'ios' | 'android' | 'windows' | 'macos'
    browser: 'safari' | 'chrome' | 'firefox' | 'edge'
  }
}

export interface Client {
  id: string
  type: 'bride' | 'groom' | 'family' | 'friend'
  name: string
  phone: string
  email: string
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
}

export interface FormSubmission {
  id: string
  formType: 'vendor_checkin' | 'timeline_update' | 'coordinator_notes' | 'client_feedback' | 'emergency_contact'
  data: any
  timestamp: string
  status: 'draft' | 'submitted' | 'pending_sync' | 'synced' | 'conflict'
  priority: number
  attempts: number
}

export class WeddingDataGenerator {
  
  /**
   * Generate complete wedding data for testing
   */
  static generateWedding(options: {
    date?: string
    status?: 'upcoming' | 'active' | 'completed'
    venueConnectivity?: 'poor' | 'fair' | 'good' | 'excellent'
    vendorCount?: number
    timelineLength?: number
  } = {}): WeddingTestData {
    const weddingId = faker.string.uuid()
    const coupleId = faker.string.uuid()
    
    const bride = faker.person.firstName('female')
    const groom = faker.person.firstName('male')
    
    const wedding: WeddingTestData = {
      id: weddingId,
      coupleId: coupleId,
      date: options.date || faker.date.future().toISOString().split('T')[0],
      venue: {
        name: faker.company.name() + ' Wedding Venue',
        address: faker.location.streetAddress({ useFullAddress: true }),
        contact: faker.phone.number(),
        wifi: options.venueConnectivity !== 'poor',
        cellularStrength: options.venueConnectivity || 'fair'
      },
      timeline: this.generateTimeline(options.timelineLength || 12),
      vendors: this.generateVendors(options.vendorCount || 8),
      coordinator: this.generateCoordinator(),
      clients: this.generateClients(bride, groom),
      priority: options.status === 'active' ? 10 : (options.status === 'upcoming' ? 8 : 5),
      status: options.status || 'upcoming',
      lastSync: new Date().toISOString(),
      syncStatus: 'synced'
    }

    return wedding
  }

  /**
   * Generate realistic wedding timeline
   */
  static generateTimeline(eventCount: number): TimelineEvent[] {
    const events = []
    const baseTime = new Date('2024-06-15T10:00:00')

    const eventTypes = [
      { title: 'Venue setup begins', duration: 120, vendor: 'venue' },
      { title: 'Flowers delivered', duration: 30, vendor: 'florist' },
      { title: 'Catering setup', duration: 90, vendor: 'catering' },
      { title: 'Photography setup', duration: 45, vendor: 'photographer' },
      { title: 'Music/DJ setup', duration: 60, vendor: 'music' },
      { title: 'Bridal party arrives', duration: 30 },
      { title: 'Guest arrival begins', duration: 60 },
      { title: 'Ceremony begins', duration: 45 },
      { title: 'Cocktail hour', duration: 60, vendor: 'catering' },
      { title: 'Reception dinner', duration: 90, vendor: 'catering' },
      { title: 'Dancing begins', duration: 120, vendor: 'music' },
      { title: 'Venue cleanup', duration: 60, vendor: 'venue' }
    ]

    for (let i = 0; i < Math.min(eventCount, eventTypes.length); i++) {
      const event = eventTypes[i]
      const eventTime = new Date(baseTime.getTime() + (i * 30 * 60000)) // 30 min intervals

      events.push({
        id: faker.string.uuid(),
        time: eventTime.toISOString(),
        title: event.title,
        description: faker.lorem.sentence(),
        vendor: event.vendor,
        location: event.vendor ? undefined : faker.location.secondaryAddress(),
        status: faker.helpers.arrayElement(['pending', 'in_progress', 'completed', 'delayed']),
        notes: faker.helpers.maybe(() => faker.lorem.sentences(2)),
        photos: faker.helpers.maybe(() => [faker.string.uuid(), faker.string.uuid()]),
        syncStatus: faker.helpers.weightedArrayElement([
          { weight: 8, value: 'synced' },
          { weight: 2, value: 'pending' },
          { weight: 1, value: 'conflict' }
        ])
      })
    }

    return events
  }

  /**
   * Generate wedding vendors
   */
  static generateVendors(vendorCount: number): Vendor[] {
    const vendors = []
    const categories: Vendor['category'][] = [
      'photographer', 'catering', 'florist', 'music', 'transportation', 'venue'
    ]

    for (let i = 0; i < vendorCount; i++) {
      vendors.push({
        id: faker.string.uuid(),
        name: faker.company.name(),
        category: categories[i % categories.length],
        contact: {
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          email: faker.internet.email()
        },
        status: faker.helpers.arrayElement(['confirmed', 'arrived', 'setup_complete', 'active', 'departed']),
        checkInTime: faker.helpers.maybe(() => faker.date.recent().toISOString()),
        notes: faker.helpers.maybe(() => faker.lorem.sentence()),
        syncStatus: faker.helpers.weightedArrayElement([
          { weight: 7, value: 'synced' },
          { weight: 2, value: 'pending' },
          { weight: 1, value: 'conflict' }
        ])
      })
    }

    return vendors
  }

  /**
   * Generate coordinator data
   */
  static generateCoordinator(): Coordinator {
    const devices = [
      { type: 'mobile', os: 'ios', browser: 'safari' },
      { type: 'mobile', os: 'android', browser: 'chrome' },
      { type: 'tablet', os: 'ios', browser: 'safari' },
      { type: 'tablet', os: 'android', browser: 'chrome' },
      { type: 'laptop', os: 'macos', browser: 'chrome' },
      { type: 'laptop', os: 'windows', browser: 'edge' }
    ] as const

    const device = faker.helpers.arrayElement(devices)

    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
      device: device as any
    }
  }

  /**
   * Generate client data
   */
  static generateClients(bride: string, groom: string): Client[] {
    const clients = [
      {
        id: faker.string.uuid(),
        type: 'bride' as const,
        name: bride,
        phone: faker.phone.number(),
        email: faker.internet.email(),
        emergencyContact: {
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          relationship: 'parent'
        }
      },
      {
        id: faker.string.uuid(),
        type: 'groom' as const,
        name: groom,
        phone: faker.phone.number(),
        email: faker.internet.email(),
        emergencyContact: {
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          relationship: 'parent'
        }
      }
    ]

    // Add family members
    for (let i = 0; i < 4; i++) {
      clients.push({
        id: faker.string.uuid(),
        type: faker.helpers.arrayElement(['family', 'friend']),
        name: faker.person.fullName(),
        phone: faker.phone.number(),
        email: faker.internet.email()
      })
    }

    return clients
  }

  /**
   * Generate form submissions for testing sync queue
   */
  static generateFormSubmissions(count: number): FormSubmission[] {
    const submissions = []
    const formTypes: FormSubmission['formType'][] = [
      'vendor_checkin', 'timeline_update', 'coordinator_notes', 'client_feedback', 'emergency_contact'
    ]

    for (let i = 0; i < count; i++) {
      submissions.push({
        id: faker.string.uuid(),
        formType: faker.helpers.arrayElement(formTypes),
        data: this.generateFormData(formTypes[i % formTypes.length]),
        timestamp: faker.date.recent().toISOString(),
        status: faker.helpers.weightedArrayElement([
          { weight: 3, value: 'pending_sync' },
          { weight: 5, value: 'synced' },
          { weight: 1, value: 'conflict' },
          { weight: 1, value: 'draft' }
        ]),
        priority: faker.helpers.weightedArrayElement([
          { weight: 2, value: 10 }, // High priority
          { weight: 5, value: 8 },  // Normal priority
          { weight: 3, value: 5 }   // Low priority
        ]),
        attempts: faker.number.int({ min: 0, max: 3 })
      })
    }

    return submissions
  }

  /**
   * Generate form data based on type
   */
  private static generateFormData(formType: FormSubmission['formType']): any {
    switch (formType) {
      case 'vendor_checkin':
        return {
          vendorId: faker.string.uuid(),
          status: faker.helpers.arrayElement(['arrived', 'setup_complete', 'ready']),
          notes: faker.lorem.sentence(),
          checkInTime: new Date().toISOString()
        }

      case 'timeline_update':
        return {
          eventId: faker.string.uuid(),
          status: faker.helpers.arrayElement(['completed', 'delayed', 'in_progress']),
          actualTime: new Date().toISOString(),
          notes: faker.lorem.sentence()
        }

      case 'coordinator_notes':
        return {
          weddingId: faker.string.uuid(),
          notes: faker.lorem.paragraphs(2),
          priority: faker.helpers.arrayElement(['low', 'normal', 'high']),
          category: faker.helpers.arrayElement(['setup', 'ceremony', 'reception', 'cleanup'])
        }

      case 'client_feedback':
        return {
          clientId: faker.string.uuid(),
          feedback: faker.lorem.paragraphs(1),
          rating: faker.number.int({ min: 1, max: 5 }),
          category: faker.helpers.arrayElement(['venue', 'food', 'service', 'overall'])
        }

      case 'emergency_contact':
        return {
          clientId: faker.string.uuid(),
          contactName: faker.person.fullName(),
          phone: faker.phone.number(),
          relationship: faker.helpers.arrayElement(['parent', 'sibling', 'friend']),
          notes: faker.lorem.sentence()
        }

      default:
        return { data: faker.lorem.words(5) }
    }
  }

  /**
   * Generate testing scenario datasets
   */
  static generateTestingScenarios(): {
    remoteVenue: WeddingTestData
    highVolume: WeddingTestData
    multiVendor: WeddingTestData
    emergencyUpdates: WeddingTestData
  } {
    return {
      // Remote venue with poor connectivity
      remoteVenue: this.generateWedding({
        date: new Date().toISOString().split('T')[0],
        status: 'active',
        venueConnectivity: 'poor',
        vendorCount: 6,
        timelineLength: 10
      }),

      // High volume wedding with many vendors and events
      highVolume: this.generateWedding({
        date: new Date().toISOString().split('T')[0],
        status: 'active',
        venueConnectivity: 'fair',
        vendorCount: 15,
        timelineLength: 20
      }),

      // Multi-vendor coordination
      multiVendor: this.generateWedding({
        date: new Date().toISOString().split('T')[0],
        status: 'active',
        venueConnectivity: 'good',
        vendorCount: 12,
        timelineLength: 15
      }),

      // Emergency updates scenario
      emergencyUpdates: this.generateWedding({
        date: new Date().toISOString().split('T')[0],
        status: 'active',
        venueConnectivity: 'poor',
        vendorCount: 8,
        timelineLength: 12
      })
    }
  }
}

/**
 * Conflict Data Generator
 * Generates data conflicts for testing conflict resolution
 */
export class ConflictDataGenerator {
  
  /**
   * Generate concurrent edit conflicts
   */
  static generateConcurrentEditConflict(baseData: any): {
    clientData: any
    serverData: any
    conflictFields: string[]
  } {
    const conflictFields = faker.helpers.arrayElements([
      'status', 'notes', 'checkInTime', 'contact.phone', 'timeline'
    ], { min: 1, max: 3 })

    const clientData = { ...baseData }
    const serverData = { ...baseData }

    conflictFields.forEach(field => {
      if (field === 'status') {
        clientData.status = 'arrived'
        serverData.status = 'setup_complete'
      } else if (field === 'notes') {
        clientData.notes = 'Updated by coordinator on-site'
        serverData.notes = 'Updated by office staff'
      } else if (field === 'checkInTime') {
        clientData.checkInTime = new Date().toISOString()
        serverData.checkInTime = faker.date.recent().toISOString()
      }
    })

    return { clientData, serverData, conflictFields }
  }

  /**
   * Generate timestamp conflicts
   */
  static generateTimestampConflict(): {
    clientTimestamp: string
    serverTimestamp: string
    timeDifference: number
  } {
    const baseTime = new Date().getTime()
    const clientTimestamp = new Date(baseTime - faker.number.int({ min: 1000, max: 300000 })).toISOString()
    const serverTimestamp = new Date(baseTime - faker.number.int({ min: 500, max: 600000 })).toISOString()

    return {
      clientTimestamp,
      serverTimestamp,
      timeDifference: Math.abs(new Date(clientTimestamp).getTime() - new Date(serverTimestamp).getTime())
    }
  }
}