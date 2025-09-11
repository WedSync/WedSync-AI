import { beforeAll, afterAll, afterEach } from '@jest/globals'
import { setupServer } from 'msw/node'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'

export interface CollaborationTestContext {
  doc: Y.Doc
  provider: WebsocketProvider
  persistence: IndexeddbPersistence
  cleanup: () => Promise<void>
}

export class CollaborationTestHarness {
  private docs: Map<string, Y.Doc> = new Map()
  private providers: Map<string, WebsocketProvider> = new Map()
  private server = setupServer()

  async createUser(userId: string): Promise<CollaborationTestContext> {
    const doc = new Y.Doc()
    const provider = new WebsocketProvider(
      'ws://localhost:1234',
      `test-room-${Date.now()}`,
      doc,
      { params: { userId } }
    )

    const persistence = new IndexeddbPersistence(`test-${userId}`, doc)
    
    this.docs.set(userId, doc)
    this.providers.set(userId, provider)

    return {
      doc,
      provider,
      persistence,
      cleanup: () => this.cleanupUser(userId)
    }
  }

  async simulateNetworkPartition(userId: string, durationMs: number) {
    const provider = this.providers.get(userId)
    if (!provider) throw new Error(`User ${userId} not found`)
    
    provider.disconnect()
    await new Promise(resolve => setTimeout(resolve, durationMs))
    provider.connect()
  }

  async waitForSync(userIds: string[], timeoutMs = 5000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      const docs = userIds.map(id => this.docs.get(id)!)
      const synced = docs.every((doc, i) => {
        return docs.every((otherDoc, j) => 
          i === j || Y.equalSnapshots(Y.snapshot(doc), Y.snapshot(otherDoc))
        )
      })
      
      if (synced) return
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    throw new Error(`Documents failed to sync within ${timeoutMs}ms`)
  }

  private async cleanupUser(userId: string) {
    this.providers.get(userId)?.disconnect()
    this.providers.delete(userId)
    this.docs.delete(userId)
  }
}

// Wedding-specific test factories
export interface WeddingFormData {
  coupleNames: string
  weddingDate: string
  venue: string
  guestCount: number
  budget: number
  vendors: VendorInfo[]
}

export interface VendorInfo {
  type: 'photographer' | 'florist' | 'caterer' | 'venue' | 'dj'
  name: string
  contact: string
  package: string
  cost: number
}

export class WeddingFormFactory {
  static createWeddingForm(doc: Y.Doc, data: Partial<WeddingFormData> = {}): Y.Map<any> {
    const form = doc.getMap('weddingForm')
    
    const defaultData: WeddingFormData = {
      coupleNames: 'Sarah & John',
      weddingDate: '2025-06-15',
      venue: 'Elegant Garden Venue',
      guestCount: 150,
      budget: 25000,
      vendors: [
        {
          type: 'photographer',
          name: 'Mike\'s Photography',
          contact: 'mike@photography.com',
          package: 'Full Day',
          cost: 3500
        }
      ]
    }

    const finalData = { ...defaultData, ...data }
    
    Object.entries(finalData).forEach(([key, value]) => {
      if (key === 'vendors') {
        const vendorArray = doc.getArray('vendors')
        vendorArray.insert(0, value)
        form.set(key, vendorArray)
      } else {
        form.set(key, value)
      }
    })

    return form
  }

  static createGuestList(doc: Y.Doc, guestCount: number = 50): Y.Array<any> {
    const guestList = doc.getArray('guestList')
    
    const guests = Array.from({ length: guestCount }, (_, i) => ({
      id: `guest-${i}`,
      name: `Guest ${i + 1}`,
      email: `guest${i + 1}@example.com`,
      attending: Math.random() > 0.1, // 90% attendance rate
      dietary: ['none', 'vegetarian', 'vegan', 'gluten-free'][Math.floor(Math.random() * 4)],
      plusOne: Math.random() > 0.6,
      table: Math.floor(i / 8) + 1
    }))

    guestList.insert(0, guests)
    return guestList
  }

  static createTimeline(doc: Y.Doc): Y.Array<any> {
    const timeline = doc.getArray('timeline')
    
    const events = [
      { time: '12:00', event: 'Venue Setup', vendor: 'venue', duration: 120 },
      { time: '14:00', event: 'Photography Setup', vendor: 'photographer', duration: 60 },
      { time: '15:00', event: 'Ceremony', vendor: 'officiant', duration: 30 },
      { time: '15:30', event: 'Cocktail Hour', vendor: 'caterer', duration: 60 },
      { time: '16:30', event: 'Reception', vendor: 'dj', duration: 240 }
    ]

    timeline.insert(0, events)
    return timeline
  }
}

// Test assertions for collaboration
export class CollaborationAssertions {
  static expectDocumentsEqual(doc1: Y.Doc, doc2: Y.Doc) {
    const snapshot1 = Y.snapshot(doc1)
    const snapshot2 = Y.snapshot(doc2)
    expect(Y.equalSnapshots(snapshot1, snapshot2)).toBe(true)
  }

  static expectArraysEqual(array1: Y.Array<any>, array2: Y.Array<any>) {
    expect(array1.length).toBe(array2.length)
    expect(array1.toArray()).toEqual(array2.toArray())
  }

  static expectOperationLatency(operationTimes: number[], maxLatency: number) {
    const avgLatency = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length
    const p95Latency = operationTimes.sort()[Math.floor(operationTimes.length * 0.95)]
    
    expect(avgLatency).toBeLessThan(maxLatency / 2)
    expect(p95Latency).toBeLessThan(maxLatency)
  }

  static expectConflictResolution(conflicts: any[], maxResolutionTime: number) {
    conflicts.forEach(conflict => {
      expect(conflict.resolutionTime).toBeLessThan(maxResolutionTime)
      expect(conflict.resolved).toBe(true)
      expect(conflict.dataIntegrityMaintained).toBe(true)
    })
  }
}

// Performance monitoring utilities
export class CollaborationMetrics {
  private static operationTimes: number[] = []
  private static conflicts: any[] = []

  static recordOperationTime(time: number) {
    this.operationTimes.push(time)
  }

  static recordConflict(conflict: any) {
    this.conflicts.push(conflict)
  }

  static getMetrics() {
    return {
      operationTimes: [...this.operationTimes],
      conflicts: [...this.conflicts],
      averageLatency: this.operationTimes.reduce((a, b) => a + b, 0) / this.operationTimes.length || 0,
      conflictRate: this.conflicts.length / this.operationTimes.length || 0
    }
  }

  static reset() {
    this.operationTimes = []
    this.conflicts = []
  }
}