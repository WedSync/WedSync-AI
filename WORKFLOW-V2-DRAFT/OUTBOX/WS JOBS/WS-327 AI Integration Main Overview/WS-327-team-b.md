# TEAM B - ROUND 1: WS-327 - AI Integration Main Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build the backend/API infrastructure for AI integration including OpenAI service integration, usage tracking, cost management, and secure AI request processing
**FEATURE ID:** WS-327 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating scalable, cost-effective AI backend that can handle thousands of suppliers generating content simultaneously

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/ai/
ls -la $WS_ROOT/wedsync/src/lib/ai/
cat $WS_ROOT/wedsync/src/app/api/ai/generate-form/route.ts | head-20
cat $WS_ROOT/wedsync/src/lib/ai/openai-service.ts | head-20
```

2. **TYPECHECK RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm test -- --testPathPattern="ai.*api"
# MUST show: "All tests passing"
```

4. **DATABASE MIGRATION TEST:**
```bash
cd $WS_ROOT/wedsync && npx supabase migration up --local
# MUST show: "All migrations applied successfully"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing API patterns and service architecture
await mcp__serena__search_for_pattern("api.*route|service.*integration|openai.*client");
await mcp__serena__find_symbol("createSupabaseClient", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
await mcp__serena__find_symbol("withSecureValidation", "", true);
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR API WORK)
```typescript
// Load the technical architecture for understanding AI integration patterns
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation specific to AI service integration and OpenAI API
await mcp__Ref__ref_search_documentation("OpenAI API Next.js 15 streaming responses integration");
await mcp__Ref__ref_search_documentation("PostgreSQL usage tracking cost management patterns");
await mcp__Ref__ref_search_documentation("Rate limiting API security AI service patterns");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR AI BACKEND ARCHITECTURE

### Use Sequential Thinking MCP for AI Service Planning
```typescript
// Plan the AI backend service architecture
mcp__sequential-thinking__sequential_thinking({
  thought: "For AI backend integration, I need: 1) OpenAI service wrapper with error handling, 2) Usage tracking system for billing, 3) Cost management with tier limits, 4) Streaming response handling, 5) Content moderation and filtering, 6) Rate limiting per supplier, 7) Caching for common requests.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Database design considerations: ai_usage_tracking table for billing, ai_models table for configuration, ai_cache table for response caching. Need proper indexing for usage queries, cost calculations, and audit trails for compliance.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down AI API endpoints, track service dependencies
2. **nextjs-fullstack-developer** - Use Serena for API pattern consistency  
3. **security-compliance-officer** - Ensure AI API security and data protection
4. **code-quality-guardian** - Maintain TypeScript/API standards
5. **test-automation-architect** - AI API testing with mock responses
6. **documentation-chronicler** - Evidence-based AI API documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### AI API SECURITY CHECKLIST:
- [ ] **API key protection** - Store OpenAI keys securely, never expose in logs
- [ ] **Input validation** - Validate all AI prompts and parameters with Zod
- [ ] **Output sanitization** - Filter and validate all AI responses
- [ ] **Rate limiting** - Per-supplier limits based on subscription tier
- [ ] **Usage quotas** - Enforce monthly usage limits
- [ ] **Content moderation** - Filter inappropriate content from AI responses
- [ ] **Audit logging** - Log all AI requests for billing and compliance
- [ ] **Error handling** - Never leak AI service errors to frontend

### REQUIRED SECURITY IMPORTS:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '$WS_ROOT/wedsync/src/lib/auth/options';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
import { aiUsageSchema, aiRequestSchema } from '$WS_ROOT/wedsync/src/lib/validation/ai-schemas';
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/AI API FOCUS

**PRIMARY RESPONSIBILITIES:**
- AI service integration with OpenAI and other providers
- Usage tracking and billing calculation systems
- Cost optimization and caching strategies
- Authentication and rate limiting for AI endpoints
- Error handling and graceful degradation
- Business logic for AI feature limitations by tier
- Streaming response handling and real-time updates

### AI INTEGRATION BACKEND REQUIREMENTS

#### 1. DATABASE MIGRATION
```sql
-- File: $WS_ROOT/wedsync/supabase/migrations/YYYYMMDDHHMMSS_ai_integration.sql

-- AI usage tracking for billing and analytics
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  feature_type VARCHAR(100) NOT NULL, -- 'form_generation', 'email_template', 'content_creation', 'chatbot'
  model_used VARCHAR(100) NOT NULL, -- 'gpt-4', 'gpt-3.5-turbo', etc.
  tokens_used INTEGER NOT NULL,
  cost_cents INTEGER NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  request_duration_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI model configuration and pricing
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL UNIQUE,
  provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'local'
  model_config JSONB DEFAULT '{}',
  cost_per_input_token NUMERIC(10,8) NOT NULL,
  cost_per_output_token NUMERIC(10,8) NOT NULL,
  max_tokens INTEGER DEFAULT 4096,
  supports_streaming BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI response cache for cost optimization
CREATE TABLE IF NOT EXISTS ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash VARCHAR(64) NOT NULL UNIQUE,
  feature_type VARCHAR(100) NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  response_content TEXT NOT NULL,
  tokens_saved INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI usage limits by subscription tier
CREATE TABLE IF NOT EXISTS ai_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name VARCHAR(50) NOT NULL, -- 'starter', 'professional', 'scale', 'enterprise'
  feature_type VARCHAR(100) NOT NULL,
  monthly_limit INTEGER NOT NULL, -- Number of requests per month
  daily_limit INTEGER NOT NULL, -- Number of requests per day
  cost_limit_cents INTEGER NOT NULL, -- Maximum cost per month in cents
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_usage_supplier_date ON ai_usage_tracking(supplier_id, created_at);
CREATE INDEX idx_ai_usage_feature_date ON ai_usage_tracking(feature_type, created_at);
CREATE INDEX idx_ai_cache_hash ON ai_response_cache(prompt_hash);
CREATE INDEX idx_ai_cache_expires ON ai_response_cache(expires_at);

-- RLS Policies
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Suppliers can only access their own usage data
CREATE POLICY "Suppliers can view their AI usage" ON ai_usage_tracking
  FOR SELECT USING (
    supplier_id = auth.uid() OR
    supplier_id IN (
      SELECT id FROM user_profiles 
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- Cache is shared but read-only for suppliers
CREATE POLICY "Suppliers can read AI cache" ON ai_response_cache
  FOR SELECT USING (true);

-- Insert default AI models
INSERT INTO ai_models (model_name, provider, cost_per_input_token, cost_per_output_token, max_tokens, supports_streaming) VALUES
('gpt-4', 'openai', 0.00003000, 0.00006000, 8192, true),
('gpt-3.5-turbo', 'openai', 0.00000150, 0.00000200, 4096, true),
('gpt-4-turbo', 'openai', 0.00001000, 0.00003000, 128000, true);

-- Insert default usage limits
INSERT INTO ai_usage_limits (tier_name, feature_type, monthly_limit, daily_limit, cost_limit_cents) VALUES
('starter', 'form_generation', 10, 2, 500), -- $5/month limit
('starter', 'email_template', 20, 5, 500),
('starter', 'content_creation', 15, 3, 500),
('professional', 'form_generation', 50, 10, 2000), -- $20/month limit
('professional', 'email_template', 100, 20, 2000),
('professional', 'content_creation', 75, 15, 2000),
('professional', 'chatbot', 200, 50, 2000),
('scale', 'form_generation', 200, 40, 5000), -- $50/month limit
('scale', 'email_template', 500, 100, 5000),
('scale', 'content_creation', 300, 60, 5000),
('scale', 'chatbot', 1000, 200, 5000),
('enterprise', 'form_generation', -1, -1, -1), -- Unlimited
('enterprise', 'email_template', -1, -1, -1),
('enterprise', 'content_creation', -1, -1, -1),
('enterprise', 'chatbot', -1, -1, -1);
```

#### 2. AI SERVICE ABSTRACTION LAYER
```typescript
// File: $WS_ROOT/wedsync/src/lib/ai/openai-service.ts

import { OpenAI } from 'openai';
import { AIUsageTracker } from './usage-tracker';
import { AICacheService } from './cache-service';

export interface AIServiceConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AIRequest {
  supplierId: string;
  featureType: 'form_generation' | 'email_template' | 'content_creation' | 'chatbot';
  prompt: string;
  config?: AIServiceConfig;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  costCents: number;
  model: string;
  fromCache: boolean;
  requestId: string;
}

export class OpenAIService {
  private client: OpenAI;
  private usageTracker: AIUsageTracker;
  private cacheService: AICacheService;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    this.usageTracker = new AIUsageTracker();
    this.cacheService = new AICacheService();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
  }

  async generateContent(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // Check usage limits first
      await this.checkUsageLimits(request.supplierId, request.featureType);

      // Check cache for similar requests
      const cachedResponse = await this.cacheService.getCachedResponse(
        request.prompt, 
        request.featureType,
        request.config?.model || 'gpt-3.5-turbo'
      );

      if (cachedResponse) {
        await this.usageTracker.recordCacheHit(request.supplierId, request.featureType);
        return {
          content: cachedResponse.content,
          tokensUsed: 0,
          costCents: 0,
          model: cachedResponse.model,
          fromCache: true,
          requestId
        };
      }

      // Make OpenAI request
      const response = await this.client.chat.completions.create({
        model: request.config?.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(request.featureType)
          },
          {
            role: 'user',
            content: request.prompt
          }
        ],
        max_tokens: request.config?.maxTokens || 1000,
        temperature: request.config?.temperature || 0.7,
        stream: request.config?.stream || false
      });

      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;
      const costCents = await this.calculateCost(
        request.config?.model || 'gpt-3.5-turbo',
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      );

      // Track usage
      await this.usageTracker.recordUsage({
        supplierId: request.supplierId,
        featureType: request.featureType,
        model: request.config?.model || 'gpt-3.5-turbo',
        tokensUsed,
        costCents,
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        requestDuration: Date.now() - startTime,
        success: true
      });

      // Cache the response for future use
      await this.cacheService.cacheResponse({
        prompt: request.prompt,
        featureType: request.featureType,
        model: request.config?.model || 'gpt-3.5-turbo',
        content,
        tokensUsed
      });

      return {
        content,
        tokensUsed,
        costCents,
        model: request.config?.model || 'gpt-3.5-turbo',
        fromCache: false,
        requestId
      };

    } catch (error) {
      await this.usageTracker.recordUsage({
        supplierId: request.supplierId,
        featureType: request.featureType,
        model: request.config?.model || 'gpt-3.5-turbo',
        tokensUsed: 0,
        costCents: 0,
        promptTokens: 0,
        completionTokens: 0,
        requestDuration: Date.now() - startTime,
        success: false,
        errorMessage: error.message
      });

      throw new Error(`AI request failed: ${error.message}`);
    }
  }

  async *generateStreamingContent(request: AIRequest): AsyncGenerator<string, AIResponse, unknown> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    let content = '';
    let tokensUsed = 0;

    try {
      await this.checkUsageLimits(request.supplierId, request.featureType);

      const stream = await this.client.chat.completions.create({
        model: request.config?.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(request.featureType)
          },
          {
            role: 'user',
            content: request.prompt
          }
        ],
        max_tokens: request.config?.maxTokens || 1000,
        temperature: request.config?.temperature || 0.7,
        stream: true
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          content += delta;
          yield delta;
        }
      }

      // Estimate tokens and cost (streaming doesn't provide exact usage)
      tokensUsed = Math.ceil(content.length / 4); // Rough estimate
      const costCents = await this.calculateCost(
        request.config?.model || 'gpt-3.5-turbo',
        Math.ceil(request.prompt.length / 4),
        tokensUsed
      );

      await this.usageTracker.recordUsage({
        supplierId: request.supplierId,
        featureType: request.featureType,
        model: request.config?.model || 'gpt-3.5-turbo',
        tokensUsed,
        costCents,
        promptTokens: Math.ceil(request.prompt.length / 4),
        completionTokens: tokensUsed,
        requestDuration: Date.now() - startTime,
        success: true
      });

      return {
        content,
        tokensUsed,
        costCents,
        model: request.config?.model || 'gpt-3.5-turbo',
        fromCache: false,
        requestId
      };

    } catch (error) {
      await this.usageTracker.recordUsage({
        supplierId: request.supplierId,
        featureType: request.featureType,
        model: request.config?.model || 'gpt-3.5-turbo',
        tokensUsed: 0,
        costCents: 0,
        promptTokens: 0,
        completionTokens: 0,
        requestDuration: Date.now() - startTime,
        success: false,
        errorMessage: error.message
      });

      throw error;
    }
  }

  private async checkUsageLimits(supplierId: string, featureType: string): Promise<void> {
    const usage = await this.usageTracker.getCurrentUsage(supplierId, featureType);
    const limits = await this.usageTracker.getUsageLimits(supplierId, featureType);

    if (limits.monthlyLimit > 0 && usage.monthlyRequests >= limits.monthlyLimit) {
      throw new Error('Monthly AI usage limit exceeded. Please upgrade your plan.');
    }

    if (limits.dailyLimit > 0 && usage.dailyRequests >= limits.dailyLimit) {
      throw new Error('Daily AI usage limit exceeded. Please try again tomorrow.');
    }

    if (limits.costLimitCents > 0 && usage.monthlyCostCents >= limits.costLimitCents) {
      throw new Error('Monthly AI cost limit exceeded. Please upgrade your plan.');
    }
  }

  private getSystemPrompt(featureType: string): string {
    switch (featureType) {
      case 'form_generation':
        return `You are an expert wedding industry form designer. Create professional, comprehensive forms for wedding suppliers that capture all necessary client information. Include proper field types, validation rules, and wedding-specific terminology. Format as structured form configuration.`;
      
      case 'email_template':
        return `You are a professional wedding industry communication specialist. Create warm, professional email templates for wedding suppliers to communicate with their clients. Use appropriate wedding terminology and maintain a balance between professional and personal tone.`;
      
      case 'content_creation':
        return `You are a wedding industry content expert. Create engaging, informative content for wedding suppliers including blog posts, social media content, website copy, and client communications. Focus on providing value to couples planning their special day.`;
      
      case 'chatbot':
        return `You are a helpful wedding planning assistant. Provide accurate, supportive information about wedding planning, vendor coordination, and timeline management. Always be encouraging and understanding of the stress couples may be feeling.`;
      
      default:
        return `You are a helpful assistant specializing in wedding industry workflows and communication.`;
    }
  }

  private async calculateCost(model: string, promptTokens: number, completionTokens: number): Promise<number> {
    const supabase = createSupabaseClient();
    
    const { data: modelData, error } = await supabase
      .from('ai_models')
      .select('cost_per_input_token, cost_per_output_token')
      .eq('model_name', model)
      .single();

    if (error || !modelData) {
      throw new Error(`Model pricing not found for: ${model}`);
    }

    const inputCost = promptTokens * modelData.cost_per_input_token;
    const outputCost = completionTokens * modelData.cost_per_output_token;
    
    return Math.ceil((inputCost + outputCost) * 100); // Convert to cents
  }
}
```

#### 3. API ROUTES IMPLEMENTATION

**Form Generation API:**
```typescript
// File: $WS_ROOT/wedsync/src/app/api/ai/generate-form/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { generateFormSchema } from '$WS_ROOT/wedsync/src/lib/validation/ai-schemas';
import { OpenAIService } from '$WS_ROOT/wedsync/src/lib/ai/openai-service';

export const POST = withSecureValidation(
  generateFormSchema,
  async (request: NextRequest, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for AI requests
    const rateLimitResult = await rateLimitService.checkRateLimit(
      request, 
      `ai-form-${session.user.id}`, 
      5, // 5 requests
      3600 // per hour
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    try {
      const aiService = new OpenAIService();
      
      const prompt = `Generate a comprehensive form for a ${validatedData.vendorType} to collect ${validatedData.formPurpose} information.

Required fields: ${validatedData.requiredFields.join(', ')}
Additional context: ${validatedData.customInstructions}

Return a JSON structure with:
- title: Form title
- description: Brief description
- fields: Array of field objects with type, name, label, required, options (for select fields)
- validation: Validation rules for each field

Make it professional and wedding-industry appropriate.`;

      const response = await aiService.generateContent({
        supplierId: session.user.id,
        featureType: 'form_generation',
        prompt,
        config: {
          model: 'gpt-3.5-turbo',
          maxTokens: 1500,
          temperature: 0.7
        }
      });

      // Parse and validate the generated form structure
      let generatedForm;
      try {
        generatedForm = JSON.parse(response.content);
      } catch (parseError) {
        throw new Error('Failed to parse generated form structure');
      }

      return NextResponse.json({
        form: generatedForm,
        usage: {
          tokensUsed: response.tokensUsed,
          costCents: response.costCents,
          fromCache: response.fromCache
        }
      });

    } catch (error) {
      console.error('Form generation error:', error);
      return NextResponse.json({
        error: error.message || 'Form generation failed'
      }, { status: 500 });
    }
  }
);
```

**Email Template Generation API:**
```typescript
// File: $WS_ROOT/wedsync/src/app/api/ai/generate-email-template/route.ts

export const POST = withSecureValidation(
  generateEmailTemplateSchema,
  async (request: NextRequest, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const aiService = new OpenAIService();
    
    const prompt = `Create a professional email template for a wedding ${validatedData.templateType}.

Context:
- Recipient: ${validatedData.context.recipientType}
- Occasion: ${validatedData.context.occasion}
- Tone: ${validatedData.context.tone}
- Special instructions: ${validatedData.context.customInstructions}

Include:
- Compelling subject line
- Professional greeting
- Clear message body
- Appropriate closing
- Variable placeholders like {couple_name}, {wedding_date}, {venue_name}

Make it warm but professional, suitable for wedding communications.`;

    try {
      // Use streaming response for real-time generation
      if (validatedData.stream) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of aiService.generateStreamingContent({
                supplierId: session.user.id,
                featureType: 'email_template',
                prompt,
                config: { stream: true }
              })) {
                controller.enqueue(encoder.encode(chunk));
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked'
          }
        });
      } else {
        const response = await aiService.generateContent({
          supplierId: session.user.id,
          featureType: 'email_template',
          prompt
        });

        return NextResponse.json({
          template: response.content,
          usage: {
            tokensUsed: response.tokensUsed,
            costCents: response.costCents,
            fromCache: response.fromCache
          }
        });
      }
    } catch (error) {
      console.error('Email template generation error:', error);
      return NextResponse.json({
        error: error.message || 'Template generation failed'
      }, { status: 500 });
    }
  }
);
```

#### 4. USAGE TRACKING SERVICE
```typescript
// File: $WS_ROOT/wedsync/src/lib/ai/usage-tracker.ts

import { createSupabaseClient } from '$WS_ROOT/wedsync/src/lib/supabase/client';

export interface UsageRecord {
  supplierId: string;
  featureType: string;
  model: string;
  tokensUsed: number;
  costCents: number;
  promptTokens: number;
  completionTokens: number;
  requestDuration: number;
  success: boolean;
  errorMessage?: string;
}

export interface UsageStats {
  monthlyRequests: number;
  dailyRequests: number;
  monthlyCostCents: number;
  dailyCostCents: number;
}

export interface UsageLimits {
  monthlyLimit: number;
  dailyLimit: number;
  costLimitCents: number;
}

export class AIUsageTracker {
  private supabase = createSupabaseClient();

  async recordUsage(usage: UsageRecord): Promise<void> {
    const { error } = await this.supabase
      .from('ai_usage_tracking')
      .insert({
        supplier_id: usage.supplierId,
        feature_type: usage.featureType,
        model_used: usage.model,
        tokens_used: usage.tokensUsed,
        cost_cents: usage.costCents,
        prompt_tokens: usage.promptTokens,
        completion_tokens: usage.completionTokens,
        request_duration_ms: usage.requestDuration,
        success: usage.success,
        error_message: usage.errorMessage
      });

    if (error) {
      console.error('Failed to record AI usage:', error);
    }
  }

  async recordCacheHit(supplierId: string, featureType: string): Promise<void> {
    // Update cache hit statistics
    const { error } = await this.supabase.rpc('increment_cache_hits', {
      supplier_id: supplierId,
      feature_type: featureType
    });

    if (error) {
      console.error('Failed to record cache hit:', error);
    }
  }

  async getCurrentUsage(supplierId: string, featureType: string): Promise<UsageStats> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get monthly usage
    const { data: monthlyData, error: monthlyError } = await this.supabase
      .from('ai_usage_tracking')
      .select('cost_cents')
      .eq('supplier_id', supplierId)
      .eq('feature_type', featureType)
      .gte('created_at', monthStart.toISOString());

    // Get daily usage  
    const { data: dailyData, error: dailyError } = await this.supabase
      .from('ai_usage_tracking')
      .select('cost_cents')
      .eq('supplier_id', supplierId)
      .eq('feature_type', featureType)
      .gte('created_at', dayStart.toISOString());

    if (monthlyError || dailyError) {
      throw new Error('Failed to fetch usage statistics');
    }

    return {
      monthlyRequests: monthlyData?.length || 0,
      dailyRequests: dailyData?.length || 0,
      monthlyCostCents: monthlyData?.reduce((sum, record) => sum + record.cost_cents, 0) || 0,
      dailyCostCents: dailyData?.reduce((sum, record) => sum + record.cost_cents, 0) || 0
    };
  }

  async getUsageLimits(supplierId: string, featureType: string): Promise<UsageLimits> {
    // Get user's subscription tier
    const { data: userData, error: userError } = await this.supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', supplierId)
      .single();

    if (userError || !userData) {
      throw new Error('Failed to fetch user subscription tier');
    }

    // Get limits for this tier and feature
    const { data: limitsData, error: limitsError } = await this.supabase
      .from('ai_usage_limits')
      .select('monthly_limit, daily_limit, cost_limit_cents')
      .eq('tier_name', userData.subscription_tier)
      .eq('feature_type', featureType)
      .single();

    if (limitsError || !limitsData) {
      // Default limits if not found
      return {
        monthlyLimit: 10,
        dailyLimit: 2,
        costLimitCents: 500
      };
    }

    return {
      monthlyLimit: limitsData.monthly_limit,
      dailyLimit: limitsData.daily_limit,
      costLimitCents: limitsData.cost_limit_cents
    };
  }
}
```

## 📋 REAL WEDDING USER STORIES FOR AI BACKEND

**Emma & James (Photography Couple):**
*Backend needs: Generate photography intake forms, create follow-up email templates, track AI usage costs, handle streaming responses for real-time content creation*

**Sarah & Mike (Wedding Planners):**
*Backend needs: Cost-effective AI usage across multiple client accounts, bulk template generation, usage analytics for business planning, secure API key management*

**Lisa & David (Venue Owners):**
*Backend needs: Simple AI integration for booking forms, automated email responses, usage limits based on subscription tier, reliable error handling*

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Database migration with AI tracking, models, cache, and limits tables
- [ ] OpenAIService with streaming support and error handling
- [ ] AI API routes for form generation and email templates
- [ ] AIUsageTracker for billing and compliance
- [ ] AICacheService for cost optimization
- [ ] Rate limiting and usage quota enforcement
- [ ] Security validation and input sanitization
- [ ] Comprehensive error handling and logging
- [ ] Unit tests for all AI services (>90% coverage)
- [ ] Evidence package with API testing results

## 💾 WHERE TO SAVE YOUR WORK
- AI Services: `$WS_ROOT/wedsync/src/lib/ai/`
- API Routes: `$WS_ROOT/wedsync/src/app/api/ai/`
- Validation: `$WS_ROOT/wedsync/src/lib/validation/ai-schemas.ts`
- Types: `$WS_ROOT/wedsync/src/types/ai-integration.ts`
- Migration: `$WS_ROOT/wedsync/supabase/migrations/YYYYMMDDHHMMSS_ai_integration.sql`
- Tests: `$WS_ROOT/wedsync/src/__tests__/api/ai/`

## 🏁 COMPLETION CHECKLIST
- [ ] Database migration created and applied successfully
- [ ] OpenAI service integration with streaming support
- [ ] All AI API routes implemented with security validation
- [ ] Usage tracking and billing system working
- [ ] Cache service for cost optimization
- [ ] Rate limiting and quota enforcement implemented
- [ ] TypeScript compilation successful with no errors
- [ ] All tests passing (unit and integration tests)
- [ ] Error handling and audit logging implemented
- [ ] Evidence package prepared with API testing results
- [ ] Performance tested (API response times <200ms for cached, <5s for generation)

---

**EXECUTE IMMEDIATELY - Build the AI backend that will power intelligent wedding supplier workflows!**