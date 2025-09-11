import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Y from 'yjs'
import { CollaborationTestHarness, WeddingFormFactory, CollaborationMetrics } from '../test-setup'

describe('Real-time Collaborative Editing', () => {
  let harness: CollaborationTestHarness

  beforeEach(() => {
    harness = new CollaborationTestHarness()
    CollaborationMetrics.reset()
  })

  afterEach(async () => {
    // Cleanup
  })

  describe('Multi-User Real-Time Synchronization', () => {
    it('should synchronize edits between multiple users in real-time', async () => {
      const photographer = await harness.createUser('photographer-sarah')
      const planner = await harness.createUser('planner-mike')
      const couple = await harness.createUser('couple-jones')

      // Create shared wedding timeline
      const timeline = photographer.doc.getArray('timeline')
      
      // Photographer adds photography timeline
      timeline.push([{
        time: '14:00',
        activity: 'Bridal party photos',
        vendor: 'photographer',
        duration: 60,
        location: 'Garden area'
      }])

      // Wait for real-time sync
      await harness.waitForSync(['photographer-sarah', 'planner-mike', 'couple-jones'])

      // Verify all users see the update immediately
      const plannerTimeline = planner.doc.getArray('timeline')
      const coupleTimeline = couple.doc.getArray('timeline')

      expect(plannerTimeline.length).toBe(1)
      expect(coupleTimeline.length).toBe(1)

      const photoEvent = plannerTimeline.get(0)
      expect(photoEvent.activity).toBe('Bridal party photos')
      expect(photoEvent.vendor).toBe('photographer')

      // Planner adds ceremony details
      plannerTimeline.push([{
        time: '15:00',
        activity: 'Ceremony begins',
        vendor: 'officiant',
        duration: 30,
        location: 'Main altar'
      }])

      await harness.waitForSync(['photographer-sarah', 'planner-mike', 'couple-jones'])

      // All users should see both events
      expect(timeline.length).toBe(2)
      expect(coupleTimeline.length).toBe(2)

      await photographer.cleanup()
      await planner.cleanup()
      await couple.cleanup()
    })

    it('should display accurate user presence and cursor positions', async () => {
      const user1 = await harness.createUser('editor-1')
      const user2 = await harness.createUser('editor-2')

      const weddingNotes = user1.doc.getText('weddingNotes')
      weddingNotes.insert(0, 'Wedding planning notes go here...')

      await harness.waitForSync(['editor-1', 'editor-2'])

      // Simulate cursor positions
      const awareness1 = user1.provider.awareness
      const awareness2 = user2.provider.awareness

      awareness1.setLocalStateField('cursor', { position: 10, user: 'editor-1' })
      awareness2.setLocalStateField('cursor', { position: 25, user: 'editor-2' })

      // Wait for awareness to sync
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify presence information
      const user1Awareness = Array.from(awareness2.getStates().values())
      const user2Awareness = Array.from(awareness1.getStates().values())

      expect(user1Awareness.some(state => state.cursor?.user === 'editor-1')).toBe(true)
      expect(user2Awareness.some(state => state.cursor?.user === 'editor-2')).toBe(true)

      await user1.cleanup()
      await user2.cleanup()
    })

    it('should handle collaborative typing with proper conflict resolution', async () => {
      const vendorA = await harness.createUser('vendor-florist')
      const vendorB = await harness.createUser('vendor-caterer')

      const serviceNotes = vendorA.doc.getText('serviceNotes')
      const vendorBNotes = vendorB.doc.getText('serviceNotes')

      // Initial content
      serviceNotes.insert(0, 'Service coordination notes:\n')
      await harness.waitForSync(['vendor-florist', 'vendor-caterer'])

      // Simulate rapid typing from both vendors
      const floristUpdates = [
        'Flower arrangements: White roses and peonies\n',
        'Setup time: 2 hours before ceremony\n',
        'Breakdown: Immediately after reception\n'
      ]

      const catererUpdates = [
        'Menu: Italian buffet with vegetarian options\n',
        'Service staff: 6 servers, 2 bartenders\n',
        'Cleanup: 1 hour after last guest\n'
      ]

      // Interleave typing to simulate real concurrent editing
      for (let i = 0; i < Math.max(floristUpdates.length, catererUpdates.length); i++) {
        if (i < floristUpdates.length) {
          serviceNotes.insert(serviceNotes.length, floristUpdates[i])
        }
        if (i < catererUpdates.length) {
          vendorBNotes.insert(vendorBNotes.length, catererUpdates[i])
        }
        
        // Small delay to simulate typing speed
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      await harness.waitForSync(['vendor-florist', 'vendor-caterer'])

      // Verify all content is present and consistent
      const finalNotes = serviceNotes.toString()
      expect(finalNotes).toContain('White roses and peonies')
      expect(finalNotes).toContain('Italian buffet')
      expect(finalNotes).toContain('6 servers, 2 bartenders')
      expect(finalNotes).toContain('Breakdown: Immediately after reception')

      // Verify both documents are identical
      expect(serviceNotes.toString()).toBe(vendorBNotes.toString())

      await vendorA.cleanup()
      await vendorB.cleanup()
    })

    it('should maintain smooth performance with 20+ concurrent users', async () => {
      // Create 20 concurrent users
      const users = await Promise.all(
        Array.from({ length: 20 }, (_, i) => 
          harness.createUser(`user-${i}`)
        )
      )

      const sharedDocument = users[0].doc.getMap('sharedWeddingPlan')
      sharedDocument.set('title', 'Large Wedding Planning Session')

      const userIds = users.map((_, i) => `user-${i}`)
      await harness.waitForSync(userIds)

      // Each user makes concurrent updates
      const startTime = Date.now()
      
      await Promise.all(
        users.map(async (user, index) => {
          const doc = user.doc.getMap('sharedWeddingPlan')
          doc.set(`user_${index}_task`, `Task from user ${index}`)
          doc.set(`user_${index}_timestamp`, Date.now())
          
          // Add to shared array
          const tasks = user.doc.getArray('tasks')
          tasks.push([`User ${index} task item`])
        })
      )

      await harness.waitForSync(userIds)
      const totalTime = Date.now() - startTime

      // Performance requirements: should complete within 2 seconds
      expect(totalTime).toBeLessThan(2000)

      // Verify all updates are present
      const finalDoc = sharedDocument.toJSON()
      expect(Object.keys(finalDoc)).toHaveLength(41) // title + 20 users * 2 fields each

      // Verify shared array has all items
      const finalTasks = users[0].doc.getArray('tasks')
      expect(finalTasks.length).toBe(20)

      // Cleanup all users
      await Promise.all(users.map(user => user.cleanup()))
    })

    it('should update document version history in real-time', async () => {
      const editor1 = await harness.createUser('primary-editor')
      const editor2 = await harness.createUser('secondary-editor')

      const weddingDetails = editor1.doc.getMap('weddingDetails')
      
      // Track version history
      const versions: any[] = []
      
      // Editor 1 makes initial changes
      weddingDetails.set('venue', 'Garden Estate')
      versions.push({ user: 'primary-editor', change: 'venue', value: 'Garden Estate' })

      await harness.waitForSync(['primary-editor', 'secondary-editor'])

      // Editor 2 adds guest count
      const editor2Details = editor2.doc.getMap('weddingDetails')
      editor2Details.set('guestCount', 150)
      versions.push({ user: 'secondary-editor', change: 'guestCount', value: 150 })

      await harness.waitForSync(['primary-editor', 'secondary-editor'])

      // Editor 1 updates venue
      weddingDetails.set('venue', 'Lakeside Manor')
      versions.push({ user: 'primary-editor', change: 'venue', value: 'Lakeside Manor' })

      await harness.waitForSync(['primary-editor', 'secondary-editor'])

      // Verify final state reflects all changes
      const finalDetails = weddingDetails.toJSON()
      expect(finalDetails.venue).toBe('Lakeside Manor')
      expect(finalDetails.guestCount).toBe(150)

      // Both editors should see the same final state
      const editor2FinalDetails = editor2Details.toJSON()
      expect(editor2FinalDetails).toEqual(finalDetails)

      await editor1.cleanup()
      await editor2.cleanup()
    })
  })

  describe('Advanced Real-Time Features', () => {
    it('should handle real-time comment system', async () => {
      const planner = await harness.createUser('planner')
      const client = await harness.createUser('client')

      const timeline = planner.doc.getArray('timeline')
      const comments = planner.doc.getArray('comments')

      // Add timeline item
      timeline.push([{
        id: 'ceremony-1',
        time: '15:00',
        activity: 'Ceremony',
        duration: 30
      }])

      await harness.waitForSync(['planner', 'client'])

      // Client adds comment
      const clientComments = client.doc.getArray('comments')
      clientComments.push([{
        id: 'comment-1',
        timelineId: 'ceremony-1',
        author: 'client',
        message: 'Can we extend the ceremony to 45 minutes?',
        timestamp: new Date().toISOString()
      }])

      await harness.waitForSync(['planner', 'client'])

      // Planner sees comment and responds
      expect(comments.length).toBe(1)
      const comment = comments.get(0)
      expect(comment.message).toBe('Can we extend the ceremony to 45 minutes?')

      // Planner responds
      comments.push([{
        id: 'comment-2',
        timelineId: 'ceremony-1',
        author: 'planner',
        message: 'Yes, we can adjust that. I\'ll update the timeline.',
        timestamp: new Date().toISOString(),
        replyTo: 'comment-1'
      }])

      await harness.waitForSync(['planner', 'client'])

      // Client sees the response
      expect(clientComments.length).toBe(2)
      const reply = clientComments.get(1)
      expect(reply.replyTo).toBe('comment-1')
      expect(reply.author).toBe('planner')

      await planner.cleanup()
      await client.cleanup()
    })

    it('should support real-time form field validation', async () => {
      const coordinator = await harness.createUser('coordinator')
      const vendors = await Promise.all([
        harness.createUser('photographer'),
        harness.createUser('caterer'),
        harness.createUser('florist')
      ])

      const vendorForm = coordinator.doc.getMap('vendorAssignments')
      const validationErrors = coordinator.doc.getArray('validationErrors')

      // Coordinator assigns overlapping time slots (should trigger validation)
      vendorForm.set('photography_time', '14:00-16:00')
      vendorForm.set('ceremony_photos', '15:30-16:30') // Overlap!

      await harness.waitForSync(['coordinator', 'photographer', 'caterer', 'florist'])

      // Photographer sees the conflict and flags it
      const photographerForm = vendors[0].doc.getMap('vendorAssignments')
      const photographerErrors = vendors[0].doc.getArray('validationErrors')
      
      photographerErrors.push([{
        field: 'ceremony_photos',
        error: 'Time conflict with photography_time slot',
        severity: 'warning',
        suggestedFix: 'Adjust ceremony photos to 16:00-17:00'
      }])

      await harness.waitForSync(['coordinator', 'photographer', 'caterer', 'florist'])

      // Coordinator sees the validation error
      expect(validationErrors.length).toBe(1)
      const error = validationErrors.get(0)
      expect(error.field).toBe('ceremony_photos')
      expect(error.error).toContain('Time conflict')

      // Coordinator fixes the conflict
      vendorForm.set('ceremony_photos', '16:00-17:00')

      // Clear the validation error
      validationErrors.delete(0, 1)

      await harness.waitForSync(['coordinator', 'photographer', 'caterer', 'florist'])

      // All users should see the fix
      expect(photographerForm.get('ceremony_photos')).toBe('16:00-17:00')
      expect(photographerErrors.length).toBe(0)

      await coordinator.cleanup()
      await Promise.all(vendors.map(vendor => vendor.cleanup()))
    })
  })

  describe('Performance and Scalability', () => {
    it('should maintain low latency with high-frequency updates', async () => {
      const editor = await harness.createUser('high-frequency-editor')
      const observer = await harness.createUser('observer')

      const document = editor.doc.getText('rapidEdits')
      
      // Measure latencies
      const latencies: number[] = []

      // Generate rapid edits
      const content = 'Wedding planning requires attention to detail. '
      
      for (let i = 0; i < 100; i++) {
        const start = Date.now()
        
        document.insert(document.length, `Edit ${i}: ${content}`)
        
        // Wait for sync to observer
        await harness.waitForSync(['high-frequency-editor', 'observer'])
        
        const latency = Date.now() - start
        latencies.push(latency)
        CollaborationMetrics.recordOperationTime(latency)
      }

      // Verify performance requirements
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
      const p95Latency = latencies.sort()[Math.floor(latencies.length * 0.95)]

      expect(avgLatency).toBeLessThan(100) // Average under 100ms
      expect(p95Latency).toBeLessThan(200) // P95 under 200ms

      // Verify content integrity
      const observerDocument = observer.doc.getText('rapidEdits')
      expect(observerDocument.length).toBe(document.length)
      expect(observerDocument.toString()).toBe(document.toString())

      await editor.cleanup()
      await observer.cleanup()
    })

    it('should handle document size scaling efficiently', async () => {
      const editor1 = await harness.createUser('large-doc-editor-1')
      const editor2 = await harness.createUser('large-doc-editor-2')

      // Create progressively larger documents
      const sizes = [1000, 5000, 10000] // characters

      for (const size of sizes) {
        const largeContent = 'a'.repeat(size)
        const document = editor1.doc.getText(`doc-${size}`)
        
        const startTime = Date.now()
        document.insert(0, largeContent)
        
        await harness.waitForSync(['large-doc-editor-1', 'large-doc-editor-2'])
        const syncTime = Date.now() - startTime

        // Sync time should scale reasonably
        expect(syncTime).toBeLessThan(size / 10) // Max 1ms per 10 characters
        
        // Verify content integrity
        const editor2Doc = editor2.doc.getText(`doc-${size}`)
        expect(editor2Doc.length).toBe(size)
        expect(editor2Doc.toString()).toBe(largeContent)
      }

      await editor1.cleanup()
      await editor2.cleanup()
    })
  })

  describe('Wedding-Specific Real-Time Scenarios', () => {
    it('should handle wedding day live timeline updates', async () => {
      // Simulate wedding day with multiple vendors updating timeline
      const vendors = {
        photographer: await harness.createUser('photographer-wedding-day'),
        coordinator: await harness.createUser('coordinator-wedding-day'),
        dj: await harness.createUser('dj-wedding-day'),
        caterer: await harness.createUser('caterer-wedding-day')
      }

      const liveTimeline = vendors.coordinator.doc.getArray('liveTimeline')
      
      // Coordinator sets initial timeline
      liveTimeline.push([
        { time: '15:00', status: 'planned', activity: 'Ceremony begins', vendor: 'officiant' },
        { time: '15:30', status: 'planned', activity: 'Cocktail hour', vendor: 'caterer' },
        { time: '16:30', status: 'planned', activity: 'Reception begins', vendor: 'dj' }
      ])

      const allVendorIds = Object.keys(vendors).map(k => `${k}-wedding-day`)
      await harness.waitForSync(allVendorIds)

      // Wedding day: Ceremony is running late
      const photographerTimeline = vendors.photographer.doc.getArray('liveTimeline')
      photographerTimeline.get(0).status = 'delayed'
      photographerTimeline.get(0).actualTime = '15:15'
      photographerTimeline.get(0).notes = 'Ceremony delayed 15 minutes - bridal party arrival'

      await harness.waitForSync(allVendorIds)

      // Coordinator adjusts subsequent events
      const coordTimeline = vendors.coordinator.doc.getArray('liveTimeline')
      coordTimeline.get(1).time = '15:45' // Adjust cocktail hour
      coordTimeline.get(2).time = '16:45' // Adjust reception

      await harness.waitForSync(allVendorIds)

      // All vendors see the updates immediately
      const djTimeline = vendors.dj.doc.getArray('liveTimeline')
      const catererTimeline = vendors.caterer.doc.getArray('liveTimeline')

      expect(djTimeline.get(0).status).toBe('delayed')
      expect(djTimeline.get(1).time).toBe('15:45')
      expect(catererTimeline.get(2).time).toBe('16:45')

      // DJ confirms adjustment
      djTimeline.get(2).status = 'confirmed'
      djTimeline.get(2).notes = 'Equipment ready for 16:45 reception start'

      await harness.waitForSync(allVendorIds)

      // All vendors see DJ confirmation
      expect(coordTimeline.get(2).status).toBe('confirmed')
      expect(photographerTimeline.get(2).notes).toContain('Equipment ready')

      await Promise.all(Object.values(vendors).map(vendor => vendor.cleanup()))
    })

    it('should support real-time guest RSVP updates', async () => {
      const coordinator = await harness.createUser('rsvp-coordinator')
      const catering = await harness.createUser('catering-team')

      const guestList = WeddingFormFactory.createGuestList(coordinator.doc, 100)
      await harness.waitForSync(['rsvp-coordinator', 'catering-team'])

      const cateringGuestList = catering.doc.getArray('guestList')

      // Simulate real-time RSVP updates
      const rsvpUpdates = [
        { guestIndex: 10, attending: true, mealChoice: 'chicken', allergies: 'none' },
        { guestIndex: 25, attending: false },
        { guestIndex: 33, attending: true, mealChoice: 'vegetarian', allergies: 'gluten-free' },
        { guestIndex: 47, attending: true, mealChoice: 'fish', allergies: 'none' },
        { guestIndex: 52, attending: true, plusOne: true, mealChoice: 'chicken' }
      ]

      // Process RSVP updates
      for (const update of rsvpUpdates) {
        const guest = guestList.get(update.guestIndex)
        Object.assign(guest, update)
        
        await harness.waitForSync(['rsvp-coordinator', 'catering-team'])
        
        // Catering team sees update immediately
        const cateringGuest = cateringGuestList.get(update.guestIndex)
        expect(cateringGuest.attending).toBe(update.attending)
        if (update.mealChoice) {
          expect(cateringGuest.mealChoice).toBe(update.mealChoice)
        }
      }

      // Calculate final counts for catering
      const finalCounts = {
        attending: 0,
        chicken: 0,
        vegetarian: 0,
        fish: 0,
        allergies: 0
      }

      for (let i = 0; i < cateringGuestList.length; i++) {
        const guest = cateringGuestList.get(i)
        if (guest.attending) {
          finalCounts.attending++
          if (guest.mealChoice) finalCounts[guest.mealChoice as keyof typeof finalCounts]++
          if (guest.allergies && guest.allergies !== 'none') finalCounts.allergies++
          if (guest.plusOne) finalCounts.attending++
        }
      }

      expect(finalCounts.attending).toBeGreaterThan(0)
      expect(finalCounts.chicken + finalCounts.vegetarian + finalCounts.fish).toBeGreaterThan(0)

      await coordinator.cleanup()
      await catering.cleanup()
    })
  })
})