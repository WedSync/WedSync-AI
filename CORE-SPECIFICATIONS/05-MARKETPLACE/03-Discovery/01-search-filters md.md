# 01-search-filters.md

## What to Build

Advanced search and filtering system for discovering templates with faceted search, smart recommendations, and visual preview.

## Key Technical Requirements

### Search Implementation

```
interface SearchSystem {
  textSearch: {
    fields: ['title', 'description', 'tags'],
    algorithms: ['fuzzy', 'semantic', 'exact'],
    boosting: {
      title: 2.0,
      tags: 1.5,
      description: 1.0
    }
  },
  filters: {
    vendorType: VendorType[],
    priceRange: { min: number, max: number },
    rating: { min: number },
    creator: { verified: boolean },
    features: string[],
    complexity: 'simple' | 'intermediate' | 'advanced'
  },
  sorting: {
    options: [
      'relevance',
      'price_low_high',
      'price_high_low',
      'best_selling',
      'highest_rated',
      'newest',
      'trending'
    ]
  }
}
```

### Faceted Search Engine

```
class TemplateSearch {
  async search(query: SearchQuery): Promise<SearchResults> {
    // Build Elasticsearch query
    const esQuery = {
      bool: {
        must: query.text ? [
          {
            multi_match: {
              query: query.text,
              fields: ['title^2', 'description', 'tags^1.5'],
              type: 'best_fields',
              fuzziness: 'AUTO'
            }
          }
        ] : [],
        filter: this.buildFilters(query.filters)
      }
    }
    
    // Add aggregations for facets
    const aggregations = {
      vendor_types: { terms: { field: 'vendor_type' } },
      price_ranges: {
        range: {
          field: 'price',
          ranges: [
            { to: 50 },
            { from: 50, to: 100 },
            { from: 100, to: 200 },
            { from: 200 }
          ]
        }
      },
      avg_rating: { avg: { field: 'rating' } }
    }
    
    const results = await [this.elasticsearch.search](http://this.elasticsearch.search)({
      index: 'templates',
      body: {
        query: esQuery,
        aggs: aggregations,
        sort: this.getSortCriteria(query.sort),
        from: query.offset || 0,
        size: query.limit || 20
      }
    })
    
    return this.formatResults(results)
  }
  
  buildFilters(filters: SearchFilters): any[] {
    const esFilters = []
    
    if (filters.vendorType?.length) {
      esFilters.push({ terms: { vendor_type: filters.vendorType } })
    }
    
    if (filters.priceRange) {
      esFilters.push({
        range: {
          price: {
            gte: filters.priceRange.min,
            lte: filters.priceRange.max
          }
        }
      })
    }
    
    if (filters.rating) {
      esFilters.push({ range: { rating: { gte: filters.rating.min } } })
    }
    
    return esFilters
  }
}
```

### Visual Preview System

```
class TemplatePreview {
  async generatePreview(templateId: string): Promise<PreviewData> {
    const template = await this.getTemplate(templateId)
    
    return {
      thumbnail: await this.generateThumbnail(template),
      screenshots: await this.captureScreenshots(template),
      interactiveDemo: this.createDemoUrl(templateId),
      quickStats: {
        components: this.countComponents(template),
        estimatedSetupTime: this.estimateSetupTime(template),
        customizability: this.assessCustomizability(template)
      }
    }
  }
  
  async generateThumbnail(template: Template): Promise<string> {
    // Use Puppeteer to capture template preview
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    
    await page.setViewport({ width: 1200, height: 630 })
    await page.goto(`${BASE_URL}/templates/${[template.id](http://template.id)}/preview`)
    
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 630 }
    })
    
    await browser.close()
    
    // Upload to CDN
    return await this.uploadToCDN(screenshot, `template-${[template.id](http://template.id)}-thumb.png`)
  }
}
```

### Filter UI Components

```
interface FilterComponents {
  priceSlider: {
    min: 0,
    max: 500,
    step: 10,
    histogram: boolean // Show distribution
  },
  multiSelect: {
    vendorTypes: {
      options: VendorType[],
      icons: Map<VendorType, IconComponent>
    },
    features: {
      grouped: boolean,
      searchable: boolean
    }
  },
  toggles: {
    verifiedOnly: boolean,
    hasDemo: boolean,
    instantDownload: boolean
  }
}
```

## Critical Implementation Notes

- Index templates in Elasticsearch for fast search
- Cache popular searches for performance
- Track search queries for improving results
- Progressive loading for image previews
- Save search preferences per user

## Database Structure

```
CREATE TABLE search_indices (
  template_id UUID PRIMARY KEY,
  title_vector tsvector,
  description_vector tsvector,
  tags TEXT[],
  vendor_types TEXT[],
  price INTEGER,
  rating DECIMAL(2,1),
  sales_count INTEGER,
  updated_at TIMESTAMPTZ
);

CREATE INDEX idx_search_text ON search_indices USING GIN(title_vector);
CREATE INDEX idx_search_tags ON search_indices USING GIN(tags);
CREATE INDEX idx_search_price ON search_indices(price);

CREATE TABLE search_history (
  id UUID PRIMARY KEY,
  user_id UUID,
  query TEXT,
  filters JSONB,
  results_count INTEGER,
  clicked_results UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```