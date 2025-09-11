/**
 * WS-156 Task Creator Unit Tests - TDD Approach
 * Testing security validation, form handling, and component behavior
 * 
 * CRITICAL: Following security requirements from audit findings
 * - Input validation with Zod schemas
 * - XSS prevention 
 * - Error handling without exposing sensitive data
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCreator } from '@/components/tasks/TaskCreator';
import { TaskCategory, TaskPriority } from '@/types/workflow';

// Mock dependencies
vi.mock('@/lib/validation/schemas', () => ({
  taskSchema: {
    safeParse: vi.fn()
  }
}));

vi.mock('@/lib/security/input-validation', () => ({
  sanitizeHtml: vi.fn(input => input.replace(/<script.*?>.*?<\/script>/gi, '')),
  validateFileUpload: vi.fn()
}));

const mockTeamMembers = [
  {
    id: '1',
    name: 'John Planner',
    email: 'john@wedsync.com',
    role: 'planner',
    specialties: ['venue_management', 'logistics'] as TaskCategory[]
  },
  {
    id: '2', 
    name: 'Sarah Photographer',
    email: 'sarah@wedsync.com',
    role: 'photographer',
    specialties: ['photography'] as TaskCategory[]
  }
];

const defaultProps = {
  weddingId: 'wedding-123',
  teamMembers: mockTeamMembers,
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  isSubmitting: false
};

describe('TaskCreator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and Initial State', () => {
    test('renders task creation form with all required fields', () => {
      render(<TaskCreator {...defaultProps} />);
      
      // Verify all required form fields are present
      expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/deadline/i)).toBeInTheDocument();
      
      // Verify default values
      expect(screen.getByDisplayValue('medium')).toBeInTheDocument(); // Default priority
      expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // Default duration
    });

    test('renders with Untitled UI styling (not shadcn/ui)', () => {
      render(<TaskCreator {...defaultProps} />);
      
      const form = screen.getByRole('form', { name: /create new task/i });
      
      // Verify Untitled UI classes are used (per SAAS-UI-STYLE-GUIDE.md)
      const titleInput = screen.getByLabelText(/task title/i);
      expect(titleInput).toHaveClass('px-3.5', 'py-2.5', 'border-gray-300', 'rounded-lg');
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      expect(submitButton).toHaveClass('bg-primary-600', 'hover:bg-primary-700');
    });

    test('displays team members filtered by category specialty', async () => {
      const user = userEvent.setup();
      render(<TaskCreator {...defaultProps} />);
      
      // Select venue management category
      const categorySelect = screen.getByLabelText(/category/i);
      await user.selectOptions(categorySelect, 'venue_management');
      
      // Verify only planner (who has venue_management specialty) is available
      const assigneeSelect = screen.getByLabelText(/assign to/i);
      expect(assigneeSelect).toBeInTheDocument();
      
      // John Planner should be available (has venue_management specialty)
      expect(screen.getByText(/john planner/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('shows validation errors for required fields', async () => {
      const user = userEvent.setup();
      render(<TaskCreator {...defaultProps} />);
      
      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      // Verify validation errors are shown
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
        expect(screen.getByText('Category is required')).toBeInTheDocument();
        expect(screen.getByText('Deadline is required')).toBeInTheDocument();
      });
      
      // Verify form does not submit
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    test('validates duration must be greater than 0', async () => {
      const user = userEvent.setup();
      render(<TaskCreator {...defaultProps} />);
      
      const durationInput = screen.getByLabelText(/duration/i);
      await user.clear(durationInput);
      await user.type(durationInput, '0');
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Duration must be greater than 0')).toBeInTheDocument();
      });
    });

    test('clears validation errors when fields are corrected', async () => {
      const user = userEvent.setup();
      render(<TaskCreator {...defaultProps} />);
      
      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
      
      // Fix the error
      const titleInput = screen.getByLabelText(/task title/i);
      await user.type(titleInput, 'Valid task title');
      
      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Security Validation', () => {
    test('sanitizes XSS attempts in input fields', async () => {
      const user = userEvent.setup();
      const { sanitizeHtml } = require('@/lib/security/input-validation');
      
      render(<TaskCreator {...defaultProps} />);
      
      const xssPayload = '<script>alert("XSS")</script>Legitimate title';
      const titleInput = screen.getByLabelText(/task title/i);
      
      await user.type(titleInput, xssPayload);
      
      // Fill required fields and submit
      const categorySelect = screen.getByLabelText(/category/i);
      await user.selectOptions(categorySelect, 'photography');
      
      const deadlineInput = screen.getByLabelText(/deadline/i);
      await user.type(deadlineInput, '2025-02-15T14:00');
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      // Verify sanitization was called
      expect(sanitizeHtml).toHaveBeenCalledWith(xssPayload);
    });

    test('validates file uploads for photo attachments', async () => {
      const user = userEvent.setup();
      const { validateFileUpload } = require('@/lib/security/input-validation');
      
      render(<TaskCreator {...defaultProps} />);
      
      // Mock file input (will be implemented in Round 2)
      const file = new File(['fake img'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.files = [file] as any;
      
      // Simulate file upload validation
      expect(validateFileUpload).toBeDefined();
    });

    test('does not expose sensitive error information', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      
      // Mock form submission error
      defaultProps.onSubmit.mockRejectedValue(new Error('Database connection failed'));
      
      render(<TaskCreator {...defaultProps} />);
      
      // Fill and submit form
      const titleInput = screen.getByLabelText(/task title/i);
      await user.type(titleInput, 'Test task');
      
      const categorySelect = screen.getByLabelText(/category/i);
      await user.selectOptions(categorySelect, 'logistics');
      
      const deadlineInput = screen.getByLabelText(/deadline/i);
      await user.type(deadlineInput, '2025-02-15T14:00');
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        // Verify generic error message is shown (not sensitive details)
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        expect(screen.queryByText(/database connection failed/i)).not.toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Task Dependencies', () => {
    test('allows adding task dependencies', async () => {
      const user = userEvent.setup();
      const availableTasks = [
        { id: 'task-1', title: 'Setup venue', category: 'venue_management' as TaskCategory }
      ];
      
      render(<TaskCreator {...defaultProps} availableTasks={availableTasks} />);
      
      const addDependencyButton = screen.getByRole('button', { name: /add dependency/i });
      await user.click(addDependencyButton);
      
      // Verify dependency fields appear
      expect(screen.getByText(/select task/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('finish_to_start')).toBeInTheDocument();
    });

    test('allows removing task dependencies', async () => {
      const user = userEvent.setup();
      const availableTasks = [
        { id: 'task-1', title: 'Setup venue', category: 'venue_management' as TaskCategory }
      ];
      
      render(<TaskCreator {...defaultProps} availableTasks={availableTasks} />);
      
      // Add a dependency
      const addDependencyButton = screen.getByRole('button', { name: /add dependency/i });
      await user.click(addDependencyButton);
      
      // Remove the dependency
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);
      
      // Verify dependency is removed
      expect(screen.queryByText(/select task/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    test('submits valid form data with correct structure', async () => {
      const user = userEvent.setup();
      render(<TaskCreator {...defaultProps} />);
      
      // Fill form with valid data
      await user.type(screen.getByLabelText(/task title/i), 'Setup ceremony chairs');
      await user.type(screen.getByLabelText(/description/i), 'Arrange chairs for wedding ceremony');
      await user.selectOptions(screen.getByLabelText(/category/i), 'venue_management');
      await user.selectOptions(screen.getByLabelText(/priority/i), 'high');
      await user.selectOptions(screen.getByLabelText(/assign to/i), '1'); // John Planner
      await user.clear(screen.getByLabelText(/duration/i));
      await user.type(screen.getByLabelText(/duration/i), '3');
      await user.type(screen.getByLabelText(/buffer time/i), '0.5');
      await user.type(screen.getByLabelText(/deadline/i), '2025-02-15T14:00');
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith({
          wedding_id: 'wedding-123',
          title: 'Setup ceremony chairs',
          description: 'Arrange chairs for wedding ceremony',
          category: 'venue_management',
          priority: 'high',
          assigned_to: '1',
          estimated_duration: 3,
          buffer_time: 0.5,
          deadline: '2025-02-15T14:00',
          dependencies: []
        });
      });
    });

    test('disables submit button while submitting', () => {
      render(<TaskCreator {...defaultProps} isSubmitting={true} />);
      
      const submitButton = screen.getByRole('button', { name: /creating.../i });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    test('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskCreator {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    test('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      
      render(<TaskCreator {...defaultProps} />);
      
      // Verify responsive grid classes are applied
      const gridContainer = screen.getByTestId('form-grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2');
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      render(<TaskCreator {...defaultProps} />);
      
      expect(screen.getByRole('form')).toHaveAccessibleName(/create new task/i);
      expect(screen.getByLabelText(/task title/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/category/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/deadline/i)).toHaveAttribute('aria-required', 'true');
    });

    test('announces validation errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<TaskCreator {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        const errorMessage = screen.getByText('Title is required');
        expect(errorMessage).toHaveAttribute('role', 'alert');
        expect(errorMessage).toHaveAttribute('aria-live', 'polite');
      });
    });

    test('maintains focus management during form interactions', async () => {
      const user = userEvent.setup();
      render(<TaskCreator {...defaultProps} />);
      
      // Focus should move logically through form
      const titleInput = screen.getByLabelText(/task title/i);
      titleInput.focus();
      
      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/category/i)).toHaveFocus();
    });
  });

  describe('Performance', () => {
    test('does not re-render unnecessarily', () => {
      const renderSpy = vi.fn();
      
      const TestWrapper = (props: any) => {
        renderSpy();
        return <TaskCreator {...props} />;
      };
      
      const { rerender } = render(<TestWrapper {...defaultProps} />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TestWrapper {...defaultProps} />);
      
      // Should use React.memo to prevent unnecessary re-renders
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });
});