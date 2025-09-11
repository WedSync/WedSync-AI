/**
 * TemplateManager Tests
 * WS-235: Support Operations Ticket Management System
 * 
 * Tests for the template management and canned responses service
 */

import TemplateManager from '@/lib/support/template-manager';
import type { Template, TemplateVariable, ProcessedTemplate } from '@/lib/support/template-manager';

// Mock Supabase
const mockSupabaseSelect = jest.fn();
const mockSupabaseInsert = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => ({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
      eq: jest.fn(() => ({
        single: mockSupabaseSelect,
        order: jest.fn(() => ({
          data: [],
          error: null
        })),
        limit: jest.fn(() => ({
          data: [],
          error: null
        }))
      })),
      or: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        }))
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(() => ({
          data: [],
          error: null
        }))
      }))
    })),
    rpc: mockSupabaseRpc
  }
}));

describe('TemplateManager', () => {
  let templateManager: TemplateManager;

  const mockTemplate: Template = {
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
    is_active: true,
    usage_count: 25,
    avg_rating: 4.2,
    created_by: 'admin-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    templateManager = new TemplateManager();
    jest.clearAllMocks();

    // Default mock responses
    mockSupabaseSelect.mockReturnValue({
      data: [],
      error: null
    });

    mockSupabaseInsert.mockReturnValue({
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: { id: 'new-template-123' },
          error: null
        }))
      }))
    });

    mockSupabaseRpc.mockReturnValue({
      data: null,
      error: null
    });
  });

  describe('getTemplatesForUser', () => {
    it('should return templates accessible by user tier', async () => {
      const mockTemplates = [
        { ...mockTemplate, tier_access: 'all' },
        { ...mockTemplate, id: 'template-456', tier_access: 'professional' },
        { ...mockTemplate, id: 'template-789', tier_access: 'enterprise' }
      ];

      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              data: mockTemplates.filter(t => 
                t.tier_access === 'all' || t.tier_access === 'professional'
              ),
              error: null
            }))
          }))
        }))
      });

      const result = await templateManager.getTemplatesForUser(
        'user-123', 
        'professional'
      );

      expect(result).toHaveLength(2);
      expect(result.some(t => t.tier_access === 'enterprise')).toBe(false);
    });

    it('should filter templates by category when specified', async () => {
      const mockTemplates = [
        { ...mockTemplate, category: 'billing' },
        { ...mockTemplate, id: 'template-456', category: 'technical_support' },
        { ...mockTemplate, id: 'template-789', category: 'billing' }
      ];

      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              data: mockTemplates.filter(t => t.category === 'billing'),
              error: null
            }))
          }))
        }))
      });

      const result = await templateManager.getTemplatesForUser(
        'user-123',
        'professional', 
        'billing'
      );

      expect(result).toHaveLength(2);
      expect(result.every(t => t.category === 'billing')).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      });

      const result = await templateManager.getTemplatesForUser('user-123', 'professional');

      expect(result).toEqual([]);
    });
  });

  describe('processTemplate', () => {
    const variables = {
      customer_name: 'John Smith',
      subscription_plan: 'Professional',
      agent_name: 'Sarah Johnson'
    };

    beforeEach(() => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockTemplate,
            error: null
          }))
        }))
      });
    });

    it('should process template with variable substitution', async () => {
      const result = await templateManager.processTemplate(
        'template-123',
        variables,
        'user-123',
        'professional'
      );

      expect(result).toBeDefined();
      expect(result!.content).toContain('Hi John Smith,');
      expect(result!.content).toContain('your Professional subscription');
      expect(result!.content).toContain('Best regards,\nSarah Johnson');
      expect(result!.missing_variables).toEqual([]);
      expect(result!.variables_replaced).toEqual(variables);
    });

    it('should identify missing required variables', async () => {
      const incompleteVariables = {
        customer_name: 'John Smith',
        // Missing subscription_plan and agent_name
      };

      const result = await templateManager.processTemplate(
        'template-123',
        incompleteVariables,
        'user-123',
        'professional'
      );

      expect(result).toBeDefined();
      expect(result!.missing_variables).toContain('subscription_plan');
      expect(result!.missing_variables).toContain('agent_name');
      expect(result!.content).toContain('{{subscription_plan}}'); // Unsubstituted
      expect(result!.content).toContain('{{agent_name}}'); // Unsubstituted
    });

    it('should use default values when provided', async () => {
      const templateWithDefaults: Template = {
        ...mockTemplate,
        variables: [
          {
            name: 'customer_name',
            type: 'text',
            description: 'Customer name',
            required: true
          },
          {
            name: 'agent_name',
            type: 'text',
            description: 'Agent name',
            required: false,
            default_value: 'Support Team'
          }
        ]
      };

      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: templateWithDefaults,
            error: null
          }))
        }))
      });

      const minimalVariables = {
        customer_name: 'John Smith'
      };

      const result = await templateManager.processTemplate(
        'template-123',
        minimalVariables,
        'user-123',
        'professional'
      );

      expect(result).toBeDefined();
      expect(result!.content).toContain('Support Team'); // Default value used
      expect(result!.variables_replaced.agent_name).toBe('Support Team');
    });

    it('should handle template not found', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { code: 'PGRST116' }
          }))
        }))
      });

      const result = await templateManager.processTemplate(
        'non-existent',
        variables,
        'user-123',
        'professional'
      );

      expect(result).toBeNull();
    });

    it('should track template usage when ticket_id provided', async () => {
      await templateManager.processTemplate(
        'template-123',
        variables,
        'user-123',
        'professional',
        'ticket-456'
      );

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          template_id: 'template-123',
          used_by: 'user-123',
          ticket_id: 'ticket-456',
          variables_used: variables
        })
      );

      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'increment_template_usage',
        { template_id: 'template-123' }
      );
    });

    it('should verify tier access before processing', async () => {
      const enterpriseTemplate = {
        ...mockTemplate,
        tier_access: 'enterprise'
      };

      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: enterpriseTemplate,
            error: null
          }))
        }))
      });

      const result = await templateManager.processTemplate(
        'template-123',
        variables,
        'user-123',
        'professional' // User doesn't have enterprise access
      );

      expect(result).toBeNull();
    });
  });

  describe('createTemplate', () => {
    const newTemplate = {
      name: 'new_template',
      category: 'technical_support',
      subject: 'Technical Issue Resolution',
      content: 'Dear {{customer_name}}, your issue has been resolved.',
      variables: [
        {
          name: 'customer_name',
          type: 'text' as const,
          description: 'Customer name',
          required: true
        }
      ],
      tags: ['technical', 'resolution'],
      tier_access: 'professional' as const,
      is_active: true,
      created_by: 'user-123'
    };

    it('should create new template successfully', async () => {
      const templateId = await templateManager.createTemplate(newTemplate);

      expect(templateId).toBe('new-template-123');
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: newTemplate.name,
          category: newTemplate.category,
          content: newTemplate.content,
          variables: newTemplate.variables,
          created_by: newTemplate.created_by
        })
      );
    });

    it('should handle validation errors', async () => {
      mockSupabaseInsert.mockReturnValue({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { message: 'Validation failed', code: '23505' }
          }))
        }))
      });

      const templateId = await templateManager.createTemplate(newTemplate);

      expect(templateId).toBeNull();
    });
  });

  describe('searchTemplates', () => {
    const mockSearchResults = [
      { ...mockTemplate, name: 'billing_help' },
      { ...mockTemplate, id: 'template-456', name: 'payment_issue', content: 'Payment help content' },
      { ...mockTemplate, id: 'template-789', tags: ['payment', 'urgent'] }
    ];

    it('should search templates by name and content', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                data: mockSearchResults.filter(t => 
                  t.name.includes('payment') || t.content.includes('payment')
                ),
                error: null
              }))
            }))
          }))
        }))
      });

      const result = await templateManager.searchTemplates(
        'payment',
        'user-123',
        'professional'
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(t => 
        t.name.includes('payment') || 
        t.content.includes('payment') ||
        t.tags.includes('payment')
      )).toBe(true);
    });

    it('should apply search filters', async () => {
      const filters = {
        category: 'billing',
        vendor_type: 'photographer',
        tier_access: 'professional'
      };

      await templateManager.searchTemplates(
        'payment',
        'user-123',
        'professional',
        filters
      );

      // Verify filters were applied in the query
      expect(mockSupabaseSelect).toHaveBeenCalled();
    });
  });

  describe('getSuggestedTemplates', () => {
    const mockSuggestions = [
      { ...mockTemplate, category: 'billing', usage_count: 50 },
      { ...mockTemplate, id: 'template-456', category: 'billing', usage_count: 30 },
      { ...mockTemplate, id: 'template-789', category: 'billing', usage_count: 10 }
    ];

    it('should return templates for specific category', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                data: mockSuggestions,
                error: null
              }))
            }))
          }))
        }))
      });

      const result = await templateManager.getSuggestedTemplates(
        'billing',
        'billing',
        'photographer',
        'professional'
      );

      expect(result).toEqual(mockSuggestions);
      expect(result.every(t => t.category === 'billing')).toBe(true);
    });

    it('should prioritize vendor-specific templates', async () => {
      const vendorSpecificTemplate = {
        ...mockTemplate,
        vendor_type: 'photographer',
        usage_count: 100
      };

      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                data: [vendorSpecificTemplate, ...mockSuggestions],
                error: null
              }))
            }))
          }))
        }))
      });

      const result = await templateManager.getSuggestedTemplates(
        'billing',
        'billing', 
        'photographer',
        'professional'
      );

      // Vendor-specific template should be included
      expect(result.some(t => t.vendor_type === 'photographer')).toBe(true);
    });

    it('should limit number of suggestions', async () => {
      const manyTemplates = Array.from({ length: 20 }, (_, i) => ({
        ...mockTemplate,
        id: `template-${i}`,
        usage_count: i
      }));

      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn((limit) => ({
                data: manyTemplates.slice(0, limit),
                error: null
              }))
            }))
          }))
        }))
      });

      const result = await templateManager.getSuggestedTemplates(
        'billing',
        'billing',
        'photographer',
        'professional'
      );

      expect(result.length).toBeLessThanOrEqual(5); // Default limit
    });
  });

  describe('updateTemplate', () => {
    const updates = {
      name: 'updated_template_name',
      content: 'Updated content with {{new_variable}}',
      tags: ['updated', 'payment']
    };

    beforeEach(() => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { created_by: 'user-123' },
            error: null
          }))
        }))
      });

      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn(() => ({
          data: null,
          error: null
        }))
      });
    });

    it('should update template when user owns it', async () => {
      const success = await templateManager.updateTemplate(
        'template-123',
        updates,
        'user-123'
      );

      expect(success).toBe(true);
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updated_at: expect.any(String)
        })
      );
    });

    it('should prevent unauthorized updates', async () => {
      const success = await templateManager.updateTemplate(
        'template-123',
        updates,
        'other-user-456' // Different user
      );

      expect(success).toBe(false);
      expect(mockSupabaseUpdate).not.toHaveBeenCalled();
    });

    it('should handle non-existent templates', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { code: 'PGRST116' }
          }))
        }))
      });

      const success = await templateManager.updateTemplate(
        'non-existent',
        updates,
        'user-123'
      );

      expect(success).toBe(false);
    });
  });

  describe('rateTemplate', () => {
    it('should record template rating and feedback', async () => {
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn(() => ({
          data: null,
          error: null
        }))
      });

      const success = await templateManager.rateTemplate(
        'template-123',
        'user-123',
        'ticket-456',
        4,
        'Very helpful template'
      );

      expect(success).toBe(true);
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_rating: 4,
          feedback: 'Very helpful template'
        })
      );

      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'update_template_avg_rating',
        { template_id: 'template-123' }
      );
    });

    it('should validate rating range', async () => {
      await expect(templateManager.rateTemplate(
        'template-123',
        'user-123', 
        'ticket-456',
        6 // Invalid rating > 5
      )).rejects.toThrow('Rating must be between 1 and 5');

      await expect(templateManager.rateTemplate(
        'template-123',
        'user-123',
        'ticket-456', 
        0 // Invalid rating < 1
      )).rejects.toThrow('Rating must be between 1 and 5');
    });
  });

  describe('getTemplateAnalytics', () => {
    it('should return template usage analytics', async () => {
      const mockAnalytics = {
        total_usage: 150,
        unique_users: 25,
        avg_rating: 4.2,
        recent_usage: [
          {
            template_id: 'template-123',
            used_by: 'user-123',
            used_at: new Date().toISOString()
          }
        ]
      };

      mockSupabaseRpc.mockReturnValue({
        data: mockAnalytics,
        error: null
      });

      const result = await templateManager.getTemplateAnalytics('template-123', 30);

      expect(result).toEqual(mockAnalytics);
      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'get_template_analytics',
        expect.objectContaining({
          template_id: 'template-123'
        })
      );
    });

    it('should return default analytics when RPC fails', async () => {
      mockSupabaseRpc.mockReturnValue({
        data: null,
        error: { message: 'RPC failed' }
      });

      const result = await templateManager.getTemplateAnalytics('template-123');

      expect(result).toEqual({
        total_usage: 0,
        unique_users: 0,
        avg_rating: 0,
        recent_usage: []
      });
    });
  });

  describe('initializeWeddingTemplates', () => {
    it('should create built-in wedding templates', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null, // Template doesn't exist
            error: { code: 'PGRST116' }
          }))
        }))
      });

      await templateManager.initializeWeddingTemplates('admin-123');

      // Should create multiple built-in templates
      expect(mockSupabaseInsert).toHaveBeenCalledTimes(3); // wedding_day_emergency, data_recovery_help, payment_failure_help
    });

    it('should skip existing templates', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 'existing-template' },
            error: null
          }))
        }))
      });

      await templateManager.initializeWeddingTemplates('admin-123');

      // Should not create templates that already exist
      expect(mockSupabaseInsert).not.toHaveBeenCalled();
    });
  });

  describe('variable type validation', () => {
    it('should handle different variable types correctly', async () => {
      const templateWithTypes: Template = {
        ...mockTemplate,
        variables: [
          { name: 'customer_email', type: 'email', description: 'Email', required: true },
          { name: 'customer_phone', type: 'phone', description: 'Phone', required: true },
          { name: 'response_date', type: 'date', description: 'Date', required: true },
          { name: 'ticket_count', type: 'number', description: 'Count', required: true }
        ]
      };

      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: templateWithTypes,
            error: null
          }))
        }))
      });

      const variables = {
        customer_email: 'test@example.com',
        customer_phone: '+1-555-0123',
        response_date: '2024-01-15',
        ticket_count: '5'
      };

      const result = await templateManager.processTemplate(
        'template-123',
        variables,
        'user-123',
        'professional'
      );

      expect(result).toBeDefined();
      expect(result!.variables_replaced).toEqual(variables);
    });
  });
});