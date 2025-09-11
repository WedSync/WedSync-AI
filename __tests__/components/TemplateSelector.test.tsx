/**
 * TemplateSelector Component Tests
 * WS-235: Support Operations Ticket Management System
 * 
 * Comprehensive test suite for template selection functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TemplateSelector } from '@/components/support/TemplateSelector';
import * as templateManagerModule from '@/lib/support/template-manager';

// Mock the template manager
jest.mock('@/lib/support/template-manager');
const mockTemplateManager = templateManagerModule as jest.Mocked<typeof templateManagerModule>;

// Mock data
const mockTemplates = [
  {
    id: '1',
    name: 'Wedding Day Emergency',
    category: 'emergency',
    subject: 'Immediate Wedding Day Support',
    content: 'We understand your wedding is today and this is urgent. Our emergency team is now handling your case.',
    variables: ['customer_name', 'wedding_date', 'venue'],
    tags: ['wedding_day', 'emergency', 'urgent'],
    tier_access: ['free', 'starter', 'professional', 'scale', 'enterprise'],
    usage_count: 45,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Payment Issue Resolution',
    category: 'billing',
    subject: 'Payment Processing Assistance',
    content: 'Hi {{customer_name}}, we\'re here to help resolve your payment issue quickly.',
    variables: ['customer_name', 'payment_amount', 'transaction_id'],
    tags: ['payment', 'billing', 'finance'],
    tier_access: ['starter', 'professional', 'scale', 'enterprise'],
    usage_count: 32,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Form Builder Help',
    category: 'technical',
    subject: 'Form Builder Troubleshooting',
    content: 'Let\'s get your forms working perfectly for your clients.',
    variables: ['customer_name', 'form_type'],
    tags: ['forms', 'technical', 'troubleshooting'],
    tier_access: ['professional', 'scale', 'enterprise'],
    usage_count: 18,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];

const mockTicket = {
  id: 'ticket-1',
  ticket_id: 'WS-001',
  subject: 'Payment not working',
  description: 'Cannot process payments',
  status: 'open' as const,
  priority: 'high' as const,
  category: 'billing',
  type: 'bug' as const,
  customer: {
    id: 'customer-1',
    name: 'John Photographer',
    email: 'john@example.com',
    user_type: 'supplier' as const,
    tier: 'professional' as const
  }
};

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('TemplateSelector', () => {
  const defaultProps = {
    ticket: mockTicket,
    onTemplateSelect: jest.fn(),
    onTemplateApply: jest.fn(),
    userTier: 'professional' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTemplateManager.TemplateManager.mockImplementation(() => ({
      getTemplatesForTicket: jest.fn().mockResolvedValue(mockTemplates),
      processTemplate: jest.fn().mockResolvedValue({
        subject: 'Processed Subject',
        content: 'Processed content with variables filled'
      }),
      suggestTemplates: jest.fn().mockResolvedValue([mockTemplates[0]]),
      recordUsage: jest.fn().mockResolvedValue(undefined)
    }));
  });

  describe('Template Loading and Display', () => {
    it('should load and display templates for ticket category', async () => {
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('Select Template')).toBeInTheDocument();
      expect(screen.getByText('Loading templates...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
        expect(screen.getByText('Payment Issue Resolution')).toBeInTheDocument();
        expect(screen.getByText('Form Builder Help')).toBeInTheDocument();
      });
    });

    it('should filter templates by user tier access', async () => {
      const starterProps = { ...defaultProps, userTier: 'starter' as const };
      render(<TemplateSelector {...starterProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
        expect(screen.getByText('Payment Issue Resolution')).toBeInTheDocument();
        expect(screen.queryByText('Form Builder Help')).not.toBeInTheDocument();
      });
    });

    it('should show template usage statistics', async () => {
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Used 45 times')).toBeInTheDocument();
        expect(screen.getByText('Used 32 times')).toBeInTheDocument();
        expect(screen.getByText('Used 18 times')).toBeInTheDocument();
      });
    });

    it('should display template categories and tags', async () => {
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('emergency')).toBeInTheDocument();
        expect(screen.getByText('billing')).toBeInTheDocument();
        expect(screen.getByText('technical')).toBeInTheDocument();
      });
    });
  });

  describe('Template Search and Filtering', () => {
    it('should filter templates by search term', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search templates...');
      await user.type(searchInput, 'wedding');

      expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      expect(screen.queryByText('Payment Issue Resolution')).not.toBeInTheDocument();
      expect(screen.queryByText('Form Builder Help')).not.toBeInTheDocument();
    });

    it('should filter templates by category', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText(/emergency|billing|technical/)).toHaveLength(3);
      });

      const categoryFilter = screen.getByRole('combobox', { name: /category/i });
      await user.selectOptions(categoryFilter, 'billing');

      expect(screen.queryByText('Wedding Day Emergency')).not.toBeInTheDocument();
      expect(screen.getByText('Payment Issue Resolution')).toBeInTheDocument();
      expect(screen.queryByText('Form Builder Help')).not.toBeInTheDocument();
    });

    it('should show no results message for invalid search', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search templates...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No templates found matching your criteria')).toBeInTheDocument();
    });
  });

  describe('Template Selection and Preview', () => {
    it('should show template preview when selected', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      });

      const template = screen.getByText('Wedding Day Emergency');
      await user.click(template);

      expect(screen.getByText('Template Preview')).toBeInTheDocument();
      expect(screen.getByText('Immediate Wedding Day Support')).toBeInTheDocument();
      expect(screen.getByText(/We understand your wedding is today/)).toBeInTheDocument();
    });

    it('should highlight template variables in preview', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Payment Issue Resolution')).toBeInTheDocument();
      });

      const template = screen.getByText('Payment Issue Resolution');
      await user.click(template);

      expect(screen.getByText('{{customer_name}}')).toHaveClass('text-blue-600');
    });

    it('should call onTemplateSelect when template is chosen', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      });

      const template = screen.getByText('Wedding Day Emergency');
      await user.click(template);

      expect(defaultProps.onTemplateSelect).toHaveBeenCalledWith(mockTemplates[0]);
    });
  });

  describe('Template Application and Processing', () => {
    it('should process and apply template with variables', async () => {
      const user = userEvent.setup();
      const mockTemplateManager = new templateManagerModule.TemplateManager();
      
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Payment Issue Resolution')).toBeInTheDocument();
      });

      const template = screen.getByText('Payment Issue Resolution');
      await user.click(template);

      const applyButton = screen.getByRole('button', { name: /apply template/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(mockTemplateManager.processTemplate).toHaveBeenCalledWith(
          mockTemplates[1],
          expect.objectContaining({
            customer_name: 'John Photographer',
            customer_email: 'john@example.com'
          })
        );
        expect(defaultProps.onTemplateApply).toHaveBeenCalledWith({
          subject: 'Processed Subject',
          content: 'Processed content with variables filled'
        });
      });
    });

    it('should show variable input form for templates with variables', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      });

      const template = screen.getByText('Wedding Day Emergency');
      await user.click(template);

      expect(screen.getByLabelText('customer_name')).toBeInTheDocument();
      expect(screen.getByLabelText('wedding_date')).toBeInTheDocument();
      expect(screen.getByLabelText('venue')).toBeInTheDocument();
    });

    it('should validate required variables before applying', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      });

      const template = screen.getByText('Wedding Day Emergency');
      await user.click(template);

      const applyButton = screen.getByRole('button', { name: /apply template/i });
      await user.click(applyButton);

      expect(screen.getByText('Please fill in all required variables')).toBeInTheDocument();
      expect(defaultProps.onTemplateApply).not.toHaveBeenCalled();
    });
  });

  describe('Template Suggestions', () => {
    it('should show AI-suggested templates for ticket', async () => {
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Suggested Templates')).toBeInTheDocument();
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      });

      const suggestedSection = screen.getByTestId('suggested-templates');
      expect(within(suggestedSection).getByText('Wedding Day Emergency')).toBeInTheDocument();
    });

    it('should prioritize suggested templates in the list', async () => {
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const templates = screen.getAllByTestId(/template-item/);
        expect(templates[0]).toHaveTextContent('Wedding Day Emergency');
        expect(templates[0]).toHaveClass('border-blue-200'); // Suggested styling
      });
    });
  });

  describe('Usage Analytics', () => {
    it('should record template usage when applied', async () => {
      const user = userEvent.setup();
      const mockTemplateManager = new templateManagerModule.TemplateManager();
      
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      });

      const template = screen.getByText('Wedding Day Emergency');
      await user.click(template);

      // Fill required variables
      await user.type(screen.getByLabelText('customer_name'), 'John Test');
      await user.type(screen.getByLabelText('wedding_date'), '2025-06-15');
      await user.type(screen.getByLabelText('venue'), 'Test Venue');

      const applyButton = screen.getByRole('button', { name: /apply template/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(mockTemplateManager.recordUsage).toHaveBeenCalledWith(
          mockTemplates[0].id,
          'ticket-1',
          'customer-1'
        );
      });
    });

    it('should sort templates by usage count', async () => {
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const templates = screen.getAllByTestId(/template-item/);
        // Wedding Day Emergency (45 uses) should be first
        expect(templates[0]).toHaveTextContent('Wedding Day Emergency');
        expect(templates[0]).toHaveTextContent('Used 45 times');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle template loading errors gracefully', async () => {
      const mockTemplateManager = templateManagerModule.TemplateManager as jest.MockedClass<typeof templateManagerModule.TemplateManager>;
      mockTemplateManager.mockImplementation(() => ({
        getTemplatesForTicket: jest.fn().mockRejectedValue(new Error('API Error')),
        processTemplate: jest.fn(),
        suggestTemplates: jest.fn(),
        recordUsage: jest.fn()
      }));

      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Error loading templates. Please try again.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should handle template processing errors', async () => {
      const user = userEvent.setup();
      const mockTemplateManager = templateManagerModule.TemplateManager as jest.MockedClass<typeof templateManagerModule.TemplateManager>;
      mockTemplateManager.mockImplementation(() => ({
        getTemplatesForTicket: jest.fn().mockResolvedValue(mockTemplates),
        processTemplate: jest.fn().mockRejectedValue(new Error('Processing failed')),
        suggestTemplates: jest.fn().mockResolvedValue([]),
        recordUsage: jest.fn()
      }));

      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      });

      const template = screen.getByText('Wedding Day Emergency');
      await user.click(template);

      // Fill variables
      await user.type(screen.getByLabelText('customer_name'), 'John Test');
      await user.type(screen.getByLabelText('wedding_date'), '2025-06-15');
      await user.type(screen.getByLabelText('venue'), 'Test Venue');

      const applyButton = screen.getByRole('button', { name: /apply template/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText('Error processing template. Please try again.')).toBeInTheDocument();
      });
    });

    it('should retry failed template loading', async () => {
      const user = userEvent.setup();
      const mockGetTemplates = jest.fn()
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockTemplates);

      const mockTemplateManager = templateManagerModule.TemplateManager as jest.MockedClass<typeof templateManagerModule.TemplateManager>;
      mockTemplateManager.mockImplementation(() => ({
        getTemplatesForTicket: mockGetTemplates,
        processTemplate: jest.fn(),
        suggestTemplates: jest.fn(),
        recordUsage: jest.fn()
      }));

      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Error loading templates. Please try again.')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      });

      expect(mockGetTemplates).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('region', { name: /template selector/i })).toBeInTheDocument();
      expect(screen.getByRole('searchbox', { name: /search templates/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /filter by category/i })).toBeInTheDocument();

      await waitFor(() => {
        const templateItems = screen.getAllByRole('button', { name: /select template/i });
        expect(templateItems.length).toBeGreaterThan(0);
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      });

      const firstTemplate = screen.getAllByRole('button', { name: /select template/i })[0];
      firstTemplate.focus();

      await user.keyboard('{Enter}');
      expect(defaultProps.onTemplateSelect).toHaveBeenCalled();
    });

    it('should announce template selection to screen readers', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      });

      const template = screen.getByText('Wedding Day Emergency');
      await user.click(template);

      expect(screen.getByRole('status')).toHaveTextContent('Template selected: Wedding Day Emergency');
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText('Search templates...');
      await user.type(searchInput, 'wedding', { delay: 50 });

      // Search should be debounced, not called for each keystroke
      await waitFor(() => {
        expect(searchInput).toHaveValue('wedding');
      }, { timeout: 1000 });
    });

    it('should virtualize long template lists', async () => {
      const manyTemplates = Array.from({ length: 100 }, (_, i) => ({
        ...mockTemplates[0],
        id: `template-${i}`,
        name: `Template ${i}`,
      }));

      const mockTemplateManager = templateManagerModule.TemplateManager as jest.MockedClass<typeof templateManagerModule.TemplateManager>;
      mockTemplateManager.mockImplementation(() => ({
        getTemplatesForTicket: jest.fn().mockResolvedValue(manyTemplates),
        processTemplate: jest.fn(),
        suggestTemplates: jest.fn().mockResolvedValue([]),
        recordUsage: jest.fn()
      }));

      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should only render visible items, not all 100
        const visibleTemplates = screen.getAllByTestId(/template-item/);
        expect(visibleTemplates.length).toBeLessThan(20);
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should refresh templates when new ones are added', async () => {
      const mockTemplateManager = templateManagerModule.TemplateManager as jest.MockedClass<typeof templateManagerModule.TemplateManager>;
      const mockGetTemplates = jest.fn()
        .mockResolvedValueOnce(mockTemplates.slice(0, 2))
        .mockResolvedValueOnce(mockTemplates);

      mockTemplateManager.mockImplementation(() => ({
        getTemplatesForTicket: mockGetTemplates,
        processTemplate: jest.fn(),
        suggestTemplates: jest.fn().mockResolvedValue([]),
        recordUsage: jest.fn()
      }));

      render(<TemplateSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
        expect(screen.getByText('Payment Issue Resolution')).toBeInTheDocument();
        expect(screen.queryByText('Form Builder Help')).not.toBeInTheDocument();
      });

      // Simulate real-time update
      fireEvent(window, new CustomEvent('template-updated'));

      await waitFor(() => {
        expect(screen.getByText('Form Builder Help')).toBeInTheDocument();
      });
    });
  });
});