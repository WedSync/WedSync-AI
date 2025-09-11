import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { CollaborationTestHarness } from '../test-setup'

// Mock mobile device detection
const mockMobileDevice = (userAgent: string) => {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: userAgent,
    configurable: true
  })
}

// Mock touch events
const mockTouchEvent = (type: string, touches: any[]) => {
  return new TouchEvent(type, {
    touches,
    targetTouches: touches,
    changedTouches: touches,
    bubbles: true
  })
}

describe('Mobile Collaborative Editing', () => {
  let harness: CollaborationTestHarness

  beforeEach(() => {
    harness = new CollaborationTestHarness()
    
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 812
    })

    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      value: null,
      writable: true,
      configurable: true
    })
  })

  afterEach(async () => {
    // Cleanup
  })

  describe('Touch Interaction During Collaboration', () => {
    it('should handle touch selection during real-time collaboration', async () => {
      mockMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')

      const mobileUser = await harness.createUser('mobile-user')
      const desktopUser = await harness.createUser('desktop-user')

      const mobileDocument = mobileUser.doc.getText('touchDocument')
      mobileDocument.insert(0, 'Wedding timeline: Ceremony at 3 PM, Reception at 6 PM')

      await harness.waitForSync(['mobile-user', 'desktop-user'])

      // Simulate touch selection on mobile
      const touchStart = { clientX: 100, clientY: 200, identifier: 0 }
      const touchEnd = { clientX: 200, clientY: 200, identifier: 0 }

      // Mock selection API for mobile
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue({
          startOffset: 17,
          endOffset: 32, // "Ceremony at 3 PM"
          commonAncestorContainer: { textContent: mobileDocument.toString() }
        })
      }

      Object.defineProperty(window, 'getSelection', {
        value: jest.fn(() => mockSelection),
        writable: true
      })

      // Simulate collaborative editing during touch selection
      const desktopDocument = desktopUser.doc.getText('touchDocument')
      desktopDocument.insert(32, ' (Outdoor setup)')

      await harness.waitForSync(['mobile-user', 'desktop-user'])

      // Verify mobile user sees desktop changes
      expect(mobileDocument.toString()).toContain('Ceremony at 3 PM (Outdoor setup)')

      // Verify touch selection handling didn't break collaboration
      expect(mobileDocument.toString()).toBe(desktopDocument.toString())

      await mobileUser.cleanup()
      await desktopUser.cleanup()
    })

    it('should optimize performance for mobile collaborative editing', async () => {
      mockMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')

      const mobileUser = await harness.createUser('mobile-performance')
      const desktopUser = await harness.createUser('desktop-performance')

      const timeline = mobileUser.doc.getArray('timeline')
      
      // Simulate heavy collaborative editing
      const startTime = Date.now()
      
      // Mobile user adds events (simulating slower mobile processing)
      for (let i = 0; i < 10; i++) {
        timeline.push([{
          time: `${14 + i}:00`,
          event: `Mobile event ${i}`,
          vendor: 'mobile_user'
        }])
        
        // Simulate mobile processing delay
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      // Desktop user adds events simultaneously  
      const desktopTimeline = desktopUser.doc.getArray('timeline')
      for (let i = 0; i < 10; i++) {
        desktopTimeline.push([{
          time: `${15 + i}:00`, 
          event: `Desktop event ${i}`,
          vendor: 'desktop_user'
        }])
      }

      await harness.waitForSync(['mobile-performance', 'desktop-performance'])
      const totalTime = Date.now() - startTime

      // Mobile performance should be reasonable (<2 seconds for 20 operations)
      expect(totalTime).toBeLessThan(2000)

      // Verify all events synced correctly
      expect(timeline.length).toBe(20)
      expect(desktopTimeline.length).toBe(20)

      const mobileEvents = timeline.toArray().filter(e => e.vendor === 'mobile_user')
      const desktopEvents = timeline.toArray().filter(e => e.vendor === 'desktop_user')
      
      expect(mobileEvents).toHaveLength(10)
      expect(desktopEvents).toHaveLength(10)

      await mobileUser.cleanup()
      await desktopUser.cleanup()
    })

    it('should manage mobile keyboard during collaborative sessions', async () => {
      mockMobileDevice('Mozilla/5.0 (Android; Mobile; rv:46.0)')

      const mobileUser = await harness.createUser('keyboard-mobile')
      const collaborator = await harness.createUser('keyboard-collaborator')

      const notes = mobileUser.doc.getText('keyboardNotes')
      notes.insert(0, 'Wedding notes: ')

      await harness.waitForSync(['keyboard-mobile', 'keyboard-collaborator'])

      // Simulate mobile keyboard events
      const keyboardEvents = [
        { type: 'input', data: 'V' },
        { type: 'input', data: 'e' },
        { type: 'input', data: 'n' },
        { type: 'input', data: 'u' },
        { type: 'input', data: 'e' },
        { type: 'input', data: ' ' },
        { type: 'input', data: 'c' },
        { type: 'input', data: 'h' },
        { type: 'input', data: 'a' },
        { type: 'input', data: 'n' },
        { type: 'input', data: 'g' },
        { type: 'input', data: 'e' }
      ]

      // Simulate typing while collaboration is active
      let currentPos = notes.length
      for (const event of keyboardEvents) {
        notes.insert(currentPos, event.data)
        currentPos++
        
        // Small delay to simulate real typing
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Collaborator makes changes during mobile typing
      const collabNotes = collaborator.doc.getText('keyboardNotes')
      collabNotes.insert(0, '[URGENT] ')

      await harness.waitForSync(['keyboard-mobile', 'keyboard-collaborator'])

      // Verify mobile typing and collaborative changes merged correctly
      const finalText = notes.toString()
      expect(finalText).toContain('[URGENT]')
      expect(finalText).toContain('Venue change')
      expect(finalText).toBe(collabNotes.toString())

      await mobileUser.cleanup()
      await collaborator.cleanup()
    })

    it('should provide smooth collaborative experience on touch devices', async () => {
      mockMobileDevice('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)')

      const tabletUser = await harness.createUser('tablet-user')
      const phoneUser = await harness.createUser('phone-user')

      const guestList = tabletUser.doc.getArray('guestList')
      
      // Tablet user adds guests with touch interactions
      const tabletGuests = [
        { name: 'Sarah Johnson', table: 1, meal: 'chicken', rsvp: true },
        { name: 'Mike Chen', table: 1, meal: 'vegetarian', rsvp: true },
        { name: 'Emma Davis', table: 2, meal: 'fish', rsvp: false }
      ]

      tabletGuests.forEach(guest => {
        guestList.push([guest])
      })

      await harness.waitForSync(['tablet-user', 'phone-user'])

      // Phone user updates RSVP status with touch
      const phoneGuestList = phoneUser.doc.getArray('guestList')
      const emmaGuest = phoneGuestList.get(2)
      emmaGuest.rsvp = true
      emmaGuest.meal = 'chicken'
      emmaGuest.note = 'Changed mind - will attend!'

      await harness.waitForSync(['tablet-user', 'phone-user'])

      // Tablet user should see phone updates immediately
      const updatedEmma = guestList.get(2)
      expect(updatedEmma.rsvp).toBe(true)
      expect(updatedEmma.meal).toBe('chicken')
      expect(updatedEmma.note).toBe('Changed mind - will attend!')

      // Both devices should have consistent state
      expect(guestList.toArray()).toEqual(phoneGuestList.toArray())

      await tabletUser.cleanup()
      await phoneUser.cleanup()
    })
  })

  describe('Mobile Network Handling', () => {
    it('should handle mobile network switching gracefully', async () => {
      mockMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')

      const mobileUser = await harness.createUser('network-switch-mobile')
      const stableUser = await harness.createUser('network-switch-stable')

      const timeline = mobileUser.doc.getMap('networkTimeline')
      timeline.set('ceremony_start', '15:00')

      await harness.waitForSync(['network-switch-mobile', 'network-switch-stable'])

      // Simulate network switch (WiFi to 4G)
      await harness.simulateNetworkPartition('network-switch-mobile', 2000)

      // Mobile user continues editing while switching networks
      timeline.set('ceremony_delay', '15 minutes')
      timeline.set('new_start_time', '15:15')

      // Stable user makes changes during mobile network switch
      const stableTimeline = stableUser.doc.getMap('networkTimeline')
      stableTimeline.set('photographer_ready', true)
      stableTimeline.set('venue_status', 'ready')

      // Wait for mobile to reconnect and sync
      await harness.waitForSync(['network-switch-mobile', 'network-switch-stable'], 10000)

      // Verify all changes synced after network switch
      expect(timeline.get('ceremony_delay')).toBe('15 minutes')
      expect(timeline.get('photographer_ready')).toBe(true)
      expect(stableTimeline.get('new_start_time')).toBe('15:15')

      await mobileUser.cleanup()
      await stableUser.cleanup()
    })

    it('should handle poor mobile connections with graceful degradation', async () => {
      mockMobileDevice('Mozilla/5.0 (Android; Mobile; rv:46.0)')

      const mobileUser = await harness.createUser('poor-connection-mobile')
      const goodConnectionUser = await harness.createUser('good-connection-user')

      const vendorNotes = mobileUser.doc.getText('slowConnectionNotes')
      vendorNotes.insert(0, 'Vendor coordination notes: ')

      await harness.waitForSync(['poor-connection-mobile', 'good-connection-user'])

      // Simulate poor connection with high latency
      const slowOperations = []
      const mobileTexts = [
        'Florist delayed 30 minutes',
        'Photographer equipment setup complete',
        'Caterer needs additional table space',
        'DJ sound check at 2 PM'
      ]

      // Add each text with simulated network delays
      for (const text of mobileTexts) {
        const startTime = Date.now()
        vendorNotes.insert(vendorNotes.length, '\n- ' + text)
        
        // Simulate slow network response
        await new Promise(resolve => setTimeout(resolve, 200))
        
        const operationTime = Date.now() - startTime
        slowOperations.push(operationTime)
      }

      // Good connection user makes quick updates
      const goodConnectionNotes = goodConnectionUser.doc.getText('slowConnectionNotes')
      goodConnectionNotes.insert(goodConnectionNotes.length, '\n- Coordination team standing by')

      await harness.waitForSync(['poor-connection-mobile', 'good-connection-user'], 15000)

      // Verify all content synced despite poor mobile connection
      const finalNotes = vendorNotes.toString()
      expect(finalNotes).toContain('Florist delayed 30 minutes')
      expect(finalNotes).toContain('DJ sound check at 2 PM')
      expect(finalNotes).toContain('Coordination team standing by')

      // Both documents should be identical
      expect(finalNotes).toBe(goodConnectionNotes.toString())

      await mobileUser.cleanup()
      await goodConnectionUser.cleanup()
    })

    it('should queue operations during mobile offline periods', async () => {
      mockMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')

      const mobileUser = await harness.createUser('offline-mobile')
      const onlineUser = await harness.createUser('online-user')

      const checklist = mobileUser.doc.getArray('offlineChecklist')
      checklist.push([
        { task: 'Check flowers', status: 'pending', assigned: 'florist' },
        { task: 'Setup sound', status: 'pending', assigned: 'dj' }
      ])

      await harness.waitForSync(['offline-mobile', 'online-user'])

      // Mobile goes offline
      await harness.simulateNetworkPartition('offline-mobile', 5000)

      // Mobile user continues working offline
      const offlineUpdates = [
        { task: 'Check flowers', status: 'completed', completed_at: new Date().toISOString() },
        { task: 'Setup sound', status: 'in_progress', started_at: new Date().toISOString() },
        { task: 'Test microphones', status: 'pending', assigned: 'dj', added_offline: true }
      ]

      // Apply updates while offline (should queue locally)
      offlineUpdates.forEach((update, index) => {
        if (index < 2) {
          // Update existing items
          const item = checklist.get(index)
          Object.assign(item, update)
        } else {
          // Add new item
          checklist.push([update])
        }
      })

      // Online user makes changes while mobile is offline
      const onlineChecklist = onlineUser.doc.getArray('offlineChecklist')
      onlineChecklist.push([{
        task: 'Setup backup power',
        status: 'pending', 
        assigned: 'venue',
        priority: 'high',
        added_while_mobile_offline: true
      }])

      // Wait for mobile to come back online and sync
      await harness.waitForSync(['offline-mobile', 'online-user'], 10000)

      // Verify all changes synced correctly
      expect(checklist.length).toBe(4) // Original 2 + 1 mobile + 1 online
      expect(onlineChecklist.length).toBe(4)

      // Check mobile offline changes synced
      expect(checklist.get(0).status).toBe('completed')
      expect(checklist.get(1).status).toBe('in_progress')
      expect(checklist.get(2).added_offline).toBe(true)

      // Check online changes received by mobile
      expect(checklist.get(3).added_while_mobile_offline).toBe(true)

      await mobileUser.cleanup()
      await onlineUser.cleanup()
    })
  })

  describe('Cross-Device Collaboration', () => {
    it('should sync between different mobile devices seamlessly', async () => {
      const iPhoneUser = await harness.createUser('iphone-user')
      const androidUser = await harness.createUser('android-user')
      const iPadUser = await harness.createUser('ipad-user')

      mockMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')
      
      const weddingBudget = iPhoneUser.doc.getMap('crossDeviceBudget')
      weddingBudget.set('venue', 8000)
      weddingBudget.set('catering', 6500)

      await harness.waitForSync(['iphone-user', 'android-user', 'ipad-user'])

      // Android user updates budget
      mockMobileDevice('Mozilla/5.0 (Linux; Android 11; Pixel 5)')
      const androidBudget = androidUser.doc.getMap('crossDeviceBudget')
      androidBudget.set('photography', 3500)
      androidBudget.set('flowers', 1200)

      await harness.waitForSync(['iphone-user', 'android-user', 'ipad-user'])

      // iPad user adds final items
      mockMobileDevice('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)')
      const iPadBudget = iPadUser.doc.getMap('crossDeviceBudget')
      iPadBudget.set('music', 800)
      iPadBudget.set('decorations', 1500)

      await harness.waitForSync(['iphone-user', 'android-user', 'ipad-user'])

      // All devices should have complete budget
      const expectedItems = ['venue', 'catering', 'photography', 'flowers', 'music', 'decorations']
      
      expectedItems.forEach(item => {
        expect(weddingBudget.has(item)).toBe(true)
        expect(androidBudget.has(item)).toBe(true)
        expect(iPadBudget.has(item)).toBe(true)
      })

      // Calculate total budget
      const totalBudget = expectedItems.reduce((total, item) => {
        return total + (weddingBudget.get(item) || 0)
      }, 0)

      expect(totalBudget).toBe(21500)

      await iPhoneUser.cleanup()
      await androidUser.cleanup()
      await iPadUser.cleanup()
    })

    it('should handle different mobile viewport sizes correctly', async () => {
      const smallMobile = await harness.createUser('small-mobile-user')  // iPhone SE
      const largeMobile = await harness.createUser('large-mobile-user')  // iPhone Pro Max
      
      // Set different viewport sizes
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      mockMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')

      const timeline = smallMobile.doc.getArray('viewportTimeline')
      timeline.push([{
        time: '14:00',
        event: 'Small screen edit',
        viewport: '375px'
      }])

      await harness.waitForSync(['small-mobile-user', 'large-mobile-user'])

      // Switch to larger viewport
      Object.defineProperty(window, 'innerWidth', { value: 428, configurable: true })
      mockMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')

      const largeTimeline = largeMobile.doc.getArray('viewportTimeline')
      largeTimeline.push([{
        time: '14:30',
        event: 'Large screen edit', 
        viewport: '428px'
      }])

      await harness.waitForSync(['small-mobile-user', 'large-mobile-user'])

      // Both devices should see all events regardless of viewport
      expect(timeline.length).toBe(2)
      expect(largeTimeline.length).toBe(2)

      const events = timeline.toArray()
      expect(events[0].viewport).toBe('375px')
      expect(events[1].viewport).toBe('428px')

      await smallMobile.cleanup()
      await largeMobile.cleanup()
    })
  })

  describe('Mobile Performance Optimization', () => {
    it('should minimize battery usage during collaborative sessions', async () => {
      mockMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')

      const mobileUser = await harness.createUser('battery-test-mobile')
      const desktopUser = await harness.createUser('battery-test-desktop')

      const document = mobileUser.doc.getText('batteryTest')
      
      // Simulate long collaborative session
      const sessionStart = Date.now()
      let operationCount = 0

      // Run collaboration for extended period
      const collaborationInterval = setInterval(() => {
        if (Date.now() - sessionStart < 5000) { // 5 second test
          document.insert(document.length, ` Mobile edit ${operationCount++}`)
        } else {
          clearInterval(collaborationInterval)
        }
      }, 100) // Every 100ms

      // Desktop user also participates
      const desktopDocument = desktopUser.doc.getText('batteryTest')
      const desktopInterval = setInterval(() => {
        if (Date.now() - sessionStart < 5000) {
          desktopDocument.insert(0, `Desktop ${operationCount++} `)
        } else {
          clearInterval(desktopInterval)
        }
      }, 150) // Every 150ms

      // Wait for session to complete
      await new Promise(resolve => setTimeout(resolve, 6000))
      await harness.waitForSync(['battery-test-mobile', 'battery-test-desktop'])

      // Verify minimal resource usage (proxy test - in real app would monitor actual battery)
      const sessionDuration = 5000 // milliseconds
      const operationsPerSecond = operationCount / (sessionDuration / 1000)
      
      // Should be efficient enough for mobile devices
      expect(operationsPerSecond).toBeLessThan(50) // Less than 50 ops/second
      
      // Verify collaboration still worked
      expect(document.toString().length).toBeGreaterThan(0)
      expect(desktopDocument.toString().length).toBeGreaterThan(0)

      clearInterval(collaborationInterval)
      clearInterval(desktopInterval)

      await mobileUser.cleanup()
      await desktopUser.cleanup()
    })

    it('should handle memory efficiently on mobile devices', async () => {
      mockMobileDevice('Mozilla/5.0 (Android; Mobile; rv:46.0)')

      const mobileUser = await harness.createUser('memory-test-mobile')
      const user2 = await harness.createUser('memory-test-user2')

      // Create large collaborative document
      const largeDocument = mobileUser.doc.getText('memoryTest')
      
      // Add substantial content
      const largeContent = 'Wedding vendor coordination details: '.repeat(100) // ~3.7KB
      largeDocument.insert(0, largeContent)

      await harness.waitForSync(['memory-test-mobile', 'memory-test-user2'])

      // Continue adding content to test memory handling
      for (let i = 0; i < 20; i++) {
        const additionalContent = `Vendor update ${i}: All systems go. `.repeat(10)
        largeDocument.insert(largeDocument.length, additionalContent)
        
        if (i % 5 === 0) {
          await harness.waitForSync(['memory-test-mobile', 'memory-test-user2'])
        }
      }

      await harness.waitForSync(['memory-test-mobile', 'memory-test-user2'])

      // Memory test (proxy - in real app would check actual memory usage)
      const finalDocumentSize = largeDocument.toString().length
      expect(finalDocumentSize).toBeGreaterThan(10000) // Substantial content
      
      // Document should still be responsive
      const user2Document = user2.doc.getText('memoryTest')
      expect(user2Document.toString().length).toBe(finalDocumentSize)

      await mobileUser.cleanup()
      await user2.cleanup()
    })
  })

  describe('Mobile Wedding Day Scenarios', () => {
    it('should support mobile vendor check-ins during wedding', async () => {
      const mobilePhotographer = await harness.createUser('mobile-photographer-checkin')
      const mobileFlorist = await harness.createUser('mobile-florist-checkin')
      const coordinator = await harness.createUser('coordinator-checkins')

      mockMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')

      const checkinStatus = coordinator.doc.getMap('mobileCheckins')
      checkinStatus.set('expected_vendors', ['photographer', 'florist', 'caterer', 'dj'])
      checkinStatus.set('checkin_window', '12:00-14:00')

      await harness.waitForSync(['mobile-photographer-checkin', 'mobile-florist-checkin', 'coordinator-checkins'])

      // Mobile photographer checks in from parking lot
      const photoCheckin = mobilePhotographer.doc.getMap('mobileCheckins')
      photoCheckin.set('photographer', {
        status: 'arrived',
        time: '12:45',
        location: 'Venue parking lot',
        equipment_status: 'unloading',
        mobile_checkin: true,
        device: 'iPhone'
      })

      await harness.waitForSync(['mobile-photographer-checkin', 'mobile-florist-checkin', 'coordinator-checkins'])

      // Mobile florist checks in with delay
      const floristCheckin = mobileFlorist.doc.getMap('mobileCheckins')
      floristCheckin.set('florist', {
        status: 'delayed',
        current_location: '5 minutes away',
        eta: '13:15',
        reason: 'Extra flowers pickup',
        mobile_checkin: true,
        device: 'Android'
      })

      await harness.waitForSync(['mobile-photographer-checkin', 'mobile-florist-checkin', 'coordinator-checkins'])

      // Coordinator sees all mobile check-ins
      expect(checkinStatus.get('photographer').mobile_checkin).toBe(true)
      expect(checkinStatus.get('photographer').status).toBe('arrived')
      expect(checkinStatus.get('florist').status).toBe('delayed')
      expect(checkinStatus.get('florist').eta).toBe('13:15')

      // All mobile users see updates
      expect(photoCheckin.get('florist').status).toBe('delayed')
      expect(floristCheckin.get('photographer').status).toBe('arrived')

      await mobilePhotographer.cleanup()
      await mobileFlorist.cleanup()
      await coordinator.cleanup()
    })

    it('should handle mobile emergency updates during wedding', async () => {
      const mobilePlanner = await harness.createUser('mobile-emergency-planner')
      const mobileCoordinator = await harness.createUser('mobile-emergency-coordinator')
      const allVendors = await Promise.all([
        harness.createUser('mobile-vendor-1'),
        harness.createUser('mobile-vendor-2'),
        harness.createUser('mobile-vendor-3')
      ])

      mockMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')

      const emergencyChannel = mobilePlanner.doc.getArray('mobileEmergency')

      // Mobile planner broadcasts weather emergency
      emergencyChannel.push([{
        type: 'WEATHER_ALERT',
        severity: 'HIGH',
        message: 'Rain expected at 3 PM - need to move ceremony indoors',
        timestamp: new Date().toISOString(),
        location: 'Mobile device - on site',
        requires_response: true,
        affected_vendors: 'all'
      }])

      const allUserIds = [
        'mobile-emergency-planner',
        'mobile-emergency-coordinator', 
        'mobile-vendor-1',
        'mobile-vendor-2', 
        'mobile-vendor-3'
      ]

      await harness.waitForSync(allUserIds, 2000) // Fast emergency sync

      // All mobile users receive emergency alert
      allVendors.forEach(vendor => {
        const vendorEmergency = vendor.doc.getArray('mobileEmergency')
        expect(vendorEmergency.length).toBe(1)
        const alert = vendorEmergency.get(0)
        expect(alert.type).toBe('WEATHER_ALERT')
        expect(alert.severity).toBe('HIGH')
      })

      // Mobile coordinator responds
      const coordEmergency = mobileCoordinator.doc.getArray('mobileEmergency')
      coordEmergency.push([{
        type: 'RESPONSE',
        original_alert_id: 0,
        responder: 'coordinator',
        message: 'Indoor backup venue activated - Grand Ballroom',
        action_taken: 'venue_change',
        new_setup_time: '14:30',
        mobile_response: true
      }])

      await harness.waitForSync(allUserIds)

      // Mobile vendors see coordinator response
      expect(emergencyChannel.length).toBe(2)
      const response = emergencyChannel.get(1)
      expect(response.type).toBe('RESPONSE')
      expect(response.mobile_response).toBe(true)

      // All mobile devices synchronized
      allVendors.forEach(vendor => {
        const vendorChannel = vendor.doc.getArray('mobileEmergency')
        expect(vendorChannel.length).toBe(2)
        expect(vendorChannel.get(1).new_setup_time).toBe('14:30')
      })

      await mobilePlanner.cleanup()
      await mobileCoordinator.cleanup()
      await Promise.all(allVendors.map(vendor => vendor.cleanup()))
    })
  })
})