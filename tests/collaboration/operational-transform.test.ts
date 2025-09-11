import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Y from 'yjs'
import { CollaborationTestHarness, WeddingFormFactory, CollaborationAssertions } from './test-setup'

describe('Y.js Operational Transform Validation', () => {
  let harness: CollaborationTestHarness

  beforeEach(() => {
    harness = new CollaborationTestHarness()
  })

  afterEach(async () => {
    // Cleanup any remaining connections
  })

  describe('Wedding Form Collaborative Editing', () => {
    it('should handle concurrent guest list edits without conflicts', async () => {
      // Simulate couple and wedding planner editing guest list simultaneously
      const couple = await harness.createUser('couple-sarah-john')
      const planner = await harness.createUser('planner-jane')

      // Create shared guest list
      const coupleGuestList = couple.doc.getArray<any>('guestList')
      const plannerGuestList = planner.doc.getArray<any>('guestList')

      // Concurrent edits
      coupleGuestList.push([{
        name: 'Sarah\'s College Friends',
        count: 8,
        dietary: 'vegetarian'
      }])

      plannerGuestList.push([{
        name: 'Venue Coordinator',
        count: 1,
        dietary: 'none'
      }])

      // Wait for operational transforms to converge
      await harness.waitForSync(['couple-sarah-john', 'planner-jane'])

      // Verify both documents have identical state
      expect(coupleGuestList.length).toBe(2)
      expect(plannerGuestList.length).toBe(2)
      expect(coupleGuestList.toArray()).toEqual(plannerGuestList.toArray())

      await couple.cleanup()
      await planner.cleanup()
    })

    it('should handle rapid-fire timeline adjustments', async () => {
      const photographer = await harness.createUser('photographer-mike')
      const coordinator = await harness.createUser('coordinator-lisa')
      const venue = await harness.createUser('venue-manager')

      const timeline = photographer.doc.getMap('weddingTimeline')

      // Rapid concurrent updates to wedding timeline
      const updates = [
        () => timeline.set('ceremony_start', '14:00'),
        () => timeline.set('photos_start', '15:30'),
        () => timeline.set('reception_start', '17:00')
      ]

      // Execute all updates simultaneously
      await Promise.all(updates.map(update => update()))

      await harness.waitForSync([
        'photographer-mike', 
        'coordinator-lisa', 
        'venue-manager'
      ])

      // Verify consistency
      const finalTimeline = coordinator.doc.getMap('weddingTimeline')
      expect(finalTimeline.get('ceremony_start')).toBe('14:00')
      expect(finalTimeline.get('photos_start')).toBe('15:30')
      expect(finalTimeline.get('reception_start')).toBe('17:00')

      await photographer.cleanup()
      await coordinator.cleanup()
      await venue.cleanup()
    })

    it('should preserve data integrity during network partitions', async () => {
      const vendor1 = await harness.createUser('vendor-florist')
      const vendor2 = await harness.createUser('vendor-caterer')

      const sharedBudget = vendor1.doc.getMap('budget')
      sharedBudget.set('flowers', 2500)
      sharedBudget.set('catering', 8500)

      // Simulate network partition
      await harness.simulateNetworkPartition('vendor-florist', 2000)

      // Vendor2 makes changes while vendor1 is offline
      const vendor2Budget = vendor2.doc.getMap('budget')
      vendor2Budget.set('catering', 9000) // Price increase
      vendor2Budget.set('service_charge', 500)

      // Wait for vendor1 to reconnect and sync
      await harness.waitForSync(['vendor-florist', 'vendor-caterer'], 10000)

      // Verify data integrity maintained
      expect(sharedBudget.get('flowers')).toBe(2500)
      expect(sharedBudget.get('catering')).toBe(9000)
      expect(sharedBudget.get('service_charge')).toBe(500)

      await vendor1.cleanup()
      await vendor2.cleanup()
    })

    it('should handle complex wedding ceremony timeline collaboration', async () => {
      const photographer = await harness.createUser('photographer-main')
      const videographer = await harness.createUser('videographer-team')
      const coordinator = await harness.createUser('coordinator-venue')

      // Create shared ceremony timeline
      const ceremonyTimeline = photographer.doc.getArray('ceremonyTimeline')
      
      // Photographer adds shot list items
      ceremonyTimeline.push([
        { time: '14:00', item: 'Bridal party arrival', type: 'photo', priority: 'high' },
        { time: '14:15', item: 'Family photos', type: 'photo', priority: 'high' }
      ])

      // Videographer adds video requirements
      const videoTimeline = videographer.doc.getArray('ceremonyTimeline')
      videoTimeline.push([
        { time: '14:05', item: 'Ceremony setup video', type: 'video', priority: 'medium' },
        { time: '14:30', item: 'Processional video', type: 'video', priority: 'high' }
      ])

      // Coordinator adds venue requirements
      const coordTimeline = coordinator.doc.getArray('ceremonyTimeline')
      coordTimeline.push([
        { time: '13:45', item: 'Venue setup complete', type: 'venue', priority: 'critical' },
        { time: '14:45', item: 'Ceremony begins', type: 'venue', priority: 'critical' }
      ])

      await harness.waitForSync(['photographer-main', 'videographer-team', 'coordinator-venue'])

      // All should have same timeline with all items
      expect(ceremonyTimeline.length).toBe(6)
      expect(videoTimeline.length).toBe(6)
      expect(coordTimeline.length).toBe(6)

      // Verify timeline is properly merged
      const allItems = ceremonyTimeline.toArray()
      const photoItems = allItems.filter(item => item.type === 'photo')
      const videoItems = allItems.filter(item => item.type === 'video')
      const venueItems = allItems.filter(item => item.type === 'venue')

      expect(photoItems).toHaveLength(2)
      expect(videoItems).toHaveLength(2)
      expect(venueItems).toHaveLength(2)

      await photographer.cleanup()
      await videographer.cleanup()
      await coordinator.cleanup()
    })
  })

  describe('Conflict Resolution Patterns', () => {
    it('should handle Last-Writer-Wins for simple fields', async () => {
      const user1 = await harness.createUser('user1')
      const user2 = await harness.createUser('user2')

      const sharedMap = user1.doc.getMap('shared')
      
      // Simultaneous writes to same field
      sharedMap.set('wedding_date', '2025-06-15')
      user2.doc.getMap('shared').set('wedding_date', '2025-06-22')

      await harness.waitForSync(['user1', 'user2'])

      // One value should win (deterministic based on Y.js algorithm)
      const finalDate = sharedMap.get('wedding_date')
      expect(finalDate).toMatch(/2025-06-(15|22)/)

      await user1.cleanup()
      await user2.cleanup()
    })

    it('should merge array operations correctly', async () => {
      const user1 = await harness.createUser('user1')
      const user2 = await harness.createUser('user2')

      const sharedArray = user1.doc.getArray('tasks')
      const user2Array = user2.doc.getArray('tasks')

      // Concurrent array insertions
      sharedArray.push(['Book photographer'])
      user2Array.push(['Order flowers'])
      
      sharedArray.insert(0, ['Send invitations'])
      user2Array.insert(1, ['Book venue'])

      await harness.waitForSync(['user1', 'user2'])

      // Verify all items present without duplicates
      const finalTasks = sharedArray.toArray()
      expect(finalTasks).toHaveLength(4)
      expect(finalTasks).toContain('Send invitations')
      expect(finalTasks).toContain('Book photographer')
      expect(finalTasks).toContain('Order flowers')
      expect(finalTasks).toContain('Book venue')

      await user1.cleanup()
      await user2.cleanup()
    })

    it('should handle complex text editing conflicts in wedding notes', async () => {
      const planner = await harness.createUser('planner-main')
      const client = await harness.createUser('client-couple')

      const weddingNotes = planner.doc.getText('weddingNotes')
      const clientNotes = client.doc.getText('weddingNotes')

      // Initial content
      weddingNotes.insert(0, 'Wedding Planning Notes:\n')
      await harness.waitForSync(['planner-main', 'client-couple'])

      // Concurrent text editing
      weddingNotes.insert(weddingNotes.length, '\n- Venue: Garden Estate')
      clientNotes.insert(clientNotes.length, '\n- Guest count: 150 people')

      weddingNotes.insert(weddingNotes.length, '\n- Photography: 8 hours')
      clientNotes.insert(clientNotes.length, '\n- Catering: Buffet style')

      await harness.waitForSync(['planner-main', 'client-couple'])

      // Both should have all content
      const finalNotes = weddingNotes.toString()
      expect(finalNotes).toContain('Venue: Garden Estate')
      expect(finalNotes).toContain('Guest count: 150 people')
      expect(finalNotes).toContain('Photography: 8 hours')
      expect(finalNotes).toContain('Catering: Buffet style')

      // Verify text integrity
      CollaborationAssertions.expectDocumentsEqual(planner.doc, client.doc)

      await planner.cleanup()
      await client.cleanup()
    })

    it('should handle simultaneous budget calculations', async () => {
      const planner = await harness.createUser('budget-planner')
      const client = await harness.createUser('budget-client')

      const budget = planner.doc.getMap('budget')
      const clientBudget = client.doc.getMap('budget')

      // Set initial budget items
      budget.set('venue', 8000)
      budget.set('photography', 3500)

      await harness.waitForSync(['budget-planner', 'budget-client'])

      // Simultaneous budget updates
      budget.set('catering', 6000)
      budget.set('flowers', 1500)
      clientBudget.set('music', 1200)
      clientBudget.set('transportation', 800)

      // Both modify photography
      budget.set('photography', 4000) // Planner increases
      clientBudget.set('photography', 3800) // Client negotiates down

      await harness.waitForSync(['budget-planner', 'budget-client'])

      // Verify all budget items present
      const finalBudget = budget.toJSON()
      expect(finalBudget.venue).toBe(8000)
      expect(finalBudget.catering).toBe(6000)
      expect(finalBudget.flowers).toBe(1500)
      expect(finalBudget.music).toBe(1200)
      expect(finalBudget.transportation).toBe(800)
      
      // Photography should have one of the conflicting values
      expect([3800, 4000]).toContain(finalBudget.photography)

      await planner.cleanup()
      await client.cleanup()
    })
  })

  describe('Wedding Industry Stress Tests', () => {
    it('should handle multiple vendors editing timeline simultaneously', async () => {
      const vendors = await Promise.all([
        harness.createUser('photographer'),
        harness.createUser('caterer'),
        harness.createUser('florist'),
        harness.createUser('dj'),
        harness.createUser('venue-coordinator')
      ])

      const timeline = vendors[0].doc.getArray('timeline')

      // Each vendor adds their timeline items simultaneously
      const vendorOperations = [
        () => timeline.push([{ vendor: 'photographer', time: '14:00', task: 'Setup equipment' }]),
        () => timeline.push([{ vendor: 'caterer', time: '16:00', task: 'Food service begins' }]),
        () => timeline.push([{ vendor: 'florist', time: '13:00', task: 'Decoration setup' }]),
        () => timeline.push([{ vendor: 'dj', time: '17:00', task: 'Music starts' }]),
        () => timeline.push([{ vendor: 'venue-coordinator', time: '12:00', task: 'Venue prep' }])
      ]

      // Execute all operations concurrently
      await Promise.all(vendorOperations.map(op => op()))

      const userIds = ['photographer', 'caterer', 'florist', 'dj', 'venue-coordinator']
      await harness.waitForSync(userIds)

      // Verify all timeline items are present
      expect(timeline.length).toBe(5)

      // Check each vendor can see all items
      for (let i = 1; i < vendors.length; i++) {
        const vendorTimeline = vendors[i].doc.getArray('timeline')
        expect(vendorTimeline.length).toBe(5)
        CollaborationAssertions.expectArraysEqual(timeline, vendorTimeline)
      }

      await Promise.all(vendors.map(vendor => vendor.cleanup()))
    })

    it('should maintain performance with large guest lists', async () => {
      const coordinator = await harness.createUser('coordinator')
      const planner = await harness.createUser('planner')

      // Create large guest list
      const guestList = WeddingFormFactory.createGuestList(coordinator.doc, 500)
      await harness.waitForSync(['coordinator', 'planner'])

      // Simulate concurrent edits to guest list
      const startTime = Date.now()
      
      // Coordinator updates dietary requirements
      for (let i = 0; i < 50; i++) {
        const guest = guestList.get(i)
        guest.dietary = 'vegetarian'
      }

      // Planner updates table assignments
      const plannerGuestList = planner.doc.getArray('guestList')
      for (let i = 50; i < 100; i++) {
        const guest = plannerGuestList.get(i)
        guest.table = Math.floor(i / 8) + 1
      }

      await harness.waitForSync(['coordinator', 'planner'])
      const syncTime = Date.now() - startTime

      // Verify sync completed within reasonable time
      expect(syncTime).toBeLessThan(5000) // Less than 5 seconds

      // Verify data integrity
      expect(guestList.length).toBe(500)
      const finalGuestList = plannerGuestList.toArray()
      expect(finalGuestList).toHaveLength(500)

      await coordinator.cleanup()
      await planner.cleanup()
    })
  })

  describe('Error Recovery and Edge Cases', () => {
    it('should recover from corrupted document states', async () => {
      const user1 = await harness.createUser('user-primary')
      const user2 = await harness.createUser('user-backup')

      const form = WeddingFormFactory.createWeddingForm(user1.doc)
      await harness.waitForSync(['user-primary', 'user-backup'])

      // Simulate document corruption by applying invalid operations
      try {
        const text = user1.doc.getText('corruptedField')
        text.insert(0, 'Valid content')
        // Attempt to insert at invalid position
        text.insert(1000, 'Invalid position')
      } catch (error) {
        // Error should be handled gracefully
      }

      // System should recover and maintain sync
      form.set('recovery_test', 'System recovered')
      await harness.waitForSync(['user-primary', 'user-backup'])

      const user2Form = user2.doc.getMap('weddingForm')
      expect(user2Form.get('recovery_test')).toBe('System recovered')

      await user1.cleanup()
      await user2.cleanup()
    })

    it('should handle rapid connect/disconnect cycles', async () => {
      const user = await harness.createUser('unstable-connection')
      const stable = await harness.createUser('stable-user')

      const doc = user.doc.getMap('testDoc')
      doc.set('initial', 'value')

      // Simulate unstable connection
      for (let i = 0; i < 5; i++) {
        await harness.simulateNetworkPartition('unstable-connection', 100)
        doc.set(`reconnect_${i}`, `value_${i}`)
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      await harness.waitForSync(['unstable-connection', 'stable-user'])

      const stableDoc = stable.doc.getMap('testDoc')
      expect(stableDoc.get('initial')).toBe('value')
      
      // All reconnect values should be synced
      for (let i = 0; i < 5; i++) {
        expect(stableDoc.get(`reconnect_${i}`)).toBe(`value_${i}`)
      }

      await user.cleanup()
      await stable.cleanup()
    })
  })
})