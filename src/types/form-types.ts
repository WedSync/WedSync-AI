// Re-export types from forms.ts for backward compatibility
export * from './forms';

// Additional schema types for different use cases
import { FormField, FormFieldOption } from './forms';

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  fields: FormSchemaField[];
  settings: {
    requireAuth?: boolean;
    allowAnonymous?: boolean;
    collectEmail?: boolean;
    enableCaptcha?: boolean;
  };
}

export interface FormSchemaField extends Omit<FormField, 'options'> {
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    allowedTypes?: string[];
    maxSize?: number;
    maxFiles?: number;
    allowedExtensions?: string[];
    allowedMimeTypes?: string[];
    rows?: number;
  };
  options?: {
    choices?: Array<{
      id: string;
      label: string;
      value: string;
    }>;
    accept?: string;
    multiple?: boolean;
  };
}
