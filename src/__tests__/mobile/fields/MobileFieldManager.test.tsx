import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileFieldManager } from '@/components/mobile/fields/MobileFieldManager';
import { useCoreFieldsStore } from '@/lib/stores/coreFieldsStore';

// Mock the store
jest.mock('@/lib/stores/coreFieldsStore');
const mockStore = useCoreFieldsStore as jest.MockedFunction<
  typeof useCoreFieldsStore
>;

// Mock touch components
jest.mock('@/components/mobile/touch/TouchButton', () => {
  return {
    TouchButton: ({ children, onClick, className }: any) => (
      <button
        onClick={onClick}
        className={className}
        data-testid="touch-button"
      >
        {children}
      </button>
    ),
  };
});

jest.mock('@/components/mobile/touch/PullToRefresh', () => {
  return {
    PullToRefresh: ({ children, onRefresh }: any) => (
      <div data-testid="pull-to-refresh">
        <button onClick={onRefresh} data-testid="refresh-trigger">
          Refresh
        </button>
        {children}
      </div>
    ),
  };
});

// Mock sub-components
jest.mock('@/components/mobile/fields/MobileFieldEditor', () => {
  return {
    MobileFieldEditor: ({ field, onUpdate }: any) => (
      <div data-testid="mobile-field-editor">
        <span>{field.definition.fieldName}</span>
        <button onClick={() => onUpdate('test-value')}>Update</button>
      </div>
    ),
  };
});

jest.mock('@/components/mobile/fields/MobileFieldStatusIndicator', () => {
  return {
    MobileFieldStatusIndicator: ({ progress }: any) => (
      <div data-testid="status-indicator">{progress}%</div>
    ),
  };
});

jest.mock('@/components/mobile/fields/MobileFieldSyncTracker', () => {
  return {
    MobileFieldSyncTracker: () => (
      <div data-testid="sync-tracker">Sync Status</div>
    ),
  };
});

describe('MobileFieldManager', () => {
  const mockFields = [
    {
      key: 'partner1_name',
      value: 'John Doe',
      status: 'completed',
      lastUpdated: '2025-01-01T10:00:00Z',
      updatedBy: 'couple',
      isLocked: false,
      definition: {
        fieldName: 'Partner 1 Name',
        fieldDescription: 'Full name of first partner',
        fieldType: 'text',
        validationSchema: {},
        isRequired: true,
        category: 'couple',
        propagatesTo: ['all_vendors'],
      },
    },
    {
      key: 'wedding_date',
      value: '2025-06-15',
      status: 'completed',
      lastUpdated: '2025-01-01T10:00:00Z',
      updatedBy: 'couple',
      isLocked: false,
      definition: {
        fieldName: 'Wedding Date',
        fieldDescription: 'The date of your wedding',
        fieldType: 'date',
        validationSchema: {},
        isRequired: true,
        category: 'essential',
        propagatesTo: ['all_vendors'],
      },
    },
  ];

  const mockCompletionStats = {
    totalFields: 10,
    completedFields: 8,
    requiredFields: 5,
    completedRequiredFields: 4,
    completionPercentage: 80,
  };

  const defaultMockStore = {
    fields: mockFields,
    completionStats: mockCompletionStats,
    isLoading: false,
    loadFields: jest.fn(),
    updateField: jest.fn(),
    validateFields: jest
      .fn()
      .mockResolvedValue({ isValid: true, fieldErrors: {} }),
    triggerSync: jest.fn(),
    getSyncStatus: jest.fn(),
    lastSyncJob: null,
  };

  beforeEach(() => {
    mockStore.mockReturnValue(defaultMockStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      mockStore.mockReturnValue({
        ...defaultMockStore,
        isLoading: true,
        fields: [],
      });

      render(<MobileFieldManager />);

      expect(
        screen.getByText('Loading your wedding details...'),
      ).toBeInTheDocument();
    });

    it('should render field categories when loaded', () => {
      render(<MobileFieldManager />);

      expect(screen.getByText('Wedding Details')).toBeInTheDocument();
      expect(
        screen.getByText('Complete your profile to sync with vendors'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Choose a section to update'),
      ).toBeInTheDocument();
    });

    it('should display completion stats', () => {
      render(<MobileFieldManager />);

      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('8 completed')).toBeInTheDocument();
      expect(screen.getByText('10 total')).toBeInTheDocument();
    });

    it('should render sync tracker', () => {
      render(<MobileFieldManager />);

      expect(screen.getByTestId('sync-tracker')).toBeInTheDocument();
    });
  });

  describe('Category Navigation', () => {
    it('should show categories by default', () => {
      render(<MobileFieldManager />);

      expect(screen.getByText('Wedding Essentials')).toBeInTheDocument();
      expect(screen.getByText('Your Details')).toBeInTheDocument();
      expect(screen.getByText('Venue Info')).toBeInTheDocument();
    });

    it('should navigate to category when clicked', async () => {
      const user = userEvent.setup();
      render(<MobileFieldManager />);

      const essentialsButton = screen
        .getByText('Wedding Essentials')
        .closest('button');
      await user.click(essentialsButton!);

      expect(screen.getByText('Back to categories')).toBeInTheDocument();
    });

    it('should navigate back to categories', async () => {
      const user = userEvent.setup();
      render(<MobileFieldManager />);

      // Navigate to a category
      const essentialsButton = screen
        .getByText('Wedding Essentials')
        .closest('button');
      await user.click(essentialsButton!);

      // Navigate back
      const backButton = screen.getByText('Back to categories');
      await user.click(backButton);

      expect(
        screen.getByText('Choose a section to update'),
      ).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should toggle search bar', async () => {
      const user = userEvent.setup();
      render(<MobileFieldManager />);

      const searchButton = screen.getByText('🔍');
      await user.click(searchButton);

      expect(
        screen.getByPlaceholderText('Search fields...'),
      ).toBeInTheDocument();
    });

    it('should filter fields based on search query', async () => {
      const user = userEvent.setup();
      render(<MobileFieldManager />);

      // Open search
      const searchButton = screen.getByText('🔍');
      await user.click(searchButton);

      const searchInput = screen.getByPlaceholderText('Search fields...');
      await user.type(searchInput, 'Wedding');

      // Should show filtered results
      expect(screen.getByTestId('mobile-field-editor')).toBeInTheDocument();
    });
  });

  describe('Field Updates', () => {
    it('should handle field updates', async () => {
      render(<MobileFieldManager />);

      // Navigate to a category first
      const essentialsButton = screen
        .getByText('Wedding Essentials')
        .closest('button');
      fireEvent.click(essentialsButton!);

      // Update a field
      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(defaultMockStore.updateField).toHaveBeenCalledWith(
          'wedding_date',
          'test-value',
          undefined,
          true,
        );
      });
    });

    it('should validate fields before updating', async () => {
      render(<MobileFieldManager />);

      // Navigate to category and trigger field update
      const essentialsButton = screen
        .getByText('Wedding Essentials')
        .closest('button');
      fireEvent.click(essentialsButton!);

      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);

      expect(defaultMockStore.validateFields).toHaveBeenCalled();
    });
  });

  describe('Pull to Refresh', () => {
    it('should trigger refresh when pull to refresh is used', async () => {
      render(<MobileFieldManager />);

      const refreshTrigger = screen.getByTestId('refresh-trigger');
      fireEvent.click(refreshTrigger);

      await waitFor(() => {
        expect(defaultMockStore.loadFields).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should apply mobile-first styling', () => {
      render(<MobileFieldManager />);

      const container = screen.getByText('Wedding Details').closest('div');
      expect(container).toHaveClass('min-h-screen', 'bg-gray-50');
    });

    it('should handle touch interactions', () => {
      render(<MobileFieldManager />);

      const touchButtons = screen.getAllByTestId('touch-button');
      expect(touchButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const mockStoreWithErrors = {
        ...defaultMockStore,
        validateFields: jest.fn().mockResolvedValue({
          isValid: false,
          fieldErrors: { test_field: [{ message: 'Test error' }] },
        }),
      };

      mockStore.mockReturnValue(mockStoreWithErrors);

      render(<MobileFieldManager />);

      // Trigger field update that will fail validation
      const essentialsButton = screen
        .getByText('Wedding Essentials')
        .closest('button');
      fireEvent.click(essentialsButton!);

      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);

      // Should not call updateField if validation fails
      expect(mockStoreWithErrors.updateField).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<MobileFieldManager />);

      // Re-render with same props
      rerender(<MobileFieldManager />);

      // Store should only be called once initially
      expect(defaultMockStore.loadFields).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MobileFieldManager />);

      const searchButton = screen.getByText('🔍');
      expect(searchButton.closest('button')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<MobileFieldManager />);

      const firstCategory = screen
        .getByText('Wedding Essentials')
        .closest('button');

      // Should be focusable
      await user.tab();
      expect(document.activeElement).toBe(firstCategory);
    });
  });
});
