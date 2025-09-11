import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { GuestProfile } from './guest-segmentation-service';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * WS-155: Personalization Service
 * Replace message tokens with personalized guest data for targeted communications
 */

export interface PersonalizationToken {
  token: string;
  description: string;
  category: 'guest' | 'couple' | 'event' | 'custom';
  data_path: string; // JSON path to the data
  fallback_value?: string;
  format_function?: string; // Name of formatting function
}

export interface PersonalizedMessage {
  original_content: string;
  personalized_content: string;
  tokens_replaced: Array<{
    token: string;
    original_value: string;
    replaced_value: string;
  }>;
  personalization_score: number; // 0-100 based on how many tokens were successfully replaced
  errors: Array<{
    token: string;
    error: string;
  }>;
}

export interface PersonalizationContext {
  guest: GuestProfile;
  couple: {
    id: string;
    bride_name?: string;
    groom_name?: string;
    partner1_name?: string;
    partner2_name?: string;
    wedding_date?: Date;
    venue_name?: string;
    venue_address?: string;
    website_url?: string;
    contact_email?: string;
    contact_phone?: string;
  };
  event?: {
    name?: string;
    date?: Date;
    time?: string;
    location?: string;
    dress_code?: string;
    special_instructions?: string;
  };
  custom_data?: Record<string, any>;
}

export class PersonalizationService {
  private static instance: PersonalizationService;
  private tokenRegistry: Map<string, PersonalizationToken> = new Map();

  static getInstance(): PersonalizationService {
    if (!PersonalizationService.instance) {
      PersonalizationService.instance = new PersonalizationService();
      PersonalizationService.instance.initializeDefaultTokens();
    }
    return PersonalizationService.instance;
  }

  /**
   * Initialize default personalization tokens
   */
  private initializeDefaultTokens(): void {
    const defaultTokens: PersonalizationToken[] = [
      // Guest tokens
      {
        token: 'guest.firstName',
        description: 'Guest first name',
        category: 'guest',
        data_path: 'guest.first_name',
        fallback_value: 'Guest',
      },
      {
        token: 'guest.lastName',
        description: 'Guest last name',
        category: 'guest',
        data_path: 'guest.last_name',
        fallback_value: '',
      },
      {
        token: 'guest.fullName',
        description: 'Guest full name',
        category: 'guest',
        data_path: 'guest',
        format_function: 'formatFullName',
        fallback_value: 'Guest',
      },
      {
        token: 'guest.email',
        description: 'Guest email address',
        category: 'guest',
        data_path: 'guest.email',
        fallback_value: '',
      },
      {
        token: 'guest.phone',
        description: 'Guest phone number',
        category: 'guest',
        data_path: 'guest.phone',
        fallback_value: '',
      },
      {
        token: 'guest.relationship',
        description: 'Relationship to couple',
        category: 'guest',
        data_path: 'guest.relationship_to_couple',
        fallback_value: 'friend',
      },
      {
        token: 'guest.plusOne',
        description: 'Plus one name',
        category: 'guest',
        data_path: 'guest.plus_one_name',
        fallback_value: '',
      },
      {
        token: 'guest.householdName',
        description: 'Household name',
        category: 'guest',
        data_path: 'guest.household_info.name',
        fallback_value: '',
      },

      // Couple tokens
      {
        token: 'couple.brideName',
        description: 'Bride name',
        category: 'couple',
        data_path: 'couple.bride_name',
        fallback_value: 'Bride',
      },
      {
        token: 'couple.groomName',
        description: 'Groom name',
        category: 'couple',
        data_path: 'couple.groom_name',
        fallback_value: 'Groom',
      },
      {
        token: 'couple.partner1Name',
        description: 'Partner 1 name',
        category: 'couple',
        data_path: 'couple.partner1_name',
        fallback_value: 'Partner',
      },
      {
        token: 'couple.partner2Name',
        description: 'Partner 2 name',
        category: 'couple',
        data_path: 'couple.partner2_name',
        fallback_value: 'Partner',
      },
      {
        token: 'couple.names',
        description: 'Couple names',
        category: 'couple',
        data_path: 'couple',
        format_function: 'formatCoupleNames',
        fallback_value: 'The Couple',
      },
      {
        token: 'couple.firstName',
        description: 'First couple name',
        category: 'couple',
        data_path: 'couple',
        format_function: 'formatFirstCoupleName',
        fallback_value: 'Couple',
      },

      // Event tokens
      {
        token: 'event.weddingDate',
        description: 'Wedding date',
        category: 'event',
        data_path: 'couple.wedding_date',
        format_function: 'formatDate',
        fallback_value: 'the wedding date',
      },
      {
        token: 'event.weddingDateShort',
        description: 'Wedding date (short)',
        category: 'event',
        data_path: 'couple.wedding_date',
        format_function: 'formatDateShort',
        fallback_value: 'TBD',
      },
      {
        token: 'event.venueName',
        description: 'Venue name',
        category: 'event',
        data_path: 'couple.venue_name',
        fallback_value: 'the venue',
      },
      {
        token: 'event.venueAddress',
        description: 'Venue address',
        category: 'event',
        data_path: 'couple.venue_address',
        fallback_value: '',
      },
      {
        token: 'event.time',
        description: 'Event time',
        category: 'event',
        data_path: 'event.time',
        fallback_value: 'TBD',
      },
      {
        token: 'event.dressCode',
        description: 'Dress code',
        category: 'event',
        data_path: 'event.dress_code',
        fallback_value: '',
      },

      // Contact tokens
      {
        token: 'contact.email',
        description: 'Couple contact email',
        category: 'couple',
        data_path: 'couple.contact_email',
        fallback_value: '',
      },
      {
        token: 'contact.phone',
        description: 'Couple contact phone',
        category: 'couple',
        data_path: 'couple.contact_phone',
        fallback_value: '',
      },
      {
        token: 'contact.website',
        description: 'Wedding website',
        category: 'couple',
        data_path: 'couple.website_url',
        fallback_value: '',
      },

      // RSVP tokens
      {
        token: 'rsvp.status',
        description: 'Guest RSVP status',
        category: 'guest',
        data_path: 'guest.rsvp_status',
        fallback_value: 'pending',
      },
      {
        token: 'rsvp.attendanceType',
        description: 'Attendance type',
        category: 'guest',
        data_path: 'guest.attendance_type',
        fallback_value: 'both',
      },

      // Location tokens
      {
        token: 'guest.city',
        description: 'Guest city',
        category: 'guest',
        data_path: 'guest.location.city',
        fallback_value: '',
      },
      {
        token: 'guest.state',
        description: 'Guest state',
        category: 'guest',
        data_path: 'guest.location.state',
        fallback_value: '',
      },
    ];

    defaultTokens.forEach((token) => {
      this.tokenRegistry.set(token.token, token);
    });
  }

  /**
   * Personalize message content with guest data
   */
  async personalizeMessage(
    content: string,
    guestId: string,
    coupleId: string,
    options?: {
      event_data?: any;
      custom_data?: Record<string, any>;
      preserve_unknown_tokens?: boolean;
    },
  ): Promise<PersonalizedMessage> {
    try {
      // Get personalization context
      const context = await this.buildPersonalizationContext(
        guestId,
        coupleId,
        options,
      );

      // Find all tokens in content
      const tokenMatches = this.findTokensInContent(content);

      let personalizedContent = content;
      const tokensReplaced: Array<{
        token: string;
        original_value: string;
        replaced_value: string;
      }> = [];
      const errors: Array<{ token: string; error: string }> = [];

      // Replace each token
      for (const match of tokenMatches) {
        const { token, placeholder } = match;

        try {
          const replacementValue = await this.resolveToken(token, context);

          if (replacementValue !== null) {
            personalizedContent = personalizedContent.replace(
              placeholder,
              replacementValue,
            );
            tokensReplaced.push({
              token,
              original_value: placeholder,
              replaced_value: replacementValue,
            });
          } else if (!options?.preserve_unknown_tokens) {
            // Remove unknown tokens if not preserving them
            personalizedContent = personalizedContent.replace(placeholder, '');
            errors.push({
              token,
              error: 'Token not found or data unavailable',
            });
          }
        } catch (error) {
          errors.push({
            token,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Calculate personalization score
      const totalTokens = tokenMatches.length;
      const successfulReplacements = tokensReplaced.length;
      const personalizationScore =
        totalTokens > 0 ? (successfulReplacements / totalTokens) * 100 : 100;

      return {
        original_content: content,
        personalized_content: personalizedContent,
        tokens_replaced: tokensReplaced,
        personalization_score: Math.round(personalizationScore),
        errors,
      };
    } catch (error) {
      console.error('Error personalizing message:', error);
      throw error;
    }
  }

  /**
   * Personalize message for multiple guests (batch processing)
   */
  async personalizeMessageBatch(
    content: string,
    guestIds: string[],
    coupleId: string,
    options?: {
      event_data?: any;
      custom_data?: Record<string, any>;
      preserve_unknown_tokens?: boolean;
    },
  ): Promise<Map<string, PersonalizedMessage>> {
    const results = new Map<string, PersonalizedMessage>();

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < guestIds.length; i += batchSize) {
      const batch = guestIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (guestId) => {
        try {
          const result = await this.personalizeMessage(
            content,
            guestId,
            coupleId,
            options,
          );
          return { guestId, result };
        } catch (error) {
          console.error(`Error personalizing for guest ${guestId}:`, error);
          return {
            guestId,
            result: {
              original_content: content,
              personalized_content: content,
              tokens_replaced: [],
              personalization_score: 0,
              errors: [
                { token: 'system', error: 'Failed to personalize message' },
              ],
            },
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ guestId, result }) => {
        results.set(guestId, result);
      });
    }

    return results;
  }

  /**
   * Build personalization context for a guest
   */
  private async buildPersonalizationContext(
    guestId: string,
    coupleId: string,
    options?: {
      event_data?: any;
      custom_data?: Record<string, any>;
    },
  ): Promise<PersonalizationContext> {
    // Get guest data
    const { data: guestData, error: guestError } = await supabase
      .from('guests')
      .select(
        `
        *,
        households (
          name,
          total_members,
          adults,
          children,
          address
        ),
        guest_rsvp_status (
          status,
          attendance_type
        )
      `,
      )
      .eq('id', guestId)
      .single();

    if (guestError || !guestData) {
      throw new Error(`Guest not found: ${guestId}`);
    }

    // Get couple data
    const { data: coupleData, error: coupleError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', coupleId)
      .single();

    if (coupleError || !coupleData) {
      throw new Error(`Couple not found: ${coupleId}`);
    }

    // Build guest profile
    const guest: GuestProfile = {
      id: guestData.id,
      couple_id: guestData.couple_id,
      household_id: guestData.household_id,
      first_name: guestData.first_name,
      last_name: guestData.last_name,
      email: guestData.email,
      phone: guestData.phone,
      relationship_to_couple: guestData.relationship_to_couple,
      plus_one_name: guestData.plus_one_name,
      rsvp_status: guestData.guest_rsvp_status?.[0]?.status,
      attendance_type: guestData.guest_rsvp_status?.[0]?.attendance_type,
      location: guestData.households?.address
        ? {
            city: guestData.households.address.city,
            state: guestData.households.address.state,
            country: guestData.households.address.country,
            postal_code: guestData.households.address.postal_code,
          }
        : undefined,
      household_info: guestData.households
        ? {
            name: guestData.households.name,
            total_members: guestData.households.total_members,
            adults: guestData.households.adults,
            children: guestData.households.children,
          }
        : undefined,
    };

    // Build couple data
    const couple = {
      id: coupleData.id,
      bride_name: coupleData.bride_name,
      groom_name: coupleData.groom_name,
      partner1_name: coupleData.partner1_name,
      partner2_name: coupleData.partner2_name,
      wedding_date: coupleData.wedding_date
        ? new Date(coupleData.wedding_date)
        : undefined,
      venue_name: coupleData.venue_name,
      venue_address: coupleData.venue_address,
      website_url: coupleData.website_url,
      contact_email: coupleData.contact_email,
      contact_phone: coupleData.contact_phone,
    };

    return {
      guest,
      couple,
      event: options?.event_data,
      custom_data: options?.custom_data,
    };
  }

  /**
   * Find all tokens in content
   */
  private findTokensInContent(
    content: string,
  ): Array<{ token: string; placeholder: string }> {
    // Match tokens in format {{token.name}} or {token.name}
    const tokenRegex = /\{\{?([^}]+)\}\}?/g;
    const matches: Array<{ token: string; placeholder: string }> = [];
    let match;

    while ((match = tokenRegex.exec(content)) !== null) {
      matches.push({
        token: match[1].trim(),
        placeholder: match[0],
      });
    }

    return matches;
  }

  /**
   * Resolve a token to its value
   */
  private async resolveToken(
    token: string,
    context: PersonalizationContext,
  ): Promise<string | null> {
    const tokenDefinition = this.tokenRegistry.get(token);

    if (!tokenDefinition) {
      // Try to resolve custom token
      return this.resolveCustomToken(token, context);
    }

    try {
      // Get value from data path
      const value = this.getValueFromPath(context, tokenDefinition.data_path);

      if (value === null || value === undefined || value === '') {
        return tokenDefinition.fallback_value || null;
      }

      // Apply formatting function if specified
      if (tokenDefinition.format_function) {
        return this.applyFormatFunction(
          tokenDefinition.format_function,
          value,
          context,
        );
      }

      return String(value);
    } catch (error) {
      console.error(`Error resolving token ${token}:`, error);
      return tokenDefinition.fallback_value || null;
    }
  }

  /**
   * Get value from JSON path
   */
  private getValueFromPath(context: PersonalizationContext, path: string): any {
    const parts = path.split('.');
    let current: any = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Apply formatting function
   */
  private applyFormatFunction(
    functionName: string,
    value: any,
    context: PersonalizationContext,
  ): string {
    switch (functionName) {
      case 'formatFullName':
        return `${value.first_name || ''} ${value.last_name || ''}`.trim();

      case 'formatCoupleNames':
        const names = [];
        if (value.bride_name) names.push(value.bride_name);
        if (value.groom_name) names.push(value.groom_name);
        if (value.partner1_name) names.push(value.partner1_name);
        if (value.partner2_name) names.push(value.partner2_name);
        return names.length > 0 ? names.join(' & ') : 'The Couple';

      case 'formatFirstCoupleName':
        return (
          value.bride_name ||
          value.partner1_name ||
          value.groom_name ||
          'Couple'
        );

      case 'formatDate':
        if (value instanceof Date) {
          return value.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
        return String(value);

      case 'formatDateShort':
        if (value instanceof Date) {
          return value.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        }
        return String(value);

      default:
        return String(value);
    }
  }

  /**
   * Resolve custom token from custom_data
   */
  private resolveCustomToken(
    token: string,
    context: PersonalizationContext,
  ): string | null {
    if (!context.custom_data) return null;

    // Handle nested custom data
    const parts = token.split('.');
    let current: any = context.custom_data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }
      current = current[part];
    }

    return current ? String(current) : null;
  }

  /**
   * Register custom token
   */
  registerCustomToken(token: PersonalizationToken): void {
    this.tokenRegistry.set(token.token, token);
  }

  /**
   * Get all available tokens
   */
  getAvailableTokens(): PersonalizationToken[] {
    return Array.from(this.tokenRegistry.values());
  }

  /**
   * Get tokens by category
   */
  getTokensByCategory(
    category: PersonalizationToken['category'],
  ): PersonalizationToken[] {
    return Array.from(this.tokenRegistry.values()).filter(
      (token) => token.category === category,
    );
  }

  /**
   * Validate message template
   */
  validateTemplate(template: string): {
    isValid: boolean;
    tokens_found: string[];
    invalid_tokens: string[];
    suggestions: string[];
  } {
    const tokenMatches = this.findTokensInContent(template);
    const tokensFound = tokenMatches.map((m) => m.token);
    const invalidTokens = tokensFound.filter(
      (token) => !this.tokenRegistry.has(token),
    );

    // Suggest similar tokens for invalid ones
    const suggestions: string[] = [];
    invalidTokens.forEach((invalid) => {
      const suggestion = this.findSimilarToken(invalid);
      if (suggestion) {
        suggestions.push(`${invalid} -> ${suggestion}`);
      }
    });

    return {
      isValid: invalidTokens.length === 0,
      tokens_found: tokensFound,
      invalid_tokens: invalidTokens,
      suggestions,
    };
  }

  /**
   * Find similar token for typos
   */
  private findSimilarToken(token: string): string | null {
    const availableTokens = Array.from(this.tokenRegistry.keys());

    // Simple similarity check - could be enhanced with proper string similarity algorithms
    for (const availableToken of availableTokens) {
      if (
        this.calculateSimilarity(
          token.toLowerCase(),
          availableToken.toLowerCase(),
        ) > 0.7
      ) {
        return availableToken;
      }
    }

    return null;
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Preview personalization for testing
   */
  async previewPersonalization(
    template: string,
    coupleId: string,
    sampleSize: number = 3,
  ): Promise<
    Array<{
      guest_name: string;
      personalized_message: PersonalizedMessage;
    }>
  > {
    try {
      // Get sample guests
      const { data: sampleGuests, error } = await supabase
        .from('guests')
        .select('id, first_name, last_name')
        .eq('couple_id', coupleId)
        .limit(sampleSize);

      if (error || !sampleGuests) throw error;

      const previews = [];

      for (const guest of sampleGuests) {
        const personalizedMessage = await this.personalizeMessage(
          template,
          guest.id,
          coupleId,
        );

        previews.push({
          guest_name: `${guest.first_name} ${guest.last_name}`,
          personalized_message: personalizedMessage,
        });
      }

      return previews;
    } catch (error) {
      console.error('Error creating personalization preview:', error);
      throw error;
    }
  }
}

export const personalizationService = PersonalizationService.getInstance();
