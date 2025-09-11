import { createBrowserClient } from '@supabase/ssr';
import { z } from 'zod';

/**
 * Secure Query Builder for WedSync
 * Prevents SQL injection by validating all input parameters
 */
export class SecureQueryBuilder {
  private supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // UUID validation schema
  private static uuidSchema = z.string().uuid();

  // Safe string validation for IDs
  private static idSchema = z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'ID must contain only alphanumeric characters, underscores, and hyphens',
    );

  // Numeric validation
  private static numericSchema = z.number().int().min(0);

  /**
   * Safely validate UUID parameters
   */
  static validateUUID(id: string): string {
    return this.uuidSchema.parse(id);
  }

  /**
   * Safely validate ID parameters
   */
  static validateId(id: string): string {
    return this.idSchema.parse(id);
  }

  /**
   * Safely validate numeric parameters
   */
  static validateNumeric(value: number): number {
    return this.numericSchema.parse(value);
  }

  /**
   * Secure client queries with parameterized operations
   */
  async getClientById(id: string) {
    const clientId = SecureQueryBuilder.validateUUID(id);

    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('id', clientId) // Parameterized - safe from SQL injection
      .single();

    if (error) throw error;
    return data;
  }

  async getClientsByUserId(userId: string) {
    const validUserId = SecureQueryBuilder.validateUUID(userId);

    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('user_id', validUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Secure form queries with validation
   */
  async getFormById(id: string) {
    const formId = SecureQueryBuilder.validateUUID(id);

    const { data, error } = await this.supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (error) throw error;
    return data;
  }

  async getFormsByClientId(clientId: string) {
    const validClientId = SecureQueryBuilder.validateUUID(clientId);

    const { data, error } = await this.supabase
      .from('forms')
      .select('*')
      .eq('client_id', validClientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Secure journey queries with validation
   */
  async getJourneyById(id: string) {
    const journeyId = SecureQueryBuilder.validateUUID(id);

    const { data, error } = await this.supabase
      .from('journey_canvases')
      .select('*')
      .eq('id', journeyId)
      .single();

    if (error) throw error;
    return data;
  }

  async getJourneyInstancesByJourneyId(journeyId: string) {
    const validJourneyId = SecureQueryBuilder.validateUUID(journeyId);

    const { data, error } = await this.supabase
      .from('journey_instances')
      .select('*')
      .eq('journey_id', validJourneyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Secure form submission queries
   */
  async getFormSubmissionById(id: string) {
    const submissionId = SecureQueryBuilder.validateUUID(id);

    const { data, error } = await this.supabase
      .from('form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (error) throw error;
    return data;
  }

  async getFormSubmissionsByFormId(
    formId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    const validFormId = SecureQueryBuilder.validateUUID(formId);
    const validLimit = SecureQueryBuilder.validateNumeric(limit);
    const validOffset = SecureQueryBuilder.validateNumeric(offset);

    const { data, error } = await this.supabase
      .from('form_submissions')
      .select('*')
      .eq('form_id', validFormId)
      .order('created_at', { ascending: false })
      .range(validOffset, validOffset + validLimit - 1);

    if (error) throw error;
    return data;
  }

  /**
   * Secure update operations with validation
   */
  async updateClientSecure(id: string, updates: Record<string, any>) {
    const clientId = SecureQueryBuilder.validateUUID(id);

    // Sanitize update fields - only allow specific fields
    const allowedFields = [
      'company_name',
      'contact_name',
      'email',
      'phone',
      'address',
      'website',
      'notes',
      'status',
      'client_type',
      'preferred_contact_method',
    ];

    const sanitizedUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        sanitizedUpdates[key] = value;
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    const { data, error } = await this.supabase
      .from('clients')
      .update({
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Secure deletion with validation
   */
  async softDeleteClient(id: string, userId: string) {
    const clientId = SecureQueryBuilder.validateUUID(id);
    const validUserId = SecureQueryBuilder.validateUUID(userId);

    const { data, error } = await this.supabase
      .from('clients')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
        last_modified_by: validUserId,
      })
      .eq('id', clientId)
      .eq('user_id', validUserId) // Ensure ownership
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create safe PostgreSQL filter strings for real-time subscriptions
   */
  static createSafeFilter(
    field: string,
    operator: string,
    value: string,
  ): string {
    // Validate field name (whitelist approach)
    const allowedFields = [
      'id',
      'journey_id',
      'client_id',
      'form_id',
      'user_id',
      'instance_id',
      'node_id',
      'status',
      'created_by',
    ];

    if (!allowedFields.includes(field)) {
      throw new Error(`Invalid filter field: ${field}`);
    }

    // Validate operator (whitelist approach)
    const allowedOperators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in'];
    if (!allowedOperators.includes(operator)) {
      throw new Error(`Invalid filter operator: ${operator}`);
    }

    // Validate and sanitize value based on field type
    let sanitizedValue: string;

    if (field.endsWith('_id') || field === 'id') {
      // UUID validation for ID fields
      sanitizedValue = this.validateUUID(value);
    } else if (field === 'status') {
      // Enum validation for status fields
      const allowedStatuses = [
        'active',
        'inactive',
        'draft',
        'published',
        'completed',
        'pending',
        'failed',
      ];
      if (!allowedStatuses.includes(value)) {
        throw new Error(`Invalid status value: ${value}`);
      }
      sanitizedValue = value;
    } else {
      // Generic string validation
      sanitizedValue = this.validateId(value);
    }

    return `${field}=${operator}.${sanitizedValue}`;
  }
}

export default SecureQueryBuilder;
