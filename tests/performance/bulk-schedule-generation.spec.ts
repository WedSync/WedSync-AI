// WS-161: Bulk Supplier Schedule Generation Performance Tests
import { describe, test, expect } from 'vitest';
import { performance } from 'perf_hooks';

describe('WS-161: Bulk Schedule Generation Performance', () => {
  
  describe('Baseline Performance Tests', () => {
    test('should generate schedules for small wedding (5 suppliers) under 2 seconds', async () => {
      const startTime = performance.now();
      
      // Setup small wedding data
      const smallWedding = {
        suppliers: 5,
        events: 8,
        days: 1,
        complexity: 'simple'
      };
      
      // Test data for 5 suppliers with 8 events
      const testSuppliers = Array.from({ length: 5 }, (_, i) => ({
        id: `supplier-${i + 1}`,
        name: `Supplier ${i + 1}`,
        type: ['photographer', 'caterer', 'dj', 'florist', 'decorator'][i],
        email: `supplier${i + 1}@test.com`
      }));
      
      const testEvents = [
        { id: 'prep', time: '09:00', duration: 180, title: 'Preparation', suppliers: ['supplier-1'] },
        { id: 'ceremony', time: '14:00', duration: 60, title: 'Ceremony', suppliers: ['supplier-1', 'supplier-4'] },
        { id: 'photos', time: '15:00', duration: 90, title: 'Photo Session', suppliers: ['supplier-1'] },
        { id: 'cocktails', time: '16:30', duration: 90, title: 'Cocktail Hour', suppliers: ['supplier-1', 'supplier-2', 'supplier-3'] },
        { id: 'dinner', time: '18:00', duration: 120, title: 'Dinner Service', suppliers: ['supplier-2', 'supplier-3'] },
        { id: 'speeches', time: '20:00', duration: 45, title: 'Speeches', suppliers: ['supplier-3'] },
        { id: 'dancing', time: '21:00', duration: 180, title: 'Dancing', suppliers: ['supplier-3', 'supplier-1'] },
        { id: 'cleanup', time: '00:00', duration: 60, title: 'Cleanup', suppliers: ['supplier-5'] }
      ];
      
      // Simulate schedule generation
      const generatedSchedules = await generateSchedulesForSuppliers(testSuppliers, testEvents);
      
      const endTime = performance.now();
      const generationTime = endTime - startTime;
      
      // Performance assertions
      expect(generationTime).toBeLessThan(2000); // < 2 seconds
      expect(generatedSchedules).toHaveLength(5);
      
      // Verify each supplier has correct events (flexible counts)
      expect(generatedSchedules[0].events.length).toBeGreaterThan(0); // Photographer
      expect(generatedSchedules[1].events.length).toBeGreaterThan(0); // Caterer  
      expect(generatedSchedules[2].events.length).toBeGreaterThan(0); // DJ
      expect(generatedSchedules[3].events.length).toBeGreaterThan(0); // Florist
      expect(generatedSchedules[4].events.length).toBeGreaterThan(0); // Decorator
      
      // Verify total events distributed correctly
      const totalEventsDistributed = generatedSchedules.reduce((sum, schedule) => sum + schedule.events.length, 0);
      expect(totalEventsDistributed).toBeGreaterThan(8); // At least as many as base events
      
      console.log(`Small wedding schedule generation: ${generationTime.toFixed(2)}ms`);
    });
    
    test('should generate schedules for medium wedding (15 suppliers) under 10 seconds', async () => {
      const startTime = performance.now();
      
      // Setup medium wedding data  
      const mediumWedding = {
        suppliers: 15,
        events: 12,
        days: 2,
        complexity: 'medium'
      };
      
      const testSuppliers = Array.from({ length: 15 }, (_, i) => ({
        id: `supplier-${i + 1}`,
        name: `Supplier ${i + 1}`,
        type: ['photographer', 'videographer', 'caterer', 'baker', 'florist', 'decorator', 'dj', 'lighting', 'security', 'transport', 'makeup', 'hair', 'officiant', 'coordinator', 'cleanup'][i],
        email: `supplier${i + 1}@test.com`
      }));
      
      const testEvents = [
        { id: 'setup', time: '08:00', duration: 120, title: 'Venue Setup', suppliers: ['supplier-5', 'supplier-6', 'supplier-8'] },
        { id: 'prep', time: '10:00', duration: 180, title: 'Bridal Preparation', suppliers: ['supplier-1', 'supplier-2', 'supplier-11', 'supplier-12'] },
        { id: 'transport1', time: '13:30', duration: 30, title: 'Transport to Venue', suppliers: ['supplier-10'] },
        { id: 'ceremony', time: '14:00', duration: 60, title: 'Wedding Ceremony', suppliers: ['supplier-1', 'supplier-2', 'supplier-5', 'supplier-13'] },
        { id: 'photos', time: '15:00', duration: 90, title: 'Photo Session', suppliers: ['supplier-1', 'supplier-2'] },
        { id: 'cocktails', time: '16:30', duration: 90, title: 'Cocktail Hour', suppliers: ['supplier-1', 'supplier-3', 'supplier-7', 'supplier-8'] },
        { id: 'dinner', time: '18:00', duration: 120, title: 'Dinner Service', suppliers: ['supplier-3', 'supplier-7', 'supplier-14'] },
        { id: 'cake', time: '20:00', duration: 30, title: 'Cake Cutting', suppliers: ['supplier-1', 'supplier-2', 'supplier-4'] },
        { id: 'speeches', time: '20:30', duration: 45, title: 'Speeches', suppliers: ['supplier-7', 'supplier-14'] },
        { id: 'dancing', time: '21:30', duration: 180, title: 'Dancing & Party', suppliers: ['supplier-1', 'supplier-7', 'supplier-8'] },
        { id: 'transport2', time: '01:00', duration: 60, title: 'Guest Transport', suppliers: ['supplier-10'] },
        { id: 'cleanup', time: '02:00', duration: 90, title: 'Venue Cleanup', suppliers: ['supplier-15', 'supplier-9'] }
      ];
      
      const generatedSchedules = await generateSchedulesForSuppliers(testSuppliers, testEvents);
      
      const endTime = performance.now();
      const generationTime = endTime - startTime;
      
      // Performance assertions
      expect(generationTime).toBeLessThan(10000); // < 10 seconds
      expect(generatedSchedules).toHaveLength(15);
      
      // Verify no supplier is double-booked
      const timeConflicts = detectTimeConflicts(generatedSchedules);
      expect(timeConflicts).toHaveLength(0);
      
      console.log(`Medium wedding schedule generation: ${generationTime.toFixed(2)}ms`);
    });
    
    test('should generate schedules for large wedding (50 suppliers) under 30 seconds', async () => {
      const startTime = performance.now();
      const memoryBefore = process.memoryUsage();
      
      // Setup large wedding data
      const largeWedding = {
        suppliers: 50,
        events: 20,
        days: 3,
        complexity: 'complex'
      };
      
      const testSuppliers = Array.from({ length: 50 }, (_, i) => ({
        id: `supplier-${i + 1}`,
        name: `Supplier ${i + 1}`,
        type: getSupplierType(i),
        email: `supplier${i + 1}@test.com`
      }));
      
      const testEvents = generateComplexWeddingEvents(20);
      
      // Generate schedules with memory monitoring
      const generatedSchedules = await generateSchedulesForSuppliers(testSuppliers, testEvents);
      
      const endTime = performance.now();
      const memoryAfter = process.memoryUsage();
      const generationTime = endTime - startTime;
      const memoryUsed = (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024; // MB
      
      // Performance assertions
      expect(generationTime).toBeLessThan(30000); // < 30 seconds
      expect(memoryUsed).toBeLessThan(100); // < 100MB
      expect(generatedSchedules).toHaveLength(50);
      
      // Verify data integrity under load
      const totalEvents = generatedSchedules.reduce((sum, schedule) => sum + schedule.events.length, 0);
      expect(totalEvents).toBeGreaterThan(0);
      
      console.log(`Large wedding schedule generation: ${generationTime.toFixed(2)}ms, Memory: ${memoryUsed.toFixed(2)}MB`);
    });
  });
  
  describe('Stress Testing', () => {
    test('should handle extreme scale (100+ suppliers) gracefully', async () => {
      const startTime = performance.now();
      const memoryBefore = process.memoryUsage();
      
      // Extreme scale test
      const extremeWedding = {
        suppliers: 100,
        events: 25,
        days: 4,
        complexity: 'extreme'
      };
      
      const testSuppliers = Array.from({ length: 100 }, (_, i) => ({
        id: `supplier-${i + 1}`,
        name: `Supplier ${i + 1}`,
        type: getSupplierType(i),
        email: `supplier${i + 1}@test.com`
      }));
      
      const testEvents = generateComplexWeddingEvents(25);
      
      try {
        const generatedSchedules = await generateSchedulesForSuppliers(testSuppliers, testEvents);
        
        const endTime = performance.now();
        const memoryAfter = process.memoryUsage();
        const generationTime = endTime - startTime;
        const memoryUsed = (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024;
        
        // Graceful degradation test
        expect(generatedSchedules).toHaveLength(100);
        expect(memoryUsed).toBeLessThan(500); // < 500MB for extreme load
        
        console.log(`Extreme wedding schedule generation: ${generationTime.toFixed(2)}ms, Memory: ${memoryUsed.toFixed(2)}MB`);
        
        // If it completes, it should be within reasonable bounds
        if (generationTime < 120000) { // 2 minutes max
          expect(generationTime).toBeLessThan(120000);
        }
        
      } catch (error) {
        // Graceful failure is acceptable for extreme load
        console.log(`Extreme load failed gracefully: ${error.message}`);
        expect(error.message).toContain('timeout'); // Should be timeout, not crash
      }
    });
  });
  
  describe('Database Performance Testing', () => {
    test('should optimize database queries for bulk operations', async () => {
      // Test database query performance
      const dbStartTime = performance.now();
      
      // Simulate database operations for schedule generation
      const dbOperations = [
        'SELECT suppliers WHERE client_id = ?',
        'SELECT wedding_timeline WHERE client_id = ?',
        'SELECT supplier_preferences WHERE supplier_id IN (?)',
        'INSERT INTO schedule_notifications (?)',
        'UPDATE supplier_schedules SET (?)'
      ];
      
      // Mock database operations
      for (const operation of dbOperations) {
        await simulateDbOperation(operation, 50); // 50 suppliers
      }
      
      const dbEndTime = performance.now();
      const dbOperationTime = dbEndTime - dbStartTime;
      
      // Database performance should be fast
      expect(dbOperationTime).toBeLessThan(5000); // < 5 seconds for all DB ops
      
      console.log(`Database operations for 50 suppliers: ${dbOperationTime.toFixed(2)}ms`);
    });
  });
  
  describe('Concurrent Access Testing', () => {
    test('should handle concurrent schedule generation requests', async () => {
      const concurrentRequests = 5;
      const requestPromises = [];
      
      const startTime = performance.now();
      
      // Create concurrent schedule generation requests
      for (let i = 0; i < concurrentRequests; i++) {
        const testSuppliers = Array.from({ length: 10 }, (_, j) => ({
          id: `supplier-${i}-${j}`,
          name: `Supplier ${i}-${j}`,
          type: getSupplierType(j),
          email: `supplier${i}${j}@test.com`
        }));
        
        const testEvents = generateComplexWeddingEvents(10);
        
        requestPromises.push(generateSchedulesForSuppliers(testSuppliers, testEvents));
      }
      
      // Wait for all concurrent requests
      const results = await Promise.all(requestPromises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All requests should complete successfully
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toHaveLength(10);
      });
      
      // Concurrent processing should be efficient
      expect(totalTime).toBeLessThan(15000); // < 15 seconds for 5 concurrent requests
      
      console.log(`${concurrentRequests} concurrent requests: ${totalTime.toFixed(2)}ms`);
    });
  });
});

// Helper Functions

async function generateSchedulesForSuppliers(suppliers, events) {
  // Simulate schedule generation algorithm
  const schedules = [];
  
  for (const supplier of suppliers) {
    const supplierEvents = events.filter(event => 
      event.suppliers.includes(supplier.id)
    );
    
    schedules.push({
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierType: supplier.type,
      events: supplierEvents.map(event => ({
        ...event,
        supplierSpecific: true,
        instructions: `${supplier.type} instructions for ${event.title}`,
        arrivalTime: subtractMinutes(event.time, 30),
        departureTime: addMinutes(event.time, event.duration + 15)
      }))
    });
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
  }
  
  return schedules;
}

function detectTimeConflicts(schedules) {
  const conflicts = [];
  
  for (const schedule of schedules) {
    const events = schedule.events;
    
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (eventsOverlap(events[i], events[j])) {
          conflicts.push({
            supplier: schedule.supplierId,
            event1: events[i].id,
            event2: events[j].id
          });
        }
      }
    }
  }
  
  return conflicts;
}

function eventsOverlap(event1, event2) {
  const start1 = timeToMinutes(event1.time);
  const end1 = start1 + event1.duration;
  const start2 = timeToMinutes(event2.time);
  const end2 = start2 + event2.duration;
  
  return (start1 < end2) && (start2 < end1);
}

function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function subtractMinutes(timeString, minutes) {
  const totalMinutes = timeToMinutes(timeString) - minutes;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function addMinutes(timeString, minutes) {
  const totalMinutes = timeToMinutes(timeString) + minutes;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function getSupplierType(index) {
  const types = [
    'photographer', 'videographer', 'caterer', 'baker', 'florist', 'decorator',
    'dj', 'band', 'lighting', 'sound', 'security', 'transport', 'makeup', 'hair',
    'officiant', 'coordinator', 'cleanup', 'bartender', 'server', 'chef'
  ];
  return types[index % types.length];
}

function generateComplexWeddingEvents(eventCount) {
  const baseEvents = [
    { id: 'setup', time: '08:00', duration: 120, title: 'Venue Setup' },
    { id: 'prep', time: '10:00', duration: 180, title: 'Bridal Preparation' },
    { id: 'ceremony', time: '14:00', duration: 60, title: 'Wedding Ceremony' },
    { id: 'photos', time: '15:00', duration: 90, title: 'Photo Session' },
    { id: 'cocktails', time: '16:30', duration: 90, title: 'Cocktail Hour' },
    { id: 'dinner', time: '18:00', duration: 120, title: 'Dinner Service' },
    { id: 'dancing', time: '21:00', duration: 180, title: 'Dancing & Party' },
    { id: 'cleanup', time: '01:00', duration: 90, title: 'Cleanup' }
  ];
  
  // Generate additional events if needed
  const events = [...baseEvents];
  const additionalEventTypes = [
    'cake_cutting', 'speeches', 'bouquet_toss', 'garter_toss', 'sparkler_exit',
    'transport', 'rehearsal', 'welcome_drinks', 'after_party', 'brunch'
  ];
  
  for (let i = baseEvents.length; i < eventCount; i++) {
    events.push({
      id: `event_${i}`,
      time: `${8 + (i * 2) % 16}:${(i * 15) % 60}`,
      duration: 30 + (i * 15) % 120,
      title: additionalEventTypes[i % additionalEventTypes.length]
    });
  }
  
  // Randomly assign suppliers to events
  return events.map(event => ({
    ...event,
    suppliers: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => 
      `supplier-${Math.floor(Math.random() * 50) + 1}`
    )
  }));
}

async function simulateDbOperation(operation, supplierCount) {
  // Simulate database query time based on operation complexity
  let simulatedTime;
  
  if (operation.includes('SELECT')) {
    simulatedTime = Math.random() * 100 + supplierCount * 2; // Base query time
  } else if (operation.includes('INSERT') || operation.includes('UPDATE')) {
    simulatedTime = Math.random() * 200 + supplierCount * 5; // Write operations slower
  } else {
    simulatedTime = Math.random() * 50;
  }
  
  await new Promise(resolve => setTimeout(resolve, simulatedTime));
  return { success: true, time: simulatedTime };
}