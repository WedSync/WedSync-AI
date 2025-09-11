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

// Types for auto-population system
interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'select' | 'textarea';
  label: string;
  placeholder?: string;
  required: boolean;
}

interface WeddingData {
  couple_name_1: string;
  couple_name_2: string;
  wedding_date: string;
  venue_name?: string;
  venue_address?: string;
  guest_count?: number;
  budget_amount?: number;
  contact_email: string;
  contact_phone?: string;
  [key: string]: any;
}

interface FieldMapping {
  form_field_id: string;
  core_field_key: string;
  confidence: number;
  transformation_rule?: string;
  priority: number;
}

interface PopulationSession {
  id: string;
  couple_id: string;
  supplier_id: string;
  form_identifier: string;
  populated_fields: Record<string, any>;
  created_at: string;
  expires_at: string;
  status: 'active' | 'completed' | 'expired';
}

interface ConfidenceFactors {
  stringMatchScore: number;
  patternMatchScore: number;
  contextMatchScore: number;
  historicalAccuracy: number;
  userFeedbackScore: number;
}

interface MatchingConfig {
  exactMatch: number;
  partialMatch: number;
  synonymMatch: number;
  patternMatch: number;
  minimumConfidence: number;
}

class AutoPopulationService {
  private matchingConfig: MatchingConfig = {
    exactMatch: 1.0,
    partialMatch: 0.7,
    synonymMatch: 0.8,
    patternMatch: 0.6,
    minimumConfidence: 0.5,
  };

  private synonymMap = new Map([
    // Date synonyms
    [
      'wedding_date',
      ['event_date', 'ceremony_date', 'date', 'wedding_day', 'event_day'],
    ],
    [
      'date',
      ['wedding_date', 'event_date', 'ceremony_date', 'celebration_date'],
    ],

    // Name synonyms
    [
      'couple_name_1',
      [
        'bride_name',
        'partner1_name',
        'primary_contact',
        'first_partner',
        'bride',
      ],
    ],
    [
      'couple_name_2',
      ['groom_name', 'partner2_name', 'second_partner', 'groom'],
    ],
    [
      'contact_name',
      ['primary_contact', 'main_contact', 'client_name', 'couple_name'],
    ],

    // Guest count synonyms
    [
      'guest_count',
      ['number_of_guests', 'headcount', 'attendees', 'guest_number', 'pax'],
    ],

    // Venue synonyms
    [
      'venue_name',
      ['location', 'ceremony_venue', 'reception_venue', 'event_venue', 'place'],
    ],
    [
      'venue_address',
      [
        'location_address',
        'ceremony_address',
        'event_address',
        'venue_location',
      ],
    ],

    // Contact synonyms
    [
      'contact_email',
      ['email', 'email_address', 'primary_email', 'couple_email'],
    ],
    [
      'contact_phone',
      ['phone', 'phone_number', 'mobile', 'cell_phone', 'contact_number'],
    ],

    // Budget synonyms
    [
      'budget_amount',
      [
        'budget',
        'total_budget',
        'wedding_budget',
        'estimated_cost',
        'budget_range',
      ],
    ],
  ]);

  // Wedding industry patterns for regex matching
  private patterns = new Map([
    ['date', [/date$/i, /day$/i, /when$/i]],
    ['name', [/name$/i, /contact$/i, /person$/i, /who$/i]],
    ['email', [/email$/i, /mail$/i, /@/]],
    ['phone', [/phone$/i, /mobile$/i, /cell$/i, /number$/i, /tel$/i]],
    ['venue', [/venue$/i, /location$/i, /place$/i, /where$/i]],
    ['guest', [/guest$/i, /people$/i, /attendee$/i, /count$/i, /number$/i]],
    ['budget', [/budget$/i, /cost$/i, /price$/i, /amount$/i, /money$/i]],
  ]);

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private stringSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(
      str1.toLowerCase(),
      str2.toLowerCase(),
    );
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  /**
   * Check if field names match exactly
   */
  private exactMatch(formField: string, coreField: string): number {
    const normalized1 = this.normalizeFieldName(formField);
    const normalized2 = this.normalizeFieldName(coreField);
    return normalized1 === normalized2 ? this.matchingConfig.exactMatch : 0;
  }

  /**
   * Check if field names are synonyms
   */
  private synonymMatch(formField: string, coreField: string): number {
    const synonyms = this.synonymMap.get(coreField) || [];
    const normalizedFormField = this.normalizeFieldName(formField);

    if (
      synonyms.some(
        (synonym) => this.normalizeFieldName(synonym) === normalizedFormField,
      )
    ) {
      return this.matchingConfig.synonymMatch;
    }

    return 0;
  }

  /**
   * Check if field names match patterns
   */
  private patternMatch(formField: string, coreField: string): number {
    const normalizedFormField = formField.toLowerCase();

    // Get the core field category (remove prefixes like couple_, venue_, etc.)
    const coreCategory = coreField.split('_').pop() || coreField;
    const patterns = this.patterns.get(coreCategory) || [];

    const patternScore = patterns.some((pattern) =>
      pattern.test(normalizedFormField),
    )
      ? this.matchingConfig.patternMatch
      : 0;

    return patternScore;
  }

  /**
   * Calculate partial string match score
   */
  private partialMatch(formField: string, coreField: string): number {
    const similarity = this.stringSimilarity(formField, coreField);
    return similarity >= 0.6
      ? this.matchingConfig.partialMatch * similarity
      : 0;
  }

  /**
   * Normalize field names for comparison
   */
  private normalizeFieldName(fieldName: string): string {
    return fieldName
      .toLowerCase()
      .replace(/[_-]/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  /**
   * Calculate comprehensive confidence score
   */
  private calculateConfidence(
    formField: string,
    coreField: string,
    contextFactors: Partial<ConfidenceFactors> = {},
  ): number {
    // Base matching scores
    const exactScore = this.exactMatch(formField, coreField);
    const synonymScore = this.synonymMatch(formField, coreField);
    const patternScore = this.patternMatch(formField, coreField);
    const partialScore = this.partialMatch(formField, coreField);

    // Use the highest base score
    const baseScore = Math.max(
      exactScore,
      synonymScore,
      patternScore,
      partialScore,
    );

    // Apply contextual factors
    const factors: ConfidenceFactors = {
      stringMatchScore: baseScore,
      patternMatchScore: patternScore,
      contextMatchScore: contextFactors.contextMatchScore || 0.5,
      historicalAccuracy: contextFactors.historicalAccuracy || 0.5,
      userFeedbackScore: contextFactors.userFeedbackScore || 0.5,
      ...contextFactors,
    };

    // Weighted confidence calculation
    const confidence =
      factors.stringMatchScore * 0.4 +
      factors.patternMatchScore * 0.2 +
      factors.contextMatchScore * 0.15 +
      factors.historicalAccuracy * 0.15 +
      factors.userFeedbackScore * 0.1;

    return Math.round(confidence * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Transform data based on field type and transformation rules
   */
  private transformValue(
    value: any,
    targetType: string,
    transformationRule?: string,
  ): any {
    if (value === null || value === undefined) return null;

    switch (targetType) {
      case 'date':
        return this.transformDate(value);
      case 'phone':
        return this.transformPhone(value);
      case 'email':
        return this.transformEmail(value);
      case 'number':
        return this.transformNumber(value);
      case 'text':
        return this.transformText(value);
      default:
        return value?.toString() || null;
    }
  }

  /**
   * Transform date values to consistent format
   */
  private transformDate(value: any): string | null {
    if (!value) return null;

    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch {
      return null;
    }
  }

  /**
   * Transform phone numbers to consistent format
   */
  private transformPhone(value: any): string | null {
    if (!value) return null;

    const cleaned = value.toString().replace(/[^\d+]/g, '');
    if (cleaned.length < 10) return null;

    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }

    return cleaned;
  }

  /**
   * Transform email values
   */
  private transformEmail(value: any): string | null {
    if (!value) return null;

    const email = value.toString().toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(email) ? email : null;
  }

  /**
   * Transform number values
   */
  private transformNumber(value: any): number | null {
    if (value === null || value === undefined) return null;

    const num = parseFloat(value.toString().replace(/[^\d.-]/g, ''));
    return isNaN(num) ? null : num;
  }

  /**
   * Transform text values
   */
  private transformText(value: any): string | null {
    if (!value) return null;
    return value.toString().trim() || null;
  }

  /**
   * Get or create wedding data for a couple
   */
  async getOrCreateWeddingData(coupleId: string): Promise<WeddingData | null> {
    try {
      const { data: existingData, error } = await supabase
        .from('wedding_core_data')
        .select('*')
        .eq('couple_id', coupleId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching wedding data:', error);
        return null;
      }

      if (existingData) {
        return existingData;
      }

      // Create new wedding data record
      const { data: newData, error: createError } = await supabase
        .from('wedding_core_data')
        .insert([
          {
            couple_id: coupleId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error('Error creating wedding data:', createError);
        return null;
      }

      return newData;
    } catch (error) {
      console.error('Error in getOrCreateWeddingData:', error);
      return null;
    }
  }

  /**
   * Auto-detect field mappings for a form
   */
  async autoDetectMappings(
    formId: string,
    formFields: FormField[],
  ): Promise<FieldMapping[]> {
    try {
      const coreFields = [
        'couple_name_1',
        'couple_name_2',
        'wedding_date',
        'venue_name',
        'venue_address',
        'guest_count',
        'budget_amount',
        'contact_email',
        'contact_phone',
      ];

      const mappings: FieldMapping[] = [];
      let priority = 1;

      for (const formField of formFields) {
        let bestMatch = { coreField: '', confidence: 0 };

        // Find the best matching core field
        for (const coreField of coreFields) {
          const confidence = this.calculateConfidence(
            formField.name,
            coreField,
            {
              contextMatchScore:
                formField.type === 'date' && coreField.includes('date')
                  ? 0.9
                  : 0.5,
              historicalAccuracy: 0.7, // Default historical accuracy
              userFeedbackScore: 0.6, // Default user feedback score
            },
          );

          if (
            confidence > bestMatch.confidence &&
            confidence >= this.matchingConfig.minimumConfidence
          ) {
            bestMatch = { coreField, confidence };
          }
        }

        // Add mapping if confidence is sufficient
        if (bestMatch.confidence >= this.matchingConfig.minimumConfidence) {
          mappings.push({
            form_field_id: formField.id,
            core_field_key: bestMatch.coreField,
            confidence: bestMatch.confidence,
            priority: priority++,
            transformation_rule: this.getTransformationRule(
              formField.type,
              bestMatch.coreField,
            ),
          });
        }
      }

      return mappings;
    } catch (error) {
      console.error('Error in autoDetectMappings:', error);
      return [];
    }
  }

  /**
   * Get transformation rule for field type and core field combination
   */
  private getTransformationRule(
    fieldType: string,
    coreField: string,
  ): string | undefined {
    if (coreField.includes('date') && fieldType === 'date') {
      return 'date_iso';
    } else if (coreField.includes('phone') && fieldType === 'text') {
      return 'phone_format';
    } else if (coreField.includes('email') && fieldType === 'email') {
      return 'email_lowercase';
    } else if (coreField.includes('budget') && fieldType === 'number') {
      return 'number_currency';
    }
    return undefined;
  }

  /**
   * Create or update field mappings for a form
   */
  async createFormFieldMappings(
    formId: string,
    mappings: FieldMapping[],
  ): Promise<boolean> {
    try {
      const mappingInserts = mappings.map((mapping) => ({
        form_id: formId,
        form_field_id: mapping.form_field_id,
        core_field_key: mapping.core_field_key,
        confidence: mapping.confidence,
        transformation_rule: mapping.transformation_rule,
        priority: mapping.priority,
        created_at: new Date().toISOString(),
        is_verified: false,
        is_active: true,
      }));

      const { error } = await supabase
        .from('form_field_mappings')
        .upsert(mappingInserts, {
          onConflict: 'form_id,form_field_id',
        });

      if (error) {
        console.error('Error creating field mappings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in createFormFieldMappings:', error);
      return false;
    }
  }

  /**
   * Get core field values for a specific form and wedding
   */
  async getCoreFieldsForForm(
    formId: string,
    weddingId: string,
  ): Promise<Record<string, any>> {
    try {
      // Get the mappings for this form
      const { data: mappings, error: mappingsError } = await supabase
        .from('form_field_mappings')
        .select('core_field_key')
        .eq('form_id', formId)
        .eq('is_active', true);

      if (mappingsError) {
        console.error('Error fetching mappings:', mappingsError);
        return {};
      }

      if (!mappings || mappings.length === 0) {
        return {};
      }

      // Get wedding core data
      const { data: weddingData, error: weddingError } = await supabase
        .from('wedding_core_data')
        .select('*')
        .eq('id', weddingId)
        .single();

      if (weddingError) {
        console.error('Error fetching wedding data:', weddingError);
        return {};
      }

      // Extract only the fields needed for this form
      const coreFields: Record<string, any> = {};
      const coreFieldKeys = mappings.map((m) => m.core_field_key);

      for (const key of coreFieldKeys) {
        if (
          weddingData &&
          weddingData[key] !== null &&
          weddingData[key] !== undefined
        ) {
          coreFields[key] = weddingData[key];
        }
      }

      return coreFields;
    } catch (error) {
      console.error('Error in getCoreFieldsForForm:', error);
      return {};
    }
  }

  /**
   * Create a new population session
   */
  async createPopulationSession(
    coupleId: string,
    supplierId: string,
    formIdentifier: string,
    populatedFields: Record<string, any>,
  ): Promise<string | null> {
    try {
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      const { error } = await supabase.from('auto_population_sessions').insert([
        {
          id: sessionId,
          couple_id: coupleId,
          supplier_id: supplierId,
          form_identifier: formIdentifier,
          populated_fields: populatedFields,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'active',
        },
      ]);

      if (error) {
        console.error('Error creating population session:', error);
        return null;
      }

      return sessionId;
    } catch (error) {
      console.error('Error in createPopulationSession:', error);
      return null;
    }
  }

  /**
   * Get population session by ID
   */
  async getPopulationSession(
    sessionId: string,
  ): Promise<PopulationSession | null> {
    try {
      const { data, error } = await supabase
        .from('auto_population_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('Error fetching population session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getPopulationSession:', error);
      return null;
    }
  }

  /**
   * Update core fields with new data
   */
  async updateCoreFields(
    weddingId: string,
    updates: Record<string, any>,
    source = 'form_submission',
  ): Promise<boolean> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        last_updated_source: source,
      };

      const { error } = await supabase
        .from('wedding_core_data')
        .update(updateData)
        .eq('id', weddingId);

      if (error) {
        console.error('Error updating core fields:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateCoreFields:', error);
      return false;
    }
  }

  /**
   * Check vendor access to wedding data
   */
  async checkVendorAccess(
    organizationId: string,
    weddingId: string,
  ): Promise<{
    canRead: boolean;
    canWrite: boolean;
    accessLevel: string;
  }> {
    try {
      // Check if there's an active client relationship
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('id, organization_id')
        .eq('organization_id', organizationId)
        .eq('wedding_id', weddingId)
        .eq('status', 'active')
        .single();

      if (error || !clientData) {
        return {
          canRead: false,
          canWrite: false,
          accessLevel: 'none',
        };
      }

      // Vendors have read/write access to their client's wedding data
      return {
        canRead: true,
        canWrite: true,
        accessLevel: 'full',
      };
    } catch (error) {
      console.error('Error checking vendor access:', error);
      return {
        canRead: false,
        canWrite: false,
        accessLevel: 'none',
      };
    }
  }

  /**
   * Store user feedback on population accuracy
   */
  async storeFeedback(
    sessionId: string,
    fieldId: string,
    wasCorrect: boolean,
    correctedValue?: any,
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('population_feedback').insert([
        {
          session_id: sessionId,
          field_id: fieldId,
          was_correct: wasCorrect,
          corrected_value: correctedValue,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error('Error storing feedback:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in storeFeedback:', error);
      return false;
    }
  }
}

export const autoPopulationService = new AutoPopulationService();
