/**
 * WS-254: Dietary Analysis Service
 * Comprehensive dietary management service with OpenAI integration
 * Team B Backend Implementation
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { Database } from '@/types/database';

// Rate limiting configuration
const RATE_LIMITS = {
  MENU_GENERATION: { requests: 10, window: 60 * 60 * 1000 }, // 10 per hour
  ALLERGEN_ANALYSIS: { requests: 50, window: 60 * 60 * 1000 }, // 50 per hour
  CONFLICT_DETECTION: { requests: 25, window: 60 * 60 * 1000 }, // 25 per hour
};

interface MenuGenerationParams {
  weddingId: string;
  guestCount: number;
  dietaryRequirements: {
    allergies: string[];
    diets: string[];
    medical: string[];
    preferences: string[];
  };
  menuStyle: 'formal' | 'buffet' | 'family-style' | 'cocktail' | 'casual';
  budgetPerPerson: number;
  mealType: 'lunch' | 'dinner' | 'brunch' | 'cocktail';
  culturalRequirements?: string[];
  seasonalPreferences?: string[];
}

interface MenuGenerationResult {
  menuId: string;
  menu: {
    name: string;
    description: string;
    courses: MenuCourse[];
    totalCost: number;
    costPerPerson: number;
    complianceScore: number;
    allergenWarnings: string[];
    prepTimeline: PrepTimelineItem[];
  };
  conflicts: DietaryConflict[];
  alternatives: MenuAlternative[];
  complianceScore: number;
}

interface MenuCourse {
  name: string;
  dishes: MenuDish[];
  servingOrder: number;
}

interface MenuDish {
  name: string;
  description: string;
  ingredients: DishIngredient[];
  allergens: string[];
  dietaryTags: string[];
  prepTime: number;
  servingSize: number;
  cost: number;
  alternatives: MenuAlternative[];
}

interface DishIngredient {
  name: string;
  quantity: number;
  unit: string;
  allergens: string[];
  substitutions: IngredientSubstitution[];
}

interface IngredientSubstitution {
  ingredient: string;
  reason: string;
  suitableFor: string[];
  costAdjustment: number;
}

interface DietaryConflict {
  id: string;
  guestName: string;
  dishName: string;
  conflictType: 'allergen' | 'dietary' | 'religious' | 'medical' | 'preference';
  severityLevel: number;
  ingredientTrigger: string;
  conflictDescription: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestedAlternatives: MenuAlternative[];
  resolutionStatus:
    | 'unresolved'
    | 'alternative_suggested'
    | 'resolved'
    | 'accepted_risk';
}

interface MenuAlternative {
  dishName: string;
  description: string;
  costAdjustment: number;
  prepTimeAdjustment: number;
  complianceImprovement: number;
}

interface AllergenAnalysisResult {
  allergens: string[];
  details: AllergenDetail[];
  crossContaminationRisk: boolean;
  confidence: number;
  recommendations: string[];
}

interface AllergenDetail {
  ingredient: string;
  allergenType: string;
  trigger: string;
  severity: number;
  crossContaminationRisk: boolean;
}

interface PrepTimelineItem {
  task: string;
  startTime: string;
  duration: number;
  prerequisites: string[];
  staffRequired: number;
}

interface PortionCalculationResult {
  menuId: string;
  baseGuestCount: number;
  adjustedPortions: number;
  wasteBuffer: number;
  dietaryBuffer: number;
  calculations: PortionCalculation[];
  totalCost: number;
  costPerPerson: number;
  totalPrepTime: number;
  shoppingList: ShoppingListItem[];
  prepTimeline: PrepTimelineItem[];
  equipmentNeeded: string[];
  staffingRecommendations: StaffingRecommendation[];
}

interface PortionCalculation {
  dishName: string;
  basePortions: number;
  adjustedPortions: number;
  ingredientCosts: IngredientCost[];
  totalCost: number;
  prepTime: number;
}

interface IngredientCost {
  ingredient: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

interface ShoppingListItem {
  ingredient: string;
  totalQuantity: number;
  unit: string;
  estimatedCost: number;
  suppliers: string[];
  priority: 'high' | 'medium' | 'low';
}

interface StaffingRecommendation {
  role: string;
  count: number;
  hoursRequired: number;
  skillLevel: 'basic' | 'intermediate' | 'expert';
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

export class DietaryAnalysisService {
  private openai: OpenAI;
  private supabase: ReturnType<typeof createClient<Database>>;
  private rateLimitMap = new Map<string, RateLimitInfo>();

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error('Supabase configuration missing');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 3,
    });

    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }

  /**
   * Generate AI-powered compliant wedding menu
   */
  async generateCompliantMenu(
    weddingId: string,
    userId: string,
    params: MenuGenerationParams,
  ): Promise<MenuGenerationResult> {
    try {
      // Rate limiting check
      await this.checkRateLimit(userId, 'MENU_GENERATION');

      // Validate input parameters
      this.validateMenuParams(params);

      // Check cache first
      const cacheKey = this.generateCacheKey('menu_generation', params);
      const cached = await this.getCachedAnalysis('menu_generation', cacheKey);

      if (cached && !this.isCacheExpired(cached)) {
        await this.updateCacheUsage(cached.id);
        return this.formatMenuResult(cached.ai_response, cached.id);
      }

      // Fetch dietary requirements and context
      const [requirements, weddingContext, supplierContext] = await Promise.all(
        [
          this.getDietaryRequirements(weddingId),
          this.getWeddingContext(weddingId),
          this.getSupplierContext(userId),
        ],
      );

      // Build AI prompt with context
      const prompt = this.buildMenuGenerationPrompt({
        requirements,
        weddingContext,
        supplierContext,
        ...params,
      });

      const startTime = Date.now();

      // Generate menu with OpenAI
      const aiResponse = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('menu_generation'),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000,
      });

      const processingTime = Date.now() - startTime;
      const apiCost = this.calculateApiCost(aiResponse.usage);

      const generatedMenu = JSON.parse(
        aiResponse.choices[0].message.content || '{}',
      );

      // Validate and analyze the generated menu
      const validationResult = await this.validateMenuCompliance(
        generatedMenu,
        requirements,
        params.dietaryRequirements,
      );

      // Store menu in database
      const menuId = await this.saveGeneratedMenu(
        weddingId,
        userId,
        generatedMenu,
        validationResult,
        params,
      );

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
        tokensUsed: aiResponse.usage?.total_tokens || 0,
      });

      return this.formatMenuResult({ ...generatedMenu, menuId }, menuId);
    } catch (error) {
      console.error('Menu generation failed:', error);
      throw this.handleServiceError(error, 'generateCompliantMenu');
    }
  }

  /**
   * Analyze ingredients for allergens and cross-contamination risks
   */
  async analyzeIngredientAllergens(
    ingredients: string[],
    userId?: string,
  ): Promise<AllergenAnalysisResult> {
    try {
      if (userId) {
        await this.checkRateLimit(userId, 'ALLERGEN_ANALYSIS');
      }

      const cacheKey = this.generateCacheKey('allergen_analysis', {
        ingredients,
      });
      const cached = await this.getCachedAnalysis(
        'allergen_analysis',
        cacheKey,
      );

      if (cached && !this.isCacheExpired(cached)) {
        return cached.ai_response as AllergenAnalysisResult;
      }

      // Database lookup for known allergens
      const knownAllergens = await this.checkKnownAllergens(ingredients);

      // AI analysis for complex or unknown ingredients
      const aiAnalysis = await this.performAIAllergenAnalysis(ingredients);

      // Combine results
      const combinedResult = this.combineAllergenAnalysis(
        knownAllergens,
        aiAnalysis,
      );

      // Cache the result
      await this.cacheAnalysis({
        type: 'allergen_analysis',
        inputHash: cacheKey,
        inputParameters: { ingredients },
        aiResponse: combinedResult,
        confidenceScore: combinedResult.confidence,
        processingTime: Date.now(),
        modelUsed: 'gpt-3.5-turbo',
      });

      return combinedResult;
    } catch (error) {
      console.error('Allergen analysis failed:', error);
      throw this.handleServiceError(error, 'analyzeIngredientAllergens');
    }
  }

  /**
   * Calculate portions and costs for wedding menu
   */
  async calculatePortionsAndCosts(
    menuId: string,
    finalGuestCount: number,
    options: {
      wasteBuffer?: number;
      dietaryBuffer?: number;
      servingStyle?: string;
      specialRequests?: string[];
    } = {},
  ): Promise<PortionCalculationResult> {
    try {
      const {
        wasteBuffer = 0.1,
        dietaryBuffer = 0.05,
        servingStyle = 'plated',
        specialRequests = [],
      } = options;

      // Fetch menu details
      const { data: menu, error } = await this.supabase
        .from('wedding_menus')
        .select(
          `
          *,
          menu_structure,
          dietary_requirements_summary
        `,
        )
        .eq('id', menuId)
        .single();

      if (error || !menu) throw new Error('Menu not found');

      const adjustedCount = Math.ceil(
        finalGuestCount * (1 + wasteBuffer + dietaryBuffer),
      );
      const calculations: PortionCalculation[] = [];
      let totalCost = 0;
      let totalPrepTime = 0;

      // Calculate portions for each menu item
      for (const courseId of Object.keys(menu.menu_structure)) {
        const course = menu.menu_structure[courseId];

        for (const dishId of course.dishes) {
          const { data: menuItem } = await this.supabase
            .from('menu_items')
            .select('*')
            .eq('id', dishId)
            .single();

          if (menuItem) {
            const calculation = await this.calculateDishPortions(
              menuItem,
              adjustedCount,
              servingStyle,
              specialRequests,
            );

            calculations.push(calculation);
            totalCost += calculation.totalCost;
            totalPrepTime += calculation.prepTime;
          }
        }
      }

      // Generate shopping list and timeline
      const shoppingList = await this.generateShoppingList(calculations);
      const prepTimeline = await this.generatePrepTimeline(
        calculations,
        finalGuestCount,
      );

      // Save calculations to database
      const calculationId = await this.savePortionCalculations({
        menuId,
        baseServings: finalGuestCount,
        wasteBuffer: wasteBuffer * 100,
        totalPortions: adjustedCount,
        calculations,
        totalCost,
        shoppingList,
        prepTimeline,
      });

      return {
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
        staffingRecommendations: this.calculateStaffingNeeds(
          calculations,
          finalGuestCount,
        ),
      };
    } catch (error) {
      console.error('Portion calculation failed:', error);
      throw this.handleServiceError(error, 'calculatePortionsAndCosts');
    }
  }

  /**
   * Validate menu compliance against dietary requirements
   */
  private async validateMenuCompliance(
    menu: any,
    requirements: any[],
    additionalRestrictions: any,
  ): Promise<{ complianceScore: number; conflicts: DietaryConflict[] }> {
    const conflicts: DietaryConflict[] = [];
    let totalItems = 0;
    let compliantItems = 0;

    // Analyze each course and dish
    for (const course of menu.courses || []) {
      for (const dish of course.dishes || []) {
        totalItems++;

        const dishConflicts = await this.analyzeDishConflicts(
          dish,
          requirements,
        );

        if (dishConflicts.length === 0) {
          compliantItems++;
        } else {
          conflicts.push(...dishConflicts);
        }
      }
    }

    const complianceScore = totalItems > 0 ? compliantItems / totalItems : 0;

    return {
      complianceScore,
      conflicts,
    };
  }

  // Private helper methods

  private async checkRateLimit(
    userId: string,
    operation: keyof typeof RATE_LIMITS,
  ): Promise<void> {
    const key = `${userId}:${operation}`;
    const now = Date.now();
    const limit = RATE_LIMITS[operation];
    const existing = this.rateLimitMap.get(key);

    if (!existing || now > existing.resetTime) {
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + limit.window,
      });
      return;
    }

    if (existing.count >= limit.requests) {
      throw new Error(`Rate limit exceeded for ${operation}. Try again later.`);
    }

    existing.count++;
  }

  private validateMenuParams(params: MenuGenerationParams): void {
    if (!params.weddingId || !params.guestCount || !params.budgetPerPerson) {
      throw new Error('Missing required menu generation parameters');
    }

    if (params.guestCount < 1 || params.guestCount > 1000) {
      throw new Error('Guest count must be between 1 and 1000');
    }

    if (params.budgetPerPerson < 15 || params.budgetPerPerson > 500) {
      throw new Error('Budget per person must be between £15 and £500');
    }

    const validMenuStyles = [
      'formal',
      'buffet',
      'family-style',
      'cocktail',
      'casual',
    ];
    if (!validMenuStyles.includes(params.menuStyle)) {
      throw new Error('Invalid menu style');
    }

    const validMealTypes = ['lunch', 'dinner', 'brunch', 'cocktail'];
    if (!validMealTypes.includes(params.mealType)) {
      throw new Error('Invalid meal type');
    }
  }

  private generateCacheKey(analysisType: string, params: any): string {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return crypto
      .createHash('sha256')
      .update(`${analysisType}:${paramString}`)
      .digest('hex');
  }

  private async getCachedAnalysis(analysisType: string, inputHash: string) {
    const { data } = await this.supabase
      .from('dietary_ai_analysis')
      .select('*')
      .eq('analysis_type', analysisType)
      .eq('input_hash', inputHash)
      .gte('cache_expires_at', new Date().toISOString())
      .single();

    return data;
  }

  private async cacheAnalysis(analysis: any) {
    const { error } = await this.supabase
      .from('dietary_ai_analysis')
      .upsert(analysis, {
        onConflict: 'analysis_type,input_hash',
      });

    if (error && !error.message.includes('duplicate key')) {
      console.error('Failed to cache analysis:', error);
    }
  }

  private async updateCacheUsage(cacheId: string) {
    await this.supabase
      .from('dietary_ai_analysis')
      .update({
        usage_count: this.supabase.raw('usage_count + 1'),
        last_used_at: new Date().toISOString(),
      })
      .eq('id', cacheId);
  }

  private isCacheExpired(cached: any): boolean {
    return new Date(cached.cache_expires_at) < new Date();
  }

  private async getDietaryRequirements(weddingId: string) {
    const { data, error } = await this.supabase
      .from('guest_dietary_requirements')
      .select(
        `
        *,
        dietary_categories (
          name,
          category_type,
          severity_level,
          common_triggers
        )
      `,
      )
      .eq('wedding_id', weddingId);

    if (error) throw error;
    return data || [];
  }

  private async getWeddingContext(weddingId: string) {
    const { data, error } = await this.supabase
      .from('weddings')
      .select('wedding_date, venue_type, guest_count')
      .eq('id', weddingId)
      .single();

    if (error) throw error;
    return data;
  }

  private async getSupplierContext(userId: string) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('business_name, specialties, service_areas')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  private buildMenuGenerationPrompt(context: any): string {
    const { requirements, weddingContext, supplierContext, ...params } =
      context;

    return `Generate a wedding menu for ${params.guestCount} guests with the following specifications:

DIETARY REQUIREMENTS:
${this.formatDietaryRequirementsForPrompt(requirements)}

MENU PARAMETERS:
- Style: ${params.menuStyle}
- Meal Type: ${params.mealType}
- Budget per person: £${params.budgetPerPerson}
- Cultural preferences: ${params.culturalRequirements?.join(', ') || 'None'}
- Seasonal preferences: ${params.seasonalPreferences?.join(', ') || 'None'}

WEDDING CONTEXT:
- Date: ${weddingContext.weddingDate}
- Venue type: ${weddingContext.venueType}
- Guest count: ${weddingContext.guest_count}

SUPPLIER CAPABILITIES:
- Business: ${supplierContext.business_name}
- Specialties: ${supplierContext.specialties?.join(', ') || 'General catering'}

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
Return a detailed JSON object with the menu structure, including courses, dishes, ingredients, allergen information, costs, and compliance analysis.`;
  }

  private formatDietaryRequirementsForPrompt(requirements: any[]): string {
    if (!requirements.length) return 'No specific dietary requirements';

    return requirements
      .map(
        (req) =>
          `- ${req.guest_name}: ${req.dietary_categories?.name} (Severity: ${req.severity_level}/5) - ${req.specific_notes || 'No additional notes'}`,
      )
      .join('\n');
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
    };

    return (
      prompts[analysisType] ||
      'You are a helpful AI assistant specializing in food service and dietary management.'
    );
  }

  private calculateApiCost(usage: any): number {
    if (!usage) return 0;

    // GPT-4 pricing (approximate)
    const inputCost = (usage.prompt_tokens || 0) * 0.00003;
    const outputCost = (usage.completion_tokens || 0) * 0.00006;

    return inputCost + outputCost;
  }

  private async saveGeneratedMenu(
    weddingId: string,
    supplierId: string,
    menu: any,
    validation: any,
    params: MenuGenerationParams,
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('wedding_menus')
      .insert({
        wedding_id: weddingId,
        supplier_id: supplierId,
        menu_name:
          menu.name || `AI Generated Menu - ${new Date().toLocaleDateString()}`,
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
        generated_by_ai: true,
        ai_model_used: 'gpt-4',
        ai_confidence_score: validation.complianceScore,
        status: 'draft',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  private formatMenuResult(
    menuData: any,
    menuId: string,
  ): MenuGenerationResult {
    return {
      menuId,
      menu: {
        name: menuData.name,
        description: menuData.description,
        courses: menuData.courses || [],
        totalCost: menuData.totalCost || 0,
        costPerPerson: menuData.costPerPerson || 0,
        complianceScore: menuData.complianceScore || 0,
        allergenWarnings: menuData.allergenWarnings || [],
        prepTimeline: menuData.prepTimeline || [],
      },
      conflicts: menuData.conflicts || [],
      alternatives: menuData.alternatives || [],
      complianceScore: menuData.complianceScore || 0,
    };
  }

  private async performAIAllergenAnalysis(ingredients: string[]): Promise<any> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a food safety expert analyzing ingredients for allergens and cross-contamination risks.',
        },
        {
          role: 'user',
          content: `Analyze these ingredients for allergens and cross-contamination risks: ${ingredients.join(', ')}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1500,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  private async checkKnownAllergens(ingredients: string[]): Promise<any> {
    const { data: allergenData } = await this.supabase
      .from('dietary_categories')
      .select('name, common_triggers, severity_level, cross_contamination_risk')
      .eq('category_type', 'allergy');

    const detectedAllergens: AllergenDetail[] = [];

    for (const ingredient of ingredients) {
      const ingredientLower = ingredient.toLowerCase();

      for (const allergen of allergenData || []) {
        for (const trigger of allergen.common_triggers) {
          if (ingredientLower.includes(trigger.toLowerCase())) {
            detectedAllergens.push({
              ingredient,
              allergenType: allergen.name,
              trigger,
              severity: allergen.severity_level,
              crossContaminationRisk: allergen.cross_contamination_risk,
            });
          }
        }
      }
    }

    return {
      allergens: [...new Set(detectedAllergens.map((d) => d.allergenType))],
      details: detectedAllergens,
      crossContaminationRisk: detectedAllergens.some(
        (d) => d.crossContaminationRisk,
      ),
      confidence: 0.95,
    };
  }

  private combineAllergenAnalysis(
    knownAllergens: any,
    aiAnalysis: any,
  ): AllergenAnalysisResult {
    return {
      allergens: [
        ...new Set([
          ...knownAllergens.allergens,
          ...(aiAnalysis.allergens || []),
        ]),
      ],
      details: [...knownAllergens.details, ...(aiAnalysis.details || [])],
      crossContaminationRisk:
        knownAllergens.crossContaminationRisk ||
        aiAnalysis.crossContaminationRisk,
      confidence:
        (knownAllergens.confidence + (aiAnalysis.confidence || 0.5)) / 2,
      recommendations: aiAnalysis.recommendations || [],
    };
  }

  private async analyzeDishConflicts(
    dish: any,
    requirements: any[],
  ): Promise<DietaryConflict[]> {
    const conflicts: DietaryConflict[] = [];

    for (const requirement of requirements) {
      // Implementation would check ingredient conflicts
      // This is a simplified version
      if (
        dish.allergens?.some((allergen: string) =>
          requirement.dietary_categories?.common_triggers?.includes(
            allergen.toLowerCase(),
          ),
        )
      ) {
        conflicts.push({
          id: crypto.randomUUID(),
          guestName: requirement.guest_name,
          dishName: dish.name,
          conflictType:
            requirement.dietary_categories?.category_type || 'allergen',
          severityLevel: requirement.severity_level,
          ingredientTrigger: dish.allergens[0],
          conflictDescription: `${dish.name} contains ${dish.allergens[0]} which conflicts with ${requirement.dietary_categories?.name}`,
          riskLevel: requirement.severity_level >= 4 ? 'critical' : 'medium',
          suggestedAlternatives: [],
          resolutionStatus: 'unresolved',
        });
      }
    }

    return conflicts;
  }

  private async calculateDishPortions(
    menuItem: any,
    adjustedCount: number,
    servingStyle: string,
    specialRequests: string[],
  ): Promise<PortionCalculation> {
    // Simplified calculation
    const basePortions = adjustedCount;
    const totalCost = (menuItem.base_cost_per_serving || 0) * basePortions;

    return {
      dishName: menuItem.name,
      basePortions,
      adjustedPortions: basePortions,
      ingredientCosts: [],
      totalCost,
      prepTime: menuItem.preparation_time_minutes || 30,
    };
  }

  private async generateShoppingList(
    calculations: PortionCalculation[],
  ): Promise<ShoppingListItem[]> {
    // Implementation would aggregate ingredients across all dishes
    return [];
  }

  private async generatePrepTimeline(
    calculations: PortionCalculation[],
    guestCount: number,
  ): Promise<PrepTimelineItem[]> {
    // Implementation would create timeline based on prep times
    return [];
  }

  private async savePortionCalculations(data: any): Promise<string> {
    // Implementation would save to portion_calculations table
    return crypto.randomUUID();
  }

  private consolidateEquipmentNeeds(
    calculations: PortionCalculation[],
  ): string[] {
    // Implementation would consolidate equipment requirements
    return [];
  }

  private calculateStaffingNeeds(
    calculations: PortionCalculation[],
    guestCount: number,
  ): StaffingRecommendation[] {
    // Implementation would calculate staffing based on complexity and guest count
    return [];
  }

  private handleServiceError(error: any, operation: string): Error {
    if (error.message?.includes('rate limit')) {
      return new Error(
        `Rate limit exceeded for ${operation}. Please try again later.`,
      );
    }

    if (error.message?.includes('OpenAI')) {
      return new Error(
        `AI service temporarily unavailable for ${operation}. Please try again.`,
      );
    }

    return new Error(`${operation} failed: ${error.message}`);
  }
}

// Export singleton instance
export const dietaryAnalysisService = new DietaryAnalysisService();
