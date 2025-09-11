import { z } from 'zod';

// Venue validation schema
const VenueSchema = z.object({
  name: z
    .string()
    .min(1, 'Venue name is required')
    .max(255, 'Venue name must be less than 255 characters')
    .trim(),
  placeId: z.string().optional(),
  address: z
    .string()
    .min(1, 'Venue address is required')
    .max(500, 'Venue address must be less than 500 characters')
    .trim(),
  coordinates: z
    .object({
      lat: z
        .number()
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90'),
      lng: z
        .number()
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180'),
    })
    .optional(),
});

// Wedding date validation
const WeddingDateSchema = z
  .string()
  .min(1, 'Wedding date is required')
  .refine(
    (date) => {
      try {
        const selectedDate = new Date(date);
        const today = new Date();
        const minDate = new Date();
        const maxDate = new Date();

        // Minimum 30 days in future
        minDate.setDate(today.getDate() + 30);
        // Maximum 3 years in future
        maxDate.setFullYear(today.getFullYear() + 3);

        return (
          selectedDate >= minDate &&
          selectedDate <= maxDate &&
          !isNaN(selectedDate.getTime())
        );
      } catch {
        return false;
      }
    },
    {
      message: 'Wedding date must be between 30 days and 3 years from today',
    },
  );

// Guest count validation
const GuestCountSchema = z
  .number({
    required_error: 'Guest count is required',
    invalid_type_error: 'Guest count must be a number',
  })
  .int('Guest count must be a whole number')
  .min(2, 'Guest count must be at least 2')
  .max(500, 'Guest count cannot exceed 500');

// Wedding style validation
const WeddingStyleSchema = z
  .array(z.string().min(1))
  .min(1, 'Please select at least one wedding style')
  .max(5, 'Please select no more than 5 wedding styles')
  .refine(
    (styles) => {
      // Validate that all styles are from our predefined list
      const validStyles = [
        'Rustic',
        'Bohemian',
        'Vintage',
        'Modern',
        'Classic Elegant',
        'Romantic',
        'Industrial',
        'Garden Party',
        'Beach',
        'Destination',
        'Outdoor',
        'Indoor',
        'Spring',
        'Summer',
        'Fall',
        'Winter',
        'Minimalist',
        'Glamorous',
        'Cultural Traditional',
        'DIY',
      ];
      return styles.every((style) => validStyles.includes(style));
    },
    {
      message: 'Please select valid wedding styles only',
    },
  );

// Main wedding basics schema
export const WeddingBasicsSchema = z.object({
  weddingDate: WeddingDateSchema,
  ceremonyVenue: VenueSchema,
  receptionVenue: VenueSchema.extend({
    sameAsCeremony: z.boolean().default(true),
  }).optional(),
  guestCountEstimated: GuestCountSchema,
  weddingStyle: WeddingStyleSchema,
});

// Partial schema for auto-save functionality
export const PartialWeddingBasicsSchema = WeddingBasicsSchema.partial();

// Individual field validation schemas for real-time validation
export const WeddingBasicsFieldSchemas = {
  weddingDate: WeddingDateSchema,
  ceremonyVenue: VenueSchema,
  receptionVenue: VenueSchema.extend({
    sameAsCeremony: z.boolean().default(true),
  }).optional(),
  guestCountEstimated: GuestCountSchema,
  weddingStyle: WeddingStyleSchema,
};

// Server-side validation schema (more strict)
export const ServerWeddingBasicsSchema = WeddingBasicsSchema.extend({
  // Additional server-side validations
  weddingDate: WeddingDateSchema.refine((date) => {
    // Additional server validation: check against blackout dates, holidays, etc.
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();

    // Warn about Friday/Sunday weddings (most venues prefer Saturday)
    if (dayOfWeek === 5) {
      // Friday
      // This is a warning, not an error
      return true;
    }
    if (dayOfWeek === 0) {
      // Sunday
      // This is a warning, not an error
      return true;
    }

    return true;
  }),

  ceremonyVenue: VenueSchema.refine(
    (venue) => {
      // Validate venue address format
      return venue.address.length >= 10; // Reasonable minimum for full address
    },
    {
      message: 'Please provide a complete venue address',
    },
  ),

  guestCountEstimated: GuestCountSchema.refine((count) => {
    // Business logic validation
    if (count > 300) {
      // Large wedding - ensure they understand implications
      return true; // Just a flag for the frontend to show warnings
    }
    return true;
  }),
});

// API request/response types
export type WeddingBasicsRequest = z.infer<typeof WeddingBasicsSchema>;
export type PartialWeddingBasicsRequest = z.infer<
  typeof PartialWeddingBasicsSchema
>;
export type ServerWeddingBasicsRequest = z.infer<
  typeof ServerWeddingBasicsSchema
>;

// Venue-specific types
export type VenueInfo = z.infer<typeof VenueSchema>;

// Response data structure
export interface WeddingBasicsData {
  weddingDate: string | null;
  ceremonyVenue: VenueInfo | null;
  receptionVenue: (VenueInfo & { sameAsCeremony?: boolean }) | null;
  guestCountEstimated: number | null;
  weddingStyle: string[];
  completionStatus: {
    weddingDate: boolean;
    venue: boolean;
    guestCount: boolean;
    style: boolean;
    overallProgress: number;
  };
}

export interface WeddingBasicsResponse {
  success: boolean;
  data?: WeddingBasicsData;
  coreFieldsUpdated?: string[];
  nextStep?: string;
  recommendations?: {
    venues: any[];
    vendors: any[];
    timeline: any[];
  };
  message?: string;
  errors?: Record<string, string[]>;
  warnings?: Record<string, string[]>;
}

// Validation helpers
export function validateWeddingDate(date: string): string | null {
  try {
    WeddingDateSchema.parse(date);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid wedding date';
    }
    return 'Invalid wedding date format';
  }
}

export function validateGuestCount(count: number): string | null {
  try {
    GuestCountSchema.parse(count);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid guest count';
    }
    return 'Invalid guest count';
  }
}

export function validateVenue(venue: VenueInfo): string | null {
  try {
    VenueSchema.parse(venue);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid venue information';
    }
    return 'Invalid venue information';
  }
}

export function validateWeddingStyles(styles: string[]): string | null {
  try {
    WeddingStyleSchema.parse(styles);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid wedding styles';
    }
    return 'Invalid wedding styles';
  }
}

// Form validation utilities
export function getFieldError(
  errors: z.ZodError,
  fieldPath: string,
): string | undefined {
  const error = errors.errors.find((err) => err.path.join('.') === fieldPath);
  return error?.message;
}

export function formatValidationErrors(
  error: z.ZodError,
): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(err.message);
  });

  return formatted;
}

// Business rule validation
export function getWeddingDateWarnings(date: string): string[] {
  const warnings: string[] = [];

  try {
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();
    const month = selectedDate.getMonth() + 1;

    // Day of week warnings
    if (dayOfWeek === 5) {
      warnings.push('Friday weddings may have limited vendor availability');
    } else if (dayOfWeek === 0) {
      warnings.push(
        'Sunday weddings may have different pricing and availability',
      );
    }

    // Seasonal warnings
    if (month >= 5 && month <= 9) {
      warnings.push(
        'Peak wedding season - book vendors early and expect higher prices',
      );
    }

    if (month === 12 || month === 1) {
      warnings.push(
        'Winter weddings may have weather considerations for outdoor elements',
      );
    }

    // Holiday proximity warnings
    const holidays = [
      { month: 2, day: 14, name: "Valentine's Day" },
      { month: 12, day: 25, name: 'Christmas' },
      { month: 1, day: 1, name: "New Year's Day" },
      { month: 7, day: 4, name: 'Independence Day' },
    ];

    holidays.forEach((holiday) => {
      const holidayDate = new Date(
        selectedDate.getFullYear(),
        holiday.month - 1,
        holiday.day,
      );
      const timeDiff = Math.abs(selectedDate.getTime() - holidayDate.getTime());
      const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      if (dayDiff <= 3) {
        warnings.push(
          `Your wedding is close to ${holiday.name} - consider potential conflicts`,
        );
      }
    });
  } catch (error) {
    // Invalid date, no warnings needed as validation will catch this
  }

  return warnings;
}

export function getGuestCountRecommendations(count: number): string[] {
  const recommendations: string[] = [];

  if (count < 25) {
    recommendations.push(
      'Intimate wedding - consider micro-wedding specialists and smaller venues',
    );
  } else if (count >= 25 && count <= 75) {
    recommendations.push(
      'Medium-sized wedding - good balance of intimacy and celebration',
    );
  } else if (count >= 76 && count <= 150) {
    recommendations.push(
      'Large wedding - ensure venue capacity and book vendors early',
    );
  } else if (count > 150) {
    recommendations.push(
      'Very large wedding - consider venues with extensive facilities and experienced staff',
    );
  }

  if (count > 200) {
    recommendations.push(
      'Large guest count may require additional coordination and planning time',
    );
  }

  return recommendations;
}
