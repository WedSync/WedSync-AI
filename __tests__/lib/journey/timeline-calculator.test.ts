import { calculateExecutionDate, validateTimelineConfig } from '@/components/journey/canvas/TimelineAnchor';
import type { TimelineAnchorConfig } from '@/components/journey/canvas/TimelineAnchor';

describe('TimelineCalculator', () => {
  const weddingDate = new Date('2024-06-15T14:00:00.000Z'); // Saturday, June 15, 2024 at 2 PM
  const bookingDate = new Date('2024-03-15T10:00:00.000Z'); // Friday, March 15, 2024 at 10 AM

  describe('calculateExecutionDate', () => {
    it('should calculate wedding date anchors correctly', () => {
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 2, unit: 'weeks', direction: 'before' },
        skip_weekends: false,
        timezone: 'UTC'
      };

      const result = calculateExecutionDate(config, weddingDate, bookingDate);
      expect(result).toEqual(new Date('2024-06-01T14:00:00.000Z'));
    });

    it('should calculate booking date anchors correctly', () => {
      const config: TimelineAnchorConfig = {
        anchor_type: 'booking_date',
        offset: { value: 1, unit: 'months', direction: 'after' },
        skip_weekends: false,
        timezone: 'UTC'
      };

      const result = calculateExecutionDate(config, weddingDate, bookingDate);
      expect(result).toEqual(new Date('2024-04-15T10:00:00.000Z'));
    });

    it('should calculate fixed date anchors correctly', () => {
      const fixedDate = new Date('2024-05-01T12:00:00.000Z');
      const config: TimelineAnchorConfig = {
        anchor_type: 'fixed_date',
        offset: { value: 5, unit: 'days', direction: 'after' },
        skip_weekends: false,
        timezone: 'UTC'
      };

      const result = calculateExecutionDate(config, weddingDate, bookingDate, fixedDate);
      expect(result).toEqual(new Date('2024-05-06T12:00:00.000Z'));
    });

    it('should handle "before" direction correctly', () => {
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 1, unit: 'weeks', direction: 'before' },
        skip_weekends: false,
        timezone: 'UTC'
      };

      const result = calculateExecutionDate(config, weddingDate, bookingDate);
      expect(result).toEqual(new Date('2024-06-08T14:00:00.000Z'));
    });

    it('should handle "after" direction correctly', () => {
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 1, unit: 'weeks', direction: 'after' },
        skip_weekends: false,
        timezone: 'UTC'
      };

      const result = calculateExecutionDate(config, weddingDate, bookingDate);
      expect(result).toEqual(new Date('2024-06-22T14:00:00.000Z'));
    });

    it('should skip weekends when configured', () => {
      // June 16, 2024 is a Sunday, so it should move to Monday
      const weddingOnSunday = new Date('2024-06-16T14:00:00.000Z');
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 1, unit: 'days', direction: 'before' },
        skip_weekends: true,
        timezone: 'UTC'
      };

      const result = calculateExecutionDate(config, weddingOnSunday, bookingDate);
      // Should be Saturday June 15th, but then moved to Monday June 17th
      expect(result.getDay()).not.toBe(0); // Not Sunday
      expect(result.getDay()).not.toBe(6); // Not Saturday
      expect(result.getDay()).toBe(1); // Should be Monday
    });

    it('should not skip weekends when disabled', () => {
      const weddingOnSunday = new Date('2024-06-16T14:00:00.000Z');
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 1, unit: 'days', direction: 'before' },
        skip_weekends: false,
        timezone: 'UTC'
      };

      const result = calculateExecutionDate(config, weddingOnSunday, bookingDate);
      // Should be Saturday June 15th
      expect(result.getDay()).toBe(6); // Should be Saturday
    });

    it('should apply business hours when configured', () => {
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 1, unit: 'days', direction: 'before' },
        skip_weekends: false,
        timezone: 'UTC',
        business_hours: {
          enabled: true,
          start: '09:30',
          end: '17:00'
        }
      };

      const result = calculateExecutionDate(config, weddingDate, bookingDate);
      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(30);
    });

    it('should handle different offset units correctly', () => {
      const baseConfig: Omit<TimelineAnchorConfig, 'offset'> = {
        anchor_type: 'wedding_date',
        skip_weekends: false,
        timezone: 'UTC'
      };

      // Test days
      const daysConfig: TimelineAnchorConfig = {
        ...baseConfig,
        offset: { value: 3, unit: 'days', direction: 'before' }
      };
      const daysResult = calculateExecutionDate(daysConfig, weddingDate, bookingDate);
      expect(daysResult).toEqual(new Date('2024-06-12T14:00:00.000Z'));

      // Test weeks
      const weeksConfig: TimelineAnchorConfig = {
        ...baseConfig,
        offset: { value: 1, unit: 'weeks', direction: 'before' }
      };
      const weeksResult = calculateExecutionDate(weeksConfig, weddingDate, bookingDate);
      expect(weeksResult).toEqual(new Date('2024-06-08T14:00:00.000Z'));

      // Test months
      const monthsConfig: TimelineAnchorConfig = {
        ...baseConfig,
        offset: { value: 1, unit: 'months', direction: 'before' }
      };
      const monthsResult = calculateExecutionDate(monthsConfig, weddingDate, bookingDate);
      expect(monthsResult).toEqual(new Date('2024-05-15T14:00:00.000Z'));
    });

    it('should throw error for unsupported anchor type', () => {
      const config = {
        anchor_type: 'invalid_type' as any,
        offset: { value: 1, unit: 'days' as const, direction: 'before' as const },
        skip_weekends: false,
        timezone: 'UTC'
      };

      expect(() => {
        calculateExecutionDate(config, weddingDate, bookingDate);
      }).toThrow('Unsupported anchor type: invalid_type');
    });

    it('should throw error for unsupported offset unit', () => {
      const config = {
        anchor_type: 'wedding_date' as const,
        offset: { value: 1, unit: 'invalid_unit' as any, direction: 'before' as const },
        skip_weekends: false,
        timezone: 'UTC'
      };

      expect(() => {
        calculateExecutionDate(config, weddingDate, bookingDate);
      }).toThrow('Unsupported offset unit: invalid_unit');
    });
  });

  describe('validateTimelineConfig', () => {
    it('should validate valid configuration', () => {
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 2, unit: 'weeks', direction: 'before' },
        skip_weekends: true,
        timezone: 'UTC',
        business_hours: {
          enabled: true,
          start: '09:00',
          end: '17:00'
        }
      };

      const result = validateTimelineConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect negative offset values', () => {
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: -1, unit: 'weeks', direction: 'before' },
        skip_weekends: false,
        timezone: 'UTC'
      };

      const result = validateTimelineConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Offset value must be positive');
    });

    it('should warn about excessive day offsets', () => {
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 400, unit: 'days', direction: 'before' },
        skip_weekends: false,
        timezone: 'UTC'
      };

      const result = validateTimelineConfig(config);
      expect(result.warnings).toContain('Offset of more than 365 days may be excessive');
    });

    it('should validate business hours format', () => {
      const invalidConfig: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 1, unit: 'weeks', direction: 'before' },
        skip_weekends: false,
        timezone: 'UTC',
        business_hours: {
          enabled: true,
          start: '9:00', // Invalid format
          end: '17:00'
        }
      };

      const result = validateTimelineConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid start time format. Use HH:MM');
    });

    it('should validate business hours order', () => {
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 1, unit: 'weeks', direction: 'before' },
        skip_weekends: false,
        timezone: 'UTC',
        business_hours: {
          enabled: true,
          start: '17:00',
          end: '09:00' // End before start
        }
      };

      const result = validateTimelineConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start time must be before end time');
    });

    it('should require fixed date for fixed date anchor', () => {
      const config: TimelineAnchorConfig = {
        anchor_type: 'fixed_date',
        offset: { value: 1, unit: 'weeks', direction: 'before' },
        skip_weekends: false,
        timezone: 'UTC'
        // Missing fixed_date
      };

      const result = validateTimelineConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Fixed date is required when using fixed date anchor');
    });

    it('should validate all business hours format errors', () => {
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 1, unit: 'weeks', direction: 'before' },
        skip_weekends: false,
        timezone: 'UTC',
        business_hours: {
          enabled: true,
          start: '9:0', // Invalid format
          end: '17:0'  // Invalid format
        }
      };

      const result = validateTimelineConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid start time format. Use HH:MM');
      expect(result.errors).toContain('Invalid end time format. Use HH:MM');
    });
  });

  describe('Edge cases and complex scenarios', () => {
    it('should handle leap year calculations', () => {
      const leapYearDate = new Date('2024-02-29T12:00:00.000Z'); // Leap year
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 1, unit: 'months', direction: 'after' },
        skip_weekends: false,
        timezone: 'UTC'
      };

      const result = calculateExecutionDate(config, leapYearDate, bookingDate);
      expect(result.getDate()).toBe(29); // Should handle leap year correctly
      expect(result.getMonth()).toBe(2); // March (0-indexed)
    });

    it('should handle month-end edge cases', () => {
      const endOfMonth = new Date('2024-01-31T12:00:00.000Z');
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 1, unit: 'months', direction: 'after' },
        skip_weekends: false,
        timezone: 'UTC'
      };

      const result = calculateExecutionDate(config, endOfMonth, bookingDate);
      // February doesn't have 31 days, should be last day of February
      expect(result.getMonth()).toBe(1); // February (0-indexed)
      expect(result.getDate()).toBeLessThanOrEqual(29); // 28 or 29 depending on leap year
    });

    it('should handle year boundary crossing', () => {
      const yearEnd = new Date('2024-12-31T12:00:00.000Z');
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 1, unit: 'weeks', direction: 'after' },
        skip_weekends: false,
        timezone: 'UTC'
      };

      const result = calculateExecutionDate(config, yearEnd, bookingDate);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(7);
    });

    it('should handle multiple weekend skips', () => {
      // Friday before a weekend
      const friday = new Date('2024-06-14T12:00:00.000Z');
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 2, unit: 'days', direction: 'after' },
        skip_weekends: true,
        timezone: 'UTC'
      };

      const result = calculateExecutionDate(config, friday, bookingDate);
      // Friday + 2 days = Sunday, should move to Monday
      expect(result.getDay()).toBe(1); // Monday
    });

    it('should combine business hours and weekend skipping', () => {
      const saturday = new Date('2024-06-15T12:00:00.000Z'); // Saturday
      const config: TimelineAnchorConfig = {
        anchor_type: 'wedding_date',
        offset: { value: 0, unit: 'days', direction: 'after' },
        skip_weekends: true,
        timezone: 'UTC',
        business_hours: {
          enabled: true,
          start: '10:30',
          end: '16:00'
        }
      };

      const result = calculateExecutionDate(config, saturday, bookingDate);
      expect(result.getDay()).toBe(1); // Should be Monday
      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(30);
    });
  });
});