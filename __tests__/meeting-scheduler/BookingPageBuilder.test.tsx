/**
 * Unit Tests for BookingPageBuilder Component
 * WS-064: Meeting Scheduler - Comprehensive Testing Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import BookingPageBuilder from '@/components/scheduling/BookingPageBuilder';

// Mock dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Test data
const mockSupplierId = 'supplier-123';
const mockOrganizationId = 'org-123';

const mockExistingPage = {
  id: 'page-123',
  supplier_id: mockSupplierId,
  title: 'Wedding Planning Sessions',
  slug: 'wedding-planning',
  description: 'Book a consultation session',
  welcome_message: 'Welcome to our booking system',
  is_active: true,
  requires_approval: false,
  advance_booking_days: 30,
  min_notice_hours: 24,
  buffer_time_minutes: 15,
  brand_color: '#7F56D9',
  notification_emails: ['admin@example.com'],
  send_sms_reminders: true,
  reminder_hours_before: [24, 2]
};

const mockOnSave = vi.fn();
const mockOnPreview = vi.fn();

const defaultProps = {
  supplierId: mockSupplierId,
  organizationId: mockOrganizationId,
  onSave: mockOnSave,
  onPreview: mockOnPreview
};

describe('BookingPageBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders create booking page form when no existing page', () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      expect(screen.getByText('Create Booking Page')).toBeInTheDocument();
      expect(screen.getByText('Set up your booking page to let clients schedule meetings with you')).toBeInTheDocument();
    });

    it('renders edit booking page form when existing page provided', () => {
      render(<BookingPageBuilder {...defaultProps} existingPage={mockExistingPage} />);
      
      expect(screen.getByText('Edit Booking Page')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Wedding Planning Sessions')).toBeInTheDocument();
    });

    it('renders all required tabs', () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Meetings')).toBeInTheDocument();
      expect(screen.getByText('Schedule')).toBeInTheDocument();
      expect(screen.getByText('Brand')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields on save', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      const saveButton = screen.getByText('Save Page');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
        expect(screen.getByText('Description is required')).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('validates URL slug format', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      const slugInput = screen.getByLabelText(/URL Slug/);
      await userEvent.type(slugInput, 'Invalid Slug!');
      
      const saveButton = screen.getByText('Save Page');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('URL slug can only contain lowercase letters, numbers, and hyphens')).toBeInTheDocument();
      });
    });

    it('auto-generates slug from title', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      const titleInput = screen.getByLabelText(/Page Title/);
      await userEvent.type(titleInput, 'Wedding Planning Sessions');
      
      await waitFor(() => {
        const slugInput = screen.getByLabelText(/URL Slug/);
        expect(slugInput).toHaveValue('wedding-planning-sessions');
      });
    });
  });

  describe('Basic Settings Tab', () => {
    it('updates form data when basic fields are changed', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      const titleInput = screen.getByLabelText(/Page Title/);
      await userEvent.type(titleInput, 'Test Title');
      
      const descriptionInput = screen.getByLabelText(/Description/);
      await userEvent.type(descriptionInput, 'Test description');
      
      expect(titleInput).toHaveValue('Test Title');
      expect(descriptionInput).toHaveValue('Test description');
    });

    it('toggles booking settings switches', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      const requireApprovalSwitch = screen.getByLabelText(/Require Approval/);
      const activeSwitch = screen.getByLabelText(/Active/);
      
      await userEvent.click(requireApprovalSwitch);
      await userEvent.click(activeSwitch);
      
      // Verify switches are toggled (implementation depends on Switch component)
      expect(requireApprovalSwitch).toBeChecked();
      expect(activeSwitch).not.toBeChecked();
    });
  });

  describe('Meeting Types Management', () => {
    it('adds new meeting type', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      // Switch to meetings tab
      const meetingsTab = screen.getByText('Meetings');
      await userEvent.click(meetingsTab);
      
      const addButton = screen.getByText('Add Meeting Type');
      await userEvent.click(addButton);
      
      // Should show new meeting type form
      expect(screen.getByDisplayValue('New Meeting Type')).toBeInTheDocument();
    });

    it('removes meeting type', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      // Switch to meetings tab
      const meetingsTab = screen.getByText('Meetings');
      await userEvent.click(meetingsTab);
      
      // Should have default meeting type
      expect(screen.getByDisplayValue('Initial Consultation')).toBeInTheDocument();
      
      // Remove it
      const removeButton = screen.getAllByLabelText(/Remove/)[0];
      await userEvent.click(removeButton);
      
      // Should be removed
      expect(screen.queryByDisplayValue('Initial Consultation')).not.toBeInTheDocument();
    });

    it('validates at least one active meeting type required', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      // Switch to meetings tab and remove default meeting type
      const meetingsTab = screen.getByText('Meetings');
      await userEvent.click(meetingsTab);
      
      const removeButton = screen.getAllByLabelText(/Remove/)[0];
      await userEvent.click(removeButton);
      
      // Try to save
      const saveButton = screen.getByText('Save Page');
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('At least one active meeting type is required')).toBeInTheDocument();
      });
    });
  });

  describe('Availability Schedule', () => {
    it('toggles day availability', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      // Switch to availability tab
      const scheduleTab = screen.getByText('Schedule');
      await userEvent.click(scheduleTab);
      
      // Find Monday switch and toggle it
      const mondaySwitch = screen.getAllByRole('switch')[0];
      await userEvent.click(mondaySwitch);
      
      // Should be toggled off
      expect(mondaySwitch).not.toBeChecked();
    });

    it('updates time slots', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      // Switch to availability tab
      const scheduleTab = screen.getByText('Schedule');
      await userEvent.click(scheduleTab);
      
      // Find time inputs and update them
      const timeInputs = screen.getAllByDisplayValue('09:00');
      await userEvent.clear(timeInputs[0]);
      await userEvent.type(timeInputs[0], '10:00');
      
      expect(timeInputs[0]).toHaveValue('10:00');
    });
  });

  describe('Branding Configuration', () => {
    it('updates brand color', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      // Switch to branding tab
      const brandingTab = screen.getByText('Brand');
      await userEvent.click(brandingTab);
      
      // Find color input
      const colorInput = screen.getByDisplayValue('#7F56D9');
      await userEvent.clear(colorInput);
      await userEvent.type(colorInput, '#FF0000');
      
      expect(colorInput).toHaveValue('#FF0000');
    });

    it('updates logo URL', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      // Switch to branding tab
      const brandingTab = screen.getByText('Brand');
      await userEvent.click(brandingTab);
      
      // Find logo URL input
      const logoInput = screen.getByLabelText(/Logo URL/);
      await userEvent.type(logoInput, 'https://example.com/logo.png');
      
      expect(logoInput).toHaveValue('https://example.com/logo.png');
    });
  });

  describe('Notifications Settings', () => {
    it('toggles SMS reminders', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      // Switch to notifications tab
      const notificationsTab = screen.getByText('Alerts');
      await userEvent.click(notificationsTab);
      
      // Find SMS reminders switch
      const smsSwitch = screen.getByLabelText(/SMS Reminders/);
      await userEvent.click(smsSwitch);
      
      expect(smsSwitch).not.toBeChecked();
    });

    it('adds email notification', async () => {
      // Mock window.prompt
      const mockPrompt = vi.spyOn(window, 'prompt').mockReturnValue('test@example.com');
      
      render(<BookingPageBuilder {...defaultProps} />);
      
      // Switch to notifications tab
      const notificationsTab = screen.getByText('Alerts');
      await userEvent.click(notificationsTab);
      
      // Add email
      const addEmailButton = screen.getByText('Add Email');
      await userEvent.click(addEmailButton);
      
      expect(mockPrompt).toHaveBeenCalledWith('Enter email address:');
      
      mockPrompt.mockRestore();
    });
  });

  describe('Form Submission', () => {
    it('calls onSave with correct data when form is valid', async () => {
      mockOnSave.mockResolvedValue(undefined);
      
      render(<BookingPageBuilder {...defaultProps} />);
      
      // Fill required fields
      const titleInput = screen.getByLabelText(/Page Title/);
      const descriptionInput = screen.getByLabelText(/Description/);
      
      await userEvent.type(titleInput, 'Test Page');
      await userEvent.type(descriptionInput, 'Test description');
      
      // Save form
      const saveButton = screen.getByText('Save Page');
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Page',
            description: 'Test description',
            slug: 'test-page',
            supplier_id: mockSupplierId
          })
        );
      });
    });

    it('shows loading state during save', async () => {
      // Mock slow save
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<BookingPageBuilder {...defaultProps} />);
      
      // Fill required fields and save
      const titleInput = screen.getByLabelText(/Page Title/);
      await userEvent.type(titleInput, 'Test Page');
      
      const descriptionInput = screen.getByLabelText(/Description/);
      await userEvent.type(descriptionInput, 'Test description');
      
      const saveButton = screen.getByText('Save Page');
      await userEvent.click(saveButton);
      
      // Should show loading state
      expect(screen.getByText('Save Page')).toBeDisabled();
    });
  });

  describe('Live Preview', () => {
    it('updates preview when form changes', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      const titleInput = screen.getByLabelText(/Page Title/);
      await userEvent.type(titleInput, 'Test Preview');
      
      // Preview should update
      expect(screen.getByText('Test Preview')).toBeInTheDocument();
    });

    it('shows booking URL when slug is set', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      const titleInput = screen.getByLabelText(/Page Title/);
      await userEvent.type(titleInput, 'Test Page');
      
      await waitFor(() => {
        expect(screen.getByText(/\/book\/test-page/)).toBeInTheDocument();
      });
    });

    it('calls onPreview when preview button clicked', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      const titleInput = screen.getByLabelText(/Page Title/);
      await userEvent.type(titleInput, 'Test Page');
      
      const previewButton = screen.getByText('Preview');
      await userEvent.click(previewButton);
      
      expect(mockOnPreview).toHaveBeenCalledWith('test-page');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      expect(screen.getByLabelText(/Page Title/)).toBeInTheDocument();
      expect(screen.getByLabelText(/URL Slug/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    });

    it('shows validation errors with proper ARIA', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      const saveButton = screen.getByText('Save Page');
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/Page Title/);
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('supports keyboard navigation', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      const titleInput = screen.getByLabelText(/Page Title/);
      titleInput.focus();
      
      expect(titleInput).toHaveFocus();
      
      // Tab to next field
      await userEvent.keyboard('{Tab}');
      const slugInput = screen.getByLabelText(/URL Slug/);
      expect(slugInput).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('shows error summary when validation fails', async () => {
      render(<BookingPageBuilder {...defaultProps} />);
      
      const saveButton = screen.getByText('Save Page');
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument();
      });
    });

    it('handles save errors gracefully', async () => {
      mockOnSave.mockRejectedValue(new Error('Save failed'));
      
      render(<BookingPageBuilder {...defaultProps} />);
      
      // Fill required fields
      const titleInput = screen.getByLabelText(/Page Title/);
      await userEvent.type(titleInput, 'Test Page');
      
      const descriptionInput = screen.getByLabelText(/Description/);
      await userEvent.type(descriptionInput, 'Test description');
      
      const saveButton = screen.getByText('Save Page');
      await userEvent.click(saveButton);
      
      // Should handle error without crashing
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('renders compact mode correctly', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 320 });
      
      render(<BookingPageBuilder {...defaultProps} />);
      
      // Should still render all elements
      expect(screen.getByText('Create Booking Page')).toBeInTheDocument();
      expect(screen.getByLabelText(/Page Title/)).toBeInTheDocument();
    });
  });
});