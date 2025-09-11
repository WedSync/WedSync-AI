import { OpenAI } from 'openai';
import { createHash } from 'crypto';

interface OpenAIServiceConfig {
  apiKey: string;
  maxRetries: number;
  timeout: number;
  baseURL?: string;
}

interface DietaryAnalysisRequest {
  ingredients: string[];
  dietaryRestrictions: string[];
  culturalRequirements?: string[];
  allergenWarnings?: string[];
  portionSize?: number;
  preparationMethod?: string;
}

interface MenuGenerationRequest {
  guestCount: number;
  dietaryRequirements: {
    allergies: string[];
    diets: string[];
    medical: string[];
    preferences: string[];
  };
  menuStyle: string;
  budgetPerPerson: number;
  culturalPreferences: string[];
  seasonalIngredients: string[];
  weddingContext: {
    date: string;
    timeOfDay: string;
    venueType: string;
    duration: number;
  };
}

interface DietaryAnalysisResponse {
  conflicts: DietaryConflict[];
  allergenWarnings: AllergenWarning[];
  crossContaminationRisks: CrossContaminationRisk[];
  substitutionSuggestions: SubstitutionSuggestion[];
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  confidence: number;
  analysis: AnalysisMetadata;
}

interface MenuGenerationResponse {
  menuId: string;
  menu: MenuStructure;
  complianceAnalysis: ComplianceAnalysis;
  costAnalysis: CostAnalysis;
  preparationAnalysis: PreparationAnalysis;
  alternatives: MenuAlternative[];
  metadata: ResponseMetadata;
}

interface ServiceHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastSuccessfulRequest?: string;
  error?: string;
  cacheSize: number;
  metrics: any;
}

// Circuit Breaker Implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }
}

// Rate Limiter Implementation
class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  async check(
    userId: string,
    operation: string,
    limit: number,
    windowMs: number,
  ): Promise<void> {
    const key = `${userId}:${operation}`;
    const now = Date.now();
    const window = windowMs;

    const userRequests = this.requests.get(key);

    if (!userRequests || now > userRequests.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + window });
      return;
    }

    if (userRequests.count >= limit) {
      throw new Error(`Rate limit exceeded for ${operation}`);
    }

    userRequests.count++;
  }
}

// Metrics Collector
class MetricsCollector {
  private metrics = new Map<string, number>();
  private timings = new Map<string, number[]>();

  constructor(private serviceName: string) {}

  increment(metric: string): void {
    this.metrics.set(metric, (this.metrics.get(metric) || 0) + 1);
  }

  timing(metric: string, duration: number): void {
    const timings = this.timings.get(metric) || [];
    timings.push(duration);
    this.timings.set(metric, timings.slice(-100)); // Keep last 100 measurements
  }

  getSnapshot(): any {
    const snapshot: any = { counters: {}, timings: {} };

    for (const [key, value] of this.metrics.entries()) {
      snapshot.counters[key] = value;
    }

    for (const [key, values] of this.timings.entries()) {
      if (values.length > 0) {
        snapshot.timings[key] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
        };
      }
    }

    return snapshot;
  }
}

// Retry utility
async function exponentialBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffFactor: number;
    shouldRetry?: (error: any) => boolean;
  },
): Promise<T> {
  let attempt = 1;
  let delay = options.initialDelay;

  while (attempt <= options.maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      if (
        attempt === options.maxAttempts ||
        (options.shouldRetry && !options.shouldRetry(error))
      ) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * options.backoffFactor, options.maxDelay);
      attempt++;
    }
  }

  throw new Error('Max retry attempts exceeded');
}

export class OpenAIDietaryService {
  private openai: OpenAI;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private metrics: MetricsCollector;
  private requestCache: Map<string, any> = new Map();
  private config: OpenAIServiceConfig;

  constructor(config: OpenAIServiceConfig) {
    this.config = config;

    this.openai = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout,
      maxRetries: 0, // We handle retries ourselves
      baseURL: config.baseURL,
    });

    this.circuitBreaker = new CircuitBreaker();
    this.rateLimiter = new RateLimiter();
    this.metrics = new MetricsCollector('openai_dietary_service');
  }

  async generateDietaryCompliantMenu(
    request: MenuGenerationRequest,
    userId: string,
    options: { useCache?: boolean; priority?: 'low' | 'normal' | 'high' } = {},
  ): Promise<MenuGenerationResponse> {
    const startTime = Date.now();
    const operationId = createHash('sha256')
      .update(JSON.stringify(request))
      .digest('hex')
      .slice(0, 16);

    try {
      // Rate limiting based on priority
      const rateLimit =
        options.priority === 'high' ? 50 : options.priority === 'low' ? 10 : 25;
      await this.rateLimiter.check(
        userId,
        'menu_generation',
        rateLimit,
        3600000,
      ); // 1 hour

      // Check cache first
      if (options.useCache !== false) {
        const cached = this.getCachedResponse('menu_generation', request);
        if (cached) {
          this.metrics.increment('cache_hit');
          return cached;
        }
      }

      // Execute with circuit breaker and retry logic
      const response = await this.circuitBreaker.execute(async () => {
        return this.executeMenuGenerationWithRetry(request, operationId);
      });

      // Cache successful response
      if (options.useCache !== false) {
        this.cacheResponse('menu_generation', request, response, 3600); // 1 hour cache
      }

      // Record metrics
      this.metrics.timing('menu_generation_duration', Date.now() - startTime);
      this.metrics.increment('menu_generation_success');

      return response;
    } catch (error) {
      this.metrics.increment('menu_generation_error');
      this.handleServiceError(
        error,
        'generateDietaryCompliantMenu',
        operationId,
      );
      throw this.enrichError(error, 'Menu generation failed', {
        operationId,
        userId,
      });
    }
  }

  async analyzeDietaryConflicts(
    request: DietaryAnalysisRequest,
    userId?: string,
  ): Promise<DietaryAnalysisResponse> {
    const startTime = Date.now();

    try {
      if (userId) {
        await this.rateLimiter.check(userId, 'dietary_analysis', 100, 3600000);
      }

      // Check cache
      const cacheKey = this.generateCacheKey('dietary_analysis', request);
      const cached = this.requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 1800000) {
        // 30 minutes
        this.metrics.increment('cache_hit');
        return cached.data;
      }

      const response = await this.circuitBreaker.execute(async () => {
        return exponentialBackoff(
          async () => {
            const completion = await this.openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: this.getDietaryAnalysisSystemPrompt(),
                },
                {
                  role: 'user',
                  content: this.buildDietaryAnalysisPrompt(request),
                },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1,
              max_tokens: 2000,
            });

            const result = JSON.parse(
              completion.choices[0].message.content || '{}',
            );

            return {
              conflicts: result.conflicts || [],
              allergenWarnings: result.allergenWarnings || [],
              crossContaminationRisks: result.crossContaminationRisks || [],
              substitutionSuggestions: result.substitutionSuggestions || [],
              complianceScore: result.complianceScore || 0,
              riskLevel: result.riskLevel || 'unknown',
              recommendations: result.recommendations || [],
              confidence: result.confidence || 0.8,
              analysis: {
                tokensUsed: completion.usage?.total_tokens || 0,
                model: completion.model,
                processingTime: Date.now() - startTime,
              },
            };
          },
          {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 5000,
            backoffFactor: 2,
          },
        );
      });

      // Cache result
      this.requestCache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });

      this.metrics.timing('dietary_analysis_duration', Date.now() - startTime);
      this.metrics.increment('dietary_analysis_success');

      return response;
    } catch (error) {
      this.metrics.increment('dietary_analysis_error');
      throw this.enrichError(error, 'Dietary analysis failed');
    }
  }

  async validateRealTimeDietaryCompliance(
    dishComponents: any[],
    activeRestrictions: string[],
  ): Promise<any> {
    try {
      // Use faster model for real-time validation
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a real-time food safety validator. Respond quickly with dietary compliance status.',
          },
          {
            role: 'user',
            content: `Validate these dish components: ${JSON.stringify(dishComponents)} against restrictions: ${activeRestrictions.join(', ')}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 500,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        isCompliant: result.isCompliant || false,
        violations: result.violations || [],
        warnings: result.warnings || [],
        suggestions: result.suggestions || [],
        riskLevel: result.riskLevel || 'unknown',
      };
    } catch (error) {
      // For real-time validation, provide safe fallback
      return {
        isCompliant: false,
        violations: ['Unable to validate - manual review required'],
        warnings: ['AI validation service unavailable'],
        suggestions: [],
        riskLevel: 'high',
      };
    }
  }

  private async executeMenuGenerationWithRetry(
    request: MenuGenerationRequest,
    operationId: string,
  ): Promise<MenuGenerationResponse> {
    return exponentialBackoff(
      async () => {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: this.getMenuGenerationSystemPrompt(),
            },
            {
              role: 'user',
              content: this.buildMenuGenerationPrompt(request),
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 4000,
        });

        const menuData = JSON.parse(
          completion.choices[0].message.content || '{}',
        );

        // Validate response structure
        if (!this.validateMenuStructure(menuData)) {
          throw new Error('Invalid menu structure from OpenAI');
        }

        return {
          menuId: operationId,
          menu: menuData,
          complianceAnalysis: {
            overallScore: menuData.complianceScore || 0.8,
            allergenCompliance: menuData.allergenCompliance || {},
            dietaryCompliance: menuData.dietaryCompliance || {},
            crossContaminationRisk: menuData.crossContaminationRisk || 'low',
          },
          costAnalysis: {
            totalCost: menuData.totalCost || 0,
            costPerPerson: menuData.costPerPerson || 0,
            costBreakdown: menuData.costBreakdown || {},
          },
          preparationAnalysis: {
            totalPrepTime: menuData.totalPrepTime || 0,
            complexityScore: menuData.complexityScore || 3,
            equipmentNeeded: menuData.equipmentNeeded || [],
            staffingRequirements: menuData.staffingRequirements || {},
          },
          alternatives: menuData.alternatives || [],
          metadata: {
            generatedAt: new Date().toISOString(),
            model: completion.model,
            tokensUsed: completion.usage?.total_tokens || 0,
            confidence: menuData.confidence || 0.8,
          },
        };
      },
      {
        maxAttempts: 3,
        initialDelay: 2000,
        maxDelay: 10000,
        backoffFactor: 2,
        shouldRetry: (error: any) => {
          // Retry on rate limits and temporary failures
          return (
            error.code === 'rate_limit_exceeded' ||
            error.code === 'server_error' ||
            error.message?.includes('timeout')
          );
        },
      },
    );
  }

  private getDietaryAnalysisSystemPrompt(): string {
    return `You are a certified food safety expert and dietary analysis specialist with expertise in:

- Food allergen identification and cross-contamination prevention
- Religious and cultural dietary requirements (Kosher, Halal, Hindu, Buddhist)
- Medical dietary restrictions (Celiac, Diabetes, Heart conditions)
- Plant-based and alternative diet analysis
- Ingredient traceability and hidden allergen detection
- Emergency dietary risk assessment

Analyze ingredients and dietary restrictions with extreme accuracy. Always err on the side of caution for severe allergies. Provide specific, actionable recommendations for dietary compliance.

Response Format: JSON with detailed analysis, risk levels, and specific recommendations.`;
  }

  private getMenuGenerationSystemPrompt(): string {
    return `You are a master wedding chef and menu planning expert with 25+ years of experience in:

- Large-scale wedding catering (50-500+ guests)
- Dietary restriction accommodation and cross-contamination prevention
- Cost optimization and budget management
- Seasonal ingredient sourcing and menu planning
- Cultural and religious dietary compliance
- Kitchen workflow optimization and staff coordination
- Guest satisfaction and dietary safety protocols

Create exceptional wedding menus that are:
- 100% compliant with all dietary restrictions
- Elegant and restaurant-quality
- Budget-appropriate and cost-optimized
- Practical for large-scale preparation
- Safe from cross-contamination
- Culturally sensitive and inclusive

Always prioritize guest safety, especially for life-threatening allergies.`;
  }

  private buildDietaryAnalysisPrompt(request: DietaryAnalysisRequest): string {
    return `Analyze the following dietary scenario for potential conflicts and safety concerns:

INGREDIENTS: ${request.ingredients.join(', ')}
DIETARY RESTRICTIONS: ${request.dietaryRestrictions.join(', ')}
CULTURAL REQUIREMENTS: ${request.culturalRequirements?.join(', ') || 'None'}
ALLERGEN WARNINGS: ${request.allergenWarnings?.join(', ') || 'None'}

Provide a comprehensive analysis including:
1. Identify all potential conflicts
2. Rate overall compliance score (0-1)
3. Assess cross-contamination risks
4. Suggest ingredient substitutions
5. Provide specific recommendations
6. Rate overall risk level

Return detailed JSON response.`;
  }

  private buildMenuGenerationPrompt(request: MenuGenerationRequest): string {
    return `Create a comprehensive wedding menu for ${request.guestCount} guests with the following requirements:

DIETARY RESTRICTIONS:
- Allergies: ${request.dietaryRequirements.allergies.join(', ') || 'None'}
- Dietary Preferences: ${request.dietaryRequirements.diets.join(', ') || 'None'}
- Medical Requirements: ${request.dietaryRequirements.medical.join(', ') || 'None'}
- Other Preferences: ${request.dietaryRequirements.preferences.join(', ') || 'None'}

MENU SPECIFICATIONS:
- Style: ${request.menuStyle}
- Budget per person: $${request.budgetPerPerson}
- Cultural preferences: ${request.culturalPreferences.join(', ') || 'None'}
- Seasonal ingredients: ${request.seasonalIngredients.join(', ') || 'None'}

WEDDING CONTEXT:
- Date: ${request.weddingContext.date}
- Time: ${request.weddingContext.timeOfDay}
- Venue: ${request.weddingContext.venueType}
- Duration: ${request.weddingContext.duration} hours

REQUIREMENTS:
1. Create appetizer, main course, and dessert options
2. Include alternative options for each dietary restriction
3. Provide detailed ingredient lists with allergen warnings
4. Calculate estimated costs and preparation times
5. Include cross-contamination prevention protocols
6. Suggest presentation and service styles
7. Optimize for the specified budget without compromising quality
8. Consider seasonal availability and freshness
9. Include staffing and equipment recommendations
10. Provide confidence scores for all recommendations

Return detailed JSON with complete menu structure, compliance analysis, cost breakdown, and preparation guidelines.`;
  }

  private validateMenuStructure(menu: any): boolean {
    return (
      menu &&
      menu.courses &&
      Array.isArray(menu.courses) &&
      menu.courses.length > 0 &&
      menu.courses.every(
        (course: any) =>
          course.name &&
          course.dishes &&
          Array.isArray(course.dishes) &&
          course.dishes.length > 0,
      )
    );
  }

  private handleServiceError(
    error: any,
    operation: string,
    operationId?: string,
  ): void {
    const errorContext = {
      operation,
      operationId,
      error: {
        message: error.message,
        code: error.code,
        status: error.status,
      },
      timestamp: new Date().toISOString(),
    };

    console.error('OpenAI Dietary Service Error:', errorContext);

    // Track error patterns
    this.metrics.increment(`error_${error.code || 'unknown'}`);

    // Notify if critical error
    if (error.code === 'insufficient_quota' || error.status === 429) {
      this.notifyServiceDegradation(`OpenAI API error: ${error.message}`);
    }
  }

  private enrichError(error: any, message: string, context: any = {}): Error {
    const enrichedError = new Error(`${message}: ${error.message}`);
    (enrichedError as any).originalError = error;
    (enrichedError as any).context = context;
    (enrichedError as any).timestamp = new Date().toISOString();
    return enrichedError;
  }

  private generateCacheKey(operation: string, data: any): string {
    return createHash('sha256')
      .update(`${operation}:${JSON.stringify(data)}`)
      .digest('hex');
  }

  private getCachedResponse(operation: string, request: any): any {
    const cacheKey = this.generateCacheKey(operation, request);
    const cached = this.requestCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 3600000) {
      // 1 hour
      return cached.data;
    }

    return null;
  }

  private cacheResponse(
    operation: string,
    request: any,
    response: any,
    ttl: number,
  ): void {
    const cacheKey = this.generateCacheKey(operation, request);
    this.requestCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    // Clean old cache entries periodically
    if (this.requestCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of this.requestCache.entries()) {
        if (now - value.timestamp > ttl * 1000) {
          this.requestCache.delete(key);
        }
      }
    }
  }

  private async notifyServiceDegradation(message: string): Promise<void> {
    console.error('SERVICE DEGRADATION ALERT:', message);

    try {
      await fetch(process.env.ALERT_WEBHOOK_URL || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert: 'service_degradation',
          service: 'openai_dietary_service',
          message,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error('Failed to send alert notification:', e);
    }
  }

  async getServiceHealth(): Promise<ServiceHealthStatus> {
    try {
      const testResponse = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Health check' }],
        max_tokens: 5,
      });

      return {
        status: 'healthy',
        lastSuccessfulRequest: new Date().toISOString(),
        cacheSize: this.requestCache.size,
        metrics: this.metrics.getSnapshot(),
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
        cacheSize: this.requestCache.size,
        metrics: this.metrics.getSnapshot(),
      };
    }
  }
}

// Type definitions
interface DietaryConflict {
  ingredient: string;
  restriction: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface AllergenWarning {
  allergen: string;
  source: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  crossContaminationRisk: boolean;
}

interface CrossContaminationRisk {
  ingredient: string;
  riskSources: string[];
  preventionMeasures: string[];
}

interface SubstitutionSuggestion {
  originalIngredient: string;
  alternatives: string[];
  notes: string;
}

interface AnalysisMetadata {
  tokensUsed: number;
  model: string;
  processingTime: number;
}

interface MenuStructure {
  courses: MenuCourse[];
  totalCost?: number;
  costPerPerson?: number;
  complianceScore?: number;
}

interface MenuCourse {
  name: string;
  dishes: MenuDish[];
}

interface MenuDish {
  name: string;
  ingredients: string[];
  allergens: string[];
  dietaryTags: string[];
}

interface ComplianceAnalysis {
  overallScore: number;
  allergenCompliance: Record<string, boolean>;
  dietaryCompliance: Record<string, boolean>;
  crossContaminationRisk: string;
}

interface CostAnalysis {
  totalCost: number;
  costPerPerson: number;
  costBreakdown: Record<string, number>;
}

interface PreparationAnalysis {
  totalPrepTime: number;
  complexityScore: number;
  equipmentNeeded: string[];
  staffingRequirements: Record<string, number>;
}

interface MenuAlternative {
  name: string;
  description: string;
  costDifference: number;
}

interface ResponseMetadata {
  generatedAt: string;
  model: string;
  tokensUsed: number;
  confidence: number;
}
