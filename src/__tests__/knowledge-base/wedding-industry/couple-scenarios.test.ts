import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { WedMeKnowledgeBase } from '@/components/wedme/knowledge-base/WedMeKnowledgeBase';
import { knowledgeBaseService } from '@/lib/knowledge-base/knowledge-base-service';

// Mock the knowledge base service
vi.mock('@/lib/knowledge-base/knowledge-base-service');

describe('Couple Experience Scenarios (WedMe App)', () => {
  const mockKnowledgeBaseService = vi.mocked(knowledgeBaseService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Wedding Planning Journey Scenarios', () => {
    it('should help newly engaged couples understand wedding planning basics', async () => {
      const beginnerArticles = [
        {
          id: 'wedding-planning-101',
          title: 'Your First Steps After Getting Engaged',
          content: 'A comprehensive guide to starting your wedding planning journey, from setting budgets to choosing your venue.',
          category: 'Getting Started',
          tags: ['engagement', 'first-steps', 'planning-basics'],
          relevanceScore: 0.97,
          readTime: '8 min',
          difficulty: 'Beginner',
          couplesRating: 4.9
        },
        {
          id: 'wedding-budget-basics',
          title: 'How to Set a Realistic Wedding Budget',
          content: 'Learn to allocate your wedding budget across venues, catering, photography, and other essentials.',
          category: 'Budget Planning',
          tags: ['budget', 'financial-planning', 'cost-breakdown'],
          relevanceScore: 0.92,
          readTime: '6 min',
          difficulty: 'Beginner'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: beginnerArticles,
        total: 2,
        searchTime: 178,
        suggestions: ['venue selection', 'guest count planning', 'wedding timeline']
      });

      const user = userEvent.setup();
      render(<WedMeKnowledgeBase weddingDate="2025-08-15" planningStage="just-engaged" />);

      // Search for beginner planning help
      const searchInput = screen.getByRole('textbox', { name: /search wedding help/i });
      await user.type(searchInput, 'how to start planning wedding');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Wait for couple-friendly results
      await waitFor(() => {
        expect(screen.getByText('Your First Steps After Getting Engaged')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify couple-specific UI elements
      expect(screen.getByText(/8 min read/i)).toBeInTheDocument();
      expect(screen.getByText(/Beginner/i)).toBeInTheDocument();
      expect(screen.getByText(/4.9/i)).toBeInTheDocument(); // Rating display
      expect(screen.getByText(/setting budgets.*choosing your venue/i)).toBeInTheDocument();

      // Check that search is personalized for couples
      expect(mockKnowledgeBaseService.searchArticles).toHaveBeenCalledWith({
        query: 'how to start planning wedding',
        userType: 'couple',
        weddingDate: '2025-08-15',
        planningStage: 'just-engaged',
        limit: 20
      });
    });

    it('should provide timeline-specific guidance based on wedding date', async () => {
      const timelineArticles = [
        {
          id: 'six-month-timeline',
          title: '6-Month Wedding Planning Timeline',
          content: 'Essential tasks for couples planning a wedding in 6 months or less.',
          category: 'Timeline Planning',
          tags: ['short-timeline', 'quick-planning', 'essentials'],
          relevanceScore: 0.95,
          readTime: '5 min',
          urgency: 'high'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: timelineArticles,
        total: 1,
        searchTime: 134,
        suggestions: ['vendor booking', 'invitations', 'dress shopping']
      });

      const user = userEvent.setup();
      // Wedding in 6 months
      const nearWeddingDate = new Date();
      nearWeddingDate.setMonth(nearWeddingDate.getMonth() + 6);
      
      render(<WedMeKnowledgeBase 
        weddingDate={nearWeddingDate.toISOString().split('T')[0]} 
        planningStage="active-planning" 
      />);

      await user.type(screen.getByRole('textbox'), 'wedding planning timeline');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('6-Month Wedding Planning Timeline')).toBeInTheDocument();
      });

      // Check urgency indicator for tight timeline
      expect(screen.getByText(/high priority/i)).toBeInTheDocument();
      expect(screen.getByText(/Essential tasks.*6 months or less/i)).toBeInTheDocument();
    });
  });

  describe('Vendor Selection Scenarios', () => {
    it('should help couples understand how to choose photographers', async () => {
      const photographyArticles = [
        {
          id: 'choosing-wedding-photographer',
          title: 'How to Choose the Perfect Wedding Photographer',
          content: 'Questions to ask photographers, understanding different styles, and what to look for in portfolios.',
          category: 'Vendor Selection',
          tags: ['photography', 'vendor-selection', 'portfolio-review'],
          relevanceScore: 0.94,
          readTime: '7 min',
          couplesFavorite: true
        },
        {
          id: 'photography-budget-guide',
          title: 'Wedding Photography Budget: What to Expect',
          content: 'Understanding photography pricing, package options, and getting the best value for your investment.',
          category: 'Budget Planning',
          tags: ['photography', 'budget', 'pricing'],
          relevanceScore: 0.89,
          readTime: '4 min'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: photographyArticles,
        total: 2,
        searchTime: 156,
        suggestions: ['photography styles', 'engagement sessions', 'wedding albums']
      });

      const user = userEvent.setup();
      render(<WedMeKnowledgeBase weddingDate="2025-09-20" planningStage="vendor-selection" />);

      await user.type(screen.getByRole('textbox'), 'choosing wedding photographer');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('How to Choose the Perfect Wedding Photographer')).toBeInTheDocument();
        expect(screen.getByText('Wedding Photography Budget: What to Expect')).toBeInTheDocument();
      });

      // Verify couple-friendly features
      expect(screen.getByText(/couples' favorite/i)).toBeInTheDocument();
      expect(screen.getByText(/Questions to ask.*different styles.*portfolios/i)).toBeInTheDocument();
    });

    it('should provide venue selection guidance with location awareness', async () => {
      const venueArticles = [
        {
          id: 'venue-selection-guide',
          title: 'Wedding Venue Selection: Indoor vs Outdoor',
          content: 'Pros and cons of different venue types, weather considerations, and backup plans.',
          category: 'Venue Selection',
          tags: ['venue', 'indoor-outdoor', 'weather-planning'],
          relevanceScore: 0.91,
          readTime: '6 min'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: venueArticles,
        total: 1,
        searchTime: 167,
        suggestions: ['garden weddings', 'barn venues', 'hotel weddings']
      });

      const user = userEvent.setup();
      render(<WedMeKnowledgeBase 
        weddingDate="2025-06-14" 
        planningStage="venue-hunting"
        location="London, UK"
      />);

      await user.type(screen.getByRole('textbox'), 'outdoor wedding venue selection');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Wedding Venue Selection: Indoor vs Outdoor')).toBeInTheDocument();
      });

      // Check location-aware search
      expect(mockKnowledgeBaseService.searchArticles).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'London, UK',
          weddingDate: '2025-06-14'
        })
      );

      expect(screen.getByText(/weather considerations.*backup plans/i)).toBeInTheDocument();
    });
  });

  describe('Mobile Wedding Planning Scenarios', () => {
    it('should support offline access for venue visits', async () => {
      // Mock offline scenario
      const offlineArticles = [
        {
          id: 'venue-visit-checklist',
          title: 'Wedding Venue Visit Checklist',
          content: 'Essential questions and observations for your venue tours.',
          category: 'Venue Selection',
          tags: ['venue-tour', 'checklist', 'planning'],
          relevanceScore: 0.96,
          readTime: '3 min',
          offline: true
        }
      ];

      mockKnowledgeBaseService.getOfflineArticles.mockResolvedValue(offlineArticles);

      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const user = userEvent.setup();
      render(<WedMeKnowledgeBase 
        weddingDate="2025-07-12" 
        planningStage="venue-hunting"
        offline={true}
      />);

      // Offline banner should appear
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();

      // Search should work with cached content
      await user.type(screen.getByRole('textbox'), 'venue visit checklist');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Wedding Venue Visit Checklist')).toBeInTheDocument();
      });

      expect(screen.getByText(/Essential questions.*observations/i)).toBeInTheDocument();
      expect(screen.getByText(/offline access/i)).toBeInTheDocument();
    });

    it('should provide quick answers for on-the-go couples', async () => {
      const quickHelp = [
        {
          id: 'emergency-wedding-help',
          title: 'Quick Wedding Day Emergency Solutions',
          content: 'Fast fixes for common wedding day issues and who to call.',
          category: 'Emergency Help',
          tags: ['emergency', 'wedding-day', 'quick-fix'],
          relevanceScore: 0.99,
          readTime: '1 min',
          priority: 'urgent'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: quickHelp,
        total: 1,
        searchTime: 67, // Very fast mobile response
        suggestions: []
      });

      const user = userEvent.setup();
      render(<WedMeKnowledgeBase 
        weddingDate="2025-01-25" // Wedding is tomorrow
        planningStage="wedding-week"
        mobile={true}
      />);

      await user.type(screen.getByRole('textbox'), 'wedding day emergency help');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Quick Wedding Day Emergency Solutions')).toBeInTheDocument();
      });

      // Verify mobile-optimized features
      expect(screen.getByText(/1 min/i)).toBeInTheDocument();
      expect(screen.getByText(/urgent/i)).toBeInTheDocument();
      expect(screen.getByText(/Fast fixes.*who to call/i)).toBeInTheDocument();
    });
  });

  describe('Voice Search for Busy Couples', () => {
    it('should handle voice search queries naturally', async () => {
      const voiceResults = [
        {
          id: 'flower-alternatives',
          title: 'Budget-Friendly Wedding Flower Alternatives',
          content: 'Creative alternatives to expensive wedding flowers that still look stunning.',
          category: 'Budget Tips',
          tags: ['flowers', 'budget', 'alternatives'],
          relevanceScore: 0.88,
          readTime: '4 min'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: voiceResults,
        total: 1,
        searchTime: 245,
        suggestions: ['silk flowers', 'greenery', 'potted plants']
      });

      const user = userEvent.setup();
      render(<WedMeKnowledgeBase 
        weddingDate="2025-05-17" 
        planningStage="detail-planning"
        voiceEnabled={true}
      />);

      // Simulate voice search (natural language query)
      const voiceButton = screen.getByRole('button', { name: /voice search/i });
      expect(voiceButton).toBeInTheDocument();

      // Mock voice input result
      const searchInput = screen.getByRole('textbox');
      fireEvent.change(searchInput, { 
        target: { value: 'what are some cheap flower options for my wedding' }
      });

      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Budget-Friendly Wedding Flower Alternatives')).toBeInTheDocument();
      });

      expect(screen.getByText(/Creative alternatives.*still look stunning/i)).toBeInTheDocument();
    });
  });

  describe('Couple Collaboration Features', () => {
    it('should support shared planning with partner', async () => {
      const collaborationArticles = [
        {
          id: 'planning-together',
          title: 'Wedding Planning as a Team: Tips for Couples',
          content: 'How to plan your wedding together without stress, dividing tasks and making decisions.',
          category: 'Relationship',
          tags: ['teamwork', 'communication', 'planning-together'],
          relevanceScore: 0.93,
          readTime: '5 min'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: collaborationArticles,
        total: 1,
        searchTime: 189,
        suggestions: ['task division', 'decision making', 'wedding stress']
      });

      const user = userEvent.setup();
      render(<WedMeKnowledgeBase 
        weddingDate="2025-10-04" 
        planningStage="active-planning"
        partnerMode={true}
      />);

      await user.type(screen.getByRole('textbox'), 'planning wedding together as couple');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Wedding Planning as a Team: Tips for Couples')).toBeInTheDocument();
      });

      // Check partner sharing features
      expect(screen.getByRole('button', { name: /share with partner/i })).toBeInTheDocument();
      expect(screen.getByText(/dividing tasks.*making decisions/i)).toBeInTheDocument();
    });
  });

  describe('Cultural and Diverse Wedding Scenarios', () => {
    it('should provide culturally relevant wedding guidance', async () => {
      const culturalArticles = [
        {
          id: 'multicultural-wedding-planning',
          title: 'Planning a Multicultural Wedding: Blending Traditions',
          content: 'How to honor both families traditions while creating your unique celebration.',
          category: 'Cultural Weddings',
          tags: ['multicultural', 'traditions', 'family'],
          relevanceScore: 0.91,
          readTime: '8 min'
        },
        {
          id: 'interfaith-ceremony-guide',
          title: 'Interfaith Wedding Ceremony Planning',
          content: 'Creating meaningful ceremonies that respect different religious backgrounds.',
          category: 'Cultural Weddings',
          tags: ['interfaith', 'ceremony', 'religious'],
          relevanceScore: 0.87,
          readTime: '6 min'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: culturalArticles,
        total: 2,
        searchTime: 198,
        suggestions: ['cultural ceremonies', 'family traditions', 'unity rituals']
      });

      const user = userEvent.setup();
      render(<WedMeKnowledgeBase 
        weddingDate="2025-11-22" 
        planningStage="ceremony-planning"
        culturalBackground={['British', 'Indian']}
      />);

      await user.type(screen.getByRole('textbox'), 'multicultural wedding traditions');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Planning a Multicultural Wedding: Blending Traditions')).toBeInTheDocument();
        expect(screen.getByText('Interfaith Wedding Ceremony Planning')).toBeInTheDocument();
      });

      expect(screen.getByText(/honor both families.*unique celebration/i)).toBeInTheDocument();
      expect(screen.getByText(/respect different religious backgrounds/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility for Couples', () => {
    it('should support couples with accessibility needs', async () => {
      const accessibilityArticles = [
        {
          id: 'accessible-wedding-planning',
          title: 'Planning an Accessible Wedding for All Guests',
          content: 'Creating weddings that are inclusive for guests with disabilities and special needs.',
          category: 'Accessibility',
          tags: ['accessibility', 'inclusion', 'special-needs'],
          relevanceScore: 0.95,
          readTime: '7 min'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: accessibilityArticles,
        total: 1,
        searchTime: 156,
        suggestions: ['wheelchair access', 'hearing assistance', 'dietary needs']
      });

      // Mock screen reader usage
      render(<WedMeKnowledgeBase 
        weddingDate="2025-04-26" 
        planningStage="venue-selection"
        accessibilityMode={true}
      />);

      // Check for proper ARIA labels
      const searchInput = screen.getByRole('textbox', { name: /search wedding help/i });
      expect(searchInput).toHaveAttribute('aria-label');
      expect(searchInput).toHaveAttribute('aria-describedby');

      // Check for keyboard navigation support
      searchInput.focus();
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

      // Verify high contrast mode support
      const container = screen.getByTestId('knowledge-base-container');
      expect(container).toHaveClass('high-contrast');
    });
  });

  describe('Performance and User Experience', () => {
    it('should provide instant search suggestions for common couple queries', async () => {
      mockKnowledgeBaseService.getSearchSuggestions.mockResolvedValue([
        'wedding dress shopping timeline',
        'wedding invitation wording',
        'wedding cake alternatives',
        'wedding photography poses',
        'wedding day timeline template'
      ]);

      const user = userEvent.setup();
      render(<WedMeKnowledgeBase weddingDate="2025-08-30" planningStage="detail-planning" />);

      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'wedding');

      // Should show instant suggestions
      await waitFor(() => {
        expect(screen.getByText('wedding dress shopping timeline')).toBeInTheDocument();
        expect(screen.getByText('wedding invitation wording')).toBeInTheDocument();
      });

      // Click on a suggestion
      await user.click(screen.getByText('wedding cake alternatives'));

      expect(searchInput).toHaveValue('wedding cake alternatives');
    });

    it('should track couple engagement and satisfaction', async () => {
      const satisfactionArticles = [
        {
          id: 'wedding-day-schedule',
          title: 'Perfect Wedding Day Schedule Template',
          content: 'Hour-by-hour wedding day timeline to keep everything running smoothly.',
          category: 'Timeline Planning',
          tags: ['schedule', 'timeline', 'wedding-day'],
          relevanceScore: 0.97,
          readTime: '4 min',
          helpful: true
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: satisfactionArticles,
        total: 1,
        searchTime: 123,
        suggestions: []
      });

      const user = userEvent.setup();
      render(<WedMeKnowledgeBase weddingDate="2025-12-06" planningStage="final-details" />);

      await user.type(screen.getByRole('textbox'), 'wedding day schedule');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Perfect Wedding Day Schedule Template')).toBeInTheDocument();
      });

      // Test feedback system
      const helpfulButton = screen.getByRole('button', { name: /this was helpful/i });
      await user.click(helpfulButton);

      await waitFor(() => {
        expect(mockKnowledgeBaseService.recordFeedback).toHaveBeenCalledWith({
          articleId: 'wedding-day-schedule',
          rating: 'helpful',
          userType: 'couple',
          planningStage: 'final-details'
        });
      });
    });
  });
});