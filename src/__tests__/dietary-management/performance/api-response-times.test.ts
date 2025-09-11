/**
 * WS-254 Team E: API Response Time Validation Testing
 * Critical wedding day performance - API endpoints must meet strict SLA requirements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { DietaryAnalysisService } from '@/lib/dietary-management/dietary-analysis-service';
import { GuestManagementService } from '@/lib/dietary-management/guest-management-service';

// API Response Time SLA Requirements (non-negotiable)
const API_SLA_REQUIREMENTS = {
  DIETARY_ANALYSIS_P95: 200, // ms - 95th percentile must be under 200ms
  DIETARY_ANALYSIS_MAX: 5000, // ms - absolute maximum for complex analysis
  MENU_GENERATION_MAX: 10000, // ms - AI menu generation maximum
  GUEST_IMPORT_P95: 100, // ms per 100 guests
  VALIDATION_P95: 50, // ms - safety validation
  EMERGENCY_RESPONSE_MAX: 1000, // ms - emergency operations
  WEDDING_DAY_P99: 500, // ms - 99th percentile on wedding days
};

// Response Time Monitoring and SLA Tracking
class APIPerformanceTracker {
  private measurements: Array<{
    endpoint: string;
    responseTime: number;
    timestamp: number;
    success: boolean;
    guestCount?: number;
    restrictionCount?: number;
    menuItemCount?: number;
  }> = [];

  async measureAPICall<T>(
    endpoint: string,
    operation: () => Promise<T>,
    metadata?: {
      guestCount?: number;
      restrictionCount?: number;
      menuItemCount?: number;
    },
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const responseTime = performance.now() - startTime;

      this.measurements.push({
        endpoint,
        responseTime,
        timestamp: Date.now(),
        success: true,
        ...metadata,
      });

      return result;
    } catch (error) {
      const responseTime = performance.now() - startTime;

      this.measurements.push({
        endpoint,
        responseTime,
        timestamp: Date.now(),
        success: false,
        ...metadata,
      });

      throw error;
    }
  }

  getPercentile(endpoint: string, percentile: number): number {
    const endpointMeasurements = this.measurements
      .filter((m) => m.endpoint === endpoint && m.success)
      .map((m) => m.responseTime)
      .sort((a, b) => a - b);

    if (endpointMeasurements.length === 0) return 0;

    const index =
      Math.ceil((percentile / 100) * endpointMeasurements.length) - 1;
    return endpointMeasurements[Math.max(0, index)];
  }

  getAverageResponseTime(endpoint: string): number {
    const endpointMeasurements = this.measurements.filter(
      (m) => m.endpoint === endpoint && m.success,
    );

    return endpointMeasurements.length > 0
      ? endpointMeasurements.reduce((sum, m) => sum + m.responseTime, 0) /
          endpointMeasurements.length
      : 0;
  }

  getMaxResponseTime(endpoint: string): number {
    const endpointMeasurements = this.measurements
      .filter((m) => m.endpoint === endpoint && m.success)
      .map((m) => m.responseTime);

    return endpointMeasurements.length > 0
      ? Math.max(...endpointMeasurements)
      : 0;
  }

  getSuccessRate(endpoint: string): number {
    const allMeasurements = this.measurements.filter(
      (m) => m.endpoint === endpoint,
    );
    const successfulMeasurements = allMeasurements.filter((m) => m.success);

    return allMeasurements.length > 0
      ? (successfulMeasurements.length / allMeasurements.length) * 100
      : 0;
  }

  getViolations(
    endpoint: string,
    threshold: number,
  ): Array<{
    responseTime: number;
    timestamp: number;
    metadata?: any;
  }> {
    return this.measurements
      .filter(
        (m) =>
          m.endpoint === endpoint && m.success && m.responseTime > threshold,
      )
      .map((m) => ({
        responseTime: m.responseTime,
        timestamp: m.timestamp,
        metadata: {
          guestCount: m.guestCount,
          restrictionCount: m.restrictionCount,
          menuItemCount: m.menuItemCount,
        },
      }));
  }

  generateSLAReport(): {
    overallHealth: number;
    endpointSummary: Array<{
      endpoint: string;
      avgResponseTime: number;
      p95ResponseTime: number;
      maxResponseTime: number;
      successRate: number;
      slaCompliance: boolean;
      violationCount: number;
    }>;
  } {
    const endpoints = [...new Set(this.measurements.map((m) => m.endpoint))];
    const endpointSummary = endpoints.map((endpoint) => {
      const avgResponseTime = this.getAverageResponseTime(endpoint);
      const p95ResponseTime = this.getPercentile(endpoint, 95);
      const maxResponseTime = this.getMaxResponseTime(endpoint);
      const successRate = this.getSuccessRate(endpoint);

      // Determine SLA compliance based on endpoint type
      let slaThreshold = API_SLA_REQUIREMENTS.DIETARY_ANALYSIS_P95;
      if (endpoint.includes('menu-generation'))
        slaThreshold = API_SLA_REQUIREMENTS.MENU_GENERATION_MAX;
      if (endpoint.includes('validation'))
        slaThreshold = API_SLA_REQUIREMENTS.VALIDATION_P95;
      if (endpoint.includes('emergency'))
        slaThreshold = API_SLA_REQUIREMENTS.EMERGENCY_RESPONSE_MAX;

      const violations = this.getViolations(endpoint, slaThreshold);
      const slaCompliance = violations.length === 0 && successRate > 99;

      return {
        endpoint,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        p95ResponseTime: Math.round(p95ResponseTime * 100) / 100,
        maxResponseTime: Math.round(maxResponseTime * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        slaCompliance,
        violationCount: violations.length,
      };
    });

    const overallHealth =
      endpointSummary.reduce(
        (sum, ep) => sum + (ep.slaCompliance ? 100 : 0),
        0,
      ) / endpoints.length;

    return {
      overallHealth,
      endpointSummary,
    };
  }

  reset(): void {
    this.measurements = [];
  }

  getMeasurements() {
    return [...this.measurements];
  }
}

// Mock realistic data generation
const generateRealisticTestData = () => {
  const guests = Array.from({ length: 1000 }, (_, i) => ({
    id: `perf-guest-${i}`,
    weddingId: `perf-wedding-${Math.floor(i / 200)}`,
    firstName: `Guest${i}`,
    lastName: `LastName${i}`,
    email: `perf${i}@test.com`,
    dietaryRestrictions: Array.from(
      {
        length: Math.floor(Math.random() * 3),
      },
      (_, j) => ({
        id: `perf-rest-${i}-${j}`,
        guestId: `perf-guest-${i}`,
        type: [
          'vegetarian',
          'vegan',
          'gluten-free',
          'nut-allergy',
          'dairy-free',
        ][j % 5] as any,
        severity: ['mild', 'moderate', 'severe', 'life-threatening'][
          Math.floor(Math.random() * 4)
        ] as any,
        notes: `Performance test restriction ${j}`,
        medicalCertification: Math.random() > 0.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    mealPreference: ['meat', 'fish', 'vegetarian', 'vegan'][i % 4] as any,
    isVip: i % 20 === 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const menuItems = [
    {
      id: 'perf-beef',
      name: 'Wagyu Beef Tenderloin',
      description: 'Premium beef with truffle sauce',
      ingredients: ['wagyu beef', 'truffle', 'butter', 'herbs'],
      allergens: ['dairy'],
      dietaryFlags: [],
    },
    {
      id: 'perf-salmon',
      name: 'Pan-Seared Salmon',
      description: 'Wild Atlantic salmon with citrus glaze',
      ingredients: ['salmon', 'citrus', 'olive oil', 'herbs'],
      allergens: ['fish'],
      dietaryFlags: [],
    },
    {
      id: 'perf-vegetarian',
      name: 'Stuffed Portobello Wellington',
      description: 'Mushroom wellington with quinoa stuffing',
      ingredients: ['portobello mushroom', 'quinoa', 'vegetables', 'pastry'],
      allergens: ['gluten'],
      dietaryFlags: ['vegetarian'],
    },
    {
      id: 'perf-vegan',
      name: 'Cauliflower Steaks',
      description: 'Roasted cauliflower with tahini sauce',
      ingredients: ['cauliflower', 'tahini', 'spices', 'herbs'],
      allergens: ['sesame'],
      dietaryFlags: ['vegan', 'gluten-free'],
    },
  ];

  return { guests, menuItems };
};

describe('API Response Time Validation', () => {
  let dietaryService: DietaryAnalysisService;
  let guestService: GuestManagementService;
  let performanceTracker: APIPerformanceTracker;
  let testData: ReturnType<typeof generateRealisticTestData>;

  beforeEach(() => {
    dietaryService = new DietaryAnalysisService('test-api-key');
    guestService = new GuestManagementService();
    performanceTracker = new APIPerformanceTracker();
    testData = generateRealisticTestData();

    // Mock OpenAI with realistic response times
    vi.spyOn(dietaryService as any, 'openai', 'get').mockReturnValue({
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            // Simulate variable AI API response times (50-200ms)
            await new Promise((resolve) =>
              setTimeout(resolve, 50 + Math.random() * 150),
            );

            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify([
                      {
                        id: `ai-perf-${Date.now()}`,
                        name: 'AI Generated Menu Item',
                        description: 'Performance test menu item',
                        ingredients: ['safe ingredients'],
                        allergens: [],
                        dietaryFlags: ['performance-tested'],
                      },
                    ]),
                  },
                },
              ],
            };
          }),
        },
      },
    });
  });

  afterEach(() => {
    const report = performanceTracker.generateSLAReport();
    console.log('API Performance Report:', JSON.stringify(report, null, 2));
  });

  describe('Dietary Analysis API Performance', () => {
    it('should meet P95 response time requirements (200ms)', async () => {
      const testCases = [
        { guests: 1, restrictions: 1 },
        { guests: 1, restrictions: 3 },
        { guests: 5, restrictions: 10 },
        { guests: 10, restrictions: 25 },
        { guests: 50, restrictions: 100 },
      ];

      for (const testCase of testCases) {
        const guests = testData.guests.slice(0, testCase.guests);
        const allRestrictions = guests
          .flatMap((g) => g.dietaryRestrictions)
          .slice(0, testCase.restrictions);

        // Run multiple iterations for statistical significance
        for (let iteration = 0; iteration < 20; iteration++) {
          await performanceTracker.measureAPICall(
            'dietary-analysis',
            () =>
              dietaryService.analyzeDietaryCompatibility(
                allRestrictions,
                testData.menuItems,
              ),
            {
              guestCount: testCase.guests,
              restrictionCount: testCase.restrictions,
              menuItemCount: testData.menuItems.length,
            },
          );
        }
      }

      const p95ResponseTime = performanceTracker.getPercentile(
        'dietary-analysis',
        95,
      );
      const averageResponseTime =
        performanceTracker.getAverageResponseTime('dietary-analysis');
      const maxResponseTime =
        performanceTracker.getMaxResponseTime('dietary-analysis');
      const successRate = performanceTracker.getSuccessRate('dietary-analysis');

      console.log(`Dietary Analysis Performance:
        - P95 Response Time: ${p95ResponseTime.toFixed(2)}ms
        - Average Response Time: ${averageResponseTime.toFixed(2)}ms
        - Max Response Time: ${maxResponseTime.toFixed(2)}ms
        - Success Rate: ${successRate.toFixed(2)}%`);

      expect(p95ResponseTime).toBeLessThan(
        API_SLA_REQUIREMENTS.DIETARY_ANALYSIS_P95,
      );
      expect(maxResponseTime).toBeLessThan(
        API_SLA_REQUIREMENTS.DIETARY_ANALYSIS_MAX,
      );
      expect(successRate).toBeGreaterThan(99);
    });

    it('should handle complex dietary conflict detection within SLA', async () => {
      // Create complex scenarios with multiple restrictions
      const complexGuests = testData.guests.slice(0, 20).map((guest) => ({
        ...guest,
        dietaryRestrictions: [
          ...guest.dietaryRestrictions,
          {
            id: `complex-${guest.id}`,
            guestId: guest.id,
            type: 'other' as const,
            severity: 'severe' as const,
            notes: 'Complex restriction requiring detailed analysis',
            medicalCertification: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }));

      const complexRestrictions = complexGuests.flatMap(
        (g) => g.dietaryRestrictions,
      );

      for (let i = 0; i < 30; i++) {
        await performanceTracker.measureAPICall(
          'dietary-conflict-detection',
          () =>
            dietaryService.detectDietaryConflicts(
              testData.menuItems,
              complexRestrictions,
            ),
          {
            guestCount: complexGuests.length,
            restrictionCount: complexRestrictions.length,
            menuItemCount: testData.menuItems.length,
          },
        );
      }

      const avgResponseTime = performanceTracker.getAverageResponseTime(
        'dietary-conflict-detection',
      );
      const p95ResponseTime = performanceTracker.getPercentile(
        'dietary-conflict-detection',
        95,
      );
      const violations = performanceTracker.getViolations(
        'dietary-conflict-detection',
        API_SLA_REQUIREMENTS.DIETARY_ANALYSIS_P95,
      );

      console.log(`Complex Conflict Detection Performance:
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms
        - P95 Response Time: ${p95ResponseTime.toFixed(2)}ms
        - SLA Violations: ${violations.length}`);

      expect(p95ResponseTime).toBeLessThan(
        API_SLA_REQUIREMENTS.DIETARY_ANALYSIS_P95,
      );
      expect(violations.length).toBeLessThan(3); // Allow maximum 3 violations out of 30 tests
    });

    it('should scale response times linearly with data size', async () => {
      const scalingTests = [
        { guests: 10, expectedMaxTime: 50 },
        { guests: 50, expectedMaxTime: 150 },
        { guests: 100, expectedMaxTime: 200 },
        { guests: 200, expectedMaxTime: 300 },
      ];

      for (const test of scalingTests) {
        const guests = testData.guests.slice(0, test.guests);
        const restrictions = guests.flatMap((g) => g.dietaryRestrictions);

        for (let iteration = 0; iteration < 10; iteration++) {
          await performanceTracker.measureAPICall(
            `dietary-analysis-scale-${test.guests}`,
            () =>
              dietaryService.analyzeDietaryCompatibility(
                restrictions,
                testData.menuItems,
              ),
            {
              guestCount: test.guests,
              restrictionCount: restrictions.length,
            },
          );
        }

        const avgResponseTime = performanceTracker.getAverageResponseTime(
          `dietary-analysis-scale-${test.guests}`,
        );

        console.log(
          `Scaling Test (${test.guests} guests): ${avgResponseTime.toFixed(2)}ms average`,
        );

        // Response time should scale somewhat linearly but stay within reasonable bounds
        expect(avgResponseTime).toBeLessThan(test.expectedMaxTime);
      }
    });
  });

  describe('Menu Generation API Performance', () => {
    it('should generate menus within 10-second SLA', async () => {
      const mealTypes: Array<
        'breakfast' | 'lunch' | 'dinner' | 'cocktail' | 'dessert'
      > = ['breakfast', 'lunch', 'dinner', 'cocktail', 'dessert'];

      const guestCounts = [50, 100, 200, 500];

      for (const mealType of mealTypes) {
        for (const guestCount of guestCounts) {
          const restrictions = testData.guests
            .slice(0, Math.min(guestCount, testData.guests.length))
            .flatMap((g) => g.dietaryRestrictions)
            .slice(0, guestCount / 5); // ~20% of guests have restrictions

          await performanceTracker.measureAPICall(
            'menu-generation',
            () =>
              dietaryService.generateDietaryCompliantMenu(
                restrictions,
                mealType,
                guestCount,
              ),
            {
              guestCount,
              restrictionCount: restrictions.length,
            },
          );
        }
      }

      const maxResponseTime =
        performanceTracker.getMaxResponseTime('menu-generation');
      const avgResponseTime =
        performanceTracker.getAverageResponseTime('menu-generation');
      const p95ResponseTime = performanceTracker.getPercentile(
        'menu-generation',
        95,
      );
      const successRate = performanceTracker.getSuccessRate('menu-generation');

      console.log(`Menu Generation Performance:
        - Max Response Time: ${maxResponseTime.toFixed(2)}ms
        - P95 Response Time: ${p95ResponseTime.toFixed(2)}ms
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms
        - Success Rate: ${successRate.toFixed(2)}%`);

      expect(maxResponseTime).toBeLessThan(
        API_SLA_REQUIREMENTS.MENU_GENERATION_MAX,
      );
      expect(successRate).toBeGreaterThan(95); // Allow slightly lower success rate for AI operations
    });

    it('should handle AI API failures gracefully without timeout violations', async () => {
      // Mock AI API failures
      const originalCreate = vi
        .spyOn(dietaryService as any, 'openai', 'get')
        .getMockImplementation();

      vi.spyOn(dietaryService as any, 'openai', 'get').mockReturnValue({
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              // 30% failure rate
              if (Math.random() < 0.3) {
                await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s delay
                throw new Error('AI API failure simulation');
              }

              // Normal response
              return originalCreate?.();
            }),
          },
        },
      });

      const restrictions = testData.guests
        .slice(0, 20)
        .flatMap((g) => g.dietaryRestrictions);

      for (let i = 0; i < 20; i++) {
        try {
          await performanceTracker.measureAPICall(
            'menu-generation-with-failures',
            () =>
              dietaryService.generateDietaryCompliantMenu(
                restrictions,
                'dinner',
                200,
              ),
          );
        } catch (error) {
          // Failures are expected - just track timing
        }
      }

      const maxResponseTime = performanceTracker.getMaxResponseTime(
        'menu-generation-with-failures',
      );
      const successRate = performanceTracker.getSuccessRate(
        'menu-generation-with-failures',
      );

      console.log(`Menu Generation with Failures:
        - Max Response Time: ${maxResponseTime.toFixed(2)}ms
        - Success Rate: ${successRate.toFixed(2)}%`);

      // Even with failures, response times should stay reasonable due to fallback
      expect(maxResponseTime).toBeLessThan(
        API_SLA_REQUIREMENTS.MENU_GENERATION_MAX + 1000,
      ); // +1s allowance
      expect(successRate).toBeGreaterThan(60); // Should still succeed via fallback
    });
  });

  describe('Guest Management API Performance', () => {
    it('should handle bulk guest imports within P95 SLA', async () => {
      const importSizes = [100, 500, 1000, 2000];

      for (const size of importSizes) {
        const bulkImportData = {
          weddingId: `perf-wedding-${size}`,
          source: 'csv' as const,
          guests: Array.from({ length: size }, (_, i) => ({
            firstName: `BulkGuest${i}`,
            lastName: `LastName${i}`,
            email: `bulk${i}@perf.test`,
            dietaryNotes: i % 3 === 0 ? 'Vegetarian with nut allergy' : '',
            tableNumber: `${Math.floor(i / 10)}`,
            mealChoice: ['meat', 'fish', 'vegetarian', 'vegan'][i % 4],
            isVip: i % 50 === 0,
          })),
          importTimestamp: new Date(),
        };

        await performanceTracker.measureAPICall(
          'guest-import',
          () => guestService.importGuestsBulk(bulkImportData),
          { guestCount: size },
        );
      }

      const p95ResponseTime = performanceTracker.getPercentile(
        'guest-import',
        95,
      );
      const avgResponseTime =
        performanceTracker.getAverageResponseTime('guest-import');
      const successRate = performanceTracker.getSuccessRate('guest-import');

      // Calculate response time per 100 guests
      const measurements = performanceTracker
        .getMeasurements()
        .filter((m) => m.endpoint === 'guest-import');
      const avgTimePerHundredGuests =
        measurements.reduce((sum, m) => {
          const timePerHundred = (m.responseTime / (m.guestCount || 1)) * 100;
          return sum + timePerHundred;
        }, 0) / measurements.length;

      console.log(`Guest Import Performance:
        - P95 Response Time: ${p95ResponseTime.toFixed(2)}ms
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms
        - Time per 100 Guests: ${avgTimePerHundredGuests.toFixed(2)}ms
        - Success Rate: ${successRate.toFixed(2)}%`);

      expect(avgTimePerHundredGuests).toBeLessThan(
        API_SLA_REQUIREMENTS.GUEST_IMPORT_P95,
      );
      expect(successRate).toBe(100);
    });

    it('should validate wedding readiness quickly', async () => {
      const validationSizes = [50, 100, 200, 500];

      for (const size of validationSizes) {
        const guests = testData.guests.slice(0, size);

        for (let iteration = 0; iteration < 10; iteration++) {
          await performanceTracker.measureAPICall(
            'wedding-validation',
            () => guestService.validateWeddingDayReadiness(guests),
            { guestCount: size },
          );
        }
      }

      const p95ResponseTime = performanceTracker.getPercentile(
        'wedding-validation',
        95,
      );
      const maxResponseTime =
        performanceTracker.getMaxResponseTime('wedding-validation');
      const successRate =
        performanceTracker.getSuccessRate('wedding-validation');

      console.log(`Wedding Validation Performance:
        - P95 Response Time: ${p95ResponseTime.toFixed(2)}ms
        - Max Response Time: ${maxResponseTime.toFixed(2)}ms
        - Success Rate: ${successRate.toFixed(2)}%`);

      expect(p95ResponseTime).toBeLessThan(API_SLA_REQUIREMENTS.VALIDATION_P95);
      expect(successRate).toBe(100);
    });

    it('should generate dietary summaries efficiently', async () => {
      const summarySizes = [100, 300, 500, 1000];

      for (const size of summarySizes) {
        const guests = testData.guests.slice(0, size);

        for (let iteration = 0; iteration < 5; iteration++) {
          await performanceTracker.measureAPICall(
            'dietary-summary',
            () => guestService.generateDietarySummaryReport(guests),
            { guestCount: size },
          );
        }
      }

      const avgResponseTime =
        performanceTracker.getAverageResponseTime('dietary-summary');
      const p95ResponseTime = performanceTracker.getPercentile(
        'dietary-summary',
        95,
      );
      const successRate = performanceTracker.getSuccessRate('dietary-summary');

      console.log(`Dietary Summary Performance:
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms
        - P95 Response Time: ${p95ResponseTime.toFixed(2)}ms
        - Success Rate: ${successRate.toFixed(2)}%`);

      expect(p95ResponseTime).toBeLessThan(200); // Should be very fast
      expect(successRate).toBe(100);
    });
  });

  describe('Emergency Response Performance', () => {
    it('should handle emergency dietary updates within 1-second SLA', async () => {
      const emergencyScenarios = [
        {
          type: 'shellfish-allergy',
          severity: 'life-threatening' as const,
          notes: 'EMERGENCY: Anaphylaxis risk discovered during service',
        },
        {
          type: 'nut-allergy',
          severity: 'life-threatening' as const,
          notes: 'EMERGENCY: Guest just informed of severe allergy',
        },
        {
          type: 'gluten-free',
          severity: 'severe' as const,
          notes: 'EMERGENCY: Celiac disease - all menu items need validation',
        },
      ];

      for (const scenario of emergencyScenarios) {
        for (let i = 0; i < 20; i++) {
          await performanceTracker.measureAPICall(
            'emergency-restriction-add',
            () =>
              guestService.addDietaryRestriction(
                `emergency-guest-${i}`,
                scenario,
              ),
          );

          // Immediate menu safety validation (critical for wedding day)
          const restrictions = [
            {
              id: `emergency-${i}`,
              guestId: `emergency-guest-${i}`,
              ...scenario,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];

          await performanceTracker.measureAPICall(
            'emergency-menu-validation',
            () =>
              dietaryService.validateMenuSafety(
                testData.menuItems,
                restrictions,
              ),
          );
        }
      }

      const addRestrictionP95 = performanceTracker.getPercentile(
        'emergency-restriction-add',
        95,
      );
      const menuValidationP95 = performanceTracker.getPercentile(
        'emergency-menu-validation',
        95,
      );
      const addRestrictionMax = performanceTracker.getMaxResponseTime(
        'emergency-restriction-add',
      );
      const menuValidationMax = performanceTracker.getMaxResponseTime(
        'emergency-menu-validation',
      );

      console.log(`Emergency Response Performance:
        - Add Restriction P95: ${addRestrictionP95.toFixed(2)}ms
        - Menu Validation P95: ${menuValidationP95.toFixed(2)}ms
        - Add Restriction Max: ${addRestrictionMax.toFixed(2)}ms
        - Menu Validation Max: ${menuValidationMax.toFixed(2)}ms`);

      expect(addRestrictionMax).toBeLessThan(
        API_SLA_REQUIREMENTS.EMERGENCY_RESPONSE_MAX,
      );
      expect(menuValidationMax).toBeLessThan(
        API_SLA_REQUIREMENTS.EMERGENCY_RESPONSE_MAX,
      );
      expect(addRestrictionP95).toBeLessThan(
        API_SLA_REQUIREMENTS.EMERGENCY_RESPONSE_MAX / 2,
      ); // P95 should be much better
      expect(menuValidationP95).toBeLessThan(
        API_SLA_REQUIREMENTS.EMERGENCY_RESPONSE_MAX / 2,
      );
    });

    it('should handle multiple concurrent emergencies', async () => {
      const concurrentEmergencies = 10;
      const emergencyPromises: Promise<any>[] = [];

      // Create multiple emergency scenarios happening simultaneously
      for (let i = 0; i < concurrentEmergencies; i++) {
        const emergencyPromise = performanceTracker.measureAPICall(
          'concurrent-emergency',
          async () => {
            // Add emergency restriction
            const restriction = await guestService.addDietaryRestriction(
              `concurrent-emergency-${i}`,
              {
                type: 'nut-allergy',
                severity: 'life-threatening',
                notes: `Concurrent emergency ${i}`,
                medicalCertification: false,
              },
            );

            // Validate menu immediately
            const validation = await dietaryService.validateMenuSafety(
              testData.menuItems,
              [restriction],
            );

            return { restriction, validation };
          },
        );

        emergencyPromises.push(emergencyPromise);
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(emergencyPromises);
      const endTime = performance.now();

      const successfulEmergencies = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const totalTime = endTime - startTime;
      const avgEmergencyTime = performanceTracker.getAverageResponseTime(
        'concurrent-emergency',
      );
      const maxEmergencyTime = performanceTracker.getMaxResponseTime(
        'concurrent-emergency',
      );

      console.log(`Concurrent Emergency Performance:
        - Total Emergencies: ${concurrentEmergencies}
        - Successful: ${successfulEmergencies}
        - Total Time: ${totalTime.toFixed(2)}ms
        - Average Emergency Time: ${avgEmergencyTime.toFixed(2)}ms
        - Max Emergency Time: ${maxEmergencyTime.toFixed(2)}ms`);

      expect(successfulEmergencies).toBe(concurrentEmergencies);
      expect(maxEmergencyTime).toBeLessThan(
        API_SLA_REQUIREMENTS.EMERGENCY_RESPONSE_MAX,
      );
      expect(totalTime).toBeLessThan(5000); // All emergencies handled within 5 seconds
    });
  });

  describe('Wedding Day Performance Standards', () => {
    it('should meet P99 response times during wedding day operations', async () => {
      // Simulate wedding day operations with strict P99 requirements
      const weddingDayOperations = [
        () =>
          dietaryService.analyzeDietaryCompatibility(
            testData.guests[Math.floor(Math.random() * 100)]
              .dietaryRestrictions,
            testData.menuItems,
          ),
        () =>
          guestService.validateWeddingDayReadiness(
            testData.guests.slice(0, 50),
          ),
        () =>
          dietaryService.validateMenuSafety(
            testData.menuItems,
            testData.guests.slice(0, 10).flatMap((g) => g.dietaryRestrictions),
          ),
        () =>
          guestService.generateDietarySummaryReport(
            testData.guests.slice(0, 100),
          ),
      ];

      // Run 200 operations to get statistically significant P99
      for (let i = 0; i < 200; i++) {
        const operation = weddingDayOperations[i % weddingDayOperations.length];

        await performanceTracker.measureAPICall(
          'wedding-day-operations',
          operation,
        );
      }

      const p99ResponseTime = performanceTracker.getPercentile(
        'wedding-day-operations',
        99,
      );
      const p95ResponseTime = performanceTracker.getPercentile(
        'wedding-day-operations',
        95,
      );
      const avgResponseTime = performanceTracker.getAverageResponseTime(
        'wedding-day-operations',
      );
      const successRate = performanceTracker.getSuccessRate(
        'wedding-day-operations',
      );

      console.log(`Wedding Day Performance Standards:
        - P99 Response Time: ${p99ResponseTime.toFixed(2)}ms (SLA: ${API_SLA_REQUIREMENTS.WEDDING_DAY_P99}ms)
        - P95 Response Time: ${p95ResponseTime.toFixed(2)}ms
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms
        - Success Rate: ${successRate.toFixed(2)}%`);

      // Wedding day requirements are STRICT
      expect(p99ResponseTime).toBeLessThan(
        API_SLA_REQUIREMENTS.WEDDING_DAY_P99,
      );
      expect(successRate).toBe(100); // Zero tolerance for failures on wedding days
    });

    it('should maintain performance under Saturday peak load', async () => {
      // Simulate Saturday peak load with multiple weddings
      const peakLoadOperations: Promise<any>[] = [];
      const operationsPerSecond = 50; // High load
      const durationSeconds = 10;
      const totalOperations = operationsPerSecond * durationSeconds;

      console.log(
        `Simulating Saturday peak load: ${totalOperations} operations over ${durationSeconds} seconds`,
      );

      // Helper function to generate dietary summary for random guests - extracted to reduce nesting
      const generateRandomDietarySummary = async () => {
        const randomGuests = testData.guests.slice(
          Math.floor(Math.random() * 900),
          Math.floor(Math.random() * 900) + 100,
        );
        return guestService.generateDietarySummaryReport(randomGuests);
      };

      // Helper function to execute peak load operation - extracted to reduce nesting
      const executePeakLoadOperation = async (operationIndex: number) => {
        try {
          await performanceTracker.measureAPICall(
            'saturday-peak-load',
            generateRandomDietarySummary,
          );
        } catch (error) {
          console.error(`Peak load operation ${operationIndex} failed:`, error);
        }
      };

      // Helper function to create delayed operation - extracted to reduce nesting
      const createDelayedOperation = (operationIndex: number, delayMs: number) => {
        return new Promise<void>((resolve) => {
          setTimeout(async () => {
            await executePeakLoadOperation(operationIndex);
            resolve();
          }, delayMs);
        });
      };

      // Create operations with timing spread to simulate real peak load
      for (let i = 0; i < totalOperations; i++) {
        const delayMs = (i / operationsPerSecond) * 1000; // Spread operations over time
        const operation = createDelayedOperation(i, delayMs);
        peakLoadOperations.push(operation);
      }

      const startTime = performance.now();
      await Promise.all(peakLoadOperations);
      const endTime = performance.now();

      const totalDuration = endTime - startTime;
      const p95ResponseTime = performanceTracker.getPercentile(
        'saturday-peak-load',
        95,
      );
      const p99ResponseTime = performanceTracker.getPercentile(
        'saturday-peak-load',
        99,
      );
      const successRate =
        performanceTracker.getSuccessRate('saturday-peak-load');
      const actualThroughput =
        (performanceTracker
          .getMeasurements()
          .filter((m) => m.endpoint === 'saturday-peak-load' && m.success)
          .length /
          totalDuration) *
        1000; // ops/second

      console.log(`Saturday Peak Load Results:
        - Duration: ${(totalDuration / 1000).toFixed(2)}s
        - Target Operations: ${totalOperations}
        - Actual Throughput: ${actualThroughput.toFixed(2)} ops/sec
        - P95 Response Time: ${p95ResponseTime.toFixed(2)}ms
        - P99 Response Time: ${p99ResponseTime.toFixed(2)}ms
        - Success Rate: ${successRate.toFixed(2)}%`);

      // Saturday performance must be rock solid
      expect(p99ResponseTime).toBeLessThan(
        API_SLA_REQUIREMENTS.WEDDING_DAY_P99,
      );
      expect(successRate).toBeGreaterThan(99.9); // 99.9% minimum uptime
      expect(actualThroughput).toBeGreaterThan(operationsPerSecond * 0.9); // 90% of target throughput
    });
  });

  describe('Performance SLA Compliance Report', () => {
    it('should generate comprehensive SLA compliance report', () => {
      const report = performanceTracker.generateSLAReport();

      console.log('\n=== COMPREHENSIVE API PERFORMANCE SLA REPORT ===');
      console.log(
        `Overall API Health Score: ${report.overallHealth.toFixed(1)}%`,
      );
      console.log('\nEndpoint Performance Summary:');

      report.endpointSummary.forEach((endpoint) => {
        console.log(`
${endpoint.endpoint.toUpperCase()}:
  ✓ Average Response Time: ${endpoint.avgResponseTime}ms
  ✓ P95 Response Time: ${endpoint.p95ResponseTime}ms
  ✓ Max Response Time: ${endpoint.maxResponseTime}ms
  ✓ Success Rate: ${endpoint.successRate}%
  ${endpoint.slaCompliance ? '✅' : '❌'} SLA Compliance: ${endpoint.slaCompliance ? 'PASS' : 'FAIL'}
  ⚠️ SLA Violations: ${endpoint.violationCount}`);
      });

      // Overall health should be excellent for wedding-critical system
      expect(report.overallHealth).toBeGreaterThan(80); // 80% of endpoints must pass SLA

      // Critical endpoints must have zero violations
      const criticalEndpoints = report.endpointSummary.filter(
        (ep) =>
          ep.endpoint.includes('emergency') ||
          ep.endpoint.includes('wedding-day') ||
          ep.endpoint.includes('saturday'),
      );

      criticalEndpoints.forEach((endpoint) => {
        expect(endpoint.slaCompliance).toBe(true);
        expect(endpoint.violationCount).toBe(0);
      });
    });

    it('should identify performance bottlenecks and optimization opportunities', () => {
      const measurements = performanceTracker.getMeasurements();
      const endpointPerformance = measurements.reduce(
        (acc, measurement) => {
          if (!acc[measurement.endpoint]) {
            acc[measurement.endpoint] = {
              responseTimes: [],
              guestCounts: [],
              restrictionCounts: [],
            };
          }

          acc[measurement.endpoint].responseTimes.push(
            measurement.responseTime,
          );
          if (measurement.guestCount)
            acc[measurement.endpoint].guestCounts.push(measurement.guestCount);
          if (measurement.restrictionCount)
            acc[measurement.endpoint].restrictionCounts.push(
              measurement.restrictionCount,
            );

          return acc;
        },
        {} as Record<string, any>,
      );

      console.log('\n=== PERFORMANCE BOTTLENECK ANALYSIS ===');

      // Helper function to calculate response time statistics - extracted to reduce nesting
      const calculateResponseTimeStats = (responseTimes: number[]) => {
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);
        const varianceSum = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgResponseTime, 2), 0);
        const responseTimeVariability = Math.sqrt(varianceSum / responseTimes.length);

        return { avgResponseTime, maxResponseTime, responseTimeVariability };
      };

      // Helper function to log performance warnings - extracted to reduce nesting
      const logPerformanceWarnings = (endpoint: string, maxResponseTime: number, responseTimeVariability: number) => {
        if (maxResponseTime > 1000) {
          console.warn(
            `⚠️ ${endpoint} has response times >1000ms - immediate optimization required`,
          );
        }

        if (responseTimeVariability > 100) {
          console.warn(
            `⚠️ ${endpoint} has high response time variability - investigate performance inconsistency`,
          );
        }
      };

      // Helper function to analyze endpoint performance - extracted to reduce nesting
      const analyzeEndpointPerformance = ([endpoint, data]: [string, any]) => {
        const { avgResponseTime, maxResponseTime, responseTimeVariability } = calculateResponseTimeStats(data.responseTimes);

        console.log(`
${endpoint}:
  📊 Response Time Variability: ${responseTimeVariability.toFixed(2)}ms (lower is better)
  📈 Max Response Time: ${maxResponseTime.toFixed(2)}ms
  📉 Optimization Priority: ${maxResponseTime > 500 ? 'HIGH' : avgResponseTime > 100 ? 'MEDIUM' : 'LOW'}`);

        logPerformanceWarnings(endpoint, maxResponseTime, responseTimeVariability);
      };

      Object.entries(endpointPerformance).forEach(analyzeEndpointPerformance);

      // Ensure no endpoint has consistently poor performance
      const problematicEndpoints = Object.entries(endpointPerformance).filter(
        ([_, data]) => {
          const avgResponseTime =
            data.responseTimes.reduce(
              (sum: number, time: number) => sum + time,
              0,
            ) / data.responseTimes.length;
          return avgResponseTime > 1000; // Consistently slow
        },
      );

      expect(problematicEndpoints.length).toBe(0); // No consistently slow endpoints
    });
  });
});
