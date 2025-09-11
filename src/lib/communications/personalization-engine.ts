import { sanitizeString, sanitizeHTML } from '@/lib/security/input-validation';

interface PersonalizationVariables {
  [key: string]: string | number | boolean | null | undefined;
}

interface PersonalizationOptions {
  fallbacks?: { [key: string]: string };
  caseSensitive?: boolean;
  allowHtml?: boolean;
  maxLength?: number;
}

/**
 * PersonalizationEngine handles token replacement and content personalization
 * for bulk messaging campaigns with security and validation
 */
export class PersonalizationEngine {
  private readonly TOKEN_PATTERN = /{{([^}]+)}}/g;
  private readonly DEFAULT_FALLBACK = '';

  /**
   * Personalize content by replacing tokens with actual values
   */
  personalizeContent(
    content: string,
    variables: PersonalizationVariables,
    options: PersonalizationOptions = {},
  ): string {
    if (!content || typeof content !== 'string') {
      return '';
    }

    const {
      fallbacks = {},
      caseSensitive = false,
      allowHtml = false,
      maxLength = 5000,
    } = options;

    let personalizedContent = content;

    // Replace all tokens
    personalizedContent = personalizedContent.replace(
      this.TOKEN_PATTERN,
      (match, tokenName) => {
        const trimmedTokenName = tokenName.trim();

        // Find the variable value (case-insensitive if specified)
        let value: string | number | boolean | null | undefined;

        if (caseSensitive) {
          value = variables[trimmedTokenName];
        } else {
          // Case-insensitive lookup
          const variableKey = Object.keys(variables).find(
            (key) => key.toLowerCase() === trimmedTokenName.toLowerCase(),
          );
          value = variableKey ? variables[variableKey] : undefined;
        }

        // Use fallback if value is not found
        if (value === undefined || value === null) {
          value =
            fallbacks[trimmedTokenName] ||
            fallbacks[trimmedTokenName.toLowerCase()] ||
            this.DEFAULT_FALLBACK;
        }

        // Convert to string and sanitize
        let stringValue = this.convertToString(value);

        if (allowHtml) {
          stringValue = sanitizeHTML(stringValue);
        } else {
          stringValue = sanitizeString(stringValue, 500); // Individual token limit
        }

        return stringValue;
      },
    );

    // Remove any remaining unreplaced tokens
    personalizedContent = personalizedContent.replace(this.TOKEN_PATTERN, '');

    // Apply content sanitization and length limit
    if (allowHtml) {
      personalizedContent = sanitizeHTML(personalizedContent);
    }

    if (personalizedContent.length > maxLength) {
      personalizedContent =
        personalizedContent.substring(0, maxLength - 3) + '...';
    }

    return personalizedContent;
  }

  /**
   * Extract all token names from content
   */
  extractTokens(content: string): string[] {
    if (!content || typeof content !== 'string') {
      return [];
    }

    const tokens: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = this.TOKEN_PATTERN.exec(content)) !== null) {
      const tokenName = match[1].trim();
      if (!tokens.includes(tokenName)) {
        tokens.push(tokenName);
      }
    }

    return tokens;
  }

  /**
   * Validate that all required tokens have values
   */
  validateTokens(
    content: string,
    variables: PersonalizationVariables,
    requiredTokens: string[] = [],
  ): { valid: boolean; missingTokens: string[] } {
    const contentTokens = this.extractTokens(content);
    const allRequiredTokens = [
      ...new Set([...contentTokens, ...requiredTokens]),
    ];

    const missingTokens = allRequiredTokens.filter((token) => {
      const hasValue =
        variables[token] !== undefined &&
        variables[token] !== null &&
        variables[token] !== '';
      const hasCaseInsensitiveValue = Object.keys(variables).some(
        (key) =>
          key.toLowerCase() === token.toLowerCase() &&
          variables[key] !== undefined &&
          variables[key] !== null &&
          variables[key] !== '',
      );
      return !hasValue && !hasCaseInsensitiveValue;
    });

    return {
      valid: missingTokens.length === 0,
      missingTokens,
    };
  }

  /**
   * Generate personalized preview for testing
   */
  generatePreview(
    content: string,
    variables: PersonalizationVariables,
    options: PersonalizationOptions = {},
  ): {
    personalizedContent: string;
    tokensFound: string[];
    tokensReplaced: string[];
    missingTokens: string[];
  } {
    const tokensFound = this.extractTokens(content);
    const personalizedContent = this.personalizeContent(
      content,
      variables,
      options,
    );
    const validation = this.validateTokens(content, variables);

    const tokensReplaced = tokensFound.filter(
      (token) => !validation.missingTokens.includes(token),
    );

    return {
      personalizedContent,
      tokensFound,
      tokensReplaced,
      missingTokens: validation.missingTokens,
    };
  }

  /**
   * Generate fallback variables for common wedding scenarios
   */
  generateFallbackVariables(): PersonalizationVariables {
    return {
      guest_name: 'Valued Guest',
      couple_names: 'Happy Couple',
      wedding_date: 'Wedding Day',
      wedding_time: 'TBD',
      venue_name: 'Wedding Venue',
      venue_address: 'Venue Address',
      vendor_name: 'Wedding Team',
      contact_info: 'Contact Information Available',
      portal_link: process.env.NEXT_PUBLIC_APP_URL || 'https://wedsync.com',
      rsvp_link: process.env.NEXT_PUBLIC_APP_URL || 'https://wedsync.com',
      update_message: 'Please check your wedding portal for updates',
      rsvp_deadline: 'As Soon As Possible',
    };
  }

  /**
   * Create guest-specific variables from guest data
   */
  createGuestVariables(guestData: {
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    dietary_restrictions?: string[];
    plus_one?: boolean;
    table_number?: number;
    [key: string]: any;
  }): PersonalizationVariables {
    const fallbacks = this.generateFallbackVariables();

    return {
      ...fallbacks,
      guest_name:
        guestData.name ||
        (guestData.first_name
          ? `${guestData.first_name} ${guestData.last_name || ''}`.trim()
          : null) ||
        fallbacks.guest_name,
      first_name: guestData.first_name || 'Guest',
      last_name: guestData.last_name || '',
      email: guestData.email || '',
      phone: guestData.phone || '',
      dietary_restrictions:
        guestData.dietary_restrictions?.join(', ') || 'None',
      plus_one: guestData.plus_one ? 'Yes' : 'No',
      table_number: guestData.table_number?.toString() || 'TBD',
      ...guestData, // Include any additional guest data
    };
  }

  /**
   * Create wedding-specific variables
   */
  createWeddingVariables(weddingData: {
    couple_names?: string;
    bride_name?: string;
    groom_name?: string;
    wedding_date?: string | Date;
    wedding_time?: string;
    venue_name?: string;
    venue_address?: string;
    wedding_style?: string;
    guest_count?: number;
    [key: string]: any;
  }): PersonalizationVariables {
    const fallbacks = this.generateFallbackVariables();

    // Format date if it's a Date object
    let formattedDate = fallbacks.wedding_date as string;
    if (weddingData.wedding_date) {
      if (weddingData.wedding_date instanceof Date) {
        formattedDate = weddingData.wedding_date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } else {
        formattedDate = weddingData.wedding_date;
      }
    }

    return {
      ...fallbacks,
      couple_names:
        weddingData.couple_names ||
        (weddingData.bride_name && weddingData.groom_name
          ? `${weddingData.bride_name} & ${weddingData.groom_name}`
          : null) ||
        fallbacks.couple_names,
      bride_name: weddingData.bride_name || 'Bride',
      groom_name: weddingData.groom_name || 'Groom',
      wedding_date: formattedDate,
      wedding_time: weddingData.wedding_time || fallbacks.wedding_time,
      venue_name: weddingData.venue_name || fallbacks.venue_name,
      venue_address: weddingData.venue_address || fallbacks.venue_address,
      wedding_style: weddingData.wedding_style || 'Traditional',
      guest_count: weddingData.guest_count?.toString() || 'TBD',
      ...weddingData, // Include any additional wedding data
    };
  }

  /**
   * Create vendor-specific variables
   */
  createVendorVariables(vendorData: {
    name?: string;
    business_name?: string;
    contact_email?: string;
    contact_phone?: string;
    website?: string;
    service_type?: string;
    [key: string]: any;
  }): PersonalizationVariables {
    const fallbacks = this.generateFallbackVariables();

    return {
      ...fallbacks,
      vendor_name:
        vendorData.name || vendorData.business_name || fallbacks.vendor_name,
      business_name:
        vendorData.business_name || vendorData.name || fallbacks.vendor_name,
      vendor_email: vendorData.contact_email || '',
      vendor_phone: vendorData.contact_phone || '',
      vendor_website: vendorData.website || '',
      service_type: vendorData.service_type || 'Wedding Service',
      contact_info:
        vendorData.contact_email ||
        vendorData.contact_phone ||
        'Contact information available in portal',
      ...vendorData, // Include any additional vendor data
    };
  }

  /**
   * Merge multiple variable sources with priority order
   */
  mergeVariables(
    ...variableSources: PersonalizationVariables[]
  ): PersonalizationVariables {
    return Object.assign({}, ...variableSources.reverse());
  }

  /**
   * Convert value to string safely
   */
  private convertToString(value: any): string {
    if (value === null || value === undefined) {
      return this.DEFAULT_FALLBACK;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return this.DEFAULT_FALLBACK;
      }
    }

    return String(value);
  }
}

// Export singleton instance
export const personalizationEngine = new PersonalizationEngine();

// Export convenience functions
export const personalizeMessage = (
  content: string,
  variables: PersonalizationVariables,
) => personalizationEngine.personalizeContent(content, variables);

export const extractMessageTokens = (content: string) =>
  personalizationEngine.extractTokens(content);

export const validateMessageTokens = (
  content: string,
  variables: PersonalizationVariables,
) => personalizationEngine.validateTokens(content, variables);
