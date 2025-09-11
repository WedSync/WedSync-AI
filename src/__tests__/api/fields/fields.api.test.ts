/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/fields/route';
import { POST as validatePOST } from '@/app/api/fields/validate/route';
import {
  GET as templatesGET,
  POST as templatesPOST,
} from '@/app/api/fields/templates/route';
import { POST as transformPOST } from '@/app/api/fields/transform/route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { organization_id: 'test-org-id' },
      }),
      range: jest.fn().mockReturnThis(),
      // Mock for fields query
      then: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'field-1',
            type: 'text',
            label: 'Test Field',
            forms: { organization_id: 'test-org-id' },
          },
        ],
        error: null,
      }),
    })),
  })),
}));

// Mock FieldEngine
jest.mock('@/lib/field-engine/FieldEngine', () => ({
  fieldEngine: {
    createField: jest.fn((type, options = {}) => ({
      id: 'test-field-id',
      type,
      label: options.label || 'Test Field',
      order: options.order || 0,
      ...options,
    })),
    validateField: jest.fn(() => ({
      isValid: true,
      errors: [],
      warnings: [],
    })),
    validateFields: jest.fn(() => ({
      isValid: true,
      errors: [],
      warnings: [],
    })),
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
    getFieldTemplatesByCategory: jest.fn(() => [
      {
        id: 'wedding-basic-info',
        name: 'Wedding Basic Information',
        description: 'Essential wedding details',
        category: 'wedding',
        tags: ['wedding', 'basic'],
        fields: [
          { type: 'text', label: 'Bride Name' },
          { type: 'text', label: 'Groom Name' },
        ],
      },
    ]),
    createFieldsFromTemplate: jest.fn(() => [
      {
        id: 'field-1',
        type: 'text',
        label: 'Bride Name',
        order: 0,
      },
      {
        id: 'field-2',
        type: 'text',
        label: 'Groom Name',
        order: 1,
      },
    ]),
    getFieldTemplate: jest.fn((id) => {
      if (id === 'wedding-basic-info') {
        return {
          id: 'wedding-basic-info',
          name: 'Wedding Basic Information',
          description: 'Essential wedding details',
          category: 'wedding',
          tags: ['wedding', 'basic'],
          fields: [],
        };
      }
      return undefined;
    }),
    evaluateConditionalLogic: jest.fn(() => true),
    getFieldAnalytics: jest.fn(() => ({
      fieldId: 'test-field',
      usageCount: 10,
      validationErrors: 1,
      completionRate: 90,
      avgFillTime: 30,
      lastUsed: new Date(),
    })),
  },
}));

describe('/api/fields', () => {
  describe('GET /api/fields', () => {
    test('should return fields for authorized user', async () => {
      const request = new NextRequest('http://localhost/api/fields?limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.pagination).toBeDefined();
    });

    test('should handle query parameters', async () => {
      const request = new NextRequest(
        'http://localhost/api/fields?type=text&limit=5&offset=10',
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(5);
      expect(data.pagination.offset).toBe(10);
    });

    test('should validate query parameters', async () => {
      const request = new NextRequest(
        'http://localhost/api/fields?limit=invalid',
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });
  });

  describe('POST /api/fields', () => {
    test('should create a new field', async () => {
      const fieldData = {
        type: 'text',
        label: 'Test Field',
        placeholder: 'Enter text',
        required: true,
      };

      const request = new NextRequest('http://localhost/api/fields', {
        method: 'POST',
        body: JSON.stringify(fieldData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe('text');
      expect(data.data.label).toBe('Test Field');
      expect(data.validation).toBeDefined();
    });

    test('should validate required fields', async () => {
      const invalidData = {
        type: 'text',
        // Missing required label
      };

      const request = new NextRequest('http://localhost/api/fields', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeInstanceOf(Array);
    });

    test('should validate field type', async () => {
      const invalidData = {
        type: 'invalid-type',
        label: 'Test Field',
      };

      const request = new NextRequest('http://localhost/api/fields', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });
  });
});

describe('/api/fields/validate', () => {
  test('should validate single field', async () => {
    const validationData = {
      field: {
        id: 'test-field',
        type: 'text',
        label: 'Test Field',
        required: true,
      },
      value: 'Test Value',
    };

    const request = new NextRequest('http://localhost/api/fields/validate', {
      method: 'POST',
      body: JSON.stringify(validationData),
    });

    const response = await validatePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.fieldId).toBe('test-field');
    expect(data.data.isValid).toBe(true);
    expect(data.data.errors).toBeInstanceOf(Array);
    expect(data.data.warnings).toBeInstanceOf(Array);
  });

  test('should validate multiple fields', async () => {
    const validationData = {
      fields: [
        {
          id: 'field-1',
          type: 'text',
          label: 'Field 1',
          required: true,
        },
        {
          id: 'field-2',
          type: 'email',
          label: 'Field 2',
          required: false,
        },
      ],
      values: {
        'field-1': 'Test Value',
        'field-2': 'test@example.com',
      },
    };

    const request = new NextRequest('http://localhost/api/fields/validate', {
      method: 'POST',
      body: JSON.stringify(validationData),
    });

    const response = await validatePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.overall).toBeDefined();
    expect(data.data.fields).toBeDefined();
    expect(data.data.crossFieldIssues).toBeDefined();
  });

  test('should handle invalid request format', async () => {
    const invalidData = {
      invalid: 'data',
    };

    const request = new NextRequest('http://localhost/api/fields/validate', {
      method: 'POST',
      body: JSON.stringify(invalidData),
    });

    const response = await validatePOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid request format');
  });
});

describe('/api/fields/templates', () => {
  test('should get all templates', async () => {
    const request = new NextRequest('http://localhost/api/fields/templates');
    const response = await templatesGET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeInstanceOf(Array);
    expect(data.pagination).toBeDefined();
  });

  test('should filter templates by category', async () => {
    const request = new NextRequest(
      'http://localhost/api/fields/templates?category=wedding',
    );
    const response = await templatesGET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data[0].category).toBe('wedding');
  });

  test('should search templates', async () => {
    const request = new NextRequest(
      'http://localhost/api/fields/templates?search=wedding',
    );
    const response = await templatesGET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  test('should create fields from template', async () => {
    const templateData = {
      templateId: 'wedding-basic-info',
    };

    const request = new NextRequest('http://localhost/api/fields/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });

    const response = await templatesPOST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.template).toBeDefined();
    expect(data.data.fields).toBeInstanceOf(Array);
    expect(data.data.metadata.fieldsCreated).toBeGreaterThan(0);
  });

  test('should handle non-existent template', async () => {
    const templateData = {
      templateId: 'non-existent',
    };

    const request = new NextRequest('http://localhost/api/fields/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });

    const response = await templatesPOST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Template not found');
  });
});

describe('/api/fields/transform', () => {
  test('should transform single field value', async () => {
    const transformData = {
      field: {
        id: 'email-field',
        type: 'email',
        label: 'Email',
      },
      value: '  TEST@EXAMPLE.COM  ',
      options: {
        normalize: true,
        sanitize: false,
      },
    };

    const request = new NextRequest('http://localhost/api/fields/transform', {
      method: 'POST',
      body: JSON.stringify(transformData),
    });

    const response = await transformPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.fieldId).toBe('email-field');
    expect(data.data.transformedValue).toBe('  test@example.com  ');
    expect(data.data.transformation).toBeDefined();
  });

  test('should transform multiple field values', async () => {
    const transformData = {
      fields: [
        {
          id: 'field-1',
          type: 'email',
          label: 'Email',
        },
        {
          id: 'field-2',
          type: 'text',
          label: 'Name',
        },
      ],
      values: {
        'field-1': '  TEST@EXAMPLE.COM  ',
        'field-2': 'John Doe',
      },
      options: {
        normalize: true,
      },
    };

    const request = new NextRequest('http://localhost/api/fields/transform', {
      method: 'POST',
      body: JSON.stringify(transformData),
    });

    const response = await transformPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.transformedValues).toBeDefined();
    expect(data.data.transformationLog).toBeDefined();
    expect(data.data.summary).toBeDefined();
  });

  test('should evaluate conditional logic', async () => {
    const conditionalData = {
      operation: 'conditional',
      field: {
        id: 'conditional-field',
        conditionalLogic: {
          show: true,
          when: 'trigger-field',
          equals: 'show-me',
        },
      },
      allValues: {
        'trigger-field': 'show-me',
      },
    };

    const request = new NextRequest('http://localhost/api/fields/transform', {
      method: 'POST',
      body: JSON.stringify(conditionalData),
    });

    const response = await transformPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.fieldId).toBe('conditional-field');
    expect(data.data.shouldShow).toBe(true);
  });

  test('should handle invalid request format', async () => {
    const invalidData = {
      invalid: 'format',
    };

    const request = new NextRequest('http://localhost/api/fields/transform', {
      method: 'POST',
      body: JSON.stringify(invalidData),
    });

    const response = await transformPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid request format');
  });
});

describe('Authentication and Authorization', () => {
  test('should handle unauthorized requests', async () => {
    // Mock auth failure
    const mockCreateClient = jest.requireMock(
      '@/lib/supabase/server',
    ).createClient;
    mockCreateClient.mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Unauthorized'),
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/fields');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  test('should handle missing organization', async () => {
    const mockCreateClient = jest.requireMock(
      '@/lib/supabase/server',
    ).createClient;
    mockCreateClient.mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user' } },
          error: null,
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null, // No organization
        }),
      })),
    });

    const request = new NextRequest('http://localhost/api/fields');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Organization not found');
  });
});

describe('Error Handling', () => {
  test('should handle internal server errors gracefully', async () => {
    // Mock FieldEngine to throw an error
    const mockFieldEngine = jest.requireMock(
      '@/lib/field-engine/FieldEngine',
    ).fieldEngine;
    mockFieldEngine.createField.mockImplementationOnce(() => {
      throw new Error('Internal error');
    });

    const fieldData = {
      type: 'text',
      label: 'Test Field',
    };

    const request = new NextRequest('http://localhost/api/fields', {
      method: 'POST',
      body: JSON.stringify(fieldData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  test('should handle malformed JSON', async () => {
    const request = new NextRequest('http://localhost/api/fields', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
