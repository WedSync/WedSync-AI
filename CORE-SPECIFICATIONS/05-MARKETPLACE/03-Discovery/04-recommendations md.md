# 04-recommendations.md

## What to Build

Intelligent recommendation engine using collaborative filtering, content-based filtering, and behavioral analysis to suggest relevant templates.

## Key Technical Requirements

### Recommendation Engine Architecture

```
interface RecommendationEngine {
  strategies: {
    collaborative: {
      weight: 0.4,
      algorithm: 'matrix_factorization' | 'nearest_neighbor'
    },
    contentBased: {
      weight: 0.3,
      features: ['category', 'tags', 'complexity', 'price']
    },
    behavioral: {
      weight: 0.2,
      signals: ['views', 'saves', 'purchases', 'time_spent']
    },
    trending: {
      weight: 0.1,
      window: '7_days'
    }
  },
  contexts: {
    'template_page': 'similar_templates',
    'search_results': 'you_might_like',
    'cart': 'frequently_bought_together',
    'homepage': 'personalized_picks'
  }
}
```

### Collaborative Filtering Implementation

```
class CollaborativeFilter {
  private userItemMatrix: Matrix
  
  async buildMatrix() {
    // Build user-item interaction matrix
    const interactions = await db.query(
      `SELECT user_id, template_id, 
              CASE 
                WHEN purchased THEN 5
                WHEN saved THEN 3
                WHEN viewed THEN 1
              END as weight
       FROM user_interactions`
    )
    
    this.userItemMatrix = this.createSparseMatrix(interactions)
  }
  
  async recommendForUser(userId: string, count: number = 10): Promise<Template[]> {
    // Find similar users
    const similarUsers = await this.findSimilarUsers(userId, 50)
    
    // Get templates liked by similar users
    const candidateTemplates = new Map<string, number>()
    
    for (const similar of similarUsers) {
      const userTemplates = await this.getUserTemplates(similar.userId)
      
      for (const template of userTemplates) {
        const currentScore = candidateTemplates.get([template.id](http://template.id)) || 0
        candidateTemplates.set(
          [template.id](http://template.id),
          currentScore + (similar.similarity * template.weight)
        )
      }
    }
    
    // Remove templates user already has
    const ownedTemplates = await this.getUserTemplates(userId)
    ownedTemplates.forEach(t => candidateTemplates.delete([t.id](http://t.id)))
    
    // Sort and return top N
    return Array.from(candidateTemplates.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([templateId]) => this.getTemplate(templateId))
  }
  
  findSimilarUsers(userId: string, count: number): SimilarUser[] {
    const userVector = this.userItemMatrix.getRow(userId)
    const similarities = []
    
    for (const otherUserId of this.userItemMatrix.getUserIds()) {
      if (otherUserId === userId) continue
      
      const otherVector = this.userItemMatrix.getRow(otherUserId)
      const similarity = this.cosineSimilarity(userVector, otherVector)
      
      similarities.push({ userId: otherUserId, similarity })
    }
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, count)
  }
}
```

### Content-Based Filtering

```
class ContentBasedFilter {
  async findSimilarTemplates(templateId: string, count: number = 10): Promise<Template[]> {
    const template = await this.getTemplate(templateId)
    
    // Create feature vector
    const features = await this.extractFeatures(template)
    
    // Find templates with similar features
    const candidates = await db.query(
      `SELECT t.*, 
              ts_rank(to_tsvector(description), plainto_tsquery($1)) as text_similarity,
              ARRAY_LENGTH(ARRAY_INTERSECT(tags, $2), 1)::float / ARRAY_LENGTH(tags, 1) as tag_similarity
       FROM marketplace_templates t
       WHERE [t.id](http://t.id) != $3
       AND t.vendor_type = $4
       ORDER BY (text_similarity * 0.3 + tag_similarity * 0.7) DESC
       LIMIT $5`,
      [template.description, template.tags, templateId, template.vendorType, count * 2]
    )
    
    // Apply additional filtering
    return this.applyBusinessRules(candidates, template).slice(0, count)
  }
  
  async extractFeatures(template: Template): Promise<FeatureVector> {
    return {
      category: template.category,
      vendorType: template.vendorType,
      tags: template.tags,
      priceRange: this.getPriceRange(template.price),
      complexity: await this.assessComplexity(template),
      style: await this.detectStyle(template),
      components: this.getComponentTypes(template)
    }
  }
}
```

### Behavioral Analysis

```
class BehavioralAnalyzer {
  async analyzeUserBehavior(userId: string): Promise<UserPreferences> {
    const actions = await this.getUserActions(userId, '30 days')
    
    const preferences = {
      pricePreference: this.analyzePricePreference(actions),
      categoryPreference: this.analyzeCategoryPreference(actions),
      complexityPreference: this.analyzeComplexityPreference(actions),
      purchasePatterns: this.analyzePurchasePatterns(actions)
    }
    
    // Detect shifts in preference
    const recentActions = actions.filter(a => a.timestamp > subDays(new Date(), 7))
    const shifts = this.detectPreferenceShifts(preferences, recentActions)
    
    if (shifts.length > 0) {
      await this.updateUserProfile(userId, shifts)
    }
    
    return preferences
  }
  
  analyzePricePreference(actions: UserAction[]): PricePreference {
    const prices = actions
      .filter(a => a.type === 'purchase' || a.type === 'save')
      .map(a => a.template.price)
    
    return {
      average: mean(prices),
      range: { min: min(prices), max: max(prices) },
      sensitivity: this.calculatePriceSensitivity(actions)
    }
  }
}
```

### Hybrid Recommendation Combiner

```
class HybridRecommender {
  async getRecommendations(
    userId: string,
    context: Context,
    count: number = 10
  ): Promise<Template[]> {
    // Get recommendations from each strategy
    const [collaborative, contentBased, behavioral, trending] = await Promise.all([
      this.collaborativeFilter.recommendForUser(userId, count * 2),
      this.contentFilter.recommendForUser(userId, count * 2),
      this.behavioralFilter.recommendForUser(userId, count * 2),
      this.trendingFilter.getTopTemplates(count)
    ])
    
    // Weight and combine
    const scored = new Map<string, number>()
    
    const addScores = (templates: Template[], weight: number) => {
      templates.forEach((template, index) => {
        const score = weight * (1 - index / templates.length) // Decay by position
        const current = scored.get([template.id](http://template.id)) || 0
        scored.set([template.id](http://template.id), current + score)
      })
    }
    
    addScores(collaborative, 0.4)
    addScores(contentBased, 0.3)
    addScores(behavioral, 0.2)
    addScores(trending, 0.1)
    
    // Add diversity
    return this.diversifyResults(
      Array.from(scored.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => this.getTemplate(id)),
      count
    )
  }
}
```

## Critical Implementation Notes

- Pre-compute recommendations during off-peak hours
- Use Redis for caching recommendation results
- A/B test different weight combinations
- Implement feedback loop for improving accuracy
- Consider cold start problem for new users/templates

## Database Structure

```
CREATE TABLE user_interactions (
  user_id UUID,
  template_id UUID,
  interaction_type TEXT,
  weight DECIMAL(3,1),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  context JSONB,
  PRIMARY KEY (user_id, template_id, interaction_type)
);

CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY,
  price_preference JSONB,
  category_preferences JSONB,
  style_preferences JSONB,
  last_updated TIMESTAMPTZ
);

CREATE TABLE recommendation_cache (
  user_id UUID,
  context TEXT,
  recommendations UUID[],
  scores DECIMAL[],
  generated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, context)
);
```