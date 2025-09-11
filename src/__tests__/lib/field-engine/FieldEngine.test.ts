/**
 * @jest-environment jsdom
 */

import { fieldEngine } from '@/lib/field-engine/FieldEngine';
import { FormField, FormFieldType } from '@/types/forms';

describe('FieldEngine', () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  describe('Field Creation', () => {
    test('should create a basic text field', () => {
      const field = fieldEngine.createField('text', {
        label: 'Test Field',
        placeholder: 'Enter text',
      });

      expect(field).toMatchObject({
        type: 'text',
        label: 'Test Field',
        placeholder: 'Enter text',
        order: 0,
      });
      expect(field.id).toBeDefined();
      expect(field.id).toMatch(/^[a-zA-Z0-9_-]{21}$/); // nanoid format
    });

    test('should create an email field with validation', () => {
      const field = fieldEngine.createField('email', {
        label: 'Email Address',
        required: true,
      });

      expect(field.type).toBe('email');
      expect(field.label).toBe('Email Address');
      expect(field.required).toBe(true);
      expect(field.validation?.pattern).toBeDefined();
    });

    test('should create a number field with business rules', () => {
      const field = fieldEngine.createField('number', {
        label: 'Number of Guests',
      });

      expect(field.type).toBe('number');
      expect(field.validation?.min).toBe(1);
      expect(field.validation?.max).toBe(1000);
    });

    test('should create a wedding date field with future date validation', () => {
      const field = fieldEngine.createField('date', {
        label: 'Wedding Date',
      });

      expect(field.type).toBe('date');
      expect(field.validation?.min).toBeDefined();
      expect(field.validation?.min).toBeGreaterThan(Date.now() - 1000); // Within last second
    });
  });

  describe('Field Validation', () => {
    test('should validate required text field', () => {
      const field = fieldEngine.createField('text', {
        label: 'Name',
        required: true,
      });

      // Test empty value
      const emptyResult = fieldEngine.validateField(field, '');
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.errors).toHaveLength(1);
      expect(emptyResult.errors[0].type).toBe('required');

      // Test valid value
      const validResult = fieldEngine.validateField(field, 'John Doe');
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
    });

    test('should validate email field format', () => {
      const field = fieldEngine.createField('email', {
        label: 'Email Address',
      });

      // Test invalid email
      const invalidResult = fieldEngine.validateField(field, 'invalid-email');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].type).toBe('format');

      // Test valid email
      const validResult = fieldEngine.validateField(field, 'test@example.com');
      expect(validResult.isValid).toBe(true);
    });

    test('should validate phone number format', () => {
      const field = fieldEngine.createField('tel', {
        label: 'Phone Number',
      });

      // Test invalid phone
      const invalidResult = fieldEngine.validateField(field, 'abc123');
      expect(invalidResult.isValid).toBe(false);

      // Test valid phone numbers
      const validNumbers = ['+1234567890', '1234567890', '+447123456789'];
      validNumbers.forEach((phone) => {
        const result = fieldEngine.validateField(field, phone);
        expect(result.isValid).toBe(true);
      });
    });

    test('should validate custom length constraints', () => {
      const field = fieldEngine.createField('text', {
        label: 'Short Text',
        validation: {
          minLength: 3,
          maxLength: 10,
        },
      });

      // Test too short
      const shortResult = fieldEngine.validateField(field, 'ab');
      expect(shortResult.isValid).toBe(false);
      expect(shortResult.errors[0].type).toBe('minLength');

      // Test too long
      const longResult = fieldEngine.validateField(
        field,
        'this is way too long',
      );
      expect(longResult.isValid).toBe(false);
      expect(longResult.errors[0].type).toBe('maxLength');

      // Test valid length
      const validResult = fieldEngine.validateField(field, 'hello');
      expect(validResult.isValid).toBe(true);
    });

    test('should validate number ranges', () => {
      const field = fieldEngine.createField('number', {
        label: 'Score',
        validation: {
          min: 0,
          max: 100,
        },
      });

      // Test below minimum
      const belowResult = fieldEngine.validateField(field, -1);
      expect(belowResult.isValid).toBe(false);
      expect(belowResult.errors[0].type).toBe('min');

      // Test above maximum
      const aboveResult = fieldEngine.validateField(field, 101);
      expect(aboveResult.isValid).toBe(false);
      expect(aboveResult.errors[0].type).toBe('max');

      // Test valid range
      const validResult = fieldEngine.validateField(field, 50);
      expect(validResult.isValid).toBe(true);
    });
  });

  describe('Multiple Fields Validation', () => {
    test('should validate multiple fields together', () => {
      const fields: FormField[] = [
        fieldEngine.createField('text', { label: 'Name', required: true }),
        fieldEngine.createField('email', { label: 'Email', required: true }),
        fieldEngine.createField('tel', { label: 'Phone' }),
      ];

      const values = {
        [fields[0].id]: 'John Doe',
        [fields[1].id]: 'john@example.com',
        [fields[2].id]: '1234567890',
      };

      const result = fieldEngine.validateFields(fields, values);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect cross-field validation issues', () => {
      const fields: FormField[] = [
        fieldEngine.createField('text', {
          label: "Bride's Name",
          required: true,
        }),
        fieldEngine.createField('text', {
          label: "Groom's Name",
          required: true,
        }),
      ];

      const values = {
        [fields[0].id]: 'John Doe',
        [fields[1].id]: 'John Doe', // Same name
      };

      const result = fieldEngine.validateFields(fields, values);
      expect(result.isValid).toBe(true); // No errors, but should have warnings
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });
  });

  describe('Field Transformation', () => {
    test('should normalize email addresses', () => {
      const field = fieldEngine.createField('email', { label: 'Email' });

      const transformed = fieldEngine.transformField(
        field,
        '  TEST@EXAMPLE.COM  ',
        { normalize: true },
      );

      expect(transformed).toBe('test@example.com');
    });

    test('should normalize phone numbers', () => {
      const field = fieldEngine.createField('tel', { label: 'Phone' });

      const transformed = fieldEngine.transformField(field, '(555) 123-4567', {
        normalize: true,
      });

      expect(transformed).toBe('5551234567');
    });

    test('should sanitize text input', () => {
      const field = fieldEngine.createField('text', { label: 'Name' });

      const transformed = fieldEngine.transformField(
        field,
        '<script>alert("xss")</script>John',
        { sanitize: true },
      );

      expect(transformed).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;John',
      );
    });

    test('should apply default values', () => {
      const field = fieldEngine.createField('text', {
        label: 'Country',
        defaultValue: 'United Kingdom',
      });

      const transformed = fieldEngine.transformField(field, '', {
        applyDefaults: true,
      });

      expect(transformed).toBe('United Kingdom');
    });
  });

  describe('Template Management', () => {
    test('should get wedding basic information template', () => {
      const template = fieldEngine.getFieldTemplate('wedding-basic-info');

      expect(template).toBeDefined();
      expect(template!.name).toBe('Wedding Basic Information');
      expect(template!.category).toBe('wedding');
      expect(template!.fields.length).toBeGreaterThan(0);
    });

    test('should create fields from template', () => {
      const fields = fieldEngine.createFieldsFromTemplate(
        'contact-information',
      );

      expect(fields.length).toBeGreaterThan(0);
      expect(fields[0].id).toBeDefined();
      expect(fields[0].type).toBeDefined();
      expect(fields[0].label).toBeDefined();
    });

    test('should filter templates by category', () => {
      const weddingTemplates =
        fieldEngine.getFieldTemplatesByCategory('wedding');
      const contactTemplates =
        fieldEngine.getFieldTemplatesByCategory('contact');

      expect(weddingTemplates.length).toBeGreaterThan(0);
      expect(contactTemplates.length).toBeGreaterThan(0);

      weddingTemplates.forEach((template) => {
        expect(template.category).toBe('wedding');
      });

      contactTemplates.forEach((template) => {
        expect(template.category).toBe('contact');
      });
    });

    test('should get popular templates', () => {
      const popular = fieldEngine.getPopularTemplates(5);
      expect(popular.length).toBeLessThanOrEqual(5);
    });

    test('should throw error for invalid template', () => {
      expect(() => {
        fieldEngine.createFieldsFromTemplate('non-existent-template');
      }).toThrow('Template not found');
    });
  });

  describe('Conditional Logic', () => {
    test('should evaluate simple conditional logic', () => {
      const field = fieldEngine.createField('text', {
        label: 'Additional Comments',
        conditionalLogic: {
          show: true,
          when: 'feedback_rating',
          equals: 'poor',
        },
      });

      const values = { feedback_rating: 'poor' };
      const shouldShow = fieldEngine.evaluateConditionalLogic(field, values);
      expect(shouldShow).toBe(true);

      const values2 = { feedback_rating: 'excellent' };
      const shouldNotShow = fieldEngine.evaluateConditionalLogic(
        field,
        values2,
      );
      expect(shouldNotShow).toBe(false);
    });

    test('should evaluate array-based conditional logic', () => {
      const field = fieldEngine.createField('textarea', {
        label: 'Special Requirements',
        conditionalLogic: {
          show: true,
          when: 'services',
          equals: ['catering', 'photography'],
        },
      });

      const shouldShow1 = fieldEngine.evaluateConditionalLogic(field, {
        services: 'catering',
      });
      expect(shouldShow1).toBe(true);

      const shouldShow2 = fieldEngine.evaluateConditionalLogic(field, {
        services: 'photography',
      });
      expect(shouldShow2).toBe(true);

      const shouldNotShow = fieldEngine.evaluateConditionalLogic(field, {
        services: 'flowers',
      });
      expect(shouldNotShow).toBe(false);
    });

    test('should return true for fields without conditional logic', () => {
      const field = fieldEngine.createField('text', {
        label: 'Always Visible',
      });
      const shouldShow = fieldEngine.evaluateConditionalLogic(field, {});
      expect(shouldShow).toBe(true);
    });
  });

  describe('Wedding Business Rules', () => {
    test('should warn about weekend wedding dates', () => {
      const field = fieldEngine.createField('date', { label: 'Wedding Date' });

      // Saturday (high demand)
      const saturday = new Date('2024-06-08'); // This is a Saturday
      const result = fieldEngine.validateField(field, saturday.toISOString());

      expect(result.warnings).toBeDefined();
      expect(
        result.warnings!.some((w) => w.message.includes('Weekend weddings')),
      ).toBe(true);
    });

    test('should warn about large weddings', () => {
      const field = fieldEngine.createField('number', {
        label: 'Number of Guests',
      });

      const result = fieldEngine.validateField(field, 600);

      expect(result.warnings).toBeDefined();
      expect(
        result.warnings!.some((w) => w.message.includes('Large weddings')),
      ).toBe(true);
    });

    test('should warn about intimate weddings', () => {
      const field = fieldEngine.createField('number', {
        label: 'Number of Guests',
      });

      const result = fieldEngine.validateField(field, 8);

      expect(result.warnings).toBeDefined();
      expect(
        result.warnings!.some((w) => w.message.includes('Intimate weddings')),
      ).toBe(true);
    });

    test('should reject past wedding dates', () => {
      const field = fieldEngine.createField('date', { label: 'Wedding Date' });

      const pastDate = new Date('2020-01-01');
      const result = fieldEngine.validateField(field, pastDate.toISOString());

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('future'))).toBe(
        true,
      );
    });
  });

  describe('Analytics Integration', () => {
    test('should track field usage', () => {
      const field = fieldEngine.createField('text', { label: 'Test Field' });

      // Perform some validations to generate analytics
      fieldEngine.validateField(field, 'valid value');
      fieldEngine.validateField(field, ''); // This should fail
      fieldEngine.validateField(field, 'another valid value');

      const analytics = fieldEngine.getFieldAnalytics(field.id);

      expect(analytics).toBeDefined();
      expect(analytics!.usageCount).toBe(3);
      expect(analytics!.validationErrors).toBe(1);
      expect(analytics!.completionRate).toBeCloseTo(66.67, 1);
    });

    test('should return undefined for non-existent field analytics', () => {
      const analytics = fieldEngine.getFieldAnalytics('non-existent-field');
      expect(analytics).toBeUndefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null and undefined values gracefully', () => {
      const field = fieldEngine.createField('text', { label: 'Test Field' });

      const nullResult = fieldEngine.validateField(field, null);
      const undefinedResult = fieldEngine.validateField(field, undefined);

      expect(nullResult.isValid).toBe(true); // Non-required field
      expect(undefinedResult.isValid).toBe(true); // Non-required field
    });

    test('should handle transformation of null values', () => {
      const field = fieldEngine.createField('text', { label: 'Test Field' });

      const transformed = fieldEngine.transformField(field, null, {
        normalize: true,
      });
      expect(transformed).toBeNull();
    });

    test('should handle validation errors gracefully', () => {
      const field = fieldEngine.createField('text', { label: 'Test Field' });

      // Mock console.error to avoid noise in tests
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // This should not crash
      const result = fieldEngine.validateField(field, 'valid value');
      expect(result.isValid).toBe(true);

      consoleSpy.mockRestore();
    });

    test('should handle invalid field types', () => {
      // TypeScript would catch this at compile time, but test runtime behavior
      expect(() => {
        fieldEngine.createField('invalid-type' as FormFieldType);
      }).not.toThrow();
    });
  });
});
