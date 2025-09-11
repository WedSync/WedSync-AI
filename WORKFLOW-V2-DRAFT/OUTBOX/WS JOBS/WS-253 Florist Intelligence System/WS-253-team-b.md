# WS-253 Florist Intelligence System - Team B Backend Prompt

## EVIDENCE OF REALITY REQUIREMENTS (CRITICAL)
**MANDATORY: This task is incomplete until ALL evidence below is provided:**

### Database Migration Success (MANDATORY)
```bash
# MUST run these commands and show SUCCESS:
cd wedsync
npx supabase migration new florist_intelligence_system
# Show the generated migration file with proper SQL
npx supabase db push  # Must succeed without errors
npx supabase db reset --linked  # Test migration rollback/reapply
```

### API Endpoint Testing (MANDATORY)
```bash
# MUST show successful API responses:
curl -X POST http://localhost:3000/api/florist/search \
  -H "Content-Type: application/json" \
  -d '{"colors":["#FF69B4"],"season":"spring"}'

curl -X POST http://localhost:3000/api/florist/palette/generate \
  -H "Content-Type: application/json" \
  -d '{"baseColors":["#FF69B4"],"style":"romantic","season":"spring"}'

curl -X POST http://localhost:3000/api/florist/sustainability/analyze \
  -H "Content-Type: application/json" \
  -d '{"flower_selections":[{"flower_id":"123","quantity":10}]}'
```

### OpenAI Integration Testing (MANDATORY)
```bash
# MUST show successful AI responses:
node -e "
const { FloristIntelligenceService } = require('./src/lib/florist/florist-intelligence-service.ts');
const service = new FloristIntelligenceService();
service.generateColorPalette(['#FF69B4'], 'romantic', 'spring').then(console.log);
"
```

### Database Data Verification (MANDATORY)
```sql
-- MUST show populated tables:
SELECT COUNT(*) FROM flower_varieties;  -- Should be >100
SELECT COUNT(*) FROM flower_color_matches;  -- Should be >500
SELECT COUNT(*) FROM flower_sustainability_data;  -- Should be >50
SELECT COUNT(*) FROM arrangement_templates;  -- Should be >20
```

### TypeScript Compilation (MANDATORY)
```bash
cd wedsync
npm run typecheck  # Must show 0 errors
npm run build      # Must complete successfully
npm run test       # Must show >90% coverage for new backend services
```

## SECURITY REQUIREMENTS (MANDATORY)

### withSecureValidation Middleware Pattern
**ALL API endpoints MUST follow this exact security pattern:**

```typescript
// File: /src/app/api/florist/search/route.ts
import { withSecureValidation } from '@/lib/security/withSecureValidation';
import { z } from 'zod';

const FlowerSearchSchema = z.object({
  colors: z.array(z.string().regex(/^#[0-9A-F]{6}$/i)).optional(),
  wedding_date: z.string().datetime().optional(),
  style: z.enum(['romantic', 'modern', 'rustic', 'classic', 'bohemian']).optional(),
  season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
  budget_range: z.object({
    min: z.number().min(0).max(100),
    max: z.number().min(0).max(100)
  }).optional(),
  exclude_allergens: z.array(z.enum(['pollen', 'fragrance', 'contact'])).optional(),
  sustainability_minimum: z.number().min(0).max(1).optional(),
  wedding_uses: z.array(z.string()).optional(),
  region: z.string().max(50).optional(),
  limit: z.number().min(1).max(100).default(20)
});

export const POST = withSecureValidation(
  FlowerSearchSchema,
  async (validatedData, request) => {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const floristService = new FloristIntelligenceService();
    const results = await floristService.searchFlowersWithIntelligence(validatedData);
    
    // Log the search for analytics (GDPR-compliant)
    await auditLogger.log('flower_search', {
      userId: hashUserId(userId),
      searchCriteria: sanitizeForLogging(validatedData),
      resultCount: results.flowers?.length || 0
    });

    return NextResponse.json(results);
  }
);
```

### Database Security Requirements
```sql
-- MANDATORY Row Level Security policies for all florist tables:

-- Flower varieties (public read, admin write)
ALTER TABLE flower_varieties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read flower varieties" ON flower_varieties FOR SELECT USING (true);
CREATE POLICY "Only admins can modify flower varieties" ON flower_varieties FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Wedding floral plans (florist and couple access only)
ALTER TABLE wedding_floral_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Florists can manage their floral plans" ON wedding_floral_plans 
  FOR ALL USING (florist_id = auth.uid());
CREATE POLICY "Wedding couples can view their floral plans" ON wedding_floral_plans 
  FOR SELECT USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE couple_id = auth.uid()
    )
  );

-- Arrangement templates (creator or public access)
ALTER TABLE arrangement_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read public templates" ON arrangement_templates 
  FOR SELECT USING (is_public = true OR created_by = auth.uid());
CREATE POLICY "Users can manage their own templates" ON arrangement_templates 
  FOR ALL USING (created_by = auth.uid());
```

### OpenAI API Security
```typescript
// MANDATORY: Sanitize all prompts to prevent injection attacks
class FloristIntelligenceService {
  private sanitizePromptInput(input: any): string {
    // Remove potentially malicious prompt injections
    const dangerous = [
      'ignore previous instructions',
      'system:',
      'assistant:',
      'user:',
      '\\n\\nHuman:',
      '\\n\\nAssistant:',
      '<|im_start|>',
      '<|im_end|>',
      'OVERRIDE SECURITY'
    ];
    
    let sanitized = JSON.stringify(input);
    dangerous.forEach(phrase => {
      sanitized = sanitized.replace(new RegExp(phrase, 'gi'), '[FILTERED]');
    });
    
    // Limit input length to prevent token abuse
    return sanitized.slice(0, 2000);
  }

  async generateColorPalette(baseColors: string[], style: string, season: string) {
    // Validate inputs before AI processing
    const validColors = baseColors.filter(color => /^#[0-9A-F]{6}$/i.test(color));
    const validStyle = ['romantic', 'modern', 'rustic', 'classic', 'bohemian'].includes(style) ? style : 'classic';
    const validSeason = ['spring', 'summer', 'fall', 'winter'].includes(season) ? season : 'spring';

    const prompt = `Create a wedding color palette based on these requirements:
Base Colors: ${this.sanitizePromptInput(validColors)}
Style: ${validStyle}
Season: ${validSeason}
[Continue with safe prompt...]`;

    // Rate limiting by user
    await this.checkRateLimit(userId, 'color_palette_generation', 10, '1h');
    
    return await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: 'You are a professional wedding color consultant. Create sophisticated color palettes in valid JSON format only.'
      }, {
        role: 'user',
        content: prompt
      }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 800
    });
  }
}
```

### Data Encryption Requirements
```typescript
// MANDATORY: Encrypt sensitive florist data
import { encrypt, decrypt } from '@/lib/encryption';

class FloristDataService {
  async saveFloralPlan(weddingId: string, floristId: string, planData: any) {
    // Encrypt client-specific preferences and budget information
    const encryptedPlan = {
      ...planData,
      client_preferences: await encrypt(JSON.stringify(planData.client_preferences)),
      budget_details: await encrypt(JSON.stringify(planData.budget_details)),
      private_notes: await encrypt(planData.private_notes || '')
    };

    return await supabase
      .from('wedding_floral_plans')
      .upsert(encryptedPlan);
  }

  async getFloralPlan(planId: string) {
    const { data } = await supabase
      .from('wedding_floral_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (data) {
      // Decrypt sensitive data
      data.client_preferences = JSON.parse(await decrypt(data.client_preferences));
      data.budget_details = JSON.parse(await decrypt(data.budget_details));
      data.private_notes = await decrypt(data.private_notes);
    }

    return data;
  }
}
```

## TEAM B SPECIALIZATION - BACKEND FOCUS

### Primary Responsibilities
1. **Flower Database Management**: Comprehensive flower varieties database with seasonal, pricing, sustainability data
2. **AI Integration Services**: Secure OpenAI integration for color palette generation and flower recommendations  
3. **Search & Filtering Engine**: High-performance flower search with multiple criteria and intelligent ranking
4. **Color Matching Algorithms**: LAB color space calculations for accurate flower-to-color matching
5. **Sustainability Analytics**: Carbon footprint calculation, local sourcing analysis, environmental impact scoring

### Database Migration Required

#### Complete Florist Intelligence Schema
```sql
-- File: /supabase/migrations/YYYYMMDDHHMMSS_florist_intelligence_system.sql

-- =====================================================
-- FLORIST INTELLIGENCE SYSTEM DATABASE SCHEMA
-- =====================================================

-- Comprehensive flower varieties database
CREATE TABLE IF NOT EXISTS flower_varieties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_name TEXT NOT NULL,
  scientific_name TEXT UNIQUE NOT NULL,
  family_name TEXT,
  color_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  seasonality JSONB NOT NULL DEFAULT '{"peak": [], "available": [], "scarce": []}'::jsonb,
  characteristics JSONB NOT NULL DEFAULT '{}'::jsonb,
  wedding_uses JSONB NOT NULL DEFAULT '{"bouquet": false, "centerpiece": false, "ceremony": false, "boutonniere": false}'::jsonb,
  growing_regions TEXT[] DEFAULT '{}',
  sustainability_score DECIMAL(3,2) CHECK (sustainability_score >= 0 AND sustainability_score <= 1),
  allergen_info JSONB DEFAULT '{"pollen": "low", "fragrance": "none", "contact_irritant": false}'::jsonb,
  care_instructions JSONB DEFAULT '{}'::jsonb,
  average_lifespan_days INTEGER,
  stem_length_range JSONB DEFAULT '{"min": 0, "max": 0}'::jsonb,
  fragrance_intensity TEXT CHECK (fragrance_intensity IN ('none', 'light', 'moderate', 'strong')) DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regional flower pricing and availability
CREATE TABLE IF NOT EXISTS flower_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flower_id UUID REFERENCES flower_varieties(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  month INTEGER CHECK (month >= 1 AND month <= 12),
  year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  base_price_per_stem DECIMAL(6,2) NOT NULL,
  wholesale_price_per_stem DECIMAL(6,2),
  availability_score DECIMAL(3,2) CHECK (availability_score >= 0 AND availability_score <= 1),
  quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  supplier_reliability DECIMAL(3,2) CHECK (supplier_reliability >= 0 AND supplier_reliability <= 1),
  transportation_carbon_cost DECIMAL(8,2), -- CO2 kg per stem
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(flower_id, region, month, year)
);

-- Color matching database for accurate color harmony
CREATE TABLE IF NOT EXISTS flower_color_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flower_id UUID REFERENCES flower_varieties(id) ON DELETE CASCADE,
  color_hex TEXT NOT NULL,
  color_name TEXT,
  color_category TEXT, -- 'primary', 'secondary', 'accent', 'variegated'
  match_accuracy DECIMAL(3,2) CHECK (match_accuracy >= 0 AND match_accuracy <= 1),
  color_lab JSONB, -- LAB color space values for accurate matching
  seasonal_variation JSONB, -- How colors change by season
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-designed arrangement templates and optimization data
CREATE TABLE IF NOT EXISTS arrangement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  arrangement_type TEXT NOT NULL CHECK (arrangement_type IN ('bouquet', 'centerpiece', 'ceremony_arch', 'aisle_decor', 'corsage', 'boutonniere', 'installation')),
  style TEXT NOT NULL CHECK (style IN ('romantic', 'modern', 'rustic', 'classic', 'bohemian', 'minimalist')),
  size_category TEXT NOT NULL CHECK (size_category IN ('small', 'medium', 'large', 'extra_large')),
  flower_composition JSONB NOT NULL, -- Array of {flower_id, quantity, role: 'focal'|'filler'|'foliage'}
  technique_notes TEXT,
  construction_instructions JSONB,
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  estimated_time_hours DECIMAL(4,2),
  estimated_cost_range JSONB, -- {min: number, max: number}
  sustainability_score DECIMAL(3,2) CHECK (sustainability_score >= 0 AND sustainability_score <= 1),
  allergen_score DECIMAL(3,2) CHECK (allergen_score >= 0 AND allergen_score <= 1),
  seasonal_adaptations JSONB, -- Variations for different seasons
  created_by UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wedding-specific flower arrangements and plans
CREATE TABLE IF NOT EXISTS wedding_floral_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL, -- References weddings table
  florist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  color_palette JSONB NOT NULL, -- Primary wedding colors
  style_preferences JSONB, -- Style, budget, preferences (ENCRYPTED)
  arrangement_list JSONB NOT NULL, -- All arrangements with quantities and details
  sustainability_analysis JSONB,
  allergen_analysis JSONB,
  total_estimated_cost DECIMAL(10,2),
  carbon_footprint_estimate DECIMAL(8,2), -- kg CO2
  seasonal_score DECIMAL(3,2),
  ai_generated BOOLEAN DEFAULT false,
  generation_notes TEXT,
  client_approved BOOLEAN DEFAULT NULL,
  client_preferences TEXT, -- ENCRYPTED field
  budget_details TEXT, -- ENCRYPTED field
  private_notes TEXT, -- ENCRYPTED field
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(wedding_id, florist_id)
);

-- Sustainability and carbon footprint tracking
CREATE TABLE IF NOT EXISTS flower_sustainability_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flower_id UUID REFERENCES flower_varieties(id) ON DELETE CASCADE,
  growing_method TEXT CHECK (growing_method IN ('organic', 'conventional', 'hydroponic', 'wild_harvested')),
  water_usage_liters_per_stem DECIMAL(6,2),
  pesticide_usage_score DECIMAL(3,2) CHECK (pesticide_usage_score >= 0 AND pesticide_usage_score <= 1), -- 0 = organic, 1 = heavy pesticides
  labor_conditions_score DECIMAL(3,2) CHECK (labor_conditions_score >= 0 AND labor_conditions_score <= 1), -- Fair trade scoring
  transportation_method TEXT, -- 'local', 'truck', 'air', 'sea'
  average_transport_distance_km INTEGER,
  carbon_footprint_per_stem DECIMAL(6,2), -- kg CO2 equivalent
  certifications TEXT[], -- 'organic', 'fair_trade', 'carbon_neutral', etc.
  data_source TEXT,
  last_verified TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(flower_id, growing_method)
);

-- Allergen and safety information
CREATE TABLE IF NOT EXISTS flower_allergen_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flower_id UUID REFERENCES flower_varieties(id) ON DELETE CASCADE,
  allergen_type TEXT NOT NULL CHECK (allergen_type IN ('pollen', 'fragrance', 'contact', 'ingestion')),
  severity_level TEXT NOT NULL CHECK (severity_level IN ('none', 'low', 'moderate', 'high', 'severe')),
  affected_population_percent DECIMAL(4,2), -- What % of population is sensitive
  specific_compounds TEXT[], -- Specific allergens identified
  symptoms TEXT[],
  mitigation_strategies TEXT[],
  safe_handling_notes TEXT,
  pet_safety_notes TEXT,
  research_sources TEXT[],
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(flower_id, allergen_type)
);

-- AI-generated seasonal forecasts and recommendations
CREATE TABLE IF NOT EXISTS seasonal_flower_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  month INTEGER CHECK (month >= 1 AND month <= 12),
  year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  flower_id UUID REFERENCES flower_varieties(id) ON DELETE CASCADE,
  availability_forecast DECIMAL(3,2) CHECK (availability_forecast >= 0 AND availability_forecast <= 1),
  price_trend TEXT CHECK (price_trend IN ('increasing', 'stable', 'decreasing')),
  quality_forecast DECIMAL(3,2) CHECK (quality_forecast >= 0 AND quality_forecast <= 1),
  weather_impact_risk DECIMAL(3,2) CHECK (weather_impact_risk >= 0 AND weather_impact_risk <= 1),
  recommended_alternatives TEXT[], -- Array of flower IDs as text
  forecast_confidence DECIMAL(3,2) CHECK (forecast_confidence >= 0 AND forecast_confidence <= 1),
  ai_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(region, month, year, flower_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_flower_varieties_common_name ON flower_varieties(common_name);
CREATE INDEX IF NOT EXISTS idx_flower_varieties_scientific_name ON flower_varieties(scientific_name);
CREATE INDEX IF NOT EXISTS idx_flower_varieties_family ON flower_varieties(family_name);
CREATE INDEX IF NOT EXISTS idx_flower_varieties_seasonality ON flower_varieties USING GIN (seasonality);
CREATE INDEX IF NOT EXISTS idx_flower_varieties_wedding_uses ON flower_varieties USING GIN (wedding_uses);
CREATE INDEX IF NOT EXISTS idx_flower_varieties_sustainability ON flower_varieties(sustainability_score DESC) WHERE sustainability_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_region_month ON flower_pricing(region, month);
CREATE INDEX IF NOT EXISTS idx_pricing_flower_date ON flower_pricing(flower_id, month, year);

CREATE INDEX IF NOT EXISTS idx_color_matches_hex ON flower_color_matches(color_hex);
CREATE INDEX IF NOT EXISTS idx_color_matches_flower ON flower_color_matches(flower_id);
CREATE INDEX IF NOT EXISTS idx_color_matches_category ON flower_color_matches(color_category);

CREATE INDEX IF NOT EXISTS idx_templates_type_style ON arrangement_templates(arrangement_type, style);
CREATE INDEX IF NOT EXISTS idx_templates_size ON arrangement_templates(size_category);
CREATE INDEX IF NOT EXISTS idx_templates_public ON arrangement_templates(is_public);

CREATE INDEX IF NOT EXISTS idx_floral_plans_wedding ON wedding_floral_plans(wedding_id);
CREATE INDEX IF NOT EXISTS idx_floral_plans_florist ON wedding_floral_plans(florist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sustainability_flower ON flower_sustainability_data(flower_id);
CREATE INDEX IF NOT EXISTS idx_sustainability_footprint ON flower_sustainability_data(carbon_footprint_per_stem);

CREATE INDEX IF NOT EXISTS idx_allergen_flower ON flower_allergen_data(flower_id);
CREATE INDEX IF NOT EXISTS idx_allergen_severity ON flower_allergen_data(severity_level);

CREATE INDEX IF NOT EXISTS idx_forecasts_region_date ON seasonal_flower_forecasts(region, month, year);
CREATE INDEX IF NOT EXISTS idx_forecasts_flower ON seasonal_flower_forecasts(flower_id);

-- Row Level Security Policies (MANDATORY)
ALTER TABLE flower_varieties ENABLE ROW LEVEL SECURITY;
ALTER TABLE flower_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE flower_color_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE arrangement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_floral_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE flower_sustainability_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE flower_allergen_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_flower_forecasts ENABLE ROW LEVEL SECURITY;

-- Public read access for flower data
CREATE POLICY "Public can read flower varieties" ON flower_varieties FOR SELECT USING (true);
CREATE POLICY "Public can read flower pricing" ON flower_pricing FOR SELECT USING (true);
CREATE POLICY "Public can read flower color matches" ON flower_color_matches FOR SELECT USING (true);
CREATE POLICY "Public can read sustainability data" ON flower_sustainability_data FOR SELECT USING (true);
CREATE POLICY "Public can read allergen data" ON flower_allergen_data FOR SELECT USING (true);
CREATE POLICY "Public can read forecasts" ON seasonal_flower_forecasts FOR SELECT USING (true);

-- Template access policies
CREATE POLICY "Users can read public templates" ON arrangement_templates 
  FOR SELECT USING (is_public = true OR created_by = auth.uid());
CREATE POLICY "Users can manage their own templates" ON arrangement_templates 
  FOR ALL USING (created_by = auth.uid());

-- Floral plan access policies
CREATE POLICY "Florists can manage their floral plans" ON wedding_floral_plans 
  FOR ALL USING (florist_id = auth.uid());

-- Admin policies for data management
CREATE POLICY "Admins can manage flower data" ON flower_varieties FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  )
);

-- Apply similar admin policies to other tables...
CREATE POLICY "Admins can manage pricing data" ON flower_pricing FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  )
);

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_flower_varieties_updated_at BEFORE UPDATE ON flower_varieties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flower_pricing_updated_at BEFORE UPDATE ON flower_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_arrangement_templates_updated_at BEFORE UPDATE ON arrangement_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wedding_floral_plans_updated_at BEFORE UPDATE ON wedding_floral_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Core Backend Services to Build

#### 1. FloristIntelligenceService - Main AI Integration Service
```typescript
// File: /src/lib/florist/florist-intelligence-service.ts
import { OpenAI } from 'openai';
import { supabase } from '@/lib/supabase';
import { encrypt, decrypt } from '@/lib/encryption';
import { auditLogger } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';

export interface FlowerSearchCriteria {
  colors?: string[];
  wedding_date?: Date;
  style?: string;
  season?: string;
  budget_range?: { min: number; max: number };
  exclude_allergens?: string[];
  sustainability_minimum?: number;
  wedding_uses?: string[];
  region?: string;
  limit?: number;
}

export interface FlowerSearchResults {
  flowers: FlowerResult[];
  search_metadata: {
    total_results: number;
    avg_seasonal_score: number;
    avg_sustainability_score: number;
    search_criteria: FlowerSearchCriteria;
    generated_at: string;
  };
}

export interface FlowerResult {
  id: string;
  common_name: string;
  scientific_name: string;
  color_variants: any[];
  seasonal_score: number;
  availability_score: number;
  price_estimate: {
    per_stem: number;
    currency: string;
    last_updated: string;
  };
  sustainability: {
    score: number;
    carbon_footprint: number;
    certifications: string[];
  };
  allergen_info: {
    pollen: string;
    fragrance: string;
    contact_safe: boolean;
  };
  wedding_suitability: {
    bouquet: boolean;
    centerpiece: boolean;
    ceremony: boolean;
    boutonniere: boolean;
  };
  color_match_score?: number;
  matched_color?: any;
  color_compatibility?: string;
  composite_score: number;
  ranking_factors: {
    seasonal: number;
    color_match?: number;
    sustainability?: number;
    availability?: number;
    price_fit?: number;
  };
}

export class FloristIntelligenceService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async searchFlowersWithIntelligence(criteria: FlowerSearchCriteria, userId?: string): Promise<FlowerSearchResults> {
    try {
      // Rate limiting
      if (userId) {
        await rateLimit.check(userId, 'flower_search', 100, '1h');
      }

      // Step 1: Get base flower data from database
      let query = supabase
        .from('flower_varieties')
        .select(`
          *,
          flower_color_matches(*),
          flower_sustainability_data(*),
          flower_allergen_data(*)
        `);

      // Apply basic filters
      if (criteria.wedding_uses?.length) {
        criteria.wedding_uses.forEach(use => {
          query = query.filter('wedding_uses', 'cs', `{"${use}": true}`);
        });
      }

      const { data: flowers, error } = await query;
      if (error) throw error;

      if (!flowers || flowers.length === 0) {
        return {
          flowers: [],
          search_metadata: {
            total_results: 0,
            avg_seasonal_score: 0,
            avg_sustainability_score: 0,
            search_criteria: criteria,
            generated_at: new Date().toISOString()
          }
        };
      }

      // Step 2: Apply AI-powered seasonal scoring
      const seasonallyScored = await this.applySeasonalIntelligence(flowers, criteria);

      // Step 3: Apply color matching if specified
      const colorMatched = criteria.colors?.length 
        ? await this.applyColorMatching(seasonallyScored, criteria.colors)
        : seasonallyScored;

      // Step 4: Apply sustainability filtering
      const sustainabilityFiltered = criteria.sustainability_minimum
        ? colorMatched.filter(f => (f.sustainability_score || 0) >= criteria.sustainability_minimum!)
        : colorMatched;

      // Step 5: Apply allergen filtering
      const allergenSafe = criteria.exclude_allergens?.length
        ? this.applyAllergenFiltering(sustainabilityFiltered, criteria.exclude_allergens)
        : sustainabilityFiltered;

      // Step 6: Get pricing data and availability
      const withPricing = await this.enhanceWithPricingData(allergenSafe, criteria);

      // Step 7: Rank and return results
      const rankedResults = this.rankFlowerResults(withPricing, criteria);

      // Audit logging (GDPR-compliant)
      if (userId) {
        await auditLogger.log('flower_search', {
          userId: this.hashUserId(userId),
          searchCriteria: this.sanitizeForLogging(criteria),
          resultCount: rankedResults.flowers.length,
          timestamp: new Date().toISOString()
        });
      }

      return rankedResults;

    } catch (error) {
      console.error('Flower search failed:', error);
      throw new Error(`Failed to search flowers with intelligence: ${error.message}`);
    }
  }

  private async applySeasonalIntelligence(flowers: any[], criteria: FlowerSearchCriteria): Promise<any[]> {
    const weddingMonth = criteria.wedding_date?.getMonth() + 1 || new Date().getMonth() + 1;
    
    return flowers.map(flower => {
      const seasonality = flower.seasonality || {};
      let seasonalScore = 0.5; // Base score

      // Peak season bonus
      if (seasonality.peak?.includes(weddingMonth)) {
        seasonalScore = 1.0;
      }
      // Available season
      else if (seasonality.available?.includes(weddingMonth)) {
        seasonalScore = 0.8;
      }
      // Scarce season penalty
      else if (seasonality.scarce?.includes(weddingMonth)) {
        seasonalScore = 0.3;
      }

      return {
        ...flower,
        seasonal_score: seasonalScore,
        price_multiplier: this.calculatePriceMultiplier(seasonalScore),
        seasonal_notes: this.getSeasonalNotes(flower, weddingMonth)
      };
    });
  }

  private async applyColorMatching(flowers: any[], targetColors: string[]): Promise<any[]> {
    const flowersWithColorScores = await Promise.all(
      flowers.map(async flower => {
        const colorMatches = flower.flower_color_matches || [];
        let bestColorMatch = 0;
        let matchedColor = null;

        // Find best color match for this flower
        for (const targetColor of targetColors) {
          for (const flowerColor of colorMatches) {
            const similarity = this.calculateColorSimilarity(targetColor, flowerColor.color_hex);
            if (similarity > bestColorMatch) {
              bestColorMatch = similarity;
              matchedColor = flowerColor;
            }
          }
        }

        return {
          ...flower,
          color_match_score: bestColorMatch,
          matched_color: matchedColor,
          color_compatibility: bestColorMatch > 0.7 ? 'excellent' : 
                             bestColorMatch > 0.5 ? 'good' : 
                             bestColorMatch > 0.3 ? 'fair' : 'poor'
        };
      })
    );

    // Filter out flowers with very poor color matches unless no good matches found
    const goodMatches = flowersWithColorScores.filter(f => f.color_match_score > 0.3);
    return goodMatches.length > 0 ? goodMatches : flowersWithColorScores.slice(0, 10);
  }

  private calculateColorSimilarity(color1: string, color2: string): number {
    // Convert hex colors to LAB space for perceptual similarity
    const lab1 = this.hexToLab(color1);
    const lab2 = this.hexToLab(color2);
    
    // Calculate Delta E (perceptual color difference)
    const deltaE = Math.sqrt(
      Math.pow(lab1.L - lab2.L, 2) + 
      Math.pow(lab1.a - lab2.a, 2) + 
      Math.pow(lab1.b - lab2.b, 2)
    );
    
    // Convert to similarity score (0-1, where 1 is identical)
    return Math.max(0, 1 - (deltaE / 100));
  }

  private hexToLab(hex: string): { L: number; a: number; b: number } {
    // Convert hex to RGB
    const rgb = this.hexToRgb(hex);
    
    // Convert RGB to XYZ (D65 illuminant)
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    // Gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Convert to XYZ
    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
    const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
    const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;

    // Convert XYZ to LAB
    const xn = 95.047; // D65 illuminant
    const yn = 100.0;
    const zn = 108.883;

    let fx = x / xn > 0.008856 ? Math.pow(x / xn, 1/3) : (903.3 * x / xn + 16) / 116;
    let fy = y / yn > 0.008856 ? Math.pow(y / yn, 1/3) : (903.3 * y / yn + 16) / 116;
    let fz = z / zn > 0.008856 ? Math.pow(z / zn, 1/3) : (903.3 * z / zn + 16) / 116;

    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const bVal = 200 * (fy - fz);

    return { L, a, b: bVal };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  private applyAllergenFiltering(flowers: any[], excludeAllergens: string[]): any[] {
    return flowers.filter(flower => {
      const allergenData = flower.flower_allergen_data || [];
      
      for (const exclusion of excludeAllergens) {
        const allergenInfo = allergenData.find((a: any) => a.allergen_type === exclusion);
        if (allergenInfo && ['high', 'severe'].includes(allergenInfo.severity_level)) {
          return false; // Exclude this flower
        }
      }
      
      return true;
    });
  }

  private async enhanceWithPricingData(flowers: any[], criteria: FlowerSearchCriteria): Promise<any[]> {
    const month = criteria.wedding_date?.getMonth() + 1 || new Date().getMonth() + 1;
    const region = criteria.region || 'US';
    
    return await Promise.all(
      flowers.map(async flower => {
        // Get current pricing for this flower
        const { data: pricing } = await supabase
          .from('flower_pricing')
          .select('*')
          .eq('flower_id', flower.id)
          .eq('region', region)
          .eq('month', month)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const basePrice = pricing?.base_price_per_stem || 2.50; // Default fallback
        const adjustedPrice = basePrice * (flower.price_multiplier || 1.0);

        return {
          ...flower,
          current_pricing: {
            base_price: basePrice,
            adjusted_price: adjustedPrice,
            currency: 'USD',
            availability_score: pricing?.availability_score || 0.5,
            last_updated: pricing?.updated_at
          }
        };
      })
    );
  }

  private rankFlowerResults(flowers: any[], criteria: FlowerSearchCriteria): FlowerSearchResults {
    // Calculate composite score for each flower
    const scored = flowers.map(flower => {
      let score = 0;
      let weights = 0;

      // Seasonal appropriateness (30% weight)
      score += flower.seasonal_score * 0.3;
      weights += 0.3;

      // Color matching (25% weight if colors specified)
      if (criteria.colors?.length) {
        score += (flower.color_match_score || 0) * 0.25;
        weights += 0.25;
      }

      // Sustainability (20% weight if specified)
      if (criteria.sustainability_minimum) {
        score += (flower.sustainability_score || 0) * 0.2;
        weights += 0.2;
      }

      // Availability (15% weight)
      score += (flower.current_pricing?.availability_score || 0.5) * 0.15;
      weights += 0.15;

      // Price appropriateness (10% weight if budget specified)
      if (criteria.budget_range) {
        const priceScore = this.calculatePriceScore(flower.current_pricing?.adjusted_price, criteria.budget_range);
        score += priceScore * 0.1;
        weights += 0.1;
      }

      return {
        ...flower,
        composite_score: weights > 0 ? score / weights : score,
        ranking_factors: {
          seasonal: flower.seasonal_score,
          color_match: flower.color_match_score || null,
          sustainability: flower.sustainability_score || null,
          availability: flower.current_pricing?.availability_score || null,
          price_fit: criteria.budget_range ? this.calculatePriceScore(flower.current_pricing?.adjusted_price, criteria.budget_range) : null
        }
      };
    });

    // Sort by composite score
    scored.sort((a, b) => b.composite_score - a.composite_score);

    return {
      flowers: scored.slice(0, criteria.limit || 20),
      search_metadata: {
        total_results: scored.length,
        avg_seasonal_score: scored.reduce((sum, f) => sum + f.seasonal_score, 0) / scored.length,
        avg_sustainability_score: scored.reduce((sum, f) => sum + (f.sustainability_score || 0), 0) / scored.length,
        search_criteria: criteria,
        generated_at: new Date().toISOString()
      }
    };
  }

  private calculatePriceScore(price: number, budget: { min: number; max: number }): number {
    if (!price) return 0.5;
    
    if (price >= budget.min && price <= budget.max) {
      return 1.0; // Perfect fit
    } else if (price < budget.min) {
      return 0.8; // Below budget (good but maybe quality concern)
    } else {
      // Above budget - scale down based on how much over
      const overageRatio = price / budget.max;
      return Math.max(0, 1 - (overageRatio - 1) * 2); // Penalty for being over budget
    }
  }

  private calculatePriceMultiplier(seasonalScore: number): number {
    // Out of season flowers cost more
    if (seasonalScore >= 0.8) return 1.0; // In season, normal price
    if (seasonalScore >= 0.5) return 1.2; // Moderate season, slight premium
    return 1.5; // Out of season, significant premium
  }

  private getSeasonalNotes(flower: any, month: number): string[] {
    const notes = [];
    const seasonality = flower.seasonality || {};
    
    if (seasonality.peak?.includes(month)) {
      notes.push('Peak season - best quality and availability');
    } else if (seasonality.available?.includes(month)) {
      notes.push('Available but not peak season');
    } else if (seasonality.scarce?.includes(month)) {
      notes.push('Out of season - limited availability and higher prices');
    } else {
      notes.push('Seasonal data unavailable');
    }
    
    return notes;
  }

  // AI Color Palette Generation
  async generateColorPalette(baseColors: string[], style: string, season: string, userId?: string): Promise<any> {
    try {
      // Rate limiting
      if (userId) {
        await rateLimit.check(userId, 'color_palette_generation', 10, '1h');
      }

      // Input validation and sanitization
      const validColors = baseColors.filter(color => /^#[0-9A-F]{6}$/i.test(color));
      const validStyle = ['romantic', 'modern', 'rustic', 'classic', 'bohemian'].includes(style) ? style : 'classic';
      const validSeason = ['spring', 'summer', 'fall', 'winter'].includes(season) ? season : 'spring';

      if (validColors.length === 0) {
        throw new Error('At least one valid hex color is required');
      }

      const prompt = this.buildColorPalettePrompt(validColors, validStyle, validSeason);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional wedding color consultant with expertise in color theory, floral design, and seasonal appropriateness. Create sophisticated, harmonious color palettes that work beautifully for weddings. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 800
      });

      const paletteText = response.choices[0]?.message?.content;
      if (!paletteText) {
        throw new Error('No color palette received from AI');
      }

      const aiPalette = JSON.parse(paletteText);

      // Find matching flowers for the generated palette
      const flowerMatches = await this.findMatchingFlowers(aiPalette);
      
      // Analyze seasonal appropriateness
      const seasonalAnalysis = await this.analyzeSeasonalFit(flowerMatches, validSeason);

      // Generate alternatives if seasonal fit is poor
      const alternatives = seasonalAnalysis.overall_fit < 0.6 
        ? await this.generateAlternativePalettes(validColors, validStyle, validSeason)
        : [];

      const result = {
        primary_palette: aiPalette,
        flower_matches: flowerMatches,
        seasonal_analysis: seasonalAnalysis,
        alternatives: alternatives,
        generated_at: new Date().toISOString()
      };

      // Audit logging
      if (userId) {
        await auditLogger.log('color_palette_generation', {
          userId: this.hashUserId(userId),
          baseColors: validColors,
          style: validStyle,
          season: validSeason,
          seasonalFit: seasonalAnalysis.overall_fit,
          timestamp: new Date().toISOString()
        });
      }

      return result;

    } catch (error) {
      console.error('Color palette generation failed:', error);
      throw new Error(`Failed to generate color palette: ${error.message}`);
    }
  }

  private buildColorPalettePrompt(colors: string[], style: string, season: string): string {
    return `Create a sophisticated wedding color palette based on these requirements:

Base Colors: ${colors.join(', ')}
Wedding Style: ${style}
Season: ${season}

Generate a complete color palette including:

1. PRIMARY COLORS (2-3 colors):
   - Main wedding colors that will be most prominent
   - Should include or build upon the provided base colors

2. ACCENT COLORS (2-3 colors):
   - Supporting colors that complement the primary palette
   - Can be bolder or more dramatic for visual interest

3. NEUTRAL COLORS (1-2 colors):
   - Balancing colors like creams, whites, or soft grays
   - Should ground the palette and provide rest for the eye

Consider these ${season} seasonal characteristics:
- Spring: Fresh, light, renewal themes
- Summer: Vibrant, bold, sun-soaked themes  
- Fall: Warm, rich, harvest themes
- Winter: Cool, elegant, cozy themes

For ${style} style weddings, consider:
- Romantic: Soft, flowing, dreamy colors
- Modern: Clean, bold, contemporary colors
- Rustic: Earthy, natural, organic colors
- Classic: Timeless, sophisticated, traditional colors
- Bohemian: Rich, eclectic, artistic colors

Return as JSON with this exact structure:
{
  "primary_colors": [{"hex": "#hexcode", "name": "Color Name", "description": "Why this color works"}],
  "accent_colors": [{"hex": "#hexcode", "name": "Color Name", "description": "Role in palette"}],
  "neutral_colors": [{"hex": "#hexcode", "name": "Color Name", "description": "Balancing purpose"}],
  "palette_name": "Descriptive palette name",
  "style_reasoning": "Why this palette suits the style",
  "seasonal_appropriateness": "How it fits the season"
}`;
  }

  private async findMatchingFlowers(palette: any): Promise<any[]> {
    const allColors = [
      ...(palette.primary_colors || []),
      ...(palette.accent_colors || []),
      ...(palette.neutral_colors || [])
    ];

    const flowerMatches = [];

    for (const color of allColors) {
      try {
        // Find flowers that match this specific color
        const { data: matchingFlowers, error } = await supabase
          .from('flower_color_matches')
          .select(`
            *,
            flower_varieties (
              id,
              common_name,
              scientific_name,
              seasonality,
              sustainability_score,
              wedding_uses,
              allergen_info
            )
          `)
          .gte('match_accuracy', 0.6);

        if (error) throw error;

        // Calculate similarity scores for this specific color
        const scoredMatches = (matchingFlowers || [])
          .map(match => ({
            ...match,
            color_similarity: this.calculateColorSimilarity(color.hex, match.color_hex),
            flower: match.flower_varieties
          }))
          .filter(match => match.color_similarity > 0.5)
          .sort((a, b) => b.color_similarity - a.color_similarity)
          .slice(0, 5);

        flowerMatches.push({
          target_color: color,
          matching_flowers: scoredMatches,
          match_count: scoredMatches.length
        });

      } catch (error) {
        console.error(`Error finding flowers for color ${color.hex}:`, error);
        flowerMatches.push({
          target_color: color,
          matching_flowers: [],
          match_count: 0,
          error: error.message
        });
      }
    }

    return flowerMatches;
  }

  private async analyzeSeasonalFit(flowerMatches: any[], season: string): Promise<any> {
    const seasonNum = this.getSeasonMonths(season);
    let totalFlowers = 0;
    let seasonallyAppropriate = 0;
    let wellMatched = 0;

    for (const colorMatch of flowerMatches) {
      for (const flower of colorMatch.matching_flowers) {
        totalFlowers++;
        
        if (flower.color_similarity > 0.7) {
          wellMatched++;
        }

        // Check if flower is in season
        const flowerSeasonality = flower.flower?.seasonality || {};
        const isInSeason = seasonNum.some(month => 
          flowerSeasonality.peak?.includes(month) || 
          flowerSeasonality.available?.includes(month)
        );

        if (isInSeason) {
          seasonallyAppropriate++;
        }
      }
    }

    const seasonalFitScore = totalFlowers > 0 ? seasonallyAppropriate / totalFlowers : 0;
    const colorMatchScore = totalFlowers > 0 ? wellMatched / totalFlowers : 0;
    const overallFit = (seasonalFitScore + colorMatchScore) / 2;

    return {
      overall_fit: overallFit,
      seasonal_fit_score: seasonalFitScore,
      color_match_score: colorMatchScore,
      total_flowers_analyzed: totalFlowers,
      seasonally_appropriate_count: seasonallyAppropriate,
      well_matched_count: wellMatched,
      recommendations: this.generateSeasonalRecommendations(overallFit, seasonalFitScore, colorMatchScore),
      season_analyzed: season
    };
  }

  private getSeasonMonths(season: string): number[] {
    switch (season.toLowerCase()) {
      case 'spring': return [3, 4, 5];
      case 'summer': return [6, 7, 8];
      case 'fall': case 'autumn': return [9, 10, 11];
      case 'winter': return [12, 1, 2];
      default: return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
  }

  private generateSeasonalRecommendations(overallFit: number, seasonalFit: number, colorFit: number): string[] {
    const recommendations = [];

    if (overallFit >= 0.8) {
      recommendations.push('Excellent palette - great flower availability and color matches');
    } else if (overallFit >= 0.6) {
      recommendations.push('Good palette with minor adjustments possible');
    } else {
      recommendations.push('Consider palette modifications for better flower availability');
    }

    if (seasonalFit < 0.5) {
      recommendations.push('Many flowers in this palette may be out of season - expect higher costs');
      recommendations.push('Consider seasonal alternatives or adjust wedding date for optimal flower availability');
    }

    if (colorFit < 0.6) {
      recommendations.push('Some colors may be difficult to match perfectly in flowers');
      recommendations.push('Consider silk flowers or dyed options for exact color matching');
    }

    return recommendations;
  }

  private async generateAlternativePalettes(baseColors: string[], style: string, season: string): Promise<any[]> {
    const alternatives = [];

    for (let i = 0; i < 3; i++) {
      try {
        const altPrompt = `Create an alternative wedding color palette (variation ${i + 1}) that improves on the seasonal flower availability:

Base Colors: ${baseColors.join(', ')}
Style: ${style}
Season: ${season}

Focus on colors that are easier to achieve with ${season} flowers while maintaining the overall aesthetic. Make this palette distinctly different from previous variations while staying true to the style and base colors.

Use the same JSON structure as before.`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'Create alternative wedding color palettes optimized for seasonal flower availability.'
            },
            {
              role: 'user',
              content: altPrompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 600
        });

        const altPaletteText = response.choices[0]?.message?.content;
        if (altPaletteText) {
          const altPalette = JSON.parse(altPaletteText);
          const altFlowerMatches = await this.findMatchingFlowers(altPalette);
          const altSeasonalAnalysis = await this.analyzeSeasonalFit(altFlowerMatches, season);

          alternatives.push({
            palette: altPalette,
            flower_matches: altFlowerMatches,
            seasonal_analysis: altSeasonalAnalysis,
            variation_number: i + 1
          });
        }

      } catch (error) {
        console.error(`Error generating alternative palette ${i + 1}:`, error);
      }
    }

    return alternatives;
  }

  // Utility methods for security and logging
  private sanitizePromptInput(input: any): string {
    const dangerous = [
      'ignore previous instructions',
      'system:',
      'assistant:',
      'user:',
      '\\n\\nHuman:',
      '\\n\\nAssistant:',
      '<|im_start|>',
      '<|im_end|>',
      'OVERRIDE SECURITY'
    ];
    
    let sanitized = JSON.stringify(input);
    dangerous.forEach(phrase => {
      sanitized = sanitized.replace(new RegExp(phrase, 'gi'), '[FILTERED]');
    });
    
    return sanitized.slice(0, 2000);
  }

  private hashUserId(userId: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16);
  }

  private sanitizeForLogging(data: any): any {
    // Remove sensitive information for GDPR compliance
    const sanitized = { ...data };
    delete sanitized.userId;
    delete sanitized.personalInfo;
    return sanitized;
  }

  // Sustainability Analysis
  async analyzeSustainability(flowerSelections: Array<{flower_id: string, quantity: number}>, weddingLocation: {lat: number, lng: number, region: string}, userId?: string): Promise<any> {
    try {
      if (userId) {
        await rateLimit.check(userId, 'sustainability_analysis', 20, '1h');
      }

      let totalCarbonFootprint = 0;
      let totalCost = 0;
      let localFlowerCount = 0;
      let seasonalFlowerCount = 0;
      let organicFlowerCount = 0;
      const detailedBreakdown = [];

      for (const selection of flowerSelections) {
        // Get flower data with sustainability info
        const { data: flower, error } = await supabase
          .from('flower_varieties')
          .select(`
            *,
            flower_sustainability_data(*),
            flower_pricing(*)
          `)
          .eq('id', selection.flower_id)
          .single();

        if (error || !flower) continue;

        const sustainabilityData = flower.flower_sustainability_data?.[0];
        const pricingData = flower.flower_pricing?.[0];

        const carbonPerStem = sustainabilityData?.carbon_footprint_per_stem || 0.5; // Default estimate
        const selectionCarbon = carbonPerStem * selection.quantity;
        totalCarbonFootprint += selectionCarbon;

        const costPerStem = pricingData?.base_price_per_stem || 2.5;
        totalCost += costPerStem * selection.quantity;

        // Check if local (within 100km)
        const isLocal = sustainabilityData?.average_transport_distance_km <= 100;
        if (isLocal) localFlowerCount += selection.quantity;

        // Check if organic
        const isOrganic = sustainabilityData?.certifications?.includes('organic') || false;
        if (isOrganic) organicFlowerCount += selection.quantity;

        detailedBreakdown.push({
          flower: {
            id: flower.id,
            common_name: flower.common_name,
            scientific_name: flower.scientific_name
          },
          quantity: selection.quantity,
          sustainability_score: flower.sustainability_score || 0.5,
          carbon_footprint: selectionCarbon,
          distance_km: sustainabilityData?.average_transport_distance_km || 500,
          is_local: isLocal,
          is_organic: isOrganic,
          certifications: sustainabilityData?.certifications || [],
          issues: this.identifySustainabilityIssues(flower, sustainabilityData)
        });
      }

      const totalQuantity = flowerSelections.reduce((sum, s) => sum + s.quantity, 0);
      const localPercentage = totalQuantity > 0 ? (localFlowerCount / totalQuantity) * 100 : 0;
      const organicPercentage = totalQuantity > 0 ? (organicFlowerCount / totalQuantity) * 100 : 0;

      const overallScore = this.calculateOverallSustainabilityScore(
        localPercentage,
        organicPercentage,
        totalCarbonFootprint / totalQuantity
      );

      const recommendations = await this.generateSustainabilityRecommendations(detailedBreakdown);

      const result = {
        analysis: {
          overall_score: overallScore,
          total_carbon_footprint: totalCarbonFootprint,
          local_percentage: localPercentage,
          seasonal_percentage: 75, // TODO: Calculate based on wedding date
          certifications: {
            organic: organicPercentage,
            fair_trade: 0, // TODO: Calculate from data
            carbon_neutral: 0 // TODO: Calculate from data
          },
          detailed_breakdown: detailedBreakdown,
          recommendations
        }
      };

      // Audit logging
      if (userId) {
        await auditLogger.log('sustainability_analysis', {
          userId: this.hashUserId(userId),
          totalFlowers: totalQuantity,
          totalCarbonFootprint,
          overallScore,
          timestamp: new Date().toISOString()
        });
      }

      return { success: true, ...result };

    } catch (error) {
      console.error('Sustainability analysis failed:', error);
      throw new Error(`Failed to analyze sustainability: ${error.message}`);
    }
  }

  private identifySustainabilityIssues(flower: any, sustainabilityData: any): string[] {
    const issues = [];

    if ((sustainabilityData?.carbon_footprint_per_stem || 0.5) > 1.0) {
      issues.push('High carbon footprint');
    }

    if ((sustainabilityData?.average_transport_distance_km || 500) > 1000) {
      issues.push('Long transportation distance');
    }

    if ((sustainabilityData?.pesticide_usage_score || 0.5) > 0.7) {
      issues.push('High pesticide usage');
    }

    if ((sustainabilityData?.labor_conditions_score || 0.8) < 0.5) {
      issues.push('Poor labor conditions');
    }

    return issues;
  }

  private calculateOverallSustainabilityScore(localPercentage: number, organicPercentage: number, avgCarbonPerStem: number): number {
    // Weighted scoring: local 40%, organic 30%, carbon footprint 30%
    const localScore = localPercentage / 100;
    const organicScore = organicPercentage / 100;
    const carbonScore = Math.max(0, 1 - (avgCarbonPerStem / 2.0)); // 2.0 kg is very high

    return (localScore * 0.4) + (organicScore * 0.3) + (carbonScore * 0.3);
  }

  private async generateSustainabilityRecommendations(breakdown: any[]): Promise<any[]> {
    const recommendations = [];

    // Identify high-impact flowers
    const highCarbonFlowers = breakdown
      .filter(item => item.carbon_footprint / item.quantity > 1.0)
      .sort((a, b) => (b.carbon_footprint / b.quantity) - (a.carbon_footprint / a.quantity));

    if (highCarbonFlowers.length > 0) {
      // Find local alternatives for high-carbon flowers
      for (const highCarbonItem of highCarbonFlowers.slice(0, 3)) {
        const { data: alternatives } = await supabase
          .from('flower_varieties')
          .select(`
            *,
            flower_sustainability_data!inner(*)
          `)
          .filter('flower_sustainability_data.average_transport_distance_km', 'lt', 200)
          .filter('wedding_uses', 'cs', highCarbonItem.flower.wedding_uses)
          .limit(3);

        if (alternatives && alternatives.length > 0) {
          recommendations.push({
            type: 'substitution',
            description: `Replace ${highCarbonItem.flower.common_name} with local alternatives like ${alternatives[0].common_name}`,
            impact: {
              carbon_reduction: (highCarbonItem.carbon_footprint / highCarbonItem.quantity) * 0.6,
              cost_change: -0.15, // Usually 15% savings
              sustainability_improvement: 0.3
            },
            alternatives: alternatives.slice(0, 2)
          });
        }
      }
    }

    // General recommendations
    const nonLocalCount = breakdown.filter(item => !item.is_local).length;
    if (nonLocalCount > breakdown.length * 0.5) {
      recommendations.push({
        type: 'timing_adjustment',
        description: 'Consider adjusting wedding date to seasonal peak for more local flower availability',
        impact: {
          carbon_reduction: 0.4,
          cost_change: -0.25,
          sustainability_improvement: 0.4
        }
      });
    }

    return recommendations;
  }
}
```

### API Route Implementation

#### 2. Flower Search API Route
```typescript
// File: /src/app/api/florist/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSecureValidation } from '@/lib/security/withSecureValidation';
import { FloristIntelligenceService } from '@/lib/florist/florist-intelligence-service';
import { getUserFromRequest } from '@/lib/auth/server-auth';
import { z } from 'zod';

const FlowerSearchSchema = z.object({
  colors: z.array(z.string().regex(/^#[0-9A-F]{6}$/i)).optional(),
  wedding_date: z.string().datetime().optional(),
  style: z.enum(['romantic', 'modern', 'rustic', 'classic', 'bohemian']).optional(),
  season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
  budget_range: z.object({
    min: z.number().min(0).max(100),
    max: z.number().min(0).max(100)
  }).optional(),
  exclude_allergens: z.array(z.enum(['pollen', 'fragrance', 'contact'])).optional(),
  sustainability_minimum: z.number().min(0).max(1).optional(),
  wedding_uses: z.array(z.string()).optional(),
  region: z.string().max(50).optional(),
  limit: z.number().min(1).max(100).default(20)
});

export const POST = withSecureValidation(
  FlowerSearchSchema,
  async (validatedData, request: NextRequest) => {
    try {
      const user = await getUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Convert wedding_date string to Date if provided
      const searchCriteria = {
        ...validatedData,
        wedding_date: validatedData.wedding_date ? new Date(validatedData.wedding_date) : undefined
      };

      const floristService = new FloristIntelligenceService();
      const results = await floristService.searchFlowersWithIntelligence(searchCriteria, user.id);

      return NextResponse.json({
        success: true,
        ...results
      });

    } catch (error) {
      console.error('Flower search API error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message || 'Internal server error',
          code: 'FLOWER_SEARCH_FAILED'
        }, 
        { status: 500 }
      );
    }
  }
);

// GET method for simple searches
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const colors = searchParams.get('colors')?.split(',') || undefined;
    const season = searchParams.get('season') || undefined;
    const style = searchParams.get('style') || undefined;

    const floristService = new FloristIntelligenceService();
    const results = await floristService.searchFlowersWithIntelligence({
      colors,
      season: season as any,
      style: style as any,
      limit: 20
    }, user.id);

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Flower search GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error'
      }, 
      { status: 500 }
    );
  }
}
```

#### 3. Color Palette Generation API Route
```typescript
// File: /src/app/api/florist/palette/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSecureValidation } from '@/lib/security/withSecureValidation';
import { FloristIntelligenceService } from '@/lib/florist/florist-intelligence-service';
import { getUserFromRequest } from '@/lib/auth/server-auth';
import { z } from 'zod';

const ColorPaletteGenerationSchema = z.object({
  baseColors: z.array(z.string().regex(/^#[0-9A-F]{6}$/i)).min(1).max(3),
  style: z.enum(['romantic', 'modern', 'rustic', 'classic', 'bohemian', 'minimalist']),
  season: z.enum(['spring', 'summer', 'fall', 'winter']),
  preferences: z.object({
    include_neutrals: z.boolean().default(true),
    accent_count: z.number().min(1).max(5).default(2),
    harmony_type: z.enum(['complementary', 'analogous', 'triadic', 'monochromatic']).optional()
  }).optional()
});

export const POST = withSecureValidation(
  ColorPaletteGenerationSchema,
  async (validatedData, request: NextRequest) => {
    try {
      const user = await getUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const floristService = new FloristIntelligenceService();
      const palette = await floristService.generateColorPalette(
        validatedData.baseColors,
        validatedData.style,
        validatedData.season,
        user.id
      );

      return NextResponse.json({
        success: true,
        ...palette
      });

    } catch (error) {
      console.error('Color palette generation API error:', error);
      
      // Handle specific error types
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED'
          }, 
          { status: 429 }
        );
      }

      if (error.message.includes('OpenAI')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'AI service temporarily unavailable. Please try again.',
            code: 'AI_SERVICE_UNAVAILABLE'
          }, 
          { status: 503 }
        );
      }

      return NextResponse.json(
        { 
          success: false, 
          error: error.message || 'Internal server error',
          code: 'PALETTE_GENERATION_FAILED'
        }, 
        { status: 500 }
      );
    }
  }
);
```

#### 4. Sustainability Analysis API Route
```typescript
// File: /src/app/api/florist/sustainability/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSecureValidation } from '@/lib/security/withSecureValidation';
import { FloristIntelligenceService } from '@/lib/florist/florist-intelligence-service';
import { getUserFromRequest } from '@/lib/auth/server-auth';
import { z } from 'zod';

const SustainabilityAnalysisSchema = z.object({
  flower_selections: z.array(z.object({
    flower_id: z.string().uuid(),
    quantity: z.number().min(1).max(1000)
  })).min(1),
  wedding_location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    region: z.string().max(100)
  }),
  wedding_date: z.string().datetime().optional(),
  include_alternatives: z.boolean().default(true)
});

export const POST = withSecureValidation(
  SustainabilityAnalysisSchema,
  async (validatedData, request: NextRequest) => {
    try {
      const user = await getUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const floristService = new FloristIntelligenceService();
      const analysis = await floristService.analyzeSustainability(
        validatedData.flower_selections,
        validatedData.wedding_location,
        user.id
      );

      return NextResponse.json(analysis);

    } catch (error) {
      console.error('Sustainability analysis API error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message || 'Internal server error',
          code: 'SUSTAINABILITY_ANALYSIS_FAILED'
        }, 
        { status: 500 }
      );
    }
  }
);
```

### DELIVERABLES CHECKLIST
- [ ] Complete database migration with all 8 florist intelligence tables
- [ ] FloristIntelligenceService with AI-powered flower search and color palette generation
- [ ] Secure API routes: /api/florist/search, /api/florist/palette/generate, /api/florist/sustainability/analyze
- [ ] Row Level Security policies for all florist tables
- [ ] OpenAI integration with prompt injection protection and rate limiting
- [ ] Color similarity algorithms using LAB color space for accurate matching
- [ ] Sustainability analysis with carbon footprint calculation and local sourcing recommendations
- [ ] Comprehensive audit logging for GDPR compliance
- [ ] Input validation and sanitization for all endpoints
- [ ] Error handling with appropriate HTTP status codes and error messages
- [ ] Rate limiting: 100 searches/hour, 10 palette generations/hour per user
- [ ] TypeScript compilation with 0 errors (npm run typecheck)
- [ ] Database performance optimization with proper indexing

### URGENT COMPLETION CRITERIA
**This task is INCOMPLETE until:**
1. Database migration successfully creates all florist intelligence tables with RLS policies
2. All API endpoints respond correctly (POST /api/florist/search returns flower results)
3. OpenAI integration generates valid JSON color palettes
4. Color similarity calculations work accurately (LAB color space conversion)
5. Sustainability analysis calculates carbon footprint and provides recommendations
6. All security validations pass (withSecureValidation middleware used correctly)
7. TypeScript compilation succeeds without errors
8. Evidence of reality provided (curl API tests, database queries, migration success)