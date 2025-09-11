import { z } from 'zod';
import { FormField } from '@/types/forms';

// Create Zod schema from form field configuration
export function createFieldSchema(field: FormField): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  // Base schema based on field type
  switch (field.type) {
    case 'email':
      schema = z.string().email('Please enter a valid email address');
      break;

    case 'tel':
      schema = z
        .string()
        .regex(
          /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/,
          'Please enter a valid phone number',
        );
      break;

    case 'number':
      schema = z.number({
        required_error: `${field.label} is required`,
        invalid_type_error: 'Please enter a valid number',
      });

      if (field.min !== undefined) {
        schema = (schema as z.ZodNumber).min(
          field.min,
          `Minimum value is ${field.min}`,
        );
      }
      if (field.max !== undefined) {
        schema = (schema as z.ZodNumber).max(
          field.max,
          `Maximum value is ${field.max}`,
        );
      }
      break;

    case 'date':
      schema = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date');
      break;

    case 'checkbox':
      schema = z
        .array(z.string())
        .min(field.required ? 1 : 0, `${field.label} is required`);
      break;

    case 'file':
      schema = z.any(); // File validation handled separately
      break;

    default:
      schema = z.string();
  }

  // Apply common validations for string types
  if (schema instanceof z.ZodString) {
    if (field.required) {
      schema = schema.min(1, `${field.label} is required`);
    }

    if (field.minLength) {
      schema = schema.min(
        field.minLength,
        `Minimum length is ${field.minLength} characters`,
      );
    }

    if (field.maxLength) {
      schema = schema.max(
        field.maxLength,
        `Maximum length is ${field.maxLength} characters`,
      );
    }

    if (field.pattern) {
      try {
        const regex = new RegExp(field.pattern);
        schema = schema.regex(regex, 'Invalid format');
      } catch (e) {
        console.error('Invalid regex pattern:', field.pattern);
      }
    }
  }

  // Make optional if not required (except for fields already handled)
  if (!field.required && field.type !== 'checkbox') {
    schema = schema.optional().or(z.literal(''));
  }

  return schema;
}

// Create form schema from fields array
export function createFormSchema(fields: FormField[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    shape[field.id] = createFieldSchema(field);
  });

  return z.object(shape);
}

// Validate single field value
export function validateField(
  field: FormField,
  value: string | number | boolean | string[] | File | null,
): string | null {
  try {
    const schema = createFieldSchema(field);
    schema.parse(value);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid value';
    }
    return 'Validation error';
  }
}

// Validate entire form data
export function validateFormData(
  fields: FormField[],
  data: Record<string, any>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const schema = createFormSchema(fields);

  try {
    schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
    }
  }

  return errors;
}

// Transform form data for submission
export function transformFormData(
  fields: FormField[],
  data: Record<string, any>,
): Record<string, any> {
  const transformed: Record<string, any> = {};

  fields.forEach((field) => {
    const value = data[field.id];

    // Transform based on field type
    switch (field.type) {
      case 'number':
        transformed[field.id] = value ? parseFloat(value) : null;
        break;

      case 'checkbox':
        transformed[field.id] = Array.isArray(value) ? value : [];
        break;

      case 'file':
        // Handle file data separately
        transformed[field.id] = value
          ? {
              name: value.name,
              size: value.size,
              type: value.type,
            }
          : null;
        break;

      default:
        transformed[field.id] = value || null;
    }
  });

  return transformed;
}

// Create validation messages for fields
export function getValidationMessage(field: FormField): string {
  const messages: string[] = [];

  if (field.required) {
    messages.push('Required');
  }

  if (field.minLength && field.maxLength) {
    messages.push(`${field.minLength}-${field.maxLength} characters`);
  } else if (field.minLength) {
    messages.push(`Min ${field.minLength} characters`);
  } else if (field.maxLength) {
    messages.push(`Max ${field.maxLength} characters`);
  }

  if (field.type === 'email') {
    messages.push('Valid email required');
  }

  if (field.type === 'tel') {
    messages.push('Valid phone number required');
  }

  if (
    field.type === 'number' &&
    (field.min !== undefined || field.max !== undefined)
  ) {
    if (field.min !== undefined && field.max !== undefined) {
      messages.push(`Between ${field.min} and ${field.max}`);
    } else if (field.min !== undefined) {
      messages.push(`Minimum ${field.min}`);
    } else if (field.max !== undefined) {
      messages.push(`Maximum ${field.max}`);
    }
  }

  return messages.join(' • ');
}
