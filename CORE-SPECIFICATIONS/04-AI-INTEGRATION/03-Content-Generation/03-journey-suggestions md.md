# 03-journey-suggestions.md

# Journey Suggestions AI Implementation

## What to Build

Intelligent customer journey generator that creates optimal workflows based on vendor type, service level, and wedding timeline using AI analysis of successful patterns.

## Key Technical Requirements

### Journey Template Generator

```
interface JourneyRequest {
  vendorType: 'photographer' | 'dj' | 'caterer' | 'venue' | 'planner'
  serviceLevel: 'basic' | 'premium' | 'luxury'
  weddingTimeline: number // months until wedding
  clientPreferences?: {
    communicationStyle: 'formal' | 'casual' | 'detailed'
    frequency: 'minimal' | 'regular' | 'frequent'
  }
}

class JourneyAI {
  async suggestJourney(request: JourneyRequest): Promise<GeneratedJourney> {
    const baseTemplate = await this.getBaseTemplate(request.vendorType)
    const industryData = await this.getIndustryBenchmarks(request.vendorType)
    
    const systemPrompt = `You are an expert wedding industry consultant. Create an optimal customer journey for a ${request.vendorType} offering ${request.serviceLevel} service level.
    
    Wedding timeline: ${request.weddingTimeline} months
    
    Include:
    - Specific touchpoint timing (days from booking)
    - Content type for each touchpoint
    - Goal of each interaction
    - Conditional branching logic
    - Vendor-specific best practices
    
    Return as structured JSON with nodes and connections.`
    
    const response = await [openai.chat](http://openai.chat).completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
    
    const journeyData = JSON.parse(response.choices[0].message.content)
    return this.validateAndEnhanceJourney(journeyData, request)
  }
  
  private async validateAndEnhanceJourney(journey: any, request: JourneyRequest) {
    // Add vendor-specific enhancements
    const enhanced = await this.addVendorSpecificNodes(journey, request.vendorType)
    
    // Validate timing makes sense
    const validated = this.validateTiming(enhanced, request.weddingTimeline)
    
    // Add performance predictions
    const predicted = await this.addPerformancePredictions(validated)
    
    return {
      ...predicted,
      metadata: {
        generatedAt: new Date(),
        basedOn: request,
        confidence: this.calculateConfidence(predicted)
      }
    }
  }
}
```

### Vendor-Specific Journey Logic

```
class VendorJourneySpecialist {
  private vendorTouchpoints = {
    photographer: {
      critical: ['contract_signing', 'engagement_session', 'timeline_review', 'final_details'],
      optimal_timing: {
        'engagement_session': 90, // days before wedding
        'timeline_review': 30,
        'final_details': 7
      },
      seasonal_adjustments: {
        'peak_season': { buffer_days: 14 },
        'off_season': { buffer_days: 7 }
      }
    },
    
    caterer: {
      critical: ['menu_tasting', 'final_headcount', 'dietary_confirmation', 'setup_coordination'],
      optimal_timing: {
        'menu_tasting': 120,
        'final_headcount': 14,
        'dietary_confirmation': 7,
        'setup_coordination': 1
      }
    },
    
    dj: {
      critical: ['music_preferences', 'timeline_coordination', 'equipment_setup', 'final_playlist'],
      optimal_timing: {
        'music_preferences': 60,
        'timeline_coordination': 21,
        'equipment_setup': 7,
        'final_playlist': 3
      }
    }
  }
  
  buildVendorJourney(vendorType: string, timeline: number): JourneyNode[] {
    const spec = this.vendorTouchpoints[vendorType]
    const nodes = []
    
    // Add booking confirmation node
    nodes.push({
      id: 'booking_confirmation',
      type: 'email',
      timing: 'immediate',
      content: 'booking_confirmation_template',
      triggers: ['contract_signed']
    })
    
    // Add critical touchpoints
    for (const [touchpoint, daysOut] of Object.entries(spec.optimal_timing)) {
      if (daysOut < timeline * 30) { // Only if timeline allows
        nodes.push({
          id: touchpoint,
          type: this.determineContentType(touchpoint),
          timing: `${daysOut}_days_before`,
          content: `${touchpoint}_template`,
          conditional: this.getConditionalLogic(touchpoint)
        })
      }
    }
    
    return this.optimizeNodeSequence(nodes)
  }
}
```

### Journey Optimization Engine

```
class JourneyOptimizer {
  async analyzePerformance(journeyId: string): Promise<OptimizationSuggestions> {
    const metrics = await this.getJourneyMetrics(journeyId)
    const benchmarks = await this.getIndustryBenchmarks()
    
    const analysis = await [openai.chat](http://openai.chat).completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: `Analyze journey performance and suggest improvements:
        
        Current metrics: ${JSON.stringify(metrics)}
        Industry benchmarks: ${JSON.stringify(benchmarks)}
        
        Identify:
        - Underperforming touchpoints
        - Timing optimization opportunities
        - Content improvement suggestions
        - A/B testing recommendations`
      }],
      temperature: 0.2
    })
    
    return this.parseOptimizationSuggestions(analysis.choices[0].message.content)
  }
  
  suggestTimingAdjustments(journey: Journey, dropOffPoints: TouchpointMetric[]) {
    const suggestions = []
    
    for (const point of dropOffPoints) {
      if (point.engagementRate < 0.4) {
        suggestions.push({
          nodeId: point.nodeId,
          currentTiming: point.timing,
          suggestedTiming: this.calculateOptimalTiming(point),
          reason: 'Low engagement - try different timing',
          confidence: 0.8
        })
      }
    }
    
    return suggestions
  }
}
```

### Seasonal and Context Awareness

```
class ContextualJourneyBuilder {
  adjustForSeason(journey: Journey, weddingDate: Date): Journey {
    const season = this.getSeason(weddingDate)
    const month = weddingDate.getMonth()
    
    // Adjust for peak wedding season
    if (month >= 4 && month <= 9) { // May-October
      journey.nodes.forEach(node => {
        if (node.timing.includes('days_before')) {
          const days = parseInt(node.timing)
          node.timing = `${days + 7}_days_before` // Add buffer
        }
      })
    }
    
    // Add seasonal content
    journey.nodes.push({
      id: 'seasonal_tips',
      type: 'info',
      timing: '30_days_before',
      content: `${season}_wedding_tips`,
      conditional: `wedding_month_is_${month}`
    })
    
    return journey
  }
  
  addPersonalization(journey: Journey, clientData: ClientProfile): Journey {
    // Add communication style adjustments
    if (clientData.prefersCasualTone) {
      journey.nodes.forEach(node => {
        if (node.type === 'email') {
          node.content += '_casual_variant'
        }
      })
    }
    
    // Add service-specific nodes
    if (clientData.selectedAddOns?.includes('engagement_session')) {
      journey.nodes.push({
        id: 'engagement_planning',
        type: 'meeting',
        timing: '90_days_before',
        content: 'engagement_session_scheduler'
      })
    }
    
    return journey
  }
}
```

### Performance Prediction

```
class JourneyPerformancePredictor {
  async predictSuccess(journey: Journey): Promise<PerformancePrediction> {
    const features = this.extractFeatures(journey)
    const historicalData = await this.getHistoricalPerformance()
    
    // Calculate predicted metrics
    const predictions = {
      overallCompletionRate: this.predictCompletionRate(features),
      touchpointEngagement: this.predictEngagementByNode(journey.nodes),
      clientSatisfactionScore: this.predictSatisfaction(features),
      timeToCompletion: this.predictDuration(journey)
    }
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(predictions)
    
    return {
      predictions,
      recommendations,
      confidence: this.calculatePredictionConfidence(features)
    }
  }
  
  private extractFeatures(journey: Journey) {
    return {
      totalTouchpoints: journey.nodes.length,
      emailRatio: journey.nodes.filter(n => n.type === 'email').length / journey.nodes.length,
      avgTimingSpread: this.calculateTimingSpread(journey.nodes),
      complexityScore: this.calculateComplexity(journey),
      personalizationLevel: this.getPersonalizationScore(journey)
    }
  }
}
```

## Critical Implementation Notes

### Database Integration

```
-- Store generated journeys for learning
CREATE TABLE ai_generated_journeys (
  id UUID PRIMARY KEY,
  vendor_type TEXT NOT NULL,
  service_level TEXT NOT NULL,
  wedding_timeline_months INTEGER,
  generated_structure JSONB NOT NULL,
  performance_metrics JSONB,
  usage_count INTEGER DEFAULT 0,
  avg_completion_rate DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track journey performance for ML
CREATE TABLE journey_performance_data (
  id UUID PRIMARY KEY,
  journey_id UUID REFERENCES customer_journeys(id),
  ai_suggestion_id UUID REFERENCES ai_generated_journeys(id),
  actual_completion_rate DECIMAL(3,2),
  client_satisfaction_score INTEGER,
  supplier_rating INTEGER,
  modifications_made JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

```
// Generate journey suggestion
POST /api/ai/journey/suggest
{
  vendorType: string,
  serviceLevel: string,
  weddingTimeline: number,
  clientPreferences?: object
}

// Optimize existing journey
POST /api/ai/journey/optimize
{
  journeyId: string,
  performanceData: object
}

// Get similar successful journeys
GET /api/ai/journey/similar?vendor_type=:type&service_level=:level
```

### Error Handling

```
const handleGenerationError = (error: Error, request: JourneyRequest) => {
  console.error('Journey generation failed:', error)
  
  // Fallback to template-based generation
  return this.generateFromTemplate(request.vendorType, request.serviceLevel)
}

const validateGeneratedJourney = (journey: Journey): ValidationResult => {
  const issues = []
  
  // Check for logical timing issues
  if (journey.nodes.some(n => n.timing === 'immediate' && n.type === 'meeting')) {
    issues.push('Cannot schedule immediate meetings')
  }
  
  // Ensure minimum touchpoints
  if (journey.nodes.length < 3) {
    issues.push('Journey needs at least 3 touchpoints')
  }
  
  return { valid: issues.length === 0, issues }
}
```

### Machine Learning Enhancement

- Track which AI-generated journeys perform best
- Feed successful patterns back into prompt engineering
- A/B test AI suggestions against manual templates
- Continuously improve based on real supplier feedback