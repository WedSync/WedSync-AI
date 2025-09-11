// Core Fields Manager - Handles auto-population and sync between vendors
// This is the KEY differentiator - saves 10+ hours per wedding

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SecureQueryBuilder } from '@/lib/database/secure-query-builder';
import type {
  WeddingCoreData,
  VendorWeddingConnection,
  FormFieldCoreMapping,
  CoreFieldAuditLog,
  CoreFieldDefinition,
} from '@/types/core-fields';
import { detectCoreFieldFromLabel } from '@/types/core-fields';
import {
  validateCoreFieldValue,
  validateCoreFields,
  CoreFieldNameSchema,
  CoreFieldMappingSchema,
  sanitizeInput,
} from '@/lib/validations/core-fields';

export class CoreFieldsManager {
  private supabase;

  constructor() {
    this.supabase = createClientComponentClient();
  }

  /**
   * Get or create wedding core data for a client
   */
  async getOrCreateWeddingData(
    clientId: string,
  ): Promise<WeddingCoreData | null> {
    try {
      // Validate clientId is a valid UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clientId)) {
        console.error('Invalid client ID format');
        return null;
      }
      // First check if client has existing wedding data
      const { data: connection, error: connError } = await this.supabase
        .from('vendor_wedding_connections')
        .select('wedding_id')
        .eq('client_id', clientId)
        .single();

      if (connection?.wedding_id) {
        // Fetch existing wedding data
        const { data, error } = await this.supabase
          .from('wedding_core_data')
          .select('*')
          .eq('id', connection.wedding_id)
          .single();

        if (!error && data) {
          return data as WeddingCoreData;
        }
      }

      // Create new wedding data
      const { data: newWedding, error: createError } = await this.supabase
        .from('wedding_core_data')
        .insert({
          wedding_id: crypto.randomUUID(),
        })
        .select()
        .single();

      if (createError) {
        // Log error without exposing sensitive details
        console.error('Error creating wedding data');
        return null;
      }

      // Create vendor connection
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (user) {
        const { data: profile } = await this.supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          await this.supabase.from('vendor_wedding_connections').insert({
            wedding_id: newWedding.id,
            organization_id: profile.organization_id,
            client_id: clientId,
            is_primary_vendor: true, // First vendor gets primary status
            can_write_core_fields: true,
          });
        }
      }

      return newWedding as WeddingCoreData;
    } catch (error) {
      // Never expose internal errors
      console.error('Error in getOrCreateWeddingData');
      return null;
    }
  }

  /**
   * Get core fields for a form (to pre-populate)
   */
  async getCoreFieldsForForm(
    formId: string,
    weddingId: string,
  ): Promise<Record<string, any>> {
    try {
      // Validate UUIDs
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formId) || !uuidRegex.test(weddingId)) {
        console.error('Invalid ID format');
        return {};
      }
      // Call the database function that handles permissions and returns mapped values
      const { data, error } = await this.supabase.rpc(
        'get_core_fields_for_form',
        {
          p_form_id: formId,
          p_wedding_id: weddingId,
        },
      );

      if (error) {
        console.error('Error fetching core fields');
        return {};
      }

      return data || {};
    } catch (error) {
      console.error('Error in getCoreFieldsForForm');
      return {};
    }
  }

  /**
   * Update core fields from form submission
   */
  async updateCoreFields(
    weddingId: string,
    updates: Partial<WeddingCoreData>,
    source:
      | 'form_submission'
      | 'manual_edit'
      | 'api_update' = 'form_submission',
  ): Promise<boolean> {
    try {
      // Validate wedding ID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(weddingId)) {
        console.error('Invalid wedding ID format');
        return false;
      }

      // Validate and sanitize all fields before updating
      const validationResult = validateCoreFields(updates);
      if (!validationResult.valid) {
        console.error('Validation failed for core fields');
        return false;
      }

      const sanitizedUpdates = validationResult.sanitized;

      // Update the wedding core data with sanitized values
      const { error } = await this.supabase
        .from('wedding_core_data')
        .update({
          ...sanitizedUpdates,
          updated_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', weddingId);

      if (error) {
        console.error('Error updating core fields');
        return false;
      }

      // Audit log is handled by database trigger

      return true;
    } catch (error) {
      console.error('Error in updateCoreFields');
      return false;
    }
  }

  /**
   * Create form field mappings (connects form fields to core fields)
   */
  async createFormFieldMappings(
    formId: string,
    mappings: Array<{
      form_field_id: string;
      core_field_key: string;
      confidence?: number;
      sync_direction?: 'read_only' | 'write_only' | 'bidirectional';
    }>,
  ): Promise<boolean> {
    try {
      // Validate form ID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formId)) {
        console.error('Invalid form ID format');
        return false;
      }

      // Validate each mapping
      for (const mapping of mappings) {
        const result = CoreFieldMappingSchema.safeParse(mapping);
        if (!result.success) {
          console.error('Invalid mapping data');
          return false;
        }
      }
      const mappingRecords = mappings.map((m) => ({
        form_id: formId,
        form_field_id: m.form_field_id,
        core_field_key: m.core_field_key,
        mapping_type: m.confidence ? 'auto' : 'manual',
        confidence_score: m.confidence,
        sync_direction: m.sync_direction || 'bidirectional',
        is_verified: !m.confidence || m.confidence > 0.9,
      }));

      const { error } = await this.supabase
        .from('form_field_core_mappings')
        .upsert(mappingRecords, {
          onConflict: 'form_id,form_field_id',
        });

      if (error) {
        console.error('Error creating field mappings');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in createFormFieldMappings');
      return false;
    }
  }

  /**
   * Auto-detect core field mappings for a form
   */
  async autoDetectMappings(
    formId: string,
    fields: Array<{ id: string; label: string; type: string }>,
  ): Promise<
    Array<{
      form_field_id: string;
      core_field_key: string;
      confidence: number;
    }>
  > {
    // Validate form ID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formId)) {
      console.error('Invalid form ID format');
      return [];
    }
    const mappings: Array<{
      form_field_id: string;
      core_field_key: string;
      confidence: number;
    }> = [];

    for (const field of fields) {
      // Sanitize field label before detection
      const sanitizedLabel = sanitizeInput(field.label);
      const detection = detectCoreFieldFromLabel(sanitizedLabel);

      if (detection.field_key && detection.confidence > 0.7) {
        mappings.push({
          form_field_id: field.id,
          core_field_key: detection.field_key,
          confidence: detection.confidence,
        });
      }
    }

    return mappings;
  }

  /**
   * Check if vendor has access to wedding core fields
   */
  async checkVendorAccess(
    organizationId: string,
    weddingId: string,
  ): Promise<{
    hasAccess: boolean;
    canRead: boolean;
    canWrite: boolean;
    allowedCategories: string[];
  }> {
    try {
      const { data, error } = await this.supabase
        .from('vendor_wedding_connections')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('wedding_id', weddingId)
        .single();

      if (error || !data) {
        return {
          hasAccess: false,
          canRead: false,
          canWrite: false,
          allowedCategories: [],
        };
      }

      return {
        hasAccess: true,
        canRead: data.can_read_core_fields,
        canWrite: data.can_write_core_fields,
        allowedCategories: data.allowed_field_categories || [],
      };
    } catch (error) {
      console.error('Error checking vendor access');
      return {
        hasAccess: false,
        canRead: false,
        canWrite: false,
        allowedCategories: [],
      };
    }
  }

  /**
   * Share wedding data with another vendor
   */
  async shareWithVendor(
    weddingId: string,
    vendorOrganizationId: string,
    permissions: {
      canWrite?: boolean;
      allowedCategories?: string[];
    } = {},
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('vendor_wedding_connections')
        .insert({
          wedding_id: weddingId,
          organization_id: vendorOrganizationId,
          can_read_core_fields: true,
          can_write_core_fields: permissions.canWrite || false,
          allowed_field_categories: permissions.allowedCategories || [
            'couple_info',
            'wedding_details',
            'venue_info',
          ],
        });

      if (error) {
        // If already exists, update permissions
        if (error.code === '23505') {
          // Unique violation
          const { error: updateError } = await this.supabase
            .from('vendor_wedding_connections')
            .update({
              can_write_core_fields: permissions.canWrite || false,
              allowed_field_categories: permissions.allowedCategories,
            })
            .eq('wedding_id', weddingId)
            .eq('organization_id', vendorOrganizationId);

          if (updateError) {
            console.error('Error updating vendor connection');
            return false;
          }
        } else {
          console.error('Error sharing with vendor');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in shareWithVendor');
      return false;
    }
  }

  /**
   * Get audit log for a wedding
   */
  async getAuditLog(
    weddingId: string,
    limit: number = 50,
  ): Promise<CoreFieldAuditLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('core_field_audit_log')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching audit log');
        return [];
      }

      return data as CoreFieldAuditLog[];
    } catch (error) {
      console.error('Error in getAuditLog');
      return [];
    }
  }

  /**
   * Get all core field definitions
   */
  async getCoreFieldDefinitions(): Promise<CoreFieldDefinition[]> {
    try {
      const { data, error } = await this.supabase
        .from('core_fields_definitions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching core field definitions');
        return [];
      }

      return data as CoreFieldDefinition[];
    } catch (error) {
      console.error('Error in getCoreFieldDefinitions');
      return [];
    }
  }

  /**
   * Subscribe to real-time core field updates
   */
  subscribeToUpdates(weddingId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`wedding_core_data:${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wedding_core_data',
          filter: SecureQueryBuilder.createSafeFilter('id', 'eq', weddingId),
        },
        callback,
      )
      .subscribe();
  }
}

// Export singleton instance
export const coreFieldsManager = new CoreFieldsManager();
