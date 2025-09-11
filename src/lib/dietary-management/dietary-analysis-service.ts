/**
 * WS-254 Catering Dietary Management - Core Analysis Service
 * Handles dietary requirement analysis and menu compliance checking
 */

import { z } from 'zod';
import { OpenAI } from 'openai';

// Dietary requirement types based on wedding industry standards
export const DietaryRestrictionSchema = z.object({
  id: z.string(),
  guestId: z.string(),
  type: z.enum([
    'vegetarian',
    'vegan',
    'gluten-free',
    'dairy-free',
    'nut-allergy',
    'shellfish-allergy',
    'kosher',
    'halal',
    'keto',
    'diabetic',
    'low-sodium',
    'other',
  ]),
  severity: z.enum(['mild', 'moderate', 'severe', 'life-threatening']),
  notes: z.string().optional(),
  medicalCertification: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DietaryRestriction = z.infer<typeof DietaryRestrictionSchema>;

export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  ingredients: z.array(z.string()),
  allergens: z.array(z.string()),
  dietaryFlags: z.array(z.string()),
  nutritionalInfo: z
    .object({
      calories: z.number().optional(),
      protein: z.number().optional(),
      carbs: z.number().optional(),
      fat: z.number().optional(),
      fiber: z.number().optional(),
      sodium: z.number().optional(),
    })
    .optional(),
});

export type MenuItem = z.infer<typeof MenuItemSchema>;

export const DietaryAnalysisResultSchema = z.object({
  guestId: z.string(),
  compatibleItems: z.array(MenuItemSchema),
  incompatibleItems: z.array(
    z.object({
      item: MenuItemSchema,
      conflicts: z.array(
        z.object({
          restriction: z.string(),
          severity: z.enum(['warning', 'danger', 'critical']),
          reason: z.string(),
        }),
      ),
    }),
  ),
  recommendations: z.array(z.string()),
  analysisTimestamp: z.date(),
  confidenceScore: z.number().min(0).max(1),
});

export type DietaryAnalysisResult = z.infer<typeof DietaryAnalysisResultSchema>;

export class DietaryAnalysisService {
  private openai: OpenAI;
  private readonly ANALYSIS_TIMEOUT = 10000; // 10 seconds max as per requirements

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Analyzes dietary restrictions against menu items
   * Critical for wedding day success - zero tolerance for errors
   */
  async analyzeDietaryCompatibility(
    restrictions: DietaryRestriction[],
    menuItems: MenuItem[],
  ): Promise<DietaryAnalysisResult[]> {
    const startTime = Date.now();

    try {
      // Group restrictions by guest for efficient analysis
      const restrictionsByGuest = this.groupRestrictionsByGuest(restrictions);
      const results: DietaryAnalysisResult[] = [];

      for (const [
        guestId,
        guestRestrictions,
      ] of restrictionsByGuest.entries()) {
        const analysis = await this.analyzeGuestDietaryNeeds(
          guestId,
          guestRestrictions,
          menuItems,
        );
        results.push(analysis);

        // Ensure we don't exceed time limits
        if (Date.now() - startTime > this.ANALYSIS_TIMEOUT) {
          throw new Error(
            'Dietary analysis timeout - wedding day performance critical',
          );
        }
      }

      return results;
    } catch (error) {
      throw new Error(
        `Dietary analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generates AI-powered menu suggestions based on dietary requirements
   * Uses OpenAI to create wedding-appropriate menu recommendations
   */
  async generateDietaryCompliantMenu(
    restrictions: DietaryRestriction[],
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'cocktail' | 'dessert',
    guestCount: number,
  ): Promise<MenuItem[]> {
    const restrictionSummary = this.summarizeRestrictions(restrictions);

    const prompt = this.buildMenuGenerationPrompt(
      restrictionSummary,
      mealType,
      guestCount,
    );

    try {
      const response = await Promise.race([
        this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content:
                'You are a professional wedding caterer with expertise in dietary restrictions and allergen management. Create elegant, wedding-appropriate menus that are safe for all guests.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent, safe recommendations
          max_tokens: 2000,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Menu generation timeout')),
            this.ANALYSIS_TIMEOUT,
          ),
        ),
      ]);

      return this.parseMenuGenerationResponse(
        response.choices[0].message.content || '',
      );
    } catch (error) {
      // Fallback to predefined safe menu items if AI fails
      return this.getFallbackMenu(mealType, restrictions);
    }
  }

  /**
   * Detects potential dietary conflicts in real-time
   * Critical for preventing wedding day disasters
   */
  async detectDietaryConflicts(
    menu: MenuItem[],
    restrictions: DietaryRestriction[],
  ): Promise<
    Array<{
      item: MenuItem;
      conflicts: Array<{
        restriction: DietaryRestriction;
        severity: 'warning' | 'danger' | 'critical';
        reason: string;
      }>;
    }>
  > {
    const conflicts: Array<{
      item: MenuItem;
      conflicts: Array<{
        restriction: DietaryRestriction;
        severity: 'warning' | 'danger' | 'critical';
        reason: string;
      }>;
    }> = [];

    for (const item of menu) {
      const itemConflicts = [];

      for (const restriction of restrictions) {
        const conflict = this.checkItemRestrictionConflict(item, restriction);
        if (conflict) {
          itemConflicts.push({
            restriction,
            severity: this.determineSeverity(restriction, conflict),
            reason: conflict.reason,
          });
        }
      }

      if (itemConflicts.length > 0) {
        conflicts.push({
          item,
          conflicts: itemConflicts,
        });
      }
    }

    return conflicts;
  }

  /**
   * Validates menu safety for wedding day
   * Final safety check before service
   */
  async validateMenuSafety(
    menu: MenuItem[],
    restrictions: DietaryRestriction[],
  ): Promise<{
    isSafe: boolean;
    criticalIssues: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const conflicts = await this.detectDietaryConflicts(menu, restrictions);
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    for (const conflict of conflicts) {
      for (const issue of conflict.conflicts) {
        const message = `${conflict.item.name}: ${issue.reason}`;

        switch (issue.severity) {
          case 'critical':
            criticalIssues.push(message);
            break;
          case 'danger':
            criticalIssues.push(message);
            break;
          case 'warning':
            warnings.push(message);
            break;
        }
      }
    }

    // Generate recommendations for safer alternatives
    if (criticalIssues.length > 0 || warnings.length > 0) {
      recommendations.push(
        'Consider providing clearly labeled alternative dishes',
        'Ensure kitchen staff are trained on allergen protocols',
        'Have emergency medical contacts available at venue',
      );
    }

    return {
      isSafe: criticalIssues.length === 0,
      criticalIssues,
      warnings,
      recommendations,
    };
  }

  // Private helper methods
  private groupRestrictionsByGuest(
    restrictions: DietaryRestriction[],
  ): Map<string, DietaryRestriction[]> {
    const grouped = new Map<string, DietaryRestriction[]>();

    for (const restriction of restrictions) {
      if (!grouped.has(restriction.guestId)) {
        grouped.set(restriction.guestId, []);
      }
      grouped.get(restriction.guestId)!.push(restriction);
    }

    return grouped;
  }

  private async analyzeGuestDietaryNeeds(
    guestId: string,
    restrictions: DietaryRestriction[],
    menuItems: MenuItem[],
  ): Promise<DietaryAnalysisResult> {
    const compatible: MenuItem[] = [];
    const incompatible: Array<{
      item: MenuItem;
      conflicts: Array<{
        restriction: string;
        severity: 'warning' | 'danger' | 'critical';
        reason: string;
      }>;
    }> = [];

    for (const item of menuItems) {
      const conflicts = [];

      for (const restriction of restrictions) {
        const conflict = this.checkItemRestrictionConflict(item, restriction);
        if (conflict) {
          conflicts.push({
            restriction: restriction.type,
            severity: this.determineSeverity(restriction, conflict),
            reason: conflict.reason,
          });
        }
      }

      if (conflicts.length === 0) {
        compatible.push(item);
      } else {
        incompatible.push({ item, conflicts });
      }
    }

    return {
      guestId,
      compatibleItems: compatible,
      incompatibleItems: incompatible,
      recommendations: this.generateRecommendations(restrictions, compatible),
      analysisTimestamp: new Date(),
      confidenceScore: this.calculateConfidenceScore(restrictions, menuItems),
    };
  }

  private checkItemRestrictionConflict(
    item: MenuItem,
    restriction: DietaryRestriction,
  ): { reason: string } | null {
    const { type } = restriction;
    const { ingredients, allergens, dietaryFlags } = item;

    // Check for direct allergen conflicts
    if (type.includes('allergy')) {
      const allergen = type.replace('-allergy', '');
      if (
        allergens.includes(allergen) ||
        ingredients.some((ing) => ing.toLowerCase().includes(allergen))
      ) {
        return { reason: `Contains ${allergen} - allergen conflict` };
      }
    }

    // Check dietary restriction conflicts
    switch (type) {
      case 'vegetarian':
        if (
          ingredients.some((ing) =>
            ['meat', 'beef', 'pork', 'chicken', 'fish', 'seafood'].some(
              (meat) => ing.toLowerCase().includes(meat),
            ),
          )
        ) {
          return { reason: 'Contains meat products' };
        }
        break;

      case 'vegan':
        if (
          ingredients.some((ing) =>
            ['meat', 'dairy', 'egg', 'honey', 'gelatin'].some((animal) =>
              ing.toLowerCase().includes(animal),
            ),
          )
        ) {
          return { reason: 'Contains animal products' };
        }
        break;

      case 'gluten-free':
        if (
          ingredients.some((ing) =>
            ['wheat', 'barley', 'rye', 'gluten'].some((gluten) =>
              ing.toLowerCase().includes(gluten),
            ),
          )
        ) {
          return { reason: 'Contains gluten' };
        }
        break;

      case 'dairy-free':
        if (
          ingredients.some((ing) =>
            ['milk', 'cheese', 'butter', 'cream', 'dairy'].some((dairy) =>
              ing.toLowerCase().includes(dairy),
            ),
          )
        ) {
          return { reason: 'Contains dairy products' };
        }
        break;
    }

    return null;
  }

  private determineSeverity(
    restriction: DietaryRestriction,
    conflict: { reason: string },
  ): 'warning' | 'danger' | 'critical' {
    if (restriction.severity === 'life-threatening') {
      return 'critical';
    }

    if (
      restriction.type.includes('allergy') ||
      restriction.severity === 'severe'
    ) {
      return 'danger';
    }

    return 'warning';
  }

  private summarizeRestrictions(restrictions: DietaryRestriction[]): string {
    const summary = restrictions.reduce(
      (acc, restriction) => {
        acc[restriction.type] = (acc[restriction.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(summary)
      .map(([type, count]) => `${count} guests with ${type} requirements`)
      .join(', ');
  }

  private buildMenuGenerationPrompt(
    restrictionSummary: string,
    mealType: string,
    guestCount: number,
  ): string {
    return `Create an elegant wedding ${mealType} menu for ${guestCount} guests with the following dietary requirements: ${restrictionSummary}.

Requirements:
- All dishes must be wedding-appropriate and elegant
- Provide safe alternatives for each dietary restriction
- Include ingredient lists for allergen identification
- Suggest presentation ideas suitable for formal dining
- Ensure balanced nutrition across the menu
- Consider seasonal ingredients when possible

Format the response as a JSON array of menu items with: name, description, ingredients, allergens, and dietaryFlags.`;
  }

  private parseMenuGenerationResponse(response: string): MenuItem[] {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed)
        ? parsed.map((item, index) => ({
            id: `generated-${Date.now()}-${index}`,
            ...item,
          }))
        : [];
    } catch {
      return this.getFallbackMenu('dinner', []);
    }
  }

  private getFallbackMenu(
    mealType: string,
    restrictions: DietaryRestriction[],
  ): MenuItem[] {
    // Predefined safe menu items for emergencies
    const fallbackItems: MenuItem[] = [
      {
        id: 'safe-salad',
        name: 'Garden Fresh Salad',
        description: 'Mixed greens with olive oil vinaigrette',
        ingredients: ['mixed greens', 'olive oil', 'vinegar', 'herbs'],
        allergens: [],
        dietaryFlags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'],
      },
      {
        id: 'safe-rice',
        name: 'Herb-Seasoned Rice',
        description: 'Aromatic basmati rice with fresh herbs',
        ingredients: ['basmati rice', 'herbs', 'vegetable broth'],
        allergens: [],
        dietaryFlags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'],
      },
    ];

    return fallbackItems;
  }

  private generateRecommendations(
    restrictions: DietaryRestriction[],
    compatibleItems: MenuItem[],
  ): string[] {
    const recommendations: string[] = [];

    if (compatibleItems.length < 3) {
      recommendations.push('Consider adding more dietary-friendly options');
    }

    if (restrictions.some((r) => r.severity === 'life-threatening')) {
      recommendations.push('Ensure emergency medical protocols are in place');
    }

    return recommendations;
  }

  private calculateConfidenceScore(
    restrictions: DietaryRestriction[],
    menuItems: MenuItem[],
  ): number {
    // Calculate confidence based on menu coverage and restriction complexity
    const complexRestrictions = restrictions.filter(
      (r) => r.severity === 'severe' || r.severity === 'life-threatening',
    ).length;

    const baseConfidence = 0.8;
    const complexityPenalty = complexRestrictions * 0.1;
    const coveragePenalty = menuItems.length < 5 ? 0.1 : 0;

    return Math.max(0.1, baseConfidence - complexityPenalty - coveragePenalty);
  }
}
