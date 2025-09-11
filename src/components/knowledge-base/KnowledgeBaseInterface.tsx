'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  AcademicCapIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// Import all knowledge base components
import { IntelligentSearchBar } from './IntelligentSearchBar';
import { SearchResults } from './SearchResults';
import { ArticleDisplay } from './ArticleDisplay';
import { TutorialProgress } from './TutorialProgress';
import { KnowledgeBaseNavigation } from './KnowledgeBaseNavigation';
import { ContextualHelpWidget } from './ContextualHelpWidget';
import { ArticleRating } from './ArticleRating';

// Types and interfaces
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  articleCount: number;
  subcategories?: Category[];
}

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  categoryId: string;
  categoryName?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
  lastUpdated: string;
  author: string;
  authorAvatar?: string;
  rating: number;
  viewCount: number;
  helpfulVotes: number;
  totalVotes: number;
  relatedArticles?: RelatedArticle[];
}

interface RelatedArticle {
  id: string;
  title: string;
  excerpt: string;
  estimatedReadTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  totalSteps: number;
  completedSteps: number;
  estimatedTime: number;
  timeSpent: number;
  lastAccessed?: string;
  steps: TutorialStep[];
  certificate?: {
    available: boolean;
    earned: boolean;
    earnedDate?: string;
  };
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  isCompleted: boolean;
  isOptional?: boolean;
  videoUrl?: string;
  resources?: Resource[];
}

interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'link' | 'template' | 'checklist';
  url: string;
  size?: string;
}

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  type: 'article' | 'tutorial';
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
  rating: number;
  viewCount: number;
  lastUpdated: string;
  matchedTerms?: string[];
}

interface UserProgress {
  completedTutorials: string[];
  completedSteps: string[];
  bookmarkedArticles: string[];
  searchHistory: string[];
  totalTutorials: number;
  completedTutorialsCount: number;
  totalSteps: number;
  completedStepsCount: number;
  timeSpent: number;
  streak: number;
  badges: Badge[];
  level: {
    current: number;
    name: string;
    progress: number;
    nextLevelXP: number;
  };
  lastVisited: {
    articleId?: string;
    tutorialId?: string;
    timestamp: string;
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedDate: string;
  category: 'completion' | 'streak' | 'time' | 'specialty';
}

interface AnalyticsEvent {
  event: string;
  timestamp: string;
  data: any;
  userId?: string;
  sessionId: string;
}

export interface KnowledgeBaseInterfaceProps {
  className?: string;
  defaultView?: 'dashboard' | 'search' | 'article' | 'tutorial';
  onAnalyticsEvent?: (event: string, data: any) => void;
  userId?: string;
  theme?: 'light' | 'dark';
}

type ViewType = 'dashboard' | 'search' | 'article' | 'tutorial' | 'category';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { id: 'search', label: 'Search', icon: MagnifyingGlassIcon },
  { id: 'articles', label: 'Articles', icon: BookOpenIcon },
  { id: 'tutorials', label: 'Tutorials', icon: AcademicCapIcon },
  { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
  { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
];

// Mock data - in production, these would come from props or API calls
const mockCategories: Category[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    slug: 'getting-started',
    description: 'Essential basics for new WedSync users',
    articleCount: 12,
    subcategories: [
      {
        id: 'setup',
        name: 'Initial Setup',
        slug: 'setup',
        description: '',
        articleCount: 5,
      },
      {
        id: 'first-steps',
        name: 'First Steps',
        slug: 'first-steps',
        description: '',
        articleCount: 7,
      },
    ],
  },
  {
    id: 'client-management',
    name: 'Client Management',
    slug: 'client-management',
    description: 'Managing your wedding clients effectively',
    articleCount: 23,
  },
  {
    id: 'forms-workflows',
    name: 'Forms & Workflows',
    slug: 'forms-workflows',
    description: 'Creating and managing client forms',
    articleCount: 18,
  },
];

const mockUserProgress: UserProgress = {
  completedTutorials: ['tutorial-1', 'tutorial-2'],
  completedSteps: ['step-1', 'step-2', 'step-3'],
  bookmarkedArticles: ['article-1', 'article-3'],
  searchHistory: ['client onboarding', 'form builder', 'payment setup'],
  totalTutorials: 15,
  completedTutorialsCount: 3,
  totalSteps: 45,
  completedStepsCount: 12,
  timeSpent: 240,
  streak: 5,
  badges: [],
  level: { current: 2, name: 'Apprentice', progress: 65, nextLevelXP: 500 },
  lastVisited: { timestamp: '2025-01-20T10:00:00Z' },
};

export function KnowledgeBaseInterface({
  className = '',
  defaultView = 'dashboard',
  onAnalyticsEvent,
  userId,
  theme = 'light',
}: KnowledgeBaseInterfaceProps) {
  // State management
  const [currentView, setCurrentView] = useState<ViewType>(defaultView);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [userProgress, setUserProgress] =
    useState<UserProgress>(mockUserProgress);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random()}`);

  // Analytics tracking
  const trackEvent = useCallback(
    (event: string, data: any = {}) => {
      const eventData: AnalyticsEvent = {
        event,
        timestamp: new Date().toISOString(),
        data: { ...data, currentView },
        userId,
        sessionId,
      };

      onAnalyticsEvent?.(event, eventData);

      // Store in local analytics for user insights
      const analytics = JSON.parse(
        localStorage.getItem('kb-analytics') || '[]',
      );
      analytics.push(eventData);

      // Keep only last 100 events
      if (analytics.length > 100) analytics.splice(0, analytics.length - 100);
      localStorage.setItem('kb-analytics', JSON.stringify(analytics));
    },
    [currentView, onAnalyticsEvent, userId, sessionId],
  );

  // Search functionality
  const handleSearch = useCallback(
    async (query: string, filters?: any) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      setSearchQuery(query);

      trackEvent('search_initiated', { query, filters });

      try {
        // Mock API call - replace with actual API
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Mock search results
        const mockResults: SearchResult[] = [
          {
            id: 'result-1',
            title: 'Setting up your first wedding form',
            excerpt: 'Learn how to create professional client intake forms...',
            type: 'article',
            category: 'Forms & Workflows',
            tags: ['forms', 'setup', 'clients'],
            difficulty: 'beginner',
            estimatedReadTime: 5,
            rating: 4.8,
            viewCount: 1247,
            lastUpdated: '2025-01-15T10:00:00Z',
            matchedTerms: query.split(' '),
          },
        ];

        setSearchResults(mockResults);
        setCurrentView('search');

        trackEvent('search_completed', {
          query,
          resultsCount: mockResults.length,
          filters,
        });
      } catch (error) {
        console.error('Search failed:', error);
        trackEvent('search_failed', { query, error: error.message });
      } finally {
        setIsLoading(false);
      }
    },
    [trackEvent],
  );

  // Navigation handlers
  const handleNavigationClick = useCallback(
    (viewId: string) => {
      setCurrentView(viewId as ViewType);
      setSelectedArticle(null);
      setSelectedTutorial(null);

      trackEvent('navigation_click', { viewId, previousView: currentView });
    },
    [currentView, trackEvent],
  );

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      setCurrentView('category');
      trackEvent('category_selected', { categoryId });
    },
    [trackEvent],
  );

  // Content handlers
  const handleArticleClick = useCallback(
    (result: SearchResult | RelatedArticle) => {
      // Mock article loading - replace with actual API
      const mockArticle: Article = {
        id: result.id,
        title: result.title,
        slug: result.title.toLowerCase().replace(/\s+/g, '-'),
        content:
          '<h2>Article Content</h2><p>This would contain the full article content...</p>',
        excerpt: result.excerpt,
        categoryId: 'forms-workflows',
        categoryName: 'Forms & Workflows',
        tags: ['forms', 'setup'],
        difficulty: result.difficulty,
        estimatedReadTime: result.estimatedReadTime,
        lastUpdated: '2025-01-15T10:00:00Z',
        author: 'WedSync Team',
        rating: 4.8,
        viewCount: 1247,
        helpfulVotes: 156,
        totalVotes: 180,
        relatedArticles: [],
      };

      setSelectedArticle(mockArticle);
      setCurrentView('article');

      trackEvent('article_opened', {
        articleId: result.id,
        title: result.title,
      });
    },
    [trackEvent],
  );

  const handleTutorialClick = useCallback(
    (result: SearchResult) => {
      // Mock tutorial loading - replace with actual API
      const mockTutorial: Tutorial = {
        id: result.id,
        title: result.title,
        description: result.excerpt,
        category: result.category,
        difficulty: result.difficulty,
        totalSteps: 5,
        completedSteps: 2,
        estimatedTime: 30,
        timeSpent: 15,
        steps: [],
        certificate: { available: true, earned: false },
      };

      setSelectedTutorial(mockTutorial);
      setCurrentView('tutorial');

      trackEvent('tutorial_opened', {
        tutorialId: result.id,
        title: result.title,
      });
    },
    [trackEvent],
  );

  // Tutorial progress handlers
  const handleStepComplete = useCallback(
    (tutorialId: string, stepId: string) => {
      setUserProgress((prev) => ({
        ...prev,
        completedSteps: [...prev.completedSteps, stepId],
      }));

      trackEvent('tutorial_step_completed', { tutorialId, stepId });
    },
    [trackEvent],
  );

  const handleStepStart = useCallback(
    (tutorialId: string, stepId: string) => {
      trackEvent('tutorial_step_started', { tutorialId, stepId });
    },
    [trackEvent],
  );

  // Article interaction handlers
  const handleBookmarkToggle = useCallback(
    (articleId: string, isBookmarked: boolean) => {
      setUserProgress((prev) => ({
        ...prev,
        bookmarkedArticles: isBookmarked
          ? [...prev.bookmarkedArticles, articleId]
          : prev.bookmarkedArticles.filter((id) => id !== articleId),
      }));

      trackEvent('bookmark_toggled', { articleId, isBookmarked });
    },
    [trackEvent],
  );

  const handleRatingSubmit = useCallback(
    (articleId: string, rating: number, feedback: string) => {
      trackEvent('rating_submitted', { articleId, rating, feedback });
    },
    [trackEvent],
  );

  // Contextual help
  const helpContext = useMemo(
    () => ({
      page: currentView,
      articleId: selectedArticle?.id,
      tutorialId: selectedTutorial?.id,
    }),
    [currentView, selectedArticle?.id, selectedTutorial?.id],
  );

  const handleHelpRequest = useCallback(
    (query: string) => {
      handleSearch(query);
      trackEvent('help_request', { query, context: helpContext });
    },
    [handleSearch, helpContext, trackEvent],
  );

  // View rendering
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="p-6"
          >
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to WedSync Knowledge Base
              </h1>
              <p className="text-gray-600">
                Find answers, learn new skills, and master your wedding business
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-lg font-semibold text-gray-900">
                  {userProgress.completedTutorialsCount}
                </div>
                <div className="text-sm text-gray-600">Tutorials Completed</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-lg font-semibold text-gray-900">
                  {userProgress.level.current}
                </div>
                <div className="text-sm text-gray-600">Current Level</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-lg font-semibold text-gray-900">
                  {userProgress.streak}
                </div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-lg font-semibold text-gray-900">
                  {userProgress.bookmarkedArticles.length}
                </div>
                <div className="text-sm text-gray-600">Bookmarks</div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-8">
              <IntelligentSearchBar
                value={searchQuery}
                onSearch={handleSearch}
                categories={mockCategories}
                placeholder="Search for help articles, tutorials, or guides..."
              />
            </div>

            {/* Recent Activity & Quick Links would go here */}
          </motion.div>
        );

      case 'search':
        return (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="p-6"
          >
            <div className="mb-6">
              <IntelligentSearchBar
                value={searchQuery}
                onSearch={handleSearch}
                categories={mockCategories}
                placeholder="Search knowledge base..."
              />
            </div>

            <SearchResults
              query={searchQuery}
              results={searchResults}
              isLoading={isLoading}
              onArticleClick={handleArticleClick}
              onTutorialClick={handleTutorialClick}
            />
          </motion.div>
        );

      case 'article':
        return selectedArticle ? (
          <ArticleDisplay
            key={`article-${selectedArticle.id}`}
            article={selectedArticle}
            onBackClick={() => setCurrentView('dashboard')}
            onRelatedArticleClick={handleArticleClick}
            onBookmarkToggle={handleBookmarkToggle}
            onRatingSubmit={handleRatingSubmit}
            isBookmarked={userProgress.bookmarkedArticles.includes(
              selectedArticle.id,
            )}
            className="min-h-screen"
          />
        ) : null;

      case 'tutorial':
        return selectedTutorial ? (
          <div className="p-6">
            <TutorialProgress
              tutorial={selectedTutorial}
              userProgress={userProgress}
              onStepComplete={handleStepComplete}
              onStepStart={handleStepStart}
              onBookmarkToggle={handleBookmarkToggle}
              isBookmarked={(stepId) =>
                userProgress.bookmarkedArticles.includes(stepId)
              }
            />
          </div>
        ) : null;

      default:
        return (
          <div className="p-6 text-center">
            <p className="text-gray-600">View not implemented yet</p>
          </div>
        );
    }
  };

  // Effect for tracking view changes
  useEffect(() => {
    trackEvent('view_changed', { view: currentView });
  }, [currentView, trackEvent]);

  return (
    <div
      className={`min-h-screen bg-gray-50 ${className} ${theme === 'dark' ? 'dark' : ''}`}
    >
      <div className="flex h-screen">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">
              Knowledge Base
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigationClick(item.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    currentView === item.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Category Navigation */}
            <div className="mt-8">
              <KnowledgeBaseNavigation
                categories={mockCategories}
                onCategorySelect={handleCategorySelect}
                userProgress={userProgress}
              />
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">{renderCurrentView()}</AnimatePresence>
        </div>
      </div>

      {/* Contextual Help Widget */}
      <ContextualHelpWidget
        currentContext={helpContext}
        onHelpRequest={handleHelpRequest}
        position="bottom-right"
      />
    </div>
  );
}
