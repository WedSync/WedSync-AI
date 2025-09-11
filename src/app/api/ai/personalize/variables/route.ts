/**
 * WS-209: AI Content Personalization Variables API Endpoint
 * GET /api/ai/personalize/variables - Get available variables for personalization contexts
 * Team B - Provides context-specific variable lists for frontend forms
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  personalizationEngine,
  PersonalizationContexts,
  WeddingStyles,
  EmotionalTones,
} from '@/lib/ai/personalization-engine';
import { z } from 'zod';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
);

// Query parameter schema
const VariablesQuerySchema = z.object({
  context: z
    .enum([
      'email',
      'sms',
      'proposal',
      'contract',
      'invoice',
      'timeline',
      'checklist',
      'questionnaire',
      'website',
      'social_media',
    ])
    .optional(),
  includeExamples: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
});

/**
 * Authenticate user (optional for this endpoint but recommended)
 */
async function authenticateUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null; // Allow unauthenticated access for variables
  }

  try {
    const token = authHeader.substring(7);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return { user };
  } catch {
    return null;
  }
}

/**
 * Generate variable examples for documentation
 */
function generateVariableExamples() {
  return {
    partner1_name: 'Emma',
    partner2_name: 'James',
    couple_names: 'Emma and James',
    wedding_date: 'June 15, 2024',
    wedding_year: 2024,
    wedding_month: 'June',
    wedding_season: 'summer',
    venue_name: 'Sunset Garden Estate',
    wedding_style: 'rustic',
    style_adjectives: 'natural, charming, countryside',
    guest_count: 85,
    wedding_size: 'medium',
    email_signature: 'Best regards,\nSarah Johnson\nSunset Photography',
    company_name: 'Sunset Photography',
    contact_info: 'sarah@sunsetphoto.com | (555) 123-4567',
    service_details: 'Full-day wedding photography with engagement session',
    package_name: 'Premium Wedding Package',
    total_cost: '$3,500',
    invoice_number: 'INV-2024-001',
    due_date: 'May 15, 2024',
    amount: '$1,750 (50% deposit)',
    event_time: '2:00 PM - 10:00 PM',
    duration: '8 hours',
    requirements: 'Second shooter, drone coverage',
    task_list: 'Book engagement session, finalize shot list, confirm timeline',
    deadlines: 'Engagement photos: 2 weeks before wedding',
    questions: 'What are your must-have shots?',
    preferences: 'Natural, candid moments preferred',
    portfolio_items: 'Recent couples: Michael & Lisa, David & Rachel',
    testimonials: 'Sarah captured our day perfectly! - Emma & James',
  };
}

/**
 * Get context-specific variable descriptions
 */
function getVariableDescriptions() {
  return {
    partner1_name: "First partner's name",
    partner2_name: "Second partner's name",
    couple_names: 'Combined couple names (Partner1 and Partner2)',
    wedding_date: 'Full wedding date (formatted)',
    wedding_year: 'Wedding year only',
    wedding_month: 'Wedding month name',
    wedding_season: 'Wedding season (spring, summer, fall, winter)',
    venue_name: 'Wedding venue name',
    wedding_style: 'Wedding style/theme',
    style_adjectives: 'Descriptive adjectives for the wedding style',
    guest_count: 'Number of expected guests',
    wedding_size:
      'Wedding size category (intimate, small, medium, large, grand)',
    email_signature: 'Your professional email signature',
    company_name: 'Your business/company name',
    contact_info: 'Your contact information',
    service_details: 'Description of services provided',
    package_name: 'Name of the service package',
    total_cost: 'Total cost of services',
    invoice_number: 'Invoice reference number',
    due_date: 'Payment due date',
    amount: 'Payment amount',
    event_time: 'Event start and end times',
    duration: 'Total event duration',
    requirements: 'Special requirements or requests',
    task_list: 'List of tasks or deliverables',
    deadlines: 'Important deadlines',
    questions: 'Questions for the couple',
    preferences: "Couple's stated preferences",
    portfolio_items: 'Recent work examples',
    testimonials: 'Client testimonials',
  };
}

/**
 * GET /api/ai/personalize/variables
 * Get available variables for personalization contexts
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = VariablesQuerySchema.parse(queryParams);

    // Authenticate user (optional)
    const authResult = await authenticateUser(request);

    // Get available variables for the specified context or all contexts
    let availableVariables: Record<string, string[]> = {};

    if (validatedQuery.context) {
      // Get variables for specific context
      const variables = await personalizationEngine.getAvailableVariables(
        validatedQuery.context,
      );
      availableVariables[validatedQuery.context] = variables;
    } else {
      // Get variables for all contexts
      for (const context of PersonalizationContexts) {
        const variables =
          await personalizationEngine.getAvailableVariables(context);
        availableVariables[context] = variables;
      }
    }

    // Prepare response data
    const responseData: any = {
      success: true,
      data: {
        variables: availableVariables,
        contexts: PersonalizationContexts,
        weddingStyles: WeddingStyles,
        emotionalTones: EmotionalTones,
        variableDescriptions: getVariableDescriptions(),
      },
    };

    // Include examples if requested
    if (validatedQuery.includeExamples) {
      responseData.data.examples = generateVariableExamples();
    }

    // Add usage guidelines
    responseData.data.usage = {
      syntax: 'Use variables in content with {variable_name} syntax',
      tips: [
        'Variables are automatically detected and replaced during personalization',
        'Use descriptive variable names for better AI understanding',
        'Context-specific variables provide more relevant personalization',
        'Custom variables can be passed in the weddingContext.customVariables object',
      ],
      limitations: [
        'Variable names are case-sensitive',
        'Maximum 50 custom variables per request',
        'Variable values are converted to strings during replacement',
      ],
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Variables API error:', error);

    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch variables. Please try again.',
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
