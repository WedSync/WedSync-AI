import { NextRequest, NextResponse } from 'next/server';
import {
  aiEmailGenerator,
  AIEmailGenerationRequest,
  AIEmailGenerationResponse,
} from '@/lib/services/ai-email-generator';
import { emailPersonalizationEngine } from '@/lib/services/email-personalization-engine';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * POST /api/ai-email-templates
 * Generate AI-powered email template
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { action, ...requestData } = body;

    // Get user ID from session (in production, this would be from auth)
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const clientIP =
      request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `${clientIP}_${userAgent}`;

    // Apply rate limiting
    const rateLimitResult = checkRateLimit(rateLimitKey);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          retry_after: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Handle different actions
    switch (action) {
      case 'generate':
        return await handleGenerate(requestData);

      case 'refine':
        return await handleRefine(requestData);

      case 'variations':
        return await handleVariations(requestData);

      case 'personalize':
        return await handlePersonalize(requestData);

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid action. Supported actions: generate, refine, variations, personalize',
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('AI email template API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/ai-email-templates
 * Get personalization recommendations and insights
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const vendorId = searchParams.get('vendor_id') || undefined;
    const templateType = searchParams.get('template_type') || 'welcome';
    const action = searchParams.get('action') || 'recommendations';

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'client_id is required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'recommendations':
        const recommendations =
          await emailPersonalizationEngine.getPersonalizationRecommendations(
            clientId,
            templateType,
            vendorId,
          );

        return NextResponse.json({
          success: true,
          data: { recommendations },
        });

      case 'insights':
        const insights = await emailPersonalizationEngine.getContextualInsights(
          clientId,
          templateType,
          vendorId,
        );

        return NextResponse.json({
          success: true,
          data: { insights },
        });

      case 'profile':
        const profile =
          await emailPersonalizationEngine.getPersonalizationProfile(
            clientId,
            vendorId,
          );

        return NextResponse.json({
          success: true,
          data: { profile },
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid action. Supported actions: recommendations, insights, profile',
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('AI email template GET API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch personalization data',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/ai-email-templates
 * Track email engagement for personalization learning
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, vendor_id, email_data } = body;

    if (!client_id || !email_data) {
      return NextResponse.json(
        { success: false, error: 'client_id and email_data are required' },
        { status: 400 },
      );
    }

    await emailPersonalizationEngine.trackEmailEngagement(
      client_id,
      email_data,
      vendor_id,
    );

    return NextResponse.json({
      success: true,
      message: 'Email engagement tracked successfully',
    });
  } catch (error) {
    console.error('Email engagement tracking error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track email engagement',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

// Handler functions

async function handleGenerate(requestData: any): Promise<NextResponse> {
  try {
    // Validate required fields
    const { context, template_type, tone = 'professional' } = requestData;

    if (!context || !template_type) {
      return NextResponse.json(
        { success: false, error: 'context and template_type are required' },
        { status: 400 },
      );
    }

    // Build AI generation request
    const generationRequest: AIEmailGenerationRequest = {
      context: {
        communication_purpose:
          context.communication_purpose || 'General communication',
        relationship_stage: context.relationship_stage || 'existing_client',
        client_name: context.client_name,
        vendor_name: context.vendor_name,
        wedding_date: context.wedding_date,
        venue_name: context.venue_name,
        event_type: context.event_type,
        previous_interactions: context.previous_interactions || [],
        deadline_context: context.deadline_context,
      },
      style_preferences: {
        use_emojis: requestData.style_preferences?.use_emojis ?? false,
        include_personal_touches:
          requestData.style_preferences?.include_personal_touches ?? true,
        formal_language:
          requestData.style_preferences?.formal_language ?? false,
        include_vendor_branding:
          requestData.style_preferences?.include_vendor_branding ?? true,
        template_structure:
          requestData.style_preferences?.template_structure || 'standard',
      },
      personalization_data: requestData.personalization_data || {},
      template_type: template_type,
      tone: tone,
      length: requestData.length || 'medium',
      include_call_to_action: requestData.include_call_to_action ?? true,
      brand_guidelines: requestData.brand_guidelines,
    };

    // Enhance with personalization if client_id is provided
    let enhancedRequest = generationRequest;
    if (requestData.client_id) {
      enhancedRequest = await emailPersonalizationEngine.enhanceEmailRequest(
        generationRequest,
        requestData.client_id,
        requestData.vendor_id,
      );
    }

    // Generate template
    const response =
      await aiEmailGenerator.generateEmailTemplate(enhancedRequest);

    return NextResponse.json({
      success: response.success,
      data: response,
      metadata: {
        personalized: !!requestData.client_id,
        generation_time_ms: response.generation_metadata.generation_time_ms,
      },
    });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Template generation failed' },
      { status: 500 },
    );
  }
}

async function handleRefine(requestData: any): Promise<NextResponse> {
  try {
    const { template, refinement_instructions, context } = requestData;

    if (!template || !refinement_instructions) {
      return NextResponse.json(
        {
          success: false,
          error: 'template and refinement_instructions are required',
        },
        { status: 400 },
      );
    }

    const response = await aiEmailGenerator.refineEmailTemplate(
      template,
      refinement_instructions,
      context,
    );

    return NextResponse.json({
      success: response.success,
      data: response,
    });
  } catch (error) {
    console.error('Template refinement error:', error);
    return NextResponse.json(
      { success: false, error: 'Template refinement failed' },
      { status: 500 },
    );
  }
}

async function handleVariations(requestData: any): Promise<NextResponse> {
  try {
    const { base_request, variation_count = 3 } = requestData;

    if (!base_request) {
      return NextResponse.json(
        { success: false, error: 'base_request is required' },
        { status: 400 },
      );
    }

    const variations = await aiEmailGenerator.generateTemplateVariations(
      base_request,
      variation_count,
    );

    return NextResponse.json({
      success: true,
      data: { variations },
    });
  } catch (error) {
    console.error('Template variations error:', error);
    return NextResponse.json(
      { success: false, error: 'Template variations generation failed' },
      { status: 500 },
    );
  }
}

async function handlePersonalize(requestData: any): Promise<NextResponse> {
  try {
    const { client_id, vendor_id, base_template } = requestData;

    if (!client_id || !base_template) {
      return NextResponse.json(
        { success: false, error: 'client_id and base_template are required' },
        { status: 400 },
      );
    }

    // Get personalization profile
    const profile = await emailPersonalizationEngine.getPersonalizationProfile(
      client_id,
      vendor_id,
    );

    // Build personalized generation request
    const baseRequest: AIEmailGenerationRequest = {
      context: {
        communication_purpose: 'Personalized version of existing template',
        relationship_stage: 'existing_client',
        client_name: profile.client_id, // This would be resolved to actual name
      },
      style_preferences: {
        use_emojis: profile.communication_preferences.include_emojis,
        include_personal_touches: true,
        formal_language:
          profile.communication_preferences.preferred_tone === 'formal',
        include_vendor_branding: true,
        template_structure:
          profile.communication_preferences.content_length === 'short'
            ? 'minimal'
            : 'standard',
      },
      personalization_data: {
        client_preferences: {
          communication_style: profile.communication_preferences.preferred_tone,
          preferred_name: 'Valued Client', // Would be resolved from profile
          special_requirements: profile.wedding_context.special_requirements,
        },
        wedding_details: {
          theme: profile.wedding_context.wedding_style,
          guest_count: profile.wedding_context.guest_count,
          budget_tier: profile.wedding_context.budget_tier,
        },
      },
      template_type: base_template.category || 'custom',
      tone: profile.communication_preferences.preferred_tone,
      length: profile.communication_preferences.content_length,
      include_call_to_action: true,
    };

    const personalizedTemplate =
      await aiEmailGenerator.generateEmailTemplate(baseRequest);

    return NextResponse.json({
      success: personalizedTemplate.success,
      data: {
        ...personalizedTemplate,
        personalization_profile: profile,
      },
    });
  } catch (error) {
    console.error('Template personalization error:', error);
    return NextResponse.json(
      { success: false, error: 'Template personalization failed' },
      { status: 500 },
    );
  }
}

// Rate limiting helper
function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Clean up old entries
  for (const [k, v] of requestCounts.entries()) {
    if (v.resetTime < now) {
      requestCounts.delete(k);
    }
  }

  const current = requestCounts.get(key);

  if (!current) {
    requestCounts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((current.resetTime - now) / 1000),
    };
  }

  current.count++;
  return { allowed: true };
}
