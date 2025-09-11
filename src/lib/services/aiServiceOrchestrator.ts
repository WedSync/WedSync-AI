/**
 * AI Service Orchestrator - Team C Implementation
 * Multi-provider AI service coordination with intelligent selection
 * Supports: OpenAI Vision, Google Cloud Vision, AWS Textract, Azure Cognitive Services
 */

import OpenAI from 'openai';
import { GoogleAuth } from 'google-auth-library';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import {
  TextractClient,
  AnalyzeDocumentCommand,
} from '@aws-sdk/client-textract';
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { CognitiveServicesCredentials } from '@azure/ms-rest-azure-js';

// Core types for AI processing
interface AIServiceProvider {
  name: 'openai' | 'google' | 'aws' | 'azure';
  capabilities: AICapability[];
  costPerCall: number;
  reliability: number;
  processingSpeed: number;
  specialties: string[];
  isHealthy: boolean;
  lastHealthCheck: Date;
}

interface AICapability {
  type:
    | 'vision_analysis'
    | 'ocr_extraction'
    | 'layout_analysis'
    | 'form_understanding';
  quality: number; // 1-100
  speed: number; // processing time in ms
  accuracy: number; // accuracy percentage
}

interface AIProcessingRequest {
  type: 'vision_analysis' | 'ocr_extraction' | 'layout_analysis';
  data: ProcessingData;
  qualityRequirements: QualityRequirements;
  costConstraints: CostConstraints;
  urgency: 'low' | 'medium' | 'high';
  weddingContext?: WeddingContext;
}

interface ProcessingData {
  imageUrl?: string;
  imageBuffer?: Buffer;
  mimeType: string;
  filename: string;
}

interface QualityRequirements {
  minimumAccuracy: number;
  requiresHighPrecision: boolean;
  needsWeddingContext: boolean;
}

interface CostConstraints {
  maxCostPerCall: number;
  budgetPriority: 'cost_first' | 'balanced' | 'quality_first';
}

interface WeddingContext {
  formType: 'contract' | 'questionnaire' | 'invoice' | 'timeline' | 'other';
  supplierType: 'photographer' | 'venue' | 'caterer' | 'florist' | 'other';
  expectedFields: string[];
}

interface AIProcessingResult {
  provider: string;
  result: any;
  confidence: number;
  processingTime: number;
  cost: number;
  metadata: {
    modelUsed: string;
    tokensUsed?: number;
    requestId: string;
    timestamp: Date;
  };
}

class AICostTracker {
  private costs: Map<string, number> = new Map();

  async recordUsage(usage: {
    provider: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    cost: number;
    processingTime: number;
  }): Promise<void> {
    const key = `${usage.provider}-${new Date().toISOString().split('T')[0]}`;
    const currentCost = this.costs.get(key) || 0;
    this.costs.set(key, currentCost + usage.cost);

    // Store in database for permanent tracking
    // TODO: Implement database storage
  }

  async getCosts(options: {
    timeRange: string;
    groupBy: string[];
  }): Promise<any> {
    // Implementation for cost retrieval
    return {
      total: Array.from(this.costs.values()).reduce((a, b) => a + b, 0),
      breakdown: Object.fromEntries(this.costs),
    };
  }
}

class AILoadBalancer {
  private requestCounts: Map<string, number> = new Map();
  private lastRequest: Map<string, Date> = new Map();

  async selectProvider(
    candidates: AIServiceProvider[],
    request: AIProcessingRequest,
  ): Promise<AIServiceProvider> {
    // Simple round-robin with health check
    const healthyProviders = candidates.filter((p) => p.isHealthy);

    if (healthyProviders.length === 0) {
      throw new Error('No healthy AI providers available');
    }

    // Select provider with lowest recent request count
    return healthyProviders.reduce((min, current) => {
      const minCount = this.requestCounts.get(min.name) || 0;
      const currentCount = this.requestCounts.get(current.name) || 0;
      return currentCount < minCount ? current : min;
    });
  }

  recordRequest(providerName: string): void {
    const count = this.requestCounts.get(providerName) || 0;
    this.requestCounts.set(providerName, count + 1);
    this.lastRequest.set(providerName, new Date());
  }
}

export class AIServiceOrchestrator {
  private readonly providers: Map<string, AIServiceProvider> = new Map();
  private readonly loadBalancer: AILoadBalancer;
  private readonly costTracker: AICostTracker;

  // AI service clients
  private openaiClient: OpenAI;
  private googleVisionClient?: ImageAnnotatorClient;
  private textractClient?: TextractClient;
  private azureVisionClient?: ComputerVisionClient;

  constructor() {
    this.loadBalancer = new AILoadBalancer();
    this.costTracker = new AICostTracker();
    this.initializeProviders();
    this.initializeClients();
  }

  private initializeProviders(): void {
    // OpenAI GPT-4 Vision
    this.providers.set('openai', {
      name: 'openai',
      capabilities: [
        { type: 'vision_analysis', quality: 95, speed: 5000, accuracy: 92 },
        { type: 'form_understanding', quality: 90, speed: 6000, accuracy: 88 },
      ],
      costPerCall: 0.01, // $0.01 per request (estimated)
      reliability: 95,
      processingSpeed: 5000, // 5 seconds average
      specialties: ['wedding_forms', 'complex_layouts', 'handwriting'],
      isHealthy: true,
      lastHealthCheck: new Date(),
    });

    // Google Cloud Vision
    this.providers.set('google', {
      name: 'google',
      capabilities: [
        { type: 'ocr_extraction', quality: 98, speed: 2000, accuracy: 96 },
        { type: 'layout_analysis', quality: 85, speed: 3000, accuracy: 82 },
      ],
      costPerCall: 0.0015, // $0.0015 per request
      reliability: 98,
      processingSpeed: 2500,
      specialties: ['ocr', 'document_structure', 'multilingual'],
      isHealthy: true,
      lastHealthCheck: new Date(),
    });

    // AWS Textract
    this.providers.set('aws', {
      name: 'aws',
      capabilities: [
        { type: 'ocr_extraction', quality: 94, speed: 3500, accuracy: 91 },
        { type: 'layout_analysis', quality: 92, speed: 4000, accuracy: 89 },
      ],
      costPerCall: 0.002, // $0.002 per request
      reliability: 96,
      processingSpeed: 3500,
      specialties: ['forms', 'tables', 'structured_documents'],
      isHealthy: process.env.AWS_ACCESS_KEY_ID ? true : false,
      lastHealthCheck: new Date(),
    });

    // Azure Cognitive Services
    this.providers.set('azure', {
      name: 'azure',
      capabilities: [
        { type: 'vision_analysis', quality: 88, speed: 4000, accuracy: 85 },
        { type: 'ocr_extraction', quality: 90, speed: 3000, accuracy: 87 },
      ],
      costPerCall: 0.001, // $0.001 per request
      reliability: 92,
      processingSpeed: 3500,
      specialties: ['forms', 'receipts', 'business_documents'],
      isHealthy: process.env.AZURE_COMPUTER_VISION_KEY ? true : false,
      lastHealthCheck: new Date(),
    });
  }

  private initializeClients(): void {
    // OpenAI (already available in WedSync)
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Google Cloud Vision
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.googleVisionClient = new ImageAnnotatorClient();
    }

    // AWS Textract
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.textractClient = new TextractClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    }

    // Azure Cognitive Services
    if (
      process.env.AZURE_COMPUTER_VISION_KEY &&
      process.env.AZURE_COMPUTER_VISION_ENDPOINT
    ) {
      const credentials = new CognitiveServicesCredentials(
        process.env.AZURE_COMPUTER_VISION_KEY,
      );
      this.azureVisionClient = new ComputerVisionClient(
        credentials,
        process.env.AZURE_COMPUTER_VISION_ENDPOINT,
      );
    }
  }

  async processWithOptimalProvider(
    request: AIProcessingRequest,
  ): Promise<AIProcessingResult> {
    // Select optimal provider based on requirements
    const provider = await this.selectOptimalProvider(request);

    try {
      let result: AIProcessingResult;

      switch (provider.name) {
        case 'openai':
          result = await this.processWithOpenAI(request);
          break;
        case 'google':
          result = await this.processWithGoogleVision(request);
          break;
        case 'aws':
          result = await this.processWithAWSTextract(request);
          break;
        case 'azure':
          result = await this.processWithAzureCognitive(request);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider.name}`);
      }

      // Record successful usage
      this.loadBalancer.recordRequest(provider.name);

      return result;
    } catch (error) {
      console.error(`Provider ${provider.name} failed:`, error);

      // Fallback to secondary provider
      const fallbackProvider = await this.selectFallbackProvider(
        request,
        provider,
      );
      if (fallbackProvider) {
        return await this.processWithFallbackProvider(
          request,
          fallbackProvider,
        );
      }

      throw error;
    }
  }

  private async selectOptimalProvider(
    request: AIProcessingRequest,
  ): Promise<AIServiceProvider> {
    const candidates = Array.from(this.providers.values()).filter(
      (p) => this.supportsRequest(p, request) && p.isHealthy,
    );

    if (candidates.length === 0) {
      throw new Error('No suitable AI providers available for this request');
    }

    // Score providers based on requirements
    const scoredProviders = candidates.map((provider) => ({
      provider,
      score: this.calculateProviderScore(provider, request),
    }));

    // Sort by score and select best
    scoredProviders.sort((a, b) => b.score - a.score);
    return scoredProviders[0].provider;
  }

  private calculateProviderScore(
    provider: AIServiceProvider,
    request: AIProcessingRequest,
  ): number {
    let score = 0;

    // Cost efficiency (30% weight)
    const costScore = Math.max(
      0,
      100 -
        (provider.costPerCall / request.costConstraints.maxCostPerCall) * 100,
    );
    score += costScore * 0.3;

    // Quality/reliability (40% weight)
    score += provider.reliability * 0.4;

    // Speed (20% weight)
    const speedScore =
      request.urgency === 'high'
        ? provider.processingSpeed
        : provider.processingSpeed * 0.5;
    const normalizedSpeedScore = Math.max(0, 100 - (speedScore / 10000) * 100); // Normalize to 0-100
    score += normalizedSpeedScore * 0.2;

    // Specialization match (10% weight)
    const specializationBonus = provider.specialties.includes('wedding_forms')
      ? 10
      : 0;
    score += specializationBonus * 0.1;

    return score;
  }

  private supportsRequest(
    provider: AIServiceProvider,
    request: AIProcessingRequest,
  ): boolean {
    return provider.capabilities.some((cap) => cap.type === request.type);
  }

  private async processWithOpenAI(
    request: AIProcessingRequest,
  ): Promise<AIProcessingResult> {
    const startTime = Date.now();

    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: this.generateWeddingFormPrompt(
                request.type,
                request.weddingContext,
              ),
            },
            {
              type: 'image_url',
              image_url: {
                url: request.data.imageUrl!,
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.1,
    });

    const processingTime = Date.now() - startTime;
    const cost = this.calculateOpenAICost(response.usage);

    // Track cost and usage
    await this.costTracker.recordUsage({
      provider: 'openai',
      model: 'gpt-4-vision-preview',
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      cost,
      processingTime,
    });

    return {
      provider: 'openai',
      result: JSON.parse(response.choices[0].message.content || '{}'),
      confidence: this.extractConfidence(response),
      processingTime,
      cost,
      metadata: {
        modelUsed: 'gpt-4-vision-preview',
        tokensUsed: response.usage?.total_tokens,
        requestId: response.id || 'unknown',
        timestamp: new Date(),
      },
    };
  }

  private async processWithGoogleVision(
    request: AIProcessingRequest,
  ): Promise<AIProcessingResult> {
    if (!this.googleVisionClient) {
      throw new Error('Google Vision client not initialized');
    }

    const startTime = Date.now();

    const [result] = await this.googleVisionClient.textDetection({
      image: { content: request.data.imageBuffer },
    });

    const processingTime = Date.now() - startTime;
    const cost = 0.0015; // Fixed cost per request

    await this.costTracker.recordUsage({
      provider: 'google',
      model: 'text-detection',
      cost,
      processingTime,
    });

    return {
      provider: 'google',
      result: result.textAnnotations || [],
      confidence: this.calculateGoogleConfidence(result),
      processingTime,
      cost,
      metadata: {
        modelUsed: 'google-vision-text-detection',
        requestId: `google-${Date.now()}`,
        timestamp: new Date(),
      },
    };
  }

  private async processWithAWSTextract(
    request: AIProcessingRequest,
  ): Promise<AIProcessingResult> {
    if (!this.textractClient) {
      throw new Error('AWS Textract client not initialized');
    }

    const startTime = Date.now();

    const command = new AnalyzeDocumentCommand({
      Document: { Bytes: request.data.imageBuffer },
      FeatureTypes: ['FORMS', 'TABLES'],
    });

    const result = await this.textractClient.send(command);
    const processingTime = Date.now() - startTime;
    const cost = 0.002; // Fixed cost per request

    await this.costTracker.recordUsage({
      provider: 'aws',
      model: 'textract-analyze-document',
      cost,
      processingTime,
    });

    return {
      provider: 'aws',
      result: result.Blocks || [],
      confidence: this.calculateAWSConfidence(result),
      processingTime,
      cost,
      metadata: {
        modelUsed: 'aws-textract',
        requestId: result.ResponseMetadata?.RequestId || 'unknown',
        timestamp: new Date(),
      },
    };
  }

  private async processWithAzureCognitive(
    request: AIProcessingRequest,
  ): Promise<AIProcessingResult> {
    if (!this.azureVisionClient) {
      throw new Error('Azure Vision client not initialized');
    }

    const startTime = Date.now();

    const result = await this.azureVisionClient.readInStream(
      request.data.imageBuffer,
    );
    const processingTime = Date.now() - startTime;
    const cost = 0.001; // Fixed cost per request

    await this.costTracker.recordUsage({
      provider: 'azure',
      model: 'computer-vision-read',
      cost,
      processingTime,
    });

    return {
      provider: 'azure',
      result: result,
      confidence: 85, // Default confidence for Azure
      processingTime,
      cost,
      metadata: {
        modelUsed: 'azure-computer-vision',
        requestId: `azure-${Date.now()}`,
        timestamp: new Date(),
      },
    };
  }

  private async selectFallbackProvider(
    request: AIProcessingRequest,
    failedProvider: AIServiceProvider,
  ): Promise<AIServiceProvider | null> {
    const candidates = Array.from(this.providers.values()).filter(
      (p) =>
        p.name !== failedProvider.name &&
        this.supportsRequest(p, request) &&
        p.isHealthy,
    );

    if (candidates.length === 0) return null;

    // Select the most reliable remaining provider
    return candidates.reduce((best, current) =>
      current.reliability > best.reliability ? current : best,
    );
  }

  private async processWithFallbackProvider(
    request: AIProcessingRequest,
    provider: AIServiceProvider,
  ): Promise<AIProcessingResult> {
    console.log(`Falling back to provider: ${provider.name}`);

    // Recursive call with the fallback provider
    const originalProviders = this.providers;
    const tempProviders = new Map();
    tempProviders.set(provider.name, provider);
    this.providers.clear();
    provider.isHealthy = true; // Force healthy for fallback
    this.providers.set(provider.name, provider);

    try {
      const result = await this.processWithOptimalProvider(request);
      return result;
    } finally {
      this.providers.clear();
      originalProviders.forEach((value, key) => this.providers.set(key, value));
    }
  }

  private generateWeddingFormPrompt(
    type: string,
    weddingContext?: WeddingContext,
  ): string {
    const basePrompts = {
      vision_analysis: `Analyze this wedding industry form page with extreme precision for a ${weddingContext?.supplierType || 'wedding'} supplier. Extract:

      1. **Form Fields**: Every input field, checkbox, dropdown, and text area
         - Exact field labels and their positions
         - Field types (text, email, phone, date, select, checkbox, textarea)
         - Any default values, placeholders, or pre-filled content
         - Required field indicators (*, "required", etc.)

      2. **Wedding Context**: Identify wedding-specific fields
         - Wedding date, venue information, guest count
         - Budget ranges, payment schedules, deposit amounts  
         - Vendor services (photography packages, catering options)
         - Timeline elements (ceremony time, reception details)

      3. **Layout Structure**: 
         - Section headings and groupings
         - Multi-column layouts and field relationships
         - Page structure and navigation elements

      4. **Quality Indicators**:
         - Text clarity and readability confidence
         - Field boundary detection accuracy
         - Overall form completeness

      Return detailed JSON with precise coordinate information and wedding industry context.`,

      ocr_extraction: `Extract all text content from this ${weddingContext?.formType || 'wedding'} form with maximum accuracy:

      Focus on:
      - Legal contract language and terms
      - Pricing information and payment details  
      - Service descriptions and package details
      - Contact information and business details
      - Fine print and disclaimer text

      Preserve formatting, spacing, and text hierarchy for ${weddingContext?.supplierType || 'wedding supplier'} use.`,

      layout_analysis: `Analyze the layout structure of this wedding industry form:

      1. Identify sections and their purposes for ${weddingContext?.supplierType || 'wedding supplier'}
      2. Map field relationships and dependencies
      3. Detect multi-step or multi-page workflows
      4. Identify required vs optional sections
      5. Note any conditional logic or branching

      Focus on creating an optimal digital form structure for wedding workflows.`,
    };

    return (
      basePrompts[type as keyof typeof basePrompts] ||
      basePrompts['vision_analysis']
    );
  }

  private calculateOpenAICost(usage: any): number {
    if (!usage) return 0;

    // GPT-4 Vision pricing (approximate)
    const inputCostPer1k = 0.01; // $0.01 per 1k input tokens
    const outputCostPer1k = 0.03; // $0.03 per 1k output tokens

    const inputCost = (usage.prompt_tokens / 1000) * inputCostPer1k;
    const outputCost = (usage.completion_tokens / 1000) * outputCostPer1k;

    return inputCost + outputCost;
  }

  private extractConfidence(response: any): number {
    // Extract confidence from OpenAI response
    // This is a simplified implementation
    return 85; // Default confidence
  }

  private calculateGoogleConfidence(result: any): number {
    // Calculate confidence from Google Vision response
    if (result.textAnnotations && result.textAnnotations[0]) {
      return (result.textAnnotations[0].confidence || 0.85) * 100;
    }
    return 85;
  }

  private calculateAWSConfidence(result: any): number {
    // Calculate average confidence from AWS Textract blocks
    if (result.Blocks && result.Blocks.length > 0) {
      const confidenceSum = result.Blocks.filter(
        (block: any) => block.Confidence,
      ).reduce((sum: number, block: any) => sum + block.Confidence, 0);
      const blockCount = result.Blocks.filter(
        (block: any) => block.Confidence,
      ).length;
      return blockCount > 0 ? confidenceSum / blockCount : 85;
    }
    return 85;
  }

  // Health monitoring methods
  async checkProviderHealth(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();

    for (const [name, provider] of this.providers) {
      try {
        const isHealthy = await this.performHealthCheck(provider);
        healthStatus.set(name, isHealthy);
        provider.isHealthy = isHealthy;
        provider.lastHealthCheck = new Date();
      } catch (error) {
        console.error(`Health check failed for ${name}:`, error);
        healthStatus.set(name, false);
        provider.isHealthy = false;
      }
    }

    return healthStatus;
  }

  private async performHealthCheck(
    provider: AIServiceProvider,
  ): Promise<boolean> {
    // Implement specific health checks for each provider
    switch (provider.name) {
      case 'openai':
        return !!process.env.OPENAI_API_KEY;
      case 'google':
        return !!this.googleVisionClient;
      case 'aws':
        return !!this.textractClient;
      case 'azure':
        return !!this.azureVisionClient;
      default:
        return false;
    }
  }

  // Cost optimization methods
  async getProviderCosts(): Promise<Record<string, number>> {
    return await this.costTracker
      .getCosts({
        timeRange: 'last_24_hours',
        groupBy: ['provider'],
      })
      .then((costs) => costs.breakdown);
  }

  async optimizeCosts(): Promise<string[]> {
    const costs = await this.getProviderCosts();
    const suggestions: string[] = [];

    // Analyze costs and provide suggestions
    const totalCost = Object.values(costs).reduce((a, b) => a + b, 0);

    if (totalCost > 50) {
      // $50 daily threshold
      suggestions.push(
        'Consider using Google Vision for OCR-heavy tasks (lower cost)',
      );
    }

    if (costs.openai && costs.openai > costs.google * 5) {
      suggestions.push(
        'OpenAI usage is significantly higher than Google Vision. Consider rebalancing for cost optimization.',
      );
    }

    return suggestions;
  }
}

export default AIServiceOrchestrator;
