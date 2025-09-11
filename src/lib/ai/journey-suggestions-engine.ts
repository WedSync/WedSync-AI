/**
 * WS-208: Journey Suggestions Engine
 * AI-powered customer journey generation with OpenAI GPT-4 integration
 * Team B - Backend implementation with vendor-specific logic and performance tracking
 */

import { openai } from '../services/openai-service';
import { createClient } from '@supabase/supabase-js';
import { VendorJourneySpecialist } from '../services/vendor-journey-specialist';
import { z } from 'zod';

// Environment variables validation
const envSchema = z.object({
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  OPENAI_API_KEY: z.string(),
});

const env = envSchema.parse({
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client with service role for backend operations
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Request/Response Types
export interface JourneySuggestionRequest {
  supplierId: string;
  vendorType:
    | 'photographer'
    | 'dj'
    | 'caterer'
    | 'venue'
    | 'planner'
    | 'florist'
    | 'videographer';
  serviceLevel: 'basic' | 'premium' | 'luxury';
  weddingTimeline: number; // months
  clientPreferences?: {
    communicationStyle?: 'formal' | 'friendly' | 'casual';
    frequency?: 'minimal' | 'regular' | 'frequent';
    channelPreference?: 'email' | 'sms' | 'phone' | 'mixed';
    specialRequests?: string[];
  };
  existingJourneyId?: string; // For optimization requests
}

export interface JourneyNode {
  id: string;
  type: 'email' | 'sms' | 'call' | 'meeting' | 'task' | 'milestone';
  name: string;
  timing: {
    days_from_booking: number;
    days_before_wedding: number;
  };
  content: {
    subject?: string;
    template_key?: string;
    personalization_fields?: string[];
    description?: string;
  };
  triggers: string[];
  next_nodes: string[];
  vendor_specific_data: Record<string, any>;
  required: boolean;
  category: 'communication' | 'planning' | 'execution' | 'follow_up';
}

export interface GeneratedJourney {
  id: string;
  journey_name: string;
  total_duration_days: number;
  nodes: JourneyNode[];
  conditional_branches: Array<{
    condition: string;
    true_path: string[];
    false_path: string[];
  }>;
  metadata: {
    generatedAt: Date;
    basedOn: JourneySuggestionRequest;
    confidence: number;
    estimatedPerformance: PerformanceMetrics;
    ai_model: string;
    token_usage: number;
    generation_time_ms: number;
  };
}

export interface PerformanceMetrics {
  predicted_completion_rate: number;
  predicted_engagement_score: number;
  confidence_score: number;
  generation_time_ms: number;
  token_usage: number;
  complexity_score: number;
}

export interface VendorContext {
  bestPractices: string[];
  criticalTouchpoints: Array<{
    name: string;
    timing: number;
    required: boolean;
    channel: string;
  }>;
  industryStandards: Record<string, any>;
  seasonalConsiderations: Record<string, any>;
}

/**
 * Advanced AI-powered journey suggestions engine
 * Generates optimal customer journeys using OpenAI GPT-4 with wedding industry expertise
 */
export class JourneySuggestionsEngine {
  private vendorSpecialist: VendorJourneySpecialist;
  private readonly AI_MODEL = 'gpt-4';
  private readonly MAX_TOKENS = 3000;
  private readonly TEMPERATURE = 0.3; // Lower for more consistent results

  constructor() {
    this.vendorSpecialist = new VendorJourneySpecialist();
  }

  /**
   * Generate a new customer journey using AI
   */
  async generateJourney(
    request: JourneySuggestionRequest,
  ): Promise<GeneratedJourney> {
    const startTime = Date.now();
    let tokenUsage = 0;

    try {
      console.log(
        `[JourneySuggestionsEngine] Starting generation for ${request.vendorType} - ${request.serviceLevel}`,
      );

      // 1. Get vendor-specific context and patterns
      const vendorContext = await this.vendorSpecialist.getVendorContext(
        request.vendorType,
      );
      const industryPatterns = await this.getIndustryPatterns(
        request.vendorType,
        request.serviceLevel,
      );

      // 2. Build structured AI prompt
      const systemPrompt = this.buildJourneyGenerationPrompt(
        request,
        vendorContext,
        industryPatterns,
      );

      // 3. Generate journey using OpenAI
      console.log(
        `[JourneySuggestionsEngine] Calling OpenAI API with prompt length: ${systemPrompt.length}`,
      );

      const aiResponse = await openai.chat.completions.create({
        model: this.AI_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert wedding industry consultant with deep knowledge of vendor workflows and customer journey optimization. Generate structured, actionable journey plans.',
          },
          {
            role: 'user',
            content: systemPrompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: this.TEMPERATURE,
        max_tokens: this.MAX_TOKENS,
      });

      tokenUsage = aiResponse.usage?.total_tokens || 0;
      // SECURITY: Sensitive logging removed;

      // 4. Parse and validate AI response
      const rawJourneyData = JSON.parse(
        aiResponse.choices[0].message.content || '{}',
      );

      // 5. Validate and enhance generated journey
      const validatedJourney = await this.validateAndEnhanceJourney(
        rawJourneyData,
        request,
      );

      // 6. Calculate performance predictions
      const performanceMetrics = await this.predictPerformance(
        validatedJourney,
        request,
      );

      // 7. Store for learning and reuse
      const storedJourneyId = await this.storeGeneratedJourney(
        validatedJourney,
        request,
        performanceMetrics,
        aiResponse.choices[0].message.content || '',
        tokenUsage,
      );

      const generationTime = Date.now() - startTime;
      console.log(
        `[JourneySuggestionsEngine] Journey generation completed in ${generationTime}ms`,
      );

      return {
        id: storedJourneyId,
        journey_name: validatedJourney.journey_name,
        total_duration_days: validatedJourney.total_duration_days,
        nodes: validatedJourney.nodes,
        conditional_branches: validatedJourney.conditional_branches || [],
        metadata: {
          generatedAt: new Date(),
          basedOn: request,
          confidence: performanceMetrics.confidence_score,
          estimatedPerformance: performanceMetrics,
          ai_model: this.AI_MODEL,
          token_usage: tokenUsage,
          generation_time_ms: generationTime,
        },
      };
    } catch (error) {
      console.error('[JourneySuggestionsEngine] Generation failed:', error);

      // Log the error for debugging
      await this.logGenerationError(
        request,
        error as Error,
        Date.now() - startTime,
      );

      throw new JourneyGenerationError(
        `Failed to generate journey: ${error instanceof Error ? error.message : 'Unknown error'}`,
        request.vendorType,
        request.serviceLevel,
      );
    }
  }

  /**
   * Optimize an existing journey
   */
  async optimizeJourney(
    existingJourneyId: string,
    request: JourneySuggestionRequest,
  ): Promise<GeneratedJourney> {
    try {
      // Get existing journey data
      const { data: existingJourney, error } = await supabase
        .from('customer_journeys')
        .select('*')
        .eq('id', existingJourneyId)
        .single();

      if (error || !existingJourney) {
        throw new Error(`Existing journey not found: ${existingJourneyId}`);
      }

      // Get performance data for the existing journey
      const { data: performanceData } = await supabase
        .from('journey_performance_data')
        .select('*')
        .eq('journey_id', existingJourneyId);

      // Build optimization prompt with existing data
      const optimizationPrompt = this.buildOptimizationPrompt(
        existingJourney,
        performanceData || [],
        request,
      );

      // Generate optimized version
      const optimizedRequest = {
        ...request,
        existingJourneyId,
      };

      return await this.generateJourney(optimizedRequest);
    } catch (error) {
      console.error('[JourneySuggestionsEngine] Optimization failed:', error);
      throw new JourneyOptimizationError(
        `Failed to optimize journey: ${error instanceof Error ? error.message : 'Unknown error'}`,
        existingJourneyId,
      );
    }
  }

  /**
   * Build the AI prompt for journey generation
   */
  private buildJourneyGenerationPrompt(
    request: JourneySuggestionRequest,
    vendorContext: VendorContext,
    industryPatterns: any[],
  ): string {
    const timelineDays = request.weddingTimeline * 30; // Convert months to days

    return `You are an expert wedding industry consultant specializing in ${request.vendorType} services.

Create an optimal customer journey for a ${request.vendorType} offering ${request.serviceLevel} service level.

CONTEXT:
- Wedding timeline: ${request.weddingTimeline} months (${timelineDays} days)
- Communication style: ${request.clientPreferences?.communicationStyle || 'friendly'}
- Contact frequency: ${request.clientPreferences?.frequency || 'regular'}
- Channel preference: ${request.clientPreferences?.channelPreference || 'mixed'}
${request.clientPreferences?.specialRequests?.length ? `- Special requests: ${request.clientPreferences.specialRequests.join(', ')}` : ''}

VENDOR BEST PRACTICES FOR ${request.vendorType.toUpperCase()}:
${vendorContext.bestPractices.map((practice) => `• ${practice}`).join('\n')}

CRITICAL TOUCHPOINTS (MUST INCLUDE):
${vendorContext.criticalTouchpoints
  .map(
    (tp) =>
      `• ${tp.name}: ${tp.timing} days before wedding (${tp.required ? 'REQUIRED' : 'optional'}) - Channel: ${tp.channel}`,
  )
  .join('\n')}

INDUSTRY PATTERNS:
${industryPatterns
  .map(
    (pattern) =>
      `• ${pattern.pattern_name}: Success rate ${(pattern.success_rate * 100).toFixed(1)}% - ${pattern.pattern_description}`,
  )
  .join('\n')}

GENERATE a structured customer journey with this EXACT JSON format:

{
  "journey_name": "Descriptive name for this journey",
  "total_duration_days": ${timelineDays},
  "service_level": "${request.serviceLevel}",
  "vendor_type": "${request.vendorType}",
  "nodes": [
    {
      "id": "unique_node_id_1",
      "type": "email|sms|call|meeting|task|milestone",
      "name": "Human-readable node name",
      "timing": {
        "days_from_booking": 0,
        "days_before_wedding": ${timelineDays}
      },
      "content": {
        "subject": "Email/SMS subject line",
        "template_key": "template_reference_name",
        "personalization_fields": ["client_name", "wedding_date", "venue"],
        "description": "Detailed description of this touchpoint"
      },
      "triggers": ["booking_confirmed", "payment_received"],
      "next_nodes": ["node_id_2", "node_id_3"],
      "vendor_specific_data": {
        "equipment_prep": true,
        "timeline_buffer": 7,
        "backup_plan": "alternative_approach"
      },
      "required": true,
      "category": "communication|planning|execution|follow_up"
    }
  ],
  "conditional_branches": [
    {
      "condition": "client_response_positive",
      "true_path": ["engagement_session_node"],
      "false_path": ["standard_planning_node"]
    }
  ],
  "optimization_notes": [
    "Why this sequence works for ${request.serviceLevel} level",
    "Key success factors for ${request.vendorType} workflows"
  ]
}

REQUIREMENTS:
1. Include ALL critical touchpoints from the list above
2. Ensure logical timing sequence (no overlaps or gaps)
3. Add ${request.serviceLevel}-specific touchpoints and quality levels
4. Include conditional logic for different client response scenarios
5. Optimize for ${request.clientPreferences?.frequency || 'regular'} communication frequency
6. Consider seasonal wedding industry factors
7. Each node must have realistic timing relative to booking and wedding date
8. Include vendor-specific data relevant to ${request.vendorType} operations
9. Ensure all nodes connect logically (next_nodes references must exist)
10. Balance automation with personal touch based on service level

TIMING GUIDELINES:
- Booking confirmation: Day 0 (immediately)
- Initial planning: Within first 2 weeks
- Major milestones: Spaced evenly across timeline
- Final preparations: Last 2 weeks before wedding
- Follow-up: Within 1 week after wedding

Generate a journey that maximizes client satisfaction while being operationally efficient for the vendor.`;
  }

  /**
   * Build optimization prompt for existing journeys
   */
  private buildOptimizationPrompt(
    existingJourney: any,
    performanceData: any[],
    request: JourneySuggestionRequest,
  ): string {
    const avgCompletion =
      performanceData.reduce(
        (sum, p) => sum + (p.actual_completion_rate || 0),
        0,
      ) / performanceData.length;
    const avgSatisfaction =
      performanceData.reduce(
        (sum, p) => sum + (p.client_satisfaction_score || 0),
        0,
      ) / performanceData.length;

    return `Optimize this existing customer journey based on performance data.

CURRENT JOURNEY: ${existingJourney.name}
PERFORMANCE METRICS:
- Average completion rate: ${(avgCompletion * 100).toFixed(1)}%
- Average satisfaction score: ${avgSatisfaction.toFixed(1)}/5
- Total performance data points: ${performanceData.length}

IMPROVEMENT AREAS IDENTIFIED:
${performanceData
  .map((p) => p.performance_notes)
  .filter((n) => n)
  .join('\n')}

COMMON MODIFICATIONS MADE:
${performanceData.map((p) => JSON.stringify(p.modifications_made)).join('\n')}

Generate an optimized version that addresses these performance gaps while maintaining the core journey structure.`;
  }

  /**
   * Validate and enhance the AI-generated journey
   */
  private async validateAndEnhanceJourney(
    rawJourneyData: any,
    request: JourneySuggestionRequest,
  ): Promise<any> {
    // Basic structure validation
    if (
      !rawJourneyData.journey_name ||
      !rawJourneyData.nodes ||
      !Array.isArray(rawJourneyData.nodes)
    ) {
      throw new AIValidationError('Invalid journey structure from AI response');
    }

    // Validate timing logic
    for (let i = 0; i < rawJourneyData.nodes.length; i++) {
      const node = rawJourneyData.nodes[i];

      if (!node.timing || typeof node.timing.days_from_booking !== 'number') {
        throw new AIValidationError(`Invalid timing for node ${node.id || i}`);
      }

      // Ensure timing makes sense
      if (node.timing.days_from_booking < 0) {
        node.timing.days_from_booking = 0;
      }
    }

    // Sort nodes by timing
    rawJourneyData.nodes.sort(
      (a: any, b: any) =>
        a.timing.days_from_booking - b.timing.days_from_booking,
    );

    // Add vendor-specific enhancements
    const enhancedJourney = await this.vendorSpecialist.enhanceJourney(
      rawJourneyData,
      request,
    );

    return enhancedJourney;
  }

  /**
   * Predict performance metrics for the generated journey
   */
  private async predictPerformance(
    journey: any,
    request: JourneySuggestionRequest,
  ): Promise<PerformanceMetrics> {
    try {
      // Get historical data for similar journeys
      const { data: historicalData } = await supabase.rpc(
        'get_ai_journey_suggestions',
        {
          p_vendor_type: request.vendorType,
          p_service_level: request.serviceLevel,
          p_timeline_months: request.weddingTimeline,
          p_limit: 10,
        },
      );

      // Calculate predictions based on journey complexity and historical data
      const complexityScore = this.calculateComplexityScore(journey);
      const baseCompletionRate =
        historicalData?.length > 0
          ? historicalData.reduce(
              (sum: number, j: any) => sum + j.avg_completion_rate,
              0,
            ) / historicalData.length
          : 0.75; // Default estimate

      const adjustedCompletionRate = Math.min(
        1.0,
        baseCompletionRate * (1 - (complexityScore - 0.5) * 0.2),
      );

      const engagementScore = this.predictEngagementScore(journey, request);
      const confidenceScore = Math.min(
        1.0,
        ((historicalData?.length || 0) / 10) * 0.8 + 0.2,
      );

      return {
        predicted_completion_rate: Number(adjustedCompletionRate.toFixed(4)),
        predicted_engagement_score: Number(engagementScore.toFixed(4)),
        confidence_score: Number(confidenceScore.toFixed(4)),
        generation_time_ms: 0, // Will be set by caller
        token_usage: 0, // Will be set by caller
        complexity_score: Number(complexityScore.toFixed(4)),
      };
    } catch (error) {
      console.error(
        '[JourneySuggestionsEngine] Performance prediction failed:',
        error,
      );

      // Return default predictions if calculation fails
      return {
        predicted_completion_rate: 0.75,
        predicted_engagement_score: 0.7,
        confidence_score: 0.5,
        generation_time_ms: 0,
        token_usage: 0,
        complexity_score: 0.5,
      };
    }
  }

  /**
   * Calculate complexity score based on journey characteristics
   */
  private calculateComplexityScore(journey: any): number {
    const nodeCount = journey.nodes?.length || 0;
    const branchCount = journey.conditional_branches?.length || 0;
    const avgChannels =
      journey.nodes?.reduce((sum: number, node: any) => {
        return sum + (node.type === 'mixed' ? 3 : 1);
      }, 0) / nodeCount || 1;

    // Normalize to 0-1 scale
    const nodeComplexity = Math.min(1.0, nodeCount / 20);
    const branchComplexity = Math.min(1.0, branchCount / 10);
    const channelComplexity = Math.min(1.0, avgChannels / 3);

    return (nodeComplexity + branchComplexity + channelComplexity) / 3;
  }

  /**
   * Predict engagement score based on journey characteristics
   */
  private predictEngagementScore(
    journey: any,
    request: JourneySuggestionRequest,
  ): number {
    let score = 0.7; // Base score

    // Service level adjustment
    const serviceLevelBonus = {
      basic: 0.0,
      premium: 0.1,
      luxury: 0.2,
    };
    score += serviceLevelBonus[request.serviceLevel];

    // Communication style adjustment
    if (request.clientPreferences?.communicationStyle === 'friendly') {
      score += 0.05;
    }

    // Channel preference alignment
    const multiChannel = journey.nodes?.some(
      (node: any) => node.type !== journey.nodes[0]?.type,
    );
    if (
      multiChannel &&
      request.clientPreferences?.channelPreference === 'mixed'
    ) {
      score += 0.05;
    }

    return Math.min(1.0, score);
  }

  /**
   * Store generated journey for learning and reuse
   */
  private async storeGeneratedJourney(
    journey: any,
    request: JourneySuggestionRequest,
    performanceMetrics: PerformanceMetrics,
    aiPromptUsed: string,
    tokenUsage: number,
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('ai_generated_journeys')
        .insert({
          supplier_id: request.supplierId,
          vendor_type: request.vendorType,
          service_level: request.serviceLevel,
          wedding_timeline_months: request.weddingTimeline,
          client_preferences: request.clientPreferences || {},
          generated_structure: journey,
          ai_model: this.AI_MODEL,
          ai_prompt_used: aiPromptUsed,
          generation_metadata: {
            request_timestamp: new Date().toISOString(),
            preferences: request.clientPreferences,
            token_usage: tokenUsage,
          },
          performance_metrics: performanceMetrics,
        })
        .select('id')
        .single();

      if (error) {
        console.error(
          '[JourneySuggestionsEngine] Failed to store journey:',
          error,
        );
        throw new Error(`Failed to store generated journey: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      console.error('[JourneySuggestionsEngine] Storage error:', error);
      throw error;
    }
  }

  /**
   * Get industry patterns for the vendor type and service level
   */
  private async getIndustryPatterns(
    vendorType: string,
    serviceLevel: string,
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('vendor_journey_patterns')
        .select('*')
        .eq('vendor_type', vendorType)
        .in('service_level', [serviceLevel, 'all'])
        .order('success_rate', { ascending: false })
        .limit(5);

      if (error) {
        console.error(
          '[JourneySuggestionsEngine] Failed to get industry patterns:',
          error,
        );
        return [];
      }

      return data || [];
    } catch (error) {
      console.error(
        '[JourneySuggestionsEngine] Industry patterns error:',
        error,
      );
      return [];
    }
  }

  /**
   * Log generation errors for debugging
   */
  private async logGenerationError(
    request: JourneySuggestionRequest,
    error: Error,
    processingTimeMs: number,
  ): Promise<void> {
    try {
      await supabase.from('ai_generation_audit_log').insert({
        supplier_id: request.supplierId,
        request_type: 'generate_new',
        request_data: request,
        ai_model_used: this.AI_MODEL,
        processing_time_ms: processingTimeMs,
        response_status: 'error',
        error_details: error.message,
      });
    } catch (logError) {
      console.error(
        '[JourneySuggestionsEngine] Failed to log error:',
        logError,
      );
    }
  }
}

// Custom error classes
export class JourneyGenerationError extends Error {
  constructor(
    message: string,
    public vendorType: string,
    public serviceLevel: string,
  ) {
    super(message);
    this.name = 'JourneyGenerationError';
  }
}

export class JourneyOptimizationError extends Error {
  constructor(
    message: string,
    public journeyId: string,
  ) {
    super(message);
    this.name = 'JourneyOptimizationError';
  }
}

export class AIValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIValidationError';
  }
}

// Export singleton instance
export const journeySuggestionsEngine = new JourneySuggestionsEngine();
