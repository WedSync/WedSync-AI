/**
 * WS-254 Team E: Memory Usage and Leak Prevention Testing
 * Critical for wedding day stability - memory leaks can crash systems
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DietaryAnalysisService } from '@/lib/dietary-management/dietary-analysis-service';
import { GuestManagementService } from '@/lib/dietary-management/guest-management-service';

// Memory monitoring utilities
class MemoryMonitor {
  private snapshots: Array<{
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  }> = [];

  takeSnapshot(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      this.snapshots.push({
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers,
      });
    } else {
      // Browser environment - use performance.memory if available
      const memory = (performance as any).memory;
      if (memory) {
        this.snapshots.push({
          timestamp: Date.now(),
          heapUsed: memory.usedJSHeapSize,
          heapTotal: memory.totalJSHeapSize,
          external: 0,
          arrayBuffers: 0,
        });
      }
    }
  }

  getMemoryGrowth(): number {
    if (this.snapshots.length < 2) return 0;

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];

    return last.heapUsed - first.heapUsed;
  }

  detectMemoryLeak(threshold: number = 50 * 1024 * 1024): boolean {
    // 50MB default threshold
    const growth = this.getMemoryGrowth();
    return growth > threshold;
  }

  getAverageMemoryUsage(): number {
    if (this.snapshots.length === 0) return 0;

    const totalMemory = this.snapshots.reduce(
      (sum, snapshot) => sum + snapshot.heapUsed,
      0,
    );
    return totalMemory / this.snapshots.length;
  }

  reset(): void {
    this.snapshots = [];
  }

  getSnapshots() {
    return [...this.snapshots];
  }

  formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// Helper functions to reduce nesting complexity (S2004 compliance)
const createDietaryRestriction = (guestIndex: number, restrictionIndex: number) => ({
  id: `restriction-${guestIndex}-${restrictionIndex}`,
  guestId: `memory-test-guest-${guestIndex}`,
  type: ['vegetarian', 'vegan', 'gluten-free', 'nut-allergy', 'dairy-free'][restrictionIndex % 5] as any,
  severity: ['mild', 'moderate', 'severe', 'life-threatening'][restrictionIndex % 4] as any,
  notes: `Memory test restriction ${restrictionIndex} for guest ${guestIndex}`,
  medicalCertification: restrictionIndex % 2 === 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createEmergencyContact = (guestIndex: number) => ({
  name: `Emergency Contact ${guestIndex}`,
  phone: `+1-555-${String(guestIndex + 1000).padStart(4, '0')}`,
  relationship: 'Family',
});

const createGuestDietaryRestrictions = (guestIndex: number) => {
  const restrictionCount = Math.floor(Math.random() * 3) + 1;
  return Array.from({ length: restrictionCount }, (_, j) => 
    createDietaryRestriction(guestIndex, j)
  );
};

const createMemoryTestGuest = (index: number) => ({
  id: `memory-test-guest-${index}`,
  weddingId: `wedding-${Math.floor(index / 200)}`,
  firstName: `MemoryTestGuest${index}`,
  lastName: `LastName${index}`,
  email: `memtest${index}@wedding.com`,
  phone: `+1-555-${String(index).padStart(4, '0')}`,
  dietaryRestrictions: createGuestDietaryRestrictions(index),
  tableAssignment: `Table ${Math.floor(index / 10)}`,
  mealPreference: ['meat', 'fish', 'vegetarian', 'vegan'][index % 4] as any,
  isVip: index % 20 === 0,
  emergencyContact: index % 3 === 0 ? createEmergencyContact(index) : undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Generate large datasets for memory testing with reduced nesting
const generateLargeGuestDataset = (count: number) => {
  return Array.from({ length: count }, (_, i) => createMemoryTestGuest(i));
};

describe('Memory Usage and Leak Prevention', () => {
  let dietaryService: DietaryAnalysisService;
  let guestService: GuestManagementService;
  let memoryMonitor: MemoryMonitor;

  beforeEach(() => {
    dietaryService = new DietaryAnalysisService('test-api-key');
    guestService = new GuestManagementService();
    memoryMonitor = new MemoryMonitor();

    // Mock OpenAI for consistent memory testing
    vi.spyOn(dietaryService as any, 'openai', 'get').mockReturnValue({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify([
                    {
                      id: 'memory-test-menu',
                      name: 'Test Menu Item',
                      description: 'Memory test menu',
                      ingredients: ['test'],
                      allergens: [],
                      dietaryFlags: ['safe'],
                    },
                  ]),
                },
              },
            ],
          }),
        },
      },
    });

    // Take initial memory snapshot
    memoryMonitor.takeSnapshot();
  });

  afterEach(() => {
    // Force garbage collection if available (Node.js with --expose-gc flag)
    if (typeof global !== 'undefined' && (global as any).gc) {
      (global as any).gc();
    }

    memoryMonitor.reset();
  });

  describe('Large Dataset Memory Management', () => {
    it('should handle 50,000 guests without memory leaks', async () => {
      const largeDataset = generateLargeGuestDataset(50000);

      console.log(`Testing memory usage with ${largeDataset.length} guests...`);
      memoryMonitor.takeSnapshot();

      // Process dataset in chunks to simulate real-world usage
      const chunkSize = 5000;
      for (let i = 0; i < largeDataset.length; i += chunkSize) {
        const chunk = largeDataset.slice(i, i + chunkSize);

        // Generate dietary summary for chunk
        await guestService.generateDietarySummaryReport(chunk);

        // Take memory snapshot after each chunk
        memoryMonitor.takeSnapshot();

        // Process dietary analysis for some guests in chunk
        const sampleGuests = chunk.slice(0, 100); // Sample 100 guests per chunk
        for (const guest of sampleGuests) {
          await dietaryService.analyzeDietaryCompatibility(
            guest.dietaryRestrictions,
            [
              {
                id: 'test-menu',
                name: 'Test Menu',
                description: 'Test',
                ingredients: ['test'],
                allergens: [],
                dietaryFlags: [],
              },
            ],
          );
        }

        // Check for memory leaks after each chunk
        const memoryGrowth = memoryMonitor.getMemoryGrowth();
        const isMemoryLeak = memoryMonitor.detectMemoryLeak(100 * 1024 * 1024); // 100MB threshold

        if (isMemoryLeak) {
          console.warn(
            `⚠️ Potential memory leak detected after processing ${i + chunkSize} guests. Growth: ${memoryMonitor.formatBytes(memoryGrowth)}`,
          );
        }

        // Force garbage collection between chunks if available
        if (typeof global !== 'undefined' && (global as any).gc) {
          (global as any).gc();
        }
      }

      memoryMonitor.takeSnapshot();

      const finalMemoryGrowth = memoryMonitor.getMemoryGrowth();
      const averageMemoryUsage = memoryMonitor.getAverageMemoryUsage();
      const hasMemoryLeak = memoryMonitor.detectMemoryLeak(200 * 1024 * 1024); // 200MB threshold for full test

      console.log(`Memory Test Results:
        - Guests Processed: ${largeDataset.length}
        - Total Memory Growth: ${memoryMonitor.formatBytes(finalMemoryGrowth)}
        - Average Memory Usage: ${memoryMonitor.formatBytes(averageMemoryUsage)}
        - Memory Leak Detected: ${hasMemoryLeak ? 'YES ⚠️' : 'NO ✅'}`);

      // Assert memory constraints
      expect(hasMemoryLeak).toBe(false);
      expect(finalMemoryGrowth).toBeLessThan(500 * 1024 * 1024); // Max 500MB growth
    }, 300000); // 5-minute timeout for large dataset

    it('should release memory after bulk import operations', async () => {
      memoryMonitor.takeSnapshot();

      // Perform multiple bulk imports
      const importRounds = 10;
      const guestsPerRound = 1000;

      for (let round = 0; round < importRounds; round++) {
        // Helper for bulk import data creation to reduce nesting (S2004)
        const createBulkGuest = (round: number, guestIndex: number) => ({
          firstName: `BulkGuest${round}-${guestIndex}`,
          lastName: `LastName${guestIndex}`,
          email: `bulk${round}-${guestIndex}@test.com`,
          dietaryNotes: guestIndex % 3 === 0 ? 'Vegetarian with gluten sensitivity' : '',
          isVip: false,
        });

        const createBulkImportGuests = (round: number, count: number) => {
          return Array.from({ length: count }, (_, i) => createBulkGuest(round, i));
        };

        const bulkImportData = {
          weddingId: `memory-test-wedding-${round}`,
          source: 'csv' as const,
          guests: createBulkImportGuests(round, guestsPerRound),
          importTimestamp: new Date(),
        };

        const result = await guestService.importGuestsBulk(bulkImportData);
        expect(result.summary.successfulImports).toBe(guestsPerRound);

        // Take memory snapshot after each import
        memoryMonitor.takeSnapshot();

        // Force garbage collection between imports
        if (typeof global !== 'undefined' && (global as any).gc) {
          (global as any).gc();
        }
      }

      const totalGuestsProcessed = importRounds * guestsPerRound;
      const memoryGrowth = memoryMonitor.getMemoryGrowth();
      const memoryPerGuest = memoryGrowth / totalGuestsProcessed;

      console.log(`Bulk Import Memory Results:
        - Import Rounds: ${importRounds}
        - Total Guests: ${totalGuestsProcessed}
        - Memory Growth: ${memoryMonitor.formatBytes(memoryGrowth)}
        - Memory per Guest: ${memoryMonitor.formatBytes(memoryPerGuest)}`);

      // Memory per guest should be reasonable
      expect(memoryPerGuest).toBeLessThan(1024); // Less than 1KB per guest
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB total
    }, 120000);

    it('should handle concurrent operations without memory spikes', async () => {
      memoryMonitor.takeSnapshot();

      const concurrentOperations = 50;
      const guestsPerOperation = 100;
      const testDataset = generateLargeGuestDataset(
        concurrentOperations * guestsPerOperation,
      );

      // Helper functions for concurrent operations to reduce nesting (S2004)
      const createTestMenu = () => ({
        id: 'concurrent-test-menu',
        name: 'Concurrent Test Menu',
        description: 'Memory test',
        ingredients: ['test'],
        allergens: [],
        dietaryFlags: [],
      });

      const processSampleGuests = async (sampleGuests: any[]) => {
        const testMenu = createTestMenu();
        for (const guest of sampleGuests) {
          await dietaryService.analyzeDietaryCompatibility(
            guest.dietaryRestrictions,
            [testMenu]
          );
        }
      };

      const createConcurrentOperation = (operationGuests: any[]) => async () => {
        // Multiple memory-intensive operations
        const summary = await guestService.generateDietarySummaryReport(operationGuests);
        const critical = await guestService.getCriticalDietaryGuests('memory-test', operationGuests);
        const validation = await guestService.validateWeddingDayReadiness(operationGuests);

        // Analyze dietary compatibility for some guests
        const sampleGuests = operationGuests.slice(0, 10);
        await processSampleGuests(sampleGuests);

        return { summary, critical, validation };
      };

      const createOperationGuests = (i: number) => {
        return testDataset.slice(
          i * guestsPerOperation,
          (i + 1) * guestsPerOperation,
        );
      };

      // Create concurrent operations with reduced nesting
      const operations = Array.from({ length: concurrentOperations }, (_, i) => {
        const operationGuests = createOperationGuests(i);
        return createConcurrentOperation(operationGuests);
      });

      // Execute operations concurrently
      const startTime = Date.now();
      const results = await Promise.allSettled(operations.map((op) => op()));
      const endTime = Date.now();

      memoryMonitor.takeSnapshot();

      const successfulOperations = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const memoryGrowth = memoryMonitor.getMemoryGrowth();

      console.log(`Concurrent Operations Memory Results:
        - Operations: ${concurrentOperations}
        - Successful: ${successfulOperations}
        - Memory Growth: ${memoryMonitor.formatBytes(memoryGrowth)}
        - Duration: ${endTime - startTime}ms`);

      // Concurrent operations should not cause excessive memory usage
      expect(successfulOperations).toBe(concurrentOperations);
      expect(memoryGrowth).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
    }, 180000);
  });

  describe('Long-Running Process Memory Stability', () => {
    it('should maintain stable memory usage during extended operations', async () => {
      const testDuration = 30000; // 30 seconds of continuous operations
      const operationInterval = 1000; // Every second
      const guestsPerOperation = 50;

      let operationCount = 0;
      let errors = 0;

      console.log(
        `Running continuous operations for ${testDuration / 1000} seconds...`,
      );
      memoryMonitor.takeSnapshot();

      const startTime = Date.now();
      const interval = setInterval(async () => {
        try {
          const testGuests = generateLargeGuestDataset(guestsPerOperation);

          // Helper for long-running test operations to reduce nesting (S2004)
          const createLongRunningTestMenu = () => ({
            id: 'long-running-menu',
            name: 'Long Running Test Menu',
            description: 'Stability test',
            ingredients: ['test'],
            allergens: [],
            dietaryFlags: [],
          });

          const createOperationHandlers = (testGuests: any[]) => [
            () => guestService.generateDietarySummaryReport(testGuests),
            () => guestService.getCriticalDietaryGuests('long-running-test', testGuests),
            () => guestService.validateWeddingDayReadiness(testGuests),
            () => dietaryService.analyzeDietaryCompatibility(
              testGuests[0].dietaryRestrictions,
              [createLongRunningTestMenu()]
            ),
          ];

          const operations = createOperationHandlers(testGuests);

          const operation = operations[operationCount % operations.length];
          await operation();

          operationCount++;

          // Take memory snapshot every 10 operations
          if (operationCount % 10 === 0) {
            memoryMonitor.takeSnapshot();

            // Helper for memory growth detection to reduce nesting (S2004)
            const detectContinuousGrowth = (snapshots: any[]) => {
              if (snapshots.length < 3) return;
              
              const recent = snapshots.slice(-3);
              const isGrowingContinuously = recent.every(
                (snapshot, i) => i === 0 || snapshot.heapUsed > recent[i - 1].heapUsed
              );

              return isGrowingContinuously ? {
                growth: recent[recent.length - 1].heapUsed - recent[0].heapUsed,
                isGrowing: true
              } : { growth: 0, isGrowing: false };
            };

            const checkForMemoryLeak = (growthInfo: { growth: number; isGrowing: boolean }) => {
              const GROWTH_THRESHOLD = 10 * 1024 * 1024; // 10MB growth in 30 operations
              if (growthInfo.isGrowing && growthInfo.growth > GROWTH_THRESHOLD) {
                console.warn(
                  `⚠️ Continuous memory growth detected: ${memoryMonitor.formatBytes(growthInfo.growth)}`
                );
              }
            };

            // Check for gradual memory growth (potential leak) with reduced nesting
            const snapshots = memoryMonitor.getSnapshots();
            const growthInfo = detectContinuousGrowth(snapshots);
            if (growthInfo) {
              checkForMemoryLeak(growthInfo);
            }
          }
        } catch (error) {
          errors++;
          console.error(`Operation ${operationCount} failed:`, error);
        }
      }, operationInterval);

      // Let test run for specified duration
      await new Promise((resolve) => setTimeout(resolve, testDuration));
      clearInterval(interval);

      memoryMonitor.takeSnapshot();

      const totalMemoryGrowth = memoryMonitor.getMemoryGrowth();
      const averageMemoryUsage = memoryMonitor.getAverageMemoryUsage();
      const snapshots = memoryMonitor.getSnapshots();

      // Calculate memory stability (variance in memory usage)
      const memoryVariance =
        snapshots.length > 1
          ? snapshots.reduce((sum, snapshot) => {
              const diff = snapshot.heapUsed - averageMemoryUsage;
              return sum + diff * diff;
            }, 0) / snapshots.length
          : 0;

      const memoryStandardDeviation = Math.sqrt(memoryVariance);

      console.log(`Long-Running Process Results:
        - Duration: ${testDuration / 1000}s
        - Operations Completed: ${operationCount}
        - Errors: ${errors}
        - Total Memory Growth: ${memoryMonitor.formatBytes(totalMemoryGrowth)}
        - Average Memory Usage: ${memoryMonitor.formatBytes(averageMemoryUsage)}
        - Memory Stability (StdDev): ${memoryMonitor.formatBytes(memoryStandardDeviation)}`);

      // Assert long-running stability
      expect(errors).toBeLessThan(operationCount * 0.01); // Less than 1% error rate
      expect(totalMemoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
      expect(memoryStandardDeviation).toBeLessThan(50 * 1024 * 1024); // Stable memory usage
    }, 60000);

    it('should properly clean up resources after errors', async () => {
      memoryMonitor.takeSnapshot();

      const operations = 100;
      let successCount = 0;
      let errorCount = 0;

      // Create operations that will intentionally fail sometimes
      for (let i = 0; i < operations; i++) {
        try {
          // Every 10th operation will fail
          if (i % 10 === 0) {
            throw new Error(`Intentional error for operation ${i}`);
          }

          // Successful operation
          const testGuests = generateLargeGuestDataset(10);
          await guestService.generateDietarySummaryReport(testGuests);
          successCount++;
        } catch (error) {
          errorCount++;

          // Ensure cleanup happens even after errors
          if (typeof global !== 'undefined' && (global as any).gc) {
            (global as any).gc();
          }
        }

        // Take memory snapshot every 25 operations
        if (i % 25 === 0) {
          memoryMonitor.takeSnapshot();
        }
      }

      memoryMonitor.takeSnapshot();

      const memoryGrowth = memoryMonitor.getMemoryGrowth();

      console.log(`Error Recovery Memory Results:
        - Total Operations: ${operations}
        - Successful: ${successCount}
        - Errors: ${errorCount}
        - Memory Growth: ${memoryMonitor.formatBytes(memoryGrowth)}`);

      // Memory should still be controlled despite errors
      expect(successCount).toBe(90); // 90 successful operations
      expect(errorCount).toBe(10); // 10 intentional errors
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    }, 60000);
  });

  describe('Memory-Intensive Operation Optimization', () => {
    it('should optimize memory usage for large menu generation', async () => {
      memoryMonitor.takeSnapshot();

      // Helper for optimization restriction creation to reduce nesting (S2004)
      const createOptimizationRestriction = (index: number) => ({
        id: `opt-restriction-${index}`,
        guestId: `opt-guest-${index}`,
        type: ['vegetarian', 'vegan', 'gluten-free', 'nut-allergy', 'dairy-free'][index % 5] as any,
        severity: ['mild', 'moderate', 'severe', 'life-threatening'][index % 4] as any,
        notes: `Optimization test restriction ${index}`,
        medicalCertification: index % 3 === 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const largeRestrictionSet = Array.from({ length: 1000 }, (_, i) => 
        createOptimizationRestriction(i)
      );

      // Generate menus for different meal types
      const mealTypes: Array<
        'breakfast' | 'lunch' | 'dinner' | 'cocktail' | 'dessert'
      > = ['breakfast', 'lunch', 'dinner', 'cocktail', 'dessert'];

      for (const mealType of mealTypes) {
        await dietaryService.generateDietaryCompliantMenu(
          largeRestrictionSet,
          mealType,
          1000,
        );

        memoryMonitor.takeSnapshot();
      }

      const memoryGrowth = memoryMonitor.getMemoryGrowth();
      const memoryPerMeal = memoryGrowth / mealTypes.length;

      console.log(`Menu Generation Memory Results:
        - Meal Types: ${mealTypes.length}
        - Restrictions per Menu: ${largeRestrictionSet.length}
        - Total Memory Growth: ${memoryMonitor.formatBytes(memoryGrowth)}
        - Memory per Menu: ${memoryMonitor.formatBytes(memoryPerMeal)}`);

      expect(memoryPerMeal).toBeLessThan(20 * 1024 * 1024); // Less than 20MB per menu
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB total
    }, 60000);

    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by creating large objects
      const memoryPressureObjects: any[] = [];

      try {
        // Helper for memory pressure creation to reduce nesting (S2004)
        const createPressureObject = (index: number) => {
          return new Array(1024 * 1024).fill(`pressure-${index}`);
        };

        const createMemoryPressure = (objectCount: number) => {
          const pressureObjects = [];
          for (let i = 0; i < objectCount; i++) {
            pressureObjects.push(createPressureObject(i));
          }
          return pressureObjects;
        };

        // Create memory pressure (100MB of data) with reduced nesting
        const pressureData = createMemoryPressure(100);
        memoryPressureObjects.push(...pressureData);

        memoryMonitor.takeSnapshot();

        // Try to perform normal operations under memory pressure
        const testGuests = generateLargeGuestDataset(100);
        const summary =
          await guestService.generateDietarySummaryReport(testGuests);

        expect(summary.totalGuests).toBe(100);

        memoryMonitor.takeSnapshot();

        const memoryGrowth = memoryMonitor.getMemoryGrowth();

        console.log(`Memory Pressure Test Results:
          - Artificial Pressure: ~100MB
          - Operation Memory Growth: ${memoryMonitor.formatBytes(memoryGrowth)}
          - Operation Completed: Successfully`);

        // Operations should still work under memory pressure
        expect(memoryGrowth).toBeDefined();
      } finally {
        // Clean up memory pressure objects
        memoryPressureObjects.length = 0;

        if (typeof global !== 'undefined' && (global as any).gc) {
          (global as any).gc();
        }
      }
    }, 30000);
  });

  describe('Wedding Day Memory Requirements', () => {
    it('should maintain memory efficiency during peak wedding operations', async () => {
      // Simulate Saturday wedding day with multiple concurrent weddings
      const weddingCount = 20; // 20 weddings happening simultaneously
      const guestsPerWedding = 200;
      const operationsPerWedding = 50; // Various operations during wedding day

      memoryMonitor.takeSnapshot();

      // Helper functions for wedding day operations to reduce nesting (S2004)
      const createWeddingMenu = (weddingIndex: number) => ({
        id: `wedding-${weddingIndex}-menu`,
        name: 'Wedding Menu',
        description: 'Wedding day menu',
        ingredients: ['wedding', 'food'],
        allergens: [],
        dietaryFlags: [],
      });

      const createWeddingOperationTypes = (weddingIndex: number, weddingGuests: any[], guestsPerWedding: number) => [
        () => guestService.generateDietarySummaryReport(weddingGuests),
        () => guestService.getCriticalDietaryGuests(`wedding-${weddingIndex}`, weddingGuests),
        () => guestService.validateWeddingDayReadiness(weddingGuests),
        (opIndex: number) => dietaryService.analyzeDietaryCompatibility(
          weddingGuests[opIndex % guestsPerWedding].dietaryRestrictions,
          [createWeddingMenu(weddingIndex)]
        ),
      ];

      const createWeddingOperation = (weddingIndex: number, operationTypes: any[], opIndex: number) => {
        const operation = operationTypes[opIndex % operationTypes.length];
        return typeof operation === 'function' ? operation(opIndex) : operation();
      };

      const createWeddingOperations = (weddingIndex: number) => {
        const weddingGuests = generateLargeGuestDataset(guestsPerWedding);
        const operationTypes = createWeddingOperationTypes(weddingIndex, weddingGuests, guestsPerWedding);

        return Array.from({ length: operationsPerWedding }, (_, opIndex) => 
          createWeddingOperation(weddingIndex, operationTypes, opIndex)
        );
      };

      const weddingOperations = Array.from({ length: weddingCount }, (_, weddingIndex) => 
        createWeddingOperations(weddingIndex)
      ).flat();

      console.log(`Starting wedding day simulation:
        - Weddings: ${weddingCount}
        - Guests per Wedding: ${guestsPerWedding}
        - Total Operations: ${weddingOperations.length}`);

      const startTime = Date.now();
      const results = await Promise.allSettled(weddingOperations);
      const endTime = Date.now();

      memoryMonitor.takeSnapshot();

      const successfulOperations = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const successRate =
        (successfulOperations / weddingOperations.length) * 100;
      const memoryGrowth = memoryMonitor.getMemoryGrowth();
      const memoryPerOperation = memoryGrowth / weddingOperations.length;

      console.log(`Wedding Day Memory Results:
        - Total Operations: ${weddingOperations.length}
        - Successful Operations: ${successfulOperations}
        - Success Rate: ${successRate.toFixed(2)}%
        - Duration: ${(endTime - startTime) / 1000}s
        - Memory Growth: ${memoryMonitor.formatBytes(memoryGrowth)}
        - Memory per Operation: ${memoryMonitor.formatBytes(memoryPerOperation)}`);

      // Wedding day requirements are strict
      expect(successRate).toBeGreaterThan(99); // 99% success rate minimum
      expect(memoryGrowth).toBeLessThan(500 * 1024 * 1024); // Less than 500MB growth
      expect(memoryPerOperation).toBeLessThan(1024 * 100); // Less than 100KB per operation
    }, 180000);
  });
});
