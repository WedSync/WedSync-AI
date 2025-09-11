import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { z } from 'zod';

// Type definitions
type Guest = Database['public']['Tables']['guests']['Row'];
type GuestInsert = Database['public']['Tables']['guests']['Insert'];
type GuestUpdate = Database['public']['Tables']['guests']['Update'];
type Household = Database['public']['Tables']['households']['Row'];

// Service interfaces
export interface GuestAnalytics {
  total_guests: number;
  attending_count: number;
  declined_count: number;
  pending_count: number;
  maybe_count: number;
  adult_count: number;
  child_count: number;
  plus_one_count: number;
  dietary_restrictions_count: number;
  households_count: number;
  avg_household_size: number;
}

export interface DuplicateDetectionResult {
  guest_id: string;
  guest_name: string;
  email: string | null;
  phone: string | null;
  match_score: number;
  match_reasons: string[];
}

export interface BulkOperationResult {
  successful_count: number;
  failed_count: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value: string;
  }>;
}

export interface HouseholdGroup {
  guests: Guest[];
  suggested_name: string;
  address: any;
  total_members: number;
}

export interface ParsedNameResult {
  guests: Array<{
    first_name: string;
    last_name: string;
    plus_one?: boolean;
    plus_one_name?: string;
  }>;
  household_detected: boolean;
  confidence_score: number;
}

// Guest Service Class
export class GuestService {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  // Household Grouping Algorithms
  async createHouseholdGroups(
    coupleId: string,
    guests: Guest[],
  ): Promise<HouseholdGroup[]> {
    const groups = new Map<string, Guest[]>();

    // Group by last name and address similarity
    for (const guest of guests) {
      const key = this.generateHouseholdKey(guest);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(guest);
    }

    // Convert to household groups with suggested names
    const householdGroups: HouseholdGroup[] = [];
    for (const [key, groupGuests] of groups.entries()) {
      if (groupGuests.length > 1) {
        const suggestedName = this.generateHouseholdName(groupGuests);
        householdGroups.push({
          guests: groupGuests,
          suggested_name: suggestedName,
          address: groupGuests[0].address || {},
          total_members: groupGuests.length,
        });
      }
    }

    return householdGroups;
  }

  private generateHouseholdKey(guest: Guest): string {
    const lastName = guest.last_name.toLowerCase().trim();
    const address = guest.address ? JSON.stringify(guest.address) : '';
    return `${lastName}-${address}`;
  }

  private generateHouseholdName(guests: Guest[]): string {
    if (guests.length === 0) return 'Unknown Household';

    const lastNames = [...new Set(guests.map((g) => g.last_name))];
    const firstNames = guests.map((g) => g.first_name).slice(0, 2);

    if (lastNames.length === 1) {
      return `${firstNames[0]} ${lastNames[0]} Family`;
    } else {
      return `${firstNames.join(' & ')} Household`;
    }
  }

  // Duplicate Detection Logic
  async findDuplicateGuests(
    coupleId: string,
    email?: string,
    firstName?: string,
    lastName?: string,
    phone?: string,
  ): Promise<DuplicateDetectionResult[]> {
    const { data: duplicates } = await this.supabase.rpc(
      'find_duplicate_guests',
      {
        couple_id_param: coupleId,
        email_param: email || null,
        first_name_param: firstName || null,
        last_name_param: lastName || null,
        phone_param: phone || null,
      },
    );

    return duplicates || [];
  }

  // Natural Language Parsing for Quick Add
  parseNaturalLanguageNames(input: string): ParsedNameResult {
    const guests: ParsedNameResult['guests'] = [];
    let householdDetected = false;
    let confidenceScore = 0;

    // Clean and normalize input
    const cleanInput = input.trim().replace(/\s+/g, ' ');

    // Common patterns for natural language guest input
    const patterns = [
      // "John and Jane Smith" or "John & Jane Smith"
      /^([A-Za-z]+)\s+(?:and|&)\s+([A-Za-z]+)\s+([A-Za-z]+)$/i,
      // "Mr. and Mrs. John Smith" or "Mr. & Mrs. Smith"
      /^(?:mr\.?\s+and\s+mrs\.?|mr\.?\s+&\s+mrs\.?)\s+(?:([A-Za-z]+)\s+)?([A-Za-z]+)$/i,
      // "The Smith Family" or "Smith Family"
      /^(?:the\s+)?([A-Za-z]+)\s+family$/i,
      // "John Smith and guest" or "John Smith + 1"
      /^([A-Za-z]+)\s+([A-Za-z]+)\s+(?:and\s+guest|\+\s*1|\+\s*one)$/i,
      // "John Smith" (simple single name)
      /^([A-Za-z]+)\s+([A-Za-z]+)$/i,
      // "John, Jane, and Bob Smith" (multiple first names)
      /^([A-Za-z,\s]+)\s+([A-Za-z]+)$/i,
    ];

    for (const [index, pattern] of patterns.entries()) {
      const match = cleanInput.match(pattern);
      if (match) {
        switch (index) {
          case 0: // "John and Jane Smith"
            guests.push(
              { first_name: match[1], last_name: match[3] },
              { first_name: match[2], last_name: match[3] },
            );
            householdDetected = true;
            confidenceScore = 95;
            break;

          case 1: // "Mr. and Mrs. John Smith"
            if (match[1]) {
              // "Mr. and Mrs. John Smith"
              guests.push(
                { first_name: match[1], last_name: match[2] },
                { first_name: 'Mrs.', last_name: match[2] }, // Will need manual correction
              );
            } else {
              // "Mr. and Mrs. Smith"
              guests.push(
                { first_name: 'Mr.', last_name: match[2] },
                { first_name: 'Mrs.', last_name: match[2] },
              );
            }
            householdDetected = true;
            confidenceScore = 85;
            break;

          case 2: // "Smith Family"
            guests.push({ first_name: 'Family', last_name: match[1] });
            householdDetected = true;
            confidenceScore = 70;
            break;

          case 3: // "John Smith + 1"
            guests.push({
              first_name: match[1],
              last_name: match[2],
              plus_one: true,
            });
            confidenceScore = 90;
            break;

          case 4: // "John Smith" (simple)
            guests.push({ first_name: match[1], last_name: match[2] });
            confidenceScore = 95;
            break;

          case 5: // "John, Jane, and Bob Smith"
            const firstNames = match[1]
              .split(/[,\s]+(?:and\s+)?/)
              .map((name) => name.trim())
              .filter(Boolean);

            for (const firstName of firstNames) {
              guests.push({ first_name: firstName, last_name: match[2] });
            }
            if (firstNames.length > 1) {
              householdDetected = true;
            }
            confidenceScore = 85;
            break;
        }
        break;
      }
    }

    // If no pattern matched, try to extract at least something
    if (guests.length === 0) {
      const words = cleanInput.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        guests.push({
          first_name: words[0],
          last_name: words[words.length - 1],
        });
        confidenceScore = 50;
      }
    }

    return {
      guests,
      household_detected: householdDetected,
      confidence_score: confidenceScore,
    };
  }

  // Bulk Operations with Transaction Handling
  async bulkCreateGuests(
    coupleId: string,
    guestData: GuestInsert[],
    options: {
      duplicateHandling: 'skip' | 'merge' | 'create_anyway';
      createHouseholds: boolean;
      batchSize: number;
    } = {
      duplicateHandling: 'skip',
      createHouseholds: true,
      batchSize: 100,
    },
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      successful_count: 0,
      failed_count: 0,
      errors: [],
    };

    // Process in batches for performance
    const batches = this.createBatches(guestData, options.batchSize);

    for (const [batchIndex, batch] of batches.entries()) {
      try {
        const batchResult = await this.processBatch(
          coupleId,
          batch,
          options,
          batchIndex * options.batchSize,
        );

        result.successful_count += batchResult.successful_count;
        result.failed_count += batchResult.failed_count;
        result.errors.push(...batchResult.errors);
      } catch (error) {
        result.failed_count += batch.length;
        result.errors.push({
          row: batchIndex * options.batchSize,
          field: 'batch_processing',
          message:
            error instanceof Error ? error.message : 'Batch processing failed',
          value: `Batch ${batchIndex + 1}`,
        });
      }
    }

    return result;
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(
    coupleId: string,
    batch: GuestInsert[],
    options: any,
    startIndex: number,
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      successful_count: 0,
      failed_count: 0,
      errors: [],
    };

    // Use transaction for batch consistency
    const { data, error } = await this.supabase.rpc(
      'bulk_insert_guests_with_duplicates',
      {
        couple_id_param: coupleId,
        guest_data: batch,
        duplicate_handling: options.duplicateHandling,
        start_index: startIndex,
      },
    );

    if (error) {
      result.failed_count = batch.length;
      result.errors.push({
        row: startIndex,
        field: 'batch_insert',
        message: error.message,
        value: 'Entire batch failed',
      });
    } else if (data) {
      result.successful_count = data.successful_count || 0;
      result.failed_count = data.failed_count || 0;
      result.errors = data.errors || [];
    }

    return result;
  }

  // Address Normalization and Matching
  normalizeAddress(address: any): any {
    if (!address || typeof address !== 'object') return {};

    const normalized: any = {};

    // Normalize common address fields
    if (address.street || address.address_line_1) {
      normalized.street = (address.street || address.address_line_1)
        .toString()
        .toLowerCase()
        .replace(
          /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd)\b/g,
          (match) => {
            const abbrev: Record<string, string> = {
              street: 'st',
              avenue: 'ave',
              road: 'rd',
              drive: 'dr',
              lane: 'ln',
              court: 'ct',
              boulevard: 'blvd',
            };
            return abbrev[match.toLowerCase()] || match;
          },
        )
        .trim();
    }

    if (address.city) {
      normalized.city = address.city.toString().toLowerCase().trim();
    }

    if (address.state || address.province) {
      normalized.state = (address.state || address.province)
        .toString()
        .toLowerCase()
        .replace(
          /\b(california|ca|new york|ny|texas|tx|florida|fl)\b/g,
          (match) => {
            const abbrev: Record<string, string> = {
              california: 'ca',
              'new york': 'ny',
              texas: 'tx',
              florida: 'fl',
            };
            return abbrev[match.toLowerCase()] || match;
          },
        )
        .trim();
    }

    if (address.zip || address.postal_code || address.zipcode) {
      const zip = (
        address.zip ||
        address.postal_code ||
        address.zipcode
      ).toString();
      normalized.zip = zip.replace(/[^\d-]/g, '').slice(0, 10);
    }

    return normalized;
  }

  // Guest Count Calculations
  async calculateGuestCounts(coupleId: string): Promise<GuestAnalytics> {
    const { data: analytics } = await this.supabase.rpc('get_guest_analytics', {
      couple_id_param: coupleId,
    });

    return (
      analytics?.[0] || {
        total_guests: 0,
        attending_count: 0,
        declined_count: 0,
        pending_count: 0,
        maybe_count: 0,
        adult_count: 0,
        child_count: 0,
        plus_one_count: 0,
        dietary_restrictions_count: 0,
        households_count: 0,
        avg_household_size: 0,
      }
    );
  }

  // Optimized Queries for Large Guest Lists
  async searchGuests(
    coupleId: string,
    filters: {
      search?: string;
      category?: string;
      rsvp_status?: string;
      age_group?: string;
      side?: string;
      has_dietary_restrictions?: boolean;
      has_plus_one?: boolean;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ guests: Guest[]; total: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const offset = (page - 1) * limit;

    // Use the optimized search function
    const { data: guests, error } = await this.supabase.rpc(
      'search_guests_optimized',
      {
        couple_id_param: coupleId,
        search_query: filters.search || null,
        category_filter: filters.category || null,
        rsvp_filter: filters.rsvp_status || null,
        age_group_filter: filters.age_group || null,
        side_filter: filters.side || null,
        has_dietary_restrictions: filters.has_dietary_restrictions ?? null,
        has_plus_one: filters.has_plus_one ?? null,
        page_size: limit,
        page_offset: offset,
      },
    );

    if (error) {
      throw new Error(`Guest search failed: ${error.message}`);
    }

    const total = guests?.[0]?.total_count || 0;
    return {
      guests: guests || [],
      total,
    };
  }

  // Performance validation
  async validatePerformance(
    coupleId: string,
    guestCount: number,
  ): Promise<{
    estimated_time_ms: number;
    recommended_batch_size: number;
    performance_warnings: string[];
  }> {
    const warnings: string[] = [];
    let estimatedTime = 0;
    let batchSize = 100;

    if (guestCount > 500) {
      estimatedTime = Math.ceil(guestCount / 50) * 1000; // ~50 guests per second
      batchSize = 50;
      warnings.push(
        'Large guest list detected. Using smaller batch sizes for optimal performance.',
      );
    } else {
      estimatedTime = Math.ceil(guestCount / 100) * 1000; // ~100 guests per second
    }

    if (guestCount > 1000) {
      warnings.push(
        'Very large guest list. Consider processing in multiple sessions.',
      );
    }

    if (estimatedTime > 10000) {
      warnings.push(
        'Processing may take longer than 10 seconds. Consider reducing batch size.',
      );
    }

    return {
      estimated_time_ms: estimatedTime,
      recommended_batch_size: batchSize,
      performance_warnings: warnings,
    };
  }
}

// Factory function to create service instance
export async function createGuestService(): Promise<GuestService> {
  const supabase = await createClient();
  return new GuestService(supabase);
}

// Utility functions for validation
export const guestValidationSchemas = {
  createGuest: z.object({
    couple_id: z.string().uuid(),
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    address: z.record(z.any()).optional(),
    category: z.enum(['family', 'friends', 'work', 'other']).default('family'),
    side: z.enum(['partner1', 'partner2', 'mutual']).default('mutual'),
    plus_one: z.boolean().default(false),
    plus_one_name: z.string().max(100).optional().nullable(),
    age_group: z.enum(['adult', 'child', 'infant']).default('adult'),
    table_number: z.number().int().positive().optional().nullable(),
    helper_role: z.string().max(50).optional().nullable(),
    dietary_restrictions: z.string().optional().nullable(),
    special_needs: z.string().optional().nullable(),
    rsvp_status: z
      .enum(['pending', 'attending', 'declined', 'maybe'])
      .default('pending'),
    tags: z.array(z.string()).default([]),
    notes: z.string().optional().nullable(),
    household_id: z.string().uuid().optional().nullable(),
  }),

  bulkCreate: z.object({
    couple_id: z.string().uuid(),
    guests: z.array(z.any()).min(1).max(1000),
    duplicate_handling: z
      .enum(['skip', 'merge', 'create_anyway'])
      .default('skip'),
    create_households: z.boolean().default(true),
    batch_size: z.number().int().min(10).max(200).default(100),
  }),

  quickAdd: z.object({
    couple_id: z.string().uuid(),
    name_input: z.string().min(3).max(200),
    default_category: z
      .enum(['family', 'friends', 'work', 'other'])
      .default('family'),
    default_side: z.enum(['partner1', 'partner2', 'mutual']).default('mutual'),
  }),
};
