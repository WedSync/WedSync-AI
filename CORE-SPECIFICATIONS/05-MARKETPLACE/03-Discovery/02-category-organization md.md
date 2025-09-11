# 02-category-organization.md

## What to Build

Intuitive category hierarchy and navigation system organizing templates by vendor type, use case, and style.

## Key Technical Requirements

### Category Hierarchy

```
interface CategoryStructure {
  primary: {
    photography: {
      subcategories: [
        'client_onboarding',
        'shot_lists',
        'timeline_planning',
        'gallery_delivery',
        'album_design'
      ],
      styles: ['documentary', 'fine_art', 'traditional', 'editorial']
    },
    venue: {
      subcategories: [
        'tours_consultations',
        'booking_process',
        'event_coordination',
        'vendor_management',
        'floor_plans'
      ],
      venueTypes: ['barn', 'ballroom', 'outdoor', 'historic', 'modern']
    },
    catering: {
      subcategories: [
        'menu_planning',
        'tastings',
        'dietary_management',
        'service_timeline',
        'staffing'
      ],
      cuisineTypes: ['traditional', 'fusion', 'vegetarian', 'international']
    },
    planning: {
      subcategories: [
        'full_planning',
        'partial_planning',
        'day_coordination',
        'design_styling',
        'vendor_management'
      ]
    }
  },
  crossCategory: {
    bundles: ['complete_vendor_kit', 'starter_package', 'premium_suite'],
    workflows: ['pre_wedding', 'wedding_day', 'post_wedding'],
    complexity: ['beginner', 'intermediate', 'advanced', 'expert']
  }
}
```

### Dynamic Category Pages

```
class CategoryPageGenerator {
  async generateCategoryPage(category: string, subcategory?: string) {
    const templates = await this.getTemplatesForCategory(category, subcategory)
    
    return {
      hero: {
        title: this.getCategoryTitle(category, subcategory),
        description: this.getCategoryDescription(category, subcategory),
        stats: {
          templateCount: templates.length,
          creatorCount: new Set([templates.map](http://templates.map)(t => t.creatorId)).size,
          avgRating: this.calculateAvgRating(templates)
        }
      },
      featured: await this.getFeaturedTemplates(category, 3),
      filters: this.getCategorySpecificFilters(category),
      subcategories: this.getSubcategories(category),
      relatedCategories: this.getRelatedCategories(category),
      templates: this.paginateTemplates(templates)
    }
  }
  
  getCategorySpecificFilters(category: string): Filter[] {
    const baseFilters = ['price', 'rating', 'sales']
    
    const categoryFilters = {
      photography: ['camera_brand', 'delivery_time', 'image_count'],
      venue: ['capacity', 'venue_type', 'amenities'],
      catering: ['guest_count', 'service_style', 'cuisine'],
      planning: ['event_size', 'planning_duration', 'included_vendors']
    }
    
    return [...baseFilters, ...(categoryFilters[category] || [])]
  }
}
```

### Navigation Components

```
interface NavigationSystem {
  megaMenu: {
    structure: 'hoverable' | 'clickable',
    categories: CategoryMenuItem[],
    featured: {
      newArrivals: Template[],
      trending: Template[],
      staffPicks: Template[]
    }
  },
  breadcrumbs: {
    format: 'Home > Category > Subcategory > Template',
    clickable: true,
    schemaMarkup: true // For SEO
  },
  sidebar: {
    expandable: boolean,
    showCounts: boolean,
    icons: Map<string, IconComponent>
  }
}

class NavigationBuilder {
  buildMegaMenu(): MegaMenu {
    return {
      categories: Object.entries(CategoryStructure.primary).map(
        ([key, value]) => ({
          id: key,
          label: this.formatLabel(key),
          icon: this.getCategoryIcon(key),
          subcategories: [value.subcategories.map](http://value.subcategories.map)(sub => ({
            id: sub,
            label: this.formatLabel(sub),
            count: this.getTemplateCount(key, sub),
            featured: this.getFeaturedTemplate(key, sub)
          })),
          promotion: this.getCurrentPromotion(key)
        })
      )
    }
  }
}
```

### Category Analytics

```
class CategoryAnalytics {
  async trackCategoryPerformance(category: string) {
    const metrics = {
      views: await this.getCategoryViews(category),
      clicks: await this.getCategoryClicks(category),
      conversions: await this.getCategoryConversions(category),
      avgTimeOnPage: await this.getAvgTimeOnPage(category),
      bounceRate: await this.getBounceRate(category)
    }
    
    // Identify underperforming categories
    if (metrics.conversions / metrics.views < 0.01) {
      await this.flagForOptimization(category, metrics)
    }
    
    // Identify trending categories
    const trend = await this.calculateTrend(category, metrics)
    if (trend.growth > 0.5) {
      await this.promoteCategory(category)
    }
    
    return metrics
  }
}
```

### SEO Optimization

```
class CategorySEO {
  generateMetadata(category: string, subcategory?: string) {
    const title = subcategory 
      ? `${subcategory} Templates for ${category} | WedSync Marketplace`
      : `${category} Wedding Templates | WedSync Marketplace`
    
    const description = this.generateDescription(category, subcategory)
    
    return {
      title,
      description,
      keywords: this.generateKeywords(category, subcategory),
      canonical: `${BASE_URL}/marketplace/${category}${subcategory ? `/${subcategory}` : ''}`,
      openGraph: {
        title,
        description,
        image: this.getCategoryImage(category),
        type: 'website'
      },
      structuredData: this.generateStructuredData(category, subcategory)
    }
  }
}
```

## Critical Implementation Notes

- Auto-categorize templates using AI
- Show category popularity trends
- A/B test category layouts
- Personalize category order based on user type
- Cross-sell between related categories

## Database Structure

```
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  parent_id UUID REFERENCES categories(id),
  display_order INTEGER,
  icon TEXT,
  description TEXT,
  metadata JSONB
);

CREATE TABLE template_categories (
  template_id UUID REFERENCES marketplace_templates(id),
  category_id UUID REFERENCES categories(id),
  is_primary BOOLEAN DEFAULT false,
  relevance_score DECIMAL(3,2),
  PRIMARY KEY (template_id, category_id)
);

CREATE TABLE category_analytics (
  category_id UUID,
  date DATE,
  views INTEGER,
  clicks INTEGER,
  conversions INTEGER,
  revenue INTEGER,
  PRIMARY KEY (category_id, date)
);
```