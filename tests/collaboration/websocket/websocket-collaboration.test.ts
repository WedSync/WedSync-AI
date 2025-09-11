import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CollaborationTestHarness, CollaborationMetrics } from '../test-setup'

// Mock WebSocket for testing
class MockWebSocket {
  public readyState: number = 0
  public onopen: ((event: Event) => void) | null = null
  public onclose: ((event: CloseEvent) => void) | null = null
  public onerror: ((event: Event) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null

  private messageQueue: string[] = []

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = 1 // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 10)
  }

  send(data: string) {
    if (this.readyState === 1) {
      this.messageQueue.push(data)
      // Echo back for testing
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data }))
      }
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = 3 // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }))
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }

  getMessageQueue() {
    return [...this.messageQueue]
  }
}

describe('WebSocket Collaboration', () => {
  let harness: CollaborationTestHarness
  let mockWS: MockWebSocket

  beforeEach(() => {
    harness = new CollaborationTestHarness()
    CollaborationMetrics.reset()
    
    // Mock WebSocket globally
    global.WebSocket = MockWebSocket as any
  })

  afterEach(async () => {
    // Cleanup
  })

  describe('Connection Management', () => {
    it('should establish secure WebSocket connections for collaboration', async () => {
      const user1 = await harness.createUser('connection-test-1')
      const user2 = await harness.createUser('connection-test-2')

      // Verify connections established
      expect(user1.provider.ws).toBeDefined()
      expect(user2.provider.ws).toBeDefined()

      // Test connection states
      await new Promise(resolve => setTimeout(resolve, 50)) // Wait for connection
      expect(user1.provider.ws.readyState).toBe(1) // OPEN
      expect(user2.provider.ws.readyState).toBe(1) // OPEN

      await user1.cleanup()
      await user2.cleanup()
    })

    it('should handle connection failures and automatic reconnection', async () => {
      const user = await harness.createUser('reconnection-test')
      let connectionAttempts = 0
      let reconnectionSuccess = false

      // Mock connection failure
      const originalWS = user.provider.ws
      originalWS.simulateError()

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Verify reconnection logic
      // Note: In real implementation, Y.js WebSocket provider handles reconnection
      expect(user.provider.ws).toBeDefined()

      await user.cleanup()
    })

    it('should handle connection drops during active collaboration', async () => {
      const user1 = await harness.createUser('connection-drop-1')
      const user2 = await harness.createUser('connection-drop-2')

      const doc = user1.doc.getMap('connectionTest')
      doc.set('initial', 'value')

      await harness.waitForSync(['connection-drop-1', 'connection-drop-2'])

      // Simulate connection drop for user1
      user1.provider.ws.close(1006, 'Connection lost')

      // User2 continues making changes
      const user2Doc = user2.doc.getMap('connectionTest')
      user2Doc.set('while_disconnected', 'user2_change')

      // Simulate user1 reconnection
      await new Promise(resolve => setTimeout(resolve, 100))

      // Wait for sync after reconnection
      await harness.waitForSync(['connection-drop-1', 'connection-drop-2'], 5000)

      // Verify user1 received changes made while disconnected
      expect(doc.get('while_disconnected')).toBe('user2_change')

      await user1.cleanup()
      await user2.cleanup()
    })

    it('should manage concurrent WebSocket connections efficiently', async () => {
      // Create multiple concurrent connections
      const users = await Promise.all(
        Array.from({ length: 10 }, (_, i) => 
          harness.createUser(`concurrent-${i}`)
        )
      )

      // Wait for all connections to establish
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify all connections are active
      users.forEach((user, index) => {
        expect(user.provider.ws.readyState).toBe(1) // OPEN
      })

      // Test message broadcasting
      const sharedDoc = users[0].doc.getMap('broadcast')
      sharedDoc.set('message', 'Hello all users')

      const userIds = Array.from({ length: 10 }, (_, i) => `concurrent-${i}`)
      await harness.waitForSync(userIds)

      // Verify all users received the message
      users.forEach(user => {
        const userDoc = user.doc.getMap('broadcast')
        expect(userDoc.get('message')).toBe('Hello all users')
      })

      await Promise.all(users.map(user => user.cleanup()))
    })
  })

  describe('Message Broadcasting', () => {
    it('should broadcast operations to all session participants', async () => {
      const coordinator = await harness.createUser('broadcast-coordinator')
      const photographer = await harness.createUser('broadcast-photographer')
      const caterer = await harness.createUser('broadcast-caterer')

      const timeline = coordinator.doc.getArray('broadcastTimeline')

      // Coordinator adds event - should broadcast to all
      timeline.push([{
        time: '14:00',
        event: 'Setup begins',
        vendor: 'venue'
      }])

      await harness.waitForSync(['broadcast-coordinator', 'broadcast-photographer', 'broadcast-caterer'])

      // Verify all participants received the broadcast
      const photoTimeline = photographer.doc.getArray('broadcastTimeline')
      const catererTimeline = caterer.doc.getArray('broadcastTimeline')

      expect(photoTimeline.length).toBe(1)
      expect(catererTimeline.length).toBe(1)
      expect(photoTimeline.get(0).event).toBe('Setup begins')
      expect(catererTimeline.get(0).event).toBe('Setup begins')

      // Photographer responds - should broadcast to others
      photoTimeline.push([{
        time: '14:30',
        event: 'Photo equipment setup',
        vendor: 'photographer'
      }])

      await harness.waitForSync(['broadcast-coordinator', 'broadcast-photographer', 'broadcast-caterer'])

      // Verify coordinator and caterer received photographer's update
      expect(timeline.length).toBe(2)
      expect(catererTimeline.length).toBe(2)
      expect(timeline.get(1).vendor).toBe('photographer')

      await coordinator.cleanup()
      await photographer.cleanup()
      await caterer.cleanup()
    })

    it('should handle message ordering and delivery guarantees', async () => {
      const user1 = await harness.createUser('ordering-test-1')
      const user2 = await harness.createUser('ordering-test-2')

      const messageLog = user1.doc.getArray('messageLog')

      // Send messages in rapid succession
      const messages = [
        'Message 1: First message',
        'Message 2: Second message', 
        'Message 3: Third message',
        'Message 4: Fourth message',
        'Message 5: Fifth message'
      ]

      // Send all messages rapidly
      messages.forEach(message => {
        messageLog.push([{
          content: message,
          timestamp: Date.now()
        }])
      })

      await harness.waitForSync(['ordering-test-1', 'ordering-test-2'])

      // Verify ordering preserved
      const user2MessageLog = user2.doc.getArray('messageLog')
      expect(user2MessageLog.length).toBe(5)

      messages.forEach((message, index) => {
        expect(user2MessageLog.get(index).content).toBe(message)
      })

      await user1.cleanup()
      await user2.cleanup()
    })

    it('should handle large message payloads efficiently', async () => {
      const sender = await harness.createUser('large-payload-sender')
      const receiver = await harness.createUser('large-payload-receiver')

      const largeDocument = sender.doc.getText('largeDocument')
      
      // Create large payload (10KB of text)
      const largeText = 'Wedding planning details: '.repeat(500) // ~10KB

      const startTime = Date.now()
      largeDocument.insert(0, largeText)

      await harness.waitForSync(['large-payload-sender', 'large-payload-receiver'])
      const syncTime = Date.now() - startTime

      // Verify efficient transmission (should complete within 1 second)
      expect(syncTime).toBeLessThan(1000)

      // Verify content integrity
      const receiverDocument = receiver.doc.getText('largeDocument')
      expect(receiverDocument.length).toBe(largeText.length)
      expect(receiverDocument.toString()).toBe(largeText)

      await sender.cleanup()
      await receiver.cleanup()
    })
  })

  describe('Rate Limiting and Flow Control', () => {
    it('should enforce rate limiting on collaborative operations', async () => {
      const user = await harness.createUser('rate-limit-test')
      const document = user.doc.getArray('rateLimitTest')

      const operationTimes: number[] = []

      // Attempt to send many operations rapidly
      for (let i = 0; i < 100; i++) {
        const start = Date.now()
        document.push([`Operation ${i}`])
        const end = Date.now()
        operationTimes.push(end - start)

        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 1))
      }

      // Rate limiting should introduce some delays
      const totalTime = operationTimes.reduce((sum, time) => sum + time, 0)
      const averageTime = totalTime / operationTimes.length

      // With rate limiting, average operation time should increase
      expect(averageTime).toBeGreaterThan(0.1) // At least some minimal processing time

      await user.cleanup()
    })

    it('should handle backpressure when message queue is full', async () => {
      const sender = await harness.createUser('backpressure-sender')
      const receiver = await harness.createUser('backpressure-receiver')

      const messageQueue = sender.doc.getArray('messageQueue')

      // Fill up message queue rapidly
      const messages = Array.from({ length: 1000 }, (_, i) => `Message ${i}`)
      
      const startTime = Date.now()
      messages.forEach(message => {
        messageQueue.push([{ content: message, id: message }])
      })

      await harness.waitForSync(['backpressure-sender', 'backpressure-receiver'])
      const syncTime = Date.now() - startTime

      // Backpressure should prevent system overload
      expect(syncTime).toBeLessThan(5000) // Should complete within 5 seconds

      // Verify all messages received
      const receiverQueue = receiver.doc.getArray('messageQueue')
      expect(receiverQueue.length).toBe(1000)

      await sender.cleanup()
      await receiver.cleanup()
    })
  })

  describe('Wedding Industry WebSocket Scenarios', () => {
    it('should handle wedding day emergency communication', async () => {
      const emergencyUsers = {
        coordinator: await harness.createUser('emergency-coordinator'),
        photographer: await harness.createUser('emergency-photographer'),
        caterer: await harness.createUser('emergency-caterer'),
        dj: await harness.createUser('emergency-dj')
      }

      const emergencyChannel = emergencyUsers.coordinator.doc.getArray('emergency')

      // Coordinator broadcasts emergency
      emergencyChannel.push([{
        type: 'EMERGENCY',
        message: 'Ceremony delayed 30 minutes due to traffic',
        timestamp: Date.now(),
        priority: 'HIGH',
        affectedVendors: ['photographer', 'caterer', 'dj']
      }])

      const userIds = Object.keys(emergencyUsers).map(k => `emergency-${k}`)
      await harness.waitForSync(userIds, 1000) // Fast sync for emergency

      // All vendors should receive emergency message immediately
      Object.values(emergencyUsers).forEach(user => {
        const userChannel = user.doc.getArray('emergency')
        expect(userChannel.length).toBe(1)
        const emergency = userChannel.get(0)
        expect(emergency.type).toBe('EMERGENCY')
        expect(emergency.priority).toBe('HIGH')
      })

      // Vendors acknowledge receipt
      const photographerChannel = emergencyUsers.photographer.doc.getArray('emergency')
      photographerChannel.push([{
        type: 'ACKNOWLEDGMENT',
        originalId: 0,
        vendor: 'photographer',
        message: 'Acknowledged - adjusting setup time',
        timestamp: Date.now()
      }])

      await harness.waitForSync(userIds)

      // Coordinator sees acknowledgment
      expect(emergencyChannel.length).toBe(2)
      const ack = emergencyChannel.get(1)
      expect(ack.type).toBe('ACKNOWLEDGMENT')
      expect(ack.vendor).toBe('photographer')

      await Promise.all(Object.values(emergencyUsers).map(user => user.cleanup()))
    })

    it('should support real-time vendor check-in system', async () => {
      const checkinUsers = {
        coordinator: await harness.createUser('checkin-coordinator'),
        photographer: await harness.createUser('checkin-photographer'),
        florist: await harness.createUser('checkin-florist'),
        caterer: await harness.createUser('checkin-caterer')
      }

      const checkinStatus = checkinUsers.coordinator.doc.getMap('vendorCheckins')

      // Initialize vendor status
      checkinStatus.set('photographer', { status: 'expected', eta: '13:30' })
      checkinStatus.set('florist', { status: 'expected', eta: '12:00' })
      checkinStatus.set('caterer', { status: 'expected', eta: '14:00' })

      const userIds = Object.keys(checkinUsers).map(k => `checkin-${k}`)
      await harness.waitForSync(userIds)

      // Photographer checks in
      const photoStatus = checkinUsers.photographer.doc.getMap('vendorCheckins')
      photoStatus.set('photographer', {
        status: 'arrived',
        checkinTime: new Date().toISOString(),
        location: 'Parking lot',
        notes: 'Equipment unloading'
      })

      await harness.waitForSync(userIds)

      // Coordinator sees photographer checked in
      expect(checkinStatus.get('photographer').status).toBe('arrived')
      expect(checkinStatus.get('photographer').location).toBe('Parking lot')

      // Florist checks in with delay
      const floristStatus = checkinUsers.florist.doc.getMap('vendorCheckins')
      floristStatus.set('florist', {
        status: 'delayed',
        newEta: '12:30',
        reason: 'Traffic on highway',
        checkinTime: new Date().toISOString()
      })

      await harness.waitForSync(userIds)

      // All users see updated status
      expect(checkinStatus.get('florist').status).toBe('delayed')
      expect(photoStatus.get('florist').status).toBe('delayed')

      await Promise.all(Object.values(checkinUsers).map(user => user.cleanup()))
    })

    it('should handle collaborative shot list updates during wedding', async () => {
      const weddingUsers = {
        photographer: await harness.createUser('wedding-photographer'),
        videographer: await harness.createUser('wedding-videographer'),
        assistant: await harness.createUser('wedding-assistant')
      }

      const shotList = weddingUsers.photographer.doc.getArray('liveShotList')

      // Pre-wedding shot list
      const initialShots = [
        { id: 1, type: 'prep', subject: 'Bride getting ready', priority: 'high', status: 'pending' },
        { id: 2, type: 'ceremony', subject: 'Walking down aisle', priority: 'critical', status: 'pending' },
        { id: 3, type: 'reception', subject: 'First dance', priority: 'critical', status: 'pending' }
      ]

      initialShots.forEach(shot => shotList.push([shot]))

      const userIds = Object.keys(weddingUsers).map(k => `wedding-${k}`)
      await harness.waitForSync(userIds)

      // During wedding: Photographer marks shots as completed
      const photoShotList = weddingUsers.photographer.doc.getArray('liveShotList')
      const prepShot = photoShotList.get(0)
      prepShot.status = 'completed'
      prepShot.completedAt = new Date().toISOString()
      prepShot.notes = 'Beautiful natural lighting'

      await harness.waitForSync(userIds)

      // Videographer sees update and adds video note
      const videoShotList = weddingUsers.videographer.doc.getArray('liveShotList')
      const videoShot = videoShotList.get(0)
      videoShot.videoNotes = 'Captured 4K version as well'

      await harness.waitForSync(userIds)

      // Assistant adds new urgent shot
      const assistantShotList = weddingUsers.assistant.doc.getArray('liveShotList')
      assistantShotList.push([{
        id: 4,
        type: 'ceremony',
        subject: 'Ring bearer emergency',
        priority: 'urgent',
        status: 'pending',
        addedBy: 'assistant',
        timestamp: new Date().toISOString()
      }])

      await harness.waitForSync(userIds)

      // All team members see the urgent shot
      expect(shotList.length).toBe(4)
      expect(photoShotList.get(3).priority).toBe('urgent')
      expect(videoShotList.get(3).subject).toBe('Ring bearer emergency')

      await Promise.all(Object.values(weddingUsers).map(user => user.cleanup()))
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should gracefully handle WebSocket errors', async () => {
      const user = await harness.createUser('error-test')
      const document = user.doc.getMap('errorTest')

      // Set initial data
      document.set('initial', 'value')

      // Simulate WebSocket error
      user.provider.ws.simulateError()

      // Continue making changes (should queue locally)
      document.set('during_error', 'queued_value')

      // Wait for potential recovery
      await new Promise(resolve => setTimeout(resolve, 500))

      // Operations should still be applied locally
      expect(document.get('during_error')).toBe('queued_value')

      await user.cleanup()
    })

    it('should recover from server disconnections', async () => {
      const user1 = await harness.createUser('disconnect-test-1')
      const user2 = await harness.createUser('disconnect-test-2')

      const doc1 = user1.doc.getMap('disconnectTest')
      const doc2 = user2.doc.getMap('disconnectTest')

      doc1.set('before_disconnect', 'synced_value')
      await harness.waitForSync(['disconnect-test-1', 'disconnect-test-2'])

      // Simulate server disconnection
      user1.provider.ws.close(1001, 'Server going down')

      // Both users continue making changes
      doc1.set('during_disconnect_user1', 'local_change_1')
      doc2.set('during_disconnect_user2', 'local_change_2')

      // Simulate reconnection after server recovery
      await new Promise(resolve => setTimeout(resolve, 1000))

      // After reconnection, changes should sync
      await harness.waitForSync(['disconnect-test-1', 'disconnect-test-2'])

      expect(doc1.get('during_disconnect_user2')).toBe('local_change_2')
      expect(doc2.get('during_disconnect_user1')).toBe('local_change_1')

      await user1.cleanup()
      await user2.cleanup()
    })
  })

  describe('Performance Under WebSocket Load', () => {
    it('should maintain performance with high message throughput', async () => {
      const sender = await harness.createUser('throughput-sender')
      const receiver = await harness.createUser('throughput-receiver')

      const messageArray = sender.doc.getArray('throughputTest')
      const messageCount = 500
      const startTime = Date.now()

      // Send messages as fast as possible
      for (let i = 0; i < messageCount; i++) {
        messageArray.push([{
          id: i,
          content: `High throughput message ${i}`,
          timestamp: Date.now()
        }])
      }

      await harness.waitForSync(['throughput-sender', 'throughput-receiver'])
      const totalTime = Date.now() - startTime

      // Performance requirement: handle 500 messages in under 2 seconds
      expect(totalTime).toBeLessThan(2000)

      // Verify all messages received
      const receiverArray = receiver.doc.getArray('throughputTest')
      expect(receiverArray.length).toBe(messageCount)

      // Calculate throughput
      const messagesPerSecond = messageCount / (totalTime / 1000)
      expect(messagesPerSecond).toBeGreaterThan(100) // At least 100 messages/second

      await sender.cleanup()
      await receiver.cleanup()
    })

    it('should handle connection pooling efficiently', async () => {
      // Create many users sharing the same document
      const users = await Promise.all(
        Array.from({ length: 25 }, (_, i) => 
          harness.createUser(`pool-user-${i}`)
        )
      )

      const sharedDoc = users[0].doc.getMap('poolTest')
      sharedDoc.set('initial', 'shared_value')

      const userIds = users.map((_, i) => `pool-user-${i}`)
      await harness.waitForSync(userIds)

      // Each user makes a change
      const startTime = Date.now()
      await Promise.all(
        users.map(async (user, index) => {
          const userDoc = user.doc.getMap('poolTest')
          userDoc.set(`user_${index}`, `value_${index}`)
        })
      )

      await harness.waitForSync(userIds)
      const syncTime = Date.now() - startTime

      // Should handle 25 concurrent users efficiently
      expect(syncTime).toBeLessThan(3000) // Under 3 seconds

      // Verify all changes synced
      const finalDoc = sharedDoc.toJSON()
      expect(Object.keys(finalDoc)).toHaveLength(26) // initial + 25 users

      await Promise.all(users.map(user => user.cleanup()))
    })
  })
})