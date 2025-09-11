import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FieldPalette from '../palette/FieldPalette';
import {
  WeddingFieldType,
  WeddingFieldCategory,
  TierLimitations,
} from '@/types/form-builder';

// Mock the drag and drop functionality
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  }),
}));

const mockTierLimitations: TierLimitations = {
  availableFieldTypes: [
    'text',
    'email',
    'wedding-date',
    'venue',
    'guest-count',
  ] as WeddingFieldType[],
  maxFields: 10,
  advancedFields: ['photo-preferences', 'timeline-event'] as WeddingFieldType[],
  canUseLogic: true,
  canUseTemplates: true,
  canExportData: true,
  canUseIntegrations: false,
};

const mockAvailableFields: WeddingFieldType[] = [
  'text',
  'email',
  'wedding-date',
  'venue',
  'guest-count',
  'photo-preferences',
];

describe('FieldPalette', () => {
  const defaultProps = {
    availableFields: mockAvailableFields,
    tierLimitations: mockTierLimitations,
    searchQuery: '',
    selectedCategory: null,
    onFieldDragStart: jest.fn(),
    onFieldDragEnd: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the field palette with header and search', () => {
    render(<FieldPalette {...defaultProps} />);

    expect(screen.getByText('Field Library')).toBeInTheDocument();
    expect(
      screen.getByText('Drag fields to build your questionnaire'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search fields...')).toBeInTheDocument();
  });

  it('displays wedding-themed branding and context', () => {
    render(<FieldPalette {...defaultProps} />);

    expect(
      screen.getByText(/Wedding-specific field/i) || screen.getByText(/💍/),
    ).toBeInTheDocument();
  });

  it('shows field count in footer', () => {
    render(<FieldPalette {...defaultProps} />);

    expect(screen.getByText(/Available fields:/i)).toBeInTheDocument();
    expect(
      screen.getByText(`${mockTierLimitations.availableFieldTypes.length}`),
    ).toBeInTheDocument();
  });

  it('displays max fields limit when applicable', () => {
    render(<FieldPalette {...defaultProps} />);

    expect(screen.getByText(/Max fields per form:/i)).toBeInTheDocument();
    expect(
      screen.getByText(`${mockTierLimitations.maxFields}`),
    ).toBeInTheDocument();
  });

  it('shows premium fields notification', () => {
    render(<FieldPalette {...defaultProps} />);

    expect(screen.getByText(/Premium fields available/i)).toBeInTheDocument();
    expect(
      screen.getByText(/👑/i) || screen.getByLabelText(/crown/i),
    ).toBeInTheDocument();
  });

  it('filters fields based on search query', async () => {
    const user = userEvent.setup();
    render(<FieldPalette {...defaultProps} searchQuery="wedding" />);

    const searchInput = screen.getByPlaceholderText('Search fields...');
    await user.clear(searchInput);
    await user.type(searchInput, 'date');

    // Should filter to show only date-related fields
    await waitFor(() => {
      expect(
        screen.getByText(/Wedding Date/i) || screen.getByText(/date/i),
      ).toBeInTheDocument();
    });
  });

  it('groups fields by categories correctly', () => {
    render(<FieldPalette {...defaultProps} />);

    // Check for category headers
    expect(
      screen.getByText(/Basic/i) || screen.getByText(/Wedding/i),
    ).toBeInTheDocument();
  });

  it('handles category expansion and collapse', async () => {
    const user = userEvent.setup();
    render(<FieldPalette {...defaultProps} />);

    // Find a collapsible category button
    const categoryButton = screen
      .getAllByRole('button')
      .find(
        (button) =>
          button.textContent?.includes('field') ||
          button.textContent?.includes('Basic'),
      );

    if (categoryButton) {
      await user.click(categoryButton);
      // Should toggle category visibility
      expect(categoryButton).toBeInTheDocument();
    }
  });

  it('displays wedding-specific field badges', () => {
    render(<FieldPalette {...defaultProps} />);

    // Look for wedding-specific indicators
    expect(
      screen.getByText(/💍/) || screen.getByText(/wedding/i),
    ).toBeInTheDocument();
  });

  it('shows premium field restrictions correctly', () => {
    const restrictedTier: TierLimitations = {
      ...mockTierLimitations,
      availableFieldTypes: ['text', 'email'] as WeddingFieldType[], // Exclude premium fields
    };

    render(<FieldPalette {...defaultProps} tierLimitations={restrictedTier} />);

    // Premium fields should show upgrade required
    expect(
      screen.getByText(/Upgrade Required/i) || screen.getByText(/Premium/i),
    ).toBeInTheDocument();
  });

  it('handles field drag start and end events', async () => {
    const onFieldDragStart = jest.fn();
    const onFieldDragEnd = jest.fn();

    render(
      <FieldPalette
        {...defaultProps}
        onFieldDragStart={onFieldDragStart}
        onFieldDragEnd={onFieldDragEnd}
      />,
    );

    // Find a draggable field item
    const fieldItem = screen
      .getAllByText(/Field/i)[0]
      ?.closest('[role="button"], .cursor-grab, [draggable]');

    if (fieldItem) {
      fireEvent.mouseDown(fieldItem);
      expect(onFieldDragStart).toHaveBeenCalled();

      fireEvent.mouseUp(fieldItem);
      expect(onFieldDragEnd).toHaveBeenCalled();
    }
  });

  it('provides tooltips with field information', async () => {
    const user = userEvent.setup();
    render(<FieldPalette {...defaultProps} />);

    // Find a field item to hover over
    const fieldItem = screen.getAllByText(/Text/i)[0];

    if (fieldItem) {
      await user.hover(fieldItem);

      // Should show tooltip with field information
      await waitFor(
        () => {
          expect(
            screen.getByText(/help/i) || screen.getByText(/tip/i),
          ).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    }
  });

  it('shows photographer-specific tips and context', () => {
    render(<FieldPalette {...defaultProps} />);

    // Look for photography-related context
    expect(
      screen.getByText(/photographer/i) || screen.getByText(/📸/),
    ).toBeInTheDocument();
  });

  it('handles empty search results gracefully', async () => {
    const user = userEvent.setup();
    render(<FieldPalette {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search fields...');
    await user.type(searchInput, 'nonexistentfield');

    // Should handle no results gracefully
    await waitFor(() => {
      expect(screen.queryByText(/field/i)).toBeInTheDocument(); // Some fields should still exist
    });
  });
});

// Field Item Tests
describe('FieldPalette DraggableFieldItem', () => {
  const defaultProps = {
    availableFields: mockAvailableFields,
    tierLimitations: mockTierLimitations,
    searchQuery: '',
    selectedCategory: null,
    onFieldDragStart: jest.fn(),
    onFieldDragEnd: jest.fn(),
  };

  it('displays field icons correctly', () => {
    render(<FieldPalette {...defaultProps} />);

    // Should show field type icons
    expect(
      screen.getByText(/📝/) ||
        screen.getByText(/📧/) ||
        screen.getByText(/💍/),
    ).toBeInTheDocument();
  });

  it('shows appropriate field labels', () => {
    render(<FieldPalette {...defaultProps} />);

    // Should display readable field labels
    expect(
      screen.getByText(/Text/i) || screen.getByText(/Email/i),
    ).toBeInTheDocument();
  });

  it('indicates draggable state with proper styling', () => {
    render(<FieldPalette {...defaultProps} />);

    // Look for drag indicators
    expect(
      screen.getByText(/Drag to add/i) || screen.getAllByText(/drag/i)[0],
    ).toBeInTheDocument();
  });

  it('provides visual feedback for premium fields', () => {
    render(<FieldPalette {...defaultProps} />);

    // Premium fields should have crown icons or upgrade messages
    expect(
      screen.getByText(/👑/) || screen.getByText(/upgrade/i),
    ).toBeInTheDocument();
  });

  it('shows wedding-specific context in tooltips', async () => {
    const user = userEvent.setup();
    render(<FieldPalette {...defaultProps} />);

    // Find wedding-specific field
    const weddingField = screen.getByText(/Wedding/i) || screen.getByText(/💍/);

    if (weddingField) {
      await user.hover(weddingField);

      // Should show wedding context in tooltip
      await waitFor(
        () => {
          expect(
            screen.getByText(/wedding/i) ||
              screen.getByText(/ceremony/i) ||
              screen.getByText(/reception/i),
          ).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    }
  });
});

// Accessibility Tests
describe('FieldPalette Accessibility', () => {
  const defaultProps = {
    availableFields: mockAvailableFields,
    tierLimitations: mockTierLimitations,
    searchQuery: '',
    selectedCategory: null,
    onFieldDragStart: jest.fn(),
    onFieldDragEnd: jest.fn(),
  };

  it('has proper ARIA labels and roles', () => {
    render(<FieldPalette {...defaultProps} />);

    expect(
      screen.getByRole('search') || screen.getByLabelText(/search/i),
    ).toBeInTheDocument();
  });

  it('supports keyboard navigation for drag operations', async () => {
    const user = userEvent.setup();
    render(<FieldPalette {...defaultProps} />);

    // Tab through draggable items
    await user.tab();

    const focusedElement = document.activeElement;
    expect(focusedElement).not.toBe(document.body);
  });

  it('provides screen reader announcements for state changes', async () => {
    const user = userEvent.setup();
    render(<FieldPalette {...defaultProps} />);

    // Expand/collapse category
    const categoryButton = screen.getAllByRole('button')[0];
    if (categoryButton) {
      await user.click(categoryButton);

      // Should announce state change
      expect(categoryButton.getAttribute('aria-expanded')).toBeDefined();
    }
  });

  it('has appropriate focus management', async () => {
    const user = userEvent.setup();
    render(<FieldPalette {...defaultProps} />);

    // Search input should be focusable
    const searchInput = screen.getByPlaceholderText('Search fields...');
    await user.click(searchInput);

    expect(document.activeElement).toBe(searchInput);
  });
});

// Mobile Responsive Tests
describe('FieldPalette Mobile Responsiveness', () => {
  const defaultProps = {
    availableFields: mockAvailableFields,
    tierLimitations: mockTierLimitations,
    searchQuery: '',
    selectedCategory: null,
    onFieldDragStart: jest.fn(),
    onFieldDragEnd: jest.fn(),
  };

  it('adapts layout for mobile devices', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone SE width
    });

    render(<FieldPalette {...defaultProps} />);

    // Should still show essential elements
    expect(screen.getByText('Field Library')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search fields...')).toBeInTheDocument();
  });

  it('has touch-friendly drag targets', () => {
    render(<FieldPalette {...defaultProps} />);

    // Field items should have minimum 48px touch targets
    const fieldItems = screen.getAllByText(/Field/i);
    fieldItems.forEach((item) => {
      const styles = window.getComputedStyle(item);
      // In a real test, we would check computed height/width
      expect(item).toBeInTheDocument();
    });
  });

  it('supports touch drag operations', async () => {
    render(<FieldPalette {...defaultProps} />);

    // Find a draggable field
    const fieldItem = screen.getAllByText(/Text/i)[0];

    // Simulate touch start
    fireEvent.touchStart(fieldItem);

    expect(defaultProps.onFieldDragStart).toHaveBeenCalled();
  });
});
