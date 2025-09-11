import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { KnowledgeBaseInterface } from '@/components/knowledge-base/KnowledgeBaseInterface';
import { knowledgeBaseService } from '@/lib/knowledge-base/knowledge-base-service';

// Mock the knowledge base service
vi.mock('@/lib/knowledge-base/knowledge-base-service');

describe('Wedding Industry Supplier Scenarios', () => {
  const mockKnowledgeBaseService = vi.mocked(knowledgeBaseService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Photography Business Scenarios', () => {
    it('should help photographer find client questionnaire automation guidance', async () => {
      // Realistic photography search scenario
      const photographyArticles = [
        {
          id: 'photo-questionnaire-guide',
          title: 'Automating Client Photography Questionnaires',
          content: 'Learn how to create automated questionnaires that capture client preferences for engagement sessions, wedding day timeline, and must-have shots.',
          category: 'Photography',
          tags: ['questionnaire', 'automation', 'client-experience'],
          relevanceScore: 0.95,
          readTime: '5 min',
          lastUpdated: '2025-01-15'
        },
        {
          id: 'photo-workflow-optimization',
          title: 'Wedding Photography Workflow Optimization',
          content: 'Streamline your photography business with automated client onboarding, contract management, and delivery systems.',
          category: 'Photography',
          tags: ['workflow', 'automation', 'efficiency'],
          relevanceScore: 0.87,
          readTime: '8 min',
          lastUpdated: '2025-01-10'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: photographyArticles,
        total: 2,
        searchTime: 245,
        suggestions: ['client onboarding', 'wedding timeline', 'shot lists']
      });

      const user = userEvent.setup();
      render(<KnowledgeBaseInterface userType="supplier" supplierType="photographer" />);

      // User searches for photography-specific help
      const searchInput = screen.getByRole('textbox', { name: /search knowledge base/i });
      await user.type(searchInput, 'client questionnaire automation');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Automating Client Photography Questionnaires')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify photography-specific results
      expect(screen.getByText(/5 min read/i)).toBeInTheDocument();
      expect(screen.getByText(/Photography/i)).toBeInTheDocument();
      expect(screen.getByText(/engagement sessions.*wedding day timeline/i)).toBeInTheDocument();

      // Verify search performance
      expect(mockKnowledgeBaseService.searchArticles).toHaveBeenCalledWith({
        query: 'client questionnaire automation',
        userType: 'supplier',
        supplierType: 'photographer',
        limit: 20
      });

      // Check analytics tracking
      await waitFor(() => {
        expect(mockKnowledgeBaseService.trackSearch).toHaveBeenCalledWith({
          query: 'client questionnaire automation',
          resultCount: 2,
          searchTime: 245,
          userType: 'supplier',
          supplierType: 'photographer'
        });
      });
    });

    it('should provide seasonal photography business guidance', async () => {
      const seasonalArticles = [
        {
          id: 'seasonal-pricing-strategy',
          title: 'Wedding Season Pricing Strategy for Photographers',
          content: 'Maximize your revenue during peak wedding season with dynamic pricing strategies and package optimization.',
          category: 'Photography',
          tags: ['pricing', 'seasonal', 'revenue'],
          relevanceScore: 0.92,
          readTime: '7 min'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: seasonalArticles,
        total: 1,
        searchTime: 189,
        suggestions: ['peak season rates', 'off-season promotions']
      });

      const user = userEvent.setup();
      render(<KnowledgeBaseInterface userType="supplier" supplierType="photographer" />);

      await user.type(screen.getByRole('textbox'), 'seasonal pricing wedding photography');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Wedding Season Pricing Strategy for Photographers')).toBeInTheDocument();
      });

      expect(screen.getByText(/dynamic pricing strategies/i)).toBeInTheDocument();
      expect(screen.getByText(/7 min/i)).toBeInTheDocument();
    });
  });

  describe('Venue Coordination Scenarios', () => {
    it('should help venue manager with capacity planning and COVID protocols', async () => {
      const venueArticles = [
        {
          id: 'venue-capacity-covid',
          title: 'Wedding Venue Capacity Planning Post-COVID',
          content: 'Navigate changing regulations and guest expectations with flexible venue layouts and safety protocols.',
          category: 'Venue Management',
          tags: ['capacity', 'safety', 'regulations', 'layout'],
          relevanceScore: 0.89,
          readTime: '6 min'
        },
        {
          id: 'venue-layout-optimization',
          title: 'Optimizing Venue Layouts for Different Wedding Sizes',
          content: 'Create versatile spaces that work for intimate gatherings and large celebrations.',
          category: 'Venue Management',
          tags: ['layout', 'flexibility', 'space-planning'],
          relevanceScore: 0.84,
          readTime: '4 min'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: venueArticles,
        total: 2,
        searchTime: 198,
        suggestions: ['safety protocols', 'guest count planning', 'flexible seating']
      });

      const user = userEvent.setup();
      render(<KnowledgeBaseInterface userType="supplier" supplierType="venue" />);

      await user.type(screen.getByRole('textbox'), 'venue capacity planning safety');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Wedding Venue Capacity Planning Post-COVID')).toBeInTheDocument();
        expect(screen.getByText('Optimizing Venue Layouts for Different Wedding Sizes')).toBeInTheDocument();
      });

      // Verify venue-specific content
      expect(screen.getByText(/flexible venue layouts.*safety protocols/i)).toBeInTheDocument();
      expect(screen.getByText(/intimate gatherings.*large celebrations/i)).toBeInTheDocument();
    });

    it('should provide catering coordination guidance for venues', async () => {
      const cateringArticles = [
        {
          id: 'venue-catering-coordination',
          title: 'Coordinating with External Caterers: A Venue Guide',
          content: 'Best practices for working with catering partners, including kitchen access, setup requirements, and timeline coordination.',
          category: 'Venue Management',
          tags: ['catering', 'coordination', 'logistics'],
          relevanceScore: 0.91,
          readTime: '8 min'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: cateringArticles,
        total: 1,
        searchTime: 156,
        suggestions: ['kitchen requirements', 'catering timeline', 'vendor coordination']
      });

      const user = userEvent.setup();
      render(<KnowledgeBaseInterface userType="supplier" supplierType="venue" />);

      await user.type(screen.getByRole('textbox'), 'catering coordination venue management');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Coordinating with External Caterers: A Venue Guide')).toBeInTheDocument();
      });

      expect(screen.getByText(/kitchen access.*setup requirements/i)).toBeInTheDocument();
    });
  });

  describe('Florist Workflow Scenarios', () => {
    it('should help florist with seasonal flower availability and pricing', async () => {
      const floralArticles = [
        {
          id: 'seasonal-flower-guide',
          title: 'Seasonal Flower Availability and Wedding Planning',
          content: 'Guide couples through seasonal flower choices to manage expectations and optimize your profit margins.',
          category: 'Floral Design',
          tags: ['seasonal', 'pricing', 'client-education'],
          relevanceScore: 0.93,
          readTime: '6 min'
        },
        {
          id: 'florist-pricing-strategy',
          title: 'Florist Pricing Strategy: Materials, Labor, and Markup',
          content: 'Calculate accurate pricing for wedding florals including material costs, design time, and delivery.',
          category: 'Floral Design',
          tags: ['pricing', 'profitability', 'cost-calculation'],
          relevanceScore: 0.88,
          readTime: '9 min'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: floralArticles,
        total: 2,
        searchTime: 203,
        suggestions: ['flower seasonality', 'markup calculations', 'client consultations']
      });

      const user = userEvent.setup();
      render(<KnowledgeBaseInterface userType="supplier" supplierType="florist" />);

      await user.type(screen.getByRole('textbox'), 'seasonal flowers pricing strategy');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Seasonal Flower Availability and Wedding Planning')).toBeInTheDocument();
        expect(screen.getByText('Florist Pricing Strategy: Materials, Labor, and Markup')).toBeInTheDocument();
      });

      expect(screen.getByText(/profit margins/i)).toBeInTheDocument();
      expect(screen.getByText(/material costs.*design time.*delivery/i)).toBeInTheDocument();
    });
  });

  describe('Cross-Supplier Collaboration Scenarios', () => {
    it('should provide vendor coordination timeline guidance', async () => {
      const coordinationArticles = [
        {
          id: 'vendor-timeline-coordination',
          title: 'Wedding Day Vendor Timeline Coordination',
          content: 'Synchronize setup and breakdown schedules across photographers, florists, caterers, and venues for seamless execution.',
          category: 'Coordination',
          tags: ['timeline', 'vendor-coordination', 'wedding-day'],
          relevanceScore: 0.96,
          readTime: '10 min'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: coordinationArticles,
        total: 1,
        searchTime: 167,
        suggestions: ['setup schedules', 'vendor communication', 'timeline templates']
      });

      const user = userEvent.setup();
      render(<KnowledgeBaseInterface userType="supplier" supplierType="coordinator" />);

      await user.type(screen.getByRole('textbox'), 'vendor coordination wedding day timeline');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Vendor Timeline Coordination')).toBeInTheDocument();
      });

      expect(screen.getByText(/photographers.*florists.*caterers.*venues/i)).toBeInTheDocument();
      expect(screen.getByText(/seamless execution/i)).toBeInTheDocument();
    });
  });

  describe('Search Performance and Analytics', () => {
    it('should track supplier search patterns for business insights', async () => {
      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: [],
        total: 0,
        searchTime: 123,
        suggestions: ['try photography tips', 'venue management', 'pricing strategies']
      });

      mockKnowledgeBaseService.getSearchAnalytics.mockResolvedValue({
        popularQueries: [
          { query: 'pricing strategy', count: 45, avgSearchTime: 189 },
          { query: 'client communication', count: 38, avgSearchTime: 156 },
          { query: 'wedding day timeline', count: 32, avgSearchTime: 201 }
        ],
        categoryDistribution: {
          'Photography': 35,
          'Venue Management': 28,
          'Floral Design': 22,
          'Coordination': 15
        }
      });

      const user = userEvent.setup();
      render(<KnowledgeBaseInterface userType="supplier" supplierType="photographer" />);

      // Search for something with no results to test suggestion system
      await user.type(screen.getByRole('textbox'), 'quantum wedding photography');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText(/no articles found/i)).toBeInTheDocument();
        expect(screen.getByText(/try photography tips/i)).toBeInTheDocument();
      });

      // Verify analytics tracking
      expect(mockKnowledgeBaseService.trackSearch).toHaveBeenCalledWith({
        query: 'quantum wedding photography',
        resultCount: 0,
        searchTime: 123,
        userType: 'supplier',
        supplierType: 'photographer'
      });
    });
  });

  describe('Mobile Supplier Experience', () => {
    it('should provide quick answers for on-site supplier questions', async () => {
      const quickAnswers = [
        {
          id: 'emergency-timeline-fix',
          title: 'Emergency Wedding Timeline Adjustments',
          content: 'Quick fixes for common timeline issues on wedding day.',
          category: 'Emergency',
          tags: ['emergency', 'timeline', 'quick-fix'],
          relevanceScore: 0.98,
          readTime: '2 min'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: quickAnswers,
        total: 1,
        searchTime: 98, // Fast mobile response
        suggestions: []
      });

      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone SE width
      });

      const user = userEvent.setup();
      render(<KnowledgeBaseInterface userType="supplier" supplierType="coordinator" mobile={true} />);

      await user.type(screen.getByRole('textbox'), 'emergency timeline');
      await user.click(screen.getRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Emergency Wedding Timeline Adjustments')).toBeInTheDocument();
      });

      // Verify mobile-optimized response time
      expect(mockKnowledgeBaseService.searchArticles).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockKnowledgeBaseService.trackSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            searchTime: expect.any(Number)
          })
        );
      });

      const trackCall = mockKnowledgeBaseService.trackSearch.mock.calls[0][0];
      expect(trackCall.searchTime).toBeLessThan(200); // Mobile performance requirement
    });
  });

  describe('Accessibility for Suppliers', () => {
    it('should support screen reader navigation for visually impaired suppliers', async () => {
      const accessibleArticles = [
        {
          id: 'accessible-wedding-planning',
          title: 'Creating Accessible Wedding Experiences',
          content: 'Guidelines for making weddings inclusive for guests and vendors with disabilities.',
          category: 'Accessibility',
          tags: ['accessibility', 'inclusion', 'guidelines'],
          relevanceScore: 0.94,
          readTime: '7 min'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: accessibleArticles,
        total: 1,
        searchTime: 145,
        suggestions: []
      });

      render(<KnowledgeBaseInterface userType="supplier" supplierType="coordinator" />);

      // Check for proper ARIA labels and roles
      const searchInput = screen.getByRole('textbox', { name: /search knowledge base/i });
      expect(searchInput).toHaveAttribute('aria-label');

      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toHaveAttribute('aria-label');

      // Test keyboard navigation
      searchInput.focus();
      fireEvent.keyDown(searchInput, { key: 'Enter' });

      await waitFor(() => {
        const resultsContainer = screen.getByRole('region', { name: /search results/i });
        expect(resultsContainer).toBeInTheDocument();
      });
    });
  });
});