/**
 * WS-156 Task Template Library Unit Tests - TDD Approach
 * Testing template selection, customization, and security
 * 
 * CRITICAL: Following security requirements from audit findings
 * Templates must be validated and sanitized before use
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskTemplateLibrary } from '@/components/tasks/TaskTemplateLibrary';
import { TaskCategory, TaskPriority } from '@/types/workflow';

// Mock wedding templates
const mockTemplates = [
  {
    id: 'template-1',
    name: 'Ceremony Setup',
    category: 'venue_management' as TaskCategory,
    description: 'Complete ceremony venue setup tasks',
    tasks: [
      {
        title: 'Set up ceremony chairs',
        description: 'Arrange 100 white chairs in garden pavilion',
        category: 'venue_management' as TaskCategory,
        priority: 'high' as TaskPriority,
        estimated_duration: 2,
        buffer_time: 0.5
      },
      {
        title: 'Position altar decorations',
        description: 'Place floral arrangements and wedding arch',
        category: 'florals' as TaskCategory,
        priority: 'medium' as TaskPriority,
        estimated_duration: 1.5,
        buffer_time: 0.25
      }
    ],
    tags: ['ceremony', 'setup', 'venue'],
    popularity: 95,
    is_featured: true
  },
  {
    id: 'template-2',
    name: 'Photography Timeline',
    category: 'photography' as TaskCategory,
    description: 'Standard photography timeline for wedding day',
    tasks: [
      {
        title: 'Bridal preparation photos',
        description: 'Capture bride getting ready with bridesmaids',
        category: 'photography' as TaskCategory,
        priority: 'critical' as TaskPriority,
        estimated_duration: 2,
        buffer_time: 0.5
      }
    ],
    tags: ['photography', 'timeline', 'portraits'],
    popularity: 87,
    is_featured: false
  }
];

const defaultProps = {
  templates: mockTemplates,
  selectedCategory: null as TaskCategory | null,
  onTemplateSelect: vi.fn(),
  onTemplateCustomize: vi.fn(),
  onClose: vi.fn(),
  isVisible: true
};

describe('TaskTemplateLibrary Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and Layout', () => {
    test('renders template library modal with correct structure', () => {
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      // Verify modal structure
      expect(screen.getByRole('dialog', { name: /task template library/i })).toBeInTheDocument();
      expect(screen.getByText('Task Template Library')).toBeInTheDocument();
      expect(screen.getByText(/choose from pre-built/i)).toBeInTheDocument();
      
      // Verify close button
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    test('displays templates in organized layout', () => {
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      // Verify featured templates section
      expect(screen.getByText(/featured templates/i)).toBeInTheDocument();
      expect(screen.getByText('Ceremony Setup')).toBeInTheDocument();
      
      // Verify template cards show key information
      expect(screen.getByText('venue_management')).toBeInTheDocument();
      expect(screen.getByText('95% popularity')).toBeInTheDocument();
      expect(screen.getByText(/2 tasks/i)).toBeInTheDocument();
    });

    test('uses Untitled UI styling throughout', () => {
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('bg-white', 'rounded-2xl', 'shadow-xl');
      
      const templateCard = screen.getByTestId('template-card-template-1');
      expect(templateCard).toHaveClass('border', 'border-gray-200', 'rounded-xl');
    });

    test('shows empty state when no templates available', () => {
      render(<TaskTemplateLibrary {...defaultProps} templates={[]} />);
      
      expect(screen.getByText(/no templates available/i)).toBeInTheDocument();
      expect(screen.getByText(/create your own tasks/i)).toBeInTheDocument();
    });
  });

  describe('Template Filtering and Search', () => {
    test('filters templates by category', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      // Select photography category filter
      const categoryFilter = screen.getByRole('button', { name: /photography/i });
      await user.click(categoryFilter);
      
      // Should show only photography templates
      expect(screen.getByText('Photography Timeline')).toBeInTheDocument();
      expect(screen.queryByText('Ceremony Setup')).not.toBeInTheDocument();
    });

    test('searches templates by name and description', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'ceremony');
      
      // Should show templates matching search term
      await waitFor(() => {
        expect(screen.getByText('Ceremony Setup')).toBeInTheDocument();
        expect(screen.queryByText('Photography Timeline')).not.toBeInTheDocument();
      });
    });

    test('searches by tags', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'portraits');
      
      await waitFor(() => {
        expect(screen.getByText('Photography Timeline')).toBeInTheDocument();
        expect(screen.queryByText('Ceremony Setup')).not.toBeInTheDocument();
      });
    });

    test('shows no results message for invalid search', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'nonexistent');
      
      await waitFor(() => {
        expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
        expect(screen.getByText(/try different keywords/i)).toBeInTheDocument();
      });
    });
  });

  describe('Template Selection', () => {
    test('selects template and calls onTemplateSelect', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      const useTemplateButton = screen.getByRole('button', { name: /use ceremony setup/i });
      await user.click(useTemplateButton);
      
      expect(defaultProps.onTemplateSelect).toHaveBeenCalledWith(mockTemplates[0]);
    });

    test('shows template preview on hover', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      const templateCard = screen.getByTestId('template-card-template-1');
      await user.hover(templateCard);
      
      // Should show expanded view with task details
      await waitFor(() => {
        expect(screen.getByText('Set up ceremony chairs')).toBeInTheDocument();
        expect(screen.getByText('Position altar decorations')).toBeInTheDocument();
      });
    });

    test('allows customization before selection', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      const customizeButton = screen.getByRole('button', { name: /customize ceremony setup/i });
      await user.click(customizeButton);
      
      expect(defaultProps.onTemplateCustomize).toHaveBeenCalledWith(mockTemplates[0]);
    });
  });

  describe('Template Customization', () => {
    test('allows editing template tasks before applying', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      // Enter customization mode
      const customizeButton = screen.getByRole('button', { name: /customize ceremony setup/i });
      await user.click(customizeButton);
      
      // Should show customization interface
      expect(screen.getByText(/customize template/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Set up ceremony chairs')).toBeInTheDocument();
      
      // Modify task
      const taskTitleInput = screen.getByDisplayValue('Set up ceremony chairs');
      await user.clear(taskTitleInput);
      await user.type(taskTitleInput, 'Set up 150 ceremony chairs');
      
      // Apply customizations
      const applyButton = screen.getByRole('button', { name: /apply customizations/i });
      await user.click(applyButton);
      
      expect(defaultProps.onTemplateCustomize).toHaveBeenCalledWith({
        ...mockTemplates[0],
        tasks: expect.arrayContaining([
          expect.objectContaining({
            title: 'Set up 150 ceremony chairs'
          })
        ])
      });
    });

    test('allows removing tasks from template', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      const customizeButton = screen.getByRole('button', { name: /customize ceremony setup/i });
      await user.click(customizeButton);
      
      // Remove a task
      const removeButton = screen.getAllByRole('button', { name: /remove task/i })[0];
      await user.click(removeButton);
      
      // Verify task is removed from preview
      expect(screen.queryByText('Set up ceremony chairs')).not.toBeInTheDocument();
    });

    test('allows adding new tasks to template', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      const customizeButton = screen.getByRole('button', { name: /customize ceremony setup/i });
      await user.click(customizeButton);
      
      // Add new task
      const addTaskButton = screen.getByRole('button', { name: /add task/i });
      await user.click(addTaskButton);
      
      // Fill new task details
      const newTaskTitle = screen.getByPlaceholderText(/new task title/i);
      await user.type(newTaskTitle, 'Sound system check');
      
      // Verify new task is added to template
      expect(screen.getByDisplayValue('Sound system check')).toBeInTheDocument();
    });
  });

  describe('Security Validation', () => {
    test('sanitizes template data to prevent XSS', async () => {
      const maliciousTemplate = {
        ...mockTemplates[0],
        name: '<script>alert("XSS")</script>Malicious Template',
        description: '<img src="x" onerror="alert(\'XSS\')">'
      };
      
      render(<TaskTemplateLibrary {...defaultProps} templates={[maliciousTemplate]} />);
      
      // Template name should be sanitized
      expect(screen.queryByText(/script/)).not.toBeInTheDocument();
      expect(screen.getByText('Malicious Template')).toBeInTheDocument();
      
      // Description should be sanitized
      expect(screen.queryByText(/onerror/)).not.toBeInTheDocument();
    });

    test('validates template structure before applying', async () => {
      const user = userEvent.setup();
      const invalidTemplate = {
        id: 'invalid',
        name: '',  // Invalid: empty name
        category: 'invalid_category' as any,  // Invalid: not a valid category
        tasks: []  // Invalid: no tasks
      };
      
      render(<TaskTemplateLibrary {...defaultProps} templates={[invalidTemplate]} />);
      
      // Should not render invalid template or show error
      expect(screen.queryByText('invalid')).not.toBeInTheDocument();
      expect(screen.getByText(/some templates could not be loaded/i)).toBeInTheDocument();
    });

    test('prevents template selection with malformed task data', async () => {
      const user = userEvent.setup();
      const templateWithBadTasks = {
        ...mockTemplates[0],
        tasks: [
          {
            title: '',  // Invalid: empty title
            category: undefined as any,  // Invalid: undefined category
            estimated_duration: -1  // Invalid: negative duration
          }
        ]
      };
      
      render(<TaskTemplateLibrary {...defaultProps} templates={[templateWithBadTasks]} />);
      
      const useButton = screen.getByRole('button', { name: /use/i });
      await user.click(useButton);
      
      // Should show validation error instead of calling onTemplateSelect
      expect(screen.getByText(/template contains invalid tasks/i)).toBeInTheDocument();
      expect(defaultProps.onTemplateSelect).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-labelledby');
      expect(modal).toHaveAttribute('aria-describedby');
      
      // Template cards should have proper roles
      const templateCard = screen.getByTestId('template-card-template-1');
      expect(templateCard).toHaveAttribute('role', 'button');
      expect(templateCard).toHaveAttribute('tabindex', '0');
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      // Should be able to navigate through templates with Tab
      const firstTemplate = screen.getByTestId('template-card-template-1');
      firstTemplate.focus();
      
      await user.keyboard('{Tab}');
      expect(screen.getByTestId('template-card-template-2')).toHaveFocus();
      
      // Should be able to select with Enter/Space
      await user.keyboard('{Enter}');
      expect(defaultProps.onTemplateSelect).toHaveBeenCalled();
    });

    test('announces template selection to screen readers', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      const templateCard = screen.getByTestId('template-card-template-1');
      await user.click(templateCard);
      
      // Should have aria-live region for announcements
      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent(/ceremony setup template selected/i);
    });

    test('manages focus correctly when modal opens/closes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<TaskTemplateLibrary {...defaultProps} isVisible={false} />);
      
      // Focus should not be trapped when modal is closed
      expect(document.activeElement).toBe(document.body);
      
      // Open modal
      rerender(<TaskTemplateLibrary {...defaultProps} isVisible={true} />);
      
      // Focus should move to modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveFocus();
      });
      
      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Performance and UX', () => {
    test('lazy loads template previews for better performance', () => {
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      // Task details should not be in DOM initially (lazy loaded on hover)
      expect(screen.queryByText('Set up ceremony chairs')).not.toBeInTheDocument();
      expect(screen.queryByText('Position altar decorations')).not.toBeInTheDocument();
    });

    test('provides loading states during template operations', async () => {
      const user = userEvent.setup();
      // Mock slow template selection
      defaultProps.onTemplateSelect.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      const useButton = screen.getByRole('button', { name: /use ceremony setup/i });
      await user.click(useButton);
      
      // Should show loading state
      expect(screen.getByText(/applying template/i)).toBeInTheDocument();
      expect(useButton).toBeDisabled();
    });

    test('preserves search and filter state during interactions', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      // Apply search filter
      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'ceremony');
      
      // Interact with template (customize)
      const customizeButton = screen.getByRole('button', { name: /customize/i });
      await user.click(customizeButton);
      
      // Cancel customization
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      // Search term should be preserved
      expect(searchInput).toHaveValue('ceremony');
      expect(screen.getByText('Ceremony Setup')).toBeInTheDocument();
      expect(screen.queryByText('Photography Timeline')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      
      render(<TaskTemplateLibrary {...defaultProps} />);
      
      // Should use mobile-friendly grid
      const templateGrid = screen.getByTestId('template-grid');
      expect(templateGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
      
      // Modal should be full-screen on mobile
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-full', 'md:max-w-4xl');
    });
  });
});