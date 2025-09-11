import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import FAQReviewQueue from '@/components/faq/FAQReviewQueue';
import type {
  ExtractedFAQ,
  FAQCategory,
  ReviewAction,
} from '@/types/faq-extraction';

// Mock motion/react
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  CheckCircleIcon: ({ className }: any) => (
    <div className={className} data-testid="check-circle-icon" />
  ),
  XCircleIcon: ({ className }: any) => (
    <div className={className} data-testid="x-circle-icon" />
  ),
  PencilIcon: ({ className }: any) => (
    <div className={className} data-testid="pencil-icon" />
  ),
  TrashIcon: ({ className }: any) => (
    <div className={className} data-testid="trash-icon" />
  ),
  TagIcon: ({ className }: any) => (
    <div className={className} data-testid="tag-icon" />
  ),
  MagnifyingGlassIcon: ({ className }: any) => (
    <div className={className} data-testid="search-icon" />
  ),
  AdjustmentsHorizontalIcon: ({ className }: any) => (
    <div className={className} data-testid="filter-icon" />
  ),
  CheckIcon: ({ className }: any) => (
    <div className={className} data-testid="check-icon" />
  ),
  XMarkIcon: ({ className }: any) => (
    <div className={className} data-testid="x-mark-icon" />
  ),
  ArrowTopRightOnSquareIcon: ({ className }: any) => (
    <div className={className} data-testid="external-link-icon" />
  ),
  EyeIcon: ({ className }: any) => (
    <div className={className} data-testid="eye-icon" />
  ),
  ClockIcon: ({ className }: any) => (
    <div className={className} data-testid="clock-icon" />
  ),
}));

// Mock data
const mockCategories: FAQCategory[] = [
  {
    id: 'pricing',
    name: 'Pricing',
    color: 'bg-green-100 text-green-800',
    count: 2,
    isActive: true,
    sortOrder: 1,
    autoCategorizationRules: ['price', 'cost'],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'services',
    name: 'Services',
    color: 'bg-blue-100 text-blue-800',
    count: 1,
    isActive: true,
    sortOrder: 2,
    autoCategorizationRules: ['service', 'offer'],
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const mockFAQs: ExtractedFAQ[] = [
  {
    id: '1',
    question: 'What are your photography packages?',
    answer: 'We offer three main packages: Basic, Premium, and Luxury.',
    confidence: 95,
    sourceUrl: 'https://example.com/pricing',
    category: 'pricing',
    status: 'pending',
    extractionDate: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    question: 'Do you offer engagement sessions?',
    answer:
      'Yes, we include engagement sessions in our Premium and Luxury packages.',
    confidence: 88,
    sourceUrl: 'https://example.com/services',
    category: 'services',
    status: 'approved',
    extractionDate: '2024-01-15T10:05:00Z',
  },
  {
    id: '3',
    question: 'What is your cancellation policy?',
    answer: 'We require 30 days notice for cancellations.',
    confidence: 72,
    sourceUrl: 'https://example.com/policies',
    status: 'rejected',
    extractionDate: '2024-01-15T10:10:00Z',
    lastModified: '2024-01-15T11:00:00Z',
  },
];

const mockProps = {
  extractedFAQs: mockFAQs,
  categories: mockCategories,
  onApprove: vi.fn(),
  onReject: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onBulkAction: vi.fn(),
  onCategoryChange: vi.fn(),
};

describe('FAQReviewQueue', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the review queue with header and statistics', () => {
      render(<FAQReviewQueue {...mockProps} />);

      expect(screen.getByText('FAQ Review Queue')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Review and approve extracted FAQ content before adding to your library',
        ),
      ).toBeInTheDocument();

      // Statistics
      expect(screen.getByText('3')).toBeInTheDocument(); // Total FAQs
      expect(screen.getByText('Total FAQs')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Pending
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
      expect(screen.getByText('High Confidence')).toBeInTheDocument();
    });

    it('renders FAQ cards with correct content', () => {
      render(<FAQReviewQueue {...mockProps} />);

      expect(
        screen.getByText('What are your photography packages?'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Do you offer engagement sessions?'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('What is your cancellation policy?'),
      ).toBeInTheDocument();
    });

    it('displays confidence scores with appropriate styling', () => {
      render(<FAQReviewQueue {...mockProps} />);

      expect(screen.getByText('95% confidence')).toBeInTheDocument();
      expect(screen.getByText('88% confidence')).toBeInTheDocument();
      expect(screen.getByText('72% confidence')).toBeInTheDocument();
    });

    it('shows status badges correctly', () => {
      render(<FAQReviewQueue {...mockProps} />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    it('displays loading state', () => {
      render(<FAQReviewQueue {...mockProps} isLoading={true} />);

      expect(screen.getByText('Loading review queue...')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('filters FAQs by search query', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(
        'Search questions and answers...',
      );
      await user.type(searchInput, 'photography');

      // Should show only the FAQ with "photography" in the question
      expect(
        screen.getByText('What are your photography packages?'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Do you offer engagement sessions?'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('What is your cancellation policy?'),
      ).not.toBeInTheDocument();
    });

    it('shows filter buttons and applies filters', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      // Open filters
      const filtersButton = screen.getByText('Filters');
      await user.click(filtersButton);

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('High Confidence')).toBeInTheDocument();

      // Apply pending filter
      await user.click(screen.getByText('Pending'));

      // Should only show pending FAQs
      expect(
        screen.getByText('What are your photography packages?'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Do you offer engagement sessions?'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('What is your cancellation policy?'),
      ).not.toBeInTheDocument();
    });

    it('sorts FAQs by different criteria', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      const sortSelect = screen.getByDisplayValue('Sort by Date');
      await user.selectOptions(sortSelect, 'confidence');

      // Should re-render FAQs in confidence order (highest first)
      expect(sortSelect).toHaveValue('confidence');
    });

    it('shows empty state when no FAQs match filters', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(
        'Search questions and answers...',
      );
      await user.type(searchInput, 'nonexistent search term');

      expect(screen.getByText('No FAQs to review')).toBeInTheDocument();
      expect(
        screen.getByText('Try adjusting your search or filter criteria.'),
      ).toBeInTheDocument();
    });
  });

  describe('Individual FAQ Actions', () => {
    it('calls onApprove when approve button is clicked', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      // Find and click approve button for pending FAQ
      const approveButtons = screen.getAllByText('Approve');
      await user.click(approveButtons[0]);

      expect(mockProps.onApprove).toHaveBeenCalledWith('1');
    });

    it('calls onReject when reject button is clicked', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      const rejectButtons = screen.getAllByText('Reject');
      await user.click(rejectButtons[0]);

      expect(mockProps.onReject).toHaveBeenCalledWith('1', undefined);
    });

    it('enters edit mode and saves changes', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      // Click edit button (pencil icon)
      const editButtons = screen.getAllByTestId('pencil-icon');
      await user.click(editButtons[0].closest('button')!);

      // Should show edit form
      const questionTextarea = screen.getByDisplayValue(
        'What are your photography packages?',
      );
      await user.clear(questionTextarea);
      await user.type(
        questionTextarea,
        'What photography packages do you offer?',
      );

      // Save changes
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      expect(mockProps.onEdit).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          question: 'What photography packages do you offer?',
          lastModified: expect.any(String),
        }),
      );
    });

    it('cancels edit mode without saving changes', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      const editButtons = screen.getAllByTestId('pencil-icon');
      await user.click(editButtons[0].closest('button')!);

      const questionTextarea = screen.getByDisplayValue(
        'What are your photography packages?',
      );
      await user.clear(questionTextarea);
      await user.type(questionTextarea, 'Modified question');

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      // Should not call onEdit
      expect(mockProps.onEdit).not.toHaveBeenCalled();
      // Should return to view mode
      expect(
        screen.getByText('What are your photography packages?'),
      ).toBeInTheDocument();
    });

    it('calls onDelete when delete button is clicked', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      const deleteButtons = screen.getAllByTestId('trash-icon');
      await user.click(deleteButtons[0].closest('button')!);

      expect(mockProps.onDelete).toHaveBeenCalledWith('1');
    });

    it('changes category when dropdown is used', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      // Find category dropdown in edit mode
      const editButtons = screen.getAllByTestId('pencil-icon');
      await user.click(editButtons[0].closest('button')!);

      const categorySelect = screen.getByDisplayValue('pricing');
      await user.selectOptions(categorySelect, 'services');

      expect(mockProps.onCategoryChange).toHaveBeenCalledWith('1', 'services');
    });

    it('toggles preview mode', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      const previewButtons = screen.getAllByTestId('eye-icon');
      await user.click(previewButtons[0].closest('button')!);

      // In preview mode, should show full answer without truncation
      expect(
        screen.getByText(
          'We offer three main packages: Basic, Premium, and Luxury.',
        ),
      ).toBeInTheDocument();
    });

    it('opens source URL in new tab', async () => {
      // Mock window.open
      const mockOpen = vi.fn();
      vi.stubGlobal('open', mockOpen);

      render(<FAQReviewQueue {...mockProps} />);

      const externalLinkButtons = screen.getAllByTestId('external-link-icon');
      await user.click(externalLinkButtons[0].closest('button')!);

      expect(mockOpen).toHaveBeenCalledWith(
        'https://example.com/pricing',
        '_blank',
      );

      vi.unstubAllGlobals();
    });
  });

  describe('Bulk Actions', () => {
    it('selects individual FAQs', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const faqCheckbox = checkboxes.find(
        (cb) => !cb.closest('div')?.textContent?.includes('selected'),
      );

      await user.click(faqCheckbox!);

      // Should show bulk actions toolbar
      expect(screen.getByText(/1 of \d+ selected/)).toBeInTheDocument();
      expect(screen.getByText('Approve All')).toBeInTheDocument();
      expect(screen.getByText('Reject All')).toBeInTheDocument();
      expect(screen.getByText('Delete All')).toBeInTheDocument();
    });

    it('selects all FAQs with master checkbox', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      await user.click(firstCheckbox);

      // Should select all FAQs
      expect(screen.getByText(/3 of 3 selected/)).toBeInTheDocument();
    });

    it('performs bulk approve action', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      // Select all FAQs
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      // Click bulk approve
      const bulkApproveButton = screen.getByText('Approve All');
      await user.click(bulkApproveButton);

      expect(mockProps.onBulkAction).toHaveBeenCalledWith({
        type: 'bulk_approve',
        faqIds: ['1', '2', '3'],
      });
    });

    it('performs bulk reject action', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      const bulkRejectButton = screen.getByText('Reject All');
      await user.click(bulkRejectButton);

      expect(mockProps.onBulkAction).toHaveBeenCalledWith({
        type: 'bulk_reject',
        faqIds: ['1', '2', '3'],
      });
    });

    it('confirms bulk delete action', async () => {
      // Mock window.confirm
      const mockConfirm = vi.fn().mockReturnValue(true);
      vi.stubGlobal('confirm', mockConfirm);

      render(<FAQReviewQueue {...mockProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      const bulkDeleteButton = screen.getByText('Delete All');
      await user.click(bulkDeleteButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        'Delete 3 selected FAQs? This action cannot be undone.',
      );
      expect(mockProps.onBulkAction).toHaveBeenCalledWith({
        type: 'bulk_delete',
        faqIds: ['1', '2', '3'],
      });

      vi.unstubAllGlobals();
    });

    it('cancels bulk delete when user cancels confirmation', async () => {
      const mockConfirm = vi.fn().mockReturnValue(false);
      vi.stubGlobal('confirm', mockConfirm);

      render(<FAQReviewQueue {...mockProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      const bulkDeleteButton = screen.getByText('Delete All');
      await user.click(bulkDeleteButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockProps.onBulkAction).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  describe('Statistics', () => {
    it('calculates and displays correct statistics', () => {
      render(<FAQReviewQueue {...mockProps} />);

      // Total FAQs: 3
      expect(screen.getByText('3')).toBeInTheDocument();

      // Pending: 1 (faq with id '1')
      expect(screen.getByText('1')).toBeInTheDocument();

      // Approved: 1 (faq with id '2')
      expect(screen.getByText('1')).toBeInTheDocument();

      // High Confidence: 2 (confidence >= 80)
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('updates statistics when FAQs change', () => {
      const { rerender } = render(<FAQReviewQueue {...mockProps} />);

      // Add more FAQs
      const updatedFAQs = [
        ...mockFAQs,
        {
          id: '4',
          question: 'New question',
          answer: 'New answer',
          confidence: 95,
          sourceUrl: 'https://example.com/new',
          status: 'pending' as const,
          extractionDate: '2024-01-15T12:00:00Z',
        },
      ];

      rerender(<FAQReviewQueue {...mockProps} extractedFAQs={updatedFAQs} />);

      expect(screen.getByText('4')).toBeInTheDocument(); // Updated total
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<FAQReviewQueue {...mockProps} />);

      expect(screen.getByRole('searchbox')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument(); // Sort dropdown
      expect(screen.getAllByRole('checkbox')).toHaveLength(4); // 3 FAQs + 1 select all
    });

    it('supports keyboard navigation', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      const searchInput = screen.getByRole('searchbox');

      // Tab navigation
      await user.tab();
      expect(searchInput).toHaveFocus();
    });

    it('has proper button labels and tooltips', () => {
      render(<FAQReviewQueue {...mockProps} />);

      expect(
        screen.getByRole('button', { name: /approve/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reject/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no FAQs provided', () => {
      render(<FAQReviewQueue {...mockProps} extractedFAQs={[]} />);

      expect(screen.getByText('No FAQs to review')).toBeInTheDocument();
      expect(
        screen.getByText('Start by extracting FAQs from a website.'),
      ).toBeInTheDocument();
    });

    it('shows empty state with search message when search returns no results', async () => {
      render(<FAQReviewQueue {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(
        'Search questions and answers...',
      );
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No FAQs to review')).toBeInTheDocument();
      expect(
        screen.getByText('Try adjusting your search or filter criteria.'),
      ).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing category gracefully', () => {
      const faqsWithMissingCategory: ExtractedFAQ[] = [
        {
          ...mockFAQs[0],
          category: 'nonexistent-category',
        },
      ];

      render(
        <FAQReviewQueue
          {...mockProps}
          extractedFAQs={faqsWithMissingCategory}
        />,
      );

      // Should not crash and should render the FAQ
      expect(
        screen.getByText('What are your photography packages?'),
      ).toBeInTheDocument();
    });

    it('handles malformed FAQ data gracefully', () => {
      const malformedFAQs = [
        {
          ...mockFAQs[0],
          confidence: NaN,
        },
      ] as ExtractedFAQ[];

      render(<FAQReviewQueue {...mockProps} extractedFAQs={malformedFAQs} />);

      // Should still render without crashing
      expect(
        screen.getByText('What are your photography packages?'),
      ).toBeInTheDocument();
    });
  });
});
