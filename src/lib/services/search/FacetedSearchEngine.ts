/**
 * Faceted Search Engine
 * Provides advanced search with faceting capabilities for wedding vendors
 */

export interface SearchFacet {
  name: string;
  field: string;
  values: Array<{
    value: string;
    count: number;
    selected?: boolean;
  }>;
}

export interface SearchFilters {
  [key: string]: string | string[] | number | boolean;
}

export interface SearchQuery {
  query?: string;
  filters?: SearchFilters;
  facets?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  facets: SearchFacet[];
  aggregations?: Record<string, any>;
  executionTime: number;
}

/**
 * Faceted Search Engine for wedding vendors and services
 */
export class FacetedSearchEngine {
  private indexes: Map<string, any[]> = new Map();
  private facetConfig: Map<string, SearchFacet> = new Map();

  constructor() {
    this.initializeDefaultFacets();
  }

  /**
   * Initialize default search facets for wedding vendors
   */
  private initializeDefaultFacets() {
    const defaultFacets: SearchFacet[] = [
      {
        name: 'Vendor Type',
        field: 'vendorType',
        values: [
          { value: 'photographer', count: 0 },
          { value: 'venue', count: 0 },
          { value: 'catering', count: 0 },
          { value: 'florist', count: 0 },
          { value: 'music', count: 0 },
          { value: 'planning', count: 0 },
        ],
      },
      {
        name: 'Price Range',
        field: 'priceRange',
        values: [
          { value: 'budget', count: 0 },
          { value: 'mid-range', count: 0 },
          { value: 'premium', count: 0 },
          { value: 'luxury', count: 0 },
        ],
      },
      {
        name: 'Location',
        field: 'location',
        values: [],
      },
      {
        name: 'Rating',
        field: 'rating',
        values: [
          { value: '5-stars', count: 0 },
          { value: '4-stars', count: 0 },
          { value: '3-stars', count: 0 },
        ],
      },
    ];

    defaultFacets.forEach((facet) => {
      this.facetConfig.set(facet.field, facet);
    });
  }

  /**
   * Add data to search index
   */
  public indexData(indexName: string, data: any[]) {
    this.indexes.set(indexName, data);
    this.updateFacetCounts(data);
  }

  /**
   * Update facet counts based on current data
   */
  private updateFacetCounts(data: any[]) {
    this.facetConfig.forEach((facet, field) => {
      const fieldCounts = new Map<string, number>();

      data.forEach((item) => {
        const value = item[field];
        if (value) {
          const stringValue = String(value).toLowerCase();
          fieldCounts.set(stringValue, (fieldCounts.get(stringValue) || 0) + 1);
        }
      });

      // Update facet values with counts
      facet.values.forEach((facetValue) => {
        facetValue.count = fieldCounts.get(facetValue.value) || 0;
      });

      // Add any new values found in data
      fieldCounts.forEach((count, value) => {
        if (!facet.values.find((fv) => fv.value === value)) {
          facet.values.push({ value, count });
        }
      });
    });
  }

  /**
   * Perform faceted search
   */
  public async search<T = any>(
    indexName: string,
    query: SearchQuery,
  ): Promise<SearchResult<T>> {
    const startTime = Date.now();
    const data = this.indexes.get(indexName) || [];

    let results = [...data];

    // Apply text search
    if (query.query) {
      const searchTerm = query.query.toLowerCase();
      results = results.filter((item) => {
        const searchableFields = ['name', 'description', 'tags', 'location'];
        return searchableFields.some((field) => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(searchTerm);
        });
      });
    }

    // Apply filters
    if (query.filters) {
      Object.entries(query.filters).forEach(([field, filterValue]) => {
        results = results.filter((item) => {
          const itemValue = item[field];

          if (Array.isArray(filterValue)) {
            return filterValue.some(
              (fv) =>
                String(itemValue).toLowerCase() === String(fv).toLowerCase(),
            );
          } else {
            return (
              String(itemValue).toLowerCase() ===
              String(filterValue).toLowerCase()
            );
          }
        });
      });
    }

    // Apply sorting
    if (query.sortBy) {
      results.sort((a, b) => {
        const aValue = a[query.sortBy!];
        const bValue = b[query.sortBy!];

        if (query.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }

    // Apply pagination
    const total = results.length;
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    const paginatedResults = results.slice(offset, offset + limit);

    // Calculate facets based on filtered results
    const facets: SearchFacet[] = [];
    if (query.facets) {
      query.facets.forEach((facetField) => {
        const facetConfig = this.facetConfig.get(facetField);
        if (facetConfig) {
          const facet: SearchFacet = {
            ...facetConfig,
            values: facetConfig.values.map((v) => ({ ...v })),
          };

          // Recalculate counts based on filtered results
          const fieldCounts = new Map<string, number>();
          results.forEach((item) => {
            const value = item[facetField];
            if (value) {
              const stringValue = String(value).toLowerCase();
              fieldCounts.set(
                stringValue,
                (fieldCounts.get(stringValue) || 0) + 1,
              );
            }
          });

          facet.values.forEach((facetValue) => {
            facetValue.count = fieldCounts.get(facetValue.value) || 0;
          });

          facets.push(facet);
        }
      });
    }

    const executionTime = Date.now() - startTime;

    return {
      items: paginatedResults,
      total,
      facets,
      executionTime,
    };
  }

  /**
   * Get available facets for an index
   */
  public getFacets(indexName: string): SearchFacet[] {
    return Array.from(this.facetConfig.values());
  }

  /**
   * Add custom facet configuration
   */
  public addFacet(facet: SearchFacet) {
    this.facetConfig.set(facet.field, facet);
  }

  /**
   * Remove facet configuration
   */
  public removeFacet(field: string) {
    this.facetConfig.delete(field);
  }
}

// Export singleton instance
export const facetedSearchEngine = new FacetedSearchEngine();
