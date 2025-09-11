'use client';

import { useState, useCallback } from 'react';
import { withSecureValidation } from '@/lib/security/withSecureValidation';
import { z } from 'zod';

// Validation schema for flower search
const FlowerSearchSchema = z.object({
  colors: z.array(z.string().regex(/^#[0-9A-F]{6}$/i)).optional(),
  wedding_date: z.string().datetime().optional().or(z.string().length(0)),
  style: z
    .enum([
      'romantic',
      'modern',
      'rustic',
      'classic',
      'bohemian',
      'minimalist',
      '',
    ])
    .optional(),
  season: z.enum(['spring', 'summer', 'fall', 'winter', '']).optional(),
  budget_range: z
    .object({
      min: z.number().min(0).max(100),
      max: z.number().min(0).max(100),
    })
    .optional(),
  exclude_allergens: z.array(z.string()).optional(),
  sustainability_minimum: z.number().min(0).max(1).optional(),
  wedding_uses: z.array(z.string()).optional(),
});

type FlowerSearchCriteria = z.infer<typeof FlowerSearchSchema>;

interface FlowerResult {
  id: string;
  common_name: string;
  scientific_name: string;
  seasonal_score: number;
  matched_color?: {
    color_hex: string;
    similarity: number;
  };
  color_compatibility: string;
  current_pricing?: {
    adjusted_price: number;
    availability_score: number;
  };
  sustainability_score?: number;
  allergen_info?: {
    pollen: 'low' | 'medium' | 'high';
    fragrance: 'none' | 'light' | 'strong';
  };
  wedding_suitability?: Record<string, boolean>;
  seasonal_notes?: string[];
}

interface SearchResults {
  flowers: FlowerResult[];
  search_metadata: {
    total_found: number;
    avg_seasonal_score: number;
    search_time_ms: number;
    filters_applied: string[];
  };
  recommendations?: {
    similar_flowers: FlowerResult[];
    seasonal_alternatives: FlowerResult[];
    cost_effective_alternatives: FlowerResult[];
  };
}

interface UseFloristSearchReturn {
  searchResults: SearchResults | null;
  isLoading: boolean;
  error: Error | null;
  searchFlowers: (criteria: FlowerSearchCriteria) => Promise<SearchResults>;
  clearResults: () => void;
}

// Mock flower database for development
const MOCK_FLOWERS: FlowerResult[] = [
  {
    id: '1',
    common_name: 'Garden Rose',
    scientific_name: 'Rosa × damascena',
    seasonal_score: 0.92,
    matched_color: {
      color_hex: '#FF69B4',
      similarity: 0.85,
    },
    color_compatibility: 'Excellent',
    current_pricing: {
      adjusted_price: 4.5,
      availability_score: 0.88,
    },
    sustainability_score: 0.82,
    allergen_info: {
      pollen: 'low',
      fragrance: 'strong',
    },
    wedding_suitability: {
      bridal_bouquet: true,
      bridesmaids_bouquet: true,
      centerpiece: true,
      boutonniere: false,
    },
    seasonal_notes: [
      'Peak season in summer',
      'Locally grown varieties available',
    ],
  },
  {
    id: '2',
    common_name: 'Peony',
    scientific_name: 'Paeonia lactiflora',
    seasonal_score: 0.65,
    matched_color: {
      color_hex: '#FFC0CB',
      similarity: 0.78,
    },
    color_compatibility: 'Good',
    current_pricing: {
      adjusted_price: 8.0,
      availability_score: 0.45,
    },
    sustainability_score: 0.71,
    allergen_info: {
      pollen: 'medium',
      fragrance: 'light',
    },
    wedding_suitability: {
      bridal_bouquet: true,
      bridesmaids_bouquet: true,
      centerpiece: true,
      boutonniere: false,
    },
    seasonal_notes: [
      'Limited to late spring/early summer',
      'High demand flower',
    ],
  },
  {
    id: '3',
    common_name: "Baby's Breath",
    scientific_name: 'Gypsophila paniculata',
    seasonal_score: 0.89,
    matched_color: {
      color_hex: '#FFFFFF',
      similarity: 0.95,
    },
    color_compatibility: 'Perfect',
    current_pricing: {
      adjusted_price: 2.25,
      availability_score: 0.92,
    },
    sustainability_score: 0.88,
    allergen_info: {
      pollen: 'low',
      fragrance: 'none',
    },
    wedding_suitability: {
      bridal_bouquet: true,
      bridesmaids_bouquet: true,
      centerpiece: true,
      boutonniere: true,
    },
    seasonal_notes: ['Available year-round', 'Excellent filler flower'],
  },
  {
    id: '4',
    common_name: 'Eucalyptus',
    scientific_name: 'Eucalyptus cinerea',
    seasonal_score: 0.94,
    matched_color: {
      color_hex: '#90EE90',
      similarity: 0.82,
    },
    color_compatibility: 'Excellent',
    current_pricing: {
      adjusted_price: 3.75,
      availability_score: 0.86,
    },
    sustainability_score: 0.91,
    allergen_info: {
      pollen: 'low',
      fragrance: 'light',
    },
    wedding_suitability: {
      bridal_bouquet: true,
      bridesmaids_bouquet: true,
      centerpiece: true,
      boutonniere: true,
    },
    seasonal_notes: ['Sustainable greenery option', 'Long-lasting'],
  },
];

export function useFloristSearch(): UseFloristSearchReturn {
  const [searchResults, setSearchResults] = useState<SearchResults | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const searchFlowers = useCallback(
    withSecureValidation(
      FlowerSearchSchema,
      async (
        validatedCriteria: FlowerSearchCriteria,
      ): Promise<SearchResults> => {
        const startTime = Date.now();

        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1500));

          let filteredFlowers = [...MOCK_FLOWERS];
          const filtersApplied: string[] = [];

          // Apply color filtering
          if (validatedCriteria.colors && validatedCriteria.colors.length > 0) {
            filtersApplied.push('colors');
            // In a real implementation, this would match flowers to colors
            // For now, we'll just ensure all flowers have some color match
            filteredFlowers = filteredFlowers.map((flower) => ({
              ...flower,
              matched_color: {
                color_hex:
                  validatedCriteria.colors![
                    Math.floor(Math.random() * validatedCriteria.colors!.length)
                  ],
                similarity: Math.random() * 0.3 + 0.7,
              },
            }));
          }

          // Apply style filtering
          if (validatedCriteria.style && validatedCriteria.style !== '') {
            filtersApplied.push('style');
            // Style-based filtering would adjust seasonal scores
            filteredFlowers = filteredFlowers.map((flower) => ({
              ...flower,
              seasonal_score:
                flower.seasonal_score * (Math.random() * 0.2 + 0.9),
            }));
          }

          // Apply budget filtering
          if (validatedCriteria.budget_range) {
            filtersApplied.push('budget');
            filteredFlowers = filteredFlowers.filter((flower) => {
              const price = flower.current_pricing?.adjusted_price || 0;
              return (
                price >= validatedCriteria.budget_range!.min &&
                price <= validatedCriteria.budget_range!.max
              );
            });
          }

          // Apply sustainability filtering
          if (
            validatedCriteria.sustainability_minimum &&
            validatedCriteria.sustainability_minimum > 0
          ) {
            filtersApplied.push('sustainability');
            filteredFlowers = filteredFlowers.filter(
              (flower) =>
                (flower.sustainability_score || 0) >=
                validatedCriteria.sustainability_minimum!,
            );
          }

          // Apply wedding use filtering
          if (
            validatedCriteria.wedding_uses &&
            validatedCriteria.wedding_uses.length > 0
          ) {
            filtersApplied.push('wedding_uses');
            filteredFlowers = filteredFlowers.filter((flower) => {
              return validatedCriteria.wedding_uses!.some(
                (use) => flower.wedding_suitability?.[use],
              );
            });
          }

          // Sort by seasonal score (highest first)
          filteredFlowers.sort((a, b) => b.seasonal_score - a.seasonal_score);

          const avgSeasonalScore =
            filteredFlowers.length > 0
              ? filteredFlowers.reduce(
                  (sum, flower) => sum + flower.seasonal_score,
                  0,
                ) / filteredFlowers.length
              : 0;

          const results: SearchResults = {
            flowers: filteredFlowers,
            search_metadata: {
              total_found: filteredFlowers.length,
              avg_seasonal_score: avgSeasonalScore,
              search_time_ms: Date.now() - startTime,
              filters_applied: filtersApplied,
            },
            recommendations: {
              similar_flowers: MOCK_FLOWERS.slice(0, 2).filter(
                (f) => !filteredFlowers.find((ff) => ff.id === f.id),
              ),
              seasonal_alternatives: MOCK_FLOWERS.filter(
                (f) => f.seasonal_score > 0.8,
              ).slice(0, 3),
              cost_effective_alternatives: MOCK_FLOWERS.filter(
                (f) => (f.current_pricing?.adjusted_price || 0) < 4,
              ).slice(0, 2),
            },
          };

          return results;
        } catch (err) {
          throw new Error(
            `Flower search failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          );
        }
      },
    ),
    [],
  );

  const wrappedSearchFlowers = useCallback(
    async (criteria: FlowerSearchCriteria): Promise<SearchResults> => {
      setIsLoading(true);
      setError(null);

      try {
        // Create a mock request object for validation
        const mockRequest = new Request('https://example.com', {
          method: 'POST',
          body: JSON.stringify(criteria),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const results = await searchFlowers(criteria, mockRequest);
        setSearchResults(results);
        return results;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Search failed');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [searchFlowers],
  );

  const clearResults = useCallback(() => {
    setSearchResults(null);
    setError(null);
  }, []);

  return {
    searchResults,
    isLoading,
    error,
    searchFlowers: wrappedSearchFlowers,
    clearResults,
  };
}
