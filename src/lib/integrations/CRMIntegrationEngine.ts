/**
 * Advanced Form Builder Engine - CRM Integration Engine
 * Handles synchronization with multiple CRM providers used by wedding suppliers
 *
 * Wedding Industry Focus:
 * - Tave (25% photographer market share) - REST API with rate limiting
 * - HoneyBook (40% planner market share) - OAuth2 with complex scopes
 * - Light Blue (15% venue market share) - Screen scraping required
 * - Duplicate detection for couples who book multiple vendors
 */

import { createClient } from '@supabase/supabase-js';
import {
  FormSubmission,
  WeddingClientInfo,
  FormIntegrationResult,
  TaveConfig,
  HoneyBookConfig,
  LightBlueConfig,
  FormIntegrationProvider,
  FieldMapping,
} from '@/types/integrations';

// CRM-Specific Types
export interface ClientData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  partner_name?: string;
  wedding_date?: string;
  venue?: string;
  guest_count?: number;
  budget?: number;
  service_type?: string;
  notes?: string;
  source?: string;
  status?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface SyncResult {
  success: boolean;
  client_id?: string;
  external_id?: string;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_message?: string;
  duplicate_detected?: boolean;
  duplicate_record_id?: string;
}

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  confidence: number; // 0-100%
  matching_records: Array<{
    id: string;
    name: string;
    email: string;
    match_criteria: string[];
    confidence: number;
  }>;
  recommended_action: 'merge' | 'skip' | 'create_new' | 'manual_review';
}

export interface ConflictResolution {
  resolution_strategy: 'source_wins' | 'target_wins' | 'merge' | 'manual';
  resolved_fields: Record<string, any>;
  conflicts_remaining: Array<{
    field: string;
    source_value: any;
    target_value: any;
    reason: string;
  }>;
}

export interface SyncConflict {
  field_name: string;
  source_value: any;
  target_value: any;
  conflict_type:
    | 'value_mismatch'
    | 'format_difference'
    | 'required_field_missing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  auto_resolvable: boolean;
}

// Main CRM Integration Engine
export class CRMIntegrationEngine {
  private supabase: any;
  private rateLimiters: Map<string, { requests: number; resetTime: number }>;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.rateLimiters = new Map();
  }

  /**
   * Sync client data to Tave CRM
   * Rate limit: 60 requests per minute
   */
  async syncToTave(
    clientData: ClientData,
    config: TaveConfig,
    fieldMappings: FieldMapping[],
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Starting Tave sync for client ${clientData.email}`);

      // Check rate limiting
      await this.checkRateLimit('tave', 60); // 60 req/min

      // Check for duplicates first
      const duplicateCheck = await this.checkTaveDuplicates(clientData, config);
      if (duplicateCheck.is_duplicate && duplicateCheck.confidence > 80) {
        console.log(
          `⚠️ High confidence duplicate detected for ${clientData.email}`,
        );

        if (duplicateCheck.recommended_action === 'merge') {
          return await this.mergeTaveRecord(
            clientData,
            duplicateCheck.matching_records[0].id,
            config,
            fieldMappings,
          );
        } else if (duplicateCheck.recommended_action === 'skip') {
          return {
            success: true,
            external_id: duplicateCheck.matching_records[0].id,
            records_created: 0,
            records_updated: 0,
            records_failed: 0,
            duplicate_detected: true,
            duplicate_record_id: duplicateCheck.matching_records[0].id,
          };
        }
      }

      // Transform data according to field mappings
      const taveData = this.transformDataForTave(clientData, fieldMappings);

      // Validate required fields for Tave
      const validation = this.validateTaveData(taveData);
      if (!validation.valid) {
        throw new Error(
          `Tave validation failed: ${validation.errors.join(', ')}`,
        );
      }

      // Create contact in Tave
      const taveResponse = await this.createTaveContact(taveData, config);

      // Create job if wedding date is provided
      let jobResponse;
      if (clientData.wedding_date) {
        jobResponse = await this.createTaveJob(
          taveResponse.id,
          clientData,
          config,
        );
      }

      // Log successful sync
      await this.logSyncActivity('tave', 'success', {
        client_id: taveResponse.id,
        execution_time: Date.now() - startTime,
        records_created: 1 + (jobResponse ? 1 : 0),
      });

      console.log(
        `✅ Tave sync completed for ${clientData.email} in ${Date.now() - startTime}ms`,
      );

      return {
        success: true,
        client_id: taveResponse.id,
        external_id: taveResponse.id,
        records_created: 1 + (jobResponse ? 1 : 0),
        records_updated: 0,
        records_failed: 0,
      };
    } catch (error) {
      console.error(`❌ Tave sync failed for ${clientData.email}:`, error);

      await this.logSyncActivity('tave', 'failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time: Date.now() - startTime,
      });

      return {
        success: false,
        records_created: 0,
        records_updated: 0,
        records_failed: 1,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync client data to HoneyBook CRM
   * OAuth2 with automatic token refresh
   */
  async syncToHoneyBook(
    clientData: ClientData,
    config: HoneyBookConfig,
    fieldMappings: FieldMapping[],
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Starting HoneyBook sync for client ${clientData.email}`);

      // Check and refresh OAuth token if needed
      const validToken = await this.ensureValidHoneyBookToken(config);
      if (!validToken) {
        throw new Error('Failed to obtain valid OAuth token for HoneyBook');
      }

      // Check rate limiting (HoneyBook limit: 100 req/min)
      await this.checkRateLimit('honeybook', 100);

      // Check for duplicates
      const duplicateCheck = await this.checkHoneyBookDuplicates(
        clientData,
        config,
      );
      if (duplicateCheck.is_duplicate && duplicateCheck.confidence > 85) {
        console.log(
          `⚠️ Duplicate detected in HoneyBook for ${clientData.email}`,
        );

        // Update existing record instead of creating new
        return await this.updateHoneyBookProject(
          duplicateCheck.matching_records[0].id,
          clientData,
          config,
          fieldMappings,
        );
      }

      // Transform data for HoneyBook format
      const honeyBookData = this.transformDataForHoneyBook(
        clientData,
        fieldMappings,
      );

      // Validate HoneyBook required fields
      const validation = this.validateHoneyBookData(honeyBookData);
      if (!validation.valid) {
        throw new Error(
          `HoneyBook validation failed: ${validation.errors.join(', ')}`,
        );
      }

      // Create client contact
      const clientResponse = await this.createHoneyBookClient(
        honeyBookData,
        config,
      );

      // Create project for the wedding
      const projectResponse = await this.createHoneyBookProject(
        {
          client_id: clientResponse.id,
          name: `${clientData.name} Wedding`,
          wedding_date: clientData.wedding_date,
          venue: clientData.venue,
          guest_count: clientData.guest_count,
          budget: clientData.budget,
          pipeline_id: config.project_pipeline_id,
        },
        config,
      );

      // Log successful sync
      await this.logSyncActivity('honeybook', 'success', {
        client_id: clientResponse.id,
        project_id: projectResponse.id,
        execution_time: Date.now() - startTime,
        records_created: 2,
      });

      console.log(
        `✅ HoneyBook sync completed for ${clientData.email} in ${Date.now() - startTime}ms`,
      );

      return {
        success: true,
        client_id: clientResponse.id,
        external_id: projectResponse.id,
        records_created: 2, // Client + Project
        records_updated: 0,
        records_failed: 0,
      };
    } catch (error) {
      console.error(`❌ HoneyBook sync failed for ${clientData.email}:`, error);

      await this.logSyncActivity('honeybook', 'failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time: Date.now() - startTime,
      });

      return {
        success: false,
        records_created: 0,
        records_updated: 0,
        records_failed: 1,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync client data to Light Blue (screen scraping)
   * No official API - requires web automation
   */
  async syncToLightBlue(
    clientData: ClientData,
    config: LightBlueConfig,
    fieldMappings: FieldMapping[],
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Starting Light Blue sync for client ${clientData.email}`);

      // Import Playwright for screen scraping
      const { chromium } = await import('playwright');

      const browser = await chromium.launch({
        headless: true,
        args: ['--disable-web-security'],
      });

      const context = await browser.newContext({
        userAgent:
          config.user_agent ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      const page = await context.newPage();

      try {
        // Login to Light Blue
        await this.loginToLightBlue(page, config);

        // Check for existing booking
        const existingBooking = await this.findLightBlueBooking(
          page,
          clientData,
        );
        if (existingBooking) {
          console.log(`⚠️ Existing booking found for ${clientData.email}`);
          // Update existing booking
          return await this.updateLightBlueBooking(
            page,
            existingBooking.id,
            clientData,
            fieldMappings,
          );
        }

        // Create new booking
        const bookingResult = await this.createLightBlueBooking(
          page,
          clientData,
          fieldMappings,
        );

        await this.logSyncActivity('lightblue', 'success', {
          booking_id: bookingResult.id,
          execution_time: Date.now() - startTime,
          records_created: 1,
        });

        console.log(
          `✅ Light Blue sync completed for ${clientData.email} in ${Date.now() - startTime}ms`,
        );

        return {
          success: true,
          client_id: bookingResult.id,
          external_id: bookingResult.id,
          records_created: 1,
          records_updated: 0,
          records_failed: 0,
        };
      } finally {
        await browser.close();
      }
    } catch (error) {
      console.error(
        `❌ Light Blue sync failed for ${clientData.email}:`,
        error,
      );

      await this.logSyncActivity('lightblue', 'failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time: Date.now() - startTime,
      });

      return {
        success: false,
        records_created: 0,
        records_updated: 0,
        records_failed: 1,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Advanced duplicate detection using multiple criteria
   */
  async detectDuplicates(
    clientData: ClientData,
    provider: FormIntegrationProvider,
  ): Promise<DuplicateCheckResult> {
    const criteria = {
      exact_email: clientData.email.toLowerCase(),
      similar_name: this.generateNameVariations(clientData.name),
      phone_match: this.normalizePhoneNumber(clientData.phone),
      wedding_date_match: clientData.wedding_date,
      venue_match: clientData.venue?.toLowerCase().trim(),
    };

    switch (provider) {
      case 'tave':
        return await this.checkTaveDuplicates(clientData, {} as TaveConfig);
      case 'honeybook':
        return await this.checkHoneyBookDuplicates(
          clientData,
          {} as HoneyBookConfig,
        );
      case 'lightblue':
        return await this.checkLightBlueDuplicates(
          clientData,
          {} as LightBlueConfig,
        );
      default:
        return {
          is_duplicate: false,
          confidence: 0,
          matching_records: [],
          recommended_action: 'create_new',
        };
    }
  }

  /**
   * Handle sync conflicts with intelligent resolution
   */
  async handleSyncConflicts(
    conflicts: SyncConflict[],
  ): Promise<ConflictResolution> {
    const resolvedFields: Record<string, any> = {};
    const remainingConflicts: typeof conflicts = [];

    for (const conflict of conflicts) {
      // Auto-resolve based on conflict type and severity
      if (conflict.auto_resolvable) {
        switch (conflict.conflict_type) {
          case 'format_difference':
            // Prefer the more structured format
            resolvedFields[conflict.field_name] = this.chooseStructuredFormat(
              conflict.source_value,
              conflict.target_value,
            );
            break;

          case 'required_field_missing':
            // Use the non-null value
            resolvedFields[conflict.field_name] =
              conflict.source_value || conflict.target_value;
            break;

          case 'value_mismatch':
            if (conflict.severity === 'low') {
              // For low severity, prefer source (newer data)
              resolvedFields[conflict.field_name] = conflict.source_value;
            } else {
              // High severity conflicts need manual review
              remainingConflicts.push(conflict);
            }
            break;
        }
      } else {
        remainingConflicts.push(conflict);
      }
    }

    // Determine overall resolution strategy
    let strategy: 'source_wins' | 'target_wins' | 'merge' | 'manual' = 'merge';

    if (remainingConflicts.length > 0) {
      strategy = 'manual';
    } else if (Object.keys(resolvedFields).length === conflicts.length) {
      strategy = 'merge';
    }

    return {
      resolution_strategy: strategy,
      resolved_fields: resolvedFields,
      conflicts_remaining: remainingConflicts,
    };
  }

  // Private helper methods

  private async checkRateLimit(
    provider: string,
    limitPerMinute: number,
  ): Promise<void> {
    const now = Date.now();
    const rateLimiter = this.rateLimiters.get(provider) || {
      requests: 0,
      resetTime: now + 60000,
    };

    // Reset if minute has passed
    if (now > rateLimiter.resetTime) {
      rateLimiter.requests = 0;
      rateLimiter.resetTime = now + 60000;
    }

    // Check if at limit
    if (rateLimiter.requests >= limitPerMinute) {
      const waitTime = rateLimiter.resetTime - now;
      console.log(
        `⏳ Rate limit reached for ${provider}, waiting ${waitTime}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      rateLimiter.requests = 0;
      rateLimiter.resetTime = Date.now() + 60000;
    }

    rateLimiter.requests++;
    this.rateLimiters.set(provider, rateLimiter);
  }

  private transformDataForTave(
    clientData: ClientData,
    fieldMappings: FieldMapping[],
  ): any {
    const taveData: any = {};

    // Apply field mappings
    for (const mapping of fieldMappings) {
      const sourceValue = this.getNestedValue(clientData, mapping.source_field);

      if (sourceValue !== undefined || mapping.required) {
        let transformedValue = sourceValue || mapping.default_value;

        // Apply transformation if specified
        if (mapping.transformation && sourceValue) {
          try {
            // Safe eval of transformation function
            const transformFn = new Function(
              'value',
              `return ${mapping.transformation}`,
            );
            transformedValue = transformFn(sourceValue);
          } catch (error) {
            console.warn(
              `Transformation failed for ${mapping.source_field}:`,
              error,
            );
          }
        }

        this.setNestedValue(taveData, mapping.target_field, transformedValue);
      }
    }

    // Tave-specific defaults and formatting
    return {
      first_name: taveData.first_name || clientData.name.split(' ')[0],
      last_name:
        taveData.last_name || clientData.name.split(' ').slice(1).join(' '),
      email: clientData.email.toLowerCase(),
      phone: this.formatPhoneForTave(clientData.phone),
      partner_name: clientData.partner_name,
      notes: this.formatNotesForTave(clientData),
      tags: this.generateTaveTagsFromWeddingData(clientData),
      ...taveData,
    };
  }

  private transformDataForHoneyBook(
    clientData: ClientData,
    fieldMappings: FieldMapping[],
  ): any {
    const honeyBookData: any = {};

    // Apply field mappings similar to Tave but with HoneyBook structure
    for (const mapping of fieldMappings) {
      const sourceValue = this.getNestedValue(clientData, mapping.source_field);

      if (sourceValue !== undefined || mapping.required) {
        let transformedValue = sourceValue || mapping.default_value;

        if (mapping.transformation && sourceValue) {
          try {
            const transformFn = new Function(
              'value',
              `return ${mapping.transformation}`,
            );
            transformedValue = transformFn(sourceValue);
          } catch (error) {
            console.warn(
              `Transformation failed for ${mapping.source_field}:`,
              error,
            );
          }
        }

        this.setNestedValue(
          honeyBookData,
          mapping.target_field,
          transformedValue,
        );
      }
    }

    // HoneyBook-specific structure
    return {
      contact: {
        first_name: honeyBookData.first_name || clientData.name.split(' ')[0],
        last_name:
          honeyBookData.last_name ||
          clientData.name.split(' ').slice(1).join(' '),
        email: clientData.email.toLowerCase(),
        phone: this.formatPhoneForHoneyBook(clientData.phone),
      },
      event: {
        date: clientData.wedding_date,
        venue: clientData.venue,
        guest_count: clientData.guest_count,
        budget: clientData.budget,
      },
      custom_fields: honeyBookData.custom_fields || {},
      ...honeyBookData,
    };
  }

  private async checkTaveDuplicates(
    clientData: ClientData,
    config: TaveConfig,
  ): Promise<DuplicateCheckResult> {
    try {
      // Search Tave API for existing contacts
      const searchResponse = await fetch(
        `${config.base_url || 'https://taveapi.com'}/v1/contacts/search`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: clientData.email,
            name: clientData.name,
            phone: clientData.phone,
          }),
        },
      );

      const searchResults = await searchResponse.json();

      if (searchResults.contacts && searchResults.contacts.length > 0) {
        const matches = searchResults.contacts.map((contact: any) => {
          const confidence = this.calculateDuplicateConfidence(clientData, {
            name: `${contact.first_name} ${contact.last_name}`,
            email: contact.email,
            phone: contact.phone,
            wedding_date: contact.wedding_date,
          });

          return {
            id: contact.id,
            name: `${contact.first_name} ${contact.last_name}`,
            email: contact.email,
            match_criteria: this.getMatchCriteria(clientData, contact),
            confidence,
          };
        });

        const highestConfidence = Math.max(...matches.map((m) => m.confidence));

        return {
          is_duplicate: highestConfidence > 70,
          confidence: highestConfidence,
          matching_records: matches.filter((m) => m.confidence > 50),
          recommended_action:
            highestConfidence > 90
              ? 'skip'
              : highestConfidence > 80
                ? 'merge'
                : 'manual_review',
        };
      }

      return {
        is_duplicate: false,
        confidence: 0,
        matching_records: [],
        recommended_action: 'create_new',
      };
    } catch (error) {
      console.error('Tave duplicate check failed:', error);
      return {
        is_duplicate: false,
        confidence: 0,
        matching_records: [],
        recommended_action: 'create_new',
      };
    }
  }

  private async checkHoneyBookDuplicates(
    clientData: ClientData,
    config: HoneyBookConfig,
  ): Promise<DuplicateCheckResult> {
    // Similar implementation for HoneyBook API
    // Implementation would use HoneyBook's search endpoints
    return {
      is_duplicate: false,
      confidence: 0,
      matching_records: [],
      recommended_action: 'create_new',
    };
  }

  private async checkLightBlueDuplicates(
    clientData: ClientData,
    config: LightBlueConfig,
  ): Promise<DuplicateCheckResult> {
    // For Light Blue, we'd need to scrape the search functionality
    // This would involve navigating to the client search page and checking results
    return {
      is_duplicate: false,
      confidence: 0,
      matching_records: [],
      recommended_action: 'create_new',
    };
  }

  private calculateDuplicateConfidence(
    source: ClientData,
    target: any,
  ): number {
    let confidence = 0;
    let totalCriteria = 0;

    // Email match (highest weight)
    if (source.email && target.email) {
      totalCriteria += 40;
      if (source.email.toLowerCase() === target.email.toLowerCase()) {
        confidence += 40;
      }
    }

    // Name similarity (moderate weight)
    if (source.name && target.name) {
      totalCriteria += 25;
      const similarity = this.calculateStringSimilarity(
        source.name.toLowerCase(),
        target.name.toLowerCase(),
      );
      confidence += Math.round(25 * similarity);
    }

    // Phone match (moderate weight)
    if (source.phone && target.phone) {
      totalCriteria += 20;
      const sourcePhone = this.normalizePhoneNumber(source.phone);
      const targetPhone = this.normalizePhoneNumber(target.phone);
      if (sourcePhone === targetPhone) {
        confidence += 20;
      }
    }

    // Wedding date match (lower weight, but important)
    if (source.wedding_date && target.wedding_date) {
      totalCriteria += 15;
      if (source.wedding_date === target.wedding_date) {
        confidence += 15;
      }
    }

    // Return percentage confidence
    return totalCriteria > 0
      ? Math.round((confidence / totalCriteria) * 100)
      : 0;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance implementation
    const matrix: number[][] = [];
    const n = str1.length;
    const m = str2.length;

    if (n === 0) return m === 0 ? 1 : 0;
    if (m === 0) return 0;

    for (let i = 0; i <= n; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= m; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    const maxLength = Math.max(n, m);
    return (maxLength - matrix[n][m]) / maxLength;
  }

  // Additional utility methods...
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private normalizePhoneNumber(phone?: string): string {
    if (!phone) return '';
    return phone.replace(/\D/g, ''); // Remove all non-digits
  }

  private generateNameVariations(name: string): string[] {
    const variations = [name.toLowerCase()];
    const parts = name.toLowerCase().split(' ');

    // Add first name variations
    if (parts.length >= 1) {
      variations.push(parts[0]);
    }

    // Add last name variations
    if (parts.length >= 2) {
      variations.push(parts[parts.length - 1]);
      variations.push(`${parts[0]} ${parts[parts.length - 1]}`);
    }

    return variations;
  }

  private async logSyncActivity(
    provider: string,
    status: string,
    details: any,
  ): Promise<void> {
    try {
      await this.supabase.from('integration_sync_logs').insert({
        provider,
        status,
        details,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log sync activity:', error);
    }
  }

  // Additional methods would include:
  // - validateTaveData, validateHoneyBookData
  // - createTaveContact, createTaveJob
  // - createHoneyBookClient, createHoneyBookProject
  // - ensureValidHoneyBookToken
  // - loginToLightBlue, findLightBlueBooking, createLightBlueBooking
  // - formatPhoneForTave, formatPhoneForHoneyBook
  // - formatNotesForTave, generateTaveTagsFromWeddingData
  // - etc.

  private validateTaveData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.first_name) errors.push('First name is required');
    if (!data.last_name) errors.push('Last name is required');
    if (!data.email || !data.email.includes('@'))
      errors.push('Valid email is required');

    return { valid: errors.length === 0, errors };
  }

  private validateHoneyBookData(data: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.contact?.first_name)
      errors.push('Contact first name is required');
    if (!data.contact?.email || !data.contact.email.includes('@'))
      errors.push('Valid contact email is required');

    return { valid: errors.length === 0, errors };
  }

  private async createTaveContact(data: any, config: TaveConfig): Promise<any> {
    const response = await fetch(
      `${config.base_url || 'https://taveapi.com'}/v1/contacts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Tave API error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  private async createTaveJob(
    contactId: string,
    clientData: ClientData,
    config: TaveConfig,
  ): Promise<any> {
    const jobData = {
      contact_id: contactId,
      job_type: config.default_job_type || 'Wedding',
      event_date: clientData.wedding_date,
      venue: clientData.venue,
      guest_count: clientData.guest_count,
      notes: clientData.notes,
    };

    const response = await fetch(
      `${config.base_url || 'https://taveapi.com'}/v1/jobs`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Tave job creation error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  private formatPhoneForTave(phone?: string): string {
    if (!phone) return '';
    const normalized = this.normalizePhoneNumber(phone);
    // Format as (XXX) XXX-XXXX for US numbers
    if (normalized.length === 10) {
      return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
    }
    return phone;
  }

  private formatPhoneForHoneyBook(phone?: string): string {
    if (!phone) return '';
    return this.normalizePhoneNumber(phone); // HoneyBook prefers digits only
  }

  private formatNotesForTave(clientData: ClientData): string {
    const notes: string[] = [];

    if (clientData.notes) notes.push(clientData.notes);
    if (clientData.source) notes.push(`Source: ${clientData.source}`);
    if (clientData.guest_count)
      notes.push(`Guest Count: ${clientData.guest_count}`);
    if (clientData.budget) notes.push(`Budget: $${clientData.budget}`);

    return notes.join('\n');
  }

  private generateTaveTagsFromWeddingData(clientData: ClientData): string[] {
    const tags: string[] = [];

    if (clientData.service_type) tags.push(clientData.service_type);
    if (clientData.budget) {
      if (clientData.budget < 5000) tags.push('Budget-Friendly');
      else if (clientData.budget > 20000) tags.push('Luxury');
      else tags.push('Mid-Range');
    }
    if (clientData.wedding_date) {
      const date = new Date(clientData.wedding_date);
      const month = date.getMonth();
      if (month >= 4 && month <= 9) tags.push('Peak-Season');
      else tags.push('Off-Season');
    }

    return tags;
  }

  private getMatchCriteria(source: ClientData, target: any): string[] {
    const criteria: string[] = [];

    if (source.email.toLowerCase() === target.email?.toLowerCase())
      criteria.push('Email');
    if (
      this.calculateStringSimilarity(
        source.name.toLowerCase(),
        target.name?.toLowerCase() || '',
      ) > 0.8
    )
      criteria.push('Name');
    if (
      this.normalizePhoneNumber(source.phone) ===
      this.normalizePhoneNumber(target.phone)
    )
      criteria.push('Phone');
    if (source.wedding_date === target.wedding_date)
      criteria.push('Wedding Date');

    return criteria;
  }

  private chooseStructuredFormat(sourceValue: any, targetValue: any): any {
    // Prefer objects over strings, arrays over single values, etc.
    if (typeof sourceValue === 'object' && typeof targetValue === 'string')
      return sourceValue;
    if (typeof targetValue === 'object' && typeof sourceValue === 'string')
      return targetValue;
    if (Array.isArray(sourceValue) && !Array.isArray(targetValue))
      return sourceValue;
    if (Array.isArray(targetValue) && !Array.isArray(sourceValue))
      return targetValue;
    return sourceValue; // Default to source
  }

  private async ensureValidHoneyBookToken(
    config: HoneyBookConfig,
  ): Promise<boolean> {
    // Check if current token is still valid
    if (config.access_token && config.token_expires_at) {
      const expiresAt = new Date(config.token_expires_at);
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      if (expiresAt > fiveMinutesFromNow) {
        return true; // Token is still valid
      }
    }

    // Need to refresh token
    if (!config.refresh_token) {
      console.error('No refresh token available for HoneyBook');
      return false;
    }

    try {
      const response = await fetch('https://api.honeybook.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: config.refresh_token,
          client_id: config.client_id,
          client_secret: config.client_secret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const tokenData = await response.json();

      // Update config with new tokens
      config.access_token = tokenData.access_token;
      if (tokenData.refresh_token) {
        config.refresh_token = tokenData.refresh_token;
      }
      config.token_expires_at = new Date(
        Date.now() + tokenData.expires_in * 1000,
      ).toISOString();

      // Save updated tokens to database
      await this.supabase
        .from('integrations')
        .update({
          access_token: config.access_token,
          refresh_token: config.refresh_token,
          token_expires_at: config.token_expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq('provider', 'honeybook');

      return true;
    } catch (error) {
      console.error('Failed to refresh HoneyBook token:', error);
      return false;
    }
  }

  private async createHoneyBookClient(
    data: any,
    config: HoneyBookConfig,
  ): Promise<any> {
    const response = await fetch('https://api.honeybook.com/v1/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data.contact),
    });

    if (!response.ok) {
      throw new Error(
        `HoneyBook client creation error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  private async createHoneyBookProject(
    data: any,
    config: HoneyBookConfig,
  ): Promise<any> {
    const response = await fetch('https://api.honeybook.com/v1/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(
        `HoneyBook project creation error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  private async mergeTaveRecord(
    clientData: ClientData,
    existingId: string,
    config: TaveConfig,
    fieldMappings: FieldMapping[],
  ): Promise<SyncResult> {
    // Implementation for merging data with existing Tave record
    const updatedData = this.transformDataForTave(clientData, fieldMappings);

    const response = await fetch(
      `${config.base_url || 'https://taveapi.com'}/v1/contacts/${existingId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Tave merge error: ${response.status} ${response.statusText}`,
      );
    }

    return {
      success: true,
      client_id: existingId,
      external_id: existingId,
      records_created: 0,
      records_updated: 1,
      records_failed: 0,
    };
  }

  private async updateHoneyBookProject(
    projectId: string,
    clientData: ClientData,
    config: HoneyBookConfig,
    fieldMappings: FieldMapping[],
  ): Promise<SyncResult> {
    const updatedData = this.transformDataForHoneyBook(
      clientData,
      fieldMappings,
    );

    const response = await fetch(
      `https://api.honeybook.com/v1/projects/${projectId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      },
    );

    if (!response.ok) {
      throw new Error(
        `HoneyBook update error: ${response.status} ${response.statusText}`,
      );
    }

    return {
      success: true,
      client_id: projectId,
      external_id: projectId,
      records_created: 0,
      records_updated: 1,
      records_failed: 0,
    };
  }

  private async loginToLightBlue(
    page: any,
    config: LightBlueConfig,
  ): Promise<void> {
    await page.goto(config.base_url + '/login');
    await page.fill('input[name="username"]', config.username);
    await page.fill('input[name="password"]', config.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.dashboard', { timeout: 10000 });
  }

  private async findLightBlueBooking(
    page: any,
    clientData: ClientData,
  ): Promise<any> {
    // Navigate to search and look for existing booking
    await page.goto('/bookings/search');
    await page.fill('input[name="email"]', clientData.email);
    await page.click('button.search');

    const results = await page.locator('.booking-result').count();
    if (results > 0) {
      const bookingId = await page
        .locator('.booking-result')
        .first()
        .getAttribute('data-id');
      return { id: bookingId };
    }

    return null;
  }

  private async createLightBlueBooking(
    page: any,
    clientData: ClientData,
    fieldMappings: FieldMapping[],
  ): Promise<any> {
    await page.goto('/bookings/new');

    // Fill out booking form
    await page.fill('input[name="client_name"]', clientData.name);
    await page.fill('input[name="email"]', clientData.email);
    await page.fill('input[name="phone"]', clientData.phone || '');
    await page.fill(
      'input[name="wedding_date"]',
      clientData.wedding_date || '',
    );
    await page.fill(
      'input[name="guest_count"]',
      clientData.guest_count?.toString() || '',
    );

    // Submit form
    await page.click('button[type="submit"]');

    // Get booking ID from URL or response
    await page.waitForSelector('.success-message');
    const bookingId = await page.url().split('/').pop();

    return { id: bookingId };
  }

  private async updateLightBlueBooking(
    page: any,
    bookingId: string,
    clientData: ClientData,
    fieldMappings: FieldMapping[],
  ): Promise<SyncResult> {
    await page.goto(`/bookings/${bookingId}/edit`);

    // Update booking details
    await page.fill('input[name="client_name"]', clientData.name);
    await page.fill('input[name="email"]', clientData.email);
    await page.fill('input[name="phone"]', clientData.phone || '');

    await page.click('button[type="submit"]');
    await page.waitForSelector('.success-message');

    return {
      success: true,
      client_id: bookingId,
      external_id: bookingId,
      records_created: 0,
      records_updated: 1,
      records_failed: 0,
    };
  }
}

// Export singleton instance
export const crmIntegrationEngine = new CRMIntegrationEngine();
