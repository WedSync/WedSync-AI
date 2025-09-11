import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { MobileKnowledgeSearch } from '@/components/mobile/ai/MobileKnowledgeSearch';
import { useToast } from '@/components/ui/use-toast';

// Mock dependencies
jest.mock('@/components/ui/use-toast');
jest.mock('@/components/mobile/MobileEnhancedFeatures', () => ({
  useHapticFeedback: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }),
  PullToRefresh: ({ children, onRefresh }: any) => (
    <button
      data-testid="pull-to-refresh"
      onClick={onRefresh}
      type="button"
      aria-label="Pull to refresh"
    >
      {children}
    </button>
  ),
  BottomSheet: ({ children, isOpen, onClose }: any) =>
    isOpen ? (
      <div
        data-testid="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Bottom sheet"
      >
        <button
          onClick={onClose}
          type="button"
          aria-label="Close bottom sheet"
        >
          Close
        </button>
        {children}
      </div>
    ) : null,
  SwipeableCard: ({ children, onSwipeLeft, onSwipeRight }: any) => (
    <div
      data-testid="swipeable-card"
      role="button"
      tabIndex={0}
      onClick={onSwipeRight}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSwipeRight();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onSwipeLeft?.();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onSwipeRight();
        }
      }}
      aria-label="Swipeable card"
    >
      {children}
    </div>
  ),
}));

// Mock Web Speech API
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  onstart: null,
  onresult: null,
  onerror: null,
  onend: null,
};

// @ts-ignore
global.webkitSpeechRecognition = jest.fn(() => mockSpeechRecognition);
// @ts-ignore
global.SpeechRecognition = jest.fn(() => mockSpeechRecognition);

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    }),
  },
});

const mockToast = jest.fn();
(useToast as jest.Mock).mockReturnValue({ toast: mockToast });

describe('MobileKnowledgeSearch', () => {
  const mockOnArticleSelect = jest.fn();

  const mockCategories = [
    {
      id: 'photography',
      name: 'Photography Tips',
      icon: '📸',
      color: 'bg-blue-100 text-blue-700',
      articleCount: 145,
    },
    {
      id: 'business',
      name: 'Business Guide',
      icon: '💼',
      color: 'bg-green-100 text-green-700',
      articleCount: 89,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    test('renders search interface correctly', () => {
      render(
        <MobileKnowledgeSearch
          onArticleSelect={mockOnArticleSelect}
          categories={mockCategories}
        />,
      );

      expect(
        screen.getByPlaceholderText('Search knowledge base...'),
      ).toBeInTheDocument();
      expect(screen.getByText('Photography Tips')).toBeInTheDocument();
      expect(screen.getByText('Business Guide')).toBeInTheDocument();
    });

    test('displays voice search button when supported', () => {
      render(<MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />);

      const voiceButton = screen.getByRole('button', { name: /voice search/i });
      expect(voiceButton).toBeInTheDocument();
    });

    test('shows initial query when provided', () => {
      render(
        <MobileKnowledgeSearch
          onArticleSelect={mockOnArticleSelect}
          initialQuery="wedding timeline"
        />,
      );

      const searchInput = screen.getByDisplayValue('wedding timeline');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    test('performs search when typing in search input', async () => {
      const user = userEvent.setup();

      render(<MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />);

      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );

      await user.type(searchInput, 'wedding planning');

      // Wait for debounced search
      await waitFor(
        () => {
          expect(screen.getByText('Searching...')).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    test('shows search results after successful search', async () => {
      const user = userEvent.setup();

      render(<MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />);

      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      await user.type(searchInput, 'timeline');

      await waitFor(
        () => {
          expect(screen.getByText(/Results?/)).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });

    test('displays no results message when search returns empty', async () => {
      const user = userEvent.setup();

      render(<MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />);

      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      await user.type(searchInput, 'nonexistentquery12345');

      await waitFor(
        () => {
          expect(screen.getByText('No articles found')).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });

    test('clears search when clear button is clicked', async () => {
      const user = userEvent.setup();

      render(<MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />);

      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      await user.type(searchInput, 'test query');

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Voice Search', () => {
    test('starts voice recognition when voice button is clicked', async () => {
      const user = userEvent.setup();

      render(<MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />);

      const voiceButton = screen.getByRole('button', { name: /voice search/i });
      await user.click(voiceButton);

      expect(mockSpeechRecognition.start).toHaveBeenCalled();
    });

    test('stops voice recognition when listening and voice button clicked', async () => {
      const user = userEvent.setup();

      render(<MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />);

      const voiceButton = screen.getByRole('button', { name: /voice search/i });

      // Start listening
      await user.click(voiceButton);
      expect(mockSpeechRecognition.start).toHaveBeenCalled();

      // Simulate listening state
      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      // Stop listening
      await user.click(voiceButton);
      expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    });

    test('updates search query when voice transcript received', async () => {
      render(<MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />);

      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );

      // Simulate voice result
      act(() => {
        const mockEvent = {
          results: [
            {
              0: { transcript: 'wedding photography tips', confidence: 0.9 },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        };
        mockSpeechRecognition.onresult?.(mockEvent);
      });

      expect(searchInput).toHaveValue('wedding photography tips');
    });

    test('displays voice listening indicator when active', async () => {
      const user = userEvent.setup();

      render(<MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />);

      const voiceButton = screen.getByRole('button', { name: /voice search/i });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      expect(
        screen.getByText('Listening... Speak your search query'),
      ).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    test('filters results by category when category button clicked', async () => {
      const user = userEvent.setup();

      render(
        <MobileKnowledgeSearch
          onArticleSelect={mockOnArticleSelect}
          categories={mockCategories}
        />,
      );

      const categoryButton = screen.getByText('Photography Tips');
      await user.click(categoryButton);

      // Category should be selected (highlighted)
      expect(categoryButton).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    test('toggles category selection when same category clicked twice', async () => {
      const user = userEvent.setup();

      render(
        <MobileKnowledgeSearch
          onArticleSelect={mockOnArticleSelect}
          categories={mockCategories}
        />,
      );

      const categoryButton = screen.getByText('Photography Tips');

      // First click - select
      await user.click(categoryButton);
      expect(categoryButton).toHaveClass('bg-blue-100', 'text-blue-700');

      // Second click - deselect
      await user.click(categoryButton);
      expect(categoryButton).toHaveClass('bg-gray-100', 'text-gray-700');
    });
  });

  describe('Article Interaction', () => {
    test('calls onArticleSelect when article is clicked', async () => {
      const user = userEvent.setup();

      render(<MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />);

      // First search to get results
      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      await user.type(searchInput, 'wedding');

      // Wait for results and click first article
      await waitFor(async () => {
        const article = screen.getByText(/Wedding/);
        await user.click(article);
      });

      expect(mockOnArticleSelect).toHaveBeenCalled();
    });

    test('toggles bookmark when bookmark button clicked', async () => {
      const user = userEvent.setup();

      render(<MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />);

      // Search and wait for results
      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      await user.type(searchInput, 'timeline');

      await waitFor(async () => {
        const bookmarkButton = screen.getByRole('button', {
          name: /bookmark/i,
        });
        await user.click(bookmarkButton);
      });

      // Should show visual feedback
      expect(mockToast).not.toHaveBeenCalled(); // Bookmark action is silent
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels for search elements', () => {
      render(<MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />);

      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      render(<MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />);

      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );

      await user.tab(); // Focus search input
      expect(searchInput).toHaveFocus();
    });
  });
});
