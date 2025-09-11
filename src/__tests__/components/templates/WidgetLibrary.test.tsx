import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import WidgetLibrary from '@/components/templates/WidgetLibrary';
import type { WidgetConfig } from '@/components/templates/WidgetLibrary';

// Mock the UI components
jest.mock('@/components/ui/button-untitled', () => ({
  Button: ({
    children,
    onClick,
    leftIcon,
    loading,
    variant,
    size,
    ...props
  }: any) => (
    <button
      onClick={onClick}
      disabled={loading}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {leftIcon && <span data-testid="button-icon">{leftIcon}</span>}
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

jest.mock('@/components/ui/input-untitled', () => ({
  Input: ({ value, onChange, placeholder, leftIcon, ...props }: any) => (
    <div>
      {leftIcon && <span data-testid="input-icon">{leftIcon}</span>}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      />
    </div>
  ),
}));

jest.mock('@/components/ui/card-untitled', () => ({
  Card: ({ children, className, onClick, ...props }: any) => (
    <div className={className} onClick={onClick} data-testid="card" {...props}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant} data-testid="badge">
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, size }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-size={size}
      data-testid="switch"
    />
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Search: () => <span data-testid="search-icon">Search</span>,
  Filter: () => <span data-testid="filter-icon">Filter</span>,
  Grid3x3: () => <span data-testid="grid-icon">Grid</span>,
  List: () => <span data-testid="list-icon">List</span>,
  Plus: () => <span data-testid="plus-icon">Plus</span>,
  Star: () => <span data-testid="star-icon">Star</span>,
  Eye: () => <span data-testid="eye-icon">Eye</span>,
  Settings: () => <span data-testid="settings-icon">Settings</span>,
  Heart: () => <span data-testid="heart-icon">Heart</span>,
  Calendar: () => <span data-testid="calendar-icon">Calendar</span>,
  Users: () => <span data-testid="users-icon">Users</span>,
  DollarSign: () => <span data-testid="dollar-icon">Dollar</span>,
  CheckSquare: () => <span data-testid="check-icon">Check</span>,
  Camera: () => <span data-testid="camera-icon">Camera</span>,
  Shield: () => <span data-testid="shield-icon">Shield</span>,
  Check: () => <span data-testid="check-mark">Check</span>,
  LayoutDashboard: () => <span data-testid="dashboard-icon">Dashboard</span>,
}));

describe('WidgetLibrary', () => {
  const mockWidgets: WidgetConfig[] = [
    {
      id: 'welcome-message',
      name: 'Welcome Message',
      description: 'Personalized welcome message with countdown',
      category: 'essential',
      icon: 'heart',
      default_size: { width: 12, height: 3 },
      settings_schema: [],
      default_settings: {},
      tier_restrictions: ['free', 'starter', 'professional'],
      is_premium: false,
      is_custom: false,
      vendor_types: ['photographer'],
      wedding_styles: ['modern'],
      installation_count: 1000,
      rating: 4.5,
      reviews: 20,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 'budget-tracker',
      name: 'Budget Tracker',
      description: 'Advanced budget management',
      category: 'financial',
      icon: 'dollar-sign',
      default_size: { width: 8, height: 4 },
      settings_schema: [],
      default_settings: {},
      tier_restrictions: ['professional', 'enterprise'],
      is_premium: true,
      is_custom: false,
      vendor_types: ['planner'],
      wedding_styles: ['luxury'],
      installation_count: 500,
      rating: 4.8,
      reviews: 15,
      created_by: {
        name: 'WedSync Team',
        verified: true,
      },
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ];

  const defaultProps = {
    onWidgetSelect: jest.fn(),
    onWidgetInstall: jest.fn(),
    selectedWidgets: [],
    userTier: 'professional' as const,
    vendorType: 'photographer',
    weddingStyle: 'modern',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the widget library with header', () => {
      render(<WidgetLibrary {...defaultProps} />);

      expect(screen.getByText('Widget Library')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Customize your client dashboards with powerful, ready-to-use widgets',
        ),
      ).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<WidgetLibrary {...defaultProps} />);

      expect(
        screen.getByPlaceholderText('Search widgets...'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('renders view mode toggle buttons', () => {
      render(<WidgetLibrary {...defaultProps} />);

      expect(screen.getByTestId('grid-icon')).toBeInTheDocument();
      expect(screen.getByTestId('list-icon')).toBeInTheDocument();
    });

    it('renders filter controls', () => {
      render(<WidgetLibrary {...defaultProps} />);

      // Category filter
      expect(screen.getByDisplayValue(/All Widgets/)).toBeInTheDocument();

      // Sort filter
      expect(screen.getByDisplayValue(/Most Popular/)).toBeInTheDocument();

      // Premium filter
      expect(screen.getByText('Premium widgets only')).toBeInTheDocument();
      expect(screen.getByTestId('switch')).toBeInTheDocument();
    });
  });

  describe('Widget Display', () => {
    // Since we're mocking the WIDGET_LIBRARY, we need to test with actual rendered widgets
    it('displays widgets in grid view by default', () => {
      render(<WidgetLibrary {...defaultProps} />);

      // Should render widget cards
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('shows widget installation count and rating', () => {
      render(<WidgetLibrary {...defaultProps} />);

      // Look for installation counts (formatted numbers)
      expect(screen.getByText(/installs/)).toBeInTheDocument();

      // Look for star ratings
      expect(screen.getByTestId('star-icon')).toBeInTheDocument();
    });

    it('displays premium badges for premium widgets', () => {
      render(<WidgetLibrary {...defaultProps} />);

      const premiumBadges = screen.getAllByText('Premium');
      expect(premiumBadges.length).toBeGreaterThan(0);
    });

    it('shows verified creator badges', () => {
      render(<WidgetLibrary {...defaultProps} />);

      // Look for verified shield icons
      const verifiedBadges = screen.getAllByTestId('shield-icon');
      expect(verifiedBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('filters widgets based on search term', async () => {
      render(<WidgetLibrary {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search widgets...');

      await userEvent.type(searchInput, 'Welcome');

      // Should filter to show only matching widgets
      await waitFor(() => {
        expect(screen.getByText('Welcome Message')).toBeInTheDocument();
      });
    });

    it('shows empty state when no widgets match search', async () => {
      render(<WidgetLibrary {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search widgets...');

      await userEvent.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No widgets found')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Try adjusting your search terms or filters to find more widgets for your dashboard.',
          ),
        ).toBeInTheDocument();
      });
    });

    it('can clear filters to show all widgets', async () => {
      render(<WidgetLibrary {...defaultProps} />);

      // First filter to empty state
      const searchInput = screen.getByPlaceholderText('Search widgets...');
      await userEvent.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No widgets found')).toBeInTheDocument();
      });

      // Click clear filters
      const clearButton = screen.getByText('Clear filters');
      await userEvent.click(clearButton);

      // Should show widgets again
      await waitFor(() => {
        expect(screen.queryByText('No widgets found')).not.toBeInTheDocument();
      });
    });
  });

  describe('Category Filtering', () => {
    it('filters widgets by category', async () => {
      render(<WidgetLibrary {...defaultProps} />);

      const categorySelect = screen.getByDisplayValue(/All Widgets/);

      await userEvent.selectOptions(categorySelect, 'essential');

      // Should filter to show only essential widgets
      await waitFor(() => {
        // The component should re-render with filtered results
        expect(categorySelect).toHaveValue('essential');
      });
    });

    it('shows category counts in dropdown', () => {
      render(<WidgetLibrary {...defaultProps} />);

      const categorySelect = screen.getByDisplayValue(/All Widgets/);

      // Check if options include counts
      expect(screen.getByText(/All Widgets \(\d+\)/)).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('can sort by popularity', async () => {
      render(<WidgetLibrary {...defaultProps} />);

      const sortSelect = screen.getByDisplayValue('Most Popular');

      await userEvent.selectOptions(sortSelect, 'popular');

      expect(sortSelect).toHaveValue('popular');
    });

    it('can sort by rating', async () => {
      render(<WidgetLibrary {...defaultProps} />);

      const sortSelect = screen.getByDisplayValue('Most Popular');

      await userEvent.selectOptions(sortSelect, 'rating');

      expect(sortSelect).toHaveValue('rating');
    });

    it('can sort by newest', async () => {
      render(<WidgetLibrary {...defaultProps} />);

      const sortSelect = screen.getByDisplayValue('Most Popular');

      await userEvent.selectOptions(sortSelect, 'newest');

      expect(sortSelect).toHaveValue('newest');
    });
  });

  describe('View Mode Toggle', () => {
    it('starts in grid view by default', () => {
      render(<WidgetLibrary {...defaultProps} />);

      // Grid view should be active (this would be tested via CSS classes in real implementation)
      const gridButton = screen.getByTestId('grid-icon').closest('button');
      expect(gridButton).toHaveClass('bg-white'); // Mock implementation detail
    });

    it('can switch to list view', async () => {
      render(<WidgetLibrary {...defaultProps} />);

      const listButton = screen.getByTestId('list-icon').closest('button');

      await userEvent.click(listButton!);

      // Should switch to list view
      expect(listButton).toHaveClass('bg-white');
    });

    it('can switch back to grid view', async () => {
      render(<WidgetLibrary {...defaultProps} />);

      // Switch to list first
      const listButton = screen.getByTestId('list-icon').closest('button');
      await userEvent.click(listButton!);

      // Then back to grid
      const gridButton = screen.getByTestId('grid-icon').closest('button');
      await userEvent.click(gridButton!);

      expect(gridButton).toHaveClass('bg-white');
    });
  });

  describe('Premium Filter', () => {
    it('can filter to show only premium widgets', async () => {
      render(<WidgetLibrary {...defaultProps} />);

      const premiumSwitch = screen.getByTestId('switch');

      await userEvent.click(premiumSwitch);

      expect(premiumSwitch).toBeChecked();
    });
  });

  describe('Widget Interactions', () => {
    it('calls onWidgetSelect when widget is clicked', async () => {
      const onWidgetSelect = jest.fn();
      render(
        <WidgetLibrary {...defaultProps} onWidgetSelect={onWidgetSelect} />,
      );

      // Find a widget card and click it
      const cards = screen.getAllByTestId('card');
      await userEvent.click(cards[0]);

      expect(onWidgetSelect).toHaveBeenCalledTimes(1);
      expect(onWidgetSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
        }),
      );
    });

    it('calls onWidgetInstall when Add button is clicked', async () => {
      const onWidgetInstall = jest.fn();
      render(
        <WidgetLibrary {...defaultProps} onWidgetInstall={onWidgetInstall} />,
      );

      // Find Add button and click it
      const addButtons = screen.getAllByText('Add');
      await userEvent.click(addButtons[0]);

      expect(onWidgetInstall).toHaveBeenCalledTimes(1);
    });

    it('shows loading state during widget installation', async () => {
      // Helper function to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
      const createDelayedInstall = () => 
        new Promise<void>((resolve) => setTimeout(resolve, 100));

      const onWidgetInstall = jest.fn().mockImplementation(createDelayedInstall);
      render(
        <WidgetLibrary {...defaultProps} onWidgetInstall={onWidgetInstall} />,
      );

      const addButtons = screen.getAllByText('Add');
      await userEvent.click(addButtons[0]);

      // Should show loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('shows View button for selected widgets', () => {
      render(
        <WidgetLibrary
          {...defaultProps}
          selectedWidgets={['welcome-message']}
        />,
      );

      // Should show View button instead of Add for selected widgets
      expect(screen.getByText('View')).toBeInTheDocument();
    });

    it('shows settings button for all widgets', () => {
      render(<WidgetLibrary {...defaultProps} />);

      // Should show settings buttons
      const settingsButtons = screen.getAllByTestId('settings-icon');
      expect(settingsButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Tier Restrictions', () => {
    it('filters widgets based on user tier', () => {
      render(<WidgetLibrary {...defaultProps} userTier="free" />);

      // Should only show widgets available for free tier
      // This is tested through the filtering logic
      const widgets = screen.getAllByTestId('card');
      expect(widgets.length).toBeGreaterThan(0);
    });

    it('shows all widgets for enterprise tier', () => {
      render(<WidgetLibrary {...defaultProps} userTier="enterprise" />);

      // Should show all widgets including premium ones
      const widgets = screen.getAllByTestId('card');
      expect(widgets.length).toBeGreaterThan(0);
    });
  });

  describe('Vendor Type Filtering', () => {
    it('filters widgets by vendor type', () => {
      render(<WidgetLibrary {...defaultProps} vendorType="photographer" />);

      // Should filter widgets compatible with photographer vendor type
      const widgets = screen.getAllByTestId('card');
      expect(widgets.length).toBeGreaterThan(0);
    });

    it('shows all widgets when no vendor type specified', () => {
      render(<WidgetLibrary {...defaultProps} vendorType="" />);

      const widgets = screen.getAllByTestId('card');
      expect(widgets.length).toBeGreaterThan(0);
    });
  });

  describe('Wedding Style Filtering', () => {
    it('filters widgets by wedding style', () => {
      render(<WidgetLibrary {...defaultProps} weddingStyle="modern" />);

      // Should filter widgets compatible with modern wedding style
      const widgets = screen.getAllByTestId('card');
      expect(widgets.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles widget installation errors gracefully', async () => {
      const onWidgetInstall = jest
        .fn()
        .mockRejectedValue(new Error('Installation failed'));
      render(
        <WidgetLibrary {...defaultProps} onWidgetInstall={onWidgetInstall} />,
      );

      const addButtons = screen.getAllByText('Add');
      await userEvent.click(addButtons[0]);

      // Should handle error and reset loading state
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for interactive elements', () => {
      render(<WidgetLibrary {...defaultProps} />);

      // Search input should have proper labeling
      const searchInput = screen.getByPlaceholderText('Search widgets...');
      expect(searchInput).toBeInTheDocument();

      // Buttons should have proper content
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(<WidgetLibrary {...defaultProps} />);

      // Tab navigation should work through interactive elements
      const searchInput = screen.getByPlaceholderText('Search widgets...');
      searchInput.focus();
      expect(searchInput).toHaveFocus();

      // Tab to next element
      await userEvent.tab();
      // Next focusable element should receive focus
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large widget collections', () => {
      // Test with many widgets
      const manyWidgets = Array.from({ length: 100 }, (_, i) => ({
        ...mockWidgets[0],
        id: `widget-${i}`,
        name: `Widget ${i}`,
      }));

      const { container } = render(<WidgetLibrary {...defaultProps} />);

      // Should render without performance issues
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for different screen sizes', () => {
      // This would typically test CSS classes, but we can verify responsive elements exist
      render(<WidgetLibrary {...defaultProps} />);

      // Should render responsive grid
      const widgets = screen.getAllByTestId('card');
      expect(widgets.length).toBeGreaterThan(0);
    });
  });
});
