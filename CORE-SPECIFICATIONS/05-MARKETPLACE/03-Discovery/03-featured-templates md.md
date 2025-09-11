# 03-featured-templates.md

## What to Build

Curation system for showcasing high-quality templates through editorial picks, trending algorithms, and personalized featuring.

## Key Technical Requirements

### Featured Template System

```
interface FeaturedSystem {
  placements: {
    homepage: {
      hero: Template, // Single featured
      grid: Template[], // 6-8 templates
      categories: Map<Category, Template[]> // 3 per category
    },
    category: {
      banner: Template,
      sidebar: Template[],
      inline: Template[] // Within results
    },
    search: {
      promoted: Template[], // Top of results
      suggested: Template[] // 'You might also like'
    }
  },
  rotation: {
    frequency: 'daily' | 'weekly' | 'manual',
    algorithm: 'round_robin' | 'performance_based' | 'manual'
  }
}
```

### Editorial Curation Engine

```
class EditorialCuration {
  async selectFeaturedTemplates(placement: Placement): Promise<Template[]> {
    const candidates = await this.getCandidates(placement)
    
    // Score each candidate
    const scored = await Promise.all(
      [candidates.map](http://candidates.map)(async (template) => ({
        template,
        score: await this.scoreTemplate(template, placement)
      }))
    )
    
    // Sort by score and diversity
    const selected = this.selectWithDiversity(
      scored,
      placement.count,
      placement.diversityRules
    )
    
    return [selected.map](http://selected.map)(s => s.template)
  }
  
  async scoreTemplate(template: Template, placement: Placement): Promise<number> {
    const weights = placement.weights || {
      quality: 0.3,
      performance: 0.3,
      recency: 0.1,
      creator: 0.2,
      uniqueness: 0.1
    }
    
    const scores = {
      quality: await this.getQualityScore(template),
      performance: await this.getPerformanceScore(template),
      recency: this.getRecencyScore(template),
      creator: await this.getCreatorScore(template.creatorId),
      uniqueness: await this.getUniquenessScore(template)
    }
    
    return Object.entries(scores).reduce(
      (total, [key, score]) => total + score * weights[key],
      0
    )
  }
  
  selectWithDiversity(scored: ScoredTemplate[], count: number, rules: DiversityRules) {
    const selected = []
    const usedCategories = new Set()
    const usedCreators = new Set()
    
    for (const item of scored) {
      // Check diversity rules
      if (rules.uniqueCategories && usedCategories.has(item.template.category)) continue
      if (rules.uniqueCreators && usedCreators.has(item.template.creatorId)) continue
      
      selected.push(item)
      usedCategories.add(item.template.category)
      usedCreators.add(item.template.creatorId)
      
      if (selected.length >= count) break
    }
    
    return selected
  }
}
```

### Trending Algorithm

```
class TrendingAlgorithm {
  async calculateTrendingScore(templateId: string): Promise<number> {
    const timeWindows = {
      hour: await this.getMetrics(templateId, '1 hour'),
      day: await this.getMetrics(templateId, '1 day'),
      week: await this.getMetrics(templateId, '1 week')
    }
    
    // Calculate velocity (acceleration of interest)
    const velocity = {
      views: (timeWindows.hour.views / [timeWindows.day](http://timeWindows.day).views) * 24,
      sales: (timeWindows.hour.sales / [timeWindows.day](http://timeWindows.day).sales) * 24,
      saves: (timeWindows.hour.saves / [timeWindows.day](http://timeWindows.day).saves) * 24
    }
    
    // Weight recent activity more heavily
    const recencyMultiplier = Math.exp(-0.1 * timeWindows.hour.hoursSinceLastAction)
    
    // Combine metrics
    const score = (
      velocity.views * 0.3 +
      velocity.sales * 0.5 +
      velocity.saves * 0.2
    ) * recencyMultiplier
    
    return score
  }
  
  async getTrendingTemplates(count: number = 10): Promise<Template[]> {
    const templates = await this.getRecentTemplates(100)
    
    const scored = await Promise.all(
      [templates.map](http://templates.map)(async (t) => ({
        template: t,
        score: await this.calculateTrendingScore([t.id](http://t.id))
      }))
    )
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(s => s.template)
  }
}
```

### Personalized Featuring

```
class PersonalizedFeaturing {
  async getFeaturedForUser(userId: string): Promise<Template[]> {
    const userProfile = await this.getUserProfile(userId)
    
    // Get user preferences
    const preferences = {
      vendorType: userProfile.vendorType,
      priceRange: await this.getUserPricePreference(userId),
      style: await this.getUserStylePreference(userId),
      complexity: await this.getUserComplexityPreference(userId)
    }
    
    // Find matching templates
    const candidates = await this.findMatchingTemplates(preferences)
    
    // Apply collaborative filtering
    const similar = await this.getSimilarUsers(userId)
    const collaborativeRecs = await this.getTemplatesFromSimilarUsers(similar)
    
    // Combine and rank
    return this.combineRecommendations([
      { source: 'preferences', templates: candidates, weight: 0.6 },
      { source: 'collaborative', templates: collaborativeRecs, weight: 0.4 }
    ])
  }
}
```

### Feature Scheduling

```
class FeatureScheduler {
  async scheduleFeature(templateId: string, schedule: FeatureSchedule) {
    await db.insert('featured_schedule', {
      template_id: templateId,
      placement: schedule.placement,
      start_date: schedule.startDate,
      end_date: schedule.endDate,
      priority: schedule.priority,
      conditions: schedule.conditions // Time of day, user segment, etc.
    })
    
    // Set up automated rotation
    if (schedule.rotation) {
      await this.setupRotation(templateId, schedule.rotation)
    }
  }
  
  async getActiveFeatures(placement: string): Promise<Template[]> {
    const now = new Date()
    
    const scheduled = await db.query(
      `SELECT * FROM featured_schedule 
       WHERE placement = $1 
       AND start_date <= $2 
       AND end_date >= $2
       ORDER BY priority DESC`,
      [placement, now]
    )
    
    return this.applyRotation(scheduled)
  }
}
```

## Critical Implementation Notes

- A/B test featured placements
- Track CTR for each placement
- Ensure fair rotation for paid features
- Override for special promotions
- Cache featured selections for performance

## Database Structure

```
CREATE TABLE featured_schedule (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES marketplace_templates(id),
  placement TEXT NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,
  conditions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trending_scores (
  template_id UUID PRIMARY KEY,
  score DECIMAL(10,4),
  velocity JSONB,
  last_calculated TIMESTAMPTZ,
  rank INTEGER
);

CREATE TABLE editorial_picks (
  id UUID PRIMARY KEY,
  template_id UUID,
  curator_id UUID,
  placement TEXT,
  reason TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```