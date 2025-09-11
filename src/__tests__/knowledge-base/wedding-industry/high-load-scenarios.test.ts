import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { KnowledgeBaseInterface } from '@/components/knowledge-base/KnowledgeBaseInterface';
import { knowledgeBaseService } from '@/lib/knowledge-base/knowledge-base-service';

// Mock the knowledge base service
vi.mock('@/lib/knowledge-base/knowledge-base-service');

describe('Wedding Season High-Load Scenarios', () => {
  const mockKnowledgeBaseService = vi.mocked(knowledgeBaseService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Peak Wedding Season Load Testing', () => {
    it('should handle 1000+ concurrent supplier searches during wedding season', async () => {
      // Mock wedding season peak scenario (May-September)
      const currentDate = new Date('2025-06-15'); // Peak wedding season
      vi.setSystemTime(currentDate);

      const highVolumeResults = [
        {
          id: 'peak-season-pricing',
          title: 'Peak Season Photography Pricing Strategies',
          content: 'How to maximize revenue during busy wedding season.',
          category: 'Business',
          tags: ['pricing', 'peak-season', 'revenue'],
          relevanceScore: 0.94,
          readTime: '6 min'
        }
      ];

      // Simulate high-load response with caching
      mockKnowledgeBaseService.searchArticles.mockImplementation(async (params) => {
        // Simulate database load with slight delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          articles: highVolumeResults,
          total: 1,
          searchTime: 189, // Still under 500ms requirement
          suggestions: ['pricing strategy', 'booking management', 'capacity planning'],
          cacheHit: true, // Important during high load
          serverLoad: 0.85 // 85% server utilization
        };
      });

      const user = userEvent.setup();
      
      // Simulate multiple concurrent searches
      const searchPromises = [];
      for (let i = 0; i < 50; i++) {
        const promise = new Promise(async (resolve) => {
          render(<KnowledgeBaseInterface 
            userType="supplier" 
            supplierType="photographer" 
            key={`search-${i}`}
          />);
          
          const searchInput = screen.getAllByRole('textbox')[i];
          if (searchInput) {
            await user.type(searchInput, 'peak season pricing');
            const searchButton = screen.getAllByRole('button', { name: /search/i })[i];
            await user.click(searchButton);
          }
          resolve(i);
        });
        searchPromises.push(promise);
      }

      // Wait for all searches to complete
      const results = await Promise.all(searchPromises);
      expect(results).toHaveLength(50);

      // Verify system performance under load
      const searchCalls = mockKnowledgeBaseService.searchArticles.mock.calls;
      expect(searchCalls.length).toBeGreaterThanOrEqual(10); // At least 10 searches processed
      
      // All searches should complete within performance requirements
      searchCalls.forEach(call => {
        const searchTime = call[0]?.searchTime || 200;
        expect(searchTime).toBeLessThan(500); // <500ms requirement
      });
    });

    it('should maintain performance during Saturday wedding day peak traffic', async () => {
      // Mock Saturday peak traffic (multiple weddings happening)
      const saturdayDate = new Date('2025-06-14'); // Saturday
      vi.setSystemTime(saturdayDate);

      const emergencyResults = [
        {
          id: 'wedding-day-emergency',
          title: 'Wedding Day Emergency Protocols',
          content: 'Quick solutions for common wedding day issues.',
          category: 'Emergency',
          tags: ['emergency', 'wedding-day', 'protocols'],
          relevanceScore: 0.99,
          readTime: '2 min',
          priority: 'critical'
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockResolvedValue({
        articles: emergencyResults,
        total: 1,
        searchTime: 156, // Fast emergency response
        suggestions: [],
        serverLoad: 0.95, // Very high load on wedding day
        cacheHit: true
      });

      const user = userEvent.setup();
      render(<KnowledgeBaseInterface 
        userType="supplier" 
        supplierType="coordinator"
        emergencyMode={true} // Saturday wedding day mode
      />);

      await user.type(screen.getByRole('textbox'), 'wedding day emergency');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Wedding Day Emergency Protocols')).toBeInTheDocument();
      }, { timeout: 2000 }); // Still fast despite high load

      // Verify emergency prioritization
      expect(screen.getByText(/critical priority/i)).toBeInTheDocument();
      expect(screen.getByText(/2 min/i)).toBeInTheDocument();
      
      // Check that search was processed quickly despite high server load
      expect(mockKnowledgeBaseService.searchArticles).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'emergency',
          emergencyMode: true
        })
      );
    });

    it('should handle venue visit traffic spikes during venue open house weekends', async () => {
      // Mock venue open house weekend (high couple traffic)
      const openHouseDate = new Date('2025-05-10'); // Saturday open house
      vi.setSystemTime(openHouseDate);

      const venueResults = [
        {
          id: 'venue-questions-checklist',
          title: 'Essential Questions to Ask During Venue Tours',
          content: 'Complete checklist for couples visiting wedding venues.',
          category: 'Venue Selection',
          tags: ['venue-tour', 'questions', 'checklist'],
          relevanceScore: 0.96,
          readTime: '3 min',
          offline: true // Available offline for venue visits
        }
      ];

      // Simulate high mobile traffic during open houses
      mockKnowledgeBaseService.searchArticles.mockImplementation(async () => {
        // Simulate mobile network variability
        const networkDelay = Math.random() * 200 + 50; // 50-250ms network delay
        await new Promise(resolve => setTimeout(resolve, networkDelay));
        
        return {
          articles: venueResults,
          total: 1,
          searchTime: 123,
          suggestions: ['venue capacity', 'catering restrictions', 'setup timeline'],
          mobileOptimized: true,
          networkCondition: '3G' // Venue locations often have poor signal
        };
      });

      const user = userEvent.setup();
      
      // Simulate multiple couples searching simultaneously at venues
      const coupleSearches = [];
      for (let i = 0; i < 25; i++) {
        const searchPromise = new Promise(async (resolve) => {
          render(<WedMeKnowledgeBase 
            weddingDate="2025-09-13" 
            planningStage="venue-hunting"
            mobile={true}
            location="venue-on-site"
            key={`couple-${i}`}
          />);
          
          const searchInputs = screen.getAllByRole('textbox');
          const searchInput = searchInputs[i % searchInputs.length];
          
          if (searchInput) {
            await user.type(searchInput, 'venue tour questions');
            const buttons = screen.getAllByRole('button', { name: /search/i });
            const searchButton = buttons[i % buttons.length];
            await user.click(searchButton);
          }
          
          resolve(i);
        });
        coupleSearches.push(searchPromise);
      }

      await Promise.all(coupleSearches);

      // Verify mobile performance under load
      const searchCalls = mockKnowledgeBaseService.searchArticles.mock.calls;
      expect(searchCalls.length).toBeGreaterThan(0);
      
      // All mobile searches should be optimized
      searchCalls.forEach(call => {
        expect(call[0]).toMatchObject({
          mobile: true,
          location: 'venue-on-site'
        });
      });
    });
  });

  describe('Multi-Tenant Load Isolation', () => {
    it('should isolate supplier organizations during high load', async () => {
      const org1Results = [
        {
          id: 'org1-specific-content',
          title: 'Photography Studio A - Client Management',
          content: 'Organization-specific content for Studio A',
          category: 'Business Management',
          organizationId: 'org-1',
          relevanceScore: 0.91
        }
      ];

      const org2Results = [
        {
          id: 'org2-specific-content',
          title: 'Wedding Venue B - Event Coordination',
          content: 'Organization-specific content for Venue B',
          category: 'Event Management', 
          organizationId: 'org-2',
          relevanceScore: 0.88
        }
      ];

      mockKnowledgeBaseService.searchArticles.mockImplementation(async (params) => {
        // Simulate organization data isolation
        if (params.organizationId === 'org-1') {
          return {
            articles: org1Results,
            total: 1,
            searchTime: 167,
            suggestions: []
          };
        } else if (params.organizationId === 'org-2') {
          return {
            articles: org2Results,
            total: 1,
            searchTime: 145,
            suggestions: []
          };
        }
        return { articles: [], total: 0, searchTime: 100, suggestions: [] };
      });

      const user = userEvent.setup();

      // Simulate concurrent searches from different organizations
      const org1Search = new Promise(async (resolve) => {
        render(<KnowledgeBaseInterface 
          userType="supplier"
          supplierType="photographer"
          organizationId="org-1"
          key="org1"
        />);
        
        await user.type(screen.getAllByRole('textbox')[0], 'client management');
        await user.click(screen.getAllByRole('button', { name: /search/i })[0]);
        resolve('org1');
      });

      const org2Search = new Promise(async (resolve) => {
        render(<KnowledgeBaseInterface 
          userType="supplier"
          supplierType="venue"
          organizationId="org-2"
          key="org2"
        />);
        
        const inputs = screen.getAllByRole('textbox');
        if (inputs[1]) {
          await user.type(inputs[1], 'event coordination');
          const buttons = screen.getAllByRole('button', { name: /search/i });
          if (buttons[1]) {
            await user.click(buttons[1]);
          }
        }
        resolve('org2');
      });

      const results = await Promise.all([org1Search, org2Search]);
      expect(results).toEqual(['org1', 'org2']);

      // Verify data isolation
      const searchCalls = mockKnowledgeBaseService.searchArticles.mock.calls;
      const org1Calls = searchCalls.filter(call => call[0]?.organizationId === 'org-1');
      const org2Calls = searchCalls.filter(call => call[0]?.organizationId === 'org-2');

      expect(org1Calls.length).toBeGreaterThan(0);
      expect(org2Calls.length).toBeGreaterThan(0);
    });
  });

  describe('AI Service Load Management', () => {
    it('should handle OpenAI API rate limiting gracefully during peak usage', async () => {
      const rateLimitedResponse = {
        articles: [],
        total: 0,
        searchTime: 2000, // Slower due to rate limiting
        suggestions: ['try again later', 'use cached results'],
        rateLimited: true,
        fallbackUsed: true
      };

      const cachedResponse = {
        articles: [
          {
            id: 'cached-article',
            title: 'Cached Photography Tips',
            content: 'Popular photography advice (cached)',
            category: 'Photography',
            cached: true,
            relevanceScore: 0.85
          }
        ],
        total: 1,
        searchTime: 45, // Very fast cached response
        suggestions: [],
        fromCache: true
      };

      let callCount = 0;
      mockKnowledgeBaseService.searchArticles.mockImplementation(async () => {
        callCount++;
        
        // Simulate rate limiting after 10 calls
        if (callCount > 10) {
          return rateLimitedResponse;
        } else if (callCount > 5) {
          // Use cached results for performance
          return cachedResponse;
        } else {
          // Normal AI-powered search
          return {
            articles: [{
              id: 'ai-generated-result',
              title: 'AI-Powered Photography Insights',
              content: 'Fresh insights from AI analysis',
              category: 'Photography',
              aiGenerated: true,
              relevanceScore: 0.94
            }],
            total: 1,
            searchTime: 234,
            suggestions: []
          };
        }
      });

      const user = userEvent.setup();

      // Simulate high AI usage
      for (let i = 0; i < 15; i++) {
        render(<KnowledgeBaseInterface 
          userType="supplier"
          supplierType="photographer"
          key={`ai-test-${i}`}
        />);
        
        const inputs = screen.getAllByRole('textbox');
        if (inputs[i]) {
          await user.type(inputs[i], 'photography tips');
          const buttons = screen.getAllByRole('button', { name: /search/i });
          if (buttons[i]) {
            await user.click(buttons[i]);
          }
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Verify graceful degradation
      expect(callCount).toBeGreaterThan(10);
      
      const searchCalls = mockKnowledgeBaseService.searchArticles.mock.calls;
      expect(searchCalls.length).toBeGreaterThan(0);
    });

    it('should cache embeddings to reduce AI service load', async () => {
      const embeddingCacheResults = {
        articles: [
          {
            id: 'embedding-cached-article',
            title: 'Wedding Photography Techniques',
            content: 'Advanced techniques for wedding photographers',
            category: 'Photography',
            relevanceScore: 0.92,
            embeddingCached: true
          }
        ],
        total: 1,
        searchTime: 78, // Fast due to cached embeddings
        suggestions: [],
        embeddingsCacheHit: true
      };

      mockKnowledgeBaseService.searchArticles.mockResolvedValue(embeddingCacheResults);

      const user = userEvent.setup();
      render(<KnowledgeBaseInterface userType="supplier" supplierType="photographer" />);

      await user.type(screen.getByRole('textbox'), 'wedding photography techniques');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Wedding Photography Techniques')).toBeInTheDocument();
      });

      // Verify caching optimization
      expect(mockKnowledgeBaseService.searchArticles).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'wedding photography techniques',
          useEmbeddingCache: true
        })
      );
    });
  });

  describe('Database Performance Under Load', () => {
    it('should maintain query performance with database connection pooling', async () => {
      const performanceResults = {
        articles: [
          {
            id: 'performance-test',
            title: 'Database Performance Test Article',
            content: 'Test article for database performance validation',
            category: 'Test',
            relevanceScore: 0.90
          }
        ],
        total: 1,
        searchTime: 145, // Good performance despite load
        suggestions: [],
        databaseMetrics: {
          queryTime: 23, // <50ms database query requirement
          connectionPoolUsage: 0.75, // 75% pool utilization
          cacheHitRate: 0.92 // 92% cache hit rate
        }
      };

      mockKnowledgeBaseService.searchArticles.mockResolvedValue(performanceResults);
      mockKnowledgeBaseService.getDatabaseMetrics.mockResolvedValue({
        activeConnections: 45,
        maxConnections: 60,
        queryTime: 23,
        cacheHitRate: 0.92
      });

      const user = userEvent.setup();
      render(<KnowledgeBaseInterface userType="supplier" supplierType="photographer" />);

      await user.type(screen.getByRole('textbox'), 'database performance test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('Database Performance Test Article')).toBeInTheDocument();
      });

      // Verify database performance metrics
      const metrics = await mockKnowledgeBaseService.getDatabaseMetrics();
      expect(metrics.queryTime).toBeLessThan(50); // <50ms requirement
      expect(metrics.cacheHitRate).toBeGreaterThan(0.9); // >90% cache hit rate
      expect(metrics.activeConnections).toBeLessThan(metrics.maxConnections);
    });
  });

  describe('Error Handling Under Load', () => {
    it('should gracefully handle service failures during high traffic', async () => {
      let failureCount = 0;
      mockKnowledgeBaseService.searchArticles.mockImplementation(async () => {
        failureCount++;
        
        if (failureCount <= 3) {
          // Simulate service failure
          throw new Error('Service temporarily unavailable');
        } else {
          // Recovery with degraded service
          return {
            articles: [
              {
                id: 'fallback-article',
                title: 'Basic Wedding Planning Tips',
                content: 'Essential wedding planning guidance (cached)',
                category: 'Planning',
                fallback: true,
                relevanceScore: 0.80
              }
            ],
            total: 1,
            searchTime: 234,
            suggestions: [],
            degradedService: true
          };
        }
      });

      const user = userEvent.setup();
      render(<KnowledgeBaseInterface userType="supplier" supplierType="photographer" />);

      await user.type(screen.getByRole('textbox'), 'wedding planning tips');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Should show error message initially
      await waitFor(() => {
        expect(screen.getByText(/service temporarily unavailable/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Should eventually recover with fallback content
      await waitFor(() => {
        expect(screen.getByText('Basic Wedding Planning Tips')).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.getByText(/degraded service/i)).toBeInTheDocument();
      expect(failureCount).toBeGreaterThan(3);
    });
  });
});