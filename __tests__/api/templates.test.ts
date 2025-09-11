/**
 * Templates API Integration Tests
 * WS-235: Support Operations Ticket Management System
 * 
 * Tests for the templates API endpoints
 */

import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';
import { GET as getTemplates, POST as createTemplate } from '@/app/api/templates/route';
import { GET as getTemplate, PUT as updateTemplate, DELETE as deleteTemplate } from '@/app/api/templates/[id]/route';
import { POST as processTemplate } from '@/app/api/templates/[id]/process/route';
import { POST as getTemplateSuggestions } from '@/app/api/templates/suggestions/route';

// Mock Supabase
const mockSupabaseUser = {
  id: 'user-123',
  email: 'agent@example.com'
};

const mockTemplate = {
  id: 'template-123',
  name: 'payment_failure_help',
  category: 'billing',
  subject: 'Payment Issue Resolved - Account Restored',
  content: 'Hi {{customer_name}},\n\nGood news! I have resolved the payment issue with your {{subscription_plan}} subscription.\n\nYour account is now fully active.\n\nBest regards,\n{{agent_name}}',
  variables: [
    {
      name: 'customer_name',
      type: 'text',
      description: 'Customer name',
      required: true
    },
    {
      name: 'subscription_plan',
      type: 'text',
      description: 'Subscription plan name',
      required: true
    },
    {
      name: 'agent_name',
      type: 'text',
      description: 'Agent name',
      required: true
    }
  ],
  tags: ['payment', 'billing', 'resolution'],
  tier_access: 'all',
  vendor_type: null,
  is_active: true,
  usage_count: 25,
  avg_rating: 4.2,
  created_by: 'admin-123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockProfile = {
  id: 'user-123',
  role: 'support_agent',
  organizations: {
    id: 'org-123',
    name: 'Test Organization',
    subscription_tier: 'professional'
  }
};

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerComponentClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => ({
        data: { user: mockSupabaseUser },
        error: null
      }))
    },
    from: jest.fn((table: string) => {
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        insert: jest.fn(() => mockQuery),
        update: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        or: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        limit: jest.fn(() => mockQuery),
        single: jest.fn(() => {
          if (table === 'user_profiles') {
            return { data: mockProfile, error: null };
          }
          if (table === 'support_templates') {
            return { data: mockTemplate, error: null };
          }
          return { data: null, error: null };
        }),
        data: [mockTemplate],
        error: null,
        count: 1
      };
      return mockQuery;
    }),
    rpc: jest.fn(() => ({
      data: null,
      error: null
    }))
  }))
}));

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

// Mock TemplateManager
jest.mock('@/lib/support/template-manager', () => {
  return jest.fn().mockImplementation(() => ({
    getTemplatesForUser: jest.fn().mockResolvedValue([mockTemplate]),
    getTemplate: jest.fn().mockResolvedValue(mockTemplate),
    createTemplate: jest.fn().mockResolvedValue('new-template-123'),
    updateTemplate: jest.fn().mockResolvedValue(true),
    processTemplate: jest.fn().mockResolvedValue({
      subject: 'Payment Issue Resolved - Account Restored',
      content: 'Hi John Smith,\n\nGood news! I have resolved the payment issue with your Professional subscription.\n\nYour account is now fully active.\n\nBest regards,\nSarah Johnson',
      variables_replaced: {
        customer_name: 'John Smith',
        subscription_plan: 'Professional',
        agent_name: 'Sarah Johnson'
      },
      missing_variables: []
    }),
    searchTemplates: jest.fn().mockResolvedValue([mockTemplate]),
    getSuggestedTemplates: jest.fn().mockResolvedValue([
      { ...mockTemplate, relevance_score: 85, match_reasons: ['Category match', 'Popular template'] }
    ])
  }));
});

describe('/api/templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/templates', () => {
    it('should return templates for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'GET'
      });

      const response = await getTemplates(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.templates).toBeDefined();
      expect(responseData.templates).toHaveLength(1);
      expect(responseData.pagination).toBeDefined();
      expect(responseData.user_tier).toBe('professional');
    });

    it('should filter templates by category', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates?category=billing', {
        method: 'GET'
      });

      const response = await getTemplates(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.templates).toBeDefined();
    });

    it('should search templates by query', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates?search=payment', {
        method: 'GET'
      });

      const response = await getTemplates(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.templates).toBeDefined();
    });

    it('should paginate results', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates?page=1&limit=5', {
        method: 'GET'
      });

      const response = await getTemplates(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.pagination.current_page).toBe(1);
      expect(responseData.pagination.per_page).toBe(5);
    });

    it('should filter by vendor type', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates?vendor_type=photographer', {
        method: 'GET'
      });

      const response = await getTemplates(request);
      expect(response.status).toBe(200);
    });

    it('should validate query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates?page=invalid&limit=999', {
        method: 'GET'
      });

      const response = await getTemplates(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid parameters');
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Mock unauthenticated user
      const createServerComponentClient = require('@supabase/auth-helpers-nextjs').createServerComponentClient;
      createServerComponentClient.mockReturnValueOnce({
        auth: {
          getUser: jest.fn(() => ({
            data: { user: null },
            error: { message: 'No user found' }
          }))
        }
      });

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'GET'
      });

      const response = await getTemplates(request);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/templates', () => {
    const validTemplateData = {
      name: 'new_billing_template',
      category: 'billing',
      subject: 'New Payment Template',
      content: 'Dear {{customer_name}}, regarding your {{subscription_plan}} subscription...',
      variables: [
        {
          name: 'customer_name',
          type: 'text',
          description: 'Customer name',
          required: true
        },
        {
          name: 'subscription_plan',
          type: 'text',
          description: 'Subscription plan',
          required: true
        }
      ],
      tags: ['payment', 'new'],
      tier_access: 'professional',
      is_active: true
    };

    it('should create new template for authorized user', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validTemplateData)
      });

      const response = await createTemplate(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.message).toBe('Template created successfully');
      expect(responseData.template).toBeDefined();
    });

    it('should validate template data', async () => {
      const invalidData = {
        name: '', // Empty name
        category: 'billing',
        content: '', // Empty content
        variables: []
      };

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      });

      const response = await createTemplate(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid template data');
      expect(responseData.details).toBeDefined();
    });

    it('should check user permissions', async () => {
      // Mock user without template creation permissions
      const createServerComponentClient = require('@supabase/auth-helpers-nextjs').createServerComponentClient;
      createServerComponentClient.mockReturnValueOnce({
        auth: {
          getUser: jest.fn(() => ({
            data: { user: mockSupabaseUser },
            error: null
          }))
        },
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { ...mockProfile, role: 'user' },
                error: null
              }))
            }))
          }))
        }))
      });

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validTemplateData)
      });

      const response = await createTemplate(request);
      expect(response.status).toBe(403);
    });

    it('should validate variable definitions', async () => {
      const dataWithInvalidVariables = {
        ...validTemplateData,
        variables: [
          {
            name: 'invalid_var',
            type: 'invalid_type', // Invalid type
            description: 'Invalid variable',
            required: true
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataWithInvalidVariables)
      });

      const response = await createTemplate(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid template data');
    });
  });
});

describe('/api/templates/[id]', () => {
  const templateId = 'template-123';

  describe('GET /api/templates/[id]', () => {
    it('should return specific template', async () => {
      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}`, {
        method: 'GET'
      });

      const response = await getTemplate(request, { params: { id: templateId } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.template).toBeDefined();
      expect(responseData.template.id).toBe(templateId);
    });

    it('should include analytics when requested', async () => {
      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}?include_analytics=true`, {
        method: 'GET'
      });

      const response = await getTemplate(request, { params: { id: templateId } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.analytics).toBeDefined();
    });

    it('should return 404 for non-existent template', async () => {
      const TemplateManager = require('@/lib/support/template-manager');
      const mockTemplateManager = new TemplateManager();
      mockTemplateManager.getTemplate.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/templates/non-existent', {
        method: 'GET'
      });

      const response = await getTemplate(request, { params: { id: 'non-existent' } });
      expect(response.status).toBe(404);
    });

    it('should check tier access permissions', async () => {
      // Mock enterprise template for professional user
      const enterpriseTemplate = { ...mockTemplate, tier_access: 'enterprise' };
      const TemplateManager = require('@/lib/support/template-manager');
      const mockTemplateManager = new TemplateManager();
      mockTemplateManager.getTemplate.mockResolvedValueOnce(null); // Access denied

      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}`, {
        method: 'GET'
      });

      const response = await getTemplate(request, { params: { id: templateId } });
      expect(response.status).toBe(404); // Returns 404 instead of 403 for security
    });
  });

  describe('PUT /api/templates/[id]', () => {
    const updateData = {
      name: 'updated_template_name',
      content: 'Updated template content with {{customer_name}}',
      tags: ['updated', 'payment']
    };

    it('should update template for authorized user', async () => {
      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const response = await updateTemplate(request, { params: { id: templateId } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.message).toBe('Template updated successfully');
      expect(responseData.template).toBeDefined();
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        name: '', // Empty name
        variables: [
          {
            name: 'invalid',
            type: 'invalid_type',
            description: '',
            required: 'not_boolean' // Invalid boolean
          }
        ]
      };

      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidUpdate)
      });

      const response = await updateTemplate(request, { params: { id: templateId } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid update data');
    });

    it('should check user permissions', async () => {
      // Mock user without update permissions
      const createServerComponentClient = require('@supabase/auth-helpers-nextjs').createServerComponentClient;
      createServerComponentClient.mockReturnValueOnce({
        auth: {
          getUser: jest.fn(() => ({
            data: { user: mockSupabaseUser },
            error: null
          }))
        },
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { ...mockProfile, role: 'user' },
                error: null
              }))
            }))
          }))
        }))
      });

      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const response = await updateTemplate(request, { params: { id: templateId } });
      expect(response.status).toBe(403);
    });

    it('should handle template not found', async () => {
      const TemplateManager = require('@/lib/support/template-manager');
      const mockTemplateManager = new TemplateManager();
      mockTemplateManager.updateTemplate.mockResolvedValueOnce(false);

      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const response = await updateTemplate(request, { params: { id: templateId } });
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/templates/[id]', () => {
    it('should soft delete template for authorized user', async () => {
      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}`, {
        method: 'DELETE'
      });

      const response = await deleteTemplate(request, { params: { id: templateId } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.message).toBe('Template deleted successfully');
    });

    it('should check user permissions for deletion', async () => {
      // Mock user without delete permissions
      const createServerComponentClient = require('@supabase/auth-helpers-nextjs').createServerComponentClient;
      createServerComponentClient.mockReturnValueOnce({
        auth: {
          getUser: jest.fn(() => ({
            data: { user: mockSupabaseUser },
            error: null
          }))
        },
        from: jest.fn(() => {
          let callCount = 0;
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => {
                  callCount++;
                  if (callCount === 1) {
                    // First call - user profile
                    return { data: { ...mockProfile, role: 'user' }, error: null };
                  } else {
                    // Second call - template ownership check
                    return { data: null, error: { message: 'Access denied' } };
                  }
                })
              }))
            }))
          };
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}`, {
        method: 'DELETE'
      });

      const response = await deleteTemplate(request, { params: { id: templateId } });
      expect(response.status).toBe(403);
    });
  });
});

describe('/api/templates/[id]/process', () => {
  const templateId = 'template-123';

  describe('POST /api/templates/[id]/process', () => {
    const validVariables = {
      customer_name: 'John Smith',
      subscription_plan: 'Professional',
      agent_name: 'Sarah Johnson'
    };

    it('should process template with variables', async () => {
      const requestData = {
        variables: validVariables,
        ticket_id: 'ticket-456'
      };

      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const response = await processTemplate(request, { params: { id: templateId } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.processed_template).toBeDefined();
      expect(responseData.processed_template.content).toContain('John Smith');
      expect(responseData.processed_template.content).toContain('Professional');
      expect(responseData.usage_tracked).toBe(true);
    });

    it('should validate template variables', async () => {
      const requestData = {
        variables: validVariables,
        validate_only: true
      };

      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const response = await processTemplate(request, { params: { id: templateId } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.validation).toBeDefined();
      expect(responseData.validation.is_valid).toBe(true);
      expect(responseData.preview).toBeDefined();
    });

    it('should identify missing variables', async () => {
      const incompleteVariables = {
        customer_name: 'John Smith'
        // Missing subscription_plan and agent_name
      };

      const TemplateManager = require('@/lib/support/template-manager');
      const mockTemplateManager = new TemplateManager();
      mockTemplateManager.processTemplate.mockResolvedValueOnce({
        subject: 'Payment Issue Resolved - Account Restored',
        content: 'Hi John Smith,\n\nGood news! I have resolved the payment issue with your {{subscription_plan}} subscription.\n\nBest regards,\n{{agent_name}}',
        variables_replaced: { customer_name: 'John Smith' },
        missing_variables: ['subscription_plan', 'agent_name']
      });

      const requestData = {
        variables: incompleteVariables,
        validate_only: true
      };

      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const response = await processTemplate(request, { params: { id: templateId } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.validation.is_valid).toBe(false);
      expect(responseData.validation.missing_variables).toContain('subscription_plan');
      expect(responseData.validation.missing_variables).toContain('agent_name');
    });

    it('should handle template not found', async () => {
      const TemplateManager = require('@/lib/support/template-manager');
      const mockTemplateManager = new TemplateManager();
      mockTemplateManager.processTemplate.mockResolvedValueOnce(null);

      const requestData = {
        variables: validVariables
      };

      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const response = await processTemplate(request, { params: { id: templateId } });
      expect(response.status).toBe(404);
    });

    it('should validate request data', async () => {
      const invalidRequest = {
        variables: 'not_an_object' // Should be an object
      };

      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidRequest)
      });

      const response = await processTemplate(request, { params: { id: templateId } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid processing request');
    });

    it('should check tier access before processing', async () => {
      // Mock enterprise template for professional user
      const TemplateManager = require('@/lib/support/template-manager');
      const mockTemplateManager = new TemplateManager();
      mockTemplateManager.processTemplate.mockResolvedValueOnce(null); // Access denied

      const requestData = {
        variables: validVariables
      };

      const request = new NextRequest(`http://localhost:3000/api/templates/${templateId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const response = await processTemplate(request, { params: { id: templateId } });
      expect(response.status).toBe(404);
    });
  });
});

describe('/api/templates/suggestions', () => {
  describe('POST /api/templates/suggestions', () => {
    const validSuggestionsRequest = {
      ticket_category: 'billing',
      ticket_type: 'billing',
      vendor_type: 'photographer',
      ticket_priority: 'high',
      customer_tier: 'professional',
      is_wedding_emergency: false
    };

    it('should return template suggestions for support agents', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validSuggestionsRequest)
      });

      const response = await getTemplateSuggestions(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.suggestions).toBeDefined();
      expect(responseData.suggestions).toHaveLength(1);
      expect(responseData.suggestions[0].relevance_score).toBeDefined();
      expect(responseData.suggestions[0].match_reasons).toBeDefined();
      expect(responseData.search_context).toBeDefined();
    });

    it('should prioritize wedding emergency templates', async () => {
      const emergencyRequest = {
        ...validSuggestionsRequest,
        is_wedding_emergency: true
      };

      const request = new NextRequest('http://localhost:3000/api/templates/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emergencyRequest)
      });

      const response = await getTemplateSuggestions(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.suggestions).toBeDefined();
      expect(responseData.search_context.is_emergency).toBe(true);
    });

    it('should validate request data', async () => {
      const invalidRequest = {
        ticket_category: '', // Empty required field
        ticket_type: 'billing'
      };

      const request = new NextRequest('http://localhost:3000/api/templates/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidRequest)
      });

      const response = await getTemplateSuggestions(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid suggestions request');
    });

    it('should check user permissions for suggestions', async () => {
      // Mock user without support agent permissions
      const createServerComponentClient = require('@supabase/auth-helpers-nextjs').createServerComponentClient;
      createServerComponentClient.mockReturnValueOnce({
        auth: {
          getUser: jest.fn(() => ({
            data: { user: mockSupabaseUser },
            error: null
          }))
        },
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { ...mockProfile, role: 'user' },
                error: null
              }))
            }))
          }))
        }))
      });

      const request = new NextRequest('http://localhost:3000/api/templates/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validSuggestionsRequest)
      });

      const response = await getTemplateSuggestions(request);
      expect(response.status).toBe(403);
    });

    it('should limit number of suggestions', async () => {
      const requestWithLimit = {
        ...validSuggestionsRequest,
        limit: 3
      };

      const request = new NextRequest('http://localhost:3000/api/templates/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestWithLimit)
      });

      const response = await getTemplateSuggestions(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should handle text relevance scoring', async () => {
      const requestWithText = {
        ...validSuggestionsRequest,
        ticket_subject: 'Payment failed for subscription',
        ticket_content: 'My credit card was declined when trying to upgrade to professional plan'
      };

      const request = new NextRequest('http://localhost:3000/api/templates/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestWithText)
      });

      const response = await getTemplateSuggestions(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.suggestions).toBeDefined();
      expect(responseData.suggestions[0].relevance_score).toBeGreaterThan(0);
    });
  });
});