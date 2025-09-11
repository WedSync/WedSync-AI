# 03-florist-intelligence.md

# Florist Intelligence AI System

## What to Build

Intelligent floriculture system providing seasonal availability, color matching, sustainability scoring, and botanical expertise for wedding florists.

## Key Technical Requirements

### Comprehensive Flower Database

```
interface FlowerDatabase {
  varieties: FlowerVariety[]
  seasonality: SeasonalAvailability
  colorPalettes: ColorMatch[]
  sustainability: SustainabilityData
  allergens: AllergenInfo[]
  careInstructions: CareGuide[]
}

interface FlowerVariety {
  id: string
  commonName: string
  scientificName: string
  family: string
  colors: Color[]
  seasonality: {
    peak: Month[]
    available: Month[]
    scarce: Month[]
  }
  characteristics: {
    fragrance: 'none' | 'light' | 'moderate' | 'strong'
    lifespan: number // days
    stemLength: { min: number, max: number }
    priceRange: PriceRange
  }
  weddingUse: {
    bouquet: boolean
    centerpiece: boolean
    ceremony: boolean
    boutonniere: boolean
  }
  growingRegions: string[]
  sustainability: SustainabilityScore
}

class FlowerIntelligence {
  private database: FlowerDatabase
  
  async searchFlowers(criteria: SearchCriteria): Promise<FlowerMatch[]> {
    let matches = this.database.varieties.filter(flower => 
      this.matchesCriteria(flower, criteria)
    )
    
    // Apply seasonal scoring
    matches = this.applySeasonalScoring(matches, criteria.weddingDate)
    
    // Apply availability scoring
    matches = await this.checkAvailability(matches, criteria.location)
    
    return this.rankMatches(matches)
  }
  
  private applySeasonalScoring(flowers: FlowerVariety[], weddingDate: Date): FlowerMatch[] {
    const month = weddingDate.getMonth() + 1
    
    return [flowers.map](http://flowers.map)(flower => {
      let seasonalScore = 0.5 // Base score
      
      if (flower.seasonality.peak.includes(month)) {
        seasonalScore = 1.0
      } else if (flower.seasonality.available.includes(month)) {
        seasonalScore = 0.8
      } else if (flower.seasonality.scarce.includes(month)) {
        seasonalScore = 0.3
      }
      
      return {
        flower,
        seasonalScore,
        available: seasonalScore > 0.3,
        priceMultiplier: this.calculatePriceMultiplier(seasonalScore)
      }
    })
  }
}
```

### Color Harmony AI System

```
class ColorHarmonyAI {
  async analyzeWeddingColors(weddingColors: Color[]): Promise<ColorAnalysis> {
    // Convert colors to LAB color space for accurate matching
    const labColors = [weddingColors.map](http://weddingColors.map)(color => this.rgbToLab(color))
    
    const harmonies = {
      complementary: this.findComplementaryColors(labColors),
      analogous: this.findAnalogousColors(labColors),
      triadic: this.findTriadicColors(labColors),
      monochromatic: this.findMonochromaticColors(labColors)
    }
    
    return {
      primaryPalette: weddingColors,
      recommendedFlowers: await this.findMatchingFlowers(harmonies),
      colorHarmonies: harmonies,
      seasonalCompatibility: await this.checkSeasonalCompatibility(harmonies)
    }
  }
  
  private async findMatchingFlowers(harmonies: ColorHarmonies): Promise<FlowerRecommendation[]> {
    const recommendations = []
    
    for (const harmony of Object.values(harmonies)) {
      const flowers = await this.searchFlowersByColor(harmony.colors)
      
      recommendations.push({
        harmonyType: harmony.type,
        confidence: harmony.confidence,
        flowers: flowers.slice(0, 5), // Top 5 matches
        colorMatch: harmony.colors
      })
    }
    
    return recommendations.sort((a, b) => b.confidence - a.confidence)
  }
  
  async generateColorPalette(
    baseColors: Color[],
    style: 'romantic' | 'modern' | 'rustic' | 'classic'
  ): Promise<WeddingPalette> {
    const prompt = `Create a wedding color palette:
      Base colors: ${[baseColors.map](http://baseColors.map)(c => c.hex).join(', ')}
      Style: ${style}
      
      Generate:
      - 2-3 primary colors
      - 2-3 accent colors  
      - 1-2 neutral colors
      
      Consider seasonal appropriateness and flower availability.
      Return as JSON with hex codes and color names.`
    
    const palette = await openai.complete({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: 'You are a professional wedding color consultant and florist.'
      }, {
        role: 'user',
        content: prompt
      }],
      response_format: { type: 'json_object' }
    })
    
    const parsedPalette = JSON.parse(palette)
    return {
      ...parsedPalette,
      flowerMatches: await this.findFlowersForPalette(parsedPalette.colors)
    }
  }
}
```

### Sustainability & Ethics Engine

```
class SustainabilityEngine {
  async calculateSustainabilityScore(
    flowerSelection: FlowerSelection[],
    weddingLocation: Location,
    weddingDate: Date
  ): Promise<SustainabilityReport> {
    const report = {
      overallScore: 0,
      carbonFootprint: 0,
      localScore: 0,
      seasonalScore: 0,
      recommendations: []
    }
    
    for (const selection of flowerSelection) {
      const flower = await this.getFlowerData(selection.flowerId)
      
      // Calculate distance from growing region
      const distance = this.calculateDistance(
        flower.primaryGrowingRegion,
        weddingLocation
      )
      
      // Seasonal appropriateness
      const seasonal = this.isInSeason(flower, weddingDate)
      
      // Water usage and farming practices
      const farmingScore = flower.sustainability.farmingPractices
      
      const flowerScore = this.calculateFlowerSustainability({
        distance,
        seasonal,
        farmingScore,
        quantity: selection.quantity
      })
      
      report.overallScore += flowerScore.weighted
      report.carbonFootprint += flowerScore.carbon
      
      if (flowerScore.score < 0.6) {
        report.recommendations.push({
          type: 'substitution',
          flower: flower.commonName,
          reason: flowerScore.issues,
          alternatives: await this.findSustainableAlternatives(flower, weddingLocation)
        })
      }
    }
    
    return this.finalizeReport(report, flowerSelection.length)
  }
  
  async findSustainableAlternatives(
    flower: FlowerVariety,
    location: Location
  ): Promise<FlowerAlternative[]> {
    const criteria = {
      similarColors: flower.colors,
      similarCharacteristics: flower.characteristics,
      location: location,
      sustainabilityMinimum: 0.7
    }
    
    const alternatives = await this.searchFlowers(criteria)
    
    return [alternatives.map](http://alternatives.map)(alt => ({
      flower: alt.flower,
      sustainabilityScore: alt.sustainability,
      reasonForRecommendation: alt.benefits,
      availabilityCalendar: alt.seasonality
    }))
  }
}
```

### Arrangement Optimizer AI

```
class ArrangementOptimizer {
  async optimizeArrangement(
    requirements: ArrangementRequirements
  ): Promise<ArrangementPlan> {
    const analysis = await openai.complete({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: 'You are a master florist with 20+ years experience designing wedding arrangements.'
      }, {
        role: 'user',
        content: `Design arrangement for:
          Type: ${requirements.type}
          Size: ${requirements.size}
          Color scheme: ${requirements.colors.join(', ')}
          Budget: ${requirements.budget}
          Season: ${requirements.season}
          Style: ${[requirements.style](http://requirements.style)}
          Venue: ${requirements.venue}
          
          Provide:
          - Flower selection with quantities
          - Foliage and filler recommendations
          - Construction technique
          - Care instructions
          - Timeline for creation
          
          Consider longevity, fragrance, and guest allergies.
          Return as structured JSON.`
      }],
      response_format: { type: 'json_object' }
    })
    
    const plan = JSON.parse(analysis)
    
    // Enhance with database information
    return await this.enhancePlan(plan, requirements)
  }
  
  private async enhancePlan(
    plan: any,
    requirements: ArrangementRequirements
  ): Promise<ArrangementPlan> {
    // Add real-time pricing
    const pricing = await this.calculateCurrentPricing([plan.flowers](http://plan.flowers))
    
    // Check availability
    const availability = await this.checkAvailability(
      [plan.flowers](http://plan.flowers),
      requirements.weddingDate
    )
    
    // Generate care timeline
    const careTimeline = this.generateCareTimeline(
      [plan.flowers](http://plan.flowers),
      requirements.weddingDate
    )
    
    return {
      ...plan,
      pricing,
      availability,
      careTimeline,
      sustainability: await this.calculateArrangementSustainability([plan.flowers](http://plan.flowers))
    }
  }
}
```

### Allergen Detection System

```
class AllergenDetection {
  private allergenDatabase = {
    pollen: {
      high: ['lilies', 'sunflowers', 'chrysanthemums'],
      moderate: ['roses', 'carnations', 'alstroemeria'],
      low: ['orchids', 'tulips', 'peonies']
    },
    fragrance: {
      strong: ['gardenias', 'jasmine', 'freesias'],
      moderate: ['roses', 'sweet peas', 'stock'],
      none: ['orchids', 'succulents', 'ferns']
    },
    contact: {
      irritating: ['chrysanthemums', 'primula', 'tulip bulbs'],
      safe: ['roses', 'carnations', 'baby breath']
    }
  }
  
  async analyzeAllergenRisk(
    flowerSelection: FlowerSelection[],
    guestAllergies: AllergyInfo[]
  ): Promise<AllergenReport> {
    const risks = []
    const recommendations = []
    
    for (const selection of flowerSelection) {
      const flower = await this.getFlowerData(selection.flowerId)
      
      // Check pollen levels
      const pollenRisk = this.assessPollenRisk(flower, guestAllergies)
      if (pollenRisk.level > 0.5) {
        risks.push({
          flower: flower.commonName,
          riskType: 'pollen',
          level: pollenRisk.level,
          affectedGuests: pollenRisk.affectedCount
        })
        
        recommendations.push({
          type: 'low-pollen-alternative',
          alternatives: await this.findLowPollenAlternatives(flower)
        })
      }
      
      // Check fragrance sensitivity
      const fragranceRisk = this.assessFragranceRisk(flower, guestAllergies)
      if (fragranceRisk.level > 0.6) {
        recommendations.push({
          type: 'placement-advice',
          flower: flower.commonName,
          advice: 'Place away from dining areas and ceremony seating'
        })
      }
    }
    
    return {
      overallRisk: this.calculateOverallRisk(risks),
      specificRisks: risks,
      recommendations,
      allergenFreeAlternatives: await this.findAllergenFreeAlternatives(flowerSelection)
    }
  }
}
```

## Critical Implementation Notes

### Database Schema

```
CREATE TABLE flower_varieties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_name TEXT NOT NULL,
  scientific_name TEXT UNIQUE,
  family_name TEXT,
  color_variants JSONB NOT NULL,
  seasonality JSONB NOT NULL, -- {peak: [], available: [], scarce: []}
  characteristics JSONB NOT NULL,
  wedding_uses JSONB NOT NULL,
  growing_regions TEXT[],
  sustainability_score DECIMAL CHECK (sustainability_score >= 0 AND sustainability_score <= 1),
  allergen_info JSONB,
  care_instructions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE flower_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flower_id UUID REFERENCES flower_varieties(id),
  region TEXT NOT NULL,
  month INTEGER CHECK (month >= 1 AND month <= 12),
  base_price DECIMAL NOT NULL,
  availability_score DECIMAL CHECK (availability_score >= 0 AND availability_score <= 1),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE color_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flower_id UUID REFERENCES flower_varieties(id),
  color_hex TEXT NOT NULL,
  color_name TEXT,
  match_accuracy DECIMAL CHECK (match_accuracy >= 0 AND match_accuracy <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE arrangement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_type TEXT NOT NULL,
  style TEXT NOT NULL,
  size_category TEXT NOT NULL,
  flower_composition JSONB NOT NULL,
  technique_notes TEXT,
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  estimated_time_hours DECIMAL,
  sustainability_score DECIMAL,
  allergen_score DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flowers_season ON flower_varieties USING GIN (seasonality);
CREATE INDEX idx_flowers_color ON color_matches(color_hex);
CREATE INDEX idx_pricing_region_month ON flower_pricing(region, month);
```

### Seasonal Intelligence System

```
class SeasonalIntelligence {
  async predictSeasonalTrends(
    weddingDate: Date,
    location: Location
  ): Promise<SeasonalForecast> {
    const month = weddingDate.getMonth() + 1
    const climate = await this.getClimateData(location)
    
    const forecast = {
      optimalFlowers: await this.getOptimalFlowers(month, climate),
      priceTrends: await this.getPriceTrends(month, location),
      availabilityForecast: await this.getAvailabilityForecast(month, location),
      weatherConsiderations: await this.getWeatherConsiderations(weddingDate, location)
    }
    
    return forecast
  }
  
  async generateSeasonalRecommendations(
    preferences: FloralPreferences,
    weddingDate: Date
  ): Promise<SeasonalRecommendations> {
    const prompt = `Generate seasonal flower recommendations:
      Wedding Date: ${weddingDate.toISOString()}
      Color Preferences: ${preferences.colors.join(', ')}
      Style: ${[preferences.style](http://preferences.style)}
      Budget: ${preferences.budget}
      
      Consider:
      - Peak seasonal availability
      - Traditional seasonal associations
      - Weather resilience
      - Cost optimization
      
      Provide specific flower varieties with reasoning.`
    
    const recommendations = await openai.complete({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
    
    return await this.enrichRecommendations(JSON.parse(recommendations))
  }
}
```

### API Endpoints

```
// Search flowers by criteria
GET /api/florist/flowers/search?colors=:colors&season=:season&budget=:budget

// Generate color palette
POST /api/florist/colors/palette
{
  baseColors: Color[],
  style: string,
  season: string
}

// Calculate sustainability score
POST /api/florist/sustainability/analyze
{
  flowers: FlowerSelection[],
  location: Location,
  weddingDate: Date
}

// Optimize arrangement
POST /api/florist/arrangements/optimize
{
  requirements: ArrangementRequirements,
  constraints: ArrangementConstraints
}

// Check allergen risks
POST /api/florist/allergens/analyze
{
  flowers: FlowerSelection[],
  guestAllergies: AllergyInfo[]
}

// Get seasonal forecast
GET /api/florist/seasonal/forecast?date=:date&location=:location
```

### Performance Targets

- **Flower search**: <300ms
- **Color matching**: <500ms
- **Sustainability analysis**: <2 seconds
- **Arrangement optimization**: <5 seconds
- **Database coverage**: 500+ flower varieties
- **Color accuracy**: >95%

This florist intelligence system combines botanical expertise with AI-powered design assistance, helping florists create stunning, sustainable, and allergen-conscious wedding arrangements while optimizing for seasonality and budget constraints.