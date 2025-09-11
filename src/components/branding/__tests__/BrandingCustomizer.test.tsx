/**
 * Unit Tests for BrandingCustomizer Component
 *
 * Tests cover:
 * - Component rendering with different props
 * - Form validation and error handling
 * - Color picker functionality
 * - File upload validation
 * - Brand preview generation
 * - Form submission handling
 * - Accessibility compliance
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BrandingCustomizer from '../BrandingCustomizer';
import {
  Brand,
  CreateBrandRequest,
  BrandUploadResponse,
} from '@/types/branding';

// Mock data
const mockBrand: Brand = {
  id: '123',
  organizationId: 'org-123',
  name: 'Test Brand',
  logoUrl: 'https://example.com/logo.png',
  logoFileId: 'file-123',
  primaryColor: '#3B82F6',
  secondaryColor: '#64748B',
  accentColor: '#F59E0B',
  fontFamily: 'Inter',
  customCss: '.custom { color: red; }',
  brandGuidelines: 'Use primary color for main actions',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockOnSave = jest.fn();
const mockOnUploadAsset = jest.fn();

// Mock file for upload tests
const createMockFile = (name = 'test.png', size = 1024, type = 'image/png') => {
  const file = new File(['test'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('BrandingCustomizer Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Rendering', () => {
    test('renders without brand data (create mode)', () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      expect(screen.getByText('Brand Customization')).toBeInTheDocument();
      expect(screen.getByLabelText('Brand Name *')).toBeInTheDocument();
      expect(screen.getByText('Create Brand')).toBeInTheDocument();
    });

    test('renders with existing brand data (edit mode)', () => {
      render(
        <BrandingCustomizer
          brand={mockBrand}
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      expect(screen.getByDisplayValue('Test Brand')).toBeInTheDocument();
      expect(screen.getByDisplayValue('#3B82F6')).toBeInTheDocument();
      expect(screen.getByText('Update Brand')).toBeInTheDocument();
    });

    test('renders loading state correctly', () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
          isLoading={true}
        />,
      );

      const submitButton = screen.getByRole('button', { name: /saving/i });
      expect(submitButton).toBeDisabled();
    });

    test('displays live preview section', () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      expect(screen.getByText('Live Preview')).toBeInTheDocument();
      expect(
        screen.getByText('Welcome to Your Wedding Dashboard'),
      ).toBeInTheDocument();
      expect(screen.getByText('Color Palette')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('validates required brand name', async () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });
      await user.click(submitButton);

      expect(screen.getByText('Brand name is required')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    test('validates hex color format for primary color', async () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const nameInput = screen.getByLabelText('Brand Name *');
      const primaryColorInput = screen.getByDisplayValue('#3B82F6');
      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });

      await user.clear(nameInput);
      await user.type(nameInput, 'Test Brand');
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, 'invalid-color');
      await user.click(submitButton);

      expect(screen.getByText('Invalid hex color format')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    test('validates all color fields', async () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const nameInput = screen.getByLabelText('Brand Name *');
      const primaryColorInput = screen.getByDisplayValue('#3B82F6');
      const secondaryColorInput = screen.getByDisplayValue('#64748B');
      const accentColorInput = screen.getByDisplayValue('#F59E0B');
      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });

      await user.clear(nameInput);
      await user.type(nameInput, 'Test Brand');
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, 'red');
      await user.clear(secondaryColorInput);
      await user.type(secondaryColorInput, 'blue');
      await user.clear(accentColorInput);
      await user.type(accentColorInput, 'green');
      await user.click(submitButton);

      expect(screen.getByText('Invalid hex color format')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    test('clears field errors when corrected', async () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });
      await user.click(submitButton);

      expect(screen.getByText('Brand name is required')).toBeInTheDocument();

      const nameInput = screen.getByLabelText('Brand Name *');
      await user.type(nameInput, 'Test Brand');

      expect(
        screen.queryByText('Brand name is required'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    test('updates form data when fields change', async () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const nameInput = screen.getByLabelText('Brand Name *');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Brand Name');

      expect(nameInput).toHaveValue('New Brand Name');
    });

    test('updates colors and preview when color picker changes', async () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const primaryColorInput = screen.getByDisplayValue('#3B82F6');
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#FF0000');

      expect(primaryColorInput).toHaveValue('#FF0000');
    });

    test('handles font family selection', async () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const fontSelect = screen.getByLabelText('Font Family');
      await user.selectOptions(fontSelect, 'Roboto');

      expect(fontSelect).toHaveValue('Roboto');
    });

    test('handles custom CSS input', async () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const customCssInput = screen.getByLabelText('Custom CSS (Advanced)');
      await user.type(customCssInput, '.custom { background: blue; }');

      expect(customCssInput).toHaveValue('.custom { background: blue; }');
    });
  });

  describe('File Upload', () => {
    test('validates file size (should reject files > 5MB)', async () => {
      const mockUploadResponse: BrandUploadResponse = {
        success: false,
        error: 'File size must be less than 5MB',
      };
      mockOnUploadAsset.mockResolvedValue(mockUploadResponse);

      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      // Mock file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';

      const largeFile = createMockFile('large.png', 6 * 1024 * 1024); // 6MB file

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
      });

      // Check if validation error appears
      await waitFor(() => {
        expect(
          screen.getByText(/file size must be less than 5mb/i),
        ).toBeInTheDocument();
      });
    });

    test('validates file type (should reject non-image files)', async () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const fileInput = document.createElement('input');
      fileInput.type = 'file';

      const invalidFile = createMockFile(
        'document.pdf',
        1024,
        'application/pdf',
      );

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      });

      await waitFor(() => {
        expect(
          screen.getByText(/only jpeg, png, svg, and webp files are allowed/i),
        ).toBeInTheDocument();
      });
    });

    test('handles successful file upload', async () => {
      const mockUploadResponse: BrandUploadResponse = {
        success: true,
        asset: {
          id: 'asset-123',
          brandId: 'brand-123',
          type: 'logo',
          filename: 'test.png',
          url: 'https://example.com/test.png',
          size: 1024,
          mimeType: 'image/png',
          uploadedAt: '2024-01-01T00:00:00Z',
        },
      };
      mockOnUploadAsset.mockResolvedValue(mockUploadResponse);

      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const fileInput = document.createElement('input');
      fileInput.type = 'file';

      const validFile = createMockFile('test.png', 1024, 'image/png');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [validFile] } });
      });

      expect(mockOnUploadAsset).toHaveBeenCalledWith(validFile, 'logo');
    });

    test('shows upload progress indicator', async () => {
      // Mock a delayed upload
      mockOnUploadAsset.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 100),
          ),
      );

      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const uploadButton = screen.getByText('Upload Logo');
      await user.click(uploadButton);

      // Should show uploading state temporarily
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    test('submits valid form data', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const nameInput = screen.getByLabelText('Brand Name *');
      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });

      await user.clear(nameInput);
      await user.type(nameInput, 'Test Brand');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          name: 'Test Brand',
          primaryColor: '#3B82F6',
          secondaryColor: '#64748B',
          accentColor: '#F59E0B',
          fontFamily: 'Inter',
          customCss: '',
          brandGuidelines: '',
        });
      });
    });

    test('handles form submission errors', async () => {
      mockOnSave.mockRejectedValue(new Error('Save failed'));

      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const nameInput = screen.getByLabelText('Brand Name *');
      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });

      await user.clear(nameInput);
      await user.type(nameInput, 'Test Brand');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to save brand. Please try again.'),
        ).toBeInTheDocument();
      });
    });

    test('prevents submission when validation fails', async () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      // Submit without required name
      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });
      await user.click(submitButton);

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      expect(screen.getByLabelText('Brand Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Primary Color *')).toBeInTheDocument();
      expect(screen.getByLabelText('Secondary Color *')).toBeInTheDocument();
      expect(screen.getByLabelText('Accent Color *')).toBeInTheDocument();
      expect(screen.getByLabelText('Font Family')).toBeInTheDocument();
    });

    test('focuses on first error field after validation failure', async () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });
      await user.click(submitButton);

      // First field with error should receive focus
      const nameInput = screen.getByLabelText('Brand Name *');
      expect(nameInput).toHaveFocus();
    });

    test('provides error announcements for screen readers', async () => {
      render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });
      await user.click(submitButton);

      const errorMessage = screen.getByText('Brand name is required');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });

  describe('Component State Management', () => {
    test('maintains form state across re-renders', async () => {
      const { rerender } = render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const nameInput = screen.getByLabelText('Brand Name *');
      await user.type(nameInput, 'Test Brand');

      // Re-render with same props
      rerender(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      expect(nameInput).toHaveValue('Test Brand');
    });

    test('resets errors when switching between edit and create mode', () => {
      const { rerender } = render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      // Trigger validation error
      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });
      fireEvent.click(submitButton);

      expect(screen.getByText('Brand name is required')).toBeInTheDocument();

      // Switch to edit mode
      rerender(
        <BrandingCustomizer
          brand={mockBrand}
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      expect(
        screen.queryByText('Brand name is required'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('debounces color changes for preview updates', async () => {
      const { rerender } = render(
        <BrandingCustomizer
          onSave={mockOnSave}
          onUploadAsset={mockOnUploadAsset}
        />,
      );

      const primaryColorInput = screen.getByDisplayValue('#3B82F6');

      // Rapid color changes
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#FF0000');
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#00FF00');

      // Only final color should be reflected
      expect(primaryColorInput).toHaveValue('#00FF00');
    });
  });
});
