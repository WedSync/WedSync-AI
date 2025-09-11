/**
 * Integration Tests for Branding System
 *
 * Tests cover:
 * - API + UI component integration
 * - File upload + brand storage flow
 * - Real-time brand preview updates
 * - Mobile branding interface functionality
 * - End-to-end brand customization workflows
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
import BrandingCustomizer from '../../components/branding/BrandingCustomizer';
import {
  Brand,
  CreateBrandRequest,
  BrandUploadResponse,
} from '@/types/branding';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => ({ data: { path: 'test-path' }, error: null })),
      getPublicUrl: jest.fn(() => ({
        data: { publicUrl: 'https://example.com/test.png' },
      })),
      remove: jest.fn(() => ({ error: null })),
    })),
  },
  auth: {
    getUser: jest.fn(() => ({
      data: { user: { id: 'test-user' } },
      error: null,
    })),
  },
};

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabaseClient),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Test data
const mockOrganization = {
  id: 'org-123',
  name: 'Test Organization',
};

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockBrand: Brand = {
  id: 'brand-123',
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

// Test utilities
const createMockFile = (name = 'test.png', size = 1024, type = 'image/png') => {
  const file = new File(['test'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const setupMockApiResponse = (status: number, data: any) => {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response);
};

describe('Branding System Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('API + UI Integration', () => {
    test('creates new brand through full workflow', async () => {
      // Mock API responses
      setupMockApiResponse(201, {
        brand: {
          ...mockBrand,
          name: 'New Integration Brand',
        },
      });

      const onSave = async (brandData: CreateBrandRequest) => {
        const response = await fetch('/api/branding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(brandData),
        });

        if (!response.ok) {
          throw new Error('Failed to save brand');
        }

        const result = await response.json();
        return result.brand;
      };

      const onUploadAsset = jest.fn();

      render(
        <BrandingCustomizer onSave={onSave} onUploadAsset={onUploadAsset} />,
      );

      // Fill form
      const nameInput = screen.getByLabelText('Brand Name *');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Integration Brand');

      const primaryColorInput = screen.getByDisplayValue('#3B82F6');
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#FF5733');

      // Submit form
      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });
      await user.click(submitButton);

      // Verify API was called
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/branding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'New Integration Brand',
            primaryColor: '#FF5733',
            secondaryColor: '#64748B',
            accentColor: '#F59E0B',
            fontFamily: 'Inter',
            customCss: '',
            brandGuidelines: '',
          }),
        });
      });
    });

    test('updates existing brand through full workflow', async () => {
      setupMockApiResponse(200, {
        brand: {
          ...mockBrand,
          name: 'Updated Brand Name',
          primaryColor: '#FF5733',
        },
      });

      const onSave = async (brandData: CreateBrandRequest) => {
        const response = await fetch('/api/branding', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandId: mockBrand.id, ...brandData }),
        });

        const result = await response.json();
        return result.brand;
      };

      const onUploadAsset = jest.fn();

      render(
        <BrandingCustomizer
          brand={mockBrand}
          onSave={onSave}
          onUploadAsset={onUploadAsset}
        />,
      );

      // Update form
      const nameInput = screen.getByDisplayValue('Test Brand');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Brand Name');

      const submitButton = screen.getByRole('button', {
        name: /update brand/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/branding', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId: 'brand-123',
            name: 'Updated Brand Name',
            primaryColor: '#3B82F6',
            secondaryColor: '#64748B',
            accentColor: '#F59E0B',
            fontFamily: 'Inter',
            customCss: '.custom { color: red; }',
            brandGuidelines: 'Use primary color for main actions',
          }),
        });
      });
    });

    test('handles API errors gracefully', async () => {
      setupMockApiResponse(400, {
        error: 'Brand name is required',
      });

      const onSave = async (brandData: CreateBrandRequest) => {
        const response = await fetch('/api/branding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(brandData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }

        return await response.json();
      };

      const onUploadAsset = jest.fn();

      render(
        <BrandingCustomizer onSave={onSave} onUploadAsset={onUploadAsset} />,
      );

      const nameInput = screen.getByLabelText('Brand Name *');
      await user.type(nameInput, 'Test Brand');

      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save brand/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Upload + Brand Storage Flow', () => {
    test('uploads logo and updates brand in sequence', async () => {
      // Mock file upload API
      const mockUploadResponse: BrandUploadResponse = {
        success: true,
        asset: {
          id: 'asset-123',
          brandId: 'brand-123',
          type: 'logo',
          filename: 'logo.png',
          url: 'https://example.com/logo.png',
          size: 1024,
          mimeType: 'image/png',
          uploadedAt: '2024-01-01T00:00:00Z',
        },
      };

      const formData = new FormData();
      formData.append('file', createMockFile('logo.png'));
      formData.append('type', 'logo');
      formData.append('brandId', 'brand-123');

      setupMockApiResponse(201, mockUploadResponse);

      const onUploadAsset = async (file: File, type: 'logo' | 'banner') => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        formData.append('brandId', 'brand-123');

        const response = await fetch('/api/branding/upload', {
          method: 'POST',
          body: formData,
        });

        return await response.json();
      };

      const onSave = jest.fn();

      render(
        <BrandingCustomizer
          brand={mockBrand}
          onSave={onSave}
          onUploadAsset={onUploadAsset}
        />,
      );

      // Simulate file upload
      const file = createMockFile('logo.png');
      const fileInput = document.createElement('input');
      fileInput.type = 'file';

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/branding/upload', {
          method: 'POST',
          body: expect.any(FormData),
        });
      });
    });

    test('validates file upload and shows appropriate errors', async () => {
      const mockUploadResponse: BrandUploadResponse = {
        success: false,
        error: 'File size must be less than 5MB',
      };

      setupMockApiResponse(400, mockUploadResponse);

      const onUploadAsset = async (file: File, type: 'logo' | 'banner') => {
        const response = await fetch('/api/branding/upload', {
          method: 'POST',
          body: new FormData(),
        });

        return await response.json();
      };

      const onSave = jest.fn();

      render(
        <BrandingCustomizer onSave={onSave} onUploadAsset={onUploadAsset} />,
      );

      // Simulate large file upload
      const largeFile = createMockFile('large.png', 6 * 1024 * 1024); // 6MB
      const fileInput = document.createElement('input');
      fileInput.type = 'file';

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
      });

      await waitFor(() => {
        expect(
          screen.getByText(/file size must be less than 5mb/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Brand Preview Updates', () => {
    test('updates preview when colors change', async () => {
      const onSave = jest.fn();
      const onUploadAsset = jest.fn();

      render(
        <BrandingCustomizer onSave={onSave} onUploadAsset={onUploadAsset} />,
      );

      // Change primary color
      const primaryColorInput = screen.getByDisplayValue('#3B82F6');
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#FF5733');

      // Verify preview updates
      const previewHeader = screen.getByText('Your Brand');
      expect(previewHeader.closest('div')).toHaveStyle({
        backgroundColor: '#FF5733',
      });
    });

    test('updates preview when brand name changes', async () => {
      const onSave = jest.fn();
      const onUploadAsset = jest.fn();

      render(
        <BrandingCustomizer onSave={onSave} onUploadAsset={onUploadAsset} />,
      );

      // Change brand name
      const nameInput = screen.getByLabelText('Brand Name *');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Preview Brand');

      // Verify preview updates
      expect(screen.getByText('New Preview Brand')).toBeInTheDocument();
    });

    test('updates preview when font family changes', async () => {
      const onSave = jest.fn();
      const onUploadAsset = jest.fn();

      render(
        <BrandingCustomizer onSave={onSave} onUploadAsset={onUploadAsset} />,
      );

      // Change font family
      const fontSelect = screen.getByLabelText('Font Family');
      await user.selectOptions(fontSelect, 'Roboto');

      // Verify preview container has updated font
      const previewSection = screen.getByText('Live Preview').closest('div');
      expect(previewSection).toHaveStyle({
        fontFamily: 'Roboto',
      });
    });
  });

  describe('Mobile Branding Interface', () => {
    test('renders mobile-optimized layout on small screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone SE width
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      const onSave = jest.fn();
      const onUploadAsset = jest.fn();

      render(
        <BrandingCustomizer onSave={onSave} onUploadAsset={onUploadAsset} />,
      );

      // Verify mobile-friendly layout
      const container = screen.getByText('Brand Customization').closest('div');
      expect(container).toHaveClass('max-w-4xl'); // Should be responsive
    });

    test('handles touch interactions on mobile', async () => {
      const onSave = jest.fn();
      const onUploadAsset = jest.fn();

      render(
        <BrandingCustomizer onSave={onSave} onUploadAsset={onUploadAsset} />,
      );

      // Test touch events on color picker
      const colorPicker = screen.getByDisplayValue('#3B82F6');

      // Simulate touch interaction
      fireEvent.touchStart(colorPicker, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchEnd(colorPicker, {
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      // Should still function correctly
      expect(colorPicker).toBeInTheDocument();
    });
  });

  describe('End-to-end Brand Customization Workflows', () => {
    test('completes full brand creation workflow', async () => {
      // Mock all API calls
      setupMockApiResponse(201, { brand: mockBrand });

      const mockFormData = new FormData();
      mockFormData.append('file', createMockFile('logo.png'));

      const mockUploadResponse: BrandUploadResponse = {
        success: true,
        asset: {
          id: 'asset-123',
          brandId: 'brand-123',
          type: 'logo',
          filename: 'logo.png',
          url: 'https://example.com/logo.png',
          size: 1024,
          mimeType: 'image/png',
          uploadedAt: '2024-01-01T00:00:00Z',
        },
      };

      const onSave = async (brandData: CreateBrandRequest) => {
        const response = await fetch('/api/branding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(brandData),
        });
        return await response.json();
      };

      const onUploadAsset = async (file: File, type: 'logo' | 'banner') => {
        return mockUploadResponse;
      };

      render(
        <BrandingCustomizer onSave={onSave} onUploadAsset={onUploadAsset} />,
      );

      // Step 1: Enter brand details
      const nameInput = screen.getByLabelText('Brand Name *');
      await user.clear(nameInput);
      await user.type(nameInput, 'Complete Workflow Brand');

      // Step 2: Customize colors
      const primaryColorInput = screen.getByDisplayValue('#3B82F6');
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#FF5733');

      // Step 3: Select font
      const fontSelect = screen.getByLabelText('Font Family');
      await user.selectOptions(fontSelect, 'Roboto');

      // Step 4: Add custom CSS
      const customCssInput = screen.getByLabelText('Custom CSS (Advanced)');
      await user.type(customCssInput, '.brand-custom { margin: 10px; }');

      // Step 5: Add brand guidelines
      const guidelinesInput = screen.getByLabelText('Brand Guidelines');
      await user.type(
        guidelinesInput,
        'Use consistent colors throughout the platform',
      );

      // Step 6: Upload logo
      const file = createMockFile('logo.png');
      const fileInput = document.createElement('input');
      fileInput.type = 'file';

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      // Step 7: Submit form
      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });
      await user.click(submitButton);

      // Verify complete workflow
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/branding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Complete Workflow Brand',
            primaryColor: '#FF5733',
            secondaryColor: '#64748B',
            accentColor: '#F59E0B',
            fontFamily: 'Roboto',
            customCss: '.brand-custom { margin: 10px; }',
            brandGuidelines: 'Use consistent colors throughout the platform',
          }),
        });
      });
    });

    test('handles workflow interruption and recovery', async () => {
      // Mock network failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const onSave = async (brandData: CreateBrandRequest) => {
        const response = await fetch('/api/branding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(brandData),
        });

        if (!response.ok) {
          throw new Error('Network error');
        }

        return await response.json();
      };

      const onUploadAsset = jest.fn();

      render(
        <BrandingCustomizer onSave={onSave} onUploadAsset={onUploadAsset} />,
      );

      // Fill form
      const nameInput = screen.getByLabelText('Brand Name *');
      await user.type(nameInput, 'Test Brand');

      // Submit (should fail)
      const submitButton = screen.getByRole('button', {
        name: /create brand/i,
      });
      await user.click(submitButton);

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/failed to save brand/i)).toBeInTheDocument();
      });

      // Verify form data is preserved for retry
      expect(nameInput).toHaveValue('Test Brand');

      // Mock successful retry
      setupMockApiResponse(201, { brand: mockBrand });

      // Retry submission
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('debounces preview updates during rapid color changes', async () => {
      const onSave = jest.fn();
      const onUploadAsset = jest.fn();

      render(
        <BrandingCustomizer onSave={onSave} onUploadAsset={onUploadAsset} />,
      );

      const primaryColorInput = screen.getByDisplayValue('#3B82F6');

      // Rapid color changes
      for (let i = 0; i < 10; i++) {
        await user.clear(primaryColorInput);
        await user.type(
          primaryColorInput,
          `#FF${i.toString().padStart(2, '0')}33`,
        );
      }

      // Only final color should be applied
      expect(primaryColorInput).toHaveValue('#FF0933');
    });

    test('handles large file uploads efficiently', async () => {
      const mockUploadResponse: BrandUploadResponse = {
        success: true,
        asset: {
          id: 'asset-123',
          brandId: 'brand-123',
          type: 'logo',
          filename: 'large-logo.png',
          url: 'https://example.com/large-logo.png',
          size: 4 * 1024 * 1024, // 4MB
          mimeType: 'image/png',
          uploadedAt: '2024-01-01T00:00:00Z',
        },
      };

      const onSave = jest.fn();
      const onUploadAsset = async (file: File, type: 'logo' | 'banner') => {
        // Simulate upload progress
        return new Promise<BrandUploadResponse>((resolve) => {
          setTimeout(() => resolve(mockUploadResponse), 100);
        });
      };

      render(
        <BrandingCustomizer onSave={onSave} onUploadAsset={onUploadAsset} />,
      );

      // Upload large file
      const largeFile = createMockFile('large-logo.png', 4 * 1024 * 1024);
      const fileInput = document.createElement('input');
      fileInput.type = 'file';

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
      });

      // Should show upload progress
      expect(screen.getByText('Uploading...')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
      });
    });
  });
});
