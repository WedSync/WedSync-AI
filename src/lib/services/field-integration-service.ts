/**
 * Field Integration Service
 * Handles integration between different field management systems
 */

import { FormField, FormFieldType } from '@/types/forms';
import {
  FieldIntegrationSource,
  IntegrationConfig,
  FieldMapping,
} from '@/components/forms/FieldIntegration';

export class FieldIntegrationService {
  private static instance: FieldIntegrationService;

  public static getInstance(): FieldIntegrationService {
    if (!FieldIntegrationService.instance) {
      FieldIntegrationService.instance = new FieldIntegrationService();
    }
    return FieldIntegrationService.instance;
  }

  /**
   * Connect to an external integration source
   */
  async connectIntegrationSource(
    type: string,
    config: {
      name: string;
      endpoint?: string;
      credentials?: Record<string, any>;
      settings?: Record<string, any>;
    },
  ): Promise<FieldIntegrationSource> {
    try {
      // Validate connection based on type
      await this.validateConnection(type, config);

      const source: FieldIntegrationSource = {
        id: this.generateId(),
        name: config.name,
        type: type as any,
        endpoint: config.endpoint,
        credentials: config.credentials,
        status: 'connected',
        lastSync: new Date(),
        fieldsCount: 0,
      };

      // Save to database
      await this.saveIntegrationSource(source);

      return source;
    } catch (error) {
      throw new Error(`Failed to connect integration: ${error.message}`);
    }
  }

  /**
   * Sync fields from an external source
   */
  async syncFieldsFromSource(sourceId: string): Promise<any[]> {
    try {
      const source = await this.getIntegrationSource(sourceId);
      if (!source) {
        throw new Error('Integration source not found');
      }

      let fields: any[] = [];

      switch (source.type) {
        case 'api':
          fields = await this.syncFromAPI(source);
          break;
        case 'file':
          fields = await this.syncFromFile(source);
          break;
        case 'database':
          fields = await this.syncFromDatabase(source);
          break;
        case 'webhook':
          fields = await this.syncFromWebhook(source);
          break;
        case 'external_form':
          fields = await this.syncFromExternalForm(source);
          break;
        default:
          throw new Error(`Unsupported integration type: ${source.type}`);
      }

      // Update source metadata
      await this.updateSourceMetadata(sourceId, {
        lastSync: new Date(),
        fieldsCount: fields.length,
        status: 'connected',
      });

      return fields;
    } catch (error) {
      // Update source status on error
      await this.updateSourceMetadata(sourceId, {
        status: 'error',
      });
      throw error;
    }
  }

  /**
   * Transform fields based on mapping configuration
   */
  transformFields(
    sourceFields: any[],
    mappings: FieldMapping[],
    targetFields: FormField[],
  ): FormField[] {
    return mappings
      .map((mapping, index) => {
        const sourceField = sourceFields.find(
          (f) => f.name === mapping.sourceField || f.id === mapping.sourceField,
        );
        const targetField = targetFields.find(
          (f) => f.id === mapping.targetField,
        );

        if (!sourceField) {
          console.warn(`Source field ${mapping.sourceField} not found`);
          return null;
        }

        // Apply transformations
        let transformedValue = sourceField.value || sourceField.defaultValue;
        transformedValue = this.applyTransformation(
          transformedValue,
          mapping.transformation,
          mapping.customTransformation,
        );

        const newField: FormField = {
          id: this.generateId(),
          type: this.mapFieldType(sourceField.type, targetField?.type),
          label: sourceField.label || sourceField.name || mapping.sourceField,
          placeholder: sourceField.placeholder,
          helperText: sourceField.description || sourceField.helperText,
          defaultValue: transformedValue,
          required: mapping.required,
          order: targetFields.length + index + 1,
          validation: sourceField.validation
            ? {
                ...sourceField.validation,
                required: mapping.required,
              }
            : {
                required: mapping.required,
              },
        };

        // Copy options for select/radio/checkbox fields
        if (
          sourceField.options &&
          ['select', 'radio', 'checkbox'].includes(newField.type)
        ) {
          newField.options = sourceField.options.map((opt: any) => ({
            id: this.generateId(),
            label: opt.label || opt.text || opt.value,
            value: opt.value || opt.label || opt.text,
          }));
        }

        return newField;
      })
      .filter(Boolean) as FormField[];
  }

  /**
   * Validate field mappings
   */
  validateMappings(
    mappings: FieldMapping[],
    sourceFields: any[],
    targetFields: FormField[],
  ): string[] {
    const errors: string[] = [];

    mappings.forEach((mapping, index) => {
      // Check if source field exists
      const sourceField = sourceFields.find(
        (f) => f.name === mapping.sourceField || f.id === mapping.sourceField,
      );
      if (!sourceField) {
        errors.push(
          `Mapping ${index + 1}: Source field '${mapping.sourceField}' not found`,
        );
      }

      // Check if target field exists (when mapping to existing field)
      if (mapping.targetField && !mapping.targetField.startsWith('new_')) {
        const targetField = targetFields.find(
          (f) => f.id === mapping.targetField,
        );
        if (!targetField) {
          errors.push(
            `Mapping ${index + 1}: Target field '${mapping.targetField}' not found`,
          );
        } else {
          // Check field type compatibility
          const compatibilityIssue = this.checkTypeCompatibility(
            sourceField?.type,
            targetField.type,
          );
          if (compatibilityIssue) {
            errors.push(`Mapping ${index + 1}: ${compatibilityIssue}`);
          }
        }
      }
    });

    return errors;
  }

  /**
   * Save integration configuration
   */
  async saveIntegrationConfig(config: IntegrationConfig): Promise<void> {
    try {
      // Validate configuration
      const validationErrors = this.validateIntegrationConfig(config);
      if (validationErrors.length > 0) {
        throw new Error(
          `Configuration validation failed: ${validationErrors.join(', ')}`,
        );
      }

      // Save to database
      await this.persistIntegrationConfig(config);

      // Schedule auto-sync if enabled
      if (config.autoSync) {
        await this.scheduleAutoSync(config);
      }
    } catch (error) {
      throw new Error(
        `Failed to save integration configuration: ${error.message}`,
      );
    }
  }

  /**
   * Execute integration configuration
   */
  async executeIntegration(configId: string): Promise<FormField[]> {
    try {
      const config = await this.getIntegrationConfig(configId);
      if (!config || !config.isActive) {
        throw new Error('Integration configuration not found or inactive');
      }

      // Sync fields from source
      const sourceFields = await this.syncFieldsFromSource(config.source.id);

      // Get target fields
      const targetFields = await this.getFormFields(config.targetFormId);

      // Transform fields based on mappings
      const transformedFields = this.transformFields(
        sourceFields,
        config.mappings,
        targetFields,
      );

      // Apply validation rules
      await this.applyValidationRules(
        transformedFields,
        config.validationRules,
      );

      // Log integration execution
      await this.logIntegrationExecution(configId, transformedFields.length);

      return transformedFields;
    } catch (error) {
      await this.logIntegrationError(configId, error.message);
      throw error;
    }
  }

  // Private helper methods

  private async validateConnection(type: string, config: any): Promise<void> {
    switch (type) {
      case 'api':
        if (!config.endpoint) throw new Error('API endpoint is required');
        // Test API connection
        break;
      case 'database':
        if (!config.credentials?.connectionString)
          throw new Error('Database connection string is required');
        // Test database connection
        break;
      case 'webhook':
        if (!config.endpoint) throw new Error('Webhook endpoint is required');
        break;
    }
  }

  private async syncFromAPI(source: FieldIntegrationSource): Promise<any[]> {
    if (!source.endpoint) throw new Error('API endpoint not configured');

    const response = await fetch(source.endpoint, {
      headers: {
        Authorization: source.credentials?.apiKey
          ? `Bearer ${source.credentials.apiKey}`
          : '',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.fields || [];
  }

  private async syncFromFile(source: FieldIntegrationSource): Promise<any[]> {
    // Mock implementation - in real scenario, handle file parsing
    return [];
  }

  private async syncFromDatabase(
    source: FieldIntegrationSource,
  ): Promise<any[]> {
    // Mock implementation - in real scenario, query database
    return [];
  }

  private async syncFromWebhook(
    source: FieldIntegrationSource,
  ): Promise<any[]> {
    // Mock implementation - in real scenario, handle webhook data
    return [];
  }

  private async syncFromExternalForm(
    source: FieldIntegrationSource,
  ): Promise<any[]> {
    // Mock implementation - in real scenario, integrate with external form builders
    return [];
  }

  private applyTransformation(
    value: any,
    transformation: string,
    customTransformation?: string,
  ): any {
    if (!value) return value;

    switch (transformation) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'date_format':
        return new Date(value).toISOString().split('T')[0];
      case 'custom':
        // In real implementation, execute custom transformation code safely
        return value;
      default:
        return value;
    }
  }

  private mapFieldType(
    sourceType: string,
    preferredType?: FormFieldType,
  ): FormFieldType {
    const typeMap: Record<string, FormFieldType> = {
      string: 'text',
      text: 'text',
      email: 'email',
      phone: 'tel',
      telephone: 'tel',
      number: 'number',
      integer: 'number',
      date: 'date',
      time: 'time',
      datetime: 'date',
      boolean: 'checkbox',
      select: 'select',
      dropdown: 'select',
      radio: 'radio',
      checkbox: 'checkbox',
      textarea: 'textarea',
      file: 'file',
    };

    return preferredType || typeMap[sourceType?.toLowerCase()] || 'text';
  }

  private checkTypeCompatibility(
    sourceType: string,
    targetType: FormFieldType,
  ): string | null {
    const incompatibleMappings = [
      {
        source: 'number',
        target: 'email',
        message: 'Cannot map number field to email field',
      },
      {
        source: 'date',
        target: 'number',
        message: 'Cannot map date field to number field',
      },
      {
        source: 'boolean',
        target: 'text',
        message: 'Boolean field should map to checkbox, not text',
      },
    ];

    const issue = incompatibleMappings.find(
      (mapping) =>
        mapping.source === sourceType?.toLowerCase() &&
        mapping.target === targetType,
    );

    return issue?.message || null;
  }

  private validateIntegrationConfig(config: IntegrationConfig): string[] {
    const errors: string[] = [];

    if (!config.name?.trim()) errors.push('Configuration name is required');
    if (!config.source) errors.push('Integration source is required');
    if (!config.targetFormId) errors.push('Target form ID is required');
    if (!config.mappings || config.mappings.length === 0)
      errors.push('At least one field mapping is required');

    return errors;
  }

  private generateId(): string {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Mock database methods - in real implementation, use actual database
  private async saveIntegrationSource(
    source: FieldIntegrationSource,
  ): Promise<void> {
    console.log('Saving integration source:', source);
  }

  private async getIntegrationSource(
    id: string,
  ): Promise<FieldIntegrationSource | null> {
    console.log('Getting integration source:', id);
    return null;
  }

  private async updateSourceMetadata(
    id: string,
    updates: Partial<FieldIntegrationSource>,
  ): Promise<void> {
    console.log('Updating source metadata:', id, updates);
  }

  private async persistIntegrationConfig(
    config: IntegrationConfig,
  ): Promise<void> {
    console.log('Persisting integration config:', config);
  }

  private async getIntegrationConfig(
    id: string,
  ): Promise<IntegrationConfig | null> {
    console.log('Getting integration config:', id);
    return null;
  }

  private async getFormFields(formId: string): Promise<FormField[]> {
    console.log('Getting form fields:', formId);
    return [];
  }

  private async applyValidationRules(
    fields: FormField[],
    rules: any[],
  ): Promise<void> {
    console.log('Applying validation rules:', rules);
  }

  private async scheduleAutoSync(config: IntegrationConfig): Promise<void> {
    console.log('Scheduling auto sync:', config);
  }

  private async logIntegrationExecution(
    configId: string,
    fieldCount: number,
  ): Promise<void> {
    console.log('Logging integration execution:', configId, fieldCount);
  }

  private async logIntegrationError(
    configId: string,
    error: string,
  ): Promise<void> {
    console.log('Logging integration error:', configId, error);
  }
}

export const fieldIntegrationService = FieldIntegrationService.getInstance();
