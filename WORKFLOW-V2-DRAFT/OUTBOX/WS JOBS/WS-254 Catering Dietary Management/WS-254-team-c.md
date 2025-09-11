# WS-254 Team C: Catering Dietary Management - Integration Implementation

## EVIDENCE OF REALITY REQUIREMENTS

**CRITICAL**: Before marking this task complete, you MUST provide:

1. **Integration Test Results**:
   ```bash
   npm test -- --testPathPattern="integration.*dietary" --coverage 2>&1
   ```

2. **API Integration Proof**:
   ```bash
   curl -X POST http://localhost:3000/api/catering/integrations/test -H "Authorization: Bearer test" 2>&1
   ```

3. **OpenAI Integration Verification**:
   - Screenshot of successful AI dietary analysis
   - API response logs showing token usage and cost
   - Rate limiting demonstration

4. **External Service Health Checks**:
   ```bash
   curl -X GET http://localhost:3000/api/health/integrations 2>&1
   ```

5. **Webhook Integration Tests**:
   - Webhook endpoint responding to dietary requirement updates
   - Real-time notifications working
   - Event sourcing and audit trails

6. **Third-Party Service Mocks**:
   - Complete test suite with service mocks
   - Error handling scenarios tested
   - Fallback mechanisms demonstrated

## SECURITY VALIDATION REQUIREMENTS

All integration endpoints MUST implement the withSecureValidation middleware:

```typescript
import { withSecureValidation } from '@/lib/security/withSecureValidation'

export async function POST(request: Request) {
  return withSecureValidation(request, async ({ body, user }) => {
    // Your secure integration logic here
    // user object is guaranteed to be authenticated
    // body is validated and sanitized
  })
}
```

## NAVIGATION INTEGRATION REQUIREMENTS

Integration services must support navigation context tracking:

```typescript
// Track integration usage in navigation analytics
interface IntegrationContext {
  integrationName: string
  operationType: string
  userPath: string
  sessionId: string
  performanceMetrics: {
    latency: number
    success: boolean
    errorType?: string
  }
}
```

## CORE INTEGRATION IMPLEMENTATIONS

### 1. OpenAI Integration Service with Advanced Error Handling

```typescript
// File: src/lib/integrations/OpenAIDietaryService.ts

import { OpenAI } from 'openai'
import { CircuitBreaker, CircuitBreakerOptions } from '@/lib/utils/circuit-breaker'
import { RateLimiter } from '@/lib/security/rate-limit'
import { MetricsCollector } from '@/lib/monitoring/metrics'
import { exponentialBackoff, RetryOptions } from '@/lib/utils/retry'
import { createHash } from 'crypto'

interface OpenAIServiceConfig {
  apiKey: string
  maxRetries: number
  timeout: number
  baseURL?: string
  circuitBreakerOptions?: CircuitBreakerOptions
}

interface DietaryAnalysisRequest {
  ingredients: string[]
  dietaryRestrictions: string[]
  culturalRequirements?: string[]
  allergenWarnings?: string[]
  portionSize?: number
  preparationMethod?: string
}

interface MenuGenerationRequest {
  guestCount: number
  dietaryRequirements: {
    allergies: string[]
    diets: string[]
    medical: string[]
    preferences: string[]
  }
  menuStyle: string
  budgetPerPerson: number
  culturalPreferences: string[]
  seasonalIngredients: string[]
  weddingContext: {
    date: string
    timeOfDay: string
    venueType: string
    duration: number
  }
}

export class OpenAIDietaryService {
  private openai: OpenAI
  private circuitBreaker: CircuitBreaker
  private rateLimiter: RateLimiter
  private metrics: MetricsCollector
  private requestCache: Map<string, any> = new Map()
  private config: OpenAIServiceConfig

  constructor(config: OpenAIServiceConfig) {
    this.config = config
    
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout,
      maxRetries: 0, // We handle retries ourselves
      baseURL: config.baseURL
    })

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringPeriod: 300000,
      name: 'OpenAI Dietary Service',
      onStateChange: this.handleCircuitBreakerStateChange.bind(this),
      ...config.circuitBreakerOptions
    })

    this.rateLimiter = new RateLimiter()
    this.metrics = new MetricsCollector('openai_dietary_service')
  }

  async generateDietaryCompliantMenu(
    request: MenuGenerationRequest,
    userId: string,
    options: { useCache?: boolean; priority?: 'low' | 'normal' | 'high' } = {}
  ): Promise<MenuGenerationResponse> {
    const startTime = Date.now()
    const operationId = createHash('sha256').update(JSON.stringify(request)).digest('hex').slice(0, 16)
    
    try {
      // Rate limiting based on priority
      const rateLimit = options.priority === 'high' ? 50 : options.priority === 'low' ? 10 : 25
      await this.rateLimiter.check(userId, 'menu_generation', rateLimit, '1h')

      // Check cache first
      if (options.useCache !== false) {
        const cached = this.getCachedResponse('menu_generation', request)
        if (cached) {
          this.metrics.increment('cache_hit')
          return cached
        }
      }

      // Execute with circuit breaker and retry logic
      const response = await this.circuitBreaker.execute(async () => {
        return this.executeMenuGenerationWithRetry(request, operationId)
      })

      // Cache successful response
      if (options.useCache !== false) {
        this.cacheResponse('menu_generation', request, response, 3600) // 1 hour cache
      }

      // Record metrics
      this.metrics.timing('menu_generation_duration', Date.now() - startTime)
      this.metrics.increment('menu_generation_success')

      return response
    } catch (error) {
      this.metrics.increment('menu_generation_error')
      this.handleServiceError(error, 'generateDietaryCompliantMenu', operationId)
      throw this.enrichError(error, 'Menu generation failed', { operationId, userId })
    }
  }

  async analyzeDietaryConflicts(
    request: DietaryAnalysisRequest,
    userId?: string
  ): Promise<DietaryAnalysisResponse> {
    const startTime = Date.now()
    
    try {
      if (userId) {
        await this.rateLimiter.check(userId, 'dietary_analysis', 100, '1h')
      }

      // Check cache
      const cacheKey = this.generateCacheKey('dietary_analysis', request)
      const cached = this.requestCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < 1800000) { // 30 minutes
        this.metrics.increment('cache_hit')
        return cached.data
      }

      const response = await this.circuitBreaker.execute(async () => {
        return exponentialBackoff(async () => {
          const completion = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: this.getDietaryAnalysisSystemPrompt()
              },
              {
                role: 'user',
                content: this.buildDietaryAnalysisPrompt(request)
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 2000
          })

          const result = JSON.parse(completion.choices[0].message.content || '{}')
          
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
              processingTime: Date.now() - startTime
            }
          }
        }, {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 5000,
          backoffFactor: 2
        })
      })

      // Cache result
      this.requestCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      })

      this.metrics.timing('dietary_analysis_duration', Date.now() - startTime)
      this.metrics.increment('dietary_analysis_success')

      return response
    } catch (error) {
      this.metrics.increment('dietary_analysis_error')
      throw this.enrichError(error, 'Dietary analysis failed')
    }
  }

  async generateIngredientSubstitutions(
    ingredient: string,
    restrictions: string[],
    context: {
      dishType?: string
      preparationMethod?: string
      culturalPreferences?: string[]
      budgetConstraints?: number
    } = {}
  ): Promise<IngredientSubstitutionResponse> {
    try {
      const response = await this.circuitBreaker.execute(async () => {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: this.getIngredientSubstitutionSystemPrompt()
            },
            {
              role: 'user',
              content: this.buildSubstitutionPrompt(ingredient, restrictions, context)
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 1500
        })

        const result = JSON.parse(completion.choices[0].message.content || '{}')
        
        return {
          originalIngredient: ingredient,
          restrictions,
          substitutions: result.substitutions || [],
          bestAlternatives: result.bestAlternatives || [],
          difficultyRating: result.difficultyRating || 3,
          tasteImpact: result.tasteImpact || 'moderate',
          costImpact: result.costImpact || 'similar',
          availabilityNotes: result.availabilityNotes || '',
          preparationTips: result.preparationTips || [],
          confidence: result.confidence || 0.8
        }
      })

      this.metrics.increment('substitution_generation_success')
      return response
    } catch (error) {
      this.metrics.increment('substitution_generation_error')
      throw this.enrichError(error, 'Ingredient substitution failed')
    }
  }

  async validateMenuNutritionalBalance(
    menu: MenuStructure,
    guestCount: number,
    options: { includeCalories?: boolean; includeMacros?: boolean } = {}
  ): Promise<NutritionalAnalysisResponse> {
    try {
      const response = await this.circuitBreaker.execute(async () => {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: this.getNutritionalAnalysisSystemPrompt()
            },
            {
              role: 'user',
              content: this.buildNutritionalAnalysisPrompt(menu, guestCount, options)
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 2500
        })

        return JSON.parse(completion.choices[0].message.content || '{}')
      })

      this.metrics.increment('nutritional_analysis_success')
      return response
    } catch (error) {
      this.metrics.increment('nutritional_analysis_error')
      throw this.enrichError(error, 'Nutritional analysis failed')
    }
  }

  // Cost optimization for budget-conscious clients
  async optimizeMenuCosts(
    menu: MenuStructure,
    targetBudget: number,
    constraints: CostOptimizationConstraints
  ): Promise<CostOptimizationResponse> {
    try {
      const response = await this.circuitBreaker.execute(async () => {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a cost-optimization expert for wedding catering with deep knowledge of ingredient pricing, seasonal availability, and bulk purchasing strategies.'
            },
            {
              role: 'user',
              content: this.buildCostOptimizationPrompt(menu, targetBudget, constraints)
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.5,
          max_tokens: 3000
        })

        return JSON.parse(completion.choices[0].message.content || '{}')
      })

      this.metrics.increment('cost_optimization_success')
      return response
    } catch (error) {
      this.metrics.increment('cost_optimization_error')
      throw this.enrichError(error, 'Cost optimization failed')
    }
  }

  // Real-time dietary requirement validation during menu planning
  async validateRealTimeDietaryCompliance(
    dishComponents: DishComponent[],
    activeRestrictions: string[]
  ): Promise<RealTimeValidationResponse> {
    try {
      // Use faster model for real-time validation
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a real-time food safety validator. Respond quickly with dietary compliance status.'
          },
          {
            role: 'user',
            content: `Validate these dish components: ${JSON.stringify(dishComponents)} against restrictions: ${activeRestrictions.join(', ')}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 500
      })

      const result = JSON.parse(response.choices[0].message.content || '{}')
      
      return {
        isCompliant: result.isCompliant || false,
        violations: result.violations || [],
        warnings: result.warnings || [],
        suggestions: result.suggestions || [],
        riskLevel: result.riskLevel || 'unknown'
      }
    } catch (error) {
      // For real-time validation, provide safe fallback
      return {
        isCompliant: false,
        violations: ['Unable to validate - manual review required'],
        warnings: ['AI validation service unavailable'],
        suggestions: [],
        riskLevel: 'high'
      }
    }
  }

  private async executeMenuGenerationWithRetry(
    request: MenuGenerationRequest,
    operationId: string
  ): Promise<MenuGenerationResponse> {
    return exponentialBackoff(async () => {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: this.getMenuGenerationSystemPrompt()
          },
          {
            role: 'user',
            content: this.buildMenuGenerationPrompt(request)
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000
      })

      const menuData = JSON.parse(completion.choices[0].message.content || '{}')
      
      // Validate response structure
      if (!this.validateMenuStructure(menuData)) {
        throw new Error('Invalid menu structure from OpenAI')
      }

      return {
        menuId: operationId,
        menu: menuData,
        complianceAnalysis: {
          overallScore: menuData.complianceScore || 0.8,
          allergenCompliance: menuData.allergenCompliance || {},
          dietaryCompliance: menuData.dietaryCompliance || {},
          crossContaminationRisk: menuData.crossContaminationRisk || 'low'
        },
        costAnalysis: {
          totalCost: menuData.totalCost || 0,
          costPerPerson: menuData.costPerPerson || 0,
          costBreakdown: menuData.costBreakdown || {}
        },
        preparationAnalysis: {
          totalPrepTime: menuData.totalPrepTime || 0,
          complexityScore: menuData.complexityScore || 3,
          equipmentNeeded: menuData.equipmentNeeded || [],
          staffingRequirements: menuData.staffingRequirements || {}
        },
        alternatives: menuData.alternatives || [],
        metadata: {
          generatedAt: new Date().toISOString(),
          model: completion.model,
          tokensUsed: completion.usage?.total_tokens || 0,
          confidence: menuData.confidence || 0.8
        }
      }
    }, {
      maxAttempts: 3,
      initialDelay: 2000,
      maxDelay: 10000,
      backoffFactor: 2,
      shouldRetry: (error: any) => {
        // Retry on rate limits and temporary failures
        return error.code === 'rate_limit_exceeded' || 
               error.code === 'server_error' ||
               error.message?.includes('timeout')
      }
    })
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

Response Format: JSON with detailed analysis, risk levels, and specific recommendations.`
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

Always prioritize guest safety, especially for life-threatening allergies.`
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

Return detailed JSON with complete menu structure, compliance analysis, cost breakdown, and preparation guidelines.`
  }

  private validateMenuStructure(menu: any): boolean {
    return menu && 
           menu.courses && 
           Array.isArray(menu.courses) && 
           menu.courses.length > 0 &&
           menu.courses.every((course: any) => 
             course.name && 
             course.dishes && 
             Array.isArray(course.dishes) && 
             course.dishes.length > 0
           )
  }

  private handleCircuitBreakerStateChange(state: string): void {
    this.metrics.increment(`circuit_breaker_${state}`)
    console.warn(`OpenAI Dietary Service circuit breaker state changed to: ${state}`)
    
    if (state === 'open') {
      // Notify monitoring systems
      this.notifyServiceDegradation('OpenAI service circuit breaker opened')
    }
  }

  private handleServiceError(error: any, operation: string, operationId?: string): void {
    const errorContext = {
      operation,
      operationId,
      error: {
        message: error.message,
        code: error.code,
        status: error.status
      },
      timestamp: new Date().toISOString()
    }

    console.error('OpenAI Dietary Service Error:', errorContext)
    
    // Track error patterns
    this.metrics.increment(`error_${error.code || 'unknown'}`)
    
    // Notify if critical error
    if (error.code === 'insufficient_quota' || error.status === 429) {
      this.notifyServiceDegradation(`OpenAI API error: ${error.message}`)
    }
  }

  private enrichError(error: any, message: string, context: any = {}): Error {
    const enrichedError = new Error(`${message}: ${error.message}`)
    ;(enrichedError as any).originalError = error
    ;(enrichedError as any).context = context
    ;(enrichedError as any).timestamp = new Date().toISOString()
    return enrichedError
  }

  private generateCacheKey(operation: string, data: any): string {
    return createHash('sha256').update(`${operation}:${JSON.stringify(data)}`).digest('hex')
  }

  private getCachedResponse(operation: string, request: any): any {
    const cacheKey = this.generateCacheKey(operation, request)
    const cached = this.requestCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour
      return cached.data
    }
    
    return null
  }

  private cacheResponse(operation: string, request: any, response: any, ttl: number): void {
    const cacheKey = this.generateCacheKey(operation, request)
    this.requestCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    })

    // Clean old cache entries periodically
    if (this.requestCache.size > 1000) {
      const now = Date.now()
      for (const [key, value] of this.requestCache.entries()) {
        if (now - value.timestamp > ttl * 1000) {
          this.requestCache.delete(key)
        }
      }
    }
  }

  private async notifyServiceDegradation(message: string): Promise<void> {
    // In production, this would integrate with monitoring services like Sentry, Datadog, etc.
    console.error('SERVICE DEGRADATION ALERT:', message)
    
    // Could also send to Slack, PagerDuty, etc.
    try {
      // Example webhook notification
      await fetch(process.env.ALERT_WEBHOOK_URL || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert: 'service_degradation',
          service: 'openai_dietary_service',
          message,
          timestamp: new Date().toISOString()
        })
      })
    } catch (e) {
      console.error('Failed to send alert notification:', e)
    }
  }

  // Public method to get service health
  async getServiceHealth(): Promise<ServiceHealthStatus> {
    try {
      // Simple health check
      const testResponse = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Health check' }],
        max_tokens: 5
      })

      return {
        status: 'healthy',
        circuitBreakerState: this.circuitBreaker.getState(),
        lastSuccessfulRequest: new Date().toISOString(),
        cacheSize: this.requestCache.size,
        metrics: this.metrics.getSnapshot()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        circuitBreakerState: this.circuitBreaker.getState(),
        error: error.message,
        cacheSize: this.requestCache.size,
        metrics: this.metrics.getSnapshot()
      }
    }
  }
}

// Type definitions
interface MenuGenerationResponse {
  menuId: string
  menu: MenuStructure
  complianceAnalysis: ComplianceAnalysis
  costAnalysis: CostAnalysis  
  preparationAnalysis: PreparationAnalysis
  alternatives: MenuAlternative[]
  metadata: ResponseMetadata
}

interface DietaryAnalysisResponse {
  conflicts: DietaryConflict[]
  allergenWarnings: AllergenWarning[]
  crossContaminationRisks: CrossContaminationRisk[]
  substitutionSuggestions: SubstitutionSuggestion[]
  complianceScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[]
  confidence: number
  analysis: AnalysisMetadata
}

interface ServiceHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  circuitBreakerState: string
  lastSuccessfulRequest?: string
  error?: string
  cacheSize: number
  metrics: any
}
```

### 2. Wedding Guest Management Integration

```typescript
// File: src/lib/integrations/GuestManagementIntegration.ts

import { createClient } from '@supabase/supabase-js'
import { EventEmitter } from 'events'

export class GuestManagementIntegration extends EventEmitter {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    super()
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    this.setupRealtimeSubscriptions()
  }

  async syncGuestDietaryRequirements(
    weddingId: string,
    guestList: GuestInfo[]
  ): Promise<DietarySyncResult> {
    try {
      const syncResults: IndividualSyncResult[] = []
      
      for (const guest of guestList) {
        const result = await this.syncIndividualGuest(weddingId, guest)
        syncResults.push(result)
      }

      // Update wedding-level dietary summary
      await this.updateWeddingDietarySummary(weddingId, syncResults)

      // Trigger dietary analysis refresh
      this.emit('dietary_requirements_updated', {
        weddingId,
        guestCount: guestList.length,
        requirementCount: syncResults.filter(r => r.hasRequirements).length
      })

      return {
        totalGuests: guestList.length,
        requirementsFound: syncResults.filter(r => r.hasRequirements).length,
        newRequirements: syncResults.filter(r => r.isNew).length,
        updatedRequirements: syncResults.filter(r => r.isUpdated).length,
        errors: syncResults.filter(r => r.error).map(r => r.error!),
        syncResults
      }
    } catch (error) {
      throw new Error(`Guest dietary sync failed: ${error.message}`)
    }
  }

  private async syncIndividualGuest(
    weddingId: string, 
    guest: GuestInfo
  ): Promise<IndividualSyncResult> {
    try {
      // Check for existing dietary requirements
      const { data: existingReqs } = await this.supabase
        .from('guest_dietary_requirements')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('guest_name', guest.name)

      const guestRequirements = this.extractDietaryRequirements(guest)
      
      if (guestRequirements.length === 0) {
        return {
          guestName: guest.name,
          hasRequirements: false,
          isNew: false,
          isUpdated: false
        }
      }

      let isNew = false
      let isUpdated = false

      for (const requirement of guestRequirements) {
        const existing = existingReqs?.find(r => 
          r.dietary_category_id === requirement.categoryId
        )

        if (existing) {
          // Update existing requirement
          if (existing.specific_notes !== requirement.notes || 
              existing.severity_level !== requirement.severity) {
            await this.supabase
              .from('guest_dietary_requirements')
              .update({
                specific_notes: requirement.notes,
                severity_level: requirement.severity,
                verified_by_guest: requirement.verified,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
            
            isUpdated = true
          }
        } else {
          // Create new requirement
          await this.supabase
            .from('guest_dietary_requirements')
            .insert({
              wedding_id: weddingId,
              guest_name: guest.name,
              guest_email: guest.email,
              dietary_category_id: requirement.categoryId,
              severity_level: requirement.severity,
              specific_notes: requirement.notes,
              emergency_contact: requirement.emergencyContact,
              verified_by_guest: requirement.verified
            })
          
          isNew = true
        }
      }

      return {
        guestName: guest.name,
        hasRequirements: true,
        isNew,
        isUpdated,
        requirementCount: guestRequirements.length
      }
    } catch (error) {
      return {
        guestName: guest.name,
        hasRequirements: false,
        isNew: false,
        isUpdated: false,
        error: error.message
      }
    }
  }

  private extractDietaryRequirements(guest: GuestInfo): ExtractedRequirement[] {
    const requirements: ExtractedRequirement[] = []

    // Parse dietary notes from various guest management systems
    if (guest.dietaryNotes) {
      const notes = guest.dietaryNotes.toLowerCase()
      
      // Common allergy patterns
      const allergyPatterns = {
        nuts: /\b(nut|peanut|almond|walnut)\s*(allerg|free)/i,
        dairy: /\b(dairy|lactose|milk)\s*(allerg|free|intolerant)/i,
        gluten: /\b(gluten|wheat|celiac)\s*(allerg|free|intolerant)/i,
        shellfish: /\b(shellfish|shrimp|lobster|crab)\s*(allerg)/i
      }

      for (const [allergen, pattern] of Object.entries(allergyPatterns)) {
        if (pattern.test(notes)) {
          requirements.push({
            categoryId: this.getAllergenCategoryId(allergen),
            notes: guest.dietaryNotes,
            severity: this.determineSeverity(notes),
            verified: guest.dietaryVerified || false,
            emergencyContact: guest.emergencyContact
          })
        }
      }

      // Diet type patterns
      const dietPatterns = {
        vegan: /\bvegan\b/i,
        vegetarian: /\bvegetarian\b/i,
        kosher: /\bkosher\b/i,
        halal: /\bhalal\b/i
      }

      for (const [diet, pattern] of Object.entries(dietPatterns)) {
        if (pattern.test(notes)) {
          requirements.push({
            categoryId: this.getDietCategoryId(diet),
            notes: guest.dietaryNotes,
            severity: 3,
            verified: guest.dietaryVerified || false
          })
        }
      }
    }

    return requirements
  }

  private setupRealtimeSubscriptions(): void {
    // Subscribe to guest changes
    this.supabase
      .channel('guest_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'guest_dietary_requirements' },
        (payload) => {
          this.handleDietaryRequirementChange(payload)
        }
      )
      .subscribe()

    // Subscribe to wedding changes that might affect dietary planning
    this.supabase
      .channel('wedding_changes')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'weddings' },
        (payload) => {
          this.handleWeddingChange(payload)
        }
      )
      .subscribe()
  }

  private handleDietaryRequirementChange(payload: any): void {
    this.emit('guest_dietary_requirement_changed', {
      eventType: payload.eventType,
      weddingId: payload.new?.wedding_id || payload.old?.wedding_id,
      guestName: payload.new?.guest_name || payload.old?.guest_name,
      requirement: payload.new,
      oldRequirement: payload.old
    })
  }

  private handleWeddingChange(payload: any): void {
    if (payload.new.guest_count !== payload.old.guest_count) {
      this.emit('wedding_guest_count_changed', {
        weddingId: payload.new.id,
        oldCount: payload.old.guest_count,
        newCount: payload.new.guest_count
      })
    }
  }

  // Import from external guest management systems
  async importFromExternalSystem(
    weddingId: string,
    system: 'rsvpify' | 'the_knot' | 'wedding_wire' | 'zola',
    credentials: ExternalSystemCredentials
  ): Promise<ImportResult> {
    try {
      const importer = this.getSystemImporter(system)
      const guests = await importer.fetchGuests(credentials)
      
      const syncResult = await this.syncGuestDietaryRequirements(weddingId, guests)
      
      return {
        system,
        importedCount: guests.length,
        processedCount: syncResult.totalGuests,
        requirementsFound: syncResult.requirementsFound,
        errors: syncResult.errors
      }
    } catch (error) {
      throw new Error(`External system import failed: ${error.message}`)
    }
  }

  private getSystemImporter(system: string): GuestSystemImporter {
    const importers = {
      'rsvpify': new RSVPifyImporter(),
      'the_knot': new TheKnotImporter(),
      'wedding_wire': new WeddingWireImporter(),
      'zola': new ZolaImporter()
    }

    return importers[system as keyof typeof importers]
  }

  // Export dietary requirements for external systems
  async exportDietaryRequirements(
    weddingId: string,
    format: 'csv' | 'excel' | 'json' | 'pdf'
  ): Promise<ExportResult> {
    const { data: requirements } = await this.supabase
      .from('guest_dietary_requirements')
      .select(`
        *,
        dietary_categories (name, category_type)
      `)
      .eq('wedding_id', weddingId)
      .order('severity_level', { ascending: false })

    const exporter = this.getExporter(format)
    const exportData = await exporter.export(requirements || [])

    return {
      format,
      fileName: `dietary_requirements_${weddingId}_${Date.now()}.${format}`,
      data: exportData,
      recordCount: requirements?.length || 0
    }
  }

  private getExporter(format: string): DietaryRequirementsExporter {
    const exporters = {
      csv: new CSVExporter(),
      excel: new ExcelExporter(),
      json: new JSONExporter(),
      pdf: new PDFExporter()
    }

    return exporters[format as keyof typeof exporters]
  }
}

// External system importers
abstract class GuestSystemImporter {
  abstract fetchGuests(credentials: ExternalSystemCredentials): Promise<GuestInfo[]>
}

class RSVPifyImporter extends GuestSystemImporter {
  async fetchGuests(credentials: ExternalSystemCredentials): Promise<GuestInfo[]> {
    // Implementation for RSVPify API integration
    const response = await fetch(`${credentials.apiUrl}/guests`, {
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()
    
    return data.guests.map((guest: any) => ({
      name: guest.name,
      email: guest.email,
      dietaryNotes: guest.dietary_restrictions,
      dietaryVerified: guest.dietary_verified,
      emergencyContact: guest.emergency_contact,
      rsvpStatus: guest.rsvp_status
    }))
  }
}

// Additional importer classes would follow similar patterns...

interface GuestInfo {
  name: string
  email?: string
  dietaryNotes?: string
  dietaryVerified?: boolean
  emergencyContact?: string
  rsvpStatus?: string
}

interface ExtractedRequirement {
  categoryId: string
  notes: string
  severity: number
  verified: boolean
  emergencyContact?: string
}

interface DietarySyncResult {
  totalGuests: number
  requirementsFound: number
  newRequirements: number
  updatedRequirements: number
  errors: string[]
  syncResults: IndividualSyncResult[]
}

interface IndividualSyncResult {
  guestName: string
  hasRequirements: boolean
  isNew: boolean
  isUpdated: boolean
  requirementCount?: number
  error?: string
}
```

### 3. Real-time Notification Integration

```typescript
// File: src/lib/integrations/DietaryNotificationService.ts

import { EventEmitter } from 'events'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export class DietaryNotificationService extends EventEmitter {
  private supabase: ReturnType<typeof createClient>
  private resend: Resend
  private notificationQueue: NotificationQueue = new Map()

  constructor() {
    super()
    
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    this.resend = new Resend(process.env.RESEND_API_KEY!)
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for high-risk dietary requirements
    this.on('high_risk_requirement_added', this.handleHighRiskRequirement.bind(this))
    
    // Listen for menu compliance issues
    this.on('menu_compliance_issue', this.handleComplianceIssue.bind(this))
    
    // Listen for guest dietary verification requests
    this.on('verification_request', this.handleVerificationRequest.bind(this))
  }

  async notifyHighRiskRequirement(
    weddingId: string,
    requirement: HighRiskRequirement
  ): Promise<void> {
    const notification: HighRiskNotification = {
      type: 'high_risk_dietary_requirement',
      weddingId,
      requirement,
      urgency: 'high',
      createdAt: new Date()
    }

    // Immediate notification to supplier
    await this.sendImmediateNotification(notification)
    
    // Queue follow-up notifications
    this.queueFollowUpNotifications(notification)
  }

  private async sendImmediateNotification(
    notification: HighRiskNotification
  ): Promise<void> {
    // Get supplier and wedding details
    const { data: wedding } = await this.supabase
      .from('weddings')
      .select(`
        *,
        suppliers (
          company_name,
          contact_email,
          contact_phone,
          notification_preferences
        )
      `)
      .eq('id', notification.weddingId)
      .single()

    if (!wedding) return

    const supplier = wedding.suppliers
    const requirement = notification.requirement

    // Send email notification
    await this.resend.emails.send({
      from: 'alerts@wedsync.com',
      to: supplier.contact_email,
      subject: `🚨 URGENT: High-Risk Dietary Requirement - ${wedding.couple_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 20px;">
            <h2 style="color: #dc2626; margin: 0 0 8px 0;">⚠️ HIGH-RISK DIETARY REQUIREMENT ALERT</h2>
            <p style="margin: 0; font-weight: bold;">Immediate attention required for guest safety</p>
          </div>
          
          <h3>Wedding Details</h3>
          <ul>
            <li><strong>Couple:</strong> ${wedding.couple_name}</li>
            <li><strong>Date:</strong> ${new Date(wedding.wedding_date).toLocaleDateString()}</li>
            <li><strong>Venue:</strong> ${wedding.venue_name}</li>
            <li><strong>Guest Count:</strong> ${wedding.guest_count}</li>
          </ul>

          <h3>Dietary Requirement Details</h3>
          <div style="background: #fef3c7; border: 1px solid #d97706; padding: 12px; border-radius: 6px; margin: 16px 0;">
            <ul>
              <li><strong>Guest:</strong> ${requirement.guestName}</li>
              <li><strong>Restriction:</strong> ${requirement.category}</li>
              <li><strong>Severity:</strong> Level ${requirement.severity}/5</li>
              <li><strong>Details:</strong> ${requirement.notes}</li>
              ${requirement.emergencyContact ? `<li><strong>Emergency Contact:</strong> ${requirement.emergencyContact}</li>` : ''}
            </ul>
          </div>

          <h3>Immediate Actions Required</h3>
          <ol>
            <li><strong>Review Menu:</strong> Check all planned dishes for conflicts</li>
            <li><strong>Kitchen Protocol:</strong> Implement cross-contamination prevention</li>
            <li><strong>Staff Training:</strong> Brief kitchen and service staff</li>
            <li><strong>Emergency Plan:</strong> Ensure emergency contacts are accessible</li>
            <li><strong>Verify Requirements:</strong> Contact guest to confirm details</li>
          </ol>

          <div style="background: #eff6ff; border: 1px solid #3b82f6; padding: 12px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>💡 WedSync Recommendation:</strong> Use our AI Menu Generator to create compliant alternatives automatically.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/weddings/${notification.weddingId}/dietary" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Review Dietary Requirements →
            </a>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated alert from WedSync. For support, contact us at support@wedsync.com
          </p>
        </div>
      `
    })

    // Send SMS if enabled
    if (supplier.notification_preferences?.sms_enabled && supplier.contact_phone) {
      await this.sendSMSAlert(
        supplier.contact_phone,
        `🚨 HIGH-RISK DIETARY ALERT: ${requirement.guestName} has severe ${requirement.category} (Level ${requirement.severity}). Check WedSync immediately. Wedding: ${wedding.couple_name}`
      )
    }

    // Create in-app notification
    await this.createInAppNotification({
      userId: wedding.supplier_id,
      type: 'high_risk_dietary',
      title: 'High-Risk Dietary Requirement',
      message: `${requirement.guestName} has a severe ${requirement.category} requiring immediate attention`,
      data: { weddingId: notification.weddingId, requirementId: requirement.id },
      urgency: 'high'
    })
  }

  async sendMenuComplianceAlert(
    weddingId: string,
    complianceIssues: ComplianceIssue[]
  ): Promise<void> {
    const criticalIssues = complianceIssues.filter(issue => issue.riskLevel === 'critical')
    
    if (criticalIssues.length === 0) return

    const { data: wedding } = await this.supabase
      .from('weddings')
      .select(`
        *,
        suppliers (company_name, contact_email, notification_preferences)
      `)
      .eq('id', weddingId)
      .single()

    if (!wedding) return

    await this.resend.emails.send({
      from: 'alerts@wedsync.com',
      to: wedding.suppliers.contact_email,
      subject: `⚠️ Menu Compliance Issues - ${wedding.couple_name}`,
      html: this.buildComplianceAlertEmail(wedding, criticalIssues)
    })
  }

  async sendGuestVerificationRequest(
    weddingId: string,
    guestEmail: string,
    requirements: DietaryRequirement[]
  ): Promise<void> {
    const verificationToken = this.generateVerificationToken()
    
    // Store verification request
    await this.supabase
      .from('dietary_verification_requests')
      .insert({
        wedding_id: weddingId,
        guest_email: guestEmail,
        verification_token: verificationToken,
        requirements: requirements,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })

    const { data: wedding } = await this.supabase
      .from('weddings')
      .select('couple_name, wedding_date')
      .eq('id', weddingId)
      .single()

    await this.resend.emails.send({
      from: 'noreply@wedsync.com',
      to: guestEmail,
      subject: `Please confirm your dietary requirements - ${wedding?.couple_name} Wedding`,
      html: this.buildVerificationEmail(wedding, requirements, verificationToken)
    })
  }

  async sendWeeklyDigest(supplierId: string): Promise<void> {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)

    const { data: activities } = await this.supabase
      .from('dietary_audit_log')
      .select(`
        *,
        weddings (couple_name, wedding_date)
      `)
      .eq('user_id', supplierId)
      .gte('created_at', weekStart.toISOString())

    if (!activities || activities.length === 0) return

    const { data: supplier } = await this.supabase
      .from('suppliers')
      .select('company_name, contact_email, notification_preferences')
      .eq('id', supplierId)
      .single()

    if (!supplier?.notification_preferences?.weekly_digest) return

    await this.resend.emails.send({
      from: 'digest@wedsync.com',
      to: supplier.contact_email,
      subject: 'Weekly Dietary Management Summary - WedSync',
      html: this.buildWeeklyDigest(supplier, activities)
    })
  }

  private async sendSMSAlert(phone: string, message: string): Promise<void> {
    // Implementation would use Twilio or similar SMS service
    try {
      const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + process.env.TWILIO_ACCOUNT_SID + '/Messages.json', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_PHONE_NUMBER!,
          To: phone,
          Body: message
        })
      })

      if (!response.ok) {
        throw new Error('SMS send failed')
      }
    } catch (error) {
      console.error('Failed to send SMS alert:', error)
    }
  }

  private async createInAppNotification(notification: InAppNotification): Promise<void> {
    await this.supabase
      .from('notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        urgency: notification.urgency,
        read: false
      })
  }

  private generateVerificationToken(): string {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
  }

  private buildVerificationEmail(wedding: any, requirements: DietaryRequirement[], token: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Please Confirm Your Dietary Requirements</h2>
        <p>Hello! We want to ensure your dining experience at ${wedding?.couple_name}'s wedding is safe and enjoyable.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <h3>Your Current Dietary Requirements:</h3>
          <ul>
            ${requirements.map(req => `
              <li><strong>${req.category}:</strong> ${req.notes}</li>
            `).join('')}
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/verify-dietary/${token}" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Confirm Requirements →
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">
          This link expires in 7 days. If you have any questions, please contact the wedding catering team directly.
        </p>
      </div>
    `
  }

  private buildComplianceAlertEmail(wedding: any, issues: ComplianceIssue[]): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin: 0;">Menu Compliance Issues Detected</h2>
        </div>
        
        <h3>Wedding: ${wedding.couple_name}</h3>
        <p>The following critical dietary compliance issues were found in your menu:</p>
        
        ${issues.map(issue => `
          <div style="background: #fef3c7; border: 1px solid #d97706; padding: 12px; border-radius: 6px; margin: 16px 0;">
            <h4>${issue.dishName}</h4>
            <p><strong>Issue:</strong> ${issue.description}</p>
            <p><strong>Affected Guest:</strong> ${issue.guestName}</p>
            <p><strong>Risk Level:</strong> ${issue.riskLevel}</p>
            ${issue.suggestion ? `<p><strong>Suggestion:</strong> ${issue.suggestion}</p>` : ''}
          </div>
        `).join('')}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/weddings/${wedding.id}/menu/review" 
             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Review Menu →
          </a>
        </div>
      </div>
    `
  }

  private buildWeeklyDigest(supplier: any, activities: any[]): string {
    const stats = this.calculateWeeklyStats(activities)
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Weekly Dietary Management Summary</h2>
        <p>Here's what happened with your dietary management this week:</p>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0;">
          <div style="background: #f0f9ff; padding: 16px; border-radius: 6px; text-align: center;">
            <h3 style="color: #0369a1; margin: 0 0 8px 0;">${stats.newRequirements}</h3>
            <p style="margin: 0; color: #0369a1;">New Requirements</p>
          </div>
          <div style="background: #f0fdf4; padding: 16px; border-radius: 6px; text-align: center;">
            <h3 style="color: #166534; margin: 0 0 8px 0;">${stats.menusGenerated}</h3>
            <p style="margin: 0; color: #166534;">Menus Generated</p>
          </div>
        </div>
        
        <h3>Recent Activities</h3>
        <ul>
          ${activities.slice(0, 10).map(activity => `
            <li>${activity.weddings.couple_name}: ${this.formatActivityDescription(activity)}</li>
          `).join('')}
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/dietary" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Full Dashboard →
          </a>
        </div>
      </div>
    `
  }

  private calculateWeeklyStats(activities: any[]): WeeklyStats {
    return {
      newRequirements: activities.filter(a => a.action_type === 'requirement_added').length,
      menusGenerated: activities.filter(a => a.action_type === 'menu_generated').length,
      complianceIssues: activities.filter(a => a.action_type === 'compliance_issue').length,
      guestsVerified: activities.filter(a => a.action_type === 'guest_verified').length
    }
  }

  private formatActivityDescription(activity: any): string {
    const descriptions = {
      'requirement_added': 'New dietary requirement added',
      'menu_generated': 'AI menu generated',
      'compliance_issue': 'Compliance issue detected',
      'guest_verified': 'Guest dietary requirements verified'
    }

    return descriptions[activity.action_type as keyof typeof descriptions] || 'Activity recorded'
  }

  // Queue management for batch notifications
  private queueFollowUpNotifications(notification: HighRiskNotification): void {
    // Schedule reminder if not acknowledged within 1 hour
    setTimeout(() => {
      this.sendFollowUpReminder(notification)
    }, 60 * 60 * 1000)
  }

  private async sendFollowUpReminder(notification: HighRiskNotification): Promise<void> {
    // Check if requirement has been acknowledged
    const { data: requirement } = await this.supabase
      .from('guest_dietary_requirements')
      .select('supplier_notes')
      .eq('id', notification.requirement.id)
      .single()

    if (requirement?.supplier_notes) {
      return // Already acknowledged
    }

    // Send follow-up notification
    await this.sendImmediateNotification({
      ...notification,
      type: 'high_risk_follow_up',
      urgency: 'critical'
    })
  }
}

// Type definitions for notifications
interface HighRiskNotification {
  type: string
  weddingId: string
  requirement: HighRiskRequirement
  urgency: 'low' | 'medium' | 'high' | 'critical'
  createdAt: Date
}

interface HighRiskRequirement {
  id: string
  guestName: string
  category: string
  severity: number
  notes: string
  emergencyContact?: string
}

interface ComplianceIssue {
  dishName: string
  guestName: string
  description: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  suggestion?: string
}

interface InAppNotification {
  userId: string
  type: string
  title: string
  message: string
  data: any
  urgency: 'low' | 'medium' | 'high' | 'critical'
}

interface WeeklyStats {
  newRequirements: number
  menusGenerated: number
  complianceIssues: number
  guestsVerified: number
}

type NotificationQueue = Map<string, HighRiskNotification>
```

### 4. Integration Testing Suite

```typescript
// File: __tests__/integrations/dietary-integrations.test.ts

import { OpenAIDietaryService } from '@/lib/integrations/OpenAIDietaryService'
import { GuestManagementIntegration } from '@/lib/integrations/GuestManagementIntegration'
import { DietaryNotificationService } from '@/lib/integrations/DietaryNotificationService'

describe('Dietary Management Integrations', () => {
  describe('OpenAI Integration', () => {
    let service: OpenAIDietaryService

    beforeEach(() => {
      service = new OpenAIDietaryService({
        apiKey: process.env.OPENAI_API_KEY!,
        maxRetries: 3,
        timeout: 30000
      })
    })

    test('generates dietary compliant menu', async () => {
      const request = {
        guestCount: 50,
        dietaryRequirements: {
          allergies: ['nuts', 'shellfish'],
          diets: ['vegetarian'],
          medical: ['celiac'],
          preferences: []
        },
        menuStyle: 'formal',
        budgetPerPerson: 85,
        culturalPreferences: ['Italian'],
        seasonalIngredients: ['spring vegetables'],
        weddingContext: {
          date: '2024-06-15',
          timeOfDay: 'evening',
          venueType: 'outdoor',
          duration: 4
        }
      }

      const result = await service.generateDietaryCompliantMenu(
        request,
        'user-123',
        { useCache: false }
      )

      expect(result.menu).toBeDefined()
      expect(result.complianceAnalysis.overallScore).toBeGreaterThan(0.8)
      expect(result.menu.courses).toHaveLength(3)
      expect(result.costAnalysis.costPerPerson).toBeCloseTo(85, 10)
    }, 60000) // 60 second timeout for AI operations

    test('handles rate limiting gracefully', async () => {
      // Mock rate limiter to simulate limit exceeded
      const rateLimitError = new Error('Rate limit exceeded')
      rateLimitError.name = 'RateLimitError'

      jest.spyOn(service['rateLimiter'], 'check').mockRejectedValue(rateLimitError)

      await expect(
        service.generateDietaryCompliantMenu({} as any, 'user-123')
      ).rejects.toThrow('Rate limit exceeded')
    })

    test('circuit breaker opens after failures', async () => {
      // Mock OpenAI to fail repeatedly
      jest.spyOn(service['openai'].chat.completions, 'create').mockRejectedValue(
        new Error('OpenAI service unavailable')
      )

      // Trigger multiple failures to open circuit breaker
      for (let i = 0; i < 6; i++) {
        try {
          await service.analyzeDietaryConflicts({
            ingredients: ['test'],
            dietaryRestrictions: ['test']
          })
        } catch (error) {
          // Expected failures
        }
      }

      expect(service['circuitBreaker'].getState()).toBe('open')
    })
  })

  describe('Guest Management Integration', () => {
    let integration: GuestManagementIntegration

    beforeEach(() => {
      integration = new GuestManagementIntegration()
    })

    test('syncs guest dietary requirements', async () => {
      const mockGuests = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          dietaryNotes: 'severe nut allergy',
          dietaryVerified: true,
          emergencyContact: '+1234567890'
        },
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          dietaryNotes: 'vegan',
          dietaryVerified: false
        }
      ]

      const result = await integration.syncGuestDietaryRequirements(
        'wedding-123',
        mockGuests
      )

      expect(result.totalGuests).toBe(2)
      expect(result.requirementsFound).toBe(2)
      expect(result.errors).toHaveLength(0)
    })

    test('handles external system imports', async () => {
      const mockCredentials = {
        apiUrl: 'https://api.rsvpify.com',
        apiKey: 'test-key',
        eventId: 'event-123'
      }

      // Mock the RSVPify importer
      jest.spyOn(integration as any, 'getSystemImporter').mockReturnValue({
        fetchGuests: jest.fn().mockResolvedValue([
          {
            name: 'Guest 1',
            dietaryNotes: 'lactose intolerant'
          }
        ])
      })

      const result = await integration.importFromExternalSystem(
        'wedding-123',
        'rsvpify',
        mockCredentials
      )

      expect(result.system).toBe('rsvpify')
      expect(result.importedCount).toBe(1)
    })

    test('emits events for dietary requirement changes', (done) => {
      integration.on('dietary_requirements_updated', (event) => {
        expect(event.weddingId).toBe('wedding-123')
        expect(event.guestCount).toBe(2)
        done()
      })

      // Trigger the event
      integration.emit('dietary_requirements_updated', {
        weddingId: 'wedding-123',
        guestCount: 2,
        requirementCount: 1
      })
    })
  })

  describe('Notification Service', () => {
    let service: DietaryNotificationService

    beforeEach(() => {
      service = new DietaryNotificationService()
    })

    test('sends high-risk dietary requirement notifications', async () => {
      const mockRequirement = {
        id: 'req-123',
        guestName: 'John Doe',
        category: 'allergy',
        severity: 5,
        notes: 'severe anaphylactic reaction to nuts',
        emergencyContact: '+1234567890'
      }

      // Mock Resend email service
      jest.spyOn(service['resend'].emails, 'send').mockResolvedValue({
        id: 'email-123',
        from: 'alerts@wedsync.com',
        to: 'supplier@example.com',
        created_at: new Date().toISOString()
      })

      await service.notifyHighRiskRequirement('wedding-123', mockRequirement)

      expect(service['resend'].emails.send).toHaveBeenCalled()
    })

    test('sends guest verification requests', async () => {
      const mockRequirements = [
        {
          id: 'req-1',
          category: 'allergy',
          notes: 'nut allergy',
          severity: 4
        }
      ]

      jest.spyOn(service['resend'].emails, 'send').mockResolvedValue({
        id: 'verification-email-123',
        from: 'noreply@wedsync.com',
        to: 'guest@example.com',
        created_at: new Date().toISOString()
      })

      await service.sendGuestVerificationRequest(
        'wedding-123',
        'guest@example.com',
        mockRequirements
      )

      expect(service['resend'].emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'guest@example.com',
          subject: expect.stringContaining('confirm your dietary requirements')
        })
      )
    })

    test('handles SMS notifications when enabled', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sid: 'sms-123' })
      })
      global.fetch = mockFetch

      await service['sendSMSAlert'](
        '+1234567890',
        'Test SMS alert message'
      )

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('twilio.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic')
          })
        })
      )
    })
  })

  describe('Integration Health Monitoring', () => {
    test('monitors OpenAI service health', async () => {
      const service = new OpenAIDietaryService({
        apiKey: process.env.OPENAI_API_KEY!,
        maxRetries: 1,
        timeout: 5000
      })

      const health = await service.getServiceHealth()

      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('circuitBreakerState')
      expect(health).toHaveProperty('metrics')
    })

    test('handles service degradation gracefully', async () => {
      // Mock service failure
      const service = new OpenAIDietaryService({
        apiKey: 'invalid-key',
        maxRetries: 1,
        timeout: 1000
      })

      const health = await service.getServiceHealth()

      expect(health.status).toBe('unhealthy')
      expect(health.error).toBeDefined()
    })
  })

  describe('Error Recovery', () => {
    test('recovers from temporary OpenAI outages', async () => {
      const service = new OpenAIDietaryService({
        apiKey: process.env.OPENAI_API_KEY!,
        maxRetries: 3,
        timeout: 30000
      })

      let callCount = 0
      jest.spyOn(service['openai'].chat.completions, 'create').mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          throw new Error('Temporary service unavailable')
        }
        return Promise.resolve({
          choices: [{
            message: { content: JSON.stringify({ test: 'success' }) }
          }],
          usage: { total_tokens: 100 }
        } as any)
      })

      const result = await service.analyzeDietaryConflicts({
        ingredients: ['test'],
        dietaryRestrictions: ['test']
      })

      expect(result).toBeDefined()
      expect(callCount).toBe(3) // Should have retried twice
    })
  })
})
```

## COMPLETION CHECKLIST

### Integration Services ✅
- [ ] OpenAI integration with circuit breaker and retry logic
- [ ] Guest management system integration
- [ ] Real-time notification service
- [ ] External system importers (RSVPify, TheKnot, etc.)
- [ ] Email and SMS notification systems
- [ ] Service health monitoring

### Error Handling & Resilience ✅
- [ ] Circuit breaker pattern implementation
- [ ] Exponential backoff retry logic
- [ ] Rate limiting and quota management
- [ ] Graceful degradation strategies
- [ ] Comprehensive error logging

### Testing Coverage ✅
- [ ] Unit tests for all integration services
- [ ] Integration tests with external APIs
- [ ] Error scenario testing
- [ ] Performance and load testing
- [ ] Service health monitoring tests

### Security & Compliance ✅
- [ ] API key management and rotation
- [ ] Request/response sanitization
- [ ] Audit logging for all integrations
- [ ] Data privacy compliance
- [ ] Rate limiting protection

### Monitoring & Alerting ✅
- [ ] Service health dashboards
- [ ] Performance metrics collection
- [ ] Error rate monitoring
- [ ] Cost tracking for AI services
- [ ] Proactive alerting for failures

**CRITICAL**: These integrations must handle 50,000+ daily dietary analysis requests with 99.9% uptime during peak wedding season. All services must include comprehensive monitoring, alerting, and automatic failover capabilities.