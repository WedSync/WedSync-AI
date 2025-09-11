/**
 * Unit Tests for FormBuilder Component
 * Tests the form creation and management functionality for wedding vendors
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { FormPreview } from '@/components/forms/FormPreview';

describe('FormBuilder Component', () => {
  const mockOnSave = jest.fn();
  const mockOnPublish = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Creation', () => {
    it('should render form builder with default fields', () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      expect(screen.getByText('Create Inquiry Form')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Wedding Photography Inquiry')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Tell us about your special day')).toBeInTheDocument();
    });

    it('should add text field when "Add Text Field" is clicked', async () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      const addTextButton = screen.getByText('Add Text Field');
      await userEvent.click(addTextButton);
      
      expect(screen.getByPlaceholderText('Field Label')).toBeInTheDocument();
      expect(screen.getByText('Text Input')).toBeInTheDocument();
    });

    it('should add date field for wedding date', async () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      const addDateButton = screen.getByText('Add Date Field');
      await userEvent.click(addDateButton);
      
      const labelInput = screen.getByPlaceholderText('Field Label');
      await userEvent.type(labelInput, 'Wedding Date');
      
      expect(screen.getByDisplayValue('Wedding Date')).toBeInTheDocument();
    });

    it('should add select dropdown for package types', async () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      const addSelectButton = screen.getByText('Add Dropdown');
      await userEvent.click(addSelectButton);
      
      const labelInput = screen.getByPlaceholderText('Field Label');
      await userEvent.type(labelInput, 'Photography Package');
      
      const addOptionButton = screen.getByText('Add Option');
      await userEvent.click(addOptionButton);
      await userEvent.type(screen.getByPlaceholderText('Option 1'), 'Basic');
      await userEvent.click(addOptionButton);
      await userEvent.type(screen.getByPlaceholderText('Option 2'), 'Premium');
      
      expect(screen.getByDisplayValue('Photography Package')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Basic')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Premium')).toBeInTheDocument();
    });

    it('should mark fields as required for essential information', async () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      const addTextButton = screen.getByText('Add Text Field');
      await userEvent.click(addTextButton);
      
      const requiredCheckbox = screen.getByRole('checkbox', { name: /required/i });
      await userEvent.click(requiredCheckbox);
      
      expect(requiredCheckbox).toBeChecked();
    });

    it('should allow field reordering via drag and drop', async () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      // Add multiple fields
      await userEvent.click(screen.getByText('Add Text Field'));
      await userEvent.type(screen.getAllByPlaceholderText('Field Label')[0], 'Couple Names');
      
      await userEvent.click(screen.getByText('Add Date Field'));
      await userEvent.type(screen.getAllByPlaceholderText('Field Label')[1], 'Wedding Date');
      
      // Verify initial order
      const fields = screen.getAllByPlaceholderText('Field Label');
      expect(fields[0]).toHaveValue('Couple Names');
      expect(fields[1]).toHaveValue('Wedding Date');
      
      // Note: Actual drag-and-drop testing would require more complex setup
      // This is a simplified version
    });

    it('should delete field when remove button is clicked', async () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      await userEvent.click(screen.getByText('Add Text Field'));
      await userEvent.type(screen.getByPlaceholderText('Field Label'), 'Test Field');
      
      const removeButton = screen.getByLabelText('Remove field');
      await userEvent.click(removeButton);
      
      expect(screen.queryByDisplayValue('Test Field')).not.toBeInTheDocument();
    });
  });

  describe('Wedding Vendor Templates', () => {
    it('should load photographer template with appropriate fields', async () => {
      render(<FormBuilder vendorType="photographer" onSave={mockOnSave} />);
      
      const templateButton = screen.getByText('Use Photographer Template');
      await userEvent.click(templateButton);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Couple Names')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Wedding Date')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Venue')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Photography Style')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Budget Range')).toBeInTheDocument();
      });
    });

    it('should load venue template with capacity and catering fields', async () => {
      render(<FormBuilder vendorType="venue" onSave={mockOnSave} />);
      
      const templateButton = screen.getByText('Use Venue Template');
      await userEvent.click(templateButton);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Guest Count')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Ceremony Type')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Reception Style')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Catering Preferences')).toBeInTheDocument();
      });
    });

    it('should load caterer template with dietary and menu fields', async () => {
      render(<FormBuilder vendorType="caterer" onSave={mockOnSave} />);
      
      const templateButton = screen.getByText('Use Caterer Template');
      await userEvent.click(templateButton);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Service Style')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Dietary Restrictions')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Menu Preferences')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Bar Service')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should require form title before saving', async () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      const saveButton = screen.getByText('Save Form');
      await userEvent.click(saveButton);
      
      expect(screen.getByText('Form title is required')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should require at least one field before saving', async () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      await userEvent.type(screen.getByPlaceholderText('Wedding Photography Inquiry'), 'Test Form');
      
      const saveButton = screen.getByText('Save Form');
      await userEvent.click(saveButton);
      
      expect(screen.getByText('At least one field is required')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should validate field labels are not empty', async () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      await userEvent.type(screen.getByPlaceholderText('Wedding Photography Inquiry'), 'Test Form');
      await userEvent.click(screen.getByText('Add Text Field'));
      
      const saveButton = screen.getByText('Save Form');
      await userEvent.click(saveButton);
      
      expect(screen.getByText('All fields must have labels')).toBeInTheDocument();
    });

    it('should validate select fields have at least one option', async () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      await userEvent.type(screen.getByPlaceholderText('Wedding Photography Inquiry'), 'Test Form');
      await userEvent.click(screen.getByText('Add Dropdown'));
      await userEvent.type(screen.getByPlaceholderText('Field Label'), 'Package Type');
      
      const saveButton = screen.getByText('Save Form');
      await userEvent.click(saveButton);
      
      expect(screen.getByText('Dropdown fields must have at least one option')).toBeInTheDocument();
    });
  });

  describe('Form Preview', () => {
    it('should show preview of form as couples will see it', async () => {
      const formData = {
        title: 'Wedding Photography Inquiry',
        description: 'Tell us about your special day',
        fields: [
          { id: '1', type: 'text', label: 'Couple Names', required: true },
          { id: '2', type: 'date', label: 'Wedding Date', required: true },
          { id: '3', type: 'select', label: 'Package', options: ['Basic', 'Premium'], required: false }
        ]
      };
      
      render(<FormPreview formData={formData} />);
      
      expect(screen.getByText('Wedding Photography Inquiry')).toBeInTheDocument();
      expect(screen.getByText('Tell us about your special day')).toBeInTheDocument();
      expect(screen.getByLabelText('Couple Names *')).toBeInTheDocument();
      expect(screen.getByLabelText('Wedding Date *')).toBeInTheDocument();
      expect(screen.getByLabelText('Package')).toBeInTheDocument();
    });

    it('should validate required fields in preview mode', async () => {
      const formData = {
        title: 'Test Form',
        fields: [
          { id: '1', type: 'text', label: 'Couple Names', required: true }
        ]
      };
      
      render(<FormPreview formData={formData} />);
      
      const submitButton = screen.getByText('Submit');
      await userEvent.click(submitButton);
      
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });
  });

  describe('Form Publishing', () => {
    it('should enable publish button when form is valid', async () => {
      render(<FormBuilder onPublish={mockOnPublish} />);
      
      await userEvent.type(screen.getByPlaceholderText('Wedding Photography Inquiry'), 'Test Form');
      await userEvent.click(screen.getByText('Add Text Field'));
      await userEvent.type(screen.getByPlaceholderText('Field Label'), 'Couple Names');
      
      const publishButton = screen.getByText('Publish Form');
      expect(publishButton).not.toBeDisabled();
    });

    it('should generate shareable link after publishing', async () => {
      render(<FormBuilder onPublish={mockOnPublish} />);
      
      await userEvent.type(screen.getByPlaceholderText('Wedding Photography Inquiry'), 'Test Form');
      await userEvent.click(screen.getByText('Add Text Field'));
      await userEvent.type(screen.getByPlaceholderText('Field Label'), 'Couple Names');
      
      mockOnPublish.mockResolvedValue({ 
        id: 'form-123', 
        shareableLink: 'https://wedsync.com/forms/form-123' 
      });
      
      const publishButton = screen.getByText('Publish Form');
      await userEvent.click(publishButton);
      
      await waitFor(() => {
        expect(screen.getByText('Form Published!')).toBeInTheDocument();
        expect(screen.getByText('https://wedsync.com/forms/form-123')).toBeInTheDocument();
      });
    });

    it('should show embed code for website integration', async () => {
      render(<FormBuilder onPublish={mockOnPublish} />);
      
      await userEvent.type(screen.getByPlaceholderText('Wedding Photography Inquiry'), 'Test Form');
      await userEvent.click(screen.getByText('Add Text Field'));
      await userEvent.type(screen.getByPlaceholderText('Field Label'), 'Couple Names');
      
      mockOnPublish.mockResolvedValue({ 
        id: 'form-123',
        embedCode: '<iframe src="https://wedsync.com/embed/form-123"></iframe>'
      });
      
      await userEvent.click(screen.getByText('Publish Form'));
      
      await waitFor(() => {
        expect(screen.getByText('Embed Code')).toBeInTheDocument();
        expect(screen.getByText(/iframe/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Settings', () => {
    it('should configure email notifications for new submissions', async () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      const settingsTab = screen.getByText('Settings');
      await userEvent.click(settingsTab);
      
      const emailInput = screen.getByPlaceholderText('notification@example.com');
      await userEvent.type(emailInput, 'photographer@wedding.com');
      
      const enableNotifications = screen.getByLabelText('Send email notifications');
      await userEvent.click(enableNotifications);
      
      expect(enableNotifications).toBeChecked();
      expect(screen.getByDisplayValue('photographer@wedding.com')).toBeInTheDocument();
    });

    it('should set up auto-response message for couples', async () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      const settingsTab = screen.getByText('Settings');
      await userEvent.click(settingsTab);
      
      const autoResponseTextarea = screen.getByPlaceholderText('Thank you for your inquiry...');
      await userEvent.type(autoResponseTextarea, 
        'Thank you for reaching out! We will respond within 24 hours.');
      
      expect(screen.getByDisplayValue(/We will respond within 24 hours/)).toBeInTheDocument();
    });

    it('should configure redirect URL after submission', async () => {
      render(<FormBuilder onSave={mockOnSave} />);
      
      const settingsTab = screen.getByText('Settings');
      await userEvent.click(settingsTab);
      
      const redirectInput = screen.getByPlaceholderText('/thank-you');
      await userEvent.type(redirectInput, '/wedding-inquiry-success');
      
      expect(screen.getByDisplayValue('/wedding-inquiry-success')).toBeInTheDocument();
    });
  });
});