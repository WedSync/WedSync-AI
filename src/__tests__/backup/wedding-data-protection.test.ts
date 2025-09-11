import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  WeddingDataProtectionService,
  CriticalityAssessment,
  RecoveryPoint,
  ValidationReport,
  Wedding,
} from '@/lib/backup/wedding-data-protection';

// Mock Supabase client
vi.mock('@supabase/auth-helpers-nextjs');

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        data: [],
        error: null,
      })),
      gte: vi.fn(),
      lte: vi.fn(),
      order: vi.fn(() => ({
        data: [],
        error: null,
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { id: 'test-id' },
          error: null,
        })),
      })),
    })),
    upsert: vi.fn(() => ({
      data: { id: 'test-id' },
      error: null,
    })),
  })),
};

describe('WeddingDataProtectionService', () => {
  let protectionService: WeddingDataProtectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    (createClientComponentClient as Mock).mockReturnValue(mockSupabaseClient);
    protectionService = new WeddingDataProtectionService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('assessDataCriticality', () => {
    const mockWedding: Wedding = {
      id: 'wedding-1',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'active',
      couple_id: 'couple-1',
      supplier_id: 'supplier-1',
      guest_count: 100,
      estimated_budget: 30000,
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      // Mock wedding data retrieval
      mockSupabaseClient.from().select().eq().single.mockReturnValue({
        data: mockWedding,
        error: null,
      });

      // Mock vendor count
      mockSupabaseClient
        .from()
        .select()
        .eq.mockReturnValue({
          data: [{ id: 'vendor-1' }, { id: 'vendor-2' }],
          error: null,
        });
    });

    it('should assess critical wedding as high priority', async () => {
      // Wedding in 3 days (critical)
      const criticalWedding = {
        ...mockWedding,
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      };

      mockSupabaseClient.from().select().eq().single.mockReturnValueOnce({
        data: criticalWedding,
        error: null,
      });

      const assessment: CriticalityAssessment =
        await protectionService.assessDataCriticality('wedding-1');

      expect(assessment.criticalityLevel).toBe('critical');
      expect(assessment.backupFrequency).toBeLessThanOrEqual(30); // Very frequent backups
      expect(assessment.offSiteRequired).toBe(true);
      expect(assessment.reasoning).toContain('3 days away');
    });

    it('should assess distant wedding as low priority', async () => {
      // Wedding in 6 months (low priority)
      const distantWedding = {
        ...mockWedding,
        date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      };

      mockSupabaseClient.from().select().eq().single.mockReturnValueOnce({
        data: distantWedding,
        error: null,
      });

      const assessment: CriticalityAssessment =
        await protectionService.assessDataCriticality('wedding-1');

      expect(assessment.criticalityLevel).toBe('low');
      expect(assessment.backupFrequency).toBeGreaterThanOrEqual(1440); // Daily or less frequent
      expect(assessment.offSiteRequired).toBe(false);
    });

    it('should identify high-value wedding risk factors', async () => {
      const highValueWedding = {
        ...mockWedding,
        estimated_budget: 75000, // High budget
        guest_count: 300, // Large guest count
      };

      mockSupabaseClient.from().select().eq().single.mockReturnValueOnce({
        data: highValueWedding,
        error: null,
      });

      // Mock many vendors
      mockSupabaseClient
        .from()
        .select()
        .eq.mockReturnValueOnce({
          data: Array.from({ length: 8 }, (_, i) => ({ id: `vendor-${i}` })),
          error: null,
        });

      const assessment: CriticalityAssessment =
        await protectionService.assessDataCriticality('wedding-1');

      expect(assessment.riskFactors).toContain('high_value_wedding');
      expect(assessment.riskFactors).toContain('high_guest_count');
      expect(assessment.riskFactors).toContain('complex_vendor_coordination');
      expect(assessment.retentionPeriod).toBeGreaterThanOrEqual(365); // Extended retention for high-value
    });

    it('should detect weekend wedding risk factor', async () => {
      // Saturday wedding
      const saturdayWedding = {
        ...mockWedding,
        date: new Date('2025-02-01'), // Assuming this is a Saturday
      };

      // Set the day to be Saturday (day 6)
      saturdayWedding.date.setDate(
        saturdayWedding.date.getDate() + (6 - saturdayWedding.date.getDay()),
      );

      mockSupabaseClient.from().select().eq().single.mockReturnValueOnce({
        data: saturdayWedding,
        error: null,
      });

      const assessment: CriticalityAssessment =
        await protectionService.assessDataCriticality('wedding-1');

      expect(assessment.riskFactors).toContain('weekend_wedding');
    });

    it('should detect actively planned wedding', async () => {
      const recentlyUpdatedWedding = {
        ...mockWedding,
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Updated 2 days ago
      };

      mockSupabaseClient.from().select().eq().single.mockReturnValueOnce({
        data: recentlyUpdatedWedding,
        error: null,
      });

      const assessment: CriticalityAssessment =
        await protectionService.assessDataCriticality('wedding-1');

      expect(assessment.riskFactors).toContain('actively_being_planned');
    });

    it('should handle non-existent wedding gracefully', async () => {
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: null,
          error: new Error('Wedding not found'),
        });

      await expect(
        protectionService.assessDataCriticality('non-existent'),
      ).rejects.toThrow('Wedding non-existent not found');
    });

    it('should provide safe defaults on error', async () => {
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockRejectedValueOnce(new Error('Database error'));

      const assessment: CriticalityAssessment =
        await protectionService.assessDataCriticality('wedding-1');

      expect(assessment.criticalityLevel).toBe('high'); // Safe default
      expect(assessment.backupFrequency).toBe(60);
      expect(assessment.retentionPeriod).toBe(365);
      expect(assessment.offSiteRequired).toBe(true);
      expect(assessment.reasoning).toContain(
        'Error occurred during assessment',
      );
      expect(assessment.riskFactors).toContain('assessment_error');
    });

    it('should store assessment in database', async () => {
      await protectionService.assessDataCriticality('wedding-1');

      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          wedding_id: 'wedding-1',
          backup_frequency_minutes: expect.any(Number),
          retention_policy: expect.any(String),
          off_site_backup_enabled: expect.any(Boolean),
        }),
      );
    });
  });

  describe('createRecoveryPoint', () => {
    beforeEach(() => {
      // Mock all data collection methods
      mockSupabaseClient
        .from()
        .select()
        .eq.mockReturnValue({
          data: [{ id: 'test-data' }],
          error: null,
        });

      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValue({
          data: { id: 'wedding-1', couple_id: 'couple-1' },
          error: null,
        });
    });

    it('should create recovery point with consistent data', async () => {
      const weddingId = 'wedding-1';

      const recoveryPoint: RecoveryPoint =
        await protectionService.createRecoveryPoint(weddingId);

      expect(recoveryPoint.id).toContain(weddingId);
      expect(recoveryPoint.weddingId).toBe(weddingId);
      expect(recoveryPoint.timestamp).toBeInstanceOf(Date);
      expect(recoveryPoint.dataHash).toBeTruthy();
      expect(recoveryPoint.size).toBeGreaterThan(0);
      expect(recoveryPoint.location).toContain('recovery-points');
      expect(recoveryPoint.consistencyLevel).toBe('full');
      expect(Array.isArray(recoveryPoint.includedDataTypes)).toBe(true);
    });

    it('should handle partial consistency', async () => {
      const weddingId = 'wedding-with-issues';

      // Mock wedding with missing couple reference
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: { id: weddingId, couple_id: 'non-existent-couple' },
          error: null,
        });

      // Mock couple lookup failure
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockImplementationOnce((field) => {
          if (field === 'couple_id') {
            return { data: null, error: new Error('Couple not found') };
          }
          return { data: { id: weddingId }, error: null };
        });

      const recoveryPoint: RecoveryPoint =
        await protectionService.createRecoveryPoint(weddingId);

      expect(recoveryPoint.consistencyLevel).toBe('partial');
    });

    it('should calculate data hash consistently', async () => {
      const weddingId = 'wedding-1';

      const recoveryPoint1: RecoveryPoint =
        await protectionService.createRecoveryPoint(weddingId);
      const recoveryPoint2: RecoveryPoint =
        await protectionService.createRecoveryPoint(weddingId);

      // With same data, hashes should be identical
      expect(recoveryPoint1.dataHash).toBe(recoveryPoint2.dataHash);
    });

    it('should include all data types', async () => {
      const weddingId = 'wedding-1';

      const recoveryPoint: RecoveryPoint =
        await protectionService.createRecoveryPoint(weddingId);

      expect(recoveryPoint.includedDataTypes).toContain('wedding');
      expect(recoveryPoint.includedDataTypes).toContain('guests');
      expect(recoveryPoint.includedDataTypes).toContain('timeline');
      expect(recoveryPoint.includedDataTypes).toContain('vendors');
      expect(recoveryPoint.includedDataTypes).toContain('photos');
      expect(recoveryPoint.includedDataTypes).toContain('documents');
    });

    it('should handle data collection errors', async () => {
      const weddingId = 'problematic-wedding';

      // Mock some data collection failures
      let callCount = 0;
      mockSupabaseClient
        .from()
        .select()
        .eq.mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            // Second call (guests) fails
            return { data: null, error: new Error('Guests fetch failed') };
          }
          return { data: [{ id: `data-${callCount}` }], error: null };
        });

      await expect(
        protectionService.createRecoveryPoint(weddingId),
      ).resolves.not.toThrow();
    });
  });

  describe('performDataValidation', () => {
    const mockWedding: Wedding = {
      id: 'wedding-1',
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      couple_id: 'couple-1',
      supplier_id: 'supplier-1',
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      mockSupabaseClient.from().select().eq().single.mockReturnValue({
        data: mockWedding,
        error: null,
      });

      // Mock valid data for all checks
      mockSupabaseClient
        .from()
        .select()
        .eq.mockReturnValue({
          data: [{ id: 'test-data' }],
          error: null,
        });

      mockSupabaseClient
        .from()
        .select()
        .eq()
        .order.mockReturnValue({
          data: [
            {
              id: 'event-1',
              scheduled_time: '2025-02-01T10:00:00Z',
              title: 'Ceremony',
            },
            {
              id: 'event-2',
              scheduled_time: '2025-02-01T12:00:00Z',
              title: 'Reception',
            },
          ],
          error: null,
        });
    });

    it('should validate complete wedding data successfully', async () => {
      const weddingId = 'wedding-1';

      const report: ValidationReport =
        await protectionService.performDataValidation(weddingId);

      expect(report.weddingId).toBe(weddingId);
      expect(report.isValid).toBe(true);
      expect(report.criticalIssues).toHaveLength(0);
      expect(report.integrityScore).toBeGreaterThanOrEqual(80);
      expect(report.dataCompleteness.coreData).toBe(true);
      expect(report.lastValidated).toBeInstanceOf(Date);
      expect(report.nextValidationDue).toBeInstanceOf(Date);
    });

    it('should detect missing required fields', async () => {
      const invalidWedding = {
        ...mockWedding,
        date: null, // Missing required field
        couple_id: null, // Missing required field
      };

      mockSupabaseClient.from().select().eq().single.mockReturnValueOnce({
        data: invalidWedding,
        error: null,
      });

      const report: ValidationReport =
        await protectionService.performDataValidation('wedding-1');

      expect(report.isValid).toBe(false);
      expect(report.criticalIssues.length).toBeGreaterThan(0);
      expect(
        report.criticalIssues.some(
          (issue) =>
            issue.type === 'missing_required_field' &&
            issue.affectedField === 'date',
        ),
      ).toBe(true);
      expect(
        report.criticalIssues.some(
          (issue) =>
            issue.type === 'missing_required_field' &&
            issue.affectedField === 'couple_id',
        ),
      ).toBe(true);
    });

    it('should detect timeline inconsistencies', async () => {
      // Mock timeline events in wrong order
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .order.mockReturnValueOnce({
          data: [
            {
              id: 'event-1',
              scheduled_time: '2025-02-01T12:00:00Z',
              title: 'Reception',
            },
            {
              id: 'event-2',
              scheduled_time: '2025-02-01T10:00:00Z',
              title: 'Ceremony',
            }, // Earlier time after later time
          ],
          error: null,
        });

      const report: ValidationReport =
        await protectionService.performDataValidation('wedding-1');

      expect(
        report.criticalIssues.some(
          (issue) => issue.type === 'timeline_inconsistency',
        ),
      ).toBe(true);
      expect(report.integrityScore).toBeLessThan(100);
    });

    it('should assess data completeness accurately', async () => {
      // Mock missing photos and documents
      let callCount = 0;
      mockSupabaseClient
        .from()
        .select()
        .eq.mockImplementation((field) => {
          callCount++;
          if (field === 'wedding_id' && callCount >= 4) {
            // Photos and documents calls
            return { data: [], error: null }; // Empty arrays for missing data
          }
          return { data: [{ id: 'test-data' }], error: null };
        });

      const report: ValidationReport =
        await protectionService.performDataValidation('wedding-1');

      expect(report.dataCompleteness.photos).toBe(false);
      expect(report.dataCompleteness.documents).toBe(false);
      expect(report.dataCompleteness.completenessPercentage).toBeLessThan(100);
    });

    it('should handle validation errors gracefully', async () => {
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockRejectedValueOnce(new Error('Database validation error'));

      const report: ValidationReport =
        await protectionService.performDataValidation('wedding-1');

      expect(report.isValid).toBe(false);
      expect(report.criticalIssues).toHaveLength(1);
      expect(report.criticalIssues[0].type).toBe('data_corruption');
      expect(report.criticalIssues[0].description).toContain(
        'Validation failed',
      );
      expect(report.integrityScore).toBe(0);
    });

    it('should calculate next validation date based on wedding proximity', async () => {
      // Test wedding in 5 days (should be daily validation)
      const urgentWedding = {
        ...mockWedding,
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      };

      mockSupabaseClient.from().select().eq().single.mockReturnValueOnce({
        data: urgentWedding,
        error: null,
      });

      const report: ValidationReport =
        await protectionService.performDataValidation('wedding-1');

      const hoursUntilNext =
        (report.nextValidationDue.getTime() - report.lastValidated.getTime()) /
        (1000 * 60 * 60);
      expect(hoursUntilNext).toBeLessThanOrEqual(25); // Should be about 24 hours (daily)
    });

    it('should detect no timeline events', async () => {
      mockSupabaseClient.from().select().eq().order.mockReturnValueOnce({
        data: [],
        error: null,
      });

      const report: ValidationReport =
        await protectionService.performDataValidation('wedding-1');

      expect(
        report.warnings.some(
          (issue) =>
            issue.type === 'timeline_inconsistency' &&
            issue.description === 'No timeline events found',
        ),
      ).toBe(true);
    });

    it('should identify auto-fixable issues', async () => {
      // Mock timeline with fixable ordering issue
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .order.mockReturnValueOnce({
          data: [
            {
              id: 'event-1',
              scheduled_time: '2025-02-01T12:00:00Z',
              title: 'Reception',
            },
            {
              id: 'event-2',
              scheduled_time: '2025-02-01T10:00:00Z',
              title: 'Ceremony',
            },
          ],
          error: null,
        });

      const report: ValidationReport =
        await protectionService.performDataValidation('wedding-1');

      const timelineIssue = report.criticalIssues.find(
        (issue) => issue.type === 'timeline_inconsistency',
      );

      expect(timelineIssue?.autoFixable).toBe(true);
      expect(timelineIssue?.suggestedFix).toContain('Reorder timeline events');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should complete validation within reasonable time', async () => {
      const weddingId = 'performance-test-wedding';
      const maxDuration = 3000; // 3 seconds max

      const startTime = Date.now();
      const report = await protectionService.performDataValidation(weddingId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(maxDuration);
      expect(report.weddingId).toBe(weddingId);
    });

    it('should handle large wedding datasets', async () => {
      const weddingId = 'large-wedding';

      // Mock large guest list
      const largeGuestList = Array.from({ length: 1000 }, (_, i) => ({
        id: `guest-${i}`,
        name: `Guest ${i}`,
      }));

      mockSupabaseClient
        .from()
        .select()
        .eq.mockImplementation((field) => {
          if (field === 'wedding_id') {
            return { data: largeGuestList, error: null };
          }
          return { data: [{ id: 'test-data' }], error: null };
        });

      const report = await protectionService.performDataValidation(weddingId);

      expect(report.isValid).toBe(true);
      expect(report.dataCompleteness.guestList).toBe(true);
    });

    it('should handle concurrent assessments', async () => {
      const weddingIds = ['wedding-1', 'wedding-2', 'wedding-3'];

      const assessmentPromises = weddingIds.map((id) =>
        protectionService.assessDataCriticality(id),
      );

      const assessments = await Promise.all(assessmentPromises);

      expect(assessments).toHaveLength(3);
      assessments.forEach((assessment) => {
        expect(assessment.criticalityLevel).toBeDefined();
        expect(assessment.backupFrequency).toBeGreaterThan(0);
      });
    });
  });
});
