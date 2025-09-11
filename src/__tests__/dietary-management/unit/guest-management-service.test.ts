/**
 * WS-254 Team E: Comprehensive Unit Tests for Guest Management Service
 * Wedding industry critical - bulk guest import and dietary management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GuestManagementService,
  Guest,
  BulkGuestImport,
  DietaryRestriction,
} from '@/lib/dietary-management/guest-management-service';

// Helper functions to reduce nesting complexity (S2004 compliance)
const createLargeImportGuest = (index: number) => ({
  firstName: `Guest${index}`,
  lastName: `LastName${index}`,
  email: `guest${index}@example.com`,
  dietaryNotes: index % 3 === 0 ? 'Vegetarian' : '',
  isVip: false,
});

const createPerformanceTestGuest = (mockGuest: Guest, index: number) => ({
  ...mockGuest,
  id: `guest-${index}`,
  firstName: `Guest${index}`,
  lastName: `LastName${index}`,
});

describe('GuestManagementService', () => {
  let service: GuestManagementService;

  // Mock wedding guest data - realistic scenarios
  const mockBulkImport: BulkGuestImport = {
    weddingId: 'wedding-2025-smith-jones',
    source: 'csv',
    guests: [
      {
        firstName: 'Sarah',
        lastName: 'Smith',
        email: 'sarah@example.com',
        phone: '+1-555-0101',
        dietaryNotes: 'Severe nut allergy - medical certificate on file',
        tableNumber: '1',
        mealChoice: 'Fish',
        isVip: true,
        emergencyContactName: 'John Smith',
        emergencyContactPhone: '+1-555-0102',
        emergencyContactRelation: 'Spouse',
      },
      {
        firstName: 'Michael',
        lastName: 'Jones',
        email: 'michael@example.com',
        phone: '+1-555-0201',
        dietaryNotes: 'Vegetarian, gluten-free',
        tableNumber: '2',
        mealChoice: 'Vegetarian',
        isVip: false,
        emergencyContactName: 'Lisa Jones',
        emergencyContactPhone: '+1-555-0202',
        emergencyContactRelation: 'Mother',
      },
      {
        firstName: 'Emma',
        lastName: 'Wilson',
        email: 'emma@example.com',
        dietaryNotes: 'Vegan lifestyle choice',
        tableNumber: '3',
        mealChoice: 'Vegan',
        isVip: false,
      },
      {
        firstName: 'David',
        lastName: 'Brown',
        email: 'david@example.com',
        dietaryNotes: '',
        tableNumber: '4',
        mealChoice: 'Meat',
        isVip: false,
      },
      {
        firstName: 'Invalid',
        lastName: '', // This should cause validation error
        email: 'invalid-email',
        dietaryNotes: 'Test invalid data',
        isVip: false,
      },
    ],
    importTimestamp: new Date('2025-01-15T10:00:00Z'),
  };

  const mockGuests: Guest[] = [
    {
      id: 'guest-1',
      weddingId: 'wedding-2025-smith-jones',
      firstName: 'Sarah',
      lastName: 'Smith',
      email: 'sarah@example.com',
      phone: '+1-555-0101',
      dietaryRestrictions: [
        {
          id: 'rest-1',
          guestId: 'guest-1',
          type: 'nut-allergy',
          severity: 'life-threatening',
          notes: 'Anaphylaxis - EpiPen required',
          medicalCertification: true,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      ],
      tableAssignment: '1',
      mealPreference: 'fish',
      isVip: true,
      emergencyContact: {
        name: 'John Smith',
        phone: '+1-555-0102',
        relationship: 'Spouse',
      },
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 'guest-2',
      weddingId: 'wedding-2025-smith-jones',
      firstName: 'Michael',
      lastName: 'Jones',
      email: 'michael@example.com',
      dietaryRestrictions: [
        {
          id: 'rest-2',
          guestId: 'guest-2',
          type: 'vegetarian',
          severity: 'moderate',
          notes: 'Ethical vegetarian',
          medicalCertification: false,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
        {
          id: 'rest-3',
          guestId: 'guest-2',
          type: 'gluten-free',
          severity: 'severe',
          notes: 'Celiac disease',
          medicalCertification: true,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      ],
      mealPreference: 'vegetarian',
      isVip: false,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 'guest-3',
      weddingId: 'wedding-2025-smith-jones',
      firstName: 'Emma',
      lastName: 'Wilson',
      dietaryRestrictions: [
        {
          id: 'rest-4',
          guestId: 'guest-3',
          type: 'vegan',
          severity: 'mild',
          notes: 'Lifestyle choice',
          medicalCertification: false,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      ],
      mealPreference: 'vegan',
      isVip: false,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
  ];

  beforeEach(() => {
    service = new GuestManagementService();
  });

  describe('importGuestsBulk', () => {
    it('should successfully import valid guests', async () => {
      const result = await service.importGuestsBulk(mockBulkImport);

      expect(result.summary.totalProcessed).toBe(5);
      expect(result.summary.successfulImports).toBe(4); // 4 valid guests
      expect(result.summary.failedImports).toBe(1); // 1 invalid guest
      expect(result.imported).toHaveLength(4);
      expect(result.errors).toHaveLength(1);
    });

    it('should correctly parse dietary notes into structured restrictions', async () => {
      const result = await service.importGuestsBulk(mockBulkImport);

      const sarahGuest = result.imported.find((g) => g.firstName === 'Sarah');
      expect(sarahGuest?.dietaryRestrictions).toHaveLength(1);
      expect(sarahGuest?.dietaryRestrictions[0].type).toBe('nut-allergy');
      expect(sarahGuest?.dietaryRestrictions[0].severity).toBe('severe');
      expect(sarahGuest?.dietaryRestrictions[0].medicalCertification).toBe(
        true,
      );

      const michaelGuest = result.imported.find(
        (g) => g.firstName === 'Michael',
      );
      expect(michaelGuest?.dietaryRestrictions).toHaveLength(2); // vegetarian + gluten-free
      expect(
        michaelGuest?.dietaryRestrictions.some((r) => r.type === 'vegetarian'),
      ).toBe(true);
      expect(
        michaelGuest?.dietaryRestrictions.some((r) => r.type === 'gluten-free'),
      ).toBe(true);
    });

    it('should parse meal preferences correctly', async () => {
      const result = await service.importGuestsBulk(mockBulkImport);

      const sarahGuest = result.imported.find((g) => g.firstName === 'Sarah');
      expect(sarahGuest?.mealPreference).toBe('fish');

      const michaelGuest = result.imported.find(
        (g) => g.firstName === 'Michael',
      );
      expect(michaelGuest?.mealPreference).toBe('vegetarian');

      const emmaGuest = result.imported.find((g) => g.firstName === 'Emma');
      expect(emmaGuest?.mealPreference).toBe('vegan');

      const davidGuest = result.imported.find((g) => g.firstName === 'David');
      expect(davidGuest?.mealPreference).toBe('meat');
    });

    it('should parse emergency contacts correctly', async () => {
      const result = await service.importGuestsBulk(mockBulkImport);

      const sarahGuest = result.imported.find((g) => g.firstName === 'Sarah');
      expect(sarahGuest?.emergencyContact).toEqual({
        name: 'John Smith',
        phone: '+1-555-0102',
        relationship: 'Spouse',
      });

      const emmaGuest = result.imported.find((g) => g.firstName === 'Emma');
      expect(emmaGuest?.emergencyContact).toBeUndefined();
    });

    it('should detect and skip duplicate guests', async () => {
      const duplicateImport: BulkGuestImport = {
        ...mockBulkImport,
        guests: [
          ...mockBulkImport.guests,
          {
            firstName: 'Sarah',
            lastName: 'Smith',
            email: 'sarah@example.com', // Same as first guest
            dietaryNotes: 'Different notes',
            isVip: false,
          },
        ],
      };

      const result = await service.importGuestsBulk(duplicateImport);
      expect(result.summary.duplicatesSkipped).toBe(1);
    });

    it('should handle validation errors gracefully', async () => {
      const result = await service.importGuestsBulk(mockBulkImport);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(5); // Fifth guest (Invalid with empty lastName)
      expect(result.errors[0].error).toContain('lastName');
    });

    it('should enforce maximum guest limit per wedding', async () => {
      const largeImport: BulkGuestImport = {
        ...mockBulkImport,
        guests: Array(1001).fill(mockBulkImport.guests[0]), // Exceed 1000 limit
      };

      await expect(service.importGuestsBulk(largeImport)).rejects.toThrow(
        'Guest count exceeds maximum of 1000 per wedding',
      );
    });

    it('should handle empty import gracefully', async () => {
      const emptyImport: BulkGuestImport = {
        ...mockBulkImport,
        guests: [],
      };

      const result = await service.importGuestsBulk(emptyImport);
      expect(result.summary.totalProcessed).toBe(0);
      expect(result.imported).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should process large imports in batches efficiently', async () => {
      // Use helper function to reduce nesting (S2004 compliance)
      const largeImport: BulkGuestImport = {
        ...mockBulkImport,
        guests: Array(500).fill(0).map((_, i) => createLargeImportGuest(i)),
      };

      const startTime = Date.now();
      const result = await service.importGuestsBulk(largeImport);
      const endTime = Date.now();

      expect(result.summary.successfulImports).toBe(500);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('addDietaryRestriction', () => {
    it('should add new dietary restriction to guest', async () => {
      const restriction = await service.addDietaryRestriction('guest-1', {
        type: 'shellfish-allergy',
        severity: 'severe',
        notes: 'Recently discovered allergy',
        medicalCertification: false,
      });

      expect(restriction.id).toBeDefined();
      expect(restriction.guestId).toBe('guest-1');
      expect(restriction.type).toBe('shellfish-allergy');
      expect(restriction.severity).toBe('severe');
      expect(restriction.createdAt).toBeDefined();
    });

    it('should handle emergency dietary additions with proper validation', async () => {
      const emergencyRestriction = await service.addDietaryRestriction(
        'guest-emergency',
        {
          type: 'nut-allergy',
          severity: 'life-threatening',
          notes: 'Emergency discovery - guest just informed us',
          medicalCertification: false,
        },
      );

      expect(emergencyRestriction.severity).toBe('life-threatening');
      expect(emergencyRestriction.notes).toContain('Emergency discovery');
    });
  });

  describe('updateGuestRestrictions', () => {
    it('should update guest restrictions successfully', async () => {
      const newRestrictions: DietaryRestriction[] = [
        {
          id: 'new-rest-1',
          guestId: 'guest-1',
          type: 'dairy-free',
          severity: 'moderate',
          notes: 'Lactose intolerant',
          medicalCertification: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const updatedGuest = await service.updateGuestRestrictions(
        'guest-1',
        newRestrictions,
      );

      expect(updatedGuest.dietaryRestrictions).toHaveLength(1);
      expect(updatedGuest.dietaryRestrictions[0].type).toBe('dairy-free');
      expect(updatedGuest.dietaryRestrictions[0].updatedAt).toBeDefined();
    });

    it('should validate all restrictions before updating', async () => {
      const invalidRestrictions = [
        {
          id: 'invalid',
          guestId: 'guest-1',
          type: 'invalid-type' as any,
          severity: 'invalid-severity' as any,
          notes: '',
          medicalCertification: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await expect(
        service.updateGuestRestrictions('guest-1', invalidRestrictions),
      ).rejects.toThrow();
    });
  });

  describe('getCriticalDietaryGuests', () => {
    it('should identify life-threatening dietary guests', async () => {
      const result = await service.getCriticalDietaryGuests(
        'wedding-2025-smith-jones',
        mockGuests,
      );

      expect(result.lifeThreatening).toHaveLength(1);
      expect(result.lifeThreatening[0].firstName).toBe('Sarah');
      expect(result.lifeThreatening[0].dietaryRestrictions[0].severity).toBe(
        'life-threatening',
      );
    });

    it('should identify severe dietary restrictions', async () => {
      const result = await service.getCriticalDietaryGuests(
        'wedding-2025-smith-jones',
        mockGuests,
      );

      expect(result.severe).toHaveLength(1);
      expect(result.severe[0].firstName).toBe('Michael');
      expect(
        result.severe[0].dietaryRestrictions.some(
          (r) => r.severity === 'severe',
        ),
      ).toBe(true);
    });

    it('should identify medically certified restrictions', async () => {
      const result = await service.getCriticalDietaryGuests(
        'wedding-2025-smith-jones',
        mockGuests,
      );

      expect(result.medicalCertified).toHaveLength(2); // Sarah (nut allergy) + Michael (celiac)
      expect(
        result.medicalCertified.every((guest) =>
          guest.dietaryRestrictions.some(
            (r) => r.medicalCertification === true,
          ),
        ),
      ).toBe(true);
    });

    it('should identify VIP guests with dietary needs', async () => {
      const result = await service.getCriticalDietaryGuests(
        'wedding-2025-smith-jones',
        mockGuests,
      );

      expect(result.vipGuests).toHaveLength(1);
      expect(result.vipGuests[0].firstName).toBe('Sarah');
      expect(result.vipGuests[0].isVip).toBe(true);
    });

    it('should filter by wedding ID correctly', async () => {
      const mixedGuests = [
        ...mockGuests,
        {
          ...mockGuests[0],
          id: 'different-wedding-guest',
          weddingId: 'different-wedding-id',
        },
      ];

      const result = await service.getCriticalDietaryGuests(
        'wedding-2025-smith-jones',
        mixedGuests,
      );

      expect(result.lifeThreatening).toHaveLength(1); // Should not include different wedding
    });
  });

  describe('generateDietarySummaryReport', () => {
    it('should generate comprehensive dietary summary', async () => {
      const report = await service.generateDietarySummaryReport(mockGuests);

      expect(report.totalGuests).toBe(3);
      expect(report.restrictionSummary['nut-allergy']).toBe(1);
      expect(report.restrictionSummary['vegetarian']).toBe(1);
      expect(report.restrictionSummary['gluten-free']).toBe(1);
      expect(report.restrictionSummary['vegan']).toBe(1);
    });

    it('should categorize severity correctly', async () => {
      const report = await service.generateDietarySummaryReport(mockGuests);

      expect(report.severityBreakdown['life-threatening']).toBe(1);
      expect(report.severityBreakdown['severe']).toBe(1);
      expect(report.severityBreakdown['moderate']).toBe(1);
      expect(report.severityBreakdown['mild']).toBe(1);
    });

    it('should summarize meal preferences', async () => {
      const report = await service.generateDietarySummaryReport(mockGuests);

      expect(report.mealPreferenceSummary['fish']).toBe(1);
      expect(report.mealPreferenceSummary['vegetarian']).toBe(1);
      expect(report.mealPreferenceSummary['vegan']).toBe(1);
    });

    it('should generate critical alerts for dangerous situations', async () => {
      const report = await service.generateDietarySummaryReport(mockGuests);

      expect(report.criticalAlerts).toContain(
        expect.stringContaining('LIFE-THREATENING dietary restrictions'),
      );
      expect(report.criticalAlerts).toContain(
        expect.stringContaining('nut allergies'),
      );
      expect(report.criticalAlerts).toContain(
        expect.stringContaining('multiple dietary restrictions'),
      );
    });

    it('should provide appropriate catering recommendations', async () => {
      const report = await service.generateDietarySummaryReport(mockGuests);

      expect(report.recommendations).toContain(
        'Ensure separate gluten-free preparation area',
      );
      expect(report.recommendations).toContain(
        'Implement strict nut-free kitchen protocols',
      );
      expect(report.recommendations).toContain(
        'Have EpiPens and emergency medical protocols ready',
      );
    });

    it('should handle empty guest list gracefully', async () => {
      const report = await service.generateDietarySummaryReport([]);

      expect(report.totalGuests).toBe(0);
      expect(report.criticalAlerts).toHaveLength(0);
      expect(report.recommendations).toHaveLength(0);
    });

    it('should recommend dietary stations for high restriction percentage', async () => {
      // Create guest list where >30% have restrictions
      const highRestrictionGuests = [
        ...mockGuests,
        {
          ...mockGuests[0],
          id: 'guest-4',
          firstName: 'Test',
          lastName: 'Guest',
          dietaryRestrictions: [],
        },
      ]; // 3 out of 4 guests have restrictions (75%)

      const report = await service.generateDietarySummaryReport(
        highRestrictionGuests,
      );
      expect(report.recommendations).toContain(
        'Consider dedicated dietary restriction stations',
      );
    });
  });

  describe('validateWeddingDayReadiness', () => {
    it('should identify missing emergency contacts for high-risk guests', async () => {
      const riskyGuests: Guest[] = [
        {
          ...mockGuests[0],
          emergencyContact: undefined, // Remove emergency contact
        },
      ];

      const validation = await service.validateWeddingDayReadiness(riskyGuests);

      expect(validation.isReady).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining(
          'life-threatening allergies missing emergency contacts',
        ),
      );
    });

    it('should warn about vague dietary restrictions', async () => {
      const vagueGuests: Guest[] = [
        {
          ...mockGuests[0],
          dietaryRestrictions: [
            {
              id: 'vague-1',
              guestId: 'guest-1',
              type: 'other',
              severity: 'mild',
              notes: '', // No notes for 'other' type
              medicalCertification: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ];

      const validation = await service.validateWeddingDayReadiness(vagueGuests);

      expect(validation.warnings).toContain(
        expect.stringContaining('unspecified dietary restrictions'),
      );
    });

    it('should validate medical certifications', async () => {
      const uncertifiedGuests: Guest[] = [
        {
          ...mockGuests[0],
          dietaryRestrictions: [
            {
              ...mockGuests[0].dietaryRestrictions[0],
              medicalCertification: false, // Life-threatening but not certified
            },
          ],
        },
      ];

      const validation =
        await service.validateWeddingDayReadiness(uncertifiedGuests);

      const medicalCertCheck = validation.checklist.find(
        (item) => item.item === 'Medical certifications verified',
      );
      expect(medicalCertCheck?.status).toBe('pending');
    });

    it('should pass validation for well-prepared guest list', async () => {
      const validation = await service.validateWeddingDayReadiness(mockGuests);

      expect(validation.isReady).toBe(true);
      expect(validation.errors).toHaveLength(0);

      const criticalCheck = validation.checklist.find(
        (item) => item.item === 'All critical allergies documented',
      );
      expect(criticalCheck?.status).toBe('complete');
    });

    it('should handle empty guest list', async () => {
      const validation = await service.validateWeddingDayReadiness([]);

      expect(validation.isReady).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle malformed dietary notes gracefully', async () => {
      const malformedImport: BulkGuestImport = {
        ...mockBulkImport,
        guests: [
          {
            firstName: 'Test',
            lastName: 'Guest',
            dietaryNotes:
              '!!!@#$%^&*()_+ random text with no clear restrictions',
            isVip: false,
          },
        ],
      };

      const result = await service.importGuestsBulk(malformedImport);

      expect(result.summary.successfulImports).toBe(1);
      const guest = result.imported[0];
      expect(guest.dietaryRestrictions).toHaveLength(1);
      expect(guest.dietaryRestrictions[0].type).toBe('other');
    });

    it('should handle special characters in names and contact info', async () => {
      const specialCharsImport: BulkGuestImport = {
        ...mockBulkImport,
        guests: [
          {
            firstName: 'José María',
            lastName: "O'Sullivan-Smythe",
            email: 'josé.maría@ñoño.com',
            phone: '+33-1-42-86-83-26',
            dietaryNotes: 'Régime végétalien',
            isVip: false,
          },
        ],
      };

      const result = await service.importGuestsBulk(specialCharsImport);

      expect(result.summary.successfulImports).toBe(1);
      const guest = result.imported[0];
      expect(guest.firstName).toBe('José María');
      expect(guest.lastName).toBe("O'Sullivan-Smythe");
    });

    it('should maintain performance with large guest lists', async () => {
      // Use helper function to reduce nesting (S2004 compliance)
      const largeGuestList = Array(1000)
        .fill(0)
        .map((_, i) => createPerformanceTestGuest(mockGuests[0], i));

      const startTime = Date.now();
      const report = await service.generateDietarySummaryReport(largeGuestList);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Under 1 second
      expect(report.totalGuests).toBe(1000);
    });
  });
});
