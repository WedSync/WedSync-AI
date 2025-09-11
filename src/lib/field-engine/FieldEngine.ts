/**
 * FieldEngine - Core field management system for WedSync forms
 * Handles field validation, transformation, templates, and business logic
 */

import {
  FormField,
  FormFieldType,
  FormFieldValidation,
  FormFieldOption,
  FIELD_TEMPLATES,
} from '@/types/forms';
import { nanoid } from 'nanoid';
import { z } from 'zod';

export interface FieldTransformOptions {
  normalize?: boolean;
  sanitize?: boolean;
  validate?: boolean;
  applyDefaults?: boolean;
}

export interface FieldValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    type: string;
  }>;
  warnings?: Array<{
    field: string;
    message: string;
  }>;
}

export interface FieldTemplate {
  id: string;
  name: string;
  description: string;
  fields: Partial<FormField>[];
  category: 'wedding' | 'contact' | 'business' | 'custom';
  tags: string[];
  popularity?: number;
}

export interface FieldAnalytics {
  fieldId: string;
  usageCount: number;
  validationErrors: number;
  completionRate: number;
  avgFillTime: number;
  lastUsed: Date;
}

export class FieldEngine {
  private static instance: FieldEngine;
  private fieldTemplates: Map<string, FieldTemplate> = new Map();
  private validationSchemas: Map<FormFieldType, z.ZodSchema> = new Map();
  private fieldAnalytics: Map<string, FieldAnalytics> = new Map();

  private constructor() {
    this.initializeValidationSchemas();
    this.loadDefaultTemplates();
  }

  public static getInstance(): FieldEngine {
    if (!FieldEngine.instance) {
      FieldEngine.instance = new FieldEngine();
    }
    return FieldEngine.instance;
  }

  /**
   * Initialize Zod validation schemas for each field type
   */
  private initializeValidationSchemas(): void {
    this.validationSchemas.set('text', z.string().min(1));
    this.validationSchemas.set('email', z.string().email());
    this.validationSchemas.set(
      'tel',
      z.string().regex(/^[\+]?[1-9][\d]{0,15}$/),
    );
    this.validationSchemas.set('textarea', z.string().min(1));
    this.validationSchemas.set(
      'number',
      z.number().or(z.string().transform((val) => Number(val))),
    );
    this.validationSchemas.set('date', z.string().datetime().or(z.date()));
    this.validationSchemas.set(
      'time',
      z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    );
    this.validationSchemas.set('select', z.string().min(1));
    this.validationSchemas.set('radio', z.string().min(1));
    this.validationSchemas.set('checkbox', z.array(z.string()).or(z.boolean()));
    this.validationSchemas.set('file', z.any());
    this.validationSchemas.set('signature', z.string().min(1));
  }

  /**
   * Load default wedding industry field templates
   */
  private loadDefaultTemplates(): void {
    const weddingTemplates: FieldTemplate[] = [
      {
        id: 'wedding-basic-info',
        name: 'Wedding Basic Information',
        description: 'Essential wedding details collection',
        category: 'wedding',
        tags: ['wedding', 'basic', 'essential'],
        fields: [
          { ...FIELD_TEMPLATES.text, label: "Bride's Name", required: true },
          { ...FIELD_TEMPLATES.text, label: "Groom's Name", required: true },
          { ...FIELD_TEMPLATES.date, label: 'Wedding Date', required: true },
          { ...FIELD_TEMPLATES.text, label: 'Wedding Venue', required: true },
          {
            ...FIELD_TEMPLATES.number,
            label: 'Number of Guests',
            required: true,
          },
          { ...FIELD_TEMPLATES.textarea, label: 'Special Requirements' },
        ],
      },
      {
        id: 'photography-requirements',
        name: 'Photography Requirements',
        description: 'Detailed photography service requirements',
        category: 'wedding',
        tags: ['photography', 'requirements', 'service'],
        fields: [
          {
            ...FIELD_TEMPLATES.select,
            label: 'Photography Style',
            options: [
              { id: '1', label: 'Traditional', value: 'traditional' },
              {
                id: '2',
                label: 'Photojournalistic',
                value: 'photojournalistic',
              },
              { id: '3', label: 'Fine Art', value: 'fine-art' },
              { id: '4', label: 'Fashion', value: 'fashion' },
            ],
          },
          {
            ...FIELD_TEMPLATES.checkbox,
            label: 'Services Required',
            options: [
              { id: '1', label: 'Engagement Shoot', value: 'engagement' },
              { id: '2', label: 'Bridal Portraits', value: 'bridal' },
              { id: '3', label: 'Ceremony Coverage', value: 'ceremony' },
              { id: '4', label: 'Reception Coverage', value: 'reception' },
              { id: '5', label: 'Drone Photography', value: 'drone' },
            ],
          },
          {
            ...FIELD_TEMPLATES.textarea,
            label: 'Shot List / Special Requests',
          },
          {
            ...FIELD_TEMPLATES.radio,
            label: 'Delivery Preference',
            options: [
              { id: '1', label: 'Online Gallery', value: 'online' },
              { id: '2', label: 'USB Drive', value: 'usb' },
              { id: '3', label: 'Printed Album', value: 'album' },
            ],
          },
        ],
      },
      {
        id: 'contact-information',
        name: 'Contact Information',
        description: 'Comprehensive contact details collection',
        category: 'contact',
        tags: ['contact', 'communication', 'details'],
        fields: [
          { ...FIELD_TEMPLATES.text, label: 'Full Name', required: true },
          { ...FIELD_TEMPLATES.email, label: 'Email Address', required: true },
          { ...FIELD_TEMPLATES.tel, label: 'Phone Number', required: true },
          { ...FIELD_TEMPLATES.text, label: 'Preferred Contact Method' },
          { ...FIELD_TEMPLATES.textarea, label: 'Mailing Address' },
        ],
      },
    ];

    weddingTemplates.forEach((template) => {
      this.fieldTemplates.set(template.id, template);
    });
  }

  /**
   * Create a new form field with validation and defaults
   */
  public createField(
    type: FormFieldType,
    options: Partial<FormField> = {},
  ): FormField {
    const template = FIELD_TEMPLATES[type];
    const field: FormField = {
      id: nanoid(),
      ...template,
      ...options,
      type,
      order: options.order ?? 0,
    } as FormField;

    // Apply business rules and defaults
    this.applyBusinessRules(field);

    // Track analytics
    this.trackFieldCreation(field);

    return field;
  }

  /**
   * Validate a single field value
   */
  public validateField(field: FormField, value: any): FieldValidationResult {
    const errors: Array<{ field: string; message: string; type: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    try {
      // Required validation
      if (
        field.required &&
        (!value || value === '' || (Array.isArray(value) && value.length === 0))
      ) {
        errors.push({
          field: field.id,
          message: `${field.label} is required`,
          type: 'required',
        });
      }

      // Type-specific validation
      if (value && value !== '') {
        const schema = this.validationSchemas.get(field.type);
        if (schema) {
          try {
            schema.parse(value);
          } catch (zodError: any) {
            errors.push({
              field: field.id,
              message: zodError.errors[0]?.message || `Invalid ${field.type}`,
              type: 'format',
            });
          }
        }

        // Custom validation rules
        if (field.validation) {
          const customResult = this.validateCustomRules(field, value);
          errors.push(...customResult.errors);
          warnings.push(...customResult.warnings);
        }

        // Wedding-specific business rules
        const businessResult = this.validateBusinessRules(field, value);
        errors.push(...businessResult.errors);
        warnings.push(...businessResult.warnings);
      }

      // Update analytics
      this.updateFieldAnalytics(field.id, errors.length === 0);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Field validation error:', error);
      return {
        isValid: false,
        errors: [
          {
            field: field.id,
            message: 'Validation error occurred',
            type: 'system',
          },
        ],
      };
    }
  }

  /**
   * Validate multiple fields
   */
  public validateFields(
    fields: FormField[],
    values: Record<string, any>,
  ): FieldValidationResult {
    const allErrors: Array<{ field: string; message: string; type: string }> =
      [];
    const allWarnings: Array<{ field: string; message: string }> = [];

    fields.forEach((field) => {
      const value = values[field.id];
      const result = this.validateField(field, value);
      allErrors.push(...result.errors);
      if (result.warnings) {
        allWarnings.push(...result.warnings);
      }
    });

    // Cross-field validation
    const crossFieldResult = this.validateCrossFieldRules(fields, values);
    allErrors.push(...crossFieldResult.errors);
    allWarnings.push(...crossFieldResult.warnings);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Transform field values based on options
   */
  public transformField(
    field: FormField,
    value: any,
    options: FieldTransformOptions = {},
  ): any {
    let transformedValue = value;

    if (options.normalize) {
      transformedValue = this.normalizeValue(field, transformedValue);
    }

    if (options.sanitize) {
      transformedValue = this.sanitizeValue(field, transformedValue);
    }

    if (
      options.applyDefaults &&
      (!transformedValue || transformedValue === '')
    ) {
      transformedValue = field.defaultValue || transformedValue;
    }

    return transformedValue;
  }

  /**
   * Get field template by ID
   */
  public getFieldTemplate(templateId: string): FieldTemplate | undefined {
    return this.fieldTemplates.get(templateId);
  }

  /**
   * Get all field templates by category
   */
  public getFieldTemplatesByCategory(category?: string): FieldTemplate[] {
    const templates = Array.from(this.fieldTemplates.values());
    return category
      ? templates.filter((t) => t.category === category)
      : templates;
  }

  /**
   * Create fields from template
   */
  public createFieldsFromTemplate(templateId: string): FormField[] {
    const template = this.getFieldTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return template.fields.map((fieldData, index) => {
      const field = this.createField(fieldData.type!, {
        ...fieldData,
        order: index,
      });
      return field;
    });
  }

  /**
   * Evaluate conditional logic for field visibility
   */
  public evaluateConditionalLogic(
    field: FormField,
    allValues: Record<string, any>,
  ): boolean {
    if (!field.conditionalLogic) return true;

    const { when, equals } = field.conditionalLogic;
    const dependentValue = allValues[when];

    // Handle different comparison types
    if (Array.isArray(equals)) {
      return equals.includes(dependentValue);
    }

    return dependentValue === equals;
  }

  /**
   * Get field analytics
   */
  public getFieldAnalytics(fieldId: string): FieldAnalytics | undefined {
    return this.fieldAnalytics.get(fieldId);
  }

  /**
   * Get popular field templates based on usage
   */
  public getPopularTemplates(limit: number = 10): FieldTemplate[] {
    return Array.from(this.fieldTemplates.values())
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit);
  }

  /**
   * Apply wedding industry business rules to fields
   */
  private applyBusinessRules(field: FormField): void {
    // Wedding date must be in the future
    if (
      field.type === 'date' &&
      field.label.toLowerCase().includes('wedding')
    ) {
      if (!field.validation) field.validation = {};
      field.validation.min = Date.now();
    }

    // Guest count should be reasonable
    if (
      field.type === 'number' &&
      field.label.toLowerCase().includes('guest')
    ) {
      if (!field.validation) field.validation = {};
      field.validation.min = 1;
      field.validation.max = 1000;
    }

    // Email fields should have proper validation
    if (field.type === 'email') {
      if (!field.validation) field.validation = {};
      field.validation.pattern = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
      field.validation.customMessage = 'Please enter a valid email address';
    }

    // Phone fields should accept international formats
    if (field.type === 'tel') {
      if (!field.validation) field.validation = {};
      field.validation.pattern = '^[\\+]?[1-9][\\d]{0,15}$';
      field.validation.customMessage = 'Please enter a valid phone number';
    }
  }

  /**
   * Validate custom validation rules
   */
  private validateCustomRules(
    field: FormField,
    value: any,
  ): { errors: any[]; warnings: any[] } {
    const errors: Array<{ field: string; message: string; type: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];
    const validation = field.validation!;

    // Length validations
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        errors.push({
          field: field.id,
          message:
            validation.customMessage ||
            `Minimum length is ${validation.minLength}`,
          type: 'minLength',
        });
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        errors.push({
          field: field.id,
          message:
            validation.customMessage ||
            `Maximum length is ${validation.maxLength}`,
          type: 'maxLength',
        });
      }
    }

    // Numeric validations
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push({
          field: field.id,
          message:
            validation.customMessage || `Minimum value is ${validation.min}`,
          type: 'min',
        });
      }
      if (validation.max !== undefined && value > validation.max) {
        errors.push({
          field: field.id,
          message:
            validation.customMessage || `Maximum value is ${validation.max}`,
          type: 'max',
        });
      }
    }

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: field.id,
          message:
            validation.customMessage || `Invalid format for ${field.label}`,
          type: 'pattern',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate wedding industry specific business rules
   */
  private validateBusinessRules(
    field: FormField,
    value: any,
  ): { errors: any[]; warnings: any[] } {
    const errors: Array<{ field: string; message: string; type: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Wedding date validations
    if (
      field.type === 'date' &&
      field.label.toLowerCase().includes('wedding')
    ) {
      const weddingDate = new Date(value);
      const today = new Date();
      const dayOfWeek = weddingDate.getDay();

      // Wedding should be in the future
      if (weddingDate <= today) {
        errors.push({
          field: field.id,
          message: 'Wedding date must be in the future',
          type: 'businessRule',
        });
      }

      // Warn about weekend bookings (high demand)
      if (dayOfWeek === 6 || dayOfWeek === 0) {
        // Saturday or Sunday
        warnings.push({
          field: field.id,
          message:
            'Weekend weddings are in high demand and may require earlier booking',
        });
      }

      // Warn about holiday dates
      const isHoliday = this.isHolidayDate(weddingDate);
      if (isHoliday) {
        warnings.push({
          field: field.id,
          message:
            'Holiday weddings may have premium pricing and limited vendor availability',
        });
      }
    }

    // Guest count business rules
    if (
      field.type === 'number' &&
      field.label.toLowerCase().includes('guest')
    ) {
      const guestCount = Number(value);

      if (guestCount > 500) {
        warnings.push({
          field: field.id,
          message:
            'Large weddings may require special permits and additional planning time',
        });
      }

      if (guestCount < 10) {
        warnings.push({
          field: field.id,
          message:
            'Intimate weddings offer unique opportunities for personalized experiences',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Cross-field validation rules
   */
  private validateCrossFieldRules(
    fields: FormField[],
    values: Record<string, any>,
  ): { errors: any[]; warnings: any[] } {
    const errors: Array<{ field: string; message: string; type: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Find related fields
    const brideNameField = fields.find((f) =>
      f.label.toLowerCase().includes("bride's name"),
    );
    const groomNameField = fields.find((f) =>
      f.label.toLowerCase().includes("groom's name"),
    );
    const weddingDateField = fields.find((f) =>
      f.label.toLowerCase().includes('wedding date'),
    );
    const guestCountField = fields.find((f) =>
      f.label.toLowerCase().includes('guest'),
    );

    // Ensure bride and groom names are different
    if (brideNameField && groomNameField) {
      const brideName = values[brideNameField.id];
      const groomName = values[groomNameField.id];

      if (
        brideName &&
        groomName &&
        brideName.toLowerCase() === groomName.toLowerCase()
      ) {
        warnings.push({
          field: brideNameField.id,
          message:
            'Bride and groom names appear to be the same - please verify',
        });
      }
    }

    // Wedding date and planning time warnings
    if (weddingDateField) {
      const weddingDate = new Date(values[weddingDateField.id]);
      const today = new Date();
      const monthsUntilWedding =
        (weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);

      if (monthsUntilWedding < 6) {
        warnings.push({
          field: weddingDateField.id,
          message:
            'Wedding is less than 6 months away - vendor availability may be limited',
        });
      }

      if (monthsUntilWedding > 24) {
        warnings.push({
          field: weddingDateField.id,
          message:
            'Planning far in advance is great! Consider that vendor pricing may change',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Normalize field values
   */
  private normalizeValue(field: FormField, value: any): any {
    if (!value) return value;

    switch (field.type) {
      case 'email':
        return typeof value === 'string' ? value.toLowerCase().trim() : value;

      case 'tel':
        // Remove spaces, dashes, parentheses
        return typeof value === 'string'
          ? value.replace(/[\s\-\(\)]/g, '')
          : value;

      case 'text':
      case 'textarea':
        return typeof value === 'string' ? value.trim() : value;

      case 'number':
        return typeof value === 'string' ? parseFloat(value) || 0 : value;

      default:
        return value;
    }
  }

  /**
   * Sanitize field values for security
   */
  private sanitizeValue(field: FormField, value: any): any {
    if (!value || typeof value !== 'string') return value;

    // Basic XSS prevention
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Check if date is a holiday (simplified check for common holidays)
   */
  private isHolidayDate(date: Date): boolean {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Common wedding holidays
    const holidays = [
      { month: 2, day: 14 }, // Valentine's Day
      { month: 6, day: 20 }, // Summer Solstice (approx)
      { month: 9, day: 22 }, // Fall Equinox (approx)
      { month: 12, day: 31 }, // New Year's Eve
    ];

    return holidays.some((h) => h.month === month && h.day === day);
  }

  /**
   * Track field creation for analytics
   */
  private trackFieldCreation(field: FormField): void {
    // In a real implementation, this would send to analytics service
    console.debug('Field created:', { type: field.type, label: field.label });
  }

  /**
   * Update field analytics
   */
  private updateFieldAnalytics(fieldId: string, isValid: boolean): void {
    const analytics = this.fieldAnalytics.get(fieldId) || {
      fieldId,
      usageCount: 0,
      validationErrors: 0,
      completionRate: 0,
      avgFillTime: 0,
      lastUsed: new Date(),
    };

    analytics.usageCount++;
    analytics.lastUsed = new Date();

    if (!isValid) {
      analytics.validationErrors++;
    }

    analytics.completionRate =
      ((analytics.usageCount - analytics.validationErrors) /
        analytics.usageCount) *
      100;

    this.fieldAnalytics.set(fieldId, analytics);
  }
}

// Export singleton instance
export const fieldEngine = FieldEngine.getInstance();
