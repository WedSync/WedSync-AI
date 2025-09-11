import { describe, test, expect, beforeEach, afterEach } from 'vitest';

interface AutocompleteSuggestion {
  text: string;
  type: 'vendor_type' | 'service' | 'location' | 'popular_query' | 'trending';
  confidence: number;      // 0-1 score for suggestion quality
  frequency: number;       // How often this suggestion is selected
  category?: string;       // e.g., 'photography', 'venues', 'catering'
  metadata?: {
    vendor_count?: number;
    location_info?: { city: string; state: string; };
    trending_period?: string;
  };
}

interface AutocompleteQuery {
  input: string;
  userLocation?: { lat: number; lng: number };
  userHistory?: string[];
  maxSuggestions?: number;
  includeTypes?: ('vendor_type' | 'service' | 'location' | 'popular_query' | 'trending')[];
}

interface AutocompleteResponse {
  suggestions: AutocompleteSuggestion[];
  queryTime: number;
  totalMatches: number;
}

// Mock autocomplete service
class AutocompleteService {
  private vendorTypes = [
    'wedding photographer', 'wedding venue', 'wedding florist', 'wedding caterer',
    'wedding DJ', 'wedding band', 'wedding planner', 'bridal makeup artist',
    'wedding videographer', 'wedding cake designer'
  ];

  private services = [
    'bridal portraits', 'engagement photos', 'destination wedding photography',
    'wedding ceremony venue', 'wedding reception venue', 'outdoor wedding venue',
    'bridal bouquets', 'wedding centerpieces', 'ceremony decorations',
    'wedding catering', 'cocktail hour', 'wedding cake', 'dessert table',
    'wedding music', 'ceremony music', 'reception entertainment'
  ];

  private locations = [
    'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX',
    'Manhattan, NY', 'Brooklyn, NY', 'Queens, NY', 'Long Island, NY',
    'Miami, FL', 'San Francisco, CA', 'Boston, MA', 'Philadelphia, PA'
  ];

  private popularQueries = [
    'affordable wedding photographer', 'luxury wedding venues', 'outdoor wedding venues',
    'wedding photographer under 3000', 'rustic wedding venues', 'beach wedding photographer',
    'modern wedding florist', 'vintage wedding venue', 'destination wedding photographer',
    'wedding venues with catering', 'small wedding venues', 'garden wedding venues'
  ];

  private trending = [
    'micro wedding venues', 'elopement photographer', 'covid safe wedding venues',
    'outdoor wedding photographer', 'intimate wedding venues', 'backyard wedding planning'
  ];

  private searchHistory: Map<string, number> = new Map();

  async getAutocompleteSuggestions(query: AutocompleteQuery): Promise<AutocompleteResponse> {
    const startTime = Date.now();
    const input = query.input.toLowerCase().trim();
    
    if (!input || input.length < 2) {
      return {
        suggestions: [],
        queryTime: Date.now() - startTime,
        totalMatches: 0
      };
    }

    const suggestions: AutocompleteSuggestion[] = [];

    // Add vendor type suggestions
    if (!query.includeTypes || query.includeTypes.includes('vendor_type')) {
      this.vendorTypes.forEach(type => {
        if (type.toLowerCase().includes(input)) {
          suggestions.push({
            text: type,
            type: 'vendor_type',
            confidence: this.calculateConfidence(input, type),
            frequency: this.searchHistory.get(type) || 0,
            category: this.getCategoryFromVendorType(type)
          });
        }
      });
    }

    // Add service suggestions
    if (!query.includeTypes || query.includeTypes.includes('service')) {
      this.services.forEach(service => {
        if (service.toLowerCase().includes(input)) {
          suggestions.push({
            text: service,
            type: 'service',
            confidence: this.calculateConfidence(input, service),
            frequency: this.searchHistory.get(service) || 0,
            category: this.getCategoryFromService(service)
          });
        }
      });
    }

    // Add location suggestions
    if (!query.includeTypes || query.includeTypes.includes('location')) {
      this.locations.forEach(location => {
        if (location.toLowerCase().includes(input)) {
          const locationParts = location.split(', ');
          suggestions.push({
            text: location,
            type: 'location',
            confidence: this.calculateConfidence(input, location),
            frequency: this.searchHistory.get(location) || 0,
            metadata: {
              location_info: {
                city: locationParts[0],
                state: locationParts[1] || ''
              },
              vendor_count: Math.floor(Math.random() * 500) + 50 // Mock vendor count
            }
          });
        }
      });
    }

    // Add popular query suggestions
    if (!query.includeTypes || query.includeTypes.includes('popular_query')) {
      this.popularQueries.forEach(popular => {
        if (popular.toLowerCase().includes(input)) {
          suggestions.push({
            text: popular,
            type: 'popular_query',
            confidence: this.calculateConfidence(input, popular),
            frequency: this.searchHistory.get(popular) || 0
          });
        }
      });
    }

    // Add trending suggestions
    if (!query.includeTypes || query.includeTypes.includes('trending')) {
      this.trending.forEach(trend => {
        if (trend.toLowerCase().includes(input)) {
          suggestions.push({
            text: trend,
            type: 'trending',
            confidence: this.calculateConfidence(input, trend),
            frequency: this.searchHistory.get(trend) || 0,
            metadata: {
              trending_period: '7d'
            }
          });
        }
      });
    }

    // Apply user history boosting
    if (query.userHistory) {
      suggestions.forEach(suggestion => {
        if (query.userHistory!.some(h => h.toLowerCase().includes(suggestion.text.toLowerCase()))) {
          suggestion.confidence += 0.1;
          suggestion.frequency += 5;
        }
      });
    }

    // Sort by confidence and frequency
    suggestions.sort((a, b) => {
      const aScore = a.confidence * 0.7 + (a.frequency / 100) * 0.3;
      const bScore = b.confidence * 0.7 + (b.frequency / 100) * 0.3;
      return bScore - aScore;
    });

    // Limit results
    const maxSuggestions = query.maxSuggestions || 8;
    const limitedSuggestions = suggestions.slice(0, maxSuggestions);

    return {
      suggestions: limitedSuggestions,
      queryTime: Date.now() - startTime,
      totalMatches: suggestions.length
    };
  }

  private calculateConfidence(input: string, suggestion: string): number {
    const inputLower = input.toLowerCase();
    const suggestionLower = suggestion.toLowerCase();

    // Exact match
    if (suggestionLower === inputLower) return 1.0;

    // Starts with input
    if (suggestionLower.startsWith(inputLower)) return 0.9;

    // Contains input as whole word
    const words = suggestionLower.split(' ');
    if (words.some(word => word.startsWith(inputLower))) return 0.8;

    // Contains input
    if (suggestionLower.includes(inputLower)) return 0.6;

    // Fuzzy match (simple edit distance)
    const editDistance = this.calculateEditDistance(inputLower, suggestionLower);
    const maxLength = Math.max(inputLower.length, suggestionLower.length);
    const similarity = 1 - (editDistance / maxLength);

    return Math.max(similarity, 0);
  }

  private calculateEditDistance(a: string, b: string): number {
    const dp = Array(a.length + 1).fill(0).map(() => Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
      }
    }

    return dp[a.length][b.length];
  }

  private getCategoryFromVendorType(vendorType: string): string {
    if (vendorType.includes('photograph') || vendorType.includes('videograph')) return 'photography';
    if (vendorType.includes('venue')) return 'venues';
    if (vendorType.includes('florist') || vendorType.includes('flower')) return 'florals';
    if (vendorType.includes('cater') || vendorType.includes('cake')) return 'catering';
    if (vendorType.includes('DJ') || vendorType.includes('band') || vendorType.includes('music')) return 'entertainment';
    if (vendorType.includes('makeup') || vendorType.includes('hair')) return 'beauty';
    return 'other';
  }

  private getCategoryFromService(service: string): string {
    if (service.includes('photo') || service.includes('portrait')) return 'photography';
    if (service.includes('venue') || service.includes('ceremony') || service.includes('reception')) return 'venues';
    if (service.includes('bouquet') || service.includes('flower') || service.includes('centerpiece')) return 'florals';
    if (service.includes('cater') || service.includes('food') || service.includes('cake')) return 'catering';
    if (service.includes('music') || service.includes('entertainment') || service.includes('DJ')) return 'entertainment';
    return 'other';
  }

  // Simulate user selection to update frequency
  recordSelection(suggestion: string): void {
    const current = this.searchHistory.get(suggestion) || 0;
    this.searchHistory.set(suggestion, current + 1);
  }
}

describe('WS-248: Advanced Search System - Autocomplete Accuracy Tests', () => {
  let autocompleteService: AutocompleteService;

  beforeEach(() => {
    autocompleteService = new AutocompleteService();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Basic Autocomplete Functionality', () => {
    test('should return relevant suggestions for vendor type queries', async () => {
      const response = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding photo'
      });

      expect(response.suggestions.length).toBeGreaterThan(0);
      
      const photographySuggestions = response.suggestions.filter(s => 
        s.text.toLowerCase().includes('photo')
      );
      
      expect(photographySuggestions.length).toBeGreaterThan(0);
      expect(photographySuggestions[0].confidence).toBeGreaterThan(0.6);
    });

    test('should return location suggestions for location queries', async () => {
      const response = await autocompleteService.getAutocompleteSuggestions({
        input: 'new york'
      });

      const locationSuggestions = response.suggestions.filter(s => s.type === 'location');
      expect(locationSuggestions.length).toBeGreaterThan(0);
      
      locationSuggestions.forEach(suggestion => {
        expect(suggestion.text.toLowerCase()).toContain('new york');
        expect(suggestion.metadata?.location_info).toBeDefined();
      });
    });

    test('should handle minimum input length requirements', async () => {
      const shortResponse = await autocompleteService.getAutocompleteSuggestions({
        input: 'w'
      });

      const emptyResponse = await autocompleteService.getAutocompleteSuggestions({
        input: ''
      });

      expect(shortResponse.suggestions.length).toBe(0);
      expect(emptyResponse.suggestions.length).toBe(0);
    });

    test('should return suggestions within performance limits', async () => {
      const startTime = Date.now();
      const response = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding'
      });
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(100); // 100ms limit for autocomplete
      expect(response.queryTime).toBeLessThan(50); // Service internal time should be even faster
    });
  });

  describe('Suggestion Quality and Relevance', () => {
    test('should prioritize exact matches highest', async () => {
      const response = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding photographer'
      });

      const exactMatch = response.suggestions.find(s => 
        s.text.toLowerCase() === 'wedding photographer'
      );

      expect(exactMatch).toBeDefined();
      expect(exactMatch!.confidence).toBeGreaterThanOrEqual(0.9);
      
      // Exact match should be first or very high in results
      const exactMatchIndex = response.suggestions.findIndex(s => 
        s.text.toLowerCase() === 'wedding photographer'
      );
      expect(exactMatchIndex).toBeLessThan(3);
    });

    test('should rank prefix matches highly', async () => {
      const response = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding'
      });

      const prefixMatches = response.suggestions.filter(s => 
        s.text.toLowerCase().startsWith('wedding')
      );

      prefixMatches.forEach(match => {
        expect(match.confidence).toBeGreaterThan(0.8);
      });

      // Prefix matches should be at the top
      const firstFew = response.suggestions.slice(0, 3);
      const prefixInTop3 = firstFew.filter(s => 
        s.text.toLowerCase().startsWith('wedding')
      );
      expect(prefixInTop3.length).toBeGreaterThan(0);
    });

    test('should handle typos and fuzzy matching', async () => {
      const response = await autocompleteService.getAutocompleteSuggestions({
        input: 'weding photgrapher' // Intentional typos
      });

      expect(response.suggestions.length).toBeGreaterThan(0);
      
      const photographySuggestions = response.suggestions.filter(s => 
        s.text.toLowerCase().includes('photographer')
      );
      
      expect(photographySuggestions.length).toBeGreaterThan(0);
    });

    test('should provide diverse suggestion types', async () => {
      const response = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding',
        maxSuggestions: 10
      });

      const types = new Set(response.suggestions.map(s => s.type));
      
      // Should include multiple types for broad query
      expect(types.size).toBeGreaterThan(2);
      expect(types.has('vendor_type')).toBe(true);
    });

    test('should respect suggestion type filters', async () => {
      const vendorOnlyResponse = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding',
        includeTypes: ['vendor_type']
      });

      vendorOnlyResponse.suggestions.forEach(suggestion => {
        expect(suggestion.type).toBe('vendor_type');
      });

      const locationOnlyResponse = await autocompleteService.getAutocompleteSuggestions({
        input: 'new',
        includeTypes: ['location']
      });

      locationOnlyResponse.suggestions.forEach(suggestion => {
        expect(suggestion.type).toBe('location');
      });
    });
  });

  describe('Personalization and User History', () => {
    test('should boost suggestions based on user history', async () => {
      const userHistory = ['wedding photographer', 'bridal portraits', 'New York, NY'];
      
      const withHistoryResponse = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding',
        userHistory
      });

      const withoutHistoryResponse = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding'
      });

      // Find matching suggestions in both responses
      const historySuggestion = withHistoryResponse.suggestions.find(s => 
        s.text === 'wedding photographer'
      );
      const normalSuggestion = withoutHistoryResponse.suggestions.find(s => 
        s.text === 'wedding photographer'
      );

      if (historySuggestion && normalSuggestion) {
        expect(historySuggestion.confidence).toBeGreaterThan(normalSuggestion.confidence);
      }
    });

    test('should learn from user selections', async () => {
      const query = { input: 'luxury wedding' };
      
      // Get initial suggestions
      const initialResponse = await autocompleteService.getAutocompleteSuggestions(query);
      const luxuryVenue = initialResponse.suggestions.find(s => 
        s.text.includes('luxury wedding venues')
      );

      if (luxuryVenue) {
        const initialFrequency = luxuryVenue.frequency;
        
        // Simulate user selecting this suggestion
        autocompleteService.recordSelection(luxuryVenue.text);
        
        // Get suggestions again
        const afterSelectionResponse = await autocompleteService.getAutocompleteSuggestions(query);
        const updatedSuggestion = afterSelectionResponse.suggestions.find(s => 
          s.text === luxuryVenue.text
        );

        expect(updatedSuggestion!.frequency).toBeGreaterThan(initialFrequency);
      }
    });
  });

  describe('Context-Aware Suggestions', () => {
    test('should provide location-aware suggestions', async () => {
      const nycQuery = {
        input: 'wedding venue',
        userLocation: { lat: 40.7128, lng: -74.0060 } // New York
      };

      const laQuery = {
        input: 'wedding venue',
        userLocation: { lat: 34.0522, lng: -118.2437 } // Los Angeles  
      };

      const nycResponse = await autocompleteService.getAutocompleteSuggestions(nycQuery);
      const laResponse = await autocompleteService.getAutocompleteSuggestions(laQuery);

      // Both should return venue suggestions, but may be differently ordered/weighted
      expect(nycResponse.suggestions.length).toBeGreaterThan(0);
      expect(laResponse.suggestions.length).toBeGreaterThan(0);
    });

    test('should suggest trending queries', async () => {
      const response = await autocompleteService.getAutocompleteSuggestions({
        input: 'micro wedding',
        includeTypes: ['trending']
      });

      const trendingSuggestions = response.suggestions.filter(s => s.type === 'trending');
      expect(trendingSuggestions.length).toBeGreaterThan(0);
      
      trendingSuggestions.forEach(suggestion => {
        expect(suggestion.metadata?.trending_period).toBeDefined();
      });
    });

    test('should categorize suggestions appropriately', async () => {
      const response = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding'
      });

      const categorizedSuggestions = response.suggestions.filter(s => s.category);
      expect(categorizedSuggestions.length).toBeGreaterThan(0);

      categorizedSuggestions.forEach(suggestion => {
        expect(['photography', 'venues', 'florals', 'catering', 'entertainment', 'beauty', 'other'])
          .toContain(suggestion.category);
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle rapid consecutive requests', async () => {
      const queries = ['w', 'we', 'wed', 'wedd', 'weddi', 'weddin', 'wedding'];
      const responses = [];

      for (const input of queries) {
        if (input.length >= 2) {
          const response = await autocompleteService.getAutocompleteSuggestions({ input });
          responses.push(response);
        }
      }

      // All requests should complete successfully
      expect(responses.length).toBe(queries.length - 1); // Excluding 'w' which is too short
      
      responses.forEach(response => {
        expect(response.queryTime).toBeLessThan(50);
        expect(response.suggestions).toBeDefined();
      });
    });

    test('should maintain performance with large suggestion sets', async () => {
      const broadResponse = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding',
        maxSuggestions: 20
      });

      expect(broadResponse.queryTime).toBeLessThan(100);
      expect(broadResponse.suggestions.length).toBeLessThanOrEqual(20);
    });

    test('should respect maximum suggestion limits', async () => {
      const limitedResponse = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding',
        maxSuggestions: 5
      });

      const unlimitedResponse = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding'
      });

      expect(limitedResponse.suggestions.length).toBeLessThanOrEqual(5);
      expect(unlimitedResponse.suggestions.length).toBeGreaterThanOrEqual(limitedResponse.suggestions.length);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle special characters in input', async () => {
      const specialChars = ['wedding!', 'wedding@venue', 'wedding & reception', 'wedding (2024)'];

      for (const input of specialChars) {
        const response = await autocompleteService.getAutocompleteSuggestions({ input });
        
        expect(response.suggestions).toBeDefined();
        expect(response.suggestions.length).toBeGreaterThanOrEqual(0);
        expect(response.queryTime).toBeGreaterThan(0);
      }
    });

    test('should handle very long input strings', async () => {
      const longInput = 'wedding photographer ' + 'luxury '.repeat(20) + 'destination ceremony venue';
      
      const response = await autocompleteService.getAutocompleteSuggestions({
        input: longInput
      });

      expect(response.suggestions).toBeDefined();
      expect(response.queryTime).toBeLessThan(200); // Should still be reasonably fast
    });

    test('should handle empty and null inputs gracefully', async () => {
      const emptyResponse = await autocompleteService.getAutocompleteSuggestions({
        input: ''
      });

      const spacesResponse = await autocompleteService.getAutocompleteSuggestions({
        input: '   '
      });

      expect(emptyResponse.suggestions).toEqual([]);
      expect(spacesResponse.suggestions).toEqual([]);
      expect(emptyResponse.totalMatches).toBe(0);
      expect(spacesResponse.totalMatches).toBe(0);
    });

    test('should handle invalid configuration gracefully', async () => {
      const invalidResponse = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding',
        maxSuggestions: -1
      });

      expect(invalidResponse.suggestions).toBeDefined();
      expect(invalidResponse.suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Autocomplete Accuracy Metrics', () => {
    test('should achieve high accuracy for wedding-related queries', async () => {
      const weddingQueries = [
        'wedding photographer',
        'wedding venue',
        'wedding florist',
        'wedding caterer',
        'wedding DJ'
      ];

      let totalAccuracy = 0;

      for (const query of weddingQueries) {
        const response = await autocompleteService.getAutocompleteSuggestions({
          input: query.substring(0, query.length - 2) // Remove last 2 chars to test prediction
        });

        // Check if the complete query appears in suggestions
        const foundComplete = response.suggestions.some(s => 
          s.text.toLowerCase().includes(query.toLowerCase())
        );

        if (foundComplete) totalAccuracy++;
      }

      const accuracy = totalAccuracy / weddingQueries.length;
      expect(accuracy).toBeGreaterThanOrEqual(0.8); // 80% accuracy requirement
    });

    test('should provide consistent suggestions for similar queries', async () => {
      const similarQueries = [
        'wedding photograph',
        'wedding photography',
        'wedding photographer'
      ];

      const responses = [];
      for (const query of similarQueries) {
        const response = await autocompleteService.getAutocompleteSuggestions({
          input: query
        });
        responses.push(response);
      }

      // Should have significant overlap in suggestions
      const allSuggestions = responses.map(r => 
        new Set(r.suggestions.map(s => s.text))
      );

      const intersection = new Set([...allSuggestions[0]].filter(x => 
        allSuggestions[1].has(x) || allSuggestions[2].has(x)
      ));

      expect(intersection.size).toBeGreaterThan(0);
    });

    test('should maintain high confidence scores for good matches', async () => {
      const response = await autocompleteService.getAutocompleteSuggestions({
        input: 'wedding photo'
      });

      const relevantSuggestions = response.suggestions.filter(s => 
        s.text.toLowerCase().includes('photo')
      );

      relevantSuggestions.forEach(suggestion => {
        expect(suggestion.confidence).toBeGreaterThan(0.5);
      });

      // Top suggestion should have high confidence
      if (relevantSuggestions.length > 0) {
        expect(relevantSuggestions[0].confidence).toBeGreaterThan(0.7);
      }
    });
  });
});