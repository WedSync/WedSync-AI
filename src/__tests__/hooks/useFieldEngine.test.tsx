/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useFieldEngine } from '@/hooks/useFieldEngine';
import { FormFieldType } from '@/types/forms';

// Mock FieldEngine
jest.mock('@/lib/field-engine/FieldEngine', () => ({
  fieldEngine: {
    createField: jest.fn((type, options = {}) => ({
      id: `mock-${type}-${Date.now()}`,
      type,
      label: options.label || `Test ${type} Field`,
      order: options.order || 0,
      required: options.required || false,
      ...options,
    })),
    validateField: jest.fn((field, value) => {
      if (field.required && (!value || value === '')) {
        return {
          isValid: false,
          errors: [
            { field: field.id, message: 'Field is required', type: 'required' },
          ],
        };
      }
      return { isValid: true, errors: [] };
    }),
    validateFields: jest.fn((fields, values) => {
      const errors: any[] = [];
      fields.forEach((field) => {
        const value = values[field.id];
        if (field.required && (!value || value === '')) {
          errors.push({
            field: field.id,
            message: 'Field is required',
            type: 'required',
          });
        }
      });
      return { isValid: errors.length === 0, errors, warnings: [] };
    }),
    transformField: jest.fn((field, value, options) => {
      if (
        options?.normalize &&
        field.type === 'email' &&
        typeof value === 'string'
      ) {
        return value.toLowerCase().trim();
      }
      return value;
    }),
    createFieldsFromTemplate: jest.fn((templateId) => {
      if (templateId === 'wedding-basic-info') {
        return [
          {
            id: 'bride-name',
            type: 'text',
            label: 'Bride Name',
            required: true,
            order: 0,
          },
          {
            id: 'groom-name',
            type: 'text',
            label: 'Groom Name',
            required: true,
            order: 1,
          },
        ];
      }
      throw new Error('Template not found');
    }),
    getPopularTemplates: jest.fn((limit) =>
      [
        { id: 'template-1', name: 'Popular Template 1' },
        { id: 'template-2', name: 'Popular Template 2' },
      ].slice(0, limit),
    ),
    evaluateConditionalLogic: jest.fn((field, values) => {
      if (field.conditionalLogic) {
        const { when, equals } = field.conditionalLogic;
        return values[when] === equals;
      }
      return true;
    }),
  },
}));

describe('useFieldEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with empty state', () => {
      const { result } = renderHook(() => useFieldEngine());

      expect(result.current.fields).toEqual([]);
      expect(result.current.values).toEqual({});
      expect(result.current.validationResults).toEqual({});
      expect(result.current.isValid).toBe(true);
      expect(result.current.isValidating).toBe(false);
      expect(result.current.transformedValues).toEqual({});
    });

    test('should accept configuration options', () => {
      const { result } = renderHook(() =>
        useFieldEngine({
          autoValidate: false,
          autoTransform: false,
        }),
      );

      expect(result.current.fields).toEqual([]);
      expect(result.current.values).toEqual({});
    });
  });

  describe('Field Management', () => {
    test('should create and add field', () => {
      const { result } = renderHook(() => useFieldEngine());

      act(() => {
        const field = result.current.createField('text', {
          label: 'Test Field',
        });
        result.current.addField(field);
      });

      expect(result.current.fields).toHaveLength(1);
      expect(result.current.fields[0].type).toBe('text');
      expect(result.current.fields[0].label).toBe('Test Field');
    });

    test('should remove field', () => {
      const { result } = renderHook(() => useFieldEngine());

      let fieldId: string;

      act(() => {
        const field = result.current.createField('text', {
          label: 'Test Field',
        });
        fieldId = field.id;
        result.current.addField(field);
        result.current.setValue(fieldId, 'test value');
      });

      expect(result.current.fields).toHaveLength(1);
      expect(result.current.values[fieldId]).toBe('test value');

      act(() => {
        result.current.removeField(fieldId);
      });

      expect(result.current.fields).toHaveLength(0);
      expect(result.current.values[fieldId]).toBeUndefined();
    });

    test('should update field', () => {
      const { result } = renderHook(() => useFieldEngine());

      let fieldId: string;

      act(() => {
        const field = result.current.createField('text', {
          label: 'Original Label',
        });
        fieldId = field.id;
        result.current.addField(field);
      });

      act(() => {
        result.current.updateField(fieldId, { label: 'Updated Label' });
      });

      expect(result.current.fields[0].label).toBe('Updated Label');
    });

    test('should get field by ID', () => {
      const { result } = renderHook(() => useFieldEngine());

      let fieldId: string;

      act(() => {
        const field = result.current.createField('text', {
          label: 'Test Field',
        });
        fieldId = field.id;
        result.current.addField(field);
      });

      const foundField = result.current.getFieldById(fieldId);
      expect(foundField).toBeDefined();
      expect(foundField?.label).toBe('Test Field');

      const notFoundField = result.current.getFieldById('non-existent');
      expect(notFoundField).toBeUndefined();
    });
  });

  describe('Value Management', () => {
    test('should set single value', () => {
      const { result } = renderHook(() => useFieldEngine());

      let fieldId: string;

      act(() => {
        const field = result.current.createField('text', {
          label: 'Test Field',
        });
        fieldId = field.id;
        result.current.addField(field);
        result.current.setValue(fieldId, 'test value');
      });

      expect(result.current.values[fieldId]).toBe('test value');
    });

    test('should set multiple values', () => {
      const { result } = renderHook(() => useFieldEngine());

      let field1Id: string, field2Id: string;

      act(() => {
        const field1 = result.current.createField('text', { label: 'Field 1' });
        const field2 = result.current.createField('text', { label: 'Field 2' });
        field1Id = field1.id;
        field2Id = field2.id;
        result.current.addField(field1);
        result.current.addField(field2);
      });

      act(() => {
        result.current.setValues({
          [field1Id]: 'value 1',
          [field2Id]: 'value 2',
        });
      });

      expect(result.current.values[field1Id]).toBe('value 1');
      expect(result.current.values[field2Id]).toBe('value 2');
    });

    test('should clear all values', () => {
      const { result } = renderHook(() => useFieldEngine());

      let fieldId: string;

      act(() => {
        const field = result.current.createField('text', {
          label: 'Test Field',
        });
        fieldId = field.id;
        result.current.addField(field);
        result.current.setValue(fieldId, 'test value');
      });

      expect(result.current.values[fieldId]).toBe('test value');

      act(() => {
        result.current.clearValues();
      });

      expect(result.current.values).toEqual({});
    });
  });

  describe('Validation with Auto-Validate', () => {
    test('should auto-validate when setting value', () => {
      const { result } = renderHook(() =>
        useFieldEngine({ autoValidate: true }),
      );

      let fieldId: string;

      act(() => {
        const field = result.current.createField('text', {
          label: 'Required Field',
          required: true,
        });
        fieldId = field.id;
        result.current.addField(field);
      });

      // Set empty value - should fail validation
      act(() => {
        result.current.setValue(fieldId, '');
      });

      expect(result.current.validationResults[fieldId]).toBeDefined();
      expect(result.current.validationResults[fieldId].isValid).toBe(false);
      expect(result.current.isValid).toBe(false);

      // Set valid value - should pass validation
      act(() => {
        result.current.setValue(fieldId, 'valid value');
      });

      expect(result.current.validationResults[fieldId].isValid).toBe(true);
      expect(result.current.isValid).toBe(true);
    });

    test('should validate single field manually', () => {
      const { result } = renderHook(() =>
        useFieldEngine({ autoValidate: false }),
      );

      let fieldId: string;

      act(() => {
        const field = result.current.createField('text', {
          label: 'Required Field',
          required: true,
        });
        fieldId = field.id;
        result.current.addField(field);
      });

      let validationResult: any;

      act(() => {
        validationResult = result.current.validateField(fieldId, '');
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
    });

    test('should validate all fields', () => {
      const { result } = renderHook(() =>
        useFieldEngine({ autoValidate: false }),
      );

      let field1Id: string, field2Id: string;

      act(() => {
        const field1 = result.current.createField('text', {
          label: 'Required Field 1',
          required: true,
        });
        const field2 = result.current.createField('text', {
          label: 'Required Field 2',
          required: true,
        });
        field1Id = field1.id;
        field2Id = field2.id;
        result.current.addField(field1);
        result.current.addField(field2);
        result.current.setValues({
          [field1Id]: 'valid value',
          [field2Id]: '', // Invalid
        });
      });

      let validationResult: any;

      act(() => {
        validationResult = result.current.validateAllFields();
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(result.current.validationResults[field1Id].isValid).toBe(true);
      expect(result.current.validationResults[field2Id].isValid).toBe(false);
    });
  });

  describe('Transformation with Auto-Transform', () => {
    test('should auto-transform when setting value', () => {
      const { result } = renderHook(() =>
        useFieldEngine({
          autoTransform: true,
          transformOptions: { normalize: true },
        }),
      );

      let fieldId: string;

      act(() => {
        const field = result.current.createField('email', {
          label: 'Email Field',
        });
        fieldId = field.id;
        result.current.addField(field);
        result.current.setValue(fieldId, '  TEST@EXAMPLE.COM  ');
      });

      expect(result.current.transformedValues[fieldId]).toBe(
        '  test@example.com  ',
      );
    });

    test('should transform field manually', () => {
      const { result } = renderHook(() =>
        useFieldEngine({ autoTransform: false }),
      );

      let fieldId: string;

      act(() => {
        const field = result.current.createField('email', {
          label: 'Email Field',
        });
        fieldId = field.id;
        result.current.addField(field);
      });

      let transformedValue: any;

      act(() => {
        transformedValue = result.current.transformField(
          fieldId,
          '  TEST@EXAMPLE.COM  ',
          { normalize: true },
        );
      });

      expect(transformedValue).toBe('  test@example.com  ');
    });

    test('should transform all fields', () => {
      const { result } = renderHook(() =>
        useFieldEngine({ autoTransform: false }),
      );

      let field1Id: string, field2Id: string;

      act(() => {
        const field1 = result.current.createField('email', {
          label: 'Email Field',
        });
        const field2 = result.current.createField('text', {
          label: 'Text Field',
        });
        field1Id = field1.id;
        field2Id = field2.id;
        result.current.addField(field1);
        result.current.addField(field2);
        result.current.setValues({
          [field1Id]: '  TEST@EXAMPLE.COM  ',
          [field2Id]: 'text value',
        });
      });

      let transformedValues: any;

      act(() => {
        transformedValues = result.current.transformAllFields({
          normalize: true,
        });
      });

      expect(transformedValues[field1Id]).toBe('  test@example.com  ');
      expect(transformedValues[field2Id]).toBe('text value');
    });
  });

  describe('Template Management', () => {
    test('should load template', async () => {
      const { result } = renderHook(() => useFieldEngine());

      await act(async () => {
        await result.current.loadTemplate('wedding-basic-info');
      });

      expect(result.current.fields).toHaveLength(2);
      expect(result.current.fields[0].label).toBe('Bride Name');
      expect(result.current.fields[1].label).toBe('Groom Name');
    });

    test('should handle template loading error', async () => {
      const { result } = renderHook(() => useFieldEngine());

      await expect(
        act(async () => {
          await result.current.loadTemplate('non-existent-template');
        }),
      ).rejects.toThrow('Template not found');
    });

    test('should get popular templates', () => {
      const { result } = renderHook(() => useFieldEngine());

      const templates = result.current.getPopularTemplates(5);
      expect(templates).toHaveLength(2);
      expect(templates[0].name).toBe('Popular Template 1');
    });
  });

  describe('Conditional Logic', () => {
    test('should evaluate conditional logic', () => {
      const { result } = renderHook(() => useFieldEngine());

      let conditionalFieldId: string, triggerFieldId: string;

      act(() => {
        const triggerField = result.current.createField('select', {
          label: 'Trigger Field',
        });
        const conditionalField = result.current.createField('text', {
          label: 'Conditional Field',
          conditionalLogic: {
            show: true,
            when: triggerField.id,
            equals: 'show-me',
          },
        });

        triggerFieldId = triggerField.id;
        conditionalFieldId = conditionalField.id;

        result.current.addField(triggerField);
        result.current.addField(conditionalField);
      });

      // Should not show initially
      expect(result.current.evaluateConditionalLogic(conditionalFieldId)).toBe(
        false,
      );

      act(() => {
        result.current.setValue(triggerFieldId, 'show-me');
      });

      // Should show now
      expect(result.current.evaluateConditionalLogic(conditionalFieldId)).toBe(
        true,
      );
    });

    test('should get visible fields', () => {
      const { result } = renderHook(() => useFieldEngine());

      let visibleFieldId: string, hiddenFieldId: string, triggerFieldId: string;

      act(() => {
        const triggerField = result.current.createField('select', {
          label: 'Trigger Field',
        });
        const visibleField = result.current.createField('text', {
          label: 'Always Visible',
        });
        const hiddenField = result.current.createField('text', {
          label: 'Conditionally Visible',
          conditionalLogic: {
            show: true,
            when: triggerField.id,
            equals: 'show-me',
          },
        });

        triggerFieldId = triggerField.id;
        visibleFieldId = visibleField.id;
        hiddenFieldId = hiddenField.id;

        result.current.addField(triggerField);
        result.current.addField(visibleField);
        result.current.addField(hiddenField);
      });

      let visibleFields = result.current.getVisibleFields();
      expect(visibleFields).toHaveLength(2); // trigger and visible field

      act(() => {
        result.current.setValue(triggerFieldId, 'show-me');
      });

      visibleFields = result.current.getVisibleFields();
      expect(visibleFields).toHaveLength(3); // all fields now visible
    });
  });

  describe('Utilities', () => {
    test('should reset all state', () => {
      const { result } = renderHook(() => useFieldEngine());

      act(() => {
        const field = result.current.createField('text', {
          label: 'Test Field',
        });
        result.current.addField(field);
        result.current.setValue(field.id, 'test value');
      });

      expect(result.current.fields).toHaveLength(1);
      expect(Object.keys(result.current.values)).toHaveLength(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.fields).toHaveLength(0);
      expect(result.current.values).toEqual({});
      expect(result.current.validationResults).toEqual({});
      expect(result.current.transformedValues).toEqual({});
      expect(result.current.isValid).toBe(true);
    });

    test('should clear validation for specific field', () => {
      const { result } = renderHook(() =>
        useFieldEngine({ autoValidate: true }),
      );

      let fieldId: string;

      act(() => {
        const field = result.current.createField('text', {
          label: 'Required Field',
          required: true,
        });
        fieldId = field.id;
        result.current.addField(field);
        result.current.setValue(fieldId, ''); // This should create validation error
      });

      expect(result.current.validationResults[fieldId]).toBeDefined();

      act(() => {
        result.current.clearValidation(fieldId);
      });

      expect(result.current.validationResults[fieldId]).toBeUndefined();
    });

    test('should clear all validation', () => {
      const { result } = renderHook(() =>
        useFieldEngine({ autoValidate: true }),
      );

      let field1Id: string, field2Id: string;

      act(() => {
        const field1 = result.current.createField('text', {
          label: 'Required Field 1',
          required: true,
        });
        const field2 = result.current.createField('text', {
          label: 'Required Field 2',
          required: true,
        });
        field1Id = field1.id;
        field2Id = field2.id;
        result.current.addField(field1);
        result.current.addField(field2);
        result.current.setValues({
          [field1Id]: '',
          [field2Id]: '',
        });
      });

      expect(Object.keys(result.current.validationResults)).toHaveLength(2);
      expect(result.current.isValid).toBe(false);

      act(() => {
        result.current.clearValidation();
      });

      expect(result.current.validationResults).toEqual({});
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle operations on empty fields array', () => {
      const { result } = renderHook(() => useFieldEngine());

      const validationResult = result.current.validateAllFields();
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      const transformedValues = result.current.transformAllFields();
      expect(transformedValues).toEqual({});

      const visibleFields = result.current.getVisibleFields();
      expect(visibleFields).toEqual([]);
    });

    test('should handle non-existent field operations', () => {
      const { result } = renderHook(() => useFieldEngine());

      const validationResult = result.current.validateField(
        'non-existent',
        'value',
      );
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors[0].type).toBe('system');

      const transformedValue = result.current.transformField(
        'non-existent',
        'value',
      );
      expect(transformedValue).toBe('value'); // Should return unchanged

      const shouldShow =
        result.current.evaluateConditionalLogic('non-existent');
      expect(shouldShow).toBe(true); // Should default to true
    });
  });
});
