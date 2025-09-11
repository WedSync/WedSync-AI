/**
 * WS-158: AI-Powered Task Category Suggestion Engine
 * Provides intelligent category recommendations using OpenAI
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { z } from 'zod';

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const redis = Redis.fromEnv();

// Category definitions with wedding context
export const TASK_CATEGORIES = {
  SETUP: {
    id: 'setup',
    name: 'Setup & Preparation',
    color: '#3B82F6', // blue
    phase: 'pre-event',
    priority: 1,
    keywords: ['setup', 'prepare', 'arrange', 'decorate', 'ready'],
  },
  CEREMONY: {
    id: 'ceremony',
    name: 'Ceremony',
    color: '#8B5CF6', // purple
    phase: 'event',
    priority: 2,
    keywords: ['ceremony', 'vows', 'processional', 'rings', 'officiant'],
  },
  RECEPTION: {
    id: 'reception',
    name: 'Reception',
    color: '#10B981', // green
    phase: 'event',
    priority: 3,
    keywords: ['reception', 'dinner', 'dance', 'toast', 'cake', 'party'],
  },
  BREAKDOWN: {
    id: 'breakdown',
    name: 'Breakdown & Cleanup',
    color: '#F59E0B', // amber
    phase: 'post-event',
    priority: 4,
    keywords: ['cleanup', 'pack', 'breakdown', 'return', 'dispose'],
  },
  COORDINATION: {
    id: 'coordination',
    name: 'Coordination & Communication',
    color: '#EF4444', // red
    phase: 'all',
    priority: 0,
    keywords: ['coordinate', 'communicate', 'manage', 'direct', 'oversee'],
  },
  VENDOR: {
    id: 'vendor',
    name: 'Vendor Management',
    color: '#06B6D4', // cyan
    phase: 'all',
    priority: 0,
    keywords: ['vendor', 'supplier', 'delivery', 'catering', 'photographer'],
  },
};

// Schema for category suggestion
const CategorySuggestionSchema = z.object({
  taskId: z.string(),
  suggestedCategory: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  alternativeCategories: z.array(
    z.object({
      category: z.string(),
      confidence: z.number(),
    }),
  ),
  contextualFactors: z.object({
    timeOfDay: z.string().optional(),
    dependencies: z.array(z.string()),
    helperSkillsRequired: z.array(z.string()),
  }),
});

export type CategorySuggestion = z.infer<typeof CategorySuggestionSchema>;

/**
 * Main AI Category Suggestion Engine
 */
export class CategorySuggestionEngine {
  private cachePrefix = 'category:suggestion:';
  private modelVersion = 'gpt-4-turbo-preview';
  private maxRetries = 3;
  private cacheTTL = 3600; // 1 hour

  /**
   * Generate category suggestion for a single task
   */
  async suggestCategory(task: {
    id: string;
    title: string;
    description?: string;
    timeSlot?: string;
    dependencies?: string[];
    helperSkills?: string[];
  }): Promise<CategorySuggestion> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = `${this.cachePrefix}${task.id}`;
    const cached = await this.getCachedSuggestion(cacheKey);
    if (cached) {
      await this.recordMetrics('cache_hit', Date.now() - startTime);
      return cached;
    }

    try {
      // Prepare context for AI
      const context = this.prepareTaskContext(task);

      // Get AI suggestion
      const suggestion = await this.getAISuggestion(context);

      // Validate and enhance suggestion
      const enhancedSuggestion = await this.enhanceSuggestion(suggestion, task);

      // Cache the result
      await this.cacheSuggestion(cacheKey, enhancedSuggestion);

      // Record metrics
      await this.recordMetrics('ai_suggestion', Date.now() - startTime);

      return enhancedSuggestion;
    } catch (error) {
      console.error('Error generating category suggestion:', error);
      // Fall back to rule-based suggestion
      return this.getRuleBasedSuggestion(task);
    }
  }

  /**
   * Bulk suggest categories for multiple tasks
   */
  async suggestCategoriesBulk(
    tasks: Array<{
      id: string;
      title: string;
      description?: string;
      timeSlot?: string;
      dependencies?: string[];
      helperSkills?: string[];
    }>,
  ): Promise<CategorySuggestion[]> {
    const startTime = Date.now();

    // Process in batches for efficiency
    const batchSize = 10;
    const suggestions: CategorySuggestion[] = [];

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchSuggestions = await Promise.all(
        batch.map((task) => this.suggestCategory(task)),
      );
      suggestions.push(...batchSuggestions);
    }

    // Optimize category distribution
    const optimizedSuggestions = await this.optimizeCategoryDistribution(
      suggestions,
      tasks,
    );

    await this.recordMetrics('bulk_suggestion', Date.now() - startTime, {
      taskCount: tasks.length,
    });

    return optimizedSuggestions;
  }

  /**
   * Prepare task context for AI processing
   */
  private prepareTaskContext(task: any): string {
    const categories = Object.values(TASK_CATEGORIES)
      .map((cat) => `${cat.name} (${cat.phase}): ${cat.keywords.join(', ')}`)
      .join('\n');

    return `
Task Analysis for Wedding Event:
Title: ${task.title}
Description: ${task.description || 'Not provided'}
Time Slot: ${task.timeSlot || 'Not specified'}
Dependencies: ${task.dependencies?.join(', ') || 'None'}
Required Skills: ${task.helperSkills?.join(', ') || 'General'}

Available Categories:
${categories}

Please analyze this task and suggest the most appropriate category based on:
1. The task content and context
2. Typical wedding workflow phases
3. Dependencies and timing
4. Required skills

Provide your response in JSON format with:
- suggestedCategory: the category ID
- confidence: 0-1 confidence score
- reasoning: brief explanation
- alternativeCategories: array of {category, confidence} for other possibilities
`;
  }

  /**
   * Get AI suggestion from OpenAI
   */
  private async getAISuggestion(context: string): Promise<any> {
    const response = await openai.chat.completions.create({
      model: this.modelVersion,
      messages: [
        {
          role: 'system',
          content:
            'You are a wedding planning expert helping categorize tasks for optimal workflow management.',
        },
        {
          role: 'user',
          content: context,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result;
  }

  /**
   * Enhance AI suggestion with additional logic
   */
  private async enhanceSuggestion(
    suggestion: any,
    task: any,
  ): Promise<CategorySuggestion> {
    // Add contextual factors
    const enhanced = {
      ...suggestion,
      taskId: task.id,
      contextualFactors: {
        timeOfDay: task.timeSlot,
        dependencies: task.dependencies || [],
        helperSkillsRequired: task.helperSkills || [],
      },
    };

    // Validate category exists
    const validCategories = Object.keys(TASK_CATEGORIES);
    if (!validCategories.includes(enhanced.suggestedCategory)) {
      enhanced.suggestedCategory = this.findBestMatchCategory(task.title);
      enhanced.confidence = 0.5;
    }

    // Ensure alternatives are valid
    enhanced.alternativeCategories = (enhanced.alternativeCategories || [])
      .filter((alt: any) => validCategories.includes(alt.category))
      .slice(0, 3);

    return CategorySuggestionSchema.parse(enhanced);
  }

  /**
   * Rule-based fallback for category suggestion
   */
  private getRuleBasedSuggestion(task: any): CategorySuggestion {
    const title = task.title.toLowerCase();
    const description = (task.description || '').toLowerCase();
    const combined = `${title} ${description}`;

    let bestMatch = 'coordination';
    let bestScore = 0;

    for (const [key, category] of Object.entries(TASK_CATEGORIES)) {
      const score = category.keywords.reduce((acc, keyword) => {
        if (combined.includes(keyword)) {
          return acc + 1;
        }
        return acc;
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = category.id;
      }
    }

    return {
      taskId: task.id,
      suggestedCategory: bestMatch,
      confidence: Math.min(bestScore * 0.2, 0.8),
      reasoning: 'Rule-based matching on keywords',
      alternativeCategories: [],
      contextualFactors: {
        timeOfDay: task.timeSlot,
        dependencies: task.dependencies || [],
        helperSkillsRequired: task.helperSkills || [],
      },
    };
  }

  /**
   * Find best matching category based on title
   */
  private findBestMatchCategory(title: string): string {
    const titleLower = title.toLowerCase();

    for (const [key, category] of Object.entries(TASK_CATEGORIES)) {
      if (category.keywords.some((keyword) => titleLower.includes(keyword))) {
        return category.id;
      }
    }

    return 'coordination'; // Default fallback
  }

  /**
   * Optimize category distribution across tasks
   */
  private async optimizeCategoryDistribution(
    suggestions: CategorySuggestion[],
    tasks: any[],
  ): Promise<CategorySuggestion[]> {
    // Count current distribution
    const distribution = suggestions.reduce(
      (acc, s) => {
        acc[s.suggestedCategory] = (acc[s.suggestedCategory] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate ideal distribution based on wedding phases
    const totalTasks = tasks.length;
    const idealDistribution = {
      setup: Math.round(totalTasks * 0.25),
      ceremony: Math.round(totalTasks * 0.15),
      reception: Math.round(totalTasks * 0.3),
      breakdown: Math.round(totalTasks * 0.15),
      coordination: Math.round(totalTasks * 0.1),
      vendor: Math.round(totalTasks * 0.05),
    };

    // Rebalance if needed
    const optimized = [...suggestions];

    for (const [category, idealCount] of Object.entries(idealDistribution)) {
      const currentCount = distribution[category] || 0;

      if (currentCount > idealCount * 1.5) {
        // Too many in this category, redistribute some
        const toRebalance = optimized
          .filter((s) => s.suggestedCategory === category && s.confidence < 0.7)
          .slice(0, currentCount - idealCount);

        for (const suggestion of toRebalance) {
          if (suggestion.alternativeCategories.length > 0) {
            const alt = suggestion.alternativeCategories[0];
            suggestion.suggestedCategory = alt.category;
            suggestion.confidence = alt.confidence;
            suggestion.reasoning = 'Rebalanced for optimal distribution';
          }
        }
      }
    }

    return optimized;
  }

  /**
   * Cache suggestion for performance
   */
  private async cacheSuggestion(
    key: string,
    suggestion: CategorySuggestion,
  ): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(suggestion), {
        ex: this.cacheTTL,
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Get cached suggestion
   */
  private async getCachedSuggestion(
    key: string,
  ): Promise<CategorySuggestion | null> {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached as string);
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return null;
  }

  /**
   * Record performance metrics
   */
  private async recordMetrics(
    operation: string,
    duration: number,
    metadata?: any,
  ): Promise<void> {
    try {
      await supabase.from('category_performance_metrics').insert({
        operation,
        duration_ms: duration,
        metadata,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Metrics recording error:', error);
    }
  }
}

// Export singleton instance
export const categorySuggestionEngine = new CategorySuggestionEngine();
