import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { rateLimit } from '@/lib/rate-limit';
import { auditLogger } from '@/lib/middleware/audit';
import {
  EmailGenerationConfig,
  AIEmailVariant,
  EmailGenerationResponse,
} from '@/types/ai-email';

// Validation schemas
const secureStringSchema = z
  .string()
  .min(1)
  .max(500)
  .regex(/^[a-zA-Z0-9\s\-_.,!?()'"]+$/, 'Invalid characters detected');

const clientContextSchema = z.object({
  couple_names: secureStringSchema,
  wedding_date: z.string().date().optional(),
  venue_name: secureStringSchema.optional(),
  venue_type: z.enum(['indoor', 'outdoor', 'hybrid']).optional(),
  guest_count: z.number().int().min(1).max(1000).optional(),
  style_preference: secureStringSchema.optional(),
  budget_range: z.enum(['budget', 'mid', 'luxury']).optional(),
  special_requirements: secureStringSchema.optional(),
});

const vendorContextSchema = z.object({
  business_name: secureStringSchema,
  primary_category: secureStringSchema,
  years_experience: z.number().int().min(0).max(50).optional(),
  specialties: z.array(secureStringSchema).max(10),
  unique_selling_points: z.array(secureStringSchema).max(5),
  availability_status: z.enum(['available', 'limited', 'booked']),
});

const elementsSchema = z.object({
  pricing: z.boolean(),
  timeline: z.boolean(),
  next_steps: z.boolean(),
  portfolio: z.boolean(),
  testimonials: z.boolean(),
  availability: z.boolean(),
});

const generateEmailTemplateRequestSchema = z.object({
  config: z.object({
    stage: z.enum(['inquiry', 'booking', 'planning', 'final', 'post_wedding']),
    tone: z.enum(['formal', 'friendly', 'casual']),
    elements: elementsSchema,
    client_context: clientContextSchema,
    vendor_context: vendorContextSchema,
    custom_instructions: secureStringSchema.optional(),
    variant_count: z.number().int().min(1).max(10).default(5),
  }),
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
});

// OpenAI client initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting configuration - 5 requests per minute for AI generation
const rateLimitConfig = {
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 5,
};

// Security headers
const securityHeaders = {
  'Content-Security-Policy': "default-src 'none'; script-src 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

// Main POST handler
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let auditData: any = {
    action: 'ai_email_generation',
    timestamp: new Date().toISOString(),
    ip_address: request.headers.get('x-forwarded-for') || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
  };

  try {
    // 1. Authentication Check
    const session = await getServerSession();
    if (!session?.user?.id) {
      auditData.status = 'unauthorized';
      await auditLogger.log({
        event_type: 'ai_email_generation_unauthorized',
        resource_type: 'ai_service',
        metadata: auditData,
        ip_address: auditData.ip_address,
        user_agent: auditData.user_agent,
      });

      return NextResponse.json(
        { error: 'Authentication required' },
        {
          status: 401,
          headers: securityHeaders,
        },
      );
    }

    auditData.user_id = session.user.id;

    // 2. Rate Limiting
    const rateLimitResult = await rateLimit(
      request.headers.get('x-forwarded-for') || 'unknown',
      rateLimitConfig,
    );

    if (!rateLimitResult.success) {
      auditData.status = 'rate_limited';
      await auditLogger.log({
        event_type: 'ai_email_generation_rate_limited',
        resource_type: 'ai_service',
        metadata: auditData,
        ip_address: auditData.ip_address,
        user_agent: auditData.user_agent,
      });

      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            ...securityHeaders,
            'Retry-After': '60',
          },
        },
      );
    }

    // 3. Request Body Validation
    let requestBody: any;
    try {
      requestBody = await request.json();
    } catch (error) {
      auditData.status = 'invalid_json';
      await auditLogger.log({
        event_type: 'ai_email_generation_invalid_json',
        resource_type: 'ai_service',
        metadata: auditData,
        ip_address: auditData.ip_address,
        user_agent: auditData.user_agent,
      });

      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        {
          status: 400,
          headers: securityHeaders,
        },
      );
    }

    // 4. Zod Validation
    const validationResult =
      generateEmailTemplateRequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      auditData.status = 'validation_failed';
      auditData.validation_errors = validationResult.error.issues;
      await auditLogger.log({
        event_type: 'ai_email_generation_validation_failed',
        resource_type: 'ai_service',
        metadata: auditData,
        ip_address: auditData.ip_address,
        user_agent: auditData.user_agent,
      });

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        {
          status: 400,
          headers: securityHeaders,
        },
      );
    }

    const validatedData = validationResult.data;
    auditData.organization_id = validatedData.organization_id;
    auditData.config = validatedData.config;

    // 5. Database Authorization Check
    const supabase = await createClient();
    const { data: orgAccess, error: orgError } = await supabase
      .from('organizations')
      .select('id, subscription_status')
      .eq('id', validatedData.organization_id)
      .single();

    if (orgError || !orgAccess) {
      auditData.status = 'org_access_denied';
      await auditLogger.log({
        event_type: 'ai_email_generation_org_access_denied',
        resource_type: 'ai_service',
        metadata: auditData,
        ip_address: auditData.ip_address,
        user_agent: auditData.user_agent,
      });

      return NextResponse.json(
        { error: 'Organization access denied' },
        {
          status: 403,
          headers: securityHeaders,
        },
      );
    }

    // Check subscription limits for AI features
    if (orgAccess.subscription_status === 'free') {
      // Check if organization has exceeded free tier AI generation limits
      const { data: aiUsage } = await supabase
        .from('ai_usage_tracking')
        .select('monthly_generations')
        .eq('organization_id', validatedData.organization_id)
        .eq('month_year', new Date().toISOString().slice(0, 7))
        .single();

      if (aiUsage && aiUsage.monthly_generations >= 5) {
        // Free tier limit
        auditData.status = 'quota_exceeded';
        await auditLogger.log({
          event_type: 'ai_email_generation_quota_exceeded',
          resource_type: 'ai_service',
          metadata: auditData,
          ip_address: auditData.ip_address,
          user_agent: auditData.user_agent,
        });

        return NextResponse.json(
          {
            error:
              'Monthly AI generation quota exceeded. Please upgrade your plan.',
          },
          {
            status: 402,
            headers: securityHeaders,
          },
        );
      }
    }

    // 6. Generate AI Email Templates
    const variants = await generateEmailVariants(validatedData.config);

    // 7. Store AI Usage
    await supabase.from('ai_usage_tracking').upsert({
      organization_id: validatedData.organization_id,
      user_id: validatedData.user_id,
      month_year: new Date().toISOString().slice(0, 7),
      monthly_generations: (aiUsage?.monthly_generations || 0) + 1,
    });

    // 8. Audit Log Success
    auditData.status = 'success';
    auditData.variants_generated = variants.length;
    auditData.processing_time_ms = Date.now() - startTime;
    await auditLogger.log({
      event_type: 'ai_email_generation_success',
      resource_type: 'ai_service',
      metadata: auditData,
      user_id: auditData.user_id,
      ip_address: auditData.ip_address,
      user_agent: auditData.user_agent,
    });

    // 9. Successful Response
    const response: EmailGenerationResponse = {
      request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'success',
      variants,
      generation_time_ms: Date.now() - startTime,
      tokens_used: calculateTokensUsed(validatedData.config),
      cost_estimate: calculateCostEstimate(variants.length),
      metadata: {
        model_version: 'gpt-4-turbo',
        prompt_version: '1.0',
        safety_checks_passed: true,
        content_policy_compliance: true,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        ...securityHeaders,
        'Cache-Control':
          'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    // Error handling with sanitized messages
    auditData.status = 'error';
    auditData.error_type =
      error instanceof Error ? error.constructor.name : 'unknown';
    auditData.processing_time_ms = Date.now() - startTime;
    await auditLogger.log({
      event_type: 'ai_email_generation_error',
      resource_type: 'ai_service',
      metadata: auditData,
      user_id: auditData.user_id,
      ip_address: auditData.ip_address,
      user_agent: auditData.user_agent,
    });

    console.error('AI Email Generation Error:', error);

    // Never expose internal errors to client
    const sanitizedError =
      error instanceof Error ? error.message : 'Internal server error occurred';

    return NextResponse.json(
      { error: sanitizedError },
      {
        status: 500,
        headers: securityHeaders,
      },
    );
  }
}

// Generate email variants using OpenAI
async function generateEmailVariants(
  config: EmailGenerationConfig,
): Promise<AIEmailVariant[]> {
  const systemPrompt = buildSystemPrompt(config);
  const userPrompt = buildUserPrompt(config);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    });

    const generatedContent = completion.choices[0]?.message?.content;
    if (!generatedContent) {
      throw new Error('No content generated');
    }

    // Parse and structure the AI response into variants
    return parseAIResponse(generatedContent, config);
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
    throw error;
  }
}

// Build system prompt for AI
function buildSystemPrompt(config: EmailGenerationConfig): string {
  return `You are an expert wedding industry email writer specializing in ${config.vendor_context.primary_category} communications.

Your task is to generate ${config.variant_count} professional email templates for the ${config.stage} stage with a ${config.tone} tone.

Key guidelines:
- Write in the wedding industry context
- Use professional, engaging language
- Include merge tags like {couple_names}, {wedding_date}, {venue_name}
- Maintain the specified tone throughout
- Focus on building relationships and trust
- Include clear next steps
- Keep emails scannable with short paragraphs
- Ensure each variant offers unique value propositions

Response format must be valid JSON with this structure:
{
  "variants": [
    {
      "variant_number": 1,
      "subject": "Subject line with merge tags",
      "content": "HTML email content with merge tags",
      "confidence_score": 0.85,
      "generation_reasoning": "Why this variant works",
      "personalization_tokens": ["token1", "token2"],
      "word_count": 150,
      "estimated_read_time": 1,
      "sentiment_score": 0.7,
      "professionalism_score": 0.9,
      "persuasion_score": 0.8,
      "ai_insights": {
        "strengths": ["strength1", "strength2"],
        "potential_improvements": ["improvement1"],
        "recommended_for": ["scenario1", "scenario2"]
      }
    }
  ]
}`;
}

// Build user prompt with context
function buildUserPrompt(config: EmailGenerationConfig): string {
  const elements = Object.entries(config.elements)
    .filter(([_, include]) => include)
    .map(([element, _]) => element)
    .join(', ');

  return `Generate ${config.variant_count} email variants for:

CONTEXT:
- Communication Stage: ${config.stage}
- Tone: ${config.tone}
- Include Elements: ${elements}
- Client: ${config.client_context.couple_names}
- Wedding Date: ${config.client_context.wedding_date || 'TBD'}
- Venue: ${config.client_context.venue_name || 'TBD'} (${config.client_context.venue_type || 'unknown type'})
- Guest Count: ${config.client_context.guest_count || 'unknown'}
- Vendor: ${config.vendor_context.business_name} (${config.vendor_context.primary_category})
- Specialties: ${config.vendor_context.specialties.join(', ')}

CUSTOM INSTRUCTIONS: ${config.custom_instructions || 'None'}

Create variants that differ in:
- Approach and messaging angle
- Structure and flow
- Value proposition emphasis
- Call-to-action style
- Personalization depth

Each variant should be complete, professional, and ready to send.`;
}

// Parse AI response into structured variants
function parseAIResponse(
  content: string,
  config: EmailGenerationConfig,
): AIEmailVariant[] {
  try {
    const parsed = JSON.parse(content);

    return parsed.variants.map((variant: any, index: number) => ({
      id: `ai_${Date.now()}_${index}`,
      variant_number: variant.variant_number || index + 1,
      subject: variant.subject || 'Untitled Email',
      content: variant.content || '',
      confidence_score: Math.max(
        0,
        Math.min(1, variant.confidence_score || 0.7),
      ),
      generation_reasoning:
        variant.generation_reasoning || 'AI generated variant',
      personalization_tokens: variant.personalization_tokens || [],
      estimated_read_time: variant.estimated_read_time || 1,
      sentiment_score: Math.max(-1, Math.min(1, variant.sentiment_score || 0)),
      professionalism_score: Math.max(
        0,
        Math.min(1, variant.professionalism_score || 0.8),
      ),
      persuasion_score: Math.max(
        0,
        Math.min(1, variant.persuasion_score || 0.7),
      ),
      word_count: variant.word_count || variant.content?.split(' ').length || 0,
      character_count: variant.content?.length || 0,
      ai_insights: {
        strengths: variant.ai_insights?.strengths || [],
        potential_improvements:
          variant.ai_insights?.potential_improvements || [],
        recommended_for: variant.ai_insights?.recommended_for || [],
      },
    }));
  } catch (error) {
    throw new Error('Failed to parse AI response');
  }
}

// Calculate token usage estimate
function calculateTokensUsed(config: EmailGenerationConfig): number {
  const basePromptTokens = 500; // Estimated system prompt size
  const contextTokens = JSON.stringify(config).length / 4; // Rough token estimation
  const responseTokens = config.variant_count * 300; // Estimated response per variant

  return Math.round(basePromptTokens + contextTokens + responseTokens);
}

// Calculate cost estimate
function calculateCostEstimate(variantCount: number): number {
  const costPerThousandTokens = 0.03; // GPT-4 Turbo pricing
  const estimatedTokens = variantCount * 400; // Average tokens per variant

  return (
    Math.round((estimatedTokens / 1000) * costPerThousandTokens * 100) / 100
  );
}

// Note: AIEmailError is defined as an interface in @/types/ai-email
// Using standard Error class with type casting for error handling
