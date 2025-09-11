import Handlebars from 'handlebars';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
);

// Client data validation schemas
const WeddingClientSchema = z.object({
  id: z.string(),
  partner1_name: z.string(),
  partner2_name: z.string(),
  wedding_date: z.string().datetime(),
  guest_count: z.number().optional(),
  ceremony_time: z.string().optional(),
  photography_style: z.string().optional(),
  budget: z.number().optional(),
  venue: z
    .object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
      venue_type: z.string(),
    })
    .optional(),
  contact_email: z.string().email(),
  contact_phone: z.string().optional(),
  timeline: z
    .array(
      z.object({
        time: z.string(),
        event: z.string(),
        location: z.string().optional(),
      }),
    )
    .optional(),
  preferences: z.record(z.any()).optional(),
  package_type: z.string().optional(),
  additional_services: z.array(z.string()).optional(),
});

type WeddingClient = z.infer<typeof WeddingClientSchema>;

// Vendor-specific template contexts
const VendorContextSchema = z.object({
  vendor_type: z.enum([
    'photography',
    'videography',
    'catering',
    'floristry',
    'venue',
    'planning',
    'music',
    'transport',
  ]),
  business_name: z.string(),
  contact_person: z.string(),
  services: z.array(z.string()),
  packages: z
    .array(
      z.object({
        name: z.string(),
        price: z.number(),
        description: z.string(),
      }),
    )
    .optional(),
  availability: z.record(z.boolean()).optional(),
  specialties: z.array(z.string()).optional(),
});

type VendorContext = z.infer<typeof VendorContextSchema>;

// Wedding-specific merge tags with comprehensive mappings
const WEDDING_MERGE_TAGS = {
  // Basic couple information
  '{{couple_names}}': (client: WeddingClient) =>
    `${client.partner1_name} & ${client.partner2_name}`,
  '{{partner1_name}}': (client: WeddingClient) => client.partner1_name,
  '{{partner2_name}}': (client: WeddingClient) => client.partner2_name,
  '{{couple_first_names}}': (client: WeddingClient) => {
    const name1 = client.partner1_name.split(' ')[0];
    const name2 = client.partner2_name.split(' ')[0];
    return `${name1} & ${name2}`;
  },

  // Wedding date and timing
  '{{wedding_date}}': (client: WeddingClient) =>
    formatWeddingDate(client.wedding_date),
  '{{wedding_date_long}}': (client: WeddingClient) =>
    formatWeddingDateLong(client.wedding_date),
  '{{wedding_date_short}}': (client: WeddingClient) =>
    formatWeddingDateShort(client.wedding_date),
  '{{wedding_year}}': (client: WeddingClient) =>
    new Date(client.wedding_date).getFullYear().toString(),
  '{{wedding_month}}': (client: WeddingClient) =>
    new Date(client.wedding_date).toLocaleString('default', { month: 'long' }),
  '{{wedding_day}}': (client: WeddingClient) =>
    new Date(client.wedding_date).toLocaleString('default', {
      weekday: 'long',
    }),
  '{{ceremony_time}}': (client: WeddingClient) =>
    client.ceremony_time || 'your ceremony time',

  // Venue information
  '{{venue_name}}': (client: WeddingClient) =>
    client.venue?.name || 'your venue',
  '{{venue_address}}': (client: WeddingClient) =>
    client.venue?.address || 'your venue location',
  '{{venue_type}}': (client: WeddingClient) =>
    client.venue?.venue_type || 'venue',

  // Guest and celebration details
  '{{guest_count}}': (client: WeddingClient) =>
    client.guest_count?.toString() || 'your guests',
  '{{photography_style}}': (client: WeddingClient) =>
    client.photography_style || 'classic',
  '{{budget}}': (client: WeddingClient) =>
    client.budget ? `£${client.budget.toLocaleString()}` : 'your budget',
  '{{package_type}}': (client: WeddingClient) =>
    client.package_type || 'wedding package',

  // Contact information
  '{{contact_email}}': (client: WeddingClient) => client.contact_email,
  '{{contact_phone}}': (client: WeddingClient) =>
    client.contact_phone || 'your contact number',

  // Dynamic timing calculations
  '{{days_until_wedding}}': (client: WeddingClient) =>
    calculateDaysUntil(client.wedding_date),
  '{{weeks_until_wedding}}': (client: WeddingClient) =>
    Math.ceil(calculateDaysUntil(client.wedding_date) / 7).toString(),
  '{{months_until_wedding}}': (client: WeddingClient) =>
    Math.ceil(calculateDaysUntil(client.wedding_date) / 30).toString(),

  // Contextual content
  '{{season_comment}}': (client: WeddingClient) =>
    getSeasonComment(client.wedding_date),
  '{{venue_specific_note}}': (client: WeddingClient) =>
    getVenueNote(client.venue),
  '{{guest_size_comment}}': (client: WeddingClient) =>
    getGuestSizeComment(client.guest_count),
  '{{timeline_highlight}}': (client: WeddingClient) =>
    getTimelineHighlight(client.timeline),

  // Urgency and engagement
  '{{urgency_level}}': (client: WeddingClient) =>
    getUrgencyLevel(client.wedding_date),
  '{{engagement_period}}': (client: WeddingClient) =>
    getEngagementPeriod(client.wedding_date),
  '{{planning_stage}}': (client: WeddingClient) =>
    getPlanningStage(client.wedding_date),

  // Personalization helpers
  '{{preferred_style}}': (client: WeddingClient) =>
    client.preferences?.style || client.photography_style || 'elegant',
  '{{special_requests}}': (client: WeddingClient) =>
    formatSpecialRequests(client.preferences),
  '{{additional_services}}': (client: WeddingClient) =>
    client.additional_services?.join(', ') || 'standard services',
} as const;

// Vendor-specific merge tags
const VENDOR_MERGE_TAGS = {
  '{{business_name}}': (vendor: VendorContext) => vendor.business_name,
  '{{contact_person}}': (vendor: VendorContext) => vendor.contact_person,
  '{{vendor_type}}': (vendor: VendorContext) => vendor.vendor_type,
  '{{services_list}}': (vendor: VendorContext) => vendor.services.join(', '),
  '{{specialties}}': (vendor: VendorContext) =>
    vendor.specialties?.join(', ') || '',
  '{{package_options}}': (vendor: VendorContext) =>
    formatPackageOptions(vendor.packages),
} as const;

// Conditional logic helpers
const CONDITIONAL_HELPERS = {
  '{{#if_luxury}}': (client: WeddingClient) =>
    (client.budget && client.budget > 30000) ||
    client.package_type?.toLowerCase().includes('luxury'),
  '{{#if_intimate}}': (client: WeddingClient) =>
    client.guest_count && client.guest_count <= 50,
  '{{#if_large_wedding}}': (client: WeddingClient) =>
    client.guest_count && client.guest_count > 150,
  '{{#if_destination}}': (client: WeddingClient) =>
    client.venue?.venue_type?.toLowerCase().includes('destination'),
  '{{#if_outdoor}}': (client: WeddingClient) =>
    client.venue?.venue_type?.toLowerCase().includes('outdoor') ||
    client.venue?.venue_type?.toLowerCase().includes('garden'),
  '{{#if_spring}}': (client: WeddingClient) => isSpring(client.wedding_date),
  '{{#if_summer}}': (client: WeddingClient) => isSummer(client.wedding_date),
  '{{#if_autumn}}': (client: WeddingClient) => isAutumn(client.wedding_date),
  '{{#if_winter}}': (client: WeddingClient) => isWinter(client.wedding_date),
  '{{#if_weekend}}': (client: WeddingClient) => isWeekend(client.wedding_date),
  '{{#if_urgent}}': (client: WeddingClient) =>
    calculateDaysUntil(client.wedding_date) <= 90,
} as const;

export class MergeTagProcessor {
  private handlebars: typeof Handlebars;
  private templateCache = new Map<string, HandlebarsTemplateDelegate<any>>();
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds
  private readonly MAX_CACHE_SIZE = 1000;
  private cacheTimestamps = new Map<string, number>();

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerCustomHelpers();
    this.setupCacheCleanup();
  }

  private registerCustomHelpers(): void {
    // Date formatting helpers
    this.handlebars.registerHelper(
      'formatDate',
      (date: string, format: string) => {
        return this.formatDateWithFormat(date, format);
      },
    );

    // Conditional helpers
    this.handlebars.registerHelper(
      'if_luxury',
      function (this: any, options: any) {
        const client = this as WeddingClient;
        return CONDITIONAL_HELPERS['{{#if_luxury}}'](client)
          ? options.fn(this)
          : options.inverse(this);
      },
    );

    this.handlebars.registerHelper(
      'if_intimate',
      function (this: any, options: any) {
        const client = this as WeddingClient;
        return CONDITIONAL_HELPERS['{{#if_intimate}}'](client)
          ? options.fn(this)
          : options.inverse(this);
      },
    );

    this.handlebars.registerHelper(
      'if_large_wedding',
      function (this: any, options: any) {
        const client = this as WeddingClient;
        return CONDITIONAL_HELPERS['{{#if_large_wedding}}'](client)
          ? options.fn(this)
          : options.inverse(this);
      },
    );

    this.handlebars.registerHelper(
      'if_urgent',
      function (this: any, options: any) {
        const client = this as WeddingClient;
        return CONDITIONAL_HELPERS['{{#if_urgent}}'](client)
          ? options.fn(this)
          : options.inverse(this);
      },
    );

    this.handlebars.registerHelper(
      'if_season',
      function (this: any, season: string, options: any) {
        const client = this as WeddingClient;
        const isCorrectSeason = this.checkSeason(client.wedding_date, season);
        return isCorrectSeason ? options.fn(this) : options.inverse(this);
      },
    );

    // Mathematical helpers
    this.handlebars.registerHelper('add', (a: number, b: number) => a + b);
    this.handlebars.registerHelper('subtract', (a: number, b: number) => a - b);
    this.handlebars.registerHelper('multiply', (a: number, b: number) => a * b);
    this.handlebars.registerHelper('divide', (a: number, b: number) =>
      b !== 0 ? a / b : 0,
    );

    // String helpers
    this.handlebars.registerHelper('capitalize', (str: string) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '',
    );

    this.handlebars.registerHelper(
      'uppercase',
      (str: string) => str?.toUpperCase() || '',
    );
    this.handlebars.registerHelper(
      'lowercase',
      (str: string) => str?.toLowerCase() || '',
    );

    // List helpers
    this.handlebars.registerHelper(
      'join',
      (array: string[], separator: string = ', ') =>
        Array.isArray(array) ? array.join(separator) : '',
    );

    // Fallback helper for undefined values
    this.handlebars.registerHelper('default', (value: any, fallback: any) =>
      value !== null && value !== undefined && value !== '' ? value : fallback,
    );

    // Wedding-specific helpers
    this.handlebars.registerHelper('days_until', (date: string) =>
      calculateDaysUntil(date),
    );
    this.handlebars.registerHelper('season_comment', (date: string) =>
      getSeasonComment(date),
    );
    this.handlebars.registerHelper('planning_stage', (date: string) =>
      getPlanningStage(date),
    );
  }

  private checkSeason(date: string, season: string): boolean {
    switch (season.toLowerCase()) {
      case 'spring':
        return isSpring(date);
      case 'summer':
        return isSummer(date);
      case 'autumn':
      case 'fall':
        return isAutumn(date);
      case 'winter':
        return isWinter(date);
      default:
        return false;
    }
  }

  private formatDateWithFormat(date: string, format: string): string {
    const dateObj = new Date(date);
    switch (format) {
      case 'long':
        return dateObj.toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'short':
        return dateObj.toLocaleDateString('en-GB', {
          year: '2-digit',
          month: 'short',
          day: 'numeric',
        });
      case 'month-year':
        return dateObj.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'long',
        });
      default:
        return formatWeddingDate(date);
    }
  }

  async processTemplate(
    templateContent: string,
    clientData: WeddingClient,
    vendorContext?: VendorContext,
    options: {
      useCache?: boolean;
      templateId?: string;
      customTags?: Record<
        string,
        (client: WeddingClient, vendor?: VendorContext) => string
      >;
    } = {},
  ): Promise<{
    processedContent: string;
    mergeTagsUsed: string[];
    processingTime: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    const mergeTagsUsed: string[] = [];

    try {
      // Validate input data
      const clientValidation = WeddingClientSchema.safeParse(clientData);
      if (!clientValidation.success) {
        errors.push(`Invalid client data: ${clientValidation.error.message}`);
        return {
          processedContent: templateContent,
          mergeTagsUsed: [],
          processingTime: Date.now() - startTime,
          errors,
        };
      }

      if (vendorContext) {
        const vendorValidation = VendorContextSchema.safeParse(vendorContext);
        if (!vendorValidation.success) {
          errors.push(
            `Invalid vendor context: ${vendorValidation.error.message}`,
          );
        }
      }

      // Create cache key
      const cacheKey =
        options.templateId || this.generateCacheKey(templateContent);

      // Check cache if enabled
      let template: HandlebarsTemplateDelegate<any>;
      if (
        options.useCache &&
        this.templateCache.has(cacheKey) &&
        this.isCacheValid(cacheKey)
      ) {
        template = this.templateCache.get(cacheKey)!;
      } else {
        // Compile template
        try {
          template = this.handlebars.compile(templateContent);

          // Cache compiled template
          if (options.useCache) {
            this.cacheTemplate(cacheKey, template);
          }
        } catch (compileError: any) {
          errors.push(`Template compilation error: ${compileError.message}`);
          return {
            processedContent: templateContent,
            mergeTagsUsed: [],
            processingTime: Date.now() - startTime,
            errors,
          };
        }
      }

      // Prepare template context
      const context = this.prepareTemplateContext(
        clientData,
        vendorContext,
        options.customTags,
      );

      // Detect merge tags used in template
      const detectedTags = this.detectMergeTags(templateContent);
      mergeTagsUsed.push(...detectedTags);

      // Process template
      let processedContent: string;
      try {
        processedContent = template(context);
      } catch (renderError: any) {
        errors.push(`Template rendering error: ${renderError.message}`);
        return {
          processedContent: templateContent,
          mergeTagsUsed,
          processingTime: Date.now() - startTime,
          errors,
        };
      }

      // Post-processing: handle any remaining unprocessed tags
      processedContent = this.handleFallbackTags(processedContent, context);

      // Validate output (ensure no script injection, etc.)
      processedContent = this.sanitizeOutput(processedContent);

      return {
        processedContent,
        mergeTagsUsed,
        processingTime: Date.now() - startTime,
        errors,
      };
    } catch (error: any) {
      errors.push(`Processing error: ${error.message}`);
      return {
        processedContent: templateContent,
        mergeTagsUsed,
        processingTime: Date.now() - startTime,
        errors,
      };
    }
  }

  private prepareTemplateContext(
    clientData: WeddingClient,
    vendorContext?: VendorContext,
    customTags?: Record<
      string,
      (client: WeddingClient, vendor?: VendorContext) => string
    >,
  ): any {
    const context = { ...clientData };

    // Apply wedding merge tags
    for (const [tag, processor] of Object.entries(WEDDING_MERGE_TAGS)) {
      const key = tag.replace(/[{}]/g, '');
      try {
        context[key] = processor(clientData);
      } catch (error) {
        console.warn(`Error processing wedding tag ${tag}:`, error);
        context[key] = `[${key}]`; // Fallback value
      }
    }

    // Apply vendor merge tags if context provided
    if (vendorContext) {
      for (const [tag, processor] of Object.entries(VENDOR_MERGE_TAGS)) {
        const key = tag.replace(/[{}]/g, '');
        try {
          context[key] = processor(vendorContext);
        } catch (error) {
          console.warn(`Error processing vendor tag ${tag}:`, error);
          context[key] = `[${key}]`;
        }
      }
    }

    // Apply custom tags if provided
    if (customTags) {
      for (const [tag, processor] of Object.entries(customTags)) {
        const key = tag.replace(/[{}]/g, '');
        try {
          context[key] = processor(clientData, vendorContext);
        } catch (error) {
          console.warn(`Error processing custom tag ${tag}:`, error);
          context[key] = `[${key}]`;
        }
      }
    }

    return context;
  }

  private detectMergeTags(templateContent: string): string[] {
    const tagRegex = /{{[\s]*([^}]+)[\s]*}}/g;
    const tags: string[] = [];
    let match;

    while ((match = tagRegex.exec(templateContent)) !== null) {
      const tag = match[1].trim();
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }

    return tags;
  }

  private handleFallbackTags(content: string, context: any): string {
    // Replace any remaining unprocessed tags with fallback values
    return content.replace(/{{[\s]*([^}]+)[\s]*}}/g, (match, tagName) => {
      const cleanTag = tagName.trim();
      if (context[cleanTag] !== undefined) {
        return context[cleanTag];
      }
      // Return a placeholder for unprocessed tags
      return `[${cleanTag}]`;
    });
  }

  private sanitizeOutput(content: string): string {
    // Basic HTML sanitization - remove script tags and javascript: URLs
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }

  private generateCacheKey(templateContent: string): string {
    // Create hash of template content for cache key
    const hash = require('crypto')
      .createHash('sha256')
      .update(templateContent)
      .digest('hex');
    return hash.substring(0, 16);
  }

  private cacheTemplate(
    key: string,
    template: HandlebarsTemplateDelegate<any>,
  ): void {
    // Remove oldest entries if cache is full
    if (this.templateCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.findOldestCacheEntry();
      if (oldestKey) {
        this.templateCache.delete(oldestKey);
        this.cacheTimestamps.delete(oldestKey);
      }
    }

    this.templateCache.set(key, template);
    this.cacheTimestamps.set(key, Date.now());
  }

  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return false;
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  private findOldestCacheEntry(): string | null {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private setupCacheCleanup(): void {
    // Clean expired cache entries every hour
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.cacheTimestamps.entries()) {
        if (now - timestamp > this.CACHE_TTL) {
          this.templateCache.delete(key);
          this.cacheTimestamps.delete(key);
        }
      }
    }, 3600000); // 1 hour
  }

  // Public utility methods

  async getClientData(clientId: string): Promise<WeddingClient | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(
          `
          *,
          venues (
            id,
            name,
            address,
            venue_type
          )
        `,
        )
        .eq('id', clientId)
        .single();

      if (error || !data) return null;

      // Transform data to match WeddingClient schema
      return {
        id: data.id,
        partner1_name: data.partner1_name,
        partner2_name: data.partner2_name,
        wedding_date: data.wedding_date,
        guest_count: data.guest_count,
        ceremony_time: data.ceremony_time,
        photography_style: data.photography_style,
        budget: data.budget,
        venue: data.venues
          ? {
              id: data.venues.id,
              name: data.venues.name,
              address: data.venues.address,
              venue_type: data.venues.venue_type,
            }
          : undefined,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        timeline: data.timeline || [],
        preferences: data.preferences || {},
        package_type: data.package_type,
        additional_services: data.additional_services || [],
      };
    } catch (error) {
      console.error('Error fetching client data:', error);
      return null;
    }
  }

  getAvailableMergeTags(): {
    wedding_tags: string[];
    vendor_tags: string[];
    conditional_helpers: string[];
  } {
    return {
      wedding_tags: Object.keys(WEDDING_MERGE_TAGS),
      vendor_tags: Object.keys(VENDOR_MERGE_TAGS),
      conditional_helpers: Object.keys(CONDITIONAL_HELPERS),
    };
  }

  validateTemplate(templateContent: string): {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];

    try {
      // Try to compile the template
      this.handlebars.compile(templateContent);
    } catch (error: any) {
      errors.push(`Compilation error: ${error.message}`);
      return { isValid: false, errors, suggestions };
    }

    // Check for common issues
    const detectedTags = this.detectMergeTags(templateContent);
    const availableTags = [
      ...Object.keys(WEDDING_MERGE_TAGS),
      ...Object.keys(VENDOR_MERGE_TAGS),
    ].map((tag) => tag.replace(/[{}]/g, ''));

    for (const tag of detectedTags) {
      if (
        !availableTags.includes(tag) &&
        !tag.startsWith('#') &&
        !tag.startsWith('/')
      ) {
        suggestions.push(
          `Unknown merge tag: {{${tag}}}. Did you mean one of: ${availableTags.filter((t) => t.includes(tag.split('_')[0])).join(', ')}?`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
    };
  }

  clearCache(): void {
    this.templateCache.clear();
    this.cacheTimestamps.clear();
  }

  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: Date | null;
  } {
    let oldestTimestamp = Infinity;
    for (const timestamp of this.cacheTimestamps.values()) {
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
      }
    }

    return {
      size: this.templateCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0, // Would need to track hits/misses to calculate
      oldestEntry:
        oldestTimestamp !== Infinity ? new Date(oldestTimestamp) : null,
    };
  }
}

// Utility functions
function formatWeddingDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatWeddingDateLong(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatWeddingDateShort(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

function calculateDaysUntil(weddingDate: string): number {
  const today = new Date();
  const wedding = new Date(weddingDate);
  const diffTime = wedding.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getSeasonComment(weddingDate: string): string {
  const month = new Date(weddingDate).getMonth() + 1; // 1-based month

  if (month >= 3 && month <= 5) {
    return 'Spring is such a beautiful time for a wedding, with all the flowers in bloom!';
  } else if (month >= 6 && month <= 8) {
    return 'Summer weddings are magical - perfect weather for outdoor celebrations!';
  } else if (month >= 9 && month <= 11) {
    return 'Autumn weddings have such romantic charm with the beautiful seasonal colors.';
  } else {
    return 'Winter weddings create such an intimate, cozy atmosphere - truly special!';
  }
}

function getVenueNote(venue?: { name: string; venue_type: string }): string {
  if (!venue) return 'Your chosen venue';

  const venueType = venue.venue_type.toLowerCase();

  if (venueType.includes('church') || venueType.includes('chapel')) {
    return `${venue.name} is a beautiful sacred space for your ceremony.`;
  } else if (venueType.includes('garden') || venueType.includes('outdoor')) {
    return `${venue.name} offers stunning natural beauty for your celebration.`;
  } else if (venueType.includes('barn')) {
    return `${venue.name} provides that perfect rustic charm for your wedding.`;
  } else if (venueType.includes('hotel') || venueType.includes('manor')) {
    return `${venue.name} offers elegant luxury for your special day.`;
  } else {
    return `${venue.name} is the perfect setting for your wedding.`;
  }
}

function getGuestSizeComment(guestCount?: number): string {
  if (!guestCount) return 'your celebration';

  if (guestCount <= 30) {
    return 'intimate celebration';
  } else if (guestCount <= 80) {
    return 'perfectly sized celebration';
  } else if (guestCount <= 150) {
    return 'wonderful celebration';
  } else {
    return 'grand celebration';
  }
}

function getTimelineHighlight(
  timeline?: Array<{ time: string; event: string }>,
): string {
  if (!timeline || timeline.length === 0) return 'your wedding timeline';

  const ceremonyTime = timeline.find((item) =>
    item.event.toLowerCase().includes('ceremony'),
  );

  if (ceremonyTime) {
    return `ceremony at ${ceremonyTime.time}`;
  }

  return 'your planned timeline';
}

function getUrgencyLevel(weddingDate: string): string {
  const daysUntil = calculateDaysUntil(weddingDate);

  if (daysUntil <= 30) {
    return 'urgent';
  } else if (daysUntil <= 90) {
    return 'soon';
  } else if (daysUntil <= 180) {
    return 'approaching';
  } else {
    return 'plenty of time';
  }
}

function getEngagementPeriod(weddingDate: string): string {
  const daysUntil = calculateDaysUntil(weddingDate);
  const months = Math.round(daysUntil / 30);

  if (months <= 6) {
    return 'short engagement';
  } else if (months <= 12) {
    return 'standard engagement';
  } else {
    return 'long engagement';
  }
}

function getPlanningStage(weddingDate: string): string {
  const daysUntil = calculateDaysUntil(weddingDate);

  if (daysUntil <= 30) {
    return 'final preparations';
  } else if (daysUntil <= 90) {
    return 'detailed planning';
  } else if (daysUntil <= 180) {
    return 'active planning';
  } else if (daysUntil <= 365) {
    return 'early planning';
  } else {
    return 'initial planning';
  }
}

function formatSpecialRequests(preferences?: Record<string, any>): string {
  if (!preferences) return 'standard arrangements';

  const requests = [];
  if (preferences.dietary) requests.push('dietary requirements');
  if (preferences.accessibility) requests.push('accessibility needs');
  if (preferences.music) requests.push('music preferences');
  if (preferences.photography) requests.push('photography requirements');

  return requests.length > 0 ? requests.join(', ') : 'standard arrangements';
}

function formatPackageOptions(
  packages?: Array<{ name: string; price: number; description: string }>,
): string {
  if (!packages || packages.length === 0) return 'custom packages available';

  return packages.map((pkg) => `${pkg.name} (from £${pkg.price})`).join(', ');
}

// Season detection functions
function isSpring(date: string): boolean {
  const month = new Date(date).getMonth() + 1;
  return month >= 3 && month <= 5;
}

function isSummer(date: string): boolean {
  const month = new Date(date).getMonth() + 1;
  return month >= 6 && month <= 8;
}

function isAutumn(date: string): boolean {
  const month = new Date(date).getMonth() + 1;
  return month >= 9 && month <= 11;
}

function isWinter(date: string): boolean {
  const month = new Date(date).getMonth() + 1;
  return month === 12 || month <= 2;
}

function isWeekend(date: string): boolean {
  const day = new Date(date).getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

export default MergeTagProcessor;
