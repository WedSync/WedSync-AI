/**
 * OpenAI Service - Integration with OpenAI API for AI-powered features
 * Used by WS-127 Photography AI system and other ML components
 */

import OpenAI from 'openai';

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: false, // Server-side only for security
});

export interface OpenAIImageAnalysisRequest {
  imageBase64: string;
  analysisType: 'wedding_photo' | 'document' | 'general';
  maxTokens?: number;
  temperature?: number;
}

export interface OpenAIImageAnalysisResponse {
  analysis: any;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  processing_time_ms: number;
}

/**
 * OpenAI Service Class
 * Provides structured access to OpenAI APIs with error handling and rate limiting
 */
export class OpenAIService {
  private readonly defaultModel = 'gpt-4-vision-preview';
  private requestQueue = new Map<string, Promise<any>>();
  private rateLimitTracker = {
    requests: 0,
    resetTime: Date.now() + 60000, // Reset every minute
  };

  /**
   * Analyze image content using OpenAI Vision API
   */
  async analyzeImage(
    request: OpenAIImageAnalysisRequest,
  ): Promise<OpenAIImageAnalysisResponse> {
    const startTime = Date.now();

    try {
      // Check rate limits
      this.checkRateLimit();

      // Build prompt based on analysis type
      const prompt = this.buildAnalysisPrompt(request.analysisType);

      // Make OpenAI API call
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${request.imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.3,
      });

      // Track rate limit
      this.rateLimitTracker.requests++;

      return {
        analysis: this.parseResponse(response.choices[0].message.content),
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        },
        model: response.model,
        processing_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error('OpenAI image analysis failed:', error);
      throw new Error(`OpenAI analysis failed: ${error.message}`);
    }
  }

  /**
   * Generate text completions for various AI tasks
   */
  async generateCompletion(
    prompt: string,
    options: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
      system_prompt?: string;
    } = {},
  ): Promise<{
    text: string;
    usage: OpenAI.CompletionUsage;
    model: string;
  }> {
    try {
      this.checkRateLimit();

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      if (options.system_prompt) {
        messages.push({ role: 'system', content: options.system_prompt });
      }

      messages.push({ role: 'user', content: prompt });

      const response = await openai.chat.completions.create({
        model: options.model || 'gpt-4',
        messages,
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7,
      });

      this.rateLimitTracker.requests++;

      return {
        text: response.choices[0].message.content || '',
        usage: response.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
        model: response.model,
      };
    } catch (error) {
      console.error('OpenAI completion failed:', error);
      throw new Error(`OpenAI completion failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for text content
   */
  async generateEmbedding(
    text: string,
    model = 'text-embedding-3-small',
  ): Promise<{
    embedding: number[];
    usage: { prompt_tokens: number; total_tokens: number };
  }> {
    try {
      this.checkRateLimit();

      const response = await openai.embeddings.create({
        model,
        input: text,
      });

      this.rateLimitTracker.requests++;

      return {
        embedding: response.data[0].embedding,
        usage: response.usage,
      };
    } catch (error) {
      console.error('OpenAI embedding generation failed:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  // Helper methods
  private checkRateLimit(): void {
    const now = Date.now();

    if (now > this.rateLimitTracker.resetTime) {
      this.rateLimitTracker.requests = 0;
      this.rateLimitTracker.resetTime = now + 60000;
    }

    if (this.rateLimitTracker.requests >= 50) {
      // Conservative limit
      throw new Error('Rate limit exceeded. Please try again later.');
    }
  }

  private buildAnalysisPrompt(analysisType: string): string {
    switch (analysisType) {
      case 'wedding_photo':
        return `Analyze this wedding photo and provide detailed insights in JSON format:

{
  "primary_category": "ceremony|reception|portrait|detail|candid|venue|preparation|family|couple",
  "categories": [
    {
      "category": "category_name",
      "confidence": 0.95,
      "subcategory": "specific_subcategory",
      "reasoning": "why this categorization"
    }
  ],
  "confidence": 0.95,
  "quality_score": 8,
  "technical_assessment": {
    "brightness": "good|needs_adjustment",
    "contrast": "good|needs_adjustment", 
    "sharpness": "good|needs_adjustment",
    "composition": "excellent|good|needs_improvement",
    "color_balance": "good|needs_adjustment"
  },
  "enhancement_suggestions": [
    {
      "type": "brightness|contrast|saturation|sharpness|color_correction",
      "priority": "high|medium|low",
      "description": "specific improvement needed"
    }
  ],
  "tags": [
    {
      "tag": "descriptive_tag",
      "confidence": 0.9,
      "category": "object|action|emotion|setting|style"
    }
  ],
  "emotion_analysis": {
    "overall_mood": "joyful|romantic|formal|celebratory|intimate|energetic",
    "emotion_scores": {
      "happiness": 0.8,
      "excitement": 0.6,
      "romance": 0.4,
      "formality": 0.3,
      "energy_level": 0.7
    },
    "confidence": 0.75
  },
  "scene_analysis": {
    "setting": "indoor|outdoor|mixed",
    "lighting": "natural|artificial|mixed|low_light",
    "composition": "portrait|landscape|close_up|wide_shot|group",
    "color_palette": ["#FF6B6B", "#4ECDC4"],
    "aesthetic_score": 8
  },
  "people_analysis": {
    "approximate_count": 2,
    "main_subjects": ["bride", "groom", "family", "friends"],
    "expressions": "happy|neutral|surprised|formal"
  }
}

Provide accurate, confident analysis with numerical scores where requested.`;

      case 'document':
        return `Extract and analyze the content of this document. Identify key information, structure, and any actionable items.`;

      default:
        return `Analyze this image and describe its content, quality, and notable features.`;
    }
  }

  private parseResponse(content: string | null): any {
    if (!content) return {};

    try {
      // Try to extract JSON from response
      const jsonMatch =
        content.match(/```json\n?(.*?)\n?```/s) || content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }

      // If no JSON found, return the raw content
      return { raw_response: content };
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      return { raw_response: content, parse_error: true };
    }
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();
