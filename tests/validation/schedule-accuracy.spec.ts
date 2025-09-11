// WS-161: Supplier Schedule Calculation Accuracy Validation
import { describe, test, expect } from 'vitest';

describe('WS-161: Schedule Calculation Accuracy Validation', () => {
  
  describe('Time Calculation Precision', () => {
    test('should calculate event times with exact precision', () => {
      // Test precise time calculations
      const masterTimeline = [
        { id: 'ceremony', startTime: '14:00:00', duration: 60, title: 'Wedding Ceremony' },
        { id: 'photos', startTime: '15:00:00', duration: 90, title: 'Photo Session' },
        { id: 'cocktails', startTime: '16:30:00', duration: 90, title: 'Cocktail Hour' }
      ];
      
      // Calculate derived times
      const calculatedSchedule = masterTimeline.map(event => {
        const endTime = addMinutesToTime(event.startTime, event.duration);
        const bufferStart = subtractMinutesFromTime(event.startTime, 30);
        const bufferEnd = addMinutesToTime(endTime, 15);
        
        return {
          ...event,
          endTime,
          supplierArrival: bufferStart,
          supplierDeparture: bufferEnd
        };
      });
      
      // Verify exact time calculations
      expect(calculatedSchedule[0].endTime).toBe('15:00:00');
      expect(calculatedSchedule[0].supplierArrival).toBe('13:30:00');
      expect(calculatedSchedule[0].supplierDeparture).toBe('15:15:00');
      
      expect(calculatedSchedule[1].endTime).toBe('16:30:00');
      expect(calculatedSchedule[1].supplierArrival).toBe('14:30:00');
      expect(calculatedSchedule[1].supplierDeparture).toBe('16:45:00');
      
      expect(calculatedSchedule[2].endTime).toBe('18:00:00');
      expect(calculatedSchedule[2].supplierArrival).toBe('16:00:00');
      expect(calculatedSchedule[2].supplierDeparture).toBe('18:15:00');
    });
    
    test('should handle edge cases with midnight transitions', () => {
      // Test midnight boundary calculations
      const lateEvent = {
        id: 'late_party',
        startTime: '23:30:00',
        duration: 120, // 2 hours, goes past midnight
        title: 'Late Night Party'
      };
      
      const endTime = addMinutesToTime(lateEvent.startTime, lateEvent.duration);
      const nextDayTime = addMinutesToTime(lateEvent.startTime, lateEvent.duration, true);
      
      // Should handle midnight transition
      expect(endTime).toBe('01:30:00'); // Next day
      expect(nextDayTime).toBe('01:30:00');
      
      // Verify date increment logic
      const startDate = new Date('2025-06-15T23:30:00');
      const endDate = new Date(startDate.getTime() + (lateEvent.duration * 60 * 1000));
      
      expect(endDate.getDate()).toBe(16); // Next day
      expect(endDate.getHours()).toBe(1);
      expect(endDate.getMinutes()).toBe(30);
    });
    
    test('should accurately calculate overlapping supplier schedules', () => {
      const timeline = [
        { id: 'prep', startTime: '10:00:00', duration: 240, suppliers: ['photographer'] },
        { id: 'ceremony', startTime: '14:00:00', duration: 60, suppliers: ['photographer', 'videographer', 'florist'] },
        { id: 'photos', startTime: '15:00:00', duration: 90, suppliers: ['photographer', 'videographer'] },
        { id: 'cocktails', startTime: '16:30:00', duration: 90, suppliers: ['photographer', 'caterer', 'dj'] }
      ];
      
      // Generate supplier-specific schedules
      const photographerSchedule = generateSupplierSchedule('photographer', timeline);
      const videographerSchedule = generateSupplierSchedule('videographer', timeline);
      const floristSchedule = generateSupplierSchedule('florist', timeline);
      
      // Verify photographer gets all 4 events
      expect(photographerSchedule).toHaveLength(4);
      expect(photographerSchedule[0].startTime).toBe('10:00:00');
      expect(photographerSchedule[3].startTime).toBe('16:30:00');
      
      // Verify videographer gets 2 events
      expect(videographerSchedule).toHaveLength(2);
      expect(videographerSchedule[0].id).toBe('ceremony');
      expect(videographerSchedule[1].id).toBe('photos');
      
      // Verify florist gets only ceremony
      expect(floristSchedule).toHaveLength(1);
      expect(floristSchedule[0].id).toBe('ceremony');
      
      // Verify no scheduling conflicts for photographer
      const hasConflicts = checkScheduleConflicts(photographerSchedule);
      expect(hasConflicts).toBe(false);
    });
  });
  
  describe('Data Integrity Validation', () => {
    test('should maintain consistent supplier data isolation', () => {
      const suppliers = [
        { id: 'supplier-1', name: 'Elite Photography', type: 'photographer' },
        { id: 'supplier-2', name: 'Gourmet Catering', type: 'caterer' },
        { id: 'supplier-3', name: 'Sound Waves DJ', type: 'dj' }
      ];
      
      const timeline = [
        { id: 'cocktails', startTime: '16:30:00', duration: 90, suppliers: ['supplier-1', 'supplier-3'] },
        { id: 'dinner', startTime: '18:00:00', duration: 120, suppliers: ['supplier-2'] },
        { id: 'dancing', startTime: '21:00:00', duration: 180, suppliers: ['supplier-1', 'supplier-3'] }
      ];
      
      // Generate schedules for each supplier
      const schedules = suppliers.map(supplier => ({
        supplier,
        schedule: generateSupplierSchedule(supplier.id, timeline)
      }));
      
      // Verify data isolation
      const photographerEvents = schedules[0].schedule;
      const catererEvents = schedules[1].schedule;
      const djEvents = schedules[2].schedule;
      
      // Photographer should see only cocktails and dancing
      expect(photographerEvents).toHaveLength(2);
      expect(photographerEvents.map(e => e.id)).toEqual(['cocktails', 'dancing']);
      
      // Caterer should see only dinner
      expect(catererEvents).toHaveLength(1);
      expect(catererEvents[0].id).toBe('dinner');
      
      // DJ should see cocktails and dancing
      expect(djEvents).toHaveLength(2);
      expect(djEvents.map(e => e.id)).toEqual(['cocktails', 'dancing']);
      
      // Verify no cross-contamination of supplier data
      photographerEvents.forEach(event => {
        expect(event.suppliers).toContain('supplier-1');
        expect(event.supplierSpecificInfo).toBeDefined();
        expect(event.supplierSpecificInfo.type).toBe('photographer');
      });
    });
    
    test('should validate schedule versioning accuracy', () => {
      const originalTimeline = [
        { id: 'ceremony', startTime: '14:00:00', duration: 60, version: 1, suppliers: ['supplier-1'] }
      ];
      
      const updatedTimeline = [
        { id: 'ceremony', startTime: '15:00:00', duration: 60, version: 2, suppliers: ['supplier-1'] }
      ];
      
      // Generate schedules for both versions
      const originalSchedule = generateSupplierSchedule('supplier-1', originalTimeline);
      const updatedSchedule = generateSupplierSchedule('supplier-1', updatedTimeline);
      
      // Verify version tracking
      expect(originalSchedule[0].startTime).toBe('14:00:00');
      expect(originalSchedule[0].version).toBe(1);
      
      expect(updatedSchedule[0].startTime).toBe('15:00:00');
      expect(updatedSchedule[0].version).toBe(2);
      
      // Calculate changes (focus on core timeline fields only)
      const changes = calculateScheduleChanges(originalSchedule, updatedSchedule);
      const startTimeChange = changes.find(c => c.field === 'startTime');
      
      expect(startTimeChange).toBeDefined();
      expect(startTimeChange.field).toBe('startTime');
      expect(startTimeChange.oldValue).toBe('14:00:00');
      expect(startTimeChange.newValue).toBe('15:00:00');
    });
  });
  
  describe('Complex Scenario Validation', () => {
    test('should handle multi-day wedding calculations accurately', () => {
      const multiDayTimeline = [
        // Day 1: Rehearsal
        { id: 'rehearsal', startTime: '17:00:00', duration: 60, date: '2025-06-14', suppliers: ['photographer', 'coordinator'] },
        { id: 'rehearsal_dinner', startTime: '19:00:00', duration: 120, date: '2025-06-14', suppliers: ['caterer'] },
        
        // Day 2: Wedding
        { id: 'ceremony', startTime: '14:00:00', duration: 60, date: '2025-06-15', suppliers: ['photographer', 'videographer', 'florist'] },
        { id: 'reception', startTime: '18:00:00', duration: 240, date: '2025-06-15', suppliers: ['photographer', 'caterer', 'dj'] },
        
        // Day 3: Brunch
        { id: 'farewell_brunch', startTime: '11:00:00', duration: 120, date: '2025-06-16', suppliers: ['caterer'] }
      ];
      
      // Generate photographer schedule (spans 2 days)
      const photographerSchedule = generateSupplierSchedule('photographer', multiDayTimeline);
      
      // Verify multi-day accuracy
      expect(photographerSchedule).toHaveLength(3);
      expect(photographerSchedule[0].date).toBe('2025-06-14');
      expect(photographerSchedule[1].date).toBe('2025-06-15');
      expect(photographerSchedule[2].date).toBe('2025-06-15');
      
      // Verify chronological order
      const chronologicalOrder = photographerSchedule.every((event, index) => {
        if (index === 0) return true;
        const prevDateTime = new Date(`${event.date}T${event.startTime}`);
        const currDateTime = new Date(`${photographerSchedule[index-1].date}T${photographerSchedule[index-1].startTime}`);
        return prevDateTime >= currDateTime;
      });
      
      expect(chronologicalOrder).toBe(true);
    });
    
    test('should validate venue location accuracy', () => {
      const multiVenueTimeline = [
        { 
          id: 'ceremony', 
          startTime: '14:00:00', 
          duration: 60, 
          venue: { name: 'St. Mary Church', address: '123 Church St', lat: 40.7128, lng: -74.0060 },
          suppliers: ['photographer'] 
        },
        { 
          id: 'cocktails', 
          startTime: '16:30:00', 
          duration: 90, 
          venue: { name: 'Grand Hotel', address: '456 Hotel Ave', lat: 40.7589, lng: -73.9851 },
          suppliers: ['photographer', 'caterer'] 
        }
      ];
      
      const photographerSchedule = generateSupplierSchedule('photographer', multiVenueTimeline);
      
      // Verify venue information accuracy
      expect(photographerSchedule[0].venue.name).toBe('St. Mary Church');
      expect(photographerSchedule[0].venue.address).toBe('123 Church St');
      expect(photographerSchedule[1].venue.name).toBe('Grand Hotel');
      
      // Calculate travel time between venues
      const travelTime = calculateTravelTime(
        photographerSchedule[0].venue,
        photographerSchedule[1].venue
      );
      
      // Should have reasonable travel time calculation
      expect(travelTime).toBeGreaterThan(0);
      expect(travelTime).toBeLessThan(60); // Less than 1 hour for city venues
      
      // Verify buffer time includes travel
      const timeBetweenEvents = getTimeDifference(
        photographerSchedule[0].endTime,
        photographerSchedule[1].startTime
      );
      
      expect(timeBetweenEvents).toBeGreaterThanOrEqual(travelTime + 30); // Travel + 30min buffer
    });
  });
  
  describe('Mathematical Precision Tests', () => {
    test('should perform accurate time arithmetic', () => {
      // Test time addition
      expect(addMinutesToTime('14:00:00', 30)).toBe('14:30:00');
      expect(addMinutesToTime('14:45:00', 30)).toBe('15:15:00');
      expect(addMinutesToTime('23:45:00', 30)).toBe('00:15:00'); // Next day
      
      // Test time subtraction  
      expect(subtractMinutesFromTime('14:30:00', 30)).toBe('14:00:00');
      expect(subtractMinutesFromTime('14:15:00', 30)).toBe('13:45:00');
      expect(subtractMinutesFromTime('00:15:00', 30)).toBe('23:45:00'); // Previous day
      
      // Test duration calculation
      expect(calculateDurationBetween('14:00:00', '15:30:00')).toBe(90);
      expect(calculateDurationBetween('23:00:00', '01:00:00')).toBe(120); // Across midnight
    });
    
    test('should detect schedule conflicts accurately', () => {
      const conflictingEvents = [
        { id: 'event1', startTime: '14:00:00', duration: 90 }, // 14:00 - 15:30
        { id: 'event2', startTime: '15:00:00', duration: 60 }  // 15:00 - 16:00 (CONFLICT)
      ];
      
      const nonConflictingEvents = [
        { id: 'event1', startTime: '14:00:00', duration: 60 }, // 14:00 - 15:00
        { id: 'event2', startTime: '15:00:00', duration: 60 }  // 15:00 - 16:00 (NO CONFLICT)
      ];
      
      expect(checkScheduleConflicts(conflictingEvents)).toBe(true);
      expect(checkScheduleConflicts(nonConflictingEvents)).toBe(false);
    });
    
    test('should calculate setup/breakdown times precisely', () => {
      const event = {
        id: 'ceremony',
        startTime: '14:00:00',
        duration: 60,
        setupTime: 30,
        breakdownTime: 15
      };
      
      const supplierSchedule = calculateSupplierEventTimes(event);
      
      expect(supplierSchedule.arrivalTime).toBe('13:30:00'); // 30 min before
      expect(supplierSchedule.startTime).toBe('14:00:00');
      expect(supplierSchedule.endTime).toBe('15:00:00');
      expect(supplierSchedule.departureTime).toBe('15:15:00'); // 15 min after
      expect(supplierSchedule.totalCommitment).toBe(105); // 30 + 60 + 15 minutes
    });
  });
});

// Helper Functions for Accuracy Validation

function addMinutesToTime(timeStr: string, minutes: number, handleNextDay = true): string {
  const [hours, mins, secs] = timeStr.split(':').map(Number);
  const date = new Date(2025, 0, 1, hours, mins, secs || 0);
  date.setMinutes(date.getMinutes() + minutes);
  
  const newHours = date.getHours().toString().padStart(2, '0');
  const newMins = date.getMinutes().toString().padStart(2, '0');
  const newSecs = date.getSeconds().toString().padStart(2, '0');
  
  return `${newHours}:${newMins}:${newSecs}`;
}

function subtractMinutesFromTime(timeStr: string, minutes: number): string {
  const [hours, mins, secs] = timeStr.split(':').map(Number);
  const date = new Date(2025, 0, 1, hours, mins, secs || 0);
  date.setMinutes(date.getMinutes() - minutes);
  
  // Handle previous day
  if (date.getDate() !== 1) {
    date.setDate(1);
  }
  
  const newHours = date.getHours().toString().padStart(2, '0');
  const newMins = date.getMinutes().toString().padStart(2, '0');
  const newSecs = date.getSeconds().toString().padStart(2, '0');
  
  return `${newHours}:${newMins}:${newSecs}`;
}

function calculateDurationBetween(startTime: string, endTime: string): number {
  const [startHours, startMins] = startTime.split(':').map(Number);
  const [endHours, endMins] = endTime.split(':').map(Number);
  
  const startDate = new Date(2025, 0, 1, startHours, startMins);
  let endDate = new Date(2025, 0, 1, endHours, endMins);
  
  // Handle next day scenario
  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }
  
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60); // Minutes
}

function generateSupplierSchedule(supplierId: string, timeline: any[]): any[] {
  return timeline
    .filter(event => event.suppliers?.includes(supplierId))
    .map(event => ({
      ...event,
      supplierId,
      endTime: addMinutesToTime(event.startTime, event.duration),
      supplierArrival: subtractMinutesFromTime(event.startTime, 30),
      supplierDeparture: addMinutesToTime(addMinutesToTime(event.startTime, event.duration), 15),
      supplierSpecificInfo: {
        type: getSupplierType(supplierId),
        instructions: `${getSupplierType(supplierId)} instructions for ${event.title}`,
        contact: 'coordinator@wedding.com'
      }
    }));
}

function getSupplierType(supplierId: string): string {
  const typeMap = {
    'supplier-1': 'photographer',
    'supplier-2': 'caterer', 
    'supplier-3': 'dj',
    'photographer': 'photographer',
    'videographer': 'videographer',
    'florist': 'florist',
    'caterer': 'caterer',
    'coordinator': 'coordinator'
  };
  return typeMap[supplierId] || 'unknown';
}

function checkScheduleConflicts(events: any[]): boolean {
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1End = addMinutesToTime(events[i].startTime, events[i].duration);
      const event2Start = events[j].startTime;
      
      // Check if events overlap
      if (events[i].startTime < addMinutesToTime(events[j].startTime, events[j].duration) &&
          event1End > event2Start) {
        return true; // Conflict detected
      }
    }
  }
  return false;
}

function calculateScheduleChanges(oldSchedule: any[], newSchedule: any[]): any[] {
  const changes = [];
  
  for (let i = 0; i < oldSchedule.length && i < newSchedule.length; i++) {
    const oldEvent = oldSchedule[i];
    const newEvent = newSchedule[i];
    
    Object.keys(oldEvent).forEach(key => {
      if (oldEvent[key] !== newEvent[key] && key !== 'version') {
        changes.push({
          eventId: oldEvent.id,
          field: key,
          oldValue: oldEvent[key],
          newValue: newEvent[key]
        });
      }
    });
  }
  
  return changes;
}

function calculateTravelTime(venue1: any, venue2: any): number {
  // Simple distance calculation (could be replaced with actual mapping API)
  const lat1 = venue1.lat;
  const lng1 = venue1.lng;
  const lat2 = venue2.lat;
  const lng2 = venue2.lng;
  
  const distance = Math.sqrt(
    Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2)
  );
  
  // Rough estimate: 1 degree ≈ 69 miles, average city speed 25 mph
  return Math.round((distance * 69 / 25) * 60); // Minutes
}

function getTimeDifference(startTime: string, endTime: string): number {
  return calculateDurationBetween(startTime, endTime);
}

function calculateSupplierEventTimes(event: any): any {
  const setupTime = event.setupTime || 30;
  const breakdownTime = event.breakdownTime || 15;
  
  return {
    arrivalTime: subtractMinutesFromTime(event.startTime, setupTime),
    startTime: event.startTime,
    endTime: addMinutesToTime(event.startTime, event.duration),
    departureTime: addMinutesToTime(addMinutesToTime(event.startTime, event.duration), breakdownTime),
    totalCommitment: setupTime + event.duration + breakdownTime
  };
}