# WS-254 Team B: Catering Dietary Management - Backend Implementation

## EVIDENCE OF REALITY REQUIREMENTS

**CRITICAL**: Before marking this task complete, you MUST provide:

1. **Database Migration Applied**:
   ```bash
   supabase migration up --linked 2>&1 | grep -E "(applied|error|dietary)"
   ```

2. **API Endpoint Testing**:
   ```bash
   curl -X POST http://localhost:3000/api/catering/menu/generate -H "Authorization: Bearer test" -d '{"test":"data"}' 2>&1
   ```

3. **TypeScript Compilation**:
   ```bash
   npm run type-check 2>&1 | grep -E "(dietary|error|success)"
   ```

4. **Service Class Tests**:
   ```bash
   npm test -- --testPathPattern="dietary" --coverage 2>&1
   ```

5. **Database Query Performance**:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM guest_dietary_requirements WHERE wedding_id = 'test';
   ```

6. **OpenAI Integration Test**:
   - Screenshot of successful AI menu generation
   - API response logs showing OpenAI interaction
   - Cost tracking and rate limiting evidence

## SECURITY VALIDATION REQUIREMENTS

All API routes MUST implement the withSecureValidation middleware:

```typescript
import { withSecureValidation } from '@/lib/security/withSecureValidation'

export async function POST(request: Request) {
  return withSecureValidation(request, async ({ body, user }) => {
    // Your secure endpoint logic here
    // user object is guaranteed to be authenticated
    // body is validated and sanitized
  })
}
```

## NAVIGATION INTEGRATION REQUIREMENTS

Backend services must support navigation context:

```typescript
// Track user navigation patterns for analytics
interface NavigationContext {
  currentPath: string
  previousPath?: string
  userAgent: string
  sessionId: string
}

// Include in audit logs
const auditLog = {
  userId: user.id,
  action: 'menu_generated',
  context: navigationContext,
  timestamp: new Date()
}
```

## DATABASE SCHEMA IMPLEMENTATION

### 1. Apply Comprehensive Migration

```sql
-- File: supabase/migrations/[timestamp]_dietary_management_system.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Dietary restriction categories and definitions
CREATE TABLE dietary_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_type TEXT NOT NULL CHECK (category_type IN ('allergy', 'diet', 'medical', 'preference')),
  name TEXT NOT NULL UNIQUE,
  severity_level INTEGER CHECK (severity_level >= 1 AND severity_level <= 5),
  description TEXT,
  common_triggers TEXT[] DEFAULT '{}',
  cross_contamination_risk BOOLEAN DEFAULT false,
  regulatory_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_category_name CHECK (length(name) >= 2 AND length(name) <= 100)
);

-- Guest dietary requirements with enhanced tracking
CREATE TABLE guest_dietary_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL CHECK (length(guest_name) >= 2),
  guest_email TEXT,
  dietary_category_id UUID NOT NULL REFERENCES dietary_categories(id),
  severity_level INTEGER DEFAULT 3 CHECK (severity_level >= 1 AND severity_level <= 5),
  specific_notes TEXT CHECK (length(specific_notes) <= 1000),
  emergency_contact TEXT,
  emergency_phone TEXT,
  medical_documentation_url TEXT,
  verified_by_guest BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verification_method TEXT, -- 'email', 'sms', 'in_person'
  supplier_notes TEXT,
  prep_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  
  CONSTRAINT valid_emergency_contact CHECK (
    (severity_level >= 4 AND emergency_contact IS NOT NULL) OR severity_level < 4
  ),
  CONSTRAINT valid_email CHECK (guest_email IS NULL OR guest_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Comprehensive ingredient database
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (length(name) >= 2),
  category TEXT NOT NULL, -- 'protein', 'vegetable', 'grain', 'dairy', 'spice', 'condiment'
  allergen_categories TEXT[] DEFAULT '{}',
  dietary_restrictions TEXT[] DEFAULT '{}', -- Which diets this violates
  substitutes JSONB DEFAULT '{}', -- Alternative ingredients by restriction type
  nutritional_info JSONB DEFAULT '{}', -- Calories, macros, etc.
  cost_per_unit DECIMAL(10,4) CHECK (cost_per_unit >= 0),
  unit_type TEXT NOT NULL, -- 'kg', 'liter', 'piece', 'cup', 'tbsp'
  shelf_life_days INTEGER CHECK (shelf_life_days > 0),
  storage_requirements TEXT,
  supplier_info JSONB DEFAULT '{}',
  seasonal_availability TEXT[] DEFAULT '{}', -- Months when optimal
  origin_country TEXT,
  organic BOOLEAN DEFAULT false,
  kosher BOOLEAN DEFAULT false,
  halal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items with enhanced recipe management
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 3),
  category TEXT NOT NULL CHECK (category IN ('appetizer', 'main', 'dessert', 'side', 'beverage')),
  description TEXT CHECK (length(description) <= 2000),
  cuisine_type TEXT, -- 'italian', 'asian', 'american', etc.
  ingredients JSONB NOT NULL DEFAULT '[]', -- Array of {ingredient_id, quantity, unit, prep_notes}
  allergen_warnings TEXT[] DEFAULT '{}',
  dietary_tags TEXT[] DEFAULT '{}', -- 'vegan', 'gluten-free', 'kosher', etc.
  preparation_instructions TEXT,
  preparation_time_minutes INTEGER CHECK (preparation_time_minutes > 0),
  cooking_method TEXT,
  serving_size INTEGER DEFAULT 1 CHECK (serving_size > 0),
  servings_per_recipe INTEGER DEFAULT 1 CHECK (servings_per_recipe > 0),
  base_cost_per_serving DECIMAL(10,2) CHECK (base_cost_per_serving >= 0),
  labor_cost_per_serving DECIMAL(10,2) DEFAULT 0 CHECK (labor_cost_per_serving >= 0),
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  equipment_needed TEXT[] DEFAULT '{}',
  seasonal_availability TEXT[] DEFAULT '{}',
  nutritional_info JSONB DEFAULT '{}',
  photo_url TEXT,
  recipe_notes TEXT,
  chef_rating DECIMAL(3,2) CHECK (chef_rating >= 0 AND chef_rating <= 5),
  popularity_score INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated wedding menus with comprehensive tracking
CREATE TABLE wedding_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  menu_name TEXT NOT NULL CHECK (length(menu_name) >= 3),
  menu_description TEXT,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  final_guest_count INTEGER, -- Updated closer to event
  dietary_requirements_summary JSONB NOT NULL DEFAULT '{}',
  menu_structure JSONB NOT NULL DEFAULT '{}', -- Course structure with menu_item_ids
  menu_style TEXT NOT NULL, -- 'formal', 'buffet', 'family-style', 'cocktail'
  meal_type TEXT NOT NULL, -- 'lunch', 'dinner', 'brunch', 'cocktail'
  cultural_preferences TEXT[] DEFAULT '{}',
  seasonal_preferences TEXT[] DEFAULT '{}',
  budget_per_person DECIMAL(10,2) CHECK (budget_per_person > 0),
  total_cost DECIMAL(12,2),
  cost_per_person DECIMAL(10,2),
  dietary_compliance_score DECIMAL(3,2) CHECK (dietary_compliance_score >= 0 AND dietary_compliance_score <= 1),
  allergen_warnings JSONB DEFAULT '{}',
  cross_contamination_protocols JSONB DEFAULT '{}',
  preparation_timeline JSONB DEFAULT '{}',
  shopping_list JSONB DEFAULT '{}',
  equipment_checklist TEXT[] DEFAULT '{}',
  staff_requirements JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'proposed', 'approved', 'in_preparation', 'served', 'cancelled')),
  generated_by_ai BOOLEAN DEFAULT false,
  ai_model_used TEXT,
  ai_confidence_score DECIMAL(3,2),
  ai_generation_params JSONB DEFAULT '{}',
  client_feedback TEXT,
  client_rating DECIMAL(3,2) CHECK (client_rating >= 0 AND client_rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dietary conflict analysis and resolution
CREATE TABLE dietary_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES wedding_menus(id) ON DELETE CASCADE,
  guest_requirement_id UUID NOT NULL REFERENCES guest_dietary_requirements(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('allergen', 'dietary', 'religious', 'medical', 'preference')),
  severity_level INTEGER NOT NULL CHECK (severity_level >= 1 AND severity_level <= 5),
  ingredient_trigger TEXT NOT NULL,
  conflict_description TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  suggested_alternatives JSONB DEFAULT '[]',
  resolution_status TEXT DEFAULT 'unresolved' CHECK (resolution_status IN ('unresolved', 'alternative_suggested', 'resolved', 'accepted_risk')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detailed portion calculations and cost analysis
CREATE TABLE portion_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES wedding_menus(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  base_servings INTEGER NOT NULL CHECK (base_servings > 0),
  waste_buffer_percent DECIMAL(5,2) DEFAULT 10.00 CHECK (waste_buffer_percent >= 0 AND waste_buffer_percent <= 50),
  dietary_buffer_percent DECIMAL(5,2) DEFAULT 5.00, -- Extra for dietary alternatives
  total_portions_needed INTEGER NOT NULL CHECK (total_portions_needed > 0),
  ingredient_breakdown JSONB NOT NULL DEFAULT '{}', -- Detailed ingredient quantities and costs
  total_ingredient_cost DECIMAL(12,2) NOT NULL CHECK (total_ingredient_cost >= 0),
  labor_cost_estimate DECIMAL(12,2) DEFAULT 0 CHECK (labor_cost_estimate >= 0),
  equipment_costs DECIMAL(12,2) DEFAULT 0 CHECK (equipment_costs >= 0),
  packaging_costs DECIMAL(12,2) DEFAULT 0 CHECK (packaging_costs >= 0),
  total_item_cost DECIMAL(12,2) GENERATED ALWAYS AS (
    total_ingredient_cost + labor_cost_estimate + equipment_costs + packaging_costs
  ) STORED,
  cost_per_portion DECIMAL(10,4) GENERATED ALWAYS AS (
    CASE WHEN total_portions_needed > 0 THEN total_item_cost / total_portions_needed ELSE 0 END
  ) STORED,
  prep_time_hours DECIMAL(5,2) CHECK (prep_time_hours >= 0),
  cook_time_hours DECIMAL(5,2) CHECK (cook_time_hours >= 0),
  equipment_requirements TEXT[] DEFAULT '{}',
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI analysis cache for performance optimization
CREATE TABLE dietary_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('menu_generation', 'conflict_detection', 'substitution', 'allergen_analysis', 'cost_optimization')),
  input_hash TEXT NOT NULL, -- SHA-256 hash of input parameters
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  input_parameters JSONB NOT NULL DEFAULT '{}',
  ai_response JSONB NOT NULL DEFAULT '{}',
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  processing_time_ms INTEGER CHECK (processing_time_ms > 0),
  model_used TEXT NOT NULL,
  api_cost DECIMAL(10,6) DEFAULT 0 CHECK (api_cost >= 0),
  tokens_used INTEGER DEFAULT 0 CHECK (tokens_used >= 0),
  cache_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  usage_count INTEGER DEFAULT 1 CHECK (usage_count > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_analysis_cache UNIQUE(analysis_type, input_hash)
);

-- Audit log for dietary management actions
CREATE TABLE dietary_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  wedding_id UUID REFERENCES weddings(id),
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'requirement', 'menu', 'conflict', etc.
  entity_id UUID NOT NULL,
  old_values JSONB DEFAULT '{}',
  new_values JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_guest_dietary_wedding ON guest_dietary_requirements(wedding_id);
CREATE INDEX idx_guest_dietary_category ON guest_dietary_requirements(dietary_category_id);
CREATE INDEX idx_guest_dietary_severity ON guest_dietary_requirements(severity_level DESC);
CREATE INDEX idx_guest_dietary_verified ON guest_dietary_requirements(verified_by_guest, wedding_id);

CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_allergens ON ingredients USING GIN (allergen_categories);
CREATE INDEX idx_ingredients_dietary_restrictions ON ingredients USING GIN (dietary_restrictions);
CREATE INDEX idx_ingredients_cost ON ingredients(cost_per_unit) WHERE cost_per_unit IS NOT NULL;

CREATE INDEX idx_menu_items_supplier ON menu_items(supplier_id);
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_allergens ON menu_items USING GIN (allergen_warnings);
CREATE INDEX idx_menu_items_dietary_tags ON menu_items USING GIN (dietary_tags);
CREATE INDEX idx_menu_items_active ON menu_items(active, supplier_id);

CREATE INDEX idx_wedding_menus_wedding ON wedding_menus(wedding_id);
CREATE INDEX idx_wedding_menus_supplier ON wedding_menus(supplier_id);
CREATE INDEX idx_wedding_menus_status ON wedding_menus(status, wedding_id);
CREATE INDEX idx_wedding_menus_compliance ON wedding_menus(dietary_compliance_score DESC);

CREATE INDEX idx_dietary_conflicts_menu ON dietary_conflicts(menu_id);
CREATE INDEX idx_dietary_conflicts_severity ON dietary_conflicts(severity_level DESC);
CREATE INDEX idx_dietary_conflicts_status ON dietary_conflicts(resolution_status, menu_id);
CREATE INDEX idx_dietary_conflicts_guest ON dietary_conflicts(guest_requirement_id);

CREATE INDEX idx_portion_calculations_menu ON portion_calculations(menu_id);
CREATE INDEX idx_portion_calculations_item ON portion_calculations(menu_item_id);

CREATE INDEX idx_ai_analysis_type_hash ON dietary_ai_analysis(analysis_type, input_hash);
CREATE INDEX idx_ai_analysis_wedding ON dietary_ai_analysis(wedding_id, analysis_type);
CREATE INDEX idx_ai_analysis_expires ON dietary_ai_analysis(cache_expires_at);

CREATE INDEX idx_audit_log_user_action ON dietary_audit_log(user_id, action_type);
CREATE INDEX idx_audit_log_wedding ON dietary_audit_log(wedding_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON dietary_audit_log(entity_type, entity_id);

-- Row Level Security policies
ALTER TABLE dietary_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_dietary_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE portion_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_audit_log ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (supplier can only see their own data)
CREATE POLICY "Suppliers can view their wedding dietary requirements" ON guest_dietary_requirements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM weddings w 
      WHERE w.id = wedding_id 
      AND w.supplier_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can manage their menu items" ON menu_items
  FOR ALL USING (supplier_id = auth.uid());

CREATE POLICY "Suppliers can manage their wedding menus" ON wedding_menus
  FOR ALL USING (supplier_id = auth.uid());

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guest_dietary_requirements_updated_at 
  BEFORE UPDATE ON guest_dietary_requirements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at 
  BEFORE UPDATE ON ingredients 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at 
  BEFORE UPDATE ON menu_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wedding_menus_updated_at 
  BEFORE UPDATE ON wedding_menus 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default dietary categories
INSERT INTO dietary_categories (category_type, name, severity_level, description, common_triggers, cross_contamination_risk) VALUES
('allergy', 'Nuts', 5, 'Tree nuts and peanuts', ARRAY['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia', 'peanut'], true),
('allergy', 'Shellfish', 5, 'Crustaceans and mollusks', ARRAY['shrimp', 'lobster', 'crab', 'scallop', 'mussel', 'clam', 'oyster'], true),
('allergy', 'Fish', 4, 'All fish varieties', ARRAY['salmon', 'tuna', 'cod', 'halibut', 'anchovies'], false),
('allergy', 'Dairy', 3, 'Milk and dairy products', ARRAY['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein'], false),
('allergy', 'Eggs', 3, 'Chicken eggs', ARRAY['egg', 'mayonnaise', 'meringue', 'custard', 'hollandaise'], false),
('allergy', 'Soy', 2, 'Soybean products', ARRAY['soy', 'tofu', 'tempeh', 'miso', 'soy sauce', 'edamame'], false),
('allergy', 'Gluten', 4, 'Wheat, barley, rye', ARRAY['wheat', 'barley', 'rye', 'oats', 'bread', 'pasta', 'flour'], true),
('allergy', 'Sesame', 3, 'Sesame seeds and oil', ARRAY['sesame', 'tahini', 'hummus'], false),
('diet', 'Vegan', 3, 'No animal products', ARRAY['meat', 'dairy', 'eggs', 'honey', 'gelatin'], false),
('diet', 'Vegetarian', 2, 'No meat or fish', ARRAY['meat', 'poultry', 'fish', 'gelatin'], false),
('diet', 'Kosher', 4, 'Jewish dietary laws', ARRAY['pork', 'shellfish', 'meat+dairy'], true),
('diet', 'Halal', 4, 'Islamic dietary laws', ARRAY['pork', 'alcohol', 'non-halal meat'], true),
('diet', 'Keto', 2, 'Low carbohydrate diet', ARRAY['sugar', 'grains', 'starchy vegetables'], false),
('diet', 'Paleo', 2, 'Paleolithic diet', ARRAY['grains', 'dairy', 'legumes', 'processed foods'], false),
('medical', 'Celiac Disease', 5, 'Severe gluten intolerance', ARRAY['wheat', 'barley', 'rye', 'cross-contamination'], true),
('medical', 'Diabetes', 3, 'Blood sugar management', ARRAY['sugar', 'refined carbs', 'high glycemic foods'], false),
('medical', 'High Blood Pressure', 2, 'Low sodium diet', ARRAY['salt', 'processed foods', 'cured meats'], false),
('preference', 'Organic Only', 1, 'Organic ingredients preferred', ARRAY[], false),
('preference', 'Local Sourced', 1, 'Locally sourced ingredients', ARRAY[], false),
('preference', 'No Spicy Food', 1, 'Mild flavors only', ARRAY['chili', 'pepper', 'hot sauce'], false);
```

### 2. Core Service Implementation

```typescript
// File: src/lib/services/DietaryAnalysisService.ts

import { OpenAI } from 'openai'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/security/rate-limit'
import { withErrorHandling } from '@/lib/utils/error-handling'
import crypto from 'crypto'

export class DietaryAnalysisService {
  private openai: OpenAI
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    })
    
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  @withErrorHandling
  async generateCompliantMenu(
    weddingId: string,
    userId: string,
    params: MenuGenerationParams
  ): Promise<MenuGenerationResult> {
    // Rate limiting: 10 generations per hour per user
    await rateLimit.check(userId, 'menu_generation', 10, '1h')
    
    // Validate input parameters
    this.validateMenuParams(params)
    
    // Check cache first
    const cacheKey = this.generateCacheKey('menu_generation', params)
    const cached = await this.getCachedAnalysis('menu_generation', cacheKey)
    
    if (cached && !this.isCacheExpired(cached)) {
      await this.updateCacheUsage(cached.id)
      return this.formatMenuResult(cached.ai_response, cached.id)
    }

    // Fetch dietary requirements and context
    const [requirements, weddingContext, supplierContext] = await Promise.all([
      this.getDietaryRequirements(weddingId),
      this.getWeddingContext(weddingId),
      this.getSupplierContext(userId)
    ])

    // Build AI prompt with context
    const prompt = this.buildMenuGenerationPrompt({
      requirements,
      weddingContext,
      supplierContext,
      ...params
    })

    const startTime = Date.now()
    
    // Generate menu with OpenAI
    const aiResponse = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt('menu_generation')
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000
    })

    const processingTime = Date.now() - startTime
    const apiCost = this.calculateApiCost(aiResponse.usage)
    
    const generatedMenu = JSON.parse(aiResponse.choices[0].message.content || '{}')
    
    // Validate and analyze the generated menu
    const validationResult = await this.validateMenuCompliance(
      generatedMenu,
      requirements,
      params.dietaryRequirements
    )

    // Store menu in database
    const menuId = await this.saveGeneratedMenu(
      weddingId,
      userId,
      generatedMenu,
      validationResult,
      params
    )

    // Cache the result
    await this.cacheAnalysis({
      type: 'menu_generation',
      inputHash: cacheKey,
      weddingId,
      supplierId: userId,
      inputParameters: params,
      aiResponse: { ...generatedMenu, menuId },
      confidenceScore: validationResult.complianceScore,
      processingTime,
      modelUsed: 'gpt-4',
      apiCost,
      tokensUsed: aiResponse.usage?.total_tokens || 0
    })

    return this.formatMenuResult({ ...generatedMenu, menuId }, menuId)
  }

  @withErrorHandling
  async analyzeIngredientAllergens(
    ingredients: string[],
    userId?: string
  ): Promise<AllergenAnalysisResult> {
    if (userId) {
      await rateLimit.check(userId, 'allergen_analysis', 50, '1h')
    }

    const cacheKey = this.generateCacheKey('allergen_analysis', { ingredients })
    const cached = await this.getCachedAnalysis('allergen_analysis', cacheKey)
    
    if (cached && !this.isCacheExpired(cached)) {
      return cached.ai_response as AllergenAnalysisResult
    }

    // Database lookup for known allergens
    const knownAllergens = await this.checkKnownAllergens(ingredients)
    
    // AI analysis for complex or unknown ingredients
    const aiAnalysis = await this.performAIAllergenAnalysis(ingredients)
    
    // Combine results
    const combinedResult = this.combineAllergenAnalysis(knownAllergens, aiAnalysis)
    
    // Cache the result
    await this.cacheAnalysis({
      type: 'allergen_analysis',
      inputHash: cacheKey,
      inputParameters: { ingredients },
      aiResponse: combinedResult,
      confidenceScore: combinedResult.confidence,
      processingTime: Date.now(),
      modelUsed: 'gpt-3.5-turbo'
    })

    return combinedResult
  }

  @withErrorHandling
  async validateMenuCompliance(
    menu: any,
    requirements: DietaryRequirement[],
    additionalRestrictions: any
  ): Promise<MenuValidationResult> {
    const conflicts: DietaryConflict[] = []
    const warnings: string[] = []
    let totalItems = 0
    let compliantItems = 0

    // Analyze each course and dish
    for (const course of menu.courses || []) {
      for (const dish of course.dishes || []) {
        totalItems++
        
        const dishConflicts = await this.analyzeDishConflicts(dish, requirements)
        
        if (dishConflicts.length === 0) {
          compliantItems++
        } else {
          conflicts.push(...dishConflicts)
        }

        // Check cross-contamination risks
        const crossContaminationRisk = await this.assessCrossContaminationRisk(dish)
        if (crossContaminationRisk.level > 0.7) {
          warnings.push(`${dish.name}: ${crossContaminationRisk.reason}`)
        }

        // Check ingredient availability and cost
        const ingredientIssues = await this.checkIngredientAvailability(dish.ingredients)
        warnings.push(...ingredientIssues)
      }
    }

    const complianceScore = totalItems > 0 ? compliantItems / totalItems : 0
    const alternatives = await this.suggestMenuAlternatives(conflicts)

    return {
      isCompliant: conflicts.length === 0,
      complianceScore,
      conflicts,
      warnings,
      alternatives,
      riskAssessment: this.generateRiskAssessment(conflicts, warnings),
      recommendations: this.generateComplianceRecommendations(conflicts, warnings)
    }
  }

  @withErrorHandling
  async calculatePortionsAndCosts(
    menuId: string,
    finalGuestCount: number,
    options: PortionCalculationOptions = {}
  ): Promise<PortionCalculationResult> {
    const {
      wasteBuffer = 0.1,
      dietaryBuffer = 0.05,
      servingStyle = 'plated',
      specialRequests = []
    } = options

    // Fetch menu details
    const { data: menu } = await this.supabase
      .from('wedding_menus')
      .select(`
        *,
        menu_structure,
        dietary_requirements_summary
      `)
      .eq('id', menuId)
      .single()

    if (!menu) throw new Error('Menu not found')

    const adjustedCount = Math.ceil(finalGuestCount * (1 + wasteBuffer + dietaryBuffer))
    const calculations: PortionCalculation[] = []
    let totalCost = 0
    let totalPrepTime = 0

    // Calculate portions for each menu item
    for (const courseId of Object.keys(menu.menu_structure)) {
      const course = menu.menu_structure[courseId]
      
      for (const dishId of course.dishes) {
        const { data: menuItem } = await this.supabase
          .from('menu_items')
          .select('*')
          .eq('id', dishId)
          .single()

        if (menuItem) {
          const calculation = await this.calculateDishPortions(
            menuItem,
            adjustedCount,
            servingStyle,
            specialRequests
          )
          
          calculations.push(calculation)
          totalCost += calculation.totalCost
          totalPrepTime += calculation.prepTimeHours
        }
      }
    }

    // Generate shopping list and timeline
    const shoppingList = await this.generateShoppingList(calculations)
    const prepTimeline = await this.generatePrepTimeline(calculations, finalGuestCount)

    // Save calculations to database
    const calculationId = await this.savePortionCalculations({
      menuId,
      baseServings: finalGuestCount,
      wasteBuffer: wasteBuffer * 100,
      totalPortions: adjustedCount,
      calculations,
      totalCost,
      shoppingList,
      prepTimeline
    })

    return {
      id: calculationId,
      menuId,
      baseGuestCount: finalGuestCount,
      adjustedPortions: adjustedCount,
      wasteBuffer,
      dietaryBuffer,
      calculations,
      totalCost,
      costPerPerson: totalCost / finalGuestCount,
      totalPrepTime,
      shoppingList,
      prepTimeline,
      equipmentNeeded: this.consolidateEquipmentNeeds(calculations),
      staffingRecommendations: this.calculateStaffingNeeds(calculations, finalGuestCount)
    }
  }

  @withErrorHandling
  async suggestIngredientSubstitutions(
    ingredient: string,
    restrictions: string[],
    context: SubstitutionContext = {}
  ): Promise<IngredientSubstitution[]> {
    // Check database for known substitutions
    const knownSubstitutions = await this.getKnownSubstitutions(ingredient, restrictions)
    
    // AI-powered creative substitutions
    const aiSubstitutions = await this.getAISubstitutions(ingredient, restrictions, context)
    
    // Combine and rank by suitability
    const allSubstitutions = [...knownSubstitutions, ...aiSubstitutions]
    
    return this.rankSubstitutions(allSubstitutions, context)
  }

  private async performAIAllergenAnalysis(ingredients: string[]): Promise<AIAllergenAnalysis> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt('allergen_analysis')
        },
        {
          role: 'user',
          content: `Analyze these ingredients for allergens and cross-contamination risks: ${ingredients.join(', ')}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1500
    })

    return JSON.parse(completion.choices[0].message.content || '{}')
  }

  private async analyzeDishConflicts(
    dish: any,
    requirements: DietaryRequirement[]
  ): Promise<DietaryConflict[]> {
    const conflicts: DietaryConflict[] = []

    for (const requirement of requirements) {
      // Check ingredient-level conflicts
      const ingredientConflict = await this.checkIngredientConflicts(
        dish.ingredients,
        requirement
      )

      if (ingredientConflict) {
        conflicts.push({
          id: crypto.randomUUID(),
          guestName: requirement.guestName,
          dishName: dish.name,
          conflictType: requirement.category,
          severityLevel: requirement.severity,
          ingredientTrigger: ingredientConflict.ingredient,
          conflictDescription: ingredientConflict.reason,
          riskLevel: this.assessRiskLevel(requirement.severity, ingredientConflict),
          suggestedAlternatives: await this.suggestDishAlternatives(dish, requirement),
          resolutionStatus: 'unresolved'
        })
      }

      // Check preparation method conflicts (e.g., kosher/halal requirements)
      if (requirement.category === 'diet' && ['kosher', 'halal'].includes(requirement.notes.toLowerCase())) {
        const preparationConflict = this.checkPreparationConflicts(dish, requirement.notes)
        if (preparationConflict) {
          conflicts.push({
            id: crypto.randomUUID(),
            guestName: requirement.guestName,
            dishName: dish.name,
            conflictType: 'preparation',
            severityLevel: requirement.severity,
            ingredientTrigger: 'preparation_method',
            conflictDescription: preparationConflict,
            riskLevel: 'high',
            suggestedAlternatives: [],
            resolutionStatus: 'unresolved'
          })
        }
      }
    }

    return conflicts
  }

  private async checkKnownAllergens(ingredients: string[]): Promise<AllergenAnalysis> {
    const { data: allergenData } = await this.supabase
      .from('dietary_categories')
      .select('name, common_triggers, severity_level, cross_contamination_risk')
      .eq('category_type', 'allergy')

    const detectedAllergens: AllergenDetail[] = []

    for (const ingredient of ingredients) {
      const ingredientLower = ingredient.toLowerCase()
      
      for (const allergen of allergenData || []) {
        for (const trigger of allergen.common_triggers) {
          if (ingredientLower.includes(trigger.toLowerCase())) {
            detectedAllergens.push({
              ingredient,
              allergenType: allergen.name,
              trigger,
              severity: allergen.severity_level,
              crossContaminationRisk: allergen.cross_contamination_risk
            })
          }
        }
      }
    }

    return {
      allergens: [...new Set(detectedAllergens.map(d => d.allergenType))],
      details: detectedAllergens,
      crossContaminationRisk: detectedAllergens.some(d => d.crossContaminationRisk),
      confidence: 0.95 // High confidence for known allergens
    }
  }

  private async getDietaryRequirements(weddingId: string): Promise<DietaryRequirement[]> {
    const { data, error } = await this.supabase
      .from('guest_dietary_requirements')
      .select(`
        *,
        dietary_categories (
          name,
          category_type,
          severity_level,
          common_triggers
        )
      `)
      .eq('wedding_id', weddingId)

    if (error) throw error
    return data || []
  }

  private buildMenuGenerationPrompt(context: MenuGenerationContext): string {
    const { requirements, weddingContext, supplierContext, ...params } = context
    
    return `Generate a wedding menu for ${params.guestCount} guests with the following specifications:

DIETARY REQUIREMENTS:
${this.formatDietaryRequirementsForPrompt(requirements)}

MENU PARAMETERS:
- Style: ${params.menuStyle}
- Meal Type: ${params.mealType}
- Budget per person: $${params.budgetPerPerson}
- Cultural preferences: ${params.culturalRequirements?.join(', ') || 'None'}
- Seasonal preferences: ${params.seasonalPreferences?.join(', ') || 'None'}

WEDDING CONTEXT:
- Date: ${weddingContext.weddingDate}
- Venue type: ${weddingContext.venueType}
- Time of day: ${weddingContext.timeOfDay}

SUPPLIER CAPABILITIES:
- Cuisine specialties: ${supplierContext.specialties?.join(', ') || 'General'}
- Equipment available: ${supplierContext.equipment?.join(', ') || 'Standard kitchen'}
- Serving capacity: ${supplierContext.maxCapacity || 'Not specified'}

REQUIREMENTS:
1. Create a complete menu with appetizers, main courses, and desserts
2. Ensure 100% compliance with all dietary restrictions
3. Include ingredient lists for each dish
4. Provide allergen warnings and dietary tags
5. Estimate preparation time and difficulty
6. Suggest serving presentation and portion sizes
7. Include alternative options for each course
8. Consider cross-contamination prevention
9. Optimize for the specified budget while maintaining quality
10. Account for seasonal ingredient availability

RESPONSE FORMAT:
Return a detailed JSON object with the menu structure, including courses, dishes, ingredients, allergen information, costs, and compliance analysis.`
  }

  private getSystemPrompt(analysisType: string): string {
    const prompts = {
      menu_generation: `You are a master chef with 25+ years of experience in wedding catering and dietary-compliant cooking. You specialize in creating elegant, delicious menus that accommodate all dietary restrictions while maintaining exceptional taste and presentation. You have extensive knowledge of:

- Food allergies and cross-contamination prevention
- Religious and cultural dietary laws (kosher, halal, etc.)
- Plant-based and alternative ingredient cooking
- Cost-effective menu planning and portion control
- Seasonal ingredient sourcing and availability
- Wedding-specific presentation and service requirements

Always prioritize guest safety, especially for severe allergies. Provide creative, restaurant-quality solutions that exceed expectations while staying within budget constraints.`,

      allergen_analysis: `You are a food safety expert and certified allergen specialist with deep knowledge of:

- FDA allergen regulations and labeling requirements
- Cross-contamination risks in commercial kitchens
- Hidden allergens in processed foods and ingredients
- International food safety standards
- Ingredient traceability and supply chain analysis
- Emergency protocols for severe allergic reactions

Provide thorough, accurate analysis with specific attention to life-threatening allergens. Always err on the side of caution and provide detailed warnings for any potential risks.`
    }

    return prompts[analysisType] || 'You are a helpful AI assistant specializing in food service and dietary management.'
  }

  private validateMenuParams(params: MenuGenerationParams): void {
    if (!params.weddingId || !params.guestCount || !params.budgetPerPerson) {
      throw new Error('Missing required menu generation parameters')
    }

    if (params.guestCount < 1 || params.guestCount > 1000) {
      throw new Error('Guest count must be between 1 and 1000')
    }

    if (params.budgetPerPerson < 15 || params.budgetPerPerson > 500) {
      throw new Error('Budget per person must be between $15 and $500')
    }

    const validMenuStyles = ['formal', 'buffet', 'family-style', 'cocktail', 'casual']
    if (!validMenuStyles.includes(params.menuStyle)) {
      throw new Error('Invalid menu style')
    }

    const validMealTypes = ['lunch', 'dinner', 'brunch', 'cocktail']
    if (!validMealTypes.includes(params.mealType)) {
      throw new Error('Invalid meal type')
    }
  }

  private generateCacheKey(analysisType: string, params: any): string {
    const paramString = JSON.stringify(params, Object.keys(params).sort())
    return crypto.createHash('sha256').update(`${analysisType}:${paramString}`).digest('hex')
  }

  private async getCachedAnalysis(analysisType: string, inputHash: string) {
    const { data } = await this.supabase
      .from('dietary_ai_analysis')
      .select('*')
      .eq('analysis_type', analysisType)
      .eq('input_hash', inputHash)
      .gte('cache_expires_at', new Date().toISOString())
      .single()

    return data
  }

  private async cacheAnalysis(analysis: any) {
    const { error } = await this.supabase
      .from('dietary_ai_analysis')
      .upsert(analysis, {
        onConflict: 'analysis_type,input_hash'
      })

    if (error && !error.message.includes('duplicate key')) {
      console.error('Failed to cache analysis:', error)
    }
  }

  private calculateApiCost(usage: any): number {
    if (!usage) return 0
    
    // GPT-4 pricing (approximate)
    const inputCost = (usage.prompt_tokens || 0) * 0.00003
    const outputCost = (usage.completion_tokens || 0) * 0.00006
    
    return inputCost + outputCost
  }

  private async saveGeneratedMenu(
    weddingId: string,
    supplierId: string,
    menu: any,
    validation: MenuValidationResult,
    params: MenuGenerationParams
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('wedding_menus')
      .insert({
        wedding_id: weddingId,
        supplier_id: supplierId,
        menu_name: menu.name || `AI Generated Menu - ${new Date().toLocaleDateString()}`,
        menu_description: menu.description,
        guest_count: params.guestCount,
        dietary_requirements_summary: params.dietaryRequirements,
        menu_structure: menu,
        menu_style: params.menuStyle,
        meal_type: params.mealType,
        cultural_preferences: params.culturalRequirements || [],
        seasonal_preferences: params.seasonalPreferences || [],
        budget_per_person: params.budgetPerPerson,
        total_cost: menu.totalCost || 0,
        cost_per_person: menu.costPerPerson || 0,
        dietary_compliance_score: validation.complianceScore,
        allergen_warnings: validation.warnings,
        generated_by_ai: true,
        ai_model_used: 'gpt-4',
        ai_confidence_score: validation.complianceScore,
        status: 'draft'
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  // Additional helper methods would be implemented here...
  // (truncated for brevity but would include all the methods referenced above)
}

// Type definitions
interface MenuGenerationParams {
  weddingId: string
  guestCount: number
  dietaryRequirements: {
    allergies: string[]
    diets: string[]
    medical: string[]
    preferences: string[]
  }
  menuStyle: string
  budgetPerPerson: number
  mealType: string
  culturalRequirements?: string[]
  seasonalPreferences?: string[]
}

interface DietaryRequirement {
  id: string
  guestName: string
  category: string
  severity: number
  notes: string
  verified: boolean
}

interface MenuValidationResult {
  isCompliant: boolean
  complianceScore: number
  conflicts: DietaryConflict[]
  warnings: string[]
  alternatives: any[]
  riskAssessment: RiskAssessment
  recommendations: string[]
}

interface DietaryConflict {
  id: string
  guestName: string
  dishName: string
  conflictType: string
  severityLevel: number
  ingredientTrigger: string
  conflictDescription: string
  riskLevel: string
  suggestedAlternatives: any[]
  resolutionStatus: string
}

interface PortionCalculationResult {
  id: string
  menuId: string
  baseGuestCount: number
  adjustedPortions: number
  wasteBuffer: number
  dietaryBuffer: number
  calculations: PortionCalculation[]
  totalCost: number
  costPerPerson: number
  totalPrepTime: number
  shoppingList: ShoppingListItem[]
  prepTimeline: PrepTimelineItem[]
  equipmentNeeded: string[]
  staffingRecommendations: StaffingRecommendation[]
}
```

### 3. API Route Implementation

```typescript
// File: src/app/api/catering/menu/generate/route.ts

import { NextRequest } from 'next/server'
import { withSecureValidation } from '@/lib/security/withSecureValidation'
import { DietaryAnalysisService } from '@/lib/services/DietaryAnalysisService'
import { z } from 'zod'

const menuGenerationSchema = z.object({
  weddingId: z.string().uuid(),
  guestCount: z.number().min(1).max(1000),
  dietaryRequirements: z.object({
    allergies: z.array(z.string()).default([]),
    diets: z.array(z.string()).default([]),
    medical: z.array(z.string()).default([]),
    preferences: z.array(z.string()).default([])
  }),
  menuStyle: z.enum(['formal', 'buffet', 'family-style', 'cocktail', 'casual']),
  budgetPerPerson: z.number().min(15).max(500),
  mealType: z.enum(['lunch', 'dinner', 'brunch', 'cocktail']),
  culturalRequirements: z.array(z.string()).optional(),
  seasonalPreferences: z.array(z.string()).optional()
})

export async function POST(request: NextRequest) {
  return withSecureValidation(
    request,
    menuGenerationSchema,
    async ({ body, user }) => {
      try {
        const dietaryService = new DietaryAnalysisService()
        
        const result = await dietaryService.generateCompliantMenu(
          body.weddingId,
          user.id,
          body
        )

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('Menu generation failed:', error)
        
        if (error.message.includes('rate limit')) {
          return {
            success: false,
            error: 'Rate limit exceeded. Please try again in an hour.',
            code: 'RATE_LIMIT_EXCEEDED'
          }
        }

        if (error.message.includes('OpenAI')) {
          return {
            success: false,
            error: 'AI service temporarily unavailable. Please try again.',
            code: 'AI_SERVICE_ERROR'
          }
        }

        return {
          success: false,
          error: 'Menu generation failed. Please check your requirements and try again.',
          code: 'GENERATION_FAILED'
        }
      }
    }
  )
}
```

### 4. Advanced AI Integration with Circuit Breaker

```typescript
// File: src/lib/services/OpenAIService.ts

import { OpenAI } from 'openai'
import { CircuitBreaker } from '@/lib/utils/circuit-breaker'
import { exponentialBackoff } from '@/lib/utils/retry'

export class OpenAIService {
  private openai: OpenAI
  private circuitBreaker: CircuitBreaker

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      timeout: 30000, // 30 second timeout
      maxRetries: 3
    })

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      name: 'OpenAI Service'
    })
  }

  async generateMenuWithRetry(prompt: string, options: any = {}): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      return exponentialBackoff(
        async () => {
          const completion = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are a master wedding chef specializing in dietary-compliant menus.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 4000,
            ...options
          })

          // Validate response structure
          const content = completion.choices[0]?.message?.content
          if (!content) {
            throw new Error('Empty response from OpenAI')
          }

          const parsed = JSON.parse(content)
          if (!this.validateMenuResponse(parsed)) {
            throw new Error('Invalid menu structure from OpenAI')
          }

          return {
            menu: parsed,
            usage: completion.usage,
            model: completion.model,
            finishReason: completion.choices[0].finish_reason
          }
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffFactor: 2
        }
      )
    })
  }

  private validateMenuResponse(menu: any): boolean {
    return (
      menu &&
      typeof menu === 'object' &&
      menu.courses &&
      Array.isArray(menu.courses) &&
      menu.courses.length > 0 &&
      menu.courses.every((course: any) => 
        course.dishes && Array.isArray(course.dishes) && course.dishes.length > 0
      )
    )
  }
}
```

## TESTING REQUIREMENTS

### Unit Testing with Jest

```typescript
// File: __tests__/services/DietaryAnalysisService.test.ts

import { DietaryAnalysisService } from '@/lib/services/DietaryAnalysisService'
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase'
import { createMockOpenAI } from '@/__tests__/mocks/openai'

jest.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient()
}))

jest.mock('openai', () => ({
  OpenAI: jest.fn(() => createMockOpenAI())
}))

describe('DietaryAnalysisService', () => {
  let service: DietaryAnalysisService
  let mockSupabase: any
  let mockOpenAI: any

  beforeEach(() => {
    service = new DietaryAnalysisService()
    mockSupabase = require('@/lib/supabase').supabase
    mockOpenAI = require('openai').OpenAI.mock.instances[0]
  })

  describe('generateCompliantMenu', () => {
    test('generates menu with allergen compliance', async () => {
      const mockRequirements = [
        {
          id: '1',
          guestName: 'John Doe',
          category: 'allergy',
          severity: 5,
          notes: 'severe nut allergy',
          verified: true
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockRequirements,
            error: null
          })
        })
      })

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              name: 'Nut-Free Wedding Menu',
              courses: [
                {
                  name: 'Appetizers',
                  dishes: [
                    {
                      name: 'Herb-Crusted Salmon Bites',
                      ingredients: ['salmon', 'herbs', 'olive oil'],
                      allergens: [],
                      dietaryTags: ['gluten-free', 'nut-free']
                    }
                  ]
                }
              ],
              totalCost: 75 * 100,
              costPerPerson: 75
            })
          }
        }],
        usage: { total_tokens: 1500, prompt_tokens: 1000, completion_tokens: 500 }
      })

      const result = await service.generateCompliantMenu('wedding-123', 'user-123', {
        weddingId: 'wedding-123',
        guestCount: 100,
        dietaryRequirements: {
          allergies: ['nuts'],
          diets: [],
          medical: [],
          preferences: []
        },
        menuStyle: 'formal',
        budgetPerPerson: 75,
        mealType: 'dinner'
      })

      expect(result).toHaveProperty('menuId')
      expect(result).toHaveProperty('menu')
      expect(result.menu.courses).toHaveLength(1)
      expect(result.complianceScore).toBeGreaterThan(0.8)
    })

    test('handles rate limiting correctly', async () => {
      const rateLimitSpy = jest.spyOn(require('@/lib/security/rate-limit'), 'check')
      rateLimitSpy.mockRejectedValue(new Error('Rate limit exceeded'))

      await expect(
        service.generateCompliantMenu('wedding-123', 'user-123', {
          weddingId: 'wedding-123',
          guestCount: 100,
          dietaryRequirements: { allergies: [], diets: [], medical: [], preferences: [] },
          menuStyle: 'formal',
          budgetPerPerson: 75,
          mealType: 'dinner'
        })
      ).rejects.toThrow('Rate limit exceeded')
    })
  })

  describe('analyzeIngredientAllergens', () => {
    test('detects common allergens correctly', async () => {
      const ingredients = ['peanut butter', 'milk chocolate', 'wheat flour']

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                name: 'Nuts',
                common_triggers: ['peanut', 'almond', 'walnut'],
                severity_level: 5,
                cross_contamination_risk: true
              },
              {
                name: 'Dairy',
                common_triggers: ['milk', 'cheese', 'butter'],
                severity_level: 3,
                cross_contamination_risk: false
              }
            ],
            error: null
          })
        })
      })

      const result = await service.analyzeIngredientAllergens(ingredients)

      expect(result.allergens).toContain('Nuts')
      expect(result.allergens).toContain('Dairy')
      expect(result.crossContaminationRisk).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.9)
    })
  })

  describe('calculatePortionsAndCosts', () => {
    test('calculates accurate portions with waste buffer', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'menu-123',
                menu_structure: {
                  'course-1': {
                    dishes: ['dish-1', 'dish-2']
                  }
                },
                dietary_requirements_summary: {}
              },
              error: null
            })
          })
        })
      })

      const result = await service.calculatePortionsAndCosts('menu-123', 100, {
        wasteBuffer: 0.1,
        servingStyle: 'plated'
      })

      expect(result.baseGuestCount).toBe(100)
      expect(result.adjustedPortions).toBe(115) // 100 + 10% waste + 5% dietary buffer
      expect(result.costPerPerson).toBeGreaterThan(0)
      expect(result.calculations).toBeInstanceOf(Array)
    })
  })
})
```

### Integration Testing

```typescript
// File: __tests__/api/catering/menu/generate.test.ts

import { POST } from '@/app/api/catering/menu/generate/route'
import { createMockRequest } from '@/__tests__/utils/mock-request'
import { withSecureValidation } from '@/lib/security/withSecureValidation'

// Mock the secure validation middleware
jest.mock('@/lib/security/withSecureValidation', () => ({
  withSecureValidation: jest.fn((request, schema, handler) => {
    // Simulate successful validation
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    const mockBody = {
      weddingId: 'wedding-123',
      guestCount: 50,
      dietaryRequirements: {
        allergies: ['nuts'],
        diets: ['vegetarian'],
        medical: [],
        preferences: []
      },
      menuStyle: 'formal',
      budgetPerPerson: 100,
      mealType: 'dinner'
    }
    
    return handler({ body: mockBody, user: mockUser })
  })
}))

describe('/api/catering/menu/generate', () => {
  test('generates menu successfully', async () => {
    const request = createMockRequest({
      method: 'POST',
      body: {
        weddingId: 'wedding-123',
        guestCount: 50,
        dietaryRequirements: {
          allergies: ['nuts'],
          diets: ['vegetarian'],
          medical: [],
          preferences: []
        },
        menuStyle: 'formal',
        budgetPerPerson: 100,
        mealType: 'dinner'
      },
      headers: {
        'Authorization': 'Bearer valid-token'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('menuId')
    expect(data.data).toHaveProperty('menu')
  })

  test('handles validation errors', async () => {
    const request = createMockRequest({
      method: 'POST',
      body: {
        weddingId: 'invalid-uuid',
        guestCount: -5, // Invalid guest count
        budgetPerPerson: 1000, // Too expensive
        menuStyle: 'invalid-style'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.errors).toBeDefined()
  })
})
```

## PERFORMANCE OPTIMIZATION

### Database Query Optimization

```sql
-- Optimize dietary requirements query with proper indexing
EXPLAIN ANALYZE 
SELECT gdr.*, dc.name as category_name, dc.common_triggers
FROM guest_dietary_requirements gdr
JOIN dietary_categories dc ON dc.id = gdr.dietary_category_id
WHERE gdr.wedding_id = $1 
AND gdr.severity_level >= 3
ORDER BY gdr.severity_level DESC, dc.severity_level DESC;

-- Expected: Index Scan using idx_guest_dietary_wedding, Nested Loop
-- Execution time: < 5ms for 100 requirements

-- Optimize menu item search with GIN indexes
EXPLAIN ANALYZE
SELECT * FROM menu_items 
WHERE supplier_id = $1 
AND active = true 
AND allergen_warnings && ARRAY['nuts', 'dairy']
AND dietary_tags @> ARRAY['vegetarian'];

-- Expected: Bitmap Index Scan, execution time < 10ms
```

### API Response Caching

```typescript
// File: src/lib/cache/redis-cache.ts

import Redis from 'ioredis'

export class RedisCache {
  private redis: Redis

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    })
  }

  async cacheMenuGeneration(key: string, data: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(`menu:${key}`, ttl, JSON.stringify(data))
  }

  async getCachedMenu(key: string): Promise<any | null> {
    const cached = await this.redis.get(`menu:${key}`)
    return cached ? JSON.parse(cached) : null
  }

  async invalidateMenuCache(weddingId: string): Promise<void> {
    const keys = await this.redis.keys(`menu:*${weddingId}*`)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
}
```

## COMPLETION CHECKLIST

### Database Implementation ✅
- [ ] Migration script created and applied
- [ ] All 9 tables created with proper relationships
- [ ] Indexes optimized for query performance
- [ ] Row Level Security policies implemented
- [ ] Trigger functions for audit logging
- [ ] Default data seeded (dietary categories)

### Service Layer ✅
- [ ] DietaryAnalysisService with full functionality
- [ ] OpenAI integration with circuit breaker pattern
- [ ] Rate limiting on all AI operations
- [ ] Caching layer for expensive operations
- [ ] Error handling and retry logic
- [ ] Cost tracking and usage monitoring

### API Endpoints ✅
- [ ] Menu generation endpoint with validation
- [ ] Menu validation endpoint
- [ ] Portion calculation endpoint
- [ ] Ingredient analysis endpoint
- [ ] All endpoints secured with middleware
- [ ] Comprehensive error handling

### Testing Coverage ✅
- [ ] Unit tests for all service methods (>90% coverage)
- [ ] Integration tests for API endpoints
- [ ] Database migration testing
- [ ] Performance benchmarking
- [ ] Error scenario testing

### Performance Optimization ✅
- [ ] Database queries optimized (<50ms p95)
- [ ] AI response caching implemented
- [ ] Rate limiting prevents abuse
- [ ] Circuit breaker for external services
- [ ] Memory usage monitoring

### Security Implementation ✅
- [ ] All routes protected with authentication
- [ ] Input validation with Zod schemas
- [ ] SQL injection prevention
- [ ] Rate limiting on expensive operations
- [ ] Audit logging for all actions

**CRITICAL**: This backend must handle 10,000+ concurrent dietary analysis requests during peak wedding planning season. All services must be production-ready with comprehensive monitoring, logging, and failover mechanisms.