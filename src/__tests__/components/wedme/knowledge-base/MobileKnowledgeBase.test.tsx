import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { MobileKnowledgeBase } from '@/components/wedme/knowledge-base/MobileKnowledgeBase';
import { useOfflineKnowledge } from '@/hooks/useOfflineKnowledge';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';

// Mock the hooks
jest.mock('@/hooks/useOfflineKnowledge');
jest.mock('@/hooks/useVoiceSearch');

const mockUseOfflineKnowledge = useOfflineKnowledge as jest.MockedFunction<
  typeof useOfflineKnowledge
>;
const mockUseVoiceSearch = useVoiceSearch as jest.MockedFunction<
  typeof useVoiceSearch
>;

describe('MobileKnowledgeBase', () => {
  const mockCategories = [
    {
      id: '1',
      name: 'Venue Selection',
      description: 'Find the perfect wedding venue',
      icon: 'MapPin',
      articleCount: 15,
      color: 'rose',
      timeline: ['early-planning'],
    },
    {
      id: '2',
      name: 'Photography',
      description: 'Capture your special moments',
      icon: 'Camera',
      articleCount: 25,
      color: 'blue',
      timeline: ['active-planning'],
    },
  ];

  const mockRecentArticles = [
    {
      id: 'article-1',
      title: 'How to Choose the Perfect Wedding Venue',
      excerpt: 'Essential questions to ask when touring venues',
      category: 'venue',
      readTime: 8,
      helpful: 92,
      slug: 'perfect-wedding-venue',
    },
  ];

  const mockUserProgress = {
    articlesRead: 5,
    categoriesExplored: 3,
    bookmarks: 2,
    weddingPhase: 'early-planning' as const,
  };

  const defaultProps = {
    categories: mockCategories,
    recentArticles: mockRecentArticles,
    userProgress: mockUserProgress,
    coupleId: 'couple-123',
    weddingDate: new Date('2025-08-15'),
  };

  beforeEach(() => {
    mockUseOfflineKnowledge.mockReturnValue({
      isOffline: false,
      offlineArticles: [],
      lastSync: new Date(),
      syncWithServer: jest.fn(),
      searchOfflineArticles: jest.fn(),
      cacheArticle: jest.fn(),
      removeFromCache: jest.fn(),
      clearCache: jest.fn(),
      getCacheSize: jest.fn().mockReturnValue(0),
      getMaxCacheSize: jest.fn().mockReturnValue(50 * 1024 * 1024),
      isArticleCached: jest.fn().mockReturnValue(false),
    });

    mockUseVoiceSearch.mockReturnValue({
      isListening: false,
      transcript: '',
      error: null,
      results: null,
      isProcessing: false,
      confidence: 0,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      toggleListening: jest.fn(),
      resetState: jest.fn(),
      isSupported: jest.fn().mockReturnValue(true),
      processVoiceSearch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders mobile knowledge base with categories', () => {
    render(<MobileKnowledgeBase {...defaultProps} />);

    expect(screen.getByText('Wedding Guidance')).toBeInTheDocument();
    expect(screen.getByText('Venue Selection')).toBeInTheDocument();
    expect(screen.getByText('Photography')).toBeInTheDocument();
    expect(
      screen.getByText('Find the perfect wedding venue'),
    ).toBeInTheDocument();
  });

  it('displays user progress correctly', () => {
    render(<MobileKnowledgeBase {...defaultProps} />);

    expect(screen.getByText('5 articles read')).toBeInTheDocument();
    expect(screen.getByText('3 categories explored')).toBeInTheDocument();
    expect(screen.getByText('2 bookmarks')).toBeInTheDocument();
  });

  it('shows wedding phase indicator', () => {
    render(<MobileKnowledgeBase {...defaultProps} />);

    expect(screen.getByText('Early Planning Phase')).toBeInTheDocument();
  });

  it('displays offline indicator when offline', () => {
    mockUseOfflineKnowledge.mockReturnValue({
      isOffline: true,
      offlineArticles: [mockRecentArticles[0]],
      lastSync: new Date(),
      syncWithServer: jest.fn(),
      searchOfflineArticles: jest.fn(),
      cacheArticle: jest.fn(),
      removeFromCache: jest.fn(),
      clearCache: jest.fn(),
      getCacheSize: jest.fn().mockReturnValue(0),
      getMaxCacheSize: jest.fn().mockReturnValue(50 * 1024 * 1024),
      isArticleCached: jest.fn().mockReturnValue(false),
    });

    render(<MobileKnowledgeBase {...defaultProps} />);

    expect(screen.getByText('Offline Mode')).toBeInTheDocument();
    expect(screen.getByText('1 article available offline')).toBeInTheDocument();
  });

  it('opens search interface when search button is clicked', async () => {
    render(<MobileKnowledgeBase {...defaultProps} />);

    const searchButton = screen.getByLabelText('Search wedding guidance');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Search wedding guidance/),
      ).toBeInTheDocument();
    });
  });

  it('opens voice search interface when voice button is clicked', async () => {
    render(<MobileKnowledgeBase {...defaultProps} />);

    const voiceButton = screen.getByLabelText('Voice search');
    fireEvent.click(voiceButton);

    await waitFor(() => {
      expect(
        screen.getByText('Ask me anything about your wedding'),
      ).toBeInTheDocument();
    });
  });

  it('handles voice search not supported gracefully', () => {
    mockUseVoiceSearch.mockReturnValue({
      isListening: false,
      transcript: '',
      error: null,
      results: null,
      isProcessing: false,
      confidence: 0,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      toggleListening: jest.fn(),
      resetState: jest.fn(),
      isSupported: jest.fn().mockReturnValue(false),
      processVoiceSearch: jest.fn(),
    });

    render(<MobileKnowledgeBase {...defaultProps} />);

    const voiceButton = screen.queryByLabelText('Voice search');
    expect(voiceButton).not.toBeInTheDocument();
  });

  it('calculates days until wedding correctly', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 100);

    render(<MobileKnowledgeBase {...defaultProps} weddingDate={futureDate} />);

    expect(screen.getByText(/100 days to go/)).toBeInTheDocument();
  });

  it('shows wedding phase relevance in categories', () => {
    render(<MobileKnowledgeBase {...defaultProps} />);

    // Early planning phase should highlight venue selection
    const venueCategory = screen
      .getByText('Venue Selection')
      .closest('[data-testid="category-card"]');
    expect(venueCategory).toHaveClass('ring-2', 'ring-rose-200');
  });

  it('handles category click navigation', () => {
    render(<MobileKnowledgeBase {...defaultProps} />);

    const venueCategory = screen.getByText('Venue Selection');
    fireEvent.click(venueCategory);

    // Should navigate to category page (in real app)
    expect(venueCategory.closest('a')).toHaveAttribute(
      'href',
      '/knowledge/venue-selection',
    );
  });

  it('renders recent articles section', () => {
    render(<MobileKnowledgeBase {...defaultProps} />);

    expect(screen.getByText('Continue Reading')).toBeInTheDocument();
    expect(
      screen.getByText('How to Choose the Perfect Wedding Venue'),
    ).toBeInTheDocument();
    expect(screen.getByText('8 min read')).toBeInTheDocument();
    expect(screen.getByText('92% helpful')).toBeInTheDocument();
  });

  it('displays empty state when no recent articles', () => {
    render(<MobileKnowledgeBase {...defaultProps} recentArticles={[]} />);

    expect(screen.getByText('No recent articles')).toBeInTheDocument();
    expect(
      screen.getByText('Start exploring to see your reading history'),
    ).toBeInTheDocument();
  });

  it('handles sync with server when coming back online', async () => {
    const syncMock = jest.fn();
    mockUseOfflineKnowledge.mockReturnValue({
      isOffline: false,
      offlineArticles: [],
      lastSync: new Date(),
      syncWithServer: syncMock,
      searchOfflineArticles: jest.fn(),
      cacheArticle: jest.fn(),
      removeFromCache: jest.fn(),
      clearCache: jest.fn(),
      getCacheSize: jest.fn().mockReturnValue(0),
      getMaxCacheSize: jest.fn().mockReturnValue(50 * 1024 * 1024),
      isArticleCached: jest.fn().mockReturnValue(false),
    });

    render(<MobileKnowledgeBase {...defaultProps} />);

    // Component should automatically sync when coming online
    await waitFor(() => {
      expect(syncMock).toHaveBeenCalled();
    });
  });

  // Mobile-specific tests
  it('has proper touch targets for mobile', () => {
    render(<MobileKnowledgeBase {...defaultProps} />);

    const searchButton = screen.getByLabelText('Search wedding guidance');
    const voiceButton = screen.getByLabelText('Voice search');

    // Check minimum 48px touch targets
    expect(searchButton).toHaveStyle({ minHeight: '48px', minWidth: '48px' });
    expect(voiceButton).toHaveStyle({ minHeight: '48px', minWidth: '48px' });
  });

  it('renders responsively on small screens', () => {
    // Mock viewport size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone SE width
    });

    render(<MobileKnowledgeBase {...defaultProps} />);

    const container = screen.getByRole('main');
    expect(container).toHaveClass('px-4'); // Mobile padding
  });
});
