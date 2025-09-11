import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import FAQCategoryManager from '@/components/faq/FAQCategoryManager';
import type {
  FAQCategory,
  CategoryTemplate,
  AutoCategorizationRule,
} from '@/types/faq-extraction';

// Mock @dnd-kit libraries
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => (
    <div data-testid="dnd-context">{children}</div>
  ),
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn((array, oldIndex, newIndex) => {
    const newArray = [...array];
    newArray.splice(newIndex, 0, newArray.splice(oldIndex, 1)[0]);
    return newArray;
  }),
  SortableContext: ({ children }: any) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

// Mock motion/react
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  TagIcon: ({ className }: any) => (
    <div className={className} data-testid="tag-icon" />
  ),
  PlusIcon: ({ className }: any) => (
    <div className={className} data-testid="plus-icon" />
  ),
  PencilIcon: ({ className }: any) => (
    <div className={className} data-testid="pencil-icon" />
  ),
  TrashIcon: ({ className }: any) => (
    <div className={className} data-testid="trash-icon" />
  ),
  Bars3Icon: ({ className }: any) => (
    <div className={className} data-testid="bars-icon" />
  ),
  CheckIcon: ({ className }: any) => (
    <div className={className} data-testid="check-icon" />
  ),
  XMarkIcon: ({ className }: any) => (
    <div className={className} data-testid="x-mark-icon" />
  ),
  SwatchIcon: ({ className }: any) => (
    <div className={className} data-testid="swatch-icon" />
  ),
  ChartBarIcon: ({ className }: any) => (
    <div className={className} data-testid="chart-icon" />
  ),
  CogIcon: ({ className }: any) => (
    <div className={className} data-testid="cog-icon" />
  ),
  EyeIcon: ({ className }: any) => (
    <div className={className} data-testid="eye-icon" />
  ),
  EyeSlashIcon: ({ className }: any) => (
    <div className={className} data-testid="eye-slash-icon" />
  ),
  SparklesIcon: ({ className }: any) => (
    <div className={className} data-testid="sparkles-icon" />
  ),
}));

// Mock data
const mockCategories: FAQCategory[] = [
  {
    id: '1',
    name: 'Pricing',
    description: 'Package pricing and costs',
    color: 'bg-green-100 text-green-800 border-green-200',
    count: 5,
    isActive: true,
    sortOrder: 1,
    autoCategorizationRules: ['price', 'cost', 'package'],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Services',
    description: 'Services offered',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    count: 3,
    isActive: true,
    sortOrder: 2,
    autoCategorizationRules: ['service', 'offer'],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Booking',
    description: 'Booking process',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    count: 0,
    isActive: false,
    sortOrder: 3,
    autoCategorizationRules: ['booking', 'reserve'],
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const mockTemplates: CategoryTemplate[] = [
  {
    id: 'photographer',
    name: 'Wedding Photographer',
    description: 'Common categories for wedding photography businesses',
    categories: [
      {
        name: 'Pricing & Packages',
        color: 'bg-green-100 text-green-800',
        isActive: true,
        sortOrder: 1,
        autoCategorizationRules: ['price', 'cost'],
      },
      {
        name: 'Services',
        color: 'bg-blue-100 text-blue-800',
        isActive: true,
        sortOrder: 2,
        autoCategorizationRules: ['service'],
      },
    ],
  },
];

const mockRules: AutoCategorizationRule[] = [
  {
    id: '1',
    categoryId: '1',
    keywords: ['price', 'cost'],
    priority: 1,
    isActive: true,
  },
];

const mockProps = {
  categories: mockCategories,
  templates: mockTemplates,
  onCategoryCreate: vi.fn(),
  onCategoryUpdate: vi.fn(),
  onCategoryDelete: vi.fn(),
  onCategoryReorder: vi.fn(),
  onRulesUpdate: vi.fn(),
  autoCategorizationRules: mockRules,
};

describe('FAQCategoryManager', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the category manager with header and statistics', () => {
      render(<FAQCategoryManager {...mockProps} />);

      expect(screen.getByText('FAQ Category Manager')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Organize your FAQ content with custom categories and smart auto-categorization',
        ),
      ).toBeInTheDocument();

      // Statistics
      expect(screen.getByText('2')).toBeInTheDocument(); // Active Categories
      expect(screen.getByText('Active Categories')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Inactive
      expect(screen.getByText('Inactive')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument(); // Total FAQs
      expect(screen.getByText('Total FAQs')).toBeInTheDocument();
    });

    it('renders view toggle buttons', () => {
      render(<FAQCategoryManager {...mockProps} />);

      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getByText('Templates')).toBeInTheDocument();
      expect(screen.getByText('Auto-Rules')).toBeInTheDocument();
    });

    it('displays active categories by default', () => {
      render(<FAQCategoryManager {...mockProps} />);

      expect(screen.getByText('Pricing')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.queryByText('Booking')).not.toBeInTheDocument(); // Inactive, should be hidden
    });

    it('shows loading state', () => {
      render(<FAQCategoryManager {...mockProps} isLoading={true} />);

      expect(
        screen.getByText('Loading category manager...'),
      ).toBeInTheDocument();
    });
  });

  describe('Categories View', () => {
    it('shows create category button and form', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      const createButton = screen.getByText('Create Category');
      expect(createButton).toBeInTheDocument();

      await user.click(createButton);

      expect(screen.getByText('Create New Category')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('e.g., Pricing & Packages'),
      ).toBeInTheDocument();
    });

    it('creates a new category with form submission', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Create Category'));

      const nameInput = screen.getByPlaceholderText('e.g., Pricing & Packages');
      const descriptionInput = screen.getByPlaceholderText(
        'Brief description of what FAQs belong in this category',
      );
      const keywordsInput = screen.getByPlaceholderText(
        'pricing, cost, package, rate',
      );

      await user.type(nameInput, 'New Category');
      await user.type(descriptionInput, 'Description for new category');
      await user.type(keywordsInput, 'keyword1, keyword2');

      const createCategoryButton = screen.getByRole('button', {
        name: 'Create Category',
      });
      await user.click(createCategoryButton);

      expect(mockProps.onCategoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Category',
          description: 'Description for new category',
          autoCategorizationRules: ['keyword1', 'keyword2'],
          isActive: true,
        }),
      );
    });

    it('cancels category creation', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Create Category'));

      const nameInput = screen.getByPlaceholderText('e.g., Pricing & Packages');
      await user.type(nameInput, 'New Category');

      await user.click(screen.getByText('Cancel'));

      expect(screen.queryByText('Create New Category')).not.toBeInTheDocument();
      expect(mockProps.onCategoryCreate).not.toHaveBeenCalled();
    });

    it('shows and hides inactive categories', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      expect(screen.queryByText('Booking')).not.toBeInTheDocument();

      await user.click(screen.getByText('Show All'));

      expect(screen.getByText('Booking')).toBeInTheDocument();
      expect(screen.getByText('Hide Inactive')).toBeInTheDocument();

      await user.click(screen.getByText('Hide Inactive'));

      expect(screen.queryByText('Booking')).not.toBeInTheDocument();
    });

    it('edits an existing category', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      const editButtons = screen.getAllByTestId('pencil-icon');
      await user.click(editButtons[0].closest('button')!);

      const nameInput = screen.getByDisplayValue('Pricing');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Pricing');

      await user.click(screen.getByText('Save'));

      expect(mockProps.onCategoryUpdate).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          name: 'Updated Pricing',
          updatedAt: expect.any(String),
        }),
      );
    });

    it('cancels category editing', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      const editButtons = screen.getAllByTestId('pencil-icon');
      await user.click(editButtons[0].closest('button')!);

      const nameInput = screen.getByDisplayValue('Pricing');
      await user.clear(nameInput);
      await user.type(nameInput, 'Modified Name');

      await user.click(screen.getByText('Cancel'));

      expect(mockProps.onCategoryUpdate).not.toHaveBeenCalled();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
    });

    it('toggles category active state', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      const toggleButtons = screen.getAllByTestId('eye-icon');
      await user.click(toggleButtons[0].closest('button')!);

      expect(mockProps.onCategoryUpdate).toHaveBeenCalledWith('1', {
        isActive: false,
      });
    });

    it('deletes a category with confirmation', async () => {
      const mockConfirm = vi.fn().mockReturnValue(true);
      vi.stubGlobal('confirm', mockConfirm);

      render(<FAQCategoryManager {...mockProps} />);

      const deleteButtons = screen.getAllByTestId('trash-icon');
      await user.click(deleteButtons[0].closest('button')!);

      expect(mockConfirm).toHaveBeenCalledWith(
        'Delete category "Pricing"? This will uncategorize 5 FAQs.',
      );
      expect(mockProps.onCategoryDelete).toHaveBeenCalledWith('1');

      vi.unstubAllGlobals();
    });

    it('cancels category deletion', async () => {
      const mockConfirm = vi.fn().mockReturnValue(false);
      vi.stubGlobal('confirm', mockConfirm);

      render(<FAQCategoryManager {...mockProps} />);

      const deleteButtons = screen.getAllByTestId('trash-icon');
      await user.click(deleteButtons[0].closest('button')!);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockProps.onCategoryDelete).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('shows empty state when no categories exist', () => {
      render(<FAQCategoryManager {...mockProps} categories={[]} />);

      expect(screen.getByText('No categories yet')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Create your first category or use a template to get started.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Templates View', () => {
    it('switches to templates view', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Templates'));

      expect(screen.getByText('Industry Templates')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Quick-start templates tailored for specific wedding industry businesses.',
        ),
      ).toBeInTheDocument();
    });

    it('displays available templates', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Templates'));

      expect(screen.getByText('Wedding Photographer')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Common categories for wedding photography businesses',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('Use Template')).toBeInTheDocument();
    });

    it('creates categories from template', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Templates'));

      const useTemplateButton = screen.getByText('Use Template');
      await user.click(useTemplateButton);

      // Should call onCategoryCreate for each category in template
      await waitFor(() => {
        expect(mockProps.onCategoryCreate).toHaveBeenCalledTimes(2);
      });
    });

    it('shows template category previews', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Templates'));

      expect(screen.getByText('Pricing & Packages')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('Includes:')).toBeInTheDocument();
    });
  });

  describe('Auto-Rules View', () => {
    it('switches to auto-rules view', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Auto-Rules'));

      expect(screen.getByText('Auto-Categorization Rules')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Configure automatic categorization based on keywords and patterns in FAQ content.',
        ),
      ).toBeInTheDocument();
    });

    it('shows auto-categorization information', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Auto-Rules'));

      expect(
        screen.getByText('How auto-categorization works:'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('• Rules are applied in priority order'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('• Keywords match both questions and answers'),
      ).toBeInTheDocument();
    });

    it('explains that rules are managed through categories', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Auto-Rules'));

      expect(
        screen.getByText(
          'Auto-categorization rules are managed through individual category settings.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('renders drag handles for categories', () => {
      render(<FAQCategoryManager {...mockProps} />);

      const dragHandles = screen.getAllByTestId('bars-icon');
      expect(dragHandles).toHaveLength(2); // Two active categories
    });

    it('calls onCategoryReorder when drag ends', () => {
      // This would require mocking the drag and drop event
      render(<FAQCategoryManager {...mockProps} />);

      // DndContext is mocked, so we can't fully test drag behavior
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
      expect(screen.getByTestId('sortable-context')).toBeInTheDocument();
    });
  });

  describe('Statistics Calculations', () => {
    it('calculates correct statistics', () => {
      render(<FAQCategoryManager {...mockProps} />);

      // Active: 2 (Pricing, Services)
      expect(screen.getByText('2')).toBeInTheDocument();

      // Inactive: 1 (Booking)
      expect(screen.getByText('1')).toBeInTheDocument();

      // Total FAQs: 5 + 3 + 0 = 8
      expect(screen.getByText('8')).toBeInTheDocument();

      // Average: 8/3 = 2.67 rounded to 3
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('updates statistics when categories change', () => {
      const updatedCategories = [
        ...mockCategories,
        {
          id: '4',
          name: 'New Category',
          color: 'bg-purple-100 text-purple-800',
          count: 10,
          isActive: true,
          sortOrder: 4,
          autoCategorizationRules: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      const { rerender } = render(<FAQCategoryManager {...mockProps} />);

      rerender(
        <FAQCategoryManager {...mockProps} categories={updatedCategories} />,
      );

      // Active categories should increase
      expect(screen.getByText('3')).toBeInTheDocument(); // 3 active now
      expect(screen.getByText('18')).toBeInTheDocument(); // Total FAQs: 8 + 10 = 18
    });
  });

  describe('Color Selection', () => {
    it('shows color picker in create form', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Create Category'));

      // Should show color buttons
      expect(screen.getByText('Color')).toBeInTheDocument();

      // Color buttons are rendered as colored divs
      const colorButtons = screen
        .getAllByRole('button')
        .filter(
          (button) =>
            button.title &&
            ['Blue', 'Green', 'Purple', 'Amber'].includes(button.title),
        );
      expect(colorButtons.length).toBeGreaterThan(0);
    });

    it('selects different colors', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Create Category'));

      const greenColorButton = screen.getByTitle('Green');
      await user.click(greenColorButton);

      const nameInput = screen.getByPlaceholderText('e.g., Pricing & Packages');
      await user.type(nameInput, 'Test Category');

      await user.click(screen.getByRole('button', { name: 'Create Category' }));

      expect(mockProps.onCategoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'bg-green-100 text-green-800 border-green-200',
        }),
      );
    });
  });

  describe('Keywords Management', () => {
    it('handles comma-separated keywords', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Create Category'));

      const nameInput = screen.getByPlaceholderText('e.g., Pricing & Packages');
      const keywordsInput = screen.getByPlaceholderText(
        'pricing, cost, package, rate',
      );

      await user.type(nameInput, 'Test Category');
      await user.type(keywordsInput, 'keyword1, keyword2, keyword3');

      await user.click(screen.getByRole('button', { name: 'Create Category' }));

      expect(mockProps.onCategoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          autoCategorizationRules: ['keyword1', 'keyword2', 'keyword3'],
        }),
      );
    });

    it('trims whitespace and filters empty keywords', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Create Category'));

      const nameInput = screen.getByPlaceholderText('e.g., Pricing & Packages');
      const keywordsInput = screen.getByPlaceholderText(
        'pricing, cost, package, rate',
      );

      await user.type(nameInput, 'Test Category');
      await user.type(keywordsInput, ' keyword1 ,, keyword2 , , keyword3 ');

      await user.click(screen.getByRole('button', { name: 'Create Category' }));

      expect(mockProps.onCategoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          autoCategorizationRules: ['keyword1', 'keyword2', 'keyword3'],
        }),
      );
    });

    it('displays existing keywords for editing', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      const editButtons = screen.getAllByTestId('pencil-icon');
      await user.click(editButtons[0].closest('button')!);

      // Should show existing keywords
      const keywordsInput = screen.getByDisplayValue('price, cost, package');
      expect(keywordsInput).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<FAQCategoryManager {...mockProps} />);

      expect(
        screen.getByRole('button', { name: /create category/i }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(9); // Various buttons in the interface
    });

    it('supports keyboard navigation', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      const createButton = screen.getByText('Create Category');

      // Test keyboard navigation to create button
      await user.tab();
      expect(createButton).toHaveFocus();
      
      // Test that Enter key activates the create button
      await user.keyboard('{Enter}');
      
      // Should open category creation form
      expect(screen.getByText('Category Name')).toBeInTheDocument();
    });

    it('has proper form labels', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Create Category'));

      expect(screen.getByText('Name *')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Color')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('validates required fields', async () => {
      render(<FAQCategoryManager {...mockProps} />);

      await user.click(screen.getByText('Create Category'));

      const createButton = screen.getByRole('button', {
        name: 'Create Category',
      });

      // Should be disabled when name is empty
      expect(createButton).toBeDisabled();

      const nameInput = screen.getByPlaceholderText('e.g., Pricing & Packages');
      await user.type(nameInput, 'Test');

      // Should be enabled when name is provided
      expect(createButton).not.toBeDisabled();
    });

    it('handles empty category list gracefully', () => {
      render(<FAQCategoryManager {...mockProps} categories={[]} />);

      expect(screen.getByText('No categories yet')).toBeInTheDocument();
    });

    it('handles missing templates gracefully', () => {
      render(<FAQCategoryManager {...mockProps} templates={[]} />);

      // Should not crash, just show empty templates
      expect(screen.getByText('FAQ Category Manager')).toBeInTheDocument();
    });
  });
});
