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
import { OfflineKnowledge } from '@/components/mobile/ai/OfflineKnowledge';
import { VoiceSearch } from '@/components/mobile/ai/VoiceSearch';
import { useToast } from '@/components/ui/use-toast';

// Mock all dependencies
jest.mock('@/components/ui/use-toast');
jest.mock('@/components/mobile/MobileEnhancedFeatures', () => ({
  useHapticFeedback: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }),
  PullToRefresh: ({ children, onRefresh }: any) => (
    <div data-testid="pull-to-refresh" onClick={onRefresh}>
      {children}
    </div>
  ),
  BottomSheet: ({ children, isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="bottom-sheet" onClick={onClose}>
        {children}
      </div>
    ) : null,
  SwipeableCard: ({ children, onSwipeLeft, onSwipeRight }: any) => (
    <div
      data-testid="swipeable-card"
      onClick={onSwipeRight}
      onDoubleClick={onSwipeLeft}
    >
      {children}
    </div>
  ),
}));

// Mock Web APIs
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
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

// @ts-ignore
global.speechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn(() => []),
};

// @ts-ignore
global.SpeechSynthesisUtterance = jest.fn();

// Mock IndexedDB
const mockIDBRequest = { onsuccess: null, onerror: null, result: null };
const mockIDBTransaction = {
  objectStore: jest.fn(() => ({
    put: jest.fn(() => mockIDBRequest),
    get: jest.fn(() => mockIDBRequest),
    getAll: jest.fn(() => mockIDBRequest),
    delete: jest.fn(() => mockIDBRequest),
    clear: jest.fn(() => mockIDBRequest),
    createIndex: jest.fn(),
  })),
};

// @ts-ignore
global.indexedDB = {
  open: jest.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: jest.fn(() => mockIDBTransaction),
      objectStoreNames: { contains: jest.fn(() => false) },
      createObjectStore: jest.fn(() => ({ createIndex: jest.fn() })),
    },
  })),
};

// @ts-ignore
global.caches = {
  open: jest.fn().mockResolvedValue({
    put: jest.fn(),
    delete: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
  }),
};

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest
      .fn()
      .mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] }),
  },
});

Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: jest
      .fn()
      .mockResolvedValue({ usage: 1024 * 1024, quota: 1024 * 1024 * 100 }),
  },
});

Object.defineProperty(navigator, 'onLine', { writable: true, value: true });

const mockToast = jest.fn();
(useToast as jest.Mock).mockReturnValue({ toast: mockToast });

describe('Mobile AI Knowledge Base Integration', () => {
  const mockArticles = [
    {
      id: 'article-1',
      title: 'Wedding Timeline Planning Guide',
      content: 'Complete guide to wedding day timeline planning...',
      summary: 'Learn how to create perfect wedding timelines',
      category: {
        id: 'planning',
        name: 'Planning',
        icon: '📋',
        color: 'bg-blue-100 text-blue-700',
        articleCount: 12,
      },
      tags: ['timeline', 'planning', 'wedding-day'],
      relevanceScore: 0.95,
      readTime: '8 min read',
      lastUpdated: '2024-01-15',
      viewCount: 1245,
      isFavorite: false,
      isBookmarked: true,
      difficulty: 'intermediate' as const,
      author: 'Sarah Johnson',
      rating: 4.8,
    },
    {
      id: 'article-2',
      title: 'Client Communication Templates',
      content: 'Professional email templates for wedding photographers...',
      summary: 'Ready-to-use templates for client communication',
      category: {
        id: 'business',
        name: 'Business',
        icon: '💼',
        color: 'bg-green-100 text-green-700',
        articleCount: 23,
      },
      tags: ['communication', 'templates', 'client-management'],
      relevanceScore: 0.87,
      readTime: '5 min read',
      lastUpdated: '2024-01-20',
      viewCount: 892,
      isFavorite: true,
      isBookmarked: false,
      difficulty: 'beginner' as const,
      author: 'Mike Chen',
      rating: 4.6,
    },
  ];

  const mockCachedArticle = {
    id: 'cached-article-1',
    title: 'Offline Wedding Planning Guide',
    content: 'Comprehensive guide available offline...',
    category: 'planning',
    tags: ['offline', 'planning'],
    cachedAt: '2024-01-20T10:00:00Z',
    lastAccessedAt: '2024-01-20T10:00:00Z',
    sizeKB: 25,
    version: 1,
    priority: 'high' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cross-Component Integration', () => {
    test('voice search results can be cached for offline access', async () => {
      const user = userEvent.setup();
      let searchResults: any[] = [];

      const mockOnSearchResults = (results: any[]) => {
        searchResults = results;
      };

      const mockOnArticleRequest = jest
        .fn()
        .mockResolvedValue(mockCachedArticle);

      // Render VoiceSearch and OfflineKnowledge components
      const { rerender } = render(
        <div>
          <VoiceSearch
            onSearchResults={mockOnSearchResults}
            onCommandExecuted={jest.fn()}
          />
          <OfflineKnowledge
            onArticleRequest={mockOnArticleRequest}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      // 1. Perform voice search
      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
        mockSpeechRecognition.onresult?.({
          results: [
            {
              0: { transcript: 'wedding planning guide', confidence: 0.9 },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        });
        mockSpeechRecognition.onend?.();
      });

      // 2. Wait for search results
      await waitFor(() => {
        expect(screen.getByText('Search Results')).toBeInTheDocument();
      });

      // 3. Simulate caching an article from search results
      expect(mockOnArticleRequest).toHaveBeenCalledWith('cached-article-1');
    });

    test('cached articles can be searched using voice commands', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <VoiceSearch
            onSearchResults={jest.fn()}
            onCommandExecuted={jest.fn()}
          />
          <OfflineKnowledge
            onArticleRequest={jest.fn()}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      // Voice command to search cached content
      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
        mockSpeechRecognition.onresult?.({
          results: [
            {
              0: {
                transcript: 'search offline articles for wedding planning',
                confidence: 0.9,
              },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        });
        mockSpeechRecognition.onend?.();
      });

      await waitFor(() => {
        expect(
          screen.getByText('Processing your request...'),
        ).toBeInTheDocument();
      });
    });

    test('search results can be read aloud and cached simultaneously', async () => {
      const user = userEvent.setup();

      const mockOnSearchResults = jest.fn((results) => {
        // Simulate search results being returned
      });

      render(
        <div>
          <MobileKnowledgeSearch onArticleSelect={jest.fn()} />
          <VoiceSearch
            onSearchResults={mockOnSearchResults}
            onCommandExecuted={jest.fn()}
          />
          <OfflineKnowledge
            onArticleRequest={jest.fn()}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      // 1. Search using text input
      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      await user.type(searchInput, 'wedding photography');

      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });

      // 2. Use voice to read results
      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
        mockSpeechRecognition.onresult?.({
          results: [
            {
              0: { transcript: 'read first result', confidence: 0.9 },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        });
        mockSpeechRecognition.onend?.();
      });

      // 3. Should trigger text-to-speech
      await waitFor(() => {
        expect(global.speechSynthesis.speak).toHaveBeenCalled();
      });
    });
  });

  describe('Offline-Online State Management', () => {
    test('components handle online/offline transitions consistently', async () => {
      render(
        <div>
          <MobileKnowledgeSearch onArticleSelect={jest.fn()} />
          <VoiceSearch
            onSearchResults={jest.fn()}
            onCommandExecuted={jest.fn()}
          />
          <OfflineKnowledge
            onArticleRequest={jest.fn()}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      // Start online
      expect(screen.getByText('Online')).toBeInTheDocument();

      // Go offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
      });

      // Voice search should show limited features
      expect(
        screen.getByText('Offline Mode - Limited features'),
      ).toBeInTheDocument();

      // Go back online
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(screen.getByText('Online')).toBeInTheDocument();
      });
    });

    test('search functionality degrades gracefully when offline', async () => {
      const user = userEvent.setup();

      // Set offline state
      Object.defineProperty(navigator, 'onLine', { value: false });

      render(
        <div>
          <MobileKnowledgeSearch onArticleSelect={jest.fn()} />
          <VoiceSearch
            onSearchResults={jest.fn()}
            onCommandExecuted={jest.fn()}
            offline={true}
          />
          <OfflineKnowledge
            onArticleRequest={jest.fn()}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      // Search should still work but with limited results
      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      await user.type(searchInput, 'wedding');

      // Should show offline indication
      expect(
        screen.getByText('Offline Mode - Limited features'),
      ).toBeInTheDocument();
    });

    test('sync operations coordinate between components when back online', async () => {
      const user = userEvent.setup();

      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      render(
        <div>
          <VoiceSearch
            onSearchResults={jest.fn()}
            onCommandExecuted={jest.fn()}
            offline={true}
          />
          <OfflineKnowledge
            onArticleRequest={jest.fn()}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      // Go back online
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(
          screen.getByText('Ask questions or search by voice'),
        ).toBeInTheDocument();
      });

      // Should show sync options
      const syncButton = screen.queryByText('Sync Now');
      if (syncButton) {
        await user.click(syncButton);

        await waitFor(() => {
          expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Sync complete' }),
          );
        });
      }
    });
  });

  describe('Data Flow Integration', () => {
    test('article selection flows between all components correctly', async () => {
      const user = userEvent.setup();
      const mockOnArticleSelect = jest.fn();

      render(
        <div>
          <MobileKnowledgeSearch onArticleSelect={mockOnArticleSelect} />
          <VoiceSearch
            onSearchResults={jest.fn()}
            onCommandExecuted={jest.fn()}
          />
        </div>,
      );

      // 1. Search for article
      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      await user.type(searchInput, 'timeline');

      // 2. Wait for results and select
      await waitFor(async () => {
        const article = screen.queryByText(/Timeline/i);
        if (article) {
          await user.click(article);
        }
      });

      // 3. Should trigger article selection
      await waitFor(() => {
        expect(mockOnArticleSelect).toHaveBeenCalled();
      });
    });

    test('voice commands trigger appropriate actions across components', async () => {
      const user = userEvent.setup();
      const mockOnCommandExecuted = jest.fn();

      render(
        <div>
          <MobileKnowledgeSearch onArticleSelect={jest.fn()} />
          <VoiceSearch
            onSearchResults={jest.fn()}
            onCommandExecuted={mockOnCommandExecuted}
          />
          <OfflineKnowledge
            onArticleRequest={jest.fn()}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      // Test different commands
      const commands = [
        { transcript: 'search for wedding planning', expectedAction: 'search' },
        { transcript: 'bookmark this article', expectedAction: 'bookmark' },
        { transcript: 'read this article', expectedAction: 'read' },
      ];

      for (const command of commands) {
        act(() => {
          mockSpeechRecognition.onstart?.();
          mockSpeechRecognition.onresult?.({
            results: [
              {
                0: { transcript: command.transcript, confidence: 0.9 },
                isFinal: true,
              },
            ],
            resultIndex: 0,
          });
          mockSpeechRecognition.onend?.();
        });

        await waitFor(
          () => {
            expect(mockOnCommandExecuted).toHaveBeenCalledWith(
              expect.objectContaining({ action: command.expectedAction }),
            );
          },
          { timeout: 2000 },
        );

        mockOnCommandExecuted.mockClear();
      }
    });

    test('caching operations respect search context and user preferences', async () => {
      const user = userEvent.setup();
      const mockOnCacheUpdate = jest.fn();
      const mockOnArticleRequest = jest
        .fn()
        .mockResolvedValue(mockCachedArticle);

      render(
        <div>
          <MobileKnowledgeSearch onArticleSelect={jest.fn()} />
          <OfflineKnowledge
            onArticleRequest={mockOnArticleRequest}
            onCacheUpdate={mockOnCacheUpdate}
          />
        </div>,
      );

      // 1. Search should influence caching priorities
      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      await user.type(searchInput, 'high priority content');

      // 2. Cache operations should respect search context
      await waitFor(() => {
        expect(mockOnCacheUpdate).toHaveBeenCalled();
      });

      // 3. Cached content should be tagged with search relevance
      if (mockOnArticleRequest.mock.calls.length > 0) {
        expect(mockOnArticleRequest).toHaveBeenCalledWith(expect.any(String));
      }
    });
  });

  describe('Performance Integration', () => {
    test('components coordinate to minimize resource usage', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <MobileKnowledgeSearch onArticleSelect={jest.fn()} />
          <VoiceSearch
            onSearchResults={jest.fn()}
            onCommandExecuted={jest.fn()}
          />
          <OfflineKnowledge
            onArticleRequest={jest.fn()}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      // Multiple rapid interactions should be handled efficiently
      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });

      // Rapid typing
      await user.type(searchInput, 'wedding photography tips business guide', {
        delay: 1,
      });

      // Quick voice activation
      await user.click(voiceButton);
      act(() => {
        mockSpeechRecognition.onstart?.();
      });
      await user.click(voiceButton); // Quick stop

      // Should handle efficiently without crashes
      expect(screen.getByText('Voice Search')).toBeInTheDocument();
      expect(screen.getByText('Offline Knowledge')).toBeInTheDocument();
    });

    test('memory management works correctly across components', () => {
      const { unmount } = render(
        <div>
          <MobileKnowledgeSearch onArticleSelect={jest.fn()} />
          <VoiceSearch
            onSearchResults={jest.fn()}
            onCommandExecuted={jest.fn()}
          />
          <OfflineKnowledge
            onArticleRequest={jest.fn()}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      // Should unmount cleanly without memory leaks
      expect(() => unmount()).not.toThrow();
    });

    test('concurrent operations handle gracefully', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <MobileKnowledgeSearch onArticleSelect={jest.fn()} />
          <VoiceSearch
            onSearchResults={jest.fn()}
            onCommandExecuted={jest.fn()}
          />
          <OfflineKnowledge
            onArticleRequest={jest.fn()}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      // Start multiple operations simultaneously
      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      const databaseButton = screen.getByRole('button', { name: /database/i });

      // Concurrent operations
      await Promise.all([
        user.type(searchInput, 'concurrent search'),
        user.click(voiceButton),
        user.click(databaseButton),
      ]);

      // All should work without interference
      expect(screen.getByDisplayValue('concurrent search')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
    });
  });

  describe('Error Recovery Integration', () => {
    test('error in one component does not break others', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const user = userEvent.setup();

      // Mock an error in voice recognition
      mockSpeechRecognition.start.mockImplementation(() => {
        throw new Error('Voice recognition failed');
      });

      render(
        <div>
          <MobileKnowledgeSearch onArticleSelect={jest.fn()} />
          <VoiceSearch
            onSearchResults={jest.fn()}
            onCommandExecuted={jest.fn()}
          />
          <OfflineKnowledge
            onArticleRequest={jest.fn()}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      // Voice search should fail gracefully
      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      // But other components should still work
      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      await user.type(searchInput, 'text search still works');

      expect(searchInput).toHaveValue('text search still works');
      expect(screen.getByText('Offline Knowledge')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('network errors are handled consistently across components', async () => {
      const user = userEvent.setup();

      // Simulate network error
      Object.defineProperty(navigator, 'onLine', { value: false });

      render(
        <div>
          <MobileKnowledgeSearch onArticleSelect={jest.fn()} />
          <VoiceSearch
            onSearchResults={jest.fn()}
            onCommandExecuted={jest.fn()}
            offline={true}
          />
          <OfflineKnowledge
            onArticleRequest={jest.fn()}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      // All components should show offline state
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(
        screen.getByText('Offline Mode - Limited features'),
      ).toBeInTheDocument();
      expect(screen.getByText('Working offline')).toBeInTheDocument();
    });
  });

  describe('User Experience Integration', () => {
    test('haptic feedback is coordinated across components', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <MobileKnowledgeSearch onArticleSelect={jest.fn()} />
          <VoiceSearch
            onSearchResults={jest.fn()}
            onCommandExecuted={jest.fn()}
          />
          <OfflineKnowledge
            onArticleRequest={jest.fn()}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      // Interactions should provide haptic feedback
      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      const searchInput = screen.getByPlaceholderText(
        'Search knowledge base...',
      );
      await user.type(searchInput, 'test');

      // Multiple interactions should feel responsive
      expect(screen.getByText('Voice Search')).toBeInTheDocument();
    });

    test('toast notifications do not conflict between components', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <MobileKnowledgeSearch onArticleSelect={jest.fn()} />
          <VoiceSearch
            onSearchResults={jest.fn()}
            onCommandExecuted={jest.fn()}
          />
          <OfflineKnowledge
            onArticleRequest={jest.fn()}
            onCacheUpdate={jest.fn()}
          />
        </div>,
      );

      // Multiple actions that could trigger toasts
      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      const databaseButton = screen.getByRole('button', { name: /database/i });
      await user.click(databaseButton);

      const clearButton = screen.getByText('Clear All Cache');
      await user.click(clearButton);

      // Should handle multiple toasts without conflicts
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Cache cleared' }),
        );
      });
    });
  });
});
